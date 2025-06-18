const axios = require('axios');
const { servicesConfig } = require('./serviceRegistry');
const logger = require('./logger');
const { headers, WEBHOOK_SOURCE_TYPE } = require('./constants');

const internalApiClient = axios.create({
    timeout: process.env.AXIOS_TIME_OUT || 5000,
    // baseURL no se establece aquí, ya que se determinará por servicio.
});

// Interceptor de solicitud
internalApiClient.interceptors.request.use(
    (axiosReqConfig) => {
        // La URL original pasada a axios (ej. '/users/profile') se usará como la ruta relativa.
        const originalRelativeUrl = axiosReqConfig.url;
        logger.debug(`[AxiosClient] Interceptando solicitud para ruta relativa: ${originalRelativeUrl}`);

        // 1. Obtener la lista de todas las configuraciones de servicios cacheadas
        const allServices = servicesConfig(); // Esta función debe devolver el array de servicios ya cargados

        if (!allServices || allServices.length === 0) {
            const errorMessage = '[AxiosClient] No hay configuraciones de servicios cargadas. No se puede determinar la baseURL ni agregar cabeceras específicas del servicio.';
            logger.warn(errorMessage);
            throw new Error(errorMessage); // Fallar la solicitud si no hay configs de servicios
        }

        // 2. Identificar el servicio de destino y construir baseURL
        const targetServiceName = axiosReqConfig.serviceName; // Nombre del servicio de destino
        let serviceConfig = null;

        if (targetServiceName) {
            serviceConfig = allServices.find(doc => doc.serviceName === targetServiceName);
        }

        if (!serviceConfig) {
            const errorMessage = `[AxiosClient] Configuración no encontrada para el servicio de destino: ${targetServiceName}. No se puede construir la baseURL.`;
            logger.warn(errorMessage);
            throw new Error(errorMessage); // Fallar si no se encuentra el servicio
        }

        // Construir la baseURL dinámicamente
        if (!serviceConfig.host || !serviceConfig.port) {
            const errorMessage = `[AxiosClient] El servicio '${targetServiceName}' no tiene 'host' o 'port' definidos en su configuración. No se puede construir la baseURL.`;
            logger.warn(errorMessage);
            throw new Error(errorMessage);
        }

        const serviceBaseUrl = `http://${serviceConfig.host}:${serviceConfig.port}`;
        axiosReqConfig.baseURL = serviceBaseUrl;
        // La URL de la solicitud ahora será baseURL + originalRelativeUrl
        logger.debug(`[AxiosClient] baseURL establecida para ${targetServiceName}: ${serviceBaseUrl}. URL completa: ${serviceBaseUrl}${originalRelativeUrl}`);


        // 3. Agregar cabecera headers.INTERNAL_REQUEST si el servicio tiene un token
        const internalHeaderName = headers.INTERNAL_REQUEST;
        if (serviceConfig.token) {
            axiosReqConfig.headers[internalHeaderName] = serviceConfig.token;
            logger.debug(`[AxiosClient] Agregada cabecera ${internalHeaderName} para el servicio: ${targetServiceName}`);
        } else {
            let errorMessage = `[AxiosClient] No se encontró token de configuración para el servicio: ${targetServiceName}. No se agregará ${internalHeaderName}.`
            logger.warn(errorMessage);
            throw new Error(errorMessage);
        }

        // 4. Agregar otras cabeceras comunes o basadas en el contexto
        axiosReqConfig.headers[headers.USER_AGENT] = 'Gateway-Proxy';
        axiosReqConfig.headers[headers.CONTENT_TYPE] = 'application/json';
        
        if (axiosReqConfig.sourceType && axiosReqConfig.sourceType === WEBHOOK_SOURCE_TYPE) {
            axiosReqConfig.headers[headers.SOURCE_TYPE] = WEBHOOK_SOURCE_TYPE;
        } else {
            const tokenContext = axiosReqConfig.tokenContext;
            if (tokenContext) {
                if (tokenContext.company) {
                    axiosReqConfig.headers[headers.USER_COMPANY] = JSON.stringify(tokenContext.company);
                }
                if (tokenContext.username) {
                    axiosReqConfig.headers[headers.USER_NAME] = tokenContext.username;
                }
                if (tokenContext.roles) {
                    axiosReqConfig.headers[headers.USER_ROLES] = JSON.stringify(tokenContext.roles);
                }
                logger.debug('[AxiosClient] Agregadas cabeceras de contexto de usuario/compañía.');
            } else {
                logger.warn('[AxiosClient] No se proporcionó tokenContext para agregar cabeceras de usuario/compañía.');
            }            
        }
        logger.silly(axiosReqConfig);
        logger.debug(`[AxiosClient] Cabeceras finales para ${targetServiceName || 'destino desconocido'}: ${JSON.stringify(axiosReqConfig.headers)}`);
        return axiosReqConfig;
    },
    (error) => {
        logger.error(`[AxiosClient] Error en el interceptor de solicitud -> error:${error.message}`);
        return Promise.reject(error);
    }
);

// Interceptor de respuesta (ejemplo, sin cambios respecto al anterior)
internalApiClient.interceptors.response.use(
    (response) => {
        logger.debug(`[AxiosClient] Respuesta de ${response.config.url} con estado ${response.status}`);
        return response;
    },
    (error) => {
        const url = error.config?.url;
        const status = error.response?.status;
        const data = error.response?.data;
        logger.error(`[AxiosClient] Error en respuesta de ${url || 'URL desconocida'}. Estado: ${status || 'N/A'}. Datos: ${JSON.stringify(data || error.message)}`);
        return Promise.reject(error);
    }
);

module.exports = internalApiClient;