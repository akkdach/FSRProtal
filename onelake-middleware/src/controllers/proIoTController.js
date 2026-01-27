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

            logToFile(`[ProIoT] API Request: /api/orders?page=${page}&limit=${limit}&view=${req.query.view || 'Default'}`);

            let allData = [];
            if (req.query.view === 'Performance_Matrix') {
                // Fetch from GraphQL for this specific view
                console.log("Fetching Performance_Matrix via GraphQL...");
                allData = await graphqlService.queryView('Performance_Matrix');
                console.log(`[ProIoT] GraphQL returned ${allData.length} records`);
                if (allData.length > 0) {
                    console.log("[ProIoT] First Record:", JSON.stringify(allData[0], null, 2));
                }
            } else {
                // Default: Fetch from OneLake Parquet
                allData = await service.getData(config.oneLake.proIoT);
            }
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

    /**
     * Baht Per Head data source backed by Stored Procedure (GraphQL mutation).
     *
     * This endpoint calls the Fabric GraphQL mutation `executeServiceOrder_Income`
     * via `graphqlService.executeServiceOrderIncome()` and returns a paginated
     * list of rows shaped for the Baht Per Head page.
     *
     * GET /api/baht-per-head?page=0&limit=100
     */
    async getBahtPerHead(req, res) {
        try {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 100;

            logToFile(`[ProIoT] API Request: /api/baht-per-head?page=${page}&limit=${limit}&FromDate=${req.query.FromDate}&ToDate=${req.query.ToDate}`);

            // Call stored procedure-backed mutation with query parameters (for date filtering)
            const allData = await graphqlService.executeServiceOrderIncome(req.query);

            const total = allData.length;
            const startIndex = page * limit;
            const endIndex = startIndex + limit;
            const slicedData = allData.slice(startIndex, endIndex);

            logToFile(`[ProIoT] Baht Per Head Response: Returning ${slicedData.length} records (from total ${total})`);

            res.json({
                success: true,
                data: slicedData,
                total,
                page,
                limit
            });
        } catch (err) {
            logToFile(`[ProIoT] Baht Per Head API Error: ${err.message}`);
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    async getBahtPerHeadSummary(req, res) {
        try {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 100;

            logToFile(`[ProIoT] API Request: /api/baht-per-head-summary?page=${page}&limit=${limit}&FromDate=${req.query.FromDate}&ToDate=${req.query.ToDate}`);

            // Call stored procedure-backed mutation
            const allData = await graphqlService.executeServiceOrderBahtPerHead(req.query);

            const total = allData.length;
            const startIndex = page * limit;
            const endIndex = startIndex + limit;
            const slicedData = allData.slice(startIndex, endIndex);

            logToFile(`[ProIoT] Baht Per Head Summary Response: Returning ${slicedData.length} records (from total ${total})`);

            res.json({
                success: true,
                data: slicedData,
                total,
                page,
                limit
            });
        } catch (err) {
            logToFile(`[ProIoT] Baht Per Head Summary API Error: ${err.message}`);
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
}

module.exports = new ProIoTController();
