/**
 * api.js — Comunicación con la API REST del backend
 * Base URL: http://localhost:3000/api
 */

const API_BASE = 'http://localhost:3000/api';

/**
 * Realiza una petición HTTP a la API y devuelve los datos parseados.
 * @param {string} endpoint - Ruta relativa (ej: '/transacciones')
 * @param {RequestInit} [options] - Opciones de fetch
 * @returns {Promise<any>}
 * @throws {Error} Con mensaje del servidor o error de red
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new Error('No se pudo conectar con el servidor. ¿Está el backend corriendo?');
  }

  // Intentar parsear JSON aunque haya error HTTP
  let body;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const msg = body?.message || body?.error || `Error ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    err.body = body;
    throw err;
  }

  return body;
}

// ============================================================
// CATEGORÍAS
// ============================================================

/**
 * Obtener todas las categorías, opcionalmente filtradas por tipo.
 * @param {Object} [params]
 * @param {'ingreso'|'gasto'|''} [params.tipo]
 * @returns {Promise<{data: Array}>}
 */
export async function getCategorias(params = {}) {
  const qs = params.tipo ? `?tipo=${params.tipo}` : '';
  return request(`/categorias${qs}`);
}

/**
 * Crear una nueva categoría.
 * @param {{ nombre: string, icono: string, color: string, tipo: string }} data
 * @returns {Promise<{data: Object}>}
 */
export async function crearCategoria(data) {
  return request('/categorias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Actualizar una categoría existente.
 * @param {number} id
 * @param {{ nombre: string, icono: string, color: string, tipo: string }} data
 * @returns {Promise<{data: Object}>}
 */
export async function actualizarCategoria(id, data) {
  return request(`/categorias/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Eliminar una categoría. Falla si tiene transacciones asociadas.
 * @param {number} id
 * @returns {Promise<{message: string}>}
 */
export async function eliminarCategoria(id) {
  return request(`/categorias/${id}`, { method: 'DELETE' });
}

// ============================================================
// TRANSACCIONES
// ============================================================

/**
 * Obtener lista de transacciones con filtros opcionales.
 * @param {Object} [params]
 * @param {string} [params.desde]     - YYYY-MM-DD
 * @param {string} [params.hasta]     - YYYY-MM-DD
 * @param {number} [params.categoria]
 * @param {'ingreso'|'gasto'|''} [params.tipo]
 * @param {number} [params.limit]     - máx 200
 * @param {number} [params.offset]
 * @returns {Promise<{data: Array, meta: Object}>}
 */
export async function getTransacciones(params = {}) {
  const qs = buildQueryString(params);
  return request(`/transacciones${qs}`);
}

/**
 * Obtener una transacción por ID.
 * @param {number} id
 * @returns {Promise<{data: Object}>}
 */
export async function getTransaccion(id) {
  return request(`/transacciones/${id}`);
}

/**
 * Obtener resumen estadístico del período.
 * @param {Object} [params]
 * @param {string} [params.desde] - YYYY-MM-DD
 * @param {string} [params.hasta] - YYYY-MM-DD
 * @returns {Promise<{data: Object}>}
 */
export async function getResumen(params = {}) {
  const qs = buildQueryString(params);
  return request(`/transacciones/resumen${qs}`);
}

/**
 * Crear una nueva transacción.
 * @param {{ descripcion: string, importe: number, tipo: string, fecha: string, id_categoria: number, notas?: string }} data
 * @returns {Promise<{data: Object}>}
 */
export async function crearTransaccion(data) {
  return request('/transacciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Actualizar una transacción existente.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<{data: Object}>}
 */
export async function actualizarTransaccion(id, data) {
  return request(`/transacciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Eliminar una transacción.
 * @param {number} id
 * @returns {Promise<{message: string}>}
 */
export async function eliminarTransaccion(id) {
  return request(`/transacciones/${id}`, { method: 'DELETE' });
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Comprobar si la API está disponible.
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    await request('/health');
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Convierte un objeto de parámetros en query string.
 * Omite valores vacíos, null y undefined.
 * @param {Object} params
 * @returns {string} ej: '?desde=2026-01-01&tipo=gasto'
 */
function buildQueryString(params) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== '' && v !== null && v !== undefined
  );
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}
