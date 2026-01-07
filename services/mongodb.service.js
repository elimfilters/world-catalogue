const { MongoClient } = require("mongodb");

class MongoDBService {
  constructor() {
    this.uri = process.env.MONGODB_URI || "mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/?appName=Cluster0";
    this.client = null;
    this.db = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return true;

    try {
      console.log("🍃 Conectando a MongoDB...");
      
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      
      this.db = this.client.db("elimfilters");
      this.connected = true;
      
      console.log("✅ MongoDB conectado");
      return true;
      
    } catch (error) {
      console.error("❌ Error conectando MongoDB:", error.message);
      this.connected = false;
      return false;
    }
  }

  async searchCode(code) {
    console.log(`🍃 [MONGODB] Buscando: ${code}`);
    
    try {
      if (!this.connected) {
        await this.connect();
      }

      if (!this.connected) {
        console.log("   ⚠️  MongoDB no disponible");
        return null;
      }

      const collection = this.db.collection("filters");
      const searchCode = code.toUpperCase().trim();
      
      const result = await collection.findOne({
        $or: [
          { sku: searchCode },
          { "oem_codes.code": searchCode },
          { "cross_reference_codes.code": searchCode }
        ]
      });

      if (result) {
        console.log(`   ✅ Encontrado en MongoDB`);
        return {
          source: "MONGODB",
          collection: "filters",
          data: result
        };
      }

      console.log("   ℹ️  Código no encontrado en MongoDB");
      return null;
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return null;
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.connected = false;
      console.log("🍃 MongoDB desconectado");
    }
  }
}

module.exports = new MongoDBService();
