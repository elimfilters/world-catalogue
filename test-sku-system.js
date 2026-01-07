require("dotenv").config();
const filterOrchestrator = require("./services/filter.orchestrator");

const testCases = [
  {
    name: "Heavy Duty - Caterpillar Oil Filter",
    code: "1R1808",
    manufacturer: "Caterpillar",
    expected_duty: "HEAVY_DUTY",
    expected_skus: ["EL84005", "EL81808", "EL87405"]
  },
  {
    name: "Heavy Duty - John Deere Oil Filter",
    code: "AT365870",
    manufacturer: "John Deere",
    expected_duty: "HEAVY_DUTY",
    expected_skus: ["EL80881", "EL81352", "EL87348"]
  },
  {
    name: "Light Duty - Ford Oil Filter",
    code: "FG-800A",
    manufacturer: "Ford",
    expected_duty: "LIGHT_DUTY",
    expected_skus: ["EL80002", "EL80008", "EL80008"]
  }
];

async function runTests() {
  console.log("🧪 SISTEMA SKU - TEST SUITE COMPLETO\n");
  console.log("=".repeat(70));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    console.log(`\n📋 TEST: ${test.name}`);
    console.log(`   Código: ${test.code}`);
    console.log(`   Fabricante: ${test.manufacturer}`);
    
    try {
      const result = await filterOrchestrator.process(
        test.code,
        test.manufacturer,
        ""
      );
      
      if (!result.success) {
        console.log(`   ❌ FAILED: ${result.error}`);
        failed++;
        continue;
      }
      
      // Verificar DUTY
      const dutyMatch = result.duty === test.expected_duty;
      
      // Verificar SKUs generados
      const generatedSkus = result.trilogy.map(t => t.sku);
      
      console.log(`\n   📦 SKUs generados:`);
      result.trilogy.forEach(t => {
        console.log(`      ${t.variant.padEnd(11)} → ${t.sku} (${t.cross_reference_code})`);
      });
      
      if (dutyMatch) {
        console.log(`\n   ✅ PASSED - DUTY: ${result.duty}`);
        console.log(`   ✅ TRILOGY generado correctamente`);
        passed++;
      } else {
        console.log(`\n   ❌ FAILED - DUTY esperado: ${test.expected_duty}, obtenido: ${result.duty}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log("\n" + "=".repeat(70));
  console.log(`\n📊 RESULTADOS: ${passed} passed, ${failed} failed`);
  console.log(`✅ Tasa de éxito: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);
}

runTests();
