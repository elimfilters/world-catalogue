module.exports = {
  industry: 'Marine',
  duty: 'HD',
  manufacturers: [
    { name: 'Cummins Marine', aliases: ['Cummins', 'Cummins Marine'], patterns: [/^[0-9]{7}/i, /^38[0-9]{5}/i, /^39[0-9]{5}/i, /^FF/i, /^FS/i] },
    { name: 'MTU', aliases: ['MTU', 'Detroit Diesel MTU'], patterns: [/^X[0-9]{8}/i, /^[0-9]{8}/i, /^00[0-9]{6}/i] },
    { name: 'Volvo Penta', aliases: ['Volvo Penta'], patterns: [/^[0-9]{7,8}/i, /^21[0-9]{6}/i, /^85[0-9]{6}/i] },
    { name: 'Yanmar', aliases: ['Yanmar'], patterns: [/^[0-9]{6}-/i, /^12[0-9]{4}-/i, /^41[0-9]{4}-/i] },
    { name: 'Detroit Diesel', aliases: ['Detroit Diesel', 'Detroit'], patterns: [/^23[0-9]{5}/i, /^A[0-9]{7}/i, /^R[0-9]{5}/i] },
    { name: 'Mercury Marine', aliases: ['Mercury', 'Mercury Marine'], patterns: [/^35-/i, /^8M/i] },
    { name: 'Suzuki Marine', aliases: ['Suzuki', 'Suzuki Marine'], patterns: [/^16[0-9]{3}-/i, /^17[0-9]{3}-/i] },
    { name: 'Perkins', aliases: ['Perkins'], patterns: [/^[0-9]{7}/i, /^26[0-9]{5}/i, /^CV/i] },
    { name: 'Honda Marine', aliases: ['Honda', 'Honda Marine'], patterns: [/^15[0-9]{3}-/i, /^17[0-9]{3}-/i] }
  ]
};
