// repo/src/services/detectionServiceFinal.js

// Ajusta estos imports a tu estructura real
const db = require("../db");       // ejemplo
const logger = require("../logger");    // ejemplo

// Política por defecto (ajusta según tu config real)
const defaultPolicy = {
    enforceInviolable: true,
    allowOemFallbackByPrefix: true,
    allowLdFramCanonization: true,
    allowHdAfRsDonaldsonResolution: true,
    auditMasterOnUpsert: false,
};

/**
 * Normaliza el código de entrada (trim, mayúsculas, etc.)
 */
function normalizeCode(raw) {
    if (!raw) return null;
    let code = String(raw).trim().toUpperCase();
    // CRÍTICO: Asegura la cadena canónica eliminando separadores para homologación.
    code = code.replace(/[-\s\./]/g, ''); 
    return code;
}


/**
 * Resuelve info básica del filtro a partir del código normalizado.
 * Aquí debes conectar con tu catálogo real (Mongo, SQL, etc.).
 */
async function resolveBaseData(normCode) {
    // EJEMPLO: ajusta a tu acceso real a datos
    const row = await db.filters.findOne({ any_code: normCode });

    if (!row) {
        return {
            found: false,
            family: null,
            duty: null,
            last4: null,
            row: null,
        };
    }

    const family = row.family || row.segment || null;
    const duty = row.duty_type || row.duty || null;
    // Asumimos que 'sku' ya contiene el prefijo + last4 (Ej: EL81234)
    const last4 = row.last4 || (row.sku && row.sku.slice(-4)) || null; 

    return {
        found: true,
        family,
        duty,
        last4,
        row,
    };
}


/**
 * Genera un SKU ELIM a partir de family/duty/last4.
 * Ajusta la lógica a tu convención real (Ej: ET91122).
 */
function generateSku({ family, duty, last4 }) {
    if (!family || !duty || !last4) return null;
    // Esto debería contener la lógica de prefixMap real. Usamos el ejemplo de la estructura:
    return `E-${family}-${duty}-${last4}`;
}


/**
 * Servicio principal de detección usado por /api/detect/:code
 */
async function detectFilter(code, policyOverride = {}) {
    const policy = {
        ...defaultPolicy,
        ...policyOverride,
    };

    const rawCode = code;
    const norm = normalizeCode(rawCode);

    if (!norm) {
        return {
            success: false,
            query: rawCode,
            error: "Invalid code",
            details: "Empty or invalid filter code.",
            policy,
        };
    }

    // Resolver datos base
    const base = await resolveBaseData(norm);

    if (!base.found) {
        return {
            success: false,
            query: norm,
            error: "Not found",
            details: "Code not found in catalog.",
            policy,
        };
    }

    const { family, duty, last4, row } = base;

    // --- LÓGICA DE DETECCIÓN DE DATOS INCOMPLETOS / MODO RELAJADO ---
    
    // Log de política (se dispara antes de la verificación estricta)
    console.warn("[DETECT][POLICY] Campos incompletos para SKU", {
        code,
        norm,
        family,
        duty,
        last4,
        policy,
    });

    if (!family || !duty || !last4) {
        return {
            success: true,
            query: norm,
            error: null,
            details: "Partial resolution: missing family/duty/last4 (policy relaxed).",
            policy: {
                ...policy,
                enforceInviolable: false, // Relaja la política
            },
            resolution_level: "partial",
            sku: null,
            norm,
            duty_type: duty || null,
            family: family || null,
            meta: {
                family,
                duty,
                last4,
                row,
            },
        };
    }

    // Si hay datos completos, generamos SKU normalmente
    const sku = generateSku({ family, duty, last4 });

    return {
        success: true,
        query: norm,
        error: null,
        details: null,
        policy,
        resolution_level: "full",
        sku,
        norm,
        duty_type: duty,
        family,
        meta: {
            last4,
            row,
        },
    };
}


/**
 * Handler Express (o similar) para /api/detect/:code
 */
async function detectHandler(req, res) {
    try {
        const code = req.params.code;
        const result = await detectFilter(code);

        // Siempre 200; el cliente mira result.success / error
        return res.status(200).json(result);
    } catch (err) {
        logger && logger.error && logger.error("detectHandler error", err);

        return res.status(500).json({
            success: false,
            error: "Internal error",
            details: "Unexpected error in detect service.",
        });
    }
}

module.exports = {
    detectFilter,
    detectHandler,
};
