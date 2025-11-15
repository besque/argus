const axios = require('axios');

const ML_URL = process.env.ML_URL;
const ML_OCEAN_URL = process.env.ML_OCEAN_URL;

const analyze = async (event, userId) => {
  try {
    const response = await axios.post(ML_URL, event, { timeout: 5000 });
    return response.data;
  } catch (err) {
    console.error('ML service error:', err.message);
    throw new Error('ML analysis failed');
  }
};

const getUserOcean = async (userId) => {
  try {
    const response = await axios.get(`${ML_OCEAN_URL}/${userId}`, { timeout: 3000 });
    return response.data;
  } catch (err) {
    console.error(`OCEAN fetch error for user ${userId}:`, err.message);
    if (err.response) {
      console.error(`  Response status: ${err.response.status}`);
      console.error(`  Response data:`, err.response.data);
    }
    return null;
  }
};

module.exports = { analyze, getUserOcean };