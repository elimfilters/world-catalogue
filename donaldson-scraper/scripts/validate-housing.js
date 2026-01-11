const puppeteer = require('puppeteer');
const fs = require('fs');

async function validateHousing() {
    console.log('\n🔍 VALIDACIÓN: AIR FILTER HOUSING (Carcasa)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: { width: 1920, height: 1080 }
    });
    const page = await browser.newPage();
    
    const code = 'G150049';
    
    try {
        console.log('📍 Buscando: ' + code);
        const searchUrl = 'https://shop.donaldson.com/store/es-us/search?Ntt=' + code;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(3000);
        
        const donaldsonProduct = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            for (const link of links) {
                // REGEX ACTUALIZADO: incluye códigos G
                const match = link.href.match(/\/product\/(P\d{6}|DBA\d{4,}|DBC\d{4,}|G\d{6})/);
                if (match) return { code: match[1], url: link.href };
            }
            return null;
        });
        
        if (!donaldsonProduct) {
            console.log('❌ No se encontró código Donaldson');
            await browser.close();
            return;
        }
        
        console.log('✅ Código encontrado: ' + donaldsonProduct.code);
        await page.goto(donaldsonProduct.url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(4000);
        
        const productData = await page.evaluate(() => {
            const prodSubTitle = document.querySelector('.prodSubTitle') || 
                               document.querySelector('.prodSubTitleMob');
            const description = prodSubTitle ? prodSubTitle.textContent.trim() : 'N/A';
            return { description };
        });
        
        console.log('✅ Descripción: ' + productData.description);
        console.log('\n🎉 AIR FILTER HOUSING VALIDADO ✓');
        
        await page.waitForTimeout(3000);
        await browser.close();
        
    } catch (error) {
        console.error('❌ ERROR: ' + error.message);
        await browser.close();
    }
}

validateHousing();
