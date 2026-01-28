const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['https://elimfilters.com'],
  methods: ['GET','POST'],
  credentials: true
}));

app.use(express.json());

// 🔐 Mongo desde variable de entorno
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// 🧬 ADN OFICIAL ELIMFILTERS
const ADN = {
  "AIRE": { p: "EA1", t: "MACROCORE™", m: "Aire 100% puro al motor." },
  "CARCASAS": { p: "EA2", t: "INTEKCORE™", m: "Estructura de flujo optimizado y máxima resistencia." },
  "COMBUSTIBLE": { p: "EF9", t: "SYNTEPORE™", m: "Armadura sintética, combustible 100% puro." },
  "SEPARADOR": { p: "ES9", t: "AQUAGUARD™", m: "Protección total contra la humedad y el agua." },
  "ACEITE": { p: "EL8", t: "SINTRAX™", m: "Lubricación extrema para el sistema." },
  "HIDRAULICO": { p: "EH6", t: "NANOFORCE™", m: "Flujo optimizado para alta presión." },
  "TURBINA": { p: "ET9", t: "AQUAGUARD™", m: "Protección máxima y suavidad en el flujo." },
  "REFRIGERANTE": { p: "EW7", t: "COOLTECH™", m: "Control de corrosión y equilibrio térmico." },
  "CABINA": { p: "EC1", t: "MICROKAPPA™", m: "Protección contra alérgenos y aire puro." },
  "SECADOR": { p: "ED4", t: "DRYCORE™", m: "Eliminación total de humedad en frenos." },
  "DEF": { p: "ED3", t: "BLUECLEAN™", m: "Pureza máxima para sistemas de urea." },
  "GAS": { p: "EG3", t: "GASULTRA™", m: "Filtración de precisión para motores a gas." },
  "KITS HD": { p: "EK5", t: "DURATECH™", m: "Solución completa en una caja (Heavy Duty)." },
  "KITS LD": { p: "EK3", t: "DURATECH™", m: "Solución completa en una caja (Light Duty)." },
  "MARINO": { p: "EM9", t: "MARINECLEAN™", m: "Protección anticorrosiva y máxima pureza en mar abierto." }
};

async function startServer() {
  try {
    await client.connect();
    const db = client.db('elimfilters');

    // 🔹 Root
    app.get('/', (req, res) => {
      res.json({ status: "ELIMFILTERS API ACTIVE" });
    });

    // 🔹 Health check
    app.get('/health', (req, res) => {
      res.status(200).json({ status: "OK", uptime: process.uptime() });
    });

    // 🔹 Search
    app.post('/api/search', async (req, res) => {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Code requerido" });

      const cleanCode = code.toUpperCase().trim();

      try {
        const filter = await db.collection('MASTER_UNIFIED_V5').findOne({
          $or: [
            { Final_SKU: cleanCode },
            { Input_Code: cleanCode },
            { OEM_Codes: cleanCode },
            { Cross_Reference_Codes: cleanCode }
          ]
        });

        if (!filter) {
          return res.status(404).json({ message: "No encontrado" });
        }

        const cat = (filter.Category || "").toUpperCase();
        const numOnly = (filter.Input_Code || "").replace(/[^0-9]/g, '');
        const suffix = numOnly.slice(-4).padStart(4, '0');

        let finalSku = filter.Final_SKU;
        let tech = "ELIMFILTERS GENUINE";
        let marketing = "";

        for (let key in ADN) {
          if (cat.includes(key)) {
            finalSku = ADN[key].p + suffix;
            tech = ADN[key].t;
            marketing = ADN[key].m;
            break;
          }
        }

        return res.json({
          type: 'filter',
          brand: filter.Brand,
          sku: finalSku,
          category: filter.Category,
          technology: tech,
          marketing: marketing,
          alternatives: filter.AK || filter.Cross_Reference_Codes || "N/A",
          specs: filter.Specs || []
        });

      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    });

    app.listen(process.env.PORT || 8080, () => {
      console.log("🚀 ELIMFILTERS API running");
    });

  } catch (err) {
    console.error("Error iniciando servidor:", err);
  }
}

startServer();
