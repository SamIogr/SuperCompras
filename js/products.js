/**
 * SUPERCOMPRAS PRO - CATÁLOGO MESTRE DE PRODUTOS (DESIGN AUTÔNOMO)
 */

let catalogSortMode = 'az';
let currentCompareBrand = 'Padrão';
let catalogMarcaModoEdicao = 'nova';
let catalogMarcaNomeOriginal = '';
let activeCatalogProductId = null;
let redesComparativoMinimizado = false;

window.AlternarSubTabDados = function(aba) {
    const secaoProd = document.getElementById('secao-catalogo-produtos');
    const secaoMerc = document.getElementById('secao-catalogo-mercados');
    const btnProd = document.getElementById('btn-subtab-produtos');
    const btnMerc = document.getElementById('btn-subtab-mercados');

    if (!secaoProd || !secaoMerc) return;

    if (aba === 'produtos') {
        secaoProd.style.display = 'block';
        secaoMerc.style.display = 'none';
        if (btnProd) {
            btnProd.style.background = 'white';
            btnProd.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            btnProd.classList.remove('text-muted');
        }
        if (btnMerc) {
            btnMerc.style.background = 'transparent';
            btnMerc.style.boxShadow = 'none';
            btnMerc.classList.add('text-muted');
        }
        renderizarCatalogoProdutos();
    } else {
        secaoProd.style.display = 'none';
        secaoMerc.style.display = 'block';
        if (btnMerc) {
            btnMerc.style.background = 'white';
            btnMerc.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            btnMerc.classList.remove('text-muted');
        }
        if (btnProd) {
            btnProd.style.background = 'transparent';
            btnProd.style.boxShadow = 'none';
            btnProd.classList.add('text-muted');
        }
        if (typeof renderizarCatalogoMercados === 'function') renderizarCatalogoMercados();
    }
};
window.setSubTabDados = window.AlternarSubTabDados;

window.filtrarProdutosCatalogo = function() { renderizarCatalogoProdutos(); };
window.ordenarProdutosCatalogo = function() {
    const sel = document.getElementById('select-ordenacao-produtos');
    if (sel) catalogSortMode = (sel.value === 'nome-desc') ? 'za' : 'az';
    renderizarCatalogoProdutos();
};

function obterListaProdutosFiltrada() {
    const input = document.getElementById('input-busca-produtos');
    const query = (input?.value || '').toLowerCase().trim();

    let lista = (products || []).filter(p => {
        if (!p || !p.name) return false;
        const nome = p.name.toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return !query || nome.includes(query) || cat.includes(query);
    });

    lista.sort((a, b) => {
        const nomeA = (a.name || '').trim();
        const nomeB = (b.name || '').trim();
        return catalogSortMode === 'za' 
            ? nomeB.localeCompare(nomeA, 'pt-BR') 
            : nomeA.localeCompare(nomeB, 'pt-BR');
    });
    return lista;
}

window.renderizarCatalogoProdutos = function() {
    const container = document.getElementById('lista-produtos');
    const badgeTotal = document.getElementById('badge-total-produtos');
    const lista = products || [];

    if (badgeTotal) badgeTotal.textContent = lista.length;
    if (!container) return;

    const visiveis = obterListaProdutosFiltrada();

    if (visiveis.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 p-8 my-2">
                <p class="text-xs font-semibold text-slate-600">Nenhum produto cadastrado no catálogo.</p>
            </div>`;
        return;
    }

    // Se o templates.js estiver ativo, usa ele. Se não estiver, renderiza diretamente sem quebrar!
    container.innerHTML = visiveis.map(prod => {
        const precoMercado = (prod.marketPrices && prod.marketPrices[activeMarketId] > 0) ? prod.marketPrices[activeMarketId] : null;

        if (window.AppTemplates && typeof window.AppTemplates.productCard === 'function') {
            return AppTemplates.productCard(prod, {
                marketPrice: precoMercado,
                marketName: getSelectedMarketName()
            });
        }

        // Fallback seguro nativo em Tailwind (caso templates.js não carregue)
        const isLocal = String(prod.id).startsWith('p-custom-') || String(prod.id).startsWith('p-local-');
        const cotacao = precoMercado ? `R$ ${formatBRL(precoMercado)}` : 'Sem cotação';
        const baseStr = prod.basePrice > 0 ? `R$ ${formatBRL(prod.basePrice)}` : 'A definir';

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
                    </div>
                    <div class="text-xs text-slate-500 mt-1 truncate">
                        Base: <span class="font-bold text-slate-700">${baseStr}</span> • 
                        No ${getSelectedMarketName()}: <span class="font-bold ${precoMercado ? 'text-emerald-700' : 'text-slate-400'}">${cotacao}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1.5 shrink-0">
                    <button type="button" onclick="openProductEditModal('${prod.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Editar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button type="button" onclick="askDeleteSingleProduct('${prod.id}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors" title="Excluir">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                    <button type="button" onclick="quickAddToCartFromCatalog('${prod.id}')" class="p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all shadow-xs" title="Adicionar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

window.quickAddToCartFromCatalog = function(productId) {
    if (typeof selectProductForCart === 'function') selectProductForCart(productId);
    switchActiveTab('compras');
    showAppToast('Produto selecionado para a compra!', 'info');
};

window.askDeleteSingleProduct = function(productId) {
    const p = (products || []).find(x => x.id === productId);
    if (!p) return;
    if (confirm(`Deseja remover "${p.name}" do aplicativo?`)) {
        products = products.filter(x => x.id !== p.id);
        cart = cart.filter(c => c.productId !== p.id);
        saveAllLocalData();
        saveCartData();
        renderizarCatalogoProdutos();
        if (typeof renderCartUI === 'function') renderCartUI();
        showAppToast(`"${p.name}" foi excluído.`, 'info');
    }
};

window.openProductEditModal = function(productId = null) {
  const modal = document.getElementById('modalProductEdit');
  const title = document.getElementById('modalProductEditTitle');
  const idInput = document.getElementById('editProdId');
  const nameInput = document.getElementById('editProdName');
  const catInput = document.getElementById('editProdCategory');
  const unitInput = document.getElementById('editProdUnit');
  const priceInput = document.getElementById('editProdBasePrice');
  const precosMarcasContainer = document.getElementById('containerPrecosMarcasEdit');

  const isEditing = typeof productId === 'string' && productId.trim().length > 0;

  if (isEditing) {
    const p = products.find(x => x.id === productId);
    if (!p) return;

    activeCatalogProductId = p.id;
    currentCompareBrand = 'Padrão';

    if (title) title.innerText = `Editar: ${p.name}`;
    if (idInput) idInput.value = p.id;
    if (nameInput) nameInput.value = p.name || '';
    if (catInput) catInput.value = p.category || 'Geral';
    if (unitInput) unitInput.value = p.unit || 'un';
    if (priceInput) priceInput.value = p.basePrice > 0 ? formatBRL(p.basePrice) : '';
    if (precosMarcasContainer) precosMarcasContainer.classList.remove('hidden');

    if (!p.brands) p.brands = [];
    if (!p.marketPrices) p.marketPrices = {};

    window.atualizarSelectMarcasCompareModal(p);

    const selMarket = document.getElementById('compareSelectMarket');
    if (selMarket) {
      selMarket.innerHTML = (supermarkets || []).filter(m => m.id !== 'm-padrao').map(m => `
        <option value="${m.id}" ${m.id === activeMarketId ? 'selected' : ''}>${m.name}</option>
      `).join('');
    }

    window.syncPriceFieldToSelectedMarket(p.id, selMarket ? selMarket.value : activeMarketId);
    window.renderPriceCompareTable(p);
    window.sincronizarAcoesMarcaCatalogo();
  } else {
    activeCatalogProductId = null;
    if (title) title.innerText = 'Cadastrar Produto';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (catInput) catInput.value = 'Geral';
    if (unitInput) unitInput.value = 'un';
    if (priceInput) priceInput.value = '';
    if (precosMarcasContainer) precosMarcasContainer.classList.add('hidden');
  }

  modal?.classList.remove('hidden');
  setTimeout(() => nameInput?.focus(), 50);
};

window.closeProductEditModal = function() {
  document.getElementById('modalProductEdit')?.classList.add('hidden');
  window.cancelarEdicaoMarcaCatalogo();
};

window.sincronizarAcoesMarcaCatalogo = function() {
  const select = document.getElementById('compareSelectBrand');
  const boxActions = document.getElementById('boxCatalogMarcaActions');
  if (!select || !boxActions) return;
  const val = (select.value || 'Padrão').trim();
  const ehPadrao = val.toLowerCase() === 'padrão' || val.toLowerCase() === 'padrao';
  boxActions.classList.toggle('hidden', ehPadrao || val === '');
};

window.atualizarSelectMarcasCompareModal = function(product) {
  const select = document.getElementById('compareSelectBrand');
  if (!select || !product) return;

  const marcas = new Set(['Padrão']);
  if (Array.isArray(product.brands)) {
    product.brands.forEach(b => {
      const n = typeof b === 'string' ? b : (b.name || b.id);
      if (n && n !== '__NOVA__') marcas.add(n);
    });
  }

  (cart || []).forEach(c => {
    if (c.name.toLowerCase() === product.name.toLowerCase() && c.selectedBrandId) {
      if (c.selectedBrandId !== '__NOVA__') marcas.add(c.selectedBrandId);
    }
  });

  select.innerHTML = Array.from(marcas).map(m => `<option value="${m}" ${m.toLowerCase() === currentCompareBrand.toLowerCase() ? 'selected' : ''}>🏷️ ${m}</option>`).join('') + `<option value="__NOVA__">+ Nova marca...</option>`;

  document.getElementById('boxCatalogMarcaInline')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaSelect')?.classList.remove('hidden');
  window.sincronizarAcoesMarcaCatalogo();
};

window.onCompareBrandChanged = function(val) {
  if (val === '__NOVA__') {
    document.getElementById('boxCatalogMarcaSelect')?.classList.add('hidden');
    document.getElementById('boxCatalogMarcaActions')?.classList.add('hidden');
    const boxInput = document.getElementById('boxCatalogMarcaInline');
    const campo = document.getElementById('inputCatalogNovaMarca');
    if (boxInput) boxInput.classList.remove('hidden');
    if (campo) { campo.value = ''; campo.focus(); }
    return;
  }
  currentCompareBrand = val || 'Padrão';
  const p = (products || []).find(x => x.id === activeCatalogProductId);
  if (p) {
    const selMarket = document.getElementById('compareSelectMarket');
    window.syncPriceFieldToSelectedMarket(p.id, selMarket ? selMarket.value : activeMarketId);
    window.renderPriceCompareTable(p);
  }
  window.sincronizarAcoesMarcaCatalogo();
};

window.iniciarEdicaoNomeMarcaCatalogo = function() {
  const select = document.getElementById('compareSelectBrand');
  const val = select?.value;
  if (!val || val === 'Padrão' || val === '__NOVA__') return;
  catalogMarcaModoEdicao = 'renomear';
  catalogMarcaNomeOriginal = val;

  document.getElementById('boxCatalogMarcaSelect')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaActions')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaInline')?.classList.remove('hidden');

  const input = document.getElementById('inputCatalogNovaMarca');
  if (input) { input.value = val; input.focus(); input.select(); }
};

window.confirmarEdicaoMarcaCatalogo = function() {
  const input = document.getElementById('inputCatalogNovaMarca');
  const novoNome = (input?.value || '').trim();
  if (!novoNome || novoNome === '__NOVA__') {
    window.cancelarEdicaoMarcaCatalogo();
    return;
  }

  const p = (products || []).find(x => x.id === activeCatalogProductId);
  if (catalogMarcaModoEdicao === 'renomear') {
    if (p && Array.isArray(p.brands)) {
      p.brands.forEach(b => {
        const nomeObj = typeof b === 'string' ? b : (b.name || b.id);
        if (nomeObj && nomeObj.toLowerCase() === catalogMarcaNomeOriginal.toLowerCase()) {
          if (typeof b === 'object') { b.id = novoNome; b.name = novoNome; }
        }
      });
    }
    (cart || []).forEach(c => {
      if (c.selectedBrandId && c.selectedBrandId.toLowerCase() === catalogMarcaNomeOriginal.toLowerCase()) c.selectedBrandId = novoNome;
    });
    saveAllLocalData();
    saveCartData();
  } else {
    if (p) {
      if (!p.brands) p.brands = [];
      const existe = p.brands.some(b => (b.name || b.id || '').toLowerCase() === novoNome.toLowerCase());
      if (!existe) { p.brands.push({ id: novoNome, name: novoNome, marketPrices: {} }); saveAllLocalData(); }
    }
  }

  currentCompareBrand = novoNome;
  window.cancelarEdicaoMarcaCatalogo();
  if (p) {
    window.atualizarSelectMarcasCompareModal(p);
    const selMarket = document.getElementById('compareSelectMarket');
    window.syncPriceFieldToSelectedMarket(p.id, selMarket ? selMarket.value : activeMarketId);
    window.renderPriceCompareTable(p);
  }
};

window.cancelarEdicaoMarcaCatalogo = function() {
  document.getElementById('boxCatalogMarcaInline')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaSelect')?.classList.remove('hidden');
  catalogMarcaModoEdicao = 'nova';
  catalogMarcaNomeOriginal = '';
  const select = document.getElementById('compareSelectBrand');
  if (select && select.value === '__NOVA__') select.value = currentCompareBrand || 'Padrão';
  window.sincronizarAcoesMarcaCatalogo();
};

window.confirmarExclusaoMarcaCatalogo = function() {
  const select = document.getElementById('compareSelectBrand');
  const marcaAlvo = (select?.value || '').trim();
  if (!marcaAlvo || marcaAlvo === 'Padrão') return;
  const label = document.getElementById('labelCatalogMarcaParaExcluir');
  if (label) label.innerText = `"${marcaAlvo}"`;
  document.getElementById('boxCatalogMarcaSelect')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaActions')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaConfirmDelete')?.classList.remove('hidden');
};

window.cancelarExclusaoMarcaCatalogo = function() {
  document.getElementById('boxCatalogMarcaConfirmDelete')?.classList.add('hidden');
  document.getElementById('boxCatalogMarcaSelect')?.classList.remove('hidden');
  window.sincronizarAcoesMarcaCatalogo();
};

window.executarExclusaoMarcaCatalogo = function() {
  const select = document.getElementById('compareSelectBrand');
  const marcaAlvo = (select?.value || currentCompareBrand || '').trim();
  const p = (products || []).find(x => x.id === activeCatalogProductId);
  if (!marcaAlvo || marcaAlvo === 'Padrão' || !p) { window.cancelarExclusaoMarcaCatalogo(); return; }

  if (Array.isArray(p.brands)) {
    p.brands = p.brands.filter(b => {
      const n = typeof b === 'string' ? b : (b.name || b.id);
      return (n || '').toLowerCase() !== marcaAlvo.toLowerCase();
    });
  }
  currentCompareBrand = 'Padrão';
  saveAllLocalData();
  
  window.cancelarExclusaoMarcaCatalogo();
  window.atualizarSelectMarcasCompareModal(p);
  const selMarket = document.getElementById('compareSelectMarket');
  window.syncPriceFieldToSelectedMarket(p.id, selMarket ? selMarket.value : activeMarketId);
  window.renderPriceCompareTable(p);
  showAppToast(`Marca "${marcaAlvo}" excluída com sucesso!`, 'success');
};

window.toggleComparativoRedesCatalogo = function() {
  redesComparativoMinimizado = !redesComparativoMinimizado;
  const container = document.getElementById('containerTabelaRedesCatalogo');
  const label = document.getElementById('labelToggleRedesCatalogo');
  const arrow = document.getElementById('arrowToggleRedesCatalogo');
  if (container) container.classList.toggle('hidden', redesComparativoMinimizado);
  if (label) label.innerText = redesComparativoMinimizado ? 'Maximizar' : 'Minimizar';
  if (arrow) arrow.innerText = redesComparativoMinimizado ? '▼' : '▲';
};

window.syncPriceFieldToSelectedMarket = function(pId, mId) {
  const p = (products || []).find(x => x.id === (pId || activeCatalogProductId));
  const input = document.getElementById('compareInputPrice');
  if (!input || !p) return;

  let preco = 0;
  if (currentCompareBrand === 'Padrão') {
    if (p.marketPrices && p.marketPrices[mId] !== undefined) preco = p.marketPrices[mId];
  } else if (p.brands) {
    const bObj = p.brands.find(b => (b.name || b.id).toLowerCase() === currentCompareBrand.toLowerCase());
    if (bObj && bObj.marketPrices && bObj.marketPrices[mId] !== undefined) preco = bObj.marketPrices[mId];
  }
  input.value = preco > 0 ? formatBRL(preco) : '';
};

window.salvarPrecoComparativoModal = function() {
  const pId = activeCatalogProductId || document.getElementById('editProdId')?.value;
  const mId = document.getElementById('compareSelectMarket')?.value;
  const preco = parseNumberInput(document.getElementById('compareInputPrice')?.value);
  const p = (products || []).find(x => x.id === pId);

  if (!p || !mId) return;
  if (typeof window.atualizarPrecoUnificado === 'function') {
    window.atualizarPrecoUnificado(p.id, currentCompareBrand, mId, preco);
  }
  showAppToast(`Preço de "${p.name} (${currentCompareBrand})" atualizado!`, 'success');
};

window.renderPriceCompareTable = function(product) {
  const p = product || (products || []).find(x => x.id === activeCatalogProductId);
  const table = document.getElementById('comparePricesTable');
  const badgeContador = document.getElementById('badgeContadorRedesCatalogo');
  if (!p || !table) return;

  const redesReais = (supermarkets || []).filter(m => m.id !== 'm-padrao');
  if (badgeContador) badgeContador.innerText = `${redesReais.length} Redes`;

  table.innerHTML = redesReais.map(m => {
    let pr = null;
    if (currentCompareBrand === 'Padrão') {
      if (p.marketPrices?.[m.id] > 0) pr = p.marketPrices[m.id];
    } else if (p.brands) {
      const bObj = p.brands.find(b => (b.name || b.id).toLowerCase() === currentCompareBrand.toLowerCase());
      if (bObj && bObj.marketPrices && bObj.marketPrices[m.id] > 0) pr = bObj.marketPrices[m.id];
    }

    const isMenor = pr > 0 && pr === Math.min(...redesReais.map(rm => {
        if (currentCompareBrand === 'Padrão') return p.marketPrices?.[rm.id] || Infinity;
        const b = (p.brands || []).find(xb => (xb.name || xb.id).toLowerCase() === currentCompareBrand.toLowerCase());
        return (b && b.marketPrices?.[rm.id]) || Infinity;
    }));

    return `
      <div class="p-2 rounded-xl border ${isMenor ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 bg-white'} flex items-center justify-between gap-2 shadow-2xs">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="font-bold text-xs text-slate-800">${m.name}</span>
            <span class="text-[10px] text-slate-500">(${m.branch || 'SJP'})</span>
            ${isMenor ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 rounded-full">MENOR</span>` : ''}
          </div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5">${m.promoDay || 'Sem dia fixo'}</div>
        </div>
        <div class="text-right shrink-0 flex items-center space-x-2">
          <span class="text-xs font-black text-slate-800">${pr ? 'R$ ' + formatBRL(pr) : 'Sem cotação'}</span>
          <button type="button" onclick="loadMarketToDirectEdit('${p.id}', '${m.id}')" class="p-1.5 bg-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-slate-700 text-xs" title="Editar">✎</button>
        </div>
      </div>
    `;
  }).join('');
};

window.loadMarketToDirectEdit = function(pId, mId) {
  const sel = document.getElementById('compareSelectMarket');
  if (sel) sel.value = mId;
  window.syncPriceFieldToSelectedMarket(pId || activeCatalogProductId, mId);
  const input = document.getElementById('compareInputPrice');
  if (input) { input.focus(); input.select(); }
};

document.getElementById('formSaveProductCatalog')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const boxInline = document.getElementById('boxCatalogMarcaInline');
  const inputNova = document.getElementById('inputCatalogNovaMarca');
  if (boxInline && !boxInline.classList.contains('hidden') && inputNova && inputNova.value.trim()) {
    window.confirmarEdicaoMarcaCatalogo();
  }

  const id = document.getElementById('editProdId')?.value;
  const name = document.getElementById('editProdName')?.value.trim();
  const category = document.getElementById('editProdCategory')?.value || 'Geral';
  const unit = document.getElementById('editProdUnit')?.value || 'un';
  const bp = parseNumberInput(document.getElementById('editProdBasePrice')?.value);

  if (!name) return;

  let p = null;
  if (id) {
    p = products.find(x => x.id === id);
    if (p) {
      p.name = name;
      p.category = category;
      p.unit = unit;
      p.basePrice = bp;
    }
  } else {
    p = {
      id: 'p-custom-' + Date.now(),
      name: name,
      category: category,
      unit: unit,
      basePrice: bp,
      marketPrices: {},
      brands: []
    };
    products.unshift(p);
  }

  const inputPrecoModal = document.getElementById('compareInputPrice');
  const selMercadoModal = document.getElementById('compareSelectMarket');
  const precoDigitado = parseNumberInput(inputPrecoModal?.value);

  if (p && selMercadoModal && selMercadoModal.value && precoDigitado > 0) {
    const marcaAlvo = (currentCompareBrand && currentCompareBrand !== '__NOVA__') ? currentCompareBrand : 'Padrão';
    if (typeof window.atualizarPrecoUnificado === 'function') {
      window.atualizarPrecoUnificado(p.id, marcaAlvo, selMercadoModal.value, precoDigitado);
    }
  }

  saveAllLocalData();
  renderizarCatalogoProdutos();
  closeProductEditModal();
  showAppToast('Produto salvo com sucesso!', 'success');
});