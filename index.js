const axiosClient = require('./lib/axiosClient');
const catalog = require('./lib/catalog');
const constants = require('./lib/constants');
const {BaseController} = require('./src/controllers');
const crypt = require('./lib/crypt');
const logger = require('./lib/logger');
const middlewares = require('./src/middlewares');
const mongoDBService = require('./lib/mongoDBService');
const redisService = require('./lib/redisService');
const serviceRegistry = require('./lib/serviceRegistry');
const validators = require('./src/validators');

module.exports = {
  axiosClient,
  catalog,
  constants,
  BaseController,
  crypt,
  logger,
  middlewares,
  mongoDBService,
  redisService,
  serviceRegistry,
  validators,
};
