// Per-run history of the Material Master sync + the Excel export of "which records changed".
//
// Each successful run is stored as one JSON file (run metadata + the change list captured before the MERGE).
// The Teams result card carries a download button → GET /api/sync/material-master-sync/changes/:runId, which
// builds the .xlsx on demand from that JSON. The link is a signed URL (HMAC-SHA256 over "runId.exp"): it is
// opened from Teams in a browser, where no JWT / Basic Auth header can be attached, and it expires.
// The signed URL is only ever sent to Teams — never returned in the HTTP response of the sync endpoint,
// because that response is printed in the (public) GitHub Actions log.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const config = require('../config');
const { logToFile } = require('../utils/logger');

const RUN_ID_RE = /^\d{8}-\d{6}-[a-f0-9]{6}$/;
const cfg = () => config.materialMasterSync || {};

function newRunId(now = new Date()) {
    const bkk = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const p = n => String(n).padStart(2, '0');
    const stamp = `${bkk.getFullYear()}${p(bkk.getMonth() + 1)}${p(bkk.getDate())}-${p(bkk.getHours())}${p(bkk.getMinutes())}${p(bkk.getSeconds())}`;
    return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function saveRun(run) {
    if (!RUN_ID_RE.test(run.runId)) throw new Error(`invalid runId ${run.runId}`);
    const dir = cfg().historyDir;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${run.runId}.json`), JSON.stringify(run));
    // prune: runId starts with a timestamp, so a plain sort is chronological
    const files = fs.readdirSync(dir).filter(f => RUN_ID_RE.test(f.replace(/\.json$/, ''))).sort();
    const excess = files.length - (cfg().historyKeep || 120);
    for (let i = 0; i < excess; i++) {
        try { fs.unlinkSync(path.join(dir, files[i])); } catch (e) { /* best effort */ }
    }
}

function loadRun(runId) {
    if (!RUN_ID_RE.test(String(runId))) return null;   // also blocks path traversal
    try {
        return JSON.parse(fs.readFileSync(path.join(cfg().historyDir, `${runId}.json`), 'utf8'));
    } catch (e) {
        return null;
    }
}

function sign(runId, exp) {
    const secret = cfg().linkSecret;
    if (!secret) return null;
    return crypto.createHmac('sha256', secret).update(`${runId}.${exp}`).digest('base64url');
}

function buildDownloadUrl(runId, now = Date.now()) {
    const exp = Math.floor(now / 1000) + (cfg().linkTtlDays || 14) * 86400;
    const sig = sign(runId, exp);
    if (!sig) return null;
    return `${cfg().publicBaseUrl}/api/sync/material-master-sync/changes/${runId}?exp=${exp}&sig=${sig}`;
}

// → { ok: true } | { ok: false, reason: 'bad_link' | 'expired' }
function verifyLink(runId, exp, sig, now = Date.now()) {
    const expNum = Number(exp);
    const expected = RUN_ID_RE.test(String(runId)) && Number.isFinite(expNum) ? sign(runId, expNum) : null;
    if (!expected || typeof sig !== 'string') return { ok: false, reason: 'bad_link' };
    const a = Buffer.from(expected); const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'bad_link' };
    if (expNum * 1000 < now) return { ok: false, reason: 'expired' };
    return { ok: true };
}

async function buildWorkbookBuffer(run) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'onelake-middleware';
    wb.created = new Date();
    const cols = run.updatedColumns || [];
    const pk = run.primaryKey || 'KEY';

    const ws = wb.addWorksheet('รายการที่เปลี่ยน');
    ws.addRow(['ประเภท', pk, 'ฟิลด์ที่เปลี่ยน', ...cols.flatMap(c => [`${c} (เดิม)`, `${c} (ใหม่)`])]);
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7ECF1' } };
    for (const ch of run.changes || []) {
        const isInsert = ch.action === 'INSERT';
        const row = ws.addRow([
            isInsert ? 'เพิ่มใหม่' : 'แก้ไข', ch.key,
            isInsert ? '(ทั้งแถว)' : (ch.changedFields || []).join(', '),
            ...cols.flatMap(c => [ch.fields?.[c]?.old ?? '', ch.fields?.[c]?.new ?? '']),
        ]);
        // highlight the new value of every field that actually changed
        cols.forEach((c, i) => {
            if (isInsert || (ch.changedFields || []).includes(c)) {
                row.getCell(5 + i * 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isInsert ? 'FFE1F3E8' : 'FFFFF2CC' } };
            }
        });
    }
    ws.columns.forEach((col, i) => { col.width = i === 0 ? 12 : i === 1 ? 22 : i === 2 ? 28 : 32; });
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, ws.rowCount), column: 3 + cols.length * 2 } };

    const sum = wb.addWorksheet('สรุป');
    [
        ['รอบ sync (runId)', run.runId],
        ['เริ่ม', run.startedAt], ['เสร็จ', run.finishedAt], ['ใช้เวลา (วินาที)', run.durationSec],
        ['สั่งรันโดย', run.trigger],
        ['ต้นทาง', run.sourceView], ['ปลายทาง', run.targetTable],
        ['ดึงจากต้นทาง (แถว)', run.total],
        ['เพิ่มใหม่ (record)', run.inserted], ['แก้ไข (record)', run.updated],
        ['คอลัมน์ที่ sync', (run.updatedColumns || []).join(', ')],
        ['คอลัมน์ที่ไม่แตะ', (run.preservedColumns || []).join(', ')],
        ['หมายเหตุ', 'ค่าเดิม = ค่าในตารางก่อน MERGE ของรอบนี้ · เทียบแบบ case-sensitive (BIN2) · ช่องสีเหลือง = ค่าที่เปลี่ยน, สีเขียว = record ใหม่'],
    ].forEach(r => sum.addRow(r));
    sum.getColumn(1).width = 26; sum.getColumn(1).font = { bold: true }; sum.getColumn(2).width = 90;

    return wb.xlsx.writeBuffer();
}

function safeSave(run) {
    try { saveRun(run); return true; }
    catch (e) { logToFile(`[SyncHistory] Could not save run ${run.runId}: ${e.message}`); return false; }
}

module.exports = { newRunId, saveRun, safeSave, loadRun, buildDownloadUrl, verifyLink, buildWorkbookBuffer, RUN_ID_RE };
