const { GraphQLClient } = require('graphql-request');
const { DefaultAzureCredential } = require('@azure/identity');
const { logToFile } = require('../utils/logger');
const config = require('../config');

class GraphQLService {
    constructor() {
        this.client = null;
        this.endpoint = 'https://7b2a2b840f674d1f8e9f65abfa88501d.z7b.graphql.fabric.microsoft.com/v1/workspaces/7b2a2b84-0f67-4d1f-8e9f-65abfa88501d/graphqlapis/e486dea8-7ef1-4806-a269-0385a41be187/graphql';
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
                'Service_BN15_Refurbish_NB2CLOAN': 'service_BN15_Refurbish_NB2CLOANs',
                'Service_BN09_Remove_NB2CLOAN': 'service_BN09_Remove_NB2CLOANs',
                'smaserviceorderline': 'smaserviceorderlines',
                'smaserviceorderline': 'smaserviceorderlines',
                'ServiceOrder_Table&Line': 'serviceOrder_TableLines', // Plural + New Endpoint should work
                'Performance_Matrix': 'performance_Matrix_Tables', // Mapping Name
                'ServiceOrder_QRCode': 'serviceOrder_QRCodes' // New QRCode Entpoint
            };

            const queryName = queryMap[viewName] || viewName;

            let queryBody = '';

            if (queryName === 'performance_Matrix_Tables') {
                queryBody = `
                query {
                    performance_Matrix_Tables(first: 5000) {

                        items {
                            OrderType
                            DescriptionType
                            Value
                            TimeType
                        }
                    }
                }`;
            } else if (queryName === 'smaserviceorderlines') {
                queryBody = `
                query {
                    smaserviceorderlines(first: 50000) {
                        items {
                            serviceorderid
                            signoff
                            transactiontype
                            bpc_workerpersonnelnum
                            worker
                            qty
                            projcategoryid
                            description
                            serviceobjectrelationid
                            serviceobjectid
                        }
                    }
                }`;
            } else if (queryName === 'serviceOrder_TableLines') {
                queryBody = `
                query {
                    serviceOrder_TableLines(first: 100000) {
                        items {
                            serviceorderid
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
                            bpc_actualfinisheddate
                        }
                    }
                }`;
            } else if (queryName === 'serviceOrder_QRCodes') {
                queryBody = `
                query {
                    serviceOrder_QRCodes(first: 5000) {
                        items {
                            serviceorderid
                            description
                            bpc_tradename
                            serviceobjectid
                        }
                    }
                }`;
            } else {
                queryBody = `
                query {
                    ${queryName}(first: 100000) {
                        items {
                            Id
                            serviceorderid
                            bpc_customername
                            bpc_serialnumber
                            bpc_ticketno
                            createdon
                            bpc_serviceordertypecode
                            bpc_maintenanceactivitytypecode
                            bpc_serviceobjectgroup
                            bpc_slafinishdate
                            bpc_notifdate
                            bpc_scheduledstart
                            bpc_customerbranch
                            bpc_actualstartdate
                            bpc_model
                            bpc_modelnodescription
                            bpc_mobilestatus
                            custaccount
                        }
                    }
                }`;
            }

            const query = JSON.stringify({
                query: queryBody
            });

            // Use native fetch instead of graphql-request to debug response structure
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: query
            });

            const result = await response.json();
            console.log(`[GraphQLService] Raw Response for ${queryName}:`, JSON.stringify(result).substring(0, 500) + "..."); // Log first 500 chars

            // Check for errors in body
            if (result.errors) {
                logToFile(`[GraphQL] API returned errors: ${JSON.stringify(result.errors)}`);
                // If we also have data, we might want to proceed? 
                // But usually errors means partial failure or malformed query.
                // Let's create an error object but check data first.
            }

            // Navigate the response based on what we get
            // Expected: { data: { service_BN15_Refurbishes: { items: [...] } } }

            let items = [];

            if (result.data && result.data[queryName] && result.data[queryName].items) {
                items = result.data[queryName].items;
            } else if (result[queryName] && result[queryName].items) {
                // Fallback if data wrapper is missing
                items = result[queryName].items;
            } else if (result.items) {
                // Fallback if root is items
                items = result.items;
            }

            if (items.length > 0) {
                logToFile(`[GraphQL] Retrieved ${items.length} records from ${viewName}`);
                return items;
            }

            // If we got here, we didn't find items. Log the full response to help debug.
            logToFile(`[GraphQL] Unexpected response structure: ${JSON.stringify(result).substring(0, 500)}...`);

            // If we had errors earlier, throw them now
            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            return []; // Return empty if no data and no error?

        } catch (error) {
            logToFile(`[GraphQL] Query Error: ${error.message}`);
            throw error;
        }
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

            logToFile(`[GraphQL] Using Date Range: ${fromDate} to ${toDate}`);

            const queryBody = `
                query ExecuteServiceOrderBahtPerHead($fromDate: DateTime!, $toDate: DateTime!) {
                    executeServiceOrder_BahtPerHead(FromDate: $fromDate, ToDate: $toDate) {
                        bpc_zonegroup
                        bpc_inventlocationid
                        firstname
                        serviceorderid
                        bpc_tradecode
                        bpc_tradename
                        stageid
                        bpc_mobilestatus
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
}

module.exports = new GraphQLService();
