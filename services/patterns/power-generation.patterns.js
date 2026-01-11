module.exports = {
  industry: 'Power Generation',
  duty: 'HD',
  manufacturers: [
    { name: 'Kohler', aliases: ['Kohler', 'Kohler Power'], patterns: [/^ED[0-9]{7}/i, /^GM[0-9]{5}/i, /^25[0-9]{3}/i] },
    { name: 'Generac', aliases: ['Generac'], patterns: [/^0[A-Z][0-9]{4}/i, /^G[0-9]{6}/i] },
    { name: 'FG Wilson', aliases: ['FG Wilson', 'Wilson'], patterns: [/^[0-9]{6}-/i, /^10000-/i] }
  ]
};
