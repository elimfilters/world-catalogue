// src/scrapers/sierraScraper.js
async function scrapeSierra(normalizedCode) {
  // Implementación mínima: confirmar formato + fuente
  // (cuando se conecte web/API, aquí se reemplaza)
  const ok = /^[0-9]{2}-[0-9]{3,6}$/.test(normalizedCode);
  if (!ok) return null;

  return {
    confirmed: true,
    source: 'SIERRA',
    facts: {
      authority: 'SIERRA',
      marine: true,
      code: normalizedCode
    }
  };
}

module.exports = { scrapeSierra };
