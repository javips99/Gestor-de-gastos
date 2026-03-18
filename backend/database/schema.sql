-- =============================================================
-- Gestor de Gastos Personales — Schema v2.0 (PostgreSQL)
-- Ejecutar local:  psql -U postgres -d gestor_gastos -f backend/database/schema.sql
-- Ejecutar Render: psql $DATABASE_URL -f backend/database/schema.sql
-- =============================================================

-- -------------------------------------------------------------
-- Limpiar tablas si ya existen (orden por FK)
-- -------------------------------------------------------------
DROP TABLE IF EXISTS transacciones;
DROP TABLE IF EXISTS categorias;

-- -------------------------------------------------------------
-- TABLA: categorias
-- -------------------------------------------------------------
CREATE TABLE categorias (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(50)  NOT NULL,
  icono      VARCHAR(10)  NOT NULL,
  color      VARCHAR(7)   NOT NULL,
  tipo       VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_nombre_tipo UNIQUE (nombre, tipo)
);

-- -------------------------------------------------------------
-- TABLA: transacciones
-- -------------------------------------------------------------
CREATE TABLE transacciones (
  id           SERIAL PRIMARY KEY,
  descripcion  VARCHAR(150)   NOT NULL,
  importe      NUMERIC(10,2)  NOT NULL,
  tipo         VARCHAR(10)    NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
  fecha        DATE           NOT NULL,
  id_categoria INTEGER        NOT NULL REFERENCES categorias(id)
                              ON DELETE RESTRICT ON UPDATE CASCADE,
  notas        TEXT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_fecha_categoria ON transacciones (fecha, id_categoria);
CREATE INDEX idx_tipo             ON transacciones (tipo);
CREATE INDEX idx_fecha            ON transacciones (fecha);

-- Trigger para updated_at automático (equivalente a ON UPDATE en MySQL)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transacciones_updated_at
  BEFORE UPDATE ON transacciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- DATOS SEMILLA: Categorías por defecto
-- =============================================================
INSERT INTO categorias (nombre, icono, color, tipo) VALUES
  -- Ingresos
  ('Salario',        '💼', '#4CAF50', 'ingreso'),
  ('Freelance',      '💻', '#2196F3', 'ingreso'),
  ('Inversiones',    '📈', '#9C27B0', 'ingreso'),
  ('Otros ingresos', '💰', '#FF9800', 'ingreso'),
  -- Gastos
  ('Comida',         '🍔', '#F44336', 'gasto'),
  ('Supermercado',   '🛒', '#E91E63', 'gasto'),
  ('Transporte',     '🚗', '#FF5722', 'gasto'),
  ('Ocio',           '🎮', '#3F51B5', 'gasto'),
  ('Salud',          '🏥', '#00BCD4', 'gasto'),
  ('Educación',      '📚', '#8BC34A', 'gasto'),
  ('Ropa',           '👕', '#FF9800', 'gasto'),
  ('Hogar',          '🏠', '#795548', 'gasto'),
  ('Suscripciones',  '📱', '#607D8B', 'gasto'),
  ('Viajes',         '✈️',  '#009688', 'gasto'),
  ('Otros gastos',   '📦', '#9E9E9E', 'gasto');
