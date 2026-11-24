/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CATÁLOGO: MODAL DE CADASTRO/EDIÇÃO DE PRODUTO, MARCAS E PREÇOS POR REDE (js/telas/catalogo/modal-produto.js)
 */

import { variavelGlobal } from '../../compartilhado.js';

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { openProductEditModal, closeProductEditModal, alternarMinimizarRedesModal, renderizarSelectMarcasModal, aoMudarSelectMarcaModal, adicionarMarcaInlineModal, excluirMarcaModalEdicao, renderizarComparativoPrecosModal, salvarPrecoDiretoModal, salvarEdicaoProdutoForm });

let currentCompareBrand = 'Padrão';
let activeCatalogProductId = null;
let redesComparativoMinimizado = true;
variavelGlobal('textoNovaMarcaEmEdicao', '');

Object.assign(window.AppTemplates, {
  // 6. MODAL DINÂMICO DE PRODUTO
  renderProductEditModal(prod) {
    document.querySelectorAll('#modalProductEditDynamic').forEach(el => el.remove());

    const nome = prod ? prod.name : '';
    const cat = prod ? (prod.category || 'Geral') : 'Geral';
    const unit = prod ? (prod.unit || 'un') : 'un';

    const modalContainer = document.createElement('div');
    modalContainer.id = 'modalProductEditDynamic';
    modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs';
    modalContainer.onclick = function(e) {
      if (e.target === this) closeProductEditModal();
    };

    modalContainer.innerHTML = `
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative" style="max-height: 90vh;">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <h3 class="font-extrabold text-slate-800 text-base">${prod ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button type="button" data-acao="produto-modal-fechar" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">${this.icons.close}</button>
        </div>

        <form id="formProductEditModal" data-acao="produto-modal-salvar" class="flex flex-col flex-1 overflow-hidden space-y-3.5 pt-3">
          <div class="space-y-3 overflow-y-auto flex-1 pr-1">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Nome do Produto *</label>
              <input type="text" id="prodModalInputName" value="${esc(nome)}" required class="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Setor / Categoria</label>
                <select id="prodModalInputCat" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
                  <option value="Mercearia e Básicos" ${cat === 'Mercearia e Básicos' ? 'selected' : ''}>Mercearia e Básicos</option>
                  <option value="Açougue e Carnes" ${cat === 'Açougue e Carnes' ? 'selected' : ''}>Açougue e Carnes</option>
                  <option value="Laticínios e Frios" ${cat === 'Laticínios e Frios' ? 'selected' : ''}>Laticínios e Frios</option>
                  <option value="Hortifrúti e Ovos" ${cat === 'Hortifrúti e Ovos' ? 'selected' : ''}>Hortifrúti e Ovos</option>
                  <option value="Higiene e Limpeza" ${cat === 'Higiene e Limpeza' ? 'selected' : ''}>Higiene e Limpeza</option>
                  <option value="Geral" ${cat === 'Geral' ? 'selected' : ''}>Geral</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Unidade</label>
                <select id="prodModalInputUnit" class="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
                  <option value="un" ${unit === 'un' ? 'selected' : ''}>un (Unidade)</option>
                  <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg (Quilo)</option>
                  <option value="g" ${unit === 'g' ? 'selected' : ''}>g (Grama)</option>
                  <option value="l" ${unit === 'l' ? 'selected' : ''}>l (Litro)</option>
                  <option value="ml" ${unit === 'ml' ? 'selected' : ''}>ml (Mililitro)</option>
                  <option value="cx" ${unit === 'cx' ? 'selected' : ''}>cx (Caixa)</option>
                  <option value="pct" ${unit === 'pct' ? 'selected' : ''}>pct (Pacote)</option>
                  <option value="dz" ${unit === 'dz' ? 'selected' : ''}>dz (Dúzia)</option>
                </select>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-extrabold text-slate-800">Marca do Produto</label>
                <span class="text-[10px] text-slate-400">Selecione para cotar</span>
              </div>
              <div id="prodModalBrandsContainer"></div>
              <div id="containerNovaMarcaInline" class="hidden flex items-center space-x-2 pt-1">
                <input type="text" id="inputNovaMarcaCatalogo" placeholder="Nome da nova marca..." data-acao="produto-modal-nova-marca" class="flex-1 text-xs font-bold text-slate-800 bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
                <button type="button" data-acao="produto-modal-nova-marca-adicionar" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0">+ Adicionar</button>
              </div>
            </div>

            <div class="pt-2.5 border-t border-slate-100 space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-extrabold text-slate-800 block">Cotações por Rede</span>
                  <span class="text-[10px] text-slate-500">Marca ativa: <strong id="labelMarcaAtivaCotacoes" class="text-emerald-700">${esc(currentCompareBrand)}</strong></span>
                </div>
                <button type="button" id="btnToggleMinimizarRedes" data-acao="produto-modal-redes-minimizar" class="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-1 shadow-2xs cursor-pointer">
                  <span id="labelToggleMinimizarRedes">${redesComparativoMinimizado ? 'Ver Todas as Redes' : 'Apenas Ativa e Base'}</span>
                </button>
              </div>
              <div id="prodModalPriceList" class="space-y-1.5 pt-1"></div>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-3 flex items-center justify-end space-x-2 shrink-0 bg-white">
            <button type="button" data-acao="produto-modal-fechar" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">Salvar Produto</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(modalContainer);
  },
});

export function openProductEditModal(id = null) {
  const prod = id ? (products || []).find(p => String(p.id) === String(id)) : null;
  activeCatalogProductId = prod ? prod.id : null;
  currentCompareBrand = 'Padrão';
  textoNovaMarcaEmEdicao = '';

  window.AppTemplates.renderProductEditModal(prod);
  renderizarSelectMarcasModal(prod);
  renderizarComparativoPrecosModal(prod);
}

export function closeProductEditModal() {
  document.querySelectorAll('#modalProductEditDynamic').forEach(el => el.remove());
  activeCatalogProductId = null;
  currentCompareBrand = 'Padrão';
  textoNovaMarcaEmEdicao = '';
}

export function alternarMinimizarRedesModal() {
  redesComparativoMinimizado = !redesComparativoMinimizado;
  const label = document.getElementById('labelToggleMinimizarRedes');
  if (label) {
    label.innerText = redesComparativoMinimizado ? 'Ver Todas as Redes' : 'Apenas Ativa e Base';
  }
  const prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));
  renderizarComparativoPrecosModal(prod);
}

export function renderizarSelectMarcasModal(prod) {
  const containerMarcas = document.getElementById('prodModalBrandsContainer');
  if (!containerMarcas) return;

  const marcas = new Set(['Padrão']);
  if (prod && Array.isArray(prod.brands)) {
    prod.brands.forEach(b => marcas.add(typeof b === 'string' ? b : (b.name || b.id)));
  }

  const marcasArr = Array.from(marcas);
  const isNovaMarcaSelecionada = currentCompareBrand === '__NOVA_MARCA__';
  const isCustomBrand = !isNovaMarcaSelecionada && currentCompareBrand.toLowerCase() !== 'padrão';

  containerMarcas.innerHTML = `
    <div class="flex items-center space-x-2">
      <select id="prodModalSelectBrand" data-acao="produto-modal-marca" class="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
        ${marcasArr.map(m => `<option value="${esc(m)}" ${(!isNovaMarcaSelecionada && m.toLowerCase() === currentCompareBrand.toLowerCase()) ? 'selected' : ''}>${esc(m)}</option>`).join('')}
        <option value="__NOVA_MARCA__" ${isNovaMarcaSelecionada ? 'selected' : ''} class="font-extrabold text-emerald-700">+ Nova Marca...</option>
      </select>
      ${isCustomBrand ? `<button type="button" data-acao="produto-modal-marca-excluir" data-marca="${esc(currentCompareBrand)}" class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all border border-rose-200 shrink-0">Excluir</button>` : ''}
    </div>`;

  const boxInline = document.getElementById('containerNovaMarcaInline');
  if (boxInline) {
    if (isNovaMarcaSelecionada) {
      boxInline.classList.remove('hidden');
      const input = document.getElementById('inputNovaMarcaCatalogo');
      if (input) {
        input.value = textoNovaMarcaEmEdicao;
        setTimeout(() => input.focus(), 50);
      }
    } else {
      boxInline.classList.add('hidden');
    }
  }
}

export function aoMudarSelectMarcaModal(valor) {
  const prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));
  if (valor === '__NOVA_MARCA__') {
    currentCompareBrand = '__NOVA_MARCA__';
    const label = document.getElementById('labelMarcaAtivaCotacoes');
    if (label) label.innerText = textoNovaMarcaEmEdicao || 'Nova Marca';
    renderizarSelectMarcasModal(prod);
    renderizarComparativoPrecosModal(prod);
    return;
  }

  currentCompareBrand = (valor || 'Padrão').trim();
  const label = document.getElementById('labelMarcaAtivaCotacoes');
  if (label) label.innerText = currentCompareBrand;

  renderizarSelectMarcasModal(prod);
  renderizarComparativoPrecosModal(prod);
}

export function adicionarMarcaInlineModal() {
  const input = document.getElementById('inputNovaMarcaCatalogo');
  const nomeMarca = (textoNovaMarcaEmEdicao || input?.value || '').trim();
  if (!nomeMarca) return;

  const prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));
  if (prod) {
    if (!prod.brands) prod.brands = [];
    if (!prod.brands.some(b => (b.name || b.id || '').toLowerCase() === nomeMarca.toLowerCase())) {
      prod.brands.push({ id: nomeMarca, name: nomeMarca, marketPrices: {} });
      saveAllLocalData();
    }
  }

  currentCompareBrand = nomeMarca;
  textoNovaMarcaEmEdicao = '';
  if (input) input.value = '';

  const label = document.getElementById('labelMarcaAtivaCotacoes');
  if (label) label.innerText = nomeMarca;

  renderizarSelectMarcasModal(prod);
  renderizarComparativoPrecosModal(prod);
  showAppToast(`Marca "${nomeMarca}" cadastrada!`, 'success');
}

export function excluirMarcaModalEdicao(marca) {
  if (!marca || marca.toLowerCase() === 'padrão') return;
  const prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));
  if (prod && Array.isArray(prod.brands)) {
    prod.brands = prod.brands.filter(b => (b.name || b.id || '').toLowerCase() !== marca.toLowerCase());
    saveAllLocalData();
  }
  currentCompareBrand = 'Padrão';
  renderizarSelectMarcasModal(prod);
  renderizarComparativoPrecosModal(prod);
}

export function renderizarComparativoPrecosModal(prod) {
  const container = document.getElementById('prodModalPriceList');
  if (!container) return;

  const listaCompleta = [
    { id: 'm-padrao', name: 'Mercado', branch: 'Referência Geral (Preço Base)', isRef: true },
    ...(supermarkets || []).filter(m => m.id !== 'm-padrao')
  ];

  const listaExibida = redesComparativoMinimizado
    ? listaCompleta.filter(m => m.id === 'm-padrao' || m.id === activeMarketId)
    : listaCompleta;

  const marcaParaConsultar = (currentCompareBrand === '__NOVA_MARCA__') ? '' : currentCompareBrand;

  container.innerHTML = listaExibida.map(m => {
    const preco = (prod && marcaParaConsultar) ? obterPrecoProdutoMarcaMercado(prod, marcaParaConsultar, m.id) : 0;
    const isAtivaNoApp = m.id === activeMarketId && m.id !== 'm-padrao';
    const nomeExibicaoMarca = marcaParaConsultar || 'Nova Marca';

    return `
      <div class="p-2.5 rounded-xl border ${m.isRef ? 'border-amber-300 bg-amber-50/60' : (isAtivaNoApp ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white')} flex items-center justify-between gap-2 shadow-2xs my-1.5 transition-all">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <strong class="text-xs font-black text-slate-800">${esc(m.name)}</strong>
            <span class="text-[10px] text-slate-500">(${esc(m.branch || 'SJP')})</span>
            ${m.isRef ? `<span class="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">BASE GERAL</span>` : ''}
            ${isAtivaNoApp ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">MERCADO ATIVO</span>` : ''}
          </div>
          <span class="text-[10px] text-slate-400">Marca: <strong>${esc(nomeExibicaoMarca)}</strong></span>
        </div>
        <div class="flex items-center space-x-1.5 shrink-0">
          <span class="text-xs font-semibold text-slate-500">R$</span>
          <input type="text" value="${preco > 0 ? formatBRL(preco) : ''}" placeholder="0,00" data-acao="produto-modal-preco-mercado" data-id="${esc(m.id)}" class="w-20 px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500 outline-none">
        </div>
      </div>`;
  }).join('');
}

export function salvarPrecoDiretoModal(mercadoId, valorStr) {
  const preco = parseNumberInput(valorStr);
  let prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));

  if (!prod) {
    const nomeProv = (document.getElementById('prodModalInputName')?.value || '').trim();
    if (!nomeProv) {
      showAppToast('Preencha o nome do produto antes de cotar.', 'warning');
      return;
    }
    prod = {
      id: novoId('p-custom-'),
      name: nomeProv,
      category: (document.getElementById('prodModalInputCat')?.value || 'Geral').trim(),
      unit: document.getElementById('prodModalInputUnit')?.value || 'un',
      basePrice: 0,
      marketPrices: { 'm-padrao': 0 },
      brands: []
    };
    products.unshift(prod);
    activeCatalogProductId = prod.id;
  }

  let marcaAlvo = currentCompareBrand;
  if (marcaAlvo === '__NOVA_MARCA__') {
    const input = document.getElementById('inputNovaMarcaCatalogo');
    marcaAlvo = (textoNovaMarcaEmEdicao || input?.value || '').trim() || 'Padrão';
    currentCompareBrand = marcaAlvo;
  }

  atualizarPrecoUnificado(prod.id, marcaAlvo, mercadoId, preco);
  showAppToast(`Preço de "${marcaAlvo}" salvo!`, 'success');
}

export function salvarEdicaoProdutoForm(e) {
  if (e && e.preventDefault) e.preventDefault();

  const modal = document.getElementById('modalProductEditDynamic');
  const inputNome = modal?.querySelector('#prodModalInputName');
  const inputCat = modal?.querySelector('#prodModalInputCat');
  const selectUnit = modal?.querySelector('#prodModalInputUnit');
  const selectMarca = modal?.querySelector('#prodModalSelectBrand');
  const inputNovaMarca = modal?.querySelector('#inputNovaMarcaCatalogo');

  const nome = (inputNome?.value || '').trim();
  if (!nome) {
    showAppToast('Informe o nome do produto.', 'warning');
    return;
  }

  const categoria = (inputCat?.value || 'Geral').trim();
  const unidade = selectUnit?.value || 'un';
  const valorSelect = selectMarca ? selectMarca.value : 'Padrão';
  const textoDigitado = (textoNovaMarcaEmEdicao || inputNovaMarca?.value || '').trim();

  let marcaFinal = 'Padrão';
  if (valorSelect === '__NOVA_MARCA__' || currentCompareBrand === '__NOVA_MARCA__') {
    marcaFinal = textoDigitado || 'Padrão';
  } else if (valorSelect) {
    marcaFinal = valorSelect.trim();
  }

  let prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));
  if (!prod) {
    prod = {
      id: novoId('p-custom-'),
      name: nome,
      category: categoria,
      unit: unidade,
      basePrice: 0,
      marketPrices: { 'm-padrao': 0 },
      brands: []
    };
    products.unshift(prod);
  } else {
    prod.name = nome;
    prod.category = categoria;
    prod.unit = unidade;
  }

  if (marcaFinal.toLowerCase() !== 'padrão') {
    if (!prod.brands) prod.brands = [];
    if (!prod.brands.some(b => (b.name || b.id || '').toLowerCase() === marcaFinal.toLowerCase())) {
      prod.brands.push({ id: marcaFinal, name: marcaFinal, marketPrices: {} });
    }
  }

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();
  showAppToast(`Produto "${nome}" salvo!`, 'success');
}
