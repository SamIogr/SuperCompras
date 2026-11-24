/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - HISTÓRICO: EXCLUSÃO COM DUPLA CONFIRMAÇÃO (js/telas/historico/exclusao.js)
 */

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { abrirModalConfirmacaoDuplaHistorico, fecharModalConfirmacaoDupla });

/**
 * MODAL FLUTUANTE DE DUPLA CONFIRMAÇÃO (SEM POP-UP NATIVO)
 */
export function abrirModalConfirmacaoDuplaHistorico(config) {
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
        <button type="button" data-acao="historico-confirmacao-fechar" class="text-slate-400 hover:text-slate-600 text-lg font-bold p-1">✕</button>
      </div>

      <div class="space-y-1.5 text-left">
        <h3 id="tituloConfirmacaoDupla" class="font-black text-slate-800 text-base leading-tight">${esc(config.titulo1)}</h3>
        <p id="msgConfirmacaoDupla" class="text-xs text-slate-600 leading-relaxed">${esc(config.mensagem1)}</p>
      </div>

      <div id="caixaAcoesConfirmacao" class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
        <button type="button" data-acao="historico-confirmacao-fechar" class="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
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
      <button type="button" data-acao="historico-confirmacao-fechar" class="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
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

export function fecharModalConfirmacaoDupla() {
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
