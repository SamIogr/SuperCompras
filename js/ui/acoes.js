/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - AÇÕES DA TELA POR DELEGAÇÃO (js/ui/acoes.js)
 *
 * Os elementos não têm onclick="..." embutido. Em vez disso levam:
 *   <button data-acao="historico-excluir" data-idx="3">
 * e cada tela registra o que fazer com cada ação:
 *   Acoes.registrarClique({ 'historico-excluir': (el, evento) => excluirCompraHistorico(Number(el.dataset.idx)) });
 *
 * Um único ouvinte de clique e um de mudança (change) no documento procuram o
 * [data-acao] mais próximo do que foi tocado e chamam a ação registrada.
 * Vantagens: o HTML não depende do nome das funções, dados (ids, nomes) vão em data-*
 * como texto puro e nunca viram código, e só ações registradas podem ser disparadas.
 *
 * Carregue logo depois de eventos.js, antes das telas.
 */

export const Acoes = (() => {
  // click: toques | change: select/checkbox | input: cada tecla digitada | keydown: tecla pressionada (ex.: Enter) | submit: envio de formulário
  const mapas = { click: Object.create(null), change: Object.create(null), input: Object.create(null), keydown: Object.create(null), submit: Object.create(null) };

  function registrar(tipo, novas) {
    for (const [nome, fn] of Object.entries(novas)) {
      if (typeof fn !== 'function') throw new TypeError(`Ação "${nome}" precisa ser uma função`);
      if (mapas[tipo][nome]) throw new Error(`Ação "${nome}" (${tipo}) já foi registrada por outra parte do app`);
      mapas[tipo][nome] = fn;
    }
  }

  function despachar(tipo, evento) {
    const el = evento.target && evento.target.closest ? evento.target.closest('[data-acao]') : null;
    if (!el) return;
    const acao = mapas[tipo][el.dataset.acao];
    if (!acao) return;
    // formulário com ação registrada nunca recarrega a página
    if (tipo === 'submit' && evento.preventDefault) evento.preventDefault();
    acao(el, evento);
  }

  for (const tipo of Object.keys(mapas)) document.addEventListener(tipo, e => despachar(tipo, e));

  return Object.freeze({
    registrarClique: mapa => registrar('click', mapa),
    registrarMudanca: mapa => registrar('change', mapa),
    registrarDigitacao: mapa => registrar('input', mapa),
    registrarEnvio: mapa => registrar('submit', mapa),
    registrarTecla: mapa => registrar('keydown', mapa),
    // para testes e depuração
    existe: (tipo, nome) => Boolean(mapas[tipo] && mapas[tipo][nome]),
    despachar,
  });
})();

/** Para fundos de modal: só age se o toque foi no próprio fundo, não no conteúdo. */
export function noProprioElemento(fn) {
  return (el, evento) => { if (evento.target === el) fn(el, evento); };
}

