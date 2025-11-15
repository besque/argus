require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Alert = require('./models/Alert');

async function checkRiskDistribution() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find().sort({ current_risk: -1 }).lean();
    
    console.log('=== RISK SCORE DISTRIBUTION ===\n');
    
    let high = 0, medium = 0, low = 0;
    const highUsers = [];
    const mediumUsers = [];
    
    users.forEach(u => {
      const risk = (u.current_risk || 0) * 100;
      if (risk >= 70) {
        high++;
        highUsers.push({ name: u.name || u._id, risk: risk.toFixed(1) });
      } else if (risk >= 40) {
        medium++;
        mediumUsers.push({ name: u.name || u._id, risk: risk.toFixed(1) });
      } else {
        low++;
      }
    });
    
    console.log(`HIGH Risk (>=70%): ${high} users`);
    if (highUsers.length > 0) {
      highUsers.slice(0, 10).forEach(u => {
        console.log(`   ${u.name}: ${u.risk}%`);
      });
    }
    
    console.log(`\nMEDIUM Risk (40-69%): ${medium} users`);
    if (mediumUsers.length > 0) {
      mediumUsers.slice(0, 10).forEach(u => {
        console.log(`   ${u.name}: ${u.risk}%`);
      });
    }
    
    console.log(`\nLOW Risk (<40%): ${low} users`);
    
    console.log('\n=== TOP 10 RISKY USERS ===');
    users.slice(0, 10).forEach((u, i) => {
      const risk = (u.current_risk || 0) * 100;
      const status = risk >= 70 ? 'HIGH' : risk >= 40 ? 'MEDIUM' : 'LOW';
      console.log(`${(i+1).toString().padStart(2)}. ${(u.name || u._id).padEnd(25)} ${risk.toFixed(1)}% (${status})`);
    });
    
    // Check alert distribution
    console.log('\n=== ALERT ANALYSIS ===');
    const top5UserIds = users.slice(0, 5).map(u => u._id);
    
    for (const userId of top5UserIds) {
      const user = users.find(u => u._id === userId);
      const alertCount = await Alert.countDocuments({ user: userId });
      const highAlerts = await Alert.countDocuments({ user: userId, severity: 'high' });
      const alerts = await Alert.find({ user: userId })
        .sort({ risk_score: -1 })
        .limit(5)
        .lean();
      
      const avgRisk = alerts.length > 0 
        ? alerts.reduce((sum, a) => sum + a.risk_score, 0) / alerts.length 
        : 0;
      const maxRisk = alerts.length > 0 
        ? Math.max(...alerts.map(a => a.risk_score)) 
        : 0;
      
      console.log(`\n${user.name || userId}:`);
      console.log(`   Current Risk: ${((user.current_risk || 0) * 100).toFixed(1)}%`);
      console.log(`   Total Alerts: ${alertCount}`);
      console.log(`   High Severity Alerts: ${highAlerts}`);
      console.log(`   Average Alert Risk: ${(avgRisk * 100).toFixed(1)}%`);
      console.log(`   Max Alert Risk: ${(maxRisk * 100).toFixed(1)}%`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRiskDistribution();

