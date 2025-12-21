// src/config/prefixMap.js
// Rol: validar si el código ENTRA al pipeline (forma), no decidir el producto.

module.exports = {
  normalize(code = "") {
    return String(code).trim().toUpperCase();
  },

  patterns: [
    { id: "ALPHA_NUM",       regex: /^[A-Z]{1,4}\d{2,6}$/ },
    { id: "ALPHA_SPACE_NUM", regex: /^[A-Z]{1,4}\s\d{2,6}$/ },
    { id: "ALPHA_DASH_NUM",  regex: /^[A-Z]{1,4}-\d{2,6}$/ },
    { id: "NUM_DASH_NUM",    regex: /^\d{2,4}-\d{3,6}$/ }
  ],

  validate(code) {
    const normalized = this.normalize(code);
    const match = this.patterns.find(p => p.regex.test(normalized));
    return {
      valid: Boolean(match),
      pattern: match ? match.id : null,
      normalized
    };
  }
};
