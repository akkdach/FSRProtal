const express = require('express');
const router = express.Router();
const proIoTController = require('../controllers/proIoTController');
const fsrProtalController = require('../controllers/fsrProtalController_graphql'); // Using GraphQL API (Port 443)
const reportController = require('../controllers/reportController');
const otherController = require('../controllers/otherController');

console.log('--- API Routes File Loaded ---');
if (proIoTController.getServiceObjects) {
    console.log('proIoTController.getServiceObjects exists');
} else {
    console.error('proIoTController.getServiceObjects DOES NOT exist');
}

// Project: Pro IoT Board
router.get('/orders', (req, res) => proIoTController.getOrders(req, res));
router.get('/service-lines', (req, res) => proIoTController.getServiceLines(req, res));
router.get('/income', (req, res) => proIoTController.getIncome(req, res));
router.get('/baht-per-head', (req, res) => proIoTController.getBahtPerHead(req, res));
router.get('/barcode', (req, res) => proIoTController.getBarCode(req, res));
router.get('/jobs-per-man', (req, res) => proIoTController.getJobsPerMan(req, res));
router.get('/bn09-internal-work', (req, res) => proIoTController.getBN09InternalWork(req, res));
router.get('/service-objects-npso', (req, res) => proIoTController.getServiceObjects(req, res));

// Project: FSR Protal
router.get('/fsr-protal/orders', (req, res) => fsrProtalController.getOrders(req, res));

// Project: Report Tracking (SharePoint Excel)
router.get('/report-tracking', (req, res) => reportController.getReportTracking(req, res));
router.get('/report-tracking/sheets', (req, res) => reportController.getReportSheets(req, res));

// Project: Other (Generic GraphQL Query)
router.get('/other', (req, res) => otherController.getData(req, res));

module.exports = router;
