const express = require('express');
const cors = require('cors');
const path = require('path');
const filterRoutes = require('./src/routes/filterRoutes');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Forzamos la ruta exacta: /api/filters
app.use('/api/filters', filterRoutes);

// Servir archivos estáticos si fuera necesario
app.use('/knowledge', express.static(path.join(__dirname, 'src/knowledge')));

app.listen(PORT, () => {
    console.log('🧠 Knowledge Base lista.');
    console.log('🚀 Servidor Elimfilters corriendo en puerto ' + PORT);
});