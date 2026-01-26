const fs = require('fs');
const pdf = require('pdf-parse');
const { MongoClient } = require('mongodb');

// Diccionario de Prefijos para determinar Marca y Duty automáticamente
const OEM_IDENTIFIER = {
    "1R": { brand: "CATERPILLAR", duty: "HD", adn: "EL8" },
    "P55": { brand: "DONALDSON", duty: "HD", adn: "EL8" },
    "PH": { brand: "FRAM", duty: "LD", adn: "EL8" },
    "CA": { brand: "FRAM", duty: "LD", adn: "EA1" },
    "W": { brand: "MANN", duty: "LD", adn: "EL8" },
    "C": { brand: "MANN", duty: "LD", adn: "EA1" }
};

async function depuracionQuirurgica() {
    const client = new MongoClient("mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/");
    await client.connect();
    const col = client.db('elimfilters').collection('MASTER_UNIFIED_V5');
    
    // 1. Leer PDFs y crear mapa de memoria para no saturar RAM
    // 2. Por cada registro en RAW, buscar su prefijo OEM
    const cursor = col.find({ status: "RAW" });

    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const code = doc.Input_Code.toUpperCase();
        
        // Detectar si el código pertenece a un fabricante real
        let meta = null;
        for (let prefix in OEM_IDENTIFIER) {
            if (code.startsWith(prefix)) { meta = OEM_IDENTIFIER[prefix]; break; }
        }

        if (meta) {
            // BUSCAR EN PDF la tabla técnica de este código
            // Aquí extraemos los datos para las 40 columnas
            const updateData = {
                "Brand_Source": meta.brand,
                "Duty": meta.duty,
                "ADN_Prefix": meta.adn,
                "Thread_Size": extraerDato(code, "Thread"), // Función que busca en el PDF
                "Outer_Diameter": extraerDato(code, "OD"),
                "Height": extraerDato(code, "H"),
                "Status": "CERTIFIED_OEM",
                "SKU_Elimfilters": meta.adn + code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')
            };

            await col.updateOne({ _id: doc._id }, { $set: updateData });
            console.log(`🎯 CERTIFICADO OEM: ${code} -> SKU: ${updateData.SKU_Elimfilters}`);
        } else {
            // Si no tiene prefijo OEM conocido, es ruido (como los años 2021)
            await col.updateOne({ _id: doc._id }, { $set: { status: "DISCARDED_NOISE" } });
        }
    }
}
depuracionQuirurgica();
