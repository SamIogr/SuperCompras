/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - ESTADO GLOBAL E PERSISTÊNCIA (js/state.js)
 */

import { variavelGlobal } from './compartilhado.js';
import { AVISOS, Eventos } from './eventos.js';
import { Armazenamento, CHAVES } from './armazenamento.js';

export const API_GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxRfZ-hImEkXNgJGd6seMhVULwnpkp3tR-Ll-uXeaWRe8ZhcX_jvImmUl-G0SBTHnnV/exec";
// false = chave vai na URL (?token=), como sempre foi.
// true  = chave vai no corpo de um POST (não fica em histórico nem em logs de URL).
//         Exige o Apps Script com doPost que também devolve o catálogo (sem "action").
export const API_TOKEN_VIA_POST = true;

export const MERCADO_PADRAO_GENERICO = {
  id: 'm-padrao',
  name: 'Mercado',
  branch: 'Referência Geral',
  address: '',
  promoDay: '',
  urlEncarte: '',
  colIndex: null
};

// DECLARAÇÃO ÚNICA DA BASE DE ITENS FREQUENTES (SEM PREÇO E COM MARCA PADRÃO)
export const ITENS_BASICOS_SUGERIDOS = [
  // Mercearia e Básicos
  { name: 'Arroz Branco', category: 'Mercearia e Básicos', unit: 'kg' },
  { name: 'Feijão Carioca', category: 'Mercearia e Básicos', unit: 'kg' },
  { name: 'Feijão Preto', category: 'Mercearia e Básicos', unit: 'kg' },
  { name: 'Açúcar Refinado', category: 'Mercearia e Básicos', unit: 'kg' },
  { name: 'Sal Refinado', category: 'Mercearia e Básicos', unit: 'kg' },
  { name: 'Café Torrado e Moído', category: 'Mercearia e Básicos', unit: 'un' },
  { name: 'Óleo de Soja', category: 'Mercearia e Básicos', unit: 'un' },
  { name: 'Farinha de Trigo', category: 'Mercearia e Básicos', unit: 'kg' },
  { name: 'Macarrão Espaguete', category: 'Mercearia e Básicos', unit: 'un' },
  { name: 'Molho de Tomate', category: 'Mercearia e Básicos', unit: 'un' },
  { name: 'Fubá Mimoso', category: 'Mercearia e Básicos', unit: 'un' },

  // Açougue e Carnes
  { name: 'Peito de Frango', category: 'Açougue e Carnes', unit: 'kg' },
  { name: 'Filé Sassami', category: 'Açougue e Carnes', unit: 'kg' },
  { name: 'Carne Moída de Primeira', category: 'Açougue e Carnes', unit: 'kg' },
  { name: 'Acém', category: 'Açougue e Carnes', unit: 'kg' },
  { name: 'Bisteca Suína', category: 'Açougue e Carnes', unit: 'kg' },
  { name: 'Linguiça Calabresa', category: 'Açougue e Carnes', unit: 'kg' },

  // Laticínios e Frios
  { name: 'Leite Integral', category: 'Laticínios e Frios', unit: 'un' },
  { name: 'Queijo Mussarela', category: 'Laticínios e Frios', unit: 'kg' },
  { name: 'Presunto Cozido', category: 'Laticínios e Frios', unit: 'kg' },
  { name: 'Manteiga com Sal', category: 'Laticínios e Frios', unit: 'un' },
  { name: 'Margarina', category: 'Laticínios e Frios', unit: 'un' },
  { name: 'Creme de Leite', category: 'Laticínios e Frios', unit: 'un' },
  { name: 'Leite Condensado', category: 'Laticínios e Frios', unit: 'un' },

  // Hortifrúti e Ovos
  { name: 'Ovos Brancos', category: 'Hortifrúti e Ovos', unit: 'dz' },
  { name: 'Batata Inglesa', category: 'Hortifrúti e Ovos', unit: 'kg' },
  { name: 'Cebola Nacional', category: 'Hortifrúti e Ovos', unit: 'kg' },
  { name: 'Alho', category: 'Hortifrúti e Ovos', unit: 'kg' },
  { name: 'Tomate Longa Vida', category: 'Hortifrúti e Ovos', unit: 'kg' },
  { name: 'Banana Prata', category: 'Hortifrúti e Ovos', unit: 'kg' },
  { name: 'Maçã Nacional', category: 'Hortifrúti e Ovos', unit: 'kg' },

  // Higiene e Limpeza
  { name: 'Detergente Líquido', category: 'Higiene e Limpeza', unit: 'un' },
  { name: 'Sabão em Pó', category: 'Higiene e Limpeza', unit: 'un' },
  { name: 'Água Sanitária', category: 'Higiene e Limpeza', unit: 'un' },
  { name: 'Desinfetante', category: 'Higiene e Limpeza', unit: 'un' },
  { name: 'Papel Higiênico', category: 'Higiene e Limpeza', unit: 'un' },
  { name: 'Creme Dental', category: 'Higiene e Limpeza', unit: 'un' },
  { name: 'Sabonete em Barra', category: 'Higiene e Limpeza', unit: 'un' }
];

variavelGlobal('supermarkets', [ MERCADO_PADRAO_GENERICO ]);
variavelGlobal('products', []);
variavelGlobal('cart', []);
variavelGlobal('activeMarketId', 'm-padrao');
variavelGlobal('purchaseHistory', []);
variavelGlobal('currentTab', 'compras');
variavelGlobal('cartFilterMode', 'all');
let selectedCatalogCategory = 'Todas';
variavelGlobal('isSoundOn', true);
variavelGlobal('pendingSyncPayload', { produtos: [], supermercados: [] });
variavelGlobal('selectedSyncProducts', new Set());
variavelGlobal('selectedSyncMarkets', new Set());
variavelGlobal('activeSyncTab', 'produtos');
let catalogSyncFilter = 'all';
variavelGlobal('selectedCatalogProductIds', new Set());

export const CATEGORIES = [
  'Todas', 'Açougue e Carnes', 'Laticínios e Frios', 
  'Mercearia e Básicos', 'Hortifrúti e Ovos', 'Higiene e Limpeza', 'Geral'
];

export function parseNumberInput(val) {
  if (val === null || val === undefined || val === '') return 0;
  let s = String(val).trim().replace(/[^\d.,-]/g, '');
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');       // "1.299,90" -> "1299.90"
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');                          // "1.299.900" -> "1299900"
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function formatBRL(num) {
  return (Number(num) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatQty(num) {
  const n = Number(num) || 0;
  return n % 1 === 0 ? n.toString() : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

// ID único para itens criados no aparelho. Mantém o prefixo ('p-custom-', 'm-custom-'...)
// porque o app usa ele para saber a origem do item. randomUUID evita colisão entre aparelhos
// sincronizando pelo Drive (Date.now() sozinho pode repetir); o fallback cobre http sem HTTPS.
export function novoId(prefixo) {
  const aleatorio = (window.crypto && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  return (prefixo || '') + aleatorio;
}

// ===== UNIDADES DOS ITENS DA LISTA DE COMPRAS =====
// Mesma lista no formulário de adicionar (index.html) e no modal de edição do item.
export const UNIDADES = Object.freeze([
  ['kg', 'kg (Quilo)'], ['un', 'un (Unidade)'], ['pct', 'pct (Pacote)'], ['cx', 'cx (Caixa)'],
  ['pt', 'pt (Pote)'], ['lt', 'lt (Lata)'], ['gf', 'gf (Garrafa)'], ['dz', 'dz (Dúzia)'],
]);

export function ehUnidadeDePeso(unidade) {
  const u = String(unidade || '').trim().toLowerCase();
  return u === 'kg' || u === 'g' || u === 'quilo';
}

/** <option>s de unidade; se o item usa uma unidade fora da lista (ex.: 'ml' do catálogo), ela entra também. */
export function opcoesUnidadeHtml(selecionada) {
  const atual = String(selecionada || 'un').trim();
  const lista = UNIDADES.some(([v]) => v === atual) ? UNIDADES : [[atual, atual], ...UNIDADES];
  return lista.map(([v, rotulo]) =>
    `<option value="${esc(v)}"${v === atual ? ' selected' : ''}>${esc(rotulo)}</option>`).join('');
}

export function getSecurityToken() {
  return Armazenamento.lerTexto(CHAVES.TOKEN_PLANILHA, '') || '';
}

export function getSelectedMarketName() {
  const m = supermarkets.find(x => x.id === activeMarketId);
  return m ? m.name : 'Mercado';
}

// ===== NORMALIZAÇÃO DE DADOS =====
// Versões antigas, backups e outros aparelhos gravaram os mesmos campos com nomes diferentes
// (nome/name, quantidade/quantity, itens/items...). Estas funções garantem o nome PADRÃO
// (em inglês, como o resto do app) logo na entrada, para o código não precisar de
// "it.name || it.nome || ..." em todo lugar.
// Regras: só preenchem o campo padrão quando ele está vazio; nunca apagam os campos antigos
// (backups antigos e o Drive continuam entendendo os registros); não criam id de compra,
// porque o Drive identifica compras por id || date || dataISO.
function _vazio(v) { return v === undefined || v === null || v === ''; }
function _num(v) { return typeof v === 'number' ? (isFinite(v) ? v : 0) : parseNumberInput(v); }

export function normalizarItem(it) {
  if (!it || typeof it !== 'object') return it;
  if (_vazio(it.name)) it.name = it.nome || '';
  if (_vazio(it.quantity)) it.quantity = !_vazio(it.quantidade) ? it.quantidade : 1;
  it.quantity = _num(it.quantity);
  if (_vazio(it.unitPrice)) it.unitPrice = !_vazio(it.price) ? it.price : (it.precoUnitario || 0);
  it.unitPrice = _num(it.unitPrice);
  if (_vazio(it.selectedBrandId)) it.selectedBrandId = it.brand || it.marca || 'Padrão';
  if (_vazio(it.unit)) it.unit = it.unidade || 'un';
  return it;
}

export function normalizarCompra(c) {
  if (!c || typeof c !== 'object') return c;
  if (!Array.isArray(c.items)) c.items = Array.isArray(c.itens) ? c.itens : [];
  c.items.forEach(normalizarItem);
  if (_vazio(c.date)) c.date = c.dataISO || c.data || '';
  if (_vazio(c.marketName) && c.mercadoNome) c.marketName = c.mercadoNome;
  return c;
}

export function normalizarProduto(p) {
  if (!p || typeof p !== 'object') return p;
  if (_vazio(p.name)) p.name = p.nome || '';
  p.name = String(p.name).trim();
  if (_vazio(p.category)) p.category = p.categoria || 'Geral';
  if (_vazio(p.unit)) p.unit = p.unidade || 'un';
  p.basePrice = _num(p.basePrice);
  if (!p.marketPrices || typeof p.marketPrices !== 'object') p.marketPrices = {};
  if (!Array.isArray(p.brands)) p.brands = [];
  return p;
}

export function normalizarDados() {
  if (Array.isArray(products)) products.forEach(normalizarProduto);
  if (Array.isArray(cart)) cart.forEach(normalizarItem);
  if (Array.isArray(purchaseHistory)) purchaseHistory.forEach(normalizarCompra);
}

export function loadApplicationData() {
  const savedM = Armazenamento.lerLista(CHAVES.MERCADOS);
  if (savedM.length > 0) {
    supermarkets = savedM;
    if (!supermarkets.some((m) => m && m.id === "m-padrao"))
      supermarkets.unshift(MERCADO_PADRAO_GENERICO);
  } else {
    supermarkets = [MERCADO_PADRAO_GENERICO];
  }

  // remove produtos repetidos pelo nome (o app trata o nome como identidade)
  const mapaUnico = new Map();
  Armazenamento.lerLista(CHAVES.PRODUTOS).forEach((item) => {
    if (item && typeof item.name === 'string' && item.name) {
      const chave = item.name.trim().toLowerCase();
      if (!mapaUnico.has(chave)) mapaUnico.set(chave, item);
    }
  });
  products = Array.from(mapaUnico.values());

  // INSERÇÃO AUTOMÁTICA SE A BASE ESTIVER TOTALMENTE VAZIA
  if (!Array.isArray(products) || products.length === 0) {
    products = ITENS_BASICOS_SUGERIDOS.map((it, idx) => ({
      id: novoId('p-custom-'),
      name: it.name,
      category: it.category,
      unit: it.unit,
      basePrice: 0,
      marketPrices: { "m-padrao": 0 },
      brands: [],
    }));
  }

  cart = Armazenamento.lerLista(CHAVES.CARRINHO);
  purchaseHistory = Armazenamento.lerLista(CHAVES.HISTORICO);

  const savedActiveMarket = Armazenamento.lerTexto(CHAVES.MERCADO_ATIVO);
  if (
    savedActiveMarket &&
    supermarkets.some((m) => m.id === savedActiveMarket)
  ) {
    activeMarketId = savedActiveMarket;
  } else {
    activeMarketId = "m-padrao";
  }

  normalizarDados();
  saveAllLocalData();
}

export function saveAllLocalData() {
  Armazenamento.gravarJSON(CHAVES.MERCADOS, supermarkets);
  Armazenamento.gravarJSON(CHAVES.PRODUTOS, products);
  Armazenamento.gravarTexto(CHAVES.MERCADO_ATIVO, activeMarketId);
  Armazenamento.gravarJSON(CHAVES.CARRINHO, cart);
  Armazenamento.gravarJSON(CHAVES.HISTORICO, purchaseHistory);
  Eventos.avisar(AVISOS.DADOS_SALVOS, { quais: 'tudo' });
}

export function saveCartData() {
  Armazenamento.gravarJSON(CHAVES.CARRINHO, cart);
  Eventos.avisar(AVISOS.CARRINHO_SALVO);   // a tela do carrinho ouve e redesenha (templates.js)
}

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Argumento de texto para handlers inline (onclick="f(${jsArg(id)})").
// esc() sozinho não basta ali: o navegador decodifica &#39; de volta para ' antes de rodar o JS.
// JSON.stringify gera um literal JS seguro e esc() o protege dentro do atributo HTML.
export function jsArg(v) {
  return esc(JSON.stringify(String(v ?? '')));
}

