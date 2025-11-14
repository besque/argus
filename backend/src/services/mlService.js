const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL;

const analyze = async (event, userId) => {
  try {
    const response = await axios.post(`${ML_URL}/analyze`, {
      event,
      user_id: userId
    }, { timeout: 5000 });
    return response.data;
  } catch (err) {
    console.error('ML service error:', err.message);
    throw new Error('ML analysis failed');
  }
};

const getUserOcean = async (userId) => {
  try {
    const response = await axios.get(`${ML_URL}/user_ocean/${userId}`, { timeout: 3000 });
    return response.data;
  } catch (err) {
    console.error('OCEAN fetch error:', err.message);
    return null;
  }
};

module.exports = { analyze, getUserOcean };