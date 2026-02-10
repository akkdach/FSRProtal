const { logToFile } = require('../utils/logger');
const config = require('../config');

class OtherGraphQLService {
    constructor() {
        this.endpoint = 'https://7b2a2b840f674d1f8e9f65abfa88501d.z7b.graphql.fabric.microsoft.com/v1/workspaces/7b2a2b84-0f67-4d1f-8e9f-65abfa88501d/graphqlapis/acf92824-3a5a-4c61-996e-8b10b294787a/graphql';
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

    async getData(input = {}) {
        try {
            logToFile(`[OtherGraphQL] Executing Service_Header_Line_Proc...`);

            const token = await this.getAccessToken();

            // Ensure full ISO DateTime format for GraphQL DateTime! type
            const rawDate = input.PostingDate || new Date().toISOString().split('T')[0];
            const postingDate = rawDate.includes('T') ? rawDate : `${rawDate}T00:00:00.000Z`;

            logToFile(`[OtherGraphQL] Using PostingDate: ${postingDate}`);

            // Full query with all fields from Service_Header_Line_Proc
            const queryBody = `
                query ExecuteServiceHeaderLineProc($posting_date: DateTime!) {
                    executeService_Header_Line_Proc(posting_date: $posting_date) {
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
                        recid2
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    posting_date: postingDate
                }
            });

            logToFile(`[OtherGraphQL] Request body: ${body}`);

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[OtherGraphQL] Response status: ${response.status}`);
            logToFile(`[OtherGraphQL] Full response: ${JSON.stringify(result)}`);

            if (result.errors) {
                logToFile(`[OtherGraphQL] Query errors: ${JSON.stringify(result.errors)}`);
                throw new Error(result.errors[0].message);
            }

            // Extract rows from the specific mutation/query response
            let rows = [];
            if (result.data && result.data.executeService_Header_Line_Proc) {
                const node = result.data.executeService_Header_Line_Proc;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            return rows;
        } catch (error) {
            logToFile(`[OtherGraphQL] Execution Error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new OtherGraphQLService();
