require('dotenv').config();
const mongoose = require('mongoose');

// --- Configuración de la Base de Datos ---
const MONGO_URI = process.env.MONGO_URI;
const COLLECTION_NAME = 'MASTER_UNIFIED_V5';

// --- Esquema y Modelo de Mongoose ---
const FilterSchema = new mongoose.Schema({
  Brand: { type: String },
  Input_Code: { type: String }
}, {
  strict: false,
  collection: COLLECTION_NAME
});
const Filter = mongoose.models.Filter || mongoose.model('Filter', FilterSchema);

// --- Función Principal de Consulta ---
async function analyzeBrands() {
  // 1. Validar que la variable de entorno exista
  if (!MONGO_URI) {
    console.error('❌ Error: La variable de entorno MONGO_URI no está definida.');
    console.error('Por favor, crea un archivo .env y añade la cadena de conexión de MongoDB.');
    return;
  }

  try {
    // 2. Conectar a la base de datos de forma segura
    console.log('🔌 Conectando a la base de datos...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conexión a MongoDB establecida con éxito.');

    // Se usan expresiones regulares para una búsqueda insensible a mayúsculas/minúsculas
    const donaldsonRegex = /^DONALDSON$/i;
    const baldwinRegex = /^BALDWIN$/i;

    // --- Parte 1: Recuento de Registros ---
    console.log('\n🔎 Realizando recuento de registros...');
    const donaldsonCount = await Filter.countDocuments({ Brand: donaldsonRegex });
    const baldwinCount = await Filter.countDocuments({ Brand: baldwinRegex });

    console.log('\n--- Resultados del Recuento ---');
    console.log(`- Registros de DONALDSON encontrados: ${donaldsonCount}`);
    console.log(`- Registros de BALDWIN encontrados: ${baldwinCount}`);
    console.log('-----------------------------');

    // --- Parte 2: Resumen de los Primeros 20 Registros ---
    console.log('\n📋 Resumen de los primeros 20 códigos encontrados:');
    const first20Filters = await Filter.find({
      Brand: { $in: [donaldsonRegex, baldwinRegex] }
    }).limit(20).select('Brand Input_Code -_id'); // Seleccionar campos relevantes

    if (first20Filters.length > 0) {
      const summary = first20Filters.map(doc => doc.toObject());
      console.table(summary);
    } else {
      console.log('No se encontraron registros para mostrar en el resumen.');
    }

  } catch (error) {
    console.error('❌ Error al conectar o consultar la base de datos:', error.message);
  } finally {
    // 3. Asegurarse de que la conexión se cierre
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Conexión a MongoDB cerrada.');
    }
  }
}

// Ejecutar la función principal
analyzeBrands();
