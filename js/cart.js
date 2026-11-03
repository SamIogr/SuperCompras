/**
 * SUPERCOMPRAS PRO - CARRINHO DE COMPRAS
 * Suporte completo a edição de itens, cálculo de promoções e persistência.
 */

/**
 * SUPERCOMPRAS PRO - GERENCIADOR UNIFICADO DE PREÇOS
 */
window.atualizarPrecoUnificado = function(produtoIdOuNome, marcaAlvo, mercadoId, novoPreco) {
  if (!produtoIdOuNome) return;

  const mercado = mercadoId || activeMarketId || 'm-padrao';
  const marca = (marcaAlvo || 'Padrão').trim();
  const preco = Number(novoPreco) || 0;

  let masterProd = (products || []).find(p => 
    p.id === produtoIdOuNome || 
    p.name.toLowerCase() === String(produtoIdOuNome).toLowerCase()
  );

  if (!masterProd) {
    masterProd = {
      id: 'p-custom-' + Date.now(),
      name: String(produtoIdOuNome).trim(),
      category: 'Geral',
      unit: 'un',
      basePrice: preco,
      marketPrices: {},
      brands: []
    };
    if (!Array.isArray(products)) products = [];
    products.unshift(masterProd);
  }

  if (!masterProd.marketPrices) masterProd.marketPrices = {};

  // REGRA DE SINCRONIZAÇÃO TOTAL:
  // Se for o mercado referencial ('m-padrao'), o Preço Base e a cotação m-padrao são idênticos
  if (mercado === 'm-padrao') {
    masterProd.basePrice = preco;
    masterProd.marketPrices['m-padrao'] = preco;
  } else {
    // Se for outro supermercado e o produto ainda não tiver Preço Base, adota este como referência
    if (!masterProd.basePrice || masterProd.basePrice <= 0) {
      masterProd.basePrice = preco;
      masterProd.marketPrices['m-padrao'] = preco;
    }

    if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
      masterProd.marketPrices[mercado] = preco;
    } else {
      if (!masterProd.brands) masterProd.brands = [];
      let bObj = masterProd.brands.find(b => (b.name || b.id || '').toLowerCase() === marca.toLowerCase());
      if (!bObj) {
        bObj = { id: marca, name: marca, marketPrices: {} };
        masterProd.brands.push(bObj);
      }
      if (!bObj.marketPrices) bObj.marketPrices = {};
      bObj.marketPrices[mercado] = preco;
    }

    // Sincroniza com a nuvem (Google Sheets) caso configurado
    if (typeof enviarProdutoParaPlanilha === 'function') {
      enviarProdutoParaPlanilha(masterProd, mercado, preco, marca);
    }
  }

  saveAllLocalData();
  saveCartData();

  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderCartUI === 'function') renderCartUI();
  if (typeof renderizarCatalogoProdutos === 'function') renderizarCatalogoProdutos();
};

function computeItemFinancials(qty, unitPrice, promo = {}) {
  qty = Math.max(0, Number(qty) || 0);
  unitPrice = Math.max(0, Number(unitPrice) || 0);
  const standardSubtotal = qty * unitPrice;
  let finalSubtotal = standardSubtotal;
  let savings = 0;
  let badgeText = '';

  if (promo && promo.type === 'discount') {
    const val = Number(promo.value) || 0;
    if (promo.mode === 'percent' && val > 0) {
      savings = standardSubtotal * (Math.min(val, 100) / 100);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. ${val}%`;
    } else if (promo.mode === 'fixed' && val > 0) {
      savings = qty * Math.min(val, unitPrice);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. R$ ${formatBRL(val)}/un`;
    }
  } else if (promo && promo.type === 'wholesale') {
    const minQ = Number(promo.minQty) || 0;
    const wPrice = Number(promo.wholesalePrice) || 0;
    if (minQ > 0 && wPrice > 0 && qty >= minQ) {
      const wholesaleTotal = qty * wPrice;
      if (wholesaleTotal < standardSubtotal) {
        savings = standardSubtotal - wholesaleTotal;
        finalSubtotal = wholesaleTotal;
        badgeText = `Atacado (≥${minQ}): R$ ${formatBRL(wPrice)}/un`;
      }
    }
  }
  return { standardSubtotal, finalSubtotal: Math.max(0, finalSubtotal), savings: Math.max(0, savings), badgeText };
}

let currentCartPromoMode = 'none';

window.setCartPromoMode = function(mode) {
  currentCartPromoMode = mode;

  const btnNone = document.getElementById('btnCartPromoNone');
  const btnDisc = document.getElementById('btnCartPromoDiscount');
  const btnWhol = document.getElementById('btnCartPromoWholesale');

  const panelDisc = document.getElementById('panelCartPromoDiscount');
  const panelWhol = document.getElementById('panelCartPromoWholesale');

  [btnNone, btnDisc, btnWhol].forEach(btn => {
    if (btn) btn.className = 'py-1.5 rounded-lg text-center transition-all text-slate-600 hover:text-slate-900';
  });

  if (panelDisc) panelDisc.classList.add('hidden');
  if (panelWhol) panelWhol.classList.add('hidden');

  if (mode === 'discount') {
    if (btnDisc) btnDisc.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelDisc) panelDisc.classList.remove('hidden');
    document.getElementById('cartDiscountVal')?.focus();
  } else if (mode === 'wholesale') {
    if (btnWhol) btnWhol.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelWhol) panelWhol.classList.remove('hidden');
    document.getElementById('cartWholesalePrice')?.focus();
  } else {
    if (btnNone) btnNone.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
  }

  updateCartItemPreview();
};

function getCartFormPromoConfig() {
  if (currentCartPromoMode === 'discount') {
    return {
      type: 'discount',
      mode: document.getElementById('cartDiscountMode')?.value || 'percent',
      value: parseNumberInput(document.getElementById('cartDiscountVal')?.value) || 0
    };
  }
  if (currentCartPromoMode === 'wholesale') {
    return {
      type: 'wholesale',
      minQty: parseNumberInput(document.getElementById('cartWholesaleMin')?.value) || 1,
      wholesalePrice: parseNumberInput(document.getElementById('cartWholesalePrice')?.value) || 0
    };
  }
  return { type: 'none' };
}

function updateCartItemPreview() {
  const qtyInput = document.getElementById('cartInputQuantity');
  const priceInput = document.getElementById('cartInputUnitPrice');
  
  const q = parseNumberInput(qtyInput?.value) || 1;
  const p = parseNumberInput(priceInput?.value) || 0;
  
  const calc = computeItemFinancials(q, p, getCartFormPromoConfig());

  const subtotalEl = document.getElementById('cartItemPreviewSubtotal');
  if (subtotalEl) {
    subtotalEl.innerText = `R$ ${formatBRL(calc.finalSubtotal)}`;
  }

  const promoBadge = document.getElementById('cartPromoPreviewBadge') || document.getElementById('cartItemPreviewSavings');
  if (promoBadge) {
    if (calc.savings > 0) {
      promoBadge.innerText = `Economia de R$ ${formatBRL(calc.savings)}`;
      promoBadge.classList.remove('hidden');
    } else {
      promoBadge.classList.add('hidden');
    }
  }
}

function higienizarInputsCarrinho() {
  const ids = ['cartInputProductName', 'cartInputUnitPrice', 'cartSearchFilter', 'cartDiscountVal', 'cartWholesalePrice'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && (el.value === 'null' || el.value === 'undefined')) el.value = '';
  });
}

function atualizarSelectMarcasInline(nomeProduto, marcaSelecionada = 'Padrão') {
  const container = document.getElementById('containerMarcaInline');
  const select = document.getElementById('cartSelectProductBrand');
  const inputHidden = document.getElementById('cartInputProductBrand');

  if (!select) return;

  if (container) {
    container.classList.toggle('hidden', !nomeProduto || nomeProduto.trim().length === 0);
  }

  const marcas = new Set(['Padrão']);
  const p = (products || []).find(it => it.name.toLowerCase() === (nomeProduto || '').toLowerCase());

  if (p && Array.isArray(p.brands)) {
    p.brands.forEach(b => marcas.add(typeof b === 'string' ? b : (b.name || b.id)));
  }
  (cart || []).forEach(c => {
    if (c.name.toLowerCase() === (nomeProduto || '').toLowerCase() && c.selectedBrandId) {
      marcas.add(c.selectedBrandId);
    }
  });

  select.innerHTML = Array.from(marcas).map(m => `
    <option value="${m}" ${m.toLowerCase() === marcaSelecionada.toLowerCase() ? 'selected' : ''}>🏷️ ${m}</option>
  `).join('') + `<option value="__NOVA__">+ Nova marca...</option>`;

  if (inputHidden) inputHidden.value = marcaSelecionada;
}

function selectProductForCart(productId) {
  const p = (products || []).find(it => it.id === productId);
  if (p) {
    document.getElementById('cartInputProductName').value = p.name;
    document.getElementById('cartInputUnit').value = p.unit || 'un';

    atualizarSelectMarcasInline(p.name, 'Padrão');

    const precoRegistrado = obterPrecoProdutoMarcaMercado(p, 'Padrão', activeMarketId);
    const priceInput = document.getElementById('cartInputUnitPrice');
    if (priceInput) {
      priceInput.value = precoRegistrado > 0 ? formatBRL(precoRegistrado) : '';
    }

    document.getElementById('cartAutocompleteDropdown')?.classList.add('hidden');
    document.getElementById('cartBtnClearProduct')?.classList.remove('hidden');
    document.getElementById('cartInputQuantity')?.focus();
    updateCartItemPreview();
  }
  sincronizarPrecoFormularioCarrinho();
}

function obterPrecoProdutoMarcaMercado(produto, marcaNome, mercadoId) {
  if (!produto || !mercadoId) return 0;
  const marca = (marcaNome || 'Padrão').trim().toLowerCase();

  if (marca === 'padrão' || marca === 'padrao') {
    if (produto.marketPrices && produto.marketPrices[mercadoId] !== undefined) {
      return Number(produto.marketPrices[mercadoId]) || 0;
    }
    return 0;
  }

  if (Array.isArray(produto.brands)) {
    const bObj = produto.brands.find(b => (b.name || b.id || '').toLowerCase() === marca);
    if (bObj && bObj.marketPrices && bObj.marketPrices[mercadoId] !== undefined) {
      return Number(bObj.marketPrices[mercadoId]) || 0;
    }
  }
  return 0;
}

function sincronizarPrecoFormularioCarrinho() {
  const nomeProd = (document.getElementById('cartInputProductName')?.value || '').trim();
  const selectMarca = document.getElementById('cartSelectProductBrand');
  const inputPreco = document.getElementById('cartInputUnitPrice');
  const selectMercado = document.getElementById('selectActiveMarket');

  if (!nomeProd || !inputPreco) return;

  const mercadoAtualId = selectMercado?.value || activeMarketId;
  const p = (products || []).find(x => x.name.toLowerCase() === nomeProd.toLowerCase());
  if (!p) return;

  const marcaSelecionada = selectMarca ? selectMarca.value : 'Padrão';
  const precoEncontrado = obterPrecoProdutoMarcaMercado(p, marcaSelecionada, mercadoAtualId);

  inputPreco.value = precoEncontrado > 0 ? formatBRL(precoEncontrado) : '';
  updateCartItemPreview();
}

function recalcularPrecosCarrinhoPorMercado(novoMercadoId) {
  if (!novoMercadoId) return;
  activeMarketId = novoMercadoId;

  (cart || []).forEach(item => {
    const p = (products || []).find(prod => 
      (item.productId && prod.id === item.productId) || 
      prod.name.toLowerCase() === item.name.toLowerCase()
    );

    if (p) {
      item.unitPrice = obterPrecoProdutoMarcaMercado(p, item.selectedBrandId || 'Padrão', novoMercadoId);
    } else {
      item.unitPrice = 0;
    }
  });

  saveAllLocalData();
  saveCartData();
  if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
  renderCartUI();
}
window.recalcularPrecosCarrinhoPorMercado = recalcularPrecosCarrinhoPorMercado;

function renderCartUI() {
  const q = (document.getElementById('cartSearchFilter')?.value || '').toLowerCase().trim();
  const totalItems = cart.length;
  const checkedItems = cart.filter(i => i.checked).length;
  const pendingItems = totalItems - checkedItems;

  ['cartBadgeAll', 'navCartBadgeCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = totalItems;
  });
  if (document.getElementById('cartBadgePending')) document.getElementById('cartBadgePending').innerText = pendingItems;
  if (document.getElementById('cartBadgeChecked')) document.getElementById('cartBadgeChecked').innerText = checkedItems;

  const displayList = cart.filter(item => {
    if (cartFilterMode === 'pending' && item.checked) return false;
    if (cartFilterMode === 'checked' && !item.checked) return false;
    if (q && !item.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const container = document.getElementById('cartItemsContainer');
  const emptyCard = document.getElementById('cartEmptyCard');
  if (!container || !emptyCard) return;

  if (cart.length === 0) {
    container.innerHTML = '';
    emptyCard.classList.remove('hidden');
  } else {
    emptyCard.classList.add('hidden');
    if (displayList.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 p-6 my-2">
          <p class="text-xs font-semibold text-slate-600">Nenhum item encontrado no filtro.</p>
        </div>`;
    } else {
      container.innerHTML = displayList.map(item => {
        const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
        const isChecked = Boolean(item.checked);

        return `
          <div class="bg-white rounded-2xl p-3.5 border ${isChecked ? 'border-emerald-200 bg-emerald-50/40 opacity-75' : 'border-slate-200 shadow-2xs hover:border-slate-300'} transition-all my-2">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <button type="button" onclick="toggleCartItemCheck('${item.id}')" class="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-300'}">
                  <svg class="w-4 h-4 ${isChecked ? 'block' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </button>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-1.5 flex-wrap">
                    <h4 class="font-extrabold text-sm text-slate-800 truncate ${isChecked ? 'line-through text-slate-400' : ''}">${item.name}</h4>
                    <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${item.unit || 'un'}</span>
                    <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black border border-emerald-300">🏷️ ${item.selectedBrandId || 'Padrão'}</span>
                  </div>
                  <div class="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                    <span>${formatQty(item.quantity)} ${item.unit} × R$ ${formatBRL(item.unitPrice)}</span>
                    ${calc.badgeText ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded">${calc.badgeText}</span>` : ''}
                  </div>
                </div>
              </div>

              <div class="flex items-center space-x-2 shrink-0">
                <div class="text-right mr-1">
                  <div class="text-sm font-black text-slate-900 leading-tight">R$ ${formatBRL(calc.finalSubtotal || 0)}</div>
                  ${calc.savings > 0 ? `<div class="text-[10px] font-bold text-emerald-600">-R$ ${formatBRL(calc.savings)}</div>` : ''}
                </div>
                <div class="flex items-center bg-slate-100 rounded-xl p-0.5">
                  <button type="button" onclick="stepCartQty('${item.id}', -1)" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs">–</button>
                  <button type="button" onclick="stepCartQty('${item.id}', 1)" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs">+</button>
                </div>
                <button type="button" onclick="openEditCartItemModal('${item.id}')" class="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" title="Editar item">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button type="button" onclick="removeCartItem('${item.id}')" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Remover item">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  updateCartTotals(totalItems, checkedItems);
}

// ============================================================
// MODAL DE EDIÇÃO DE ITEM DO CARRINHO (IMPLEMENTAÇÃO COMPLETA)
// ============================================================
let editingCartItemId = null;

function garantirModalEdicaoCarrinhoNoDOM() {
  if (document.getElementById('modalEditCartItem')) return;

  const modalHtml = `
    <div id="modalEditCartItem" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-5 space-y-3.5 border border-slate-200">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 class="font-black text-slate-800 text-sm sm:text-base">Editar Item do Carrinho</h3>
            <p id="editCartItemSubname" class="text-[11px] text-slate-500 font-semibold truncate">Produto</p>
          </div>
          <button type="button" onclick="closeEditCartItemModal()" class="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
        </div>

        <form id="formModalEditCartItem" class="space-y-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Marca:</label>
            <select id="editCartItemBrand" class="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"></select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Preço Unitário (R$):</label>
              <input type="text" id="editCartItemPrice" class="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0,00">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Qtd. / Peso:</label>
              <input type="text" id="editCartItemQty" class="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="1">
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Unidade de Medida:</label>
            <select id="editCartItemUnit" class="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="un">un (Unidade)</option>
              <option value="kg">kg (Quilo)</option>
              <option value="g">g (Grama)</option>
              <option value="l">l (Litro)</option>
              <option value="ml">ml (Mililitro)</option>
              <option value="cx">cx (Caixa)</option>
              <option value="pct">pct (Pacote)</option>
            </select>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button type="button" onclick="closeEditCartItemModal()" class="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('formModalEditCartItem').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!editingCartItemId) return;

    const item = (cart || []).find(x => x.id === editingCartItemId);
    if (!item) return;

    const novaMarca = document.getElementById('editCartItemBrand').value || 'Padrão';
    const novoPreco = parseNumberInput(document.getElementById('editCartItemPrice').value) || 0;
    const novaQtd = parseNumberInput(document.getElementById('editCartItemQty').value) || 1;
    const novaUnidade = document.getElementById('editCartItemUnit').value || 'un';

    item.selectedBrandId = novaMarca;
    item.unitPrice = novoPreco;
    item.quantity = novaQtd;
    item.unit = novaUnidade;

    saveCartData();
    renderCartUI();
    closeEditCartItemModal();
    showAppToast(`"${item.name}" atualizado com sucesso!`, 'success');
  });
}

window.openEditCartItemModal = function(id) {
  garantirModalEdicaoCarrinhoNoDOM();
  const item = (cart || []).find(x => x.id === id);
  if (!item) return;

  editingCartItemId = id;

  const modal = document.getElementById('modalEditCartItem');
  const subname = document.getElementById('editCartItemSubname');
  const selectBrand = document.getElementById('editCartItemBrand');
  const inputPrice = document.getElementById('editCartItemPrice');
  const inputQty = document.getElementById('editCartItemQty');
  const selectUnit = document.getElementById('editCartItemUnit');

  if (subname) subname.innerText = item.name;
  if (inputPrice) inputPrice.value = item.unitPrice > 0 ? formatBRL(item.unitPrice) : '';
  if (inputQty) inputQty.value = item.quantity;
  if (selectUnit) selectUnit.value = item.unit || 'un';

  const marcas = new Set(['Padrão']);
  const p = (products || []).find(prod => prod.name.toLowerCase() === item.name.toLowerCase());
  if (p && Array.isArray(p.brands)) {
    p.brands.forEach(b => marcas.add(typeof b === 'string' ? b : (b.name || b.id)));
  }
  if (item.selectedBrandId) marcas.add(item.selectedBrandId);

  if (selectBrand) {
    selectBrand.innerHTML = Array.from(marcas).map(m => `
      <option value="${m}" ${m.toLowerCase() === (item.selectedBrandId || 'Padrão').toLowerCase() ? 'selected' : ''}>🏷️ ${m}</option>
    `).join('');
  }

  modal.classList.remove('hidden');
};

window.closeEditCartItemModal = function() {
  document.getElementById('modalEditCartItem')?.classList.add('hidden');
  editingCartItemId = null;
};

function updateCartTotals(totalItems, checkedItems) {
  let grandTotal = 0;
  let totalSavings = 0;
  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    grandTotal += calc.finalSubtotal;
    totalSavings += calc.savings;
  });

  const t = document.getElementById('checkoutGrandTotal');
  if (t) t.innerText = `R$ ${formatBRL(grandTotal)}`;
  const i = document.getElementById('checkoutTotalItemsLabel');
  if (i) i.innerText = `${totalItems} itens`;
  const r = document.getElementById('checkoutCheckedRatioLabel');
  if (r) r.innerText = `${checkedItems}/${totalItems} no carrinho`;
  const s = document.getElementById('checkoutSavingsBadge');
  if (s) {
    if (totalSavings > 0) {
      s.innerText = `Econ. R$ ${formatBRL(totalSavings)}`;
      s.classList.remove('hidden');
    } else {
      s.classList.add('hidden');
    }
  }
}

function toggleCartItemCheck(id) {
  const it = (cart || []).find(x => x.id === id);
  if (it) {
    it.checked = !it.checked;
    playAppBeep('check');
    saveCartData();
    renderCartUI();
  }
}

function stepCartQty(id, delta) {
  const it = (cart || []).find(x => x.id === id);
  if (!it) return;
  const step = it.unit === 'kg' ? 0.25 : 1;
  const next = it.quantity + (delta * step);
  if (next <= 0) {
    removeCartItem(id);
  } else {
    it.quantity = Number(next.toFixed(3));
    saveCartData();
    renderCartUI();
  }
}

function removeCartItem(id) {
  const idx = (cart || []).findIndex(x => x.id === id);
  if (idx > -1) {
    cart.splice(idx, 1);
    saveCartData();
    renderCartUI();
    showAppToast('Item removido', 'info');
  }
}

function askClearCart() {
  if (cart.length === 0) return;
  openCustomDialog(
    'Limpar Carrinho?',
    'Deseja remover todos os itens ou apenas os que já foram pegos?',
    'Limpar Todos',
    'Limpar Só os Pegos',
    () => { cart = []; saveCartData(); renderCartUI(); showAppToast('Carrinho limpo!', 'info'); },
    () => { cart = cart.filter(it => !it.checked); saveCartData(); renderCartUI(); showAppToast('Itens pegos removidos!', 'info'); }
  );
}

function askFinishPurchase() {
  if (cart.length === 0) return;
  let total = 0;
  cart.forEach(i => total += computeItemFinancials(i.quantity, i.unitPrice, i.promo).finalSubtotal);
  openCustomDialog(
    'Concluir Compra?',
    `Deseja finalizar a compra em ${getSelectedMarketName()} totalizando R$ ${formatBRL(total)}?`,
    'Concluir e Limpar',
    'Concluir e Manter Lista',
    () => executeFinishPurchase(true),
    () => executeFinishPurchase(false)
  );
}

function executeFinishPurchase(clearAfter) {
  let gT = 0;
  let tS = 0;

  // 1. Processa cada item do carrinho e grava os novos preços no banco de dados (products)
  const itensSnapshot = cart.map(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    gT += calc.finalSubtotal;
    tS += calc.savings;

    const unitPrice = Number(item.unitPrice) || 0;
    const marca = item.selectedBrandId || 'Padrão';

    // Grava o preço pago no banco de dados (catálogo mestre)
    if (unitPrice > 0) {
      window.atualizarPrecoUnificado(item.productId || item.name, marca, activeMarketId, unitPrice);
    }

    // Snapshot estático imutável para o histórico
    return {
      productId: item.productId || null,
      name: item.name,
      selectedBrandId: marca,
      unitPrice: unitPrice,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'un',
      subtotal: calc.finalSubtotal,
      savings: calc.savings,
      promo: item.promo ? JSON.parse(JSON.stringify(item.promo)) : { type: 'none' }
    };
  });

  // 2. Arquiva o cupom fechado no histórico
  const novaCompra = {
    id: 'pur-' + Date.now(),
    date: new Date().toISOString(),
    marketId: activeMarketId,
    marketName: getSelectedMarketName(),
    total: gT,
    savings: tS,
    itemCount: itensSnapshot.length,
    items: itensSnapshot
  };

  if (!Array.isArray(window.purchaseHistory)) window.purchaseHistory = [];
  window.purchaseHistory.unshift(novaCompra);

  try {
    localStorage.setItem('sc_history_v3', JSON.stringify(window.purchaseHistory));
    localStorage.setItem('sc_purchase_history', JSON.stringify(window.purchaseHistory));
  } catch (e) {
    console.error(e);
  }

  // 3. Limpa ou desmarca o carrinho
  if (clearAfter) cart = [];
  else cart.forEach(it => it.checked = false);

  // 4. Salva o catálogo atualizado no LocalStorage e atualiza todas as UIs
  saveAllLocalData();
  saveCartData();

  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  if (typeof renderHistoricoUI === 'function') renderHistoricoUI();

  if (typeof playAppBeep === 'function') playAppBeep('finish');
  showAppToast('Compra finalizada e preços atualizados no catálogo!', 'success');
}

document.addEventListener('change', (e) => {
  if (e.target && (e.target.id === 'selectActiveMarket' || e.target.id === 'cartSelectSupermarket')) {
    recalcularPrecosCarrinhoPorMercado(e.target.value);
  }
});

const inputBuscaCarrinho = document.getElementById('cartSearchFilter');
inputBuscaCarrinho?.addEventListener('input', () => {
  renderCartUI();
});

const inputProdName = document.getElementById('cartInputProductName');
const dropdownProd = document.getElementById('cartAutocompleteDropdown');
const btnClearProd = document.getElementById('cartBtnClearProduct');

inputProdName?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const containerMarca = document.getElementById('containerMarcaInline');

  if (btnClearProd) btnClearProd.classList.toggle('hidden', q.length === 0);

  if (q.length < 1) {
    if (containerMarca) containerMarca.classList.add('hidden');
    if (dropdownProd) {
      dropdownProd.classList.add('hidden');
      dropdownProd.innerHTML = '';
    }
    return;
  }

  if (containerMarca) containerMarca.classList.remove('hidden');
  atualizarSelectMarcasInline(e.target.value, document.getElementById('cartInputProductBrand')?.value || 'Padrão');

  const matches = (products || []).filter(p => 
    p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
  ).slice(0, 6);

  if (matches.length > 0 && dropdownProd) {
    dropdownProd.innerHTML = `
      <div class="p-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
        <span>Sugestões no Catálogo:</span>
        <button type="button" onclick="document.getElementById('cartAutocompleteDropdown').classList.add('hidden')" class="text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded">✕</button>
      </div>
    ` + matches.map(p => {
      const pPrice = obterPrecoProdutoMarcaMercado(p, 'Padrão', activeMarketId) || p.basePrice;
      return `
        <div class="px-3.5 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer flex items-center justify-between text-xs transition-colors" onclick="selectProductForCart('${p.id}')">
          <div class="min-w-0 pr-2">
            <span class="font-bold text-slate-800 block truncate">${p.name}</span>
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${p.category || 'Geral'}</span>
          </div>
          <div class="text-right text-emerald-700 font-black shrink-0">
            ${pPrice > 0 ? 'R$ ' + formatBRL(pPrice) : 'A cotar'}
            <span class="text-[10px] text-slate-500 font-normal"> / ${p.unit || 'un'}</span>
          </div>
        </div>
      `;
    }).join('');
    dropdownProd.classList.remove('hidden');
  } else if (dropdownProd) {
    dropdownProd.classList.add('hidden');
    dropdownProd.innerHTML = '';
  }
});

btnClearProd?.addEventListener('click', () => {
  if (inputProdName) inputProdName.value = '';
  btnClearProd.classList.add('hidden');
  dropdownProd?.classList.add('hidden');
  document.getElementById('containerMarcaInline')?.classList.add('hidden');
  inputProdName?.focus();
  updateCartItemPreview();
});

document.getElementById('formAddCartItem')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const nameInput = document.getElementById('cartInputProductName');
  const name = (nameInput?.value || '').trim();

  if (!name) {
    showAppToast('Informe ou selecione um produto.', 'warning');
    return;
  }

  const unit = document.getElementById('cartInputUnit')?.value || 'un';
  const unitPrice = parseNumberInput(document.getElementById('cartInputUnitPrice')?.value) || 0;
  const quantity = parseNumberInput(document.getElementById('cartInputQuantity')?.value) || 1;
  const brandVal = document.getElementById('cartInputProductBrand')?.value || 'Padrão';
  const selectedBrandId = (brandVal === '__NOVA__') ? 'Padrão' : brandVal;
  const promo = getCartFormPromoConfig();

  let masterProd = (products || []).find(p => p.name.toLowerCase() === name.toLowerCase());

  if (!masterProd) {
    masterProd = {
      id: 'p-custom-' + Date.now(),
      name: name,
      category: 'Geral',
      unit: unit,
      basePrice: unitPrice > 0 ? unitPrice : 0,
      marketPrices: {},
      brands: []
    };

    if (activeMarketId !== 'm-padrao' && unitPrice > 0) {
      if (selectedBrandId === 'Padrão') {
        masterProd.marketPrices[activeMarketId] = unitPrice;
      } else {
        masterProd.brands.push({ id: selectedBrandId, name: selectedBrandId, marketPrices: { [activeMarketId]: unitPrice } });
      }
    }
    if (!Array.isArray(products)) products = [];
    products.unshift(masterProd);
    saveAllLocalData();
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
  }

  cart.unshift({
    id: 'c-item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    productId: masterProd.id,
    selectedBrandId: selectedBrandId || 'Padrão',
    name: masterProd.name,
    category: masterProd.category || 'Geral',
    unit: masterProd.unit || unit,
    unitPrice: unitPrice,
    quantity: quantity,
    checked: false,
    promo: promo
  });

  saveCartData();
  renderCartUI();
  if (typeof playAppBeep === 'function') playAppBeep('add');
  showAppToast(`"${name} (${selectedBrandId})" adicionado!`, 'success');

  if (nameInput) nameInput.value = '';
  const priceInput = document.getElementById('cartInputUnitPrice');
  if (priceInput) priceInput.value = '';
  const qtyInput = document.getElementById('cartInputQuantity');
  if (qtyInput) qtyInput.value = '1';

  document.getElementById('cartBtnClearProduct')?.classList.add('hidden');
  setCartPromoMode('none');
  nameInput?.focus();
  document.getElementById('containerMarcaInline')?.classList.add('hidden');
});

higienizarInputsCarrinho();
setCartPromoMode('none');
// ============================================================
// FUNÇÕES GLOBAIS DE EDIÇÃO DO ITEM NO CARRINHO (INDEX.HTML)
// ============================================================

let idItemSendoEditado = null;

// Função chamada quando você clica no ícone de lápis no carrinho
window.abrirModalEdicaoItem = function(id) {
  idItemSendoEditado = id;
  const item = (cart || []).find(x => x.id === id);
  if (!item) return;

  const modal = document.querySelector('#modalEditarItemCarrinho, #modalEditCartItem, [id*="modalEdit"], [id*="modalEditar"]');
  if (!modal) return;

  // Preenche a marca
  const selectMarca = modal.querySelector('select[name="marca"], select#editItemMarca, select#editCartItemBrand, select');
  if (selectMarca) {
    const marcas = new Set(['Padrão']);
    const p = (products || []).find(prod => prod.name.toLowerCase() === item.name.toLowerCase());
    if (p && Array.isArray(p.brands)) {
      p.brands.forEach(b => marcas.add(typeof b === 'string' ? b : (b.name || b.id)));
    }
    if (item.selectedBrandId) marcas.add(item.selectedBrandId);

    selectMarca.innerHTML = Array.from(marcas).map(m => `
      <option value="${m}" ${m.toLowerCase() === (item.selectedBrandId || 'Padrão').toLowerCase() ? 'selected' : ''}>${m}</option>
    `).join('');
  }

  // Preenche preço e quantidade
  const inputPreco = modal.querySelector('input[placeholder*="0,00"], input[name*="preco"], input#editItemPreco, input#editCartItemPrice');
  const inputQtd = modal.querySelector('input[name*="qtd"], input#editItemQtd, input#editCartItemQty, input[type="number"]');

  if (inputPreco) inputPreco.value = item.unitPrice > 0 ? formatBRL(item.unitPrice) : '';
  if (inputQtd) inputQtd.value = item.quantity || 1;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  window.atualizarSubtotalModalEdicao();
};
window.openEditCartItemModal = window.abrirModalEdicaoItem;

// 1. Recalcula o "NOVO SUBTOTAL" ao digitar preço ou quantidade
window.atualizarSubtotalModalEdicao = function() {
  const modal = document.querySelector('#modalEditarItemCarrinho, #modalEditCartItem, [id*="modalEdit"], [id*="modalEditar"]');
  if (!modal) return;

  const inputPreco = modal.querySelector('input[placeholder*="0,00"], input[name*="preco"], input#editItemPreco, input#editCartItemPrice');
  const inputQtd = modal.querySelector('input[name*="qtd"], input#editItemQtd, input#editCartItemQty, input[type="number"]');
  
  const preco = parseNumberInput(inputPreco?.value) || 0;
  const qtd = parseNumberInput(inputQtd?.value) || 1;
  const subtotal = preco * qtd;

  // Atualiza qualquer indicador de subtotal no modal
  const elSubtotal = modal.querySelector('#editItemSubtotal, #modalEditSubtotal, #subtotalModalEdicao, [id*="Subtotal"], strong.text-emerald-600') ||
                     Array.from(modal.querySelectorAll('strong, span, p')).find(el => el.textContent.includes('R$') && el.closest('div').textContent.includes('SUBTOTAL'));

  if (elSubtotal) {
    elSubtotal.innerText = `R$ ${formatBRL(subtotal)}`;
  }
};

// 2. Salva as alterações no item do carrinho
window.salvarEdicaoItemCarrinho = function(event) {
  if (event && event.preventDefault) event.preventDefault();

  if (!idItemSendoEditado) {
    window.fecharModalEdicaoItem();
    return;
  }

  const item = (cart || []).find(x => x.id === idItemSendoEditado);
  if (!item) {
    window.fecharModalEdicaoItem();
    return;
  }

  const modal = document.querySelector('#modalEditarItemCarrinho, #modalEditCartItem, [id*="modalEdit"], [id*="modalEditar"]');
  if (!modal) return;

  const selectMarca = modal.querySelector('select[name="marca"], select#editItemMarca, select#editCartItemBrand, select');
  const inputPreco = modal.querySelector('input[placeholder*="0,00"], input[name*="preco"], input#editItemPreco, input#editCartItemPrice');
  const inputQtd = modal.querySelector('input[name*="qtd"], input#editItemQtd, input#editCartItemQty, input[type="number"]');

  const novaMarca = selectMarca ? selectMarca.value : (item.selectedBrandId || 'Padrão');
  const novoPreco = parseNumberInput(inputPreco?.value) || 0;
  const novaQtd = parseNumberInput(inputQtd?.value) || 1;

  // Atualiza as propriedades no carrinho ativo
  item.selectedBrandId = novaMarca;
  item.unitPrice = novoPreco;
  item.quantity = novaQtd;

  saveCartData();
  renderCartUI();
  window.fecharModalEdicaoItem();
  showAppToast(`"${item.name}" atualizado para R$ ${formatBRL(novoPreco)}!`, 'success');
};

window.fecharModalEdicaoItem = function() {
  const modal = document.querySelector('#modalEditarItemCarrinho, #modalEditCartItem, [id*="modalEdit"], [id*="modalEditar"]');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  idItemSendoEditado = null;
};
window.closeEditCartItemModal = window.fecharModalEdicaoItem;
