/**
 * SUPERCOMPRAS PRO - CATÁLOGO MESTRE, COTAÇÕES E PAINEL DE MARCAS
 */
function setCatalogSyncFilter(filterMode) {
  catalogSyncFilter = filterMode;

  const btnAll = document.getElementById('catalogFilterAll');
  const btnSynced = document.getElementById('catalogFilterSynced');
  const btnLocal = document.getElementById('catalogFilterLocal');

  [
    { btn: btnAll, mode: 'all' },
    { btn: btnSynced, mode: 'synced' },
    { btn: btnLocal, mode: 'local' }
  ].forEach(({ btn, mode }) => {
    if (!btn) return;
    if (mode === filterMode) {
      btn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all flex items-center space-x-1.5 font-bold whitespace-nowrap';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-all flex items-center space-x-1.5 font-semibold whitespace-nowrap';
    }
  });

  renderCatalogUI();
}

function toggleSelectAllCatalog(checked) {
  const visibleProducts = getFilteredCatalogProducts();
  if (checked) {
    visibleProducts.forEach(p => selectedCatalogProductIds.add(p.id));
  } else {
    visibleProducts.forEach(p => selectedCatalogProductIds.delete(p.id));
  }
  updateCatalogBatchToolbarUI(visibleProducts);
  renderCatalogUI();
}

function toggleCatalogProductSelection(productId, checked) {
  if (checked) selectedCatalogProductIds.add(productId);
  else selectedCatalogProductIds.delete(productId);
  updateCatalogBatchToolbarUI(getFilteredCatalogProducts());
  renderCatalogUI();
}

function getFilteredCatalogProducts() {
  const q = (document.getElementById('catalogSearchInput')?.value || '').toLowerCase().trim();
  return products.filter(p => {
    const isSynced = !p.id.startsWith('p-custom-');
    if (catalogSyncFilter === 'synced' && !isSynced) return false;
    if (catalogSyncFilter === 'local' && isSynced) return false;
    if (selectedCatalogCategory !== 'Todas' && p.category !== selectedCatalogCategory) return false;
    if (q && !p.name.toLowerCase().includes(q) && !(p.category && p.category.toLowerCase().includes(q))) return false;
    return true;
  });
}

function updateCatalogBatchToolbarUI(visibleProducts) {
  const count = selectedCatalogProductIds.size;
  const badge = document.getElementById('catalogSelectedCountBadge');
  const checkAll = document.getElementById('checkSelectAllCatalog');
  const btnSync = document.getElementById('btnBatchSync');
  const btnUnsync = document.getElementById('btnBatchUnsync');
  const btnDelete = document.getElementById('btnBatchDelete');

  if (badge) badge.innerText = `${count} selecionado${count === 1 ? '' : 's'}`;
  if (checkAll) checkAll.checked = visibleProducts.length > 0 && visibleProducts.every(p => selectedCatalogProductIds.has(p.id));

  const hasSelection = count > 0;
  if (btnSync) btnSync.disabled = !hasSelection;
  if (btnUnsync) btnUnsync.disabled = !hasSelection;
  if (btnDelete) btnDelete.disabled = !hasSelection;
}

function renderCatalogUI() {
  const cBadge = document.getElementById('catalogTotalCountBadge');
  if (cBadge) cBadge.innerText = products.length;

  const totalNuvem = products.filter(p => !p.id.startsWith('p-custom-')).length;
  const totalLocais = products.filter(p => p.id.startsWith('p-custom-')).length;

  const badgeAll = document.getElementById('catalogBadgeFilterAll');
  const badgeSynced = document.getElementById('catalogBadgeFilterSynced');
  const badgeLocal = document.getElementById('catalogBadgeFilterLocal');

  if (badgeAll) badgeAll.innerText = products.length;
  if (badgeSynced) badgeSynced.innerText = totalNuvem;
  if (badgeLocal) badgeLocal.innerText = totalLocais;

  const tabs = document.getElementById('catalogCategoryTabs');
  if (tabs) {
    tabs.innerHTML = CATEGORIES.map(cat => `
      <button type="button" onclick="selectCatalogCategory('${cat}')" class="px-3 py-1.5 rounded-xl whitespace-nowrap ${selectedCatalogCategory === cat ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'bg-slate-200/80 text-slate-700 font-semibold'}">${cat}</button>
    `).join('');
  }

  const filtered = getFilteredCatalogProducts();
  updateCatalogBatchToolbarUI(filtered);

  const cList = document.getElementById('catalogProductList');
  if (!cList) return;

  if (filtered.length === 0) {
    cList.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">Nenhum produto localizado com os filtros selecionados.</div>`;
    return;
  }

  cList.innerHTML = filtered.map(p => {
    const isSynced = !p.id.startsWith('p-custom-');
    const isSelected = selectedCatalogProductIds.has(p.id);
    const curP = (p.marketPrices && p.marketPrices[activeMarketId] > 0) ? p.marketPrices[activeMarketId] : null;

    return `
      <div class="bg-white rounded-xl p-3 border ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'} shadow-sm transition-all">
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleCatalogProductSelection('${p.id}', this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0">
            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-1.5 flex-wrap">
                <h4 class="font-extrabold text-sm text-slate-800 truncate">${p.name}</h4>
                ${isSynced ? `
                  <span class="inline-flex items-center space-x-1 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md" title="Produto da Planilha Google">
                    <svg class="w-3 h-3 text-sky-600" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/></svg>
                    <span>Nuvem</span>
                  </span>
                ` : `
                  <span class="inline-flex items-center space-x-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md" title="Produto local">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Local</span>
                  </span>
                `}
                <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${p.category || 'Geral'}</span>
                <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">${p.unit}</span>
              </div>
              <div class="text-xs text-slate-500 mt-1 flex items-center space-x-2 flex-wrap">
                <span>Base: <strong class="text-slate-800">${p.basePrice > 0 ? 'R$ ' + formatBRL(p.basePrice) : 'A definir'}</strong></span>
                <span>•</span>
                <span>No ${getSelectedMarketName()}: <strong class="${curP ? 'text-emerald-700 font-extrabold' : 'text-slate-400 italic'}">${curP ? 'R$ ' + formatBRL(curP) : 'Sem cotação'}</strong></span>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-1.5 shrink-0">
            <button type="button" onclick="openPriceCompareModal('${p.id}')" class="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all" title="Comparar preços entre supermercados">
              <span class="hidden sm:inline">Preços</span> 🏷️
            </button>
            <button type="button" onclick="abrirPainelMarcasProduto('${p.id}')" class="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all" title="Ver todas as marcas e cotações">
              🏷️ Marcas
            </button>
            <button type="button" onclick="openProductEditModal('${p.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all" title="Editar dados do produto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button type="button" onclick="quickAddToCartFromCatalog('${p.id}')" class="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all" title="Lançar no carrinho">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function selectCatalogCategory(cat) {
  selectedCatalogCategory = cat;
  renderCatalogUI();
}

function quickAddToCartFromCatalog(productId) {
  selectProductForCart(productId);
  switchActiveTab('compras');
  showAppToast('Produto selecionado! Ajuste a quantidade.', 'info');
}

window.abrirPainelMarcasProduto = function(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const modal = document.getElementById('modalMarcasDetalhes');
  if (!modal) return;

  document.getElementById('modalMarcasTitulo').innerText = `Marcas & Cotações: ${p.name}`;
  const container = document.getElementById('modalMarcasConteudo');

  const marcas = (p.brands && p.brands.length > 0) 
    ? p.brands 
    : [{ id: 'padrao', name: 'Padrão', marketPrices: p.marketPrices || {} }];

  const redesReais = supermarkets.filter(m => m.id !== 'm-padrao');

  container.innerHTML = marcas.map(m => `
    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3">
      <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
        <span class="font-extrabold text-xs text-slate-800">🏷️ Marca: ${m.name}</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
        ${redesReais.map(rede => {
          const preco = m.marketPrices ? m.marketPrices[rede.id] : null;
          return `
            <div class="p-1.5 bg-white rounded border border-slate-100 flex justify-between items-center">
              <span class="text-slate-500 truncate mr-1">${rede.name}:</span>
              <span class="font-bold ${preco > 0 ? 'text-emerald-700' : 'text-slate-400 italic'}">
                ${preco > 0 ? 'R$ ' + formatBRL(preco) : '—'}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  modal.classList.remove('hidden');
};