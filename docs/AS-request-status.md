---
pmPageId:
pmParentId:
pmTitle: "[AS] Request Status (/api/request-status)"
pmSyncedAt:
---

# Request Status — สถานะใบงานจาก Ticket No (`/api/request-status`)

ตอบว่า endpoint `/api/request-status` รับอะไร คืนอะไร ค้นจากระบบไหนก่อนหลัง แต่ละ field มาจากคอลัมน์ไหน (SIMS / F&O) และพฤติกรรมไหนตั้งใจให้เหมือนของเดิมทุกตัวอักษร
ผู้อ่าน: dev ที่ดูแล onelake-middleware · เหตุผลที่เปลี่ยนแหล่งข้อมูลอยู่ใน `AD-request-status-data-source.md`

| | |
|---|---|
| เวอร์ชันเอกสาร | 2026-11-02 |
| ชั้นเอกสาร | B |
| เจ้าของ | Dev |
| แหล่งความจริง | `onelake-middleware/src/services/simsDbService.js` (SQL), `src/controllers/simsRequestStatusController.js` (payload), `server.js` (route) |

## 1. สรุป

| | |
|---|---|
| แหล่งข้อมูล | **2 ระบบ ตามลำดับ**: (1) PostgreSQL ของระบบ SIMS — ใบงานตั้งแต่ go-live 2026-11-01 (ค่าเชื่อมต่ออยู่ใน App Settings เท่านั้น) → ถ้าไม่พบ (2) F&O ผ่าน Fabric GraphQL → stored procedure `dbo.REFERENCEDPONUMBER` — ใบงานที่สร้างก่อน cutover 2026-10-31 (แหล่งเดียวของ endpoint นี้ก่อนเปลี่ยน) |
| Auth | Basic Auth (`BASIC_AUTH_USER` / `BASIC_AUTH_PASS`) |
| Input | REFERENCEDPONUMBER = Ticket No ของใบงาน |
| Response | 7 field + STATUS + MESSAGE — **key ชุดเดิม ลำดับเดิม รูปแบบค่าเดิม และ HTTP code / MESSAGE เดิมทุกกรณีที่เกิดจาก input** · ข้อยกเว้นเดียว: MESSAGE ของ 500 ตอนระบบหลังบ้านล้ม (ข้อ 2) |

ผู้เรียกไม่ต้องแก้อะไร — ใบงานเก่ายังค้นเจอเหมือนเดิม และใบงานใหม่ค้นเจอเพิ่ม · ข้อแตกต่างที่ผู้เรียกเห็นได้มีแค่: ticket ที่มีทั้ง 2 ระบบได้ใบจาก SIMS, ticket ซ้ำใน SIMS ได้ใบล่าสุด (ข้อ 4) และข้อความ error 500 ตอนระบบหลังบ้านล้ม (ข้อ 2)

| SIMS | F&O | ผู้เรียกได้ |
|---|---|---|
| พบ | ไม่ค้น | ใบจาก SIMS |
| ไม่พบ | พบ | ใบจาก F&O (ค่าเดียวกับที่ endpoint นี้เคยตอบ) |
| ไม่พบ | ไม่พบ | 200 `NOT_FOUND` |
| ต่อไม่ได้ | พบ | ใบจาก F&O |
| ต่อไม่ได้ / ไม่พบ | ต่อไม่ได้ / ไม่พบ (อย่างน้อยหนึ่งฝั่งต่อไม่ได้) | 500 `ERROR` — ตอบ NOT_FOUND ไม่ได้เพราะใบงานอาจอยู่ในระบบที่ต่อไม่ได้ |

## 2. Endpoint

| Method | Path | Input | หมายเหตุ |
|---|---|---|---|
| GET | `/api/request-status/{referencedPoNumber}` | path | **ticket ที่มี `/` ให้ใช้ POST** — บน Azure App Service หน้าบ้านแปลง `%2F` กลับเป็น `/` ก่อนถึงแอป path จึงไม่ตรง route และได้ 401 จาก JWT middleware (เป็นแบบนี้ตั้งแต่ก่อนเปลี่ยนแหล่งข้อมูล ยืนยัน 2026-11-02 · ในเครื่อง GET ด้วย `%2F` ใช้ได้) |
| POST | `/api/request-status` | body `{"referencedPoNumber": "..."}` (ต้องเป็นข้อความ) | อ่านอย่างเดียว ไม่บันทึกอะไร |

| HTTP | STATUS | MESSAGE | เมื่อไร |
|---|---|---|---|
| 200 | `SUCCESS` | `Data retrieved successfully` | พบใบงาน |
| 200 | `NOT_FOUND` | `No data found for the given reference PO number` | ไม่พบทั้งใน SIMS และ F&O — **field ทุกตัวเป็น `""`** (ผู้เรียกต้องเช็ค STATUS ไม่ใช่ HTTP code) · ticket ที่เป็นช่องว่างล้วน หรือมีอักขระ NUL ตอบแบบนี้ทันทีโดยไม่ค้น |
| 400 | `ERROR` | `referencedPoNumber is required in request body` | POST ไม่มี body / ไม่มี key / ค่าว่าง / `0` / `false` / `null` |
| 400 | — (HTML ของ Express) | — | POST body เป็น JSON ที่พัง |
| 401 | `ERROR` | `Access denied. No credentials provided.` | ไม่มี header `Authorization` — body 401 ทุกแบบมีแค่ STATUS + MESSAGE (มาจาก `basicAuthMiddleware.js` ไม่ได้เปลี่ยน) |
| 401 | `ERROR` | `Access denied. Invalid authorization format. Use: Basic <base64(username:password)>` | header ไม่ใช่รูปแบบ `Basic <token>` |
| 401 | `ERROR` | `Invalid credentials.` | user/password ผิด หรือ token ถอดรหัสไม่ได้ |
| 500 | `ERROR` | `Server configuration error.` | server ไม่ได้ตั้ง `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` (middleware ตอบก่อนถึง controller — body มีแค่ STATUS + MESSAGE) |
| 500 | `ERROR` | ``String cannot coerce the given value JSON element of type `Number` to a runtime value.`` (หรือ `True` / `Array` / `Object`) | POST ส่ง `referencedPoNumber` ที่ไม่ใช่ข้อความ — **คงข้อความเดิมของ implementation Fabric ทุกตัวอักษร** (ตัวแปร GraphQL `String!` ปฏิเสธด้วยข้อความนี้) และไม่ค้นจริง เพราะตัวเลขทำให้เลข 0 นำหน้าหาย · ข้อต่างที่รู้แล้ว: ตัวเลขเกินช่วง double (เช่น `1e400`) ของเดิมกลายเป็น `null` ก่อนส่ง GraphQL จึงได้ข้อความอื่น ตอนนี้ได้ข้อความ `Number` |
| 500 | `ERROR` | `Request status service is not configured` / `... is busy, please retry` / `... is unreachable, please retry` / `Failed to read request status` | ระบบใดระบบหนึ่งต่อไม่ได้และอีกระบบไม่พบ หรือต่อไม่ได้ทั้งคู่ (SIMS: connection เต็ม = SQLSTATE 53300 → busy, ช้าเกิน `SIMS_DB_LOOKUP_DEADLINE_MS` → unreachable, ยังไม่ได้ตั้ง `SIMS_DB_*` / TLS → not configured · F&O: GraphQL / token / network error หรือ HTTP ที่ไม่ใช่ 2xx เช่น 429 / 401 / 503 — **ของเดิมตอบ 200 NOT_FOUND ในกรณี HTTP error ที่ไม่มี `errors[]` ซึ่งทำให้ใบที่มีอยู่ดูเหมือนไม่มี ตอนนี้ตอบ 500**) — **ข้อความต่างจากเดิม** (เดิมส่ง error ดิบของ GraphQL / fetch ออกไป) ตอนนี้เป็นข้อความกลาง ๆ ไม่บอกชนิดฐานข้อมูล host หรือ role (รายละเอียดจริงอยู่ใน log ฝั่ง server) · HTTP code และ STATUS เหมือนเดิม |

## 3. ที่มาของแต่ละ field

SIMS — join หลัก (1 แถวต่อใบงาน): `SMAServiceDocumentOperationalDetail od` ⟶ `SMAServiceOrderTable so` และ `SMAServiceDocumentTable sd` ด้วย (`DataAreaId`, `ServiceDocumentRecId`)
F&O — ใช้ stored procedure เดิมโดยไม่แก้ (`smaserviceordertable` กรองด้วย `bpc_ticketno` อย่างเดียว) ผลผ่านการแปลงเดียวกับของเดิม (ตัดเวลาออกจากวันที่ · ค่าว่าง → `""`)

| Field | F&O (ใบก่อน cutover) | SIMS (ใบตั้งแต่ go-live) | การแปลงฝั่ง SIMS |
|---|---|---|---|
| ตัวกรอง | `bpc_ticketno = @REFERENCEDPONUMBER` | `od."TicketNo" = rtrim($1)` | ตรงตัว **แยกตัวพิมพ์เล็ก/ใหญ่** (เหมือน collation BIN2 ของ Fabric) · ช่องว่างท้ายไม่นับเหมือน SQL Server · ค่าไม่เต็ม (เช่นขาด `-1`) ไม่นับว่าตรง |
| Serviceorderid | `serviceorderid` | `so."ServiceOrderNumber"` | — |
| ServiceStage | `stageid` | `od."ServiceStage"` | ไม่แปล รหัสชุดเดียวกัน INIT / INPR / FINS / POST / CANC |
| PostponeDate | `bpc_postponedate` | `od."PostponeDate"` | `YYYY-MM-DD` · ว่าง → `1900-01-01` |
| UnkhowpostponeDate | `bpc_unkhowpostponedate` 1/0 → Yes/No | `od."UnknownPostponeDate"` (ข้อความ) | yes/1/true → `Yes` · no/0/false/ว่าง → `No` · ค่าอื่น → `""` |
| PostponereasonDesc | `bpc_postponereasondesc` | `sd."PostponeDescription"` | ข้อความที่เก็บในใบงาน ไม่ join master |
| Scheduledstart | `bpc_scheduledstart` | `od."ScheduleStartDate"` | `YYYY-MM-DD` · ว่าง → `1900-01-01` |
| Modelnodescription | `bpc_modelnodescription` | `od."ModelDescription"` สำรอง `SMAModelNumber."Description"` (`Code = od."ModelNo"`) | — |

## 4. การตัดสินใจที่ต้องรู้ (และเหตุผล)

| เรื่อง | ทำแบบนี้ | เหตุผล |
|---|---|---|
| ลำดับการค้น | SIMS ก่อน ไม่พบค่อยค้น F&O | ใบงานใหม่ทั้งหมดอยู่ใน SIMS และ SIMS ตอบเร็ว (~50 ms) · F&O ช้ากว่า (1–14 วินาที) จึงค้นเฉพาะเมื่อจำเป็น |
| ticket ที่มีทั้ง 2 ระบบ | คืนใบจาก SIMS — ยกเว้นตอน SIMS ต่อไม่ได้/ช้าเกิน deadline จะได้ใบจาก F&O (อาจเป็นใบเก่ากว่าของ ticket เดียวกัน) | ใบใน SIMS ใหม่กว่าเสมอ (F&O หยุดรับใบใหม่ที่ cutover) — สอดคล้องกับกติกา "ticket ซ้ำได้ใบล่าสุด" · ข้อยกเว้นเลือกให้ตอบได้มากกว่าตอบ 500 |
| ระบบหนึ่งต่อไม่ได้ | ใช้ผลของอีกระบบถ้าพบ ถ้าไม่พบตอบ 500 | ตอบ NOT_FOUND ได้เฉพาะเมื่อทั้ง 2 ระบบตอบว่า "ไม่มี" จริง ไม่งั้นผู้เรียกจะเข้าใจผิดว่าไม่มีใบงาน · ฝั่ง F&O นับ HTTP ที่ไม่ใช่ 2xx เป็น "ต่อไม่ได้" (แก้ใน `graphqlService.executeReferencedPoNumber`) |
| deadline ของ SIMS | รอ SIMS ไม่เกิน `SIMS_DB_LOOKUP_DEADLINE_MS` (5 วินาที) แล้วถาม F&O ต่อ · query ที่ค้างทำงานต่อเบื้องหลังแล้วทิ้งผล | ปกติ SIMS ตอบ ~50 ms ถ้าไม่มี deadline ตอน SIMS ค้าง ทุก request ต้องรอ timeout ของ pool / statement 15–35 วินาทีก่อนถาม F&O และอาจเกิน timeout ของ gateway |
| ฝั่ง F&O | เรียก SP เดิมผ่านโค้ดเดิม (`graphqlService.executeReferencedPoNumber`) ไม่แก้ | ใบเก่าต้องได้ค่าเหมือนที่ endpoint นี้เคยตอบทุกตัวอักษร รวมถึงพฤติกรรมเดิมของ SP (ไม่กรองบริษัท / แถวที่ถูกลบ, ticket ซ้ำได้ใบใดใบหนึ่ง) |
| วันที่ว่าง | คืน `1900-01-01` | F&O เก็บ 1900-01-01 แทนค่าว่าง ผู้เรียกเคยได้ `1900-01-01` มาตลอด SIMS เก็บ NULL ถ้าไม่แปลงจะตอบ `""` ซึ่งผู้เรียกไม่เคยเจอ |
| UnkhowpostponeDate ว่าง | คืน `No` | ใน F&O ไม่เคยว่าง (ค่าเริ่มต้น 0 = No) |
| ticket เดียวหลายใบงานใน SIMS | คืน **ใบที่สร้างล่าสุด** (`CreatedDateTime DESC, RecId DESC`) | SP เดิมไม่มี ORDER BY ผลจึงไม่แน่นอน (ทดสอบ 40 ครั้ง ได้ใบเก่าสุด 22 ครั้ง ใหม่สุด 18 ครั้ง) · คู่ Install (ZC04) + Remove (ZC09) จะได้ ZC09 |
| ตัวกรองบริษัท | `DataAreaId = 'BPA'` จาก `SIMS_DB_DATA_AREA_ID` | SIMS เก็บตัวพิมพ์ใหญ่ · SP เดิมไม่กรองบริษัทและไม่กรองแถวที่ถูกลบ |
| เหตุผลการเลื่อน | ไม่ดึงจาก master `SMAPostponeReason` | ใน F&O ผู้ใช้แก้ข้อความได้ และใบที่มีรหัสแต่ข้อความว่าง ของเดิมตอบ `""` |
| วันที่ใน SQL | `to_char(..., 'YYYY-MM-DD')` | driver `pg` แปลง `date` เป็น JS Date ซึ่งเสี่ยงเลื่อนวันตาม timezone |
| POST ค่าที่ไม่ใช่ข้อความ | 500 + ข้อความ GraphQL เดิม | ให้ผู้เรียกเห็นผลเหมือนเดิมทุกตัวอักษร (ข้อ 2) แม้ 400 จะถูกหลัก HTTP กว่า |
| ข้อความ error 500 | ข้อความกลาง ๆ | ไม่เปิดเผยรายละเอียดภายใน (ของเดิมส่ง error ดิบของ GraphQL ออกไป) |

## 5. ข้อจำกัดที่รู้แล้ว

- **ใบงานที่สร้างใน F&O ก่อน cutover ไม่มีใน SIMS** (SIMS เริ่มใช้งานจริง 2026-11-01 ด้วยฐานข้อมูลใหม่ ไม่ได้ย้ายใบงานเก่ามา) จึงตอบจาก F&O — ค่าที่ได้คือค่าล่าสุดใน Fabric mirror ของ F&O
- **เมื่อ F&O / Fabric หยุดตอบ** (ปิด F&O หรือ mirror, Fabric ล่ม, capacity ถูกหยุด, throttle 429 หรือ secret ของ service principal `AZURE_CLIENT_SECRET` หมดอายุ): **ทุก ticket ที่ไม่พบใน SIMS ได้ 500 แทน NOT_FOUND** — รวม ticket ที่ไม่มีจริงหรือพิมพ์ผิด ไม่ใช่แค่ใบเก่า (ถ้า mirror ยังตอบแต่ไม่มีข้อมูล จะได้ NOT_FOUND) · **ก่อนปิด F&O / mirror ต้องตัดสินใจ**: เอาการค้น F&O ออกจากโค้ด หรือคง mirror + GraphQL item ไว้
- เวลาตอบ: พบใน SIMS ~50 ms · ไม่พบใน SIMS (ใบเก่า หรือ ticket ที่ไม่มีจริง) ช้าเท่าเดิม 1–14 วินาที เพราะรอ Fabric · ถ้า SIMS ช้า controller รอไม่เกิน `SIMS_DB_LOOKUP_DEADLINE_MS` (5 วินาที) แล้วถาม F&O ต่อ
- เลขใบงาน / ticket ที่เห็นในช่วงทดสอบ SIMS (ก่อน 2026-11-01) ไม่มีในฐานข้อมูลจริง และเลขใบงาน SIMS (`SV…`) เริ่มนับใหม่ เลขเดียวกันอาจเป็นคนละใบงานกับที่เคยเห็นตอนทดสอบ
- ใบงานที่มาจาก SAP: ช่วงทดสอบพบว่าแทบไม่มี TicketNo (15 จาก 9,658 ใบ ณ 2026-10-27) ขณะที่ F&O มี 68.7% · ในข้อมูลจริงหลัง go-live พบใบ SAP ที่มี TicketNo แล้ว (เช่นใบที่ใช้ทดสอบในข้อ 7) แต่ยังไม่ได้นับสัดส่วน — ถ้าใบ SAP ส่วนใหญ่ไม่มี TicketNo ผู้เรียกจะได้ `NOT_FOUND` ต้องยืนยันกับทีม SIMS
- ticket ข้อความกว้าง ๆ ที่ใช้ซ้ำหลายใบ (เช่น `26102026` ช่วงทดสอบมี 198 ใบ) จะได้ใบล่าสุดใบเดียว
- **เมื่อ SIMS มีปัญหา** (connection เต็ม, pool เต็มคิว, firewall ลบ IP, credential ถูกเปลี่ยน, ช้าเกิน deadline): ใบที่อยู่ใน F&O ยังตอบ 200 ตามปกติ — **ดูจากใบเก่าจะเหมือนระบบปกติ** · ใบตั้งแต่ 2026-11-01 และ ticket ที่ไม่มีจริงได้ 500 (`busy` / `unreachable` / `not configured` / `Failed to read request status` ตามสาเหตุ) และทุก request ช้าลงเท่า deadline + เวลาของ Fabric · สาเหตุจริงอยู่ใน log ฝั่ง server บรรทัด `[SIMS-RequestStatus] SIMS lookup failed, trying F&O: ...` · ช่วงนี้ ticket ที่มีทั้ง 2 ระบบจะได้ใบจาก F&O (เก่ากว่า) แทน
- **โควตา connection**: role ฐานข้อมูลอาจถูกจำกัดจำนวน connection และ session ของเครื่องมือผู้ดูแล (เช่น pgAdmin) ที่ใช้ role เดียวกันนับรวม — เคยทำให้ทุก lookup ของ SIMS ล้มด้วย "busy" (2026-10-27) · ให้ API ใช้ role อ่านอย่างเดียวของตัวเอง · ชื่อ role/ค่าจริงไม่ใส่ใน repo นี้ (public)
- **pool 2 connection**: ปกติ query ใช้ ~40 ms รับได้สบาย · ถ้าฐานข้อมูลช้า request ที่เกิน 2 ตัวพร้อมกันจะรอคิว และเกิน deadline ก็กลายเป็น "SIMS มีปัญหา" (ข้อแรก) · ตรวจ connection limit ของ role ที่ใช้ แล้วตั้ง `SIMS_DB_POOL_MAX` ผ่าน App Settings ราว 5–10 (ไม่ต้องแก้โค้ด) · อย่าลด connect timeout
- **พึ่ง firewall ของฐานข้อมูล SIMS**: อนุญาตเป็นราย IP และดูแลโดยทีม SIMS — IP ขาออกของ Web App นี้ (`possibleOutboundIpAddresses`) ต้องอยู่ใน rule ตลอด ถ้าถูกลบ = "SIMS มีปัญหา" (ข้อแรก) โดย MESSAGE อาจเป็น `unreachable` หรือ `Failed to read request status`
- **credential ชั่วคราว**: ณ 2026-11-02 production ใช้ credential ของแอป SIMS เอง (อ่าน-เขียนได้) เพราะยังไม่มี role อ่านอย่างเดียวของ API — ถ้าทีม SIMS เปลี่ยนรหัสของ credential นั้น = "SIMS มีปัญหา" (ข้อแรก) · ขอ role อ่านอย่างเดียวแล้วเปลี่ยนแค่ `SIMS_DB_USER` / `SIMS_DB_PASSWORD`

## 6. ตั้งค่า (ชื่อ key เท่านั้น ค่าจริงอยู่ใน `.env` / Azure App Settings)

| Key | จำเป็น | ค่าเริ่มต้น | หมายเหตุ |
|---|---|---|---|
| `SIMS_DB_HOST` | ใช่ | — | ต้องเป็นฐานข้อมูลที่แอป SIMS ใช้งานจริงอยู่ — ชี้ผิดตัว ใบใหม่จะได้ `NOT_FOUND` โดยไม่มี error (ใบเก่ายังตอบจาก F&O จึงสังเกตยาก) |
| `SIMS_DB_PORT` | ใช่ | 5432 | |
| `SIMS_DB_DATABASE` | ใช่ | — | |
| `SIMS_DB_USER` | ใช่ | — | แนะนำ role อ่านอย่างเดียวของ API เอง (ข้อ 5) |
| `SIMS_DB_PASSWORD` | ใช่ | — | |
| `SIMS_DB_SSL` | **ใช่** | false | ต้องตั้ง `true` |
| `SIMS_DB_SSL_CA` | **ใช่** | — | PEM ของ CA ที่ออกใบรับรองให้เซิร์ฟเวอร์ → แอป **ตรวจตัวตนเซิร์ฟเวอร์** · Azure Database for PostgreSQL: ใส่ root CA สาธารณะต่อกัน (DigiCert Global Root G2 + Microsoft RSA Root Certificate Authority 2017 + DigiCert Global Root CA) · เซิร์ฟเวอร์ self-signed: ใส่ใบรับรองของเซิร์ฟเวอร์เอง (ใบนี้ระบุ host ห้าม commit) · ใส่บรรทัดเดียวโดยแทนขึ้นบรรทัดด้วย `\n` ได้ · **ไม่ใส่ = ไม่ยอมต่อ (fail closed)** เพราะถ้าไม่ตรวจตัวตน เซิร์ฟเวอร์ปลอมขอรหัสแบบข้อความเปล่าได้และ driver `pg` จะส่งให้ |
| `SIMS_DB_SSL_INSECURE` | | false | ตั้ง `true` เฉพาะ DB ทดสอบในเครื่อง **ห้ามใช้กับ production** |
| `SIMS_DB_CHANNEL_BINDING` | | true | SCRAM channel binding ผูกการ login กับ TLS session นี้ ปิดได้ด้วย `false` ถ้าเซิร์ฟเวอร์ไม่รองรับ |
| `SIMS_DB_DATA_AREA_ID` | | BPA | |
| `SIMS_DB_POOL_MAX` | | 2 | ค่าเริ่มต้นตั้งต่ำเพราะโควตาของ role เดิม · สำหรับ traffic ลูกค้าแนะนำ 5–10 หลังตรวจโควตา ดูข้อ 5 |
| `SIMS_DB_IDLE_TIMEOUT_MS` | | 10000 | |
| `SIMS_DB_CONNECT_TIMEOUT_MS` | | 15000 | |
| `SIMS_DB_STATEMENT_TIMEOUT_MS` | | 30000 | ฝั่งเซิร์ฟเวอร์ตัดคำสั่งที่นานเกิน |
| `SIMS_DB_QUERY_TIMEOUT_MS` | | 35000 | ฝั่ง client ตัดเองเมื่อเน็ตหลุดกลางคำสั่ง |
| `SIMS_DB_LOOKUP_DEADLINE_MS` | | 5000 | เวลาสูงสุดที่รอ SIMS ก่อนไปถาม F&O · ตั้งต่ำเกิน (< ~1 วินาที) เสี่ยงข้าม SIMS ตอนช้าชั่วคราว แล้วได้ใบเก่าจาก F&O แทนใบใหม่ |

ถ้าไม่ได้ตั้ง `SIMS_DB_*` (รวม `SIMS_DB_SSL` + `SIMS_DB_SSL_CA`) แอปยัง boot ได้ — `/api/request-status` ยังตอบใบที่อยู่ใน F&O ได้ ส่วน ticket ที่ไม่พบใน F&O ตอบ 500 "Request status service is not configured" (เส้นอื่นไม่กระทบ)
ฝั่ง F&O ใช้ค่าเชื่อมต่อ Fabric ชุดเดียวกับส่วนอื่นของแอป (`AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`) ไม่มี key ใหม่ — แต่ secret นี้ตอนนี้รองรับคำตอบใบเก่าและ NOT_FOUND ของ endpoint ลูกค้าด้วย **ต้องต่ออายุก่อนหมด** (หมดแล้ว = ticket ที่ไม่พบใน SIMS ได้ 500 ทั้งหมด)

## 7. การทดสอบ

**2026-11-02 — server ในเครื่อง ต่อฐานข้อมูล SIMS ที่ใช้งานจริง (TLS ตรวจใบรับรองกับ root CA ของ Azure + channel binding)**

- ticket จริง `2611010075-1` → `000043278387` / `POST` ตรงกับหน้าจอ SIMS ทั้ง GET, POST และ POST ที่มีช่องว่างท้าย · ticket ไม่เต็ม `2611010075` → NOT_FOUND
- กรณีขอบ 13 แบบ (POST: ตัวเลข / `0` / `true` / array / object / ช่องว่างล้วน / `{}` / ไม่มี body / JSON พัง · GET: ช่องว่าง / NUL / ค่าหน้าตา SQL injection / ค่ายาว 300 ตัว) เทียบกับผลของ implementation Fabric เดิมที่บันทึกก่อนสลับบน server เดียวกัน — **HTTP code, STATUS, MESSAGE และลำดับ key ตรงกัน 13/13**
- Postman collection `onelake-middleware/postman/request-status.postman_collection.json` (environment LOCAL / PROD ในโฟลเดอร์เดียวกัน, รหัส Basic Auth กรอกเองใน Postman): **11/11 request, 40/40 assertion ผ่าน** — ค่าทดสอบ `knownTicket` / `knownOrder` (ใบใน SIMS) และ `knownLegacyTicket` / `knownLegacyOrder` (ใบก่อน cutover ใน F&O) เป็นตัวแปรของ collection เปลี่ยนเมื่อใบงานนั้นไม่อยู่แล้ว
- ใบก่อน cutover: ticket `RP2610-00003`, `26102026`, `CM-10`, `cm-10`, `NO-SUCH-TICKET-XYZ` — response จากโค้ดใหม่ (ตอบผ่าน F&O) **ตรงกับ production ที่ยังรันโค้ดเดิมทุก byte** (`RP2610-00003` → `000043248675`)
- ตารางพบ/ไม่พบ/ล่ม ในข้อ 1 ทดสอบครบ 10 กรณีด้วย harness ที่จำลองทั้ง 2 ระบบ (ใบที่พบใน SIMS ไม่ไปถาม F&O · ticket ว่าง/NUL/ค่าที่ไม่ใช่ข้อความไม่ถามทั้ง 2 ระบบ)
- deadline ของ SIMS (harness ตั้ง 300 ms): SIMS ช้ากว่า deadline → ถาม F&O ภายใน ~310 ms · SIMS ล้มหลัง deadline ไม่เกิด unhandled rejection · SIMS ทันเวลา → ใบจาก SIMS (7/7)
- โค้ด Fabric ตัวจริง + `fetch` จำลอง: HTTP 429 / 401 / 503 ที่ไม่มี `errors[]`, body ไม่ใช่ JSON, token ล้ม, `fetch` ล้ม → 500 · `errors[]` + มีแถว → SUCCESS (เหมือนเดิม) · SIMS busy + F&O ไม่พบ → 500 "busy"
- เวลาตอบ: พบใน SIMS ~40–480 ms · ตอบจาก F&O ~3.7 วินาที · ไม่พบทั้ง 2 ระบบ ~2 วินาที
- path ที่ถูกลบ (`/api/request-status-sims/...`) ตอบ 401 จาก JWT middleware เหมือนก่อนมีเส้นนี้

**2026-10-27/28 — ฐานข้อมูลช่วงทดสอบ (ถูกล้างแล้ว)**: ทดสอบ TLS (ใบรับรองผิดถูกปฏิเสธ), ticket ซ้ำได้ใบล่าสุด, แยกตัวพิมพ์ (`CM-10` ≠ `cm-10`), ticket มี `/` — ใช้โค้ดและ SQL ชุดเดียวกับปัจจุบัน แต่ค่าทดสอบชุดนั้นไม่มีในข้อมูลจริงแล้ว
