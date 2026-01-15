// TEST DE TODAS LAS API KEYS
console.log("=== DIAGNOSTIC TEST ===");
console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? "EXISTS (" + process.env.GROQ_API_KEY.substring(0, 20) + "...)" : "MISSING");
console.log("GOOGLE_SHEETS_API_KEY:", process.env.GOOGLE_SHEETS_API_KEY ? "EXISTS (length: " + process.env.GOOGLE_SHEETS_API_KEY.length + ")" : "MISSING");
console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "MISSING");
console.log("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:", process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? "EXISTS (length: " + process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length + ")" : "MISSING");
console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID || "MISSING");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "EXISTS" : "MISSING");
console.log("====================");

// Disable Google Sheets
class GoogleSheetsService {
  async initialize() { return; }
  async searchFilterByCode() { return null; }
  async saveFilter() { return true; }
}
module.exports = new GoogleSheetsService();
