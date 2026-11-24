/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - MÓDULO ÚNICO DE BACKUP E EXPORTAÇÃO (js/io.js)
 */

import { Acoes, noProprioElemento } from './ui/acoes.js';
import { MERCADO_PADRAO_GENERICO, formatBRL, formatQty, getSelectedMarketName, normalizarDados, novoId, saveAllLocalData, saveCartData } from './state.js';
import { renderCartUI } from './templates.js';
import { abrirModalBackup, openCustomDialog, refreshActiveMarketUI, showAppToast } from './ui.js';
import { salvarChaveSeguranca } from './api.js';
import { renderHistoricoUI } from './telas/historico/lista.js';
import { computeItemFinancials } from './telas/carrinho/calculo.js';
import { compartilharCarrinhoWhatsApp } from './telas/carrinho/finalizacao.js';
import { renderCatalogUI, renderMarketsUI } from './telas/catalogo/layout.js';
import { abrirModalQRCode, desserializarQRParaCarrinho, mesclarItensNoCarrinho, serializarCarrinhoParaQR } from './qrcode-sync.js';

export function baixarArquivo(conteudo, nomeArquivo, tipoMime) {
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
export function openExportOptionsModal() {
  const m = document.getElementById('modalExportOptions');
  if (m) {
    m.classList.remove('hidden');
    m.style.removeProperty('display');
  } else {
    showAppToast('Modal de exportação não encontrado no DOM.', 'error');
  }
};

export function closeExportOptionsModal() {
  const m = document.getElementById('modalExportOptions');
  if (m) {
    m.classList.add('hidden');
    m.style.removeProperty('display');
  }
};

// BACKUP COMPLETO UNIFICADO (JSON)
export function exportBackupJSON() {
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

export function handleRestoreJSON(e) {
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
                id: item.id || (novoId('p-custom-')),
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

      normalizarDados();
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
export function exportCartCSV() {
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

// GERADOR ÚNICO: FORMATO DETALHADO COMPLETO COM LINK
export async function gerarTextoFormatadoCarrinho() {
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

// 2. Copiar exatamente o mesmo texto detalhado para a área de transferência
export async function copyCartToWhatsApp() {
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
// IMPORTACAO DE LINK OU PAYLOAD COLADO DIRETAMENTE
export async function colarTextoImportacao() {
  let texto = prompt('Cole aqui o link ou o codigo recebido pelo WhatsApp:');
  if (!texto) return;

  texto = texto.trim();
  
  // Extrai o payload se for um link completo com #import=
  let payload = texto;
  if (texto.includes('#import=')) {
    payload = texto.split('#import=')[1];
  }

  payload = decodeURIComponent(payload);

  if (typeof desserializarQRParaCarrinho !== 'function') {
    showAppToast('Modulo de sincronizacao QR nao carregado.', 'error');
    return;
  }

  const dados = await desserializarQRParaCarrinho(payload);
  if (!dados || !Array.isArray(dados.items) || dados.items.length === 0) {
    showAppToast('Codigo ou link invalido.', 'error');
    return;
  }

  const aplicarImportacaoLocal = (substituir) => {
    if (substituir) {
      cart = dados.items;
    } else if (typeof mesclarItensNoCarrinho === 'function') {
      mesclarItensNoCarrinho(dados.items);
    } else {
      cart = cart.concat(dados.items);
    }

    if (dados.marketId && dados.marketId !== 'm-padrao') {
      activeMarketId = dados.marketId;
    }

    saveCartData();
    saveAllLocalData();
    renderCartUI();
    showAppToast(substituir ? 'Carrinho substituido com sucesso!' : 'Itens somados ao carrinho!', 'success');
  };

  if (!cart || cart.length === 0) {
    aplicarImportacaoLocal(true);
    return;
  }

  if (typeof openCustomDialog === 'function') {
    openCustomDialog(
      'Importar Lista Recebida',
      `Seu carrinho ja contem ${cart.length} item(ns). A nova lista contem ${dados.items.length} item(ns). Como deseja importar?`,
      'Substituir Carrinho',
      'Somar aos Existentes',
      () => aplicarImportacaoLocal(true),
      () => aplicarImportacaoLocal(false)
    );
  } else {
    const somar = confirm(`Deseja somar os ${dados.items.length} itens aos ja existentes?\n\n[OK] = Somar\n[Cancelar] = Substituir`);
    aplicarImportacaoLocal(!somar);
  }
}

// ===== AÇÕES DAS JANELAS "BACKUP" E "EXPORTAR / COMPARTILHAR" (delegação, ver js/ui/acoes.js) =====
const _fecharExportarE = fn => () => { closeExportOptionsModal(); fn(); };
Acoes.registrarClique({
  'backup-abrir':         () => abrirModalBackup(),
  'backup-fechar':        () => document.getElementById('modalBackup')?.classList.add('hidden'),
  'backup-salvar-chave':  () => salvarChaveSeguranca(),
  'backup-exportar':      () => exportBackupJSON(),
  'exportar-fundo':       noProprioElemento(() => closeExportOptionsModal()),
  'exportar-fechar':      () => closeExportOptionsModal(),
  // mesma ordem de antes: compartilhar/copiar/CSV agem e depois fecham; QR e colar fecham antes
  'exportar-whatsapp':    () => { compartilharCarrinhoWhatsApp(); closeExportOptionsModal(); },
  'exportar-copiar':      () => { copyCartToWhatsApp(); closeExportOptionsModal(); },
  'exportar-csv':         () => { exportCartCSV(); closeExportOptionsModal(); },
  'exportar-qr-gerar':    _fecharExportarE(() => abrirModalQRCode('gerar')),
  'exportar-qr-ler':      _fecharExportarE(() => abrirModalQRCode('ler')),
  'exportar-colar':       _fecharExportarE(() => colarTextoImportacao()),
});
Acoes.registrarMudanca({
  'backup-restaurar':     (el, e) => handleRestoreJSON(e),
});
