/**
 * SUPERCOMPRAS PRO - INTERFACE, NAVEGAÇÃO, TOASTS E MODAIS (js/ui.js)
 */

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioInst = null;

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

  const barCheckout = document.getElementById("cartFloatingCheckoutBar");
  const fabAdd = document.getElementById("fabOpenAddItem");
  const fabComp = document.getElementById("fabOpenComparator");

  if (barCheckout) barCheckout.classList.toggle("hidden", tabName !== "compras");
  if (fabAdd) fabAdd.classList.toggle("hidden", tabName !== "compras");
  if (fabComp) fabComp.classList.toggle("hidden", tabName !== "compras");

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

function setSubTabDados(aba) {
  window.currentSubTabDados = aba || 'produtos';

  const secaoProdutos = document.getElementById('secao-catalogo-produtos');
  const secaoMercados = document.getElementById('secao-catalogo-mercados');
  const btnProdutos = document.getElementById('btn-subtab-produtos');
  const btnMercados = document.getElementById('btn-subtab-mercados');

  if (window.currentSubTabDados === 'produtos') {
    if (secaoProdutos) {
      secaoProdutos.classList.remove('hidden');
      secaoProdutos.style.display = 'block';
    }
    if (secaoMercados) {
      secaoMercados.classList.add('hidden');
      secaoMercados.style.display = 'none';
    }

    if (btnProdutos) {
      btnProdutos.className = 'flex-1 py-2 px-3 rounded-xl bg-white text-slate-800 shadow-xs text-center transition-all flex items-center justify-center space-x-2 font-bold text-xs cursor-pointer';
      btnProdutos.querySelector('svg')?.setAttribute('class', 'w-4 h-4 text-emerald-600');
    }
    if (btnMercados) {
      btnMercados.className = 'flex-1 py-2 px-3 rounded-xl text-slate-600 hover:text-slate-800 text-center transition-all flex items-center justify-center space-x-2 font-semibold text-xs cursor-pointer';
      btnMercados.querySelector('svg')?.setAttribute('class', 'w-4 h-4 text-slate-400');
    }

    if (typeof renderCatalogUI === 'function') renderCatalogUI();
  } else {
    if (secaoProdutos) {
      secaoProdutos.classList.add('hidden');
      secaoProdutos.style.display = 'none';
    }
    if (secaoMercados) {
      secaoMercados.classList.remove('hidden');
      secaoMercados.style.display = 'block';
    }

    if (btnProdutos) {
      btnProdutos.className = 'flex-1 py-2 px-3 rounded-xl text-slate-600 hover:text-slate-800 text-center transition-all flex items-center justify-center space-x-2 font-semibold text-xs cursor-pointer';
      btnProdutos.querySelector('svg')?.setAttribute('class', 'w-4 h-4 text-slate-400');
    }
    if (btnMercados) {
      btnMercados.className = 'flex-1 py-2 px-3 rounded-xl bg-white text-slate-800 shadow-xs text-center transition-all flex items-center justify-center space-x-2 font-bold text-xs cursor-pointer';
      btnMercados.querySelector('svg')?.setAttribute('class', 'w-4 h-4 text-sky-600');
    }

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
  const fab = document.getElementById('fabOpenAddItem');
  if (container && backdrop) {
    backdrop.classList.remove('hidden');
    container.classList.remove('translate-y-full');
    if (fab) fab.classList.add('hidden');
    setTimeout(() => document.getElementById('cartInputProductName')?.focus(), 150);
  }
}
window.abrirSheetAdicionarItem = abrirSheetAdicionarItem;

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
window.fecharSheetAdicionarItem = fecharSheetAdicionarItem;

function executarAcaoFabContextual() {
  if (currentTab === 'compras') abrirSheetAdicionarItem();
  else if (currentTab === 'produtos' && typeof openProductEditModal === 'function') openProductEditModal();
  else if ((currentTab === 'supermercados' || currentTab === 'mercados') && typeof openMarketEditModal === 'function') openMarketEditModal();
}
window.executarAcaoFabContextual = executarAcaoFabContextual;

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

function alternarSomApp() {
  isSoundOn = !isSoundOn;
  document.getElementById('soundOnIcon')?.classList.toggle('hidden', !isSoundOn);
  document.getElementById('soundOffIcon')?.classList.toggle('hidden', isSoundOn);
  showAppToast(isSoundOn ? 'Som ativado' : 'Som desativado', 'info');
  if (isSoundOn) playAppBeep('click');
}
window.alternarSomApp = alternarSomApp;

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