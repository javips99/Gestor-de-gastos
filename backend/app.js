require('dotenv').config();

const express             = require('express');
const cors                = require('cors');
const path                = require('path');
const { testConnection }  = require('./config/db');
const errorHandler        = require('./middleware/errorHandler');
const transaccionesRouter = require('./routes/transacciones');
const categoriasRouter    = require('./routes/categorias');

const app  = express();
const PORT = process.env.PORT || 3000;

// En Render el root directory es "backend", por lo que el frontend está en "../frontend"
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin:         process.env.NODE_ENV === 'production'
                    ? process.env.FRONTEND_URL
                    : '*',
  methods:        ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '10kb' }));

// ── Archivos estáticos del frontend ───────────────────────────
app.use(express.static(FRONTEND_DIR));

// ── Rutas API ──────────────────────────────────────────────────
app.use('/api/transacciones', transaccionesRouter);
app.use('/api/categorias',    categoriasRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Fallback: cualquier ruta no-API sirve el index.html (SPA) ─
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── 404 solo para rutas /api no encontradas ────────────────────
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
