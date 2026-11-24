/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CARRINHO: MODAL DE EDIÇÃO DE UM ITEM (js/telas/carrinho/edicao.js)
 */

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { openEditCartItemModal, atualizarAtalhosEdicao, closeEditCartItemModal, setEditPromoType, setEditQty, confirmarNovaMarcaModalEdicao, cancelarNovaMarcaModalEdicao, getEditFormPromoConfig, atualizarSubtotalModalEdicao, salvarEdicaoItemCarrinho });

// 4. MODAL DE EDIÇÃO DE ITEM DO CARRINHO (COMPATIBILIZADO)
let editingCartItemId = null;
let currentEditPromoMode = 'none';

export function openEditCartItemModal(id) {
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
      <option value="${esc(m)}" ${m.toLowerCase() === (item.selectedBrandId || 'Padrão').toLowerCase() ? 'selected' : ''}>🏷️ ${esc(m)}</option>
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

  const selectUnit = document.getElementById('editCartItemUnit');
  if (selectUnit) selectUnit.innerHTML = opcoesUnidadeHtml(item.unit || 'un');
  atualizarAtalhosEdicao(item.unit || 'un');

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

// Atalhos de quantidade do modal conforme a unidade: 250g/500g/1kg para peso, 1/2/3/6/12 para o resto.
export function atualizarAtalhosEdicao(unidade) {
  const peso = ehUnidadeDePeso(unidade);
  document.querySelectorAll('#editCartItemAtalhos [data-atalho]').forEach(btn => {
    btn.classList.toggle('hidden', (btn.dataset.atalho === 'peso') !== peso);
  });
}

export function closeEditCartItemModal() {
  const modal = document.getElementById('modalEditCartItem');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  editingCartItemId = null;
}

export function setEditPromoType(mode) {
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

export function setEditQty(val) {
  const qInput = document.getElementById('editCartItemQty');
  if (qInput) {
    qInput.value = val;
    atualizarSubtotalModalEdicao();
  }
}

export function confirmarNovaMarcaModalEdicao() {
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

export function cancelarNovaMarcaModalEdicao() {
  document.getElementById('boxEditMarcaInline')?.classList.add('hidden');
  document.getElementById('boxEditMarcaSelect')?.classList.remove('hidden');
  const select = document.getElementById('editCartItemBrand');
  if (select && select.value === '__NOVA__') {
    select.value = 'Padrão';
  }
}

export function getEditFormPromoConfig() {
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

export function atualizarSubtotalModalEdicao() {
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

export function salvarEdicaoItemCarrinho() {
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
  const novaUnidade = (document.getElementById('editCartItemUnit')?.value || '').trim() || item.unit || 'un';

  // Aplica as atualizações completas no item
  item.name = novoNome;
  item.selectedBrandId = novaMarca;
  item.unit = novaUnidade;
  item.unitPrice = novoPreco;
  item.quantity = novaQtd;
  item.promo = novaPromo;

  saveCartData();
  renderCartUI();
  closeEditCartItemModal();
  showAppToast(`"${item.name}" atualizado!`, 'success');
}
