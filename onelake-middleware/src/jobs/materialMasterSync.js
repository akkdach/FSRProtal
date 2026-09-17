// Single entry point for the Material Master sync (F&O view Sync_Material_master → BevproFsProd.dbo.material_master).
//
// Two schedulers call this:
//   - GitHub Actions (.github/workflows/material-master-sync.yml) → POST /api/sync/material-master-sync   (primary, 05:30 + 13:00 BKK)
//   - node-cron inside this process (src/jobs/cronJobs.js)                                                 (fallback, 05:45 + 13:15 BKK)
// so the run must be safe to trigger twice: a second trigger while one is running, or shortly after a
// successful one, is skipped instead of syncing (and notifying Teams) again. `force` bypasses the
// "recent success" skip for manual runs. State is in-memory: the Web App runs a single instance, and a
// restart simply forgets the last success (worst case = one extra idempotent MERGE).
const syncService = require('../services/syncService');
const teamsNotificationService = require('../services/teamsNotificationService');
const config = require('../config');
const { logToFile } = require('../utils/logger');

const LABEL = 'Material Master';
const state = { running: false, lastSuccessAt: 0 };

function shouldSkip({ force = false, now = Date.now() } = {}) {
    if (state.running) return { skip: true, reason: 'already_running' };
    const dedupMs = (config.materialMasterSync?.dedupMinutes ?? 45) * 60 * 1000;
    if (!force && state.lastSuccessAt && now - state.lastSuccessAt < dedupMs) {
        return { skip: true, reason: 'recent_success', lastSuccessAt: new Date(state.lastSuccessAt).toISOString() };
    }
    return { skip: false };
}

async function runMaterialMasterSync({ trigger = 'manual', force = false } = {}) {
    const gate = shouldSkip({ force });
    if (gate.skip) {
        logToFile(`[MaterialMasterSync] Skipped (${gate.reason}) — trigger=${trigger}`);
        return { skipped: true, reason: gate.reason, lastSuccessAt: gate.lastSuccessAt || null };
    }

    state.running = true;
    const startedAt = Date.now();
    logToFile(`[MaterialMasterSync] START trigger=${trigger} force=${force}`);
    try {
        const result = await syncService.syncFromGraphQLUpsert('Sync_Material_master', 'material_master', 'MATERIAL', config.prodSql);
        const durationSec = Number(((Date.now() - startedAt) / 1000).toFixed(2));
        state.lastSuccessAt = Date.now();
        logToFile(`✅ [MaterialMasterSync][SUCCESS] ${durationSec}s — total=${result.total ?? 0} inserted=${result.inserted ?? 0} updated=${result.updated ?? 0}`);
        await teamsNotificationService.notifySyncResult({ label: LABEL, ok: true, trigger, durationSec, result });
        return { skipped: false, durationSec, result };
    } catch (error) {
        const durationSec = Number(((Date.now() - startedAt) / 1000).toFixed(2));
        logToFile(`❌ [MaterialMasterSync][FAILED] ${durationSec}s — ${error.message}`);
        await teamsNotificationService.notifySyncResult({ label: LABEL, ok: false, trigger, durationSec, error });
        throw error;
    } finally {
        state.running = false;
    }
}

module.exports = { runMaterialMasterSync, shouldSkip, _state: state };
