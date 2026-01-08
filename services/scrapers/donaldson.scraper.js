const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("=== DIAGNÓSTICO /80 ===");
        
        const auth = process.env.BROWSERLESS_TOKEN;
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${auth}`
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const specsUrl = 'https://shop.donaldson.com/store/es-us/product/P551808/80';
        await page.goto(specsUrl, { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });
        
        await delay(5000);
        
        const diagnostic = await page.evaluate(() => {
            // Capturar TODO el HTML visible
            const bodyText = document.body.innerText;
            
            // Buscar TODOS los elementos con texto que contengan ":"
            const elementsWithColon = [];
            document.querySelectorAll('*').forEach(el => {
                const text = el.innerText;
                if (text && text.includes(':') && text.length < 200 && el.children.length < 5) {
                    elementsWithColon.push({
                        tag: el.tagName,
                        class: el.className,
                        id: el.id,
                        text: text.trim()
                    });
                }
            });
            
            // Buscar todas las tablas
            const tables = [];
            document.querySelectorAll('table').forEach((table, i) => {
                const rows = [];
                table.querySelectorAll('tr').forEach(tr => {
                    const cells = Array.from(tr.querySelectorAll('td, th')).map(td => td.innerText.trim());
                    if (cells.length > 0) rows.push(cells);
                });
                tables.push({
                    index: i,
                    class: table.className,
                    id: table.id,
                    rows: rows
                });
            });
            
            // Buscar listas
            const lists = [];
            document.querySelectorAll('ul, ol, dl').forEach((list, i) => {
                lists.push({
                    tag: list.tagName,
                    class: list.className,
                    id: list.id,
                    items: Array.from(list.children).slice(0, 5).map(li => ({
                        tag: li.tagName,
                        text: li.innerText.substring(0, 100)
                    }))
                });
            });
            
            return {
                url: window.location.href,
                title: document.title,
                h1: document.querySelector('h1')?.innerText,
                bodyLength: bodyText.length,
                bodyPreview: bodyText.substring(0, 2000),
                elementsWithColon: elementsWithColon.slice(0, 20),
                tables: tables,
                lists: lists.slice(0, 10)
            };
        });

        console.log("=== DIAGNÓSTICO COMPLETO ===");
        console.log(JSON.stringify(diagnostic, null, 2));
        
        await browser.disconnect();
        
        return { 
            success: true, 
            diagnostic: diagnostic
        };

    } catch (e) {
        console.error("ERROR:", e.message);
        if (browser) await browser.disconnect();
        return { 
            success: false, 
            error: e.message 
        };
    }
}

module.exports = scrapeDonaldson;