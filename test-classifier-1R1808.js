require('dotenv').config();
const classifier = require('./services/classifier.service');

async function test() {
  try {
    const result = await classifier.processFilter('1R1808');
    console.log('='.repeat(60));
    console.log('RESULTADO FINAL:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
}

test();
