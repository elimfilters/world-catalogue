const fs=require('fs');
const p='src/config/prefixMap.js';
let s=fs.readFileSync(p,'utf8');
// Remove any single line starting with '[' containing 'Special-case brand tokens longer than 4 letters'
s=s.replace(/^\[.*Special-case brand tokens longer than 4 letters$/m,'  // Special-case brand tokens longer than 4 letters');
// Ensure P82 pattern in strict regex
if(!/\|\^P82\\d\{4\}\[A-Z\]\?\$/.test(s)){
  s=s.replace(/\|\^EAF\\d\{5\}\$\s*\+\s*\n/,'|^EAF\\d{5}$' + " +\n  " + '|^P82\\d{4}[A-Z]?$' + " +\n");
}
fs.writeFileSync(p,s);
console.log('prefixMap.js fixed v2');
