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
P559000 -> HD (Donaldson oil filter) -> SKU: EL89000
AF25964 -> HD (industrial air) -> SKU: EA15964
26510380 -> HD (industrial) -> SKU: EL80380
1N0726 -> HD (Caterpillar construction) -> SKU: EL80726
1R0735 -> HD (Caterpillar fuel) -> SKU: EF90735
PATTERN: Pure numbers, alphanumeric WITHOUT dashes, Caterpillar codes
APPLICATION: Construction equipment, mining, diesel engines, heavy trucks
===============================================================
LD (Light Duty) - Automotive/Passenger Vehicles
===============================================================
REAL EXAMPLES:
15400-PLM-A01 -> LD (Honda OEM oil) -> SKU: EL8MA01
04152-YZZA6 -> LD (Toyota OEM oil) -> SKU: EL8YZZA6
90915-YZZF2 -> LD (Toyota OEM oil) -> SKU: EL8YZZF2
26300-35503 -> LD (Hyundai/Kia OEM oil) -> SKU: EL85503
HU719/7X -> LD (Mann automotive oil) -> SKU: EL8197X
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
SKU GENERATION RULES:
===============================================================
1. Oil filters -> Prefix: EL8
2. Fuel filters -> Prefix: EF9
3. Air filters -> Prefix: EA1
4. Cabin air -> Prefix: EC1
5. Hydraulic -> Prefix: EH6
6. Coolant -> Prefix: ED4
7. Water separator -> Prefix: EW7

SKU FORMAT: PREFIX + last 4-5 alphanumeric characters from original code
Examples:
- P559000 -> EL89000 (oil, last 4 digits)
- 04152-YZZA6 -> EL8YZZA6 (oil, last 5 chars)
- AF25964 -> EA15964 (air, last 4 digits)
- 1R0735 -> EF90735 (fuel, last 4 digits)
===============================================================
OUTPUT FORMAT (JSON only, no markdown):
{
  "manufacturer": "Donaldson",
  "filterType": "OIL",
  "duty": "HD",
  "elimfiltersPrefix": "EL8",
  "elimfiltersSKU": "EL89000",
  "confidence": "high"
}
IMPORTANT: 
- Always generate elimfiltersSKU using the rules above
- For marine manufacturers, include full name (Volvo Penta, Cat Marine, RACOR, SIERRA, Mercury)
- elimfiltersPrefix must match filterType (OIL=EL8, FUEL=EF9, AIR=EA1)`;
}
module.exports = { buildImprovedPrompt };
