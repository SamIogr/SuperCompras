// Web Audio API
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

function showAppToast(message, type = 'info') {
  const stack = document.getElementById('toastStack');
  const toast = document.createElement('div');
  let bg = 'bg-slate-800 text-white';
  if (type === 'success') bg = 'bg-emerald-600 text-white';
  if (type === 'error') bg = 'bg-rose-600 text-white';
  if (type === 'info') bg = 'bg-sky-700 text-white';

  toast.className = `${bg} px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center space-x-2 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;
  stack.appendChild(toast);

  requestAnimationFrame(() => toast.classList.remove('translate-y-2', 'opacity-0'));
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2700);
}

function openCustomDialog(title, msg, primaryText, secondaryText, onPrimary, onSecondary) {
  const dialogCustom = document.getElementById('dialogCustom');
  document.getElementById('dialogTitle').innerText = title;
  document.getElementById('dialogMessage').innerText = msg;
  
  const btnP = document.getElementById('dialogBtnPrimary');
  btnP.innerText = primaryText;
  btnP.onclick = () => {
    dialogCustom.classList.add('hidden');
    if (onPrimary) onPrimary();
  };

  const btnS = document.getElementById('dialogBtnSecondary');
  if (secondaryText && onSecondary) {
    btnS.innerText = secondaryText;
    btnS.classList.remove('hidden');
    btnS.onclick = () => {
      dialogCustom.classList.add('hidden');
      onSecondary();
    };
  } else {
    btnS.classList.add('hidden');
  }

  document.getElementById('dialogBtnCancel').onclick = () => dialogCustom.classList.add('hidden');
  dialogCustom.classList.remove('hidden');
}

function switchActiveTab(tabName) {
  currentTab = tabName;
  document.getElementById('viewCompras').classList.toggle('hidden', tabName !== 'compras');
  document.getElementById('viewProdutos').classList.toggle('hidden', tabName !== 'produtos');
  document.getElementById('viewSupermercados').classList.toggle('hidden', tabName !== 'supermercados');
  document.getElementById('cartFloatingCheckoutBar').classList.toggle('hidden', tabName !== 'compras');

  const navButtons = [
    { name: 'compras', el: document.getElementById('navBtnCompras') },
    { name: 'produtos', el: document.getElementById('navBtnProdutos') },
    { name: 'supermercados', el: document.getElementById('navBtnSupermercados') }
  ];

  navButtons.forEach(btn => {
    if (btn.name === tabName) {
      btn.el.classList.remove('text-slate-600');
      btn.el.classList.add('text-emerald-700', 'font-extrabold');
    } else {
      btn.el.classList.remove('text-emerald-700', 'font-extrabold');
      btn.el.classList.add('text-slate-600', 'font-semibold');
    }
  });

  if (tabName === 'produtos') renderCatalogUI();
  if (tabName === 'supermercados') renderMarketsUI();
}

// Inicialização da interface
window.addEventListener('DOMContentLoaded', async () => {
  loadApplicationData();
  refreshActiveMarketUI();
  renderCartUI();
  renderCatalogUI();
  renderMarketsUI();
  updateCartItemPreview();

  // Ouvintes de modais e botões do cabeçalho
  document.getElementById('btnOpenBackupModal').addEventListener('click', () => {
    const input = document.getElementById('inputSecurityToken');
    if (input) input.value = getSecurityToken();
    document.getElementById('modalBackup').classList.remove('hidden');
  });

  document.getElementById('btnOpenHistoryModal').addEventListener('click', () => {
    renderHistoryModal();
    document.getElementById('modalHistory').classList.remove('hidden');
  });

  document.getElementById('btnToggleAudio').addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    document.getElementById('soundOnIcon').classList.toggle('hidden', !isSoundOn);
    document.getElementById('soundOffIcon').classList.toggle('hidden', isSoundOn);
    showAppToast(isSoundOn ? 'Sons ativados' : 'Sons desativados', 'info');
  });

  // Autocomplete e formulários
  document.getElementById('cartSearchFilter').addEventListener('input', () => renderCartUI());
  document.getElementById('catalogSearchInput').addEventListener('input', () => renderCatalogUI());

  // Sincronização automática inicial
  if (navigator.onLine && getSecurityToken()) {
    await sincronizarComPlanilha();
  }
});