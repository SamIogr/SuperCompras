// O modo escuro funciona com regras "html.dark .classe" escritas à mão no index.html.
// Este teste falha se alguma classe de FUNDO CLARO usada no app não tiver essa regra
// nem um "dark:bg-..." no mesmo elemento (foi assim que o painel do catálogo e o
// comparador ficaram claros no modo escuro).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

function arquivosDoApp() {
  return ['index.html',
    ...fs.readdirSync(path.join(RAIZ, 'components')).filter(f => f.endsWith('.html')).map(f => 'components/' + f),
    ...fs.readdirSync(path.join(RAIZ, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f)];
}

function classesComRegraEscura() {
  const estilos = (ler('index.html').match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
  return new Set([...estilos.matchAll(/html\.dark\s+\.([a-z0-9\-\\\/.]+)/g)].map(m => m[1].replace(/\\/g, '')));
}

const FUNDO_CLARO = /^bg-(white|(slate|gray|amber|emerald|sky|rose|purple|red|green|blue|yellow|orange|teal|indigo)-(50|100|200))(\/\d+)?$/;

test('toda classe de fundo claro tem tratamento no modo escuro', () => {
  const cobertas = classesComRegraEscura();
  const problemas = [];
  for (const arq of arquivosDoApp()) {
    ler(arq).split('\n').forEach((linha, i) => {
      for (const m of linha.matchAll(/class(?:Name)?\s*=\s*["'`]([^"'`]*)["'`]/g)) {
        const classes = m[1].split(/\s+/);
        if (classes.some(c => c.startsWith('dark:bg-'))) continue;
        classes.filter(c => FUNDO_CLARO.test(c) && !cobertas.has(c))
          .forEach(c => problemas.push(`${c} em ${arq}:${i + 1}`));
      }
    });
  }
  assert.deepEqual(problemas, [], 'adicione uma regra "html.dark .classe" no <style> do index.html');
});

test('classes claras adicionadas por JavaScript (classList.add) também têm regra', () => {
  const cobertas = classesComRegraEscura();
  const problemas = [];
  for (const arq of arquivosDoApp().filter(f => f.endsWith('.js'))) {
    for (const m of ler(arq).matchAll(/classList\.(?:add|toggle)\(([^)]*)\)/g)) {
      for (const c of [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1])) {
        if (FUNDO_CLARO.test(c) && !cobertas.has(c)) problemas.push(`${c} em ${arq}`);
      }
    }
  }
  assert.deepEqual(problemas, []);
});
