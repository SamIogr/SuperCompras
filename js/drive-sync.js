/**
 * SUPERCOMPRAS PRO (Backup e Sincronização Google Drive)
 * Arquivo: js/drive-sync.js
 */

const DRIVE_CLIENT_ID = '1005329591365-p2ibvui3iq1ssqgmrj4hb02pc3bqgabb.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_ARQUIVO = 'supercompras_backup.json';
const DRIVE_FLAG_KEY = 'sc_drive_conectado';
const DRIVE_EMAIL_KEY = 'sc_drive_email';

let _driveToken = null;
let _driveTokenExp = 0;
let _driveSincronizando = false;

// 1. CARREGAMENTO DA BIBLIOTECA DO GOOGLE
function driveCarregarGIS() {
  return new Promise((resolve, reject) => {
    if (window.google && google.accounts && google.accounts.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Sem conexão para carregar autenticação do Google.'));
    document.head.appendChild(s);
  });
}

async function driveObterToken(interativo) {
  if (_driveToken && Date.now() < _driveTokenExp - 60000) return _driveToken;
  
  await driveCarregarGIS();

  return new Promise((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: DRIVE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if (!resp || resp.error) {
            return reject(new Error(resp?.error || 'login_cancelado'));
          }
          _driveToken = resp.access_token;
          _driveTokenExp = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
          resolve(_driveToken);
        },
        error_callback: (err) => {
          reject(new Error(err?.type || 'popup_fechado'));
        }
      });

      if (interativo) {
        client.requestAccessToken();
      } else {
        reject(new Error('sync_interativo_obrigatorio'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

// 2. COMUNICAÇÃO HTTP COM A PASTA OCULTA DO DRIVE
async function driveFetch(url, opcoes, token) {
  const r = await fetch(url, {
    ...(opcoes || {}),
    headers: { ...((opcoes && opcoes.headers) || {}), Authorization: 'Bearer ' + token }
  });
  if (r.status === 401) {
    _driveToken = null;
    throw new Error('sessao_expirada');
  }
  if (!r.ok) throw new Error('Drive HTTP ' + r.status);
  return r;
}

async function driveAcharArquivo(token) {
  const q = encodeURIComponent("name='" + DRIVE_ARQUIVO + "' and trashed=false");
  const r = await driveFetch(
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=' + q + '&fields=files(id,name)&pageSize=1',
    {}, token
  );
  const j = await r.json();
  return (j.files && j.files[0]) || null;
}

async function driveBaixarArquivo(token, id) {
  const r = await driveFetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media', {}, token);
  return r.json();
}

async function driveGravarArquivo(token, arquivoId, conteudo) {
  if (arquivoId) {
    await driveFetch(
      'https://www.googleapis.com/upload/drive/v3/files/' + arquivoId + '?uploadType=media',
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: conteudo },
      token
    );
  } else {
    const limite = 'sc_' + Math.random().toString(36).slice(2);
    const meta = { name: DRIVE_ARQUIVO, parents: ['appDataFolder'], mimeType: 'application/json' };
    const corpo =
      '--' + limite + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) +
      '\r\n--' + limite + '\r\nContent-Type: application/json\r\n\r\n' + conteudo +
      '\r\n--' + limite + '--';
    await driveFetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + limite }, body: corpo },
      token
    );
  }
}

// 3. MESCLAGEM INTELIGENTE DE PRODUTOS E DADOS
function extrairEspecificacaoQuantidade(nome, unidade) {
  const n = (nome || '').toLowerCase().trim();
  const u = (unidade || '').toLowerCase().trim();

  const regexMedida = /(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|rolos|rolo|dz|duzia|duzias|un|pct|cx)\b/;
  const match = n.match(regexMedida);
  if (match) {
    const valor = parseFloat(match[1].replace(',', '.'));
    const unid = match[2];
    if (unid === 'g') return { valor: valor / 1000, unidade: 'kg' };
    if (unid === 'ml') return { valor: valor / 1000, unidade: 'l' };
    if (unid === 'rolo' || unid === 'rolos') return { valor: valor, unidade: 'rolos' };
    if (unid === 'dz' || unid === 'duzia' || unid === 'duzias') return { valor: valor * 12, unidade: 'un' };
    return { valor: valor, unidade: unid };
  }

  const matchFim = n.match(/\b(\d+)\s*$/);
  if (matchFim) {
    return { valor: parseFloat(matchFim[1]), unidade: 'un' };
  }

  if (u === 'dz' || u === 'dúzia' || u === 'duzia') {
    return { valor: 12, unidade: 'un' };
  }

  return { valor: null, unidade: u };
}

function saoQuantidadesDivergentes(p1, p2) {
  const m1 = extrairEspecificacaoQuantidade(p1.name, p1.unit);
  const m2 = extrairEspecificacaoQuantidade(p2.name, p2.unit);

  if (m1.valor !== null && m2.valor !== null) {
    if (m1.unidade === m2.unidade && Math.abs(m1.valor - m2.valor) > 0.001) {
      return true;
    }
    if (m1.unidade !== m2.unidade) {
      return true;
    }
  }

  if ((m1.valor !== null && m2.valor === null) || (m2.valor !== null && m1.valor === null)) {
    const fixo = m1.valor !== null ? m1.valor : m2.valor;
    if (fixo > 0) return true;
  }

  if (m1.unidade && m2.unidade && m1.unidade !== m2.unidade) {
    const pesoVolume = ['kg', 'l'];
    const fracionado = ['un', 'pct', 'cx', 'dz'];
    if ((pesoVolume.includes(m1.unidade) && fracionado.includes(m2.unidade)) ||
        (pesoVolume.includes(m2.unidade) && fracionado.includes(m1.unidade))) {
      return true;
    }
  }

  return false;
}

function gerarChaveCanonicaProduto(nome) {
  let s = (nome || '').toLowerCase().trim();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[(),/\-]/g, ' ');
  s = s.replace(/\b\d+(?:[.,]\d+)?\s*(kg|g|l|ml|rolos|rolo|un|dz|pct|cx)\b/g, '');
  s = s.replace(/\b\d+\b/g, '');

  const sufixosGenericos = [
    'em pedaco', 'em pedacos', 'nacional', 'longa vida', 'liquido', 
    'de primeira', 'torrado e moido', 'branca', 'brancas', 'vermelha'
  ];
  sufixosGenericos.forEach(termo => {
    s = s.replace(new RegExp('\\b' + termo + '\\b', 'g'), '');
  });

  return s.replace(/\s+/g, ' ').trim();
}

function mesclarCatalogosDeProdutos(listaAtual, listaRecebida) {
  const uniao = [...(Array.isArray(listaAtual) ? listaAtual : []), ...(Array.isArray(listaRecebida) ? listaRecebida : [])];

  // Prioriza itens da Planilha (PROD-) como registros pais
  uniao.sort((a, b) => {
    const aSheet = String(a.id || '').startsWith('PROD-') || Boolean(a.inSheet);
    const bSheet = String(b.id || '').startsWith('PROD-') || Boolean(b.inSheet);
    return (bSheet ? 1 : 0) - (aSheet ? 1 : 0);
  });

  const consolidados = [];

  uniao.forEach(prod => {
    if (!prod || !prod.name) return;

    const chaveProd = gerarChaveCanonicaProduto(prod.name);

    // 1. Tenta correspondência direta de chave canônica
    let existente = consolidados.find(c => {
      const chaveC = gerarChaveCanonicaProduto(c.name);
      if (chaveProd !== chaveC) return false;
      if (saoQuantidadesDivergentes(prod, c)) return false;
      return true;
    });

    let marcaDetectada = null;

    // 2. Se não achou por igualdade, verifica se prod é uma variação de marca de um item pai
    // Ex: "Creme Dental Colgate" contra o pai "Creme Dental"
    if (!existente) {
      existente = consolidados.find(c => {
        const chavePai = gerarChaveCanonicaProduto(c.name);
        if (chaveProd.startsWith(chavePai + ' ') && !saoQuantidadesDivergentes(prod, c)) {
          marcaDetectada = prod.name.trim().substring(c.name.trim().length).trim();
          return true;
        }
        return false;
      });
    }

    if (!existente) {
      consolidados.push({
        id: prod.id || ('p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
        name: prod.name.trim(),
        category: prod.category || 'Geral',
        unit: prod.unit || 'un',
        basePrice: Number(prod.basePrice) || 0,
        marketPrices: { ...(prod.marketPrices || {}) },
        brands: Array.isArray(prod.brands) ? [...prod.brands] : [],
        inSheet: Boolean(prod.inSheet || String(prod.id).startsWith('PROD-')),
        inDrive: Boolean(prod.inDrive)
      });
    } else {
      // Herda cotações base se zeradas
      if (Number(existente.basePrice) === 0 && Number(prod.basePrice) > 0) {
        existente.basePrice = Number(prod.basePrice);
      }

      // Mescla cotações de mercado
      if (prod.marketPrices && typeof prod.marketPrices === 'object') {
        Object.entries(prod.marketPrices).forEach(([mId, preco]) => {
          if (Number(preco) > 0) existente.marketPrices[mId] = Number(preco);
        });
      }

      // Se detectou que o produto avulso era na verdade uma marca (ex: Colgate)
      if (marcaDetectada) {
        if (!Array.isArray(existente.brands)) existente.brands = [];
        const jaExisteMarca = existente.brands.some(b => (b.name || b.id || '').toLowerCase() === marcaDetectada.toLowerCase());
        if (!jaExisteMarca) {
          existente.brands.push({
            id: marcaDetectada,
            name: marcaDetectada,
            marketPrices: { ...(prod.marketPrices || {}) }
          });
        }
      }

      // Mescla marcas adicionais já existentes no registro
      if (Array.isArray(prod.brands)) {
        prod.brands.forEach(bNova => {
          const nomeNova = (typeof bNova === 'string' ? bNova : (bNova.name || bNova.id || '')).trim();
          if (!nomeNova || nomeNova.toLowerCase() === 'padrão') return;
          const jaTem = existente.brands.some(b => (b.name || b.id || '').toLowerCase() === nomeNova.toLowerCase());
          if (!jaTem) existente.brands.push(bNova);
        });
      }

      if (prod.inSheet || String(prod.id).startsWith('PROD-')) existente.inSheet = true;
      if (prod.inDrive) existente.inDrive = true;
    }
  });

  return consolidados;
}
window.mesclarCatalogosDeProdutos = mesclarCatalogosDeProdutos;

function consolidarHistoricoSeguro(histLocal, histRemoto) {
  const mapa = new Map();
  const todos = [...(Array.isArray(histLocal) ? histLocal : []), ...(Array.isArray(histRemoto) ? histRemoto : [])];

  todos.forEach(item => {
    if (!item) return;
    const chave = String(item.id || item.date || Math.random());
    if (!mapa.has(chave)) {
      mapa.set(chave, item);
    }
  });

  return Array.from(mapa.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function consolidarMercadosSeguro(mercadosLocais, mercadosRemotos) {
  const mapa = new Map();
  [...(mercadosLocais || []), ...(mercadosRemotos || [])].forEach(m => {
    if (!m || !m.name) return;
    const chave = m.id || m.name.trim().toLowerCase();
    if (!mapa.has(chave)) {
      mapa.set(chave, { ...m });
    } else {
      const existente = mapa.get(chave);
      if (m.inSheet || m.colIndex) existente.inSheet = true;
      if (m.inDrive) existente.inDrive = true;
      if (m.colIndex && !existente.colIndex) existente.colIndex = m.colIndex;
      if (m.address && !existente.address) existente.address = m.address;
      if (m.promoDay && !existente.promoDay) existente.promoDay = m.promoDay;
    }
  });
  return Array.from(mapa.values());
}

// 4. FLUXO PRINCIPAL DE SINCRONIZAÇÃO
async function driveSincronizar(interativo = false) {
  if (_driveSincronizando) return;
  _driveSincronizando = true;
  driveStatus('Sincronizando com Google Drive...');

  try {
    const token = await driveObterToken(interativo);

    const arquivoExistente = await driveAcharArquivo(token);
    let dadosRemotos = null;

    if (arquivoExistente) {
      dadosRemotos = await driveBaixarArquivo(token, arquivoExistente.id);
    }

    if (dadosRemotos && Array.isArray(dadosRemotos.products)) {
      products = mesclarCatalogosDeProdutos(products, dadosRemotos.products);
    } else {
      products = mesclarCatalogosDeProdutos([], products);
    }

    const historicoAtual = Array.isArray(purchaseHistory) ? purchaseHistory : [];
    const historicoRemoto = (dadosRemotos && Array.isArray(dadosRemotos.purchaseHistory)) ? dadosRemotos.purchaseHistory : [];
    purchaseHistory = consolidarHistoricoSeguro(historicoAtual, historicoRemoto);
    if (Array.isArray(window.purchaseHistory)) {
      window.purchaseHistory = purchaseHistory;
    }

    if (dadosRemotos && Array.isArray(dadosRemotos.supermarkets)) {
      supermarkets = consolidarMercadosSeguro(supermarkets, dadosRemotos.supermarkets);
    }

    if (Array.isArray(products)) {
      products.forEach(p => {
        p.inDrive = true;
        if (String(p.id).startsWith('PROD-')) p.inSheet = true;
      });
    }
    // Marca origem dos produtos
    if (Array.isArray(products)) {
      products.forEach(p => {
        p.inDrive = true;
        if (String(p.id).startsWith('PROD-')) p.inSheet = true;
      });
    }

    // Marca origem dos supermercados
    if (Array.isArray(supermarkets)) {
      supermarkets.forEach(m => {
        m.inDrive = true;
        if (m.colIndex || (m.id && !String(m.id).startsWith('m-custom-'))) {
          m.inSheet = true;
        }
      });
    }

    if (typeof saveAllLocalData === 'function') saveAllLocalData();
    localStorage.setItem('sc_purchase_history', JSON.stringify(purchaseHistory));
    localStorage.setItem('sc_products', JSON.stringify(products));
    localStorage.setItem('sc_supermarkets', JSON.stringify(supermarkets));

    const payloadParaNuvem = JSON.stringify({
      app: 'SuperComprasPro',
      versao: 2,
      atualizadoEm: new Date().toISOString(),
      products: products,
      supermarkets: supermarkets,
      purchaseHistory: purchaseHistory
    });

    await driveGravarArquivo(token, arquivoExistente ? arquivoExistente.id : null, payloadParaNuvem);

    localStorage.setItem(DRIVE_FLAG_KEY, '1');
    await driveAtualizarConta(token);

    driveStatus('Sincronizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    if (interativo && typeof showAppToast === 'function') {
      showAppToast('Sincronização com Google Drive concluída!', 'success');
    }

    if (typeof renderCatalogUI === 'function') renderCatalogUI();
    if (typeof renderMarketsUI === 'function') renderMarketsUI();
    if (typeof renderHistoricoUI === 'function') renderHistoricoUI();
    if (typeof renderCartUI === 'function') renderCartUI();

  } catch (err) {
    if (err.message !== 'sync_interativo_obrigatorio') {
      console.warn('[Drive] Erro durante o processo:', err);
      driveStatus('Falha ao conectar no Google. Verifique a internet e tente pelo botão.', true);
    }
  } finally {
    _driveSincronizando = false;
  }
}

// 5. INTERFACE DO MODAL E STATUS
function driveStatus(texto, erro = false) {
  const el = document.getElementById('driveSyncStatus');
  if (!el) return;
  el.textContent = texto;
  el.className = 'text-[11px] font-semibold ' + (erro ? 'text-rose-600' : 'text-slate-500');
}

function driveMostrarConta() {
  const conectado = !!localStorage.getItem(DRIVE_FLAG_KEY);
  const email = localStorage.getItem(DRIVE_EMAIL_KEY);
  const elConta = document.getElementById('driveSyncConta');
  if (elConta) elConta.textContent = conectado ? ('Conta: ' + (email || 'Conectada')) : 'Não conectado';
  const btnDes = document.getElementById('driveBtnDesconectar');
  if (btnDes) btnDes.classList.toggle('hidden', !conectado);
}

async function driveAtualizarConta(token) {
  try {
    const r = await driveFetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {}, token);
    const u = await r.json();
    if (u.user && u.user.emailAddress) {
      localStorage.setItem(DRIVE_EMAIL_KEY, u.user.emailAddress);
    }
  } catch (e) {}
  driveMostrarConta();
}

function driveDesconectar() {
  try {
    if (_driveToken && window.google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(_driveToken, () => {});
    }
  } catch (e) {}
  _driveToken = null;
  _driveTokenExp = 0;
  localStorage.removeItem(DRIVE_FLAG_KEY);
  localStorage.removeItem(DRIVE_EMAIL_KEY);
  driveMostrarConta();
  driveStatus('Desconectado.');
}

window.driveSincronizar = driveSincronizar;
window.driveDesconectar = driveDesconectar;

window.openDriveSyncModal = function() {
  const m = document.getElementById('modalDriveSync');
  if (m) {
    m.classList.remove('hidden');
    m.style.removeProperty('display');
  }
  driveMostrarConta();
};

window.closeDriveSyncModal = function() {
  const m = document.getElementById('modalDriveSync');
  if (m) m.classList.add('hidden');
};

window.addEventListener('DOMContentLoaded', () => {
  driveMostrarConta();
});