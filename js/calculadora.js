/**
 * SUPERCOMPRAS PRO - CALCULADORA COMPARATIVA DE PREÇO POR UNIDADE BASE
 * Módulo modular desacoplado para tomada rápida de decisão no corredor
 */

let compCurrentMode = 'weight'; // Opções: 'weight' (g/kg), 'volume' (ml/L), 'unit' (unidades/rolos)

function abrirCalculadoraComparativa() {
  const modal = document.getElementById('modalPriceComparator');
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('compQtyA')?.focus();
    }, 100);
  }
}

function fecharCalculadoraComparativa() {
  const modal = document.getElementById('modalPriceComparator');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function setCompMode(mode) {
  compCurrentMode = mode;
  
  const btnW = document.getElementById('compModeWeight');
  const btnV = document.getElementById('compModeVolume');
  const btnU = document.getElementById('compModeUnit');
  const sA = document.getElementById('compSuffixA');
  const sB = document.getElementById('compSuffixB');
  const lblA = document.getElementById('labelUnitBaseA');
  const lblB = document.getElementById('labelUnitBaseB');

  if (!btnW || !btnV || !btnU || !sA || !sB || !lblA || !lblB) return;

  [btnW, btnV, btnU].forEach(b => {
    b.className = 'flex-1 py-1 rounded-lg text-center transition-all text-slate-600 font-semibold';
  });

  if (mode === 'weight') {
    btnW.className = 'flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center font-bold';
    sA.innerText = 'g';
    sB.innerText = 'g';
    lblA.innerText = 'Preço por kg';
    lblB.innerText = 'Preço por kg';
  } else if (mode === 'volume') {
    btnV.className = 'flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center font-bold';
    sA.innerText = 'ml';
    sB.innerText = 'ml';
    lblA.innerText = 'Preço por Litro';
    lblB.innerText = 'Preço por Litro';
  } else {
    btnU.className = 'flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center font-bold';
    sA.innerText = 'un';
    sB.innerText = 'un';
    lblA.innerText = 'Preço por Unidade';
    lblB.innerText = 'Preço por Unidade';
  }

  calcularComparativoPrecos();
}

function calcularComparativoPrecos() {
  const parseVal = typeof parseNumberInput === 'function' 
    ? parseNumberInput 
    : (val) => {
        if (!val) return 0;
        const n = parseFloat(String(val).trim().replace(',', '.'));
        return isNaN(n) ? 0 : n;
      };

  const fmtMoeda = typeof formatBRL === 'function'
    ? formatBRL
    : (num) => (Number(num) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const qtyA = parseVal(document.getElementById('compQtyA')?.value);
  const priceA = parseVal(document.getElementById('compPriceA')?.value);

  const qtyB = parseVal(document.getElementById('compQtyB')?.value);
  const priceB = parseVal(document.getElementById('compPriceB')?.value);

  const resA = document.getElementById('compResultUnitA');
  const resB = document.getElementById('compResultUnitB');
  const verdict = document.getElementById('compVerdictCard');

  if (!resA || !resB || !verdict) return;

  const baseDivisor = (compCurrentMode === 'unit') ? 1 : 1000;
  const unitLabel = (compCurrentMode === 'weight') ? 'kg' : (compCurrentMode === 'volume') ? 'L' : 'un';

  let normA = 0;
  let normB = 0;

  if (qtyA > 0 && priceA > 0) {
    normA = priceA / (qtyA / baseDivisor);
    resA.innerText = `R$ ${fmtMoeda(normA)} / ${unitLabel}`;
  } else {
    resA.innerText = `R$ 0,00 / ${unitLabel}`;
  }

  if (qtyB > 0 && priceB > 0) {
    normB = priceB / (qtyB / baseDivisor);
    resB.innerText = `R$ ${fmtMoeda(normB)} / ${unitLabel}`;
  } else {
    resB.innerText = `R$ 0,00 / ${unitLabel}`;
  }

  if (normA > 0 && normB > 0) {
    const diff = Math.abs(normA - normB);
    if (diff < 0.001) {
      verdict.className = 'p-3 rounded-xl border border-slate-300 bg-slate-50 text-center';
      verdict.innerHTML = `
        <span class="text-xs font-black text-slate-700 block">⚖️ Preços Equivalentes</span>
        <span class="text-[11px] text-slate-500">Ambas as opções possuem rigorosamente o mesmo custo proporcional por ${unitLabel}.</span>
      `;
    } else if (normA < normB) {
      const perc = ((normB - normA) / normB) * 100;
      verdict.className = 'p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-center';
      verdict.innerHTML = `
        <div class="text-xs font-black text-emerald-800 flex items-center justify-center space-x-1">
          <span>🏆 Opção A compensa mais:</span>
          <span class="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[11px]">${perc.toFixed(1)}% mais barata</span>
        </div>
        <p class="text-[11px] text-emerald-700 mt-1">
          Economia de <strong>R$ ${fmtMoeda(diff)}</strong> por ${unitLabel}.
        </p>
      `;
    } else {
      const perc = ((normA - normB) / normA) * 100;
      verdict.className = 'p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-center';
      verdict.innerHTML = `
        <div class="text-xs font-black text-emerald-800 flex items-center justify-center space-x-1">
          <span>🏆 Opção B compensa mais:</span>
          <span class="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[11px]">${perc.toFixed(1)}% mais barata</span>
        </div>
        <p class="text-[11px] text-emerald-700 mt-1">
          Economia de <strong>R$ ${fmtMoeda(diff)}</strong> por ${unitLabel}.
        </p>
      `;
    }
  } else {
    verdict.className = 'p-3 rounded-xl border border-dashed border-slate-300 bg-white text-center';
    verdict.innerHTML = `<p class="text-xs text-slate-500 font-medium">Preencha quantidade e preço das opções para comparar.</p>`;
  }
}

function carregarExemploComp(tipo) {
  if (tipo === 'leite') {
    setCompMode('weight');
    document.getElementById('compQtyA').value = '400';
    document.getElementById('compPriceA').value = '14,90';
    document.getElementById('compQtyB').value = '1000';
    document.getElementById('compPriceB').value = '34,90';
  } else if (tipo === 'papel') {
    setCompMode('unit');
    document.getElementById('compQtyA').value = '12';
    document.getElementById('compPriceA').value = '19,90';
    document.getElementById('compQtyB').value = '24';
    document.getElementById('compPriceB').value = '36,50';
  }
  calcularComparativoPrecos();
}

// Fecha ao clicar fora da caixa no celular
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modalPriceComparator');
  if (!modal || modal.classList.contains('hidden')) return;
  if (e.target === modal) {
    fecharCalculadoraComparativa();
  }
});