const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function procesar() {
    const dir = './catalogos_pdf';
    const out = './src/knowledge';
    if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });

    const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
    let base = [];

    console.log('🏗️ Procesando 262 catálogos...');

    for (const f of archivos) {
        try {
            const buffer = fs.readFileSync(path.join(dir, f));
            
            // LA SOLUCIÓN: Identificar la función real sin importar la versión de Node
            let fn = pdf;
            if (typeof pdf !== 'function' && pdf.default) fn = pdf.default;
            if (typeof fn !== 'function') throw new Error('Librería incompatible');

            const data = await fn(buffer);
            
            // LIMPIEZA TOTAL: Solo texto alfanumérico técnico
            const limpio = data.text
                .replace(/[^\x20-\x7E\s]/g, '') // Elimina basura visual/binaria
                .replace(/\s+/g, ' ')           // Compacta espacios
                .substring(0, 3000);            // Toma lo esencial (códigos/specs)

            base.push({ fuente: f, data: limpio });
            console.log('✅ [' + base.length + '/' + archivos.length + '] ' + f);
        } catch (e) {
            console.error('❌ Error en ' + f + ': ' + e.message);
        }
    }

    fs.writeFileSync(path.join(out, 'noteLLM.json'), JSON.stringify(base));
    console.log('\n🚀 noteLLM.json generado con éxito.');
}

procesar();