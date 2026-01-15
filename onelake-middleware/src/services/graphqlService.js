const { GraphQLClient } = require('graphql-request');
const { DefaultAzureCredential } = require('@azure/identity');
const { logToFile } = require('../utils/logger');
const config = require('../config');

class GraphQLService {
    constructor() {
        this.client = null;
        this.endpoint = 'https://7b2a2b840f674d1f8e9f65abfa88501d.z7b.graphql.fabric.microsoft.com/v1/workspaces/7b2a2b84-0f67-4d1f-8e9f-65abfa88501d/graphqlapis/47a192e2-8902-46e4-baee-c0ec18c3d629/graphql';
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
                'Service_BN15_Refurbish': 'service_BN15_Refurbishes'
            };

            const queryName = queryMap[viewName] || viewName;

            const query = JSON.stringify({
                query: `
                query {
                    ${queryName}(first: 50000) {
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
                        }
                    }
                }`
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
}

module.exports = new GraphQLService();
