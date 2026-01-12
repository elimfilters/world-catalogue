function buildImprovedPrompt(filterCode) {
  return `Analyze this filter code: "${filterCode}"

CRITICAL CLASSIFICATION RULES:

1. DUTY MUST BE EITHER "HD" OR "LD" - NEVER "HD/LD"

2. HD (Heavy Duty) - Search in Donaldson:
   - Diesel engines (trucks, construction, mining, industrial)
   - Hydraulic systems in HEAVY EQUIPMENT (excavators, loaders, dozers)
   - Caterpillar hydraulic filters → HD
   - Examples: 1N0726, 1R0735, 1R0750, P550162, HF6555

3. LD (Light Duty) - Search in FRAM:
   - Gasoline engines (cars, SUVs, light pickups)
   - Small hydraulic systems (automotive power steering)
   - Examples: CH10358, PH3593A, XG7317

4. CATERPILLAR FILTER PREFIXES:
   - 1N, 1W, 7W, 9Y → OIL → HD
   - 1R, 3I, 4I, 9T → HYDRAULIC → HD (heavy equipment hydraulics)
   - All Caterpillar → HD (construction/mining equipment)

5. MANUFACTURER DETECTION:
   - Caterpillar/CAT → OEM → HD → GLOBAL
   - Donaldson → TIER 1 AFTERMARKET → HD
   - FRAM → TIER 1 AFTERMARKET → LD

RESPOND ONLY WITH JSON:
{
  "manufacturer": "Caterpillar",
  "tier": "OEM",
  "duty": "HD",
  "region": "GLOBAL",
  "confidence": "HIGH"
}

REMEMBER: 
- duty must be "HD" or "LD", NEVER "HD/LD"
- All Caterpillar filters → HD
- Hydraulic filters in heavy equipment → HD`;
}

module.exports = { buildImprovedPrompt };
