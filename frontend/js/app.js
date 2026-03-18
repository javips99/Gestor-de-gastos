/**
 * app.js — Orquestador principal de la SPA
 * Conecta la API, el store, la UI y los gráficos.
 */

import * as api from './api.js';
import { store, actions } from './store.js';
import * as ui from './ui.js';
import * as charts from './charts.js';
import {
  initDashboardFilters,
  initTransaccionesFilters,
  initCategoriaFilters,
  syncTransaccionesFiltersFromStore,
  buildApiFilters,
  getCurrentYearRange,
  getToday,
} from './filters.js';

// ============================================================
// INICIALIZACIÓN
// ============================================================

async function init() {
  // Verificar conexión con el backend
  const apiOk = await api.checkHealth();
  if (!apiOk) {
    ui.showToast('⚠️ No se puede conectar con el backend (localhost:3000)', 'error', 6000);
  }

  // Renderizar fecha en el topbar
  ui.renderTopbarDate();

  // Registrar todos los event listeners
  setupNavigation();
  setupSidebar();
  setupModalTransaccion();
  setupModalCategoria();
  setupFAB();

  // Inicializar filtros
  initDashboardFilters(({ desde, hasta }) => loadDashboard(desde, hasta));
  initTransaccionesFilters(
    () => loadTransacciones(),
    () => loadTransacciones()
  );
  initCategoriaFilters((tipo) => {
    const { categorias } = store.getState();
    ui.renderCategoriasGrid(categorias, tipo, openEditCategoria, confirmDeleteCategoria);
  });

  // Cargar categorías primero (necesarias para los selects)
  await loadCategorias();

  // Cargar vista inicial: dashboard
  await navigateTo('dashboard');
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function setupNavigation() {
  // Navegación en sidebar y bottom nav
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.view));
  });
}

/**
 * Cambia la vista activa y carga sus datos.
 * @param {string} viewName
 */
async function navigateTo(viewName) {
  actions.setView(viewName);
  ui.showView(viewName);
  ui.setActiveNav(viewName);
  ui.renderTopbarActions(viewName, openNewTransaccion, openNewCategoria);

  // Cerrar sidebar en móvil
  closeSidebar();

  switch (viewName) {
    case 'dashboard': {
      const { filtrosDashboard } = store.getState();
      await loadDashboard(filtrosDashboard.desde, filtrosDashboard.hasta);
      break;
    }
    case 'transacciones': {
      syncTransaccionesFiltersFromStore();
      await loadTransacciones();
      break;
    }
    case 'categorias': {
      await loadCategorias();
      const { categorias, filtroCategorias } = store.getState();
      ui.renderCategoriasGrid(categorias, filtroCategorias.tipo, openEditCategoria, confirmDeleteCategoria);
      break;
    }
  }
}

// ============================================================
// SIDEBAR (MÓVIL)
// ============================================================

function setupSidebar() {
  const menuToggle = document.getElementById('menuToggle');
  const overlay    = document.getElementById('sidebarOverlay');
  const sidebar    = document.getElementById('sidebar');

  menuToggle?.addEventListener('click', toggleSidebar);
  overlay?.addEventListener('click', closeSidebar);

  // Cerrar con Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAllModals();
      closeSidebar();
    }
  });
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('is-open');
  document.getElementById('sidebarOverlay')?.classList.toggle('is-active');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('is-open');
  document.getElementById('sidebarOverlay')?.classList.remove('is-active');
}

// ============================================================
// CARGA DE DATOS — DASHBOARD
// ============================================================

/**
 * Carga y renderiza todos los datos del dashboard.
 * @param {string} desde
 * @param {string} hasta
 */
async function loadDashboard(desde, hasta) {
  ui.setGlobalLoading(true);
  try {
    const [resumenRes, transRes] = await Promise.all([
      api.getResumen({ desde, hasta }),
      api.getTransacciones({ desde, hasta, limit: 8, offset: 0 }),
    ]);

    const resumen = resumenRes.data;
    actions.setResumen(resumen);

    // KPIs
    const totalCount = transRes.meta?.total || 0;
    ui.renderKPIs(resumen, totalCount);

    // Top categorías (solo gastos)
    const gastosCateg = (resumen.porCategoria || []).filter(c => c.tipo === 'gasto' || !c.tipo);
    ui.renderTopCategorias(gastosCateg);

    // Últimas transacciones
    ui.renderUltimasTransacciones(transRes.data || []);

    // Gráficos
    charts.renderChartEvolucion(resumen.evolucionMensual || []);
    charts.renderChartCategoriasGasto(resumen.porCategoria || []);
    charts.renderChartCategoriasIngreso(resumen.porCategoria || []);

  } catch (err) {
    console.error('[Dashboard] Error:', err);
    ui.showToast(`Error al cargar el dashboard: ${err.message}`, 'error');
  } finally {
    ui.setGlobalLoading(false);
  }
}

// ============================================================
// CARGA DE DATOS — TRANSACCIONES
// ============================================================

/** Carga transacciones aplicando los filtros del store. */
async function loadTransacciones() {
  const { filtrosTransacciones } = store.getState();
  const params = buildApiFilters(filtrosTransacciones);

  ui.setGlobalLoading(true);
  try {
    const res = await api.getTransacciones(params);
    actions.setTransacciones(res.data, res.meta);

    ui.renderTablaTransacciones(res.data, openEditTransaccion, confirmDeleteTransaccion);
    ui.renderQuickSummary(res.data);
    ui.renderPaginacion(res.meta, handlePrevPage, handleNextPage);

  } catch (err) {
    console.error('[Transacciones] Error:', err);
    ui.showToast(`Error al cargar transacciones: ${err.message}`, 'error');
  } finally {
    ui.setGlobalLoading(false);
  }
}

function handlePrevPage() {
  actions.prevPage();
  loadTransacciones();
}

function handleNextPage() {
  actions.nextPage();
  loadTransacciones();
}

// ============================================================
// CARGA DE DATOS — CATEGORÍAS
// ============================================================

/** Carga categorías desde la API y actualiza el store. */
async function loadCategorias() {
  // Si ya están cargadas no recargamos (a menos que se llame explícitamente)
  const { categoriasLoaded } = store.getState();
  if (categoriasLoaded) return;

  try {
    const res = await api.getCategorias();
    actions.setCategorias(res.data || []);

    // Actualizar selects de filtros
    ui.populateFilterCategoriaSelect(res.data || []);
  } catch (err) {
    console.error('[Categorías] Error:', err);
    ui.showToast(`Error al cargar categorías: ${err.message}`, 'error');
  }
}

/** Fuerza la recarga de categorías desde la API. */
async function reloadCategorias() {
  actions.setState?.({ categoriasLoaded: false });
  store.setState({ categoriasLoaded: false });
  try {
    const res = await api.getCategorias();
    actions.setCategorias(res.data || []);
    ui.populateFilterCategoriaSelect(res.data || []);
  } catch (err) {
    ui.showToast(`Error al recargar categorías: ${err.message}`, 'error');
  }
}

// ============================================================
// MODAL — TRANSACCIÓN
// ============================================================

function setupFAB() {
  document.getElementById('fabBtn')?.addEventListener('click', openNewTransaccion);
}

function openNewTransaccion() {
  const { categorias } = store.getState();
  ui.resetFormTransaccion(getToday());
  ui.populateCategoriaSelect(categorias, 'gasto');
  document.getElementById('modalTransTitle').textContent = 'Nueva Transacción';
  document.getElementById('submitTrans').textContent = 'Guardar';
  ui.openModal('modalTransaccion');
}

function openEditTransaccion(trans) {
  const { categorias } = store.getState();
  ui.populateCategoriaSelect(categorias, trans.tipo);
  ui.fillFormTransaccion(trans);
  document.getElementById('modalTransTitle').textContent = 'Editar Transacción';
  document.getElementById('submitTrans').textContent = 'Actualizar';
  ui.openModal('modalTransaccion');
}

function setupModalTransaccion() {
  // Cerrar modal
  document.getElementById('closeModalTrans')?.addEventListener('click', () => ui.closeModal('modalTransaccion'));
  document.getElementById('cancelModalTrans')?.addEventListener('click', () => ui.closeModal('modalTransaccion'));

  // Cerrar al hacer clic fuera
  document.getElementById('modalTransaccion')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) ui.closeModal('modalTransaccion');
  });

  // Tipo selector (gasto/ingreso)
  document.querySelectorAll('#formTransaccion .tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = btn.dataset.tipo;
      ui.setTipoTransaccion(tipo);
      const { categorias } = store.getState();
      ui.populateCategoriaSelect(categorias, tipo);
    });
  });

  // Submit
  document.getElementById('formTransaccion')?.addEventListener('submit', handleSubmitTransaccion);
}

async function handleSubmitTransaccion(e) {
  e.preventDefault();

  // Limpiar errores previos
  ui.clearFormErrors(['errDescripcion', 'errImporte', 'errFecha', 'errTipo', 'errCategoria', 'errGeneral']);

  // Leer datos del formulario
  const id          = document.getElementById('transId')?.value;
  const descripcion = document.getElementById('transDescripcion')?.value?.trim();
  const importeRaw  = document.getElementById('transImporte')?.value;
  const fecha       = document.getElementById('transFecha')?.value;
  const tipo        = document.getElementById('transTipoField')?.value;
  const categoriaId = document.getElementById('transCategoriaField')?.value;
  const notas       = document.getElementById('transNotas')?.value?.trim();

  // Validación client-side
  let hasError = false;

  if (!descripcion || descripcion.length < 1 || descripcion.length > 150) {
    ui.showFieldError('transDescripcion', 'errDescripcion', 'La descripción es obligatoria (1-150 caracteres).');
    hasError = true;
  }

  const importe = parseFloat(importeRaw);
  if (!importeRaw || isNaN(importe) || importe <= 0 || importe > 99999999.99) {
    ui.showFieldError('transImporte', 'errImporte', 'Introduce un importe válido mayor que 0.');
    hasError = true;
  }

  if (!fecha) {
    ui.showFieldError('transFecha', 'errFecha', 'La fecha es obligatoria.');
    hasError = true;
  }

  if (!tipo) {
    ui.showFieldError('transTipoField', 'errTipo', 'Selecciona el tipo.');
    hasError = true;
  }

  if (!categoriaId) {
    ui.showFieldError('transCategoriaField', 'errCategoria', 'Selecciona una categoría.');
    hasError = true;
  }

  if (hasError) return;

  const payload = {
    descripcion,
    importe: parseFloat(importe.toFixed(2)),
    tipo,
    fecha,
    id_categoria: parseInt(categoriaId, 10),
    ...(notas ? { notas } : {}),
  };

  const submitBtn = document.getElementById('submitTrans');
  submitBtn.disabled = true;
  submitBtn.classList.add('btn--loading');

  try {
    if (id) {
      await api.actualizarTransaccion(parseInt(id, 10), payload);
      ui.showToast('Transacción actualizada correctamente', 'success');
    } else {
      await api.crearTransaccion(payload);
      ui.showToast('Transacción creada correctamente', 'success');
    }

    ui.closeModal('modalTransaccion');

    // Recargar datos según la vista activa
    const { currentView, filtrosDashboard } = store.getState();
    if (currentView === 'transacciones') {
      await loadTransacciones();
    } else if (currentView === 'dashboard') {
      await loadDashboard(filtrosDashboard.desde, filtrosDashboard.hasta);
    }

  } catch (err) {
    console.error('[Trans] Error al guardar:', err);
    ui.showGeneralError('errGeneral', err.message || 'Error al guardar la transacción.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn--loading');
  }
}

function confirmDeleteTransaccion(id) {
  ui.showConfirm('¿Eliminar esta transacción? Esta acción no se puede deshacer.', async () => {
    try {
      await api.eliminarTransaccion(id);
      ui.showToast('Transacción eliminada', 'success');
      const { currentView, filtrosDashboard } = store.getState();
      if (currentView === 'transacciones') {
        await loadTransacciones();
      } else {
        await loadDashboard(filtrosDashboard.desde, filtrosDashboard.hasta);
      }
    } catch (err) {
      ui.showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  });
}

// ============================================================
// MODAL — CATEGORÍA
// ============================================================

function openNewCategoria() {
  ui.resetFormCategoria();
  document.getElementById('modalCatTitle').textContent = 'Nueva Categoría';
  document.getElementById('submitCat').textContent = 'Guardar';
  ui.openModal('modalCategoria');
}

function openEditCategoria(cat) {
  ui.fillFormCategoria(cat);
  document.getElementById('modalCatTitle').textContent = 'Editar Categoría';
  document.getElementById('submitCat').textContent = 'Actualizar';
  ui.openModal('modalCategoria');
}

function setupModalCategoria() {
  // Cerrar modal
  document.getElementById('closeModalCat')?.addEventListener('click', () => ui.closeModal('modalCategoria'));
  document.getElementById('cancelModalCat')?.addEventListener('click', () => ui.closeModal('modalCategoria'));

  document.getElementById('modalCategoria')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) ui.closeModal('modalCategoria');
  });

  // Tipo selector
  document.querySelectorAll('#formCategoria .tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => ui.setTipoCategoria(btn.dataset.catTipo));
  });

  // Preview de color
  document.getElementById('catColor')?.addEventListener('input', e => {
    ui.updateColorPreview(e.target.value);
  });

  // Submit
  document.getElementById('formCategoria')?.addEventListener('submit', handleSubmitCategoria);
}

async function handleSubmitCategoria(e) {
  e.preventDefault();

  ui.clearFormErrors(['errCatNombre', 'errCatIcono', 'errCatColor', 'errCatTipo', 'errCatGeneral']);

  const id     = document.getElementById('catId')?.value;
  const nombre = document.getElementById('catNombre')?.value?.trim();
  const icono  = document.getElementById('catIcono')?.value?.trim();
  const color  = document.getElementById('catColor')?.value;
  const tipo   = document.getElementById('catTipoField')?.value;

  let hasError = false;

  if (!nombre || nombre.length < 1 || nombre.length > 50) {
    ui.showFieldError('catNombre', 'errCatNombre', 'Nombre obligatorio (1-50 caracteres).');
    hasError = true;
  }

  if (!icono) {
    ui.showFieldError('catIcono', 'errCatIcono', 'El icono es obligatorio.');
    hasError = true;
  }

  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    ui.showFieldError('catColor', 'errCatColor', 'Color inválido.');
    hasError = true;
  }

  if (!tipo) {
    ui.showFieldError('catTipoField', 'errCatTipo', 'Selecciona el tipo.');
    hasError = true;
  }

  if (hasError) return;

  const payload = { nombre, icono, color, tipo };

  const submitBtn = document.getElementById('submitCat');
  submitBtn.disabled = true;
  submitBtn.classList.add('btn--loading');

  try {
    let savedCat;
    if (id) {
      const res = await api.actualizarCategoria(parseInt(id, 10), payload);
      savedCat = res.data;
      actions.upsertCategoria(savedCat);
      ui.showToast('Categoría actualizada', 'success');
    } else {
      const res = await api.crearCategoria(payload);
      savedCat = res.data;
      actions.upsertCategoria(savedCat);
      ui.showToast('Categoría creada', 'success');
    }

    ui.closeModal('modalCategoria');

    // Re-render grid de categorías
    const { categorias, filtroCategorias } = store.getState();
    ui.renderCategoriasGrid(categorias, filtroCategorias.tipo, openEditCategoria, confirmDeleteCategoria);
    ui.populateFilterCategoriaSelect(categorias);

  } catch (err) {
    console.error('[Cat] Error al guardar:', err);
    const msg = err.status === 409
      ? 'Ya existe una categoría con ese nombre y tipo.'
      : (err.message || 'Error al guardar la categoría.');
    ui.showGeneralError('errCatGeneral', msg);
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn--loading');
  }
}

function confirmDeleteCategoria(id) {
  ui.showConfirm(
    '¿Eliminar esta categoría? No se puede eliminar si tiene transacciones asociadas.',
    async () => {
      try {
        await api.eliminarCategoria(id);
        actions.removeCategoria(id);
        ui.showToast('Categoría eliminada', 'success');

        const { categorias, filtroCategorias } = store.getState();
        ui.renderCategoriasGrid(categorias, filtroCategorias.tipo, openEditCategoria, confirmDeleteCategoria);
        ui.populateFilterCategoriaSelect(categorias);
      } catch (err) {
        const msg = err.status === 409
          ? 'No se puede eliminar: tiene transacciones asociadas.'
          : (err.message || 'Error al eliminar la categoría.');
        ui.showToast(msg, 'error');
      }
    }
  );
}

// ============================================================
// UTILIDADES
// ============================================================

function closeAllModals() {
  ['modalTransaccion', 'modalCategoria', 'modalConfirm'].forEach(id => ui.closeModal(id));
}

// ============================================================
// ARRANQUE
// ============================================================

document.addEventListener('DOMContentLoaded', init);
