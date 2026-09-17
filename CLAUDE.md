# CLAUDE.md — กติกาสำหรับ AI ใน repo นี้

FSRProtal — ระบบรายงาน/จัดการงาน Field Service ของ Bevpro Asia: backend ดึงข้อมูลจาก
Microsoft Fabric OneLake (GraphQL + SQL Endpoint) มา cache แล้วเปิดเป็น REST API + frontend dashboard
⚠️ ชื่อชวนสับสน: โฟลเดอร์ repo ชื่อ `onelake-middleware` แต่ git remote คือ `akkdach/FSRProtal.git`

| | |
|---|---|
| Production (backend) | Azure Web App ชื่อ `onelake-middleware` — deploy อัตโนมัติผ่าน GitHub Actions |
| API docs | Swagger UI ที่ `/api-docs` (generate จาก `onelake-middleware/src/config/swagger.js`) |
| มาตรฐานเอกสาร | `docs/ST-documentation-standard.md` — ชื่อไฟล์ใหม่ใน docs ต้องเป็น `<PREFIX>-<slug>.md` |

## โครง repo

| โฟลเดอร์ | คือ |
|---|---|
| `onelake-middleware/` | Backend — Node.js (CommonJS) + Express 4, โครง MVC: `src/routes/api.js` → `src/controllers/` → `src/services/` · auth 3 แบบ: Entra ID → internal JWT (`/api/auth/login`), Basic Auth (`/api/request-status`), Sync Basic Auth (`/api/sync/*`) |
| `FSRProtal/` | Frontend — React 19 + Vite 7 + TypeScript + MUI 7 + material-react-table + i18next (th/en/ja/zh) · หลายหน้ายังใช้ mock data ใน `src/data/` |
| `MobileStatusSync/` | Console app .NET 8 (C#) รันจาก Windows Task Scheduler บน VM `20.33.118.76` ทุก 1 ชั่วโมง — อ่าน view `update_mobile_status_when_callbackwork` จาก Fabric SQL endpoint แล้วอัปเดต `BevproFsProd.dbo.work_order.WEB_STATUS` + แจ้ง Teams · อ่าน `MobileStatusSync/README.md` ก่อนแตะ (มีข้อสันนิษฐาน ZZMOBILE_STATUS vs WEB_STATUS ที่ต้องยืนยัน) |
| `.github/workflows/` | CI/CD ตัวจริง (GitHub อ่านเฉพาะ `.github/` ที่ root) — มีสำเนาซ้ำใน `onelake-middleware/.github/` เนื้อหาเดียวกัน · `main_onelake-middleware.yml` = deploy backend · `material-master-sync.yml` = ตัวตั้งเวลานอกแอป ยิง `POST /api/sync/material-master-sync` 05:30 + 13:00 (Asia/Bangkok) |
| `onelake-middleware/test_*.js`, `debug_*.js`, `introspect_*.js` | สคริปต์ ad-hoc ยิงระบบจริงเพื่อ debug/สำรวจ schema — ไม่ใช่ test suite อัตโนมัติ (repo นี้ไม่มี test framework เลย) |

## คำสั่งที่ใช้จริง

```bash
# Backend (ต้องมี onelake-middleware/.env ก่อน — ดูรายชื่อ key ด้านล่าง)
npm --prefix onelake-middleware run dev    # node --watch server.js — PORT จาก .env (dev ใช้ 3005), default 3000
npm --prefix onelake-middleware start      # node server.js (โหมด production)

# Frontend (dev server proxy /api → http://localhost:3005 — ตั้งใน vite.config.ts)
npm --prefix FSRProtal run dev             # Vite dev server
npm --prefix FSRProtal run build           # tsc -b && vite build — ใช้เช็ค typecheck ก่อน push
npm --prefix FSRProtal run lint            # ESLint

# Docker (ในโฟลเดอร์ onelake-middleware/ — port 3005, mount Freeze Data จาก NAS)
docker compose up -d --build

# MobileStatusSync (.NET 8 — ต้องมี dotnet SDK; runtime ใหม่กว่าใช้ได้ผ่าน RollForward=Major)
dotnet build MobileStatusSync -c Release
dotnet MobileStatusSync/bin/Release/net8.0/MobileStatusSync.dll --dry-run --no-teams   # ใส่ creds ผ่าน env MSS_* (ดู README)
dotnet publish MobileStatusSync -c Release -r win-x64 --self-contained true -o MobileStatusSync/publish   # แพ็กไป VM
```

env keys ที่ backend ใช้ (เขียนได้แค่ชื่อ key — ค่าจริงอยู่ใน `.env` ที่ gitignore แล้ว):
`PORT` · `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` (service principal ต่อ Fabric) ·
`JWT_SECRET` · `BASIC_AUTH_USER/PASS` · `SYNC_AUTH_USER/PASS` · `ENTRA_TENANT_ID` / `ENTRA_CLIENT_ID` ·
`QAS_DB_*` / `PROD_DB_*` / `SYNC_DB_*` (SQL Server 3 ชุด) · `TEAMS_WEBHOOK_URL` (ห้อง Teams หลัก — Technician = Yes/ว่าง) / `TEAMS_WEBHOOK_URL_NON_TECH` (ห้องสำหรับ Technician = No; ไม่ตั้ง = fallback ห้องหลัก) ·
`SYNC_TEAMS_WEBHOOK_URL` (ห้องงานระบบ = แชต "Noti Innovation" — การ์ดผล sync ทุกรอบ; ไม่ตั้ง = ไม่ส่ง ไม่ fallback ไปห้อง HR; เครื่อง dev อ่าน `MOBILE_SYNC_TEAMS_WEBHOOK_URL` แทนได้) ·
`MATERIAL_MASTER_CRON` (รอบ **สำรอง** ในโปรเซส: cron หลายตัวคั่นด้วย `;` หรือ `off`; default `45 5 * * *;15 13 * * *`) · `MATERIAL_MASTER_DEDUP_MINUTES` (default 45) ·
ประวัติรอบ sync + ลิงก์ดาวน์โหลด Excel (ไม่บังคับทุกตัว): `SYNC_HISTORY_DIR` (default Azure `/home/data/material-master-sync`, dev `onelake-middleware/sync-history/`) · `SYNC_HISTORY_KEEP` (120) · `SYNC_LINK_TTL_DAYS` (14) · `SYNC_LINK_SECRET` (default ใช้ `JWT_SECRET`) · `PUBLIC_BASE_URL` (default `https://$WEBSITE_HOSTNAME`)
GitHub Actions secrets (repo Settings): `SYNC_AUTH_USER` / `SYNC_AUTH_PASS` — ใช้โดย `material-master-sync.yml` ค่าเดียวกับ app setting ของ Web App

## Deploy

- **Backend**: push ขึ้น `main` → workflow `.github/workflows/main_onelake-middleware.yml` build (Node 24)
  แล้ว deploy ทั้งโฟลเดอร์ `onelake-middleware/` ขึ้น Azure Web App slot Production — **push main = deploy จริงทันที**
- มี `docker-compose.yml` + `Dockerfile` (port 3005) สำหรับรันบน Synology NAS ด้วย — mount `/volume1/web/Freeze Data`
  ⚠️ mount path นี้ไม่ตรงกับ `config.freezeDataPath` (`/app/freeze-data`) ใน `src/config/index.js` — เช็คก่อนพึ่ง Freeze Data ใน container
- **Frontend ไม่มี pipeline deploy** — มีแค่ `dist/` ที่ commit ค้างไว้ใน git
- **MobileStatusSync ไม่มี pipeline** — publish เอง copy ไป `C:\Services\MobileStatusSync` บน VM `20.33.118.76` แล้วรัน
  `deploy/Install-ScheduledTask.ps1` — ขั้นตอน/rollback ใน `docs/RB-mobile-status-sync.md` · secret อยู่ใน `appsettings.Production.json` บน VM เท่านั้น (gitignore)
  ⚠️ default `Sync:DryRun=true` — ห้ามตั้ง `false` จนกว่าเจ้าของระบบยืนยัน `Target:StatusColumn` และ `Sync:AllowedTransitions`

## ข้อห้าม / กับดักที่มีหลักฐานจริง

- **ห้าม commit secret** — `.env` มีค่าจริงครบชุด (gitignore แล้ว ห้ามหลุด) และมี **credential จริง hardcode
  เป็น default อยู่ใน `onelake-middleware/src/config/index.js` ส่วน `syncSql`** — ห้าม copy ค่านั้นไปไฟล์อื่น/เอกสาร/chat
  งานค้าง: ย้ายเข้า env แล้ว rotate — ⚠️ **repo นี้เป็น public** (`gh repo view` → `isPrivate: false`, ตรวจ 2026-09-17)
  ค่าที่ hardcode จึงถือว่าหลุดแล้ว และ log ของ GitHub Actions ทุก run ใครก็เปิดอ่านได้ — ห้าม echo ค่า secret ใน workflow
- **ห้ามเปิด/อ่านไฟล์ใหญ่ทั้งไฟล์** — `server_debug.log` (~1.3GB, logger เขียนต่อท้ายเรื่อย ๆ) และ
  `data_cache_*.json` (~100-170MB, disk cache ของ OneLake — ลบได้ ระบบดึงใหม่เอง) ใช้ `tail`/`grep` เท่านั้น
- **git track ของที่ไม่ควร track ค้างอยู่** — `FSRProtal/node_modules/` (1,800+ ไฟล์), `FSRProtal/dist/`,
  `onelake-middleware/onelake-middleware.tar` (~98MB) ถูก track ก่อนใส่ `.gitignore` จึงยังอยู่ใน index —
  จะเอาออกต้อง `git rm --cached` (อย่าทำโดยไม่ได้รับคำสั่ง)
- **workflow มี 2 สำเนา** (`.github/` ที่ root และใน `onelake-middleware/.github/`) — ตัวที่ทำงานจริงคือ root
  แก้แล้วต้องแก้ให้ตรงกันทั้งคู่ หรือตกลงลบสำเนาซ้อน
- **cron 18-table sync (23:00) ถูกปิดไว้ใน `server.js`** ("รอกำหนดเวลา Sync ใหม่") — อย่าเปิด `initCronJobs()` กลับเอง
- **Material Master sync มีตัวตั้งเวลา 2 ตัวโดยตั้งใจ** — หลัก = GitHub Actions 05:30 + 13:00, สำรอง = `node-cron` ในโปรเซส 05:45 + 13:15
  ทั้งคู่วิ่งผ่าน `src/jobs/materialMasterSync.js` ซึ่งกันรันซ้ำ (กำลังรันอยู่ / เพิ่งสำเร็จ < 45 นาที → ข้าม) อย่าเรียก
  `syncService.syncFromGraphQLUpsert` ตรง ๆ จากที่อื่น จะข้ามทั้งตัวกันซ้ำและการแจ้ง Teams · `node-cron` ยิงไม่ได้ถ้าโปรเซสถูก unload
  → Web App ต้องเปิด **Always On** · app setting `MATERIAL_MASTER_CRON` แบบหลายรอบ (`;`) ต้องตั้ง **หลัง** deploy โค้ดชุดนี้เท่านั้น
- **MERGE ของ material_master อัปเดตเฉพาะคอลัมน์ที่ต้นทางส่งมา** (`syncService.buildUpsertMerge`) — `PICTURE_URL`, `TRADE_CODE`,
  `ITEM_REFERENCE`, `COMPRESSOR` เป็นคอลัมน์ที่ดูแลจากที่อื่น ห้ามแก้กลับเป็น "อัปเดตทุกคอลัมน์" (เคยเขียน NULL ทับทุกเช้า)
- **รายการ record ที่ sync เปลี่ยน (ค่าเดิม→ค่าใหม่) และลิงก์ดาวน์โหลด Excel ห้ามออกทาง HTTP response ของ `POST /api/sync/material-master-sync`** —
  response นั้นถูกพิมพ์ใน log ของ GitHub Actions ซึ่งเป็น public · ข้อมูลอยู่ในประวัติบน server (`syncHistoryService`) และลิงก์แบบ signed URL
  ส่งเข้า Teams เท่านั้น · `GET …/changes/:runId` ไม่มี JWT โดยตั้งใจ (เปิดจาก Teams แนบ header ไม่ได้) สิทธิ์มาจากลายเซ็น HMAC + วันหมดอายุ
- **สคริปต์ `test_*.js` / `debug_*.js` ยิงระบบจริง** (Fabric / SQL / GraphQL production) — อ่านโค้ดก่อนรันทุกครั้ง
- CI รัน `npm run test --if-present` = ไม่มี test รันจริง — **การ build ผ่านไม่ได้แปลว่าโค้ดถูก** เช็คเองก่อน push main

## แก้โค้ดตรงไหน ต้องอัปเดตเอกสารตรงไหน (traceability)

ตอนนี้ repo ยังแทบไม่มีเอกสาร — สัญญา API ตัวจริงคือ Swagger (`src/config/swagger.js`) ต้องอัปเดตพร้อมโค้ดเสมอ

| แก้อะไร | ต้องอัปเดตด้วย |
|---|---|
| เพิ่ม/แก้ endpoint ใน `src/routes/api.js` หรือ `server.js` | `src/config/swagger.js` — Swagger คือ contract เดียวที่มี · ถ้าเริ่มเขียน spec ให้วาง `docs/AS-*.md` |
| เพิ่ม/แก้ `/api/sync/*` (ตาราง D365 ↔ SQL) | `src/config/swagger.js` + controller/service ให้ครบชุด (route → `syncController` → `syncService`) |
| เพิ่ม config key / env | `.env` (เครื่องตัวเอง) + ตาราง env keys ใน `CLAUDE.md` นี้ — ยังไม่มี `.env.example` ถ้าสร้างให้ใส่แค่ชื่อ key |
| แก้ `Dockerfile` / `docker-compose.yml` / workflow | สำเนา workflow ทั้ง 2 ที่ (ดูข้อห้าม) + `docs/RB-*.md` ถ้าเริ่มมี runbook |
| แก้ auth flow (JWT / Basic / Entra) | `src/config/swagger.js` (security scheme) + `test_login.html` ที่ใช้ทดสอบ login |
| แก้ `MobileStatusSync/*.cs` หรือ `appsettings.json` | `MobileStatusSync/README.md` (ตาราง config/พฤติกรรม) + `docs/RB-mobile-status-sync.md` ถ้ากระทบขั้นติดตั้ง/rollback · publish ใหม่แล้ว copy ทับบน VM |
| ตัดสินใจเชิงสถาปัตยกรรม | `docs/AD-*.md` ฉบับใหม่ — ไม่แก้ทับฉบับเก่า ฉบับเก่ามาร์ค superseded |

## แผนที่เอกสาร

| ไฟล์ | เรื่อง |
|---|---|
| `CLAUDE.md` | ไฟล์นี้ — กติกา + แผนที่ (repo ยังไม่มี README ที่ root; `FSRProtal/README.md` เป็น Vite template ไม่มีเนื้อหาจริง) |
| `docs/ST-documentation-standard.md` | มาตรฐานชื่อไฟล์/โครงเอกสารของทีม — เอกสารใหม่ทุกฉบับต้องตามนี้ |
| Swagger UI `/api-docs` | สัญญา API ทุก endpoint — generate สดจาก `onelake-middleware/src/config/swagger.js` |
| `MobileStatusSync/README.md` | MobileStatusSync ทำอะไร, config ทุก key, ทำไมปลายทางเป็น `WEB_STATUS`, ผล dry-run |
| `docs/RB-mobile-status-sync.md` | runbook ติดตั้ง/rollout/ตรวจสอบ/แก้ปัญหา/rollback ของ MobileStatusSync บน VM (ชั้น C — DevOps ต้องเซ็น) |
| `docs/RB-material-master-sync.md` | runbook ของ Auto Sync Material Master — ตารางเวลา 2 ตัวตั้งเวลา, ค่าที่ต้องตั้ง, วิธีรู้ว่าทำงาน, แก้ปัญหา, สั่งรันเอง, ปิด/ย้อนกลับ (ชั้น C — DevOps ต้องเซ็น) |
| `onelake-middleware/introspect.txt`, `git_error.log`, `push_error.log` | เศษไฟล์ debug เก่า — ไม่ใช่เอกสาร อย่าใช้อ้างอิง |
