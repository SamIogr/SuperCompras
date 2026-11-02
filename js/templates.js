/**
 * SUPERCOMPRAS PRO - DESIGN SYSTEM E GERADOR DE TEMPLATES (js/templates.js)
 * Ficheiro central exclusivo para geração de componentes visuais, Tailwind CSS e SVGs.
 */

window.AppTemplates = {
  // 1. BIBLIOTECA DE ÍCONES VETORIAIS (SVG)
  icons: {
    edit: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`,
    delete: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`,
    add: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>`,
    route: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
    check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`,
    cart: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
    search: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`,
    bulb: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`
  },

  // 2. ESTADOS VAZIOS
  emptyState(titulo, subtitulo = '') {
    return `
      <div class="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200 p-8 my-2">
        <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-400">
          ${this.icons.cart}
        </div>
        <p class="text-xs font-bold text-slate-700">${titulo}</p>
        ${subtitulo ? `<p class="text-[11px] text-slate-400 mt-1">${subtitulo}</p>` : ''}
      </div>
    `;
  },

  // 3. MÓDULO CATÁLOGO DE PRODUTOS (products.js)
  productCard(prod, opts = {}) {
    const isLocal = String(prod.id).startsWith('p-custom-') || String(prod.id).startsWith('p-local-');
    const cotacao = opts.marketPrice ? `R$ ${formatBRL(opts.marketPrice)}` : 'Sem cotação';
    const baseStr = prod.basePrice > 0 ? `R$ ${formatBRL(prod.basePrice)}` : 'A definir';

    return `
      <div class="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-3 my-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2 flex-wrap">
            <h3 class="font-extrabold text-sm text-slate-800 truncate">${prod.name}</h3>
            ${isLocal 
              ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Local</span>` 
              : `<span class="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Nuvem</span>`}
            <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md border border-slate-200/60">${prod.category || 'Geral'}</span>
            <span class="text-[10px] text-slate-400 font-semibold">${prod.unit || 'un'}</span>
          </div>
          <div class="text-xs text-slate-500 mt-1 truncate">
            Base: <span class="font-bold text-slate-700">${baseStr}</span> • 
            No ${opts.marketName || 'Mercado'}: <span class="font-bold ${opts.marketPrice ? 'text-emerald-700' : 'text-slate-400'}">${cotacao}</span>
          </div>
        </div>

        <div class="flex items-center space-x-1.5 shrink-0">
          <button type="button" onclick="openProductEditModal('${prod.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Editar produto">
            ${this.icons.edit}
          </button>
          <button type="button" onclick="askDeleteSingleProduct('${prod.id}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors" title="Excluir produto">
            ${this.icons.delete}
          </button>
          <button type="button" onclick="quickAddToCartFromCatalog('${prod.id}')" class="p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all shadow-xs" title="Adicionar ao carrinho">
            ${this.icons.add}
          </button>
        </div>
      </div>
    `;
  },

  productCompareRow(market, price, isLowest = false, prodId = '') {
    return `
      <div class="p-2.5 rounded-xl border ${isLowest ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 bg-white'} flex items-center justify-between gap-2 shadow-2xs">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="font-bold text-xs text-slate-800">${market.name}</span>
            <span class="text-[10px] text-slate-500">(${market.branch || 'SJP'})</span>
            ${isLowest ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 rounded-full">MENOR</span>` : ''}
          </div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5">${market.promoDay || 'Sem dia fixo'}</div>
        </div>
        <div class="text-right shrink-0 flex items-center space-x-2">
          <span class="text-xs font-black text-slate-800">${price > 0 ? 'R$ ' + formatBRL(price) : 'Sem cotação'}</span>
          <button type="button" onclick="loadMarketToDirectEdit('${prodId}', '${market.id}')" class="p-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-slate-700 text-xs" title="Editar preço neste mercado">
            ${this.icons.edit}
          </button>
        </div>
      </div>
    `;
  },

  // 4. MÓDULO SUPERMERCADOS (markets.js)
  marketCard(market, isCurrent = false) {
    const isLocal = String(market.id).startsWith('m-custom-') || !market.colIndex;

    return `
      <div class="bg-white rounded-2xl p-3.5 border ${isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'} shadow-2xs transition-all my-2 flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0 cursor-pointer" onclick="selecionarMercado('${market.id}')">
          <div class="flex items-center space-x-2 flex-wrap">
            <h3 class="font-extrabold text-sm text-slate-800 truncate">${market.name}</h3>
            ${isCurrent ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md">ATIVO</span>` : ''}
            ${isLocal ? `<span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-md">LOCAL</span>` : ''}
          </div>
          <p class="text-xs text-slate-500 mt-1 truncate">${market.branch || 'SJP'}${market.promoDay ? ' • 🗓️ ' + market.promoDay : ''}</p>
          ${market.address ? `<p class="text-[11px] text-slate-400 mt-0.5 truncate">${market.address}</p>` : ''}
        </div>

        <div class="flex items-center space-x-1.5 shrink-0">
          ${market.address ? `
            <button type="button" onclick="abrirSupermercadoNoMaps('${market.id}', true)" class="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors" title="Traçar rota no Maps">
              ${this.icons.route}
            </button>` : ''}
          <button type="button" onclick="openMarketEditModal('${market.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Editar rede">
            ${this.icons.edit}
          </button>
          <button type="button" onclick="excluirMercadoCatalogo('${market.id}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors" title="Excluir rede">
            ${this.icons.delete}
          </button>
        </div>
      </div>
    `;
  },

  // 5. MÓDULO CARRINHO DE COMPRAS (cart.js)
  cartItemCard(item, calc = {}) {
    const isChecked = Boolean(item.checked);

    return `
      <div class="bg-white rounded-2xl p-3.5 border ${isChecked ? 'border-emerald-200 bg-emerald-50/40 opacity-75' : 'border-slate-200 shadow-2xs hover:border-slate-300'} transition-all my-2">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <button type="button" onclick="toggleCartItemCheck('${item.id}')" class="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-300'}">
              <span class="${isChecked ? 'block' : 'hidden'}">${this.icons.check}</span>
            </button>
            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-1.5 flex-wrap">
                <h4 class="font-extrabold text-sm text-slate-800 truncate ${isChecked ? 'line-through text-slate-400' : ''}">${item.name}</h4>
                <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${item.unit || 'un'}</span>
                <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black border border-emerald-300">🏷️ ${item.selectedBrandId || 'Padrão'}</span>
              </div>
              <div class="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                <span>${formatQty(item.quantity)} ${item.unit} × R$ ${formatBRL(item.unitPrice)}</span>
                ${calc.badgeText ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded">${calc.badgeText}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2 shrink-0">
            <div class="text-right mr-1">
              <div class="text-sm font-black text-slate-900 leading-tight">R$ ${formatBRL(calc.finalSubtotal || 0)}</div>
              ${calc.savings > 0 ? `<div class="text-[10px] font-bold text-emerald-600">-R$ ${formatBRL(calc.savings)}</div>` : ''}
            </div>
            <div class="flex items-center bg-slate-100 rounded-xl p-0.5">
              <button type="button" onclick="stepCartQty('${item.id}', -1)" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs">–</button>
              <button type="button" onclick="stepCartQty('${item.id}', 1)" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs">+</button>
            </div>
            <button type="button" onclick="openEditCartItemModal('${item.id}')" class="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" title="Editar item">
              ${this.icons.edit}
            </button>
            <button type="button" onclick="removeCartItem('${item.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Remover item">
              ${this.icons.delete}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  cartAutocompleteRow(prod, price) {
    return `
      <div class="px-3.5 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer flex items-center justify-between text-xs transition-colors" onclick="selectProductForCart('${prod.id}')">
        <div class="min-w-0 pr-2">
          <span class="font-bold text-slate-800 block truncate">${prod.name}</span>
          <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${prod.category || 'Geral'}</span>
        </div>
        <div class="text-right text-emerald-700 font-black shrink-0">
          ${price > 0 ? 'R$ ' + formatBRL(price) : 'A cotar'}
          <span class="text-[10px] text-slate-500 font-normal"> / ${prod.unit || 'un'}</span>
        </div>
      </div>
    `;
  },

  recommendationBanner(bestMarket, savings, total) {
    return `
      <div class="bg-amber-50 border border-amber-300 rounded-2xl p-3 sm:p-3.5 shadow-xs transition-all">
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex items-center space-x-2.5 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              ${this.icons.bulb}
            </div>
            <div class="min-w-0">
              <div class="flex items-center space-x-1.5 flex-wrap">
                <span class="text-xs font-black text-amber-900">Recomendação de Economia</span>
                <span class="bg-amber-200 text-amber-900 text-[10px] font-black px-1.5 py-0.2 rounded-md">POUPE DINHEIRO</span>
              </div>
              <p class="text-[11px] text-amber-800 truncate mt-0.5">
                No <strong>${bestMarket.name}</strong> esta lista sai por <strong>R$ ${formatBRL(total)}</strong> (poupança de <strong>R$ ${formatBRL(savings)}</strong>).
              </p>
            </div>
          </div>
          <button type="button" onclick="trocarParaMercadoRecomendado('${bestMarket.id}')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-xs transition-transform shrink-0">
            Trocar Mercado
          </button>
        </div>
      </div>
    `;
  },

  // 6. MÓDULO HISTÓRICO DE COMPRAS (history.js)
  historyCard(compra, idx) {
    const dataFormatada = new Date(compra.dataISO || compra.date || compra.data).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs transition-all hover:border-slate-300">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <span class="text-xs font-black text-slate-800">${compra.marketName || compra.mercadoNome || 'Supermercado'}</span>
            <span class="text-[10px] text-slate-400 block">${dataFormatada}</span>
          </div>
          <span class="text-sm font-black text-emerald-600">R$ ${formatBRL(compra.total)}</span>
        </div>

        <div class="flex items-center justify-between pt-2.5 text-xs">
          <span class="text-slate-500 text-[11px] font-semibold">${compra.items?.length || compra.itens?.length || 0} produtos adquiridos</span>
          <div class="flex items-center space-x-1.5">
            <button type="button" onclick="abrirDetalhesCompraHistorico(${idx})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors">
              Ver Itens
            </button>
            <button type="button" onclick="restaurarCompraParaCarrinho(${idx})" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-colors">
              Repetir
            </button>
          </div>
        </div>
      </div>
    `;
  },

  historyDetailRow(item) {
    const subtotal = item.subtotal || ((item.unitPrice || item.price || 0) * (item.quantity || 1));
    return `
      <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
        <div class="min-w-0 pr-2">
          <p class="font-bold text-slate-800 truncate">${item.name}</p>
          <p class="text-[10px] text-slate-400">Marca: ${item.selectedBrandId || item.brand || 'Padrão'} • Qtd: ${item.quantity} ${item.unit || 'un'}</p>
        </div>
        <span class="font-black text-slate-700 whitespace-nowrap">R$ ${formatBRL(subtotal)}</span>
      </div>
    `;
  }
};