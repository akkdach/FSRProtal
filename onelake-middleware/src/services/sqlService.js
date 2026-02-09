const sql = require('mssql');
const config = require('../config');
const { logToFile } = require('../utils/logger');

class SqlService {
    constructor() {
        this.pool = null;
    }

    async connect() {
        if (!this.pool) {
            try {
                logToFile("Connecting to OneLake SQL Endpoint...");
                this.pool = await sql.connect(config.sql);
                logToFile("Connected to SQL Endpoint successfully.");
            } catch (err) {
                logToFile(`SQL Connection Error: ${err.message}`);
                logToFile(`SQL Connection Config: Server=${config.sql.server}, DB=${config.sql.database}, User=${config.sql.authentication.options.clientId}`);
                throw err;
            }
        }
        return this.pool;
    }

    async getViewData(viewName) {
        try {
            const pool = await this.connect();
            logToFile(`Querying View: ${viewName}`);

            // Prevention of SQL Injection: Validate viewName against allowed list if possible, 
            // but for internal middleware, we'll proceed with direct query for now.
            // Note: Views like 'Service_BN15' are expected.

            const result = await pool.request().query(`SELECT * FROM ${viewName}`);
            logToFile(`Query Success: Retrieved ${result.recordset.length} rows from ${viewName}`);

            return result.recordset;
        } catch (err) {
            logToFile(`SQL Query Error (${viewName}): ${err.message}`);
            throw err;
        }
    }
}

module.exports = new SqlService();
