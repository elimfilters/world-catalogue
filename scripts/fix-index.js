const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://vabreu_db_user:WhDHejCXzYLy0RLc@cluster0.sewnuei.mongodb.net/elimfilters?retryWrites=true&w=majority&appName=Cluster0';

async function fixIndex() {
  try {
    console.log('🔌 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('filterclassifications');
    
    // Ver todos los índices
    const indexes = await collection.indexes();
    console.log('\n📋 Índices actuales:');
    console.log(JSON.stringify(indexes, null, 2));
    
    // Eliminar el índice problemático
    try {
      await collection.dropIndex('filterCode_1');
      console.log('\n✅ Índice filterCode_1 eliminado');
    } catch (err) {
      console.log('\n⚠️ No se pudo eliminar:', err.message);
    }
    
    // Verificar índices finales
    const finalIndexes = await collection.indexes();
    console.log('\n📋 Índices finales:');
    console.log(JSON.stringify(finalIndexes, null, 2));
    
    await mongoose.connection.close();
    console.log('\n✅ Desconectado');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixIndex();
