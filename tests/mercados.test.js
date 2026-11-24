const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarApp } = require('./carregar-app');

const SCRIPTS = ['js/armazenamento.js', 'js/state.js', 'js/sync-coordenador.js', 'js/origem.js', 'js/templates.js',
  'js/markets.js', 'js/api.js', 'js/drive-sync.js'];
const puro = v => JSON.parse(JSON.stringify(v));

function novoApp() {
  const app = carregarApp(SCRIPTS);
  app.$(`supermarkets = [
    MERCADO_PADRAO_GENERICO,
    { id: 'm-condor', name: 'Condor', colIndex: 6 },
    { id: 'm-custom-1', name: 'Mercadinho do Zé' }
  ]`);
  app.$(`products = [
    { id: 'PROD-001', name: 'Arroz', marketPrices: { 'm-custom-1': 25.9, 'm-condor': 24.5 },
      brands: [{ id: 'Tio João', name: 'Tio João', marketPrices: { 'm-custom-1': 29.9 } }] },
    { id: 'p-custom-9', name: 'Pão caseiro', marketPrices: { 'm-custom-1': 8 }, brands: [] }
  ]`);
  app.$(`purchaseHistory = [{ date: '2026-01-01', marketId: 'm-custom-1', items: [] }]`);
  app.$(`activeMarketId = 'm-custom-1'`);
  return app;
}

// ------------------------------------------------------------ origem
test('origem dos mercados: referência, planilha e local', () => {
  const app = novoApp();
  assert.equal(app.obterOrigem('mercados', { id: 'm-padrao' }), 'padrao');
  assert.equal(app.obterOrigem('mercados', { id: 'm-condor', colIndex: 6 }), 'planilha');
  assert.equal(app.obterOrigem('mercados', { id: 'm-custom-1' }), 'local');
});

test('origem dos produtos: PROD- é planilha, p-custom é local', () => {
  const app = novoApp();
  assert.equal(app.obterOrigem('produtos', { id: 'PROD-001', name: 'Arroz' }), 'planilha');
  assert.equal(app.obterOrigem('produtos', { id: 'p-custom-9', name: 'Pão' }), 'local');
});

test('"Drive" só aparece depois que o item realmente subiu', () => {
  const app = novoApp();
  const mercado = { id: 'm-custom-1', name: 'Mercadinho do Zé' };
  assert.equal(app.obterOrigem('mercados', mercado), 'local', 'Drive desconectado');

  app.Armazenamento.gravarTexto(app.CHAVES.DRIVE_CONECTADO, '1');
  app.driveGravarMeta({ ultimaSync: 1000, ents: { mercados: { 'm-custom-1': { t: 900 } } }, tomb: {} });
  assert.equal(app.obterOrigem('mercados', mercado), 'drive', 'alterado antes da última sincronização');

  app.driveGravarMeta({ ultimaSync: 1000, ents: { mercados: { 'm-custom-1': { t: 1500 } } }, tomb: {} });
  assert.equal(app.obterOrigem('mercados', mercado), 'local', 'alterado depois: ainda não subiu');

  app.driveGravarMeta({ ultimaSync: 1000, ents: { produtos: { 'pao caseiro': { t: 10 } } }, tomb: {} });
  assert.equal(app.obterOrigem('produtos', { id: 'p-custom-9', name: 'Pão Caseiro' }), 'drive', 'produto: chave pelo nome normalizado');
});

test('contarOrigens e filtro: referência só conta em "Todos"; filtro vazio volta para "todos"', () => {
  const app = novoApp();
  const c = puro(app.contarOrigens('mercados', app.$('supermarkets')));
  assert.deepEqual(c, { todos: 3, 'planilha-drive': 0, planilha: 1, drive: 0, local: 1 });
  assert.equal(app.filtroOrigemValido('drive', c), 'todos');
  assert.equal(app.filtroOrigemValido('local', c), 'local');
});

test('botões do filtro só mostram origens com itens e usam delegação (sem onclick)', () => {
  const app = novoApp();
  const html = app.botoesFiltroOrigemHtml('mercados', { todos: 3, 'planilha-drive': 0, planilha: 1, drive: 0, local: 1 }, 'local');
  assert.match(html, /data-acao="filtro-origem" data-alvo="mercados" data-origem="todos"/);
  assert.match(html, /Só Planilha/);
  assert.match(html, /Local/);
  assert.doesNotMatch(html, /Só Drive|onclick/);
});

// ------------------------------------------------------------ troca de id
test('remapearIdMercado leva preços, marcas, histórico e mercado ativo para o id novo', () => {
  const app = novoApp();
  app.remapearIdMercado('m-custom-1', 'm-mercadinho');
  assert.equal(app.$(`supermarkets.find(m => m.name === 'Mercadinho do Zé').id`), 'm-mercadinho');
  assert.deepEqual(puro(app.$('products[0].marketPrices')), { 'm-condor': 24.5, 'm-mercadinho': 25.9 });
  assert.deepEqual(puro(app.$('products[0].brands[0].marketPrices')), { 'm-mercadinho': 29.9 });
  assert.equal(app.$('purchaseHistory[0].marketId'), 'm-mercadinho');
  assert.equal(app.$('activeMarketId'), 'm-mercadinho');
});

// ------------------------------------------------------------ envio para a planilha
function planilhaFalsa(app, respostaCriar) {
  const chamadas = [];
  app.fetch = async (url, opcoes) => {
    const corpo = opcoes && opcoes.body ? JSON.parse(opcoes.body) : {};
    chamadas.push(corpo);
    const json = corpo.action === 'criar_mercado' ? respostaCriar : { status: 'success' };
    return { json: async () => json };
  };
  app.Armazenamento.gravarTexto(app.CHAVES.TOKEN_PLANILHA, 'chave-de-teste');
  return chamadas;
}

test('enviar mercado para a planilha: cria a coluna, troca o id e envia os preços dos produtos da planilha', async () => {
  const app = novoApp();
  const chamadas = planilhaFalsa(app, { status: 'success', novoId: 'm-mercadinho', colIndex: 9, name: 'Mercadinho do Zé' });

  await app._enviarMercadoParaPlanilha('m-custom-1');

  assert.equal(chamadas[0].action, 'criar_mercado');
  assert.equal(chamadas[0].name, 'Mercadinho do Zé');
  const precos = chamadas.filter(c => c.action === 'atualizar_preco');
  assert.deepEqual(precos.map(c => [c.name, c.brand, c.price, c.marketColIndex]),
    [['Arroz', 'Padrão', 25.9, 9], ['Arroz', 'Tio João', 29.9, 9]],
    'Pão caseiro é local: não vai para a planilha');
  const m = app.$(`supermarkets.find(m => m.id === 'm-mercadinho')`);
  assert.equal(m.colIndex, 9);
  assert.equal(app.obterOrigem('mercados', m), 'planilha');
  assert.equal(app.$('products[1].marketPrices["m-mercadinho"]'), 8, 'preço do produto local também acompanha o id novo');
});

test('não envia se já existe um mercado com o mesmo nome na planilha', async () => {
  const app = novoApp();
  app.$(`supermarkets.push({ id: 'm-custom-2', name: 'CONDÔR' })`);
  const chamadas = planilhaFalsa(app, { status: 'success', novoId: 'x', colIndex: 10 });
  await app._enviarMercadoParaPlanilha('m-custom-2');
  assert.equal(chamadas.length, 0);
});

test('se a planilha recusar, nada muda no aparelho', async () => {
  const app = novoApp();
  planilhaFalsa(app, { status: 'error', message: 'Acesso não autorizado' });
  await app._enviarMercadoParaPlanilha('m-custom-1');
  assert.ok(app.$(`supermarkets.some(m => m.id === 'm-custom-1')`));
  assert.equal(app.$('purchaseHistory[0].marketId'), 'm-custom-1');
});

test('mercado que já está na planilha não é enviado de novo', async () => {
  const app = novoApp();
  const chamadas = planilhaFalsa(app, { status: 'success', novoId: 'x', colIndex: 10 });
  await app._enviarMercadoParaPlanilha('m-condor');
  assert.equal(chamadas.length, 0);
});
