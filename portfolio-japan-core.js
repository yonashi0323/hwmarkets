import {normalizePortfolio,normalizePosition,MAX_POSITIONS} from './portfolio-core.js';
import {normalizeJapaneseCode} from './portfolio-csv.js';

const contextKey=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[\s_\-()[\]{}（）［］・/／:：]/g,'');
const historyHeaders=new Set(['約定日','約定日時','約定番号','約定単価','約定価格','約定数量','約定代金','取引日','取引日時','取引番号','受渡日','注文番号','execution date','execution time','execution price','executed quantity','execution id','fill price','fill quantity','trade date','trade time','trade id','transaction date','order id'].map(contextKey));
const currencyHeaders=new Set(['通貨','通貨コード','決済通貨','建値通貨','価格通貨','currency','currency code','price currency','settlement currency'].map(contextKey));
const kindHeaders=new Set(['現物信用区分','現物/信用','現物・信用','信用区分','信用取引区分','売買','売買区分','売買種別','取引区分','取引種別','取引種類','取引形態','保有区分','商品区分','商品種別','証券種類','資産種別','side','position type','security type','asset type','product type','trade type','transaction type'].map(contextKey));
const yenLabels=new Set(['jpy','円','日本円','円貨','yen','¥','jpy日本円','日本円jpy']);

// Inspect the original CSV before column mapping discards currency and product metadata.
// This conservative check cannot establish that an arbitrary CSV is a cash-position report.
export function validateJapanCSVContext(parsed){
  if(!parsed||!Array.isArray(parsed.headers)||!Array.isArray(parsed.rows)||parsed.rows.some(row=>!Array.isArray(row)||row.length!==parsed.headers.length))return [{line:null,message:'CSVの見出しと明細を確認してください。'}];
  const headers=parsed.headers.map(contextKey),errors=[];
  if(headers.some(header=>historyHeaders.has(header)))errors.push({line:null,message:'約定・取引履歴の列が含まれています。売買履歴ではなく、現在の現物株式の保有残高CSVを選んでください。'});
  const currencies=headers.flatMap((header,index)=>currencyHeaders.has(header)?[index]:[]);
  if(currencies.some(index=>parsed.rows.some(row=>!yenLabels.has(contextKey(row[index])))))errors.push({line:null,message:'通貨列に日本円を確認できない明細があります。円建ての日本株だけのCSVを選んでください。'});
  if(headers.some(header=>/(?:現在|株価|価格|単価|評価|取得|購入|買付|時価|price|cost)/.test(header)&&/(?:usd|hkd|eur|gbp|cny|rmb|aud|cad|sgd|krw|ドル|ユーロ|ポンド|ウォン|人民元|\$)/.test(header)))errors.push({line:null,message:'外貨建ての価格列が含まれています。円建ての日本株だけのCSVを選んでください。'});
  const kinds=headers.flatMap((header,index)=>kindHeaders.has(header)?[index]:[]);
  if(kinds.some(index=>parsed.rows.some(row=>/(?:信用|空売|売建|買建|建玉|借株|先物|オプション|margin|short|cfd|futures?|options?|sell|buy|^売$|^買$)/.test(contextKey(row[index])))))errors.push({line:null,message:'信用・空売り・先物、または売買区分の明細があります。現物株式の保有残高だけのCSVを選んでください。'});
  return errors;
}

export function buildJapanImportPlan(portfolio,items,{mode='prices',now=new Date().toISOString(),idFactory=()=>crypto.randomUUID(),companies=[]}={}){
  if(!['prices','holdings'].includes(mode)||!Array.isArray(items)||items.length>5000||!Number.isFinite(Date.parse(now))||typeof idFactory!=='function'||!Array.isArray(companies))throw Error('取り込み設定を確認してください。');
  const original=normalizePortfolio(portfolio),positions=[...original.positions],changes=[],errors=[],seen=new Set();let skipped=0;
  const catalog=new Map(companies.filter(c=>c&&normalizeJapaneseCode(c.code)&&typeof c.name==='string').map(c=>[normalizeJapaneseCode(c.code),c]));
  if(!items.length)errors.push({line:null,message:'取り込める明細行がありません。'});
  for(const item of items){
    if(!item||typeof item!=='object'||Array.isArray(item)){errors.push({line:null,message:'取り込む明細の形式を確認してください。'});continue;}
    const code=normalizeJapaneseCode(item.code),line=item.line;
    if(!code||seen.has(code)){errors.push({line,message:'銘柄コードが不正または重複しています。'});continue;}seen.add(code);
    const matches=positions.map((p,index)=>({p,index})).filter(({p})=>p.type==='stock'&&normalizeJapaneseCode(p.stockCode||p.symbol)===code);
    if(matches.length>1){errors.push({line,message:'同じコードの保有情報が複数あります。取込先を一つにまとめてください。'});continue;}
    if(mode==='prices'&&!matches.length){skipped++;continue;}
    const previous=matches[0]?.p,index=matches[0]?.index;
    if(previous&&(previous.currency!=='JPY'||previous.pricing!=='manual')){errors.push({line,message:'このコードの保有情報は円建ての現物株式ではありません。'});continue;}
    try{
      const name=(mode==='holdings'?item.name:'')||previous?.name||catalog.get(code)?.name||code;
      const position=normalizePosition({id:previous?.id||idFactory(),type:'stock',pricing:'manual',name,symbol:code,stockCode:code,quantity:mode==='prices'?previous.quantity:item.quantity,averageCost:mode==='prices'?previous.averageCost:item.averageCost,currentPrice:item.currentPrice,currency:'JPY',coinId:null,priceSource:'csv',priceImportedAt:now});
      if(previous)positions[index]=position;else positions.push(position);
      changes.push({code,name:position.name,action:previous?(mode==='prices'?'現在値を更新':'保有情報を更新'):'新しく追加',quantity:position.quantity,averageCost:position.averageCost,currentPrice:position.currentPrice,previousPrice:previous?.currentPrice??null,line});
    }catch(error){errors.push({line,message:error.message});}
  }
  if(positions.length>MAX_POSITIONS)errors.push({line:null,message:'保有銘柄は100件までです。取り込む銘柄を減らすか、不要な保有銘柄を整理してください。'});
  if(!errors.length){try{normalizePortfolio({...original,positions});}catch(error){errors.push({line:null,message:error.message});}}
  return {positions:errors.length?null:positions,changes,skipped,errors};
}
