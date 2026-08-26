const fetch = require('isomorphic-fetch');
const sql = require('mssql');
const config = require('../config');
const { logToFile } = require('../utils/logger');

// Two Teams rooms, split by Manpower_Operations.Technician:
//   Technician = 'No'             → TEAMS_WEBHOOK_URL_NON_TECH  (ห้องพนักงานที่ไม่ใช่ช่าง)
//   anything else (Yes / blank)   → TEAMS_WEBHOOK_URL           (ห้อง HR Notification เดิม)
// Blank counts as technician — same rule the Manpower page in pro-iot-board uses.
// If the non-tech URL is not configured yet, non-tech alerts fall back to the main
// room (with a log warning) so nothing is silently dropped during rollout.
const GROUPS = {
    tech: { key: 'tech', label: 'ช่าง (Technician = Yes)', urlKey: 'webhookUrl', envName: 'TEAMS_WEBHOOK_URL' },
    nonTech: { key: 'nonTech', label: 'ไม่ใช่ช่าง (Technician = No)', urlKey: 'webhookUrlNonTech', envName: 'TEAMS_WEBHOOK_URL_NON_TECH' },
};

function groupOf(technician) {
    const isNonTech = String(technician || '').trim().toLowerCase() === 'no';
    return isNonTech ? GROUPS.nonTech : GROUPS.tech;
}

function resolveWebhook(group) {
    const url = config.teams?.[group.urlKey];
    if (url) return url;
    if (group.key === 'nonTech' && config.teams?.webhookUrl) {
        logToFile(`[TeamsAlert] Warning: ${group.envName} is not configured — non-technician alert sent to the main room instead`);
        return config.teams.webhookUrl;
    }
    return null;
}

async function postCard(webhookUrl, card) {
    const payload = {
        type: 'message',
        attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
                '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.4',
                ...card,
            },
        }],
    };
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to send MS Teams alert: ${response.status} ${response.statusText}`);
    }
}

class TeamsNotificationService {
    /**
     * DRAFT summary — one card per room, each listing only that room's people.
     * Pass { technician } (the value just saved) to notify ONLY that group's room —
     * the create/update triggers do this so saving a Technician = No row never pings
     * the technician room. Omit it (cron / test-webhook) to send both rooms.
     */
    async checkAndNotifyDraftManpower({ technician } = {}) {
        if (!config.teams?.webhookUrl) {
            logToFile('[TeamsAlert] Warning: TEAMS_WEBHOOK_URL is not configured in .env');
            return;
        }

        try {
            logToFile('[TeamsAlert] Checking for Manpower DRAFT cases...');
            const pool = await sql.connect(config.prodSql);

            const query = `
                SELECT
                    [No], [EmployeeCode], [FullName], [Position], [Department], [Technician], [ModifyDate]
                FROM [dbo].[Manpower_Operations]
                WHERE UPPER([HR_Status]) = 'DRAFT'
                  AND ([Status] <> 'Deleted' OR [Status] IS NULL)
                ORDER BY [ModifyDate] DESC
            `;

            const result = await pool.request().query(query);
            const rows = result.recordset;

            if (rows.length === 0) {
                logToFile('[TeamsAlert] No DRAFT cases found. Everything is up to date.');
                return;
            }

            const byGroup = { tech: [], nonTech: [] };
            rows.forEach(r => byGroup[groupOf(r.Technician).key].push(r));

            const targetGroups = technician === undefined
                ? [GROUPS.tech, GROUPS.nonTech]
                : [groupOf(technician)];

            for (const group of targetGroups) {
                const list = byGroup[group.key];
                if (list.length === 0) continue;

                const webhookUrl = resolveWebhook(group);
                if (!webhookUrl) {
                    logToFile(`[TeamsAlert] Skipped ${list.length} DRAFT cases (${group.key}) — ${group.envName} not configured`);
                    continue;
                }

                logToFile(`[TeamsAlert] Found ${list.length} DRAFT cases (${group.key}). Sending notification...`);
                await postCard(webhookUrl, {
                    body: [
                        {
                            type: 'TextBlock',
                            text: '⚠️ แจ้งเตือน: มีข้อมูล Manpower รอการ SUBMIT',
                            weight: 'Bolder',
                            size: 'Large',
                            color: 'Warning',
                        },
                        {
                            type: 'TextBlock',
                            text: `กลุ่ม: **${group.label}** — พบข้อมูลที่ยังคงสถานะ DRAFT จำนวน **${list.length}** รายการ`,
                            wrap: true,
                        },
                        {
                            type: 'FactSet',
                            facts: list.map(r => ({
                                title: r.EmployeeCode || 'N/A',
                                value: `${r.FullName} (${r.Position})`,
                            })),
                        },
                    ],
                    actions: [
                        {
                            type: 'Action.OpenUrl',
                            title: 'เปิดระบบ Smart Field Service',
                            url: 'https://proservice.bevproasia.com/Admin/ManpowerManagement',
                        },
                    ],
                });
                logToFile(`[TeamsAlert] Notification sent successfully (${group.key}).`);
            }
        } catch (err) {
            logToFile(`[TeamsAlert] Error: ${err.message}`);
        }
    }

    /** Delete alert — routed by the deleted row's Technician flag (read before the DELETE). */
    async notifyDeleteManpower(deletedName, deletedCode, deletedBy, technician) {
        const group = groupOf(technician);
        const webhookUrl = resolveWebhook(group);
        if (!webhookUrl) return;
        try {
            await postCard(webhookUrl, {
                body: [
                    { type: 'TextBlock', text: '🗑️ แจ้งเตือน: มีการลบข้อมูล Manpower ออกจากระบบ', weight: 'Bolder', size: 'Large', color: 'Attention' },
                    {
                        type: 'FactSet',
                        facts: [
                            { title: 'ชื่อ-นามสกุล (ผู้ถูกลบ):', value: deletedName || 'N/A' },
                            { title: 'รหัสพนักงาน:', value: deletedCode || 'N/A' },
                            { title: 'กลุ่ม:', value: group.label },
                            { title: 'ลบโดย:', value: deletedBy || 'Unknown' },
                            { title: 'วันเวลาที่ลบ:', value: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) },
                        ],
                    },
                ],
            });
            logToFile(`[TeamsAlert] Delete notification sent successfully (${group.key}).`);
        } catch (err) {
            logToFile('[TeamsAlert] Error: ' + err.message);
        }
    }
}

module.exports = new TeamsNotificationService();
