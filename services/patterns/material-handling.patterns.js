module.exports = {
  industry: 'Material Handling',
  duty: 'HD',
  manufacturers: [
    { name: 'Crown', aliases: ['Crown'], patterns: [/^[0-9]{6}/i, /^CR/i] },
    { name: 'Yale', aliases: ['Yale'], patterns: [/^[0-9]{6}/i, /^YA/i] },
    { name: 'Hyster', aliases: ['Hyster'], patterns: [/^[0-9]{6}/i, /^HY/i] },
    { name: 'Jungheinrich', aliases: ['Jungheinrich'], patterns: [/^[0-9]{8}/i, /^50[0-9]{6}/i] },
    { name: 'Linde', aliases: ['Linde'], patterns: [/^[0-9]{7}/i, /^00[0-9]{5}/i] },
    { name: 'Mitsubishi', aliases: ['Mitsubishi', 'Mitsubishi Forklift'], patterns: [/^[0-9]{8}/i, /^91[0-9]{6}/i] },
    { name: 'Nissan Forklift', aliases: ['Nissan', 'Nissan Forklift'], patterns: [/^[0-9]{5}/i] },
    { name: 'Clark', aliases: ['Clark'], patterns: [/^[0-9]{6}/i] }
  ]
};
