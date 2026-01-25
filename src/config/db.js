const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log('🚀 MongoDB Conectado: ' + conn.connection.host);
    } catch (err) {
        console.error('❌ Error de conexión:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
