const mongoose = require('mongoose');

async function investigateMongoDB() {
  try {
    const MONGODB_URI = 'mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/?appName=Cluster0';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Ver todas las colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Collections in database:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Buscar el registro de 1R0750 en todas las colecciones posibles
    console.log('\n🔍 Searching for 1R0750...\n');
    
    for (const col of collections) {
      const collection = mongoose.connection.db.collection(col.name);
      const results = await collection.find({ $or: [
        { originalCode: '1R0750' },
        { filterCode: '1R0750' },
        { code: '1R0750' },
        { _id: '1R0750' }
      ]}).toArray();
      
      if (results.length > 0) {
        console.log(`✅ Found in collection: ${col.name}`);
        console.log(JSON.stringify(results, null, 2));
      }
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

investigateMongoDB();
