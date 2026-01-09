require("dotenv").config();
const axios = require("axios");

const API_URL = "http://localhost:8080/api/products";

async function testRealProduct() {
  console.log("\n=== PRUEBA CON PRODUCTO REAL: 1R1808 ===\n");
  
  try {
    // Crear producto con información real
    console.log("Creando producto 1R1808...\n");
    
    const response = await axios.post(API_URL, {
      title: "Filtro Caterpillar 1R1808 ",
      description: "Filtro hidraulico Caterpillar 1R1808, compatible con maquinaria pesada CAT, alta eficiencia, nuevo en caja original",
      price: 45.99,
      category_id: 1,
      user_id: 1
    });
    
    console.log("PRODUCTO CREADO:");
    console.log("================");
    console.log(`ID: ${response.data.data.id}`);
    console.log(`Titulo: ${response.data.data.title}`);
    console.log(`Precio: $${response.data.data.price}`);
    console.log(`\nATRIBUTOS EXTRAIDOS POR LA IA:`);
    console.log("==============================");
    console.log(`Marca:     ${response.data.extractedAttributes.brand || "N/A"}`);
    console.log(`Modelo:    ${response.data.extractedAttributes.model || "N/A"}`);
    console.log(`Color:     ${response.data.extractedAttributes.color || "N/A"}`);
    console.log(`Material:  ${response.data.extractedAttributes.material || "N/A"}`);
    console.log(`Condicion: ${response.data.extractedAttributes.condition || "N/A"}`);
    console.log(`\nPRODUCTO COMPLETO:`);
    console.log(JSON.stringify(response.data.data, null, 2));
    
    // Listar todos los productos
    console.log("\n\nLISTADO DE PRODUCTOS:");
    console.log("=====================");
    const allProducts = await axios.get(API_URL);
    allProducts.data.data.forEach((p, index) => {
      console.log(`${index + 1}. ${p.title} - $${p.price} [${p.brand || "Sin marca"}]`);
    });
    
  } catch (error) {
    console.log("\nERROR:");
    if (error.response) {
      console.log(`HTTP ${error.response.status}:`, error.response.data);
    } else {
      console.log(error.message);
    }
  }
}

testRealProduct();
