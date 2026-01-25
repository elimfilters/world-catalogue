const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ ERROR: MONGODB_URI no está definida en el entorno.');
    console.log('Variables detectadas:', Object.keys(process.env).filter(k => k.includes('MONGO')));
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('🍃 Conexión exitosa a MongoDB Atlas');
  } catch (err) {
    console.error('❌ Error de conexión DB:', err.message);
  }
};

module.exports = connectDB;