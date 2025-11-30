const fs=require('fs');
const p='src/config/prefixMap.js';
let s=fs.readFileSync(p,'utf8');
// Remove the invalid JSON array line injected into getPrefix
s=s.replace(/^\[[\s\S]*?Special-case brand tokens longer than 4 letters.*\r?\n/m,'');
// Add P82 to strict regex if not present
if(!s.includes('|^P82\\d{4}[A-Z]?$')){
  s=s.replace(/\|\^EAF\\d\{5\}\$' \+\s*\n/,"|^EAF\\d{5}$' +\n  '|^P82\\d{4}[A-Z]?$' +\n");
}
fs.writeFileSync(p,s);
console.log('prefixMap.js cleaned and P82 ensured');
