// Simple script to search a code in Google Sheet Master
try { require('dotenv').config(); } catch (_) {}

const { searchInSheet } = require('../src/services/syncSheetsService');

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.error('Usage: node scripts/search_in_sheet.js <CODE>');
    process.exit(1);
  }
  try {
    const result = await searchInSheet(code);
    if (result) {
      console.log(JSON.stringify({ found: true, result }, null, 2));
    } else {
      console.log(JSON.stringify({ found: false }, null, 2));
    }
  } catch (e) {
    console.error('Search error:', e.message);
    process.exit(1);
  }
}

main();