const config = require('../config');
const simsDbService = require('../services/simsDbService');
const graphqlService = require('../services/graphqlService');
const { logToFile } = require('../utils/logger');

/**
 * Request Status across the new and the old service system.
 *
 *   GET  /api/request-status/:referencedPoNumber
 *   POST /api/request-status        body: { "referencedPoNumber": "..." }
 *
 * Looks the ticket up in SIMS (orders since the 2026-11-01 go-live) first; when SIMS has no match it falls back to
 * F&O through the Fabric stored procedure dbo.REFERENCEDPONUMBER (orders created before the 2026-10-31 cutover),
 * which is what this endpoint read before. The contract did not change: same input (REFERENCEDPONUMBER = service
 * order Ticket No), same Basic Auth, same response fields, STATUS/MESSAGE values and HTTP codes, including the
 * input-error cases. Only the MESSAGE of a 500 caused by a backend failure differs: neutral text instead of the raw
 * upstream error (see docs/AS-request-status.md).
 */

const NOT_FOUND_MESSAGE = 'No data found for the given reference PO number';

const EMPTY = {
    Serviceorderid: '',
    ServiceStage: '',
    PostponeDate: '',
    UnkhowpostponeDate: '',
    PostponereasonDesc: '',
    Scheduledstart: '',
    Modelnodescription: ''
};

// keep only the date part (YYYY-MM-DD), same rule as the original endpoint
function dateOnly(v) {
    if (!v) return '';
    if (v instanceof Date) {
        // pg returns DATE/TIMESTAMP as JS Date; format in local time to avoid shifting the calendar day
        const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(v);
    if (s.includes('T')) return s.split('T')[0];
    if (s.includes(' ')) return s.split(' ')[0];
    return s;
}

function toPayload(rows) {
    const row = rows.length > 0 ? rows[0] : {};
    return {
        Serviceorderid: row.Serviceorderid || '',
        ServiceStage: row.ServiceStage || '',
        PostponeDate: dateOnly(row.PostponeDate),
        UnkhowpostponeDate: row.UnkhowpostponeDate || '',
        PostponereasonDesc: row.PostponereasonDesc || '',
        Scheduledstart: dateOnly(row.Scheduledstart),
        Modelnodescription: row.Modelnodescription || '',
        STATUS: rows.length > 0 ? 'SUCCESS' : 'NOT_FOUND',
        MESSAGE: rows.length > 0 ? 'Data retrieved successfully' : NOT_FOUND_MESSAGE
    };
}

// map internal errors to neutral messages that are safe to return to API callers (no DB product, host or role names)
function publicMessage(error) {
    const m = String((error && error.message) || '');
    if (/not configured/i.test(m)) return 'Request status service is not configured';
    // SQLSTATE 53300 = connection limit reached (per role, per database, server-wide max_connections or reserved slots)
    if ((error && error.code === '53300') || /too many (connections|clients)|connection slots are reserved/i.test(m)) {
        return 'Request status service is busy, please retry';
    }
    if (/timeout|timed out|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(m)) return 'Request status service is unreachable, please retry';
    return 'Failed to read request status';
}

// The previous implementation passed the body value to a GraphQL `String!` variable, so a JSON number / true / array /
// object came back as HTTP 500 with the GraphQL coercion message. Return exactly that, so existing callers see no change.
// (Such a value is never looked up: a JSON number would also have lost its leading zeros.)
function nonStringMessage(value) {
    const type = Array.isArray(value) ? 'Array' : value === true ? 'True' : typeof value === 'number' ? 'Number' : 'Object';
    return `String cannot coerce the given value JSON element of type \`${type}\` to a runtime value.`;
}

// SIMS normally answers in ~50 ms. When it is slow (locks, outage, full pool) callers must not wait for the pool /
// statement timeouts (15-35 s) before F&O is asked, so the SIMS lookup gets its own deadline. A late SIMS query
// keeps running in the background and its result is ignored.
function simsLookupWithDeadline(referencedPoNumber) {
    const ms = (config.simsDb && config.simsDb.lookupDeadlineMillis) || 5000;
    let timer;
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`SIMS lookup timed out after ${ms} ms`)), ms);
    });
    const lookup = simsDbService.getRequestStatusByPo(referencedPoNumber);
    lookup.catch(() => {}); // a failure after the deadline must not become an unhandled rejection
    return Promise.race([lookup, deadline]).finally(() => clearTimeout(timer));
}

// SIMS first (newest orders); F&O only when SIMS has no match. A ticket present in both returns the SIMS order —
// except while SIMS cannot be reached, when an F&O match is returned (possibly an older order of the same ticket).
// NOT_FOUND is only answered when both systems answered "no rows": if either lookup failed and the other found
// nothing, the order may exist in the failed one, so the error is raised instead.
async function lookupBothSystems(referencedPoNumber) {
    let simsError = null;
    try {
        const rows = await simsLookupWithDeadline(referencedPoNumber);
        if (rows.length > 0) return { rows, from: 'SIMS' };
    } catch (error) {
        simsError = error;
        logToFile(`[SIMS-RequestStatus] SIMS lookup failed, trying F&O: ${error.message}`);
    }
    // rows already carry the payload keys (Serviceorderid, ...) and the dates as text, exactly as the previous
    // Fabric-backed implementation returned them, so toPayload() produces the same response
    const rows = await graphqlService.executeReferencedPoNumber(referencedPoNumber);
    if (rows.length > 0) return { rows, from: 'F&O' };
    if (simsError) throw simsError;
    return { rows: [], from: 'none' };
}

async function respond(res, referencedPoNumber, source) {
    try {
        // JSON.stringify + cap: a ticket with newlines cannot forge extra log lines, a huge body cannot flood the log
        logToFile(`[SIMS-RequestStatus] ${source} referencedPoNumber=${JSON.stringify(String(referencedPoNumber).slice(0, 100))}`);
        // PostgreSQL rejects a NUL byte in text parameters; such a ticket can never exist, so answer NOT_FOUND
        // like the Fabric implementation did instead of turning bad input into a 500
        if (String(referencedPoNumber).includes('\u0000')) {
            return res.json(toPayload([]));
        }
        // a blank ticket (only spaces) would become '' after rtrim in the SQL and could match any order saved with an
        // empty-string TicketNo; it is never a real ticket, so answer NOT_FOUND as the Fabric implementation did
        if (String(referencedPoNumber).replace(/ +$/, '') === '') {
            return res.json(toPayload([]));
        }
        const { rows, from } = await lookupBothSystems(referencedPoNumber);
        logToFile(`[SIMS-RequestStatus] returning ${rows.length} row(s) from ${from}`);
        res.json(toPayload(rows));
    } catch (error) {
        // full detail stays in the server log; callers get a generic message so DB role names / hosts are not exposed
        logToFile(`[SIMS-RequestStatus] error: ${error.message}`);
        res.status(500).json({ ...EMPTY, STATUS: 'ERROR', MESSAGE: publicMessage(error) });
    }
}

class SimsRequestStatusController {
    async getRequestStatus(req, res) {
        return respond(res, req.params.referencedPoNumber || '', 'GET');
    }

    async postRequestStatus(req, res) {
        const referencedPoNumber = (req.body && req.body.referencedPoNumber) || '';
        if (!referencedPoNumber) {
            return res.status(400).json({ ...EMPTY, STATUS: 'ERROR', MESSAGE: 'referencedPoNumber is required in request body' });
        }
        if (typeof referencedPoNumber !== 'string') {
            logToFile(`[SIMS-RequestStatus] POST rejected non-string referencedPoNumber (${Array.isArray(referencedPoNumber) ? 'array' : typeof referencedPoNumber})`);
            return res.status(500).json({ ...EMPTY, STATUS: 'ERROR', MESSAGE: nonStringMessage(referencedPoNumber) });
        }
        return respond(res, referencedPoNumber, 'POST');
    }
}

module.exports = new SimsRequestStatusController();
