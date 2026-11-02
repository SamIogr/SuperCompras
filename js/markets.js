/**
 * SUPERCOMPRAS PRO - GESTÃO DE REDES DE SUPERMERCADOS (js/markets.js)
 */

// 1. RENDERIZAÇÃO DA LISTA DE SUPERMERCADOS (NOME ÚNICO: renderMarketsUI)
function renderMarketsUI() {
  const container = document.getElementById('lista-supermercados');
  const badgeTotal = document.getElementById('badge-total-mercados');
  const mercados = (Array.isArray(supermarkets) ? supermarkets : []).filter(m => m.id !== 'm-padrao');

  if (badgeTotal) badgeTotal.textContent = mercados.length;
  if (!container) return;

  if (mercados.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 p-6 my-2 text-slate-400">
        <p class="text-xs font-semibold text-slate-600">Nenhum supermercado cadastrado.</p>
      </div>`;
    return;
  }

  container.innerHTML = mercados.map(m => {
    const isCur = m.id === activeMarketId;
    const ehLocal = String(m.id).startsWith('m-custom-') || !m.colIndex;

    return `
      <div class="bg-white rounded-2xl p-3.5 border ${isCur ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'} shadow-2xs transition-all my-2 flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0 cursor-pointer" onclick="selecionarMercado('${m.id}')">
          <div class="flex items-center space-x-2 flex-wrap">
            <strong class="font-extrabold text-sm text-slate-800 truncate">${m.name}</strong>
            ${isCur ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md">ATIVO</span>` : ''}
            ${ehLocal ? `<span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-md">LOCAL</span>` : ''}
          </div>
          <p class="text-xs text-slate-500 mt-1 truncate">${m.branch || 'São José dos Pinhais'}${m.promoDay ? ' • 🗓️ ' + m.promoDay : ''}</p>
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
}

// 2. SELEÇÃO DO SUPERMERCADO ATIVO
function selecionarMercado(id) {
  recalcularPrecosCarrinhoPorMercado(id);
  switchActiveTab('compras');
  showAppToast(`Supermercado ativo alterado para ${getSelectedMarketName()}!`, 'success');
}

// 3. EXCLUSÃO DE SUPERMERCADO
function excluirMercadoCatalogo(marketId) {
  const m = (supermarkets || []).find(x => x.id === marketId);
  if (!m || m.id === 'm-padrao') return;

  if (confirm(`Deseja remover "${m.name}" do aplicativo?`)) {
    supermarkets = supermarkets.filter(x => x.id !== marketId);
    if (activeMarketId === marketId) activeMarketId = 'm-padrao';
    saveAllLocalData();
    refreshActiveMarketUI();
    renderMarketsUI();
    showAppToast(`"${m.name}" foi removido.`, 'info');
  }
}

// 4. MODAL DINÂMICO DE NOVO / EDITAR SUPERMERCADO (NOME ÚNICO: openMarketEditModal)
function openMarketEditModal(marketId = null) {
  document.querySelectorAll('#modalMarketEdit').forEach(el => el.remove());

  let mercado = null;
  if (marketId) {
    mercado = (supermarkets || []).find(x => x.id === marketId);
  }

  const modalHtml = `
    <div id="modalMarketEdit" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" onclick="if(event.target === this) closeMarketEditModal();">
      <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="font-extrabold text-slate-800 text-base">${mercado ? 'Editar Supermercado' : 'Novo Supermercado'}</h3>
          <button type="button" onclick="closeMarketEditModal()" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form id="formSaveMarketDynamic" onsubmit="salvarSupermercadoSubmit(event)" class="space-y-3 pt-3">
          <input type="hidden" id="dinMarketId" value="${mercado ? mercado.id : ''}">
          
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Nome da Rede *</label>
            <input type="text" id="dinMarketName" value="${mercado ? mercado.name : ''}" required placeholder="Ex: Supermercados Goes" class="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Filial / Bairro</label>
            <input type="text" id="dinMarketBranch" value="${mercado ? (mercado.branch || '') : ''}" placeholder="Ex: Afonso Pena / Urano" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Endereço Completo</label>
            <input type="text" id="dinMarketAddress" value="${mercado ? (mercado.address || '') : ''}" placeholder="Ex: Av. Rui Barbosa, 1230" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Dias de Promoção / Encarte</label>
            <input type="text" id="dinMarketPromoDay" value="${mercado ? (mercado.promoDay || '') : ''}" placeholder="Ex: Terça e Quarta da Carne" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
          </div>

          <div class="border-t border-slate-100 pt-3 flex items-center justify-end space-x-2 bg-white">
            <button type="button" onclick="closeMarketEditModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
              Cancelar
            </button>
            <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all">
              Salvar Supermercado
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  setTimeout(() => document.getElementById('dinMarketName')?.focus(), 50);
}

function closeMarketEditModal() {
  document.querySelectorAll('#modalMarketEdit').forEach(el => el.remove());
}

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
  refreshActiveMarketUI();
  renderMarketsUI();
  closeMarketEditModal();
  showAppToast('Supermercado salvo com sucesso!', 'success');
}