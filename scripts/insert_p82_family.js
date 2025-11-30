const fs=require('fs');
const path='src/scrapers/donaldson.js';
let s=fs.readFileSync(path,'utf8');
if(!s.includes('^P82')){
  const target="        if (/^P78\\d{4}[A-Z]?$/.test(normalized)) return 'AIRE';";
  const insert="\n        if (/^P82\\d{4}[A-Z]?$/.test(normalized)) return 'AIRE';";
  if(s.includes(target)){
    s=s.replace(target,target+insert);
    fs.writeFileSync(path,s);
    console.log('Inserted P82AIRE after P78 mapping');
  } else {
    console.log('Target line not found; no changes made');
  }
} else {
  console.log('P82 mapping already present');
}
