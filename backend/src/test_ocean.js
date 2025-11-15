require('dotenv').config();
const mlService = require('./services/mlService');

async function testOcean() {
  try {
    // Test with a user ID from the CSV
    console.log('Testing OCEAN fetch for U0000...');
    const result = await mlService.getUserOcean('U0000');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result && result.ocean_vector) {
      console.log('\n✅ OCEAN data fetched successfully!');
      console.log('OCEAN Vector:', result.ocean_vector);
    } else if (result && result.user_id) {
      console.log('\n✅ Response received but ocean_vector might be missing');
      console.log('Full response:', result);
    } else {
      console.log('\n❌ No OCEAN data returned');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testOcean();

