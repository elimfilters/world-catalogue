const fs=require('fs');
const p='src/config/prefixMap.js';
let s=fs.readFileSync(p,'utf8');
const start=s.indexOf('function getPrefix(code)');
const end=s.indexOf('return null;', start);
if(start>=0 && end>start){
  const before=s.slice(0,start);
  let block=s.slice(start,end);
  const after=s.slice(end);
  const lines=block.split(/\r?\n/);
  const cleaned=lines.filter(l=>!(l.trim().startsWith('[') || l.includes('Special-case brand tokens longer than 4 letters')));
  s=before+cleaned.join('\n')+after;
}
// Ensure P82 in strict regex
if(!s.includes('|^P82\\d{4}[A-Z]?$')){
  s=s.replace(/\|\^EAF\\d\{5\}\$\s*\+\s*\n/,'|^EAF\\d{5}$' + " +\n  " + '|^P82\\d{4}[A-Z]?$' + " +\n");
}
fs.writeFileSync(p,s);
console.log('prefixMap getPrefix block cleaned and P82 added to strict regex');
