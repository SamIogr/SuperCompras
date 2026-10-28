function renderCatalogUI() {
  document.getElementById('catalogTotalCountBadge').innerText = products.length;

  document.getElementById('catalogCategoryTabs').innerHTML = CATEGORIES.map(cat => `
    <button 
      type="button" 
      onclick="selectCatalogCategory('${cat}')"
      class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
        selectedCatalogCategory === cat 
          ? 'bg-emerald-600 text-white font-bold shadow-sm' 
          : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300 font-semibold'
      }"
    >
      ${cat}
    </button>
  `).join('');

  const q = document.getElementById('catalogSearchInput').value.toLowerCase().trim();
  const filtered = products.filter(p => {
    if (selectedCatalogCategory !== 'Todas' && p.category !== selectedCatalogCategory) return false;
    if (q && !p.name.toLowerCase().includes(q) && !(p.category && p.category.toLowerCase().includes(q))) return false;
    return true;
  });

  const listContainer = document.getElementById('catalogProductList');

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-600">
        Nenhum produto cadastrado. Toque no botão de sincronizar no topo para carregar a planilha.
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(p => {
    const currentMktPrice = (p.marketPrices && p.marketPrices[activeMarketId]) ? p.marketPrices[activeMarketId] : null;

    return `
      <div class="bg-white rounded-xl p-3 border border-slate-200 hover:border-slate-300 shadow-sm transition-all">
        <div class="flex items-center justify-between gap-2.5">
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <h4 class="font-extrabold text-sm text-slate-800 truncate">${p.name}</h4>
              <span class="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">${p.category || 'Geral'}</span>
              <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">${p.unit}</span>
            </div>

            <div class="text-xs text-slate-600 mt-1 flex items-center space-x-2 flex-wrap">
              <span>Preço Base: <strong class="text-slate-800">R$ ${formatBRL(p.basePrice)}</strong></span>
              <span>•</span>
              <span>No ${getSelectedMarketName()}: <strong class="${currentMktPrice ? 'text-emerald-700 font-extrabold' : 'text-slate-500 italic'}">${currentMktPrice ? 'R$ ' + formatBRL(currentMktPrice) : 'Não lançado'}</strong></span>
            </div>
          </div>

          <div class="flex items-center space-x-1.5 shrink-0">
            <button 
              type="button" 
              onclick="openPriceCompareModal('${p.id}')"
              class="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
              title="Comparar e lançar preços"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <span class="hidden sm:inline">Preços</span>
            </button>

            <button 
              type="button" 
              onclick="openProductEditModal('${p.id}')"
              class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
              title="Editar Produto"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
            </button>

            <button 
              type="button" 
              onclick="quickAddToCartFromCatalog('${p.id}')"
              class="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
              title="Pôr no Carrinho"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
              </svg>
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

function openPriceCompareModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  document.getElementById('compareTargetProdId').value = p.id;
  document.getElementById('compareProdName').innerText = p.name;
  document.getElementById('compareProdDetails').innerText = `Unidade: ${p.unit} • Preço Base: R$ ${formatBRL(p.basePrice)}`;

  const selectMarket = document.getElementById('compareSelectMarket');
  selectMarket.innerHTML = supermarkets.map(m => `
    <option value="${m.id}" ${m.id === activeMarketId ? 'selected' : ''}>${m.name} (${m.branch || 'SJP'})</option>
  `).join('');

  syncPriceFieldToSelectedMarket(p.id, selectMarket.value);
  selectMarket.onchange = (e) => syncPriceFieldToSelectedMarket(p.id, e.target.value);

  renderPriceCompareTable(p);
  document.getElementById('modalPriceCompare').classList.remove('hidden');
}

function syncPriceFieldToSelectedMarket(productId, marketId) {
  const p = products.find(x => x.id === productId);
  const inputPrice = document.getElementById('compareInputPrice');
  if (p && p.marketPrices && p.marketPrices[marketId] !== undefined) {
    inputPrice.value = formatBRL(p.marketPrices[marketId]);
  } else if (p) {
    inputPrice.value = formatBRL(p.basePrice);
  }
}

function renderPriceCompareTable(product) {
  const container = document.getElementById('comparePricesTable');
  let bestPrice = Infinity;

  supermarkets.forEach(m => {
    const pr = product.marketPrices && product.marketPrices[m.id] !== undefined ? product.marketPrices[m.id] : null;
    if (pr !== null && pr < bestPrice) bestPrice = pr;
  });

  container.innerHTML = supermarkets.map(m => {
    const hasPrice = product.marketPrices && product.marketPrices[m.id] !== undefined;
    const pr = hasPrice ? product.marketPrices[m.id] : null;
    const isBest = hasPrice && pr === bestPrice && bestPrice !== Infinity;

    return `
      <div class="p-2.5 rounded-xl border flex items-center justify-between gap-2 ${isBest ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 bg-slate-50'}">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="font-bold text-xs text-slate-800">${m.name}</span>
            <span class="text-[10px] text-slate-500">(${m.branch || 'SJP'})</span>
            ${isBest ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">MENOR PREÇO</span>` : ''}
          </div>
          <div class="text-[10px] text-slate-500 mt-0.5 truncate">${m.promoDay || 'Sem dia fixo'}</div>
        </div>

        <div class="flex items-center space-x-2 shrink-0">
          <div class="text-right">
            ${hasPrice 
              ? `<span class="text-xs font-black ${isBest ? 'text-emerald-700' : 'text-slate-800'}">R$ ${formatBRL(pr)}</span>`
              : `<span class="text-[11px] text-slate-400 italic">Não lançado</span>`
            }
          </div>

          <button 
            type="button" 
            onclick="loadMarketToDirectEdit('${product.id}', '${m.id}')"
            class="p-1.5 bg-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-slate-700"
            title="Editar este preço"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function loadMarketToDirectEdit(productId, marketId) {
  const selectMarket = document.getElementById('compareSelectMarket');
  selectMarket.value = marketId;
  syncPriceFieldToSelectedMarket(productId, marketId);
  const inputPrice = document.getElementById('compareInputPrice');
  inputPrice.focus();
  inputPrice.select();
}

function renderMarketsUI() {
  document.getElementById('marketTotalCountBadge').innerText = supermarkets.length;
  const container = document.getElementById('marketsListContainer');

  if (supermarkets.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-600">
        Nenhum supermercado cadastrado.
      </div>
    `;
    return;
  }

  container.innerHTML = supermarkets.map(m => {
    const purchasesInMarket = purchaseHistory.filter(h => h.marketId === m.id);
    const purchaseCount = purchasesInMarket.length;
    const totalSpent = purchasesInMarket.reduce((acc, cur) => acc + (cur.total || 0), 0);
    const ticketMedio = purchaseCount > 0 ? totalSpent / purchaseCount : 0;
    const trackedProducts = products.filter(p => p.marketPrices && p.marketPrices[m.id] !== undefined).length;
    const isCurrent = m.id === activeMarketId;

    return `
      <div class="bg-white rounded-2xl p-4 border transition-all ${isCurrent ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-200 shadow-sm'}">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center space-x-2">
              <h3 class="font-black text-base text-slate-800">${m.name}</h3>
              ${isCurrent ? `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">ATIVO NA COMPRA</span>` : ''}
            </div>
            <p class="text-xs text-slate-600 font-semibold">${m.branch || 'Afonso Pena / SJP'}</p>
            ${m.promoDay ? `<div class="mt-1 text-xs text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-lg inline-block">🗓️ ${m.promoDay}</div>` : ''}
            ${m.notes ? `<p class="text-xs text-slate-600 mt-1 italic">"${m.notes}"</p>` : ''}
          </div>

          <div class="flex items-center space-x-1.5 shrink-0">
            <button 
              type="button" 
              onclick="openMarketEditModal('${m.id}')"
              class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
              title="Editar Supermercado"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-slate-100 text-center">
          <div class="bg-slate-50 p-2 rounded-xl">
            <span class="text-[10px] text-slate-600 block uppercase font-bold">Compras</span>
            <span class="text-sm font-black text-slate-800">${purchaseCount}</span>
          </div>
          <div class="bg-slate-50 p-2 rounded-xl">
            <span class="text-[10px] text-slate-600 block uppercase font-bold">Preços Salvos</span>
            <span class="text-sm font-black text-emerald-700">${trackedProducts}</span>
          </div>
          <div class="bg-slate-50 p-2 rounded-xl">
            <span class="text-[10px] text-slate-600 block uppercase font-bold">Ticket Médio</span>
            <span class="text-sm font-black text-slate-800">R$ ${formatBRL(ticketMedio)}</span>
          </div>
        </div>

        ${!isCurrent ? `
          <div class="pt-3 text-right">
            <button 
              type="button" 
              onclick="selectActiveMarketFromCard('${m.id}')"
              class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all"
            >
              Fazer Compras Aqui
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function selectActiveMarketFromCard(marketId) {
  activeMarketId = marketId;
  saveAllLocalData();
  refreshActiveMarketUI();
  switchActiveTab('compras');
  showAppToast(`Agora comprando em ${getSelectedMarketName()}!`, 'success');
}