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
                WHERE IsActive = 1
                ORDER BY HolidayDate ASC
            `;
            const result = await prodSqlService.executeQuery(query);
            res.json(result);
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

            const query = `
                MERGE INTO [dbo].[Mas_CompanyHoliday] AS Target
                USING (VALUES (@Date, @Name)) AS Source (HolidayDate, HolidayName)
                ON Target.HolidayDate = Source.HolidayDate
                WHEN MATCHED THEN
                    UPDATE SET 
                        Target.HolidayName = Source.HolidayName,
                        Target.IsActive = 1,
                        Target.UpdateDate = GETDATE(),
                        Target.UpdateBy = 'System'
                WHEN NOT MATCHED THEN
                    INSERT (HolidayDate, HolidayName, IsActive, CreateBy, CreateDate)
                    VALUES (Source.HolidayDate, Source.HolidayName, 1, 'System', GETDATE());
            `;

            const params = {
                Date: { type: sql.Date, value: date },
                Name: { type: sql.NVarChar, value: name }
            };

            await prodSqlService.executeQuery(query, params);
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

            // Soft delete by setting IsActive = 0
            const query = `
                UPDATE [dbo].[Mas_CompanyHoliday]
                SET 
                    IsActive = 0,
                    UpdateDate = GETDATE(),
                    UpdateBy = 'System'
                WHERE HolidayDate = @Date
            `;

            const params = {
                Date: { type: sql.Date, value: date }
            };

            await prodSqlService.executeQuery(query, params);
            res.json({ message: 'Holiday deleted successfully' });
        } catch (error) {
            logToFile(`Error deleting holiday: ${error.message}`);
            res.status(500).json({ error: 'Failed to delete holiday' });
        }
    }
};

module.exports = holidayController;
