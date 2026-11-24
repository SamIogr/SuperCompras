/**
 * SUPERCOMPRAS PRO - CATÁLOGO: SUPERMERCADOS: FILTRO, TROCA DE ID, SELEÇÃO, EXCLUSÃO E MODAL (js/telas/catalogo/mercados.js)
 */

// Filtro de origem da aba Mercados: 'todos' | 'planilha-drive' | 'planilha' | 'drive' | 'local'
let mercadosOrigemFiltro = 'todos';

function filtrarOrigemMercados(origem) {
  mercadosOrigemFiltro = origem;
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
}
window.filtrarOrigemMercados = filtrarOrigemMercados;

/**
 * Troca o id de um mercado em TODOS os lugares onde ele aparece. Usado quando um mercado
 * criado no aparelho (m-custom-...) vai para a planilha e recebe o id oficial (m-nome...).
 * Sem isso os preços cotados nele ficariam presos no id antigo e sumiriam da tela.
 */
function remapearIdMercado(idAntigo, idNovo) {
  if (!idAntigo || !idNovo || idAntigo === idNovo) return;
  const trocarChave = (obj) => {
    if (!obj || typeof obj !== 'object' || !Object.prototype.hasOwnProperty.call(obj, idAntigo)) return;
    if (!Object.prototype.hasOwnProperty.call(obj, idNovo)) obj[idNovo] = obj[idAntigo];
    delete obj[idAntigo];
  };
  (supermarkets || []).forEach(m => { if (m && m.id === idAntigo) m.id = idNovo; });
  (products || []).forEach(p => {
    if (!p) return;
    trocarChave(p.marketPrices);
    (Array.isArray(p.brands) ? p.brands : []).forEach(b => b && trocarChave(b.marketPrices));
  });
  (purchaseHistory || []).forEach(c => { if (c && c.marketId === idAntigo) c.marketId = idNovo; });
  if (activeMarketId === idAntigo) activeMarketId = idNovo;
}
window.remapearIdMercado = remapearIdMercado;

function selecionarMercado(id) {
  recalcularPrecosCarrinhoPorMercado(id);
  switchActiveTab('compras');
  if (typeof showAppToast === 'function') {
    showAppToast(`Supermercado ativo alterado para ${getSelectedMarketName()}!`, 'success');
  }
}
window.selecionarMercado = selecionarMercado;

function excluirMercadoCatalogo(marketId) {
  const m = (supermarkets || []).find(x => x.id === marketId);
  if (!m || m.id === 'm-padrao') return;

  openCustomDialog(
    'Remover Supermercado?',
    `Deseja remover "${m.name}" da lista de redes?`,
    'Sim, Remover',
    null,
    () => {
      supermarkets = supermarkets.filter(x => x.id !== marketId);
      if (activeMarketId === marketId) activeMarketId = 'm-padrao';
      saveAllLocalData();
      if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
      if (typeof renderMarketsUI === 'function') renderMarketsUI();
      if (typeof showAppToast === 'function') showAppToast(`"${m.name}" foi removido.`, 'info');
    }
  );
}
window.excluirMercadoCatalogo = excluirMercadoCatalogo;

function openMarketEditModal(marketId = null) {
  const mercado = marketId ? (supermarkets || []).find(x => x.id === marketId) : null;
  if (window.AppTemplates && typeof window.AppTemplates.renderMarketEditModal === 'function') {
    window.AppTemplates.renderMarketEditModal(mercado);
  }
}
window.openMarketEditModal = openMarketEditModal;

function closeMarketEditModal() {
  document.querySelectorAll('#modalMarketEditDynamic').forEach(el => el.remove());
}
window.closeMarketEditModal = closeMarketEditModal;

function salvarSupermercadoSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = document.getElementById('dinMarketId')?.value;
  const name = (document.getElementById('dinMarketName')?.value || '').trim();
  const branch = (document.getElementById('dinMarketBranch')?.value || '').trim();
  const address = (document.getElementById('dinMarketAddress')?.value || '').trim();
  const promoDay = (document.getElementById('dinMarketPromoDay')?.value || '').trim();

  if (!name) return;

  if (id) {
    const m = supermarkets.find(x => x.id === id);
    if (m) {
      m.name = name;
      m.branch = branch;
      m.address = address;
      m.promoDay = promoDay;
    }
  } else {
    supermarkets.push({
      id: novoId('m-custom-'),
      name: name,
      branch: branch || 'São José dos Pinhais',
      address: address,
      promoDay: promoDay,
      urlEncarte: '',
      notes: '',
      colIndex: null
    });
  }

  saveAllLocalData();
  if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  closeMarketEditModal();
  if (typeof showAppToast === 'function') showAppToast('Supermercado salvo com sucesso!', 'success');
}
window.salvarSupermercadoSubmit = salvarSupermercadoSubmit;

Object.assign(window.AppTemplates, {
  // 7. MODAL DINÂMICO DE SUPERMERCADO
  renderMarketEditModal(mercado) {
    document.querySelectorAll('#modalMarketEditDynamic').forEach(el => el.remove());
    const origem = mercado ? obterOrigem('mercados', mercado) : 'local';
    const podeEnviarPlanilha = Boolean(mercado) && (origem === 'local' || origem === 'drive')
      && typeof scEhAdmin === 'function' && scEhAdmin();

    const modalHtml = `
      <div id="modalMarketEditDynamic" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" data-acao="mercado-modal-fundo">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="font-extrabold text-slate-800 text-base">${mercado ? 'Editar Supermercado' : 'Novo Supermercado'}</h3>
            <button type="button" data-acao="mercado-modal-fechar" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">${this.icons.close}</button>
          </div>

          <form id="formSaveMarketDynamic" data-acao="mercado-modal-salvar" class="space-y-3 pt-3">
            <input type="hidden" id="dinMarketId" value="${esc(mercado ? mercado.id : '')}">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Nome da Rede *</label>
              <input type="text" id="dinMarketName" value="${esc(mercado ? mercado.name : '')}" required placeholder="Ex: Supermercados Goes" class="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Filial / Bairro</label>
              <input type="text" id="dinMarketBranch" value="${esc(mercado ? (mercado.branch || '') : '')}" placeholder="Ex: Afonso Pena" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Endereço Completo</label>
              <input type="text" id="dinMarketAddress" value="${esc(mercado ? (mercado.address || '') : '')}" placeholder="Ex: Av. Rui Barbosa, 1230" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Dias de Promoção / Encarte</label>
              <input type="text" id="dinMarketPromoDay" value="${esc(mercado ? (mercado.promoDay || '') : '')}" placeholder="Ex: Terça e Quarta da Carne" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>

            ${podeEnviarPlanilha ? `
            <div class="bg-sky-50 border border-sky-200 rounded-xl p-2.5 space-y-1.5">
              <p class="text-[11px] text-sky-800">Este mercado existe só neste aparelho${origem === 'drive' ? ' e no seu Drive' : ''}. Enviar para a planilha cria uma coluna de preços para ele.</p>
              <button type="button" id="btnPromoverMercado" data-acao="mercado-planilha" data-admin-only data-id="${esc(mercado.id)}" class="w-full px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer">Enviar este mercado para a planilha</button>
            </div>` : ''}

            <div class="border-t border-slate-100 pt-3 flex items-center justify-end space-x-2 bg-white">
              <button type="button" data-acao="mercado-modal-fechar" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">Cancelar</button>
              <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">Salvar Supermercado</button>
            </div>
          </form>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => document.getElementById('dinMarketName')?.focus(), 50);
  }
});
