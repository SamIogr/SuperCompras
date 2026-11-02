/**
 * SUPERCOMPRAS PRO - CARRINHO, COTAÇÕES E SELEÇÃO DE MARCAS
 * Renderização delegada integralmente ao AppTemplates.
 */

window.atualizarPrecoUnificado = function(produtoIdOuNome, marcaAlvo, mercadoId, novoPreco) {
  if (!produtoIdOuNome || !mercadoId) return;

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
      basePrice: preco > 0 ? preco : 0,
      marketPrices: {},
      brands: []
    };
    if (!Array.isArray(products)) products = [];
    products.unshift(masterProd);
  }

  if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
    if (!masterProd.marketPrices) masterProd.marketPrices = {};
    masterProd.marketPrices[mercadoId] = preco;
  } else {
    if (!masterProd.brands) masterProd.brands = [];
    let bObj = masterProd.brands.find(b => (b.name || b.id || '').toLowerCase() === marca.toLowerCase());
    if (!bObj) {
      bObj = { id: marca, name: marca, marketPrices: {} };
      masterProd.brands.push(bObj);
    }
    if (!bObj.marketPrices) bObj.marketPrices = {};
    bObj.marketPrices[mercadoId] = preco;
  }

  if (Array.isArray(cart)) {
    cart.forEach(item => {
      const matchProd = (item.productId && item.productId === masterProd.id) || 
                        (item.name && item.name.toLowerCase() === masterProd.name.toLowerCase());
      const matchMarca = (item.selectedBrandId || 'Padrão').toLowerCase() === marca.toLowerCase();

      if (matchProd && matchMarca) {
        if (!item.productId) item.productId = masterProd.id;
        if (mercadoId === activeMarketId) {
          item.unitPrice = preco;
        }
      }
    });
  }

  saveAllLocalData();
  saveCartData();

  if (typeof renderCartUI === 'function') renderCartUI();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderPriceCompareTable === 'function' && typeof activeCatalogProductId !== 'undefined') {
    renderPriceCompareTable(masterProd);
  }

  if (activeMarketId !== 'm-padrao' && preco > 0 && typeof enviarProdutoParaPlanilha === 'function') {
    enviarProdutoParaPlanilha(masterProd, mercadoId, preco, marca);
  }
};

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
      savings = qty * Math.min(val, unitPrice);
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
    if (el && (el.placeholder === 'null' || el.placeholder === 'undefined')) {
      el.placeholder = (id === 'cartSearchFilter') ? 'Buscar no carrinho...' : 'Digite para buscar...';
    }
  });
}

function atualizarSelectMarcasInline(nomeProduto, marcaSelecionada = 'Padrão') {
  const container = document.getElementById('containerMarcaInline');
  const select = document.getElementById('cartSelectProductBrand');
  const inputHidden = document.getElementById('cartInputProductBrand');

  if (!select) return;

  if (container) {
    if (nomeProduto && nomeProduto.trim().length > 0) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
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

function confirmarNovaMarcaInline() {
  const campo = document.getElementById('inputNovaMarcaInline');
  const select = document.getElementById('cartSelectProductBrand');
  const inputHidden = document.getElementById('cartInputProductBrand');
  const boxSelect = document.getElementById('boxSelectMarca');
  const boxInput = document.getElementById('boxInputNovaMarcaInline');

  const novaMarca = (campo?.value || '').trim();

  if (novaMarca) {
    let opt = Array.from(select.options).find(o => o.value.toLowerCase() === novaMarca.toLowerCase());
    if (!opt) {
      opt = document.createElement('option');
      opt.value = novaMarca;
      opt.textContent = `🏷️ ${novaMarca}`;
      select.insertBefore(opt, select.lastElementChild);
    }
    opt.selected = true;
    if (inputHidden) inputHidden.value = novaMarca;
  } else {
    if (select && inputHidden) select.value = inputHidden.value || 'Padrão';
  }

  boxInput?.classList.add('hidden');
  boxSelect?.classList.remove('hidden');
  sincronizarPrecoFormularioCarrinho();
}

function cancelarNovaMarcaInline() {
  document.getElementById('boxInputNovaMarcaInline')?.classList.add('hidden');
  document.getElementById('boxSelectMarca')?.classList.remove('hidden');
  const select = document.getElementById('cartSelectProductBrand');
  const inputHidden = document.getElementById('cartInputProductBrand');
  if (select && inputHidden) {
    select.value = inputHidden.value || 'Padrão';
  }
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
    document.getElementById('cartInputQuantity')?.select();
    updateCartItemPreview();
  }
  sincronizarPrecoFormularioCarrinho();
}

function obterPrecoProdutoMarcaMercado(produto, marcaNome, mercadoId) {
  if (!produto || !mercadoId) return 0;

  const mId = mercadoId;
  const marca = (marcaNome || 'Padrão').trim().toLowerCase();

  if (marca === 'padrão' || marca === 'padrao') {
    if (produto.marketPrices && produto.marketPrices[mId] !== undefined && Number(produto.marketPrices[mId]) > 0) {
      return Number(produto.marketPrices[mId]);
    }
    return 0;
  }

  if (Array.isArray(produto.brands)) {
    const bObj = produto.brands.find(b => (b.name || b.id || '').toLowerCase() === marca);
    if (bObj && bObj.marketPrices && bObj.marketPrices[mId] !== undefined && Number(bObj.marketPrices[mId]) > 0) {
      return Number(bObj.marketPrices[mId]);
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

  if (typeof updateCartItemPreview === 'function') {
    updateCartItemPreview();
  }
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
  if (typeof sincronizarPrecoFormularioCarrinho === 'function') sincronizarPrecoFormularioCarrinho();
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
      container.innerHTML = AppTemplates.emptyState('Nenhum produto encontrado neste filtro.');
    } else {
      // Delegação de cada cartão ao AppTemplates
      container.innerHTML = displayList.map(item => {
        const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
        return AppTemplates.cartItemCard(item, calc);
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
  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    gT += calc.finalSubtotal;
    tS += calc.savings;
    let p = (products || []).find(prod => prod.name.toLowerCase() === item.name.toLowerCase());
    if (p && activeMarketId !== 'm-padrao') {
      if (!p.marketPrices) p.marketPrices = {};
      p.marketPrices[activeMarketId] = item.unitPrice;
      enviarProdutoParaPlanilha(p, activeMarketId, item.unitPrice, item.selectedBrandId || 'Padrão');
    }
  });

  purchaseHistory.unshift({
    id: 'pur-' + Date.now(),
    date: new Date().toISOString(),
    marketId: activeMarketId,
    marketName: getSelectedMarketName(),
    total: gT,
    savings: tS,
    itemCount: cart.length,
    items: JSON.parse(JSON.stringify(cart))
  });

  if (clearAfter) cart = [];
  else cart.forEach(it => it.checked = false);

  saveAllLocalData();
  saveCartData();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  playAppBeep('finish');
  showAppToast('Compra concluída e preços gravados!', 'success');
}

document.addEventListener('change', (e) => {
  if (e.target && (e.target.id === 'selectActiveMarket' || e.target.id === 'cartSelectSupermarket')) {
    recalcularPrecosCarrinhoPorMercado(e.target.value);
  }

  if (e.target && e.target.id === 'cartSelectProductBrand') {
    const val = e.target.value;
    const hiddenInput = document.getElementById('cartInputProductBrand');

    if (val === '__NOVA__') {
      document.getElementById('boxSelectMarca')?.classList.add('hidden');
      document.getElementById('boxInputNovaMarcaInline')?.classList.remove('hidden');
      const campo = document.getElementById('inputNovaMarcaInline');
      if (campo) { campo.value = ''; campo.focus(); }
      return;
    }

    if (hiddenInput) hiddenInput.value = val;
    sincronizarPrecoFormularioCarrinho();
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
      return AppTemplates.cartAutocompleteRow(p, pPrice);
    }).join('');
    dropdownProd.classList.remove('hidden');
  } else if (dropdownProd) {
    dropdownProd.classList.add('hidden');
    dropdownProd.innerHTML = '';
  }
});

function fecharDropdownSugestoes() {
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  const input = document.getElementById('cartInputProductName');
  if (!dropdown || !input) return;

  if (!input.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

['cartInputUnitPrice', 'cartInputQuantity', 'cartInputUnit'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('focus', fecharDropdownSugestoes);
    el.addEventListener('click', fecharDropdownSugestoes);
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