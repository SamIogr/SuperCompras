/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - AVISOS ENTRE AS PARTES DO APP (js/eventos.js)
 *
 * Quem muda os dados AVISA ("os dados foram salvos"); quem precisa reagir OUVE.
 * Assim uma parte do app não precisa substituir funções de outra para saber o que
 * aconteceu (era o que o drive-sync.js fazia com saveAllLocalData).
 *
 *   Eventos.ouvir('dados-salvos', (info) => { ... });   // devolve uma função para parar de ouvir
 *   Eventos.avisar('dados-salvos', { quais: 'tudo' });
 *
 * Avisos usados hoje (os nomes ficam listados em AVISOS):
 *   dados-salvos     produtos, mercados, carrinho e histórico gravados no aparelho
 *                    info.quais: 'tudo' (saveAllLocalData) | 'historico' (salvarHistoricoLocal)
 *   carrinho-salvo   só o carrinho foi gravado (saveCartData)
 *   dados-recarregados  os dados mudaram por fora (planilha, Drive, backup, QR code):
 *                    info.quais = telas a redesenhar ('carrinho', 'catalogo', 'mercados', 'historico').
 *                    Use pedirRedesenho(...) para avisar e aoPedirRedesenho(tela, fn) para ouvir.
 *                    É separado de dados-salvos de propósito: o Drive ouve dados-salvos para
 *                    sincronizar, e redesenhar não pode disparar outra sincronização.
 *   aba-aberta       o usuário trocou de aba (info.aba: 'compras' | 'historico' | 'dados')
 *   planilha-concluiu um produto ou mercado foi enviado à planilha (info.tipo: 'produto' | 'mercado')
 *
 * Carregue ANTES de todos os outros scripts do app.
 */

export const AVISOS = Object.freeze({
  DADOS_SALVOS: 'dados-salvos',
  CARRINHO_SALVO: 'carrinho-salvo',
  DADOS_RECARREGADOS: 'dados-recarregados',
  ABA_ABERTA: 'aba-aberta',
  PLANILHA_CONCLUIU: 'planilha-concluiu',
});

export const Eventos = (() => {
  const ouvintes = new Map();   // nome -> Set de funções

  function ouvir(nome, fn) {
    if (typeof fn !== 'function') throw new TypeError('Eventos.ouvir precisa de uma função');
    if (!ouvintes.has(nome)) ouvintes.set(nome, new Set());
    ouvintes.get(nome).add(fn);
    return () => ouvintes.get(nome).delete(fn);
  }

  function avisar(nome, info) {
    const lista = ouvintes.get(nome);
    if (!lista) return;
    // copia: um ouvinte pode parar de ouvir durante o aviso
    for (const fn of Array.from(lista)) {
      try {
        fn(info);
      } catch (e) {
        // um ouvinte com erro não pode impedir o salvamento nem os outros ouvintes
        console.error(`[Eventos] Erro ao tratar "${nome}":`, e);
      }
    }
  }

  return Object.freeze({ ouvir, avisar });
})();

/** Pede às telas que se redesenhem: pedirRedesenho('catalogo', 'mercados'). */
export function pedirRedesenho(...quais) {
  Eventos.avisar(AVISOS.DADOS_RECARREGADOS, { quais });
}

/** Na tela: aoPedirRedesenho('catalogo', renderCatalogUI) redesenha quando alguém pedir. */
export function aoPedirRedesenho(tela, redesenhar) {
  return Eventos.ouvir(AVISOS.DADOS_RECARREGADOS, info => {
    if (info && Array.isArray(info.quais) && info.quais.includes(tela)) redesenhar();
  });
}
