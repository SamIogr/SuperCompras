/**
 * SUPERCOMPRAS PRO - GESTÃO DE REDES DE SUPERMERCADOS (js/markets.js)
 */

function selecionarMercado(id) {
  recalcularPrecosCarrinhoPorMercado(id);
  switchActiveTab('compras');
  if (typeof showAppToast === 'function') {
    showAppToast(`Supermercado ativo alterado para ${getSelectedMarketName()}!`, 'success');
  }
}
window.selecionarMercado = selecionarMercado;

function excluirMercadoCatalogo(marketId) {
  const m = (supermarkets || []).find(x => x.id === marketId);
  if (!m || m.id === 'm-padrao') return;

  openCustomDialog(
    'Remover Supermercado?',
    `Deseja remover "${m.name}" da lista de redes?`,
    'Sim, Remover',
    null,
    () => {
      supermarkets = supermarkets.filter(x => x.id !== marketId);
      if (activeMarketId === marketId) activeMarketId = 'm-padrao';
      saveAllLocalData();
      if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
      if (typeof renderMarketsUI === 'function') renderMarketsUI();
      if (typeof showAppToast === 'function') showAppToast(`"${m.name}" foi removido.`, 'info');
    }
  );
}
window.excluirMercadoCatalogo = excluirMercadoCatalogo;

function openMarketEditModal(marketId = null) {
  const mercado = marketId ? (supermarkets || []).find(x => x.id === marketId) : null;
  if (window.AppTemplates && typeof window.AppTemplates.renderMarketEditModal === 'function') {
    window.AppTemplates.renderMarketEditModal(mercado);
  }
}
window.openMarketEditModal = openMarketEditModal;

function closeMarketEditModal() {
  document.querySelectorAll('#modalMarketEditDynamic').forEach(el => el.remove());
}
window.closeMarketEditModal = closeMarketEditModal;

function salvarSupermercadoSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = document.getElementById('dinMarketId')?.value;
  const name = (document.getElementById('dinMarketName')?.value || '').trim();
  const branch = (document.getElementById('dinMarketBranch')?.value || '').trim();
  const address = (document.getElementById('dinMarketAddress')?.value || '').trim();
  const promoDay = (document.getElementById('dinMarketPromoDay')?.value || '').trim();

  if (!name) return;

  if (id) {
    const m = supermarkets.find(x => x.id === id);
    if (m) {
      m.name = name;
      m.branch = branch;
      m.address = address;
      m.promoDay = promoDay;
    }
  } else {
    supermarkets.push({
      id: 'm-custom-' + Date.now(),
      name: name,
      branch: branch || 'São José dos Pinhais',
      address: address,
      promoDay: promoDay,
      urlEncarte: '',
      notes: '',
      colIndex: null
    });
  }

  saveAllLocalData();
  if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  closeMarketEditModal();
  if (typeof showAppToast === 'function') showAppToast('Supermercado salvo com sucesso!', 'success');
}
window.salvarSupermercadoSubmit = salvarSupermercadoSubmit;