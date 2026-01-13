function buildImprovedPrompt(filterCode, detectedManufacturer) {
  const mfg = detectedManufacturer ? `Fabricante detectado: ${detectedManufacturer.name}` : '';
  return `CLASSIFY FILTER: "${filterCode}"
${mfg}
CRITICAL: Output ONLY "HD", "LD", or identify marine manufacturers.
Marine manufacturers: RACOR, SIERRA, VOLVO PENTA, CAT MARINE, MERCURY, YAMAHA, KAWASAKI, SEA-DOO, MERCRUISER, ONAN, SUZUKI, EVINRUDE, BOMBARDIER
===============================================================
EA2 (HOUSING/CARCASA) - Air Filter Housing Assemblies
===============================================================
REAL EXAMPLES - HOUSING ASSEMBLIES:
G082527 -> EA2 (Donaldson complete housing) -> SKU: EA22527
G082525 -> EA2 (Donaldson complete housing) -> SKU: EA22525
RE504836 -> EA2 (John Deere housing assembly) -> SKU: EA24836
RE63660 -> EA2 (John Deere housing assembly) -> SKU: EA23660
P534048 -> EA2 (Donaldson cover assembly) -> SKU: EA24048

NOT EA2 - REGULAR FILTER ELEMENTS:
P828889 -> EA1 (primary air filter element)
P829333 -> EA1 (safety air filter element)

PATTERNS: G0xxxxx, RExxxxxx, P5xxxxx
KEYWORDS: housing, assembly, complete, carcasa, bowl, canister, cover
MANUFACTURERS: Donaldson, John Deere, Fleetguard

EA2 DECISION RULES:
1. Starts with G0 (like G082527) -> EA2
2. Starts with RE (like RE504836, RE63660) -> EA2  
3. Starts with P5 (like P534048) -> EA2
4. Starts with P8 (like P828889, P829333) -> EA1 (filter element, NOT housing)
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
1. Starts with G0 (G082xxx)? -> EA2 HOUSING
2. Starts with RE (RExxxxxx)? -> EA2 HOUSING
3. Starts with P5 (P5xxxxx)? -> EA2 HOUSING (cover assemblies)
4. Starts with P8 (P8xxxxx)? -> EA1 (filter element, NOT housing)
5. Volvo Penta (7 digits like 3847644)? -> Marine manufacturer: "Volvo Penta"
6. Cat Marine (XXX-XXXX like 389-0434)? -> Marine manufacturer: "Cat Marine"
7. RACOR (pure digits like 2332, RXXXX, BXXXX)? -> Marine manufacturer: "RACOR"
8. SIERRA (XX-XXXX like 18-7844)? -> Marine manufacturer: "SIERRA"
9. Mercury (XX-XXXXXXX like 35-884380T)? -> Marine manufacturer: "Mercury"
10. Has dash separator (15400-PLM-A01, 11-42-7-XXX)? -> LD
11. Starts with 04152 or 90915 (Toyota)? -> LD
12. Starts with 26300 (Hyundai/Kia)? -> LD
13. Starts with 11- or 000- (BMW/Mercedes)? -> LD
14. Aftermarket pattern (HU, W, PF, F0, L, LS + numbers)? -> LD
15. Pure numbers only (26510380)? -> HD
16. Alphanumeric no dashes (AF25964)? -> HD
17. Caterpillar pattern (1N, 1R, 6I)? -> HD
OUTPUT FORMAT (JSON only, no markdown):
{
  "manufacturer": "Donaldson",
  "filterType": "AIR",
  "duty": "HD",
  "elimfiltersPrefix": "EA2",
  "elimfiltersSKU": "EA22527",
  "elimfiltersSeries": "HOUSING",
  "confidence": "high"
}
IMPORTANT:
- EA2 gets elimfiltersSeries: "HOUSING"
- EA1 gets elimfiltersSeries: "STANDARD" or technology name
- Always generate elimfiltersSKU using last 4-5 alphanumeric characters
- For marine manufacturers, include full name
- elimfiltersPrefix must match filterType (OIL=EL8, FUEL=EF9, AIR=EA1/EA2, CABIN=EC1)
- LD includes ALL passenger vehicles: cars, SUVs, minivans, light trucks`;
}
module.exports = { buildImprovedPrompt };
