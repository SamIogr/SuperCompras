/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - MOTOR CENTRAL DE TEMPLATES (js/templates.js)
 * Renderização gráfica, modais dinâmicos e layout da aba Dados com proteção esc().
 */

window.AppTemplates = {
  icons: {
    edit: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`,
    delete: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`,
    add: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>`,
    route: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
    check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`,
    close: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>`,
    upload: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>`
  },
  emptyState(msg) {
    return `
      <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 my-2">
        <p class="text-xs font-bold text-slate-600">${esc(msg)}</p>
      </div>`;
  },

  // 4. CARRINHO DE COMPRAS
  cartItemCard(item, calc) {
    const isChecked = Boolean(item.checked);
    return `
      <div class="bg-white rounded-2xl p-3.5 border ${isChecked ? 'border-emerald-200 bg-emerald-50/40 opacity-75' : 'border-slate-200 shadow-2xs hover:border-slate-300'} transition-all my-2">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <button type="button" data-acao="carrinho-marcar" data-id="${esc(item.id)}" class="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-300'}">
              <span class="${isChecked ? 'block' : 'hidden'}">${this.icons.check}</span>
            </button>
            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-1.5 flex-wrap">
                <h4 class="font-extrabold text-sm text-slate-800 truncate ${isChecked ? 'line-through text-slate-400' : ''}">${esc(item.name)}</h4>
                <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${esc(item.unit || 'un')}</span>
                <span class="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">${esc(item.selectedBrandId || 'Padrão')}</span>
              </div>
              <div class="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                <span>${formatQty(item.quantity)} ${esc(item.unit)} × R$ ${formatBRL(item.unitPrice)}</span>
                ${calc.badgeText ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded">${esc(calc.badgeText)}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2 shrink-0">
            <div class="text-right mr-1">
              <div class="text-sm font-black text-slate-900 leading-tight">R$ ${formatBRL(calc.finalSubtotal || 0)}</div>
              ${calc.savings > 0 ? `<div class="text-[10px] font-bold text-emerald-600">-R$ ${formatBRL(calc.savings)}</div>` : ''}
            </div>
            <div class="flex items-center bg-slate-100 rounded-xl p-0.5">
              <button type="button" data-acao="carrinho-qtd" data-passo="-1" data-id="${esc(item.id)}" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs cursor-pointer">-</button>
              <button type="button" data-acao="carrinho-qtd" data-passo="1" data-id="${esc(item.id)}" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs cursor-pointer">+</button>
            </div>
            <button type="button" data-acao="carrinho-editar" data-id="${esc(item.id)}" class="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="Editar item">${this.icons.edit}</button>
            <button type="button" data-acao="carrinho-remover" data-id="${esc(item.id)}" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Remover item">${this.icons.delete}</button>
          </div>
        </div>
      </div>`;
  },

  renderCart() {
    const q = (document.getElementById('cartSearchFilter')?.value || '').toLowerCase().trim();
    const totalItems = (cart || []).length;
    const checkedItems = (cart || []).filter(i => i.checked).length;
    const pendingItems = totalItems - checkedItems;

    ['cartBadgeAll', 'navCartBadgeCount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = totalItems;
    });
    if (document.getElementById('cartBadgePending')) document.getElementById('cartBadgePending').innerText = pendingItems;
    if (document.getElementById('cartBadgeChecked')) document.getElementById('cartBadgeChecked').innerText = checkedItems;

    const displayList = (cart || []).filter(item => {
      if (cartFilterMode === 'pending' && item.checked) return false;
      if (cartFilterMode === 'checked' && !item.checked) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const container = document.getElementById('cartItemsContainer');
    const emptyCard = document.getElementById('cartEmptyCard');
    if (!container || !emptyCard) return;

    if (totalItems === 0) {
      container.innerHTML = '';
      emptyCard.classList.remove('hidden');
    } else {
      emptyCard.classList.add('hidden');
      if (displayList.length === 0) {
        container.innerHTML = this.emptyState('Nenhum item encontrado no filtro.');
      } else {
        container.innerHTML = displayList.map(item => {
          const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
          return this.cartItemCard(item, calc);
        }).join('');
      }
    }
    

    if (typeof updateCartTotals === 'function') {
      updateCartTotals(totalItems, checkedItems);
    }
  },
  


};

window.renderCartUI = () => {
  window.AppTemplates.renderCart();
  if (typeof analisarMelhorMercado === 'function') {
    analisarMelhorMercado();
  }
};

export {};
