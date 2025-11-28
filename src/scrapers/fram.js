// ============================================================================
// FRAM SCRAPER - Complete with ALL Series
// Series: PH, TG, XG, HM, CH, CA, CF, G, PS
// ============================================================================

const axios = require('axios');

/**
 * Validate and scrape FRAM filter codes
 */
async function validateFramCode(code) {
    try {
        const normalizedCode = code.toUpperCase().trim();
        console.log(`📡 FRAM scraper: ${normalizedCode}`);

        // =====================================================================
        // EARLY PATTERN DETECTION - All FRAM Series
        // =====================================================================

        // PH Series - Oil Filters (Standard)
        if (/^PH\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'OIL',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty'],
                attributes: {
                    series: 'PH',
                    type: 'Spin-On Oil Filter'
                    // media_type removed - will be set by mediaMapper
                }
            };
        }

        // TG Series - Oil Filters (Tough Guard)
        if (/^TG\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'OIL',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty'],
                attributes: {
                    series: 'TG',
                    type: 'Tough Guard Oil Filter'
                }
            };
        }

        // XG Series - Oil Filters (Extra Guard)
        if (/^XG\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'OIL',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty'],
                attributes: {
                    series: 'XG',
                    type: 'Extra Guard Oil Filter',
                    service_life: 'Extended'
                }
            };
        }

        // HM Series - Oil Filters (High Mileage)
        if (/^HM\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'OIL',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty', 'High Mileage'],
                attributes: {
                    series: 'HM',
                    type: 'High Mileage Oil Filter'
                }
            };
        }

        // CA Series - Air Filters ✅ AGREGADO
        if (/^CA\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'AIR',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty', 'Passenger Vehicles'],
                attributes: {
                    series: 'CA',
                    type: 'Air Filter'
                }
            };
        }

        // CF Series - Cabin Air Filters (FreshBreeze)
        if (/^CF\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'CABIN',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty', 'Passenger Vehicles'],
                attributes: {
                    series: 'CF',
                    type: 'Cabin Air Filter'
                }
            };
        }

        // CH Series - Cabin Air Filters (Standard)
        if (/^CH\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'CABIN',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty', 'Passenger Vehicles'],
                attributes: {
                    series: 'CH',
                    type: 'Cabin Air Filter'
                }
            };
        }

        // G Series - Fuel Filters (In-Line)
        if (/^G\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'FUEL',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty', 'Gasoline Engines'],
                attributes: {
                    series: 'G',
                    type: 'In-Line Fuel Filter'
                }
            };
        }

        // PS Series - Fuel Filters (Cartridge)
        if (/^PS\d{3,5}[A-Z]?$/.test(normalizedCode)) {
            return {
                valid: true,
                code: normalizedCode,
                source: 'FRAM',
                family: 'FUEL',
                duty: 'LD',
                last4: normalizedCode.slice(-4),
                cross: [],
                applications: ['Light Duty', 'Diesel Engines'],
                attributes: {
                    series: 'PS',
                    type: 'Fuel/Water Separator'
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
                // Could parse HTML here for additional details
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

module.exports = {
    validateFramCode,
    scrapeFramFilter: validateFramCode,
    scrapeFram: validateFramCode
};
