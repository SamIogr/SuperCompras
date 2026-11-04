/**
 * SUPERCOMPRAS PRO (Módulo de Compartilhamento e Leitura via QR Code)
 * Arquivo: js/qrcode-sync.js
 */

const QR_STORAGE_PREFIX = 'SC_QR_V1:';

// 1. SERIALIZAÇÃO COMPACTA DO CARRINHO PARA CABER COM FOLGA NO QR CODE
function serializarCarrinhoParaQR() {
  if (!Array.isArray(cart) || cart.length === 0) return null;

  const dadosCompactos = {
    m: activeMarketId || 'm-padrao',
    t: Date.now(),
    items: cart.map(item => ({
      n: item.name,
      q: item.quantity,
      u: item.unit || 'un',
      p: Number(item.unitPrice) || 0,
      b: item.selectedBrandId || 'Padrão',
      c: item.checked ? 1 : 0,
      pr: item.promo ? {
        t: item.promo.type,
        v: item.promo.value,
        at: item.promo.wholesaleTrigger,
        ap: item.promo.wholesalePrice
      } : null
    }))
  };

  return QR_STORAGE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(dadosCompactos))));
}

// 2. DESSERIALIZAÇÃO E VALIDAÇÃO DOS DADOS LIDOS
function desserializarQRParaCarrinho(payloadTexto) {
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

    return {
      marketId: dados.m || 'm-padrao',
      items: itensCarrinho
    };
  } catch (err) {
    console.error('[QR Sync] Falha ao decodificar QR Code:', err);
    return null;
  }
}

// 3. ABERTURA DO MODAL PRINCIPAL DE QR CODE
function abrirModalQRCode() {
  const modal = document.getElementById('modalQRCodeSync');
  if (!modal) return;

  alternarAbaModalQR('gerar');
  modal.classList.remove('hidden');
}
window.abrirModalQRCode = abrirModalQRCode;

function fecharModalQRCode() {
  pararScannerCamera();
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

// 4. GERAÇÃO DO QR CODE (COM FALLBACK AUTOMÁTICO)
function gerarVisualizacaoQRCode() {
  const container = document.getElementById('qrCodeCanvasContainer');
  const avisoVazio = document.getElementById('qrAvisoCarrinhoVazio');
  if (!container) return;

  if (!Array.isArray(cart) || cart.length === 0) {
    container.innerHTML = '';
    avisoVazio?.classList.remove('hidden');
    return;
  }

  avisoVazio?.classList.add('hidden');
  container.innerHTML = '<div class="text-xs text-slate-400 font-semibold py-8">Gerando QR Code...</div>';

  const payload = serializarCarrinhoParaQR();
  if (!payload) return;

  container.innerHTML = '';

  // Tentativa 1: Biblioteca QRCode.js carregada no cliente
  if (typeof QRCode === 'function') {
    new QRCode(container, {
      text: payload,
      width: 230,
      height: 230,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    // Tentativa 2: Imagem SVG de alta precisão via serviço público seguro
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=230x230&data=${encodeURIComponent(payload)}`;
    img.alt = 'QR Code da Lista de Compras';
    img.className = 'w-56 h-56 mx-auto rounded-xl shadow-xs border border-slate-100';
    container.appendChild(img);
  }
}

// 5. LEITOR DE QR CODE VIA CÂMERA (STREAM DE VÍDEO)
let qrMediaStream = null;
let qrScanInterval = null;

async function iniciarScannerCamera() {
  const video = document.getElementById('qrScannerVideo');
  const msgStatus = document.getElementById('qrScannerStatus');
  if (!video) return;

  if (msgStatus) msgStatus.innerText = 'Acessando câmera traseira...';

  try {
    qrMediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    video.srcObject = qrMediaStream;
    await video.play();

    if (msgStatus) msgStatus.innerText = 'Aponte para o QR Code da lista';

    if ('BarcodeDetector' in window) {
      const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
      qrScanInterval = setInterval(async () => {
        try {
          if (video.readyState >= 2) {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const valorLido = barcodes[0].rawValue;
              processarResultadoLeitura(valorLido);
            }
          }
        } catch (scanErr) {}
      }, 350);
    } else {
      if (msgStatus) {
        msgStatus.innerText = 'Leitura contínua indisponível no navegador. Use o botão abaixo para ler por foto.';
      }
    }
  } catch (err) {
    console.warn('[QR Sync] Permissão de câmera negada ou indisponível:', err);
    if (msgStatus) {
      msgStatus.innerText = 'Câmera não permitida. Você pode carregar uma foto do QR Code abaixo.';
    }
  }
}

function pararScannerCamera() {
  if (qrScanInterval) {
    clearInterval(qrScanInterval);
    qrScanInterval = null;
  }
  if (qrMediaStream) {
    qrMediaStream.getTracks().forEach(track => track.stop());
    qrMediaStream = null;
  }
  const video = document.getElementById('qrScannerVideo');
  if (video) video.srcObject = null;
}

// 6. PROCESSAMENTO DA LEITURA E DIÁLOGO DE IMPORTAÇÃO
function processarResultadoLeitura(conteudoQR) {
  const resultado = desserializarQRParaCarrinho(conteudoQR);
  if (!resultado || resultado.items.length === 0) {
    if (typeof showAppToast === 'function') {
      showAppToast('QR Code não reconhecido como lista válida.', 'error');
    }
    return;
  }

  pararScannerCamera();
  fecharModalQRCode();

  if (typeof playAppBeep === 'function') playAppBeep('finish');

  const totalLidos = resultado.items.length;
  const mercadoNome = (supermarkets || []).find(m => m.id === resultado.marketId)?.name || 'Mercado Geral';

  openCustomDialog(
    `Importar Lista (${totalLidos} itens)?`,
    `Lista gerada para ${mercadoNome}. Deseja substituir o carrinho atual ou somar aos itens existentes?`,
    'Substituir Carrinho',
    'Somar à Lista Atual',
    () => {
      // Opção 1: Substitui
      cart = resultado.items;
      if (resultado.marketId && typeof activeMarketId !== 'undefined') {
        activeMarketId = resultado.marketId;
      }
      concluirImportacaoQR();
    },
    () => {
      // Opção 2: Mescla
      resultado.items.forEach(novoItem => {
        const existente = cart.find(c => c.name.toLowerCase().trim() === novoItem.name.toLowerCase().trim());
        if (existente) {
          existente.quantity += novoItem.quantity;
        } else {
          cart.push(novoItem);
        }
      });
      concluirImportacaoQR();
    }
  );
}

function concluirImportacaoQR() {
  saveCartData();
  refreshActiveMarketUI();
  if (typeof renderCartUI === 'function') renderCartUI();
  if (typeof switchActiveTab === 'function') switchActiveTab('compras');
  if (typeof showAppToast === 'function') {
    showAppToast('Lista importada com sucesso via QR Code!', 'success');
  }
}

// 7. LEITURA DE QR CODE A PARTIR DE FOTO/ARQUIVO
async function lerQRCodeDeArquivo(inputElement) {
  const file = inputElement.files?.[0];
  if (!file) return;

  const msgStatus = document.getElementById('qrScannerStatus');
  if (msgStatus) msgStatus.innerText = 'Processando imagem...';

  try {
    const bitmap = await createImageBitmap(file);

    if ('BarcodeDetector' in window) {
      const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(bitmap);
      if (barcodes && barcodes.length > 0) {
        processarResultadoLeitura(barcodes[0].rawValue);
        return;
      }
    }

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