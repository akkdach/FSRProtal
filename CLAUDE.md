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
| `.github/workflows/` | CI/CD ตัวจริง (GitHub อ่านเฉพาะ `.github/` ที่ root) — มีสำเนาซ้ำใน `onelake-middleware/.github/` เนื้อหาเดียวกัน |
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
```

env keys ที่ backend ใช้ (เขียนได้แค่ชื่อ key — ค่าจริงอยู่ใน `.env` ที่ gitignore แล้ว):
`PORT` · `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` (service principal ต่อ Fabric) ·
`JWT_SECRET` · `BASIC_AUTH_USER/PASS` · `SYNC_AUTH_USER/PASS` · `ENTRA_TENANT_ID` / `ENTRA_CLIENT_ID` ·
`QAS_DB_*` / `PROD_DB_*` / `SYNC_DB_*` (SQL Server 3 ชุด) · `TEAMS_WEBHOOK_URL` · `MATERIAL_MASTER_CRON`

## Deploy

- **Backend**: push ขึ้น `main` → workflow `.github/workflows/main_onelake-middleware.yml` build (Node 24)
  แล้ว deploy ทั้งโฟลเดอร์ `onelake-middleware/` ขึ้น Azure Web App slot Production — **push main = deploy จริงทันที**
- มี `docker-compose.yml` + `Dockerfile` (port 3005) สำหรับรันบน Synology NAS ด้วย — mount `/volume1/web/Freeze Data`
  ⚠️ mount path นี้ไม่ตรงกับ `config.freezeDataPath` (`/app/freeze-data`) ใน `src/config/index.js` — เช็คก่อนพึ่ง Freeze Data ใน container
- **Frontend ไม่มี pipeline deploy** — มีแค่ `dist/` ที่ commit ค้างไว้ใน git

## ข้อห้าม / กับดักที่มีหลักฐานจริง

- **ห้าม commit secret** — `.env` มีค่าจริงครบชุด (gitignore แล้ว ห้ามหลุด) และมี **credential จริง hardcode
  เป็น default อยู่ใน `onelake-middleware/src/config/index.js` ส่วน `syncSql`** — ห้าม copy ค่านั้นไปไฟล์อื่น/เอกสาร/chat
  งานค้าง: ย้ายเข้า env แล้ว rotate
- **ห้ามเปิด/อ่านไฟล์ใหญ่ทั้งไฟล์** — `server_debug.log` (~1.3GB, logger เขียนต่อท้ายเรื่อย ๆ) และ
  `data_cache_*.json` (~100-170MB, disk cache ของ OneLake — ลบได้ ระบบดึงใหม่เอง) ใช้ `tail`/`grep` เท่านั้น
- **git track ของที่ไม่ควร track ค้างอยู่** — `FSRProtal/node_modules/` (1,800+ ไฟล์), `FSRProtal/dist/`,
  `onelake-middleware/onelake-middleware.tar` (~98MB) ถูก track ก่อนใส่ `.gitignore` จึงยังอยู่ใน index —
  จะเอาออกต้อง `git rm --cached` (อย่าทำโดยไม่ได้รับคำสั่ง)
- **workflow มี 2 สำเนา** (`.github/` ที่ root และใน `onelake-middleware/.github/`) — ตัวที่ทำงานจริงคือ root
  แก้แล้วต้องแก้ให้ตรงกันทั้งคู่ หรือตกลงลบสำเนาซ้อน
- **cron 18-table sync (23:00) ถูกปิดไว้ใน `server.js`** ("รอกำหนดเวลา Sync ใหม่") — เหลือเฉพาะ
  Material Master sync (default 08:45 Asia/Bangkok, override ด้วย `MATERIAL_MASTER_CRON`) — อย่าเปิด `initCronJobs()` กลับเอง
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
| ตัดสินใจเชิงสถาปัตยกรรม | `docs/AD-*.md` ฉบับใหม่ — ไม่แก้ทับฉบับเก่า ฉบับเก่ามาร์ค superseded |

## แผนที่เอกสาร

| ไฟล์ | เรื่อง |
|---|---|
| `CLAUDE.md` | ไฟล์นี้ — กติกา + แผนที่ (repo ยังไม่มี README ที่ root; `FSRProtal/README.md` เป็น Vite template ไม่มีเนื้อหาจริง) |
| `docs/ST-documentation-standard.md` | มาตรฐานชื่อไฟล์/โครงเอกสารของทีม — เอกสารใหม่ทุกฉบับต้องตามนี้ |
| Swagger UI `/api-docs` | สัญญา API ทุก endpoint — generate สดจาก `onelake-middleware/src/config/swagger.js` |
| `onelake-middleware/introspect.txt`, `git_error.log`, `push_error.log` | เศษไฟล์ debug เก่า — ไม่ใช่เอกสาร อย่าใช้อ้างอิง |
