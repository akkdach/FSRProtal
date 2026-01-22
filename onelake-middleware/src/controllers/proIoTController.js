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

            // Apply SQL Logic Filtering in JavaScript
            // WHERE svt.bpc_slafinishdate >= CurrentMonthStart AND < NextMonthStart
            // AND svt.stageid = 'POST'
            // AND svl.transactiontype IN (2,3)

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

            const filteredData = rawData.filter(item => {
                // 1. Filter by Stage ID
                if (item.stageid !== 'POST') return false;

                // 2. Filter by Transaction Type (2 or 3)
                if (![2, 3].includes(item.transactiontype)) return false;

                // 3. Filter by SLA Finish Date (Current Month)
                if (!item.bpc_slafinishdate) return false;
                const slaDate = new Date(item.bpc_slafinishdate);
                return slaDate >= startOfMonth && slaDate < startOfNextMonth;
            });

            const total = filteredData.length;
            const startIndex = page * limit;
            const endIndex = startIndex + limit;
            const slicedData = filteredData.slice(startIndex, endIndex);

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
