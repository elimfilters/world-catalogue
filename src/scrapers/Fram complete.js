// ============================================================================
// FRAM SCRAPER - Complete Version with ALL Series
// Supports: PH, TG, XG, HM, CH, CA, CF, G, PS
// ============================================================================

const axios = require('axios');

/**
 * Comprehensive FRAM database
 */
const FRAM_DATABASE = {
    // ========== PH-SERIES (Extra Guard - Oil) ==========
    'PH7405': {
        family: 'OIL',
        type: 'Extra Guard H.D. Oil Filter',
        series: 'PH',
        specifications: {
            efficiency: '95% dirt-trapping',
            capacity: 'Up to 10,000 miles',
            media_type: 'Cellulose and glass blended',
            style: 'Spin-On'
        },
        cross_references: {
            'DONALDSON-P552100': 'PH7405',
            'FLEETGUARD-LF3620': 'PH7405',
            'BALDWIN-B495': 'PH7405'
        },
        applications: ['FREIGHTLINER', 'DETROIT DIESEL', 'INTERNATIONAL']
    },
    'PH7405A': {
        family: 'OIL',
        type: 'Extra Guard Oil Filter',
        series: 'PH',
        specifications: {
            efficiency: '95% dirt-trapping',
            capacity: 'Up to 10,000 miles',
            media_type: 'Cellulose and glass blended'
        },
        cross_references: {
            'DONALDSON-P552100': 'PH7405A',
            'FLEETGUARD-LF3620': 'PH7405A'
        },
        applications: ['FREIGHTLINER', 'PETERBILT']
    },
    'PH8A': {
        family: 'OIL',
        type: 'Extra Guard Oil Filter',
        series: 'PH',
        specifications: {
            efficiency: '95% @ 20 micron',
            capacity: '5,000-10,000 miles',
            media_type: 'Cellulose/Synthetic blend'
        },
        cross_references: {
            'MOTORCRAFT-FL1A': 'PH8A',
            'WIX-51515': 'PH8A',
            'PUROLATOR-L30001': 'PH8A'
        },
        applications: ['Ford', 'GM', 'Marine engines']
    },

    // Bosch 3311 cross-reference coverage (Toyota applications)
    'PH4967': {
        family: 'OIL',
        type: 'Extra Guard Oil Filter',
        series: 'PH',
        specifications: {
            efficiency: '95% @ 20 micron',
            capacity: '5,000-10,000 miles',
            media_type: 'Cellulose/Synthetic blend'
        },
        cross_references: {
            'BOSCH-3311': 'PH4967',
            'BOSCH3311': 'PH4967',
            'TOYOTA-90915-YZZN1': 'PH4967',
            '90915-YZZN1': 'PH4967',
            '90915YZZN1': 'PH4967'
        },
        applications: ['Toyota', 'Lexus', 'Light Duty']
    },
    // WIX compact Nissan/Honda size (includes XP variant)
    'PH6607': {
        family: 'OIL',
        type: 'Extra Guard Oil Filter',
        series: 'PH',
        specifications: {
            efficiency: '95% @ 20 micron',
            capacity: '5,000-10,000 miles',
            media_type: 'Cellulose/Synthetic blend'
        },
        cross_references: {
            'WIX-51356': 'PH6607',
            'WIX-57356': 'PH6607',
            'WIX-57356XP': 'PH6607',
            '51356': 'PH6607',
            '57356': 'PH6607',
            '57356XP': 'PH6607'
        },
        applications: ['Nissan', 'Honda/Acura', 'Light Duty']
    },
    'PH2951': {
        family: 'OIL',
        type: 'Extra Guard Oil Filter',
        series: 'PH',
        specifications: {
            efficiency: '95% @ 20 micron',
            capacity: '5,000-10,000 miles',
            media_type: 'Cellulose/Synthetic blend'
        },
        cross_references: {
            'BOSCH-3311': 'PH2951',
            'BOSCH3311': 'PH2951'
        },
        applications: ['Toyota', 'Lexus', 'Light Duty']
    },
    
    // ========== TG-SERIES (Tough Guard - Oil) ==========
    'TG7317': {
        family: 'OIL',
        type: 'Tough Guard Oil Filter',
        series: 'TG',
        specifications: {
            efficiency: '98% @ 20 micron',
            capacity: 'Up to 10,000 miles',
            media_type: 'Cellulose/Synthetic blend',
            adbv: 'Silicone'
        },
        cross_references: {
            'PH7317': 'TG7317',  // Same fitment
            'XG7317': 'TG7317'   // Same fitment
        },
        applications: ['Honda', 'Acura', 'Light Duty']
    },
    'TG8A': {
        family: 'OIL',
        type: 'Tough Guard Oil Filter',
        series: 'TG',
        specifications: {
            efficiency: '98% @ 20 micron',
            capacity: 'Up to 10,000 miles',
            media_type: 'Stronger blend',
            adbv: 'Silicone'
        },
        cross_references: {
            'PH8A': 'TG8A',
            'XG8A': 'TG8A'
        },
        applications: ['Ford', 'GM', 'Light Duty']
    },
    
    // ========== XG-SERIES (Ultra Synthetic - Oil) ==========
    'XG7317': {
        family: 'OIL',
        type: 'Ultra Synthetic Oil Filter',
        series: 'XG',
        specifications: {
            efficiency: '99% @ 20 micron',
            capacity: 'Up to 20,000 miles',
            media_type: 'Full Synthetic dual layer',
            adbv: 'Silicone'
        },
        cross_references: {
            'PH7317': 'XG7317',
            'TG7317': 'XG7317'
        },
        applications: ['Honda', 'Acura', 'Extended service']
    },
    'XG8A': {
        family: 'OIL',
        type: 'Ultra Synthetic Oil Filter',
        series: 'XG',
        specifications: {
            efficiency: '99% @ 20 micron',
            capacity: 'Up to 20,000 miles',
            media_type: 'Full Synthetic'
        },
        cross_references: {
            'PH8A': 'XG8A',
            'TG8A': 'XG8A',
            'AMSOIL-EAO': 'XG8A',
            'ROYAL-PURPLE-30-8A': 'XG8A'
        },
        applications: ['Ford', 'GM', 'Extended service']
    },
    // FCA/GM family – fits Alfa Romeo Giulia/Stelvio and many FCA/GM apps
    'XG10060': {
        family: 'OIL',
        type: 'Ultra Synthetic Oil Filter',
        series: 'XG',
        specifications: {
            efficiency: '99% @ 20 micron',
            capacity: 'Up to 20,000 miles',
            media_type: 'Full Synthetic dual layer',
            style: 'Spin-On'
        },
        cross_references: {
            // Removed PG-derived cross references per manufacturer verification request
            // OE Mopar/Alfa Romeo/Chrysler
            'CHRYSLER-68324623AA': 'XG10060',
            'CHRYSLER-68335191AA': 'XG10060',
            '68324623AA': 'XG10060',
            '68335191AA': 'XG10060',
            // ECOGARD / STP / Carquest / Cartek
            'ECOGARD-X11578': 'XG10060',
            'X11578': 'XG10060',
            'STP-S45035XL': 'XG10060',
            'CARQUEST-95470': 'XG10060',
            'CARTEK-CTK99369XL': 'XG10060',
            // WIX mapping observed in field usage
            'WIX-57060': 'XG10060',
            'WIX-57060XP': 'XG10060'
        },
        applications: ['Alfa Romeo Giulia', 'Alfa Romeo Stelvio', 'Chrysler/Dodge/Jeep', 'GM']
    },
    
    // ========== HM-SERIES (High Mileage - Oil) ==========
    'HM7317': {
        family: 'OIL',
        type: 'High Mileage Oil Filter',
        series: 'HM',
        specifications: {
            capacity: 'Up to 10,000 miles',
            media_type: 'Tuned for older engines',
            gasket: 'Pliable for seepage prevention'
        },
        cross_references: {
            'PH7317': 'HM7317'
        },
        applications: ['High mileage vehicles', '100k+ miles']
    },
    
    // ========== CH-SERIES (Cabin/HVAC - Cartridge) ==========
    'CH9018': {
        family: 'CABIN',
        type: 'Extra Guard Cabin Air Filter',
        series: 'CH',
        specifications: {
            height: '3.583 inch',
            bottom_inside_diameter: '1.971 inch',
            filter_media: 'Cellulose/Synthetic Blend',
            o_ring_inside_diameter: '2.677 inch',
            o_ring_thickness: '0.118 inch'
        },
        cross_references: {},
        applications: ['Car & Truck', 'Light Duty']
    },
    
    // ========== CA-SERIES (Air Filters) ==========
    'CA10262': {
        family: 'AIRE',
        type: 'Extra Guard Air Filter',
        series: 'CA',
        specifications: {
            media_type: 'Cellulose',
            style: 'Panel'
        },
        cross_references: {},
        applications: ['Honda', 'Acura', 'Light Duty']
    },
    
    // ========== CF-SERIES (Cabin Air) ==========
    'CF10285': {
        family: 'CABIN',
        type: 'Fresh Breeze Cabin Air Filter',
        series: 'CF',
        specifications: {
            media_type: 'Activated Carbon',
            filtration: 'Odor & particulate'
        },
        cross_references: {
            'XC25851': 'CF10285',
            'ECOGARD-XC25851': 'CF10285'
        },
        applications: ['Passenger vehicles']
    },
    
    // ========== G-SERIES (Fuel) ==========
    'G3727': {
        family: 'FUEL',
        type: 'Fuel Filter',
        series: 'G',
        specifications: {
            media_type: 'Cellulose',
            water_separation: 'Yes'
        },
        cross_references: {},
        applications: ['Light Duty Diesel']
    },
    
    // ========== PS-SERIES (Fuel) ==========
    'PS10942': {
        family: 'FUEL',
        type: 'Fuel/Water Separator',
        series: 'PS',
        specifications: {
            media_type: 'Multi-layer',
            water_separation: 'Enhanced'
        },
        cross_references: {},
        applications: ['Diesel engines']
    }
};

/**
 * Detect series type from code
 */
function detectSeriesType(code) {
    const normalized = code.toUpperCase();
    
    // Check prefixes (order matters!)
    if (normalized.startsWith('PH')) return 'PH';
    if (normalized.startsWith('TG')) return 'TG';
    if (normalized.startsWith('XG')) return 'XG';
    if (normalized.startsWith('HM')) return 'HM';
    if (normalized.startsWith('CH')) return 'CH';
    if (normalized.startsWith('CF')) return 'CF';
    if (normalized.startsWith('CA')) return 'CA';
    if (normalized.startsWith('PS')) return 'PS';
    if (normalized.startsWith('G') && normalized.length > 1) return 'G';
    
    return null;
}

/**
 * Detect family from code patterns
 */
function detectFamilyFromCode(code) {
    const normalized = code.toUpperCase();
    const series = detectSeriesType(normalized);
    
    // Series-based detection
    if (series === 'PH' || series === 'TG' || series === 'XG' || series === 'HM') return 'OIL';
    if (series === 'CH' || series === 'CF') return 'CABIN';
    if (series === 'CA') return 'AIRE';
    if (series === 'G' || series === 'PS') return 'FUEL';
    
    return null;
}

/**
 * Find FRAM code from cross-reference
 */
function findFramCode(inputCode) {
    const normalized = inputCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Direct lookup
    if (FRAM_DATABASE[normalized]) {
        return normalized;
    }
    
    // Search in cross-references
    for (const [framCode, filterData] of Object.entries(FRAM_DATABASE)) {
        if (filterData.cross_references) {
            for (const [xrefCode, targetCode] of Object.entries(filterData.cross_references)) {
                const xrefNormalized = xrefCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (xrefNormalized === normalized || 
                    xrefNormalized.includes(normalized) || 
                    normalized.includes(xrefNormalized)) {
                    return framCode;
                }
            }
        }
    }
    
    return null;
}

/**
 * Main scraper function
 */
async function scrapeFram(code) {
    try {
        console.log(`📡 FRAM scraper: ${code}`);
        
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Step 1: Try cross-reference lookup
        let framCode = findFramCode(normalized);
        
        if (framCode && FRAM_DATABASE[framCode]) {
            const filter = FRAM_DATABASE[framCode];
            
            console.log(`✅ Found via cross-reference: ${code} → ${framCode} (${filter.series}-series)`);
            
            return {
                found: true,
                code: framCode,
                original_code: code,
                series: filter.series,
                family_hint: filter.family,
                cross: Object.keys(filter.cross_references || {}),
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Step 2: Try direct lookup
        if (FRAM_DATABASE[normalized]) {
            const filter = FRAM_DATABASE[normalized];
            
            console.log(`✅ Found directly: ${normalized} (${filter.series}-series)`);
            
            return {
                found: true,
                code: normalized,
                original_code: code,
                series: filter.series,
                family_hint: filter.family,
                cross: Object.keys(filter.cross_references || {}),
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Step 3: Pattern detection
        const series = detectSeriesType(normalized);
        const detectedFamily = detectFamilyFromCode(normalized);
        
        if (series && detectedFamily) {
            console.log(`✅ Pattern detected: ${normalized} → ${series}-series, ${detectedFamily}`);
            
            return {
                found: true,
                code: normalized,
                original_code: code,
                series: series,
                family_hint: detectedFamily,
                cross: [],
                applications: ['Light Duty'],
                attributes: {
                    source: 'Pattern Detection',
                    note: `Based on FRAM ${series}-series naming conventions`
                }
            };
        }
        
        // Step 4: Web lookup fallback
        try {
            const searchUrl = `https://www.fram.com/search/?q=${encodeURIComponent(normalized)}`;
            
            const response = await axios.get(searchUrl, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.data && response.data.toLowerCase().includes(normalized.toLowerCase())) {
                let familyFromWeb = null;
                const content = response.data.toLowerCase();
                
                if (content.includes('oil filter')) familyFromWeb = 'OIL';
                else if (content.includes('air filter') && !content.includes('cabin')) familyFromWeb = 'AIRE';
                else if (content.includes('cabin')) familyFromWeb = 'CABIN';
                else if (content.includes('fuel')) familyFromWeb = 'FUEL';
                
                console.log(`✅ Found on FRAM website: ${normalized}`);
                
                return {
                    found: true,
                    code: normalized,
                    original_code: code,
                    series: detectSeriesType(normalized),
                    family_hint: familyFromWeb || 'OIL',
                    cross: [],
                    applications: ['Light Duty'],
                    attributes: { source: 'FRAM Website' }
                };
            }
        } catch (webError) {
            console.log(`⚠️  Web lookup failed: ${webError.message}`);
        }
        
        // Step 5: Not found
        console.log(`⚠️  FRAM filter not found: ${code}`);
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
        console.error(`❌ FRAM scraper error: ${error.message}`);
        
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

module.exports = {
    scrapeFram,
    FRAM_DATABASE,
    findFramCode,
    detectSeriesType,
    detectFamilyFromCode
};
