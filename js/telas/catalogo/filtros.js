/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CATÁLOGO: BUSCA, ORDEM, SETOR E ORIGEM DOS PRODUTOS (js/telas/catalogo/filtros.js)
 */

import { botoesFiltroOrigemHtml, contarOrigens, filtroOrigemValido, obterOrigemItem } from '../../origem.js';
import { renderCatalogUI } from './layout.js';

let catalogSortMode = 'az';
let catalogOrigemFiltro = 'todos';
let catalogSetorFiltro = 'Todas';

export function obterListaProdutosFiltrada() {
  const input = document.getElementById("input-busca-produtos");
  const query = (input?.value || "").toLowerCase().trim();

  const lista = (Array.isArray(products) ? products : []).filter((p) => {
    if (!p || !p.name) return false;
    const origem = obterOrigemItem(p);

    if (catalogOrigemFiltro !== "todos" && catalogOrigemFiltro !== origem) {
      return false;
    }

    if (catalogSetorFiltro && catalogSetorFiltro !== "Todas") {
      const catProd = (p.category || "Geral").toLowerCase().trim();
      if (catProd !== catalogSetorFiltro.toLowerCase().trim()) return false;
    }

    const nome = p.name.toLowerCase();
    const cat = (p.category || "").toLowerCase();
    return !query || nome.includes(query) || cat.includes(query);
  });

  lista.sort((a, b) => {
    const nomeA = (a.name || "").trim();
    const nomeB = (b.name || "").trim();
    if (catalogSortMode === "za" || catalogSortMode === "nome-desc") {
      return nomeB.localeCompare(nomeA, "pt-BR");
    }
    if (catalogSortMode === "setor") {
      const catComp = (a.category || "").localeCompare(b.category || "", "pt-BR");
      return catComp !== 0 ? catComp : nomeA.localeCompare(nomeB, "pt-BR");
    }
    return nomeA.localeCompare(nomeB, "pt-BR");
  });

  return lista;
}

// BOTÕES DO FILTRO DE ORIGEM DO CATÁLOGO (só aparecem origens com produtos; ver js/origem.js)
export function renderizarBotoesFiltroOrigem() {
  const container = document.getElementById('container-filtro-origem-dinamico');
  if (!container) return;
  const contagens = contarOrigens('produtos', Array.isArray(products) ? products : []);
  catalogOrigemFiltro = filtroOrigemValido(catalogOrigemFiltro, contagens);
  container.innerHTML = botoesFiltroOrigemHtml('produtos', contagens, catalogOrigemFiltro);
}

export function filtrarOrigemProdutos(origem) {
  catalogOrigemFiltro = origem;
  renderizarBotoesFiltroOrigem();
  renderCatalogUI();
};

export function filtrarSetorProdutos(setor, btn) {
  catalogSetorFiltro = setor;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => {
      b.className = 'px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all font-medium text-xs whitespace-nowrap cursor-pointer';
    });
    btn.className = 'px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs whitespace-nowrap shadow-2xs transition-all cursor-pointer';
  }
  renderCatalogUI();
};

export function filtrarProdutosCatalogo() {
  renderCatalogUI();
};

export function ordenarProdutosCatalogo() {
  const select = document.getElementById('select-ordenacao-produtos');
  if (select) catalogSortMode = select.value;
  renderCatalogUI();
};
