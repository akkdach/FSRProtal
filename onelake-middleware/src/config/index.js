require('dotenv').config();
const path = require('path');

module.exports = {
    port: process.env.PORT || 3000,
    oneLake: {
        accountUrl: "https://onelake.dfs.fabric.microsoft.com",
        proIoT: {
            tableUrl: "abfss://7b2a2b84-0f67-4d1f-8e9f-65abfa88501d@onelake.dfs.fabric.microsoft.com/65a9b9c5-98b8-4879-b9ba-88eca966929a/Tables/smaserviceordertable",
            cacheFile: path.join(__dirname, '../../data_cache_proiot.json')
        },
        fsrProtal: {
            // Reuse the same table and cache as ProIoT (since source is the same)
            tableUrl: "abfss://7b2a2b84-0f67-4d1f-8e9f-65abfa88501d@onelake.dfs.fabric.microsoft.com/65a9b9c5-98b8-4879-b9ba-88eca966929a/Tables/smaserviceordertable",
            cacheFile: path.join(__dirname, '../../data_cache_proiot.json')
        }
    },
    limits: {
        batchSize: 10,      // Smaller batches
        maxRecords: 5000,
        maxFiles: 200       // Increased to find BN15 data
    },
    auth: {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET
    },
    sql: {
        server: "zf7yrpjhd77uxedw7r2suvgpv4-qqvsu63hb4pu3du7mwv7vccqdu.datawarehouse.fabric.microsoft.com",
        database: "dataverse_bevproasia_cds2_workspace_unq520782ff3395f011a701000d3aa2b",
        options: {
            encrypt: true,
            trustServerCertificate: true
        },
        authentication: {
            type: 'azure-active-directory-service-principal-secret',
            options: {
                clientId: process.env.AZURE_CLIENT_ID,
                clientSecret: process.env.AZURE_CLIENT_SECRET,
                tenantId: process.env.AZURE_TENANT_ID
            }
        }
    },
    cache: {
        memoryDuration: 10 * 60 * 1000, // 10 minutes
        diskDuration: 24 * 60 * 60 * 1000, // 24 hours
        diskDuration: 24 * 60 * 60 * 1000, // 24 hours
        // diskFile removed, now per-project in oneLake config
    }
};
