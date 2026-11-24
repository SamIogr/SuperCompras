const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { carregarApp, ARQUIVOS_CATALOGO, RAIZ } = require('./carregar-app');

const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
function elemento(dataset, extra = {}) {
  const el = { dataset, ...extra };
  el.closest = () => el;
  return el;
}
function appCatalogo() {
  return carregarApp(['js/eventos.js', 'js/ui/acoes.js', 'js/armazenamento.js', 'js/state.js',
    'js/sync-coordenador.js', 'js/origem.js', ...ARQUIVOS_CATALOGO]);
}

// ------------------------------------------------------------ estrutura
test('catálogo sem handlers embutidos (onclick, oninput, onkeydown, onsubmit...)', () => {
  for (const f of ARQUIVOS_CATALOGO) assert.doesNotMatch(ler(f), /\son[a-z]+="/, f);
});

test('código antigo saiu: products.js, markets.js, partes do templates.js e setSubTabDados do ui.js', () => {
  assert.ok(!fs.existsSync(path.join(RAIZ, 'js/products.js')));
  assert.ok(!fs.existsSync(path.join(RAIZ, 'js/markets.js')));
  const tpl = ler('js/telas/carrinho/cards.js');   // o antigo templates.js
  for (const m of ['ensureTabDadosLayout', 'productCard', 'marketCard', 'renderCatalog', 'renderMarkets', 'renderProductEditModal', 'renderMarketEditModal', 'configurarScrollRetratilCatalogo']) {
    assert.ok(!tpl.includes(m), `templates.js ainda tem ${m}`);
  }
  assert.doesNotMatch(ler('js/ui.js'), /function setSubTabDados/);
});

test('os métodos do catálogo continuam no AppTemplates (chamadas antigas funcionam)', () => {
  const app = appCatalogo();
  for (const m of ['ensureTabDadosLayout', 'productCard', 'marketCard', 'renderCatalog', 'renderMarkets', 'renderProductEditModal', 'renderMarketEditModal', 'emptyState', 'renderCart']) {
    assert.equal(typeof app.AppTemplates[m], 'function', m);
  }
  assert.equal(typeof app.renderCatalogUI, 'function');
  assert.equal(typeof app.renderMarketsUI, 'function');
});

test('card de produto e de mercado usam data-acao e escapam o nome', () => {
  const app = appCatalogo();
  app.$(`activeMarketId = 'm-padrao'`);
  const prod = app.AppTemplates.productCard({ id: 'PROD-1', name: '<b>Arroz</b>', marketPrices: {}, brands: [] }, 'Mercado');
  assert.match(prod, /data-acao="produto-editar" data-id="PROD-1"/);
  assert.match(prod, /&lt;b&gt;Arroz&lt;\/b&gt;/);
  const merc = app.AppTemplates.marketCard({ id: 'm-custom-1', name: 'Zé', address: 'Rua A' });
  assert.match(merc, /data-acao="mercado-rota" data-id="m-custom-1"/);
  assert.doesNotMatch(prod + merc, /\son[a-z]+="/);
});

// ------------------------------------------------------------ ações
test('filtros: setor com acento chega intacto; busca e ordem chamam as funções certas', () => {
  const app = appCatalogo();
  const chamadas = [];
  app.filtrarSetorProdutos = (setor, el) => chamadas.push(['setor', setor, Boolean(el)]);
  app.filtrarProdutosCatalogo = () => chamadas.push(['busca']);
  app.ordenarProdutosCatalogo = () => chamadas.push(['ordem']);
  app.setSubTabDados = aba => chamadas.push(['aba', aba]);
  app.Acoes.despachar('click', { target: elemento({ acao: 'catalogo-setor', setor: 'Açougue e Carnes' }) });
  app.Acoes.despachar('input', { target: elemento({ acao: 'catalogo-busca' }) });
  app.Acoes.despachar('change', { target: elemento({ acao: 'catalogo-ordenar' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'catalogo-subaba', aba: 'mercados' }) });
  assert.deepEqual(chamadas, [['setor', 'Açougue e Carnes', true], ['busca'], ['ordem'], ['aba', 'mercados']]);
});

test('nova marca no modal: digitar guarda o texto; Enter adiciona sem enviar o formulário', () => {
  const app = appCatalogo();
  let adicionou = 0, impediu = 0;
  app.adicionarMarcaInlineModal = () => adicionou++;
  app.Acoes.despachar('input', { target: elemento({ acao: 'produto-modal-nova-marca' }, { value: 'Tio João' }) });
  assert.equal(app.$('textoNovaMarcaEmEdicao'), 'Tio João');
  app.Acoes.despachar('keydown', { key: 'a', target: elemento({ acao: 'produto-modal-nova-marca' }), preventDefault: () => impediu++ });
  assert.equal(adicionou, 0, 'outras teclas não adicionam');
  app.Acoes.despachar('keydown', { key: 'Enter', target: elemento({ acao: 'produto-modal-nova-marca' }), preventDefault: () => impediu++ });
  assert.equal(adicionou, 1);
  assert.equal(impediu, 1);
});

test('formulários de produto e mercado: salvar recebe o evento e não recarrega a página', () => {
  const app = appCatalogo();
  const recebidos = [];
  app.salvarEdicaoProdutoForm = e => recebidos.push(['produto', typeof e.preventDefault]);
  app.salvarSupermercadoSubmit = e => recebidos.push(['mercado', typeof e.preventDefault]);
  let impediu = 0;
  app.Acoes.despachar('submit', { target: elemento({ acao: 'produto-modal-salvar' }), preventDefault: () => impediu++ });
  app.Acoes.despachar('submit', { target: elemento({ acao: 'mercado-modal-salvar' }), preventDefault: () => impediu++ });
  assert.deepEqual(recebidos, [['produto', 'function'], ['mercado', 'function']]);
  assert.equal(impediu, 2);
});

test('modal do produto: marca, excluir marca e preço por rede passam os dados certos', () => {
  const app = appCatalogo();
  const chamadas = [];
  app.aoMudarSelectMarcaModal = v => chamadas.push(['marca', v]);
  app.excluirMarcaModalEdicao = m => chamadas.push(['excluir', m]);
  app.salvarPrecoDiretoModal = (id, v) => chamadas.push(['preco', id, v]);
  app.Acoes.despachar('change', { target: elemento({ acao: 'produto-modal-marca' }, { value: 'Camil' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'produto-modal-marca-excluir', marca: "D'ajuda" }) });
  app.Acoes.despachar('change', { target: elemento({ acao: 'produto-modal-preco-mercado', id: 'm-condor' }, { value: '12,90' }) });
  assert.deepEqual(chamadas, [['marca', 'Camil'], ['excluir', "D'ajuda"], ['preco', 'm-condor', '12,90']]);
});

test('itens sugeridos: marcar/desmarcar todos e adicionar', () => {
  const app = appCatalogo();
  const chamadas = [];
  app.toggleSelectAllSugeridos = m => chamadas.push(m);
  app.adicionarItensSugeridosSelecionados = () => chamadas.push('adicionar');
  app.Acoes.despachar('click', { target: elemento({ acao: 'sugeridos-marcar-todos', marcar: '1' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'sugeridos-marcar-todos', marcar: '0' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'sugeridos-adicionar' }) });
  assert.deepEqual(chamadas, [true, false, 'adicionar']);
});

test('modal de mercado fecha ao tocar fora, não ao tocar no conteúdo', () => {
  const app = appCatalogo();
  let fechou = 0;
  app.closeMarketEditModal = () => fechou++;
  const fundo = elemento({ acao: 'mercado-modal-fundo' });
  app.Acoes.despachar('click', { target: { closest: () => fundo } });   // toque num campo dentro do modal
  app.Acoes.despachar('click', { target: fundo });                      // toque no fundo
  assert.equal(fechou, 1);
});
