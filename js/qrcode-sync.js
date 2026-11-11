/**
 * SUPERCOMPRAS PRO (Módulo de Compartilhamento e Leitura via QR Code)
 * Arquivo: js/qrcode-sync.js
 * 100% offline: usa js/vendor/qrcode.js (gerar) e js/vendor/jsQR.js (ler).
 */

// ===== CONFIGURAÇÕES =====
const QR_STORAGE_PREFIX = 'SC_QR_V1:';      // formato antigo (só leitura)
const QR_PREFIXO_COMPACTO = 'SC2:';         // novo, compactado com deflate
const QR_PREFIXO_SEM_COMPRESSAO = 'SC1:';   // novo, sem deflate (navegador antigo)
const QR_TAMANHO_PARTE = 600;               // caracteres por QR; menor = leitura mais fácil
const QR_SE_JA_NO_CARRINHO = 'somar';       // 'somar' = soma a quantidade | 'manter' = ignora o repetido

// ===== 0. UTILITÁRIOS =====
async function qrDeflate(texto) {
  const stream = new Blob([new TextEncoder().encode(texto)]).stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function qrInflate(bytes) {
  const stream = new Blob([bytes]).stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

function bytesParaB64Url(bytes) {
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlParaBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function normalizarNome(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function qrStatus(texto) {
  const el = document.getElementById('qrScannerStatus');
  if (el) el.innerText = texto;
}

// ===== 1. SERIALIZAÇÃO COMPACTA =====
// Formato: [mercadoId, [ [nome, qtd, unidade, preço, marca, marcado, promo], ... ]]
async function serializarCarrinhoParaQR() {
  if (!Array.isArray(cart) || cart.length === 0) return null;

  const itens = cart.map(item => {
    const promoOk = item.promo && item.promo.type && item.promo.type !== 'none';
    return [
      String(item.name || ''),
      item.quantity,
      item.unit && item.unit !== 'un' ? item.unit : '',
      Math.round((Number(item.unitPrice) || 0) * 100) / 100,
      item.selectedBrandId && item.selectedBrandId !== 'Padrão' ? item.selectedBrandId : '',
      item.checked ? 1 : 0,
      promoOk
        ? [item.promo.type, item.promo.value || 0, item.promo.wholesaleTrigger || 0, item.promo.wholesalePrice || 0]
        : 0
    ];
  });

  const json = JSON.stringify([activeMarketId || 'm-padrao', itens]);
  if (typeof CompressionStream === 'undefined') {
    return QR_PREFIXO_SEM_COMPRESSAO + bytesParaB64Url(new TextEncoder().encode(json));
  }
  return QR_PREFIXO_COMPACTO + bytesParaB64Url(await qrDeflate(json));
}

// ===== 2. DESSERIALIZAÇÃO E VALIDAÇÃO =====
// QR gerado pela versão antiga do app (mantido sem alterações)
function desserializarQRLegado(payloadTexto) {
  try {
    let raw = (payloadTexto || '').trim();
    if (raw.startsWith(QR_STORAGE_PREFIX)) {
      raw = raw.slice(QR_STORAGE_PREFIX.length);
    }
    const jsonStr = decodeURIComponent(escape(atob(raw)));
    const dados = JSON.parse(jsonStr);

    if (!dados || !Array.isArray(dados.items)) {
      throw new Error('Estrutura de lista inválida.');
    }

    const itensCarrinho = dados.items.map((it, idx) => ({
      id: 'c-qr-' + Date.now() + '-' + idx,
      name: it.n,
      quantity: Number(it.q) || 1,
      unit: it.u || 'un',
      unitPrice: Number(it.p) || 0,
      selectedBrandId: it.b || 'Padrão',
      checked: it.c === 1,
      promo: it.pr ? {
        type: it.pr.t,
        value: Number(it.pr.v) || 0,
        wholesaleTrigger: Number(it.pr.at) || 0,
        wholesalePrice: Number(it.pr.ap) || 0
      } : { type: 'none', value: 0, wholesaleTrigger: 0, wholesalePrice: 0 }
    }));

    return { marketId: dados.m || 'm-padrao', items: itensCarrinho };
  } catch (err) {
    console.error('[QR Sync] Falha ao decodificar QR Code:', err);
    return null;
  }
}

async function desserializarQRParaCarrinho(payloadTexto) {
  try {
    const raw = (payloadTexto || '').trim();
    const comprimido = raw.startsWith(QR_PREFIXO_COMPACTO);
    if (!comprimido && !raw.startsWith(QR_PREFIXO_SEM_COMPRESSAO)) {
      return desserializarQRLegado(raw);
    }

    const bytes = b64UrlParaBytes(raw.slice(4));
    let json;
    if (comprimido) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('Este navegador não abre QR compactado. Atualize o navegador.');
      }
      json = await qrInflate(bytes);
    } else {
      json = new TextDecoder().decode(bytes);
    }

    const dados = JSON.parse(json);
    if (!Array.isArray(dados) || !Array.isArray(dados[1]) || dados[1].length > 500) {
      throw new Error('Estrutura de lista inválida.');
    }

    const txt = (v, max = 80) => String(v ?? '').slice(0, max);
    const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

    const itens = dados[1].map((it, idx) => {
      if (!Array.isArray(it)) throw new Error('Item inválido.');
      const [n, q, u, p, b, c, pr] = it;
      const nome = txt(n).trim();
      if (!nome) return null;
      return {
        id: 'c-qr-' + Date.now() + '-' + idx,
        name: nome,
        quantity: num(q) > 0 ? num(q) : 1,
        unit: txt(u, 10) || 'un',
        unitPrice: Math.max(0, num(p)),
        selectedBrandId: txt(b, 60) || 'Padrão',
        checked: c === 1,
        promo: Array.isArray(pr)
          ? { type: txt(pr[0], 20), value: num(pr[1]), wholesaleTrigger: num(pr[2]), wholesalePrice: num(pr[3]) }
          : { type: 'none', value: 0, wholesaleTrigger: 0, wholesalePrice: 0 }
      };
    }).filter(Boolean);

    return { marketId: txt(dados[0], 60) || 'm-padrao', items: itens };
  } catch (err) {
    console.error('[QR Sync] Falha ao decodificar QR Code:', err);
    return null;
  }
}

// ===== 2.1 DIVISÃO EM VÁRIOS QR (listas grandes) =====
function dividirPayloadQR(payload, max = QR_TAMANHO_PARTE) {
  if (payload.length <= max) return [payload];
  const id = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  const tamanho = max - 16;                       // 16 = espaço do cabeçalho "SCP:id:1/3:"
  const total = Math.ceil(payload.length / tamanho);
  if (total > 99) return null;
  return Array.from({ length: total }, (_, i) =>
    `SCP:${id}:${i + 1}/${total}:` + payload.slice(i * tamanho, (i + 1) * tamanho));
}

let _qrPartes = { id: null, total: 0, partes: {} };
function qrReiniciarPartes() { _qrPartes = { id: null, total: 0, partes: {} }; }

function qrReceberParte(texto) {
  const m = /^SCP:([a-z0-9]{4}):(\d{1,2})\/(\d{1,2}):([\s\S]+)$/.exec((texto || '').trim());
  if (!m) return { pronto: true, payload: texto };          // QR único
  const idx = Number(m[2]), total = Number(m[3]);
  if (idx < 1 || idx > total) return { pronto: false, erro: 'Parte de QR inválida.' };
  if (_qrPartes.id !== m[1]) _qrPartes = { id: m[1], total, partes: {} };
  _qrPartes.partes[idx] = m[4];
  const recebidas = Object.keys(_qrPartes.partes).length;
  if (recebidas < total) return { pronto: false, recebidas, total };
  let payload = '';
  for (let k = 1; k <= total; k++) payload += _qrPartes.partes[k];
  qrReiniciarPartes();
  return { pronto: true, payload };
}

// ===== 3. MODAL PRINCIPAL =====
function abrirModalQRCode(abaInicial = 'gerar') {
  const modal = document.getElementById('modalQRCodeSync');
  if (!modal) {
    if (typeof showAppToast === 'function') {
      showAppToast('Modal de QR Code ainda não carregado.', 'warning');
    }
    return;
  }
  modal.classList.remove('hidden');
  alternarAbaModalQR(abaInicial);
}
window.abrirModalQRCode = abrirModalQRCode;

function fecharModalQRCode() {
  pararScannerCamera();
  pararRotacaoQR();
  qrReiniciarPartes();
  const modal = document.getElementById('modalQRCodeSync');
  if (modal) modal.classList.add('hidden');
}
window.fecharModalQRCode = fecharModalQRCode;

function alternarAbaModalQR(modo) {
  const painelGerar = document.getElementById('qrPainelGerar');
  const painelLer = document.getElementById('qrPainelLer');
  const btnTabGerar = document.getElementById('qrTabBtnGerar');
  const btnTabLer = document.getElementById('qrTabBtnLer');

  if (modo === 'gerar') {
    pararScannerCamera();
    painelGerar?.classList.remove('hidden');
    painelLer?.classList.add('hidden');
    btnTabGerar?.classList.add('bg-white', 'text-slate-800', 'shadow-xs');
    btnTabGerar?.classList.remove('text-slate-500');
    btnTabLer?.classList.remove('bg-white', 'text-slate-800', 'shadow-xs');
    btnTabLer?.classList.add('text-slate-500');
    gerarVisualizacaoQRCode();
  } else {
    pararRotacaoQR();
    qrReiniciarPartes();
    painelGerar?.classList.add('hidden');
    painelLer?.classList.remove('hidden');
    btnTabLer?.classList.add('bg-white', 'text-slate-800', 'shadow-xs');
    btnTabLer?.classList.remove('text-slate-500');
    btnTabGerar?.classList.remove('bg-white', 'text-slate-800', 'shadow-xs');
    btnTabGerar?.classList.add('text-slate-500');
    iniciarScannerCamera();
  }
}
window.alternarAbaModalQR = alternarAbaModalQR;

// ===== 4. GERAÇÃO DO QR CODE (offline) =====
/** Desenha o QR num <canvas>. Correção de erro 'L' = mais espaço para dados e módulos maiores. */
function desenharQRNoCanvas(canvas, texto, tamanho = 480) {
  const qr = qrcode(0, 'L');                // 0 = escolhe o tamanho sozinho
  qr.addData(texto, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const margem = 4;
  const cel = Math.max(2, Math.floor(tamanho / (n + margem * 2)));
  const lado = cel * (n + margem * 2);
  canvas.width = canvas.height = lado;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, lado, lado);
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) ctx.fillRect((c + margem) * cel, (r + margem) * cel, cel, cel);
}

let qrRotacaoTimer = null;
function pararRotacaoQR() {
  if (qrRotacaoTimer) { clearInterval(qrRotacaoTimer); qrRotacaoTimer = null; }
}

async function gerarVisualizacaoQRCode() {
  const container = document.getElementById('qrCodeCanvasContainer');
  const aviso = document.getElementById('qrAvisoCarrinhoVazio');
  if (!container) return;
  pararRotacaoQR();
  container.innerHTML = '';

  const payload = await serializarCarrinhoParaQR();

  // o usuário pode ter trocado de aba enquanto compactava
  if (document.getElementById('qrPainelGerar')?.classList.contains('hidden')) return;

  if (!payload) {
    container.classList.add('hidden');
    aviso?.classList.remove('hidden');
    return;
  }
  container.classList.remove('hidden');
  aviso?.classList.add('hidden');

  if (typeof qrcode === 'undefined') {
    container.innerHTML = '<p class="text-xs text-rose-600 font-bold p-4">Erro: biblioteca js/vendor/qrcode.js não carregada.</p>';
    return;
  }

  const partes = dividirPayloadQR(payload);
  if (!partes) {
    container.innerHTML = '<p class="text-xs text-rose-600 font-bold p-4">Lista grande demais para QR Code. Divida em duas listas.</p>';
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;max-width:340px;height:auto;image-rendering:pixelated;background:#fff';
  const legenda = document.createElement('p');
  legenda.className = 'text-[11px] font-bold text-slate-500 mt-2';
  container.style.flexDirection = 'column';
  container.append(canvas, legenda);

  let i = 0;
  const mostrar = () => {
    desenharQRNoCanvas(canvas, partes[i]);
    legenda.textContent = partes.length > 1
      ? `QR ${i + 1} de ${partes.length} - mantenha o outro celular apontado até ler todos`
      : 'Aponte a câmera do outro celular';
  };
  mostrar();
  if (partes.length > 1) {
    qrRotacaoTimer = setInterval(() => { i = (i + 1) % partes.length; mostrar(); }, 2500);
  }
}
window.gerarVisualizacaoQRCode = gerarVisualizacaoQRCode;

// ===== 5. LEITOR VIA CÂMERA (BarcodeDetector quando existe, jsQR como alternativa) =====
let qrMediaStream = null;
let qrScanTimer = null;
let _qrSessaoScan = 0;
let _qrCanvasLeitura = null;

/** Lê um QR de uma imagem/vídeo usando jsQR. Retorna o texto ou null. */
function lerQRComJsQR(fonte, largura, altura, maxLargura = 960) {
  if (typeof jsQR === 'undefined' || !largura || !altura) return null;
  const escala = Math.min(1, maxLargura / largura);
  const w = Math.round(largura * escala), h = Math.round(altura * escala);
  const cv = _qrCanvasLeitura || (_qrCanvasLeitura = document.createElement('canvas'));
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(fonte, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const r = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
  return r && r.data ? r.data : null;
}

async function iniciarScannerCamera() {
  const video = document.getElementById('qrScannerVideo');
  if (!video) return;

  pararScannerCamera();
  const sessao = ++_qrSessaoScan;
  qrStatus('Acessando câmera traseira...');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    qrStatus('Câmera indisponível (o app precisa estar em HTTPS ou localhost). Use o botão abaixo para ler por foto.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    if (sessao !== _qrSessaoScan) { stream.getTracks().forEach(t => t.stop()); return; }

    qrMediaStream = stream;
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    await video.play();

    const detector = ('BarcodeDetector' in window) ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
    if (!detector && typeof jsQR === 'undefined') {
      qrStatus('Leitor indisponível (js/vendor/jsQR.js não carregou). Use o botão abaixo para ler por foto.');
      return;
    }
    qrStatus('Aponte para o QR Code da lista');

    const ciclo = async () => {
      if (sessao !== _qrSessaoScan) return;
      try {
        if (video.readyState >= 2 && video.videoWidth) {
          let texto = null;
          if (detector) {
            const lidos = await detector.detect(video);
            if (lidos && lidos.length > 0) texto = lidos[0].rawValue;
          } else {
            texto = lerQRComJsQR(video, video.videoWidth, video.videoHeight);
          }
          if (texto && sessao === _qrSessaoScan) processarResultadoLeitura(texto);
        }
      } catch (e) { /* frame sem QR legível */ }
      if (sessao === _qrSessaoScan) qrScanTimer = setTimeout(ciclo, detector ? 250 : 150);
    };
    ciclo();
  } catch (err) {
    console.warn('[QR Sync] Permissão de câmera negada ou indisponível:', err);
    qrStatus('Câmera não permitida. Você pode carregar uma foto do QR Code abaixo.');
  }
}

function pararScannerCamera() {
  _qrSessaoScan++;                       // cancela qualquer ciclo de leitura pendente
  if (qrScanTimer) { clearTimeout(qrScanTimer); qrScanTimer = null; }
  if (qrMediaStream) {
    qrMediaStream.getTracks().forEach(track => track.stop());
    qrMediaStream = null;
  }
  const video = document.getElementById('qrScannerVideo');
  if (video) video.srcObject = null;
}

// ===== 6. CATÁLOGO E CARRINHO NA IMPORTAÇÃO =====
/** Cria no catálogo local os produtos que ainda não existem (compara por nome, sem acento/maiúscula). */
function garantirProdutosNoCatalogo(itens) {
  if (!Array.isArray(products)) return 0;
  // usa um produto criado à mão como molde, para o novo ter os mesmos campos
  const molde = products.find(p => String(p.id).startsWith('p-custom-')) || null;
  let criados = 0;

  itens.forEach(it => {
    const nome = String(it.name || '').trim();
    if (!nome) return;
    const existente = products.find(p => normalizarNome(p.name) === normalizarNome(nome));
    if (existente) { it.name = existente.name; return; }   // usa o nome já cadastrado aqui

    const novo = {};
    if (molde) {
      Object.keys(molde).forEach(k => {
        const v = molde[k];
        novo[k] = Array.isArray(v) ? [] : (v && typeof v === 'object') ? {}
          : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : '';
      });
    }
    Object.assign(novo, {
      id: 'p-custom-' + Date.now() + '-' + criados,
      name: nome,
      unit: it.unit || 'un',
      category: 'Geral'
    });
    products.push(novo);
    criados++;
  });

  if (criados > 0) {
    if (typeof saveAllLocalData === 'function') saveAllLocalData();
    if (typeof renderCatalog === 'function') renderCatalog();
  }
  return criados;
}

/** Junta os itens lidos ao carrinho atual sem duplicar (mesmo nome + mesma marca). */
function mesclarItensNoCarrinho(novos) {
  let adicionados = 0, repetidos = 0;
  const chave = c => normalizarNome(c.name) + '|' + normalizarNome(c.selectedBrandId);
  novos.forEach(n => {
    const ja = cart.find(c => chave(c) === chave(n));
    if (ja) {
      repetidos++;
      if (QR_SE_JA_NO_CARRINHO === 'somar') ja.quantity = (Number(ja.quantity) || 0) + n.quantity;
    } else {
      cart.push(n);
      adicionados++;
    }
  });
  return { adicionados, repetidos };
}

// ===== 7. PROCESSAMENTO DA LEITURA E DIÁLOGO DE IMPORTAÇÃO =====
let _qrProcessando = false;
let _qrUltimoInvalido = { t: '', ms: 0 };

async function processarResultadoLeitura(conteudoQR) {
  if (_qrProcessando) return;
  const texto = String(conteudoQR || '').trim();
  if (!texto) return;

  const parte = qrReceberParte(texto);
  if (!parte.pronto) {
    qrStatus(parte.erro || `Parte ${parte.recebidas} de ${parte.total} lida. Continue apontando para os outros QR.`);
    return;
  }

  _qrProcessando = true;
  try {
    const resultado = await desserializarQRParaCarrinho(parte.payload);
    if (!resultado || resultado.items.length === 0) {
      const agora = Date.now();
      if (texto !== _qrUltimoInvalido.t || agora - _qrUltimoInvalido.ms > 3000) {
        _qrUltimoInvalido = { t: texto, ms: agora };
        if (typeof showAppToast === 'function') {
          showAppToast('QR Code não reconhecido como lista válida.', 'error');
        }
      }
      return;
    }

    pararScannerCamera();
    fecharModalQRCode();
    if (typeof playAppBeep === 'function') playAppBeep('finish');

    const totalLidos = resultado.items.length;
    const mercadoLocal = (supermarkets || []).find(m => m.id === resultado.marketId);
    const mercadoNome = mercadoLocal?.name || 'Mercado Geral';

    openCustomDialog(
      `Importar Lista (${totalLidos} itens)?`,
      `Lista gerada para ${mercadoNome}. Deseja substituir o carrinho atual ou somar aos itens existentes?`,
      'Substituir Carrinho',
      'Somar à Lista Atual',
      () => {
        // Opção 1: Substitui
        const criados = garantirProdutosNoCatalogo(resultado.items);
        cart = resultado.items;
        if (mercadoLocal && typeof activeMarketId !== 'undefined') {
          activeMarketId = resultado.marketId;
        }
        concluirImportacaoQR(`${totalLidos} item(ns) importado(s)` +
          (criados ? `, ${criados} produto(s) novo(s) no catálogo` : ''));
      },
      () => {
        // Opção 2: Mescla
        const criados = garantirProdutosNoCatalogo(resultado.items);
        const { adicionados, repetidos } = mesclarItensNoCarrinho(resultado.items);
        concluirImportacaoQR(`${adicionados} item(ns) adicionado(s), ${repetidos} já estava(m) na lista` +
          (criados ? `, ${criados} produto(s) novo(s) no catálogo` : ''));
      }
    );
  } finally {
    _qrProcessando = false;
  }
}

function concluirImportacaoQR(mensagem) {
  saveCartData();
  refreshActiveMarketUI();
  if (typeof renderCartUI === 'function') renderCartUI();
  if (typeof switchActiveTab === 'function') switchActiveTab('compras');
  if (typeof showAppToast === 'function') {
    showAppToast(mensagem || 'Lista importada com sucesso via QR Code!', 'success');
  }
}

// ===== 8. LEITURA DE QR CODE A PARTIR DE FOTO/ARQUIVO =====
async function lerQRCodeDeArquivo(inputElement) {
  const file = inputElement.files?.[0];
  if (!file) return;

  qrStatus('Processando imagem...');

  try {
    const bitmap = await createImageBitmap(file);
    let texto = null;

    if ('BarcodeDetector' in window) {
      try {
        const lidos = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bitmap);
        if (lidos && lidos.length > 0) texto = lidos[0].rawValue;
      } catch (e) { /* tenta o jsQR */ }
    }
    if (!texto) texto = lerQRComJsQR(bitmap, bitmap.width, bitmap.height, 1600);
    if (bitmap.close) bitmap.close();

    if (texto) {
      processarResultadoLeitura(texto);
      return;
    }
    qrStatus('Nenhum QR Code encontrado nesta imagem.');
    if (typeof showAppToast === 'function') {
      showAppToast('Não foi possível identificar um QR Code nesta imagem.', 'warning');
    }
  } catch (err) {
    console.error('[QR Sync] Falha ao ler imagem:', err);
    if (typeof showAppToast === 'function') {
      showAppToast('Erro ao ler arquivo da foto.', 'error');
    }
  } finally {
    inputElement.value = '';
  }
}
window.lerQRCodeDeArquivo = lerQRCodeDeArquivo;