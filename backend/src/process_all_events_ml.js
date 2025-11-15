require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');
const Alert = require('./models/Alert');
const User = require('./models/User');
const RiskHistory = require('./models/RiskHistory');
const axios = require('axios');
const ML_URL = process.env.ML_URL || 'http://localhost:8001/analyze';

// Import aggregation functions from logs.js
function buildEventSequence(events) {
  return events.slice(-15).map(event => {
    if (event.type === 'AUTH') {
      if (event.action === 'Logon') return 'LOGIN';
      if (event.action === 'Logoff') return 'LOGOUT';
      return 'AUTH';
    }
    if (event.type === 'FILE') {
      const resource = event.resource || '';
      if (resource.includes('payroll') || resource.includes('compensation') || 
          resource.includes('employee_records') || resource.includes('salary') ||
          resource.includes('strategic') || resource.includes('source_code')) {
        return 'FILE_SENSITIVE';
      }
      return 'FILE_ACCESS';
    }
    if (event.type === 'EMAIL') return 'EMAIL_SEND';
    if (event.type === 'DEVICE' && event.action === 'Connect') return 'USB_CONNECT';
    if (event.type === 'ENDPOINT') return 'PROCESS';
    if (event.type === 'APP') return 'WEB_BROWSE';
    if (event.type === 'NET') return 'NETWORK';
    return 'UNKNOWN';
  }).join(' -> ');
}

function aggregateFeatures(events, currentEvent) {
  const now = new Date(currentEvent.ts || Date.now());
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentEvents = events.filter(e => 
    new Date(e.ts) >= twentyFourHoursAgo && new Date(e.ts) <= now
  );
  
  const aggregates = {
    logon_count: 0, failed_login_count: 0, external_ip_count: 0, late_night_login_count: 0,
    file_access_count: 0, total_file_size: 0, avg_file_size: 0, max_file_size: 0,
    sensitive_folder_access_count: 0, usb_copy_count: 0,
    email_count: 0, total_email_size: 0, avg_email_size: 0,
    email_with_attachment_count: 0, external_email_count: 0,
    web_visit_count: 0, suspicious_domain_count: 0,
    usb_connect_count: 0,
    total_bytes_out: 0, avg_bytes_out: 0, max_bytes_out: 0,
    total_bytes_in: 0, avg_bytes_in: 0, large_upload_count: 0,
    lateral_movement_count: 0,
    process_count: 0, scripting_tool_count: 0, high_integrity_count: 0,
  };
  
  const fileSizes = [], emailSizes = [], bytesOut = [], bytesIn = [];
  
  for (const event of recentEvents) {
    const eventHour = new Date(event.ts).getHours();
    const isLateNight = eventHour >= 22 || eventHour <= 4;
    const isExternalIP = event.src_ip && !event.src_ip.startsWith('192.168.');
    
    if (event.type === 'AUTH') {
      if (event.action === 'Logon') {
        aggregates.logon_count++;
        if (event.raw && event.raw.status === 'Failed') aggregates.failed_login_count++;
        if (isExternalIP) aggregates.external_ip_count++;
        if (isLateNight) aggregates.late_night_login_count++;
      }
    }
    
    if (event.type === 'FILE') {
      aggregates.file_access_count++;
      const size = event.size || 0;
      fileSizes.push(size);
      aggregates.total_file_size += size;
      const resource = event.resource || '';
      if (resource.includes('payroll') || resource.includes('compensation') || 
          resource.includes('employee_records') || resource.includes('salary') ||
          resource.includes('strategic') || resource.includes('source_code')) {
        aggregates.sensitive_folder_access_count++;
      }
      if (event.raw && (event.raw.to_removable_media === 'True' || event.raw.to_removable_media === true)) {
        aggregates.usb_copy_count++;
      }
    }
    
    if (event.type === 'EMAIL') {
      aggregates.email_count++;
      const size = event.size || 0;
      emailSizes.push(size);
      aggregates.total_email_size += size;
      if (event.raw && event.raw.attachments && event.raw.attachments !== '') {
        aggregates.email_with_attachment_count++;
      }
      const toEmail = event.resource || (event.raw && event.raw.to) || '';
      if (toEmail && !toEmail.includes('company.local')) {
        aggregates.external_email_count++;
      }
    }
    
    if (event.type === 'APP') {
      aggregates.web_visit_count++;
      const url = event.resource || '';
      if (url.includes('analytics-tracker') || url.includes('ad-serve') || 
          url.includes('metrics-collector') || url.includes('cdn-content-delivery')) {
        aggregates.suspicious_domain_count++;
      }
    }
    
    if (event.type === 'DEVICE' && event.action === 'Connect') {
      aggregates.usb_connect_count++;
    }
    
    if (event.type === 'NET') {
      const bytesOutVal = event.size || (event.raw && event.raw.bytes_out) || 0;
      const bytesInVal = event.raw && event.raw.bytes_in || 0;
      bytesOut.push(bytesOutVal);
      bytesIn.push(bytesInVal);
      aggregates.total_bytes_out += bytesOutVal;
      aggregates.total_bytes_in += bytesInVal;
      if (bytesOutVal > 500000) aggregates.large_upload_count++;
      const protocol = event.raw && event.raw.protocol;
      if (protocol === 'RDP' || protocol === 'SMB') {
        aggregates.lateral_movement_count++;
      } else if (event.dst_ip && event.dst_ip.startsWith('192.168.')) {
        aggregates.lateral_movement_count++;
      }
    }
    
    if (event.type === 'ENDPOINT') {
      aggregates.process_count++;
      const process = event.resource || (event.raw && event.raw.process) || '';
      if (process.toLowerCase().includes('powershell') || process.toLowerCase().includes('cmd')) {
        aggregates.scripting_tool_count++;
      }
      const integrity = event.raw && event.raw.integrity_level;
      if (integrity === 'high') {
        aggregates.high_integrity_count++;
      }
    }
  }
  
  if (fileSizes.length > 0) {
    aggregates.avg_file_size = aggregates.total_file_size / fileSizes.length;
    aggregates.max_file_size = Math.max(...fileSizes);
  }
  
  if (emailSizes.length > 0) {
    aggregates.avg_email_size = aggregates.total_email_size / emailSizes.length;
  }
  
  if (bytesOut.length > 0) {
    aggregates.avg_bytes_out = aggregates.total_bytes_out / bytesOut.length;
    aggregates.max_bytes_out = Math.max(...bytesOut);
  }
  
  if (bytesIn.length > 0) {
    aggregates.avg_bytes_in = aggregates.total_bytes_in / bytesIn.length;
  }
  
  return aggregates;
}

async function processEvent(event) {
  try {
    const now = new Date(event.ts);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get recent events for this user
    const recentEvents = await Event.find({
      user: event.user,
      ts: { $gte: oneDayAgo, $lte: now }
    }).sort({ ts: 1 }).lean();
    
    const aggregates = aggregateFeatures(recentEvents, event);
    const sequence = buildEventSequence(recentEvents);
    
    const user = await User.findOne({ _id: event.user });
    const knownDevices = user ? (user.devices || []) : [];
    const isNewDevice = event.device && !knownDevices.includes(event.device);
    
    const mlPayload = {
      ...event.toObject(),
      ...aggregates,
      recent_sequence: sequence,
      ts: event.ts.toISOString(),
      is_new_device: isNewDevice,
      known_devices: knownDevices,
      logon_count: Number(aggregates.logon_count) || 0,
      failed_login_count: Number(aggregates.failed_login_count) || 0,
      external_ip_count: Number(aggregates.external_ip_count) || 0,
      late_night_login_count: Number(aggregates.late_night_login_count) || 0,
      file_access_count: Number(aggregates.file_access_count) || 0,
      total_file_size: Number(aggregates.total_file_size) || 0,
      avg_file_size: Number(aggregates.avg_file_size) || 0,
      max_file_size: Number(aggregates.max_file_size) || 0,
      sensitive_folder_access_count: Number(aggregates.sensitive_folder_access_count) || 0,
      usb_copy_count: Number(aggregates.usb_copy_count) || 0,
      email_count: Number(aggregates.email_count) || 0,
      total_email_size: Number(aggregates.total_email_size) || 0,
      avg_email_size: Number(aggregates.avg_email_size) || 0,
      email_with_attachment_count: Number(aggregates.email_with_attachment_count) || 0,
      external_email_count: Number(aggregates.external_email_count) || 0,
      web_visit_count: Number(aggregates.web_visit_count) || 0,
      suspicious_domain_count: Number(aggregates.suspicious_domain_count) || 0,
      usb_connect_count: Number(aggregates.usb_connect_count) || 0,
      total_bytes_out: Number(aggregates.total_bytes_out) || 0,
      avg_bytes_out: Number(aggregates.avg_bytes_out) || 0,
      max_bytes_out: Number(aggregates.max_bytes_out) || 0,
      total_bytes_in: Number(aggregates.total_bytes_in) || 0,
      avg_bytes_in: Number(aggregates.avg_bytes_in) || 0,
      large_upload_count: Number(aggregates.large_upload_count) || 0,
      lateral_movement_count: Number(aggregates.lateral_movement_count) || 0,
      process_count: Number(aggregates.process_count) || 0,
      scripting_tool_count: Number(aggregates.scripting_tool_count) || 0,
      high_integrity_count: Number(aggregates.high_integrity_count) || 0,
    };
    
    const response = await axios.post(ML_URL, mlPayload, { timeout: 10000 });
    const mlResult = response.data;
    
    // Update event with ML results
    event.risk_score = mlResult.risk_score || 0;
    event.severity = mlResult.severity || 'low';
    await event.save();
    
    // Create alert if medium or high severity
    if (mlResult.severity === 'medium' || mlResult.severity === 'high') {
      await Alert.findOneAndUpdate(
        { event_id: event._id },
        {
          event_id: event._id,
          user: event.user,
          risk_score: mlResult.risk_score,
          severity: mlResult.severity,
          anomaly_type: mlResult.anomaly_type || 'unknown',
          explanation: mlResult.explanation || 'Anomaly detected',
          scores: mlResult.scores || {},
          created_at: event.ts
        },
        { upsert: true, new: true }
      );
      
      // Update user risk
      await User.findOneAndUpdate(
        { _id: event.user },
        {
          $set: { 
            last_seen: event.ts,
            current_risk: Math.max(mlResult.risk_score || 0, 0)
          },
          $addToSet: { devices: event.device }
        },
        { upsert: true, new: true }
      );
      
      // Update risk history
      const nowHour = new Date(event.ts);
      nowHour.setMinutes(0, 0, 0);
      
      await RiskHistory.findOneAndUpdate(
        { user: event.user, ts: nowHour },
        {
          $inc: {
            [`${mlResult.severity}_count`]: 1
          },
          $max: { avg_risk: mlResult.risk_score || 0 }
        },
        { upsert: true }
      );
    }
    
    return { success: true, severity: mlResult.severity };
  } catch (error) {
    console.error(`Error processing event ${event._id}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');
    
    // Process events that haven't been processed yet (risk_score is 0 or doesn't exist)
    const events = await Event.find({
      $or: [
        { risk_score: { $exists: false } },
        { risk_score: 0 }
      ]
    }).sort({ ts: 1 });
    
    console.log(`Found ${events.length} events to process through ML\n`);
    
    let processed = 0;
    let alerts = 0;
    const batchSize = 10;
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(event => processEvent(event))
      );
      
      processed += batch.length;
      alerts += results.filter(r => r.severity === 'medium' || r.severity === 'high').length;
      
      console.log(`Processed ${processed}/${events.length} events - Alerts: ${alerts}`);
      
      // Small delay to avoid overwhelming ML service
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Complete!`);
    console.log(`   Processed: ${processed} events`);
    console.log(`   Alerts created: ${alerts}`);
    
    const totalAlerts = await Alert.countDocuments();
    const totalUsers = await User.countDocuments();
    console.log(`\n📊 Final Stats:`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Total Alerts: ${totalAlerts}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
