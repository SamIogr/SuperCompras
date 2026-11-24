/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO (Coordenação das sincronizações: Planilha do administrador x Google Drive)
 * Arquivo: js/sync-coordenador.js
 * Carregue LOGO DEPOIS de state.js: api.js e drive-sync.js chamam scRodar() diretamente.
 *
 * Papéis:
 *  - PLANILHA (só o administrador, quem tem a chave salva): catálogo da nuvem (produtos PROD-... e mercados).
 *  - DRIVE (todos): histórico, produtos e mercados criados no aparelho.
 * As duas passam por uma fila única: nunca rodam ao mesmo tempo (vale a ordem em que foram pedidas).
 *
 * Antes este arquivo trocava as funções globais (window.x = versão envolvida) e só funcionava
 * se fosse carregado por último. Agora cada função pública chama scRodar() explicitamente,
 * então a ordem dos <script> não quebra mais a fila em silêncio.
 * Atenção: uma função que roda dentro da fila não deve chamar e esperar (await) outra que
 * também passe por scRodar(): as duas ficariam esperando uma pela outra.
 */

// ===== 1. FILA ÚNICA =====
let _scFila = Promise.resolve();
export function scExclusivo(fn) {
  const rodar = () => Promise.resolve().then(fn);
  const p = _scFila.then(rodar, rodar);
  _scFila = p.catch(() => {});
  return p;
}

// ===== 2. MODO ADMINISTRADOR (= ter a chave da planilha salva neste aparelho) =====
export function scEhAdmin() {
  return typeof getSecurityToken === 'function' && !!getSecurityToken();
}

/**
 * Roda fn na fila única.
 * soAdmin: sem chave salva, não chama a planilha (e avisa, a menos que silencioso).
 */
export function scRodar(soAdmin, silencioso, fn) {
  if (soAdmin && !scEhAdmin()) {
    if (!silencioso && typeof showAppToast === 'function') showAppToast('Recurso restrito ao administrador.', 'info');
    return Promise.resolve();
  }
  return scExclusivo(fn);
}

// ===== 3. TELA: esconde os controles da planilha de quem não é administrador =====
export function scAplicarModoAdmin() {
  const admin = scEhAdmin();
  const ids = ['btnSyncPlanilha', 'btnPromoverProduto', 'btnPromoverMercado'];
  const alvos = ids.map(id => document.getElementById(id));
  const icone = document.getElementById('iconSyncCatalogo');
  if (icone) alvos.push(icone.closest('button'));
  document.querySelectorAll('[data-admin-only]').forEach(el => alvos.push(el));
  alvos.filter(Boolean).forEach(el => { el.style.display = admin ? '' : 'none'; });
}

let _scTimerAdmin = null;
export function scIniciarTela() {
  scAplicarModoAdmin();
  // Os modais de edição são redesenhados ao abrir: reaplica só quando entra na tela algum
  // controle de administrador (antes rodava a cada mudança de qualquer lista).
  const SELETOR_ADMIN = '#btnSyncPlanilha, #btnPromoverProduto, #btnPromoverMercado, #iconSyncCatalogo, [data-admin-only]';
  new MutationObserver((mudancas) => {
    const relevante = mudancas.some(m => Array.from(m.addedNodes).some(n =>
      n.nodeType === 1 && (n.matches(SELETOR_ADMIN) || n.querySelector(SELETOR_ADMIN))
    ));
    if (!relevante) return;
    clearTimeout(_scTimerAdmin);
    _scTimerAdmin = setTimeout(scAplicarModoAdmin, 150);
  }).observe(document.body, { childList: true, subtree: true });
}
window.addEventListener('load', scIniciarTela);

// ----- PONTE DA TRANSIÇÃO (etapa 4) -----
// Os arquivos que ainda não são módulos usam estes nomes como globais.
// Quando todos eles passarem a usar import, esta linha sai.
Object.assign(window, { scExclusivo, scEhAdmin, scRodar, scAplicarModoAdmin, scIniciarTela });
