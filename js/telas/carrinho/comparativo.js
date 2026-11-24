/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CARRINHO: MELHOR MERCADO PARA A LISTA E GUIA COMPARATIVO (js/telas/carrinho/comparativo.js)
 */

import { esc, formatBRL, saveAllLocalData } from '../../state.js';
import { showAppToast } from '../../ui.js';
import { renderCartUI } from './cards.js';

// 1. FUNÇÃO AUXILIAR: CALCULA O PREÇO REAL DO PRODUTO POR SUPERMERCADO
export function obterPrecoItemMercado(itemCarrinho, mercadoId) {
  const nomeItem = (itemCarrinho.name || '').trim().toLowerCase();
  const idItem = itemCarrinho.productId || itemCarrinho.id;

  const prod = (typeof products !== 'undefined' && Array.isArray(products))
    ? products.find(p => (idItem && p.id === idItem) || (p.name && p.name.trim().toLowerCase() === nomeItem))
    : null;

  if (!prod) return Number(itemCarrinho.unitPrice || itemCarrinho.price || itemCarrinho.basePrice || 0);

  const marcaNome = (itemCarrinho.selectedBrandId || 'Padrão').trim().toLowerCase();

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

// 2. ATUALIZAÇÃO DO INDICADOR DISCRETO EM SVG NO CABEÇALHO
export function analisarMelhorMercado() {
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
    totalAtual += obterPrecoItemMercado(item, activeMarketId) * Number(item.quantity || 1);
  });

  let melhorMercado = null;
  let menorTotal = totalAtual;

  listaMercados.forEach(mercado => {
    if (mercado.id === activeMarketId) return;

    let somaMercado = 0;
    cart.forEach(item => {
      somaMercado += obterPrecoItemMercado(item, mercado.id) * Number(item.quantity || 1);
    });

    if (somaMercado > 0 && (totalAtual - somaMercado) >= 0.20 && somaMercado < menorTotal) {
      menorTotal = somaMercado;
      melhorMercado = mercado;
    }
  });

  // Fixa o botão com altura e largura equivalentes aos outros botões do topo
  btn.className = "w-8 h-8 rounded-xl border transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs";

  if (melhorMercado) {
    const diff = formatBRL((totalAtual - menorTotal));
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

// 3. GUIA FLUTUANTE COM O COMPARATIVO GERAL
export function abrirGuiaComparativoMercados() {
  const modal = document.getElementById('modalComparativoMercadosLista');
  const container = document.getElementById('listaComparativoMercadosContainer');
  if (!modal || !container) return;

  const listaMercados = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets))
    ? supermarkets.filter(m => m && m.id && m.id !== 'm-padrao')
    : [];

  let totalAtual = 0;
  cart.forEach(item => {
    totalAtual += obterPrecoItemMercado(item, activeMarketId) * Number(item.quantity || 1);
  });

  const comparativos = listaMercados.map(mercado => {
    let totalMercado = 0;
    cart.forEach(item => {
      totalMercado += obterPrecoItemMercado(item, mercado.id) * Number(item.quantity || 1);
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
      diffBadge = `<span class="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">- R$ ${formatBRL(Math.abs(comp.diff))}</span>`;
    } else if (comp.diff > 0.10) {
      diffBadge = `<span class="text-[9px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">+ R$ ${formatBRL(comp.diff)}</span>`;
    }

    return `
      <div class="p-2.5 rounded-xl border flex items-center justify-between gap-2 ${statusClass}">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 truncate">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${esc(comp.name)}</span>
            ${diffBadge}
          </div>
          <p class="text-[11px] font-black text-slate-700 dark:text-slate-300 mt-0.5">Total: R$ ${formatBRL(comp.total)}</p>
        </div>
        ${!comp.isAtivo ? `
          <button type="button" 
                  data-acao="carrinho-guia-trocar-mercado" data-id="${esc(comp.id)}" 
                  class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer">
            Mudar
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
};

export function fecharGuiaComparativoMercados() {
  const modal = document.getElementById('modalComparativoMercadosLista');
  if (modal) modal.classList.add('hidden');
};

export function trocarMercadoPelaGuia(idMercado) {
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
