const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String },
  devices: [{ type: String }],
  last_seen: { type: Date },
  current_risk: { type: Number, default: 0, min: 0, max: 1 },
  ai_summary: {
    text: { type: String },
    last_updated: { type: Date }
  }
}, { _id: false });

module.exports = mongoose.model('User', userSchema);