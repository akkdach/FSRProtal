const sql = require('mssql');
const config = require('../config');
const { logToFile } = require('../utils/logger');

class SqlService {
    constructor() {
        this.pool = null;
        this._connecting = null;
    }

    async connect() {
        if (this.pool) {
            return this.pool;
        }
        if (this._connecting) {
            return this._connecting;
        }
        this._connecting = (async () => {
            try {
                logToFile("Connecting to OneLake SQL Endpoint...");
                this.pool = await new sql.ConnectionPool(config.sql).connect();
                logToFile("Connected to SQL Endpoint successfully.");
                return this.pool;
            } catch (err) {
                logToFile(`SQL Connection Error: ${err.message}`);
                logToFile(`SQL Connection Config: Server=${config.sql.server}, DB=${config.sql.database}, User=${config.sql.authentication.options.clientId}`);
                this.pool = null;
                throw err;
            } finally {
                this._connecting = null;
            }
        })();
        return this._connecting;
    }

    // EXEC dbo.usp_get_service_order_coords — พิกัดร้าน (logisticspostaladdress) ต่อใบงาน
    // orders = comma-separated service order ids เช่น 'S0030701,S0030703'
    async getServiceOrderCoords(orders) {
        try {
            const pool = await this.connect();
            logToFile(`Executing Proc: usp_get_service_order_coords (${orders.split(',').length} orders)`);

            const result = await pool.request()
                .input('orders', sql.NVarChar(sql.MAX), orders)
                .execute('dbo.usp_get_service_order_coords');

            logToFile(`Proc Success: Retrieved ${result.recordset.length} rows from usp_get_service_order_coords`);
            return result.recordset;
        } catch (err) {
            logToFile(`SQL Proc Error (usp_get_service_order_coords): ${err.message}`);
            throw err;
        }
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
