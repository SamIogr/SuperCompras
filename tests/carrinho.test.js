const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { carregarApp, ARQUIVOS_CARRINHO, listarArquivosJs, RAIZ } = require('./carregar-app');

const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

function elemento(dataset, extra = {}) {
  const el = { dataset, ...extra };
  el.closest = () => el;
  return el;
}
// elemento de DOM falso com classList que registra o estado
function elDom(extra = {}) {
  const classes = new Set(extra.classes || []);
  return {
    value: '', innerHTML: '', ...extra,
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle() {} },
    focus() {}, addEventListener() {},
    get _classes() { return classes; },
  };
}

function appCarrinho() {
  return carregarApp(['js/eventos.js', 'js/ui/acoes.js', 'js/armazenamento.js', 'js/state.js',
    'js/sync-coordenador.js', 'js/origem.js', ...ARQUIVOS_CARRINHO]);
}

// ------------------------------------------------------------ estrutura
test('nenhuma função é definida duas vezes no app (a segunda apagaria a primeira em silêncio)', () => {
  const vistos = new Map();
  const repetidas = [];
  for (const f of listarArquivosJs()) {
    for (const m of ler(f).matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/gm)) {
      const nome = m[1] || m[2];
      if (vistos.has(nome)) repetidas.push(`${nome}: ${vistos.get(nome)} e ${f}`);
      else vistos.set(nome, f);
    }
  }
  assert.deepEqual(repetidas, []);
});

test('tela do carrinho e modal de edição sem onclick/oninput/onchange/onsubmit embutidos', () => {
  for (const f of [...ARQUIVOS_CARRINHO, 'components/modal-compras.html']) {
    assert.doesNotMatch(ler(f), /\son(click|change|input|submit)="/, f);
  }
  const index = ler('index.html');
  for (const fn of ['setCartFilterMode', 'setCartPromoMode', 'abrirSheetAdicionarItem', 'fecharSheetAdicionarItem',
    'updateCartItemPreview', 'askClearCart', 'askFinishPurchase', 'abrirGuiaComparativoMercados', 'aoMudarSelectMarcaInline']) {
    assert.ok(!index.includes(`"${fn}(`), `index.html ainda chama ${fn} direto`);
  }
});

test('o código antigo saiu de onde estava', () => {
  assert.ok(!fs.existsSync(path.join(RAIZ, 'js/cart.js')));
  assert.doesNotMatch(ler('js/ui.js'), /function (abrirSheetAdicionarItem|fecharSheetAdicionarItem|atualizarAtalhosQuantidade)\b/);
  assert.doesNotMatch(ler('js/telas/carrinho/cards.js'), /renderCartAutocomplete/, 'autocomplete morto (era do templates.js)');
});

// ------------------------------------------------------------ marca no formulário
test('aoMudarSelectMarcaInline existe (o index.html chamava uma função que não existia)', () => {
  const app = appCarrinho();
  assert.equal(typeof app.aoMudarSelectMarcaInline, 'function');
});

test('escolher "+ Nova marca..." mostra o campo para digitar a marca', () => {
  const app = appCarrinho();
  const els = {
    boxSelectMarca: elDom(), boxInputNovaMarcaInline: elDom({ classes: ['hidden'] }), inputNovaMarcaInline: elDom({ value: 'velho' }),
  };
  app.document.getElementById = id => els[id] || null;
  app.Acoes.despachar('change', { target: elemento({ acao: 'carrinho-form-marca' }, { value: '__NOVA__' }) });
  assert.ok(els.boxSelectMarca._classes.has('hidden'), 'esconde o select');
  assert.ok(!els.boxInputNovaMarcaInline._classes.has('hidden'), 'mostra o campo');
  assert.equal(els.inputNovaMarcaInline.value, '', 'campo começa vazio');
});

test('escolher uma marca grava no campo oculto e atualiza o preço sugerido', () => {
  const app = appCarrinho();
  const oculto = elDom({ value: 'Padrão' });
  app.document.getElementById = id => (id === 'cartInputProductBrand' ? oculto : null);
  let sincronizou = 0;
  app.sincronizarPrecoFormularioCarrinho = () => sincronizou++;
  app.Acoes.despachar('change', { target: elemento({ acao: 'carrinho-form-marca' }, { value: 'Camil' }) });
  assert.equal(oculto.value, 'Camil');
  assert.equal(sincronizou, 1);
});

// ------------------------------------------------------------ ações
test('atalhos de quantidade usam data-acao e passam o valor', () => {
  const app = appCarrinho();
  const box = elDom();
  app.document.getElementById = id => ({ cartInputUnit: { value: 'kg' }, containerAtalhosQtd: box }[id] || null);
  app.atualizarAtalhosQuantidade();
  assert.match(box.innerHTML, /data-acao="carrinho-qtd-rapida" data-qtd="0\.250"/);
  assert.doesNotMatch(box.innerHTML, /onclick/);
  let qtd;
  app.setCartQuickQty = v => { qtd = v; };
  app.Acoes.despachar('click', { target: elemento({ acao: 'carrinho-qtd-rapida', qtd: '0.500' }) });
  assert.equal(qtd, '0.500');
});

test('salvar a edição de um item não recarrega a página', () => {
  const app = appCarrinho();
  let salvou = 0, impediu = 0;
  app.salvarEdicaoItemCarrinho = () => salvou++;
  app.Acoes.despachar('submit', { target: elemento({ acao: 'carrinho-edicao-salvar' }), preventDefault: () => impediu++ });
  assert.equal(salvou, 1);
  assert.equal(impediu, 1);
});

test('digitar nos campos de preço recalcula a prévia (formulário e modal de edição)', () => {
  const app = appCarrinho();
  const chamadas = [];
  app.updateCartItemPreview = () => chamadas.push('form');
  app.atualizarSubtotalModalEdicao = () => chamadas.push('edicao');
  app.Acoes.despachar('input', { target: elemento({ acao: 'carrinho-form-recalcular' }) });
  app.Acoes.despachar('input', { target: elemento({ acao: 'carrinho-edicao-recalcular' }) });
  app.Acoes.despachar('change', { target: elemento({ acao: 'carrinho-edicao-recalcular' }) });
  assert.deepEqual(chamadas, ['form', 'edicao', 'edicao']);
});

test('botões da tela chamam a função certa', () => {
  const app = appCarrinho();
  const chamadas = [];
  app.setCartFilterMode = m => chamadas.push('filtro ' + m);
  app.setCartPromoMode = m => chamadas.push('promo ' + m);
  app.setEditQty = q => chamadas.push('qtd ' + q);
  app.setEditPromoType = m => chamadas.push('edit-promo ' + m);
  app.trocarMercadoPelaGuia = id => chamadas.push('trocar ' + id);
  app.askFinishPurchase = () => chamadas.push('finalizar');
  app.Acoes.despachar('click', { target: elemento({ acao: 'carrinho-filtro', filtro: 'pending' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'carrinho-form-promo', modo: 'wholesale' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'carrinho-edicao-qtd', qtd: '0.25' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'carrinho-edicao-promo', modo: 'discount' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'carrinho-guia-trocar-mercado', id: 'm-condor' }) });
  app.Acoes.despachar('click', { target: elemento({ acao: 'carrinho-finalizar' }) });
  assert.deepEqual(chamadas, ['filtro pending', 'promo wholesale', 'qtd 0.25', 'edit-promo discount', 'trocar m-condor', 'finalizar']);
});

// ------------------------------------------------------------ unidade na edição do item
test('formulário de adicionar e modal de edição usam a mesma lista de unidades', () => {
  const app = appCarrinho();
  const index = ler('index.html');
  const select = index.slice(index.indexOf('<select id="cartInputUnit"'), index.indexOf('</select>', index.indexOf('<select id="cartInputUnit"')));
  const doIndex = [...select.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(doIndex, JSON.parse(JSON.stringify(app.UNIDADES ?? app.$('UNIDADES'))));
  assert.match(ler('components/modal-compras.html'), /<select id="editCartItemUnit" data-acao="carrinho-edicao-unidade"/);
});

test('opcoesUnidadeHtml marca a unidade do item e inclui unidades fora da lista', () => {
  const app = appCarrinho();
  assert.match(app.opcoesUnidadeHtml('pct'), /<option value="pct" selected>/);
  const html = app.opcoesUnidadeHtml('ml');
  assert.match(html, /^<option value="ml" selected>ml<\/option>/, 'unidade do catálogo que não está na lista não se perde');
});

function modalEdicaoFalso(app, item) {
  const campos = {
    modalEditCartItem: elDom({ style: {} }), editCartItemName: elDom(), editCartItemBrand: elDom(),
    editCartItemPrice: elDom(), editCartItemQty: elDom(), editCartItemUnit: elDom(),
  };
  const atalhos = ['contagem', 'contagem', 'peso', 'peso'].map(t => elDom({ dataset: { atalho: t } }));
  atalhos.forEach(a => { a.classList.toggle = (c, ligar) => (ligar ? a._classes.add(c) : a._classes.delete(c)); });
  app.document.getElementById = id => campos[id] || null;
  app.document.querySelectorAll = sel => (sel.includes('data-atalho') ? atalhos : []);
  app.$(`cart = []`);
  app.$(`cart.push(${JSON.stringify(item)})`);
  return { campos, atalhos };
}

test('abrir a edição mostra a unidade do item e os atalhos certos', () => {
  const app = appCarrinho();
  const { campos, atalhos } = modalEdicaoFalso(app, { id: 'c1', name: 'Arroz', unit: 'kg', unitPrice: 5, quantity: 2 });
  app.openEditCartItemModal('c1');
  assert.match(campos.editCartItemUnit.innerHTML, /<option value="kg" selected>/);
  assert.deepEqual(atalhos.map(a => a._classes.has('hidden')), [true, true, false, false], 'kg: só atalhos de peso');

  app.Acoes.despachar('change', { target: elemento({ acao: 'carrinho-edicao-unidade' }, { value: 'un' }) });
  assert.deepEqual(atalhos.map(a => a._classes.has('hidden')), [false, false, true, true], 'un: só atalhos de contagem');
});

test('salvar a edição grava a unidade escolhida', () => {
  const app = appCarrinho();
  const { campos } = modalEdicaoFalso(app, { id: 'c1', name: 'Arroz', unit: 'un', unitPrice: 5, quantity: 2, selectedBrandId: 'Padrão' });
  app.openEditCartItemModal('c1');
  campos.editCartItemName.value = 'Arroz';
  campos.editCartItemPrice.value = '5,00';
  campos.editCartItemQty.value = '2';
  campos.editCartItemUnit.value = 'kg';
  app.salvarEdicaoItemCarrinho();
  assert.equal(app.$('cart[0].unit'), 'kg');
  assert.equal(app.$('cart[0].quantity'), 2);
});
