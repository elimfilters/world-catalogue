require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const filterRoutes = require('./routes/filterRoutes');

const app = express();

// Conectar a la base de datos
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// --- VINCULACIÓN DE RUTAS ---
app.use('/api', filterRoutes);

// Ruta de prueba de salud
app.get('/health', (req, res) => res.send('🛰️ Orquestador Elimfilters en línea'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🛰️ Servidor Elimfilters corriendo en puerto ' + PORT);
});
