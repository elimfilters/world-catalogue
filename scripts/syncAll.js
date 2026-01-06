const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

// Extraemos la credencial de la variable de entorno
const creds = JSON.parse(process.env.GOOGLE_CREDS_JSON);

const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function syncAll() {
    try {
        console.log('??? Iniciando sincronización segura...');
        const doc = new GoogleSpreadsheet('1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U', serviceAccountAuth);
        await doc.loadInfo();
        console.log('? Conexión segura establecida con:', doc.title);
        
        // Aquí sigue el resto de tu lógica de sincronización...
        // El sistema ya no depende de archivos físicos.
    } catch (error) {
        console.error('? Error de seguridad:', error.message);
    }
}

syncAll();
