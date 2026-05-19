const syncService = require('../services/syncService');
const { logToFile } = require('../utils/logger');

class SyncController {
    /**
     * Trigger sync from GraphQL ServiceOrderTable_Import_DataBase_238 to SQL Server
     * POST /api/sync/service-order-table-sync
     */
    async syncServiceOrderTable(req, res) {
        try {
            logToFile(`[SyncController] API Request: /api/sync/service-order-table-sync`);
            
            // The mapping details based on user requirements
            const viewName = 'ServiceOrderTable_Import_DataBase_238';
            const targetTableName = 'ServiceOrderTable_Sync';
            const primaryKey = 'Id'; 
            const modifyField = 'modifiedon'; // Use modifiedon as the timestamp field
            
            // Execute the sync process (could take a while, but we await it for now)
            const result = await syncService.syncFromGraphQL(viewName, targetTableName, primaryKey, modifyField);
            
            res.json({
                success: true,
                message: "Sync completed successfully",
                data: result
            });
            
        } catch (error) {
            logToFile(`[SyncController] API Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: `Sync failed: ${error.message}`
            });
        }
    }
}

module.exports = new SyncController();
