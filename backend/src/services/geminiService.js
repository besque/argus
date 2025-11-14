const axios = require('axios');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const generateSummary = async (userData) => {
  const { user, role, eventCounts, currentRisk, topAlerts, oceanVector } = userData;
  
  const prompt = `Provide a 2-3 sentence non-judgmental summary of this user's recent behavior for SOC analysts.
Data: user=${user}, role=${role}, last_7_days_events=${JSON.stringify(eventCounts)}, current_risk=${currentRisk}, top_alerts=${JSON.stringify(topAlerts)}, ocean_vector=${JSON.stringify(oceanVector)}.
Output: short paragraph + 3 bullet recommended actions.`;

  try {
    const response = await axios.post(
      `${GEMINI_URL}?key=${GEMINI_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      { timeout: 10000 }
    );
    
    return response.data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error('Gemini API error:', err.message);
    throw new Error('AI summary generation failed');
  }
};

module.exports = { generateSummary };