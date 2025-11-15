require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUserIds() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');
    
    const users = await User.find().limit(10).lean();
    console.log('Sample user IDs from database:');
    users.forEach(u => {
      console.log(`  ID: ${u._id}, Name: ${u.name || 'N/A'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserIds();

