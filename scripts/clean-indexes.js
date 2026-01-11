const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://vabreu_db_user:WhDHejCXzYLy0RLc@cluster0.sewnuei.mongodb.net/elimfilters?retryWrites=true&w=majority&appName=Cluster0';

async function cleanAllIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('filterclassifications');
    
    const indexes = await collection.indexes();
    console.log('\n📋 Índices encontrados:');
    indexes.forEach(idx => console.log(`  - ${idx.name}`));
    
    // Eliminar filterCode_1 si existe
    try {
      await collection.dropIndex('filterCode_1');
      console.log('\n✅ Índice filterCode_1 eliminado');
    } catch (err) {
      console.log('\n⚠️ filterCode_1 no existe o ya fue eliminado');
    }
    
    const finalIndexes = await collection.indexes();
    console.log('\n📋 Índices finales:');
    finalIndexes.forEach(idx => console.log(`  - ${idx.name}`));
    
    await mongoose.connection.close();
    console.log('\n✅ Limpieza completa');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanAllIndexes();
