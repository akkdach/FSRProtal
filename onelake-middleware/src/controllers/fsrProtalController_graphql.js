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
                'Service_BN15_Refurbish_NB2CLOAN', // New View
                'Service_Summary_All' // New Summary View
            ];

            if (!ALLOWED_VIEWS.includes(viewName)) {
                return res.status(400).json({ error: 'Invalid view name' });
            }

            logToFile(`[FSRProtal-GraphQL] API Request: /api/fsr-protal/orders?view=${viewName}&page=${page}&limit=${limit || 'all'}`);

            let allData = [];
            const RELATED_VIEWS = ['Service_BN04_Install', 'Service_BN09_Remove', 'Service_BN15_Refurbish', 'Service_BN15_Refurbish_NB2CLOAN', 'Service_Summary_All'];

            // If the view is one of our related set, ALWAYS use BN09 as the Master/Base
            if (RELATED_VIEWS.includes(viewName)) {
                logToFile(`[FSRProtal-GraphQL] Using Master View Strategy (Base: Service_BN09_Remove) for requested view: ${viewName}`);

                // 1. Fetch ALL 4 views concurrently
                const [bn09Data, bn04Data, bn15Data, bn15LoanData] = await Promise.all([
                    graphqlService.queryView('Service_BN09_Remove'), // Master Base
                    graphqlService.queryView('Service_BN04_Install'),
                    graphqlService.queryView('Service_BN15_Refurbish'),
                    graphqlService.queryView('Service_BN15_Refurbish_NB2CLOAN')
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

                const refurbLoanMap = new Map();
                bn15LoanData.forEach(item => {
                    if (item.bpc_ticketno) refurbLoanMap.set(item.bpc_ticketno, item);
                });

                logToFile(`[FSRProtal-GraphQL] Join Prep: Indexed ${installMap.size} installs, ${refurbishMap.size} refurbs, ${refurbLoanMap.size} loans.`);

                // 3. Perform Left Join on BN09 (Master)
                allData = bn09Data.map(masterRow => {
                    const ticket = masterRow.bpc_ticketno;
                    const joinInstall = ticket ? installMap.get(ticket) : null;
                    const joinRefurb = ticket ? refurbishMap.get(ticket) : null;
                    const joinRefurbLoan = ticket ? refurbLoanMap.get(ticket) : null;

                    // Determine the "Main" object to display based on the requested view
                    let mainObject = {};

                    if (viewName === 'Service_BN04_Install') {
                        mainObject = joinInstall || {};
                    } else if (viewName === 'Service_BN15_Refurbish') {
                        mainObject = joinRefurb || {};
                    } else if (viewName === 'Service_BN15_Refurbish_NB2CLOAN') {
                        mainObject = joinRefurbLoan || {};
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
                        install_serviceorderid: joinInstall?.serviceorderid || null,
                        install_type: joinInstall?.bpc_serviceordertypecode || null, // Added Type
                        install_status: joinInstall?.bpc_serviceobjectgroup || null,
                        install_scheduledstart: joinInstall?.bpc_scheduledstart || null, // Explicitly exposed for separation

                        // Refurb Info
                        refurb_serviceorderid: joinRefurb?.serviceorderid || null,
                        refurb_type: joinRefurb?.bpc_serviceordertypecode || null, // Added Type
                        refurb_status: joinRefurb?.bpc_serviceobjectgroup || null,

                        // Refurb Loan Info
                        refurb_loan_serviceorderid: joinRefurbLoan?.serviceorderid || null,
                        refurb_loan_type: joinRefurbLoan?.bpc_serviceordertypecode || null,
                        refurb_loan_type: joinRefurbLoan?.bpc_serviceordertypecode || null,
                        refurb_loan_status: joinRefurbLoan?.bpc_serviceobjectgroup || null,

                        // Special Overrides for Summary View
                        bpc_mobilestatus: (viewName === 'Service_Summary_All')
                            ? (joinRefurbLoan?.bpc_mobilestatus || null)
                            : (mainObject.bpc_mobilestatus || null),

                        bpc_actualstartdate: (viewName === 'Service_Summary_All')
                            ? (joinInstall?.bpc_actualstartdate || null)
                            : (mainObject.bpc_actualstartdate || null)
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
