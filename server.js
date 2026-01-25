require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/db');
const filterRoutes = require('./src/routes/filterRoutes');

const app = express();

// Conectar a la base de datos
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Vincular Rutas
app.use('/api', filterRoutes);

app.get('/health', (req, res) => res.send('🛰️ Orquestador Elimfilters en línea'));

// Railway inyecta automáticamente la variable PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor corriendo en puerto ' + PORT);
});