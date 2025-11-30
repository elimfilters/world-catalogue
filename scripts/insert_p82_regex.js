const fs=require('fs');
const path='src/config/prefixMap.js';
let s=fs.readFileSync(path,'utf8');
const needle = "'|^EAF\\\\d{5}$' +";
const insert = "  '|^P82\\\\d{4}[A-Z]?$' +";
if (s.includes(needle)) {
  s = s.replace(needle, needle + "\n" + insert);
  fs.writeFileSync(path,s);
  console.log('Inserted P82 into DONALDSON_STRICT_REGEX.');
} else {
  console.error('Needle not found.');
  process.exit(1);
}
