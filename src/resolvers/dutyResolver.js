// src/resolvers/dutyResolver.js
// Define DUTY exclusivamente por dominio de aplicación confirmado
// por la autoridad técnica. No usa OEM, prefijos ni cross.

module.exports = function dutyResolver(facts = {}) {
  const text = [
    ...(facts.applications || []),
    ...(facts.categories || []),
    facts.domain || ""
  ].join(" ").toLowerCase();

  // LD – Vehicular ligero a gasolina
  if (/passenger|suv|pickup|light vehicle|gasoline/.test(text)) {
    return "LD";
  }

  // HD – Vehicular y maquinaria pesada diésel
  if (/truck|heavy|agricultural|mining|diesel|generator/.test(text)) {
    return "HD";
  }

  // MARINE – Aplicaciones marinas
  if (/marine|boat|vessel|on-board|racor/.test(text)) {
    return "MARINE";
  }

  // TURBINE – Separadores centrífugos tipo turbina
  if (/centrifugal|turbine separator/.test(text)) {
    return "TURBINE";
  }

  // INDUSTRIAL – Industrial fijo no vehicular
  if (/industrial|process|plant|stationary/.test(text)) {
    return "INDUSTRIAL";
  }

  return null; // Sin evidencia → no hay DUTY → no hay SKU
};
