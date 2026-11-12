/**
 * SUPERCOMPRAS PRO (Coordenação das sincronizações: Planilha do administrador x Google Drive)
 * Arquivo: js/sync-coordenador.js  (ARQUIVO NOVO)
 * Carregue DEPOIS de state.js, api.js e drive-sync.js.
 *
 * Papéis:
 *  - PLANILHA (só o administrador, quem tem a chave salva): catálogo da nuvem (produtos PROD-... e mercados).
 *  - DRIVE (todos): histórico, produtos e mercados criados no aparelho.
 * As duas passam por uma fila única: nunca rodam ao mesmo tempo, e a planilha vai primeiro.
 */

// ===== 1. FILA ÚNICA =====
let _scFila = Promise.resolve();
function scExclusivo(fn) {
  const rodar = () => Promise.resolve().then(fn);
  const p = _scFila.then(rodar, rodar);
  _scFila = p.catch(() => {});
  return p;
}

// ===== 2. MODO ADMINISTRADOR (= ter a chave da planilha salva neste aparelho) =====
function scEhAdmin() {
  return typeof getSecurityToken === 'function' && !!getSecurityToken();
}

function scEnvolver(nome, soAdmin, silencioso) {
  const orig = window[nome];
  if (typeof orig !== 'function' || orig.__scEnvolvida) return;
  const nova = function () {
    const args = arguments, self = this;
    if (soAdmin && !scEhAdmin()) {                       // sem chave: nem pergunta, nem chama a planilha
      if (!silencioso && typeof showAppToast === 'function') showAppToast('Recurso restrito ao administrador.', 'info');
      return Promise.resolve();
    }
    return scExclusivo(() => orig.apply(self, args));
  };
  nova.__scEnvolvida = true;
  window[nome] = nova;
}

// precisa rodar já na carga do script, antes de qualquer sincronização automática do app
scEnvolver('sincronizarComPlanilha', true, true);
scEnvolver('abrirModalSincronizacaoSeletiva', true, false);
scEnvolver('sincronizarCatalogoDireto', true, false);
scEnvolver('promoverProdutoEmEdicaoParaPlanilha', true, false);
scEnvolver('promoverMercadoEmEdicaoParaPlanilha', true, false);
scEnvolver('driveSincronizar', false, false);

// ===== 3. SINCRONIZAR TUDO (planilha primeiro, se for administrador; depois o Drive) =====
async function sincronizarTudo(interativo) {
  if (scEhAdmin() && typeof window.sincronizarComPlanilha === 'function') await window.sincronizarComPlanilha();
  if (interativo || localStorage.getItem('sc_drive_conectado')) await window.driveSincronizar(!!interativo);
}
window.sincronizarTudo = sincronizarTudo;

// ===== 4. TELA: esconde os controles da planilha de quem não é administrador =====
function scAplicarModoAdmin() {
  const admin = scEhAdmin();
  const ids = ['btnSyncPlanilha', 'btnPromoverProduto', 'btnPromoverMercado'];
  const alvos = ids.map(id => document.getElementById(id));
  const icone = document.getElementById('iconSyncCatalogo');
  if (icone) alvos.push(icone.closest('button'));
  document.querySelectorAll('[data-admin-only]').forEach(el => alvos.push(el));
  alvos.filter(Boolean).forEach(el => { el.style.display = admin ? '' : 'none'; });
}

let _scTimerAdmin = null;
function scIniciarTela() {
  scAplicarModoAdmin();
  const orig = window.salvarChaveSeguranca;
  if (typeof orig === 'function' && !orig.__scEnvolvida) {
    const nova = function () { const r = orig.apply(this, arguments); scAplicarModoAdmin(); return r; };
    nova.__scEnvolvida = true;
    window.salvarChaveSeguranca = nova;
  }
  // os modais de edição são redesenhados ao abrir: reaplica quando a tela mudar
  new MutationObserver(() => {
    clearTimeout(_scTimerAdmin);
    _scTimerAdmin = setTimeout(scAplicarModoAdmin, 150);
  }).observe(document.body, { childList: true, subtree: true });
}
window.addEventListener('load', scIniciarTela);