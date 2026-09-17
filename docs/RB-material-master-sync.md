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
- **อัปเดตเฉพาะ record ที่ค่าเปลี่ยนจริง**: ก่อน MERGE ระบบเทียบ staging กับตารางจริง (NULL-safe, ตัวอักษรเทียบแบบ case-sensitive ด้วย collation BIN2)
  ได้รายการ "เพิ่มใหม่" + "แก้ไข" พร้อมค่าเดิม/ค่าใหม่ → ตัวเลขในการ์ด Teams คือจำนวน record ที่เปลี่ยนจริง ไม่ใช่จำนวนแถวทั้งตาราง
- **ประวัติรอบ sync + Excel**: ทุกรอบที่สำเร็จเก็บเป็นไฟล์ JSON ต่อรอบที่ `/home/data/material-master-sync/` บน Web App (นอก wwwroot จึงรอดข้าม deploy; เก็บ ~120 รอบล่าสุด)
  ถ้ามี record เปลี่ยน การ์ด Teams จะมีปุ่ม **"ดาวน์โหลด Excel รายการที่เปลี่ยน"** → `GET /api/sync/material-master-sync/changes/{runId}` สร้าง .xlsx สดจากประวัติ
  ลิงก์เป็น **signed URL** (HMAC ด้วย `SYNC_LINK_SECRET` หรือ `JWT_SECRET`) หมดอายุ 14 วัน — ใครถือลิงก์เปิดได้โดยไม่ต้อง login จึงส่งเข้า Teams เท่านั้น
  **ห้าม**ใส่รายการข้อมูล/ลิงก์นี้ใน response ของ `POST …/material-master-sync` เพราะ response ถูกพิมพ์ใน log ของ GitHub Actions ซึ่ง repo เป็น public
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
| Azure Web App → Configuration | `SYNC_LINK_SECRET` · `SYNC_LINK_TTL_DAYS` · `SYNC_HISTORY_KEEP` · `SYNC_HISTORY_DIR` · `PUBLIC_BASE_URL` | ไม่บังคับทั้งหมด — default: ใช้ `JWT_SECRET` เซ็นลิงก์ · 14 วัน · 120 รอบ · `/home/data/material-master-sync` · `https://$WEBSITE_HOSTNAME` (Azure ตั้งให้เอง) · เปลี่ยน secret = ลิงก์เก่าใช้ไม่ได้ทันที |
| Azure Web App → General settings | **Always On = On** | กันแอปถูก unload ตอนไม่มี request (plan B3 รองรับ ไม่มีค่าใช้จ่ายเพิ่ม) |
| GitHub repo → Settings → Secrets → Actions | `SYNC_AUTH_USER`, `SYNC_AUTH_PASS` | ค่าเดียวกับ app setting ชื่อเดียวกันของ Web App |

## 4. รู้ได้ยังไงว่ามันทำงาน

1. **Teams "Noti Innovation"** — ทุกรอบต้องมีการ์ด ✅ (ดึงกี่แถว · **เปลี่ยนแปลงกี่ record** แยกเพิ่มใหม่/แก้ไข · ตัวอย่างรหัส · ปุ่มดาวน์โหลด Excel เมื่อมีการเปลี่ยน) หรือ ❌ พร้อมสาเหตุ
   "เปลี่ยนแปลง: ไม่มี" เป็นเรื่องปกติของวันที่ F&O ไม่ได้แก้ item
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
| กดปุ่มดาวน์โหลดแล้วได้ "ลิงก์หมดอายุแล้ว" (403) | เกิน 14 วัน หรือมีการเปลี่ยน `JWT_SECRET`/`SYNC_LINK_SECRET` | ประวัติยังอยู่บน server: SSH แล้วดูไฟล์ `/home/data/material-master-sync/<runId>.json` หรือสั่งรันใหม่เพื่อรับลิงก์ใหม่ |
| กดปุ่มแล้วได้ "ไม่พบประวัติรอบ sync" (404) | รอบนั้นเก่าเกิน ~120 รอบล่าสุด ถูกลบตามอายุ | เพิ่ม `SYNC_HISTORY_KEEP` ถ้าต้องเก็บนานกว่านี้ |
| การ์ด ✅ แต่ไม่มีปุ่มทั้งที่มี record เปลี่ยน | เขียนประวัติลง `/home/data/…` ไม่ได้ (log: `[SyncHistory] Could not save run`) หรือไม่มี secret สำหรับเซ็นลิงก์ | ตรวจสิทธิ์/พื้นที่ดิสก์ของ `/home` · ตรวจว่า `JWT_SECRET` ตั้งอยู่ |
| การ์ดขึ้น "อัปเดตทับ … (ไม่ได้ตรวจว่าค่าเปลี่ยนจริงหรือไม่)" | ตารางมีคอลัมน์ต้นทางชนิดที่เทียบไม่ได้ (text/ntext/xml…) ระบบจึงปิดการตรวจการเปลี่ยนแปลง | เปลี่ยนชนิดคอลัมน์เป็น nvarchar |
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
