// O app INTEIRO carregado como ES modules de verdade (Node ESM), na ordem do index.html.
// Diferente do carregador comum dos testes (que só imita módulos), aqui valem as regras
// reais: modo estrito, imports resolvidos de verdade (inclusive ciclos), constantes com
// "zona morta" antes de declaradas, e nada publicado no window além do estado compartilhado.
// Fica num arquivo próprio porque deixa o globalThis deste processo modificado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { scriptsDoIndex, criarDocumento, criarLocalStorage, RAIZ } = require('./carregar-app');

test('o app inteiro carrega como ES modules de verdade, na ordem do index.html, e inicia', async () => {
  // cópia de js/ numa pasta com package.json "type":"module" (o Node trata .js como módulo)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'app-modulos-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
  fs.cpSync(path.join(RAIZ, 'js'), path.join(tmp, 'js'), { recursive: true });

  const ouvintes = [];
  Object.assign(globalThis, {
    window: globalThis,
    document: criarDocumento(),
    localStorage: criarLocalStorage(),
    location: { hostname: 'localhost', protocol: 'http:', hash: '' },
    addEventListener: (tipo) => ouvintes.push(tipo),
    showAppToast() {},
    MutationObserver: class { observe() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  });
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });

  const arquivos = scriptsDoIndex().filter(f => !f.startsWith('js/vendor/'));
  assert.ok(arquivos.includes('js/main.js') && arquivos[arquivos.length - 1] === 'js/main.js', 'main.js é o último');
  const ns = {};
  for (const m of arquivos) {
    try {
      ns[m] = await import(pathToFileURL(path.join(tmp, m)).href);
    } catch (e) {
      throw new Error(`${m} falhou ao carregar como módulo: ${e.message}`);
    }
  }

  // sem ponte: funções e constantes NÃO estão no window; só o estado compartilhado está
  for (const nome of ['renderCartUI', 'Acoes', 'Armazenamento', 'AppTemplates', 'loadApplicationData', 'driveSincronizar']) {
    assert.equal(globalThis[nome], undefined, `${nome} não deveria estar no window`);
  }
  assert.ok(Array.isArray(globalThis.products), 'products continua compartilhado');

  // iniciar e usar o app pelos módulos
  ns['js/state.js'].loadApplicationData();
  assert.ok(globalThis.products.length > 0, 'catálogo inicial com os itens básicos');
  globalThis.cart = [{ id: 'c1', name: 'Arroz', quantity: 2, unitPrice: 5, selectedBrandId: 'Padrão', unit: 'kg', promo: { type: 'none' } }];
  ns['js/state.js'].saveCartData();
  assert.equal(JSON.parse(globalThis.localStorage.getItem('sc_cart_v3'))[0].name, 'Arroz');

  ns['js/telas/carrinho/cards.js'].renderCartUI();
  ns['js/telas/catalogo/layout.js'].renderCatalogUI();
  ns['js/telas/catalogo/layout.js'].renderMarketsUI();
  ns['js/telas/historico/lista.js'].renderHistoricoUI();
  assert.equal(ns['js/calculo.js'].computeItemFinancials(2, 10, { type: 'discount', mode: 'percent', value: 10 }).finalSubtotal, 18);

  // o registro de templates recebeu os métodos de todas as telas
  const { AppTemplates } = ns['js/ui/templates-base.js'];
  for (const m of ['emptyState', 'cartItemCard', 'renderCart', 'productCard', 'marketCard', 'renderCatalog', 'renderProductEditModal', 'renderPriceComparatorModal']) {
    assert.equal(typeof AppTemplates[m], 'function', m);
  }

  // ações de todas as telas registradas
  const { Acoes } = ns['js/ui/acoes.js'];
  for (const acao of ['carrinho-finalizar', 'historico-detalhes', 'produto-editar', 'mercado-planilha', 'calculadora-abrir', 'aba', 'drive-abrir', 'qr-fechar']) {
    assert.ok(['click', 'change', 'input', 'keydown', 'submit'].some(t => Acoes.existe(t, acao)), acao);
  }
  assert.ok(ouvintes.includes('DOMContentLoaded'), 'main.js agenda a inicialização');
  assert.ok(ouvintes.includes('load'), 'drive-sync e coordenador registraram o evento load');
});
