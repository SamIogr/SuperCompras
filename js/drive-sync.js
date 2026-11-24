/**
 * SUPERCOMPRAS PRO (Backup e Sincronização na conta Google do usuário)
 * Arquivo: js/drive-sync.js  (VERSÃO 2 - substitui o arquivo inteiro)
 *
 * Guarda os dados PESSOAIS (histórico, produtos e mercados criados no aparelho) numa pasta
 * OCULTA do Google Drive do próprio usuário (escopo drive.appdata). Só a conta logada acessa.
 * Itens que vêm da planilha do administrador NÃO entram aqui (ver DRIVE_EXCLUIR_ITENS_DA_PLANILHA).
 */

// ===== CONFIGURAÇÃO =====
const DRIVE_CLIENT_ID = '1005329591365-p2ibvui3iq1ssqgmrj4hb02pc3bqgabb.apps.googleusercontent.com';   // MANTENHA O SEU ID
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_ARQUIVO = 'supercompras_backup_v2.json';
const DRIVE_ARQUIVO_ANTIGO = 'supercompras_backup.json';   // só para recuperação (versão 1)
const DRIVE_META_KEY = CHAVES.DRIVE_META;
const DRIVE_META_KEY_ANTIGA = CHAVES.DRIVE_META_ANTIGA;
const DRIVE_FLAG_KEY = CHAVES.DRIVE_CONECTADO;
const DRIVE_EMAIL_KEY = CHAVES.DRIVE_EMAIL;
const DRIVE_TOMBSTONE_DIAS = 90;       // por quanto tempo lembrar o que foi apagado
const DRIVE_ATRASO_SYNC_MS = 8000;     // espera após uma alteração para sincronizar sozinho
const DRIVE_ATRASO_CARIMBO_MS = 1000;  // registra o horário das alterações
// true = produtos (PROD-...) e mercados que vêm da planilha ficam fora do Drive (quem manda neles é a planilha)
const DRIVE_EXCLUIR_ITENS_DA_PLANILHA = true;

let _driveToken = null;
let _driveTokenExp = 0;
let _driveSincronizando = false;
let _driveAplicando = false;
let _drivePendente = false;     // há alterações que ainda não foram enviadas ao Drive
let _driveTimerSync = null;
let _driveTimerCarimbo = null;

// ===== 1. LOGIN COM GOOGLE (a biblioteca só é baixada quando precisa) =====
// Regra: o popup de login do Google SÓ abre quando o usuário toca num botão (o navegador bloqueia o resto).
function driveTokenValido() { return !!_driveToken && Date.now() < _driveTokenExp - 60000; }

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

async function driveAcharArquivo(token, nome) {
  const q = encodeURIComponent("name='" + (nome || DRIVE_ARQUIVO) + "'");
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
function driveNormalizarNome(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Produto que veio da planilha do administrador (id PROD-... ou p-cloud-...). */
function driveProdutoDaPlanilha(p) { return /^(PROD-|p-cloud-)/i.test(String((p && p.id) || '')); }
/** Mercado que veio da planilha (qualquer um que não seja criado no aparelho). */
function driveMercadoDaPlanilha(m) { return !String((m && m.id) || '').startsWith('m-custom-'); }

/** A lista de histórico em uso (history.js troca o array a cada salvamento). */
function driveHistoricoAtual() {
  if (typeof purchaseHistory !== 'undefined' && Array.isArray(purchaseHistory)) return purchaseHistory;
  if (Array.isArray(window.purchaseHistory)) return window.purchaseHistory;
  return [];
}

function driveEntidades() {
  const fora = DRIVE_EXCLUIR_ITENS_DA_PLANILHA;
  const idDe = (v) => (v != null && v !== '') ? String(v) : '';
  return [
    {
      nome: 'produtos',
      lista: (typeof products !== 'undefined' && Array.isArray(products)) ? products : [],
      // o app já trata o NOME como identidade (dedup ao carregar, junção com a planilha)
      chave: p => (p && p.name) ? driveNormalizarNome(p.name) : '',
      incluir: p => !(fora && driveProdutoDaPlanilha(p))
    },
    {
      nome: 'mercados',
      lista: (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets)) ? supermarkets : [],
      chave: m => (m ? idDe(m.id) : ''),
      incluir: m => !!m && m.id !== 'm-padrao' && !(fora && driveMercadoDaPlanilha(m))
    },
    {
      nome: 'historico',
      lista: driveHistoricoAtual(),
      chave: c => (c ? idDe(c.id || c.date || c.dataISO) : ''),
      incluir: c => !!c
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
  m = Armazenamento.lerJSON(DRIVE_META_KEY, {}) || {};
  m.ents = m.ents || {};
  m.tomb = m.tomb || {};
  return m;
}

function driveGravarMeta(m) {
  Armazenamento.gravarJSON(DRIVE_META_KEY, m);
  _driveMetaCache = null;
}

/**
 * O item já está no backup do Drive? (usado nos selos e filtros de origem)
 * Verdadeiro só se o Drive está conectado, já houve uma sincronização e a última alteração
 * do item é anterior a ela, ou seja, já subiu. Item alterado e ainda não enviado conta como local.
 * tipo: 'produtos' (chave = nome normalizado) | 'mercados' (chave = id)
 */
let _driveMetaCache = null;
function driveEstaNoBackup(tipo, item) {
  if (!item || !Armazenamento.existe(DRIVE_FLAG_KEY)) return false;
  if (!_driveMetaCache) _driveMetaCache = driveLerMeta();
  const meta = _driveMetaCache;
  if (!meta.ultimaSync) return false;
  const chave = tipo === 'produtos' ? driveNormalizarNome(item.name) : String(item.id || '');
  const reg = chave && meta.ents[tipo] && meta.ents[tipo][chave];
  return Boolean(reg && reg.t <= meta.ultimaSync);
}
window.driveEstaNoBackup = driveEstaNoBackup;

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
      if (!it || !ent.incluir(it)) return;                       // fora do escopo do Drive
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
    const foraDoEscopo = new Set();     // itens da planilha: nunca duplicar com um pessoal de mesmo nome
    const guardar = (k) => { mEnt[k] = { t: vivos[k].t, h: driveHash(vivos[k].v) }; };

    lista.forEach(it => {
      const k = it ? ent.chave(it) : '';
      if (!it || !k || !ent.incluir(it)) {
        if (it && k) foraDoEscopo.add(k);
        ordem.push(it);                                          // não é do Drive: não mexe
        return;
      }
      if (vivos[k]) { ordem.push(vivos[k].v); usados.add(k); guardar(k); }   // se não: apagado em outro aparelho
    });
    Object.keys(vivos).forEach(k => {
      if (usados.has(k) || foraDoEscopo.has(k)) return;
      ordem.push(vivos[k].v);
      guardar(k);
    });

    lista.splice(0, lista.length, ...ordem);
  });
}

// ===== 5. PERSISTÊNCIA LOCAL E TELAS =====
function driveSalvarLocal() {
  try { if (typeof saveAllLocalData === 'function') saveAllLocalData(); }
  catch (e) { console.warn('[Drive] Falha ao salvar localmente:', e); }
  try {
    // atenção: salvarHistoricoLocal(lista) EXIGE a lista como argumento (grava nas duas chaves do histórico)
    if (typeof window.salvarHistoricoLocal === 'function') window.salvarHistoricoLocal(driveHistoricoAtual());
  } catch (e) { console.warn('[Drive] Falha ao salvar o histórico:', e); }
}

function driveAtualizarTelas() {
  try {
    if (typeof activeMarketId !== 'undefined' && typeof supermarkets !== 'undefined' &&
        Array.isArray(supermarkets) && supermarkets.length &&
        !supermarkets.some(m => m.id === activeMarketId)) {
      activeMarketId = supermarkets[0].id;                       // o mercado ativo foi apagado em outro aparelho
    }
  } catch (e) { /* activeMarketId pode ser constante em alguma versão */ }
  ['renderCatalogUI', 'renderMarketsUI', 'renderHistoricoUI', 'renderCartUI', 'refreshActiveMarketUI'].forEach(fn => {
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
  const conectado = Armazenamento.existe(DRIVE_FLAG_KEY);
  const email = Armazenamento.lerTexto(DRIVE_EMAIL_KEY);
  const elConta = document.getElementById('driveSyncConta');
  if (elConta) elConta.textContent = conectado ? ('Conta: ' + (email || 'Google conectado')) : 'Não conectado';
  const btnDes = document.getElementById('driveBtnDesconectar');
  if (btnDes) btnDes.classList.toggle('hidden', !conectado);
  driveAtualizarBotao(_driveSincronizando);
}

/** Botão do Google no topo: pisca durante a sincronização e mostra um ponto quando conectado. */
function driveAtualizarBotao(sincronizando) {
  const btn = document.getElementById('btnDriveSync');
  if (!btn) return;
  const conectado = Armazenamento.existe(DRIVE_FLAG_KEY);
  const icone = document.getElementById('driveSyncIcone');
  const ponto = document.getElementById('driveSyncPonto');
  if (icone) icone.classList.toggle('animate-pulse', !!sincronizando);
  if (ponto) {
    ponto.classList.toggle('hidden', !conectado);
    ponto.classList.toggle('bg-amber-400', conectado && _drivePendente);
    ponto.classList.toggle('bg-emerald-300', !(conectado && _drivePendente));
  }
  btn.disabled = !!sincronizando;
  const email = Armazenamento.lerTexto(DRIVE_EMAIL_KEY) || 'conectado';
  btn.title = !conectado ? 'Conectar ao Google Drive e sincronizar'
    : (_drivePendente ? 'Alterações pendentes: toque para sincronizar (' + email + ')'
                      : 'Sincronizar com o Google Drive (' + email + ')');
}

async function driveAtualizarConta(token) {
  try {
    const r = await driveFetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {}, token);
    const u = (await r.json()).user || {};
    if (u.emailAddress) Armazenamento.gravarTexto(DRIVE_EMAIL_KEY, u.emailAddress);
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
// Pública: passa pela fila única do sync-coordenador.js (nunca junto com a planilha).
function driveSincronizar(interativo) { return scRodar(false, false, () => _driveSincronizarAgora(interativo)); }

async function _driveSincronizarAgora(interativo) {
  if (_driveSincronizando) return;
  if (!interativo && !driveTokenValido()) {
    // sem toque do usuário e sem login válido: não tenta abrir o popup (o navegador bloquearia); fica pendente
    _drivePendente = true;
    driveStatus('Alterações pendentes. Toque em "Conectar / Sincronizar" para enviar ao Drive.');
    driveAtualizarBotao(false);
    return;
  }
  _driveSincronizando = true;
  _driveAplicando = true;
  driveStatus('Sincronizando...');
  driveAtualizarBotao(true);
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
      v: 2, app: 'SuperComprasPro', salvoEm: new Date().toISOString(),
      dispositivo: meta.deviceId, dados: mesclado
    });
    if (arq) await driveAtualizarArquivo(token, arq.id, conteudo);
    else await driveCriarArquivo(token, conteudo);

    meta.ultimaSync = Date.now();
    driveGravarMeta(meta);
    _drivePendente = false;
    Armazenamento.gravarTexto(DRIVE_FLAG_KEY, '1');
    // redesenha de novo: agora os itens enviados ganham o selo "Drive"
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
    if (typeof renderMarketsUI === 'function') renderMarketsUI();
    await driveAtualizarConta(token);
    driveStatus('Sincronizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    if (interativo && typeof showAppToast === 'function') showAppToast('Backup sincronizado com o Google Drive.', 'success');
  } catch (e) {
    console.warn('[Drive] Falha na sincronização:', e);
    if (Armazenamento.existe(DRIVE_FLAG_KEY)) _drivePendente = true;
    driveStatus(driveMensagemErro(e), !!interativo);
    if (interativo && typeof showAppToast === 'function') showAppToast(driveMensagemErro(e), 'error');
  } finally {
    _driveAplicando = false;
    _driveSincronizando = false;
    driveAtualizarBotao(false);
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
  _drivePendente = false;
  [DRIVE_FLAG_KEY, DRIVE_EMAIL_KEY, DRIVE_META_KEY].forEach(k => Armazenamento.remover(k));
  _driveMetaCache = null;
  driveMostrarConta();
  driveStatus('Desconectado. Os dados deste aparelho foram mantidos.');
}

/** Recupera compras do histórico que ainda existam no backup ANTIGO (versão 1) do Drive. */
async function driveRecuperarHistoricoAntigo() {
  const token = await driveObterToken(true);
  const arq = await driveAcharArquivo(token, DRIVE_ARQUIVO_ANTIGO);
  if (!arq) { driveStatus('Nenhum backup antigo encontrado no Drive.'); return 0; }
  const j = await driveBaixarArquivo(token, arq.id);
  const antigo = (j && j.dados && j.dados.historico) || {};
  const lista = driveHistoricoAtual();
  const ids = new Set(lista.map(c => String((c && (c.id || c.date || c.dataISO)) || '')));
  let n = 0;
  Object.keys(antigo).forEach(k => {
    const r = antigo[k];
    if (r && !r.d && r.v && !ids.has(String(k))) { lista.push(r.v); ids.add(String(k)); n++; }
  });
  if (n > 0) { driveSalvarLocal(); driveAtualizarTelas(); }
  driveStatus(n + ' compra(s) recuperada(s) do backup antigo.');
  return n;
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
  if (_driveAplicando || !Armazenamento.existe(DRIVE_FLAG_KEY)) return;
  _drivePendente = true;
  driveAtualizarBotao(_driveSincronizando);
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
  Armazenamento.remover(DRIVE_META_KEY_ANTIGA);
  driveEncaixarGancho('saveAllLocalData');
  driveEncaixarGancho('salvarHistoricoLocal');
  driveMostrarConta();      // sem sincronizar sozinho ao abrir: o login do Google só abre com um toque
}
window.addEventListener('load', driveIniciar);
window.addEventListener('online', () => {
  if (Armazenamento.existe(DRIVE_FLAG_KEY) && driveTokenValido()) driveSincronizar(false);
});

window.driveSincronizar = driveSincronizar;
window.driveDesconectar = driveDesconectar;
window.driveRecuperarHistoricoAntigo = driveRecuperarHistoricoAntigo;

// ===== 9. VER O QUE ESTÁ GUARDADO NO BACKUP =====
async function driveLerBackup(nomeArquivo) {
  const token = await driveObterToken(true);
  const arq = await driveAcharArquivo(token, nomeArquivo || DRIVE_ARQUIVO);
  if (!arq) return null;
  return driveBaixarArquivo(token, arq.id);
}

function driveResumirBackup(j) {
  const d = (j && j.dados) || {};
  const vivos = (m) => Object.values(m || {}).filter(r => r && !r.d && r.v).map(r => r.v);
  const apagados = (m) => Object.values(m || {}).filter(r => r && r.d).length;
  return {
    salvoEm: (j && j.salvoEm) || '',
    produtos: vivos(d.produtos), mercados: vivos(d.mercados), historico: vivos(d.historico),
    apagados: { produtos: apagados(d.produtos), mercados: apagados(d.mercados), historico: apagados(d.historico) }
  };
}

/** Quantos itens PESSOAIS este aparelho tem (é o que o Drive deveria ter). */
function driveContarLocal() {
  const r = {};
  driveEntidades().forEach(ent => {
    r[ent.nome] = ent.lista.filter(it => it && ent.incluir(it) && ent.chave(it)).length;
  });
  return r;
}

function driveDescreverCompra(c) {
  const data = c.date || c.dataISO || c.data || '';
  const dt = new Date(data);
  const quando = (data && !isNaN(dt)) ? dt.toLocaleDateString('pt-BR') : String(data);
  const itens = Array.isArray(c.items) ? c.items.length : (Array.isArray(c.itens) ? c.itens.length : 0);
  const mercado = (typeof resolverNomeMercado === 'function') ? resolverNomeMercado(c) : (c.marketName || c.mercadoNome || '');
  const temTotal = c.total != null && isFinite(Number(c.total));
  const total = temTotal ? 'R$ ' + (typeof formatBRL === 'function' ? formatBRL(c.total) : Number(c.total).toFixed(2)) : '';
  return [quando, mercado, itens + ' item(ns)', total].filter(Boolean).join(' · ');
}

function driveCriarEl(tag, texto, classe) {
  const el = document.createElement(tag);
  if (texto != null) el.textContent = texto;          // sempre textContent: nomes vindos do backup nunca viram HTML
  if (classe) el.className = classe;
  return el;
}

function driveCriarLista(titulo, linhas) {
  const det = driveCriarEl('details', null, 'mt-1');
  det.appendChild(driveCriarEl('summary', titulo + ' (' + linhas.length + ')', 'text-xs font-bold text-slate-700 cursor-pointer'));
  const ul = driveCriarEl('ul', null, 'mt-1 ml-4 list-disc text-[11px] text-slate-500 max-h-40 overflow-y-auto');
  linhas.slice(0, 200).forEach(t => ul.appendChild(driveCriarEl('li', t)));
  if (linhas.length > 200) ul.appendChild(driveCriarEl('li', '... e mais ' + (linhas.length - 200)));
  det.appendChild(ul);
  return det;
}

/** Mostra, no cartão da aba Dados, o que o Drive guarda hoje (precisa de um toque: abre o login se preciso). */
async function driveVerBackup() {
  const caixa = document.getElementById('driveBackupResumo');
  try {
    driveStatus('Lendo o backup no Drive...');
    const atual = await driveLerBackup(DRIVE_ARQUIVO);
    const antigo = await driveLerBackup(DRIVE_ARQUIVO_ANTIGO);
    const r = atual ? driveResumirBackup(atual) : null;
    const loc = driveContarLocal();
    if (!caixa) { console.log('[Drive] backup:', r, '| neste aparelho:', loc); driveStatus('Resumo no Console.'); return r; }

    caixa.textContent = '';
    caixa.classList.remove('hidden');
    if (!r) {
      caixa.appendChild(driveCriarEl('p', 'Ainda não há backup (versão 2) no Drive. Toque em "Conectar / Sincronizar".', 'text-[11px] text-slate-500'));
    } else {
      const quando = r.salvoEm ? new Date(r.salvoEm).toLocaleString('pt-BR') : 'data desconhecida';
      caixa.appendChild(driveCriarEl('p', 'Última gravação: ' + quando, 'text-xs font-bold text-slate-700'));
      [['Produtos', r.produtos.length, loc.produtos, r.apagados.produtos],
       ['Mercados', r.mercados.length, loc.mercados, r.apagados.mercados],
       ['Histórico', r.historico.length, loc.historico, r.apagados.historico]].forEach(([nome, noDrive, aqui, apag]) => {
        caixa.appendChild(driveCriarEl('p',
          nome + ': ' + noDrive + ' no Drive · ' + aqui + ' neste aparelho' + (apag ? ' · ' + apag + ' apagado(s) lembrado(s)' : ''),
          'text-[11px] text-slate-600'));
      });
      if (r.produtos.length !== loc.produtos || r.mercados.length !== loc.mercados || r.historico.length !== loc.historico) {
        caixa.appendChild(driveCriarEl('p', 'As quantidades diferem: toque em "Conectar / Sincronizar" para igualar.', 'text-[11px] font-semibold text-amber-600'));
      }
      caixa.appendChild(driveCriarLista('Produtos pessoais', r.produtos.map(p => (p.name || '?') + (p.unit ? ' (' + p.unit + ')' : ''))));
      caixa.appendChild(driveCriarLista('Mercados pessoais', r.mercados.map(m => (m.name || '?') + (m.branch ? ' (' + m.branch + ')' : ''))));
      caixa.appendChild(driveCriarLista('Histórico de compras', r.historico.map(driveDescreverCompra)));
    }
    if (antigo) {
      const a = driveResumirBackup(antigo);
      caixa.appendChild(driveCriarEl('p',
        'Backup antigo (versão 1) ainda no Drive: ' + a.historico.length + ' compra(s) ativa(s), ' + a.apagados.historico +
        ' marcada(s) como apagada(s). Se faltar histórico, use driveRecuperarHistoricoAntigo() no Console.',
        'text-[11px] text-slate-500 mt-1'));
    }
    driveStatus('Backup lido às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    return r;
  } catch (e) {
    console.warn('[Drive] Falha ao ler o backup:', e);
    driveStatus(driveMensagemErro(e), true);
    return null;
  }
}

/** Baixa uma cópia do backup (.json) para o seu aparelho. O arquivo contém TODOS os seus dados pessoais do app. */
async function driveBaixarBackup(antigo) {
  try {
    const j = await driveLerBackup(antigo ? DRIVE_ARQUIVO_ANTIGO : DRIVE_ARQUIVO);
    if (!j) { driveStatus('Esse backup não existe no Drive.'); return false; }
    const blob = new Blob([JSON.stringify(j, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'supercompras_backup_drive_' + (antigo ? 'v1_' : '') + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    driveStatus('Cópia do backup baixada.');
    return true;
  } catch (e) {
    console.warn('[Drive] Falha ao baixar o backup:', e);
    driveStatus(driveMensagemErro(e), true);
    return false;
  }
}

window.driveVerBackup = driveVerBackup;
window.driveBaixarBackup = driveBaixarBackup;

// ===== 10. JANELA DO DRIVE (botão da nuvem no topo) =====
function openDriveSyncModal() {
  const m = document.getElementById('modalDriveSync');
  if (!m) { driveSincronizar(true); return; }       // sem a janela no HTML: o botão sincroniza direto
  driveMostrarConta();
  m.classList.remove('hidden');
}

function closeDriveSyncModal() {
  const m = document.getElementById('modalDriveSync');
  if (m) m.classList.add('hidden');
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDriveSyncModal(); });
window.openDriveSyncModal = openDriveSyncModal;
window.closeDriveSyncModal = closeDriveSyncModal;