/**
 * filters.js — Lógica de filtros de búsqueda y períodos
 * Gestiona los controles de filtro y calcula fechas por defecto.
 */

import { store, actions } from './store.js';

// ============================================================
// FECHAS POR DEFECTO
// ============================================================

/**
 * Devuelve el primer y último día del año actual en formato YYYY-MM-DD.
 * @returns {{ desde: string, hasta: string }}
 */
export function getCurrentYearRange() {
  const year = new Date().getFullYear();
  return {
    desde: `${year}-01-01`,
    hasta: `${year}-12-31`,
  };
}

/**
 * Devuelve el primer y último día del mes actual en formato YYYY-MM-DD.
 * @returns {{ desde: string, hasta: string }}
 */
export function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    desde: `${year}-${month}-01`,
    hasta: `${year}-${month}-${lastDay}`,
  };
}

/**
 * Devuelve la fecha de hoy en formato YYYY-MM-DD.
 * @returns {string}
 */
export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// INIT FILTROS — DASHBOARD
// ============================================================

/**
 * Inicializa los controles de filtro del dashboard con el año actual.
 * @param {Function} onApply - Callback que se ejecuta cuando se aplica el filtro
 */
export function initDashboardFilters(onApply) {
  const { desde, hasta } = getCurrentYearRange();

  const desdeEl = document.getElementById('dashDesde');
  const hastaEl = document.getElementById('dashHasta');
  const applyBtn = document.getElementById('dashApplyBtn');
  const resetBtn = document.getElementById('dashResetBtn');

  if (!desdeEl || !hastaEl) return;

  // Valores iniciales
  desdeEl.value = desde;
  hastaEl.value = hasta;
  actions.setFiltrosDashboard({ desde, hasta });

  applyBtn?.addEventListener('click', () => {
    const newDesde = desdeEl.value;
    const newHasta = hastaEl.value;

    if (!validateDateRange(newDesde, newHasta)) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    actions.setFiltrosDashboard({ desde: newDesde, hasta: newHasta });
    onApply({ desde: newDesde, hasta: newHasta });
  });

  resetBtn?.addEventListener('click', () => {
    desdeEl.value = desde;
    hastaEl.value = hasta;
    actions.setFiltrosDashboard({ desde, hasta });
    onApply({ desde, hasta });
  });
}

// ============================================================
// INIT FILTROS — TRANSACCIONES
// ============================================================

/**
 * Inicializa los controles de filtro de la vista de transacciones.
 * @param {Function} onApply  - Callback con los filtros activos
 * @param {Function} onReset  - Callback cuando se limpian los filtros
 */
export function initTransaccionesFilters(onApply, onReset) {
  const applyBtn = document.getElementById('transApplyBtn');
  const resetBtn = document.getElementById('transResetBtn');

  applyBtn?.addEventListener('click', () => {
    const filtros = readTransaccionesFilters();

    if (filtros.desde && filtros.hasta && !validateDateRange(filtros.desde, filtros.hasta)) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    actions.setFiltrosTransacciones({ ...filtros, offset: 0 });
    onApply(filtros);
  });

  resetBtn?.addEventListener('click', () => {
    clearTransaccionesFilters();
    actions.resetFiltrosTransacciones();
    onReset();
  });

  // También permite aplicar con Enter en los inputs
  const inputs = ['transDesde', 'transHasta', 'transTipo', 'transCategoria'];
  inputs.forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') applyBtn?.click();
    });
  });
}

// ============================================================
// INIT FILTROS — CATEGORÍAS
// ============================================================

/**
 * Inicializa los botones de filtro por tipo en la vista de categorías.
 * @param {Function} onChange - Callback(tipo: '' | 'ingreso' | 'gasto')
 */
export function initCategoriaFilters(onChange) {
  document.querySelectorAll('[data-cat-tipo]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cat-tipo]').forEach(b => b.classList.remove('tab-btn--active'));
      btn.classList.add('tab-btn--active');

      const tipo = btn.dataset.catTipo;
      actions.setFiltroCategorias(tipo);
      onChange(tipo);
    });
  });
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Lee los valores actuales de los inputs de filtro de transacciones.
 * @returns {{ desde: string, hasta: string, tipo: string, categoria: string }}
 */
export function readTransaccionesFilters() {
  return {
    desde:     getInputValue('transDesde'),
    hasta:     getInputValue('transHasta'),
    tipo:      getInputValue('transTipo'),
    categoria: getInputValue('transCategoria'),
  };
}

/**
 * Restaura los inputs de filtro de transacciones a vacío.
 */
export function clearTransaccionesFilters() {
  ['transDesde', 'transHasta', 'transTipo', 'transCategoria'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/**
 * Sincroniza los inputs de filtro de transacciones con el estado del store.
 * Útil al volver a la vista desde otra.
 */
export function syncTransaccionesFiltersFromStore() {
  const { filtrosTransacciones } = store.getState();

  setInputValue('transDesde', filtrosTransacciones.desde);
  setInputValue('transHasta', filtrosTransacciones.hasta);
  setInputValue('transTipo', filtrosTransacciones.tipo);
  setInputValue('transCategoria', filtrosTransacciones.categoria);
}

/**
 * Valida que la fecha inicio sea <= fecha fin.
 * @param {string} desde - YYYY-MM-DD
 * @param {string} hasta - YYYY-MM-DD
 * @returns {boolean}
 */
export function validateDateRange(desde, hasta) {
  if (!desde || !hasta) return true; // Si falta una, no hay error (son opcionales)
  return desde <= hasta;
}

/**
 * Construye el objeto de filtros para llamar a la API de transacciones.
 * Omite los campos vacíos.
 * @param {Object} filtros - Del store
 * @returns {Object}
 */
export function buildApiFilters(filtros) {
  const params = {};
  if (filtros.desde)     params.desde = filtros.desde;
  if (filtros.hasta)     params.hasta = filtros.hasta;
  if (filtros.tipo)      params.tipo = filtros.tipo;
  if (filtros.categoria) params.categoria = filtros.categoria;
  if (filtros.limit)     params.limit = filtros.limit;
  if (filtros.offset != null) params.offset = filtros.offset;
  return params;
}

// ============================================================
// UTILIDADES PRIVADAS
// ============================================================

function getInputValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}
