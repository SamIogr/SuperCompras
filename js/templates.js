/**
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
  // 8. MODAL DA CALCULADORA COMPARATIVA
  renderPriceComparatorModal() {
    document.querySelectorAll('#modalPriceComparator').forEach(el => el.remove());

    const modalHtml = `
      <div id="modalPriceComparator" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 space-y-3 max-h-[92vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div class="flex items-center space-x-2">
              <div class="w-7 h-7 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-black text-sm">⚖️</div>
              <div>
                <h3 class="font-extrabold text-slate-800 text-sm">Comparador de Preço e Atacado</h3>
                <p class="text-[10px] text-slate-500 font-medium">Decida pelo menor custo unitário ou pela meta de compra</p>
              </div>
            </div>
            <button type="button" onclick="fecharCalculadoraComparativa()" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-lg font-bold">✕</button>
          </div>

          <div class="flex items-center justify-between bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button type="button" id="compModeWeight" onclick="setCompMode('weight')" class="flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center transition-all font-bold">Peso (g / kg)</button>
            <button type="button" id="compModeVolume" onclick="setCompMode('volume')" class="flex-1 py-1 rounded-lg text-center transition-all text-slate-600 font-semibold">Volume (ml / L)</button>
            <button type="button" id="compModeUnit" onclick="setCompMode('unit')" class="flex-1 py-1 rounded-lg text-center transition-all text-slate-600 font-semibold">Unidades</button>
          </div>

          <div class="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
            <div class="flex items-center justify-between mb-1">
              <label for="compTargetQty" class="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                <span>🎯 Quanto você precisa levar?</span>
                <span class="text-[10px] font-normal text-amber-700">(Opcional)</span>
              </label>
              <span id="compTargetSuffix" class="text-[10px] font-bold text-amber-800">em kg</span>
            </div>
            <input type="text" id="compTargetQty" inputmode="decimal" placeholder="Ex: 2 (para 2 kg)" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none" />
          </div>

          <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Opção A (ex: pacote menor)</span>
              <span id="labelUnitBaseA" class="text-[10px] text-slate-500 font-normal">Preço por kg</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Tamanho / Peso</label>
                <div class="relative">
                  <input type="text" id="compQtyA" inputmode="decimal" placeholder="Ex: 400" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 pl-2.5 pr-7 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  <span id="compSuffixA" class="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">g</span>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Preço Unitário (R$)</label>
                <input type="text" id="compPriceA" inputmode="decimal" placeholder="Ex: 11,95" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div class="pt-1 border-t border-slate-200/60">
              <label class="flex items-center space-x-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                <input type="checkbox" id="compHasWholesaleA" onchange="toggleWholesaleSection('A')" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                <span>Tem preço de atacado</span>
              </label>
              <div id="compWholesaleBoxA" class="hidden grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-dashed border-slate-200">
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">A partir de (qtd)</label>
                  <input type="text" id="compMinWholesaleA" inputmode="numeric" placeholder="Ex: 3" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Preço no atacado (R$)</label>
                  <input type="text" id="compPriceWholesaleA" inputmode="decimal" placeholder="Ex: 10,00" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs pt-0.5">
              <span class="text-[11px] text-slate-500">Custo equivalente:</span>
              <span id="compResultUnitA" class="font-extrabold text-slate-800 text-xs">R$ 0,00 / kg</span>
            </div>
          </div>

          <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Opção B (ex: pacote maior)</span>
              <span id="labelUnitBaseB" class="text-[10px] text-slate-500 font-normal">Preço por kg</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Tamanho / Peso</label>
                <div class="relative">
                  <input type="text" id="compQtyB" inputmode="decimal" placeholder="Ex: 1000" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 pl-2.5 pr-7 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  <span id="compSuffixB" class="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">g</span>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Preço Unitário (R$)</label>
                <input type="text" id="compPriceB" inputmode="decimal" placeholder="Ex: 25,00" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div class="pt-1 border-t border-slate-200/60">
              <label class="flex items-center space-x-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                <input type="checkbox" id="compHasWholesaleB" onchange="toggleWholesaleSection('B')" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                <span>Tem preço de atacado</span>
              </label>
              <div id="compWholesaleBoxB" class="hidden grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-dashed border-slate-200">
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">A partir de (qtd)</label>
                  <input type="text" id="compMinWholesaleB" inputmode="numeric" placeholder="Ex: 3" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Preço no atacado (R$)</label>
                  <input type="text" id="compPriceWholesaleB" inputmode="decimal" placeholder="Ex: 23,00" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs pt-0.5">
              <span class="text-[11px] text-slate-500">Custo equivalente:</span>
              <span id="compResultUnitB" class="font-extrabold text-slate-800 text-xs">R$ 0,00 / kg</span>
            </div>
          </div>

          <div id="compVerdictCard" class="p-3 rounded-xl border border-dashed border-slate-300 bg-white text-center">
            <p class="text-xs text-slate-500 font-medium">Informe os valores para comparar.</p>
          </div>

          <div class="pt-1">
            <button type="button" onclick="limparCalculadoraComparativa()" class="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer">
              <span></span><span>Limpar Dados</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
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
