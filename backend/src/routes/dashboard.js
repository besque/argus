const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const User = require('../models/User');
const Event = require('../models/Event');
const RiskHistory = require('../models/RiskHistory');
const cache = require('../services/cacheService');

router.get('/', async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:main';
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }
    
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    const totalAlerts = await Alert.countDocuments({});
    const totalEvents = await Event.countDocuments({});    
    const severityDist = await Alert.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    
    const topUsers = await User.find()
      .sort({ current_risk: -1 })
      .limit(5)
      .select('_id name current_risk role')
      .lean();
    
    const sparkline = await RiskHistory.aggregate([
      { $match: { ts: { $gte: last7d } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$ts' } },
        avg_risk: { $avg: '$avg_risk' },
        high_count: { $sum: '$high_count' }
      }},
      { $sort: { _id: 1 } }
    ]);
        
    const data = {
      total_alerts: totalAlerts,
      total_events: totalEvents,
      severity_distribution: severityDist.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, { low: 0, medium: 0, high: 0 }),
      top_users: topUsers,
      sparkline: sparkline.map(s => ({
        date: s._id,
        avg_risk: s.avg_risk,
        high_count: s.high_count
      }))
    };
    
    await cache.set(cacheKey, data, 10);
    
    res.json({ success: true, data, cached: false });
  } catch (err) {
    next(err);
  }
});

// KPIs for top summary cards
router.get('/kpis', async (req, res, next) => {
  try {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [userAgg, activeUsers, suspiciousUsers, totalEvents, totalAnomalies] = await Promise.all([
      User.aggregate([
        { $group: { _id: null, avgRisk: { $avg: '$current_risk' }, count: { $sum: 1 } } }
      ]),
      // Active users: users with activity in last 7 days OR users with recent events
      User.countDocuments({ 
        $or: [
          { last_seen: { $gte: last7d } },
          { last_seen: { $exists: true } } // If they have any last_seen, consider them active
        ]
      }),
      User.countDocuments({ current_risk: { $gte: 0.7 } }),
      Event.countDocuments({}),
      // Show all anomalies, not just last 24h (since dates may be in future/old)
      Alert.countDocuments({})
    ]);

    const overallRiskScore = Math.round(((userAgg[0]?.avgRisk) || 0) * 100);

    res.json({
      overallRiskScore: isNaN(overallRiskScore) ? 0 : overallRiskScore,
      activeUsers: activeUsers || 0,
      suspiciousUsers: suspiciousUsers || 0,
      totalEventsProcessed: totalEvents || 0,
      totalAnomalies: totalAnomalies || 0
    });
  } catch (err) {
    next(err);
  }
});

// Risk breakdown percentages across users
router.get('/risk-breakdown', async (req, res, next) => {
  try {
    const users = await User.find().select('current_risk').lean();
    const total = users.length || 1;
    
    // Handle empty users array
    if (total === 1 && users.length === 0) {
      return res.json({ high: 0, medium: 0, low: 0 });
    }
    
    let high = 0, medium = 0, low = 0;
    users.forEach(u => {
      const pct = (u.current_risk || 0) * 100;
      if (pct >= 70) high++;
      else if (pct >= 40) medium++;
      else low++;
    });
    const toPct = (n) => Math.round((n / total) * 100);
    res.json({ 
      high: toPct(high) || 0, 
      medium: toPct(medium) || 0, 
      low: toPct(low) || 0 
    });
  } catch (err) {
    next(err);
  }
});

// Risk timeline over last 24h (hourly) - compute from Alerts if RiskHistory is empty
router.get('/risk-timeline', async (req, res, next) => {
  try {
    // Try RiskHistory first for recent data
    let timeline = await RiskHistory.aggregate([
      { $sort: { ts: -1 } },
      { $limit: 24 },
      { $sort: { ts: 1 } },
      { $project: {
        _id: { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$ts' } },
        avgRisk: '$avg_risk',
        anomalies: '$high_count'
      } }
    ]);

    // If RiskHistory is empty or has less than 5 points, compute from all available Alerts
    if (timeline.length < 5) {
      timeline = await Alert.aggregate([
        { $sort: { created_at: 1 } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$created_at' } },
          avgRisk: { $avg: '$risk_score' },
          anomalies: { $sum: 1 }
        } },
        { $sort: { _id: 1 } },
        { $limit: 24 }
      ]);
    }

    // If still empty, return empty array instead of error
    const data = timeline.length > 0 ? timeline.map(t => ({
      timestamp: t._id,
      riskScore: Math.round((t.avgRisk || 0) * 100),
      anomalies: t.anomalies || 0
    })) : [];

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Anomaly breakdown by type
router.get('/anomaly-breakdown', async (req, res, next) => {
  try {
    const byType = await Alert.aggregate([
      { $group: { _id: '$anomaly_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Handle empty alerts
    if (byType.length === 0) {
      return res.json([]);
    }

    const total = byType.reduce((sum, r) => sum + r.count, 0) || 1;
    const colorMap = {
      'Unauthorized Access': '#ef4444',
      'Data Exfiltration': '#f59e0b',
      'Policy Violation': '#eab308',
      'Suspicious Activity': '#06b6d4',
      'compromised_account': '#ef4444',
      'data_exfiltration': '#f59e0b',
      'insider_threat': '#eab308',
      'policy_violation': '#06b6d4',
      'unknown': '#6b7280'
    };

    const data = byType.map(r => ({
      type: r._id || 'unknown',
      count: r.count,
      percentage: Math.round((r.count / total) * 100),
      color: colorMap[r._id] || '#6b7280'
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;