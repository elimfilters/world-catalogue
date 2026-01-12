/**
 * MARINE DETECTOR - Detecta fabricantes marinos para EM9
 */

const { MARINE_MANUFACTURERS } = require('../config/marineManufacturers');

function isMarineManufacturer(manufacturer) {
  if (!manufacturer) return false;
  
  const manufacturerUpper = manufacturer.toString().toUpperCase();
  
  return MARINE_MANUFACTURERS.some(marine => 
    manufacturerUpper.includes(marine.toUpperCase())
  );
}

function extractLast4Digits(code) {
  if (!code) return '0000';
  
  const cleanCode = code.toString().replace(/[^0-9A-Z]/gi, '');
  const last4 = cleanCode.slice(-4);
  
  return last4.padStart(4, '0');
}

function generateMarineSKU(code) {
  const last4 = extractLast4Digits(code);
  return 'EM9' + last4;
}

module.exports = {
  isMarineManufacturer,
  extractLast4Digits,
  generateMarineSKU
};
