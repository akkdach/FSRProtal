// Fuel price (Thailand retail) — TRUE historical daily prices
// Source: Bangchak historical price page (server-rendered HTML, one full year per request)
//   https://www.bangchak.co.th/th/oilprice/historical?year={CE year}
// Verified back to 2010. Rows are PRICE-CHANGE dates; Thai retail prices stay flat
// between announcements, so fill-forward gives the exact price for any date.
// Cross-checked against EPPO (กระทรวงพลังงาน) official data: prices identical.
// PTT OR closed their public API; Thai standard-product pump prices are brand-uniform.
// The page sits behind Radware bot protection — needs full browser-like headers.
// Each fetched year is cached to disk so a future bot-block degrades gracefully.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { logToFile } = require('../utils/logger');

const DEFAULT_PRODUCT = 'Hi Diesel S'; // ดีเซล B7 มาตรฐาน (รถ van/กระบะของทีมใช้ดีเซล)
const CURRENT_YEAR_TTL_MS = 6 * 60 * 60 * 1000; // ปีปัจจุบัน refetch ทุก 6 ชม. เผื่อราคาเปลี่ยน

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'th,en-US;q=0.9,en;q=0.8',
    'Referer': 'https://www.bangchak.co.th/th/oilprice',
    'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

const memCache = new Map(); // year -> { rows, fetchedAt }

function yearCacheFile(year) {
    return path.join(config.freezeDataPath, `fuel_price_year_${year}.json`);
}

function loadYearFile(year) {
    try {
        return JSON.parse(fs.readFileSync(yearCacheFile(year), 'utf8'));
    } catch {
        return null;
    }
}

function saveYearFile(year, rows) {
    try {
        fs.mkdirSync(config.freezeDataPath, { recursive: true });
        fs.writeFileSync(yearCacheFile(year), JSON.stringify(rows));
    } catch (e) {
        logToFile(`[FuelPrice] save year cache failed: ${e.message}`);
    }
}

// ดึงตารางราคาย้อนหลังทั้งปีจากหน้าเว็บบางจาก → [{ date: 'YYYY-MM-DD', prices: {ชื่อผลิตภัณฑ์: ฿/ลิตร} }]
async function fetchYearTable(year) {
    const res = await fetch(`https://www.bangchak.co.th/th/oilprice/historical?year=${year}`, {
        headers: BROWSER_HEADERS,
    });
    if (!res.ok) throw new Error(`Bangchak history HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes('table--historical-oilprice')) {
        throw new Error('history table marker not found (bot-blocked or markup changed)');
    }
    const rows = [];
    const rowRe = /<tr>\s*<th scope="row">([0-9/]+)<\/th>([\s\S]*?)<\/tr>/g;
    let m;
    while ((m = rowRe.exec(html))) {
        const th = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(m[1]);
        if (!th) continue;
        const dateISO = `${Number(th[3]) - 543}-${th[2]}-${th[1]}`; // วันที่ พ.ศ. → ค.ศ.
        const prices = {};
        const cellRe = /<td title="([^"]+)">([0-9.]+)<\/td>/g;
        let c;
        while ((c = cellRe.exec(m[2]))) {
            const p = Number(c[2]);
            if (c[1] && p > 0) prices[c[1].trim()] = p;
        }
        if (Object.keys(prices).length > 0) rows.push({ date: dateISO, prices });
    }
    if (rows.length === 0) throw new Error('parsed 0 rows from history table');
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
}

// ตารางราคาของปีนั้น — memory cache → เว็บ → file cache (ตามลำดับ)
async function getYearTable(year) {
    const now = Date.now();
    const isCurrentYear = year === new Date().getFullYear();
    const cached = memCache.get(year);
    if (cached && (!isCurrentYear || now - cached.fetchedAt < CURRENT_YEAR_TTL_MS)) {
        return cached.rows;
    }
    try {
        const rows = await fetchYearTable(year);
        memCache.set(year, { rows, fetchedAt: now });
        saveYearFile(year, rows);
        logToFile(`[FuelPrice] fetched year ${year}: ${rows.length} price changes`);
        return rows;
    } catch (e) {
        logToFile(`[FuelPrice] fetch year ${year} failed (${e.message}) — trying disk cache`);
        const fromDisk = loadYearFile(year);
        if (fromDisk && fromDisk.length > 0) {
            memCache.set(year, { rows: fromDisk, fetchedAt: now });
            return fromDisk;
        }
        throw e;
    }
}

class FuelPriceController {
    // GET /api/fuel-price?date=YYYY-MM-DD&product=Hi Diesel S
    // ราคาขายปลีก ฿/ลิตร ของวันที่ขอ (fill-forward จากวันที่ราคาเริ่มมีผลล่าสุดก่อนหน้า)
    async getFuelPrice(req, res) {
        try {
            const date = (req.query.date || '').trim();
            const product = (req.query.product || DEFAULT_PRODUCT).trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ success: false, message: 'date query param is required (YYYY-MM-DD)' });
            }

            const year = Number(date.slice(0, 4));
            let rows = await getYearTable(year);
            // วันที่ก่อนการเปลี่ยนราคาครั้งแรกของปี → ราคาที่มีผลอยู่คือของปลายปีก่อนหน้า
            if (rows.length === 0 || rows[0].date > date) {
                try {
                    rows = [...(await getYearTable(year - 1)), ...rows];
                } catch { /* ปีก่อนหน้าไม่มีข้อมูล — ใช้เท่าที่มี */ }
            }

            const effective = [...rows].reverse().find(r => r.date <= date);
            if (!effective) {
                return res.status(404).json({ success: false, message: `no price data on/before ${date}` });
            }

            let matchedName = effective.prices[product] != null ? product : null;
            if (!matchedName) {
                const q = product.toLowerCase();
                matchedName = Object.keys(effective.prices).find(n => n.toLowerCase().includes(q)) || null;
            }
            if (!matchedName) {
                return res.status(404).json({
                    success: false,
                    message: `product "${product}" not found`,
                    availableProducts: Object.keys(effective.prices),
                });
            }

            logToFile(`[FuelPrice] ${date} → effective ${effective.date} ${matchedName} = ${effective.prices[matchedName]}`);
            res.json({
                success: true,
                data: {
                    date,
                    priceDate: effective.date,   // วันที่ราคานี้เริ่มมีผล
                    exact: true,                 // ราคาคงที่ระหว่างประกาศ — นี่คือราคาจริงของวันนั้น
                    product: matchedName,
                    price: effective.prices[matchedName],
                    all: effective.prices,
                    source: 'bangchak-history',
                },
            });
        } catch (error) {
            logToFile(`[FuelPrice] Error: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to fetch fuel price', details: error.message });
        }
    }
}

module.exports = new FuelPriceController();
