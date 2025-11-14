const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Alert = require('../models/Alert');
const mlService = require('../services/mlService');
const geminiService = require('../services/geminiService');

router.get('/', async (req, res, next) => {
  try {
    const { sort = 'riskscore', limit = 5, skip = 0 } = req.query;
    
    const sortField = sort === 'riskscore' ? { current_risk: -1 } : { last_seen: -1 };
    
    const users = await User.find()
      .sort(sortField)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    const total = await User.countDocuments();
    
    res.json({
      success: true,
      data: users,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const recentEvents = await Event.find({ user: userId })
      .sort({ ts: -1 })
      .limit(5)
      .lean();
    
    const topAlerts = await Alert.find({ user: userId })
      .sort({ created_at: -1 })
      .limit(5)
      .lean();
    
    res.json({
      success: true,
      user,
      recent_events: recentEvents,
      top_alerts: topAlerts
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/events', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { limit = 5, before } = req.query;
    
    const filter = { user: userId };
    if (before) {
      filter.ts = { $lt: new Date(before) };
    }
    
    const events = await Event.find(filter)
      .sort({ ts: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      data: events
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/ai_summary', async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (user.ai_summary && user.ai_summary.last_updated) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (user.ai_summary.last_updated > hourAgo) {
        return res.json({
          success: true,
          summary: user.ai_summary.text,
          cached: true
        });
      }
    }
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eventCounts = await Event.aggregate([
      { $match: { user: userId, ts: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    const topAlerts = await Alert.find({ user: userId })
      .sort({ created_at: -1 })
      .limit(5)
      .select('anomaly_type created_at explanation')
      .lean();
    
    const oceanVector = await mlService.getUserOcean(userId);
    
    const userData = {
      user: userId,
      role: user.role,
      eventCounts: eventCounts.reduce((acc, e) => {
        acc[e._id] = e.count;
        return acc;
      }, {}),
      currentRisk: user.current_risk,
      topAlerts: topAlerts.map(a => ({
        type: a.anomaly_type,
        ts: a.created_at,
        explanation: a.explanation
      })),
      oceanVector
    };
    
    const summary = await geminiService.generateSummary(userData);
    
    user.ai_summary = {
      text: summary,
      last_updated: new Date()
    };
    await user.save();
    
    res.json({
      success: true,
      summary,
      cached: false
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;