const { Pool } = require('pg');
const config = require('../config');
const { logToFile } = require('../utils/logger');

/**
 * SIMS PostgreSQL data source (the service system that replaced D365 F&O at the 2026-10-31 cutover).
 *
 * Used by /api/request-status (GET + POST), which tries SIMS first and falls back to the Fabric GraphQL stored
 * procedure dbo.REFERENCEDPONUMBER for orders created in F&O before the cutover (see docs/AD-request-status-data-source.md).
 *
 * The pool is created lazily so the app still boots when SIMS_DB_* is not configured (e.g. local dev);
 * getPool() then throws, the controller treats that as a failed SIMS lookup and still asks F&O, so only a
 * ticket F&O does not have answers 500 STATUS=ERROR ("not configured").
 */
let pool = null;

function isConfigured() {
    const c = config.simsDb;
    return Boolean(c && c.host && c.database && c.user && c.password);
}

function getPool() {
    if (!isConfigured()) {
        throw new Error('SIMS database is not configured (set SIMS_DB_HOST / SIMS_DB_DATABASE / SIMS_DB_USER / SIMS_DB_PASSWORD)');
    }
    if (!pool) {
        const c = config.simsDb;
        // Fail closed: without a verified server identity a spoofed server can ask for a cleartext password and
        // node-postgres would send it (pg has no equivalent of libpq channel_binding=require). Only an explicit
        // SIMS_DB_SSL_INSECURE=true (e.g. a local test DB) allows an unverified or unencrypted connection.
        if (!c.insecure && !(c.sslEnabled && c.sslCa)) {
            throw new Error('SIMS database TLS is not configured (set SIMS_DB_SSL=true and SIMS_DB_SSL_CA)');
        }
        let ssl = false;
        if (c.sslEnabled) {
            ssl = c.sslCa
                ? { ca: c.sslCa, rejectUnauthorized: true }   // server certificate verified against SIMS_DB_SSL_CA only
                : { rejectUnauthorized: false };              // insecure opt-in only: encrypted, server NOT verified
        }
        pool = new Pool({
            host: c.host,
            port: c.port,
            database: c.database,
            user: c.user,
            password: c.password,
            ssl,
            enableChannelBinding: Boolean(ssl) && c.channelBinding,
            max: c.max,
            idleTimeoutMillis: c.idleTimeoutMillis,
            connectionTimeoutMillis: c.connectionTimeoutMillis,
            // server-side kill for runaway queries ...
            statement_timeout: c.statementTimeoutMillis,
            // ... and a client-side cap for when the network path dies mid-query (server timeout never arrives)
            query_timeout: c.queryTimeoutMillis,
            // detect half-open TCP connections to the remote VM
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000
        });
        // a pool-level error listener is required, otherwise an idle-client error kills the process
        pool.on('error', (err) => logToFile(`[SIMS-DB] idle client error: ${err.message}`));
        const tlsMode = !ssl ? 'off (SIMS_DB_SSL_INSECURE)' : (c.sslCa ? 'verified (SIMS_DB_SSL_CA)' : 'encrypted, server NOT verified (SIMS_DB_SSL_INSECURE)');
        logToFile(`[SIMS-DB] pool created for database ${c.database} (tls=${tlsMode}, channelBinding=${Boolean(ssl) && c.channelBinding}, max=${c.max})`);
    }
    return pool;
}

async function query(text, params = []) {
    const started = Date.now();
    const result = await getPool().query(text, params);
    logToFile(`[SIMS-DB] query ok in ${Date.now() - started}ms, rows=${result.rowCount}`);
    return result.rows;
}

/**
 * SIMS equivalent of the Fabric stored procedure dbo.REFERENCEDPONUMBER that /api/request-status used before the cutover:
 *
 *   SELECT serviceorderid, stageid, bpc_postponedate, CASE bpc_unkhowpostponedate 1->'Yes' 0->'No',
 *          bpc_postponereasondesc, bpc_scheduledstart, bpc_modelnodescription
 *   FROM smaserviceordertable WHERE bpc_ticketno = @REFERENCEDPONUMBER
 *
 * Column mapping (verified against the SIMS schema, see docs/AS-request-status.md):
 *   bpc_ticketno            -> od."TicketNo"           (the "referenced PO number" = customer PO / SAP BSTKD)
 *   serviceorderid          -> so."ServiceOrderNumber"
 *   stageid                 -> od."ServiceStage"       (same codes: INIT / INPR / FINS / POST / CANC)
 *   bpc_postponedate        -> od."PostponeDate"
 *   bpc_unkhowpostponedate  -> od."UnknownPostponeDate" (SIMS stores a text label, F&O a 0/1 flag)
 *   bpc_postponereasondesc  -> sd."PostponeDescription" (text stored on the order, not the master)
 *   bpc_scheduledstart      -> od."ScheduleStartDate"
 *   bpc_modelnodescription  -> od."ModelDescription", falling back to the SMAModelNumber master
 *
 * Parity choices, so callers see the same values as from the Fabric implementation:
 *   - dates are returned as 'YYYY-MM-DD' text (to_char) — no JS Date / timezone shifting;
 *   - an empty date returns '1900-01-01', exactly what the Fabric endpoint returns (F&O stores 1900-01-01 for "no date");
 *   - UnkhowpostponeDate is never empty in F&O (NoYes default 0), so an unset SIMS value returns 'No';
 *   - ticket match is exact and case-sensitive like the Fabric BIN2 collation; trailing spaces are ignored like SQL Server.
 *
 * The original SP has no ORDER BY, so for a ticket shared by several orders (e.g. ZC04 Install + ZC09 Remove)
 * Fabric returns an arbitrary one. Here the newest order wins (CreatedDateTime DESC, RecId DESC) so the answer is stable.
 */
const REQUEST_STATUS_SELECT = `
SELECT
    so."ServiceOrderNumber"                                              AS "Serviceorderid",
    od."ServiceStage"                                                    AS "ServiceStage",
    COALESCE(to_char(od."PostponeDate", 'YYYY-MM-DD'), '1900-01-01')     AS "PostponeDate",
    CASE lower(btrim(COALESCE(od."UnknownPostponeDate", '')))
        WHEN 'yes' THEN 'Yes' WHEN '1' THEN 'Yes' WHEN 'true'  THEN 'Yes'
        WHEN 'no'  THEN 'No'  WHEN '0' THEN 'No'  WHEN 'false' THEN 'No'
        WHEN ''    THEN 'No'
        ELSE NULL
    END                                                                  AS "UnkhowpostponeDate",
    NULLIF(sd."PostponeDescription", '')                                 AS "PostponereasonDesc",
    COALESCE(to_char(od."ScheduleStartDate", 'YYYY-MM-DD'), '1900-01-01') AS "Scheduledstart",
    COALESCE(NULLIF(od."ModelDescription", ''), mn."Description")        AS "Modelnodescription"
FROM "SMAServiceDocumentOperationalDetail" od
JOIN "SMAServiceOrderTable" so
  ON so."DataAreaId" = od."DataAreaId"
 AND so."ServiceDocumentRecId" = od."ServiceDocumentRecId"
JOIN "SMAServiceDocumentTable" sd
  ON sd."DataAreaId" = od."DataAreaId"
 AND sd."RecId" = od."ServiceDocumentRecId"
LEFT JOIN "SMAModelNumber" mn
  ON mn."DataAreaId" = od."DataAreaId"
 AND mn."Code" = od."ModelNo"`;

const REQUEST_STATUS_SQL = `${REQUEST_STATUS_SELECT}
WHERE od."DataAreaId" = $2
  AND od."TicketNo" = rtrim($1)
ORDER BY so."CreatedDateTime" DESC, so."RecId" DESC
LIMIT 1`;

async function getRequestStatusByPo(referencedPoNumber) {
    const dataAreaId = config.simsDb.dataAreaId || 'BPA';
    return query(REQUEST_STATUS_SQL, [String(referencedPoNumber), dataAreaId]);
}

async function close() {
    if (pool) { await pool.end(); pool = null; }
}

module.exports = { isConfigured, query, getRequestStatusByPo, close };
