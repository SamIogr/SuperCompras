/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - HISTÓRICO: LEITURA, GRAVAÇÃO E DADOS AUXILIARES DAS COMPRAS (js/telas/historico/dados.js)
 */

// ----- PONTE DA TRANSIÇÃO (etapa 4): funções publicadas logo no início, como num script comum -----
Object.assign(window, { obterHistoricoLocal, obterListaHistoricoComparador, salvarHistoricoLocal, resolverNomeMercado, obterIdCompra, formatarDataHistoricoLegivel });

export function obterHistoricoLocal() {
  try {
    // chaves antigas (sc_purchase_history...) já foram migradas em armazenamento.js
    return Armazenamento.lerLista(CHAVES.HISTORICO).map(normalizarCompra);
  } catch (e) {
    console.warn('[Historico] Dados corrompidos encontrados, reiniciando lista vazia:', e);
    return [];
  }
}

// Lista usada pelo comparador. Normaliza porque o purchaseHistory também chega pelo Drive,
// às vezes com registros de versões antigas (itens/nome/quantidade...).
export function obterListaHistoricoComparador() {
  const lista = (typeof purchaseHistory !== 'undefined' && Array.isArray(purchaseHistory))
    ? purchaseHistory
    : Armazenamento.lerLista(CHAVES.HISTORICO);
  return lista.map(normalizarCompra);
}

export function salvarHistoricoLocal(lista) {
  window.purchaseHistory = lista;
  if (typeof purchaseHistory !== 'undefined') purchaseHistory = lista;
  Armazenamento.gravarJSON(CHAVES.HISTORICO, lista);
  Eventos.avisar(AVISOS.DADOS_SALVOS, { quais: 'historico' });
}

export function resolverNomeMercado(compra) {
  if (compra.marketName && compra.marketName !== 'Mercado' && compra.marketName.trim().length > 0) {
    return compra.marketName;
  }
  if (compra.mercadoNome && compra.mercadoNome !== 'Mercado' && compra.mercadoNome.trim().length > 0) {
    return compra.mercadoNome;
  }
  const listaMercados = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets))
    ? supermarkets
    : (Array.isArray(window.supermarkets) ? window.supermarkets : []);

  if (compra.marketId && listaMercados.length > 0) {
    const m = listaMercados.find(x => x.id === compra.marketId);
    if (m && m.name) return m.name + (m.branch ? ` (${m.branch})` : '');
  }
  return 'Supermercado (Referência Geral)';
}

export function obterIdCompra(compra, idx) {
  if (!compra.id) {
    compra.id = 'pur-' + (compra.date || compra.dataISO || Date.now()) + '-' + idx;
  }
  return String(compra.id);
}

// Formatação legível de data (DD/MM/AAAA HH:mm)
export function formatarDataHistoricoLegivel(dataStr) {
  if (!dataStr) return 'Data não informada';
  try {
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return String(dataStr);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch (e) {
    return String(dataStr);
  }
}
