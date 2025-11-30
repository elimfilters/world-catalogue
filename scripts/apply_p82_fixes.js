const fs=require('fs');
function replaceLineInFile(path, matchFn, replaceWith){
  const s=fs.readFileSync(path,'utf8');
  const lines=s.split(/\r?\n/);
  const newLines=lines.map(l=>{
    if(matchFn(l)) return replaceWith;
    return l;
  });
  fs.writeFileSync(path,newLines.join('\n'));
}
function ensureInRegex(path, anchorRegex, insertLine){
  let s=fs.readFileSync(path,'utf8');
  if(!s.includes(insertLine)){
    s=s.replace(anchorRegex,(m)=> m + "\n  " + insertLine);
    fs.writeFileSync(path,s);
  }
}
// 1) Clean prefixMap invalid line
const pfx='src/config/prefixMap.js';
replaceLineInFile(pfx,(l)=> l.includes('Special-case brand tokens longer than 4 letters') && l.trim().startsWith('['),'  // Special-case brand tokens longer than 4 letters');
// 2) Add P82 to DONALDSON_STRICT_REGEX after EAF
ensureInRegex(pfx,/\|\^EAF\\d\{5\}\$' \+\n/,'|^P82\\d{4}[A-Z]?$' + " +");
// 3) Add P82  AIRE mapping in donaldson.js
const don='src/scrapers/donaldson.js';
let d=fs.readFileSync(don,'utf8');
if(!/\^P82\\d\{4\}\[A-Z\]\?\$/.test(d)){
  d=d.replace(/(if \/\^P78\\d\{4\}\[A-Z\]\?\$\/.test\(normalized\)\) return 'AIRE';)/,'\n        if (/^P82\\d{4}[A-Z]?$/.test(normalized)) return \"AIRE\";');
  fs.writeFileSync(don,d);
}
console.log('Applied fixes: prefixMap line cleaned, P82 strict added, P82AIRE mapping in donaldson');
