/**
 * SUPERCOMPRAS PRO - Carregador Modular de Componentes UI
 *
 * Desenvolvimento (localhost / Live Server): sempre busca a versão mais nova (anti-cache),
 * como antes.
 * Uso real: precisa funcionar com sinal fraco dentro do mercado. Tenta a rede (revalidando);
 * se falhar, usa o cache do navegador; se também falhar, usa a última cópia boa guardada
 * no aparelho (localStorage). Assim os modais e a aba de histórico abrem mesmo offline.
 */

const UI_LOADER_DEV = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname) || location.protocol === 'file:';
const UI_LOADER_CHAVE_COPIA = 'sc_ui_componente_';

function carregarComponentesUI() {
  const componentes = [
    { containerId: 'tab-historico', url: 'components/tab-historico.html' },
    { containerId: 'modal-compras-container', url: 'components/modal-compras.html' },
    { containerId: 'modal-core-container', url: 'components/modal-core.html' },
    { containerId: 'modal-qrcode-container', url: 'components/modal-qrcode.html' }
  ];

  const bust = Date.now() + '_' + Math.floor(performance.now());

  async function buscar(url) {
    if (UI_LOADER_DEV) {
      const r = await fetch(`${url}?_v=${bust}`, {
        cache: 'reload',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (!r.ok) throw new Error(`Status: ${r.status}`);
      return r.text();
    }
    try {
      const r = await fetch(url, { cache: 'no-cache' });      // revalida com o servidor
      if (!r.ok) throw new Error(`Status: ${r.status}`);
      return await r.text();
    } catch (errRede) {
      const r = await fetch(url, { cache: 'force-cache' });   // sem rede: aceita a cópia do navegador
      if (!r.ok) throw errRede;
      return r.text();
    }
  }

  return Promise.all(
    componentes.map(async (comp) => {
      const el = document.getElementById(comp.containerId);
      if (!el) return;
      const chave = UI_LOADER_CHAVE_COPIA + comp.containerId;

      try {
        const html = await buscar(comp.url);
        el.innerHTML = html;
        try { localStorage.setItem(chave, html); } catch (e) { /* armazenamento cheio: segue sem cópia */ }
      } catch (err) {
        const copia = localStorage.getItem(chave);
        if (copia) {
          el.innerHTML = copia;
          console.warn(`[UI Loader] ${comp.url} sem rede; usando a última cópia salva.`);
        } else {
          console.warn(`[UI Loader] Erro ao carregar ${comp.url}:`, err);
        }
      }
    })
  );
}
window.carregarComponentesUI = carregarComponentesUI;
