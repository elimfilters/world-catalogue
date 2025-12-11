/**
 * ================================================================
 * WARNING — IMMUTABLE CONTRACT
 * ------------------------------------------------
 * This file does NOT generate ELIMFILTERS prefixes.
 *
 * Prefix generation is 100% controlled ONLY by:
 *   /src/config/prefixes.js        (immutable)
 *   /src/sku/generator.js          (immutable)
 *
 * Any attempt to derive EA1 / EL8 / EF9 / EC1 / EK3 / EK5 / EM9 / ET9
 * from OEM prefix rules MUST be blocked.
 *
 * This module ONLY describes OEM → Family/Duty inferences,
 * NEVER ELIMFILTERS SKUs.
 * ================================================================
 */

module.exports = {
  rules: [
    {
      match: /^PH\d{3,5}[A-Z]?$/,
      family: 'OIL',
      duty: 'LD',
      brand: 'FRAM'
    },
    {
      match: /^TG\d{3,5}[A-Z]?$/,
      family: 'OIL',
      duty: 'LD',
      brand: 'FRAM'
    },
    {
      match: /^XG\d{3,5}[A-Z]?$/,
      family: 'OIL',
      duty: 'LD',
      brand: 'FRAM'
    },
    {
      match: /^CA\d{3,5}[A-Z]?$/,
      family: 'AIRE',
      duty: 'LD',
      brand: 'FRAM'
    },
    {
      match: /^CF\d{3,5}[A-Z]?$/,
      family: 'CABIN',
      duty: 'LD',
      brand: 'FRAM'
    },
    {
      match: /^CH\d{3,5}[A-Z]?$/,
      family: 'CABIN',
      duty: 'LD',
      brand: 'FRAM'
    },

    // Donaldson P-series (HD)
    {
      match: /^P55\d{4}[A-Z]?$/,
      family: 'OIL',
      duty: 'HD',
      brand: 'DONALDSON'
    },
    {
      match: /^P60\d{4}[A-Z]?$/,
      family: 'COOLANT',
      duty: 'HD',
      brand: 'DONALDSON'
    },

    // Baldwin
    {
      match: /^BF\d{3,5}[A-Z]?$/,
      family: 'FUEL',
      duty: 'HD',
      brand: 'BALDWIN'
    },
    {
      match: /^LF\d{3,5}[A-Z]?$/,
      family: 'OIL',
      duty: 'HD',
      brand: 'BALDWIN'
    },

    // Fleetguard
    {
      match: /^FF\d{3,5}[A-Z]?$/,
      family: 'FUEL',
      duty: 'HD',
      brand: 'FLEETGUARD'
    },
    {
      match: /^LF\d{3,5}[A-Z]?$/,
      family: 'OIL',
      duty: 'HD',
      brand: 'FLEETGUARD'
    },
    {
      match: /^AF\d{3,5}[A-Z]?$/,
      family: 'AIRE',
      duty: 'HD',
      brand: 'FLEETGUARD'
    },

    // Parker/Racor Marine & HD separators
    {
      match: /^R90T$/,
      family: 'FUEL',
      duty: 'HD',
      brand: 'PARKER'
    },
    {
      match: /^R(12|15|20|25|45|60|120)(T|S)$/,
      family: 'FUEL',
      duty: 'HD',
      brand: 'PARKER'
    }
  ]
};