const puppeteer = require('puppeteer-core');

async function diagnosticScrape(code) {
  let browser;
  
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`
    });
    
    const page = await browser.newPage();
    
    // Ir a la búsqueda
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*&Ntk=All&originalSearchTerm=${code}*&st=coparts`;
    console.log(`Navegando a: ${searchUrl}`);
    
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Esperar un poco para que cargue todo
    await page.waitForTimeout(3000);
    
    // Buscar todos los links que contengan "product"
    const productLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter(link => link.href.includes('product'))
        .map(link => ({
          href: link.href,
          text: link.textContent.trim().substring(0, 100),
          classes: link.className
        }));
    });
    
    // Buscar todos los botones/tabs
    const tabs = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('button, [role="tab"], .tab, [class*="tab"]'));
      return allElements.map(el => ({
        tag: el.tagName,
        text: el.textContent.trim().substring(0, 100),
        classes: el.className
      }));
    });
    
    // Buscar divs o secciones que mencionen "competencia" o "competitive"
    const sections = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, section'));
      return allDivs
        .filter(div => {
          const text = div.textContent.toLowerCase();
          return text.includes('competencia') || text.includes('competitive') || text.includes('oem');
        })
        .map(div => ({
          classes: div.className,
          id: div.id,
          text: div.textContent.trim().substring(0, 200)
        }));
    });
    
    await browser.close();
    
    return {
      success: true,
      searchUrl,
      productLinksCount: productLinks.length,
      productLinks: productLinks.slice(0, 10), // Primeros 10
      tabsCount: tabs.length,
      tabs: tabs.slice(0, 20), // Primeros 20
      sectionsCount: sections.length,
      sections: sections
    };
    
  } catch (error) {
    if (browser) await browser.close();
    return {
      success: false,
      error: error.message
    };
  }
}

require('dotenv').config();

diagnosticScrape('1R1808').then(result => {
  console.log('\n=== DIAGNÓSTICO DONALDSON ===');
  console.log(JSON.stringify(result, null, 2));
}).catch(console.error);
