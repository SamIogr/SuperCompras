/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CATÁLOGO: PREÇO DE UM PRODUTO POR MARCA E MERCADO (js/telas/catalogo/precos.js)
 */

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { obterPrecoProdutoMarcaMercado, atualizarPrecoUnificado });

export function obterPrecoProdutoMarcaMercado(prod, marcaNome, mercadoId) {
  if (!prod) return 0;
  const mercado = mercadoId || activeMarketId || 'm-padrao';
  const marca = (marcaNome || 'Padrão').trim().toLowerCase();

  if (marca === 'padrão' || marca === 'padrao') {
    if (prod.marketPrices && prod.marketPrices[mercado] !== undefined && Number(prod.marketPrices[mercado]) > 0) {
      return Number(prod.marketPrices[mercado]);
    }
    if (mercado === 'm-padrao') {
      return Number(prod.basePrice) || 0;
    }
    return 0;
  }

  if (Array.isArray(prod.brands)) {
    const bObj = prod.brands.find(b => (b.name || b.id || '').toLowerCase() === marca);
    if (bObj && bObj.marketPrices && bObj.marketPrices[mercado] !== undefined && Number(bObj.marketPrices[mercado]) > 0) {
      return Number(bObj.marketPrices[mercado]);
    }
  }
  return 0;
}

export function atualizarPrecoUnificado(prodId, marcaNome, mercadoId, preco) {
  const prod = (products || []).find(p => String(p.id) === String(prodId));
  if (!prod) return;

  const valor = Math.max(0, Number(preco) || 0);
  const marca = (marcaNome || 'Padrão').trim();

  if (marca.toLowerCase() === 'padrão' || marca.toLowerCase() === 'padrao') {
    if (!prod.marketPrices) prod.marketPrices = {};
    prod.marketPrices[mercadoId] = valor;
    if (mercadoId === 'm-padrao') prod.basePrice = valor;
  } else {
    if (!Array.isArray(prod.brands)) prod.brands = [];
    let bObj = prod.brands.find(b => (b.name || b.id || '').toLowerCase() === marca.toLowerCase());
    if (!bObj) {
      bObj = { id: marca, name: marca, marketPrices: {} };
      prod.brands.push(bObj);
    }
    if (!bObj.marketPrices) bObj.marketPrices = {};
    bObj.marketPrices[mercadoId] = valor;
  }

  saveAllLocalData();
  renderCatalogUI();
}
