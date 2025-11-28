// ============================================================================
// VIN SERVICE - Complete with Filter Lookup
// VIN Decoding + Vehicle Filter Recommendations
// ============================================================================

const axios = require('axios');

// Import detection service directly
let detectFilter;
try {
    detectFilter = require('./detectionServiceFinal').detectFilter;
} catch (error) {
    console.error('⚠️  Could not import detectFilter:', error.message);
}

// ============================================================================
// VIN VALIDATION
// ============================================================================

/**
 * Validate VIN format
 */
function isValidVIN(vin) {
    if (!vin || typeof vin !== 'string') return false;
    return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

/**
 * Calculate VIN check digit
 */
function calculateCheckDigit(vin) {
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const transliterationTable = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
        'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
    };

    let sum = 0;
    for (let i = 0; i < 17; i++) {
        const char = vin[i];
        const value = transliterationTable[char] || parseInt(char);
        sum += value * weights[i];
    }

    const remainder = sum % 11;
    return remainder === 10 ? 'X' : remainder.toString();
}

// ============================================================================
// VIN DECODING (NHTSA API)
// ============================================================================

/**
 * Decode VIN using NHTSA API
 */
async function decodeVINFromNHTSA(vin) {
    try {
        const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`;
        
        const response = await axios.get(url, { timeout: 10000 });
        
        if (!response.data || !response.data.Results) {
            throw new Error('Invalid response from NHTSA API');
        }

        const results = response.data.Results;
        
        // Extract key information
        const vehicleInfo = {
            make: getValue(results, 'Make'),
            model: getValue(results, 'Model'),
            year: getValue(results, 'Model Year'),
            manufacturer: getValue(results, 'Manufacturer Name'),
            vehicle_type: getValue(results, 'Vehicle Type'),
            body_class: getValue(results, 'Body Class'),
            engine: {
                displacement_l: getValue(results, 'Displacement (L)'),
                displacement_ci: getValue(results, 'Displacement (CI)'),
                cylinders: getValue(results, 'Engine Number of Cylinders'),
                fuel_type: getValue(results, 'Fuel Type - Primary'),
                horsepower: getValue(results, 'Engine Brake (hp)'),
                model: getValue(results, 'Engine Model')
            },
            trim: getValue(results, 'Trim'),
            series: getValue(results, 'Series'),
            drive_type: getValue(results, 'Drive Type'),
            fuel_type: getValue(results, 'Fuel Type - Primary'),
            gvwr: getValue(results, 'Gross Vehicle Weight Rating From')
        };

        return vehicleInfo;

    } catch (error) {
        console.error('NHTSA API error:', error.message);
        return null;
    }
}

function getValue(results, variableName) {
    const item = results.find(r => r.Variable === variableName);
    return item && item.Value !== 'Not Applicable' && item.Value !== '' ? item.Value : null;
}

// ============================================================================
// FILTER RECOMMENDATIONS BY VEHICLE
// ============================================================================

/**
 * Get filter OEM codes based on vehicle info
 * Returns OEM/Cross-reference codes only - SKU generation happens separately
 */
async function getFilterCodes(vehicleInfo) {
    try {
        // Determine duty type
        const duty = determineVehicleDuty(vehicleInfo);
        
        console.log(`🚗 Vehicle duty detected: ${duty}`);

        // Get OEM filter codes based on make/model/year
        const filterCodes = await lookupFiltersByVehicle(
            vehicleInfo.make,
            vehicleInfo.model,
            vehicleInfo.year,
            duty
        );

        return {
            duty,
            codes: filterCodes
        };

    } catch (error) {
        console.error('Filter codes lookup error:', error.message);
        return null;
    }
}

/**
 * Determine if vehicle is Heavy Duty or Light Duty
 */
function determineVehicleDuty(vehicleInfo) {
    // Heavy Duty indicators
    const hdIndicators = [
        'truck', 'bus', 'tractor', 'heavy', 'commercial', 'diesel',
        'class 7', 'class 8', 'semi', 'kenworth', 'peterbilt', 
        'freightliner', 'mack', 'volvo', 'international'
    ];

    const vehicleText = JSON.stringify(vehicleInfo).toLowerCase();
    
    // Check GVWR (Gross Vehicle Weight Rating)
    if (vehicleInfo.gvwr) {
        const gvwr = parseInt(vehicleInfo.gvwr.replace(/[^0-9]/g, ''));
        if (gvwr >= 26000) return 'HD'; // Class 7-8 trucks
    }

    // Check vehicle type and body class
    if (vehicleInfo.vehicle_type && 
        (vehicleInfo.vehicle_type.toLowerCase().includes('truck') ||
         vehicleInfo.vehicle_type.toLowerCase().includes('bus'))) {
        return 'HD';
    }

    // Check for HD keywords
    for (const indicator of hdIndicators) {
        if (vehicleText.includes(indicator)) {
            return 'HD';
        }
    }

    // Check fuel type - diesel often indicates HD
    if (vehicleInfo.fuel_type && vehicleInfo.fuel_type.toLowerCase().includes('diesel')) {
        // Large displacement diesel = likely HD
        if (vehicleInfo.engine.displacement_l && parseFloat(vehicleInfo.engine.displacement_l) > 6.0) {
            return 'HD';
        }
    }

    return 'LD'; // Default to Light Duty
}

/**
 * Lookup filter codes by vehicle (placeholder - integrate with filter database)
 */
async function lookupFiltersByVehicle(make, model, year, duty) {
    try {
        // TODO: Integrate with filter database API
        // For now, return common filter codes based on make
        
        const filterDatabase = {
            // Light Duty (FRAM codes)
            'LD': {
                'FORD': {
                    oil_filter: 'PH8A',
                    air_filter: 'CA10262',
                    fuel_filter: 'G3727',
                    cabin_filter: 'CF10285'
                },
                'CHEVROLET': {
                    oil_filter: 'PH3614',
                    air_filter: 'CA9997',
                    fuel_filter: 'G6607',
                    cabin_filter: 'CF10709'
                },
                'TOYOTA': {
                    oil_filter: 'PH7317',
                    air_filter: 'CA10467',
                    fuel_filter: 'G3727',
                    cabin_filter: 'CF11182'
                },
                'HONDA': {
                    oil_filter: 'PH7317',
                    air_filter: 'CA10262',
                    fuel_filter: null,
                    cabin_filter: 'CF10134'
                }
            },
            // Heavy Duty (Donaldson codes)
            'HD': {
                'FREIGHTLINER': {
                    oil_filter: 'P552100',
                    air_filter: 'P150695',
                    fuel_filter: 'P551329',
                    cabin_filter: null
                },
                'PETERBILT': {
                    oil_filter: 'P552100',
                    air_filter: 'P181050',
                    fuel_filter: 'P551329',
                    cabin_filter: null
                },
                'KENWORTH': {
                    oil_filter: 'P552100',
                    air_filter: 'P181050',
                    fuel_filter: 'P551329',
                    cabin_filter: null
                },
                'INTERNATIONAL': {
                    oil_filter: 'P552100',
                    air_filter: 'P150695',
                    fuel_filter: 'P551329',
                    cabin_filter: null
                },
                'CATERPILLAR': {
                    oil_filter: 'P552100',
                    air_filter: 'P150695',
                    fuel_filter: 'P551329',
                    cabin_filter: null
                }
            }
        };

        const makeUpper = make?.toUpperCase();
        const dutyFilters = filterDatabase[duty] || filterDatabase['LD'];
        
        return dutyFilters[makeUpper] || {
            oil_filter: duty === 'HD' ? 'P552100' : 'PH8A',
            air_filter: duty === 'HD' ? 'P150695' : 'CA10262',
            fuel_filter: duty === 'HD' ? 'P551329' : 'G3727',
            cabin_filter: duty === 'LD' ? 'CF10285' : null
        };

    } catch (error) {
        console.error('Filter lookup error:', error.message);
        return {};
    }
}

// ============================================================================
// MAIN VIN DECODE + FILTER LOOKUP
// ============================================================================

/**
 * Complete VIN service - Decode + Filter Recommendations
 */
async function processVIN(vin) {
    try {
        console.log(`🔍 Processing VIN: ${vin}`);

        // Step 1: Validate VIN format
        if (!isValidVIN(vin)) {
            return {
                valid: false,
                error: 'Invalid VIN format. VIN must be 17 characters (no I, O, Q).'
            };
        }

        const vinUpper = vin.toUpperCase();
        
        // Step 2: Decode VIN with NHTSA
        console.log('📡 Decoding VIN with NHTSA API...');
        const vehicleInfo = await decodeVINFromNHTSA(vinUpper);

        if (!vehicleInfo || !vehicleInfo.make) {
            return {
                valid: true,
                vin: vinUpper,
                error: 'Could not decode vehicle information from VIN',
                suggestion: 'Please provide Year, Make, and Model manually'
            };
        }

        console.log(`✅ Vehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`);

        // Step 3: Get OEM filter codes
        console.log('🔧 Looking up OEM filter codes...');
        const filterData = await getFilterCodes(vehicleInfo);

        if (!filterData || !filterData.codes) {
            return {
                valid: true,
                vin: vinUpper,
                vehicle: {
                    year: vehicleInfo.year,
                    make: vehicleInfo.make,
                    model: vehicleInfo.model,
                    manufacturer: vehicleInfo.manufacturer,
                    engine: vehicleInfo.engine,
                    vehicle_type: vehicleInfo.vehicle_type,
                    body_class: vehicleInfo.body_class,
                    fuel_type: vehicleInfo.fuel_type,
                    duty: determineVehicleDuty(vehicleInfo)
                },
                filters: {},
                message: 'VIN decoded - no filter codes found for this vehicle'
            };
        }

        // Step 4: Convert OEM codes to ELIMFILTERS SKUs
        console.log('🔄 Converting OEM codes to ELIMFILTERS SKUs...');
        const filters = {};
        
        for (const [filterType, oemCode] of Object.entries(filterData.codes)) {
            if (oemCode) {
                try {
                    console.log(`  Converting ${filterType}: ${oemCode}`);
                    
                    // Call detectFilter directly
                    if (!detectFilter) {
                        throw new Error('detectFilter not available');
                    }
                    
                    const result = await detectFilter(oemCode);
                    
                    if (result.success && result.status === 'OK') {
                        filters[filterType] = {
                            sku: result.sku,
                            oem_code: oemCode,
                            family: result.family,
                            duty: result.duty,
                            media: result.media,
                            cross_reference: result.cross_reference || [],
                            applications: result.applications || [],
                            attributes: result.attributes || {}
                        };
                        console.log(`  ✅ ${filterType}: ${oemCode} → ${result.sku}`);
                    } else {
                        // If conversion fails, still include OEM code
                        filters[filterType] = {
                            sku: null,
                            oem_code: oemCode,
                            note: 'SKU generation pending - OEM code available'
                        };
                        console.log(`  ⚠️  ${filterType}: ${oemCode} → Pending`);
                    }
                } catch (error) {
                    console.error(`  ❌ Error converting ${oemCode}:`, error.message);
                    filters[filterType] = {
                        sku: null,
                        oem_code: oemCode,
                        error: error.message || 'Conversion failed'
                    };
                }
            }
        }

        // Step 5: Build response with ELIMFILTERS SKUs
        return {
            success: true,
            valid: true,
            vin: vinUpper,
            vehicle: {
                year: vehicleInfo.year,
                make: vehicleInfo.make,
                model: vehicleInfo.model,
                manufacturer: vehicleInfo.manufacturer,
                engine: vehicleInfo.engine,
                vehicle_type: vehicleInfo.vehicle_type,
                body_class: vehicleInfo.body_class,
                fuel_type: vehicleInfo.fuel_type,
                duty: filterData.duty
            },
            filters: filters,
            message: 'VIN decoded successfully - ELIMFILTERS SKUs generated'
        };

    } catch (error) {
        console.error('VIN processing error:', error);
        return {
            valid: false,
            error: 'Error processing VIN',
            details: error.message
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    processVIN,
    decodeVINFromNHTSA,
    getFilterCodes,
    isValidVIN
};
