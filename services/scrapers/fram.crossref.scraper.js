const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function framCrossRefScraper(code) {
    const cleanCode = code.replace(/\s+/g, '');
    const headers = { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
    
    try {
        console.log('[FRAM CrossRef] Step 1: Searching partFinder for:', cleanCode);
        
        // PASO 1: Buscar en partFinder
        const searchUrl = `https://www.fram.com/partFinder/page/index/?q=${cleanCode}`;
        const { data: htmlSearch } = await axios.get(searchUrl, { 
            headers, 
            timeout: 20000,
            maxRedirects: 5
        });
        
        const $ = cheerio.load(htmlSearch);
        
        // PASO 2: Extraer los 6 códigos FRAM
        const framCodes = [];
        
        // Buscar elementos que contengan códigos FRAM (FE, FS, XG, FF, TG, CH, FD seguidos de números)
        $('body').find('*').each((i, el) => {
            const text = $(el).text();
            const matches = text.match(/\b([A-Z]{2}\d{5,})\b/g);
            if (matches) {
                matches.forEach(match => {
                    if (/^(FE|FS|XG|FF|TG|CH|FD)\d+$/.test(match) && !framCodes.includes(match)) {
                        framCodes.push(match);
                    }
                });
            }
        });
        
        console.log('[FRAM CrossRef] Step 2: Found codes:', framCodes);
        
        if (framCodes.length === 0) {
            console.log('[FRAM CrossRef] No FRAM codes found');
            return null;
        }
        
        // PASO 3: Buscar CH (FRAM Extra Guard) como principal
        let mainCode = framCodes.find(code => code.startsWith('CH'));
        if (!mainCode) {
            mainCode = framCodes[0]; // Fallback
        }
        
        console.log('[FRAM CrossRef] Step 3: Main code (CH):', mainCode);
        
        // PASO 4: Acceder a la página del producto principal
        const productUrl = `https://www.fram.com/products/${mainCode.toLowerCase()}`;
        console.log('[FRAM CrossRef] Step 4: Accessing product page:', productUrl);
        
        const { data: htmlProduct } = await axios.get(productUrl, { 
            headers, 
            timeout: 20000 
        });
        const $p = cheerio.load(htmlProduct);
        
        // PASO 5: Extraer información de las 3 pestañas
        const title = $p('h1, .product-name').first().text().trim();
        const description = $p('.product-description, p').first().text().trim();
        
        // Tab 1: VIEW DETAILS (especificaciones)
        const specs = {};
        $p('table tr, .specifications tr, .specs tr').each((i, el) => {
            const key = $p(el).find('td, th').eq(0).text().trim();
            const val = $p(el).find('td').eq(1).text().trim();
            if (key && val) specs[key] = val;
        });
        
        // Tab 2: APPLICATIONS
        const applications = [];
        $p('.applications li, [class*="application"] li').each((i, el) => {
            const app = $p(el).text().trim();
            if (app) applications.push(app);
        });
        
        // Tab 3: COMPARISON (OEM + Cross References)
        const oemCodes = [];
        const crossRefCodes = [];
        
        $p('.oem-codes li, [class*="oem"] li').each((i, el) => {
            const oem = $p(el).text().trim();
            if (oem) oemCodes.push(oem);
        });
        
        $p('.cross-reference li, [class*="cross"] li').each((i, el) => {
            const cross = $p(el).text().trim();
            if (cross) crossRefCodes.push(cross);
        });
        
        return {
            skuBuscado: cleanCode,
            idReal: mainCode,
            descripcion: description || title,
            especificaciones: specs,
            applications: applications,
            oemCodes: oemCodes,
            crossReferences: crossRefCodes,
            alternativeCodes: framCodes.filter(code => code !== mainCode),
            urlFinal: productUrl,
            timestamp: new Date().toISOString(),
            v: "FRAM_CROSSREF_v3"
        };
        
    } catch (error) {
        console.error('[FRAM CrossRef] Error:', error.message);
        console.error('[FRAM CrossRef] Stack:', error.stack);
        return null;
    }
};
