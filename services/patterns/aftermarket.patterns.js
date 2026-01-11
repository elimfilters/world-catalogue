module.exports = {
  industry: 'Aftermarket',
  tiers: {
    tier1: ['Donaldson', 'Fleetguard', 'Baldwin'],
    tier2: ['MANN', 'MAHLE', 'FRAM', 'WIX'],
    tier3: ['Purolator', 'ACDelco', 'Bosch', 'Hastings', 'Parts Master', 'Champion', 'NAPA', 'Carquest']
  },
  manufacturers: [
    { name: 'Donaldson', tier: 1, aliases: ['Donaldson', 'DBL'], patterns: [/^P[0-9]{6}/i, /^B[0-9]{6}/i, /^ECC/i, /^DBL/i, /^X[0-9]{6}/i] },
    { name: 'Fleetguard', tier: 1, aliases: ['Fleetguard', 'Cummins Filtration'], patterns: [/^[A-Z]{2}[0-9]{4,5}/i, /^FF/i, /^LF/i, /^AF/i, /^FS/i, /^WF/i, /^HF/i] },
    { name: 'Baldwin', tier: 1, aliases: ['Baldwin Filters'], patterns: [/^[A-Z]{2}[0-9]{4,5}/i, /^BF/i, /^BT/i, /^PA/i, /^PT/i] },
    { name: 'MANN', tier: 2, aliases: ['MANN+HUMMEL', 'MANN Filter'], patterns: [/^[A-Z]{1,2}\s?[0-9]{3,4}/i, /^W[0-9]{3}/i, /^HU[0-9]{3}/i] },
    { name: 'MAHLE', tier: 2, aliases: ['MAHLE', 'Knecht'], patterns: [/^[A-Z]{2}\s?[0-9]{3,4}/i, /^OC[0-9]{3}/i, /^LX[0-9]{3}/i] },
    { name: 'FRAM', tier: 2, aliases: ['FRAM'], patterns: [/^[A-Z]{2,3}[0-9]{3,5}[A-Z]?$/i, /^PH/i, /^CA/i, /^CH/i, /^XG/i, /^CS/i, /^CF/i, /^G[0-9]{4}/i, /^P[0-9]{4}/i, /^C[0-9]{4}/i, /^F[0-9]{4}/i] },
    { name: 'WIX', tier: 2, aliases: ['WIX Filters'], patterns: [/^[0-9]{5}$/i, /^24[0-9]{3}/i, /^33[0-9]{3}/i, /^42[0-9]{3}/i, /^46[0-9]{3}/i, /^51[0-9]{3}/i, /^57[0-9]{3}/i] },
    { name: 'Purolator', tier: 3, aliases: ['Purolator'], patterns: [/^[A-Z][0-9]{5}/i, /^L[0-9]{5}/i, /^A[0-9]{5}/i] },
    { name: 'ACDelco', tier: 3, aliases: ['ACDelco', 'AC Delco'], patterns: [/^PF[0-9]{2,4}/i, /^A[0-9]{4}C/i, /^TP[0-9]{3,4}/i] },
    { name: 'Bosch', tier: 3, aliases: ['Bosch'], patterns: [/^[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/i, /^P[0-9]{4}/i, /^F[0-9]{4}/i] },
    { name: 'Hastings', tier: 3, aliases: ['Hastings'], patterns: [/^[A-Z]{2}[0-9]{4}/i, /^LF/i, /^AF/i] },
    { name: 'Parts Master', tier: 3, aliases: ['Parts Master'], patterns: [/^[0-9]{5}/i, /^G[0-9]{4}/i] },
    { name: 'Champion', tier: 3, aliases: ['Champion Labs'], patterns: [/^[A-Z]{2}[0-9]{3,5}/i, /^COF/i] },
    { name: 'NAPA', tier: 3, aliases: ['NAPA'], patterns: [/^[0-9]{4,5}/i, /^1[0-9]{3}/i, /^3[0-9]{3}/i] },
    { name: 'Carquest', tier: 3, aliases: ['Carquest'], patterns: [/^R[0-9]{5}/i, /^8[0-9]{4}/i] }
  ]
};
