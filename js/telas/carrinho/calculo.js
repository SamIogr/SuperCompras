/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CARRINHO: CÁLCULO DE SUBTOTAL, DESCONTO E ATACADO (js/telas/carrinho/calculo.js)
 */

// 1. CÁLCULO FINANCEIRO DE ITENS (PADRÃO, DESCONTO E ATACADO)
export function computeItemFinancials(qty, unitPrice, promo = {}) {
  qty = Math.max(0, Number(qty) || 0);
  unitPrice = Math.max(0, Number(unitPrice) || 0);
  const standardSubtotal = qty * unitPrice;
  let finalSubtotal = standardSubtotal;
  let savings = 0;
  let badgeText = '';

  const promoType = promo ? promo.type : 'none';

  if (promoType === 'discount') {
    const val = Number(promo.value) || 0;
    const mode = promo.mode || 'percent';
    if ((mode === 'percent' || mode === 'percentage') && val > 0) {
      savings = standardSubtotal * (Math.min(val, 100) / 100);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. ${val}%`;
    } else if (mode === 'fixed' && val > 0) {
      savings = qty * Math.min(val, unitPrice);
      finalSubtotal = standardSubtotal - savings;
      badgeText = `Desc. R$ ${formatBRL(val)}/un`;
    }
  } else if (promoType === 'wholesale') {
    const minQ = Number(promo.minQty) || 0;
    const wPrice = Number(promo.wholesalePrice) || 0;
    if (minQ > 0 && wPrice > 0 && qty >= minQ) {
      const wholesaleTotal = qty * wPrice;
      if (wholesaleTotal < standardSubtotal) {
        savings = standardSubtotal - wholesaleTotal;
        finalSubtotal = wholesaleTotal;
        badgeText = `Atacado (≥${minQ}): R$ ${formatBRL(wPrice)}/un`;
      }
    }
  }

  return {
    standardSubtotal,
    finalSubtotal: Math.max(0, finalSubtotal),
    savings: Math.max(0, savings),
    badgeText
  };
}

// ----- PONTE DA TRANSIÇÃO (etapa 4) -----
// Os arquivos que ainda não são módulos usam estes nomes como globais.
// Quando todos eles passarem a usar import, esta linha sai.
Object.assign(window, { computeItemFinancials });
