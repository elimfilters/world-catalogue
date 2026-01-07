require("dotenv").config();
const skuGenerator = require("./services/sku.generator");

console.log("🧪 TEST: SKU DIRECTO (sin cross-reference)\n");
console.log("=".repeat(60));

// Test 1: Código con suficientes dígitos
console.log("\n📋 TEST 1: Código OEM con números");
const test1 = skuGenerator.generateDirect("XYZ-12345", "OIL", "STANDARD");
console.log(`Input: XYZ-12345`);
console.log(`SKU generado: ${test1.sku}`);
console.log(`Source: ${test1.source}`);

// Test 2: Código corto
console.log("\n📋 TEST 2: Código corto");
const test2 = skuGenerator.generateDirect("AB-89", "AIR", "PERFORMANCE");
console.log(`Input: AB-89`);
console.log(`SKU generado: ${test2.sku}`);

// Test 3: TRILOGY completo directo
console.log("\n📋 TEST 3: TRILOGY DIRECTO");
const trilogy = skuGenerator.generateDirectTrilogy("ABC-7890", "FUEL");
console.log(`Input: ABC-7890`);
trilogy.forEach(t => {
  console.log(`  ${t.variant.padEnd(11)} → ${t.sku}`);
});

console.log("\n" + "=".repeat(60));
console.log("✅ Tests completados\n");
