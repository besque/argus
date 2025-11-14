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
    
    const totalAlerts = await Alert.countDocuments({ created_at: { $gte: last24h } });
    
    const severityDist = await Alert.aggregate([
      { $match: { created_at: { $gte: last24h } } },
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
    
    const totalEvents = await Event.countDocuments({ ts: { $gte: last24h } });
    
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

module.exports = router;