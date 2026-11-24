/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - ARMAZENAMENTO LOCAL (js/armazenamento.js)
 *
 * ÚNICO arquivo do app que acessa o localStorage. Os outros usam Armazenamento.* com as
 * chaves de CHAVES. Assim:
 *  - todas as chaves ficam listadas num lugar só (fácil de ver o que o app guarda);
 *  - erros de leitura (JSON corrompido) e de gravação (armazenamento cheio, modo privado)
 *    são tratados do mesmo jeito em todo o app;
 *  - chaves antigas de versões anteriores são migradas uma vez, aqui.
 *
 * Carregue ANTES de state.js (é o primeiro script do app).
 */

export const CHAVES = Object.freeze({
  // dados do app
  PRODUTOS: 'sc_products_v3',
  MERCADOS: 'sc_supermarkets_v3',
  CARRINHO: 'sc_cart_v3',
  HISTORICO: 'sc_history_v3',
  MERCADO_ATIVO: 'sc_active_market_v3',
  // planilha do administrador
  TOKEN_PLANILHA: 'sc_security_token',
  MERCADOS_IGNORADOS: 'sc_ignored_markets',
  // preferências da tela
  TEMA: 'sc_theme',
  ZOOM: 'supercompras_app_zoom',
  // backup no Google Drive
  DRIVE_META: 'sc_drive_meta_v2',
  DRIVE_META_ANTIGA: 'sc_drive_meta_v1',
  DRIVE_CONECTADO: 'sc_drive_conectado',
  DRIVE_EMAIL: 'sc_drive_email',
  // cópia dos componentes HTML para abrir sem internet (+ id do container)
  PREFIXO_COMPONENTE_UI: 'sc_ui_componente_',
});

// Versões antigas guardavam o histórico nestas chaves (em ordem de preferência).
export const CHAVES_HISTORICO_ANTIGAS = Object.freeze(['sc_purchase_history', 'supercompras_history', 'compras']);

export const Armazenamento = {
  /** Texto guardado na chave, ou `padrao` se não existir / não der para ler. */
  lerTexto(chave, padrao = null) {
    try {
      const v = localStorage.getItem(chave);
      return v === null ? padrao : v;
    } catch (e) {
      console.warn('[Armazenamento] Não foi possível ler', chave, e);
      return padrao;
    }
  },

  /** Grava texto. Devolve false se o navegador recusar (cheio, modo privado...). */
  gravarTexto(chave, valor) {
    try {
      localStorage.setItem(chave, String(valor));
      return true;
    } catch (e) {
      console.error('[Armazenamento] Não foi possível gravar', chave, e);
      return false;
    }
  },

  /** Valor JSON guardado, ou `padrao` se não existir ou estiver corrompido. */
  lerJSON(chave, padrao = null) {
    const t = Armazenamento.lerTexto(chave);
    if (t === null || t === '' || t === 'undefined' || t === 'null') return padrao;
    try {
      return JSON.parse(t);
    } catch (e) {
      console.warn('[Armazenamento] JSON corrompido em', chave, e);
      return padrao;
    }
  },

  gravarJSON(chave, valor) {
    return Armazenamento.gravarTexto(chave, JSON.stringify(valor));
  },

  /** Lista guardada na chave; qualquer coisa que não seja lista vira []. */
  lerLista(chave) {
    const v = Armazenamento.lerJSON(chave, []);
    return Array.isArray(v) ? v : [];
  },

  existe(chave) {
    return Armazenamento.lerTexto(chave) !== null;
  },

  remover(chave) {
    try { localStorage.removeItem(chave); } catch (e) { /* nada a remover */ }
  },

  /**
   * Histórico de versões antigas: se ainda não existe o atual, copia da primeira chave
   * antiga que tiver uma lista. As chaves antigas NÃO são apagadas (ficam como cópia de
   * segurança); só deixam de ser lidas pelo app.
   */
  migrarChavesAntigas() {
    if (Armazenamento.existe(CHAVES.HISTORICO)) return;
    for (const antiga of CHAVES_HISTORICO_ANTIGAS) {
      const lista = Armazenamento.lerJSON(antiga, null);
      if (Array.isArray(lista)) {
        Armazenamento.gravarJSON(CHAVES.HISTORICO, lista);
        console.info('[Armazenamento] Histórico migrado de', antiga);
        return;
      }
    }
  },
};

Armazenamento.migrarChavesAntigas();

