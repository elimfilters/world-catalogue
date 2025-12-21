function buildMarineSku({ authority, code, family }) {
  if (!code || !family) return null;

  const last4 = String(code).replace(/\D/g, '').slice(-4);
  if (last4.length !== 4) return null;

  const fam = String(family).toUpperCase();

  return `EM9-${fam}-${last4}`;
}
