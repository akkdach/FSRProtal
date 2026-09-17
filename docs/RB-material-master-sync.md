---
pmPageId:
pmParentId:
pmTitle: "[RB] Auto Sync Material Master — ตั้งเวลา · ตรวจสอบ · แก้ปัญหา · ปิด/ย้อนกลับ"
pmSyncedAt:
---

# Auto Sync Material Master — runbook

เอกสารนี้ตอบว่า "sync รันเมื่อไร ใครเป็นคนกดเริ่ม, รู้ได้ยังไงว่ามันทำงาน, พังแล้วทำอะไร, จะสั่งรันเอง/ปิด/ย้อนกลับยังไง"
**คนอ่าน**: คนดูแล backend `onelake-middleware` บน Azure และคนที่ได้รับการ์ดแจ้งเตือนในแชต Teams "Noti Innovation"

| | |
|---|---|
| เวอร์ชันเอกสาร | 2026-09-17 |
| ชั้นเอกสาร | C — เจ้าของต้องตรวจ/เซ็น (ร่างโดย AI จากโค้ดจริงและค่า config จริงของ Azure Web App วันที่ 2026-09-17) |
| เจ้าของ | DevOps |
| แหล่งความจริง | `onelake-middleware/src/jobs/materialMasterSync.js` · `src/jobs/cronJobs.js` · `src/services/syncService.js` (`buildUpsertMerge`) · `.github/workflows/material-master-sync.yml` |

---

## 1. ภาพรวม

```
GitHub Actions (schedule 05:30 + 13:00 BKK)  ──POST /api/sync/material-master-sync (Basic Auth)──┐
node-cron ในโปรเซส (สำรอง 05:45 + 13:15 BKK) ───────────────────────────────────────────────────┤
                                                                                                  ▼
                                   runMaterialMasterSync()  ── กันรันซ้ำ: กำลังรันอยู่ / เพิ่งสำเร็จ < 45 นาที → ข้าม
                                                                                                  │
   Fabric GraphQL view Sync_Material_master ──ดึง ~5,900 แถว──▶ staging ──MERGE──▶ BevproFsProd.dbo.material_master
                                                                                                  │
                                                     การ์ด Teams ✅/❌ → แชต "Noti Innovation" (SYNC_TEAMS_WEBHOOK_URL)
```

- **MERGE อัปเดตเฉพาะคอลัมน์ที่ต้นทางส่งมา**: `DESCRIPTION, UNIT, DAMAGE_MATERIAL, DAMAGE_MAT_DESC` (key = `MATERIAL`)
  คอลัมน์ที่มีเฉพาะปลายทาง `PICTURE_URL, TRADE_CODE, ITEM_REFERENCE, COMPRESSOR` **ไม่ถูกแตะ** · แถวใหม่ INSERT ครบทุกคอลัมน์ (คอลัมน์พิเศษเป็น NULL)
  ถ้าเพิ่มคอลัมน์ใหม่ใน view ต้นทางและมีคอลัมน์ชื่อเดียวกันในตาราง คอลัมน์นั้นจะถูกอัปเดตอัตโนมัติ (จับคู่ด้วยชื่อตรงตัว)
- ไม่มี DELETE — item ที่หายจากต้นทางยังค้างในตาราง
- ทำไมมีตัวตั้งเวลา 2 ตัว: `node-cron` อยู่ในโปรเซสของแอป ถ้าโปรเซส restart/ถูก unload ตรงเวลานั้น รอบจะหายเงียบ ๆ;
  GitHub Actions อยู่นอกแอปและมีประวัติ run แต่เริ่มช้าได้ 5–30 นาที จึงใช้คู่กัน โดยฝั่ง server กันไม่ให้รันซ้ำ

## 2. ตารางเวลา (Asia/Bangkok)

| รอบ | ตัวหลัก — GitHub Actions (cron เป็น UTC) | ตัวสำรอง — node-cron (`MATERIAL_MASTER_CRON`) |
|---|---|---|
| เช้า | 05:30 (`30 22 * * *`) | 05:45 |
| บ่าย | 13:00 (`0 6 * * *`) | 13:15 |

ปกติแต่ละรอบมีการ์ด Teams **1 ใบ** ช่อง "สั่งรันโดย" บอกว่าตัวไหนเป็นคนรัน ถ้าเห็น "node-cron ในแอป (รอบสำรอง)" บ่อย แปลว่า GitHub Actions มาช้าหรือไม่มา → ดูข้อ 5

## 3. ค่าที่ต้องตั้ง (ชื่อ key เท่านั้น — ห้ามใส่ค่าจริงลงเอกสาร)

| ที่ไหน | key | หมายเหตุ |
|---|---|---|
| Azure Web App → Configuration | `SYNC_TEAMS_WEBHOOK_URL` | webhook (Power Automate Workflows) ของแชต "Noti Innovation" · ไม่ตั้ง = sync ทำงานแต่ไม่แจ้ง Teams (มี warning ใน log) |
| Azure Web App → Configuration | `MATERIAL_MASTER_CRON` | รอบสำรอง คั่นหลายรอบด้วย `;` เช่น `45 5 * * *;15 13 * * *` · `off` = ปิดรอบสำรอง · ไม่ตั้ง = ใช้ค่า default ข้างต้น |
| Azure Web App → Configuration | `MATERIAL_MASTER_DEDUP_MINUTES` | ไม่บังคับ (default 45) |
| Azure Web App → General settings | **Always On = On** | กันแอปถูก unload ตอนไม่มี request (plan B3 รองรับ ไม่มีค่าใช้จ่ายเพิ่ม) |
| GitHub repo → Settings → Secrets → Actions | `SYNC_AUTH_USER`, `SYNC_AUTH_PASS` | ค่าเดียวกับ app setting ชื่อเดียวกันของ Web App |

## 4. รู้ได้ยังไงว่ามันทำงาน

1. **Teams "Noti Innovation"** — ทุกรอบต้องมีการ์ด ✅ (ดึงกี่แถว เพิ่มใหม่กี่แถว อัปเดตกี่แถว ใช้เวลาเท่าไร) หรือ ❌ พร้อมสาเหตุ
2. **GitHub → Actions → "Material Master Sync (scheduled)"** — เขียว = endpoint ตอบ 200 (รวมกรณี `skipped`), แดง = ไม่ใช่ 200; กดเข้า run เพื่อดู response
3. log บน server: Azure Portal → App Service → Advanced Tools → SSH
   `grep -a "MaterialMasterSync" /home/site/wwwroot/server_debug.log | tail -n 20`
4. ตรวจทางอ้อมโดยไม่อ่าน log: Azure Monitor metrics `CpuTime` รายนาที จะพุ่งช่วงเวลารอบ sync โดย `Requests` ไม่ขึ้นตาม (กรณีรอบสำรอง)

## 5. แก้ปัญหา

| อาการ | สาเหตุที่เป็นไปได้ | ทำอะไร |
|---|---|---|
| ไม่มีการ์ด Teams เลยทั้งที่ Actions เขียว | `SYNC_TEAMS_WEBHOOK_URL` ไม่ได้ตั้ง/หมดอายุ (log: `SYNC_TEAMS_WEBHOOK_URL is not configured` หรือ `Error sending sync result`) | สร้าง workflow webhook ใหม่ในแชต แล้วอัปเดต app setting |
| การ์ด ❌ สาเหตุขึ้นต้นด้วย GraphQL / field ไม่รู้จัก | แก้ view `Sync_Material_master` แล้วยังไม่กด **Update schema** ของ API for GraphQL ใน Fabric portal | กด Update schema แล้วสั่งรันเอง (ข้อ 6) |
| Actions แดง HTTP 401 | secrets ไม่ตรงกับ `SYNC_AUTH_USER/PASS` ของ Web App | ตั้ง secrets ใหม่ |
| Actions แดง HTTP 000 / timeout | แอปไม่ตอบ (deploy/restart อยู่) | รอบสำรองจะรันเองใน 15 นาที; ถ้าไม่มีการ์ด ให้สั่งรันเอง |
| Actions ไม่รันเลยหลายวัน | repo public ไม่มีความเคลื่อนไหว 60 วัน GitHub ปิด schedule อัตโนมัติ | Actions tab → Enable workflow |
| ได้การ์ด 2 ใบในรอบเดียว | แอป restart ระหว่างสองตัวตั้งเวลา (สถานะกันรันซ้ำอยู่ใน memory) | ไม่ต้องทำอะไร — MERGE เป็น idempotent ข้อมูลไม่เพี้ยน |

## 6. สั่งรันเอง

- GitHub → Actions → "Material Master Sync (scheduled)" → **Run workflow** (ติ๊ก `force` ถ้าเพิ่ง sync สำเร็จภายใน 45 นาที)
- หรือยิงตรง: `POST /api/sync/material-master-sync?trigger=manual&force=1` ด้วย Basic Auth (รายละเอียดใน Swagger `/api-docs`)

## 7. ปิด / ย้อนกลับ

| ต้องการ | ทำ |
|---|---|
| หยุดรอบของ GitHub Actions | Actions tab → workflow → `⋯` → Disable workflow |
| หยุดรอบสำรองในแอป | app setting `MATERIAL_MASTER_CRON=off` (แอป restart เอง) |
| หยุดแจ้ง Teams | ลบ app setting `SYNC_TEAMS_WEBHOOK_URL` |
| กลับไปใช้พฤติกรรมเดิมทั้งหมด | `git revert` commit ของงานนี้แล้ว push main (= deploy) และตั้ง `MATERIAL_MASTER_CRON=30 5 * * *` |

## 8. Checklist ตอนนำขึ้น production ครั้งแรก

- [ ] Always On = On
- [ ] app setting `SYNC_TEAMS_WEBHOOK_URL` ตั้งแล้ว
- [ ] GitHub Secrets `SYNC_AUTH_USER` / `SYNC_AUTH_PASS` ตั้งแล้ว
- [ ] merge PR เข้า `main` (= deploy) — **ต้อง deploy โค้ดก่อน** ค่อยเปลี่ยน `MATERIAL_MASTER_CRON` เป็นแบบหลายรอบ (โค้ดเก่าอ่านรูปแบบ `;` ไม่ได้)
- [ ] ตั้ง `MATERIAL_MASTER_CRON=45 5 * * *;15 13 * * *` (หรือลบ key ทิ้งเพื่อใช้ default) — ค่าเดิม `30 5 * * *` ยังใช้ได้แต่จะไม่มีรอบสำรองตอนบ่าย
- [ ] Actions → Run workflow 1 ครั้ง → ได้การ์ด ✅ ใน "Noti Innovation" และช่อง "คอลัมน์ที่ไม่แตะ" แสดง 4 คอลัมน์พิเศษ
