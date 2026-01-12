// ========================================
// IMPROVED GROQ CLASSIFICATION PROMPT
// ========================================

function buildImprovedPrompt(filterCode) {
  return `You are an expert in filter part numbers across Heavy Duty (HD) and Light Duty (LD) applications.

=== CRITICAL MANUFACTURER PATTERNS ===

🔧 HEAVY DUTY (HD) OEMs:

Cummins (Engine manufacturer):
- 7 digits starting with: 13, 14, 20, 21, 29, 30, 33, 35, 38, 39, 40, 45, 50
- Examples: 1335673, 3315843, 2993018, 3309437, 1402674, 2109300
- NOT Cummins: 1067394 (starts with 10 = Metso)
- Tier: OEM | Duty: HD | Region: GLOBAL

Caterpillar (Construction/Mining):
- Format: [Number][Letter]-[4-5 digits] OR [3 digits]-[4 digits]
- Examples: 1R-0716, 2P4005, 081-2684, 3I0731, 1W2660, 4W6000
- Tier: OEM | Duty: HD | Region: GLOBAL

John Deere (Agriculture/Construction):
- Prefix: RE, AR, AT, AL, AH, DZ, SE, T, M, AM + 4-6 digits + optional letter
- Examples: RE509672, AR1205R, DZ101880, AT43634, AM125424
- Tier: OEM | Duty: HD | Region: GLOBAL

Komatsu (Construction/Mining):
- Format: [3-4 digits]-[2 digits]-[4 digits]
- Examples: 600-211-1340, 207-60-51241, YM129-01-12540
- Tier: OEM | Duty: HD | Region: GLOBAL

Volvo Construction:
- Format: VOE/EC/11/14/20/21 + 5-8 digits
- Examples: VOE11110683, EC210, 11110683, 14524170
- Tier: OEM | Duty: HD | Region: GLOBAL

Metso (Mining):
- 7 digits starting with: 10, 51, 95
- Examples: 1067394, 5123456, 9534567
- Tier: OEM | Duty: HD | Region: GLOBAL

🛠️ HEAVY DUTY (HD) AFTERMARKET - TIER 1:

Donaldson (BEST HD filters):
- P + 6 digits: P551329, P550777, P552850, P181050
- Also: DBL, X, FPG, ECC, G, B prefixes
- Tier: TIER 1 AFTERMARKET | Duty: HD | Region: GLOBAL

Fleetguard (Cummins Filtration - BEST HD):
- LF (oil): LF667, LF3478, LF16015, LF691
- FF/FS (fuel): FF5114, FS1212, FF196, FS19727
- AF (air): AF25089, AF25539, AF26389, AF25755
- HF (hydraulic): HF6205, HF35252, HF7538
- Tier: TIER 1 AFTERMARKET | Duty: HD | Region: GLOBAL

Baldwin (Premium HD):
- PA (air): PA3945, PA4938
- BF (fuel): BF984, BF825
- PT (hydraulic): PT8478, PT9283
- BT (oil): BT9382, BT8830, BT7237
- PF (oil): PF + digits
- Tier: TIER 1 AFTERMARKET | Duty: HD | Region: GLOBAL

MANN-FILTER (European HD leader):
- W/WK (oil): W950, WK950/16
- H/HU (oil): HU12140, H1275
- C/CU (air): C14200, CU22011
- Tier: TIER 1 AFTERMARKET | Duty: MIXED | Region: EUROPE

🚗 LIGHT DUTY (LD) AFTERMARKET - TIER 2:

FRAM (BEST LD - North America):
- PH (oil): PH8170, PH4005, PH3593A, PH2
- CA (air): CA9997, CA10467
- G (fuel): G3583, G6420
- XG (Extra Guard): XG7317, XG3593A
- CH/CS (cabin): CH10246, CS10246
- Tier: TIER 2 AFTERMARKET | Duty: LD | Region: NORTH AMERICA

WIX (Broad LD market):
- Pure 5 digits: 51515, 57060, 24011, 33405
- Sometimes with letters: 51515MP
- Tier: TIER 2 AFTERMARKET | Duty: MIXED | Region: GLOBAL

Purolator (North America LD):
- L (oil): L10241, L14610, L20195
- A (air): A25277, A35509
- F (fuel): F55055
- PL/PF prefixes also common
- Tier: TIER 2 AFTERMARKET | Duty: LD | Region: NORTH AMERICA

ACDelco (GM Parts - LD):
- PF (oil): PF454, PF2232, PF61
- TP (oil): TP1015
- A (air): A1522C, A3139C
- Tier: TIER 2 AFTERMARKET | Duty: LD | Region: NORTH AMERICA

Bosch (European LD):
- P (oil): P3312, P7077, P9195
- F (oil): F026407006
- 0 + 8-10 digits: 0451103336
- Tier: TIER 2 AFTERMARKET | Duty: MIXED | Region: EUROPE

🚙 LIGHT DUTY (LD) OEMs:

Toyota:
- Format: 90915-XXXXX, 04152-XXXXX, 17801-XXXXX
- Examples: 90915-YZZD2, 04152-YZZA6, 17801-21050
- Tier: OEM | Duty: LD | Region: GLOBAL

Honda:
- Format: 15400-XXX-XXX, 17220-XXX-XXX
- Examples: 15400-PLM-A02, 17220-RZA-000
- Tier: OEM | Duty: LD | Region: GLOBAL

Ford:
- Format: [E/F][Letter(s)]-XXXX[Letter]
- Examples: FL-820S, F1AZ-6731-A, E9TZ-6731-B
- Tier: OEM | Duty: LD | Region: NORTH AMERICA

GM (General Motors):
- Format: PF + 2-5 digits, or ACDelco numbers
- Examples: PF454, PF47, ACDelco PF2232
- Tier: OEM | Duty: LD | Region: NORTH AMERICA

BMW:
- Format: 11XXX XXX XXX or 13XXX XXX XXX
- Examples: 11427566327, 13327787825
- Tier: OEM | Duty: LD | Region: EUROPE

Volkswagen/Audi:
- VW Format: [03/06][Letter] XXX XXX[Letter]
- Audi Format: [06/079] XXX XXX[Letter]
- Examples: 06J115403Q, 03C115577H, 079198405A
- Tier: OEM | Duty: LD | Region: EUROPE

Subaru:
- Format: 15208XXXXX or SOAXXXXXX
- Examples: 15208AA15A, SOA427V1410
- Tier: OEM | Duty: LD | Region: ASIA-PACIFIC

Mazda:
- Format: [1/PE][XX]-XX-XXX[Letter]
- Examples: 1WPE-14-302A, PE07-14-302
- Tier: OEM | Duty: LD | Region: ASIA-PACIFIC

=== CRITICAL DECISION RULES ===

1. Check CODE PREFIX FIRST:
   - Starts with P + 6 digits? → Donaldson (HD TIER 1)
   - Starts with LF/FF/AF/HF? → Fleetguard (HD TIER 1)
   - Starts with PH/CA/G/XG? → FRAM (LD TIER 2)
   - 7 digits starting 13-50? → Check if Cummins HD
   - 7 digits starting 10/51/95? → Metso (Mining HD)
   - 5 pure digits? → WIX (LD TIER 2)
   - 90915/04152/17801-XXXXX? → Toyota (LD OEM)
   - 15400/17220-XXX-XXX? → Honda (LD OEM)

2. TIER Classification:
   - TIER 1 AFTERMARKET = Donaldson, Fleetguard, Baldwin, MANN-FILTER, MAHLE
   - TIER 2 AFTERMARKET = FRAM, WIX, Purolator, ACDelco, Bosch
   - TIER 3 AFTERMARKET = NAPA, Carquest, Champion, Hastings
   - OEM = Caterpillar, Cummins, John Deere, Komatsu, Toyota, Honda, Ford, etc.

3. DUTY Classification:
   - HD (Heavy Duty) = Construction, Mining, Agriculture, Trucking, Marine Diesel
   - LD (Light Duty) = Passenger cars, SUVs, light trucks, crossovers
   - MIXED = Some manufacturers serve both (MANN, Bosch, WIX)

4. COMMON MISTAKES TO AVOID:
   - 1335673 is CUMMINS (starts 13), NOT Metso
   - 1067394 is METSO (starts 10), NOT Cummins
   - PH8170 is FRAM LD, NOT Donaldson HD
   - 51515 is WIX (5 digits), NOT Fleetguard

=== YOUR TASK ===

Classify this filter code: "${filterCode}"

ANALYSIS STEPS:
1. What is the prefix/format?
2. Does it match any HD patterns?
3. Does it match any LD patterns?
4. What is the tier?
5. What is the confidence level?

Respond with JSON only (no markdown, no code blocks):
{"manufacturer":"Name","tier":"OEM|TIER 1 AFTERMARKET|TIER 2 AFTERMARKET|TIER 3 AFTERMARKET","duty":"HEAVY DUTY (HD)|LIGHT DUTY (LD)|MIXED","region":"NORTH AMERICA|EUROPE|ASIA-PACIFIC|GLOBAL","confidence":"HIGH|MEDIUM|LOW"}`;
}

module.exports = { buildImprovedPrompt };
