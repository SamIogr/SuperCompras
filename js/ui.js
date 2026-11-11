/**
 * SUPERCOMPRAS PRO - INTERFACE, NAVEGAÇÃO, TOASTS E MODAIS (js/ui.js)
 */

const AudioCtx = window.AudioContext || window.webkitAudioContext;
// Gestão global do Wake Lock sem colisão de TDZ
window.screenWakeLock = null;;

function playAppBeep(kind = 'click') {
  if (typeof isSoundOn !== 'undefined' && !isSoundOn) return;
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
window.playAppBeep = playAppBeep;

function showAppToast(msg, type = 'info') {
  const s = document.getElementById('toastStack');
  if (!s) return;
  const t = document.createElement('div');
  t.className = `${type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800'} text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 transform translate-y-2 opacity-0 shadow-lg pointer-events-auto`;
  const span = document.createElement("span");
  span.textContent = msg;
  t.appendChild(span);
  s.appendChild(t);
  requestAnimationFrame(() => t.classList.remove('translate-y-2', 'opacity-0'));
  setTimeout(() => {
    t.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => t.remove(), 300);
  }, 2700);
}
window.showAppToast = showAppToast;

function openCustomDialog(title, msg, pTxt, sTxt, onP, onS) {
  const d = document.getElementById('dialogCustom');
  if (!d) return;
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
window.openCustomDialog = openCustomDialog;

function switchActiveTab(tabName) {
  currentTab = tabName;

  const mapaAbas = {
    compras: document.getElementById("tab-compras") || document.getElementById("viewCompras"),
    historico: document.getElementById("tab-historico"),
    dados: document.getElementById("tab-dados") || document.getElementById("viewProdutos")
  };

  if (tabName === "produtos" || tabName === "supermercados") {
    tabName = "dados";
  }

  Object.keys(mapaAbas).forEach((chave) => {
    const el = mapaAbas[chave];
    if (el) {
      el.classList.toggle("hidden", chave !== tabName);
    }
  });

  const botoes = {
    compras: document.getElementById("navBtnCompras"),
    historico: document.getElementById("navBtnHistorico"),
    dados: document.getElementById("navBtnDados")
  };

  Object.keys(botoes).forEach((chave) => {
    const btn = botoes[chave];
    if (btn) {
      if (chave === tabName) {
        btn.classList.add("text-emerald-700", "font-bold");
        btn.classList.remove("text-slate-500", "text-slate-600", "font-semibold");
      } else {
        btn.classList.remove("text-emerald-700", "font-bold");
        btn.classList.add("text-slate-500", "font-semibold");
      }
    }
    
    
  });

  // Substitua o trecho das linhas 127 a 142 por:
  const barCheckout = document.getElementById("cartFloatingCheckoutBar");
  const fabAdd = document.getElementById("fabOpenAddItem");
  const fabComp = document.getElementById("fabOpenComparator");

  if (barCheckout) barCheckout.classList.toggle("hidden", tabName !== "compras");
  if (fabAdd) fabAdd.classList.toggle("hidden", tabName !== "compras");
  if (fabComp) fabComp.classList.toggle("hidden", tabName !== "compras");

  // Oculta qualquer botão fixo de QR Code fora da aba de compras
  document.querySelectorAll("button.fixed, div.fixed button").forEach((btn) => {
    if (/qr/i.test(btn.id || btn.getAttribute("onclick") || btn.innerHTML)) {
      btn.classList.toggle("hidden", tabName !== "compras");
    }
  });

  if (typeof atualizarEstadoFabMobile === "function") {
    atualizarEstadoFabMobile(tabName);
  }
  // Registo da aba ativa no escopo global
  window.currentTab = tabName;

  // Gestão da tela acesa (Wake Lock)
  if (tabName === "compras") {
    if (typeof ativarTelaAcesa === "function") ativarTelaAcesa();
  } else {
    if (typeof desativarTelaAcesa === "function") desativarTelaAcesa();
  }

  if (tabName === "compras" && typeof renderCartUI === "function") {
    renderCartUI();
  } else if (tabName === "historico" && typeof renderHistoricoUI === "function") {
    renderHistoricoUI();
  } else if (tabName === "dados") {
    const subAtiva = window.currentSubTabDados || "produtos";
    setSubTabDados(subAtiva);
  }
  if (typeof atualizarEstadoFabMobile === "function") {
    atualizarEstadoFabMobile(tabName);
  }
}
window.switchActiveTab = switchActiveTab;

function setSubTabDados(subTab = 'produtos') {
  const targetTab = subTab || 'produtos';
  window.currentSubTabDados = targetTab;

  // Busca compatível tanto com 'secao-catalogo-*' quanto com 'subtab-*'
  const tabProdutos = document.getElementById('secao-catalogo-produtos') || document.getElementById('subtab-produtos');
  const tabMercados = document.getElementById('secao-catalogo-mercados') || document.getElementById('subtab-mercados');
  const btnProdutos = document.getElementById('btn-subtab-produtos');
  const btnMercados = document.getElementById('btn-subtab-mercados');

  const classeBase = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer';
  const classeAtiva = `${classeBase} bg-white text-emerald-800 shadow-xs`;
  const classeInativa = `${classeBase} text-slate-500 hover:text-slate-700 hover:bg-white/40`;

  if (targetTab === 'produtos') {
    if (tabProdutos) tabProdutos.classList.remove('hidden');
    if (tabMercados) tabMercados.classList.add('hidden');
    if (btnProdutos) btnProdutos.className = classeAtiva;
    if (btnMercados) btnMercados.className = classeInativa;
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
  } else {
    if (tabProdutos) tabProdutos.classList.add('hidden');
    if (tabMercados) tabMercados.classList.remove('hidden');
    if (btnMercados) btnMercados.className = classeAtiva;
    if (btnProdutos) btnProdutos.className = classeInativa;
    if (typeof renderMarketsUI === 'function') renderMarketsUI();
  }
}
window.setSubTabDados = setSubTabDados;

function refreshActiveMarketUI() {
  const sel = document.getElementById('selectActiveMarket');
  const lista = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets) && supermarkets.length > 0)
    ? supermarkets
    : [ { id: 'm-padrao', name: 'Mercado', branch: 'Referência Geral' } ];

  if (sel) {
    sel.innerHTML = lista.map(m => `
      <option value="${esc(m.id)}" ${m.id === activeMarketId ? 'selected' : ''}>${esc(m.name)} (${esc(m.branch || 'SJP')})</option>
    `).join('');
  }

  const current = lista.find(m => m.id === activeMarketId) || lista[0];
  if (current) {
    const subtitle = document.getElementById('topMarketSubtitle');
    if (subtitle) subtitle.innerText = `${current.name} • ${current.branch || 'Referência Geral'}`;
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
window.refreshActiveMarketUI = refreshActiveMarketUI;

function abrirSupermercadoNoMaps(marketId, rotaDireta = true) {
  if (typeof supermarkets === 'undefined') return;
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
window.abrirSupermercadoNoMaps = abrirSupermercadoNoMaps;

function abrirSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  if (container && backdrop) {
    backdrop.classList.remove('hidden');
    container.classList.remove('hidden');
    setTimeout(() => document.getElementById('cartInputProductName')?.focus(), 100);
  }
}
window.abrirSheetAdicionarItem = abrirSheetAdicionarItem;

function fecharSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  if (container && backdrop) {
    container.classList.add('hidden');
    backdrop.classList.add('hidden');
  }
}
window.fecharSheetAdicionarItem = fecharSheetAdicionarItem;

function executarAcaoFabContextual() {
  if (currentTab === 'compras') abrirSheetAdicionarItem();
  else if (currentTab === 'produtos' && typeof openProductEditModal === 'function') openProductEditModal();
  else if ((currentTab === 'supermercados' || currentTab === 'mercados') && typeof openMarketEditModal === 'function') openMarketEditModal();
}
window.executarAcaoFabContextual = executarAcaoFabContextual;

function atualizarEstadoFabMobile(tabName) {
  const fab = document.getElementById('fabOpenAddItem');
  if (!fab) return;

  if (tabName === 'compras') {
    fab.classList.remove('hidden');
  } else {
    fab.classList.add('hidden');
  }
}
window.atualizarEstadoFabMobile = atualizarEstadoFabMobile;

function abrirModalBackup() {
  const m = document.getElementById('modalBackup');
  if (m) {
    const inputToken = document.getElementById('inputSecurityToken');
    if (inputToken && typeof getSecurityToken === 'function') {
      inputToken.value = getSecurityToken();
    }
    m.classList.remove('hidden');
  }
}
window.abrirModalBackup = abrirModalBackup;

function fecharModalBackup() {
  document.getElementById('modalBackup')?.classList.add('hidden');
}
window.fecharModalBackup = fecharModalBackup;

// CONTROLE DE MODO ESCURO/CLARO (TEMA)
function aplicarTemaInicial() {
  const isDark = localStorage.getItem('sc_theme') === 'dark' || 
                 (!('sc_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.getElementById('themeDarkIcon')?.classList.remove('hidden');
    document.getElementById('themeLightIcon')?.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('themeLightIcon')?.classList.remove('hidden');
    document.getElementById('themeDarkIcon')?.classList.add('hidden');
  }
}

function alternarTemaApp() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('sc_theme', isDark ? 'dark' : 'light');
  
  if (isDark) {
    document.getElementById('themeDarkIcon')?.classList.remove('hidden');
    document.getElementById('themeLightIcon')?.classList.add('hidden');
    showAppToast('Modo Escuro ativado', 'info');
  } else {
    document.getElementById('themeLightIcon')?.classList.remove('hidden');
    document.getElementById('themeDarkIcon')?.classList.add('hidden');
    showAppToast('Modo Claro ativado', 'info');
  }
}
window.alternarTemaApp = alternarTemaApp;

// Observa mudanças automáticas no sistema operativo
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('sc_theme')) aplicarTemaInicial();
});

// Aplica imediatamente ao carregar o ficheiro
aplicarTemaInicial();

function abrirModalHistorico() {
  const m = document.getElementById('modalHistory') || document.getElementById('modalHistorico');
  if (m) {
    if (typeof renderPurchaseHistoryUI === 'function') renderPurchaseHistoryUI();
    m.classList.remove('hidden');
  }
}
window.abrirModalHistorico = abrirModalHistorico;

function fecharModalHistorico() {
  const m = document.getElementById('modalHistory') || document.getElementById('modalHistorico');
  if (m) m.classList.add('hidden');
}
window.fecharModalHistorico = fecharModalHistorico;

// 1. Função auxiliar para mesclar itens sem duplicar produtos de mesma marca
function mesclarItensNoCarrinho(novosItens) {
  if (!Array.isArray(cart)) cart = [];

  novosItens.forEach(novo => {
    const nomeNovo = (novo.name || '').trim().toLowerCase();
    const marcaNova = (novo.selectedBrandId || 'Padrão').trim().toLowerCase();

    // Localiza se o item já existe no carrinho com a mesma marca
    const existente = cart.find(c => {
      const nomeExistente = (c.name || '').trim().toLowerCase();
      const marcaExistente = (c.selectedBrandId || 'Padrão').trim().toLowerCase();
      const mesmoId = c.productId && novo.productId && c.productId === novo.productId;
      return (mesmoId || nomeExistente === nomeNovo) && marcaExistente === marcaNova;
    });

    if (existente) {
      existente.quantity = Number((Number(existente.quantity || 0) + Number(novo.quantity || 1)).toFixed(3));
    } else {
      cart.push({
        ...novo,
        id: 'c-import-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)
      });
    }
  });
}
window.mesclarItensNoCarrinho = mesclarItensNoCarrinho;

// 2. Leitura da Hash da URL com diálogo de Substituir vs. Somar
async function verificarImportacaoUrlHash() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#import=')) return;

  const payloadCodificado = decodeURIComponent(hash.replace('#import=', ''));
  if (!payloadCodificado) return;

  // Limpa a hash da barra de endereço imediatamente para evitar reimportações ao atualizar (F5)
  history.replaceState(null, document.title, window.location.pathname + window.location.search);

  if (typeof desserializarQRParaCarrinho !== 'function') return;

  const dados = await desserializarQRParaCarrinho(payloadCodificado);
  if (!dados || !Array.isArray(dados.items) || dados.items.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('Link de importação inválido ou vazio.', 'error');
    return;
  }

  const qtdNovos = dados.items.length;

  const aplicarImportacao = (substituir) => {
    if (substituir) {
      cart = dados.items;
    } else {
      mesclarItensNoCarrinho(dados.items);
    }

    if (dados.marketId && dados.marketId !== 'm-padrao') {
      activeMarketId = dados.marketId;
    }

    saveCartData();
    saveAllLocalData();
    renderCartUI();

    if (typeof showAppToast === 'function') {
      showAppToast(substituir ? 'Carrinho substituído com sucesso!' : 'Itens somados ao carrinho com sucesso!', 'success');
    }
  };

  // Se o carrinho estiver vazio, importa diretamente
  if (!cart || cart.length === 0) {
    aplicarImportacao(true);
    return;
  }

  // Se já houver itens no carrinho, exibe a escolha entre Substituir ou Somar
  if (typeof openCustomDialog === 'function') {
    openCustomDialog(
      'Importar Lista de Compras',
      `Seu carrinho já tem ${cart.length} item(ns). A lista recebida contém ${qtdNovos} item(ns). Como deseja prosseguir?`,
      'Substituir Carrinho',
      'Somar aos Existentes',
      () => aplicarImportacao(true),
      () => aplicarImportacao(false)
    );
  } else {
    const somar = confirm(
      `Deseja somar os ${qtdNovos} itens recebidos ao seu carrinho atual?\n\n[OK] = Somar aos itens existentes\n[Cancelar] = Substituir carrinho atual`
    );
    aplicarImportacao(!somar);
  }
}
window.verificarImportacaoUrlHash = verificarImportacaoUrlHash;
// ==========================================
// GESTÃO DE TELA ACESA (SCREEN WAKE LOCK API)
// ==========================================
let screenWakeLock = null;

// GESTÃO DE TELA ACESA (SCREEN WAKE LOCK API)
async function ativarTelaAcesa() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    if (!window.screenWakeLock) {
      window.screenWakeLock = await navigator.wakeLock.request('screen');
      window.screenWakeLock.addEventListener('release', () => {
        window.screenWakeLock = null;
      });
    }
  } catch (err) {
    console.warn('Wake Lock bloqueado ou não suportado:', err);
  }
}
window.ativarTelaAcesa = ativarTelaAcesa;

async function desativarTelaAcesa() {
  if (window.screenWakeLock) {
    try {
      await window.screenWakeLock.release();
    } catch (err) {
      console.warn('Erro ao libertar Wake Lock:', err);
    } finally {
      window.screenWakeLock = null;
    }
  }
}
window.desativarTelaAcesa = desativarTelaAcesa;

// Reativa o bloqueio se o utilizador alternar entre apps e voltar ao navegador
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentTab === 'compras') {
    ativarTelaAcesa();
  } else {
    desativarTelaAcesa();
  }
});
// ATALHOS DINÂMICOS CONFORME A UNIDADE (PESO VS QUANTIDADE UNITÁRIA)
function atualizarAtalhosQuantidade() {
  const selUnit = document.getElementById('cartInputUnit');
  const box = document.getElementById('containerAtalhosQtd');
  if (!selUnit || !box) return;

  const unit = (selUnit.value || '').trim().toLowerCase();
  const isPeso = unit === 'kg' || unit === 'g' || unit === 'quilo';

  if (isPeso) {
    box.innerHTML = `
      <button type="button" onclick="setCartQuickQty('0.250')" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 cursor-pointer">250g</button>
      <button type="button" onclick="setCartQuickQty('0.500')" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 cursor-pointer">500g</button>
      <button type="button" onclick="setCartQuickQty('1.000')" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 cursor-pointer">1 kg</button>
      <button type="button" onclick="setCartQuickQty('1.500')" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 cursor-pointer">1,5 kg</button>
    `;
  } else {
    box.innerHTML = `
      <button type="button" onclick="setCartQuickQty('1')" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">1</button>
      <button type="button" onclick="setCartQuickQty('2')" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">2</button>
      <button type="button" onclick="setCartQuickQty('3')" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">3</button>
      <button type="button" onclick="setCartQuickQty('6')" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">6</button>
      <button type="button" onclick="setCartQuickQty('12')" class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 cursor-pointer">12</button>
    `;
  }
}
window.atualizarAtalhosQuantidade = atualizarAtalhosQuantidade;

function abrirSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  if (container && backdrop) {
    backdrop.classList.remove('hidden');
    container.classList.remove('hidden');
    atualizarAtalhosQuantidade();
    setTimeout(() => document.getElementById('cartInputProductName')?.focus(), 100);
  }
}
window.abrirSheetAdicionarItem = abrirSheetAdicionarItem;

function fecharSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  const dropdown = document.getElementById('cartAutocompleteDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  if (container && backdrop) {
    container.classList.add('hidden');
    backdrop.classList.add('hidden');
  }
}
window.fecharSheetAdicionarItem = fecharSheetAdicionarItem;

// ============================================================================
// ZOOM GLOBAL DA APLICAÇÃO (UI)
// ============================================================================

window.toggleBarraZoomGlobal = function() {
  const painel = document.getElementById('painelZoomGlobal');
  if (!painel) return;
  painel.classList.toggle('hidden');
};

window.aplicarZoomGlobal = function(valor) {
  const escala = Math.min(125, Math.max(75, Number(valor) || 100));
  const slider = document.getElementById('sliderZoomGlobal');
  const label = document.getElementById('labelValorZoomGlobal');

  if (slider) slider.value = escala;
  if (label) label.textContent = `${escala}%`;

  const fator = escala / 100;

  // Aplica zoom na raiz. Jamais execute loops aplicando zoom direto em modais
  document.documentElement.style.zoom = fator;

  localStorage.setItem('supercompras_app_zoom', String(escala));
};

window.alterarZoomGlobal = function(delta) {
  const slider = document.getElementById('sliderZoomGlobal');
  const valorAtual = Number(slider?.value || localStorage.getItem('supercompras_app_zoom') || 100);
  window.aplicarZoomGlobal(valorAtual + delta);
};

// Restauração automática da escala salva
(function restaurarZoom() {
  const escalaSalva = Number(localStorage.getItem('supercompras_app_zoom') || 100);
  if (escalaSalva !== 100) {
    window.aplicarZoomGlobal(escalaSalva);
  }
})();

// Fechamento ao clicar fora do painel
document.addEventListener('click', (e) => {
  const painel = document.getElementById('painelZoomGlobal');
  const btn = document.getElementById('btnLupaGlobal');
  if (!painel || painel.classList.contains('hidden')) return;

  if (!painel.contains(e.target) && !btn?.contains(e.target)) {
    painel.classList.add('hidden');
  }
});