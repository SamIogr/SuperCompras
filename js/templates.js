/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - TEMPLATES DO CARRINHO (js/templates.js)
 * Cards dos itens e a lista do carrinho; acrescentados ao registro AppTemplates (js/ui/templates-base.js).
 */

import { AVISOS, Eventos } from './eventos.js';
import { esc, formatBRL, formatQty } from './state.js';
import { AppTemplates } from './ui/templates-base.js';
import { computeItemFinancials } from './telas/carrinho/calculo.js';
import { updateCartTotals } from './telas/carrinho/lista.js';
import { analisarMelhorMercado } from './telas/carrinho/comparativo.js';

Object.assign(AppTemplates, {
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
  

});

// O estado avisa quando o carrinho é salvo; a tela redesenha. (Antes state.js chamava
// renderCartUI direto, o que fazia o estado depender da tela e criava um ciclo de imports.)
Eventos.ouvir(AVISOS.CARRINHO_SALVO, () => renderCartUI());

export function renderCartUI() {
  AppTemplates.renderCart();
  if (typeof analisarMelhorMercado === 'function') {
    analisarMelhorMercado();
  }
};

