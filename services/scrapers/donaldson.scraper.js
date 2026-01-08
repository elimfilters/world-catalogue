const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("=== DIAGNÓSTICO COMPLETO ===");
        
        const auth = process.env.BROWSERLESS_TOKEN;
        if (!auth) {
            throw new Error("BROWSERLESS_TOKEN no configurado");
        }

        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${auth}`
        });

        const page = await browser.newPage();
        
        // Log de cada acción
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log("PASO 1: Ir a homepage");
        const url1 = 'https://shop.donaldson.com/store/es-us/home';
        console.log("URL:", url1);
        
        try {
            await page.goto(url1, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log("✅ Homepage cargada");
        } catch (e) {
            console.log("❌ Error cargando homepage:", e.message);
            throw e;
        }
        
        await delay(2000);
        
        console.log("PASO 2: Buscar elementos en la página");
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                hasSearchInput: !!document.querySelector('#search-input'),
                hasSearchInputAlt1: !!document.querySelector('input[type="search"]'),
                hasSearchInputAlt2: !!document.querySelector('input[placeholder*="Search"]'),
                allInputs: Array.from(document.querySelectorAll('input')).map(i => ({
                    id: i.id,
                    type: i.type,
                    placeholder: i.placeholder,
                    name: i.name
                }))
            };
        });
        
        console.log("INFO DE PÁGINA:", JSON.stringify(pageInfo, null, 2));
        
        // Intentar búsqueda directa por URL
        console.log("PASO 3: Intentar URL directa de búsqueda");
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${sku}`;
        console.log("URL de búsqueda:", searchUrl);
        
        try {
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log("✅ Página de búsqueda cargada");
        } catch (e) {
            console.log("❌ Error en búsqueda:", e.message);
            throw e;
        }
        
        await delay(2000);
        
        console.log("PASO 4: Analizar resultados");
        const searchResults = await page.evaluate((sku) => {
            return {
                title: document.title,
                url: window.location.href,
                hasResults: !!document.querySelector('.product-item, .search-result'),
                productLinks: Array.from(document.querySelectorAll('a'))
                    .filter(a => a.href.includes(sku) || a.innerText.includes(sku))
                    .map(a => ({
                        href: a.href,
                        text: a.innerText.trim().substring(0, 50)
                    })).slice(0, 5),
                allH1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
                bodyText: document.body.innerText.substring(0, 500)
            };
        }, sku);
        
        console.log("RESULTADOS:", JSON.stringify(searchResults, null, 2));

        await browser.disconnect();
        
        return { 
            success: true, 
            diagnostic: {
                pageInfo,
                searchResults
            }
        };

    } catch (e) {
        console.error("ERROR:", e.message);
        if (browser) await browser.disconnect();
        return { 
            success: false, 
            error: "DIAGNOSTIC_ERROR", 
            detail: e.message 
        };
    }
}

module.exports = scrapeDonaldson;