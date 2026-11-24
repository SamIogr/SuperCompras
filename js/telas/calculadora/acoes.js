/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CALCULADORA: AÇÕES (delegação, ver js/ui/acoes.js) (js/telas/calculadora/acoes.js)
 */

Acoes.registrarClique({
  'calculadora-abrir':      () => abrirCalculadoraComparativa(),
  'calculadora-fechar':     () => fecharCalculadoraComparativa(),
  'calculadora-modo':       el => setCompMode(el.dataset.modo),
  'calculadora-limpar':     () => limparCalculadoraComparativa(),
});

Acoes.registrarMudanca({
  'calculadora-atacado':    el => toggleWholesaleSection(el.dataset.opcao),
});

Acoes.registrarDigitacao({
  'calculadora-recalcular': () => calcularComparativoPrecos(),
});

export {};
