/**
 * SUPERCOMPRAS PRO - CARRINHO DE COMPRAS (js/cart.js)
 * Gestão de itens, descontos, atacado, atalhos e consolidação de marcas ao finalizar.
 */

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

// 2. CONDIÇÃO COMERCIAL NO FORMULÁRIO PRINCIPAL (ADICIONAR PRODUTO)
let currentCartPromoMode = 'none';

window.setCartPromoMode = function(mode) {
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

window.updateCartItemPreview = function() {
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
};

window.setCartQuickQty = function(val) {
  const qInput = document.getElementById('cartInputQuantity');
  if (qInput) {
    qInput.value = val;
    updateCartItemPreview();
  }
};

// 3. GESTÃO DE MARCAS INLINE NO FORMULÁRIO PRINCIPAL (SEM CRIAR NO BANCO MESTRE)
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
    <option value="${esc(m)}" ${m.toLowerCase() === (marcaSelecionada || 'Padrão').toLowerCase() ? 'selected' : ''}>🏷️ ${esc(m)}</option>  `).join('') + `<option value="__NOVA__">+ Nova marca...</option>`;

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

window.confirmarNovaMarcaInline = function() {
  const input = document.getElementById('inputNovaMarcaInline');
  const nomeMarca = (input?.value || '').trim();

  if (!nomeMarca) {
    window.cancelarNovaMarcaInline();
    return;
  }

  const nomeProd = document.getElementById('cartInputProductName')?.value || '';
  atualizarSelectMarcasInline(nomeProd, nomeMarca);

  document.getElementById('boxInputNovaMarcaInline')?.classList.add('hidden');
  document.getElementById('boxSelectMarca')?.classList.remove('hidden');
  document.getElementById('cartInputUnitPrice')?.focus();
  updateCartItemPreview();
};

window.cancelarNovaMarcaInline = function() {
  document.getElementById('boxInputNovaMarcaInline')?.classList.add('hidden');
  document.getElementById('boxSelectMarca')?.classList.remove('hidden');
  const nomeProd = document.getElementById('cartInputProductName')?.value || '';
  atualizarSelectMarcasInline(nomeProd, 'Padrão');
};


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
      if (novo > 0) item.unitPrice = novo;   // só atualiza se houver cotação
    }
  });

  saveAllLocalData();
  saveCartData();
  if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
  renderCartUI();
}
window.recalcularPrecosCarrinhoPorMercado = recalcularPrecosCarrinhoPorMercado;


// 5. MODAL DE EDIÇÃO DE ITEM DO CARRINHO (COMPLETAMENTE FUNCIONAL)
let editingCartItemId = null;
let currentEditPromoMode = 'none';

window.openEditCartItemModal = function(id) {
  editingCartItemId = id;
  const item = (cart || []).find(x => x.id === id);
  if (!item) return;

  const modal = document.getElementById('modalEditCartItem');
  if (!modal) return;

  const titleEl = document.getElementById('editCartItemTitle');
  if (titleEl) titleEl.innerText = item.name;

  // Carrega opções de marcas existentes (sem poluir o catálogo mestre)
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
        document.getElementById('boxEditMarcaActions')?.classList.add('hidden');
        const boxInput = document.getElementById('boxEditMarcaInline');
        if (boxInput) boxInput.classList.remove('hidden');
        const input = document.getElementById('inputEditNovaMarca');
        if (input) { input.value = ''; input.focus(); }
      }
    };
  }

  document.getElementById('boxEditMarcaInline')?.classList.add('hidden');
  document.getElementById('boxEditMarcaSelect')?.classList.remove('hidden');
  document.getElementById('boxEditMarcaConfirmDelete')?.classList.add('hidden');

  const inputPrice = document.getElementById('editCartItemPrice');
  const inputQty = document.getElementById('editCartItemQty');

  if (inputPrice) inputPrice.value = item.unitPrice > 0 ? formatBRL(item.unitPrice) : '';
  if (inputQty) inputQty.value = item.quantity || 1;

  // Carrega condição comercial existente no item
  const promo = item.promo || { type: 'none' };
  currentEditPromoMode = promo.type || 'none';

  const discMode = document.getElementById('editPromoDiscountMode');
  const discVal = document.getElementById('editPromoDiscountValue');
  const wholMin = document.getElementById('editPromoWholesaleMinQty');
  const wholPrice = document.getElementById('editPromoWholesalePrice');

  if (discMode) discMode.value = (promo.mode === 'fixed') ? 'fixed' : 'percentage';
  if (discVal) discVal.value = (promo.type === 'discount' && promo.value > 0) ? promo.value : '';
  if (wholMin) wholMin.value = (promo.type === 'wholesale' && promo.minQty > 0) ? promo.minQty : 3;
  if (wholPrice) wholPrice.value = (promo.type === 'wholesale' && promo.wholesalePrice > 0) ? formatBRL(promo.wholesalePrice) : '';

  window.setEditPromoType(currentEditPromoMode);

  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  window.atualizarSubtotalModalEdicao();
};

window.closeEditCartItemModal = function() {
  const modal = document.getElementById('modalEditCartItem');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  editingCartItemId = null;
};

// Alternância de condição comercial no modal de edição
window.setEditPromoType = function(mode) {
  currentEditPromoMode = mode;

  const btnNone = document.getElementById('btnEditPromoNone');
  const btnDisc = document.getElementById('btnEditPromoDiscount');
  const btnWhol = document.getElementById('btnEditPromoWholesale');

  const panelDisc = document.getElementById('panelEditPromoDiscount');
  const panelWhol = document.getElementById('panelEditPromoWholesale');

  [btnNone, btnDisc, btnWhol].forEach(b => {
    if (b) b.className = 'py-1.5 rounded-lg text-center transition-all text-slate-600 hover:text-slate-900 font-bold';
  });

  if (panelDisc) panelDisc.classList.add('hidden');
  if (panelWhol) panelWhol.classList.add('hidden');

  if (mode === 'discount') {
    if (btnDisc) btnDisc.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelDisc) panelDisc.classList.remove('hidden');
    document.getElementById('editPromoDiscountValue')?.focus();
  } else if (mode === 'wholesale') {
    if (btnWhol) btnWhol.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelWhol) panelWhol.classList.remove('hidden');
    document.getElementById('editPromoWholesalePrice')?.focus();
  } else {
    if (btnNone) btnNone.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
  }

  window.atualizarSubtotalModalEdicao();
};

window.setEditQty = function(val) {
  const qInput = document.getElementById('editCartItemQty');
  if (qInput) {
    qInput.value = val;
    window.atualizarSubtotalModalEdicao();
  }
};

window.confirmarNovaMarcaModalEdicao = function() {
  const input = document.getElementById('inputEditNovaMarca');
  const novaMarca = (input?.value || '').trim();

  if (!novaMarca) {
    window.cancelarNovaMarcaModalEdicao();
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
};

window.cancelarNovaMarcaModalEdicao = function() {
  document.getElementById('boxEditMarcaInline')?.classList.add('hidden');
  document.getElementById('boxEditMarcaSelect')?.classList.remove('hidden');
  const select = document.getElementById('editCartItemBrand');
  if (select && select.value === '__NOVA__') {
    select.value = 'Padrão';
  }
};

function getEditFormPromoConfig() {
  if (currentEditPromoMode === 'discount') {
    const modeVal = document.getElementById('editPromoDiscountMode')?.value || 'percentage';
    return {
      type: 'discount',
      mode: (modeVal === 'fixed') ? 'fixed' : 'percent',
      value: parseNumberInput(document.getElementById('editPromoDiscountValue')?.value) || 0
    };
  }
  if (currentEditPromoMode === 'wholesale') {
    return {
      type: 'wholesale',
      minQty: parseNumberInput(document.getElementById('editPromoWholesaleMinQty')?.value) || 1,
      wholesalePrice: parseNumberInput(document.getElementById('editPromoWholesalePrice')?.value) || 0
    };
  }
  return { type: 'none' };
}

window.atualizarSubtotalModalEdicao = function() {
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
};

window.salvarEdicaoItemCarrinho = function() {
  if (!editingCartItemId) {
    window.closeEditCartItemModal();
    return;
  }

  const item = (cart || []).find(x => x.id === editingCartItemId);
  if (!item) {
    window.closeEditCartItemModal();
    return;
  }

  const selectBrand = document.getElementById('editCartItemBrand');
  const inputPrice = document.getElementById('editCartItemPrice');
  const inputQty = document.getElementById('editCartItemQty');

  const novaMarca = (selectBrand?.value && selectBrand.value !== '__NOVA__') ? selectBrand.value : (item.selectedBrandId || 'Padrão');
  const novoPreco = parseNumberInput(inputPrice?.value) || 0;
  const novaQtd = parseNumberInput(inputQty?.value) || 1;
  const novaPromo = getEditFormPromoConfig();

  // Atribuição EXCLUSIVA ao item do carrinho (não mexe em products nem grava marca no catálogo agora)
  item.selectedBrandId = novaMarca;
  item.unitPrice = novoPreco;
  item.quantity = novaQtd;
  item.promo = novaPromo;

  saveCartData();
  renderCartUI();
  window.closeEditCartItemModal();
  showAppToast(`"${item.name}" atualizado!`, 'success');
};

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
  if ((cart || []).length === 0) return;
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

// 7. FINALIZAÇÃO DA COMPRA: ONDE AS MARCAS E PREÇOS SÃO EFETIVAMENTE CRIADOS NO BANCO DO APP
function executeFinishPurchase(clearAfter) {
  let gT = 0;
  let tS = 0;

  const itensSnapshot = cart.map(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    gT += calc.finalSubtotal;
    tS += calc.savings;

    const unitPrice = Number(item.unitPrice) || 0;
    const marca = (item.selectedBrandId || 'Padrão').trim();

    // REGRA DE CONSOLIDAÇÃO: cria e sincroniza a marca no catálogo MESTRE do aplicativo
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

      // Sincroniza em segundo plano com a planilha caso haja token
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

  // Se for um produto novo no app, cadastra o básico no catálogo mestre
  if (!masterProd) {
    masterProd = {
      id: 'p-custom-' + Date.now(),
      name: name,
      category: 'Geral',
      unit: unit,
      basePrice: unitPrice > 0 ? unitPrice : 0,
      marketPrices: {},
      brands: [] // A marca não é salva no catálogo aqui!
    };
    if (!Array.isArray(products)) products = [];
    products.unshift(masterProd);
    saveAllLocalData();
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
  }

  // A nova marca fica vinculada APENAS ao item do carrinho
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
// Inicialização segura com proteção contra ReferenceError
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
setCartPromoMode('none');