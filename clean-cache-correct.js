const mongoose = require('mongoose');

async function cleanCache() {
  try {
    const MONGODB_URI = 'mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/?appName=Cluster0';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Usar directamente la colección
    const FilterClassification = mongoose.connection.collection('filterclassifications');
    
    const codes = ['1R1808', '1R0750', '2P4005'];
    
    for (const code of codes) {
      const result = await FilterClassification.deleteMany({ 
        originalCode: { $regex: new RegExp(`^${code}$`, 'i') }
      });
      console.log(`Deleted ${code}:`, result.deletedCount, 'records');
    }
    
    // También buscar con el _id exacto que vimos antes
    const result2 = await FilterClassification.deleteOne({ 
      _id: new mongoose.Types.ObjectId('6964902ea3344ce22325d3f3')
    });
    console.log('Deleted by _id:', result2.deletedCount, 'records');
    
    console.log('\n✅ Cache cleaned!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanCache();
