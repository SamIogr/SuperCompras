/**
 * SUPERCOMPRAS PRO (Carregador Modular de Componentes UI)
 * Injeção garantida com templates embutidos para evitar cache do Live Server
 */


function carregarComponentesUI() {
  const componentes = [
    { containerId: 'tab-historico', url: 'components/tab-historico.html' },
    { containerId: 'modal-compras-container', url: 'components/modal-compras.html' },
    { containerId: 'modal-core-container', url: 'components/modal-core.html' },
    { containerId: 'modal-qrcode-container', url: 'components/modal-qrcode.html' }
  ];

  const timestamp = Date.now();

  return Promise.all(
    componentes.map(async (comp) => {
      const el = document.getElementById(comp.containerId);
      if (!el) return;

      try {
        const resp = await fetch(`${comp.url}?t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (!resp.ok) throw new Error(`Status: ${resp.status}`);
        el.innerHTML = await resp.text();
      } catch (err) {
        console.warn(`[UI Loader] Erro no componente ${comp.url}:`, err);
      }
    })
  );
}
window.carregarComponentesUI = carregarComponentesUI;