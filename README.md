# 💰 Gestor de Gastos

Aplicación full-stack para controlar finanzas personales. Registra ingresos y gastos por categorías, visualiza la evolución mensual con gráficos y filtra el historial. Resuelve la falta de una herramienta simple, local y sin suscripción para llevar las cuentas.

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js | 18.0.0 |
| npm | 9.0.0 |
| MySQL | 8.0 |

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/javips99/Gestor-de-gastos.git
cd Gestor-de-gastos
```

### 2. Crear la base de datos

```bash
mysql -u root -p < backend/database/schema.sql
```

Crea la base de datos `gestor_gastos` con las dos tablas y 15 categorías de ejemplo precargadas.

### 3. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita `.env` con tus credenciales (ver tabla de variables más abajo).

### 4. Instalar dependencias e iniciar el servidor

```bash
npm install
npm run dev
```

El backend arranca en `http://localhost:3000`.

### 5. Abrir el frontend

Con Live Server en VS Code: clic derecho en `frontend/index.html` → **Open with Live Server**.

> El frontend usa módulos ES6 (`type="module"`), que el navegador no carga desde `file://`. Necesita un servidor HTTP local (Live Server, `npx serve`, etc.).

---

## Ejemplo de uso rápido

```bash
# Comprobar que la API responde
curl http://localhost:3000/api/health
# → { "status": "ok" }

# Listar categorías
curl http://localhost:3000/api/categorias

# Crear una transacción
curl -X POST http://localhost:3000/api/transacciones \
  -H "Content-Type: application/json" \
  -d '{"descripcion":"Compra supermercado","importe":45.50,"tipo":"gasto","fecha":"2026-03-18","id_categoria":2}'

# Ver resumen del año actual
curl "http://localhost:3000/api/transacciones/resumen?desde=2026-01-01&hasta=2026-12-31"
```

---

## Estructura del proyecto

```
gestor-gastos/
├── backend/
│   ├── app.js                        # Servidor Express, CORS, rutas, health check
│   ├── package.json
│   ├── .env.example                  # Plantilla de variables de entorno
│   ├── config/
│   │   └── db.js                     # Pool de conexiones MySQL
│   ├── routes/
│   │   ├── transacciones.js          # Rutas /api/transacciones
│   │   └── categorias.js             # Rutas /api/categorias
│   ├── controllers/
│   │   ├── transaccionController.js  # CRUD + resumen estadístico
│   │   └── categoriaController.js    # CRUD categorías
│   ├── middleware/
│   │   └── errorHandler.js           # Manejador global de errores
│   └── database/
│       └── schema.sql                # Tablas + 15 categorías precargadas
└── frontend/
    ├── index.html                    # SPA: 3 vistas + 3 modales
    ├── css/
    │   ├── main.css                  # Variables CSS, reset, layout mobile-first
    │   ├── components.css            # KPIs, tabla, botones, modales, formularios
    │   └── charts.css                # Wrappers responsive para Chart.js
    └── js/
        ├── app.js                    # Orquestador: conecta API, store y UI
        ├── api.js                    # Cliente fetch para la API REST
        ├── store.js                  # Estado centralizado (patrón pub/sub)
        ├── ui.js                     # Renderizado del DOM y utilidades
        ├── charts.js                 # Gráficos con Chart.js 4
        └── filters.js                # Lógica de filtros y rangos de fecha
```

---

## Variables de entorno

Archivo: `backend/.env`

| Variable | Descripción | Ejemplo | Obligatoria |
|----------|-------------|---------|-------------|
| `PORT` | Puerto del servidor | `3000` | No (default: 3000) |
| `NODE_ENV` | Entorno de ejecución | `development` | No (default: development) |
| `DB_HOST` | Host de MySQL | `localhost` | Sí |
| `DB_PORT` | Puerto de MySQL | `3306` | No (default: 3306) |
| `DB_USER` | Usuario de MySQL | `root` | Sí |
| `DB_PASSWORD` | Contraseña de MySQL | `mi_password` | Sí |
| `DB_NAME` | Nombre de la base de datos | `gestor_gastos` | Sí |
| `FRONTEND_URL` | URL del frontend (solo producción) | `https://mi-dominio.com` | No |

---

## API REST

Base URL: `http://localhost:3000/api`

---

### GET `/api/health`

Comprueba que el servidor está activo.

**Respuesta exitosa `200`:**
```json
{ "status": "ok", "timestamp": "2026-03-18T10:00:00.000Z" }
```

---

### GET `/api/categorias`

Lista todas las categorías. Filtro opcional por tipo.

**Parámetros query:**

| Nombre | Tipo | Descripción | Obligatorio |
|--------|------|-------------|-------------|
| `tipo` | `string` | `ingreso` o `gasto` | No |

**Respuesta exitosa `200`:**
```json
{
  "data": [
    { "id": 1, "nombre": "Salario", "icono": "💼", "color": "#4CAF50", "tipo": "ingreso", "created_at": "2026-01-01T00:00:00.000Z" }
  ]
}
```

---

### POST `/api/categorias`

Crea una nueva categoría.

**Body:**
```json
{
  "nombre": "Supermercado",
  "icono": "🛒",
  "color": "#E91E63",
  "tipo": "gasto"
}
```

**Respuesta exitosa `201`:**
```json
{
  "data": { "id": 12, "nombre": "Supermercado", "icono": "🛒", "color": "#E91E63", "tipo": "gasto" }
}
```

**Errores:**
- `400` — Campos faltantes o inválidos (nombre vacío, color no hex, tipo incorrecto)
- `409` — Ya existe una categoría con ese nombre y tipo

---

### PUT `/api/categorias/:id`

Actualiza una categoría existente.

**Parámetros ruta:**

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `id` | `integer` | ID de la categoría |

**Body:** igual que POST.

**Respuesta exitosa `200`:**
```json
{
  "data": { "id": 12, "nombre": "Super", "icono": "🛒", "color": "#E91E63", "tipo": "gasto" }
}
```

**Errores:**
- `400` — Datos inválidos
- `404` — Categoría no encontrada
- `409` — Nombre duplicado

---

### DELETE `/api/categorias/:id`

Elimina una categoría. Falla si tiene transacciones asociadas.

**Respuesta exitosa `200`:**
```json
{ "message": "Categoría eliminada correctamente" }
```

**Errores:**
- `404` — Categoría no encontrada
- `409` — La categoría tiene transacciones asociadas y no se puede eliminar

---

### GET `/api/transacciones`

Lista transacciones con filtros y paginación.

**Parámetros query:**

| Nombre | Tipo | Descripción | Obligatorio |
|--------|------|-------------|-------------|
| `desde` | `string` | Fecha inicio `YYYY-MM-DD` | No |
| `hasta` | `string` | Fecha fin `YYYY-MM-DD` | No |
| `tipo` | `string` | `ingreso` o `gasto` | No |
| `categoria` | `integer` | ID de categoría | No |
| `limit` | `integer` | Resultados por página (máx. 200, default 50) | No |
| `offset` | `integer` | Desplazamiento para paginación (default 0) | No |

**Respuesta exitosa `200`:**
```json
{
  "data": [
    {
      "id": 1,
      "descripcion": "Compra supermercado",
      "importe": 45.50,
      "tipo": "gasto",
      "fecha": "2026-03-18",
      "notas": null,
      "categoria_id": 2,
      "categoria_nombre": "Supermercado",
      "categoria_icono": "🛒",
      "categoria_color": "#E91E63"
    }
  ],
  "meta": { "total": 120, "limit": 50, "offset": 0, "hasMore": true }
}
```

---

### GET `/api/transacciones/resumen`

Devuelve estadísticas agregadas del período indicado.

**Parámetros query:**

| Nombre | Tipo | Descripción | Obligatorio |
|--------|------|-------------|-------------|
| `desde` | `string` | Fecha inicio `YYYY-MM-DD` | No (default: 1 enero del año actual) |
| `hasta` | `string` | Fecha fin `YYYY-MM-DD` | No (default: 31 dic del año actual) |

**Respuesta exitosa `200`:**
```json
{
  "data": {
    "periodo": { "desde": "2026-01-01", "hasta": "2026-12-31" },
    "totales": { "ingresos": 5000.00, "gastos": 2500.50, "balance": 2499.50 },
    "porCategoria": [
      { "id": 2, "nombre": "Supermercado", "icono": "🛒", "color": "#E91E63", "total": 850.00, "porcentaje": 34.00 }
    ],
    "evolucionMensual": [
      { "mes": "2026-01", "ingresos": 500.00, "gastos": 250.00 }
    ]
  }
}
```

---

### POST `/api/transacciones`

Crea una nueva transacción.

**Body:**
```json
{
  "descripcion": "Compra supermercado",
  "importe": 45.50,
  "tipo": "gasto",
  "fecha": "2026-03-18",
  "id_categoria": 2,
  "notas": "Compra semanal"
}
```

**Respuesta exitosa `201`:**
```json
{
  "data": { "id": 55, "descripcion": "Compra supermercado", "importe": 45.50, "tipo": "gasto", "fecha": "2026-03-18" }
}
```

**Errores:**
- `400` — Campos obligatorios faltantes, importe <= 0 o fecha inválida
- `404` — La categoría indicada no existe

---

### PUT `/api/transacciones/:id`

Actualiza una transacción existente. Body igual que POST.

**Errores:**
- `400` — Datos inválidos
- `404` — Transacción no encontrada

---

### DELETE `/api/transacciones/:id`

Elimina una transacción.

**Respuesta exitosa `200`:**
```json
{ "message": "Transacción eliminada correctamente" }
```

**Errores:**
- `404` — Transacción no encontrada

---

## Tests

El proyecto no incluye tests automatizados. Verificación manual:

```bash
# Health check
curl http://localhost:3000/api/health

# Crear categoría y verificar que aparece en el listado
curl -X POST http://localhost:3000/api/categorias \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","icono":"🧪","color":"#FF0000","tipo":"gasto"}'

curl http://localhost:3000/api/categorias
```

---

## Cómo contribuir

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feat/nombre-funcionalidad`
3. Commitea los cambios: `git commit -m "feat: descripción"`
4. Haz push: `git push origin feat/nombre-funcionalidad`
5. Abre un Pull Request

---

## Autor

**Javi** — Estudiante de DAW
[GitHub](https://github.com/javips99) · [Portfolio](https://javaps99.github.io/Mi-porfolio/)
