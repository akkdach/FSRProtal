const fs = require('fs');
const path = require('path');
const config = require('../config');
const { logToFile } = require('../utils/logger');

class FreezeService {
    constructor() {
        this.basePath = config.freezeDataPath;
    }

    /**
     * Ensure the freeze data directory exists
     */
    _ensureDir() {
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
            logToFile(`[FreezeService] Created directory: ${this.basePath}`);
        }
    }

    /**
     * Generate filename from month range
     * @param {string} fromMonth - e.g. "2026-01"
     * @param {string} toMonth - e.g. "2026-03"
     * @returns {string} e.g. "freeze_2026-01_to_2026-03.json"
     */
    _generateFilename(fromMonth, toMonth) {
        return `freeze_${fromMonth}_to_${toMonth}.json`;
    }

    /**
     * Save freeze data as JSON file
     * @param {string} fromMonth
     * @param {string} toMonth
     * @param {Array} data
     * @returns {{ filename: string, recordCount: number, filePath: string }}
     */
    async saveData(fromMonth, toMonth, data) {
        this._ensureDir();

        const filename = this._generateFilename(fromMonth, toMonth);
        const filePath = path.join(this.basePath, filename);

        const freezePayload = {
            metadata: {
                fromMonth,
                toMonth,
                recordCount: data.length,
                frozenAt: new Date().toISOString(),
            },
            data: data,
        };

        const jsonStr = JSON.stringify(freezePayload, null, 2);
        fs.writeFileSync(filePath, jsonStr, 'utf-8');

        logToFile(`[FreezeService] Saved ${data.length} records to ${filePath} (${(Buffer.byteLength(jsonStr) / 1024 / 1024).toFixed(2)} MB)`);

        return {
            filename,
            recordCount: data.length,
            filePath,
            fileSize: Buffer.byteLength(jsonStr),
        };
    }

    /**
     * List all frozen data files
     * @returns {Array<{ filename: string, fromMonth: string, toMonth: string, size: number, modified: string }>}
     */
    async listFiles() {
        this._ensureDir();

        const files = fs.readdirSync(this.basePath)
            .filter(f => f.startsWith('freeze_') && f.endsWith('.json'));

        return files.map(filename => {
            const filePath = path.join(this.basePath, filename);
            const stats = fs.statSync(filePath);

            // Parse fromMonth and toMonth from filename: freeze_YYYY-MM_to_YYYY-MM.json
            const match = filename.match(/^freeze_(\d{4}-\d{2})_to_(\d{4}-\d{2})\.json$/);
            const fromMonth = match ? match[1] : null;
            const toMonth = match ? match[2] : null;

            // Try to read metadata without loading all data
            let metadata = null;
            try {
                const fd = fs.openSync(filePath, 'r');
                const buffer = Buffer.alloc(512);
                fs.readSync(fd, buffer, 0, 512, 0);
                fs.closeSync(fd);
                const partial = buffer.toString('utf-8');
                const metaMatch = partial.match(/"recordCount"\s*:\s*(\d+)/);
                const frozenAtMatch = partial.match(/"frozenAt"\s*:\s*"([^"]+)"/);
                metadata = {
                    recordCount: metaMatch ? parseInt(metaMatch[1]) : null,
                    frozenAt: frozenAtMatch ? frozenAtMatch[1] : null,
                };
            } catch (e) {
                // ignore parse errors
            }

            return {
                filename,
                fromMonth,
                toMonth,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                ...metadata,
            };
        });
    }

    /**
     * Read a frozen data file
     * @param {string} filename
     * @returns {object} The parsed JSON content
     */
    async readFile(filename) {
        const filePath = path.join(this.basePath, filename);

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filename}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }

    /**
     * Delete a frozen data file
     * @param {string} filename
     */
    async deleteFile(filename) {
        const filePath = path.join(this.basePath, filename);

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filename}`);
        }

        fs.unlinkSync(filePath);
        logToFile(`[FreezeService] Deleted ${filePath}`);
    }
}

module.exports = new FreezeService();
