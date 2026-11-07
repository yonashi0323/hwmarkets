(() => {
  'use strict';
  const root=document.getElementById('dexMarkets');
  let visible=false, listing=null, selected='xyz:SP500', range='day', query='', sort='volume24h', descending=true,category='all';
  let marketPending=null, chartGeneration=0, chartData=null, timer=null;
  let watchOnly=false;
  const watched=()=>window.HWWorkspace?.getWatchlist('futures')||[];
  const starSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>';
  const watchButton=coin=>'<button class="watch-star '+(watched().includes(coin)?'is-favorite':'')+'" data-hl-watch="'+escape(coin)+'" aria-label="'+escape(label(coin))+'をウォッチリスト'+(watched().includes(coin)?'から削除':'に追加')+'" aria-pressed="'+watched().includes(coin)+'">'+starSvg+'</button>';
  const chartCache=new Map();
  const miniCache=new Map(),miniPending=new Map();
  let miniObserver=null,miniQueue=[],miniActive=0,miniDetailOpen=false;
  const cardsView=()=>watchOnly&&window.HWWorkspace?.getWatchView()==='charts';
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=(v,d=2)=>v==null?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
  const price=v=>v==null?'—':v>0&&v<1e-7?v.toExponential(3):number(v,v>=100?2:v>=1?3:v>=.01?5:8);
  const money=v=>v==null?'—':v>=1e9?number(v/1e9)+'B':v>=1e6?number(v/1e6)+'M':v>=1e3?number(v/1e3)+'K':number(v);
  const percent=(v,d=2)=>v==null?'—':(v>0?'+':'')+number(v,d)+'%';
  const tone=v=>v==null?'':v>0?'hl-up':v<0?'hl-down':'';
  const names={SP500:'S&P 500',XYZ100:'XYZ米国100',JP225:'日本225',KR200:'韓国200',NIFTY:'NIFTY 50',NVDA:'NVIDIA',TSLA:'テスラ',AAPL:'アップル',MSFT:'マイクロソフト',AMZN:'アマゾン',GOOGL:'アルファベット',META:'メタ',KIOXIA:'キオクシア',SOFTBANK:'ソフトバンクグループ'};
  const symbol=coin=>coin.replace(/^xyz:/,'');
  const label=coin=>names[symbol(coin)]||symbol(coin);
  // Match the exact HIP-3 market key rather than guessing a company from a ticker.
  // These listed US securities/ETFs supplement missing Hyperliquid artwork.
  const supplementalLogos=new Set(['BE','MRNA','ARM','AVGO','QCOM','EWT','URNM','EBAY','XBI']);
  const failedLogos=new Set();
  function marketIcon(m,eager=false){
    const ticker=symbol(m.coin),valid=/^xyz:[A-Za-z0-9_.-]{1,40}$/.test(m.coin);
    const url=valid?(supplementalLogos.has(ticker)?'https://financialmodelingprep.com/image-stock/'+ticker+'.png':'https://app.hyperliquid.xyz/coins/'+m.coin+'.svg'):null;
    return `<span class="hl-coin-mark" aria-hidden="true"><span class="hl-coin-fallback">${escape(ticker.slice(0,2))}</span>${url&&!failedLogos.has(url)?`<img class="hl-coin-logo" src="${escape(url)}" alt="" width="32" height="32" loading="${eager?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer">`:''}</span>`;
  }
  root.addEventListener('load',event=>{const image=event.target;if(image.matches?.('.hl-coin-logo')&&image.naturalWidth>0)image.parentElement.classList.add('has-logo');},true);
  root.addEventListener('error',event=>{const image=event.target;if(image.matches?.('.hl-coin-logo')){failedLogos.add(image.src);image.parentElement.classList.remove('has-logo');image.remove();}},true);
  const kind=m=>m.category==='indices'?'株価指数':'株式・ETF';
  const time=v=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(v));
  root.className='dex-markets';
  root.innerHTML=`<div class="hl-heading"><div><div class="eyebrow">DECENTRALIZED EQUITY MARKETS</div><h2>Hyperliquid <span>Equity Perps</span></h2><p>株式・株価指数に連動する無期限契約。trade[XYZ] / HIP-3</p></div><span class="hl-badge"><i></i> PUBLIC MARKET DATA</span></div>
    <div class="hl-summary" id="hlSummary"><div><small>対象の株式・指数</small><strong>—</strong></div><div><small>24時間出来高 合計 / USDC</small><strong>—</strong></div><div><small>建玉 合計 / USDC換算</small><strong>—</strong></div></div>
    <article class="hl-chart-panel" aria-labelledby="hlChartTitle"><button id="hlMiniBack" class="watch-card-detail" type="button" hidden>簡易チャートに戻る</button><div class="hl-chart-top"><div><div class="eyebrow">HYPERLIQUID / TRADE[XYZ] / EQUITY PERPS</div><div class="hl-chart-market"><span id="hlChartIcon" aria-hidden="true"></span><h3 id="hlChartTitle">S&amp;P 500 <span>無期限契約</span></h3></div></div><div class="hl-periods" role="group" aria-label="先物チャートの表示期間"><button data-hl-range="day" aria-pressed="true" class="active">1日</button><button data-hl-range="week" aria-pressed="false">1週間</button><button data-hl-range="month" aria-pressed="false">1か月</button></div></div>
    <div class="hl-quote" id="hlQuote">市場データを取得中…</div><div id="hlChartStatus" class="hl-chart-status" role="status">チャートを読み込んでいます…</div><div id="hlChart" class="hl-chart" tabindex="0" aria-label="価格ローソク足チャート。左右キーで各足の価格を確認できます。"></div><div id="hlCandleDetail" class="hl-candle-detail" aria-live="off"></div><div class="hl-chart-foot"><span id="hlChartTime">—</span><span>ローソク足 ＋ 出来高 · 時刻はJST · 最新足は未確定の場合があります</span></div></article>
    <div class="hl-table-panel"><div class="hl-toolbar"><div><h3>株式・株価指数の無期限契約 <span id="hlCount"></span></h3><p>銘柄名を押すとチャートが切り替わります</p></div><label class="search-box"><input type="search" id="hlSearch" aria-label="株式・指数の銘柄を検索" placeholder="銘柄名・SP500・NVDAを検索"></label></div>
    <div class="hl-category-tabs" role="group" aria-label="株式・指数の種別"><button data-hl-category="all" aria-pressed="true" class="active">すべて</button><button data-hl-category="indices" aria-pressed="false">株価指数</button><button data-hl-category="stocks" aria-pressed="false">株式・ETF</button></div><div class="hl-contract-note">満期のない株価連動契約です。価格は各契約の参照単位で表示します（日本225は円ベースの指数値）。損益はUSDCで決済されます。</div><div id="hlMarketStatus" class="hl-status" role="status">市場データを取得中…</div><div class="hl-table-scroll" tabindex="0" aria-label="先物一覧。小さい画面では横にスクロールできます。"><table><thead><tr><th scope="col" class="watch-star-cell"><span class="sr-only">ウォッチリスト</span></th><th scope="col"><button data-hl-sort="coin">銘柄</button></th><th scope="col"><button data-hl-sort="mark">マーク参照値</button></th><th scope="col"><button data-hl-sort="change24h">24h 騰落率</button></th><th scope="col"><button data-hl-sort="volume24h">24h 出来高 / USDC ↓</button></th><th scope="col"><button data-hl-sort="openInterestUsdc">建玉 / USDC換算</button></th><th scope="col"><button data-hl-sort="fundingHourly">資金調達率 / 1時間</button></th></tr></thead><tbody id="hlRows"></tbody></table></div><div class="hl-empty" id="hlEmpty" hidden>該当する銘柄がありません。検索する文字を変えてください。</div></div>
    <div id="hlCards" class="watch-card-grid" hidden></div><div id="hlUnavailable" class="watch-unavailable"></div><div class="hl-notes"><p>データ提供：<a href="https://hyperliquid.xyz/" target="_blank" rel="noopener noreferrer">Hyperliquid ↗</a> · 市場運営：<a href="https://docs.trade.xyz/perpetuals" target="_blank" rel="noopener noreferrer">trade[XYZ] ↗</a> · 表示中は1分間隔で更新</p><p>銘柄アイコン：Hyperliquid · <a href="https://site.financialmodelingprep.com/" target="_blank" rel="noopener noreferrer">Financial Modeling Prep ↗</a>。画像がない場合は銘柄の略称を表示します。</p><p>対象はtrade[XYZ]の株式・ETF・株価指数の無期限契約です。現物株式や通常の取引所先物とは商品仕様が異なります。APIの株式・指数分類を用い、暗号資産・商品・為替・未上場区分は対象に含めません。</p><p>価格は各契約の参照単位です。すべてをUSDとして換算していません。日本225などの指数値はポイントで表示します。出来高はAPIの想定元本、建玉は数量×マーク参照値によるUSDC基準の概算です。株数・株式時価総額ではありません。</p><p>24h騰落率はマーク参照値と前日参照値から算出。チャートは約定参照値の足で、最新足は未確定の場合があります。出来高の足は契約数量です。参照市場の時間外・休場時には価格形成が変わる場合があります。<a href="https://docs.trade.xyz/perpetuals/specifications-and-schedules/specification-index" target="_blank" rel="noopener noreferrer">各契約の仕様・時間 ↗</a></p><p>資金調達率は現在の1時間あたりの値です。プラスはロング側、マイナスはショート側が支払います。<a href="https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding" target="_blank" rel="noopener noreferrer">資金調達率について ↗</a> このページは市場データの閲覧用です。</p></div>`;
  const $=id=>document.getElementById(id);
  const sortLabels={coin:'銘柄',mark:'マーク参照値',change24h:'24h 騰落率',volume24h:'24h 出来高 / USDC',openInterestUsdc:'建玉 / USDC換算',fundingHourly:'資金調達率 / 1時間'};
  async function get(url) {
    const response=await fetch(url,{signal:AbortSignal.timeout(18000)});
    if(!response.ok)throw Error('unavailable');
    return response.json();
  }
  function renderQuote(){
    const m=listing?.markets.find(m=>m.coin===selected);
    $('hlChartIcon').innerHTML=marketIcon(m||{coin:selected},true);
    $('hlChartTitle').innerHTML=`${escape(label(selected))} <span>${escape(symbol(selected))} · 無期限契約</span>`;
    $('hlQuote').innerHTML=m?`<strong>${price(m.mark)}</strong><small class="hl-price-unit">契約参照値</small><span class="${tone(m.change24h)}">${percent(m.change24h)} <small>24h</small></span><span>資金調達率 <b>${percent(m.fundingHourly==null?null:m.fundingHourly*100,5)}</b><small> / 1時間</small></span>`:'市場データを取得中…';
  }
  function renderMarkets(){
    const markets=listing.markets.filter(m=>!watchOnly||watched().includes(m.coin));
    if(!cardsView())miniDetailOpen=false;
    root.querySelector('.hl-summary').hidden=cardsView();
    root.querySelector('.hl-toolbar p').textContent=cardsView()?'「詳細チャート」で拡大できます':'銘柄名を押すとチャートが切り替わります';
    root.querySelector('.hl-chart-panel').hidden=(watchOnly&&!markets.length)||(cardsView()&&!miniDetailOpen);
    $('hlMiniBack').hidden=!cardsView();
    root.querySelector('.hl-table-scroll').hidden=cardsView();
    if(watchOnly&&markets.length&&!markets.some(m=>m.coin===selected))selected=markets[0].coin;
    const missing=watchOnly?watched().filter(coin=>!listing.markets.some(m=>m.coin===coin)):[];
    $('hlUnavailable').innerHTML=missing.map(coin=>'<div>'+watchButton(coin)+'<span>'+escape(symbol(coin))+' · 現在の一覧にデータがありません</span></div>').join('');
    const total=key=>markets.every(m=>m[key]!=null)?markets.reduce((s,m)=>s+m[key],0):null;
    $('hlSummary').innerHTML=`<div><small>対象の株式・指数</small><strong>${markets.length}<em>MARKETS</em></strong></div><div><small>24時間出来高 合計 / USDC</small><strong>${money(total('volume24h'))}</strong></div><div><small>建玉 合計 / USDC換算</small><strong>${money(total('openInterestUsdc'))}</strong></div>`;
    const rows=markets.filter(m=>(category==='all'||m.category===category)&&`${m.coin} ${label(m.coin)}`.toLowerCase().includes(query)).sort((a,b)=>{
      if(a[sort]==null)return b[sort]==null?0:1;if(b[sort]==null)return -1;
      const comparison=sort==='coin'?a.coin.localeCompare(b.coin):a[sort]-b[sort];
      return (descending?-1:1)*comparison || a.coin.localeCompare(b.coin);
    });
    $('hlCount').textContent=rows.length+' / '+markets.length;
    $('hlEmpty').innerHTML=watchOnly&&!watched().length?'先物のウォッチリストはまだ空です。<br>株式・指数先物の一覧で☆を押して追加してください。<br><button class="button" data-hl-browse>株式・指数先物から追加</button>':'該当する銘柄がありません。検索条件を変えてください。';
    $('hlEmpty').hidden=!!rows.length;
    $('hlRows').innerHTML=rows.map(m=>`<tr class="${m.coin===selected?'selected':''}"><td class="watch-star-cell">${watchButton(m.coin)}</td><th scope="row"><button data-hl-coin="${escape(m.coin)}" aria-pressed="${m.coin===selected}">${marketIcon(m)}<span>${escape(label(m.coin))}<small>${escape(m.symbol)} · ${kind(m)}</small></span></button></th><td>${price(m.mark)}</td><td class="${tone(m.change24h)}">${percent(m.change24h)}</td><td>${money(m.volume24h)}</td><td>${money(m.openInterestUsdc)}</td><td>${percent(m.fundingHourly==null?null:m.fundingHourly*100,5)}</td></tr>`).join('');
    root.querySelectorAll('[data-hl-sort]').forEach(button=>{
      const active=sort===button.dataset.hlSort;
      button.textContent=sortLabels[button.dataset.hlSort]+(active?(descending?' ↓':' ↑'):'');
      button.closest('th').setAttribute('aria-sort',active?(descending?'descending':'ascending'):'none');
    });
    renderQuote();
    renderMiniCards(rows);
  }
  async function loadMarkets(){
    if(marketPending)return marketPending;
    $('hlMarketStatus').textContent=listing?'市場データを更新しています…':'市場データを取得中…';
    marketPending=(async()=>{
      try {
        const data=await get('/api/hyperliquid');
        if(data.scope!=='equities'||!Array.isArray(data.markets)||!data.markets.length||!Number.isFinite(Date.parse(data.fetchedAt)))throw Error();
        listing=data;
        if(!data.markets.some(m=>m.coin===selected))selected=data.markets[0].coin;
        renderMarkets();
        $('hlMarketStatus').textContent=data.stale?'提供元の再取得に失敗したため、前回成功時の値を表示しています。最終取得 '+time(data.fetchedAt)+' JST。これは最新ではありません。':'最終取得 '+time(data.fetchedAt)+' JST · 表示はこの取得時点の値です';
        $('hlMarketStatus').classList.toggle('is-stale',Boolean(data.stale));
      }catch{
        $('hlMarketStatus').textContent=listing?'再取得できません。最終取得（前回成功） '+time(listing.fetchedAt)+' JST の値を表示しています。これは最新ではありません。再読み込みでお試しください。':'市場データを取得できませんでした。上部の再読み込みボタンでお試しください。';
        $('hlMarketStatus').classList.toggle('is-stale',Boolean(listing));
      }finally{marketPending=null;}
    })();
    return marketPending;
  }
  function candleDetail(index){
    if(!chartData?.candles.length)return;
    const c=chartData.candles[Math.max(0,Math.min(chartData.candles.length-1,index))];
    $('hlCandleDetail').textContent=`${time(c.time)} JST　始 ${price(c.open)}　高 ${price(c.high)}　安 ${price(c.low)}　終 ${price(c.close)}　出来高 ${number(c.volume,4)} 契約数量`;
    $('hlChart').dataset.index=String(index);
    const cross=$('hlChart').querySelector('.hl-crosshair');
    if(cross){const x=14+(index+.5)*(902/chartData.candles.length);cross.setAttribute('x1',x);cross.setAttribute('x2',x);cross.style.display='';}
  }
  function drawChart(data){
    chartData=data;
    const candles=data.candles;
    if(!candles.length){$('hlChart').replaceChildren();$('hlCandleDetail').textContent='';$('hlChartStatus').textContent='この期間の価格データはありません。';return;}
    const width=1000,height=350,left=14,right=916,top=18,bottom=258;
    const min=Math.min(...candles.map(c=>c.low)),max=Math.max(...candles.map(c=>c.high));
    const pad=Math.max((max-min)*.08,max*.0002,1e-10),lo=min-pad,hi=max+pad;
    const y=p=>top+(hi-p)/(hi-lo)*(bottom-top),step=(right-left)/candles.length;
    const maxVol=Math.max(...candles.map(c=>c.volume),1);
    let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(label(data.coin))}、${{day:'1日',week:'1週間',month:'1か月'}[data.range]}のローソク足と出来高"><title>${escape(label(data.coin))} Hyperliquid 株価連動契約の約定参照値 / ${data.interval}足</title>`;
    for(let i=0;i<=4;i++){
      const value=hi-(hi-lo)*i/4,py=y(value);
      svg+=`<line x1="${left}" y1="${py}" x2="${right}" y2="${py}" stroke="#202d3b"/><text x="928" y="${py+4}" fill="#8e9fb0" font-size="12">${number(value,value>=100?1:value>=1?3:6)}</text>`;
    }
    candles.forEach((c,i)=>{
      const x=left+(i+.5)*step,up=c.close>=c.open,color=up?'#58e1bd':'#f17887',bodyY=y(Math.max(c.open,c.close)),bodyH=Math.max(1,Math.abs(y(c.open)-y(c.close))),w=Math.max(1,step*.65);
      svg+=`<line x1="${x}" x2="${x}" y1="${y(c.high)}" y2="${y(c.low)}" stroke="${color}"/><rect x="${x-w/2}" y="${bodyY}" width="${w}" height="${bodyH}" fill="${color}"/><rect x="${x-w/2}" y="${319-c.volume/maxVol*40}" width="${w}" height="${c.volume/maxVol*40}" fill="${color}" opacity=".28"/>`;
    });
    [0,.25,.5,.75,1].forEach(r=>{
      const i=Math.round((candles.length-1)*r),x=left+(i+.5)*step;
      const label=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',...(data.range==='day'?{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}:{month:'2-digit',day:'2-digit'})}).format(new Date(candles[i].time));
      svg+=`<text x="${Math.max(30,Math.min(892,x))}" y="342" text-anchor="middle" fill="#8e9fb0" font-size="12">${label}</text>`;
    });
    svg+='<line class="hl-crosshair" y1="15" y2="320" stroke="#bac9d5" stroke-dasharray="4 4" style="display:none"/></svg>';
    $('hlChart').innerHTML=svg;
    $('hlChartStatus').textContent=data.stale?'提供元の再取得に失敗したため、前回成功時のチャートを表示しています。これは最新ではありません。':'';
    $('hlChartStatus').classList.toggle('is-stale',Boolean(data.stale));
    $('hlChartTime').textContent=`${data.interval}足 · 最終取得 ${time(data.fetchedAt)} JST`;
    candleDetail(candles.length-1);
  }
  async function loadChart(){
    const generation=++chartGeneration,coin=selected,period=range,key=coin+':'+period;
    renderQuote();
    const previous=chartCache.get(key);
    chartData=null;$('hlChart').replaceChildren();$('hlCandleDetail').textContent='';$('hlChartTime').textContent='—';
    $('hlChartStatus').textContent='チャートを読み込んでいます…';
    if(previous){drawChart(previous);if(Date.now()-Date.parse(previous.fetchedAt)<60000)return;}
    try{
      const data=await get('/api/hyperliquid?coin='+encodeURIComponent(coin)+'&range='+period);
      if(data.coin!==coin||data.range!==period||!Array.isArray(data.candles)||!Number.isFinite(Date.parse(data.fetchedAt)))throw Error();
      if(chartCache.size>=24)chartCache.delete(chartCache.keys().next().value);
      chartCache.set(key,data);
      if(generation===chartGeneration)drawChart(data);
    }catch{
      if(generation===chartGeneration){$('hlChartStatus').textContent=previous?'再取得できません。前回成功時のチャートを表示しています。これは最新ではありません。':'チャートを取得できませんでした。期間を切り替えるか、再読み込みをお試しください。';$('hlChartStatus').classList.toggle('is-stale',Boolean(previous));}
    }
  }
  function miniLineSVG(data){
    const points=data.candles;
    if(!Array.isArray(points)||points.length<2||points.length>1000||points.some((p,i)=>!Number.isSafeInteger(p.time)||!Number.isFinite(p.close)||p.close<0||(i>0&&p.time<=points[i-1].time)))throw Error('Invalid history');
    const low=Math.min(...points.map(p=>p.close)),high=Math.max(...points.map(p=>p.close)),pad=Math.max((high-low)*.1,high*.001,1e-9),lo=low-pad,hi=high+pad;
    if(!Number.isFinite(hi)||!Number.isFinite(lo)||hi<=lo)throw Error('Invalid scale');
    const start=points[0].time,end=points.at(-1).time;
    const path=points.map((p,i)=>(i?'L':'M')+(8+(p.time-start)/(end-start)*304).toFixed(2)+','+(12+(hi-p.close)/(hi-lo)*96).toFixed(2)).join(' ');
    const up=points.at(-1).close>=points[0].close;
    return `<svg viewBox="0 0 320 120" role="img" aria-label="${escape(label(data.coin))}の過去1週間の価格推移"><title>${escape(label(data.coin))} · ${escape(time(start))}～${escape(time(end))} JST · 1時間足の終値</title><path d="${path} L312,116 L8,116 Z" fill="${up?'#58e1bd':'#f17887'}" opacity=".08"/><path d="${path}" fill="none" stroke="${up?'#58e1bd':'#f17887'}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }
  async function miniData(coin){
    const cached=miniCache.get(coin);if(cached&&Date.now()-Date.parse(cached.fetchedAt)<60000)return cached;
    if(miniPending.has(coin))return miniPending.get(coin);
    const pending=get('/api/hyperliquid?coin='+encodeURIComponent(coin)+'&range=week').then(data=>{
      if(data.coin!==coin||data.range!=='week'||!Number.isFinite(Date.parse(data.fetchedAt)))throw Error();
      miniLineSVG(data);
      if(miniCache.size>=100)miniCache.delete(miniCache.keys().next().value);
      miniCache.set(coin,data);return data;
    }).finally(()=>miniPending.delete(coin));miniPending.set(coin,pending);return pending;
  }
  function pumpMiniQueue(){
    while(miniActive<3&&miniQueue.length){
      const node=miniQueue.shift();if(!node.isConnected)continue;
      miniActive++;
      miniData(node.dataset.miniCoin).then(data=>{
        if(!node.isConnected)return;
        node.innerHTML=miniLineSVG(data);
        node.closest('.watch-chart-card').querySelector('.watch-mini-time').textContent=(data.stale?'前回成功時の値 · 最終取得 ':'最終取得 ')+time(data.fetchedAt)+' JST';
      }).catch(()=>{if(node.isConnected)node.innerHTML='<span>簡易チャートを取得できませんでした</span><button class="watch-mini-retry" type="button" data-mini-retry>再試行</button>';}).finally(()=>{miniActive--;pumpMiniQueue();});
    }
  }
  function enqueueMini(node){miniQueue.push(node);pumpMiniQueue();}
  function renderMiniCards(rows){
    miniObserver?.disconnect();$('hlCards').replaceChildren();miniQueue=miniQueue.filter(node=>node.isConnected);
    $('hlCards').hidden=!cardsView();if(!cardsView())return;
    $('hlCards').innerHTML=rows.map(m=>`<article class="watch-chart-card"><div class="watch-card-top"><div class="watch-card-identity">${marketIcon(m)}<div><h3>${escape(label(m.coin))}</h3><small>${escape(m.symbol)} · ${kind(m)}</small></div></div>${watchButton(m.coin)}</div><div class="watch-card-price">${price(m.mark)}<small>契約参照値</small></div><div class="watch-card-change ${tone(m.change24h)}">${percent(m.change24h)} <span>24h</span></div><div class="watch-mini" data-mini-coin="${escape(m.coin)}"><span>チャートを読み込み中…</span></div><div class="watch-mini-caption"><span>1週間 · 1時間足</span><span class="watch-mini-time">Hyperliquid</span></div><div class="watch-card-bottom"><small>出来高 ${money(m.volume24h)} USDC</small><button data-hl-coin="${escape(m.coin)}" class="watch-card-detail">詳細チャート ↗</button></div></article>`).join('');
    const nodes=$('hlCards').querySelectorAll('[data-mini-coin]');
    if('IntersectionObserver'in window){miniObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){miniObserver.unobserve(entry.target);enqueueMini(entry.target);}}),{rootMargin:'100px'});nodes.forEach(node=>miniObserver.observe(node));}else nodes.forEach(enqueueMini);
  }
  root.addEventListener('click',event=>{
    if(event.target.closest('[data-mini-retry]')){const node=event.target.closest('[data-mini-coin]');node.textContent='チャートを読み込み中…';enqueueMini(node);return;}
    if(event.target.closest('#hlMiniBack')){miniDetailOpen=false;renderMarkets();return;}
    const favorite=event.target.closest('[data-hl-watch]');
    if(favorite){const coin=favorite.dataset.hlWatch;window.HWWorkspace?.toggleWatch('futures',coin);((cardsView()?$('hlCards'):$('hlRows')).querySelector('[data-hl-watch="'+coin+'"]')||$('hlSearch')).focus({preventScroll:true});return;}
    if(event.target.closest('[data-hl-browse]')){window.HWWorkspace?.openMarketPage('dex');return;}
    const coin=event.target.closest('[data-hl-coin]'),period=event.target.closest('[data-hl-range]'),order=event.target.closest('[data-hl-sort]'),group=event.target.closest('[data-hl-category]');
    if(coin){selected=coin.dataset.hlCoin;miniDetailOpen=true;renderMarkets();loadChart();$('hlChartTitle').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    if(period){range=period.dataset.hlRange;root.querySelectorAll('[data-hl-range]').forEach(b=>{const active=b===period;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});loadChart();}
    if(group){category=group.dataset.hlCategory;root.querySelectorAll('[data-hl-category]').forEach(b=>{const active=b===group;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});if(listing)renderMarkets();}
    if(order){if(sort===order.dataset.hlSort)descending=!descending;else{sort=order.dataset.hlSort;descending=sort!=='coin';}if(listing)renderMarkets();}
  });
  $('hlSearch').addEventListener('input',event=>{query=event.target.value.trim().toLowerCase();if(listing)renderMarkets();});
  $('hlChart').addEventListener('pointermove',event=>{
    if(!chartData?.candles.length)return;
    const box=$('hlChart').getBoundingClientRect(),x=(event.clientX-box.left)/box.width*1000;
    candleDetail(Math.max(0,Math.min(chartData.candles.length-1,Math.floor((x-14)/902*chartData.candles.length))));
  });
  $('hlChart').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)&&chartData?.candles.length){event.preventDefault();candleDetail(Math.max(0,Math.min(chartData.candles.length-1,Number($('hlChart').dataset.index)+(event.key==='ArrowLeft'?-1:1))));}});
  async function refresh(){await loadMarkets();if(visible&&(!cardsView()||miniDetailOpen)&&(!watchOnly||listing?.markets.some(m=>watched().includes(m.coin))))await loadChart();}
  window.addEventListener('hw:watchlists-changed',()=>{if(!visible||!listing)return;const old=selected;renderMarkets();if(watchOnly&&old!==selected&&(!cardsView()||miniDetailOpen))loadChart();});
  document.addEventListener('visibilitychange',()=>{if(visible&&!document.hidden)refresh();});
  window.HyperliquidMarkets={show(options={}){watchOnly=options.watchlist===true;miniDetailOpen=false;root.querySelector('.hl-chart-panel').hidden=cardsView();root.querySelector('.hl-summary').hidden=cardsView();query='';category='all';$('hlSearch').value='';root.querySelectorAll('[data-hl-category]').forEach(b=>{const active=b.dataset.hlCategory==='all';b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});root.querySelector('.hl-heading h2').innerHTML=watchOnly?'株式・指数先物 <span>ウォッチリスト</span>':'Hyperliquid <span>Equity Perps</span>';visible=true;root.hidden=false;if(listing)renderMarkets();refresh();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)refresh();},60000);},hide(){visible=false;root.hidden=true;miniObserver?.disconnect();miniQueue=miniQueue.filter(node=>!root.contains(node));clearInterval(timer);},refresh};
})();
