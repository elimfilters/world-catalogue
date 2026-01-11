module.exports = {
  industry: 'Construction & Heavy Equipment',
  duty: 'HD',
  manufacturers: [
    { name: 'Caterpillar', aliases: ['CAT', 'Caterpillar'], patterns: [/^1[A-Z]/i, /^2[A-Z]/i, /^3[A-Z]/i, /^4[A-Z]/i, /^5[A-Z]/i, /^6[A-Z]/i, /^7[A-Z]/i, /^8[A-Z]/i, /^9[A-Z]/i] },
    { name: 'Komatsu', aliases: ['Komatsu'], patterns: [/^600-/i, /^207-/i, /^421-/i, /^418-/i, /^6736-/i, /^6732-/i] },
    { name: 'John Deere', aliases: ['John Deere', 'Deere', 'JD'], patterns: [/^RE/i, /^AR/i, /^AT/i, /^AL/i, /^AH/i, /^DZ/i, /^T[0-9]/i] },
    { name: 'Volvo CE', aliases: ['Volvo', 'Volvo CE'], patterns: [/^VOE/i, /^EC/i, /^11-/i, /^14-/i] },
    { name: 'Hitachi', aliases: ['Hitachi'], patterns: [/^4[0-9]{6}/i, /^YA/i] },
    { name: 'Liebherr', aliases: ['Liebherr'], patterns: [/^[0-9]{8}/i, /^10[0-9]{6}/i, /^71[0-9]{5}/i] },
    { name: 'Doosan', aliases: ['Doosan', 'Daewoo'], patterns: [/^DX/i, /^K9[0-9]{5}/i, /^2474-/i] },
    { name: 'Hyundai', aliases: ['Hyundai'], patterns: [/^31[A-Z]/i, /^11[A-Z]/i] },
    { name: 'Kobelco', aliases: ['Kobelco'], patterns: [/^YN/i, /^PW/i] },
    { name: 'Case IH', aliases: ['Case', 'Case IH', 'CNH'], patterns: [/^84[0-9]{6}/i, /^87[0-9]{6}/i, /^A[0-9]{5}/i] }
  ]
};
