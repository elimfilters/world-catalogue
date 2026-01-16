const mongoose = require('mongoose');

async function cleanCache() {
  try {
    const MONGODB_URI = 'mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const FilterClassification = require('./models/FilterClassification');
    
    const codes = ['1R1808', '1R0750', '2P4005'];
    
    for (const code of codes) {
      const result = await FilterClassification.deleteMany({ 
        originalCode: new RegExp(`^${code}$`, 'i')
      });
      console.log(`Deleted ${code}:`, result.deletedCount, 'records');
    }
    
    console.log('\n✅ Cache cleaned successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanCache();
