/**
 * SUPERCOMPRAS PRO - HISTÓRICO DE COMPRAS (SNAPSHOTS IMUTÁVEIS E MODAL DINÂMICO)
 */

function obterHistoricoLocal() {
  if (Array.isArray(window.purchaseHistory) && window.purchaseHistory.length > 0) {
    return window.purchaseHistory;
  }
  try {
    const salvoV3 = JSON.parse(localStorage.getItem('sc_history_v3'));
    if (Array.isArray(salvoV3) && salvoV3.length > 0) {
      window.purchaseHistory = salvoV3;
      return salvoV3;
    }
    const salvoPadrao = JSON.parse(localStorage.getItem('sc_purchase_history'));
    if (Array.isArray(salvoPadrao) && salvoPadrao.length > 0) {
      window.purchaseHistory = salvoPadrao;
      return salvoPadrao;
    }
  } catch (e) {
    console.error('[Historico] Erro ao carregar dados:', e);
  }
  return [];
}

function salvarHistoricoLocal(lista) {
  window.purchaseHistory = lista;
  try {
    localStorage.setItem('sc_history_v3', JSON.stringify(lista));
    localStorage.setItem('sc_purchase_history', JSON.stringify(lista));
  } catch (e) {
    console.error('[Historico] Erro ao salvar dados:', e);
  }
}

function resolverNomeMercado(compra) {
  if (compra.marketName && compra.marketName !== 'Mercado' && compra.marketName.trim().length > 0) {
    return compra.marketName;
  }
  if (compra.mercadoNome && compra.mercadoNome !== 'Mercado' && compra.mercadoNome.trim().length > 0) {
    return compra.mercadoNome;
  }
  if (compra.marketId && Array.isArray(window.supermarkets)) {
    const m = window.supermarkets.find(x => x.id === compra.marketId);
    if (m && m.name) return m.name + (m.branch ? ` (${m.branch})` : '');
  }
  return 'Supermercado (Referência Geral)';
}

window.renderHistoricoUI = function() {
  const container = document.getElementById('historicoListaContainer');
  const emptyState = document.getElementById('historicoVazioContainer');
  if (!container) return;

  const historico = obterHistoricoLocal();

  // Métricas do Mês
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const comprasMes = historico.filter(h => {
    const rawData = h.date || h.dataISO || h.data;
    if (!rawData) return false;
    const d = new Date(rawData);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const totalMes = comprasMes.reduce((acc, cur) => acc + (Number(cur.total) || 0), 0);
  const totalGeral = historico.reduce((acc, cur) => acc + (Number(cur.total) || 0), 0);
  const mediaCompra = historico.length > 0 ? (totalGeral / historico.length) : 0;

  const elTotalMes = document.getElementById('histMetricaGastoMes');
  const elMedia = document.getElementById('histMetricaMediaCompra');
  const elQtd = document.getElementById('histMetricaQtdCompras');

  if (elTotalMes) elTotalMes.innerText = 'R$ ' + (typeof formatBRL === 'function' ? formatBRL(totalMes) : totalMes.toFixed(2));
  if (elMedia) elMedia.innerText = 'R$ ' + (typeof formatBRL === 'function' ? formatBRL(mediaCompra) : mediaCompra.toFixed(2));
  if (elQtd) elQtd.innerText = `${historico.length} compra${historico.length === 1 ? '' : 's'}`;

  if (historico.length === 0) {
    container.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  container.innerHTML = historico.map((compra, idx) => {
    const rawData = compra.date || compra.dataISO || compra.data;
    const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Data recente';

    const mercadoNome = resolverNomeMercado(compra);
    const valorTotal = typeof formatBRL === 'function' ? formatBRL(compra.total || 0) : Number(compra.total || 0).toFixed(2);
    const itens = compra.items || compra.itens || [];
    const qtdItens = itens.length || compra.itemCount || 1;
    const economia = Number(compra.savings) || 0;

    return `
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs transition-all hover:border-slate-300 my-2">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <strong class="text-xs font-black text-slate-800 block">${mercadoNome}</strong>
            <span class="text-[10px] text-slate-400 block">${dataFormatada}</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-black text-emerald-600 block leading-tight">R$ ${valorTotal}</span>
            ${economia > 0 ? `<span class="text-[10px] font-bold text-amber-600">Econ. R$ ${typeof formatBRL === 'function' ? formatBRL(economia) : economia.toFixed(2)}</span>` : ''}
          </div>
        </div>

        <div class="flex items-center justify-between pt-2.5 text-xs">
          <span class="text-slate-500 text-[11px] font-semibold">${qtdItens} produto${qtdItens === 1 ? '' : 's'}</span>
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
  }).join('');
};

/**
 * GERA O MODAL COMPLETO DINAMICAMENTE NO DOM (SEM RISCO DE DUPLICIDADE OU CORTE)
 */
window.abrirDetalhesCompraHistorico = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  if (!compra) return;

  // Remove qualquer modal antigo com o mesmo ID para evitar conflitos no DOM
  document.querySelectorAll('#modalDetalhesHistorico').forEach(el => el.remove());

  const rawData = compra.date || compra.dataISO || compra.data;
  const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'Data recente';

  const mercadoNome = resolverNomeMercado(compra);
  const itens = compra.items || compra.itens || [];
  const totalFormatado = typeof formatBRL === 'function' ? formatBRL(compra.total || 0) : Number(compra.total || 0).toFixed(2);

  // Monta as linhas de cada item arquivado
  let itensHtml = '';
  if (itens.length === 0) {
    itensHtml = `
      <div class="p-6 text-center text-slate-400 text-xs">
        Nenhum detalhe de item arquivado nesta compra.
      </div>`;
  } else {
    itensHtml = itens.map(it => {
      const nome = it.name || it.nome || 'Produto';
      const marca = it.selectedBrandId || it.brand || it.marca || 'Padrão';
      const precoUnit = Number(it.unitPrice || it.price || it.precoUnitario || 0);
      const qtd = Number(it.quantity || it.quantidade || 1);
      const subtotal = Number(it.subtotal) || (precoUnit * qtd);
      const unidade = it.unit || it.unidade || 'un';

      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs my-1.5 shadow-2xs">
          <div class="min-w-0 pr-2">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <strong class="font-extrabold text-slate-800 truncate">${nome}</strong>
              <span class="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded border border-emerald-300">
                🏷️ ${marca}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">
              ${qtd} ${unidade} × R$ ${typeof formatBRL === 'function' ? formatBRL(precoUnit) : precoUnit.toFixed(2)}
            </p>
          </div>
          <span class="font-black text-slate-800 shrink-0 text-sm">
            R$ ${typeof formatBRL === 'function' ? formatBRL(subtotal) : subtotal.toFixed(2)}
          </span>
        </div>
      `;
    }).join('');
  }

  // Cria e injeta o modal com garantia de estrutura e visibilidade
  const modalContainer = document.createElement('div');
  modalContainer.id = 'modalDetalhesHistorico';
  modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs';
  modalContainer.onclick = function(e) {
    if (e.target === this) fecharModalDetalhesHistorico();
  };

  modalContainer.innerHTML = `
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative" style="max-height: 85vh;">
      
      <!-- Topo com Local e Data -->
      <div class="flex items-start justify-between border-b border-slate-100 pb-3 shrink-0">
        <div class="min-w-0 pr-3">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md uppercase">Supermercado</span>
            <h3 class="font-black text-slate-800 text-base truncate">${mercadoNome}</h3>
          </div>
          <p class="text-xs text-slate-500 mt-1">${dataFormatada} • ${itens.length} produto${itens.length === 1 ? '' : 's'}</p>
        </div>
        <button type="button" onclick="fecharModalDetalhesHistorico()" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0" title="Fechar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Lista de Produtos Não Editáveis com Rolagem -->
      <div class="py-3 flex-1 overflow-y-auto min-h-[140px] pr-1">
        ${itensHtml}
      </div>

      <!-- Rodapé com Total e Botão Repetir -->
      <div class="border-t border-slate-100 pt-3 flex items-center justify-between bg-white shrink-0">
        <div>
          <span class="text-[10px] font-bold text-slate-400 block uppercase">Total da Compra</span>
          <strong class="text-lg font-black text-emerald-600 block leading-tight">R$ ${totalFormatado}</strong>
        </div>
        <div class="flex items-center space-x-2">
          <button type="button" onclick="fecharModalDetalhesHistorico()" class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
            ← Voltar
          </button>
          <button type="button" onclick="restaurarCompraParaCarrinho(${idx}); fecharModalDetalhesHistorico();" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5">
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
  if (e.key === 'Escape') fecharModalDetalhesHistorico();
});

window.restaurarCompraParaCarrinho = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  const itens = compra?.items || compra?.itens;

  if (!compra || !Array.isArray(itens) || itens.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('Esta compra não possui itens para restaurar.', 'warning');
    return;
  }

  // Preserva integralmente o supermercado ativo atual no aplicativo
  const mercadoAtivoAtual = activeMarketId;

  // Reconstrói o carrinho com itens e marcas, buscando os preços do mercado atualmente ativo
  cart = itens.map(it => {
    const nomeItem = (it.name || it.nome || '').trim();
    const marcaItem = (it.selectedBrandId || it.brand || it.marca || 'Padrão').trim();
    const qtdItem = Number(it.quantity || it.quantidade || 1);
    const unidadeItem = it.unit || it.unidade || 'un';

    // Localiza o produto no catálogo mestre
    const prodBanco = (products || []).find(p => 
      (it.productId && p.id === it.productId) || 
      (p.name && p.name.toLowerCase() === nomeItem.toLowerCase())
    );

    let precoDoBanco = 0;

    if (prodBanco) {
      const marcaLower = marcaItem.toLowerCase();

      if (marcaLower === 'padrão' || marcaLower === 'padrao') {
        // Cotação da marca padrão no supermercado que está selecionado agora
        if (prodBanco.marketPrices && prodBanco.marketPrices[mercadoAtivoAtual] !== undefined) {
          precoDoBanco = Number(prodBanco.marketPrices[mercadoAtivoAtual]) || 0;
        }
      } else if (Array.isArray(prodBanco.brands)) {
        // Cotação da marca específica no supermercado que está selecionado agora
        const bObj = prodBanco.brands.find(b => (b.name || b.id || '').toLowerCase() === marcaLower);
        if (bObj && bObj.marketPrices && bObj.marketPrices[mercadoAtivoAtual] !== undefined) {
          precoDoBanco = Number(bObj.marketPrices[mercadoAtivoAtual]) || 0;
        }
      }

      // Preço base de referência caso não haja cotação específica no mercado ativo
      if (precoDoBanco <= 0 && prodBanco.basePrice > 0) {
        precoDoBanco = Number(prodBanco.basePrice);
      }
    }

    return {
      id: 'c-item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      productId: prodBanco ? prodBanco.id : (it.productId || null),
      name: prodBanco ? prodBanco.name : nomeItem,
      selectedBrandId: marcaItem,
      unitPrice: precoDoBanco, // Preço vigente do mercado ativo
      quantity: qtdItem,
      unit: prodBanco ? (prodBanco.unit || unidadeItem) : unidadeItem,
      checked: false,
      promo: { type: 'none' }
    };
  });

  saveCartData();
  saveAllLocalData();
  if (typeof switchActiveTab === 'function') switchActiveTab('compras');
  if (typeof renderCartUI === 'function') renderCartUI();
  if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();

  if (typeof showAppToast === 'function') {
    showAppToast('Itens e marcas inseridos no carrinho mantendo o mercado ativo!', 'success');
  }
};

window.limparTodoHistorico = function() {
  if (confirm('Deseja apagar permanentemente todo o histórico de compras deste aparelho?')) {
    salvarHistoricoLocal([]);
    renderHistoricoUI();
    if (typeof showAppToast === 'function') showAppToast('Histórico esvaziado.', 'info');
  }
};