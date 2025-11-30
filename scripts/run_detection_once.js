// Simple runner to test detectFilter for a given code
const { detectFilter } = require('../src/services/detectionServiceFinal');

const code = process.argv[2] || '4881643';
const lang = process.argv[3] || 'es';

(async () => {
  try {
    const res = await detectFilter(code, lang);
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Runner error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();