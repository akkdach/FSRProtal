const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../../server_debug.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function logToFile(msg) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${msg}`;
    logStream.write(`${logMsg}\n`);
    console.log(msg); // Also log to console
}

module.exports = { logToFile };
