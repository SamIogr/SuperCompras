/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - HISTÓRICO: CUPOM DA COMPRA E REPETIR NO CARRINHO (js/telas/historico/detalhes.js)
 */

// MODAL DE CUPOM (ESTRUTURA IMUTÁVEL)
window.abrirDetalhesCompraHistorico = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  if (!compra) return;

  document.querySelectorAll('#modalDetalhesHistorico').forEach(el => el.remove());

  const rawData = compra.date;
  const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'Data recente';

  const mercadoNome = resolverNomeMercado(compra);
  const itens = compra.items || [];
  const fmt = (typeof formatBRL === 'function') ? formatBRL : (v) => Number(v || 0).toFixed(2);
  const totalFormatado = fmt(compra.total || 0);

  let itensHtml = '';
  if (itens.length === 0) {
    itensHtml = `
      <div class="p-6 text-center text-slate-400 text-xs">
        Nenhum detalhe de item arquivado nesta compra.
      </div>`;
  } else {
    itensHtml = itens.map(it => {
      const nome = it.name || 'Produto';
      const marca = it.selectedBrandId || 'Padrão';
      const precoUnit = Number(it.unitPrice || 0);
      const qtd = Number(it.quantity || 1);
      const subtotal = Number(it.subtotal) || (precoUnit * qtd);
      const unidade = it.unit || it.unidade || 'un';

      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs my-1.5 shadow-2xs">
          <div class="min-w-0 pr-2">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <strong class="font-extrabold text-slate-800 truncate">${esc(nome)}</strong>              <span class="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded border border-emerald-300">
                🏷️ ${esc(marca)}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">
              ${qtd} ${esc(unidade)} × R$ ${fmt(precoUnit)}
            </p>
          </div>
          <span class="font-black text-slate-800 shrink-0 text-sm">
            R$ ${fmt(subtotal)}
          </span>
        </div>
      `;
    }).join('');
  }

  const modalContainer = document.createElement('div');
  modalContainer.id = 'modalDetalhesHistorico';
  modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs';
  modalContainer.onclick = function(e) {
    if (e.target === this) window.fecharModalDetalhesHistorico();
  };

  modalContainer.innerHTML = `
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative" style="max-height: 85vh;">
      <div class="flex items-start justify-between border-b border-slate-100 pb-3 shrink-0">
        <div class="min-w-0 pr-3">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md uppercase">Supermercado</span>
            <h3 class="font-black text-slate-800 text-base truncate">${esc(mercadoNome)}</h3>
          </div>
          <p class="text-xs text-slate-500 mt-1">${dataFormatada} • ${itens.length} produto${itens.length === 1 ? '' : 's'}</p>
        </div>
        <button type="button" data-acao="historico-detalhes-fechar" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0" title="Fechar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="py-3 flex-1 overflow-y-auto min-h-[140px] pr-1">
        ${itensHtml}
      </div>

      <div class="border-t border-slate-100 pt-3 flex items-center justify-between bg-white shrink-0">
        <div>
          <span class="text-[10px] font-bold text-slate-400 block uppercase">Total da Compra</span>
          <strong class="text-lg font-black text-emerald-600 block leading-tight">R$ ${totalFormatado}</strong>
        </div>
        <div class="flex items-center space-x-2">
          <button type="button" data-acao="historico-detalhes-fechar" class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
            Voltar
          </button>
          <button type="button" data-acao="historico-repetir-e-fechar" data-idx="${idx}" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Repetir Lista</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);
};

window.fecharModalDetalhesHistorico = function() {
  document.querySelectorAll('#modalDetalhesHistorico').forEach(el => el.remove());
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.fecharModalDetalhesHistorico();
    fecharModalConfirmacaoDupla();
  }
});

window.restaurarCompraParaCarrinho = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  const itens = compra?.items;

  if (!compra || !Array.isArray(itens) || itens.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('Esta compra não possui itens para restaurar.', 'warning');
    return;
  }

  const mercadoAtivoAtual = activeMarketId;
  const listaProdutos = (typeof products !== 'undefined' && Array.isArray(products))
    ? products
    : (Array.isArray(window.products) ? window.products : []);

  cart = itens.map(it => {
    const nomeItem = (it.name || '').trim();
    const marcaItem = (it.selectedBrandId || 'Padrão').trim();
    const qtdItem = Number(it.quantity || 1);
    const unidadeItem = it.unit || it.unidade || 'un';

    const prodBanco = listaProdutos.find(p => 
      (it.productId && p.id === it.productId) || 
      (p.name && p.name.toLowerCase() === nomeItem.toLowerCase())
    );

    let precoDoBanco = 0;

    if (prodBanco) {
      const marcaLower = marcaItem.toLowerCase();

      if (marcaLower === 'padrão' || marcaLower === 'padrao') {
        if (prodBanco.marketPrices && prodBanco.marketPrices[mercadoAtivoAtual] !== undefined) {
          precoDoBanco = Number(prodBanco.marketPrices[mercadoAtivoAtual]) || 0;
        }
      } else if (Array.isArray(prodBanco.brands)) {
        const bObj = prodBanco.brands.find(b => (b.name || b.id || '').toLowerCase() === marcaLower);
        if (bObj && bObj.marketPrices && bObj.marketPrices[mercadoAtivoAtual] !== undefined) {
          precoDoBanco = Number(bObj.marketPrices[mercadoAtivoAtual]) || 0;
        }
      }

      if (precoDoBanco <= 0 && prodBanco.basePrice > 0) {
        precoDoBanco = Number(prodBanco.basePrice);
      }
    }

    return {
      id: novoId('c-item-'),
      productId: prodBanco ? prodBanco.id : (it.productId || null),
      name: prodBanco ? prodBanco.name : nomeItem,
      selectedBrandId: marcaItem,
      unitPrice: precoDoBanco,
      quantity: qtdItem,
      unit: prodBanco ? (prodBanco.unit || unidadeItem) : unidadeItem,
      checked: false,
      promo: { type: 'none' }
    };
  });

  if (typeof saveCartData === 'function') saveCartData();
  if (typeof saveAllLocalData === 'function') saveAllLocalData();
  if (typeof switchActiveTab === 'function') switchActiveTab('compras');
  if (typeof renderCartUI === 'function') renderCartUI();
  if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();

  if (typeof showAppToast === 'function') {
    showAppToast('Itens e marcas inseridos no carrinho mantendo o mercado ativo!', 'success');
  }
};

export {};
