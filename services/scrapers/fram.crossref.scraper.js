const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

module.exports = async function framCrossRefScraper(code) {
    const cleanCode = code.replace(/\s+/g, '');
    
    let browser;
    try {
        console.log('[FRAM] Step 1: Launching browser for:', cleanCode);
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // PASO 1: Ir a partFinder
        const searchUrl = `https://www.fram.com/partFinder/page/index/?q=${cleanCode}`;
        console.log('[FRAM] Step 2: Navigating to:', searchUrl);
        
        await page.goto(searchUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // PASO 2: Extraer los 7 códigos FRAM de la página
        const framCodes = await page.evaluate(() => {
            const codes = [];
            const regex = /\b(FE|FS|XG|FF|TG|CH|FD)\d{5,}\b/g;
            const bodyText = document.body.innerText;
            const matches = bodyText.match(regex);
            
            if (matches) {
                matches.forEach(match => {
                    if (!codes.includes(match)) {
                        codes.push(match);
                    }
                });
            }
            
            return codes;
        });
        
        console.log('[FRAM] Step 3: Found codes:', framCodes);
        
        if (framCodes.length === 0) {
            console.log('[FRAM] No codes found');
            await browser.close();
            return null;
        }
        
        // PASO 3: Seleccionar CH (Extra Guard)
        const mainCode = framCodes.find(c => c.startsWith('CH')) || framCodes[0];
        console.log('[FRAM] Step 4: Selected CH code:', mainCode);
        
        // PASO 4: Ir a la página del producto
        const productUrl = `https://www.fram.com/fram-extra-guard-oil-filter-cartridge-${mainCode.toLowerCase()}`;
        console.log('[FRAM] Step 5: Navigating to product:', productUrl);
        
        await page.goto(productUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // PASO 5: Extraer información de las 3 pestañas
        
        // Tab 1: Description
        const description = await page.evaluate(() => {
            return document.querySelector('.product-description, .description, p')?.innerText?.trim() || '';
        });
        
        // Tab 2: Applications (pulsar tab si existe)
        let applications = [];
        try {
            await page.click('a:has-text("Applications")');
            await page.waitForTimeout(1000);
            
            applications = await page.evaluate(() => {
                const apps = [];
                document.querySelectorAll('.applications li, [class*="application"] li').forEach(el => {
                    const text = el.innerText.trim();
                    if (text) apps.push(text);
                });
                return apps;
            });
        } catch (e) {
            console.log('[FRAM] Applications tab not found or error:', e.message);
        }
        
        // Tab 3: Comparison (pulsar tab)
        let oemCodes = [];
        let crossRefCodes = [];
        
        try {
            await page.click('a:has-text("Comparison")');
            await page.waitForTimeout(1000);
            
            const comparisonData = await page.evaluate(() => {
                const oem = [];
                const cross = [];
                
                // OEM Codes
                document.querySelectorAll('.oem-codes li, [class*="oem"] li').forEach(el => {
                    const text = el.innerText.trim();
                    if (text) oem.push(text);
                });
                
                // Cross Reference Codes
                document.querySelectorAll('.cross-reference li, [class*="cross"] li').forEach(el => {
                    const text = el.innerText.trim();
                    if (text) cross.push(text);
                });
                
                return { oem, cross };
            });
            
            oemCodes = comparisonData.oem;
            crossRefCodes = comparisonData.cross;
        } catch (e) {
            console.log('[FRAM] Comparison tab not found or error:', e.message);
        }
        
        await browser.close();
        
        return {
            skuBuscado: cleanCode,
            idReal: mainCode,
            descripcion: description,
            applications: applications,
            oemCodes: oemCodes,
            crossReferences: crossRefCodes,
            alternativeCodes: framCodes.filter(c => c !== mainCode),
            urlFinal: productUrl,
            timestamp: new Date().toISOString(),
            v: "FRAM_CROSSREF_PUPPETEER_v1"
        };
        
    } catch (error) {
        if (browser) await browser.close();
        console.error('[FRAM] Error:', error.message);
        return null;
    }
};
