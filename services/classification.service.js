const Groq = require('groq-sdk');
const FilterClassification = require('../models/FilterClassification');

class ClassifierService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // TOP 100+ FABRICANTES - TODAS LAS INDUSTRIAS
    this.patterns = {
      // === CONSTRUCTION & HEAVY EQUIPMENT (10) ===
      caterpillar: /^[1-9][A-Z]\d{4,5}$/i,
      komatsu: /^(600[0-9]|207|421|YM129|6[0-9]{3})-\d{2}-\d{4}$/i,
      johnDeere: /^(RE|AR|AT|AL|AH|DZ|SE|T|M|AM)\d{4,6}$/i,
      volvo: /^(VOE|EC|11|14|21)\d{5,8}$/i,
      hitachi: /^4\d{6,8}$/i,
      liebherr: /^(10|71|94|563)\d{5,7}$/i,
      doosan: /^(400|DX)\d{5,7}$/i,
      hyundai: /^(11|31|39)[A-Z0-9]{6,8}$/i,
      kobelco: /^(YN|LP|PJ)\d{5,8}$/i,
      caseIH: /^(87|84|47|CNH)\d{5,8}$/i,

      // === MINING (10) ===
      sandvik: /^55\d{5,7}$/i,
      epiroc: /^(30|32|35|55)\d{5,7}$/i,
      belaz: /^(540|549|75)\d{5,7}$/i,
      terex: /^(15|23)\d{6,8}$/i,
      atlascopco: /^(16|28|38)\d{5,7}$/i,
      metso: /^(10|51|95)\d{5,7}$/i,

      // === AGRICULTURE (10) ===
      newHolland: /^(87|84|47|CNH|NH)\d{5,8}$/i,
      agco: /^(V|700|836)\d{6,8}$/i,
      kubota: /^(15|16|17|19|32|35|70)\d{3}-\d{5}$/i,
      claas: /^(00|60|61|62|63)\d{5,8}$/i,
      masseyferguson: /^(V|700|836|1)\d{6,8}$/i,
      fendt: /^(F|X)\d{6,8}$/i,
      mahindra: /^(05|006)\d{6,8}$/i,
      deutzfahr: /^(01|04)\d{6,8}$/i,

      // === TRANSPORTATION & TRUCKING (10) ===
      freightliner: /^(A06|A05|A04|23)\d{5,8}$/i,
      kenworth: /^(K|P)\d{5,8}$/i,
      peterbilt: /^(P|Q)\d{5,8}$/i,
      mack: /^(2\d{7}|485GB)$/i,
      volvoTrucks: /^(21|85|20)\d{6,8}$/i,
      international: /^(20|30)\d{6,8}$/i,
      scania: /^(14|15|16|17|21|23)\d{5,8}$/i,
      daf: /^(13|14|15|16)\d{5,8}$/i,
      mercedes: /^(A|000|457|541|906|651)\d{6,9}$/i,
      man: /^(51|81)\d{6,8}$/i,

      // === MARINE (10) ===
      cummins: /^\d{7}$/,
      mtu: /^(X|5)\d{8,10}$/i,
      volvoPenta: /^(85|11|21)\d{6,8}$/i,
      yanmar: /^(12|41|11)\d{4}-\d{5}$/i,
      detroitDiesel: /^(23|A0)\d{6,8}$/i,
      mercuryMarine: /^(35|8M)\d{6,8}$/i,
      suzukiMarine: /^(16|17|18)\d{3}-\d{5}$/i,
      perkins: /^(26|CH|SE|CV)\d{5,8}$/i,

      // === POWER GENERATION (10) ===
      kohler: /^(25|ED|GM)\d{5,8}$/i,
      generac: /^(0[A-Z]|G)\d{6,9}$/i,
      fgWilson: /^(10|91)\d{6,8}$/i,

      // === OIL & GAS (10) ===
      waukesha: /^(10|20|30)\d{5,7}$/i,
      ge: /^(30|60|10)\d{7,9}$/i,
      cameronSlb: /^(10|30)\d{6,8}$/i,
      weatherford: /^(30|40)\d{6,8}$/i,
      halliburton: /^(10|20)\d{6,8}$/i,
      bakerhughes: /^(50|60)\d{6,8}$/i,
      nationaloilwell: /^(10|20)\d{6,8}$/i,
      dresser: /^(10|30)\d{6,8}$/i,

      // === FORESTRY (10) ===
      tigercat: /^(TG|500)\d{5,7}$/i,
      ponsse: /^(05|06|0)\d{6,8}$/i,
      valmet: /^(836|700)\d{6,8}$/i,
      rottne: /^(RO|80)\d{6,8}$/i,
      hsm: /^(90|91)\d{6,8}$/i,
      waratah: /^(WA|60)\d{6,8}$/i,
      timberpro: /^(TP|70)\d{6,8}$/i,

      // === MATERIAL HANDLING (10) ===
      crown: /^(CR|10)\d{6,8}$/i,
      yale: /^(58|90)\d{6,8}$/i,
      hyster: /^(13|32|33|34)\d{5,8}$/i,
      jungheinrich: /^(50|51)\d{6,8}$/i,
      linde: /^(35|70|00)\d{6,8}$/i,
      mitsubishi: /^(32|91)\d{5,8}$/i,
      nissan: /^(16|AY)\d{3}-[A-Z0-9]{5}$/i,
      clarklift: /^(92|93)\d{6,8}$/i,

      // === TIER 1 AFTERMARKET (5) ===
      donaldson: /^(P|DBL|X|FPG|ECC|G|B)\d{4,7}$/i,
      fleetguard: /^(FF|FS|LF|AF|WF|HF|CV|FH)\d{4,5}$/i,
      baldwin: /^(PA|BF|PT|BT|PF|B)\d{4,5}$/i,
      mannFilter: /^(W|WK|H|HU|C|CU)\d{3,5}[\/\-]?\d{0,3}$/i,
      mahle: /^(OC|OX|LX|KX)\d{3,5}[A-Z]?$/i,

      // === TIER 2 AFTERMARKET (5) ===
      fram: /^(PH|CA|G|C|CH|CS|XG)\d{4,5}[A-Z]?$/i,
      wix: /^\d{5}[A-Z]{0,2}$/,
      purolator: /^[A-Z]\d{5}$/i,
      acdelco: /^(PF|TP|A)\d{3,5}[A-Z]?$/i,
      bosch: /^(F|P)\d{5,7}[A-Z]?$/i,

      // === TIER 3 AFTERMARKET (5) ===
      hastings: /^(LF|AF)\d{3,4}$/i,
      partsMaster: /^(PM|67)\d{4,6}$/i,
      champion: /^(CH|X)\d{4,6}$/i,
      napa: /^(1|2|3|4|7|8|9)\d{4}$/i,
      carquest: /^(84|85|86)\d{3,5}$/i,

      // === LIGHT DUTY OEMs (10) ===
      ford: /^[EF][A-Z0-9]{1,2}-\d{4,5}[A-Z]?$/i,
      toyota: /^(90915|04152|17801)-[A-Z0-9]{5}$/i,
      honda: /^(15400|17220)-[A-Z0-9]{3}-[A-Z0-9]{3}$/i,
      bmw: /^(11|13)\d{3} \d{3} \d{3}$/i,
      vw: /^(03|06)[A-Z] \d{3} \d{3}[A-Z]?$/i,
      audi: /^(06|079) \d{3} \d{3}[A-Z]?$/i,
      subaru: /^(15208|SOA)\d{5}[A-Z]{2}\d{3}$/i,
      mazda: /^(1|PE)[A-Z0-9]{2}-\d{2}-\d{3}[A-Z]?$/i,
      gm: /^(PF|ACDelco)\d{3,5}$/i,
      chrysler: /^(04|68|05)\d{6}[A-Z]{2}$/i
    };

    this.manufacturers = {
      caterpillar: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      komatsu: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      johnDeere: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      volvo: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      hitachi: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC' },
      liebherr: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      doosan: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC' },
      hyundai: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC' },
      kobelco: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA-PACIFIC' },
      caseIH: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      sandvik: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      epiroc: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      belaz: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      terex: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      atlascopco: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      metso: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      newHolland: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      agco: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      kubota: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      claas: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      masseyferguson: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      fendt: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      mahindra: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'ASIA' },
      deutzfahr: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      freightliner: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      kenworth: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      peterbilt: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      mack: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      volvoTrucks: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      international: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      scania: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      daf: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      mercedes: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL' },
      man: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      cummins: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      mtu: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      volvoPenta: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL' },
      yanmar: { tier: 'OEM', duty: 'MIXED', region: 'ASIA-PACIFIC' },
      detroitDiesel: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      mercuryMarine: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' },
      suzukiMarine: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'ASIA-PACIFIC' },
      perkins: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      kohler: { tier: 'OEM', duty: 'MIXED', region: 'NORTH AMERICA' },
      generac: { tier: 'OEM', duty: 'MIXED', region: 'NORTH AMERICA' },
      fgWilson: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      waukesha: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      ge: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      cameronSlb: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      weatherford: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      halliburton: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      bakerhughes: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      nationaloilwell: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      dresser: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      tigercat: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      ponsse: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      valmet: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      rottne: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      hsm: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'EUROPE' },
      waratah: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      timberpro: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      crown: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL' },
      yale: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL' },
      hyster: { tier: 'OEM', duty: 'MIXED', region: 'GLOBAL' },
      jungheinrich: { tier: 'OEM', duty: 'MIXED', region: 'EUROPE' },
      linde: { tier: 'OEM', duty: 'MIXED', region: 'EUROPE' },
      mitsubishi: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'ASIA-PACIFIC' },
      nissan: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'GLOBAL' },
      clarklift: { tier: 'OEM', duty: 'MIXED', region: 'NORTH AMERICA' },
      donaldson: { tier: 'TIER 1 - AFTERMARKET', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      fleetguard: { tier: 'TIER 1 - AFTERMARKET', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      baldwin: { tier: 'TIER 1 - AFTERMARKET', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      mannFilter: { tier: 'TIER 1 - AFTERMARKET', duty: 'MIXED', region: 'EUROPE' },
      mahle: { tier: 'TIER 1 - AFTERMARKET', duty: 'MIXED', region: 'GLOBAL' },
      fram: { tier: 'TIER 2 - AFTERMARKET', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' },
      wix: { tier: 'TIER 2 - AFTERMARKET', duty: 'MIXED', region: 'GLOBAL' },
      purolator: { tier: 'TIER 2 - AFTERMARKET', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' },
      acdelco: { tier: 'TIER 2 - AFTERMARKET', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' },
      bosch: { tier: 'TIER 2 - AFTERMARKET', duty: 'MIXED', region: 'GLOBAL' },
      hastings: { tier: 'TIER 3 - AFTERMARKET', duty: 'MIXED', region: 'NORTH AMERICA' },
      partsMaster: { tier: 'TIER 3 - AFTERMARKET', duty: 'MIXED', region: 'NORTH AMERICA' },
      champion: { tier: 'TIER 3 - AFTERMARKET', duty: 'MIXED', region: 'NORTH AMERICA' },
      napa: { tier: 'TIER 3 - AFTERMARKET', duty: 'MIXED', region: 'NORTH AMERICA' },
      carquest: { tier: 'TIER 3 - AFTERMARKET', duty: 'MIXED', region: 'NORTH AMERICA' },
      ford: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' },
      toyota: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'GLOBAL' },
      honda: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'GLOBAL' },
      bmw: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'EUROPE' },
      vw: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'EUROPE' },
      audi: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'EUROPE' },
      subaru: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'ASIA-PACIFIC' },
      mazda: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'ASIA-PACIFIC' },
      gm: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' },
      chrysler: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' }
    };
  }

  async classifyFilter(filterCode) {
    try {
      const cached = await FilterClassification.findOne({ filterCode });
      if (cached) {
        console.log(`✅ Cache hit: ${filterCode}`);
        return {
          manufacturer: cached.manufacturer,
          tier: cached.tier,
          duty: cached.duty,
          region: cached.region,
          confidence: cached.confidence,
          method: cached.method,
          cached: true
        };
      }

      console.log(`🔍 Classifying: ${filterCode}`);
      let classification = this.patternMatch(filterCode);

      if (classification.manufacturer === 'UNKNOWN') {
        console.log(`🤖 Using GROQ AI for: ${filterCode}`);
        classification = await this.classifyWithGroq(filterCode);
      }

      if (classification.confidence !== 'LOW') {
        await FilterClassification.create({ filterCode, ...classification });
        console.log(`💾 Cached: ${filterCode}`);
      }

      return { ...classification, cached: false };
    } catch (error) {
      console.error('❌ Classification error:', error);
      throw error;
    }
  }

  patternMatch(filterCode) {
    for (const [mfr, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(filterCode)) {
        const info = this.manufacturers[mfr];
        return {
          manufacturer: this.formatName(mfr),
          tier: info.tier,
          duty: info.duty,
          region: info.region,
          confidence: 'HIGH',
          method: 'PATTERN_MATCH'
        };
      }
    }
    return {
      manufacturer: 'UNKNOWN',
      tier: 'UNKNOWN',
      duty: 'UNKNOWN',
      region: 'UNKNOWN',
      confidence: 'LOW',
      method: 'NO_MATCH'
    };
  }

  async classifyWithGroq(filterCode) {
    try {
      const prompt = `Analyze filter code: "${filterCode}"

Identify manufacturer (Caterpillar, John Deere, Donaldson, FRAM, Komatsu, Volvo, etc.)
Determine tier (OEM, TIER 1-3 AFTERMARKET)
Classify duty (HEAVY DUTY (HD) or LIGHT DUTY (LD))
Region (NORTH AMERICA, EUROPE, ASIA, GLOBAL)

HD manufacturers: CAT, Komatsu, John Deere, Donaldson, Fleetguard, Baldwin, Cummins
LD manufacturers: Ford, Toyota, Honda, BMW, FRAM, Purolator

JSON only:
{"manufacturer":"Name","tier":"OEM/TIER X","duty":"HD/LD","region":"Region","confidence":"HIGH/MEDIUM/LOW"}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 200
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No GROQ response');

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON from GROQ');

      const result = JSON.parse(jsonMatch[0]);
      return { ...result, method: 'GROQ_AI' };
    } catch (error) {
      console.error('❌ GROQ error:', error.message);
      return {
        manufacturer: 'UNKNOWN',
        tier: 'UNKNOWN',
        duty: 'UNKNOWN',
        region: 'UNKNOWN',
        confidence: 'LOW',
        method: 'GROQ_ERROR'
      };
    }
  }

  formatName(key) {
    const names = {
      caterpillar: 'Caterpillar', komatsu: 'Komatsu', johnDeere: 'John Deere',
      volvo: 'Volvo', hitachi: 'Hitachi', liebherr: 'Liebherr', doosan: 'Doosan',
      hyundai: 'Hyundai', kobelco: 'Kobelco', caseIH: 'Case IH', sandvik: 'Sandvik',
      epiroc: 'Epiroc', belaz: 'BelAZ', terex: 'Terex', atlascopco: 'Atlas Copco',
      metso: 'Metso', newHolland: 'New Holland', agco: 'AGCO', kubota: 'Kubota',
      claas: 'CLAAS', masseyferguson: 'Massey Ferguson', fendt: 'Fendt',
      mahindra: 'Mahindra', deutzfahr: 'Deutz-Fahr', freightliner: 'Freightliner',
      kenworth: 'Kenworth', peterbilt: 'Peterbilt', mack: 'Mack',
      volvoTrucks: 'Volvo Trucks', international: 'International', scania: 'Scania',
      daf: 'DAF', mercedes: 'Mercedes-Benz', man: 'MAN', cummins: 'Cummins',
      mtu: 'MTU', volvoPenta: 'Volvo Penta', yanmar: 'Yanmar',
      detroitDiesel: 'Detroit Diesel', mercuryMarine: 'Mercury Marine',
      suzukiMarine: 'Suzuki Marine', perkins: 'Perkins', kohler: 'Kohler',
      generac: 'Generac', fgWilson: 'FG Wilson', waukesha: 'Waukesha', ge: 'GE',
      cameronSlb: 'Cameron/Schlumberger', weatherford: 'Weatherford',
      halliburton: 'Halliburton', bakerhughes: 'Baker Hughes',
      nationaloilwell: 'National Oilwell', dresser: 'Dresser', tigercat: 'Tigercat',
      ponsse: 'Ponsse', valmet: 'Valmet', rottne: 'Rottne', hsm: 'HSM',
      waratah: 'Waratah', timberpro: 'TimberPro', crown: 'Crown', yale: 'Yale',
      hyster: 'Hyster', jungheinrich: 'Jungheinrich', linde: 'Linde',
      mitsubishi: 'Mitsubishi', nissan: 'Nissan', clarklift: 'Clark',
      donaldson: 'Donaldson', fleetguard: 'Fleetguard', baldwin: 'Baldwin',
      mannFilter: 'MANN-FILTER', mahle: 'MAHLE', fram: 'FRAM', wix: 'WIX',
      purolator: 'Purolator', acdelco: 'ACDelco', bosch: 'Bosch',
      hastings: 'Hastings', partsMaster: 'Parts Master', champion: 'Champion',
      napa: 'NAPA', carquest: 'Carquest', ford: 'Ford', toyota: 'Toyota',
      honda: 'Honda', bmw: 'BMW', vw: 'Volkswagen', audi: 'Audi',
      subaru: 'Subaru', mazda: 'Mazda', gm: 'GM', chrysler: 'Chrysler'
    };
    return names[key] || key;
  }
}

module.exports = new ClassifierService();
