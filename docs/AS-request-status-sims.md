---
pmPageId:
pmParentId:
pmTitle: "[AS] Request Status จากระบบใหม่ SIMS (/api/request-status-sims)"
pmSyncedAt:
---

# Request Status (SIMS) — เส้นคู่ขนานของ /api/request-status ที่อ่านจาก PostgreSQL ของระบบใหม่

ตอบว่า endpoint `/api/request-status-sims` รับอะไร คืนอะไร แต่ละ field มาจากคอลัมน์ไหนใน SIMS และต่างจากเส้นเดิมตรงไหน
ผู้อ่าน: dev ที่ดูแล onelake-middleware และระบบที่จะย้ายจากเส้นเดิมมาเส้นนี้

| | |
|---|---|
| เวอร์ชันเอกสาร | 2026-10-28 |
| ชั้นเอกสาร | B |
| เจ้าของ | Dev |
| แหล่งความจริง | `onelake-middleware/src/services/simsDbService.js` (SQL), `src/controllers/simsRequestStatusController.js` (payload), `server.js` (route) |

## 1. สรุป

| | เส้นเดิม `/api/request-status` | เส้นใหม่ `/api/request-status-sims` |
|---|---|---|
| แหล่งข้อมูล | Fabric GraphQL → stored procedure `dbo.REFERENCEDPONUMBER` (F&O mirror) | PostgreSQL ของระบบใหม่ SIMS (ค่าเชื่อมต่ออยู่ใน App Settings เท่านั้น) |
| Auth | Basic Auth (`BASIC_AUTH_USER` / `BASIC_AUTH_PASS`) | **ชุดเดียวกัน** |
| Input | REFERENCEDPONUMBER = Ticket No ของใบงาน | เหมือนเดิม |
| Response | 7 field + STATUS + MESSAGE | **key ชุดเดียวกัน ลำดับเดียวกัน รูปแบบค่าเดียวกัน** |
| สถานะ | ไม่แตะ | ใหม่ |
| ค้นด้วยเลขใบงาน | ไม่มี | มีเพิ่ม `/order/{serviceOrderNumber}` (ข้อ 2.1) |

ระบบที่เรียกเส้นเดิมเปลี่ยนมาเส้นใหม่ได้โดยเปลี่ยนแค่ path

## 2. Endpoint

| Method | Path | Input | หมายเหตุ |
|---|---|---|---|
| GET | `/api/request-status-sims/{referencedPoNumber}` | path | ticket ที่มี `/` ต้อง URL-encode เป็น `%2F` (เส้นเดิมก็เป็นแบบนี้) |
| POST | `/api/request-status-sims` | body `{"referencedPoNumber": "..."}` | อ่านอย่างเดียว ไม่บันทึกอะไร |
| GET | `/api/request-status-sims/order/{serviceOrderNumber}` | path = **เลขใบงาน** | **เฉพาะ SIMS (เส้นเดิมไม่มี)** — สำหรับใบงานที่ไม่มี Ticket No ดูข้อ 2.1 |

| HTTP | STATUS | เมื่อไร |
|---|---|---|
| 200 | `SUCCESS` | พบใบงาน |
| 200 | `NOT_FOUND` | ไม่พบ — **field ทุกตัวเป็น `""`** (ผู้เรียกต้องเช็ค STATUS ไม่ใช่ HTTP code) · ticket ที่มีอักขระ NUL ก็ตอบแบบนี้ (เหมือนเส้นเดิม) |
| 400 | `ERROR` | POST ไม่ได้ส่ง `referencedPoNumber` หรือส่งเป็นชนิดอื่นที่ไม่ใช่ข้อความ (เช่น ตัวเลข — กันเลข 0 นำหน้าหาย) |
| 401 | `ERROR` | ไม่มี/ผิด Basic Auth |
| 500 | `ERROR` | ต่อ SIMS ไม่ได้ หรือยังไม่ได้ตั้ง `SIMS_DB_*` / TLS — MESSAGE เป็นข้อความกลาง ๆ (not configured / busy / unreachable) |

### 2.1 ค้นด้วยเลขใบงาน (`/order/{serviceOrderNumber}`)

- เพิ่มเพราะใบงานส่วนใหญ่ใน SIMS ไม่มี Ticket No (มีแค่ 1,217 จาก 11,003 ใบ ณ 2026-10-27 — ดูข้อ 5) จึงค้นผ่านเส้นหลักไม่เจอ
- response ชุดเดียวกับเส้นหลักทุก key และทุกการแปลงค่า (ข้อ 3) ต่างแค่ตัวกรองเป็น `so."ServiceOrderNumber" = rtrim($1)` และข้อความ NOT_FOUND เป็น `No data found for the given service order number`
- เลขใบงานไม่ซ้ำภายในบริษัท (11,003 แถว = 11,003 เลข) และมี index `("DataAreaId", "ServiceOrderNumber")` ได้ 1 ใบเสมอ
- ตรงตัวและแยกตัวพิมพ์ (เลขเก็บเป็นตัวพิมพ์ใหญ่ทั้งหมด) · ช่องว่างท้ายไม่นับ ช่องว่างหน้านับ · ใบงานจาก SAP ต้องส่งครบ 12 หลักพร้อมเลข 0 นำหน้า เช่น `000049042875` · ใบงานของ SIMS เช่น `SV0000251`
- ไม่มี POST เพราะเลขใบงานไม่มีอักขระ `/` · สถานะที่ตอบได้: 200 SUCCESS / 200 NOT_FOUND / 401 / 500 ตามตารางข้างบน (ไม่มี 400)

## 3. ที่มาของแต่ละ field

join หลัก (1 แถวต่อใบงาน ยืนยันจาก unique index และนับแถวจริง 11,002 = 11,002 = 11,002):
`SMAServiceDocumentOperationalDetail od` ⟶ `SMAServiceOrderTable so` และ `SMAServiceDocumentTable sd` ด้วย (`DataAreaId`, `ServiceDocumentRecId`)

| Field | F&O (เส้นเดิม) | SIMS (เส้นใหม่) | การแปลง |
|---|---|---|---|
| ตัวกรอง | `bpc_ticketno = @REFERENCEDPONUMBER` | `od."TicketNo" = rtrim($1)` | ตรงตัว **แยกตัวพิมพ์เล็ก/ใหญ่** เหมือน Fabric (collation BIN2) · ช่องว่างท้ายไม่นับเหมือน SQL Server |
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
| วันที่ว่าง | คืน `1900-01-01` | F&O เก็บ 1900-01-01 แทนค่าว่าง เส้นเดิมจึงตอบ `1900-01-01` (~85% ของใบงานที่ไม่เลื่อน) SIMS เก็บ NULL ถ้าไม่แปลงจะตอบ `""` ซึ่งผู้เรียกเดิมไม่เคยเจอ |
| UnkhowpostponeDate ว่าง | คืน `No` | ใน F&O ไม่เคยว่าง (ค่าเริ่มต้น 0 = No) |
| ticket เดียวหลายใบงาน | คืน **ใบที่สร้างล่าสุด** (`CreatedDateTime DESC, RecId DESC`) | SP เดิมไม่มี ORDER BY ผลจึงไม่แน่นอน (ทดสอบ 40 ครั้ง ได้ใบเก่าสุด 22 ครั้ง ใหม่สุด 18 ครั้ง) · คู่ Install (ZC04) + Remove (ZC09) จะได้ ZC09 · **นี่คือจุดเดียวที่ตั้งใจให้ต่างจากเส้นเดิม** |
| ตัวกรองบริษัท | `DataAreaId = 'BPA'` จาก `SIMS_DB_DATA_AREA_ID` | SIMS เก็บตัวพิมพ์ใหญ่ และมี tenant ทดสอบใน CompanyInfo |
| เหตุผลการเลื่อน | ไม่ดึงจาก master `SMAPostponeReason` | ใน F&O ผู้ใช้แก้ข้อความได้ และใบที่มีรหัสแต่ข้อความว่าง เส้นเดิมตอบ `""` |
| วันที่ใน SQL | `to_char(..., 'YYYY-MM-DD')` | driver `pg` แปลง `date` เป็น JS Date ซึ่งเสี่ยงเลื่อนวันตาม timezone |

## 5. ข้อจำกัดที่รู้แล้ว

- **ใบงานที่มาจาก SAP ใน SIMS แทบไม่มี TicketNo** (15 จาก 9,658 ใบ ณ 2026-10-27) ขณะที่ F&O มี 68.7% ถ้า interface SAP → SIMS ยังไม่เติม `TicketNo` จาก BSTKD แบบที่ F&O ทำ เส้นใหม่จะตอบ `NOT_FOUND` สำหรับ ticket ของใบงาน SAP ส่วนใหญ่ — ต้องยืนยันกับทีม SIMS
- เทียบค่ารายใบกับเส้นเดิมไม่ได้ เพราะ SIMS กับ F&O ไม่มีใบงานเดียวกันเลย (เลขคนละช่วง) การ map ยืนยันจาก schema, ชุดค่า และ master table เมื่อมีช่วงรันคู่ขนานควรเทียบซ้ำ
- ticket ข้อความกว้าง ๆ ที่ใช้ซ้ำหลายใบ (เช่น `26102026` มี 198 ใบ) จะได้ใบล่าสุดใบเดียว
- **โควตา connection**: role ผู้ดูแลที่ API ใช้ตอนนี้มี `CONNECTION LIMIT` ต่ำทั้งเซิร์ฟเวอร์ และ session ของ pgAdmin ที่ใช้ role เดียวกันนับรวม วันที่ 2026-10-27 pgAdmin ถือเกือบเต็มโควตาจน API ตอบ 500 "busy" ทุก request · แอป SIMS เองใช้ role แยก จึงไม่กระทบระบบ SIMS แต่กระทบ API นี้ · ทางแก้ถาวร: ให้ API ใช้ role อ่านอย่างเดียวของตัวเอง (โควตาแยก ไม่ต้องเปลี่ยนรหัส role เดิม) หรือเพิ่ม `CONNECTION LIMIT` · pool ของ API ตั้งไว้ 2 เพื่อกินโควตาน้อยที่สุด · ชื่อ role/ค่าจริงอยู่ใน runbook ภายใน ไม่ใส่ใน repo นี้ (public)

## 6. ตั้งค่า (ชื่อ key เท่านั้น ค่าจริงอยู่ใน `.env` / Azure App Settings)

| Key | จำเป็น | ค่าเริ่มต้น | หมายเหตุ |
|---|---|---|---|
| `SIMS_DB_HOST` | ใช่ | — | |
| `SIMS_DB_PORT` | ใช่ | 5432 | SIMS ไม่ได้ใช้ port มาตรฐาน — ดูค่าจริงใน App Settings |
| `SIMS_DB_DATABASE` | ใช่ | — | |
| `SIMS_DB_USER` | ใช่ | — | แนะนำ role อ่านอย่างเดียวของ API เอง (ดูข้อ 5) |
| `SIMS_DB_PASSWORD` | ใช่ | — | |
| `SIMS_DB_SSL` | **ใช่** | false | เซิร์ฟเวอร์ปฏิเสธการต่อที่ไม่เข้ารหัส (`pg_hba.conf rejects ... no encryption`) ต้องตั้ง `true` |
| `SIMS_DB_SSL_CA` | **ใช่** | — | PEM ของใบรับรองเซิร์ฟเวอร์ (self-signed) → แอป **ตรวจตัวตนเซิร์ฟเวอร์** (pin) ใส่บรรทัดเดียวโดยแทนขึ้นบรรทัดด้วย `\n` ได้ · **ไม่ใส่ = เส้นนี้ไม่ยอมต่อ (fail closed)** เพราะถ้าไม่ตรวจตัวตน เซิร์ฟเวอร์ปลอมขอรหัสแบบข้อความเปล่าได้และ driver `pg` จะส่งให้ · **ห้าม commit** (ใบรับรองระบุ host ของ DB และ repo นี้ public) |
| `SIMS_DB_SSL_INSECURE` | | false | ตั้ง `true` เฉพาะ DB ทดสอบในเครื่อง: ยอมต่อโดยไม่ตรวจใบรับรอง/ไม่เข้ารหัส **ห้ามใช้กับ production** |
| `SIMS_DB_CHANNEL_BINDING` | | true | SCRAM channel binding (ทำงานร่วมกับการตรวจใบรับรอง) ผูกการ login กับ TLS session นี้ ปิดได้ด้วย `false` ถ้าเซิร์ฟเวอร์ไม่รองรับ |
| `SIMS_DB_DATA_AREA_ID` | | BPA | |
| `SIMS_DB_POOL_MAX` | | 2 | ตั้งต่ำโดยตั้งใจ ดูข้อ 5 เรื่องโควตา connection |
| `SIMS_DB_IDLE_TIMEOUT_MS` | | 10000 | คืน connection ที่ว่างเร็ว |
| `SIMS_DB_CONNECT_TIMEOUT_MS` | | 15000 | |
| `SIMS_DB_STATEMENT_TIMEOUT_MS` | | 30000 | ฝั่งเซิร์ฟเวอร์ตัดคำสั่งที่นานเกิน |
| `SIMS_DB_QUERY_TIMEOUT_MS` | | 35000 | ฝั่ง client ตัดเองเมื่อเน็ตหลุดกลางคำสั่ง (timeout ฝั่งเซิร์ฟเวอร์มาไม่ถึง) |

ถ้าไม่ได้ตั้ง `SIMS_DB_*` (รวม `SIMS_DB_SSL` + `SIMS_DB_SSL_CA`) แอปยัง boot ได้ตามปกติ เส้นนี้ตอบ 500 `STATUS=ERROR` "not configured" ส่วนเส้นอื่นไม่กระทบ
ข้อความ error ที่ส่งให้ผู้เรียกเป็นข้อความกลาง ๆ (เช่น "SIMS database is busy ...") รายละเอียดจริงอยู่ใน log ฝั่ง server เท่านั้น ไม่เปิดเผยชื่อ user / host ของ DB

## 7. การทดสอบที่ทำแล้ว (2026-10-27/28, server ในเครื่อง ต่อ SIMS จริง)

- Postman collection `onelake-middleware/postman/request-status-sims.postman_collection.json` (environment LOCAL / PROD ในโฟลเดอร์เดียวกัน, รหัส Basic Auth กรอกเองใน Postman): **14/14 request, 43/43 assertion ผ่าน** ทั้งโหมด TLS ตรวจใบรับรอง (pinned) + channel binding
- ครอบคลุม: GET/POST พบ · ไม่พบ → 200 NOT_FOUND · ticket มี `/` · POST ไม่มี body → 400 · ไม่มี/ผิด auth → 401 · ticket ซ้ำได้ใบล่าสุด · แยกตัวพิมพ์ (`CM-10` ≠ `cm-10`) · ช่องว่างท้ายไม่นับ · key ของ response ตรงกับเส้นเดิมทุกตัว · เส้นเดิมยังทำงานปกติ
- `/order/{serviceOrderNumber}`: ใบ SIMS ที่ไม่มี Ticket No (`SV0000251`) · ใบ SAP มีเลข 0 นำหน้า (`000049042875`) · ไม่พบ → 200 NOT_FOUND พร้อมข้อความของเส้นนี้ · เทียบกับ SQL ที่เขียนแยกจาก API ทีละ field 8 ใบ (SV0000248–253 + ใบ SAP 2 ใบ) ตรงทุกใบ · ตัวพิมพ์เล็ก / ช่องว่างหน้า / NUL / ค่ายาว 5,000 ตัว / ค่าหน้าตาเหมือน SQL injection → NOT_FOUND · ไม่มี auth → 401
- TLS: ใบรับรองผิดถูกปฏิเสธ (negative control) · ใบรับรองจริงผ่าน
