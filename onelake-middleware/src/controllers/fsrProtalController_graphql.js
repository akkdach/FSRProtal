const graphqlService = require('../services/graphqlService');
const { logToFile } = require('../utils/logger');

class FSRProtalController {
    async getOrders(req, res) {
        try {
            const { view, page = 0, limit } = req.query;
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

            logToFile(`[FSRProtal-GraphQL] API Request: /api/fsr-protal/orders?view=${viewName}&page=${page}&limit=${limit || 'all'}`);

            // Query GraphQL API (Port 443)
            const allData = await graphqlService.queryView(viewName);

            logToFile(`[FSRProtal-GraphQL] Retrieved ${allData.length} records from GraphQL: ${viewName}`);

            // Pagination (only if limit is specified)
            const total = allData.length;
            let responseData = allData;

            if (limit) {
                const startIndex = page * limit;
                const endIndex = startIndex + parseInt(limit);
                responseData = allData.slice(startIndex, endIndex);
            }

            logToFile(`[FSRProtal-GraphQL] Response: Returning ${responseData.length} records (from total ${total})`);

            res.json({
                data: responseData,
                total: total,
                page: parseInt(page),
                limit: limit ? parseInt(limit) : total
            });

        } catch (error) {
            logToFile(`[FSRProtal-GraphQL] Error: ${error.message}`);
            res.status(500).json({
                error: 'Failed to fetch orders from GraphQL',
                details: error.message
            });
        }
    }
}

module.exports = new FSRProtalController();
