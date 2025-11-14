const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: String, required: true, index: true },
  risk_score: { type: Number, required: true, min: 0, max: 1 },
  severity: { type: String, required: true, enum: ['low', 'medium', 'high'], index: true },
  anomaly_type: { type: String, required: true },
  explanation: { type: String, required: true },
  scores: {
    baseline: { type: Number },
    markov: { type: Number },
    isolation_forest: { type: Number },
    rules: { type: mongoose.Schema.Types.Mixed }
  },
  created_at: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

module.exports = mongoose.model('Alert', alertSchema);