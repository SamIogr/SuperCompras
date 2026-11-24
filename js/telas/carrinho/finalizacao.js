/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CARRINHO: LIMPAR, FINALIZAR A COMPRA E ENVIAR PELO WHATSAPP (js/telas/carrinho/finalizacao.js)
 */

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { askClearCart, askFinishPurchase, executeFinishPurchase, compartilharCarrinhoWhatsApp });

export function askClearCart() {
  if ((cart || []).length === 0) return;
  if (typeof openCustomDialog === 'function') {
    openCustomDialog(
      'Limpar Carrinho?',
      'Deseja remover todos os itens ou apenas os que já foram pegos?',
      'Limpar Todos',
      'Limpar Só os Pegos',
      () => { cart = []; saveCartData(); renderCartUI(); showAppToast('Carrinho limpo!', 'info'); },
      () => { cart = cart.filter(it => !it.checked); saveCartData(); renderCartUI(); showAppToast('Itens pegos removidos!', 'info'); }
    );
  } else {
    if (confirm('Deseja limpar todos os itens do carrinho?')) {
      cart = [];
      saveCartData();
      renderCartUI();
      showAppToast('Carrinho limpo!', 'info');
    }
  }
}

export function askFinishPurchase() {
  if ((cart || []).length === 0) return;
  let total = 0;
  cart.forEach(i => total += computeItemFinancials(i.quantity, i.unitPrice, i.promo).finalSubtotal);
  openCustomDialog(
    'Concluir Compra?',
    `Deseja finalizar a compra em ${getSelectedMarketName()} totalizando R$ ${formatBRL(total)}?`,
    'Concluir e Limpar',
    'Concluir e Manter Lista',
    () => executeFinishPurchase(true),
    () => executeFinishPurchase(false)
  );
}

// 7. FINALIZAÇÃO DA COMPRA
export function executeFinishPurchase(clearAfter) {
  let gT = 0;
  let tS = 0;

  const itensSnapshot = cart.map(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    gT += calc.finalSubtotal;
    tS += calc.savings;

    const unitPrice = Number(item.unitPrice) || 0;
    const marca = (item.selectedBrandId || 'Padrão').trim();

    let masterProd = (products || []).find(p => 
      (item.productId && p.id === item.productId) || 
      p.name.toLowerCase() === item.name.toLowerCase()
    );

    if (masterProd) {
      if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
        if (!masterProd.marketPrices) masterProd.marketPrices = {};
        if (unitPrice > 0) masterProd.marketPrices[activeMarketId] = unitPrice;
      } else {
        if (!Array.isArray(masterProd.brands)) masterProd.brands = [];
        let bObj = masterProd.brands.find(b => (b.name || b.id || '').toLowerCase() === marca.toLowerCase());
        if (!bObj) {
          bObj = { id: marca, name: marca, marketPrices: {} };
          masterProd.brands.push(bObj);
        }
        if (unitPrice > 0) {
          if (!bObj.marketPrices) bObj.marketPrices = {};
          bObj.marketPrices[activeMarketId] = unitPrice;
        }
      }

      if (unitPrice > 0 && typeof enviarProdutoParaPlanilha === 'function') {
        enviarProdutoParaPlanilha(masterProd, activeMarketId, unitPrice, marca);
      }
    }

    return {
      productId: item.productId || (masterProd ? masterProd.id : null),
      name: item.name,
      selectedBrandId: marca,
      unitPrice: unitPrice,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'un',
      subtotal: calc.finalSubtotal,
      savings: calc.savings,
      promo: item.promo ? JSON.parse(JSON.stringify(item.promo)) : { type: 'none' }
    };
  });

  const novaCompra = {
    id: novoId('pur-'),
    date: new Date().toISOString(),
    marketId: activeMarketId,
    marketName: getSelectedMarketName(),
    total: gT,
    savings: tS,
    itemCount: itensSnapshot.length,
    items: itensSnapshot
  };

  if (!Array.isArray(purchaseHistory)) purchaseHistory = [];
  purchaseHistory.unshift(novaCompra);

  if (clearAfter) cart = [];
  else cart.forEach(it => it.checked = false);

  saveAllLocalData();
  saveCartData();

  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  if (typeof renderMarketsUI === 'function') renderMarketsUI();
  if (typeof renderHistoricoUI === 'function') renderHistoricoUI();

  if (typeof playAppBeep === 'function') playAppBeep('finish');
  showAppToast('Compra finalizada! Preços e marcas consolidados no catálogo.', 'success');
}

export async function compartilharCarrinhoWhatsApp() {
  if (!cart || cart.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('O carrinho está vazio!', 'warning');
    return;
  }

  // 1. Aguarda a resolução da promessa com await
  const payloadCompacto = await serializarCarrinhoParaQR();
  const baseUrl = window.location.origin + window.location.pathname;
  const linkImportacao = `${baseUrl}#import=${encodeURIComponent(payloadCompacto)}`;

  // 2. Monta o texto legível para o WhatsApp
  let texto = `🛒 *Lista de Compras (${cart.length} itens)*\n\n`;

  let totalEstimado = 0;
  cart.forEach(item => {
    const calc = computeItemFinancials(item.quantity, item.unitPrice, item.promo);
    totalEstimado += calc.finalSubtotal;
    const marca = item.selectedBrandId && item.selectedBrandId !== 'Padrão' ? ` (${item.selectedBrandId})` : '';
    texto += `• ${item.quantity} ${item.unit || 'un'} × *${item.name}*${marca}\n`;
  });

  texto += `\n💰 *Total estimado:* R$ ${formatBRL(totalEstimado)}\n\n`;
  texto += `📲 *Para abrir e controlar no SuperCompras, toque no link:*\n${linkImportacao}`;

  // 3. Abre no WhatsApp
  const urlWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  window.open(urlWhatsapp, '_blank');
}
