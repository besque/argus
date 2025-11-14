const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Alert = require('../models/Alert');
const Event = require('../models/Event');

router.get('/', async (req, res, next) => {
  try {
    const { q, type, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }
    
    const results = {};
    
    if (!type || type === 'user') {
      results.users = await User.find({
        $or: [
          { _id: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
          { role: { $regex: q, $options: 'i' } }
        ]
      })
        .limit(parseInt(limit))
        .lean();
    }
    
    if (!type || type === 'alert') {
      results.alerts = await Alert.find({
        $or: [
          { user: { $regex: q, $options: 'i' } },
          { anomaly_type: { $regex: q, $options: 'i' } },
          { explanation: { $regex: q, $options: 'i' } }
        ]
      })
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .lean();
    }
    
    if (!type || type === 'event') {
      results.events = await Event.find({
        $or: [
          { user: { $regex: q, $options: 'i' } },
          { action: { $regex: q, $options: 'i' } },
          { resource: { $regex: q, $options: 'i' } },
          { device: { $regex: q, $options: 'i' } }
        ]
      })
        .sort({ ts: -1 })
        .limit(parseInt(limit))
        .lean();
    }
    
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;