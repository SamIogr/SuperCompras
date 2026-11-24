// O app INTEIRO carregado como ES modules de verdade (Node ESM), na ordem do index.html.
// Diferente do carregador comum dos testes (que só imita módulos), aqui valem as regras
// reais: modo estrito, imports resolvidos de verdade, constantes com "zona morta" antes
// de declaradas, e as variáveis compartilhadas (variavelGlobal) no globalThis.
// Fica num arquivo próprio porque deixa o globalThis deste processo modificado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { scriptsDoIndex, criarDocumento, criarLocalStorage, RAIZ } = require('./carregar-app');

test('os 38 módulos carregam como ES modules de verdade, na ordem do index.html, e o app inicia', async () => {
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

  const modulos = scriptsDoIndex().filter(f => !f.startsWith('js/vendor/'));
  assert.equal(modulos.length, 38);
  for (const m of modulos) {
    try {
      await import(pathToFileURL(path.join(tmp, m)).href);
    } catch (e) {
      throw new Error(`${m} falhou ao carregar como módulo: ${e.message}`);
    }
  }

  // estado compartilhado funcionando como antes (lido e alterado por qualquer arquivo)
  assert.ok(Array.isArray(globalThis.products));
  globalThis.loadApplicationData();
  assert.ok(globalThis.products.length > 0, 'catálogo inicial com os itens básicos');
  globalThis.cart = [{ id: 'c1', name: 'Arroz', quantity: 2, unitPrice: 5, selectedBrandId: 'Padrão', unit: 'kg', promo: { type: 'none' } }];
  globalThis.saveCartData();
  assert.equal(JSON.parse(globalThis.localStorage.getItem('sc_cart_v3'))[0].name, 'Arroz');

  // funções de várias telas publicadas e chamáveis
  for (const fn of ['renderCartUI', 'renderHistoricoUI', 'renderCatalogUI', 'renderMarketsUI', 'driveSincronizar',
    'sincronizarComPlanilha', 'abrirCalculadoraComparativa', 'carregarComponentesUI', 'abrirModalQRCode']) {
    assert.equal(typeof globalThis[fn], 'function', fn);
  }
  globalThis.renderCartUI();
  globalThis.renderCatalogUI();
  globalThis.renderMarketsUI();
  globalThis.renderHistoricoUI();
  assert.equal(globalThis.computeItemFinancials(2, 10, { type: 'discount', mode: 'percent', value: 10 }).finalSubtotal, 18);
  assert.ok(ouvintes.includes('load'), 'drive-sync e coordenador registraram o evento load');

  // ações de todas as telas registradas
  for (const acao of ['carrinho-finalizar', 'historico-detalhes', 'produto-editar', 'mercado-planilha', 'calculadora-abrir', 'aba', 'drive-abrir', 'qr-fechar']) {
    assert.ok(['click', 'change', 'input', 'keydown', 'submit'].some(t => globalThis.Acoes.existe(t, acao)), acao);
  }
});
