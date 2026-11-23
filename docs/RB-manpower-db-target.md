# RB — Manpower page database switch (`MANPOWER_DB_TARGET`)

> 2026-11-23 · Owner: Service Management / Manpower

## What it does

The Manpower page tables are read and written through this middleware:

| Table | Routes |
|---|---|
| `Manpower_Operations` | `GET/POST /api/manpower`, `PUT/DELETE /api/manpower/:no`, plus the Teams DRAFT alert query |
| `Manpower_Dropdown_Options` | `GET/POST /api/master/dropdowns`, `PUT/DELETE /api/master/dropdowns/:id` |
| `Mas_CompanyHoliday` | `GET/POST /api/holidays`, `DELETE /api/holidays/:date` |

The App Setting `MANPOWER_DB_TARGET` decides which database they use:

| Value | Database |
|---|---|
| `prod` (default, also when unset) | `PROD_DB_*` = BevproFsProd (the old database) |
| `qas` | `QAS_DB_*` = BevproFsQas (where Service Management and the other systems moved on 2026-11-06) |

Every other route that uses `prodSqlService` (worker, work_log, work_center, van_fuel_avg, material master sync, …) stays on `PROD_DB_*`. The pool is chosen in `prodSqlService.connectManpower()`.

Callers: Service Management (Manpower Management, Operation Evaluate) and pro-iot-board. They all switch together.

## Why

Since 2026-11-06 Service Management reads Manpower from BevproFsQas (Manpower Summary, Escalate Alerts), but the Manpower page still saved to BevproFsProd through this middleware. Edits made on the page were therefore not visible on the other pages.

## BevproFsQas preparation (done 2026-11-23)

The QAS copy of `Manpower_Operations` has a different design from Prod (PK `Seat_ID`, `[No]` is not IDENTITY, shorter columns). The middleware writes it as follows:

- `[No]` comes from `dbo.Manpower_Operations_No_Seq` through the default `DF_Manpower_Operations_No`, with the unique index `UX_Manpower_Operations_No`. Inserts that leave out `[No]` get the next number, as Prod's IDENTITY did.
- These columns were widened to Prod's lengths: `Parent_Seat_ID`, `EmployeeCode`, `TelephoneNo`, `DirectReport`, `Remarks`, `No_Leader`.
- Prod's defaults were added: `Technician`='Yes', `HR_Status`='DRAFT', `ModifyDate`=getdate().
- `Target_Per_Head` is NOT NULL in QAS. In `qas` mode the middleware writes '0' in place of NULL.
- `Manpower_Dropdown_Options` was created with Prod's DDL, and all 103 rows were copied with their `OptionID`.
- Holidays were already identical, so none were copied.
- Data: rows that were newer in Prod were copied (3 rows). A backup of the QAS table before these changes is in `dbo.Manpower_Operations_bak_20261123_mig`.

## Cutover

1. Deploy this code. `MANPOWER_DB_TARGET` is unset, so the app behaves exactly as before.
2. Just before switching, re-run the Prod → QAS data sync for rows changed since step 1. Use the sync script from the 2026-11-23 change, in `sync` mode.
3. `az webapp config appsettings set -n onelake-middleware -g WebApplication_group --settings MANPOWER_DB_TARGET=qas`. The app restarts by itself.
4. Check:
   - the Manpower page loads, and saving a row works;
   - the app log shows `Querying Table: Manpower_Operations from BevproFsQas`.

## Rollback

Run `az webapp config appsettings set … --settings MANPOWER_DB_TARGET=prod`. No redeploy is needed.

Edits saved on QAS after the switch are not copied back to Prod automatically. Copy them back by hand if a rollback is ever kept.
