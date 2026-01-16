const mongoose = require('mongoose');
async function check() {
  await mongoose.connect('mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0');
  const FilterClassification = require('./models/FilterClassification');
  const result = await FilterClassification.findOne({ originalCode: /^1R0750$/i });
  console.log('MongoDB tiene:', JSON.stringify(result, null, 2));
  await mongoose.disconnect();
  process.exit(0);
}
check();
