// Seed mínimo para vin_application_map
// Ejecutar: npm run seed:vin

try { require('dotenv').config(); } catch (_) {}

const mongoService = require('../src/services/mongoService');
const { upsertMapping } = require('../src/services/vinApplicationMapService');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.log('ℹ️  MONGODB_URI no está configurado. Configure el URI y reintente.');
    return;
  }
  try {
    await mongoService.connect();
    console.log('✅ Conexión a MongoDB establecida');
  } catch (e) {
    console.log('❌ Error conectando a MongoDB:', e.message);
    return;
  }
  const seeds = [
    // Ford F-150 (ejemplo moderno solicitado)
    { make: 'FORD', model: 'F-150', year: 2020, engine_liters: '5.0L', filter_type: 'OIL',  oem_code_target: 'FL-500S', source: 'seed' },
    { make: 'FORD', model: 'F-150', year: 2020, engine_liters: '5.0L', filter_type: 'AIR',  oem_code_target: 'CA10262', source: 'seed' },
    { make: 'FORD', model: 'F-150', year: 2020, engine_liters: '5.0L', filter_type: 'FUEL', oem_code_target: 'G3727',  source: 'seed' },
    { make: 'FORD', model: 'F-150', year: 2020, engine_liters: '5.0L', filter_type: 'CABIN',oem_code_target: 'CF10285', source: 'seed' },

    // Ford F-150 clásico (alta compatibilidad con detectFilter)
    { make: 'FORD', model: 'F-150', year: 1985, engine_liters: '5.0L', filter_type: 'OIL',  oem_code_target: 'PH8A',   source: 'seed' },
    { make: 'FORD', model: 'F-150', year: 1985, engine_liters: '5.0L', filter_type: 'AIR',  oem_code_target: 'CA10262', source: 'seed' },

    // Chevrolet (placeholder consistente con vinService)
    { make: 'CHEVROLET', model: 'SILVERADO', year: 2010, engine_liters: '5.3L', filter_type: 'OIL',  oem_code_target: 'PH3614',  source: 'seed' },
    { make: 'CHEVROLET', model: 'SILVERADO', year: 2010, engine_liters: '5.3L', filter_type: 'AIR',  oem_code_target: 'CA9997',  source: 'seed' },
    { make: 'CHEVROLET', model: 'SILVERADO', year: 2010, engine_liters: '5.3L', filter_type: 'FUEL', oem_code_target: 'G6607',   source: 'seed' },
    { make: 'CHEVROLET', model: 'SILVERADO', year: 2010, engine_liters: '5.3L', filter_type: 'CABIN',oem_code_target: 'CF10709', source: 'seed' },

    // Toyota Corolla
    { make: 'TOYOTA', model: 'COROLLA', year: 2015, engine_liters: '1.8L', filter_type: 'OIL',  oem_code_target: 'PH7317',  source: 'seed' },
    { make: 'TOYOTA', model: 'COROLLA', year: 2015, engine_liters: '1.8L', filter_type: 'AIR',  oem_code_target: 'CA10467', source: 'seed' },
    { make: 'TOYOTA', model: 'COROLLA', year: 2015, engine_liters: '1.8L', filter_type: 'FUEL', oem_code_target: 'G3727',   source: 'seed' },
    { make: 'TOYOTA', model: 'COROLLA', year: 2015, engine_liters: '1.8L', filter_type: 'CABIN',oem_code_target: 'CF11182', source: 'seed' },
  ];

  let ok = 0, fail = 0;
  for (const s of seeds) {
    try {
      const res = await upsertMapping(s);
      if (res && res.make_model_year_engine) {
        console.log('✔ upsert:', res.make_model_year_engine, res.filter_type, '→', res.oem_code_target);
        ok++;
      } else {
        console.log('✖ upsert sin resultado válido:', s);
        fail++;
      }
    } catch (e) {
      console.log('✖ upsert error:', s, e.message);
      fail++;
    }
  }
  console.log(`Seed completado. OK=${ok} FAIL=${fail}`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });