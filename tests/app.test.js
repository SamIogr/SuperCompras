// Rode com:  npm test   (ou: node --test tests/)
const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarApp } = require('./carregar-app');

const SCRIPTS = ['js/eventos.js', 'js/armazenamento.js', 'js/state.js', 'js/sync-coordenador.js', 'js/origem.js', 'js/templates.js', 'js/markets.js', 'js/api.js', 'js/cart.js', 'js/drive-sync.js', 'js/history.js'];
const novoApp = () => carregarApp(SCRIPTS);
// objetos criados dentro do contexto do app têm outro "Object" — copiar para comparar com deepEqual
const puro = v => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------- números
test('parseNumberInput entende os formatos que o usuário digita', () => {
  const app = novoApp();
  assert.equal(app.parseNumberInput('2,5'), 2.5);
  assert.equal(app.parseNumberInput('1.299,90'), 1299.9);
  assert.equal(app.parseNumberInput('R$ 12,34'), 12.34);
  assert.equal(app.parseNumberInput('1.299.900'), 1299900);
  assert.equal(app.parseNumberInput('3.5'), 3.5);
  assert.equal(app.parseNumberInput(''), 0);
  assert.equal(app.parseNumberInput(null), 0);
  assert.equal(app.parseNumberInput('abc'), 0);
});

test('formatBRL usa vírgula e separador de milhar', () => {
  const app = novoApp();
  assert.equal(app.formatBRL(1234.5), '1.234,50');
  assert.equal(app.formatBRL(0), '0,00');
  assert.equal(app.formatBRL('x'), '0,00');
});

// ---------------------------------------------------------------- segurança
test('esc() escapa os caracteres especiais de HTML', () => {
  const app = novoApp();
  assert.equal(app.esc(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  assert.equal(app.esc(null), '');
});

test('jsArg() impede que um id malicioso vire código num onclick', () => {
  const app = novoApp();
  // o navegador decodifica as entidades do atributo antes de rodar o JS: simula isso
  const decodificar = s => s.replace(/&#39;|&quot;|&lt;|&gt;|&amp;/g, m =>
    ({ '&#39;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&amp;': '&' }[m]));
  const ataques = ["x');alert(1);//", '");alert(2);//', '</div><img src=x onerror=alert(3)>', 'PROD-001', 42, null];
  for (const ataque of ataques) {
    const atributo = `receber(${app.jsArg(ataque)})`;
    assert.ok(!atributo.includes('"'), 'não pode fechar o atributo HTML: ' + atributo);
    let recebido, executou = false;
    new Function('receber', 'alert', decodificar(atributo))(v => { recebido = v; }, () => { executou = true; });
    assert.equal(executou, false, 'executou código com: ' + ataque);
    assert.equal(recebido, String(ataque ?? ''));
  }
});

test('novoId() mantém o prefixo e não repete', () => {
  const app = novoApp();
  const ids = new Set(Array.from({ length: 2000 }, () => app.novoId('p-custom-')));
  assert.equal(ids.size, 2000);
  for (const id of ids) assert.ok(id.startsWith('p-custom-'));
});

// ---------------------------------------------------------------- normalização
test('normalizarItem preenche os nomes padrão a partir dos antigos', () => {
  const app = novoApp();
  const it = app.normalizarItem({ nome: 'Arroz', quantidade: '1,5', precoUnitario: '10,90', marca: 'Tio João', unidade: 'kg' });
  assert.equal(it.name, 'Arroz');
  assert.equal(it.quantity, 1.5);
  assert.equal(it.unitPrice, 10.9);
  assert.equal(it.selectedBrandId, 'Tio João');
  assert.equal(it.unit, 'kg');
  assert.equal(it.nome, 'Arroz', 'não apaga o campo antigo (backups antigos continuam legíveis)');
});

test('normalizarItem não sobrescreve o que já está no padrão', () => {
  const app = novoApp();
  const it = app.normalizarItem({ name: 'Feijão', nome: 'Outro', quantity: 2, unitPrice: 8, selectedBrandId: 'Camil', marca: 'X' });
  assert.equal(it.name, 'Feijão');
  assert.equal(it.quantity, 2);
  assert.equal(it.unitPrice, 8);
  assert.equal(it.selectedBrandId, 'Camil');
});

test('normalizarItem usa os padrões quando falta tudo', () => {
  const app = novoApp();
  const it = app.normalizarItem({});
  assert.deepEqual(puro(it), { name: '', quantity: 1, unitPrice: 0, selectedBrandId: 'Padrão', unit: 'un' });
});

test('normalizarCompra converte itens/data antigos e NÃO cria id (o Drive identifica por id || date)', () => {
  const app = novoApp();
  const c = app.normalizarCompra({ dataISO: '2026-01-10T10:00:00Z', mercadoNome: 'Condor', itens: [{ nome: 'Leite', quantidade: 2 }] });
  assert.equal(c.date, '2026-01-10T10:00:00Z');
  assert.equal(c.marketName, 'Condor');
  assert.equal(c.items.length, 1);
  assert.equal(c.items[0].name, 'Leite');
  assert.equal(c.id, undefined);
});

test('normalizar é idempotente (rodar duas vezes dá o mesmo resultado)', () => {
  const app = novoApp();
  const uma = puro(app.normalizarCompra({ data: '2026-02-01', itens: [{ nome: 'Pão', quantidade: '3' }] }));
  const duas = puro(app.normalizarCompra(JSON.parse(JSON.stringify(uma))));
  assert.deepEqual(duas, uma);
});

test('normalizarProduto garante os campos que o catálogo usa', () => {
  const app = novoApp();
  const p = app.normalizarProduto({ nome: '  Café  ', basePrice: '15,90' });
  assert.equal(p.name, 'Café');
  assert.equal(p.category, 'Geral');
  assert.equal(p.unit, 'un');
  assert.equal(p.basePrice, 15.9);
  assert.deepEqual(puro(p.marketPrices), {});
  assert.deepEqual(puro(p.brands), []);
});

// ---------------------------------------------------------------- carrinho
test('computeItemFinancials: sem promoção', () => {
  const app = novoApp();
  const r = app.computeItemFinancials(3, 10);
  assert.equal(r.standardSubtotal, 30);
  assert.equal(r.finalSubtotal, 30);
  assert.equal(r.savings, 0);
});

test('computeItemFinancials: desconto percentual (limitado a 100%)', () => {
  const app = novoApp();
  const r = app.computeItemFinancials(2, 50, { type: 'discount', mode: 'percent', value: 10 });
  assert.equal(r.finalSubtotal, 90);
  assert.equal(r.savings, 10);
  const total = app.computeItemFinancials(2, 50, { type: 'discount', mode: 'percent', value: 150 });
  assert.equal(total.finalSubtotal, 0);
});

test('computeItemFinancials: desconto fixo por unidade não passa do preço', () => {
  const app = novoApp();
  const r = app.computeItemFinancials(4, 5, { type: 'discount', mode: 'fixed', value: 1.5 });
  assert.equal(r.savings, 6);
  assert.equal(r.finalSubtotal, 14);
  const maior = app.computeItemFinancials(2, 5, { type: 'discount', mode: 'fixed', value: 9 });
  assert.equal(maior.finalSubtotal, 0);
});

test('computeItemFinancials: atacado só vale a partir da quantidade mínima e se for mais barato', () => {
  const app = novoApp();
  const promo = { type: 'wholesale', minQty: 6, wholesalePrice: 4 };
  assert.equal(app.computeItemFinancials(5, 5, promo).finalSubtotal, 25, 'abaixo do mínimo');
  assert.equal(app.computeItemFinancials(6, 5, promo).finalSubtotal, 24, 'no mínimo');
  const maisCaro = app.computeItemFinancials(6, 3, promo);
  assert.equal(maisCaro.finalSubtotal, 18, 'atacado mais caro que o normal: ignora');
});

test('computeItemFinancials: valores inválidos viram zero', () => {
  const app = novoApp();
  const r = app.computeItemFinancials(-2, 'abc');
  assert.equal(r.finalSubtotal, 0);
});

// ---------------------------------------------------------------- Drive
test('driveMesclar: vale o registro mais recente; empate fica com a nuvem', () => {
  const app = novoApp();
  const local = { produtos: { arroz: { t: 200, d: 0, v: { name: 'Arroz', basePrice: 10 } }, feijao: { t: 100, d: 0, v: { name: 'Feijão', basePrice: 1 } } } };
  const remoto = { produtos: { arroz: { t: 100, d: 0, v: { name: 'Arroz', basePrice: 9 } }, feijao: { t: 100, d: 0, v: { name: 'Feijão', basePrice: 2 } } } };
  const r = app.driveMesclar(local, remoto);
  assert.equal(r.produtos.arroz.v.basePrice, 10, 'local mais novo vence');
  assert.equal(r.produtos.feijao.v.basePrice, 2, 'empate: nuvem vence');
});

test('driveMesclar: mantém itens que só existem de um lado', () => {
  const app = novoApp();
  const r = app.driveMesclar(
    { mercados: { 'm-custom-1': { t: 1, d: 0, v: { id: 'm-custom-1' } } } },
    { mercados: { 'm-custom-2': { t: 1, d: 0, v: { id: 'm-custom-2' } } } });
  assert.deepEqual(Object.keys(r.mercados).sort(), ['m-custom-1', 'm-custom-2']);
});

test('driveMesclar: exclusão recente vence; exclusão antiga (> 90 dias) é esquecida', () => {
  const app = novoApp();
  const agora = Date.now();
  const antigo = agora - 91 * 86400000;
  const r = app.driveMesclar(
    { historico: { a: { t: agora, d: 1 }, b: { t: antigo, d: 1 } } },
    { historico: { a: { t: agora - 1000, d: 0, v: { id: 'a' } } } });
  assert.equal(r.historico.a.d, 1, 'apagado depois da última edição: continua apagado');
  assert.equal(r.historico.b, undefined, 'marca de exclusão antiga é descartada');
});

test('driveMesclar: sem nada na nuvem (primeira sincronização) mantém o local', () => {
  const app = novoApp();
  const local = { produtos: { cafe: { t: 5, d: 0, v: { name: 'Café' } } } };
  const r = app.driveMesclar(local, null);
  assert.equal(r.produtos.cafe.v.name, 'Café');
});

// ---------------------------------------------------------------- coordenador
test('scRodar: sem chave de administrador, a planilha nem é chamada', async () => {
  const app = novoApp();
  let chamou = false;
  await app.scRodar(true, true, () => { chamou = true; });
  assert.equal(chamou, false);
  app.localStorage.setItem('sc_security_token', 'chave-de-teste');
  await app.scRodar(true, true, () => { chamou = true; });
  assert.equal(chamou, true);
});

test('scRodar: a fila nunca roda duas sincronizações ao mesmo tempo', async () => {
  const app = novoApp();
  const ordem = [];
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const a = app.scRodar(false, true, async () => { ordem.push('a-inicio'); await espera(30); ordem.push('a-fim'); });
  const b = app.scRodar(false, true, async () => { ordem.push('b-inicio'); await espera(5); ordem.push('b-fim'); });
  await Promise.all([a, b]);
  assert.deepEqual(ordem, ['a-inicio', 'a-fim', 'b-inicio', 'b-fim']);
});

test('scRodar: um erro numa sincronização não trava a fila', async () => {
  const app = novoApp();
  await assert.rejects(app.scRodar(false, true, () => { throw new Error('falhou'); }));
  let rodou = false;
  await app.scRodar(false, true, () => { rodou = true; });
  assert.equal(rodou, true);
});
