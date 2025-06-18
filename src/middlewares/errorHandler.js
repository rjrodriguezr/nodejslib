const logger = require('../../lib/logger'); // Ajusta la ruta si es necesario

/**
 * Middleware de manejo de errores global.
 * Este middleware debe ser el último en la cadena de middlewares de Express.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500; // Priorizar status del error, sino 500
    const environment = process.env.NODE_ENV || 'prd';

    // Loguear el error, incluyendo el stack trace para depuración    
    if (environment === 'development' || environment === 'dev') {
        logger.error('[ErrorHandler] Stack Trace:', err.stack);
    } else {
        logger.error(`[ErrorHandler] Status: ${statusCode}, Message: ${err.message}, Path: ${req.originalUrl}, Method: ${req.method}`);
    }


    // No enviar el stack trace al cliente en producción por seguridad
    const responseError = {
        message: err.message || 'Ocurrió un error inesperado en el servidor.',
        // Incluir detalles adicionales solo en desarrollo
        ...(environment === 'development' || environment === 'dev' ? { stack: err.stack, details: err.details || err.data } : {}),
        ...(err.errorCode ? { errorCode: err.errorCode } : {}), // Si tienes códigos de error personalizados
    };

    // Si el error tiene una propiedad 'details' (por ejemplo, de Joi o validaciones personalizadas),
    // y no estamos en desarrollo, podríamos querer enviar un mensaje más genérico
    // o solo ciertos detalles seguros.
    if (err.details && (environment !== 'development' && environment !== 'dev')) {
        // Para producción, si err.details existe (ej. errores de validación de Joi),
        // podrías querer enviar esos detalles si son seguros y útiles para el cliente.
        // Si no, el mensaje genérico de arriba es suficiente.
        // Por ahora, si no estamos en desarrollo, el stack y err.details se omiten arriba.
        // Si `err.details` es un array de objetos de validación (como el que creamos en los validadores manuales):
        if (Array.isArray(err.details) && err.message === 'ValidationFailed') { // Asumiendo que usas este mensaje
            responseError.message = 'Error de validación en la solicitud.';
            responseError.validationErrors = err.details;
            // No exponer el stack en producción
            delete responseError.stack;
        }
    }


    // Asegurarse de que los headers no se hayan enviado ya
    if (res.headersSent) {
        logger.warn('[ErrorHandler] Los headers ya fueron enviados, delegando al manejador de errores por defecto de Express.');
        return next(err); // Delegar al manejador de errores por defecto de Express
    }

    res.status(statusCode).json(responseError);
};

module.exports = errorHandler;
