const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeDonaldson(competitorCode, browser) {
    const page = await browser.newPage();
    try {
        console.log('\n🔍 Procesando: ' + competitorCode);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const searchUrl = 'https://shop.donaldson.com/store/es-us/search?Ntt=' + competitorCode;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(3000);
        
        const donaldsonProduct = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            for (const link of links) {
                // REGEX ACTUALIZADO: P, DBA, DBC, G
                const match = link.href.match(/\/product\/(P\d{6}|DBA\d{4,}|DBC\d{4,}|G\d{6})/);
                if (match) return { code: match[1], url: link.href };
            }
            return null;
        });
        
        if (!donaldsonProduct) {
            console.log('❌ No se encontró código Donaldson para: ' + competitorCode);
            await page.close();
            return null;
        }
        console.log('✅ Código Donaldson: ' + donaldsonProduct.code);
        await page.goto(donaldsonProduct.url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(4000);
        const productData = {
            competitorCode: competitorCode,
            donaldsonCode: donaldsonProduct.code,
            url: page.url(),
            scrapedAt: new Date().toISOString(),
            mainInfo: {},
            atributos: {},
            referenciaCruzada: [],
            productosDelEquipo: [],
            productosAlternativos: []
        };
        productData.mainInfo = await page.evaluate((dCode) => {
            const code = dCode;
            let description = '';
            const prodSubTitle = document.querySelector('.prodSubTitle');
            if (prodSubTitle) {
                description = prodSubTitle.textContent.trim();
            } else {
                const prodSubTitleMob = document.querySelector('.prodSubTitleMob');
                if (prodSubTitleMob) description = prodSubTitleMob.textContent.trim();
            }
            return {
                code: code,
                description: description || 'Descripción no encontrada',
                fullTitle: code + ' - ' + (description || 'Descripción no encontrada')
            };
        }, donaldsonProduct.code);
        const atributosClicked = await page.evaluate(() => {
            const atributosLink = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('Atributos') && a.getAttribute('data-target')
            );
            if (atributosLink) { atributosLink.click(); return true; }
            return false;
        });
        if (atributosClicked) {
            await page.waitForTimeout(2000);
            productData.atributos = await page.evaluate(() => {
                const specs = {};
                const container = document.querySelector('.prodSpecInfoDiv');
                if (container) {
                    container.querySelectorAll('tr').forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 2) {
                            const key = cells[0].textContent.trim();
                            const value = cells[1].textContent.trim();
                            if (key && value) specs[key] = value;
                        }
                    });
                }
                return specs;
            });
        }
        const refCruzadaClicked = await page.evaluate(() => {
            const refLink = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('Referencia cruzada') && a.getAttribute('data-target')
            );
            if (refLink) { refLink.click(); return true; }
            return false;
        });
        if (refCruzadaClicked) {
            await page.waitForTimeout(2000);
            productData.referenciaCruzada = await page.evaluate(() => {
                const refs = [];
                const container = document.querySelector('.ListCrossReferenceDetailPageComp');
                if (container) {
                    container.querySelectorAll('tr').forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 2) {
                            refs.push({
                                fabricante: cells[0].textContent.trim(),
                                numero: cells[1].textContent.trim(),
                                notas: cells[2]?.textContent.trim() || ''
                            });
                        }
                    });
                }
                return refs;
            });
        }
        const equipoClicked = await page.evaluate(() => {
            const equipoLink = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('Productos del equipo') && a.getAttribute('data-target')
            );
            if (equipoLink) { equipoLink.click(); return true; }
            return false;
        });
        if (equipoClicked) {
            await page.waitForTimeout(2000);
            productData.productosDelEquipo = await page.evaluate(() => {
                const equipos = [];
                const container = document.querySelector('.ListPartDetailPageComp');
                if (container) {
                    container.querySelectorAll('a[href*="Ver productos"]').forEach(link => {
                        const text = link.textContent.trim();
                        const cleanText = text.replace(/Ver productos\s*Â?»?/gi, '').trim();
                        if (cleanText && cleanText.length > 10) equipos.push(cleanText);
                    });
                    if (equipos.length === 0) {
                        container.querySelectorAll('tr').forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length > 0) {
                                const rowText = Array.from(cells).map(cell => cell.textContent.trim()).filter(text => text.length > 0).join(' - ');
                                if (rowText && !rowText.includes('Información de carga') && !rowText.includes('No se encontró') && !rowText.includes('Equipo') && !rowText.includes('Tipo de equipo') && rowText.length > 15) {
                                    equipos.push(rowText);
                                }
                            }
                        });
                    }
                }
                return [...new Set(equipos)];
            });
        }
        const alternativosClicked = await page.evaluate(() => {
            const altLink = document.querySelector('a[data-target=".comapreProdListSection"]');
            if (altLink) { altLink.click(); return true; }
            return false;
        });
        if (alternativosClicked) {
            await page.waitForTimeout(3000);
            productData.productosAlternativos = await page.evaluate(() => {
                const alternatives = [];
                const container = document.querySelector('.comapreProdListSection');
                if (container) {
                    const items = container.querySelectorAll('.owl-item .item, .compareListProdAlternate');
                    items.forEach(item => {
                        let code = '';
                        let description = '';
                        const preAlternate = item.querySelector('.preAlternate h5, .preAlternate h4');
                        if (preAlternate) code = preAlternate.textContent.trim();
                        if (!code) {
                            const itemDiv = item.closest('.item');
                            if (itemDiv && itemDiv.getAttribute('data-url')) {
                                const urlMatch = itemDiv.getAttribute('data-url').match(/\/product\/([^\/]+)/);
                                if (urlMatch) code = urlMatch[1];
                            }
                        }
                        if (!code) {
                            const text = item.textContent;
                            const codeMatch = text.match(/\b(P\d{6}|DBA\d{4,}|DBC\d{4,}|G\d{6})\b/);
                            if (codeMatch) code = codeMatch[1];
                        }
                        const desLengthCheck = item.querySelector('.desLengthCheck, h6');
                        if (desLengthCheck) {
                            description = desLengthCheck.getAttribute('title') || desLengthCheck.textContent.trim();
                        }
                        if (code) alternatives.push({ code: code, description: description });
                    });
                }
                const unique = [];
                const seen = new Set();
                alternatives.forEach(alt => {
                    if (!seen.has(alt.code)) {
                        seen.add(alt.code);
                        unique.push(alt);
                    }
                });
                return unique;
            });
        }
        const filename = 'donaldson-' + donaldsonProduct.code + '.json';
        fs.writeFileSync(filename, JSON.stringify(productData, null, 2));
        console.log('✅ ' + productData.mainInfo.description);
        console.log('📊 Atributos: ' + Object.keys(productData.atributos).length + ' | Referencias: ' + productData.referenciaCruzada.length + ' | Equipos: ' + productData.productosDelEquipo.length + ' | Alternativos: ' + productData.productosAlternativos.length);
        console.log('💾 Guardado: ' + filename);
        await page.close();
        return productData;
    } catch (error) {
        console.error('❌ ERROR con ' + competitorCode + ': ' + error.message);
        await page.close();
        return null;
    }
}

async function processBatchWithAlternatives() {
    console.log('\n🚀 DONALDSON VALIDATION - TODOS LOS TIPOS (CON HOUSINGS)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
    
    const initialCodes = [
        'P550440',  // Fuel Filter
        'P552100',  // Lube/Oil Filter
        'P609422',  // Cabin Filter
        'P565060',  // Hydraulic Filter
        'P954895',  // Fuel Separator
        'P781466',  // Air Dryer
        'DBC4088',  // Coolant Filter
        'G150049'   // Air Filter Housing ← NUEVO
    ];
    
    const processedCodes = new Set();
    const pendingCodes = [...initialCodes];
    const results = { successful: [], failed: [], totalProcessed: 0, alternativesFound: 0, startTime: new Date().toISOString() };
    
    console.log('📋 VALIDACIÓN DE TIPOS:');
    console.log('   1. Fuel Filter (Combustible)');
    console.log('   2. Lube/Oil Filter (Lubricación)');
    console.log('   3. Cabin Filter (Aire Cabina)');
    console.log('   4. Hydraulic Filter (Hidráulico)');
    console.log('   5. Fuel Separator (Separador)');
    console.log('   6. Air Dryer (Secador Aire)');
    console.log('   7. Coolant Filter (Refrigerante)');
    console.log('   8. Air Filter Housing (Carcasa) ← NUEVO');
    console.log('\n🔄 Auto-scraping de alternativos: DESACTIVADO (solo validación)\n');
    
    for (const code of pendingCodes) {
        if (processedCodes.has(code)) continue;
        console.log('\n[' + (results.totalProcessed + 1) + '/8] Procesando: ' + code);
        const result = await scrapeDonaldson(code, browser);
        if (result) {
            processedCodes.add(code);
            results.successful.push({
                competitorCode: code,
                donaldsonCode: result.donaldsonCode,
                description: result.mainInfo.description,
                filterType: result.atributos['Tipo'] || 'N/A',
                alternativesFound: result.productosAlternativos.length
            });
        } else {
            results.failed.push(code);
        }
        results.totalProcessed++;
        if (results.totalProcessed < pendingCodes.length) {
            console.log('\n⏳ Esperando 3 segundos...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    await browser.close();
    results.endTime = new Date().toISOString();
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN VALIDACIÓN COMPLETA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Exitosos: ' + results.successful.length + '/8');
    console.log('❌ Fallidos: ' + results.failed.length);
    if (results.successful.length > 0) {
        console.log('\n✅ TIPOS VALIDADOS:');
        results.successful.forEach(item => {
            console.log('   ✓ ' + item.donaldsonCode + ' (' + item.filterType + ') - ' + item.description);
        });
    }
    if (results.failed.length > 0) {
        console.log('\n❌ TIPOS FALLIDOS:');
        results.failed.forEach(code => console.log('   ' + code));
    }
    fs.writeFileSync('donaldson-validation-summary.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Resumen: donaldson-validation-summary.json');
    console.log('\n' + (results.successful.length === 8 ? '🎉 ¡TODOS LOS TIPOS VALIDADOS (8/8)!' : '⚠️ VALIDACIÓN PARCIAL'));
    console.log('\n');
}

processBatchWithAlternatives();
