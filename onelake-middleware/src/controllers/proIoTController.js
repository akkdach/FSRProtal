const config = require('../config');
const { logToFile } = require('../utils/logger');
const service = require('../services/oneLakeService');
const sqlService = require('../services/sqlService');
const graphqlService = require('../services/graphqlService');

class ProIoTController {
    async getOrders(req, res) {
        try {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 100;

            logToFile(`[ProIoT] API Request: /api/orders?page=${page}&limit=${limit}`);

            // Pass 'proIoT' config to generic service
            const allData = await service.getData(config.oneLake.proIoT);
            const total = allData.length;
            const startIndex = page * limit;
            const endIndex = startIndex + limit;
            const slicedData = allData.slice(startIndex, endIndex);

            logToFile(`[ProIoT] Response: Returning ${slicedData.length} records (from total ${total})`);

            res.json({
                data: slicedData,
                total: total,
                page: page,
                limit: limit
            });
        } catch (err) {
            logToFile(`[ProIoT] API Error: ${err.message}`);
            res.status(500).json({ error: err.message });
        }
    }

    async getServiceLines(req, res) {
        try {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 100;

            logToFile(`[ProIoT] API Request: /api/service-lines?page=${page}&limit=${limit} (Source: GraphQL)`);

            // Fetch from GraphQL View [ServiceOrder_Table&Line]
            const rawData = await graphqlService.queryView('ServiceOrder_Table&Line');

            // View 'ServiceOrder_Table&Line' already contains all necessary filters:
            // - Stage: POST
            // - TransactionType: 2, 3
            // - Date: Current Month

            const total = rawData.length;
            const startIndex = page * limit;
            const endIndex = startIndex + limit;
            const slicedData = rawData.slice(startIndex, endIndex);

            logToFile(`[ProIoT] Response: Returning ${slicedData.length} records (from total ${total})`);

            res.json({
                data: slicedData,
                total: total,
                page: page,
                limit: limit
            });
        } catch (err) {
            logToFile(`[ProIoT] API Error: ${err.message}`);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new ProIoTController();
