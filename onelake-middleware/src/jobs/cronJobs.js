const cron = require('node-cron');
const syncService = require('../services/syncService');
const { logToFile } = require('../utils/logger');

function initCronJobs() {
    logToFile('[Cron] Initializing scheduled jobs...');

    // Run every day at 11:15 (11:15 AM / สิบเอ็ดโมงสิบห้า)
    cron.schedule('15 11 * * *', async () => {
        logToFile('[Cron] Triggering Automated ServiceOrderTable Sync...');
        try {
            const viewName = 'ServiceOrderTable_Import_DataBase_238';
            const targetTableName = 'ServiceOrderTable_Sync';
            const primaryKey = 'Id'; 
            const modifyField = 'modifiedon';
            
            const result = await syncService.syncFromGraphQL(viewName, targetTableName, primaryKey, modifyField);
            logToFile(`[Cron] Automated ServiceOrderTable Sync completed. Result: ${JSON.stringify(result)}`);
        } catch (error) {
            logToFile(`[Cron] Automated ServiceOrderTable Sync failed: ${error.message}`);
        }

        // After Table sync, also sync Line
        logToFile('[Cron] Triggering Automated ServiceOrderLine Sync...');
        try {
            const viewName = 'ServiceOrderLine_Import_DataBase_238';
            const targetTableName = 'ServiceOrderLine_Sync';
            const primaryKey = 'Id'; 
            const modifyField = 'modifiedon';
            
            const result = await syncService.syncFromGraphQL(viewName, targetTableName, primaryKey, modifyField);
            logToFile(`[Cron] Automated ServiceOrderLine Sync completed. Result: ${JSON.stringify(result)}`);
        } catch (error) {
            logToFile(`[Cron] Automated ServiceOrderLine Sync failed: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Bangkok"
    });

    logToFile('[Cron] Scheduled job set for 11:15 (Asia/Bangkok) every day — Table + Line sync.');
}

module.exports = { initCronJobs };
