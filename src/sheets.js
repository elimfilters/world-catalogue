require('dotenv').config();
const { google } = require('googleapis');

// Configurar autenticacion usando variable de entorno con Base64
let credentials;
try {
  const credString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}';
  
  // Intentar decodificar desde Base64 primero
  try {
    credentials = JSON.parse(
      Buffer.from(credString, 'base64').toString('utf8')
    );
    console.log('✅ Credenciales cargadas desde Base64');
  } catch (e) {
    // Si falla, intentar como JSON directo (fallback)
    credentials = JSON.parse(credString);
    console.log('✅ Credenciales cargadas como JSON directo');
  }
} catch (error) {
  console.error('❌ Error parseando credenciales:', error.message);
  credentials = {};
}

const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ... resto del código igual
