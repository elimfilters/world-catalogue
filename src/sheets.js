let credentials;
try {
  const credString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}';
  
  // Detectar si es Base64 o JSON directo
  if (credString.trim().startsWith('{')) {
    // Es JSON directo
    credentials = JSON.parse(credString);
    console.log('✅ Credenciales cargadas como JSON directo');
  } else {
    // Es Base64
    credentials = JSON.parse(
      Buffer.from(credString, 'base64').toString('utf8')
    );
    console.log('✅ Credenciales cargadas desde Base64');
  }
} catch (error) {
  console.error('❌ Error parseando credenciales:', error.message);
  credentials = {};
}