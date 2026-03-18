const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           'local',
  charset:            'utf8mb4',
});

async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
  } catch (err) {
    console.error('❌ Error al conectar con MySQL:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { pool, testConnection };
