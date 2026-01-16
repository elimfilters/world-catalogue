// services/scrapers/donaldson.crossref.scraper.js - FIXED VERSION
const puppeteer = require("puppeteer");

module.exports = async function donaldsonCrossRefScraper(code) {
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, "");
    
    console.log("[Donaldson] ==========================================");
    console.log("[Donaldson] Starting search for:", cleanCode);
    console.log("[Donaldson] ==========================================");

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${cleanCode}`;
        console.log("[Donaldson] STEP 1: Navigating to search page:", searchUrl);
        
        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(2000);

        console.log("[Donaldson] STEP 2: Looking for Donaldson code in tabs...");
        
        const donaldsonCode = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/product/"]'));
            
            for (const link of links) {
                const text = link.textContent || link.innerText;
                const match = text.match(/\b(P|X|G|DBA|DBP|DBC)\d{4,6}\b/i);
                if (match) {
                    return {
                        code: match[0],
                        href: link.href
                    };
                }
            }
            
            return null;
        });

        if (!donaldsonCode) {
            console.log("[Donaldson] ❌ No Donaldson code found in search results");
            await browser.close();
            return null;
        }

        console.log("[Donaldson] ✅ Found Donaldson code:", donaldsonCode.code);
        console.log("[Donaldson] Product URL:", donaldsonCode.href);

        console.log("[Donaldson] STEP 3: Navigating to product page...");
        await page.goto(donaldsonCode.href, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(2000);

        console.log("[Donaldson] STEP 4.1: Clicking 'Productos alternativos' tab...");
        let alternativeProducts = [];
        try {
            const alternativesTabClicked = await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('a, button, [role="tab"]'));
                const altTab = tabs.find(tab => {
                    const text = tab.textContent.toLowerCase();
                    return text.includes('alternativ') || text.includes('alternative');
                });
                if (altTab) {
                    altTab.click();
                    return true;
                }
                return false;
            });

            if (alternativesTabClicked) {
                await page.waitForTimeout(1500);
                
                alternativeProducts = await page.evaluate(() => {
                    const alternatives = [];
                    const productElements = document.querySelectorAll('[class*="product"], [class*="alternative"], .item');
                    
                    productElements.forEach(el => {
                        const text = el.textContent || el.innerText;
                        const codeMatch = text.match(/\b(P|X|G|DBA|DBP)\d{4,6}\b/i);
                        if (codeMatch && !alternatives.includes(codeMatch[0])) {
                            alternatives.push(codeMatch[0]);
                        }
                    });
                    
                    return alternatives;
                });
                
                console.log("[Donaldson]    - Alternative products found:", alternativeProducts.length);
            } else {
                console.log("[Donaldson]    - Alternative products tab not found");
            }
        } catch (e) {
            console.log("[Donaldson]    - Error extracting alternatives:", e.message);
        }

        console.log("[Donaldson] STEP 4.2: Clicking 'Atributos' tab...");
        let specifications = {};
        try {
            const attributesTabClicked = await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('a, button, [role="tab"]'));
                const attrTab = tabs.find(tab => {
                    const text = tab.textContent.toLowerCase();
                    return text.includes('atributo') || text.includes('attribute') || text.includes('specification');
                });
                if (attrTab) {
                    attrTab.click();
                    return true;
                }
                return false;
            });

            if (attributesTabClicked) {
                await page.waitForTimeout(1500);
                
                specifications = await page.evaluate(() => {
                    const specs = {};
                    const rows = document.querySelectorAll('tr, .spec-row, [class*="attribute"]');
                    
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td, .key, .value, [class*="label"], [class*="data"]');
                        if (cells.length >= 2) {
                            const key = cells[0].textContent.trim();
                            const value = cells[1].textContent.trim();
                            if (key && value && key.length > 0 && value.length > 0) {
                                specs[key] = value;
                            }
                        }
                    });
                    
                    return specs;
                });
                
                console.log("[Donaldson]    - Specifications found:", Object.keys(specifications).length);
            } else {
                console.log("[Donaldson]    - Attributes tab not found");
            }
        } catch (e) {
            console.log("[Donaldson]    - Error extracting specifications:", e.message);
        }

        console.log("[Donaldson] STEP 4.3: Clicking 'Referencia cruzada' tab...");
        let crossReferences = {
            oem: [],
            aftermarket: []
        };
        try {
            const crossRefTabClicked = await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('a, button, [role="tab"]'));
                const crossTab = tabs.find(tab => {
                    const text = tab.textContent.toLowerCase();
                    return text.includes('referencia') || text.includes('cross') || text.includes('reference');
                });
                if (crossTab) {
                    crossTab.click();
                    return true;
                }
                return false;
            });

            if (crossRefTabClicked) {
                await page.waitForTimeout(1500);
                
                crossReferences = await page.evaluate(() => {
                    const oem = [];
                    const aftermarket = [];
                    
                    const codeElements = document.querySelectorAll('[class*="cross"], [class*="reference"], [class*="competitor"], td, .item');
                    
                    codeElements.forEach(el => {
                        const text = el.textContent.trim();
                        
                        const codes = text.match(/\b[A-Z0-9]{4,12}\b/g);
                        if (codes) {
                            codes.forEach(code => {
                                if (code.length >= 5 && code.length <= 12) {
                                    if (/^\d{5,}$/.test(code) || /^[0-9][A-Z][0-9]{4}$/.test(code)) {
                                        if (!oem.includes(code)) {
                                            oem.push(code);
                                        }
                                    } 
                                    else if (/^[A-Z]{1,3}\d{4,}$/.test(code)) {
                                        if (!aftermarket.includes(code)) {
                                            aftermarket.push(code);
                                        }
                                    }
                                }
                            });
                        }
                    });
                    
                    return { oem, aftermarket };
                });
                
                console.log("[Donaldson]    - OEM codes found:", crossReferences.oem.length);
                console.log("[Donaldson]    - Aftermarket codes found:", crossReferences.aftermarket.length);
            } else {
                console.log("[Donaldson]    - Cross reference tab not found");
            }
        } catch (e) {
            console.log("[Donaldson]    - Error extracting cross references:", e.message);
        }

        console.log("[Donaldson] STEP 4.4: Clicking 'Productos del equipo' tab...");
        let applications = [];
        try {
            const equipmentTabClicked = await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('a, button, [role="tab"]'));
                const equipTab = tabs.find(tab => {
                    const text = tab.textContent.toLowerCase();
                    return text.includes('equipo') || text.includes('equipment') || text.includes('application');
                });
                if (equipTab) {
                    equipTab.click();
                    return true;
                }
                return false;
            });

            if (equipmentTabClicked) {
                await page.waitForTimeout(1500);
                
                applications = await page.evaluate(() => {
                    const apps = [];
                    const appElements = document.querySelectorAll('.application, [class*="equipment"], li, tr');
                    
                    appElements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text && text.length > 10 && text.length < 200) {
                            if (/[A-Za-z]/.test(text) && /\d/.test(text)) {
                                if (!apps.includes(text)) {
                                    apps.push(text);
                                }
                            }
                        }
                    });
                    
                    return apps.slice(0, 50);
                });
                
                console.log("[Donaldson]    - Applications found:", applications.length);
            } else {
                console.log("[Donaldson]    - Equipment tab not found");
            }
        } catch (e) {
            console.log("[Donaldson]    - Error extracting applications:", e.message);
        }

        await browser.close();

        console.log("[Donaldson] ==========================================");
        console.log("[Donaldson] ✅ SCRAPING COMPLETE - ALL TABS EXTRACTED");
        console.log("[Donaldson]    - Input Code:", cleanCode);
        console.log("[Donaldson]    - Donaldson Code:", donaldsonCode.code);
        console.log("[Donaldson]    - Alternative Products:", alternativeProducts.length);
        console.log("[Donaldson]    - Specifications:", Object.keys(specifications).length);
        console.log("[Donaldson]    - OEM Cross Refs:", crossReferences.oem.length);
        console.log("[Donaldson]    - Aftermarket Cross Refs:", crossReferences.aftermarket.length);
        console.log("[Donaldson]    - Applications:", applications.length);
        console.log("[Donaldson] ==========================================");

        return {
            skuBuscado: cleanCode,
            idReal: donaldsonCode.code,
            alternativeProducts: alternativeProducts,
            especificaciones: specifications,
            crossReferences: crossReferences,
            applications: applications,
            urlFinal: donaldsonCode.href,
            cantidadEspecificaciones: Object.keys(specifications).length,
            cantidadAlternativos: alternativeProducts.length,
            cantidadCrossRefs: crossReferences.oem.length + crossReferences.aftermarket.length,
            cantidadApplications: applications.length,
            timestamp: new Date().toISOString(),
            v: "DONALDSON_CROSSREF_FULL_v3"
        };

    } catch (error) {
        console.error("[Donaldson] ❌ Error:", error.message);
        if (browser) await browser.close();
        return null;
    }
};
