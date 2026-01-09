require('dotenv').config();
const mongoose = require('mongoose');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const Groq = require('groq-sdk');

// Conectar MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Configurar Google Sheets
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);

// Configurar GROQ
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Scraper Donaldson (simplificado para prueba)
async function scrapeDonaldson(code) {
  // Aquí iría tu scraper real
  return {
    success: true,
    alternatives: [
      { code: 'P551808', microns: 21, media: 'Celulosa', level: 'PERFORMANCE' },
      { code: 'P554005', microns: 40, media: 'Blend', level: 'STANDARD' },
      { code: 'DBL7405', microns: 15, media: 'Synteq', level: 'ELITE' }
    ]
  };
}

// Determinar DUTY con AI
async function determineDuty(specs) {
  const prompt = `Analiza estas especificaciones de filtro y determina:
1. DUTY (HD o LD)
2. Tipo de filtro (Air, Lube, Fuel, etc)

Especificaciones: ${JSON.stringify(specs)}

Responde SOLO con JSON sin markdown:
{ "duty": "HD", "filterType": "Lube" }`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0
  });

  let response = completion.choices[0].message.content;
  // Limpiar markdown
  response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(response);
}

// Generar SKU ELIMFILTERS
function generateElimSKU(donaldsonCode, filterType, level) {
  const prefixes = {
    'Air': { 'PERFORMANCE': 'EA1', 'STANDARD': 'EA2', 'ELITE': 'EA3' },
    'Lube': { 'PERFORMANCE': 'EL8', 'STANDARD': 'EL8', 'ELITE': 'EL8' },
    'Fuel': { 'PERFORMANCE': 'EF9', 'STANDARD': 'EF9', 'ELITE': 'EF9' }
  };

  const prefix = prefixes[filterType][level];
  const lastDigits = donaldsonCode.replace(/\D/g, '').slice(-4);
  
  return prefix + lastDigits;
}

// Buscar en caché
async function searchCache(code) {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
  const rows = await sheet.getRows();
  
  return rows.find(row => row.get('Original_Code') === code);
}

// Guardar en MongoDB y Google Sheets
async function saveProduct(product) {
  // MongoDB
  const Filter = mongoose.model('Filter', new mongoose.Schema({}, { strict: false }));
  await Filter.create(product);

  // Google Sheets
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
  await sheet.addRow(product);
}

// ENDPOINT PRINCIPAL
async function processFilter(req, res) {
  try {
    const { code } = req.params;

    // 1. Buscar en caché
    const cached = await searchCache(code);
    if (cached) {
      return res.json({ success: true, source: 'cache', data: cached });
    }

    // 2. Scrapear Donaldson
    const scraped = await scrapeDonaldson(code);
    if (!scraped.success) {
      return res.status(404).json({ success: false, error: 'Code not found' });
    }

    // 3. Procesar cada alternativa
    const results = [];
    for (const alt of scraped.alternatives) {
      // Determinar DUTY y tipo
      const analysis = await determineDuty(alt);
      
      // Generar SKU ELIMFILTERS
      const elimSKU = generateElimSKU(alt.code, analysis.filterType, alt.level);
      
      const product = {
        Original_Code: code,
        Donaldson_Code: alt.code,
        ELIMFILTERS_SKU: elimSKU,
        Duty: analysis.duty,
        Filter_Type: analysis.filterType,
        Technology_Level: alt.level,
        Microns: alt.microns,
        Media: alt.media
      };

      results.push(product);
      await saveProduct(product);
    }

    res.json({ success: true, source: 'generated', data: results });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { processFilter };
