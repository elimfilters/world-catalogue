const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const DETECTION_PROMPT = `You are an expert filter classification system for ELIMFILTERS. Your task is to analyze filter codes and classify them accurately.

FILTER TYPES AND PREFIXES:
1. OIL filters → EO5 prefix
2. AIR filters → EA2 prefix  
3. FUEL filters → EF3 prefix
4. CABIN filters → EC1 prefix
5. HYDRAULIC filters → EH6 prefix
6. COOLANT filters → EW7 prefix
7. TRANSMISSION filters → ET8 prefix
8. AIR_DRYER filters → ED4 prefix
9. FUEL_SEPARATOR filters → ES9 prefix

DUTY TYPES:
- HD (Heavy Duty): Commercial vehicles, trucks, construction equipment
- LD (Light Duty): Passenger cars, light trucks, SUVs

CROSS-REFERENCE EXAMPLES:

EC1 (CABIN) Examples:
- AF55839 (Fleetguard) → P640110 (Donaldson) → EC10110
- CF10727 (FRAM) → stays CF10727 → EC10727
- 68079487AA (Mopar) → P640110 (Donaldson) → EC10110

ED4 (AIR DRYER) Examples:
- P781466 (Donaldson) → stays P781466 → ED41466
- 4324102227 (Wabco) → P781466 (Donaldson) → ED41466
- AD-IS-4324102202 (Generic) → P781466 (Donaldson) → ED41466

EH6 (HYDRAULIC) Examples:
- RE27284 (John Deere) → P566922 (Donaldson) → EH66922
- 84036444 (Case IH) → P566922 (Donaldson) → EH66922
- HF35360 (Fleetguard) → P566922 (Donaldson) → EH66922

EW7 (COOLANT) Examples:
- 24070 (Freightliner) → P554685 (Donaldson) → EW74685
- WF2075 (Wix) → P554685 (Donaldson) → EW74685
- 3823194C1 (Navistar) → P554685 (Donaldson) → EW74685

ES9 (FUEL SEPARATOR) Examples:
- 3935274 (Cummins) → P551329 (Donaldson) → ES91329
- FS19551 (Fleetguard) → P551329 (Donaldson) → ES91329
- 84278975 (Case IH) → P551329 (Donaldson) → ES91329

EA2 (AIR) Examples:
- 46588 (WIX) → P606120 (Donaldson) → EA26120
- CA10190 (FRAM) → P608666 (Donaldson) → EA28666
- AF27873 (Fleetguard) → P181059 (Donaldson) → EA21059

EO5 (OIL) Examples:
- 51516 (WIX) → P554005 (Donaldson) → EO54005
- PH3614 (FRAM) → P554005 (Donaldson) → EO54005
- LF3000 (Fleetguard) → P554005 (Donaldson) → EO54005

EF3 (FUEL) Examples:
- 33525 (WIX) → P550440 (Donaldson) → EF30440
- FF5421 (Fleetguard) → P550440 (Donaldson) → EF30440
- TP1234 (Baldwin) → P550440 (Donaldson) → EF30440

DECISION RULES:
1. Analyze the filter code structure and cross-reference database
2. Identify the filter type based on code patterns and specifications
3. Determine duty type (HD for commercial/industrial, LD for passenger vehicles)
4. DO NOT generate SKU - only classify type and duty
5. Return ONLY the JSON response

Analyze this filter code and respond with ONLY this JSON format (no explanation):
{
  "filterType": "TYPE",
  "dutyType": "HD or LD"
}`;

async function detectFilterWithGroq(filterCode) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: DETECTION_PROMPT
        },
        {
          role: 'user',
          content: `Filter code: ${filterCode}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Empty response from Groq');
    }

    const result = JSON.parse(response);
    
    if (!result.filterType || !result.dutyType) {
      throw new Error('Invalid response structure from Groq');
    }

    return {
      filterType: result.filterType,
      dutyType: result.dutyType,
      confidence: 'high',
      source: 'groq-llama-3.3-70b'
    };

  } catch (error) {
    console.error('Groq detection error:', error);
    throw new Error(`Groq AI detection failed: ${error.message}`);
  }
}

module.exports = { detectFilterWithGroq };
