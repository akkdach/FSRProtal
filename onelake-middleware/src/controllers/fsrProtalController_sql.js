const sqlService = require('../services/sqlService');
const { logToFile } = require('../utils/logger');

class FSRProtalController {
    async getOrders(req, res) {
        try {
            const { view, page = 0, limit = 500 } = req.query;
            const viewName = view || 'Service_BN15_Refurbish';

            // Whitelist of allowed views
            const ALLOWED_VIEWS = [
                'Service_BN04_Install',
                'Service_BN09_Remove',
                'Service_BN15_Refurbish'
            ];

            if (!ALLOWED_VIEWS.includes(viewName)) {
                return res.status(400).json({ error: 'Invalid view name' });
            }

            logToFile(`[FSRProtal-SQL] API Request: /api/fsr-protal/orders?view=${viewName}&page=${page}&limit=${limit}`);

            // Query SQL View directly (Port 1433)
            const allData = await sqlService.getViewData(viewName);

            logToFile(`[FSRProtal-SQL] Retrieved ${allData.length} records from SQL View: ${viewName}`);

            // Pagination
            const total = allData.length;
            const startIndex = page * limit;
            const endIndex = startIndex + limit;
            const slicedData = allData.slice(startIndex, endIndex);

            logToFile(`[FSRProtal-SQL] Response: Returning ${slicedData.length} records (from total ${total})`);

            res.json({
                data: slicedData,
                total: total,
                page: parseInt(page),
                limit: parseInt(limit)
            });

        } catch (error) {
            logToFile(`[FSRProtal-SQL] Error: ${error.message}`);
            res.status(500).json({
                error: 'Failed to fetch orders from SQL',
                details: error.message
            });
        }
    }
}

module.exports = new FSRProtalController();
