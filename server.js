// =============================================
//  ELIMFILTERS API SERVER - v5.0.0
//  Production-Ready Architecture
// =============================================

// Load environment variables (for local development)
try { require('dotenv').config(); } catch (_) {}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Route imports
const detectRoute = require('./src/api/detect');
const vinRoute = require('./src/api/vin');

const internalValidateRoute = require('./src/api/internalValidate');

// Service imports
// Sheets health and sync utilities
const { pingSheets } = require('./src/services/syncSheetsService');
// Mongo service (optional; routes guard when MONGODB_URI is unset)
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

// Restrict CORS by ALLOWED_ORIGINS (comma-separated). If absent, allow all.
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

// Request logging
app.disable('x-powered-by');

// Assign/propagate request ID
app.use((req, res, next) => {
    const rid = req.headers['x-request-id'] || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    res.setHeader('x-request-id', rid);
    res.locals.requestId = rid;
    console.log(`âž¡ï¸  ${new Date().toISOString()} [${rid}] - ${req.method} ${req.originalUrl}`);
    next();
});

// =============================================
//  API ROUTES
// =============================================
// Rate limiting for API routes
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// Stricter limit for detection endpoint
const detectLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many detect requests, slow down.' }
});
app.use('/api/detect', detectLimiter);

app.use('/api/detect', detectRoute);

app.use('/api/internal/validate', internalValidateRoute);

// Sheets health endpoint
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

// Mongo health endpoint
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
        version: "5.0.0",
        service: "ELIMFILTERS API",
        endpoints: {
            filter_detection: "/api/detect/:code",
            search: "/api/detect/search?q=",
            vin_decode: "/api/vin/:code"
        },
        documentation: "https://docs.elimfilters.com"
    });
});

// =============================================
//  HEALTH CHECK - Required by Railway
// =============================================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        version: '5.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Aggregated health endpoint
app.get('/health/overall', async (req, res) => {
    const version = '5.0.0';
    const env = process.env.NODE_ENV || 'development';
    const start = Date.now();
    let sheets = { ok: false };
    let mongo = { status: 'DISABLED' };
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
    const elapsedMs = Date.now() - start;

    const allOk = sheets.ok && (mongo.status === 'OK' || mongo.status === 'DISABLED');
    const statusCode = allOk ? 200 : 500;
    res.status(statusCode).json({
        status: allOk ? 'OK' : 'ERROR',
        version,
        environment: env,
        uptime: process.uptime(),
        response_time_ms: elapsedMs,
        sheets,
        mongo
    });
});

// =============================================
//  ERROR HANDLING
// =============================================
app.use((err, req, res, next) => {
    console.error('âŒ Error:', err);
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
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘   ðŸš€ ELIMFILTERS API v5.0.0               â•‘
â•‘   ðŸ“¡ Running on port ${PORT}                  â•‘
â•‘   ðŸŒ Environment: ${process.env.NODE_ENV || 'development'}         â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    `);
});

// Tighten server timeouts
server.setTimeout(30_000); // inactive socket timeout
server.headersTimeout = 35_000; // header timeout

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
    // Forzar cierre si tarda demasiado
    setTimeout(() => {
        console.error('Cierre forzado por timeout.');
        process.exit(1);
    }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Trap unhandled errors for graceful shutdown
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

