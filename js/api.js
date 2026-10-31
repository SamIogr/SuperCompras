/**
 * SUPERCOMPRAS PRO - SERVIÇOS DE REDE E SINCRONIZAÇÃO GOOGLE SHEETS
 */

function salvarChaveSeguranca() {
  const input = document.getElementById('inputSecurityToken');
  const val = (input.value || '').trim();
  if (!val) {
    showAppToast('Informe uma chave válida.', 'error');
    return;
  }
  localStorage.setItem('sc_security_token', val);
  showAppToast('Chave de segurança salva neste aparelho!', 'success');
  document.getElementById('modalBackup')?.classList.add('hidden');
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
      if (Array.isArray(json.supermercados) && json.supermercados.length > 0) {
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

        mercadosCriadosNoApp.forEach(mLocal => {
          if (!supermarkets.some(m => m.id === mLocal.id)) supermarkets.push(mLocal);
        });
      }

      if (Array.isArray(json.produtos)) {
        json.produtos.forEach(sp => {
          const localIdx = products.findIndex(p => p.name.toLowerCase() === sp.name.toLowerCase());
          if (localIdx > -1) {
            products[localIdx].marketPrices = { ...products[localIdx].marketPrices, ...sp.marketPrices };
            products[localIdx].basePrice = sp.basePrice || products[localIdx].basePrice;
            products[localIdx].unit = sp.unit || products[localIdx].unit;
            products[localIdx].category = sp.category || products[localIdx].category;
            if (Array.isArray(sp.brands)) products[localIdx].brands = sp.brands;
          } else {
            products.push(sp);
          }
        });
      }

      saveAllLocalData();
      refreshActiveMarketUI();
      if (typeof renderCartUI === 'function') renderCartUI();
      if (typeof renderCatalogUI === 'function') renderCatalogUI();
      if (typeof renderMarketsUI === 'function') renderMarketsUI();
      showAppToast(`Sincronizado: ${products.length} itens e ${supermarkets.length - 1} redes.`, 'success');
    } else {
      if (json.message && json.message.includes('não autorizado')) localStorage.removeItem('sc_security_token');
      throw new Error(json.message || 'Falha na resposta da API');
    }
  } catch (err) {
    showAppToast('Erro ao sincronizar: ' + err.message, 'error');
  } finally {
    if (btn) btn.classList.remove('animate-spin');
  }
}

async function enviarProdutoParaPlanilha(produto, marketId, preco, brandName = 'Padrão') {
  const token = getSecurityToken();
  if (!token || marketId === 'm-padrao') return;

  const mercadoAlvo = supermarkets.find(m => m.id === marketId);
  if (!mercadoAlvo || !mercadoAlvo.colIndex) return;

  const payload = {
    token: token,
    action: "atualizar_preco",
    productId: produto.id,
    name: produto.name,
    brand: brandName || produto.brand || 'Padrão',
    unit: produto.unit,
    marketId: marketId,
    marketColIndex: mercadoAlvo.colIndex,
    price: preco,
    category: produto.category || 'Geral'
  };

  try {
    const res = await fetch(API_GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.status === 'success') {
      showAppToast(`Preço de "${produto.name} (${brandName})" sincronizado na planilha!`, 'success');
    }
  } catch (err) {
    console.warn("Erro na sincronização em segundo plano:", err);
  }
}

// SINCRONIZAÇÃO SELETIVA
async function abrirModalSincronizacaoSeletiva() {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const btn = document.getElementById('btnSyncPlanilha');
  if (btn) btn.classList.add('animate-spin');
  showAppToast('Baixando dados da planilha...', 'info');

  try {
    const res = await fetch(`${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}`);
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message || 'Falha na resposta da API');

    pendingSyncPayload.produtos = Array.isArray(json.produtos) ? json.produtos : [];
    pendingSyncPayload.supermercados = Array.isArray(json.supermercados) ? json.supermercados : [];

    selectedSyncProducts = new Set(pendingSyncPayload.produtos.map(p => p.name.toLowerCase()));
    selectedSyncMarkets = new Set(pendingSyncPayload.supermercados.map(m => m.id));

    document.getElementById('syncProdCount').innerText = pendingSyncPayload.produtos.length;
    document.getElementById('syncMarketCount').innerText = pendingSyncPayload.supermercados.length;

    switchSyncTab('produtos');
    document.getElementById('modalSelectiveSync')?.classList.remove('hidden');
  } catch (err) {
    showAppToast('Erro ao consultar planilha: ' + err.message, 'error');
  } finally {
    if (btn) btn.classList.remove('animate-spin');
  }
}

function closeSelectiveSyncModal() {
  document.getElementById('modalSelectiveSync')?.classList.add('hidden');
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

  document.getElementById('syncProductsList')?.classList.toggle('hidden', !isProd);
  document.getElementById('syncMarketsList')?.classList.toggle('hidden', isProd);

  renderSyncLists();
}

function renderSyncLists() {
  const isProd = activeSyncTab === 'produtos';
  const selectAllBox = document.getElementById('checkSyncSelectAll');

  if (isProd) {
    const total = pendingSyncPayload.produtos.length;
    const marcados = selectedSyncProducts.size;
    if (selectAllBox) selectAllBox.checked = total > 0 && marcados === total;
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
    if (selectAllBox) selectAllBox.checked = total > 0 && marcados === total;
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
    selectedSyncProducts = checked ? new Set(pendingSyncPayload.produtos.map(p => p.name.toLowerCase())) : new Set();
  } else {
    selectedSyncMarkets = checked ? new Set(pendingSyncPayload.supermercados.map(m => m.id)) : new Set();
  }
  renderSyncLists();
}

function toggleSingleProductSync(name, checked) {
  const key = name.toLowerCase();
  if (checked) selectedSyncProducts.add(key); else selectedSyncProducts.delete(key);
  renderSyncLists();
}

function toggleSingleMarketSync(id, checked) {
  if (checked) selectedSyncMarkets.add(id); else selectedSyncMarkets.delete(id);
  renderSyncLists();
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
    if (localIdx > -1) supermarkets[localIdx] = objFormatado;
    else supermarkets.push(objFormatado);
    showAppToast(`Mercado "${sm.name}" atualizado individualmente!`, 'success');
  }

  saveAllLocalData();
  refreshActiveMarketUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderCartUI === 'function') renderCartUI();
}

function applySelectiveSync() {
  let contadorProd = 0;
  let contadorMerc = 0;

  if (selectedSyncMarkets.size > 0) {
    const mercadosCriadosNoApp = supermarkets.filter(m => m.id && m.id.startsWith('m-custom-'));
    const mercadosFiltrados = pendingSyncPayload.supermercados.filter(m => selectedSyncMarkets.has(m.id));

    supermarkets = [ MERCADO_PADRAO_GENERICO ];
    mercadosFiltrados.forEach(m => {
      supermarkets.push({
        id: m.id, name: m.name, sigla: m.sigla || '',
        branch: m.branch || 'São José dos Pinhais', address: m.address || '',
        colIndex: m.colIndex || null, urlEncarte: m.urlEncarte || '', promoDay: m.promoDay || ''
      });
      contadorMerc++;
    });

    mercadosCriadosNoApp.forEach(mLocal => {
      if (!supermarkets.some(m => m.id === mLocal.id)) supermarkets.push(mLocal);
    });
  }

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
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderCartUI === 'function') renderCartUI();
  closeSelectiveSyncModal();

  showAppToast(`Sincronizados com sucesso: ${contadorProd} produtos e ${contadorMerc} mercados.`, 'success');
}

// PROMOVER PRODUTO LOCAL PARA A PLANILHA
async function promoverProdutoEmEdicaoParaPlanilha() {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const idAtual = document.getElementById('editProdId').value;
  const p = products.find(x => x.id === idAtual);
  if (!p) return;

  const nome = (document.getElementById('editProdName').value || p.name || '').trim();
  const categoria = document.getElementById('editProdCategory').value || p.category || 'Geral';
  const unidade = document.getElementById('editProdUnit').value || p.unit || 'un';
  const preco = parseNumberInput(document.getElementById('editProdBasePrice').value);

  const btn = document.getElementById('btnPromoverProduto');
  if (btn) { btn.disabled = true; btn.innerText = 'Enviando para a planilha...'; }

  try {
    const url = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=criar_produto&name=${encodeURIComponent(nome)}&category=${encodeURIComponent(categoria)}&unit=${encodeURIComponent(unidade)}&price=${encodeURIComponent(preco)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success' && json.action === 'created_product') {
      p.id = json.id;
      p.name = json.name;
      p.category = json.category;
      p.unit = json.unit;
      p.basePrice = json.basePrice;

      saveAllLocalData();
      if (typeof renderCatalogUI === 'function') renderCatalogUI();
      closeProductEditModal();
      showAppToast(`"${json.name}" registrado na planilha Google!`, 'success');
    }
  } catch (err) {
    showAppToast('Erro ao sincronizar produto: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'Sincronizar este produto com a planilha'; }
  }
}

// PROMOVER MERCADO LOCAL PARA A PLANILHA
async function promoverMercadoEmEdicaoParaPlanilha() {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  const idAtual = document.getElementById('editMarketId').value;
  const m = supermarkets.find(x => x.id === idAtual);
  if (!m) return;

  const nome = (document.getElementById('editMarketName').value || m.name || '').trim();
  const bairro = (document.getElementById('editMarketBranch').value || m.branch || '').trim();
  const endereco = (document.getElementById('editMarketAddress').value || m.address || '').trim();
  const encarte = (document.getElementById('editMarketUrlEncarte').value || m.urlEncarte || '').trim();

  const btn = document.getElementById('btnPromoverMercado');
  if (btn) { btn.disabled = true; btn.innerText = 'Sincronizando...'; }

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

      if (activeMarketId === idAntigo) activeMarketId = json.novoId;

      saveAllLocalData();
      refreshActiveMarketUI();
      if (typeof renderMarketsUI === 'function') renderMarketsUI();
      if (typeof renderCatalogUI === 'function') renderCatalogUI();
      closeMarketEditModal();
      showAppToast(`"${json.name}" adicionado à planilha (Coluna ${json.colIndex})!`, 'success');
    }
  } catch (err) {
    showAppToast('Erro na sincronização: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'Sincronizar este mercado com a planilha'; }
  }
}