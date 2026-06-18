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
                
                const factList = result.recordset.map(r => ({
                    title: r.EmployeeCode || 'N/A',
                    value: `${r.FullName} (${r.Position})`
                }));

                const payload = {
                    "type": "message",
                    "attachments": [
                        {
                            "contentType": "application/vnd.microsoft.card.adaptive",
                            "contentUrl": null,
                            "content": {
                                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                                "type": "AdaptiveCard",
                                "version": "1.4",
                                "body": [
                                    {
                                        "type": "TextBlock",
                                        "text": "⚠️ แจ้งเตือน: มีข้อมูล Manpower รอการ SUBMIT",
                                        "weight": "Bolder",
                                        "size": "Large",
                                        "color": "Warning"
                                    },
                                    {
                                        "type": "TextBlock",
                                        "text": `พบข้อมูลที่ยังคงสถานะ DRAFT จำนวน **${draftCount}** รายการ`,
                                        "wrap": true
                                    },
                                    {
                                        "type": "FactSet",
                                        "facts": factList
                                    }
                                ],
                                "actions": [
                                    {
                                        "type": "Action.OpenUrl",
                                        "title": "เปิดระบบ Smart Field Service",
                                        "url": "https://proservice.bevproasia.com/Admin/ManpowerManagement"
                                    }
                                ]
                            }
                        }
                    ]
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
