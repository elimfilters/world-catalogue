require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// TEST CASES: Housing/Carcasa codes
const EA2_TEST_CASES = [
  { code: 'G082527', expected: 'EA2', manufacturer: 'Donaldson', description: 'Complete housing assembly' },
  { code: 'G082525', expected: 'EA2', manufacturer: 'Donaldson', description: 'Complete housing assembly' },
  { code: 'RE504836', expected: 'EA2', manufacturer: 'John Deere', description: 'Housing assembly' },
  { code: 'RE63660', expected: 'EA2', manufacturer: 'John Deere', description: 'Housing assembly' },
  { code: 'P534048', expected: 'EA2', manufacturer: 'Donaldson', description: 'Cover assembly' },
  { code: 'P828889', expected: 'EA1', manufacturer: 'Donaldson', description: 'Primary filter (NOT housing)' },
  { code: 'P829333', expected: 'EA1', manufacturer: 'Donaldson', description: 'Safety filter (NOT housing)' }
];

// ESTRATEGIAS DE PROMPT
const STRATEGIES = {
  pattern_only: (code) => `
CLASSIFY: ${code}

HOUSING PATTERNS:
- G0xxxxx (Donaldson housing)
- RExxxxxx (John Deere housing)  
- P5xxxxx (Donaldson cover)

If matches housing pattern -> EA2
Otherwise -> Classify normally (HD/LD)

JSON only:
{"filterType": "AIR", "elimfiltersPrefix": "EA2", "duty": "HD"}
  `,

  keyword_detection: (code) => `
CLASSIFY: ${code}

KEYWORDS: housing, assembly, complete, carcasa, bowl, canister

If code matches G0/RE/P5 patterns AND likely housing -> EA2
Otherwise -> Classify normally

JSON only:
{"filterType": "AIR", "elimfiltersPrefix": "EA2", "duty": "HD"}
  `,

  examples_based: (code) => `
CLASSIFY: ${code}

EA2 HOUSING EXAMPLES:
G082527 -> EA2 (housing assembly)
G082525 -> EA2 (housing assembly)
RE504836 -> EA2 (housing assembly)
P534048 -> EA2 (cover assembly)

NOT EA2 (regular filters):
P828889 -> EA1 (primary filter)
P829333 -> EA1 (safety filter)

JSON only:
{"filterType": "AIR", "elimfiltersPrefix": "EA2", "duty": "HD"}
  `,

  combined: (code) => `
CLASSIFY: ${code}

EA2 RULES:
1. Pattern: G0xxxxx, RExxxxxx, P5xxxxx
2. Keywords: housing, assembly, complete
3. Examples: G082527, RE504836, P534048

If ALL match -> EA2
If P8xxxxx (filter element) -> EA1
Otherwise -> HD/LD

JSON only:
{"filterType": "AIR", "elimfiltersPrefix": "EA2", "duty": "HD", "manufacturer": "Donaldson"}
  `
};

async function testStrategy(strategyName, promptBuilder) {
  console.log(`\n🧪 Testing: ${strategyName}`);
  const results = [];

  for (const test of EA2_TEST_CASES) {
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
        success: success ? '✅' : '❌',
        description: test.description
      });

    } catch (error) {
      results.push({
        code: test.code,
        expected: test.expected,
        got: 'ERROR',
        success: '❌',
        description: error.message
      });
    }
  }

  return results;
}

async function runEA2Matrix() {
  console.log('📊 EA2 HOUSING CLASSIFICATION MATRIX');
  console.log('=====================================\n');

  const allResults = {};

  for (const [name, builder] of Object.entries(STRATEGIES)) {
    const results = await testStrategy(name, builder);
    allResults[name] = results;

    const successCount = results.filter(r => r.success === '✅').length;
    const accuracy = ((successCount / results.length) * 100).toFixed(1);

    console.log(`\nResults for ${name}:`);
    console.table(results);
    console.log(`Accuracy: ${accuracy}% (${successCount}/${results.length})`);
  }

  // FIND BEST STRATEGY
  const scores = Object.entries(allResults).map(([name, results]) => ({
    strategy: name,
    score: results.filter(r => r.success === '✅').length,
    total: results.length
  }));

  scores.sort((a, b) => b.score - a.score);

  console.log('\n🏆 RANKING:');
  console.table(scores);

  const winner = scores[0];
  console.log(`\n✅ BEST STRATEGY: ${winner.strategy}`);
  console.log(`📊 Accuracy: ${((winner.score / winner.total) * 100).toFixed(1)}%`);

  return winner.strategy;
}

runEA2Matrix().catch(console.error);
