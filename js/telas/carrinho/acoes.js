/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CARRINHO: AÇÕES DOS BOTÕES E CAMPOS (delegação, ver js/ui/acoes.js) (js/telas/carrinho/acoes.js)
 */

import { Acoes, noProprioElemento } from '../../ui/acoes.js';
import { abrirSupermercadoNoMaps } from '../../ui.js';
import { closeExportOptionsModal, openExportOptionsModal } from '../../io.js';
import { removeCartItem, setCartFilterMode, stepCartQty, toggleCartItemCheck } from './lista.js';
import { abrirSheetAdicionarItem, aoMudarSelectMarcaInline, atualizarAtalhosQuantidade, cancelarNovaMarcaInline, confirmarNovaMarcaInline, fecharSheetAdicionarItem, selectProductForCart, setCartPromoMode, setCartQuickQty, updateCartItemPreview } from './formulario.js';
import { atualizarAtalhosEdicao, atualizarSubtotalModalEdicao, cancelarNovaMarcaModalEdicao, closeEditCartItemModal, confirmarNovaMarcaModalEdicao, openEditCartItemModal, salvarEdicaoItemCarrinho, setEditPromoType, setEditQty } from './edicao.js';
import { askClearCart, askFinishPurchase, compartilharCarrinhoWhatsApp } from './finalizacao.js';
import { abrirGuiaComparativoMercados, fecharGuiaComparativoMercados, trocarMercadoPelaGuia } from './comparativo.js';

Acoes.registrarClique({
  // janela "Exportar / compartilhar" (js/io.js registra as outras opções)
  'exportar-whatsapp':              () => { compartilharCarrinhoWhatsApp(); closeExportOptionsModal(); },
  // itens da lista (cards montados em templates.js)
  'carrinho-marcar':                el => toggleCartItemCheck(el.dataset.id),
  'carrinho-qtd':                   el => stepCartQty(el.dataset.id, Number(el.dataset.passo)),
  'carrinho-editar':                el => openEditCartItemModal(el.dataset.id),
  'carrinho-remover':               el => removeCartItem(el.dataset.id),
  'carrinho-filtro':                el => setCartFilterMode(el.dataset.filtro),
  // rodapé e cabeçalho da tela
  'carrinho-limpar':                () => askClearCart(),
  'carrinho-finalizar':             () => askFinishPurchase(),
  'carrinho-exportar':              () => openExportOptionsModal(),
  'carrinho-rota-mercado-ativo':    () => abrirSupermercadoNoMaps(activeMarketId, true),
  // gaveta "adicionar item"
  'carrinho-form-abrir':            () => abrirSheetAdicionarItem(),
  'carrinho-form-fechar':           () => fecharSheetAdicionarItem(),
  'carrinho-form-promo':            el => setCartPromoMode(el.dataset.modo),
  'carrinho-form-marca-confirmar':  () => confirmarNovaMarcaInline(),
  'carrinho-form-marca-cancelar':   () => cancelarNovaMarcaInline(),
  'carrinho-qtd-rapida':            el => setCartQuickQty(el.dataset.qtd),
  'sugestao-escolher':              el => selectProductForCart(el.dataset.id),
  'carrinho-sugestoes-fechar':      () => document.getElementById('cartAutocompleteDropdown')?.classList.add('hidden'),
  // modal de edição de item
  'carrinho-edicao-fechar':         () => closeEditCartItemModal(),
  'carrinho-edicao-qtd':            el => setEditQty(Number(el.dataset.qtd)),
  'carrinho-edicao-promo':          el => setEditPromoType(el.dataset.modo),
  'carrinho-edicao-marca-confirmar': () => confirmarNovaMarcaModalEdicao(),
  'carrinho-edicao-marca-cancelar': () => cancelarNovaMarcaModalEdicao(),
  // guia "melhor mercado"
  'carrinho-guia-abrir':            () => abrirGuiaComparativoMercados(),
  'carrinho-guia-fundo':            noProprioElemento(() => fecharGuiaComparativoMercados()),
  'carrinho-guia-fechar':           () => fecharGuiaComparativoMercados(),
  'carrinho-guia-trocar-mercado':   el => trocarMercadoPelaGuia(el.dataset.id),
});

Acoes.registrarMudanca({
  'carrinho-form-marca':            el => aoMudarSelectMarcaInline(el.value),
  'carrinho-form-unidade':          () => atualizarAtalhosQuantidade(),
  'carrinho-form-recalcular':       () => updateCartItemPreview(),
  'carrinho-edicao-recalcular':     () => atualizarSubtotalModalEdicao(),
  'carrinho-edicao-unidade':        el => atualizarAtalhosEdicao(el.value),
});

Acoes.registrarDigitacao({
  'carrinho-form-recalcular':       () => updateCartItemPreview(),
  'carrinho-edicao-recalcular':     () => atualizarSubtotalModalEdicao(),
});

Acoes.registrarEnvio({
  'carrinho-edicao-salvar':         () => salvarEdicaoItemCarrinho(),
});

