const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { MongoClient } = require('mongodb');

const CATALOG_PATH = 'C:\\Users\\VICTOR ABREU\\Elimfilters-Orchestrator\\catalogos_pdf';
const MONGO_URI = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/";

async function depurar() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const col = client.db('elimfilters').collection('MASTER_UNIFIED_V5');

    const archivos = fs.readdirSync(CATALOG_PATH).filter(f => f.endsWith('.pdf'));
    console.log(`🚀 Escaneando ${archivos.length} catálogos con Filtro de Integridad Alfanumérico...`);

    for (const archivo of archivos) {
        const isHD = /donaldson|baldwin|fleetguard/i.test(archivo);
        const duty = isHD ? "HD" : "LD";
        
        console.log(`\n📂 Procesando: ${archivo} | Sector: ${duty}`);
        const dataBuffer = fs.readFileSync(path.join(CATALOG_PATH, archivo));
        const data = await pdf(dataBuffer);
        const contenido = data.text.toUpperCase();

        const cursor = col.find({ status: "RAW" });
        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            const code = doc.Input_Code.toUpperCase();

            // --- FILTRO DE INTEGRIDAD ---
            // Solo procesamos si el código tiene números y no es una palabra común larga
            const esCodigoValido = /[0-9]/.test(code) && code.length > 2;
            
            if (esCodigoValido && contenido.includes(code)) {
                const fragmento = contenido.substring(contenido.indexOf(code), contenido.indexOf(code) + 400);
                
                // Buscamos evidencia de ingeniería (Roscas, micras, dimensiones)
                const esMecanico = /THREAD|MICRON|MM|INCH|BYPASS|GASKET|AIR|OIL|FUEL|SPEC/i.test(fragmento);

                if (esMecanico) {
                    let raiz = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
                    let prefijo = isHD ? "EL8" : "EA1"; 
                    
                    await col.updateOne({ _id: doc._id }, {
                        $set: { 
                            "ELIMFILTERS SKU": prefijo + raiz,
                            "Duty": duty,
                            "status": "PROCESSED",
                            "audit_source": archivo
                        }
                    });
                    console.log(`✅ CERTIFICADO REAL: ${code} -> ${prefijo}${raiz} [${duty}]`);
                }
            }
        }
    }
    await client.close();
}
depurar();
