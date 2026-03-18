/**
 * ui.js — Renderizado del DOM
 * Funciones puras que reciben datos y generan/actualizan el DOM.
 */

// ============================================================
// FORMATTERS
// ============================================================

const currencyFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const shortDateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
});

/**
 * Formatea un importe en euros.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return currencyFmt.format(amount);
}

/**
 * Formatea una fecha ISO/YYYY-MM-DD a texto legible.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return dateFmt.format(d);
}

/**
 * Formatea una fecha corta (sin año).
 * @param {string} dateStr
 * @returns {string}
 */
export function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return shortDateFmt.format(d);
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/**
 * Muestra un toast de notificación.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration=3000]
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.remove();
  }, duration + 300); // +300 para que termine la animación CSS
}

// ============================================================
// LOADING
// ============================================================

/**
 * Muestra u oculta el overlay de carga global.
 * @param {boolean} show
 */
export function setGlobalLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;
  overlay.classList.toggle('is-active', show);
}

// ============================================================
// SIDEBAR & NAVEGACIÓN
// ============================================================

/**
 * Actualiza el estado activo de los elementos de navegación.
 * @param {string} viewName
 */
export function setActiveNav(viewName) {
  // Sidebar
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('nav-item--active', el.dataset.view === viewName);
  });
  // Bottom nav
  document.querySelectorAll('.bottom-nav__item').forEach(el => {
    el.classList.toggle('bottom-nav__item--active', el.dataset.view === viewName);
  });
}

/**
 * Muestra la vista activa y oculta las demás.
 * @param {string} viewName
 */
export function showView(viewName) {
  document.querySelectorAll('.view').forEach(el => {
    el.classList.toggle('view--hidden', el.id !== `view-${viewName}`);
  });

  const titles = {
    dashboard: 'Dashboard',
    transacciones: 'Transacciones',
    categorias: 'Categorías',
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[viewName] || viewName;
}

// ============================================================
// TOPBAR
// ============================================================

/** Actualiza la fecha en el topbar. */
export function renderTopbarDate() {
  const el = document.getElementById('topbarDate');
  if (!el) return;
  const now = new Date();
  el.textContent = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(now);
}

/**
 * Renderiza el botón de acción principal en el topbar según la vista.
 * @param {string} viewName
 * @param {Function} onNewTransaccion
 * @param {Function} onNewCategoria
 */
export function renderTopbarActions(viewName, onNewTransaccion, onNewCategoria) {
  const container = document.getElementById('topbarActions');
  if (!container) return;

  if (viewName === 'transacciones') {
    container.innerHTML = `
      <button class="btn btn--primary btn--sm" id="topbarNewTrans">
        + Nueva transacción
      </button>
    `;
    document.getElementById('topbarNewTrans')?.addEventListener('click', onNewTransaccion);
  } else if (viewName === 'categorias') {
    container.innerHTML = `
      <button class="btn btn--primary btn--sm" id="topbarNewCat">
        + Nueva categoría
      </button>
    `;
    document.getElementById('topbarNewCat')?.addEventListener('click', onNewCategoria);
  } else {
    container.innerHTML = '';
  }
}

// ============================================================
// DASHBOARD — KPIs
// ============================================================

/**
 * Renderiza los KPIs del dashboard.
 * @param {{ totales: { ingresos: number, gastos: number, balance: number } }} resumen
 * @param {number} totalTransacciones
 */
export function renderKPIs(resumen, totalTransacciones = 0) {
  const { ingresos, gastos, balance } = resumen.totales;

  setText('kpiIngresos', formatCurrency(ingresos));
  setText('kpiGastos', formatCurrency(gastos));
  setText('kpiBalance', formatCurrency(balance));
  setText('kpiTotal', totalTransacciones.toLocaleString('es-ES'));

  // Color dinámico del balance
  const balanceCard = document.getElementById('kpiBalanceCard');
  const balanceValue = document.getElementById('kpiBalance');
  if (balanceCard && balanceValue) {
    balanceValue.style.color = balance >= 0
      ? 'var(--color-balance-pos)'
      : 'var(--color-balance-neg)';
  }
}

// ============================================================
// DASHBOARD — Top Categorías
// ============================================================

/**
 * Renderiza el listado de top categorías de gastos.
 * @param {Array} categorias - Array de { nombre, icono, color, total, porcentaje }
 */
export function renderTopCategorias(categorias) {
  const container = document.getElementById('topCategoriasLista');
  if (!container) return;

  if (!categorias?.length) {
    container.innerHTML = '<div class="empty-state"><span class="empty-state__icon">🤷</span><span class="empty-state__title">Sin datos</span></div>';
    return;
  }

  const topN = categorias.slice(0, 6);
  const maxTotal = topN[0]?.total || 1;

  container.innerHTML = topN.map((cat, i) => `
    <div class="top-cat-item">
      <span class="top-cat-item__rank">${i + 1}</span>
      <div class="top-cat-item__icon" style="background:${hexToRgba(cat.color, 0.15)}">
        ${escapeHtml(cat.icono)}
      </div>
      <div class="top-cat-item__info">
        <div class="top-cat-item__name">${escapeHtml(cat.nombre)}</div>
        <div class="top-cat-item__bar">
          <div class="top-cat-item__bar-fill"
               style="width:${(cat.total / maxTotal * 100).toFixed(1)}%;background:${escapeHtml(cat.color)}">
          </div>
        </div>
      </div>
      <span class="top-cat-item__pct">${(cat.porcentaje || 0).toFixed(1)}%</span>
      <span class="top-cat-item__amount">${formatCurrency(cat.total)}</span>
    </div>
  `).join('');
}

// ============================================================
// DASHBOARD — Últimas transacciones
// ============================================================

/**
 * Renderiza las últimas transacciones en el dashboard.
 * @param {Array} transacciones
 */
export function renderUltimasTransacciones(transacciones) {
  const container = document.getElementById('ultimasTransacciones');
  if (!container) return;

  if (!transacciones?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state__icon">💸</span>
        <span class="empty-state__title">Sin transacciones</span>
        <span class="empty-state__desc">Añade tu primera transacción usando el botón +</span>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="trans-mini-list">
      ${transacciones.slice(0, 8).map(t => `
        <div class="trans-mini-item">
          <div class="trans-mini-item__icon"
               style="background:${hexToRgba(t.categoria_color || '#999', 0.15)}">
            ${escapeHtml(t.categoria_icono || '💳')}
          </div>
          <div class="trans-mini-item__info">
            <div class="trans-mini-item__desc">${escapeHtml(t.descripcion)}</div>
            <div class="trans-mini-item__meta">
              ${escapeHtml(t.categoria_nombre || '—')} · ${formatShortDate(t.fecha)}
            </div>
          </div>
          <span class="trans-mini-item__amount ${t.tipo === 'ingreso' ? 'text-income' : 'text-expense'}">
            ${t.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(t.importe)}
          </span>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================
// TRANSACCIONES — Tabla
// ============================================================

/**
 * Renderiza las filas de la tabla de transacciones.
 * @param {Array} transacciones
 * @param {Function} onEdit  - Callback(transaccion)
 * @param {Function} onDelete - Callback(id)
 */
export function renderTablaTransacciones(transacciones, onEdit, onDelete) {
  const tbody = document.getElementById('transTableBody');
  const countEl = document.getElementById('transCount');
  if (!tbody) return;

  if (!transacciones?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table__empty">No hay transacciones con estos filtros.</td></tr>';
    if (countEl) countEl.textContent = '0';
    return;
  }

  if (countEl) countEl.textContent = transacciones.length;

  tbody.innerHTML = transacciones.map(t => `
    <tr data-id="${t.id}">
      <td class="table__date">${formatDate(t.fecha)}</td>
      <td>
        <div class="table__desc" title="${escapeHtml(t.descripcion)}">${escapeHtml(t.descripcion)}</div>
        ${t.notas ? `<div class="text-muted" style="font-size:0.75rem;margin-top:2px">${escapeHtml(t.notas.slice(0, 50))}${t.notas.length > 50 ? '…' : ''}</div>` : ''}
      </td>
      <td>
        <span class="cat-chip">
          <span class="cat-chip__dot" style="background:${escapeHtml(t.categoria_color || '#999')}"></span>
          <span class="cat-chip__name">${escapeHtml(t.categoria_icono || '')} ${escapeHtml(t.categoria_nombre || '—')}</span>
        </span>
      </td>
      <td>
        <span class="tipo-chip tipo-chip--${t.tipo}">
          ${t.tipo === 'ingreso' ? '📈' : '📉'} ${t.tipo}
        </span>
      </td>
      <td class="text-right">
        <span class="table__amount ${t.tipo === 'ingreso' ? 'text-income' : 'text-expense'}">
          ${t.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(t.importe)}
        </span>
      </td>
      <td class="text-center">
        <div style="display:flex;gap:4px;justify-content:center">
          <button class="btn btn--ghost btn--icon btn--sm" data-action="edit" title="Editar">✏️</button>
          <button class="btn btn--ghost btn--icon btn--sm" data-action="delete" title="Eliminar">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Delegación de eventos en la tabla
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    const id = parseInt(row.dataset.id, 10);
    const trans = transacciones.find(t => t.id === id);

    row.querySelector('[data-action="edit"]')?.addEventListener('click', e => {
      e.stopPropagation();
      onEdit(trans);
    });
    row.querySelector('[data-action="delete"]')?.addEventListener('click', e => {
      e.stopPropagation();
      onDelete(id);
    });
  });
}

// ============================================================
// TRANSACCIONES — Paginación
// ============================================================

/**
 * Renderiza los controles de paginación.
 * @param {{ total: number, limit: number, offset: number, hasMore: boolean }} meta
 * @param {Function} onPrev
 * @param {Function} onNext
 */
export function renderPaginacion(meta, onPrev, onNext) {
  const container = document.getElementById('transPagination');
  if (!container) return;

  const { total, limit, offset, hasMore } = meta;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const hasPrev = offset > 0;

  if (total === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button class="btn btn--ghost btn--sm" id="pgPrev" ${hasPrev ? '' : 'disabled'}>← Anterior</button>
    <span class="pagination__info">${from}–${to} de ${total}</span>
    <button class="btn btn--ghost btn--sm" id="pgNext" ${hasMore ? '' : 'disabled'}>Siguiente →</button>
  `;

  document.getElementById('pgPrev')?.addEventListener('click', onPrev);
  document.getElementById('pgNext')?.addEventListener('click', onNext);
}

// ============================================================
// TRANSACCIONES — Resumen rápido
// ============================================================

/**
 * Renderiza el resumen rápido (ingresos/gastos) sobre la tabla.
 * @param {Array} transacciones
 */
export function renderQuickSummary(transacciones) {
  const container = document.getElementById('quickSummary');
  if (!container || !transacciones?.length) {
    if (container) container.innerHTML = '';
    return;
  }

  const ingresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.importe), 0);
  const gastos   = transacciones.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.importe), 0);
  const balance  = ingresos - gastos;

  container.innerHTML = `
    <div class="quick-summary__item">
      <span class="quick-summary__label">Ingresos</span>
      <span class="quick-summary__value text-income">${formatCurrency(ingresos)}</span>
    </div>
    <div class="quick-summary__item">
      <span class="quick-summary__label">Gastos</span>
      <span class="quick-summary__value text-expense">${formatCurrency(gastos)}</span>
    </div>
    <div class="quick-summary__item">
      <span class="quick-summary__label">Balance</span>
      <span class="quick-summary__value" style="color:${balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
        ${formatCurrency(balance)}
      </span>
    </div>
  `;
}

// ============================================================
// CATEGORÍAS — Grid
// ============================================================

/**
 * Renderiza el grid de tarjetas de categorías.
 * @param {Array} categorias
 * @param {string} filtroTipo - '' | 'ingreso' | 'gasto'
 * @param {Function} onEdit   - Callback(categoria)
 * @param {Function} onDelete - Callback(id)
 */
export function renderCategoriasGrid(categorias, filtroTipo, onEdit, onDelete) {
  const container = document.getElementById('categoriasGrid');
  if (!container) return;

  const filtered = filtroTipo
    ? categorias.filter(c => c.tipo === filtroTipo)
    : categorias;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="empty-state__icon">🏷️</span>
        <span class="empty-state__title">Sin categorías</span>
        <span class="empty-state__desc">Crea tu primera categoría</span>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(cat => `
    <div class="cat-card" data-id="${cat.id}">
      <div class="cat-card__header">
        <div class="cat-card__icon-wrap" style="background:${hexToRgba(cat.color, 0.15)}">
          ${escapeHtml(cat.icono)}
        </div>
        <div class="cat-card__info">
          <div class="cat-card__name">${escapeHtml(cat.nombre)}</div>
          <div class="cat-card__tipo cat-card__tipo--${cat.tipo}">${cat.tipo}</div>
        </div>
      </div>
      <div class="cat-card__color-strip" style="height:3px;background:${escapeHtml(cat.color)};border-radius:var(--radius-full)"></div>
      <div class="cat-card__actions">
        <button class="btn btn--ghost btn--icon btn--sm" data-action="edit" title="Editar">✏️</button>
        <button class="btn btn--ghost btn--icon btn--sm" data-action="delete" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');

  // Eventos
  container.querySelectorAll('.cat-card').forEach(card => {
    const id = parseInt(card.dataset.id, 10);
    const cat = filtered.find(c => c.id === id);

    card.querySelector('[data-action="edit"]')?.addEventListener('click', () => onEdit(cat));
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => onDelete(id));
  });
}

// ============================================================
// MODAL TRANSACCIÓN — Populate
// ============================================================

/**
 * Rellena el select de categorías del modal de transacción.
 * @param {Array} categorias
 * @param {'ingreso'|'gasto'} tipo - Tipo activo para filtrar categorías
 */
export function populateCategoriaSelect(categorias, tipo = 'gasto') {
  const select = document.getElementById('transCategoriaField');
  if (!select) return;

  const filtradas = categorias.filter(c => c.tipo === tipo);
  select.innerHTML = `<option value="">Selecciona una categoría</option>
    ${filtradas.map(c => `<option value="${c.id}">${escapeHtml(c.icono)} ${escapeHtml(c.nombre)}</option>`).join('')}`;
}

/**
 * Rellena el select de categorías en los filtros de transacciones.
 * @param {Array} categorias
 */
export function populateFilterCategoriaSelect(categorias) {
  const select = document.getElementById('transCategoria');
  if (!select) return;
  select.innerHTML = `<option value="">Todas</option>
    ${categorias.map(c => `<option value="${c.id}">${escapeHtml(c.icono)} ${escapeHtml(c.nombre)}</option>`).join('')}`;
}

// ============================================================
// MODAL TRANSACCIÓN — Reset / Fill
// ============================================================

/**
 * Limpia el formulario de transacción para una nueva entrada.
 * @param {string} [today] - Fecha por defecto (YYYY-MM-DD)
 */
export function resetFormTransaccion(today = '') {
  const ids = ['transId', 'transDescripcion', 'transImporte', 'transNotas'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  const fechaEl = document.getElementById('transFecha');
  if (fechaEl) fechaEl.value = today;

  setTipoTransaccion('gasto');
  clearFormErrors(['errDescripcion', 'errImporte', 'errFecha', 'errTipo', 'errCategoria', 'errGeneral']);
}

/**
 * Rellena el formulario de transacción con los datos de una existente.
 * @param {Object} trans
 */
export function fillFormTransaccion(trans) {
  setValue('transId', trans.id);
  setValue('transDescripcion', trans.descripcion);
  setValue('transImporte', trans.importe);
  setValue('transFecha', trans.fecha);
  setValue('transNotas', trans.notas || '');
  setTipoTransaccion(trans.tipo);

  // La categoría se setea después de popular el select
  const catSelect = document.getElementById('transCategoriaField');
  if (catSelect) catSelect.value = trans.id_categoria || trans.categoria_id || '';

  clearFormErrors(['errDescripcion', 'errImporte', 'errFecha', 'errTipo', 'errCategoria', 'errGeneral']);
}

/**
 * Actualiza los botones de tipo (gasto/ingreso) del modal.
 * @param {'gasto'|'ingreso'} tipo
 */
export function setTipoTransaccion(tipo) {
  setValue('transTipoField', tipo);
  document.querySelectorAll('#formTransaccion .tipo-btn').forEach(btn => {
    btn.classList.toggle('tipo-btn--active', btn.dataset.tipo === tipo);
  });
}

// ============================================================
// MODAL CATEGORÍA — Reset / Fill
// ============================================================

/**
 * Limpia el formulario de categoría.
 */
export function resetFormCategoria() {
  setValue('catId', '');
  setValue('catNombre', '');
  setValue('catIcono', '🏷️');
  setValue('catColor', '#6366F1');
  updateColorPreview('#6366F1');
  setTipoCategoria('gasto');
  clearFormErrors(['errCatNombre', 'errCatIcono', 'errCatColor', 'errCatTipo', 'errCatGeneral']);
}

/**
 * Rellena el formulario de categoría con datos existentes.
 * @param {Object} cat
 */
export function fillFormCategoria(cat) {
  setValue('catId', cat.id);
  setValue('catNombre', cat.nombre);
  setValue('catIcono', cat.icono);
  setValue('catColor', cat.color);
  updateColorPreview(cat.color);
  setTipoCategoria(cat.tipo);
  clearFormErrors(['errCatNombre', 'errCatIcono', 'errCatColor', 'errCatTipo', 'errCatGeneral']);
}

/**
 * Actualiza los botones de tipo del modal de categoría.
 * @param {'gasto'|'ingreso'} tipo
 */
export function setTipoCategoria(tipo) {
  setValue('catTipoField', tipo);
  document.querySelectorAll('#formCategoria .tipo-btn').forEach(btn => {
    btn.classList.toggle('tipo-btn--active', btn.dataset.catTipo === tipo);
  });
}

/**
 * Actualiza el texto de preview del color seleccionado.
 * @param {string} hex
 */
export function updateColorPreview(hex) {
  const el = document.getElementById('colorPreview');
  if (el) el.textContent = hex.toUpperCase();
}

// ============================================================
// VALIDACIÓN — Mostrar/ocultar errores
// ============================================================

/**
 * Muestra un error en un campo del formulario.
 * @param {string} fieldId - ID del input
 * @param {string} errorId - ID del span de error
 * @param {string} message
 */
export function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);
  if (field) field.classList.add('is-error');
  if (error) error.textContent = message;
}

/**
 * Limpia los errores de los campos especificados.
 * @param {string[]} errorIds - IDs de los spans de error
 */
export function clearFormErrors(errorIds) {
  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
    if (el) el.classList.remove('is-visible');
  });

  // Limpiar clases is-error de los inputs
  document.querySelectorAll('.input.is-error, .select.is-error, .textarea.is-error').forEach(el => {
    el.classList.remove('is-error');
  });
}

/**
 * Muestra el error general del formulario.
 * @param {string} errorId
 * @param {string} message
 */
export function showGeneralError(errorId, message) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  el.style.display = 'block';
}

// ============================================================
// MODAL — Abrir / Cerrar
// ============================================================

/**
 * Abre un modal por ID.
 * @param {string} modalId
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('is-open');
    // Foco en el primer input
    setTimeout(() => {
      modal.querySelector('input:not([type="hidden"]), select, textarea')?.focus();
    }, 100);
  }
}

/**
 * Cierra un modal por ID.
 * @param {string} modalId
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('is-open');
}

// ============================================================
// CONFIRM DIALOG
// ============================================================

/**
 * Muestra el modal de confirmación de borrado.
 * @param {string} message
 * @param {Function} onConfirm
 */
export function showConfirm(message, onConfirm) {
  const msgEl = document.getElementById('confirmMsg');
  if (msgEl) msgEl.textContent = message;
  openModal('modalConfirm');

  const okBtn = document.getElementById('confirmOk');
  const cancelBtn = document.getElementById('confirmCancel');

  const cleanup = () => {
    closeModal('modalConfirm');
    okBtn?.removeEventListener('click', handleOk);
    cancelBtn?.removeEventListener('click', handleCancel);
  };

  const handleOk = () => { cleanup(); onConfirm(); };
  const handleCancel = () => { cleanup(); };

  okBtn?.addEventListener('click', handleOk);
  cancelBtn?.addEventListener('click', handleCancel);
}

// ============================================================
// UTILIDADES INTERNAS
// ============================================================

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convierte un hex a rgba.
 * @param {string} hex - '#RRGGBB'
 * @param {number} alpha
 * @returns {string}
 */
export function hexToRgba(hex, alpha = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(100,100,100,${alpha})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
