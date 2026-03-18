function errorHandler(err, _req, res, _next) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err);
  }

  // Errores conocidos de MySQL2
  const mysqlErrors = {
    ER_DUP_ENTRY:           { status: 409, message: 'Ya existe un registro con esos datos' },
    ER_NO_REFERENCED_ROW_2: { status: 400, message: 'La categoría especificada no existe' },
    ER_ROW_IS_REFERENCED_2: { status: 409, message: 'No se puede eliminar: tiene transacciones asociadas' },
  };

  if (err.code && mysqlErrors[err.code]) {
    const { status, message } = mysqlErrors[err.code];
    return res.status(status).json({ error: message });
  }

  const statusCode = err.statusCode || 500;
  // En producción nunca exponer detalles de errores 500
  const message = (process.env.NODE_ENV === 'production' && statusCode === 500)
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
