const fs=require('fs');
const path='src/config/prefixMap.js';
let s=fs.readFileSync(path,'utf8');
const re = /const DONALDSON_STRICT_REGEX = new RegExp\([\s\S]*?\);/m;
const replacement = `const DONALDSON_STRICT_REGEX = new RegExp(
  '^(P5(0|2|3|4|5)\\d{4}[A-Z]?)$' +
  '|^(DBL|DBA|ELF)\\d{4,5}$' +
  '|^HFA\\d{4,5}$' +
  '|^HFP\\d{5}$' +
  '|^EAF\\d{5}$' +
  '|^P82\\d{4}[A-Z]?$' +
  '|^X\\d{5,6}$' +
  '|^C\\d{6}$' // Donaldson Duralite C-series (e.g., C105004)
);`;
if (!re.test(s)) { console.error('Regex block not found'); process.exit(1); }
s = s.replace(re, replacement);
fs.writeFileSync(path, s);
console.log('Replaced DONALDSON_STRICT_REGEX with P82 support');
