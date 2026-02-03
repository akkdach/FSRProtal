const express = require('express');
const router = express.Router();
const proIoTController = require('../controllers/proIoTController');
const fsrProtalController = require('../controllers/fsrProtalController_graphql'); // Using GraphQL API (Port 443)

// Project: Pro IoT Board
router.get('/orders', (req, res) => proIoTController.getOrders(req, res));
router.get('/service-lines', (req, res) => proIoTController.getServiceLines(req, res));
router.get('/income', (req, res) => proIoTController.getIncome(req, res));
router.get('/baht-per-head', (req, res) => proIoTController.getBahtPerHead(req, res));
router.get('/barcode', (req, res) => proIoTController.getBarCode(req, res));

// Project: FSR Protal
router.get('/fsr-protal/orders', (req, res) => fsrProtalController.getOrders(req, res));

module.exports = router;
