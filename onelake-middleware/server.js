const express = require('express');
const crypto = require('crypto');
global.crypto = crypto;
const cors = require('cors');
const config = require('./src/config');
const { logToFile } = require('./src/utils/logger');

const apiRoutes = require('./src/routes/api');

const app = express();

// Middleware
app.use(cors()); // Allow all origins
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/', (req, res) => res.send('OneLake ADLS Middleware Running (MVC)'));


// Start Server
app.listen(config.port, () => {
    logToFile(`Server running on http://localhost:${config.port}`);
    logToFile(`[ProIoT] Config Loaded. Path: ${config.oneLake.proIoT.tableUrl}`);
    logToFile(`[FSRProtal] Config Loaded. DB: ${config.sql.database}`);
});
