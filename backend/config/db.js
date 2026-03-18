const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // requerido en Render/Heroku
      }
    : {
        host:                   process.env.DB_HOST,
        port:                   Number(process.env.DB_PORT) || 5432,
        user:                   process.env.DB_USER,
        password:               process.env.DB_PASSWORD,
        database:               process.env.DB_NAME,
        max:                    10,
        idleTimeoutMillis:      30000,
        connectionTimeoutMillis: 2000,
      }
);

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
  } catch (err) {
    console.error('❌ Error al conectar con PostgreSQL:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
}

module.exports = { pool, testConnection };
