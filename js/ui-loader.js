/**
 * SUPERCOMPRAS PRO (Carregador Modular de Componentes UI)
 * Injeção garantida com templates embutidos para evitar cache do Live Server
 */


/**
 * SUPERCOMPRAS PRO - Carregador Modular de Componentes UI
 */
function carregarComponentesUI() {
  const componentes = [
    { containerId: 'tab-historico', url: 'components/tab-historico.html' },
    { containerId: 'modal-compras-container', url: 'components/modal-compras.html' },
    { containerId: 'modal-core-container', url: 'components/modal-core.html' },
    { containerId: 'modal-qrcode-container', url: 'components/modal-qrcode.html' }
  ];

  // Gera token anti-cache exclusivo a cada recarregamento
  const bust = Date.now() + '_' + Math.floor(performance.now());

  return Promise.all(
    componentes.map(async (comp) => {
      const el = document.getElementById(comp.containerId);
      if (!el) return;

      try {
        const resp = await fetch(`${comp.url}?_v=${bust}`, {
          cache: 'reload',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        if (!resp.ok) throw new Error(`Status: ${resp.status}`);
        el.innerHTML = await resp.text();
      } catch (err) {
        console.warn(`[UI Loader] Erro ao carregar ${comp.url}:`, err);
      }
    })
  );
}
window.carregarComponentesUI = carregarComponentesUI;