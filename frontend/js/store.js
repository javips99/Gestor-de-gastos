/**
 * store.js — Estado centralizado de la aplicación
 * Patrón: Store reactivo simple con suscriptores.
 */

/** @typedef {'dashboard'|'transacciones'|'categorias'} ViewName */

/** Estado inicial */
const initialState = {
  /** Vista activa */
  currentView: /** @type {ViewName} */ ('dashboard'),

  /** Categorías cargadas */
  categorias: /** @type {Array} */ ([]),

  /** Transacciones de la vista actual */
  transacciones: /** @type {Array} */ ([]),

  /** Metadatos de paginación */
  transaccionesMeta: {
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  },

  /** Datos del resumen/dashboard */
  resumen: /** @type {Object|null} */ (null),

  /** Filtros activos en la vista de transacciones */
  filtrosTransacciones: {
    desde: '',
    hasta: '',
    tipo: '',
    categoria: '',
    limit: 50,
    offset: 0,
  },

  /** Filtros activos en el dashboard */
  filtrosDashboard: {
    desde: '',
    hasta: '',
  },

  /** Filtro activo en la vista de categorías */
  filtroCategorias: {
    tipo: '', // '' | 'ingreso' | 'gasto'
  },

  /** Estado de carga global */
  isLoading: false,

  /** Indica si las categorías ya han sido cargadas al menos una vez */
  categoriasLoaded: false,
};

// ============================================================
// STORE
// ============================================================

class Store {
  constructor(initial) {
    this._state = structuredClone(initial);
    /** @type {Map<string, Set<Function>>} */
    this._subs = new Map();
  }

  /** Devuelve una copia del estado actual. */
  getState() {
    return this._state;
  }

  /**
   * Actualiza el estado de forma parcial (shallow merge en el nivel superior).
   * Notifica a los suscriptores de cada clave modificada.
   * @param {Partial<typeof initialState>} patch
   */
  setState(patch) {
    const changed = [];

    for (const [key, value] of Object.entries(patch)) {
      if (this._state[key] !== value) {
        this._state[key] = value;
        changed.push(key);
      }
    }

    // Notificar suscriptores
    for (const key of changed) {
      const listeners = this._subs.get(key);
      if (listeners) {
        for (const fn of listeners) {
          fn(this._state[key], this._state);
        }
      }
    }

    // Notificar suscriptores globales '*'
    if (changed.length > 0) {
      const global = this._subs.get('*');
      if (global) {
        for (const fn of global) {
          fn(this._state);
        }
      }
    }
  }

  /**
   * Actualiza un objeto anidado de primer nivel (merge profundo de un nivel).
   * @param {string} key - Clave del estado (debe ser un objeto)
   * @param {Object} patch - Campos a fusionar
   */
  mergeState(key, patch) {
    const current = this._state[key];
    if (typeof current !== 'object' || current === null) {
      throw new Error(`store.mergeState: '${key}' no es un objeto`);
    }
    this.setState({ [key]: { ...current, ...patch } });
  }

  /**
   * Suscribirse a cambios en una clave específica del estado.
   * Usa '*' para suscribirse a cualquier cambio.
   * @param {string} key
   * @param {Function} fn - Callback(nuevoValor, estadoCompleto)
   * @returns {Function} Función para cancelar la suscripción
   */
  subscribe(key, fn) {
    if (!this._subs.has(key)) {
      this._subs.set(key, new Set());
    }
    this._subs.get(key).add(fn);

    // Devuelve la función de unsuscribe
    return () => this._subs.get(key)?.delete(fn);
  }

  /** Resetea el estado al valor inicial. */
  reset() {
    this._state = structuredClone(initialState);
    const global = this._subs.get('*');
    if (global) {
      for (const fn of global) fn(this._state);
    }
  }
}

// ============================================================
// INSTANCIA SINGLETON
// ============================================================

export const store = new Store(initialState);

// ============================================================
// ACCIONES — Mutaciones semánticas del estado
// ============================================================

export const actions = {
  /** Cambia la vista activa */
  setView(view) {
    store.setState({ currentView: view });
  },

  /** Guarda las categorías cargadas */
  setCategorias(categorias) {
    store.setState({ categorias, categoriasLoaded: true });
  },

  /** Guarda transacciones y metadata de paginación */
  setTransacciones(data, meta) {
    store.setState({ transacciones: data, transaccionesMeta: meta });
  },

  /** Guarda el resumen del dashboard */
  setResumen(resumen) {
    store.setState({ resumen });
  },

  /** Actualiza filtros de transacciones (merge parcial) */
  setFiltrosTransacciones(patch) {
    store.mergeState('filtrosTransacciones', patch);
  },

  /** Resetea filtros de transacciones a valores por defecto */
  resetFiltrosTransacciones() {
    store.setState({
      filtrosTransacciones: {
        desde: '',
        hasta: '',
        tipo: '',
        categoria: '',
        limit: 50,
        offset: 0,
      },
    });
  },

  /** Actualiza filtros del dashboard */
  setFiltrosDashboard(patch) {
    store.mergeState('filtrosDashboard', patch);
  },

  /** Actualiza filtro de categorías */
  setFiltroCategorias(tipo) {
    store.mergeState('filtroCategorias', { tipo });
  },

  /** Activa/desactiva el loading global */
  setLoading(isLoading) {
    store.setState({ isLoading });
  },

  /** Agrega o actualiza una categoría en el estado */
  upsertCategoria(categoria) {
    const { categorias } = store.getState();
    const idx = categorias.findIndex(c => c.id === categoria.id);
    if (idx >= 0) {
      const updated = [...categorias];
      updated[idx] = categoria;
      store.setState({ categorias: updated });
    } else {
      store.setState({ categorias: [...categorias, categoria] });
    }
  },

  /** Elimina una categoría del estado */
  removeCategoria(id) {
    const { categorias } = store.getState();
    store.setState({ categorias: categorias.filter(c => c.id !== id) });
  },

  /** Avanza a la siguiente página de transacciones */
  nextPage() {
    const { filtrosTransacciones, transaccionesMeta } = store.getState();
    if (transaccionesMeta.hasMore) {
      store.mergeState('filtrosTransacciones', {
        offset: filtrosTransacciones.offset + filtrosTransacciones.limit,
      });
    }
  },

  /** Vuelve a la página anterior de transacciones */
  prevPage() {
    const { filtrosTransacciones } = store.getState();
    const newOffset = Math.max(0, filtrosTransacciones.offset - filtrosTransacciones.limit);
    store.mergeState('filtrosTransacciones', { offset: newOffset });
  },
};
