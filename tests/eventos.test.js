const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { carregarApp } = require('./carregar-app');

// ------------------------------------------------------------ Eventos
test('ouvir recebe o aviso com as informações', () => {
  const app = carregarApp(['js/eventos.js']);
  const recebidos = [];
  app.Eventos.ouvir('x', info => recebidos.push(info));
  app.Eventos.avisar('x', { a: 1 });
  app.Eventos.avisar('outro', { b: 2 });
  assert.equal(recebidos.length, 1);
  assert.equal(recebidos[0].a, 1);
});

test('a função devolvida por ouvir para de ouvir', () => {
  const app = carregarApp(['js/eventos.js']);
  let n = 0;
  const parar = app.Eventos.ouvir('x', () => n++);
  app.Eventos.avisar('x');
  parar();
  app.Eventos.avisar('x');
  assert.equal(n, 1);
});

test('um ouvinte com erro não impede os outros', () => {
  const app = carregarApp(['js/eventos.js']);
  let chegou = false;
  app.Eventos.ouvir('x', () => { throw new Error('quebrou'); });
  app.Eventos.ouvir('x', () => { chegou = true; });
  const erroOriginal = console.error; console.error = () => {};
  try { app.Eventos.avisar('x'); } finally { console.error = erroOriginal; }
  assert.equal(chegou, true);
});

// ------------------------------------------------------------ quem avisa
const SCRIPTS = ['js/eventos.js', 'js/armazenamento.js', 'js/state.js', 'js/sync-coordenador.js',
  'js/origem.js', 'js/history.js', 'js/drive-sync.js'];

function appComTimersFalsos() {
  const app = carregarApp(SCRIPTS);
  const agendados = [];
  app.setTimeout = (fn, ms) => { agendados.push(ms); return agendados.length; };   // não dispara de verdade
  app.clearTimeout = () => {};
  return { app, agendados };
}

test('saveAllLocalData, salvarHistoricoLocal e saveCartData avisam', () => {
  const app = carregarApp(SCRIPTS);
  const avisos = [];
  app.Eventos.ouvir(app.AVISOS.DADOS_SALVOS, info => avisos.push('dados:' + info.quais));
  app.Eventos.ouvir(app.AVISOS.CARRINHO_SALVO, () => avisos.push('carrinho'));
  app.saveAllLocalData();
  app.salvarHistoricoLocal([]);
  app.saveCartData();
  assert.deepEqual(avisos, ['dados:tudo', 'dados:historico', 'carrinho']);
});

// ------------------------------------------------------------ Drive ouvindo
test('Drive: antes de driveIniciar, salvar não agenda sincronização (abrir o app não sincroniza sozinho)', () => {
  const { app, agendados } = appComTimersFalsos();
  app.Armazenamento.gravarTexto(app.CHAVES.DRIVE_CONECTADO, '1');
  app.saveAllLocalData();
  assert.equal(agendados.length, 0);
});

test('Drive: depois de driveIniciar, salvar agenda carimbo (1s) e sincronização (8s)', () => {
  const { app, agendados } = appComTimersFalsos();
  app.Armazenamento.gravarTexto(app.CHAVES.DRIVE_CONECTADO, '1');
  app.driveIniciar();
  app.saveAllLocalData();
  assert.deepEqual(agendados, [1000, 8000]);
  agendados.length = 0;
  app.salvarHistoricoLocal([]);
  assert.deepEqual(agendados, [1000, 8000], 'salvar o histórico também agenda');
});

test('Drive: desconectado, salvar não agenda nada', () => {
  const { app, agendados } = appComTimersFalsos();
  app.driveIniciar();
  app.saveAllLocalData();
  assert.equal(agendados.length, 0);
});

test('Drive: chamar driveIniciar duas vezes não agenda em dobro', () => {
  const { app, agendados } = appComTimersFalsos();
  app.Armazenamento.gravarTexto(app.CHAVES.DRIVE_CONECTADO, '1');
  app.driveIniciar();
  app.driveIniciar();
  app.saveAllLocalData();
  assert.deepEqual(agendados, [1000, 8000]);
});

test('ninguém mais substitui saveAllLocalData / salvarHistoricoLocal', () => {
  const { app } = appComTimersFalsos();
  const antes = [app.saveAllLocalData, app.salvarHistoricoLocal];
  app.driveIniciar();
  assert.equal(app.saveAllLocalData, antes[0]);
  assert.equal(app.salvarHistoricoLocal, antes[1]);
  const codigo = fs.readdirSync(path.join(__dirname, '..', 'js')).filter(f => f.endsWith('.js'))
    .map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n');
  assert.doesNotMatch(codigo, /window\[[^\]]+\]\s*=(?!=)/, 'nenhum arquivo troca funções globais por window[nome] = ...');
});
