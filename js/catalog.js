/**
 * SUPERCOMPRAS PRO - CATÁLOGO MESTRE, COTAÇÕES E PAINEL DE MARCAS
 */

// ============================================================
// CONTROLE DE BUSCA E ORDENAÇÃO DO CATÁLOGO
// ============================================================
let catalogSortMode = 'az';

// Disparado no instante em que cada letra é digitada no teclado
window.onCatalogSearch = function(termo) {
  const btnClear = document.getElementById('btnCatalogClearSearch');
  if (btnClear) {
    btnClear.classList.toggle('hidden', !termo || termo.trim().length === 0);
  }
  renderCatalogUI();
};

window.limparBuscaCatalogo = function() {
  const input = document.getElementById('catalogInputSearch');
  if (input) {
    input.value = '';
    input.focus();
  }
  document.getElementById('btnCatalogClearSearch')?.classList.add('hidden');
  renderCatalogUI();
};

window.setCatalogSort = function(mode) {
  catalogSortMode = mode;
  renderCatalogUI();
};

// ============================================================
// FILTRAGEM E ORDENAÇÃO DOS PRODUTOS
// ============================================================
function getFilteredCatalogProducts() {
  const inputBusca = document.getElementById('catalogInputSearch') || 
                     document.getElementById('inputCatalogSearch') || 
                     document.querySelector('input[placeholder*="Buscar por nome"]');
  
  let rawVal = inputBusca?.value || '';
  if (rawVal === 'null') {
    rawVal = '';
    if (inputBusca) inputBusca.value = '';
  }

  const query = rawVal.toLowerCase().trim();

  let lista = (products || []).filter(p => {
    const nome = (p.name || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();

    const matchBusca = !query || nome.includes(query) || cat.includes(query);

    const matchCat = (!window.catalogSelectedCategory || window.catalogSelectedCategory === 'Todas') || 
      cat === window.catalogSelectedCategory.toLowerCase();

    const isLocal = String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-');
    let matchSync = true;
    if (window.catalogSyncFilter === 'synced' || window.catalogSyncFilter === 'cloud') {
      matchSync = !isLocal;
    } else if (window.catalogSyncFilter === 'local') {
      matchSync = isLocal;
    }

    return matchBusca && matchCat && matchSync;
  });

  lista.sort((a, b) => {
    const nomeA = (a.name || '').trim();
    const nomeB = (b.name || '').trim();

    const precoA = (a.marketPrices && a.marketPrices[activeMarketId] > 0) 
      ? a.marketPrices[activeMarketId] 
      : (a.basePrice > 0 ? a.basePrice : 0);

    const precoB = (b.marketPrices && b.marketPrices[activeMarketId] > 0) 
      ? b.marketPrices[activeMarketId] 
      : (b.basePrice > 0 ? b.basePrice : 0);

    const catA = (a.category || 'Geral').toLowerCase();
    const catB = (b.category || 'Geral').toLowerCase();

    switch (catalogSortMode) {
      case 'az':
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      case 'za':
        return nomeB.localeCompare(nomeA, 'pt-BR', { sensitivity: 'base' });
      case 'price_asc':
        if (precoA === 0 && precoB > 0) return 1;
        if (precoB === 0 && precoA > 0) return -1;
        return precoA - precoB;
      case 'price_desc':
        return precoB - precoA;
      case 'category':
        return catA.localeCompare(catB, 'pt-BR') || nomeA.localeCompare(nomeB, 'pt-BR');
      case 'pending_price':
        const semPrecoA = !a.marketPrices || !a.marketPrices[activeMarketId];
        const semPrecoB = !b.marketPrices || !b.marketPrices[activeMarketId];
        return (semPrecoB - semPrecoA) || nomeA.localeCompare(nomeB, 'pt-BR');
      case 'has_price':
        const temPrecoA = a.marketPrices && a.marketPrices[activeMarketId] > 0 ? 1 : 0;
        const temPrecoB = b.marketPrices && b.marketPrices[activeMarketId] > 0 ? 1 : 0;
        return (temPrecoB - temPrecoA) || precoA - precoB;
      default:
        return nomeA.localeCompare(nomeB, 'pt-BR');
    }
  });

  return lista;
}

// ============================================================
// RENDERIZAÇÃO DO CATÁLOGO DE PRODUTOS (UNIFICADO)
// ============================================================
function renderCatalogUI() {
  const listaProdutos = products || [];

  const nuvemCount = listaProdutos.filter(p => !String(p.id).startsWith('p-custom-') && !String(p.id).startsWith('p-local-')).length;
  const localCount = listaProdutos.filter(p => String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-')).length;

  const btnAll = document.getElementById('catalogFilterAll');
  if (btnAll) btnAll.innerHTML = `Todos (${listaProdutos.length})`;

  const btnSynced = document.getElementById('catalogFilterSynced');
  if (btnSynced) btnSynced.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-sky-500 mr-1.5"></span>Nuvem (${nuvemCount})`;

  const btnLocal = document.getElementById('catalogFilterLocal');
  if (btnLocal) btnLocal.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>Apenas Local (${localCount})`;

  const badgeTotal = document.getElementById('catalogTotalCountBadge');
  if (badgeTotal) badgeTotal.innerText = listaProdutos.length;

  let container = document.getElementById('catalogProductsList') || 
                  document.getElementById('catalogProductList') || 
                  document.getElementById('catalogListContainer') || 
                  document.getElementById('catalogProductsContainer') || 
                  document.getElementById('catalogItemsContainer');

  if (!container) {
    const tab = document.getElementById('tab-produtos') || document.getElementById('viewCatalog');
    if (tab) container = tab.querySelector('.space-y-2') || tab.querySelector('.space-y-2\\.5') || tab.querySelector('.space-y-3');
  }

  if (!container) return;

  const visiveis = getFilteredCatalogProducts();

  if (typeof updateCatalogBatchToolbarUI === 'function') {
    updateCatalogBatchToolbarUI(visiveis);
  }

  if (!visiveis || visiveis.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 p-8 my-3">
        <p class="text-sm font-semibold">Nenhum produto encontrado com os filtros atuais.</p>
        <button type="button" onclick="limparBuscaCatalogo(); setCatalogSyncFilter('all');" class="mt-2 text-xs font-bold text-emerald-600 underline">
          Limpar filtros e exibir todos
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = visiveis.map(p => {
    const isSelected = selectedCatalogProductIds.has(p.id);
    const isLocal = String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-');
    const marketPrice = (p.marketPrices && p.marketPrices[activeMarketId] > 0) ? p.marketPrices[activeMarketId] : null;

    return `
      <div class="bg-white rounded-xl p-3 sm:p-4 border ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'} shadow-sm transition-all flex items-center justify-between gap-2.5 my-2">
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleCatalogProductSelection('${p.id}', this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0">
          <div class="min-w-0">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <h3 class="font-extrabold text-sm text-slate-800 truncate">${p.name}</h3>
              ${isLocal 
                ? `<span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md">Local</span>` 
                : `<span class="bg-sky-100 text-sky-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md">Nuvem</span>`}
              <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">${p.category || 'Geral'}</span>
              <span class="text-[10px] text-slate-400 font-semibold">${p.unit || 'un'}</span>
            </div>
            <div class="text-xs text-slate-500 mt-0.5 truncate">
              Base: <span class="font-bold text-slate-700">${p.basePrice > 0 ? 'R$ ' + formatBRL(p.basePrice) : 'A definir'}</span> • 
              No ${getSelectedMarketName()}: <span class="font-bold ${marketPrice ? 'text-emerald-700' : 'text-slate-400'}">${marketPrice ? 'R$ ' + formatBRL(marketPrice) : 'Sem cotação'}</span>
            </div>
          </div>
        </div>

        <!-- Botões de Ação Unificados: Apenas Editar (com preços), Excluir e Adicionar ao Carrinho -->
        <div class="flex items-center space-x-1 shrink-0">
          <button type="button" onclick="openProductEditModal('${p.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Editar produto, marcas e cotações">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          </button>
          <button type="button" onclick="askDeleteSingleProduct('${p.id}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors" title="Excluir produto">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
          <button type="button" onclick="quickAddToCartFromCatalog('${p.id}')" class="p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg transition-transform" title="Adicionar ao carrinho">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// FILTROS E SELEÇÃO EM LOTE DO CATÁLOGO
// ============================================================
function setCatalogSyncFilter(filterMode) {
  window.catalogSyncFilter = filterMode;

  const btnAll = document.getElementById('catalogFilterAll');
  const btnSynced = document.getElementById('catalogFilterSynced');
  const btnLocal = document.getElementById('catalogFilterLocal');

  [
    { btn: btnAll, mode: 'all' },
    { btn: btnSynced, mode: 'synced' },
    { btn: btnLocal, mode: 'local' }
  ].forEach(({ btn, mode }) => {
    if (!btn) return;
    const isAtivo = (window.catalogSyncFilter === mode) || (mode === 'synced' && window.catalogSyncFilter === 'cloud');
    if (isAtivo) {
      btn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all flex items-center space-x-1.5 font-bold whitespace-nowrap';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-all flex items-center space-x-1.5 font-semibold whitespace-nowrap';
    }
  });

  renderCatalogUI();
}

function selectCatalogCategory(cat) {
  catalogSelectedCategory = cat;
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

function updateCatalogBatchToolbarUI(visibleProducts) {
  const selecionados = (products || []).filter(p => selectedCatalogProductIds.has(p.id));
  const count = selecionados.length;
  const badge = document.getElementById('catalogSelectedCountBadge');
  const checkAll = document.getElementById('checkSelectAllCatalog');
  const btnSync = document.getElementById('btnBatchSync');
  const btnUnsync = document.getElementById('btnBatchUnsync');
  const btnDelete = document.getElementById('btnBatchDelete');

  if (badge) badge.innerText = `${count} selecionado${count === 1 ? '' : 's'}`;
  if (checkAll) checkAll.checked = visibleProducts.length > 0 && visibleProducts.every(p => selectedCatalogProductIds.has(p.id));

  const temLocal = selecionados.some(p => String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-'));
  const temNuvem = selecionados.some(p => !String(p.id).startsWith('p-custom-') && !String(p.id).startsWith('p-local-'));

  if (btnSync) {
    btnSync.disabled = !temLocal;
    btnSync.classList.toggle('opacity-50', !temLocal);
    btnSync.classList.toggle('cursor-not-allowed', !temLocal);
  }

  if (btnUnsync) {
    btnUnsync.disabled = !temNuvem;
    btnUnsync.classList.toggle('opacity-50', !temNuvem);
    btnUnsync.classList.toggle('cursor-not-allowed', !temNuvem);
  }

  if (btnDelete) {
    btnDelete.disabled = count === 0;
    btnDelete.classList.toggle('opacity-50', count === 0);
    btnDelete.classList.toggle('cursor-not-allowed', count === 0);
  }
}

function quickAddToCartFromCatalog(productId) {
  selectProductForCart(productId);
  switchActiveTab('compras');
  showAppToast('Produto selecionado! Ajuste a quantidade.', 'info');
}

// ============================================================
// EXCLUSÃO INDIVIDUAL E EM LOTE
// ============================================================
function askDeleteSingleProduct(productId) {
  const p = (products || []).find(x => x.id === productId);
  if (!p) return;

  const isLocal = String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-');

  if (isLocal) {
    openCustomDialog(
      'Excluir Produto Local',
      `Deseja remover o produto "${p.name}" deste aparelho?`,
      'Sim, Excluir',
      null,
      () => confirmarExclusaoLote(false, [p]),
      null
    );
  } else {
    openCustomDialog(
      'Opções de Exclusão',
      `O produto "${p.name}" está vinculado à planilha Google. O que deseja fazer?`,
      'Excluir da Planilha e do App',
      'Excluir Só Deste Aparelho',
      () => confirmarExclusaoLote(true, [p]),
      () => confirmarExclusaoLote(false, [p])
    );
  }
}

function solicitarExclusaoLoteProdutos() {
  const selecionados = (products || []).filter(p => selectedCatalogProductIds.has(p.id));
  if (selecionados.length === 0) return;

  const temItemNuvem = selecionados.some(p => {
    const idStr = String(p.id || '');
    return !idStr.startsWith('p-custom-') && !idStr.startsWith('p-local-');
  });

  if (temItemNuvem) {
    openCustomDialog(
      'Excluir Produtos Selecionados',
      `Deseja apagar os ${selecionados.length} itens permanentemente da folha de cálculo e do aparelho, ou apenas remover deste telefone?`,
      'Excluir da Planilha e do App',
      'Excluir Só Deste Aparelho',
      () => confirmarExclusaoLote(true, selecionados),
      () => confirmarExclusaoLote(false, selecionados)
    );
  } else {
    openCustomDialog(
      'Excluir Produto Local',
      `Deseja remover ${selecionados.length === 1 ? 'o produto local "' + selecionados[0].name + '"' : 'os ' + selecionados.length + ' produtos locais'} deste aparelho?`,
      'Sim, Excluir',
      null,
      () => confirmarExclusaoLote(false, selecionados),
      null
    );
  }
}

async function confirmarExclusaoLote(daPlanilhaTambem, listaAlvo) {
  let token = getSecurityToken();
  if (daPlanilhaTambem && !token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  let apagadosRemoto = 0;

  if (daPlanilhaTambem) {
    showAppToast(`A apagar da folha de cálculo: 0 de ${listaAlvo.length}...`, 'info');
    for (const p of listaAlvo) {
      try {
        const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_produto&name=${encodeURIComponent(p.name)}&productId=${encodeURIComponent(p.id)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === 'success') apagadosRemoto++;
      } catch (e) {
        console.error(`Erro ao apagar ${p.name} da folha de cálculo:`, e);
      }
    }
  }

  const nomesParaRemover = new Set(listaAlvo.map(p => p.name.toLowerCase()));
  products = (products || []).filter(p => !nomesParaRemover.has(p.name.toLowerCase()));
  cart = (cart || []).filter(c => !nomesParaRemover.has(c.name.toLowerCase()));

  selectedCatalogProductIds.clear();
  saveAllLocalData();
  saveCartData();
  renderCatalogUI();
  if (typeof renderCartUI === 'function') renderCartUI();

  if (daPlanilhaTambem) {
    showAppToast(`${listaAlvo.length} itens removidos (${apagadosRemoto} apagados da folha de cálculo).`, 'success');
  } else {
    showAppToast(`${listaAlvo.length} produto(s) removidos apenas deste aparelho.`, 'info');
  }
}

async function executarSincronizacaoLoteProdutos() {
  const alvos = (products || []).filter(p => selectedCatalogProductIds.has(p.id) && (String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-')));
  if (alvos.length === 0) {
    showAppToast('Nenhum produto local pendente de envio nos selecionados.', 'info');
    return;
  }

  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  showAppToast(`A sincronizar 0 de ${alvos.length} produtos...`, 'info');
  let processados = 0;

  for (const p of alvos) {
    try {
      const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=criar_produto&name=${encodeURIComponent(p.name)}&category=${encodeURIComponent(p.category || 'Geral')}&unit=${encodeURIComponent(p.unit || 'un')}&price=${encodeURIComponent(p.basePrice || 0)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success' && json.action === 'created_product') {
        p.id = json.id || p.id;
        processados++;
      }
    } catch (e) {
      console.error(`Erro ao sincronizar ${p.name}:`, e);
    }
    showAppToast(`A sincronizar ${processados} de ${alvos.length}...`, 'info');
  }

  saveAllLocalData();
  selectedCatalogProductIds.clear();
  renderCatalogUI();
  showAppToast(`${processados} produtos sincronizados com a folha de cálculo!`, 'success');
}

async function executarDessincronizacaoLoteProdutos() {
  const alvos = (products || []).filter(p => selectedCatalogProductIds.has(p.id));
  if (alvos.length === 0) {
    showAppToast('Selecione pelo menos um produto.', 'info');
    return;
  }

  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  showAppToast(`A remover da folha de cálculo: 0 de ${alvos.length}...`, 'info');
  let processados = 0;

  let ignored = [];
  try { ignored = JSON.parse(localStorage.getItem('sc_ignored_products')) || []; } catch (e) { ignored = []; }

  for (const p of alvos) {
    try {
      const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_produto&name=${encodeURIComponent(p.name)}&productId=${encodeURIComponent(p.id)}`;
      await fetch(url);

      p.id = 'p-custom-' + Date.now() + '-' + Math.floor(Math.random() * 899 + 100);
      const key = p.name.toLowerCase();
      if (!ignored.includes(key)) ignored.push(key);
      processados++;
    } catch (e) {
      console.error(`Erro ao retirar sincronia de ${p.name}:`, e);
    }
    showAppToast(`A remover da folha de cálculo: ${processados} de ${alvos.length}...`, 'info');
  }

  localStorage.setItem('sc_ignored_products', JSON.stringify(ignored));
  saveAllLocalData();
  selectedCatalogProductIds.clear();
  renderCatalogUI();
  showAppToast(`${processados} produto(s) mantidos apenas como locais!`, 'success');
}

// ============================================================
// CADASTRO E EDIÇÃO DE PRODUTO NO CATÁLOGO (INTEGRADO)
// ============================================================
let currentCompareBrand = 'Padrão';
let catalogMarcaModoEdicao = 'nova';
let catalogMarcaNomeOriginal = '';
let activeCatalogProductId = null;
let redesComparativoMinimizado = false;

function openProductEditModal(productId = null) {
  const modal = document.getElementById('modalProductEdit');
  const title = document.getElementById('modalProductEditTitle');
  const idInput = document.getElementById('editProdId');
  const nameInput = document.getElementById('editProdName');
  const catInput = document.getElementById('editProdCategory');
  const unitInput = document.getElementById('editProdUnit');
  const priceInput = document.getElementById('editProdBasePrice');
  const promoContainer = document.getElementById('containerPromoverProduto');
  const gestaoContainer = document.getElementById('containerGestaoProdutoPlanilha');
  const precosMarcasContainer = document.getElementById('containerPrecosMarcasEdit');

  const isEditing = typeof productId === 'string' && productId.trim().length > 0;

  if (isEditing) {
    const p = products.find(x => x.id === productId);
    if (!p) return;

    activeCatalogProductId = p.id;
    currentCompareBrand = 'Padrão';

    title.innerText = `Editar: ${p.name}`;
    idInput.value = p.id;
    nameInput.value = p.name || '';
    catInput.value = p.category || 'Geral';
    unitInput.value = p.unit || 'un';
    priceInput.value = p.basePrice > 0 ? formatBRL(p.basePrice) : '';

    const ehProdutoLocal = String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-');

    if (promoContainer) promoContainer.classList.toggle('hidden', !ehProdutoLocal);
    if (gestaoContainer) gestaoContainer.classList.toggle('hidden', ehProdutoLocal);
    if (precosMarcasContainer) precosMarcasContainer.classList.remove('hidden');

    // Inicializa marcas e cotações do produto
    if (!p.brands) p.brands = [];
    if (!p.marketPrices) p.marketPrices = {};

    atualizarSelectMarcasCompareModal(p);

    const selMarket = document.getElementById('compareSelectMarket');
    if (selMarket) {
      selMarket.innerHTML = (supermarkets || []).filter(m => m.id !== 'm-padrao').map(m => `
        <option value="${m.id}" ${m.id === activeMarketId ? 'selected' : ''}>${m.name}</option>
      `).join('');
      selMarket.onchange = () => syncPriceFieldToSelectedMarket(p.id, selMarket.value);
    }

    syncPriceFieldToSelectedMarket(p.id, selMarket ? selMarket.value : activeMarketId);
    renderPriceCompareTable(p);
    sincronizarAcoesMarcaCatalogo();
  } else {
    activeCatalogProductId = null;
    title.innerText = 'Cadastrar Produto';
    idInput.value = '';
    nameInput.value = '';
    catInput.value = 'Geral';
    unitInput.value = 'un';
    priceInput.value = '';

    if (promoContainer) promoContainer.classList.add('hidden');
    if (gestaoContainer) gestaoContainer.classList.add('hidden');
    if (precosMarcasContainer) precosMarcasContainer.classList.add('hidden');
  }

  modal?.classList.remove('hidden');
  setTimeout(() => nameInput?.focus(), 50);
}

function closeProductEditModal() {
  document.getElementById('modalProductEdit')?.classList.add('hidden');
  cancelarEdicaoMarcaCatalogo();
}

function dessincronizarProdutoEmEdicao() {
  const idAtual = document.getElementById('editProdId').value;
  const p = (products || []).find(x => x.id === idAtual);
  if (!p) return;

  p.id = 'p-custom-' + Date.now();
  let ignored = [];
  try { ignored = JSON.parse(localStorage.getItem('sc_ignored_products')) || []; } catch (e) { ignored = []; }
  if (!ignored.includes(p.name.toLowerCase())) {
    ignored.push(p.name.toLowerCase());
    localStorage.setItem('sc_ignored_products', JSON.stringify(ignored));
  }

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();
  showAppToast(`"${p.name}" agora é um produto local independente.`, 'info');
}

async function executarExclusaoProdutoPlanilha(nomeProduto, produtoId) {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  showAppToast('A excluir produto da planilha Google...', 'info');

  try {
    const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_produto&name=${encodeURIComponent(nomeProduto)}&productId=${encodeURIComponent(produtoId)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success') {
      const idx = products.findIndex(x => x.name.toLowerCase() === nomeProduto.toLowerCase());
      if (idx > -1) products.splice(idx, 1);
      cart = cart.filter(c => c.name.toLowerCase() !== nomeProduto.toLowerCase());

      saveAllLocalData();
      saveCartData();
      renderCatalogUI();
      if (typeof renderCartUI === 'function') renderCartUI();
      closeProductEditModal();

      showAppToast(`"${nomeProduto}" foi removido da folha de cálculo com sucesso!`, 'success');
    }
  } catch (err) {
    showAppToast('Erro ao excluir produto: ' + err.message, 'error');
  }
}

// ============================================================
// GESTÃO DE MARCAS E COTAÇÕES DENTRO DO MODAL DE EDIÇÃO
// ============================================================
function sincronizarAcoesMarcaCatalogo() {
  const select = document.getElementById('compareSelectBrand');
  const boxActions = document.getElementById('boxCatalogMarcaActions');
  if (!select || !boxActions) return;

  const val = (select.value || 'Padrão').trim();
  const ehPadrao = val.toLowerCase() === 'padrão' || val.toLowerCase() === 'padrao';
  const ehOpcaoEspecial = val === '__NOVA__' || val === '';

  if (ehPadrao || ehOpcaoEspecial) {
    boxActions.classList.add('hidden');
  } else {
    boxActions.classList.remove('hidden');
  }
}

function atualizarSelectMarcasCompareModal(product) {
  const select = document.getElementById('compareSelectBrand');
  if (!select || !product) return;

  const marcas = new Set(['Padrão']);

  if (Array.isArray(product.brands)) {
    product.brands.forEach(b => marcas.add(typeof b === 'string' ? b : (b.name || b.id)));
  }
  (cart || []).forEach(c => {
    if (c.name.toLowerCase() === product.name.toLowerCase() && c.selectedBrandId) {
      marcas.add(c.selectedBrandId);
    }
  });

  marcas.add(currentCompareBrand);

  select.innerHTML = Array.from(marcas).map(m => `
    <option value="${m}" ${m.toLowerCase() === currentCompareBrand.toLowerCase() ? 'selected' : ''}>🏷️ ${m}</option>
  `).join('') + `<option value="__NOVA__">+ Nova marca...</option>`;

  document.getElementById('boxCatalogMarcaInline')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaSelect')?.classList.remove('hidden');
  sincronizarAcoesMarcaCatalogo();
}

function onCompareBrandChanged(val) {
  if (val === '__NOVA__') {
    document.getElementById('boxCatalogMarcaSelect')?.classList.add('hidden');
    const boxInput = document.getElementById('boxCatalogMarcaInline');
    const campo = document.getElementById('inputCatalogNovaMarca');
    if (boxInput) boxInput.classList.remove('hidden');
    if (campo) { campo.value = ''; campo.focus(); }
    sincronizarAcoesMarcaCatalogo();
    return;
  }

  currentCompareBrand = val;
  const p = (products || []).find(x => x.id === activeCatalogProductId);
  if (p) {
    const selMarket = document.getElementById('compareSelectMarket');
    syncPriceFieldToSelectedMarket(p.id, selMarket ? selMarket.value : activeMarketId);
    renderPriceCompareTable(p);
  }
  sincronizarAcoesMarcaCatalogo();
}

window.iniciarEdicaoNomeMarcaCatalogo = function() {
  const select = document.getElementById('compareSelectBrand');
  const val = select?.value;
  if (!val || val === 'Padrão') return;

  catalogMarcaModoEdicao = 'renomear';
  catalogMarcaNomeOriginal = val;

  document.getElementById('boxCatalogMarcaSelect')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaActions')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaInline')?.classList.remove('hidden');

  const input = document.getElementById('inputCatalogNovaMarca');
  if (input) {
    input.value = val;
    input.focus();
    input.select();
  }
};

window.confirmarEdicaoMarcaCatalogo = function() {
  const input = document.getElementById('inputCatalogNovaMarca');
  const novoNome = (input?.value || '').trim();
  const select = document.getElementById('compareSelectBrand');

  if (!novoNome) {
    cancelarEdicaoMarcaCatalogo();
    return;
  }

  const p = (products || []).find(x => x.id === activeCatalogProductId);

  if (catalogMarcaModoEdicao === 'renomear') {
    if (novoNome.toLowerCase() !== catalogMarcaNomeOriginal.toLowerCase()) {
      if (p && Array.isArray(p.brands)) {
        p.brands.forEach(b => {
          const nomeObj = typeof b === 'string' ? b : (b.name || b.id);
          if (nomeObj && nomeObj.toLowerCase() === catalogMarcaNomeOriginal.toLowerCase()) {
            if (typeof b === 'object') {
              b.id = novoNome;
              b.name = novoNome;
            }
          }
        });
      }

      (cart || []).forEach(c => {
        if (c.selectedBrandId && c.selectedBrandId.toLowerCase() === catalogMarcaNomeOriginal.toLowerCase()) {
          c.selectedBrandId = novoNome;
        }
      });

      saveAllLocalData();
      saveCartData();
      if (typeof renderCartUI === 'function') renderCartUI();
      showAppToast(`Marca "${catalogMarcaNomeOriginal}" alterada para "${novoNome}"!`, 'success');
    }

    if (select) {
      const opt = Array.from(select.options).find(o => o.value.toLowerCase() === catalogMarcaNomeOriginal.toLowerCase());
      if (opt) {
        opt.value = novoNome;
        opt.textContent = `🏷️ ${novoNome}`;
      }
      select.value = novoNome;
    }
  } else {
    if (p) {
      if (!p.brands) p.brands = [];
      const existe = p.brands.some(b => (b.name || b.id || '').toLowerCase() === novoNome.toLowerCase());
      if (!existe) {
        p.brands.push({ id: novoNome, name: novoNome, marketPrices: {} });
        saveAllLocalData();
      }
    }

    if (select) {
      let opt = Array.from(select.options).find(o => o.value.toLowerCase() === novoNome.toLowerCase());
      if (!opt) {
        opt = document.createElement('option');
        opt.value = novoNome;
        opt.textContent = `🏷️ ${novoNome}`;
        select.insertBefore(opt, select.lastElementChild);
      }
      select.value = novoNome;
    }
  }

  currentCompareBrand = select?.value || 'Padrão';
  cancelarEdicaoMarcaCatalogo();
  sincronizarAcoesMarcaCatalogo();

  if (p) {
    const selMarket = document.getElementById('compareSelectMarket');
    syncPriceFieldToSelectedMarket(p.id, selMarket ? selMarket.value : activeMarketId);
    renderPriceCompareTable(p);
  }
};

window.cancelarEdicaoMarcaCatalogo = function() {
  document.getElementById('boxCatalogMarcaInline')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaSelect')?.classList.remove('hidden');
  catalogMarcaModoEdicao = 'nova';
  catalogMarcaNomeOriginal = '';
  sincronizarAcoesMarcaCatalogo();
};

window.confirmarExclusaoMarcaCatalogo = function() {
  const select = document.getElementById('compareSelectBrand');
  const marcaAlvo = (select?.value || '').trim();

  if (!marcaAlvo || marcaAlvo === 'Padrão') {
    showAppToast('A marca Padrão não pode ser excluída.', 'warning');
    return;
  }

  const label = document.getElementById('labelCatalogMarcaParaExcluir');
  if (label) label.innerText = `"${marcaAlvo}"`;

  document.getElementById('boxCatalogMarcaSelect')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaActions')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaInline')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaConfirmDelete')?.classList.remove('hidden');
};

window.cancelarExclusaoMarcaCatalogo = function() {
  document.getElementById('boxCatalogMarcaConfirmDelete')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaSelect')?.classList.remove('hidden');
  sincronizarAcoesMarcaCatalogo();
};

window.executarExclusaoMarcaCatalogo = function() {
  const select = document.getElementById('compareSelectBrand');
  const marcaAlvo = (select?.value || '').trim();
  const p = (products || []).find(x => x.id === activeCatalogProductId);

  if (!marcaAlvo || marcaAlvo === 'Padrão' || !p) {
    cancelarExclusaoMarcaCatalogo();
    return;
  }

  if (Array.isArray(p.brands)) {
    p.brands = p.brands.filter(b => {
      const n = typeof b === 'string' ? b : (b.name || b.id);
      return (n || '').toLowerCase() !== marcaAlvo.toLowerCase();
    });
  }

  (cart || []).forEach(c => {
    if ((c.selectedBrandId || '').toLowerCase() === marcaAlvo.toLowerCase()) {
      c.selectedBrandId = 'Padrão';
      c.unitPrice = obterPrecoProdutoMarcaMercado(p, 'Padrão', activeMarketId);
    }
  });

  if (select) {
    const opt = Array.from(select.options).find(o => o.value.toLowerCase() === marcaAlvo.toLowerCase());
    if (opt) opt.remove();
    select.value = 'Padrão';
  }

  currentCompareBrand = 'Padrão';

  saveAllLocalData();
  saveCartData();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderCartUI === 'function') renderCartUI();

  const selMarket = document.getElementById('compareSelectMarket');
  syncPriceFieldToSelectedMarket(p.id, selMarket ? selMarket.value : activeMarketId);
  renderPriceCompareTable(p);

  cancelarExclusaoMarcaCatalogo();
  showAppToast(`Marca "${marcaAlvo}" excluída com sucesso.`, 'info');
};

// ============================================================
// CONTROLE DE EXPANSÃO / MINIMIZAÇÃO DAS REDES
// ============================================================
window.toggleComparativoRedesCatalogo = function() {
  redesComparativoMinimizado = !redesComparativoMinimizado;
  const container = document.getElementById('containerTabelaRedesCatalogo');
  const label = document.getElementById('labelToggleRedesCatalogo');
  const arrow = document.getElementById('arrowToggleRedesCatalogo');

  if (container) container.classList.toggle('hidden', redesComparativoMinimizado);
  if (label) label.innerText = redesComparativoMinimizado ? 'Maximizar' : 'Minimizar';
  if (arrow) arrow.innerText = redesComparativoMinimizado ? '▼' : '▲';
};

function syncPriceFieldToSelectedMarket(pId, mId) {
  const p = (products || []).find(x => x.id === (pId || activeCatalogProductId));
  const input = document.getElementById('compareInputPrice');
  if (!input || !p) return;

  let preco = 0;

  if (currentCompareBrand === 'Padrão') {
    if (p.marketPrices && p.marketPrices[mId] !== undefined) {
      preco = p.marketPrices[mId];
    }
  } else {
    if (p.brands) {
      const bObj = p.brands.find(b => (b.name || b.id).toLowerCase() === currentCompareBrand.toLowerCase());
      if (bObj && bObj.marketPrices && bObj.marketPrices[mId] !== undefined) {
        preco = bObj.marketPrices[mId];
      }
    }
    if (preco === 0 && mId === activeMarketId) {
      const cartItem = (cart || []).find(c => 
        (c.productId === p.id || c.name.toLowerCase() === p.name.toLowerCase()) && 
        (c.selectedBrandId || 'Padrão').toLowerCase() === currentCompareBrand.toLowerCase()
      );
      if (cartItem && cartItem.unitPrice > 0) preco = cartItem.unitPrice;
    }
  }

  input.value = preco > 0 ? formatBRL(preco) : '';
}

function salvarPrecoComparativoModal() {
  const pId = activeCatalogProductId || document.getElementById('editProdId')?.value;
  const mId = document.getElementById('compareSelectMarket')?.value;
  const preco = parseNumberInput(document.getElementById('compareInputPrice')?.value);
  const p = (products || []).find(x => x.id === pId);

  if (!p || !mId) return;

  // Chama o barramento global: atualiza produto, carrinho, localStorage e telas
  window.atualizarPrecoUnificado(p.id, currentCompareBrand, mId, preco);

  showAppToast(`Preço de "${p.name} (${currentCompareBrand})" atualizado em todas as telas!`, 'success');
}

function renderPriceCompareTable(product) {
  const p = product || (products || []).find(x => x.id === activeCatalogProductId);
  if (!p) return;

  const redesReais = (supermarkets || []).filter(m => m.id !== 'm-padrao');
  let menorPreco = Infinity;

  redesReais.forEach(m => {
    let pr = null;
    if (currentCompareBrand === 'Padrão') {
      if (p.marketPrices?.[m.id] > 0) pr = p.marketPrices[m.id];
    } else if (p.brands) {
      const bObj = p.brands.find(b => (b.name || b.id).toLowerCase() === currentCompareBrand.toLowerCase());
      if (bObj && bObj.marketPrices && bObj.marketPrices[m.id] > 0) pr = bObj.marketPrices[m.id];
    }

    if (!pr && m.id === activeMarketId) {
      const cItem = (cart || []).find(c => 
        (c.productId === p.id || c.name.toLowerCase() === p.name.toLowerCase()) && 
        (c.selectedBrandId || 'Padrão').toLowerCase() === currentCompareBrand.toLowerCase()
      );
      if (cItem && cItem.unitPrice > 0) pr = cItem.unitPrice;
    }

    if (pr !== null && pr > 0 && pr < menorPreco) menorPreco = pr;
  });

  const table = document.getElementById('comparePricesTable');
  const badgeContador = document.getElementById('badgeContadorRedesCatalogo');
  if (badgeContador) badgeContador.innerText = `${redesReais.length} Redes`;
  if (!table) return;

  table.innerHTML = redesReais.map(m => {
    let pr = null;

    if (currentCompareBrand === 'Padrão') {
      if (p.marketPrices?.[m.id] > 0) pr = p.marketPrices[m.id];
    } else if (p.brands) {
      const bObj = p.brands.find(b => (b.name || b.id).toLowerCase() === currentCompareBrand.toLowerCase());
      if (bObj && bObj.marketPrices && bObj.marketPrices[m.id] > 0) pr = bObj.marketPrices[m.id];
    }

    if (!pr && m.id === activeMarketId) {
      const cItem = (cart || []).find(c => 
        (c.productId === p.id || c.name.toLowerCase() === p.name.toLowerCase()) && 
        (c.selectedBrandId || 'Padrão').toLowerCase() === currentCompareBrand.toLowerCase()
      );
      if (cItem && cItem.unitPrice > 0) pr = cItem.unitPrice;
    }

    const hasP = pr !== null && pr > 0;
    const isMenor = hasP && pr === menorPreco && menorPreco !== Infinity;

    return `
      <div class="p-2 rounded-xl border ${isMenor ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 bg-white'} flex items-center justify-between gap-2 shadow-2xs">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="font-bold text-xs text-slate-800">${m.name}</span>
            <span class="text-[10px] text-slate-500">(${m.branch || 'SJP'})</span>
            ${isMenor ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 rounded-full">MENOR PREÇO</span>` : ''}
          </div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5">${m.promoDay || 'Sem dia fixo'}</div>
        </div>

        <div class="flex items-center space-x-2 shrink-0">
          <div class="text-right">
            ${hasP 
              ? `<span class="text-xs font-black ${isMenor ? 'text-emerald-700' : 'text-slate-800'}">R$ ${formatBRL(pr)}</span>` 
              : `<span class="text-[11px] text-slate-400 italic">Sem lançamento</span>`
            }
          </div>
          <button type="button" onclick="loadMarketToDirectEdit('${p.id}', '${m.id}')" class="p-1.5 bg-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-slate-700 text-xs" title="Editar preço neste mercado">✎</button>
        </div>
      </div>
    `;
  }).join('');
}

function loadMarketToDirectEdit(pId, mId) {
  const sel = document.getElementById('compareSelectMarket');
  if (sel) sel.value = mId;
  syncPriceFieldToSelectedMarket(pId || activeCatalogProductId, mId);
  const input = document.getElementById('compareInputPrice');
  if (input) { input.focus(); input.select(); }
}

// ============================================================
// GESTÃO DE SUPERMERCADOS (ABA MERCADOS)
// ============================================================
function renderMarketsUI() {
  const mBadge = document.getElementById('marketTotalCountBadge');
  if (mBadge) mBadge.innerText = (supermarkets || []).filter(m => m.id !== 'm-padrao').length;

  const container = document.getElementById('marketsListContainer');
  if (!container) return;

  container.innerHTML = (supermarkets || []).map(m => {
    const isCur = m.id === activeMarketId;
    const isPadrao = m.id === 'm-padrao';
    const ehMercadoLocal = String(m.id).startsWith('m-custom-') || !m.colIndex;

    return `
      <div class="bg-white rounded-xl p-3 sm:p-4 border ${isCur ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'} shadow-sm transition-all">
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex-1 min-w-0 cursor-pointer" onclick="selectActiveMarketFromCard('${m.id}')">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <h3 class="font-extrabold text-sm text-slate-800 truncate">${m.name}</h3>
              ${isCur ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">ATIVO</span>` : ''}
              ${isPadrao ? `<span class="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md">NEUTRO</span>` : ''}
              ${ehMercadoLocal && !isPadrao ? `<span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md">LOCAL</span>` : ''}
            </div>
            <p class="text-xs text-slate-500 mt-0.5 truncate">${m.branch || 'São José dos Pinhais'}${m.promoDay ? ' • 🗓️ ' + m.promoDay : ''}</p>
            ${m.address ? `<p class="text-[11px] text-slate-400 mt-0.5 truncate">${m.address}</p>` : ''}
          </div>

          <div class="flex items-center space-x-1 shrink-0">
            ${m.address ? `
              <button type="button" onclick="abrirSupermercadoNoMaps('${m.id}', true)" class="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors" title="Traçar rota Maps">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </button>
            ` : ''}

            ${m.urlEncarte ? `
              <a href="${m.urlEncarte}" target="_blank" rel="noopener noreferrer" class="p-2 bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 rounded-lg transition-colors" title="Ver Encarte">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </a>
            ` : ''}

            ${!isPadrao ? `
              <button type="button" onclick="openMarketEditModal('${m.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Editar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button type="button" onclick="askDeleteMarket('${m.id}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors" title="Excluir">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function selectActiveMarketFromCard(id) {
  activeMarketId = id;
  saveAllLocalData();
  refreshActiveMarketUI();
  switchActiveTab('compras');
  showAppToast(`Agora a comprar em ${getSelectedMarketName()}!`, 'success');
}

function openMarketEditModal(marketId = null) {
  const modal = document.getElementById('modalMarketEdit');
  const title = document.getElementById('modalMarketEditTitle');
  const idInput = document.getElementById('editMarketId');
  const nameInput = document.getElementById('editMarketName');
  const branchInput = document.getElementById('editMarketBranch');
  const addressInput = document.getElementById('editMarketAddress');
  const promoInput = document.getElementById('editMarketPromoDay');
  const encarteInput = document.getElementById('editMarketUrlEncarte');
  const notesInput = document.getElementById('editMarketNotes');
  const promoContainer = document.getElementById('containerPromoverMercado');
  const excluirContainer = document.getElementById('containerExcluirMercadoPlanilha');

  const isEditing = typeof marketId === 'string' && marketId.trim().length > 0;

  if (isEditing) {
    const m = (supermarkets || []).find(x => x.id === marketId);
    if (!m) return;

    title.innerText = 'Editar Supermercado';
    idInput.value = m.id;
    nameInput.value = m.name || '';
    branchInput.value = m.branch || '';
    addressInput.value = m.address || '';
    promoInput.value = m.promoDay || '';
    encarteInput.value = m.urlEncarte || '';
    notesInput.value = m.notes || '';

    const ehMercadoLocal = String(m.id).startsWith('m-custom-') || !m.colIndex;
    const ehMercadoNeutro = m.id === 'm-padrao';

    if (promoContainer) promoContainer.classList.toggle('hidden', !ehMercadoLocal || ehMercadoNeutro);
    if (excluirContainer) excluirContainer.classList.toggle('hidden', ehMercadoLocal || ehMercadoNeutro);
  } else {
    title.innerText = 'Novo Supermercado';
    idInput.value = '';
    nameInput.value = '';
    branchInput.value = '';
    addressInput.value = '';
    promoInput.value = '';
    encarteInput.value = '';
    notesInput.value = '';

    if (promoContainer) promoContainer.classList.add('hidden');
    if (excluirContainer) excluirContainer.classList.add('hidden');
  }

  modal?.classList.remove('hidden');
  setTimeout(() => nameInput?.focus(), 50);
}

function closeMarketEditModal() {
  document.getElementById('modalMarketEdit')?.classList.add('hidden');
}

function askDeleteMarket(marketId) {
  const m = (supermarkets || []).find(x => x.id === marketId);
  if (!m || m.id === 'm-padrao') return;

  const ehMercadoNuvem = !String(m.id).startsWith('m-custom-') && m.colIndex;

  if (ehMercadoNuvem) {
    openCustomDialog(
      'Opções de Exclusão',
      `O supermercado "${m.name}" está vinculado à planilha Google. O que deseja fazer?`,
      'Excluir da Planilha Google',
      'Ocultar Só no Aparelho',
      () => executarExclusaoMercadoPlanilha(marketId),
      () => executeDeleteMarketLocal(marketId)
    );
  } else {
    openCustomDialog(
      'Excluir Supermercado Local?',
      `Deseja remover "${m.name}" deste aparelho?`,
      'Sim, Excluir',
      null,
      () => executeDeleteMarketLocal(marketId),
      null
    );
  }
}

function executeDeleteMarketLocal(marketId) {
  const idx = (supermarkets || []).findIndex(x => x.id === marketId);
  if (idx === -1) return;

  const m = supermarkets[idx];
  if (!String(marketId).startsWith('m-custom-')) {
    const ignored = getIgnoredMarkets();
    if (!ignored.includes(marketId)) {
      ignored.push(marketId);
      localStorage.setItem('sc_ignored_markets', JSON.stringify(ignored));
    }
  }

  supermarkets.splice(idx, 1);
  if (activeMarketId === marketId) activeMarketId = 'm-padrao';

  saveAllLocalData();
  refreshActiveMarketUI();
  renderMarketsUI();
  showAppToast(`"${m.name}" foi removido deste aparelho.`, 'info');
}

async function executarExclusaoMercadoPlanilha(marketId) {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const m = (supermarkets || []).find(x => x.id === marketId);
  if (!m) return;

  showAppToast('A enviar ordem de exclusão para a planilha...', 'info');

  try {
    const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_mercado&marketId=${encodeURIComponent(m.id)}&name=${encodeURIComponent(m.name)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success' && json.action === 'deleted') {
      const idx = supermarkets.findIndex(x => x.id === marketId);
      if (idx > -1) supermarkets.splice(idx, 1);

      products.forEach(p => {
        if (p.marketPrices && p.marketPrices[marketId] !== undefined) {
          delete p.marketPrices[marketId];
        }
      });

      if (activeMarketId === marketId) activeMarketId = 'm-padrao';

      saveAllLocalData();
      refreshActiveMarketUI();
      renderMarketsUI();
      renderCatalogUI();
      closeMarketEditModal();

      showAppToast(`"${json.name || m.name}" foi excluído da planilha!`, 'success');
    }
  } catch (err) {
    showAppToast('Erro ao excluir da planilha: ' + err.message, 'error');
  }
}

// ============================================================
// OUVINTES DE SUBMISSÃO E BOTÕES EM LOTE
// ============================================================
document.getElementById('formSaveProductCatalog')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editProdId').value;
  const name = document.getElementById('editProdName').value.trim();
  const category = document.getElementById('editProdCategory').value;
  const unit = document.getElementById('editProdUnit').value;
  const bp = parseNumberInput(document.getElementById('editProdBasePrice').value);

  if (!name) {
    showAppToast('Indique o nome do produto.', 'error');
    return;
  }

  let p = null;
  if (id) {
    p = products.find(x => x.id === id);
    if (p) {
      p.name = name;
      p.category = category;
      p.unit = unit;
      p.basePrice = bp;
    }
  } else {
    const jaExiste = products.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (jaExiste) {
      jaExiste.category = category;
      jaExiste.unit = unit;
      if (bp > 0) jaExiste.basePrice = bp;
      p = jaExiste;
      showAppToast('Produto já existia e foi atualizado!', 'info');
    } else {
      p = {
        id: 'p-custom-' + Date.now(),
        name: name,
        category: category,
        unit: unit,
        basePrice: bp,
        marketPrices: {}
      };
      products.unshift(p);
    }
  }

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();

  if (p && activeMarketId !== 'm-padrao' && bp > 0) {
    enviarProdutoParaPlanilha(p, activeMarketId, bp);
  }

  showAppToast('Produto salvo com sucesso!', 'success');
});

document.getElementById('formSaveMarket')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editMarketId').value;
  const name = document.getElementById('editMarketName').value.trim();
  const branch = document.getElementById('editMarketBranch').value.trim();
  const address = document.getElementById('editMarketAddress').value.trim();
  const promoDay = document.getElementById('editMarketPromoDay').value.trim();
  const urlEncarte = document.getElementById('editMarketUrlEncarte').value.trim();
  const notes = document.getElementById('editMarketNotes').value.trim();

  if (!name) {
    showAppToast('Informe o nome da rede.', 'error');
    return;
  }

  if (id) {
    const m = supermarkets.find(x => x.id === id);
    if (m) {
      m.name = name;
      m.branch = branch;
      m.address = address;
      m.promoDay = promoDay;
      m.urlEncarte = urlEncarte;
      m.notes = notes;
    }
  } else {
    supermarkets.push({
      id: 'm-custom-' + Date.now(),
      name: name,
      branch: branch || 'São José dos Pinhais',
      address: address,
      promoDay: promoDay,
      urlEncarte: urlEncarte,
      notes: notes,
      colIndex: null
    });
  }

  saveAllLocalData();
  refreshActiveMarketUI();
  renderMarketsUI();
  closeMarketEditModal();
  showAppToast('Supermercado salvo com sucesso!', 'success');
});

document.getElementById('btnBatchSync')?.addEventListener('click', executarSincronizacaoLoteProdutos);
document.getElementById('btnBatchUnsync')?.addEventListener('click', executarDessincronizacaoLoteProdutos);
document.getElementById('btnBatchDelete')?.addEventListener('click', solicitarExclusaoLoteProdutos);