/**
 * Refaz os "import { ... } from '...'" de TODOS os módulos do app a partir do que cada
 * arquivo realmente usa (análise com o parser do sucrase, ver scripts/analise.js).
 *
 *   npm run imports                 -> reescreve os imports dos arquivos
 *   node scripts/imports.js --conferir  -> só diz quais arquivos estão com imports errados
 *                                         (usado pelos testes; sai com erro se houver)
 *
 * Regras:
 *  - cada nome exportado tem um único dono (dois arquivos exportando o mesmo nome é erro);
 *  - um arquivo importa do dono todo nome que usa e não declara;
 *  - os imports ficam logo depois do comentário de cabeçalho, na ordem do index.html.
 */
const fs = require('fs');
const path = require('path');
const { analisar } = require('./analise');

const RAIZ = path.join(__dirname, '..');
const conferir = process.argv.includes('--conferir');

function scriptsDoIndex() {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  return [...html.matchAll(/<script\b[^>]*\bsrc="(js\/[^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g)].map(m => m[1]);
}
function exportsDoModulo(codigo) {
  const nomes = new Set();
  for (const m of codigo.matchAll(/^\s*export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) nomes.add(m[1]);
  return nomes;
}
const relativo = (de, para) => { const r = path.posix.relative(path.posix.dirname(de), para); return r.startsWith('.') ? r : './' + r; };

function importsCalculados() {
  const modulos = scriptsDoIndex().filter(f => !f.startsWith('js/vendor/'));
  const fontes = Object.fromEntries(modulos.map(f => [f, fs.readFileSync(path.join(RAIZ, f), 'utf8')]));
  const dono = new Map();
  for (const f of modulos) {
    for (const nome of exportsDoModulo(fontes[f])) {
      if (dono.has(nome)) throw new Error(`"${nome}" é exportado por ${dono.get(nome)} e por ${f}`);
      dono.set(nome, f);
    }
  }
  const resultado = {};
  for (const f of modulos) {
    const { declarados, usados } = analisar(fontes[f]);
    const porDono = new Map();
    for (const nome of usados) {
      const d = dono.get(nome);
      if (!d || d === f || declarados.has(nome)) continue;
      if (!porDono.has(d)) porDono.set(d, []);
      porDono.get(d).push(nome);
    }
    resultado[f] = [...porDono.entries()]
      .sort((x, y) => modulos.indexOf(x[0]) - modulos.indexOf(y[0]))
      .map(([d, nomes]) => `import { ${nomes.sort().join(', ')} } from '${relativo(f, d)}';`);
  }
  return { resultado, fontes };
}

function aplicar(codigo, linhas) {
  const eol = codigo.includes('\r\n') ? '\r\n' : '\n';
  let s = codigo.replace(/\r\n/g, '\n').replace(/^import \{[^}]*\} from '[^']+';\n/gm, '');
  const fimCab = s.startsWith('/**') ? s.indexOf('*/\n') + 3 : 0;
  const resto = s.slice(fimCab).replace(/^\n+/, '');
  s = s.slice(0, fimCab) + (linhas.length ? '\n' + linhas.join('\n') + '\n\n' : '\n') + resto;
  s = s.replace(/\n{3,}/g, '\n\n');
  return eol === '\r\n' ? s.replace(/\n/g, '\r\n') : s;
}

const { resultado, fontes } = importsCalculados();
const diferentes = Object.keys(resultado).filter(f => aplicar(fontes[f], resultado[f]) !== fontes[f]);
if (conferir) {
  if (diferentes.length) {
    console.error('imports desatualizados (rode: npm run imports):\n  ' + diferentes.join('\n  '));
    process.exit(1);
  }
  console.log('imports em dia em', Object.keys(resultado).length, 'módulos');
} else {
  for (const f of diferentes) fs.writeFileSync(path.join(RAIZ, f), aplicar(fontes[f], resultado[f]));
  console.log(`imports refeitos em ${diferentes.length} de ${Object.keys(resultado).length} módulos`);
}
