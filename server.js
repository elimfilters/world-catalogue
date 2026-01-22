const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

// CONFIGURACIÓN MAESTRA ELIMFILTERS V5.10 (VERSIÓN TÉCNICA FINAL)
const config = {
    'Oil': { prefix: 'EL8', tech: 'SYNTRAX™' },
    'Air': { prefix: 'EA1', tech: 'MACROCORE™' },
    'Air_Housing': { prefix: 'EA2', tech: 'INTEKCORE™' },
    'Fuel': { prefix: 'EF9', tech: 'NANOFORCE™' },
    'Fuel_Separator': { prefix: 'ES9', tech: 'AQUAGUARD™' },
    'Hydraulic': { prefix: 'EH6', tech: 'SYNTEPORE™' },
    'Turbines': { prefix: 'ET9', tech: 'AQUAGUARD™' },     // ET9: Turbinas + AQUAGUARD
    'Marine': { prefix: 'EM9', tech: 'MARINETECH™' },      // EM9: Marine + MARINETECH
    'Kit_HD': { prefix: 'EK5', tech: 'DURATECH™' },
    'Kit_LD': { prefix: 'EK3', tech: 'DURATECH™' },
    'Cabin': { prefix: 'EC1', tech: 'MICROKAPPA™' },
    'Air_Brake_Dryer': { prefix: 'ED4', tech: 'DRYCORE™' },
    'Coolant': { prefix: 'EW7', tech: 'COOLTECH™' }
};

app.post("/generate", async (req, res) => {
    try {
        const { refCode, category } = req.body;
        const mapping = config[category] || { prefix: "GEN", tech: "STANDARD™" };
        
        // Regla de los 4 números (Identidad ELIMFILTERS)
        const numbersOnly = refCode.replace(/[^0-9]/g, "");
        const suffix = numbersOnly.slice(-4).padStart(4, "0");
        const sku = `${mapping.prefix}${suffix}`;

        res.json({
            source: "V5.10_TOTAL_UNIVERSE",
            data: {
                sku: sku,
                technology: mapping.tech,
                category: category,
                status: "Production Ready"
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("✅ MongoDB Conectado");
        app.listen(PORT, () => console.log(`🚀 Servidor V5.10 TOTAL UNIVERSE en puerto ${PORT}`));
    })
    .catch(err => console.error("❌ Error:", err));
