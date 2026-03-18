require('dotenv').config();

const express             = require('express');
const cors                = require('cors');
const { testConnection }  = require('./config/db');
const errorHandler        = require('./middleware/errorHandler');
const transaccionesRouter = require('./routes/transacciones');
const categoriasRouter    = require('./routes/categorias');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin:         process.env.NODE_ENV === 'production'
                    ? process.env.FRONTEND_URL
                    : '*',
  methods:        ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '10kb' }));

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/transacciones', transaccionesRouter);
app.use('/api/categorias',    categoriasRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Manejador global de errores (debe ser el último middleware) ─
app.use(errorHandler);

// ── Arranque ───────────────────────────────────────────────────
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
    console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
