const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function procesarCatalogos() {
    const dir = './catalogos_pdf';
    const outputDir = './src/knowledge';
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
    let baseConocimiento = [];

    console.log('📂 Iniciando extracción de ' + archivos.length + ' catálogos...');

    for (const archivo of archivos) {
        const dataBuffer = fs.readFileSync(path.join(dir, archivo));
        const data = await pdf(dataBuffer);
        
        // Limpiamos un poco el texto para que no sea tan pesado
        const textoLimpio = data.text.replace(/\s+/g, ' ').substring(0, 15000); 
        
        baseConocimiento.push({
            catalogo: archivo,
            datos_tecnicos: textoLimpio
        });
        console.log('✅ ' + archivo + ' procesado y convertido a texto.');
    }

    fs.writeFileSync(path.join(outputDir, 'noteLLM.json'), JSON.stringify(baseConocimiento, null, 2));
    console.log('🚀 noteLLM.json creado con éxito en src/knowledge/');
}

procesarCatalogos().catch(console.error);