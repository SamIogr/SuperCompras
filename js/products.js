/**
 * SUPERCOMPRAS PRO - LÓGICA DO CATÁLOGO DE PRODUTOS (js/products.js)
 */

let catalogSortMode = 'az';
let catalogOrigemFiltro = 'todos';
let catalogSetorFiltro = 'Todas';
let currentCompareBrand = 'Padrão';
let activeCatalogProductId = null;
let redesComparativoMinimizado = true;
let textoNovaMarcaEmEdicao = '';

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
window.obterPrecoProdutoMarcaMercado = obterPrecoProdutoMarcaMercado;

function atualizarPrecoUnificado(prodId, marcaNome, mercadoId, preco) {
  const prod = (products || []).find(p => String(p.id) === String(prodId));
  if (!prod) return;

  const valor = Math.max(0, Number(preco) || 0);
  const marca = (marcaNome || 'Padrão').trim();

  if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
    if (!prod.marketPrices) prod.marketPrices = {};
    prod.marketPrices[mercadoId] = valor;
    if (mercadoId === 'm-padrao') prod.basePrice = valor;
  } else {
    if (!Array.isArray(prod.brands)) prod.brands = [];
    let bObj = prod.brands.find(b => (b.name || b.id || '').toLowerCase() === marca.toLowerCase());
    if (!bObj) {
      bObj = { id: marca, name: marca, marketPrices: {} };
      prod.brands.push(bObj);
    }
    if (!bObj.marketPrices) bObj.marketPrices = {};
    bObj.marketPrices[mercadoId] = valor;
  }

  saveAllLocalData();
  renderCatalogUI();
}
window.atualizarPrecoUnificado = atualizarPrecoUnificado;
// CLASSIFICAÇÃO DE ORIGEM DO PRODUTO
function obterOrigemItem(p) {
  const isPlanilha = Boolean(p.inSheet || String(p.id).startsWith("PROD-"));
  const isDrive = Boolean(p.inDrive);

  if (isPlanilha && isDrive) return "planilha-drive";
  if (isPlanilha) return "planilha";
  if (isDrive) return "drive";
  return "local";
}
window.obterOrigemItem = obterOrigemItem;

function obterListaProdutosFiltrada() {
  const input = document.getElementById("input-busca-produtos");
  const query = (input?.value || "").toLowerCase().trim();

  const lista = (Array.isArray(products) ? products : []).filter((p) => {
    if (!p || !p.name) return false;
    const origem = obterOrigemItem(p);

    if (catalogOrigemFiltro !== "todos" && catalogOrigemFiltro !== origem) {
      return false;
    }

    if (catalogSetorFiltro && catalogSetorFiltro !== "Todas") {
      const catProd = (p.category || "Geral").toLowerCase().trim();
      if (catProd !== catalogSetorFiltro.toLowerCase().trim()) return false;
    }

    const nome = p.name.toLowerCase();
    const cat = (p.category || "").toLowerCase();
    return !query || nome.includes(query) || cat.includes(query);
  });

  lista.sort((a, b) => {
    const nomeA = (a.name || "").trim();
    const nomeB = (b.name || "").trim();
    if (catalogSortMode === "za" || catalogSortMode === "nome-desc") {
      return nomeB.localeCompare(nomeA, "pt-BR");
    }
    if (catalogSortMode === "setor") {
      const catComp = (a.category || "").localeCompare(b.category || "", "pt-BR");
      return catComp !== 0 ? catComp : nomeA.localeCompare(nomeB, "pt-BR");
    }
    return nomeA.localeCompare(nomeB, "pt-BR");
  });

  return lista;
}
window.obterListaProdutosFiltrada = obterListaProdutosFiltrada;

// RENDERIZAÇÃO DINÂMICA DOS BOTÕES DE ORIGEM (OCULTA FILTROS ZERADOS)
function renderizarBotoesFiltroOrigem() {
  const container = document.getElementById("container-filtro-origem-dinamico");
  if (!container) return;

  const lista = Array.isArray(products) ? products : [];
  const contagens = {
    todos: lista.length,
    "planilha-drive": 0,
    planilha: 0,
    drive: 0,
    local: 0
  };

  lista.forEach((p) => {
    const orig = obterOrigemItem(p);
    if (contagens[orig] !== undefined) contagens[orig]++;
  });

  if (catalogOrigemFiltro !== "todos" && !contagens[catalogOrigemFiltro]) {
    catalogOrigemFiltro = "todos";
  }

  const opcoes = [
    { id: "todos", label: "Todos", count: contagens.todos, visible: true },
    { id: "planilha-drive", label: "Planilha + Drive", count: contagens["planilha-drive"], visible: contagens["planilha-drive"] > 0 },
    { id: "planilha", label: "Só Planilha", count: contagens.planilha, visible: contagens.planilha > 0 },
    { id: "drive", label: "Só Drive", count: contagens.drive, visible: contagens.drive > 0 },
    { id: "local", label: "Local", count: contagens.local, visible: contagens.local > 0 }
  ];

  container.innerHTML = opcoes
    .filter((op) => op.visible)
    .map((op) => {
      const ativo = catalogOrigemFiltro === op.id;
      const classes = ativo
        ? "px-2.5 py-1 rounded-lg bg-white text-slate-800 shadow-2xs font-bold text-xs transition-all cursor-pointer"
        : "px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 transition-all font-medium text-xs cursor-pointer";

      return `
        <button type="button" onclick="filtrarOrigemProdutos('${op.id}')" class="${classes}">
          ${op.label} <span class="text-[10px] opacity-75">(${op.count})</span>
        </button>
      `;
    }).join("");
}
window.renderizarBotoesFiltroOrigem = renderizarBotoesFiltroOrigem;

window.filtrarOrigemProdutos = function(origem) {
  catalogOrigemFiltro = origem;
  renderizarBotoesFiltroOrigem();
  renderCatalogUI();
};


// RENDERIZAÇÃO DINÂMICA DOS BOTÕES DE FILTRO DE ORIGEM (OCULTA ZERADOS)
function renderizarBotoesFiltroOrigem() {
  const container = document.getElementById('container-filtro-origem-dinamico');
  if (!container) return;

  const lista = Array.isArray(products) ? products : [];
  const contagens = {
    todos: lista.length,
    'planilha-drive': 0,
    planilha: 0,
    drive: 0,
    local: 0
  };

  lista.forEach(p => {
    const orig = obterOrigemItem(p);
    if (contagens[orig] !== undefined) contagens[orig]++;
  });

  // Se o filtro ativo ficou sem produtos (ex: zerou após sincronização), reseta para 'todos'
  if (catalogOrigemFiltro !== 'todos' && !contagens[catalogOrigemFiltro]) {
    catalogOrigemFiltro = 'todos';
  }

  const opcoes = [
    { id: 'todos', label: 'Todos', count: contagens.todos, visible: true },
    { id: 'planilha-drive', label: 'Planilha + Drive', count: contagens['planilha-drive'], visible: contagens['planilha-drive'] > 0 },
    { id: 'planilha', label: 'Só Planilha', count: contagens.planilha, visible: contagens.planilha > 0 },
    { id: 'drive', label: 'Só Drive', count: contagens.drive, visible: contagens.drive > 0 },
    { id: 'local', label: 'Local', count: contagens.local, visible: contagens.local > 0 }
  ];

  container.innerHTML = opcoes
    .filter(op => op.visible)
    .map(op => {
      const ativo = catalogOrigemFiltro === op.id;
      const classes = ativo
        ? 'px-2.5 py-1 rounded-lg bg-white text-slate-800 shadow-2xs font-bold text-xs transition-all cursor-pointer'
        : 'px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 transition-all font-medium text-xs cursor-pointer';

      return `
        <button type="button" onclick="filtrarOrigemProdutos('${op.id}')" class="${classes}">
          ${op.label} <span class="text-[10px] opacity-75">(${op.count})</span>
        </button>
      `;
    }).join('');
}
window.renderizarBotoesFiltroOrigem = renderizarBotoesFiltroOrigem;

window.filtrarOrigemProdutos = function(origem) {
  catalogOrigemFiltro = origem;
  renderizarBotoesFiltroOrigem();
  renderCatalogUI();
};

window.filtrarSetorProdutos = function(setor, btn) {
  catalogSetorFiltro = setor;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => {
      b.className = 'px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all font-medium text-xs whitespace-nowrap cursor-pointer';
    });
    btn.className = 'px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs whitespace-nowrap shadow-2xs transition-all cursor-pointer';
  }
  renderCatalogUI();
};

window.filtrarProdutosCatalogo = function() {
  renderCatalogUI();
};

window.ordenarProdutosCatalogo = function() {
  const select = document.getElementById('select-ordenacao-produtos');
  if (select) catalogSortMode = select.value;
  renderCatalogUI();
};

function openProductEditModal(id = null) {
  const prod = id ? (products || []).find(p => String(p.id) === String(id)) : null;
  activeCatalogProductId = prod ? prod.id : null;
  currentCompareBrand = 'Padrão';
  textoNovaMarcaEmEdicao = '';

  window.AppTemplates.renderProductEditModal(prod);
  renderizarSelectMarcasModal(prod);
  renderizarComparativoPrecosModal(prod);
}
window.openProductEditModal = openProductEditModal;

function closeProductEditModal() {
  document.querySelectorAll('#modalProductEditDynamic').forEach(el => el.remove());
  activeCatalogProductId = null;
  currentCompareBrand = 'Padrão';
  textoNovaMarcaEmEdicao = '';
}
window.closeProductEditModal = closeProductEditModal;

function alternarMinimizarRedesModal() {
  redesComparativoMinimizado = !redesComparativoMinimizado;
  const label = document.getElementById('labelToggleMinimizarRedes');
  if (label) {
    label.innerText = redesComparativoMinimizado ? 'Ver Todas as Redes' : 'Apenas Ativa e Base';
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
      <select id="prodModalSelectBrand" onchange="aoMudarSelectMarcaModal(this.value)" class="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
        ${marcasArr.map(m => `<option value="${esc(m)}" ${(!isNovaMarcaSelecionada && m.toLowerCase() === currentCompareBrand.toLowerCase()) ? 'selected' : ''}>${esc(m)}</option>`).join('')}
        <option value="__NOVA_MARCA__" ${isNovaMarcaSelecionada ? 'selected' : ''} class="font-extrabold text-emerald-700">+ Nova Marca...</option>
      </select>
      ${isCustomBrand ? `<button type="button" onclick="excluirMarcaModalEdicao('${currentCompareBrand}')" class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all border border-rose-200 shrink-0">Excluir</button>` : ''}
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
  showAppToast(`Marca "${nomeMarca}" cadastrada!`, 'success');
}

function excluirMarcaModalEdicao(marca) {
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

function renderizarComparativoPrecosModal(prod) {
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
          <input type="text" value="${preco > 0 ? formatBRL(preco) : ''}" placeholder="0,00" onchange="salvarPrecoDiretoModal('${m.id}', this.value)" class="w-20 px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500 outline-none">
        </div>
      </div>`;
  }).join('');
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
    marcaAlvo = (textoNovaMarcaEmEdicao || input?.value || '').trim() || 'Padrão';
    currentCompareBrand = marcaAlvo;
  }

  atualizarPrecoUnificado(prod.id, marcaAlvo, mercadoId, preco);
  showAppToast(`Preço de "${marcaAlvo}" salvo!`, 'success');
}

function salvarEdicaoProdutoForm(e) {
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

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();
  showAppToast(`Produto "${nome}" salvo!`, 'success');
}

function askDeleteSingleProduct(id) {
  const prod = (products || []).find(p => String(p.id) === String(id));
  if (!prod) return;

  openCustomDialog(
    'Excluir Produto?',
    `Deseja excluir permanentemente "${prod.name}" do catálogo?`,
    'Sim, Excluir',
    null,
    () => {
      products = (products || []).filter(p => String(p.id) !== String(id));
      cart = (cart || []).filter(c => String(c.productId) !== String(id));
      saveAllLocalData();
      saveCartData();
      renderCatalogUI();
      showAppToast('Produto excluído.', 'info');
    }
  );
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
                         onchange="window.atualizarContadorModalSugeridos()"
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
        <button type="button" onclick="fecharModalCatalogoSugerido()" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div class="flex items-center justify-between py-2 border-b border-slate-100 text-xs shrink-0 bg-white">
        <div class="flex items-center space-x-2">
          <button type="button" onclick="window.toggleSelectAllSugeridos(true)" class="text-emerald-700 hover:underline font-bold text-[11px]">Marcar Todos</button>
          <span class="text-slate-300">•</span>
          <button type="button" onclick="window.toggleSelectAllSugeridos(false)" class="text-slate-500 hover:underline font-bold text-[11px]">Desmarcar</button>
        </div>
        <span id="badgeContadorSugeridos" class="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">0 selecionados</span>
      </div>

      <div class="flex-1 overflow-y-auto pr-1 space-y-3 py-2">
        ${corpoHtml}
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0 bg-white">
        <button type="button" onclick="fecharModalCatalogoSugerido()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
          Cancelar
        </button>
        <button type="button" id="btnConfirmarInclusaoSugeridos" onclick="window.adicionarItensSugeridosSelecionados()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer">
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
      id: 'p-custom-' + Date.now() + '-' + i,
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

function atualizarEstadoBarraLoteCatalogo() {
  const total = window.selectedCatalogProductIds.size;
  const contador = document.getElementById('contadorSelecaoCatalog');
  const btnExcluir = document.getElementById('btnExcluirLoteCatalogo');
  const lblExcluir = document.getElementById('lblExcluirLoteCatalogo');
  const chkAll = document.getElementById('checkSelectAllCatalog');

  if (contador) contador.innerText = `${total} selecionado${total === 1 ? '' : 's'}`;

  if (btnExcluir) {
    if (total > 0) {
      btnExcluir.classList.remove('hidden');
      if (lblExcluir) lblExcluir.innerText = `Excluir (${total})`;
    } else {
      btnExcluir.classList.add('hidden');
    }
  }

  if (chkAll) {
    const visiveis = typeof obterListaProdutosFiltrada === 'function' ? obterListaProdutosFiltrada() : (products || []);
    chkAll.checked = visiveis.length > 0 && visiveis.every(p => window.selectedCatalogProductIds.has(String(p.id)));
  }
}

function toggleSelectCatalogProduct(id, isChecked) {
  if (!window.selectedCatalogProductIds) window.selectedCatalogProductIds = new Set();
  const idStr = String(id);

  if (isChecked) {
    window.selectedCatalogProductIds.add(idStr);
  } else {
    window.selectedCatalogProductIds.delete(idStr);
  }

  const cardEl = document.getElementById(`card-prod-${idStr}`);
  if (cardEl) {
    if (isChecked) {
      cardEl.classList.add('bg-emerald-50', 'border-emerald-500', 'ring-2', 'ring-emerald-500/30', 'shadow-sm');
      cardEl.classList.remove('bg-white', 'border-slate-200', 'shadow-2xs');
    } else {
      cardEl.classList.remove('bg-emerald-50', 'border-emerald-500', 'ring-2', 'ring-emerald-500/30', 'shadow-sm');
      cardEl.classList.add('bg-white', 'border-slate-200', 'shadow-2xs');
    }
  }

  atualizarEstadoBarraLoteCatalogo();
}
window.toggleSelectCatalogProduct = toggleSelectCatalogProduct;

function toggleSelectAllCatalogProducts(isChecked) {
  if (!window.selectedCatalogProductIds) window.selectedCatalogProductIds = new Set();
  const visiveis = typeof obterListaProdutosFiltrada === 'function' ? obterListaProdutosFiltrada() : (products || []);

  visiveis.forEach(p => {
    const idStr = String(p.id);
    if (isChecked) {
      window.selectedCatalogProductIds.add(idStr);
    } else {
      window.selectedCatalogProductIds.delete(idStr);
    }
    const cardEl = document.getElementById(`card-prod-${idStr}`);
    const inputChk = cardEl?.querySelector('input[type="checkbox"]');
    if (inputChk) inputChk.checked = isChecked;

    if (cardEl) {
      if (isChecked) {
        cardEl.classList.add('bg-emerald-50', 'border-emerald-500', 'ring-2', 'ring-emerald-500/30', 'shadow-sm');
        cardEl.classList.remove('bg-white', 'border-slate-200', 'shadow-2xs');
      } else {
        cardEl.classList.remove('bg-emerald-50', 'border-emerald-500', 'ring-2', 'ring-emerald-500/30', 'shadow-sm');
        cardEl.classList.add('bg-white', 'border-slate-200', 'shadow-2xs');
      }
    }
  });

  atualizarEstadoBarraLoteCatalogo();
}
window.toggleSelectAllCatalogProducts = toggleSelectAllCatalogProducts;
/**
 * Diálogo inteligente de exclusão em lote:
 * - Se todos forem locais: pergunta se deseja excluir.
 * - Se houver produtos de nuvem: oferece as opções "Apenas do Aparelho" ou "Do Aparelho e da Nuvem".
 */
function solicitarExclusaoLoteCatalogo() {
  const ids = Array.from(window.selectedCatalogProductIds || []);
  if (ids.length === 0) return;

  const itens = (products || []).filter(p => ids.includes(String(p.id)));
  const contemNuvem = itens.some(p => !(String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-')));

  if (!contemNuvem) {
    // Cenário 1: Apenas produtos locais
    openCustomDialog(
      `Excluir ${itens.length} produto(s) local(is)?`,
      `Estes produtos estão salvos apenas neste aparelho e serão apagados permanentemente.`,
      'Sim, Excluir',
      null,
      () => executarRemocaoItensCatalogo(ids, false)
    );
  } else {
    // Cenário 2: Contém produtos que existem na Nuvem (Planilha Google)
    openCustomDialog(
      `Excluir ${itens.length} produto(s)?`,
      `Alguns itens selecionados estão vinculados à Nuvem (Planilha Google). Deseja remover apenas deste aparelho ou também excluir permanentemente da Nuvem?`,
      'Excluir do Local e da Nuvem',
      'Apenas do Aparelho (Local)',
      () => executarRemocaoItensCatalogo(ids, true),  // Local + Nuvem
      () => executarRemocaoItensCatalogo(ids, false)  // Apenas Local
    );
  }
}
window.solicitarExclusaoLoteCatalogo = solicitarExclusaoLoteCatalogo;

async function executarRemocaoItensCatalogo(idsParaRemover, excluirDaNuvem = false) {
  const setIds = new Set(idsParaRemover.map(String));
  const itensParaExcluir = (products || []).filter(p => setIds.has(String(p.id)));

  // 1. Se solicitou exclusão também da nuvem, envia comando para a planilha
  if (excluirDaNuvem) {
    const token = typeof getSecurityToken === 'function' ? getSecurityToken() : '';
    if (token) {
      showAppToast('Removendo itens da planilha...', 'info');
      try {
        for (const p of itensParaExcluir) {
          const isLocal = String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-');
          if (!isLocal) {
            const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_produto&name=${encodeURIComponent(p.name)}&productId=${encodeURIComponent(p.id)}`;
            await fetch(url).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Erro ao excluir produtos remotos:', e);
      }
    }
  }

  // 2. Remove da lista local e do carrinho
  products = (products || []).filter(p => !setIds.has(String(p.id)));
  cart = (cart || []).filter(c => !setIds.has(String(c.productId)));

  // 3. Limpa seleção e persiste dados
  window.selectedCatalogProductIds.clear();
  saveAllLocalData();
  saveCartData();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  atualizarEstadoBarraLoteCatalogo();

  showAppToast(`${itensParaExcluir.length} produto(s) excluído(s)${excluirDaNuvem ? ' do aparelho e da nuvem' : ' do aparelho'}!`, 'success');
}