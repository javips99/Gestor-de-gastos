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
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

// ── Diagnóstico de rutas al arrancar ──────────────────────────
const fs = require('fs');
console.log(`📁 __dirname:     ${__dirname}`);
console.log(`📁 FRONTEND_DIR:  ${FRONTEND_DIR}`);
console.log(`📁 frontend existe: ${fs.existsSync(FRONTEND_DIR)}`);
console.log(`📁 index.html existe: ${fs.existsSync(path.join(FRONTEND_DIR, 'index.html'))}`);
console.log(`🔑 DATABASE_URL:  ${process.env.DATABASE_URL ? 'definida ✅' : 'NO definida ❌'}`);

// ── Middleware ─────────────────────────────────────────────────
// En producción con frontend integrado, CORS no es necesario (mismo origen)
app.use(cors({
  origin: '*',
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

// ── Fallback SPA: rutas no-API devuelven index.html ───────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next(err);
  });
});

// ── 404 para rutas /api no encontradas ────────────────────────
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
