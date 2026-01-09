require("dotenv").config();
const aiService = require("./services/aiService");

async function testAI() {
  console.log("\n=== PRUEBA DIRECTA DE IA ===\n");
  console.log("API Key configurada:", process.env.GROQ_API_KEY ? "SI" : "NO");
  console.log("");
  
  try {
    console.log("Extrayendo atributos...\n");
    
    const attributes = await aiService.extractAttributes(
      "Nike Air Max 270 Negro",
      "Zapatillas deportivas Nike en color negro, talla 42, nuevas",
      4
    );
    
    console.log("EXITO - Atributos extraidos:");
    console.log(JSON.stringify(attributes, null, 2));
    console.log("\nLA IA FUNCIONA PERFECTAMENTE!\n");
    
  } catch (error) {
    console.log("ERROR:", error.message);
  }
}

testAI();
