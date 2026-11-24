/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CARRINHO: LISTA, FILTROS, TOTAIS E AÇÕES RÁPIDAS DOS ITENS (js/telas/carrinho/lista.js)
 */

import { formatBRL, saveAllLocalData, saveCartData } from '../../state.js';
import { computeItemFinancials } from '../../calculo.js';
import { AppTemplates } from '../../ui/templates-base.js';
import { playAppBeep, refreshActiveMarketUI, showAppToast } from '../../ui.js';
import { renderCartUI } from './cards.js';
import { obterPrecoProdutoMarcaMercado } from '../catalogo/precos.js';

// 3. FILTRAGEM DO CARRINHO (TODOS, NO CORREDOR, NO CARRINHO)
export function setCartFilterMode(mode) {
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
  else if (AppTemplates && typeof AppTemplates.renderCart === 'function') AppTemplates.renderCart();
}

export function recalcularPrecosCarrinhoPorMercado(novoMercadoId) {
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

// 6. TOTALIZAÇÃO E AÇÕES RÁPIDAS
export function updateCartTotals(totalItems, checkedItems) {
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

export function toggleCartItemCheck(id) {
  const it = (cart || []).find(x => x.id === id);
  if (it) {
    it.checked = !it.checked;
    playAppBeep('check');
    saveCartData();
    renderCartUI();
  }
}

export function stepCartQty(id, delta) {
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

export function removeCartItem(id) {
  const idx = (cart || []).findIndex(x => x.id === id);
  if (idx > -1) {
    cart.splice(idx, 1);
    saveCartData();
    renderCartUI();
    showAppToast('Item removido', 'info');
  }
}
