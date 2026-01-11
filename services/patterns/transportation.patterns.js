module.exports = {
  industry: 'Transportation & Trucking',
  duty: 'HD',
  manufacturers: [
    { name: 'Freightliner', aliases: ['Freightliner', 'Daimler Trucks'], patterns: [/^A[0-9]{2}-[0-9]{5}/i, /^05-/i, /^23-/i] },
    { name: 'Kenworth', aliases: ['Kenworth'], patterns: [/^K[0-9]{3}-/i, /^Q[0-9]{2}-/i] },
    { name: 'Peterbilt', aliases: ['Peterbilt'], patterns: [/^Q[0-9]{2}-/i, /^L[0-9]{5}/i] },
    { name: 'Mack', aliases: ['Mack Trucks'], patterns: [/^[0-9]{8}P/i, /^485GB/i, /^2[0-9]{7}/i] },
    { name: 'Volvo Trucks', aliases: ['Volvo Trucks', 'Volvo'], patterns: [/^[0-9]{8}/i, /^21[0-9]{6}/i, /^85[0-9]{6}/i] },
    { name: 'International', aliases: ['International', 'Navistar'], patterns: [/^[0-9]{7}/i, /^18[0-9]{5}/i, /^30[0-9]{5}/i] },
    { name: 'Scania', aliases: ['Scania'], patterns: [/^[0-9]{7}/i, /^15[0-9]{5}/i, /^23[0-9]{5}/i] },
    { name: 'DAF', aliases: ['DAF Trucks'], patterns: [/^[0-9]{7}/i, /^16[0-9]{5}/i] },
    { name: 'Mercedes-Benz', aliases: ['Mercedes', 'Mercedes-Benz'], patterns: [/^A[0-9]{9}/i, /^00[0-9]{8}/i] },
    { name: 'MAN', aliases: ['MAN Truck'], patterns: [/^51[0-9]{8}/i, /^81[0-9]{8}/i] }
  ]
};
