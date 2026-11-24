/**
 * Análise do código dos módulos com o parser do sucrase (já instalado com o Tailwind):
 * o que cada arquivo DECLARA no topo e o que ele USA (nomes de variáveis/funções),
 * ignorando propriedades (obj.x) e chaves de objeto ({ x: 1 }).
 * Usado pelo script de imports da etapa 4 e pelos testes.
 */
const { parse } = require('sucrase/dist/parser');
const { IdentifierRole } = require('sucrase/dist/parser/tokenizer');

const NOME = /^[A-Za-z_$][\w$]*$/;

function analisar(codigo) {
  const { tokens } = parse(codigo, false, false, false);
  const declarados = new Set();     // declarações de topo (function, const, let, class)
  const importados = new Set();
  const usados = new Set();         // referências a nomes (inclui atalhos { a } em objetos)
  const windowProps = [];           // window.X  -> { nome, inicio, fim, atribuicao }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const txt = codigo.slice(t.start, t.end);
    if (!NOME.test(txt)) continue;
    const papel = t.identifierRole;
    if (papel === IdentifierRole.TopLevelDeclaration) declarados.add(txt);
    else if (papel === IdentifierRole.ImportDeclaration) importados.add(txt);
    else if (papel === IdentifierRole.Access || papel === IdentifierRole.ObjectShorthand
      || papel === IdentifierRole.ObjectShorthandTopLevelDeclaration || papel === IdentifierRole.ObjectShorthandFunctionScopedDeclaration
      || papel === IdentifierRole.ObjectShorthandBlockScopedDeclaration || papel === IdentifierRole.ExportAccess) usados.add(txt);

    // window.X (propriedade lida ou atribuída)
    if (txt === 'window' && papel === IdentifierRole.Access) {
      const ponto = tokens[i + 1], prop = tokens[i + 2];
      if (ponto && codigo.slice(ponto.start, ponto.end) === '.' && prop && NOME.test(codigo.slice(prop.start, prop.end))) {
        const depois = tokens[i + 3];
        const op = depois ? codigo.slice(depois.start, depois.end) : '';
        windowProps.push({ nome: codigo.slice(prop.start, prop.end), inicio: t.start, fim: prop.end, atribuicao: op === '=' });
      }
    }
  }
  return { declarados, importados, usados, windowProps };
}

module.exports = { analisar };
