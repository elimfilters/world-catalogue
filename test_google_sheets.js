/**
 * Test Script - Google Sheets Integration
 * Prueba el flujo completo de procesamiento y escritura
 */

const googleSheetWriter = require('./src/services/googleSheetWriter');

const testCodes = [
  'P552100',
  'LF3620',
  '23518480',
  'PH7405',
  'B495'
];

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTING GOOGLE SHEETS INTEGRATION');
  console.log('='.repeat(70));

  const results = {
    success: [],
    failed: [],
    alreadyExists: []
  };

  for (const code of testCodes) {
    try {
      console.log(\n📝 Testing code: );
      console.log('-'.repeat(70));

      const result = await googleSheetWriter.processAndWrite(code);

      if (result.success) {
        if (result.alreadyExists) {
          results.alreadyExists.push({
            code,
            sku: result.sku
          });
          console.log(⚠️   → SKU  already exists);
        } else {
          results.success.push({
            code,
            sku: result.sku,
            family: result.detectionResult.family,
            duty: result.detectionResult.duty
          });
          console.log(✅  → SKU  written successfully);
        }
      } else {
        results.failed.push({
          code,
          reason: result.reason || result.message
        });
        console.log(❌  → Failed: );
      }

    } catch (error) {
      results.failed.push({
        code,
        error: error.message
      });
      console.log(❌  → Error: );
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(✅ Success: );
  console.log(⚠️  Already Exists: );
  console.log(❌ Failed: );
  console.log(📝 Total: );

  if (results.success.length > 0) {
    console.log('\n✅ Successful Writes:');
    results.success.forEach(r => {
      console.log(    →  (, ));
    });
  }

  if (results.alreadyExists.length > 0) {
    console.log('\n⚠️  Already Existed:');
    results.alreadyExists.forEach(r => {
      console.log(    → );
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed:');
    results.failed.forEach(r => {
      console.log(    → );
    });
  }

  console.log('\n' + '='.repeat(70));
}

runTests().catch(error => {
  console.error('\n💥 TEST SCRIPT ERROR:', error);
  process.exit(1);
});
