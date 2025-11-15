require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');
const Alert = require('./models/Alert');
const RiskHistory = require('./models/RiskHistory');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalAlerts = await Alert.countDocuments();
    
    console.log('=== DATABASE STATISTICS ===\n');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Events: ${totalEvents}`);
    console.log(`Total Alerts: ${totalAlerts}\n`);

    // Active users (last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ last_seen: { $gte: last24h } });
    console.log(`Active Users (last 24h): ${activeUsers}`);

    // Anomalies (last 24h)
    const anomalies24h = await Alert.countDocuments({ created_at: { $gte: last24h } });
    console.log(`Anomalies (last 24h): ${anomalies24h}`);

    // Risk breakdown
    const users = await User.find().select('_id name current_risk last_seen').lean();
    let high = 0, medium = 0, low = 0;
    users.forEach(u => {
      const pct = (u.current_risk || 0) * 100;
      if (pct >= 70) high++;
      else if (pct >= 40) medium++;
      else low++;
    });
    
    console.log('\n=== RISK BREAKDOWN ===');
    console.log(`High Risk (≥70): ${high}`);
    console.log(`Medium Risk (40-69): ${medium}`);
    console.log(`Low Risk (<40): ${low}\n`);

    // Top 5 risky users
    const top5Users = await User.find()
      .sort({ current_risk: -1 })
      .limit(5)
      .select('_id name current_risk role last_seen')
      .lean();
    
    console.log('=== TOP 5 RISKY USERS ===');
    top5Users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (${u._id})`);
      console.log(`   Risk: ${Math.round((u.current_risk || 0) * 100)}%`);
      console.log(`   Role: ${u.role || 'N/A'}`);
      console.log(`   Last Seen: ${u.last_seen || 'Never'}\n`);
    });

    // Event types breakdown
    const eventTypes = await Event.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('=== EVENT TYPES ===');
    eventTypes.forEach(et => {
      console.log(`${et._id}: ${et.count}`);
    });
    console.log('');

    // Alerts by severity
    const alertSeverity = await Alert.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('=== ALERTS BY SEVERITY ===');
    alertSeverity.forEach(as => {
      console.log(`${as._id}: ${as.count}`);
    });
    console.log('');

    // Sample alerts
    const sampleAlerts = await Alert.find()
      .sort({ created_at: -1 })
      .limit(5)
      .lean();
    
    console.log('=== SAMPLE ALERTS ===');
    sampleAlerts.forEach((alert, i) => {
      console.log(`${i + 1}. User: ${alert.user}`);
      console.log(`   Type: ${alert.anomaly_type || 'unknown'}`);
      console.log(`   Severity: ${alert.severity}`);
      console.log(`   Risk Score: ${alert.risk_score}`);
      console.log(`   Created: ${alert.created_at}\n`);
    });

    // Events with risk scores
    const eventsWithRisk = await Event.countDocuments({ risk_score: { $gt: 0 } });
    const eventsWithoutRisk = await Event.countDocuments({ 
      $or: [
        { risk_score: { $exists: false } },
        { risk_score: 0 }
      ]
    });
    
    console.log('=== EVENT PROCESSING STATUS ===');
    console.log(`Events with risk scores: ${eventsWithRisk}`);
    console.log(`Events without risk scores: ${eventsWithoutRisk}`);
    console.log(`Percentage processed: ${totalEvents > 0 ? Math.round((eventsWithRisk / totalEvents) * 100) : 0}%\n`);

    // Overall risk score
    const userAgg = await User.aggregate([
      { $group: { _id: null, avgRisk: { $avg: '$current_risk' }, count: { $sum: 1 } } }
    ]);
    const overallRisk = Math.round(((userAgg[0]?.avgRisk) || 0) * 100);
    console.log(`Overall Risk Score: ${overallRisk}%\n`);

    // JSON export for frontend
    const dashboardData = {
      kpis: {
        overallRiskScore: overallRisk,
        activeUsers: activeUsers,
        suspiciousUsers: await User.countDocuments({ current_risk: { $gte: 0.7 } }),
        totalEventsProcessed: totalEvents,
        totalAnomalies: anomalies24h
      },
      riskBreakdown: {
        high: totalUsers > 0 ? Math.round((high / totalUsers) * 100) : 0,
        medium: totalUsers > 0 ? Math.round((medium / totalUsers) * 100) : 0,
        low: totalUsers > 0 ? Math.round((low / totalUsers) * 100) : 0
      },
      topRiskyUsers: top5Users.map(u => ({
        id: u._id,
        name: u.name,
        riskScore: Math.round((u.current_risk || 0) * 100),
        role: u.role || 'Employee'
      })),
      anomalies: await Alert.aggregate([
        { $group: { _id: '$anomaly_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).then(results => {
        const total = results.reduce((sum, r) => sum + r.count, 0) || 1;
        return results.map(r => ({
          type: r._id || 'unknown',
          count: r.count,
          percentage: Math.round((r.count / total) * 100)
        }));
      })
    };

    console.log('=== JSON DATA FOR FRONTEND ===');
    console.log(JSON.stringify(dashboardData, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();

