/**
 * UI LOADER - Injeta os componentes modais no DOM
 */
async function loadComponent(url, targetElement = document.body) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao carregar ${url}`);
    const html = await res.text();
    targetElement.insertAdjacentHTML('beforeend', html);
  } catch (err) {
    console.error(`Erro ao montar componente (${url}):`, err);
  }
}

window.initAppLayout = async function() {
  await Promise.all([
    loadComponent('./components/modal-core.html'),
    loadComponent('./components/modal-compras.html'),
    loadComponent('./components/modals-catalogo.html')
  ]);
};