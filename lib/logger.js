const { createLogger, format, transports } = require('winston');
// 'path' es necesario para obtener el nombre del archivo
const path = require('path'); 

const myFormat = format.printf(log => {
  // ✅ 1. Revisa si el logger tiene 'moduleName' (lo agregaremos con logger.child())
  const moduleName = log.moduleName ? `[${log.moduleName}]` : '';

  let formato;
  if (log.stack) {
    // Tu lógica original para errores se mantiene, pero le agregamos el nombre del módulo
    let pathFromStack = log.stack.split('\n')[1].slice(7);
    let buff = Buffer.from(pathFromStack);
    // NOTA: 'lastIndexOf' con '\\' solo funciona en Windows. path.sep es más seguro.
    let fileAndLineNumber = pathFromStack.slice(buff.lastIndexOf(path.sep) + 1); 
    let msg = `(${fileAndLineNumber} ${log.message}`;
    // ✅ 2. Se agrega 'moduleName' al formato final
    formato = `[${log.label}]${moduleName} ${log.level} [${log.timestamp}]: ${msg}`;
  } else {
    // ✅ 3. Se agrega 'moduleName' también a los logs normales
    formato = `[${log.label}]${moduleName} ${log.level} [${log.timestamp}]: ${log.message}`;
  }
  return formato;
});

let apiLabel = process.env.API_NAME || '';
let apiName = apiLabel.length > 0 ? `thothify-api-${apiLabel}` : 'thothify-api';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.errors({ stack: true }),
    // OJO: format.json() y myFormat (printf) son mutuamente excluyentes para la salida.
    // El último formato en la cadena 'combine' es el que se usa.
    // Por eso, he comentado format.json() para que tu 'myFormat' funcione correctamente.
    // format.json(), 
    format.colorize({ all: true }),
    format.label({ label: apiName }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat
  ),
  transports: [
    new transports.Console(),
    //new transports.File({ filename: 'logs/combined.log' })
  ]
});

// Exportas el logger principal como siempre
module.exports = logger;