// Garante que todos os scripts do index.html carregam juntos, na ordem real, sem erro.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { carregarApp } = require('./carregar-app');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="(js\/[^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g)].map(m => m[1]);

test('index.html carrega os scripts locais esperados', () => {
  assert.ok(scripts.length >= 15, 'scripts encontrados: ' + scripts.join(', '));
  // com módulos, a ordem entre eles vem dos imports; o que a ordem das tags ainda decide:
  assert.equal(scripts[0], 'js/compartilhado.js', 'compartilhado.js (variavelGlobal) é o primeiro');
  assert.equal(scripts[scripts.length - 1], 'js/main.js', 'main.js (inicialização) é o último');
});

test('todos os scripts carregam na ordem do index.html sem erro', () => {
  const app = carregarApp(scripts);
  for (const fn of ['loadApplicationData', 'renderCartUI', 'renderHistoricoUI', 'driveSincronizar',
    'sincronizarComPlanilha', 'compartilharCarrinhoWhatsApp', 'mesclarItensNoCarrinho', 'carregarComponentesUI']) {
    assert.equal(typeof app[fn], 'function', fn + ' precisa existir');
  }
});

test('funções públicas de sincronização passam pela fila (não são as versões internas)', () => {
  const app = carregarApp(scripts);
  for (const fn of ['sincronizarComPlanilha', 'abrirModalSincronizacaoSeletiva', 'sincronizarCatalogoDireto',
    'promoverProdutoEmEdicaoParaPlanilha', 'driveSincronizar']) {
    assert.match(String(app[fn]), /scRodar\(/, fn);
  }
});

test('loadApplicationData normaliza dados antigos guardados no aparelho', () => {
  const app = carregarApp(scripts);
  app.localStorage.setItem('sc_cart_v3', JSON.stringify([{ id: 'c1', nome: 'Leite', quantidade: '2' }]));
  app.localStorage.setItem('sc_history_v3', JSON.stringify([{ date: '2026-03-01', itens: [{ nome: 'Pão' }] }]));
  app.loadApplicationData();
  assert.equal(app.$('cart[0].name'), 'Leite');
  assert.equal(app.$('cart[0].quantity'), 2);
  assert.equal(app.$('purchaseHistory[0].items[0].name'), 'Pão');
  assert.ok(app.$('products.length') > 0, 'catálogo vazio recebe os itens básicos');
  assert.ok(app.$('products.every(p => p.id.startsWith("p-custom-"))'));
});
