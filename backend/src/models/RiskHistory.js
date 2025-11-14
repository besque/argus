const mongoose = require('mongoose');

const riskHistorySchema = new mongoose.Schema({
  user: { type: String, required: true, index: true },
  ts: { type: Date, required: true, index: true },
  avg_risk: { type: Number, required: true },
  high_count: { type: Number, default: 0 },
  med_count: { type: Number, default: 0 },
  low_count: { type: Number, default: 0 }
}, { timestamps: false });

module.exports = mongoose.model('RiskHistory', riskHistorySchema);