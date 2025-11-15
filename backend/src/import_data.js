require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Event = require('./models/Event');
const User = require('./models/User');

const CLEANED_DATA_PATH = path.join(__dirname, '../../cleaned_data');

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

async function importPsychometric() {
  const csv = fs.readFileSync(path.join(CLEANED_DATA_PATH, 'psychometric.csv'), 'utf8');
  const lines = csv.trim().split('\n');
  
  console.log('First line (headers):', lines[0]);
  console.log('Second line (sample):', lines[1]);
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const parts = parseCSVLine(lines[i]);
    
    const userId = parts[1];      // user_id column
    const empName = parts[0];     // employee_name column
    const roleVal = parts[4]; 
    
    await User.findOneAndUpdate(
      { _id: userId },
      {
        name: empName,
        role: roleVal,
        devices: [],
        current_risk: 0
      },
      { upsert: true }
    );
  }
  
  const userCount = await User.countDocuments();
  console.log(`${userCount} users imported`);
}

async function importEvents(filename, type) {
  const filePath = path.join(CLEANED_DATA_PATH, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`${filename} not found, skipping`);
    return;
  }
  
  const csv = fs.readFileSync(filePath, 'utf8');
  const lines = csv.trim().split('\n');
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  
  let saved = 0;
  const batchSize = 50;
  let batch = [];
  
  for (let i = 1; i < Math.min(lines.length, 501); i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });
    
    const dateField = row.date || row.timestamp;
    if (!dateField) continue;
    
    let ts;
    try {
      ts = new Date(dateField);
      if (isNaN(ts.getTime())) continue;
    } catch {
      continue;
    }
    
    const event = {
      ts: ts,
      user: row.user,
      type: type,
      action: row.activity || row.action || 'unknown',
      resource: row.filename || row.url || row.process || row.resource,
      src_ip: row.source_ip || row.src_ip,
      dst_ip: row.dst_ip,
      device: row.pc || row.device,
      size: parseInt(row.size || row.bytes_out || 0) || 0,
      risk_score: 0,
      severity: 'low',
      raw: row
    };
    
    batch.push(event);
    
    if (batch.length >= batchSize) {
      try {
        const result = await Event.insertMany(batch, { ordered: false });
        saved += result.length;
      } catch (err) {
        saved += batch.filter(e => e._id).length;
      }
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    try {
      const result = await Event.insertMany(batch, { ordered: false });
      saved += result.length;
    } catch (err) {
      saved += batch.filter(e => e._id).length;
    }
  }
  
  console.log(`${filename}: ${saved} events saved`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');
  
  await Event.deleteMany({});
  await User.deleteMany({});
  console.log('Cleared existing data\n');
  
  console.log('Importing users...');
  await importPsychometric();
  
  console.log('\nImporting events (500 per type)...');
  await importEvents('logon_cleaned.csv', 'AUTH');
  await importEvents('file_cleaned.csv', 'FILE');
  await importEvents('email_cleaned.csv', 'EMAIL');
  await importEvents('http_cleaned.csv', 'APP');
  await importEvents('device_cleaned.csv', 'DEVICE');
  await importEvents('endpoint_cleaned.csv', 'ENDPOINT');
  await importEvents('netflow_cleaned.csv', 'NET');
  await importEvents('firewall_cleaned.csv', 'FIREWALL');
  
  const totalEvents = await Event.countDocuments();
  const totalUsers = await User.countDocuments();
  
  console.log(`\nImport complete!`);
  console.log(`Total users: ${totalUsers}`);
  console.log(`Total events: ${totalEvents}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});