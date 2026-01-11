module.exports = {
  industry: 'Light Duty',
  duty: 'LD',
  manufacturers: [
    { name: 'Ford', aliases: ['Ford', 'Ford Motor'], patterns: [/^[A-Z][0-9][A-Z]{2}-/i, /^F[0-9]{2}[A-Z]-/i, /^YC/i] },
    { name: 'Toyota', aliases: ['Toyota'], patterns: [/^[0-9]{5}-[0-9]{5}/i, /^90915-/i, /^17801-/i] },
    { name: 'Honda', aliases: ['Honda'], patterns: [/^[0-9]{5}-[A-Z]{3}-/i, /^15400-/i, /^17220-/i] },
    { name: 'BMW', aliases: ['BMW'], patterns: [/^[0-9]{2}\s[0-9]{2}\s[0-9]\s[0-9]{3}\s[0-9]{3}/i, /^11[0-9]{6}/i] },
    { name: 'Volkswagen', aliases: ['VW', 'Volkswagen'], patterns: [/^[0-9]{3}\s[0-9]{3}\s[0-9]{3}\s?[A-Z]?/i, /^03[A-Z][0-9]{3}/i] },
    { name: 'Audi', aliases: ['Audi'], patterns: [/^[0-9]{3}\s[0-9]{3}\s[0-9]{3}\s?[A-Z]?/i, /^06[A-Z][0-9]{3}/i] },
    { name: 'Subaru', aliases: ['Subaru'], patterns: [/^[0-9]{5}[A-Z]{2}[0-9]{3}/i, /^15208/i] },
    { name: 'Mazda', aliases: ['Mazda'], patterns: [/^[A-Z]{2}[0-9]{2}-[0-9]{2}-[0-9]{3}/i, /^1E[0-9]{2}/i] },
    { name: 'General Motors', aliases: ['GM', 'Chevrolet', 'GMC', 'Cadillac'], patterns: [/^[0-9]{8}/i, /^12[0-9]{6}/i, /^25[0-9]{6}/i] },
    { name: 'Chrysler', aliases: ['Chrysler', 'Dodge', 'Jeep', 'RAM', 'Mopar'], patterns: [/^[0-9]{8}/i, /^04[0-9]{6}/i, /^68[0-9]{6}/i] }
  ]
};
