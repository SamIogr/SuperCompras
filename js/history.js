/**
 * SUPERCOMPRAS PRO (js/history.js)
 * Snapshots imutáveis, seleção múltipla e modal flutuante de dupla confirmação.
 */

let selectedHistoryIds = new Set();

function obterHistoricoLocal() {
  try {
    const raw = localStorage.getItem('sc_purchase_history');
    if (!raw || raw === 'undefined' || raw === 'null') {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[Historico] Dados corrompidos encontrados, reiniciando lista vazia:', e);
    return [];
  }
}

function salvarHistoricoLocal(lista) {
  window.purchaseHistory = lista;
  if (typeof purchaseHistory !== 'undefined') purchaseHistory = lista;
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
  const listaMercados = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets))
    ? supermarkets
    : (Array.isArray(window.supermarkets) ? window.supermarkets : []);

  if (compra.marketId && listaMercados.length > 0) {
    const m = listaMercados.find(x => x.id === compra.marketId);
    if (m && m.name) return m.name + (m.branch ? ` (${m.branch})` : '');
  }
  return 'Supermercado (Referência Geral)';
}

function obterIdCompra(compra, idx) {
  if (!compra.id) {
    compra.id = 'pur-' + (compra.date || compra.dataISO || Date.now()) + '-' + idx;
  }
  return String(compra.id);
}

window.renderHistoricoUI = function() {
  const container = document.getElementById('historicoListaContainer');
  const emptyState = document.getElementById('historicoVazioContainer');
  const barraSelecao = document.getElementById('barraSelecaoHistorico');
  if (!container) return;

  const historico = obterHistoricoLocal();

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

  const fmt = (typeof formatBRL === 'function') ? formatBRL : (v) => Number(v || 0).toFixed(2);
  if (elTotalMes) elTotalMes.innerText = 'R$ ' + fmt(totalMes);
  if (elMedia) elMedia.innerText = 'R$ ' + fmt(mediaCompra);
  if (elQtd) elQtd.innerText = `${historico.length} compra${historico.length === 1 ? '' : 's'}`;

  const idsValidos = new Set(historico.map((c, i) => obterIdCompra(c, i)));
  selectedHistoryIds.forEach(id => {
    if (!idsValidos.has(id)) selectedHistoryIds.delete(id);
  });

  if (historico.length === 0) {
    container.innerHTML = '';
    emptyState?.classList.remove('hidden');
    barraSelecao?.classList.add('hidden');
    atualizarBarraSelecaoHistorico();
    return;
  }

  emptyState?.classList.add('hidden');
  barraSelecao?.classList.remove('hidden');

  container.innerHTML = historico.map((compra, idx) => {
    const compraId = obterIdCompra(compra, idx);
    const isChecked = selectedHistoryIds.has(compraId);

    const rawData = compra.date || compra.dataISO || compra.data;
    const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Data recente';

    const mercadoNome = resolverNomeMercado(compra);
    const valorTotal = fmt(compra.total || 0);
    const itens = compra.items || compra.itens || [];
    const qtdItens = itens.length || compra.itemCount || 1;
    const economia = Number(compra.savings) || 0;

    return `
      <div class="bg-white p-3.5 rounded-2xl border ${isChecked ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10' : 'border-slate-200'} shadow-2xs transition-all hover:border-slate-300 my-2">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
          <div class="flex items-center space-x-2.5 min-w-0 flex-1">
            <input type="checkbox" 
                   ${isChecked ? 'checked' : ''} 
                   onchange="toggleSelectHistoryItem('${compraId}', this.checked)" 
                   class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0" />
            <div class="min-w-0 truncate cursor-pointer" onclick="abrirDetalhesCompraHistorico(${idx})">
              <strong class="text-xs font-black text-slate-800 block truncate">${esc(mercadoNome)}</strong>              <span class="text-[10px] text-slate-400 block">${dataFormatada}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="text-sm font-black text-emerald-600 block leading-tight">R$ ${valorTotal}</span>
            ${economia > 0 ? `<span class="text-[10px] font-bold text-amber-600">Econ. R$ ${fmt(economia)}</span>` : ''}
          </div>
        </div>

        <div class="flex items-center justify-between pt-2.5 text-xs">
          <span class="text-slate-500 text-[11px] font-semibold">${qtdItens} produto${qtdItens === 1 ? '' : 's'}</span>
          <div class="flex items-center space-x-1.5">
            <button type="button" onclick="abrirDetalhesCompraHistorico(${idx})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer">
              Ver Itens
            </button>
            <button type="button" onclick="restaurarCompraParaCarrinho(${idx})" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer">
              Repetir
            </button>
            <button type="button" onclick="excluirCompraHistorico(${idx})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Excluir este cupom">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  atualizarBarraSelecaoHistorico();
};

window.toggleSelectHistoryItem = function(id, isChecked) {
  if (isChecked) {
    selectedHistoryIds.add(id);
  } else {
    selectedHistoryIds.delete(id);
  }
  atualizarBarraSelecaoHistorico();
  window.renderHistoricoUI();
};

window.toggleSelectAllHistorico = function(isChecked) {
  const historico = obterHistoricoLocal();
  if (isChecked) {
    historico.forEach((c, i) => selectedHistoryIds.add(obterIdCompra(c, i)));
  } else {
    selectedHistoryIds.clear();
  }
  atualizarBarraSelecaoHistorico();
  window.renderHistoricoUI();
};

function atualizarBarraSelecaoHistorico() {
  const total = obterHistoricoLocal().length;
  const selecionadas = selectedHistoryIds.size;

  const checkAll = document.getElementById('checkSelectAllHistorico');
  const contador = document.getElementById('contadorSelecaoHistorico');
  const btnExcluir = document.getElementById('btnExcluirSelecionadosHistorico');
  const labelBtn = document.getElementById('btnExcluirSelecionadosLabel');

  if (checkAll) {
    checkAll.checked = total > 0 && selecionadas === total;
  }
  if (contador) {
    contador.innerText = `${selecionadas} de ${total} selecionada${selecionadas === 1 ? '' : 's'}`;
  }
  if (btnExcluir) {
    if (selecionadas > 0) {
      btnExcluir.classList.remove('hidden');
      if (labelBtn) labelBtn.innerText = `Excluir (${selecionadas})`;
    } else {
      btnExcluir.classList.add('hidden');
    }
  }
}

/**
 * MODAL FLUTUANTE DE DUPLA CONFIRMAÇÃO (SEM POP-UP NATIVO)
 */
function abrirModalConfirmacaoDuplaHistorico(config) {
  fecharModalConfirmacaoDupla();

  const modalEl = document.createElement('div');
  modalEl.id = 'modalConfirmacaoDuplaHistorico';
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200';
  modalEl.onclick = function(e) {
    if (e.target === this) fecharModalConfirmacaoDupla();
  };

  modalEl.innerHTML = `
    <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 border border-slate-200 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span id="labelEtapaConfirmacao" class="text-[11px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Etapa 1 de 2</span>
        </div>
        <button type="button" onclick="fecharModalConfirmacaoDupla()" class="text-slate-400 hover:text-slate-600 text-lg font-bold p-1">✕</button>
      </div>

      <div class="space-y-1.5 text-left">
        <h3 id="tituloConfirmacaoDupla" class="font-black text-slate-800 text-base leading-tight">${config.titulo1}</h3>
        <p id="msgConfirmacaoDupla" class="text-xs text-slate-600 leading-relaxed">${config.mensagem1}</p>
      </div>

      <div id="caixaAcoesConfirmacao" class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
        <button type="button" onclick="fecharModalConfirmacaoDupla()" class="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
          Cancelar
        </button>
        <button type="button" id="btnAvancarConfirmacao" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all">
          Continuar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  const btnAvancar = document.getElementById('btnAvancarConfirmacao');
  btnAvancar.onclick = function() {
    const etapaBadge = document.getElementById('labelEtapaConfirmacao');
    const titulo = document.getElementById('tituloConfirmacaoDupla');
    const msg = document.getElementById('msgConfirmacaoDupla');
    const containerAcoes = document.getElementById('caixaAcoesConfirmacao');

    etapaBadge.className = 'text-[11px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md';
    etapaBadge.innerText = 'Etapa 2 de 2 (Final)';

    titulo.className = 'font-black text-rose-700 text-base leading-tight';
    titulo.innerText = config.titulo2 || 'Confirmação Definitiva';

    msg.className = 'text-xs text-slate-700 leading-relaxed font-semibold';
    msg.innerText = config.mensagem2 || 'Esta ação não poderá ser desfeita. Deseja realmente prosseguir com a exclusão definitiva?';

    containerAcoes.innerHTML = `
      <button type="button" onclick="fecharModalConfirmacaoDupla()" class="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
        Cancelar
      </button>
      <button type="button" id="btnExecutarExclusaoFinal" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all">
        Sim, Excluir Definitivamente
      </button>
    `;

    document.getElementById('btnExecutarExclusaoFinal').onclick = function() {
      fecharModalConfirmacaoDupla();
      config.onConfirmar();
    };
  };
}

function fecharModalConfirmacaoDupla() {
  document.querySelectorAll('#modalConfirmacaoDuplaHistorico').forEach(el => el.remove());
}

// 1. EXCLUSÃO INDIVIDUAL COM MODAL FLUTUANTE
window.excluirCompraHistorico = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  if (!compra) return;

  const mercado = resolverNomeMercado(compra);
  const data = compra.date ? new Date(compra.date).toLocaleDateString('pt-BR') : 'recente';

  abrirModalConfirmacaoDuplaHistorico({
    titulo1: 'Excluir Registro de Compra',
    mensagem1: `Deseja remover o histórico da compra realizada no supermercado "${mercado}" em ${data}?`,
    titulo2: 'Excluir Permanentemente?',
    mensagem2: `Confirmação final: o cupom de "${mercado}" será apagado da memória deste aparelho de forma irreversível.`,
    onConfirmar: () => {
      const id = obterIdCompra(compra, idx);
      selectedHistoryIds.delete(id);

      historico.splice(idx, 1);
      salvarHistoricoLocal(historico);
      window.renderHistoricoUI();
      if (typeof showAppToast === 'function') showAppToast('Cupom excluído com sucesso.', 'info');
    }
  });
};

// 2. EXCLUSÃO EM LOTE (SELECIONADAS) COM MODAL FLUTUANTE
window.excluirHistoricosSelecionados = function() {
  const totalParaApagar = selectedHistoryIds.size;
  if (totalParaApagar === 0) return;

  abrirModalConfirmacaoDuplaHistorico({
    titulo1: 'Excluir Compras Selecionadas',
    mensagem1: `Deseja remover as ${totalParaApagar} compras selecionadas no histórico?`,
    titulo2: 'Confirmar Exclusão em Lote',
    mensagem2: `Atenção: todos os ${totalParaApagar} cupons selecionados serão eliminados permanentemente do histórico.`,
    onConfirmar: () => {
      let historico = obterHistoricoLocal();
      historico = historico.filter((compra, idx) => {
        const id = obterIdCompra(compra, idx);
        return !selectedHistoryIds.has(id);
      });

      selectedHistoryIds.clear();
      salvarHistoricoLocal(historico);
      window.renderHistoricoUI();
      if (typeof showAppToast === 'function') showAppToast(`${totalParaApagar} compras foram excluídas.`, 'info');
    }
  });
};

// 3. LIMPEZA TOTAL COM MODAL FLUTUANTE
window.limparTodoHistorico = function() {
  const historico = obterHistoricoLocal();
  if (historico.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('O histórico já está vazio.', 'info');
    return;
  }

  abrirModalConfirmacaoDuplaHistorico({
    titulo1: 'Limpar Todo o Histórico',
    mensagem1: 'Deseja apagar todos os registros de compras arquivados neste aparelho?',
    titulo2: 'AVISO CRÍTICO: Limpeza Total',
    mensagem2: 'Todas as compras, valores e históricos arquivados serão excluídos em definitivo. Tem certeza?',
    onConfirmar: () => {
      selectedHistoryIds.clear();
      salvarHistoricoLocal([]);
      window.renderHistoricoUI();
      if (typeof showAppToast === 'function') showAppToast('Histórico esvaziado com sucesso.', 'info');
    }
  });
};

// MODAL DE CUPOM (ESTRUTURA IMUTÁVEL)
window.abrirDetalhesCompraHistorico = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  if (!compra) return;

  document.querySelectorAll('#modalDetalhesHistorico').forEach(el => el.remove());

  const rawData = compra.date || compra.dataISO || compra.data;
  const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'Data recente';

  const mercadoNome = resolverNomeMercado(compra);
  const itens = compra.items || compra.itens || [];
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

      <div class="py-3 flex-1 overflow-y-auto min-h-[140px] pr-1">
        ${itensHtml}
      </div>

      <div class="border-t border-slate-100 pt-3 flex items-center justify-between bg-white shrink-0">
        <div>
          <span class="text-[10px] font-bold text-slate-400 block uppercase">Total da Compra</span>
          <strong class="text-lg font-black text-emerald-600 block leading-tight">R$ ${totalFormatado}</strong>
        </div>
        <div class="flex items-center space-x-2">
          <button type="button" onclick="fecharModalDetalhesHistorico()" class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
            Voltar
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
  if (e.key === 'Escape') {
    window.fecharModalDetalhesHistorico();
    fecharModalConfirmacaoDupla();
  }
});

window.restaurarCompraParaCarrinho = function(idx) {
  const historico = obterHistoricoLocal();
  const compra = historico[idx];
  const itens = compra?.items || compra?.itens;

  if (!compra || !Array.isArray(itens) || itens.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('Esta compra não possui itens para restaurar.', 'warning');
    return;
  }

  const mercadoAtivoAtual = activeMarketId;
  const listaProdutos = (typeof products !== 'undefined' && Array.isArray(products))
    ? products
    : (Array.isArray(window.products) ? window.products : []);

  cart = itens.map(it => {
    const nomeItem = (it.name || it.nome || '').trim();
    const marcaItem = (it.selectedBrandId || it.brand || it.marca || 'Padrão').trim();
    const qtdItem = Number(it.quantity || it.quantidade || 1);
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
      id: 'c-item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
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
// ============================================================================
// COMPARADOR HISTÓRICO CONSOLIDADO (DESIGN RESPONSIVO, CORES E TEMA)
// ============================================================================

let modoComparacaoHistoricoAtual = 'catalogo';

// Formatação legível de data (DD/MM/AAAA HH:mm)
function formatarDataHistoricoLegivel(dataStr) {
  if (!dataStr) return 'Data não informada';
  try {
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return String(dataStr);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch (e) {
    return String(dataStr);
  }
}

// Abertura do modal e inicialização dos seletores
window.abrirModalComparadorHistorico = function(indiceOpcional) {
  const modal = document.getElementById('modalHistoricoComparativo');
  const selectCompra = document.getElementById('histSelectCompraComparar');
  const selectMercado = document.getElementById('histSelectMercadoAlvo');
  if (!modal || !selectCompra || !selectMercado) return;

  const listaHistorico = (typeof purchaseHistory !== 'undefined' && Array.isArray(purchaseHistory))
    ? purchaseHistory
    : JSON.parse(localStorage.getItem('supercompras_history') || localStorage.getItem('compras') || '[]');

  if (listaHistorico.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('Nenhuma compra registrada para comparar.', 'info');
    return;
  }

  // Preenche a lista de compras
  selectCompra.innerHTML = listaHistorico.map((compra, i) => {
    const dataFormatada = formatarDataHistoricoLegivel(compra.date || compra.data);
    const totalFormatado = (Number(compra.total) || 0).toFixed(2).replace('.', ',');
    return `<option value="${i}">${compra.marketName || 'Supermercado'} • ${dataFormatada} (R$ ${totalFormatado})</option>`;
  }).join('');

  const idxEscolhido = (indiceOpcional !== undefined && indiceOpcional !== null) ? Number(indiceOpcional) : 0;
  selectCompra.value = idxEscolhido;

  // Preenche a lista de supermercados para destino
  const listaMercados = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets))
    ? supermarkets.filter(m => m && m.id && m.id !== 'm-padrao')
    : [];

  const compraAtual = listaHistorico[idxEscolhido];
  const mercadoOriginalId = compraAtual?.marketId || (typeof activeMarketId !== 'undefined' ? activeMarketId : '');

  selectMercado.innerHTML = listaMercados.map(m => `
    <option value="${m.id}" ${m.id === mercadoOriginalId ? 'selected' : ''}>
      ${m.name} ${m.id === mercadoOriginalId ? '(Mesmo da compra)' : ''}
    </option>
  `).join('');

  modoComparacaoHistoricoAtual = 'catalogo';
  renderizarComparacaoHistoricaAtual();
  modal.classList.remove('hidden');
};

// Aliases para compatibilidade
window.abrirComparadorHistorico = window.abrirModalComparadorHistorico;

window.fecharModalComparadorHistorico = function() {
  const modal = document.getElementById('modalHistoricoComparativo');
  if (modal) modal.classList.add('hidden');
};
window.fecharHistoricoComparador = window.fecharModalComparadorHistorico;

window.atualizarMercadoPadraoDaCompra = function() {
  const selectCompra = document.getElementById('histSelectCompraComparar');
  const selectMercado = document.getElementById('histSelectMercadoAlvo');
  if (!selectCompra || !selectMercado) return;

  const listaHistorico = (typeof purchaseHistory !== 'undefined' && Array.isArray(purchaseHistory))
    ? purchaseHistory
    : JSON.parse(localStorage.getItem('supercompras_history') || localStorage.getItem('compras') || '[]');

  const compra = listaHistorico[Number(selectCompra.value || 0)];
  if (compra && compra.marketId && selectMercado.querySelector(`option[value="${compra.marketId}"]`)) {
    selectMercado.value = compra.marketId;
  }
};

window.alternarModoComparacaoHistorico = function(novoModo) {
  modoComparacaoHistoricoAtual = novoModo;
  const btnCat = document.getElementById('btnModoCompCatalogo');
  const btnCar = document.getElementById('btnModoCompCarrinho');

  if (novoModo === 'catalogo') {
    if (btnCat) btnCat.className = "flex-1 py-1 px-2 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs transition-all cursor-pointer text-center truncate";
    if (btnCar) btnCar.className = "flex-1 py-1 px-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer text-center truncate";
  } else {
    if (btnCar) btnCar.className = "flex-1 py-1 px-2 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs transition-all cursor-pointer text-center truncate";
    if (btnCat) btnCat.className = "flex-1 py-1 px-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer text-center truncate";
  }

  renderizarComparacaoHistoricaAtual();
};

window.toggleDetalhesComparadorItem = function(idx) {
  const gaveta = document.getElementById(`gavetaDetalhesComp_${idx}`);
  const icone = document.getElementById(`iconeSetaItemComp_${idx}`);
  if (!gaveta) return;

  if (gaveta.classList.contains('hidden')) {
    gaveta.classList.remove('hidden');
    if (icone) icone.style.transform = 'rotate(180deg)';
  } else {
    gaveta.classList.add('hidden');
    if (icone) icone.style.transform = 'rotate(0deg)';
  }
};

// Renderização completa da tela comparativa
window.renderizarComparacaoHistoricaAtual = function() {
  const selectCompra = document.getElementById('histSelectCompraComparar');
  const selectMercado = document.getElementById('histSelectMercadoAlvo');
  const cardsResumo = document.getElementById('histCompCardsResumo');
  const listaContainer = document.getElementById('histCompListaItens');
  const boxAlerta = document.getElementById('histCompAlertaSemPreco');
  const textoAlerta = document.getElementById('histCompTextoAlertaSemPreco');
  const badgeQtdNoCarrinho = document.getElementById('histCompQtdNoCarrinho');
  const infoRodape = document.getElementById('histCompInfoRodape');

  if (!selectCompra || !selectMercado || !cardsResumo || !listaContainer) return;

  const listaHistorico = (typeof purchaseHistory !== 'undefined' && Array.isArray(purchaseHistory))
    ? purchaseHistory
    : JSON.parse(localStorage.getItem('supercompras_history') || localStorage.getItem('compras') || '[]');

  const compra = listaHistorico[Number(selectCompra.value || 0)];
  if (!compra || !Array.isArray(compra.items) || compra.items.length === 0) {
    cardsResumo.innerHTML = '';
    listaContainer.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Sem registros nesta compra.</p>';
    if (boxAlerta) boxAlerta.classList.add('hidden');
    return;
  }

  const mercadoAlvoId = selectMercado.value;
  const textoOpcaoMercado = selectMercado.options[selectMercado.selectedIndex]?.text || '';
  const mercadoNomeLimpo = textoOpcaoMercado
    .replace(/\(Mesmo.*?\)/gi, '')
    .replace(/^(supermercados?|mercados?|hipermercados?)\s+/i, '')
    .trim() || 'MERCADO';

  const obterNomeMercadoAtivo = () => {
    if (typeof activeMarketId !== 'undefined' && typeof supermarkets !== 'undefined' && Array.isArray(supermarkets)) {
      const m = supermarkets.find(item => item.id === activeMarketId);
      if (m && m.name) return m.name.replace(/^(supermercados?|mercados?|hipermercados?)\s+/i, '').trim();
    }
    const elHeader = document.querySelector('header strong, header h1, [id*="market"], [id*="Mercado"]');
    if (elHeader && elHeader.textContent) {
      const match = elHeader.textContent.split('•')[0];
      if (match) return match.replace(/^(supermercados?|mercados?|hipermercados?)\s+/i, '').trim();
    }
    return 'MERCADO ATIVO';
  };

  const mercadoAtivoNome = obterNomeMercadoAtivo();

  if (modoComparacaoHistoricoAtual === 'carrinho') {
    selectMercado.disabled = true;
    selectMercado.classList.add('opacity-40', 'cursor-not-allowed');
  } else {
    selectMercado.disabled = false;
    selectMercado.classList.remove('opacity-40', 'cursor-not-allowed');
  }

  const carrinhoAtual = (typeof cart !== 'undefined' && Array.isArray(cart)) ? cart : [];

  const buscarCotacaoMercado = (item, idMercado) => {
    const nomeItem = (item.name || item.nome || '').trim().toLowerCase();
    const idItem = item.productId || item.id;

    const prod = (typeof products !== 'undefined' && Array.isArray(products))
      ? products.find(p => (idItem && p.id === idItem) || (p.name && p.name.trim().toLowerCase() === nomeItem))
      : null;

    if (!prod) return { preco: null, temCotacao: false };

    const marcaNome = (item.selectedBrandId || item.brand || item.marca || 'Padrão').trim().toLowerCase();

    if (Array.isArray(prod.brands)) {
      const bObj = prod.brands.find(b => (b.name || b.id || '').trim().toLowerCase() === marcaNome);
      if (bObj && bObj.marketPrices && bObj.marketPrices[idMercado] && Number(bObj.marketPrices[idMercado]) > 0) {
        return { preco: Number(bObj.marketPrices[idMercado]), temCotacao: true };
      }
    }

    if (prod.marketPrices && prod.marketPrices[idMercado] && Number(prod.marketPrices[idMercado]) > 0) {
      return { preco: Number(prod.marketPrices[idMercado]), temCotacao: true };
    }

    return { preco: null, temCotacao: false };
  };

  const totalPagoFinal = Number(compra.total) || 0;
  let totalComparado = 0;
  let qtdItensSemCotacao = 0;
  let itensPresentesNoCarrinho = 0;

  const itens = compra.items.map((item, idxItem) => {
    const qtd = Number(item.quantity || item.quantidade || 1);
    const precoTabelaUnit = Number(item.price || item.unitPrice || item.basePrice || 0);

    let totalPagoItem = 0;
    let descontoItem = 0;
    if (item.total !== undefined && Number(item.total) > 0) {
      totalPagoItem = Number(item.total);
      descontoItem = Math.max(0, (precoTabelaUnit * qtd) - totalPagoItem);
    } else if (item.subtotal !== undefined && Number(item.subtotal) > 0) {
      totalPagoItem = Number(item.subtotal);
      descontoItem = Math.max(0, (precoTabelaUnit * qtd) - totalPagoItem);
    } else {
      descontoItem = Number(item.discount || item.desconto || 0);
      totalPagoItem = (precoTabelaUnit * qtd) - descontoItem;
    }

    const precoEfetivoUnit = qtd > 0 ? (totalPagoItem / qtd) : precoTabelaUnit;

    const nomeItem = (item.name || item.nome || '').trim().toLowerCase();
    const idItem = item.productId || item.id;
    const marcaItem = (item.selectedBrandId || item.brand || item.marca || 'Padrão').trim().toLowerCase();

    const cotacao = buscarCotacaoMercado(item, mercadoAlvoId);
    const temCotacao = cotacao.temCotacao;
    const precoCatalogoUnit = temCotacao ? cotacao.preco : null;

    const itemNoCarrinho = carrinhoAtual.find(c => {
      const cNome = (c.name || c.nome || '').trim().toLowerCase();
      const cId = c.productId || c.id;
      const cMarca = (c.selectedBrandId || c.brand || c.marca || 'Padrão').trim().toLowerCase();
      return (idItem && cId && idItem === cId) || (nomeItem === cNome && marcaItem === cMarca);
    });

    const estaNoCarrinho = !!itemNoCarrinho;
    if (estaNoCarrinho) itensPresentesNoCarrinho++;

    const precoCarrinhoUnit = estaNoCarrinho 
      ? Number(itemNoCarrinho.unitPrice || itemNoCarrinho.price || itemNoCarrinho.basePrice || 0)
      : null;

    let precoComparadoUnit = null;
    let itemSemPreco = false;

    if (modoComparacaoHistoricoAtual === 'catalogo') {
      if (temCotacao) {
        precoComparadoUnit = precoCatalogoUnit;
      } else {
        itemSemPreco = true;
        qtdItensSemCotacao++;
      }
    } else {
      if (estaNoCarrinho) {
        precoComparadoUnit = precoCarrinhoUnit;
      }
    }

    const subtotalComparado = precoComparadoUnit !== null ? (precoComparadoUnit * qtd) : null;
    if (subtotalComparado !== null) totalComparado += subtotalComparado;

    const diffTotal = subtotalComparado !== null ? (subtotalComparado - totalPagoItem) : null;
    const diffUnitario = precoComparadoUnit !== null ? (precoComparadoUnit - precoEfetivoUnit) : null;
    const perc = (diffTotal !== null && totalPagoItem > 0) ? (diffTotal / totalPagoItem) * 100 : 0;

    return {
      idxItem,
      name: item.name || item.nome || 'Produto',
      brand: item.selectedBrandId || item.brand || item.marca || 'Padrão',
      unit: item.unit || 'un',
      qtd,
      precoTabelaUnit,
      precoEfetivoUnit,
      descontoItem,
      totalPagoItem,
      temCotacao,
      precoCatalogoUnit,
      estaNoCarrinho,
      precoCarrinhoUnit,
      itemSemPreco,
      precoComparadoUnit,
      subtotalComparado,
      diffTotal,
      diffUnitario,
      perc
    };
  });

  if (badgeQtdNoCarrinho) {
    badgeQtdNoCarrinho.textContent = `${itensPresentesNoCarrinho}/${itens.length}`;
  }

  if (boxAlerta) {
    if (modoComparacaoHistoricoAtual === 'catalogo' && qtdItensSemCotacao > 0) {
      textoAlerta.textContent = `${qtdItensSemCotacao} ${qtdItensSemCotacao === 1 ? 'item sem preço' : 'itens sem preço'} no ${mercadoNomeLimpo}.`;
      boxAlerta.classList.remove('hidden');
    } else {
      boxAlerta.classList.add('hidden');
    }
  }

  const diffGeral = totalComparado - totalPagoFinal;
  const percGeral = totalPagoFinal > 0 ? (diffGeral / totalPagoFinal) * 100 : 0;

  let corDiferenca = 'text-slate-500 dark:text-slate-400';
  let sinalDiferenca = '';
  if (diffGeral > 0.05) {
    corDiferenca = 'text-rose-600 dark:text-rose-400';
    sinalDiferenca = '+';
  } else if (diffGeral < -0.05) {
    corDiferenca = 'text-emerald-600 dark:text-emerald-400';
  }

  const rotuloCentral = modoComparacaoHistoricoAtual === 'catalogo'
    ? `No ${mercadoNomeLimpo}`
    : `Lista (${mercadoAtivoNome})`;

  // FITA DE RESUMO COMPACTA
  cardsResumo.innerHTML = `
    <div class="flex flex-col justify-center items-center text-center px-1">
      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Pago</span>
      <strong class="text-xs font-black text-slate-800 dark:text-white">R$ ${totalPagoFinal.toFixed(2).replace('.', ',')}</strong>
    </div>

    <div class="flex flex-col justify-center items-center text-center border-x border-slate-200 dark:border-slate-700/60 px-1">
      <span class="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight truncate max-w-full" title="${rotuloCentral}">
        ${rotuloCentral}
      </span>
      <strong class="text-xs font-black text-amber-600 dark:text-amber-400">R$ ${totalComparado.toFixed(2).replace('.', ',')}</strong>
    </div>

    <div class="flex flex-col justify-center items-center text-center px-1">
      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Variação</span>
      <strong class="text-xs font-black ${corDiferenca} leading-tight">
        ${sinalDiferenca}R$ ${diffGeral.toFixed(2).replace('.', ',')}
        <span class="text-[9px] font-bold opacity-90">(${sinalDiferenca}${percGeral.toFixed(1)}%)</span>
      </strong>
    </div>
  `;

  if (infoRodape) {
    infoRodape.textContent = modoComparacaoHistoricoAtual === 'catalogo'
      ? `Cotação com base na tabela do ${mercadoNomeLimpo}.`
      : `${itensPresentesNoCarrinho} de ${itens.length} itens na lista ativa cotados no ${mercadoAtivoNome}.`;
  }

  // CARTÕES DE ITENS COM SELO EM UMA ÚNICA LINHA
  listaContainer.innerHTML = itens.map(it => {
    let tagBadge = '';
    let bordaCard = 'border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/40';
    let linhaValores = '';

    const strPago = `R$ ${it.totalPagoItem.toFixed(2).replace('.', ',')}`;

    if (modoComparacaoHistoricoAtual === 'catalogo') {
      const strAtual = it.subtotalComparado !== null ? `R$ ${it.subtotalComparado.toFixed(2).replace('.', ',')}` : null;

      if (it.itemSemPreco) {
        bordaCard = 'border border-dashed border-amber-400/80 bg-amber-500/5';
        tagBadge = `<span class="inline-flex items-center text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 px-2 py-0.5 rounded-md whitespace-nowrap">Sem preço</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <strong class="text-slate-800 dark:text-slate-200">${strPago}</strong> <span class="text-amber-600 dark:text-amber-400 text-[10px]">• Sem cotação</span>`;

      } else if (it.diffTotal > 0.05) {
        bordaCard = 'border border-rose-500/50 bg-rose-500/5';
        tagBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">▲ +R$ ${it.diffTotal.toFixed(2).replace('.', ',')}</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <span class="text-slate-700 dark:text-slate-300">${strPago}</span> → <span class="text-slate-500 dark:text-slate-400">Atual:</span> <strong class="text-rose-600 dark:text-rose-400 font-bold">${strAtual}</strong>`;

      } else if (it.diffTotal < -0.05) {
        bordaCard = 'border border-emerald-500/50 bg-emerald-500/5';
        tagBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">▼ -R$ ${Math.abs(it.diffTotal).toFixed(2).replace('.', ',')}</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <span class="text-slate-700 dark:text-slate-300">${strPago}</span> → <span class="text-slate-500 dark:text-slate-400">Atual:</span> <strong class="text-emerald-600 dark:text-emerald-400 font-bold">${strAtual}</strong>`;

      } else {
        tagBadge = `<span class="inline-flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md whitespace-nowrap">Igual</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Total:</span> <strong class="text-slate-800 dark:text-slate-200">${strPago}</strong> <span class="text-slate-400 text-[10px]">(sem variação)</span>`;
      }

    } else {
      const strCarrinho = it.subtotalComparado !== null ? `R$ ${it.subtotalComparado.toFixed(2).replace('.', ',')}` : null;

      if (!it.estaNoCarrinho) {
        tagBadge = `<span class="inline-flex items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md whitespace-nowrap">Fora da lista</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <strong class="text-slate-800 dark:text-slate-200">${strPago}</strong> <span class="text-slate-400 text-[10px]">• Não adicionado</span>`;

      } else if (it.diffTotal > 0.05) {
        bordaCard = 'border border-rose-500/50 bg-rose-500/5';
        tagBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">▲ +R$ ${it.diffTotal.toFixed(2).replace('.', ',')}</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <span class="text-slate-700 dark:text-slate-300">${strPago}</span> → <span class="text-slate-500 dark:text-slate-400">Na lista:</span> <strong class="text-rose-600 dark:text-rose-400 font-bold">${strCarrinho}</strong>`;

      } else if (it.diffTotal < -0.05) {
        bordaCard = 'border border-emerald-500/50 bg-emerald-500/5';
        tagBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">▼ -R$ ${Math.abs(it.diffTotal).toFixed(2).replace('.', ',')}</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <span class="text-slate-700 dark:text-slate-300">${strPago}</span> → <span class="text-slate-500 dark:text-slate-400">Na lista:</span> <strong class="text-emerald-600 dark:text-emerald-400 font-bold">${strCarrinho}</strong>`;

      } else {
        tagBadge = `<span class="inline-flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md whitespace-nowrap">Igual</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Total:</span> <strong class="text-slate-800 dark:text-slate-200">${strPago}</strong> <span class="text-slate-400 text-[10px]">(sem alteração)</span>`;
      }
    }

    const destinoTexto = modoComparacaoHistoricoAtual === 'catalogo' ? mercadoNomeLimpo : mercadoAtivoNome;
    let corDiffUnit = 'text-slate-500 dark:text-slate-400';
    let sinalDiffUnit = '';
    if (it.diffUnitario !== null) {
      if (it.diffUnitario > 0.01) {
        corDiffUnit = 'text-rose-600 dark:text-rose-400';
        sinalDiffUnit = '+';
      } else if (it.diffUnitario < -0.01) {
        corDiffUnit = 'text-emerald-600 dark:text-emerald-400';
      }
    }

    return `
      <div class="rounded-xl overflow-hidden transition-all select-none ${bordaCard}">
        <!-- CABEÇALHO DO ITEM (HORIZONTAL E PROPORCIONAL) -->
        <div class="py-2 px-3 flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-transform" onclick="toggleDetalhesComparadorItem(${it.idxItem})">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 truncate">
              <span class="text-xs font-bold text-slate-900 dark:text-white truncate">${it.name}</span>
              <span style="font-size: 9px; line-height: 1;" class="font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-600/40 px-1.5 py-0.5 rounded shrink-0">${it.brand}</span>
${it.estaNoCarrinho && modoComparacaoHistoricoAtual === 'catalogo' ? `<span style="font-size: 8.5px; line-height: 1;" class="font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 rounded shrink-0">Na lista</span>` : ''}
            </div>
            <div class="text-[11px] mt-0.5 truncate text-slate-600 dark:text-slate-300">
              ${linhaValores}
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${tagBadge}
            <svg id="iconeSetaItemComp_${it.idxItem}" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>

        <!-- GAVETA DE DETALHES COMPACTA -->
        <div id="gavetaDetalhesComp_${it.idxItem}" class="hidden px-3 pb-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] leading-tight">
          
          <!-- BLOCO 1: REGISTRO ORIGINAL -->
          <div class="bg-white dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50 space-y-1">
            <div class="flex justify-between text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">
              <span>REGISTRO ORIGINAL</span>
              <span>${it.qtd} ${it.unit}</span>
            </div>
            <div class="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Preço unitário pago:</span>
              <span>
                ${it.descontoItem > 0 ? `<span class="line-through text-slate-400 mr-1">R$ ${it.precoTabelaUnit.toFixed(2).replace('.', ',')}</span>` : ''}
                <strong class="text-slate-900 dark:text-white font-bold">R$ ${it.precoEfetivoUnit.toFixed(2).replace('.', ',')}</strong> / ${it.unit}
              </span>
            </div>
            ${it.descontoItem > 0 ? `
              <div class="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Desconto deduzido:</span>
                <strong>-R$ ${it.descontoItem.toFixed(2).replace('.', ',')}</strong>
              </div>
            ` : ''}
            <div class="flex justify-between text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-100 dark:border-slate-700/50">
              <span>Subtotal faturado:</span>
              <span>${it.qtd} × R$ ${it.precoEfetivoUnit.toFixed(2).replace('.', ',')} = <strong class="text-slate-900 dark:text-white font-black">R$ ${it.totalPagoItem.toFixed(2).replace('.', ',')}</strong></span>
            </div>
          </div>

          <!-- BLOCO 2: COTAÇÃO HOJE -->
          ${it.precoComparadoUnit !== null ? `
            <div class="bg-white dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50 space-y-1">
              <div class="flex justify-between text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">
                <span>COTAÇÃO (${destinoTexto})</span>
                <span>${it.qtd} ${it.unit}</span>
              </div>
              <div class="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Preço unitário hoje:</span>
                <strong class="text-slate-900 dark:text-white font-bold">R$ ${it.precoComparadoUnit.toFixed(2).replace('.', ',')}</strong> / ${it.unit}
              </div>
              <div class="flex justify-between text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                <span>Subtotal hoje:</span>
                <span>${it.qtd} × R$ ${it.precoComparadoUnit.toFixed(2).replace('.', ',')} = <strong class="text-slate-900 dark:text-white font-black">R$ ${it.subtotalComparado.toFixed(2).replace('.', ',')}</strong></span>
              </div>
            </div>

            <!-- BLOCO 3: RESUMO DE IMPACTO -->
            <div class="flex items-center justify-between px-1 text-slate-500 dark:text-slate-400 text-[9.5px]">
              <span>Variação por ${it.unit}: <strong class="${corDiffUnit}">${sinalDiffUnit}R$ ${it.diffUnitario !== null ? Math.abs(it.diffUnitario).toFixed(2).replace('.', ',') : '0,00'}</strong></span>
              <span>Impacto total: <strong class="${corDiffUnit}">${it.diffTotal > 0 ? '+' : ''}R$ ${it.diffTotal.toFixed(2).replace('.', ',')}</strong></span>
            </div>
          ` : `
            <div class="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[9.5px]">
              Item sem cotação registada para a marca <strong>${it.brand}</strong> no ${destinoTexto}.
            </div>
          `}

        </div>
      </div>
    `;
  }).join('');
};

// Fechamento pela tecla Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharModalComparadorHistorico();
  }
});