const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());

const uri = process.env.MONGO_URI;

if (!uri) {
    console.error('❌ ERROR: La variable MONGO_URI no está definida en el .env');
    process.exit(1);
}

mongoose.connect(uri).then(() => {
    console.log('✅ Base de Datos Conectada con éxito');
    app.listen(3000, () => console.log('🚀 MÁQUINA DE GUERRA EN PUERTO 3000'));
}).catch(e => console.error('❌ Error conexión DB:', e.message));

const filterController = require('./controllers/filterController');
app.post('/api/search', filterController.handleSearch);