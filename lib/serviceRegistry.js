const logger  = require('./logger');

let services = null;

const loadConfig = async (serviceName) => {
    logger.verbose("Cargando configuración de servicios...");

    try {
        const conn = require("./mongoDBService").connection;
        const configDoc = await conn.db.collection('system_parameters').findOne({ _id: 'service_configurations' });

        if (!configDoc || !configDoc.services || configDoc.services.length === 0) {
            logger.warn("No se encontró configuración de servicios o no hay servicios definidos.");
            services = null;
        } else {
            // Mapear cada servicio para agregarle la propiedad serviceUrl
            services = configDoc.services.map(service => {
                // Validar que las propiedades necesarias existan en el objeto service
                if (!service.host || !service.port) {
                    logger.warn(`Servicio '${service.serviceName || 'desconocido'}' no tiene 'host' o 'port'. No se generará serviceUrl.`);
                    return {
                        ...service,
                        serviceUrl: null // o undefined, o un string indicando el error
                    };
                }
                // se procesa el host para revisar si el despliegue se hizo dentro de un docker
                const serviceUrl = `http://${service.host}:${service.port}`;

                // Retornar un nuevo objeto con todas las propiedades originales del servicio
                // más la nueva propiedad serviceUrl
                return {
                    ...service,
                    serviceUrl: serviceUrl
                };
            });
            logger.info("Configuración de servicios cargada y URLs generadas exitosamente.");
        }

    } catch (error) {
        logger.error(`Error al cargar la configuración de servicios -> error:${error.message}`);
        services = null;
    }
    const service = services.find(obj => obj.serviceName === serviceName);
    return service;
};

module.exports = {
    loadConfig,
    servicesConfig: () => services // función para obtener el valor actual
};