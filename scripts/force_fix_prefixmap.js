const fs=require('fs');
const p='src/config/prefixMap.js';
let s=fs.readFileSync(p,'utf8');
let lines=s.split(/\r?\n/);
let idx=lines.findIndex(l=>l.includes('Special-case brand tokens longer than 4 letters'));
console.log('Found line index:', idx);
if(idx>=0){
  lines[idx]='  // Special-case brand tokens longer than 4 letters';
  fs.writeFileSync(p,lines.join('\n'));
  console.log('Line replaced');
} else {
  console.log('No matching line found');
}
// Add P82 strict regex by inserting after EAF line if missing
s=fs.readFileSync(p,'utf8');
if(!s.includes('|^P82\\d{4}[A-Z]?$')){
  s=s.replace("'|^EAF\\d{5}$' +\n", "'|^EAF\\d{5}$' +\n  '|^P82\\d{4}[A-Z]?$' +\n");
  fs.writeFileSync(p,s);
  console.log('Added P82 to strict regex');
} else {
  console.log('P82 already in strict regex');
}
