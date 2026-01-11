const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'TU_API_KEY_AQUI'
});

// ═══════════════════════════════════════════════════════════════
// CLASIFICADOR INTELIGENTE BASADO EN SPECS TÉCNICAS
// ═══════════════════════════════════════════════════════════════
async function classifySkuWithGroq(sku) {
    console.log(`\n🤖 Analizando SKU: ${sku}`);
    
    try {
        const prompt = `Analiza este código de filtro: ${sku}

PRIORIDAD DE ANÁLISIS (en orden):
1. ESPECIFICACIONES TÉCNICAS (diámetros, altura, rosca, micraje)
2. TIPO DE MOTOR/APLICACIÓN (diesel, gasolina, heavy-duty, automotriz)
3. TIPO DE FILTRO (aceite, combustible, aire, hidráulico)
4. Cross-references con otros fabricantes
5. ÚLTIMO RECURSO: Prefijo del fabricante OEM

Busca en bases de datos técnicas y catálogos:
- ¿Qué tipo de filtro es? (Oil/Fuel/Air/Hydraulic/Coolant)
- ¿Qué especificaciones técnicas tiene?
- ¿Para qué tipo de motor/aplicación es?
- ¿Qué fabricantes tienen equivalencias técnicas?
- ¿Cuál es el fabricante original más probable basado en specs?

Responde SOLO con un JSON:
{
  "sku": "${sku}",
  "filter_type": "Oil|Fuel|Air|Hydraulic|Coolant|Cabin|Unknown",
  "application": "Heavy-Duty Diesel|Light Diesel|Gasoline|Industrial|Marine|Agricultural|Unknown",
  "technical_specs": {
    "outer_diameter_mm": number or null,
    "height_mm": number or null,
    "thread": "string or null",
    "micron_rating": number or null
  },
  "primary_manufacturer": "FRAM|DONALDSON|WIX|BALDWIN|FLEETGUARD|MANN|UNKNOWN",
  "cross_references": ["fabricante1", "fabricante2"],
  "confidence": 0.0-1.0,
  "classification_reason": "basado en specs técnicas|basado en aplicación|basado en cross-ref|basado en prefijo",
  "scraper_recommendation": "GROQ|PUPPETEER|MANUAL|MULTI_SOURCE"
}`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 800,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            tool_choice: 'auto'
        });

        const response = completion.choices[0].message.content;
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const classification = JSON.parse(jsonMatch[0]);
            console.log(`   📊 Tipo: ${classification.filter_type}`);
            console.log(`   🔧 Aplicación: ${classification.application}`);
            console.log(`   🏭 Fabricante: ${classification.primary_manufacturer} (${classification.confidence})`);
            console.log(`   💡 Razón: ${classification.classification_reason}`);
            
            if (classification.technical_specs.outer_diameter_mm) {
                console.log(`   📐 Specs: Ø${classification.technical_specs.outer_diameter_mm}mm x ${classification.technical_specs.height_mm}mm`);
            }
            
            return classification;
        }
        
        return null;
        
    } catch (error) {
        console.error('   ❌ Error clasificando: ' + error.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// AGRUPADOR POR ESPECIFICACIONES TÉCNICAS
// ═══════════════════════════════════════════════════════════════
function groupByTechnicalSpecs(classifications) {
    const groups = {
        by_filter_type: {},
        by_application: {},
        by_manufacturer: {},
        by_specs: []
    };
    
    classifications.forEach(c => {
        // Agrupar por tipo de filtro
        if (!groups.by_filter_type[c.filter_type]) {
            groups.by_filter_type[c.filter_type] = [];
        }
        groups.by_filter_type[c.filter_type].push(c.sku);
        
        // Agrupar por aplicación
        if (!groups.by_application[c.application]) {
            groups.by_application[c.application] = [];
        }
        groups.by_application[c.application].push(c.sku);
        
        // Agrupar por fabricante
        if (!groups.by_manufacturer[c.primary_manufacturer]) {
            groups.by_manufacturer[c.primary_manufacturer] = [];
        }
        groups.by_manufacturer[c.primary_manufacturer].push(c.sku);
        
        // Agregar specs completas
        groups.by_specs.push({
            sku: c.sku,
            specs: c.technical_specs,
            manufacturer: c.primary_manufacturer
        });
    });
    
    return groups;
}

// ═══════════════════════════════════════════════════════════════
// PROCESADOR DE LOTE ELIMFILTERS (MEJORADO)
// ═══════════════════════════════════════════════════════════════
async function processElimfiltersBatch(skuList) {
    console.log('\n🎯 ELIMFILTERS - CLASIFICADOR INTELIGENTE GROQ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 PRIORIDAD: Specs Técnicas > Aplicación > Cross-Ref > Prefijo');
    console.log(`📋 SKUs a clasificar: ${skuList.length}\n`);
    
    const classifications = [];
    
    for (const sku of skuList) {
        const classification = await classifySkuWithGroq(sku);
        
        if (classification) {
            classifications.push(classification);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Agrupar por specs técnicas
    const groups = groupByTechnicalSpecs(classifications);
    
    // Guardar resultados completos
    const results = {
        total_classified: classifications.length,
        classifications: classifications,
        groups: groups,
        summary: {
            by_filter_type: Object.keys(groups.by_filter_type).map(type => ({
                type,
                count: groups.by_filter_type[type].length
            })),
            by_application: Object.keys(groups.by_application).map(app => ({
                application: app,
                count: groups.by_application[app].length
            })),
            by_manufacturer: Object.keys(groups.by_manufacturer).map(mfg => ({
                manufacturer: mfg,
                count: groups.by_manufacturer[mfg].length
            }))
        }
    };
    
    fs.writeFileSync(
        'elimfilters-integration/output/technical-classifications.json',
        JSON.stringify(results, null, 2)
    );
    
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN POR TIPO DE FILTRO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.summary.by_filter_type.forEach(item => {
        console.log(`   ${item.type}: ${item.count} SKUs`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN POR APLICACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.summary.by_application.forEach(item => {
        console.log(`   ${item.application}: ${item.count} SKUs`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN POR FABRICANTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.summary.by_manufacturer.forEach(item => {
        console.log(`   ${item.manufacturer}: ${item.count} SKUs`);
    });
    
    console.log('\n💾 Clasificaciones guardadas: elimfilters-integration/output/technical-classifications.json');
    
    return results;
}

// ═══════════════════════════════════════════════════════════════
// GENERADOR DE RUTAS DE SCRAPING OPTIMIZADAS
// ═══════════════════════════════════════════════════════════════
async function generateScraperRoutes(results) {
    console.log('\n\n🚀 GENERANDO RUTAS DE SCRAPING OPTIMIZADAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const routes = {
        groq_scraping: [],      // FRAM principalmente
        puppeteer_scraping: [], // DONALDSON principalmente
        multi_source: [],       // Requiere múltiples fuentes
        manual_review: []       // Baja confianza o unknown
    };
    
    results.classifications.forEach(c => {
        const route = {
            sku: c.sku,
            manufacturer: c.primary_manufacturer,
            filter_type: c.filter_type,
            application: c.application,
            confidence: c.confidence
        };
        
        if (c.scraper_recommendation === 'GROQ') {
            routes.groq_scraping.push(route);
        } else if (c.scraper_recommendation === 'PUPPETEER') {
            routes.puppeteer_scraping.push(route);
        } else if (c.scraper_recommendation === 'MULTI_SOURCE') {
            routes.multi_source.push(route);
        } else {
            routes.manual_review.push(route);
        }
    });
    
    fs.writeFileSync(
        'elimfilters-integration/output/scraping-routes.json',
        JSON.stringify(routes, null, 2)
    );
    
    console.log('📝 Rutas de scraping:');
    console.log(`   🔵 GROQ (FRAM): ${routes.groq_scraping.length} SKUs`);
    console.log(`   🟡 PUPPETEER (DONALDSON): ${routes.puppeteer_scraping.length} SKUs`);
    console.log(`   🟣 MULTI-SOURCE: ${routes.multi_source.length} SKUs`);
    console.log(`   ⚪ MANUAL REVIEW: ${routes.manual_review.length} SKUs`);
    
    console.log('\n💾 Rutas guardadas: elimfilters-integration/output/scraping-routes.json');
    
    return routes;
}

// ═══════════════════════════════════════════════════════════════
// EJEMPLO DE USO CON SKUs DIVERSOS
// ═══════════════════════════════════════════════════════════════
async function main() {
    // SKUs de ejemplo con diferentes características técnicas
    const elimfiltersSkus = [
        'CH10358',     // FRAM Oil - Heavy Duty
        'CA10677',     // FRAM Air - Automotriz
        'P550440',     // Donaldson Oil - Industrial
        'P552100',     // Donaldson Fuel - Diesel
        'DBA5047',     // Donaldson Blue Air - Construcción
        'G150049',     // Donaldson Housing - Sistema completo
        '51515',       // WIX Oil - Multi-aplicación
        '46299',       // WIX Air
        'B7349',       // Baldwin Oil
        'LF3000',      // Fleetguard - Heavy Duty Diesel
        'W719/30'      // MANN Oil - Automotriz
    ];
    
    const results = await processElimfiltersBatch(elimfiltersSkus);
    const routes = await generateScraperRoutes(results);
    
    console.log('\n🎉 ¡CLASIFICACIÓN TÉCNICA COMPLETADA!\n');
}

// EJECUTAR
main();
