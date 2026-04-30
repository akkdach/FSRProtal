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
                'service_BN15_NB2CLOAN_New': 'service_BN15_NB2CLOAN_News',
                // New B2B views
                'Service_BN04_New_B2B': 'service_BN04_New_B2Bs',
                'Service_BN09_New_B2B': 'service_BN09_New_B2Bs',
                'Service_BN15_New_B2B': 'service_BN15_New_B2Bs',
                // BN02 views
                'Service_BN02_New': 'service_BN02_News',
                'Service_BN02_New_B2B': 'service_BN02_New_B2Bs',
                // BN01 views
                'Service_BN01_New_B2B': 'service_BN01_New_B2Bs',
                // New B2B view
                'Service_New_B2B': 'service_New_B2Bs',
                // New NB2C view
                'Service_New_NB2C': 'service_New_NB2Cs',
                'Smaserviceobjecttable_Internal_Work_NPSO': 'smaserviceobjecttable_Internal_Work_NPSOs',
                'Smaserviceobjecttable_Internal_Work': 'smaserviceobjecttable_Internal_Works',
                'Dispatch_Pending_Fountain': 'dispatch_Pending_Fountains',
                'Dispatch_Pending_New_Customer': 'dispatch_Pending_New_Customers',
                'Dispatch_Pending_Cooler': 'dispatch_Pending_Coolers',
                'Dispatch_Pending': 'dispatch_Pendings',
                'Service_RequiField_Dispatch': 'service_RequiField_Dispatches',
                'InventtableView': 'inventtableViews',
                'inventtransfer': 'inventtransfers',
                'Service_Level_Refurbish': 'service_Level_Refurbishes',
                'Out_Of_Stock_Inventsum': 'out_Of_Stock_Inventsums'
            };

            // Views that use the FSRProtal_API endpoint
            const fsrProtalViews = [
                'service_BN04_NB2CLOAN_New',
                'Service_BN04_New',
                'service_BN15_New',
                'service_BN09_NB2CLOAN_New',
                'Service_BN09_New',
                'service_BN15_NB2CLOAN_New',
                'Service_BN04_New_B2B',
                'Service_BN09_New_B2B',
                'Service_BN15_New_B2B',
                'Service_BN02_New',
                'Service_BN02_New_B2B',
                'Service_BN01_New_B2B',
                'Service_New_B2B',
                'Service_New_NB2C'
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
            } else if (queryName === 'smaserviceobjecttable_Internal_Work_NPSOs' || queryName === 'smaserviceobjecttable_Internal_Works') {
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
            } else if (queryName === 'inventtableViews') {
                fields = `Id
                            SinkCreatedOn
                            SinkModifiedOn
                            abccontributionmargin
                            abcrevenue
                            abctieup
                            abcvalue
                            autoreportfinished
                            batchmergedatecalculationmethod
                            bommanualreceipt
                            costmodel
                            fiscallifoavoidcalc
                            fiscallifonormalvaluecalc
                            forecastdmpinclude
                            icmsonservice_br
                            intrastatexclude
                            itemdimcostprice
                            itemtype
                            matchingpolicy
                            pdspotencyattribrecording
                            pdsvendorcheckitem
                            phantom
                            pmfproducttype
                            prodflushingprincip
                            purchmodel
                            salesmodel
                            salespricemodelbasic
                            skipintracompanysync_ru
                            taxationorigin_br
                            usealtitemid
                            dsa_in
                            exciserecordtype_in
                            exempt_in
                            scaleindicator_br
                            nongst_in
                            hmimindicator
                            coodualuseproduct
                            preventphysicaldimensionsync
                            bomwhsreleasepolicy
                            displayhazard_mx
                            bundle
                            revrecexcludefromcarveout
                            revrecmedianprice
                            revrecrevenuerecognitionenabled
                            revrecrevenuetype
                            revrecbundle
                            qmscustomercheckitem
                            qmsauthorizedpersonnel
                            qmsdispensingcontrol
                            bpc_compressor
                            sysdatastatecode
                            itemid
                            alcoholmanufacturerid_ru
                            alcoholproductiontypeid_ru
                            alcoholstrength_ru
                            altconfigid
                            altinventcolorid
                            altinventsizeid
                            altinventstyleid
                            altinventversionid
                            altitemid
                            approxtaxvalue_br
                            assetgroupid_ru
                            assetid_ru
                            batchnumgroupid
                            bomcalcgroupid
                            bomlevel
                            bomunitid
                            brandcodeid_mx
                            commissiongroupid
                            costgroupid
                            customsexporttariffcodetable_in
                            customsimporttariffcodetable_in
                            defaultdimension
                            density
                            depth
                            exceptioncode_br
                            excisetariffcodes_in
                            eximproductgrouptable_in
                            fiscallifonormalvalue
                            grossdepth
                            grossheight
                            grosswidth
                            height
                            intrastatcommodity
                            intrastatprocid_cz
                            inventfiscallifogroup
                            inventproducttype_br
                            itembuyergroupid
                            itempricetolerancegroupid
                            markupcode_ru
                            minimumpalletquantity
                            namealias
                            netweight
                            ngpcodestable_fr
                            nrtaxgroup_lv
                            origcountryregionid
                            origcountyid
                            origstateid
                            packaginggroupid
                            packing_ru
                            pdsbaseattributeid
                            pdsbestbefore
                            pdscwwmsminimumpalletqty
                            pdscwwmsqtyperlayer
                            pdscwwmsstandardpalletqty
                            pdsfreightallocationgroupid
                            pdsitemrebategroupid
                            pdsshelfadvice
                            pdsshelflife
                            pdstargetfactor
                            pkwiucode_pl
                            pmfplanningitemid
                            pmfyieldpct
                            primaryvendorid
                            prodgroupid
                            prodpoolid
                            product
                            projcategoryid
                            propertyid
                            qtyperlayer
                            reqgroupid
                            sadratecode_pl
                            salescontributionratio
                            salespercentmarkup
                            scrapconst
                            scrapvar
                            serialnumgroupid
                            servicecodetable_in
                            sortcode
                            standardconfigid
                            standardinventcolorid
                            standardinventsizeid
                            standardinventstyleid
                            standardinventversionid
                            standardpalletquantity
                            statisticsfactor
                            taraweight
                            taxfiscalclassification_br
                            taxpackagingqty
                            taxservicecode_br
                            unitvolume
                            width
                            wmsarrivalhandlingtime
                            wmspallettypeid
                            wmspickingqtytime
                            intracode
                            satcodeid_mx
                            sattarifffraction_mx
                            hsncodetable_in
                            serviceaccountingcodetable_in
                            productlifecyclestateid
                            cnpj_br
                            taxratetype
                            intrastatchargeperkg
                            coodualusecode
                            costbomlevel
                            trackedcomponentspolicyid
                            freenotesgroup_it
                            nbscode_br
                            indopcode_br
                            itmarrivalgroupid
                            itmcommoditycodeid
                            itmcustomsdescid
                            itmoverundertolerancegroupid
                            itmcosttypegroupid
                            itmcosttransfergroupid
                            revrecdefaultrevenuerecognitionschedule
                            revrecmedianpricemaximumtolerance
                            revrecmedianpriceminimumtolerance
                            qmsapproveditemgroupid
                            qmsunderdispensepct
                            qmsoverdispensepct
                            bpc_refitemid
                            bpc_damageitem
                            bpc_cedcode
                            bpc_warrantyperiod
                            bpc_modelno
                            bpc_status
                            bpc_warranty
                            bpc_serviceobjectgroup
                            bpc_inventorygroup
                            bpc_classmat
                            bpc_groupabc
                            bpc_namegroup
                            bpc_modeldescription
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
            } else if (queryName === 'inventtransfers') {
                fields = `transferid
                            transferstatus
                            inventlocationidfrom
                            inventlocationidto
                            itemid
                            namealias
                            qtytransfer
                            qtyremainreceive
                            qtyreceived
                            shipdate
                            receivedate`;
            } else if (queryName === 'out_Of_Stock_Inventsums') {
                fields = `itemid
                            namealias
                            inventlocationid
                            wmslocationid
                            inventserialid
                            physicalinvent
                            availphysical
                            postedqty
                            reservphysical
                            reservordered
                            ordered
                            onorder
                            availordered
                            picked
                            received
                            deducted
                            physicalvalue
                            postedvalue
                            lastupddatephysical
                            lastupddateexpected
                            modifiedon`;
            } else if (queryName === 'service_Level_Refurbishes') {
                fields = `serviceorderid
                            projid
                            custaccount
                            stageid
                            bpc_maintenanceactivitytypecode
                            bpc_serviceordertypecode
                            bpc_scheduledstart
                            bpc_scheduledstarttime
                            bpc_scheduledfinish
                            bpc_scheduledfinishtime
                            bpc_serviceobject`;
            } else if (queryName === 'service_RequiField_Dispatches') {
                fields = `bpc_postponedate
                            bpc_unkhowpostponedate
                            bpc_postponereasondesc
                            bpc_scheduledstart
                            stageid`;
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
            } else if (queryName === 'service_BN04_New_B2Bs' || queryName === 'service_BN09_New_B2Bs' || queryName === 'service_BN15_New_B2Bs' || queryName === 'service_BN02_New_B2Bs' || queryName === 'service_BN01_New_B2Bs' || queryName === 'service_New_B2Bs' || queryName === 'service_New_NB2Cs') {
                // B2B views - all 199 fields
                fields = `Id
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
                            bpc_bstkd
                            bpc_notiftext
                            bpc_notificationother
                            bpc_reportby
                            bpc_firstorder
                            bpc_firstorderset
                            bpc_daterequest
                            bpc_saporderdate
                            bpc_checkinorderdate
                            bpc_checkinordertime
                            bpc_checkoutorderdate
                            bpc_checkoutordertime
                            bpc_originalmile
                            bpc_destinationmile
                            bpc_serviceorderinterface
                            bpc_lastserviceorder
                            bpc_plangroup
                            bpc_simmobilenumber
                            bpc_simiccid
                            bpc_devicetype
                            bpc_imeiconnectivitydevice
                            bpc_serviceprovoder
                            bpc_remarkk2
                            bpc_customernamesignoff
                            bpc_approve
                            bpc_serviceobject
                            bpc_customerobject
                            bpc_addresskm
                            bpc_addressservicecenter
                            bpc_ordertime
                            bpc_symptomareaid
                            bpc_symptomcodeid
                            bpc_requestdate
                            bpc_requesttime
                            bpc_slastartdate
                            bpc_slastarttime
                            bpc_slafinishdate
                            bpc_slafinishtime
                            bpc_latitude
                            bpc_longitude
                            bpc_compcode
                            bpc_coarea
                            bpc_mainassetno
                            bpc_enterdate
                            bpc_eqktx
                            bpc_profitctr
                            bpc_costcenter
                            bpc_zzcdecode
                            bpc_checkinodpdate
                            bpc_approvename
                            bpc_approvedate
                            bpc_notifcodetext
                            bpc_customerbranch
                            bpc_modelcode
                            bpc_feepercent
                            bpc_postponetime
                            bpc_linenum
                            bpc_tradecode
                            bpc_tradename
                            bpc_custclassificationid
                            bpc_custclassificationdescription
                            bpc_refinvoiceid
                            bpc_postponereasoncode
                            bpc_maintenanceactivitytypedescription
                            bpc_symptomcodedescription
                            bpc_modelnodescription
                            bpc_assetvalue
                            bpc_resolutionid
                            bpc_conditionid
                            bpc_problemcode
                            bpc_smatemplatebomid
                            bpc_smatemplatebomid2
                            bpc_diagnosiscodeid
                            bpc_diagnosisareaid
                            bpc_diagnosiscodename
                            bpc_diagnosisareaname
                            bpc_conditiondescription
                            bpc_problemcodedesc
                            bpc_resolutiondescription
                            bpc_objectreceivedate
                            bpc_objectreceivetime
                            bpc_objectshipdate
                            bpc_objectshiptime
                            bpc_phone
                            bpc_customername
                            bpc_signoffbyname
                            bpc_targetstageid
                            bpc_partsremark
                            bpc_routingnocodechange
                            bpc_auditremark
                            bpc_serviceobjectgroupmobile
                            bpc_mobilekmdistance
                            bpc_startma
                            bpc_assetendwarrantydate
                            bpc_mamonth
                            bpc_workorderwarranty
                            bpc_compressorwarranty
                            bpc_postponereasondesc
                            bpc_sysstatus
                            bpc_servicepostdate
                            bpc_unsignoffname
                            bpc_smaservicepoteddatetime
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
                            PartitionId
                            Province`;
            } else if (queryName === 'service_BN04_News' || queryName === 'service_BN09_News' || queryName === 'service_BN15_News' || queryName === 'service_BN04_NB2CLOAN_News' || queryName === 'service_BN09_NB2CLOAN_News' || queryName === 'service_BN15_NB2CLOAN_News' || queryName === 'service_BN02_News') {
                // FSR Protal views - all 199 fields
                fields = `Id
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
                            bpc_bstkd
                            bpc_notiftext
                            bpc_notificationother
                            bpc_reportby
                            bpc_firstorder
                            bpc_firstorderset
                            bpc_daterequest
                            bpc_saporderdate
                            bpc_checkinorderdate
                            bpc_checkinordertime
                            bpc_checkoutorderdate
                            bpc_checkoutordertime
                            bpc_originalmile
                            bpc_destinationmile
                            bpc_serviceorderinterface
                            bpc_lastserviceorder
                            bpc_plangroup
                            bpc_simmobilenumber
                            bpc_simiccid
                            bpc_devicetype
                            bpc_imeiconnectivitydevice
                            bpc_serviceprovoder
                            bpc_remarkk2
                            bpc_customernamesignoff
                            bpc_approve
                            bpc_serviceobject
                            bpc_customerobject
                            bpc_addresskm
                            bpc_addressservicecenter
                            bpc_ordertime
                            bpc_symptomareaid
                            bpc_symptomcodeid
                            bpc_requestdate
                            bpc_requesttime
                            bpc_slastartdate
                            bpc_slastarttime
                            bpc_slafinishdate
                            bpc_slafinishtime
                            bpc_latitude
                            bpc_longitude
                            bpc_compcode
                            bpc_coarea
                            bpc_mainassetno
                            bpc_enterdate
                            bpc_eqktx
                            bpc_profitctr
                            bpc_costcenter
                            bpc_zzcdecode
                            bpc_checkinodpdate
                            bpc_approvename
                            bpc_approvedate
                            bpc_notifcodetext
                            bpc_customerbranch
                            bpc_modelcode
                            bpc_feepercent
                            bpc_postponetime
                            bpc_linenum
                            bpc_tradecode
                            bpc_tradename
                            bpc_custclassificationid
                            bpc_custclassificationdescription
                            bpc_refinvoiceid
                            bpc_postponereasoncode
                            bpc_maintenanceactivitytypedescription
                            bpc_symptomcodedescription
                            bpc_modelnodescription
                            bpc_assetvalue
                            bpc_resolutionid
                            bpc_conditionid
                            bpc_problemcode
                            bpc_smatemplatebomid
                            bpc_smatemplatebomid2
                            bpc_diagnosiscodeid
                            bpc_diagnosisareaid
                            bpc_diagnosiscodename
                            bpc_diagnosisareaname
                            bpc_conditiondescription
                            bpc_problemcodedesc
                            bpc_resolutiondescription
                            bpc_objectreceivedate
                            bpc_objectreceivetime
                            bpc_objectshipdate
                            bpc_objectshiptime
                            bpc_phone
                            bpc_customername
                            bpc_signoffbyname
                            bpc_targetstageid
                            bpc_partsremark
                            bpc_routingnocodechange
                            bpc_auditremark
                            bpc_serviceobjectgroupmobile
                            bpc_mobilekmdistance
                            bpc_startma
                            bpc_assetendwarrantydate
                            bpc_mamonth
                            bpc_workorderwarranty
                            bpc_compressorwarranty
                            bpc_postponereasondesc
                            bpc_sysstatus
                            bpc_servicepostdate
                            bpc_unsignoffname
                            bpc_smaservicepoteddatetime
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
                            PartitionId
                            Province`;
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
            const pageSize = (queryName === 'dispatch_Pending_Fountains' || queryName === 'dispatch_Pending_New_Customers' || queryName === 'dispatch_Pending_Coolers' || queryName === 'dispatch_Pendings' || queryName === 'smaserviceobjecttable_Internal_Works') ? 5000 : 100000;
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

            // Safety limit to prevent infinite loops (max 5 million records)
            if (pageNum > 1000) {
                logToFile(`[GraphQL] Safety limit reached (1000 pages). Stopping pagination.`);
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

    /**
     * Execute Stored Procedure-backed query for Service Header + Line.
     * Calling Service_Header_Line_Proc
     * Takes @ticketno parameter and returns header + line fields (JOIN smaserviceordertable + smaserviceorderline)
     */
    async executeServiceHeaderLineProc(ticketno = '') {
        try {
            logToFile(`[GraphQL] Executing stored procedure query: executeService_Header_Line_Proc`);

            const token = await this.getAccessToken();

            logToFile(`[GraphQL] Using ticketno: ${ticketno}`);

            const queryBody = `
                query ExecuteServiceHeaderLineProc($ticketno: String!) {
                    executeService_Header_Line_Proc(ticketno: $ticketno) {
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
                variables: { ticketno }
            });

            // Use main IOT Service Order endpoint
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeService_Header_Line_Proc response status: ${response.status}`);

            if (result.errors) {
                logToFile(`[GraphQL] executeService_Header_Line_Proc errors: ${JSON.stringify(result.errors)}`);
            }

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

            logToFile(`[GraphQL] executeService_Header_Line_Proc retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeService_Header_Line_Proc Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute Stored Procedure-backed query for Referenced PO Number.
     * Calling REFERENCEDPONUMBER proc
     * @param {string} referencedPoNumber - The bpc_notificationnosap value to search
     */
    async executeReferencedPoNumber(referencedPoNumber = '') {
        try {
            logToFile(`[GraphQL] Executing stored procedure query: executeREFERENCEDPONUMBER`);

            const token = await this.getAccessToken();

            logToFile(`[GraphQL] Using REFERENCEDPONUMBER: ${referencedPoNumber}`);

            const queryBody = `
                query ExecuteReferencedPoNumber($referencedPoNumber: String!) {
                    executeREFERENCEDPONUMBER(REFERENCEDPONUMBER: $referencedPoNumber) {
                        REFERENCEDPONUMBER
                        POSTPONDATE
                        POSTPONREASON
                        SCHEDULESTARTDATE
                        SCHEDULESTARTTIME
                        REMARKK2
                        ORDERSTATUS
                        RESERVEFIELD1
                        RESERVEFIELD2
                        RESERVEFIELD3
                        RESERVEFIELD4
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: { referencedPoNumber }
            });

            // Use main IOT Service Order endpoint
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeREFERENCEDPONUMBER response status: ${response.status}`);

            if (result.errors) {
                logToFile(`[GraphQL] executeREFERENCEDPONUMBER errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeREFERENCEDPONUMBER) {
                const node = result.data.executeREFERENCEDPONUMBER;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeREFERENCEDPONUMBER retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeREFERENCEDPONUMBER Error: ${error.message}`);
            throw error;
        }
    }
    /**
     * Execute Stored Procedure-backed query for Operation Evaluate Post/Fins.
     * Calling operation_evaluate_post_Fins
     * @param {object} input - { StartDate, FinishDate }
     */
    async executeOperationEvaluatePostFins(input = {}) {
        try {
            logToFile('[GraphQL] Executing stored procedure query: executeoperation_evaluate_post_Fins');

            const token = await this.getAccessToken();

            // Calculate current month date range as defaults
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            // Ensure dates are in ISO DateTime format (GraphQL DateTime! type)
            const rawStartDate = input.StartDate || firstOfMonth;
            const rawFinishDate = input.FinishDate || lastOfMonth;
            const startDate = rawStartDate.includes('T') ? rawStartDate : `${rawStartDate}T00:00:00.000Z`;
            const finishDate = rawFinishDate.includes('T') ? rawFinishDate : `${rawFinishDate}T23:59:59.999Z`;

            logToFile(`[GraphQL] Using Date Range: ${startDate} to ${finishDate}`);

            const queryBody = `
                query ExecuteOperationEvaluatePostFins($startDate: DateTime!, $finishDate: DateTime!) {
                    executeoperation_evaluate_post_Fins(StartDate: $startDate, FinishDate: $finishDate) {
                        serviceorderid
                        bpc_zonegroup
                        bpc_workerpersonnelnum
                        firstname
                        worker
                        qty
                        projsalespriceTotal
                        bpc_inventlocationid
                        bpc_tradecode
                        bpc_tradename
                        stageid
                        bpc_mobilestatus
                        bpc_serviceordertypecode
                        bpc_maintenanceactivitytypecode
                        bpc_maintenanceactivitytypedescription
                        bpc_servicezone
                        bpc_actualstartdate
                        bpc_actualstarttime
                        bpc_actualfinisheddate
                        bpc_actualfinishedtime
                        bpc_slafinishdate
                        transactiontype
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    startDate: startDate,
                    finishDate: finishDate
                }
            });

            // Use main IOT Service Order endpoint
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeoperation_evaluate_post_Fins response status: ${response.status}`);

            if (result.errors) {
                logToFile(`[GraphQL] executeoperation_evaluate_post_Fins errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeoperation_evaluate_post_Fins) {
                const node = result.data.executeoperation_evaluate_post_Fins;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeoperation_evaluate_post_Fins retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeoperation_evaluate_post_Fins Error: ${error.message}`);
            throw error;
        }
    }
    /**
     * Execute Stored Procedure-backed query for Operation Evaluate INPR/INIT.
     * Calling operation_evaluate_inpr_init
     * @param {object} input - { StartDate, FinishDate }
     */
    async executeOperationEvaluateInprInit(input = {}) {
        try {
            logToFile('[GraphQL] Executing stored procedure query: executeoperation_evaluate_inpr_init');

            const token = await this.getAccessToken();

            // Calculate current month date range as defaults
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            // Ensure dates are in ISO DateTime format (GraphQL DateTime! type)
            const rawStartDate = input.StartDate || firstOfMonth;
            const rawFinishDate = input.FinishDate || lastOfMonth;
            const startDate = rawStartDate.includes('T') ? rawStartDate : `${rawStartDate}T00:00:00.000Z`;
            const finishDate = rawFinishDate.includes('T') ? rawFinishDate : `${rawFinishDate}T23:59:59.999Z`;

            logToFile(`[GraphQL] Using Date Range: ${startDate} to ${finishDate}`);

            const queryBody = `
                query ExecuteOperationEvaluateInprInit($startDate: DateTime!, $finishDate: DateTime!) {
                    executeoperation_evaluate_inpr_init(StartDate: $startDate, FinishDate: $finishDate) {
                        serviceorderid
                        bpc_zonegroup
                        bpc_workerpersonnelnum
                        firstname
                        worker
                        qty
                        projsalespriceTotal
                        bpc_inventlocationid
                        bpc_tradecode
                        bpc_tradename
                        stageid
                        bpc_mobilestatus
                        bpc_serviceordertypecode
                        bpc_maintenanceactivitytypecode
                        bpc_maintenanceactivitytypedescription
                        bpc_servicezone
                        bpc_actualstartdate
                        bpc_actualstarttime
                        bpc_actualfinisheddate
                        bpc_actualfinishedtime
                        bpc_slafinishdate
                        transactiontype
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    startDate: startDate,
                    finishDate: finishDate
                }
            });

            // Use main IOT Service Order endpoint
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeoperation_evaluate_inpr_init response status: ${response.status}`);

            if (result.errors) {
                logToFile(`[GraphQL] executeoperation_evaluate_inpr_init errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeoperation_evaluate_inpr_init) {
                const node = result.data.executeoperation_evaluate_inpr_init;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeoperation_evaluate_inpr_init retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeoperation_evaluate_inpr_init Error: ${error.message}`);
            throw error;
        }
    }
    /**
     * Execute Stored Procedure-backed query for Service__Line
     * Calling Service__Line
     * @param {string} serviceorderid - The serviceorderid to search for
     */
    async executeServiceLine(serviceorderid = '') {
        try {
            logToFile(`[GraphQL] Executing stored procedure query: executeService__Line`);

            const token = await this.getAccessToken();

            const queryBody = `
                query ExecuteServiceLine($serviceorderid: String!) {
                    executeService__Line(serviceorderid: $serviceorderid) {
recid
                tableid
                dataareaid
                partition
                recversion
                sysrowversion
                versionnumber
                createdon
                modifiedon
                createddatetime
                createdby
                createdtransactionid
                modifieddatetime
                modifiedby
                modifiedtransactionid
                SinkCreatedOn
                SinkModifiedOn
                IsDelete
                PartitionId
                projtransid
                serviceorderid
                serviceorderlinenum
                activityid
                activitynumber
                servicetaskid
                agreementid
                agreementlinenum
                projid
                itemid
                namealias
                firstname
                description
                descriptionservice
                qty
                unit
                projcategoryid
                projcostprice
                projsalesprice
                projcurrencycode
                currencyidcost
                worker
                serviceobjectid
                serviceobjectrelationid
                datecalculated
                dateexecution
                daterangefrom
                daterangeto
                servicetimestartafter
                servicetimeendbefore
                timesheetstarttime
                timesheetendtime
                serviceorderstatus
                transactiontype
                projtranstxt
                ledgerdimension
                defaultdimension
                inventdimid
                invoiceid
                projlinepropertyid
                projtaxgroup
                projtaxitemgroup
                taxgroupexpense
                taxitemgroupexpense
                issalespricemodified
                offsetaccounttypeexpense
                origin
                signoff
                directsettlement_in
                dsa_in
                exciserecordtype_in
                excisetype_in
                exempt_in
                itccategory_in
                assessablevalue_in
                companylocation_in
                customerlocation_in
                customertaxinformation_in
                customstariffcodetable_in
                excisetariffcodes_in
                hsncodetable_in
                maximumretailprice_in
                postaladdress_in
                salestaxformtypes_in
                serviceaccountingcodetable_in
                servicecodetable_in
                taxinventvatcommoditycodeid_in
                tcsgroup_in
                tdsgroup_in
                vendorlocation_in
                vendortaxinformation_in
                warehouselocation_in
                bpc_smaexpensetype
                bpc_movetype
                bpc_warrantycheck
                bpc_templatebomid
                bpc_refsalesid
                bpc_feedescription
                bpc_saleslinerefrecid
                bpc_feecode
                bpc_actualstartdate
                bpc_actualstarttime
                bpc_actualfinisheddate
                bpc_actualfinishedtime
                bpc_actualhour
                bpc_workerpersonnelnum
                bpc_smaservicetaskdescription
                bpc_activitytype
                bpc_refinvoiceid
                bpc_invoiceaccount
                sysdatastatecode
                    }
                }`;

            const body = JSON.stringify({
                query: queryBody,
                variables: {
                    serviceorderid: serviceorderid
                }
            });

            // Use main IOT Service Order endpoint
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const result = await response.json();
            logToFile(`[GraphQL] Raw executeService__Line response status: ${response.status}`);

            if (result.errors) {
                // If the error is about max result size, we fallback to pagination if possible,
                // but for stored procedures in Fabric, pagination is not directly supported via native items.
                // We will throw the error to the frontend.
                logToFile(`[GraphQL] executeService__Line errors: ${JSON.stringify(result.errors)}`);
            }

            let rows = [];

            if (result.data && result.data.executeService__Line) {
                const node = result.data.executeService__Line;
                if (Array.isArray(node)) {
                    rows = node;
                } else if (node.items && Array.isArray(node.items)) {
                    rows = node.items;
                } else if (typeof node === 'object' && node !== null) {
                    rows = [node];
                }
            }

            logToFile(`[GraphQL] executeService__Line retrieved ${rows.length} rows`);

            if (result.errors && !rows.length) {
                throw new Error(result.errors[0].message);
            }

            return rows;
        } catch (error) {
            logToFile(`[GraphQL] executeService__Line Error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new GraphQLService();
