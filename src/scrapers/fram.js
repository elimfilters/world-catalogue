// ============================================================================
// FRAM SCRAPER - Complete with ALL Series
// Series: PH, TG, XG, HM, CH, CA, CF, G, PS
// ============================================================================

const axios = require('axios');
const cheerio = require('cheerio');

// =====================
// Global OEM brand tools
// =====================
const OEM_BRANDS = ['TOYOTA','LEXUS','FORD','NISSAN','INFINITI','KIA','HYUNDAI','BMW','AUDI','VOLKSWAGEN','VW'];
const BRAND_PRIORITY = ['TOYOTA','LEXUS','FORD','NISSAN','KIA','HYUNDAI','AUDI','VOLKSWAGEN','VW','BMW'];

// Aftermarket cross brands and priority (for cross_reference lists)
const AFTERMARKET_BRANDS = [
    'MOTORCRAFT','PUROLATOR','WIX','NAPA','ACDELCO','BOSCH','K&N','BALDWIN','HASTINGS','CARQUEST','MANN','STP','CHAMP','MICROGARD','MOPAR','DENSO',
    // Latin America brands
    'TECFIL','WEGA','VOX','GFC','VEGA','PARTMO','GOHNER','FILTROS WEB','PREMIUM FILTER','MILLAR FILTERS',
    // Europe
    'HIFI FILTER', 'PURFLUX', 'VALEO',
    // Aliases for mejor detección por texto (más específicos primero)
    'VIC FILTER', 'VIC', 'UFI FILTERS', 'UFI', 'ECOGARD', 'PREMIUM GUARD'
];
const AFTERMARKET_PRIORITY = [
    'MOTORCRAFT','PUROLATOR','WIX','NAPA','ACDELCO','BOSCH','K&N','BALDWIN','HASTINGS','CARQUEST','MANN','STP','CHAMP','MICROGARD','MOPAR','DENSO',
    // Regionals at lower priority
    'TECFIL','WEGA','VOX','GFC','VEGA','PARTMO','GOHNER','FILTROS WEB','PREMIUM FILTER','MILLAR FILTERS','HIFI FILTER','PURFLUX','VALEO','VIC','VIC FILTER','UFI','UFI FILTERS','ECOGARD','PREMIUM GUARD'
];

// Dynamic priority: boost brands by region (e.g., HIFI FILTER in EU)
function getAftermarketPriority() {
  const base = [...AFTERMARKET_PRIORITY];
  const region = String(process.env.MARKET_REGION || '').toUpperCase();
  const boost = (brand, toIndex) => {
    const i = base.indexOf(brand);
    if (i > -1) {
      base.splice(i, 1);
      base.splice(Math.min(toIndex, base.length), 0, brand);
    }
  };
  if (region.includes('EU')) {
    // Europe: acercar MANN, HIFI FILTER, PURFLUX y VALEO
    boost('MANN', 6);           // cerca de BOSCH/K&N
    boost('HIFI FILTER', 8);    // tras K&N
    boost('PURFLUX', 10);       // cerca de MANN
    boost('VALEO', 12);
  }
  if (region.includes('LATAM')) {
    // LatAm: subir marcas regionales más visibles
    boost('TECFIL', 10);
    boost('WEGA', 12);
    boost('VOX', 14);
    boost('GFC', 16);
  }
  if (region.includes('NA') || region.includes('US') || region.includes('USA')) {
    // Norteamérica: asegurar visibilidad de NAPA, STP, CHAMP, MICROGARD
    boost('NAPA', 3);       // ya está alto, refuerza posición
    boost('STP', 9);
    boost('CHAMP', 10);
    boost('MICROGARD', 11);
  }
  return base;
}

function detectBrandFromText(lowerText) {
    for (const b of OEM_BRANDS) {
        if (lowerText.includes(b.toLowerCase())) return b;
    }
    return null;
}

function tokenMatchesBrand(tokenRaw, brand) {
    const token = tokenRaw.replace(/\s+/g, '').toUpperCase();
  switch (brand) {
        case 'TOYOTA':
        case 'LEXUS':
            return /^(90915|04152)-[A-Z0-9]{3,}$/.test(token);
        case 'NISSAN':
        case 'INFINITI':
            return /^1520[89]-[A-Z0-9]{3,}$/.test(token);
        case 'KIA':
        case 'HYUNDAI':
            return /^26300-[A-Z0-9]{3,}$/.test(token);
        case 'BMW':
            return /^11[0-9]{8,}$/.test(token) || /^11\s?42\s?7\s?[0-9\s]{3,}$/.test(tokenRaw);
        case 'AUDI':
        case 'VOLKSWAGEN':
        case 'VW':
            return /^[0-9A-Z]{2,3}115[0-9]{3}[A-Z]{0,2}$/.test(token);
        case 'FORD':
            return /^FL-\d{3,4}[A-Z]?$/.test(token) || /^[A-Z0-9]{3,4}Z-\d{4}-[A-Z]{1,2}$/.test(token);
        default:
            return false;
    }
}

function orderByBrandPriority(tokens, BRAND_PRIORITY) {
    function inferBrand(token) {
        const raw = token;
        for (const b of BRAND_PRIORITY) {
            if (tokenMatchesBrand(raw, b)) return b;
        }
        return null;
    }
    return tokens.sort((a, b) => {
        const ba = inferBrand(a);
        const bb = inferBrand(b);
        const ia = ba ? BRAND_PRIORITY.indexOf(ba) : BRAND_PRIORITY.length;
        const ib = bb ? BRAND_PRIORITY.indexOf(bb) : BRAND_PRIORITY.length;
        return ia - ib;
    });
}

// Detect aftermarket brand from nearby text
function detectAftermarketBrandFromText(lowerText) {
    for (const b of AFTERMARKET_BRANDS) {
        if (lowerText.includes(b.toLowerCase())) return b;
    }
    return null;
}

// Brand-specific patterns for aftermarket cross-reference codes
function tokenMatchesAftermarket(tokenRaw, brand) {
    const token = tokenRaw.replace(/\s+/g, '').toUpperCase();
    switch (brand) {
        case 'MOTORCRAFT':
            return /^FL-\d{3,4}[A-Z]?$/.test(token);
        case 'PUROLATOR':
            return /^(PL|L)-?\d{3,6}[A-Z]?$/.test(token) || /^(PL|L)\d{3,6}$/.test(token);
        case 'WIX':
            return /^5\d{4}$/.test(token) || /^4\d{4}$/.test(token);
        case 'NAPA':
            return /^\d{4,6}$/.test(token);
        case 'ACDELCO':
            return /^PF\d{2,4}[A-Z]?$/.test(token);
        case 'BOSCH':
            return /^33\d{2}$/.test(token);
        case 'K&N':
            return /^(HP|PS)-?\d{3,5}$/.test(token);
        case 'BALDWIN':
            return /^B\d{2,5}[A-Z]?$/.test(token);
        case 'HASTINGS':
            return /^LF\d{2,5}$/.test(token);
        case 'CARQUEST':
            return /^85\d{3,4}$/.test(token);
        case 'MANN':
            return /^W\s?\d{3,4}\/?\d{2,3}$/.test(tokenRaw);
        case 'STP':
            return /^S\d{3,5}[A-Z]*$/.test(token);
        case 'CHAMP':
            return /^PH\d{3,5}$/.test(token) || /^\d{4,6}$/.test(token);
        case 'MICROGARD':
            return /^MGL\d{3,6}$/.test(token);
        case 'MOPAR':
            return /^MO-\d{3,5}$/.test(token);
    case 'DENSO':
      return /^\d{5}-[A-Z0-9]{3,}$/.test(token);
    case 'PURFLUX':
      // Purflux common oil series: LS#### with optional trailing letter
      return /^LS-?\d{2,5}[A-Z]?$/.test(token);
    case 'VIC':
    case 'VIC FILTER':
      // Prefer brand text detection; formats vary (e.g., C-306)
      return false;
    case 'UFI':
    case 'UFI FILTERS':
      return false;
    case 'VALEO':
      return false;
    case 'ECOGARD':
      return false;
    case 'PREMIUM GUARD':
      return false;
    // --- Latin America brands ---
    case 'TECFIL':
      // Common Tecfil prefixes: PSL, PEL, ARL, PTL, TXL, WP, WD (hyphen optional)
      return /^(PSL|PEL|ARL|PTL|TXL|WP|WD)-?\d{2,5}[A-Z]?$/.test(token);
    case 'WEGA':
      // Wega series: WO-, WL-, WA-, WFC- (hyphen optional)
      return /^(WO|WL|WA|WFC)-?\d{2,5}[A-Z]?$/.test(token);
    case 'VOX':
      // VOX uses VO-####
      return /^VO-?\d{2,5}[A-Z]?$/.test(token);
    case 'GFC':
      // GFC-##### pattern
      return /^GFC-?\d{3,6}[A-Z]?$/.test(token);
    case 'VEGA':
      // Filtros Vega: prefer brand-text detection; token forms vary → no strict token pattern
      return false;
    case 'PARTMO':
      return false;
    case 'GOHNER':
      return false;
    case 'FILTROS WEB':
      // WEB-#### under brand mention
      return /^WEB-?\d{2,5}[A-Z]?$/.test(token);
    case 'HIFI FILTER':
      // Common HIFI FILTER series: SO, SH, SA, SC, SF, SL, SN, SK, SP, TT, HF (hyphen optional)
      return /^(SO|SH|SA|SC|SF|SL|SN|SK|SP|TT|HF)-?\d{2,6}[A-Z]?$/.test(token);
    case 'PREMIUM FILTER':
      return false;
    case 'MILLAR FILTERS':
      return false;
    default:
      return false;
  }
}

function orderByCrossBrandPriority(tokens) {
    const score = (t) => {
        const lt = t.toLowerCase();
        const PR = getAftermarketPriority();
        for (let i = 0; i < PR.length; i++) {
            const b = PR[i];
            if (lt.includes(b.toLowerCase())) return i;
        }
        return PR.length + 1;
    };
    return tokens.sort((a, b) => score(a) - score(b));
}

/**
 * Extract OEM numbers from FRAM product/search pages
 */
async function fetchFramOEM(normalizedCode) {
    const oems = new Set();

    const OEM_BRANDS = ['TOYOTA','LEXUS','FORD','NISSAN','INFINITI','KIA','HYUNDAI','BMW','AUDI','VOLKSWAGEN','VW'];
    const BRAND_PRIORITY = ['TOYOTA','LEXUS','FORD','NISSAN','KIA','HYUNDAI','AUDI','VOLKSWAGEN','VW','BMW'];

    function detectBrandFromText(lowerText) {
        for (const b of OEM_BRANDS) {
            if (lowerText.includes(b.toLowerCase())) return b;
        }
        return null;
    }

    function tokenMatchesBrand(tokenRaw, brand) {
        const token = tokenRaw.replace(/\s+/g, '').toUpperCase();
        switch (brand) {
            case 'TOYOTA':
            case 'LEXUS':
                return /^(90915|04152)-[A-Z0-9]{3,}$/.test(token) || /^[0-9]{5}-[A-Z0-9]{4,}$/.test(token);
            case 'NISSAN':
            case 'INFINITI':
                return /^1520[89]-[A-Z0-9]{3,}$/.test(token) || /^[0-9]{5}-[A-Z0-9]{4,}$/.test(token);
            case 'KIA':
            case 'HYUNDAI':
                return /^26300-[A-Z0-9]{3,}$/.test(token) || /^[0-9]{5}-[A-Z0-9]{4,}$/.test(token);
            case 'BMW':
                return /^11[0-9]{8,}$/.test(token) || /^11\s?42\s?7\s?[0-9\s]{3,}$/.test(tokenRaw);
            case 'AUDI':
            case 'VOLKSWAGEN':
            case 'VW':
                // VAG formats: 06A115561B, 06D115562, 068115561B, 8A0115561B, allow 0-2 letter suffix
                return /^[0-9A-Z]{2,3}115[0-9]{3}[A-Z]{0,2}$/.test(token);
            case 'FORD':
                // Motorcraft/Ford: FL-910S, AA8Z-6731-A, E7DZ-6714-A, BC3Z-6731-A (suffix 1-2 letters)
                return /^FL-\d{3,4}[A-Z]?$/.test(token) || /^[A-Z0-9]{3,4}Z-\d{4}-[A-Z]{1,2}$/.test(token);
            default:
                return false;
        }
    }

    // Helper to process HTML with cheerio
    function extractFromHtml(html) {
        try {
            const $ = cheerio.load(html);
            const text = $('body').text() || '';
            const lower = text.toLowerCase();

            // Only attempt if page mentions OEM or equivalent
            if (!lower.includes('oem') && !lower.includes('original equipment') && !lower.includes('equivalent')) {
                return;
            }

            // Collect potential tokens from list items or paragraphs that mention OEM and OEM brands
            $('li, p, td, div, span').each((_, el) => {
                const t = ($(el).text() || '').trim();
                const tl = t.toLowerCase();
                if (tl.includes('oem') || tl.includes('original equipment') || tl.includes('equivalent')) {
                    const brand = detectBrandFromText(tl);
                    if (!brand) return; // Restrict to known OEM brands

                    // Extract codes: alphanumeric with separators
                    const matches = t.match(/[A-Z0-9][A-Z0-9\-\/\.\s]{3,}/g) || [];
                    for (const m of matches) {
                        const token = m.toUpperCase();
                        // Skip FRAM own codes (PH, TG, XG, HM, CA, CF, CH, G, PS)
                        if (/^(PH|TG|XG|HM|CA|CF|CH|G|PS)\d{2,}/.test(token)) continue;
                        // Skip the normalized code itself
                        if (token.replace(/\s+/g,'') === normalizedCode) continue;
                        // Must match brand-specific pattern
                        if (tokenMatchesBrand(token, brand)) {
                            oems.add(token.replace(/\s+/g,'').toUpperCase());
                        }
                    }
                }
            });
        } catch (err) {
            // Silent failure; OEMs are optional
        }
    }

    try {
        // Try product page
        const productUrl = `https://www.fram.com/products/${normalizedCode.toLowerCase()}`;
        const resp = await axios.get(productUrl, {
            timeout: 7000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (resp.status === 200 && resp.data) extractFromHtml(resp.data);
    } catch (_) {}

    try {
        // Try search page
        const searchUrl = `https://www.fram.com/search/?q=${encodeURIComponent(normalizedCode)}`;
        const resp2 = await axios.get(searchUrl, {
            timeout: 7000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (resp2.status === 200 && resp2.data) extractFromHtml(resp2.data);
    } catch (_) {}

    // If FRAM pages didn't yield OEMs, use popular OEM fallback source
    if (oems.size === 0) {
        const fallback = await fetchPopularOEMFallback(normalizedCode, OEM_BRANDS, BRAND_PRIORITY);
        for (const f of fallback) oems.add(f);
    }

    // Return list ordered by brand priority and limited to max 20
    const ordered = orderByBrandPriority(Array.from(oems), BRAND_PRIORITY);
    return ordered.slice(0, 20);
}

/**
 * Fallback: scrape OEMs from Plenty.Parts or other catalog pages
 */
async function fetchPopularOEMFallback(normalizedCode, OEM_BRANDS, BRAND_PRIORITY) {
    const collected = new Set();

    function orderTokens(tokens) {
        const arr = Array.from(tokens);
        return orderByBrandPriority(arr, BRAND_PRIORITY);
    }

    // Helper: detect brand based on nearby text and token match
    function detectBrandForToken(text, token) {
        const lower = text.toLowerCase();
        for (const b of OEM_BRANDS) {
            if (lower.includes(b.toLowerCase()) && tokenMatchesBrand(token, b)) return b;
        }
        return null;
    }

    // Try Plenty.Parts: https://plenty.parts/parts/fram/lubrication/PH3614
    try {
        const url = `https://plenty.parts/parts/fram/lubrication/${normalizedCode}`;
        const res = await axios.get(url, { timeout: 7000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (res.status === 200 && res.data) {
            const $ = cheerio.load(res.data);
            // Search in sections that mention Original (OEM) part numbers or OEM manufacturer lists
            $('div, section, article, ul, li, p, table, td, span').each((_, el) => {
                const t = ($(el).text() || '').trim();
                if (!t) return;
                const matches = t.match(/\b[A-Z0-9]{2,}(?:[-\/\.][A-Z0-9]{2,})+\b/g) || [];
                for (const m of matches) {
                    const token = m.toUpperCase().replace(/\s+/g,'');
                    if (/^(PH|TG|XG|HM|CA|CF|CH|G|PS)\d{2,}/.test(token)) continue;
                    if (token === normalizedCode) continue;
                    const brand = detectBrandForToken(t, token);
                    if (brand) collected.add(token);
                }
            });
        }
    } catch (_) {}

    // Try Partshawk (some pages list Interchange OEMs with brand names)
    try {
        const url2 = `https://partshawk.com/fram-${normalizedCode.toLowerCase()}-engine-oil-filter.html`;
        const res2 = await axios.get(url2, { timeout: 7000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (res2.status === 200 && res2.data) {
            const $ = cheerio.load(res2.data);
            $('div, section, article, ul, li, p, table, td, span').each((_, el) => {
                const t = ($(el).text() || '').trim();
                if (!t) return;
                const matches = t.match(/\b[A-Z0-9]{2,}(?:[-\/\.][A-Z0-9]{2,})+\b/g) || [];
                for (const m of matches) {
                    const token = m.toUpperCase().replace(/\s+/g,'');
                    if (/^(PH|TG|XG|HM|CA|CF|CH|G|PS)\d{2,}/.test(token)) continue;
                    if (token === normalizedCode) continue;
                    const brand = detectBrandForToken(t, token);
                    if (brand) collected.add(token);
                }
            });
        }
    } catch (_) {}

    const ordered = orderTokens(collected);
    if (ordered.length) return ordered.slice(0, 20);

    // Final fallback: curated popular OEMs per FRAM code
    const curated = getCuratedPopularOEM(normalizedCode, BRAND_PRIORITY);
    return curated.slice(0, 20);
}

// Cross-Reference extraction (aftermarket) with curated fallback
async function fetchFramCross(normalizedCode) {
    const crossSet = new Set();

    // Helper to scan HTML blocks for interchange style content
    function extractCrossFromHtml(html) {
        try {
            const $ = cheerio.load(html);
            $('li, p, td, div, span').each((_, el) => {
                const t = ($(el).text() || '').trim();
                if (!t) return;
                const tl = t.toLowerCase();
                const brand = detectAftermarketBrandFromText(tl);
                if (!brand) return;
                const matches = t.match(/[A-Z0-9][A-Z0-9\-\/\.\s]{2,}/g) || [];
                for (const m of matches) {
                    const token = m.toUpperCase();
                    // Skip FRAM own codes
                    if (/^(PH|TG|XG|HM|CA|CF|CH|G|PS)\d{2,}/.test(token)) continue;
                    if (token.replace(/\s+/g, '') === normalizedCode) continue;
                    if (tokenMatchesAftermarket(token, brand)) {
                        crossSet.add(`${brand} ${token.replace(/\s+/g,'')}`);
                    }
                }
            });
        } catch (_) { /* ignore */ }
    }

    // Try external catalogs
    try {
        const plentyUrl = `https://plenty.parts/en/search?q=${encodeURIComponent(normalizedCode)}`;
        const res = await axios.get(plentyUrl, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        extractCrossFromHtml(res.data);
    } catch (_) {}

    try {
        const partshawkUrl = `https://www.partshawk.com/fram-${normalizedCode.toLowerCase()}.html`;
        const res2 = await axios.get(partshawkUrl, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        extractCrossFromHtml(res2.data);
    } catch (_) {}

    let crossArr = Array.from(crossSet);
    if (crossArr.length > 0) {
        crossArr = orderByCrossBrandPriority(crossArr).slice(0, 20);
        return crossArr;
    }

    // Curated fallback for common FRAM codes
    const curated = {
        'PH3614': [
            'MOTORCRAFT FL-400S',
            'PUROLATOR L10241',
            'PUROLATOR PL10241',
            'WIX 51348',
            'NAPA 1348',
            'ACDELCO PF53',
            'BOSCH 3330',
            'K&N HP-1002',
            'K&N PS-1002',
            'BALDWIN B1405',
            'HASTINGS LF589',
            'CARQUEST 85348',
            'MANN W 712/83',
            'STP S3614',
            'CHAMP PH2835',
            'MICROGARD MGL51348',
            'MOPAR MO-090',
            'DENSO 150-1002'
        ],
        'PH6607': [
            'MOTORCRAFT FL-816',
            'PUROLATOR L14610',
            'PUROLATOR PL14610',
            'WIX 51356',
            'WIX 57356',
            'NAPA 1356',
            'ACDELCO PF1233',
            'BOSCH 3323',
            'K&N HP-1010',
            'K&N PS-1010',
            'STP S6607',
            'CHAMP PH2867',
            'MICROGARD MGL51356',
            'CARQUEST 85356',
            'MOBIL 1 M1-110',
            'DENSO 150-1010',
            'SUPERTECH ST6607',
            'PREMIUM GUARD PG4610',
            'HASTINGS LF580',
            'BALDWIN B1408'
        ],
        'TG7317': [
            'MOTORCRAFT FL-910S',
            'PUROLATOR L14610',
            'PUROLATOR PL14610',
            'WIX 51356',
            'WIX 57356',
            'NAPA 1356',
            'ACDELCO PF1233',
            'BOSCH 3323',
            'K&N HP-1010',
            'K&N PS-1010',
            'STP S7317',
            'CHAMP PH2867',
            'MICROGARD MGL51356',
            'CARQUEST 85356',
            'MOBIL 1 M1-110',
            'DENSO 150-1010',
            'SUPERTECH ST7317',
            'PREMIUM GUARD PG4610',
            'HASTINGS LF580',
            'BALDWIN B1408'
        ]
    };

    if (curated[normalizedCode]) {
        return curated[normalizedCode].slice(0, 20);
    }

    return [];
}

function orderByBrandPriority(tokens, BRAND_PRIORITY) {
    // Brand inferred from token via regex; if none, push to end
    function inferBrand(token) {
        const raw = token; // token already uppercase/no spaces
        for (const b of BRAND_PRIORITY) {
            if (tokenMatchesBrand(raw, b)) return b;
        }
        return null;
    }
    return tokens.sort((a, b) => {
        const ba = inferBrand(a);
        const bb = inferBrand(b);
        const ia = ba ? BRAND_PRIORITY.indexOf(ba) : BRAND_PRIORITY.length;
        const ib = bb ? BRAND_PRIORITY.indexOf(bb) : BRAND_PRIORITY.length;
        return ia - ib;
    });
}

// Curated OEMs map loader (external JSON with fallback)
const fs = require('fs');
const path = require('path');
let POPULAR_OEM_BY_FRAM = null;

function loadPopularOemByFram() {
    if (POPULAR_OEM_BY_FRAM) return POPULAR_OEM_BY_FRAM;
    try {
        const jsonPath = path.resolve(__dirname, '../../data/fram_oem_map.json');
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        // Expect shape: { FRAM_CODE: [ 'OEM1', 'OEM2', ... ] }
        POPULAR_OEM_BY_FRAM = parsed;
        return POPULAR_OEM_BY_FRAM;
    } catch (_) {
        // Fallback to embedded curated lists
        POPULAR_OEM_BY_FRAM = {
            'PH3614': [
                // Ford
                'FL-400S','AA5Z-6731-A','1S7Z-6731-DA',
                // Toyota/Lexus (popular catalog references)
                '90915-YZZD1','90915-YZZD3','90915-YZZD4','90915-03002','90915-20002',
                // Audi/VW
                '047115561B','047115561F','047115561G','030115561F',
                // Nissan (service common)
                '15208-65F0A','15208-9E000',
                // Kia/Hyundai (common catalog entries)
                '26300-35503','26300-35500',
                // BMW (less common, include a typical oil filter code)
                '11427512300'
            ],
            'PH4967': [
                // Toyota spin-on compact
                '90915-YZZN1','9091510009','90915-10009',
                // Suzuki common oil
                '16510-83011','16510-82703','16510-81403'
            ],
            'PH7317': [
                // Honda/Acura
                '15400-PLM-A01','15400-PLM-A02','15400-PLM-A03','15400-PR3-004',
                // Nissan/Infiniti interchange with Honda size (service variants)
                '15208-65F0E','15208-65F0B'
            ],
            'PH6607': [
                // Nissan
                '15208-65F0A','15208-9E01A','15208-9E000'
            ]
        };
        return POPULAR_OEM_BY_FRAM;
    }
}

function getCuratedPopularOEM(normalizedCode, BRAND_PRIORITY) {
    const map = loadPopularOemByFram();
    const list = map[normalizedCode] || [];
    // Filter by brand patterns and reorder by priority
    const filtered = list.filter(tok => {
        for (const b of BRAND_PRIORITY) {
            if (tokenMatchesBrand(tok, b)) return true;
        }
        return false;
    });
    return orderByBrandPriority(filtered, BRAND_PRIORITY);
}

// Global OEM→FRAM resolution using curated lists
function resolveFramByCuratedOEM(oemCode) {
    const canon = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const q = canon(oemCode);
    if (!q) return null;
    const map = loadPopularOemByFram();
    for (const [framCode, oemList] of Object.entries(map)) {
        for (const tok of oemList) {
            if (canon(tok) === q) return framCode;
        }
    }
    return null;
}

/**
 * Validate and scrape FRAM filter codes
 */
async function validateFramCode(code) {
    try {
        const normalizedCodeRaw = code.toUpperCase().trim();
        const normalizedCode = normalizedCodeRaw.replace(/[^A-Z0-9]/g, '');
        console.log(`📡 FRAM scraper: ${normalizedCode}`);

        // Helper: always extract exactly 4 numeric digits from the code
        const getLast4 = (s) => {
            const digits = String(s || '').replace(/\D/g, '');
            if (!digits) return null;
            return digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '0');
        };

        // =====================================================================
        // EARLY PATTERN DETECTION - All FRAM Series
        // =====================================================================

        // PH Series - Oil Filters (Standard)
        if (/^PH\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'OIL',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty'],
                attributes: {
                    series: 'PH',
                    type: 'Spin-On Oil Filter',
                    media_type: 'Cellulose',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // TG Series - Oil Filters (Tough Guard)
        if (/^TG\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'OIL',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty'],
                attributes: {
                    series: 'TG',
                    type: 'Tough Guard Oil Filter',
                    media_type: 'Synthetic Blend',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // XG Series - Oil Filters (Extra Guard)
        if (/^XG\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'OIL',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty'],
                attributes: {
                    series: 'XG',
                    type: 'Extra Guard Oil Filter',
                    media_type: 'Synthetic Blend',
                    service_life: 'Extended',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // HM Series - Oil Filters (High Mileage)
        if (/^HM\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'OIL',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty', 'High Mileage'],
                attributes: {
                    series: 'HM',
                    type: 'High Mileage Oil Filter',
                    media_type: 'Synthetic Blend',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // CA Series - Air Filters ✅ AGREGADO
        if (/^CA\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'AIRE',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty', 'Passenger Vehicles'],
                attributes: {
                    series: 'CA',
                    type: 'Air Filter',
                    media_type: 'Paper/Synthetic Blend',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // CF Series - Cabin Air Filters (FreshBreeze)
        if (/^CF\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'CABIN',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty', 'Passenger Vehicles'],
                attributes: {
                    series: 'CF',
                    type: 'Cabin Air Filter',
                    media_type: 'Activated Carbon',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // CH Series - Cabin Air Filters (Standard)
        if (/^CH\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'CABIN',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty', 'Passenger Vehicles'],
                attributes: {
                    series: 'CH',
                    type: 'Cabin Air Filter',
                    media_type: 'Particulate',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // G Series - Fuel Filters (In-Line)
        if (/^G\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'FUEL',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty', 'Gasoline Engines'],
                attributes: {
                    series: 'G',
                    type: 'In-Line Fuel Filter',
                    media_type: 'Paper',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // PS Series - Fuel Filters (Cartridge)
        if (/^PS\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            const oemNumbers = await fetchFramOEM(normalizedCode);
            const crossRefs = await fetchFramCross(normalizedCode);
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'FUEL',
                duty: 'LD',
                last4: getLast4(normalizedCode),
                cross: crossRefs,
                applications: ['Light Duty', 'Diesel Engines'],
                attributes: {
                    series: 'PS',
                    type: 'Fuel/Water Separator',
                    media_type: 'Paper',
                    ...(oemNumbers.length ? { oem_numbers: oemNumbers } : {})
                }
            };
        }

        // =====================================================================
        // WEB SCRAPING (Optional Enhancement)
        // =====================================================================
        
        try {
            const url = `https://www.fram.com/products/${normalizedCode.toLowerCase()}`;
            const response = await axios.get(url, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.status === 200) {
                console.log(`✅ FRAM web verification successful: ${normalizedCode}`);
                // Extract OEM numbers from product HTML
                try {
                    const oemNumbers = fetchFramOEM(normalizedCode);
                    // We won't return here because pattern detection handles return
                } catch(_) {}
            }
        } catch (webError) {
            // Web scraping failed, but pattern detection is enough
            console.log(`⚠️  FRAM web lookup failed (non-critical): ${webError.message}`);
        }

        // If no pattern matched, code is not valid
        console.log(`❌ FRAM filter not found: ${normalizedCode}`);
        return { valid: false };

    } catch (error) {
        console.error(`❌ FRAM scraper error: ${error.message}`);
        return { valid: false };
    }
}

// ============================================================================
// EXPORT
// ============================================================================

// Wrapper to provide a bridge-compatible shape
async function scrapeFram(inputCode) {
    const result = await validateFramCode(inputCode);

    if (result && result.valid) {
        return {
            found: true,
            code: result.code,
            original_code: inputCode,
            series: result.attributes?.series || null,
            family: result.family || null,
            family_hint: result.family || null,
            last4: result.last4,
            cross: result.cross || [],
            applications: result.applications || [],
            attributes: result.attributes || {}
        };
    }

    return { found: false };
}

module.exports = {
    validateFramCode,
    scrapeFram,
    scrapeFramFilter: validateFramCode, // Alias for compatibility
    resolveFramByCuratedOEM,
    // Export helpers for testing regional aftermarket brand patterns
    detectAftermarketBrandFromText,
    tokenMatchesAftermarket,
    orderByCrossBrandPriority
};
