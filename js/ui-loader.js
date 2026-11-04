/**
 * SUPERCOMPRAS PRO (Carregador Modular de Componentes UI)
 * Injeção garantida com templates embutidos para evitar cache do Live Server
 */

const TEMPLATE_TAB_DADOS_FALLBACK = `
<div class="tab-dados-wrapper p-2 sm:p-4 space-y-4 pb-24">
  <!-- 1. SELETOR DE SUB-ABAS (PRODUTOS X SUPERMERCADOS) -->
  <div class="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 border border-slate-300 shadow-2xs">
    <button type="button" id="btn-subtab-produtos" onclick="setSubTabDados('produtos')" class="flex-1 py-2 px-3 rounded-xl bg-white text-slate-800 shadow-xs text-center transition-all flex items-center justify-center space-x-2 font-bold text-xs cursor-pointer">
      <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
      <span>Produtos (<span id="badge-total-produtos">0</span>)</span>
    </button>
    <button type="button" id="btn-subtab-mercados" onclick="setSubTabDados('mercados')" class="flex-1 py-2 px-3 rounded-xl text-slate-600 hover:text-slate-800 text-center transition-all flex items-center justify-center space-x-2 font-semibold text-xs cursor-pointer">
      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
      <span>Supermercados (<span id="badge-total-mercados">0</span>)</span>
    </button>
  </div>

  <!-- 2. SUB-ABA: CATÁLOGO DE PRODUTOS -->
  <section id="secao-catalogo-produtos" class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h3 class="font-extrabold text-sm text-slate-800">Catálogo Mestre de Produtos</h3>
        <p class="text-[11px] text-slate-500">Cotações por rede e marcas vinculadas</p>
      </div>
      <div class="flex items-center space-x-2">
        <button type="button" onclick="abrirModalCatalogoSugerido()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer" title="Importar lista de produtos frequentes">
          <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          <span>Itens Básicos</span>
        </button>
        <button type="button" onclick="openProductEditModal(null)" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span>Novo Produto</span>
        </button>
      </div>
    </div>

    <!-- PAINEL COMPLETO DE FILTROS -->
    <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input type="text" id="input-busca-produtos" placeholder="Buscar por nome ou categoria..." oninput="filtrarProdutosCatalogo()" class="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400">
        </div>
        <select id="select-ordenacao-produtos" onchange="ordenarProdutosCatalogo()" class="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 shrink-0 cursor-pointer shadow-2xs">
          <option value="az">Nome (A a Z)</option>
          <option value="za">Nome (Z a A)</option>
          <option value="setor">Por Categoria</option>
        </select>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100">
        <div class="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 text-xs font-semibold">
          <button type="button" onclick="filtrarOrigemProdutos('todos', this)" class="px-3 py-1 rounded-lg bg-white text-slate-800 shadow-2xs font-bold text-xs transition-all cursor-pointer">Todos</button>
          <button type="button" onclick="filtrarOrigemProdutos('nuvem', this)" class="px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 transition-all font-medium text-xs cursor-pointer">Nuvem</button>
          <button type="button" onclick="filtrarOrigemProdutos('local', this)" class="px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 transition-all font-medium text-xs cursor-pointer">Local</button>
        </div>
        <span id="contador-produtos-catalogo" class="text-[11px] font-semibold text-slate-400">Exibindo 0 produtos</span>
      </div>

      <div class="pt-1 border-t border-slate-100">
        <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <button type="button" onclick="filtrarSetorProdutos('Todas', this)" class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs whitespace-nowrap shadow-2xs transition-all cursor-pointer">Todas</button>
          <button type="button" onclick="filtrarSetorProdutos('Açougue e Carnes', this)" class="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all font-medium text-xs whitespace-nowrap cursor-pointer">Carnes</button>
          <button type="button" onclick="filtrarSetorProdutos('Laticínios e Frios', this)" class="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all font-medium text-xs whitespace-nowrap cursor-pointer">Frios</button>
          <button type="button" onclick="filtrarSetorProdutos('Mercearia e Básicos', this)" class="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all font-medium text-xs whitespace-nowrap cursor-pointer">Mercearia</button>
          <button type="button" onclick="filtrarSetorProdutos('Hortifrúti e Ovos', this)" class="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all font-medium text-xs whitespace-nowrap cursor-pointer">Hortifrúti</button>
          <button type="button" onclick="filtrarSetorProdutos('Higiene e Limpeza', this)" class="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all font-medium text-xs whitespace-nowrap cursor-pointer">Limpeza</button>
          <button type="button" onclick="filtrarSetorProdutos('Geral', this)" class="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all font-medium text-xs whitespace-nowrap cursor-pointer">Geral</button>
        </div>
      </div>
    </div>

    <div id="area-cards-produtos" class="space-y-2 pt-1"></div>
  </section>

  <!-- 3. SUB-ABA: SUPERMERCADOS -->
  <section id="secao-catalogo-mercados" class="space-y-3 hidden">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h3 class="font-extrabold text-sm text-slate-800">Supermercados Cadastrados</h3>
        <p class="text-[11px] text-slate-500">Redes disponíveis para cotação e compras</p>
      </div>
      <button type="button" onclick="openMarketEditModal(null)" class="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
        <span>Novo Supermercado</span>
      </button>
    </div>
    <div id="area-cards-mercados" class="space-y-2 pt-1"></div>
  </section>
</div>
`;

function carregarComponentesUI() {
  const componentes = [
    { containerId: 'tab-historico', url: 'components/tab-historico.html' },
    { containerId: 'modal-compras-container', url: 'components/modal-compras.html' },
    { containerId: 'modal-core-container', url: 'components/modal-core.html' },
    { containerId: 'modals-catalogo-container', url: 'components/modals-catalogo.html' },
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