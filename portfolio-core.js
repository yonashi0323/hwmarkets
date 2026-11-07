// Holdings stay in browser storage. This module has no network or account writes.
import {normalizeJapaneseCode} from './portfolio-csv.js';
export const MAX_POSITIONS=100;
export const portfolioStorageKey=owner=>'hwmarkets-portfolio-v1:'+(owner===null?'guest':'account:'+encodeURIComponent(owner));
const number=(value,{positive=false,max=1e12}={})=>typeof value==='number'&&Number.isFinite(value)&&(positive?value>0:value>=0)&&value<=max;
export function normalizePosition(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||!['stock','crypto'].includes(value.type)||!['manual','cmc'].includes(value.pricing))throw Error('保有銘柄の形式を確認してください。');
  if(typeof value.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(value.id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||typeof value.symbol!=='string'||value.symbol.length>30)throw Error('銘柄名・コードを確認してください。');
  if(!number(value.quantity,{positive:true})||value.quantity<1e-12||!number(value.averageCost)||!['JPY','USD'].includes(value.currency)||!number(value.currentPrice))throw Error('数量・単価・通貨を確認してください。');
  if(value.quantity*Math.max(value.averageCost,value.currentPrice)>1e18)throw Error('入力した金額が大きすぎます。');
  const cmc=value.pricing==='cmc';
  if(cmc&&(value.type!=='crypto'||value.currency!=='USD'||!Number.isSafeInteger(value.coinId)||value.coinId<1||value.coinId>2147483647))throw Error('暗号資産の自動価格設定を確認してください。');
  const stockCode=value.stockCode==null?null:normalizeJapaneseCode(value.stockCode);
  if(value.stockCode!=null&&(!stockCode||value.type!=='stock'||value.currency!=='JPY'))throw Error('日本株の銘柄コード・通貨を確認してください。');
  const symbolCode=normalizeJapaneseCode(value.symbol);
  if(stockCode&&symbolCode&&stockCode!==symbolCode)throw Error('日本株の銘柄コードとシンボルが一致していません。');
  if(value.priceSource!==undefined&&!['manual','csv'].includes(value.priceSource))throw Error('価格の取得方法を確認してください。');
  const priceSource=value.priceSource||'manual';
  let priceImportedAt=null;
  if(priceSource==='csv'){
    if(value.type!=='stock'||value.pricing!=='manual'||value.currency!=='JPY'||!stockCode||typeof value.priceImportedAt!=='string'||!Number.isFinite(Date.parse(value.priceImportedAt)))throw Error('CSV価格の取り込み情報を確認してください。');
    priceImportedAt=new Date(value.priceImportedAt).toISOString();
  }
  return {id:value.id,type:value.type,pricing:value.pricing,name:value.name.trim(),symbol:value.symbol.trim(),quantity:value.quantity,averageCost:value.averageCost,currentPrice:value.currentPrice,currency:value.currency,coinId:cmc?value.coinId:null,stockCode,priceSource,priceImportedAt};
}
export function normalizePortfolio(value){
  if(!value||value.version!==1||!Array.isArray(value.positions)||value.positions.length>MAX_POSITIONS||!(value.usdJpy===null||number(value.usdJpy,{positive:true,max:1e6})))throw Error('保存データの形式が正しくありません。');
  const positions=value.positions.map(normalizePosition);
  if(new Set(positions.map(p=>p.id)).size!==positions.length)throw Error('保有銘柄の識別子が重複しています。');
  return {version:1,usdJpy:value.usdJpy,positions};
}
export const emptyPortfolio=()=>({version:1,usdJpy:null,positions:[]});
export function valuePortfolio(portfolio,quotes=new Map()){
  let value=0,cost=0,missing=0;
  const groups={stock:0,crypto:0};
  const rows=portfolio.positions.map(position=>{
    const quote=position.pricing==='cmc'?quotes.get(position.coinId):null;
    const price=position.pricing==='cmc'?(number(quote?.price)?quote.price:null):position.currentPrice;
    const nativeValue=price===null?null:position.quantity*price,nativeCost=position.quantity*position.averageCost;
    const factor=position.currency==='JPY'?1:portfolio.usdJpy;
    const valued=price!==null&&factor!==null&&Number.isFinite(nativeValue*factor)&&nativeValue*factor<=1e24;
    const rowValue=valued?nativeValue*factor:null,rowCost=valued?nativeCost*factor:null;
    if(!valued)missing++;else{value+=rowValue;cost+=rowCost;groups[position.type]+=rowValue;}
    return {...position,price,nativeValue,nativeCost,nativeGain:nativeValue===null?null:nativeValue-nativeCost,value:rowValue,cost:rowCost,gain:valued?rowValue-rowCost:null,quoteAt:quote?.updatedAt||null};
  });
  const complete=missing===0;
  return {rows,complete,missing,value,cost,gain:value-cost,gainPercent:cost>0?(value-cost)/cost*100:null,groups};
}
