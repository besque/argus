require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Event = require('./models/Event');

const API_URL = 'http://localhost:5000/api/logs';

async function processEvents() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');
  
  const events = await Event.find({ risk_score: { $exists: false } })
    .limit(100)
    .lean();
  
  console.log(`Processing ${events.length} events through ML...\n`);
  
  let processed = 0;
  let alerts = 0;
  
  for (const evt of events) {
    try {
      const payload = {
        ts: evt.ts,
        user: evt.user,
        type: evt.type,
        action: evt.action,
        resource: evt.resource,
        src_ip: evt.src_ip,
        dst_ip: evt.dst_ip,
        device: evt.device,
        size: evt.size
      };
      
      const res = await axios.post(API_URL, payload);
      
      if (res.data.ml_result?.severity === 'high' || res.data.ml_result?.severity === 'medium') {
        alerts++;
      }
      
      processed++;
      if (processed % 10 === 0) {
        console.log(`Processed ${processed}/${events.length} - Alerts: ${alerts}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`Error processing event: ${err.message}`);
    }
  }
  
  console.log(`\nComplete! Processed ${processed} events, Created ${alerts} alerts`);
  process.exit(0);
}

processEvents();