// Centralized SKU Policy Configuration
// Flags are read at runtime so the API enforces inviolable rules and allowed fallbacks.

function envBool(name, def = true) {
  const v = String(process.env[name] || '').trim().toLowerCase();
  if (!v) return !!def;
  return v === 'true' || v === '1' || v === 'yes';
}

const skuPolicyConfig = {
  // Core enforcement: block upsert if policy guard fails
  enforceInviolable: envBool('SKU_POLICY_ENFORCE', true),

  // "Aplica fallbacks permitidos y bloquea upsert si no cumplen política"
  allowOemFallbackByPrefix: envBool('ALLOW_OEM_FALLBACK_PREFIX', true),

  // "Intenta canonización LD vía FRAM"
  allowLdFramCanonization: envBool('ALLOW_LD_FRAM_CANONIZATION', true),

  // "Resuelve homologación HD a Donaldson para AF/RS"
  allowHdAfRsDonaldsonResolution: envBool('ALLOW_HD_AF_RS_DONALDSON', true),

  // "Audita Master y lista filas que requieren fallback OEM o equivalencia FRAM/Donaldson"
  auditMasterOnUpsert: envBool('AUDIT_MASTER_ON_UPSERT', false)
};

module.exports = {
  skuPolicyConfig
};