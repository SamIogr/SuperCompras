function computeItemFinancials(qty, unitPrice, promo = {}) {
  qty = Math.max(0, qty);
  unitPrice = Math.max(0, unitPrice);
  const standardSubtotal = qty * unitPrice;
  let finalSubtotal = standardSubtotal;
  let savings = 0;
  let badgeText = '';

  if (promo.type === 'discount') {
    const val = promo.value || 0;
    if (promo.mode === 'percent' && val > 0) {
      savings = standardSubtotal * (Math.min(val, 100) / 100);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. ${val}%`;
    } else if (promo.mode === 'fixed' && val > 0) {
      const unitSaving = Math.min(val, unitPrice);
      savings = qty * unitSaving;
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. R$ ${formatBRL(val)}/un`;
    }
  } else if (promo.type === 'wholesale') {
    const minQ = promo.minQty || 0;
    const wPrice = promo.wholesalePrice || 0;
    if (minQ > 0 && wPrice > 0 && qty >= minQ) {
      const wholesaleTotal = qty * wPrice;
      if (wholesaleTotal < standardSubtotal) {
        savings = standardSubtotal - wholesaleTotal;
        finalSubtotal = wholesaleTotal;
        badgeText = `Atacado (≥${minQ}): R$ ${formatBRL(wPrice)}/un`;
      }
    }
  }

  return {
    standardSubtotal,
    finalSubtotal: Math.max(0, finalSubtotal),
    savings: Math.max(0, savings),
    badgeText
  };
}

function handleCartPromoTypeChange(type) {
  document.getElementById('cartPromoDiscountFields').classList.toggle('hidden', type !== 'discount');
  document.getElementById('cartPromoWholesaleFields').classList.toggle('hidden', type !== 'wholesale');
  document.getElementById('cartPromoBadge').classList.toggle('hidden', type === 'none');
  updateCartItemPreview();
}

function getFormPromoConfig() {
  const type = document.querySelector('input[name="itemPromoType"]:checked')?.value || 'none';
  if (type === 'discount') {
    return {
      type: 'discount',
      mode: document.getElementById('cartDiscountMode').value,
      value: parseNumberInput(document.getElementById('cartDiscountVal').value)
    };
  } else if (type === 'wholesale') {
    return {
      type: 'wholesale',
      minQty: parseNumberInput(document.getElementById('cartWholesaleMin').value),
      wholesalePrice: parseNumberInput(document.getElementById('cartWholesalePrice').value)
    };
  }
  return { type: 'none' };
}

function updateCartItemPreview() {
  const qty = parseNumberInput(document.getElementById('cartInputQuantity').value);
  const price = parseNumberInput(document.getElementById('cartInputUnitPrice').value);
  const promo = getFormPromoConfig();
  const calc = computeItemFinancials(qty, price, promo);
  document.getElementById('cartItemPreviewSubtotal').innerText = `R$ ${formatBRL(calc.finalSubtotal)}`;

  const savEl = document.getElementById('cartItemPreviewSavings');
  if (calc.savings > 0) {
    savEl.innerText = `(-R$ ${formatBRL(calc.savings)})`;
    savEl.classList.remove('hidden');
  } else {
    savEl.classList.add('hidden');
  }
}

function selectProductForCart(productId) {
  const p = products.find(it => it.id === productId);
  if (p) {
    document.getElementById('cartInputProductName').value = p.name;
    document.getElementById('cartInputUnit').value = p.unit || 'un';
    const recordedPrice = (p.marketPrices && p.marketPrices[activeMarketId]) ? p.marketPrices[activeMarketId] : p.basePrice;
    document.getElementById('cartInputUnitPrice').value = formatBRL(recordedPrice);
    document.getElementById('cartAutocompleteDropdown').classList.add('hidden');
    document.getElementById('cartBtnClearProduct').classList.remove('hidden');
    document.getElementById('cartInputQuantity').focus();
    document.getElementById('cartInputQuantity').select();
    updateCartItemPreview();
  }
}

function setCartQuickQty(val) {
  document.getElementById('cartInputQuantity').value = val;
  updateCartItemPreview();
}

function setCartFilterMode(mode) {
  cartFilterMode = mode;
  ['all', 'pending', 'checked'].forEach(m => {
    const btn = document.getElementById(`tabFilter${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (m === mode) {
      btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
      btn.classList.remove('text-slate-600');
    } else {
      btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
      btn.classList.add('text-slate-600');
    }
  });
  renderCartUI();
}

function renderCartUI() {
  const q = (document.getElementById('cartSearchFilter').value || '').toLowerCase().trim();
  const totalItems = cart.length;
  const checkedItems = cart.filter(i => i.checked).length;
  const pendingItems = totalItems - checkedItems;

  document.getElementById('cartBadgeAll').innerText = totalItems;
  document.getElementById('cartBadgePending').innerText = pendingItems;
  document.getElementById('cartBadgeChecked').innerText = checkedItems;
  document.getElementById('navCartBadgeCount').innerText = totalItems;

  let displayList = cart.filter(item => {
    if (cartFilterMode === 'pending' && item.checked) return false;
    if (cartFilterMode === 'checked' && !item.checked) return false;
    if (q && !item.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const container = document.getElementById('cartItemsContainer');
  const emptyCard = document.getElementById('cartEmptyCard');

  if (cart.length === 0) {
    container.innerHTML = '';
    emptyCard.classList.remove('hidden');
  } else {
    emptyCard.classList.add('hidden');
    if (displayList.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-xs text-slate-600 bg-white rounded-xl border border-slate-200">
          Nenhum produto encontrado neste filtro.
        </div>
      `;
    } else {
      container.innerHTML = displayList.map(item => {
        const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
        const isChecked = item.checked;

        return `
          <div class="bg-white rounded-xl p-3 border transition-all ${
            isChecked 
              ? 'border-emerald-200 bg-emerald-50/40 opacity-75' 
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }">
            <div class="flex items-center justify-between gap-2.5">
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <button 
                  type="button" 
                  onclick="toggleCartItemCheck('${item.id}')"
                  class="touch-target w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isChecked 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                      : 'border-slate-300 bg-slate-50 hover:border-emerald-400'
                  }"
                >
                  <svg class="w-4 h-4 ${isChecked ? 'block' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </button>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-1.5 flex-wrap">
                    <h4 class="font-extrabold text-sm text-slate-800 truncate ${isChecked ? 'line-through text-slate-600' : ''}">
                      ${item.name}
                    </h4>
                    <span class="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                      ${item.unit}
                    </span>
                  </div>

                  <div class="text-xs text-slate-600 flex items-center space-x-1.5 mt-0.5 flex-wrap">
                    <span>${formatQty(item.quantity)} ${item.unit} × R$ ${formatBRL(item.unitPrice)}</span>
                    ${calc.badgeText ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded">🏷️ ${calc.badgeText}</span>` : ''}
                  </div>
                </div>
              </div>

              <div class="flex items-center space-x-1.5 shrink-0">
                <div class="text-right mr-1">
                  <div class="text-sm font-black text-slate-900 leading-tight">
                    R$ ${formatBRL(calc.finalSubtotal)}
                  </div>
                  ${calc.savings > 0 ? `<div class="text-[10px] font-bold text-emerald-600">-R$ ${formatBRL(calc.savings)}</div>` : ''}
                </div>

                <div class="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button type="button" onclick="stepCartQty('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 font-bold text-xs">–</button>
                  <button type="button" onclick="stepCartQty('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 font-bold text-xs">+</button>
                </div>

                <button 
                  type="button" 
                  onclick="openEditCartItemModal('${item.id}')" 
                  class="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Editar preço ou quantidade"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                </button>

                <button 
                  type="button" 
                  onclick="removeCartItem('${item.id}')" 
                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remover item"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
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

function updateCartTotals(totalItems, checkedItems) {
  let grandTotal = 0;
  let totalSavings = 0;

  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    grandTotal += calc.finalSubtotal;
    totalSavings += calc.savings;
  });

  document.getElementById('checkoutGrandTotal').innerText = `R$ ${formatBRL(grandTotal)}`;
  document.getElementById('checkoutTotalItemsLabel').innerText = `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`;
  document.getElementById('checkoutCheckedRatioLabel').innerText = `${checkedItems}/${totalItems} no carrinho`;

  const savBadge = document.getElementById('checkoutSavingsBadge');
  if (totalSavings > 0) {
    savBadge.innerText = `Econ. R$ ${formatBRL(totalSavings)}`;
    savBadge.classList.remove('hidden');
  } else {
    savBadge.classList.add('hidden');
  }
}

function toggleCartItemCheck(id) {
  const it = cart.find(x => x.id === id);
  if (it) {
    it.checked = !it.checked;
    playAppBeep('check');
    saveCartData();
  }
}

function stepCartQty(id, delta) {
  const it = cart.find(x => x.id === id);
  if (!it) return;

  const step = it.unit === 'kg' ? 0.25 : 1;
  const next = it.quantity + (delta * step);

  if (next <= 0) {
    removeCartItem(id);
  } else {
    it.quantity = Number(next.toFixed(3));
    saveCartData();
  }
}

function removeCartItem(id) {
  const idx = cart.findIndex(x => x.id === id);
  if (idx > -1) {
    const removed = cart.splice(idx, 1)[0];
    saveCartData();
    showAppToast(`"${removed.name}" removido`, 'info');
  }
}

function askClearCart() {
  if (cart.length === 0) return;
  openCustomDialog(
    'Limpar Lista de Compras?',
    'O que você deseja remover do carrinho?',
    'Limpar Todos os Itens',
    'Limpar Só os Pegos',
    () => {
      cart = [];
      saveCartData();
      showAppToast('Carrinho limpo!', 'info');
    },
    () => {
      cart = cart.filter(it => !it.checked);
      saveCartData();
      showAppToast('Itens pegos foram removidos!', 'info');
    }
  );
}

function askFinishPurchase() {
  if (cart.length === 0) {
    showAppToast('O carrinho está vazio!', 'info');
    return;
  }

  let grandTotal = 0;
  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    grandTotal += calc.finalSubtotal;
  });

  const marketName = getSelectedMarketName();

  openCustomDialog(
    'Finalizar Compra?',
    `Deseja concluir a compra no ${marketName} totalizando R$ ${formatBRL(grandTotal)}?`,
    'Concluir & Limpar Carrinho',
    'Concluir & Manter Lista',
    () => executeFinishPurchase(true),
    () => executeFinishPurchase(false)
  );
}

function executeFinishPurchase(clearAfter) {
  let grandTotal = 0;
  let totalSavings = 0;

  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    grandTotal += calc.finalSubtotal;
    totalSavings += calc.savings;

    let p = products.find(prod => prod.name.toLowerCase() === item.name.toLowerCase());
    if (p) {
      if (!p.marketPrices) p.marketPrices = {};
      p.marketPrices[activeMarketId] = item.unitPrice;
      enviarProdutoParaPlanilha(p, activeMarketId, item.unitPrice);
    }
  });

  const purchaseRecord = {
    id: 'pur-' + Date.now(),
    date: new Date().toISOString(),
    marketId: activeMarketId,
    marketName: getSelectedMarketName(),
    total: grandTotal,
    savings: totalSavings,
    itemCount: cart.length,
    items: JSON.parse(JSON.stringify(cart))
  };

  purchaseHistory.unshift(purchaseRecord);

  if (clearAfter) {
    cart = [];
  } else {
    cart.forEach(it => it.checked = false);
  }

  saveAllLocalData();
  saveCartData();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  playAppBeep('finish');
  showAppToast('🎉 Compra finalizada e preços gravados!', 'success');
}