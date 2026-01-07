require("dotenv").config();
const groqService = require("../services/groq.service");

const tests = [
  { code: "P551329", desc: "Donaldson Oil", expected: "HEAVY_DUTY" },
  { code: "PH8A", desc: "FRAM Oil", expected: "LIGHT_DUTY" },
  { code: "18-7944", desc: "Sierra Marine", expected: "MARINE" }
];

async function run() {
  console.log("🧪 GROQ Test Suite\n");
  for (const test of tests) {
    const result = await groqService.classifyFilter(test.code, test.desc);
    console.log(`${result.category === test.expected ? "✅" : "❌"} ${test.code}: ${result.category}`);
  }
}
run();
