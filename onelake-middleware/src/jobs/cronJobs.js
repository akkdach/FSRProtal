const cron = require('node-cron');
const syncService = require('../services/syncService');
const { logToFile } = require('../utils/logger');

function initCronJobs() {
    logToFile('[Cron] Initializing scheduled jobs...');

    // Run every day at 10:30 (10:30 AM / สิบโมงครึ่ง)
    cron.schedule('30 10 * * *', async () => {
        logToFile('[Cron] Triggering Automated ServiceOrderTable Sync...');
        try {
            const viewName = 'ServiceOrderTable_Import_DataBase_238';
            const targetTableName = 'ServiceOrderTable_Sync';
            const primaryKey = 'Id'; 
            const modifyField = 'modifiedon';
            
            const result = await syncService.syncFromGraphQL(viewName, targetTableName, primaryKey, modifyField);
            logToFile(`[Cron] Automated Sync completed successfully. Result: ${JSON.stringify(result)}`);
        } catch (error) {
            logToFile(`[Cron] Automated Sync failed: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Bangkok"
    });

    logToFile('[Cron] Scheduled job set for 10:30 (Asia/Bangkok) every day.');
}

module.exports = { initCronJobs };
