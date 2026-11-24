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

test('fim da transição: nenhuma ponte (Object.assign(window, ...)) e nenhuma função criada como window.X', () => {
  for (const m of modulos) {
    const codigo = ler(m);
    assert.doesNotMatch(codigo, /Object\.assign\(window,/, m + ': ainda publica no window');
    assert.doesNotMatch(codigo, /^window\.[A-Za-z_$][\w$]*\s*=\s*(async\s+)?(function|\()/m, m + ': função criada como window.X');
  }
});

test('imports em dia: cada arquivo importa exatamente o que usa (npm run imports)', () => {
  const { execFileSync } = require('child_process');
  execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'imports.js'), '--conferir'], { stdio: 'pipe' });
});

test('nenhum arquivo usa uma função ou constante de outro módulo sem importar', () => {
  const { analisar } = require('../scripts/analise');
  const dono = new Map();
  for (const m of modulos) for (const n of exportsDoModulo(ler(m))) dono.set(n, m);
  const faltando = [];
  for (const m of modulos) {
    const { declarados, importados, usados } = analisar(ler(m));
    for (const n of usados) {
      if (dono.has(n) && dono.get(n) !== m && !declarados.has(n) && !importados.has(n)) faltando.push(`${m} usa ${n} (de ${dono.get(n)})`);
    }
  }
  assert.deepEqual(faltando, []);
});

test('o estado (state.js) não depende de nenhuma tela: só de compartilhado, eventos e armazenamento', () => {
  const imports = [...ler('js/state.js').matchAll(/^import \{[^}]*\} from '([^']+)';/gm)].map(m => m[1]).sort();
  assert.deepEqual(imports, ['./armazenamento.js', './compartilhado.js', './eventos.js']);
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

// ------------------------------------------------------------ modo estrito e variáveis compartilhadas
test('nenhuma atribuição a variável nunca declarada (em módulo isso quebra a tela)', () => {
  const { atribuicoesSoltas } = require('./modo-estrito');
  const arquivos = tags.map(t => t.arq).filter(a => !a.startsWith('js/vendor/'));
  assert.deepEqual(atribuicoesSoltas(RAIZ, arquivos), []);
});

test('todos os arquivos do app são módulos (só js/vendor continua como script comum)', () => {
  for (const t of tags) {
    const esperado = t.arq.startsWith('js/vendor/') ? /\bdefer\b/ : /type="module"/;
    assert.match(t.attrs, esperado, t.arq);
  }
});

test('variáveis compartilhadas: cada uma criada uma única vez, por um dono conhecido', () => {
  const ESPERADAS = {
    'js/state.js': ['supermarkets', 'products', 'cart', 'activeMarketId', 'purchaseHistory', 'currentTab', 'cartFilterMode',
      'isSoundOn', 'pendingSyncPayload', 'selectedSyncProducts', 'selectedSyncMarkets', 'activeSyncTab', 'selectedCatalogProductIds'],
    'js/telas/historico/lista.js': ['selectedHistoryIds'],
    'js/telas/catalogo/modal-produto.js': ['textoNovaMarcaEmEdicao'],
    'js/telas/catalogo/mercados.js': ['mercadosOrigemFiltro'],
  };
  const achadas = {};
  for (const f of listarArquivosJs()) {
    const nomes = [...ler(f).matchAll(/^variavelGlobal\('([^']+)'/gm)].map(m => m[1]);
    if (nomes.length) achadas[f] = nomes;
  }
  assert.deepEqual(achadas, ESPERADAS);
});

test('variavelGlobal: ler e alterar de qualquer arquivo; criar o mesmo nome duas vezes é erro', () => {
  const { carregarApp } = require('./carregar-app');
  const app = carregarApp(['js/compartilhado.js']);
  app.variavelGlobal('teste_compartilhado', 1);
  app.$('teste_compartilhado = teste_compartilhado + 41');
  assert.equal(app.$('teste_compartilhado'), 42);
  assert.throws(() => app.variavelGlobal('teste_compartilhado', 0), /já foi criada/);
});

test('camadas: núcleo, serviços e UI não importam das telas (só o main.js, que inicia o app)', () => {
  const violacoes = [];
  for (const m of modulos) {
    if (m.startsWith('js/telas/') || m === 'js/main.js') continue;
    for (const imp of ler(m).matchAll(/^import \{[^}]*\} from '([^']+)';/gm)) {
      const destino = path.posix.normalize(path.posix.join(path.posix.dirname(m), imp[1]));
      if (destino.startsWith('js/telas/')) violacoes.push(`${m} importa ${destino}`);
    }
  }
  assert.deepEqual(violacoes, [], 'para redesenhar uma tela, use pedirRedesenho(...) (js/eventos.js)');
});
