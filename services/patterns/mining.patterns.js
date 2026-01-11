module.exports = {
  industry: 'Mining',
  duty: 'HD',
  manufacturers: [
    { name: 'Sandvik', aliases: ['Sandvik'], patterns: [/^56[0-9]{5}/i, /^55[0-9]{5}/i, /^K[0-9]{5}/i] },
    { name: 'Epiroc', aliases: ['Epiroc', 'Atlas Copco Mining'], patterns: [/^3[0-9]{9}/i, /^EP/i] },
    { name: 'BelAZ', aliases: ['BelAZ'], patterns: [/^[0-9]{3}-[0-9]{4}/i] },
    { name: 'Terex', aliases: ['Terex', 'Unit Rig'], patterns: [/^[0-9]{8}/i, /^15[0-9]{6}/i] },
    { name: 'Atlas Copco', aliases: ['Atlas Copco'], patterns: [/^[0-9]{4}\s?[0-9]{4}\s?[0-9]{2}/i, /^16[0-9]{5}/i] },
    { name: 'Metso', aliases: ['Metso', 'Metso Outotec'], patterns: [/^[0-9]{6}/i] }
  ]
};
