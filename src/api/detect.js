// =============================================
//  DETECT FILTER ENDPOINT - PRODUCTION READY
//  Version: 5.0.1
//  Last Updated: 2025-12-20
// =============================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { detectFilter } = require('../services/detectionServiceFinal');
const { buildRowData } = require('../services/syncSheetsService');
const { enforceSkuPolicyInvariant, getPolicyConfig } = require('../services/skuCreationPolicy');

// =============================================
//  TELEMETRÍA: Registro de eventos
// =============================================
const EMPTY_APPS_LOG = path.join(__dirname, '..', '..', 'reports', 'empty_equipment_applications.jsonl');

function logEmptyAppsEvent(event) {
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            route: event.route,
            query: event.query,
            code: event.code,
            relaxed: !!event.relaxed,
            duty: event.duty || null,
            family: event.family || null,
            source: event.source || null,
            sku: event.sku || null,
            lang: event.lang || 'en',
            data_quality: event.data_quality || 'UNKNOWN'
        };
        fs.appendFileSync(EMPTY_APPS_LOG, JSON.stringify(payload) + '\n');
    } catch (_) { 
        // Swallow logging errors to prevent blocking the response
    }
}

// =============================================
//  SISTEMA DE CALIDAD DE DATOS
// =============================================
function getDataQualityLevel(result) {
    const eqRaw = result?.equipment_applications ?? [];
    const enRaw = result?.engine_applications ?? [];
    
    const eqCount = Array.isArray(eqRaw) 
        ? eqRaw.length 
        : (typeof eqRaw === 'string' ? String(eqRaw).split(',').map(s => s.trim()).filter(Boolean).length : 0);
    
    const enCount = Array.isArray(enRaw) 
        ? enRaw.length 
        : (typeof enRaw === 'string' ? String(enRaw).split(',').map(s => s.trim()).filter(Boolean).length : 0);
    
    // Clasificación de calidad
    if (eqCount >= 6 && enCount >= 6) return 'EXCELLENT';
    if (eqCount >= 3 && enCount >= 3) return 'GOOD';
    if (eqCount >= 1 || enCount >= 1) return 'PARTIAL';
    return 'MINIMAL';
}

// =============================================
//  MODO RELAXED: Permite respuestas con data incompleta
//  Útil para filtros nuevos o especializados
// =============================================
function isRelaxedModeEnabled(req) {
    // Permitir modo relaxed si se solicita explícitamente
    const relaxedFlag = (
        req?.query?.stagehand === '1' || 
        req?.query?.relaxed === '1' || 
        process.env.STAGEHAND_MODE === 'relaxed'
    );
    
    return relaxedFlag;
}

// =============================================
//  GET /api/detect/:code
//  Detecta filtro por número de parte
// =============================================
router.get('/:code', async (req, res) => {
    try {
        const code = req.params.code?.trim();
        const force = (String(req.query.force || '').toLowerCase() === 'true') || (req.query.force === '1');
        const generateAll = (String(req.query.generate_all || '').toLowerCase() === 'true') || (req.query.generate_all === '1');
        const qlang = String(req.query.lang || '').toLowerCase();
        const lang = qlang === 'es' ? 'es' : 'en';

        // =============================================
        // VALIDACIÓN DE ENTRADA
        // =============================================
        if (!code || code.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_PART_NUMBER',
                details: 'Part number must be at least 3 characters',
                example: '/api/detect/P552100'
            });
        }
        
        if (!/^[A-Za-z0-9-]{3,64}$/.test(code)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_FORMAT',
                details: 'Only letters, numbers, and hyphen allowed (3-64 chars)',
                example: '/api/detect/P552100'
            });
        }

        console.log(`🔎 Detecting filter: ${code} (force=${force}, generate_all=${generateAll}, lang=${lang})`);

        // =============================================
        // DETECCIÓN DEL FILTRO
        // =============================================
        const result = await detectFilter(code, lang, { force, generateAll });

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'FILTER_NOT_FOUND',
                details: `No filter found for code: ${code}`,
                hint: 'Verify the part number is correct'
            });
        }

        // =============================================
        // VALIDACIÓN DE POLÍTICA SKU (REHABILITADA)
        // =============================================
        const policyConfig = getPolicyConfig();
        
        if (policyConfig.enforce_policy && result.sku) {
            try {
                enforceSkuPolicyInvariant(result.sku);
                console.log(`✅ SKU Policy validated: ${result.sku}`);
            } catch (policyError) {
                console.error(`❌ SKU Policy violation: ${policyError.message}`);
                return res.status(500).json({
                    success: false,
                    error: 'SKU_POLICY_VIOLATION',
                    details: policyError.message,
                    sku: result.sku
                });
            }
        }

        // =============================================
        // ANÁLISIS DE CALIDAD DE DATOS
        // =============================================
        const relaxed = isRelaxedModeEnabled(req);
        const dataQuality = getDataQualityLevel(result);
        
        const eqRaw = result?.equipment_applications ?? [];
        const eqCount = Array.isArray(eqRaw) 
            ? eqRaw.length 
            : (typeof eqRaw === 'string' ? String(eqRaw).split(',').map(s => s.trim()).filter(Boolean).length : 0);

        // =============================================
        // TELEMETRÍA: Log de eventos con data incompleta
        // =============================================
        if (eqCount === 0 || dataQuality === 'MINIMAL') {
            logEmptyAppsEvent({
                route: '/api/detect/:code',
                query: code,
                code,
                relaxed,
                duty: result?.duty,
                family: result?.family,
                source: result?.source,
                sku: result?.sku,
                lang,
                data_quality: dataQuality
            });
        }

        // =============================================
        // MANEJO DE RESPUESTAS CON DATA INCOMPLETA
        // =============================================
        if (eqCount === 0 && !relaxed) {
            // Respuesta con advertencia (NO bloquear)
            return res.status(200).json({
                success: true,
                warning: 'INCOMPLETE_DATA',
                details: 'Limited equipment applications available for this filter',
                data_quality: dataQuality,
                ...result,
                qa_flags: {
                    VOL_LOW: true,
                    EMPTY_EQUIPMENT_APPS: true,
                    DATA_QUALITY: dataQuality
                }
            });
        }

        // =============================================
        // QA FLAGS: Análisis de volumen de aplicaciones
        // =============================================
        const qa = { VOL_LOW: false, DATA_QUALITY: dataQuality };
        
        if (result.equipment_applications) {
            const eqApps = Array.isArray(result.equipment_applications)
                ? result.equipment_applications
                : String(result.equipment_applications).split(',').map(s => s.trim()).filter(Boolean);
            
            const uniqueEqApps = [...new Set(eqApps)];
            
            if (uniqueEqApps.length > 0 && uniqueEqApps.length < 6) {
                qa.VOL_LOW = true;
                console.log(`⚠️ VOL_LOW flag: only ${uniqueEqApps.length} unique equipment applications`);
            }
        }

        // =============================================
        // PREVIEW DE GOOGLE SHEETS (Opcional)
        // =============================================
        let sheetPreview = null;
        if (req.query.preview_sheet === '1') {
            try {
                sheetPreview = buildRowData(result);
                console.log(`📊 Sheet preview generated for ${code}`);
            } catch (previewError) {
                console.warn(`⚠️ Sheet preview failed: ${previewError.message}`);
            }
        }

        // =============================================
        // RESPUESTA EXITOSA
        // =============================================
        return res.json({
            success: true,
            data_quality: dataQuality,
            ...result,
            qa_flags: qa,
            ...(sheetPreview && { sheet_preview: sheetPreview })
        });

    } catch (error) {
        console.error('❌ Error in /api/detect/:code:', error);
        
        // Manejo específico de errores VOL_LOW
        if (error.message && error.message.includes('VOL_LOW')) {
            return res.status(400).json({
                success: false,
                error: 'VOL_LOW',
                details: error.message,
                hint: 'This filter has limited application data'
            });
        }
        
        return res.status(500).json({
            success: false,
            error: 'INTERNAL_SERVER_ERROR',
            details: error.message || 'Unknown error occurred',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// =============================================
//  POST /api/detect
//  Detección batch (múltiples códigos)
// =============================================
router.post('/', async (req, res) => {
    try {
        const { codes, lang = 'en', force = false, generate_all = false } = req.body;

        // Validación
        if (!Array.isArray(codes) || codes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_INPUT',
                details: 'Expected array of part numbers in "codes" field',
                example: { codes: ['P552100', 'FS19532'], lang: 'en' }
            });
        }

        if (codes.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'BATCH_TOO_LARGE',
                details: 'Maximum 50 codes per batch request'
            });
        }

        console.log(`🔎 Batch detection: ${codes.length} codes`);

        const results = [];
        const errors = [];

        for (const code of codes) {
            try {
                const result = await detectFilter(code.trim(), lang, { force, generateAll: generate_all });
                
                if (result) {
                    const dataQuality = getDataQualityLevel(result);
                    results.push({
                        code: code.trim(),
                        success: true,
                        data_quality: dataQuality,
                        ...result
                    });
                } else {
                    errors.push({
                        code: code.trim(),
                        success: false,
                        error: 'FILTER_NOT_FOUND'
                    });
                }
            } catch (err) {
                errors.push({
                    code: code.trim(),
                    success: false,
                    error: err.message || 'UNKNOWN_ERROR'
                });
            }
        }

        return res.json({
            success: true,
            total: codes.length,
            successful: results.length,
            failed: errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('❌ Error in POST /api/detect:', error);
        return res.status(500).json({
            success: false,
            error: 'INTERNAL_SERVER_ERROR',
            details: error.message
        });
    }
});

module.exports = router;
