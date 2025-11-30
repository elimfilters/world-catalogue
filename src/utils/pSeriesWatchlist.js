const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '..', '..', 'reports');
const REPORT_FILE = path.join(REPORT_DIR, 'p_series_watchlist.json');

function readWatchlist() {
  try {
    const raw = fs.readFileSync(REPORT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { generated_at: new Date().toISOString(), entries: [] };
  }
}

function writeWatchlist(data) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function appendWatch(code, reason) {
  try {
    const normalized = String(code || '').toUpperCase().trim();
    if (!normalized.startsWith('P')) return;
    const data = readWatchlist();
    const exists = data.entries.some(e => e.code === normalized);
    const entry = { code: normalized, reason: reason || 'UNKNOWN_P_SERIES', ts: new Date().toISOString() };
    if (!exists) {
      data.entries.push(entry);
    } else {
      // Update last seen timestamp
      data.entries = data.entries.map(e => (e.code === normalized ? { ...e, ts: entry.ts } : e));
    }
    writeWatchlist(data);
  } catch (e) {
    // swallow
  }
}

module.exports = { appendWatch };