/**
 * Process Router - v5.0.0
 * Endpoint para procesar códigos y escribirlos al Google Sheet Master
 */

const express = require('express');
const router = express.Router();
const googleSheetWriter = require('../services/googleSheetWriter');

router.post('/', async (req, res) => {
  try {
    const code = req.body.code || req.body.partNumber;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Filter code is required',
        message: 'Please provide code or partNumber in request body'
      });
    }

    console.log(\\n\\);
    console.log(\📥 POST /api/process - Code: \\);
    console.log(\\\);

    const result = await googleSheetWriter.processAndWrite(code);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(result.alreadyExists ? 200 : 201).json(result);

  } catch (error) {
    console.error(\❌ Error in POST /api/process:\, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: req.body.code || req.body.partNumber
    });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Filter code is required'
      });
    }

    console.log(\\n\\);
    console.log(\📥 GET /api/process/\\);
    console.log(\\\);

    const result = await googleSheetWriter.processAndWrite(code);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(result.alreadyExists ? 200 : 201).json(result);

  } catch (error) {
    console.error(\❌ Error in GET /api/process/:code:\, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: req.params.code
    });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { codes } = req.body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'An array of filter codes is required',
        message: 'Please provide codes array in request body'
      });
    }

    console.log(\\n\\);
    console.log(\📥 POST /api/process/batch - Processing \ codes\);
    console.log(\\\);

    const results = [];
    const errors = [];

    for (const code of codes) {
      try {
        console.log(\\n🔄 Processing \...\);
        const result = await googleSheetWriter.processAndWrite(code);
        results.push({
          code: code,
          ...result
        });
      } catch (error) {
        console.error(\❌ Error processing \:\, error.message);
        errors.push({
          code: code,
          error: error.message
        });
      }
    }

    console.log(\\n✅ Batch complete: \ success, \ errors\);
    console.log(\\\);

    res.status(200).json({
      success: true,
      processed: results.length,
      failed: errors.length,
      total: codes.length,
      results: results,
      errors: errors
    });

  } catch (error) {
    console.error(\❌ Error in POST /api/process/batch:\, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
