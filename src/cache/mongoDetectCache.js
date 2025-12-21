const { MongoClient } = require('mongodb');

let client, col;

async function getCol() {
  if (col) return col;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  col = client.db(process.env.MONGODB_DB).collection('detect_cache');
  return col;
}

async function get(key) {
  const c = await getCol();
  return c.findOne({ key });
}

async function set({ key, normalized_query, response, source, ttl_seconds }) {
  const c = await getCol();
  const expires_at = new Date(Date.now() + ttl_seconds * 1000);
  await c.updateOne(
    { key },
    { $set: { key, normalized_query, response, source, ttl_seconds, expires_at } },
    { upsert: true }
  );
}

module.exports = { get, set };
