/**
 * SUPERCOMPRAS PRO (Backup e Sincronização na conta Google do usuário)
 * Arquivo: js/drive-sync.js  (ARQUIVO NOVO)
 *
 * Guarda catálogo, mercados e histórico numa pasta OCULTA do Google Drive do próprio
 * usuário (escopo drive.appdata). Só a conta logada acessa. O app continua 100% offline:
 * a sincronização só acontece quando há internet.
 */

// ===== CONFIGURAÇÃO =====
const DRIVE_CLIENT_ID = '1005329591365-p2ibvui3iq1ssqgmrj4hb02pc3bqgabb.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_ARQUIVO = 'supercompras_backup.json';
const DRIVE_META_KEY = 'sc_drive_meta_v1';
const DRIVE_FLAG_KEY = 'sc_drive_conectado';
const DRIVE_EMAIL_KEY = 'sc_drive_email';
const DRIVE_TOMBSTONE_DIAS = 90;       // por quanto tempo lembrar o que foi apagado
const DRIVE_ATRASO_SYNC_MS = 8000;     // espera após uma alteração para sincronizar sozinho
const DRIVE_ATRASO_CARIMBO_MS = 1000;  // registra o horário das alterações

let _driveToken = null;
let _driveTokenExp = 0;
let _driveSincronizando = false;
let _driveAplicando = false;
let _driveTimerSync = null;
let _driveTimerCarimbo = null;

// ===== 1. LOGIN COM GOOGLE (a biblioteca só é baixada quando precisa) =====
function driveCarregarGIS() {
  return new Promise((resolve, reject) => {
    if (window.google && google.accounts && google.accounts.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Sem internet para carregar o login do Google.'));
    document.head.appendChild(s);
  });
}

async function driveObterToken(interativo) {
  if (_driveToken && Date.now() < _driveTokenExp - 60000) return _driveToken;
  if (String(DRIVE_CLIENT_ID).startsWith('COLE_AQUI')) {
    throw new Error('Configure o DRIVE_CLIENT_ID em js/drive-sync.js');
  }
  await driveCarregarGIS();
  return new Promise((resolve, reject) => {
    const tid = setTimeout(() => reject(new Error('login_timeout')), interativo ? 120000 : 15000);
    const client = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        clearTimeout(tid);
        if (!resp || resp.error) return reject(new Error((resp && resp.error) || 'login_cancelado'));
        _driveToken = resp.access_token;
        _driveTokenExp = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
        resolve(_driveToken);
      },
      error_callback: (err) => {
        clearTimeout(tid);
        reject(new Error((err && err.type) || 'login_cancelado'));
      }
    });
    client.requestAccessToken({ prompt: interativo ? '' : 'none' });
  });
}

// ===== 2. API DO DRIVE (pasta oculta appDataFolder) =====
async function driveFetch(url, opcoes, token) {
  const op = opcoes || {};
  const r = await fetch(url, { ...op, headers: { ...(op.headers || {}), Authorization: 'Bearer ' + token } });
  if (r.status === 401) { _driveToken = null; throw new Error('sessao_expirada'); }
  if (!r.ok) throw new Error('Drive HTTP ' + r.status);
  return r;
}

async function driveAcharArquivo(token) {
  const q = encodeURIComponent("name='" + DRIVE_ARQUIVO + "'");
  const r = await driveFetch(
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=' + q + '&fields=files(id,name)&pageSize=1',
    {}, token);
  const j = await r.json();
  return (j.files && j.files[0]) || null;
}

async function driveBaixarArquivo(token, id) {
  const r = await driveFetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media', {}, token);
  return r.json();
}

async function driveCriarArquivo(token, conteudo) {
  const limite = 'sc' + Math.random().toString(36).slice(2);
  const meta = { name: DRIVE_ARQUIVO, parents: ['appDataFolder'], mimeType: 'application/json' };
  const corpo =
    '--' + limite + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) +
    '\r\n--' + limite + '\r\nContent-Type: application/json\r\n\r\n' + conteudo +
    '\r\n--' + limite + '--';
  const r = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + limite }, body: corpo },
    token);
  return (await r.json()).id;
}

async function driveAtualizarArquivo(token, id, conteudo) {
  await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media',
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: conteudo },
    token);
}

// ===== 3. O QUE É SINCRONIZADO =====
function driveEntidades() {
  const idDe = (v) => (v != null && v !== '') ? String(v) : '';
  const hist = (typeof purchaseHistory !== 'undefined' && Array.isArray(purchaseHistory))
    ? purchaseHistory
    : (Array.isArray(window.purchaseHistory) ? window.purchaseHistory : []);
  return [
    {
      nome: 'produtos',
      lista: (typeof products !== 'undefined' && Array.isArray(products)) ? products : [],
      chave: p => (p ? idDe(p.id) : '')
    },
    {
      nome: 'mercados',
      lista: (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets)) ? supermarkets : [],
      chave: m => (m ? idDe(m.id) : '')
    },
    {
      nome: 'historico',
      lista: hist,
      chave: c => (c ? idDe(typeof obterIdCompra === 'function' ? obterIdCompra(c) : c.id) : '')
    }
  ];
}

function driveHash(obj) {
  const s = JSON.stringify(obj);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h + ':' + s.length;
}

// ===== 4. METADADOS LOCAIS (horário de cada alteração e o que foi apagado) =====
function driveLerMeta() {
  let m = {};
  try { m = JSON.parse(localStorage.getItem(DRIVE_META_KEY)) || {}; } catch (e) { m = {}; }
  m.ents = m.ents || {};
  m.tomb = m.tomb || {};
  return m;
}

function driveGravarMeta(m) {
  try { localStorage.setItem(DRIVE_META_KEY, JSON.stringify(m)); }
  catch (e) { console.warn('[Drive] Não foi possível gravar os metadados:', e); }
}

/** Compara o estado atual com o último sincronizado: marca o que mudou e o que foi apagado. */
function driveCarimbar(meta, agora, remoto) {
  const local = {};
  const primeiraVez = !meta.ultimaSync;
  driveEntidades().forEach(ent => {
    const mEnt = meta.ents[ent.nome] = meta.ents[ent.nome] || {};
    const tomb = meta.tomb[ent.nome] = meta.tomb[ent.nome] || {};
    const saida = local[ent.nome] = {};
    const vistos = new Set();

    ent.lista.forEach(it => {
      const k = ent.chave(it);
      if (!k) return;
      vistos.add(k);
      const h = driveHash(it);
      let reg = mEnt[k];
      if (!reg) {
        const noRemoto = !!(remoto && remoto[ent.nome] && remoto[ent.nome][k]);
        // 1ª sincronização deste aparelho: em caso de conflito, vale o que já está na nuvem
        reg = mEnt[k] = { t: (primeiraVez && noRemoto) ? 0 : agora, h };
      } else if (reg.h !== h) {
        reg.t = agora; reg.h = h;
      }
      delete tomb[k];
      saida[k] = { t: reg.t, d: 0, v: it };
    });

    Object.keys(mEnt).forEach(k => {
      if (!vistos.has(k)) { tomb[k] = agora; delete mEnt[k]; }   // sumiu daqui = apagado aqui
    });
    Object.keys(tomb).forEach(k => { saida[k] = { t: tomb[k], d: 1 }; });
  });
  return local;
}

/** Junta local e nuvem: para cada item vale o registro mais recente. Empate: vale a nuvem. */
function driveMesclar(local, remoto) {
  const limite = Date.now() - DRIVE_TOMBSTONE_DIAS * 86400000;
  const res = {};
  driveEntidades().forEach(ent => {
    const a = local[ent.nome] || {};
    const b = (remoto && remoto[ent.nome]) || {};
    const out = res[ent.nome] = {};
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => {
      const x = a[k], y = b[k];
      const venc = !x ? y : (!y ? x : (x.t > y.t ? x : y));
      if (venc.d && venc.t <= limite) return;                    // apagado há muito tempo: esquece
      out[k] = venc;
    });
  });
  return res;
}

/** Grava o resultado da junção nas listas do app (sem trocar os arrays, só o conteúdo). */
function driveAplicar(meta, mesclado) {
  driveEntidades().forEach(ent => {
    const lista = ent.lista;
    const reg = mesclado[ent.nome] || {};
    const mEnt = meta.ents[ent.nome] = {};
    const tomb = meta.tomb[ent.nome] = {};
    const vivos = {};
    Object.keys(reg).forEach(k => {
      if (reg[k].d) tomb[k] = reg[k].t; else vivos[k] = reg[k];
    });

    const ordem = [];
    const usados = new Set();
    lista.forEach(it => {
      const k = ent.chave(it);
      if (!k) { ordem.push(it); return; }                        // sem id: mantém, não sincroniza
      if (vivos[k]) { ordem.push(vivos[k].v); usados.add(k); }   // apagado em outro aparelho: sai
    });
    Object.keys(vivos).forEach(k => { if (!usados.has(k)) ordem.push(vivos[k].v); });
    Object.keys(vivos).forEach(k => { mEnt[k] = { t: vivos[k].t, h: driveHash(vivos[k].v) }; });

    lista.splice(0, lista.length, ...ordem);
    if (ent.nome === 'historico' && Array.isArray(window.purchaseHistory) && window.purchaseHistory !== lista) {
      window.purchaseHistory.splice(0, window.purchaseHistory.length, ...ordem);
    }
  });
}

// ===== 5. PERSISTÊNCIA LOCAL E TELAS =====
function driveSalvarLocal() {
  ['saveAllLocalData', 'salvarHistoricoLocal'].forEach(fn => {
    try { if (typeof window[fn] === 'function') window[fn](); }
    catch (e) { console.warn('[Drive] Falha ao salvar localmente (' + fn + '):', e); }
  });
}

function driveAtualizarTelas() {
  try {
    if (typeof activeMarketId !== 'undefined' && typeof supermarkets !== 'undefined' &&
        Array.isArray(supermarkets) && supermarkets.length &&
        !supermarkets.some(m => m.id === activeMarketId)) {
      activeMarketId = supermarkets[0].id;                       // o mercado ativo foi apagado em outro aparelho
    }
  } catch (e) { /* activeMarketId pode ser constante em alguma versão */ }
  ['renderCatalog', 'renderMarkets', 'renderHistory', 'renderCartUI', 'refreshActiveMarketUI'].forEach(fn => {
    try { if (typeof window[fn] === 'function') window[fn](); }
    catch (e) { console.warn('[Drive] Falha ao atualizar a tela (' + fn + '):', e); }
  });
}

// ===== 6. INTERFACE =====
function driveStatus(texto, erro) {
  const el = document.getElementById('driveSyncStatus');
  if (!el) return;
  el.textContent = texto;
  el.classList.toggle('text-rose-600', !!erro);
  el.classList.toggle('text-slate-500', !erro);
}

function driveMostrarConta() {
  const conectado = !!localStorage.getItem(DRIVE_FLAG_KEY);
  const email = localStorage.getItem(DRIVE_EMAIL_KEY);
  const elConta = document.getElementById('driveSyncConta');
  if (elConta) elConta.textContent = conectado ? ('Conta: ' + (email || 'Google conectado')) : 'Não conectado';
  const btnDes = document.getElementById('driveBtnDesconectar');
  if (btnDes) btnDes.classList.toggle('hidden', !conectado);
}

async function driveAtualizarConta(token) {
  try {
    const r = await driveFetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {}, token);
    const u = (await r.json()).user || {};
    if (u.emailAddress) localStorage.setItem(DRIVE_EMAIL_KEY, u.emailAddress);
  } catch (e) { /* o e-mail é só para exibir */ }
  driveMostrarConta();
}

function driveMensagemErro(e) {
  const m = String((e && e.message) || e);
  if (!navigator.onLine || /Failed to fetch|NetworkError|Sem internet/i.test(m)) {
    return 'Sem internet. As alterações ficam salvas aqui e sincronizam depois.';
  }
  if (/sessao_expirada|interaction_required|login_required|popup|access_denied|login_cancelado|login_timeout/i.test(m)) {
    return 'Toque em "Conectar / Sincronizar" para entrar na sua conta Google.';
  }
  return 'Falha ao sincronizar (' + m + ').';
}

// ===== 7. SINCRONIZAÇÃO =====
async function driveSincronizar(interativo) {
  if (_driveSincronizando) return;
  _driveSincronizando = true;
  _driveAplicando = true;
  driveStatus('Sincronizando...');
  try {
    const token = await driveObterToken(!!interativo);
    const meta = driveLerMeta();
    meta.deviceId = meta.deviceId || ('d-' + Math.random().toString(36).slice(2, 10));

    const arq = await driveAcharArquivo(token);
    let remoto = null;
    if (arq) {
      const j = await driveBaixarArquivo(token, arq.id);
      remoto = (j && j.dados) ? j.dados : null;
    }

    const local = driveCarimbar(meta, Date.now(), remoto);
    const mesclado = driveMesclar(local, remoto);
    driveAplicar(meta, mesclado);
    driveSalvarLocal();
    driveAtualizarTelas();
    driveGravarMeta(meta);

    const conteudo = JSON.stringify({
      v: 1, app: 'SuperComprasPro', salvoEm: new Date().toISOString(),
      dispositivo: meta.deviceId, dados: mesclado
    });
    if (arq) await driveAtualizarArquivo(token, arq.id, conteudo);
    else await driveCriarArquivo(token, conteudo);

    meta.ultimaSync = Date.now();
    driveGravarMeta(meta);
    localStorage.setItem(DRIVE_FLAG_KEY, '1');
    await driveAtualizarConta(token);
    driveStatus('Sincronizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    if (interativo && typeof showAppToast === 'function') showAppToast('Backup sincronizado com o Google Drive.', 'success');
  } catch (e) {
    console.warn('[Drive] Falha na sincronização:', e);
    driveStatus(driveMensagemErro(e), !!interativo);
  } finally {
    _driveAplicando = false;
    _driveSincronizando = false;
  }
}

function driveDesconectar() {
  try {
    if (_driveToken && window.google && google.accounts && google.accounts.oauth2) {
      google.accounts.oauth2.revoke(_driveToken, () => {});
    }
  } catch (e) { /* sem problema */ }
  _driveToken = null;
  _driveTokenExp = 0;
  [DRIVE_FLAG_KEY, DRIVE_EMAIL_KEY, DRIVE_META_KEY].forEach(k => localStorage.removeItem(k));
  driveMostrarConta();
  driveStatus('Desconectado. Os dados deste aparelho foram mantidos.');
}

// ===== 8. SINCRONIZAÇÃO AUTOMÁTICA =====
/** Registra o horário real das alterações (só depois da 1ª sincronização). */
function driveCarimbarAlteracoes() {
  const meta = driveLerMeta();
  if (!meta.ultimaSync) return;
  driveCarimbar(meta, Date.now(), null);
  driveGravarMeta(meta);
}

function driveAgendarSync() {
  if (_driveAplicando || !localStorage.getItem(DRIVE_FLAG_KEY)) return;
  clearTimeout(_driveTimerCarimbo);
  _driveTimerCarimbo = setTimeout(driveCarimbarAlteracoes, DRIVE_ATRASO_CARIMBO_MS);
  clearTimeout(_driveTimerSync);
  _driveTimerSync = setTimeout(() => driveSincronizar(false), DRIVE_ATRASO_SYNC_MS);
}

function driveEncaixarGancho(nome) {
  const orig = window[nome];
  if (typeof orig !== 'function' || orig.__driveGancho) return;
  const novo = function () {
    const r = orig.apply(this, arguments);
    driveAgendarSync();
    return r;
  };
  novo.__driveGancho = true;
  window[nome] = novo;
}

function driveIniciar() {
  driveEncaixarGancho('saveAllLocalData');
  driveEncaixarGancho('salvarHistoricoLocal');
  driveMostrarConta();
  if (localStorage.getItem(DRIVE_FLAG_KEY)) setTimeout(() => driveSincronizar(false), 2000);
}
window.addEventListener('load', driveIniciar);
window.addEventListener('online', () => {
  if (localStorage.getItem(DRIVE_FLAG_KEY)) driveSincronizar(false);
});

window.driveSincronizar = driveSincronizar;
window.driveDesconectar = driveDesconectar;
window.openDriveSyncModal = function() {
  const m = document.getElementById('modalDriveSync');
  if (m) {
    m.classList.remove('hidden');
    m.style.removeProperty('display');
  }
};

window.closeDriveSyncModal = function() {
  const m = document.getElementById('modalDriveSync');
  if (m) {
    m.classList.add('hidden');
  }
};