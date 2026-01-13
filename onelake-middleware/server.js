const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { DataLakeServiceClient } = require("@azure/storage-file-datalake");
const { DefaultAzureCredential, InteractiveBrowserCredential, ClientSecretCredential } = require("@azure/identity");
const { uncompress } = require('snappyjs');
require('dotenv').config();

// Fix for BigInt serialization in JSON (Parquet uses BigInts)
BigInt.prototype.toJSON = function () { return this.toString(); };

// Custom Logger
const logStream = fs.createWriteStream('server_debug.log', { flags: 'a' });
function logToFile(msg) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${msg}`;
    logStream.write(`${logMsg}\n`);
    console.log(msg); // Also log to console
}

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURATION ---
// Format: abfss://workspace@onelake.../Tables/smaserviceordertable
const ONELAKE_TABLE_URL = "abfss://7b2a2b84-0f67-4d1f-8e9f-65abfa88501d@onelake.dfs.fabric.microsoft.com/65a9b9c5-98b8-4879-b9ba-88eca966929a/Tables/smaserviceordertable";

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Auth Helper
async function getCredential() {
    if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
        logToFile("Using Service Principal Credential...");
        return new ClientSecretCredential(
            process.env.AZURE_TENANT_ID,
            process.env.AZURE_CLIENT_ID,
            process.env.AZURE_CLIENT_SECRET
        );
    }
    try {
        logToFile("Using Default Azure Credential...");
        const cred = new DefaultAzureCredential();
        await cred.getToken("https://storage.azure.com/.default");
        return cred;
    } catch (e) {
        logToFile("Using Interactive Browser Credential (Fallback)...");
        return new InteractiveBrowserCredential({
            redirectUri: "http://localhost:1337"
        });
    }
}

// ADLS Helper to parse URL
function parseOneLakeUrl(fullUrl) {
    if (!fullUrl || fullUrl.includes("WAITING")) return null;
    try {
        let urlObj;
        if (fullUrl.startsWith("abfss://")) {
            const parts = fullUrl.replace("abfss://", "").split("@");
            const fs = parts[0];
            const rest = parts[1].split("/");
            rest.shift(); // remove hostname
            return { filesystem: fs, path: rest.join("/") };
        } else {
            urlObj = new URL(fullUrl);
            const parts = urlObj.pathname.split("/").filter(p => p);
            const fs = parts[0];
            const filePath = parts.slice(1).join("/");
            return { filesystem: fs, path: filePath };
        }
    } catch (e) {
        logToFile(`Error parsing URL: ${e.message}`);
        return null;
    }
}

function isCurrentMonth(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    // Compare Month and Year
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// --- CACHING VARIABLES (Global) ---
let CACHED_DATA = null;
let LAST_CACHE_TIME = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes RAM Cache
const DISK_CACHE_FILE = 'data_cache_prod_v2.json'; // Persistent Disk Cache
const DISK_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Hours (Disk Cache TTL)

async function fetchParquetData() {
    logToFile("Starting fetchParquetData (Smart Deduplication - Match OneLake)...");

    // 1. Try Loading from Disk Cache First (Super Fast)
    if (fs.existsSync(DISK_CACHE_FILE)) {
        try {
            const stats = fs.statSync(DISK_CACHE_FILE);
            const age = Date.now() - stats.mtimeMs; // Age in ms

            if (age < DISK_CACHE_DURATION) {
                logToFile(`Found Disk Cache (${DISK_CACHE_FILE}). Age: ${(age / 60000).toFixed(1)} mins. Loading...`);
                const raw = fs.readFileSync(DISK_CACHE_FILE, 'utf-8');
                const data = JSON.parse(raw);
                logToFile(`Loaded ${data.length} records from Disk Cache. (Instant)`);
                return data;
            } else {
                logToFile(`Disk Cache found BUT EXPIRED (Age: ${(age / 60000).toFixed(1)} mins). Fetching fresh data...`);
                // Proceed to fetch from OneLake...
            }
        } catch (e) {
            logToFile(`Error reading disk cache: ${e.message}`);
        }
    }

    // 2. If no cache, Fetch from OneLake (Slow cold start)
    if (ONELAKE_TABLE_URL.includes("WAITING")) {
        throw new Error("OneLake Path is not configured.");
    }

    const loc = parseOneLakeUrl(ONELAKE_TABLE_URL);
    if (!loc) throw new Error("Invalid OneLake URL format.");

    logToFile(`Connecting to: ${loc.path}`);

    // Connect
    const credential = await getCredential();
    const serviceClient = new DataLakeServiceClient("https://onelake.dfs.fabric.microsoft.com", credential);
    const fsClient = serviceClient.getFileSystemClient(loc.filesystem);

    // SAFETY LIMIT
    const MAX_FILES_TO_SCAN = 1000;
    const MAX_TOTAL_RECORDS = 50000;

    const paths = fsClient.listPaths({ path: loc.path, recursive: true });

    // 1. Collect candidate files first
    const filesToProcess = [];
    let scannedCount = 0;

    logToFile("Listing files...");
    for await (const p of paths) {
        if (scannedCount >= MAX_FILES_TO_SCAN) break;
        if (p.name.endsWith(".parquet") && !p.name.includes("_delta_log")) {
            filesToProcess.push(p.name);
            scannedCount++;
        }
    }

    logToFile(`Found ${filesToProcess.length} parquet files. Starting AGGRESSIVE Concurrent scan...`);

    // 3. Process in Batches (Safer Concurrency)
    // Optimization: User requested BATCH_SIZE = 20
    const BATCH_SIZE = 20;
    const uniqueRecords = new Map(); // Use Map for Deduplication
    const { parquetReadObjects } = await import('hyparquet');

    // Helper: Retry Download
    async function downloadWithRetry(fileClient, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fileClient.read();
            } catch (e) {
                if (i === retries - 1) throw e;
                // Wait before retry (1s, 2s, 3s...)
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
    }

    for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
        if (uniqueRecords.size >= MAX_TOTAL_RECORDS) break;

        const batch = filesToProcess.slice(i, i + BATCH_SIZE);
        logToFile(`Processing batch ${i / BATCH_SIZE + 1} (${batch.length} files)...`);

        await Promise.all(batch.map(async (fileName) => {
            if (uniqueRecords.size >= MAX_TOTAL_RECORDS) return;

            try {
                const fileClient = fsClient.getFileClient(fileName);
                // Use Retry Logic
                const downloadResponse = await downloadWithRetry(fileClient);

                // Read into buffer
                const chunks = [];
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                const arrayBuffer = Uint8Array.from(buffer).buffer;

                const data = await parquetReadObjects({
                    file: arrayBuffer,
                    compressors: { SNAPPY: (data) => uncompress(data) }
                });

                if (Array.isArray(data)) {
                    for (const row of data) {
                        if (isCurrentMonth(row.bpc_slafinishdate)) {
                            // Smart Deduplication: Key = serviceorderid
                            // If row exists, Map.set() will overwrite it with the new one found (likely newer file)
                            if (row.serviceorderid) {
                                uniqueRecords.set(row.serviceorderid, row);
                            }
                        }
                    }
                }
            } catch (e) {
                logToFile(`Error processing ${fileName}: ${e.message}`);
            }
        }));

        // Stability: Longer pause between batches to let network breathe
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const records = Array.from(uniqueRecords.values());
    logToFile(`Scan Complete. Unique Matching Records: ${records.length}`);

    // 4. Save to Disk Cache (For next time)
    try {
        fs.writeFileSync(DISK_CACHE_FILE, JSON.stringify(records));
        logToFile(`Saved ${records.length} records to ${DISK_CACHE_FILE}`);
    } catch (e) {
        logToFile(`Error saving disk cache: ${e.message}`);
    }

    return records;
}

// Routes
app.get('/api/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 100;

        logToFile(`API Request: /api/orders?page=${page}&limit=${limit}`);

        // --- CACHING LOGIC ---
        // Validate Cache
        if (CACHED_DATA && (Date.now() - LAST_CACHE_TIME < CACHE_DURATION)) {
            logToFile("Serving from CACHE (Instant Load)");
        } else {
            logToFile("Cache expired or empty. Fetching new data...");
            const newData = await fetchParquetData();
            // Only update cache if we got data (safety check)
            if (newData.length > 0 || !CACHED_DATA) {
                CACHED_DATA = newData;
                LAST_CACHE_TIME = Date.now();
            }
        }

        // Serve from (likely cached) data
        const allData = CACHED_DATA || [];
        const total = allData.length;
        const startIndex = page * limit;
        const endIndex = startIndex + limit;
        const slicedData = allData.slice(startIndex, endIndex);

        logToFile(`Response: Returning ${slicedData.length} records (from total ${total})`);

        res.json({
            data: slicedData,
            total: total,
            page: page,
            limit: limit
        });
    } catch (err) {
        logToFile(`API Error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.send('OneLake ADLS Middleware Running'));

app.listen(port, () => {
    logToFile(`Server running on http://localhost:${port}`);
    logToFile(`OneLake Path: ${ONELAKE_TABLE_URL}`);
});
