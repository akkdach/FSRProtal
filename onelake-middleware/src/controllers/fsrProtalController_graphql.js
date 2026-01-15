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
                'Service_BN15_Refurbish',
                'Service_Summary_All' // New Summary View
            ];

            if (!ALLOWED_VIEWS.includes(viewName)) {
                return res.status(400).json({ error: 'Invalid view name' });
            }

            logToFile(`[FSRProtal-GraphQL] API Request: /api/fsr-protal/orders?view=${viewName}&page=${page}&limit=${limit || 'all'}`);

            let allData = [];
            const RELATED_VIEWS = ['Service_BN04_Install', 'Service_BN09_Remove', 'Service_BN15_Refurbish', 'Service_Summary_All'];

            // If the view is one of our related set, ALWAYS use BN09 as the Master/Base
            if (RELATED_VIEWS.includes(viewName)) {
                logToFile(`[FSRProtal-GraphQL] Using Master View Strategy (Base: Service_BN09_Remove) for requested view: ${viewName}`);

                // 1. Fetch ALL 3 views concurrently
                const [bn09Data, bn04Data, bn15Data] = await Promise.all([
                    graphqlService.queryView('Service_BN09_Remove'), // Master Base
                    graphqlService.queryView('Service_BN04_Install'),
                    graphqlService.queryView('Service_BN15_Refurbish')
                ]);

                // 2. Index auxiliary views by bpc_ticketno
                const installMap = new Map();
                bn04Data.forEach(item => {
                    if (item.bpc_ticketno) installMap.set(item.bpc_ticketno, item);
                });

                const refurbishMap = new Map();
                bn15Data.forEach(item => {
                    if (item.bpc_ticketno) refurbishMap.set(item.bpc_ticketno, item);
                });

                logToFile(`[FSRProtal-GraphQL] Join Prep: Indexed ${installMap.size} installs and ${refurbishMap.size} refurbs.`);

                // 3. Perform Left Join on BN09 (Master)
                allData = bn09Data.map(masterRow => {
                    const ticket = masterRow.bpc_ticketno;
                    const joinInstall = ticket ? installMap.get(ticket) : null;
                    const joinRefurb = ticket ? refurbishMap.get(ticket) : null;

                    // Determine the "Main" object to display based on the requested view
                    let mainObject = {};

                    if (viewName === 'Service_BN04_Install') {
                        mainObject = joinInstall || {};
                    } else if (viewName === 'Service_BN15_Refurbish') {
                        mainObject = joinRefurb || {};
                    } else {
                        // BN09 and Summary both use Master row as base
                        mainObject = masterRow;
                    }

                    return {
                        ...mainObject, // The valid fields for the current view

                        // Always ensure TicketNo is present (from Master)
                        bpc_ticketno: masterRow.bpc_ticketno,

                        // Add Cross-Reference Info & Types
                        master_serviceorderid: masterRow.serviceorderid,

                        // Install Info
                        install_serviceorderid: joinInstall?.serviceorderid || null,
                        install_type: joinInstall?.bpc_serviceordertypecode || null, // Added Type
                        install_status: joinInstall?.bpc_serviceobjectgroup || null,

                        // Refurb Info
                        refurb_serviceorderid: joinRefurb?.serviceorderid || null,
                        refurb_type: joinRefurb?.bpc_serviceordertypecode || null, // Added Type
                        refurb_status: joinRefurb?.bpc_serviceobjectgroup || null
                    };
                });

                logToFile(`[FSRProtal-GraphQL] Join Complete. Master Records: ${allData.length}`);

            } else {
                // Fallback for other unrelated views (if any)
                allData = await graphqlService.queryView(viewName);
            }

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
