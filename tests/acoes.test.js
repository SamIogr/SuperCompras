const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { carregarApp, ARQUIVOS_CARRINHO, ARQUIVOS_HISTORICO, listarArquivosJs, RAIZ } = require('./carregar-app');

const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

// elemento falso: dataset + closest('[data-acao]') devolve ele mesmo
function elemento(dataset, extra = {}) {
  const el = { dataset, ...extra };
  el.closest = () => el;
  return el;
}

// ------------------------------------------------------------ registro
test('Acoes: chama a ação registrada com o elemento', () => {
  const app = carregarApp(['js/ui/acoes.js']);
  let recebido = null;
  app.Acoes.registrarClique({ 'teste-a': el => { recebido = el.dataset.id; } });
  app.Acoes.despachar('click', { target: elemento({ acao: 'teste-a', id: 'x1' }) });
  assert.equal(recebido, 'x1');
});

test('Acoes: ação não registrada é ignorada; nome repetido é erro', () => {
  const app = carregarApp(['js/ui/acoes.js']);
  app.Acoes.despachar('click', { target: elemento({ acao: 'nao-existe' }) });   // não quebra
  app.Acoes.registrarClique({ 'teste-b': () => {} });
  assert.throws(() => app.Acoes.registrarClique({ 'teste-b': () => {} }), /já foi registrada/);
});

test('noProprioElemento: só age quando o toque é no próprio fundo do modal', () => {
  const app = carregarApp(['js/ui/acoes.js']);
  let fechou = 0;
  const acao = app.noProprioElemento(() => fechou++);
  const fundo = {};
  acao(fundo, { target: {} });       // toque no conteúdo do modal
  acao(fundo, { target: fundo });    // toque no fundo
  assert.equal(fechou, 1);
});

// ------------------------------------------------------------ todo data-acao tem dono
test('toda data-acao usada no app tem uma ação registrada', () => {
  const app = carregarApp(['js/eventos.js', 'js/ui/acoes.js', 'js/armazenamento.js', 'js/state.js',
    'js/sync-coordenador.js', 'js/origem.js', 'js/templates.js', 'js/markets.js', 'js/api.js', ...ARQUIVOS_CARRINHO, ...ARQUIVOS_HISTORICO]);
  const fontes = ['index.html', ...fs.readdirSync(path.join(RAIZ, 'components')).map(f => 'components/' + f), ...listarArquivosJs()];
  const semDono = [];
  for (const f of fontes) {
    for (const m of ler(f).matchAll(/data-acao="([a-z0-9-]+)"/g)) {
      const nome = m[1];
      if (!['click', 'change', 'input', 'submit'].some(tipo => app.Acoes.existe(tipo, nome))) semDono.push(`${nome} (${f})`);
    }
  }
  assert.deepEqual(semDono, []);
});

// ------------------------------------------------------------ tela do histórico
test('tela do histórico não tem onclick/onchange embutido', () => {
  for (const f of [...ARQUIVOS_HISTORICO, 'components/tab-historico.html']) {
    assert.doesNotMatch(ler(f), /\son(click|change|input)="/, f);
  }
});

test('componente do histórico: sem o modal morto e sem </body> solto', () => {
  const html = ler('components/tab-historico.html');
  assert.doesNotMatch(html, /modalHistTitulo|<\/body>/);
  assert.equal((html.match(/id="modalDetalhesHistorico"/g) || []).length, 0,
    'o modal de detalhes é criado por detalhes.js; um segundo com o mesmo id causava id duplicado');
});

function appHistorico() {
  return carregarApp(['js/eventos.js', 'js/ui/acoes.js', 'js/armazenamento.js', 'js/state.js',
    'js/sync-coordenador.js', 'js/origem.js', ...ARQUIVOS_HISTORICO]);
}

test('botões da lista do histórico chamam a função certa com o índice certo', () => {
  const app = appHistorico();
  const chamadas = [];
  for (const fn of ['abrirDetalhesCompraHistorico', 'abrirModalComparadorHistorico', 'restaurarCompraParaCarrinho', 'excluirCompraHistorico']) {
    app[fn] = idx => chamadas.push([fn, idx]);
  }
  for (const acao of ['historico-detalhes', 'historico-comparar', 'historico-repetir', 'historico-excluir']) {
    app.Acoes.despachar('click', { target: elemento({ acao, idx: '2' }) });
  }
  assert.deepEqual(chamadas, [
    ['abrirDetalhesCompraHistorico', 2], ['abrirModalComparadorHistorico', 2],
    ['restaurarCompraParaCarrinho', 2], ['excluirCompraHistorico', 2]]);
});

test('"Repetir" dentro do cupom repete e fecha', () => {
  const app = appHistorico();
  const ordem = [];
  app.restaurarCompraParaCarrinho = idx => ordem.push('repetir ' + idx);
  app.fecharModalDetalhesHistorico = () => ordem.push('fechar');
  app.Acoes.despachar('click', { target: elemento({ acao: 'historico-repetir-e-fechar', idx: '0' }) });
  assert.deepEqual(ordem, ['repetir 0', 'fechar']);
});

test('marcar compra (change) passa o id e o estado do checkbox', () => {
  const app = appHistorico();
  let recebido;
  app.toggleSelectHistoryItem = (id, marcado) => { recebido = [id, marcado]; };
  app.Acoes.despachar('change', { target: elemento({ acao: 'historico-marcar', id: "pur-'x\"" }, { checked: true }) });
  assert.deepEqual(recebido, ["pur-'x\"", true], 'id com aspas chega intacto, sem virar código');
});

test('comparador: trocar a compra atualiza o mercado e redesenha; modo vem do data-modo', () => {
  const app = appHistorico();
  const ordem = [];
  app.atualizarMercadoPadraoDaCompra = () => ordem.push('mercado');
  app.renderizarComparacaoHistoricaAtual = () => ordem.push('render');
  app.alternarModoComparacaoHistorico = modo => ordem.push('modo ' + modo);
  app.Acoes.despachar('change', { target: elemento({ acao: 'historico-comparador-compra' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'historico-comparador-modo', modo: 'carrinho' }) });
  assert.deepEqual(ordem, ['mercado', 'render', 'modo carrinho']);
});

test('lista do histórico gera botões com data-acao (sem onclick) e escapa o id', () => {
  const app = appHistorico();
  let html = '';
  const container = { set innerHTML(v) { html = v; }, get innerHTML() { return html; }, classList: { add() {}, remove() {} } };
  app.document.getElementById = id => (id === 'historicoListaContainer' ? container : null);
  app.Armazenamento.gravarJSON(app.CHAVES.HISTORICO, [{ id: 'pur-"1"', date: '2026-01-01', marketName: 'Condor', total: 10, items: [] }]);
  app.renderHistoricoUI();
  assert.match(html, /data-acao="historico-detalhes" data-idx="0"/);
  assert.match(html, /data-acao="historico-marcar" data-id="pur-&quot;1&quot;"/);
  assert.doesNotMatch(html, /\son(click|change)="/);
});
