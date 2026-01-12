require('dotenv').config();
const mongoose = require('mongoose');

async function cleanDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    
    try {
      await db.dropCollection('filterclassifications');
      console.log('✅ Colección filterclassifications eliminada');
    } catch (error) {
      console.log('ℹ️  Colección no existe o ya estaba vacía');
    }
    
    console.log('✅ Base de datos limpiada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanDatabase();
