require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function classifyWithGroq(allCodes) {
  // Preparar lista de marcas únicas
  const uniqueBrands = [...new Set(allCodes.map(c => c.brand))];
  
  const prompt = `Classify these automotive filter manufacturers as either OEM or AFTERMARKET.

OEM = Original Equipment Manufacturers (car brands like Toyota, Ford, BMW, etc.)
AFTERMARKET = Aftermarket filter brands (like ACDelco, Purolator, WIX, etc.)

Brands to classify:
${uniqueBrands.join('\n')}

Respond ONLY with JSON in this format:
{
  "OEM": ["brand1", "brand2"],
  "AFTERMARKET": ["brand3", "brand4"]
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 2000
  });
  
  const classification = JSON.parse(response.choices[0].message.content);
  
  // Clasificar códigos
  const oemCodes = [];
  const aftermarketCodes = [];
  
  allCodes.forEach(item => {
    const code = item.brand + '|' + item.code;
    if (classification.OEM.includes(item.brand)) {
      oemCodes.push(code);
    } else {
      aftermarketCodes.push(code);
    }
  });
  
  return { oemCodes, aftermarketCodes, classification };
}

module.exports = { classifyWithGroq };

