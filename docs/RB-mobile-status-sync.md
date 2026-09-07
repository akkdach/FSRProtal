---
pmPageId:
pmParentId:
pmTitle: "[RB] ติดตั้งและดูแล MobileStatusSync บน VM 20.33.118.76"
pmSyncedAt:
---

# MobileStatusSync — runbook ติดตั้ง · ตรวจสอบ · แก้ปัญหา · rollback

เอกสารนี้ตอบว่า "จะเอา `MobileStatusSync` ขึ้น VM ยังไง, รู้ได้ยังไงว่ามันทำงาน, พังแล้วทำอะไร, จะหยุด/ย้อนกลับยังไง"
**คนอ่าน**: คนที่ดูแล VM `20.33.118.76` (DevOps / Dev ที่ deploy) · เนื้อหาว่าโปรแกรมทำอะไร อยู่ใน `MobileStatusSync/README.md`

| | |
|---|---|
| เวอร์ชันเอกสาร | 2026-09-04 |
| ชั้นเอกสาร | C — เจ้าของต้องตรวจ/เซ็น (ร่างโดย AI จากโค้ดจริงใน `MobileStatusSync/` และผล dry-run 2026-09-04) |
| เจ้าของ | DevOps |
| แหล่งความจริง | `MobileStatusSync/` (โค้ด + `deploy/*.ps1`) |

---

## 1. สิ่งที่ต้องมีก่อน

| รายการ | ตรวจยังไง |
|---|---|
| สิทธิ์ Administrator บน VM `20.33.118.76` (Windows Server, มี SQL Server + IIS) | เปิด PowerShell "Run as Administrator" ได้ |
| VM ออก internet ไปที่ `login.microsoftonline.com` และ `*.datawarehouse.fabric.microsoft.com` port 1433 | `Test-NetConnection zf7yrpjhd77uxedw7r2suvgpv4-qqvsu63hb4pu3du7mwv7vccqdu.datawarehouse.fabric.microsoft.com -Port 1433` |
| SQL login ที่ **UPDATE** `BevproFsProd.dbo.work_order` ได้ | login เดียวกับ `PROD_DB_USER` ของ backend ใช้ได้ (ทดสอบ SELECT แล้ว; UPDATE ต้องลองใน dry-run → apply) |
| service principal ต่อ Fabric (`AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` ของ backend) | มีสิทธิ์อ่าน SQL endpoint อยู่แล้ว (backend ใช้ตัวนี้) |
| Teams incoming webhook URL (`TEAMS_WEBHOOK_URL` ของ backend) | ยิงทดสอบผ่าน `/api/test-webhook` ของ backend ได้ |
| ไม่ต้องติดตั้ง .NET ถ้าใช้ publish แบบ self-contained | — |

**ห้าม** ใส่ค่า secret ลง repo / เอกสาร / chat — อยู่ได้แค่ใน `appsettings.Production.json` บน VM (ไฟล์นี้ gitignore แล้ว)

---

## 2. ติดตั้งครั้งแรก

```powershell
# (เครื่อง dev) แพ็ก
dotnet publish MobileStatusSync -c Release -r win-x64 --self-contained true -o MobileStatusSync\publish

# (VM) วางไฟล์
New-Item -ItemType Directory -Force C:\Services\MobileStatusSync
# copy เนื้อใน publish\ ทั้งหมดไป C:\Services\MobileStatusSync\  (RDP copy / robocopy)
```

สร้าง `C:\Services\MobileStatusSync\appsettings.Production.json` (ใส่เฉพาะ key ที่ต่างจาก `appsettings.json`):

```json
{
  "Fabric":  { "TenantId": "<AZURE_TENANT_ID>", "ClientId": "<AZURE_CLIENT_ID>", "ClientSecret": "<AZURE_CLIENT_SECRET>" },
  "Target":  { "ConnectionString": "Server=localhost,1433;Database=BevproFsProd;User ID=<PROD_DB_USER>;Password=<PROD_DB_PASSWORD>;Encrypt=False;TrustServerCertificate=True;Connection Timeout=30" },
  "Teams":   { "WebhookUrl": "<TEAMS_WEBHOOK_URL>" },
  "Sync":    { "DryRun": true, "MaxChangesPerRun": 500, "AllowedTransitions": [] }
}
```

จำกัดสิทธิ์ไฟล์ให้ Administrators + SYSTEM เท่านั้น:

```powershell
icacls C:\Services\MobileStatusSync\appsettings.Production.json /inheritance:r /grant:r "SYSTEM:R" "Administrators:F"
```

---

## 3. Rollout — ต้องผ่านทีละขั้น ห้ามข้าม

| ขั้น | คำสั่ง (ใน `C:\Services\MobileStatusSync`) | ผ่านเมื่อ |
|---|---|---|
| 3.1 dry-run รอบแรก | `.\MobileStatusSync.exe --dry-run` | log ขึ้นครบ `[1/4]…[4/4]`, มีการ์ด 🧪 ใน Teams, มี `logs\changes-<วันที่>.csv` |
| 3.2 ทบทวน transition | เปิด CSV ดูคอลัมน์ `old_value,new_value` | เจ้าของระบบยืนยันว่า transition ไหนต้องเขียน (ผล 2026-09-04: `1→0` และ `3→2` รวม ~420 แถวคือสถานะกลางของ app **ไม่ควรเขียนทับ**) |
| 3.3 ตั้ง whitelist | แก้ `appsettings.Production.json` → `"AllowedTransitions": ["4>0", "4>2", "*>4"]` (หรือตามที่ตกลง) แล้ว `--dry-run` อีกครั้ง | breakdown เหลือเฉพาะที่ต้องการ · จำนวน "ข้าม" ตรงกับที่คาด |
| 3.4 apply ครั้งแรก (backlog) | `.\MobileStatusSync.exe --apply --Sync:MaxChangesPerRun=5000` | การ์ด 🔄 บอกจำนวนที่อัปเดต = จำนวนใน dry-run รอบก่อน (±ที่ D365 เปลี่ยนระหว่างนั้น) |
| 3.5 เปิดโหมดจริง | ตั้ง `"DryRun": false` ในไฟล์ · `MaxChangesPerRun` กลับเป็น `500` | `--dry-run` ไม่ต้องใส่อีก |
| 3.6 ตั้ง schedule | `.\deploy\Install-ScheduledTask.ps1` (PowerShell Administrator) | `Get-ScheduledTask MobileStatusSync` = Ready · รอ 1 ชั่วโมง (หรือ `Start-ScheduledTask MobileStatusSync` เพื่อรันทันที) มี log รอบใหม่ |

รอบปกติควรเห็นแค่ log ไม่มีการ์ด (ไม่มีอะไรเปลี่ยน) — การ์ดขึ้นเฉพาะเมื่อมีรายการอัปเดตหรือ error

---

## 4. ตรวจสอบประจำ

| ดูอะไร | ที่ไหน |
|---|---|
| รันล่าสุดเมื่อไหร่ / ผลเป็นอะไร | `Get-ScheduledTask MobileStatusSync \| Get-ScheduledTaskInfo` → `LastRunTime`, `LastTaskResult` (0 = ok, 1 = error, 2 = เกินเพดาน, 3 = config ผิด) |
| รายละเอียดรอบ | `C:\Services\MobileStatusSync\logs\mobile-status-sync-<yyyyMMdd>.log` (`Get-Content … -Tail 30`) |
| อะไรถูกเปลี่ยนบ้าง | `logs\changes-<yyyyMMdd>.csv` — mode `APPLIED` = เขียนจริง, `DRY-RUN` = แค่รายงาน |
| เวลาปกติ | token < 1 s · อ่าน view ~4 s (353k แถว) · เทียบ ~12 s · รวม < 30 s (วัด 2026-09-04 จากเครื่อง dev) |

ทำความสะอาด log: ไฟล์แยกรายวัน ลบของเก่ากว่า 90 วันได้เลย (`changes-*.csv` เก็บไว้นานกว่าเพราะใช้ rollback)

---

## 5. ปัญหาที่พบบ่อย

| อาการ (ใน log / Teams) | สาเหตุ | ทำอะไร |
|---|---|---|
| `CONFIG ERROR: Missing config value: Fabric:ClientSecret` (exit 3) | `appsettings.Production.json` ไม่มี/อ่านไม่ได้/JSON ผิด | เช็คไฟล์อยู่โฟลเดอร์เดียวกับ exe, สิทธิ์ SYSTEM อ่านได้, validate JSON |
| `Entra token request failed (401…)` | secret หมดอายุ / client id ผิด | rotate secret ใน Entra → อัปเดตไฟล์ (backend ใช้ตัวเดียวกัน — เปลี่ยนที่ `.env`/App Service ด้วย) |
| `Login failed for user` ตอน `[2/4]` | service principal ไม่มีสิทธิ์บน SQL endpoint / workspace | ให้สิทธิ์ Viewer + SQL endpoint access ใน Fabric workspace |
| `Connection lost` / timeout ตอน `[2/4]` | firewall ออก 1433 ไม่ได้ | เปิด outbound 1433 ไป `*.datawarehouse.fabric.microsoft.com` · ลอง `"Encrypt": "Strict"` |
| ⚠️ การ์ด "view ว่าง" (exit 1) | view ถูกลบ/แก้ หรือ Fabric mirror หยุด | เช็ค view ใน Fabric SQL endpoint · ถ้าแก้ field ใน view ต้องกด Update schema ที่ GraphQL API ด้วยถ้ามีคนใช้ผ่าน GraphQL |
| `Fabric:SourceQuery must return a column named 'mobilestatus'` | view เปลี่ยนชื่อคอลัมน์ | แก้ view หรือ `SourceQuery` ให้ alias เป็น `serviceorderid, stageid, mobilestatus` |
| ⛔ การ์ด "เกินเพดาน" (exit 2) ติดกันหลายรอบ | มีการเปลี่ยนใหญ่จริง (เช่น D365 migrate) **หรือ** แมปผิด | เปิด `changes-*.csv` ดู pattern ก่อน — ถ้าถูกต้อง รัน `--apply --Sync:MaxChangesPerRun=<N>` มือ 1 ครั้ง อย่าขยายเพดานถาวร |
| `Another MobileStatusSync instance is still running` | รอบก่อนยังไม่จบ (ปกติถ้า SQL ช้า) | ไม่ต้องทำอะไร ถ้าเกิดทุกรอบ → ดู `[3/4]` ใช้เวลาเท่าไหร่, เช็ค index บน `work_order.ORDERID` (PK อยู่แล้ว) |
| การ์ด Teams ไม่ขึ้นแต่ log บอก `[teams] webhook returned 4xx` | webhook ถูก retire/เปลี่ยน | สร้าง webhook ใหม่ใน Teams → อัปเดต `Teams:WebhookUrl` (และ `TEAMS_WEBHOOK_URL` ของ backend) |
| การ์ด error ไม่ขึ้นทั้งที่ log มี ERROR | throttle 60 นาที/ชนิด (`logs\alert-state.json`) | ตั้งใจ — กัน spam ทุกรอบ; ลบไฟล์ state ถ้าอยากให้ส่งทันที |

---

## 6. หยุด / rollback

**หยุดชั่วคราว** (ไม่ลบอะไร):

```powershell
Disable-ScheduledTask -TaskName MobileStatusSync      # กลับมา: Enable-ScheduledTask -TaskName MobileStatusSync
```

**ถอนออก**: `.\deploy\Uninstall-ScheduledTask.ps1` แล้วลบโฟลเดอร์ `C:\Services\MobileStatusSync` ถ้าไม่ต้องการ log แล้ว

**ย้อนค่าที่เขียนไปแล้ว** — โปรแกรมไม่มีคำสั่ง undo; ค่าเดิมอยู่ใน `logs\changes-<วันที่>.csv` (mode `APPLIED`) เท่านั้น
ตัวอย่างย้อนรอบที่ต้องการ (รันบน SQL Server ของ VM หลัง **Disable task ก่อน** ไม่งั้นรอบถัดไปเขียนกลับ):

```sql
-- 1) โหลด CSV เข้า staging (ใช้ SSMS Import Flat File หรือ BULK INSERT), คอลัมน์: timestamp, mode, [key], stageid, old_value, new_value
-- 2) ย้อนเฉพาะรอบเวลาที่ต้องการ และเฉพาะแถวที่ค่าปัจจุบันยังเป็นค่าที่โปรแกรมเขียน (ไม่ทับงานที่ช่างเดินต่อไปแล้ว)
UPDATE w SET w.WEB_STATUS = TRY_CONVERT(int, c.old_value)
FROM dbo.work_order w
JOIN dbo.MobileStatusSync_changes c ON c.[key] = w.ORDERID
WHERE c.mode = 'APPLIED' AND c.[timestamp] BETWEEN '2026-09-05 10:00' AND '2026-09-05 10:05'
  AND CAST(w.WEB_STATUS AS nvarchar(40)) = c.new_value;
```

ถ้าเปลี่ยนคอลัมน์ปลายทาง (`Target:StatusColumn`) ให้แก้ `WEB_STATUS` ในสคริปต์ให้ตรง

---

## 7. เปลี่ยนแปลงแล้วต้องแก้ที่ไหน

| แก้อะไร | อัปเดตด้วย |
|---|---|
| โค้ดใน `MobileStatusSync/*.cs` | `MobileStatusSync/README.md` (พฤติกรรม/config) + เอกสารนี้ถ้ากระทบขั้นตอน · publish ใหม่ + copy ทับบน VM (หยุด task ก่อน copy) |
| เพิ่ม key ใน `appsettings.json` | ตาราง config ใน `README.md` + ตัวอย่าง `appsettings.Production.json` ข้อ 2 |
| เปลี่ยน view ต้นทางบน Fabric | `Fabric:SourceQuery` + ทดสอบ `--dry-run` ก่อนเสมอ |
| ตกลง whitelist transition ใหม่ | `appsettings.Production.json` บน VM + บันทึกเหตุผลใน `docs/AD-*.md` ฉบับใหม่ |
