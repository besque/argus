const Redis = require('ioredis');

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

const get = async (key) => {
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.error('Cache get error:', err.message);
    return null;
  }
};

const set = async (key, value, ttl = 10) => {
  if (!redis) return;
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error('Cache set error:', err.message);
  }
};

const del = async (key) => {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error('Cache del error:', err.message);
  }
};

module.exports = { get, set, del };