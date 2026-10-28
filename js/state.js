// Constantes estruturais
const DEFAULT_SUPERMARKETS = [
  { id: 'm-max', name: 'Max Atacadista', branch: 'Afonso Pena / SJP', promoDay: 'Terça e Quarta de Hortifrúti', notes: 'Destaque em atacado, mercearia e limpeza.' },
  { id: 'm-goes', name: 'Supermercados Goes', branch: 'Afonso Pena / SJP', promoDay: 'Quinta da Carne e Terça da Feira', notes: 'Destaque em carnes e hortifrúti.' },
  { id: 'm-local', name: 'Local Supermercado', branch: 'Afonso Pena / SJP', promoDay: 'Terça a Quinta de Laticínios', notes: 'Destaque em laticínios e frios.' },
  { id: 'm-jacomar', name: 'Jacomar', branch: 'Afonso Pena / SJP', promoDay: 'Quinta da Carne e Terça da Feira', notes: 'Destaque em carnes, laticínios e hortifrúti.' },
  { id: 'm-atac', name: 'Atacadão', branch: 'Afonso Pena / SJP', promoDay: 'Fim de Semana de Mercearia', notes: 'Preços agressivos em fardos e pacotes fechados.' },
  { id: 'm-condor', name: 'Condor', branch: 'Afonso Pena / SJP', promoDay: 'Quarta de Hortifrúti e Quinta da Carne', notes: 'Destaque em carnes, laticínios e clube fidelidade.' },
  { id: 'm-stall', name: 'Stall Supermercados', branch: 'Afonso Pena / SJP', promoDay: 'Ofertas Diárias', notes: 'Rede regional do bairro Afonso Pena.' },
  { id: 'm-pgula', name: 'Ponto da Gula', branch: 'Afonso Pena / SJP', promoDay: 'Fim de Semana Básicos', notes: 'Destaque em itens básicos de mercearia.' }
];

const CATEGORIES = ['Todas', 'Açougue', 'Laticínios', 'Mercearia', 'Hortifrúti', 'Limpeza', 'Geral'];

// Estado volátil da aplicação
let products = [];
let supermarkets = [];
let cart = [];
let activeMarketId = 'm-max';
let purchaseHistory = [];
let currentTab = 'compras';
let cartFilterMode = 'all';
let selectedCatalogCategory = 'Todas';
let isSoundOn = true;

// Parsers e utilitários numéricos
function parseNumberInput(val) {
  if (!val) return 0;
  const clean = String(val).trim().replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function formatBRL(num) {
  return (Number(num) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(num) {
  const n = Number(num) || 0;
  return n % 1 === 0 ? n.toString() : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

// Persistência local no navegador
function loadApplicationData() {
  try {
    const savedMarkets = localStorage.getItem('sc_supermarkets_v3');
    supermarkets = savedMarkets ? JSON.parse(savedMarkets) : [...DEFAULT_SUPERMARKETS];
  } catch (e) {
    supermarkets = [...DEFAULT_SUPERMARKETS];
  }

  try {
    const savedProducts = localStorage.getItem('sc_products_v3');
    products = savedProducts ? JSON.parse(savedProducts) : [];
  } catch (e) {
    products = [];
  }

  const savedActiveMarket = localStorage.getItem('sc_active_market_v3');
  if (savedActiveMarket && supermarkets.some(m => m.id === savedActiveMarket)) {
    activeMarketId = savedActiveMarket;
  } else if (supermarkets.length > 0) {
    activeMarketId = supermarkets[0].id;
  }

  try {
    const savedCart = localStorage.getItem('sc_cart_v3');
    cart = savedCart ? JSON.parse(savedCart) : [];
  } catch (e) {
    cart = [];
  }

  try {
    const savedHist = localStorage.getItem('sc_history_v3');
    purchaseHistory = savedHist ? JSON.parse(savedHist) : [];
  } catch (e) {
    purchaseHistory = [];
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