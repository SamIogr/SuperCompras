/**
 * SUPERCOMPRAS PRO (Carregador Modular de Componentes UI)
 * Injeção assíncrona paralela com bypass rigoroso de cache
 */

let carregamentoModulosPromessa = null;

function carregarComponentesUI() {
  if (carregamentoModulosPromessa) return carregamentoModulosPromessa;

  const componentes = [
    { containerId: 'tab-historico', url: 'components/tab-historico.html' },
    { containerId: 'tab-dados', url: 'components/tab-dados.html' },
    { containerId: 'modal-compras-container', url: 'components/modal-compras.html' },
    { containerId: 'modal-core-container', url: 'components/modal-core.html' },
    { containerId: 'modals-catalogo-container', url: 'components/modals-catalogo.html' }
  ];

  // Força o navegador a descarregar o HTML atualizado ignorando o Live Server Cache
  const cacheBuster = new Date().getTime();

  carregamentoModulosPromessa = Promise.all(
    componentes.map(async (comp) => {
      const el = document.getElementById(comp.containerId);
      if (!el) return;

      try {
        const resp = await fetch(`${comp.url}?v=${cacheBuster}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`Status: ${resp.status}`);
        el.innerHTML = await resp.text();
      } catch (err) {
        console.error(`[UI Loader] Erro no componente ${comp.url}:`, err);
      }
    })
  );

  return carregamentoModulosPromessa;
}

window.carregarComponentesUI = carregarComponentesUI;