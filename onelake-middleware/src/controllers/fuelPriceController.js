// Fuel price (Thailand retail) — daily snapshots from Bangchak public API
// PTT OR shut down their public API, and Thai retail pump prices are identical
// across brands (same government price structure), so Bangchak's official feed
// is used as the source. The feed only exposes yesterday/today/tomorrow, so we
// persist a snapshot per date; history accumulates from the day this deploys.
// Requests for dates without a snapshot get the nearest available price (exact: false).
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { logToFile } = require('../utils/logger');

const BANGCHAK_API = 'https://oil-price.bangchak.co.th/ApiOilPrice2/th';
const HISTORY_FILE = path.join(config.freezeDataPath, 'fuel_price_history.json');
const DEFAULT_PRODUCT = 'ไฮดีเซล S'; // ดีเซล B7 มาตรฐาน (รถ van/กระบะของทีมใช้ดีเซล)

function loadHistory() {
    try {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveHistory(history) {
    try {
        fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));
    } catch (e) {
        logToFile(`[FuelPrice] save history failed: ${e.message}`);
    }
}

// "31/07/2569" (วันที่แบบ พ.ศ.) → "2026-07-31"
function thDateToISO(s) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
    if (!m) return null;
    return `${Number(m[3]) - 543}-${m[2]}-${m[1]}`;
}

function isoAddDays(iso, days) {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

// ดึงราคาปัจจุบันจาก Bangchak แล้ว upsert snapshot ของ เมื่อวาน/วันนี้/พรุ่งนี้
async function refreshSnapshots(history) {
    const res = await fetch(BANGCHAK_API);
    if (!res.ok) throw new Error(`Bangchak HTTP ${res.status}`);
    const body = await res.json();
    const row = Array.isArray(body) ? body[0] : body;
    const today = thDateToISO(row.OilDateNow);
    if (!today) throw new Error('unrecognized OilDateNow format');
    const list = typeof row.OilList === 'string' ? JSON.parse(row.OilList) : row.OilList;
    if (!Array.isArray(list)) throw new Error('unrecognized OilList format');

    const days = [
        { date: isoAddDays(today, -1), key: 'PriceYesterday' },
        { date: today, key: 'PriceToday' },
        { date: isoAddDays(today, 1), key: 'PriceTomorrow' },
    ];
    let changed = false;
    days.forEach(({ date, key }) => {
        const prices = {};
        list.forEach(o => {
            const p = Number(o[key]);
            if (o.OilName && p > 0) prices[o.OilName] = p;
        });
        if (Object.keys(prices).length > 0) {
            history[date] = prices;
            changed = true;
        }
    });
    if (changed) saveHistory(history);
    return history;
}

class FuelPriceController {
    // GET /api/fuel-price?date=YYYY-MM-DD&product=ไฮดีเซล S
    // ตอบราคา ฿/ลิตร ของวันที่ขอ — ถ้าไม่มี snapshot วันนั้น ใช้วันที่ใกล้ที่สุด (exact: false)
    async getFuelPrice(req, res) {
        try {
            const date = (req.query.date || '').trim();
            const product = (req.query.product || DEFAULT_PRODUCT).trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ success: false, message: 'date query param is required (YYYY-MM-DD)' });
            }

            const history = loadHistory();
            try {
                await refreshSnapshots(history);
            } catch (e) {
                // Bangchak ล่ม/เปลี่ยน format — ใช้ snapshot เดิมที่สะสมไว้
                logToFile(`[FuelPrice] refresh failed (using cached history): ${e.message}`);
            }

            const dates = Object.keys(history).sort();
            if (dates.length === 0) {
                return res.status(503).json({ success: false, message: 'no fuel price data available yet' });
            }

            // หา snapshot: ตรงวัน > วันก่อนหน้าที่ใกล้สุด > วันถัดไปที่ใกล้สุด
            let priceDate = history[date] ? date : null;
            if (!priceDate) {
                const before = dates.filter(d => d < date);
                priceDate = before.length > 0 ? before[before.length - 1] : dates[0];
            }
            const prices = history[priceDate];

            // เลือกสินค้า: ชื่อตรง > ชื่อที่มีคำค้นอยู่
            let matchedName = prices[product] != null ? product : null;
            if (!matchedName) {
                matchedName = Object.keys(prices).find(n => n.includes(product)) || null;
            }
            if (!matchedName) {
                return res.status(404).json({
                    success: false,
                    message: `product "${product}" not found`,
                    availableProducts: Object.keys(prices),
                });
            }

            logToFile(`[FuelPrice] ${date} → ${priceDate} ${matchedName} = ${prices[matchedName]}`);
            res.json({
                success: true,
                data: {
                    date,
                    priceDate,
                    exact: priceDate === date,
                    product: matchedName,
                    price: prices[matchedName],
                    all: prices,
                    source: 'bangchak',
                },
            });
        } catch (error) {
            logToFile(`[FuelPrice] Error: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to fetch fuel price', details: error.message });
        }
    }
}

module.exports = new FuelPriceController();
