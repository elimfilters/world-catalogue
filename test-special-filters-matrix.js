require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// TEST CASES
const TEST_CASES = [
  // EC1 Cabin
  { code: 'AF55839', expected: 'EC1', duty: 'HD', description: 'Cabin air filter HD' },
  { code: 'CF10727', expected: 'EC1', duty: 'LD', description: 'Cabin air filter LD' },
  
  // ED4 Air Dryer
  { code: 'P781466', expected: 'ED4', duty: 'HD', description: 'Air dryer filter' },
  
  // EH6 Hydraulic
  { code: 'RE27284', expected: 'EH6', duty: 'HD', description: 'Hydraulic filter' },
  
  // EW7 Coolant/Water
  { code: 'W345678', expected: 'EW7', duty: 'HD', description: 'Coolant filter' },
  { code: '24070', expected: 'EW7', duty: 'HD', description: 'Coolant filter' },
  
  // ES9 Fuel Separator
  { code: '3935274', expected: 'ES9', duty: 'HD', description: 'Fuel separator' }
];

// ESTRATEGIAS
const STRATEGIES = {
  pattern_based: (code) => `
CLASSIFY: ${code}

SPECIAL FILTER PATTERNS:
- AF/CF prefix -> EC1 (Cabin Air)
- P78xxxx -> ED4 (Air Dryer)
- RE27xxx -> EH6 (Hydraulic)
- W/24070 -> EW7 (Coolant/Water)
- 393xxxx -> ES9 (Fuel Separator)

JSON only:
{"filterType": "...", "elimfiltersPrefix": "EC1/ED4/EH6/EW7/ES9", "duty": "HD/LD"}
  `,

  examples_based: (code) => `
CLASSIFY: ${code}

EXAMPLES:
AF55839 -> EC1 HD (cabin air)
CF10727 -> EC1 LD (cabin air)
P781466 -> ED4 HD (air dryer)
RE27284 -> EH6 HD (hydraulic)
W345678 -> EW7 HD (coolant)
24070 -> EW7 HD (coolant)
3935274 -> ES9 HD (fuel separator)

JSON only:
{"filterType": "...", "elimfiltersPrefix": "...", "duty": "..."}
  `,

  keywords: (code) => `
CLASSIFY: ${code}

KEYWORDS:
- cabin, air cabin -> EC1
- dryer, air dryer -> ED4
- hydraulic, hydro -> EH6
- coolant, water -> EW7
- separator, fuel separator -> ES9

JSON only:
{"filterType": "...", "elimfiltersPrefix": "...", "duty": "..."}
  `,

  combined: (code) => `
CLASSIFY: ${code}

SPECIAL FILTERS:
1. AF/CF prefix -> EC1 (Cabin Air, HD/LD)
2. P781xxx -> ED4 (Air Dryer, HD only)
3. RE27xxx -> EH6 (Hydraulic, HD only)
4. W34xxxx or 24070 -> EW7 (Coolant, HD only)
5. 393xxxx -> ES9 (Fuel Separator, HD only)

EXAMPLES:
AF55839 -> EC1 HD
CF10727 -> EC1 LD
P781466 -> ED4 HD
RE27284 -> EH6 HD
24070 -> EW7 HD
3935274 -> ES9 HD

JSON only:
{"filterType": "CABIN/AIR/HYDRAULIC/COOLANT/FUEL", "elimfiltersPrefix": "EC1/ED4/EH6/EW7/ES9", "duty": "HD/LD"}
  `
};

async function testStrategy(strategyName, promptBuilder) {
  console.log('\n🧪 Testing: ' + strategyName);
  const results = [];

  for (const test of TEST_CASES) {
    try {
      const prompt = promptBuilder(test.code);

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 500
      });

      const content = completion.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const success = result.elimfiltersPrefix === test.expected;
      results.push({
        code: test.code,
        expected: test.expected,
        got: result.elimfiltersPrefix || 'N/A',
        duty: result.duty || 'N/A',
        success: success ? '✅' : '❌',
        description: test.description
      });

    } catch (error) {
      results.push({
        code: test.code,
        expected: test.expected,
        got: 'ERROR',
        duty: 'N/A',
        success: '❌',
        description: error.message
      });
    }
  }

  return results;
}

async function runMatrix() {
  console.log('📊 SPECIAL FILTERS CLASSIFICATION MATRIX');
  console.log('=========================================\n');

  const allResults = {};

  for (const [name, builder] of Object.entries(STRATEGIES)) {
    const results = await testStrategy(name, builder);
    allResults[name] = results;

    const successCount = results.filter(r => r.success === '✅').length;
    const accuracy = ((successCount / results.length) * 100).toFixed(1);

    console.log('\nResults for ' + name + ':');
    console.table(results);
    console.log('Accuracy: ' + accuracy + '% (' + successCount + '/' + results.length + ')');
  }

  const scores = Object.entries(allResults).map(([name, results]) => ({
    strategy: name,
    score: results.filter(r => r.success === '✅').length,
    total: results.length
  }));

  scores.sort((a, b) => b.score - a.score);

  console.log('\n🏆 RANKING:');
  console.table(scores);

  const winner = scores[0];
  console.log('\n✅ BEST STRATEGY: ' + winner.strategy);
  console.log('📊 Accuracy: ' + ((winner.score / winner.total) * 100).toFixed(1) + '%');

  return winner.strategy;
}

runMatrix().catch(console.error);
