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
let pendingSyncPayload = { produtos: [], supermercados: [] };
let selectedSyncProducts = new Set();
let selectedSyncMarkets = new Set();
let activeSyncTab = 'produtos';
let catalogSyncFilter = 'all';
let selectedCatalogProductIds = new Set();

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
async function abrirModalSincronizacaoSeletiva() {
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
  showAppToast('Baixando dados da planilha...', 'info');

  try {
    const res = await fetch(`${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}`);
    const json = await res.json();

    if (json.status !== 'success') {
      throw new Error(json.message || 'Falha na resposta da API');
    }

    pendingSyncPayload.produtos = Array.isArray(json.produtos) ? json.produtos : [];
    pendingSyncPayload.supermercados = Array.isArray(json.supermercados) ? json.supermercados : [];

    // Por padrão, todos começam pré-selecionados
    selectedSyncProducts = new Set(pendingSyncPayload.produtos.map(p => p.name.toLowerCase()));
    selectedSyncMarkets = new Set(pendingSyncPayload.supermercados.map(m => m.id));

    document.getElementById('syncProdCount').innerText = pendingSyncPayload.produtos.length;
    document.getElementById('syncMarketCount').innerText = pendingSyncPayload.supermercados.length;

    switchSyncTab('produtos');
    document.getElementById('modalSelectiveSync').classList.remove('hidden');
  } catch (err) {
    showAppToast('Erro ao consultar planilha: ' + err.message, 'error');
  } finally {
    if (btn) btn.classList.remove('animate-spin');
  }
}

async function promoverMercadoEmEdicaoParaPlanilha() {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      showAppToast('Chave de segurança necessária para sincronizar.', 'error');
      return;
    }
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const idAtual = document.getElementById('editMarketId').value;
  const m = supermarkets.find(x => x.id === idAtual);
  if (!m) {
    showAppToast('Erro: registro do mercado não localizado.', 'error');
    return;
  }

  const nome = (document.getElementById('editMarketName').value || m.name || '').trim();
  const bairro = (document.getElementById('editMarketBranch').value || m.branch || '').trim();
  const endereco = (document.getElementById('editMarketAddress').value || m.address || '').trim();
  const encarte = (document.getElementById('editMarketUrlEncarte').value || m.urlEncarte || '').trim();

  if (!nome) {
    showAppToast('Informe o nome da rede.', 'error');
    return;
  }

  const btn = document.getElementById('btnPromoverMercado');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Sincronizando com a planilha...';
  }

  showAppToast('Criando mercado e coluna na planilha Google...', 'info');

  try {
    const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=criar_mercado&name=${encodeURIComponent(nome)}&branch=${encodeURIComponent(bairro)}&address=${encodeURIComponent(endereco)}&urlEncarte=${encodeURIComponent(encarte)}`;
    
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success') {
      const idAntigo = m.id;
      m.id = json.novoId;
      m.colIndex = json.colIndex;
      m.name = json.name;
      m.address = json.address;
      m.linkMaps = json.linkMaps;

      if (activeMarketId === idAntigo) {
        activeMarketId = json.novoId;
      }

      saveAllLocalData();
      refreshActiveMarketUI();
      renderMarketsUI();
      renderCatalogUI();
      closeMarketEditModal();

      showAppToast(`"${json.name}" adicionado à planilha com sucesso (Coluna ${json.colIndex})!`, 'success');
    } else {
      throw new Error(json.message || 'Falha ao processar na planilha.');
    }
  } catch (err) {
    showAppToast('Erro na sincronização: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Sincronizar este mercado com a planilha';
    }
  }
}

// Sincronizar o produto local com a planilha Google
async function promoverProdutoEmEdicaoParaPlanilha() {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      showAppToast('Chave de segurança necessária para sincronizar.', 'error');
      return;
    }
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const idAtual = document.getElementById('editProdId').value;
  const p = products.find(x => x.id === idAtual);
  if (!p) {
    showAppToast('Registro do produto não localizado.', 'error');
    return;
  }

  const nome = (document.getElementById('editProdName').value || p.name || '').trim();
  const categoria = document.getElementById('editProdCategory').value || p.category || 'Geral';
  const unidade = document.getElementById('editProdUnit').value || p.unit || 'un';
  const preco = parseNumberInput(document.getElementById('editProdBasePrice').value);

  if (!nome) {
    showAppToast('Informe o nome do produto.', 'error');
    return;
  }

  const btn = document.getElementById('btnPromoverProduto');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Enviando para a planilha...';
  }

  showAppToast('Cadastrando produto na planilha Google...', 'info');

  try {
    const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=criar_produto&name=${encodeURIComponent(nome)}&category=${encodeURIComponent(categoria)}&unit=${encodeURIComponent(unidade)}&price=${encodeURIComponent(preco)}`;
    
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success' && json.action === 'created_product') {
      p.id = json.id; // Atualiza para o ID oficial vindo da planilha (ex: p-sheet-72)
      p.name = json.name;
      p.category = json.category;
      p.unit = json.unit;
      p.basePrice = json.basePrice;

      saveAllLocalData();
      renderCatalogUI();
      closeProductEditModal();

      showAppToast(`"${json.name}" foi registrado com sucesso na planilha Google!`, 'success');
    } else {
      throw new Error(json.message || 'A planilha não confirmou o cadastro do produto.');
    }
  } catch (err) {
    showAppToast('Erro ao sincronizar produto: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Sincronizar este produto com a planilha';
    }
  }
}

function closeSelectiveSyncModal() {
  document.getElementById('modalSelectiveSync').classList.add('hidden');
}
// ============================================================
// MODAL DE EDIÇÃO DO ITEM NO CARRINHO (LÁPIS DA LISTA)
// ============================================================
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

  // Executa o cálculo com segurança
  updateEditCartModalPreview();

  // Exibe a janela no navegador
  document.getElementById('modalEditCartItem').classList.remove('hidden');
  setTimeout(() => document.getElementById('editCartItemQty').focus(), 50);
}

function updateEditCartModalPreview() {
  const qEl = document.getElementById('editCartItemQty');
  const pEl = document.getElementById('editCartItemPrice');
  const previewSub = document.getElementById('editCartPreviewSubtotal');
  const previewSav = document.getElementById('editCartPreviewSavings');

  if (!qEl || !pEl || !previewSub) return;

  const q = parseNumberInput(qEl.value);
  const p = parseNumberInput(pEl.value);
  const calc = computeItemFinancials(q, p, getEditFormPromoConfig());

  previewSub.innerText = `R$ ${formatBRL(calc.finalSubtotal)}`;

  if (previewSav) {
    if (calc.savings > 0) {
      previewSav.innerText = `(-R$ ${formatBRL(calc.savings)})`;
      previewSav.classList.remove('hidden');
    } else {
      previewSav.classList.add('hidden');
    }
  }
}
function switchSyncTab(tab) {
  activeSyncTab = tab;
  const isProd = tab === 'produtos';

  document.getElementById('tabSyncProdBtn').className = isProd
    ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm'
    : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100';

  document.getElementById('tabSyncMarketBtn').className = !isProd
    ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm'
    : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100';

  document.getElementById('syncProductsList').classList.toggle('hidden', !isProd);
  document.getElementById('syncMarketsList').classList.toggle('hidden', isProd);

  renderSyncLists();
}

function renderSyncLists() {
  const isProd = activeSyncTab === 'produtos';
  const selectAllBox = document.getElementById('checkSyncSelectAll');

  if (isProd) {
    const total = pendingSyncPayload.produtos.length;
    const marcados = selectedSyncProducts.size;
    selectAllBox.checked = total > 0 && marcados === total;
    document.getElementById('labelSyncSelectedCounter').innerText = `${marcados} de ${total} produtos`;

    document.getElementById('syncProductsList').innerHTML = pendingSyncPayload.produtos.map(p => {
      const isChecked = selectedSyncProducts.has(p.name.toLowerCase());
      return `
        <div class="flex items-center justify-between p-2 rounded-xl border ${isChecked ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'} text-xs">
          <label class="flex items-center space-x-2.5 flex-1 cursor-pointer min-w-0">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSingleProductSync('${p.name.replace(/'/g, "\\'")}', this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
            <div class="truncate">
              <span class="font-bold text-slate-800">${p.name}</span>
              <span class="text-[10px] text-slate-500 ml-1">(${p.unit || 'un'} - ${p.category || 'Geral'})</span>
            </div>
          </label>
          <button type="button" onclick="syncSingleItemNow('produto', '${p.name.replace(/'/g, "\\'")}')" class="px-2 py-1 bg-white border border-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-slate-700 transition-colors shrink-0">
            Sincar Só Este
          </button>
        </div>
      `;
    }).join('');
  } else {
    const total = pendingSyncPayload.supermercados.length;
    const marcados = selectedSyncMarkets.size;
    selectAllBox.checked = total > 0 && marcados === total;
    document.getElementById('labelSyncSelectedCounter').innerText = `${marcados} de ${total} mercados`;

    document.getElementById('syncMarketsList').innerHTML = pendingSyncPayload.supermercados.map(m => {
      const isChecked = selectedSyncMarkets.has(m.id);
      return `
        <div class="flex items-center justify-between p-2 rounded-xl border ${isChecked ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'} text-xs">
          <label class="flex items-center space-x-2.5 flex-1 cursor-pointer min-w-0">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSingleMarketSync('${m.id}', this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
            <div class="truncate">
              <span class="font-bold text-slate-800">${m.name}</span>
              <span class="text-[10px] text-slate-500 ml-1">(${m.branch || 'SJP'})</span>
            </div>
          </label>
          <button type="button" onclick="syncSingleItemNow('mercado', '${m.id}')" class="px-2 py-1 bg-white border border-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-slate-700 transition-colors shrink-0">
            Sincar Só Este
          </button>
        </div>
      `;
    }).join('');
  }
}

function toggleSelectAllSync(checked) {
  if (activeSyncTab === 'produtos') {
    if (checked) {
      selectedSyncProducts = new Set(pendingSyncPayload.produtos.map(p => p.name.toLowerCase()));
    } else {
      selectedSyncProducts.clear();
    }
  } else {
    if (checked) {
      selectedSyncMarkets = new Set(pendingSyncPayload.supermercados.map(m => m.id));
    } else {
      selectedSyncMarkets.clear();
    }
  }
  renderSyncLists();
}

function toggleSingleProductSync(name, checked) {
  const key = name.toLowerCase();
  if (checked) selectedSyncProducts.add(key);
  else selectedSyncProducts.delete(key);
  renderSyncLists();
}

function toggleSingleMarketSync(id, checked) {
  if (checked) selectedSyncMarkets.add(id);
  else selectedSyncMarkets.delete(id);
  renderSyncLists();
}

function applySelectiveSync() {
  let contadorProd = 0;
  let contadorMerc = 0;

  // 1. Aplica mercados selecionados
  if (selectedSyncMarkets.size > 0) {
    const mercadosCriadosNoApp = supermarkets.filter(m => m.id && m.id.startsWith('m-custom-'));
    const mercadosFiltrados = pendingSyncPayload.supermercados.filter(m => selectedSyncMarkets.has(m.id));

    supermarkets = [ MERCADO_PADRAO_GENERICO ];
    mercadosFiltrados.forEach(m => {
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
      contadorMerc++;
    });

    mercadosCriadosNoApp.forEach(mLocal => {
      if (!supermarkets.some(m => m.id === mLocal.id)) {
        supermarkets.push(mLocal);
      }
    });
  }

  // 2. Aplica produtos selecionados
  if (selectedSyncProducts.size > 0) {
    pendingSyncPayload.produtos.forEach(sp => {
      if (selectedSyncProducts.has(sp.name.toLowerCase())) {
        const localIdx = products.findIndex(p => p.name.toLowerCase() === sp.name.toLowerCase());
        if (localIdx > -1) {
          products[localIdx].marketPrices = { ...products[localIdx].marketPrices, ...sp.marketPrices };
          products[localIdx].basePrice = sp.basePrice || products[localIdx].basePrice;
          products[localIdx].unit = sp.unit || products[localIdx].unit;
          products[localIdx].category = sp.category || products[localIdx].category;
        } else {
          products.push(sp);
        }
        contadorProd++;
      }
    });
  }

  saveAllLocalData();
  refreshActiveMarketUI();
  renderMarketsUI();
  renderCatalogUI();
  renderCartUI();
  closeSelectiveSyncModal();

  showAppToast(`Sincronizados com sucesso: ${contadorProd} produtos e ${contadorMerc} mercados.`, 'success');
}

function syncSingleItemNow(type, identifier) {
  if (type === 'produto') {
    const sp = pendingSyncPayload.produtos.find(p => p.name.toLowerCase() === identifier.toLowerCase());
    if (!sp) return;
    const localIdx = products.findIndex(p => p.name.toLowerCase() === sp.name.toLowerCase());
    if (localIdx > -1) {
      products[localIdx].marketPrices = { ...products[localIdx].marketPrices, ...sp.marketPrices };
      products[localIdx].basePrice = sp.basePrice || products[localIdx].basePrice;
      products[localIdx].unit = sp.unit || products[localIdx].unit;
      products[localIdx].category = sp.category || products[localIdx].category;
    } else {
      products.push(sp);
    }
    showAppToast(`Produto "${sp.name}" atualizado individualmente!`, 'success');
  } else {
    const sm = pendingSyncPayload.supermercados.find(m => m.id === identifier);
    if (!sm) return;
    const localIdx = supermarkets.findIndex(m => m.id === sm.id);
    const objFormatado = {
      id: sm.id,
      name: sm.name,
      sigla: sm.sigla || '',
      branch: sm.branch || 'São José dos Pinhais',
      address: sm.address || '',
      colIndex: sm.colIndex || null,
      urlEncarte: sm.urlEncarte || '',
      promoDay: sm.promoDay || ''
    };
    if (localIdx > -1) {
      supermarkets[localIdx] = objFormatado;
    } else {
      supermarkets.push(objFormatado);
    }
    showAppToast(`Mercado "${sm.name}" atualizado individualmente!`, 'success');
  }

  saveAllLocalData();
  refreshActiveMarketUI();
  renderMarketsUI();
  renderCatalogUI();
  renderCartUI();
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
      // 1. Atualiza lista de supermercados preservando o genérico E os mercados criados no app
      if (Array.isArray(json.supermercados) && json.supermercados.length > 0) {
        // Resgata mercados manuais criados pelo botão "Novo Supermercado"
        const mercadosCriadosNoApp = supermarkets.filter(m => m.id && m.id.startsWith('m-custom-'));

        supermarkets = [ MERCADO_PADRAO_GENERICO ];
        const ignoredMarkets = getIgnoredMarkets();

        json.supermercados.forEach(m => {
         if (!ignoredMarkets.includes(m.id)) {
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
       }
      });

        // Reanexa os mercados manuais locais
        mercadosCriadosNoApp.forEach(mLocal => {
          if (!supermarkets.some(m => m.id === mLocal.id)) {
            supermarkets.push(mLocal);
          }
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
    const subtitle = document.getElementById('topMarketSubtitle');
    if (subtitle) {
      subtitle.innerText = `${current.name} • ${current.branch || 'SJP'}`;
    }
    
    const tag = document.getElementById('marketPromoTag');
    const textPromo = document.getElementById('marketPromoText');
    if (tag) {
      if (current.promoDay) {
        if (textPromo) textPromo.innerText = current.promoDay;
        tag.classList.remove('hidden');
      } else {
        tag.classList.add('hidden');
      }
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
const inputProdName = document.getElementById('cartInputProductName');
const dropdownProd = document.getElementById('cartAutocompleteDropdown');
const btnClearProd = document.getElementById('cartBtnClearProduct');

inputProdName?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (btnClearProd) btnClearProd.classList.toggle('hidden', q.length === 0);

  if (q.length < 1) {
    if (dropdownProd) {
      dropdownProd.classList.add('hidden');
      dropdownProd.innerHTML = '';
    }
    return;
  }

  const matches = products.filter(p => 
    p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
  ).slice(0, 6);

  if (matches.length > 0) {
    dropdownProd.innerHTML = `
      <div class="p-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
        <span>Sugestões no Catálogo:</span>
        <button type="button" onclick="fecharDropdownSugestoes()" class="text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded">✕ Fechar</button>
      </div>
    ` + matches.map(p => {
      const pPrice = (p.marketPrices && p.marketPrices[activeMarketId] > 0) 
        ? p.marketPrices[activeMarketId] 
        : p.basePrice;
      return `
        <div class="px-3.5 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer flex items-center justify-between text-xs transition-colors" onclick="selectProductForCart('${p.id}')">
          <div class="min-w-0 pr-2">
            <span class="font-bold text-slate-800 block truncate">${p.name}</span>
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${p.category || 'Geral'}</span>
          </div>
          <div class="text-right text-emerald-700 font-black shrink-0">
            R$ ${formatBRL(pPrice)}
            <span class="text-[10px] text-slate-500 font-normal"> / ${p.unit}</span>
          </div>
        </div>
      `;
    }).join('');
    dropdownProd.classList.remove('hidden');
  } else {
    dropdownProd.innerHTML = `
      <div class="p-2.5 bg-amber-50 text-amber-900 text-xs flex items-center justify-between">
        <span class="font-medium">✨ Produto novo! Preencha o valor abaixo.</span>
        <button type="button" onclick="fecharDropdownSugestoes()" class="text-amber-800 font-bold text-xs px-2 py-1 bg-amber-200/60 rounded-lg">OK</button>
      </div>
    `;
    dropdownProd.classList.remove('hidden');
  }
  updateCartItemPreview();
});

function fecharDropdownSugestoes() {
  const d = document.getElementById('cartAutocompleteDropdown');
  if (d) d.classList.add('hidden');
}

// 1. Fecha automaticamente ao tocar em qualquer campo inferior
['cartInputUnitPrice', 'cartInputQuantity', 'cartInputUnit'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('focus', fecharDropdownSugestoes);
    el.addEventListener('click', fecharDropdownSugestoes);
  }
});

// 2. Fecha ao tocar fora do campo de pesquisa no ecrã
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  const input = document.getElementById('cartInputProductName');
  if (!dropdown || !input) return;

  if (!input.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
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

// ============================================================
// CONTROLE DO FORMULÁRIO RESPONSIVO E FAB MULTI-ABAS NO TELEMÓVEL
// ============================================================
function abrirSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  const fab = document.getElementById('fabOpenAddItem');

  if (container && backdrop) {
    backdrop.classList.remove('hidden');
    container.classList.remove('translate-y-full');
    if (fab) fab.classList.add('hidden');
    setTimeout(() => {
      document.getElementById('cartInputProductName')?.focus();
    }, 150);
  }
}

function fecharSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  const fab = document.getElementById('fabOpenAddItem');
  const dropdown = document.getElementById('cartAutocompleteDropdown');

  if (dropdown) dropdown.classList.add('hidden');

  if (container && backdrop) {
    container.classList.add('translate-y-full');
    backdrop.classList.add('hidden');
    if (fab) fab.classList.remove('hidden');
  }
}

function executarAcaoFabContextual() {
  if (currentTab === 'compras') {
    abrirSheetAdicionarItem();
  } else if (currentTab === 'produtos') {
    openProductEditModal();
  } else if (currentTab === 'supermercados' || currentTab === 'mercados') {
    openMarketEditModal();
  }
}

function atualizarEstadoFabMobile(tabName) {
  const fab = document.getElementById('fabOpenAddItem');
  const compBtn = document.getElementById('fabOpenComparator');

  if (typeof fecharSheetAdicionarItem === 'function') {
    fecharSheetAdicionarItem();
  }

  // 1. Controle da Calculadora Comparativa: visível apenas na lista de compras
  if (compBtn) {
    compBtn.classList.toggle('hidden', tabName !== 'compras');
  }

  // 2. Controle do FAB verde principal (+): calibra posição e função
  if (fab) {
    if (tabName === 'compras') {
      fab.setAttribute('title', 'Adicionar Produto ao Carrinho');
      fab.classList.remove('bottom-24');
      fab.classList.add('bottom-36');
    } else if (tabName === 'produtos') {
      fab.setAttribute('title', 'Cadastrar Novo Produto');
      fab.classList.remove('bottom-36');
      fab.classList.add('bottom-24');
    } else if (tabName === 'supermercados' || tabName === 'mercados') {
      fab.setAttribute('title', 'Cadastrar Novo Supermercado');
      fab.classList.remove('bottom-36');
      fab.classList.add('bottom-24');
    }
  }
}

// Interceta a mudança de abas de forma segura
const transicaoOriginalDeAba = switchActiveTab;
switchActiveTab = function(tabName) {
  transicaoOriginalDeAba(tabName);
  atualizarEstadoFabMobile(tabName);
};

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

// ============================================================
// ADIÇÃO AO CARRINHO (PERMITE PREÇO ZERO / VAZIO)
// ============================================================
document.getElementById('formAddCartItem')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cartInputProductName').value.trim();
  const unit = document.getElementById('cartInputUnit').value;
  const unitPrice = parseNumberInput(document.getElementById('cartInputUnitPrice').value); // Permite 0
  const quantity = parseNumberInput(document.getElementById('cartInputQuantity').value);

  if (!name || quantity <= 0) {
    showAppToast('Indique o nome do produto e a quantidade.', 'error');
    return;
  }
// Após salvar os dados e emitir o toast:
  if (window.innerWidth < 768) {
    fecharSheetAdicionarItem();
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
  if (activeMarketId !== 'm-padrao' && unitPrice > 0) {
    masterProd.marketPrices[activeMarketId] = unitPrice;
    enviarProdutoParaPlanilha(masterProd, activeMarketId, unitPrice);
  } else if (unitPrice > 0) {
    masterProd.basePrice = unitPrice;
  }
  saveAllLocalData();

  const existingIdx = cart.findIndex(it => it.name.toLowerCase() === name.toLowerCase() && it.unit === unit);
  if (existingIdx > -1) {
    cart[existingIdx].quantity += quantity;
    if (unitPrice > 0) cart[existingIdx].unitPrice = unitPrice;
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
  const dFields = document.getElementById('editPromoDiscountFields');
  const wFields = document.getElementById('editPromoWholesaleFields');
  if (dFields) dFields.classList.toggle('hidden', type !== 'discount');
  if (wFields) wFields.classList.toggle('hidden', type !== 'wholesale');
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

function setCatalogSyncFilter(filterMode) {
  catalogSyncFilter = filterMode;

  const btnAll = document.getElementById('catalogFilterAll');
  const btnSynced = document.getElementById('catalogFilterSynced');
  const btnLocal = document.getElementById('catalogFilterLocal');

  [
    { btn: btnAll, mode: 'all' },
    { btn: btnSynced, mode: 'synced' },
    { btn: btnLocal, mode: 'local' }
  ].forEach(({ btn, mode }) => {
    if (!btn) return;
    if (mode === filterMode) {
      btn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm transition-all flex items-center space-x-1.5 font-bold whitespace-nowrap';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-all flex items-center space-x-1.5 font-semibold whitespace-nowrap';
    }
  });

  renderCatalogUI();
}

function toggleSelectAllCatalog(checked) {
  const visibleProducts = getFilteredCatalogProducts();
  if (checked) {
    visibleProducts.forEach(p => selectedCatalogProductIds.add(p.id));
  } else {
    visibleProducts.forEach(p => selectedCatalogProductIds.delete(p.id));
  }
  updateCatalogBatchToolbarUI(visibleProducts);
  renderCatalogUI();
}

function toggleCatalogProductSelection(productId, checked) {
  if (checked) {
    selectedCatalogProductIds.add(productId);
  } else {
    selectedCatalogProductIds.delete(productId);
  }
  updateCatalogBatchToolbarUI(getFilteredCatalogProducts());
  renderCatalogUI();
}

function getFilteredCatalogProducts() {
  const q = (document.getElementById('catalogSearchInput')?.value || '').toLowerCase().trim();
  return products.filter(p => {
    const isSynced = !p.id.startsWith('p-custom-');
    if (catalogSyncFilter === 'synced' && !isSynced) return false;
    if (catalogSyncFilter === 'local' && isSynced) return false;
    if (selectedCatalogCategory !== 'Todas' && p.category !== selectedCatalogCategory) return false;
    if (q && !p.name.toLowerCase().includes(q) && !(p.category && p.category.toLowerCase().includes(q))) return false;
    return true;
  });
}

function updateCatalogBatchToolbarUI(visibleProducts) {
  const count = selectedCatalogProductIds.size;
  const badge = document.getElementById('catalogSelectedCountBadge');
  const checkAll = document.getElementById('checkSelectAllCatalog');
  const btnSync = document.getElementById('btnBatchSync');
  const btnUnsync = document.getElementById('btnBatchUnsync');
  const btnDelete = document.getElementById('btnBatchDelete');

  if (badge) badge.innerText = `${count} selecionado${count === 1 ? '' : 's'}`;

  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every(p => selectedCatalogProductIds.has(p.id));
  if (checkAll) checkAll.checked = allVisibleSelected;

  const hasSelection = count > 0;
  if (btnSync) btnSync.disabled = !hasSelection;
  if (btnUnsync) btnUnsync.disabled = !hasSelection;
  if (btnDelete) btnDelete.disabled = !hasSelection;
}

function renderCatalogUI() {
  const cBadge = document.getElementById('catalogTotalCountBadge');
  if (cBadge) cBadge.innerText = products.length;

  const totalNuvem = products.filter(p => !p.id.startsWith('p-custom-')).length;
  const totalLocais = products.filter(p => p.id.startsWith('p-custom-')).length;

  const badgeAll = document.getElementById('catalogBadgeFilterAll');
  const badgeSynced = document.getElementById('catalogBadgeFilterSynced');
  const badgeLocal = document.getElementById('catalogBadgeFilterLocal');

  if (badgeAll) badgeAll.innerText = products.length;
  if (badgeSynced) badgeSynced.innerText = totalNuvem;
  if (badgeLocal) badgeLocal.innerText = totalLocais;

  const tabs = document.getElementById('catalogCategoryTabs');
  if (tabs) {
    tabs.innerHTML = CATEGORIES.map(cat => `
      <button type="button" onclick="selectCatalogCategory('${cat}')" class="px-3 py-1.5 rounded-xl whitespace-nowrap ${selectedCatalogCategory === cat ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'bg-slate-200/80 text-slate-700 font-semibold'}">${cat}</button>
    `).join('');
  }

  const filtered = getFilteredCatalogProducts();
  updateCatalogBatchToolbarUI(filtered);

  const cList = document.getElementById('catalogProductList');
  if (!cList) return;

  if (filtered.length === 0) {
    cList.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">Nenhum produto localizado com os filtros selecionados.</div>`;
    return;
  }

  cList.innerHTML = filtered.map(p => {
    const isSynced = !p.id.startsWith('p-custom-');
    const isSelected = selectedCatalogProductIds.has(p.id);
    const curP = (p.marketPrices && p.marketPrices[activeMarketId] > 0)
      ? p.marketPrices[activeMarketId]
      : null;

    return `
      <div class="bg-white rounded-xl p-3 border ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'} shadow-sm transition-all">
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <!-- Checkbox de seleção do item -->
            <input 
              type="checkbox" 
              ${isSelected ? 'checked' : ''} 
              onchange="toggleCatalogProductSelection('${p.id}', this.checked)" 
              class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
            >

            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-1.5 flex-wrap">
                <h4 class="font-extrabold text-sm text-slate-800 truncate">${p.name}</h4>
                
                ${isSynced ? `
                  <span class="inline-flex items-center space-x-1 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md" title="Produto oficial da Planilha Google">
                    <svg class="w-3 h-3 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                    </svg>
                    <span>Nuvem</span>
                  </span>
                ` : `
                  <span class="inline-flex items-center space-x-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md" title="Produto exclusivo deste aparelho">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Local</span>
                  </span>
                `}

                <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${p.category || 'Geral'}</span>
                <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">${p.unit}</span>
              </div>

              <div class="text-xs text-slate-500 mt-1 flex items-center space-x-2 flex-wrap">
                <span>Base: <strong class="text-slate-800">${p.basePrice > 0 ? 'R$ ' + formatBRL(p.basePrice) : 'A definir'}</strong></span>
                <span>•</span>
                <span>No ${getSelectedMarketName()}: <strong class="${curP ? 'text-emerald-700 font-extrabold' : 'text-slate-400 italic'}">${curP ? 'R$ ' + formatBRL(curP) : 'Sem cotação'}</strong></span>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-1.5 shrink-0">
            <button type="button" onclick="openPriceCompareModal('${p.id}')" class="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all" title="Comparar preços entre supermercados">
              <span class="hidden sm:inline">Preços</span> 🏷️
            </button>
            <button type="button" onclick="openProductEditModal('${p.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all" title="Editar dados do produto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
            </button>
            <button type="button" onclick="quickAddToCartFromCatalog('${p.id}')" class="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all" title="Lançar no carrinho">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 1. SINCRONIZAR PRODUTOS SELECIONADOS PARA A PLANILHA
async function executarSincronizacaoLoteProdutos() {
  const alvos = products.filter(p => selectedCatalogProductIds.has(p.id) && p.id.startsWith('p-custom-'));
  if (alvos.length === 0) {
    showAppToast('Nenhum produto local pendente de envio nos selecionados.', 'info');
    return;
  }

  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  showAppToast(`Sincronizando 0 de ${alvos.length} produtos...`, 'info');
  let processados = 0;

  for (const p of alvos) {
    try {
      const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=criar_produto&name=${encodeURIComponent(p.name)}&category=${encodeURIComponent(p.category || 'Geral')}&unit=${encodeURIComponent(p.unit || 'un')}&price=${encodeURIComponent(p.basePrice || 0)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success' && json.action === 'created_product') {
        p.id = json.id || p.id;
        processados++;
      }
    } catch (e) {
      console.error(`Erro ao sincronizar ${p.name}:`, e);
    }
    showAppToast(`Sincronizando ${processados} de ${alvos.length}...`, 'info');
  }

  saveAllLocalData();
  selectedCatalogProductIds.clear();
  renderCatalogUI();
  showAppToast(`${processados} produtos sincronizados com a folha de cálculo!`, 'success');
}

// 2. DESSINCRONIZAR PRODUTOS SELECIONADOS (TORNAR LOCAIS)
// ============================================================
// 1. DESSINCRONIZAR PRODUTOS (REMOVE DA PLANILHA E MANTÉM LOCAL NO APP)
// ============================================================
async function executarDessincronizacaoLoteProdutos() {
  const alvos = products.filter(p => selectedCatalogProductIds.has(p.id));
  if (alvos.length === 0) {
    showAppToast('Selecione ao menos um produto.', 'info');
    return;
  }

  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  showAppToast(`Tirando da planilha: 0 de ${alvos.length}...`, 'info');
  let processados = 0;

  let ignored = [];
  try { ignored = JSON.parse(localStorage.getItem('sc_ignored_products')) || []; } catch (e) { ignored = []; }

  for (const p of alvos) {
    try {
      // Exclui a linha correspondente na folha de cálculo
      const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_produto&name=${encodeURIComponent(p.name)}&productId=${encodeURIComponent(p.id)}`;
      await fetch(url);

      // Transforma o produto em estritamente local no aparelho
      p.id = 'p-custom-' + Date.now() + '-' + Math.floor(Math.random() * 899 + 100);
      const key = p.name.toLowerCase();
      if (!ignored.includes(key)) ignored.push(key);
      processados++;
    } catch (e) {
      console.error(`Erro ao tirar sincronia de ${p.name}:`, e);
    }
    showAppToast(`Tirando da planilha: ${processados} de ${alvos.length}...`, 'info');
  }

  localStorage.setItem('sc_ignored_products', JSON.stringify(ignored));
  saveAllLocalData();
  selectedCatalogProductIds.clear();
  renderCatalogUI();
  showAppToast(`${processados} produto(s) removidos da planilha e mantidos apenas como locais!`, 'success');
}

// ============================================================
// 2. EXCLUSÃO EM LOTE (REMOVE DA PLANILHA E DO DISPOSITIVO)
// ============================================================
function solicitarExclusaoLoteProdutos() {
  const selecionados = products.filter(p => selectedCatalogProductIds.has(p.id));
  if (selecionados.length === 0) return;

  openCustomDialog(
    'Excluir Produtos Selecionados',
    `Deseja apagar os ${selecionados.length} itens marcados permanentemente da folha de cálculo e do aparelho, ou apenas remover deste telefone?`,
    'Excluir da Planilha e do App',
    'Excluir Só Deste Aparelho',
    () => confirmarExclusaoLote(true, selecionados),
    () => confirmarExclusaoLote(false, selecionados)
  );
}

async function confirmarExclusaoLote(daPlanilhaTambem, listaAlvo) {
  let token = getSecurityToken();
  if (daPlanilhaTambem && !token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  let apagadosRemoto = 0;

  if (daPlanilhaTambem) {
    showAppToast(`Apagando da folha de cálculo: 0 de ${listaAlvo.length}...`, 'info');
    for (const p of listaAlvo) {
      try {
        // Envia ordem de exclusão por nome para garantir a remoção mesmo que o ID local seja p-custom
        const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_produto&name=${encodeURIComponent(p.name)}&productId=${encodeURIComponent(p.id)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === 'success') {
          apagadosRemoto++;
        }
      } catch (e) {
        console.error(`Erro ao apagar ${p.name} da planilha:`, e);
      }
    }
  }

  // Remove os itens da base local e do carrinho
  const nomesParaRemover = new Set(listaAlvo.map(p => p.name.toLowerCase()));
  products = products.filter(p => !nomesParaRemover.has(p.name.toLowerCase()));
  cart = cart.filter(c => !nomesParaRemover.has(c.name.toLowerCase()));

  selectedCatalogProductIds.clear();
  saveAllLocalData();
  saveCartData();
  renderCatalogUI();
  renderCartUI();

  if (daPlanilhaTambem) {
    showAppToast(`${listaAlvo.length} itens removidos (${apagadosRemoto} apagados da planilha).`, 'success');
  } else {
    showAppToast(`${listaAlvo.length} produto(s) removidos apenas deste aparelho.`, 'info');
  }
}

// ============================================================
// 3. DESSINCRONIZAÇÃO UNITÁRIA NA JANELA MODAL
// ============================================================
async function dessincronizarProdutoEmEdicao() {
  const idAtual = document.getElementById('editProdId').value;
  const p = products.find(x => x.id === idAtual);
  if (!p) return;

  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  showAppToast(`Removendo "${p.name}" da folha de cálculo...`, 'info');

  try {
    const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_produto&name=${encodeURIComponent(p.name)}&productId=${encodeURIComponent(p.id)}`;
    await fetch(url);
  } catch (e) {
    console.warn('Falha na comunicação remota ao dessincronizar:', e);
  }

  p.id = 'p-custom-' + Date.now();

  let ignored = [];
  try { ignored = JSON.parse(localStorage.getItem('sc_ignored_products')) || []; } catch (e) { ignored = []; }
  if (!ignored.includes(p.name.toLowerCase())) {
    ignored.push(p.name.toLowerCase());
    localStorage.setItem('sc_ignored_products', JSON.stringify(ignored));
  }

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();
  showAppToast(`"${p.name}" foi removido da folha de cálculo e mantido apenas no aparelho.`, 'success');
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

// ============================================================
// GESTÃO E EDIÇÃO DO CATÁLOGO DE PRODUTOS
// ============================================================
function openProductEditModal(productId = null) {
  const modal = document.getElementById('modalProductEdit');
  const title = document.getElementById('modalProductEditTitle');
  const idInput = document.getElementById('editProdId');
  const nameInput = document.getElementById('editProdName');
  const catInput = document.getElementById('editProdCategory');
  const unitInput = document.getElementById('editProdUnit');
  const priceInput = document.getElementById('editProdBasePrice');
  const promoContainer = document.getElementById('containerPromoverProduto');
  const gestaoContainer = document.getElementById('containerGestaoProdutoPlanilha');

  const isEditing = typeof productId === 'string' && productId.trim().length > 0;

  if (isEditing) {
    const p = products.find(x => x.id === productId);
    if (!p) return;

    title.innerText = 'Editar Produto';
    idInput.value = p.id;
    nameInput.value = p.name || '';
    catInput.value = p.category || 'Geral';
    unitInput.value = p.unit || 'un';
    priceInput.value = p.basePrice > 0 ? formatBRL(p.basePrice) : '';

    const ehProdutoLocal = p.id.startsWith('p-custom-');

    if (promoContainer) promoContainer.classList.toggle('hidden', !ehProdutoLocal);
    if (gestaoContainer) gestaoContainer.classList.toggle('hidden', ehProdutoLocal);
  } else {
    title.innerText = 'Cadastrar Produto';
    idInput.value = '';
    nameInput.value = '';
    catInput.value = 'Geral';
    unitInput.value = 'un';
    priceInput.value = '';

    if (promoContainer) promoContainer.classList.add('hidden');
    if (gestaoContainer) gestaoContainer.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  setTimeout(() => nameInput.focus(), 50);
}

document.getElementById('formSaveProductCatalog')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editProdId').value;
  const name = document.getElementById('editProdName').value.trim();
  const category = document.getElementById('editProdCategory').value;
  const unit = document.getElementById('editProdUnit').value;
  const bp = parseNumberInput(document.getElementById('editProdBasePrice').value);

  if (!name) {
    showAppToast('Informe o nome do produto.', 'error');
    return;
  }

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
      marketPrices: {}
    };
    products.unshift(p);
  }

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();

  if (p && activeMarketId !== 'm-padrao' && bp > 0) {
    enviarProdutoParaPlanilha(p, activeMarketId, bp);
  }

  showAppToast('Produto salvo com sucesso!', 'success');
});

function closeProductEditModal() {
  document.getElementById('modalProductEdit').classList.add('hidden');
}

// Dessincroniza o produto: torna-o local no aparelho sem apagar a planilha
function dessincronizarProdutoEmEdicao() {
  const idAtual = document.getElementById('editProdId').value;
  const p = products.find(x => x.id === idAtual);
  if (!p) return;

  // Substitui o identificador de planilha por identificador local
  p.id = 'p-custom-' + Date.now();

  // Registra na lista de ignorados para a sincronização não puxar novamente
  let ignored = [];
  try { ignored = JSON.parse(localStorage.getItem('sc_ignored_products')) || []; } catch (e) { ignored = []; }
  if (!ignored.includes(p.name.toLowerCase())) {
    ignored.push(p.name.toLowerCase());
    localStorage.setItem('sc_ignored_products', JSON.stringify(ignored));
  }

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();
  showAppToast(`"${p.name}" agora é um produto local independente.`, 'info');
}

// Solicita confirmação para exclusão física da planilha
function solicitarExclusaoProdutoPlanilha() {
  const idAtual = document.getElementById('editProdId').value;
  const p = products.find(x => x.id === idAtual);
  if (!p) return;

  openCustomDialog(
    'Excluir da Planilha Google?',
    `ATENÇÃO: "${p.name}" será excluído permanentemente da matriz de preços e da aba de produtos na folha de cálculo. Confirmar exclusão?`,
    'Sim, Excluir na Nuvem',
    null,
    () => executarExclusaoProdutoPlanilha(p.name, p.id),
    null
  );
}

// Dispara a requisição de exclusão para o Apps Script com avisos em tela
async function executarExclusaoProdutoPlanilha(nomeProduto, produtoId) {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      showAppToast('Chave de segurança necessária.', 'error');
      return;
    }
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const btn = document.getElementById('btnExcluirProdutoPlanilha');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Excluindo da nuvem...';
  }

  showAppToast('Enviando ordem de exclusão do produto para o Google Sheets...', 'info');

  try {
    const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_produto&name=${encodeURIComponent(nomeProduto)}&productId=${encodeURIComponent(produtoId)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success' && json.action === 'deleted_product') {
      // Remove do catálogo local
      const idx = products.findIndex(x => x.name.toLowerCase() === nomeProduto.toLowerCase());
      if (idx > -1) products.splice(idx, 1);

      // Remove do carrinho se estiver presente
      cart = cart.filter(c => c.name.toLowerCase() !== nomeProduto.toLowerCase());

      saveAllLocalData();
      saveCartData();
      renderCatalogUI();
      renderCartUI();
      closeProductEditModal();

      showAppToast(`"${nomeProduto}" foi removido da folha de cálculo com sucesso!`, 'success');
    } else {
      throw new Error(json.message || 'A planilha não confirmou a exclusão do produto.');
    }
  } catch (err) {
    showAppToast('Erro ao excluir produto: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Excluir da Planilha';
    }
  }
}

document.getElementById('formSaveProductCatalog')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editProdId').value;
  const name = document.getElementById('editProdName').value.trim();
  const category = document.getElementById('editProdCategory').value;
  const unit = document.getElementById('editProdUnit').value;
  const bp = parseNumberInput(document.getElementById('editProdBasePrice').value); // Permite 0

  if (!name) {
    showAppToast('Informe o nome do produto.', 'error');
    return;
  }

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
      marketPrices: {}
    };
    products.unshift(p);
  }

  saveAllLocalData();
  renderCatalogUI();
  closeProductEditModal();

  if (p && activeMarketId !== 'm-padrao' && bp > 0) {
    enviarProdutoParaPlanilha(p, activeMarketId, bp);
  }

  showAppToast('Produto salvo com sucesso!', 'success');
});

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
// 8. LISTAGEM SIMPLIFICADA DE SUPERMERCADOS (OTIMIZADA PARA CELULAR)
// ============================================================
function renderMarketsUI() {
  const mBadge = document.getElementById('marketTotalCountBadge');
  if (mBadge) mBadge.innerText = supermarkets.filter(m => m.id !== 'm-padrao').length;

  const container = document.getElementById('marketsListContainer');
  if (!container) return;

  container.innerHTML = supermarkets.map(m => {
    const isCur = m.id === activeMarketId;
    const isPadrao = m.id === 'm-padrao';
    const ehMercadoLocal = m.id.startsWith('m-custom-') || !m.colIndex;

    return `
      <div class="bg-white rounded-xl p-3 sm:p-4 border ${isCur ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'} shadow-sm transition-all">
        <div class="flex items-center justify-between gap-2.5">
          
          <!-- Área de seleção rápida com um toque -->
          <div class="flex-1 min-w-0 cursor-pointer" onclick="selectActiveMarketFromCard('${m.id}')">
            <div class="flex items-center space-x-1.5 flex-wrap">
              <h3 class="font-extrabold text-sm text-slate-800 truncate">${m.name}</h3>
              ${isCur ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">ATIVO</span>` : ''}
              ${isPadrao ? `<span class="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md">NEUTRO</span>` : ''}
              ${ehMercadoLocal && !isPadrao ? `<span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md">LOCAL</span>` : ''}
            </div>
            
            <p class="text-xs text-slate-500 mt-0.5 truncate">${m.branch || 'São José dos Pinhais'}${m.promoDay ? ' • 🗓️ ' + m.promoDay : ''}</p>
            ${m.address ? `<p class="text-[11px] text-slate-400 mt-0.5 truncate">${m.address}</p>` : ''}
          </div>

          <!-- Ações rápidas de toque -->
          <div class="flex items-center space-x-1 shrink-0">
            ${m.address ? `
              <button type="button" onclick="abrirSupermercadoNoMaps('${m.id}', true)" class="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors" title="Traçar rota Maps">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </button>
            ` : ''}

            ${m.urlEncarte ? `
              <a href="${m.urlEncarte}" target="_blank" rel="noopener noreferrer" class="p-2 bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 rounded-lg transition-colors" title="Ver Encarte">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </a>
            ` : ''}

            ${!isPadrao ? `
              <button type="button" onclick="openMarketEditModal('${m.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Editar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
              </button>
              <button type="button" onclick="askDeleteMarket('${m.id}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors" title="Excluir">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
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

function getIgnoredMarkets() {
  try {
    return JSON.parse(localStorage.getItem('sc_ignored_markets')) || [];
  } catch (e) {
    return [];
  }
}

function getEditFormPromoConfig() {
  const type = document.querySelector('input[name="editItemPromoType"]:checked')?.value || 'none';
  if (type === 'discount') {
    return {
      type: 'discount',
      mode: document.getElementById('editCartDiscountMode')?.value || 'percent',
      value: parseNumberInput(document.getElementById('editCartDiscountVal')?.value)
    };
  }
  if (type === 'wholesale') {
    return {
      type: 'wholesale',
      minQty: parseNumberInput(document.getElementById('editCartWholesaleMin')?.value),
      wholesalePrice: parseNumberInput(document.getElementById('editCartWholesalePrice')?.value)
    };
  }
  return { type: 'none' };
}

// FUNÇÃO ESSENCIAL QUE ESTAVA FALTANDO:
function updateEditCartModalPreview() {
  const qtyInput = document.getElementById('editCartItemQty');
  const priceInput = document.getElementById('editCartItemPrice');
  const previewSubtotal = document.getElementById('editCartPreviewSubtotal');
  const previewSavings = document.getElementById('editCartPreviewSavings');

  if (!qtyInput || !priceInput || !previewSubtotal) return;

  const q = parseNumberInput(qtyInput.value);
  const p = parseNumberInput(priceInput.value);
  const calc = computeItemFinancials(q, p, getEditFormPromoConfig());

  previewSubtotal.innerText = `R$ ${formatBRL(calc.finalSubtotal)}`;

  if (previewSavings) {
    if (calc.savings > 0) {
      previewSavings.innerText = `(-R$ ${formatBRL(calc.savings)})`;
      previewSavings.classList.remove('hidden');
    } else {
      previewSavings.classList.add('hidden');
    }
  }
}

// Ouvintes para recalcular os valores na hora em que você digita
['editCartItemPrice', 'editCartItemQty', 'editCartDiscountMode', 'editCartDiscountVal', 'editCartWholesaleMin', 'editCartWholesalePrice'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', updateEditCartModalPreview);
    el.addEventListener('change', updateEditCartModalPreview);
  }
});

// Salvamento do item editado no carrinho
document.getElementById('formSaveCartItemEdit')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const item = cart.find(x => x.id === document.getElementById('editCartItemId').value);
  if (!item) return;

  const newPrice = parseNumberInput(document.getElementById('editCartItemPrice').value);
  const newQty = parseNumberInput(document.getElementById('editCartItemQty').value);
  if (newQty <= 0) {
    showAppToast('Informe uma quantidade válida.', 'error');
    return;
  }

  item.unitPrice = newPrice;
  item.quantity = newQty;
  item.promo = getEditFormPromoConfig();

  // Atualiza também o preço no cadastro local se um preço foi definido
  const masterProd = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
  if (masterProd) {
    if (!masterProd.marketPrices) masterProd.marketPrices = {};
    if (activeMarketId !== 'm-padrao' && newPrice > 0) {
      masterProd.marketPrices[activeMarketId] = newPrice;
      enviarProdutoParaPlanilha(masterProd, activeMarketId, newPrice);
    } else if (newPrice > 0) {
      masterProd.basePrice = newPrice;
    }
    saveAllLocalData();
  }

  saveCartData();
  closeEditCartItemModal();
  playAppBeep('check');
  showAppToast(`"${item.name}" atualizado!`, 'success');
});

function askDeleteMarket(marketId) {
  const m = supermarkets.find(x => x.id === marketId);
  if (!m || m.id === 'm-padrao') return;

  const ehMercadoNuvem = !m.id.startsWith('m-custom-') && m.colIndex;

  if (ehMercadoNuvem) {
    // Oferece escolha dupla para mercados sincronizados com a planilha
    openCustomDialog(
      'Opções de Exclusão',
      `O supermercado "${m.name}" está vinculado à planilha Google. O que deseja fazer?`,
      'Excluir da Planilha Google',
      'Ocultar Só no Aparelho',
      () => executarExclusaoMercadoPlanilha(marketId),
      () => executeDeleteMarketLocal(marketId)
    );
  } else {
    // Mercado apenas local: exclusão direta simples
    openCustomDialog(
      'Excluir Supermercado Local?',
      `Deseja remover "${m.name}" deste aparelho?`,
      'Sim, Excluir',
      null,
      () => executeDeleteMarketLocal(marketId),
      null
    );
  }
}

function executeDeleteMarketLocal(marketId) {
  const idx = supermarkets.findIndex(x => x.id === marketId);
  if (idx === -1) return;

  const m = supermarkets[idx];

  // Se for da planilha, registra na lista de bloqueio para não voltar na sincronização seletiva
  if (!marketId.startsWith('m-custom-')) {
    const ignored = getIgnoredMarkets();
    if (!ignored.includes(marketId)) {
      ignored.push(marketId);
      localStorage.setItem('sc_ignored_markets', JSON.stringify(ignored));
    }
  }

  supermarkets.splice(idx, 1);

  if (activeMarketId === marketId) {
    activeMarketId = 'm-padrao';
  }

  saveAllLocalData();
  refreshActiveMarketUI();
  renderMarketsUI();
  showAppToast(`"${m.name}" foi removido deste aparelho.`, 'info');
}

// Na função openMarketEditModal do app.js:
function openMarketEditModal(marketId = null) {
  const modal = document.getElementById('modalMarketEdit');
  const title = document.getElementById('modalMarketEditTitle');
  const idInput = document.getElementById('editMarketId');
  const nameInput = document.getElementById('editMarketName');
  const branchInput = document.getElementById('editMarketBranch');
  const addressInput = document.getElementById('editMarketAddress');
  const promoInput = document.getElementById('editMarketPromoDay');
  const encarteInput = document.getElementById('editMarketUrlEncarte');
  const notesInput = document.getElementById('editMarketNotes');
  const promoContainer = document.getElementById('containerPromoverMercado');
  const excluirContainer = document.getElementById('containerExcluirMercadoPlanilha');

  const isEditing = typeof marketId === 'string' && marketId.trim().length > 0;

  if (isEditing) {
    const m = supermarkets.find(x => x.id === marketId);
    if (!m) return;

    title.innerText = 'Editar Supermercado';
    idInput.value = m.id;
    nameInput.value = m.name || '';
    branchInput.value = m.branch || '';
    addressInput.value = m.address || '';
    promoInput.value = m.promoDay || '';
    encarteInput.value = m.urlEncarte || '';
    notesInput.value = m.notes || '';

    // Verifica se o mercado é local (criado no telemóvel ou sem índice de coluna)
    const ehMercadoLocal = String(m.id).startsWith('m-custom-') || !m.colIndex;
    const ehMercadoNeutro = m.id === 'm-padrao';

    if (promoContainer) {
      if (ehMercadoLocal && !ehMercadoNeutro) {
        promoContainer.classList.remove('hidden');
      } else {
        promoContainer.classList.add('hidden');
      }
    }

    if (excluirContainer) {
      if (!ehMercadoLocal && !ehMercadoNeutro) {
        excluirContainer.classList.remove('hidden');
      } else {
        excluirContainer.classList.add('hidden');
      }
    }
  } else {
    title.innerText = 'Novo Supermercado';
    idInput.value = '';
    nameInput.value = '';
    branchInput.value = '';
    addressInput.value = '';
    promoInput.value = '';
    encarteInput.value = '';
    notesInput.value = '';

    if (promoContainer) promoContainer.classList.add('hidden');
    if (excluirContainer) excluirContainer.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  setTimeout(() => nameInput.focus(), 50);
}

// Rotina com confirmação e avisos passo a passo
function solicitarExclusaoMercadoPlanilha() {
  const idAtual = document.getElementById('editMarketId').value;
  const m = supermarkets.find(x => x.id === idAtual);
  if (!m || m.id === 'm-padrao') return;

  openCustomDialog(
    'Excluir da Planilha Google?',
    `ATENÇÃO: A rede "${m.name}" será removida da aba Supermercados e a coluna física de preços dela será apagada da folha de cálculo. Confirma esta ação?`,
    'Sim, Excluir na Nuvem',
    null,
    () => executarExclusaoMercadoPlanilha(m.id),
    null
  );
}

async function executarExclusaoMercadoPlanilha(marketId) {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      showAppToast('Chave de segurança necessária.', 'error');
      return;
    }
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const m = supermarkets.find(x => x.id === marketId);
  if (!m) return;

  const btnForm = document.getElementById('btnExcluirMercadoPlanilha');
  if (btnForm) {
    btnForm.disabled = true;
    btnForm.innerHTML = `<span class="animate-spin mr-1.5">⏳</span> Excluindo da planilha...`;
  }

  showAppToast('Enviando ordem de exclusão para a planilha Google...', 'info');

  try {
    const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=excluir_mercado&marketId=${encodeURIComponent(m.id)}&name=${encodeURIComponent(m.name)}`;
    
    const res = await fetch(url);
    const json = await res.json();

    // Validação estrita: exige status de sucesso e a confirmação de exclusão
    if (json.status === 'success' && json.action === 'deleted') {
      // Remove do vetor local do app
      const idx = supermarkets.findIndex(x => x.id === marketId);
      if (idx > -1) supermarkets.splice(idx, 1);

      // Limpa os preços vinculados a esse mercado no catálogo local
      products.forEach(p => {
        if (p.marketPrices && p.marketPrices[marketId] !== undefined) {
          delete p.marketPrices[marketId];
        }
      });

      if (activeMarketId === marketId) {
        activeMarketId = 'm-padrao';
      }

      saveAllLocalData();
      refreshActiveMarketUI();
      renderMarketsUI();
      renderCatalogUI();
      closeMarketEditModal();

      showAppToast(`"${json.name || m.name}" e sua coluna foram excluídos da planilha!`, 'success');
    } else {
      throw new Error(json.message || 'A planilha não confirmou a exclusão.');
    }
  } catch (err) {
    showAppToast('Erro ao excluir da planilha: ' + err.message, 'error');
  } finally {
    if (btnForm) {
      btnForm.disabled = false;
      btnForm.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        <span>Excluir definitivamente da planilha</span>
      `;
    }
  }
}

function closeMarketEditModal() {
  document.getElementById('modalMarketEdit').classList.add('hidden');
}

document.getElementById('formSaveMarket')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editMarketId').value;
  const name = document.getElementById('editMarketName').value.trim();
  const branch = document.getElementById('editMarketBranch').value.trim();
  const address = document.getElementById('editMarketAddress').value.trim();
  const promoDay = document.getElementById('editMarketPromoDay').value.trim();
  const urlEncarte = document.getElementById('editMarketUrlEncarte').value.trim();
  const notes = document.getElementById('editMarketNotes').value.trim();

  if (!name) {
    showAppToast('Informe o nome da rede.', 'error');
    return;
  }

  if (id) {
    const m = supermarkets.find(x => x.id === id);
    if (m) {
      m.name = name;
      m.branch = branch;
      m.address = address;
      m.promoDay = promoDay;
      m.urlEncarte = urlEncarte;
      m.notes = notes;
    }
  } else {
    supermarkets.push({
      id: 'm-custom-' + Date.now(),
      name: name,
      branch: branch || 'São José dos Pinhais',
      address: address,
      promoDay: promoDay,
      urlEncarte: urlEncarte,
      notes: notes,
      colIndex: null
    });
  }

  saveAllLocalData();
  refreshActiveMarketUI();
  renderMarketsUI();
  closeMarketEditModal();
  showAppToast('Supermercado salvo com sucesso!', 'success');
});

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