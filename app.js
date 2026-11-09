'use strict';

const ICONS = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  star:'<path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  chart:'<path d="M4 3v17h17M7 14l4-5 4 3 5-7"/>',
  exchange:'<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  bitcoin:'<circle cx="12" cy="12" r="9"/><path d="M9 6v12m-2-10h7a3 3 0 0 1 0 6H9m0-2h6a3 3 0 0 1 0 6H7m4-12V4m3 2V4m-3 16v-2m3 2v-2"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 11.5-2L20 8M4 16l2.5 3A7 7 0 0 0 18 17"/>',
  settings:'<path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 2-1 4 1 3-3-1-3 2-3-2-4-4-1-2-2H9Z"/><circle cx="11" cy="11" r="3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow:'<path d="M6 18 18 6M6 6h12v12"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>'
};
function icon(name) {return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.chart}</svg>`;}
document.querySelectorAll('[data-icon]').forEach(el => {el.innerHTML = icon(el.dataset.icon);});

const MARKETS = [
  {id:'nikkei',name:'日本225',symbol:'OANDA:JP225USD',short:'JP225USD',flag:'JP',category:'indices',region:'japan',detail:'日本 / 指数CFD'},
  {id:'sp500',name:'S&P 500',symbol:'FOREXCOM:SPXUSD',short:'SPXUSD',flag:'US',category:'indices',region:'us',detail:'米国 / 指数CFD'},
  {id:'dow',name:'米国30',symbol:'FOREXCOM:DJI',short:'DJI',flag:'US',category:'indices',region:'us',detail:'米国 / 指数CFD'},
  {id:'nasdaq',name:'NASDAQ 100',symbol:'OANDA:NAS100USD',short:'NAS100USD',flag:'US',category:'indices',region:'us',detail:'米国 / 指数CFD'},
  {id:'dax',name:'ドイツ40',symbol:'OANDA:DE30EUR',short:'DE30EUR',flag:'DE',category:'indices',region:'europe',detail:'ドイツ / 指数CFD'},
  {id:'ftse',name:'英国100',symbol:'OANDA:UK100GBP',short:'UK100GBP',flag:'GB',category:'indices',region:'europe',detail:'英国 / 指数CFD'},
  {id:'usdjpy',name:'米ドル / 円',symbol:'FX:USDJPY',short:'USDJPY',flag:'FX',category:'forex',region:'global',detail:'外国為替 / USD・JPY'},
  {id:'bitcoin',name:'ビットコイン',symbol:'BITSTAMP:BTCUSD',short:'BTCUSD',flag:'₿',category:'crypto',region:'global',detail:'暗号資産 / BTC・USD'},
  {id:'hangseng',name:'香港33',symbol:'OANDA:HK33HKD',short:'HK33HKD',flag:'HK',category:'indices',region:'asia',detail:'香港 / 指数CFD'},
  {id:'shanghai',name:'中国A50',symbol:'OANDA:CN50USD',short:'CN50USD',flag:'CN',category:'indices',region:'asia',detail:'中国 / 指数CFD'},
  {id:'eurusd',name:'ユーロ / 米ドル',symbol:'FX:EURUSD',short:'EURUSD',flag:'EU',category:'forex',region:'global',detail:'外国為替 / EUR・USD'},
  {id:'gbpjpy',name:'英ポンド / 円',symbol:'FX:GBPJPY',short:'GBPJPY',flag:'GB',category:'forex',region:'global',detail:'外国為替 / GBP・JPY'},
  {id:'ethereum',name:'イーサリアム',symbol:'BITSTAMP:ETHUSD',short:'ETHUSD',flag:'Ξ',category:'crypto',region:'global',detail:'暗号資産 / ETH・USD'},
  {id:'gold',name:'ゴールド',symbol:'OANDA:XAUUSD',short:'XAUUSD',flag:'Au',category:'commodities',region:'global',detail:'コモディティ / 金CFD'},
  {id:'oil',name:'WTI原油',symbol:'OANDA:WTICOUSD',short:'WTICOUSD',flag:'Oil',category:'commodities',region:'global',detail:'コモディティ / 原油CFD'},
  {id:'silver',name:'シルバー',symbol:'OANDA:XAGUSD',short:'XAGUSD',flag:'Ag',category:'commodities',region:'global',detail:'コモディティ / 銀CFD'},
  {id:'eurjpy',name:'ユーロ / 円',symbol:'FX:EURJPY',short:'EURJPY',flag:'EU',category:'forex',region:'global',detail:'外国為替 / EUR・JPY'},
  {id:'audjpy',name:'豪ドル / 円',symbol:'FX:AUDJPY',short:'AUDJPY',flag:'AU',category:'forex',region:'global',detail:'外国為替 / AUD・JPY'},
  {id:'nzdjpy',name:'NZドル / 円',symbol:'FX:NZDJPY',short:'NZDJPY',flag:'NZ',category:'forex',region:'global',detail:'外国為替 / NZD・JPY'},
  {id:'cadjpy',name:'カナダドル / 円',symbol:'FX:CADJPY',short:'CADJPY',flag:'CA',category:'forex',region:'global',detail:'外国為替 / CAD・JPY'},
  {id:'chfjpy',name:'スイスフラン / 円',symbol:'FX:CHFJPY',short:'CHFJPY',flag:'CH',category:'forex',region:'global',detail:'外国為替 / CHF・JPY'},
  {id:'zarjpy',name:'南アフリカランド / 円',symbol:'FX:ZARJPY',short:'ZARJPY',flag:'ZA',category:'forex',region:'global',detail:'外国為替 / ZAR・JPY'},
  {id:'gbpusd',name:'英ポンド / 米ドル',symbol:'FX:GBPUSD',short:'GBPUSD',flag:'GB',category:'forex',region:'global',detail:'外国為替 / GBP・USD'},
  {id:'audusd',name:'豪ドル / 米ドル',symbol:'FX:AUDUSD',short:'AUDUSD',flag:'AU',category:'forex',region:'global',detail:'外国為替 / AUD・USD'},
  {id:'nzdusd',name:'NZドル / 米ドル',symbol:'FX:NZDUSD',short:'NZDUSD',flag:'NZ',category:'forex',region:'global',detail:'外国為替 / NZD・USD'},
  {id:'usdcad',name:'米ドル / カナダドル',symbol:'FX:USDCAD',short:'USDCAD',flag:'FX',category:'forex',region:'global',detail:'外国為替 / USD・CAD'},
  {id:'usdchf',name:'米ドル / スイスフラン',symbol:'FX:USDCHF',short:'USDCHF',flag:'FX',category:'forex',region:'global',detail:'外国為替 / USD・CHF'},
  {id:'eurgbp',name:'ユーロ / 英ポンド',symbol:'FX:EURGBP',short:'EURGBP',flag:'EU',category:'forex',region:'global',detail:'外国為替 / EUR・GBP'},
  {id:'euraud',name:'ユーロ / 豪ドル',symbol:'FX:EURAUD',short:'EURAUD',flag:'EU',category:'forex',region:'global',detail:'外国為替 / EUR・AUD'},
  {id:'gbpaud',name:'英ポンド / 豪ドル',symbol:'FX:GBPAUD',short:'GBPAUD',flag:'GB',category:'forex',region:'global',detail:'外国為替 / GBP・AUD'},
  {id:'audnzd',name:'豪ドル / NZドル',symbol:'FX:AUDNZD',short:'AUDNZD',flag:'AU',category:'forex',region:'global',detail:'外国為替 / AUD・NZD'}
];
const DEFAULT_BOARD = MARKETS.slice(0,8).map(m=>m.id);
const DEFAULT_FAVORITES = ['nikkei','sp500','usdjpy'];
const CATEGORY = {indices:'株価指数',forex:'為替',crypto:'暗号資産',dex:'株式・指数先物',commodities:'商品'};
const STORAGE_KEY='orbit-markets-v1';
const $ = id=>document.getElementById(id);
const validIds = value=>Array.isArray(value)?[...new Set(value.filter(id=>MARKETS.some(m=>m.id===id)))]:null;
const validFuture=id=>typeof id==='string'&&/^xyz:[A-Za-z0-9_.-]{1,40}$/.test(id);
const validCrypto=id=>Number.isSafeInteger(id)&&id>0&&id<=2147483647;
const watchIds=(value,valid,max)=>Array.isArray(value)?[...new Set(value.filter(valid))].slice(0,max):[];
function normalizePreferences(value){
  const saved=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return {
    board:validIds(saved.board) ?? [...DEFAULT_BOARD],
    favorites:validIds(saved.favorites) ?? [...DEFAULT_FAVORITES],
    futuresFavorites:watchIds(saved.futuresFavorites,validFuture,100),
    cryptoFavorites:watchIds(saved.cryptoFavorites,validCrypto,50),
    watchView:saved.watchView==='list'?'list':'charts',
    compact:saved.compact===true,
    focusId:MARKETS.some(m=>m.id===saved.focusId)?saved.focusId:'nikkei'
  };
}
function immutablePreferences(value){
  const prefs=normalizePreferences(value);
  Object.freeze(prefs.board);Object.freeze(prefs.favorites);
  Object.freeze(prefs.futuresFavorites);Object.freeze(prefs.cryptoFavorites);
  return Object.freeze(prefs);
}
// Retain a session-local fallback when the browser blocks or fills localStorage.
const preferenceCache=new Map(),syncAckCache=new Map();
function readStoredRecord(key){
  try{
    const stored=localStorage.getItem(key);
    const value=stored===null?{}:JSON.parse(stored);
    const record={preferences:normalizePreferences(value),revision:typeof value?._syncRevision==='string'?value._syncRevision:null};
    preferenceCache.set(key,record);return record;
  }catch{}
  return preferenceCache.get(key)||{preferences:normalizePreferences(null),revision:null};
}
const readStoredPreferences=key=>readStoredRecord(key).preferences;
function writeStoredRecord(key,record){
  preferenceCache.set(key,record);
  try{localStorage.setItem(key,JSON.stringify({...record.preferences,...(record.revision?{_syncRevision:record.revision}:{})}));}catch{}
}
const samePreferences=(a,b)=>JSON.stringify(normalizePreferences(a))===JSON.stringify(normalizePreferences(b));
const syncKeyFor=owner=>'hwmarkets-account-sync-v1:'+encodeURIComponent(owner);
function readSyncAck(owner){
  const key=syncKeyFor(owner);
  try{const revision=localStorage.getItem(key);syncAckCache.set(key,revision);return revision;}catch{return syncAckCache.get(key)||null;}
}
const newRevision=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function mergePreferences(base,local,latest){
  const result={...latest};
  for(const [key,max] of [['board',MARKETS.length],['favorites',MARKETS.length],['futuresFavorites',100],['cryptoFavorites',50]]){
    const removed=new Set(base[key].filter(id=>!local[key].includes(id)));
    result[key]=[...latest[key].filter(id=>!removed.has(id)),...local[key].filter(id=>!base[key].includes(id)&&!latest[key].includes(id))].slice(0,max);
  }
  for(const key of ['compact','focusId','watchView'])if(local[key]!==base[key])result[key]=local[key];
  return normalizePreferences(result);
}
let workspaceOwner=null;
const storageKeyFor=owner=>owner===null?STORAGE_KEY:'hwmarkets-account-v1:'+encodeURIComponent(owner);
const saved=readStoredPreferences(STORAGE_KEY);
let knownPreferences=immutablePreferences(saved);
let board=saved.board,favorites=saved.favorites,compact=saved.compact,futuresFavorites=saved.futuresFavorites,cryptoFavorites=saved.cryptoFavorites;
let watchClass='futures';
let watchView=saved.watchView;
let page='all', filter='all', query='', focusId=saved.focusId, range='1M';
let toastTimeout, searchTimeout;
let widgetObserver,chartNeedsRefresh=false;
function getPreferences(){return immutablePreferences({board,favorites,futuresFavorites,cryptoFavorites,watchView,compact,focusId});}
function adoptPreferences(value){
  const prefs=normalizePreferences(value);
  board=prefs.board;favorites=prefs.favorites;futuresFavorites=prefs.futuresFavorites;cryptoFavorites=prefs.cryptoFavorites;watchView=prefs.watchView;compact=prefs.compact;focusId=prefs.focusId;
  knownPreferences=immutablePreferences(prefs);
}
function getSyncSnapshot(){
  const record=readStoredRecord(storageKeyFor(workspaceOwner));
  const changed=!samePreferences(getPreferences(),record.preferences);
  adoptPreferences(record.preferences);if(changed)repaintPreferences();
  return {preferences:getPreferences(),revision:record.revision,pending:workspaceOwner!==null&&!!record.revision&&readSyncAck(workspaceOwner)!==record.revision};
}
function hasPendingSync(){
  if(workspaceOwner===null)return false;
  const record=readStoredRecord(storageKeyFor(workspaceOwner));
  return !!record.revision&&readSyncAck(workspaceOwner)!==record.revision;
}
function acknowledgeSync(snapshot){
  if(workspaceOwner===null||!snapshot?.revision)return !hasPendingSync();
  // Acknowledgements never rewrite preferences: a late response cannot erase a newer edit.
  const key=syncKeyFor(workspaceOwner);syncAckCache.set(key,snapshot.revision);
  try{localStorage.setItem(key,snapshot.revision);}catch{}
  return !hasPendingSync();
}
function updateWatchView(){
  document.querySelectorAll('[data-watch-view]').forEach(b=>{const active=b.dataset.watchView===watchView;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  if($('watchViewBar'))$('watchViewBar').hidden=watchClass==='standard';
}
function setWatchView(value){if(!['list','charts'].includes(value))return;watchView=value;persist();updateWatchView();window.dispatchEvent(new Event('hw:watchlists-changed'));}
function updateWatchCounts(){
  $('watchCount').textContent=favorites.length+futuresFavorites.length+cryptoFavorites.length;
  document.querySelectorAll('[data-watch-class]').forEach(b=>{const key=b.dataset.watchClass,active=key===watchClass;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);b.querySelector('span').textContent=key==='futures'?futuresFavorites.length:key==='crypto'?cryptoFavorites.length:favorites.length;});
}
function toggleWatch(kind,id){
  if(kind!=='futures'&&kind!=='crypto')return false;
  const isFuture=kind==='futures',valid=isFuture?validFuture:validCrypto;
  if(!valid(id))return false;
  const list=isFuture?futuresFavorites:cryptoFavorites,active=!list.includes(id);
  if(active&&list.length>=(isFuture?100:50)){toast('登録できる上限に達しています。不要な銘柄の星を外してください。');return false;}
  const next=active?[...list,id]:list.filter(item=>item!==id);
  if(isFuture)futuresFavorites=next;else cryptoFavorites=next;
  persist();updateWatchCounts();window.dispatchEvent(new Event('hw:watchlists-changed'));
  if(active&&!(isFuture?futuresFavorites:cryptoFavorites).includes(id)){toast('登録できる上限に達しています。不要な銘柄の星を外してください。');return false;}
  toast(active?'ウォッチリストに追加しました':'ウォッチリストから削除しました');
  return true;
}
function persist({notify=true}={}){
  const local=getPreferences(),key=storageKeyFor(workspaceOwner),latest=readStoredRecord(key);
  const preferences=immutablePreferences(mergePreferences(knownPreferences,local,latest.preferences));
  const changed=!samePreferences(preferences,latest.preferences);
  const revision=workspaceOwner!==null&&changed?newRevision():latest.revision;
  writeStoredRecord(key,{preferences,revision});adoptPreferences(preferences);
  if(!samePreferences(local,preferences))repaintPreferences();
  if(notify)window.dispatchEvent(new CustomEvent('hw:preferences-changed',{detail:Object.freeze({owner:workspaceOwner,preferences})}));
  return preferences;
}
function repaintPreferences(){
  updateWatchCounts();
  updateWatchView();
  applyLayout();
  if(page!=='portfolio'&&page!=='crypto'&&page!=='dex'&&(page!=='watchlist'||watchClass==='standard'))renderMarkets();
  if($('addDialog').open)renderPicker();
  $('chartSymbol').value=focusId;
  chartNeedsRefresh=true;
  if(page!=='portfolio'&&page!=='dex'&&(page!=='watchlist'||watchClass==='standard'))renderMainChart();
  window.dispatchEvent(new Event('hw:watchlists-changed'));
}
function applyPreferences(value,{notify=false,fromCloud=false}={}){
  if(fromCloud&&hasPendingSync())return getSyncSnapshot().preferences;
  const snapshot=immutablePreferences(value);
  writeStoredRecord(storageKeyFor(workspaceOwner),{preferences:snapshot,revision:workspaceOwner!==null&&!fromCloud?newRevision():null});
  adoptPreferences(snapshot);
  repaintPreferences();
  if(notify)window.dispatchEvent(new CustomEvent('hw:preferences-changed',{detail:Object.freeze({owner:workspaceOwner,preferences:snapshot})}));
  return snapshot;
}
function setWorkspaceOwner(userId){
  if(userId!==null&&(typeof userId!=='string'||!userId.trim()||userId.length>512))throw new TypeError('Invalid workspace owner');
  // Check encoding before changing identity; malformed strings must not select a guest workspace.
  const key=storageKeyFor(userId);
  if(userId===workspaceOwner)return getPreferences();
  persist({notify:false});
  workspaceOwner=userId;
  adoptPreferences(readStoredPreferences(key));repaintPreferences();
  window.dispatchEvent(new Event('hw:owner-changed'));
  return getPreferences();
}
window.addEventListener('storage',event=>{
  if(event.storageArea&&event.storageArea!==localStorage)return;
  if(event.key!==null&&event.key!==storageKeyFor(workspaceOwner)&&(workspaceOwner===null||event.key!==syncKeyFor(workspaceOwner)))return;
  const snapshot=getSyncSnapshot();
  window.dispatchEvent(new CustomEvent('hw:preferences-external',{detail:{owner:workspaceOwner,...snapshot}}));
});
window.HWWorkspace=Object.freeze({
  getPreferences,
  getSyncSnapshot,hasPendingSync,acknowledgeSync,
  getOwner:()=>workspaceOwner,
  getGuestPreferences:()=>workspaceOwner===null?getPreferences():immutablePreferences(readStoredPreferences(STORAGE_KEY)),
  applyPreferences,
  getWatchlist:kind=>Object.freeze([...(kind==='futures'?futuresFavorites:kind==='crypto'?cryptoFavorites:[])]),
  getWatchView:()=>watchView,
  toggleWatch,
  openMarketPage:next=>{if(['dex','crypto','watchlist'].includes(next))setPage(next);},
  setOwner:setWorkspaceOwner
});
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function tvUrl(m){return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(m.symbol)}`;}
/*
National flag SVGs adapted from https://github.com/lipis/flag-icons (flags/4x3).
The MIT License (MIT)

Copyright (c) 2013 Panayiotis Lipiridis

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const COUNTRY_FLAGS = {
  "JP": {
    "label": "日本の国旗",
    "svg": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" id=\"flag-icons-jp\" viewBox=\"0 0 640 480\">\n  <defs>\n    <clipPath id=\"jp-a\">\n      <path fill-opacity=\".7\" d=\"M-88 32h640v480H-88z\"/>\n    </clipPath>\n  </defs>\n  <g fill-rule=\"evenodd\" stroke-width=\"1pt\" clip-path=\"url(#jp-a)\" transform=\"translate(88 -32)\">\n    <path fill=\"#fff\" d=\"M-128 32h720v480h-720z\"/>\n    <circle cx=\"523.1\" cy=\"344.1\" r=\"194.9\" fill=\"#bc002d\" transform=\"translate(-168.4 8.6)scale(.76554)\"/>\n  </g>\n</svg>"
  },
  "US": {
    "label": "アメリカ合衆国の国旗",
    "svg": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" id=\"flag-icons-us\" viewBox=\"0 0 640 480\">\n  <path fill=\"#bd3d44\" d=\"M0 0h640v480H0\"/>\n  <path stroke=\"#fff\" stroke-width=\"37\" d=\"M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640\"/>\n  <path fill=\"#192f5d\" d=\"M0 0h364.8v258.5H0\"/>\n  <marker id=\"us-a\" markerHeight=\"30\" markerWidth=\"30\">\n    <path fill=\"#fff\" d=\"m14 0 9 27L0 10h28L5 27z\"/>\n  </marker>\n  <path fill=\"none\" marker-mid=\"url(#us-a)\" d=\"m0 0 16 11h61 61 61 61 60L47 37h61 61 60 61L16 63h61 61 61 61 60L47 89h61 61 60 61L16 115h61 61 61 61 60L47 141h61 61 60 61L16 166h61 61 61 61 60L47 192h61 61 60 61L16 218h61 61 61 61 60z\"/>\n</svg>"
  },
  "DE": {
    "label": "ドイツの国旗",
    "svg": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" id=\"flag-icons-de\" viewBox=\"0 0 640 480\">\n  <path fill=\"#fc0\" d=\"M0 320h640v160H0z\"/>\n  <path fill=\"#000001\" d=\"M0 0h640v160H0z\"/>\n  <path fill=\"red\" d=\"M0 160h640v160H0z\"/>\n</svg>"
  },
  "GB": {
    "label": "イギリスの国旗",
    "svg": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" id=\"flag-icons-gb\" viewBox=\"0 0 640 480\">\n  <path fill=\"#012169\" d=\"M0 0h640v480H0z\"/>\n  <path fill=\"#FFF\" d=\"m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z\"/>\n  <path fill=\"#C8102E\" d=\"m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z\"/>\n  <path fill=\"#FFF\" d=\"M241 0v480h160V0zM0 160v160h640V160z\"/>\n  <path fill=\"#C8102E\" d=\"M0 193v96h640v-96zM273 0v480h96V0z\"/>\n</svg>"
  },
  "HK": {
    "label": "香港の旗",
    "svg": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" id=\"flag-icons-hk\" viewBox=\"0 0 640 480\">\n  <path fill=\"#EC1B2E\" d=\"M0 0h640v480H0\"/>\n  <path id=\"hk-a\" fill=\"#fff\" d=\"M346.3 103.1C267 98 230.6 201.9 305.6 240.3c-26-22.4-20.6-55.3-10.1-72.4l1.9 1.1c-13.8 23.5-11.2 52.7 11.1 71-12.7-12.3-9.5-39 12.1-48.9s23.6-39.3 16.4-49.1q-14.7-25.6 9.3-38.9M307.9 164l-4.7 7.4-1.8-8.6-8.6-2.3 7.8-4.3-.6-8.9 6.5 6.1 8.3-3.3-3.7 8.1 5.6 6.8z\"/>\n  <use xlink:href=\"#hk-a\" transform=\"rotate(72 312.5 243.5)\"/>\n  <use xlink:href=\"#hk-a\" transform=\"rotate(144 312.5 243.5)\"/>\n  <use xlink:href=\"#hk-a\" transform=\"rotate(216 312.5 243.5)\"/>\n  <use xlink:href=\"#hk-a\" transform=\"rotate(288 312.5 243.5)\"/>\n</svg>"
  },
  "CN": {
    "label": "中国の国旗",
    "svg": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" id=\"flag-icons-cn\" viewBox=\"0 0 640 480\">\n  <defs>\n    <path id=\"cn-a\" fill=\"#ff0\" d=\"M-.6.8 0-1 .6.8-1-.3h2z\"/>\n  </defs>\n  <path fill=\"#ee1c25\" d=\"M0 0h640v480H0z\"/>\n  <use xlink:href=\"#cn-a\" width=\"30\" height=\"20\" transform=\"matrix(71.9991 0 0 72 120 120)\"/>\n  <use xlink:href=\"#cn-a\" width=\"30\" height=\"20\" transform=\"matrix(-12.33562 -20.5871 20.58684 -12.33577 240.3 48)\"/>\n  <use xlink:href=\"#cn-a\" width=\"30\" height=\"20\" transform=\"matrix(-3.38573 -23.75998 23.75968 -3.38578 288 95.8)\"/>\n  <use xlink:href=\"#cn-a\" width=\"30\" height=\"20\" transform=\"matrix(6.5991 -23.0749 23.0746 6.59919 288 168)\"/>\n  <use xlink:href=\"#cn-a\" width=\"30\" height=\"20\" transform=\"matrix(14.9991 -18.73557 18.73533 14.99929 240 216)\"/>\n</svg>"
  }
};
let countryFlagSerial = 0;
function flag(m){
  if(m.category==='indices' && Object.hasOwn(COUNTRY_FLAGS,m.flag)){
    const country=COUNTRY_FLAGS[m.flag];
    const prefix='hw-flag-'+(++countryFlagSerial)+'-';
    const svg=country.svg
      .replace(/\bid="([^"]+)"/g,(_,id)=>'id="'+prefix+id+'"')
      .replace(/url\(#([^)]+)\)/g,(_,id)=>'url(#'+prefix+id+')')
      .replace(/((?:xlink:)?href)="#([^"]+)"/g,(_,attribute,id)=>attribute+'="#'+prefix+id+'"');
    return '<span class="flag-circle flag-country" role="img" aria-label="'+country.label+'">'+svg+'</span>';
  }
  return '<span class="flag-circle flag-'+m.flag.toLowerCase()+'">'+m.flag+'</span>';
}
function copyright(m){return `<div class="tradingview-widget-copyright"><a href="${tvUrl(m)}" target="_blank" rel="noopener noreferrer">${m.short} on TradingView</a></div>`;}

function addWidget(target,type,config,m){
  const fallback=document.createElement('div');fallback.className='widget-fallback';
  fallback.innerHTML=`<span class="loading-dot"></span><p>市場データを読み込み中</p><a href="${tvUrl(m)}" target="_blank" rel="noopener noreferrer">TradingViewで確認 ${icon('arrow')}</a>`;
  const container=document.createElement('div');container.className='tradingview-widget-container';
  const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';
  const script=document.createElement('script');script.src=`https://s3.tradingview.com/external-embedding/embed-widget-${type}.js`;script.async=true;script.textContent=JSON.stringify(config);
  let timeout;
  const failed=()=>{if(!target.isConnected)return;fallback.classList.add('failed');fallback.querySelector('p').textContent='データの読み込みに時間がかかっています';};
  script.onerror=failed;
  const observer=new MutationObserver(()=>{const iframe=container.querySelector('iframe');if(iframe){iframe.title=`${m.name}の${type==='mini-symbol-overview'?'価格チャート':'詳細チャート'}（TradingView）`;iframe.addEventListener('load',()=>{fallback.hidden=true;clearTimeout(timeout);},{once:true});observer.disconnect();}});
  observer.observe(container,{childList:true,subtree:true});
  container.append(widget);container.insertAdjacentHTML('beforeend',copyright(m));target.append(fallback,container);container.append(script);
  timeout=setTimeout(()=>{observer.disconnect();failed();},20000);
}
function mountMini(card){
  if(card.dataset.loaded)return;
  card.dataset.loaded='true';
  const m=MARKETS.find(item=>item.id===card.dataset.market);
  addWidget(card.querySelector('.widget-shell'),'mini-symbol-overview',{symbol:m.symbol,width:'100%',height:'100%',locale:'ja',dateRange:'1M',colorTheme:'dark',isTransparent:false,autosize:true,largeChartUrl:tvUrl(m),noTimeScale:true,chartOnly:false},m);
}
function selectedMarkets(){
  let data=page==='all'?MARKETS.filter(m=>board.includes(m.id)):page==='watchlist'?MARKETS.filter(m=>favorites.includes(m.id)):MARKETS.filter(m=>m.category===page);
  if(filter==='favorites')data=data.filter(m=>favorites.includes(m.id));
  else if(filter!=='all')data=data.filter(m=>m.region===filter);
  const q=query.trim().toLocaleLowerCase('ja');
  return data.filter(m=>`${m.name} ${m.symbol} ${m.short} ${m.detail}`.toLocaleLowerCase('ja').includes(q));
}
function renderMarkets(){
  widgetObserver?.disconnect();
  const data=selectedMarkets();
  $('marketCount').textContent=`${data.length} MARKETS`;
  updateWatchCounts();
  $('emptyState').hidden=data.length!==0;
  $('marketGrid').innerHTML=data.map(m=>`<article class="market-card" data-market="${m.id}"><div class="card-top"><div class="market-identity">${flag(m)}<div class="market-label"><h3>${m.name}</h3><small>${m.short}</small></div></div><button class="favorite-button ${favorites.includes(m.id)?'is-favorite':''}" data-favorite="${m.id}" aria-label="${m.name}をお気に入り${favorites.includes(m.id)?'から削除':'に追加'}" aria-pressed="${favorites.includes(m.id)}" title="お気に入り">${icon('star')}</button></div><div class="widget-shell"></div><div class="card-bottom"><span class="market-category">${m.detail}</span><button class="chart-button" data-chart="${m.id}" aria-label="${m.name}の詳細チャート"><span>詳細</span>${icon('arrow')}</button></div></article>`).join('');
  if('IntersectionObserver' in window){widgetObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){mountMini(entry.target);widgetObserver.unobserve(entry.target);}}),{rootMargin:'180px'});document.querySelectorAll('.market-card').forEach(card=>widgetObserver.observe(card));}
  else document.querySelectorAll('.market-card').forEach(mountMini);
  applyLayout();
}
function setPage(next){
  page=next;filter='all';query='';$('marketSearch').value='';
  const labels={portfolio:'ポートフォリオ',all:'マーケット概況',watchlist:'ウォッチリスト',indices:'株価指数',forex:'為替',crypto:'暗号資産',dex:'株式・指数先物',commodities:'コモディティ'};
  $('breadcrumbCurrent').textContent=labels[page];
  $('pageTitle').innerHTML=page==='portfolio'?'あなたの資産を、<span>一つの視界に。</span>':page==='all'?'世界のマーケットを、<span>一つの視界に。</span>':page==='watchlist'?'気になる市場を、<span>あなたの軌道に。</span>':`${labels[page]}の動きを、<span>もっとクリアに。</span>`;
  $('pageDescription').textContent=page==='portfolio'?'株式と暗号資産の保有額・含み損益・配分をまとめて確認。':page==='dex'?'Hyperliquid上の株式・株価指数に連動する無期限契約。trade[XYZ]の一覧とチャート。':page==='crypto'?'CoinMarketCapの時価総額TOP50。世界の暗号資産を、順位と数字で見渡す。':page==='watchlist'?'星を付けた銘柄をまとめて確認。いつもの市場を、すぐそばに。':page==='all'?'主要指数から為替まで。いま見たい市場を、あなたらしく。':`${labels[page]}の取り扱い銘柄を一覧。星を付けてウォッチリストへ追加できます。`;
  document.querySelectorAll('[data-page]').forEach(button=>{button.classList.toggle('active',button.dataset.page===page);if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  document.querySelectorAll('[data-filter]').forEach(button=>{const active=button.dataset.filter==='all';button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
  const isPortfolio=page==='portfolio';
  $('portfolioPage').hidden=!isPortfolio;
  if(isPortfolio)window.HWPortfolio?.show();else window.HWPortfolio?.hide();
  const watch=page==='watchlist',isCrypto=page==='crypto'||(watch&&watchClass==='crypto'),isDex=page==='dex'||(watch&&watchClass==='futures');
  $('watchlistTabs').hidden=!watch;updateWatchCounts();updateWatchView();
  document.querySelector('.market-strip').hidden=isDex||isPortfolio;
  if(isPortfolio)history.replaceState(null,'','#portfolio');else if(watch)history.replaceState(null,'','#watchlist');else if(isDex)history.replaceState(null,'','#dex');else if(['#dex','#watchlist','#portfolio','#sessions'].includes(location.hash))history.replaceState(null,'',location.pathname+location.search);
  $('standardCharts').hidden=isPortfolio||isDex||(watch&&watchClass!=='standard');
  $('standardDataFooter').hidden=isPortfolio||isDex||(watch&&watchClass!=='standard');
  if(!isPortfolio&&!isDex&&(!watch||watchClass==='standard')&&chartNeedsRefresh)renderMainChart();
  if(isDex)window.HyperliquidMarkets.show({watchlist:watch});else window.HyperliquidMarkets.hide();
  $('marketDashboard').hidden=isPortfolio||isCrypto||isDex;
  $('addButton').hidden=isPortfolio||isCrypto||isDex;
  $('cryptoChartNote').hidden=!isCrypto;
  if(isCrypto){
    widgetObserver?.disconnect();
    window.CryptoTop50.show({watchlist:watch});
    if(!watch&&MARKETS.find(m=>m.id===focusId).category!=='crypto'){focusId='bitcoin';persist();renderMainChart();}
  }else{
    window.CryptoTop50.hide();
    if(isDex||isPortfolio)widgetObserver?.disconnect();else renderMarkets();
  }
}
function applyLayout(){
  document.body.classList.toggle('compact-mode',compact);
  $('gridView').classList.toggle('active',!compact);$('compactView').classList.toggle('active',compact);
  $('gridView').setAttribute('aria-pressed',!compact);$('compactView').setAttribute('aria-pressed',compact);
  document.querySelectorAll('[data-layout]').forEach(b=>{const active=(b.dataset.layout==='compact')===compact;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
}
function setLayout(value){compact=value;applyLayout();persist();}
function renderMainChart(){
  const m=MARKETS.find(m=>m.id===focusId);
  chartNeedsRefresh=false;
  $('chartSymbol').value=m.id;$('mainChart').replaceChildren();
  // One configured date range makes the selected period unambiguous in the official widget.
  const periods={'1D':'1d|1','1M':'1m|30','3M':'3m|60','12M':'12m|1D','60M':'60m|1W'};
  addWidget($('mainChart'),'symbol-overview',{symbols:[[m.name,`${m.symbol}|1D`]],width:'100%',height:'100%',autosize:true,locale:'ja',colorTheme:'dark',isTransparent:false,chartType:'area',showVolume:false,hideDateRanges:false,hideMarketStatus:false,changeMode:'price-and-percent',dateRanges:[periods[range]],lineColor:'#58e1bd',topColor:'rgba(88,225,189,0.23)',bottomColor:'rgba(88,225,189,0)',largeChartUrl:tvUrl(m)},m);
  document.querySelectorAll('[data-range]').forEach(b=>{const active=b.dataset.range===range;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
}
function showChart(id){focusId=id;persist();renderMainChart();$('chartHeading').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
function renderPicker(){
  const q=$('addSearch').value.trim().toLocaleLowerCase('ja');
  const data=MARKETS.filter(m=>`${m.name} ${m.symbol}`.toLocaleLowerCase('ja').includes(q));
  $('symbolPicker').innerHTML=data.length?data.map(m=>`<button class="symbol-option ${board.includes(m.id)?'selected':''}" data-toggle-market="${m.id}" aria-pressed="${board.includes(m.id)}">${flag(m)}<span class="symbol-option-info"><strong>${m.name}</strong><small>${m.symbol} · ${CATEGORY[m.category]}</small></span><span class="symbol-option-action">${board.includes(m.id)?icon('check'):icon('plus')}</span></button>`).join(''):'<p class="modal-description">該当する銘柄がありません。</p>';
}
function showDialog(id){$(id).showModal();}
function showInfo(type){
  const content={
    about:{title:'HELLO WORLD Marketsについて',body:'<p>HELLO WORLD Markets（HWMarkets）は、世界の市場を自分のペースで見渡すための独自ダッシュボードです。主要な株価指数・為替・暗号資産・商品を一つの画面にまとめました。</p><p>星ボタンでウォッチリストに登録し、「銘柄を追加」から自分のボードを編集できます。カードの「詳細」で選んだ銘柄のチャートを表示します。</p><p>ゲスト利用の設定はこのブラウザに保存されます。アカウント機能を利用する際は、メールに届く認証リンクでログインします。クラウド同期が有効な場合は、ボード・お気に入り・表示形式・詳細チャートの選択銘柄をアカウントごとに保存します。</p><p>暗号資産ページではCoinMarketCapの時価総額TOP50を一覧表示します。価格・騰落率・時価総額・出来高の検索と並べ替えに対応します。</p><p>株式・指数先物ページはHyperliquid上のtrade[XYZ]が提供する株式・ETF・株価指数連動の無期限契約とローソク足に対応します。</p><p>デザインと画面構成はHELLO WORLD Markets独自のものです。チャートはTradingView、暗号資産ランキングはCoinMarketCapが提供しています。</p>'},
    data:{title:'市場データについて',body:'<p>カードと詳細チャートはTradingViewの公式ウィジェットを通じて表示しています。市場・データ提供元によりリアルタイム、遅延、終値など配信条件が異なります。</p><p>暗号資産ランキングはCoinMarketCapの公式APIから時価総額順に上位50銘柄を取得し、米ドル建てで表示します。ステーブルコインも含みます。ページ表示中に5分間隔で更新を確認し、サーバー側でも5分間の結果を共有します。「最終取得」はこのサイトがCoinMarketCapからデータを受け取った日本時間です。通常のキャッシュ保持（最大5分）と、取得失敗で前回成功時の値を表示している状態は区別して示します。画面内のTradingViewチャートは別配信で、取得時刻はこちらでは分かりません。</p><p>株式・指数先物の市場一覧とローソク足はHyperliquidの公開APIから取得します。表示中は1分間隔で更新し、サーバーで1分間結果を共有します。「最終取得」はJSTです。再取得に失敗したときは前回成功時の値と警告を表示します。24時間騰落率はマーク価格／前日価格−1、建玉のUSDC基準の概算は数量×マーク参照値。資金調達率は現在の1時間あたりの値を表示します。ローソク足は約定価格を使用し、最新足は未確定の場合があります。trade[XYZ]のHIP-3市場のうち、APIで株式・指数に分類されたもののみ対象です。価格は各契約の参照単位で、満期のない株価連動契約です。出来高はAPIの想定元本です。障害時には前回のデータと取得時刻を明示します。</p><p>暗号資産の詳細チャートはTradingViewの取引所別価格です。CoinMarketCapの集計価格とは異なる場合があります。</p><p>指数・商品は外部サイトで表示できるCFD（差金決済取引）のデータを使用しています。現物指数や先物そのものとは価格・取引時間が異なります。チャート内の銘柄名・配信状態・時刻をご確認ください。</p><p>世界時計の取引セッションは通常時間の目安です。祝日や臨時休場、短縮取引は反映していません。ニューヨークとロンドンは現地の夏時間に対応します。</p><p>表示内容は情報提供を目的としており、売買を推奨するものではありません。</p><div class="source-list"><a href="https://coinmarketcap.com/" target="_blank" rel="noopener noreferrer">Data provided by CoinMarketCap.com ↗</a><a href="https://www.tradingview.com/widget-docs/faq/data/" target="_blank" rel="noopener noreferrer">TradingViewの配信データについて ↗</a><a href="https://www.jpx.co.jp/equities/trading/domestic/01.html" target="_blank" rel="noopener noreferrer">JPX 取引時間 ↗</a><a href="https://www.nyse.com/trade/hours-calendars" target="_blank" rel="noopener noreferrer">NYSE 取引時間・休場日 ↗</a><a href="https://www.londonstockexchange.com/en/resources/faqs/personal-investing" target="_blank" rel="noopener noreferrer">LSE 取引時間 ↗</a></div>'},
    privacy:{title:'プライバシー',body:'<p>日本株検索には金融庁EDINETの公開会社一覧を利用し、全利用者に共通の一覧を読み込みます。会社名やコードの検索はこの端末内で行います。ポートフォリオのCSVはこの端末内で読み込み、ファイル・数量・購入単価・現在値をサーバーや金融庁へ送信しません。</p><p>ポートフォリオの保有銘柄・数量・購入単価・手入力価格・換算レートは、この端末のブラウザだけに保存します。ゲストとログイン中のアカウントごとに分け、クラウド同期や設定の引き継ぎの対象に含めません。価格の取得は全利用者で共通の暗号資産TOP50を読み込み、保有情報をサーバーやデータ提供元へ送りません。バックアップは保有情報を含むファイルとして端末へ保存します。共有端末では同じブラウザを使う人がローカルデータを確認できるため、保管にご注意ください。</p><p>ゲスト利用では、お気に入り・ボードの銘柄・表示形式・詳細チャートの選択銘柄を、このブラウザのローカルストレージに保存します。ログインしたアカウントの設定とは分けて保存し、ゲストの設定を自動でアカウントに移しません。</p><p>アカウント機能にはDescopeのメール認証を利用します。ログイン時に入力したメールアドレスは、認証リンクの送信とアカウント管理のためDescopeへ送信します。ログイン状態を維持する情報もブラウザに保存します。このサイトでパスワードを設定する必要はありません。</p><p>クラウド同期が有効な場合、ログイン後のボード・お気に入り・表示形式・詳細チャートの選択銘柄を、認証されたアカウントに関連付けてサーバーに保存します。ゲストの設定を引き継ぐ操作を行った場合は、その設定も保存対象になります。クラウド同期が利用できない場合は、その状態をアカウント画面に表示します。</p><p>チャート表示時にTradingViewの外部コンテンツを読み込みます。暗号資産ランキングはこのサイトのサーバー経由でCoinMarketCapから取得し、コインロゴと7日間の簡易チャート画像はCoinMarketCapの画像配信サービスから読み込みます。Hyperliquidの市場データと価格チャートもこのサイトのサーバー経由で取得します。株式・指数先物の銘柄ロゴはHyperliquidとFinancial Modeling Prepの画像配信元から読み込み、参照元URLは送信しません。外部サービスのデータの取り扱いは各社のポリシーに従います。</p><p>ログアウトすると、このブラウザのゲスト設定に戻ります。ブラウザのサイトデータを削除すると端末に保存した設定とログイン情報は削除されますが、クラウド上のアカウントや保存済みの設定は削除されません。「表示設定」のリセットは現在利用中のワークスペースを初期状態に戻す操作です。ログイン中で同期が有効な場合は、そのリセットもクラウドに反映します。</p><div class="source-list"><a href="https://www.descope.com/privacy" target="_blank" rel="noopener noreferrer">Descope プライバシー・個人情報の取り扱い ↗</a><a href="https://www.tradingview.com/privacy-policy/" target="_blank" rel="noopener noreferrer">TradingView プライバシーポリシー ↗</a><a href="https://coinmarketcap.com/privacy/" target="_blank" rel="noopener noreferrer">CoinMarketCap プライバシーポリシー ↗</a></div>'}
  }[type];
  $('infoTitle').textContent=content.title;$('infoBody').innerHTML=content.body;showDialog('infoDialog');
}

const sessions=[
  {id:'Tokyo',name:'東京',exchange:'TOKYO STOCK EXCHANGE',zone:'Asia/Tokyo',hours:'09:00–11:30 / 12:30–15:30',intervals:[[540,690],[750,930]],flag:'JP'},
  {id:'London',name:'ロンドン',exchange:'LONDON STOCK EXCHANGE',zone:'Europe/London',hours:'08:00–16:30',intervals:[[480,990]],flag:'GB'},
  {id:'NewYork',name:'ニューヨーク',exchange:'NEW YORK STOCK EXCHANGE',zone:'America/New_York',hours:'09:30–16:00',intervals:[[570,960]],flag:'US'}
];
function sessionState(s,date){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:s.zone,hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(date);
  const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const mins=Number(p.hour)*60+Number(p.minute);
  return !['Sat','Sun'].includes(p.weekday)&&s.intervals.some(([start,end])=>mins>=start&&mins<end);
}
function updateClocks(){
  const now=new Date();
  $('localDate').textContent=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',weekday:'short'}).format(now)+' JST';
  $('currentYear').textContent=new Intl.DateTimeFormat('en',{timeZone:'Asia/Tokyo',year:'numeric'}).format(now);
  const rows=[];
  for(const s of sessions){
    const active=sessionState(s,now);
    const local=new Intl.DateTimeFormat('en-GB',{timeZone:s.zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(now);
    $('clock'+s.id).textContent=local;$('status'+s.id).textContent=active?'通常セッション内':'通常時間外';$('status'+s.id).className='clock-status '+(active?'open':'closed');
    rows.push(`<div class="session-row"><span class="session-icon flag-circle flag-${s.flag.toLowerCase()}">${s.flag}</span><div class="session-info"><strong>${s.name}</strong><small>${s.exchange}</small></div><div class="session-time"><b>${local.slice(0,5)}</b><small>現地時間</small></div><span class="status-pill ${active?'open':'closed'}">${active?'時間内':'時間外'}</span><div class="session-hours">${s.hours}<small>現地の通常取引時間</small></div></div>`);
  }
  $('sessionList').innerHTML=rows.join('');
}

$('chartSymbol').innerHTML=MARKETS.map(m=>`<option value="${m.id}">${m.name} · ${m.short}</option>`).join('');
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
document.querySelectorAll('[data-watch-class]').forEach(b=>b.addEventListener('click',()=>{watchClass=b.dataset.watchClass;setPage('watchlist');}));
document.querySelectorAll('[data-watch-view]').forEach(b=>b.addEventListener('click',()=>setWatchView(b.dataset.watchView)));
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(t=>{const active=t===b;t.classList.toggle('active',active);t.setAttribute('aria-pressed',active);});renderMarkets();}));
$('marketSearch').addEventListener('input',e=>{query=e.target.value;clearTimeout(searchTimeout);searchTimeout=setTimeout(renderMarkets,280);});
$('marketGrid').addEventListener('click',e=>{
  const favorite=e.target.closest('[data-favorite]'), chart=e.target.closest('[data-chart]');
  if(favorite){const id=favorite.dataset.favorite;const active=!favorites.includes(id);favorites=active?[...favorites,id]:favorites.filter(item=>item!==id);persist();updateWatchCounts();if(page==='watchlist'||filter==='favorites'){renderMarkets();}else{favorite.classList.toggle('is-favorite',active);favorite.setAttribute('aria-pressed',active);const m=MARKETS.find(m=>m.id===id);favorite.setAttribute('aria-label',`${m.name}をお気に入り${active?'から削除':'に追加'}`);}toast(active?'ウォッチリストに追加しました':'ウォッチリストから削除しました');}
  if(chart)showChart(chart.dataset.chart);
});
$('gridView').addEventListener('click',()=>setLayout(false));$('compactView').addEventListener('click',()=>setLayout(true));
document.querySelectorAll('[data-layout]').forEach(b=>b.addEventListener('click',()=>setLayout(b.dataset.layout==='compact')));
$('chartSymbol').addEventListener('change',e=>{focusId=e.target.value;persist();renderMainChart();});
document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{range=b.dataset.range;renderMainChart();}));
$('addButton').addEventListener('click',()=>{$('addSearch').value='';renderPicker();showDialog('addDialog');});
$('addSearch').addEventListener('input',renderPicker);
$('symbolPicker').addEventListener('click',e=>{const b=e.target.closest('[data-toggle-market]');if(!b)return;const id=b.dataset.toggleMarket;const active=!board.includes(id);board=active?[...board,id]:board.filter(item=>item!==id);persist();renderPicker();$('symbolPicker').querySelector(`[data-toggle-market="${id}"]`)?.focus();renderMarkets();toast(active?'ボードに銘柄を追加しました':'ボードから銘柄を外しました');});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
$('settingsButton').addEventListener('click',()=>showDialog('settingsDialog'));
$('resetBoard').addEventListener('click',()=>{board=[...DEFAULT_BOARD];favorites=[...DEFAULT_FAVORITES];futuresFavorites=[];cryptoFavorites=[];watchView='charts';compact=false;focusId='nikkei';range='1M';persist();setPage('all');renderMainChart();$('settingsDialog').close();toast('初期ボードに戻しました');});
$('resetFilters').addEventListener('click',()=>{setPage(page==='watchlist'?'all':page);});
$('refreshButton').addEventListener('click',()=>{if(page==='portfolio')window.HWPortfolio?.refresh();else if(page==='dex'||(page==='watchlist'&&watchClass==='futures'))window.HyperliquidMarkets.refresh();else if(page==='crypto'||(page==='watchlist'&&watchClass==='crypto'))window.CryptoTop50.refresh();else{renderMarkets();renderMainChart();}toast('市場データを再読み込みしています');});
$('aboutButton').addEventListener('click',()=>showInfo('about'));$('dataInfoButton').addEventListener('click',()=>showInfo('data'));$('privacyButton').addEventListener('click',()=>showInfo('privacy'));
document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();const futures=page==='dex'||(page==='watchlist'&&watchClass==='futures'),crypto=page==='crypto'||(page==='watchlist'&&watchClass==='crypto');$(futures?'hlSearch':crypto?'cryptoTop50Search':'marketSearch')?.focus();}});
updateWatchView();updateClocks();setInterval(updateClocks,1000);renderMarkets();renderMainChart();
if(location.hash==='#sessions')history.replaceState(null,'',location.pathname+location.search);
if(location.hash==='#portfolio')setPage('portfolio');else if(location.hash==='#dex')setPage('dex');else if(location.hash==='#watchlist')setPage('watchlist');

window.addEventListener('hashchange',()=>{const route=location.hash.slice(1);if(['portfolio','dex','watchlist'].includes(route)&&route!==page)setPage(route);});
