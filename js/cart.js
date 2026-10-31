/**
 * SUPERCOMPRAS PRO - CARRINHO, COTAÇÕES E SELEÇÃO DE MARCAS
 */

// ============================================================
// BARRAMENTO GLOBAL DE PREÇOS (FONTE ÚNICA DE VERDADE)
// ============================================================
window.atualizarPrecoUnificado = function(produtoIdOuNome, marcaAlvo, mercadoId, novoPreco) {
  if (!produtoIdOuNome || !mercadoId) return;

  const marca = (marcaAlvo || 'Padrão').trim();
  const preco = Number(novoPreco) || 0;

  // 1. Localiza o produto mestre no catálogo
  let masterProd = (products || []).find(p => 
    p.id === produtoIdOuNome || 
    p.name.toLowerCase() === String(produtoIdOuNome).toLowerCase()
  );

  // Se não existir, cadastra como produto local na hora
  if (!masterProd) {
    masterProd = {
      id: 'p-custom-' + Date.now(),
      name: String(produtoIdOuNome).trim(),
      category: 'Geral',
      unit: 'un',
      basePrice: preco > 0 ? preco : 0,
      marketPrices: {},
      brands: []
    };
    if (!Array.isArray(products)) products = [];
    products.unshift(masterProd);
  }

  // 2. Grava a cotação na matriz oficial do produto
  if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
    if (!masterProd.marketPrices) masterProd.marketPrices = {};
    masterProd.marketPrices[mercadoId] = preco;
  } else {
    if (!masterProd.brands) masterProd.brands = [];
    let bObj = masterProd.brands.find(b => (b.name || b.id || '').toLowerCase() === marca.toLowerCase());
    if (!bObj) {
      bObj = { id: marca, name: marca, marketPrices: {} };
      masterProd.brands.push(bObj);
    }
    if (!bObj.marketPrices) bObj.marketPrices = {};
    bObj.marketPrices[mercadoId] = preco;
  }

  // 3. Sincroniza TODOS os itens correspondentes no carrinho
  if (Array.isArray(cart)) {
    cart.forEach(item => {
      const matchProd = (item.productId && item.productId === masterProd.id) || 
                        (item.name && item.name.toLowerCase() === masterProd.name.toLowerCase());
      const matchMarca = (item.selectedBrandId || 'Padrão').toLowerCase() === marca.toLowerCase();

      if (matchProd && matchMarca) {
        if (!item.productId) item.productId = masterProd.id;
        // Se a cotação alterada for do mercado ativo, atualiza o item imediatamente
        if (mercadoId === activeMarketId) {
          item.unitPrice = preco;
        }
      }
    });
  }

  // 4. Grava no banco local
  saveAllLocalData();
  saveCartData();

  // 5. Atualiza simultaneamente todas as interfaces ativas
  if (typeof renderCartUI === 'function') renderCartUI();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderPriceCompareTable === 'function' && typeof activeCatalogProductId !== 'undefined') {
    renderPriceCompareTable(masterProd);
  }

  // 6. Envia à planilha Google em segundo plano
  if (activeMarketId !== 'm-padrao' && preco > 0 && typeof enviarProdutoParaPlanilha === 'function') {
    enviarProdutoParaPlanilha(masterProd, mercadoId, preco, marca);
  }
};




// ============================================================
// CÁLCULOS FINANCEIROS DO ITEM
// ============================================================
function computeItemFinancials(qty, unitPrice, promo = {}) {
  qty = Math.max(0, qty);
  unitPrice = Math.max(0, unitPrice);
  const standardSubtotal = qty * unitPrice;
  let finalSubtotal = standardSubtotal;
  let savings = 0;
  let badgeText = '';

  if (promo.type === 'discount') {
    const val = promo.value || 0;
    if (promo.mode === 'percent' && val > 0) {
      savings = standardSubtotal * (Math.min(val, 100) / 100);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. ${val}%`;
    } else if (promo.mode === 'fixed' && val > 0) {
      savings = qty * Math.min(val, unitPrice);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. R$ ${formatBRL(val)}/un`;
    }
  } else if (promo.type === 'wholesale') {
    const minQ = promo.minQty || 0;
    const wPrice = promo.wholesalePrice || 0;
    if (minQ > 0 && wPrice > 0 && qty >= minQ) {
      const wholesaleTotal = qty * wPrice;
      if (wholesaleTotal < standardSubtotal) {
        savings = standardSubtotal - wholesaleTotal;
        finalSubtotal = wholesaleTotal;
        badgeText = `Atacado (≥${minQ}): R$ ${formatBRL(wPrice)}/un`;
      }
    }
  }
  return { standardSubtotal, finalSubtotal: Math.max(0, finalSubtotal), savings: Math.max(0, savings), badgeText };
}

// ============================================================
// CONDIÇÃO COMERCIAL NO FORMULÁRIO PRINCIPAL DE ADIÇÃO
// ============================================================
let currentCartPromoMode = 'none';

window.setCartPromoMode = function(mode) {
  currentCartPromoMode = mode;

  const btnNone = document.getElementById('btnCartPromoNone');
  const btnDisc = document.getElementById('btnCartPromoDiscount');
  const btnWhol = document.getElementById('btnCartPromoWholesale');

  const panelDisc = document.getElementById('panelCartPromoDiscount');
  const panelWhol = document.getElementById('panelCartPromoWholesale');

  [btnNone, btnDisc, btnWhol].forEach(btn => {
    if (btn) btn.className = 'py-1.5 rounded-lg text-center transition-all text-slate-600 hover:text-slate-900';
  });

  if (panelDisc) panelDisc.classList.add('hidden');
  if (panelWhol) panelWhol.classList.add('hidden');

  if (mode === 'discount') {
    if (btnDisc) btnDisc.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelDisc) panelDisc.classList.remove('hidden');
    document.getElementById('cartDiscountVal')?.focus();
  } else if (mode === 'wholesale') {
    if (btnWhol) btnWhol.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelWhol) panelWhol.classList.remove('hidden');
    document.getElementById('cartWholesalePrice')?.focus();
  } else {
    if (btnNone) btnNone.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
  }

  updateCartItemPreview();
};

function getCartFormPromoConfig() {
  if (currentCartPromoMode === 'discount') {
    return {
      type: 'discount',
      mode: document.getElementById('cartDiscountMode')?.value || 'percent',
      value: parseNumberInput(document.getElementById('cartDiscountVal')?.value) || 0
    };
  }
  if (currentCartPromoMode === 'wholesale') {
    return {
      type: 'wholesale',
      minQty: parseNumberInput(document.getElementById('cartWholesaleMin')?.value) || 1,
      wholesalePrice: parseNumberInput(document.getElementById('cartWholesalePrice')?.value) || 0
    };
  }
  return { type: 'none' };
}

function updateCartItemPreview() {
  const qtyInput = document.getElementById('cartInputQuantity');
  const priceInput = document.getElementById('cartInputUnitPrice');
  
  const q = parseNumberInput(qtyInput?.value) || 1;
  const p = parseNumberInput(priceInput?.value) || 0;
  
  const calc = computeItemFinancials(q, p, getCartFormPromoConfig());

  const subtotalEl = document.getElementById('cartItemPreviewSubtotal') || 
                     document.querySelector('.text-emerald-600.font-black') ||
                     document.querySelector('[id*="Subtotal"]');
  if (subtotalEl) {
    subtotalEl.innerText = `R$ ${formatBRL(calc.finalSubtotal)}`;
  }

  const promoBadge = document.getElementById('cartPromoPreviewBadge') || document.getElementById('cartItemPreviewSavings');
  if (promoBadge) {
    if (calc.savings > 0) {
      promoBadge.innerText = `Economia de R$ ${formatBRL(calc.savings)}`;
      promoBadge.classList.remove('hidden');
    } else {
      promoBadge.classList.add('hidden');
    }
  }
}

function higienizarInputsCarrinho() {
  const ids = ['cartInputProductName', 'cartInputUnitPrice', 'cartSearchFilter', 'cartDiscountVal', 'cartWholesalePrice'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && (el.value === 'null' || el.value === 'undefined')) el.value = '';
    if (el && (el.placeholder === 'null' || el.placeholder === 'undefined')) {
      el.placeholder = (id === 'cartSearchFilter') ? 'Buscar no carrinho...' : 'Digite para buscar...';
    }
  });
}

// ============================================================
// GESTÃO DE MARCAS NO FORMULÁRIO DE ADIÇÃO
// ============================================================
function atualizarSelectMarcasInline(nomeProduto, marcaSelecionada = 'Padrão') {
  const container = document.getElementById('containerMarcaInline');
  const select = document.getElementById('cartSelectProductBrand');
  const inputHidden = document.getElementById('cartInputProductBrand');

  if (!select) return;

  if (container) {
    if (nomeProduto && nomeProduto.trim().length > 0) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  }

  const marcas = new Set(['Padrão']);
  const p = (products || []).find(it => it.name.toLowerCase() === (nomeProduto || '').toLowerCase());

  if (p && Array.isArray(p.brands)) {
    p.brands.forEach(b => marcas.add(typeof b === 'string' ? b : (b.name || b.id)));
  }
  (cart || []).forEach(c => {
    if (c.name.toLowerCase() === (nomeProduto || '').toLowerCase() && c.selectedBrandId) {
      marcas.add(c.selectedBrandId);
    }
  });

  select.innerHTML = Array.from(marcas).map(m => `
    <option value="${m}" ${m.toLowerCase() === marcaSelecionada.toLowerCase() ? 'selected' : ''}>🏷️ ${m}</option>
  `).join('') + `<option value="__NOVA__">+ Nova marca...</option>`;

  if (inputHidden) inputHidden.value = marcaSelecionada;
}

function confirmarNovaMarcaInline() {
  const campo = document.getElementById('inputNovaMarcaInline');
  const select = document.getElementById('cartSelectProductBrand');
  const inputHidden = document.getElementById('cartInputProductBrand');
  const boxSelect = document.getElementById('boxSelectMarca');
  const boxInput = document.getElementById('boxInputNovaMarcaInline');

  const novaMarca = (campo?.value || '').trim();

  if (novaMarca) {
    let opt = Array.from(select.options).find(o => o.value.toLowerCase() === novaMarca.toLowerCase());
    if (!opt) {
      opt = document.createElement('option');
      opt.value = novaMarca;
      opt.textContent = `🏷️ ${novaMarca}`;
      select.insertBefore(opt, select.lastElementChild);
    }
    opt.selected = true;
    if (inputHidden) inputHidden.value = novaMarca;
  } else {
    if (select && inputHidden) select.value = inputHidden.value || 'Padrão';
  }

  boxInput?.classList.add('hidden');
  boxSelect?.classList.remove('hidden');
  sincronizarPrecoFormularioCarrinho();
}

function cancelarNovaMarcaInline() {
  document.getElementById('boxInputNovaMarcaInline')?.classList.add('hidden');
  document.getElementById('boxSelectMarca')?.classList.remove('hidden');
  const select = document.getElementById('cartSelectProductBrand');
  const inputHidden = document.getElementById('cartInputProductBrand');
  if (select && inputHidden) {
    select.value = inputHidden.value || 'Padrão';
  }
}

function selectProductForCart(productId) {
  const p = (products || []).find(it => it.id === productId);
  if (p) {
    document.getElementById('cartInputProductName').value = p.name;
    document.getElementById('cartInputUnit').value = p.unit || 'un';

    atualizarSelectMarcasInline(p.name, 'Padrão');

    const precoRegistrado = obterPrecoProdutoMarcaMercado(p, 'Padrão', activeMarketId);
    const priceInput = document.getElementById('cartInputUnitPrice');
    if (priceInput) {
      priceInput.value = precoRegistrado > 0 ? formatBRL(precoRegistrado) : '';
    }

    document.getElementById('cartAutocompleteDropdown')?.classList.add('hidden');
    document.getElementById('cartBtnClearProduct')?.classList.remove('hidden');
    document.getElementById('cartInputQuantity')?.focus();
    document.getElementById('cartInputQuantity')?.select();
    updateCartItemPreview();
  }
  sincronizarPrecoFormularioCarrinho();
}

// ============================================================
// OBTENÇÃO PRECISA DE PREÇOS (PRODUTO, MARCA, MERCADO)
// ============================================================
function obterPrecoProdutoMarcaMercado(produto, marcaNome, mercadoId) {
  if (!produto || !mercadoId) return 0;

  const mId = mercadoId;
  const marca = (marcaNome || 'Padrão').trim().toLowerCase();

  if (marca === 'padrão' || marca === 'padrao') {
    if (produto.marketPrices && produto.marketPrices[mId] !== undefined && Number(produto.marketPrices[mId]) > 0) {
      return Number(produto.marketPrices[mId]);
    }
    return 0;
  }

  if (Array.isArray(produto.brands)) {
    const bObj = produto.brands.find(b => (b.name || b.id || '').toLowerCase() === marca);
    if (bObj && bObj.marketPrices && bObj.marketPrices[mId] !== undefined && Number(bObj.marketPrices[mId]) > 0) {
      return Number(bObj.marketPrices[mId]);
    }
  }

  return 0;
}

function sincronizarPrecoFormularioCarrinho() {
  const nomeProd = (document.getElementById('cartInputProductName')?.value || '').trim();
  const selectMarca = document.getElementById('cartSelectProductBrand');
  const inputPreco = document.getElementById('cartInputUnitPrice');
  const selectMercado = document.getElementById('cartSelectSupermarket') || 
                        document.getElementById('selectSupermarket') ||
                        document.querySelector('select[id*="Market"]');

  if (!nomeProd || !inputPreco) return;

  const mercadoAtualId = selectMercado?.value || activeMarketId;
  const p = (products || []).find(x => x.name.toLowerCase() === nomeProd.toLowerCase());
  if (!p) return;

  const marcaSelecionada = selectMarca ? selectMarca.value : 'Padrão';
  const precoEncontrado = obterPrecoProdutoMarcaMercado(p, marcaSelecionada, mercadoAtualId);

  inputPreco.value = precoEncontrado > 0 ? formatBRL(precoEncontrado) : '';

  if (typeof updateCartItemPreview === 'function') {
    updateCartItemPreview();
  }
}

// ============================================================
// RECALCULAR CARRINHO AO MUDAR DE MERCADO
// ============================================================
function recalcularPrecosCarrinhoPorMercado(novoMercadoId) {
  if (!novoMercadoId) return;
  activeMarketId = novoMercadoId;

  (cart || []).forEach(item => {
    const p = (products || []).find(prod => 
      (item.productId && prod.id === item.productId) || 
      prod.name.toLowerCase() === item.name.toLowerCase()
    );

    if (p) {
      item.unitPrice = obterPrecoProdutoMarcaMercado(p, item.selectedBrandId || 'Padrão', novoMercadoId);
    } else {
      item.unitPrice = 0;
    }
  });

  saveAllLocalData();
  saveCartData();
  if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
  if (typeof sincronizarPrecoFormularioCarrinho === 'function') sincronizarPrecoFormularioCarrinho();
  renderCartUI();
}

window.recalcularPrecosCarrinhoPorMercado = recalcularPrecosCarrinhoPorMercado;

// ============================================================
// RECOMENDAÇÃO INTELIGENTE DO MERCADO MAIS ECONÓMICO
// ============================================================
let recommendationMinimized = false;

window.toggleMinimizarRecomendacao = function() {
  recommendationMinimized = !recommendationMinimized;
  updateBestMarketRecommendation();
};

function updateBestMarketRecommendation() {
  const container = document.getElementById('cartBestMarketRecommendation');
  if (!container) return;

  if (!cart || cart.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const itemSemPrecoNoMercadoAtual = cart.some(item => {
    const p = (products || []).find(prod => 
      (item.productId && prod.id === item.productId) || 
      prod.name.toLowerCase() === item.name.toLowerCase()
    );
    const pr = p ? obterPrecoProdutoMarcaMercado(p, item.selectedBrandId || 'Padrão', activeMarketId) : (item.unitPrice || 0);
    return !pr || pr <= 0;
  });

  if (itemSemPrecoNoMercadoAtual) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const redesValidas = (supermarkets || []).filter(m => m.id !== 'm-padrao');
  const mercadosCompletos = [];

  redesValidas.forEach(m => {
    let temTodosOsPrecos = true;
    let custoTotal = 0;

    for (const item of cart) {
      const p = (products || []).find(prod => 
        (item.productId && prod.id === item.productId) || 
        prod.name.toLowerCase() === item.name.toLowerCase()
      );

      const precoUnit = p ? obterPrecoProdutoMarcaMercado(p, item.selectedBrandId || 'Padrão', m.id) : 0;

      if (precoUnit > 0) {
        custoTotal += precoUnit * (item.quantity || 1);
      } else {
        temTodosOsPrecos = false;
        break;
      }
    }

    if (temTodosOsPrecos) {
      mercadosCompletos.push({ market: m, total: custoTotal });
    }
  });

  if (mercadosCompletos.length < 2) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  mercadosCompletos.sort((a, b) => a.total - b.total);
  const melhorOpcao = mercadosCompletos[0];
  const mercadoAtualObj = mercadosCompletos.find(x => x.market.id === activeMarketId);

  const totalAtualExibido = mercadoAtualObj 
    ? mercadoAtualObj.total 
    : cart.reduce((acc, c) => acc + ((c.unitPrice || 0) * (c.quantity || 1)), 0);

  const economiaReal = totalAtualExibido - melhorOpcao.total;

  if (melhorOpcao.market.id === activeMarketId || economiaReal <= 0.05) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  if (recommendationMinimized) {
    container.innerHTML = `
      <div class="bg-amber-100/90 border border-amber-300 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-xs">
        <button type="button" onclick="toggleMinimizarRecomendacao()" class="flex items-center space-x-2 text-xs font-bold text-amber-900 hover:text-amber-950 text-left min-w-0">
          <span>💡</span>
          <span class="truncate">Poupança de <strong>R$ ${formatBRL(economiaReal)}</strong> no ${melhorOpcao.market.name}</span>
        </button>
        <button 
          type="button" 
          onclick="toggleMinimizarRecomendacao()" 
          class="flex items-center space-x-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded-md transition-colors shrink-0 ml-2"
        >
          <span>Expandir</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
        </button>
      </div>
    `;
    container.classList.remove('hidden');
    return;
  }

  container.innerHTML = `
    <div class="bg-amber-50 border border-amber-300 rounded-2xl p-3 sm:p-3.5 shadow-xs transition-all">
      <div class="flex items-center justify-between gap-2.5">
        <div class="flex items-center space-x-2.5 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
            💡
          </div>
          <div class="min-w-0">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <span class="text-xs font-black text-amber-900">Recomendação de Economia</span>
              <span class="bg-amber-200 text-amber-900 text-[10px] font-black px-1.5 py-0.2 rounded-md">POUPE DINHEIRO</span>
            </div>
            <p class="text-[11px] text-amber-800 truncate mt-0.5">
              No <strong>${melhorOpcao.market.name}</strong> esta lista sai por <strong>R$ ${formatBRL(melhorOpcao.total)}</strong> (poupança real de <strong>R$ ${formatBRL(economiaReal)}</strong>).
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5 shrink-0">
          <button 
            type="button" 
            onclick="trocarParaMercadoRecomendado('${melhorOpcao.market.id}')"
            class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-xs transition-transform"
          >
            Trocar Mercado
          </button>
          <button 
            type="button" 
            onclick="toggleMinimizarRecomendacao()" 
            class="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors" 
            title="Minimizar recomendação"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
}

window.trocarParaMercadoRecomendado = function(novoMercadoId) {
  const selectMercado = document.getElementById('cartSelectSupermarket') || 
                        document.getElementById('selectSupermarket') ||
                        document.querySelector('select[id*="Market"]');
  if (selectMercado) selectMercado.value = novoMercadoId;

  recalcularPrecosCarrinhoPorMercado(novoMercadoId);
  showAppToast(`Supermercado alterado para ${getSelectedMarketName()}!`, 'success');
};

// ============================================================
// GESTÃO COMPLETA DO MODAL DE EDIÇÃO DO ITEM NO CARRINHO
// ============================================================
let currentEditPromoType = 'none';
let marcaModoEdicao = 'nova';
let marcaNomeOriginal = '';
let modalComparativoAberto = false;

window.setEditPromoType = function(type) {
  currentEditPromoType = type;

  const btnNone = document.getElementById('btnEditPromoNone');
  const btnDisc = document.getElementById('btnEditPromoDiscount');
  const btnWhol = document.getElementById('btnEditPromoWholesale');

  const panelDisc = document.getElementById('panelEditPromoDiscount');
  const panelWhol = document.getElementById('panelEditPromoWholesale');

  [btnNone, btnDisc, btnWhol].forEach(btn => {
    if (btn) btn.className = 'py-1.5 rounded-lg text-center transition-all text-slate-600 hover:text-slate-900';
  });

  if (panelDisc) panelDisc.classList.add('hidden');
  if (panelWhol) panelWhol.classList.add('hidden');

  if (type === 'discount') {
    if (btnDisc) btnDisc.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelDisc) panelDisc.classList.remove('hidden');
  } else if (type === 'wholesale') {
    if (btnWhol) btnWhol.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
    if (panelWhol) panelWhol.classList.remove('hidden');
  } else {
    if (btnNone) btnNone.className = 'py-1.5 rounded-lg text-center transition-all bg-white text-emerald-800 shadow-xs font-black';
  }

  atualizarSubtotalModalEdicao();
};

window.setEditQty = function(val) {
  const input = document.getElementById('editCartItemQty');
  if (input) {
    input.value = val;
    atualizarSubtotalModalEdicao();
  }
};

window.atualizarSubtotalModalEdicao = function() {
  const precoBase = parseNumberInput(document.getElementById('editCartItemPrice')?.value) || 0;
  const qtd = parseNumberInput(document.getElementById('editCartItemQty')?.value) || 1;
  const subtotalEl = document.getElementById('editCartItemSubtotal');

  if (!subtotalEl) return;

  let valorFinal = precoBase * qtd;

  if (currentEditPromoType === 'discount') {
    const modo = document.getElementById('editPromoDiscountMode')?.value || 'percentage';
    const valDesc = parseNumberInput(document.getElementById('editPromoDiscountValue')?.value) || 0;

    if (valDesc > 0) {
      if (modo === 'percentage') {
        const perc = Math.min(100, Math.max(0, valDesc));
        valorFinal = valorFinal * (1 - (perc / 100));
      } else {
        valorFinal = Math.max(0, valorFinal - valDesc);
      }
    }
  } else if (currentEditPromoType === 'wholesale') {
    const minQtd = parseNumberInput(document.getElementById('editPromoWholesaleMinQty')?.value) || 1;
    const precoAtacado = parseNumberInput(document.getElementById('editPromoWholesalePrice')?.value) || 0;

    if (precoAtacado > 0 && qtd >= minQtd) {
      valorFinal = precoAtacado * qtd;
    }
  }

  subtotalEl.innerText = 'R$ ' + formatBRL(valorFinal);
};

window.toggleComparativoNoModalEdicao = function() {
  modalComparativoAberto = !modalComparativoAberto;
  const panel = document.getElementById('panelComparativoMercadosModal');
  const btn = document.getElementById('btnToggleComparativoModal');
  
  if (panel) panel.classList.toggle('hidden', !modalComparativoAberto);
  if (btn) {
    btn.innerText = modalComparativoAberto ? '▲ Fechar Redes' : '📊 Ver Redes';
    btn.className = modalComparativoAberto 
      ? 'text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded-md transition-colors'
      : 'text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md transition-colors';
  }

  if (modalComparativoAberto) {
    renderizarPrecosTodosMercadosModal();
  }
};

function renderizarPrecosTodosMercadosModal() {
  const container = document.getElementById('listaPrecosTodosMercadosModal');
  const labelMarca = document.getElementById('labelComparativoMarcaAtiva');
  const itemId = document.getElementById('editCartItemId')?.value;
  const item = (cart || []).find(x => x.id === itemId);
  if (!container || !item) return;

  const masterProd = (products || []).find(p => 
    (item.productId && p.id === item.productId) || 
    p.name.toLowerCase() === item.name.toLowerCase()
  );

  const selectBrand = document.getElementById('editCartItemBrand');
  const marcaAtual = (selectBrand?.value || item.selectedBrandId || 'Padrão').trim();

  if (labelMarca) labelMarca.innerText = `Marca: ${marcaAtual}`;

  const redesValidas = (supermarkets || []).filter(m => m.id !== 'm-padrao');
  let menorPreco = Infinity;

  redesValidas.forEach(m => {
    const pr = masterProd ? obterPrecoProdutoMarcaMercado(masterProd, marcaAtual, m.id) : 0;
    if (pr > 0 && pr < menorPreco) menorPreco = pr;
  });

  container.innerHTML = redesValidas.map(m => {
    const pr = masterProd ? obterPrecoProdutoMarcaMercado(masterProd, marcaAtual, m.id) : 0;
    const ehMenor = pr > 0 && pr === menorPreco;
    const ehAtivo = m.id === activeMarketId;

    return `
      <div class="p-2 rounded-xl border ${ehMenor ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200 bg-white'} flex items-center justify-between gap-2 shadow-2xs">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="font-bold text-slate-800 truncate">${m.name}</span>
            ${ehAtivo ? `<span class="bg-slate-200 text-slate-700 text-[9px] font-black px-1.5 rounded">MERCADO ATUAL</span>` : ''}
            ${ehMenor ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 rounded">MENOR</span>` : ''}
          </div>
          <span class="text-[10px] text-slate-400">${m.branch || 'SJP'}</span>
        </div>
        <div class="text-right shrink-0">
          ${pr > 0 
            ? `<span class="font-black ${ehMenor ? 'text-emerald-700' : 'text-slate-800'}">R$ ${formatBRL(pr)}</span>`
            : `<span class="text-[11px] text-slate-400 italic">Sem lançamento</span>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function sincronizarAcoesMarcaModal() {
  const selectBrand = document.getElementById('editCartItemBrand');
  const boxActions = document.getElementById('boxEditMarcaActions');
  if (!selectBrand || !boxActions) return;

  const valor = (selectBrand.value || 'Padrão').trim();
  const ehPadrao = valor.toLowerCase() === 'padrão' || valor.toLowerCase() === 'padrao';
  const ehOpcaoEspecial = valor === '__NOVA__' || valor === '';

  if (ehPadrao || ehOpcaoEspecial) {
    boxActions.classList.add('hidden');
  } else {
    boxActions.classList.remove('hidden');
  }
}

window.openEditCartItemModal = function(itemId) {
  const item = (cart || []).find(x => x.id === itemId);
  if (!item) return;

  const modal = document.getElementById('modalEditCartItem');
  if (!modal) return;

  const masterProd = (products || []).find(p => 
    (item.productId && p.id === item.productId) || 
    p.name.toLowerCase() === item.name.toLowerCase()
  );

  document.getElementById('editCartItemId').value = item.id;

  const titleEl = document.getElementById('editCartItemTitle');
  if (titleEl) {
    titleEl.innerHTML = `Editar: <span class="text-emerald-600 font-black">${item.name}</span>`;
  }

  const headerPrice = document.getElementById('editCartItemHeaderPrice');
  if (headerPrice) {
    headerPrice.innerText = item.unitPrice > 0 ? `R$ ${formatBRL(item.unitPrice)}` : '';
  }

  const inputPrice = document.getElementById('editCartItemPrice');
  if (inputPrice) inputPrice.value = item.unitPrice > 0 ? formatBRL(item.unitPrice) : '';

  const inputQty = document.getElementById('editCartItemQty');
  if (inputQty) inputQty.value = item.quantity || 1;

  const selectBrand = document.getElementById('editCartItemBrand');
  if (selectBrand) {
    const marcas = new Set(['Padrão']);
    if (item.selectedBrandId) marcas.add(item.selectedBrandId);

    if (masterProd && Array.isArray(masterProd.brands)) {
      masterProd.brands.forEach(b => {
        const n = typeof b === 'string' ? b : (b.name || b.id);
        if (n) marcas.add(n);
      });
    }

    const marcaAtual = (item.selectedBrandId || 'Padrão').trim();

    selectBrand.innerHTML = Array.from(marcas).map(m => `
      <option value="${m}" ${m.toLowerCase() === marcaAtual.toLowerCase() ? 'selected' : ''}>🏷️ ${m}</option>
    `).join('') + `<option value="__NOVA__">+ Adicionar nova marca...</option>`;

    selectBrand.onchange = function() {
      if (selectBrand.value === '__NOVA__') {
        marcaModoEdicao = 'nova';
        document.getElementById('boxEditMarcaSelect')?.classList.add('hidden');
        document.getElementById('boxEditMarcaActions')?.classList.add('hidden');
        document.getElementById('boxEditMarcaInline')?.classList.remove('hidden');
        const inputNova = document.getElementById('inputEditNovaMarca');
        if (inputNova) { inputNova.value = ''; inputNova.focus(); }
        return;
      }

      sincronizarAcoesMarcaModal();

      if (masterProd && inputPrice) {
        const pr = obterPrecoProdutoMarcaMercado(masterProd, selectBrand.value, activeMarketId);
        inputPrice.value = pr > 0 ? formatBRL(pr) : '';
        atualizarSubtotalModalEdicao();
      }

      if (modalComparativoAberto) {
        renderizarPrecosTodosMercadosModal();
      }
    };
  }

  modalComparativoAberto = false;
  document.getElementById('panelComparativoMercadosModal')?.classList.add('hidden');
  const btnComp = document.getElementById('btnToggleComparativoModal');
  if (btnComp) btnComp.innerText = '📊 Ver Redes';

  const promo = item.promo || { type: 'none' };
  setEditPromoType(promo.type || 'none');

  if (promo.type === 'discount') {
    const elMode = document.getElementById('editPromoDiscountMode');
    if (elMode) elMode.value = promo.mode || 'percentage';
    const elVal = document.getElementById('editPromoDiscountValue');
    if (elVal) elVal.value = promo.value ? formatBRL(promo.value) : '';
  } else if (promo.type === 'wholesale') {
    const elMin = document.getElementById('editPromoWholesaleMinQty');
    if (elMin) elMin.value = promo.minQty || 3;
    const elPrice = document.getElementById('editPromoWholesalePrice');
    if (elPrice) elPrice.value = promo.wholesalePrice ? formatBRL(promo.wholesalePrice) : '';
  }

  atualizarSubtotalModalEdicao();
  sincronizarAcoesMarcaModal();
  modal.classList.remove('hidden');
};

window.iniciarEdicaoNomeMarcaModal = function() {
  const selectBrand = document.getElementById('editCartItemBrand');
  if (!selectBrand) return;

  const valorAtual = selectBrand.value;
  if (!valorAtual || valorAtual === 'Padrão') return;

  marcaModoEdicao = 'renomear';
  marcaNomeOriginal = valorAtual;

  document.getElementById('boxEditMarcaSelect')?.classList.add('hidden');
  document.getElementById('boxEditMarcaActions')?.classList.add('hidden');
  document.getElementById('boxEditMarcaInline')?.classList.remove('hidden');

  const inputNome = document.getElementById('inputEditNovaMarca');
  if (inputNome) {
    inputNome.value = valorAtual;
    inputNome.focus();
    inputNome.select();
  }
};

window.confirmarNovaMarcaModalEdicao = function() {
  const inputNova = document.getElementById('inputEditNovaMarca');
  const novoNome = (inputNova?.value || '').trim();
  const selectBrand = document.getElementById('editCartItemBrand');
  const itemId = document.getElementById('editCartItemId')?.value;
  const item = (cart || []).find(x => x.id === itemId);

  if (!novoNome) {
    cancelarNovaMarcaModalEdicao();
    return;
  }

  const masterProd = (products || []).find(p => 
    (item && item.productId && p.id === item.productId) || 
    (item && p.name.toLowerCase() === item.name.toLowerCase())
  );

  if (marcaModoEdicao === 'renomear') {
    if (novoNome.toLowerCase() !== marcaNomeOriginal.toLowerCase()) {
      if (masterProd && Array.isArray(masterProd.brands)) {
        masterProd.brands.forEach(b => {
          const nomeObj = typeof b === 'string' ? b : (b.name || b.id);
          if (nomeObj && nomeObj.toLowerCase() === marcaNomeOriginal.toLowerCase()) {
            if (typeof b === 'object') {
              b.id = novoNome;
              b.name = novoNome;
            }
          }
        });
      }

      (cart || []).forEach(c => {
        if (c.selectedBrandId && c.selectedBrandId.toLowerCase() === marcaNomeOriginal.toLowerCase()) {
          c.selectedBrandId = novoNome;
        }
      });

      saveAllLocalData();
      saveCartData();
      showAppToast(`Marca alterada para "${novoNome}"!`, 'success');
    }

    if (selectBrand) {
      const optAtual = Array.from(selectBrand.options).find(o => o.value.toLowerCase() === marcaNomeOriginal.toLowerCase());
      if (optAtual) {
        optAtual.value = novoNome;
        optAtual.textContent = `🏷️ ${novoNome}`;
      }
      selectBrand.value = novoNome;
    }
  } else {
    if (masterProd) {
      if (!masterProd.brands) masterProd.brands = [];
      const existe = masterProd.brands.some(b => (b.name || b.id || '').toLowerCase() === novoNome.toLowerCase());
      if (!existe) {
        masterProd.brands.push({ id: novoNome, name: novoNome, marketPrices: {} });
        saveAllLocalData();
      }
    }

    if (selectBrand) {
      let opt = Array.from(selectBrand.options).find(o => o.value.toLowerCase() === novoNome.toLowerCase());
      if (!opt) {
        opt = document.createElement('option');
        opt.value = novoNome;
        opt.textContent = `🏷️ ${novoNome}`;
        selectBrand.insertBefore(opt, selectBrand.lastElementChild);
      }
      selectBrand.value = novoNome;
    }
  }

  cancelarNovaMarcaModalEdicao();
  sincronizarAcoesMarcaModal();
  if (modalComparativoAberto) renderizarPrecosTodosMercadosModal();
};

window.cancelarNovaMarcaModalEdicao = function() {
  document.getElementById('boxEditMarcaInline')?.classList.add('hidden');
  document.getElementById('boxEditMarcaSelect')?.classList.remove('hidden');
  marcaModoEdicao = 'nova';
  marcaNomeOriginal = '';
  sincronizarAcoesMarcaModal();
};

window.confirmarExclusaoMarcaModal = function() {
  const selectBrand = document.getElementById('editCartItemBrand');
  const marcaAlvo = (selectBrand?.value || '').trim();

  if (!marcaAlvo || marcaAlvo === 'Padrão') {
    showAppToast('A marca Padrão não pode ser excluída.', 'warning');
    return;
  }

  const labelNome = document.getElementById('labelMarcaParaExcluir');
  if (labelNome) labelNome.innerText = `"${marcaAlvo}"`;

  document.getElementById('boxEditMarcaSelect')?.classList.add('hidden');
  document.getElementById('boxEditMarcaActions')?.classList.add('hidden');
  document.getElementById('boxEditMarcaInline')?.classList.add('hidden');
  document.getElementById('boxEditMarcaConfirmDelete')?.classList.remove('hidden');
};

window.cancelarExclusaoMarcaModal = function() {
  document.getElementById('boxEditMarcaConfirmDelete')?.classList.add('hidden');
  document.getElementById('boxEditMarcaSelect')?.classList.remove('hidden');
  sincronizarAcoesMarcaModal();
};

window.executarExclusaoMarcaModal = function() {
  const selectBrand = document.getElementById('editCartItemBrand');
  const marcaAlvo = (selectBrand?.value || '').trim();

  if (!marcaAlvo || marcaAlvo === 'Padrão') {
    cancelarExclusaoMarcaModal();
    return;
  }

  const itemId = document.getElementById('editCartItemId')?.value;
  const item = (cart || []).find(x => x.id === itemId);

  const masterProd = (products || []).find(p => 
    (item && item.productId && p.id === item.productId) || 
    (item && p.name.toLowerCase() === item.name.toLowerCase())
  );

  if (masterProd && Array.isArray(masterProd.brands)) {
    masterProd.brands = masterProd.brands.filter(b => {
      const nomeObj = typeof b === 'string' ? b : (b.name || b.id);
      return (nomeObj || '').toLowerCase() !== marcaAlvo.toLowerCase();
    });
  }

  (cart || []).forEach(c => {
    if ((c.selectedBrandId || '').toLowerCase() === marcaAlvo.toLowerCase()) {
      c.selectedBrandId = 'Padrão';
      if (masterProd) {
        c.unitPrice = obterPrecoProdutoMarcaMercado(masterProd, 'Padrão', activeMarketId);
      }
    }
  });

  if (selectBrand) {
    const opt = Array.from(selectBrand.options).find(o => o.value.toLowerCase() === marcaAlvo.toLowerCase());
    if (opt) opt.remove();
    selectBrand.value = 'Padrão';
  }

  const inputPrice = document.getElementById('editCartItemPrice');
  if (inputPrice && masterProd) {
    const precoPadrao = obterPrecoProdutoMarcaMercado(masterProd, 'Padrão', activeMarketId);
    inputPrice.value = precoPadrao > 0 ? formatBRL(precoPadrao) : '';
  }

  saveAllLocalData();
  saveCartData();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderCartUI === 'function') renderCartUI();
  atualizarSubtotalModalEdicao();

  cancelarExclusaoMarcaModal();
  showAppToast(`Marca "${marcaAlvo}" removida.`, 'info');
};

window.closeEditCartItemModal = function() {
  document.getElementById('modalEditCartItem')?.classList.add('hidden');
  cancelarNovaMarcaModalEdicao();
};

window.salvarEdicaoItemCarrinho = function() {
  const id = document.getElementById('editCartItemId')?.value;
  const item = (cart || []).find(x => x.id === id);
  if (!item) return;

  const novoPreco = parseNumberInput(document.getElementById('editCartItemPrice')?.value) || 0;
  const novaQtd = parseNumberInput(document.getElementById('editCartItemQty')?.value) || 1;
  const selectBrand = document.getElementById('editCartItemBrand');
  const novaMarca = selectBrand ? selectBrand.value : (item.selectedBrandId || 'Padrão');

  if (novaQtd <= 0) {
    showAppToast('Informe uma quantidade válida.', 'warning');
    return;
  }

  item.unitPrice = novoPreco;
  item.quantity = novaQtd;
  item.selectedBrandId = novaMarca;

  if (currentEditPromoType === 'discount') {
    item.promo = {
      type: 'discount',
      mode: document.getElementById('editPromoDiscountMode')?.value || 'percentage',
      value: parseNumberInput(document.getElementById('editPromoDiscountValue')?.value) || 0
    };
  } else if (currentEditPromoType === 'wholesale') {
    item.promo = {
      type: 'wholesale',
      minQty: parseNumberInput(document.getElementById('editPromoWholesaleMinQty')?.value) || 1,
      wholesalePrice: parseNumberInput(document.getElementById('editPromoWholesalePrice')?.value) || 0
    };
  } else {
    item.promo = { type: 'none' };
  }

  const masterProd = (products || []).find(p => 
    (item.productId && p.id === item.productId) || 
    p.name.toLowerCase() === item.name.toLowerCase()
  );

  if (masterProd) {
    if (!masterProd.brands) masterProd.brands = [];
    if (novaMarca.toLowerCase() !== 'padrão' && novaMarca.toLowerCase() !== 'padrao') {
      let bObj = masterProd.brands.find(b => (b.name || b.id || '').toLowerCase() === novaMarca.toLowerCase());
      if (!bObj) {
        bObj = { id: novaMarca, name: novaMarca, marketPrices: {} };
        masterProd.brands.push(bObj);
      }
      if (!bObj.marketPrices) bObj.marketPrices = {};
      if (activeMarketId !== 'm-padrao' && novoPreco > 0) {
        bObj.marketPrices[activeMarketId] = novoPreco;
      }
    } else {
      if (!masterProd.marketPrices) masterProd.marketPrices = {};
      if (activeMarketId !== 'm-padrao' && novoPreco > 0) {
        masterProd.marketPrices[activeMarketId] = novoPreco;
      }
    }

    saveAllLocalData();
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
    if (typeof enviarProdutoParaPlanilha === 'function' && activeMarketId !== 'm-padrao' && novoPreco > 0) {
      enviarProdutoParaPlanilha(masterProd, activeMarketId, novoPreco, novaMarca);
    }
  }

  saveCartData();
  closeEditCartItemModal();
  renderCartUI();

  if (typeof playAppBeep === 'function') playAppBeep('check');
  showAppToast(`"${item.name} (${novaMarca})" atualizado!`, 'success');
};

// ============================================================
// OPERAÇÕES E RENDERIZAÇÃO DA LISTA DO CARRINHO
// ============================================================
function setCartQuickQty(val) {
  const el = document.getElementById('cartInputQuantity');
  if (el) {
    el.value = val;
    updateCartItemPreview();
  }
}

function setCartFilterMode(mode) {
  cartFilterMode = mode;
  ['all', 'pending', 'checked'].forEach(m => {
    const btn = document.getElementById(`tabFilter${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (btn) {
      if (m === mode) {
        btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
        btn.classList.remove('text-slate-600');
      } else {
        btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
        btn.classList.add('text-slate-600');
      }
    }
  });
  renderCartUI();
}

function renderCartUI() {
  let catalogoAlterado = false;
  (cart || []).forEach(item => {
    let p = (products || []).find(prod => 
      (item.productId && prod.id === item.productId) || 
      prod.name.toLowerCase() === item.name.toLowerCase()
    );

    if (!p) {
      p = {
        id: 'p-custom-' + Date.now() + '-' + Math.floor(Math.random() * 899 + 100),
        name: item.name,
        category: item.category || 'Geral',
        unit: item.unit || 'un',
        basePrice: item.unitPrice > 0 ? item.unitPrice : 0,
        marketPrices: {},
        brands: []
      };

      if (activeMarketId !== 'm-padrao' && item.unitPrice > 0) {
        p.marketPrices[activeMarketId] = item.unitPrice;
      }

      if (!Array.isArray(products)) products = [];
      products.unshift(p);
      catalogoAlterado = true;
    }

    if (!item.productId) {
      item.productId = p.id;
    }
  });

  if (catalogoAlterado) {
    saveAllLocalData();
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
  }
  const q = (document.getElementById('cartSearchFilter')?.value || '').toLowerCase().trim();
  const totalItems = cart.length;
  const checkedItems = cart.filter(i => i.checked).length;
  const pendingItems = totalItems - checkedItems;

  ['cartBadgeAll', 'navCartBadgeCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = totalItems;
  });
  if (document.getElementById('cartBadgePending')) document.getElementById('cartBadgePending').innerText = pendingItems;
  if (document.getElementById('cartBadgeChecked')) document.getElementById('cartBadgeChecked').innerText = checkedItems;

  const displayList = cart.filter(item => {
    if (cartFilterMode === 'pending' && item.checked) return false;
    if (cartFilterMode === 'checked' && !item.checked) return false;
    if (q && !item.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const container = document.getElementById('cartItemsContainer');
  const emptyCard = document.getElementById('cartEmptyCard');
  if (!container || !emptyCard) return;

  if (cart.length === 0) {
    container.innerHTML = '';
    emptyCard.classList.remove('hidden');
  } else {
    emptyCard.classList.add('hidden');
    if (displayList.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">Nenhum produto encontrado neste filtro.</div>`;
    } else {
      container.innerHTML = displayList.map(item => {
        const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
        const isChecked = item.checked;
        return `
          <div class="bg-white rounded-xl p-3 border ${isChecked ? 'border-emerald-200 bg-emerald-50/40 opacity-75' : 'border-slate-200 shadow-sm'}">
            <div class="flex items-center justify-between gap-2.5">
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <button type="button" onclick="toggleCartItemCheck('${item.id}')" class="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-300'}">
                  <svg class="w-4 h-4 ${isChecked ? 'block' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </button>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-1.5 flex-wrap">
                    <h4 class="font-extrabold text-sm text-slate-800 truncate ${isChecked ? 'line-through text-slate-500' : ''}">${item.name}</h4>
                    <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded font-bold">${item.unit}</span>
                    <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 rounded font-black border border-emerald-300">
                      🏷️ ${item.selectedBrandId || 'Padrão'}
                    </span>
                  </div>
                  <div class="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                    <span>${formatQty(item.quantity)} ${item.unit} × R$ ${formatBRL(item.unitPrice)}</span>
                    ${calc.badgeText ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 rounded">🏷️ ${calc.badgeText}</span>` : ''}
                  </div>
                </div>
              </div>

              <div class="flex items-center space-x-1.5 shrink-0">
                <div class="text-right mr-1">
                  <div class="text-sm font-black text-slate-900 leading-tight">R$ ${formatBRL(calc.finalSubtotal)}</div>
                  ${calc.savings > 0 ? `<div class="text-[10px] font-bold text-emerald-600">-R$ ${formatBRL(calc.savings)}</div>` : ''}
                </div>
                <div class="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button type="button" onclick="stepCartQty('${item.id}', -1)" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs">–</button>
                  <button type="button" onclick="stepCartQty('${item.id}', 1)" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs">+</button>
                </div>
                <button type="button" onclick="openEditCartItemModal('${item.id}')" class="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                <button type="button" onclick="removeCartItem('${item.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
  updateCartTotals(totalItems, checkedItems);
  updateBestMarketRecommendation();
}

function updateCartTotals(totalItems, checkedItems) {
  let grandTotal = 0;
  let totalSavings = 0;
  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    grandTotal += calc.finalSubtotal;
    totalSavings += calc.savings;
  });

  const t = document.getElementById('checkoutGrandTotal');
  if (t) t.innerText = `R$ ${formatBRL(grandTotal)}`;
  const i = document.getElementById('checkoutTotalItemsLabel');
  if (i) i.innerText = `${totalItems} itens`;
  const r = document.getElementById('checkoutCheckedRatioLabel');
  if (r) r.innerText = `${checkedItems}/${totalItems} no carrinho`;
  const s = document.getElementById('checkoutSavingsBadge');
  if (s) {
    if (totalSavings > 0) {
      s.innerText = `Econ. R$ ${formatBRL(totalSavings)}`;
      s.classList.remove('hidden');
    } else {
      s.classList.add('hidden');
    }
  }
}

function toggleCartItemCheck(id) {
  const it = (cart || []).find(x => x.id === id);
  if (it) {
    it.checked = !it.checked;
    playAppBeep('check');
    saveCartData();
    renderCartUI();
  }
}

function stepCartQty(id, delta) {
  const it = (cart || []).find(x => x.id === id);
  if (!it) return;
  const step = it.unit === 'kg' ? 0.25 : 1;
  const next = it.quantity + (delta * step);
  if (next <= 0) {
    removeCartItem(id);
  } else {
    it.quantity = Number(next.toFixed(3));
    saveCartData();
    renderCartUI();
  }
}

function removeCartItem(id) {
  const idx = (cart || []).findIndex(x => x.id === id);
  if (idx > -1) {
    cart.splice(idx, 1);
    saveCartData();
    renderCartUI();
    showAppToast('Item removido', 'info');
  }
}

function askClearCart() {
  if (cart.length === 0) return;
  openCustomDialog(
    'Limpar Carrinho?',
    'Deseja remover todos os itens ou apenas os que já foram pegos?',
    'Limpar Todos',
    'Limpar Só os Pegos',
    () => { cart = []; saveCartData(); renderCartUI(); showAppToast('Carrinho limpo!', 'info'); },
    () => { cart = cart.filter(it => !it.checked); saveCartData(); renderCartUI(); showAppToast('Itens pegos removidos!', 'info'); }
  );
}

function askFinishPurchase() {
  if (cart.length === 0) return;
  let total = 0;
  cart.forEach(i => total += computeItemFinancials(i.quantity, i.unitPrice, i.promo).finalSubtotal);
  openCustomDialog(
    'Concluir Compra?',
    `Deseja finalizar a compra em ${getSelectedMarketName()} totalizando R$ ${formatBRL(total)}?`,
    'Concluir e Limpar',
    'Concluir e Manter Lista',
    () => executeFinishPurchase(true),
    () => executeFinishPurchase(false)
  );
}

function executeFinishPurchase(clearAfter) {
  let gT = 0;
  let tS = 0;
  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    gT += calc.finalSubtotal;
    tS += calc.savings;
    let p = (products || []).find(prod => prod.name.toLowerCase() === item.name.toLowerCase());
    if (p && activeMarketId !== 'm-padrao') {
      if (!p.marketPrices) p.marketPrices = {};
      p.marketPrices[activeMarketId] = item.unitPrice;
      enviarProdutoParaPlanilha(p, activeMarketId, item.unitPrice, item.selectedBrandId || 'Padrão');
    }
  });

  purchaseHistory.unshift({
    id: 'pur-' + Date.now(),
    date: new Date().toISOString(),
    marketId: activeMarketId,
    marketName: getSelectedMarketName(),
    total: gT,
    savings: tS,
    itemCount: cart.length,
    items: JSON.parse(JSON.stringify(cart))
  });

  if (clearAfter) cart = [];
  else cart.forEach(it => it.checked = false);

  saveAllLocalData();
  saveCartData();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  playAppBeep('finish');
  showAppToast('Compra concluída e preços gravados!', 'success');
}

// ============================================================
// OUVINTES DE EVENTOS (DELEGADOS E UNIFICADOS)
// ============================================================
document.addEventListener('change', (e) => {
  if (e.target && (e.target.id === 'cartSelectSupermarket' || 
                   e.target.id === 'selectSupermarket' || 
                   e.target.id === 'cartActiveMarketSelect' ||
                   e.target.matches('select[id*="Market"]'))) {
    recalcularPrecosCarrinhoPorMercado(e.target.value);
  }

  if (e.target && e.target.id === 'cartSelectProductBrand') {
    const val = e.target.value;
    const hiddenInput = document.getElementById('cartInputProductBrand');

    if (val === '__NOVA__') {
      document.getElementById('boxSelectMarca')?.classList.add('hidden');
      document.getElementById('boxInputNovaMarcaInline')?.classList.remove('hidden');
      const campo = document.getElementById('inputNovaMarcaInline');
      if (campo) { campo.value = ''; campo.focus(); }
      return;
    }

    if (hiddenInput) hiddenInput.value = val;
    sincronizarPrecoFormularioCarrinho();
  }
});

const inputBuscaCarrinho = document.getElementById('cartSearchFilter') || 
                           document.querySelector('input[placeholder*="Buscar no carrinho"]');
inputBuscaCarrinho?.addEventListener('input', () => {
  renderCartUI();
});

const inputProdName = document.getElementById('cartInputProductName');
const dropdownProd = document.getElementById('cartAutocompleteDropdown');
const btnClearProd = document.getElementById('cartBtnClearProduct');

inputProdName?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const containerMarca = document.getElementById('containerMarcaInline');

  if (btnClearProd) btnClearProd.classList.toggle('hidden', q.length === 0);

  if (q.length < 1) {
    if (containerMarca) containerMarca.classList.add('hidden');
    if (dropdownProd) {
      dropdownProd.classList.add('hidden');
      dropdownProd.innerHTML = '';
    }
    return;
  }

  if (containerMarca) containerMarca.classList.remove('hidden');
  atualizarSelectMarcasInline(e.target.value, document.getElementById('cartInputProductBrand')?.value || 'Padrão');

  const matches = (products || []).filter(p => 
    p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
  ).slice(0, 6);

  if (matches.length > 0 && dropdownProd) {
    dropdownProd.innerHTML = `
      <div class="p-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
        <span>Sugestões no Catálogo:</span>
        <button type="button" onclick="document.getElementById('cartAutocompleteDropdown').classList.add('hidden')" class="text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded">✕</button>
      </div>
    ` + matches.map(p => {
      const pPrice = obterPrecoProdutoMarcaMercado(p, 'Padrão', activeMarketId) || p.basePrice;
      return `
        <div class="px-3.5 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer flex items-center justify-between text-xs transition-colors" onclick="selectProductForCart('${p.id}')">
          <div class="min-w-0 pr-2">
            <span class="font-bold text-slate-800 block truncate">${p.name}</span>
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${p.category || 'Geral'}</span>
          </div>
          <div class="text-right text-emerald-700 font-black shrink-0">
            ${pPrice > 0 ? 'R$ ' + formatBRL(pPrice) : 'A cotar'}
            <span class="text-[10px] text-slate-500 font-normal"> / ${p.unit}</span>
          </div>
        </div>
      `;
    }).join('');
    dropdownProd.classList.remove('hidden');
  } else if (dropdownProd) {
    dropdownProd.classList.add('hidden');
    dropdownProd.innerHTML = '';
  }
});

function fecharDropdownSugestoes() {
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  const input = document.getElementById('cartInputProductName');
  if (!dropdown || !input) return;

  if (!input.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

['cartInputUnitPrice', 'cartInputQuantity', 'cartInputUnit'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('focus', fecharDropdownSugestoes);
    el.addEventListener('click', fecharDropdownSugestoes);
  }
});

btnClearProd?.addEventListener('click', () => {
  if (inputProdName) inputProdName.value = '';
  btnClearProd.classList.add('hidden');
  dropdownProd?.classList.add('hidden');
  document.getElementById('containerMarcaInline')?.classList.add('hidden');
  inputProdName?.focus();
  updateCartItemPreview();
});

// ============================================================
// CADASTRO AUTOMÁTICO DE PRODUTO LOCAL AO ADICIONAR NO CARRINHO
// ============================================================

// Garante que todo item do carrinho exista como produto no catálogo
function garantirProdutoNoCatalogo(nome, unidade = 'un', precoUnitario = 0, marca = 'Padrão') {
  if (!nome || !nome.trim()) return null;

  const nomeLimpo = nome.trim();
  let masterProd = (products || []).find(p => p.name.toLowerCase() === nomeLimpo.toLowerCase());

  // Se não existir, cria o produto no catálogo como item local
  if (!masterProd) {
    masterProd = {
      id: 'p-custom-' + Date.now() + '-' + Math.floor(Math.random() * 899 + 100),
      name: nomeLimpo,
      category: 'Geral',
      unit: unidade || 'un',
      basePrice: precoUnitario > 0 ? precoUnitario : 0,
      marketPrices: {},
      brands: []
    };

    if (activeMarketId !== 'm-padrao' && precoUnitario > 0) {
      if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
        masterProd.marketPrices[activeMarketId] = precoUnitario;
      } else {
        masterProd.brands.push({
          id: marca,
          name: marca,
          marketPrices: { [activeMarketId]: precoUnitario }
        });
      }
    }

    if (!Array.isArray(products)) products = [];
    products.unshift(masterProd);
    saveAllLocalData();
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
  } else {
    // Se já existir, sincroniza a cotação com o mercado ativo se houver preço
    if (activeMarketId !== 'm-padrao' && precoUnitario > 0) {
      if (!masterProd.marketPrices) masterProd.marketPrices = {};

      if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
        masterProd.marketPrices[activeMarketId] = precoUnitario;
      } else {
        if (!masterProd.brands) masterProd.brands = [];
        let bObj = masterProd.brands.find(b => (b.name || b.id || '').toLowerCase() === marca.toLowerCase());
        if (!bObj) {
          bObj = { id: marca, name: marca, marketPrices: {} };
          masterProd.brands.push(bObj);
        }
        if (!bObj.marketPrices) bObj.marketPrices = {};
        bObj.marketPrices[activeMarketId] = precoUnitario;
      }

      saveAllLocalData();
      if (typeof renderCatalogUI === 'function') renderCatalogUI();
      if (typeof enviarProdutoParaPlanilha === 'function') {
        enviarProdutoParaPlanilha(masterProd, activeMarketId, precoUnitario, marca);
      }
    }
  }

  return masterProd;
}

// Submissão do formulário do carrinho com cadastro automático no catálogo
document.getElementById('formAddCartItem')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const nameInput = document.getElementById('cartInputProductName');
  const name = (nameInput?.value || '').trim();

  if (!name) {
    showAppToast('Informe ou selecione um produto.', 'warning');
    return;
  }

  const unit = document.getElementById('cartSelectUnit')?.value || 
               document.getElementById('cartInputUnit')?.value || 'un';
  const unitPrice = parseNumberInput(document.getElementById('cartInputUnitPrice')?.value) || 0;
  const quantity = parseNumberInput(document.getElementById('cartInputQuantity')?.value) || 1;
  
  const brandVal = document.getElementById('cartInputProductBrand')?.value || 
                   document.getElementById('cartSelectProductBrand')?.value || 'Padrão';
  const selectedBrandId = (brandVal === '__NOVA__') ? 'Padrão' : brandVal;

  const promo = typeof getCartFormPromoConfig === 'function' 
    ? getCartFormPromoConfig() 
    : { type: 'none' };

  // 1. Cria ou recupera o produto mestre no catálogo
  const masterProd = garantirProdutoNoCatalogo(name, unit, unitPrice, selectedBrandId);

  // 2. Insere no carrinho já vinculado ao ID do produto
  cart.unshift({
    id: 'c-item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    productId: masterProd ? masterProd.id : null,
    selectedBrandId: selectedBrandId || 'Padrão',
    name: masterProd ? masterProd.name : name,
    category: masterProd ? (masterProd.category || 'Geral') : 'Geral',
    unit: masterProd ? (masterProd.unit || unit) : unit,
    unitPrice: unitPrice,
    quantity: quantity,
    checked: false,
    promo: promo
  });

  saveCartData();
  renderCartUI();
  if (typeof playAppBeep === 'function') playAppBeep('add');
  showAppToast(`"${name} (${selectedBrandId})" adicionado e cadastrado!`, 'success');

  // Limpeza dos campos
  if (nameInput) nameInput.value = '';
  const priceInput = document.getElementById('cartInputUnitPrice');
  if (priceInput) priceInput.value = '';
  const qtyInput = document.getElementById('cartInputQuantity');
  if (qtyInput) qtyInput.value = '1';

  document.getElementById('cartBtnClearProduct')?.classList.add('hidden');
  setCartPromoMode('none');
  nameInput?.focus();
  document.getElementById('containerMarcaInline')?.classList.add('hidden');

  const brandHidden = document.getElementById('cartInputProductBrand');
  if (brandHidden) brandHidden.value = 'Padrão';
  const brandSelect = document.getElementById('cartSelectProductBrand');
  if (brandSelect) brandSelect.value = 'Padrão';
});

document.getElementById('formSaveCartItemEdit')?.addEventListener('submit', (e) => {
  e.preventDefault();
  salvarEdicaoItemCarrinho();
});

document.getElementById('formEditCartItem')?.addEventListener('submit', (e) => {
  e.preventDefault();
  salvarEdicaoItemCarrinho();
});

// Inicialização imediata
higienizarInputsCarrinho();
setCartPromoMode('none');