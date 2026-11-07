import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const now=Date.now(),today=new Date(now+9*3600000).toISOString().slice(0,10);
const https=value=>{try{return new URL(value).protocol==='https:';}catch{return false;}};
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now+300000;
for(const name of ['ai-news','crypto-news']){
 const data=JSON.parse(await readFile(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
 assert.equal(data.version,1,name+' version');assert(timestamp(data.updatedAt),name+' updatedAt');
 assert(Array.isArray(data.items),name+' items');const ids=new Set();
 for(const item of data.items){
  const label=name+'/'+item.id;
  for(const key of ['id','title','summary','category','sourceName'])assert(typeof item[key]==='string'&&item[key].trim(),label+' '+key);
  assert(!ids.has(item.id),label+' duplicate ID');ids.add(item.id);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(item.date)&&item.date<=today,label+' publication date');
  assert.equal(new Date(item.date+'T00:00:00Z').toISOString().slice(0,10),item.date,label+' real date');
  assert(https(item.sourceUrl),label+' HTTPS source');assert(timestamp(item.verifiedAt),label+' verifiedAt');
  assert(Array.isArray(item.tickers)&&item.tickers.every(t=>typeof t==='string'),label+' tickers');
  for(const related of item.relatedSources||[])assert(https(related.url)&&typeof related.name==='string',label+' related source');
  for(const history of item.history||[])assert(timestamp(history.at)&&typeof history.note==='string'&&history.note.trim(),label+' history');
 }
 console.log(name+': '+data.items.length+' articles validated.');
}
