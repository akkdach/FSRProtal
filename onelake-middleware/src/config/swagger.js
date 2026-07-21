// ========== Shared building blocks ==========
const JWT = [{ BearerAuth: [] }];
const BASIC = [{ BasicAuth: [] }];

const pageParams = (defaultLimit = 100) => [
    { name: 'page', in: 'query', description: 'หน้าที่ต้องการ (เริ่มที่ 0)', schema: { type: 'integer', default: 0 } },
    { name: 'limit', in: 'query', description: 'จำนวนรายการต่อหน้า', schema: { type: 'integer', default: defaultLimit } }
];

const listResponse = (description) => ({
    '200': {
        description,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'array', items: { type: 'object' } },
                        total: { type: 'integer', example: 1250 },
                        page: { type: 'integer', example: 0 },
                        limit: { type: 'integer', example: 100 }
                    }
                }
            }
        }
    },
    '401': { description: 'Unauthorized' },
    '500': { description: 'Server error' }
});

// Pro IoT Board endpoints ใช้รูปแบบเดียวกันหมด (page/limit + response ทรงเดียวกัน)
const proIoT = (summary, extraParams = [], description) => ({
    get: {
        tags: ['📊 Pro IoT Board'],
        summary,
        ...(description ? { description } : {}),
        security: JWT,
        parameters: [...pageParams(), ...extraParams],
        responses: listResponse(summary)
    }
});

// Sync endpoints ทั้ง 19 เส้นใช้ Basic Auth และไม่รับ parameter ใดๆ
const syncOp = (label, sourceView, targetTable, mode) => ({
    post: {
        tags: ['🔄 Sync (F&O → SQL)'],
        summary: `Sync ${label}`,
        description: `ดึง ${sourceView} จาก Fabric GraphQL → เขียนลงตาราง ${targetTable} (${mode})\n\nใช้ Basic Auth (SYNC_AUTH_USER / SYNC_AUTH_PASS) แทน JWT`,
        security: BASIC,
        responses: {
            '200': {
                description: 'Sync สำเร็จ',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean', example: true },
                                message: { type: 'string', example: `${label} Sync completed successfully` },
                                data: {
                                    type: 'object',
                                    properties: {
                                        mode: { type: 'string', example: mode },
                                        total: { type: 'integer', example: 5862 }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '401': { description: 'Unauthorized (Basic Auth)' },
            '500': { description: 'Sync failed' }
        }
    }
});

// ========== Sync endpoint table ==========
const TRUNCATE_LOAD = 'Truncate + Full Load';
const SYNC_ENDPOINTS = [
    ['service-order-table-sync', 'ServiceOrderTable', 'ServiceOrderTable_Import_DataBase_238', 'ServiceOrderTable_Sync'],
    ['service-order-line-sync', 'ServiceOrderLine', 'ServiceOrderLine_Import_DataBase_238', 'ServiceOrderLine_Sync'],
    ['service-object-table-sync', 'ServiceObjectTable', 'ServiceObjectTable_Import_DataBase_238', 'ServiceObjectTable_Sync'],
    ['pickingroute-sync', 'PickingRoute', 'Pickingroute_Import_DataBase_238', 'Pickingroute_Sync'],
    ['reasontable-sync', 'ReasonTable', 'Reasontable_Import_DataBase_238', 'Reasontable_Sync'],
    ['logisticspostaladdress-sync', 'LogisticsPostalAddress', 'Logisticspostaladdress_Import_DataBase_238', 'Logisticspostaladdress_Sync'],
    ['logisticslocation-sync', 'LogisticsLocation', 'Logisticslocation_Import_DataBase_238', 'Logisticslocation_Sync'],
    ['inventtransorigin-sync', 'InventTransOrigin', 'Inventtransorigin_Import_DataBase_238', 'Inventtransorigin_Sync'],
    ['inventtransfertable-sync', 'InventTransferTable', 'Inventtransfertable_Import_DataBase_238', 'Inventtransfertable_Sync'],
    ['inventtransferline-sync', 'InventTransferLine', 'Inventtransferline_Import_DataBase_238', 'Inventtransferline_Sync'],
    ['inventtrans-sync', 'InventTrans', 'Inventtrans_Import_DataBase_238', 'Inventtrans_Sync'],
    ['inventtable-sync', 'InventTable', 'Inventtable_Import_DataBase_238', 'Inventtable_Sync'],
    ['inventsum-sync', 'InventSum', 'Inventsum_Import_DataBase_238', 'Inventsum_Sync'],
    ['hcmworker-sync', 'HcmWorker', 'Hcmworker_Import_DataBase_238', 'Hcmworker_Sync'],
    ['dirpersonname-sync', 'DirPersonName', 'Dirpersonname_Import_DataBase_238', 'Dirpersonname_Sync'],
    ['dirperson-sync', 'DirPerson', 'Dirperson_Import_DataBase_238', 'Dirperson_Sync'],
    ['custtable-sync', 'CustTable', 'Custtable_Import_DataBase_238', 'Custtable_Sync'],
    ['maintenanceactivitytype-sync', 'MaintenanceActivityType', 'Maintenanceactivitytype_Import_DataBase_238', 'Maintenanceactivitytype_Sync']
];

const syncPaths = {};
SYNC_ENDPOINTS.forEach(([route, label, sourceView, targetTable]) => {
    syncPaths[`/api/sync/${route}`] = syncOp(label, sourceView, targetTable, TRUNCATE_LOAD);
});
// Material Master ใช้ MERGE (upsert) ลง PROD ไม่ truncate — มี cron รันทุกวัน 08:45 (Asia/Bangkok)
syncPaths['/api/sync/material-master-sync'] = syncOp(
    'Material Master', 'Sync_Material_master', 'material_master (BevproFsProd)', 'Upsert (MERGE)'
);

// ========== Manpower / Worker field schemas ==========
const manpowerProperties = {
    Seat_ID: { type: 'string' },
    Parent_Seat_ID: { type: 'string' },
    EmployeeCode: { type: 'string', example: 'BP1234' },
    FullName: { type: 'string', example: 'สมชาย ใจดี' },
    Position: { type: 'string', example: 'Service Technician' },
    Department: { type: 'string' },
    WorkLocation: { type: 'string' },
    Region_Code: { type: 'string' },
    VanNo: { type: 'string', example: 'V-101' },
    LicensePlate: { type: 'string' },
    TelephoneNo: { type: 'string' },
    CostCenter: { type: 'string' },
    NewCostCenter: { type: 'string' },
    ActivityInsRm: { type: 'string' },
    DirectReport: { type: 'string' },
    Remarks: { type: 'string' },
    Target_Per_Head: { type: 'string' },
    SD2: { type: 'string' },
    Supervisor: { type: 'string' },
    No_Leader: { type: 'string' },
    Status: { type: 'string', example: 'Active' },
    Technician: { type: 'string' },
    Team: { type: 'string' },
    ModifyDate: { type: 'string', format: 'date-time' },
    HR_Status: { type: 'string', default: 'DRAFT', description: 'ถ้าเป็น DRAFT ระบบจะส่ง Teams notification' },
    Type: { type: 'string' },
    ResignDate: { type: 'string', format: 'date' },
    StartDate: { type: 'string', format: 'date' },
    Edit_By: { type: 'string' },
    VehicleType: { type: 'string' },
    'F&O User': { type: 'string', description: 'ชื่อ user ในระบบ D365 F&O' }
};

const workerProperties = {
    EmployeeCode: { type: 'string', example: 'BP1234' },
    FullName: { type: 'string' },
    Position: { type: 'string' },
    Department: { type: 'string' },
    WorkLocation: { type: 'string' },
    VanNo: { type: 'string' },
    LicensePlate: { type: 'string' },
    TelephoneNo: { type: 'string' },
    Supervisor: { type: 'string' },
    SD2: { type: 'string' },
    CostCenter: { type: 'string' },
    NewCostCenter: { type: 'string' },
    ActivityInsRm: { type: 'string' },
    DirectReport: { type: 'string' },
    No_Leader: { type: 'string' },
    Status: { type: 'string' }
};

const jsonBody = (properties, required = []) => ({
    required: true,
    content: {
        'application/json': {
            schema: { type: 'object', ...(required.length ? { required } : {}), properties }
        }
    }
});

const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'OneLake Middleware API',
        version: '1.0.13',
        description: [
            'Middleware API สำหรับเชื่อมต่อ Fabric OneLake, Fabric GraphQL, SQL Server (BevproFsProd / BevproFsQas / D365) และ Microsoft Entra ID Login',
            '',
            '**การยืนยันตัวตนมี 2 แบบ**',
            '- `BearerAuth` (JWT) — ใช้กับ endpoint ส่วนใหญ่ ขอ token ได้จาก `POST /api/auth/login`',
            '- `BasicAuth` — ใช้เฉพาะกลุ่ม Sync และ Request Status (เรียกจากระบบภายนอก/cron)'
        ].join('\n')
    },
    servers: [
        { url: 'http://20.6.32.81', description: 'Production' },
        { url: 'http://localhost:3005', description: 'Local Development' }
    ],
    tags: [
        { name: '🔐 Authentication', description: 'Login และข้อมูลผู้ใช้' },
        { name: '🔄 Sync (F&O → SQL)', description: 'ดึงข้อมูลจาก D365 F&O ผ่าน Fabric GraphQL ลง SQL Server (Basic Auth)' },
        { name: '📊 Pro IoT Board', description: 'ข้อมูล Dashboard จาก Fabric GraphQL' },
        { name: '📋 FSR Protal', description: 'Service Orders และ Service Header' },
        { name: '📦 BOM Referbush', description: 'ข้อมูล BOM สำหรับงาน Refurbish' },
        { name: '👷 Manpower & Worker', description: 'จัดการข้อมูลกำลังคน ช่าง และ Work Center' },
        { name: '📅 Holiday', description: 'วันหยุดประจำปี' },
        { name: '⚙️ Master Data', description: 'ตัวเลือก Dropdown ต่างๆ' },
        { name: '❄️ Freeze Income', description: 'บันทึกข้อมูลรายได้แบบ Freeze เป็นไฟล์' },
        { name: '💾 Cache Income', description: 'Cache ข้อมูลรายได้ในหน่วยความจำ/ดิสก์' },
        { name: '📑 Report Tracking', description: 'อ่านไฟล์ Excel จาก SharePoint' },
        { name: '📝 Request Status', description: 'สถานะคำขอ (Basic Auth)' },
        { name: '🧩 Other', description: 'Generic GraphQL query' },
        { name: '🛠️ System', description: 'Health check, รูปภาพ, และ webhook ทดสอบ' }
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'ใส่ JWT Token ที่ได้จาก /api/auth/login'
            },
            BasicAuth: {
                type: 'http',
                scheme: 'basic',
                description: 'ใช้กับกลุ่ม Sync และ Request Status (username/password จาก environment)'
            }
        }
    },
    paths: {
        // ========== Auth ==========
        '/api/auth/login': {
            post: {
                tags: ['🔐 Authentication'],
                summary: 'Login ด้วย Entra ID Token',
                description: 'ส่ง Entra ID Access Token มา → Backend ตรวจสอบกับ Microsoft → ออก JWT ของระบบเราให้',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['token'],
                                properties: {
                                    token: {
                                        type: 'string',
                                        description: 'Entra ID Access Token จาก Frontend (MSAL)',
                                        example: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJS...'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Login สำเร็จ — ได้ JWT กลับมา',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        token: { type: 'string', description: 'Internal JWT Token' },
                                        user: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string', example: 'Ronnachai P.' },
                                                email: { type: 'string', example: 'ronnachai@bevproasia.com' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Entra Token ไม่ถูกต้องหรือหมดอายุ' }
                }
            }
        },
        '/api/auth/me': {
            get: {
                tags: ['🔐 Authentication'],
                summary: 'ดึงข้อมูลผู้ใช้ที่ Login อยู่',
                security: JWT,
                responses: {
                    '200': {
                        description: 'ข้อมูลผู้ใช้',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        user: { type: 'string' },
                                        name: { type: 'string' },
                                        email: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'ไม่มี Token หรือ Token หมดอายุ' }
                }
            }
        },

        // ========== Sync (F&O → SQL) ==========
        ...syncPaths,

        // ========== BOM Referbush ==========
        '/api/bom-referbush': {
            get: {
                tags: ['📦 BOM Referbush'],
                summary: 'ดึงข้อมูล BOM_Referbush จาก BevproFsQas',
                security: JWT,
                responses: {
                    '200': {
                        description: 'รายการ BOM_Referbush ทั้งหมด',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    Id: { type: 'integer', example: 1 },
                                                    ServiceOrderTypeCode: { type: 'string', example: 'ZC15' },
                                                    StandardServiceCode: { type: 'string', example: 'ZC15-0003' },
                                                    LineNo: { type: 'integer', example: 10000 },
                                                    Type: { type: 'string', example: 'Item' },
                                                    No: { type: 'string', example: '17017326' },
                                                    Description: { type: 'string' },
                                                    Quantity: { type: 'number', example: 1 },
                                                    UnitOfMeasureCode: { type: 'string', example: 'PCE' },
                                                    MIMJ: { type: 'string', example: 'Major A3' },
                                                    DescEng: { type: 'string' },
                                                    ModelNo: { type: 'string', example: '40000019' },
                                                    ServiceObjectGroup: { type: 'string', example: 'TCO' }
                                                }
                                            }
                                        },
                                        total: { type: 'integer', example: 58 }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Unauthorized' },
                    '500': { description: 'Database connection error' }
                }
            }
        },

        // ========== FSR Protal ==========
        '/api/fsr-protal/orders': {
            get: {
                tags: ['📋 FSR Protal'],
                summary: 'ดึง Service Orders (GraphQL)',
                security: JWT,
                parameters: [
                    {
                        name: 'view',
                        in: 'query',
                        description: 'ชื่อ View ที่ต้องการ (ถ้าไม่ตรงรายการนี้จะได้ 400)',
                        schema: {
                            type: 'string',
                            enum: [
                                'Service_BN04_Install', 'Service_BN09_Remove', 'Service_BN15_Refurbish',
                                'Service_BN15_Refurbish_NB2CLOAN', 'Service_BN09_Remove_NB2CLOAN',
                                'Service_Summary_All', 'Performance_Matrix', 'ServiceOrder_QRCode',
                                'service_BN04_NB2CLOAN_New', 'Service_BN04_New', 'service_BN15_New',
                                'service_BN09_NB2CLOAN_New', 'Service_BN09_New', 'service_BN15_NB2CLOAN_New',
                                'Service_BN04_New_B2B', 'Service_BN09_New_B2B', 'Service_BN15_New_B2B',
                                'Service_BN02_New', 'Service_BN02_New_B2B', 'Service_BN01_New_B2B',
                                'Service_RequiField_Dispatch', 'Service_New_B2B', 'Service_New_NB2C'
                            ],
                            default: 'Service_BN15_Refurbish'
                        }
                    },
                    ...pageParams()
                ],
                responses: {
                    '200': { description: 'รายการ Service Orders' },
                    '400': { description: 'Invalid view name' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/service-header': {
            get: {
                tags: ['📋 FSR Protal'],
                summary: 'ดึง Service Header',
                security: JWT,
                parameters: [
                    {
                        name: 'ticketno',
                        in: 'query',
                        description: 'เลขที่ Ticket ที่ต้องการดู Header',
                        schema: { type: 'string' },
                        example: 'TK00012345'
                    }
                ],
                responses: {
                    '200': { description: 'Service Header data' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },

        // ========== Pro IoT Board ==========
        '/api/orders': proIoT('ดึง Orders', [
            {
                name: 'view',
                in: 'query',
                description: 'ระบุ Performance_Matrix เพื่อดึงข้อมูล Performance Matrix แทน',
                schema: { type: 'string', enum: ['Performance_Matrix'] }
            }
        ]),
        '/api/income': proIoT('ดึง Income', [
            { name: 'FromDate', in: 'query', description: 'วันเริ่มต้น (ISO) — ค่าเริ่มต้นคือต้นเดือนปัจจุบัน', schema: { type: 'string', format: 'date' } },
            { name: 'ToDate', in: 'query', description: 'วันสิ้นสุด (ISO) — ค่าเริ่มต้นคือสิ้นเดือนปัจจุบัน', schema: { type: 'string', format: 'date' } }
        ]),
        '/api/baht-per-head': proIoT('ดึง Baht Per Head', [
            { name: 'FromDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'ToDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'Van', in: 'query', description: 'กรองตามหมายเลขรถ', schema: { type: 'string' } }
        ]),
        '/api/tradecodetable': proIoT('ดึง Trade Code Table'),
        '/api/service-lines': proIoT('ดึง Service Lines'),
        '/api/barcode': proIoT('ดึง Service Order Barcode', [
            { name: 'status', in: 'query', description: 'กรองตามสถานะ', schema: { type: 'string' } }
        ]),
        '/api/jobs-per-man': proIoT('ดึง Jobs Per Man', [
            { name: 'FromDate', in: 'query', required: true, description: 'จำเป็น — ถ้าไม่ส่งจะได้ 400', schema: { type: 'string', format: 'date' } },
            { name: 'ToDate', in: 'query', required: true, description: 'จำเป็น — ถ้าไม่ส่งจะได้ 400', schema: { type: 'string', format: 'date' } }
        ], 'ต้องระบุ FromDate และ ToDate เสมอ'),
        '/api/bn09-internal-work': proIoT('ดึง BN09 Internal Work', [
            { name: 'StartDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
            { name: 'EndDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } }
        ], 'ต้องระบุ StartDate และ EndDate เสมอ'),
        '/api/service-objects-npso': proIoT('ดึง Service Objects (Internal Work NPSO)'),
        '/api/service-objects-internal-work': proIoT('ดึง Service Objects (Internal Work)'),
        '/api/dispatch-pending': proIoT('ดึง Dispatch Pending (All)'),
        '/api/dispatch-pending-fountain': proIoT('ดึง Dispatch Pending (Fountain)'),
        '/api/dispatch-pending-new-customer': proIoT('ดึง Dispatch Pending (New Customer)'),
        '/api/dispatch-pending-cooler': proIoT('ดึง Dispatch Pending (Cooler)'),
        '/api/dispatch-plan-pending': proIoT('ดึง Dispatch Plan Pending'),
        '/api/operation-evaluate-post-fins': proIoT('ดึง Operation Evaluate (Post FINS)', [
            { name: 'StartDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
            { name: 'FinishDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } }
        ], 'ต้องระบุ StartDate และ FinishDate เสมอ'),
        '/api/operation-evaluate-inpr-init': proIoT('ดึง Operation Evaluate (INPR/INIT)', [
            { name: 'StartDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
            { name: 'FinishDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } }
        ], 'ต้องระบุ StartDate และ FinishDate เสมอ'),
        '/api/inventtable-views': proIoT('ดึง InventTable Views'),
        '/api/inventtransfer': proIoT('ดึง Inventory Transfer'),
        '/api/service-level-refurbish': proIoT('ดึง Service Level Refurbish'),
        '/api/out-of-stock-inventsum': proIoT('ดึง Out Of Stock (InventSum)'),
        '/api/service_Line': proIoT('ดึง Service Line ตาม Service Order', [
            { name: 'serviceorderid', in: 'query', description: 'เลขที่ Service Order', schema: { type: 'string' } }
        ]),

        // ========== Manpower & Worker ==========
        '/api/manpower': {
            get: {
                tags: ['👷 Manpower & Worker'],
                summary: 'ดึงรายการ Manpower',
                security: JWT,
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
                    { name: 'limit', in: 'query', description: 'ใส่ 0 เพื่อดึงทั้งหมด', schema: { type: 'integer', default: 0 } }
                ],
                responses: listResponse('รายการ Manpower')
            },
            post: {
                tags: ['👷 Manpower & Worker'],
                summary: 'เพิ่ม Manpower',
                description: 'ถ้า HR_Status เป็น DRAFT ระบบจะส่ง Teams notification อัตโนมัติ',
                security: JWT,
                requestBody: jsonBody(manpowerProperties),
                responses: {
                    '201': { description: 'สร้างสำเร็จ' },
                    '401': { description: 'Unauthorized' },
                    '500': { description: 'Server error' }
                }
            }
        },
        '/api/manpower/{no}': {
            put: {
                tags: ['👷 Manpower & Worker'],
                summary: 'แก้ไข Manpower',
                description: 'ส่งเฉพาะ field ที่ต้องการแก้ได้ (partial update)',
                security: JWT,
                parameters: [{ name: 'no', in: 'path', required: true, schema: { type: 'integer' }, example: 101 }],
                requestBody: jsonBody(manpowerProperties),
                responses: {
                    '200': { description: 'แก้ไขสำเร็จ' },
                    '400': { description: 'Invalid manpower No' },
                    '401': { description: 'Unauthorized' }
                }
            },
            delete: {
                tags: ['👷 Manpower & Worker'],
                summary: 'ลบ Manpower',
                security: JWT,
                parameters: [
                    { name: 'no', in: 'path', required: true, schema: { type: 'integer' }, example: 101 },
                    { name: 'deletedBy', in: 'query', description: 'ผู้ลบ (ใช้บันทึก log และแจ้ง Teams)', schema: { type: 'string' } },
                    { name: 'deletedName', in: 'query', schema: { type: 'string' } },
                    { name: 'deletedCode', in: 'query', schema: { type: 'string' } }
                ],
                responses: {
                    '200': { description: 'ลบสำเร็จ' },
                    '400': { description: 'Invalid manpower No' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/worker': {
            get: {
                tags: ['👷 Manpower & Worker'],
                summary: 'ดึงรายการ Worker',
                security: JWT,
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
                    { name: 'limit', in: 'query', description: 'ใส่ 0 เพื่อดึงทั้งหมด', schema: { type: 'integer', default: 0 } }
                ],
                responses: listResponse('รายการ Worker')
            },
            post: {
                tags: ['👷 Manpower & Worker'],
                summary: 'เพิ่ม Worker',
                security: JWT,
                requestBody: jsonBody(workerProperties),
                responses: {
                    '201': { description: 'สร้างสำเร็จ' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/worker/{no}': {
            put: {
                tags: ['👷 Manpower & Worker'],
                summary: 'แก้ไข Worker',
                security: JWT,
                parameters: [{ name: 'no', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: jsonBody(workerProperties),
                responses: {
                    '200': { description: 'แก้ไขสำเร็จ' },
                    '400': { description: 'Invalid worker No' },
                    '401': { description: 'Unauthorized' }
                }
            },
            delete: {
                tags: ['👷 Manpower & Worker'],
                summary: 'ลบ Worker',
                security: JWT,
                parameters: [{ name: 'no', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'ลบสำเร็จ' },
                    '400': { description: 'Invalid worker No' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/work-log': {
            get: {
                tags: ['👷 Manpower & Worker'],
                summary: 'ดึง Work Log',
                security: JWT,
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
                    { name: 'limit', in: 'query', description: 'ไม่ระบุ = ดึงทั้งหมด', schema: { type: 'integer' } }
                ],
                responses: listResponse('รายการ Work Log')
            }
        },
        '/api/work-center': {
            get: {
                tags: ['👷 Manpower & Worker'],
                summary: 'ดึงรายการ Work Center',
                security: JWT,
                responses: listResponse('รายการ Work Center')
            }
        },
        '/api/van-fuel-avg': {
            get: {
                tags: ['👷 Manpower & Worker'],
                summary: 'ดึงค่าเฉลี่ยการใช้น้ำมันของรถแต่ละคัน',
                security: JWT,
                responses: listResponse('ค่าเฉลี่ยน้ำมันต่อคัน')
            }
        },

        // ========== Holiday ==========
        '/api/holidays': {
            get: {
                tags: ['📅 Holiday'],
                summary: 'ดึงรายการวันหยุด',
                description: 'คืนค่าเป็น array ตรงๆ ไม่ได้ห่อด้วย { success, data }',
                security: JWT,
                responses: {
                    '200': {
                        description: 'รายการวันหยุด',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            date: { type: 'string', format: 'date', example: '2026-12-31' },
                                            name: { type: 'string', example: 'วันสิ้นปี' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Unauthorized' }
                }
            },
            post: {
                tags: ['📅 Holiday'],
                summary: 'เพิ่ม/แก้ไขวันหยุด',
                description: 'เป็น upsert (MERGE) — ถ้ามีวันที่นั้นอยู่แล้วจะอัปเดตชื่อแทน CreateBy ดึงจาก JWT อัตโนมัติ',
                security: JWT,
                requestBody: jsonBody({
                    date: { type: 'string', format: 'date', example: '2026-12-31' },
                    name: { type: 'string', example: 'วันสิ้นปี' }
                }, ['date', 'name']),
                responses: {
                    '200': { description: 'บันทึกสำเร็จ' },
                    '400': { description: 'ต้องระบุ date และ name' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/holidays/{date}': {
            delete: {
                tags: ['📅 Holiday'],
                summary: 'ลบวันหยุด',
                description: 'ลบถาวร (hard delete)',
                security: JWT,
                parameters: [
                    { name: 'date', in: 'path', required: true, schema: { type: 'string', format: 'date' }, example: '2026-12-31' }
                ],
                responses: {
                    '200': { description: 'ลบสำเร็จ' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },

        // ========== Master Data ==========
        '/api/master/dropdowns': {
            get: {
                tags: ['⚙️ Master Data'],
                summary: 'ดึงตัวเลือก Dropdown',
                security: JWT,
                parameters: [
                    { name: 'category', in: 'query', description: 'กรองเฉพาะหมวดที่ต้องการ', schema: { type: 'string' }, example: 'Position' }
                ],
                responses: {
                    '200': {
                        description: 'รายการตัวเลือก',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    OptionID: { type: 'integer', example: 12 },
                                                    Category: { type: 'string', example: 'Position' },
                                                    OptionName: { type: 'string', example: 'Service Technician' },
                                                    Description: { type: 'string' },
                                                    IsActive: { type: 'boolean', example: true },
                                                    CreatedBy: { type: 'string' },
                                                    CreatedDate: { type: 'string', format: 'date-time' },
                                                    UpdatedBy: { type: 'string' },
                                                    UpdatedDate: { type: 'string', format: 'date-time' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Unauthorized' }
                }
            },
            post: {
                tags: ['⚙️ Master Data'],
                summary: 'เพิ่มตัวเลือก Dropdown',
                security: JWT,
                requestBody: jsonBody({
                    category: { type: 'string', example: 'Position' },
                    optionName: { type: 'string', example: 'Service Technician' },
                    description: { type: 'string' },
                    createdBy: { type: 'string' }
                }, ['category', 'optionName']),
                responses: {
                    '201': { description: 'สร้างสำเร็จ' },
                    '400': { description: 'ต้องระบุ category และ optionName' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/master/dropdowns/{id}': {
            put: {
                tags: ['⚙️ Master Data'],
                summary: 'แก้ไขตัวเลือก Dropdown',
                security: JWT,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 12 }],
                requestBody: jsonBody({
                    optionName: { type: 'string' },
                    description: { type: 'string' },
                    isActive: { type: 'boolean' },
                    updatedBy: { type: 'string' }
                }, ['optionName']),
                responses: {
                    '200': { description: 'แก้ไขสำเร็จ' },
                    '400': { description: 'ต้องระบุ optionName' },
                    '401': { description: 'Unauthorized' }
                }
            },
            delete: {
                tags: ['⚙️ Master Data'],
                summary: 'ลบตัวเลือก Dropdown',
                description: 'เป็น soft delete — ตั้ง IsActive = 0 ไม่ได้ลบแถวจริง',
                security: JWT,
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                    { name: 'updatedBy', in: 'query', description: 'ถ้าไม่ระบุจะใช้ SYSTEM', schema: { type: 'string', default: 'SYSTEM' } }
                ],
                responses: {
                    '200': { description: 'ลบสำเร็จ' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },

        // ========== Freeze Income ==========
        '/api/freeze-income': {
            post: {
                tags: ['❄️ Freeze Income'],
                summary: 'Freeze ข้อมูล Income เป็นไฟล์',
                security: JWT,
                requestBody: jsonBody({
                    fromMonth: { type: 'string', example: '2026-01', description: 'รูปแบบ YYYY-MM' },
                    toMonth: { type: 'string', example: '2026-06', description: 'รูปแบบ YYYY-MM' }
                }, ['fromMonth', 'toMonth']),
                responses: {
                    '200': { description: 'Freeze สำเร็จ' },
                    '400': { description: 'ต้องระบุ fromMonth และ toMonth' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/freeze-income/list': {
            get: {
                tags: ['❄️ Freeze Income'],
                summary: 'ดูรายการไฟล์ที่ Freeze ไว้',
                security: JWT,
                responses: {
                    '200': {
                        description: 'รายการไฟล์',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        count: { type: 'integer' },
                                        files: { type: 'array', items: { type: 'object' } }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/freeze-income/summary/{filename}': {
            get: {
                tags: ['❄️ Freeze Income'],
                summary: 'ดูสรุปของไฟล์ Freeze',
                security: JWT,
                parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'ข้อมูลสรุป' },
                    '404': { description: 'ไม่พบไฟล์' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/freeze-income/{filename}': {
            get: {
                tags: ['❄️ Freeze Income'],
                summary: 'ดึงข้อมูลในไฟล์ Freeze',
                security: JWT,
                parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'ข้อมูลในไฟล์' },
                    '404': { description: 'ไม่พบไฟล์' },
                    '401': { description: 'Unauthorized' }
                }
            },
            delete: {
                tags: ['❄️ Freeze Income'],
                summary: 'ลบไฟล์ Freeze',
                security: JWT,
                parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'ลบสำเร็จ' },
                    '404': { description: 'ไม่พบไฟล์' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },

        // ========== Cache Income ==========
        '/api/cache-income': {
            post: {
                tags: ['💾 Cache Income'],
                summary: 'สร้าง Cache ข้อมูล Income',
                security: JWT,
                requestBody: jsonBody({
                    fromMonth: { type: 'string', example: '2026-01' },
                    toMonth: { type: 'string', example: '2026-06' }
                }, ['fromMonth', 'toMonth']),
                responses: {
                    '200': { description: 'สร้าง Cache สำเร็จ' },
                    '400': { description: 'ต้องระบุ fromMonth และ toMonth' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/cache-income/list': {
            get: {
                tags: ['💾 Cache Income'],
                summary: 'ดูรายการ Cache ทั้งหมด',
                security: JWT,
                responses: {
                    '200': {
                        description: 'รายการ Cache',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        count: { type: 'integer' },
                                        items: { type: 'array', items: { type: 'object' } }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/cache-income/summary/{key}': {
            get: {
                tags: ['💾 Cache Income'],
                summary: 'ดูสรุปของ Cache',
                security: JWT,
                parameters: [
                    {
                        name: 'key',
                        in: 'path',
                        required: true,
                        description: 'รูปแบบ YYYY-MM_to_YYYY-MM',
                        schema: { type: 'string' },
                        example: '2026-01_to_2026-06'
                    }
                ],
                responses: {
                    '200': { description: 'ข้อมูลสรุป' },
                    '400': { description: 'รูปแบบ key ไม่ถูกต้อง' },
                    '404': { description: 'ไม่พบ Cache' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/cache-income/{key}': {
            delete: {
                tags: ['💾 Cache Income'],
                summary: 'ลบ Cache',
                security: JWT,
                parameters: [
                    { name: 'key', in: 'path', required: true, schema: { type: 'string' }, example: '2026-01_to_2026-06' }
                ],
                responses: {
                    '200': { description: 'ลบสำเร็จ' },
                    '404': { description: 'ไม่พบ Cache' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },

        // ========== Report Tracking ==========
        '/api/report-tracking': {
            get: {
                tags: ['📑 Report Tracking'],
                summary: 'อ่านข้อมูลจากไฟล์ Excel บน SharePoint',
                security: JWT,
                parameters: [
                    { name: 'sheet', in: 'query', description: 'ชื่อ Sheet ที่ต้องการอ่าน', schema: { type: 'string', default: 'Sheet1' } }
                ],
                responses: {
                    '200': {
                        description: 'ข้อมูลใน Sheet',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        fileName: { type: 'string' },
                                        sheetName: { type: 'string' },
                                        headers: { type: 'array', items: { type: 'string' } },
                                        rowCount: { type: 'integer' },
                                        data: { type: 'array', items: { type: 'object' } },
                                        lastModified: { type: 'string', format: 'date-time' }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Unauthorized' }
                }
            }
        },
        '/api/report-tracking/sheets': {
            get: {
                tags: ['📑 Report Tracking'],
                summary: 'ดูรายชื่อ Sheet ทั้งหมดในไฟล์',
                security: JWT,
                responses: {
                    '200': { description: 'รายชื่อ Sheet' },
                    '401': { description: 'Unauthorized' }
                }
            }
        },

        // ========== Request Status ==========
        '/api/request-status/{referencedPoNumber}': {
            get: {
                tags: ['📝 Request Status'],
                summary: 'ดึงสถานะ Request (Basic Auth)',
                description: 'ใช้ Basic Auth แทน JWT',
                security: BASIC,
                parameters: [
                    {
                        name: 'referencedPoNumber',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        example: 'PO12345'
                    }
                ],
                responses: {
                    '200': { description: 'Request status data' },
                    '401': { description: 'Unauthorized (Basic Auth)' }
                }
            }
        },
        '/api/request-status': {
            post: {
                tags: ['📝 Request Status'],
                summary: 'ส่งข้อมูล Request Status (Basic Auth)',
                description: 'ใช้ Basic Auth แทน JWT',
                security: BASIC,
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object' } } }
                },
                responses: {
                    '200': { description: 'บันทึกสำเร็จ' },
                    '401': { description: 'Unauthorized (Basic Auth)' }
                }
            }
        },

        // ========== Other ==========
        '/api/other': {
            get: {
                tags: ['🧩 Other'],
                summary: 'Generic GraphQL query',
                security: JWT,
                parameters: [
                    { name: 'limit', in: 'query', schema: { type: 'integer' } },
                    { name: 'ticketno', in: 'query', schema: { type: 'string' } }
                ],
                responses: {
                    '200': {
                        description: 'ผลลัพธ์',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        count: { type: 'integer' },
                                        data: { type: 'array', items: { type: 'object' } }
                                    }
                                }
                            }
                        }
                    },
                    '401': { description: 'Unauthorized' }
                }
            }
        },

        // ========== System ==========
        '/': {
            get: {
                tags: ['🛠️ System'],
                summary: 'Health check',
                security: [],
                responses: { '200': { description: 'API พร้อมใช้งาน' } }
            }
        },
        '/test-login': {
            get: {
                tags: ['🛠️ System'],
                summary: 'หน้าเว็บทดสอบ Login (HTML)',
                security: [],
                responses: { '200': { description: 'หน้า HTML สำหรับทดสอบ Entra ID Login' } }
            }
        },
        '/images/matireal/{folder}/{filename}': {
            get: {
                tags: ['🛠️ System'],
                summary: 'ดึงรูปภาพอะไหล่ (proxy)',
                security: [],
                parameters: [
                    { name: 'folder', in: 'path', required: true, description: 'ชื่อโฟลเดอร์', schema: { type: 'string' } },
                    { name: 'filename', in: 'path', required: true, description: 'ชื่อไฟล์รูป', schema: { type: 'string' } }
                ],
                responses: {
                    '200': { description: 'ไฟล์รูปภาพ' },
                    '404': { description: 'ไม่พบรูปภาพ' }
                }
            }
        },
        '/api/test-webhook': {
            get: {
                tags: ['🛠️ System'],
                summary: 'ทดสอบส่ง Teams notification',
                description: '⚠️ เส้นนี้ไม่มีการตรวจสอบสิทธิ์ และจะส่ง Teams notification จริงทันทีที่เรียก',
                security: [],
                responses: {
                    '200': { description: 'ส่ง notification แล้ว' },
                    '500': { description: 'ส่งไม่สำเร็จ' }
                }
            }
        }
    }
};

module.exports = swaggerSpec;
