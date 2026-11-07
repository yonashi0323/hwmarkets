(function () {
  'use strict';

  const REFRESH_MS = 5 * 60 * 1000;
  const TIMEOUT_MS = 15 * 1000;
  const CMC_ORIGIN = 'https://coinmarketcap.com';
  const SORT_COLUMNS = [
    { key: null, label: 'お気に入り', className: 'cmc-watch-column' },
    { key: 'rank', label: '順位', className: 'cmc-rank-column' },
    { key: null, label: '銘柄', className: 'cmc-name-column' },
    { key: 'price', label: '価格 (USD)', className: 'cmc-price-column' },
    { key: 'change24h', label: '24時間', className: 'cmc-change-column' },
    { key: 'change7d', label: '7日', className: 'cmc-change-column' },
    { key: 'marketCap', label: '時価総額', className: 'cmc-value-column' },
    { key: 'volume24h', label: '24時間出来高', className: 'cmc-value-column' },
    { key: null, label: '詳細', className: 'cmc-link-column' }
  ];
  const decimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const compactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });
  const fullCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  let section;
  let ui;
  let shown = false;
  let interval = null;
  let pending = null;
  let data = null;
  let lastAttemptAt = 0;
  let query = '';
  let sortKey = 'rank';
  let sortDirection = 'ascending';
  let watchOnly=false;
  const watched=()=>window.HWWorkspace?.getWatchlist('crypto')||[];
  function watchButton(id,name){
    const active=watched().includes(id),button=element('button','watch-star'+(active?' is-favorite':''));
    button.type='button';button.dataset.cryptoWatch=id;
    button.setAttribute('aria-label',name+'をウォッチリスト'+(active?'から削除':'に追加'));
    button.setAttribute('aria-pressed',active);button.append(svgIcon('star'));
    button.addEventListener('click',()=>{window.HWWorkspace?.toggleWatch('crypto',id);((!ui.cards.hidden?ui.cards:ui.tbody).querySelector('[data-crypto-watch="'+id+'"]')||ui.search).focus({preventScroll:true});});
    return button;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgIcon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const paths = {
      star: ['m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z'],
      refresh: ['M20 7v5h-5M4 17v-5h5', 'M6 7a7 7 0 0 1 11.5-2L20 8M4 16l2.5 3A7 7 0 0 0 18 17'],
      search: ['M16 16l5 5', 'M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0'],
      orbit: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M3 12h18M12 3a19 19 0 0 1 0 18 19 19 0 0 1 0-18'],
      external: ['M7 17 17 7M7 7h10v10']
    };
    (paths[type] || paths.orbit).forEach(value => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', value);
      svg.append(path);
    });
    return svg;
  }

  function mount() {
    if (ui) return true;
    section = document.getElementById('cryptoRankings');
    if (!section) return false;
    section.classList.add('crypto-top50');
    section.setAttribute('aria-labelledby', 'cmcTop50Heading');

    const header = element('div', 'cmc-header');
    const identity = element('div', 'cmc-heading');
    identity.append(element('div', 'cmc-eyebrow', 'CRYPTO MARKET RANKING'));
    const titleLine = element('div', 'cmc-title-line');
    const title = element('h2', '', '時価総額 TOP50');
    title.id = 'cmcTop50Heading';
    titleLine.append(title, element('span', 'cmc-currency-badge', 'USD'));
    identity.append(titleLine, element('p', 'cmc-description', 'ステーブルコイン含む・CoinMarketCapの時価総額順位'));

    const updateArea = element('div', 'cmc-update-area');
    const updateInfo = element('div', 'cmc-update-info');
    const timestamp = element('time', 'cmc-timestamp', '最終取得時刻 —');
    timestamp.id = 'cmcFetchedAt';
    const quoteTime = element('span', 'cmc-quote-time');
    quoteTime.hidden = true;
    const freshness = element('span', 'cmc-frequency', '5分ごとに確認');
    freshness.id = 'cmcFreshness';
    updateInfo.append(timestamp, quoteTime, freshness);
    const refreshButton = element('button', 'cmc-refresh');
    refreshButton.type = 'button';
    refreshButton.setAttribute('aria-label', '暗号資産TOP50のデータを更新');
    refreshButton.append(svgIcon('refresh'), element('span', '', '更新'));
    refreshButton.addEventListener('click', refresh);
    updateArea.append(updateInfo, refreshButton);
    header.append(identity, updateArea);

    const toolbar = element('div', 'cmc-toolbar');
    const count = element('span', 'cmc-result-count', 'データを取得中');
    count.setAttribute('aria-live', 'polite');
    count.setAttribute('aria-atomic', 'true');
    const searchLabel = element('label', 'cmc-search');
    searchLabel.append(svgIcon('search'));
    const search = element('input');
    search.id = 'cryptoTop50Search';
    search.type = 'search';
    search.placeholder = '名前・シンボルで検索';
    search.maxLength = 100;
    search.autocomplete = 'off';
    search.setAttribute('aria-label', '時価総額TOP50の銘柄を検索');
    search.addEventListener('input', () => {
      query = search.value.trim().toLocaleLowerCase('ja');
      if (data) renderRows();
    });
    searchLabel.append(search);
    toolbar.append(count, searchLabel);

    const notice = element('div', 'cmc-notice');
    notice.hidden = true;
    notice.setAttribute('role', 'status');

    const tableWrap = element('div', 'cmc-table-wrap');
    tableWrap.tabIndex = 0;
    tableWrap.setAttribute('role', 'region');
    tableWrap.setAttribute('aria-label', '暗号資産ランキング。横にスクロールできます');
    const table = element('table', 'cmc-table');
    const caption = element('caption', 'cmc-sr-only', 'CoinMarketCapの時価総額上位50銘柄。価格・時価総額・出来高は米ドル表示。列見出しのボタンで並べ替えできます。');
    const head = element('thead');
    const headerRow = element('tr');
    const headers = [];
    SORT_COLUMNS.forEach(column => {
      const th = element('th', column.className);
      th.scope = 'col';
      if (column.key) {
        th.setAttribute('aria-sort', column.key === sortKey ? sortDirection : 'none');
        const button = element('button', 'cmc-sort');
        button.type = 'button';
        const indicator = element('span', 'cmc-sort-indicator');
        indicator.setAttribute('aria-hidden', 'true');
        button.append(element('span', '', column.label), indicator);
        button.addEventListener('click', () => {
          if (sortKey === column.key) sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
          else {
            sortKey = column.key;
            sortDirection = column.key === 'rank' ? 'ascending' : 'descending';
          }
          updateSortHeaders();
          if (data) renderRows();
        });
        th.append(button);
        headers.push({ th, button, indicator, key: column.key, label: column.label });
      } else th.textContent = column.label;
      headerRow.append(th);
    });
    head.append(headerRow);
    const tbody = element('tbody');
    table.append(caption, head, tbody);
    tableWrap.append(table);

    const cards=element('div','watch-card-grid');cards.hidden=true;
    const emptyPanel = element('div', 'cmc-state');
    emptyPanel.hidden = true;
    const emptyIcon = element('div', 'cmc-state-icon');
    emptyIcon.append(svgIcon('orbit'));
    const emptyTitle = element('h3');
    const emptyDescription = element('p');
    emptyPanel.append(emptyIcon, emptyTitle, emptyDescription);

    const footer = element('div', 'cmc-footer');
    const source = element('a', 'cmc-source', 'Data provided by CoinMarketCap.com');
    source.href = CMC_ORIGIN + '/';
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.append(svgIcon('external'));
    footer.append(source, element('p', 'cmc-footnote', '価格・時価総額・出来高は米ドル表示。「最終取得」はこのサイトがCoinMarketCapからデータを受け取った日本時間です。「提供元の価格時刻」はCoinMarketCap側の更新時刻で、最終取得とは異なる場合があります。表示中は5分ごとに更新を確認し、サーバーでも最大5分保持します。再取得に失敗したときは前回成功時の値と警告を出します。7日間の簡易チャート画像はCoinMarketCap提供で、価格と更新タイミングが異なる場合があります。画面内のTradingView詳細チャートは別配信のため、ここの取得時刻は適用しません。'));

    const announcement = element('p', 'cmc-sr-only');
    announcement.setAttribute('role', 'status');
    section.replaceChildren(header, toolbar, notice, tableWrap, cards, emptyPanel, footer, announcement);
    ui = { cards, title, refreshButton, timestamp, quoteTime, freshness, count, search, notice, tableWrap, tbody, emptyPanel, emptyTitle, emptyDescription, headers, announcement };
    updateSortHeaders();
    renderLoading();
    return true;
  }

  function updateSortHeaders() {
    ui.headers.forEach(header => {
      const current = header.key === sortKey;
      header.th.setAttribute('aria-sort', current ? sortDirection : 'none');
      header.indicator.textContent = current ? (sortDirection === 'ascending' ? '↑' : '↓') : '↕';
      const next = current && sortDirection === 'ascending' ? '降順' : (current ? '昇順' : (header.key === 'rank' ? '昇順' : '降順'));
      header.button.setAttribute('aria-label', header.label + 'で' + next + 'に並べ替え');
      header.button.classList.toggle('is-sorted', current);
    });
  }

  function renderLoading() {
    const fragment = document.createDocumentFragment();
    for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
      const row = element('tr', 'cmc-skeleton-row');
      row.setAttribute('aria-hidden', 'true');
      SORT_COLUMNS.forEach((column, index) => {
        const cell = element('td', column.className);
        cell.append(element('span', index === 1 ? 'cmc-skeleton cmc-skeleton-name' : 'cmc-skeleton'));
        row.append(cell);
      });
      fragment.append(row);
    }
    ui.tbody.replaceChildren(fragment);
    ui.tableWrap.classList.add('is-loading');
    ui.announcement.textContent = 'CoinMarketCapの時価総額TOP50を取得しています。';
  }

  function priceText(value) {
    if (value === null) return '—';
    const options = { style: 'currency', currency: 'USD' };
    if (value > 0 && value < 0.0001) options.maximumSignificantDigits = 4;
    else {
      options.minimumFractionDigits = 2;
      options.maximumFractionDigits = value >= 1 || value === 0 ? 2 : (value >= 0.01 ? 4 : 6);
    }
    return new Intl.NumberFormat('en-US', options).format(value);
  }

  function valueCell(value, className, formatter) {
    const cell = element('td', className, value === null ? '—' : formatter(value));
    if (value === null) {
      cell.classList.add('cmc-unavailable');
      cell.setAttribute('aria-label', 'データなし');
    }
    return cell;
  }

  function percentCell(value) {
    const cell = valueCell(value, 'cmc-change-column', number => (number > 0 ? '+' : '') + decimal.format(number) + '%');
    if (value !== null) cell.classList.add(value > 0 ? 'cmc-positive' : value < 0 ? 'cmc-negative' : 'cmc-neutral');
    return cell;
  }

  function coinAvatar(coin) {
    const avatar = element('span', 'cmc-coin-avatar');
    avatar.setAttribute('aria-hidden', 'true');
    const monogram = element('span', 'cmc-monogram cmc-monogram-' + (coin.id % 5), Array.from(coin.symbol).slice(0, 2).join('').toUpperCase());
    monogram.setAttribute('aria-hidden', 'true');
    avatar.append(monogram);
    if (Number.isSafeInteger(coin.id) && coin.id > 0) {
      const logo = element('img', 'cmc-coin-logo');
      logo.alt = '';
      logo.setAttribute('aria-hidden', 'true');
      logo.width = 30;
      logo.height = 30;
      logo.decoding = 'async';
      logo.loading = 'lazy';
      logo.referrerPolicy = 'no-referrer';
      logo.addEventListener('load', () => {
        if (logo.naturalWidth > 0) avatar.classList.add('has-logo');
      }, { once: true });
      logo.addEventListener('error', () => {
        avatar.classList.remove('has-logo');
        logo.remove();
      }, { once: true });
      avatar.append(logo);
      logo.src = 'https://s2.coinmarketcap.com/static/img/coins/64x64/' + coin.id + '.png';
    }
    return avatar;
  }

  function safeCoinUrl(slug) {
    return typeof slug === 'string' && slug.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)
      ? CMC_ORIGIN + '/currencies/' + encodeURIComponent(slug) + '/'
      : null;
  }

  function renderRows() {
    const rows = data.coins.filter(coin => (!watchOnly||watched().includes(coin.id))&&(!query || (coin.name + ' ' + coin.symbol + ' ' + coin.slug).toLocaleLowerCase('ja').includes(query)));
    rows.sort((a, b) => {
      if (a[sortKey] === null && b[sortKey] === null) return a.rank - b.rank;
      if (a[sortKey] === null) return 1;
      if (b[sortKey] === null) return -1;
      const difference = (a[sortKey] - b[sortKey]) * (sortDirection === 'ascending' ? 1 : -1);
      return difference || a.rank - b.rank;
    });
    const fragment = document.createDocumentFragment();
    rows.forEach(coin => {
      const row = element('tr');
      const favoriteCell=element('td','cmc-watch-column');favoriteCell.append(watchButton(coin.id,coin.name));
      const rank = element('td', 'cmc-rank-column', String(coin.rank));
      const nameCell = element('th', 'cmc-name-column');
      nameCell.scope = 'row';
      const identity = element('div', 'cmc-coin-identity');
      const avatar = coinAvatar(coin);
      const name = element('span', 'cmc-coin-name');
      name.append(element('strong', '', coin.name), element('small', '', coin.symbol));
      identity.append(avatar, name);
      nameCell.append(identity);
      const price = valueCell(coin.price, 'cmc-price-column', priceText);
      const cap = valueCell(coin.marketCap, 'cmc-value-column', value => compactCurrency.format(value));
      const volume = valueCell(coin.volume24h, 'cmc-value-column', value => compactCurrency.format(value));
      if (coin.marketCap !== null) cap.title = fullCurrency.format(coin.marketCap);
      if (coin.volume24h !== null) volume.title = fullCurrency.format(coin.volume24h);
      const linkCell = element('td', 'cmc-link-column');
      const url = safeCoinUrl(coin.slug);
      if (url) {
        const link = element('a', 'cmc-coin-link', 'CMC');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', coin.name + 'をCoinMarketCapで開く（新しいタブ）');
        link.append(svgIcon('external'));
        linkCell.append(link);
      } else linkCell.textContent = '—';
      row.append(favoriteCell,rank, nameCell, price, percentCell(coin.change24h), percentCell(coin.change7d), cap, volume, linkCell);
      fragment.append(row);
    });
    const missing=watchOnly?watched().filter(id=>!data.coins.some(coin=>coin.id===id)):[];
    missing.forEach(id=>{
      const row=element('tr','watch-unavailable-row'),favorite=element('td','cmc-watch-column');favorite.append(watchButton(id,'銘柄ID '+id));
      const cell=element('td');cell.colSpan=SORT_COLUMNS.length-1;cell.textContent='銘柄ID '+id+' · 現在のTOP50に含まれないため価格を表示できません。';
      row.append(favorite,cell);fragment.append(row);
    });
    if (!rows.length&&!missing.length) {
      const row = element('tr');
      const cell = element('td', 'cmc-empty-search');
      cell.colSpan = SORT_COLUMNS.length;
      const emptyWatch=watchOnly&&!watched().length;
      cell.append(element('strong', '', emptyWatch?'暗号資産のウォッチリストはまだ空です':'一致する銘柄がありません'), element('span', '', emptyWatch?'暗号資産TOP50の一覧で☆を押して追加してください。':'TOP50に含まれる銘柄を名前・シンボルで検索できます。'));
      const clear = element('button', 'cmc-clear-search', emptyWatch?'暗号資産から追加':'検索をクリア');
      clear.type = 'button';
      clear.addEventListener('click', () => {
        if(emptyWatch){window.HWWorkspace?.openMarketPage('crypto');return;}
        query = '';
        ui.search.value = '';
        renderRows();
        ui.search.focus();
      });
      cell.append(clear);
      row.append(cell);
      fragment.append(row);
    }
    ui.tbody.replaceChildren(fragment);
    ui.count.textContent = watchOnly?rows.length+' 銘柄表示 / '+watched().length+' 登録'+(missing.length?' · TOP50圏外 '+missing.length:''):query ? rows.length + ' / ' + data.coins.length + ' 銘柄' : data.coins.length + ' 銘柄';
    const cardsView=watchOnly&&window.HWWorkspace?.getWatchView()==='charts';
    ui.tableWrap.hidden = cardsView;ui.cards.hidden=!cardsView;
    if(cardsView)renderMiniCards(rows,missing);else ui.cards.replaceChildren();
    ui.tableWrap.classList.remove('is-loading');
    ui.emptyPanel.hidden = true;
  }

  function renderMiniCards(rows,missing){
    const fragment=document.createDocumentFragment();
    rows.forEach(coin=>{
      const card=element('article','watch-chart-card'),top=element('div','watch-card-top'),identity=element('div','watch-card-identity'),name=element('div');
      name.append(element('h3','',coin.name),element('small','',coin.symbol));identity.append(coinAvatar(coin),name);top.append(identity,watchButton(coin.id,coin.name));
      const price=element('div','watch-card-price',priceText(coin.price));price.append(element('small','','USD'));
      const change=element('div','watch-card-change '+(coin.change24h>0?'cmc-positive':coin.change24h<0?'cmc-negative':''),coin.change24h===null?'—':(coin.change24h>0?'+':'')+decimal.format(coin.change24h)+'%');change.append(element('span','','24h'));
      const chart=element('div','watch-mini'),status=element('span','','チャートを読み込み中…'),spark=element('img','watch-mini-sparkline');
      spark.alt=coin.name+'の過去7日間のUSD価格推移（CoinMarketCap）';spark.loading='lazy';spark.decoding='async';spark.referrerPolicy='no-referrer';spark.width=320;spark.height=120;
      spark.addEventListener('load',()=>{status.remove();spark.classList.add('is-loaded');},{once:true});
      spark.addEventListener('error',()=>{spark.remove();status.textContent='簡易チャートを取得できませんでした';},{once:true});
      chart.append(status,spark);spark.src='https://s3.coinmarketcap.com/generated/sparklines/web/7d/2781/'+coin.id+'.svg';
      const caption=element('div','watch-mini-caption');caption.append(element('span','','過去7日間 · USD'),element('span','','CoinMarketCap'));
      const bottom=element('div','watch-card-bottom');bottom.append(element('small','','24h 出来高 '+(coin.volume24h===null?'—':compactCurrency.format(coin.volume24h))));
      const url=safeCoinUrl(coin.slug);if(url){const link=element('a','watch-card-detail','詳細チャート ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',coin.name+'の詳細をCoinMarketCapで開く');bottom.append(link);}
      card.append(top,price,change,chart,caption,bottom);fragment.append(card);
    });
    missing.forEach(id=>{const card=element('article','watch-chart-card'),top=element('div','watch-card-top');top.append(element('h3','','銘柄ID '+id),watchButton(id,'銘柄ID '+id));card.append(top,element('p','watch-card-unavailable','現在のTOP50に含まれないため価格とチャートを表示できません。'));fragment.append(card);});
    if(!rows.length&&!missing.length){const empty=element('div','watch-card-empty'),button=element('button','button',watched().length?'検索をクリア':'暗号資産から追加');empty.append(element('p','',watched().length?'一致する銘柄がありません。':'暗号資産のウォッチリストはまだ空です。TOP50の一覧で☆を押して追加してください。'));button.addEventListener('click',()=>{if(watched().length){query='';ui.search.value='';renderRows();}else window.HWWorkspace?.openMarketPage('crypto');});empty.append(button);fragment.append(empty);}
    ui.cards.replaceChildren(fragment);
  }

  function isDate(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
  }

  function validData(payload) {
    if (!payload || payload.source !== 'CoinMarketCap' || payload.currency !== 'USD' || !isDate(payload.updatedAt) || !isDate(payload.fetchedAt) || !Array.isArray(payload.coins) || payload.coins.length !== 50) return false;
    const ids = new Set();
    const ranks = new Set();
    return payload.coins.every(coin => {
      if (!coin || !Number.isInteger(coin.id) || coin.id <= 0 || ids.has(coin.id) || !Number.isInteger(coin.rank) || coin.rank < 1 || coin.rank > 50 || ranks.has(coin.rank)) return false;
      if (typeof coin.name !== 'string' || !coin.name.trim() || coin.name.length > 160 || typeof coin.symbol !== 'string' || !coin.symbol.trim() || coin.symbol.length > 40 || !safeCoinUrl(coin.slug) || !isDate(coin.updatedAt)) return false;
      const numbersValid = ['price', 'marketCap', 'volume24h', 'change24h', 'change7d'].every(key => coin[key] === null || (typeof coin[key] === 'number' && Number.isFinite(coin[key]) && (key.startsWith('change') || coin[key] >= 0)));
      if (!numbersValid) return false;
      ids.add(coin.id);
      ranks.add(coin.rank);
      return true;
    });
  }

  function errorCode(payload, status) {
    if (status === 429) return 'rate_limit';
    const value = payload && (payload.code || (payload.error && payload.error.code) || payload.error);
    return typeof value === 'string' ? value.toLowerCase() : 'upstream_error';
  }

  function formatStamp(iso) {
    const t = new Date(iso);
    return Number.isFinite(t.getTime()) ? dateFormatter.format(t) + ' JST' : '';
  }

  function setFreshness(kind, payload) {
    const fetchedAt = payload && payload.fetchedAt;
    const updatedAt = payload && payload.updatedAt;
    const staleView = kind === 'stale' || kind === 'client-fail';
    ui.timestamp.classList.toggle('is-stale', staleView);
    if (fetchedAt && Number.isFinite(Date.parse(fetchedAt))) {
      ui.timestamp.dateTime = fetchedAt;
      ui.timestamp.textContent = (staleView ? '最終取得（前回成功） ' : '最終取得 ') + formatStamp(fetchedAt);
    } else {
      ui.timestamp.removeAttribute('datetime');
      ui.timestamp.textContent = '最終取得時刻 —';
    }
    if (updatedAt && Number.isFinite(Date.parse(updatedAt))) {
      ui.quoteTime.hidden = false;
      ui.quoteTime.textContent = '提供元の価格時刻 ' + formatStamp(updatedAt);
    } else {
      ui.quoteTime.hidden = true;
      ui.quoteTime.textContent = '';
    }
    ui.freshness.textContent = kind === 'live' ? '5分ごとに確認 · 表示は最終取得時点の値です'
      : kind === 'stale' ? '提供元の再取得に失敗したため、前回成功時の値を表示'
      : kind === 'client-fail' ? '再取得できません。画面は前回成功時の値です'
      : '5分ごとに確認';
  }

  function showError(code, mode) {
    const messages = {
      configuration_required: ['サイトのデータ連携を準備中', 'CoinMarketCapの時価総額TOP50は、連携の準備ができ次第表示されます。'],
      rate_limit: ['データの更新を少しお待ちください', 'データ提供元のアクセス上限に達しました。時間をおいて「更新」をお試しください。'],
      timeout: ['データの取得に時間がかかっています', 'しばらくしてから「更新」をお試しください。'],
      upstream_error: ['データを取得できませんでした', 'CoinMarketCapのデータを現在取得できません。しばらくしてから「更新」をお試しください。']
    };
    const message = messages[code] || messages.upstream_error;
    if (data) {
      const stamp = formatStamp(data.fetchedAt);
      const fallback = mode === 'stale';
      ui.notice.textContent = fallback
        ? message[0] + '。提供元からの再取得に失敗したため、最終取得（前回成功）' + (stamp ? ' ' + stamp : '') + ' の値を表示しています。これは最新ではありません。'
        : message[0] + '。いま再取得できません。画面の値は最終取得（前回成功）' + (stamp ? ' ' + stamp : '') + ' 時点のものです。これは最新ではありません。';
      ui.notice.hidden = false;
      setFreshness(fallback ? 'stale' : 'client-fail', data);
    } else {
      ui.tableWrap.hidden = true;
      ui.emptyPanel.hidden = false;
      ui.emptyTitle.textContent = message[0];
      ui.emptyDescription.textContent = message[1];
      ui.count.textContent = 'データ未取得';
      setFreshness('empty');
    }
    ui.announcement.textContent = message[0];
  }

  function refresh() {
    if (!mount() || !shown || document.hidden) return Promise.resolve(false);
    if (pending) return pending;
    lastAttemptAt = Date.now();
    ui.refreshButton.disabled = true;
    ui.refreshButton.classList.add('is-refreshing');
    section.setAttribute('aria-busy', 'true');
    if (!data) {
      ui.emptyPanel.hidden = true;
      ui.tableWrap.hidden = false;
      ui.count.textContent = 'データを取得中';
      renderLoading();
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    pending = (async () => {
      try {
        const response = await fetch('/api/crypto-top50', {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
          signal: controller.signal
        });
        let payload;
        try { payload = await response.json(); } catch { throw { code: 'upstream_error' }; }
        if (!response.ok || payload.error) throw { code: errorCode(payload, response.status) };
        if (!validData(payload)) throw { code: 'upstream_error' };
        data = payload;
        ui.notice.hidden = true;
        setFreshness('live', data);
        renderRows();
        if (payload.stale === true) showError(payload.staleReason || 'upstream_error', 'stale');
        else ui.announcement.textContent = 'CoinMarketCapの50銘柄のデータを確認しました。最終取得 ' + formatStamp(data.fetchedAt) + ' 時点の値です。';
        return true;
      } catch (error) {
        showError(error && error.name === 'AbortError' ? 'timeout' : (error && error.code), data ? 'client-fail' : 'first-fail');
        return false;
      } finally {
        clearTimeout(timeout);
        ui.refreshButton.disabled = false;
        ui.refreshButton.classList.remove('is-refreshing');
        section.setAttribute('aria-busy', 'false');
        pending = null;
      }
    })();
    return pending;
  }

  function stopInterval() {
    if (interval !== null) clearInterval(interval);
    interval = null;
  }

  function resume() {
    stopInterval();
    if (!shown || document.hidden) return;
    if (!lastAttemptAt || Date.now() - lastAttemptAt >= REFRESH_MS) refresh();
    interval = setInterval(() => {
      if (shown && !document.hidden) refresh();
    }, REFRESH_MS);
  }

  function show(options={}) {
    if (!mount()) return;
    watchOnly=options.watchlist===true;query='';ui.search.value='';ui.title.textContent=watchOnly?'暗号資産 ウォッチリスト':'時価総額 TOP50';
    shown = true;
    section.hidden = false;
    if(data)renderRows();
    resume();
  }

  function hide() {
    shown = false;
    stopInterval();
    if (section) section.hidden = true;
  }

  document.addEventListener('visibilitychange', resume);
  window.addEventListener('hw:watchlists-changed',()=>{if(shown&&data)renderRows();});
  window.CryptoTop50 = Object.freeze({ show, hide, refresh });
}());
