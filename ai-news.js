'use strict';
(() => {
  // タブ: ?tab=ai（既定）/ ?tab=crypto。#crypto でも開ける。
  const FEEDS = {
    ai: { url: 'data/ai-news.json', label: 'AI', eyebrow: 'AI NEWS BOARD', heading: '最新のAIニュース',
      title: 'AIの大きな動きを、<span>確かな出典で。</span>', lead: '市場に影響する大きなAIニュースだけを、公式発表・提出書類・大手報道で確認して掲載します。' },
    crypto: { url: 'data/crypto-news.json', label: '暗号資産', eyebrow: 'CRYPTO NEWS BOARD', heading: '最新の暗号資産ニュース',
      title: '暗号資産の大きな動きを、<span>確かな出典で。</span>', lead: '相場に影響する大きな暗号資産ニュースだけを、公式発表・規制当局・大手報道で確認して掲載します。' }
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } };
  const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${m[1]}.${m[2]}.${m[3]}` : esc(d); };
  const fmtJst = iso => { const t = new Date(iso); if (isNaN(t)) return ''; return new Intl.DateTimeFormat('ja-JP', {timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}).format(t) + ' JST'; };
  function historyEntries(item) {
    const raw = item && (item.history || item.updates || item.corrections);
    if (!Array.isArray(raw)) return [];
    return raw.map(h => {
      if (!h || typeof h !== 'object') return null;
      const at = h.at || h.updatedAt || h.date || h.correctedAt;
      const note = h.note || h.summary || h.description || h.change;
      if (typeof at !== 'string' || !Number.isFinite(Date.parse(at))) return null;
      if (typeof note !== 'string' || !note.trim()) return null;
      return { at, note: note.trim() };
    }).filter(Boolean).sort((a, b) => b.at.localeCompare(a.at));
  }
  function historyHtml(item) {
    const hist = historyEntries(item);
    if (!hist.length) return '';
    return `<details class="an-history"><summary>訂正・更新履歴 ${hist.length}件</summary><ol>${hist.map(h => `<li><time datetime="${esc(h.at)}">${esc(fmtJst(h.at) || h.at)}</time><span>${esc(h.note)}</span></li>`).join('')}</ol></details>`;
  }
  const cache = {};
  let tab = 'ai', items = [], category = 'all', loadSeq = 0;

  function render() {
    const list = category === 'all' ? items : items.filter(i => i.category === category);
    $('newsCount').textContent = `${list.length} ITEMS`;
    if (!list.length) { $('newsList').innerHTML = '<p class="an-status">該当するニュースはありません。</p>'; return; }
    $('newsList').innerHTML = list.map(i => {
      const url = safeUrl(i.sourceUrl);
      const related = (i.relatedSources || []).map(r => { const u = safeUrl(r.url); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(r.name)} ↗</a>` : ''; }).join('');
      const tickers = (i.tickers || []).length ? `<span class="an-tickers">${i.tickers.map(t => `<span>${esc(t)}</span>`).join('')}</span>` : '';
      const market = i.marketNote ? `<p class="an-market"><b>市場への視点</b>${esc(i.marketNote)}${tickers}</p>` : '';
      return `<article class="an-item" id="${esc(i.id)}">
        <div class="an-date"><time datetime="${esc(i.date)}">${fmtDate(i.date)}</time><small>発表日（現地）</small><span class="an-category">${esc(i.category)}</span></div>
        <div class="an-body">
          <h3>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a>` : esc(i.title)}</h3>
          <p class="an-summary">${esc(i.summary)}</p>
          ${market}
          <div class="an-sources"><span>出典：</span>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(i.sourceName)} ↗</a>` : esc(i.sourceName)}${related}</div>
          ${historyHtml(i)}
        </div>
      </article>`;
    }).join('');
  }

  function renderFilters() {
    const cats = ['all', ...new Set(items.map(i => i.category))];
    $('newsFilters').innerHTML = cats.map(c => `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === category}">${c === 'all' ? 'すべて' : esc(c)}</button>`).join('');
    $('newsFilters').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      category = b.dataset.cat;
      $('newsFilters').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      render();
    }));
  }

  async function getFeed(name) {
    if (cache[name]) return cache[name];
    const res = await fetch(FEEDS[name].url, {cache: 'no-cache'});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    data.items = (data.items || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.verifiedAt || '').localeCompare(a.verifiedAt || ''));
    return (cache[name] = data);
  }

  async function show(name, {push = false} = {}) {
    tab = FEEDS[name] ? name : 'ai';
    const f = FEEDS[tab], seq = ++loadSeq;
    category = 'all';
    document.querySelectorAll('[data-tab]').forEach(b => { const on = b.dataset.tab === tab; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    $('newsEyebrow').innerHTML = `${f.eyebrow} <span class="eyebrow-line"></span>`;
    $('newsTitle').innerHTML = f.title;
    $('newsLead').textContent = f.lead;
    $('newsHeading').textContent = f.heading;
    $('breadcrumbCurrent').textContent = `ニュース：${f.label}`;
    document.title = `${f.label}ニュース | HELLO WORLD Markets（HWMarkets）`;
    const url = tab === 'ai' ? location.pathname : `${location.pathname}?tab=${tab}`;
    if (push) history.pushState({tab}, '', url); else history.replaceState({tab}, '', url);
    $('newsList').innerHTML = '<p class="an-status">ニュースを読み込んでいます…</p>';
    $('newsFilters').innerHTML = ''; $('newsCount').textContent = '';
    try {
      const data = await getFeed(tab);
      if (seq !== loadSeq) return;
      items = data.items;
      $('newsUpdated').textContent = data.updatedAt ? `最終更新 ${fmtJst(data.updatedAt)}` : '';
      if (data.editorialPolicy) $('newsPolicy').textContent = data.editorialPolicy;
      renderFilters();
      render();
    } catch (e) {
      if (seq !== loadSeq) return;
      $('newsList').innerHTML = '<p class="an-status">ニュースを読み込めませんでした。時間をおいて再読み込みしてください。</p>';
      $('newsUpdated').textContent = '';
    }
  }

  const initial = () => new URLSearchParams(location.search).get('tab') || location.hash.slice(1) || 'ai';
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { if (b.dataset.tab !== tab) show(b.dataset.tab, {push: true}); }));
  document.querySelector('.an-tabs').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const keys = Object.keys(FEEDS), next = keys[(keys.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length];
    show(next, {push: true}).then(() => document.querySelector(`[data-tab="${next}"]`).focus());
  });
  window.addEventListener('popstate', () => show(initial()));
  $('currentYear').textContent = new Date().getFullYear();
  show(initial());
})();
