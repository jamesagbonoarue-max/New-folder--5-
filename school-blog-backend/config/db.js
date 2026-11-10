const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('MongoDB URI not provided. Running in demo mode without a database connection.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = { connectDB };
