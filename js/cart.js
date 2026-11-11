/**
 * SUPERCOMPRAS PRO (js/cart.js)
 * Gestão de itens, descontos, atacado, filtros e consolidação de marcas.
 */

// Estado local da condição comercial do formulário
let currentCartPromoMode = 'none';

// 1. CÁLCULO FINANCEIRO DE ITENS (PADRÃO, DESCONTO E ATACADO)
function computeItemFinancials(qty, unitPrice, promo = {}) {
  qty = Math.max(0, Number(qty) || 0);
  unitPrice = Math.max(0, Number(unitPrice) || 0);
  const standardSubtotal = qty * unitPrice;
  let finalSubtotal = standardSubtotal;
  let savings = 0;
  let badgeText = '';

  const promoType = promo ? promo.type : 'none';

  if (promoType === 'discount') {
    const val = Number(promo.value) || 0;
    const mode = promo.mode || 'percent';
    if ((mode === 'percent' || mode === 'percentage') && val > 0) {
      savings = standardSubtotal * (Math.min(val, 100) / 100);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. ${val}%`;
    } else if (mode === 'fixed' && val > 0) {
      savings = qty * Math.min(val, unitPrice);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. R$ ${formatBRL(val)}/un`;
    }
  } else if (promoType === 'wholesale') {
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

  return {
    standardSubtotal,
    finalSubtotal: Math.max(0, finalSubtotal),
    savings: Math.max(0, savings),
    badgeText
  };
}
window.computeItemFinancials = computeItemFinancials;

// 2. CONDIÇÃO COMERCIAL NO FORMULÁRIO PRINCIPAL
function setCartPromoMode(mode) {
  currentCartPromoMode = mode;

  const btnNone = document.getElementById('btnCartPromoNone');
  const btnDisc = document.getElementById('btnCartPromoDiscount');
  const btnWhol = document.getElementById('btnCartPromoWholesale');

  const panelDisc = document.getElementById('panelCartPromoDiscount');
  const panelWhol = document.getElementById('panelCartPromoWholesale');

  [btnNone, btnDisc, btnWhol].forEach(btn => {
    if (btn) btn.className = 'py-1.5 rounded-lg text-center transition-all text-slate-600 hover:text-slate-900 font-bold';
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
}
window.setCartPromoMode = setCartPromoMode;

// 3. FILTRAGEM DO CARRINHO (TODOS, NO CORREDOR, NO CARRINHO)
function setCartFilterMode(mode) {
  cartFilterMode = mode;

  const btnAll = document.getElementById('tabFilterAll');
  const btnPending = document.getElementById('tabFilterPending');
  const btnChecked = document.getElementById('tabFilterChecked');

  [btnAll, btnPending, btnChecked].forEach(btn => {
    if (btn) btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-all';
  });

  if (mode === 'all' && btnAll) btnAll.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all';
  if (mode === 'pending' && btnPending) btnPending.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all';
  if (mode === 'checked' && btnChecked) btnChecked.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all';

  if (typeof renderCartUI === 'function') renderCartUI();
  else if (window.AppTemplates && typeof window.AppTemplates.renderCart === 'function') window.AppTemplates.renderCart();
}
window.setCartFilterMode = setCartFilterMode;

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
window.updateCartItemPreview = updateCartItemPreview;

function setCartQuickQty(val) {
  const qInput = document.getElementById('cartInputQuantity');
  if (qInput) {
    qInput.value = val;
    updateCartItemPreview();
  }
}
window.setCartQuickQty = setCartQuickQty;

// 4. GESTÃO DE MARCAS INLINE
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

  if (marcaSelecionada && marcaSelecionada !== '__NOVA__') {
    marcas.add(marcaSelecionada);
  }

  select.innerHTML = Array.from(marcas).map(m => `
    <option value="${esc(m)}" ${m.toLowerCase() === (marcaSelecionada || 'Padrão').toLowerCase() ? 'selected' : ''}>🏷️ ${esc(m)}</option>`).join('') + `<option value="__NOVA__">+ Nova marca...</option>`;

  if (inputHidden) inputHidden.value = marcaSelecionada || 'Padrão';

  select.onchange = function() {
    if (this.value === '__NOVA__') {
      document.getElementById('boxSelectMarca')?.classList.add('hidden');
      const boxInput = document.getElementById('boxInputNovaMarcaInline');
      if (boxInput) boxInput.classList.remove('hidden');
      const input = document.getElementById('inputNovaMarcaInline');
      if (input) { input.value = ''; input.focus(); }
    } else {
      if (inputHidden) inputHidden.value = this.value;
      sincronizarPrecoFormularioCarrinho();
    }
  };
}

function confirmarNovaMarcaInline() {
  const input = document.getElementById('inputNovaMarcaInline');
  const nomeMarca = (input?.value || '').trim();

  if (!nomeMarca) {
    cancelarNovaMarcaInline();
    return;
  }

  const nomeProd = document.getElementById('cartInputProductName')?.value || '';
  atualizarSelectMarcasInline(nomeProd, nomeMarca);

  document.getElementById('boxInputNovaMarcaInline')?.classList.add('hidden');
  document.getElementById('boxSelectMarca')?.classList.remove('hidden');
  document.getElementById('cartInputUnitPrice')?.focus();
  updateCartItemPreview();
}
window.confirmarNovaMarcaInline = confirmarNovaMarcaInline;

function cancelarNovaMarcaInline() {
  document.getElementById('boxInputNovaMarcaInline')?.classList.add('hidden');
  document.getElementById('boxSelectMarca')?.classList.remove('hidden');
  const nomeProd = document.getElementById('cartInputProductName')?.value || '';
  atualizarSelectMarcasInline(nomeProd, 'Padrão');
}
window.cancelarNovaMarcaInline = cancelarNovaMarcaInline;

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

function selectProductForCart(productId) {
  const p = (products || []).find(it => it.id === productId);
  if (p) {
    document.getElementById('cartInputProductName').value = p.name;
    document.getElementById('cartInputUnit').value = p.unit || 'un';

    // Atualiza imediatamente os botões de atalho conforme a unidade do item (peso vs inteiro)
    if (typeof atualizarAtalhosQuantidade === 'function') {
      atualizarAtalhosQuantidade();
    }

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
}
window.selectProductForCart = selectProductForCart;

function recalcularPrecosCarrinhoPorMercado(novoMercadoId) {
  if (!novoMercadoId) return;
  activeMarketId = novoMercadoId;

  (cart || []).forEach(item => {
    const p = (products || []).find(prod => 
      (item.productId && prod.id === item.productId) || 
      prod.name.toLowerCase() === item.name.toLowerCase()
    );

    if (p) {
      const novo = obterPrecoProdutoMarcaMercado(p, item.selectedBrandId || 'Padrão', novoMercadoId);
      if (novo > 0) item.unitPrice = novo;
    }
  });

  saveAllLocalData();
  saveCartData();
  if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
  renderCartUI();
}
window.recalcularPrecosCarrinhoPorMercado = recalcularPrecosCarrinhoPorMercado;

// 4. MODAL DE EDIÇÃO DE ITEM DO CARRINHO (COMPATIBILIZADO)
let editingCartItemId = null;
let currentEditPromoMode = 'none';

function openEditCartItemModal(id) {
  editingCartItemId = id;
  const item = (cart || []).find(x => x.id === id);
  if (!item) return;

  const modal = document.getElementById('modalEditCartItem');
  if (!modal) return;

  // Carrega e permite editar o nome do produto
  const nameInput = document.getElementById('editCartItemName');
  if (nameInput) nameInput.value = item.name || '';

  // Carrega marcas
  const marcas = new Set(['Padrão']);
  const p = (products || []).find(prod => prod.name.toLowerCase() === item.name.toLowerCase());
  if (p && Array.isArray(p.brands)) {
    p.brands.forEach(b => marcas.add(typeof b === 'string' ? b : (b.name || b.id)));
  }
  if (item.selectedBrandId) marcas.add(item.selectedBrandId);

  const selectBrand = document.getElementById('editCartItemBrand');
  if (selectBrand) {
    selectBrand.innerHTML = Array.from(marcas).map(m => `
      <option value="${m}" ${m.toLowerCase() === (item.selectedBrandId || 'Padrão').toLowerCase() ? 'selected' : ''}>🏷️ ${m}</option>
    `).join('') + `<option value="__NOVA__">+ Nova marca...</option>`;

    selectBrand.onchange = function() {
      if (this.value === '__NOVA__') {
        document.getElementById('boxEditMarcaSelect')?.classList.add('hidden');
        const boxInput = document.getElementById('boxEditMarcaInline');
        if (boxInput) boxInput.classList.remove('hidden');
        const input = document.getElementById('inputEditNovaMarca');
        if (input) { input.value = ''; input.focus(); }
      }
    };
  }

  document.getElementById('boxEditMarcaInline')?.classList.add('hidden');
  document.getElementById('boxEditMarcaSelect')?.classList.remove('hidden');

  const inputPrice = document.getElementById('editCartItemPrice');
  const inputQty = document.getElementById('editCartItemQty');

  if (inputPrice) inputPrice.value = item.unitPrice > 0 ? formatBRL(item.unitPrice) : '';
  if (inputQty) inputQty.value = item.quantity || 1;

  // Carrega condição comercial
  const promo = item.promo || { type: 'none' };
  currentEditPromoMode = promo.type || 'none';

  const discMode = document.getElementById('editPromoDiscountMode');
  const discVal = document.getElementById('editPromoDiscountValue');
  const wholMin = document.getElementById('editPromoWholesaleMinQty');
  const wholPrice = document.getElementById('editPromoWholesalePrice');

  if (discMode) discMode.value = (promo.mode === 'fixed') ? 'fixed' : 'percent';
  if (discVal) discVal.value = (promo.type === 'discount' && promo.value > 0) ? promo.value : '';
  if (wholMin) wholMin.value = (promo.type === 'wholesale' && promo.minQty > 0) ? promo.minQty : 3;
  if (wholPrice) wholPrice.value = (promo.type === 'wholesale' && promo.wholesalePrice > 0) ? formatBRL(promo.wholesalePrice) : '';

  setEditPromoType(currentEditPromoMode);

  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  atualizarSubtotalModalEdicao();
}
window.openEditCartItemModal = openEditCartItemModal;

function closeEditCartItemModal() {
  const modal = document.getElementById('modalEditCartItem');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  editingCartItemId = null;
}
window.closeEditCartItemModal = closeEditCartItemModal;

function setEditPromoType(mode) {
  currentEditPromoMode = mode;

  const btnNone = document.getElementById('btnEditPromoNone') || document.getElementById('btnCondNone');
  const btnDisc = document.getElementById('btnEditPromoDiscount') || document.getElementById('btnCondDiscount');
  const btnWhol = document.getElementById('btnEditPromoWholesale') || document.getElementById('btnCondWholesale');

  const panelDisc = document.getElementById('panelEditPromoDiscount') || document.getElementById('editCartItemDiscountContainer');
  const panelWhol = document.getElementById('panelEditPromoWholesale') || document.getElementById('editCartItemWholesaleContainer');

  [btnNone, btnDisc, btnWhol].forEach(b => {
    if (b) b.className = 'py-1.5 rounded-md text-center transition-all text-slate-600 hover:text-slate-900 font-bold';
  });

  if (panelDisc) panelDisc.classList.add('hidden');
  if (panelWhol) panelWhol.classList.add('hidden');

  if (mode === 'discount') {
    if (btnDisc) btnDisc.className = 'py-1.5 rounded-md text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelDisc) panelDisc.classList.remove('hidden');
    (document.getElementById('editPromoDiscountValue') || document.getElementById('editCartItemDiscountValue'))?.focus();
  } else if (mode === 'wholesale') {
    if (btnWhol) btnWhol.className = 'py-1.5 rounded-md text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelWhol) panelWhol.classList.remove('hidden');
    (document.getElementById('editPromoWholesalePrice') || document.getElementById('editCartItemWholesalePrice'))?.focus();
  } else {
    if (btnNone) btnNone.className = 'py-1.5 rounded-md text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
  }

  atualizarSubtotalModalEdicao();
}
window.setEditPromoType = setEditPromoType;

function setEditQty(val) {
  const qInput = document.getElementById('editCartItemQty');
  if (qInput) {
    qInput.value = val;
    atualizarSubtotalModalEdicao();
  }
}
window.setEditQty = setEditQty;

function confirmarNovaMarcaModalEdicao() {
  const input = document.getElementById('inputEditNovaMarca');
  const novaMarca = (input?.value || '').trim();

  if (!novaMarca) {
    cancelarNovaMarcaModalEdicao();
    return;
  }

  const select = document.getElementById('editCartItemBrand');
  if (select) {
    const opt = document.createElement('option');
    opt.value = novaMarca;
    opt.textContent = `🏷️ ${novaMarca}`;
    opt.selected = true;
    select.insertBefore(opt, select.lastElementChild);
  }

  document.getElementById('boxEditMarcaInline')?.classList.add('hidden');
  document.getElementById('boxEditMarcaSelect')?.classList.remove('hidden');
  document.getElementById('editCartItemPrice')?.focus();
}
window.confirmarNovaMarcaModalEdicao = confirmarNovaMarcaModalEdicao;

function cancelarNovaMarcaModalEdicao() {
  document.getElementById('boxEditMarcaInline')?.classList.add('hidden');
  document.getElementById('boxEditMarcaSelect')?.classList.remove('hidden');
  const select = document.getElementById('editCartItemBrand');
  if (select && select.value === '__NOVA__') {
    select.value = 'Padrão';
  }
}
window.cancelarNovaMarcaModalEdicao = cancelarNovaMarcaModalEdicao;

function getEditFormPromoConfig() {
  if (currentEditPromoMode === 'discount') {
    const modeEl = document.getElementById('editPromoDiscountMode') || document.getElementById('editCartItemDiscountType');
    const valEl = document.getElementById('editPromoDiscountValue') || document.getElementById('editCartItemDiscountValue');
    return {
      type: 'discount',
      mode: (modeEl?.value === 'fixed') ? 'fixed' : 'percent',
      value: parseNumberInput(valEl?.value) || 0
    };
  }
  if (currentEditPromoMode === 'wholesale') {
    const minEl = document.getElementById('editPromoWholesaleMinQty') || document.getElementById('editCartItemWholesaleMin');
    const priceEl = document.getElementById('editPromoWholesalePrice') || document.getElementById('editCartItemWholesalePrice');
    return {
      type: 'wholesale',
      minQty: parseNumberInput(minEl?.value) || 1,
      wholesalePrice: parseNumberInput(priceEl?.value) || 0
    };
  }
  return { type: 'none' };
}

function atualizarSubtotalModalEdicao() {
  const modal = document.getElementById('modalEditCartItem');
  if (!modal) return;

  const inputPrice = document.getElementById('editCartItemPrice');
  const inputQty = document.getElementById('editCartItemQty');

  const preco = parseNumberInput(inputPrice?.value) || 0;
  const qtd = parseNumberInput(inputQty?.value) || 1;
  const promo = getEditFormPromoConfig();

  const calc = computeItemFinancials(qtd, preco, promo);

  const elSubtotal = document.getElementById('editCartItemSubtotal');
  if (elSubtotal) {
    elSubtotal.innerText = `R$ ${formatBRL(calc.finalSubtotal)}`;
  }
}
window.atualizarSubtotalModalEdicao = atualizarSubtotalModalEdicao;

function salvarEdicaoItemCarrinho() {
  if (!editingCartItemId) {
    closeEditCartItemModal();
    return;
  }

  const item = (cart || []).find(x => x.id === editingCartItemId);
  if (!item) {
    closeEditCartItemModal();
    return;
  }

  const nameInput = document.getElementById('editCartItemName');
  const selectBrand = document.getElementById('editCartItemBrand');
  const inputPrice = document.getElementById('editCartItemPrice');
  const inputQty = document.getElementById('editCartItemQty');

  const novoNome = (nameInput?.value || '').trim() || item.name;
  const novaMarca = (selectBrand?.value && selectBrand.value !== '__NOVA__') ? selectBrand.value : (item.selectedBrandId || 'Padrão');
  const novoPreco = parseNumberInput(inputPrice?.value) || 0;
  const novaQtd = parseNumberInput(inputQty?.value) || 1;
  const novaPromo = getEditFormPromoConfig();

  // Aplica as atualizações completas no item
  item.name = novoNome;
  item.selectedBrandId = novaMarca;
  item.unitPrice = novoPreco;
  item.quantity = novaQtd;
  item.promo = novaPromo;

  saveCartData();
  renderCartUI();
  closeEditCartItemModal();
  showAppToast(`"${item.name}" atualizado!`, 'success');
}
window.salvarEdicaoItemCarrinho = salvarEdicaoItemCarrinho;

// 6. TOTALIZAÇÃO E AÇÕES RÁPIDAS
function updateCartTotals(totalItems, checkedItems) {
  let grandTotal = 0;
  let totalSavings = 0;
  (cart || []).forEach(item => {
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
  const b = document.getElementById('cartCountBadge') || document.getElementById('cartBadge');
  if (b) {
    b.textContent = totalItems;
    b.style.display = totalItems > 0 ? 'flex' : 'none';
  }
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
window.updateCartTotals = updateCartTotals;

function toggleCartItemCheck(id) {
  const it = (cart || []).find(x => x.id === id);
  if (it) {
    it.checked = !it.checked;
    playAppBeep('check');
    saveCartData();
    renderCartUI();
  }
}
window.toggleCartItemCheck = toggleCartItemCheck;

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
window.stepCartQty = stepCartQty;

function removeCartItem(id) {
  const idx = (cart || []).findIndex(x => x.id === id);
  if (idx > -1) {
    cart.splice(idx, 1);
    saveCartData();
    renderCartUI();
    showAppToast('Item removido', 'info');
  }
}
window.removeCartItem = removeCartItem;

function askClearCart() {
  if ((cart || []).length === 0) return;
  if (typeof openCustomDialog === 'function') {
    openCustomDialog(
      'Limpar Carrinho?',
      'Deseja remover todos os itens ou apenas os que já foram pegos?',
      'Limpar Todos',
      'Limpar Só os Pegos',
      () => { cart = []; saveCartData(); renderCartUI(); showAppToast('Carrinho limpo!', 'info'); },
      () => { cart = cart.filter(it => !it.checked); saveCartData(); renderCartUI(); showAppToast('Itens pegos removidos!', 'info'); }
    );
  } else {
    if (confirm('Deseja limpar todos os itens do carrinho?')) {
      cart = [];
      saveCartData();
      renderCartUI();
      showAppToast('Carrinho limpo!', 'info');
    }
  }
}
window.askClearCart = askClearCart;

function askFinishPurchase() {
  if ((cart || []).length === 0) return;
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
window.askFinishPurchase = askFinishPurchase;

// 7. FINALIZAÇÃO DA COMPRA
function executeFinishPurchase(clearAfter) {
  let gT = 0;
  let tS = 0;

  const itensSnapshot = cart.map(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    gT += calc.finalSubtotal;
    tS += calc.savings;

    const unitPrice = Number(item.unitPrice) || 0;
    const marca = (item.selectedBrandId || 'Padrão').trim();

    let masterProd = (products || []).find(p => 
      (item.productId && p.id === item.productId) || 
      p.name.toLowerCase() === item.name.toLowerCase()
    );

    if (masterProd) {
      if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
        if (!masterProd.marketPrices) masterProd.marketPrices = {};
        if (unitPrice > 0) masterProd.marketPrices[activeMarketId] = unitPrice;
      } else {
        if (!Array.isArray(masterProd.brands)) masterProd.brands = [];
        let bObj = masterProd.brands.find(b => (b.name || b.id || '').toLowerCase() === marca.toLowerCase());
        if (!bObj) {
          bObj = { id: marca, name: marca, marketPrices: {} };
          masterProd.brands.push(bObj);
        }
        if (unitPrice > 0) {
          if (!bObj.marketPrices) bObj.marketPrices = {};
          bObj.marketPrices[activeMarketId] = unitPrice;
        }
      }

      if (unitPrice > 0 && typeof enviarProdutoParaPlanilha === 'function') {
        enviarProdutoParaPlanilha(masterProd, activeMarketId, unitPrice, marca);
      }
    }

    return {
      productId: item.productId || (masterProd ? masterProd.id : null),
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

  if (!Array.isArray(purchaseHistory)) purchaseHistory = [];
  purchaseHistory.unshift(novaCompra);

  if (clearAfter) cart = [];
  else cart.forEach(it => it.checked = false);

  saveAllLocalData();
  saveCartData();

  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  if (typeof renderHistoricoUI === 'function') renderHistoricoUI();

  if (typeof playAppBeep === 'function') playAppBeep('finish');
  showAppToast('Compra finalizada! Preços e marcas consolidados no catálogo.', 'success');
}
window.executeFinishPurchase = executeFinishPurchase;

// 8. EVENTOS DE ENTRADA DO FORMULÁRIO PRINCIPAL
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
            <span class="font-bold text-slate-800 block truncate">${esc(p.name)}</span>
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${esc(p.category || 'Geral')}</span>
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

// Inicialização
function higienizarInputsCarrinho() {
  const pInput = document.getElementById('cartInputUnitPrice');
  if (pInput) {
    pInput.addEventListener('blur', (e) => {
      const val = parseNumberInput(e.target.value);
      if (val > 0) e.target.value = formatBRL(val);
    });
  }
}

if (typeof higienizarInputsCarrinho === 'function') {
  higienizarInputsCarrinho();
}

if (typeof setCartPromoMode === 'function') {
  setCartPromoMode('none');
}
async function compartilharCarrinhoWhatsApp() {
  if (!cart || cart.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('O carrinho está vazio!', 'warning');
    return;
  }

  // 1. Aguarda a resolução da promessa com await
  const payloadCompacto = await serializarCarrinhoParaQR();
  const baseUrl = window.location.origin + window.location.pathname;
  const linkImportacao = `${baseUrl}#import=${encodeURIComponent(payloadCompacto)}`;

  // 2. Monta o texto legível para o WhatsApp
  let texto = `🛒 *Lista de Compras (${cart.length} itens)*\n\n`;

  let totalEstimado = 0;
  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    totalEstimado += calc.finalSubtotal;
    const marca = item.selectedBrandId && item.selectedBrandId !== 'Padrão' ? ` (${item.selectedBrandId})` : '';
    texto += `• ${item.quantity} ${item.unit || 'un'} × *${item.name}*${marca}\n`;
  });

  texto += `\n💰 *Total estimado:* R$ ${formatBRL(totalEstimado)}\n\n`;
  texto += `📲 *Para abrir e controlar no SuperCompras, toque no link:*\n${linkImportacao}`;

  // 3. Abre no WhatsApp
  const urlWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  window.open(urlWhatsapp, '_blank');
}
window.compartilharCarrinhoWhatsApp = compartilharCarrinhoWhatsApp;

// 1. FUNÇÃO AUXILIAR: CALCULA O PREÇO REAL DO PRODUTO POR SUPERMERCADO
function obterPrecoItemMercado(itemCarrinho, mercadoId) {
  const nomeItem = (itemCarrinho.name || itemCarrinho.nome || '').trim().toLowerCase();
  const idItem = itemCarrinho.productId || itemCarrinho.id;

  const prod = (typeof products !== 'undefined' && Array.isArray(products))
    ? products.find(p => (idItem && p.id === idItem) || (p.name && p.name.trim().toLowerCase() === nomeItem))
    : null;

  if (!prod) return Number(itemCarrinho.unitPrice || itemCarrinho.price || itemCarrinho.basePrice || 0);

  const marcaNome = (itemCarrinho.selectedBrandId || itemCarrinho.brand || itemCarrinho.marca || 'Padrão').trim().toLowerCase();

  if (Array.isArray(prod.brands)) {
    const bObj = prod.brands.find(b => (b.name || b.id || '').trim().toLowerCase() === marcaNome);
    if (bObj && bObj.marketPrices && bObj.marketPrices[mercadoId] && Number(bObj.marketPrices[mercadoId]) > 0) {
      return Number(bObj.marketPrices[mercadoId]);
    }
  }

  if (prod.marketPrices && prod.marketPrices[mercadoId] && Number(prod.marketPrices[mercadoId]) > 0) {
    return Number(prod.marketPrices[mercadoId]);
  }

  return Number(prod.basePrice || itemCarrinho.basePrice || itemCarrinho.price || 0);
}
window.obterPrecoItemMercado = obterPrecoItemMercado;

// 2. ATUALIZAÇÃO DO INDICADOR DISCRETO EM SVG NO CABEÇALHO
function analisarMelhorMercado() {
  const btn = document.getElementById('btnComparativoMercadosRapido');
  const boxAntigo = document.getElementById('cartBestMarketRecommendation');

  if (boxAntigo) {
    boxAntigo.innerHTML = '';
    boxAntigo.classList.add('hidden');
  }

  if (!btn || !Array.isArray(cart) || cart.length === 0) {
    if (btn) btn.classList.add('hidden');
    return;
  }

  const listaMercados = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets))
    ? supermarkets.filter(m => m && m.id && m.id !== 'm-padrao')
    : [];

  if (listaMercados.length === 0) {
    btn.classList.add('hidden');
    return;
  }

  let totalAtual = 0;
  cart.forEach(item => {
    totalAtual += obterPrecoItemMercado(item, activeMarketId) * Number(item.quantity || item.quantidade || 1);
  });

  let melhorMercado = null;
  let menorTotal = totalAtual;

  listaMercados.forEach(mercado => {
    if (mercado.id === activeMarketId) return;

    let somaMercado = 0;
    cart.forEach(item => {
      somaMercado += obterPrecoItemMercado(item, mercado.id) * Number(item.quantity || item.quantidade || 1);
    });

    if (somaMercado > 0 && (totalAtual - somaMercado) >= 0.20 && somaMercado < menorTotal) {
      menorTotal = somaMercado;
      melhorMercado = mercado;
    }
  });

  // Fixa o botão com altura e largura equivalentes aos outros botões do topo
  btn.className = "w-8 h-8 rounded-xl border transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs";

  if (melhorMercado) {
    const diff = (totalAtual - menorTotal).toFixed(2).replace('.', ',');
    btn.classList.add('bg-amber-500/15', 'border-amber-500/40', 'hover:bg-amber-500/25');
    btn.setAttribute('title', `Economia de R$ ${diff} noutro supermercado. Toque para comparar.`);
    btn.innerHTML = `
      <svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
      </svg>
    `;
  } else {
    btn.classList.add('bg-emerald-500/10', 'border-emerald-500/30', 'hover:bg-emerald-500/20');
    btn.setAttribute('title', 'Este supermercado é a opção mais económica para a sua lista.');
    btn.innerHTML = `
      <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
      </svg>
    `;
  }

  btn.classList.remove('hidden');
}
window.analisarMelhorMercado = analisarMelhorMercado;

// 3. GUIA FLUTUANTE COM O COMPARATIVO GERAL
window.abrirGuiaComparativoMercados = function() {
  const modal = document.getElementById('modalComparativoMercadosLista');
  const container = document.getElementById('listaComparativoMercadosContainer');
  if (!modal || !container) return;

  const listaMercados = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets))
    ? supermarkets.filter(m => m && m.id && m.id !== 'm-padrao')
    : [];

  let totalAtual = 0;
  cart.forEach(item => {
    totalAtual += obterPrecoItemMercado(item, activeMarketId) * Number(item.quantity || item.quantidade || 1);
  });

  const comparativos = listaMercados.map(mercado => {
    let totalMercado = 0;
    cart.forEach(item => {
      totalMercado += obterPrecoItemMercado(item, mercado.id) * Number(item.quantity || item.quantidade || 1);
    });
    return {
      id: mercado.id,
      name: mercado.name,
      total: totalMercado,
      diff: totalMercado - totalAtual,
      isAtivo: mercado.id === activeMarketId
    };
  }).sort((a, b) => a.total - b.total);

  container.innerHTML = comparativos.map(comp => {
    let statusClass = "text-slate-500 border-slate-200 dark:border-slate-700";
    let diffBadge = "";

    if (comp.isAtivo) {
      statusClass = "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20";
      diffBadge = `<span class="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">Ativo</span>`;
    } else if (comp.diff < -0.10) {
      statusClass = "border-amber-400/80 bg-amber-50/40 dark:bg-amber-950/20";
      diffBadge = `<span class="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">- R$ ${Math.abs(comp.diff).toFixed(2).replace('.', ',')}</span>`;
    } else if (comp.diff > 0.10) {
      diffBadge = `<span class="text-[9px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">+ R$ ${comp.diff.toFixed(2).replace('.', ',')}</span>`;
    }

    return `
      <div class="p-2.5 rounded-xl border flex items-center justify-between gap-2 ${statusClass}">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 truncate">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${comp.name}</span>
            ${diffBadge}
          </div>
          <p class="text-[11px] font-black text-slate-700 dark:text-slate-300 mt-0.5">Total: R$ ${comp.total.toFixed(2).replace('.', ',')}</p>
        </div>
        ${!comp.isAtivo ? `
          <button type="button" 
                  onclick="trocarMercadoPelaGuia('${comp.id}')" 
                  class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer">
            Mudar
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
};

window.fecharGuiaComparativoMercados = function() {
  const modal = document.getElementById('modalComparativoMercadosLista');
  if (modal) modal.classList.add('hidden');
};

window.trocarMercadoPelaGuia = function(idMercado) {
  fecharGuiaComparativoMercados();
  activeMarketId = idMercado;
  const sel = document.getElementById('selectActiveMarket');
  if (sel) sel.value = idMercado;
  if (typeof saveAllLocalData === 'function') saveAllLocalData();
  if (typeof renderCartUI === 'function') renderCartUI();
  if (typeof showAppToast === 'function') {
    showAppToast('Supermercado alterado!', 'success');
  }
};