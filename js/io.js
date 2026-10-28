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

function exportBackupJSON() {
  const fullBackup = {
    app: 'SuperComprasPro',
    version: 3,
    exportDate: new Date().toISOString(),
    supermarkets: supermarkets,
    products: products,
    activeMarketId: activeMarketId,
    cart: cart,
    purchaseHistory: purchaseHistory
  };

  baixarArquivo(JSON.stringify(fullBackup, null, 2), `SuperCompras_Backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8;');
  showAppToast('Backup exportado!', 'success');
  document.getElementById('modalBackup').classList.add('hidden');
}

function handleRestoreJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed.products && Array.isArray(parsed.products)) {
        products = parsed.products;
        if (parsed.supermarkets) supermarkets = parsed.supermarkets;
        if (parsed.activeMarketId) activeMarketId = parsed.activeMarketId;
        if (parsed.cart) cart = parsed.cart;
        if (parsed.purchaseHistory) purchaseHistory = parsed.purchaseHistory;

        saveAllLocalData();
        refreshActiveMarketUI();
        renderCartUI();
        renderCatalogUI();
        renderMarketsUI();
        showAppToast('Backup restaurado!', 'success');
        document.getElementById('modalBackup').classList.add('hidden');
      }
    } catch (err) {
      showAppToast('Erro ao ler arquivo de backup', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function exportCartCSV() {
  let csv = '\uFEFFProduto;Categoria;Unidade;Preco_Unitario;Quantidade;Subtotal;No_Carrinho\n';
  cart.forEach(it => {
    const calc = computeItemFinancials(it.quantity, it.unitPrice, it.promo);
    csv += `"${it.name.replace(/"/g, '""')}";${it.category || 'Geral'};${it.unit};${it.unitPrice.toFixed(2).replace('.', ',')};${it.quantity.toString().replace('.', ',')};${calc.finalSubtotal.toFixed(2).replace('.', ',')};${it.checked ? 'SIM' : 'NÃO'}\n`;
  });

  baixarArquivo(csv, `Compras_${getSelectedMarketName()}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  showAppToast('Planilha CSV gerada!', 'success');
  document.getElementById('modalExportOptions').classList.add('hidden');
}

function copyCartToWhatsApp() {
  const marketName = getSelectedMarketName();
  let text = `🛒 *LISTA DE COMPRAS (${marketName.toUpperCase()})*\n`;
  text += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
  text += `------------------------------------\n`;

  let total = 0;
  cart.forEach(it => {
    const calc = computeItemFinancials(it.quantity, it.unitPrice, it.promo);
    total += calc.finalSubtotal;
    const check = it.checked ? '✅' : '⬜';
    text += `${check} *${it.name}*\n   ${formatQty(it.quantity)} ${it.unit} × R$ ${formatBRL(it.unitPrice)} = *R$ ${formatBRL(calc.finalSubtotal)}*\n`;
  });

  text += `------------------------------------\n`;
  text += `💰 *TOTAL PREVISTO: R$ ${formatBRL(total)}* (${cart.length} itens)\n`;

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showAppToast('Lista copiada para o WhatsApp!', 'success');
  document.getElementById('modalExportOptions').classList.add('hidden');
}