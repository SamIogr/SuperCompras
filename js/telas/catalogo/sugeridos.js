/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CATÁLOGO: IMPORTAR ITENS BÁSICOS SUGERIDOS (js/telas/catalogo/sugeridos.js)
 */

// MODAL DE IMPORTAÇÃO SELETIVA DE ITENS BÁSICOS (ANTI-DUPLICAÇÃO)
window.abrirModalCatalogoSugerido = function() {
  document.querySelectorAll('#modalCatalogoSugerido').forEach(el => el.remove());

  const itensFonte = window.ITENS_BASICOS_SUGERIDOS || [];
  const nomesCadastrados = new Set(
    (products || []).map(p => (p.name || '').trim().toLowerCase())
  );

  const modalEl = document.createElement('div');
  modalEl.id = 'modalCatalogoSugerido';
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs';
  modalEl.onclick = function(e) {
    if (e.target === this) window.fecharModalCatalogoSugerido();
  };

  const categoriasMap = {};
  itensFonte.forEach((item, index) => {
    if (!categoriasMap[item.category]) categoriasMap[item.category] = [];
    categoriasMap[item.category].push({ ...item, originalIndex: index });
  });

  let corpoHtml = '';
  Object.keys(categoriasMap).forEach(cat => {
    corpoHtml += `
      <div class="space-y-1.5 pt-2">
        <span class="text-[11px] font-black uppercase tracking-wider text-slate-500 block px-1">${cat}</span>
        <div class="space-y-1">
          ${categoriasMap[cat].map(it => {
            const jaExiste = nomesCadastrados.has(it.name.toLowerCase());
            return `
              <label class="flex items-center justify-between p-2 rounded-xl border ${jaExiste ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed' : 'bg-slate-50 hover:bg-emerald-50/50 border-slate-200 cursor-pointer'} text-xs transition-colors">
                <div class="flex items-center space-x-2.5 min-w-0 pr-2">
                  <input type="checkbox" 
                         name="chkSugeridoItem" 
                         value="${it.originalIndex}" 
                         ${jaExiste ? 'disabled' : 'checked'}
                         data-acao="sugeridos-contar"
                         class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 ${jaExiste ? 'cursor-not-allowed' : 'cursor-pointer'}" />
                  <span class="font-bold text-slate-800 truncate">${it.name}</span>
                </div>
                <div class="flex items-center space-x-2 shrink-0">
                  <span class="text-[10px] bg-white border border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-md">${it.unit}</span>
                  ${jaExiste ? '<span class="text-[9px] bg-slate-200 text-slate-600 font-black px-1.5 py-0.5 rounded">Cadastrado</span>' : ''}
                </div>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  modalEl.innerHTML = `
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative" style="max-height: 88vh;">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
        <div>
          <h3 class="font-extrabold text-slate-800 text-base">Adicionar Itens Frequentes</h3>
          <p class="text-xs text-slate-500 mt-0.5">Selecione os itens básicos que deseja incluir no catálogo</p>
        </div>
        <button type="button" data-acao="sugeridos-fechar" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div class="flex items-center justify-between py-2 border-b border-slate-100 text-xs shrink-0 bg-white">
        <div class="flex items-center space-x-2">
          <button type="button" data-acao="sugeridos-marcar-todos" data-marcar="1" class="text-emerald-700 hover:underline font-bold text-[11px]">Marcar Todos</button>
          <span class="text-slate-300">•</span>
          <button type="button" data-acao="sugeridos-marcar-todos" data-marcar="0" class="text-slate-500 hover:underline font-bold text-[11px]">Desmarcar</button>
        </div>
        <span id="badgeContadorSugeridos" class="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">0 selecionados</span>
      </div>

      <div class="flex-1 overflow-y-auto pr-1 space-y-3 py-2">
        ${corpoHtml}
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0 bg-white">
        <button type="button" data-acao="sugeridos-fechar" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
          Cancelar
        </button>
        <button type="button" id="btnConfirmarInclusaoSugeridos" data-acao="sugeridos-adicionar" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer">
          <span>Adicionar ao Catálogo</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);
  window.atualizarContadorModalSugeridos();
};

window.fecharModalCatalogoSugerido = function() {
  document.querySelectorAll('#modalCatalogoSugerido').forEach(el => el.remove());
};

window.toggleSelectAllSugeridos = function(marcar) {
  document.querySelectorAll('#modalCatalogoSugerido input[name="chkSugeridoItem"]:not([disabled])').forEach(chk => {
    chk.checked = marcar;
  });
  window.atualizarContadorModalSugeridos();
};

window.atualizarContadorModalSugeridos = function() {
  const selecionados = document.querySelectorAll('#modalCatalogoSugerido input[name="chkSugeridoItem"]:checked').length;
  const badge = document.getElementById('badgeContadorSugeridos');
  const btn = document.getElementById('btnConfirmarInclusaoSugeridos');

  if (badge) badge.innerText = `${selecionados} selecionado${selecionados === 1 ? '' : 's'}`;
  if (btn) {
    btn.disabled = selecionados === 0;
    btn.classList.toggle('opacity-50', selecionados === 0);
    btn.classList.toggle('cursor-not-allowed', selecionados === 0);
  }
};

window.adicionarItensSugeridosSelecionados = function() {
  const checkboxes = Array.from(document.querySelectorAll('#modalCatalogoSugerido input[name="chkSugeridoItem"]:checked'));
  if (checkboxes.length === 0) return;

  const itensFonte = window.ITENS_BASICOS_SUGERIDOS || [];
  if (!Array.isArray(products)) products = [];

  const nomesExistentes = new Set(products.map(p => (p.name || '').trim().toLowerCase()));
  let adicionados = 0;

  checkboxes.forEach((chk, i) => {
    const itemData = itensFonte[parseInt(chk.value, 10)];
    if (!itemData) return;

    const nomeNormalizado = itemData.name.trim().toLowerCase();
    if (nomesExistentes.has(nomeNormalizado)) return;

    products.push({
      id: novoId('p-custom-'),
      name: itemData.name,
      category: itemData.category,
      unit: itemData.unit,
      basePrice: 0,
      marketPrices: { 'm-padrao': 0 },
      brands: []
    });
    nomesExistentes.add(nomeNormalizado);
    adicionados++;
  });

  if (adicionados > 0) {
    saveAllLocalData();
    renderCatalogUI();
    showAppToast(`${adicionados} produto${adicionados > 1 ? 's adicionados' : ' adicionado'} ao catálogo!`, 'success');
  } else {
    showAppToast('Nenhum item novo precisou ser adicionado.', 'info');
  }

  window.fecharModalCatalogoSugerido();
};
window.selectedCatalogProductIds = window.selectedCatalogProductIds || new Set();

export {};
