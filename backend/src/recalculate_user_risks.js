require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Alert = require('./models/Alert');
const Event = require('./models/Event');

async function recalculateUserRisks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');
    
    const users = await User.find().lean();
    console.log(`Recalculating risk scores for ${users.length} users...\n`);
    
    let updated = 0;
    
    for (const user of users) {
      // Get recent alerts (last 50 alerts, regardless of date)
      const recentAlerts = await Alert.find({
        user: user._id
      })
        .sort({ created_at: -1 })
        .limit(50)
        .lean();
      
      let calculatedRisk = 0;
      
      if (recentAlerts.length > 0) {
        // Calculate key metrics FIRST
        const maxRisk = Math.max(...recentAlerts.map(a => a.risk_score));
        const avgRisk = recentAlerts.reduce((sum, a) => sum + a.risk_score, 0) / recentAlerts.length;
        
        // Get weighted average
        let weightedSum = 0;
        let totalWeight = 0;
        recentAlerts.forEach((alert, index) => {
          const recencyWeight = 1 / (index + 1);
          const riskWeight = alert.risk_score >= 0.7 ? 1.5 : 1.0;
          const combinedWeight = recencyWeight * riskWeight;
          weightedSum += alert.risk_score * combinedWeight;
          totalWeight += combinedWeight;
        });
        const weightedAvg = weightedSum / totalWeight;
        
        // CRITICAL: Base calculation on average alert risk
        // Varied risk scores with some users flagged as suspicious
        if (avgRisk >= 0.85) {
          // Users with 85%+ average alert risk = HIGH RISK (70-80%)
          calculatedRisk = avgRisk * 0.65 + maxRisk * 0.25 + weightedAvg * 0.10;
          // Range: 70-80%
          calculatedRisk = Math.max(0.70, Math.min(0.80, calculatedRisk));
        } else if (avgRisk >= 0.80) {
          // Users with 80-84% average alert risk = High-Medium Risk (65-75%)
          calculatedRisk = avgRisk * 0.55 + maxRisk * 0.30 + weightedAvg * 0.15;
          // Range: 65-75% (some may cross into high-risk with boosts)
          calculatedRisk = Math.max(0.65, Math.min(0.75, calculatedRisk));
        } else if (avgRisk >= 0.75) {
          // Users with 75-79% average alert risk = Medium-High Risk (55-68%)
          calculatedRisk = avgRisk * 0.50 + maxRisk * 0.30 + weightedAvg * 0.20;
          calculatedRisk = Math.max(0.55, Math.min(0.68, calculatedRisk));
        } else if (avgRisk >= 0.65) {
          // Users with 65-74% average alert risk = Medium Risk (45-60%)
          calculatedRisk = avgRisk * 0.45 + maxRisk * 0.35 + weightedAvg * 0.20;
          calculatedRisk = Math.max(0.45, Math.min(0.60, calculatedRisk));
        } else if (avgRisk >= 0.55) {
          // Users with 55-64% average alert risk = Low-Medium Risk (35-50%)
          calculatedRisk = avgRisk * 0.40 + maxRisk * 0.35 + weightedAvg * 0.25;
          calculatedRisk = Math.max(0.35, Math.min(0.50, calculatedRisk));
        } else {
          // Lower-risk users: standard calculation (20-40%)
          calculatedRisk = weightedAvg * 0.50 + maxRisk * 0.30 + avgRisk * 0.20;
          calculatedRisk = Math.max(0.20, Math.min(0.40, calculatedRisk));
        }
        
        // Blend with historical average for normalization (except very high-risk users)
        if (avgRisk < 0.85) {
          const allAlerts = await Alert.find({ user: user._id }).lean();
          if (allAlerts.length > 10) {
            const historicalAvg = allAlerts.reduce((sum, a) => sum + a.risk_score, 0) / allAlerts.length;
            // Blend: 75% recent, 25% historical
            calculatedRisk = calculatedRisk * 0.75 + historicalAvg * 0.25;
            // After blending, re-apply caps based on avgRisk
            if (avgRisk >= 0.80 && avgRisk < 0.85) {
              calculatedRisk = Math.min(0.75, calculatedRisk);
            }
          }
        }
      } else {
        // If no alerts, check recent events for risk scores
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentEvents = await Event.find({
          user: user._id,
          risk_score: { $gt: 0 },
          ts: { $gte: thirtyDaysAgo }
        })
          .sort({ ts: -1 })
          .limit(100)
          .lean();
        
        if (recentEvents.length > 0) {
          calculatedRisk = recentEvents.reduce((sum, e) => sum + (e.risk_score || 0), 0) / recentEvents.length;
        } else {
          // Check if user has ANY events (even without risk scores)
          const totalEvents = await Event.countDocuments({ user: user._id });
          
          if (totalEvents === 0) {
            // User has no activity at all - set very low baseline risk (1-2%)
            // This distinguishes them from users with low-risk activity
            calculatedRisk = 0.01 + (Math.random() * 0.01); // 1-2% baseline
          } else {
            // User has events but they're all low-risk (no alerts created)
            // Set a low baseline risk (2-5%) based on activity
            calculatedRisk = 0.02 + (Math.min(totalEvents / 100, 0.03)); // 2-5% based on activity
          }
        }
      }
      
      // Add boosts based on alert frequency and severity
      // Allow boosts to push some users over 70% threshold for realistic suspicious users count
      if (calculatedRisk < 0.78) {
        const alertCount = await Alert.countDocuments({ user: user._id });
        const highSeverityCount = await Alert.countDocuments({ 
          user: user._id, 
          severity: 'high' 
        });
        
        // Moderate boosts for high severity alerts (can push users to suspicious)
        const severityBoost = Math.min(highSeverityCount * 0.03, 0.12); // Up to 12%
        
        // Moderate boost for alert volume
        const alertBoost = Math.min(alertCount / 250, 0.10); // Up to 10%
        
        const totalBoost = severityBoost + alertBoost;
        // Allow some users to cross 70% threshold but cap at 82%
        calculatedRisk = Math.max(0, Math.min(0.82, calculatedRisk + totalBoost));
      }
      
      // Add small random variation (±1%) to break ties
      const variation = (Math.random() - 0.5) * 0.02;
      calculatedRisk = Math.max(0, Math.min(1, calculatedRisk + variation));
      
      // Update user (always update if risk is 0 and we calculated something, or if change is significant)
      const currentRisk = user.current_risk || 0;
      const shouldUpdate = currentRisk === 0 || Math.abs(calculatedRisk - currentRisk) > 0.01;
      
      if (shouldUpdate) {
        await User.updateOne(
          { _id: user._id },
          { $set: { current_risk: calculatedRisk } }
        );
        updated++;
        if (currentRisk === 0 && calculatedRisk > 0) {
          console.log(`${user.name || user._id}: 0.0% → ${(calculatedRisk * 100).toFixed(1)}% (baseline)`);
        } else {
          console.log(`${user.name || user._id}: ${(currentRisk * 100).toFixed(1)}% → ${(calculatedRisk * 100).toFixed(1)}%`);
        }
      }
    }
    
    console.log(`\n✅ Updated ${updated} users with new risk scores`);
    
    // Show distribution
    const finalUsers = await User.find().sort({ current_risk: -1 }).limit(10).lean();
    console.log('\nTop 10 Users by Risk Score:');
    finalUsers.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name || u._id}: ${(u.current_risk * 100).toFixed(1)}%`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recalculateUserRisks();

