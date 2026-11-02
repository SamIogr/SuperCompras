/**
 * SUPERCOMPRAS PRO - CATÁLOGO MESTRE DE PRODUTOS (js/products.js)
 */

let catalogSortMode = 'az';
let currentCompareBrand = 'Padrão';
let activeCatalogProductId = null;
let redesComparativoMinimizado = true;
let textoNovaMarcaEmEdicao = '';

// 1. OBTENÇÃO DE PREÇOS POR PRODUTO, MARCA E SUPERMERCADO
function obterPrecoProdutoMarcaMercado(prod, marcaNome, mercadoId) {
  if (!prod) return 0;
  const mercado = mercadoId || activeMarketId || 'm-padrao';
  const marca = (marcaNome || 'Padrão').trim().toLowerCase();

  if (marca === 'padrão' || marca === 'padrao') {
    if (prod.marketPrices && prod.marketPrices[mercado] !== undefined && Number(prod.marketPrices[mercado]) > 0) {
      return Number(prod.marketPrices[mercado]);
    }
    if (mercado === 'm-padrao') {
      return Number(prod.basePrice) || 0;
    }
    return 0;
  }

  if (Array.isArray(prod.brands)) {
    const bObj = prod.brands.find(b => (b.name || b.id || '').toLowerCase() === marca);
    if (bObj && bObj.marketPrices && bObj.marketPrices[mercado] !== undefined && Number(bObj.marketPrices[mercado]) > 0) {
      return Number(bObj.marketPrices[mercado]);
    }
  }

  return 0;
}

// 2. RENDERIZAÇÃO DO CATÁLOGO DE PRODUTOS (NOME ÚNICO: renderCatalogUI)
function renderCatalogUI() {
  const container = document.getElementById('lista-produtos');
  const badgeTotal = document.getElementById('badge-total-produtos');
  const lista = Array.isArray(products) ? products : [];

  if (badgeTotal) badgeTotal.textContent = lista.length;
  if (!container) return;

  const visiveis = obterListaProdutosFiltrada();

  if (visiveis.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 my-2">
        <p class="text-xs font-bold text-slate-600">Nenhum produto encontrado no catálogo.</p>
      </div>`;
    return;
  }

  const nomeMercadoAtivo = getSelectedMarketName();

  container.innerHTML = visiveis.map(prod => {
    const isLocal = String(prod.id).startsWith('p-custom-') || String(prod.id).startsWith('p-local-');
    const precoBase = Number(prod.basePrice) || (prod.marketPrices ? Number(prod.marketPrices['m-padrao']) : 0) || 0;

    let cotacaoMercado = null;
    if (activeMarketId === 'm-padrao') {
      cotacaoMercado = precoBase > 0 ? precoBase : null;
    } else if (prod.marketPrices && Number(prod.marketPrices[activeMarketId]) > 0) {
      cotacaoMercado = Number(prod.marketPrices[activeMarketId]);
    }

    const baseStr = precoBase > 0 ? `R$ ${formatBRL(precoBase)}` : 'A definir';
    const cotacaoStr = cotacaoMercado ? `R$ ${formatBRL(cotacaoMercado)}` : 'Sem cotação';
    const qtdMarcas = Array.isArray(prod.brands) ? prod.brands.length : 0;

    return `
      <div class="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-3 my-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2 flex-wrap">
            <strong class="font-extrabold text-sm text-slate-800 truncate">${prod.name}</strong>
            ${isLocal 
              ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Local</span>` 
              : `<span class="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Nuvem</span>`}
            <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md border border-slate-200/60">${prod.category || 'Geral'}</span>
            <span class="text-[10px] text-slate-400 font-semibold">${prod.unit || 'un'}</span>
            ${qtdMarcas > 0 ? `<span class="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">+${qtdMarcas} marca${qtdMarcas > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="text-xs text-slate-500 mt-1 truncate">
            Base: <span class="font-bold text-slate-700">${baseStr}</span> • 
            No ${nomeMercadoAtivo}: <span class="font-bold ${cotacaoMercado ? 'text-emerald-700' : 'text-slate-400'}">${cotacaoStr}</span>
          </div>
        </div>

        <div class="flex items-center space-x-1.5 shrink-0">
          <button type="button" onclick="openProductEditModal('${prod.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Editar produto">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          </button>
          <button type="button" onclick="askDeleteSingleProduct('${prod.id}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors" title="Excluir produto">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
          <button type="button" onclick="quickAddToCartFromCatalog('${prod.id}')" class="p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all shadow-xs" title="Adicionar ao carrinho">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function obterListaProdutosFiltrada() {
  const input = document.getElementById('input-busca-produtos');
  const query = (input?.value || '').toLowerCase().trim();

  const lista = (Array.isArray(products) ? products : []).filter(p => {
    if (!p || !p.name) return false;
    const nome = p.name.toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return !query || nome.includes(query) || cat.includes(query);
  });

  lista.sort((a, b) => {
    const nomeA = (a.name || '').trim();
    const nomeB = (b.name || '').trim();
    if (catalogSortMode === 'za' || catalogSortMode === 'nome-desc') {
      return nomeB.localeCompare(nomeA, 'pt-BR');
    }
    if (catalogSortMode === 'setor') {
      const catComp = (a.category || '').localeCompare(b.category || '', 'pt-BR');
      return catComp !== 0 ? catComp : nomeA.localeCompare(nomeB, 'pt-BR');
    }
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });

  return lista;
}

function filtrarProdutosCatalogo() {
  renderCatalogUI();
}

function ordenarProdutosCatalogo() {
  const select = document.getElementById('select-ordenacao-produtos');
  if (select) catalogSortMode = select.value;
  renderCatalogUI();
}

// 3. MODAL DE EDIÇÃO DE PRODUTO, MARCAS E COTAÇÕES (NOME ÚNICO: openProductEditModal)
function openProductEditModal(id = null) {
  let prod = null;
  if (id) {
    prod = (products || []).find(p => String(p.id) === String(id));
  }

  activeCatalogProductId = prod ? prod.id : null;
  currentCompareBrand = 'Padrão';
  textoNovaMarcaEmEdicao = '';

  document.querySelectorAll('#modalProductEdit').forEach(el => el.remove());

  const nome = prod ? prod.name : '';
  const cat = prod ? (prod.category || 'Geral') : 'Geral';
  const unit = prod ? (prod.unit || 'un') : 'un';

  const modalContainer = document.createElement('div');
  modalContainer.id = 'modalProductEdit';
  modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs';
  modalContainer.onclick = function(e) {
    if (e.target === this) closeProductEditModal();
  };

  modalContainer.innerHTML = `
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative" style="max-height: 90vh;">
      
      <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
        <h3 class="font-extrabold text-slate-800 text-base">${prod ? 'Editar Produto' : 'Novo Produto'}</h3>
        <button type="button" onclick="closeProductEditModal()" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors" title="Fechar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <form id="formProductEditModal" onsubmit="salvarEdicaoProdutoForm(event)" class="flex flex-col flex-1 overflow-hidden space-y-3.5 pt-3">
        
        <div class="space-y-3 overflow-y-auto flex-1 pr-1">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Nome do Produto *</label>
            <input type="text" id="prodModalInputName" value="${nome}" required class="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Setor / Categoria</label>
              <input type="text" id="prodModalInputCat" value="${cat}" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
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
              </select>
            </div>
          </div>

          <!-- SEÇÃO: MARCA DO PRODUTO -->
          <div class="pt-2 border-t border-slate-100 space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-extrabold text-slate-800">Marca do Produto</label>
              <span class="text-[10px] text-slate-400">Selecione para cotar</span>
            </div>

            <div id="prodModalBrandsContainer"></div>

            <!-- Campo Inline quando "+ Nova Marca..." está selecionada -->
            <div id="containerNovaMarcaInline" class="hidden flex items-center space-x-2 pt-1">
              <input type="text" 
                     id="inputNovaMarcaCatalogo" 
                     placeholder="Nome da nova marca (salva direto ao gravar)..." 
                     oninput="textoNovaMarcaEmEdicao = this.value"
                     onkeydown="if(event.key === 'Enter'){ event.preventDefault(); adicionarMarcaInlineModal(); }"
                     class="flex-1 text-xs font-bold text-slate-800 bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
              <button type="button" 
                      onclick="adicionarMarcaInlineModal()" 
                      class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0">
                + Adicionar Marca
              </button>
            </div>
          </div>

          <!-- SEÇÃO: COTAÇÕES NOS SUPERMERCADOS DA MARCA ATIVA -->
          <div class="pt-2.5 border-t border-slate-100 space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-extrabold text-slate-800 block">Cotações por Rede</span>
                <span class="text-[10px] text-slate-500">Marca ativa: <strong id="labelMarcaAtivaCotacoes" class="text-emerald-700">${currentCompareBrand}</strong></span>
              </div>
              <button type="button" id="btnToggleMinimizarRedes" onclick="alternarMinimizarRedesModal()" class="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-1 shadow-2xs">
                <span id="labelToggleMinimizarRedes">${redesComparativoMinimizado ? '📋 Ver Todas as Redes' : '👁️ Apenas Ativa + Base'}</span>
              </button>
            </div>

            <div id="prodModalPriceList" class="space-y-1.5 pt-1"></div>
          </div>
        </div>

        <div class="border-t border-slate-100 pt-3 flex items-center justify-end space-x-2 shrink-0 bg-white">
          <button type="button" onclick="closeProductEditModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            Cancelar
          </button>
          <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all">
            Salvar Produto
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalContainer);

  renderizarSelectMarcasModal(prod);
  renderizarComparativoPrecosModal(prod);
}

function closeProductEditModal() {
  document.querySelectorAll('#modalProductEdit').forEach(el => el.remove());
  activeCatalogProductId = null;
  currentCompareBrand = 'Padrão';
  textoNovaMarcaEmEdicao = '';
}

function alternarMinimizarRedesModal() {
  redesComparativoMinimizado = !redesComparativoMinimizado;
  const label = document.getElementById('labelToggleMinimizarRedes');
  if (label) {
    label.innerText = redesComparativoMinimizado ? '📋 Ver Todas as Redes' : '👁️ Apenas Ativa + Base';
  }
  const prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));
  renderizarComparativoPrecosModal(prod);
}

function renderizarSelectMarcasModal(prod) {
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
      <select id="prodModalSelectBrand" 
              onchange="aoMudarSelectMarcaModal(this.value)" 
              class="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
        ${marcasArr.map(m => `
          <option value="${m}" ${(!isNovaMarcaSelecionada && m.toLowerCase() === currentCompareBrand.toLowerCase()) ? 'selected' : ''}>
            🏷️ ${m}
          </option>
        `).join('')}
        <option value="__NOVA_MARCA__" ${isNovaMarcaSelecionada ? 'selected' : ''} class="font-extrabold text-emerald-700">
          + Nova Marca...
        </option>
      </select>

      ${isCustomBrand ? `
        <button type="button" 
                onclick="excluirMarcaModalEdicao('${currentCompareBrand}')" 
                class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all border border-rose-200 shrink-0" 
                title="Excluir marca selecionada">
          Excluir
        </button>
      ` : ''}
    </div>
  `;

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

function aoMudarSelectMarcaModal(valor) {
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

function adicionarMarcaInlineModal() {
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
  showAppToast(`Marca "${nomeMarca}" cadastrada e selecionada!`, 'success');
}

function excluirMarcaModalEdicao(marca) {
  if (!marca || marca.toLowerCase() === 'padrão') return;
  if (!confirm(`Deseja remover a marca "${marca}" deste produto?`)) return;

  const prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));
  if (prod && Array.isArray(prod.brands)) {
    prod.brands = prod.brands.filter(b => (b.name || b.id || '').toLowerCase() !== marca.toLowerCase());
    saveAllLocalData();
  }

  currentCompareBrand = 'Padrão';
  const label = document.getElementById('labelMarcaAtivaCotacoes');
  if (label) label.innerText = 'Padrão';

  renderizarSelectMarcasModal(prod);
  renderizarComparativoPrecosModal(prod);
}

function renderizarComparativoPrecosModal(prod) {
  const container = document.getElementById('prodModalPriceList');
  if (!container) return;

  const listaCompleta = [
    { id: 'm-padrao', name: 'Mercado', branch: 'Referência Geral (Preço Base)', isRef: true },
    ...(supermarkets || []).filter(m => m.id !== 'm-padrao')
  ];

  let listaExibida = listaCompleta;
  if (redesComparativoMinimizado) {
    listaExibida = listaCompleta.filter(m => m.id === 'm-padrao' || m.id === activeMarketId);
  }

  const marcaParaConsultar = (currentCompareBrand === '__NOVA_MARCA__') ? '' : currentCompareBrand;

  container.innerHTML = listaExibida.map(m => {
    let preco = 0;
    if (prod && marcaParaConsultar) {
      preco = obterPrecoProdutoMarcaMercado(prod, marcaParaConsultar, m.id);
    }

    const isAtivaNoApp = m.id === activeMarketId && m.id !== 'm-padrao';
    const nomeExibicaoMarca = marcaParaConsultar || 'Nova Marca';

    return `
      <div class="p-2.5 rounded-xl border ${m.isRef ? 'border-amber-300 bg-amber-50/60' : (isAtivaNoApp ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white')} flex items-center justify-between gap-2 shadow-2xs my-1.5 transition-all">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <strong class="text-xs font-black text-slate-800">${m.name}</strong>
            <span class="text-[10px] text-slate-500">(${m.branch || 'SJP'})</span>
            ${m.isRef ? `<span class="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">BASE GERAL</span>` : ''}
            ${isAtivaNoApp ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">MERCADO ATIVO</span>` : ''}
          </div>
          <span class="text-[10px] text-slate-400">Marca: <strong>${nomeExibicaoMarca}</strong></span>
        </div>
        <div class="flex items-center space-x-1.5 shrink-0">
          <span class="text-xs font-semibold text-slate-500">R$</span>
          <input type="text" 
                 value="${preco > 0 ? formatBRL(preco) : ''}" 
                 placeholder="0,00"
                 onchange="salvarPrecoDiretoModal('${m.id}', this.value)"
                 class="w-20 px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500 outline-none">
        </div>
      </div>
    `;
  }).join('');

  if (redesComparativoMinimizado && listaCompleta.length > listaExibida.length) {
    const ocultas = listaCompleta.length - listaExibida.length;
    container.innerHTML += `
      <div class="text-center pt-1">
        <button type="button" onclick="alternarMinimizarRedesModal()" class="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline">
          + Exibir mais ${ocultas} rede${ocultas === 1 ? '' : 's'} de supermercados...
        </button>
      </div>
    `;
  }
}

function salvarPrecoDiretoModal(mercadoId, valorStr) {
  const preco = parseNumberInput(valorStr);
  let prod = (products || []).find(p => String(p.id) === String(activeCatalogProductId));

  if (!prod) {
    const nomeProv = (document.getElementById('prodModalInputName')?.value || '').trim();
    if (!nomeProv) {
      showAppToast('Preencha o nome do produto antes de cotar.', 'warning');
      return;
    }
    prod = {
      id: 'p-custom-' + Date.now(),
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
    const nomeDigitado = (textoNovaMarcaEmEdicao || input?.value || '').trim();
    marcaAlvo = nomeDigitado || 'Padrão';
    currentCompareBrand = marcaAlvo;
  }

  atualizarPrecoUnificado(prod.id, marcaAlvo, mercadoId, preco);
  showAppToast(`Preço de "${marcaAlvo}" salvo!`, 'success');
}

function salvarEdicaoProdutoForm(e) {
  if (e && e.preventDefault) e.preventDefault();

  const modal = document.getElementById('modalProductEdit');
  const inputNome = modal ? modal.querySelector('#prodModalInputName') : document.getElementById('prodModalInputName');
  const inputCat = modal ? modal.querySelector('#prodModalInputCat') : document.getElementById('prodModalInputCat');
  const selectUnit = modal ? modal.querySelector('#prodModalInputUnit') : document.getElementById('prodModalInputUnit');
  const selectMarca = modal ? modal.querySelector('#prodModalSelectBrand') : document.getElementById('prodModalSelectBrand');
  const inputNovaMarca = modal ? modal.querySelector('#inputNovaMarcaCatalogo') : document.getElementById('inputNovaMarcaCatalogo');

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
      id: 'p-custom-' + Date.now(),
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

  currentCompareBrand = marcaFinal;
  textoNovaMarcaEmEdicao = '';

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();
  showAppToast(`Produto salvo com a marca "${marcaFinal}"!`, 'success');
}

function askDeleteSingleProduct(id) {
  const prod = (products || []).find(p => String(p.id) === String(id));
  if (!prod) return;

  if (confirm(`Excluir permanentemente o produto "${prod.name}" do catálogo?`)) {
    products = (products || []).filter(p => String(p.id) !== String(id));
    cart = (cart || []).filter(c => String(c.productId) !== String(id));
    saveAllLocalData();
    saveCartData();
    renderCatalogUI();
    showAppToast('Produto excluído.', 'info');
  }
}

function quickAddToCartFromCatalog(id) {
  const prod = (products || []).find(p => String(p.id) === String(id));
  if (!prod) return;

  const preco = obterPrecoProdutoMarcaMercado(prod, 'Padrão', activeMarketId);

  cart.unshift({
    id: 'c-item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    productId: prod.id,
    selectedBrandId: 'Padrão',
    name: prod.name,
    category: prod.category || 'Geral',
    unit: prod.unit || 'un',
    unitPrice: preco,
    quantity: 1,
    checked: false,
    promo: { type: 'none' }
  });

  saveCartData();
  renderCartUI();
  playAppBeep('add');
  showAppToast(`"${prod.name}" adicionado ao carrinho!`, 'success');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeProductEditModal();
});