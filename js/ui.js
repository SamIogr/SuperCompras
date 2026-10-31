/**
 * SUPERCOMPRAS PRO - INTERFACE, MODAIS E ÁUDIO
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

  if (tabName === 'produtos' && typeof renderCatalogUI === 'function') renderCatalogUI();
  if (tabName === 'supermercados' && typeof renderMarketsUI === 'function') renderMarketsUI();
  atualizarEstadoFabMobile(tabName);
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
      fab.setAttribute('title', 'Adicionar Produto ao Carrinho');
      fab.classList.remove('bottom-24'); fab.classList.add('bottom-36');
    } else {
      fab.setAttribute('title', tabName === 'produtos' ? 'Novo Produto' : 'Novo Supermercado');
      fab.classList.remove('bottom-36'); fab.classList.add('bottom-24');
    }
  }
}

// ============================================================
// CONTROLE DOS MODAIS DO CABEÇALHO E ÁUDIO
// ============================================================
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