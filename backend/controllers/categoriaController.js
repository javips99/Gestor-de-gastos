const { pool } = require('../config/db');

// ── Validación ─────────────────────────────────────────────────
function validateCategoria({ nombre, icono, color, tipo }) {
  const errors = [];

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    errors.push('El nombre es obligatorio');
  } else if (nombre.trim().length > 50) {
    errors.push('El nombre no puede superar los 50 caracteres');
  }

  if (!icono || typeof icono !== 'string' || icono.trim().length === 0) {
    errors.push('El icono es obligatorio');
  }

  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    errors.push('El color debe ser un valor hexadecimal válido (ej: #FF5733)');
  }

  if (!tipo || !['ingreso', 'gasto'].includes(tipo)) {
    errors.push('El tipo debe ser "ingreso" o "gasto"');
  }

  return errors;
}

// GET /api/categorias
// Query param opcional: ?tipo=ingreso|gasto
async function getAll(req, res, next) {
  try {
    const { tipo } = req.query;

    if (tipo && !['ingreso', 'gasto'].includes(tipo)) {
      return res.status(400).json({ error: 'El parámetro "tipo" debe ser "ingreso" o "gasto"' });
    }

    const whereClause = tipo ? 'WHERE tipo = $1' : '';
    const params      = tipo ? [tipo] : [];

    const { rows } = await pool.query(
      `SELECT id, nombre, icono, color, tipo, created_at
       FROM categorias
       ${whereClause}
       ORDER BY tipo ASC, nombre ASC`,
      params
    );

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/categorias
async function create(req, res, next) {
  try {
    const { nombre, icono, color, tipo } = req.body;
    const errors = validateCategoria({ nombre, icono, color, tipo });

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const insertResult = await pool.query(
      'INSERT INTO categorias (nombre, icono, color, tipo) VALUES ($1, $2, $3, $4) RETURNING id',
      [nombre.trim(), icono.trim(), color, tipo]
    );

    const newId = insertResult.rows[0].id;
    const { rows } = await pool.query(
      'SELECT id, nombre, icono, color, tipo, created_at FROM categorias WHERE id = $1',
      [newId]
    );

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    // Violación de constraint UNIQUE (nombre + tipo duplicado)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre y tipo' });
    }
    next(err);
  }
}

// PUT /api/categorias/:id
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de categoría inválido' });
    }

    const { nombre, icono, color, tipo } = req.body;
    const errors = validateCategoria({ nombre, icono, color, tipo });

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const result = await pool.query(
      'UPDATE categorias SET nombre = $1, icono = $2, color = $3, tipo = $4 WHERE id = $5',
      [nombre.trim(), icono.trim(), color, tipo, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const { rows } = await pool.query(
      'SELECT id, nombre, icono, color, tipo, created_at FROM categorias WHERE id = $1',
      [id]
    );

    res.json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre y tipo' });
    }
    next(err);
  }
}

// DELETE /api/categorias/:id
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de categoría inválido' });
    }

    // Comprobar si tiene transacciones antes del DELETE para dar mensaje claro
    const countResult = await pool.query(
      'SELECT COUNT(*) AS total FROM transacciones WHERE id_categoria = $1',
      [id]
    );
    const total = Number(countResult.rows[0].total);

    if (total > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: la categoría tiene ${total} transacción/es asociadas`,
      });
    }

    const result = await pool.query('DELETE FROM categorias WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, create, update, remove };
