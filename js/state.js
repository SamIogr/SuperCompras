/**
 * SUPERCOMPRAS PRO - ESTADO GLOBAL E PERSISTÊNCIA (js/state.js)
 */
const API_GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxRfZ-hImEkXNgJGd6seMhVULwnpkp3tR-Ll-uXeaWRe8ZhcX_jvImmUl-G0SBTHnnV/exec";

const MERCADO_PADRAO_GENERICO = {
  id: 'm-padrao',
  name: 'Mercado',
  branch: 'Referência Geral',
  address: '',
  promoDay: '',
  urlEncarte: '',
  colIndex: null
};

// DECLARAÇÃO ÚNICA DA BASE DE ITENS FREQUENTES (SEM PREÇO E COM MARCA PADRÃO)
window.ITENS_BASICOS_SUGERIDOS = [
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
  { name: 'Acém em Pedaço', category: 'Açougue e Carnes', unit: 'kg' },
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

let supermarkets = [ MERCADO_PADRAO_GENERICO ];
let products = [];
let cart = [];
let activeMarketId = 'm-padrao';
let purchaseHistory = [];
let currentTab = 'compras';
let cartFilterMode = 'all';
let selectedCatalogCategory = 'Todas';
let isSoundOn = true;
let pendingSyncPayload = { produtos: [], supermercados: [] };
let selectedSyncProducts = new Set();
let selectedSyncMarkets = new Set();
let activeSyncTab = 'produtos';
let catalogSyncFilter = 'all';
window.selectedCatalogProductIds = new Set();

const CATEGORIES = [
  'Todas', 'Açougue e Carnes', 'Laticínios e Frios', 
  'Mercearia e Básicos', 'Hortifrúti e Ovos', 'Higiene e Limpeza', 'Geral'
];

function parseNumberInput(val) {
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

function formatBRL(num) {
  return (Number(num) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(num) {
  const n = Number(num) || 0;
  return n % 1 === 0 ? n.toString() : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function getSecurityToken() {
  return localStorage.getItem('sc_security_token') || '';
}

function getSelectedMarketName() {
  const m = supermarkets.find(x => x.id === activeMarketId);
  return m ? m.name : 'Mercado';
}

function loadApplicationData() {
  try {
    const savedM = JSON.parse(localStorage.getItem('sc_supermarkets_v3'));
    if (Array.isArray(savedM) && savedM.length > 0) {
      supermarkets = savedM;
      if (!supermarkets.some(m => m.id === 'm-padrao')) supermarkets.unshift(MERCADO_PADRAO_GENERICO);
    } else {
      supermarkets = [ MERCADO_PADRAO_GENERICO ];
    }
  } catch (e) {
    supermarkets = [ MERCADO_PADRAO_GENERICO ];
  }

  try {
    const savedP = localStorage.getItem('sc_products_v3');
    if (savedP) {
      products = JSON.parse(savedP) || [];
      const mapaUnico = new Map();
      products.forEach(item => {
        if (item && item.name) {
          const chave = item.name.trim().toLowerCase();
          if (!mapaUnico.has(chave)) mapaUnico.set(chave, item);
        }
      });
      products = Array.from(mapaUnico.values());
    } else {
      products = [];
    }
  } catch (e) { products = []; }

  // INSERÇÃO AUTOMÁTICA SE A BASE ESTIVER TOTALMENTE VAZIA
  if (!Array.isArray(products) || products.length === 0) {
    products = window.ITENS_BASICOS_SUGERIDOS.map((it, idx) => ({
      id: 'p-custom-' + Date.now() + '-' + idx,
      name: it.name,
      category: it.category,
      unit: it.unit,
      basePrice: 0,
      marketPrices: { 'm-padrao': 0 },
      brands: []
    }));
  }

  try { cart = JSON.parse(localStorage.getItem('sc_cart_v3')) || []; } catch (e) { cart = []; }
  try { purchaseHistory = JSON.parse(localStorage.getItem('sc_history_v3')) || []; } catch (e) { purchaseHistory = []; }

  const savedActiveMarket = localStorage.getItem('sc_active_market_v3');
  if (savedActiveMarket && supermarkets.some(m => m.id === savedActiveMarket)) {
    activeMarketId = savedActiveMarket;
  } else {
    activeMarketId = 'm-padrao';
  }

  saveAllLocalData();
}

function saveAllLocalData() {
  localStorage.setItem('sc_supermarkets_v3', JSON.stringify(supermarkets));
  localStorage.setItem('sc_products_v3', JSON.stringify(products));
  localStorage.setItem('sc_active_market_v3', activeMarketId);
  localStorage.setItem('sc_cart_v3', JSON.stringify(cart));
  localStorage.setItem('sc_history_v3', JSON.stringify(purchaseHistory));
}

function saveCartData() {
  localStorage.setItem('sc_cart_v3', JSON.stringify(cart));
  if (typeof renderCartUI === 'function') renderCartUI();
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
window.esc = esc;