const cron = require('node-cron');
const syncService = require('../services/syncService');
const { logToFile } = require('../utils/logger');

function initCronJobs() {
    logToFile('[Cron] Initializing scheduled jobs...');

    // Run every day at 12:30 (12:30 PM / เที่ยงครึ่ง)
    cron.schedule('30 12 * * *', async () => {
        const syncTasks = [
            { view: 'ServiceOrderTable_Import_DataBase_238', table: 'ServiceOrderTable_Sync', label: 'ServiceOrderTable' },
            { view: 'ServiceOrderLine_Import_DataBase_238', table: 'ServiceOrderLine_Sync', label: 'ServiceOrderLine' },
            { view: 'ServiceObjectTable_Import_DataBase_238', table: 'ServiceObjectTable_Sync', label: 'ServiceObjectTable' },
            { view: 'Pickingroute_Import_DataBase_238', table: 'Pickingroute_Sync', label: 'Pickingroute' },
            { view: 'Reasontable_Import_DataBase_238', table: 'Reasontable_Sync', label: 'Reasontable' },
            { view: 'Logisticspostaladdress_Import_DataBase_238', table: 'Logisticspostaladdress_Sync', label: 'Logisticspostaladdress' },
            { view: 'Logisticslocation_Import_DataBase_238', table: 'Logisticslocation_Sync', label: 'Logisticslocation' },
            { view: 'Inventtransorigin_Import_DataBase_238', table: 'Inventtransorigin_Sync', label: 'Inventtransorigin' },
            { view: 'Inventtransfertable_Import_DataBase_238', table: 'Inventtransfertable_Sync', label: 'Inventtransfertable' },
            { view: 'Inventtransferline_Import_DataBase_238', table: 'Inventtransferline_Sync', label: 'Inventtransferline' },
            { view: 'Inventtrans_Import_DataBase_238', table: 'Inventtrans_Sync', label: 'Inventtrans' },
            { view: 'Inventtable_Import_DataBase_238', table: 'Inventtable_Sync', label: 'Inventtable' },
            { view: 'Inventsum_Import_DataBase_238', table: 'Inventsum_Sync', label: 'Inventsum' },
        ];

        for (const task of syncTasks) {
            logToFile(`[Cron] Triggering Automated ${task.label} Sync...`);
            try {
                const result = await syncService.syncFromGraphQL(task.view, task.table, 'Id', 'modifiedon');
                logToFile(`[Cron] ${task.label} Sync completed. Result: ${JSON.stringify(result)}`);
            } catch (error) {
                logToFile(`[Cron] ${task.label} Sync failed: ${error.message}`);
            }
        }
    }, {
        scheduled: true,
        timezone: "Asia/Bangkok"
    });

    logToFile('[Cron] Scheduled job set for 12:30 (Asia/Bangkok) every day — 5 table sync.');
}

module.exports = { initCronJobs };
