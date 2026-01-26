const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfDir = './catalogos_pdf';
const outputDir = './data';

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

async function extract() {
    try {
        const allFiles = fs.readdirSync(pdfDir);
        const files = allFiles.filter(f => f.toLowerCase().endsWith('.pdf'));
        
        console.log(`🚀 Iniciando extracción de ${files.length} archivos...`);

        for (const file of files) {
            try {
                console.log(`📄 Procesando: ${file}...`);
                const dataBuffer = fs.readFileSync(path.join(pdfDir, file));
                const data = await pdf(dataBuffer);
                
                // Filtro para códigos: Alfanuméricos de 5 a 20 caracteres
                const skus = data.text.match(/[A-Z0-9-]{5,20}/g) || [];
                const uniqueSkus = [...new Set(skus.map(s => s.toUpperCase()))];

                const outputName = file.replace(/\.pdf$/i, '.json');
                fs.writeFileSync(
                    path.join(outputDir, outputName), 
                    JSON.stringify({ source: file, total: uniqueSkus.length, skus: uniqueSkus }, null, 2)
                );
                console.log(`✅ Guardado: ${outputName} (${uniqueSkus.length} códigos)`);
            } catch (err) {
                console.log(`❌ Error en el archivo ${file}: ${err.message}`);
            }
        }
        console.log('\n🏁 ¡TODO LISTO! Revisa la carpeta /data');
    } catch (err) {
        console.log(`❌ Error general: ${err.message}`);
    }
}

extract();
