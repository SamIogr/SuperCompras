/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - INICIALIZAÇÃO DO APP (js/main.js)
 *
 * Último módulo do index.html. Antes era um <script> embutido no HTML que chamava as
 * funções pelo nome global; agora importa o que usa como qualquer outro módulo.
 * Quando a página termina de carregar: busca as telas de components/, lê os dados do
 * aparelho, desenha tudo, mantém a tela acesa e, se for administrador com internet,
 * sincroniza com a planilha.
 */

import { getSecurityToken, loadApplicationData } from './state.js';
import { ativarTelaAcesa, refreshActiveMarketUI } from './ui.js';
import { sincronizarComPlanilha } from './api.js';
import { renderHistoricoUI } from './telas/historico/lista.js';
import { renderCartUI } from './telas/carrinho/cards.js';
import { updateCartItemPreview } from './telas/carrinho/formulario.js';
import { renderCatalogUI, renderMarketsUI } from './telas/catalogo/layout.js';
import { carregarComponentesUI } from './ui-loader.js';
import { verificarImportacaoUrlHash } from './qrcode-sync.js';

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await carregarComponentesUI();

    loadApplicationData();
    refreshActiveMarketUI();
    renderCartUI();
    renderCatalogUI();
    renderMarketsUI();
    renderHistoricoUI();
    ativarTelaAcesa();
    updateCartItemPreview();

    setTimeout(verificarImportacaoUrlHash, 300);

    if (navigator.onLine && getSecurityToken()) {
      sincronizarComPlanilha().catch(() => { });
    }
  } catch (erro) {
    console.error('[App Init] Erro crítico na inicialização:', erro);
  }
});
