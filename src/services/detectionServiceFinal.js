// src/services/detectionService.js
// Orquestador principal de detección ELIMFILTERS
// Flujo: validar código → confirmar autoridad → facts → DUTY → FAMILIA → salida controlada

const prefixMap = require("../config/prefixMap");
const { scraperBridge } = require("../scrapers/scraperBridge");

const dutyResolver = require("../resolvers/dutyResolver");
const familyResolver = require("../resolvers/familyResolver");

async function detectionService(inputCode = "") {
  // ===============================
  // 1) Validación de formato
  // ===============================
  const { valid, normalized, pattern } = prefixMap.validate(inputCode);

  if (!valid) {
    return {
      ok: false,
      stage: "FORMAT_VALIDATION",
      error: "Invalid code format",
      input: inputCode
    };
  }

  // ===============================
  // 2) Resolución de autoridad técnica
  // ===============================
  let authorityResult;
  try {
    authorityResult = await scraperBridge(normalized);
  } catch (e) {
    return {
      ok: false,
      stage: "AUTHORITY_RESOLUTION",
      error: "Authority resolution failed",
      detail: e.message
    };
  }

  if (!authorityResult || authorityResult.confirmed !== true) {
    return {
      ok: false,
      stage: "AUTHORITY_RESOLUTION",
      error: "No confirmed technical authority",
      code: normalized
    };
  }

  const { source: authority, facts } = authorityResult;

  if (!facts || typeof facts !== "object") {
    return {
      ok: false,
      stage: "FACTS_EXTRACTION",
      error: "No technical facts extracted",
      authority
    };
  }

  // ===============================
  // 3) Resolución de DUTY
  // ===============================
  const duty = dutyResolver(facts);

  if (!duty) {
    return {
      ok: false,
      stage: "DUTY_RESOLUTION",
      error: "DUTY not defined by authority evidence",
      authority
    };
  }

  // ===============================
  // 4) Resolución de FAMILIA
  // ===============================
  const family = familyResolver(facts);

  if (!family) {
    return {
      ok: false,
      stage: "FAMILY_RESOLUTION",
      error: "FAMILY not defined by authority evidence",
      authority,
      duty
    };
  }

  // ===============================
  // 5) Resultado válido (NO SKU aquí)
  // ===============================
  return {
    ok: true,
    code: normalized,
    pattern,
    authority,
    duty,
    family,
    facts
  };
}

module.exports = {
  detectionService
};
