// ShowLamb — simulation engine
import {
  TRAITS, EPDS, BREEDS, REG_BREEDS, marketClassOf, FEED_BY_ID, STATES, STATE_WEIGHT,
  NATIONAL_SHOWS, homeShows, TIER, JUDGE_STYLES, SURNAMES, FLOCK_SUFFIX, LAMB_NAMES, RAM_NAMES, EWE_NAMES, SHOW_NAMES, ACHIEVEMENTS,
} from './data.js';

export const G = { s: null, listeners: [] };
const S = () => G.s;

// ---------- time ----------
const DAY0 = Date.UTC(2026, 8, 1); // game day 0 = Sep 1, 2026
export const dateOf = d => new Date(DAY0 + d * 864e5);
export const dayOf = (y, m, dd) => Math.round((Date.UTC(y, m, dd) - DAY0) / 864e5);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = d => { const t = dateOf(d); return `${MON[t.getUTCMonth()]} ${t.getUTCDate()}, ${t.getUTCFullYear()}`; };
export const fmtShort = d => { const t = dateOf(d); return `${MON[t.getUTCMonth()]} ${t.getUTCDate()}`; };
export const monthOf = d => dateOf(d).getUTCMonth();
export const yearOf = d => dateOf(d).getUTCFullYear();
const dom = d => dateOf(d).getUTCDate();
export const GESTATION = 147;

// ---------- random ----------
export const rnd = (a, b) => a + Math.random() * (b - a);
export const irnd = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function wpick(weights) { const ks = Object.keys(weights); let t = 0; for (const k of ks) t += weights[k]; let r = Math.random() * t; for (const k of ks) { r -= weights[k]; if (r <= 0) return k; } return ks[0]; }
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- helpers ----------
export const money = n => (n < 0 ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString();
const uid = p => p + (S().nextId++).toString(36);
export const flock = id => S().flocks.find(f => f.id === id);
export const flockName = id => id === 'LOCAL' ? 'Local exhibitor' : (flock(id)?.name || 'Unknown flock');
export const isPlayer = a => a && a.owner === 'P';
export const ageDays = a => S().day - a.birth;
export function ageText(a) {
  const d = ageDays(a);
  if (d < 0) return 'unborn';
  if (d < 60) return `${d} days`;
  if (d < 730) return `${Math.floor(d / 30.4)} mo`;
  return `${(d / 365).toFixed(1)} yr`;
}
export function sexText(a) {
  const d = ageDays(a);
  if (a.sex === 'W') return 'Wether';
  if (a.sex === 'R') return d < 365 ? 'Ram lamb' : 'Ram';
  return d < 365 ? 'Ewe lamb' : (d < 730 ? 'Yearling ewe' : 'Ewe');
}
export const breedLabel = a => a.breed === 'Crossbred' ? (a.face === 'white' ? 'Whiteface cross' : 'Blackface cross') : (a.breed === 'Commercial' ? 'Commercial' : a.breed);
export const living = () => Object.values(S().animals);
export const myAnimals = () => living().filter(a => a.owner === 'P');
const emit = () => G.listeners.forEach(f => f());

export function news(text, kind = 'info', mine = false) {
  const s = S();
  s.news.unshift({ day: s.day, text, kind, mine });
  if (s.news.length > 250) s.news.length = 250;
}
export function toast(text, kind = 'info') { S().toasts.push({ text, kind }); }
function addCash(n, why) { const s = S(); s.cash += n; s.ledger.unshift({ day: s.day, n: Math.round(n), why }); if (s.ledger.length > 200) s.ledger.length = 200; }

// ---------- breed bases ----------
function breedBase(breed) {
  const b = BREEDS[breed]; const base = {};
  TRAITS.forEach((t, i) => base[t] = 50 + b.t[i]);
  base.frame = b.frame; base.prol = b.prolific;
  return base;
}
function avgBase(b1, b2, het) {
  const o = {};
  for (const k of Object.keys(b1)) o[k] = (b1[k] + b2[k]) / 2;
  if (het) { TRAITS.forEach(t => o[t] += 1.5); o.prol += 0.1; }
  return o;
}
export const isFaceDark = f => f === 'black' || f === 'brown';

// ---------- genetics ----------
export function inbreeding(sire, dam) {
  if (!sire || !dam) return 0;
  const sm = new Map([[sire.id, 0]]); (sire.anc || []).forEach(([id, g]) => { if (!sm.has(id) || sm.get(id) > g) sm.set(id, g); });
  const dm = new Map([[dam.id, 0]]); (dam.anc || []).forEach(([id, g]) => { if (!dm.has(id) || dm.get(id) > g) dm.set(id, g); });
  let F = 0;
  for (const [id, gs] of sm) if (dm.has(id)) F += Math.pow(0.5, gs + dm.get(id) + 1);
  return Math.min(F, 0.5);
}
export function accuracy(a) { return Math.min(0.95, 0.32 + 0.63 * (a.prog || 0) / ((a.prog || 0) + 10)); }
export function epdShown(a, k) {
  const e = EPDS.find(x => x.k === k);
  return a.bv[k] + (a.err?.[k] || 0) * e.sd * 0.9 * (1 - accuracy(a));
}
export function phen(a, t) {
  let v = a.base[t] + a.bv[t] + (a.pe?.[t] || 0);
  if (t === 'muscle') v += (a.bv.LMD || 0) * 4 + (a.tone || 0);
  if (t === 'look') v += ((a.fit ?? 55) - 55) * 0.1;
  if (t === 'dimension') v += ((a.cond ?? 3) - 3) * 2;
  if (a.spider === 2) v -= 18;
  const age = S() ? ageDays(a) : 200;
  if (age < 45) v -= (45 - age) * 0.15; // babies don't express it yet
  return clamp(v, 1, 99);
}
export const traitScores = a => Object.fromEntries(TRAITS.map(t => [t, Math.round(phen(a, t))]));
const MKT_W = JUDGE_STYLES[3].w;
export function marketIndex(a) { let v = 0; for (const t of TRAITS) v += MKT_W[t] * phen(a, t); return v; }
export function breedingIndex(a) {
  let v = 0; const w = { structure: .22, balance: .2, bone: .14, look: .16, muscle: .16, dimension: .12 };
  for (const t of TRAITS) v += w[t] * phen(a, t);
  if (BREEDS[a.breed]?.reg !== false) {
    const g = k => epdShown(a, k);
    v += (g('WW') / 2 + g('PWG') / 3 + g('LMD') * 2.5 + g('NLB') / 4 + g('MILK') / 1.5 - g('BW') * 1.5 - g('FAT') * 3) * 0.9;
  }
  return v;
}

export function snapshot(a) {
  return { id: a.id, name: a.name, breed: a.breed, comp: a.comp, face: a.face, reg: a.reg, base: { ...a.base }, bv: { ...a.bv }, spider: a.spider, scr: a.scr, anc: a.anc, owner: a.owner, ownerName: flockName(a.owner), sex: a.sex, prog: a.prog, err: { ...a.err }, tested: { ...a.tested } };
}

function newBV(q, F = 0) {
  const bv = {}; const g = randn() * 6;
  TRAITS.forEach(t => bv[t] = q + g + randn() * 4);
  EPDS.forEach(e => bv[e.k] = randn() * e.sd + q * e.sd * 0.08 * (e.k === 'BW' || e.k === 'FAT' ? -0.3 : 1));
  return bv;
}
const newPE = () => Object.fromEntries(TRAITS.map(t => [t, randn() * 3.5]));
const newErr = () => Object.fromEntries(EPDS.map(e => [e.k, randn()]));

function weightForAge(age, frame, sex) {
  if (age < 0) return 0;
  if (age < 365) { let w = 10 + age * 0.62; return Math.min(w, frame * (0.95 + age / 3000)); }
  const mature = frame * (sex === 'R' ? 1.65 : 1.22);
  return Math.min(mature, frame + (age - 365) * 0.15);
}

function nextTag(f) {
  f.seq = (f.seq || 0) + 1;
  return `${f.prefix}-${String(yearOf(S().day)).slice(2)}${String(f.seq).padStart(3, '0')}`;
}
function namePool(sex) { return Math.random() < 0.3 ? SHOW_NAMES : sex === 'E' ? EWE_NAMES : RAM_NAMES; }
function animalName(f, sex) {
  if (f.id === 'P') {
    const used = new Set(Object.values(S().animals).filter(a => a.owner === 'P').map(a => a.name));
    for (let i = 0; i < 12; i++) { const n = pick(namePool(sex)); if (!used.has(n)) return n; }
    return `${pick(namePool(sex))} ${irnd(2, 9)}`;
  }
  const nm = f.name.split(' ')[0];
  return `${nm} ${pick(namePool(sex))}`;
}

// Founder (no recorded parents)
export function makeFounder({ breed, sex, ageDays: age, owner, q = 0, comp, face, keep = false }) {
  const s = S(); const br = BREEDS[breed]; const f = flock(owner) || { prefix: 'LX', name: 'Local' };
  let base = breedBase(breed);
  if (breed === 'Crossbred') {
    const parents = (comp || 'Hampshire × Suffolk').split(' × ');
    base = avgBase(breedBase(parents[0] in BREEDS ? parents[0] : 'Suffolk'), breedBase(parents[1] in BREEDS ? parents[1] : 'Hampshire'), true);
  }
  const a = {
    id: uid('a'), owner, breed, comp: comp || breed, face: face || br.face, reg: br.reg !== false,
    sex, birth: s.day - age, base, bv: newBV(q), pe: newPE(), err: newErr(), prog: 0, F: 0, anc: [],
    spider: Math.random() < br.spider ? 1 : 0, scr: (Math.random() < br.rr ? 'R' : 'Q') + (Math.random() < br.rr ? 'R' : 'Q'),
    tested: {}, record: [], cond: 3, fit: 50, train: 40, tone: 0, keep,
    sireName: 'Unrecorded', damName: 'Unrecorded',
  };
  if (a.scr === 'QR') a.scr = 'RQ';
  a.wt = weightForAge(age, a.base.frame, sex) * (1 + a.bv.PWG / 60);
  a.name = animalName(f, sex); a.tag = owner === 'LOCAL' ? '' : nextTag(f);
  return a;
}
const addAnimal = a => { S().animals[a.id] = a; return a; };
function removeAnimal(id) { delete S().animals[id]; }

function offspring(dam, sire, owner, recipient) {
  const s = S(); const f = flock(owner);
  const same = dam.breed === sire.breed;
  let breed, comp, face, base, reg;
  if (same) {
    breed = dam.breed; comp = dam.comp || breed; base = dam.breed === 'Crossbred' ? avgBase(dam.base, sire.base, false) : breedBase(breed);
    reg = dam.reg && sire.reg && BREEDS[breed].reg !== false; face = breed === 'Crossbred' ? (isFaceDark(dam.face) || isFaceDark(sire.face) ? 'black' : 'white') : BREEDS[breed].face;
  } else {
    breed = 'Crossbred'; reg = false;
    const ds = dam.breed === 'Crossbred' || dam.breed === 'Commercial' ? (dam.breed === 'Commercial' ? 'Commercial' : 'Club') : dam.breed;
    const ss = sire.breed === 'Crossbred' ? 'Club' : sire.breed;
    comp = `${ss} × ${ds}`;
    face = (isFaceDark(dam.face) || isFaceDark(sire.face)) ? 'black' : 'white';
    base = avgBase(dam.base, sire.base, dam.breed !== 'Crossbred' || sire.breed !== 'Crossbred');
  }
  const F = inbreeding(sire, dam);
  const bv = {};
  const ms = randn() * 3.6 * Math.sqrt(1 - F);
  TRAITS.forEach(t => bv[t] = (dam.bv[t] + sire.bv[t]) / 2 + ms + randn() * 2.8 * Math.sqrt(1 - F) - F * 22);
  EPDS.forEach(e => {
    let v = (dam.bv[e.k] + sire.bv[e.k]) / 2 + randn() * e.sd * 0.7 * Math.sqrt(1 - F);
    if (e.k === 'WW' || e.k === 'PWG') v -= F * e.sd * 4;
    if (e.k === 'NLB') v -= F * 25;
    bv[e.k] = v;
  });
  const al = (g) => g === 2 ? 1 : g === 1 ? (Math.random() < 0.5 ? 1 : 0) : 0;
  const scrAl = g => g[Math.random() < 0.5 ? 0 : 1];
  let scr = scrAl(dam.scr) + scrAl(sire.scr); if (scr === 'QR') scr = 'RQ';
  const anc = [[sire.id, 1], [dam.id, 1]];
  (sire.anc || []).forEach(([id, g]) => g < 3 && anc.push([id, g + 1]));
  (dam.anc || []).forEach(([id, g]) => g < 3 && anc.push([id, g + 1]));
  const a = {
    id: uid('a'), owner, breed, comp, face, reg, sex: Math.random() < 0.5 ? 'R' : 'E', birth: s.day,
    base, bv, pe: newPE(), err: newErr(), prog: 0, F, anc,
    spider: al(dam.spider) + al(sire.spider), scr, tested: {}, record: [], cond: 2.5, fit: 50, train: 20, tone: 0,
    sire: sire.id, dam: dam.id, sireName: sire.name, damName: dam.name, sireOwner: sire.ownerName || flockName(sire.owner),
    damMilk: (recipient || dam).bv.MILK, et: !!recipient, recipName: recipient?.name,
  };
  a.wt = Math.max(5, 9 + a.bv.BW * 1.2 + randn() * 0.8);
  a.name = animalName(f, a.sex); a.tag = nextTag(f);
  return a;
}

function litterSize(ewe) {
  const age = ageDays(ewe);
  let m = ewe.base.prol + ewe.bv.NLB / 40 + (age < 600 ? -0.35 : age > 2200 ? -0.1 : 0.08);
  m = clamp(m, 1.0, 2.6);
  let n = 1;
  if (Math.random() < clamp(m - 1, 0, 0.85)) { n = 2; if (Math.random() < clamp((m - 1.65) * 0.55, 0, 0.35)) n = 3; }
  return n;
}
const OUT_SEASON_OK = ['Dorset', 'Horned Dorset', 'Dorset Advantage', 'Katahdin', 'Dorper', 'White Dorper', 'Merino', 'Rambouillet'];
export function conceptionRate(ewe, method) {
  const m = monthOf(S().day);
  let season = (m >= 7 && m <= 11) ? 1 : (m <= 1 ? 0.75 : 0.45);
  if (season < 1 && OUT_SEASON_OK.includes(ewe.breed)) season = Math.max(season, 0.85);
  const base = method === 'AI' ? 0.68 : method === 'ET' ? 0.6 : 0.93;
  const age = ageDays(ewe);
  return base * season * (age < 240 ? 0 : age < 330 ? 0.8 : 1);
}
export const canBreed = e => e.sex === 'E' && !e.preg && ageDays(e) >= 240 && !e.listing;

// sireRef: a living ram, or a snapshot (semen)
function settle(ewe, sireSnap, method, donor) {
  const s = S();
  const ok = Math.random() < conceptionRate(ewe, method);
  ewe.preg = { sire: sireSnap, method, bredDay: s.day, check: s.day + 30, ok, due: s.day + GESTATION + irnd(-3, 3), donor: donor || null, count: ok ? (donor ? 1 : litterSize(ewe)) : 0 };
}

// ---------- player actions: breeding ----------
export function breedNatural(eweId, ramId) {
  const s = S(); const ewe = s.animals[eweId]; const ram = s.animals[ramId];
  if (!canBreed(ewe)) return 'Ewe is not available to breed.';
  if (!ram || ram.sex !== 'R' || ageDays(ram) < 200) return 'That ram is not old enough.';
  settle(ewe, snapshot(ram), 'Natural');
  return null;
}
export function breedAI(eweId, tankIdx) {
  const s = S(); const ewe = s.animals[eweId]; const t = s.tank[tankIdx];
  if (!canBreed(ewe)) return 'Ewe is not available to breed.';
  if (!t || t.straws < 1) return 'No straws left.';
  if (s.cash < 150) return 'AI costs $150 (vet + lap AI).';
  t.straws--; if (t.straws <= 0) s.tank.splice(tankIdx, 1);
  addCash(-150, `Lap AI — ${ewe.name}`);
  settle(ewe, t.snap, 'AI');
  return null;
}
export function flush(donorId, sire) { // sire: {ramId} or {tankIdx}
  const s = S(); const d = s.animals[donorId];
  if (!canBreed(d)) return 'Donor is not available.';
  if (ageDays(d) < 330) return 'Donor must be at least 11 months old.';
  const cost = 900;
  if (s.cash < cost) return 'Flushing costs $900.';
  let snap;
  if (sire.ramId) { const r = s.animals[sire.ramId]; if (!r) return 'Pick a ram.'; snap = snapshot(r); }
  else { const t = s.tank[sire.tankIdx]; if (!t || t.straws < 2) return 'A flush uses 2 straws.'; t.straws -= 2; snap = t.snap; if (t.straws <= 0) s.tank.splice(sire.tankIdx, 1); }
  addCash(-cost, `Embryo flush — ${d.name}`);
  const mon = monthOf(s.day); const season = (mon >= 7 && mon <= 11) ? 1 : 0.6;
  const n = Math.max(0, Math.round((rnd(1, 11) + d.bv.NLB / 6) * season * (ageDays(d) > 2200 ? 0.6 : 1)));
  d.flushed = s.day; d.flushes = (d.flushes || 0) + 1;
  if (n > 0) s.embryos.push({ id: uid('e'), dam: snapshot(d), sire: snap, count: n, day: s.day });
  news(`Flushed ${d.name} to ${snap.name}: ${n} transferable embryo${n === 1 ? '' : 's'}.`, n ? 'good' : 'bad', true);
  return null;
}
export function implant(embId, recipId) {
  const s = S(); const e = s.embryos.find(x => x.id === embId); const r = s.animals[recipId];
  if (!e || e.count < 1) return 'No embryos.';
  if (!canBreed(r)) return 'Recipient is not available.';
  if (s.cash < 175) return 'Transfer costs $175.';
  addCash(-175, `Embryo transfer into ${r.name}`);
  e.count--; if (e.count <= 0) s.embryos = s.embryos.filter(x => x !== e);
  settle(r, e.sire, 'ET', e.dam);
  return null;
}

// ---------- care ----------
export function setCare(id, care) { const a = S().animals[id]; a.care = { ...(a.care || defaultCare()), ...care }; }
export const defaultCare = () => ({ feed: 'developer', lbs: 3, ex: 1, rinse: true, halter: true });
export function toggleString(id) { const a = S().animals[id]; a.string = !a.string; if (a.string && !a.care) a.care = defaultCare(); }
export function wether(id) { const a = S().animals[id]; if (a.sex === 'R') { a.sex = 'W'; a.reg = a.reg; } }
export function rename(id, name) { const a = S().animals[id]; if (name.trim()) a.name = name.trim().slice(0, 30); }
export function testAnimal(id, kind) {
  const s = S(); const a = s.animals[id]; const cost = kind === 'spider' ? 35 : 30;
  if (a.tested[kind]) return 'Already tested.';
  if (s.cash < cost) return 'Not enough cash.';
  addCash(-cost, `${kind === 'spider' ? 'Spider' : 'Scrapie codon 171'} test — ${a.name}`);
  a.tested[kind] = true;
  if (kind === 'scrapie' && a.scr === 'RR' && a.sex === 'R') achieve('rr_ram');
  return null;
}

// ---------- packer ----------
export function packerPrice(a) {
  const age = ageDays(a);
  const lb = a.spider === 2 ? 0.9 : age < 400 ? 2.1 : a.sex === 'R' ? 0.75 : 0.85;
  return Math.round(a.wt * lb);
}
export function sellPacker(id) {
  const s = S(); const a = s.animals[id];
  if (a.listing) cancelListingFor(id);
  const p = packerPrice(a);
  addCash(p, `Packer — ${a.name} (${Math.round(a.wt)} lb)`);
  removeAnimal(id);
  return p;
}

// ---------- valuation ----------
export function repMult(owner) { const f = flock(owner); return 1 + Math.min(1.5, (f?.rep || 0) / 160); }
function demand(type) {
  const m = monthOf(S().day);
  if (type === 'lamb') return (m >= 1 && m <= 4) ? 1 : (m >= 7 && m <= 9) ? 0.9 : 0.55;
  if (type === 'ewe') return (m >= 7) ? 1 : 0.65;
  if (type === 'ram') return (m >= 5 && m <= 8) ? 1 : 0.6;
  if (type === 'embryo') return (m >= 9 || m <= 1) ? 1 : 0.7;
  return 1;
}
export function lotType(a) {
  const age = ageDays(a);
  if (a.sex === 'W' || (age < 300 && a.sex === 'E' && !a.reg && !a.keep)) return 'lamb';
  if (a.sex === 'R') return 'ram';
  if (age < 300 && a.sex === 'E') return 'lamb';
  return 'ewe';
}
export function fairValue(a) {
  if (a.spider === 2) return packerPrice(a);
  const age = ageDays(a); const type = lotType(a);
  let v;
  if (type === 'lamb') {
    if (age > 330) return packerPrice(a);
    const q = marketIndex(a);
    v = 120 + 60 * Math.exp((q - 58) / 6);
    if (a.sex === 'E' && a.reg) v = Math.max(v, 220 + 28 * Math.exp((breedingIndex(a) - 55) / 8));
  } else if (type === 'ewe') {
    v = 280 + 30 * Math.exp((breedingIndex(a) - 55) / 8);
    if (a.preg && a.preg.ok && S().day >= a.preg.check) v += 0.35 * (150 + 25 * Math.exp(((breedingIndex(a.preg.sire) + breedingIndex(a)) / 2 - 55) / 7));
    if (age > 2000) v *= 0.55;
  } else {
    v = 400 + 40 * Math.exp((breedingIndex(a) - 55) / 7);
    if (age > 1900) v *= 0.5;
    if (a.tested.scrapie && a.scr === 'RR') v *= 1.15;
  }
  if (a.tested.spider && a.spider === 1) v *= 0.4;
  if (a.tested.scrapie && a.scr === 'QQ') v *= 0.8;
  v *= (1 + (a.record?.filter(r => r.banner).length || 0) * 0.08);
  return Math.max(packerPrice(a), v);
}
export function embryoValue(e) { const q = (breedingIndex(e.dam) + breedingIndex(e.sire)) / 2; return 90 + 16 * Math.exp((q - 55) / 7.5); }
function buyerValue(base, owner, type) { return base * repMult(owner) * demand(type) * Math.exp(randn() * 0.28); }

// ---------- market ----------
// listing: {id, kind:'animal'|'embryo', aid?, emb?, seller, mode:'auction'|'buy', price, reserve, start, end, bidders:[{f, max, arrive}], playerMax}
export function listAnimal(id, mode, price, days) {
  const s = S(); const a = s.animals[id];
  if (a.listing) return 'Already listed.';
  if (entriesFor(id).length) return 'Scratch it from upcoming show entries first.';
  const L = { id: uid('L'), kind: 'animal', aid: id, seller: a.owner, mode, price: Math.max(25, Math.round(price)), start: s.day, end: s.day + (mode === 'auction' ? clamp(days, 2, 14) : 30) };
  L.reserve = mode === 'auction' ? L.price : 0;
  if (mode === 'auction') { L.bidders = makeBidders(fairValue(a), a.owner, lotType(a), L.end - s.day); L.cur = L.price; }
  a.listing = L.id; s.listings.push(L);
  return null;
}
export function listEmbryos(embId, count, mode, price, days) {
  const s = S(); const e = s.embryos.find(x => x.id === embId);
  if (!e || e.count < count || count < 1) return 'Not enough embryos.';
  e.count -= count; if (e.count <= 0) s.embryos = s.embryos.filter(x => x !== e);
  const emb = { id: uid('e'), dam: e.dam, sire: e.sire, count, day: e.day };
  const L = { id: uid('L'), kind: 'embryo', emb, seller: 'P', mode, price: Math.max(25, Math.round(price)), start: s.day, end: s.day + (mode === 'auction' ? clamp(days, 2, 14) : 30) };
  L.reserve = mode === 'auction' ? L.price : 0;
  if (mode === 'auction') { L.bidders = makeBidders(embryoValue(emb) * count, 'P', 'embryo', L.end - s.day); L.cur = L.price; }
  s.listings.push(L);
  return null;
}
function makeBidders(base, owner, type, dur) {
  const n = irnd(2, 7) + (demand(type) >= 1 ? 2 : 0);
  const fl = S().flocks.filter(f => f.id !== owner && f.id !== 'P');
  return Array.from({ length: n }, () => ({ f: pick(fl).id, max: Math.round(buyerValue(base, owner, type)), arrive: S().day + irnd(0, Math.max(0, dur - 1)) }));
}
function cancelListingFor(aid) { const s = S(); const a = s.animals[aid]; s.listings = s.listings.filter(l => l.id !== a.listing); delete a.listing; }
export function cancelListing(lid) {
  const s = S(); const L = s.listings.find(l => l.id === lid); if (!L) return;
  if (L.mode === 'auction' && L.playerMax && L.seller !== 'P') return;
  if (L.kind === 'animal') delete s.animals[L.aid].listing;
  if (L.kind === 'embryo' && L.seller === 'P') s.embryos.push(L.emb);
  s.listings = s.listings.filter(l => l !== L);
}
export function currentBid(L) {
  const s = S();
  const live = (L.bidders || []).filter(b => b.arrive <= s.day).map(b => b.max);
  if (L.playerMax) live.push(L.playerMax);
  live.sort((a, b) => b - a);
  if (!live.length || live[0] < L.reserve) return { price: L.price, leader: null, count: 0 };
  const inc = live[0] > 2000 ? 100 : live[0] > 500 ? 25 : 10;
  const price = Math.max(L.reserve, Math.min(live[0], (live[1] || L.reserve - inc) + inc));
  const leaderIsPlayer = L.playerMax && L.playerMax === live[0] && !(L.bidders || []).some(b => b.arrive <= s.day && b.max >= L.playerMax);
  return { price, leader: leaderIsPlayer ? 'P' : 'AI', count: live.length };
}
export function placeBid(lid, max) {
  const s = S(); const L = s.listings.find(l => l.id === lid);
  if (!L || L.mode !== 'auction') return 'Listing not found.';
  const cb = currentBid(L);
  if (max <= cb.price && cb.count) return `Your max must beat ${money(cb.price)}.`;
  if (max < L.reserve) return `Opening bid is ${money(L.reserve)}.`;
  if (max > s.cash) return 'You can’t bid more than your cash on hand.';
  L.playerMax = Math.round(max);
  return null;
}
export function buyNow(lid) {
  const s = S(); const L = s.listings.find(l => l.id === lid);
  if (!L || L.mode !== 'buy') return 'Not available.';
  if (s.cash < L.price) return 'Not enough cash.';
  transfer(L, 'P', L.price);
  return null;
}
function transfer(L, buyer, price) {
  const s = S();
  s.listings = s.listings.filter(l => l !== L);
  const sellerName = flockName(L.seller), buyerName = flockName(buyer);
  if (buyer === 'P') addCash(-price, `Bought ${L.kind === 'embryo' ? L.emb.count + ' embryos' : s.animals[L.aid].name}`);
  if (L.seller === 'P') addCash(price, `Sold ${L.kind === 'embryo' ? L.emb.count + ' embryos' : s.animals[L.aid].name}`);
  let label;
  if (L.kind === 'animal') {
    const a = s.animals[L.aid]; delete a.listing;
    a.owner = buyer; a.string = false; a.keep = buyer !== 'P';
    if (buyer === 'P') { a.care = a.care || defaultCare(); }
    label = `${a.name} (${breedLabel(a)} ${sexText(a).toLowerCase()})`;
    recordSale({ name: a.name, breed: breedLabel(a), type: sexText(a), price, seller: sellerName, buyer: buyerName, day: s.day, mine: L.seller === 'P' || buyer === 'P' });
  } else {
    if (buyer === 'P') s.embryos.push(L.emb);
    label = `${L.emb.count} embryos (${L.emb.sire.name} × ${L.emb.dam.name})`;
    recordSale({ name: label, breed: L.emb.dam.breed, type: 'Embryos', price, seller: sellerName, buyer: buyerName, day: s.day, mine: L.seller === 'P' || buyer === 'P' });
  }
  if (L.seller === 'P') {
    news(`SOLD: ${label} to ${buyerName} for ${money(price)}.`, 'good', true);
    if (price >= 1000) achieve('sale_1k'); if (price >= 5000) achieve('sale_5k');
  }
  if (buyer === 'P') news(`You bought ${label} from ${sellerName} for ${money(price)}.`, 'info', true);
}
function recordSale(r) {
  const s = S();
  s.topSales.push(r); s.topSales.sort((a, b) => b.price - a.price); s.topSales.length = Math.min(s.topSales.length, 25);
  if (r.price >= 3000 && !r.mine) news(`Top sale: ${r.name} from ${r.seller} to ${r.buyer} — ${money(r.price)}.`, 'sale');
}

function processMarket() {
  const s = S();
  for (const L of [...s.listings]) {
    if (L.kind === 'animal' && !s.animals[L.aid]) { s.listings = s.listings.filter(x => x !== L); continue; }
    if (L.mode === 'buy' && L.seller === 'P') {
      const a = L.kind === 'animal' ? s.animals[L.aid] : null;
      const base = a ? fairValue(a) : embryoValue(L.emb) * L.emb.count;
      const type = a ? lotType(a) : 'embryo';
      for (let i = 0; i < 2; i++) {
        if (Math.random() < 0.5 && buyerValue(base, 'P', type) >= L.price) {
          const fl = s.flocks.filter(f => f.id !== 'P');
          transfer(L, pick(fl).id, L.price); break;
        }
      }
    }
    if (!s.listings.includes(L)) continue;
    if (L.end <= s.day) {
      if (L.mode === 'auction') closeAuction(L);
      else { // expired buy-now
        s.listings = s.listings.filter(x => x !== L);
        if (L.kind === 'animal') { delete s.animals[L.aid].listing; if (L.seller === 'P') news(`Your listing for ${s.animals[L.aid].name} expired unsold.`, 'bad', true); }
        else if (L.seller === 'P') { s.embryos.push(L.emb); news('Your embryo listing expired unsold.', 'bad', true); }
      }
    } else if (L.mode === 'buy' && L.seller !== 'P' && Math.random() < 0.06) {
      // other AI flocks buy AI lots too
      const fl = s.flocks.filter(f => f.id !== 'P' && f.id !== L.seller);
      transfer(L, pick(fl).id, L.price);
    }
  }
}
function closeAuction(L) {
  const s = S();
  const all = (L.bidders || []).map(b => ({ who: b.f, max: b.max }));
  if (L.playerMax) all.push({ who: 'P', max: L.playerMax });
  all.sort((a, b) => b.max - a.max || (a.who === 'P' ? -1 : 1));
  if (!all.length || all[0].max < L.reserve) {
    s.listings = s.listings.filter(x => x !== L);
    if (L.kind === 'animal') delete s.animals[L.aid].listing;
    if (L.seller === 'P') { if (L.kind === 'embryo') s.embryos.push(L.emb); news(`No sale: ${L.kind === 'animal' ? s.animals[L.aid].name : 'embryo lot'} didn’t reach the opening bid.`, 'bad', true); }
    if (L.playerMax) news(`Your bid lost — lot passed unsold.`, 'bad', true);
    return;
  }
  const inc = all[0].max > 2000 ? 100 : all[0].max > 500 ? 25 : 10;
  let price = Math.max(L.reserve, Math.min(all[0].max, (all[1]?.max || L.reserve - inc) + inc));
  let winner = all[0].who;
  if (winner === 'P' && s.cash < price) { winner = all[1]?.who; price = all[1] ? Math.max(L.reserve, all[1].max) : 0; }
  if (!winner) { s.listings = s.listings.filter(x => x !== L); if (L.kind === 'animal') delete s.animals[L.aid].listing; return; }
  if (L.playerMax && winner !== 'P') news(`Outbid on ${L.kind === 'animal' ? s.animals[L.aid].name : 'embryos'} — sold for ${money(price)}.`, 'bad', true);
  transfer(L, winner, price);
}

// AI flocks consign lots by season
function aiListings() {
  const s = S(); const m = monthOf(s.day);
  const active = s.listings.filter(l => l.seller !== 'P').length;
  if (active > 120) return;
  const sales = irnd(1, 4);
  for (let i = 0; i < sales; i++) {
    const f = pick(s.flocks.filter(x => x.id !== 'P'));
    const mine = living().filter(a => a.owner === f.id && !a.listing);
    let lots = [];
    if (m >= 1 && m <= 5) lots = mine.filter(a => ageDays(a) >= 40 && ageDays(a) <= 150 && a.sex !== 'R' && !a.keep);
    else if (m >= 7 && m <= 9) lots = mine.filter(a => (ageDays(a) >= 40 && ageDays(a) <= 140 && a.sex !== 'R' && !a.keep) || (a.sex === 'E' && ageDays(a) > 400 && ageDays(a) < 1500 && Math.random() < 0.15));
    else if (m >= 5 && m <= 8) lots = mine.filter(a => a.sex === 'R' && ageDays(a) > 150 && ageDays(a) < 800 && a.keep);
    else if (m >= 9 || m === 0) lots = mine.filter(a => a.sex === 'E' && a.preg?.ok && ageDays(a) < 1800 && Math.random() < 0.25);
    if (m >= 5 && m <= 8) lots = lots.concat(mine.filter(a => a.sex === 'R' && ageDays(a) > 120 && ageDays(a) < 500 && Math.random() < 0.3));
    shuffle(lots).slice(0, irnd(2, 6)).forEach(a => {
      const fv = fairValue(a) * repMult(f.id);
      const mode = Math.random() < 0.6 ? 'auction' : 'buy';
      const L = { id: uid('L'), kind: 'animal', aid: a.id, seller: f.id, mode, start: s.day, end: s.day + (mode === 'auction' ? irnd(4, 9) : irnd(10, 25)) };
      L.price = mode === 'auction' ? Math.max(100, Math.round(fv * rnd(0.3, 0.55) / 25) * 25) : Math.round(fv * rnd(0.95, 1.4) / 25) * 25;
      L.reserve = mode === 'auction' ? L.price : 0;
      if (mode === 'auction') L.bidders = makeBidders(fairValue(a), f.id, lotType(a), L.end - s.day);
      a.listing = L.id; s.listings.push(L);
    });
  }
  // embryo lots in the winter
  if ((m >= 9 || m <= 1) && Math.random() < 0.25) {
    const f = pick(s.flocks.filter(x => x.id !== 'P' && x.type === 'breed'));
    const ewes = living().filter(a => a.owner === f.id && a.sex === 'E' && ageDays(a) > 400 && ageDays(a) < 2000);
    const rams = living().filter(a => a.owner === f.id && a.sex === 'R' && ageDays(a) > 250);
    if (ewes.length && rams.length) {
      const d = ewes.sort((a, b) => breedingIndex(b) - breedingIndex(a))[0], r = rams.sort((a, b) => breedingIndex(b) - breedingIndex(a))[0];
      const emb = { id: uid('e'), dam: snapshot(d), sire: snapshot(r), count: irnd(2, 5), day: s.day };
      const fv = embryoValue(emb) * emb.count * repMult(f.id);
      const L = { id: uid('L'), kind: 'embryo', emb, seller: f.id, mode: 'auction', start: s.day, end: s.day + irnd(5, 9), price: Math.max(100, Math.round(fv * 0.4 / 25) * 25) };
      L.reserve = L.price; L.bidders = makeBidders(embryoValue(emb) * emb.count, f.id, 'embryo', L.end - s.day);
      s.listings.push(L);
    }
  }
}

// ---------- sire directory ----------
export const DIRECTORY_FEE = 250;
export function listSire(ramId, price) {
  const s = S(); const r = s.animals[ramId];
  if (r.sex !== 'R' || ageDays(r) < 200) return 'Only rams 7+ months old can be listed.';
  if (s.directory.some(d => d.ramId === ramId)) return 'Already in the directory.';
  if (s.cash < DIRECTORY_FEE) return `Listing fee is ${money(DIRECTORY_FEE)}.`;
  addCash(-DIRECTORY_FEE, `Sire directory fee — ${r.name}`);
  s.directory.push({ id: uid('d'), ramId, owner: 'P', price: Math.max(10, Math.round(price)), snap: snapshot(r), listed: s.day, until: s.day + 365, sold: 0 });
  return null;
}
export function unlistSire(dirId) { const s = S(); s.directory = s.directory.filter(d => d.id !== dirId); }
export function buySemen(dirId, qty) {
  const s = S(); const d = s.directory.find(x => x.id === dirId);
  if (!d || d.owner === 'P') return 'Not available.';
  const cost = d.price * qty;
  if (s.cash < cost) return 'Not enough cash.';
  addCash(-cost, `${qty} straws — ${d.snap.name}`);
  const live = s.animals[d.ramId]; const snap = live ? snapshot(live) : d.snap;
  const t = s.tank.find(x => x.snap.id === d.snap.id);
  if (t) { t.straws += qty; t.snap = snap; } else s.tank.push({ snap, straws: qty });
  return null;
}
function refreshDirectory() {
  const s = S();
  s.directory = s.directory.filter(d => d.owner === 'P' ? d.until > s.day : (s.animals[d.ramId] && d.until > s.day));
  s.directory.forEach(d => { if (s.animals[d.ramId]) d.snap = snapshot(s.animals[d.ramId]); });
  const have = new Set(s.directory.map(d => d.ramId));
  const rams = living().filter(a => a.owner !== 'P' && a.sex === 'R' && ageDays(a) > 250 && !have.has(a.id))
    .sort((a, b) => breedingIndex(b) - breedingIndex(a)).slice(0, Math.max(0, 30 - s.directory.filter(d => d.owner !== 'P').length));
  rams.forEach(r => {
    const bi = breedingIndex(r);
    s.directory.push({ id: uid('d'), ramId: r.id, owner: r.owner, price: Math.round(clamp(20 + 8 * Math.exp((bi - 65) / 5), 20, 500) / 5) * 5, snap: snapshot(r), listed: s.day, until: s.day + 365, sold: 0 });
  });
}

// ---------- shows ----------
export function allShows() {
  const s = S();
  return [...homeShows(s.home, s.county), ...NATIONAL_SHOWS];
}
export function upcomingShows(n = 14) {
  const s = S(); const y = yearOf(s.day); const out = [];
  for (const yy of [y, y + 1, y + 2]) for (const sh of allShows()) {
    const d = dayOf(yy, sh.m, sh.d);
    if (d > s.day) out.push({ ...sh, day: d, year: yy, key: `${sh.id}-${yy}` });
  }
  return out.sort((a, b) => a.day - b.day).slice(0, n);
}
export function judgeFor(key) {
  const s = S();
  if (!s.judges[key]) s.judges[key] = { name: `${pick(['Dr. ', '', '', ''])}${pick(['Jake', 'Kelly', 'Travis', 'Shane', 'Brooke', 'Cody', 'Mark', 'Jill', 'Ryan', 'Tanner', 'Kyle', 'Lindsay', 'Chad', 'Dustin', 'Amy', 'Brett'])} ${pick(SURNAMES)}`, style: irnd(0, JUDGE_STYLES.length - 1), from: pick(Object.keys(STATE_WEIGHT)) };
  return s.judges[key];
}
export function marketEligible(a, show) {
  const age = ageDays(a) + (show.day - S().day);
  if (a.sex === 'R') return 'Ram lambs must be wethered to show market';
  if (a.spider === 2) return 'Spider lamb — not showable';
  if (age < 90 || age > 420) return 'Market lambs must be 3–14 months old on show day';
  return null;
}
export function breedingEligible(a, show) {
  const age = ageDays(a) + (show.day - S().day);
  if (!a.reg) return 'Must be a registered purebred';
  if (a.sex === 'W') return 'Wethers show market only';
  if (a.spider === 2) return 'Not showable';
  if (age < 60 || age > 760) return 'Lambs and yearlings only';
  return null;
}
export function projectedWeight(a, days) {
  let w = a.wt; const age0 = ageDays(a);
  const c = a.care || defaultCare(); const F = FEED_BY_ID[c.feed] || FEED_BY_ID.developer;
  for (let i = 0; i < days; i++) {
    const age = age0 + i; let adg;
    if (age < 60) adg = 0.5 + 0.025 * a.bv.WW + 0.03 * (a.damMilk || 0);
    else {
      const eff = a.owner === 'P' ? (a.string ? F.energy * Math.min(1, c.lbs / (w * 0.035)) + Math.max(0, c.lbs - w * 0.035) * 0.05 : 0.34) : 0.7;
      adg = (0.22 + 0.68 * eff) * (1 + a.bv.PWG / 25) * (a.base.frame / 140) * Math.max(0.08, 1 - Math.max(0, w / a.base.frame - 0.9) * 3);
    }
    w += Math.max(0.05, adg) * (a.spider === 2 ? 0.5 : 1);
  }
  return w;
}
export function enterShow(show, ids, div) {
  const s = S(); const e = s.entries[show.key] || (s.entries[show.key] = { market: [], breeding: [] });
  const fresh = ids.filter(id => !e[div].includes(id));
  const fee = fresh.length * show.fee;
  if (fee > s.cash) return 'Not enough cash for entry fees.';
  if (fee) addCash(-fee, `Entry fees — ${show.name} (${fresh.length})`);
  e[div].push(...fresh);
  return null;
}
export function scratch(key, id, div) { const e = S().entries[key]; if (e) e[div] = e[div].filter(x => x !== id); }
export const entriesFor = id => Object.entries(S().entries).filter(([, e]) => e.market.includes(id) || e.breeding.includes(id)).map(([k]) => k);

function aiPresentation(f) { const k = f?.skill ?? 0.5; return { train: 45 + k * 50, fit: 50 + k * 45, tone: k * 3.5 }; }
function showScore(a, judge, kind, show) {
  const w = JUDGE_STYLES[judge.style].w;
  const pres = a.owner === 'P' ? { train: a.train, fit: a.fit, tone: a.tone } : aiPresentation(flock(a.owner));
  const save = { fit: a.fit, tone: a.tone };
  a.fit = pres.fit; a.tone = pres.tone;
  let v = 0;
  if (kind === 'market') {
    for (const t of TRAITS) v += w[t] * phen(a, t);
    v -= 5 * Math.pow(Math.abs((a.cond ?? 3) - 3), 1.4);
    const ratio = a.wt / a.base.frame;
    if (ratio < 0.86) v -= (0.86 - ratio) * 70;
    if (ratio > 1.06) v -= (ratio - 1.06) * 55;
  } else {
    const bw = { structure: .24, balance: .2, bone: .14, look: .16, muscle: .14, dimension: .12 };
    for (const t of TRAITS) v += (bw[t] * 0.6 + w[t] * 0.4) * phen(a, t);
    const exp = weightForAge(ageDays(a), a.base.frame, a.sex);
    v += clamp((a.wt / exp - 1) * 20, -6, 5);
  }
  v += (pres.train - 50) * 0.06 + randn() * 2.2;
  a.fit = save.fit; a.tone = save.tone;
  return v;
}
function splitByWeight(list, max = 12) {
  list.sort((a, b) => a.wt - b.wt);
  const n = Math.max(1, Math.ceil(list.length / max)); const out = [];
  for (let i = 0; i < n; i++) out.push(list.slice(Math.floor(i * list.length / n), Math.floor((i + 1) * list.length / n)));
  return out.filter(c => c.length);
}
const slim = (a, score) => ({ id: a.id, name: a.name, flock: flockName(a.owner), owner: a.owner, wt: Math.round(a.wt), breed: breedLabel(a), sire: a.sireName, sc: score });
function runClass(list, judge, kind, show) {
  return list.map(a => ({ a, sc: showScore(a, judge, kind, show) })).sort((x, y) => y.sc - x.sc);
}
function localLamb(show, kind, breed) {
  const age = irnd(150, 260);
  const a = makeFounder({ breed: breed || (Math.random() < 0.7 ? 'Crossbred' : pick(['Suffolk', 'Hampshire', 'Southdown', 'Dorset', 'Shropshire', 'Natural Colored'])), sex: Math.random() < 0.6 ? 'W' : 'E', ageDays: age, owner: 'LOCAL', q: rnd(-6, 4), comp: 'Hampshire × Suffolk', face: Math.random() < 0.8 ? 'black' : 'white' });
  a.wt = clamp(a.base.frame * rnd(0.82, 1.05), show.minWt + 2, show.maxWt - 2); a.cond = clamp(3 + randn() * 0.5, 1.8, 4.3);
  a.name = `${pick(namePool(a.sex))} (${pick(SURNAMES)} family)`; a.temp = true;
  return a;
}

function attendingFlocks(show) {
  const s = S(); const t = TIER[show.tier];
  let pool = s.flocks.filter(f => f.id !== 'P');
  const scale = Math.max(1, pool.length / 150);
  if (show.tier === 'county') pool = pool.filter(f => f.state === s.home);
  else if (show.tier === 'state') pool = pool.filter(f => f.state === s.home || Math.random() < 0.06);
  else if (show.tier === 'jackpot') pool = pool.filter(f => f.state === s.home || Math.random() < 0.15);
  else if (show.id === 'keystone') pool = pool.filter(f => ['PA', 'OH', 'NY', 'MD', 'VA', 'WV', 'NJ', 'DE', 'MI', 'IN', 'KY'].includes(f.state) || Math.random() < 0.15);
  else if (['sanantonio', 'houston', 'fortworth'].includes(show.id)) pool = pool.filter(f => ['TX', 'OK', 'NM', 'LA', 'AR', 'KS', 'CO'].includes(f.state) || Math.random() < (f.skill > 0.7 ? 0.5 : 0.15));
  else if (show.id === 'denver') pool = pool.filter(f => ['CO', 'NE', 'KS', 'WY', 'UT', 'NM', 'SD', 'MT', 'ID', 'AZ', 'TX', 'IA'].includes(f.state) || Math.random() < (f.skill > 0.7 ? 0.4 : 0.12));
  return shuffle(pool).slice(0, Math.round(t.flocks * scale));
}

export function runShow(show) {
  const s = S(); const judge = judgeFor(show.key); const T = TIER[show.tier];
  const e = s.entries[show.key] || { market: [], breeding: [] };
  const flocks = attendingFlocks(show);
  const fset = new Set(flocks.map(f => f.id));
  const k = { county: 2, jackpot: 2, state: 3, major: 3, national: 4 }[show.tier];
  const mine = [];
  const res = { key: show.key, id: show.id, name: show.name, tier: show.tier, day: s.day, judge: { ...judge, style: JUDGE_STYLES[judge.style].label }, market: null, breeding: null, mine: [] };
  const animals = living();

  // ----- market division -----
  let mk = [];
  for (const id of e.market) {
    const a = s.animals[id]; if (!a || a.owner !== 'P') continue;
    const why = marketEligible(a, show);
    if (why) { res.mine.push({ name: a.name, text: `Scratched — ${why}` }); continue; }
    if (a.wt < show.minWt || a.wt > show.maxWt) { res.mine.push({ name: a.name, text: `Did not make weight (${Math.round(a.wt)} lb; limits ${show.minWt}–${show.maxWt})` }); continue; }
    mk.push(a);
  }
  const byFlock = {};
  for (const a of animals) if (fset.has(a.owner) && !a.listing && !marketEligible(a, show) && a.wt >= show.minWt && a.wt <= show.maxWt && !a.keep) (byFlock[a.owner] ||= []).push(a);
  for (const f of flocks) {
    const list = (byFlock[f.id] || []).sort((x, y) => marketIndex(y) - marketIndex(x)).slice(0, k);
    mk.push(...list);
  }
  if (show.tier === 'county' || show.tier === 'state' || show.tier === 'jackpot') {
    const locals = { county: irnd(25, 45), state: irnd(40, 70), jackpot: irnd(15, 35) }[show.tier];
    for (let i = 0; i < locals; i++) mk.push(localLamb(show));
  }
  if (mk.length) {
    const groups = {};
    for (const a of mk) { const g = show.tier === 'county' ? 'Market Lambs' : marketClassOf(a); (groups[g] ||= []).push(a); }
    const divs = [];
    for (const [g, list] of Object.entries(groups)) {
      const classes = splitByWeight(list).map((cl, i, arr) => {
        const placed = runClass(cl, judge, 'market', show);
        return { label: `${g} — Class ${i + 1} (${Math.round(cl[0].wt)}–${Math.round(cl[cl.length - 1].wt)} lb)`, placed };
      });
      const winners = classes.map(c => c.placed[0]).sort((x, y) => y.sc - x.sc);
      const champ = winners[0];
      const champCls = classes.find(c => c.placed[0] === champ);
      const resv = [...winners.slice(1), champCls.placed[1]].filter(Boolean).sort((x, y) => y.sc - x.sc)[0];
      divs.push({ name: g, classes, champ, resv });
    }
    divs.sort((a, b) => MARKET_ORDER(a.name) - MARKET_ORDER(b.name));
    const champs = divs.map(d => d.champ).sort((x, y) => y.sc - x.sc);
    const grand = champs[0];
    const gDiv = divs.find(d => d.champ === grand);
    const resGrand = [...champs.slice(1), gDiv.resv].filter(Boolean).sort((x, y) => y.sc - x.sc)[0];
    // awards
    divs.forEach(d => d.classes.forEach(c => c.placed.forEach((p, i) => {
      if (p.a.owner === 'P') {
        const prem = Math.round(T.prem * Math.max(0, 1 - i * 0.12));
        if (prem > 0) addCash(prem, `Premium — ${show.short} ${ordinal(i + 1)}`);
        res.mine.push({ name: p.a.name, text: `${ordinal(i + 1)} of ${c.placed.length} — ${c.label}` });
        p.a.record.push({ key: show.key, show: show.short, day: s.day, text: `${ordinal(i + 1)} of ${c.placed.length}, ${c.label.split(' — ')[1]}` });
        if (i === 0) achieve('first_class');
      }
    })));
    const multi = divs.length > 1;
    if (multi) divs.forEach(d => { award(d.champ.a, show, `Champion ${d.name}`, T.breedCh, 'breed'); if (d.resv) award(d.resv.a, show, `Reserve Champion ${d.name}`, T.breedCh / 2, 'breedres'); });
    award(grand.a, show, 'Grand Champion Market Lamb', T.grand, 'grand');
    if (resGrand) award(resGrand.a, show, 'Reserve Grand Champion Market Lamb', T.reserve, 'reserve');
    news(`${show.short}: Grand Champion Market Lamb — ${grand.a.name}, ${flockName(grand.a.owner)}${resGrand ? `; Reserve — ${resGrand.a.name}, ${flockName(resGrand.a.owner)}` : ''}.`, 'show', grand.a.owner === 'P' || resGrand?.a.owner === 'P');
    res.market = {
      divs: divs.map(d => ({ name: d.name, champ: slim(d.champ.a), resv: d.resv && slim(d.resv.a), classes: d.classes.map(c => ({ label: c.label, placed: c.placed.map(p => slim(p.a)) })) })),
      grand: slim(grand.a), resGrand: resGrand && slim(resGrand.a), count: mk.length,
    };
  }

  // ----- breeding division -----
  if (show.breeding) {
    let br = [];
    for (const id of e.breeding) {
      const a = s.animals[id]; if (!a || a.owner !== 'P') continue;
      const why = breedingEligible(a, show);
      if (why) { res.mine.push({ name: a.name, text: `Scratched (breeding) — ${why}` }); continue; }
      br.push(a);
    }
    const bf = {};
    for (const a of animals) if (fset.has(a.owner) && !a.listing && !breedingEligible(a, show)) (bf[a.owner] ||= []).push(a);
    for (const f of flocks) if (f.type === 'breed') br.push(...(bf[f.id] || []).sort((x, y) => breedingIndex(y) - breedingIndex(x)).slice(0, k + 1));
    const byBreed = {};
    for (const a of br) (byBreed[a.breed] ||= []).push(a);
    const breeds = [];
    for (const [bname, list] of Object.entries(byBreed).sort()) {
      const cls = (sex, lamb) => list.filter(a => (a.sex === sex) && ((ageDays(a) < 365) === lamb));
      const defs = [['Ewe Lamb', cls('E', true)], ['Yearling Ewe', cls('E', false)], ['Ram Lamb', cls('R', true)], ['Yearling Ram', cls('R', false)]];
      const classes = [];
      for (const [lab, l] of defs) if (l.length) classes.push({ label: lab, sex: lab.includes('Ewe') ? 'E' : 'R', placed: runClass(l, judge, 'breeding', show) });
      const champOf = sex => {
        const cs = classes.filter(c => c.sex === sex); if (!cs.length) return [null, null];
        const w = cs.map(c => c.placed[0]).sort((x, y) => y.sc - x.sc);
        const cc = cs.find(c => c.placed[0] === w[0]);
        const r = [...w.slice(1), cc.placed[1]].filter(Boolean).sort((x, y) => y.sc - x.sc)[0];
        return [w[0], r];
      };
      const [ce, re] = champOf('E'), [cr, rr] = champOf('R');
      classes.forEach(c => c.placed.forEach((p, i) => {
        if (p.a.owner === 'P') {
          const prem = Math.round(T.prem * 0.8 * Math.max(0, 1 - i * 0.12)); if (prem > 0) addCash(prem, `Premium — ${show.short} ${bname} ${ordinal(i + 1)}`);
          res.mine.push({ name: p.a.name, text: `${ordinal(i + 1)} of ${c.placed.length} — ${bname} ${c.label}` });
          p.a.record.push({ key: show.key, show: show.short, day: s.day, text: `${ordinal(i + 1)} of ${c.placed.length}, ${bname} ${c.label}` });
          if (i === 0) achieve('first_class');
        }
      }));
      if (ce) award(ce.a, show, `Champion ${bname} Ewe`, T.breedCh, 'breed');
      if (re) award(re.a, show, `Reserve Champion ${bname} Ewe`, T.breedCh / 2, 'breedres');
      if (cr) award(cr.a, show, `Champion ${bname} Ram`, T.breedCh, 'breed');
      if (rr) award(rr.a, show, `Reserve Champion ${bname} Ram`, T.breedCh / 2, 'breedres');
      breeds.push({ breed: bname, classes: classes.map(c => ({ label: `${bname} ${c.label}`, placed: c.placed.map(p => slim(p.a)) })), ce: ce && slim(ce.a), re: re && slim(re.a), cr: cr && slim(cr.a), rr: rr && slim(rr.a) });
    }
    if (breeds.length) res.breeding = { breeds, count: br.length };
  }

  const hadMine = e.market.length + e.breeding.length > 0;
  s.results.unshift(res);
  // keep all results with my animals + the 12 most recent others
  let others = 0; s.results = s.results.filter(r => r.mine.length || hadMine && r === res || (++others <= 12));
  delete s.entries[show.key];
  if (hadMine) { toast(`${show.short} results are in!`, 'show'); news(`Results posted: ${show.name}. ${res.mine.length ? res.mine.map(m => `${m.name}: ${m.text}`).join(' · ') : ''}`, 'show', true); }
  return res;
}
const MO = ['Blackface Cross', 'Whiteface Cross', 'Dorper', 'Dorset', 'Hampshire', 'Oxford', 'Shropshire', 'Southdown', 'Suffolk', 'AOB', 'Market Lambs'];
const MARKET_ORDER = n => MO.indexOf(n);
export const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

function award(a, show, title, money_, kind) {
  const s = S(); const T = TIER[show.tier];
  if (a.temp) return;
  const f = flock(a.owner);
  const rep = { grand: T.rep, reserve: T.rep * 0.6, breed: T.rep * 0.35, breedres: T.rep * 0.2 }[kind];
  if (f) { f.rep = (f.rep || 0) + rep; f.banners = (f.banners || 0) + 1; }
  a.record = a.record || []; a.record.push({ key: show.key, show: show.short, day: s.day, text: title, banner: true });
  if (a.sire) { const st = s.sireStats[a.sire] || (s.sireStats[a.sire] = { name: a.sireName, owner: a.sireOwner, breed: '', banners: 0 }); st.banners++; }
  if (a.owner === 'P') {
    addCash(money_, `${title} — ${show.short}`);
    toast(`🎗️ ${title} — ${a.name} (${show.short})`, 'show');
    s.banners.unshift({ day: s.day, show: show.name, short: show.short, title, animal: a.name, tier: show.tier, kind });
    if (show.tier === 'county' && (kind === 'grand' || kind === 'reserve')) achieve('county_champ');
    if (kind === 'breed') achieve('breed_champ');
    if (show.tier === 'jackpot' && kind === 'grand') achieve('jackpot_grand');
    if (show.tier === 'state' && kind === 'grand') achieve('state_grand');
    if (show.tier === 'major' && (kind === 'grand' || kind === 'reserve' || kind === 'breed')) achieve('major_banner');
    if (show.tier === 'national' && kind === 'grand') achieve('naile_grand');
    if (s.banners.length >= 25) achieve('banners_25');
  }
}

// ---------- achievements ----------
export function achieve(id) {
  const s = S(); if (s.ach[id]) return;
  const A = ACHIEVEMENTS.find(x => x.id === id); if (!A) return;
  s.ach[id] = s.day; addCash(A.cash, `Achievement — ${A.name}`);
  toast(`🏆 ${A.name} — +${money(A.cash)}`, 'ach'); news(`Achievement unlocked: ${A.name} (+${money(A.cash)}).`, 'good', true);
}

// ---------- flocks ----------
function wState() { return wpick(STATE_WEIGHT); }
function makeFlock(i, opts = {}) {
  const s = S();
  const sur = pick(SURNAMES);
  let suf = pick(FLOCK_SUFFIX);
  const type = opts.type || (Math.random() < 0.65 ? 'club' : 'breed');
  let breed = null;
  if (type === 'breed') {
    breed = wpick({ Suffolk: 10, Hampshire: 10, Southdown: 9, Shropshire: 6, Dorset: 7, Oxford: 4, Montadale: 3, 'Natural Colored': 4, Texel: 3, 'Wether-Type Southdown': 3, Dorper: 2, 'White Dorper': 2, Katahdin: 2, Tunis: 2, Cheviot: 1, Columbia: 1, Corriedale: 1, Rambouillet: 1, 'Border Leicester': 1, 'Horned Dorset': 1, 'Dorset Advantage': 1, Romney: 1, Lincoln: 0.6, Merino: 0.6, 'Kerry Hill': 0.6 });
    if (['Suffolks', 'Hampshires', 'Southdowns', 'Dorsets'].includes(suf)) suf = 'Farms';
  } else if (['Suffolks', 'Hampshires', 'Southdowns', 'Dorsets'].includes(suf)) suf = 'Club Lambs';
  const skill = clamp(opts.skill ?? Math.pow(Math.random(), 1.3), 0, 1);
  const name = `${sur} ${suf}`;
  return {
    id: 'F' + i, name: s.flocks.some(f => f.name === name) ? `${sur} & Sons ${suf}` : name, state: opts.state || wState(), type, breed, skill,
    q: -2 + skill * 12 + randn() * 1.5, rep: Math.round(skill * skill * 60), banners: 0, prefix: sur.slice(0, 3).toUpperCase(), seq: 0,
    size: opts.size || irnd(5, 13), fall: Math.random() < 0.18, founded: s.day,
  };
}
function stockFlock(f, withLambs) {
  const club = f.type === 'club';
  const ewes = f.size;
  for (let i = 0; i < ewes; i++) {
    const breed = club ? (Math.random() < 0.85 ? 'Crossbred' : pick(['Suffolk', 'Hampshire', 'Southdown', 'Shropshire'])) : f.breed;
    const comp = pick(['Hampshire × Suffolk', 'Suffolk × Hampshire', 'Hampshire × Southdown', 'Suffolk × Shropshire', 'Southdown × Hampshire']);
    addAnimal(makeFounder({ breed, sex: 'E', ageDays: irnd(400, 2300), owner: f.id, q: f.q, comp, face: 'black', keep: true }));
  }
  const rams = f.size > 9 ? 2 : 1;
  for (let i = 0; i < rams; i++) {
    const breed = club ? pick(['Hampshire', 'Suffolk', 'Southdown', 'Crossbred', 'Hampshire', 'Shropshire', 'Dorset']) : f.breed;
    addAnimal(makeFounder({ breed, sex: 'R', ageDays: irnd(400, 1500), owner: f.id, q: f.q + 1.5, comp: 'Hampshire × Suffolk', face: 'black', keep: true }));
  }
  if (withLambs) {
    const n = Math.round(ewes * rnd(1.1, 1.6));
    const dams = living().filter(a => a.owner === f.id && a.sex === 'E');
    const sire = living().find(a => a.owner === f.id && a.sex === 'R');
    for (let i = 0; i < n; i++) {
      const d = pick(dams); const age = f.fall ? irnd(330, 380) : irnd(170, 245);
      const a = offspring(d, snapshot(sire), f.id);
      a.birth = S().day - age; a.wt = weightForAge(age, a.base.frame, a.sex) * (1 + a.bv.PWG / 60) * rnd(0.92, 1.05);
      if (a.sex === 'R') a.sex = (a.reg && Math.random() < 0.3) ? 'R' : 'W';
      a.cond = clamp(2.6 + f.skill * 0.6 + randn() * 0.3, 1.5, 4.5); a.fit = 50; a.train = 50;
      if (a.sex === 'R') a.keep = true;
      d.prog++; addAnimal(a);
    }
  }
}

// ---------- new game ----------
export function starterOptions() {
  const s = S();
  const q = () => rnd(1, 6);
  const ewes = [
    makeFounder({ breed: 'Crossbred', sex: 'E', ageDays: irnd(500, 1300), owner: 'P', q: q(), comp: 'Hampshire × Suffolk', face: 'black' }),
    makeFounder({ breed: 'Crossbred', sex: 'E', ageDays: irnd(500, 1300), owner: 'P', q: q(), comp: 'Suffolk × Southdown', face: 'black' }),
    makeFounder({ breed: 'Crossbred', sex: 'E', ageDays: irnd(500, 1300), owner: 'P', q: q(), comp: 'Hampshire × Shropshire', face: 'black' }),
    makeFounder({ breed: 'Commercial', sex: 'E', ageDays: irnd(500, 1300), owner: 'P', q: q() - 1, face: 'white' }),
    ...['Suffolk', 'Hampshire', 'Southdown', 'Shropshire', 'Dorset', 'Oxford', 'Natural Colored', 'Montadale', 'Texel', 'Wether-Type Southdown', 'Dorper', 'Katahdin']
      .map(b => makeFounder({ breed: b, sex: 'E', ageDays: irnd(450, 1400), owner: 'P', q: q() })),
  ];
  const rams = ['Hampshire', 'Suffolk', 'Southdown', 'Shropshire', 'Dorset', 'Crossbred', 'Texel', 'Oxford']
    .map(b => makeFounder({ breed: b, sex: 'R', ageDays: irnd(400, 1000), owner: 'P', q: q() + 1, comp: 'Hampshire × Suffolk', face: 'black' }));
  return { ewes, rams };
}
export function createWorld({ flockName: fname, home, county }) {
  G.s = {
    v: 1, day: 0, frac: 0, nextId: 1, cash: 10000, home, county: (county || '').replace(/\s*county\s*$/i, '').trim(),
    flocks: [], animals: {}, listings: [], directory: [], tank: [], embryos: [], entries: {}, judges: {}, results: [],
    news: [], toasts: [], ledger: [], topSales: [], sireStats: {}, banners: [], ach: {}, stats: { born: 0, semen: 0 },
    settings: { speed: 1, pauseShows: true, pauseLambing: true }, paused: true, started: false,
  };
  const s = G.s;
  const initials = fname.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'ME';
  s.flocks.push({ id: 'P', name: fname, state: home, type: 'player', skill: 1, rep: 0, banners: 0, prefix: initials, seq: 0, founded: 0 });
  // make sure the home state has competition
  const homeCount = 8 + irnd(0, 4);
  for (let i = 0; i < 150; i++) s.flocks.push(makeFlock(i + 1, i < homeCount ? { state: home } : {}));
  // a handful of national-caliber outfits
  s.flocks.slice(1, 1 + 10).forEach(f => { f.skill = rnd(0.85, 1); f.q = 9 + rnd(0, 4); f.rep = irnd(60, 140); });
  s.nextFlock = 151;
  return s;
}
export function finishSetup(ewes, ram) {
  const s = S();
  [...ewes, ram].forEach(a => { a.owner = 'P'; a.care = defaultCare(); addAnimal(a); });
  for (const f of s.flocks) if (f.id !== 'P') stockFlock(f, true);
  aiCalendar(0, 8, 1); // flocks turn their rams in on Sep 1
  refreshDirectory();
  s.started = true;
  news(`Welcome to ShowLamb! ${s.flocks[0].name} is open for business in ${STATES[s.home]}. Breeding season is here — turn your ram in or line up AI.`, 'good', true);
  news(`${s.flocks.length - 1} other flocks are competing across the country.`, 'info');
}

// ---------- daily simulation ----------
export function simDay() {
  const s = S();
  s.day++;
  const d = s.day; const m = monthOf(d); const dm = dom(d);
  const all = living();
  let feedCost = 0, upkeep = 0;

  for (const a of all) {
    const age = d - a.birth;
    // pregnancy
    if (a.preg) {
      if (a.owner === 'P' && d === a.preg.check) news(a.preg.ok ? `${a.name} checked pregnant (${a.preg.method}${a.preg.donor ? ' embryo' : ''}) — due ${fmtShort(a.preg.due)}.` : `${a.name} came back open from ${a.preg.method}. She can be bred again.`, a.preg.ok ? 'good' : 'bad', true);
      if (!a.preg.ok && d >= a.preg.check) delete a.preg;
      else if (a.preg.ok && d >= a.preg.due) lamb(a);
    }
    // growth
    if (age < 0) continue;
    if (age < 60) {
      const lf = a.litter === 3 ? 0.75 : a.litter === 2 ? 0.86 : 1;
      a.lastAdg = (0.5 + 0.025 * a.bv.WW + 0.03 * (a.damMilk || 0)) * lf * (a.spider === 2 ? 0.5 : 1);
      a.wt += a.lastAdg; a.cond += (2.6 - a.cond) * 0.05;
    } else if (age < 450 && a.sex !== 'R' || age < 300) {
      let eff;
      if (a.owner === 'P') {
        if (a.string) {
          const c = a.care || defaultCare(); const F = FEED_BY_ID[c.feed];
          const need = a.wt * 0.035;
          eff = F.energy * Math.min(1, c.lbs / need) + Math.max(0, c.lbs - need) * 0.05;
          feedCost += c.lbs * F.cost + (c.rinse ? 0.25 : 0);
          a.tone += ((c.ex || 0) * 2 - a.tone) * 0.03;
          a.fit += ((c.rinse ? 88 : 35) - a.fit) * 0.05;
          a.train = clamp(a.train + (c.halter ? 1.6 : -0.25), 0, 100);
          a.cond += ((1.5 + 2.6 * eff + a.bv.FAT * 1.5 - (c.ex || 0) * 0.35 + (a.wt / a.base.frame - 0.85) * 1.5) - a.cond) * 0.04;
        } else { eff = 0.34; a.tone *= 0.98; a.fit += (35 - a.fit) * 0.03; a.train = Math.max(0, a.train - 0.2); a.cond += (2.4 - a.cond) * 0.03; upkeep += 0.15; }
      } else {
        const f = flock(a.owner); const k = f?.skill ?? 0.5;
        eff = a.keep ? 0.5 : (a.wt / a.base.frame > 0.93 ? 0.3 : 0.55 + k * 0.38);
        a.cond += ((2.7 + k * 0.5 + a.bv.FAT) - a.cond) * 0.04;
      }
      a.lastAdg = Math.max(0.05, (0.22 + 0.68 * eff) * (1 + a.bv.PWG / 25) * (a.base.frame / 140) * Math.max(0.08, 1 - Math.max(0, a.wt / a.base.frame - 0.9) * 3)) * (a.spider === 2 ? 0.5 : 1);
      a.wt += a.lastAdg;
    } else {
      const mature = a.base.frame * (a.sex === 'R' ? 1.65 : 1.22);
      a.wt += (mature - a.wt) * 0.004; a.cond += (3 - a.cond) * 0.02; a.lastAdg = 0;
      if (a.owner === 'P') upkeep += 0.25;
    }
    // AI flock management of young rams
    if (age === 60 && a.sex === 'R') {
      if (a.owner === 'P') { if (!a.reg) { a.sex = 'W'; } }
      else if (!a.reg || Math.random() > 0.3) a.sex = 'W';
      else a.keep = true;
    }
  }
  if (feedCost + upkeep > 0) { s.cash -= feedCost + upkeep; s.feedToday = feedCost + upkeep; s.feedMonth = (s.feedMonth || 0) + feedCost + upkeep; }
  if (dm === 1 && s.feedMonth) { s.ledger.unshift({ day: d, n: -Math.round(s.feedMonth), why: 'Feed, bedding & upkeep (last month)' }); s.feedMonth = 0; }

  // shows today
  for (const sh of allShows()) {
    const y = yearOf(d); const sd = dayOf(y, sh.m, sh.d);
    if (sd === d) runShow({ ...sh, day: d, year: y, key: `${sh.id}-${y}` });
    if (s.settings.pauseShows && sd - 3 === d && !s.entries[`${sh.id}-${y}`]) {
      const show = { ...sh, day: sd };
      const elig = myAnimals().filter(a => (!marketEligible(a, show) && a.wt * 1.05 > show.minWt) || (sh.breeding && !breedingEligible(a, show)));
      if (elig.length) { s.paused = true; toast(`Entries for ${sh.name} close in 3 days — you have ${elig.length} eligible.`, 'show'); }
    }
  }

  // AI flock calendar
  aiCalendar(d, m, dm);
  if (dm === 1 || dm === 15) aiListings(); else if (Math.random() < 0.5) aiListings();
  processMarket();
  if (dm === 1 && m === 6) refreshDirectory();
  if (dm === 1) growFlocks();
  if (myAnimals().length >= 50) achieve('flock_50');
  if (s.directory.some(dd => dd.until <= d)) refreshDirectory();
}

function lamb(ewe) {
  const s = S(); const p = ewe.preg; delete ewe.preg;
  const dam = p.donor || ewe;
  const sire = p.sire;
  const F = inbreeding(sire, dam);
  const born = []; let still = 0;
  for (let i = 0; i < p.count; i++) {
    if (Math.random() < 0.035 + F * 1.3 + (p.count === 3 ? 0.07 : 0)) { still++; continue; }
    const a = offspring(dam, sire, ewe.owner, p.donor ? ewe : null);
    a.litter = p.count; addAnimal(a); born.push(a);
    if (s.animals[dam.id]) s.animals[dam.id].prog++;
    if (s.animals[sire.id]) s.animals[sire.id].prog++;
  }
  ewe.lambed = s.day;
  if (ewe.owner === 'P') {
    s.stats.born += born.length;
    if (born.length) achieve('first_lamb');
    if (p.count === 3) achieve('triplets');
    if (p.donor && born.length) achieve('et_lamb');
    const desc = born.map(a => `${a.sex === 'R' ? 'ram' : 'ewe'} lamb ${a.name} (${a.wt.toFixed(1)} lb)`).join(', ');
    news(`${ewe.name} lambed${p.donor ? ` (ET, genetic dam ${dam.name})` : ''}: ${desc || 'no live lambs'}${still ? ` · ${still} stillborn${F > 0.06 ? ` (inbreeding ${(F * 100).toFixed(0)}%)` : ''}` : ''}. Sire: ${sire.name}.`, born.length ? 'good' : 'bad', true);
    if (born.some(a => a.spider === 2)) news(`One of ${ewe.name}'s lambs is showing spider lamb signs — long, crooked legs and poor muscling.`, 'bad', true);
    if (s.settings.pauseLambing) { s.paused = true; toast(`${ewe.name} lambed — ${born.length} live`, 'good'); }
  }
}

function aiCalendar(d, m, dm) {
  const s = S();
  // Aug 1: culling, retention, flock size drift
  if (m === 7 && dm === 1) {
    for (const f of s.flocks) {
      if (f.id === 'P') continue;
      const mine = living().filter(a => a.owner === f.id);
      let ewes = mine.filter(a => a.sex === 'E' && a.keep);
      ewes.filter(a => ageDays(a) > 2400 || Math.random() < 0.08).forEach(a => { removeAnimal(a.id); });
      ewes = ewes.filter(a => s.animals[a.id]);
      f.size = clamp(Math.round(f.size + (f.rep > 40 ? rnd(0, 2) : rnd(-1, 1.4))), 3, 30);
      const need = f.size - ewes.length;
      const cands = mine.filter(a => a.sex === 'E' && !a.keep && ageDays(a) < 330 && !a.listing).sort((x, y) => breedingIndex(y) - breedingIndex(x));
      cands.slice(0, Math.max(0, need)).forEach(a => a.keep = true);
      // rams: keep the best two, buy outside if none
      const rams = mine.filter(a => a.sex === 'R' && s.animals[a.id]).sort((x, y) => breedingIndex(y) - breedingIndex(x));
      rams.forEach((r, i) => { if (i >= 3 || ageDays(r) > 2000) removeAnimal(r.id); });
      if (!living().some(a => a.owner === f.id && a.sex === 'R' && ageDays(a) > 200)) {
        const breed = f.type === 'club' ? pick(['Hampshire', 'Suffolk', 'Southdown', 'Crossbred']) : f.breed;
        addAnimal(makeFounder({ breed, sex: 'R', ageDays: irnd(300, 700), owner: f.id, q: f.q + 1, comp: 'Hampshire × Suffolk', face: 'black', keep: true }));
      }
      f.q += 0.15; // flocks slowly improve
    }
  }
  // breeding: Sep 1 (spring lambing) / Mar 20 (fall lambing flocks), retries a month later
  const fallDay = m === 2 && dm === 20, fallRe = m === 3 && dm === 25;
  const sprDay = m === 8 && dm === 1, sprRe = m === 9 && dm === 5;
  if (sprDay || sprRe || fallDay || fallRe) {
    for (const f of s.flocks) {
      if (f.id === 'P') continue;
      if ((fallDay || fallRe) !== f.fall) continue;
      const mine = living().filter(a => a.owner === f.id);
      const rams = mine.filter(a => a.sex === 'R' && ageDays(a) > 200).sort((x, y) => breedingIndex(y) - breedingIndex(x));
      const ewes = mine.filter(a => a.sex === 'E' && a.keep && canBreed(a));
      if (!ewes.length) continue;
      let useAI = Math.random() < 0.25 + f.skill * 0.4;
      let dir = null;
      if (useAI && s.directory.length) {
        const opts = s.directory.filter(x => x.owner !== f.id && (f.type === 'club' || x.snap.breed === f.breed));
        if (opts.length) dir = opts.map(x => ({ x, sc: breedingIndex(x.snap) - x.price / 25 + randn() * 3 })).sort((a, b) => b.sc - a.sc)[0].x;
      }
      ewes.forEach((e, i) => {
        if (dir && i < irnd(1, 5)) {
          settle(e, dir.snap, 'AI');
          dir.sold++;
          if (dir.owner === 'P') { addCash(dir.price, `Semen sale — ${dir.snap.name} to ${f.name}`); s.stats.semen++; if (s.stats.semen >= 10) achieve('semen_10'); news(`${f.name} bought a straw of ${dir.snap.name} for ${money(dir.price)}.`, 'good', true); }
        } else if (rams.length) {
          const r = rams.find(r => inbreeding(snapshot(r), e) < 0.06) || rams[0];
          settle(e, snapshot(r), 'Natural');
        }
      });
    }
  }
  // AI ram lamb sales to the packer & lamb turnover after the show season
  if (dm === 10) {
    for (const a of living()) {
      if (a.owner === 'P' || a.listing) continue;
      const age = ageDays(a);
      if (!a.keep && age > 420) removeAnimal(a.id);
      else if (a.sex === 'W' && age > 400) removeAnimal(a.id);
    }
  }
}

function growFlocks() {
  const s = S();
  const n = s.flocks.length - 1;
  if (n >= 450) return;
  const add = irnd(1, 3);
  for (let i = 0; i < add; i++) {
    const f = makeFlock(s.nextFlock++, { skill: Math.pow(Math.random(), 1.8) * 0.7, size: irnd(3, 6) });
    f.rep = 0; f.q -= 1;
    s.flocks.push(f); stockFlock(f, false);
    news(`New flock: ${f.name} (${STATES[f.state]}) started up${f.type === 'breed' ? ` with ${f.breed}s` : ' raising club lambs'}.`, 'info');
  }
}

export function tickClock(realSeconds) {
  const s = S(); if (!s || s.paused || !s.started) return 0;
  const sp = s.settings.speed;
  s.frac += realSeconds * sp / 2880; // 1x = 1 game day per 48 real minutes (1 real day = 1 game month)
  let n = 0;
  while (s.frac >= 1 && n < 6 && !s.paused) { s.frac -= 1; simDay(); n++; }
  if (n >= 6) s.frac = Math.min(s.frac, 1);
  return n;
}
export function advance(days) {
  const s = S(); let n = 0; s.paused = false;
  while (n < days) { simDay(); n++; if (s.paused) break; }
  s.paused = true; s.frac = 0;
  return n;
}
export { S as state };
