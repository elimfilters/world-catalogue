require('dotenv').config();
const mongoose = require('mongoose');
const FilterClassification = require('./models/FilterClassification');

async function cleanDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Eliminar clasificaciones con HD/LD
    const result = await FilterClassification.deleteMany({ 
      duty: 'HD/LD' 
    });
    
    console.log(`🗑️  Eliminadas ${result.deletedCount} clasificaciones con HD/LD`);
    
    await mongoose.disconnect();
    console.log('✅ Base de datos limpiada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanDatabase();
