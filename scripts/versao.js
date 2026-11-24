/**
 * Troca a versão (?v=...) de TODOS os scripts locais do index.html de uma vez:
 * tags <script> e o import map. Assim o navegador baixa os arquivos novos e todo
 * módulo continua sendo importado pelo MESMO endereço (uma única cópia de cada).
 *
 *   npm run versao            -> sobe o último número (6.1.0 -> 6.1.1)
 *   npm run versao -- 6.2.0   -> usa a versão informada
 */
const fs = require('fs');
const path = require('path');

// VERSAO_ARQUIVO: usado pelos testes para rodar numa cópia do index.html
const arquivo = process.env.VERSAO_ARQUIVO || path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(arquivo, 'utf8');

const atuais = [...html.matchAll(/js\/(?!vendor\/)[^"'?\s]+\.js\?v=([0-9]+\.[0-9]+\.[0-9]+)/g)].map(m => m[1]);
if (!atuais.length) throw new Error('nenhum ?v= encontrado no index.html');
const maior = atuais.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();

let nova = process.argv[2];
if (!nova) {
  const [a, b, c] = maior.split('.').map(Number);
  nova = `${a}.${b}.${c + 1}`;
}
if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(nova)) throw new Error('versão inválida: ' + nova);

let n = 0;
html = html.replace(/(js\/(?!vendor\/)[^"'?\s]+\.js)\?v=[0-9]+\.[0-9]+\.[0-9]+/g, (_, arq) => { n++; return `${arq}?v=${nova}`; });
fs.writeFileSync(arquivo, html);
console.log(`versão ${maior} -> ${nova} (${n} endereços no index.html)`);
