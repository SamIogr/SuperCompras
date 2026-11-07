/**
 * SUPERCOMPRAS PRO - CALCULADORA COMPARATIVA MODULAR
 * Código autossuficiente e blindado (sem dependências cruzadas)
 */

let compCurrentMode = 'weight';

// Conversores numéricos puros locais (evita qualquer conflito de escopo)
function limparValorCalc(val) {
  if (val === null || val === undefined) return 0;
  let s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null') return 0;
  s = s.replace(/[^\d.,-]/g, '');
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatarMoedaCalc(num) {
  return (Number(num) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function abrirCalculadoraComparativa() {
  if (window.AppTemplates && typeof window.AppTemplates.renderPriceComparatorModal === 'function') {
    window.AppTemplates.renderPriceComparatorModal();
  }
  const modal = document.getElementById('modalPriceComparator');
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('compQtyA')?.focus();
    }, 100);
  }
}
window.abrirCalculadoraComparativa = abrirCalculadoraComparativa;

function fecharCalculadoraComparativa() {
  const modal = document.getElementById('modalPriceComparator');
  if (modal) modal.classList.add('hidden');
}
window.fecharCalculadoraComparativa = fecharCalculadoraComparativa;

function toggleWholesaleSection(op) {
  const check = document.getElementById(`compHasWholesale${op}`);
  const box = document.getElementById(`compWholesaleBox${op}`);
  if (check && box) {
    box.classList.toggle('hidden', !check.checked);
  }
  calcularComparativoPrecos();
}
window.toggleWholesaleSection = toggleWholesaleSection;

function setCompMode(mode) {
  compCurrentMode = mode;
  
  const btnW = document.getElementById('compModeWeight');
  const btnV = document.getElementById('compModeVolume');
  const btnU = document.getElementById('compModeUnit');
  const sA = document.getElementById('compSuffixA');
  const sB = document.getElementById('compSuffixB');
  const lblA = document.getElementById('labelUnitBaseA');
  const lblB = document.getElementById('labelUnitBaseB');
  const targetSuffix = document.getElementById('compTargetSuffix');

  if (!btnW || !btnV || !btnU || !sA || !sB || !lblA || !lblB || !targetSuffix) return;

  [btnW, btnV, btnU].forEach(b => {
    b.className = 'flex-1 py-1 rounded-lg text-center transition-all text-slate-600 font-semibold';
  });

  if (mode === 'weight') {
    btnW.className = 'flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center font-bold';
    sA.innerText = 'g';
    sB.innerText = 'g';
    lblA.innerText = 'Preço por kg';
    lblB.innerText = 'Preço por kg';
    targetSuffix.innerText = 'em kg';
  } else if (mode === 'volume') {
    btnV.className = 'flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center font-bold';
    sA.innerText = 'ml';
    sB.innerText = 'ml';
    lblA.innerText = 'Preço por Litro';
    lblB.innerText = 'Preço por Litro';
    targetSuffix.innerText = 'em Litros';
  } else {
    btnU.className = 'flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center font-bold';
    sA.innerText = 'un';
    sB.innerText = 'un';
    lblA.innerText = 'Preço por Unidade';
    lblB.innerText = 'Preço por Unidade';
    targetSuffix.innerText = 'em Unidades';
  }

  calcularComparativoPrecos();
}
window.setCompMode = setCompMode;

function calcularComparativoPrecos() {
  const targetVal = limparValorCalc(document.getElementById('compTargetQty')?.value);

  const qtyA = limparValorCalc(document.getElementById('compQtyA')?.value);
  const priceA = limparValorCalc(document.getElementById('compPriceA')?.value);
  const hasAtacadoA = document.getElementById('compHasWholesaleA')?.checked || false;
  const minAtacadoA = limparValorCalc(document.getElementById('compMinWholesaleA')?.value);
  const priceAtacadoA = limparValorCalc(document.getElementById('compPriceWholesaleA')?.value);

  const qtyB = limparValorCalc(document.getElementById('compQtyB')?.value);
  const priceB = limparValorCalc(document.getElementById('compPriceB')?.value);
  const hasAtacadoB = document.getElementById('compHasWholesaleB')?.checked || false;
  const minAtacadoB = limparValorCalc(document.getElementById('compMinWholesaleB')?.value);
  const priceAtacadoB = limparValorCalc(document.getElementById('compPriceWholesaleB')?.value);

  const resA = document.getElementById('compResultUnitA');
  const resB = document.getElementById('compResultUnitB');
  const verdict = document.getElementById('compVerdictCard');

  const baseDivisor = (compCurrentMode === 'unit') ? 1 : 1000;
  const unitLabel = (compCurrentMode === 'weight') ? 'kg' : (compCurrentMode === 'volume') ? 'L' : 'un';
  const unitInputLabel = (compCurrentMode === 'weight') ? 'g' : (compCurrentMode === 'volume') ? 'ml' : 'un';

  const baseCostA = (qtyA > 0 && priceA > 0) ? priceA / (qtyA / baseDivisor) : 0;
  const baseCostB = (qtyB > 0 && priceB > 0) ? priceB / (qtyB / baseDivisor) : 0;

  if (resA) resA.innerText = baseCostA > 0 ? `R$ ${formatarMoedaCalc(baseCostA)} / ${unitLabel}` : `R$ 0,00 / ${unitLabel}`;
  if (resB) resB.innerText = baseCostB > 0 ? `R$ ${formatarMoedaCalc(baseCostB)} / ${unitLabel}` : `R$ 0,00 / ${unitLabel}`;

  if (!verdict) return;

  if (baseCostA <= 0 || baseCostB <= 0) {
    verdict.className = 'p-3 rounded-xl border border-dashed border-slate-300 bg-white text-center';
    verdict.innerHTML = `<p class="text-xs text-slate-500 font-medium">Informe quantidade e preço das opções para comparar.</p>`;
    return;
  }

  // CENÁRIO 1: META DE COMPRA DEFINIDA
  if (targetVal > 0) {
    const metaReal = (compCurrentMode === 'unit') ? targetVal : (targetVal * 1000);

    const pacotesA = Math.ceil(metaReal / qtyA);
    const aplicaAtacadoA = hasAtacadoA && minAtacadoA > 0 && priceAtacadoA > 0 && pacotesA >= minAtacadoA;
    const precoUnitA = aplicaAtacadoA ? priceAtacadoA : priceA;
    const totalGastoA = pacotesA * precoUnitA;
    const totalEntregueA = (pacotesA * qtyA) / baseDivisor;

    const pacotesB = Math.ceil(metaReal / qtyB);
    const aplicaAtacadoB = hasAtacadoB && minAtacadoB > 0 && priceAtacadoB > 0 && pacotesB >= minAtacadoB;
    const precoUnitB = aplicaAtacadoB ? priceAtacadoB : priceB;
    const totalGastoB = pacotesB * precoUnitB;
    const totalEntregueB = (pacotesB * qtyB) / baseDivisor;

    const diff = Math.abs(totalGastoA - totalGastoB);
    const empate = diff < 0.01;
    const venceA = totalGastoA < totalGastoB;

    if (empate) {
      verdict.className = 'p-4 rounded-2xl border-2 border-amber-400 bg-amber-50 text-left shadow-sm';
      verdict.innerHTML = `
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-amber-200">
          <span class="text-xs font-black text-amber-900 tracking-wide uppercase">⚖️ Empate Técnico Rigoroso</span>
          <span class="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">Mesmo Gasto Total</span>
        </div>
        <p class="text-xs text-amber-900 font-bold mb-3">
          Ambas as opções exigem o mesmo investimento de <span class="underline decoration-amber-500 decoration-2">R$ ${formatarMoedaCalc(totalGastoA)}</span> para suprir a meta de ${targetVal} ${unitLabel}.
        </p>
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="p-2 rounded-xl bg-white/90 border border-amber-200">
            <span class="font-extrabold text-slate-800 block">Opção A</span>
            <span class="text-slate-600 block">${pacotesA} un ${aplicaAtacadoA ? '(Atacado)' : '(Varejo)'}</span>
            <span class="font-black text-slate-900 text-xs mt-1 block">R$ ${formatarMoedaCalc(totalGastoA)}</span>
            <span class="text-[10px] text-slate-500">Leva ${totalEntregueA.toFixed(2)} ${unitLabel}</span>
          </div>
          <div class="p-2 rounded-xl bg-white/90 border border-amber-200">
            <span class="font-extrabold text-slate-800 block">Opção B</span>
            <span class="text-slate-600 block">${pacotesB} un ${aplicaAtacadoB ? '(Atacado)' : '(Varejo)'}</span>
            <span class="font-black text-slate-900 text-xs mt-1 block">R$ ${formatarMoedaCalc(totalGastoB)}</span>
            <span class="text-[10px] text-slate-500">Leva ${totalEntregueB.toFixed(2)} ${unitLabel}</span>
          </div>
        </div>
      `;
      return;
    }

    verdict.className = 'p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-left shadow-md';
    verdict.innerHTML = `
      <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-emerald-200">
        <div class="flex items-center space-x-1.5">
          <span class="text-base">🏆</span>
          <span class="text-xs font-black text-emerald-950 uppercase tracking-wide">Melhor Escolha: Opção ${venceA ? 'A' : 'B'}</span>
        </div>
        <span class="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
          Economiza R$ ${formatarMoedaCalc(diff)}
        </span>
      </div>

      <div class="space-y-2">
        <div class="p-2.5 rounded-xl bg-white border-2 border-emerald-500 shadow-xs">
          <div class="flex justify-between items-center">
            <span class="text-xs font-black text-emerald-900">
              Opção ${venceA ? 'A' : 'B'} (${venceA ? pacotesA : pacotesB} un ${(venceA ? aplicaAtacadoA : aplicaAtacadoB) ? '<span class="text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded text-[10px] font-bold">Atacado</span>' : '<span class="text-slate-500 text-[10px] font-medium">Varejo</span>'}):
            </span>
            <span class="text-sm font-black text-emerald-700">R$ ${formatarMoedaCalc(venceA ? totalGastoA : totalGastoB)}</span>
          </div>
          <div class="text-[10px] text-slate-600 font-medium mt-0.5 flex justify-between">
            <span>Volume entregue: ${(venceA ? totalEntregueA : totalEntregueB).toFixed(2)} ${unitLabel}</span>
            <span>Custo real: R$ ${formatarMoedaCalc((venceA ? totalGastoA : totalGastoB) / (venceA ? totalEntregueA : totalEntregueB))} / ${unitLabel}</span>
          </div>
        </div>

        <div class="p-2 rounded-xl bg-slate-100/80 border border-slate-200 opacity-75">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-slate-600">
              Opção ${venceA ? 'B' : 'A'} (${venceA ? pacotesB : pacotesA} un ${(venceA ? aplicaAtacadoB : aplicaAtacadoA) ? 'Atacado' : 'Varejo'}):
            </span>
            <span class="font-bold text-slate-700">R$ ${formatarMoedaCalc(venceA ? totalGastoB : totalGastoA)}</span>
          </div>
          <div class="text-[10px] text-slate-500 mt-0.5">
            Leva ${(venceA ? totalEntregueB : totalEntregueA).toFixed(2)} ${unitLabel} a R$ ${formatarMoedaCalc((venceA ? totalGastoB : totalGastoA) / (venceA ? totalEntregueB : totalEntregueA))} / ${unitLabel}
          </div>
        </div>
      </div>

      <div class="mt-2.5 pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
        <span class="text-emerald-900 font-bold">Vantagem no caixa:</span>
        <span class="font-black text-emerald-800 text-xs">Paga R$ ${formatarMoedaCalc(diff)} a menos pela meta</span>
      </div>
    `;
    return;
  }

  // CENÁRIO 2: SEM META DEFINIDA (COMPARAÇÃO PROPORCIONAL COM GATILHOS)
  const costEffA = (hasAtacadoA && priceAtacadoA > 0) ? (priceAtacadoA / (qtyA / baseDivisor)) : baseCostA;
  const costEffB = (hasAtacadoB && priceAtacadoB > 0) ? (priceAtacadoB / (qtyB / baseDivisor)) : baseCostB;

  const diffUnit = Math.abs(costEffA - costEffB);
  const empateUnit = diffUnit < 0.001;

  if (empateUnit) {
    verdict.className = 'p-4 rounded-2xl border-2 border-amber-400 bg-amber-50 text-center shadow-sm';
    verdict.innerHTML = `
      <div class="inline-block bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full mb-1 uppercase tracking-wide">
        ⚖️ Empate Técnico Proporcional
      </div>
      <h4 class="text-xs font-black text-amber-900 mt-1">Custo Exatamente Idêntico</h4>
      <p class="text-[11px] text-amber-800 mt-1 font-medium">
        Ambas as opções saem a <strong>R$ ${formatarMoedaCalc(costEffA)} / ${unitLabel}</strong>. O tamanho maior não oferece desconto proporcional.
      </p>
    `;
    return;
  }

  const optMaior = qtyA >= qtyB ? 'A' : 'B';
  const optMenor = qtyA >= qtyB ? 'B' : 'A';
  const qtyMaior = Math.max(qtyA, qtyB);
  const qtyMenor = Math.min(qtyA, qtyB);
  const priceMenor = optMenor === 'A' ? (hasAtacadoA && priceAtacadoA > 0 ? priceAtacadoA : priceA) : (hasAtacadoB && priceAtacadoB > 0 ? priceAtacadoB : priceB);
  const priceMaior = optMaior === 'A' ? (hasAtacadoA && priceAtacadoA > 0 ? priceAtacadoA : priceA) : (hasAtacadoB && priceAtacadoB > 0 ? priceAtacadoB : priceB);
  const costMaior = optMaior === 'A' ? costEffA : costEffB;
  const costMenor = optMenor === 'A' ? costEffA : costEffB;

  const maiorCompensa = costMaior < costMenor;
  const percEconomia = maiorCompensa 
    ? ((costMenor - costMaior) / costMenor) * 100 
    : ((costMaior - costMenor) / costMaior) * 100;

  const precoTetoMenor = (qtyMenor / baseDivisor) * costMaior;
  const precoTetoMaior = (qtyMaior / baseDivisor) * costMenor;
  const qtdPacotesMenoresParaIgualarOuSuperar = Math.ceil(qtyMaior / qtyMenor);
  const volumeEntregueMultiplo = (qtdPacotesMenoresParaIgualarOuSuperar * qtyMenor) / baseDivisor;
  const custoMultiploMenores = qtdPacotesMenoresParaIgualarOuSuperar * priceMenor;

  if (maiorCompensa) {
    verdict.className = 'p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-left shadow-md';
    verdict.innerHTML = `
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200">
        <span class="text-xs font-black text-emerald-950 uppercase tracking-wide">🏆 Pacote Maior Compensa no Quilo</span>
        <span class="bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
          ${percEconomia.toFixed(1)}% mais em conta
        </span>
      </div>

      <p class="text-xs text-emerald-900 font-medium leading-relaxed">
        A embalagem maior de <strong>${qtyMaior} ${unitInputLabel}</strong> (Opção ${optMaior}) entrega menor custo unitário: <strong>R$ ${formatarMoedaCalc(costMaior)} / ${unitLabel}</strong> contra R$ ${formatarMoedaCalc(costMenor)} / ${unitLabel} da Opção ${optMenor}.
      </p>

      <div class="mt-2.5 p-2 rounded-xl bg-white border border-emerald-300 flex items-center justify-between text-xs">
        <span class="text-slate-600 font-semibold">Economia por ${unitLabel}:</span>
        <span class="font-black text-emerald-700 text-sm">R$ ${formatarMoedaCalc(diffUnit)} / ${unitLabel}</span>
      </div>

      <div class="mt-3 pt-2.5 border-t border-emerald-200 space-y-1.5">
        <div class="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1">
          <span>🎯</span>
          <span>Quando compensa levar o menor (${qtyMenor} ${unitInputLabel}):</span>
        </div>
        
        <ul class="text-[11px] text-slate-700 space-y-1 list-disc pl-4 font-normal">
          <li>
            <strong>Por preço:</strong> O menor só compensa proporcionalmente se estiver até <strong>R$ ${formatarMoedaCalc(precoTetoMenor)}</strong> (está R$ ${formatarMoedaCalc(priceMenor - precoTetoMenor)} acima do limite).
          </li>
          <li>
            <strong>Por consumo imediato:</strong> Se o produto corre risco de estragar antes do fim, levar 1 menor exige menor saída de caixa imediata (R$ ${formatarMoedaCalc(priceMenor)} contra R$ ${formatarMoedaCalc(priceMaior)}).
          </li>
          <li>
            <strong>Por volume aproximado:</strong> Comprar ${qtdPacotesMenoresParaIgualarOuSuperar} unidades de ${qtyMenor} ${unitInputLabel} somaria ${volumeEntregueMultiplo} ${unitLabel} por <strong>R$ ${formatarMoedaCalc(custoMultiploMenores)}</strong> (contra R$ ${formatarMoedaCalc(priceMaior)} do pacote de ${qtyMaior} ${unitInputLabel}).
          </li>
        </ul>
      </div>
    `;
  } else {
    verdict.className = 'p-4 rounded-2xl border-2 border-rose-400 bg-rose-50 text-left shadow-md';
    verdict.innerHTML = `
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-rose-200">
        <span class="text-xs font-black text-rose-950 uppercase tracking-wide">⚠️ Pacote Menor é Mais Barato</span>
        <span class="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
          Armadilha no Maior
        </span>
      </div>

      <p class="text-xs text-rose-950 font-medium leading-relaxed">
        A embalagem menor de <strong>${qtyMenor} ${unitInputLabel}</strong> (Opção ${optMenor}) está <strong>${percEconomia.toFixed(1)}% mais econômica</strong> por quilo do que a de ${qtyMaior} ${unitInputLabel} (Opção ${optMaior}).
      </p>

      <div class="mt-2.5 p-2 rounded-xl bg-white border border-rose-300 flex items-center justify-between text-xs">
        <span class="text-slate-600 font-semibold">Prejuízo por ${unitLabel} no maior:</span>
        <span class="font-black text-rose-700 text-sm">+ R$ ${formatarMoedaCalc(diffUnit)} / ${unitLabel}</span>
      </div>

      <div class="mt-3 pt-2.5 border-t border-rose-200 space-y-1.5">
        <div class="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1">
          <span>🎯</span>
          <span>Para a embalagem maior (${qtyMaior} ${unitInputLabel}) compensar:</span>
        </div>
        
        <p class="text-[11px] text-slate-700">
          O pacote de ${qtyMaior} ${unitInputLabel} precisaria custar no máximo <strong>R$ ${formatarMoedaCalc(precoTetoMaior)}</strong> para justificar a compra em quantidade em relação ao preço atual do menor.
        </p>
      </div>
    `;
  }
}
window.calcularComparativoPrecos = calcularComparativoPrecos;

function limparCalculadoraComparativa() {
  const idsInputs = [
    'compTargetQty',
    'compQtyA', 'compPriceA', 'compMinWholesaleA', 'compPriceWholesaleA',
    'compQtyB', 'compPriceB', 'compMinWholesaleB', 'compPriceWholesaleB'
  ];

  idsInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const chkA = document.getElementById('compHasWholesaleA');
  const chkB = document.getElementById('compHasWholesaleB');
  if (chkA) {
    chkA.checked = false;
    toggleWholesaleSection('A');
  }
  if (chkB) {
    chkB.checked = false;
    toggleWholesaleSection('B');
  }

  const resA = document.getElementById('compResultUnitA');
  const resB = document.getElementById('compResultUnitB');
  const unitLabel = (compCurrentMode === 'weight') ? 'kg' : (compCurrentMode === 'volume') ? 'L' : 'un';
  
  if (resA) resA.innerText = `R$ 0,00 / ${unitLabel}`;
  if (resB) resB.innerText = `R$ 0,00 / ${unitLabel}`;

  const verdict = document.getElementById('compVerdictCard');
  if (verdict) {
    verdict.className = 'p-3 rounded-xl border border-dashed border-slate-300 bg-white text-center';
    verdict.innerHTML = `<p class="text-xs text-slate-500 font-medium">Informe a quantidade e o preço de ambas as opções.</p>`;
  }

  document.getElementById('compQtyA')?.focus();
}
window.limparCalculadoraComparativa = limparCalculadoraComparativa