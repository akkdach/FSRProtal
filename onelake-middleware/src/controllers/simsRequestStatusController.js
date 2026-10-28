const simsDbService = require('../services/simsDbService');
const { logToFile } = require('../utils/logger');

/**
 * Request Status backed by the new SIMS PostgreSQL database.
 *
 * Same contract as the Fabric-backed /api/request-status (fsrProtalController_graphql.getRequestStatus):
 * same input (REFERENCEDPONUMBER = service order Ticket No), same Basic Auth, same response fields and STATUS/MESSAGE values.
 * Only the data source differs, so callers can switch by changing the path.
 *
 *   GET  /api/request-status-sims/:referencedPoNumber
 *   POST /api/request-status-sims        body: { "referencedPoNumber": "..." }
 *
 * SIMS-only extra (no Fabric counterpart), same response shape, for orders that have no Ticket No:
 *   GET  /api/request-status-sims/order/:serviceOrderNumber
 */

const BY_TICKET = {
    field: 'referencedPoNumber',
    lookup: (value) => simsDbService.getRequestStatusByPo(value),
    notFoundMessage: 'No data found for the given reference PO number'
};

const BY_ORDER = {
    field: 'serviceOrderNumber',
    lookup: (value) => simsDbService.getRequestStatusByOrder(value),
    notFoundMessage: 'No data found for the given service order number'
};

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

function toPayload(rows, notFoundMessage = BY_TICKET.notFoundMessage) {
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
        MESSAGE: rows.length > 0 ? 'Data retrieved successfully' : notFoundMessage
    };
}

// map internal errors to messages that are safe to return to API callers
function publicMessage(error) {
    const m = String((error && error.message) || '');
    if (/not configured/i.test(m)) return 'SIMS database is not configured on this server';
    if (/too many connections/i.test(m)) return 'SIMS database is busy (connection limit reached), please retry';
    if (/timeout|timed out|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(m)) return 'SIMS database is unreachable, please retry';
    return 'Failed to read request status from SIMS';
}

async function respond(res, kind, value, source) {
    try {
        // JSON.stringify + cap: a ticket with newlines cannot forge extra log lines, a huge body cannot flood the log
        logToFile(`[SIMS-RequestStatus] ${source} ${kind.field}=${JSON.stringify(String(value).slice(0, 100))}`);
        // PostgreSQL rejects a NUL byte in text parameters; such a ticket can never exist, so answer NOT_FOUND
        // like the Fabric endpoint does instead of turning bad input into a 500
        if (String(value).includes('\u0000')) {
            return res.json(toPayload([], kind.notFoundMessage));
        }
        const rows = await kind.lookup(value);
        logToFile(`[SIMS-RequestStatus] returning ${rows.length} row(s)`);
        res.json(toPayload(rows, kind.notFoundMessage));
    } catch (error) {
        // full detail stays in the server log; callers get a generic message so DB role names / hosts are not exposed
        logToFile(`[SIMS-RequestStatus] error: ${error.message}`);
        res.status(500).json({ ...EMPTY, STATUS: 'ERROR', MESSAGE: publicMessage(error) });
    }
}

class SimsRequestStatusController {
    async getRequestStatus(req, res) {
        return respond(res, BY_TICKET, req.params.referencedPoNumber || '', 'GET');
    }

    async getRequestStatusByOrder(req, res) {
        return respond(res, BY_ORDER, req.params.serviceOrderNumber || '', 'GET');
    }

    async postRequestStatus(req, res) {
        const referencedPoNumber = (req.body && req.body.referencedPoNumber) || '';
        if (!referencedPoNumber) {
            return res.status(400).json({ ...EMPTY, STATUS: 'ERROR', MESSAGE: 'referencedPoNumber is required in request body' });
        }
        // strings only: a JSON number would lose leading zeros ("000049048085" -> 49048085) and silently answer NOT_FOUND
        if (typeof referencedPoNumber !== 'string') {
            return res.status(400).json({ ...EMPTY, STATUS: 'ERROR', MESSAGE: 'referencedPoNumber must be a string' });
        }
        return respond(res, BY_TICKET, referencedPoNumber, 'POST');
    }
}

module.exports = new SimsRequestStatusController();
