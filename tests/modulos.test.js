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

// ------------------------------------------------------------ import map
function importMap() {
  const m = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(m, 'index.html sem <script type="importmap">');
  return { posicao: m.index, mapa: JSON.parse(m[1]).imports };
}

test('import map vem antes do primeiro módulo e cobre todos eles com o mesmo endereço da tag', () => {
  const { posicao, mapa } = importMap();
  const primeiroModulo = html.search(/<script type="module" src=/);
  assert.ok(posicao < primeiroModulo, 'o import map precisa vir antes de qualquer módulo');
  for (const m of modulos) {
    const inicio = `<script type="module" src="${m}?v=`;
    const i = html.indexOf(inicio);
    assert.ok(i >= 0, `tag de ${m}`);
    const src = html.slice(i + '<script type="module" src="'.length, html.indexOf('"', i + inicio.length));
    assert.equal(mapa['./' + m], './' + src, `${m}: import map e tag com endereços diferentes (carregaria duas cópias)`);
  }
  assert.deepEqual(Object.keys(mapa).sort(), modulos.map(m => './' + m).sort(), 'import map com arquivo que não é módulo');
});

test('todo import aponta para um módulo que existe e está no import map', () => {
  const { mapa } = importMap();
  for (const m of modulos) {
    for (const imp of ler(m).matchAll(/^\s*import\s+\{[^}]*\}\s+from\s+'([^']+)';/gm)) {
      const destino = path.posix.normalize(path.posix.join(path.posix.dirname(m), imp[1]));
      assert.ok(fs.existsSync(path.join(RAIZ, destino)), `${m} importa ${imp[1]}, que não existe`);
      assert.ok(mapa['./' + destino], `${m} importa ${destino}, que não está no import map`);
    }
  }
});

test('npm run versao troca a versão de todas as tags e do import map de uma vez', () => {
  const os = require('os');
  const { execFileSync } = require('child_process');
  const copia = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'versao-')), 'index.html');
  fs.copyFileSync(path.join(RAIZ, 'index.html'), copia);
  execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'versao.js'), '9.9.9'], { env: { ...process.env, VERSAO_ARQUIVO: copia } });
  const novo = fs.readFileSync(copia, 'utf8');
  const versoes = new Set([...novo.matchAll(/js\/(?!vendor\/)[^"'?\s]+\.js\?v=([0-9.]+)/g)].map(m => m[1]));
  assert.deepEqual([...versoes], ['9.9.9']);
  const mapa = JSON.parse(novo.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const [chave, valor] of Object.entries(mapa)) assert.equal(valor, chave + '?v=9.9.9');
});

// ------------------------------------------------------------ árvore de módulos de verdade (com os imports)
test('drive-sync.js e o que ele importa carregam como ES modules de verdade (nomes importados existem)', async () => {
  const os = require('os');
  const { pathToFileURL } = require('url');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'modulos-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
  for (const m of modulos) {
    fs.mkdirSync(path.join(tmp, path.dirname(m)), { recursive: true });
    fs.copyFileSync(path.join(RAIZ, m), path.join(tmp, m));
  }
  const ouvintes = [];
  const dados = new Map();
  const nomesAntes = new Set(Object.keys(globalThis));
  Object.assign(globalThis, {
    window: globalThis,
    addEventListener: (tipo) => ouvintes.push(tipo),
    document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
    localStorage: { getItem: k => (dados.has(k) ? dados.get(k) : null), setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k) },
    getSecurityToken: () => '',
    formatBRL: n => String(n),
  });
  try {
    const drive = await import(pathToFileURL(path.join(tmp, 'js/drive-sync.js')).href);
    assert.equal(typeof drive.driveSincronizar, 'function');
    assert.equal(drive.DRIVE_META_KEY, 'sc_drive_meta_v2', 'importou CHAVES do armazenamento');
    assert.ok(ouvintes.includes('load'), 'registrou driveIniciar no load');
    assert.equal('_driveToken' in drive, false, 'nomes com _ continuam privados');

    const calc = await import(pathToFileURL(path.join(tmp, 'js/telas/carrinho/calculo.js')).href);
    assert.equal(calc.computeItemFinancials(2, 10).finalSubtotal, 20);
  } finally {
    for (const k of Object.keys(globalThis)) if (!nomesAntes.has(k)) delete globalThis[k];
  }
});
