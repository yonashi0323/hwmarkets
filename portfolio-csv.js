// CSV processing is local only. This module does not make network or storage writes.
export const MAX_CSV_ROWS=5000;
export const MAX_CSV_BYTES=2*1024*1024;
const linesFor=new WeakMap();
const plain=value=>String(value??'').normalize('NFKC').trim();
const headerKey=value=>plain(value).toLowerCase().replace(/[\s_\-()[\]{}（）［］]/g,'').replace(/[円株]$/,'');

function csvError(message,line){
  const error=new Error(`CSVの${line}行目：${message}`);error.line=line;return error;
}

export function parseCSV(text,{maxRows=MAX_CSV_ROWS,maxBytes=MAX_CSV_BYTES}={}){
  if(typeof text!=='string')throw csvError('テキスト形式のCSVを選んでください。',1);
  if(!Number.isSafeInteger(maxRows)||maxRows<1||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw new Error('CSVの読み込み上限が正しくありません。');
  if(new TextEncoder().encode(text).length>maxBytes)throw csvError('ファイルが大きすぎます。読み込み上限を超えています。',1);
  text=text.replace(/^\uFEFF/,'');
  if(text.includes('\0'))throw csvError('読み込めない文字が含まれています。CSVの文字コードを確認してください。',1);
  const records=[],recordLines=[];
  let field='',row=[],mode='start',line=1,rowLine=1;
  function finishField(){row.push(field);field='';mode='start';}
  function finishRow(){
    finishField();
    if(row.some(cell=>cell.trim()!=='')){
      if(records.length>=maxRows+1)throw csvError(`明細は${maxRows}行以内にしてください。`,rowLine);
      records.push(row);recordLines.push(rowLine);
    }
    row=[];
  }
  for(let index=0;index<text.length;index++){
    const char=text[index],newline=char==='\n'||char==='\r';
    if(mode==='quoted'){
      if(char==='"'){
        if(text[index+1]==='"'){field+='"';index++;}else mode='closed';
      }else if(newline){
        if(char==='\r'&&text[index+1]==='\n')index++;
        field+='\n';line++;
      }else field+=char;
      continue;
    }
    if(newline){
      finishRow();if(char==='\r'&&text[index+1]==='\n')index++;line++;rowLine=line;continue;
    }
    if(char===','){finishField();continue;}
    if(mode==='closed'){
      if(char===' '||char==='\t')continue;
      throw csvError('引用符を閉じた後に文字があります。',line);
    }
    if(char==='"'){
      if(mode!=='start')throw csvError('引用符の位置が正しくありません。',line);
      mode='quoted';continue;
    }
    field+=char;mode='unquoted';
  }
  if(mode==='quoted')throw csvError('引用符が閉じられていません。',rowLine);
  finishRow();
  if(!records.length)throw csvError('見出し行がありません。',1);
  const headers=records.shift().map(cell=>cell.trim()),headerLine=recordLines.shift(),seen=new Set();
  for(const header of headers){
    const key=headerKey(header);
    if(!key)throw csvError('空の列名があります。',headerLine);
    if(seen.has(key))throw csvError('同じ名前の列が重複しています。',headerLine);
    seen.add(key);
  }
  for(let index=0;index<records.length;index++)if(records[index].length!==headers.length)throw csvError('見出しと明細の列数が一致しません。',recordLines[index]);
  const parsed={headers,rows:records};linesFor.set(parsed,{header:headerLine,rows:recordLines});return parsed;
}

const headerAliases={
  code:['銘柄コード','証券コード','コード','銘柄code','code','stock code','security code','symbol','ticker','ティッカー','ティッカーシンボル'],
  name:['銘柄名','銘柄名称','銘柄','名称','企業名','会社名','security name','stock name','name','instrument name','company name'],
  quantity:['保有数量','保有数量(株)','保有株数','保有株数(株)','保有数','保有株式数','数量','数量(株)','株数','持株数','残高数量','残高株数','残高','現在数量','quantity','qty','position quantity','position qty','holding quantity','holdings','shares'],
  averageCost:['平均取得単価','平均取得価額','平均購入単価','平均買付単価','平均単価','取得単価','購入単価','買付単価','平均取得価格','平均購入価格','取得価格','average cost','avg cost','average price','avg price','cost price','average purchase price','cost basis per share'],
  currentPrice:['現在価格','現在の価格','現在値','現在値(円)','現値','時価単価','評価単価','現在評価単価','株価','株価(円)','現在株価','現在単価','最新価格','最新値','終値','current price','current market price','market price','last price','closing price','close']
};
const aliasSets=Object.fromEntries(Object.entries(headerAliases).map(([key,values])=>[key,new Set(values.map(headerKey))]));
export function detectColumns(headers){
  const normalized=Array.isArray(headers)?headers.map(headerKey):[];
  return Object.fromEntries(Object.entries(aliasSets).map(([key,aliases])=>{
    const indexes=normalized.flatMap((header,index)=>aliases.has(header)?[index]:[]);
    return [key,indexes.length===1?indexes[0]:-1];
  }));
}

export function normalizeJapaneseCode(value){
  if(typeof value!=='string'&&typeof value!=='number')return null;
  let code=plain(value).toUpperCase().replace(/^(?:TSE:|TYO:|JP[.:])/,'').replace(/\.T$/,'');
  if(code.length===5&&code.endsWith('0'))code=code.slice(0,-1);
  // JPX uses four-character codes, with letters allowed in positions two and four.
  return /^[0-9][0-9A-Z][0-9][0-9A-Z]$/.test(code)?code:null;
}

export function parseNumericCell(value){
  if(typeof value!=='string'&&typeof value!=='number')return null;
  let text=plain(value).replace(/^[¥$]\s*/,'').replace(/\s*円$/,'').trim();
  if(!text||!/^(?:\d+(?:\.\d*)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d*)?)$/.test(text))return null;
  text=text.replace(/,/g,'');
  const [integerPart,fraction='']=text.split('.'),integer=(integerPart||'0').replace(/^0+(?=\d)/,'');
  if(integer.length>13||integer.length===13&&(integer>'1000000000000'||integer==='1000000000000'&&/[1-9]/.test(fraction)))return null;
  const number=Number(text);
  return Number.isFinite(number)&&number>=0&&number<=1e12?number:null;
}

export function mappedRows(parsed,mapping,{mode='holdings'}={}){
  const items=[],errors=[],lineInfo=linesFor.get(parsed),headerLine=lineInfo?.header||1;
  const error=(line,message)=>errors.push({line,message});
  if(!['holdings','prices'].includes(mode))return {items,errors:[{line:headerLine,message:'取り込み方法を選択してください。'}]};
  if(!parsed||!Array.isArray(parsed.headers)||!Array.isArray(parsed.rows)||!mapping||typeof mapping!=='object')return {items,errors:[{line:headerLine,message:'CSVと列の指定を確認してください。'}]};
  const required=mode==='holdings'?['code','quantity','averageCost','currentPrice']:['code','currentPrice'];
  const labels={code:'銘柄コード',name:'銘柄名',quantity:'保有数量',averageCost:'平均購入単価',currentPrice:'現在価格'};
  const validColumn=key=>Number.isInteger(mapping[key])&&mapping[key]>=0&&mapping[key]<parsed.headers.length;
  for(const key of required)if(!validColumn(key))error(headerLine,labels[key]+'の列を指定してください。');
  const active=[...required,...(validColumn('name')?['name']:[])];
  if(errors.length)return {items,errors};
  if(new Set(active.map(key=>mapping[key])).size!==active.length)return {items,errors:[{line:headerLine,message:'異なる項目には別々の列を指定してください。'}]};
  if(!parsed.rows.length)return {items,errors:[{line:headerLine+1,message:'取り込める明細行がありません。'}]};
  const codes=parsed.rows.map(row=>Array.isArray(row)?normalizeJapaneseCode(row[mapping.code]):null),counts=new Map();
  for(const code of codes)if(code)counts.set(code,(counts.get(code)||0)+1);
  for(let index=0;index<parsed.rows.length;index++){
    const row=parsed.rows[index],line=lineInfo?.rows[index]||index+2,before=errors.length,code=codes[index];
    if(!Array.isArray(row)||row.length!==parsed.headers.length){error(line,'見出しと明細の列数が一致しません。');continue;}
    if(!code)error(line,'日本株の銘柄コードを確認してください。');
    else if(counts.get(code)>1)error(line,'同じ銘柄コードが複数行あります。口座や取引ごとの行を確認し、1銘柄1行にしてください。');
    const name=validColumn('name')?plain(row[mapping.name]):'';
    if(name.length>80)error(line,'銘柄名は80文字以内にしてください。');
    const currentPrice=parseNumericCell(row[mapping.currentPrice]);
    if(currentPrice===null)error(line,'現在価格は0以上・1兆以下の数値にしてください。');
    let quantity,averageCost;
    if(mode==='holdings'){
      quantity=parseNumericCell(row[mapping.quantity]);averageCost=parseNumericCell(row[mapping.averageCost]);
      if(quantity===0)error(line,'保有数量が0の行です。非保有銘柄の行を除いてください。');
      else if(quantity===null||quantity<1e-12)error(line,'保有数量は0より大きく・1兆以下の数値にしてください。');
      if(averageCost===null)error(line,'平均購入単価は0以上・1兆以下の数値にしてください。');
      if(quantity!==null&&averageCost!==null&&currentPrice!==null&&quantity*Math.max(averageCost,currentPrice)>1e18)error(line,'保有金額が入力できる上限を超えています。数量と単価を確認してください。');
    }
    if(errors.length===before)items.push({code,name,...(mode==='holdings'?{quantity,averageCost}:{}),currentPrice,line});
  }
  return {items,errors};
}
