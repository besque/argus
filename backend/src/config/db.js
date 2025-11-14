const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    await createIndexes();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const createIndexes = async () => {
  const db = mongoose.connection.db;
  
  await db.collection('events').createIndex({ user: 1, ts: -1 });
  await db.collection('events').createIndex({ type: 1, ts: -1 });
  
  await db.collection('alerts').createIndex({ severity: 1, created_at: -1 });
  await db.collection('alerts').createIndex({ user: 1, created_at: -1 });
  
  await db.collection('risk_history').createIndex({ user: 1, ts: -1 });
  
  await db.collection('baselines').createIndex({ user: 1 });
  
  console.log('Indexes created');
};

module.exports = connectDB;