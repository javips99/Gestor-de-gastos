# 💰 Gestor de Gastos

Aplicación full-stack para gestionar finanzas personales. Permite registrar ingresos y gastos por categorías, visualizar la evolución mensual con gráficos interactivos y filtrar el historial de transacciones.

---

## ✨ Funcionalidades

- **Dashboard** — KPIs de ingresos, gastos y balance. Gráfico de barras mensual y gráficos de dona por categoría. Top 6 categorías de gasto y últimas transacciones.
- **Transacciones** — Listado paginado con filtros por fecha, tipo y categoría. Crear, editar y eliminar con confirmación.
- **Categorías** — Gestión completa de categorías con icono, color y tipo (ingreso/gasto).
- **API REST** — Backend con Express 5 y MySQL. Endpoints documentados con validación y manejo de errores centralizado.
- **Diseño responsive** — Sidebar en desktop, bottom navigation en móvil.

---

## 🛠️ Stack tecnológico

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Backend | Node.js + Express 5 | Ligero, async nativo, ecosistema amplio |
| Base de datos | MySQL 2 | Relacional, soporte de JOINs para consultas complejas |
| Frontend | HTML + CSS + JavaScript ES6 (módulos) | Sin frameworks, código limpio y portable |
| Gráficos | Chart.js 4 | Librería madura, fácil de usar, responsive |
| Estado | Store propio (pub/sub) | Sin dependencias externas, patrón simple |

---

## 📁 Estructura del proyecto

```
gestor-gastos/
├── backend/
│   ├── app.js                        # Servidor Express, rutas y middlewares
│   ├── package.json
│   ├── .env.example                  # Plantilla de variables de entorno
│   ├── config/
│   │   └── db.js                     # Conexión MySQL con pool
│   ├── routes/
│   │   ├── transacciones.js          # GET/POST/PUT/DELETE /api/transacciones
│   │   └── categorias.js             # GET/POST/PUT/DELETE /api/categorias
│   ├── controllers/
│   │   ├── transaccionController.js  # Lógica CRUD + resumen estadístico
│   │   └── categoriaController.js   # Lógica CRUD categorías
│   ├── middleware/
│   │   └── errorHandler.js           # Manejador global de errores
│   └── database/
│       └── schema.sql                # Esquema de tablas + 15 categorías de ejemplo
└── frontend/
    ├── index.html                    # SPA: 3 vistas + 3 modales
    ├── css/
    │   ├── main.css                  # Variables CSS, reset, layout mobile-first
    │   ├── components.css            # KPIs, tabla, botones, modales, formularios
    │   └── charts.css                # Wrappers responsive para Chart.js
    └── js/
        ├── app.js                    # Orquestador principal
        ├── api.js                    # Cliente HTTP (fetch) para la API REST
        ├── store.js                  # Estado centralizado con patrón pub/sub
        ├── ui.js                     # Renderizado del DOM
        ├── charts.js                 # Gráficos con Chart.js
        └── filters.js                # Lógica de filtros y fechas
```

---

## ⚙️ Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [MySQL](https://www.mysql.com/) 8.0 o superior

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/javips99/Gestor-de-gastos.git
cd Gestor-de-gastos
```

### 2. Configurar la base de datos

```bash
# Entra en MySQL y ejecuta el schema
mysql -u root -p < backend/database/schema.sql
```

Esto crea la base de datos `gestor_gastos` con las tablas y 15 categorías preconfiguradas.

### 3. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=gestor_gastos
```

### 4. Instalar dependencias e iniciar el backend

```bash
cd backend
npm install
npm run dev      # desarrollo (nodemon)
# ó
npm start        # producción
```

El servidor arranca en `http://localhost:3000`.

### 5. Abrir el frontend

Abre `frontend/index.html` directamente en el navegador, o usa Live Server en VS Code.

> El frontend carga módulos ES6, por lo que necesita ser servido desde un servidor HTTP (no `file://`). Con Live Server funciona directamente.

---

## 🌐 API REST

Base URL: `http://localhost:3000/api`

### Categorías

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/categorias` | Listar todas (opcional: `?tipo=ingreso\|gasto`) |
| POST | `/categorias` | Crear categoría |
| PUT | `/categorias/:id` | Actualizar categoría |
| DELETE | `/categorias/:id` | Eliminar (falla si tiene transacciones) |

### Transacciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/transacciones` | Listar con filtros (`desde`, `hasta`, `tipo`, `categoria`, `limit`, `offset`) |
| GET | `/transacciones/resumen` | Estadísticas del período (totales, por categoría, evolución mensual) |
| GET | `/transacciones/:id` | Obtener una transacción |
| POST | `/transacciones` | Crear transacción |
| PUT | `/transacciones/:id` | Actualizar transacción |
| DELETE | `/transacciones/:id` | Eliminar transacción |

### Ejemplo de respuesta — `/api/transacciones/resumen`

```json
{
  "data": {
    "totales": {
      "ingresos": 5000.00,
      "gastos": 2500.50,
      "balance": 2499.50
    },
    "porCategoria": [
      { "nombre": "Supermercado", "icono": "🛒", "color": "#E91E63", "total": 850.00, "porcentaje": 34.00 }
    ],
    "evolucionMensual": [
      { "mes": "2026-01", "ingresos": 500.00, "gastos": 250.00 }
    ]
  }
}
```

---

## 🗃️ Modelo de datos

```
categorias
├── id           INT UNSIGNED PK
├── nombre       VARCHAR(50)
├── icono        VARCHAR(10)
├── color        VARCHAR(7)   -- hex #RRGGBB
├── tipo         ENUM('ingreso','gasto')
└── created_at   TIMESTAMP

transacciones
├── id           INT UNSIGNED PK
├── descripcion  VARCHAR(150)
├── importe      DECIMAL(10,2)
├── tipo         ENUM('ingreso','gasto')
├── fecha        DATE
├── id_categoria INT UNSIGNED FK → categorias.id
├── notas        TEXT NULL
├── created_at   TIMESTAMP
└── updated_at   TIMESTAMP
```

---

## 📦 Dependencias del backend

```bash
npm install
```

| Paquete | Versión | Uso |
|---------|---------|-----|
| express | ^5.2.1 | Framework HTTP |
| mysql2 | ^3.20.0 | Driver MySQL con soporte Promises |
| dotenv | ^17.3.1 | Variables de entorno |
| cors | ^2.8.6 | Permitir peticiones cross-origin |
| nodemon | ^3.1.14 | Hot-reload en desarrollo |

---

## 👨‍💻 Autor

**Javi** — Estudiante de DAW
[GitHub](https://github.com/javips99) · [Portfolio](https://javips99.github.io/Mi-porfolio/)
