const mongoose = require('mongoose');

const baselineSchema = new mongoose.Schema({
  user: { type: String, required: true, unique: true, index: true },
  login_hour_hist: { type: Map, of: Number },
  avg_files_per_session: { type: Number },
  avg_bytes: { type: Number },
  session_len_stats: {
    mean: { type: Number },
    std: { type: Number }
  },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Baseline', baselineSchema);