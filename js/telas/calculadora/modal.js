/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CALCULADORA: JANELA DO COMPARADOR DE PREÇO E ATACADO (js/telas/calculadora/modal.js)
 */

import { AppTemplates } from '../../ui/templates-base.js';

Object.assign(AppTemplates, {
  // 8. MODAL DA CALCULADORA COMPARATIVA
  renderPriceComparatorModal() {
    document.querySelectorAll('#modalPriceComparator').forEach(el => el.remove());

    const modalHtml = `
      <div id="modalPriceComparator" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 space-y-3 max-h-[92vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div class="flex items-center space-x-2">
              <div class="w-7 h-7 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-black text-sm">⚖️</div>
              <div>
                <h3 class="font-extrabold text-slate-800 text-sm">Comparador de Preço e Atacado</h3>
                <p class="text-[10px] text-slate-500 font-medium">Decida pelo menor custo unitário ou pela meta de compra</p>
              </div>
            </div>
            <button type="button" data-acao="calculadora-fechar" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-lg font-bold">✕</button>
          </div>

          <div class="flex items-center justify-between bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button type="button" id="compModeWeight" data-acao="calculadora-modo" data-modo="weight" class="flex-1 py-1 rounded-lg bg-white text-slate-800 shadow-xs text-center transition-all font-bold">Peso (g / kg)</button>
            <button type="button" id="compModeVolume" data-acao="calculadora-modo" data-modo="volume" class="flex-1 py-1 rounded-lg text-center transition-all text-slate-600 font-semibold">Volume (ml / L)</button>
            <button type="button" id="compModeUnit" data-acao="calculadora-modo" data-modo="unit" class="flex-1 py-1 rounded-lg text-center transition-all text-slate-600 font-semibold">Unidades</button>
          </div>

          <div class="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
            <div class="flex items-center justify-between mb-1">
              <label for="compTargetQty" class="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                <span>🎯 Quanto você precisa levar?</span>
                <span class="text-[10px] font-normal text-amber-700">(Opcional)</span>
              </label>
              <span id="compTargetSuffix" class="text-[10px] font-bold text-amber-800">em kg</span>
            </div>
            <input type="text" id="compTargetQty" inputmode="decimal" placeholder="Ex: 2 (para 2 kg)" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none" />
          </div>

          <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Opção A (ex: pacote menor)</span>
              <span id="labelUnitBaseA" class="text-[10px] text-slate-500 font-normal">Preço por kg</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Tamanho / Peso</label>
                <div class="relative">
                  <input type="text" id="compQtyA" inputmode="decimal" placeholder="Ex: 400" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1.5 pl-2.5 pr-7 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  <span id="compSuffixA" class="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">g</span>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Preço Unitário (R$)</label>
                <input type="text" id="compPriceA" inputmode="decimal" placeholder="Ex: 11,95" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div class="pt-1 border-t border-slate-200/60">
              <label class="flex items-center space-x-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                <input type="checkbox" id="compHasWholesaleA" data-acao="calculadora-atacado" data-opcao="A" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                <span>Tem preço de atacado</span>
              </label>
              <div id="compWholesaleBoxA" class="hidden grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-dashed border-slate-200">
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">A partir de (qtd)</label>
                  <input type="text" id="compMinWholesaleA" inputmode="numeric" placeholder="Ex: 3" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Preço no atacado (R$)</label>
                  <input type="text" id="compPriceWholesaleA" inputmode="decimal" placeholder="Ex: 10,00" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs pt-0.5">
              <span class="text-[11px] text-slate-500">Custo equivalente:</span>
              <span id="compResultUnitA" class="font-extrabold text-slate-800 text-xs">R$ 0,00 / kg</span>
            </div>
          </div>

          <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Opção B (ex: pacote maior)</span>
              <span id="labelUnitBaseB" class="text-[10px] text-slate-500 font-normal">Preço por kg</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Tamanho / Peso</label>
                <div class="relative">
                  <input type="text" id="compQtyB" inputmode="decimal" placeholder="Ex: 1000" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1.5 pl-2.5 pr-7 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  <span id="compSuffixB" class="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">g</span>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Preço Unitário (R$)</label>
                <input type="text" id="compPriceB" inputmode="decimal" placeholder="Ex: 25,00" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div class="pt-1 border-t border-slate-200/60">
              <label class="flex items-center space-x-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                <input type="checkbox" id="compHasWholesaleB" data-acao="calculadora-atacado" data-opcao="B" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                <span>Tem preço de atacado</span>
              </label>
              <div id="compWholesaleBoxB" class="hidden grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-dashed border-slate-200">
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">A partir de (qtd)</label>
                  <input type="text" id="compMinWholesaleB" inputmode="numeric" placeholder="Ex: 3" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Preço no atacado (R$)</label>
                  <input type="text" id="compPriceWholesaleB" inputmode="decimal" placeholder="Ex: 23,00" data-acao="calculadora-recalcular" class="w-full text-xs font-bold py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs pt-0.5">
              <span class="text-[11px] text-slate-500">Custo equivalente:</span>
              <span id="compResultUnitB" class="font-extrabold text-slate-800 text-xs">R$ 0,00 / kg</span>
            </div>
          </div>

          <div id="compVerdictCard" class="p-3 rounded-xl border border-dashed border-slate-300 bg-white text-center">
            <p class="text-xs text-slate-500 font-medium">Informe os valores para comparar.</p>
          </div>

          <div class="pt-1">
            <button type="button" data-acao="calculadora-limpar" class="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer">
              <span></span><span>Limpar Dados</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },
});

