/**
 * SUPERCOMPRAS PRO - MOTOR LÓGICO UNIFICADO
 * Sincronização dinâmica com Google Sheets, rotas por endereço e mercado neutro
 */

const API_GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxRfZ-hImEkXNgJGd6seMhVULwnpkp3tR-Ll-uXeaWRe8ZhcX_jvImmUl-G0SBTHnnV/exec";

// Estabelecimento neutro padrão: compras e cotações gerais sem bandeira física
const MERCADO_PADRAO_GENERICO = {
  id: 'm-padrao',
  name: 'Mercado',
  branch: 'Referência Geral',
  address: '',
  promoDay: '',
  urlEncarte: '',
  colIndex: null
};

let supermarkets = [ MERCADO_PADRAO_GENERICO ];
let products = [];
let cart = [];
let activeMarketId = 'm-padrao';
let purchaseHistory = [];
let currentTab = 'compras';
let cartFilterMode = 'all';
let selectedCatalogCategory = 'Todas';
let isSoundOn = true;

const CATEGORIES = [
  'Todas', 
  'Açougue e Carnes', 
  'Laticínios e Frios', 
  'Mercearia e Básicos', 
  'Hortifrúti e Ovos', 
  'Higiene e Limpeza', 
  'Geral'
];

// ============================================================
// 1. SEGURANÇA E COMUNICAÇÃO COM O GOOGLE SHEETS
// ============================================================
function getSecurityToken() {
  return localStorage.getItem('sc_security_token') || '';
}

function salvarChaveSeguranca() {
  const input = document.getElementById('inputSecurityToken');
  const val = (input.value || '').trim();
  if (!val) {
    showAppToast('Informe uma chave válida.', 'error');
    return;
  }
  localStorage.setItem('sc_security_token', val);
  showAppToast('Chave de segurança salva neste aparelho!', 'success');
  document.getElementById('modalBackup').classList.add('hidden');
}

async function sincronizarComPlanilha() {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      showAppToast('Sincronização cancelada: chave necessária.', 'info');
      return;
    }
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const btn = document.getElementById('btnSyncPlanilha');
  if (btn) btn.classList.add('animate-spin');
  showAppToast('Sincronizando com a planilha...', 'info');

  try {
    const res = await fetch(`${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}`);
    const json = await res.json();

    if (json.status === 'success') {
      // 1. Atualiza lista de supermercados preservando o genérico no topo
      if (Array.isArray(json.supermercados) && json.supermercados.length > 0) {
        supermarkets = [ MERCADO_PADRAO_GENERICO ];
        json.supermercados.forEach(m => {
          supermarkets.push({
            id: m.id,
            name: m.name,
            sigla: m.sigla || '',
            branch: m.branch || 'São José dos Pinhais',
            address: m.address || '',
            colIndex: m.colIndex || null,
            urlEncarte: m.urlEncarte || '',
            promoDay: m.promoDay || ''
          });
        });
      }

      // 2. Atualiza catálogo e matriz de cotações
      if (Array.isArray(json.produtos)) {
        json.produtos.forEach(sp => {
          const localIdx = products.findIndex(p => p.name.toLowerCase() === sp.name.toLowerCase());
          if (localIdx > -1) {
            products[localIdx].marketPrices = { ...products[localIdx].marketPrices, ...sp.marketPrices };
            products[localIdx].basePrice = sp.basePrice || products[localIdx].basePrice;
            products[localIdx].unit = sp.unit || products[localIdx].unit;
            products[localIdx].category = sp.category || products[localIdx].category;
          } else {
            products.push(sp);
          }
        });
      }

      saveAllLocalData();
      refreshActiveMarketUI();
      renderCartUI();
      renderCatalogUI();
      renderMarketsUI();
      showAppToast(`Sincronizado: ${products.length} itens e ${supermarkets.length - 1} redes.`, 'success');
    } else {
      if (json.message && json.message.includes('não autorizado')) {
        localStorage.removeItem('sc_security_token');
      }
      throw new Error(json.message || 'Falha na resposta da API');
    }
  } catch (err) {
    showAppToast('Erro ao sincronizar: ' + err.message, 'error');
  } finally {
    if (btn) btn.classList.remove('animate-spin');
  }
}

async function enviarProdutoParaPlanilha(produto, marketId, preco) {
  const token = getSecurityToken();
  if (!token || marketId === 'm-padrao') return;

  const mercadoAlvo = supermarkets.find(m => m.id === marketId);
  if (!mercadoAlvo || !mercadoAlvo.colIndex) return;

  const payload = {
    token: token,
    name: produto.name,
    unit: produto.unit,
    quantity: produto.quantity || 1,
    marketColIndex: mercadoAlvo.colIndex,
    price: preco,
    category: produto.category || 'Geral'
  };

  try {
    await fetch(API_GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {}
}

// ============================================================
// 2. TRAÇADO DE ROTAS VIA ENDEREÇO (GOOGLE MAPS)
// ============================================================
function abrirSupermercadoNoMaps(marketId, rotaDireta = true) {
  const m = supermarkets.find(x => x.id === marketId);
  if (!m || m.id === 'm-padrao' || !m.address) {
    showAppToast('Selecione uma rede física com endereço para traçar rota.', 'info');
    return;
  }

  const destino = encodeURIComponent(m.address);
  const url = rotaDireta
    ? `https://www.google.com/maps/dir/?api=1&destination=${destino}`
    : `https://www.google.com/maps/search/?api=1&query=${destino}`;

  window.open(url, '_blank');
}

// ============================================================
// 3. PERSISTÊNCIA LOCAL E UTILITÁRIOS
// ============================================================
function parseNumberInput(val) {
  if (!val) return 0;
  const limpo = String(val).trim().replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

function formatBRL(num) {
  return (Number(num) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(num) {
  const n = Number(num) || 0;
  return n % 1 === 0 ? n.toString() : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function loadApplicationData() {
  try {
    const savedM = JSON.parse(localStorage.getItem('sc_supermarkets_v3'));
    if (Array.isArray(savedM) && savedM.length > 0) {
      supermarkets = savedM;
      if (!supermarkets.some(m => m.id === 'm-padrao')) {
        supermarkets.unshift(MERCADO_PADRAO_GENERICO);
      }
    } else {
      supermarkets = [ MERCADO_PADRAO_GENERICO ];
    }
  } catch (e) {
    supermarkets = [ MERCADO_PADRAO_GENERICO ];
  }

  try { products = JSON.parse(localStorage.getItem('sc_products_v3')) || []; } catch (e) { products = []; }
  try { cart = JSON.parse(localStorage.getItem('sc_cart_v3')) || []; } catch (e) { cart = []; }
  try { purchaseHistory = JSON.parse(localStorage.getItem('sc_history_v3')) || []; } catch (e) { purchaseHistory = []; }

  const savedActiveMarket = localStorage.getItem('sc_active_market_v3');
  if (savedActiveMarket && supermarkets.some(m => m.id === savedActiveMarket)) {
    activeMarketId = savedActiveMarket;
  } else {
    activeMarketId = 'm-padrao';
  }

  saveAllLocalData();
  refreshActiveMarketUI();
  renderCartUI();
  renderCatalogUI();
  renderMarketsUI();
}

function saveAllLocalData() {
  localStorage.setItem('sc_supermarkets_v3', JSON.stringify(supermarkets));
  localStorage.setItem('sc_products_v3', JSON.stringify(products));
  localStorage.setItem('sc_active_market_v3', activeMarketId);
  localStorage.setItem('sc_cart_v3', JSON.stringify(cart));
  localStorage.setItem('sc_history_v3', JSON.stringify(purchaseHistory));
}

function saveCartData() {
  localStorage.setItem('sc_cart_v3', JSON.stringify(cart));
  renderCartUI();
}

// ============================================================
// 4. INTERFACE, ABAS E SELETOR ATIVO
// ============================================================
function switchActiveTab(tabName) {
  currentTab = tabName;
  document.getElementById('viewCompras').classList.toggle('hidden', tabName !== 'compras');
  document.getElementById('viewProdutos').classList.toggle('hidden', tabName !== 'produtos');
  document.getElementById('viewSupermercados').classList.toggle('hidden', tabName !== 'supermercados');
  document.getElementById('cartFloatingCheckoutBar').classList.toggle('hidden', tabName !== 'compras');

  ['compras', 'produtos', 'supermercados'].forEach(name => {
    const el = document.getElementById('navBtn' + name.charAt(0).toUpperCase() + name.slice(1));
    if (el) {
      if (name === tabName) {
        el.classList.add('text-emerald-700', 'font-extrabold');
        el.classList.remove('text-slate-600', 'font-semibold');
      } else {
        el.classList.add('text-slate-600', 'font-semibold');
        el.classList.remove('text-emerald-700', 'font-extrabold');
      }
    }
  });

  if (tabName === 'produtos') renderCatalogUI();
  if (tabName === 'supermercados') renderMarketsUI();
}

function refreshActiveMarketUI() {
  const sel = document.getElementById('selectActiveMarket');
  if (sel) {
    sel.innerHTML = supermarkets.map(m => `
      <option value="${m.id}" ${m.id === activeMarketId ? 'selected' : ''}>${m.name} (${m.branch || 'SJP'})</option>
    `).join('');
  }

  const current = supermarkets.find(m => m.id === activeMarketId);
  if (current) {
    document.getElementById('topMarketSubtitle').innerText = `${current.name} • ${current.branch || 'SJP'}`;
    const tag = document.getElementById('marketPromoTag');
    if (current.promoDay) {
      document.getElementById('marketPromoText').innerText = current.promoDay;
      tag.classList.remove('hidden');
    } else {
      tag.classList.add('hidden');
    }
  }
}

document.getElementById('selectActiveMarket')?.addEventListener('change', (e) => {
  activeMarketId = e.target.value;
  saveAllLocalData();
  refreshActiveMarketUI();
  showAppToast(`Mercado ativo: ${getSelectedMarketName()}!`, 'info');
  updateCartItemPreview();
});

function getSelectedMarketName() {
  const m = supermarkets.find(x => x.id === activeMarketId);
  return m ? m.name : 'Mercado';
}

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
// 5. AUTOCOMPLETE E ENTRADA DE PRODUTOS NO CARRINHO
// ============================================================
document.getElementById('cartInputProductName')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const clearBtn = document.getElementById('cartBtnClearProduct');
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  clearBtn.classList.toggle('hidden', q.length === 0);

  if (q.length < 1) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  const matches = products.filter(p => 
    p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
  ).slice(0, 8);

  if (matches.length > 0) {
    dropdown.innerHTML = matches.map(p => {
      const pPrice = (p.marketPrices && p.marketPrices[activeMarketId] > 0) 
        ? p.marketPrices[activeMarketId] 
        : p.basePrice;
      return `
        <div class="px-3.5 py-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition-colors" onclick="selectProductForCart('${p.id}')">
          <div>
            <span class="font-bold text-slate-800">${p.name}</span>
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded ml-1 text-slate-600">${p.category || 'Geral'}</span>
          </div>
          <div class="text-right text-emerald-700 font-black">
            R$ ${formatBRL(pPrice)}
            <span class="text-[10px] text-slate-500 font-normal"> / ${p.unit}</span>
          </div>
        </div>
      `;
    }).join('');
  } else {
    dropdown.innerHTML = `<div class="px-3 py-2 text-xs text-slate-500 italic">Produto novo. Digite o preço e a unidade para registrá-lo.</div>`;
  }
  dropdown.classList.remove('hidden');
  updateCartItemPreview();
});

document.getElementById('cartBtnClearProduct')?.addEventListener('click', () => {
  document.getElementById('cartInputProductName').value = '';
  document.getElementById('cartBtnClearProduct').classList.add('hidden');
  document.getElementById('cartAutocompleteDropdown').classList.add('hidden');
  document.getElementById('cartInputProductName').focus();
  updateCartItemPreview();
});

function selectProductForCart(productId) {
  const p = products.find(it => it.id === productId);
  if (p) {
    document.getElementById('cartInputProductName').value = p.name;
    document.getElementById('cartInputUnit').value = p.unit || 'un';
    const precoRegistrado = (p.marketPrices && p.marketPrices[activeMarketId] > 0)
      ? p.marketPrices[activeMarketId]
      : p.basePrice;
    document.getElementById('cartInputUnitPrice').value = formatBRL(precoRegistrado);
    document.getElementById('cartAutocompleteDropdown').classList.add('hidden');
    document.getElementById('cartBtnClearProduct').classList.remove('hidden');
    document.getElementById('cartInputQuantity').focus();
    document.getElementById('cartInputQuantity').select();
    updateCartItemPreview();
  }
}

function setCartQuickQty(val) {
  document.getElementById('cartInputQuantity').value = val;
  updateCartItemPreview();
}

document.getElementById('btnToggleCartPromo')?.addEventListener('click', () => {
  const c = document.getElementById('cartPromoContent');
  const isH = c.classList.contains('hidden');
  c.classList.toggle('hidden', !isH);
  document.getElementById('cartPromoChevron').classList.toggle('rotate-180', isH);
});

function handleCartPromoTypeChange(type) {
  document.getElementById('cartPromoDiscountFields').classList.toggle('hidden', type !== 'discount');
  document.getElementById('cartPromoWholesaleFields').classList.toggle('hidden', type !== 'wholesale');
  document.getElementById('cartPromoBadge').classList.toggle('hidden', type === 'none');
  updateCartItemPreview();
}

function getFormPromoConfig() {
  const type = document.querySelector('input[name="itemPromoType"]:checked')?.value || 'none';
  if (type === 'discount') {
    return {
      type: 'discount',
      mode: document.getElementById('cartDiscountMode').value,
      value: parseNumberInput(document.getElementById('cartDiscountVal').value)
    };
  }
  if (type === 'wholesale') {
    return {
      type: 'wholesale',
      minQty: parseNumberInput(document.getElementById('cartWholesaleMin').value),
      wholesalePrice: parseNumberInput(document.getElementById('cartWholesalePrice').value)
    };
  }
  return { type: 'none' };
}

function updateCartItemPreview() {
  const q = parseNumberInput(document.getElementById('cartInputQuantity')?.value);
  const p = parseNumberInput(document.getElementById('cartInputUnitPrice')?.value);
  const calc = computeItemFinancials(q, p, getFormPromoConfig());
  const t = document.getElementById('cartItemPreviewSubtotal');
  if (t) t.innerText = `R$ ${formatBRL(calc.finalSubtotal)}`;
  const s = document.getElementById('cartItemPreviewSavings');
  if (s) {
    if (calc.savings > 0) {
      s.innerText = `(-R$ ${formatBRL(calc.savings)})`;
      s.classList.remove('hidden');
    } else {
      s.classList.add('hidden');
    }
  }
}

['cartInputUnitPrice', 'cartInputQuantity', 'cartInputUnit', 'cartDiscountMode', 'cartDiscountVal', 'cartWholesaleMin', 'cartWholesalePrice'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', updateCartItemPreview);
    el.addEventListener('change', updateCartItemPreview);
  }
});

document.getElementById('formAddCartItem')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cartInputProductName').value.trim();
  const unit = document.getElementById('cartInputUnit').value;
  const unitPrice = parseNumberInput(document.getElementById('cartInputUnitPrice').value);
  const quantity = parseNumberInput(document.getElementById('cartInputQuantity').value);

  if (!name || unitPrice <= 0 || quantity <= 0) {
    showAppToast('Indique nome, preço e quantidade válidos.', 'error');
    return;
  }

  const promo = getFormPromoConfig();
  let masterProd = products.find(p => p.name.toLowerCase() === name.toLowerCase());

  if (!masterProd) {
    masterProd = {
      id: 'p-custom-' + Date.now(),
      name: name,
      category: 'Geral',
      unit: unit,
      basePrice: unitPrice,
      marketPrices: {}
    };
    products.push(masterProd);
  }

  if (!masterProd.marketPrices) masterProd.marketPrices = {};
  if (activeMarketId !== 'm-padrao') {
    masterProd.marketPrices[activeMarketId] = unitPrice;
    enviarProdutoParaPlanilha(masterProd, activeMarketId, unitPrice);
  } else {
    masterProd.basePrice = unitPrice;
  }
  saveAllLocalData();

  const existingIdx = cart.findIndex(it => it.name.toLowerCase() === name.toLowerCase() && it.unit === unit);
  if (existingIdx > -1) {
    cart[existingIdx].quantity += quantity;
    cart[existingIdx].unitPrice = unitPrice;
    if (promo.type !== 'none') cart[existingIdx].promo = promo;
    showAppToast(`"${name}" teve a quantidade somada!`, 'info');
  } else {
    cart.unshift({
      id: 'c-item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      productId: masterProd.id,
      name: name,
      category: masterProd.category || 'Geral',
      unit: unit,
      unitPrice: unitPrice,
      quantity: quantity,
      checked: false,
      promo: promo
    });
    showAppToast(`"${name}" adicionado ao carrinho!`, 'success');
  }

  playAppBeep('add');
  saveCartData();

  document.getElementById('cartInputProductName').value = '';
  document.getElementById('cartInputUnitPrice').value = '';
  document.getElementById('cartInputQuantity').value = '1';
  document.getElementById('cartBtnClearProduct').classList.add('hidden');
  document.querySelector('input[name="itemPromoType"][value="none"]').checked = true;
  handleCartPromoTypeChange('none');
  ['cartDiscountVal', 'cartWholesaleMin', 'cartWholesalePrice'].forEach(id => document.getElementById(id).value = '');
  updateCartItemPreview();
  document.getElementById('cartInputProductName').focus();
});

// ============================================================
// 6. RENDERIZAÇÃO DO CARRINHO E EDIÇÃO
// ============================================================
document.getElementById('cartSearchFilter')?.addEventListener('input', () => renderCartUI());

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
  const it = cart.find(x => x.id === id);
  if (it) {
    it.checked = !it.checked;
    playAppBeep('check');
    saveCartData();
  }
}

function stepCartQty(id, delta) {
  const it = cart.find(x => x.id === id);
  if (!it) return;
  const step = it.unit === 'kg' ? 0.25 : 1;
  const next = it.quantity + (delta * step);
  if (next <= 0) removeCartItem(id);
  else {
    it.quantity = Number(next.toFixed(3));
    saveCartData();
  }
}

function removeCartItem(id) {
  const idx = cart.findIndex(x => x.id === id);
  if (idx > -1) {
    cart.splice(idx, 1);
    saveCartData();
    showAppToast("Item removido", 'info');
  }
}

function askClearCart() {
  if (cart.length === 0) return;
  openCustomDialog(
    'Limpar Carrinho?',
    'Deseja remover todos os itens ou apenas os que já foram pegos?',
    'Limpar Todos',
    'Limpar Só os Pegos',
    () => { cart = []; saveCartData(); showAppToast('Carrinho limpo!', 'info'); },
    () => { cart = cart.filter(it => !it.checked); saveCartData(); showAppToast('Itens pegos removidos!', 'info'); }
  );
}

function openEditCartItemModal(itemId) {
  const item = cart.find(x => x.id === itemId);
  if (!item) return;

  document.getElementById('editCartItemId').value = item.id;
  document.getElementById('modalEditCartTitle').innerText = item.name;
  document.getElementById('modalEditCartSubtitle').innerText = `Unidade: ${item.unit} • ${item.category || 'Geral'}`;
  document.getElementById('editCartItemPrice').value = formatBRL(item.unitPrice);
  document.getElementById('editCartItemQty').value = formatQty(item.quantity);

  const promoType = item.promo?.type || 'none';
  const radio = document.querySelector(`input[name="editItemPromoType"][value="${promoType}"]`);
  if (radio) radio.checked = true;

  handleEditItemPromoTypeChange(promoType);
  if (promoType === 'discount') {
    document.getElementById('editCartDiscountMode').value = item.promo.mode || 'percent';
    document.getElementById('editCartDiscountVal').value = item.promo.value ? item.promo.value.toString().replace('.', ',') : '';
  } else if (promoType === 'wholesale') {
    document.getElementById('editCartWholesaleMin').value = item.promo.minQty ? item.promo.minQty.toString().replace('.', ',') : '';
    document.getElementById('editCartWholesalePrice').value = item.promo.wholesalePrice ? formatBRL(item.promo.wholesalePrice) : '';
  }

  updateEditCartModalPreview();
  document.getElementById('modalEditCartItem').classList.remove('hidden');
  document.getElementById('editCartItemQty').focus();
}

function closeEditCartItemModal() {
  document.getElementById('modalEditCartItem').classList.add('hidden');
}

function setEditCartQuickQty(val) {
  document.getElementById('editCartItemQty').value = val;
  updateEditCartModalPreview();
}

function handleEditItemPromoTypeChange(type) {
  document.getElementById('editPromoDiscountFields').classList.toggle('hidden', type !== 'discount');
  document.getElementById('editPromoWholesaleFields').classList.toggle('hidden', type !== 'wholesale');
  updateEditCartModalPreview();
}

document.getElementById('formSaveCartItemEdit')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const item = cart.find(x => x.id === document.getElementById('editCartItemId').value);
  if (!item) return;

  const newPrice = parseNumberInput(document.getElementById('editCartItemPrice').value);
  const newQty = parseNumberInput(document.getElementById('editCartItemQty').value);
  if (newPrice <= 0 || newQty <= 0) return;

  item.unitPrice = newPrice;
  item.quantity = newQty;
  item.promo = getEditFormPromoConfig();

  const masterProd = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
  if (masterProd) {
    if (!masterProd.marketPrices) masterProd.marketPrices = {};
    if (activeMarketId !== 'm-padrao') {
      masterProd.marketPrices[activeMarketId] = newPrice;
      enviarProdutoParaPlanilha(masterProd, activeMarketId, newPrice);
    } else {
      masterProd.basePrice = newPrice;
    }
    saveAllLocalData();
  }

  saveCartData();
  closeEditCartItemModal();
  playAppBeep('check');
  showAppToast(`"${item.name}" atualizado!`, 'success');
});

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
    let p = products.find(prod => prod.name.toLowerCase() === item.name.toLowerCase());
    if (p && activeMarketId !== 'm-padrao') {
      if (!p.marketPrices) p.marketPrices = {};
      p.marketPrices[activeMarketId] = item.unitPrice;
      enviarProdutoParaPlanilha(p, activeMarketId, item.unitPrice);
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
  renderCatalogUI();
  renderMarketsUI();
  playAppBeep('finish');
  showAppToast('Compra concluída e preços gravados!', 'success');
}

// ============================================================
// 7. CATÁLOGO DE PRODUTOS E COMPARATIVO DE PREÇOS
// ============================================================
document.getElementById('catalogSearchInput')?.addEventListener('input', () => renderCatalogUI());

function renderCatalogUI() {
  const cBadge = document.getElementById('catalogTotalCountBadge');
  if (cBadge) cBadge.innerText = products.length;

  const tabs = document.getElementById('catalogCategoryTabs');
  if (tabs) {
    tabs.innerHTML = CATEGORIES.map(cat => `
      <button type="button" onclick="selectCatalogCategory('${cat}')" class="px-3 py-1.5 rounded-xl whitespace-nowrap ${selectedCatalogCategory === cat ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'bg-slate-200/80 text-slate-700 font-semibold'}">${cat}</button>
    `).join('');
  }

  const q = (document.getElementById('catalogSearchInput')?.value || '').toLowerCase().trim();
  const filtered = products.filter(p => {
    if (selectedCatalogCategory !== 'Todas' && p.category !== selectedCatalogCategory) return false;
    if (q && !p.name.toLowerCase().includes(q) && !(p.category && p.category.toLowerCase().includes(q))) return false;
    return true;
  });

  const cList = document.getElementById('catalogProductList');
  if (!cList) return;

  if (filtered.length === 0) {
    cList.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">Nenhum produto cadastrado. Toque no botão de sincronização no topo.</div>`;
    return;
  }

  cList.innerHTML = filtered.map(p => {
    const curP = (p.marketPrices && p.marketPrices[activeMarketId] > 0)
      ? p.marketPrices[activeMarketId]
      : null;

    return `
      <div class="bg-white rounded-xl p-3 border border-slate-200 shadow-sm transition-all">
        <div class="flex items-center justify-between gap-2.5">
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <h4 class="font-extrabold text-sm text-slate-800 truncate">${p.name}</h4>
              <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${p.category || 'Geral'}</span>
              <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">${p.unit}</span>
            </div>
            <div class="text-xs text-slate-500 mt-1 flex items-center space-x-2 flex-wrap">
              <span>Base: <strong class="text-slate-800">R$ ${formatBRL(p.basePrice)}</strong></span>
              <span>•</span>
              <span>No ${getSelectedMarketName()}: <strong class="${curP ? 'text-emerald-700 font-extrabold' : 'text-slate-400 italic'}">${curP ? 'R$ ' + formatBRL(curP) : 'Sem cotação'}</strong></span>
            </div>
          </div>
          <div class="flex items-center space-x-1.5 shrink-0">
            <button type="button" onclick="openPriceCompareModal('${p.id}')" class="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all"><span class="hidden sm:inline">Preços</span> 🏷️</button>
            <button type="button" onclick="openProductEditModal('${p.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
            <button type="button" onclick="quickAddToCartFromCatalog('${p.id}')" class="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg></button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function selectCatalogCategory(cat) {
  selectedCatalogCategory = cat;
  renderCatalogUI();
}

function quickAddToCartFromCatalog(productId) {
  selectProductForCart(productId);
  switchActiveTab('compras');
  showAppToast('Produto selecionado! Ajuste a quantidade.', 'info');
}

function openProductEditModal(productId = null) {
  if (productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    document.getElementById('editProdId').value = p.id;
    document.getElementById('editProdName').value = p.name;
    document.getElementById('editProdCategory').value = p.category || 'Geral';
    document.getElementById('editProdUnit').value = p.unit || 'un';
    document.getElementById('editProdBasePrice').value = formatBRL(p.basePrice);
  } else {
    document.getElementById('editProdId').value = '';
    document.getElementById('editProdName').value = '';
    document.getElementById('editProdCategory').value = 'Geral';
    document.getElementById('editProdUnit').value = 'un';
    document.getElementById('editProdBasePrice').value = '';
  }
  document.getElementById('modalProductEdit').classList.remove('hidden');
  document.getElementById('editProdName').focus();
}

function closeProductEditModal() {
  document.getElementById('modalProductEdit').classList.add('hidden');
}

document.getElementById('formSaveProductCatalog')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editProdId').value;
  const name = document.getElementById('editProdName').value.trim();
  const category = document.getElementById('editProdCategory').value;
  const unit = document.getElementById('editProdUnit').value;
  const bp = parseNumberInput(document.getElementById('editProdBasePrice').value);
  if (!name || bp <= 0) return;

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
      id: 'p-' + Date.now(),
      name: name,
      category: category,
      unit: unit,
      basePrice: bp,
      marketPrices: {}
    };
    products.unshift(p);
  }

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();
  if (p && activeMarketId !== 'm-padrao') enviarProdutoParaPlanilha(p, activeMarketId, bp);
  showAppToast('Produto salvo com sucesso!', 'success');
});

function openPriceCompareModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  document.getElementById('compareTargetProdId').value = p.id;
  document.getElementById('compareProdName').innerText = p.name;
  document.getElementById('compareProdDetails').innerText = `Unidade: ${p.unit} • Preço Base: R$ ${formatBRL(p.basePrice)}`;

  const sel = document.getElementById('compareSelectMarket');
  // Lista apenas redes físicas no comparativo de preços
  sel.innerHTML = supermarkets.filter(m => m.id !== 'm-padrao').map(m => `
    <option value="${m.id}" ${m.id === activeMarketId ? 'selected' : ''}>${m.name}</option>
  `).join('');

  syncPriceFieldToSelectedMarket(p.id, sel.value);
  sel.onchange = (e) => syncPriceFieldToSelectedMarket(p.id, e.target.value);
  renderPriceCompareTable(p);
  document.getElementById('modalPriceCompare').classList.remove('hidden');
}

function syncPriceFieldToSelectedMarket(pId, mId) {
  const p = products.find(x => x.id === pId);
  const input = document.getElementById('compareInputPrice');
  if (p && p.marketPrices && p.marketPrices[mId] !== undefined) {
    input.value = formatBRL(p.marketPrices[mId]);
  } else {
    input.value = formatBRL(p ? p.basePrice : 0);
  }
}

function renderPriceCompareTable(product) {
  const redesReais = supermarkets.filter(m => m.id !== 'm-padrao');
  let menorPreco = Infinity;
  redesReais.forEach(m => {
    const pr = product.marketPrices?.[m.id];
    if (pr !== undefined && pr > 0 && pr < menorPreco) menorPreco = pr;
  });

  document.getElementById('comparePricesTable').innerHTML = redesReais.map(m => {
    const hasP = product.marketPrices && product.marketPrices[m.id] > 0;
    const pr = hasP ? product.marketPrices[m.id] : null;
    const isMenor = hasP && pr === menorPreco && menorPreco !== Infinity;

    return `
      <div class="p-2.5 rounded-xl border ${isMenor ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 bg-slate-50'} flex items-center justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="font-bold text-xs text-slate-800">${m.name}</span>
            <span class="text-[10px] text-slate-500">(${m.branch || 'SJP'})</span>
            ${isMenor ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 rounded-full">MENOR PREÇO</span>` : ''}
          </div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5">${m.promoDay || 'Sem dia fixo'}</div>
        </div>

        <div class="flex items-center space-x-2 shrink-0">
          <div class="text-right">
            ${hasP 
              ? `<span class="text-xs font-black ${isMenor ? 'text-emerald-700' : 'text-slate-800'}">R$ ${formatBRL(pr)}</span>` 
              : `<span class="text-[11px] text-slate-400 italic">Sem lançamento</span>`
            }
          </div>
          <button type="button" onclick="loadMarketToDirectEdit('${product.id}', '${m.id}')" class="p-1.5 bg-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-slate-700" title="Editar este preço">✎</button>
        </div>
      </div>
    `;
  }).join('');
}

function loadMarketToDirectEdit(pId, mId) {
  document.getElementById('compareSelectMarket').value = mId;
  syncPriceFieldToSelectedMarket(pId, mId);
  const input = document.getElementById('compareInputPrice');
  input.focus();
  input.select();
}

document.getElementById('formRegisterMarketPrice')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const pId = document.getElementById('compareTargetProdId').value;
  const mId = document.getElementById('compareSelectMarket').value;
  const pr = parseNumberInput(document.getElementById('compareInputPrice').value);
  if (!pId || !mId || pr <= 0) return;

  const p = products.find(x => x.id === pId);
  if (!p) return;

  if (!p.marketPrices) p.marketPrices = {};
  p.marketPrices[mId] = pr;

  saveAllLocalData();
  renderPriceCompareTable(p);
  renderCatalogUI();
  renderMarketsUI();
  enviarProdutoParaPlanilha(p, mId, pr);
  showAppToast('Preço gravado com sucesso!', 'success');
});

// ============================================================
// 8. LISTAGEM DE SUPERMERCADOS COM AÇÕES
// ============================================================
function renderMarketsUI() {
  const mBadge = document.getElementById('marketTotalCountBadge');
  if (mBadge) mBadge.innerText = supermarkets.filter(m => m.id !== 'm-padrao').length;

  const container = document.getElementById('marketsListContainer');
  if (!container) return;

  container.innerHTML = supermarkets.map(m => {
    const isCur = m.id === activeMarketId;
    const isPadrao = m.id === 'm-padrao';

    return `
      <div class="bg-white rounded-2xl p-4 border ${isCur ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-200 shadow-sm'}">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center space-x-2">
              <h3 class="font-black text-base text-slate-800">${m.name}</h3>
              ${isCur ? `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">ATIVO</span>` : ''}
              ${isPadrao ? `<span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">PADRÃO NEUTRO</span>` : ''}
            </div>
            <p class="text-xs text-slate-600 font-semibold mt-0.5">${m.branch || 'Afonso Pena / SJP'}</p>
            ${m.address ? `<p class="text-[11px] text-slate-500 mt-0.5">${m.address}</p>` : ''}
            ${m.promoDay ? `<div class="mt-1 text-xs text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-lg inline-block">🗓️ ${m.promoDay}</div>` : ''}
          </div>

          <div class="flex items-center space-x-1.5 shrink-0">
            ${m.address ? `
              <button type="button" onclick="abrirSupermercadoNoMaps('${m.id}', true)" class="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all" title="Traçar rota no Google Maps">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </button>
            ` : ''}

            ${m.urlEncarte ? `
              <a href="${m.urlEncarte}" target="_blank" rel="noopener noreferrer" class="p-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl transition-all" title="Ver Encarte de Ofertas">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </a>
            ` : ''}
          </div>
        </div>

        ${!isCur ? `
          <div class="pt-3 mt-3 border-t border-slate-100 text-right">
            <button type="button" onclick="selectActiveMarketFromCard('${m.id}')" class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all">
              Fazer Compras Aqui
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function selectActiveMarketFromCard(id) {
  activeMarketId = id;
  saveAllLocalData();
  refreshActiveMarketUI();
  switchActiveTab('compras');
  showAppToast(`Agora comprando em ${getSelectedMarketName()}!`, 'success');
}

// ============================================================
// 9. HISTÓRICO, BACKUP E EXPORTAÇÕES
// ============================================================
document.getElementById('btnOpenHistoryModal')?.addEventListener('click', () => {
  renderHistoryModal();
  document.getElementById('modalHistory').classList.remove('hidden');
});

function renderHistoryModal() {
  const c = document.getElementById('historyListContainer');
  if (!c) return;
  if (purchaseHistory.length === 0) {
    c.innerHTML = `<div class="text-center py-10 text-xs text-slate-500">Nenhuma compra finalizada registrada ainda.</div>`;
    return;
  }
  c.innerHTML = purchaseHistory.map(r => `
    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
      <div>
        <span class="font-bold text-emerald-700 block">${r.marketName}</span>
        <span class="text-[11px] text-slate-500">${new Date(r.date).toLocaleDateString('pt-BR')} • ${r.itemCount} itens</span>
      </div>
      <span class="font-black text-slate-900 text-sm">R$ ${formatBRL(r.total)}</span>
    </div>
  `).join('');
}

function askClearHistory() {
  if (purchaseHistory.length === 0) return;
  openCustomDialog('Limpar Histórico?', 'Deseja apagar todos os registros de compras?', 'Apagar', null, () => {
    purchaseHistory = [];
    saveAllLocalData();
    renderHistoryModal();
    showAppToast('Histórico apagado.', 'info');
  });
}

document.getElementById('btnOpenBackupModal')?.addEventListener('click', () => {
  const i = document.getElementById('inputSecurityToken');
  if (i) i.value = getSecurityToken();
  document.getElementById('modalBackup').classList.remove('hidden');
});

function exportBackupJSON() {
  const dados = JSON.stringify({ supermarkets, products, activeMarketId, cart, purchaseHistory }, null, 2);
  const blob = new Blob([dados], { type: 'application/json;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SuperCompras_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  document.getElementById('modalBackup').classList.add('hidden');
}

function handleRestoreJSON(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const p = JSON.parse(ev.target.result);
      if (p.products) {
        products = p.products;
        if (p.supermarkets) supermarkets = p.supermarkets;
        if (p.activeMarketId) activeMarketId = p.activeMarketId;
        if (p.cart) cart = p.cart;
        if (p.purchaseHistory) purchaseHistory = p.purchaseHistory;
        saveAllLocalData();
        loadApplicationData();
        showAppToast('Backup restaurado!', 'success');
        document.getElementById('modalBackup').classList.add('hidden');
      }
    } catch (err) {
      showAppToast('Erro ao ler arquivo de backup.', 'error');
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

function openExportOptionsModal() {
  if (cart.length === 0) {
    showAppToast('O carrinho está vazio.', 'info');
    return;
  }
  document.getElementById('modalExportOptions').classList.remove('hidden');
}

function copyCartToWhatsApp() {
  const marketName = getSelectedMarketName();
  let txt = `🛒 *LISTA DE COMPRAS (${marketName.toUpperCase()})*\n📅 ${new Date().toLocaleDateString('pt-BR')}\n--------------------\n`;
  let total = 0;
  cart.forEach(i => {
    const calc = computeItemFinancials(i.quantity, i.unitPrice, i.promo);
    total += calc.finalSubtotal;
    txt += `${i.checked ? '✅' : '⬜'} *${i.name}* (${formatQty(i.quantity)} ${i.unit}) = R$ ${formatBRL(calc.finalSubtotal)}\n`;
  });
  txt += `--------------------\n💰 *TOTAL PREVISTO: R$ ${formatBRL(total)}*`;

  const t = document.createElement('textarea');
  t.value = txt;
  document.body.appendChild(t);
  t.select();
  document.execCommand('copy');
  t.remove();
  showAppToast('Lista copiada para o WhatsApp!', 'success');
  document.getElementById('modalExportOptions').classList.add('hidden');
}

function exportCartCSV() {
  let csv = '\uFEFFProduto;Categoria;Unidade;Preco_Unitario;Quantidade;Subtotal;No_Carrinho\n';
  cart.forEach(it => {
    const calc = computeItemFinancials(it.quantity, it.unitPrice, it.promo);
    csv += `"${it.name.replace(/"/g, '""')}";${it.category || 'Geral'};${it.unit};${it.unitPrice.toFixed(2).replace('.', ',')};${it.quantity.toString().replace('.', ',')};${calc.finalSubtotal.toFixed(2).replace('.', ',')};${it.checked ? 'SIM' : 'NÃO'}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Compras_${getSelectedMarketName()}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  document.getElementById('modalExportOptions').classList.add('hidden');
}

// ============================================================
// 10. DIÁLOGOS, TOASTS E FEEDBACK SONORO
// ============================================================
function openCustomDialog(title, msg, pTxt, sTxt, onP, onS) {
  const d = document.getElementById('dialogCustom');
  document.getElementById('dialogTitle').innerText = title;
  document.getElementById('dialogMessage').innerText = msg;

  const bp = document.getElementById('dialogBtnPrimary');
  bp.innerText = pTxt;
  bp.onclick = () => { d.classList.add('hidden'); if (onP) onP(); };

  const bs = document.getElementById('dialogBtnSecondary');
  if (sTxt && onS) {
    bs.innerText = sTxt;
    bs.classList.remove('hidden');
    bs.onclick = () => { d.classList.add('hidden'); onS(); };
  } else {
    bs.classList.add('hidden');
  }

  document.getElementById('dialogBtnCancel').onclick = () => d.classList.add('hidden');
  d.classList.remove('hidden');
}

function showAppToast(msg, type = 'info') {
  const s = document.getElementById('toastStack');
  const t = document.createElement('div');
  t.className = `${type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800'} text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 transform translate-y-2 opacity-0 shadow-lg pointer-events-auto`;
  t.innerHTML = `<span>${msg}</span>`;
  s.appendChild(t);
  requestAnimationFrame(() => t.classList.remove('translate-y-2', 'opacity-0'));
  setTimeout(() => {
    t.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => t.remove(), 300);
  }, 2700);
}

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioInst = null;
function playAppBeep(kind = 'click') {
  if (!isSoundOn) return;
  try {
    if (!audioInst) audioInst = new AudioCtx();
    if (audioInst.state === 'suspended') audioInst.resume();
    const osc = audioInst.createOscillator();
    const gain = audioInst.createGain();
    osc.connect(gain);
    gain.connect(audioInst.destination);
    const t = audioInst.currentTime;
    if (kind === 'add') {
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.start(t);
      osc.stop(t + 0.14);
    } else if (kind === 'check') {
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(650, t + 0.1);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (kind === 'finish') {
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.2);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  } catch (err) {}
}

document.getElementById('btnToggleAudio')?.addEventListener('click', () => {
  isSoundOn = !isSoundOn;
  document.getElementById('soundOnIcon').classList.toggle('hidden', !isSoundOn);
  document.getElementById('soundOffIcon').classList.toggle('hidden', isSoundOn);
  showAppToast(isSoundOn ? 'Sons ativados' : 'Sons desativados', 'info');
});

// ============================================================
// 11. INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
  loadApplicationData();
  updateCartItemPreview();

  if (navigator.onLine && getSecurityToken()) {
    await sincronizarComPlanilha();
  }
});