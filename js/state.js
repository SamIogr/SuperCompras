/**
 * SUPERCOMPRAS PRO - ESTADO GLOBAL E PERSISTÊNCIA
 */
const API_GOOGLE_SHEETS_URL = "";

const MERCADO_PADRAO_GENERICO = {
  id: 'm-padrao',
  name: 'Mercado',
  branch: 'Referência Geral',
  address: '',
  promoDay: '',
  urlEncarte: '',
  colIndex: null
};

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
let selectedCatalogProductIds = new Set();

const CATEGORIES = [
  'Todas', 'Açougue e Carnes', 'Laticínios e Frios', 
  'Mercearia e Básicos', 'Hortifrúti e Ovos', 'Higiene e Limpeza', 'Geral'
];

function parseNumberInput(val) {
  if (!val) return 0;
  const limpo = String(val).trim().replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
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

function getIgnoredMarkets() {
  try { return JSON.parse(localStorage.getItem('sc_ignored_markets')) || []; } catch (e) { return []; }
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
    products = JSON.parse(localStorage.getItem('sc_products_v3')) || [];
    const mapaUnico = new Map();
    products.forEach(item => {
      if (item && item.name) {
        const chave = item.name.trim().toLowerCase();
        if (!mapaUnico.has(chave)) mapaUnico.set(chave, item);
      }
    });
    products = Array.from(mapaUnico.values());
  } catch (e) { products = []; }

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