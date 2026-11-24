// Etapa 4: arquivos que já são módulos ES (import/export).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ehModulo, exportsDoModulo, listarArquivosJs, RAIZ } = require('./carregar-app');

const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const html = ler('index.html');
const tags = [...html.matchAll(/<script\b([^>]*)\bsrc="(js\/[^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g)]
  .map(m => ({ attrs: m[1], arq: m[2] }));
const modulos = listarArquivosJs().filter(f => ehModulo(ler(f)));

test('há módulos e todos estão no index.html como type="module"', () => {
  assert.ok(modulos.length >= 4, 'módulos: ' + modulos.join(', '));
  for (const m of modulos) {
    const tag = tags.find(t => t.arq === m);
    assert.ok(tag, `${m} não está no index.html`);
    assert.match(tag.attrs, /type="module"/, `${m} precisa de type="module"`);
  }
});

test('nenhum script do index.html trava a página: todos são defer ou módulo (e rodam na ordem)', () => {
  for (const t of tags) {
    assert.ok(/\bdefer\b|type="module"/.test(t.attrs), `${t.arq} sem defer nem type="module"`);
  }
  // um script comum (defer) não pode ser declarado como módulo e vice-versa
  for (const t of tags.filter(t => /type="module"/.test(t.attrs))) {
    assert.ok(modulos.includes(t.arq), `${t.arq} está como módulo mas não tem import/export`);
  }
});

test('ponte da transição: cada módulo publica no window exatamente o que exporta', () => {
  for (const m of modulos) {
    const codigo = ler(m);
    const exportados = [...exportsDoModulo(codigo)].sort();
    const ponte = codigo.match(/Object\.assign\(window,\s*\{([^}]*)\}\);/);
    assert.ok(ponte, `${m} sem a linha da ponte Object.assign(window, {...})`);
    const publicados = ponte[1].split(',').map(s => s.trim()).filter(Boolean).sort();
    assert.deepEqual(publicados, exportados, m);
  }
});

// importa o módulo DE VERDADE (Node ESM), com um navegador mínimo de mentira no globalThis
async function importarDeVerdade(arq) {
  const fonte = ler(arq);
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(fonte));
}

test('os módulos sem dependências carregam como ES modules de verdade (modo estrito, exports)', async () => {
  const dados = new Map();
  Object.assign(globalThis, {
    window: globalThis,
    document: { addEventListener() {} },
    localStorage: {
      getItem: k => (dados.has(k) ? dados.get(k) : null),
      setItem: (k, v) => dados.set(k, String(v)),
      removeItem: k => dados.delete(k),
    },
  });
  try {
    const eventos = await importarDeVerdade('js/eventos.js');
    assert.equal(typeof eventos.Eventos.ouvir, 'function');
    assert.equal(eventos.AVISOS.DADOS_SALVOS, 'dados-salvos');

    const acoes = await importarDeVerdade('js/ui/acoes.js');
    assert.equal(typeof acoes.Acoes.registrarClique, 'function');

    const arm = await importarDeVerdade('js/armazenamento.js');
    assert.equal(arm.Armazenamento.gravarJSON(arm.CHAVES.CARRINHO, [1]), true);
    assert.deepEqual(arm.Armazenamento.lerLista(arm.CHAVES.CARRINHO), [1]);

    const origem = await importarDeVerdade('js/origem.js');
    assert.equal(origem.obterOrigem('mercados', { id: 'm-padrao' }), 'padrao');

    // a ponte publicou no "window"
    assert.equal(globalThis.Armazenamento, arm.Armazenamento);
  } finally {
    for (const k of ['window', 'document', 'localStorage', 'AVISOS', 'Eventos', 'Acoes', 'noProprioElemento',
      'CHAVES', 'CHAVES_HISTORICO_ANTIGAS', 'Armazenamento', 'ORIGENS', 'ORDEM_FILTRO_ORIGEM', 'estaNaPlanilha',
      'obterOrigem', 'obterOrigemItem', 'seloOrigemHtml', 'contarOrigens', 'botoesFiltroOrigemHtml', 'filtroOrigemValido']) {
      delete globalThis[k];
    }
  }
});
