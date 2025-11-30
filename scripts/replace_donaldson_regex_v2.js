const fs=require('fs');
const path='src/config/prefixMap.js';
let s=fs.readFileSync(path,'utf8');
const startTok = 'const DONALDSON_STRICT_REGEX = new RegExp(';
const start = s.indexOf(startTok);
if (start < 0) { console.error('Start token not found'); process.exit(1); }
const end = s.indexOf(');', start);
if (end < 0) { console.error('End token not found'); process.exit(1); }
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
const pre = s.slice(0, start);
const post = s.slice(end + 2);
s = pre + replacement + post;
fs.writeFileSync(path, s);
console.log('Regex block replaced successfully');
