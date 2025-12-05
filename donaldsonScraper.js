// ============================================================================
// DONALDSON SCRAPER - Complete Version with ALL Series
// Supports: P-series, DBL, DBA, ELF and more
// ============================================================================

const axios = require('axios');
const { extract4Digits } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');
const { appendWatch } = require('../utils/pSeriesWatchlist');

/**
 * Comprehensive Donaldson database
 */
const DONALDSON_DATABASE = {
    // ========== P-SERIES (Standard) ==========
    'P150695': {
        family: 'AIRE',
        type: 'FILTRO DE AIRE, PRIMARIO KONEPAC',
        specifications: {
            height: '18.11 inch',
            outer_diameter: '8.27 inch',
            inner_diameter: '6.22 inch',
            type: 'Air Filter Primary'
        },
        cross_references: {
            '52MD42M': 'P150695',
            'KONEPAC': 'P150695'
        },
        applications: ['KONEPAC', 'Industrial Equipment']
    },
    'P552100': {
        family: 'OIL',
        type: 'LUBE FILTER, SPIN-ON FULL FLOW',
        specifications: {
            outer_diameter: '4.65 inch (118 mm)',
            thread_size: '1 5/8-12 UN',
            length: '10.24 inch (260 mm)',
            efficiency: '99% @ 21 micron',
            media_type: 'Cellulose',
            style: 'Spin-On'
        },
        cross_references: {
            'FLEETGUARD-LF3620': 'P552100',
            'FRAM-PH7405': 'P552100',
            'BALDWIN-B495': 'P552100',
            'CATERPILLAR-3I1882': 'P552100'
        },
        applications: ['DETROIT DIESEL', 'FREIGHTLINER', 'CATERPILLAR']
    },
    // Specific override: Donaldson P527682 is an Air Filter (Primary Radialseal)
    'P527682': {
        family: 'AIRE',
        type: 'AIR FILTER, PRIMARY RADIALSEAL',
        specifications: {
            length: '14.76 inch',
            outer_diameter: '13.09 inch',
            inner_diameter: '6.78 inch',
            media_type: 'Cellulose',
            style: 'Radialseal'
        },
        cross_references: {
            'AF25139M': 'P527682',
            'RS3518': 'P527682',
            'FA1077': 'P527682',
            'WIX-46556': 'P527682'
        },
        applications: ['Heavy Duty Engine Air', 'Freightliner', 'Detroit 60 Series']
    },
    
    // ========== DBL-SERIES (Donaldson Blue Lube) ==========
    'DBL7349': {
        family: 'OIL',
        type: 'Donaldson Blue® Lube Filter',
        specifications: {
            efficiency: '99% @ 15 micron',
            media_type: 'Synteq™ Synthetic',
            bypass: 'None (full flow)',
            service_interval: 'Extended'
        },
        cross_references: {
            'P558615': 'DBL7349',  // OEM equivalent
            'ELF7349': 'DBL7349'   // Endurance version
        },
        applications: ['Cummins', 'Heavy Duty Diesel']
    },
    
    // ========== DBA-SERIES (Donaldson Blue Air) ==========
    'DBA5000': {
        family: 'AIRE',
        type: 'Donaldson Blue® Air Filter',
        specifications: {
            media_type: 'Ultra-Web® Fine Fiber',
            efficiency: '99.99% @ submicron',
            service_life: '2x standard cellulose'
        },
        cross_references: {},
        applications: ['On-road trucks', 'Off-road equipment', 'Mining']
    },
    
    // ========== ELF-SERIES (Endurance Lube Filter) ==========
    'ELF7349': {
        family: 'OIL',
        type: 'Endurance Lube Filter',
        specifications: {
            efficiency: '99% @ 40 micron',
            media_type: 'Cellulose blend',
            service_interval: 'Standard'
        },
        cross_references: {
            'DBL7349': 'ELF7349',
            'P558615': 'ELF7349'
        },
        applications: ['Cummins', 'Detroit Diesel']
    }
    ,
    // ===== Added: Official cross-reference for Caterpillar 1R-1808 → Donaldson P551808 =====
    'P551808': {
        family: 'OIL',
        type: 'LUBE FILTER, SPIN-ON FULL FLOW',
        specifications: {
            style: 'Spin-On',
            media_type: 'Cellulose'
        },
        cross_references: {
            'CATERPILLAR-1R-1808': 'P551808',
            'CATERPILLAR-1R1808': 'P551808',
            '1R-1808': 'P551808',
            '1R1808': 'P551808'
        },
        applications: ['Caterpillar heavy-duty engines']
    },
    // ===== Added: Official cross-reference for John Deere RE509031 → Donaldson P551421 =====
    'P551421': {
        family: 'FUEL',
        type: 'FUEL FILTER, WATER SEPARATOR CARTRIDGE',
        specifications: {
            style: 'Cartridge',
            function: 'Water Separator'
        },
        cross_references: {
            'JOHN-DEERE-RE509031': 'P551421',
            'RE509031': 'P551421'
        },
        applications: ['John Deere agricultural equipment']
    },
    // ===== Curated: Common P55 fuel filters
    'P551329': {
        family: 'FUEL',
        type: 'FUEL FILTER',
        specifications: {
            function: 'Primary/Secondary Fuel Filtration'
        },
        cross_references: {
        },
        applications: ['Heavy Duty Fuel Systems']
    },
    'P551313': {
        family: 'FUEL',
        type: 'FUEL FILTER',
        specifications: {
            function: 'Fuel Filtration'
        },
        cross_references: {
            'BALDWIN-BF7633': 'P551313'
        },
        applications: []
    },
    'P551311': {
        family: 'FUEL',
        type: 'FUEL FILTER',
        specifications: {
            function: 'Fuel Filtration'
        },
        cross_references: {
            'CATERPILLAR-1R0750': 'P551311',
            '1R0750': 'P551311'
        },
        applications: []
    }
    ,
    // Curated: common market parts
    'P951413': {
        family: 'AIR DRYER',
        type: 'AIR DRYER, SPIN-ON CARTRIDGE',
        specifications: {},
        cross_references: {
            'VOLVO-21620181': 'P951413',
            'VOLVO-1699132': 'P951413',
            'VOLVO-3090268': 'P951413',
            'VOLVO-3090288': 'P951413',
            'VOLVO-20557234': 'P951413',
            'VOLVO-20972915': 'P951413',
            'VOLVO-21508133': 'P951413',
            'VOLVO-85110799': 'P951413',
            'WABCO-4324109362': 'P951413',
            'WABCO-4329012222': 'P951413',
            'WABCO-4329012232': 'P951413',
            'WABCO-4329012242': 'P951413',
            'WABCO-4329012252': 'P951413',
            'MERITOR-R950068': 'P951413',
            'BENDIX-5004814PG': 'P951413',
            'BALDWIN-BA5379': 'P951413',
            'BALDWIN-BA5592': 'P951413',
            'MAHLE-AL24': 'P951413',
            'HENGST-T280W': 'P951413',
            'HIFI FILTER-TB1390': 'P951413',
            'KNORR-K039454': 'P951413',
            'SF-FILTER-ST13742': 'P951413',
            'WIX-96008E': 'P951413',
            'MERCEDES-BENZ-4295695': 'P951413',
            'MERCEDES-BENZ-4295795': 'P951413',
            'MERCEDES-BENZ-A0004295695': 'P951413',
            'MERCEDES-BENZ-A0004295795': 'P951413',
            'DAF-1506635': 'P951413',
            'DAF-1782420': 'P951413'
        },
        applications: ['Volvo D13', 'Heavy Duty Air Systems', 'WABCO/Knorr-Bremse']
    },
    'P781466': {
        family: 'AIR DRYER',
        type: 'AIR DRYER, SPIN-ON CARTRIDGE',
        specifications: {},
        cross_references: {
            // Nuevo PN vinculado por Donaldson
            'DONALDSON-P953571': 'P781466'
        },
        applications: ['Heavy Duty Air Systems']
    },
    'P953571': {
        family: 'AIR DRYER',
        type: 'AIR DRYER, SPIN-ON CARTRIDGE',
        specifications: {},
        cross_references: {
            'DONALDSON-P781466': 'P953571'
        },
        applications: ['Heavy Duty Air Systems']
    }
};

// Curated exceptions: Donaldson P55 subseries items known to be FUEL
const P55_FUEL_EXCEPTIONS = new Set([
  'P551329',
  'P551313',
  'P551311',
  'P551421',
  // Corrección solicitada: P550440 no es OIL, clasificar como FUEL
  'P550440'
]);

/**
 * Detect series type from code
 */
function detectSeriesType(code) {
    const normalized = code.toUpperCase();
    
    if (normalized.startsWith('DBL')) return 'DBL';
    if (normalized.startsWith('DBA')) return 'DBA';
    if (normalized.startsWith('ELF')) return 'ELF';
    if (normalized.startsWith('HFA')) return 'HFA';
    if (normalized.startsWith('HFP')) return 'HFP';
    if (normalized.startsWith('EAF')) return 'EAF';
    if (normalized.startsWith('X')) return 'X';
    if (normalized.startsWith('P')) return 'P';
    if (normalized.startsWith('C')) return 'C';
    
    return null;
}

/**
 * Detect family from code patterns
 */
function detectFamilyFromCode(code) {
    const normalized = code.toUpperCase();
    const series = detectSeriesType(normalized);
    
    // DBL series = always OIL
    if (series === 'DBL') return 'OIL';
    
    // DBA series = always AIRE
    if (series === 'DBA') return 'AIRE';
    
    // ELF series = always OIL
    if (series === 'ELF') return 'OIL';

    // HFP series = FUEL
    if (series === 'HFP') return 'FUEL';

    // HFA/EAF series = AIRE
    if (series === 'HFA' || series === 'EAF') return 'AIRE';
    
    // X-series (unknown family until confirmed) → no family
    if (series === 'X') return null;
    
    // C-series (Duralite Air) = always AIRE
    if (series === 'C') return 'AIRE';
    
    // P-series: reglas curadas y excepciones
    if (series === 'P') {
        // Excepción curada: P781466 y su PN actualizado P953571 son AIR DRYER
        if (normalized === 'P781466' || normalized === 'P953571') {
            return 'AIR DRYER';
        }
        // P55: por defecto OIL, con excepciones curadas → FUEL
        if (/^P55\d{4}[A-Z]?$/.test(normalized)) {
            if (P55_FUEL_EXCEPTIONS.has(normalized)) return 'FUEL';
            return 'OIL';
        }
        if (/^P5(0|2|3|4)\d{4}[A-Z]?$/.test(normalized)) return 'OIL';
        if (/^P62\d{4}[A-Z]?$/.test(normalized)) return 'AIRE';
        if (/^P77\d{4}[A-Z]?$/.test(normalized)) return 'AIRE';
        if (/^P78\d{4}[A-Z]?$/.test(normalized)) return 'AIRE';
        if (/^P82\d{4}[A-Z]?$/.test(normalized)) return 'AIRE';
        // P95: Air Dryer spin-on
        if (/^P95\d{4}[A-Z]?$/.test(normalized)) return 'AIR DRYER';
        if (/^P56\d{4}[A-Z]?$/.test(normalized)) return 'FUEL';
        if (/^P60\d{4}[A-Z]?$/.test(normalized)) return 'COOLANT';
        if (/^P1(5|7|8)\d{4}[A-Z]?$/.test(normalized)) return 'AIRE';
        // Otros P-series no son aceptados en nuestra línea
        return null;
    }
    
    return null;
}

/**
 * Find Donaldson code from cross-reference
 */
function findDonaldsonCode(inputCode) {
    const normalized = String(inputCode || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    // Helper: canonicalize AF/RS codes → prefix + digits (drop suffix letters)
    function canonAfRs(token) {
        const up = String(token || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const m = up.match(/^(AF|RS)(\d{3,})([A-Z]*)$/);
        if (!m) return null;
        const prefix = m[1];
        const digits = m[2];
        return `${prefix}${digits}`;
    }

    // Direct lookup
    if (DONALDSON_DATABASE[normalized]) {
        return normalized;
    }

    // AF/RS canonical direct lookup (e.g., AF25139M → AF25139)
    const afrsCanon = canonAfRs(normalized);
    if (afrsCanon && DONALDSON_DATABASE[afrsCanon]) {
        return afrsCanon;
    }

    // Search in cross-references with robust normalization
    for (const [donaldsonCode, filterData] of Object.entries(DONALDSON_DATABASE)) {
        const xrefs = filterData?.cross_references || {};
        for (const [xrefCode] of Object.entries(xrefs)) {
            const xrefNormalized = String(xrefCode || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');

            // Exact or substring matches
            if (
                xrefNormalized === normalized ||
                xrefNormalized.includes(normalized) ||
                normalized.includes(xrefNormalized)
            ) {
                return donaldsonCode;
            }

            // AF/RS canonical comparison (digits-only base)
            const xrefAfRs = canonAfRs(xrefNormalized);
            if (afrsCanon && xrefAfRs && afrsCanon === xrefAfRs) {
                return donaldsonCode;
            }

            // Digits-only fallback for AF/RS (e.g., RS-3518 vs RS3518M)
            const inputDigits = (normalized.match(/^(AF|RS)(\d{3,})/) || [])[2];
            const xrefDigits = (xrefNormalized.match(/^(AF|RS)(\d{3,})/) || [])[2];
            if (inputDigits && xrefDigits && inputDigits === xrefDigits) {
                return donaldsonCode;
            }
        }
    }

    return null;
}

/**
 * Main scraper function
 */
async function scrapeDonaldson(code) {
    try {
        console.log(`📡 Donaldson scraper: ${code}`);
        
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Step 1: Try cross-reference lookup
        let donaldsonCode = findDonaldsonCode(normalized);
        
        if (donaldsonCode && DONALDSON_DATABASE[donaldsonCode]) {
            const filter = DONALDSON_DATABASE[donaldsonCode];
            const series = detectSeriesType(donaldsonCode);
            
            console.log(`✅ Found via cross-reference: ${code} → ${donaldsonCode} (${series}-series)`);
            
            const crossTokens = Object.keys(filter.cross_references || {});
            const orderedCross = orderDonaldsonCrossByPriority(crossTokens);
            return {
                found: true,
                code: donaldsonCode,
                original_code: code,
                series: series,
                family_hint: filter.family,
                cross: orderedCross,
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Step 2: Try direct lookup
        if (DONALDSON_DATABASE[normalized]) {
            const filter = DONALDSON_DATABASE[normalized];
            const series = detectSeriesType(normalized);
            
            console.log(`✅ Found directly: ${normalized} (${series}-series)`);
            
            const crossTokens = Object.keys(filter.cross_references || {});
            const orderedCross = orderDonaldsonCrossByPriority(crossTokens);
            return {
                found: true,
                code: normalized,
                original_code: code,
                series: series,
                family_hint: filter.family,
                cross: orderedCross,
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Step 3: Pattern detection (estricto) — aceptar formatos canónicos
        // Solo aceptamos si coincide con el regex estricto de Donaldson
        const series = detectSeriesType(normalized);
        const detectedFamily = detectFamilyFromCode(normalized);
        if (series && detectedFamily && prefixMap.DONALDSON_STRICT_REGEX.test(normalized)) {
            console.log(`✅ Strict pattern accepted: ${normalized} → ${series}-series, ${detectedFamily}`);
            return {
                found: true,
                code: normalized,
                original_code: code,
                series,
                family_hint: detectedFamily,
                cross: [],
                applications: [],
                attributes: { product_type: detectedFamily }
            };
        }
        
        // Step 4: Web lookup fallback (DESACTIVADO para validación estricta)
        // Evita homologar por coincidencia textual del sitio.
        
        // Step 5: Not found
        console.log(`⚠️  Donaldson filter not found: ${code}`);
        return {
            found: false,
            code: code,
            original_code: code,
            series: null,
            family_hint: null,
            cross: [],
            applications: [],
            attributes: {}
        };

    } catch (error) {
        console.error(`❌ Donaldson scraper error: ${error.message}`);
        
        return {
            found: false,
            code: code,
            original_code: code,
            series: null,
            family_hint: null,
            cross: [],
            applications: [],
            attributes: {}
        };
    }
}

// ================================
// Orden regional de cruces HD
// ================================
function getDonaldsonRegionalPriority() {
  const region = String(process.env.MARKET_REGION || '').toUpperCase();
  // OEMs y aftermarket relevantes
  const OEMS_COMMON = [
    'CATERPILLAR','DETROIT DIESEL','CUMMINS','MACK','JOHN DEERE','VOLVO','KOMATSU','SCANIA','MAN','DAF','IVECO','RENAULT',
    'ISUZU','HINO','UD TRUCKS','PACCAR','PERKINS','DEUTZ','KUBOTA','YANMAR','JCB','BOBCAT','TEREX','HITACHI','DOOSAN','SANY',
    'FORD','CHEVROLET','GM','GMC','DODGE','RAM','KENWORTH','PETERBILT','INTERNATIONAL',
    'TOYOTA','NISSAN','LEXUS','HONDA','ACURA','MITSUBISHI','BMW','MERCEDES BENZ','VOLKSWAGEN','AUDI','TESLA','OPEL','SKODA','PEUGEOT','CITROEN','FIAT','ALFA ROMEO','SEAT','LAND ROVER','JAGUAR','PORSCHE',
    'RENAULT TRUCKS','BYD','CHERY','GEELY','GREAT WALL','GWM','JAC','FAW','DONGFENG','FOTON','BAIC','CHANGAN','YUTONG',
    'CASE','CASE IH','NEW HOLLAND','CNH'
  ];
  // Orden base (genérico)
  let base = [
    'DONALDSON','FLEETGUARD',
    // OEMs generales
    ...OEMS_COMMON,
    // Aftermarket HD/LD
    'BALDWIN','WIX','MANN','MAHLE','HENGST','TECFIL','WEGA','VOX','GFC','FRAM','BOSCH','K&N','ACDELCO','NAPA','PURFLUX','HIFI FILTER'
  ];
  if (region.includes('EU')) {
    base = [
      'DONALDSON','FLEETGUARD','MANN','MAHLE','HENGST',
      // OEMs europeos primero (trucks + passenger)
      'SCANIA','MAN','DAF','IVECO','RENAULT TRUCKS','RENAULT','VOLVO',
      'MERCEDES BENZ','BMW','VOLKSWAGEN','AUDI','SKODA','OPEL','PEUGEOT','CITROEN','FIAT','ALFA ROMEO','SEAT','LAND ROVER','JAGUAR','PORSCHE','TESLA',
      // Resto OEMs
      'FORD','TOYOTA','NISSAN','LEXUS','HONDA','ACURA','MITSUBISHI','ISUZU','HINO','UD TRUCKS','BYD','CHERY','GEELY','GREAT WALL','GWM','JAC','FAW','DONGFENG','FOTON','BAIC','CHANGAN','YUTONG',
      'JOHN DEERE','KOMATSU','CATERPILLAR','DETROIT DIESEL','PERKINS','DEUTZ','KUBOTA','YANMAR','JCB','BOBCAT','TEREX','HITACHI','DOOSAN','SANY',
      // Aftermarket
      'BALDWIN','WIX','TECFIL','FRAM','BOSCH','K&N','ACDELCO','NAPA','PURFLUX','HIFI FILTER','WEGA','VOX','GFC'
    ];
  } else if (region.includes('LATAM')) {
    base = [
      'DONALDSON','FLEETGUARD',
      // Aftermarket LATAM prioritario
      'TECFIL','WEGA','VOX','GFC',
      // OEMs HD/LatAm relevantes
      'CATERPILLAR','DETROIT DIESEL','CUMMINS','MACK','JOHN DEERE','ISUZU','VOLVO','KOMATSU','SCANIA','IVECO','RENAULT','HINO','UD TRUCKS','PACCAR',
      // OEMs automotrices comunes
      'FORD','CHEVROLET','GM','GMC','DODGE','RAM','KENWORTH','PETERBILT','INTERNATIONAL',
      'TOYOTA','NISSAN','LEXUS','HONDA','ACURA','MITSUBISHI','BMW','MERCEDES BENZ','VOLKSWAGEN','AUDI','TESLA','OPEL','SKODA','PEUGEOT','CITROEN','FIAT','BYD','CHERY','GEELY','GREAT WALL','GWM','JAC','FAW','DONGFENG','FOTON','BAIC','CHANGAN','YUTONG',
      // Agro/industriales presentes en la región
      'PERKINS','DEUTZ','KUBOTA','YANMAR','JCB','BOBCAT','TEREX','HITACHI','DOOSAN','SANY','CASE','CASE IH','NEW HOLLAND','CNH',
      // Aftermarket global/HD
      'BALDWIN','WIX','MANN','FRAM','BOSCH','K&N','ACDELCO','NAPA','MAHLE','HENGST','PURFLUX','HIFI FILTER'
    ];
  } else if (region.includes('NA') || region.includes('US') || region.includes('USA')) {
    base = [
      'DONALDSON','FLEETGUARD',
      // OEMs HD/NA relevantes
      'CATERPILLAR','DETROIT DIESEL','CUMMINS','MACK','JOHN DEERE','ISUZU','VOLVO','KOMATSU','SCANIA','IVECO','RENAULT','HINO','UD TRUCKS','PACCAR',
      // OEMs automotrices comunes
      'FORD','CHEVROLET','GM','GMC','DODGE','RAM','KENWORTH','PETERBILT','INTERNATIONAL',
      'TOYOTA','NISSAN','LEXUS','HONDA','ACURA','MITSUBISHI','BMW','MERCEDES BENZ','VOLKSWAGEN','AUDI','TESLA','OPEL','SKODA','PEUGEOT','CITROEN','FIAT','BYD','CHERY','GEELY','GREAT WALL','GWM','JAC','FAW','DONGFENG','FOTON','BAIC','CHANGAN','YUTONG',
      // Agro/industriales presentes en la región
      'PERKINS','DEUTZ','KUBOTA','YANMAR','JCB','BOBCAT','TEREX','HITACHI','DOOSAN','SANY','CASE','CASE IH','NEW HOLLAND','CNH',
      // Aftermarket HD
      'BALDWIN','WIX','MANN','TECFIL','WEGA','VOX','GFC',
      // Otros aftermarket
      'FRAM','BOSCH','K&N','ACDELCO','NAPA','MAHLE','HENGST','PURFLUX','HIFI FILTER'
    ];
  }
  return base;
}

// Catálogo de marcas conocidas para extracción robusta
const KNOWN_BRANDS = [
  // Aftermarket core
  'DONALDSON','FLEETGUARD','BALDWIN','WIX','MANN','MAHLE','HENGST','TECFIL','WEGA','VOX','GFC','FRAM','BOSCH','K&N','ACDELCO','NAPA','PURFLUX','HIFI FILTER',
  // Heavy duty OEMs / engines / equipment
  'CATERPILLAR','DETROIT DIESEL','CUMMINS','MACK','JOHN DEERE','VOLVO','KOMATSU','SCANIA','MAN','DAF','IVECO','RENAULT','RENAULT TRUCKS',
  'ISUZU','HINO','UD TRUCKS','PACCAR','PERKINS','DEUTZ','KUBOTA','YANMAR','JCB','BOBCAT','TEREX','HITACHI','DOOSAN','SANY','CASE','CASE IH','NEW HOLLAND','CNH',
  // NA/US trucks & OEMs
  'FORD','CHEVROLET','GM','GMC','DODGE','RAM','KENWORTH','PETERBILT','INTERNATIONAL',
  // EU passenger & trucks
  'BMW','MERCEDES BENZ','VOLKSWAGEN','AUDI','SKODA','OPEL','TESLA','PEUGEOT','CITROEN','FIAT','ALFA ROMEO','SEAT','LAND ROVER','JAGUAR','PORSCHE',
  // JP/KR passenger
  'TOYOTA','NISSAN','LEXUS','HONDA','ACURA','MITSUBISHI','SUBARU','SUZUKI','MAZDA','DAIHATSU',
  // CN passenger and trucks
  'BYD','CHERY','GEELY','GREAT WALL','GWM','JAC','FAW','DONGFENG','FOTON','BAIC','CHANGAN','YUTONG'
];

function inferBrandFromCrossToken(token) {
  const raw = String(token || '').toUpperCase();
  // Normalizar separadores → espacios
  const normalized = raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Buscar la marca de mayor longitud contenida en el token (comparación por includes)
  let best = null;
  for (const b of KNOWN_BRANDS) {
    if (normalized.includes(b)) {
      if (!best || b.length > best.length) best = b;
    }
  }
  if (best) return best;
  // Fallback: primera pieza antes de espacio o guión
  const first = normalized.split(' ')[0];
  return first;
}

function orderDonaldsonCrossByPriority(tokens) {
  const PR = getDonaldsonRegionalPriority();
  const score = (tok) => {
    const b = inferBrandFromCrossToken(tok);
    const idx = PR.indexOf(b);
    return idx > -1 ? idx : PR.length + 1;
  };
  return [...tokens].sort((a, b) => score(a) - score(b));
}

// Registro suplementario: Detroit Diesel 23518480 → Donaldson P552100
// Referencia confirmada como lube filter spin-on full flow
if (typeof DONALDSON_DATABASE === 'object') {
  DONALDSON_DATABASE['P552100'] = {
    family: 'LUBE',
    applications: [
      'Lube filter, spin-on, full flow'
    ],
    cross_references: {
      'DETROIT DIESEL 23518480': 'P552100',
      '23518480': 'P552100'
    }
  };
  // Overlay: Validación externa confirmada
  // Fuente: Donaldson P169071 – LUBE FILTER, SPIN-ON FULL FLOW
  // https://shop.donaldson.com/store/es-us/product/P169071/16389
  DONALDSON_DATABASE['P169071'] = {
    family: 'LUBE',
    type: 'LUBE FILTER, SPIN-ON FULL FLOW',
    specifications: {
      style: 'Spin-On',
      function: 'Full Flow'
    },
    cross_references: {
      // Curado: cruce conocido desde tu catálogo
      'ECG6714A': 'P169071'
    },
    applications: []
  };
}

module.exports = {
    scrapeDonaldson,
    DONALDSON_DATABASE,
    findDonaldsonCode,
    detectSeriesType,
    detectFamilyFromCode,
    orderDonaldsonCrossByPriority,
    // Bridge-compatible validator: intenta siempre Donaldson y devuelve shape estándar
    async validateDonaldsonCode(inputCode) {
        const normalized = String(inputCode || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
        try {
            const result = await scrapeDonaldson(normalized);
            if (result && result.found) {
                const family = result.family_hint || detectFamilyFromCode(result.code) || null;
                // Regla estricta HD: últimos 4 dígitos del código Donaldson
                const last4 = extract4Digits(result.code);
                return {
                    valid: true,
                    code: result.code,
                    source: 'DONALDSON',
                    family,
                    duty: 'HD',
                    last4,
                    cross: result.cross || [],
                    applications: result.applications || [],
                    attributes: {
                        ...(result.attributes || {}),
                        series: result.series || detectSeriesType(result.code) || null
                    }
                };
            }
            // Registrar P-series no aceptadas para inventario pasivo
            if (normalized.startsWith('P')) {
                appendWatch(normalized, 'NOT_FOUND_DONALDSON');
            }
            return { valid: false, code: normalized, reason: 'NOT_FOUND_DONALDSON' };
        } catch (e) {
            if (normalized.startsWith('P')) {
                appendWatch(normalized, 'DONALDSON_ERROR');
            }
            return { valid: false, code: normalized, reason: 'DONALDSON_ERROR', message: e?.message };
        }
    }
};
