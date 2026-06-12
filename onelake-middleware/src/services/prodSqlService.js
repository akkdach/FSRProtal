const sql = require('mssql');
const config = require('../config');
const { logToFile } = require('../utils/logger');

class ProdSqlService {
    constructor() {
        this.pool = null;
        this._connecting = null; // Lock to prevent race condition
    }

    async connect() {
        // If already connected, return existing pool
        if (this.pool) {
            return this.pool;
        }
        // If a connection attempt is in progress, wait for it
        if (this._connecting) {
            return this._connecting;
        }
        // Start new connection with lock
        this._connecting = (async () => {
            try {
                logToFile("Connecting to BevproFsProd SQL Endpoint...");
                this.pool = await new sql.ConnectionPool(config.prodSql).connect();
                logToFile("Connected to BevproFsProd SQL Endpoint successfully.");
                return this.pool;
            } catch (err) {
                logToFile(`BevproFsProd SQL Connection Error: ${err.message}`);
                logToFile(`BevproFsProd SQL Connection Config: Server=${config.prodSql.server}, DB=${config.prodSql.database}, User=${config.prodSql.user}`);
                this.pool = null;
                throw err;
            } finally {
                this._connecting = null;
            }
        })();
        return this._connecting;
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
    async getWorker() {
        try {
            const pool = await this.connect();
            logToFile(`Querying Table: worker from BevproFsProd`);

            const query = `
                SELECT [No],[EmployeeCode],[FullName],[Position],[Department],
                       [WorkLocation],[VanNo],[LicensePlate],[TelephoneNo],
                       [Supervisor],[SD2],[CostCenter],[NewCostCenter],
                       [ActivityInsRm],[DirectReport],[No_Leader],[Status]
                FROM [dbo].[worker]
                WHERE [EmployeeCode] IS NOT NULL AND [EmployeeCode] <> 'EmployeeCode'
                ORDER BY [No] ASC
            `;

            const result = await pool.request().query(query);
            logToFile(`Query Success: Retrieved ${result.recordset.length} rows from worker`);

            return result.recordset;
        } catch (err) {
            logToFile(`SQL Query Error (worker): ${err.message}`);
            throw err;
        }
    }
    async getManpower() {
        try {
            const pool = await this.connect();
            logToFile(`Querying Table: Manpower_Operations from BevproFsProd`);

            const query = `
                SELECT [Seat_ID]
                    ,[Parent_Seat_ID]
                    ,[EmployeeCode]
                    ,[FullName]
                    ,[Position]
                    ,[Department]
                    ,[WorkLocation]
                    ,[Region_Code]
                    ,[VanNo]
                    ,[LicensePlate]
                    ,[TelephoneNo]
                    ,[CostCenter]
                    ,[NewCostCenter]
                    ,[ActivityInsRm]
                    ,[DirectReport]
                    ,[Remarks]
                    ,[Target_Per_Head]
                    ,[SD2]
                    ,[Supervisor]
                    ,[No_Leader]
                    ,[Status]
                    ,[No]
                    ,[Technician]
                    ,[Team]
                    ,[ModifyDate]
                FROM [dbo].[Manpower_Operations]
                WHERE [EmployeeCode] IS NOT NULL AND [EmployeeCode] <> ''
                ORDER BY [No] ASC
            `;

            const result = await pool.request().query(query);
            logToFile(`Query Success: Retrieved ${result.recordset.length} rows from Manpower_Operations`);

            return result.recordset;
        } catch (err) {
            logToFile(`SQL Query Error (Manpower_Operations): ${err.message}`);
            throw err;
        }
    }
    async createManpower(data) {
        try {
            const pool = await this.connect();
            logToFile(`Inserting into Table: Manpower_Operations in BevproFsProd`);

            const result = await pool.request()
                .input('Seat_ID', sql.NVarChar(50), data.Seat_ID || null)
                .input('Parent_Seat_ID', sql.NVarChar(50), data.Parent_Seat_ID || null)
                .input('EmployeeCode', sql.NVarChar(50), data.EmployeeCode || null)
                .input('FullName', sql.NVarChar(150), data.FullName || null)
                .input('Position', sql.NVarChar(150), data.Position || null)
                .input('Department', sql.NVarChar(100), data.Department || null)
                .input('WorkLocation', sql.NVarChar(100), data.WorkLocation || null)
                .input('Region_Code', sql.NVarChar(50), data.Region_Code || null)
                .input('VanNo', sql.NVarChar(50), data.VanNo || null)
                .input('LicensePlate', sql.NVarChar(50), data.LicensePlate || null)
                .input('TelephoneNo', sql.NVarChar(50), data.TelephoneNo || null)
                .input('CostCenter', sql.NVarChar(50), data.CostCenter || null)
                .input('NewCostCenter', sql.NVarChar(50), data.NewCostCenter || null)
                .input('ActivityInsRm', sql.NVarChar(100), data.ActivityInsRm || null)
                .input('DirectReport', sql.NVarChar(150), data.DirectReport || null)
                .input('Remarks', sql.NVarChar(500), data.Remarks || null)
                .input('Target_Per_Head', sql.NVarChar(50), data.Target_Per_Head != null ? String(data.Target_Per_Head) : null)
                .input('SD2', sql.NVarChar(50), data.SD2 || null)
                .input('Supervisor', sql.NVarChar(150), data.Supervisor || null)
                .input('No_Leader', sql.NVarChar(50), data.No_Leader || null)
                .input('Status', sql.NVarChar(20), data.Status || null)
                .input('Technician', sql.NVarChar(20), data.Technician || null)
                .input('Team', sql.NVarChar(20), data.Team || null)
                .input('ModifyDate', sql.DateTime, data.ModifyDate ? new Date(data.ModifyDate) : null)
                .query(`
                    INSERT INTO [dbo].[Manpower_Operations]
                        (Seat_ID, Parent_Seat_ID, EmployeeCode, FullName, Position, Department,
                         WorkLocation, Region_Code, VanNo, LicensePlate, TelephoneNo,
                         CostCenter, NewCostCenter, ActivityInsRm, DirectReport, Remarks,
                         Target_Per_Head, SD2, Supervisor, No_Leader, Status, Technician, Team, ModifyDate)
                    OUTPUT INSERTED.*
                    VALUES (@Seat_ID, @Parent_Seat_ID, @EmployeeCode, @FullName, @Position, @Department,
                            @WorkLocation, @Region_Code, @VanNo, @LicensePlate, @TelephoneNo,
                            @CostCenter, @NewCostCenter, @ActivityInsRm, @DirectReport, @Remarks,
                            @Target_Per_Head, @SD2, @Supervisor, @No_Leader, @Status, @Technician, @Team, @ModifyDate)
                `);

            logToFile(`Insert Success: Created manpower ${data.EmployeeCode}`);
            return result.recordset[0];
        } catch (err) {
            logToFile(`SQL Insert Error (Manpower_Operations): ${err.message}`);
            throw err;
        }
    }
    async updateManpower(no, data) {
        try {
            const pool = await this.connect();
            logToFile(`Updating Table: Manpower_Operations No=${no} in BevproFsProd`);

            const request = pool.request().input('No', sql.Int, no);
            const setClauses = [];

            const fields = {
                Seat_ID: sql.NVarChar(50), Parent_Seat_ID: sql.NVarChar(50),
                EmployeeCode: sql.NVarChar(50), FullName: sql.NVarChar(150),
                Position: sql.NVarChar(150), Department: sql.NVarChar(100),
                WorkLocation: sql.NVarChar(100), Region_Code: sql.NVarChar(50),
                VanNo: sql.NVarChar(50), LicensePlate: sql.NVarChar(50),
                TelephoneNo: sql.NVarChar(50), CostCenter: sql.NVarChar(50),
                NewCostCenter: sql.NVarChar(50), ActivityInsRm: sql.NVarChar(100),
                DirectReport: sql.NVarChar(150), Remarks: sql.NVarChar(500),
                Target_Per_Head: sql.NVarChar(50), SD2: sql.NVarChar(50),
                Supervisor: sql.NVarChar(150), No_Leader: sql.NVarChar(50),
                Status: sql.NVarChar(20), Technician: sql.NVarChar(20),
                Team: sql.NVarChar(20), ModifyDate: sql.DateTime,
            };

            for (const [field, type] of Object.entries(fields)) {
                if (data[field] !== undefined) {
                    request.input(field, type, data[field]);
                    setClauses.push(`[${field}] = @${field}`);
                }
            }

            if (setClauses.length === 0) throw new Error('No fields to update');

            const result = await request.query(`
                UPDATE [dbo].[Manpower_Operations] SET ${setClauses.join(', ')}
                OUTPUT INSERTED.*
                WHERE [No] = @No
            `);

            if (!result.recordset.length) throw new Error(`Manpower No ${no} not found`);
            logToFile(`Update Success: Manpower No=${no}`);
            return result.recordset[0];
        } catch (err) {
            logToFile(`SQL Update Error (Manpower_Operations): ${err.message}`);
            throw err;
        }
    }
    async deleteManpower(no) {
        try {
            const pool = await this.connect();
            logToFile(`Deleting from Table: Manpower_Operations No=${no} in BevproFsProd`);

            const result = await pool.request()
                .input('No', sql.Int, no)
                .query(`DELETE FROM [dbo].[Manpower_Operations] WHERE [No] = @No`);

            if (result.rowsAffected[0] === 0) throw new Error(`Manpower No ${no} not found`);
            logToFile(`Delete Success: Manpower No=${no}`);
        } catch (err) {
            logToFile(`SQL Delete Error (Manpower_Operations): ${err.message}`);
            throw err;
        }
    }
    async createWorker(data) {
        try {
            const pool = await this.connect();
            logToFile(`Inserting into Table: worker in BevproFsProd`);

            const result = await pool.request()
                .input('EmployeeCode', sql.NVarChar(50), data.EmployeeCode || null)
                .input('FullName', sql.NVarChar(150), data.FullName || null)
                .input('Position', sql.NVarChar(150), data.Position || null)
                .input('Department', sql.NVarChar(100), data.Department || null)
                .input('WorkLocation', sql.NVarChar(100), data.WorkLocation || null)
                .input('VanNo', sql.NVarChar(50), data.VanNo || null)
                .input('LicensePlate', sql.NVarChar(50), data.LicensePlate || null)
                .input('TelephoneNo', sql.NVarChar(50), data.TelephoneNo || null)
                .input('Supervisor', sql.NVarChar(150), data.Supervisor || null)
                .input('SD2', sql.NVarChar(50), data.SD2 || null)
                .input('CostCenter', sql.NVarChar(50), data.CostCenter || null)
                .input('NewCostCenter', sql.NVarChar(50), data.NewCostCenter || null)
                .input('ActivityInsRm', sql.NVarChar(100), data.ActivityInsRm || null)
                .input('DirectReport', sql.NVarChar(150), data.DirectReport || null)
                .input('No_Leader', sql.NVarChar(50), data.No_Leader || null)
                .input('Status', sql.NVarChar(20), data.Status || null)
                .query(`
                    INSERT INTO [dbo].[worker]
                        (EmployeeCode, FullName, Position, Department, WorkLocation,
                         VanNo, LicensePlate, TelephoneNo, Supervisor, SD2,
                         CostCenter, NewCostCenter, ActivityInsRm, DirectReport, No_Leader, Status)
                    OUTPUT INSERTED.*
                    VALUES (@EmployeeCode, @FullName, @Position, @Department, @WorkLocation,
                            @VanNo, @LicensePlate, @TelephoneNo, @Supervisor, @SD2,
                            @CostCenter, @NewCostCenter, @ActivityInsRm, @DirectReport, @No_Leader, @Status)
                `);

            logToFile(`Insert Success: Created worker ${data.EmployeeCode}`);
            return result.recordset[0];
        } catch (err) {
            logToFile(`SQL Insert Error (worker): ${err.message}`);
            throw err;
        }
    }
    async updateWorker(no, data) {
        try {
            const pool = await this.connect();
            logToFile(`Updating Table: worker No=${no} in BevproFsProd`);

            const request = pool.request().input('No', sql.Int, no);
            const setClauses = [];

            const fields = {
                EmployeeCode: sql.NVarChar(50), FullName: sql.NVarChar(150),
                Position: sql.NVarChar(150), Department: sql.NVarChar(100),
                WorkLocation: sql.NVarChar(100), VanNo: sql.NVarChar(50),
                LicensePlate: sql.NVarChar(50), TelephoneNo: sql.NVarChar(50),
                Supervisor: sql.NVarChar(150), SD2: sql.NVarChar(50),
                CostCenter: sql.NVarChar(50), NewCostCenter: sql.NVarChar(50),
                ActivityInsRm: sql.NVarChar(100), DirectReport: sql.NVarChar(150),
                No_Leader: sql.NVarChar(50), Status: sql.NVarChar(20),
            };

            for (const [field, type] of Object.entries(fields)) {
                if (data[field] !== undefined) {
                    request.input(field, type, data[field]);
                    setClauses.push(`[${field}] = @${field}`);
                }
            }

            if (setClauses.length === 0) throw new Error('No fields to update');

            const result = await request.query(`
                UPDATE [dbo].[worker] SET ${setClauses.join(', ')}
                OUTPUT INSERTED.*
                WHERE [No] = @No
            `);

            if (!result.recordset.length) throw new Error(`Worker No ${no} not found`);
            logToFile(`Update Success: Worker No=${no}`);
            return result.recordset[0];
        } catch (err) {
            logToFile(`SQL Update Error (worker): ${err.message}`);
            throw err;
        }
    }
    async deleteWorker(no) {
        try {
            const pool = await this.connect();
            logToFile(`Deleting from Table: worker No=${no} in BevproFsProd`);

            const result = await pool.request()
                .input('No', sql.Int, no)
                .query(`DELETE FROM [dbo].[worker] WHERE [No] = @No`);

            if (result.rowsAffected[0] === 0) throw new Error(`Worker No ${no} not found`);
            logToFile(`Delete Success: Worker No=${no}`);
        } catch (err) {
            logToFile(`SQL Delete Error (worker): ${err.message}`);
            throw err;
        }
    }
}

module.exports = new ProdSqlService();
