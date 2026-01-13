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
REAL EXAMPLES - OEM:
15400-PLM-A01 -> LD (Honda OEM oil) -> SKU: EL8MA01
04152-YZZA6 -> LD (Toyota OEM oil) -> SKU: EL8YZZA6
90915-YZZF2 -> LD (Toyota OEM oil) -> SKU: EL8YZZF2
26300-35503 -> LD (Hyundai/Kia OEM oil) -> SKU: EL85503
11-42-7-848-321 -> LD (BMW OEM oil) -> SKU: EL88321
000-180-29-09 -> LD (Mercedes OEM oil) -> SKU: EL82909
8200768927 -> LD (Renault OEM oil) -> SKU: EL88927
5W30-AV6-507 -> LD (Ford OEM oil) -> SKU: EL8AV6507
12605566 -> LD (Chevrolet/GM OEM oil) -> SKU: EL85566
15208-65F0A -> LD (Nissan OEM oil) -> SKU: EL865F0A
1230A046 -> LD (Mitsubishi OEM oil) -> SKU: EL8A046
16510-61A31 -> LD (Suzuki OEM oil) -> SKU: EL861A31

REAL EXAMPLES - AFTERMARKET:
HU719/7X -> LD (Mann automotive oil) -> SKU: EL8197X
W719/45 -> LD (Mann automotive oil) -> SKU: EL81945
PF48 -> LD (Purolator oil) -> SKU: EL8PF48
51515 -> LD (WIX oil) -> SKU: EL81515
F026407124 -> LD (Bosch oil) -> SKU: EL87124
L319 -> LD (Mahle oil) -> SKU: EL8L319
LS489 -> LD (Purflux oil) -> SKU: EL8S489

PATTERN: OEM codes WITH dashes (15400-XXX, 11-42-7-XXX, 000-XXX-XX), Aftermarket alphanumeric codes
APPLICATION: Cars, SUVs, light trucks, gasoline engines, passenger vehicles, minivans
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
6. Has dash separator (15400-PLM-A01, 11-42-7-XXX)? -> LD
7. Starts with 04152 or 90915 (Toyota)? -> LD
8. Starts with 26300 (Hyundai/Kia)? -> LD
9. Starts with 11- or 000- (BMW/Mercedes)? -> LD
10. Aftermarket pattern (HU, W, PF, F0, L, LS + numbers)? -> LD
11. Pure numbers only (26510380)? -> HD
12. Alphanumeric no dashes (AF25964)? -> HD
13. Caterpillar pattern (1N, 1R, 6I)? -> HD
OUTPUT FORMAT (JSON only, no markdown):
{
  "manufacturer": "BMW",
  "filterType": "OIL",
  "duty": "LD",
  "elimfiltersPrefix": "EL8",
  "elimfiltersSKU": "EL88321",
  "confidence": "high"
}
IMPORTANT: 
- Always generate elimfiltersSKU using last 4-5 alphanumeric characters
- For marine manufacturers, include full name
- elimfiltersPrefix must match filterType (OIL=EL8, FUEL=EF9, AIR=EA1, CABIN=EC1)
- LD includes ALL passenger vehicles: cars, SUVs, minivans, light trucks`;
}
module.exports = { buildImprovedPrompt };
