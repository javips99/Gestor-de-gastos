const { pool } = require('../config/db');

// ── Constantes ─────────────────────────────────────────────────
const DATE_REGEX    = /^\d{4}-\d{2}-\d{2}$/;
const IMPORTE_MAX   = 99_999_999.99;
const TIPOS_VALIDOS = ['ingreso', 'gasto'];

// ── Validación ─────────────────────────────────────────────────
function validateTransaccion({ descripcion, importe, tipo, fecha, id_categoria, notas }) {
  const errors = [];

  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length === 0) {
    errors.push('La descripción es obligatoria');
  } else if (descripcion.trim().length > 150) {
    errors.push('La descripción no puede superar los 150 caracteres');
  }

  const importeNum = Number(importe);
  if (importe === undefined || importe === null || importe === '') {
    errors.push('El importe es obligatorio');
  } else if (isNaN(importeNum) || importeNum <= 0) {
    errors.push('El importe debe ser un número mayor que 0');
  } else if (importeNum > IMPORTE_MAX) {
    errors.push(`El importe no puede superar ${IMPORTE_MAX.toLocaleString('es-ES')}`);
  }

  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    errors.push('El tipo debe ser "ingreso" o "gasto"');
  }

  if (!fecha) {
    errors.push('La fecha es obligatoria');
  } else if (!DATE_REGEX.test(fecha) || isNaN(Date.parse(fecha))) {
    errors.push('La fecha debe tener el formato YYYY-MM-DD');
  }

  const idCatNum = Number(id_categoria);
  if (!id_categoria || !Number.isInteger(idCatNum) || idCatNum <= 0) {
    errors.push('La categoría es obligatoria y debe ser un ID válido');
  }

  if (notas !== undefined && notas !== null && String(notas).length > 500) {
    errors.push('Las notas no pueden superar los 500 caracteres');
  }

  return errors;
}

// ── Helpers ────────────────────────────────────────────────────

// Verifica que la categoría existe y que su tipo coincide con el de la transacción
async function findCategoria(id, tipo) {
  const [[row]] = await pool.query(
    'SELECT id, tipo FROM categorias WHERE id = ?',
    [id]
  );
  if (!row) return { error: 'La categoría especificada no existe', status: 404 };
  if (row.tipo !== tipo) {
    return {
      error: `La categoría seleccionada es de tipo "${row.tipo}", pero la transacción es de tipo "${tipo}"`,
      status: 400,
    };
  }
  return { categoria: row };
}

// Construye la cláusula WHERE y sus parámetros a partir de los filtros
function buildWhereClause({ desde, hasta, categoria, tipo }) {
  const conditions = [];
  const params     = [];

  if (desde)     { conditions.push('t.fecha >= ?');       params.push(desde); }
  if (hasta)     { conditions.push('t.fecha <= ?');       params.push(hasta); }
  if (categoria) { conditions.push('t.id_categoria = ?'); params.push(Number(categoria)); }
  if (tipo)      { conditions.push('t.tipo = ?');         params.push(tipo); }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

// Query SELECT reutilizada en getOne, create y update
const SELECT_TRANSACCION = `
  SELECT
    t.id, t.descripcion, t.importe, t.tipo, t.fecha, t.notas,
    t.created_at, t.updated_at,
    c.id    AS categoria_id,
    c.nombre AS categoria_nombre,
    c.icono  AS categoria_icono,
    c.color  AS categoria_color
  FROM transacciones t
  JOIN categorias c ON t.id_categoria = c.id
`;

// ── Controladores ──────────────────────────────────────────────

// GET /api/transacciones
// Params: desde, hasta, categoria, tipo, limit (máx 200), offset
async function getAll(req, res, next) {
  try {
    const { desde, hasta, categoria, tipo, limit = 50, offset = 0 } = req.query;

    if (desde && (!DATE_REGEX.test(desde) || isNaN(Date.parse(desde)))) {
      return res.status(400).json({ error: 'El parámetro "desde" debe tener formato YYYY-MM-DD' });
    }
    if (hasta && (!DATE_REGEX.test(hasta) || isNaN(Date.parse(hasta)))) {
      return res.status(400).json({ error: 'El parámetro "hasta" debe tener formato YYYY-MM-DD' });
    }
    if (desde && hasta && desde > hasta) {
      return res.status(400).json({ error: '"desde" no puede ser posterior a "hasta"' });
    }
    if (categoria && (!Number.isInteger(Number(categoria)) || Number(categoria) <= 0)) {
      return res.status(400).json({ error: 'El parámetro "categoria" debe ser un ID válido' });
    }
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: 'El parámetro "tipo" debe ser "ingreso" o "gasto"' });
    }

    const limitNum  = Math.min(Math.max(1, Number(limit)  || 50), 200);
    const offsetNum = Math.max(0, Number(offset) || 0);

    const { clause, params } = buildWhereClause({ desde, hasta, categoria, tipo });

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM transacciones t ${clause}`,
      params
    );

    const [rows] = await pool.query(
      `${SELECT_TRANSACCION}
       ${clause}
       ORDER BY t.fecha DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offsetNum]
    );

    res.json({
      data: rows,
      meta: { total, limit: limitNum, offset: offsetNum, hasMore: offsetNum + limitNum < total },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/transacciones/resumen
// Params: desde, hasta (opcionales — por defecto el año en curso)
async function getResumen(req, res, next) {
  try {
    const currentYear = new Date().getFullYear();
    const desde = req.query.desde || `${currentYear}-01-01`;
    const hasta = req.query.hasta || `${currentYear}-12-31`;

    if (!DATE_REGEX.test(desde) || isNaN(Date.parse(desde)) ||
        !DATE_REGEX.test(hasta) || isNaN(Date.parse(hasta))) {
      return res.status(400).json({ error: 'Las fechas deben tener formato YYYY-MM-DD' });
    }
    if (desde > hasta) {
      return res.status(400).json({ error: '"desde" no puede ser posterior a "hasta"' });
    }

    // Las tres queries se ejecutan en paralelo para reducir latencia
    const [totalesResult, porCategoriaResult, evolucionResult] = await Promise.all([
      // 1. Totales del período filtrado
      pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN importe ELSE 0 END), 0) AS total_ingresos,
           COALESCE(SUM(CASE WHEN tipo = 'gasto'   THEN importe ELSE 0 END), 0) AS total_gastos,
           COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN importe ELSE -importe END), 0) AS balance
         FROM transacciones
         WHERE fecha BETWEEN ? AND ?`,
        [desde, hasta]
      ),
      // 2. Distribución de gastos por categoría (gráfico de dona)
      pool.query(
        `SELECT
           c.id, c.nombre, c.icono, c.color,
           COALESCE(SUM(t.importe), 0) AS total
         FROM categorias c
         JOIN transacciones t ON c.id = t.id_categoria
           AND t.fecha BETWEEN ? AND ?
           AND t.tipo = 'gasto'
         WHERE c.tipo = 'gasto'
         GROUP BY c.id, c.nombre, c.icono, c.color
         ORDER BY total DESC`,
        [desde, hasta]
      ),
      // 3. Evolución mensual — últimos 12 meses completos (gráfico de barras)
      pool.query(
        `SELECT
           DATE_FORMAT(fecha, '%Y-%m') AS mes,
           SUM(CASE WHEN tipo = 'ingreso' THEN importe ELSE 0 END) AS ingresos,
           SUM(CASE WHEN tipo = 'gasto'   THEN importe ELSE 0 END) AS gastos
         FROM transacciones
         WHERE fecha >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
         GROUP BY DATE_FORMAT(fecha, '%Y-%m')
         ORDER BY mes ASC`
      ),
    ]);

    const [[totales]]    = totalesResult;
    const [porCategoria] = porCategoriaResult;
    const [evolucion]    = evolucionResult;

    const totalGastos = Number(totales.total_gastos);

    res.json({
      data: {
        periodo: { desde, hasta },
        totales: {
          ingresos: Number(totales.total_ingresos),
          gastos:   totalGastos,
          balance:  Number(totales.balance),
        },
        porCategoria: porCategoria.map((cat) => ({
          ...cat,
          total:      Number(cat.total),
          porcentaje: totalGastos > 0
            ? Number(((cat.total / totalGastos) * 100).toFixed(2))
            : 0,
        })),
        evolucionMensual: evolucion.map((row) => ({
          mes:      row.mes,
          ingresos: Number(row.ingresos),
          gastos:   Number(row.gastos),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/transacciones/:id
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de transacción inválido' });
    }

    const [rows] = await pool.query(`${SELECT_TRANSACCION} WHERE t.id = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/transacciones
async function create(req, res, next) {
  try {
    const { descripcion, importe, tipo, fecha, id_categoria, notas = null } = req.body;

    const errors = validateTransaccion({ descripcion, importe, tipo, fecha, id_categoria, notas });
    if (errors.length > 0) return res.status(400).json({ errors });

    const catResult = await findCategoria(Number(id_categoria), tipo);
    if (catResult.error) return res.status(catResult.status).json({ error: catResult.error });

    const [result] = await pool.query(
      `INSERT INTO transacciones (descripcion, importe, tipo, fecha, id_categoria, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        descripcion.trim(),
        Number(importe),
        tipo,
        fecha,
        Number(id_categoria),
        notas ? String(notas).trim() : null,
      ]
    );

    const [rows] = await pool.query(`${SELECT_TRANSACCION} WHERE t.id = ?`, [result.insertId]);

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/transacciones/:id
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de transacción inválido' });
    }

    const { descripcion, importe, tipo, fecha, id_categoria, notas = null } = req.body;

    const errors = validateTransaccion({ descripcion, importe, tipo, fecha, id_categoria, notas });
    if (errors.length > 0) return res.status(400).json({ errors });

    const catResult = await findCategoria(Number(id_categoria), tipo);
    if (catResult.error) return res.status(catResult.status).json({ error: catResult.error });

    const [result] = await pool.query(
      `UPDATE transacciones
       SET descripcion = ?, importe = ?, tipo = ?, fecha = ?, id_categoria = ?, notas = ?
       WHERE id = ?`,
      [
        descripcion.trim(),
        Number(importe),
        tipo,
        fecha,
        Number(id_categoria),
        notas ? String(notas).trim() : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    const [rows] = await pool.query(`${SELECT_TRANSACCION} WHERE t.id = ?`, [id]);

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/transacciones/:id
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de transacción inválido' });
    }

    const [result] = await pool.query('DELETE FROM transacciones WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    res.json({ message: 'Transacción eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getResumen, getOne, create, update, remove };
