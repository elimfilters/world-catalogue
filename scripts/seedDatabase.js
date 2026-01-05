const mongoose = require('mongoose');
require('dotenv').config();
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conexión para Seed exitosa');
  process.exit();
}
seed();
