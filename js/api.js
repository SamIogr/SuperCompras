/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - SERVIÇOS DE REDE E SINCRONIZAÇÃO GOOGLE SHEETS
 */

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { apiChamar, salvarChaveSeguranca, enviarProdutoParaPlanilha, closeSelectiveSyncModal, switchSyncTab, renderSyncLists, toggleSelectAllSync, toggleSingleProductSync, toggleSingleMarketSync, syncSingleItemNow, applySelectiveSync, enviarMercadoParaPlanilha, sincronizarComPlanilha, abrirModalSincronizacaoSeletiva, promoverProdutoEmEdicaoParaPlanilha, sincronizarCatalogoDireto });

/**
 * Ponto único de chamada à planilha (Apps Script).
 * Com API_TOKEN_VIA_POST = true a chave vai no corpo do POST e não aparece em URLs
 * (histórico do navegador, logs de servidor e proxies). text/plain evita o preflight de CORS.
 */
export function apiChamar(token, params = {}) {
  if (API_TOKEN_VIA_POST) {
    return fetch(API_GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token, ...params })
    });
  }
  const qs = Object.entries({ token, ...params })
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v ?? ''))
    .join('&');
  return fetch(`${API_GOOGLE_SHEETS_URL}?${qs}`);
}

export function salvarChaveSeguranca() {
  const input = document.getElementById('inputSecurityToken');
  const val = (input.value || '').trim();
  if (!val) {
    showAppToast('Informe uma chave válida.', 'error');
    return;
  }
  Armazenamento.gravarTexto(CHAVES.TOKEN_PLANILHA, val);
  showAppToast('Chave de segurança salva neste aparelho!', 'success');
  if (typeof scAplicarModoAdmin === 'function') scAplicarModoAdmin();
  document.getElementById('modalBackup')?.classList.add('hidden');
}

async function _sincronizarComPlanilha() {
  let token = typeof getSecurityToken === 'function' ? getSecurityToken() : '';
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      if (typeof showAppToast === 'function') showAppToast('Sincronização cancelada: chave necessária.', 'info');
      return;
    }
    token = chave.trim();
    Armazenamento.gravarTexto(CHAVES.TOKEN_PLANILHA, token);
  }

  Armazenamento.remover(CHAVES.MERCADOS_IGNORADOS);

  const btn = document.getElementById('btnSyncPlanilha');
  if (btn) btn.classList.add('animate-spin');
  if (typeof showAppToast === 'function') showAppToast('Sincronizando com a planilha...', 'info');

  try {
    const res = await apiChamar(token);
    const json = await res.json();

    if (json.status === 'success') {
      const redesRemotas = json.supermercados || json.mercados || [];

      if (Array.isArray(redesRemotas) && redesRemotas.length > 0) {
        const mercadosCriadosNoApp = supermarkets.filter(m => m.id && m.id.startsWith('m-custom-'));
        supermarkets = [ MERCADO_PADRAO_GENERICO ];

        redesRemotas.forEach(m => {
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
      if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
      if (typeof renderCartUI === 'function') renderCartUI();
      if (typeof renderCatalogUI === 'function') renderCatalogUI();
      if (typeof renderMarketsUI === 'function') renderMarketsUI();
      
      const totalRedesReais = supermarkets.filter(m => m.id !== 'm-padrao').length;
      if (typeof showAppToast === 'function') {
        showAppToast(`Sincronizado: ${products.length} itens e ${totalRedesReais} redes!`, 'success');
      }
    } else {
      if (json.message && json.message.includes('não autorizado')) Armazenamento.remover(CHAVES.TOKEN_PLANILHA);
      throw new Error(json.message || 'Falha na resposta da API');
    }
  } catch (err) {
    if (typeof showAppToast === 'function') {
      showAppToast('Erro ao sincronizar: ' + err.message, 'error');
    }
  } finally {
    if (btn) btn.classList.remove('animate-spin');
  }
}

// Devolve true se a planilha confirmou. silencioso: não mostra um aviso por preço (envio em lote).
export async function enviarProdutoParaPlanilha(produto, marketId, preco, brandName = 'Padrão', silencioso = false) {
  const token = getSecurityToken();
  if (!token || marketId === 'm-padrao') return false;

  const mercadoAlvo = supermarkets.find(m => m.id === marketId);
  if (!mercadoAlvo || !mercadoAlvo.colIndex) return false;

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
      if (!silencioso) showAppToast(`Preço de "${produto.name} (${brandName})" sincronizado na planilha!`, 'success');
      return true;
    }
  } catch (err) {
    console.warn("Erro na sincronização em segundo plano:", err);
  }
  return false;
}

// SINCRONIZAÇÃO SELETIVA (BLINDADA CONTRA ELEMENTOS NULOS)
async function _abrirModalSincronizacaoSeletiva() {
  let token = typeof getSecurityToken === 'function' ? getSecurityToken() : '';
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    Armazenamento.gravarTexto(CHAVES.TOKEN_PLANILHA, token);
  }

  const btn = document.getElementById('btnSyncPlanilha');
  if (btn) btn.classList.add('animate-spin');
  if (typeof showAppToast === 'function') showAppToast('Baixando dados da planilha...', 'info');

  try {
    const res = await apiChamar(token);
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message || 'Falha na resposta da API');

    pendingSyncPayload.produtos = Array.isArray(json.produtos) ? json.produtos : [];
    pendingSyncPayload.supermercados = Array.isArray(json.supermercados) ? json.supermercados : [];

    selectedSyncProducts = new Set(pendingSyncPayload.produtos.map(p => p.name.toLowerCase()));
    selectedSyncMarkets = new Set(pendingSyncPayload.supermercados.map(m => m.id));

    // Atribuições seguras com verificação de existência no DOM
    const elProdCount = document.getElementById('syncProdCount');
    if (elProdCount) elProdCount.innerText = pendingSyncPayload.produtos.length;

    const elMarketCount = document.getElementById('syncMarketCount');
    if (elMarketCount) elMarketCount.innerText = pendingSyncPayload.supermercados.length;

    switchSyncTab('produtos');
    
    const modalSync = document.getElementById('modalSelectiveSync');
    if (modalSync) modalSync.classList.remove('hidden');
  } catch (err) {
    console.error('[Sincronização Seletiva] Erro:', err);
    if (typeof showAppToast === 'function') {
      showAppToast('Erro ao consultar planilha: ' + err.message, 'error');
    }
  } finally {
    if (btn) btn.classList.remove('animate-spin');
  }
}

export function closeSelectiveSyncModal() {
  document.getElementById('modalSelectiveSync')?.classList.add('hidden');
}

export function switchSyncTab(tab) {
  activeSyncTab = tab;
  const isProd = tab === 'produtos';

  const tabProdBtn = document.getElementById('tabSyncProdBtn');
  if (tabProdBtn) {
    tabProdBtn.className = isProd
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm'
      : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100';
  }

  const tabMarketBtn = document.getElementById('tabSyncMarketBtn');
  if (tabMarketBtn) {
    tabMarketBtn.className = !isProd
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm'
      : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100';
  }

  document.getElementById('syncProductsList')?.classList.toggle('hidden', !isProd);
  document.getElementById('syncMarketsList')?.classList.toggle('hidden', isProd);

  renderSyncLists();
}

export function renderSyncLists() {
  const isProd = activeSyncTab === 'produtos';
  const selectAllBox = document.getElementById('checkSyncSelectAll');
  const labelCounter = document.getElementById('labelSyncSelectedCounter');

  if (isProd) {
    const total = pendingSyncPayload.produtos ? pendingSyncPayload.produtos.length : 0;
    const marcados = selectedSyncProducts ? selectedSyncProducts.size : 0;
    
    if (selectAllBox) selectAllBox.checked = total > 0 && marcados === total;
    if (labelCounter) labelCounter.innerText = `${marcados} de ${total} produtos`;

    const containerProd = document.getElementById('syncProductsList');
    if (containerProd && Array.isArray(pendingSyncPayload.produtos)) {
      containerProd.innerHTML = pendingSyncPayload.produtos.map(p => {
        const isChecked = selectedSyncProducts.has(p.name.toLowerCase());
        return `
          <div class="flex items-center justify-between p-2 rounded-xl border ${isChecked ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'} text-xs">
            <label class="flex items-center space-x-2.5 flex-1 cursor-pointer min-w-0">
              <input type="checkbox" ${isChecked ? 'checked' : ''} data-name="${esc(p.name)}" data-acao="sincronizacao-produto" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
              <div class="truncate">
                <span class="font-bold text-slate-800">${esc(p.name)}</span>
                <span class="text-[10px] text-slate-500 ml-1">(${esc(p.unit || 'un')} - ${esc(p.category || 'Geral')})</span>
              </div>
            </label>
            <button type="button" data-name="${esc(p.name)}" data-acao="sincronizacao-produto-agora" class="px-2 py-1 bg-white border border-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-slate-700 transition-colors shrink-0">
              Sincar Só Este
            </button>
          </div>
        `;
      }).join('');
    }
  } else {
    const total = pendingSyncPayload.supermercados ? pendingSyncPayload.supermercados.length : 0;
    const marcados = selectedSyncMarkets ? selectedSyncMarkets.size : 0;
    
    if (selectAllBox) selectAllBox.checked = total > 0 && marcados === total;
    if (labelCounter) labelCounter.innerText = `${marcados} de ${total} mercados`;

    const containerMarket = document.getElementById('syncMarketsList');
    if (containerMarket && Array.isArray(pendingSyncPayload.supermercados)) {
      containerMarket.innerHTML = pendingSyncPayload.supermercados.map(m => {
        const isChecked = selectedSyncMarkets.has(m.id);
        return `
          <div class="flex items-center justify-between p-2 rounded-xl border ${isChecked ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'} text-xs">
            <label class="flex items-center space-x-2.5 flex-1 cursor-pointer min-w-0">
              <input type="checkbox" ${isChecked ? 'checked' : ''} data-id="${esc(m.id)}" data-acao="sincronizacao-mercado" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
              <div class="truncate">
                <span class="font-bold text-slate-800">${esc(m.name)}</span>
                <span class="text-[10px] text-slate-500 ml-1">(${esc(m.branch || 'SJP')})</span>
              </div>
            </label>
            <button type="button" data-id="${esc(m.id)}" data-acao="sincronizacao-mercado-agora" class="px-2 py-1 bg-white border border-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-slate-700 transition-colors shrink-0">
              Sincar Só Este
            </button>
          </div>
        `;
      }).join('');
    }
  }
}

export function toggleSelectAllSync(checked) {
  if (activeSyncTab === 'produtos') {
    selectedSyncProducts = checked ? new Set(pendingSyncPayload.produtos.map(p => p.name.toLowerCase())) : new Set();
  } else {
    selectedSyncMarkets = checked ? new Set(pendingSyncPayload.supermercados.map(m => m.id)) : new Set();
  }
  renderSyncLists();
}

export function toggleSingleProductSync(name, checked) {
  const key = name.toLowerCase();
  if (checked) selectedSyncProducts.add(key); else selectedSyncProducts.delete(key);
  renderSyncLists();
}

export function toggleSingleMarketSync(id, checked) {
  if (checked) selectedSyncMarkets.add(id); else selectedSyncMarkets.delete(id);
  renderSyncLists();
}

export function syncSingleItemNow(type, identifier) {
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

export function applySelectiveSync() {
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
async function _promoverProdutoEmEdicaoParaPlanilha() {
  let token = getSecurityToken();
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) return;
    token = chave.trim();
    Armazenamento.gravarTexto(CHAVES.TOKEN_PLANILHA, token);
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
    const res = await apiChamar(token, { action: 'criar_produto', name: nome, category: categoria, unit: unidade, price: preco });
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
/**
 * Envia um mercado criado no aparelho para a planilha (cria a coluna de preços dele).
 * Depois troca o id local pelo oficial em todo o app e envia os preços que já tinham
 * sido cotados nesse mercado para os produtos que estão na planilha.
 * (Substitui a antiga promoverMercadoEmEdicaoParaPlanilha, que lia campos do modal que
 * não existiam mais e não tinha botão na tela.)
 */
async function _enviarMercadoParaPlanilha(id) {
  const token = getSecurityToken();
  if (!token) return;
  const m = (supermarkets || []).find(x => x && x.id === id);
  if (!m || estaNaPlanilha('mercados', m)) return;

  const normalizar = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const duplicado = supermarkets.find(x => x !== m && estaNaPlanilha('mercados', x) && normalizar(x.name) === normalizar(m.name));
  if (duplicado) {
    showAppToast(`Já existe "${duplicado.name}" na planilha. Renomeie este mercado antes de enviar.`, 'warning');
    return;
  }

  const botoes = document.querySelectorAll('[data-acao="mercado-planilha"]');
  botoes.forEach(b => { b.disabled = true; });
  showAppToast(`Enviando "${m.name}" para a planilha...`, 'info');

  try {
    const res = await apiChamar(token, {
      action: 'criar_mercado', name: m.name, branch: m.branch || '', address: m.address || '', urlEncarte: m.urlEncarte || ''
    });
    const json = await res.json();
    if (json.status !== 'success' || !json.novoId) throw new Error(json.message || 'resposta inesperada da planilha');

    const idAntigo = m.id;
    m.colIndex = json.colIndex;
    if (json.linkMaps) m.linkMaps = json.linkMaps;
    remapearIdMercado(idAntigo, json.novoId);
    saveAllLocalData();

    // preços já cotados neste mercado -> planilha (só produtos que estão na planilha)
    let precosEnviados = 0;
    for (const p of (products || [])) {
      if (!p || !estaNaPlanilha('produtos', p)) continue;
      const precoPadrao = Number(p.marketPrices && p.marketPrices[json.novoId]) || 0;
      if (precoPadrao > 0 && await enviarProdutoParaPlanilha(p, json.novoId, precoPadrao, 'Padrão', true)) precosEnviados++;
      for (const b of (Array.isArray(p.brands) ? p.brands : [])) {
        const precoMarca = Number(b && b.marketPrices && b.marketPrices[json.novoId]) || 0;
        if (precoMarca > 0 && await enviarProdutoParaPlanilha(p, json.novoId, precoMarca, b.name || b.id, true)) precosEnviados++;
      }
    }

    if (typeof refreshActiveMarketUI === 'function') refreshActiveMarketUI();
    if (typeof renderMarketsUI === 'function') renderMarketsUI();
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
    if (typeof closeMarketEditModal === 'function') closeMarketEditModal();
    showAppToast(`"${m.name}" está na planilha (coluna ${json.colIndex})${precosEnviados ? ` e ${precosEnviados} preço(s) foram enviados` : ''}.`, 'success');
  } catch (err) {
    showAppToast('Não foi possível enviar para a planilha: ' + err.message, 'error');
  } finally {
    botoes.forEach(b => { b.disabled = false; });
  }
}

/** Botão "Enviar para a planilha" (card ou modal do mercado): confirma e coloca na fila. */
export function enviarMercadoParaPlanilha(id) {
  if (!scEhAdmin()) { showAppToast('Recurso restrito ao administrador.', 'info'); return; }
  const m = (supermarkets || []).find(x => x && x.id === id);
  if (!m) return;
  openCustomDialog(
    'Enviar para a planilha?',
    `"${m.name}" vai ganhar uma coluna de preços na planilha e passará a ser um mercado oficial. Os preços já cotados nele para produtos da planilha também serão enviados.`,
    'Sim, enviar',
    'Cancelar',
    () => scRodar(true, false, () => _enviarMercadoParaPlanilha(id)),
    () => {}
  );
}


/**
 * SINCRONIZAÇÃO INTELIGENTE DO CATÁLOGO DE PRODUTOS
 * - Produtos locais: cadastrados na planilha Google e convertidos em Nuvem.
 * - Produtos de nuvem: valores e cotações locais enviados para a planilha.
 */
async function _sincronizarCatalogoDireto() {
  let token = typeof getSecurityToken === 'function' ? getSecurityToken() : '';
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      if (typeof showAppToast === 'function') showAppToast('Sincronização cancelada: chave necessária.', 'info');
      return;
    }
    token = chave.trim();
    Armazenamento.gravarTexto(CHAVES.TOKEN_PLANILHA, token);
  }

  const icon = document.getElementById('iconSyncCatalogo');
  if (icon) icon.classList.add('animate-spin');

  // Identifica se o usuário marcou checkboxes ou se sincronizará o catálogo todo
  const idsSelecionados = (window.selectedCatalogProductIds && window.selectedCatalogProductIds.size > 0)
    ? Array.from(window.selectedCatalogProductIds)
    : [];

  const listaAlvo = idsSelecionados.length > 0 
    ? (products || []).filter(p => idsSelecionados.includes(String(p.id)))
    : (products || []);

  if (listaAlvo.length === 0) {
    if (icon) icon.classList.remove('animate-spin');
    if (typeof showAppToast === 'function') showAppToast('Nenhum produto encontrado para sincronizar.', 'info');
    return;
  }

  if (typeof showAppToast === 'function') {
    showAppToast(`Sincronizando ${listaAlvo.length} produto(s) com a planilha...`, 'info');
  }

  let locaisPromovidos = 0;
  let nuvemAtualizados = 0;

  try {
    for (const p of listaAlvo) {
      const isLocal = String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-');

      if (isLocal) {
        // 1. PRODUTO LOCAL -> ENVIA PARA A NUVEM (CRIAR NA PLANILHA)
        const res = await apiChamar(token, { action: 'criar_produto', name: p.name, category: p.category || 'Geral', unit: p.unit || 'un', price: p.basePrice || 0 });
        const json = await res.json();

        if (json.status === 'success') {
          // Converte o ID local para o ID oficial gerado pela planilha
          p.id = json.id || (novoId('p-cloud-'));
          if (json.colIndex) p.colIndex = json.colIndex;

          // Se tiver cotações por mercado registradas no card, envia cada uma delas
          if (p.marketPrices && typeof p.marketPrices === 'object') {
            for (const [mId, preco] of Object.entries(p.marketPrices)) {
              if (Number(preco) > 0 && mId !== 'm-padrao' && typeof enviarProdutoParaPlanilha === 'function') {
                await enviarProdutoParaPlanilha(p, mId, preco, 'Padrão');
              }
            }
          }
          locaisPromovidos++;
        }
      } else {
        // 2. PRODUTO NUVEM -> ATUALIZA VALORES NA PLANILHA
        let atualizouPreco = false;

        // Atualiza cotações por supermercado onde houver preço cadastrado
        if (p.marketPrices && typeof p.marketPrices === 'object') {
          for (const [mId, preco] of Object.entries(p.marketPrices)) {
            if (Number(preco) > 0 && mId !== 'm-padrao') {
              const mercadoObj = (supermarkets || []).find(m => m.id === mId);
              if (mercadoObj && mercadoObj.colIndex && typeof enviarProdutoParaPlanilha === 'function') {
                await enviarProdutoParaPlanilha(p, mId, preco, 'Padrão');
                atualizouPreco = true;
              }
            }
          }
        }

        // Se tiver marcas extras cadastradas com cotações, atualiza-as também
        if (Array.isArray(p.brands)) {
          for (const marcaObj of p.brands) {
            const nomeMarca = marcaObj.name || marcaObj.id;
            if (marcaObj.marketPrices && typeof marcaObj.marketPrices === 'object') {
              for (const [mId, preco] of Object.entries(marcaObj.marketPrices)) {
                if (Number(preco) > 0 && typeof enviarProdutoParaPlanilha === 'function') {
                  await enviarProdutoParaPlanilha(p, mId, preco, nomeMarca);
                  atualizouPreco = true;
                }
              }
            }
          }
        }

        nuvemAtualizados++;
      }
    }

    // Salva o banco localmente após a promoção dos IDs
    saveAllLocalData();

    // Limpa a seleção e atualiza a interface
    if (window.selectedCatalogProductIds) window.selectedCatalogProductIds.clear();
    if (typeof renderCatalogUI === 'function') renderCatalogUI();

    if (typeof showAppToast === 'function') {
      showAppToast(`Sincronizado! ${locaisPromovidos} adicionado(s) à nuvem e ${nuvemAtualizados} atualizado(s).`, 'success');
    }
  } catch (err) {
    console.error('[Sincronia Catálogo] Erro:', err);
    if (typeof showAppToast === 'function') {
      showAppToast('Erro ao sincronizar com a planilha: ' + err.message, 'error');
    }
  } finally {
    if (icon) icon.classList.remove('animate-spin');
  }
}


// ===== FUNÇÕES PÚBLICAS: passam pela fila única do sync-coordenador.js =====
// (a planilha e o Drive nunca rodam ao mesmo tempo; sem chave de administrador, a planilha nem é chamada)
export function sincronizarComPlanilha() { return scRodar(true, true, () => _sincronizarComPlanilha()); }
export function abrirModalSincronizacaoSeletiva() { return scRodar(true, false, () => _abrirModalSincronizacaoSeletiva()); }
export function promoverProdutoEmEdicaoParaPlanilha() { return scRodar(true, false, () => _promoverProdutoEmEdicaoParaPlanilha()); }
export function sincronizarCatalogoDireto() { return scRodar(true, false, () => _sincronizarCatalogoDireto()); }

// ===== AÇÕES DA JANELA "SINCRONIZAÇÃO SELETIVA" (delegação, ver js/ui/acoes.js) =====
Acoes.registrarClique({
  'sincronizacao-abrir':          () => abrirModalSincronizacaoSeletiva(),
  'sincronizacao-fechar':         () => closeSelectiveSyncModal(),
  'sincronizacao-aba':            el => switchSyncTab(el.dataset.aba),
  'sincronizacao-aplicar':        () => applySelectiveSync(),
  'sincronizacao-produto-agora':  el => syncSingleItemNow('produto', el.dataset.name),
  'sincronizacao-mercado-agora':  el => syncSingleItemNow('mercado', el.dataset.id),
});
Acoes.registrarMudanca({
  'sincronizacao-todos':          el => toggleSelectAllSync(el.checked),
  'sincronizacao-produto':        el => toggleSingleProductSync(el.dataset.name, el.checked),
  'sincronizacao-mercado':        el => toggleSingleMarketSync(el.dataset.id, el.checked),
});
