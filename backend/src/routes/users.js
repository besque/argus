const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Alert = require('../models/Alert');
const mlService = require('../services/mlService');
const geminiService = require('../services/geminiService');

router.get('/', async (req, res, next) => {
  try {
    const { sort = 'riskscore', limit = 100, skip = 0 } = req.query;

    const sortField = sort === 'riskscore' ? { current_risk: -1 } : { last_seen: -1 };

    const users = await User.find()
      .sort(sortField)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Map to frontend-friendly shape - make sure it matches dashboard top users
    const mapped = users.map(u => {
      const riskPct = Math.round((u.current_risk || 0) * 100);
      const name = u.name || u._id;
      const initials = name
        .split(' ')
        .filter(Boolean)
        .map(s => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      const status = riskPct >= 70 ? 'high' : riskPct >= 40 ? 'medium' : 'low';
      return {
        id: u._id,
        name,
        email: `${u._id}@example.com`,
        avatar: initials,
        riskScore: riskPct,
        jobTitle: u.role || 'Employee',
        department: u.role || 'General',
        status,
        recentActivity: [],
        riskVectors: {
          dataAccessFrequency: 0,
          loginSuccessRate: 0,
          policyViolations: 0,
          unusualHours: 0,
          externalAccess: 0
        },
        // Add fields to match backend data
        _id: u._id,
        role: u.role || 'Employee',
        current_risk: u.current_risk || 0,
        last_seen: u.last_seen
      };
    });

    res.json(mapped);
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
      .limit(20)
      .lean();
    
    const topAlerts = await Alert.find({ user: userId })
      .sort({ created_at: -1 })
      .limit(10)
      .lean();
    
    // Build markov sequence from recent events (last 15)
    const buildEventSequence = (events) => {
      return events.slice(-15).map(event => {
        if (event.type === 'AUTH') {
          if (event.action === 'Logon') return 'LOGIN';
          if (event.action === 'Logoff') return 'LOGOUT';
          return 'AUTH';
        }
        if (event.type === 'FILE') {
          const resource = event.resource || '';
          if (resource.includes('payroll') || resource.includes('compensation') || 
              resource.includes('employee_records') || resource.includes('salary') ||
              resource.includes('strategic') || resource.includes('source_code')) {
            return 'FILE_SENSITIVE';
          }
          return 'FILE_ACCESS';
        }
        if (event.type === 'EMAIL') return 'EMAIL_SEND';
        if (event.type === 'DEVICE' && event.action === 'Connect') return 'USB_CONNECT';
        if (event.type === 'ENDPOINT') return 'PROCESS';
        if (event.type === 'APP') return 'WEB_BROWSE';
        if (event.type === 'NET') return 'NETWORK';
        return 'UNKNOWN';
      }).join(' -> ');
    };
    
    const markovSequence = buildEventSequence(recentEvents);
    
    // Get OCEAN scores from ML service
    const oceanVector = await mlService.getUserOcean(userId);
    
    res.json({
      success: true,
      user,
      recent_events: recentEvents.slice(0, 5), // Return only first 5 for recent events
      top_alerts: topAlerts,
      markov_sequence: markovSequence,
      ocean_vector: oceanVector
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