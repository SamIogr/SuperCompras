/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - HISTÓRICO: COMPARADOR DE UMA COMPRA COM OS PREÇOS ATUAIS (js/telas/historico/comparador.js)
 */

// ============================================================================
// COMPARADOR HISTÓRICO CONSOLIDADO (DESIGN RESPONSIVO, CORES E TEMA)
// ============================================================================

let modoComparacaoHistoricoAtual = 'catalogo';


// Abertura do modal e inicialização dos seletores
window.abrirModalComparadorHistorico = function(indiceOpcional) {
  const modal = document.getElementById('modalHistoricoComparativo');
  const selectCompra = document.getElementById('histSelectCompraComparar');
  const selectMercado = document.getElementById('histSelectMercadoAlvo');
  if (!modal || !selectCompra || !selectMercado) return;

  const listaHistorico = obterListaHistoricoComparador();

  if (listaHistorico.length === 0) {
    if (typeof showAppToast === 'function') showAppToast('Nenhuma compra registrada para comparar.', 'info');
    return;
  }

  // Preenche a lista de compras
  selectCompra.innerHTML = listaHistorico.map((compra, i) => {
    const dataFormatada = formatarDataHistoricoLegivel(compra.date);
    const totalFormatado = formatBRL((Number(compra.total) || 0));
    return `<option value="${i}">${esc(compra.marketName || 'Supermercado')} • ${dataFormatada} (R$ ${totalFormatado})</option>`;
  }).join('');

  const idxEscolhido = (indiceOpcional !== undefined && indiceOpcional !== null) ? Number(indiceOpcional) : 0;
  selectCompra.value = idxEscolhido;

  // Preenche a lista de supermercados para destino
  const listaMercados = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets))
    ? supermarkets.filter(m => m && m.id && m.id !== 'm-padrao')
    : [];

  const compraAtual = listaHistorico[idxEscolhido];
  const mercadoOriginalId = compraAtual?.marketId || (typeof activeMarketId !== 'undefined' ? activeMarketId : '');

  selectMercado.innerHTML = listaMercados.map(m => `
    <option value="${esc(m.id)}" ${m.id === mercadoOriginalId ? 'selected' : ''}>
      ${esc(m.name)} ${m.id === mercadoOriginalId ? '(Mesmo da compra)' : ''}
    </option>
  `).join('');

  modoComparacaoHistoricoAtual = 'catalogo';
  renderizarComparacaoHistoricaAtual();
  modal.classList.remove('hidden');
};

window.fecharModalComparadorHistorico = function() {
  const modal = document.getElementById('modalHistoricoComparativo');
  if (modal) modal.classList.add('hidden');
};

window.atualizarMercadoPadraoDaCompra = function() {
  const selectCompra = document.getElementById('histSelectCompraComparar');
  const selectMercado = document.getElementById('histSelectMercadoAlvo');
  if (!selectCompra || !selectMercado) return;

  const listaHistorico = obterListaHistoricoComparador();

  const compra = listaHistorico[Number(selectCompra.value || 0)];
  if (compra && compra.marketId && selectMercado.querySelector(`option[value="${compra.marketId}"]`)) {
    selectMercado.value = compra.marketId;
  }
};

window.alternarModoComparacaoHistorico = function(novoModo) {
  modoComparacaoHistoricoAtual = novoModo;
  const btnCat = document.getElementById('btnModoCompCatalogo');
  const btnCar = document.getElementById('btnModoCompCarrinho');

  if (novoModo === 'catalogo') {
    if (btnCat) btnCat.className = "flex-1 py-1 px-2 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs transition-all cursor-pointer text-center truncate";
    if (btnCar) btnCar.className = "flex-1 py-1 px-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer text-center truncate";
  } else {
    if (btnCar) btnCar.className = "flex-1 py-1 px-2 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs transition-all cursor-pointer text-center truncate";
    if (btnCat) btnCat.className = "flex-1 py-1 px-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer text-center truncate";
  }

  renderizarComparacaoHistoricaAtual();
};

window.toggleDetalhesComparadorItem = function(idx) {
  const gaveta = document.getElementById(`gavetaDetalhesComp_${idx}`);
  const icone = document.getElementById(`iconeSetaItemComp_${idx}`);
  if (!gaveta) return;

  if (gaveta.classList.contains('hidden')) {
    gaveta.classList.remove('hidden');
    if (icone) icone.style.transform = 'rotate(180deg)';
  } else {
    gaveta.classList.add('hidden');
    if (icone) icone.style.transform = 'rotate(0deg)';
  }
};

// Renderização completa da tela comparativa
window.renderizarComparacaoHistoricaAtual = function() {
  const selectCompra = document.getElementById('histSelectCompraComparar');
  const selectMercado = document.getElementById('histSelectMercadoAlvo');
  const cardsResumo = document.getElementById('histCompCardsResumo');
  const listaContainer = document.getElementById('histCompListaItens');
  const boxAlerta = document.getElementById('histCompAlertaSemPreco');
  const textoAlerta = document.getElementById('histCompTextoAlertaSemPreco');
  const badgeQtdNoCarrinho = document.getElementById('histCompQtdNoCarrinho');
  const infoRodape = document.getElementById('histCompInfoRodape');

  if (!selectCompra || !selectMercado || !cardsResumo || !listaContainer) return;

  const listaHistorico = obterListaHistoricoComparador();

  const compra = listaHistorico[Number(selectCompra.value || 0)];
  if (!compra || !Array.isArray(compra.items) || compra.items.length === 0) {
    cardsResumo.innerHTML = '';
    listaContainer.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Sem registros nesta compra.</p>';
    if (boxAlerta) boxAlerta.classList.add('hidden');
    return;
  }

  const mercadoAlvoId = selectMercado.value;
  const textoOpcaoMercado = selectMercado.options[selectMercado.selectedIndex]?.text || '';
  const mercadoNomeLimpo = textoOpcaoMercado
    .replace(/\(Mesmo.*?\)/gi, '')
    .replace(/^(supermercados?|mercados?|hipermercados?)\s+/i, '')
    .trim() || 'MERCADO';

  const obterNomeMercadoAtivo = () => {
    if (typeof activeMarketId !== 'undefined' && typeof supermarkets !== 'undefined' && Array.isArray(supermarkets)) {
      const m = supermarkets.find(item => item.id === activeMarketId);
      if (m && m.name) return m.name.replace(/^(supermercados?|mercados?|hipermercados?)\s+/i, '').trim();
    }
    const elHeader = document.querySelector('header strong, header h1, [id*="market"], [id*="Mercado"]');
    if (elHeader && elHeader.textContent) {
      const match = elHeader.textContent.split('•')[0];
      if (match) return match.replace(/^(supermercados?|mercados?|hipermercados?)\s+/i, '').trim();
    }
    return 'MERCADO ATIVO';
  };

  const mercadoAtivoNome = obterNomeMercadoAtivo();

  if (modoComparacaoHistoricoAtual === 'carrinho') {
    selectMercado.disabled = true;
    selectMercado.classList.add('opacity-40', 'cursor-not-allowed');
  } else {
    selectMercado.disabled = false;
    selectMercado.classList.remove('opacity-40', 'cursor-not-allowed');
  }

  const carrinhoAtual = (typeof cart !== 'undefined' && Array.isArray(cart)) ? cart : [];

  const buscarCotacaoMercado = (item, idMercado) => {
    const nomeItem = (item.name || '').trim().toLowerCase();
    const idItem = item.productId || item.id;

    const prod = (typeof products !== 'undefined' && Array.isArray(products))
      ? products.find(p => (idItem && p.id === idItem) || (p.name && p.name.trim().toLowerCase() === nomeItem))
      : null;

    if (!prod) return { preco: null, temCotacao: false };

    const marcaNome = (item.selectedBrandId || 'Padrão').trim().toLowerCase();

    if (Array.isArray(prod.brands)) {
      const bObj = prod.brands.find(b => (b.name || b.id || '').trim().toLowerCase() === marcaNome);
      if (bObj && bObj.marketPrices && bObj.marketPrices[idMercado] && Number(bObj.marketPrices[idMercado]) > 0) {
        return { preco: Number(bObj.marketPrices[idMercado]), temCotacao: true };
      }
    }

    if (prod.marketPrices && prod.marketPrices[idMercado] && Number(prod.marketPrices[idMercado]) > 0) {
      return { preco: Number(prod.marketPrices[idMercado]), temCotacao: true };
    }

    return { preco: null, temCotacao: false };
  };

  const totalPagoFinal = Number(compra.total) || 0;
  let totalComparado = 0;
  let qtdItensSemCotacao = 0;
  let itensPresentesNoCarrinho = 0;

  const itens = compra.items.map((item, idxItem) => {
    const qtd = Number(item.quantity || 1);
    const precoTabelaUnit = Number(item.price || item.unitPrice || item.basePrice || 0);

    let totalPagoItem = 0;
    let descontoItem = 0;
    if (item.total !== undefined && Number(item.total) > 0) {
      totalPagoItem = Number(item.total);
      descontoItem = Math.max(0, (precoTabelaUnit * qtd) - totalPagoItem);
    } else if (item.subtotal !== undefined && Number(item.subtotal) > 0) {
      totalPagoItem = Number(item.subtotal);
      descontoItem = Math.max(0, (precoTabelaUnit * qtd) - totalPagoItem);
    } else {
      descontoItem = Number(item.discount || item.desconto || 0);
      totalPagoItem = (precoTabelaUnit * qtd) - descontoItem;
    }

    const precoEfetivoUnit = qtd > 0 ? (totalPagoItem / qtd) : precoTabelaUnit;

    const nomeItem = (item.name || '').trim().toLowerCase();
    const idItem = item.productId || item.id;
    const marcaItem = (item.selectedBrandId || 'Padrão').trim().toLowerCase();

    const cotacao = buscarCotacaoMercado(item, mercadoAlvoId);
    const temCotacao = cotacao.temCotacao;
    const precoCatalogoUnit = temCotacao ? cotacao.preco : null;

    const itemNoCarrinho = carrinhoAtual.find(c => {
      const cNome = (c.name || '').trim().toLowerCase();
      const cId = c.productId || c.id;
      const cMarca = (c.selectedBrandId || 'Padrão').trim().toLowerCase();
      return (idItem && cId && idItem === cId) || (nomeItem === cNome && marcaItem === cMarca);
    });

    const estaNoCarrinho = !!itemNoCarrinho;
    if (estaNoCarrinho) itensPresentesNoCarrinho++;

    const precoCarrinhoUnit = estaNoCarrinho 
      ? Number(itemNoCarrinho.unitPrice || itemNoCarrinho.price || itemNoCarrinho.basePrice || 0)
      : null;

    let precoComparadoUnit = null;
    let itemSemPreco = false;

    if (modoComparacaoHistoricoAtual === 'catalogo') {
      if (temCotacao) {
        precoComparadoUnit = precoCatalogoUnit;
      } else {
        itemSemPreco = true;
        qtdItensSemCotacao++;
      }
    } else {
      if (estaNoCarrinho) {
        precoComparadoUnit = precoCarrinhoUnit;
      }
    }

    const subtotalComparado = precoComparadoUnit !== null ? (precoComparadoUnit * qtd) : null;
    if (subtotalComparado !== null) totalComparado += subtotalComparado;

    const diffTotal = subtotalComparado !== null ? (subtotalComparado - totalPagoItem) : null;
    const diffUnitario = precoComparadoUnit !== null ? (precoComparadoUnit - precoEfetivoUnit) : null;
    const perc = (diffTotal !== null && totalPagoItem > 0) ? (diffTotal / totalPagoItem) * 100 : 0;

    return {
      idxItem,
      name: item.name || 'Produto',
      brand: item.selectedBrandId || 'Padrão',
      unit: item.unit || 'un',
      qtd,
      precoTabelaUnit,
      precoEfetivoUnit,
      descontoItem,
      totalPagoItem,
      temCotacao,
      precoCatalogoUnit,
      estaNoCarrinho,
      precoCarrinhoUnit,
      itemSemPreco,
      precoComparadoUnit,
      subtotalComparado,
      diffTotal,
      diffUnitario,
      perc
    };
  });

  if (badgeQtdNoCarrinho) {
    badgeQtdNoCarrinho.textContent = `${itensPresentesNoCarrinho}/${itens.length}`;
  }

  if (boxAlerta) {
    if (modoComparacaoHistoricoAtual === 'catalogo' && qtdItensSemCotacao > 0) {
      textoAlerta.textContent = `${qtdItensSemCotacao} ${qtdItensSemCotacao === 1 ? 'item sem preço' : 'itens sem preço'} no ${mercadoNomeLimpo}.`;
      boxAlerta.classList.remove('hidden');
    } else {
      boxAlerta.classList.add('hidden');
    }
  }

  const diffGeral = totalComparado - totalPagoFinal;
  const percGeral = totalPagoFinal > 0 ? (diffGeral / totalPagoFinal) * 100 : 0;

  let corDiferenca = 'text-slate-500 dark:text-slate-400';
  let sinalDiferenca = '';
  if (diffGeral > 0.05) {
    corDiferenca = 'text-rose-600 dark:text-rose-400';
    sinalDiferenca = '+';
  } else if (diffGeral < -0.05) {
    corDiferenca = 'text-emerald-600 dark:text-emerald-400';
  }

  const rotuloCentral = modoComparacaoHistoricoAtual === 'catalogo'
    ? `No ${mercadoNomeLimpo}`
    : `Lista (${mercadoAtivoNome})`;

  // FITA DE RESUMO COMPACTA
  cardsResumo.innerHTML = `
    <div class="flex flex-col justify-center items-center text-center px-1">
      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Pago</span>
      <strong class="text-xs font-black text-slate-800 dark:text-white">R$ ${formatBRL(totalPagoFinal)}</strong>
    </div>

    <div class="flex flex-col justify-center items-center text-center border-x border-slate-200 dark:border-slate-700/60 px-1">
      <span class="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight truncate max-w-full" title="${rotuloCentral}">
        ${rotuloCentral}
      </span>
      <strong class="text-xs font-black text-amber-600 dark:text-amber-400">R$ ${formatBRL(totalComparado)}</strong>
    </div>

    <div class="flex flex-col justify-center items-center text-center px-1">
      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Variação</span>
      <strong class="text-xs font-black ${corDiferenca} leading-tight">
        ${sinalDiferenca}R$ ${formatBRL(diffGeral)}
        <span class="text-[9px] font-bold opacity-90">(${sinalDiferenca}${percGeral.toFixed(1)}%)</span>
      </strong>
    </div>
  `;

  if (infoRodape) {
    infoRodape.textContent = modoComparacaoHistoricoAtual === 'catalogo'
      ? `Cotação com base na tabela do ${mercadoNomeLimpo}.`
      : `${itensPresentesNoCarrinho} de ${itens.length} itens na lista ativa cotados no ${mercadoAtivoNome}.`;
  }

  // CARTÕES DE ITENS COM SELO EM UMA ÚNICA LINHA
  listaContainer.innerHTML = itens.map(it => {
    let tagBadge = '';
    let bordaCard = 'border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/40';
    let linhaValores = '';

    const strPago = `R$ ${formatBRL(it.totalPagoItem)}`;

    if (modoComparacaoHistoricoAtual === 'catalogo') {
      const strAtual = it.subtotalComparado !== null ? `R$ ${formatBRL(it.subtotalComparado)}` : null;

      if (it.itemSemPreco) {
        bordaCard = 'border border-dashed border-amber-400/80 bg-amber-500/5';
        tagBadge = `<span class="inline-flex items-center text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 px-2 py-0.5 rounded-md whitespace-nowrap">Sem preço</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <strong class="text-slate-800 dark:text-slate-200">${strPago}</strong> <span class="text-amber-600 dark:text-amber-400 text-[10px]">• Sem cotação</span>`;

      } else if (it.diffTotal > 0.05) {
        bordaCard = 'border border-rose-500/50 bg-rose-500/5';
        tagBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">▲ +R$ ${formatBRL(it.diffTotal)}</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <span class="text-slate-700 dark:text-slate-300">${strPago}</span> → <span class="text-slate-500 dark:text-slate-400">Atual:</span> <strong class="text-rose-600 dark:text-rose-400 font-bold">${strAtual}</strong>`;

      } else if (it.diffTotal < -0.05) {
        bordaCard = 'border border-emerald-500/50 bg-emerald-500/5';
        tagBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">▼ -R$ ${formatBRL(Math.abs(it.diffTotal))}</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <span class="text-slate-700 dark:text-slate-300">${strPago}</span> → <span class="text-slate-500 dark:text-slate-400">Atual:</span> <strong class="text-emerald-600 dark:text-emerald-400 font-bold">${strAtual}</strong>`;

      } else {
        tagBadge = `<span class="inline-flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md whitespace-nowrap">Igual</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Total:</span> <strong class="text-slate-800 dark:text-slate-200">${strPago}</strong> <span class="text-slate-400 text-[10px]">(sem variação)</span>`;
      }

    } else {
      const strCarrinho = it.subtotalComparado !== null ? `R$ ${formatBRL(it.subtotalComparado)}` : null;

      if (!it.estaNoCarrinho) {
        tagBadge = `<span class="inline-flex items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md whitespace-nowrap">Fora da lista</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <strong class="text-slate-800 dark:text-slate-200">${strPago}</strong> <span class="text-slate-400 text-[10px]">• Não adicionado</span>`;

      } else if (it.diffTotal > 0.05) {
        bordaCard = 'border border-rose-500/50 bg-rose-500/5';
        tagBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">▲ +R$ ${formatBRL(it.diffTotal)}</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <span class="text-slate-700 dark:text-slate-300">${strPago}</span> → <span class="text-slate-500 dark:text-slate-400">Na lista:</span> <strong class="text-rose-600 dark:text-rose-400 font-bold">${strCarrinho}</strong>`;

      } else if (it.diffTotal < -0.05) {
        bordaCard = 'border border-emerald-500/50 bg-emerald-500/5';
        tagBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-md whitespace-nowrap shadow-2xs">▼ -R$ ${formatBRL(Math.abs(it.diffTotal))}</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Pago:</span> <span class="text-slate-700 dark:text-slate-300">${strPago}</span> → <span class="text-slate-500 dark:text-slate-400">Na lista:</span> <strong class="text-emerald-600 dark:text-emerald-400 font-bold">${strCarrinho}</strong>`;

      } else {
        tagBadge = `<span class="inline-flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md whitespace-nowrap">Igual</span>`;
        linhaValores = `<span class="text-slate-500 dark:text-slate-400">Total:</span> <strong class="text-slate-800 dark:text-slate-200">${strPago}</strong> <span class="text-slate-400 text-[10px]">(sem alteração)</span>`;
      }
    }

    const destinoTexto = modoComparacaoHistoricoAtual === 'catalogo' ? mercadoNomeLimpo : mercadoAtivoNome;
    let corDiffUnit = 'text-slate-500 dark:text-slate-400';
    let sinalDiffUnit = '';
    if (it.diffUnitario !== null) {
      if (it.diffUnitario > 0.01) {
        corDiffUnit = 'text-rose-600 dark:text-rose-400';
        sinalDiffUnit = '+';
      } else if (it.diffUnitario < -0.01) {
        corDiffUnit = 'text-emerald-600 dark:text-emerald-400';
      }
    }

    return `
      <div class="rounded-xl overflow-hidden transition-all select-none ${bordaCard}">
        <!-- CABEÇALHO DO ITEM (HORIZONTAL E PROPORCIONAL) -->
        <div class="py-2 px-3 flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-transform" data-acao="historico-comparador-item" data-idx="${it.idxItem}">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 truncate">
              <span class="text-xs font-bold text-slate-900 dark:text-white truncate">${esc(it.name)}</span>
              <span style="font-size: 9px; line-height: 1;" class="font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-600/40 px-1.5 py-0.5 rounded shrink-0">${esc(it.brand)}</span>
${it.estaNoCarrinho && modoComparacaoHistoricoAtual === 'catalogo' ? `<span style="font-size: 8.5px; line-height: 1;" class="font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 rounded shrink-0">Na lista</span>` : ''}
            </div>
            <div class="text-[11px] mt-0.5 truncate text-slate-600 dark:text-slate-300">
              ${linhaValores}
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${tagBadge}
            <svg id="iconeSetaItemComp_${it.idxItem}" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>

        <!-- GAVETA DE DETALHES COMPACTA -->
        <div id="gavetaDetalhesComp_${it.idxItem}" class="hidden px-3 pb-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] leading-tight">
          
          <!-- BLOCO 1: REGISTRO ORIGINAL -->
          <div class="bg-white dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50 space-y-1">
            <div class="flex justify-between text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">
              <span>REGISTRO ORIGINAL</span>
              <span>${it.qtd} ${esc(it.unit)}</span>
            </div>
            <div class="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Preço unitário pago:</span>
              <span>
                ${it.descontoItem > 0 ? `<span class="line-through text-slate-400 mr-1">R$ ${formatBRL(it.precoTabelaUnit)}</span>` : ''}
                <strong class="text-slate-900 dark:text-white font-bold">R$ ${formatBRL(it.precoEfetivoUnit)}</strong> / ${esc(it.unit)}
              </span>
            </div>
            ${it.descontoItem > 0 ? `
              <div class="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Desconto deduzido:</span>
                <strong>-R$ ${formatBRL(it.descontoItem)}</strong>
              </div>
            ` : ''}
            <div class="flex justify-between text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-100 dark:border-slate-700/50">
              <span>Subtotal faturado:</span>
              <span>${it.qtd} × R$ ${formatBRL(it.precoEfetivoUnit)} = <strong class="text-slate-900 dark:text-white font-black">R$ ${formatBRL(it.totalPagoItem)}</strong></span>
            </div>
          </div>

          <!-- BLOCO 2: COTAÇÃO HOJE -->
          ${it.precoComparadoUnit !== null ? `
            <div class="bg-white dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50 space-y-1">
              <div class="flex justify-between text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">
                <span>COTAÇÃO (${destinoTexto})</span>
                <span>${it.qtd} ${esc(it.unit)}</span>
              </div>
              <div class="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Preço unitário hoje:</span>
                <strong class="text-slate-900 dark:text-white font-bold">R$ ${formatBRL(it.precoComparadoUnit)}</strong> / ${esc(it.unit)}
              </div>
              <div class="flex justify-between text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                <span>Subtotal hoje:</span>
                <span>${it.qtd} × R$ ${formatBRL(it.precoComparadoUnit)} = <strong class="text-slate-900 dark:text-white font-black">R$ ${formatBRL(it.subtotalComparado)}</strong></span>
              </div>
            </div>

            <!-- BLOCO 3: RESUMO DE IMPACTO -->
            <div class="flex items-center justify-between px-1 text-slate-500 dark:text-slate-400 text-[9.5px]">
              <span>Variação por ${esc(it.unit)}: <strong class="${corDiffUnit}">${sinalDiffUnit}R$ ${it.diffUnitario !== null ? formatBRL(Math.abs(it.diffUnitario)) : '0,00'}</strong></span>
              <span>Impacto total: <strong class="${corDiffUnit}">${it.diffTotal > 0 ? '+' : ''}R$ ${formatBRL(it.diffTotal)}</strong></span>
            </div>
          ` : `
            <div class="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[9.5px]">
              Item sem cotação registada para a marca <strong>${esc(it.brand)}</strong> no ${destinoTexto}.
            </div>
          `}

        </div>
      </div>
    `;
  }).join('');
};

// Fechamento pela tecla Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharModalComparadorHistorico();
  }
});

export {};
