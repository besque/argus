require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Alert = require('./models/Alert');
const Event = require('./models/Event');

async function checkZeroRiskUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const zeroRiskUsers = await User.find({ current_risk: 0 }).lean();
    console.log(`=== USERS WITH 0 RISK SCORE ===\n`);
    console.log(`Total: ${zeroRiskUsers.length} users\n`);

    for (const user of zeroRiskUsers.slice(0, 10)) {
      const alertCount = await Alert.countDocuments({ user: user._id });
      const totalEvents = await Event.countDocuments({ user: user._id });
      
      // Check events with risk scores
      const eventsWithRisk = await Event.countDocuments({ 
        user: user._id,
        risk_score: { $gt: 0 }
      });
      
      // Check events without risk scores (not processed)
      const eventsWithoutRisk = await Event.countDocuments({
        user: user._id,
        $or: [
          { risk_score: { $exists: false } },
          { risk_score: 0 }
        ]
      });
      
      console.log(`${user.name || user._id}:`);
      console.log(`  Alerts: ${alertCount}`);
      console.log(`  Total Events: ${totalEvents}`);
      console.log(`  Events with risk_score > 0: ${eventsWithRisk}`);
      console.log(`  Events without risk_score: ${eventsWithoutRisk}`);
      console.log(`  Last Seen: ${user.last_seen || 'Never'}`);
      console.log('');
    }
    
    // Summary
    let totalEvents = 0;
    let totalAlerts = 0;
    let unprocessedEvents = 0;
    
    for (const user of zeroRiskUsers) {
      const alerts = await Alert.countDocuments({ user: user._id });
      const events = await Event.countDocuments({ user: user._id });
      const unprocessed = await Event.countDocuments({
        user: user._id,
        $or: [
          { risk_score: { $exists: false } },
          { risk_score: 0 }
        ]
      });
      
      totalAlerts += alerts;
      totalEvents += events;
      unprocessedEvents += unprocessed;
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Users with 0 risk: ${zeroRiskUsers.length}`);
    console.log(`Total alerts: ${totalAlerts}`);
    console.log(`Total events: ${totalEvents}`);
    console.log(`Unprocessed events: ${unprocessedEvents}`);
    
    if (unprocessedEvents > 0) {
      console.log(`\n⚠️  ${unprocessedEvents} events haven't been processed through ML yet!`);
      console.log(`   Run: node src/process_all_events_ml.js`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkZeroRiskUsers();

