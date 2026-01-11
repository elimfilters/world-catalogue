const Groq = require('groq-sdk');

const groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// PRE-DETECCIÓN: Patrones 100% verificados
function detectKnownPatterns(filterCode) {
    const code = filterCode.toUpperCase().trim();
    
    // DONALDSON - Patrón P-XXXXXX (6 dígitos)
    if (/^P\d{6}$/.test(code)) {
        return {
            manufacturer: 'Donaldson',
            tier: 'AFTERMARKET',
            duty: 'HEAVY DUTY (HD)',
            region: 'NORTH AMERICA',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // FLEETGUARD - Patrones LF/FF/FS/WF/AF/HF + dígitos
    if (/^(LF|FF|FS|WF|AF|HF)\d{4,5}$/.test(code)) {
        return {
            manufacturer: 'Fleetguard',
            tier: 'AFTERMARKET',
            duty: 'HEAVY DUTY (HD)',
            region: 'NORTH AMERICA',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    if (/^AH\d{4}$/.test(code)) {
        return {
            manufacturer: 'Fleetguard',
            tier: 'AFTERMARKET',
            duty: 'HEAVY DUTY (HD)',
            region: 'NORTH AMERICA',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH',
            filter_type: 'Air Housing'
        };
    }
    
    // BALDWIN - Patrones BT/PA/PF/BF/RS + dígitos
    if (/^(BT|PA|PF|BF|RS)\d{3,5}$/.test(code)) {
        return {
            manufacturer: 'Baldwin',
            tier: 'AFTERMARKET',
            duty: 'HEAVY DUTY (HD)',
            region: 'NORTH AMERICA',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // CATERPILLAR - Patrón XXX-XXXX (con guión) o 1R-XXXX
    if (/^\d{3}-\d{4}$/.test(code) || /^1R-\d{4}$/.test(code)) {
        return {
            manufacturer: 'Caterpillar',
            tier: 'TIER 1 - OEM',
            duty: 'HEAVY DUTY (HD)',
            region: 'NORTH AMERICA',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // CUMMINS - 7 dígitos numéricos puros
    if (/^\d{7}$/.test(code)) {
        return {
            manufacturer: 'Cummins',
            tier: 'TIER 1 - OEM',
            duty: 'HEAVY DUTY (HD)',
            region: 'NORTH AMERICA',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // FRAM - Patrones PH/CA/CH/G/CS + dígitos (LD)
    if (/^(PH|CA|CH|G|CS|HPG)\d{3,5}[A-Z]?$/.test(code)) {
        return {
            manufacturer: 'FRAM',
            tier: 'AFTERMARKET',
            duty: 'LIGHT DUTY (LD)',
            region: 'NORTH AMERICA',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // WIX - Patrón 5####XX (HD)
    if (/^5\d{4}[A-Z]{2}$/.test(code)) {
        return {
            manufacturer: 'Wix',
            tier: 'AFTERMARKET',
            duty: 'HEAVY DUTY (HD)',
            region: 'NORTH AMERICA',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // RACOR PARKER - Patrón R##-##M/MB (Brasil/Marine)
    if (/^R\d{2,3}-?\d{2,3}M[AB]?$/i.test(code)) {
        return {
            manufacturer: 'Racor Parker',
            tier: 'AFTERMARKET',
            duty: 'HEAVY DUTY (HD)',
            region: 'BRAZIL / LATAM / MARINE',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // MANN-FILTER - Patrón C#### (Air) o WK #### (Fuel)
    if (/^C\d{4}(\/\d)?$/.test(code)) {
        return {
            manufacturer: 'Mann-Filter',
            tier: 'AFTERMARKET',
            duty: 'LIGHT DUTY (LD)',
            region: 'EUROPE / GLOBAL',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH',
            filter_type: 'Air Filter'
        };
    }
    
    if (/^WK\s?\d{4}\s?[zZ]?$/.test(code)) {
        return {
            manufacturer: 'Mann-Filter',
            tier: 'AFTERMARKET',
            duty: 'LIGHT DUTY (LD)',
            region: 'EUROPE / GLOBAL',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH',
            filter_type: 'Fuel Filter'
        };
    }
    
    // TOYOTA - Patrón 90915-YZZXX
    if (/^90915-?[A-Z]{3,4}\d?$/i.test(code)) {
        return {
            manufacturer: 'Toyota',
            tier: 'TIER 1 - OEM',
            duty: 'LIGHT DUTY (LD)',
            region: 'GLOBAL (ASIA/LATAM/OCEANIA)',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // MERCEDES-BENZ - 10 dígitos numéricos (2########)
    if (/^2\d{9}$/.test(code)) {
        return {
            manufacturer: 'Mercedes-Benz',
            tier: 'TIER 1 - OEM',
            duty: 'LIGHT DUTY (LD)',
            region: 'EUROPE / GLOBAL',
            confidence: 'HIGH',
            method: 'PATTERN_MATCH'
        };
    }
    
    // No match - GROQ analiza
    return null;
}

async function detectManufacturerWithGroq(filterCode) {
    // PASO 1: Pre-detección de patrones conocidos
    const knownPattern = detectKnownPatterns(filterCode);
    if (knownPattern) {
        console.log('Pattern match found:', knownPattern.manufacturer);
        return knownPattern;
    }
    
    // PASO 2: GROQ analiza con razonamiento conceptual
    const systemPrompt = `You are a global automotive and heavy-duty filter expert with comprehensive knowledge of filter manufacturers worldwide.

CRITICAL REASONING FRAMEWORK:

STEP 1 - MANUFACTURER TYPE IDENTIFICATION:
Question: Does this company BUILD EQUIPMENT (vehicles, engines, machinery)?
- YES → TIER 1 - OEM (Original Equipment Manufacturer)
  Examples: Caterpillar (builds excavators), John Deere (builds tractors), Toyota (builds cars), Cummins (builds engines)
- NO → AFTERMARKET (makes replacement filters only)
  Examples: Donaldson, Fleetguard, Baldwin, FRAM, Wix, Mann-Filter, Racor Parker

STEP 2 - DUTY CLASSIFICATION:
Question: Is the equipment HEAVY DUTY or LIGHT DUTY?
- HEAVY DUTY (HD): Construction, mining, agriculture, commercial trucks, marine diesel, industrial equipment
- LIGHT DUTY (LD): Passenger cars, light trucks, SUVs, motorcycles

STEP 3 - CROSS-REFERENCE LOGIC:
- OEM filters = specific to THEIR equipment (Caterpillar for CAT machines, Toyota for Toyota cars)
- AFTERMARKET filters = designed to REPLACE multiple OEM brands
  * Donaldson replaces: Caterpillar, Komatsu, Volvo, John Deere (HD)
  * Fleetguard replaces: Cummins, Detroit, Mack, Volvo (HD)
  * FRAM replaces: Toyota, Ford, GM, Honda (LD)
  * Mann-Filter replaces: Mercedes, BMW, VW, Audi (LD)

CRITICAL INSTRUCTION - TR1 PROFESSIONAL STANDARD:
- If you can identify with HIGH confidence → return the result
- If you CANNOT identify with certainty → return confidence "LOW" with reason
- NEVER guess or use "probably", "likely", "possibly"
- This is a professional catalog - accuracy is mandatory

Return ONLY valid JSON with this exact structure:
{
  "manufacturer": "EXACT_MANUFACTURER_NAME or UNKNOWN",
  "tier": "TIER 1 - OEM" or "AFTERMARKET" or "UNKNOWN",
  "duty": "HEAVY DUTY (HD)" or "LIGHT DUTY (LD)" or "UNKNOWN",
  "region": "Geographic region or UNKNOWN",
  "confidence": "HIGH" or "MEDIUM" or "LOW",
  "method": "AI_ANALYSIS",
  "reason": "Brief explanation if confidence is not HIGH"
}`;

    try {
        console.log('Analyzing with GROQ AI:', filterCode);
        
        const completion = await groqClient.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `Filter Code: ${filterCode}`
                }
            ],
            temperature: 0.2,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const response = completion.choices[0]?.message?.content;
        
        if (!response) {
            console.error('No response from GROQ');
            return null;
        }

        const result = JSON.parse(response);
        result.method = result.method || 'AI_ANALYSIS';
        
        return result;
        
    } catch (error) {
        console.error('Error calling GROQ:', error.message);
        return null;
    }
}

// Export para usar como módulo
module.exports = { detectManufacturerWithGroq };

// CLI - Solo ejecutar si se llama directamente
if (require.main === module) {
// Main execution
const filterCode = process.argv[2];

if (!filterCode) {
    console.log('Usage: node universal-scraper.js <FILTER_CODE>');
    console.log('Example: node universal-scraper.js P551329');
    process.exit(1);
}

detectManufacturerWithGroq(filterCode)
    .then(result => {
        if (result) {
            console.log('\n=== FILTER ANALYSIS ===');
            console.log('Code:', filterCode);
            console.log('Manufacturer:', result.manufacturer);
            console.log('Tier:', result.tier);
            console.log('Duty:', result.duty);
            console.log('Region:', result.region);
            console.log('Confidence:', result.confidence);
            console.log('Method:', result.method);
            if (result.reason) {
                console.log('Reason:', result.reason);
            }
            if (result.filter_type) {
                console.log('Type:', result.filter_type);
            }
            console.log('\n✓ SUCCESS');
        } else {
            console.log('\n✗ FAILED - Could not analyze filter code');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Fatal error:', error.message);
        process.exit(1);
    });

}
