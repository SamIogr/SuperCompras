/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - HISTÓRICO: AÇÕES DOS BOTÕES (delegação, ver js/ui/acoes.js) (js/telas/historico/acoes.js)
 */

const _idx = el => Number(el.dataset.idx);

Acoes.registrarClique({
  // lista
  'historico-detalhes':             el => abrirDetalhesCompraHistorico(_idx(el)),
  'historico-comparar':             el => abrirModalComparadorHistorico(_idx(el)),
  'historico-repetir':              el => restaurarCompraParaCarrinho(_idx(el)),
  'historico-excluir':              el => excluirCompraHistorico(_idx(el)),
  'historico-excluir-selecionados': () => excluirHistoricosSelecionados(),
  'historico-limpar-tudo':          () => limparTodoHistorico(),
  // dupla confirmação
  'historico-confirmacao-fechar':   () => fecharModalConfirmacaoDupla(),
  // cupom
  'historico-detalhes-fechar':      () => fecharModalDetalhesHistorico(),
  'historico-repetir-e-fechar':     el => { restaurarCompraParaCarrinho(_idx(el)); fecharModalDetalhesHistorico(); },
  // comparador
  'historico-comparador-fundo':     noProprioElemento(() => fecharModalComparadorHistorico()),
  'historico-comparador-fechar':    () => fecharModalComparadorHistorico(),
  'historico-comparador-modo':      el => alternarModoComparacaoHistorico(el.dataset.modo),
  'historico-comparador-item':      el => toggleDetalhesComparadorItem(_idx(el)),
});

Acoes.registrarMudanca({
  'historico-marcar':               el => toggleSelectHistoryItem(el.dataset.id, el.checked),
  'historico-comparador-compra':    () => { atualizarMercadoPadraoDaCompra(); renderizarComparacaoHistoricaAtual(); },
  'historico-comparador-mercado':   () => renderizarComparacaoHistoricaAtual(),
});

export {};
