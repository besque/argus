const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Alert = require('../models/Alert');
const User = require('../models/User');
const RiskHistory = require('../models/RiskHistory');
const mlService = require('../services/mlService');

router.post('/', async (req, res, next) => {
  try {
    const eventData = req.body;
    
    const event = new Event({
      ts: new Date(eventData.ts || Date.now()),
      user: eventData.user,
      type: eventData.type,
      action: eventData.action,
      resource: eventData.resource,
      src_ip: eventData.src_ip,
      dst_ip: eventData.dst_ip,
      device: eventData.device,
      size: eventData.size,
      raw: eventData
    });
    
    await event.save();
    
    const mlResult = await mlService.analyze(eventData, eventData.user);
    
    if (mlResult.severity === 'medium' || mlResult.severity === 'high') {
      const alert = new Alert({
        event_id: event._id,
        user: event.user,
        risk_score: mlResult.risk_score,
        severity: mlResult.severity,
        anomaly_type: mlResult.anomaly_type,
        explanation: mlResult.explanation,
        scores: mlResult.scores,
        created_at: new Date()
      });
      
      await alert.save();
      
      await User.findOneAndUpdate(
        { _id: event.user },
        {
          $set: { 
            last_seen: event.ts,
            current_risk: Math.max(mlResult.risk_score, 0)
          },
          $addToSet: { devices: event.device }
        },
        { upsert: true, new: true }
      );
      
      const now = new Date();
      now.setMinutes(0, 0, 0);
      
      await RiskHistory.findOneAndUpdate(
        { user: event.user, ts: now },
        {
          $inc: {
            [`${mlResult.severity}_count`]: 1
          },
          $max: { avg_risk: mlResult.risk_score }
        },
        { upsert: true }
      );
      
      if (req.app.get('io')) {
        req.app.get('io').emit('new_alert', {
          id: alert._id,
          user: alert.user,
          severity: alert.severity,
          anomaly_type: alert.anomaly_type,
          created_at: alert.created_at
        });
      }
    }
    
    res.status(201).json({ success: true, event_id: event._id, ml_result: mlResult });
  } catch (err) {
    next(err);
  }
});

router.post('/analyze', async (req, res, next) => {
  try {
    const { event, user_id } = req.body;
    const result = await mlService.analyze(event, user_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;