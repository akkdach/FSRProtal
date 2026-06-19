const prodSqlService = require('../services/prodSqlService');
const { logToFile } = require('../utils/logger');
const sql = require('mssql');

const holidayController = {
    // GET /api/holidays
    getHolidays: async (req, res) => {
        try {
            const query = `
                SELECT 
                    CONVERT(VARCHAR(10), HolidayDate, 120) AS date,
                    HolidayName AS name
                FROM [dbo].[Mas_CompanyHoliday]
                ORDER BY HolidayDate ASC
            `;
            const pool = await prodSqlService.connect();
            const result = await pool.request().query(query);
            res.json(result.recordset);
        } catch (error) {
            logToFile(`Error getting holidays: ${error.message}`);
            res.status(500).json({ error: 'Failed to fetch holidays' });
        }
    },

    // POST /api/holidays
    createHoliday: async (req, res) => {
        try {
            const { date, name } = req.body;
            if (!date || !name) {
                return res.status(400).json({ error: 'date and name are required' });
            }

            // ดึงชื่อผู้ใช้จาก JWT token
            const userName = req.user?.name || req.user?.user || 'System';

            const query = `
                MERGE INTO [dbo].[Mas_CompanyHoliday] AS Target
                USING (VALUES (@Date, @Name, @UserName)) AS Source (HolidayDate, HolidayName, UserName)
                ON Target.HolidayDate = Source.HolidayDate
                WHEN MATCHED THEN
                    UPDATE SET 
                        Target.HolidayName = Source.HolidayName,
                        Target.UpdateDate = GETDATE(),
                        Target.UpdateBy = Source.UserName
                WHEN NOT MATCHED THEN
                    INSERT (HolidayDate, HolidayName, CreateBy, CreateDate)
                    VALUES (Source.HolidayDate, Source.HolidayName, Source.UserName, GETDATE());
            `;

            const pool = await prodSqlService.connect();
            const request = pool.request();
            request.input('Date', sql.Date, date);
            request.input('Name', sql.NVarChar, name);
            request.input('UserName', sql.NVarChar, userName);
            await request.query(query);
            res.json({ message: 'Holiday saved successfully' });
        } catch (error) {
            logToFile(`Error creating holiday: ${error.message}`);
            res.status(500).json({ error: 'Failed to save holiday' });
        }
    },

    // DELETE /api/holidays/:date
    deleteHoliday: async (req, res) => {
        try {
            const { date } = req.params;
            if (!date) {
                return res.status(400).json({ error: 'date is required' });
            }

            const userName = req.user?.name || req.user?.user || 'System';

            // Hard delete
            const query = `
                DELETE FROM [dbo].[Mas_CompanyHoliday]
                WHERE HolidayDate = @Date
            `;

            const pool = await prodSqlService.connect();
            const request = pool.request();
            request.input('Date', sql.Date, date);
            request.input('UserName', sql.NVarChar, userName);
            await request.query(query);
            res.json({ message: 'Holiday deleted successfully' });
        } catch (error) {
            logToFile(`Error deleting holiday: ${error.message}`);
            res.status(500).json({ error: 'Failed to delete holiday' });
        }
    }
};

module.exports = holidayController;
