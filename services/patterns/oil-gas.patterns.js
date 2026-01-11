module.exports = {
  industry: 'Oil & Gas',
  duty: 'HD',
  manufacturers: [
    { name: 'Waukesha', aliases: ['Waukesha', 'Dresser Waukesha'], patterns: [/^[0-9]{6}/i, /^ES/i] },
    { name: 'GE Oil & Gas', aliases: ['GE', 'General Electric'], patterns: [/^[0-9]{8}/i, /^HM/i] },
    { name: 'Cameron', aliases: ['Cameron', 'SLB', 'Schlumberger'], patterns: [/^[0-9]{6}/i] },
    { name: 'Weatherford', aliases: ['Weatherford'], patterns: [/^[0-9]{6}/i] },
    { name: 'Halliburton', aliases: ['Halliburton'], patterns: [/^[0-9]{6}/i] },
    { name: 'Baker Hughes', aliases: ['Baker Hughes'], patterns: [/^[0-9]{6}/i] },
    { name: 'National Oilwell Varco', aliases: ['National Oilwell', 'NOV'], patterns: [/^[0-9]{6}/i] },
    { name: 'Dresser', aliases: ['Dresser'], patterns: [/^[0-9]{6}/i] }
  ]
};
