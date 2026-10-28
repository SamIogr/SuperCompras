const API_GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxRfZ-hImEkXNgJGd6seMhVULwnpkp3tR-Ll-uXeaWRe8ZhcX_jvImmUl-G0SBTHnnV/exec";

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
  showAppToast('Chave salva com sucesso neste aparelho!', 'success');
  document.getElementById('modalBackup').classList.add('hidden');
}

async function sincronizarComPlanilha() {
  let token = getSecurityToken();

  if (!token) {
    const chaveDigitada = window.prompt("Introduza a Chave de Acesso da Planilha Google:");
    if (!chaveDigitada || !chaveDigitada.trim()) {
      showAppToast('Sincronização cancelada: chave não informada.', 'info');
      return;
    }
    token = chaveDigitada.trim();
    localStorage.setItem('sc_security_token', token);
    showAppToast('Chave memorizada neste dispositivo!', 'success');
  }

  const btn = document.getElementById('btnSyncPlanilha');
  if (btn) btn.classList.add('animate-spin');
  showAppToast('Sincronizando com a planilha...', 'info');

  try {
    const urlComToken = `${API_GOOGLE_SHEETS_URL}?token=${encodeURIComponent(token)}`;
    const res = await fetch(urlComToken);
    const json = await res.json();

    if (json.status === 'success' && Array.isArray(json.produtos)) {
      json.produtos.forEach(sp => {
        const localIdx = products.findIndex(p => p.name.toLowerCase() === sp.name.toLowerCase());
        if (localIdx > -1) {
          products[localIdx].marketPrices = { ...products[localIdx].marketPrices, ...sp.marketPrices };
          products[localIdx].basePrice = sp.basePrice || products[localIdx].basePrice;
          products[localIdx].unit = sp.unit || products[localIdx].unit;
        } else {
          products.push(sp);
        }
      });

      saveAllLocalData();
      if (typeof renderCatalogUI === 'function') renderCatalogUI();
      if (typeof renderCartUI === 'function') renderCartUI();
      showAppToast(`${json.produtos.length} produtos sincronizados!`, 'success');
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
  if (!token) return;

  const colunasMercados = {
    'm-max': 4,
    'm-goes': 5,
    'm-local': 6,
    'm-jacomar': 7,
    'm-atac': 8,
    'm-condor': 9,
    'm-stall': 10,
    'm-pgula': 11
  };

  const payload = {
    token: token,
    name: produto.name,
    unit: produto.unit,
    quantity: produto.quantity || 1,
    marketColIndex: colunasMercados[marketId] || null,
    price: preco
  };

  try {
    await fetch(API_GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Falha ao enviar registro para a planilha:', err);
  }
}