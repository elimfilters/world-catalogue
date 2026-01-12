function buildImprovedPrompt(filterCode, detectedManufacturer) {
  const mfg = detectedManufacturer ? `Fabricante detectado: ${detectedManufacturer.name}` : '';
  
  return `CLASSIFY FILTER: "${filterCode}"
${mfg}

⚠️ CRITICAL: Output ONLY "HD" or "LD" for duty. NEVER "HD/LD".

═══════════════════════════════════════════════════════════
HD (Heavy Duty) - Industrial/Construction Equipment
═══════════════════════════════════════════════════════════
REAL EXAMPLES FROM INVENTORY:
✓ AF25964 → HD (industrial)
✓ 26510380 → HD (industrial)
✓ 51970 → HD (industrial)
✓ 5801364481 → HD (industrial)
✓ DBC4081 → HD (industrial)
✓ 84AB9150AA → HD (industrial)
✓ 1N0726 → HD (Caterpillar construction)
✓ 1R0735 → HD (Caterpillar fuel)
✓ 6I2503 → HD (Caterpillar oil)

PATTERN: Pure numbers, alphanumeric WITHOUT dashes, Caterpillar codes
APPLICATION: Construction equipment, mining, diesel engines, heavy trucks

═══════════════════════════════════════════════════════════
LD (Light Duty) - Automotive/Passenger Vehicles
═══════════════════════════════════════════════════════════
REAL EXAMPLES FROM INVENTORY:
✓ 15400-PLM-A01 → LD (Honda OEM)
✓ 04152-YZZA1 → LD (Toyota OEM)
✓ 90915-YZZF2 → LD (Toyota OEM)
✓ 26300-35503 → LD (Hyundai/Kia OEM)
✓ HU719/7X → LD (Mann automotive)

PATTERN: OEM codes WITH dashes (15400-XXX-XX), Toyota 04152/90915 format
APPLICATION: Cars, SUVs, light trucks, gasoline engines, passenger vehicles

═══════════════════════════════════════════════════════════
DECISION RULES (Apply in order):
═══════════════════════════════════════════════════════════
1. Has dash separator (15400-PLM-A01, 04152-YZZA1)? → LD
2. Starts with 04152 or 90915 (Toyota format)? → LD
3. Starts with 26300 (Hyundai/Kia format)? → LD
4. Pure numbers only (26510380, 5801364481)? → HD
5. Alphanumeric no dashes (AF25964, DBC4081)? → HD
6. Caterpillar pattern (1N, 1R, 6I prefix)? → HD

OUTPUT FORMAT (JSON only, no markdown):
{
  "manufacturer": "Honda",
  "filterType": "OIL",
  "duty": "LD",
  "elimfiltersPrefix": "EL8",
  "elimfiltersSKU": "EL8PLMA01",
  "confidence": "high"
}

⚠️ FINAL REMINDER: duty field must be exactly "HD" or "LD". Never "HD/LD".`;
}

module.exports = { buildImprovedPrompt };
