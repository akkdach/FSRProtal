const fetch = require('isomorphic-fetch');
const sql = require('mssql');
const config = require('../config');
const { logToFile } = require('../utils/logger');

class TeamsNotificationService {
    async checkAndNotifyDraftManpower() {
        const webhookUrl = config.teams?.webhookUrl;
        
        if (!webhookUrl) {
            logToFile('[TeamsAlert] Warning: TEAMS_WEBHOOK_URL is not configured in .env');
            return;
        }

        try {
            logToFile('[TeamsAlert] Checking for Manpower DRAFT cases...');
            const pool = await sql.connect(config.prodSql);
            
            const query = `
                SELECT 
                    [No], [EmployeeCode], [FullName], [Position], [Department], [ModifyDate]
                FROM [dbo].[Manpower_Operations]
                WHERE UPPER([HR_Status]) = 'DRAFT' 
                  AND ([Status] <> 'Deleted' OR [Status] IS NULL)
                ORDER BY [ModifyDate] DESC
            `;
            
            const result = await pool.request().query(query);
            const draftCount = result.recordset.length;

            if (draftCount > 0) {
                logToFile(`[TeamsAlert] Found ${draftCount} DRAFT cases. Sending notification...`);
                
                const facts = result.recordset.slice(0, 5).map(r => ({
                    name: r.EmployeeCode || 'N/A',
                    value: `${r.FullName} (${r.Position})`
                }));

                const payload = {
                    "@type": "MessageCard",
                    "@context": "http://schema.org/extensions",
                    "themeColor": "f59e0b",
                    "summary": `แจ้งเตือน: มีพนักงานติดสถานะ DRAFT ${draftCount} รายการ`,
                    "sections": [{
                        "activityTitle": "⚠️ แจ้งเตือน: มีข้อมูล Manpower ที่รอการ SUBMIT",
                        "activitySubtitle": `พบข้อมูลที่ยังคงสถานะ DRAFT จำนวน **${draftCount}** รายการ กรุณาตรวจสอบและดำเนินการ SUBMIT ในระบบ`,
                        "activityImage": "https://img.icons8.com/color/48/000000/high-priority.png",
                        "facts": facts,
                        "markdown": true
                    }],
                    "potentialAction": [{
                        "@type": "OpenUri",
                        "name": "เปิดระบบ Smart Field Service",
                        "targets": [{
                            "os": "default",
                            "uri": "http://localhost:3000/Admin/ManpowerManagement"
                        }]
                    }]
                };

                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Failed to send MS Teams alert: ${response.status} ${response.statusText}`);
                }

                logToFile('[TeamsAlert] Notification sent successfully.');
            } else {
                logToFile('[TeamsAlert] No DRAFT cases found. Everything is up to date.');
            }

        } catch (err) {
            logToFile(`[TeamsAlert] Error: ${err.message}`);
        }
    }
}

module.exports = new TeamsNotificationService();
