/**
 * SUPERCOMPRAS PRO - GESTÃO DE REDES DE SUPERMERCADOS (DESIGN AUTÔNOMO)
 */

window.renderizarCatalogoMercados = function() {
    const container = document.getElementById('lista-supermercados');
    const badgeTotal = document.getElementById('badge-total-mercados');
    const mercados = (supermarkets || []).filter(m => m.id !== 'm-padrao');

    if (badgeTotal) badgeTotal.textContent = mercados.length;
    if (!container) return;

    if (mercados.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 p-8 my-2">
                <p class="text-xs font-semibold text-slate-600">Nenhum supermercado cadastrado.</p>
            </div>`;
        return;
    }

    container.innerHTML = mercados.map(m => {
        const isCur = m.id === activeMarketId;

        if (window.AppTemplates && typeof window.AppTemplates.marketCard === 'function') {
            return AppTemplates.marketCard(m, isCur);
        }

        // Fallback seguro nativo em Tailwind
        const ehLocal = String(m.id).startsWith('m-custom-') || !m.colIndex;
        return `
            <div class="bg-white rounded-2xl p-3.5 border ${isCur ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'} shadow-2xs transition-all my-2 flex items-center justify-between gap-3">
                <div class="flex-1 min-w-0 cursor-pointer" onclick="selecionarMercado('${m.id}')">
                    <div class="flex items-center space-x-2 flex-wrap">
                        <strong class="font-extrabold text-sm text-slate-800 truncate">${m.name}</strong>
                        ${isCur ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md">ATIVO</span>` : ''}
                        ${ehLocal ? `<span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-md">LOCAL</span>` : ''}
                    </div>
                    <p class="text-xs text-slate-500 mt-1 truncate">${m.branch || 'SJP'}${m.promoDay ? ' • 🗓️ ' + m.promoDay : ''}</p>
                    ${m.address ? `<p class="text-[11px] text-slate-400 mt-0.5 truncate">${m.address}</p>` : ''}
                </div>

                <div class="flex items-center space-x-1.5 shrink-0">
                    ${m.address ? `
                        <button type="button" onclick="abrirSupermercadoNoMaps('${m.id}', true)" class="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors" title="Traçar rota">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                        </button>` : ''}
                    <button type="button" onclick="openMarketEditModal('${m.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Editar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button type="button" onclick="excluirMercadoCatalogo('${m.id}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors" title="Excluir">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

window.selecionarMercado = function(id) {
  activeMarketId = id;
  saveAllLocalData();
  refreshActiveMarketUI();
  switchActiveTab('compras');
  showAppToast(`Supermercado ativo alterado para ${getSelectedMarketName()}!`, 'success');
};

window.excluirMercadoCatalogo = function(marketId) {
  const m = (supermarkets || []).find(x => x.id === marketId);
  if (!m || m.id === 'm-padrao') return;

  if (confirm(`Deseja remover "${m.name}" do aplicativo?`)) {
    supermarkets = supermarkets.filter(x => x.id !== marketId);
    if (activeMarketId === marketId) activeMarketId = 'm-padrao';
    saveAllLocalData();
    refreshActiveMarketUI();
    renderizarCatalogoMercados();
    showAppToast(`"${m.name}" foi removido.`, 'info');
  }
};

window.openMarketEditModal = function(marketId = null) {
  const modal = document.getElementById('modalMarketEdit');
  const title = document.getElementById('modalMarketEditTitle');
  const idInput = document.getElementById('editMarketId');
  const nameInput = document.getElementById('editMarketName');
  const branchInput = document.getElementById('editMarketBranch');
  const addressInput = document.getElementById('editMarketAddress');
  const promoInput = document.getElementById('editMarketPromoDay');

  const isEditing = typeof marketId === 'string' && marketId.trim().length > 0;

  if (isEditing) {
    const m = (supermarkets || []).find(x => x.id === marketId);
    if (!m) return;
    if (title) title.innerText = 'Editar Supermercado';
    if (idInput) idInput.value = m.id;
    if (nameInput) nameInput.value = m.name || '';
    if (branchInput) branchInput.value = m.branch || '';
    if (addressInput) addressInput.value = m.address || '';
    if (promoInput) promoInput.value = m.promoDay || '';
  } else {
    if (title) title.innerText = 'Novo Supermercado';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (branchInput) branchInput.value = '';
    if (addressInput) addressInput.value = '';
    if (promoInput) promoInput.value = '';
  }
  modal?.classList.remove('hidden');
  setTimeout(() => nameInput?.focus(), 50);
};

window.closeMarketEditModal = function() {
  document.getElementById('modalMarketEdit')?.classList.add('hidden');
};

document.getElementById('formSaveMarket')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editMarketId')?.value;
  const name = document.getElementById('editMarketName')?.value.trim();
  const branch = document.getElementById('editMarketBranch')?.value.trim();
  const address = document.getElementById('editMarketAddress')?.value.trim();
  const promoDay = document.getElementById('editMarketPromoDay')?.value.trim();

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
  refreshActiveMarketUI();
  renderizarCatalogoMercados();
  closeMarketEditModal();
  showAppToast('Supermercado salvo com sucesso!', 'success');
});