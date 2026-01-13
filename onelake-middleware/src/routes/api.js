const express = require('express');
const router = express.Router();
const proIoTController = require('../controllers/proIoTController');
const fsrProtalController = require('../controllers/fsrProtalController');

// Project: Pro IoT Board
router.get('/orders', (req, res) => proIoTController.getOrders(req, res));

// Project: FSR Protal
router.get('/fsr-protal/orders', (req, res) => fsrProtalController.getOrders(req, res));

module.exports = router;
