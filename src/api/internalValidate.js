// =============================================
//  INTERNAL VALIDATION ROUTE - Trusted batch endpoint
// =============================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { validateBatch } = require('../services/internalValidationService');

// POST /api/internal/validate
// Body: { codes: string[], persist: boolean }
router.post('/', async (req, res) => {
  try {
    const codes = Array.isArray(req.body?.codes) ? req.body.codes : [];
    const persist = Boolean(req.body?.persist);

    if (!codes.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing codes',
        details: 'Provide an array of codes to validate',
        example: { codes: ['P552100', 'PH6607'] }
      });
    }

    const { results, summary } = await validateBatch(codes);

    let reportFile = null;
    if (persist) {
      const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const dir = path.join(process.cwd(), 'reports');
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
      reportFile = path.join(dir, `internal_validation_${ts}.json`);
      const payload = { timestamp: new Date().toISOString(), batch: codes, results, summary };
      fs.writeFileSync(reportFile, JSON.stringify(payload, null, 2), 'utf8');
    }

    return res.json({ success: true, results, summary, report: reportFile });
  } catch (error) {
    console.error(' Error in internal validation route:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

module.exports = router;
