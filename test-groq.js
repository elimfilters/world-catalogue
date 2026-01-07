require("dotenv").config();
const groqService = require("./services/groq.service");

async function testGroq() {
  console.log("🧪 Testing GROQ Classification...\n");
  
  // Test 1: Heavy Duty
  console.log("1️⃣ Testing Donaldson P551329 (Heavy Duty Oil Filter)");
  const result1 = await groqService.classifyFilter(
    "P551329",
    "Donaldson Oil Filter for Heavy Duty Trucks",
    { brand: "Donaldson", application: "Heavy Duty" }
  );
  console.log(JSON.stringify(result1, null, 2));
  
  console.log("\n2️⃣ Testing FRAM PH8A (Light Duty Oil Filter)");
  const result2 = await groqService.classifyFilter(
    "PH8A",
    "FRAM Oil Filter for Passenger Cars",
    { brand: "FRAM", application: "Automotive" }
  );
  console.log(JSON.stringify(result2, null, 2));
  
  console.log("\n3️⃣ Testing Sierra 18-7944 (Marine Oil Filter)");
  const result3 = await groqService.classifyFilter(
    "18-7944",
    "Sierra Marine Oil Filter",
    { brand: "Sierra", application: "Marine" }
  );
  console.log(JSON.stringify(result3, null, 2));
  
  console.log("\n✅ GROQ Test completed!");
}

testGroq().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
