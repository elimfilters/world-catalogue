// =============================================
//  DETECT FILTER ENDPOINT
// =============================================

const express = require('express');
const router = express.Router();
const { detectFilter } = require('../services/detectionServiceFinal');
const { buildRowData } = require('../services/syncSheetsService');
const { enforceSkuPolicyInvariant, getPolicyConfig } = require('../services/skuCreationPolicy');

// =============================================
//  GET /api/detect/:code
//  Detect filter by part number
// =============================================
router.get('/:code', async (req, res) => {
    try {
        const code = req.params.code?.trim();
        const force = (String(req.query.force || '').toLowerCase() === 'true') || (req.query.force === '1');
        const generateAll = (String(req.query.generate_all || '').toLowerCase() === 'true') || (req.query.generate_all === '1');
        const qlang = String(req.query.lang || '').toLowerCase();
        const lang = qlang === 'es' ? 'es' : 'en';

        // Validation
        if (!code || code.length < 3) {
            return res.status(400).json({
                error: 'Invalid part number',
                details: 'Part number must be at least 3 characters',
                example: '/api/detect/P552100'
            });
        }
        if (!/^[A-Za-z0-9-]{3,64}$/.test(code)) {
            return res.status(400).json({
                error: 'Invalid part number format',
                details: 'Only letters, numbers, and hyphen allowed (3-64 chars)'
            });
        }

        console.log(`🔎 Detecting filter: ${code} (force=${force}, generate_all=${generateAll}, lang=${lang})`);

        const result = await detectFilter(code, lang, { force, generateAll });

        // Previsualización de fila para Google Sheets (G: oem_codes, H: cross_reference)
        let sheet_preview = {};
        try {
            sheet_preview = buildRowData({
                query_normalized: result.query || code,
                sku: result.sku,
                duty: result.duty,
                type: result.type || result.filter_type || result.family,
                family: result.family,
                oem_codes: result.oem_codes,
                cross_reference: result.cross_reference,
                attributes: result.attributes || {},
                equipment_applications: result.equipment_applications || [],
                engine_applications: result.engine_applications || result.applications || []
            }) || {};
        } catch (_) { sheet_preview = {}; }

        // QA: Validación de Volumen (VOL_LOW) para columnas J/K
        const toArray = (v) => Array.isArray(v)
            ? v
            : (typeof v === 'string' ? String(v).split(', ').map(s => s.trim()).filter(Boolean) : []);
        const uniqCount = (arr) => {
            try { return new Set(arr.map(s => String(s).toLowerCase())).size; } catch (_) { return 0; }
        };
        const eqAppsArr = toArray(result.equipment_applications || []);
        const enAppsArr = toArray(result.engine_applications || result.applications || []);
        const minRequired = 6;
        const eqCount = uniqCount(eqAppsArr);
        const enCount = uniqCount(enAppsArr);
        const qa = {
            VOL_LOW: (eqCount < minRequired) || (enCount < minRequired),
            details: {
                min_required: minRequired,
                equipment_count: eqCount,
                engine_count: enCount,
                equipment_vol_low: eqCount < minRequired,
                engine_vol_low: enCount < minRequired
            }
        };

        // Enforce inviolable SKU policy before responding
        const payload = { query: code, ...result, policy: getPolicyConfig() };
        const policyCheck = enforceSkuPolicyInvariant(payload);
        if (!policyCheck.ok) {
            return res.status(422).json({
                success: false,
                query: code,
                error: 'Policy violation',
                details: policyCheck.error,
                policy: getPolicyConfig()
            });
        }

        return res.json({ success: true, ...payload, qa_flags: { VOL_LOW: qa.VOL_LOW }, qa, sheet_preview: {
            query: sheet_preview.query,
            normsku: sheet_preview.normsku,
            oem_codes: sheet_preview.oem_codes,
            cross_reference: sheet_preview.cross_reference,
            equipment_applications: sheet_preview.equipment_applications,
            engine_applications: sheet_preview.engine_applications
        } });

    } catch (error) {
        const isVolLow = String(error?.code).toUpperCase() === 'VOL_LOW' || error?.status === 400 || /VOL_LOW/i.test(String(error?.message || ''));
        if (isVolLow) {
            console.error('❌ VOL_LOW guard triggered on detect:', error.message);
            return res.status(400).json({
                success: false,
                error: 'VOL_LOW',
                details: error.message,
                qa_flags: { VOL_LOW: true }
            });
        }
        console.error('❌ Error in detect endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// =============================================
//  GET /api/detect/search?q=
//  Search filters by query
// =============================================
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q?.trim();
        const force = (String(req.query.force || '').toLowerCase() === 'true') || (req.query.force === '1');
        const generateAll = (String(req.query.generate_all || '').toLowerCase() === 'true') || (req.query.generate_all === '1');
        const qlang = String(req.query.lang || '').toLowerCase();
        const lang = qlang === 'es' ? 'es' : 'en';

        if (!query) {
            return res.status(400).json({
                error: 'Missing query parameter',
                details: 'Please provide ?q= parameter',
                example: '/api/detect/search?q=P552100'
            });
        }
        if (!/^[A-Za-z0-9-]{3,64}$/.test(query)) {
            return res.status(400).json({
                error: 'Invalid query format',
                details: 'Only letters, numbers, and hyphen allowed (3-64 chars)'
            });
        }

        console.log(`🔍 Searching: ${query} (force=${force}, generate_all=${generateAll}, lang=${lang})`);

        const result = await detectFilter(query, lang, { force, generateAll });

        // Previsualización de fila para Google Sheets (G: oem_codes, H: cross_reference)
        let sheet_preview = {};
        try {
            sheet_preview = buildRowData({
                query_normalized: result.query || query,
                sku: result.sku,
                duty: result.duty,
                type: result.type || result.filter_type || result.family,
                family: result.family,
                oem_codes: result.oem_codes,
                cross_reference: result.cross_reference,
                attributes: result.attributes || {},
                equipment_applications: result.equipment_applications || [],
                engine_applications: result.engine_applications || result.applications || []
            }) || {};
        } catch (_) { sheet_preview = {}; }

        // QA: Validación de Volumen (VOL_LOW) para columnas J/K
        const toArray2 = (v) => Array.isArray(v)
            ? v
            : (typeof v === 'string' ? String(v).split(', ').map(s => s.trim()).filter(Boolean) : []);
        const uniqCount2 = (arr) => {
            try { return new Set(arr.map(s => String(s).toLowerCase())).size; } catch (_) { return 0; }
        };
        const eqAppsArr2 = toArray2(result.equipment_applications || []);
        const enAppsArr2 = toArray2(result.engine_applications || result.applications || []);
        const minRequired2 = 6;
        const eqCount2 = uniqCount2(eqAppsArr2);
        const enCount2 = uniqCount2(enAppsArr2);
        const qa2 = {
            VOL_LOW: (eqCount2 < minRequired2) || (enCount2 < minRequired2),
            details: {
                min_required: minRequired2,
                equipment_count: eqCount2,
                engine_count: enCount2,
                equipment_vol_low: eqCount2 < minRequired2,
                engine_vol_low: enCount2 < minRequired2
            }
        };

        return res.json({
            success: true,
            query,
            ...result,
            qa_flags: { VOL_LOW: qa2.VOL_LOW },
            qa: qa2,
            sheet_preview: {
                query: sheet_preview.query,
                normsku: sheet_preview.normsku,
                oem_codes: sheet_preview.oem_codes,
                cross_reference: sheet_preview.cross_reference,
                equipment_applications: sheet_preview.equipment_applications,
                engine_applications: sheet_preview.engine_applications
            }
        });

    } catch (error) {
        const isVolLow = String(error?.code).toUpperCase() === 'VOL_LOW' || error?.status === 400 || /VOL_LOW/i.test(String(error?.message || ''));
        if (isVolLow) {
            console.error('❌ VOL_LOW guard triggered on detect search:', error.message);
            return res.status(400).json({
                success: false,
                error: 'VOL_LOW',
                details: error.message,
                qa_flags: { VOL_LOW: true }
            });
        }
        console.error('❌ Error in search endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;
