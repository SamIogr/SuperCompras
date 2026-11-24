/**
 * SUPERCOMPRAS PRO - CATÁLOGO: ESTRUTURA DA ABA, CARDS E LISTAS DE PRODUTOS E MERCADOS (js/telas/catalogo/layout.js)
 */

Object.assign(window.AppTemplates, {
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
            <button type="button" id="btn-subtab-produtos" data-acao="catalogo-subaba" data-aba="produtos" class="flex-1 py-2 px-3 rounded-xl bg-white text-slate-800 shadow-xs text-center transition-all flex items-center justify-center space-x-2 font-bold text-xs cursor-pointer">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              <span>Produtos (<span id="badge-total-produtos">0</span>)</span>
            </button>
            <button type="button" id="btn-subtab-mercados" data-acao="catalogo-subaba" data-aba="mercados" class="flex-1 py-2 px-3 rounded-xl text-slate-600 hover:text-slate-800 text-center transition-all flex items-center justify-center space-x-2 font-semibold text-xs cursor-pointer">
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
                <button type="button" id="btnSyncCatalogo" data-acao="catalogo-sincronizar-planilha" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer">
                  <svg id="iconSyncCatalogo" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  <span>Sincronizar</span>
                </button>
                <button type="button" data-acao="sugeridos-abrir" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer">
                  <span>Itens Básicos</span>
                </button>
                <button type="button" data-acao="produto-novo" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-xs cursor-pointer">
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
                    <input type="text" id="input-busca-produtos" placeholder="Buscar por nome ou categoria..." data-acao="catalogo-busca" class="w-full text-xs font-medium pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500">
                  </div>
                  <select id="select-ordenacao-produtos" data-acao="catalogo-ordenar" class="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 outline-none cursor-pointer">
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
                  <button type="button" data-acao="catalogo-setor" data-setor="Todas" class="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] shadow-2xs cursor-pointer">Todas</button>
                  <button type="button" data-acao="catalogo-setor" data-setor="Açougue e Carnes" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Carnes</button>
                  <button type="button" data-acao="catalogo-setor" data-setor="Laticínios e Frios" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Frios</button>
                  <button type="button" data-acao="catalogo-setor" data-setor="Mercearia e Básicos" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Mercearia</button>
                  <button type="button" data-acao="catalogo-setor" data-setor="Hortifrúti e Ovos" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Hortifrúti</button>
                  <button type="button" data-acao="catalogo-setor" data-setor="Higiene e Limpeza" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Limpeza</button>
                  <button type="button" data-acao="catalogo-setor" data-setor="Geral" class="px-2 py-0.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 text-[11px] cursor-pointer">Geral</button>
                </div>
              </div>

              <!-- BARRA DE SELEÇÃO EM LOTE -->
              <div id="barraAcoesLoteCatalogo" class="flex items-center justify-between px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2">
                  <label class="flex items-center space-x-1.5 cursor-pointer text-slate-600 font-semibold text-xs">
                    <input type="checkbox" id="checkSelectAllCatalog" data-acao="catalogo-selecionar-todos" class="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer" />
                    <span>Selecionar todos</span>
                  </label>
                  <span class="text-slate-300">•</span>
                  <span id="contadorSelecaoCatalog" class="text-[10px] font-bold text-slate-500">0 selecionados</span>
                </div>
                <button type="button" id="btnExcluirLoteCatalogo" data-acao="catalogo-excluir-lote" class="hidden px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer">
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
              <button type="button" data-acao="mercado-novo" class="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                <span>Novo Supermercado</span>
              </button>
            </div>
            <!-- FILTRO DE ORIGEM DOS MERCADOS (igual ao do catálogo) -->
            <div class="flex items-center justify-between flex-wrap gap-1.5">
              <div id="container-filtro-origem-mercados" class="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold gap-0.5"></div>
              <span id="contador-mercados" class="text-[10px] font-semibold text-slate-400">0 mercados</span>
            </div>
            <div id="area-cards-mercados" class="space-y-2 pt-1"></div>
          </section>
        </div>`;
    }
  },

  // 2. CARD DO SUPERMERCADO
  marketCard(market) {
    const isCurrent = market.id === activeMarketId;
    const origem = obterOrigem('mercados', market);
    const tagOrigemHtml = seloOrigemHtml(origem, 'text-[9px]');
    // mercado criado no aparelho pode ser enviado para a planilha (só administrador)
    const podeEnviarPlanilha = (origem === 'local' || origem === 'drive') && typeof scEhAdmin === 'function' && scEhAdmin();

    return `
      <div class="bg-white rounded-2xl p-3.5 border ${isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/15 bg-emerald-50/10' : 'border-slate-200 hover:border-slate-300'} shadow-2xs transition-all my-2 flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0 cursor-pointer" data-acao="mercado-selecionar" data-id="${esc(market.id)}">
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
            <button type="button" data-acao="mercado-rota" data-id="${esc(market.id)}" class="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition-colors cursor-pointer" title="Traçar rota no Maps">${this.icons.route}</button>` : ''}
          ${podeEnviarPlanilha ? `
            <button type="button" data-acao="mercado-planilha" data-admin-only data-id="${esc(market.id)}" class="p-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl transition-colors cursor-pointer" title="Enviar este mercado para a planilha">${this.icons.upload}</button>` : ''}
          <button type="button" data-acao="mercado-editar" data-id="${esc(market.id)}" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer" title="Editar rede">${this.icons.edit}</button>
          ${market.id !== 'm-padrao' ? `
            <button type="button" data-acao="mercado-excluir" data-id="${esc(market.id)}" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors cursor-pointer" title="Excluir rede">${this.icons.delete}</button>` : ''}
        </div>
      </div>`;
  },

  // 3. CARD DO PRODUTO (COM CHECKBOX E REALCE VERDE)
  productCard(prod, nomeMercadoAtivo) {
    const tagOrigemHtml = seloOrigemHtml(obterOrigem('produtos', prod), 'text-[10px]');
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
                 data-acao="produto-marcar" data-id="${esc(prod.id)}" 
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
          <button type="button" data-acao="produto-editar" data-id="${esc(prod.id)}" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer" title="Editar produto">${this.icons.edit}</button>
          <button type="button" data-acao="produto-excluir" data-id="${esc(prod.id)}" class="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors cursor-pointer" title="Excluir produto">${this.icons.delete}</button>
          <button type="button" data-acao="produto-adicionar" data-id="${esc(prod.id)}" class="p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all shadow-xs cursor-pointer" title="Adicionar ao carrinho">${this.icons.add}</button>
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

    const contagens = contarOrigens('mercados', lista);
    mercadosOrigemFiltro = filtroOrigemValido(mercadosOrigemFiltro, contagens);
    const filtro = document.getElementById('container-filtro-origem-mercados');
    if (filtro) filtro.innerHTML = botoesFiltroOrigemHtml('mercados', contagens, mercadosOrigemFiltro);

    const visiveis = mercadosOrigemFiltro === 'todos'
      ? lista
      : lista.filter(m => obterOrigem('mercados', m) === mercadosOrigemFiltro);
    const contador = document.getElementById('contador-mercados');
    if (contador) contador.textContent = visiveis.length + (visiveis.length === 1 ? ' mercado' : ' mercados');

    container.innerHTML = visiveis.length
      ? visiveis.map(m => this.marketCard(m)).join('')
      : this.emptyState('Nenhum supermercado com esta origem.');
  },
});

window.renderCatalogUI = () => window.AppTemplates.renderCatalog();
window.renderMarketsUI = () => window.AppTemplates.renderMarkets();

function setSubTabDados(subTab = 'produtos') {
  const targetTab = subTab || 'produtos';
  window.currentSubTabDados = targetTab;

  // Busca compatível tanto com 'secao-catalogo-*' quanto com 'subtab-*'
  const tabProdutos = document.getElementById('secao-catalogo-produtos') || document.getElementById('subtab-produtos');
  const tabMercados = document.getElementById('secao-catalogo-mercados') || document.getElementById('subtab-mercados');
  const btnProdutos = document.getElementById('btn-subtab-produtos');
  const btnMercados = document.getElementById('btn-subtab-mercados');

  const classeBase = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer';
  const classeAtiva = `${classeBase} bg-white text-emerald-800 shadow-xs`;
  const classeInativa = `${classeBase} text-slate-500 hover:text-slate-700 hover:bg-white/40`;

  if (targetTab === 'produtos') {
    if (tabProdutos) tabProdutos.classList.remove('hidden');
    if (tabMercados) tabMercados.classList.add('hidden');
    if (btnProdutos) btnProdutos.className = classeAtiva;
    if (btnMercados) btnMercados.className = classeInativa;
    if (typeof renderCatalogUI === 'function') renderCatalogUI();
  } else {
    if (tabProdutos) tabProdutos.classList.add('hidden');
    if (tabMercados) tabMercados.classList.remove('hidden');
    if (btnMercados) btnMercados.className = classeAtiva;
    if (btnProdutos) btnProdutos.className = classeInativa;
    if (typeof renderMarketsUI === 'function') renderMarketsUI();
  }
}
window.setSubTabDados = setSubTabDados;
