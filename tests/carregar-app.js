/**
 * Carrega os scripts do app (que são scripts clássicos, sem import/export) dentro de um
 * contexto isolado do Node, com um "navegador" mínimo de mentira. Assim dá para testar as
 * funções puras sem abrir o navegador.
 *
 * Uso: const app = carregarApp(['js/state.js', ...ARQUIVOS_CARRINHO]);
 *      app.parseNumberInput('1,5')        // funções declaradas viram propriedades
 *      app.$('products')                  // let/const de topo: leia com $()
 *      app.$('products = [...]')          // ...ou altere
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');

function criarLocalStorage() {
  const dados = new Map();
  return {
    getItem: k => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: k => dados.delete(k),
    clear: () => dados.clear(),
  };
}

function criarElemento() {
  return {
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, setAttribute() {}, getAttribute: () => null, addEventListener() {},
  };
}

function criarDocumento() {
  const vazio = () => null;
  return {
    getElementById: vazio,
    querySelector: vazio,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: criarElemento,
    documentElement: criarElemento(),
    head: criarElemento(),
    body: criarElemento(),
  };
}

function carregarApp(arquivos) {
  const ctx = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, Date, Math, JSON, URLSearchParams,
    crypto: globalThis.crypto,
    performance: globalThis.performance,
    localStorage: criarLocalStorage(),
    document: criarDocumento(),
    location: { hostname: 'localhost', protocol: 'http:', hash: '' },
    navigator: { onLine: false },
    addEventListener() {},
    showAppToast() {},
    MutationObserver: class { observe() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const arq of arquivos) {
    const codigo = fs.readFileSync(path.join(RAIZ, arq), 'utf8');
    vm.runInContext(ehModulo(codigo) ? comoScriptEstrito(codigo) : codigo, ctx, { filename: arq });
  }
  ctx.$ = expr => vm.runInContext(expr, ctx);
  return ctx;
}

/** Roda mais um arquivo do app num contexto já criado (scripts comuns ou módulos). */
function rodarArquivo(ctx, arq) {
  const codigo = fs.readFileSync(path.join(RAIZ, arq), 'utf8');
  vm.runInContext(ehModulo(codigo) ? comoScriptEstrito(codigo) : codigo, ctx, { filename: arq });
}

// ===== Módulos (etapa 4, fase de transição) =====
// Um arquivo é módulo se tem import/export no começo de alguma linha.
function ehModulo(codigo) {
  return /^\s*(import\s|export\s)/m.test(codigo);
}

/**
 * Roda um módulo no mesmo contexto dos scripts comuns: remove as linhas de import e a
 * palavra export, e liga o modo estrito (módulos sempre são estritos no navegador).
 * Funciona porque, na transição, todo módulo também publica no window o que exporta
 * (o teste tests/modulos.test.js garante isso), então quem importava encontra o mesmo nome.
 * Só aceita import em uma linha: import { a, b } from './x.js';
 */
function comoScriptEstrito(codigo) {
  const linhas = codigo.split(/\r?\n/).map(l => {
    if (/^\s*import\s/.test(l)) {
      if (!/;\s*$/.test(l)) throw new Error('import em várias linhas não é suportado pelo carregador de testes: ' + l);
      return '';
    }
    if (/^\s*export\s*\{[^}]*\};?\s*$/.test(l)) return '';          // export { a, b };
    return l.replace(/^(\s*)export\s+(default\s+)?/, '$1');           // export const/function/class
  });
  return '"use strict";\n' + linhas.join('\n');
}

/** Nomes exportados por um módulo (export const/let/function/class X e export { X, Y }). */
function exportsDoModulo(codigo) {
  const nomes = new Set();
  for (const m of codigo.matchAll(/^\s*export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) nomes.add(m[1]);
  for (const m of codigo.matchAll(/^\s*export\s*\{([^}]*)\}/gm)) {
    m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean).forEach(n => nomes.add(n));
  }
  return nomes;
}

// Arquivos da tela do catálogo (produtos e mercados), na ordem do index.html
const ARQUIVOS_CATALOGO = ['precos', 'layout', 'filtros', 'modal-produto', 'produtos', 'sugeridos', 'mercados', 'acoes']
  .map(n => `js/telas/catalogo/${n}.js`);

// Arquivos da tela do carrinho, na ordem do index.html
const ARQUIVOS_CARRINHO = ['calculo', 'lista', 'formulario', 'edicao', 'finalizacao', 'comparativo', 'acoes']
  .map(n => `js/telas/carrinho/${n}.js`);

// Arquivos da tela do histórico, na ordem do index.html
const ARQUIVOS_HISTORICO = ['dados', 'lista', 'exclusao', 'detalhes', 'comparador', 'acoes']
  .map(n => `js/telas/historico/${n}.js`);

/** Scripts locais do index.html, na ordem em que o navegador carrega (inclui js/vendor). */
function scriptsDoIndex() {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  return [...html.matchAll(/<script\b[^>]*\bsrc="(js\/[^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g)].map(m => m[1]);
}

/** Todos os .js do app (inclui subpastas como js/telas e js/ui; ignora js/vendor). Caminhos 'js/...'. */
function listarArquivosJs(pasta = 'js') {
  const saida = [];
  for (const item of fs.readdirSync(path.join(RAIZ, pasta), { withFileTypes: true })) {
    const rel = `${pasta}/${item.name}`;
    if (item.isDirectory()) { if (item.name !== 'vendor') saida.push(...listarArquivosJs(rel)); }
    else if (item.name.endsWith('.js')) saida.push(rel);
  }
  return saida;
}

module.exports = { carregarApp, rodarArquivo, scriptsDoIndex, ehModulo, exportsDoModulo, ARQUIVOS_CATALOGO, ARQUIVOS_CARRINHO, ARQUIVOS_HISTORICO, listarArquivosJs, RAIZ };
