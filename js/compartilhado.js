/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - VARIÁVEIS COMPARTILHADAS ENTRE ARQUIVOS (js/compartilhado.js)
 *
 * Dentro de um módulo, "let products = []" fica PRIVADO ao arquivo. Mas o estado do app
 * (products, cart, supermarkets, activeMarketId...) é lido e ALTERADO por muitos arquivos,
 * com "products = novaLista". Para isso continuar funcionando, essas variáveis viram
 * propriedades controladas do window:
 *
 *   variavelGlobal('products', []);   // no arquivo dono da variável (ex.: state.js)
 *   products = [...];                  // em qualquer arquivo: grava pelo "set"
 *   products.length                    // em qualquer arquivo: lê pelo "get"
 *
 * Cada nome só pode ser criado uma vez (um único dono). Os nomes ficam listados no
 * comentário do arquivo dono e em tests/modulos.test.js.
 *
 * Carregue ANTES de todos os outros módulos.
 */

const _criadas = new Set();

export function variavelGlobal(nome, valorInicial) {
  if (_criadas.has(nome)) throw new Error(`variavelGlobal: "${nome}" já foi criada por outro arquivo`);
  _criadas.add(nome);
  let valor = valorInicial;
  Object.defineProperty(window, nome, {
    get: () => valor,
    set: (novo) => { valor = novo; },
    enumerable: true,
    configurable: false,      // ninguém troca a propriedade por outra coisa sem querer
  });
}

