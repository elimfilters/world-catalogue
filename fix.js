const mongoose = require('mongoose');

async function fixCache() {
  const MONGODB_URI = 'mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0';
  await mongoose.connect(MONGODB_URI);
  
  const FilterClassification = require('./models/FilterClassification');
  
  await FilterClassification.deleteMany({ originalCode: /^1R0750$/i });
  console.log('✅ Caché limpiado');
  
  await mongoose.disconnect();
  process.exit(0);
}
fixCache();
