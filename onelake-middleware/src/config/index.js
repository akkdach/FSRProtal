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
        proIoTLine: {
            tableUrl: "abfss://7b2a2b84-0f67-4d1f-8e9f-65abfa88501d@onelake.dfs.fabric.microsoft.com/65a9b9c5-98b8-4879-b9ba-88eca966929a/Tables/smaserviceorderline",
            cacheFile: path.join(__dirname, '../../data_cache_proiot_line.json')
        },
        fsrProtal: {
            // Reuse the same table and cache as ProIoT (since source is the same)
            tableUrl: "abfss://7b2a2b84-0f67-4d1f-8e9f-65abfa88501d@onelake.dfs.fabric.microsoft.com/65a9b9c5-98b8-4879-b9ba-88eca966929a/Tables/smaserviceordertable",
            cacheFile: path.join(__dirname, '../../data_cache_proiot.json')
        }
    },
    limits: {
        batchSize: 10,      // Smaller batches
        maxRecords: 50000,  // Increased to 50k
        maxFiles: 1000      // Limit to 1000 as requested
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
            trustServerCertificate: false,
            connectTimeout: 30000,
            requestTimeout: 30000,
            port: 1433
        },
        authentication: {
            type: 'azure-active-directory-service-principal-secret',
            options: {
                clientId: process.env.AZURE_CLIENT_ID,
                clientSecret: process.env.AZURE_CLIENT_SECRET,
                tenantId: process.env.AZURE_TENANT_ID
            }
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    },
    qasSql: {
        server: process.env.QAS_DB_SERVER || 'localhost',
        database: process.env.QAS_DB_DATABASE || 'BevproFsQas',
        user: process.env.QAS_DB_USER || 'sa',
        password: process.env.QAS_DB_PASSWORD || '',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            connectTimeout: 30000,
            requestTimeout: 30000,
            port: parseInt(process.env.QAS_DB_PORT) || 1433
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    },
    prodSql: {
        server: process.env.PROD_DB_SERVER || 'localhost',
        database: process.env.PROD_DB_DATABASE || 'BevproFsProd',
        user: process.env.PROD_DB_USER || 'sa',
        password: process.env.PROD_DB_PASSWORD || '',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            connectTimeout: 30000,
            requestTimeout: 30000,
            port: parseInt(process.env.PROD_DB_PORT) || 1433
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    },
    syncSql: {
        server: process.env.SYNC_DB_SERVER || '20.33.118.76',
        database: process.env.SYNC_DB_DATABASE || 'D365',
        user: process.env.SYNC_DB_USER || 'sync_user',
        password: process.env.SYNC_DB_PASSWORD || 'Dui11223344@!',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            connectTimeout: 30000,
            requestTimeout: 30000,
            port: parseInt(process.env.SYNC_DB_PORT) || 1433
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    },
    // SIMS (new system, PostgreSQL — data mirrored from D365 F&O).
    // Used by /api/request-status-sims; the original /api/request-status still reads Fabric GraphQL.
    simsDb: {
        host: process.env.SIMS_DB_HOST,
        port: Number(process.env.SIMS_DB_PORT || 5432),
        database: process.env.SIMS_DB_DATABASE,
        user: process.env.SIMS_DB_USER,
        password: process.env.SIMS_DB_PASSWORD,
        // company filter; SIMS stores DataAreaId in upper case ('BPA') while F&O uses 'bpa'
        dataAreaId: (process.env.SIMS_DB_DATA_AREA_ID || 'BPA').trim(),
        // TLS (required). SIMS_DB_SSL=true + SIMS_DB_SSL_CA = PEM of the server's self-signed certificate, so the
        // server identity is verified (pinned). Literal "\n" sequences are accepted so the PEM fits in one App Setting.
        // The certificate is not committed: it names the DB host and this repository is public.
        // Without both, the service refuses to connect (fail closed) unless SIMS_DB_SSL_INSECURE=true.
        sslEnabled: String(process.env.SIMS_DB_SSL).toLowerCase() === 'true',
        sslCa: process.env.SIMS_DB_SSL_CA ? process.env.SIMS_DB_SSL_CA.replace(/\\n/g, '\n') : null,
        insecure: String(process.env.SIMS_DB_SSL_INSECURE).toLowerCase() === 'true',
        // SCRAM channel binding: once the server certificate is verified, it also binds the login to this TLS session.
        channelBinding: String(process.env.SIMS_DB_CHANNEL_BINDING || 'true').toLowerCase() !== 'false',
        // small pool on purpose: the DB role is connection-capped server-wide and admin tool sessions
        // of the same role count against it; single-row lookups need very few connections
        max: Number(process.env.SIMS_DB_POOL_MAX || 2),
        idleTimeoutMillis: Number(process.env.SIMS_DB_IDLE_TIMEOUT_MS || 10000),
        connectionTimeoutMillis: Number(process.env.SIMS_DB_CONNECT_TIMEOUT_MS || 15000),
        statementTimeoutMillis: Number(process.env.SIMS_DB_STATEMENT_TIMEOUT_MS || 30000),
        // client-side cap (a dropped network path never reaches the server's statement_timeout)
        queryTimeoutMillis: Number(process.env.SIMS_DB_QUERY_TIMEOUT_MS || 35000)
    },
    entra: {
        tenantId: process.env.ENTRA_TENANT_ID || process.env.AZURE_TENANT_ID,
        clientId: process.env.ENTRA_CLIENT_ID
    },
    teams: {
        webhookUrl: process.env.TEAMS_WEBHOOK_URL,                  // ห้องหลัก — Technician = Yes / ว่าง
        webhookUrlNonTech: process.env.TEAMS_WEBHOOK_URL_NON_TECH,  // ห้องพนักงานที่ไม่ใช่ช่าง — Technician = No
        // ห้องงานระบบ (แชต "Noti Innovation") — ผล sync ทุกรอบ; ไม่ตั้ง = ไม่ส่ง (log warning) ไม่ fallback ไปห้อง HR
        webhookUrlSync: process.env.SYNC_TEAMS_WEBHOOK_URL || process.env.MOBILE_SYNC_TEAMS_WEBHOOK_URL,
    },
    materialMasterSync: {
        // รอบสำรองในโปรเซส (Asia/Bangkok) — cron หลายตัวคั่นด้วย ';' หรือ 'off' เพื่อปิด
        // ตัวตั้งเวลาหลักคือ GitHub Actions (.github/workflows/material-master-sync.yml) 05:30 + 13:00
        // รอบสำรองตั้งช้ากว่า 15 นาที และข้ามเองถ้าเพิ่ง sync สำเร็จภายใน dedupMinutes
        cron: process.env.MATERIAL_MASTER_CRON || '45 5 * * *;15 13 * * *',
        dedupMinutes: parseInt(process.env.MATERIAL_MASTER_DEDUP_MINUTES) || 45,
        // ประวัติรอบ sync + รายการ record ที่เปลี่ยน (JSON ต่อรอบ) — ใช้สร้าง Excel ตอนกดดาวน์โหลดจากการ์ด Teams
        // บน Azure เก็บนอก wwwroot (/home/data อยู่รอดข้าม deploy/restart); เครื่อง dev เก็บใน onelake-middleware/sync-history/ (gitignore)
        historyDir: process.env.SYNC_HISTORY_DIR
            || (process.env.WEBSITE_SITE_NAME ? '/home/data/material-master-sync' : require('path').join(__dirname, '../../sync-history')),
        historyKeep: parseInt(process.env.SYNC_HISTORY_KEEP) || 120,          // ~60 วันที่ 2 รอบ/วัน
        linkTtlDays: parseInt(process.env.SYNC_LINK_TTL_DAYS) || 14,          // อายุลิงก์ดาวน์โหลดในการ์ด Teams
        // ลิงก์ดาวน์โหลดเป็น signed URL (HMAC) เพราะเปิดจาก Teams แนบ JWT ไม่ได้ — key แยกได้ด้วย SYNC_LINK_SECRET
        linkSecret: process.env.SYNC_LINK_SECRET || process.env.JWT_SECRET,
        publicBaseUrl: (process.env.PUBLIC_BASE_URL
            || (process.env.WEBSITE_HOSTNAME ? `https://${process.env.WEBSITE_HOSTNAME}` : `http://localhost:${process.env.PORT || 3000}`)).replace(/\/$/, ''),
    },
    freezeDataPath: '/app/freeze-data',
    cache: {
        memoryDuration: 10 * 60 * 1000, // 10 minutes
        diskDuration: 24 * 60 * 60 * 1000, // 24 hours
        diskDuration: 24 * 60 * 60 * 1000, // 24 hours
        // diskFile removed, now per-project in oneLake config
    }
};
