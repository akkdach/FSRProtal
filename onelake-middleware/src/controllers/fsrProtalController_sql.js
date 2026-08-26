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

    async getBomReferbush(req, res) {
        try {
            logToFile(`[FSRProtal-SQL] API Request: /api/fsr-protal/bom-referbush`);

            // Require the service dynamically or at the top of the file
            const qasSqlService = require('../services/qasSqlService');
            
            // Query SQL View directly from BevproFsQas
            const allData = await qasSqlService.getBomReferbush();

            logToFile(`[FSRProtal-SQL] Retrieved ${allData.length} records from BOM_Referbush`);

            res.json({
                data: allData,
                total: allData.length
            });

        } catch (error) {
            logToFile(`[FSRProtal-SQL] Error: ${error.message}`);
            res.status(500).json({
                error: 'Failed to fetch BOM_Referbush from BevproFsQas SQL',
                details: error.message
            });
        }
    }
    async getWorker(req, res) {
        try {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 0;

            logToFile(`[FSRProtal-SQL] API Request: /api/worker?page=${page}&limit=${limit}`);

            const prodSqlService = require('../services/prodSqlService');
            const allData = await prodSqlService.getWorker();

            logToFile(`[FSRProtal-SQL] Retrieved ${allData.length} records from worker (BevproFsProd)`);

            const total = allData.length;
            let responseData = allData;
            if (limit > 0) {
                const startIndex = page * limit;
                const endIndex = startIndex + limit;
                responseData = allData.slice(startIndex, endIndex);
            }

            res.json({
                success: true,
                data: responseData,
                total,
                page,
                limit: limit || total
            });

        } catch (error) {
            logToFile(`[FSRProtal-SQL] Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch worker from BevproFsProd worker',
                details: error.message
            });
        }
    }
    async getManpower(req, res) {
        try {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 0;

            logToFile(`[FSRProtal-SQL] API Request: /api/manpower?page=${page}&limit=${limit}`);

            const prodSqlService = require('../services/prodSqlService');
            const allData = await prodSqlService.getManpower();

            logToFile(`[FSRProtal-SQL] Retrieved ${allData.length} records from Manpower_Operations (BevproFsProd)`);

            const total = allData.length;
            let responseData = allData;
            if (limit > 0) {
                const startIndex = page * limit;
                const endIndex = startIndex + limit;
                responseData = allData.slice(startIndex, endIndex);
            }

            res.json({
                success: true,
                data: responseData,
                total,
                page,
                limit: limit || total
            });

        } catch (error) {
            logToFile(`[FSRProtal-SQL] Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch manpower from BevproFsProd Manpower_Operations',
                details: error.message
            });
        }
    }
    async createManpower(req, res) {
        try {
            logToFile(`[FSRProtal-SQL] API Request: POST /api/manpower`);
            const prodSqlService = require('../services/prodSqlService');
            const result = await prodSqlService.createManpower(req.body);
            
            if (String(req.body.HR_Status || '').trim().toUpperCase() === 'DRAFT') {
                const teamsNotificationService = require('../services/teamsNotificationService');
                teamsNotificationService.checkAndNotifyDraftManpower().catch(e => logToFile(`[TeamsAlert] Trigger Error: ${e.message}`));
            }

            res.status(201).json({ success: true, data: result, message: 'Manpower created' });
        } catch (error) {
            logToFile(`[FSRProtal-SQL] Create Manpower Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async updateManpower(req, res) {
        try {
            const no = parseInt(req.params.no);
            if (isNaN(no)) return res.status(400).json({ success: false, message: 'Invalid manpower No' });
            logToFile(`[FSRProtal-SQL] API Request: PUT /api/manpower/${no}`);
            const prodSqlService = require('../services/prodSqlService');
            const result = await prodSqlService.updateManpower(no, req.body);
            
            if (String(req.body.HR_Status || '').trim().toUpperCase() === 'DRAFT') {
                const teamsNotificationService = require('../services/teamsNotificationService');
                teamsNotificationService.checkAndNotifyDraftManpower().catch(e => logToFile(`[TeamsAlert] Trigger Error: ${e.message}`));
            }

            res.json({ success: true, data: result, message: 'Manpower updated' });
        } catch (error) {
            logToFile(`[FSRProtal-SQL] Update Manpower Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async deleteManpower(req, res) {
        try {
            const no = parseInt(req.params.no);
            if (isNaN(no)) return res.status(400).json({ success: false, message: 'Invalid manpower No' });
            
            const deletedBy = req.query.deletedBy || req.body?.deletedBy || 'Unknown';
            const deletedName = req.query.deletedName || req.body?.deletedName || 'Unknown';
            const deletedCode = req.query.deletedCode || req.body?.deletedCode || 'Unknown';

            logToFile(`[FSRProtal-SQL] API Request: DELETE /api/manpower/${no}`);
            const prodSqlService = require('../services/prodSqlService');
            const { technician } = (await prodSqlService.deleteManpower(no)) || {};
            
            // Notify MS Teams
            const teamsNotificationService = require('../services/teamsNotificationService');
            teamsNotificationService.notifyDeleteManpower(deletedName, deletedCode, deletedBy, technician).catch(e => logToFile(`[TeamsAlert] Trigger Error: ${e.message}`));

            res.json({ success: true, message: 'Manpower deleted' });
        } catch (error) {
            logToFile(`[FSRProtal-SQL] Delete Manpower Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async createWorker(req, res) {
        try {
            logToFile(`[FSRProtal-SQL] API Request: POST /api/worker`);
            const prodSqlService = require('../services/prodSqlService');
            const result = await prodSqlService.createWorker(req.body);
            res.status(201).json({ success: true, data: result, message: 'Worker created' });
        } catch (error) {
            logToFile(`[FSRProtal-SQL] Create Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async updateWorker(req, res) {
        try {
            const no = parseInt(req.params.no);
            if (isNaN(no)) return res.status(400).json({ success: false, message: 'Invalid worker No' });
            logToFile(`[FSRProtal-SQL] API Request: PUT /api/worker/${no}`);
            const prodSqlService = require('../services/prodSqlService');
            const result = await prodSqlService.updateWorker(no, req.body);
            res.json({ success: true, data: result, message: 'Worker updated' });
        } catch (error) {
            logToFile(`[FSRProtal-SQL] Update Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async deleteWorker(req, res) {
        try {
            const no = parseInt(req.params.no);
            if (isNaN(no)) return res.status(400).json({ success: false, message: 'Invalid worker No' });
            logToFile(`[FSRProtal-SQL] API Request: DELETE /api/worker/${no}`);
            const prodSqlService = require('../services/prodSqlService');
            await prodSqlService.deleteWorker(no);
            res.json({ success: true, message: 'Worker deleted' });
        } catch (error) {
            logToFile(`[FSRProtal-SQL] Delete Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async getWorkLog(req, res) {
        try {
            const page = parseInt(req.query.page) || 0;
            const limit = req.query.limit ? parseInt(req.query.limit) : null;

            logToFile(`[FSRProtal-SQL] API Request: /api/work-log?page=${page}&limit=${limit || 'all'}`);

            const prodSqlService = require('../services/prodSqlService');
            const allData = await prodSqlService.getWorkLog();

            logToFile(`[FSRProtal-SQL] Retrieved ${allData.length} records from work_log`);

            const total = allData.length;
            let responseData = allData;

            if (limit) {
                const startIndex = page * limit;
                const endIndex = startIndex + limit;
                responseData = allData.slice(startIndex, endIndex);
            }

            res.json({
                success: true,
                data: responseData,
                total,
                page,
                limit: limit || total
            });

        } catch (error) {
            logToFile(`[FSRProtal-SQL] Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch work_log from BevproFsProd SQL',
                details: error.message
            });
        }
    }
    async getWorkCenter(req, res) {
        try {
            logToFile(`[FSRProtal-SQL] API Request: /api/work-center`);

            const prodSqlService = require('../services/prodSqlService');
            const allData = await prodSqlService.getWorkCenter();

            logToFile(`[FSRProtal-SQL] Retrieved ${allData.length} records from work_center`);

            res.json({
                success: true,
                data: allData,
                total: allData.length
            });

        } catch (error) {
            logToFile(`[FSRProtal-SQL] Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch work_center from BevproFsProd SQL',
                details: error.message
            });
        }
    }
    async getVanFuelAvg(req, res) {
        try {
            logToFile(`[FSRProtal-SQL] API Request: /api/van-fuel-avg`);

            const prodSqlService = require('../services/prodSqlService');
            const allData = await prodSqlService.getVanFuelAvg();

            logToFile(`[FSRProtal-SQL] Retrieved ${allData.length} records from van_fuel_avg`);

            res.json({
                success: true,
                data: allData,
                total: allData.length
            });

        } catch (error) {
            logToFile(`[FSRProtal-SQL] Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch van_fuel_avg from BevproFsProd SQL',
                details: error.message
            });
        }
    }

    // GET /api/service-order-coords?orders=S0030701,S0030703
    // พิกัดร้าน (ที่อยู่ลูกค้าจาก logisticspostaladdress) ต่อใบงาน
    // ใช้ stored procedure dbo.usp_get_service_order_coords บน Fabric SQL endpoint
    async getServiceOrderCoords(req, res) {
        try {
            const orders = (req.query.orders || '').trim();

            if (!orders) {
                return res.status(400).json({
                    success: false,
                    message: 'orders query param is required (comma-separated service order ids)'
                });
            }
            // อนุญาตเฉพาะ id ตัวอักษร/ตัวเลข คั่นด้วย comma
            if (!/^[A-Za-z0-9_\-]+(\s*,\s*[A-Za-z0-9_\-]+)*$/.test(orders)) {
                return res.status(400).json({ success: false, message: 'invalid orders format' });
            }
            if (orders.split(',').length > 200) {
                return res.status(400).json({ success: false, message: 'too many orders (max 200)' });
            }

            logToFile(`[FSRProtal-SQL] API Request: /api/service-order-coords (${orders.split(',').length} orders)`);

            const data = await sqlService.getServiceOrderCoords(orders);

            res.json({
                success: true,
                data: data,
                total: data.length
            });

        } catch (error) {
            logToFile(`[FSRProtal-SQL] Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch service order coords from OneLake SQL',
                details: error.message
            });
        }
    }
}

module.exports = new FSRProtalController();
