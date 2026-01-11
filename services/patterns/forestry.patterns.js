module.exports = {
  industry: 'Forestry',
  duty: 'HD',
  manufacturers: [
    { name: 'Tigercat', aliases: ['Tigercat'], patterns: [/^[0-9]{6}/i, /^5[0-9]{5}/i] },
    { name: 'Ponsse', aliases: ['Ponsse'], patterns: [/^[0-9]{7}/i, /^0[0-9]{6}/i] },
    { name: 'Valmet', aliases: ['Valmet'], patterns: [/^[0-9]{7}/i] },
    { name: 'Rottne', aliases: ['Rottne'], patterns: [/^[0-9]{6}/i] },
    { name: 'HSM', aliases: ['HSM'], patterns: [/^[0-9]{6}/i] },
    { name: 'Waratah', aliases: ['Waratah'], patterns: [/^[0-9]{6}/i] },
    { name: 'TimberPro', aliases: ['TimberPro'], patterns: [/^[0-9]{6}/i] }
  ]
};
