function buildMarineSku({ code }) {
  if (!code) return null;

  const last4 = String(code).replace(/\D/g, '').slice(-4);
  if (last4.length !== 4) return null;

  return `EM9${last4}`;
}
