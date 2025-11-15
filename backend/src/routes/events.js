const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const User = require('../models/User');

const severityToStatusTag = (severity) => {
  switch (severity) {
    case 'high':
      return 'escalated';
    case 'medium':
      return 'pending';
    default:
      return 'resolved';
  }
};

// Recent anomaly events derived from alerts (matches frontend expected Event shape)
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const alerts = await Alert.find({})
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const userIds = [...new Set(alerts.map(a => a.user))];
    const users = await User.find({ _id: { $in: userIds } }).select('_id name').lean();
    const names = users.reduce((acc, u) => { acc[u._id] = u.name || u._id; return acc; }, {});

    const data = alerts.map(a => ({
      id: String(a._id),
      timestamp: a.created_at,
      user: names[a.user] || a.user,
      anomalyType: a.anomaly_type,
      status: severityToStatusTag(a.severity)
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
