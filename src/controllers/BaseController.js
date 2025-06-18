const logger = require('../../lib/logger');

/**
 * BaseController
 * 
 * Clase base genérica para controladores CRUD sobre modelos de Mongoose.
 * Permite extender funcionalidades comunes como operaciones de inserción, actualización, eliminación y búsqueda.
 * 
 * Puede configurarse para que ciertas operaciones filtren automáticamente por el `company` asociado,
 * dependiendo de si la entidad debe estar ligada a una empresa (ej.: Productos) o ser global (ej.: Configuraciones generales).
 */
class BaseController {
    /**
     * Constructor de la clase BaseController
     * 
     * @param {mongoose.Model} model - El modelo de Mongoose que representa la colección a manipular.
     * @param {boolean} requiresCompanyFilter - Indica si las operaciones deben filtrar automáticamente por el `company` del usuario.
     *                                           (true = aplica filtro por company, false = no aplica filtro).
     *                                           Default: true
     * 
     * Ejemplo de uso:
     *    const userController = new BaseController(UserModel, true); // Para usuarios ligados a un company
     *    const configController = new BaseController(ConfigModel, false); // Para configuraciones globales
     */
    constructor(model, requiresCompanyFilter = true) {
        this.model = model;
        this.requiresCompanyFilter = requiresCompanyFilter;
    }

    _getHeaders(req, res) {
        const company = req.header('X-User-Company');
        const username = req.header('X-User-Name');
        if (this.requiresCompanyFilter && (!company || !username)) {
            res.status(400).json({ message: 'Missing required header: X-User-Company' });
            return null;
        }
        return { company, username };
    }

    async _dealWithError(res, err, message) {
        logger.error(err);
        let msg = `${message}. Caused by: ${err.errorResponse?.errmsg || err.message}`;
        res.status(500).json({ message: msg });
    }

    _normalizeMatch(match) {
        for (let key in match) {
            if (match[key] === 'true') match[key] = true;
            if (match[key] === 'false') match[key] = false;
        }
        return match;
    }    

    /**
     * @function insert
     * @description Inserta un nuevo documento en la base de datos.
     * Utiliza el modelo especificado para crear un nuevo registro con los datos enviados
     * en el cuerpo del request (`req.body`).
     *
     * @param {Object} req - Objeto de solicitud HTTP (Express).
     * @param {Object} res - Objeto de respuesta HTTP (Express).
     *
     * @returns {void} Responde con el documento creado o un error si ocurre.
     */
    async insert(req, res) {
        const headers = this._getHeaders(req, res);
        if (!headers) return;
        const { company, username } = headers;

        const payload = {
            ...req.body,
            created_by: username,
            modified_by: username
        };

        // Solo agregar company si se requiere
        if (this.requiresCompanyFilter) {
            payload.company = company;
        }

        const doc = new this.model(payload);

        doc.save()
            .then(saved => {
                console.log(saved);
                res.json({ status: saved })
            })
            // 🔥 Cambiado a función flecha para mantener el ambito donde fue creada y no de error con el this              
            .catch(err => {
                this._dealWithError(res, err, `${this.model.modelName} not created`);
            });
    }

    /**
     * @function get
     * @description Maneja una solicitud GET para obtener elementos desde la base de datos.
     * Retorna directamente una lista (array) con los resultados encontrados según los parámetros
     * enviados en la query del request.
     *
     * @param {Object} req - Objeto de solicitud HTTP (Express). Contiene la query con filtros.
     * @param {Object} res - Objeto de respuesta HTTP (Express). Usado para enviar la respuesta al cliente.
     *
     * @returns {void} Responde al cliente con un array JSON de los resultados o con un error si ocurre.
     */
    async get(req, res) {
        const headers = this._getHeaders(req, res);
        if (!headers) return;
        const { company } = headers;
    
        // Clona los parámetros del query
        let query = { ...req.query };
    
        // Solo inyecta `company` si se requiere
        if (this.requiresCompanyFilter) {
            query.company = company;
        }
    
        // Extrae 'fields' del query y lo elimina del objeto de filtros
        const { fields } = query;
        delete query.fields;
    
        // Determinar si estamos buscando un elemento específico por ID
        const isSingleItemQuery = query._id !== undefined;
    
        // Construye la consulta
        let sql = this.model.find(query);
    
        // Si hay campos específicos, aplica proyección
        if (fields) {
            const projection = fields.replace(/,/g, ' ');
            sql = sql.select(projection);
        }
    
        // Ejecuta la consulta
        sql.exec()
            .then(result => {
                if (isSingleItemQuery && result.length === 1) {
                    res.json(result[0]);
                } else {
                    res.json(result);
                }
            })
            .catch(err => {
                this._dealWithError(res, err, `${this.model.modelName} not found`);
            });
    }
    
    /**
     * @function delete
     * @description Desactiva lógicamente un documento (soft delete) usando _id y company como filtro.
     * Utiliza .save() para asegurar que se disparen los hooks definidos como pre('save').
     *
     * @param {Object} req - Objeto de solicitud HTTP (Express).
     * @param {Object} res - Objeto de respuesta HTTP (Express).
     *
     * @returns {void} Responde con el documento actualizado o un error.
     */
    async delete(req, res) {
        const { id } = req.params;
        const headers = this._getHeaders(req, res);
        if (!headers) return;
        const { company, username } = headers;

        const filter = { _id: id };
        if (this.requiresCompanyFilter) {
            filter.company = company;
        }

        try {
            const doc = await this.model.findOne(filter);
            if (!doc) {
                return res.status(404).json({ message: `${this.model.modelName} not found` });
            }

            doc.active = false;
            doc.modified_by = username;
            const saved = await doc.save(); // Dispara los hooks
            logger.info({ deleted: saved });
            res.json({ _id: saved._id });
        } catch (err) {
            this._dealWithError(res, err, `${this.model.modelName} not deleted`);
        }
    }

    /**
     * @function update
     * @description Actualiza un documento usando _id y company como filtro.
     * Utiliza .save() para asegurar ejecución de pre('save') hooks.
     *
     * @param {Object} req - Objeto de solicitud HTTP (Express).
     * @param {Object} res - Objeto de respuesta HTTP (Express).
     *
     * @returns {void} Responde con el documento actualizado o un error.
     */
    async update(req, res) {
        const { id } = req.params;

        const headers = this._getHeaders(req, res);
        if (!headers) return;
        const { company, username } = headers;

        const updates = { ...req.body };

        const filter = { _id: id };
        if (this.requiresCompanyFilter) {
            filter.company = company;
        }

        try {
            const doc = await this.model.findOne(filter);
            if (!doc) {
                return res.status(404).json({ message: `${this.model.modelName} not found` });
            }

            // Actualizar propiedades dinámicamente
            Object.assign(doc, updates);
            doc.modified_by = username;

            const saved = await doc.save(); // Dispara hooks como pre('save')
            logger.info({ updated: saved });
            res.json({ _id: saved._id });
        } catch (err) {
            this._dealWithError(res, err, `${this.model.modelName} not updated`);
        }
    }

    async echo(req, res) {
        const { company, username } = this._getHeaders(req);
        try {
            if (req.method === "GET") {
                res.json({ message: `GET ECHO: Dummy ok`, company, username });
            } else {
                res.json({ message: `POST ECHO: Dummy ok`, body: req.body, company, username });
            }
        } catch (error) {

            logger.error(error.stack)
            return res.status(500).json({
                error: error.message
            })
        }

    }

};

module.exports = BaseController;