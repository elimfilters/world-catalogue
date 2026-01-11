require('dotenv').config({ path: './pipeline/config/.env' });

const puppeteer = require('puppeteer');
const Groq = require('groq-sdk');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DESDE .ENV
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
    groq: {
        apiKey: process.env.GROQ_API_KEY
    },
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        database: process.env.MONGODB_DATABASE || 'filters_catalog',
        collection: process.env.MONGODB_COLLECTION || 'products'
    },
    googleSheets: {
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }
    },
    options: {
        useMongoDB: process.env.USE_MONGODB === 'true',
        useGoogleSheets: process.env.USE_GOOGLE_SHEETS === 'true'
    }
};

// Validar configuración
console.log('\n🔍 VALIDANDO CONFIGURACIÓN...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ GROQ API Key: ${CONFIG.groq.apiKey ? '✓ Configurada' : '❌ FALTA'}`);
console.log(`${CONFIG.options.useMongoDB ? '✅' : '⚪'} MongoDB: ${CONFIG.options.useMongoDB ? 'Activado' : 'Desactivado'}`);
console.log(`${CONFIG.options.useGoogleSheets ? '✅' : '⚪'} Google Sheets: ${CONFIG.options.useGoogleSheets ? 'Activado' : 'Desactivado'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!CONFIG.groq.apiKey) {
    console.error('❌ ERROR: GROQ_API_KEY no configurada en .env');
    console.log('💡 Edita: pipeline/config/.env\n');
    process.exit(1);
}

const groq = new Groq({ apiKey: CONFIG.groq.apiKey });

// ═══════════════════════════════════════════════════════════════
// DETECTOR DE FABRICANTE
// ═══════════════════════════════════════════════════════════════
function detectManufacturer(code) {
    const upperCode = code.toUpperCase();
    
    // Donaldson patterns (PRIMERO)
    if (/^P\d{6}$/.test(upperCode)) return 'DONALDSON';
    if (/^DBA\d{4,}$/.test(upperCode)) return 'DONALDSON';
    if (/^DBC\d{4,}$/.test(upperCode)) return 'DONALDSON';
    if (/^G\d{6}$/.test(upperCode)) return 'DONALDSON';
    
    // FRAM patterns
    if (/^(CH|CA|CS|PH|P[ASRHF]|XG|HPG|TG)\d+/i.test(upperCode)) {
        return 'FRAM';
    }
    
    return 'UNKNOWN';
}

// ═══════════════════════════════════════════════════════════════
// PASO 1: CLASIFICACIÓN INTELIGENTE
// ═══════════════════════════════════════════════════════════════
async function classifySkuWithGroq(sku) {
    console.log(`🤖 Clasificando: ${sku}`);
    
    try {
        const prompt = `Analiza este código de filtro: ${sku}

PRIORIDAD DE ANÁLISIS:
1. Especificaciones técnicas (diámetros, altura, rosca, micraje)
2. Tipo de motor/aplicación (diesel, gasolina, heavy-duty)
3. Tipo de filtro (aceite, combustible, aire, hidráulico)
4. Cross-references técnicas
5. Prefijo OEM (último recurso)

Responde SOLO con JSON:
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
  "cross_references": [],
  "confidence": 0.0-1.0,
  "classification_reason": "string",
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
            console.log(`   📊 ${classification.filter_type} | ${classification.application}`);
            console.log(`   🏭 ${classification.primary_manufacturer} (confianza: ${classification.confidence})`);
            return classification;
        }
        
        return null;
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// PASO 2A: SCRAPING FRAM (GROQ)
// ═══════════════════════════════════════════════════════════════
async function scrapeFramWithGroq(partNumber) {
    console.log(`   🔵 Scraping FRAM: ${partNumber}`);
    
    try {
        const prompt = `Extract complete filter information from FRAM website for part number: ${partNumber}

Search and extract:
1. Description
2. Filter type
3. OEM cross-references with manufacturer names
4. Filter manufacturer cross-references
5. Technical specifications
6. Applications

Return as JSON.`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 2000,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            tool_choice: 'auto'
        });

        return {
            manufacturer: 'FRAM',
            partNumber: partNumber,
            scraperType: 'GROQ',
            rawData: completion.choices[0].message.content,
            scrapedAt: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`   ❌ Error FRAM: ${error.message}`);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// PASO 2B: SCRAPING DONALDSON (Puppeteer)
// ═══════════════════════════════════════════════════════════════
async function scrapeDonaldsonWithPuppeteer(partNumber, browser) {
    console.log(`   🟡 Scraping DONALDSON: ${partNumber}`);
    
    const page = await browser.newPage();
    
    try {
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${partNumber}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(3000);
        
        const donaldsonProduct = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            for (const link of links) {
                const match = link.href.match(/\/product\/(P\d{6}|DBA\d{4,}|DBC\d{4,}|G\d{6})/);
                if (match) return { code: match[1], url: link.href };
            }
            return null;
        });
        
        if (!donaldsonProduct) {
            await page.close();
            return null;
        }
        
        await page.goto(donaldsonProduct.url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(4000);
        
        const mainInfo = await page.evaluate((dCode) => {
            const code = dCode;
            let description = '';
            const prodSubTitle = document.querySelector('.prodSubTitle') || 
                               document.querySelector('.prodSubTitleMob');
            if (prodSubTitle) description = prodSubTitle.textContent.trim();
            return { code, description };
        }, donaldsonProduct.code);
        
        await page.evaluate(() => {
            const atributosLink = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('Atributos') && a.getAttribute('data-target')
            );
            if (atributosLink) atributosLink.click();
        });
        await page.waitForTimeout(2000);
        
        const atributos = await page.evaluate(() => {
            const specs = {};
            const container = document.querySelector('.prodSpecInfoDiv');
            if (container) {
                container.querySelectorAll('tr').forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        specs[cells[0].textContent.trim()] = cells[1].textContent.trim();
                    }
                });
            }
            return specs;
        });
        
        await page.evaluate(() => {
            const refLink = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('Referencia cruzada') && a.getAttribute('data-target')
            );
            if (refLink) refLink.click();
        });
        await page.waitForTimeout(2000);
        
        const referenciaCruzada = await page.evaluate(() => {
            const refs = [];
            const container = document.querySelector('.ListCrossReferenceDetailPageComp');
            if (container) {
                container.querySelectorAll('tr').forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        refs.push({
                            fabricante: cells[0].textContent.trim(),
                            numero: cells[1].textContent.trim()
                        });
                    }
                });
            }
            return refs;
        });
        
        await page.close();
        
        return {
            manufacturer: 'DONALDSON',
            partNumber: donaldsonProduct.code,
            scraperType: 'Puppeteer',
            mainInfo,
            atributos,
            referenciaCruzada,
            scrapedAt: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`   ❌ Error Donaldson: ${error.message}`);
        await page.close();
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// PASO 3: GUARDAR EN MONGODB
// ═══════════════════════════════════════════════════════════════
async function saveToMongoDB(data) {
    if (!CONFIG.options.useMongoDB) return true;
    
    console.log(`   💾 Guardando en MongoDB...`);
    
    try {
        const client = new MongoClient(CONFIG.mongodb.uri);
        await client.connect();
        
        const db = client.db(CONFIG.mongodb.database);
        const collection = db.collection(CONFIG.mongodb.collection);
        
        const document = {
            ...data,
            updatedAt: new Date(),
            source: 'pipeline'
        };
        
        await collection.updateOne(
            { sku: data.partNumber || data.sku },
            { $set: document },
            { upsert: true }
        );
        
        await client.close();
        console.log(`   ✅ MongoDB guardado`);
        
        return true;
        
    } catch (error) {
        console.error(`   ❌ MongoDB Error: ${error.message}`);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// PASO 4: GUARDAR EN GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════
async function saveToGoogleSheets(data, sheet) {
    if (!CONFIG.options.useGoogleSheets) return true;
    
    console.log(`   📊 Guardando en Google Sheets...`);
    
    try {
        const row = {
            'SKU': data.partNumber || data.sku,
            'Manufacturer': data.manufacturer || data.primary_manufacturer,
            'Filter Type': data.filter_type || 'N/A',
            'Application': data.application || 'N/A',
            'Description': data.mainInfo?.description || data.description || 'N/A',
            'Confidence': data.confidence || 'N/A',
            'Scraped At': data.scrapedAt || new Date().toISOString(),
            'Technical Specs': JSON.stringify(data.technical_specs || data.atributos || {}),
            'Cross References': JSON.stringify(data.cross_references || data.referenciaCruzada || [])
        };
        
        await sheet.addRow(row);
        console.log(`   ✅ Google Sheets guardado`);
        
        return true;
        
    } catch (error) {
        console.error(`   ❌ Google Sheets Error: ${error.message}`);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
async function runPipeline(skuList) {
    console.log('\n🚀 PIPELINE COMPLETO - ELIMFILTERS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 SKUs a procesar: ${skuList.length}\n`);
    
    let browser = null;
    let googleSheet = null;
    
    if (CONFIG.options.useGoogleSheets) {
        try {
            const serviceAccountAuth = new JWT({
                email: CONFIG.googleSheets.credentials.client_email,
                key: CONFIG.googleSheets.credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });
            
            const doc = new GoogleSpreadsheet(CONFIG.googleSheets.spreadsheetId, serviceAccountAuth);
            await doc.loadInfo();
            googleSheet = doc.sheetsByIndex[0];
            console.log(`📊 Google Sheets conectado: ${doc.title}\n`);
        } catch (error) {
            console.error(`❌ Error Google Sheets: ${error.message}`);
            console.log(`⚠️ Continuando sin Google Sheets...\n`);
            CONFIG.options.useGoogleSheets = false;
        }
    }
    
    browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: { width: 1920, height: 1080 }
    });
    
    const results = {
        total: skuList.length,
        classified: 0,
        scraped: 0,
        savedMongoDB: 0,
        savedGoogleSheets: 0,
        failed: [],
        log: []
    };
    
    for (let i = 0; i < skuList.length; i++) {
        const sku = skuList[i];
        console.log(`\n[${i + 1}/${skuList.length}] 🔍 ${sku}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const logEntry = {
            sku,
            timestamp: new Date().toISOString(),
            steps: {}
        };
        
        try {
            const classification = await classifySkuWithGroq(sku);
            
            if (!classification) {
                logEntry.steps.classification = 'FAILED';
                results.failed.push(sku);
                results.log.push(logEntry);
                continue;
            }
            
            logEntry.steps.classification = 'SUCCESS';
            logEntry.classification = classification;
            results.classified++;
            
            let scrapedData = null;
            const detectedMfg = detectManufacturer(sku);
            
            if (detectedMfg === 'FRAM') {
                scrapedData = await scrapeFramWithGroq(sku);
            } else if (detectedMfg === 'DONALDSON') {
                scrapedData = await scrapeDonaldsonWithPuppeteer(sku, browser);
            }
            
            if (!scrapedData) {
                logEntry.steps.scraping = 'FAILED';
                results.failed.push(sku);
                results.log.push(logEntry);
                continue;
            }
            
            logEntry.steps.scraping = 'SUCCESS';
            results.scraped++;
            
            const combinedData = {
                ...classification,
                ...scrapedData
            };
            
            if (CONFIG.options.useMongoDB) {
                const mongoSaved = await saveToMongoDB(combinedData);
                logEntry.steps.mongodb = mongoSaved ? 'SUCCESS' : 'FAILED';
                if (mongoSaved) results.savedMongoDB++;
            }
            
            if (CONFIG.options.useGoogleSheets && googleSheet) {
                const sheetSaved = await saveToGoogleSheets(combinedData, googleSheet);
                logEntry.steps.googleSheets = sheetSaved ? 'SUCCESS' : 'FAILED';
                if (sheetSaved) results.savedGoogleSheets++;
            }
            
            results.log.push(logEntry);
            
            if (i < skuList.length - 1) {
                console.log('   ⏳ Esperando 2 segundos...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            logEntry.error = error.message;
            results.failed.push(sku);
            results.log.push(logEntry);
        }
    }
    
    if (browser) await browser.close();
    
    const logFilename = `pipeline/logs/pipeline-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    fs.writeFileSync(logFilename, JSON.stringify(results, null, 2));
    
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DEL PIPELINE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Total SKUs: ${results.total}`);
    console.log(`🤖 Clasificados: ${results.classified}`);
    console.log(`🔍 Scrapeados: ${results.scraped}`);
    console.log(`💾 MongoDB: ${results.savedMongoDB}`);
    console.log(`📊 Google Sheets: ${results.savedGoogleSheets}`);
    console.log(`❌ Fallidos: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
        console.log('\n❌ SKUs fallidos:');
        results.failed.forEach(sku => console.log(`   ${sku}`));
    }
    
    console.log(`\n💾 Log guardado: ${logFilename}`);
    console.log('\n🎉 ¡PIPELINE COMPLETADO!\n');
    
    return results;
}

async function main() {
    const skuList = [
        'P150695',
        'DBA5047',
        'G150049'
    ];
    
    await runPipeline(skuList);
}

main();
