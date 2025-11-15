require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function showUserRisks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find().sort({ current_risk: -1 }).lean();
    
    console.log('=== USER RISK SCORES ===\n');
    console.log(`Total Users: ${users.length}\n`);
    
    users.forEach((u, i) => {
      const risk = (u.current_risk || 0) * 100;
      const status = risk >= 70 ? 'HIGH' : risk >= 40 ? 'MEDIUM' : 'LOW';
      console.log(`${(i+1).toString().padStart(2)}. ${(u.name || u._id).padEnd(30)} ${risk.toFixed(1)}% (${status})`);
    });
    
    const high = users.filter(u => (u.current_risk || 0) * 100 >= 70).length;
    const medium = users.filter(u => {
      const r = (u.current_risk || 0) * 100;
      return r >= 40 && r < 70;
    }).length;
    const low = users.filter(u => (u.current_risk || 0) * 100 < 40).length;
    
    console.log(`\n=== DISTRIBUTION ===`);
    console.log(`HIGH (>=70%): ${high} users`);
    console.log(`MEDIUM (40-69%): ${medium} users`);
    console.log(`LOW (<40%): ${low} users`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

showUserRisks();

