const express = require('express');
const crypto = require('crypto');
global.crypto = crypto;
const cors = require('cors');
const config = require('./src/config');
const { logToFile } = require('./src/utils/logger');

const apiRoutes = require('./src/routes/api');
const { validateJwt } = require('./src/middleware/authMiddleware');
const { validateBasicAuth } = require('./src/middleware/basicAuthMiddleware');
const fsrProtalController = require('./src/controllers/fsrProtalController_graphql');

const app = express();

// Middleware
app.use(cors()); // Allow all origins
app.use(express.json({ limit: '100mb' }));

// Routes with Basic Auth (registered before JWT middleware)
app.get('/api/request-status/:referencedPoNumber', validateBasicAuth, (req, res) => fsrProtalController.getRequestStatus(req, res));

// Routes (JWT protected)
app.use('/api', validateJwt, apiRoutes);

// Health Check
app.get('/', (req, res) => res.send('OneLake ADLS Middleware Running (MVC)'));


// Start Server
app.listen(config.port, () => {
    logToFile(`Server running on http://localhost:${config.port}`);
    logToFile(`[ProIoT] Config Loaded. Path: ${config.oneLake.proIoT.tableUrl}`);
    logToFile(`[FSRProtal] Config Loaded. DB: ${config.sql.database}`);
});
