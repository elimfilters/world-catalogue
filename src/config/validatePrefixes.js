const PREFIXES = require("./prefixes");

function validatePrefixes() {
  const expected = [
    "EL8", "EF9", "EA1", "EC1",
    "ET9", "EH6", "ES9", "EW7",
    "EA2", "EM9", "EK3", "EK5"
  ];

  const found = Object.values(PREFIXES);

  for (const pref of expected) {
    if (!found.includes(pref)) {
      throw new Error(`
===========================================================
ERROR CRÍTICO EN PREFIJOS OFICIALES ELIMFILTERS
SE DETECTÓ UNA ALTERACIÓN ILEGAL EN EL PREFIJO: ${pref}

El servidor ha sido BLOQUEADO para proteger el sistema.
Contacte al CEO de ELIMFILTERS para proceder.
===========================================================
      `);
    }
  }
}

module.exports = validatePrefixes;