/**
 * db.js — Adaptador dual PostgreSQL / MySQL
 *
 * - DATABASE_URL definida → PostgreSQL  (producción en Render)
 * - DATABASE_URL ausente  → MySQL       (desarrollo local)
 *
 * Expone { pool, testConnection } con la misma interfaz en ambos casos.
 * Los controladores usan sintaxis PostgreSQL ($1, RETURNING id, TO_CHAR…);
 * este módulo la traduce a MySQL cuando es necesario.
 */

let _pool;
let _dbType; // 'pg' | 'mysql'

if (process.env.DATABASE_URL) {
  // ── PostgreSQL (Render) ─────────────────────────────────────
  const { Pool } = require('pg');
  _dbType = 'pg';
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  // ── MySQL (local) ───────────────────────────────────────────
  const mysql = require('mysql2/promise');
  _dbType = 'mysql';
  _pool = mysql.createPool({
    host:               process.env.DB_HOST,
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:    10,
    timezone:           'local',
    charset:            'utf8mb4',
  });
}

// ── Traductor PostgreSQL → MySQL ────────────────────────────────
function translateToMySQL(sql) {
  return sql
    // Placeholders: $1, $2… → ?
    .replace(/\$\d+/g, '?')
    // TO_CHAR(col, 'YYYY-MM') → DATE_FORMAT(col, '%Y-%m')
    .replace(/TO_CHAR\(([^,]+),\s*'YYYY-MM'\)/gi, "DATE_FORMAT($1, '%Y-%m')")
    // DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
    //   → DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
    .replace(
      /DATE_TRUNC\(\s*'month'\s*,\s*CURRENT_DATE\s*-\s*INTERVAL\s*'11 months'\s*\)/gi,
      "DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')"
    )
    // CURRENT_DATE → CURDATE()
    .replace(/\bCURRENT_DATE\b/g, 'CURDATE()');
}

// ── Interfaz unificada de query ─────────────────────────────────
// Siempre devuelve { rows: Array, rowCount: number }
async function unifiedQuery(sql, params = []) {
  // PostgreSQL: sin traducción
  if (_dbType === 'pg') {
    const result = await _pool.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  // MySQL: traducir SQL
  const mysqlSQL = translateToMySQL(sql);

  // Detectar RETURNING id (INSERT … RETURNING id)
  const returningMatch = mysqlSQL.match(/RETURNING\s+(\w+)/i);
  if (returningMatch) {
    const cleanSQL = mysqlSQL.replace(/\s*RETURNING\s+\w+/i, '').trim();
    const [result] = await _pool.query(cleanSQL, params);
    const colName  = returningMatch[1]; // 'id'
    return { rows: [{ [colName]: result.insertId }], rowCount: result.affectedRows };
  }

  const [result] = await _pool.query(mysqlSQL, params);

  // SELECT → result es un array de filas
  if (Array.isArray(result)) {
    return { rows: result, rowCount: result.length };
  }
  // INSERT / UPDATE / DELETE sin RETURNING
  return { rows: [], rowCount: result.affectedRows };
}

// Objeto que expone la misma firma que pg.Pool
const pool = { query: unifiedQuery };

// ── Test de conexión ────────────────────────────────────────────
async function testConnection() {
  try {
    if (_dbType === 'pg') {
      const client = await _pool.connect();
      console.log('✅ Conexión a PostgreSQL establecida correctamente');
      client.release();
    } else {
      const conn = await _pool.getConnection();
      console.log('✅ Conexión a MySQL establecida correctamente');
      conn.release();
    }
  } catch (err) {
    console.error(`❌ Error al conectar con la base de datos (${_dbType}): ${err.message}`);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
