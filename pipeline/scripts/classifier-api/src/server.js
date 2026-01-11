require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const classifierService = require('./services/classifier.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const dbStatus = require('./config/database').isConnected() ? 'connected' : 'disconnected';
  const groqStatus = process.env.GROQ_API_KEY ? 'configured' : 'missing';
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: dbStatus,
    groq: groqStatus
  });
});

app.post('/api/classify-filter', async (req, res) => {
  try {
    const { filterCode } = req.body;
    if (!filterCode) {
      return res.status(400).json({ error: 'filterCode is required' });
    }
    const classification = await classifierService.classifyFilter(filterCode);
    res.json(classification);
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/validate-filter', async (req, res) => {
  try {
    const { filterCode } = req.body;
    if (!filterCode) {
      return res.status(400).json({ error: 'filterCode is required' });
    }
    const classification = await classifierService.classifyFilter(filterCode);
    const isValid = classification.manufacturer !== 'UNKNOWN' && classification.confidence !== 'LOW';
    res.json({
      filterCode,
      valid: isValid,
      classification: isValid ? classification : null,
      reason: isValid ? null : 'Unknown manufacturer or low confidence'
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/classify-batch', async (req, res) => {
  try {
    const { filterCodes } = req.body;
    if (!Array.isArray(filterCodes) || filterCodes.length === 0) {
      return res.status(400).json({ error: 'filterCodes array is required' });
    }
    const results = [];
    for (const filterCode of filterCodes) {
      try {
        const classification = await classifierService.classifyFilter(filterCode);
        const isValid = classification.manufacturer !== 'UNKNOWN' && classification.confidence !== 'LOW';
        results.push({
          filterCode,
          valid: isValid,
          classification
        });
      } catch (error) {
        results.push({
          filterCode,
          valid: false,
          error: error.message
        });
      }
    }
    const validCount = results.filter(r => r.valid).length;
    res.json({
      total: filterCodes.length,
      valid: validCount,
      invalid: filterCodes.length - validCount,
      results
    });
  } catch (error) {
    console.error('Batch classify error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const FilterClassification = require('./models/FilterClassification');
    const total = await FilterClassification.countDocuments();
    const byManufacturer = await FilterClassification.aggregate([
      { $group: { _id: '$manufacturer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const byDuty = await FilterClassification.aggregate([
      { $group: { _id: '$duty', count: { $sum: 1 } } }
    ]);
    res.json({
      total,
      byManufacturer,
      byDuty
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  console.log('🚀 Server running on port ' + PORT);
  await connectDB();
});
