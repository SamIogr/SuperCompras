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
  let token = typeof getSecurityToken === 'function' ? getSecurityToken() : '';
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      if (typeof showAppToast === 'function') showAppToast('Sincronização cancelada: chave necessária.', 'info');
      return;
    }
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
  }

  localStorage.removeItem('sc_ignored_markets');

  const btn = document.getElementById('btnSyncPlanilha');
  if (btn) btn.classList.add('animate-spin');
  if (typeof showAppToast === 'function') showAppToast('Sincronizando com a planilha...', 'info');

  try {
    const res = await fetch(`${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}`);
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
      if (json.message && json.message.includes('não autorizado')) localStorage.removeItem('sc_security_token');
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
            <input type="checkbox" ${isChecked ? 'checked' : ''} data-name="${esc(p.name)}" onchange="toggleSingleProductSync(this.dataset.name, this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
            <div class="truncate">
              <span class="font-bold text-slate-800">${esc(p.name)}</span>
              <span class="text-[10px] text-slate-500 ml-1">(${esc(p.unit || 'un')} - ${esc(p.category || 'Geral')})</span>
            </div>
          </label>
          <button type="button" data-name="${esc(p.name)}" onclick="syncSingleItemNow('produto', this.dataset.name)" class="px-2 py-1 bg-white border border-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-slate-700 transition-colors shrink-0">
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
            <input type="checkbox" ${isChecked ? 'checked' : ''} data-id="${esc(m.id)}" onchange="toggleSingleMarketSync(this.dataset.id, this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
            <div class="truncate">
              <span class="font-bold text-slate-800">${esc(m.name)}</span>
              <span class="text-[10px] text-slate-500 ml-1">(${esc(m.branch || 'SJP')})</span>
            </div>
          </label>
          <button type="button" data-id="${esc(m.id)}" onclick="syncSingleItemNow('mercado', this.dataset.id)" class="px-2 py-1 bg-white border border-slate-200 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-slate-700 transition-colors shrink-0">
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


/**
 * SINCRONIZAÇÃO INTELIGENTE DO CATÁLOGO DE PRODUTOS
 * - Produtos locais: cadastrados na planilha Google e convertidos em Nuvem.
 * - Produtos de nuvem: valores e cotações locais enviados para a planilha.
 */
async function sincronizarCatalogoDireto() {
  let token = typeof getSecurityToken === 'function' ? getSecurityToken() : '';
  if (!token) {
    const chave = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chave || !chave.trim()) {
      if (typeof showAppToast === 'function') showAppToast('Sincronização cancelada: chave necessária.', 'info');
      return;
    }
    token = chave.trim();
    localStorage.setItem('sc_security_token', token);
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
        const urlCriar = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}&action=criar_produto&name=${encodeURIComponent(p.name)}&category=${encodeURIComponent(p.category || 'Geral')}&unit=${encodeURIComponent(p.unit || 'un')}&price=${encodeURIComponent(p.basePrice || 0)}`;
        
        const res = await fetch(urlCriar);
        const json = await res.json();

        if (json.status === 'success') {
          // Converte o ID local para o ID oficial gerado pela planilha
          p.id = json.id || ('p-cloud-' + Date.now());
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

window.sincronizarCatalogoDireto = sincronizarCatalogoDireto;