const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Alert = require('../models/Alert');
const User = require('../models/User');
const RiskHistory = require('../models/RiskHistory');
const mlService = require('../services/mlService');

// Helper function to build event sequence for Markov model
function buildEventSequence(events) {
  return events.slice(-15).map(event => {
    if (event.type === 'AUTH') {
      if (event.action === 'Logon') return 'LOGIN';
      if (event.action === 'Logoff') return 'LOGOUT';
      return 'AUTH';
    }
    if (event.type === 'FILE') {
      // Check if sensitive folder
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

// Helper function to aggregate features from recent events
function aggregateFeatures(events, currentEvent) {
  const now = new Date(currentEvent.ts || Date.now());
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Filter events from last 24 hours
  const recentEvents = events.filter(e => 
    new Date(e.ts) >= twentyFourHoursAgo && new Date(e.ts) <= now
  );
  
  // Initialize all required features (matching NUMERIC_FEATURE_COLS)
  const aggregates = {
    logon_count: 0,
    failed_login_count: 0,
    external_ip_count: 0,
    late_night_login_count: 0,
    file_access_count: 0,
    total_file_size: 0,
    avg_file_size: 0,
    max_file_size: 0,
    sensitive_folder_access_count: 0,
    usb_copy_count: 0,
    email_count: 0,
    total_email_size: 0,
    avg_email_size: 0,
    email_with_attachment_count: 0,
    external_email_count: 0,
    web_visit_count: 0,
    suspicious_domain_count: 0,
    usb_connect_count: 0,
    total_bytes_out: 0,
    avg_bytes_out: 0,
    max_bytes_out: 0,
    total_bytes_in: 0,
    avg_bytes_in: 0,
    large_upload_count: 0,
    lateral_movement_count: 0,
    process_count: 0,
    scripting_tool_count: 0,
    high_integrity_count: 0,
  };
  
  const fileSizes = [];
  const emailSizes = [];
  const bytesOut = [];
  const bytesIn = [];
  
  // Aggregate from recent events
  for (const event of recentEvents) {
    const eventHour = new Date(event.ts).getHours();
    const isLateNight = eventHour >= 22 || eventHour <= 4;
    const isExternalIP = event.src_ip && !event.src_ip.startsWith('192.168.');
    
    // AUTH events
    if (event.type === 'AUTH') {
      if (event.action === 'Logon') {
        aggregates.logon_count++;
        if (event.raw && event.raw.status === 'Failed') {
          aggregates.failed_login_count++;
        }
        if (isExternalIP) {
          aggregates.external_ip_count++;
        }
        if (isLateNight) {
          aggregates.late_night_login_count++;
        }
      }
    }
    
    // FILE events
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
    
    // EMAIL events
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
    
    // APP (HTTP) events
    if (event.type === 'APP') {
      aggregates.web_visit_count++;
      const url = event.resource || '';
      if (url.includes('analytics-tracker') || url.includes('ad-serve') || 
          url.includes('metrics-collector') || url.includes('cdn-content-delivery')) {
        aggregates.suspicious_domain_count++;
      }
    }
    
    // DEVICE (USB) events
    if (event.type === 'DEVICE') {
      if (event.action === 'Connect') {
        aggregates.usb_connect_count++;
      }
    }
    
    // NET events
    if (event.type === 'NET') {
      const bytesOutVal = event.size || (event.raw && event.raw.bytes_out) || 0;
      const bytesInVal = event.raw && event.raw.bytes_in || 0;
      
      bytesOut.push(bytesOutVal);
      bytesIn.push(bytesInVal);
      
      aggregates.total_bytes_out += bytesOutVal;
      aggregates.total_bytes_in += bytesInVal;
      
      // Large upload (>500KB = 500000 bytes)
      if (bytesOutVal > 500000) {
        aggregates.large_upload_count++;
      }
      
      // Lateral movement (RDP, SMB protocols or internal IP connections)
      const protocol = event.raw && event.raw.protocol;
      if (protocol === 'RDP' || protocol === 'SMB') {
        aggregates.lateral_movement_count++;
      } else if (event.dst_ip && event.dst_ip.startsWith('192.168.')) {
        aggregates.lateral_movement_count++;
      }
    }
    
    // ENDPOINT events
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
  
  // Calculate averages and maxes
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
    
    // GET RECENT EVENTS FOR THIS USER (last 24 hours) to build aggregates
    const now = new Date(eventData.ts || Date.now());
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = await Event.find({
      user: eventData.user,
      ts: { $gte: oneDayAgo, $lte: now }
    }).sort({ ts: 1 }).lean();
    
    // BUILD AGGREGATE FEATURES from recent events
    const aggregates = aggregateFeatures(recentEvents, event);
    
    // BUILD RECENT SEQUENCE (last 15 events for Markov model)
    const sequence = buildEventSequence(recentEvents);
    
    // GET USER INFO for known devices
    const user = await User.findOne({ _id: eventData.user });
    const knownDevices = user ? (user.devices || []) : [];
    const isNewDevice = eventData.device && !knownDevices.includes(eventData.device);
    
    // PREPARE ML PAYLOAD with all required features
    const mlPayload = {
      ...eventData,
      ...aggregates,
      recent_sequence: sequence,
      ts: (eventData.ts ? new Date(eventData.ts) : new Date()).toISOString(),
      is_new_device: isNewDevice,
      known_devices: knownDevices,
      // Ensure numeric features are numbers, not strings
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
    
    // Call ML service with enriched payload
    const mlResult = await mlService.analyze(mlPayload, eventData.user);
    
    if (mlResult) {
      event.risk_score = mlResult.risk_score;
      event.severity = mlResult.severity;
      await event.save();
      
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
        
        // Recalculate user's overall risk score from recent alerts (not just this event)
        const recentAlerts = await Alert.find({
          user: event.user
        })
          .sort({ created_at: -1 })
          .limit(50)
          .lean();
        
        let calculatedRisk = mlResult.risk_score; // Start with current event's risk
        
        if (recentAlerts.length > 0) {
          // Calculate key metrics
          const maxRisk = Math.max(...recentAlerts.map(a => a.risk_score));
          const avgRisk = recentAlerts.reduce((sum, a) => sum + a.risk_score, 0) / recentAlerts.length;
          
          // Get weighted average
          let weightedSum = 0;
          let totalWeight = 0;
          recentAlerts.forEach((alert, index) => {
            const recencyWeight = 1 / (index + 1);
            const riskWeight = alert.risk_score >= 0.7 ? 1.5 : 1.0;
            const combinedWeight = recencyWeight * riskWeight;
            weightedSum += alert.risk_score * combinedWeight;
            totalWeight += combinedWeight;
          });
          const weightedAvg = weightedSum / totalWeight;
          
          // Base calculation on average alert risk (same logic as recalculation script)
          if (avgRisk >= 0.85) {
            calculatedRisk = avgRisk * 0.60 + maxRisk * 0.25 + weightedAvg * 0.15;
            calculatedRisk = Math.max(0.75, calculatedRisk);
          } else if (avgRisk >= 0.75) {
            calculatedRisk = avgRisk * 0.50 + maxRisk * 0.30 + weightedAvg * 0.20;
            calculatedRisk = Math.max(0.65, calculatedRisk);
          } else if (avgRisk >= 0.60) {
            calculatedRisk = avgRisk * 0.45 + maxRisk * 0.35 + weightedAvg * 0.20;
            calculatedRisk = Math.max(0.50, calculatedRisk);
          } else {
            calculatedRisk = weightedAvg * 0.50 + maxRisk * 0.30 + avgRisk * 0.20;
          }
          
          // Only blend with historical for lower-risk users
          if (avgRisk < 0.60) {
            const allAlerts = await Alert.find({ user: event.user }).lean();
            if (allAlerts.length > 10) {
              const historicalAvg = allAlerts.reduce((sum, a) => sum + a.risk_score, 0) / allAlerts.length;
              calculatedRisk = calculatedRisk * 0.75 + historicalAvg * 0.25;
            }
          }
        }
        
        // Ensure risk is between 0 and 1
        calculatedRisk = Math.max(0, Math.min(1, calculatedRisk));
        
        await User.findOneAndUpdate(
          { _id: event.user },
          {
            $set: { 
              last_seen: event.ts,
              current_risk: calculatedRisk
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
    } else {
      event.risk_score = 0;
      event.severity = 'low';
      await event.save();
    }
    
    res.status(201).json({ 
      success: true, 
      event_id: event._id, 
      ml_result: mlResult 
    });
  } catch (err) {
    next(err);
  }
});

router.post('/analyze', async (req, res, next) => {
  try {
    const { event, user_id } = req.body;
    
    // If event doesn't have aggregates, fetch recent events and compute them
    if (!event.logon_count && !event.recent_sequence) {
      const now = new Date(event.ts || Date.now());
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentEvents = await Event.find({
        user: user_id,
        ts: { $gte: oneDayAgo, $lte: now }
      }).sort({ ts: 1 }).lean();
      
      const aggregates = aggregateFeatures(recentEvents, event);
      const sequence = buildEventSequence(recentEvents);
      
      event.logon_count = aggregates.logon_count;
      event.recent_sequence = sequence;
      // Add other aggregates as needed
      Object.assign(event, aggregates);
    }
    
    const result = await mlService.analyze(event, user_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;