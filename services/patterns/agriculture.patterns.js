module.exports = {
  industry: 'Agriculture',
  duty: 'HD',
  manufacturers: [
    { name: 'New Holland', aliases: ['New Holland', 'NH'], patterns: [/^84[0-9]{6}/i, /^87[0-9]{6}/i, /^86[0-9]{6}/i] },
    { name: 'AGCO', aliases: ['AGCO', 'Massey Ferguson', 'Challenger'], patterns: [/^AG/i, /^V[0-9]{8}/i, /^700[0-9]{5}/i] },
    { name: 'Kubota', aliases: ['Kubota'], patterns: [/^[0-9]{5}-[0-9]{5}/i, /^TC/i, /^HH/i] },
    { name: 'CLAAS', aliases: ['CLAAS'], patterns: [/^[0-9]{6}\.[0-9]/i, /^00[0-9]{4}/i] },
    { name: 'Massey Ferguson', aliases: ['Massey Ferguson', 'MF'], patterns: [/^[0-9]{7}/i, /^1[0-9]{6}/i, /^3[0-9]{6}/i] },
    { name: 'Fendt', aliases: ['Fendt'], patterns: [/^F[0-9]{6}/i, /^X[0-9]{6}/i] },
    { name: 'Mahindra', aliases: ['Mahindra'], patterns: [/^00[0-9]{5}/i, /^1[0-9]{6}/i] },
    { name: 'Deutz-Fahr', aliases: ['Deutz-Fahr', 'Deutz'], patterns: [/^01[0-9]{6}/i, /^04[0-9]{6}/i] }
  ]
};
