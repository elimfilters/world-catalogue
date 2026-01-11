const Groq = require('groq-sdk');
const FilterClassification = require('../models/FilterClassification');

class ClassifierService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.patterns = {
      donaldson: /^P\d{6}$/,
      cummins: /^\d{7}$/,
      fleetguard: /^(FF|FS|LF|AF|WF|HF)\d{4,5}$/,
      fram: /^(PH|CA|G|C)\d{4,5}$/,
      wix: /^\d{5}$/
    };
  }

  async classifyFilter(filterCode) {
    try {
      // Check cache first
      const cached = await FilterClassification.findOne({ filterCode });
      if (cached) {
        return {
          manufacturer: cached.manufacturer,
          tier: cached.tier,
          duty: cached.duty,
          region: cached.region,
          confidence: cached.confidence,
          method: cached.method,
          cached: true
        };
      }

      // Pattern matching
      const classification = this.patternMatch(filterCode);
      
      // Save to cache
      await FilterClassification.create({
        filterCode,
        ...classification
      });

      return { ...classification, cached: false };
    } catch (error) {
      console.error('Classification error:', error);
      throw error;
    }
  }

  patternMatch(filterCode) {
    if (this.patterns.donaldson.test(filterCode)) {
      return {
        manufacturer: 'Donaldson',
        tier: 'AFTERMARKET',
        duty: 'HEAVY DUTY (HD)',
        region: 'NORTH AMERICA',
        confidence: 'HIGH',
        method: 'PATTERN_MATCH'
      };
    }

    if (this.patterns.cummins.test(filterCode)) {
      return {
        manufacturer: 'Cummins',
        tier: 'TIER 1 - OEM',
        duty: 'HEAVY DUTY (HD)',
        region: 'NORTH AMERICA',
        confidence: 'HIGH',
        method: 'PATTERN_MATCH'
      };
    }

    if (this.patterns.fleetguard.test(filterCode)) {
      return {
        manufacturer: 'Fleetguard',
        tier: 'TIER 1 - OEM',
        duty: 'HEAVY DUTY (HD)',
        region: 'NORTH AMERICA',
        confidence: 'HIGH',
        method: 'PATTERN_MATCH'
      };
    }

    if (this.patterns.fram.test(filterCode)) {
      return {
        manufacturer: 'FRAM',
        tier: 'AFTERMARKET',
        duty: 'LIGHT DUTY (LD)',
        region: 'NORTH AMERICA',
        confidence: 'HIGH',
        method: 'PATTERN_MATCH'
      };
    }

    if (this.patterns.wix.test(filterCode)) {
      return {
        manufacturer: 'WIX',
        tier: 'AFTERMARKET',
        duty: 'LIGHT DUTY (LD)',
        region: 'NORTH AMERICA',
        confidence: 'MEDIUM',
        method: 'PATTERN_MATCH'
      };
    }

    return {
      manufacturer: 'UNKNOWN',
      tier: 'UNKNOWN',
      duty: 'UNKNOWN',
      region: 'UNKNOWN',
      confidence: 'LOW',
      method: 'NO_MATCH'
    };
  }
}

module.exports = new ClassifierService();
