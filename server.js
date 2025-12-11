// =============================================
//  ELIMFILTERS API SERVER - v5.0.0
//  Production-Ready Architecture
// =============================================

// Load environment variables (for local development)
try { require('dotenv').config(); } catch (_) {}

// Enforce inviolable SKU policy at startup (hash + invariants)
try {
    const { enforceStartupPolicy } = require('./src/config/policyGuard');
    enforceStartupPolicy();
    console.log(`✅ SKU policy guard active. Hash=${process.env.SKU_POLICY_HASH_COMPUTED}`);
} catch (e) {
    console.error(`❌ Startup policy guard failed: ${e.message}`);
    process.exit(1);
}

// =====================================================
//  VALIDACIÓN DE PREFIJOS OFICIALES ELIMFILTERS (INMUTABLES)
// =====================================================
// Si un prefijo es alterado, EL SERVIDOR NO ARRANCA.
try {
    const validatePrefixes = require('./src/config/validatePrefixes');
    validatePrefixes();
    console.log("✅ Prefijos oficiales ELIMFILTERS validados correctamente (inmutables).");
} catch (e) {
    console.error("❌ ERROR CRÍTICO: Violación de prefijos oficiales ELIMFILTERS.");
    console.error("   Detalle:", e.message);
    console.error("   EL SERVIDOR HA SIDO BLOQUEADO PARA PROTEGER LA INTEGRIDAD DEL CATÁLOGO.");
    process.exit(1);
}
// =====================================================


// Versioning info
const { version: pkgVersion } = require('./package.json');
const APP_VERSION = process.env.APP_VERSION || pkgVersion || 'unknown';
const GIT_SHA = process.env.GIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || null;

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
// LT Validator
const { validateAll } = require('./src/services/security/validateLtRules');
// LT Health helpers
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Route imports
const detectRoute = require('./src/api/detect');
const vinRoute = require('./src/api/vin');
const marinosImportRoute = require('./src/api/marinosImport');
const routesMapRoute = require('./src/api/routes');
const catalogRoute = require('./src/api/catalog');
const internalValidateRoute = require('./src/api/internalValidate');

// Service imports
const { pingSheets } = require('./src/services/syncSheetsService');
const { readPolicyText, policyHash } = require('./src/services/skuCreationPolicy');

let mongoService;
try {
    mongoService = require('./src/services/mongoService');
} catch (_) {
    mongoService = {
        connect: async () => null,
        disconnect: async () => null
    };
}

// =============================================
//  APP CONFIGURATION
// =============================================
const app = express();

// Middleware
app.set('trust proxy', 1);

// Restrict CORS
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.disable('x-powered-by');

// Assign Request ID
app.use((req, res, next) => {
    const rid = req.headers['x-request-id'] || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    res.setHeader('x-request-id', rid);
    res.locals.requestId = rid;
    console.log(`➡️  ${new Date().toISOString()} [${rid}] - ${req.method} ${req.originalUrl}`);
    next();
});

// =============================================
//  API ROUTES
// =============================================
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

const detectLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many detect requests, slow down.' }
});
app.use('/api/detect', detectLimiter);

app.use('/api/detect', detectRoute);
app.use('/api/import/marinos', marinosImportRoute);
app.use('/api/routes', routesMapRoute);
app.use('/api/catalog', catalogRoute);
app.use('/api/vin', vinRoute);
app.use('/api/internal/validate', internalValidateRoute);

// SKU Policy endpoint
app.get('/policy/sku', (req, res) => {
    try {
        const text = readPolicyText();
        const hash = policyHash();
        res.status(200).json({
            version: '1.0.0',
            hash,
            language: 'es',
            name: 'Política Oficial de Creación de SKU ELIMFILTERS',
            content_md: text
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Sheets health
app.get('/health/sheets', async (req, res) => {
    try {
        const result = await pingSheets();
        if (result.ok) {
            res.status(200).json({ status: 'OK', sheet_title: result.title, sheets: result.sheetsCount });
        } else {
            res.status(500).json({ status: 'ERROR', error: result.error });
        }
    } catch (e) {
        res.status(500).json({ status: 'ERROR', error: e.message });
    }
});

// Mongo health
app.get('/health/mongo', async (req, res) => {
    try {
        if (!process.env.MONGODB_URI) {
            return res.status(200).json({ status: 'DISABLED', reason: 'MONGODB_URI not set' });
        }
        await mongoService.connect();
        res.status(200).json({ status: 'OK' });
    } catch (e) {
        res.status(500).json({ status: 'ERROR', error: e.message });
    } finally {
        try { await mongoService.disconnect(); } catch (_) {}
    }
});

// =============================================
//  ROOT ENDPOINT
// =============================================
app.get('/', (req, res) => {
    res.json({
        status: "online",
        version: APP_VERSION,
        git_sha: GIT_SHA,
        service: "ELIMFILTERS API",
        endpoints: {
            filter_detection: "/api/detect/:code",
            search: "/api/detect/search?q=",
            vin_decode: "/api/vin/:vin",
            routes_map: "/api/routes"
        },
        documentation: "https://docs.elimfilters.com"
    });
});

// =============================================
//  HEALTH CHECK
// =============================================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        version: APP_VERSION,
        git_sha: GIT_SHA,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// =============================================
//  OTHER HEALTH
// =============================================
app.get('/health/overall', async (req, res) => {
    const version = APP_VERSION;
    const env = process.env.NODE_ENV || 'development';
    const start = Date.now();
    let sheets = { ok: false };
    let mongo = { status: 'DISABLED' };
    let lt = { status: 'UNKNOWN' };
    try {
        sheets = await pingSheets();
    } catch (e) {
        sheets = { ok: false, error: e.message };
    }
    if (process.env.MONGODB_URI) {
        try {
            await mongoService.connect();
            mongo = { status: 'OK' };
        } catch (e) {
            mongo = { status: 'ERROR', error: e.message };
        } finally {
            try { await mongoService.disconnect(); } catch (_) {}
        }
    }
    try {
        const rulesPath = path.join(__dirname, 'src', 'config', 'LT_RULES_MASTER.json');
        const raw = fs.readFileSync(rulesPath, 'utf8');
        const rulesHash = crypto.createHash('sha256').update(raw).digest('hex');
        const rulesHashShort = rulesHash.slice(0, 8);
        const mtimeIso = new Date(fs.statSync(rulesPath).mtime).toISOString();
        const rules = JSON.parse(raw);
        const securityCfg = rules?.rules?.security || {};
        const securityOk = securityCfg.block_on_rule_violation === true;
        lt = {
            status: securityOk ? 'OK' : 'ERROR',
            rules_hash_short: rulesHashShort,
            rules_loaded_at: mtimeIso
        };
    } catch (e) {
        lt = { status: 'ERROR', error: e.message };
    }
    const elapsedMs = Date.now() - start;

    const allOk = sheets.ok && (mongo.status === 'OK' || mongo.status === 'DISABLED') && lt.status === 'OK';
    const statusCode = allOk ? 200 : 500;
    res.status(statusCode).json({
        status: allOk ? 'OK' : 'ERROR',
        version,
        git_sha: GIT_SHA,
        environment: env,
        uptime: process.uptime(),
        response_time_ms: elapsedMs,
        sheets,
        mongo,
        lt
    });
});

// =============================================
//  LT SELF-TEST
// =============================================
app.get('/validate/self-test', (req, res) => {
    try {
        const payload = {
            duty: 'HD',
            source: 'Fleetguard',
            columns: ['Contenido del Kit', 'Filtro Principal (Ref)', 'Tecnología'],
            sku: 'EK5-0123',
            technology: 'ELIMTEK™ Standard',
            vin: '1FDWF7DE7JDF12345',
            kits: { type: 'EK5' },
        };
        const ok = validateAll(payload);
        res.status(200).json({ status: 'OK', ok });
    } catch (e) {
        res.status(500).json({ status: 'ERROR', error: e.message });
    }
});

// =============================================
//  LT HEALTH DETAIL
// =============================================
app.get('/health/lt', (req, res) => {
    try {
        const rulesPath = path.join(__dirname, 'src', 'config', 'LT_RULES_MASTER.json');
        const raw = fs.readFileSync(rulesPath, 'utf8');
        const rulesHash = crypto.createHash('sha256').update(raw).digest('hex');
        const rulesHashShort = rulesHash.slice(0, 8);
        const rulesStat = fs.statSync(rulesPath);
        const rulesLoadedAt = new Date(rulesStat.mtime).toISOString();
        const rules = JSON.parse(raw);

        const securityCfg = rules?.rules?.security || {};
        const securityOk = securityCfg.block_on_rule_violation === true;

        const scraping = rules?.rules?.scraping || {};
        const scraping_sources = Object.entries(scraping).map(([name, cfg]) => ({
            name,
            allowed_for: cfg.allowed_for,
            columns_allowed: cfg.columns_allowed
        }));

        const vin_regex = rules?.rules?.vin_engine?.validation_regex || null;
        const tech_allowed = rules?.rules?.technology_assignment?.allowed_values || [];

        const statusCode = securityOk ? 200 : 500;
        res.status(statusCode).json({
            status: securityOk ? 'OK' : 'ERROR',
            version: APP_VERSION,
            git_sha: GIT_SHA,
            rules_hash: rulesHash,
            rules_hash_short: rulesHashShort,
            rules_loaded_at: rulesLoadedAt,
            scraping_sources,
            vin_regex,
            tech_allowed_count: tech_allowed.length,
            security: securityCfg
        });
    } catch (e) {
        res.status(500).json({ status: 'ERROR', error: e.message });
    }
});

// =============================================
//  ERROR HANDLING
// =============================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// =============================================
//  START SERVER
// =============================================
const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
    console.log(`
────────────────────────────────────────────────────────
🚀 ELIMFILTERS API v${APP_VERSION}               
📡 Running on port ${PORT}                  
🌎 Environment: ${process.env.NODE_ENV || 'development'}         
────────────────────────────────────────────────────────
    `);
});

server.setTimeout(30_000);
server.headersTimeout = 35_000;

// =============================================
//  AUTO SELF-TEST
// =============================================
try {
    const autoTest = String(process.env.AUTO_SELF_TEST_ON_START || '').toLowerCase() === 'true';
    const hasWebhook = Boolean(process.env.DAILY_REPORT_WEBHOOK_URL);
    if (autoTest && hasWebhook) {
        const { main: runDailyReport } = require('./scripts/daily_learning_report');
        const delayMs = Number(process.env.SELF_TEST_START_DELAY_MS || 3000);
        console.log(`⏱️ Auto-prueba del webhook programada en ${delayMs} ms...`);
        setTimeout(() => {
            try {
                if (!process.env.REPORT_HOURS) process.env.REPORT_HOURS = '24';
                runDailyReport()
                    .then(() => {
                        console.log('✅ Auto-prueba ejecutada.');
                    })
                    .catch((e) => {
                        console.log('⚠️ Auto-prueba falló:', e.message);
                    });
            } catch (e) {
                console.log('⚠️ No se pudo iniciar la auto-prueba:', e.message);
            }
        }, delayMs).unref();
    } else {
        if (autoTest && !hasWebhook) {
            console.log('ℹ️ AUTO_SELF_TEST_ON_START habilitado, pero DAILY_REPORT_WEBHOOK_URL no está definido.');
        }
    }
} catch (_) {}

module.exports = app;

// =============================================
//  GRACEFUL SHUTDOWN
// =============================================
function shutdown(signal) {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    server.close(() => {
        console.log('Servidor cerrado correctamente.');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Cierre forzado por timeout.');
        process.exit(1);
    }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});