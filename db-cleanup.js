require('dotenv').config();
const mongoose = require('mongoose');

// --- Configuración de la Base de Datos ---
const MONGO_URI = process.env.MONGO_URI;
const COLLECTION_NAME = 'MASTER_UNIFIED_V5';

// --- Esquema y Modelo de Mongoose ---
// Se define un esquema mínimo solo para la operación de limpieza.
const FilterSchema = new mongoose.Schema({
  Input_Code: { type: String }
}, {
  strict: false,
  collection: COLLECTION_NAME
});
const Filter = mongoose.models.Filter || mongoose.model('Filter', FilterSchema);

// --- Función de Limpieza ---
async function cleanNonNumericCodes() {
  // 1. Validar que la variable de entorno exista
  if (!MONGO_URI) {
    console.error('❌ Error: La variable de entorno MONGO_URI no está definida.');
    console.error('Por favor, asegúrate de que tu archivo .env está configurado correctamente.');
    return;
  }

  try {
    // 2. Conectar a la base de datos de forma segura
    console.log('🔌 Conectando a la base de datos para la limpieza...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conexión a MongoDB establecida.');

    // --- Ejecutar Operación de Borrado ---
    console.log('\n🗑️  Buscando y eliminando registros donde "Input_Code" no contiene números...');

    // La expresión regular /\d/ busca la presencia de al menos un dígito.
    // Usamos $not para encontrar todos los documentos que NO coinciden.
    const query = { Input_Code: { $not: /\d/ } };

    const deleteResult = await Filter.deleteMany(query);

    console.log('\n--- Resultado de la Limpieza ---');
    if (deleteResult.deletedCount > 0) {
      console.log(`✅ ¡Éxito! Se eliminaron ${deleteResult.deletedCount} registros erróneos.`);
    } else {
      console.log('ℹ️ No se encontraron registros que limpiar. La base de datos ya cumple con la regla.');
    }
    console.log('---------------------------------');

  } catch (error) {
    console.error('❌ Error durante el proceso de limpieza:', error.message);
  } finally {
    // 3. Asegurarse de que la conexión se cierre
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Conexión a MongoDB cerrada.');
    }
  }
}

// Ejecutar la función de limpieza
cleanNonNumericCodes();
