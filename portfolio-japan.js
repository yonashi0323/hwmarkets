import {parseCSV,detectColumns,mappedRows,MAX_CSV_BYTES} from './portfolio-csv.js';
import {buildJapanImportPlan,validateJapanCSVContext} from './portfolio-japan-core.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const searchKey=value=>String(value).normalize('NFKC').toLowerCase().replace(/[\s・]/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const number=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:12});
const yen=new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:2});

export function attachJapanPortfolio({root,getPortfolio,getOwner,getRevision,commit,onCompany}){
  const panel=document.createElement('section');panel.className='pf-jp-tools';panel.setAttribute('aria-labelledby','pfJpTitle');
  panel.innerHTML='<div><small>JAPAN STOCKS</small><h2 id="pfJpTitle">日本株を、まとめて管理。</h2><p>会社名・銘柄コードから選択。CSVから保有情報や現在値をまとめて反映できます。</p></div><div class="pf-jp-actions"><button class="button" id="pfJpSearchOpen">日本株を検索して追加</button><button class="button" id="pfCsvOpen">日本株CSVを取り込む</button></div><p class="pf-jp-note">現在値は手入力またはCSV取込時点の値です。株価の常時自動更新には対応していません。</p>';
  root.querySelector('.pf-toolbar').after(panel);
  const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.csv,text/csv';fileInput.hidden=true;fileInput.id='pfCsvFile';root.append(fileInput);
  const companyDialog=document.createElement('dialog');companyDialog.className='modal pf-jp-dialog';companyDialog.id='pfJpDialog';companyDialog.setAttribute('aria-labelledby','pfJpSearchTitle');
  companyDialog.innerHTML='<div class="modal-heading"><div><div class="eyebrow">JAPAN COMPANY SEARCH</div><h2 id="pfJpSearchTitle">日本株の会社を検索</h2></div><button class="icon-button" id="pfJpClose" aria-label="日本株の会社検索を閉じる">✕</button></div><label class="pf-field"><span>会社名・読み・銘柄コード</span><input id="pfJpSearch" type="search" maxlength="100" autocomplete="off" placeholder="例：トヨタ、そにー、7203"></label><p id="pfJpSearchStatus" class="pf-status" role="status"></p><div id="pfJpResults" class="pf-jp-results"></div><p class="pf-jp-source" id="pfJpSource"></p><p class="pf-jp-source">金融庁EDINET掲載の国内上場会社が対象です。ETF・優先株や新規上場直後の銘柄など、検索できない銘柄は通常の「保有銘柄を追加」から手入力できます。株価は含まれません。</p><button class="text-button" id="pfJpRetry">会社一覧を再確認</button>';
  document.body.append(companyDialog);
  const csvDialog=document.createElement('dialog');csvDialog.className='modal pf-jp-dialog pf-csv-dialog';csvDialog.id='pfCsvDialog';csvDialog.setAttribute('aria-labelledby','pfCsvTitle');
  csvDialog.innerHTML='<div class="modal-heading"><div><div class="eyebrow">IMPORT JAPANESE STOCKS</div><h2 id="pfCsvTitle">日本株CSVを取り込む</h2></div><button class="icon-button" id="pfCsvClose" aria-label="日本株CSVの取り込みを閉じる">✕</button></div><p class="pf-jp-intro">円建て現物株式の保有残高・株価一覧を読み込めます。売買の取引履歴や信用取引には対応していません。CSVはこの端末で処理し、サーバーへ送信しません。</p><div class="pf-csv-start"><button class="button" id="pfCsvPick">CSVを選ぶ</button><button class="text-button" id="pfCsvTemplate">入力用の見本CSV</button><small id="pfCsvFileName">UTF-8 / Shift_JIS、2MB・5,000行まで</small></div><div id="pfCsvConfig" hidden><label class="pf-field"><span>反映する内容</span><select id="pfCsvMode"><option value="prices">登録済み銘柄の現在値だけ更新</option><option value="holdings">保有銘柄を追加・更新</option></select><small id="pfCsvModeNote"></small></label><div class="pf-csv-mapping" id="pfCsvMapping"></div><p class="pf-jp-note">元のCSVで通貨がJPYであり、平均購入単価が1株あたりの値であることを確認してください。取得総額・評価額・損益の列は単価として指定しないでください。</p><label class="pf-csv-confirm"><input type="checkbox" id="pfCsvConfirm">円建て現物株式の保有残高・株価一覧であることを確認しました</label><button class="button" id="pfCsvPreview" disabled>反映内容を確認</button></div><div id="pfCsvErrors" class="pf-csv-errors" role="alert" hidden></div><div id="pfCsvPlan" hidden><p id="pfCsvPlanSummary" class="pf-status" role="status"></p><div class="pf-table-scroll"><table class="pf-table"><thead><tr><th scope="col">銘柄 / 操作</th><th scope="col">数量</th><th scope="col">平均購入単価</th><th scope="col">現在値</th></tr></thead><tbody id="pfCsvPlanRows"></tbody></table></div><p class="pf-jp-note">表示された銘柄だけが反映対象です。「保有銘柄を追加・更新」では同じコードの数量・平均購入単価・現在値が置き換わります。CSVにない保有銘柄は保持します。</p></div><div class="modal-actions"><button class="button" id="pfCsvCancel">閉じる</button><button class="button button-primary" id="pfCsvApply" disabled>確認した内容を反映</button></div>';
  document.body.append(csvDialog);
  const by=id=>document.getElementById(id);
  let catalog=null,catalogPromise=null,catalogError='',catalogAttempt=0,parsed=null,plan=null,snapshot=null,readSequence=0;

  function renderCompanies(){
    const results=by('pfJpResults');results.replaceChildren();
    if(catalogPromise){by('pfJpSearchStatus').textContent='会社一覧を読み込んでいます…';return;}
    if(!catalog){by('pfJpSearchStatus').textContent=catalogError||'会社一覧を読み込んでください。';return;}
    const query=searchKey(by('pfJpSearch').value),all=catalog.companies.filter(c=>!query||searchKey(c.code+' '+c.name+' '+c.kana+' '+c.englishName).includes(query));
    const matches=all.slice(0,40);by('pfJpSearchStatus').textContent=all.length+'社が該当'+(all.length>40?' · 先頭40社を表示。名前・コードで絞り込んでください。':'')+(catalog.stale?' · 前回取得した会社一覧です。':'');
    for(const company of matches){const button=document.createElement('button');button.type='button';button.className='pf-jp-company';button.setAttribute('aria-label',company.name+'（'+company.code+'）を選択');const code=document.createElement('b');code.textContent=company.code;const label=document.createElement('span');const title=document.createElement('strong');title.textContent=company.name;const detail=document.createElement('small');detail.textContent=company.industry||company.kana;label.append(title,detail);const arrow=document.createElement('span');arrow.textContent='＋';arrow.setAttribute('aria-hidden','true');button.append(code,label,arrow);button.addEventListener('click',()=>{companyDialog.close();onCompany(company);});results.append(button);}
    by('pfJpSource').innerHTML='金融庁<a href="https://disclosure2dl.edinet-fsa.go.jp/searchdocument/codelist/Edinetcode.zip" target="_blank" rel="noopener noreferrer">EDINETコードリスト</a>をもとにHWMarkets作成 · '+esc(catalog.asOf)+'現在 · <a href="https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/WZEK0030.html" target="_blank" rel="noopener noreferrer">利用規約 / PDL1.0</a>';
  }
  async function loadCompanies(force=false){
    if(catalogPromise)return catalogPromise;if(!force&&catalog)return catalog;
    if(Date.now()-catalogAttempt<10000)return;catalogAttempt=Date.now();catalogError='';
    catalogPromise=(async()=>{try{
      const response=await fetch('/api/japan-companies',{credentials:'omit',headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const data=await response.json();
      if(data.source!=='EDINET'||!/^\d{4}-\d{2}-\d{2}$/.test(data.asOf)||!Array.isArray(data.companies)||data.companies.length<100||data.companies.length>10000||data.companies.some(c=>typeof c.code!=='string'||!/^[0-9][0-9A-Z][0-9][0-9A-Z]$/.test(c.code)||typeof c.name!=='string'||!c.name||c.name.length>250||typeof c.kana!=='string'||typeof c.englishName!=='string'||typeof c.industry!=='string')||new Set(data.companies.map(c=>c.code)).size!==data.companies.length)throw Error();catalog=data;
    }catch{catalogError='会社一覧を取得できませんでした。「会社一覧を再確認」から再試行してください。手入力やCSV取り込みも利用できます。';}finally{catalogPromise=null;if(companyDialog.open)renderCompanies();}})();renderCompanies();return catalogPromise;
  }
  by('pfJpSearchOpen').addEventListener('click',()=>{by('pfJpSearch').value='';companyDialog.showModal();renderCompanies();by('pfJpSearch').focus();loadCompanies();});
  by('pfJpSearch').addEventListener('input',renderCompanies);by('pfJpClose').addEventListener('click',()=>companyDialog.close());by('pfJpRetry').addEventListener('click',()=>loadCompanies(true));
  function resetImport(){readSequence++;parsed=null;plan=null;snapshot=null;fileInput.value='';}
  const closeImport=()=>{resetImport();csvDialog.close();};
  csvDialog.addEventListener('cancel',resetImport);
  csvDialog.addEventListener('close',()=>{if(!csvDialog.open)resetImport();});
  function clearPlan(){plan=null;by('pfCsvApply').disabled=true;by('pfCsvPlan').hidden=true;by('pfCsvErrors').hidden=true;}
  function setMode(){
    const holdings=by('pfCsvMode').value==='holdings';
    by('pfCsvModeNote').textContent=holdings?'新しい銘柄を追加し、同じコードの保有情報を更新します。':'数量と購入単価を保持し、同じコードの現在値だけを更新します。未登録の銘柄は読み飛ばします。';
    for(const field of ['quantity','averageCost'])by('pfCsvCol-'+field).disabled=!holdings;clearPlan();
  }
  function showErrors(errors){
    const node=by('pfCsvErrors');node.hidden=!errors.length;node.replaceChildren();if(!errors.length)return;
    const title=document.createElement('strong');title.textContent=errors.length+'件の確認が必要です。内容を修正してから再確認してください。';node.append(title);
    for(const error of errors.slice(0,12)){const p=document.createElement('p');p.textContent=(error.line?'CSV '+error.line+'行目：':'')+error.message;node.append(p);}if(errors.length>12){const p=document.createElement('p');p.textContent='ほか'+(errors.length-12)+'件';node.append(p);}
  }
  function openImport(){
    readSequence++;parsed=null;plan=null;snapshot={owner:getOwner(),revision:getRevision()};by('pfCsvConfirm').checked=false;by('pfCsvPreview').disabled=true;by('pfCsvConfig').hidden=true;by('pfCsvFileName').textContent='UTF-8 / Shift_JIS、2MB・5,000行まで';clearPlan();csvDialog.showModal();by('pfCsvPick').focus();
  }
  by('pfCsvOpen').addEventListener('click',openImport);by('pfCsvClose').addEventListener('click',closeImport);by('pfCsvCancel').addEventListener('click',closeImport);
  by('pfCsvPick').addEventListener('click',()=>{fileInput.value='';fileInput.click();});
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files[0];if(!file)return;const sequence=++readSequence;clearPlan();by('pfCsvConfirm').checked=false;by('pfCsvPreview').disabled=true;by('pfCsvConfig').hidden=true;snapshot={owner:getOwner(),revision:getRevision()};
    try{
      if(file.size>MAX_CSV_BYTES)throw Error('CSVは2MB以内にしてください。');const bytes=new Uint8Array(await file.arrayBuffer());if(sequence!==readSequence||snapshot?.owner!==getOwner()||snapshot?.revision!==getRevision())return;
      let text;if(bytes[0]===255&&bytes[1]===254)text=new TextDecoder('utf-16le',{fatal:true}).decode(bytes);else if(bytes[0]===254&&bytes[1]===255)text=new TextDecoder('utf-16be',{fatal:true}).decode(bytes);else{try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('shift_jis',{fatal:true}).decode(bytes);}}
      parsed=parseCSV(text);by('pfCsvFileName').textContent=file.name+' · '+parsed.rows.length+'行';
      const contextErrors=validateJapanCSVContext(parsed);if(contextErrors.length){parsed=null;showErrors(contextErrors);return;}
      by('pfCsvMode').value=getPortfolio().positions.some(p=>p.type==='stock')?'prices':'holdings';const columns=detectColumns(parsed.headers);by('pfCsvMapping').replaceChildren();
      for(const [key,label] of Object.entries({code:'銘柄コード',name:'銘柄名（任意）',quantity:'保有数量',averageCost:'1株あたりの平均購入単価',currentPrice:'1株あたりの現在値'})){
        const wrap=document.createElement('label');wrap.className='pf-field';const title=document.createElement('span');title.textContent=label;const select=document.createElement('select');select.id='pfCsvCol-'+key;select.add(new Option('列を選択 / 使用しない','-1'));parsed.headers.forEach((header,index)=>select.add(new Option(header,String(index))));select.value=String(columns[key]);select.addEventListener('change',clearPlan);wrap.append(title,select);by('pfCsvMapping').append(wrap);
      }
      by('pfCsvConfig').hidden=false;setMode();
    }catch(error){if(sequence!==readSequence||snapshot?.owner!==getOwner()||snapshot?.revision!==getRevision())return;parsed=null;showErrors([{message:error.message||'CSVを読み込めませんでした。文字コードと形式を確認してください。'}]);}
  });
  by('pfCsvMode').addEventListener('change',setMode);
  by('pfCsvConfirm').addEventListener('change',()=>{clearPlan();by('pfCsvPreview').disabled=!by('pfCsvConfirm').checked;});
  by('pfCsvPreview').addEventListener('click',()=>{
    clearPlan();if(!parsed||!by('pfCsvConfirm').checked)return;
    if(snapshot?.owner!==getOwner()||snapshot?.revision!==getRevision()){showErrors([{message:'保有情報または保存先が変更されました。CSVを選び直してください。'}]);return;}
    const mapping=Object.fromEntries(['code','name','quantity','averageCost','currentPrice'].map(key=>[key,Number(by('pfCsvCol-'+key).value)])),mode=by('pfCsvMode').value;
    const result=mappedRows(parsed,mapping,{mode});if(result.errors.length){showErrors(result.errors);return;}
    try{
      plan=buildJapanImportPlan(getPortfolio(),result.items,{mode,companies:catalog?.companies||[]});
      if(plan.errors.length){showErrors(plan.errors);plan=null;return;}
      by('pfCsvPlanRows').innerHTML=plan.changes.slice(0,100).map(c=>'<tr><td><strong>'+esc(c.name)+'</strong><small>'+esc(c.code)+' · '+esc(c.action)+'</small></td><td>'+esc(number.format(c.quantity))+'</td><td>'+esc(yen.format(c.averageCost))+'</td><td><strong>'+esc(yen.format(c.currentPrice))+'</strong>'+(c.previousPrice!==null?'<small>変更前 '+esc(yen.format(c.previousPrice))+'</small>':'')+'</td></tr>').join('');
      by('pfCsvPlanSummary').textContent=plan.changes.length+'銘柄に反映'+(plan.skipped?' · 未登録の'+plan.skipped+'銘柄は更新しません':'')+'。内容を確認してから下のボタンを押してください。';
      by('pfCsvPlan').hidden=false;by('pfCsvApply').disabled=!plan.changes.length;by('pfCsvApply').textContent=plan.changes.length+'銘柄に反映する';
    }catch(error){plan=null;showErrors([{message:error.message||'反映内容を作成できませんでした。'}]);}
  });
  by('pfCsvApply').addEventListener('click',()=>{
    if(!by('pfCsvConfirm').checked||!plan?.positions||!plan.changes.length||snapshot?.owner!==getOwner()||snapshot?.revision!==getRevision()){clearPlan();showErrors([{message:'保有情報または保存先が変更されました。CSVを選び直してください。'}]);return;}
    if(commit(plan.positions)){closeImport();}else{clearPlan();showErrors([{message:'保存できませんでした。保存先と最新の保有情報を確認し、CSVを選び直してください。'}]);}
  });
  by('pfCsvTemplate').addEventListener('click',()=>{
    const blob=new Blob(['\uFEFF銘柄コード,銘柄名,保有数量,平均購入単価,現在値\r\n7203,トヨタ自動車,,,\r\n'],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='HWMarkets-日本株入力用.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  });
  const close=()=>{companyDialog.close();closeImport();};
  window.addEventListener('hw:owner-changed',close);window.addEventListener('storage',event=>{if(event.key===null||String(event.key).startsWith('hwmarkets-portfolio-v1:'))close();});
  return {close};
}
