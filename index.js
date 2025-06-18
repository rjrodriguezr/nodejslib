const axiosClient = require('./lib/axiosClient');
const catalog = require('./lib/catalog');
const constants = require('./lib/constants');
const { BaseController } = require('./src/controllers');
const crypt = require('./lib/crypt');
const logger = require('./lib/logger');
const { authClient, middlewareHandleError, modelAuditPlugin, responseHandleError } = require('./src/middlewares');
const mongoDBService = require('./lib/mongoDBService');
const redisService = require('./lib/redisService');
const serviceRegistry = require('./lib/serviceRegistry');
const { buildDeleteValidator, buildGetValidator, buildSaveValidator, buildUpdateValidator,
  fieldsValidator, validateDate, validateEmail, validateMongoId, validateNumber, validateText } = require('./src/validators');

module.exports = {
  axiosClient,
  catalog,
  constants,
  BaseController,
  crypt,
  logger,
  authClient, middlewareHandleError, modelAuditPlugin, responseHandleError,
  mongoDBService,
  redisService,
  serviceRegistry,
  buildDeleteValidator, buildGetValidator, buildSaveValidator, buildUpdateValidator,
  fieldsValidator, validateDate, validateEmail, validateMongoId, validateNumber, validateText,
};
