const { logToFile } = require('../utils/logger');
const config = require('../config');

class OtherGraphQLService {
    constructor() {
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
            logToFile(`[OtherGraphQL] Token Error: ${error.message}`);
            throw error;
        }
    }

    // Build the fields string for reuse
    _getFieldsString() {
        return `
            Id
            SinkCreatedOn
            SinkModifiedOn
            calendarconflict
            certifiedpayroll
            incomingweborder
            origin
            priority
            progress
            servicelevelagreementstatus
            signoff
            bpc_sla_result
            bpc_unkhowpostponedate
            bpc_interfacesource
            bpc_approvefix
            bpc_work
            bpc_warranty
            bpc_replace
            sysdatastatecode
            activitynumber
            activitytypeid
            addressrefrecid
            addressreftableid
            agreementid
            compliance
            contactpersonid
            custaccount
            description
            projid
            serviceaddressname
            servicedatetime
            servicelevelagreement
            serviceorderid
            servicepostaladdress
            signoffdatetime
            stageid
            workerpreferredtechnician
            workerresponsible
            bpc_serviceordertypecode
            bpc_maintenanceactivitytypecode
            bpc_servicejobcode
            bpc_zonegroup
            bpc_servicezone
            bpc_subarea
            bpc_ticketno
            bpc_model
            bpc_modelno
            bpc_lastestmodelno
            bpc_serialnumber
            bpc_typeofmachine
            bpc_description
            bpc_actualstartdate
            bpc_actualstarttime
            bpc_actualfinisheddate
            bpc_actualfinishedtime
            bpc_postponedate
            bpc_remark
            bpc_k2remark
            bpc_mobilestatus
            bpc_mobileremark
            bpc_mobilereasoncode
            bpc_routingnocode
            bpc_plant
            bpc_planplant
            bpc_inventlocationid
            bpc_workcenter
            bpc_sloc
            bpc_notificationnosap
            bpc_cdecode
            bpc_newserviceobject
            bpc_serviceobjectgroup
            bpc_scheduledstart
            bpc_scheduledfinish
            bpc_scheduledstarttime
            bpc_scheduledfinishtime
            bpc_activitytype
            bpc_notificationtype
            bpc_notifdate
            bpc_notiftime
            Id2
            SinkCreatedOn2
            SinkModifiedOn2
            serviceorderstatus2
            transactiontype
            dateexecution
            itemid
            description2
            qty
            unit
            serviceobjectid
            serviceorderid2
            serviceorderlinenum
            servicetaskid
            worker
            bpc_movetype
            bpc_warrantycheck
            bpc_templatebomid
            bpc_refsalesid
            bpc_feedescription
            bpc_feecode
            bpc_actualstartdate2
            bpc_actualstarttime2
            bpc_actualfinisheddate2
            bpc_actualfinishedtime2
            bpc_actualhour
            bpc_workerpersonnelnum
            bpc_smaservicetaskdescription
            bpc_invoiceaccount
            modifieddatetime2
            modifiedby2
            createddatetime2
            createdby2
            dataareaid2
            recid2`;
    }

    async getData(input = {}) {
        try {
            logToFile(`[OtherGraphQL] Executing Service_Header_Line_Proc...`);

            const token = await this.getAccessToken();

            const serviceorderid = input.serviceorderid || '';
            const PAGE_SIZE = 5000;

            logToFile(`[OtherGraphQL] Using serviceorderid: ${serviceorderid}, pageSize: ${PAGE_SIZE}`);

            const fields = this._getFieldsString();
            let allRows = [];
            let hasNextPage = true;
            let afterCursor = null;
            let pageNum = 0;

            while (hasNextPage) {
                pageNum++;
                logToFile(`[OtherGraphQL] Fetching page ${pageNum}...`);

                // Build query with pagination (first/after)
                const afterArg = afterCursor ? `, after: "${afterCursor}"` : '';
                const queryBody = `
                    query ExecuteServiceHeaderLineProc($serviceorderid: String!) {
                        executeService_Header_Line_Proc(serviceorderid: $serviceorderid, first: ${PAGE_SIZE}${afterArg}) {
                            items {
                                ${fields}
                            }
                            endCursor
                            hasNextPage
                        }
                    }`;

                const body = JSON.stringify({
                    query: queryBody,
                    variables: { serviceorderid }
                });

                if (pageNum === 1) {
                    logToFile(`[OtherGraphQL] Request body: ${body}`);
                }

                // Set 5-minute timeout per page
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                const result = await response.json();
                logToFile(`[OtherGraphQL] Page ${pageNum} response status: ${response.status}`);

                if (result.errors) {
                    logToFile(`[OtherGraphQL] Query errors: ${JSON.stringify(result.errors)}`);
                    // If pagination not supported, fall back to non-paginated query
                    if (pageNum === 1 && result.errors[0].message.includes('argument')) {
                        logToFile(`[OtherGraphQL] Pagination not supported, falling back to simple query...`);
                        return await this._getDataSimple(token, serviceorderid, fields);
                    }
                    throw new Error(result.errors[0].message);
                }

                // Extract rows from paginated response
                const procData = result.data?.executeService_Header_Line_Proc;
                if (procData && procData.items && Array.isArray(procData.items)) {
                    allRows = allRows.concat(procData.items);
                    hasNextPage = procData.hasNextPage || false;
                    afterCursor = procData.endCursor || null;
                    logToFile(`[OtherGraphQL] Page ${pageNum}: got ${procData.items.length} rows, total: ${allRows.length}, hasNextPage: ${hasNextPage}`);
                } else {
                    // Response might be non-paginated (direct array)
                    const node = procData;
                    if (Array.isArray(node)) {
                        allRows = node;
                    } else if (typeof node === 'object' && node !== null) {
                        allRows = [node];
                    }
                    hasNextPage = false;
                    logToFile(`[OtherGraphQL] Non-paginated response, got ${allRows.length} rows`);
                }
            }

            logToFile(`[OtherGraphQL] Total rows fetched: ${allRows.length} across ${pageNum} pages`);
            return allRows;
        } catch (error) {
            logToFile(`[OtherGraphQL] Execution Error: ${error.message}`);
            throw error;
        }
    }

    // Fallback: simple query without pagination
    async _getDataSimple(token, serviceorderid, fields) {
        const queryBody = `
            query ExecuteServiceHeaderLineProc($serviceorderid: String!) {
                executeService_Header_Line_Proc(serviceorderid: $serviceorderid) {
                    ${fields}
                }
            }`;

        const body = JSON.stringify({
            query: queryBody,
            variables: { serviceorderid }
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = await response.json();

        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        let rows = [];
        const node = result.data?.executeService_Header_Line_Proc;
        if (Array.isArray(node)) {
            rows = node;
        } else if (node?.items && Array.isArray(node.items)) {
            rows = node.items;
        } else if (typeof node === 'object' && node !== null) {
            rows = [node];
        }

        logToFile(`[OtherGraphQL] Simple query returned ${rows.length} rows`);
        return rows;
    }
}

module.exports = new OtherGraphQLService();
