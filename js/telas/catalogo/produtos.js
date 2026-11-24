/**
 * (MÓDULO ES: import/export)
 * SUPERCOMPRAS PRO - CATÁLOGO: EXCLUIR, ADICIONAR AO CARRINHO E AÇÕES EM LOTE (js/telas/catalogo/produtos.js)
 */

import { getSecurityToken, novoId, saveAllLocalData, saveCartData } from '../../state.js';
import { renderCartUI } from '../../templates.js';
import { openCustomDialog, playAppBeep, showAppToast } from '../../ui.js';
import { apiChamar } from '../../api.js';
import { obterPrecoProdutoMarcaMercado } from './precos.js';
import { renderCatalogUI } from './layout.js';
import { obterListaProdutosFiltrada } from './filtros.js';

export function askDeleteSingleProduct(id) {
  const prod = (products || []).find(p => String(p.id) === String(id));
  if (!prod) return;

  openCustomDialog(
    'Excluir Produto?',
    `Deseja excluir permanentemente "${prod.name}" do catálogo?`,
    'Sim, Excluir',
    null,
    () => {
      products = (products || []).filter(p => String(p.id) !== String(id));
      cart = (cart || []).filter(c => String(c.productId) !== String(id));
      saveAllLocalData();
      saveCartData();
      renderCatalogUI();
      showAppToast('Produto excluído.', 'info');
    }
  );
}

export function quickAddToCartFromCatalog(id) {
  const prod = (products || []).find(p => String(p.id) === String(id));
  if (!prod) return;

  const preco = obterPrecoProdutoMarcaMercado(prod, 'Padrão', activeMarketId);
  cart.unshift({
    id: novoId('c-item-'),
    productId: prod.id,
    selectedBrandId: 'Padrão',
    name: prod.name,
    category: prod.category || 'Geral',
    unit: prod.unit || 'un',
    unitPrice: preco,
    quantity: 1,
    checked: false,
    promo: { type: 'none' }
  });

  saveCartData();
  renderCartUI();
  playAppBeep('add');
  showAppToast(`"${prod.name}" adicionado ao carrinho!`, 'success');
}

export function atualizarEstadoBarraLoteCatalogo() {
  const total = window.selectedCatalogProductIds.size;
  const contador = document.getElementById('contadorSelecaoCatalog');
  const btnExcluir = document.getElementById('btnExcluirLoteCatalogo');
  const lblExcluir = document.getElementById('lblExcluirLoteCatalogo');
  const chkAll = document.getElementById('checkSelectAllCatalog');

  if (contador) contador.innerText = `${total} selecionado${total === 1 ? '' : 's'}`;

  if (btnExcluir) {
    if (total > 0) {
      btnExcluir.classList.remove('hidden');
      if (lblExcluir) lblExcluir.innerText = `Excluir (${total})`;
    } else {
      btnExcluir.classList.add('hidden');
    }
  }

  if (chkAll) {
    const visiveis = typeof obterListaProdutosFiltrada === 'function' ? obterListaProdutosFiltrada() : (products || []);
    chkAll.checked = visiveis.length > 0 && visiveis.every(p => window.selectedCatalogProductIds.has(String(p.id)));
  }
}

export function toggleSelectCatalogProduct(id, isChecked) {
  if (!window.selectedCatalogProductIds) window.selectedCatalogProductIds = new Set();
  const idStr = String(id);

  if (isChecked) {
    window.selectedCatalogProductIds.add(idStr);
  } else {
    window.selectedCatalogProductIds.delete(idStr);
  }

  const cardEl = document.getElementById(`card-prod-${idStr}`);
  if (cardEl) {
    if (isChecked) {
      cardEl.classList.add('bg-emerald-50', 'border-emerald-500', 'ring-2', 'ring-emerald-500/30', 'shadow-sm');
      cardEl.classList.remove('bg-white', 'border-slate-200', 'shadow-2xs');
    } else {
      cardEl.classList.remove('bg-emerald-50', 'border-emerald-500', 'ring-2', 'ring-emerald-500/30', 'shadow-sm');
      cardEl.classList.add('bg-white', 'border-slate-200', 'shadow-2xs');
    }
  }

  atualizarEstadoBarraLoteCatalogo();
}

export function toggleSelectAllCatalogProducts(isChecked) {
  if (!window.selectedCatalogProductIds) window.selectedCatalogProductIds = new Set();
  const visiveis = typeof obterListaProdutosFiltrada === 'function' ? obterListaProdutosFiltrada() : (products || []);

  visiveis.forEach(p => {
    const idStr = String(p.id);
    if (isChecked) {
      window.selectedCatalogProductIds.add(idStr);
    } else {
      window.selectedCatalogProductIds.delete(idStr);
    }
    const cardEl = document.getElementById(`card-prod-${idStr}`);
    const inputChk = cardEl?.querySelector('input[type="checkbox"]');
    if (inputChk) inputChk.checked = isChecked;

    if (cardEl) {
      if (isChecked) {
        cardEl.classList.add('bg-emerald-50', 'border-emerald-500', 'ring-2', 'ring-emerald-500/30', 'shadow-sm');
        cardEl.classList.remove('bg-white', 'border-slate-200', 'shadow-2xs');
      } else {
        cardEl.classList.remove('bg-emerald-50', 'border-emerald-500', 'ring-2', 'ring-emerald-500/30', 'shadow-sm');
        cardEl.classList.add('bg-white', 'border-slate-200', 'shadow-2xs');
      }
    }
  });

  atualizarEstadoBarraLoteCatalogo();
}
/**
 * Diálogo inteligente de exclusão em lote:
 * - Se todos forem locais: pergunta se deseja excluir.
 * - Se houver produtos de nuvem: oferece as opções "Apenas do Aparelho" ou "Do Aparelho e da Nuvem".
 */
export function solicitarExclusaoLoteCatalogo() {
  const ids = Array.from(window.selectedCatalogProductIds || []);
  if (ids.length === 0) return;

  const itens = (products || []).filter(p => ids.includes(String(p.id)));
  const contemNuvem = itens.some(p => !(String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-')));

  if (!contemNuvem) {
    // Cenário 1: Apenas produtos locais
    openCustomDialog(
      `Excluir ${itens.length} produto(s) local(is)?`,
      `Estes produtos estão salvos apenas neste aparelho e serão apagados permanentemente.`,
      'Sim, Excluir',
      null,
      () => executarRemocaoItensCatalogo(ids, false)
    );
  } else {
    // Cenário 2: Contém produtos que existem na Nuvem (Planilha Google)
    openCustomDialog(
      `Excluir ${itens.length} produto(s)?`,
      `Alguns itens selecionados estão vinculados à Nuvem (Planilha Google). Deseja remover apenas deste aparelho ou também excluir permanentemente da Nuvem?`,
      'Excluir do Local e da Nuvem',
      'Apenas do Aparelho (Local)',
      () => executarRemocaoItensCatalogo(ids, true),  // Local + Nuvem
      () => executarRemocaoItensCatalogo(ids, false)  // Apenas Local
    );
  }
}

export async function executarRemocaoItensCatalogo(idsParaRemover, excluirDaNuvem = false) {
  const setIds = new Set(idsParaRemover.map(String));
  const itensParaExcluir = (products || []).filter(p => setIds.has(String(p.id)));

  // 1. Se solicitou exclusão também da nuvem, envia comando para a planilha
  if (excluirDaNuvem) {
    const token = typeof getSecurityToken === 'function' ? getSecurityToken() : '';
    if (token) {
      showAppToast('Removendo itens da planilha...', 'info');
      try {
        for (const p of itensParaExcluir) {
          const isLocal = String(p.id).startsWith('p-custom-') || String(p.id).startsWith('p-local-');
          if (!isLocal) {
            await apiChamar(token, { action: 'excluir_produto', name: p.name, productId: p.id }).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Erro ao excluir produtos remotos:', e);
      }
    }
  }

  // 2. Remove da lista local e do carrinho
  products = (products || []).filter(p => !setIds.has(String(p.id)));
  cart = (cart || []).filter(c => !setIds.has(String(c.productId)));

  // 3. Limpa seleção e persiste dados
  window.selectedCatalogProductIds.clear();
  saveAllLocalData();
  saveCartData();
  if (typeof renderCatalogUI === 'function') renderCatalogUI();
  atualizarEstadoBarraLoteCatalogo();

  showAppToast(`${itensParaExcluir.length} produto(s) excluído(s)${excluirDaNuvem ? ' do aparelho e da nuvem' : ' do aparelho'}!`, 'success');
}
