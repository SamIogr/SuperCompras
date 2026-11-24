/**
 * SUPERCOMPRAS PRO - CATÁLOGO: AÇÕES DOS BOTÕES E CAMPOS (delegação, ver js/ui/acoes.js) (js/telas/catalogo/acoes.js)
 */

Acoes.registrarClique({
  // abas e barra do catálogo
  'catalogo-subaba':                  el => setSubTabDados(el.dataset.aba),
  'catalogo-setor':                   el => filtrarSetorProdutos(el.dataset.setor, el),
  'catalogo-excluir-lote':            () => solicitarExclusaoLoteCatalogo(),
  'catalogo-sincronizar-planilha':    () => sincronizarCatalogoDireto(),
  'filtro-origem':                    el => (el.dataset.alvo === 'mercados'
                                          ? filtrarOrigemMercados(el.dataset.origem)
                                          : filtrarOrigemProdutos(el.dataset.origem)),
  // cards de produto
  'produto-novo':                     () => openProductEditModal(null),
  'produto-editar':                   el => openProductEditModal(el.dataset.id),
  'produto-excluir':                  el => askDeleteSingleProduct(el.dataset.id),
  'produto-adicionar':                el => quickAddToCartFromCatalog(el.dataset.id),
  // modal do produto
  'produto-modal-fechar':             () => closeProductEditModal(),
  'produto-modal-nova-marca-adicionar': () => adicionarMarcaInlineModal(),
  'produto-modal-marca-excluir':      el => excluirMarcaModalEdicao(el.dataset.marca),
  'produto-modal-redes-minimizar':    () => alternarMinimizarRedesModal(),
  // itens sugeridos
  'sugeridos-abrir':                  () => abrirModalCatalogoSugerido(),
  'sugeridos-fechar':                 () => fecharModalCatalogoSugerido(),
  'sugeridos-marcar-todos':           el => toggleSelectAllSugeridos(el.dataset.marcar === '1'),
  'sugeridos-adicionar':              () => adicionarItensSugeridosSelecionados(),
  // supermercados
  'mercado-novo':                     () => openMarketEditModal(null),
  'mercado-selecionar':               el => selecionarMercado(el.dataset.id),
  'mercado-rota':                     el => abrirSupermercadoNoMaps(el.dataset.id, true),
  'mercado-editar':                   el => openMarketEditModal(el.dataset.id),
  'mercado-excluir':                  el => excluirMercadoCatalogo(el.dataset.id),
  'mercado-planilha':                 el => enviarMercadoParaPlanilha(el.dataset.id),
  'mercado-modal-fundo':              noProprioElemento(() => closeMarketEditModal()),
  'mercado-modal-fechar':             () => closeMarketEditModal(),
});

Acoes.registrarMudanca({
  'catalogo-ordenar':                 () => ordenarProdutosCatalogo(),
  'catalogo-selecionar-todos':        el => toggleSelectAllCatalogProducts(el.checked),
  'produto-marcar':                   el => toggleSelectCatalogProduct(el.dataset.id, el.checked),
  'produto-modal-marca':              el => aoMudarSelectMarcaModal(el.value),
  'produto-modal-preco-mercado':      el => salvarPrecoDiretoModal(el.dataset.id, el.value),
  'sugeridos-contar':                 () => atualizarContadorModalSugeridos(),
});

Acoes.registrarDigitacao({
  'catalogo-busca':                   () => filtrarProdutosCatalogo(),
  'produto-modal-nova-marca':         el => { textoNovaMarcaEmEdicao = el.value; },
});

Acoes.registrarTecla({
  // Enter no campo "nova marca" adiciona a marca em vez de enviar o formulário do produto
  'produto-modal-nova-marca':         (el, e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarMarcaInlineModal(); } },
});

Acoes.registrarEnvio({
  'produto-modal-salvar':             (el, e) => salvarEdicaoProdutoForm(e),
  'mercado-modal-salvar':             (el, e) => salvarSupermercadoSubmit(e),
});
