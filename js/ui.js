/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - INTERFACE, NAVEGAÇÃO, TOASTS E MODAIS (js/ui.js)
 */

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { playAppBeep, showAppToast, openCustomDialog, switchActiveTab, refreshActiveMarketUI, abrirSupermercadoNoMaps, atualizarEstadoFabMobile, abrirModalBackup, aplicarTemaInicial, alternarTemaApp, verificarImportacaoUrlHash, ativarTelaAcesa, desativarTelaAcesa });

export const AudioCtx = window.AudioContext || window.webkitAudioContext;
// Gestão global do Wake Lock sem colisão de TDZ
window.screenWakeLock = null;;

export function playAppBeep(kind = 'click') {
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
  } catch (err) {
    // som é opcional: navegador sem Web Audio ou bloqueado até o primeiro toque
    console.debug('[beep] sem áudio:', err && err.message);
  }
}

export function showAppToast(msg, type = 'info') {
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

export function openCustomDialog(title, msg, pTxt, sTxt, onP, onS) {
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

export function switchActiveTab(tabName) {
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

export function refreshActiveMarketUI() {
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

export function abrirSupermercadoNoMaps(marketId, rotaDireta = true) {
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


export function atualizarEstadoFabMobile(tabName) {
  const fab = document.getElementById('fabOpenAddItem');
  if (!fab) return;

  if (tabName === 'compras') {
    fab.classList.remove('hidden');
  } else {
    fab.classList.add('hidden');
  }
}

export function abrirModalBackup() {
  const m = document.getElementById('modalBackup');
  if (m) {
    const inputToken = document.getElementById('inputSecurityToken');
    if (inputToken && typeof getSecurityToken === 'function') {
      inputToken.value = getSecurityToken();
    }
    m.classList.remove('hidden');
  }
}

// CONTROLE DE MODO ESCURO/CLARO (TEMA)
export function aplicarTemaInicial() {
  const isDark = Armazenamento.lerTexto(CHAVES.TEMA) === 'dark' || 
                 (!Armazenamento.existe(CHAVES.TEMA) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
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

export function alternarTemaApp() {
  const isDark = document.documentElement.classList.toggle('dark');
  Armazenamento.gravarTexto(CHAVES.TEMA, isDark ? 'dark' : 'light');
  
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

// Observa mudanças automáticas no sistema operativo
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!Armazenamento.existe(CHAVES.TEMA)) aplicarTemaInicial();
});

// Aplica imediatamente ao carregar o ficheiro
aplicarTemaInicial();

// 2. Leitura da Hash da URL com diálogo de Substituir vs. Somar
export async function verificarImportacaoUrlHash() {
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
// ==========================================
// GESTÃO DE TELA ACESA (SCREEN WAKE LOCK API)
// ==========================================
let screenWakeLock = null;

// GESTÃO DE TELA ACESA (SCREEN WAKE LOCK API)
export async function ativarTelaAcesa() {
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

export async function desativarTelaAcesa() {
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

// Reativa o bloqueio se o utilizador alternar entre apps e voltar ao navegador
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentTab === 'compras') {
    ativarTelaAcesa();
  } else {
    desativarTelaAcesa();
  }
});

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

  Armazenamento.gravarTexto(CHAVES.ZOOM, escala);
};

window.alterarZoomGlobal = function(delta) {
  const slider = document.getElementById('sliderZoomGlobal');
  const valorAtual = Number(slider?.value || Armazenamento.lerTexto(CHAVES.ZOOM) || 100);
  window.aplicarZoomGlobal(valorAtual + delta);
};

// Restauração automática da escala salva
(function restaurarZoom() {
  const escalaSalva = Number(Armazenamento.lerTexto(CHAVES.ZOOM) || 100);
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

// ===== AÇÕES DO CABEÇALHO, TEMA, ZOOM E ABAS (delegação, ver js/ui/acoes.js) =====
Acoes.registrarClique({
  'tema-alternar':   () => alternarTemaApp(),
  'zoom-painel':     () => toggleBarraZoomGlobal(),
  'zoom-passo':      el => alterarZoomGlobal(Number(el.dataset.passo)),
  'zoom-restaurar':  () => aplicarZoomGlobal(100),
  // troca de aba; ao entrar no Histórico redesenha a lista (antes um ouvinte no index.html
  // procurava "Histórico" no texto ou no onclick de qualquer botão)
  'aba':             el => {
    switchActiveTab(el.dataset.aba);
    if (el.dataset.aba === 'historico' && typeof renderHistoricoUI === 'function') setTimeout(renderHistoricoUI, 50);
  },
});
Acoes.registrarDigitacao({
  'zoom-valor':      el => aplicarZoomGlobal(el.value),
});

// ----- PONTE DA TRANSIÇÃO (etapa 4): constantes e classes (só existem depois de declaradas) -----
Object.assign(window, { AudioCtx });
