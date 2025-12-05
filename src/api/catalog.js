// =============================================
//  CATALOG SEARCH ENDPOINT
//  Full-text search over equipment/engine applications (J/K)
// =============================================

const express = require('express');
const router = express.Router();
const mongoService = require('../services/mongoService');

// GET /api/catalog/search?q=TERM
router.get('/search', async (req, res) => {
  try {
    const raw = (req.query.q ?? req.query.term ?? '').toString();
    const q = raw.trim();
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const page = Math.max(1, parseInt(req.query.page || '1', 10));

    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Parámetro de búsqueda inválido',
        details: 'Use ?q= con al menos 2 caracteres',
        example: '/api/catalog/search?q=Cummins ISX'
      });
    }

    const results = await mongoService.searchCatalogByText(q, { limit, page });
    const payload = results.map(doc => ({
      score: doc.score,
      normsku: doc.normsku,
      sku: doc.sku,
      family: doc.family,
      duty: doc.duty,
      equipment_applications: doc.equipment_applications,
      engine_applications: doc.engine_applications,
      oem_codes: doc.oem_codes,
      cross_reference: doc.cross_reference,
      source: doc.source,
      timestamp: doc.timestamp
    }));

    return res.json({
      success: true,
      query: q,
      page,
      limit,
      count: payload.length,
      results: payload
    });
  } catch (error) {
    console.error('❌ Error in catalog search:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;