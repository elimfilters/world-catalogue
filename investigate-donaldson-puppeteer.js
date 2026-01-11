const puppeteer = require('puppeteer');
const fs = require('fs');

async function investigateDonaldsonWithPuppeteer(competitorCode) {
    console.log('\n🔍 SCRAPER DONALDSON - Extracción Completa v4.0 DEFINITIVA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Código Competidor: ' + competitorCode);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: { width: 1920, height: 1080 }
    });
    
    const page = await browser.newPage();

    try {
        // PASO 1: Buscar producto
        console.log('📍 PASO 1: Navegando a búsqueda');
        const searchUrl = 'https://shop.donaldson.com/store/es-us/search?Ntt=' + competitorCode;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(4000);
        console.log('   ✅ Página de búsqueda cargada\n');

        // PASO 2: Encontrar código Donaldson
        console.log('📍 PASO 2: Buscando código Donaldson');
        const donaldsonProduct = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            for (const link of links) {
                const match = link.href.match(/\/product\/(P\d{6})/);
                if (match) return { code: match[1], url: link.href };
            }
            return null;
        });

        if (!donaldsonProduct) {
            console.log('   ❌ No se encontró código Donaldson\n');
            await browser.close();
            return;
        }

        console.log('   ✅ Código: ' + donaldsonProduct.code);
        console.log('   🔗 URL: ' + donaldsonProduct.url + '\n');

        // PASO 3: Abrir página del producto
        console.log('📍 PASO 3: Abriendo página del producto');
        await page.goto(donaldsonProduct.url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(5000);
        console.log('   ✅ Página cargada\n');

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

        // PASO 4: Extraer información principal (SELECTOR CORRECTO)
        console.log('📍 PASO 4: Extrayendo información principal');
        productData.mainInfo = await page.evaluate((dCode) => {
            const code = dCode;
            let description = '';
            
            // Selector CORRECTO: .prodSubTitle o .prodSubTitleMob
            const prodSubTitle = document.querySelector('.prodSubTitle');
            if (prodSubTitle) {
                description = prodSubTitle.textContent.trim();
            } else {
                const prodSubTitleMob = document.querySelector('.prodSubTitleMob');
                if (prodSubTitleMob) {
                    description = prodSubTitleMob.textContent.trim();
                }
            }
            
            return {
                code: code,
                description: description || 'Descripción no encontrada',
                fullTitle: code + ' - ' + (description || 'Descripción no encontrada')
            };
        }, donaldsonProduct.code);
        
        console.log('   📦 ' + productData.mainInfo.fullTitle + '\n');

        // PASO 5: Click en tab "Atributos"
        console.log('📍 PASO 5: Extrayendo Atributos (especificaciones técnicas)');
        
        const atributosClicked = await page.evaluate(() => {
            const atributosLink = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('Atributos') && a.getAttribute('data-target')
            );
            if (atributosLink) {
                atributosLink.click();
                return true;
            }
            return false;
        });

        if (atributosClicked) {
            await page.waitForTimeout(3000);
            console.log('   ✅ Tab Atributos abierto');
            
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
            
            console.log('   ✓ ' + Object.keys(productData.atributos).length + ' atributos extraídos\n');
        }

        // PASO 6: Click en tab "Referencia cruzada"
        console.log('📍 PASO 6: Extrayendo Referencia Cruzada (OEM codes)');
        
        const refCruzadaClicked = await page.evaluate(() => {
            const refLink = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('Referencia cruzada') && a.getAttribute('data-target')
            );
            if (refLink) {
                refLink.click();
                return true;
            }
            return false;
        });

        if (refCruzadaClicked) {
            await page.waitForTimeout(3000);
            console.log('   ✅ Tab Referencia cruzada abierto');
            
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
            
            console.log('   ✓ ' + productData.referenciaCruzada.length + ' referencias cruzadas extraídas\n');
        }

        // PASO 7: Click en tab "Productos del equipo"
        console.log('📍 PASO 7: Extrayendo Productos del Equipo (aplicaciones)');
        
        const equipoClicked = await page.evaluate(() => {
            const equipoLink = Array.from(document.querySelectorAll('a')).find(a => 
                a.textContent.includes('Productos del equipo') && a.getAttribute('data-target')
            );
            if (equipoLink) {
                equipoLink.click();
                return true;
            }
            return false;
        });

        if (equipoClicked) {
            await page.waitForTimeout(3000);
            console.log('   ✅ Tab Productos del equipo abierto');
            
            productData.productosDelEquipo = await page.evaluate(() => {
                const equipos = [];
                const container = document.querySelector('.ListPartDetailPageComp');
                if (container) {
                    container.querySelectorAll('a[href*="Ver productos"]').forEach(link => {
                        const text = link.textContent.trim();
                        const cleanText = text.replace(/Ver productos\s*Â?»?/gi, '').trim();
                        if (cleanText && cleanText.length > 10) {
                            equipos.push(cleanText);
                        }
                    });
                    
                    if (equipos.length === 0) {
                        container.querySelectorAll('tr').forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length > 0) {
                                const rowText = Array.from(cells)
                                    .map(cell => cell.textContent.trim())
                                    .filter(text => text.length > 0)
                                    .join(' - ');
                                
                                if (rowText && 
                                    !rowText.includes('Información de carga') &&
                                    !rowText.includes('No se encontró') &&
                                    !rowText.includes('Equipo') &&
                                    !rowText.includes('Tipo de equipo') &&
                                    rowText.length > 15) {
                                    equipos.push(rowText);
                                }
                            }
                        });
                    }
                }
                return [...new Set(equipos)];
            });
            
            console.log('   ✓ ' + productData.productosDelEquipo.length + ' equipos/aplicaciones extraídos\n');
        }

        // PASO 8: Click en tab "Productos alternativos" (SELECTOR CORRECTO)
        console.log('📍 PASO 8: Extrayendo Productos Alternativos');
        
        const alternativosClicked = await page.evaluate(() => {
            const altLink = document.querySelector('a[data-target=".comapreProdListSection"]');
            if (altLink) {
                altLink.click();
                return true;
            }
            return false;
        });

        if (alternativosClicked) {
            await page.waitForTimeout(4000);
            console.log('   ✅ Tab Productos alternativos abierto');
            
            productData.productosAlternativos = await page.evaluate(() => {
                const alternatives = [];
                const container = document.querySelector('.comapreProdListSection');
                
                if (container) {
                    // Buscar en items del carousel owl-carousel
                    const items = container.querySelectorAll('.owl-item .item, .compareListProdAlternate');
                    
                    items.forEach(item => {
                        let code = '';
                        let description = '';
                        
                        // MÉTODO 1: Buscar en preAlternate
                        const preAlternate = item.querySelector('.preAlternate h5, .preAlternate h4');
                        if (preAlternate) {
                            code = preAlternate.textContent.trim();
                        }
                        
                        // MÉTODO 2: Buscar en data-url del div.item padre
                        if (!code) {
                            const itemDiv = item.closest('.item');
                            if (itemDiv && itemDiv.getAttribute('data-url')) {
                                const urlMatch = itemDiv.getAttribute('data-url').match(/\/product\/([^\/]+)/);
                                if (urlMatch) code = urlMatch[1];
                            }
                        }
                        
                        // MÉTODO 3: Buscar código P en el contenido
                        if (!code) {
                            const text = item.textContent;
                            const codeMatch = text.match(/\b(P\d{6}|DBA\d{4,})\b/);
                            if (codeMatch) code = codeMatch[1];
                        }
                        
                        // Extraer descripción
                        const desLengthCheck = item.querySelector('.desLengthCheck, h6');
                        if (desLengthCheck) {
                            description = desLengthCheck.getAttribute('title') || desLengthCheck.textContent.trim();
                        }
                        
                        if (code) {
                            alternatives.push({ 
                                code: code, 
                                description: description 
                            });
                        }
                    });
                }
                
                // Remover duplicados
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
            
            console.log('   ✓ ' + productData.productosAlternativos.length + ' productos alternativos\n');
        } else {
            console.log('   ⚠️ No se encontró tab de Productos alternativos\n');
        }

        // Resumen final
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 RESUMEN FINAL DEL SCRAPING');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Código Competidor: ' + productData.competitorCode);
        console.log('✅ Código Donaldson: ' + productData.donaldsonCode);
        console.log('✅ Descripción: ' + productData.mainInfo.description);
        console.log('✅ Atributos: ' + Object.keys(productData.atributos).length);
        console.log('✅ Referencias cruzadas: ' + productData.referenciaCruzada.length);
        console.log('✅ Equipos: ' + productData.productosDelEquipo.length);
        console.log('✅ Alternativos: ' + productData.productosAlternativos.length);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Guardar JSON
        fs.writeFileSync('donaldson-data.json', JSON.stringify(productData, null, 2));
        console.log('💾 Datos guardados: donaldson-data.json\n');

        console.log('⏳ Esperando 10 segundos para verificar visualmente...');
        await page.waitForTimeout(10000);
        await browser.close();
        console.log('\n✅ ¡SCRAPING COMPLETADO EXITOSAMENTE! 🎉\n');

    } catch (error) {
        console.error('\n❌ ERROR: ' + error.message);
        console.error(error.stack);
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

investigateDonaldsonWithPuppeteer('57MD42M');
