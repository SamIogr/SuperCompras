/**
 * SUPERCOMPRAS PRO (Interface, Modais, Navegação e Áudio)
 */
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

function showAppToast(msg, type = 'info') {
  const s = document.getElementById('toastStack');
  if (!s) return;
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

/**
 * Alterna as abas principais (Compras, Histórico, Dados)
 */
window.switchActiveTab = function (tabName) {
  currentTab = tabName;

  const mapaAbas = {
    compras:
      document.getElementById("tab-compras") ||
      document.getElementById("viewCompras"),
    historico: document.getElementById("tab-historico"),
    dados:
      document.getElementById("tab-dados") ||
      document.getElementById("viewProdutos"),
  };

  if (tabName === "produtos" || tabName === "supermercados") {
    tabName = "dados";
  }

  // Dentro de switchActiveTab no js/ui.js:
  if (tabName === "historico") {
    if (typeof renderHistoricoUI === "function") renderHistoricoUI();
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
    dados: document.getElementById("navBtnDados"),
  };

  Object.keys(botoes).forEach((chave) => {
    const btn = botoes[chave];
    if (btn) {
      if (chave === tabName) {
        btn.classList.add("text-emerald-700", "font-bold");
        btn.classList.remove(
          "text-slate-500",
          "text-slate-600",
          "font-semibold",
        );
      } else {
        btn.classList.remove("text-emerald-700", "font-bold");
        btn.classList.add("text-slate-500", "font-semibold");
      }
    }
  });

  const barCheckout = document.getElementById("cartFloatingCheckoutBar");
  const fabAdd = document.getElementById("fabOpenAddItem");
  const fabComp = document.getElementById("fabOpenComparator");

  if (barCheckout)
    barCheckout.classList.toggle("hidden", tabName !== "compras");
  if (fabAdd) fabAdd.classList.toggle("hidden", tabName !== "compras");
  if (fabComp) fabComp.classList.toggle("hidden", tabName !== "compras");

  if (tabName === "compras" && typeof renderCartUI === "function") {
    renderCartUI();
  } else if (
    tabName === "historico" &&
    typeof renderHistoricoUI === "function"
  ) {
    renderHistoricoUI();
  } else if (tabName === "dados") {
    // Ao entrar em Dados, atualiza a contagem dos crachás e renderiza a sub-aba ativa
    const subAtiva = window.currentSubTabDados || "produtos";
    setSubTabDados(subAtiva);
  }

  if (typeof atualizarEstadoFabMobile === "function") {
    atualizarEstadoFabMobile(tabName);
  }
};;

/**
 * Alterna as sub-visões internas da aba Dados (Produtos vs Supermercados)
 */
function setSubTabDados(tipo) {
  window.currentSubTabDados = tipo;
  const isProd = tipo === 'produtos';

  const viewProd = document.getElementById('secao-catalogo-produtos');
  const viewMerc = document.getElementById('secao-catalogo-mercados');
  const btnProd = document.getElementById('btn-subtab-produtos');
  const btnMerc = document.getElementById('btn-subtab-mercados');

  if (viewProd) {
    viewProd.classList.toggle('hidden', !isProd);
    viewProd.style.display = isProd ? 'block' : 'none';
  }
  if (viewMerc) {
    viewMerc.classList.toggle('hidden', isProd);
    viewMerc.style.display = isProd ? 'none' : 'block';
  }

  if (btnProd && btnMerc) {
    const classeAtiva = 'flex-1 py-2 px-3 rounded-lg bg-white text-slate-800 shadow-xs text-center transition-all flex items-center justify-center space-x-1.5 font-bold text-xs cursor-pointer';
    const classeInativa = 'flex-1 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-800 text-center transition-all flex items-center justify-center space-x-1.5 font-semibold text-xs cursor-pointer';
    
    btnProd.className = isProd ? classeAtiva : classeInativa;
    btnMerc.className = isProd ? classeInativa : classeAtiva;
  }

  const badgeProd = document.getElementById('badge-total-produtos');
  const badgeMerc = document.getElementById('badge-total-mercados');
  if (badgeProd && Array.isArray(products)) badgeProd.innerText = products.length;
  if (badgeMerc && Array.isArray(supermarkets)) badgeMerc.innerText = supermarkets.filter(m => m.id !== 'm-padrao').length;

  if (isProd && typeof renderCatalogUI === 'function') {
    renderCatalogUI();
  } else if (!isProd && typeof renderMarketsUI === 'function') {
    renderMarketsUI();
  }
}

/**
 * Gestão interna do Hub de Banco de Dados
 */
window.abrirPaginaGestao = function(tipo) {
  const hub = document.getElementById('hubDadosMenu');
  const pagProd = document.getElementById('paginaGestaoProdutos');
  const pagMerc = document.getElementById('paginaGestaoMercados');

  if (hub) hub.classList.add('hidden');
  if (pagProd) pagProd.classList.toggle('hidden', tipo !== 'produtos');
  if (pagMerc) pagMerc.classList.toggle('hidden', tipo !== 'mercados');

  if (tipo === 'produtos' && typeof renderCatalogUI === 'function') {
    renderCatalogUI();
  } else if (tipo === 'mercados' && typeof renderMarketsUI === 'function') {
    renderMarketsUI();
  }
};

window.voltarAoHubDados = function() {
  const hub = document.getElementById('hubDadosMenu');
  const pagProd = document.getElementById('paginaGestaoProdutos');
  const pagMerc = document.getElementById('paginaGestaoMercados');

  if (pagProd) pagProd.classList.add('hidden');
  if (pagMerc) pagMerc.classList.add('hidden');
  if (hub) hub.classList.remove('hidden');
};

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
    if (subtitle) subtitle.innerText = `${current.name} • ${current.branch || 'SJP'}`;
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

function abrirSheetAdicionarItem() {
  const container = document.getElementById('cartFormContainer');
  const backdrop = document.getElementById('cartFormBackdrop');
  const fab = document.getElementById('fabOpenAddItem');
  if (container && backdrop) {
    backdrop.classList.remove('hidden');
    container.classList.remove('translate-y-full');
    if (fab) fab.classList.add('hidden');
    setTimeout(() => document.getElementById('cartInputProductName')?.focus(), 150);
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
  if (currentTab === 'compras') abrirSheetAdicionarItem();
  else if (currentTab === 'produtos' && typeof openProductEditModal === 'function') openProductEditModal();
  else if ((currentTab === 'supermercados' || currentTab === 'mercados') && typeof openMarketEditModal === 'function') openMarketEditModal();
}

function atualizarEstadoFabMobile(tabName) {
  const fab = document.getElementById('fabOpenAddItem');
  const compBtn = document.getElementById('fabOpenComparator');
  fecharSheetAdicionarItem();

  if (compBtn) compBtn.classList.toggle('hidden', tabName !== 'compras');
  if (fab) {
    if (tabName === 'compras') {
      fab.classList.remove('hidden');
      fab.setAttribute('title', 'Adicionar Produto ao Carrinho');
      fab.classList.remove('bottom-24');
      fab.classList.add('bottom-36');
    } else {
      fab.classList.add('hidden');
    }
  }
}

function abrirModalBackup() {
  const m = document.getElementById('modalBackup');
  if (m) {
    const inputToken = document.getElementById('inputSecurityToken');
    if (inputToken) {
      inputToken.value = getSecurityToken();
    }
    m.classList.remove('hidden');
  }
}

function fecharModalBackup() {
  document.getElementById('modalBackup')?.classList.add('hidden');
}

function alternarSomApp() {
  isSoundOn = !isSoundOn;
  document.getElementById('soundOnIcon')?.classList.toggle('hidden', !isSoundOn);
  document.getElementById('soundOffIcon')?.classList.toggle('hidden', isSoundOn);
  showAppToast(isSoundOn ? 'Som ativado' : 'Som desativado', 'info');
  if (isSoundOn) playAppBeep('click');
}

function abrirModalHistorico() {
  const m = document.getElementById('modalHistory') || document.getElementById('modalHistorico');
  if (m) {
    if (typeof renderPurchaseHistoryUI === 'function') renderPurchaseHistoryUI();
    m.classList.remove('hidden');
  }
}

function fecharModalHistorico() {
  const m = document.getElementById('modalHistory') || document.getElementById('modalHistorico');
  if (m) m.classList.add('hidden');
}