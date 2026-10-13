// ShowLamb — interface
import * as g from './game.js';
import { SHEEP_PATH, BREEDS, TRAITS, TRAIT_LABEL, EPDS, FEEDS, STATES, TIER, ACHIEVEMENTS } from './data.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => g.G.s;
const money = g.money;
const UI = { tab: 'barn', filter: 'all', mtab: 'browse', mfilter: 'all', stab: 'upcoming', ntab: 'mine', more: 'leaders', sheet: null, setup: null, enter: null, rtab: 'mine', btab: 'natural' };

document.getElementById('sheeppath').setAttribute('d', SHEEP_PATH);

// ---------- storage ----------
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('showlamb', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function dbGet(k) { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function dbPut(k, v) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
let saveTimer = null;
function save(now) {
  clearTimeout(saveTimer);
  const go = () => { const s = S(); if (!s?.started) return; const toasts = s.toasts; s.toasts = []; dbPut('game', s).catch(e => console.warn('save failed', e)).finally(() => { s.toasts = toasts.concat(s.toasts); }); };
  if (now) go(); else saveTimer = setTimeout(go, 3000);
}

// ---------- sheep drawing ----------
function colorsOf(a) {
  if (a.breed === 'Crossbred') return a.face === 'white' ? { fleece: '#f2ede2', head: '#f8f5ee', legs: '#f8f5ee' } : { fleece: '#f2ede2', head: '#1a1a1a', legs: '#1d1d1d' };
  if (a.breed === 'Commercial') return a.face === 'black' ? { fleece: '#f2ede2', head: '#1a1a1a', legs: '#1d1d1d' } : { fleece: BREEDS.Commercial.fleece, head: BREEDS.Commercial.head, legs: BREEDS.Commercial.legs };
  const b = BREEDS[a.breed] || BREEDS.Commercial; return { fleece: b.fleece, head: b.head, legs: b.legs };
}
function sheep(a, w = 60) {
  const c = colorsOf(a);
  let sc = 1;
  if (a.wt && a.base?.frame) { sc = Math.min(1, Math.max(0.55, 0.5 + 0.5 * a.wt / (a.base.frame * 1.15))); if (a.sex === 'R') sc = Math.min(1, sc + 0.05); }
  const tx = (576 * (1 - sc) / 2).toFixed(1), ty = (532 * (1 - sc)).toFixed(1);
  return `<svg viewBox="0 0 576 532" width="${w}" height="${Math.round(w * 532 / 576)}" aria-hidden="true"><g transform="translate(${tx},${ty}) scale(${sc.toFixed(3)})"><g clip-path="url(#sheepclip)"><rect width="576" height="532" fill="${c.fleece}"/><polygon points="0,405 250,405 400,365 576,365 576,532 0,532" fill="${c.legs}"/><polygon points="370,0 576,0 576,92 515,92 430,115 370,110" fill="${c.head}"/></g><path d="${SHEEP_PATH}" fill="none" stroke="rgba(0,0,0,.38)" stroke-width="${(4 / sc).toFixed(1)}"/></g></svg>`;
}
const bannerSVG = (color = '#5b2a86') => `<svg class="banner" viewBox="0 0 30 40"><rect x="3" y="0" width="24" height="30" fill="${color}"/><polygon points="3,30 15,40 27,30" fill="${color}"/><rect x="0" y="0" width="30" height="4" fill="#c99a2e"/><circle cx="15" cy="15" r="6" fill="none" stroke="#f4e6c3" stroke-width="1.6"/></svg>`;
const ICON = {
  barn: '<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6v10H3z"/><path d="M9 20v-6h6v6"/><path d="M9 14l6 6M15 14l-6 6"/></svg>',
  breed: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>',
  show: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M9 12.5L7 21l5-3 5 3-2-8.5"/></svg>',
  market: '<svg viewBox="0 0 24 24"><path d="M14 4l6 6-3 3-6-6z"/><path d="M11 7l-7 7 3 3 7-7"/><path d="M3 21h10"/></svg>',
  news: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
};

// ---------- small helpers ----------
const condLabel = c => c < 2 ? 'Thin' : c < 2.6 ? 'Lean' : c < 3.4 ? 'Ideal' : c < 4 ? 'Fleshy' : 'Overdone';
const signed = (v, dec) => (v >= 0 ? '+' : '') + v.toFixed(dec);
const daysTo = d => { const n = d - S().day; return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`; };
const stars = owner => { const r = g.repMult(owner); return '★'.repeat(Math.max(1, Math.round((r - 1) / 1.5 * 4) + 1)); };
function pregBadge(a) {
  if (!a.preg) return '';
  if (S().day < a.preg.check || a.preg.ok) return `<span class="b preg">Due ${g.fmtShort(a.preg.due)}</span>`;
  return '';
}
function badges(a) {
  const out = [];
  if (a.reg) out.push('<span class="b reg">Reg</span>');
  else if (a.regOk && a.sex !== 'W' && a.owner === 'P') out.push('<span class="b list">Can register</span>');
  if (a.string) out.push('<span class="b str">Show string</span>');
  out.push(pregBadge(a));
  if (a.listing) out.push('<span class="b list">For sale</span>');
  const bn = (a.record || []).filter(r => r.banner).length; if (bn) out.push(`<span class="b ban">${bn} banner${bn > 1 ? 's' : ''}</span>`);
  if (a.tested?.spider && a.spider) out.push(`<span class="b bad">${a.spider === 2 ? 'Spider' : 'Spider carrier'}</span>`);
  else if (a.spider === 2 && g.ageDays(a) > 14) out.push('<span class="b bad">Unthrifty</span>');
  if (a.et) out.push('<span class="b">ET</span>');
  return out.join('');
}
const nameTag = a => a.named === false ? `<span>${esc(a.tag || a.name)}</span>` : `${esc(a.name)} <span class="tag">${esc(a.tag || '')}</span>`;
function animalRow(a) {
  const st = []; if (a.away && a.away > S().day) st.push(`<span class="b bad">On lease until ${g.fmtShort(a.away)}</span>`);
  return `<button class="arow" data-act="animal" data-id="${a.id}"><div class="grow"><div class="nm">${nameTag(a)}</div><div class="ln">${esc(g.breedLabel(a))} · ${g.sexText(a)} · ${g.ageText(a)}</div></div><div class="right"><div class="wt">${Math.round(a.wt)} lb</div><div class="badges" style="justify-content:flex-end">${badges(a)}${st.join('')}</div></div></button>`;
}
function animalCard(a, act = 'animal', extra = '') {
  return `<button class="card" data-act="${act}" data-id="${a.id}"><div class="pic">${sheep(a, 62)}</div><div class="grow"><div class="nm">${nameTag(a)}</div><div class="ln">${esc(g.breedLabel(a))} · ${g.sexText(a)} · ${g.ageText(a)}</div><div class="ln">${Math.round(a.wt)} lb${g.ageDays(a) < 450 && g.ageDays(a) >= 0 ? ` · ${condLabel(a.cond)}` : ''}${extra}</div><div class="badges">${badges(a)}</div></div></button>`;
}

// ---------- toasts ----------
function drainToasts() {
  const s = S(); if (!s?.toasts?.length) return;
  const box = $('#toasts');
  s.toasts.splice(0).slice(-2).forEach(t => {
    const el = document.createElement('div'); el.className = `toast ${t.kind}`; el.textContent = t.text; box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  });
  while (box.children.length > 2) box.firstChild.remove();
}
function flash(text, kind = 'info') { S().toasts.push({ text, kind }); drainToasts(); }
function result(err, okText) { if (err) flash(err, 'bad'); else if (okText) flash(okText, 'show'); save(); refreshAll(); return !err; }

// ---------- header & nav ----------
const SPEEDS = [[1, '1×', 'Real time (1 day = 1 month)'], [48, 'Fast', '1 game day per minute'], [288, 'Faster', '1 game day per 10 sec'], [1440, 'Turbo', '1 game day per 2 sec']];
function header() {
  const s = S(); const f = s.flocks[0];
  const sp = SPEEDS.find(x => x[0] === s.settings.speed) || SPEEDS[0];
  return `<div class="top-row"><div class="brand">${esc(f.name)}<small>${esc(STATES[s.home])}</small></div><div class="cash ${s.cash < 0 ? 'neg' : ''}">${money(s.cash)}</div></div>
  <div class="clock"><div class="date">${g.fmtDate(s.day)}<div class="bar"><i style="width:${s.paused ? 0 : Math.round(s.frac * 100)}%"></i></div></div>
  <button class="tbtn play" data-act="play" aria-label="${s.paused ? 'Play' : 'Pause'}">${s.paused ? '▶' : '❚❚'}</button>
  <button class="tbtn" data-act="speed" title="${sp[2]}">${sp[1]}</button>
  <button class="tbtn" data-act="adv" data-n="1">+1d</button><button class="tbtn" data-act="adv" data-n="7">+1w</button><button class="tbtn" data-act="adv" data-n="month">+1mo</button></div>`;
}
function nav() {
  const tabs = [['barn', 'Flock'], ['breed', 'Breeding'], ['shows', 'Shows'], ['market', 'Market'], ['news', 'News'], ['more', 'More']];
  const s = S();
  const unseen = s.news.filter(n => n.mine && n.day > (s.seenNews ?? -1)).length;
  return tabs.map(([k, l]) => `<button data-act="tab" data-tab="${k}" class="${UI.tab === k ? 'on' : ''}"><span class="${k === 'news' && unseen && UI.tab !== 'news' ? 'dot' : ''}">${ICON[k === 'shows' ? 'show' : k]}</span>${l}</button>`).join('');
}

// ---------- views ----------
function viewBarn() {
  const s = S(); const mine = g.myAnimals();
  const age = g.ageDays;
  const F = {
    all: () => true, ewes: a => a.sex === 'E' && age(a) >= 365, rams: a => a.sex === 'R', lambs: a => age(a) < 365,
    string: a => a.string, bred: a => !!a.preg, open: a => g.canBreed(a), sale: a => !!a.listing,
  };
  const list = mine.filter(F[UI.filter] || F.all);
  const chip = (k, l) => `<button class="chip ${UI.filter === k ? 'on' : ''}" data-act="filter" data-v="${k}">${l}</button>`;
  const due = mine.filter(a => a.preg && (a.preg.ok || s.day < a.preg.check)).sort((a, b) => a.preg.due - b.preg.due)[0];
  const sortA = (a, b) => (a.sex === b.sex ? 0 : a.sex === 'R' ? -1 : b.sex === 'R' ? 1 : 0) || (age(b) >= 365) - (age(a) >= 365) || a.birth - b.birth;
  const pensHtml = g.pens().map(p => {
    const inPen = list.filter(a => g.penOf(a) === p.id).sort(sortA);
    const total = g.penCount(p.id);
    if (!inPen.length && UI.filter !== 'all') return '';
    const open = UI.openPens?.has(p.id) || (UI.filter !== 'all' && inPen.length);
    return `<div class="pen" data-pen="${p.id}"><div class="penhead"><span class="grip" data-grip="${p.id}" aria-label="Drag to reorder">⠿</span><button class="penbtn" data-act="pentoggle" data-id="${p.id}"><b>${esc(p.name)}</b><span class="sub">${UI.filter !== 'all' ? `${inPen.length} shown · ` : ''}${total}${p.cap ? ` / ${p.cap}` : ''} head</span><span class="chev">${open ? '▾' : '▸'}</span></button><button class="lnk" data-act="penrename" data-id="${p.id}">Rename</button></div>
      ${open ? (inPen.length ? inPen.map(animalRow).join('') : '<div class="sub" style="padding:8px 12px">Empty — move animals here from their card.</div>') : ''}</div>`;
  }).join('');
  return `<h2>Your flock</h2>
  <div class="stats"><div class="stat"><b>${mine.length}</b><span>Head</span></div><div class="stat"><b>${mine.filter(F.ewes).length}</b><span>Ewes</span></div><div class="stat"><b>${mine.filter(F.lambs).length}</b><span>Lambs</span></div><div class="stat"><b>${mine.filter(F.string).length}</b><span>Showing</span></div></div>
  ${due ? `<div class="note">Next lambing: <b>${esc(due.name)}</b> due ${g.fmtShort(due.preg.due)} (${daysTo(due.preg.due)}).</div>` : ''}
  <div class="btns" style="margin:0 0 10px"><button class="btn sm" data-act="buildpen">Build a pen ${money(g.PEN_COST)}</button><button class="btn sm sec" data-act="gsalesheet">Group sale</button>${mine.some(a => age(a) < 365) ? '<button class="btn sm sec" data-act="tagsheet">Ear tag lambs</button>' : ''}</div>
  <div class="chips">${chip('all', 'All')}${chip('ewes', 'Ewes')}${chip('rams', 'Rams')}${chip('lambs', 'Lambs')}${chip('string', 'Show string')}${chip('open', 'Open ewes')}${chip('bred', 'Bred')}${chip('sale', 'For sale')}</div>
  <div id="pens">${list.length ? pensHtml : '<div class="empty">Nothing here.</div>'}</div>`;
}

function seasonNote() {
  const m = g.monthOf(S().day);
  if (m >= 7 && m <= 11) return 'Peak breeding season — ewes are cycling and conception is at its best. Breed now for winter lambs that are ready for spring and summer shows.';
  if (m <= 1) return 'Late season — conception is starting to drop off.';
  return 'Out of season — most breeds settle poorly now. Dorsets, Dorpers, Katahdins and fine-wools still cycle; fall-born lambs from these matings hit the winter majors.';
}
function viewBreed() {
  const s = S(); const mine = g.myAnimals();
  const open = mine.filter(a => g.canBreed(a));
  const bred = mine.filter(a => a.preg).sort((a, b) => a.preg.due - b.preg.due);
  const rams = [...mine.filter(a => a.sex === 'R' && g.ageDays(a) >= 200), ...g.living().filter(a => a.leasedTo === 'P' && a.leaseUntil > s.day)];
  const row = (a, right) => `<div class="card"><div class="pic">${sheep(a, 54)}</div><div class="grow"><div class="nm">${esc(a.name)}</div><div class="ln">${esc(g.breedLabel(a))} · ${g.ageText(a)}</div></div>${right}</div>`;
  return `<h2>Breeding</h2><div class="btns" style="margin:0 0 10px"><button class="btn sm" data-act="bbsheet" data-v="breed">Bulk breed</button><button class="btn sm sec" data-act="bbsheet" data-v="sync">Synchronize ewes</button></div><div class="note">${seasonNote()}</div>
  <h3>Open ewes (${open.length})</h3>
  ${open.length ? `<div class="cards">${open.map(a => row(a, `<button class="btn sm" data-act="breedsheet" data-id="${a.id}">Breed</button>`)).join('')}</div>` : '<div class="empty">No open ewes old enough to breed (8+ months).</div>'}
  <h3>Bred & pregnant (${bred.length})</h3>
  ${bred.length ? `<div class="cards">${bred.map(a => {
    const p = a.preg; const st = s.day < p.check ? `Due ${g.fmtShort(p.due)} · ${p.method} · preg check ${g.fmtShort(p.check)}` : `Due ${g.fmtShort(p.due)} · ${p.method} · confirmed`;
    return `<button class="card" data-act="animal" data-id="${a.id}"><div class="pic">${sheep(a, 54)}</div><div class="grow"><div class="nm">${esc(a.name)}</div><div class="ln">${st}</div><div class="ln">Sire: ${esc(p.sire.name)}${p.donor ? ` · embryo from ${esc(p.donor.name)}` : ''}</div></div></button>`;
  }).join('')}</div>` : '<div class="empty">No ewes bred yet.</div>'}
  <h3>Semen tank</h3>
  ${s.tank.length ? s.tank.map(t => `<div class="card"><div class="grow"><div class="nm">${esc(t.snap.name)}${t.own || t.snap.owner === 'P' ? ' <span class="b str">Your ram</span>' : ''}</div><div class="ln">${esc(g.breedLabel(t.snap))} · ${esc(t.snap.ownerName)}</div></div><div class="price">${t.straws}<span class="sub"> straws</span></div></div>`).join('') : '<div class="empty">No semen. Buy straws from the <a href="#" data-act="gosires">sire directory</a>.</div>'}
  <h3>Embryos</h3>
  ${s.embryos.length ? s.embryos.map(e => `<div class="card"><div class="grow"><div class="nm">${esc(e.sire.name)} × ${esc(e.dam.name)}</div><div class="ln">${esc(g.breedLabel(e.dam))} · ${e.count} embryo${e.count > 1 ? 's' : ''} · flushed ${g.fmtShort(e.day)}</div></div><button class="btn sm" data-act="implantsheet" data-id="${e.id}">Transfer</button><button class="btn sm sec" data-act="sellembsheet" data-id="${e.id}">Sell</button></div>`).join('') : '<div class="empty">No embryos. Flush a donor ewe from her animal card.</div>'}
  <h3>Your rams</h3>
  ${rams.length ? `<div class="pen">${rams.map(animalRow).join('')}</div>` : '<div class="empty">No rams old enough to use.</div>'}`;
}

function viewShows() {
  const s = S();
  const seg = `<div class="seg"><button class="${UI.stab === 'upcoming' ? 'on' : ''}" data-act="stab" data-v="upcoming">Upcoming</button><button class="${UI.stab === 'results' ? 'on' : ''}" data-act="stab" data-v="results">Results</button><button class="${UI.stab === 'series' ? 'on' : ''}" data-act="stab" data-v="series">Series</button><button class="${UI.stab === 'trophy' ? 'on' : ''}" data-act="stab" data-v="trophy">Trophies</button></div>`;
  if (UI.stab === 'series') return `<h2>Shows</h2>${seg}${viewSeries()}`;
  if (UI.stab === 'results') {
    return `<h2>Shows</h2>${seg}${s.results.length ? s.results.map((r, i) => `<button class="card" data-act="result" data-i="${i}"><div class="grow"><div class="nm">${esc(r.name)}</div><div class="ln">${g.fmtDate(r.day)} · Judge ${esc(r.judge.name)} · ${r.market?.count || 0} market${r.breeding ? ` · ${r.breeding.count} breeding` : ''}</div>${r.market ? `<div class="ln">Grand: ${esc(r.market.grand.name)} — ${esc(r.market.grand.flock)}</div>` : ''}${r.mine.length ? `<div class="badges"><span class="b str">${r.mine.length} of yours</span></div>` : ''}</div></button>`).join('') : '<div class="empty">No shows held yet.</div>'}`;
  }
  if (UI.stab === 'trophy') {
    const col = { grand: '#5b2a86', reserve: '#8c74a8', breed: '#1f4e9c', breedres: '#c4c9d4', series: '#c99a2e' };
    return `<h2>Shows</h2>${seg}${s.banners.length ? s.banners.map(b => `<div class="card">${bannerSVG(col[b.kind])}<div class="grow"><div class="nm">${esc(b.title)}</div><div class="ln">${esc(b.animal)} · ${esc(b.show)} · ${g.fmtDate(b.day)}</div></div></div>`).join('') : '<div class="empty">No banners yet. Go win one.</div>'}`;
  }
  const f = UI.sfilter || 'all';
  const tierOk = sh => f === 'all' || (f === 'jackpot' && sh.jackpot) || (f === 'county' && sh.tier === 'county') || (f === 'state' && sh.tier === 'state') || (f === 'national' && (sh.tier === 'major' || sh.tier === 'national'));
  const up = g.upcomingShows(f === 'jackpot' ? 30 : f === 'all' ? 24 : 12, { noJackpots: !['all', 'jackpot'].includes(f), jackpotsOnly: f === 'jackpot', horizon: f === 'jackpot' ? 120 : 75 }).filter(tierOk);
  const sc = (k, l) => `<button class="chip ${f === k ? 'on' : ''}" data-act="sfilter" data-v="${k}">${l}</button>`;
  return `<h2>Shows</h2>${seg}<div class="btns" style="margin:0 0 10px"><button class="btn sm" data-act="bulksheet">Bulk enter shows</button></div><div class="chips">${sc('all', 'All')}${sc('jackpot', 'Jackpots')}${sc('county', 'County fair')}${sc('state', 'State fair')}${sc('national', 'National')}</div>${up.length ? '' : '<div class="empty">None coming up.</div>'}${up.map(sh => {
    const j = g.judgeFor(sh.key); const e = s.entries[sh.key]; const n = e ? ['market', 'breeding', 'commercial'].reduce((t, d) => t + (e[d] || []).length, 0) : 0;
    return `<div class="panel"><div class="row"><div class="grow"><div class="nm" style="font-weight:700">${esc(sh.name)}</div><div class="sub">${g.fmtDate(sh.day)} · ${daysTo(sh.day)}</div></div><span class="b ${sh.tier === 'national' || sh.tier === 'major' ? 'ban' : ''}">${sh.jackpot ? (sh.regional ? 'Regional jackpot' : 'Jackpot') : TIER[sh.tier].label}</span></div>${sh.venue ? `<div class="sub">${esc(sh.venue)}, ${esc(STATES[sh.host])}</div>` : ''}
    ${sh.series ? `<div class="badges" style="margin-top:4px"><span class="b list">${esc(sh.series)}</span></div>` : ''}
    <div class="sub" style="margin-top:6px">${sh.commercial ? 'Market lambs · registered breeding · commercial ewes' : sh.breeding ? 'Market lambs + breeding sheep' : 'Market lambs'} · weights ${sh.minWt}–${sh.maxWt} lb · ${money(sh.fee)}/head</div>
    <div class="sub">Judge: <b>${esc(j.name)}</b> (${esc(j.from)}) — ${esc(['Power judge — muscle & dimension', 'Balance & eye appeal', 'Structure first', 'Complete package', 'Big-boned & stout'][j.style])}</div>
    <div class="btns"><button class="btn sm" data-act="entersheet" data-key="${sh.key}">${n ? `My entries (${n})` : 'Enter'}</button><button class="btn sm sec" data-act="showsheet" data-key="${sh.key}">Who’s entered</button></div></div>`;
  }).join('')}`;
}

const CATS = [['all', 'All'], ['lamb', 'Ewe lambs'], ['wether', 'Wethers'], ['ewe', 'Ewes'], ['bred', 'Bred ewes'], ['ram', 'Rams'], ['semen', 'Semen & leases'], ['embryo', 'Embryos']];
function marketItems() {
  const s = S(); const items = [];
  for (const L of s.listings) {
    if (L.seller === 'P') continue;
    if (L.kind === 'embryo') { items.push({ L, cat: 'embryo', breed: L.emb.dam.breed, price: g.currentBid(L).price, q: (g.breedingIndex(L.emb.dam) + g.breedingIndex(L.emb.sire)) / 2, end: L.end }); continue; }
    const a = s.animals[L.aid]; if (!a) continue;
    const cat = g.listCategory(a);
    items.push({ L, a, cat, breed: a.breed, price: L.mode === 'auction' ? g.currentBid(L).price : L.price, q: cat === 'lamb' || cat === 'wether' ? g.marketIndex(a) : g.breedingIndex(a), end: L.end });
  }
  for (const d of s.directory) if (d.owner !== 'P') items.push({ d, cat: 'semen', breed: d.snap.breed, price: d.price || d.lease, q: g.breedingIndex(d.snap), end: d.until });
  return items;
}
function semenCard(d) {
  const sn = d.snap; const ts = g.traitScores(sn); const live = S().animals[d.ramId];
  const left = g.strawsLeft(d); const away = live && (!g.ramHome(live) || live.leasedTo);
  const semen = d.price > 0 ? `<div class="offer"><div><b>${money(d.price)}</b> /straw<div class="sub">${left === Infinity ? 'Straws available' : `${left} straws left`}</div></div>${left > 0 ? `<div class="row"><select data-on="qty" data-id="${d.id}" style="width:auto;padding:4px 6px">${[1, 2, 4, 6, 10].filter(n => n <= left).map(n => `<option>${n}</option>`).join('')}</select><button class="btn sm" data-act="buysemen" data-id="${d.id}">Buy</button></div>` : '<span class="sub">Sold out</span>'}</div>` : '';
  const lease = d.lease > 0 ? `<div class="offer"><div><b>${money(d.lease)}</b> lease<div class="sub">${g.LEASE_DAYS} days on your farm</div></div>${away ? `<span class="sub">Out until ${g.fmtShort(live.away)}</span>` : `<button class="btn sm gold" data-act="lease" data-id="${d.id}">Lease</button>`}</div>` : '';
  return `<div class="card" style="display:block"><div class="row"><div class="grow"><button class="nm" style="border:0;background:none;padding:0;text-align:left" data-act="snap" data-id="${d.id}">${esc(sn.name)}</button><div class="ln">${esc(g.breedLabel(sn))} · ${esc(sn.ownerName)} ${stars(sn.owner)}</div><div class="ln">MUS ${ts.muscle} · DIM ${ts.dimension} · BAL ${ts.balance} · STR ${ts.structure}${sn.reg ? ` · WW ${signed(g.epdShown(sn, 'WW'), 1)}` : ''}</div></div></div>${semen}${lease}</div>`;
}
const CAT_LABEL = { lamb: 'Ewe lamb', wether: 'Wether', ewe: 'Ewe', bred: 'Bred ewe', ram: 'Ram', semen: 'Semen', embryo: 'Embryos' };
function lotCard(it) {
  const s = S(); const L = it.L; const cb = g.currentBid(L);
  const status = L.playerMax ? (cb.leader === 'P' ? '<span class="b str">You lead</span>' : '<span class="b bad">Outbid</span>') : '';
  const priceLine = L.mode === 'auction' ? `${money(cb.price)} · ${cb.count} bid${cb.count === 1 ? '' : 's'} · closes ${g.fmtShort(L.end)}` : `Buy now ${money(L.price)}`;
  const seller = `${esc(g.flockName(L.seller))} (${g.flock(L.seller)?.state || ''}) ${stars(L.seller)}`;
  if (L.kind === 'embryo') return `<button class="card" data-act="lot" data-id="${L.id}"><div class="grow"><div class="nm">${L.emb.count} embryos — ${esc(L.emb.sire.name)} × ${esc(L.emb.dam.name)}</div><div class="ln">${esc(g.breedLabel(L.emb.dam))} · ${seller}</div><div class="ln"><b>${priceLine}</b></div><div class="badges"><span class="b">Embryos</span>${status}</div></div></button>`;
  const a = it.a;
  return `<button class="card" data-act="lot" data-id="${L.id}"><div class="grow"><div class="nm">${nameTag(a)}</div><div class="ln">${esc(g.breedLabel(a))} · ${g.ageText(a)} · ${Math.round(a.wt)} lb</div><div class="ln">${seller}</div><div class="ln"><b>${priceLine}</b></div><div class="badges"><span class="b">${CAT_LABEL[it.cat]}</span>${it.cat === 'bred' && a.preg ? `<span class="b preg">${s.day >= a.preg.check ? `Due ${g.fmtShort(a.preg.due)} · ${esc(a.preg.sire.name)}` : `Exposed to ${esc(a.preg.sire.name)}`}</span>` : ''}${a.reg ? '<span class="b reg">Reg</span>' : ''}${status}</div></div></button>`;
}
function viewSeries() {
  const s = S(); const all = Object.entries(s.series || {}).map(([k, v]) => ({ k, ...v }));
  if (!all.length) return '<div class="empty">Series points start with the first series jackpot. Half of all jackpots Feb–Oct count toward a state series; final standings pay out Nov 1.</div>';
  const years = [...new Set(all.map(x => x.year))].sort((a, b) => b - a);
  const yr = UI.syear && years.includes(UI.syear) ? UI.syear : years[0];
  const list = all.filter(x => x.year === yr).sort((a, b) => (b.farms.P || 0) - (a.farms.P || 0) || b.shows - a.shows);
  const cur = list.find(x => x.k === UI.sname) || list[0];
  const animals = Object.entries(cur.animals).sort((a, b) => b[1].pts - a[1].pts);
  const farms = Object.entries(cur.farms).sort((a, b) => b[1] - a[1]);
  const myF = farms.findIndex(x => x[0] === 'P');
  const rowA = ([id, r], i) => `<div class="lb" ${r.owner === 'P' ? 'style="font-weight:700;color:var(--barn)"' : ''}><div class="r">${i + 1}</div><div class="grow">${esc(r.name)} <span class="sub">${esc(r.tag || '')}</span><div class="sub">${esc(r.breed)} · ${esc(r.flock)}</div></div><div>${r.pts}</div></div>`;
  const rowF = ([fid, pts], i) => `<div class="lb" ${fid === 'P' ? 'style="font-weight:700;color:var(--barn)"' : ''}><div class="r">${i + 1}</div><div class="grow">${esc(g.flockName(fid))}</div><div>${pts}</div></div>`;
  return `<div class="filters"><select data-on="syear">${years.map(y => `<option ${y === yr ? 'selected' : ''}>${y}</option>`).join('')}</select><select data-on="sname">${list.map(x => `<option value="${esc(x.k)}" ${x === cur ? 'selected' : ''}>${esc(x.name)}${x.farms.P ? ' ★' : ''}</option>`).join('')}</select></div>
  <div class="note">${cur.paid ? `Final standings — paid out.` : `Season runs Feb–Oct; top 3 wethers, ewes, rams and flocks each win ${g.SERIES_PRIZES.map(money).join(' / ')}, a buckle, and a reputation boost on Nov 1.`} ${cur.shows} show${cur.shows === 1 ? '' : 's'} so far. Points: head in class for 1st, one less per place; breed/division champion +5, reserve +3.</div>
  ${[['W', 'High-point wether'], ['E', 'High-point ewe'], ['R', 'High-point ram']].map(([sx, t]) => { const L = animals.filter(([, r]) => (r.sex || 'W') === sx); const mine = L.map((x, i) => [x, i]).filter(([x, i]) => x[1].owner === 'P' && i >= 10); return `<h3>${t}</h3><div class="panel">${L.length ? L.slice(0, 10).map(rowA).join('') + mine.map(([x, i]) => rowA(x, i)).join('') : '<div class="sub">No points yet.</div>'}</div>`; }).join('')}
  <h3>High-point flocks</h3><div class="panel">${farms.slice(0, 15).map(rowF).join('')}${myF >= 15 ? rowF(farms[myF], myF) : ''}</div>`;
}
function sheetBulk() {
  const s = S(); const b = UI.bulk;
  const mine = g.myAnimals().filter(a => g.ageDays(a) < 760 && !a.listing && a.spider !== 2).sort((x, y) => (y.string ? 1 : 0) - (x.string ? 1 : 0) || x.birth - y.birth);
  const shows = g.upcomingShows(60, { horizon: 60 });
  const plan = g.bulkPlan([...b.ids], [...b.keys], b.divs);
  const chk = (on, act, id, label, sub) => `<label class="check"><input type="checkbox" ${on ? 'checked' : ''} data-on="${act}" data-id="${esc(id)}"><div class="grow"><b>${label}</b>${sub ? `<div class="sub">${sub}</div>` : ''}</div></label>`;
  return `<div class="sheet-head"><h2>Bulk entries</h2><button class="x" data-act="close">×</button></div>
  <p class="sub">Pick animals once and enter them in several shows. Each animal goes into every division it qualifies for that you’ve ticked. Lambs projected outside a show’s weight limits are skipped.</p>
  <h3>1. Animals <button class="lnk" data-act="bulkall" data-v="string">Show string</button><button class="lnk" data-act="bulkall" data-v="all">All</button><button class="lnk" data-act="bulkall" data-v="none">None</button></h3>
  <div class="panel" style="padding:4px 12px">${mine.length ? mine.map(a => chk(b.ids.has(a.id), 'bulkid', a.id, `${esc(a.name)} <span class="sub">${esc(a.tag || '')}</span>`, `${esc(g.breedLabel(a))} · ${g.sexText(a)} · ${Math.round(a.wt)} lb${a.reg ? ' · Reg' : ''}`)).join('') : '<div class="sub">No animals young enough to show.</div>'}</div>
  <h3>2. Divisions</h3><div class="panel" style="padding:4px 12px">${chk(b.divs.market, 'bulkdiv', 'market', 'Market lambs')}${chk(b.divs.breeding, 'bulkdiv', 'breeding', 'Registered breeding')}${chk(b.divs.commercial, 'bulkdiv', 'commercial', 'Commercial ewes (jackpots)')}</div>
  <h3>3. Shows <button class="lnk" data-act="bulkshows" data-v="series">Series jackpots</button><button class="lnk" data-act="bulkshows" data-v="regional">Regional jackpots</button><button class="lnk" data-act="bulkshows" data-v="none">None</button></h3>
  <div class="panel" style="padding:4px 12px">${shows.map(sh => chk(b.keys.has(sh.key), 'bulkkey', sh.key, esc(sh.short), `${g.fmtShort(sh.day)} · ${sh.jackpot ? (sh.regional ? 'Regional jackpot' : 'Jackpot') : TIER[sh.tier].label}${sh.series ? ` · ${esc(sh.series)}` : ''} · ${money(sh.fee)}/head`)).join('')}</div>
  <div class="foot" style="position:sticky;bottom:-18px;margin:10px -14px -18px;border-radius:0"><div class="grow sub">${plan.head} entr${plan.head === 1 ? 'y' : 'ies'} in ${plan.plan.length} show${plan.plan.length === 1 ? '' : 's'} · ${money(plan.fee)}${plan.skipped ? ` · ${plan.skipped} skipped (weight)` : ''}</div><button class="btn" data-act="dobulk" ${plan.head ? '' : 'disabled'}>Enter all</button></div>`;
}
function sheetShow(key) {
  const s = S(); const sh = g.findShow(key);
  if (!sh || sh.day <= s.day) return `<div class="sheet-head"><h2>Show</h2><button class="x" data-act="close">×</button></div><p>This show has already happened — check Results.</p>`;
  const L = g.entryList(sh); const j = g.judgeFor(key);
  const grp = (title, list, keyFn) => {
    if (!list.length) return '';
    const by = {}; list.forEach(a => (by[keyFn(a)] ||= []).push(a));
    return `<h3>${title} <span class="sub">(${list.length} head)</span></h3>${Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([k, l]) => `<details><summary class="sumrow"><b>${esc(k)}</b><span>${l.length} head${l.some(a => a.owner === 'P') ? ' · incl. yours' : ''}</span></summary><div class="pen">${l.sort((a, b) => a.wt - b.wt).map(a => `<div class="arow" style="cursor:default"><div class="grow"><div class="nm">${esc(a.name)}</div><div class="ln">${esc(g.flockName(a.owner))} · ${esc(g.breedLabel(a))} · ${g.sexText(a)}</div></div><div class="wt">${Math.round(a.owner === 'P' ? g.projectedWeight(a, sh.day - s.day) : a.temp ? a.wt : g.projectedWeight(a, sh.day - s.day))} lb</div></div>`).join('')}</div></details>`).join('')}`;
  };
  const total = L.market.length + L.breeding.length + L.commercial.length;
  return `<div class="sheet-head"><h2>${esc(sh.short)}</h2><button class="x" data-act="close">×</button></div>
  <p class="sub">${esc(sh.name)}${sh.venue ? ` · ${esc(sh.venue)}` : ''} · ${g.fmtDate(sh.day)} (${daysTo(sh.day)}) · ${money(sh.fee)}/head · ${sh.minWt}–${sh.maxWt} lb</p>
  <p class="sub">Judge <b>${esc(j.name)}</b> — ${esc(['Power judge — muscle & dimension', 'Balance & eye appeal', 'Structure first', 'Complete package', 'Big-boned & stout'][j.style])}${sh.series ? ` · counts toward the <b>${esc(sh.series)}</b>` : ''}</p>
  <div class="note">${total} head entered so far. Weights shown are projected to show day.</div>
  ${grp('Market lambs', L.market, a => sh.tier === 'county' ? 'Market lambs' : g.marketClass(a))}
  ${grp('Registered breeding', L.breeding, a => a.breed)}
  ${grp('Commercial ewes', L.commercial, a => g.ageDays(a) + (sh.day - s.day) < 365 ? 'Commercial ewe lambs' : 'Commercial yearling ewes')}
  <div class="btns"><button class="btn" data-act="entersheet" data-key="${key}">Enter this show</button></div>`;
}
function viewMarket() {
  const s = S();
  const seg = `<div class="seg">${[['browse', 'For sale'], ['mine', 'My lots & bids']].map(([k, l]) => `<button class="${UI.mtab === k ? 'on' : ''}" data-act="mtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (UI.mtab === 'mine') {
    const lots = s.listings.filter(l => l.seller === 'P');
    const bids = s.listings.filter(l => l.playerMax && l.seller !== 'P');
    const minep = s.directory.filter(d => d.owner === 'P');
    const lotRow = L => { const cb = g.currentBid(L); const nm = L.kind === 'animal' ? s.animals[L.aid]?.name : `${L.emb.count} embryos (${L.emb.sire.name} × ${L.emb.dam.name})`; return `<div class="card"><div class="grow"><div class="nm">${esc(nm)}</div><div class="ln">${L.mode === 'auction' ? `Auction · ${cb.count} bidder${cb.count === 1 ? '' : 's'} · ${money(cb.price)}` : `Buy now ${money(L.price)}`} · ends ${g.fmtShort(L.end)}</div></div>${L.seller === 'P' ? `<button class="btn sm sec" data-act="cancellot" data-id="${L.id}">Pull</button>` : `<button class="btn sm" data-act="lot" data-id="${L.id}">View</button>`}</div>`; };
    return `<h2>Market</h2>${seg}<h3>Your consignments</h3>${lots.length ? lots.map(lotRow).join('') : '<div class="empty">Nothing listed. Sell from an animal’s card.</div>'}
    <h3>Your sires in the directory</h3>${minep.length ? minep.map(d => `<div class="card"><div class="pic">${sheep(d.snap, 54)}</div><div class="grow"><div class="nm">${esc(d.snap.name)}</div><div class="ln">${d.price ? `${money(d.price)}/straw · ${d.stock} left · ${d.sold} sold` : 'No straws listed'}${d.lease ? ` · lease ${money(d.lease)} (${d.leases || 0} leased)` : ''} · until ${g.fmtShort(d.until)}</div></div><button class="btn sm sec" data-act="unlist" data-id="${d.id}">Remove</button></div>`).join('') : `<div class="empty">List a ram from his animal card (${money(g.DIRECTORY_FEE)}/year).</div>`}
    <h3>Your bids</h3>${bids.length ? bids.map(L => { const cb = g.currentBid(L); return lotRow(L).replace('</div></div><button', `</div><div class="ln ${cb.leader === 'P' ? 'ok' : 'warn'}">${cb.leader === 'P' ? 'You’re high bidder' : 'You’ve been outbid'} (your max ${money(L.playerMax)})</div></div><button`); }).join('') : '<div class="empty">No open bids.</div>'}`;
  }
  const all = marketItems();
  const counts = {}; all.forEach(it => counts[it.cat] = (counts[it.cat] || 0) + 1);
  let items = UI.mfilter === 'all' ? all : all.filter(it => it.cat === UI.mfilter);
  const breeds = [...new Set(items.map(it => it.breed))].sort();
  if (UI.mbreed && !breeds.includes(UI.mbreed)) UI.mbreed = '';
  if (UI.mbreed) items = items.filter(it => it.breed === UI.mbreed);
  const sort = UI.msort || 'end';
  items.sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : sort === 'best' ? b.q - a.q : a.end - b.end);
  const chip = (k, l) => `<button class="chip ${UI.mfilter === k ? 'on' : ''}" data-act="mfilter" data-v="${k}">${l}${k === 'all' ? ` ${all.length}` : counts[k] ? ` ${counts[k]}` : ''}</button>`;
  const breedName = b => b === 'Crossbred' ? 'Crossbred (club)' : b;
  return `<h2>Market</h2>${seg}<div class="chips">${CATS.map(([k, l]) => chip(k, l)).join('')}</div>
  <div class="filters"><select data-on="mbreed"><option value="">All breeds</option>${breeds.map(b => `<option value="${esc(b)}" ${UI.mbreed === b ? 'selected' : ''}>${esc(breedName(b))}</option>`).join('')}</select>
  <select data-on="msort">${[['end', 'Ending soon'], ['low', 'Price: low → high'], ['high', 'Price: high → low'], ['best', 'Best quality']].map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <p class="sub" style="margin:0 2px 8px">${items.length} for sale · Bred ewes, semen and embryos sell year-round. Show prospects peak Feb–Jun and Aug–Oct; rams Jun–Sep.</p>
  ${items.length ? `<div class="cards">${items.slice(0, 120).map(it => it.cat === 'semen' ? semenCard(it.d) : lotCard(it)).join('')}</div>` : '<div class="empty">Nothing in this category right now — check back in a few days.</div>'}`;
}

function viewNews() {
  const s = S(); s.seenNews = s.day;
  const list = s.news.filter(n => UI.ntab === 'all' || n.mine);
  return `<h2>News</h2><div class="seg"><button class="${UI.ntab === 'mine' ? 'on' : ''}" data-act="ntab" data-v="mine">My flock</button><button class="${UI.ntab === 'all' ? 'on' : ''}" data-act="ntab" data-v="all">Around the industry</button></div>
  <div class="feed">${list.length ? list.slice(0, 150).map(n => `<div class="it ${n.mine ? 'mine' : ''}"><div class="d">${g.fmtShort(n.day)}</div><div class="t k-${n.kind}">${esc(n.text)}</div></div>`).join('') : '<div class="empty">No news yet.</div>'}</div>`;
}

function viewMore() {
  const s = S();
  const seg = `<div class="chips">${[['leaders', 'Leaders'], ['farms', 'Farms'], ['tank', 'Semen tank'], ['ach', 'Awards'], ['ledger', 'Ledger'], ['settings', 'Settings']].map(([k, l]) => `<button class="chip ${UI.more === k ? 'on' : ''}" data-act="more" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (UI.more === 'tank') {
    const straws = s.tank.reduce((t, x) => t + x.straws, 0), embs = s.embryos.reduce((t, x) => t + x.count, 0);
    return `<h2>Semen tank</h2>${seg}
    <div class="note">${straws} straw${straws === 1 ? '' : 's'} and ${embs} embr${embs === 1 ? 'yo' : 'yos'} in storage. Storage costs ${money(g.TANK_FEE)}/month while anything is in the tank.</div>
    <h3>Semen</h3><div class="pen">${s.tank.length ? s.tank.map(t => `<div class="arow" style="cursor:default"><div class="grow"><div class="nm">${esc(t.snap.name)}</div><div class="ln">${esc(g.breedLabel(t.snap))} · ${esc(t.snap.owner === 'P' ? s.flocks[0].name : t.snap.ownerName)}</div></div><div class="wt">${t.straws} straw${t.straws === 1 ? '' : 's'}</div></div>`).join('') : '<div class="sub" style="padding:10px 12px">No semen stored. Collect your own ram or buy straws in the Market.</div>'}</div>
    <h3>Embryos</h3><div class="pen">${s.embryos.length ? s.embryos.map(e => `<div class="arow" style="cursor:default"><div class="grow"><div class="nm">${esc(e.sire.name)} × ${esc(e.dam.name)}</div><div class="ln">${esc(g.breedLabel(e.dam))}</div></div><div class="wt">${e.count} embr${e.count === 1 ? 'yo' : 'yos'}</div></div>`).join('') : '<div class="sub" style="padding:10px 12px">No embryos stored. Flush a donor ewe or buy embryos in the Market.</div>'}</div>`;
  }
  if (UI.more === 'farms') {
    const counts = {}; s.flocks.forEach(f => { if (f.id !== 'P') counts[f.state] = (counts[f.state] || 0) + 1; });
    const st = UI.fstate || s.home;
    const heads = {}; for (const a of g.living()) heads[a.owner] = (heads[a.owner] || 0) + 1;
    const list = s.flocks.filter(f => f.id !== 'P' && f.state === st).sort((a, b) => (b.banners || 0) - (a.banners || 0) || a.name.localeCompare(b.name));
    return `<h2>Farms</h2>${seg}<label class="f" style="margin-top:0">State</label><select data-on="fstate">${Object.entries(STATES).sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => `<option value="${k}" ${st === k ? 'selected' : ''}>${v} (${counts[k] || 0})</option>`).join('')}</select>
    <p class="sub">${list.length} flock${list.length === 1 ? '' : 's'} in ${esc(STATES[st])}${st === s.home ? ' — your home state' : ''}.</p>
    ${list.length ? `<div class="cards">${list.map(f => `<button class="card" data-act="flock" data-id="${f.id}"><div class="grow"><div class="nm">${esc(f.name)}</div><div class="ln">${f.type === 'breed' ? `Registered ${esc(f.breed)}s` : f.wt ? `Club lambs · ${esc(f.wt)}` : 'Club lambs'} · ${heads[f.id] || 0} head</div><div class="ln">${stars(f.id)} · ${f.banners || 0} banners · since ${g.yearOf(f.founded) <= 2026 ? 'before 2026' : g.yearOf(f.founded)}</div></div></button>`).join('')}</div>` : '<div class="empty">No flocks here yet — new ones start up every month.</div>'}`;
  }
  if (UI.more === 'ach') {
    const got = ACHIEVEMENTS.filter(a => s.ach[a.id] != null).length;
    return `<h2>Achievements</h2>${seg}<p class="sub">${got} of ${ACHIEVEMENTS.length} earned</p>${ACHIEVEMENTS.map(a => `<div class="ach ${s.ach[a.id] == null ? 'locked' : ''}"><div class="ic">${s.ach[a.id] != null ? '✓' : '?'}</div><div class="grow"><div class="nm" style="font-weight:700">${esc(a.name)}</div><div class="sub">${esc(a.desc)}${s.ach[a.id] != null ? ` · earned ${g.fmtShort(s.ach[a.id])}` : ''}</div></div><div class="price">${money(a.cash)}</div></div>`).join('')}`;
  }
  if (UI.more === 'ledger') {
    return `<h2>Ledger</h2>${seg}<div class="feed">${s.ledger.length ? s.ledger.map(l => `<div class="it"><div class="d">${g.fmtShort(l.day)}</div><div class="t grow">${esc(l.why)}</div><div class="${l.n < 0 ? 'neg2' : 'pos'}" style="font-variant-numeric:tabular-nums">${l.n < 0 ? '-' : '+'}${money(Math.abs(l.n))}</div></div>`).join('') : '<div class="empty">No transactions yet.</div>'}</div>`;
  }
  if (UI.more === 'settings') {
    return `<h2>Settings</h2>${seg}
    <div class="panel"><label class="f" style="margin-top:0">Game speed</label>${SPEEDS.map(([v, l, d]) => `<label class="check"><input type="radio" name="spd" data-on="setspeed" value="${v}" ${s.settings.speed === v ? 'checked' : ''}><div><b>${l}</b><div class="sub">${d}</div></div></label>`).join('')}
    <p class="sub">The clock only runs while ShowLamb is open. Close it and your flock waits for you.</p></div>
    <div class="panel"><label class="f" style="margin-top:0">Auto-pause</label>
    <label class="check"><input type="checkbox" data-on="setting" data-k="pauseShows" ${s.settings.pauseShows ? 'checked' : ''}><div>Pause 3 days before a show when I have eligible animals not entered</div></label>
    <label class="check"><input type="checkbox" data-on="setting" data-k="pauseLambing" ${s.settings.pauseLambing ? 'checked' : ''}><div>Pause when one of my ewes lambs</div></label></div>
    <div class="panel"><label class="f" style="margin-top:0">Save file</label><p class="sub">Your game saves automatically on this device. Back it up to move it to another phone or keep a copy.</p>
    <div class="btns"><button class="btn" data-act="backup">Download backup</button><label class="btn sec" style="display:inline-block">Restore backup<input type="file" accept=".json,application/json" data-on="restore" hidden></label></div></div>
    <div class="panel"><label class="f" style="margin-top:0">Flock</label><div class="kv"><div><span>Name</span>${esc(s.flocks[0].name)}</div><div><span>Home state</span>${esc(STATES[s.home])}</div><div><span>Flocks in game</span>${s.flocks.length - 1}</div><div><span>Lambs born</span>${s.stats.born}</div></div>
    <div class="btns"><button class="btn red" data-act="newgame">Start a new game</button></div></div>`;
  }
  const flocks = [...s.flocks].sort((a, b) => (b.banners || 0) - (a.banners || 0));
  const myRank = flocks.findIndex(f => f.id === 'P') + 1;
  const sires = Object.values(s.sireStats).sort((a, b) => b.banners - a.banners).slice(0, 15);
  return `<h2>Leaderboards</h2>${seg}
  <h3>Most banners</h3><div class="panel">${flocks.slice(0, 15).map((f, i) => `<div class="lb" ${f.id === 'P' ? 'style="font-weight:700;color:var(--barn)"' : ''}><div class="r">${i + 1}</div><div class="grow">${esc(f.name)} <span class="sub">${f.state}</span></div><div>${f.banners || 0}</div></div>`).join('')}${myRank > 15 ? `<div class="lb" style="font-weight:700;color:var(--barn)"><div class="r">${myRank}</div><div class="grow">${esc(s.flocks[0].name)}</div><div>${s.flocks[0].banners || 0}</div></div>` : ''}</div>
  <h3>Top sires (banner-winning progeny)</h3><div class="panel">${sires.length ? sires.map((x, i) => `<div class="lb"><div class="r">${i + 1}</div><div class="grow">${esc(x.name)} <div class="sub">${esc(x.owner || '')}</div></div><div>${x.banners}</div></div>`).join('') : '<div class="sub">Sire standings fill in as the show season goes.</div>'}</div>
  <h3>Highest sales</h3><div class="panel">${s.topSales.length ? s.topSales.slice(0, 15).map((x, i) => `<div class="lb" ${x.mine ? 'style="font-weight:700;color:var(--barn)"' : ''}><div class="r">${i + 1}</div><div class="grow">${esc(x.name)} <div class="sub">${esc(x.type)} · ${esc(x.seller)} → ${esc(x.buyer)} · ${g.fmtShort(x.day)}</div></div><div class="price">${money(x.price)}</div></div>`).join('') : '<div class="sub">No sales yet.</div>'}</div>`;
}

// ---------- animal detail ----------
function pedigree(a) {
  const root = a.ped || { s: a.sireName && a.sireName !== 'Unrecorded' ? { n: a.sireName } : null, d: a.damName && a.damName !== 'Unrecorded' ? { n: a.damName } : null };
  const cell = (p, row, span, col, role) => `<div class="pc ${role}" style="grid-row:${row}/span ${span};grid-column:${col}"><span class="pr">${role === 's' ? 'Sire' : 'Dam'}</span><b>${p ? esc(p.n) : '—'}</b>${p?.b ? `<small>${esc(p.b)}</small>` : ''}</div>`;
  let h = '';
  const walk = (p, row, span, col, role) => {
    h += cell(p, row, span, col, role);
    if (col < 3) { walk(p?.s, row, span / 2, col + 1, 's'); walk(p?.d, row + span / 2, span / 2, col + 1, 'd'); }
  };
  walk(root.s, 1, 4, 1, 's'); walk(root.d, 5, 4, 1, 'd');
  return `<div class="ped"><div class="ph" style="grid-column:1">Parents</div><div class="ph" style="grid-column:2">Grandparents</div><div class="ph" style="grid-column:3">Great-grand</div><div class="pg">${h}</div></div>`;
}
function animalBody(a, { mine = false } = {}) {
  const s = S(); const age = g.ageDays(a);
  const ts = g.traitScores(a);
  const live = a.birth != null;
  const traitBars = TRAITS.map(t => `<div class="tbar"><span>${TRAIT_LABEL[t]}</span><div class="tr"><i class="${ts[t] >= 70 ? 'hi' : ''}" style="width:${ts[t]}%"></i></div><b class="right">${ts[t]}</b></div>`).join('');
  const epd = a.reg ? `<h3>EPDs</h3><table class="epd"><tr><th>Trait</th><th class="right">EPD</th><th class="right">Acc.</th></tr>${EPDS.map(e => { const v = g.epdShown(a, e.k); const good = e.k === 'BW' || e.k === 'FAT' ? v < 0 : v > 0; return `<tr><td>${e.label}</td><td class="n ${good ? 'pos' : 'neg2'}">${signed(v, e.dec)} ${e.unit}</td><td class="n">${Math.round(g.accuracy(a) * 100)}%</td></tr>`; }).join('')}</table><p class="sub">Accuracy climbs as ${a.sex === 'R' ? 'his' : 'her'} lambs are recorded (${a.prog || 0} so far).</p>` : '<p class="sub">Market and commercial animals are evaluated on trait scores only.</p>';
  const tested = a.tested || {};
  const sp = tested.spider ? ['Normal (NN)', 'Carrier (NS)', 'Affected (SS)'][a.spider] : 'Untested';
  const sc = tested.scrapie ? a.scr.replace('RQ', 'QR') : 'Untested';
  const dw = tested.dwarf ? g.DWARF_LABEL[a.dwarf || 0] : 'Untested';
  const tb = (k, l, c) => !tested[k] ? `<button class="btn sm sec" data-act="test" data-k="${k}" data-id="${a.id}">${l} $${c}</button>` : '';
  const tests = `<h3>DNA tests</h3><div class="kv"><div><span>Spider</span><b class="${tested.spider && a.spider ? 'neg2' : ''}">${sp}</b></div><div><span>Scrapie 171</span><b>${sc}</b></div><div><span>Dwarf</span><b class="${tested.dwarf && a.dwarf === 2 ? 'neg2' : ''}">${dw}</b></div></div>${mine && live ? `<div class="btns">${tb('spider', 'Spider', 35)}${tb('scrapie', 'Scrapie', 30)}${tb('dwarf', 'Dwarf', 35)}</div>` : ''}${a.breed === 'Southdown' || a.breed === 'Wether-Type Southdown' ? '<p class="sub">Southdowns are scrapie-resistant (RR) breed-wide.</p>' : ''}`;
  const info = live ? `<div class="kv"><div><span>Breed</span>${esc(g.breedLabel(a))}</div><div><span>Sex</span>${g.sexText(a)}</div><div><span>Age</span>${g.ageText(a)}</div><div><span>Born</span>${g.fmtDate(a.birth)}</div><div><span>Weight</span>${Math.round(a.wt)} lb</div>
    ${age < 450 ? `<div><span>Gain</span>${(a.lastAdg || 0).toFixed(2)} lb/day</div><div><span>Condition</span>${condLabel(a.cond)} (${a.cond.toFixed(1)})</div>` : ''}
    <div><span>Registered</span>${a.reg ? 'Yes' : a.regOk && a.sex !== 'W' ? (mine ? `<button class="btn sm gold" data-act="register" data-id="${a.id}">Register $${g.REG_FEE}</button>` : 'Eligible') : 'No'}</div><div><span>Inbreeding</span>${((a.F || 0) * 100).toFixed(1)}%</div>
    ${a.comp && a.breed === 'Crossbred' ? `<div style="grid-column:1/-1"><span>Cross</span>${esc(a.comp)}</div>` : ''}</div>` : `<div class="kv"><div><span>Breed</span>${esc(g.breedLabel(a))}</div><div><span>Owner</span>${esc(a.ownerName || '')}</div></div>`;
  const ped = `<h3>Pedigree</h3>${pedigree(a)}${a.et ? `<p class="sub">Embryo transfer — carried by ${esc(a.recipName || '')}</p>` : ''}`;
  const rec = (a.record || []).length ? `<details class="more"><summary class="sumrow"><b>Show results</b><span>${a.record.length} placing${a.record.length === 1 ? '' : 's'} · ${a.record.filter(r => r.banner).length} banner${a.record.filter(r => r.banner).length === 1 ? '' : 's'} ▸</span></summary>${[...a.record].reverse().map(r => `<div class="row" style="padding:4px 0;border-bottom:1px solid var(--line)">${r.banner ? '<span class="b ban">Banner</span>' : ''}<div class="grow" style="font-size:13.5px">${esc(r.text)}</div><span class="sub">${esc(r.show)} '${String(g.yearOf(r.day)).slice(2)}</span></div>`).join('')}</details>` : '';
  const kids = a.sex === 'E' && live ? g.living().filter(x => x.dam === a.id).sort((x, y) => y.birth - x.birth) : [];
  const off = a.sex === 'E' && live ? `<details class="more"><summary class="sumrow"><b>Offspring</b><span>${kids.length} living · ${a.prog || 0} recorded ▸</span></summary>${kids.length ? `<div class="pen">${kids.map(k => `<button class="arow" data-act="animal" data-id="${k.id}"><div class="grow"><div class="nm">${nameTag(k)}</div><div class="ln">${esc(g.breedLabel(k))} · ${g.sexText(k)} · ${g.ageText(k)} · by ${esc(k.sireName)}${k.owner !== 'P' ? ` · ${esc(g.flockName(k.owner))}` : ''}</div></div><div class="wt">${Math.round(k.wt)} lb</div></button>`).join('')}</div>` : '<p class="sub">No living offspring.</p>'}</details>` : '';
  return `<div class="hero">${sheep(a, 120)}<div class="tagline">${esc(a.tag || '')}</div><div class="badges" style="justify-content:center">${live ? badges(a) : ''}</div></div>
  ${info}${a.preg && (a.preg.ok || S().day < a.preg.check) ? `<div class="note">Bred ${esc(a.preg.method)} to <b>${esc(a.preg.sire.name)}</b> — <b>due ${g.fmtDate(a.preg.due)}</b>${S().day < a.preg.check ? ` (pregnancy check ${g.fmtShort(a.preg.check)})` : ' (confirmed)'}</div>` : ''}${a.synced && !a.preg ? '<div class="note">Synchronized — ready to breed (+25% conception, cycles out of season).</div>' : ''}${a.away && a.away > S().day ? `<div class="note">Away on lease until ${g.fmtDate(a.away)}.</div>` : ''}${ped}<h3>Trait scores</h3>${traitBars}<p class="sub">Market index ${g.marketIndex(a).toFixed(1)} · Breeding index ${g.breedingIndex(a).toFixed(1)}</p>${epd}${tests}${rec}${off}`;
}
function careBlock(a) {
  const age = g.ageDays(a);
  if (age >= 450 && !a.string) return '';
  const c = a.care || g.defaultCare();
  const bar = (l, v) => `<div class="tbar"><span>${l}</span><div class="tr"><i style="width:${Math.round(v)}%"></i></div><b class="right">${Math.round(v)}</b></div>`;
  return `<h3>Feeding & chores</h3><div class="panel">
  <label class="check" style="border:0;padding-top:0"><input type="checkbox" data-on="string" data-id="${a.id}" ${a.string ? 'checked' : ''}><div><b>In the show string</b><div class="sub">Show-string lambs get your feed and daily chores. Others run on pasture.</div></div></label>
  ${a.string ? `<label class="f">Feed</label><select data-on="care" data-k="feed" data-id="${a.id}">${FEEDS.map(f => `<option value="${f.id}" ${c.feed === f.id ? 'selected' : ''}>${f.name} (${money(f.cost * 100)}/cwt)</option>`).join('')}</select>
  <p class="sub" style="margin:4px 0 0">${esc(FEEDS.find(f => f.id === c.feed).note)}</p><label class="f">Amount: <b data-lbs="${a.id}">${c.lbs.toFixed(2)}</b> lb/day <span class="sub">(${(a.wt * 0.035).toFixed(1)} lb meets full appetite)</span></label><input type="range" min="0.5" max="6" step="0.25" value="${c.lbs}" data-on="care" data-k="lbs" data-id="${a.id}">
  <label class="f">Exercise</label><div class="seg" style="margin:0">${['None', 'Light', 'Hard'].map((l, i) => `<button class="${(c.ex || 0) === i ? 'on' : ''}" data-act="ex" data-v="${i}" data-id="${a.id}">${l}</button>`).join('')}</div>
  <label class="check"><input type="checkbox" data-on="care" data-k="rinse" data-id="${a.id}" ${c.rinse ? 'checked' : ''}><div>Rinsing, shearing & fitting <span class="sub">$0.25/day</span></div></label>
  <label class="check"><input type="checkbox" data-on="care" data-k="halter" data-id="${a.id}" ${c.halter ? 'checked' : ''}><div>Halter breaking & bracing</div></label>
  <div style="margin-top:8px">${bar('Fitting', a.fit)}${bar('Training', a.train)}${bar('Tone', (a.tone || 0) * 25)}</div>
  <p class="sub">Hard exercise firms muscle and burns cover but slows gain. More energy and more pounds push weight and condition — watch your show’s weight limits.</p>` : ''}</div>`;
}
function sheetAnimal(id) {
  const s = S(); const a = s.animals[id];
  if (!a) return `<div class="sheet-head"><h2>Gone</h2><button class="x" data-act="close">×</button></div><p>This animal is no longer here.</p>`;
  const mine = a.owner === 'P'; const age = g.ageDays(a);
  let actions = '';
  if (mine) {
    const b = [];
    if (g.canBreed(a)) b.push(`<button class="btn" data-act="breedsheet" data-id="${a.id}">Breed</button>`);
    if (g.canBreed(a) && age >= 330) b.push(`<button class="btn sec" data-act="flushsheet" data-id="${a.id}">Flush (ET donor)</button>`);
    if (a.sex === 'R' && age < 365) b.push(`<button class="btn sec" data-act="wether" data-id="${a.id}">Wether</button>`);
    if (a.sex === 'R' && age >= g.SEVEN_MO) b.push(`<button class="btn sec" data-act="collect" data-id="${a.id}">Collect semen ${money(g.COLLECT_FEE)}</button>`);
    if (a.sex === 'R' && age >= g.SEVEN_MO && !s.directory.some(d => d.ramId === a.id && d.owner === 'P')) b.push(`<button class="btn sec" data-act="siresheet" data-id="${a.id}">List in sire directory</button>`);
    if (!a.listing) b.push(`<button class="btn gold" data-act="sellsheet" data-id="${a.id}">Sell</button>`);
    else b.push(`<button class="btn sec" data-act="cancellot" data-id="${a.listing}">Pull from sale</button>`);
    b.push(`<button class="btn red" data-act="packer" data-id="${a.id}">Packer ${money(g.packerPrice(a))}</button>`);
    const penSel = `<label class="f">Pen</label><select data-on="pen" data-id="${a.id}">${g.pens().map(p => `<option value="${p.id}" ${g.penOf(a) === p.id ? 'selected' : ''} ${p.id !== g.penOf(a) && g.penRoom(p.id) <= 0 ? 'disabled' : ''}>${esc(p.name)} (${g.penCount(p.id)}${p.cap ? `/${p.cap}` : ''})</option>`).join('')}</select>`;
    const own = s.tank.find(t => t.snap.id === a.id);
    actions = `${a.sex === 'R' && own ? `<p class="sub">${own.straws} straws of ${esc(a.name)} in your tank.</p>` : ''}<div class="btns">${b.join('')}</div>${penSel}<div class="filters" style="margin-top:12px"><div><label class="f">Name</label><input type="text" id="rn" value="${esc(a.named === false ? '' : a.name)}" placeholder="Tag only" maxlength="30"></div><div><label class="f">Ear tag #</label><input type="text" id="tg" value="${esc(a.tag || '')}" maxlength="16"></div></div><div class="btns" style="margin-top:6px"><button class="btn sm sec" data-act="rename" data-id="${a.id}">Save name & tag</button></div>`;
  } else {
    const o = s.offers?.[a.id]; const live = o && o.until >= s.day;
    actions = `<p class="sub">Owned by ${esc(g.flockName(a.owner))} ${stars(a.owner)}</p>${a.owner !== 'LOCAL' && !a.listing ? `<div class="panel"><b>Private treaty offer</b><p class="sub" style="margin:4px 0">Make ${esc(g.flockName(a.owner))} an offer. They may accept, counter, or pass — they ask more for animals they’re keeping.</p>
      ${live && o.counter ? `<div class="note">They countered at <b>${money(o.counter)}</b> (good until ${g.fmtShort(o.until)}). <button class="btn sm gold" data-act="acceptcounter" data-id="${a.id}">Accept ${money(o.counter)}</button></div>` : live ? '<div class="note">They passed on your last offer. Try higher.</div>' : ''}
      <div class="row"><input type="number" id="offer" value="${Math.round(g.fairValue(a) * g.repMult(a.owner) / 25) * 25}"><button class="btn" data-act="makeoffer" data-id="${a.id}">Offer</button></div></div>` : a.listing ? '<p class="sub">This one is for sale on the market now.</p>' : ''}`;
  }
  return `<div class="sheet-head"><h2>${esc(a.name)}</h2><button class="x" data-act="close">×</button></div>
  ${animalBody(a, { mine })}${mine ? careBlock(a) : ''}<h3>${mine ? 'Actions' : 'Owner'}</h3>${actions}${mine ? `<p class="sub">Estimated market value about ${money(g.fairValue(a) * g.repMult('P'))}.</p>` : ''}`;
}

function sheetFlock(fid) {
  const s = S(); const f = g.flock(fid); if (!f) return '';
  const mine = g.living().filter(a => a.owner === fid);
  const grp = (t, list) => list.length ? `<h3>${t} (${list.length})</h3><div class="cards">${list.map(a => animalCard(a)).join('')}</div>` : '';
  const age = g.ageDays;
  return `<div class="sheet-head"><h2>${esc(f.name)}</h2><button class="x" data-act="close">×</button></div>
  <div class="kv"><div><span>State</span>${esc(STATES[f.state])}</div><div><span>Program</span>${f.type === 'breed' ? `${esc(f.breed)} breeder` : f.wt ? `Club · ${esc(f.wt)}` : 'Club lambs'}</div><div><span>Banners</span>${f.banners || 0}</div><div><span>Reputation</span>${stars(fid)}</div><div><span>Lambing</span>${{ early: 'Dec', winter: 'Jan–Feb', late: 'Mar', fall: 'Aug–Sep' }[f.season || (f.fall ? 'fall' : 'winter')]}</div><div><span>Head</span>${mine.length}</div></div>
  ${grp('Rams', mine.filter(a => a.sex === 'R' && age(a) >= 365))}${grp('Ewes', mine.filter(a => a.sex === 'E' && age(a) >= 365))}${grp('Lambs', mine.filter(a => age(a) < 365).sort((a, b) => a.birth - b.birth))}${grp('Wethers', mine.filter(a => a.sex === 'W' && age(a) >= 365))}`;
}
function sheetTags(ids, title) {
  const s = S(); const list = ids.map(id => s.animals[id]).filter(a => a && a.owner === 'P');
  if (!list.length) return `<div class="sheet-head"><h2>Ear tags</h2><button class="x" data-act="close">×</button></div><div class="empty">No lambs to tag.</div>`;
  const first = list[0].tag || '';
  const sug = (first.match(/^(.*?)(\d+)$/) ? first : `${s.flocks[0].prefix}-${String(g.yearOf(s.day)).slice(2)}001`);
  return `<div class="sheet-head"><h2>${esc(title || 'Ear tags')}</h2><button class="x" data-act="close">×</button></div>
  <div class="panel"><label class="f" style="margin-top:0">Auto-number from</label><div class="row"><input type="text" id="tagstart" value="${esc(sug)}" maxlength="16"><button class="btn sm" data-act="autotag" data-ids="${list.map(a => a.id).join(',')}">Number ${list.length}</button></div><p class="sub" style="margin:6px 0 0">Counts up in birth order — e.g. 27001, 27002, 27003… Any tag can still be edited below.</p></div>
  ${list.sort((a, b) => a.birth - b.birth || a.id.localeCompare(b.id)).map(a => `<div class="tagrow"><div class="pic">${sheep(a, 50)}</div><div class="grow"><b>${esc(a.name)}</b><div class="sub">${esc(g.breedLabel(a))} · ${g.sexText(a)} · ${g.ageText(a)} · out of ${esc(a.damName)}</div><select data-on="pen" data-id="${a.id}" style="margin-top:4px;padding:5px 8px">${g.pens().map(p => `<option value="${p.id}" ${g.penOf(a) === p.id ? 'selected' : ''} ${p.id !== g.penOf(a) && g.penRoom(p.id) <= 0 ? 'disabled' : ''}>${esc(p.name)} (${g.penCount(p.id)}${p.cap ? `/${p.cap}` : ''})</option>`).join('')}</select></div><input type="text" value="${esc(a.tag || '')}" data-on="savetag" data-id="${a.id}" maxlength="16"></div>`).join('')}
  <div class="btns"><button class="btn" data-act="close">Done</button></div>`;
}
function sheetGroupSale() {
  const s = S(); const gs = UI.gs;
  const pool = g.myAnimals().filter(a => !a.listing && g.entriesFor(a.id).length === 0 && (gs.all || g.ageDays(a) < 365)).sort((x, y) => x.birth - y.birth);
  const sel = pool.filter(a => gs.ids.has(a.id));
  const est = sel.length ? Math.round(sel.reduce((t, a) => t + g.fairValue(a) * g.repMult('P'), 0) / sel.length / 25) * 25 : 0;
  return `<div class="sheet-head"><h2>Group sale</h2><button class="x" data-act="close">×</button></div>
  <p class="sub">Pick the ones to sell and one opening bid per head. Each becomes its own timed auction and they all close together.</p>
  <h3>Lots <button class="lnk" data-act="gsall" data-v="all">All</button><button class="lnk" data-act="gsall" data-v="none">None</button><button class="lnk" data-act="gsall" data-v="toggle">${gs.all ? 'Lambs only' : 'Show adults too'}</button></h3>
  <div class="panel" style="padding:4px 12px">${pool.length ? pool.map(a => `<label class="check"><input type="checkbox" ${gs.ids.has(a.id) ? 'checked' : ''} data-on="gsid" data-id="${a.id}"><div class="grow"><b>${nameTag(a)}</b><div class="sub">${esc(g.breedLabel(a))} · ${g.sexText(a)} · ${g.ageText(a)} · ${Math.round(a.wt)} lb · worth ~${money(g.fairValue(a) * g.repMult('P'))}</div></div></label>`).join('') : '<div class="sub" style="padding:8px 0">Nothing available (animals entered in shows or already listed are left out).</div>'}</div>
  <div class="filters"><div><label class="f">Opening bid per head</label><input type="number" id="gsp" value="${gs.price || Math.max(100, Math.round(est * 0.5 / 25) * 25)}"></div><div><label class="f">Sale length (days)</label><input type="number" id="gsd" value="${gs.days || 7}" min="3" max="14"></div></div>
  ${sel.length ? `<p class="sub">Buyers value this group around ${money(est)} a head on average.</p>` : ''}
  <div class="foot" style="position:sticky;bottom:-18px;margin:10px -14px -18px;border-radius:0"><div class="grow sub">${sel.length} lot${sel.length === 1 ? '' : 's'}</div><button class="btn gold" data-act="dogsale" ${sel.length ? '' : 'disabled'}>Start the sale</button></div>`;
}
function sheetBulkBreed() {
  const s = S(); const b = UI.bb; const sync = b.mode === 'sync';
  const ewes = g.myAnimals().filter(a => g.canBreed(a)).sort((x, y) => x.birth - y.birth);
  const sel = ewes.filter(e => b.ids.has(e.id));
  const chk = (on, act, id, label, sub) => `<label class="check"><input type="checkbox" ${on ? 'checked' : ''} data-on="${act}" data-id="${esc(id)}"><div class="grow"><b>${label}</b>${sub ? `<div class="sub">${sub}</div>` : ''}</div></label>`;
  const eweList = `<h3>Ewes <button class="lnk" data-act="bball" data-v="all">All</button><button class="lnk" data-act="bball" data-v="none">None</button></h3>
  <div class="panel" style="padding:4px 12px">${ewes.length ? ewes.map(e => chk(b.ids.has(e.id), 'bbid', e.id, `${esc(e.name)} <span class="sub">${esc(e.tag || '')}</span>`, `${esc(g.breedLabel(e))} · ${g.ageText(e)}${e.synced ? ' · synced' : ''}`)).join('') : '<div class="sub" style="padding:8px 0">No open ewes 8+ months old.</div>'}</div>`;
  if (sync) {
    const n = sel.filter(e => !e.synced).length;
    return `<div class="sheet-head"><h2>Synchronize ewes</h2><button class="x" data-act="close">×</button></div>
    <p class="sub">CIDR + PG600 — ${money(g.SYNC_COST)} per ewe. Synced ewes cycle even out of season and settle 25% better with any method. The sync lasts until she’s bred.</p>${eweList}
    <div class="foot" style="position:sticky;bottom:-18px;margin:10px -14px -18px;border-radius:0"><div class="grow sub">${n} ewe${n === 1 ? '' : 's'} · ${money(n * g.SYNC_COST)}</div><button class="btn" data-act="dosync" ${n ? '' : 'disabled'}>Synchronize</button></div>`;
  }
  const m = b.method;
  const rams = g.usableRams(); const tanks = s.tank.map((t, i) => [t, i]).filter(([t]) => t.straws > 0);
  let srcList = '';
  if (m === 'Natural') srcList = rams.length ? rams.map(r => { const Fs = sel.map(e => g.inbreeding(g.snapshot(r), e)); const hi = Fs.filter(f => f >= 0.0625).length; return chk(b.src === r.id, 'bbsrc', r.id, esc(r.name), `${esc(g.breedLabel(r))} · BI ${g.breedingIndex(r).toFixed(1)}${r.leasedTo === 'P' ? ` · leased until ${g.fmtShort(r.leaseUntil)}` : ''}${hi ? ` · <span class="warn">${hi} ewe${hi > 1 ? 's' : ''} closely related</span>` : ''}`); }).join('') : '<div class="sub" style="padding:8px 0">No rams available.</div>';
  else if (m === 'AI') srcList = tanks.length ? tanks.map(([t, i]) => chk(b.src === String(i), 'bbsrc', String(i), esc(t.snap.name), `${esc(g.breedLabel(t.snap))} · ${t.straws} straws · $150 lap AI per ewe`)).join('') : '<div class="sub" style="padding:8px 0">No semen in the tank.</div>';
  else srcList = s.embryos.length ? s.embryos.map(e => chk(b.src === e.id, 'bbsrc', e.id, `${esc(e.sire.name)} × ${esc(e.dam.name)}`, `${esc(g.breedLabel(e.dam))} · ${e.count} embryos · $175 per transfer`)).join('') : '<div class="sub" style="padding:8px 0">No embryos stored.</div>';
  const avg = sel.length ? Math.round(sel.reduce((t, e) => t + g.conceptionRate(e, m), 0) / sel.length * 100) : 0;
  const per = m === 'ET' ? (b.n || 1) : 1;
  const cap = m === 'AI' ? (tanks.find(([, i]) => String(i) === b.src)?.[0].straws ?? 0) : m === 'ET' ? Math.floor((s.embryos.find(e => e.id === b.src)?.count ?? 0) / per) : Infinity;
  const cost = sel.length && b.src ? Math.min(sel.length, cap) * (m === 'AI' ? 150 : m === 'ET' ? 175 * per : 0) : 0;
  return `<div class="sheet-head"><h2>Bulk breed</h2><button class="x" data-act="close">×</button></div>
  <div class="seg">${[['Natural', 'Natural'], ['AI', 'AI'], ['ET', 'Embryo transfer']].map(([k, l]) => `<button class="${m === k ? 'on' : ''}" data-act="bbmethod" data-v="${k}">${l}</button>`).join('')}</div>
  ${eweList}<h3>${m === 'Natural' ? 'Buck' : m === 'AI' ? 'Semen' : 'Embryos'}</h3>${m === 'ET' ? `<div class="seg" style="margin:0 0 8px"><button class="${per === 1 ? 'on' : ''}" data-act="bbn" data-v="1">1 embryo per ewe</button><button class="${per === 2 ? 'on' : ''}" data-act="bbn" data-v="2">2 embryos per ewe</button></div>` : ''}<div class="panel" style="padding:4px 12px">${srcList}</div>
  ${sel.length && cap < sel.length ? `<div class="note">Only enough ${m === 'AI' ? 'straws' : 'embryos'} for ${cap} of ${sel.length} ewes — the rest will be left open.</div>` : ''}
  <div class="foot" style="position:sticky;bottom:-18px;margin:10px -14px -18px;border-radius:0"><div class="grow sub">${sel.length} ewe${sel.length === 1 ? '' : 's'} · ~${avg}% expected to settle${cost ? ` · ${money(cost)}` : ''}</div><button class="btn" data-act="dobb" ${sel.length && b.src ? '' : 'disabled'}>Breed</button></div>`;
}
function sheetBreed(id) {
  const s = S(); const e = s.animals[id];
  const mine = g.myAnimals();
  const rams = g.usableRams();
  const tab = UI.btab;
  const seg = `<div class="seg">${[['natural', 'Natural'], ['ai', 'AI'], ['et', 'Embryo']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="btab" data-v="${k}">${l}</button>`).join('')}</div>`;
  const Fwarn = F => F >= 0.0625 ? `<span class="warn">Inbreeding ${(F * 100).toFixed(1)}% — more stillborns, fewer standouts</span>` : F > 0 ? `<span class="sub">Inbreeding ${(F * 100).toFixed(1)}%</span>` : '<span class="ok">Unrelated</span>';
  let body = '';
  if (tab === 'natural') {
    const cr = Math.round(g.conceptionRate(e, 'Natural') * 100);
    body = `<p class="sub">Turn her in with one of your rams. Expected to settle about ${cr}% of the time this month. Free.</p>` + (rams.length ? rams.map(r => `<div class="card"><div class="pic">${sheep(r, 54)}</div><div class="grow"><div class="nm">${esc(r.name)}</div><div class="ln">${esc(g.breedLabel(r))} · BI ${g.breedingIndex(r).toFixed(1)}${r.leasedTo === 'P' ? ` · leased until ${g.fmtShort(r.leaseUntil)}` : ''}</div><div>${Fwarn(g.inbreeding(g.snapshot(r), e))}</div></div><button class="btn sm" data-act="donat" data-id="${id}" data-r="${r.id}">Use</button></div>`).join('') : '<div class="empty">You don’t own a ram old enough to breed.</div>');
  } else if (tab === 'ai') {
    const cr = Math.round(g.conceptionRate(e, 'AI') * 100);
    body = `<p class="sub">Laparoscopic AI costs $150 per ewe plus one straw. About ${cr}% settle this month.</p>` + (s.tank.length ? s.tank.map((t, i) => `<div class="card"><div class="pic">${sheep(t.snap, 54)}</div><div class="grow"><div class="nm">${esc(t.snap.name)}</div><div class="ln">${esc(g.breedLabel(t.snap))} · ${t.straws} straws</div><div>${Fwarn(g.inbreeding(t.snap, e))}</div></div><button class="btn sm" data-act="doai" data-id="${id}" data-i="${i}">Use</button></div>`).join('') : '<div class="empty">Your semen tank is empty. <a href="#" data-act="gosires">Shop the sire directory</a>.</div>');
  } else {
    body = `<p class="sub">Use her as a recipient for one of your embryos ($175 transfer, ~${Math.round(g.conceptionRate(e, 'ET') * 100)}% take this month). The lamb carries the donor’s genetics.</p>` + (s.embryos.length ? s.embryos.map(x => `<div class="card"><div class="grow"><div class="nm">${esc(x.sire.name)} × ${esc(x.dam.name)}</div><div class="ln">${esc(g.breedLabel(x.dam))} · ${x.count} left</div></div><button class="btn sm" data-act="doimplant" data-e="${x.id}" data-r="${id}" data-n="1">Put in 1</button>${x.count >= 2 ? `<button class="btn sm sec" data-act="doimplant" data-e="${x.id}" data-r="${id}" data-n="2">Put in 2</button>` : ''}</div>`).join('') : '<div class="empty">No embryos in storage.</div>');
  }
  return `<div class="sheet-head"><h2>Breed ${esc(e.name)}</h2><button class="x" data-act="back" data-id="${id}">×</button></div><div class="note">${seasonNote()}</div>${seg}${body}`;
}
function sheetFlush(id) {
  const s = S(); const e = s.animals[id];
  const rams = g.myAnimals().filter(a => a.sex === 'R' && g.ageDays(a) >= 200);
  const tanks = s.tank.map((t, i) => [t, i]).filter(([t]) => t.straws >= 2);
  return `<div class="sheet-head"><h2>Flush ${esc(e.name)}</h2><button class="x" data-act="back" data-id="${id}">×</button></div>
  <p class="sub">Superovulate her and collect embryos. $900 per flush; yields vary (0–12) and drop out of season. Embryos can go into your own recipient ewes or sell on the market.</p>
  <h3>Mate to</h3>${rams.map(r => `<div class="card"><div class="pic">${sheep(r, 50)}</div><div class="grow"><div class="nm">${esc(r.name)}</div><div class="ln">Your ram · ${esc(g.breedLabel(r))}</div></div><button class="btn sm" data-act="doflush" data-id="${id}" data-r="${r.id}">Flush</button></div>`).join('')}
  ${tanks.map(([t, i]) => `<div class="card"><div class="pic">${sheep(t.snap, 50)}</div><div class="grow"><div class="nm">${esc(t.snap.name)}</div><div class="ln">Semen · ${t.straws} straws (uses 2)</div></div><button class="btn sm" data-act="doflush" data-id="${id}" data-t="${i}">Flush</button></div>`).join('')}
  ${!rams.length && !tanks.length ? '<div class="empty">You need a ram or at least 2 straws of semen.</div>' : ''}`;
}
function sheetImplant(embId) {
  const s = S(); const e = s.embryos.find(x => x.id === embId);
  if (!e) return `<div class="sheet-head"><h2>Embryos</h2><button class="x" data-act="close">×</button></div><p>All transferred.</p>`;
  const recips = g.myAnimals().filter(a => g.canBreed(a));
  return `<div class="sheet-head"><h2>Transfer embryos</h2><button class="x" data-act="close">×</button></div><p><b>${esc(e.sire.name)} × ${esc(e.dam.name)}</b> — ${e.count} left. $175 per transfer.</p>
  ${recips.length ? recips.map(r => `<div class="card"><div class="pic">${sheep(r, 50)}</div><div class="grow"><div class="nm">${esc(r.name)}</div><div class="ln">${esc(g.breedLabel(r))} · ${g.ageText(r)} · ~${Math.round(g.conceptionRate(r, 'ET') * 100)}% take</div></div><button class="btn sm" data-act="doimplant" data-e="${e.id}" data-r="${r.id}" data-stay="1" data-n="1">Put in 1</button>${e.count >= 2 ? `<button class="btn sm sec" data-act="doimplant" data-e="${e.id}" data-r="${r.id}" data-stay="1" data-n="2">Put in 2</button>` : ''}</div>`).join('') : '<div class="empty">No open recipient ewes 8+ months old.</div>'}`;
}
function sheetSell(id) {
  const s = S(); const a = s.animals[id];
  const est = Math.round(g.fairValue(a) * g.repMult('P') / 25) * 25;
  const mode = UI.sellMode || 'auction';
  return `<div class="sheet-head"><h2>Sell ${esc(a.name)}</h2><button class="x" data-act="back" data-id="${id}">×</button></div>
  <div class="note">Buyers are valuing ${a.sex === 'R' ? 'him' : 'her'} around <b>${money(est)}</b> right now. Your flock’s show record raises what buyers will pay. Packer bid: ${money(g.packerPrice(a))}.</div>
  <div class="seg"><button class="${mode === 'auction' ? 'on' : ''}" data-act="sellmode" data-v="auction" data-id="${id}">Timed auction</button><button class="${mode === 'buy' ? 'on' : ''}" data-act="sellmode" data-v="buy" data-id="${id}">Buy now</button></div>
  ${mode === 'auction' ? `<label class="f">Opening bid (reserve)</label><input type="number" id="sp" value="${Math.max(50, Math.round(est * 0.45 / 25) * 25)}"><label class="f">Sale length (game days)</label><input type="number" id="sd" value="7" min="2" max="14"><p class="sub">Bidders show up over the sale. If nobody reaches your opening bid, ${a.sex === 'R' ? 'he' : 'she'} comes home.</p>`
      : `<label class="f">Price</label><input type="number" id="sp" value="${est}"><p class="sub">Stays up for 30 game days. Price it near value and a buyer usually comes along.</p>`}
  <div class="btns"><button class="btn gold" data-act="dosell" data-id="${id}">List for sale</button></div>`;
}
function sheetSellEmb(embId) {
  const s = S(); const e = s.embryos.find(x => x.id === embId); if (!e) return '<p>Gone.</p>';
  const per = Math.round(g.embryoValue(e) * g.repMult('P'));
  return `<div class="sheet-head"><h2>Sell embryos</h2><button class="x" data-act="close">×</button></div><p><b>${esc(e.sire.name)} × ${esc(e.dam.name)}</b> — ${e.count} in storage. Buyers value these around ${money(per)} each.</p>
  <label class="f">How many</label><input type="number" id="ec" value="${e.count}" min="1" max="${e.count}">
  <label class="f">Opening bid for the lot</label><input type="number" id="sp" value="${Math.round(per * e.count * 0.45 / 25) * 25}">
  <label class="f">Sale length (game days)</label><input type="number" id="sd" value="7">
  <div class="btns"><button class="btn gold" data-act="dosellemb" data-id="${e.id}">List lot</button></div>`;
}
function sheetSire(id) {
  const s = S(); const a = s.animals[id];
  const sug = Math.round(Math.min(500, Math.max(20, 20 + 8 * Math.exp((g.breedingIndex(a) - 65) / 5))) / 5) * 5;
  const t = s.tank.find(x => x.snap.id === id); const have = t?.straws || 0;
  return `<div class="sheet-head"><h2>Sire directory</h2><button class="x" data-act="back" data-id="${id}">×</button></div>
  <p>List <b>${esc(a.name)}</b> for ${money(g.DIRECTORY_FEE)}/year. Offer collected straws, a ${g.LEASE_DAYS}-day lease, or both. Flocks shop the directory at breeding time.</p>
  <div class="panel"><b>Semen</b><p class="sub" style="margin:4px 0">You have ${have} straws collected.${have ? '' : ' Collect him first (from his card) to sell straws.'}</p>
  <div class="filters"><div><label class="f">Straws to list</label><input type="number" id="ss" value="${Math.min(have, 10)}" min="0" max="${have}"></div><div><label class="f">Price per straw</label><input type="number" id="sp" value="${sug}"></div></div></div>
  <div class="panel"><b>Lease</b><p class="sub" style="margin:4px 0">He goes to the buyer for ${g.LEASE_DAYS} days. You can still AI with his collected semen while he’s gone. Leave at 0 to not lease.</p>
  <label class="f">Lease price</label><input type="number" id="sl" value="0"></div>
  <div class="btns"><button class="btn" data-act="dosire" data-id="${id}">Pay ${money(g.DIRECTORY_FEE)} & list</button></div>`;
}
function sheetLot(lid) {
  const s = S(); const L = s.listings.find(l => l.id === lid);
  if (!L) return `<div class="sheet-head"><h2>Sold</h2><button class="x" data-act="close">×</button></div><p>This lot is no longer available.</p>`;
  const cb = g.currentBid(L);
  const inc = cb.price > 2000 ? 100 : cb.price > 500 ? 25 : 10;
  const minNext = cb.count ? cb.price + inc : L.reserve;
  const f = g.flock(L.seller);
  let body;
  if (L.kind === 'embryo') {
    body = `<p>${L.emb.count} embryos. Lambs will carry these genetics:</p><h3>Sire — ${esc(L.emb.sire.name)}</h3>${animalBody(L.emb.sire)}<h3>Donor dam — ${esc(L.emb.dam.name)}</h3>${animalBody(L.emb.dam)}`;
  } else body = animalBody(s.animals[L.aid]);
  const ctrl = L.mode === 'auction'
    ? `<div class="panel"><div class="row"><div class="grow"><div class="sub">Current bid · ${cb.count} bidder${cb.count === 1 ? '' : 's'}</div><div class="price" style="font-size:24px">${money(cb.price)}</div><div class="sub">Closes ${g.fmtDate(L.end)} (${daysTo(L.end)})</div></div>${L.playerMax ? `<span class="b ${cb.leader === 'P' ? 'str' : 'bad'}">${cb.leader === 'P' ? 'You lead' : 'Outbid'}</span>` : ''}</div>
      <label class="f">Your max bid ${L.playerMax ? `(now ${money(L.playerMax)})` : ''}</label><div class="row"><input type="number" id="bid" value="${Math.max(minNext, L.playerMax || 0)}"><button class="btn gold" data-act="dobid" data-id="${L.id}">Bid</button></div>
      <p class="sub">We bid for you up to your max, one step at a time. Other bidders keep arriving until the sale closes.</p></div>`
    : `<div class="panel"><div class="sub">Buy now</div><div class="price" style="font-size:24px">${money(L.price)}</div><div class="btns"><button class="btn gold" data-act="dobuy" data-id="${L.id}">Buy now</button></div></div>`;
  return `<div class="sheet-head"><h2>${L.kind === 'embryo' ? 'Embryo lot' : esc(s.animals[L.aid].name)}</h2><button class="x" data-act="close">×</button></div>
  <p class="sub">Consigned by <b>${esc(f?.name)}</b> · ${esc(STATES[f?.state] || '')} ${stars(L.seller)} · ${f?.banners || 0} banners</p>${ctrl}${body}`;
}
function sheetSnap(dirId) {
  const d = S().directory.find(x => x.id === dirId); if (!d) return '<p>Gone.</p>';
  const live = S().animals[d.ramId];
  return `<div class="sheet-head"><h2>${esc(d.snap.name)}</h2><button class="x" data-act="close">×</button></div><p class="sub">${esc(d.snap.ownerName)} · ${money(d.price)}/straw</p>${animalBody(live || d.snap)}`;
}

function sheetEnter(key) {
  const s = S(); const sh = g.findShow(key);
  if (!sh || sh.day <= s.day) return `<div class="sheet-head"><h2>Closed</h2><button class="x" data-act="close">×</button></div><p>Entries for this show have closed.</p>`;
  const e = s.entries[key] || { market: [], breeding: [], commercial: [] }; e.commercial = e.commercial || [];
  const sel = UI.enter || (UI.enter = { key, market: new Set(), breeding: new Set(), commercial: new Set() });
  const days = sh.day - s.day;
  const mine = g.myAnimals();
  const row = (a, div) => {
    const entered = e[div].includes(a.id);
    const pw = g.projectedWeight(a, days);
    let wnote = '';
    if (div === 'market') wnote = pw < sh.minWt ? `<span class="warn">Projected ${Math.round(pw)} lb — light</span>` : pw > sh.maxWt ? `<span class="warn">Projected ${Math.round(pw)} lb — too heavy</span>` : `<span class="ok">Projected ${Math.round(pw)} lb</span>`;
    return `<div class="check"><input type="checkbox" ${entered ? 'checked disabled' : sel[div].has(a.id) ? 'checked' : ''} data-on="entsel" data-div="${div}" data-id="${a.id}"><div class="pic" style="width:50px">${sheep(a, 48)}</div><div class="grow"><b>${esc(a.name)}</b> <span class="sub">${esc(g.breedLabel(a))} · ${g.sexText(a)}</span><div>${Math.round(a.wt)} lb now · ${wnote}${a.string ? '' : ' <span class="warn">· not in show string</span>'}</div></div>${entered ? `<button class="btn sm sec" data-act="scratch" data-key="${key}" data-div="${div}" data-id="${a.id}">Scratch</button>` : ''}</div>`;
  };
  const mk = mine.filter(a => !g.marketEligible(a, sh) && !a.listing);
  const br = sh.breeding ? mine.filter(a => !g.breedingEligible(a, sh) && !a.listing) : [];
  const cm = sh.commercial ? mine.filter(a => !g.commercialEligible(a, sh) && !a.listing) : [];
  const n = sel.market.size + sel.breeding.size + sel.commercial.size;
  return `<div class="sheet-head"><h2>${esc(sh.short)} entries</h2><button class="x" data-act="close">×</button></div>
  <p class="sub">${esc(sh.name)} · ${g.fmtDate(sh.day)} (${daysTo(sh.day)}) · ${money(sh.fee)}/head · weigh-in limits ${sh.minWt}–${sh.maxWt} lb. Lambs outside the limits are sent home.</p>
  <h3>Market lambs ${mk.length ? `<button class="lnk" data-act="selall" data-div="market" data-key="${key}">Select all that make weight</button>` : ''}</h3>${mk.length ? mk.map(a => row(a, 'market')).join('') : '<div class="empty">No eligible market lambs (3–14 months old on show day, wethers or ewe lambs).</div>'}
  ${sh.breeding ? `<h3>Registered breeding sheep ${br.length ? `<button class="lnk" data-act="selall" data-div="breeding" data-key="${key}">Select all</button>` : ''}</h3>${br.length ? br.map(a => row(a, 'breeding')).join('') : '<div class="empty">No eligible registered lambs or yearlings.</div>'}` : ''}
  ${sh.commercial ? `<h3>Commercial ewes ${cm.length ? `<button class="lnk" data-act="selall" data-div="commercial" data-key="${key}">Select all</button>` : ''}</h3><p class="sub" style="margin:0 2px 6px">Any ewe lamb or yearling ewe, registered or not.</p>${cm.length ? cm.map(a => row(a, 'commercial')).join('') : '<div class="empty">No ewe lambs or yearling ewes.</div>'}` : ''}
  <div class="btns"><button class="btn" data-act="doenter" data-key="${key}" ${n ? '' : 'disabled'}>Enter ${n} · ${money(n * sh.fee)}</button></div>`;
}

function sheetResult(i) {
  const s = S(); const r = s.results[i]; if (!r) return '';
  const tab = UI.rtab;
  const li = p => `<li class="${p.owner === 'P' ? 'me' : ''}">${esc(p.name)} — ${esc(p.flock)} <span class="sub">${p.wt} lb${p.sire ? ` · by ${esc(p.sire)}` : ''}</span></li>`;
  const ch = (t, p, res) => p ? `<div class="champ ${res ? 'res' : ''}">${bannerSVG(res ? '#b9a8cc' : '#c99a2e')}<div><div class="t">${t}</div><b>${esc(p.name)}</b><div style="font-size:13px;opacity:.9">${esc(p.flock)} · ${esc(p.breed)} · ${p.wt} lb</div></div></div>` : '';
  let body = '';
  if (tab === 'mine') body = r.mine.length ? r.mine.map(m => `<div class="row" style="padding:7px 0;border-bottom:1px solid var(--line)"><b style="min-width:90px">${esc(m.name)}</b><div class="grow" style="font-size:14px">${esc(m.text)}</div></div>`).join('') + (s.banners.filter(b => b.day === r.day && b.show === r.name).map(b => `<div class="champ">${bannerSVG('#c99a2e')}<div><div class="t">Banner</div><b>${esc(b.title)}</b><div style="font-size:13px">${esc(b.animal)}</div></div></div>`).join('')) : '<div class="empty">You didn’t have anything in this show.</div>';
  else if (tab === 'market') body = r.market ? `${ch('Grand Champion Market Lamb', r.market.grand)}${ch('Reserve Grand Champion', r.market.resGrand, true)}
    ${r.market.divs.map(d => `<details ${r.market.divs.length === 1 ? 'open' : ''}><summary style="padding:8px 0;font-weight:700">${esc(d.name)} — Champion ${esc(d.champ.name)} (${esc(d.champ.flock)})</summary>${r.market.divs.length > 1 ? ch(`Champion ${d.name}`, d.champ) + ch(`Reserve ${d.name}`, d.resv, true) : ''}${d.classes.map(c => `<div class="cls"><h4>${esc(c.label)}</h4><ol>${c.placed.map(li).join('')}</ol></div>`).join('')}</details>`).join('')}` : '<div class="empty">No market show.</div>';
  else if (tab === 'commercial') body = r.commercial ? `${ch('Champion Commercial Ewe', r.commercial.champ)}${ch('Reserve Champion Commercial Ewe', r.commercial.resv, true)}${r.commercial.classes.map(c => `<div class="cls"><h4>${esc(c.label)}</h4><ol>${c.placed.map(li).join('')}</ol></div>`).join('')}` : '<div class="empty">No commercial ewe show.</div>';
  else body = r.breeding ? r.breeding.breeds.map(b => `<details><summary style="padding:8px 0;font-weight:700">${esc(b.breed)}</summary>${ch(`Champion ${b.breed} Ewe`, b.ce)}${ch(`Reserve ${b.breed} Ewe`, b.re, true)}${ch(`Champion ${b.breed} Ram`, b.cr)}${ch(`Reserve ${b.breed} Ram`, b.rr, true)}${b.classes.map(c => `<div class="cls"><h4>${esc(c.label)}</h4><ol>${c.placed.map(li).join('')}</ol></div>`).join('')}</details>`).join('') : '<div class="empty">No breeding show.</div>';
  return `<div class="sheet-head"><h2>${esc(r.name)}</h2><button class="x" data-act="close">×</button></div>
  <p class="sub">${g.fmtDate(r.day)} · Judge ${esc(r.judge.name)} — ${esc(r.judge.style)}</p>
  <div class="seg">${[['mine', 'Mine'], ['market', 'Market'], ['breeding', 'Breeding'], ...(r.commercial ? [['commercial', 'Commercial']] : [])].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="rtab" data-v="${k}" data-i="${i}">${l}</button>`).join('')}</div>${body}`;
}

// ---------- render ----------
const app = $('#app');
function render() {
  const s = S();
  if (!s || !s.started) { renderSetup(); return; }
  const views = { barn: viewBarn, breed: viewBreed, shows: viewShows, market: viewMarket, news: viewNews, more: viewMore };
  const y = window.scrollY;
  app.innerHTML = `<header class="top">${header()}</header><main>${views[UI.tab]()}</main><nav class="nav">${nav()}</nav>`;
  window.scrollTo(0, y);
}
function renderHeader() { const h = $('.top'); if (h && S()?.started) h.innerHTML = header(); }
function openSheet(fn) { UI.sheet = fn; renderSheet(); }
function renderSheet() {
  const el = $('#sheet');
  if (!UI.sheet) { el.classList.add('hidden'); el.innerHTML = ''; document.body.style.overflow = ''; return; }
  const inner = el.querySelector('.inner'); const st = inner ? inner.scrollTop : 0;
  el.innerHTML = `<div class="inner">${UI.sheet()}</div>`; el.classList.remove('hidden'); document.body.style.overflow = 'hidden';
  if (inner) el.querySelector('.inner').scrollTop = st;
}
function closeSheet() { UI.sheet = null; UI.enter = null; UI.sheetFlock = null; renderSheet(); }
function refreshAll() { render(); if (UI.sheet) renderSheet(); }

// ---------- setup wizard ----------
function renderSetup() {
  const st = UI.setup || (UI.setup = { step: 1, name: '', home: '', county: '', ewes: [], ram: null });
  let h = '';
  if (st.step === 1) {
    h = `<div class="setup"><div style="text-align:center">${sheep({ breed: 'Suffolk', sex: 'E' }, 150)}</div><h1>ShowLamb</h1><p class="sub">Breed them, feed them, show them, sell them. Start a flock and build it into a name people know.</p>
    <label class="f">Flock name</label><input type="text" id="fn" value="${esc(st.name)}" placeholder="e.g. Gehret Sheep Co." maxlength="32">
    <label class="f">Home state</label><select id="hs"><option value="">Choose your state…</option>${Object.entries(STATES).sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => `<option value="${k}" ${st.home === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label class="f">Home county (for your county fair — optional)</label><input type="text" id="cn" value="${esc(st.county)}" placeholder="e.g. Shelby" maxlength="24">
    <div class="note">Your home state sets your state fair, county fair and local jackpots. The national shows — Denver, Fort Worth, San Antonio, Houston, Keystone and NAILE — are open to everyone. 350 flocks across the country start alongside you, and more join every month.</div>
    <div class="foot"><div class="grow sub">Step 1 of 3</div><button class="btn" data-act="setup1">Next</button></div></div>`;
  } else if (st.step === 2) {
    st.list = st.list || []; st.form = st.form || { breed: 'Blackface cross', sex: 'E', age: 'y23', qty: 1 };
    const f = st.form; const cnt = sx => st.list.filter(a => a.sex === sx).length;
    const left = sx => g.STARTER_LIMITS[sx] - cnt(sx);
    const breeds = ['Blackface cross', 'Whiteface cross', 'Commercial', ...Object.keys(BREEDS).filter(b => b.startsWith('Wether-Type')), ...Object.keys(BREEDS).filter(b => BREEDS[b].reg !== false && !b.startsWith('Wether-Type'))];
    const ages = f.sex === 'W' ? g.STARTER_AGES.slice(0, 2) : g.STARTER_AGES;
    if (!ages.some(x => x[0] === f.age)) f.age = ages[ages.length - 1][0];
    const sexName = { E: 'Ewe', R: 'Ram', W: 'Wether' };
    h = `<div class="setup"><h1>Build your flock</h1><p class="sub">Up to ${g.STARTER_LIMITS.E} ewes, ${g.STARTER_LIMITS.R} rams and ${g.STARTER_LIMITS.W} wethers. Pick a breed, sex and age, choose how many, and add them. You’ll set custom genetics on the next screen. Starting cash: ${money(15000)}.</p>
    <div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><b>${cnt('E')}/${g.STARTER_LIMITS.E}</b><span>Ewes</span></div><div class="stat"><b>${cnt('R')}/${g.STARTER_LIMITS.R}</b><span>Rams</span></div><div class="stat"><b>${cnt('W')}/${g.STARTER_LIMITS.W}</b><span>Wethers</span></div></div>
    <div class="panel"><label class="f" style="margin-top:0">Breed</label><select data-on="sform" data-k="breed">${breeds.map(b => `<option ${f.breed === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>
    <div class="filters" style="margin:0"><div><label class="f">Sex</label><select data-on="sform" data-k="sex">${['E', 'R', 'W'].map(k => `<option value="${k}" ${f.sex === k ? 'selected' : ''} ${left(k) <= 0 ? 'disabled' : ''}>${sexName[k]}${left(k) <= 0 ? ' (full)' : ''}</option>`).join('')}</select></div>
    <div><label class="f">Age</label><select data-on="sform" data-k="age">${ages.map(([k, l]) => `<option value="${k}" ${f.age === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <label class="f">How many</label><div class="row"><input type="number" id="sqty" min="1" max="${Math.max(1, left(f.sex))}" value="${Math.min(f.qty, Math.max(1, left(f.sex)))}" style="width:90px"><button class="btn" data-act="sadd" ${left(f.sex) > 0 ? '' : 'disabled'}>Add ${sexName[f.sex].toLowerCase()}${'s'}</button><span class="sub">${left(f.sex)} more allowed</span></div></div>
    <h3>Your starters (${st.list.length})</h3>
    ${st.list.length ? `<div class="pen">${st.list.map(a => `<div class="arow"><div class="pic" style="width:46px;flex:none">${sheep(a, 44)}</div><div class="grow"><div class="nm">${esc(g.breedLabel(a))} <span class="tag">${g.sexText(a)}</span></div><div class="ln">${g.ageText(a)} · ${Math.round(a.wt)} lb${a.reg ? ' · Reg' : ''} · MUS ${g.traitScores(a).muscle} · STR ${g.traitScores(a).structure}</div></div><button class="x" style="width:32px;height:32px;font-size:16px" data-act="sdel" data-id="${a.id}">×</button></div>`).join('')}</div>` : '<div class="empty">Nothing added yet.</div>'}
    <div class="foot"><button class="btn sec" data-act="setupback">Back</button><div class="grow sub">Step 2 of 3</div><button class="btn" data-act="setup2" ${st.list.length ? '' : 'disabled'}>Next</button></div></div>`;
  } else {
    st.tier = st.tier || {}; st.vals = st.vals || {};
    const used = (sx, t) => st.list.filter(a => a.sex === sx && st.tier[a.id] === t).length;
    const cap = { E: { max: 1, real: 7 }, R: { max: 1, real: 2 } };
    const sliders = a => {
      const mode = st.tier[a.id]; if (!mode) return '';
      const v = st.vals[a.id] || (st.vals[a.id] = { t: g.traitScores(a), e: Object.fromEntries(EPDS.map(e => [e.k, a.bv[e.k]])) });
      const row = (key, label, val, unit, dec) => { const [mn, mx, step] = g.customRange(a, key, mode); const vv = Math.min(mx, Math.max(mn, val)); return `<div class="cs"><span>${label}</span><input type="range" min="${mn}" max="${mx}" step="${step}" value="${vv}" data-cv="${a.id}|${key}"><b data-cvl="${a.id}|${key}">${dec ? signed(vv, dec) : Math.round(vv)}${unit}</b></div>`; };
      return `<div class="custom"><div class="ct">${mode === 'max' ? 'Unlimited — up to 100% potential' : 'Breed max — up to the top of the breed'}</div>
        <label class="f" style="margin-top:4px">Trait scores</label>${TRAITS.map(t => row(t, TRAIT_LABEL[t], v.t[t], '', 0)).join('')}
        ${a.reg ? `<label class="f">EPDs</label>${EPDS.map(e => row(e.k, e.label, v.e[e.k], ' ' + e.unit, e.dec)).join('')}` : '<p class="sub" style="margin:6px 0 0">Not registered — trait scores only.</p>'}</div>`;
    };
    const tierBtns = a => {
      if (a.sex === 'W') return '';
      const c = cap[a.sex]; const t = st.tier[a.id] || '';
      const b = (k, l) => { const full = k && t !== k && used(a.sex, k) >= c[k]; return `<button class="${t === k ? 'on' : ''}" data-act="stier" data-id="${a.id}" data-v="${k}" ${full ? 'disabled' : ''}>${l}${k ? ` ${used(a.sex, k)}/${c[k]}` : ''}</button>`; };
      return `<div class="seg" style="margin:8px 0 0">${b('', 'Standard')}${b('real', 'Breed max')}${b('max', 'Unlimited')}</div>`;
    };
    h = `<div class="setup"><h1>Name & customize</h1><p class="sub">Every animal has an ear tag; add a name if you want one. Custom genetics: 1 ewe and 1 ram <b>Unlimited</b> (up to 100%), 7 ewes and 2 rams <b>Breed max</b> (up to the top of their breed). Sliders start at each animal’s real numbers.</p>
    <div class="panel"><label class="f" style="margin-top:0">Auto-number ear tags from</label><div class="row"><input type="text" id="tagstart" value="${esc(st.tagStart || `${(st.name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'ME')}-001`)}" maxlength="16"><button class="btn sm" data-act="stagall">Number all</button></div></div>
    <div class="stats"><div class="stat"><b>${used('E', 'max')}/1</b><span>Unlim. ewe</span></div><div class="stat"><b>${used('E', 'real')}/7</b><span>Max ewes</span></div><div class="stat"><b>${used('R', 'max')}/1</b><span>Unlim. ram</span></div><div class="stat"><b>${used('R', 'real')}/2</b><span>Max rams</span></div></div>
    ${st.list.map(a => `<div class="panel"><div class="row"><div class="pic" style="width:64px;flex:none">${sheep(a, 62)}</div><div class="grow"><b>${esc(g.breedLabel(a))} ${g.sexText(a).toLowerCase()}</b>${a.reg ? ' <span class="b reg">Reg</span>' : ''}<div class="sub">${g.ageText(a)} · ${Math.round(a.wt)} lb</div></div></div>
      <div class="filters" style="margin:8px 0 0"><div><label class="f">Name (optional)</label><input type="text" data-nm="${a.id}" value="${esc(st.names?.[a.id] ?? '')}" placeholder="Tag only" maxlength="30"></div><div><label class="f">Ear tag #</label><input type="text" data-tg="${a.id}" value="${esc(st.tags?.[a.id] ?? a.tag)}" maxlength="16"></div></div>
      ${tierBtns(a)}${sliders(a)}</div>`).join('')}
    <div class="foot"><button class="btn sec" data-act="setupback">Back</button><div class="grow sub">Step 3 of 3</div><button class="btn" data-act="setup4">Start my flock</button></div></div>`;
  }
  app.innerHTML = h;
}

function keepSetupInputs() {
  const st = UI.setup; st.names = st.names || {}; st.tags = st.tags || {};
  document.querySelectorAll('[data-nm]').forEach(i => st.names[i.dataset.nm] = i.value);
  document.querySelectorAll('[data-tg]').forEach(i => st.tags[i.dataset.tg] = i.value);
  const ts = document.getElementById('tagstart'); if (ts) st.tagStart = ts.value;
}
// ---------- actions ----------
const A = {
  tab: el => { UI.tab = el.dataset.tab; window.scrollTo(0, 0); render(); },
  filter: el => { UI.filter = el.dataset.v; render(); },
  mtab: el => { UI.mtab = el.dataset.v; render(); },
  mfilter: el => { UI.mfilter = el.dataset.v; UI.mbreed = ''; render(); },
  stab: el => { UI.stab = el.dataset.v; render(); },
  sfilter: el => { UI.sfilter = el.dataset.v; render(); },
  ntab: el => { UI.ntab = el.dataset.v; render(); },
  more: el => { UI.more = el.dataset.v; render(); },
  gosires: () => { closeSheet(); UI.tab = 'market'; UI.mtab = 'browse'; UI.mfilter = 'semen'; render(); },
  play: () => { const s = S(); s.paused = !s.paused; lastTick = performance.now(); save(); renderHeader(); },
  speed: () => { const s = S(); const i = SPEEDS.findIndex(x => x[0] === s.settings.speed); s.settings.speed = SPEEDS[(i + 1) % SPEEDS.length][0]; flash(SPEEDS[(i + 1) % SPEEDS.length][2]); save(); renderHeader(); },
  adv: el => { const n = el.dataset.n === 'month' ? g.daysToNextMonth() : +el.dataset.n; g.advance(n); drainToasts(); save(); refreshAll(); newLambPopup(); },
  animal: el => { const prev = UI.sheet && UI.sheetFlock; UI.backFlock = prev || null; openSheet(() => sheetAnimal(el.dataset.id)); },
  flock: el => { UI.sheetFlock = el.dataset.id; openSheet(() => sheetFlock(el.dataset.id)); },
  back: el => openSheet(() => sheetAnimal(el.dataset.id)),
  close: () => { if (UI.backFlock && UI.sheet) { const f = UI.backFlock; UI.backFlock = null; UI.sheetFlock = f; openSheet(() => sheetFlock(f)); return; } UI.sheetFlock = null; closeSheet(); render(); },
  breedsheet: el => { UI.btab = S().tank.length && !g.usableRams().length ? 'ai' : 'natural'; openSheet(() => sheetBreed(el.dataset.id)); },
  btab: el => { UI.btab = el.dataset.v; renderSheet(); },
  donat: el => { if (result(g.breedNatural(el.dataset.id, el.dataset.r), 'Turned in with the ram.')) closeSheet(); },
  doai: el => { if (result(g.breedAI(el.dataset.id, +el.dataset.i), 'Bred AI — check her in 30 days.')) closeSheet(); },
  flushsheet: el => openSheet(() => sheetFlush(el.dataset.id)),
  doflush: el => { const sire = el.dataset.r ? { ramId: el.dataset.r } : { tankIdx: +el.dataset.t }; if (result(g.flush(el.dataset.id, sire))) closeSheet(); },
  implantsheet: el => openSheet(() => sheetImplant(el.dataset.id)),
  doimplant: el => { const n = +(el.dataset.n || 1); const ok = result(g.implant(el.dataset.e, el.dataset.r, n), n > 1 ? '2 embryos transferred.' : 'Embryo transferred.'); if (ok && !el.dataset.stay) closeSheet(); },
  sellembsheet: el => openSheet(() => sheetSellEmb(el.dataset.id)),
  dosellemb: el => { if (result(g.listEmbryos(el.dataset.id, +$('#ec').value, 'auction', +$('#sp').value, +$('#sd').value), 'Embryo lot listed.')) closeSheet(); },
  wether: el => { g.wether(el.dataset.id); result(null, 'Wethered.'); },
  test: el => result(g.testAnimal(el.dataset.id, el.dataset.k), 'Test results are in.'),
  register: el => result(g.register(el.dataset.id), 'Registered!'),
  siresheet: el => openSheet(() => sheetSire(el.dataset.id)),
  dosire: el => { if (result(g.listSire(el.dataset.id, { straws: +$('#ss').value, price: +$('#sp').value, lease: +$('#sl').value }), 'Listed in the sire directory.')) openSheet(() => sheetAnimal(el.dataset.id)); },
  collect: el => result(g.collectSemen(el.dataset.id), 'Collected — straws are in your tank.'),
  lease: el => result(g.leaseRam(el.dataset.id), 'Ram leased — he’s on your farm for 60 days.'),
  unlist: el => { g.unlistSire(el.dataset.id); result(null, 'Removed from the directory.'); },
  sellsheet: el => { UI.sellMode = 'auction'; openSheet(() => sheetSell(el.dataset.id)); },
  sellmode: el => { UI.sellMode = el.dataset.v; renderSheet(); },
  dosell: el => { const id = el.dataset.id; const d = $('#sd'); if (result(g.listAnimal(id, UI.sellMode || 'auction', +$('#sp').value, d ? +d.value : 30), 'Consigned to the market.')) openSheet(() => sheetAnimal(id)); },
  cancellot: el => { g.cancelListing(el.dataset.id); result(null, 'Pulled from the sale.'); },
  packer: el => { const a = S().animals[el.dataset.id]; if (!confirm(`Send ${a.name} to the packer for ${money(g.packerPrice(a))}? This can’t be undone.`)) return; const p = g.sellPacker(a.id); closeSheet(); result(null, `Sold to the packer for ${money(p)}.`); },
  rename: el => { g.rename(el.dataset.id, $('#rn').value); g.setTag(el.dataset.id, $('#tg').value); result(null, 'Saved.'); },
  makeoffer: el => {
    const r = g.privateOffer(el.dataset.id, +$('#offer').value);
    if (r.err) flash(r.err, 'bad'); else if (r.result === 'accepted') { flash(`Deal! Bought for ${money(r.price)}.`, 'show'); save(); closeSheet(); render(); return; }
    else if (r.result === 'counter') flash(`They countered at ${money(r.price)}.`, 'show'); else flash('They passed on that offer.', 'bad');
    save(); renderSheet();
  },
  acceptcounter: el => { if (result(g.acceptCounter(el.dataset.id), 'Deal! They’re in your Main pen.')) closeSheet(); },
  pentoggle: el => { UI.openPens = UI.openPens || new Set(); const id = el.dataset.id; UI.openPens.has(id) ? UI.openPens.delete(id) : UI.openPens.add(id); render(); },
  buildpen: () => { const n = prompt(`Name the new pen (${money(g.PEN_COST)}, holds ${g.PEN_CAP} head):`, `Pen ${g.pens().length + 1}`); if (n === null) return; result(g.buildPen(n), 'Pen built.'); },
  penrename: el => { const p = g.pens().find(x => x.id === el.dataset.id); const n = prompt('Rename pen:', p.name); if (n) { g.renamePen(p.id, n); save(); render(); } },
  tagsheet: () => { const ids = g.myAnimals().filter(a => g.ageDays(a) < 365).map(a => a.id); openSheet(() => sheetTags(ids, 'Tag this year’s lambs')); },
  autotag: el => {
    const start = $('#tagstart').value.trim(); const m = start.match(/^(.*?)(\d+)$/);
    const ids = el.dataset.ids.split(','); const list = ids.map(id => S().animals[id]).filter(Boolean).sort((a, b) => a.birth - b.birth || a.id.localeCompare(b.id));
    list.forEach((a, i) => { g.setTag(a.id, m ? m[1] + String(+m[2] + i).padStart(m[2].length, '0') : `${start}${i + 1}`); });
    save(); renderSheet(); flash(`Tagged ${list.length} lambs.`, 'show');
  },
  ex: el => { g.setCare(el.dataset.id, { ex: +el.dataset.v }); save(); renderSheet(); },
  lot: el => openSheet(() => sheetLot(el.dataset.id)),
  snap: el => openSheet(() => sheetSnap(el.dataset.id)),
  dobid: el => result(g.placeBid(el.dataset.id, +$('#bid').value), 'Bid placed.'),
  dobuy: el => { if (result(g.buyNow(el.dataset.id), 'Bought! Find them in your flock.')) closeSheet(); },
  buysemen: el => { const q = +(document.querySelector(`select[data-id="${el.dataset.id}"]`)?.value || 1); result(g.buySemen(el.dataset.id, q), `${q} straw${q > 1 ? 's' : ''} in your tank.`); },
  showsheet: el => openSheet(() => sheetShow(el.dataset.key)),
  bbsheet: el => { UI.bb = { mode: el.dataset.v, ids: new Set(), method: 'Natural', src: null }; openSheet(sheetBulkBreed); },
  bball: el => { UI.bb.ids = new Set(el.dataset.v === 'all' ? g.myAnimals().filter(a => g.canBreed(a)).map(a => a.id) : []); renderSheet(); },
  gsalesheet: () => { UI.gs = { ids: new Set(), all: false }; openSheet(sheetGroupSale); },
  gsall: el => { const gs = UI.gs; gs.price = +$('#gsp').value; gs.days = +$('#gsd').value; if (el.dataset.v === 'toggle') gs.all = !gs.all; else gs.ids = new Set(el.dataset.v === 'all' ? g.myAnimals().filter(a => !a.listing && !g.entriesFor(a.id).length && (gs.all || g.ageDays(a) < 365)).map(a => a.id) : []); renderSheet(); },
  dogsale: () => {
    const gs = UI.gs; const days = Math.max(3, Math.min(14, +$('#gsd').value || 7)); const r = g.listGroup([...gs.ids], +$('#gsp').value, days);
    save(); closeSheet(); refreshAll(); flash(`${r.n} lots in your sale — closes in ${days} days.${r.errs.length ? ` ${r.errs.length} couldn’t be listed.` : ''}`, 'show');
  },
  bbn: el => { UI.bb.n = +el.dataset.v; renderSheet(); },
  bbmethod: el => { UI.bb.method = el.dataset.v; UI.bb.src = null; renderSheet(); },
  dosync: () => { if (result(g.syncEwes([...UI.bb.ids]), 'Ewes synchronized — breed them anytime.')) { UI.bb.ids = new Set(); renderSheet(); } },
  dobb: () => {
    const b = UI.bb; const src = b.method === 'Natural' ? { ramId: b.src } : b.method === 'AI' ? { tankIdx: +b.src } : { embId: b.src, n: b.n || 1 };
    const r = g.bulkBreed([...b.ids], b.method, src);
    save(); closeSheet(); refreshAll();
    flash(`Bred ${r.done.length} ewe${r.done.length === 1 ? '' : 's'}${r.left.length ? ` · not bred: ${r.left.map(x => x.name).join(', ')}` : ''}.`, r.left.length ? 'bad' : 'show');
  },
  bulksheet: () => { UI.bulk = { ids: new Set(g.myAnimals().filter(a => a.string).map(a => a.id)), keys: new Set(), divs: { market: true, breeding: true, commercial: true } }; openSheet(sheetBulk); },
  bulkall: el => { const b = UI.bulk; const mine = g.myAnimals().filter(a => g.ageDays(a) < 760 && !a.listing); b.ids = new Set(el.dataset.v === 'all' ? mine.map(a => a.id) : el.dataset.v === 'string' ? mine.filter(a => a.string).map(a => a.id) : []); renderSheet(); },
  bulkshows: el => { const b = UI.bulk; const sh = g.upcomingShows(60, { horizon: 60 }); b.keys = new Set(el.dataset.v === 'none' ? [] : sh.filter(x => el.dataset.v === 'series' ? x.series : x.jackpot && x.regional).map(x => x.key)); renderSheet(); },
  dobulk: () => { const b = UI.bulk; const plan = g.bulkPlan([...b.ids], [...b.keys], b.divs); if (result(g.bulkEnter([...b.ids], [...b.keys], b.divs), `Entered ${plan.head} in ${plan.plan.length} shows.`)) closeSheet(); },
  selall: el => {
    const s = S(); const sh = g.findShow(el.dataset.key); const div = el.dataset.div; const set = UI.enter[div]; const e = s.entries[sh.key] || {};
    g.myAnimals().filter(a => !a.listing && !(e[div] || []).includes(a.id)).forEach(a => {
      if (div === 'market') { if (g.marketEligible(a, sh)) return; const w = g.projectedWeight(a, sh.day - s.day); if (w < sh.minWt || w > sh.maxWt) return; }
      if (div === 'breeding' && g.breedingEligible(a, sh)) return;
      if (div === 'commercial' && g.commercialEligible(a, sh)) return;
      set.add(a.id);
    });
    renderSheet();
  },
  entersheet: el => { UI.enter = null; openSheet(() => sheetEnter(el.dataset.key)); },
  doenter: el => {
    const key = el.dataset.key; const sh = g.findShow(key); const sel = UI.enter;
    let err = null;
    if (sel.market.size) err = g.enterShow(sh, [...sel.market], 'market');
    if (!err && sel.breeding.size) err = g.enterShow(sh, [...sel.breeding], 'breeding');
    if (!err && sel.commercial.size) err = g.enterShow(sh, [...sel.commercial], 'commercial');
    UI.enter = null; result(err, 'Entered! Good luck.');
  },
  scratch: el => { g.scratch(el.dataset.key, el.dataset.id, el.dataset.div); result(null, 'Scratched (entry fees are non-refundable).'); },
  result: el => { UI.rtab = S().results[+el.dataset.i].mine.length ? 'mine' : 'market'; openSheet(() => sheetResult(+el.dataset.i)); },
  rtab: el => { UI.rtab = el.dataset.v; renderSheet(); },
  backup: () => {
    const s = S(); const blob = new Blob([JSON.stringify({ ...s, toasts: [] })], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `showlamb-${s.flocks[0].name.replace(/\W+/g, '-').toLowerCase()}-${g.fmtShort(s.day).replace(' ', '')}-${g.yearOf(s.day)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
  newgame: () => {
    if (!confirm('Start over? Your current flock will be erased (download a backup first if you want to keep it).')) return;
    g.G.s = null; UI.setup = null; UI.tab = 'barn'; dbPut('game', null).then(render);
  },
  // setup
  setup1: () => {
    const st = UI.setup; st.name = $('#fn').value.trim(); st.home = $('#hs').value; st.county = $('#cn').value.trim();
    if (!st.name) return alert('Give your flock a name.');
    if (!st.home) return alert('Choose your home state.');
    g.createWorld({ flockName: st.name, home: st.home, county: st.county });
    st.list = []; st.tier = {}; st.vals = {}; st.names = {}; st.tags = {}; st.step = 2; window.scrollTo(0, 0); renderSetup();
  },
  setupback: () => { if (UI.setup.step === 3) keepSetupInputs(); UI.setup.step--; renderSetup(); },
  sadd: () => {
    const st = UI.setup; const f = st.form; const left = g.STARTER_LIMITS[f.sex] - st.list.filter(a => a.sex === f.sex).length;
    const n = Math.max(1, Math.min(left, Math.round(+$('#sqty').value || 1))); f.qty = n;
    for (let i = 0; i < n; i++) st.list.push(g.makeStarter(f.breed, f.sex, f.age));
    const y = window.scrollY; renderSetup(); window.scrollTo(0, y); flash(`Added ${n}.`, 'show');
  },
  sdel: el => { const st = UI.setup; st.list = st.list.filter(a => a.id !== el.dataset.id); delete st.tier[el.dataset.id]; const y = window.scrollY; renderSetup(); window.scrollTo(0, y); },
  stier: el => { keepSetupInputs(); const st = UI.setup; if (el.dataset.v) st.tier[el.dataset.id] = el.dataset.v; else delete st.tier[el.dataset.id]; const y = window.scrollY; renderSetup(); window.scrollTo(0, y); },
  stagall: () => {
    keepSetupInputs(); const st = UI.setup; const start = $('#tagstart').value.trim(); const m = start.match(/^(.*?)(\d+)$/);
    st.list.forEach((a, i) => st.tags[a.id] = m ? m[1] + String(+m[2] + i).padStart(m[2].length, '0') : `${start}${i + 1}`);
    const y = window.scrollY; renderSetup(); window.scrollTo(0, y);
  },
  pickw: el => {
    const st = UI.setup; const id = el.dataset.id;
    if (st.weth.includes(id)) st.weth = st.weth.filter(x => x !== id); else if (st.weth.length < 4) st.weth.push(id); else flash('Up to 4 wethers.');
    const y = window.scrollY; renderSetup(); window.scrollTo(0, y);
  },
  pick: el => {
    const st = UI.setup; const id = el.dataset.id;
    if (st.step === 2) { if (st.ewes.includes(id)) st.ewes = st.ewes.filter(x => x !== id); else if (st.ewes.length < 4) st.ewes.push(id); else flash('You can pick 4 ewes — tap one to swap it out.'); }
    else st.ram = id;
    const y = window.scrollY; renderSetup(); window.scrollTo(0, y);
  },
  setup2: () => { UI.setup.step = 3; window.scrollTo(0, 0); renderSetup(); },
  setup3: () => { UI.setup.step = 4; window.scrollTo(0, 0); renderSetup(); },
  setup4: () => {
    const st = UI.setup; keepSetupInputs();
    const all = st.list;
    all.forEach(a => { const nm = st.names[a.id]; const tg = st.tags[a.id]; if (tg && tg.trim()) a.tag = tg.trim().slice(0, 16); if (nm && nm.trim()) { a.name = nm.trim().slice(0, 30); a.named = true; } else { a.name = a.tag; a.named = false; } });
    for (const a of all) {
      const mode = st.tier[a.id]; const v = st.vals[a.id]; if (!mode || !v) continue;
      const cl = (k, x) => { const [mn, mx] = g.customRange(a, k, mode); return Math.min(mx, Math.max(mn, +x)); };
      if (a.reg) EPDS.forEach(e => g.setCustomEPD(a, e.k, cl(e.k, v.e[e.k])));
      TRAITS.forEach(t => g.setCustomTrait(a, t, cl(t, v.t[t])));
      a.custom = mode;
    }
    app.innerHTML = '<div class="setup"><h1>Building the country…</h1><p class="sub">Stocking 350 flocks across the U.S.</p></div>';
    setTimeout(() => {
      g.finishSetup(all); UI.setup = null; S().paused = true;
      save(true); render(); flash('Welcome! Tap ▶ to start the clock, or +1d / +1w / +1mo to step ahead.', 'show');
    }, 30);
  },
};
document.addEventListener('click', e => {
  if (e.target.id === 'sheet') { closeSheet(); render(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.tagName === 'A') e.preventDefault();
  const f = A[el.dataset.act]; if (f) f(el);
});
const ON = {
  string: el => { g.toggleString(el.dataset.id); save(); renderSheet(); render(); },
  care: el => {
    const k = el.dataset.k; let v = el.type === 'checkbox' ? el.checked : el.value; if (k === 'lbs') v = +v;
    g.setCare(el.dataset.id, { [k]: v }); save();
    if (k === 'lbs') { const b = document.querySelector(`[data-lbs="${el.dataset.id}"]`); if (b) b.textContent = (+v).toFixed(2); }
  },
  entsel: el => { const set = UI.enter[el.dataset.div]; el.checked ? set.add(el.dataset.id) : set.delete(el.dataset.id); renderSheet(); },
  setspeed: el => { S().settings.speed = +el.value; save(); renderHeader(); },
  setting: el => { S().settings[el.dataset.k] = el.checked; save(); },
  restore: el => {
    const f = el.files[0]; if (!f) return;
    f.text().then(t => { const s = JSON.parse(t); if (!s.flocks || !s.animals) throw new Error('bad file'); s.toasts = []; s.paused = true; g.G.s = s; save(true); UI.tab = 'barn'; render(); flash('Backup restored.', 'show'); }).catch(() => alert('That file isn’t a ShowLamb backup.'));
  },
  qty: () => { },
  sform: el => { const st = UI.setup; st.form[el.dataset.k] = el.value; if (el.dataset.k === 'sex') { const left = g.STARTER_LIMITS[el.value] - st.list.filter(a => a.sex === el.value).length; st.form.qty = Math.max(1, Math.min(st.form.qty, left)); } renderSetup(); },
  custpick: el => { keepSetupInputs(); const st = UI.setup; st.cust[el.dataset.k] = el.value; const y = window.scrollY; renderSetup(); window.scrollTo(0, y); },
  savetag: el => { g.setTag(el.dataset.id, el.value); save(); },
  pen: el => { const err = g.movePen(el.dataset.id, el.value); if (err) { flash(err, 'bad'); renderSheet(); return; } save(); render(); renderSheet(); },
  mbreed: el => { UI.mbreed = el.value; render(); },
  fstate: el => { UI.fstate = el.value; render(); },
  gsid: el => { const gs = UI.gs; gs.price = +$('#gsp').value; gs.days = +$('#gsd').value; el.checked ? gs.ids.add(el.dataset.id) : gs.ids.delete(el.dataset.id); renderSheet(); },
  bbid: el => { el.checked ? UI.bb.ids.add(el.dataset.id) : UI.bb.ids.delete(el.dataset.id); renderSheet(); },
  bbsrc: el => { UI.bb.src = el.checked ? el.dataset.id : null; renderSheet(); },
  bulkid: el => { el.checked ? UI.bulk.ids.add(el.dataset.id) : UI.bulk.ids.delete(el.dataset.id); renderSheet(); },
  bulkkey: el => { el.checked ? UI.bulk.keys.add(el.dataset.id) : UI.bulk.keys.delete(el.dataset.id); renderSheet(); },
  bulkdiv: el => { UI.bulk.divs[el.dataset.id] = el.checked; renderSheet(); },
  syear: el => { UI.syear = +el.value; UI.sname = null; render(); },
  sname: el => { UI.sname = el.value; render(); },
  msort: el => { UI.msort = el.value; render(); },
};
document.addEventListener('input', e => {
  const cv = e.target.closest('[data-cv]');
  if (cv) {
    const [id, key] = cv.dataset.cv.split('|'); const v = UI.setup.vals[id]; const ep = EPDS.find(x => x.k === key);
    if (ep) v.e[key] = +cv.value; else v.t[key] = +cv.value;
    const lab = document.querySelector(`[data-cvl="${cv.dataset.cv}"]`); if (lab) lab.textContent = ep ? `${signed(+cv.value, ep.dec)} ${ep.unit}` : Math.round(+cv.value);
    return;
  }
  const el = e.target.closest('[data-on]'); if (el && el.dataset.on === 'care' && el.dataset.k === 'lbs') ON.care(el);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-on]'); if (!el) return; if (el.dataset.on === 'care' && el.dataset.k === 'lbs') return; const f = ON[el.dataset.on]; if (f) f(el); });

function newLambPopup() {
  const s = S(); if (!s?.newLambs?.length || UI.sheet) return;
  const ids = s.newLambs.filter(id => s.animals[id]); s.newLambs = [];
  if (ids.length) openSheet(() => sheetTags(ids, ids.length === 1 ? 'New lamb — tag it' : `${ids.length} new lambs — tag them`));
}
// ---------- clock ----------
let lastTick = performance.now();
setInterval(() => {
  const now = performance.now(); const dt = (now - lastTick) / 1000; lastTick = now;
  const s = S(); if (!s?.started || document.hidden) return;
  const n = g.tickClock(Math.min(dt, 3));
  drainToasts(); newLambPopup();
  if (n > 0) {
    save();
    const typing = document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (!UI.sheet && !typing) render(); else renderHeader();
  } else if (!s.paused) renderHeader();
}, 1000);
document.addEventListener('visibilitychange', () => { lastTick = performance.now(); if (document.hidden) save(true); });
window.addEventListener('pagehide', () => save(true));

// ---------- boot ----------
(async () => {
  try { const s = await dbGet('game'); if (s && s.started) { s.toasts = []; g.G.s = s; } } catch (e) { console.warn(e); }
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
})();
// drag pens to reorder (press the ⠿ handle and drag)
let dragPen = null;
document.addEventListener('pointerdown', e => {
  const grip = e.target.closest('[data-grip]'); if (!grip) return;
  e.preventDefault(); dragPen = grip.closest('.pen'); dragPen.classList.add('dragging'); document.body.classList.add('nosel'); window.getSelection()?.removeAllRanges();
  try { grip.setPointerCapture(e.pointerId); } catch (_) { }
});
document.addEventListener('pointermove', e => {
  if (!dragPen) return; e.preventDefault();
  const box = document.getElementById('pens'); if (!box) return;
  const others = [...box.querySelectorAll('.pen')].filter(p => p !== dragPen);
  const after = others.find(p => { const r = p.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
  if (after) box.insertBefore(dragPen, after); else box.appendChild(dragPen);
}, { passive: false });
const endDrag = () => {
  if (!dragPen) return; dragPen.classList.remove('dragging'); document.body.classList.remove('nosel');
  const ids = [...document.querySelectorAll('#pens .pen')].map(p => p.dataset.pen);
  dragPen = null; g.reorderPens(ids); save(); render();
};
document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
// keep the layout locked on phones: block pinch and double-tap zoom
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => { document.addEventListener(ev, e => e.preventDefault(), { passive: false }); window.addEventListener(ev, e => e.preventDefault(), { passive: false }); });
['touchstart', 'touchmove'].forEach(ev => document.addEventListener(ev, e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false }));
let lastTap = 0;
document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTap < 350 && !e.target.closest('input,select,textarea,[data-act],[data-on]')) e.preventDefault(); lastTap = now; }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
window.__showlamb = { g, UI, render };
