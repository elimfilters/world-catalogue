// TEST COMPLETO - Filtros Especiales con Cross-Reference
const testCodes = [
  {
    code: 'AF55839',
    expectedType: 'CABIN',
    expectedDuty: 'HD',
    expectedPrefix: 'EC1',
    expectedSKU: 'EC10110',
    expectedCrossRef: 'P640110',
    description: 'EC1 - Cabin Air Filter HD'
  },
  {
    code: 'P781466',
    expectedType: 'AIR_DRYER',
    expectedDuty: 'HD',
    expectedPrefix: 'ED4',
    expectedSKU: 'ED41466',
    expectedCrossRef: 'P781466',
    description: 'ED4 - Air Dryer HD'
  }
];

async function testSpecialFilters() {
  console.log('🧪 TEST FILTROS ESPECIALES');
  const API_URL = 'http://localhost:3000/api/filter-search';
  
  for (const test of testCodes) {
    console.log(`\nTesting: ${test.code}`);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterCode: test.code })
    });
    const result = await response.json();
    console.log(`  Type: ${result.filterType}`);
    console.log(`  SKU: ${result.elimfiltersSKU}`);
    console.log(`  Cross-Ref: ${result.crossReferenceCode}`);
  }
}

testSpecialFilters();
