-- =============================================================
-- Gestor de Gastos Personales — Schema v1.0
-- Ejecutar: mysql -u root -p < database/schema.sql
-- =============================================================

CREATE DATABASE IF NOT EXISTS gestor_gastos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gestor_gastos;

-- -------------------------------------------------------------
-- TABLA: categorias
-- -------------------------------------------------------------
DROP TABLE IF EXISTS transacciones;
DROP TABLE IF EXISTS categorias;

CREATE TABLE categorias (
  id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(50)     NOT NULL,
  icono      VARCHAR(10)     NOT NULL,
  color      VARCHAR(7)      NOT NULL COMMENT 'Color hex: #RRGGBB',
  tipo       ENUM('ingreso','gasto') NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nombre_tipo (nombre, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- TABLA: transacciones
-- -------------------------------------------------------------
CREATE TABLE transacciones (
  id           INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  descripcion  VARCHAR(150)     NOT NULL,
  importe      DECIMAL(10,2)    NOT NULL COMMENT 'Siempre positivo. El tipo determina si es ingreso o gasto',
  tipo         ENUM('ingreso','gasto') NOT NULL,
  fecha        DATE             NOT NULL,
  id_categoria INT UNSIGNED     NOT NULL,
  notas        TEXT             NULL,
  created_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_transaccion_categoria
    FOREIGN KEY (id_categoria) REFERENCES categorias(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX idx_fecha_categoria (fecha, id_categoria),
  INDEX idx_tipo            (tipo),
  INDEX idx_fecha           (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
