/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - HISTÓRICO: LISTA DE COMPRAS, MÉTRICAS DO MÊS E SELEÇÃO (js/telas/historico/lista.js)
 */

import { variavelGlobal } from '../../compartilhado.js';

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { atualizarBarraSelecaoHistorico });

variavelGlobal('selectedHistoryIds', new Set());

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
    const rawData = h.date;
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

    const rawData = compra.date;
    const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Data recente';

    const mercadoNome = resolverNomeMercado(compra);
    const valorTotal = fmt(compra.total || 0);
    const itens = compra.items || [];
    const qtdItens = itens.length || compra.itemCount || 1;
    const economia = Number(compra.savings) || 0;

    return `
      <div class="bg-white p-3.5 rounded-2xl border ${isChecked ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10' : 'border-slate-200'} shadow-2xs transition-all hover:border-slate-300 my-2">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
          <div class="flex items-center space-x-2.5 min-w-0 flex-1">
            <input type="checkbox" 
                   ${isChecked ? 'checked' : ''} 
                   data-acao="historico-marcar" data-id="${esc(compraId)}" 
                   class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0" />
            <div class="min-w-0 truncate cursor-pointer" data-acao="historico-detalhes" data-idx="${idx}">
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
            <button type="button" data-acao="historico-detalhes" data-idx="${idx}" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer">
              Ver Itens
            </button>
            <button type="button" data-acao="historico-comparar" data-idx="${idx}" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer" title="Comparar preço desta compra com os preços atuais e a lista ativa">
              Comparar
            </button>
            <button type="button" data-acao="historico-repetir" data-idx="${idx}" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer">
              Repetir
            </button>
            <button type="button" data-acao="historico-excluir" data-idx="${idx}" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Excluir este cupom">
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

export function atualizarBarraSelecaoHistorico() {
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
