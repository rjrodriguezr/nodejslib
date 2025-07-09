const logger = require('../../lib/logger');
const { headers, WEBHOOK_SOURCE_TYPE } = require('../../lib/constants');
/**
 * @module authClient
 * @description Middleware de Express para autenticar y autorizar peticiones internas entre servicios.
 * Valida un token secreto y extrae información del usuario desde las cabeceras HTTP
 * para inyectarla en el objeto `req`.
 */

/**
 * Middleware para validar si una petición proviene de un servicio interno autorizado.
 *
 * 1.  Verifica la presencia y validez de una cabecera de autenticación interna (`X-Internal-Request`).
 * 2.  Si la petición no es de un Webhook, extrae y valida cabeceras con datos de usuario
 * (`X-User-Company`, `X-User-Name`, `X-User-Roles`).
 * 3.  Parsea los datos del usuario (compañía y roles) que vienen en formato JSON.
 * 4.  Inyecta un objeto `token` en el objeto `req` con la información del usuario para
 * su uso en los siguientes middlewares o controladores.
 *
 * @async
 * @function authClient
 * @param {import('express').Request} req - El objeto de la petición de Express. Se espera que contenga cabeceras personalizadas.
 * @param {import('express').Response} res - El objeto de la respuesta de Express.
 * @param {import('express').NextFunction} next - La función para pasar al siguiente middleware.
 * @param {string} token - El token de autenticación secreto que se espera en la cabecera `X-Internal-Request`.
 * @returns {Promise<void>} No devuelve un valor directamente, sino que finaliza la petición con un error o la pasa al siguiente middleware.
 */
const authClient = async (req, res, next, token) => {
    logger.debug("[authClient] INICIO de la validacion del request");
    const internalHeader = req.header(headers.INTERNAL_REQUEST);
    logger.silly({ msg: "[authClient]", token, headers_INTERNAL_REQUEST: headers.INTERNAL_REQUEST, internalHeader });
    // token === this.service.token está garantizado por el método start()
    if (internalHeader !== token) {
        logger.warn(`[authClient] Intento de acceso no autorizado. Header '${headers.INTERNAL_REQUEST}' no coincide con el token esperado.`);
        return res.status(401).json({ error: 'No se ha recibido el header de autenticación o es incorrecto' });
    }
    // Extraer datos de usuario desde headers personalizados    
    const sourceType = req.header(headers.SOURCE_TYPE);
    if (sourceType && sourceType === WEBHOOK_SOURCE_TYPE) {
        logger.verbose(`[authClient] sourceType: ${sourceType}, ignorando la validacion de seguridad de llamados internos `);
    } else {
        logger.verbose("[authClient] No sourceType presente por lo que se procesan cabeceras de llamados internos");
        const companyRaw = req.header(headers.USER_COMPANY);
        const username = req.header(headers.USER_NAME);
        const rolesRaw = req.header(headers.USER_ROLES);

        if (!(companyRaw || username || rolesRaw)) {
            return res.status(401).json({ error: 'Faltan Headers de datos del usuario' });
        }

        let roles = [], company;
        try {
            if (companyRaw) company = JSON.parse(companyRaw);
            if (rolesRaw) roles = JSON.parse(rolesRaw);
        } catch (e) {
            logger.error({ msg: 'Error al parsear el header X-User-Company o X-User-Roles como JSON', e });
            return res.status(401).json({ error: 'Error al parsear el header X-User-Company o X-User-Roles como JSON' });
        }

        // Agregar objeto `token` al request
        req.token = {
            company,
            username,
            roles,
        };
        logger.verbose(req.token);
    }

    next();
}

module.exports = authClient;