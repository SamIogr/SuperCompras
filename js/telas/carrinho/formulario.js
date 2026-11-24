/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CARRINHO: FORMULÁRIO DE ADICIONAR ITEM (GAVETA, MARCA, PROMOÇÃO, SUGESTÕES) (js/telas/carrinho/formulario.js)
 */

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { setCartPromoMode, getCartFormPromoConfig, updateCartItemPreview, setCartQuickQty, atualizarSelectMarcasInline, aoMudarSelectMarcaInline, confirmarNovaMarcaInline, cancelarNovaMarcaInline, sincronizarPrecoFormularioCarrinho, selectProductForCart, atualizarAtalhosQuantidade, abrirSheetAdicionarItem, fecharSheetAdicionarItem, higienizarInputsCarrinho });

// Estado local da condição comercial do formulário
let currentCartPromoMode = 'none';

// 2. CONDIÇÃO COMERCIAL NO FORMULÁRIO PRINCIPAL
export function setCartPromoMode(mode) {
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

export function getCartFormPromoConfig() {
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

export function updateCartItemPreview() {
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

export function setCartQuickQty(val) {
  const qInput = document.getElementById('cartInputQuantity');
  if (qInput) {
    qInput.value = val;
    updateCartItemPreview();
  }
}

// 4. GESTÃO DE MARCAS INLINE
export function atualizarSelectMarcasInline(nomeProduto, marcaSelecionada = 'Padrão') {
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
}

// Troca de marca no formulário (select #cartSelectProductBrand).
// "+ Nova marca..." mostra o campo para digitar; outra marca atualiza o preço sugerido.
export function aoMudarSelectMarcaInline(valor) {
  if (valor === '__NOVA__') {
    document.getElementById('boxSelectMarca')?.classList.add('hidden');
    const boxInput = document.getElementById('boxInputNovaMarcaInline');
    if (boxInput) boxInput.classList.remove('hidden');
    const input = document.getElementById('inputNovaMarcaInline');
    if (input) { input.value = ''; input.focus(); }
  } else {
    const inputHidden = document.getElementById('cartInputProductBrand');
    if (inputHidden) inputHidden.value = valor;
    sincronizarPrecoFormularioCarrinho();
  }
}

export function confirmarNovaMarcaInline() {
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

export function cancelarNovaMarcaInline() {
  document.getElementById('boxInputNovaMarcaInline')?.classList.add('hidden');
  document.getElementById('boxSelectMarca')?.classList.remove('hidden');
  const nomeProd = document.getElementById('cartInputProductName')?.value || '';
  atualizarSelectMarcasInline(nomeProd, 'Padrão');
}

export function sincronizarPrecoFormularioCarrinho() {
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

export function selectProductForCart(productId) {
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

// ATALHOS DINÂMICOS CONFORME A UNIDADE (PESO VS QUANTIDADE UNITÁRIA)
export function atualizarAtalhosQuantidade() {
  const selUnit = document.getElementById('cartInputUnit');
  const box = document.getElementById('containerAtalhosQtd');
  if (!selUnit || !box) return;

  const unit = (selUnit.value || '').trim().toLowerCase();
  const isPeso = ehUnidadeDePeso(unit);

  if (isPeso) {
    box.innerHTML = `
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="0.250" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 cursor-pointer">250g</button>
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="0.500" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 cursor-pointer">500g</button>
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="1.000" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 cursor-pointer">1 kg</button>
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="1.500" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 cursor-pointer">1,5 kg</button>
    `;
  } else {
    box.innerHTML = `
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="1" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">1</button>
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="2" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">2</button>
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="3" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">3</button>
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="6" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">6</button>
      <button type="button" data-acao="carrinho-qtd-rapida" data-qtd="12" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">12</button>
    `;
  }
}

export function abrirSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  if (container && backdrop) {
    backdrop.classList.remove('hidden');
    container.classList.remove('hidden');
    atualizarAtalhosQuantidade();
    setTimeout(() => document.getElementById('cartInputProductName')?.focus(), 100);
  }
}

export function fecharSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  if (container && backdrop) {
    container.classList.add('hidden');
    backdrop.classList.add('hidden');
  }
}

// 8. EVENTOS DE ENTRADA DO FORMULÁRIO PRINCIPAL
document.addEventListener('change', (e) => {
  if (e.target && (e.target.id === 'selectActiveMarket' || e.target.id === 'cartSelectSupermarket')) {
    recalcularPrecosCarrinhoPorMercado(e.target.value);
  }
});

export const inputBuscaCarrinho = document.getElementById('cartSearchFilter');
inputBuscaCarrinho?.addEventListener('input', () => {
  renderCartUI();
});

export const inputProdName = document.getElementById('cartInputProductName');
export const dropdownProd = document.getElementById('cartAutocompleteDropdown');
export const btnClearProd = document.getElementById('cartBtnClearProduct');

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
        <button type="button" data-acao="carrinho-sugestoes-fechar" class="text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded">✕</button>
      </div>
    ` + matches.map(p => {
      const pPrice = obterPrecoProdutoMarcaMercado(p, 'Padrão', activeMarketId) || p.basePrice;
      return `
        <div class="px-3.5 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer flex items-center justify-between text-xs transition-colors" data-acao="sugestao-escolher" data-id="${esc(p.id)}">
          <div class="min-w-0 pr-2">
            <span class="font-bold text-slate-800 block truncate">${esc(p.name)}</span>
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${esc(p.category || 'Geral')}</span>
          </div>
          <div class="text-right text-emerald-700 font-black shrink-0">
            ${pPrice > 0 ? 'R$ ' + formatBRL(pPrice) : 'A cotar'}
            <span class="text-[10px] text-slate-500 font-normal"> / ${esc(p.unit || 'un')}</span>
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
      id: novoId('p-custom-'),
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
    id: novoId('c-item-'),
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
export function higienizarInputsCarrinho() {
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

// ----- PONTE DA TRANSIÇÃO (etapa 4): constantes e classes (só existem depois de declaradas) -----
Object.assign(window, { inputBuscaCarrinho, inputProdName, dropdownProd, btnClearProd });
