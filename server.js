const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('âœ… MongoDB connected'))
  .catch(err => console.error('âŒ MongoDB error:', err));

const FilterSchema = new mongoose.Schema({
  originalCode: { type: String, required: true, index: true },
  sku: { type: String, required: true, unique: true },
  description: String,
  filterType: String,
  subtype: String,
  installationType: String,
  prefix: String,
  technology: String,
  duty: String,
  threadSize: String,
  dimensions: {
    height_mm: Number, height_inch: Number,
    outerDiameter_mm: Number, outerDiameter_inch: Number,
    innerDiameter_mm: Number
  },
  gasket: {
    od_mm: Number, od_inch: Number,
    id_mm: Number, id_inch: Number
  },
  performance: {
    isoTestMethod: String, micronRating: String,
    betaRatio: String, nominalEfficiency: String,
    ratedFlow_lmin: Number, ratedFlow_gpm: Number, ratedFlow_cfm: Number
  },
  pressure: {
    max_psi: Number, burst_psi: Number, collapse_psi: Number,
    bypassValve_psi: Number, pressureValve: String
  },
  technical: {
    mediaType: String, antiDrainbackValve: String,
    filtrationTechnology: String, specialFeatures: String
  },
  applications: {
    oemCodes: String, crossReferenceCodes: String,
    equipmentApplications: String, engineApplications: String,
    equipmentYear: String, qtyRequired: Number
  },
  technicalSheetUrl: String
}, { timestamps: true });

const Filter = mongoose.model('Filter', FilterSchema);

app.get('/', (req, res) => res.send('Motor ELIMFILTERS V2 - Activo'));
app.listen(process.env.PORT || 8080, () => console.log('ðŸš€ Server running'));