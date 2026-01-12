function buildImprovedPrompt(filterCode) {
  return `Analyze filter code: "${filterCode}"

DUTY CLASSIFICATION (MUST be either "HD" or "LD", NEVER "HD/LD"):

HD (Heavy Duty) → Equipment for construction, mining, diesel engines:
  - Construction equipment (excavators, loaders, bulldozers, graders)
  - Mining equipment
  - Heavy trucks (Class 7-8)
  - Diesel engines (any size)
  - Agricultural tractors and harvesters
  - Industrial machinery
  
  HD EXAMPLES:
  ✓ 1N0726 (Caterpillar) → OIL → HD (diesel construction equipment)
  ✓ 1R0735 (Caterpillar) → FUEL → HD (diesel engine)
  ✓ 1R0750 (Caterpillar) → FUEL → HD (heavy machinery)
  ✓ 6I2503 (Caterpillar) → OIL → HD (diesel equipment)

LD (Light Duty) → Automotive, gasoline engines, light vehicles:
  - Passenger cars
  - SUVs
  - Light pickup trucks (Class 1-3)
  - Gasoline engines
  - Marine recreational vehicles
  - Small generators
  - Automotive applications
  
  LD EXAMPLES:
  ✓ HF6177 (Fleetguard) → OIL → LD (automotive oil filter)
  ✓ 02/100100 → OIL → LD (automotive application)
  ✓ PH8A (Fram) → OIL → LD (passenger car)
  ✓ 51515 (Wix) → OIL → LD (automotive)
  ✓ P550588 (Donaldson) → FUEL → LD (light vehicle)

CRITICAL RULES:
1. Caterpillar codes (1N, 1R, 6I, etc.) → ALWAYS HD (construction/mining equipment)
2. Fleetguard HF prefix → Usually LD (automotive)
3. Generic numeric codes → Check application, default LD if automotive
4. If uncertain between HD/LD → Use application context, NOT just manufacturer

RESPOND ONLY JSON:
{"manufacturer":"Fleetguard","filterType":"OIL","duty":"LD","elimfiltersPrefix":"EL8","elimfiltersSKU":"EL86177","confidence":"high"}

CRITICAL: duty must be "HD" or "LD" only, based on APPLICATION not just manufacturer`;
}

module.exports = { buildImprovedPrompt };
