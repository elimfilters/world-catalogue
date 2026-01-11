const Groq = require('groq-sdk');
const FilterClassification = require('../models/FilterClassification');

class ClassifierService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // TOP 10 FABRICANTES POR INDUSTRIA - HEAVY DUTY
    this.patterns = {
      // ============================================
      // 1. CONSTRUCTION & HEAVY EQUIPMENT (Top 10)
      // ============================================
      caterpillar: /^[1-9][A-Z]\d{4,5}$/i,  // 1R1808, 2P4005, 3I1234
      komatsu: /^(600[0-9]|207|421|YM129|6[0-9]{3})-\d{2}-\d{4}$/i,  // 6003-11-5230
      johnDeere: /^(RE|AR|AT|AL|AH|DZ|SE|T|M|AM)\d{4,6}$/i,  // RE59754, AR86745
      volvo: /^(VOE|EC|11|14|21)\d{5,8}$/i,  // VOE11110283, EC210
      hitachi: /^4\d{6,8}$/i,  // 4210224, 4616544
      liebherr: /^(10|71|94|563)\d{5,7}$/i,  // 10289138, 7110889
      doosan: /^(400|DX)\d{5,7}$/i,  // 400504-00048, DX225
      hyundai: /^(11|31|39)[A-Z0-9]{6,8}$/i,  // 11N6-90030, 31E9-0126
      kobelco: /^(YN|LP|PJ)\d{5,8}$/i,  // YN21P00037R100
      caseIH: /^(87|84|47|CNH)\d{5,8}$/i,  // 87356545, 84477352

      // ============================================
      // 2. MINING (Top 10)
      // ============================================
      catMining: /^(1|2|3|4|5|6|7|8|9)[A-Z]\d{4}$/i,  // Same as CAT construction
      komatsuMining: /^(600|418|419|421|207)-\d{2}-\d{4}$/i,
      sandvik: /^55\d{5,7}$/i,  // 55105039
      epiroc: /^(30|32|35|55)\d{5,7}$/i,  // 3222332081
      liebherrMining: /^(10|71|562|563)\d{5,7}$/i,
      hitachiMining: /^(4|EX)\d{6,8}$/i,  // 4616544, EX5600
      belaz: /^(540|549|75)\d{5,7}$/i,  // Belarus mining trucks
      terex: /^(15|23)\d{6,8}$/i,  // 15266607
      atlascopco: /^(16|28|38)\d{5,7}$/i,  // 1625752500
      metso: /^(10|51|95)\d{5,7}$/i,  // Mining crushers
      
      // ============================================
      // 3. AGRICULTURE (Top 10)
      // ============================================
      johnDeereAg: /^(RE|AR|AT|AL|AH|DZ)\d{4,6}$/i,  // Same pattern
      caseIHAg: /^(87|84|47|CNH|C)\d{5,8}$/i,  // 87356545
      newHolland: /^(87|84|47|CNH|NH)\d{5,8}$/i,  // 87840591
      agco: /^(V|700|836)\d{6,8}$/i,  // V836862549, AGCO brands
      kubota: /^(15|16|17|19|32|35|70)\d{3}-\d{5}$/i,  // 15521-43560
      claas: /^(00|60|61|62|63)\d{5,8}$/i,  // 0011318230, 6005028339
      masseyferguson: /^(V|700|836|1)\d{6,8}$/i,  // V836862549, MF = AGCO
      fendt: /^(F|X)\d{6,8}$/i,  // F916200060010, Fendt = AGCO
      mahindra: /^(05|006)\d{6,8}$/i,  // 005558127R1
      deutzfahr: /^(01|04)\d{6,8}$/i,  // 04199449, SDF Group

      // ============================================
      // 4. TRANSPORTATION & TRUCKING (Top 10)
      // ============================================
      freightliner: /^(A06|A05|A04|23)\d{5,8}$/i,  // A0652329, Daimler
      kenworth: /^(K|P)\d{5,8}$/i,  // K370-3026, PACCAR
      peterbilt: /^(P|Q)\d{5,8}$/i,  // P27-1010, PACCAR
      mack: /^(2\d{7}|485GB)$/i,  // 25099340, 485GB3191M
      volvoTrucks: /^(21|85|20)\d{6,8}$/i,  // 21707133, 85108176
      internationalTrucks: /^(20|30)\d{6,8}$/i,  // 2004685C91, Navistar
      scaniatrucks: /^(14|15|16|17|21|23)\d{5,8}$/i,  // 1736251, 2355086
      daf: /^(13|14|15|16)\d{5,8}$/i,  // 1643070, PACCAR
      mercedezbenz: /^(A|000|457|541|906|651)\d{6,9}$/i,  // A0001420125
      mantrucks: /^(51|81)\d{6,8}$/i,  // 51055040127

      // ============================================
      // 5. MARINE (Top 10)
      // ============================================
      cumminsMarine: /^\d{7}$/,  // 3315115 (7 digits)
      catMarine: /^[1-9][A-Z]\d{4}$/i,  // Same as CAT
      mtu: /^(X|5)\d{8,10}$/i,  // X00012345, 5360900002
      volvoPenta: /^(85|11|21)\d{6,8}$/i,  // 8504403
      yanmar: /^(12|41|11)\d{4}-\d{5}$/i,  // 119305-55610, 129574-55630
      detroitDiesel: /^(23|A0)\d{6,8}$/i,  // 23530645, A0000902251
      mercuryMarine: /^(35|8M)\d{6,8}$/i,  // 35-802885Q, 8M0065103
      suzukiMarine: /^(16|17|18)\d{3}-\d{5}$/i,  // 16510-61A21
      hondaMarine: /^(15|16|17)\d{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/i,  // 15400-PFB-004
      perkins: /^(26|CH|SE|CV)\d{5,8}$/i,  // 26560201, CH10929

      // ============================================
      // 6. POWER GENERATION (Top 10)
      // ============================================
      catPowerGen: /^[1-9][A-Z]\d{4}$/i,  // Same CAT pattern
      cumminsPowerGen: /^\d{7}$/,  // 3315115
      kohler: /^(25|ED|GM)\d{5,8}$/i,  // 2504303-S, ED0043902860-S
      mtuPowerGen: /^(X|5)\d{8,10}$/i,  // X00027830003
      detroitDieselGen: /^(23|A0)\d{6,8}$/i,  // 23530645
      generac: /^(0[A-Z]|G)\d{6,9}$/i,  // 0G8478A, G0737740147
      perkinsGen: /^(26|CH|SE|CV)\d{5,8}$/i,  // 2654403
      volvoGen: /^(21|85|20)\d{6,8}$/i,  // 21707133
      doosanGen: /^(400|DX)\d{5,7}$/i,  // 400508-00002
      fgWilson: /^(10|91)\d{6,8}$/i,  // 10000-51229, Caterpillar owned

      // ============================================
      // 7. OIL & GAS (Top 10)
      // ============================================
      catOilGas: /^[1-9][A-Z]\d{4}$/i,  // Heavy equipment
      cumminsOilGas: /^\d{7}$/,
      waukesha: /^(10|20|30)\d{5,7}$/i,  // 100009933, GE Waukesha
      ge: /^(30|60|10)\d{7,9}$/i,  // GE Oil & Gas
      cameronSlb: /^(10|30)\d{6,8}$/i,  // Cameron/Schlumberger
      weatherford: /^(30|40)\d{6,8}$/i,
      halliburton: /^(10|20)\d{6,8}$/i,
      bakerhughes: /^(50|60)\d{6,8}$/i,
      nationaloilwell: /^(10|20)\d{6,8}$/i,
      dresser: /^(10|30)\d{6,8}$/i,  // GE Dresser

      // ============================================
      // 8. FORESTRY (Top 10)
      // ============================================
      johnDeereForestry: /^(RE|AT|AL|T)\d{4,6}$/i,
      catForestry: /^[1-9][A-Z]\d{4}$/i,
      komatsuForestry: /^(600|418)\d{2}-\d{2}-\d{4}$/i,
      tigercat: /^(TG|500)\d{5,7}$/i,  // TG50025, 5000012
      ponsse: /^(05|06|0)\d{6,8}$/i,  // 0581863
      valmet: /^(836|700)\d{6,8}$/i,  // Valmet/AGCO
      rottne: /^(RO|80)\d{6,8}$/i,
      hsm: /^(90|91)\d{6,8}$/i,  // HSM Hohenloher
      waratah: /^(WA|60)\d{6,8}$/i,  // John Deere owned
      timberpro: /^(TP|70)\d{6,8}$/i,

      // ============================================
      // 9. MATERIAL HANDLING (Top 10)
      // ============================================
      toyota: /^(90915|04152|17801)-[A-Z0-9]{5}$/i,  // 90915-YZZD4
      crown: /^(CR|10)\d{6,8}$/i,
      yale: /^(58|90)\d{6,8}$/i,  // Hyster-Yale
      hyster: /^(13|32|33|34)\d{5,8}$/i,  // 1327093, 3266605
      jungheinrich: /^(50|51)\d{6,8}$/i,
      linde: /^(35|70|00)\d{6,8}$/i,  // 0009831369, KION Group
      catLift: /^[1-9][A-Z]\d{4}$/i,  // CAT lift trucks
      mitsubishi: /^(32|91)\d{5,8}$/i,  // 32A62-00300
      nissan: /^(16|AY)\d{3}-[A-Z0-9]{5}$/i,  // 16546-FU400
      clarklift: /^(92|93)\d{6,8}$/i,

      // ============================================
      // 10. TIER 1, 2, 3 AFTERMARKET (Top 15+)
      // ============================================
      
      // TIER 1 - Premium Aftermarket
      donaldson: /^(P|DBL|X|FPG|ECC|G|B)\d{4,7}$/i,  // P551329, DBL7405
      fleetguard: /^(FF|FS|LF|AF|WF|HF|CV|FH)\d{4,5}$/i,  // LF3594, FF5320
      baldwin: /^(PA|BF|PT|BT|PF|B)\d{4,5}$/i,  // PA2835, BF7587
      mannFilter: /^(W|WK|H|HU|C|CU)\d{3,5}[\/\-]?\d{0,3}$/i,  // W962/2, HU718/5X
      mahle: /^(OC|OX|LX|KX)\d{3,5}[A-Z]?$/i,  // OC205, LX1780D
      
      // TIER 2 - Mid-Range Aftermarket
      fram: /^(PH|CA|G|C|CH|CS|XG)\d{4,5}[A-Z]?$/i,  // PH8A, CA10467
      wix: /^\d{5}[A-Z]{0,2}$/,  // 51334, 57145WIX
      purolator: /^[A-Z]\d{5}$/i,  // L30001, A35394
      acdelco: /^(PF|TP|A)\d{3,5}[A-Z]?$/i,  // PF52, TP1226
      bosch: /^(F|P)\d{5,7}[A-Z]?$/i,  // F026407006

      // TIER 3 - Economy Aftermarket
      hastings: /^(LF|AF)\d{3,4}$/i,  // LF495
      partsMaster: /^(PM|67)\d{4,6}$/i,
      champion: /^(CH|X)\d{4,6}$/i,
      napa: /^(1|2|3|4|7|8|9)\d{4}$/i,  // 1515, 7045
      carquest: /^(84|85|86)\d{3,5}$/i,  // 85631

      // LIGHT DUTY OEMs
      ford: /^[EF][A-Z0-9]{1,2}-\d{4,5}[A-Z]?$/i,  // F1TZ-6714-A, E7TZ-9601-A
      toyotaLD: /^(90915|04152|17801)-[A-Z0-9]{5}$/i,  // 90915-YZZD4
      honda: /^(15400|17220)-[A-Z0-9]{3}-[A-Z0-9]{3}$/i,  // 15400-PLM-A02
      bmw: /^(11|13)\d{3} \d{3} \d{3}$/i,  // 11 42 7 508 969
      mercedesBenzLD: /^(000|651|642)\d{3} \d{2} \d{2}$/i,  // 000 180 00 09
      chevrolet: /^(ACDelco |GM )?(PF|TP)\d{3,5}$/i,  // PF61E, GM 19210283
      nissan: /^(16|AY)\d{3}-[A-Z0-9]{5}$/i,  // 16546-FU400
      volkswagen: /^(03|06)[A-Z] \d{3} \d{3}[A-Z]?$/i,  // 03C 115 561 H
      audi: /^(06|079) \d{3} \d{3}[A-Z]?$/i,  // 079 198 405 A
      subaru: /^(15208|SOA)\d{5}[A-Z]{2}\d{3}$/i  // 15208AA15A
    };

    // Manufacturer database with metadata
    this.manufacturers = {
      // CONSTRUCTION & HEAVY EQUIPMENT
      caterpillar: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Construction & Mining' },
      komatsu: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Construction & Mining' },
      johnDeere: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Agriculture & Construction' },
      volvo: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Construction & Trucks' },
      hitachi: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC', industry: 'Construction' },
      liebherr: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Construction & Mining' },
      doosan: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC', industry: 'Construction' },
      hyundai: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC', industry: 'Construction' },
      kobelco: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC', industry: 'Construction' },
      caseIH: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Agriculture & Construction' },

      // MINING
      catMining: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Mining' },
      komatsuMining: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Mining' },
      sandvik: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Mining' },
      epiroc: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Mining' },
      liebherrMining: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Mining' },
      hitachiMining: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Mining' },
      belaz: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Mining' },
      terex: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Mining & Construction' },
      atlascopco: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Mining & Construction' },
      metso: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Mining' },

      // AGRICULTURE
      johnDeereAg: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Agriculture' },
      caseIHAg: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Agriculture' },
      newHolland: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Agriculture' },
      agco: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Agriculture' },
      kubota: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Agriculture' },
      claas: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Agriculture' },
      masseyferguson: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Agriculture' },
      fendt: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Agriculture' },
      mahindra: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA', industry: 'Agriculture' },
      deutzfahr: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Agriculture' },

      // TRANSPORTATION & TRUCKING
      freightliner: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Trucking' },
      kenworth: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Trucking' },
      peterbilt: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Trucking' },
      mack: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Trucking' },
      volvoTrucks: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Trucking' },
      internationalTrucks: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Trucking' },
      scaniatrucks: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Trucking' },
      daf: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Trucking' },
      mercedezbenz: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL', industry: 'Trucking & Automotive' },
      mantrucks: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Trucking' },

      // MARINE
      cumminsMarine: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Marine' },
      catMarine: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Marine' },
      mtu: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Marine & Power Gen' },
      volvoPenta: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL', industry: 'Marine' },
      yanmar: { tier: 'OEM', duty: 'MIXED', region: 'ASIA-PACIFIC', industry: 'Marine & Agriculture' },
      detroitDiesel: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Marine & Trucking' },
      mercuryMarine: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA', industry: 'Marine' },
      suzukiMarine: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'ASIA-PACIFIC', industry: 'Marine' },
      hondaMarine: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'GLOBAL', industry: 'Marine' },
      perkins: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Marine & Power Gen' },

      // POWER GENERATION
      catPowerGen: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Power Generation' },
      cumminsPowerGen: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Power Generation' },
      kohler: { tier: 'OEM', duty: 'MIXED', region: 'NORTH AMERICA', industry: 'Power Generation' },
      mtuPowerGen: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Power Generation' },
      detroitDieselGen: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Power Generation' },
      generac: { tier: 'OEM', duty: 'MIXED', region: 'NORTH AMERICA', industry: 'Power Generation' },
      perkinsGen: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Power Generation' },
      volvoGen: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Power Generation' },
      doosanGen: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC', industry: 'Power Generation' },
      fgWilson: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Power Generation' },

      // OIL & GAS
      catOilGas: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      cumminsOilGas: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      waukesha: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      ge: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      cameronSlb: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      weatherford: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      halliburton: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      bakerhughes: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      nationaloilwell: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },
      dresser: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Oil & Gas' },

      // FORESTRY
      johnDeereForestry: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Forestry' },
      catForestry: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Forestry' },
      komatsuForestry: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Forestry' },
      tigercat: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Forestry' },
      ponsse: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Forestry' },
      valmet: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Forestry' },
      rottne: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Forestry' },
      hsm: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE', industry: 'Forestry' },
      waratah: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Forestry' },
      timberpro: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA', industry: 'Forestry' },

      // MATERIAL HANDLING
      toyota: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'GLOBAL', industry: 'Material Handling' },
      crown: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL', industry: 'Material Handling' },
      yale: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL', industry: 'Material Handling' },
      hyster: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL', industry: 'Material Handling' },
      jungheinrich: { tier: 'OEM', duty: 'MIXED', region: 'EUROPE', industry: 'Material Handling' },
      linde: { tier: 'OEM', duty: 'MIXED', region: 'EUROPE', industry: 'Material Handling' },
      catLift: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL', industry: 'Material Handling' },
      mitsubishi
