function buildImprovedPrompt(filterCode) {
  return `Analyze filter code: "${filterCode}"

DUTY CLASSIFICATION (MUST be either "HD" or "LD", NEVER "HD/LD"):

HD (Heavy Duty) → Search in Donaldson:
- Diesel engines (any size)
- Construction equipment (excavators, loaders, bulldozers, graders)
- Mining equipment
- Industrial machinery
- Heavy trucks (Class 7-8)
- Heavy equipment hydraulic systems
- Agricultural tractors and harvesters

LD (Light Duty) → Search in FRAM:
- Gasoline engines
- Passenger cars
- SUVs
- Light pickup trucks (Class 1-3)
- Automotive hydraulic systems (power steering)
- Marine recreational vehicles
- Small generators

DETECTION RULES:
1. Caterpillar codes → Construction/mining → HD
2. Filter prefix analysis:
   - 1N, 1W, 7W, 9Y (oil) → Usually HD if for diesel
   - 1R, 3I, 4I, 9T (hydraulic) → HD if heavy equipment, LD if automotive
3. Check manufacturer typical application

RESPOND ONLY JSON:
{"manufacturer":"Caterpillar","tier":"OEM","duty":"HD","region":"GLOBAL","confidence":"HIGH"}

CRITICAL: duty must be "HD" or "LD" only, based on APPLICATION not just manufacturer`;
}

module.exports = { buildImprovedPrompt };
