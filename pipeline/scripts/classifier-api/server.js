require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MongoClient } = require('mongodb');
const { detectManufacturerWithGroq } = require('./universal-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

let db;
let classificationsCollection;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

async function connectMongo() {
    try {
        await mongoClient.connect();
        db = mongoClient.db('elimfilters');
        classificationsCollection = db.collection('classifications');
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Error:', error);
        process.exit(1);
    }
}

app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        mongodb: db ? 'connected' : 'disconnected',
        groq: process.env.GROQ_API_KEY ? 'configured' : 'missing'
    });
});

app.post('/api/classify-filter', async (req, res) => {
    try {
        const { filterCode } = req.body;

        if (!filterCode || typeof filterCode !== 'string') {
            return res.status(400).json({
                error: 'filterCode is required'
            });
        }

        const cleanCode = filterCode.trim();
        console.log('Classifying:', cleanCode);

        const cached = await classificationsCollection.findOne({
            filterCode: cleanCode.toUpperCase()
        });

        if (cached) {
            console.log('Cache HIT:', cleanCode);
            return res.json({ ...cached.result, cached: true });
        }

        const result = await detectManufacturerWithGroq(cleanCode);

        if (!result) {
            return res.status(500).json({ error: 'Classification failed' });
        }

        await classificationsCollection.updateOne(
            { filterCode: cleanCode.toUpperCase() },
            {
                $set: {
                    filterCode: cleanCode.toUpperCase(),
                    result: result,
                    timestamp: new Date()
                }
            },
            { upsert: true }
        );

        console.log('Classified:', cleanCode);
        res.json({ ...result, cached: false });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

connectMongo().then(() => {
    app.listen(PORT, () => {
        console.log('API running on port', PORT);
    });
});
