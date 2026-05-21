const syncService = require('../services/syncService');
const { logToFile } = require('../utils/logger');

class SyncController {
    async syncServiceOrderTable(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/service-order-table-sync`);
            const result = await syncService.syncFromGraphQL('ServiceOrderTable_Import_DataBase_238', 'ServiceOrderTable_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error: ${error.message}`);
            res.status(500).json({ success: false, message: `Sync failed: ${error.message}` });
        }
    }

    async syncServiceOrderLine(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/service-order-line-sync`);
            const result = await syncService.syncFromGraphQL('ServiceOrderLine_Import_DataBase_238', 'ServiceOrderLine_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "ServiceOrderLine Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (Line): ${error.message}`);
            res.status(500).json({ success: false, message: `ServiceOrderLine Sync failed: ${error.message}` });
        }
    }

    async syncServiceObjectTable(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/service-object-table-sync`);
            const result = await syncService.syncFromGraphQL('ServiceObjectTable_Import_DataBase_238', 'ServiceObjectTable_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "ServiceObjectTable Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (ObjectTable): ${error.message}`);
            res.status(500).json({ success: false, message: `ServiceObjectTable Sync failed: ${error.message}` });
        }
    }

    async syncPickingroute(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/pickingroute-sync`);
            const result = await syncService.syncFromGraphQL('Pickingroute_Import_DataBase_238', 'Pickingroute_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "Pickingroute Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (Pickingroute): ${error.message}`);
            res.status(500).json({ success: false, message: `Pickingroute Sync failed: ${error.message}` });
        }
    }

    async syncReasontable(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/reasontable-sync`);
            const result = await syncService.syncFromGraphQL('Reasontable_Import_DataBase_238', 'Reasontable_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "Reasontable Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (Reasontable): ${error.message}`);
            res.status(500).json({ success: false, message: `Reasontable Sync failed: ${error.message}` });
        }
    }

    async syncLogisticspostaladdress(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/logisticspostaladdress-sync`);
            const result = await syncService.syncFromGraphQL('Logisticspostaladdress_Import_DataBase_238', 'Logisticspostaladdress_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "Logisticspostaladdress Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (Postaladdress): ${error.message}`);
            res.status(500).json({ success: false, message: `Logisticspostaladdress Sync failed: ${error.message}` });
        }
    }

    async syncLogisticslocation(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/logisticslocation-sync`);
            const result = await syncService.syncFromGraphQL('Logisticslocation_Import_DataBase_238', 'Logisticslocation_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "Logisticslocation Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (Location): ${error.message}`);
            res.status(500).json({ success: false, message: `Logisticslocation Sync failed: ${error.message}` });
        }
    }

    async syncInventtransorigin(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/inventtransorigin-sync`);
            const result = await syncService.syncFromGraphQL('Inventtransorigin_Import_DataBase_238', 'Inventtransorigin_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "Inventtransorigin Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (Inventtransorigin): ${error.message}`);
            res.status(500).json({ success: false, message: `Inventtransorigin Sync failed: ${error.message}` });
        }
    }

    async syncInventtransfertable(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/inventtransfertable-sync`);
            const result = await syncService.syncFromGraphQL('Inventtransfertable_Import_DataBase_238', 'Inventtransfertable_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "Inventtransfertable Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (Inventtransfertable): ${error.message}`);
            res.status(500).json({ success: false, message: `Inventtransfertable Sync failed: ${error.message}` });
        }
    }

    async syncInventtransferline(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/inventtransferline-sync`);
            const result = await syncService.syncFromGraphQL('Inventtransferline_Import_DataBase_238', 'Inventtransferline_Sync', 'Id', 'modifiedon');
            res.json({ success: true, message: "Inventtransferline Sync completed successfully", data: result });
        } catch (error) {
            logToFile(`[SyncController] API Error (Inventtransferline): ${error.message}`);
            res.status(500).json({ success: false, message: `Inventtransferline Sync failed: ${error.message}` });
        }
    }
}

module.exports = new SyncController();
