/**
 * SUPERCOMPRAS PRO - MOTOR CENTRAL DE TEMPLATES (js/templates.js)
 * Renderização gráfica, modais dinâmicos e layout da aba Dados com proteção esc().
 */

window.AppTemplates = {
  icons: {
    edit: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`,
    delete: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`,
    add: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>`,
    route: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
    check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`,
    close: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>`
  },
  // 8. MODAL DA CALCULADORA COMPARATIVA
  renderPriceComparatorModal() {
    document.querySelectorAll('#modalPriceComparator').forEach(el => el.remove());

    const modalHtml = `
      <div id="modalPriceComparator" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 space-y-3 max-h-[92vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div class="flex items-center space-x-2">
              <div class="w-7 h-7 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-black text-sm">⚖️</div>
              <div>
                <h3 class="font-extrabold text-slate-800 text-sm">Comparador de Preço e Atacado</h3>
                <p class="text-[10px] text-slate-500 font-medium">Decida pelo menor custo unitário ou pela meta de compra</p>
              </div>
            </div>
            <button type="button" onclick="fecharCalculadoraComparativa()" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-lg font-bold">✕</button>
          </div>

          <div class="flex items-center justify-between bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button type="button" id="compModeWeight" onclick="setCompMode('weight')" class="flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center transition-all font-bold">Peso (g / kg)</button>
            <button type="button" id="compModeVolume" onclick="setCompMode('volume')" class="flex-1 py-1 rounded-lg text-center transition-all text-slate-600 font-semibold">Volume (ml / L)</button>
            <button type="button" id="compModeUnit" onclick="setCompMode('unit')" class="flex-1 py-1 rounded-lg text-center transition-all text-slate-600 font-semibold">Unidades</button>
          </div>

          <div class="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
            <div class="flex items-center justify-between mb-1">
              <label for="compTargetQty" class="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                <span>🎯 Quanto você precisa levar?</span>
                <span class="text-[10px] font-normal text-amber-700">(Opcional)</span>
              </label>
              <span id="compTargetSuffix" class="text-[10px] font-bold text-amber-800">em kg</span>
            </div>
            <input type="text" id="compTargetQty" inputmode="decimal" placeholder="Ex: 2 (para 2 kg)" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none" />
          </div>

          <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Opção A (ex: pacote menor)</span>
              <span id="labelUnitBaseA" class="text-[10px] text-slate-500 font-normal">Preço por kg</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Tamanho / Peso</label>
                <div class="relative">
                  <input type="text" id="compQtyA" inputmode="decimal" placeholder="Ex: 400" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 pl-2.5 pr-7 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  <span id="compSuffixA" class="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">g</span>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Preço Unitário (R$)</label>
                <input type="text" id="compPriceA" inputmode="decimal" placeholder="Ex: 11,95" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div class="pt-1 border-t border-slate-200/60">
              <label class="flex items-center space-x-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                <input type="checkbox" id="compHasWholesaleA" onchange="toggleWholesaleSection('A')" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                <span>Tem preço de atacado</span>
              </label>
              <div id="compWholesaleBoxA" class="hidden grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-dashed border-slate-200">
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">A partir de (qtd)</label>
                  <input type="text" id="compMinWholesaleA" inputmode="numeric" placeholder="Ex: 3" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Preço no atacado (R$)</label>
                  <input type="text" id="compPriceWholesaleA" inputmode="decimal" placeholder="Ex: 10,00" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs pt-0.5">
              <span class="text-[11px] text-slate-500">Custo equivalente:</span>
              <span id="compResultUnitA" class="font-extrabold text-slate-800 text-xs">R$ 0,00 / kg</span>
            </div>
          </div>

          <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Opção B (ex: pacote maior)</span>
              <span id="labelUnitBaseB" class="text-[10px] text-slate-500 font-normal">Preço por kg</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Tamanho / Peso</label>
                <div class="relative">
                  <input type="text" id="compQtyB" inputmode="decimal" placeholder="Ex: 1000" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 pl-2.5 pr-7 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  <span id="compSuffixB" class="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">g</span>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Preço Unitário (R$)</label>
                <input type="text" id="compPriceB" inputmode="decimal" placeholder="Ex: 25,00" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div class="pt-1 border-t border-slate-200/60">
              <label class="flex items-center space-x-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                <input type="checkbox" id="compHasWholesaleB" onchange="toggleWholesaleSection('B')" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                <span>Tem preço de atacado</span>
              </label>
              <div id="compWholesaleBoxB" class="hidden grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-dashed border-slate-200">
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">A partir de (qtd)</label>
                  <input type="text" id="compMinWholesaleB" inputmode="numeric" placeholder="Ex: 3" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Preço no atacado (R$)</label>
                  <input type="text" id="compPriceWholesaleB" inputmode="decimal" placeholder="Ex: 23,00" oninput="calcularComparativoPrecos()" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs pt-0.5">
              <span class="text-[11px] text-slate-500">Custo equivalente:</span>
              <span id="compResultUnitB" class="font-extrabold text-slate-800 text-xs">R$ 0,00 / kg</span>
            </div>
          </div>

          <div id="compVerdictCard" class="p-3 rounded-xl border border-dashed border-slate-300 bg-white text-center">
            <p class="text-xs text-slate-500 font-medium">Informe os valores para comparar.</p>
          </div>

          <div class="pt-1">
            <button type="button" onclick="limparCalculadoraComparativa()" class="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer">
              <span></span><span>Limpar Dados</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  emptyState(msg) {
    return `
      <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 my-2">
        <p class="text-xs font-bold text-slate-600">${esc(msg)}</p>
      </div>`;
  },

  // 1. ESTRUTURA BASE DA ABA DADOS COM BARRA STICKY RETRÁTIL
  ensureTabDadosLayout() {
    const tabContainer = document.getElementById('tab-dados');
    if (!tabContainer) return;

    // Se o elemento não tiver o id da barra sticky, força a atualização do layout
    if (!document.getElementById('painelStickyCatalogo')) {
      tabContainer.innerHTML = `
        <div class="tab-dados-wrapper p-2 sm:p-4 space-y-3 pb-24">
          <!-- SELETOR DE SUB-ABAS -->
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

          <!-- SUB-ABA: CATÁLOGO DE PRODUTOS -->
          <section id="secao-catalogo-produtos" class="space-y-2">
            
            <div id="topoAcoesCatalogo" class="flex items-center justify-between flex-wrap gap-2 transition-all">
              <div>
                <h3 class="font-extrabold text-sm text-slate-800">Catálogo Mestre de Produtos</h3>
                <p class="text-[11px] text-slate-500">Cotações por rede e marcas vinculadas</p>
              </div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <button type="button" id="btnSyncCatalogo" onclick="sincronizarCatalogoDireto()" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer">
                  <svg id="iconSyncCatalogo" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  <span>Sincronizar</span>
                </button>
                <button type="button" onclick="abrirModalCatalogoSugerido()" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer">
                  <span>Itens Básicos</span>
                </button>
                <button type="button" onclick="openProductEditModal(null)" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-xs cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                  <span>Novo</span>
                </button>
              </div>
            </div>

            <!-- PAINEL ADESIVO COMPACTO (CSS NATIVO, SEM ESPAÇOS VAZIOS) -->
            <div id="painelStickyCatalogo" class="sticky top-0 z-30 bg-slate-100/95 backdrop-blur-md pt-1 pb-1 space-y-1.5">
              <div class="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                
                <!-- BUSCA E ORDENAÇÃO -->
                <div class="flex items-center gap-1.5">
                  <div class="relative flex-1">
                    <input type="text" id="input-busca-produtos" placeholder="Buscar por nome ou categoria..." oninput="filtrarProdutosCatalogo()" class="w-full text-xs font-medium pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
                  </div>
                  <select id="select-ordenacao-produtos" onchange="ordenarProdutosCatalogo()" class="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 outline-none cursor-pointer">
                    <option value="az">A a Z</option>
                    <option value="za">Z a A</option>
                    <option value="setor">Categoria</option>
                  </select>
                </div>

                <!-- FILTRO DE ORIGEM DINÂMICO -->
                <div class="flex items-center justify-between flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                  <div id="container-filtro-origem-dinamico" class="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold gap-0.5"></div>
                  <span id="contador-produtos-catalogo" class="text-[10px] font-semibold text-slate-400">0 produtos</span>
                </div>

                <!-- CATEGORIAS COMPACTAS -->
                <div class="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-1 text-xs">
                  <button type="button" onclick="filtrarSetorProdutos('Todas', this)" class="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] shadow-2xs cursor-pointer">Todas</button>
                  <button type="button" onclick="filtrarSetorProdutos('Açougue e Carnes', this)" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Carnes</button>
                  <button type="button" onclick="filtrarSetorProdutos('Laticínios e Frios', this)" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Frios</button>
                  <button type="button" onclick="filtrarSetorProdutos('Mercearia e Básicos', this)" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Mercearia</button>
                  <button type="button" onclick="filtrarSetorProdutos('Hortifrúti e Ovos', this)" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Hortifrúti</button>
                  <button type="button" onclick="filtrarSetorProdutos('Higiene e Limpeza', this)" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Limpeza</button>
                  <button type="button" onclick="filtrarSetorProdutos('Geral', this)" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Geral</button>
                </div>
              </div>

              <!-- BARRA DE SELEÇÃO EM LOTE -->
              <div id="barraAcoesLoteCatalogo" class="flex items-center justify-between px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2">
                  <label class="flex items-center space-x-1.5 cursor-pointer text-slate-600 font-semibold text-xs">
                    <input type="checkbox" id="checkSelectAllCatalog" onchange="toggleSelectAllCatalogProducts(this.checked)" class="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer" />
                    <span>Selecionar todos</span>
                  </label>
                  <span class="text-slate-300">•</span>
                  <span id="contadorSelecaoCatalog" class="text-[10px] font-bold text-slate-500">0 selecionados</span>
                </div>
                <button type="button" id="btnExcluirLoteCatalogo" onclick="solicitarExclusaoLoteCatalogo()" class="hidden px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer">
                  <span id="lblExcluirLoteCatalogo">Excluir</span>
                </button>
              </div>
            </div>
            <div id="area-cards-produtos" class="space-y-2 pt-1"></div>
          </section>

          <!-- SUB-ABA: SUPERMERCADOS -->
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
        </div>`;
      if (typeof configurarScrollRetratilCatalogo === 'function') {
        configurarScrollRetratilCatalogo();
      }
    }
  },

  // 2. CARD DO SUPERMERCADO
  // 2. CARD DO SUPERMERCADO
  marketCard(market) {
    const isCurrent = market.id === activeMarketId;
    
    // Identificação de origem para supermercados
    const isPlanilha = Boolean(market.inSheet || market.colIndex || (market.id && !String(market.id).startsWith('m-custom-')));
    const isDrive = Boolean(market.inDrive);

    let tagOrigemHtml = '';
    if (isPlanilha && isDrive) {
      tagOrigemHtml = '<span class="bg-purple-100 text-purple-800 text-[9px] font-bold px-2 py-0.5 rounded-md border border-purple-200">Planilha + Drive</span>';
    } else if (isPlanilha) {
      tagOrigemHtml = '<span class="bg-sky-100 text-sky-800 text-[9px] font-bold px-2 py-0.5 rounded-md border border-sky-200">Planilha</span>';
    } else if (isDrive) {
      tagOrigemHtml = '<span class="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">Drive</span>';
    } else {
      tagOrigemHtml = '<span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-md border border-amber-200">Local</span>';
    }

    return `
      <div class="bg-white rounded-2xl p-3.5 border ${isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/15 bg-emerald-50/10' : 'border-slate-200 hover:border-slate-300'} shadow-2xs transition-all my-2 flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0 cursor-pointer" onclick="selecionarMercado('${esc(market.id)}')">
          <div class="flex items-center space-x-2 flex-wrap">
            <strong class="font-extrabold text-sm text-slate-800 truncate">${esc(market.name)}</strong>
            ${isCurrent ? `<span class="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">Ativo</span>` : ''}
            ${tagOrigemHtml}
          </div>
          <p class="text-xs text-slate-500 mt-1 truncate">${esc(market.branch || 'São José dos Pinhais')}${market.promoDay ? ' • ' + esc(market.promoDay) : ''}</p>
          ${market.address ? `<p class="text-[11px] text-slate-400 mt-0.5 truncate">${esc(market.address)}</p>` : ''}
        </div>

        <div class="flex items-center space-x-1.5 shrink-0">
          ${market.address ? `
            <button type="button" onclick="abrirSupermercadoNoMaps('${esc(market.id)}', true)" class="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors cursor-pointer" title="Traçar rota no Maps">${this.icons.route}</button>` : ''}
          <button type="button" onclick="openMarketEditModal('${esc(market.id)}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer" title="Editar rede">${this.icons.edit}</button>
          ${market.id !== 'm-padrao' ? `
            <button type="button" onclick="excluirMercadoCatalogo('${esc(market.id)}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors cursor-pointer" title="Excluir rede">${this.icons.delete}</button>` : ''}
        </div>
      </div>`;
  },

  // 3. CARD DO PRODUTO (COM CHECKBOX E REALCE VERDE)
  // 3. CARD DO PRODUTO (COM CHECKBOX E REALCE VERDE)
  productCard(prod, nomeMercadoAtivo) {
    const isPlanilha = Boolean(prod.inSheet || String(prod.id).startsWith('PROD-'));
    const isDrive = Boolean(prod.inDrive);

    let tagOrigemHtml = '';
    if (isPlanilha && isDrive) {
      tagOrigemHtml = '<span class="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200">Planilha + Drive</span>';
    } else if (isPlanilha) {
      tagOrigemHtml = '<span class="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-200">Planilha</span>';
    } else if (isDrive) {
      tagOrigemHtml = '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">Drive</span>';
    } else {
      tagOrigemHtml = '<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">Local</span>';
    }
    const precoBase = Number(prod.basePrice) || (prod.marketPrices ? Number(prod.marketPrices['m-padrao']) : 0) || 0;
    const isChecked = typeof selectedCatalogProductIds !== 'undefined' && selectedCatalogProductIds.has(String(prod.id));

    let cotacaoMercado = null;
    if (activeMarketId === 'm-padrao') {
      cotacaoMercado = precoBase > 0 ? precoBase : null;
    } else if (prod.marketPrices && Number(prod.marketPrices[activeMarketId]) > 0) {
      cotacaoMercado = Number(prod.marketPrices[activeMarketId]);
    }

    const baseStr = precoBase > 0 ? `R$ ${formatBRL(precoBase)}` : 'A definir';
    const cotacaoStr = cotacaoMercado ? `R$ ${formatBRL(cotacaoMercado)}` : 'Sem cotação';
    const qtdMarcas = Array.isArray(prod.brands) ? prod.brands.length : 0;

    const classesDestaque = isChecked
      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm'
      : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300';

    return `
      <div id="card-prod-${esc(prod.id)}" class="rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 my-2 ${classesDestaque}">
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <input type="checkbox" 
                 ${isChecked ? 'checked' : ''} 
                 onchange="toggleSelectCatalogProduct('${esc(prod.id)}', this.checked)" 
                 class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-2 flex-wrap">
              <strong class="font-extrabold text-sm text-slate-800 truncate">${esc(prod.name)}</strong>
              ${tagOrigemHtml}
              <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md border border-slate-200/60">${esc(prod.category || 'Geral')}</span>
              <span class="text-[10px] text-slate-400 font-semibold">${esc(prod.unit || 'un')}</span>
              ${qtdMarcas > 0 ? `<span class="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">+${qtdMarcas} marca${qtdMarcas > 1 ? 's' : ''}</span>` : ''}
            </div>
            <div class="text-xs text-slate-500 mt-1 truncate">
              Base: <span class="font-bold text-slate-700">${baseStr}</span> • 
              No ${esc(nomeMercadoAtivo)}: <span class="font-bold ${cotacaoMercado ? 'text-emerald-700' : 'text-slate-400'}">${cotacaoStr}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-1.5 shrink-0">
          <button type="button" onclick="openProductEditModal('${esc(prod.id)}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer" title="Editar produto">${this.icons.edit}</button>
          <button type="button" onclick="askDeleteSingleProduct('${esc(prod.id)}')" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors cursor-pointer" title="Excluir produto">${this.icons.delete}</button>
          <button type="button" onclick="quickAddToCartFromCatalog('${esc(prod.id)}')" class="p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all shadow-xs cursor-pointer" title="Adicionar ao carrinho">${this.icons.add}</button>
        </div>
      </div>`;
  },

  renderCatalog() {
    this.ensureTabDadosLayout();

    // Renderiza os botões dinâmicos ocultando os que não possuem produtos
    if (typeof renderizarBotoesFiltroOrigem === 'function') {
      renderizarBotoesFiltroOrigem();
    }

    const badgeTotal = document.getElementById('badge-total-produtos');
    const badgeMercados = document.getElementById('badge-total-mercados');
    const contadorExibicao = document.getElementById('contador-produtos-catalogo');

    const listaTotal = Array.isArray(products) ? products : [];
    const listaMercados = Array.isArray(supermarkets) ? supermarkets : [];

    if (badgeTotal) badgeTotal.textContent = listaTotal.length;
    if (badgeMercados) badgeMercados.textContent = listaMercados.length;

    const container = document.getElementById('area-cards-produtos');
    if (!container) return;

    const visiveis = typeof obterListaProdutosFiltrada === 'function' ? obterListaProdutosFiltrada() : listaTotal;

    if (contadorExibicao) {
      contadorExibicao.textContent = `Exibindo ${visiveis.length} de ${listaTotal.length} produto${listaTotal.length === 1 ? '' : 's'}`;
    }

    if (visiveis.length === 0) {
      container.innerHTML = this.emptyState('Nenhum produto encontrado com os filtros atuais.');
    } else {
      const nomeMercadoAtivo = typeof getSelectedMarketName === 'function' ? getSelectedMarketName() : 'Mercado';
      container.innerHTML = visiveis.map(prod => this.productCard(prod, nomeMercadoAtivo)).join('');
    }

    if (typeof atualizarEstadoBarraLoteCatalogo === 'function') {
      atualizarEstadoBarraLoteCatalogo();
    }
  },

  renderMarkets() {
    this.ensureTabDadosLayout();

    const badgeMercados = document.getElementById('badge-total-mercados');
    const lista = Array.isArray(supermarkets) ? supermarkets : [];

    if (badgeMercados) badgeMercados.textContent = lista.length;

    const container = document.getElementById('area-cards-mercados');
    if (!container) return;

    if (lista.length === 0) {
      container.innerHTML = this.emptyState('Nenhum supermercado cadastrado.');
      return;
    }

    container.innerHTML = lista.map(m => this.marketCard(m)).join('');
  },

  // 4. CARRINHO DE COMPRAS
  cartItemCard(item, calc) {
    const isChecked = Boolean(item.checked);
    return `
      <div class="bg-white rounded-2xl p-3.5 border ${isChecked ? 'border-emerald-200 bg-emerald-50/40 opacity-75' : 'border-slate-200 shadow-2xs hover:border-slate-300'} transition-all my-2">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <button type="button" onclick="toggleCartItemCheck('${esc(item.id)}')" class="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-300'}">
              <span class="${isChecked ? 'block' : 'hidden'}">${this.icons.check}</span>
            </button>
            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-1.5 flex-wrap">
                <h4 class="font-extrabold text-sm text-slate-800 truncate ${isChecked ? 'line-through text-slate-400' : ''}">${esc(item.name)}</h4>
                <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${esc(item.unit || 'un')}</span>
                <span class="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">${esc(item.selectedBrandId || 'Padrão')}</span>
              </div>
              <div class="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                <span>${formatQty(item.quantity)} ${esc(item.unit)} × R$ ${formatBRL(item.unitPrice)}</span>
                ${calc.badgeText ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded">${esc(calc.badgeText)}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2 shrink-0">
            <div class="text-right mr-1">
              <div class="text-sm font-black text-slate-900 leading-tight">R$ ${formatBRL(calc.finalSubtotal || 0)}</div>
              ${calc.savings > 0 ? `<div class="text-[10px] font-bold text-emerald-600">-R$ ${formatBRL(calc.savings)}</div>` : ''}
            </div>
            <div class="flex items-center bg-slate-100 rounded-xl p-0.5">
              <button type="button" onclick="stepCartQty('${esc(item.id)}', -1)" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs cursor-pointer">-</button>
              <button type="button" onclick="stepCartQty('${esc(item.id)}', 1)" class="w-6 h-6 font-bold text-slate-600 hover:text-slate-900 text-xs cursor-pointer">+</button>
            </div>
            <button type="button" onclick="openEditCartItemModal('${esc(item.id)}')" class="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="Editar item">${this.icons.edit}</button>
            <button type="button" onclick="removeCartItem('${esc(item.id)}')" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Remover item">${this.icons.delete}</button>
          </div>
        </div>
      </div>`;
  },

  renderCart() {
    const q = (document.getElementById('cartSearchFilter')?.value || '').toLowerCase().trim();
    const totalItems = (cart || []).length;
    const checkedItems = (cart || []).filter(i => i.checked).length;
    const pendingItems = totalItems - checkedItems;

    ['cartBadgeAll', 'navCartBadgeCount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = totalItems;
    });
    if (document.getElementById('cartBadgePending')) document.getElementById('cartBadgePending').innerText = pendingItems;
    if (document.getElementById('cartBadgeChecked')) document.getElementById('cartBadgeChecked').innerText = checkedItems;

    const displayList = (cart || []).filter(item => {
      if (cartFilterMode === 'pending' && item.checked) return false;
      if (cartFilterMode === 'checked' && !item.checked) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const container = document.getElementById('cartItemsContainer');
    const emptyCard = document.getElementById('cartEmptyCard');
    if (!container || !emptyCard) return;

    if (totalItems === 0) {
      container.innerHTML = '';
      emptyCard.classList.remove('hidden');
    } else {
      emptyCard.classList.add('hidden');
      if (displayList.length === 0) {
        container.innerHTML = this.emptyState('Nenhum item encontrado no filtro.');
      } else {
        container.innerHTML = displayList.map(item => {
          const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
          return this.cartItemCard(item, calc);
        }).join('');
      }
    }
    

    if (typeof updateCartTotals === 'function') {
      updateCartTotals(totalItems, checkedItems);
    }
  },
  

  renderCartAutocomplete(matches) {
    const dropdownProd = document.getElementById('cartAutocompleteDropdown');
    if (!dropdownProd) return;

    if (!matches || matches.length === 0) {
      dropdownProd.classList.add('hidden');
      dropdownProd.innerHTML = '';
      return;
    }

    dropdownProd.innerHTML = `
      <div class="p-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
        <span>Sugestões no Catálogo:</span>
        <button type="button" onclick="document.getElementById('cartAutocompleteDropdown').classList.add('hidden')" class="text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded">✕</button>
      </div>
    ` + matches.map(p => {
      const pPrice = obterPrecoProdutoMarcaMercado(p, 'Padrão', activeMarketId) || p.basePrice;
      return `
        <div class="px-3.5 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer flex items-center justify-between text-xs transition-colors" onclick="selectProductForCart('${esc(p.id)}')">
          <div class="min-w-0 pr-2">
            <span class="font-bold text-slate-800 block truncate">${esc(p.name)}</span>
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${esc(p.category || 'Geral')}</span>
          </div>
          <div class="text-right text-emerald-700 font-black shrink-0">
            ${pPrice > 0 ? 'R$ ' + formatBRL(pPrice) : 'A cotar'}
            <span class="text-[10px] text-slate-500 font-normal"> / ${esc(p.unit || 'un')}</span>
          </div>
        </div>`;
    }).join('');
    dropdownProd.classList.remove('hidden');
  },

  // 5. HISTÓRICO DE COMPRAS
  renderHistory() {
    const container = document.getElementById('historicoListaContainer');
    const emptyState = document.getElementById('historicoVazioContainer');
    const barraSelecao = document.getElementById('barraSelecaoHistorico');
    if (!container) return;

    const historico = typeof obterHistoricoLocal === 'function' ? obterHistoricoLocal() : [];
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    const comprasMes = historico.filter(h => {
      const rawData = h.date || h.dataISO || h.data;
      if (!rawData) return false;
      const d = new Date(rawData);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });

    const totalMes = comprasMes.reduce((acc, cur) => acc + (Number(cur.total) || 0), 0);
    const totalGeral = historico.reduce((acc, cur) => acc + (Number(cur.total) || 0), 0);
    const mediaCompra = historico.length > 0 ? (totalGeral / historico.length) : 0;

    const elTotalMes = document.getElementById('histMetricaGastoMes');
    const elMedia = document.getElementById('histMetricaMediaCompra');
    const elQtd = document.getElementById('histMetricaQtdCompras');

    if (elTotalMes) elTotalMes.innerText = 'R$ ' + formatBRL(totalMes);
    if (elMedia) elMedia.innerText = 'R$ ' + formatBRL(mediaCompra);
    if (elQtd) elQtd.innerText = `${historico.length} compra${historico.length === 1 ? '' : 's'}`;

    const idsValidos = new Set(historico.map((c, i) => obterIdCompra(c, i)));
    selectedHistoryIds.forEach(id => {
      if (!idsValidos.has(id)) selectedHistoryIds.delete(id);
    });

    if (historico.length === 0) {
      container.innerHTML = '';
      emptyState?.classList.remove('hidden');
      barraSelecao?.classList.add('hidden');
      if (typeof atualizarBarraSelecaoHistorico === 'function') atualizarBarraSelecaoHistorico();
      return;
    }

    emptyState?.classList.add('hidden');
    barraSelecao?.classList.remove('hidden');

    container.innerHTML = historico.map((compra, idx) => {
      const compraId = obterIdCompra(compra, idx);
      const isChecked = selectedHistoryIds.has(compraId);
      const rawData = compra.date || compra.dataISO || compra.data;
      const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Data recente';

      const mercadoNome = resolverNomeMercado(compra);
      const valorTotal = formatBRL(compra.total || 0);
      const itens = compra.items || compra.itens || [];
      const qtdItens = itens.length || compra.itemCount || 1;
      const economia = Number(compra.savings) || 0;

      return `
    <div class="p-3.5 rounded-2xl border transition-all ${isChecked ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 shadow-2xs space-y-2.5"}">
      
      <!-- LINHA SUPERIOR: CHECKBOX, MERCADO, DATA E TOTAL -->
      <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60 gap-2">
        <div class="flex items-center space-x-2.5 min-w-0 flex-1">
          <input type="checkbox" 
                 ${isChecked ? "checked" : ""} 
                 onchange="toggleSelectHistoryItem('${esc(compraId)}', this.checked)" 
                 class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer">
          <div class="min-w-0 truncate cursor-pointer" onclick="abrirDetalhesCompraHistorico(${idx})">
            <strong class="text-xs font-black text-slate-800 dark:text-slate-100 block truncate">${esc(mercadoNome)}</strong>
            <span class="text-[10px] text-slate-400 block">${esc(dataFormatada)}</span>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="text-sm font-black text-emerald-600 dark:text-emerald-400 block leading-tight">R$ ${valorTotal}</span>
          ${economia > 0 ? `<span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">Econ. R$ ${formatBRL(economia)}</span>` : ""}
        </div>
      </div>

      <!-- LINHA INFERIOR: QUANTIDADE DE ITENS E BOTÕES DE AÇÃO -->
      <div class="flex items-center justify-between pt-1 text-xs">
        <span class="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">${qtdItens} produto${qtdItens === 1 ? '' : 's'}</span>
        
        <div class="flex items-center space-x-1.5">
          <!-- VER ITENS -->
          <button type="button" 
                  onclick="abrirDetalhesCompraHistorico(${idx})" 
                  class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer">
            Ver Itens
          </button>

          <!-- REPETIR -->
          <button type="button" 
                  onclick="restaurarCompraParaCarrinho(${idx})" 
                  class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-xs font-bold rounded-lg transition-all cursor-pointer">
            Repetir
          </button>

          <!-- COMPARADOR -->
          <button type="button" 
                  onclick="abrirModalComparadorHistorico(${idx})" 
                  class="px-2.5 py-1 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center space-x-1 active:scale-95 transition-all cursor-pointer" 
                  title="Comparar preço desta compra com os preços atuais e lista ativa">
            <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
            </svg>
            <span>Comparar</span>
          </button>

          <!-- APAGAR -->
          <button type="button" 
                  onclick="excluirCompraHistorico(${idx})" 
                  class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer" 
                  title="Excluir Registro">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>

    </div>
    `;
    }).join('');

    if (typeof atualizarBarraSelecaoHistorico === 'function') atualizarBarraSelecaoHistorico();
  },

  // 6. MODAL DINÂMICO DE PRODUTO
  renderProductEditModal(prod) {
    document.querySelectorAll('#modalProductEditDynamic').forEach(el => el.remove());

    const nome = prod ? prod.name : '';
    const cat = prod ? (prod.category || 'Geral') : 'Geral';
    const unit = prod ? (prod.unit || 'un') : 'un';

    const modalContainer = document.createElement('div');
    modalContainer.id = 'modalProductEditDynamic';
    modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs';
    modalContainer.onclick = function(e) {
      if (e.target === this) closeProductEditModal();
    };

    modalContainer.innerHTML = `
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative" style="max-height: 90vh;">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <h3 class="font-extrabold text-slate-800 text-base">${prod ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button type="button" onclick="closeProductEditModal()" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">${this.icons.close}</button>
        </div>

        <form id="formProductEditModal" onsubmit="salvarEdicaoProdutoForm(event)" class="flex flex-col flex-1 overflow-hidden space-y-3.5 pt-3">
          <div class="space-y-3 overflow-y-auto flex-1 pr-1">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Nome do Produto *</label>
              <input type="text" id="prodModalInputName" value="${esc(nome)}" required class="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Setor / Categoria</label>
                <select id="prodModalInputCat" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
                  <option value="Mercearia e Básicos" ${cat === 'Mercearia e Básicos' ? 'selected' : ''}>Mercearia e Básicos</option>
                  <option value="Açougue e Carnes" ${cat === 'Açougue e Carnes' ? 'selected' : ''}>Açougue e Carnes</option>
                  <option value="Laticínios e Frios" ${cat === 'Laticínios e Frios' ? 'selected' : ''}>Laticínios e Frios</option>
                  <option value="Hortifrúti e Ovos" ${cat === 'Hortifrúti e Ovos' ? 'selected' : ''}>Hortifrúti e Ovos</option>
                  <option value="Higiene e Limpeza" ${cat === 'Higiene e Limpeza' ? 'selected' : ''}>Higiene e Limpeza</option>
                  <option value="Geral" ${cat === 'Geral' ? 'selected' : ''}>Geral</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Unidade</label>
                <select id="prodModalInputUnit" class="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
                  <option value="un" ${unit === 'un' ? 'selected' : ''}>un (Unidade)</option>
                  <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg (Quilo)</option>
                  <option value="g" ${unit === 'g' ? 'selected' : ''}>g (Grama)</option>
                  <option value="l" ${unit === 'l' ? 'selected' : ''}>l (Litro)</option>
                  <option value="ml" ${unit === 'ml' ? 'selected' : ''}>ml (Mililitro)</option>
                  <option value="cx" ${unit === 'cx' ? 'selected' : ''}>cx (Caixa)</option>
                  <option value="pct" ${unit === 'pct' ? 'selected' : ''}>pct (Pacote)</option>
                  <option value="dz" ${unit === 'dz' ? 'selected' : ''}>dz (Dúzia)</option>
                </select>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-extrabold text-slate-800">Marca do Produto</label>
                <span class="text-[10px] text-slate-400">Selecione para cotar</span>
              </div>
              <div id="prodModalBrandsContainer"></div>
              <div id="containerNovaMarcaInline" class="hidden flex items-center space-x-2 pt-1">
                <input type="text" id="inputNovaMarcaCatalogo" placeholder="Nome da nova marca..." oninput="textoNovaMarcaEmEdicao = this.value" onkeydown="if(event.key === 'Enter'){ event.preventDefault(); adicionarMarcaInlineModal(); }" class="flex-1 text-xs font-bold text-slate-800 bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
                <button type="button" onclick="adicionarMarcaInlineModal()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0">+ Adicionar</button>
              </div>
            </div>

            <div class="pt-2.5 border-t border-slate-100 space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-extrabold text-slate-800 block">Cotações por Rede</span>
                  <span class="text-[10px] text-slate-500">Marca ativa: <strong id="labelMarcaAtivaCotacoes" class="text-emerald-700">${esc(currentCompareBrand)}</strong></span>
                </div>
                <button type="button" id="btnToggleMinimizarRedes" onclick="alternarMinimizarRedesModal()" class="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-1 shadow-2xs cursor-pointer">
                  <span id="labelToggleMinimizarRedes">${redesComparativoMinimizado ? 'Ver Todas as Redes' : 'Apenas Ativa e Base'}</span>
                </button>
              </div>
              <div id="prodModalPriceList" class="space-y-1.5 pt-1"></div>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-3 flex items-center justify-end space-x-2 shrink-0 bg-white">
            <button type="button" onclick="closeProductEditModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">Salvar Produto</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(modalContainer);
  },

  // 7. MODAL DINÂMICO DE SUPERMERCADO
  renderMarketEditModal(mercado) {
    document.querySelectorAll('#modalMarketEditDynamic').forEach(el => el.remove());

    const modalHtml = `
      <div id="modalMarketEditDynamic" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" onclick="if(event.target === this) closeMarketEditModal();">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200 flex flex-col relative">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="font-extrabold text-slate-800 text-base">${mercado ? 'Editar Supermercado' : 'Novo Supermercado'}</h3>
            <button type="button" onclick="closeMarketEditModal()" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">${this.icons.close}</button>
          </div>

          <form id="formSaveMarketDynamic" onsubmit="salvarSupermercadoSubmit(event)" class="space-y-3 pt-3">
            <input type="hidden" id="dinMarketId" value="${esc(mercado ? mercado.id : '')}">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Nome da Rede *</label>
              <input type="text" id="dinMarketName" value="${esc(mercado ? mercado.name : '')}" required placeholder="Ex: Supermercados Goes" class="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Filial / Bairro</label>
              <input type="text" id="dinMarketBranch" value="${esc(mercado ? (mercado.branch || '') : '')}" placeholder="Ex: Afonso Pena" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Endereço Completo</label>
              <input type="text" id="dinMarketAddress" value="${esc(mercado ? (mercado.address || '') : '')}" placeholder="Ex: Av. Rui Barbosa, 1230" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Dias de Promoção / Encarte</label>
              <input type="text" id="dinMarketPromoDay" value="${esc(mercado ? (mercado.promoDay || '') : '')}" placeholder="Ex: Terça e Quarta da Carne" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
            </div>

            <div class="border-t border-slate-100 pt-3 flex items-center justify-end space-x-2 bg-white">
              <button type="button" onclick="closeMarketEditModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">Cancelar</button>
              <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">Salvar Supermercado</button>
            </div>
          </form>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => document.getElementById('dinMarketName')?.focus(), 50);
  }
};

window.renderCatalogUI = () => window.AppTemplates.renderCatalog();
window.renderMarketsUI = () => window.AppTemplates.renderMarkets();
window.renderCartUI = () => {
  window.AppTemplates.renderCart();
  if (typeof analisarMelhorMercado === 'function') {
    analisarMelhorMercado();
  }
};
window.renderHistoricoUI = () => window.AppTemplates.renderHistory();
window.renderHistoryUI = function() {
  const container = document.getElementById('historyListContainer') || document.querySelector('[id*="histList"]') || document.querySelector('#history-list');
  if (!container || !window.AppTemplates || typeof window.AppTemplates.renderHistory !== 'function') return;

  const lista = (typeof purchaseHistory !== 'undefined' && Array.isArray(purchaseHistory))
    ? purchaseHistory
    : JSON.parse(localStorage.getItem('supercompras_history') || '[]');

  const html = window.AppTemplates.renderHistory(lista);
  if (typeof html === 'string') {
    container.innerHTML = html;
  }
};
window.renderHistoricoUI = function() {
  const container = document.getElementById('historyListContainer') || document.querySelector('[id*="histList"]');
  if (!container || !window.AppTemplates || typeof window.AppTemplates.renderHistory !== 'function') return;

  const lista = (typeof purchaseHistory !== 'undefined' && Array.isArray(purchaseHistory))
    ? purchaseHistory
    : JSON.parse(localStorage.getItem('supercompras_history') || '[]');

  const html = window.AppTemplates.renderHistory(lista);
  if (typeof html === 'string') {
    container.innerHTML = html;
  }
};
// Compatibilidade caso algum ponto chame sem o 'o'
window.renderHistoryUI = window.renderHistoricoUI;