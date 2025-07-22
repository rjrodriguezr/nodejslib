const logger = require('../../lib/logger');
const redisService = require('../../lib/redisService');
const constants = require('../../lib/constants');
const { redisKeyPrefix, metaChannels } = constants;

/**
 * Helper para obtener un valor anidado de forma segura.
 * Similar a lodash.get, pero más simple.
 * @param {object} obj - El objeto del cual extraer el valor.
 * @param {string[]} pathArray - Un array de strings representando la ruta al valor.
 * @returns {*} El valor encontrado o undefined.
 */
const getDeepValue = (obj, pathArray) => {
  return pathArray.reduce((currentObject, key) => {
    return currentObject && typeof currentObject === 'object' && currentObject[key] !== undefined ? currentObject[key] : undefined;
  }, obj);
};

/**
 * Guarda la configuración principal del sistema de una empresa en Redis.
 * @async
 * @param {string} companyId - El ID de la empresa.
 * @param {object} systemSettings - El objeto system_settings de la empresa.
 * @param {string} companyName - El nombre de la empresa (para logging).
 * @param {object} dependencies - Objeto con dependencias.
 * @param {object} dependencies.redisService - El servicio de Redis.
 * @param {object} dependencies.logger - El servicio de logging.
 */
const saveMainCompanySettings = async (companyId, systemSettings, companyName) => {
  const redisKey = `${redisKeyPrefix.COMPANY_SETTINGS}:${companyId}`;
  await redisService.setData(redisKey, systemSettings);
  logger.verbose(`Configuración de la empresa ${companyName} (${companyId}) guardada en Redis con la clave: ${redisKey}`);
};

/**
 * Procesa y guarda un índice secundario en Redis para un token/ID específico de Meta.
 * El índice permite buscar companyId por el token/ID de Meta.
 * @async
 * @param {string} companyId - El ID de la empresa.
 * @param {object} systemSettings - El objeto system_settings de la empresa (de donde se extraerá el token).
 * @param {object} indexerConfig - Configuración para el indexador específico.
 * @param {string} indexerConfig.platformName - Nombre de la plataforma (ej. "WhatsApp").
 * @param {string[]} indexerConfig.tokenPath - Ruta al token dentro de systemSettings (ej. ['meta_integrations', 'whatsapp', 'webhookVerifyToken']).
 * @param {string} indexerConfig.redisKeyPrefix - Prefijo para la clave Redis del índice (ej. "idx:whatsapp_token").
 */
const processAndSaveSecondaryIndex = async (companyId, systemSettings, indexerConfig) => {
  const { platformName, tokenPath, redisKeyPrefix } = indexerConfig;

  // Extraer el valor del token usando la ruta especificada.
  const tokenValue = getDeepValue(systemSettings, tokenPath);

  if (tokenValue) {
    // La clave del índice secundario se basa en el valor del token.
    const secondaryIndexRedisKey = `${redisKeyPrefix}:${tokenValue}`;
    // El valor almacenado es el companyId, permitiendo la búsqueda inversa.
    await redisService.setData(secondaryIndexRedisKey, companyId); // Guardar companyId como string.
    logger.verbose(`Índice secundario para ${platformName} (Token: ${tokenValue}) creado: ${secondaryIndexRedisKey} -> ${companyId}`);
  } else {
    logger.verbose(`No se encontró token para ${platformName} en la configuración de la empresa ${companyId}. No se creó índice secundario.`);
  }
};

/**
 * Configuraciones por defecto para los indexadores de Meta.
 * Cada objeto define cómo extraer un token específico y cómo construir su índice secundario en Redis.
 */
const defaultMetaIndexers = [
  {
    platformName: metaChannels.WHATSAPP,
    // Ruta dentro del objeto system_settings para encontrar el token.
    tokenPath: ['meta_integrations', 'whatsapp', 'phoneNumberId'],
    // Prefijo para la clave Redis del índice secundario. La clave completa será: prefijo:VALOR_DEL_TOKEN
    redisKeyPrefix: redisKeyPrefix.WAP_PHONE_NUMBER_ID,
  },
  {
    platformName: metaChannels.MESSENGER,
    tokenPath: ['meta_integrations', 'messenger', 'pageId'],
    redisKeyPrefix: redisKeyPrefix.MSN_PAGE_ID,
  },
  {
    platformName: metaChannels.INSTAGRAM,
    tokenPath: ['meta_integrations', 'instagram', 'instagramBusinessAccountId'],
    redisKeyPrefix: redisKeyPrefix.IGM_BUSINESS_ACCOUNT_ID,
  }
];

/**
 * Orquesta el guardado de la configuración de la empresa y sus índices secundarios de Meta en Redis.
 *
 * @async
 * @param {object} company - El objeto de la empresa. Debe contener _id, name (opcional), y system_settings.
 * Permite sobreescribir o extender los indexadores por defecto.
 * @throws {Error} Si `company` es inválido, o si `redisService` o `logger` no se proporcionan.
 */
const saveCompanySettingInRedis = async (company) => {

  if (!company || !company._id || !company.system_settings) {
    logger.error('Objeto `company` inválido o faltan `_id` o `system_settings`.', { companyDetails: { id: company?._id, hasSettings: !!company?.system_settings } });
    throw new Error('Objeto `company` inválido o faltan `_id` o `system_settings`.');
  }

  const companyId = company._id;
  const systemSettings = company.system_settings;
  // Usar company.name para logging si está disponible, sino companyId.
  const companyName = company.name || companyId.toString();

  try {
    // 1. Guardar la configuración principal del sistema de la empresa.
    await saveMainCompanySettings(companyId, systemSettings, companyName);

    // 2. Procesar y guardar todos los índices secundarios configurados.
    // Este bucle itera sobre las configuraciones de los indexadores (abstracciones).
    const indexers = defaultMetaIndexers;
    for (const indexerConfig of indexers) {
      try {
        // Cada indexador se procesa individualmente.
        await processAndSaveSecondaryIndex(companyId, systemSettings, indexerConfig);
      } catch (error) {
        // Es importante decidir si un error en un índice secundario debe detener todo el proceso.
        // Aquí, se loguea el error y se continúa con los demás, para máxima resiliencia.
        logger.error(`Error al procesar/guardar índice secundario para ${indexerConfig.platformName} (Empresa: ${companyId}): ${error.message}`, {
          companyId,
          platform: indexerConfig.platformName,
          // No loguear 'error' directamente si puede contener demasiada info o ser un objeto complejo no serializable.
          errorMessage: error.message,
          stack: error.stack // Opcional, para depuración.
        });
        // Si se quisiera detener ante el primer error: throw error;
      }
    }

    logger.verbose(`Todos los datos relevantes de la empresa ${companyName} (${companyId}) procesados para Redis.`);

  } catch (error) {
    // Error al guardar la configuración principal u otro error no capturado en el bucle de índices.
    logger.error(`Error general al guardar datos de la empresa ${companyName} (${companyId}) en Redis: ${error.message}`, {
      companyId,
      errorMessage: error.message,
      stack: error.stack // Opcional
    });
    // Relanzar el error para que el llamador pueda manejarlo.
    throw error;
  }
};

/**
 * Actualiza en Redis el índice secundario para un canal de comunicación específico de una empresa.
 * Por ejemplo, actualiza la referencia del 'phoneNumberId' de WhatsApp al ID de la empresa.
 * @param {object} company - El objeto completo de la compañía, debe contener _id y system_settings.
 * @param {string} channel - El canal a actualizar (ej. 'whatsapp', 'messenger'). Debe existir en metaChannels.
 */
const updateCompanyIndexForChannelInRedis = async (company, channel) => {

    // --- 1. Validar Entradas ---
    if (!company || !company._id || !company.system_settings) {
        logger.error('Objeto `company` inválido o faltan `_id` o `system_settings`.', {
            companyId: company?._id,
            hasSettings: !!company?.system_settings
        });
        throw new Error('Objeto `company` inválido.');
    }
    if (!channel) {
        logger.error('El parámetro `channel` es obligatorio.', { companyId: company._id });
        throw new Error('El parámetro `channel` es obligatorio.');
    }

    const companyId = company._id;
    // Usar company.name para logging si está disponible, sino companyId.
    const companyName = company.name || companyId.toString();

    try {
        // --- 2. Encontrar la Configuración del Indexador para el Canal Especificado ---
        // Se busca en la constante predefinida la configuración que corresponde al canal.
        const indexerConfig = defaultMetaIndexers.find(
            (indexer) => indexer.platformName === channel
        );

        // Si no se encuentra una configuración para el canal, es un error de lógica o un canal no soportado.
        if (!indexerConfig) {
            logger.warn(`No se encontró configuración de indexador para el canal '${channel}'.`, { companyId });
            // Se puede lanzar un error o simplemente terminar la ejecución, dependiendo del caso de uso.
            // Lanzar un error es más explícito sobre la falla.
            throw new Error(`Configuración de indexador no encontrada para el canal: ${channel}`);
        }

        logger.verbose(`Procesando índice secundario para el canal '${channel}' de la empresa ${companyName} (${companyId})`);

        // --- 3. Procesar y Guardar solo ese Índice Secundario ---
        // Se reutiliza la misma función modular que la versión original.
        await processAndSaveSecondaryIndex(companyId, company.system_settings, indexerConfig);
        
        logger.info(`Índice secundario para '${channel}' de la empresa ${companyName} (${companyId}) guardado exitosamente.`);

    } catch (error) {
        // --- 4. Manejo de Errores ---
        // Si falla cualquier paso (encontrar el indexador, guardarlo), se captura aquí.
        logger.error(`Error al actualizar el índice de Redis para el canal '${channel}' de la empresa ${companyName} (${companyId}): ${error.message}`, {
            companyId,
            channel,
            errorMessage: error.message,
            stack: error.stack // Opcional, útil para depuración.
        });

        // Relanzar el error para que el código que llamó a esta función se entere del fallo.
        throw error;
    }
};

module.exports = {
  saveCompanySettingInRedis,
  updateCompanyIndexForChannelInRedis,
};