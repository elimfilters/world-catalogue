require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const filterRoutes = require('./src/routes/filterRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de salud inmediata (No depende de la DB)
app.get('/health', (req, res) => res.status(200).send('🛰️ Orquestador Elimfilters en línea'));

app.use('/api', filterRoutes);

// Conectar a la base de datos de forma asíncrona
connectDB().then(() => {
    console.log('✅ Conexión a MongoDB establecida');
}).catch(err => {
    console.error('❌ Error de conexión DB pero el servidor sigue vivo:', err.message);
});

const PORT = process.env.PORT || 8080;
// Escuchar en 0.0.0.0 es OBLIGATORIO para Railway
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor corriendo en puerto ' + PORT);
});