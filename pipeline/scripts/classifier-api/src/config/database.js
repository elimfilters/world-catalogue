const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) {
      console.log('MongoDB already connected');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const isConnectedFunc = () => isConnected;

module.exports = connectDB;
module.exports.isConnected = isConnectedFunc;
