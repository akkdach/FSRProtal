const { GraphQLClient } = require('graphql-request');
const { DefaultAzureCredential } = require('@azure/identity');
const { logToFile } = require('../utils/logger');
const config = require('../config');

class GraphQLService {
    constructor() {
        this.client = null;
        this.endpoint = 'https://7b2a2b840f674d1f8e9f65abfa88501d.z7b.graphql.fabric.microsoft.com/v1/workspaces/7b2a2b84-0f67-4d1f-8e9f-65abfa88501d/graphqlapis/e486dea8-7ef1-4806-a269-0385a41be187/graphql';
        // New FSRProtal_API endpoint for service views
        this.fsrProtalEndpoint = 'https://7b2a2b840f674d1f8e9f65abfa88501d.z7b.graphql.fabric.microsoft.com/v1/workspaces/7b2a2b84-0f67-4d1f-8e9f-65abfa88501d/graphqlapis/47a192e2-8902-46e4-baee-c0ec18c3d629/graphql';
    }

    async getAccessToken() {
        try {
            // Use ClientSecretCredential for Service Principal auth
            const { ClientSecretCredential } = require('@azure/identity');
            const credential = new ClientSecretCredential(
                config.auth.tenantId,
                config.auth.clientId,
                config.auth.clientSecret
            );

            // Use correct scope for Fabric GraphQL API
            const tokenResponse = await credential.getToken('https://analysis.windows.net/powerbi/api/.default');
            return tokenResponse.token;
        } catch (error) {
            logToFile(`[GraphQL] Token Error: ${error.message}`);
            throw error;
        }
    }

    // We don't need initClient anymore as we'll use fetch directly

    async queryView(viewName) {
        try {
            logToFile(`[GraphQL] Querying view: ${viewName}`);

            // Get token fresh each time
            const token = await this.getAccessToken();

            // Map view names to GraphQL query names (lowercase with plural endings)
            const queryMap = {
                'Service_BN04_Install': 'service_BN04_Installs',
                'Service_BN09_Remove': 'service_BN09_Removes',
                'Service_BN15_Refurbish': 'service_BN15_Refurbishes',
                'Service_BN15_Refurbish_NB2CLOAN': 'service_BN15_Refurbish_NB2CLOANs',
                'Service_BN09_Remove_NB2CLOAN': 'service_BN09_Remove_NB2CLOANs',
                'smaserviceorderline': 'smaserviceorderlines',
                'ServiceOrder_Table&Line': 'serviceOrder_TableLines',
                'Performance_Matrix': 'performance_Matrices',
                'ServiceOrder_BarCode': 'serviceOrder_BarCodes',
                // New FSRProtal_API views
                'service_BN04_NB2CLOAN_New': 'service_BN04_NB2CLOAN_News',
                'Service_BN04_New': 'service_BN04_News',
                'service_BN15_New': 'service_BN15_News',
                'service_BN09_NB2CLOAN_New': 'service_BN09_NB2CLOAN_News',
                'Service_BN09_New': 'service_BN09_News',
                'Smaserviceobjecttable_Internal_Work_NPSO': 'smaserviceobjecttable_Internal_Work_NPSOs',
                'Dispatch_Pending_Fountain': 'dispatch_Pending_Fountains',
                'Dispatch_Pending_New_Customer': 'dispatch_Pending_New_Customers',
                'Dispatch_Pending_Cooler': 'dispatch_Pending_Coolers',
                'Dispatch_Pending': 'dispatch_Pendings'
            };

            // Views that use the FSRProtal_API endpoint
            const fsrProtalViews = [
                'service_BN04_NB2CLOAN_New',
                'Service_BN04_New',
                'service_BN15_New',
                'service_BN09_NB2CLOAN_New',
                'Service_BN09_New'
            ];

            const queryName = queryMap[viewName] || viewName;

            let queryBody = '';
            let fields = '';

            // Define fields for each query type
            if (queryName === 'performance_Matrices') {
                fields = `OrderType
                            DescriptionType
                            Value
                            TimeType`;
            } else if (queryName === 'smaserviceorderlines') {
                fields = `serviceorderid
                            signoff
                            transactiontype
                            bpc_workerpersonnelnum
                            worker
                            qty
                            projcategoryid
                            description
                            serviceobjectrelationid
                            serviceobjectid`;
            } else if (queryName === 'serviceOrder_TableLines') {
                fields = `serviceorderid
                            stageid
                            bpc_mobilestatus
                            bpc_servicezone
                            bpc_maintenanceactivitytypecode
                            bpc_maintenanceactivitytypedescription
                            bpc_serviceordertypecode
                            bpc_inventlocationid
                            projsalesprice
                            qty
                            transactiontype
                            projcategoryid
                            bpc_slafinishdate
                            bpc_actualfinisheddate`;
            } else if (queryName === 'serviceOrder_QRCodes') {
                fields = `serviceorderid
                            description
                            bpc_tradename
                            serviceobjectid`;
            } else if (queryName === 'smaserviceobjecttable_Internal_Work_NPSOs') {
                fields = `Id
                            SinkCreatedOn
                            SinkModifiedOn
                            sysdatastatecode
                            description
                            inventdimid
                            itemid
                            serviceobjectgroup
                            serviceobjectid
                            templatebomid
                            bpc_typeofmachinecode
                            bpc_modelno
                            bpc_modelcode
                            bpc_serialnumber
                            bpc_cdecode
                            bpc_serviceitemstatuscode
                            bpc_servicejobcode
                            bpc_lastestmodelno
                            bpc_warrantystartdatepart
                            bpc_warrantyendingdatepart
                            bpc_warrantyperpart
                            bpc_warrantyperlabor
                            bpc_warrantystartdatelabor
                            bpc_warrantyendingdatelabor
                            bpc_servicewarrantydate
                            bpc_objectreceiveddate
                            bpc_accountnum
                            bpc_mainassetno
                            bpc_inventlocationid
                            bpc_tradecode
                            modifieddatetime
                            modifiedby
                            modifiedtransactionid
                            createddatetime
                            createdby
                            createdtransactionid
                            dataareaid
                            recversion
                            partition
                            sysrowversion
                            recid
                            tableid
                            versionnumber
                            createdon
                            modifiedon
                            IsDelete
                            PartitionId`;
            } else if (queryName === 'dispatch_Pending_Fountains' || queryName === 'dispatch_Pending_New_Customers' || queryName === 'dispatch_Pending_Coolers' || queryName === 'dispatch_Pendings') {
                fields = `serviceorderid
                            bpc_serviceordertypecode
                            bpc_servicejobcode
                            stageid
                            bpc_mobilestatus
                            bpc_mobilereasoncode
                            bpc_maintenanceactivitytypecode
                            bpc_maintenanceactivitytypedescription
                            bpc_ticketno
                            bpc_work
                            bpc_symptomareaid
                            bpc_symptomcodeid
                            bpc_symptomcodedescription
                            bpc_description
                            custaccount
                            bpc_customername
                            county
                            state
                            address
                            bpc_customerbranch
                            serviceaddressname
                            bpc_custclassificationid
                            bpc_tradecode
                            bpc_tradename
                            bpc_phone
                            bpc_latitude
                            bpc_longitude
                            bpc_zonegroup
                            bpc_servicezone
                            bpc_subarea
                            bpc_serviceobject
                            bpc_modelno
                            bpc_modelnodescription
                            bpc_serviceobjectgroup
                            bpc_notifdate
                            bpc_notiftime
                            bpc_saporderdate
                            bpc_ordertime
                            bpc_sla_result
                            bpc_postponedate
                            bpc_unkhowpostponedate
                            bpc_postponereasoncode
                            bpc_requestdate
                            bpc_requesttime
                            bpc_slastartdate
                            bpc_slastarttime
                            bpc_slafinishdate
                            bpc_slafinishtime
                            bpc_postponereasondesc
                            bpc_remark
                            bpc_remarkk2
                            bpc_mobileremark
                            bpc_inventlocationid
                            bpc_routingnocode
                            bpc_scheduledstart
                            bpc_scheduledfinish
                            bpc_actualstartdate
                            bpc_actualstarttime
                            bpc_actualfinisheddate
                            bpc_actualfinishedtime`;
            } else {
                // Default fields for Service_BN* views
                fields = `Id
                            serviceorderid
                            bpc_customername
                            bpc_serialnumber
                            bpc_ticketno
                            bpc_zonegroup
                            bpc_resolutionid
                            bpc_conditionid
                            createdon
                            bpc_serviceordertypecode
                            bpc_maintenanceactivitytypecode
                            bpc_serviceobjectgroup
                            bpc_slafinishdate
                            bpc_notifdate
                            bpc_scheduledstart
                            bpc_scheduledfinish
                            bpc_customerbranch
                            bpc_actualstartdate
                            bpc_model
                            bpc_modelnodescription
                            bpc_mobilestatus
                            bpc_mobileremark
                            bpc_remarkk2
                            custaccount`;
            }

            // Determine which endpoint to use
            const useFsrProtalEndpoint = fsrProtalViews.includes(viewName);
            const endpoint = useFsrProtalEndpoint ? this.fsrProtalEndpoint : this.endpoint;

            // Use pagination for all queries
            // For Dispatch_Pending_Fountain, Dispatch_Pending_New_Customer, and Dispatch_Pending_Cooler, use smaller page size (5000) to avoid 64MB limit
            const pageSize = (queryName === 'dispatch_Pending_Fountains' || queryName === 'dispatch_Pending_New_Customers' || queryName === 'dispatch_Pending_Coolers' || queryName === 'dispatch_Pendings') ? 5000 : 100000;
            return await this.fetchAllWithPagination(token, queryName, fields, endpoint, pageSize);

        } catch (error) {
            logToFile(`[GraphQL] Query Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generic pagination function for all GraphQL queries.
     * Microsoft Fabric GraphQL API has a max limit of 100000 per request.
     * This method fetches in batches and combines results.
     * @param {string} token - Access token
     * @param {string} queryName - GraphQL query name
     * @param {string} fieldsQuery - Fields to query (as string)
     * @param {string} endpoint - GraphQL endpoint
     * @param {number} pageSize - Page size for pagination (default 100000)
     */
    async fetchAllWithPagination(token, queryName, fieldsQuery, endpoint = this.endpoint, pageSize = 100000) {
        const PAGE_SIZE = pageSize;
        let allItems = [];
        let hasNextPage = true;
        let afterCursor = null;
        let pageNum = 1;

        while (hasNextPage) {
            logToFile(`[GraphQL] Fetching ${queryName} page ${pageNum}...`);

            const afterArg = afterCursor ? `, after: "${afterCursor}"` : '';
            const queryBody = `
            query {
                ${queryName}(first: ${PAGE_SIZE}${afterArg}) {
                    items {
                        ${fieldsQuery}
                    }
                    endCursor
                    hasNextPage
                }
            }`;

            const query = JSON.stringify({ query: queryBody });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: query
            });

            const result = await response.json();

            if (result.errors) {
                logToFile(`[GraphQL] ${queryName} pagination error: ${JSON.stringify(result.errors)}`);
                throw new Error(result.errors[0].message);
            }

            const node = result.data?.[queryName];
            if (node && node.items) {
                allItems = allItems.concat(node.items);
                hasNextPage = node.hasNextPage === true;
                afterCursor = node.endCursor;
                logToFile(`[GraphQL] Page ${pageNum}: Got ${node.items.length} records. Total so far: ${allItems.length}. HasNextPage: ${hasNextPage}`);
            } else {
                hasNextPage = false;
            }

            pageNum++;

            // Safety limit to prevent infinite loops (max 2 million records)
            if (pageNum > 20) {
                logToFile(`[GraphQL] Safety limit reached (20 pages). Stopping pagination.`);
                break;
            }
        }

        logToFile(`[GraphQL] Total ${queryName} records fetched: ${allItems.length}`);
        return allItems;
    }

    /**
     * Execute Stored Procedure-backed mutation for Baht Per Head.
     *
     * NOTE: This implementation assumes that the Fabric GraphQL schema exposes
     * a mutation named `executeServiceOrder_Income` with no required arguments
     * and that it returns a list (or object containing a list) of rows with the
     * same columns currently used by the Baht Per Head page.
     *
     * If your actual mutation requires input arguments or has a different
     * return shape, please adjust the mutation string and result extraction
     * logic below to match your schema.
     */
    async executeServiceOrderIncome(input = {}) {
        try {
            logToFile('[GraphQL] Executing stored procedure query: executeServiceOrder_Income');

            const token = await this.getAccessToken();

            // Calculate current month date range as defaults
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            const fromDate = input.FromDate || firstOfMonth;
            const toDate = input.ToDate || lastOfMonth;

            logToFile(`[GraphQL] Using Date Range: ${fromDate} to ${toDate}`);

            const queryBody = `
                query ExecuteServiceOrderIncome($fromDate: DateTime!, $toDate: DateTime!) {
                    executeServiceOrder_Income(FromDate: $fromDate, ToDate: $toDate) {
                        serviceorderid
                        bpc_tradecode
                        bpc_tradename
                        stageid
                        bpc_mobilestatus
                        bpc_inventlocationid
                        bpc_serviceordertypecode
                        bpc_maintenanceactivitytypecode
                        bpc_maintenanceactivitytypedescription
                        bpc_servicezone
                        projsalesprice
                        qty
                        transactiontype
                        projcategoryid
                        bpc_slafinishdate
                        bpc_actualfinisheddate
                        dateexecution
                        projlinepropertyid
                        customer_type
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    fromDate: fromDate,
                    toDate: toDate
                }
            });

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeServiceOrder_Income response status: ${response.status}`);
            if (result.errors) {
                logToFile(`[GraphQL] executeServiceOrder_Income errors: ${JSON.stringify(result.errors)}`);
            }

            if (result.errors) {
                logToFile(`[GraphQL] executeServiceOrder_Income returned errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeServiceOrder_Income) {
                const node = result.data.executeServiceOrder_Income;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeServiceOrder_Income retrieved ${rows.length} rows`);
            if (rows.length > 0) {
                const samples = rows.slice(0, 3).map(r => r.dateexecution).join(', ');
                logToFile(`[GraphQL] Sample dateexecution values: ${samples}`);
            }

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeServiceOrder_Income Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute Stored Procedure-backed mutation for Baht Per Head Summary.
     * Calling ServiceOrder_BahtPerHead
     */
    async executeServiceOrderBahtPerHead(input = {}) {
        try {
            logToFile('[GraphQL] Executing stored procedure query: executeServiceOrder_BahtPerHead');

            const token = await this.getAccessToken();

            // Calculate current month date range as defaults
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            const fromDate = input.FromDate || firstOfMonth;
            const toDate = input.ToDate || lastOfMonth;
            const van = input.Van || null;

            logToFile(`[GraphQL] Using Date Range: ${fromDate} to ${toDate}, Van: ${van}`);

            const queryBody = `
                query ExecuteServiceOrderBahtPerHead($fromDate: DateTime!, $toDate: DateTime!, $van: String) {
                    executeServiceOrder_BahtPerHead(FromDate: $fromDate, ToDate: $toDate, Van: $van) {
                        serviceorderid
                        bpc_zonegroup
                        technician_names
                        technician_count
                        work_hours
                        projsalesprice
                        bpc_tradecode
                        bpc_tradename
                        stageid
                        bpc_mobilestatus
                        bpc_inventlocationid
                        bpc_serviceordertypecode
                        bpc_maintenanceactivitytypecode
                        bpc_maintenanceactivitytypedescription
                        bpc_servicezone
                        actual_finished_date
                        bpc_slafinishdate
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    fromDate: fromDate,
                    toDate: toDate,
                    van: van
                }
            });

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeServiceOrder_BahtPerHead response status: ${response.status}`);
            if (result.errors) {
                logToFile(`[GraphQL] executeServiceOrder_BahtPerHead errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeServiceOrder_BahtPerHead) {
                const node = result.data.executeServiceOrder_BahtPerHead;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeServiceOrder_BahtPerHead retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeServiceOrder_BahtPerHead Error: ${error.message}`);
            throw error;
        }
    }
    /**
     * Execute Stored Procedure-backed mutation for BarCode (formerly QRCode).
     * Calling ServiceOrder_BarCode_Proc
     */
    async executeServiceOrderBarCode(status) {
        try {
            logToFile('[GraphQL] Executing stored procedure query: executeServiceOrder_BarCode_Proc');

            const token = await this.getAccessToken();

            logToFile(`[GraphQL] Using Status: ${status}`);

            const queryBody = `
                query ExecuteServiceOrderBarCode($status: String!) {
                    executeServiceOrder_BarCode_Proc(Status: $status) {
                        serviceorderid
                        description
                        bpc_tradename
                        serviceobjectid
                        stageid
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    status: status
                }
            });

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeServiceOrder_BarCode_Proc response status: ${response.status}`);

            if (result.errors) {
                logToFile(`[GraphQL] executeServiceOrder_BarCode_Proc errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeServiceOrder_BarCode_Proc) {
                const node = result.data.executeServiceOrder_BarCode_Proc;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeServiceOrder_BarCode_Proc retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeServiceOrder_BarCode_Proc Error: ${error.message}`);
            throw error;
        }
    }
    /**
     * Execute Stored Procedure-backed mutation for Jobs Per Man.
     * Calling ServiceOrder_JobsPerMan
     */
    async executeServiceOrderJobsPerMan(input = {}) {
        try {
            logToFile('[GraphQL] Executing stored procedure query: executeServiceOrder_JobsPerMan');

            const token = await this.getAccessToken();

            // Calculate current month date range as defaults
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            const fromDate = input.FromDate || firstOfMonth;
            const toDate = input.ToDate || lastOfMonth;

            logToFile(`[GraphQL] Using Date Range: ${fromDate} to ${toDate}`);

            const queryBody = `
                query ExecuteServiceOrderJobsPerMan($fromDate: DateTime!, $toDate: DateTime!) {
                    executeServiceOrder_JobsPerMan(FromDate: $fromDate, ToDate: $toDate) {
                        serviceorderid
                        bpc_zonegroup
                        bpc_workerpersonnelnum
                        technician_name
                        technician_count
                        work_hours
                        projsalesprice
                        bpc_inventlocationid
                        bpc_tradecode
                        bpc_tradename
                        stageid
                        bpc_mobilestatus
                        bpc_serviceordertypecode
                        bpc_maintenanceactivitytypecode
                        bpc_maintenanceactivitytypedescription
                        bpc_servicezone
                        actual_finished_date
                        bpc_slafinishdate
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    fromDate: fromDate,
                    toDate: toDate
                }
            });

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeServiceOrder_JobsPerMan response status: ${response.status}`);
            if (result.errors) {
                logToFile(`[GraphQL] executeServiceOrder_JobsPerMan errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeServiceOrder_JobsPerMan) {
                const node = result.data.executeServiceOrder_JobsPerMan;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeServiceOrder_JobsPerMan retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeServiceOrder_JobsPerMan Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute Stored Procedure-backed query for BN09 Internal Work.
     * Calling BN09_Internal_Work
     */
    async executeBN09InternalWork(input = {}) {
        try {
            logToFile('[GraphQL] Executing stored procedure query: executeBN09_Internal_Work');

            const token = await this.getAccessToken();

            // Calculate current month date range as defaults
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            const startDate = input.StartDate || firstOfMonth;
            const endDate = input.EndDate || lastOfMonth;

            logToFile(`[GraphQL] Using Date Range: ${startDate} to ${endDate}`);

            const queryBody = `
                query ExecuteBN09InternalWork($startDate: DateTime!, $endDate: DateTime!) {
                    executeBN09_Internal_Work(StartDate: $startDate, EndDate: $endDate) {
                        ID
                        ServiceObject
                        Model
                        ModelDescription
                        CustomerCode
                        Customer
                        Ticket
                        BKK
                        PostCode
                        Province
                        RemoveDate
                        RemoveTechnician
                        CreateServiceOrderDate
                        CreateServiceOrderBy
                        TradeCode
                        TradeName
                        StartDate
                        EndDate
                        bpc_maintenanceactivitytypecode
                        bpc_serviceordertypecode
                        custaccount
                        bpc_serviceobjectgroup
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    startDate: startDate,
                    endDate: endDate
                }
            });

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeBN09_Internal_Work response status: ${response.status}`);
            if (result.errors) {
                logToFile(`[GraphQL] executeBN09_Internal_Work errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeBN09_Internal_Work) {
                const node = result.data.executeBN09_Internal_Work;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeBN09_Internal_Work retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeBN09_Internal_Work Error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new GraphQLService();
