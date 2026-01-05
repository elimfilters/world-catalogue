const express = require('express');
const mongoose = require('mongoose');
const app = express();
require('dotenv').config();
app.get('/', (req, res) => res.send('API ELIMFILTERS ACTIVA'));
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Conectado a MongoDB')).catch(err => console.error(err));
app.listen(3000, () => console.log('🚀 Servidor en puerto 3000'));
