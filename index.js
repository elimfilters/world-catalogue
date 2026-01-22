require('dotenv').config();
const mongoose = require('mongoose');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const config = {
    'Oil': { prefix: 'EL8', tech: 'SYNTRAX™' },
    'Air': { prefix: 'EA1', tech: 'MACROCORE™' },
    'Fuel': { prefix: 'EF9', tech: 'NANOFORCE™' },
    'Fuel_Separator': { prefix: 'ES9', tech: 'AQUAGUARD™' },
    'Hydraulic': { prefix: 'EH6', tech: 'SYNTEPORE™' },
    'Kit_HD': { prefix: 'EK5', tech: 'DURATECH™' },
    'Kit_LD': { prefix: 'EK3', tech: 'DURATECH™' },
    'Cabin': { prefix: 'EC1', tech: 'MICROKAPPA™' },
    'Coolant': { prefix: 'EW7', tech: 'COOLTECH™' }
};

const Filter = mongoose.models.Filter || mongoose.model('Filter', new mongoose.Schema({
    sku: { type: String, unique: true },
    refCodes: [String],
    category: String,
    tech: String,
    duty: String,
    specs: Object,
    timestamp: { type: Date, default: Date.now }
}));

async function processFilter(refCode, category, specs = {}) {
    try {
        if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
        
        const suffix = refCode.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
        const map = config[category] || { prefix: 'GEN', tech: 'STANDARD' };
        const sku = `${map.prefix}${suffix}`;
        const duty = refCode.toLowerCase().includes('cat') || specs.h > 200 ? 'HD' : 'LD';

        const data = {
            sku: sku,
            category: category,
            tech: map.tech,
            duty: duty,
            specs: {
                h_mm: specs.h || 0,
                h_in: specs.h ? (specs.h / 25.4).toFixed(2) : 'N/A',
                od_mm: specs.od || 0,
                od_in: specs.od ? (specs.od / 25.4).toFixed(2) : 'N/A'
            }
        };

        await Filter.findOneAndUpdate({ sku }, { $set: data, $addToSet: { refCodes: refCode } }, { upsert: true });

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        
        await sheet.addRow({
            'ELIMFILTERS SKU': data.sku,
            'Original Ref': refCode,
            'Technology': data.tech,
            'Duty': data.duty,
            'Height (in)': data.specs.h_in,
            'OD (in)': data.specs.od_in,
            'Technical URL': 'https://techtips.elimfilters.com/spec-sheet/' + data.sku
        });

        console.log('✅ PROCESADO: ' + refCode + ' -> SKU: ' + data.sku);
    } catch (e) {
        console.error('❌ ERROR en ' + refCode + ': ' + e.message);
    }
}

// EJECUCIÓN DE PRUEBA
async function main() {
    console.log('--- Iniciando Motor Real ELIMFILTERS ---');
    await processFilter('P553000', 'Oil', { h: 176, od: 93 });
    await processFilter('PH8A', 'Oil', { h: 130, od: 93 });
    console.log('--- Proceso Finalizado ---');
    process.exit(0);
}

main();