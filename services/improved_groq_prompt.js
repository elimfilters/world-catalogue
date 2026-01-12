function buildImprovedPrompt(filterCode, detectedManufacturer) {
  const mfg = detectedManufacturer ? `Fabricante detectado: ${detectedManufacturer.name}` : '';
  return `CLASSIFY FILTER: "${filterCode}"
${mfg}
CRITICAL: Output ONLY "HD", "LD", or identify marine manufacturers.
Marine manufacturers: RACOR, SIERRA, VOLVO PENTA, CAT MARINE, MERCURY, YAMAHA, KAWASAKI, SEA-DOO, MERCRUISER, ONAN, SUZUKI, EVINRUDE, BOMBARDIER
===============================================================
HD (Heavy Duty) - Industrial/Construction Equipment
===============================================================
REAL EXAMPLES:
AF25964 -> HD (industrial)
26510380 -> HD (industrial)
1N0726 -> HD (Caterpillar construction)
1R0735 -> HD (Caterpillar fuel)
6I2503 -> HD (Caterpillar oil)
PATTERN: Pure numbers, alphanumeric WITHOUT dashes, Caterpillar codes
APPLICATION: Construction equipment, mining, diesel engines, heavy trucks
===============================================================
LD (Light Duty) - Automotive/Passenger Vehicles
===============================================================
REAL EXAMPLES:
15400-PLM-A01 -> LD (Honda OEM)
04152-YZZA1 -> LD (Toyota OEM)
90915-YZZF2 -> LD (Toyota OEM)
26300-35503 -> LD (Hyundai/Kia OEM)
HU719/7X -> LD (Mann automotive)
PATTERN: OEM codes WITH dashes (15400-XXX-XX), Toyota 04152/90915 format
APPLICATION: Cars, SUVs, light trucks, gasoline engines, passenger vehicles
===============================================================
MARINE FILTERS - Marine/Jetski/Boat Engines
===============================================================
REAL EXAMPLES:
3847644 -> MARINE (Volvo Penta)
389-0434 -> MARINE (Cat Marine)
2332 -> MARINE (RACOR)
18-7844 -> MARINE (SIERRA)
35-884380T -> MARINE (Mercury)
MANUFACTURERS: RACOR, PARKER, SIERRA, VOLVO PENTA, CAT MARINE, MERCURY, YAMAHA, KAWASAKI, SEA-DOO, MERCRUISER, ONAN, SUZUKI, EVINRUDE, BOMBARDIER
APPLICATION: Marine diesel, outboard motors, jetski, boat engines
===============================================================
DECISION RULES (Apply in order):
===============================================================
1. Volvo Penta (7 digits like 3847644)? -> Marine manufacturer: "Volvo Penta"
2. Cat Marine (XXX-XXXX like 389-0434)? -> Marine manufacturer: "Cat Marine"  
3. RACOR (pure digits like 2332, RXXXX, BXXXX)? -> Marine manufacturer: "RACOR"
4. SIERRA (XX-XXXX like 18-7844)? -> Marine manufacturer: "SIERRA"
5. Mercury (XX-XXXXXXX like 35-884380T)? -> Marine manufacturer: "Mercury"
6. Has dash separator (15400-PLM-A01)? -> LD
7. Starts with 04152 or 90915 (Toyota)? -> LD
8. Starts with 26300 (Hyundai/Kia)? -> LD
9. Pure numbers only (26510380)? -> HD
10. Alphanumeric no dashes (AF25964)? -> HD
11. Caterpillar pattern (1N, 1R, 6I)? -> HD
OUTPUT FORMAT (JSON only, no markdown):
{
  "manufacturer": "Volvo Penta",
  "filterType": "OIL",
  "duty": "HD",
  "elimfiltersPrefix": "EL8",
  "elimfiltersSKU": "EL87644",
  "confidence": "high"
}
IMPORTANT: If marine manufacturer detected, include full manufacturer name (Volvo Penta, Cat Marine, RACOR, SIERRA, Mercury, etc.)`;
}
module.exports = { buildImprovedPrompt };
