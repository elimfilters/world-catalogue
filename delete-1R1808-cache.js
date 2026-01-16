require('dotenv').config();
const mongoose = require('mongoose');

async function deleteOldRecord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const FilterClassification = require('./models/FilterClassification');
    
    const result = await FilterClassification.deleteOne({ originalCode: '1R1808' });
    console.log('Deleted:', result);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteOldRecord();
