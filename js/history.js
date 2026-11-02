/**
 * SUPERCOMPRAS PRO - GERENCIAMENTO DE HISTÓRICO DE COMPRAS
 * Integração direta com AppTemplates para renderização visual.
 */

function obterHistoricoLocal() {
  try {
    return JSON.parse(localStorage.getItem('sc_purchase_history')) || [];
  } catch (e) {
    return [];
  }
}

function salvarHistoricoLocal(lista) {
  localStorage.setItem('sc_purchase_history', JSON.stringify(lista));
}

window.renderHistoricoUI = function() {
  const container = document.getElementById('historicoListaContainer');
  const emptyState = document.getElementById('historicoVazioContainer');
  if (!container) return;

  const historico = obterHistoricoLocal();

  // 1. Atualização dos indicadores de métricas
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const comprasMes = historico.filter(h => {
    const d = new Date(h.dataISO || h.date || h.data);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const totalMes = comprasMes.reduce((acc, cur) => acc + (cur.total || 0), 0);
  const mediaCompra = historico.length > 0 ? (historico.reduce((acc, cur) => acc + (cur.total || 0), 0) / historico.length) : 0;

  const elTotalMes = document.getElementById('histMetricaGastoMes');
  const elMedia = document.getElementById('histMetricaMediaCompra');
  const elQtd = document.getElementById('histMetricaQtdCompras');

  if (elTotalMes) elTotalMes.innerText = 'R$ ' + formatBRL(totalMes);
  if (elMedia) elMedia.innerText = 'R$ ' + formatBRL(mediaCompra);
  if (elQtd) elQtd.innerText = `${historico.length} compra${historico.length === 1 ? '' : 's'}`;

  // 2. Renderização da lista através do AppTemplates
  if (historico.length === 0) {
    container.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  container.innerHTML = historico.map((compra, idx) => {
    return AppTemplates.historyCard(compra, idx);
  }).join('');
};

window.abrirDetalhesCompraHistorico = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  if (!compra) return;

  const modal = document.getElementById('modalDetalhesHistorico');
  const titulo = document.getElementById('modalHistTitulo');
  const subtitulo = document.getElementById('modalHistSubtitulo');
  const total = document.getElementById('modalHistValorTotal');
  const lista = document.getElementById('modalHistItensLista');
  const btnRepetir = document.getElementById('btnRepetirCompraCarrinho');

  const dataFormatada = new Date(compra.dataISO || compra.date || compra.data).toLocaleDateString('pt-BR');
  if (titulo) titulo.innerText = compra.marketName || compra.mercadoNome || 'Fechamento de Compra';
  if (subtitulo) subtitulo.innerText = `${dataFormatada} • ${(compra.items?.length || compra.itens?.length || 0)} produtos`;
  if (total) total.innerText = 'R$ ' + formatBRL(compra.total);

  if (lista) {
    lista.innerHTML = (compra.items || compra.itens || []).map(it => {
      return AppTemplates.historyDetailRow(it);
    }).join('');
  }

  if (btnRepetir) {
    btnRepetir.onclick = () => {
      restaurarCompraParaCarrinho(idx);
      fecharModalDetalhesHistorico();
    };
  }

  modal?.classList.remove('hidden');
};

window.fecharModalDetalhesHistorico = function() {
  document.getElementById('modalDetalhesHistorico')?.classList.add('hidden');
};

window.restaurarCompraParaCarrinho = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  const itens = compra?.items || compra?.itens;
  if (!compra || !Array.isArray(itens)) return;

  cart = itens.map(it => ({
    productId: it.productId || it.id,
    name: it.name,
    selectedBrandId: it.brand || it.selectedBrandId || 'Padrão',
    unitPrice: it.price || it.unitPrice || 0,
    quantity: it.quantity || 1,
    unit: it.unit || 'un',
    checked: false
  }));

  if (compra.marketId) {
    activeMarketId = compra.marketId;
  }

  saveCartData();
  saveAllLocalData();
  switchActiveTab('compras');
  if (typeof renderCartUI === 'function') renderCartUI();
  showAppToast('Lista restaurada para a aba Compras!', 'success');
};

window.limparTodoHistorico = function() {
  if (confirm('Tem certeza de que deseja apagar todo o histórico de compras deste aparelho?')) {
    localStorage.removeItem('sc_purchase_history');
    renderHistoricoUI();
    showAppToast('Histórico esvaziado com sucesso.', 'info');
  }
};