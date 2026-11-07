/**
 * SUPERCOMPRAS PRO - MÓDULO ÚNICO DE BACKUP E EXPORTAÇÃO (js/io.js)
 */

function baixarArquivo(conteudo, nomeArquivo, tipoMime) {
  const blob = new Blob([conteudo], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// CONTROLE DO MODAL DE EXPORTAÇÃO (WHATSAPP / CSV)
window.openExportOptionsModal = function() {
  const m = document.getElementById('modalExportOptions');
  if (m) {
    m.classList.remove('hidden');
    m.style.removeProperty('display');
  } else {
    showAppToast('Modal de exportação não encontrado no DOM.', 'error');
  }
};

window.closeExportOptionsModal = function() {
  const m = document.getElementById('modalExportOptions');
  if (m) {
    m.classList.add('hidden');
    m.style.removeProperty('display');
  }
};

// BACKUP COMPLETO UNIFICADO (JSON)
function exportBackupJSON() {
  const fullBackup = {
    app: 'SuperComprasPro',
    version: 3,
    exportDate: new Date().toISOString(),
    activeMarketId: activeMarketId || 'm-padrao',
    supermarkets: Array.isArray(supermarkets) ? supermarkets : [],
    products: Array.isArray(products) ? products : [],
    purchaseHistory: Array.isArray(purchaseHistory) ? purchaseHistory : [],
    cart: Array.isArray(cart) ? cart : []
  };

  const agora = new Date();
  const dataFmt = agora.toISOString().slice(0, 10);
  const horaFmt = agora.toTimeString().slice(0, 5).replace(':', 'h');

  baixarArquivo(
    JSON.stringify(fullBackup, null, 2),
    `SuperCompras_Backup_${dataFmt}_${horaFmt}.json`,
    'application/json;charset=utf-8;'
  );

  showAppToast('Backup completo exportado com sucesso!', 'success');
  document.getElementById('modalBackup')?.classList.add('hidden');
}

function handleRestoreJSON(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      const payload = parsed.payload || parsed;

      const rawProducts = payload.products || payload.produtos;
      const rawMarkets = payload.supermarkets || payload.supermercados;
      const rawHistory = payload.purchaseHistory || payload.historico;
      const rawCart = payload.cart || payload.carrinho;

      if (!Array.isArray(rawProducts) && !Array.isArray(rawMarkets) && !Array.isArray(rawHistory)) {
        throw new Error('Formato de arquivo inválido: dados não encontrados.');
      }

      if (Array.isArray(rawProducts)) {
        const mapaProdutos = new Map();
        rawProducts.forEach(item => {
          if (item && item.name && typeof item.name === 'string') {
            const chave = item.name.trim().toLowerCase();
            if (!mapaProdutos.has(chave)) {
              const marcasLimpa = Array.isArray(item.brands) ? item.brands.map(b => {
                if (typeof b === 'string') {
                  return { id: b, name: b, marketPrices: {} };
                }
                return {
                  id: b.id || b.name || 'Padrão',
                  name: b.name || b.id || 'Padrão',
                  marketPrices: (b.marketPrices && typeof b.marketPrices === 'object') ? b.marketPrices : {}
                };
              }) : [];

              mapaProdutos.set(chave, {
                ...item,
                id: item.id || ('p-custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
                name: item.name.trim(),
                category: item.category || 'Geral',
                unit: item.unit || 'un',
                basePrice: Number(item.basePrice) || 0,
                marketPrices: (item.marketPrices && typeof item.marketPrices === 'object') ? item.marketPrices : {},
                brands: marcasLimpa
              });
            }
          }
        });
        products = Array.from(mapaProdutos.values());
      }

      if (Array.isArray(rawMarkets)) {
        let mercadosLimpos = rawMarkets.filter(m => m && m.id && m.name);
        if (!mercadosLimpos.some(m => m.id === 'm-padrao')) {
          mercadosLimpos.unshift(MERCADO_PADRAO_GENERICO);
        }
        supermarkets = mercadosLimpos;
      }

      if (Array.isArray(rawHistory)) {
        purchaseHistory = rawHistory;
      }

      if (Array.isArray(rawCart)) {
        cart = rawCart;
      }
      if (payload.activeMarketId && supermarkets.some(m => m.id === payload.activeMarketId)) {
        activeMarketId = payload.activeMarketId;
      } else {
        activeMarketId = 'm-padrao';
      }

      saveAllLocalData();
      refreshActiveMarketUI();
      renderCartUI();
      renderCatalogUI();
      renderMarketsUI();
      if (typeof renderHistoricoUI === 'function') renderHistoricoUI();

      showAppToast(`Backup restaurado: ${products.length} produtos carregados!`, 'success');
      document.getElementById('modalBackup')?.classList.add('hidden');
    } catch (err) {
      console.error('Falha ao restaurar:', err);
      showAppToast(err.message || 'Erro ao processar arquivo de backup.', 'error');
    }
  };

  reader.readAsText(file);
  e.target.value = '';
}

// EXPORTAÇÃO CSV COMPLETA (COM DESCONTO E ATACADO)
function exportCartCSV() {
  if (!Array.isArray(cart) || cart.length === 0) {
    showAppToast('O carrinho está vazio para exportar.', 'warning');
    return;
  }

  let csv = '\uFEFFProduto;Marca;Categoria;Unidade;Preco_Base;Condicao_Comercial;Economia;Quantidade;Subtotal;No_Carrinho\n';
  cart.forEach(it => {
    const calc = computeItemFinancials(it.quantity, it.unitPrice, it.promo);
    const condicaoTxt = calc.badgeText ? calc.badgeText.replace(/"/g, '""') : 'Normal';
    const econTxt = calc.savings > 0 ? calc.savings.toFixed(2).replace('.', ',') : '0,00';

    csv += `"${it.name.replace(/"/g, '""')}";"${(it.selectedBrandId || 'Padrão').replace(/"/g, '""')}";${it.category || 'Geral'};${it.unit};${it.unitPrice.toFixed(2).replace('.', ',')};"${condicaoTxt}";${econTxt};${it.quantity.toString().replace('.', ',')};${calc.finalSubtotal.toFixed(2).replace('.', ',')};${it.checked ? 'SIM' : 'NÃO'}\n`;
  });

  baixarArquivo(csv, `Compras_${getSelectedMarketName()}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  showAppToast('Planilha CSV gerada com sucesso!', 'success');
  closeExportOptionsModal();
}
window.exportCartCSV = exportCartCSV;

// GERADOR ÚNICO: FORMATO DETALHADO COMPLETO COM LINK
async function gerarTextoFormatadoCarrinho() {
  if (!Array.isArray(cart) || cart.length === 0) return null;

  const marketName = typeof getSelectedMarketName === 'function' ? getSelectedMarketName() : 'Supermercado';
  let text = `🛒 *LISTA DE COMPRAS (${marketName.toUpperCase()})*\n`;
  text += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
  text += `------------------------------------\n`;

  let totalGeral = 0;
  let totalEconomia = 0;

  cart.forEach(it => {
    const calc = computeItemFinancials(it.quantity, it.unitPrice, it.promo);
    totalGeral += calc.finalSubtotal;
    totalEconomia += calc.savings;

    const check = it.checked ? '✅' : '⬜';
    const marcaTxt = (it.selectedBrandId && it.selectedBrandId !== 'Padrão') ? ` (${it.selectedBrandId})` : '';
    const condicaoPromo = calc.badgeText ? ` 🏷️ _[${calc.badgeText}]_` : '';
    const economiaTxt = calc.savings > 0 ? ` (Econ. R$ ${formatBRL(calc.savings)})` : '';
    const qtdFormatada = typeof formatQty === 'function' ? formatQty(it.quantity) : it.quantity;

    text += `${check} *${it.name}${marcaTxt}*\n`;
    text += `   ${qtdFormatada} ${it.unit || 'un'} × R$ ${formatBRL(it.unitPrice)}${condicaoPromo} = *R$ ${formatBRL(calc.finalSubtotal)}*${economiaTxt}\n`;
  });

  text += `------------------------------------\n`;
  text += `💰 *TOTAL PREVISTO: R$ ${formatBRL(totalGeral)}* (${cart.length} itens)\n`;
  if (totalEconomia > 0) {
    text += `🎉 *ECONOMIA TOTAL: R$ ${formatBRL(totalEconomia)}*\n`;
  }

  // Anexa o link de importação interativo com o payload comprimido
  if (typeof serializarCarrinhoParaQR === 'function') {
    const payloadCompacto = await serializarCarrinhoParaQR();
    if (payloadCompacto) {
      const baseUrl = window.location.origin + window.location.pathname;
      const linkImportacao = `${baseUrl}#import=${encodeURIComponent(payloadCompacto)}`;
      text += `\n📲 *Para abrir e controlar no SuperCompras, toque no link:*\n${linkImportacao}\n`;
    }
  }

  return text;
}
window.gerarTextoFormatadoCarrinho = gerarTextoFormatadoCarrinho;

// 1. Enviar diretamente para o WhatsApp
async function compartilharCarrinhoWhatsApp() {
  const texto = await gerarTextoFormatadoCarrinho();
  if (!texto) {
    if (typeof showAppToast === 'function') showAppToast('O carrinho está vazio!', 'warning');
    return;
  }
  const urlWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  window.open(urlWhatsapp, '_blank');
  if (typeof closeExportOptionsModal === 'function') closeExportOptionsModal();
}
window.compartilharCarrinhoWhatsApp = compartilharCarrinhoWhatsApp;

// 2. Copiar exatamente o mesmo texto detalhado para a área de transferência
async function copyCartToWhatsApp() {
  const texto = await gerarTextoFormatadoCarrinho();
  if (!texto) {
    if (typeof showAppToast === 'function') showAppToast('O carrinho está vazio para exportar.', 'warning');
    return;
  }

  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);

  if (typeof showAppToast === 'function') showAppToast('Lista copiada para o WhatsApp!', 'success');
  if (typeof closeExportOptionsModal === 'function') closeExportOptionsModal();
}
window.copyCartToWhatsApp = copyCartToWhatsApp;