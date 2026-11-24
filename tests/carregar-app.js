/**
 * Carrega os scripts do app (que são scripts clássicos, sem import/export) dentro de um
 * contexto isolado do Node, com um "navegador" mínimo de mentira. Assim dá para testar as
 * funções puras sem abrir o navegador.
 *
 * Uso: const app = carregarApp(['js/state.js', 'js/cart.js']);
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
    vm.runInContext(codigo, ctx, { filename: arq });
  }
  ctx.$ = expr => vm.runInContext(expr, ctx);
  return ctx;
}

module.exports = { carregarApp };
