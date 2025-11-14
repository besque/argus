const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  ts: { type: Date, required: true, index: true },
  user: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['AUTH', 'FIREWALL', 'ENDPOINT', 'APP', 'NET', 'FILE', 'EMAIL', 'DEVICE'] 
  },
  action: { type: String, required: true },
  resource: { type: String },
  src_ip: { type: String },
  dst_ip: { type: String },
  device: { type: String },
  size: { type: Number },
  raw: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);