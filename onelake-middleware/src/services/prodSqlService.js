const sql = require('mssql');
const config = require('../config');
const { logToFile } = require('../utils/logger');

class ProdSqlService {
    constructor() {
        this.pool = null;
    }

    async connect() {
        if (!this.pool) {
            try {
                logToFile("Connecting to BevproFsProd SQL Endpoint...");
                this.pool = await sql.connect(config.prodSql);
                logToFile("Connected to BevproFsProd SQL Endpoint successfully.");
            } catch (err) {
                logToFile(`BevproFsProd SQL Connection Error: ${err.message}`);
                logToFile(`BevproFsProd SQL Connection Config: Server=${config.prodSql.server}, DB=${config.prodSql.database}, User=${config.prodSql.user}`);
                throw err;
            }
        }
        return this.pool;
    }

    async getWorkLog() {
        try {
            const pool = await this.connect();
            logToFile(`Querying Table: work_log from BevproFsProd`);

            const query = `
                SELECT [ID]
                    ,[CREATE_DATETIME]
                    ,[INIT_FLAG]
                    ,[MILEAGE]
                    ,[ORDERID]
                    ,[WK_CTR]
                    ,[WORK_ACTION]
                FROM [dbo].[work_log]
            `;

            const result = await pool.request().query(query);
            logToFile(`Query Success: Retrieved ${result.recordset.length} rows from work_log`);

            return result.recordset;
        } catch (err) {
            logToFile(`SQL Query Error (work_log): ${err.message}`);
            throw err;
        }
    }
    async getWorkCenter() {
        try {
            const pool = await this.connect();
            logToFile(`Querying Table: work_center from BevproFsProd`);

            const query = `
                SELECT [WK_CTR]
                    ,[BREAK_TIME]
                    ,[DESCRIPTION]
                    ,[FINISH_TIME]
                    ,[HEIGHT]
                    ,[LENGTH]
                    ,[OT]
                    ,[PLANT]
                    ,[START_TIME]
                    ,[VAN_SUP]
                    ,[WIDTH]
                    ,[ZONE]
                    ,[SD]
                FROM [dbo].[work_center]
            `;

            const result = await pool.request().query(query);
            logToFile(`Query Success: Retrieved ${result.recordset.length} rows from work_center`);

            return result.recordset;
        } catch (err) {
            logToFile(`SQL Query Error (work_center): ${err.message}`);
            throw err;
        }
    }
    async getVanFuelAvg() {
        try {
            const pool = await this.connect();
            logToFile(`Querying Table: van_fuel_avg from BevproFsProd`);

            const query = `
                SELECT [id]
                    ,[van_code]
                    ,[license_plate]
                    ,[service_zone]
                    ,[name_group]
                    ,[service_zone_control]
                    ,[supervisor_name]
                    ,[fuel_avg_km_l]
                    ,[created_at]
                    ,[updated_at]
                FROM [dbo].[van_fuel_avg]
            `;

            const result = await pool.request().query(query);
            logToFile(`Query Success: Retrieved ${result.recordset.length} rows from van_fuel_avg`);

            return result.recordset;
        } catch (err) {
            logToFile(`SQL Query Error (van_fuel_avg): ${err.message}`);
            throw err;
        }
    }
}

module.exports = new ProdSqlService();
