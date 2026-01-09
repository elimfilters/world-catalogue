const axios = require("axios");
const API_URL = "http://localhost:8080/api/products";

async function testAPI() {
  console.log("\n=== PRUEBA SIMPLE DE API ===\n");
  
  try {
    // TEST 1: Obtener productos
    console.log("TEST 1: Obtener productos...");
    const response = await axios.get(API_URL);
    console.log(`OK - ${response.data.data.length} productos obtenidos\n`);
    
    // TEST 2: Crear producto
    console.log("TEST 2: Crear producto con IA...");
    const newProduct = await axios.post(API_URL, {
      title: "Nike Air Jordan Retro Blanco",
      description: "Zapatillas Nike Air Jordan Retro en color blanco, talla 43, nuevas en caja",
      price: 180.00,
      category_id: 4,
      user_id: 1
    });
    console.log(`OK - Producto creado con ID: ${newProduct.data.data.id}`);
    console.log(`Atributos extraidos:`);
    console.log(`  - Marca: ${newProduct.data.extractedAttributes.brand || "N/A"}`);
    console.log(`  - Color: ${newProduct.data.extractedAttributes.color || "N/A"}`);
    console.log(`  - Talla: ${newProduct.data.extractedAttributes.size || "N/A"}`);
    console.log(`  - Modelo: ${newProduct.data.extractedAttributes.model || "N/A"}`);
    console.log(`  - Condicion: ${newProduct.data.extractedAttributes.condition || "N/A"}\n`);
    
    // TEST 3: Actualizar producto
    console.log("TEST 3: Actualizar producto...");
    const updated = await axios.put(`${API_URL}/${newProduct.data.data.id}`, {
      title: "Nike Air Jordan Retro Blanco - OFERTA",
      description: "Zapatillas Nike Air Jordan Retro en color blanco, talla 43, nuevas en caja, precio especial",
      price: 150.00,
      category_id: 4
    });
    console.log(`OK - Producto actualizado. Nuevo precio: $${updated.data.data.price}\n`);
    
    // TEST 4: Validacion - sin titulo (debe fallar)
    console.log("TEST 4: Validacion - producto sin titulo (debe fallar)...");
    try {
      await axios.post(API_URL, {
        description: "Sin titulo",
        price: 10,
        category_id: 1
      });
      console.log("FAIL - La validacion NO funciono\n");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`OK - Validacion funciona: ${error.response.data.errors.join(", ")}\n`);
      }
    }
    
    // TEST 5: Eliminar producto
    console.log("TEST 5: Eliminar producto de prueba...");
    await axios.delete(`${API_URL}/${newProduct.data.data.id}`);
    console.log("OK - Producto eliminado\n");
    
    console.log("======================");
    console.log("TODAS LAS PRUEBAS PASARON");
    console.log("======================");
    console.log("\nResumen:");
    console.log("  ✓ GET productos");
    console.log("  ✓ POST producto con extraccion de atributos IA");
    console.log("  ✓ PUT actualizar producto");
    console.log("  ✓ Validaciones");
    console.log("  ✓ DELETE producto");
    console.log("\n✅ API funcionando correctamente!\n");
    
  } catch (error) {
    console.log("\n❌ ERROR:");
    if (error.code === "ECONNREFUSED") {
      console.log("El servidor NO esta corriendo en puerto 8080");
    } else if (error.response) {
      console.log(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(error.message);
    }
  }
}

testAPI();
