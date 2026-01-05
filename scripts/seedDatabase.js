const mongoose = require('mongoose');
const Filter = require('../models/filterModel');
require('dotenv').config();
const sample = [
  { sku: "EL82100", filter_type: "LUBE OIL", description: "Filtro alta eficiencia", oem_codes: [{code: "1R-0750", manufacturer: "Caterpillar"}] },
  { sku: "EL93456", filter_type: "FUEL", description: "Filtro Common Rail", oem_codes: [{code: "5303743", manufacturer: "Cummins"}] }
];
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Filter.deleteMany({});
  await Filter.insertMany(sample);
  console.log('✅ Base de datos poblada con v11.0.6');
  process.exit();
}
seed();
