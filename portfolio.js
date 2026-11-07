import {attachJapanPortfolio} from './portfolio-japan.js';
import {normalizeJapaneseCode} from './portfolio-csv.js';
import {emptyPortfolio,normalizePortfolio,normalizePosition,valuePortfolio,MAX_POSITIONS,portfolioStorageKey as keyFor} from './portfolio-core.js';

const root=document.getElementById('portfolioPage');
const yen=new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0});
const usd=new Intl.NumberFormat('ja-JP',{style:'currency',currency:'USD',maximumFractionDigits:2});
const units=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:12});
const date=value=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(value,currency='JPY')=>value===null?'—':(currency==='JPY'?yen:usd).format(value);
const unitPrice=(value,currency)=>value===null?'—':new Intl.NumberFormat('ja-JP',{style:'currency',currency,maximumFractionDigits:value>0&&value<1?12:2}).format(value);
const signed=(value,currency='JPY')=>value===null?'—':(value>0?'+':'')+money(value,currency);
const gainClass=value=>value===null||value===0?'':value>0?'pf-positive':'pf-negative';
let owner=window.HWWorkspace?.getOwner?.()??null,state=emptyPortfolio(),raw=null,storageError='',notice='',filter='all',editing=null,editSnapshot=null,editOwner=null,undo=null,importDraft=null;
let shown=false,pending=null,quotePayload=null,quoteError='',lastAttempt=0;
const by=id=>document.getElementById(id);

root.innerHTML=`
  <div class="pf-toolbar"><div class="pf-local"><b>この端末に保存</b>保有情報はサーバーへ送信されません。ゲストとアカウント別に管理します。</div><div class="pf-actions"><button class="button" id="pfExport">バックアップ</button><button class="button" id="pfImport">復元</button><button class="button button-primary" id="pfAdd">＋ 保有銘柄を追加</button></div></div>
  <input type="file" id="pfImportFile" accept="application/json,.json" hidden>
  <div class="pf-alert" id="pfNotice" role="status" hidden></div>
  <div class="pf-delete-box" id="pfDeleteBox" hidden></div>
  <div class="pf-alert" id="pfUndoBox" hidden>銘柄を削除しました。<button id="pfUndo">元に戻す</button></div>
  <div class="pf-summary" id="pfSummary">
    <article class="pf-stat"><small>資産評価額 · 円換算</small><strong id="pfTotal">¥0</strong><p id="pfTotalNote">保有資産の現在の評価額</p></article>
    <article class="pf-stat"><small>評価損益</small><strong id="pfGain">¥0</strong><p id="pfGainNote">取得額に対する含み損益</p></article>
    <article class="pf-stat"><small>取得額 · 円換算</small><strong id="pfCost">¥0</strong><p id="pfCount">0 銘柄を保有</p></article>
  </div>
  <div class="pf-overview" id="pfOverview">
    <article class="pf-panel"><div class="pf-section-head"><h2>資産配分</h2><small>現在の評価額で集計</small></div><div class="pf-allocation"><div class="pf-ring" id="pfRing" role="img" aria-label="保有資産なし"><span>保有銘柄<b id="pfRingCount">0</b></span></div><div class="pf-legend"><div><i></i><strong>株式</strong><strong id="pfStockShare">—</strong><small id="pfStockValue">¥0</small></div><div><i class="crypto"></i><strong>暗号資産</strong><strong id="pfCryptoShare">—</strong><small id="pfCryptoValue">¥0</small></div></div></div></article>
    <article class="pf-panel"><div class="pf-section-head"><h2>円換算の設定</h2><small>手入力</small></div><form class="pf-fx" id="pfFxForm"><label for="pfFx">1 USD あたりの円価格</label><div class="pf-row"><input id="pfFx" name="fx" type="number" inputmode="decimal" min="0.000001" max="1000000" step="any" placeholder="例：150.00" required><button class="button" type="submit">保存</button></div><p>USD建て資産がある場合に設定してください。同じレートを取得額と評価額に適用します。為替損益・手数料・税金は含みません。</p></form></article>
  </div>
  <article class="pf-panel pf-holdings"><div class="pf-section-head"><div><h2>保有銘柄</h2><small id="pfRowsCount">0 銘柄</small></div><div class="pf-filter" role="group" aria-label="ポートフォリオの種類"><button data-pf-filter="all" aria-pressed="true">すべて</button><button data-pf-filter="stock" aria-pressed="false">株式</button><button data-pf-filter="crypto" aria-pressed="false">暗号資産</button></div></div><div class="pf-empty" id="pfEmpty"><div class="pf-empty-symbol" aria-hidden="true">◎</div><h3>あなたの資産を、一つの場所に。</h3><p>現物株式と暗号資産の数量・平均購入単価を入力すると、評価額と含み損益、保有割合をまとめて確認できます。</p><button class="button button-primary" id="pfEmptyAdd">最初の銘柄を追加</button></div><div class="pf-table-scroll" id="pfTableWrap" hidden><table class="pf-table"><thead><tr><th scope="col">銘柄</th><th scope="col">保有数量</th><th scope="col">平均購入単価</th><th scope="col">現在価格</th><th scope="col">評価額 / 損益</th><th scope="col">構成比</th><th scope="col">操作</th></tr></thead><tbody id="pfRows"></tbody></table></div><p class="pf-footnote">現物資産の概算管理用です。株式・手入力銘柄は入力またはCSVから取り込んだ現在値、暗号資産の自動価格はCoinMarketCapのUSD集計値で計算します。CSVの時刻は取り込み時刻で、株価の基準時刻ではありません。自動価格が取得できない銘柄や換算レート未設定の資産がある場合、合計・構成比は表示しません。TOP50圏外の暗号資産は手入力へ切り替えられます。</p></article>
  <div class="pf-row pf-status"><span id="pfQuoteStatus" role="status"></span><button class="text-button" id="pfRefresh">暗号資産の価格を更新</button></div>`;

const dialog=document.createElement('dialog');dialog.id='pfDialog';dialog.className='modal pf-dialog';dialog.setAttribute('aria-labelledby','pfDialogTitle');
dialog.innerHTML=`<div class="modal-heading"><div><div class="eyebrow">YOUR PORTFOLIO</div><h2 id="pfDialogTitle">保有銘柄を追加</h2></div><button class="icon-button" id="pfClose" aria-label="保有銘柄の入力を閉じる">✕</button></div><form id="pfForm" class="pf-form"><div class="pf-fields"><label class="pf-field"><span>資産の種類</span><select id="pfType"><option value="stock">株式（現物）</option><option value="crypto">暗号資産</option></select></label><label class="pf-field" id="pfPricingField" hidden><span>現在価格の取得方法</span><select id="pfPricing"><option value="manual">手入力</option><option value="cmc">CoinMarketCap TOP50・自動</option></select></label></div><label class="pf-field" id="pfCoinField" hidden><span>暗号資産を選択</span><select id="pfCoin" disabled><option value="">データを取得中…</option></select><small id="pfCoinHint">TOP50にない銘柄は「手入力」で追加できます。</small></label><div class="pf-fields" id="pfIdentityFields"><label class="pf-field"><span>銘柄名</span><input id="pfName" maxlength="80" placeholder="例：トヨタ自動車" required autocomplete="off"></label><label class="pf-field"><span>銘柄コード / シンボル（任意）</span><input id="pfSymbol" maxlength="30" placeholder="例：7203 / AAPL" autocomplete="off"></label></div><div class="pf-fields"><label class="pf-field"><span>保有数量</span><input id="pfQuantity" type="number" inputmode="decimal" min="0.000000000001" max="1000000000000" step="any" required placeholder="例：100"></label><label class="pf-field"><span>価格の通貨</span><select id="pfCurrency"><option value="JPY">JPY · 日本円</option><option value="USD">USD · 米ドル</option></select></label></div><div class="pf-fields"><label class="pf-field"><span>1株 / 1枚あたりの平均購入単価</span><input id="pfAverage" type="number" inputmode="decimal" min="0" max="1000000000000" step="any" required placeholder="購入時の平均単価"></label><label class="pf-field" id="pfCurrentField"><span>1株 / 1枚あたりの現在価格</span><input id="pfCurrent" type="number" inputmode="decimal" min="0" max="1000000000000" step="any" required placeholder="現在の価格"></label></div><p class="pf-form-note" id="pfFormNote">数量と単価は同じ銘柄・通貨で入力してください。購入単価は1株 / 1枚あたりです。</p><p class="pf-form-error" id="pfFormError" role="alert" hidden></p><div class="modal-actions"><button class="button" id="pfCancel" type="button">キャンセル</button><button class="button button-primary" type="submit">保存する</button></div></form>`;document.body.append(dialog);
const importDialog=document.createElement('dialog');importDialog.className='modal pf-dialog';importDialog.setAttribute('aria-labelledby','pfImportTitle');importDialog.innerHTML='<div class="modal-heading"><h2 id="pfImportTitle">バックアップから復元</h2></div><p class="modal-description" id="pfImportText"></p><div class="modal-actions"><button class="button" id="pfImportCancel">キャンセル</button><button class="button button-primary" id="pfImportApply">置き換えて復元</button></div>';document.body.append(importDialog);

function load(){
  storageError='';notice='';raw=null;state=emptyPortfolio();
  try{raw=localStorage.getItem(keyFor(owner));state=raw===null?emptyPortfolio():normalizePortfolio(JSON.parse(raw));}
  catch{state=emptyPortfolio();storageError='保存データを読み込めません。データの上書きを防ぐため編集を停止しています。バックアップを保存し、正常なバックアップから「復元」するか、ブラウザの保存設定を確認してください。';}
}
function save(next,{recover=false}={}){
  if(storageError&&!recover)return false;
  try{
    if(localStorage.getItem(keyFor(owner))!==raw){load();notice='別のタブでデータが変更されました。最新の状態を読み込みました。もう一度操作してください。';render();return false;}
    const normalized=normalizePortfolio(next),text=JSON.stringify(normalized);localStorage.setItem(keyFor(owner),text);raw=text;state=normalized;storageError='';notice='この端末に保存しました。';return true;
  }catch{notice='保存できませんでした。ブラウザの保存容量・設定を確認してください。入力した内容はまだ保存されていません。';render();return false;}
}
function quotes(){
  if(!quotePayload||Date.now()-Date.parse(quotePayload.fetchedAt)>30*60*1000)return new Map();
  return new Map(quotePayload.coins.filter(c=>Date.now()-Date.parse(c.updatedAt)<=30*60*1000&&Date.parse(c.updatedAt)<=Date.now()+60000).map(c=>[c.id,c]));
}
function render(){
  const result=valuePortfolio(state,quotes()),has=state.positions.length>0;
  by('pfNotice').hidden=!(storageError||notice);by('pfNotice').textContent=storageError||notice;by('pfNotice').classList.toggle('error',Boolean(storageError));
  by('pfNotice').classList.toggle('pf-saved',!storageError&&notice==='この端末に保存しました。');
  by('pfAdd').disabled=Boolean(storageError)||state.positions.length>=MAX_POSITIONS;by('pfEmptyAdd').disabled=Boolean(storageError);by('pfFxForm').querySelector('button').disabled=Boolean(storageError);
  if(document.activeElement!==by('pfFx'))by('pfFx').value=state.usdJpy??'';
  by('pfSummary').hidden=!has;by('pfOverview').hidden=false;
  by('pfTotal').textContent=result.complete?money(result.value):'—';by('pfGain').textContent=result.complete?signed(result.gain):'—';by('pfCost').textContent=result.complete?money(result.cost):'—';
  by('pfGain').className=result.complete?gainClass(result.gain):'';
  by('pfTotalNote').textContent=result.complete?'保有資産の現在の評価額':result.missing+'銘柄で価格または円換算レートを確認してください';
  by('pfGainNote').textContent=result.complete?(result.gainPercent===null?'取得額が0のため損益率は計算できません':(result.gainPercent>0?'+':'')+result.gainPercent.toFixed(2)+'% · 取得額に対する含み損益'):'合計はすべての価格がそろうと表示します';
  by('pfCount').textContent=state.positions.length+' 銘柄を保有';by('pfRingCount').textContent=state.positions.length;
  const allocation=result.complete&&result.value>0,share=allocation?result.groups.stock/result.value*100:0;
  by('pfRing').style.background=allocation?'conic-gradient(#58e1bd 0% '+share+'%, #799df5 '+share+'% 100%)':'#273342';
  by('pfRing').setAttribute('aria-label',allocation?'資産配分：株式'+share.toFixed(1)+'%、暗号資産'+(100-share).toFixed(1)+'%':has?'配分は価格と換算レートがそろうと表示します':'保有資産なし');
  by('pfStockShare').textContent=allocation?share.toFixed(1)+'%':'—';by('pfCryptoShare').textContent=allocation?(100-share).toFixed(1)+'%':'—';
  by('pfStockValue').textContent=result.complete?money(result.groups.stock):'集計待ち';by('pfCryptoValue').textContent=result.complete?money(result.groups.crypto):'集計待ち';
  const rows=result.rows.filter(p=>filter==='all'||p.type===filter);by('pfRowsCount').textContent=rows.length+' / '+state.positions.length+' 銘柄';by('pfTableWrap').hidden=!rows.length;by('pfEmpty').hidden=Boolean(rows.length);
  by('pfEmpty').querySelector('h3').textContent=has?'この種類の保有銘柄はありません':'あなたの資産を、一つの場所に。';
  by('pfRows').innerHTML=rows.map(p=>{
    const ratio=allocation&&p.value!==null?(p.value/result.value*100).toFixed(1)+'%':'—';
    const priceNote=p.pricing==='cmc'?(p.price===null?'価格未取得 / TOP50対象を確認':date(p.quoteAt)+' JST · CMC'):p.priceSource==='csv'?'CSV取込 '+date(p.priceImportedAt)+' JST':'手入力';
    return `<tr><td><div class="pf-identity"><span class="pf-asset-icon ${p.type==='crypto'?'crypto':''}" aria-hidden="true">${p.type==='crypto'?'COIN':'株'}</span><div><strong>${esc(p.name)}</strong><small>${esc(p.symbol||'コード未設定')} · ${p.type==='stock'?'現物株式':'暗号資産'}</small></div></div></td><td>${esc(units.format(p.quantity))}</td><td>${esc(unitPrice(p.averageCost,p.currency))}<small>${p.currency}</small></td><td>${esc(unitPrice(p.price,p.currency))}<small>${esc(priceNote)}</small></td><td><strong>${esc(money(p.nativeValue,p.currency))}</strong><small class="${gainClass(p.nativeGain)}">${esc(signed(p.nativeGain,p.currency))}</small>${p.currency==='USD'?'<small>'+esc(p.value===null?'円換算待ち':money(p.value)+' 円換算')+'</small>':''}</td><td>${ratio}</td><td><div class="pf-row-actions"><button data-pf-edit="${p.id}" aria-label="${esc(p.name)}の保有情報を編集">編集</button><button data-pf-delete="${p.id}" aria-label="${esc(p.name)}の保有情報を削除">削除</button></div></td></tr>`;
  }).join('');
  by('pfUndoBox').hidden=!undo;
  const automatic=state.positions.some(p=>p.pricing==='cmc');
  const status=by('pfQuoteStatus');
  let statusText;
  if(pending) statusText='暗号資産の価格を取得中…';
  else if(quotePayload){
    const when=date(quotePayload.fetchedAt)+' JST';
    if(quoteError) statusText='再取得に失敗しました。最終取得（前回成功） '+when+' の値を表示しています。これは最新ではありません。';
    else if(quotePayload.stale) statusText='提供元の再取得に失敗したため、最終取得（前回成功） '+when+' の値を表示しています。これは最新ではありません。';
    else if(!quotes().size) statusText='最終取得 '+when+' · 有効期限切れのため自動価格には使っていません。更新してください。';
    else statusText='最終取得 '+when+' · 表示はこの取得時点のCoinMarketCapの値です';
  } else if(quoteError) statusText=quoteError;
  else if(automatic) statusText='暗号資産の価格を取得してください。';
  else statusText='暗号資産の自動価格はCoinMarketCapのTOP50に対応。株式の価格は手入力です。';
  status.textContent=statusText;
  status.classList.toggle('is-stale', Boolean(quotePayload&&(quoteError||quotePayload.stale)));
  by('pfRefresh').disabled=Boolean(pending);
  root.querySelectorAll('[data-pf-filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.pfFilter===filter));
}
async function refresh({force=false}={}){
  if(pending)return pending;if(!force&&Date.now()-lastAttempt<60*1000)return;lastAttempt=Date.now();quoteError='';
  pending=(async()=>{
    try{
      // Fetch the same whole public ranking for everyone. Never send positions, quantities, or costs.
      const response=await fetch('/api/crypto-top50',{headers:{Accept:'application/json'},credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();
      const data=await response.json();
      if(data.source!=='CoinMarketCap'||data.currency!=='USD'||!Array.isArray(data.coins)||data.coins.length!==50||!Number.isFinite(Date.parse(data.fetchedAt))||Date.parse(data.fetchedAt)>Date.now()+60000||data.coins.some(c=>!Number.isSafeInteger(c.id)||c.id<1||typeof c.name!=='string'||c.name.length>80||typeof c.symbol!=='string'||c.symbol.length>30||!(c.price===null||(typeof c.price==='number'&&Number.isFinite(c.price)&&c.price>=0&&c.price<=1e12))||!Number.isFinite(Date.parse(c.updatedAt))))throw Error();
      if(new Set(data.coins.map(c=>c.id)).size!==data.coins.length)throw Error();quotePayload=data;
    }catch{quoteError='暗号資産の価格を取得できません。更新ボタンから再試行してください。';}
    finally{pending=null;render();if(dialog.open)fillCoins();}
  })();render();return pending;
}
function fillCoins(){
  const select=by('pfCoin'),previous=select.value||String(editing?.coinId||'');select.replaceChildren();
  const coins=quotePayload?.coins||[];select.add(new Option(coins.length?'銘柄を選択してください':'取得できません。「手入力」も利用できます。',''));
  if(editing?.pricing==='cmc'&&!coins.some(c=>c.id===editing.coinId))select.add(new Option(editing.name+' · 保存済み / 現在価格なし',String(editing.coinId)));
  coins.forEach(c=>select.add(new Option(c.name+' · '+c.symbol,String(c.id))));select.value=previous;select.disabled=!coins.length&&editing?.pricing!=='cmc';
  by('pfCoinHint').textContent=quoteError||'CoinMarketCap TOP50から選択。購入単価もUSDで入力してください。';
}
function formMode(){
  const crypto=by('pfType').value==='crypto',cmc=crypto&&by('pfPricing').value==='cmc';
  by('pfPricingField').hidden=!crypto;by('pfCoinField').hidden=!cmc;by('pfIdentityFields').hidden=cmc;by('pfCurrentField').hidden=cmc;
  by('pfName').required=!cmc;by('pfCurrent').required=!cmc;by('pfCoin').required=cmc;
  by('pfCurrent').disabled=cmc;
  by('pfCurrency').disabled=cmc;if(cmc)by('pfCurrency').value='USD';
  by('pfFormNote').textContent=cmc?'保有数量と平均購入単価は1枚あたりのUSDで入力してください。現在価格は自動取得します。':'数量と単価は同じ銘柄・通貨で入力してください。購入単価は1株 / 1枚あたりです。';
}
function openForm(position=null,preset=null){
  if(storageError)return;if(!position&&state.positions.length>=MAX_POSITIONS){notice='保有銘柄は100件までです。不要な銘柄を整理してから追加してください。';render();return;}editing=position;editOwner=owner;editSnapshot=raw;by('pfForm').reset();by('pfFormError').hidden=true;
  by('pfDialogTitle').textContent=position?'保有銘柄を編集':'保有銘柄を追加';
  by('pfType').value=position?.type||'stock';by('pfPricing').value=position?.pricing||'manual';by('pfName').value=position?.name||'';by('pfSymbol').value=position?.symbol||'';by('pfQuantity').value=position?.quantity??'';by('pfAverage').value=position?.averageCost??'';by('pfCurrent').value=position?.currentPrice??'';by('pfCurrency').value=position?.currency||'JPY';
  if(preset){by('pfName').value=preset.name;by('pfSymbol').value=preset.code;by('pfCurrency').value='JPY';}
  fillCoins();formMode();dialog.showModal();by(preset?'pfQuantity':'pfType').focus();if(!quotePayload)refresh();
}
by('pfType').addEventListener('change',()=>{if(by('pfType').value==='crypto'&&!editing)by('pfPricing').value='cmc';formMode();});by('pfPricing').addEventListener('change',formMode);
by('pfClose').addEventListener('click',()=>dialog.close());by('pfCancel').addEventListener('click',()=>dialog.close());
by('pfAdd').addEventListener('click',()=>openForm());by('pfEmptyAdd').addEventListener('click',()=>openForm());
by('pfForm').addEventListener('submit',event=>{
  event.preventDefault();by('pfFormError').hidden=true;
  try{
    if(owner!==editOwner||raw!==editSnapshot)throw Error('保存先またはデータが変更されました。閉じてからもう一度入力してください。');
    const type=by('pfType').value,pricing=type==='crypto'?by('pfPricing').value:'manual',cmc=pricing==='cmc',coinId=cmc?Number(by('pfCoin').value):null;
    const coin=quotePayload?.coins.find(c=>c.id===coinId)||(editing?.coinId===coinId?editing:null);if(cmc&&!coin)throw Error('暗号資産を選択してください。');
    const currency=cmc?'USD':by('pfCurrency').value,currentPrice=cmc?0:Number(by('pfCurrent').value),stockCode=type==='stock'&&currency==='JPY'?normalizeJapaneseCode(by('pfSymbol').value):null;
    const retainCSV=editing?.priceSource==='csv'&&type==='stock'&&currency==='JPY'&&stockCode===editing.stockCode&&currentPrice===editing.currentPrice;
    const position=normalizePosition({id:editing?.id||crypto.randomUUID(),type,pricing,coinId,name:cmc?coin.name:by('pfName').value,symbol:cmc?coin.symbol:by('pfSymbol').value,quantity:Number(by('pfQuantity').value),averageCost:Number(by('pfAverage').value),currentPrice,currency,stockCode,priceSource:retainCSV?'csv':'manual',priceImportedAt:retainCSV?editing.priceImportedAt:null});
    const positions=editing?state.positions.map(p=>p.id===editing.id?position:p):[...state.positions,position];
    if(!save({...state,positions}))throw Error(notice||'保存できませんでした。');undo=null;by('pfDeleteBox').hidden=true;dialog.close();render();by('pfAdd').focus();
  }catch(error){by('pfFormError').textContent=error.message;by('pfFormError').hidden=false;}
});
by('pfFxForm').addEventListener('submit',event=>{event.preventDefault();const rate=Number(by('pfFx').value);if(!(Number.isFinite(rate)&&rate>0&&rate<=1e6))return;if(save({...state,usdJpy:rate})){undo=null;render();}});
root.addEventListener('click',event=>{
  const edit=event.target.closest('[data-pf-edit]'),remove=event.target.closest('[data-pf-delete]'),tab=event.target.closest('[data-pf-filter]');
  if(edit)openForm(state.positions.find(p=>p.id===edit.dataset.pfEdit));
  if(tab){filter=tab.dataset.pfFilter;render();}
  if(remove){const position=state.positions.find(p=>p.id===remove.dataset.pfDelete);if(!position||storageError)return;const box=by('pfDeleteBox');box.replaceChildren();const text=document.createElement('p');text.textContent=position.name+'の保有情報を削除しますか？';const actions=document.createElement('div');actions.className='pf-actions';const cancel=document.createElement('button');cancel.className='button';cancel.textContent='キャンセル';cancel.addEventListener('click',()=>box.hidden=true);const yes=document.createElement('button');yes.className='button';yes.textContent='削除する';yes.addEventListener('click',()=>{const index=state.positions.findIndex(p=>p.id===position.id);if(index<0)return;if(save({...state,positions:state.positions.filter(p=>p.id!==position.id)})){undo={position,index,owner};box.hidden=true;notice='';render();}});actions.append(cancel,yes);box.append(text,actions);box.hidden=false;cancel.focus();}
});
by('pfUndo').addEventListener('click',()=>{if(!undo||undo.owner!==owner||state.positions.some(p=>p.id===undo.position.id))return;const positions=[...state.positions];positions.splice(undo.index,0,undo.position);if(save({...state,positions})){undo=null;render();}});
by('pfRefresh').addEventListener('click',()=>refresh({force:true}));
by('pfExport').addEventListener('click',()=>{
  const text=storageError?raw:JSON.stringify(state,null,2);if(text===null){notice='保存データを読み出せないため、バックアップできませんでした。';render();return;}
  const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='HWMarkets-portfolio-'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notice='バックアップには保有数量・購入単価が含まれます。安全な場所に保管してください。';render();
});
by('pfImport').addEventListener('click',()=>{by('pfImportFile').value='';by('pfImportFile').click();});
by('pfImportFile').addEventListener('change',async()=>{
  const file=by('pfImportFile').files[0];if(!file)return;const expectedOwner=owner,expectedRaw=raw;
  try{if(file.size>256000)throw Error();const value=normalizePortfolio(JSON.parse(await file.text()));if(owner!==expectedOwner||raw!==expectedRaw)return;importDraft={state:value,owner,raw};by('pfImportText').textContent=value.positions.length+'銘柄のバックアップを読み込みました。'+(storageError?'読み込めない現在の保存データ':('現在の'+state.positions.length+'銘柄と換算レート'))+'を置き換えます。先にバックアップを保存しておくことをおすすめします。';importDialog.showModal();}
  catch{notice='このファイルを復元できません。HWMarketsのポートフォリオ用バックアップを選んでください。';render();}
});
by('pfImportCancel').addEventListener('click',()=>{importDraft=null;importDialog.close();});by('pfImportApply').addEventListener('click',()=>{if(!importDraft||owner!==importDraft.owner||raw!==importDraft.raw){importDialog.close();return;}if(save(importDraft.state,{recover:true})){undo=null;importDialog.close();importDraft=null;render();}});
function switchOwner(){owner=window.HWWorkspace?.getOwner?.()??null;undo=null;editing=null;dialog.close();importDialog.close();by('pfDeleteBox').hidden=true;load();render();}
window.addEventListener('hw:owner-changed',switchOwner);
window.addEventListener('storage',event=>{if(event.key!==keyFor(owner)&&event.key!==null)return;dialog.close();importDialog.close();undo=null;by('pfDeleteBox').hidden=true;load();notice='別のタブの変更を読み込みました。';render();});
load();render();
const japanTools=attachJapanPortfolio({root,getPortfolio:()=>state,getOwner:()=>owner,getRevision:()=>raw,commit:positions=>{if(!save({...state,positions}))return false;undo=null;by('pfDeleteBox').hidden=true;render();return true;},onCompany:company=>openForm(null,company)});
window.HWPortfolio=Object.freeze({show(){shown=true;render();refresh();},hide(){shown=false;dialog.close();importDialog.close();japanTools.close();},refresh:()=>refresh({force:true})});
if(location.hash==='#portfolio'){shown=true;refresh();}
setInterval(()=>{if(shown&&!document.hidden){render();refresh();}},5*60*1000);

