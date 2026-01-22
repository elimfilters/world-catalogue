const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

// VALIDACIÓN DE SEGURIDAD: ¿Están todos los cables conectados?
const checkVariables = () => {
    const vars = ['MONGO_URL', 'SCRAPE_KEY', 'GOOGLE_SHEET_ID'];
    vars.forEach(v => {
        if (!process.env[v]) console.log('⚠️ ADVERTENCIA: Falta la variable ' + v);
    });
};
checkVariables();

// CONEXIÓN A MONGODB (Solo si existe la URL)
if (process.env.MONGO_URL) {
    mongoose.connect(process.env.MONGO_URL)
        .then(() => console.log('✅ Base de Datos: CONECTADA CORRECTAMENTE'))
        .catch(err => console.log('❌ Error de Acceso a Mongo: ' + err.message));
}

app.get('/', (req, res) => res.send('🚀 Motor ELIMFILTERS v5.10 Activo'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀 Servidor ELIMFILTERS Corriendo en puerto ' + PORT));