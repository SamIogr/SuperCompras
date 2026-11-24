/**
 * Procura atribuições a variáveis que NUNCA foram declaradas ("x = 1" sem let/const/var).
 * Em script comum isso cria uma global sem aviso; em módulo (sempre estrito) dá erro e
 * quebra a tela. Análise aproximada (sem parser): junta todos os nomes declarados no app
 * e aponta "nome =" cujo nome não aparece em nenhuma declaração.
 * Usado por tests/modulos.test.js.
 */
const fs = require('fs');
const path = require('path');

function semComentariosETextos(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, '``')        // template strings
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

function nomesDeclarados(fonte) {
  const nomes = new Set();
  const add = lista => lista.split(',').map(p => p.trim().replace(/=.*$/, '').replace(/^\.\.\./, '').trim())
    .filter(n => /^[A-Za-z_$][\w$]*$/.test(n)).forEach(n => nomes.add(n));
  for (const m of fonte.matchAll(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)) nomes.add(m[1]);
  // várias na mesma declaração: const x = a[k], y = b[k];
  for (const m of fonte.matchAll(/\b(?:let|const|var)\s+([^;\n]*)/g)) {
    for (const d of m[1].matchAll(/,\s*([A-Za-z_$][\w$]*)\s*(?==|,|$)/g)) nomes.add(d[1]);
  }
  for (const m of fonte.matchAll(/\b(?:let|const|var)\s*\{([^}]*)\}/g)) add(m[1].replace(/\w+\s*:/g, ''));
  for (const m of fonte.matchAll(/\b(?:let|const|var)\s*\[([^\]]*)\]/g)) add(m[1]);
  for (const m of fonte.matchAll(/\b(?:function|class)\s*\*?\s*([A-Za-z_$][\w$]*)/g)) nomes.add(m[1]);
  for (const m of fonte.matchAll(/\bfunction\s*\*?\s*[A-Za-z_$]*\s*\(([^)]*)\)/g)) add(m[1]);
  for (const m of fonte.matchAll(/\(([^()]*)\)\s*=>/g)) add(m[1]);
  for (const m of fonte.matchAll(/\b([A-Za-z_$][\w$]*)\s*=>/g)) nomes.add(m[1]);
  for (const m of fonte.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g)) nomes.add(m[1]);
  for (const m of fonte.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/gm)) add(m[2]);   // métodos de objeto
  for (const m of fonte.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) nomes.add(m[1]);
  for (const m of fonte.matchAll(/variavelGlobal\(\s*['"]([A-Za-z_$][\w$]*)['"]/g)) nomes.add(m[1]);
  for (const m of fonte.matchAll(/Object\.assign\(window,\s*\{([^}]*)\}\)/g)) add(m[1]);
  return nomes;
}

/** arquivos: caminhos relativos à raiz. Devolve ["arquivo:linha nome", ...] */
function atribuicoesSoltas(raiz, arquivos) {
  const fontes = Object.fromEntries(arquivos.map(f => [f, semComentariosETextos(fs.readFileSync(path.join(raiz, f), 'utf8'))]));
  const declarados = new Set();
  Object.values(fontes).forEach(s => nomesDeclarados(s).forEach(n => declarados.add(n)));
  // variavelGlobal('nome', ...) declara "nome" — lido no código original, porque a limpeza
  // de textos acima apaga o que está entre aspas
  for (const f of arquivos) {
    for (const m of fs.readFileSync(path.join(raiz, f), 'utf8').matchAll(/variavelGlobal\(\s*['"]([A-Za-z_$][\w$]*)['"]/g)) declarados.add(m[1]);
  }
  // globais do navegador / vendor que podem ser atribuídas legitimamente
  ['location', 'onerror', 'name', 'status'].forEach(n => declarados.add(n));
  const achados = [];
  for (const [f, s] of Object.entries(fontes)) {
    s.split('\n').forEach((linha, i) => {
      if (/<[a-z][^>]*\s[a-z-]+="/i.test(linha)) return;            // linha de HTML dentro de template
      for (const m of linha.matchAll(/(^|[;{(,]|\b(?:else|return|=>))\s*([A-Za-z_$][\w$]*)\s*(?:=(?![=>])|\+=|-=|\|\|=|&&=|\?\?=)/g)) {
        const nome = m[2];
        if (['let', 'const', 'var', 'this', 'return', 'typeof', 'new', 'in', 'of', 'case'].includes(nome)) continue;
        // atributos HTML (class="..." dentro de templates com ${...} aninhado)
        if (['class', 'id', 'type', 'style', 'href', 'src', 'title', 'for', 'placeholder', 'viewBox', 'fill', 'stroke', 'd'].includes(nome)) continue;
        if (!declarados.has(nome)) achados.push(`${f}:${i + 1} ${nome}`);
      }
    });
  }
  return achados;
}

module.exports = { atribuicoesSoltas };
