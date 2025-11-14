const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Event = require('../models/Event');

router.get('/', async (req, res, next) => {
  try {
    const { severity, limit = 20, skip = 0 } = req.query;
    
    const filter = {};
    if (severity) {
      filter.severity = severity;
    }
    
    const alerts = await Alert.find(filter)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    const total = await Alert.countDocuments(filter);
    
    res.json({
      success: true,
      data: alerts,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/context', async (req, res, next) => {
  try {
    const { event_id, window = 10 } = req.query;
    
    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    const before = await Event.find({
      user: event.user,
      ts: { $lt: event.ts }
    })
      .sort({ ts: -1 })
      .limit(parseInt(window))
      .lean();
    
    const after = await Event.find({
      user: event.user,
      ts: { $gt: event.ts }
    })
      .sort({ ts: 1 })
      .limit(parseInt(window))
      .lean();
    
    res.json({
      success: true,
      event,
      context: {
        before: before.reverse(),
        after
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;