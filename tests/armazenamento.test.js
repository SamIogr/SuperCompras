const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { carregarApp } = require('./carregar-app');

const puro = v => JSON.parse(JSON.stringify(v));

// carrega só o armazenamento, com o localStorage já preenchido ANTES (como num aparelho real)
function comDados(dados, arquivos = ['js/armazenamento.js']) {
  const app = carregarApp([]);
  for (const [k, v] of Object.entries(dados)) app.localStorage.setItem(k, v);
  for (const arq of arquivos) app.$(fs.readFileSync(path.join(__dirname, '..', arq), 'utf8'));
  return app;
}

test('nenhum arquivo do app acessa localStorage diretamente, exceto armazenamento.js', () => {
  const pasta = path.join(__dirname, '..', 'js');
  const culpados = fs.readdirSync(pasta)
    .filter(f => f.endsWith('.js') && f !== 'armazenamento.js')
    .filter(f => fs.readFileSync(path.join(pasta, f), 'utf8')
      .split('\n').some(l => /localStorage\s*[.[]|in localStorage/.test(l) && !/^\s*(\*|\/\/)/.test(l)));
  assert.deepEqual(culpados, []);
});

test('lerJSON devolve o padrão para chave ausente, vazia ou corrompida', () => {
  const app = comDados({ quebrado: '{nao e json', vazio: '', textoNull: 'null' });
  assert.equal(app.Armazenamento.lerJSON('nao-existe', 7), 7);
  assert.equal(app.Armazenamento.lerJSON('quebrado', 'pad'), 'pad');
  assert.equal(app.Armazenamento.lerJSON('vazio', 'pad'), 'pad');
  assert.equal(app.Armazenamento.lerJSON('textoNull', 'pad'), 'pad');
});

test('lerLista só aceita listas', () => {
  const app = comDados({ obj: '{"a":1}', lista: '[1,2]' });
  assert.deepEqual(puro(app.Armazenamento.lerLista('obj')), []);
  assert.deepEqual(puro(app.Armazenamento.lerLista('lista')), [1, 2]);
  assert.deepEqual(puro(app.Armazenamento.lerLista('nao-existe')), []);
});

test('gravar com armazenamento cheio devolve false em vez de quebrar o app', () => {
  const app = comDados({});
  app.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  const erroOriginal = console.error; console.error = () => {};
  try {
    assert.equal(app.Armazenamento.gravarJSON(app.CHAVES.CARRINHO, [1]), false);
  } finally { console.error = erroOriginal; }
});

test('histórico de versão antiga é migrado para a chave atual (sem apagar a antiga)', () => {
  const antigo = JSON.stringify([{ date: '2025-01-01', items: [] }]);
  const app = comDados({ sc_purchase_history: antigo });
  assert.equal(app.localStorage.getItem('sc_history_v3'), antigo);
  assert.equal(app.localStorage.getItem('sc_purchase_history'), antigo, 'a chave antiga fica como cópia');
});

test('migração respeita a ordem de preferência das chaves antigas', () => {
  const app = comDados({ compras: '[{"date":"c"}]', supercompras_history: '[{"date":"s"}]' });
  assert.equal(JSON.parse(app.localStorage.getItem('sc_history_v3'))[0].date, 's');
});

test('migração não sobrescreve um histórico atual que já existe (nem vazio)', () => {
  const app = comDados({ sc_history_v3: '[]', sc_purchase_history: '[{"date":"x"}]' });
  assert.equal(app.localStorage.getItem('sc_history_v3'), '[]');
});

test('loadApplicationData usa o histórico migrado e ignora dados corrompidos', () => {
  const app = comDados(
    { sc_purchase_history: '[{"dataISO":"2025-05-05","itens":[{"nome":"Café"}]}]', sc_cart_v3: '{quebrado' },
    ['js/armazenamento.js', 'js/state.js']);
  const erroOriginal = console.warn; console.warn = () => {};
  try { app.loadApplicationData(); } finally { console.warn = erroOriginal; }
  assert.equal(app.$('purchaseHistory.length'), 1);
  assert.equal(app.$('purchaseHistory[0].items[0].name'), 'Café');
  assert.equal(app.$('cart.length'), 0, 'carrinho corrompido vira lista vazia');
});

test('getSecurityToken lê a chave salva (ou vazio)', () => {
  const app = comDados({}, ['js/armazenamento.js', 'js/state.js']);
  assert.equal(app.getSecurityToken(), '');
  app.Armazenamento.gravarTexto(app.CHAVES.TOKEN_PLANILHA, 'chave-de-teste');
  assert.equal(app.getSecurityToken(), 'chave-de-teste');
});
