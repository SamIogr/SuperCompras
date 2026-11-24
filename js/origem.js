/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - ORIGEM DOS ITENS (js/origem.js)
 *
 * De onde vem cada produto ou supermercado, usado pelos selos dos cards e pelos filtros
 * "Todos / Planilha + Drive / Só Planilha / Só Drive / Local" do catálogo E da aba Mercados.
 *
 *  - planilha: veio da planilha do administrador (produto PROD-..., mercado com coluna na planilha)
 *  - drive:    já foi enviado ao backup do Google Drive (ver driveEstaNoBackup em drive-sync.js)
 *  - local:    existe só neste aparelho
 *  - padrao:   o "Mercado" de referência embutido no app (não é planilha nem Drive)
 */

import { driveEstaNoBackup } from './drive-sync.js';

export const ORIGENS = Object.freeze({
  'planilha-drive': { rotulo: 'Planilha + Drive', filtro: 'Planilha + Drive', cor: 'bg-purple-100 text-purple-800 border-purple-200' },
  planilha:         { rotulo: 'Planilha',         filtro: 'Só Planilha',      cor: 'bg-sky-100 text-sky-800 border-sky-200' },
  drive:            { rotulo: 'Drive',            filtro: 'Só Drive',         cor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  local:            { rotulo: 'Local',            filtro: 'Local',            cor: 'bg-amber-100 text-amber-800 border-amber-200' },
  padrao:           { rotulo: 'Referência',       filtro: 'Referência',       cor: 'bg-slate-100 text-slate-600 border-slate-200' },
});
export const ORDEM_FILTRO_ORIGEM = ['planilha-drive', 'planilha', 'drive', 'local'];

/** tipo: 'produtos' | 'mercados' */
export function estaNaPlanilha(tipo, item) {
  if (!item) return false;
  const id = String(item.id || '');
  if (tipo === 'mercados') {
    if (id === 'm-padrao') return false;
    return Boolean(item.inSheet || item.colIndex || (id && !id.startsWith('m-custom-')));
  }
  return Boolean(item.inSheet || id.startsWith('PROD-'));
}

export function obterOrigem(tipo, item) {
  if (tipo === 'mercados' && item && item.id === 'm-padrao') return 'padrao';
  const planilha = estaNaPlanilha(tipo, item);
  const drive = typeof driveEstaNoBackup === 'function' && driveEstaNoBackup(tipo, item);
  if (planilha && drive) return 'planilha-drive';
  if (planilha) return 'planilha';
  if (drive) return 'drive';
  return 'local';
}

// compatibilidade com o nome antigo (produtos)
export function obterOrigemItem(p) { return obterOrigem('produtos', p); }

// classeTamanho precisa ser a classe inteira ('text-[9px]'): o Tailwind só gera classes
// que aparecem escritas por completo no código.
export function seloOrigemHtml(origem, classeTamanho = 'text-[10px]') {
  const o = ORIGENS[origem] || ORIGENS.local;
  return `<span class="${o.cor} ${classeTamanho} font-bold px-2 py-0.5 rounded-md border">${o.rotulo}</span>`;
}

/** { todos, 'planilha-drive', planilha, drive, local } — 'padrao' só entra em "todos" */
export function contarOrigens(tipo, lista) {
  const contagens = { todos: 0, 'planilha-drive': 0, planilha: 0, drive: 0, local: 0 };
  (lista || []).forEach(item => {
    if (!item) return;
    contagens.todos++;
    const o = obterOrigem(tipo, item);
    if (contagens[o] !== undefined) contagens[o]++;
  });
  return contagens;
}

/**
 * Botões do filtro de origem (só aparecem as origens que têm itens).
 * alvo: 'produtos' | 'mercados' — vai em data-alvo; o clique é tratado pela delegação (templates.js).
 */
export function botoesFiltroOrigemHtml(alvo, contagens, filtroAtual) {
  const opcoes = [{ id: 'todos', rotulo: 'Todos', n: contagens.todos }]
    .concat(ORDEM_FILTRO_ORIGEM.filter(id => contagens[id] > 0).map(id => ({ id, rotulo: ORIGENS[id].filtro, n: contagens[id] })));
  return opcoes.map(op => {
    const ativo = filtroAtual === op.id;
    const classes = ativo
      ? 'px-2.5 py-1 rounded-lg bg-white text-slate-800 shadow-2xs font-bold text-xs transition-all cursor-pointer'
      : 'px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 transition-all font-medium text-xs cursor-pointer';
    return `<button type="button" data-acao="filtro-origem" data-alvo="${alvo}" data-origem="${op.id}" class="${classes}">${op.rotulo} <span class="text-[10px] opacity-75">(${op.n})</span></button>`;
  }).join('');
}

/** Se o filtro escolhido ficou sem itens (ex.: depois de sincronizar), volta para "todos". */
export function filtroOrigemValido(filtroAtual, contagens) {
  return (filtroAtual !== 'todos' && !contagens[filtroAtual]) ? 'todos' : filtroAtual;
}

