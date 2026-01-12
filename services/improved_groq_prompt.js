function buildImprovedPrompt(filterCode) {
  return `CLASSIFY FILTER: "${filterCode}"

⚠️ CRITICAL: Output ONLY "HD" or "LD" for duty field. NEVER "HD/LD".

═══════════════════════════════════════════════════════════
HD (Heavy Duty) - Construction/Industrial Equipment
═══════════════════════════════════════════════════════════
For: Diesel engines, construction equipment, heavy trucks, mining, industrial machinery

REAL HD EXAMPLES:
✓ AF25964 → HD
✓ 26510380 → HD
✓ 51970 → HD
✓ 5801364481 → HD
✓ DBC4081 → HD
✓ 84AB9150AA → HD
✓ 1N0726 (Caterpillar) → HD
✓ 1R0735 (Caterpillar) → HD
✓ 6I2503 (Caterpillar) → HD

PATTERN: Usually numeric codes, Caterpillar codes (1N, 1R, 6I), industrial part numbers

═══════════════════════════════════════════════════════════
LD (Light Duty) - Automotive/Passenger Vehicles
═══════════════════════════════════════════════════════════
For: Cars, SUVs, light trucks, gasoline engines, passenger vehicles

REAL LD EXAMPLES:
✓ 15400-PLM-A01 → LD (Honda format)
✓ 04152-YZZA1 → LD (Toyota format)
✓ 90915-YZZF2 → LD (Toyota format)
✓ 26300-35503 → LD (Hyundai/Kia format)
✓ HU719/7X → LD (Mann filter automotive)

PATTERN: OEM codes with dashes (15400-PLM-A01), Toyota 04152/90915 format, automotive brand codes

═══════════════════════════════════════════════════════════
DECISION RULES:
═══════════════════════════════════════════════════════════
1. Has dashes (15400-PLM-A01, 04152-YZZA1)? → LD (OEM automotive format)
2. Starts 04152/90915 (Toyota)? → LD
3. Starts 26300 (Hyundai/Kia)? → LD
4. Format like HU719/7X (Mann automotive)? → LD
5. Caterpillar (1N, 1R, 6I)? → HD
6. Pure numeric (26510380, 5801364481)? → HD
7. Alphanumeric no dashes (AF25964, DBC4081)? → HD

OUTPUT JSON ONLY:
{
  "manufacturer": "Honda",
  "filterType": "OIL",
  "duty": "LD",
  "elimfiltersPrefix": "EL8",
  "elimfiltersSKU": "EL8PLMA01",
  "confidence": "high"
}

⚠️ REMINDER: duty accepts ONLY "HD" or "LD". Never "HD/LD".`;
}

module.exports = { buildImprovedPrompt };
