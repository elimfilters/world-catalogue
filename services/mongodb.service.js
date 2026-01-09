const { MongoClient } = require('mongodb');
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/?appName=Cluster0';
const DB_NAME = 'elimfilters';
const COLLECTION_NAME = 'filters';
let cachedClient = null;

async function getMongoClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

async function searchInMongo(code) {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.findOne({
      $or: [
        { originalCode: code.toUpperCase() },
        { 'skus.standard.sku': code.toUpperCase() },
        { 'skus.performance.sku': code.toUpperCase() },
        { 'skus.elite.sku': code.toUpperCase() }
      ]
    });
    return result ? { found: true, data: result } : { found: false };
  } catch (error) {
    console.error('Error en searchInMongo:', error.message);
    return { found: false, error: error.message };
  }
}

async function saveToMongo(data) {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const existing = await collection.findOne({ originalCode: data.originalCode });
    if (existing) {
      await collection.updateOne({ originalCode: data.originalCode }, { $set: { ...data, updatedAt: new Date() } });
      console.log(`✅ MongoDB: Actualizado ${data.originalCode}`);
    } else {
      await collection.insertOne(data);
      console.log(`✅ MongoDB: Insertado ${data.originalCode}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error en saveToMongo:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { searchInMongo, saveToMongo };
