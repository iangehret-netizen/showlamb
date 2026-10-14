// ShowLamb — simulation engine
import {
  TRAITS, EPDS, BREEDS, REG_BREEDS, FEED_BY_ID, STATES, STATE_WEIGHT,
  NATIONAL_SHOWS, homeShows, TIER, MARKET_CLASSES, BREED_CHECK, STATE_LL, SHOW_STATE, WT_BREEDS, baseBreed, NEIGHBORS, RR_FREQ, DWARF_FREQ, JACKPOT_WORDS, JACKPOT_PLACES, PLACE_WORDS, JUDGE_STYLES, SURNAMES, FLOCK_SUFFIX, LAMB_NAMES, RAM_NAMES, EWE_NAMES, SHOW_NAMES, ACHIEVEMENTS,
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
let _fm = null, _fmS = null, _fmN = -1;
export const flock = id => { const s = S(); if (_fmS !== s || _fmN !== s.flocks.length) { _fm = new Map(s.flocks.map(f => [f.id, f])); _fmS = s; _fmN = s.flocks.length; } return _fm.get(id); };
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
export const breedLabel = a => a.breed === 'Crossbred' ? (a.blk === 2 ? 'Natural (club)' : `${clubType(a)} cross`) : a.breed === 'Commercial' ? 'Commercial' : (a.blk === 2 && a.breed !== 'Natural Colored' ? `${a.breed} (black)` : a.breed);
let _lv = null, _lvS = null, _lvV = -1, _ver = 0;
export const bumpAnimals = () => { _ver++; };
export const living = () => { const s = S(); if (_lvS !== s || _lvV !== _ver) { _lv = Object.values(s.animals); _lvS = s; _lvV = _ver; } return _lv; };
export const myAnimals = () => living().filter(a => a.owner === 'P');
function byOwner() { const m = new Map(); for (const a of living()) { let l = m.get(a.owner); if (!l) m.set(a.owner, l = []); l.push(a); } return m; }
const emit = () => G.listeners.forEach(f => f());

export function news(text, kind = 'info', mine = false) {
  const s = S();
  s.news.unshift({ day: s.day, text, kind, mine });
  if (s.news.length > 250) s.news.length = 250;
}
export function toast(text, kind = 'info') { S().toasts.push({ text, kind }); }
function addCash(n, why) { const s = S(); if (!Number.isFinite(n)) return; s.cash += n; s.ledger.unshift({ day: s.day, n: Math.round(n), why }); if (s.ledger.length > 200) s.ledger.length = 200; }

// ---------- breed bases ----------
function breedBase(breed) {
  const b = BREEDS[breed]; const base = {};
  TRAITS.forEach((t, i) => base[t] = 50 + (b.t[i] || 0));
  base.breed = 50 + (b.reg !== false ? 8 : breed.startsWith('Wether-Type') ? 2 : -6);
  base.frame = b.frame; base.prol = b.prolific;
  return base;
}
function avgBase(b1, b2, het) {
  const o = {};
  for (const k of Object.keys(b1)) o[k] = (b1[k] + b2[k]) / 2;
  if (het) { TRAITS.forEach(t => o[t] += 1.5); o.prol += 0.1; o.breed -= 10; }
  return o;
}
export const isFaceDark = f => f === 'black' || f === 'brown';

// ---------- genetics ----------
// Dwarf gene: FF = taller, a bit less muscle, slower, sound; FD = the ideal blend, flexible weight; DD = fast early, maxes ~100–110 lb, poor structure
export const DWARF_LABEL = ['FF (clean)', 'FD (carrier)', 'DD (dwarf)'];
export function frameOf(a) { const dw = a.dwarf || 0; return dw === 2 ? Math.min(a.base.frame, 108) : a.base.frame + (dw === 0 && !a.base.noFF ? 6 : 0); }
const growthFx = a => (a.dwarf === 2 ? 1.15 : a.dwarf === 1 ? 1 : 0.95);
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
export const FRESH_PEAK = [2.7, 3.3];
export function phen(a, t) {
  let v = (a.base[t] ?? 50) + (a.bv[t] || 0) + (a.pe?.[t] || 0);
  if (t === 'fresh') {
    const c = a.cond ?? 3; const age = S() ? ageDays(a) : 200;
    if (c > FRESH_PEAK[1]) v -= (c - FRESH_PEAK[1]) * 12; else if (c < FRESH_PEAK[0]) v -= (FRESH_PEAK[0] - c) * 7;
    if (age > 300 && age < 800) v -= (age - 300) * 0.06;
    v -= (a.load || 0) * 3;
  }
  if (a.lateW) { if (t === 'look') v -= 4; if (t === 'balance') v -= 2; if (t === 'fresh') v -= 2; }
  if (t === 'muscle') v += (a.bv.LMD || 0) * 4 + (a.tone || 0);
  if (t === 'look') v += ((a.fit ?? 55) - 55) * 0.1;
  if (t === 'dimension') v += ((a.cond ?? 3) - 3) * 2;
  if (a.spider === 2) v -= 18;
  const dw = a.dwarf || 0;
  if (dw === 0) { if (t === 'muscle') v -= 2; if (t === 'structure') v += 3; }
  else if (dw === 1) { if (t === 'muscle') v += 3; if (t === 'dimension') v += 2; }
  else { if (t === 'structure') v -= 15; if (t === 'balance') v -= 5; }
  const age = S() ? ageDays(a) : 200;
  if (age < 45) v -= (45 - age) * 0.15; // babies don't express it yet
  return clamp(v, 1, 99);
}
export const traitScores = a => Object.fromEntries(TRAITS.map(t => [t, Math.round(phen(a, t))]));
const MKT_W = JUDGE_STYLES[3].w;

// ---------- color & type genetics ----------
// Face locus alleles: B black, N brown, W white. Body: blk = copies of recessive black (2 = natural, all black).
const BREED_FG = { black: 'BB', brown: 'NN', white: 'WW', colored: 'NN' };
export const BLK_FREQ = { Crossbred: 0.2, Commercial: 0.05, 'Natural Colored': 1 };
function blkFreq(breed) { if (breed in BLK_FREQ) return BLK_FREQ[breed]; if (breed.startsWith('Wether-Type')) return 0.1; return ['black', 'brown'].includes(BREEDS[breed]?.face) ? 0.03 : 0.01; }
export function faceFromGenes(fg, r = Math.random()) {
  const g = [...fg].sort().join('');
  if (g === 'BB' || g === 'BN') return 'black';
  if (g === 'NN') return 'brown';
  if (g === 'BW') return r < 0.55 ? 'speckle' : 'smut';
  if (g === 'NW') return 'smut';
  return 'white';
}
export const isNatural = a => a && a.blk === 2;
export function bloodOf(breed, comp) {
  if (breed === 'Crossbred') { const [x, y] = (comp || 'Hampshire × Suffolk').split(' × ').map(b => b in BREEDS ? baseBreed(b) : 'Club'); const o = {}; o[x] = (o[x] || 0) + 0.5; o[y] = (o[y] || 0) + 0.5; return o; }
  return { [baseBreed(breed)]: 1 };
}
const mixBlood = (a, b) => { const o = {}; for (const [k, v] of Object.entries(a || {})) o[k] = (o[k] || 0) + v / 2; for (const [k, v] of Object.entries(b || {})) o[k] = (o[k] || 0) + v / 2; return o; };
export function clubType(a) {
  if (isNatural(a)) return 'Natural';
  return { black: 'Blackface', brown: 'Blackface', white: 'Whiteface', speckle: 'Speckleface', smut: 'Smutface' }[a.face] || 'Blackface';
}
// Breed check at weigh-in: club lambs class by characteristics, not papers
export function marketClassFor(a) {
  if (isNatural(a)) return 'Natural';
  const pure = BREEDS[a.breed]?.reg !== false && a.breed !== 'Commercial';
  if (pure) { const b = a.breed === 'White Dorper' ? 'Dorper' : a.breed; return MARKET_CLASSES.includes(b) ? b : 'AOB'; }
  let best = null, bestV = 0;
  for (const [cls, faces] of Object.entries(BREED_CHECK)) {
    if (!faces.includes(a.face)) continue;
    const share = a.blood?.[cls] || 0;
    const chance = clamp((share - 0.45) / 0.4, 0, 1);
    if ((a.chk ?? 0.5) < chance && share > bestV) { best = cls; bestV = share; }
  }
  if (best) return best;
  return a.face === 'white' ? 'Whiteface Cross' : 'Blackface Cross';
}
// Cross planner: face/natural odds and expected trait ranges for a mating
export function crossPlan(dam, sire) {
  const faces = {};
  const fd = dam.fg || BREED_FG[dam.face] || 'BB', fs = sire.fg || BREED_FG[sire.face] || 'BB';
  for (const x of fd) for (const y of fs) {
    const g = [x, y].sort().join('');
    if (g === 'BW') { faces.speckle = (faces.speckle || 0) + 0.25 * 0.55; faces.smut = (faces.smut || 0) + 0.25 * 0.45; }
    else { const f = faceFromGenes(g); faces[f] = (faces[f] || 0) + 0.25; }
  }
  const known = a => a.blk === 2 ? 2 : a.provenBlack ? 1 : null;
  const kd = known(dam), ks = known(sire);
  let natural = null;
  if (kd != null && ks != null) natural = (kd === 2 ? 1 : 0.5) * (ks === 2 ? 1 : 0.5);
  else if (kd === 0 || ks === 0) natural = 0;
  const same = dam.breed === sire.breed;
  const traits = {};
  for (const t of TRAITS) { const mid = (phen(dam, t) + phen(sire, t)) / 2 + (!same && t !== 'breed' ? 1.5 : 0) - (!same && t === 'breed' ? 8 : 0); traits[t] = [Math.round(clamp(mid - 9, 1, 99)), Math.round(clamp(mid + 9, 1, 99))]; }
  return { faces, natural, traits, cross: !same || dam.breed === 'Crossbred' };
}
export function marketIndex(a) { let v = 0; for (const t of TRAITS) v += MKT_W[t] * phen(a, t); return v; }
export function breedingIndex(a) {
  let v = 0; const w = { structure: .22, balance: .2, bone: .14, look: .16, muscle: .16, dimension: .12 };
  for (const t of TRAITS) v += w[t] * phen(a, t);
  return v;
}

function pedNode(x, depth) {
  if (!x) return null;
  const n = { n: x.name, b: breedLabel(x) };
  if (depth > 0) {
    n.s = x.ped?.s ? trimPed(x.ped.s, depth - 1) : (x.sireName && x.sireName !== 'Unrecorded' ? { n: x.sireName } : null);
    n.d = x.ped?.d ? trimPed(x.ped.d, depth - 1) : (x.damName && x.damName !== 'Unrecorded' ? { n: x.damName } : null);
  }
  return n;
}
function trimPed(p, depth) { if (!p) return null; const n = { n: p.n, b: p.b }; if (depth > 0) { n.s = trimPed(p.s, depth - 1); n.d = trimPed(p.d, depth - 1); } return n; }
// founders come with a believable (made-up) pedigree from other programs
function fakePed(breed, depth) {
  const lbl = breed === 'Crossbred' ? 'Club' : breed;
  const node = (sex, d) => {
    const n = { n: sex === 'R' ? 'Starter Buck' : 'Starter Ewe', b: lbl };
    if (d > 1) { n.s = node('R', d - 1); n.d = node('E', d - 1); }
    return n;
  };
  return { s: node('R', depth), d: node('E', depth) };
}
export function snapshot(a) {
  return { fg: a.fg, blk: a.blk, blood: a.blood, provenBlack: a.provenBlack, ped: a.ped, sireName: a.sireName, damName: a.damName, id: a.id, name: a.name, breed: a.breed, comp: a.comp, face: a.face, reg: a.reg, base: { ...a.base }, bv: { ...a.bv }, spider: a.spider, dwarf: a.dwarf || 0, scr: a.scr, anc: a.anc, owner: a.owner, ownerName: flockName(a.owner), sex: a.sex, prog: a.prog, err: { ...a.err }, tested: { ...a.tested } };
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
    id: uid('a'), owner, breed, comp: comp || breed, face: face || br.face, reg: br.reg !== false && sex !== 'W',
    sex, birth: s.day - age, base, bv: newBV(q), pe: newPE(), err: newErr(), prog: 0, F: 0, anc: [],
    spider: Math.random() < br.spider ? 1 : 0, dwarf: (Math.random() < (DWARF_FREQ[breed] || 0) ? 1 : 0) + (Math.random() < (DWARF_FREQ[breed] || 0) ? 1 : 0),
    scr: (Math.random() < (RR_FREQ[breed] ?? 0.5) ? 'R' : 'Q') + (Math.random() < (RR_FREQ[breed] ?? 0.5) ? 'R' : 'Q'),
    tested: {}, record: [], cond: 3, fit: 50, train: 40, tone: 0, keep,
    sireName: 'Unrecorded', damName: 'Unrecorded',
  };
  if (a.scr === 'QR') a.scr = 'RQ';
  a.fg = breed === 'Crossbred' ? (a.face === 'white' ? 'WW' : Math.random() < 0.85 ? 'BB' : 'BW') : breed === 'Commercial' ? (Math.random() < 0.9 ? 'WW' : 'BW') : (BREED_FG[br.face] || 'WW');
  if (breed === 'Crossbred' || breed === 'Commercial') a.face = faceFromGenes(a.fg);
  const bf = blkFreq(breed); a.blk = bf >= 1 ? 2 : (Math.random() < bf ? 1 : 0) + (Math.random() < bf * 0.15 ? 1 : 0);
  if (a.blk === 2 && BREEDS[breed]?.reg !== false && breed !== 'Natural Colored') a.blk = 1;
  a.blood = bloodOf(breed, comp); a.chk = Math.random();
  if (owner !== 'LOCAL') { a.ped = fakePed(a.breed, 3); a.sireName = a.ped.s.n; a.damName = a.ped.d.n; }
  a.wt = weightForAge(age, frameOf(a), sex) * (1 + a.bv.PWG / 60);
  a.tag = owner === 'LOCAL' ? '' : nextTag(f); a.name = owner === 'LOCAL' ? animalName(f, sex) : a.tag; a.named = owner === 'LOCAL';
  return a;
}
const addAnimal = a => { S().animals[a.id] = a; _ver++; return a; };
function removeAnimal(id) { delete S().animals[id]; _ver++; }

function offspring(dam, sire, owner, recipient) {
  const s = S(); const f = flock(owner);
  const wtPair = dam.breed !== sire.breed && baseBreed(dam.breed) === baseBreed(sire.breed) && (dam.breed.startsWith('Wether-Type') || sire.breed.startsWith('Wether-Type'));
  const same = dam.breed === sire.breed || wtPair;
  let breed, comp, face, base, reg;
  if (same) {
    breed = wtPair ? (dam.breed.startsWith('Wether-Type') ? dam.breed : sire.breed) : dam.breed; comp = wtPair ? breed : (dam.comp || breed); base = dam.breed === 'Crossbred' ? avgBase(dam.base, sire.base, false) : breedBase(breed);
    reg = !wtPair && dam.reg && sire.reg && BREEDS[breed].reg !== false; face = breed === 'Crossbred' ? (isFaceDark(dam.face) || isFaceDark(sire.face) ? 'black' : 'white') : BREEDS[breed].face;
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
  const fgOf = x => x.fg || BREED_FG[x.face] || 'BB';
  const fg = fgOf(dam)[Math.random() < 0.5 ? 0 : 1] + fgOf(sire)[Math.random() < 0.5 ? 0 : 1];
  const blk = al(dam.blk || 0) + al(sire.blk || 0);
  const scrAl = g => g[Math.random() < 0.5 ? 0 : 1];
  let scr = scrAl(dam.scr) + scrAl(sire.scr); if (scr === 'QR') scr = 'RQ';
  const anc = [[sire.id, 1], [dam.id, 1]];
  (sire.anc || []).forEach(([id, g]) => g < 3 && anc.push([id, g + 1]));
  (dam.anc || []).forEach(([id, g]) => g < 3 && anc.push([id, g + 1]));
  const a = {
    id: uid('a'), owner, breed, comp, face, reg: reg && owner !== 'P', regOk: reg, sex: Math.random() < 0.5 ? 'R' : 'E', birth: s.day,
    base, bv, pe: newPE(), err: newErr(), prog: 0, F, anc,
    spider: al(dam.spider) + al(sire.spider), dwarf: al(dam.dwarf || 0) + al(sire.dwarf || 0), scr, tested: {}, record: [], cond: 2.5, fit: 50, train: 20, tone: 0,
    sire: sire.id, dam: dam.id, sireName: sire.name, damName: dam.name, ped: { s: pedNode(sire, 2), d: pedNode(dam, 2) }, sireOwner: sire.ownerName || flockName(sire.owner),
    damMilk: (recipient || dam).bv.MILK, et: !!recipient, recipName: recipient?.name,
    fg, blk, blood: mixBlood(dam.blood || bloodOf(dam.breed, dam.comp), sire.blood || bloodOf(sire.breed, sire.comp)), chk: Math.random(),
  };
  if (breed === 'Crossbred' || breed === 'Commercial') a.face = faceFromGenes(fg);
  if (blk === 2) {
    if (breed !== 'Natural Colored') { a.reg = false; a.regOk = false; }
    for (const p of [dam, sire]) { const live = s.animals[p.id]; if (live && live.blk !== 2) live.provenBlack = true; }
  }
  a.wt = Math.max(5, 9 + a.bv.BW * 1.2 + randn() * 0.8);
  a.tag = nextTag(f); a.name = a.tag; a.named = false;
  return a;
}

function litterSize(ewe) {
  const age = ageDays(ewe);
  const f = clamp(ewe.base.prol - 1.6 + ewe.bv.NLB / 40 + (age < 600 ? -0.25 : age > 2190 ? -0.08 - (age - 2190) / 1460 * 0.3 : 0.03), -0.5, 0.5);
  const p1 = clamp(0.09 - f * 0.12, 0.02, 0.25), p3 = clamp(0.10 + f * 0.12, 0.03, 0.2), p4 = clamp(0.01 + f * 0.02, 0, 0.03);
  const r = Math.random();
  return r < p1 ? 1 : r < p1 + p3 ? 3 : r < p1 + p3 + p4 ? 4 : 2;
}
const OUT_SEASON_OK = ['Dorset', 'Horned Dorset', 'Dorset Advantage', 'Katahdin', 'Dorper', 'White Dorper', 'Merino', 'Rambouillet'];
export function conceptionRate(ewe, method) {
  const m = monthOf(S().day);
  let season = (m >= 7 && m <= 11) ? 1 : (m <= 1 ? 0.75 : 0.45);
  if (season < 1 && OUT_SEASON_OK.includes(ewe.breed)) season = Math.max(season, 0.85);
  if (ewe.synced) season = 1; // CIDR + PG600 brings her into heat even out of season
  const base = method === 'AI' ? 0.68 : method === 'ET' ? 0.6 : 0.93;
  const age = ageDays(ewe);
  const old = age > 2190 ? Math.max(0.5, 1 - (age - 2190) / 1460 * 0.5) : 1;
  return Math.min(0.98, base * season * old * (age < 240 ? 0 : age < 330 ? 0.8 : 1) * (ewe.synced ? 1.25 : 1));
}
export const SYNC_COST = 25;
export function syncEwes(ids) {
  const s = S(); const list = ids.map(id => s.animals[id]).filter(e => e && e.owner === 'P' && canBreed(e) && !e.synced);
  if (!list.length) return 'No open ewes to synchronize.';
  const cost = list.length * SYNC_COST;
  if (s.cash < cost) return `Syncing ${list.length} ewes costs ${money(cost)}.`;
  addCash(-cost, `Synchronized ${list.length} ewe${list.length > 1 ? 's' : ''} (CIDR + PG600)`);
  list.forEach(e => e.synced = true);
  return null;
}
// Bulk breed: src = { ramId } | { tankIdx } | { embId }. Breeds as many as straws/embryos allow.
export function bulkBreed(ids, method, src) {
  const s = S(); const done = [], left = [];
  let tankSnap = method === 'AI' ? s.tank[src.tankIdx]?.snap : null;
  for (const id of ids) {
    const e = s.animals[id]; if (!e || !canBreed(e)) continue;
    let err;
    if (method === 'Natural') err = breedNatural(id, src.ramId);
    else if (method === 'AI') { const i = s.tank.findIndex(t => t.snap === tankSnap); err = i < 0 ? 'Out of straws.' : breedAI(id, i); }
    else err = implant(src.embId, id, src.n || 1);
    (err ? left : done).push({ name: e.name, err });
  }
  return { done, left };
}
export const canBreed = e => e.sex === 'E' && !e.preg && ageDays(e) >= 240 && !e.listing;

// sireRef: a living ram, or a snapshot (semen)
function settle(ewe, sireSnap, method, donor) {
  const s = S();
  const ok = Math.random() < conceptionRate(ewe, method);
  delete ewe.synced;
  ewe.preg = { sire: sireSnap, method, bredDay: s.day, check: s.day + 30, ok, due: s.day + GESTATION + irnd(-3, 3), donor: donor || null, count: ok ? (donor ? 1 : litterSize(ewe)) : 0 };
}

// ---------- player actions: breeding ----------
export const ramCap = r => ageDays(r) < 365 ? 25 : 50;
export const ramUsed = r => (r.svc || []).filter(d => S().day - d < 75).length;
export function breedNatural(eweId, ramId) {
  const s = S(); const ewe = s.animals[eweId]; const ram = s.animals[ramId];
  if (!canBreed(ewe)) return 'Ewe is not available to breed.';
  if (!ram || ram.sex !== 'R' || ageDays(ram) < 200) return 'That ram is not old enough.';
  if (!usableRams().includes(ram)) return `${ram.name} isn’t available right now.`;
  const cap = ramCap(ram); const used = ramUsed(ram);
  if (used >= cap) return `${ram.name} has covered ${used} ewes this season — his limit is ${cap}.`;
  (ram.svc = (ram.svc || []).filter(d => s.day - d < 75)).push(s.day);
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
  if (n > 0) storeEmbryos({ id: uid('e'), dam: snapshot(d), sire: snap, count: n, day: s.day });
  news(`Flushed ${d.name} to ${snap.name}: ${n} transferable embryo${n === 1 ? '' : 's'}.`, n ? 'good' : 'bad', true);
  return null;
}
export function implant(embId, recipId, n = 1) {
  const s = S(); const e = s.embryos.find(x => x.id === embId); const r = s.animals[recipId];
  n = Math.min(2, Math.max(1, n));
  if (!e || e.count < 1) return 'No embryos.';
  if (e.count < n) n = e.count;
  if (!canBreed(r)) return 'Recipient is not available.';
  if (s.cash < 175 * n) return `Transfer costs ${money(175 * n)}.`;
  addCash(-175 * n, `Embryo transfer (${n}) into ${r.name}`);
  e.count -= n; if (e.count <= 0) s.embryos = s.embryos.filter(x => x !== e);
  const p = conceptionRate(r, 'ET');
  let took = 0; for (let i = 0; i < n; i++) if (Math.random() < p) took++;
  delete r.synced;
  r.preg = { sire: e.sire, method: 'ET', bredDay: s.day, check: s.day + 30, ok: took > 0, due: s.day + GESTATION + irnd(-3, 3), donor: e.dam, count: took, embryos: n };
  return null;
}

// ---------- care ----------
export function setCare(id, care) { const a = S().animals[id]; a.care = { ...(a.care || defaultCare()), ...care }; }
export const defaultCare = () => ({ feed: 'developer', lbs: 3, ex: 1, rinse: true, halter: true });
export function toggleString(id) { const a = S().animals[id]; a.string = !a.string; if (a.string && !a.care) a.care = defaultCare(); }
export const REG_FEE = 10;
// embryos from the same mating (dam × sire) are stored as one group with a count
const embKey = e => `${e.dam?.id || e.dam?.name}|${e.sire?.id || e.sire?.name}`;
export function storeEmbryos(e) {
  const s = S(); const k = embKey(e); const grp = s.embryos.find(x => embKey(x) === k);
  if (grp) { grp.count += e.count; grp.day = Math.max(grp.day || 0, e.day || 0); } else s.embryos.push({ ...e });
}
export function mergeEmbryos() { const s = S(); const old = s.embryos || []; s.embryos = []; old.forEach(storeEmbryos); }
export function register(id) {
  const s = S(); const a = s.animals[id];
  if (a.reg) return 'Already registered.';
  if (!a.regOk) return 'Only purebred lambs out of two registered parents of the same breed can be registered.';
  if (a.sex === 'W') return 'Wethers can’t be registered.';
  if (s.cash < REG_FEE) return 'Not enough cash.';
  addCash(-REG_FEE, `Registration — ${a.name}`); a.reg = true;
  return null;
}
export function wether(id) { const a = S().animals[id]; if (a && a.sex === 'R') { a.sex = 'W'; a.reg = false; if (ageDays(a) > 90) a.lateW = true; } }
// ---------- pens ----------
export const PEN_COST = 150, PEN_CAP = 20;
export const pens = () => { const s = S(); if (!s.pens) s.pens = [{ id: 'main', name: 'Main pen', cap: 0 }]; if (!s.pens.some(p => p.id === 'creep')) s.pens.unshift({ id: 'creep', name: 'Creep pen', cap: 0, creep: true }); return s.pens; };
export function setPenCare(penId, care, addString) {
  for (const a of myAnimals()) if (penOf(a) === penId && ageDays(a) < 450) { a.care = { ...(a.care || defaultCare()), ...care }; if (addString) a.string = true; }
}
// bulk actions for a set of your animals
export function bulkAct(ids, act, arg) {
  const s = S(); const list = ids.map(id => s.animals[id]).filter(a => a && a.owner === 'P');
  if (!list.length) return 'Pick at least one.';
  if (act === 'move') { const room = penRoom(arg); if (list.length > room) return `That pen only has room for ${room} more.`; list.forEach(a => a.pen = arg); return null; }
  if (act === 'wether') { list.forEach(a => wether(a.id)); return null; }
  if (act === 'string') { list.forEach(a => { a.string = arg; if (arg && !a.care) a.care = defaultCare(); }); return null; }
  if (act === 'shear') return shear(ids);
  if (act === 'test') { const todo = list.filter(a => !a.tested[arg]); const c = (arg === 'scrapie' ? 30 : 35) * todo.length; if (s.cash < c) return 'Not enough cash.'; todo.forEach(a => testAnimal(a.id, arg)); return null; }
  return 'Unknown action.';
}
export const penOf = a => (a.pen && pens().some(p => p.id === a.pen)) ? a.pen : 'main';
export const penCount = id => myAnimals().filter(a => penOf(a) === id).length;
export const penRoom = id => { const p = pens().find(x => x.id === id); return !p || !p.cap ? Infinity : p.cap - penCount(id); };
export function buildPen(name) {
  const s = S(); if (s.cash < PEN_COST) return `A new pen costs ${money(PEN_COST)}.`;
  addCash(-PEN_COST, `Built pen — ${name || 'New pen'}`);
  pens().push({ id: uid('p'), name: (name || `Pen ${pens().length + 1}`).slice(0, 24), cap: PEN_CAP });
  return null;
}
export function reorderPens(ids) { const ps = pens(); const m = new Map(ps.map(p => [p.id, p])); const out = ids.map(id => m.get(id)).filter(Boolean); ps.forEach(p => { if (!out.includes(p)) out.push(p); }); S().pens = out; }
export function renamePen(id, name) { const p = pens().find(x => x.id === id); if (p && name.trim()) p.name = name.trim().slice(0, 24); }
export function movePen(aid, penId) {
  const a = S().animals[aid]; if (!a) return 'Not found.';
  if (penOf(a) === penId) return null;
  if (penRoom(penId) <= 0) return `That pen is full (${PEN_CAP} head max).`;
  a.pen = penId; return null;
}
export function setTag(id, tag) { const a = S().animals[id]; if (a && tag.trim()) { a.tag = tag.trim().slice(0, 16); if (a.named === false) a.name = a.tag; } }
// Starter customization. mode: 'real' (bottom–top 1% of the breed) or 'max' (up to 100% of sheep potential)
export function customRange(a, key, mode) {
  const e = EPDS.find(x => x.k === key);
  if (e) { const k = mode === 'max' ? 4 : 2.33; return [-k * e.sd, k * e.sd, e.sd / 20]; }
  const b = a.base[key];
  return mode === 'max' ? [1, 99, 1] : [Math.max(1, Math.round(b - 20)), Math.min(92, Math.round(b + 30)), 1];
}
export function setCustomEPD(a, key, v) { a.bv[key] = v; if (a.err) a.err[key] = 0; }
export function setCustomTrait(a, t, target) { const cur = phen(a, t); a.bv[t] += target - cur; if (a.pe) a.pe[t] = a.pe[t] || 0; }
export function rename(id, name) { const a = S().animals[id]; const n = name.trim().slice(0, 30); if (n && n !== a.tag) { a.name = n; a.named = true; } else { a.name = a.tag; a.named = false; } }
export function testAnimal(id, kind) {
  const s = S(); const a = s.animals[id]; const cost = kind === 'scrapie' ? 30 : 35;
  if (a.tested[kind]) return 'Already tested.';
  if (s.cash < cost) return 'Not enough cash.';
  addCash(-cost, `${{ spider: 'Spider', dwarf: 'Dwarf', scrapie: 'Scrapie codon 171' }[kind]} test — ${a.name}`);
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
  if (a.tested.dwarf && a.dwarf === 2) v = Math.min(v, Math.max(packerPrice(a) * 1.3, v * 0.35));
  if (a.tested.scrapie && a.scr === 'QQ') v *= 0.8;
  v *= (1 + (a.record?.filter(r => r.banner).length || 0) * 0.08);
  const sb = S().sireStats?.[a.sire]?.banners || 0, db = S().damStats?.[a.dam]?.banners || 0;
  v *= 1 + Math.min(0.5, sb * 0.03) + Math.min(0.3, db * 0.05); // proven sires and dams
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
// Group sale: each picked lamb becomes its own timed auction, same opening bid, all close together
export function listGroup(ids, price, days) {
  let n = 0; const errs = [];
  for (const id of ids) { const err = listAnimal(id, 'auction', price, days); if (err) errs.push(`${S().animals[id]?.name}: ${err}`); else n++; }
  return { n, errs };
}
// Private treaty — make an offer on any animal on another farm
export function privateOffer(aid, amount) {
  const s = S(); const a = s.animals[aid];
  if (!a || a.owner === 'P' || a.owner === 'LOCAL') return { err: 'Not available.' };
  if (a.listing) return { err: 'This one is already on the market — bid or buy it there.' };
  if (a.leasedTo || (a.away && a.away > s.day)) return { err: 'He’s out on lease right now.' };
  amount = Math.round(amount);
  if (amount > s.cash) return { err: 'You don’t have that much cash.' };
  s.offers = s.offers || {};
  const prev = s.offers[aid];
  const ask = prev?.ask || Math.round(fairValue(a) * repMult(a.owner) * (a.keep || (a.record || []).some(r => r.banner) ? rnd(1.35, 1.7) : rnd(1.05, 1.3)) / 25) * 25;
  if (amount >= ask) { privateSale(a, amount); delete s.offers[aid]; return { result: 'accepted', price: amount }; }
  if (amount >= ask * 0.6) { s.offers[aid] = { ask, counter: ask, until: s.day + 7 }; return { result: 'counter', price: ask }; }
  s.offers[aid] = { ask, until: s.day + 7 };
  return { result: 'declined' };
}
export function acceptCounter(aid) {
  const s = S(); const o = s.offers?.[aid]; const a = s.animals[aid];
  if (!o || !o.counter || o.until < s.day || !a || a.owner === 'P') return 'That counter-offer has expired.';
  if (s.cash < o.counter) return 'Not enough cash.';
  privateSale(a, o.counter); delete s.offers[aid]; return null;
}
function privateSale(a, price) {
  const s = S(); const seller = a.owner;
  addCash(-price, `Private treaty — ${a.name} from ${flockName(seller)}`);
  a.owner = 'P'; a.keep = false; a.string = false; a.pen = 'main'; a.care = a.care || defaultCare();
  if (a.preg && !a.preg.ok && s.day >= a.preg.check) delete a.preg;
  s.directory = s.directory.filter(d => d.ramId !== a.id || d.owner === 'P');
  recordSale({ name: a.name, breed: breedLabel(a), type: sexText(a), price, seller: flockName(seller), buyer: s.flocks[0].name, day: s.day, mine: true });
  news(`Private treaty: you bought ${a.name} (${breedLabel(a)} ${sexText(a).toLowerCase()}) from ${flockName(seller)} for ${money(price)}.`, 'good', true);
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
  if (L.kind === 'embryo' && L.seller === 'P') storeEmbryos(L.emb);
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
    if (buyer === 'P') { a.care = a.care || defaultCare(); a.pen = 'main'; }
    label = `${a.name} (${breedLabel(a)} ${sexText(a).toLowerCase()})`;
    recordSale({ name: a.name, breed: breedLabel(a), type: sexText(a), price, seller: sellerName, buyer: buyerName, day: s.day, mine: L.seller === 'P' || buyer === 'P' });
  } else {
    if (buyer === 'P') storeEmbryos(L.emb);
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
        else if (L.seller === 'P') { storeEmbryos(L.emb); news('Your embryo listing expired unsold.', 'bad', true); }
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
    if (L.seller === 'P') { if (L.kind === 'embryo') storeEmbryos(L.emb); news(`No sale: ${L.kind === 'animal' ? s.animals[L.aid].name : 'embryo lot'} didn’t reach the opening bid.`, 'bad', true); }
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

// market categories
export function listCategory(a) {
  if (a.sex === 'W') return 'wether';
  if (a.sex === 'R') return 'ram';
  if (a.preg && (a.preg.ok || S().day < a.preg.check)) return 'bred';
  return ageDays(a) < 300 ? 'lamb' : 'ewe';
}
function consign(f, a, sale) {
  const s = S();
  const fv = fairValue(a) * repMult(f.id);
  const mode = sale ? 'auction' : Math.random() < 0.6 ? 'auction' : 'buy';
  const L = { id: uid('L'), kind: 'animal', aid: a.id, seller: f.id, mode, start: s.day, end: sale ? sale.close : s.day + (mode === 'auction' ? irnd(4, 9) : irnd(10, 25)), sale: sale?.id };
  L.price = mode === 'auction' ? Math.max(100, Math.round(fv * rnd(0.3, 0.55) / 25) * 25) : Math.round(fv * rnd(0.95, 1.4) / 25) * 25;
  L.reserve = mode === 'auction' ? L.price : 0;
  if (mode === 'auction') L.bidders = makeBidders(fairValue(a), f.id, lotType(a), L.end - s.day);
  a.listing = L.id; s.listings.push(L);
}
// AI flocks consign lots — prospects by season; bred ewes, semen, embryos year-round
// Farm online sales: announced ahead, 10–30 lots, all close the same evening
const SALE_NAMES = { 0: 'Winter', 1: 'Winter', 2: 'Spring', 3: 'Spring', 4: 'Spring', 5: 'Summer', 6: 'Summer', 7: 'Summer', 8: 'Fall', 9: 'Fall', 10: 'Fall', 11: 'Holiday' };
function farmSales(idx, own) {
  const s = S(); const m = monthOf(s.day); s.sales = s.sales || [];
  const prospect = (m >= 1 && m <= 5) || (m >= 7 && m <= 9);
  // announce new sales
  for (let k = 0; k < (prospect ? 2 : 1); k++) if (Math.random() < (prospect ? 0.8 : 0.35)) {
    const f = pick(s.flocks.filter(x => x.id !== 'P' && x.skill > 0.25 && !s.sales.some(y => y.f === x.id && y.close > s.day)));
    if (f) { const open = s.day + irnd(7, 21); const om = monthOf(open); const kind = om >= 2 && om <= 5 && f.type !== 'breed' ? 'Prospect' : om >= 1 && om <= 9 ? 'Ewe & Ram' : 'Bred Ewe'; s.sales.push({ id: uid('S'), f: f.id, name: `${f.name} ${SALE_NAMES[monthOf(open)]} ${kind} Online Sale`, open, close: open + irnd(5, 8), n: irnd(10, 30), kind, lots: 0 }); }
  }
  // open sales whose day has come
  for (const sale of s.sales) {
    if (sale.open !== s.day) continue;
    const f = flock(sale.f); if (!f) continue;
    let pool = own(f).filter(a => !a.preg || sale.kind === 'Bred Ewe');
    if (sale.kind === 'Prospect') pool = pool.filter(a => ageDays(a) >= 40 && ageDays(a) <= 200 && !a.keep && a.sex !== 'R');
    else if (sale.kind === 'Ewe & Ram') pool = pool.filter(a => ageDays(a) >= 40 && ageDays(a) <= 400 && (!a.keep || a.sex === 'R'));
    else pool = pool.filter(a => a.sex === 'E' && a.preg?.ok && s.day >= a.preg.check && ageDays(a) < 2000);
    const lots = shuffle(pool).slice(0, sale.n);
    if (lots.length < 5) { sale.cancel = true; continue; }
    lots.forEach(a => consign(f, a, sale)); sale.lots = lots.length;
    if (lots.length && (s.favs || []).includes(f.id)) news(`${sale.name} is open — ${lots.length} lots, closes ${fmtShort(sale.close)}.`, 'sale', true);
  }
  s.sales = s.sales.filter(x => !x.cancel && x.close >= s.day - 3);
}
export const toggleFav = fid => { const s = S(); s.favs = s.favs || []; s.favs = s.favs.includes(fid) ? s.favs.filter(x => x !== fid) : [...s.favs, fid]; };
function aiListings() {
  const s = S(); const m = monthOf(s.day);
  const flocks = s.flocks.filter(x => x.id !== 'P');
  const idx = byOwner(); const own = f => (idx.get(f.id) || []).filter(a => !a.listing && S().animals[a.id] && a.owner === f.id);
  farmSales(idx, own);
  if (s.listings.filter(l => l.seller !== 'P').length > 420) return;
  const prospect = (m >= 1 && m <= 5) || (m >= 7 && m <= 9);
  const sales = prospect ? irnd(9, 15) : irnd(0, 2);
  for (let i = 0; i < sales; i++) {
    const f = pick(flocks);
    if (s.sales.some(y => y.f === f.id && y.close >= s.day)) continue; // saving lambs for their sale
    const lots = own(f).filter(a => ageDays(a) >= 40 && ageDays(a) <= 190 && a.sex !== 'R' && !a.keep && !a.preg);
    shuffle(lots).slice(0, irnd(4, 9)).forEach(a => consign(f, a));
  }
  // bred ewes — year-round (flocks lamb in different seasons)
  for (let k = 0; k < irnd(1, 2); k++) if (Math.random() < 0.7) {
    const f = pick(flocks);
    const ewes = own(f).filter(a => a.sex === 'E' && a.preg?.ok && s.day >= a.preg.check && a.preg.due - s.day > 20 && ageDays(a) < 2000);
    shuffle(ewes).slice(0, irnd(1, 2)).forEach(a => consign(f, a));
  }
  // open ewes
  if (Math.random() < (m >= 6 && m <= 9 ? 0.6 : 0.3)) {
    const f = pick(flocks);
    const ewes = own(f).filter(a => a.sex === 'E' && !a.preg && ageDays(a) > 300 && ageDays(a) < 1800);
    shuffle(ewes).slice(0, irnd(1, 2)).forEach(a => consign(f, a));
  }
  // rams — busiest Jun–Sep
  if (Math.random() < (m >= 5 && m <= 8 ? 0.85 : 0.3)) {
    const f = pick(flocks);
    const rams = own(f).filter(a => a.sex === 'R' && ageDays(a) > 120 && ageDays(a) < 900).sort((x, y) => breedingIndex(y) - breedingIndex(x));
    const pool = rams.length > 1 ? rams.slice(1) : (rams[0] && ageDays(rams[0]) < 365 ? rams : []);
    shuffle(pool).slice(0, irnd(1, 2)).forEach(a => consign(f, a));
  }
  // embryos — year-round
  if (Math.random() < 0.35) {
    const f = pick(flocks);
    const mine = own(f);
    const ewes = mine.filter(a => a.sex === 'E' && ageDays(a) > 400 && ageDays(a) < 2000);
    const rams = mine.filter(a => a.sex === 'R' && ageDays(a) > 250);
    if (ewes.length && rams.length) {
      const d = ewes.sort((a, b) => breedingIndex(b) - breedingIndex(a))[0], r = rams.sort((a, b) => breedingIndex(b) - breedingIndex(a))[0];
      const emb = { id: uid('e'), dam: snapshot(d), sire: snapshot(r), count: irnd(2, 5), day: s.day };
      const fv = embryoValue(emb) * emb.count * repMult(f.id);
      const mode = Math.random() < 0.6 ? 'auction' : 'buy';
      const L = { id: uid('L'), kind: 'embryo', emb, seller: f.id, mode, start: s.day, end: s.day + (mode === 'auction' ? irnd(5, 9) : irnd(10, 25)) };
      L.price = mode === 'auction' ? Math.max(100, Math.round(fv * 0.4 / 25) * 25) : Math.round(fv * rnd(1, 1.3) / 25) * 25;
      L.reserve = mode === 'auction' ? L.price : 0;
      if (mode === 'auction') L.bidders = makeBidders(embryoValue(emb) * emb.count, f.id, 'embryo', L.end - s.day);
      s.listings.push(L);
    }
  }
}

// ---------- sire directory ----------
export const TANK_FEE = 10, OVERHEAD = 100;
export const LOAN_MAX = 25000, LOAN_RATE = 0.08, LOAN_MONTHS = 24;
export function takeLoan(amount) {
  const s = S(); amount = Math.round(+amount || 0);
  const owed = s.loan?.balance || 0;
  if (amount < 500) return 'Minimum loan is $500.';
  if (owed + amount > LOAN_MAX) return `You can borrow up to ${money(LOAN_MAX - owed)} more.`;
  const bal = owed + amount; const r = LOAN_RATE / 12;
  s.loan = { balance: bal, rate: LOAN_RATE, payment: Math.round(bal * r / (1 - Math.pow(1 + r, -LOAN_MONTHS))), since: s.day };
  addCash(amount, `Bank loan (${(LOAN_RATE * 100).toFixed(0)}% / ${LOAN_MONTHS} months)`);
  return null;
}
export function payLoan(amount) {
  const s = S(); if (!s.loan) return 'No loan.'; amount = Math.min(Math.round(+amount || 0), Math.round(s.loan.balance));
  if (amount <= 0) return 'Enter an amount.'; if (s.cash < amount) return 'Not enough cash.';
  addCash(-amount, 'Extra loan payment'); s.loan.balance -= amount; if (s.loan.balance < 1) s.loan = null; return null;
}
export const START_FLOCKS = 350;
export const SEVEN_MO = 213;
export const DIRECTORY_FEE = 100, COLLECT_FEE = 200, LEASE_DAYS = 60;
export const ramHome = r => !(r.away && r.away > S().day);
export const usableRams = () => living().filter(a => a.sex === 'R' && ageDays(a) >= 200 && ((a.owner === 'P' && ramHome(a)) || (a.leasedTo === 'P' && a.leaseUntil > S().day)));
export function collectSemen(ramId) {
  const s = S(); const r = s.animals[ramId];
  if (!r || r.owner !== 'P' || r.sex !== 'R' || ageDays(r) < SEVEN_MO) return 'Rams must be 7+ months old to collect.';
  if (!ramHome(r)) return `${r.name} is away on lease.`;
  if (s.cash < COLLECT_FEE) return `Collection costs ${money(COLLECT_FEE)}.`;
  addCash(-COLLECT_FEE, `Semen collection — ${r.name}`);
  const n = irnd(10, 30);
  const t = s.tank.find(x => x.snap.id === r.id);
  if (t) { t.straws += n; t.snap = snapshot(r); } else s.tank.push({ snap: snapshot(r), straws: n, own: true });
  news(`Collected ${r.name}: ${n} straws in the tank.`, 'good', true);
  return null;
}
// opts: { straws, price, lease } — must offer collected straws and/or a lease price
export function listSire(ramId, opts) {
  const s = S(); const r = s.animals[ramId];
  if (r.sex !== 'R' || ageDays(r) < SEVEN_MO) return 'Only rams 7+ months old can be listed.';
  if (s.directory.some(d => d.ramId === ramId && d.owner === 'P')) return 'Already in the directory.';
  const straws = Math.max(0, Math.round(opts.straws || 0)); const lease = Math.max(0, Math.round(opts.lease || 0));
  const t = s.tank.find(x => x.snap.id === ramId);
  if (straws > (t?.straws || 0)) return `You only have ${t?.straws || 0} straws of ${r.name} collected.`;
  if (!straws && !lease) return 'List collected straws, a lease price, or both.';
  if (straws && !(opts.price > 0)) return 'Set a price per straw.';
  if (s.cash < DIRECTORY_FEE) return `Listing fee is ${money(DIRECTORY_FEE)}.`;
  addCash(-DIRECTORY_FEE, `Sire directory fee — ${r.name}`);
  if (straws) { t.straws -= straws; if (t.straws <= 0) s.tank.splice(s.tank.indexOf(t), 1); }
  s.directory.push({ id: uid('d'), ramId, owner: 'P', price: straws ? Math.round(opts.price) : 0, stock: straws, lease: lease || 0, snap: snapshot(r), listed: s.day, until: s.day + 365, sold: 0, leases: 0 });
  return null;
}
export function unlistSire(dirId) {
  const s = S(); const d = s.directory.find(x => x.id === dirId);
  if (d && d.owner === 'P' && d.stock > 0) { const t = s.tank.find(x => x.snap.id === d.ramId); if (t) t.straws += d.stock; else s.tank.push({ snap: d.snap, straws: d.stock, own: true }); }
  s.directory = s.directory.filter(x => x.id !== dirId);
}
export const strawsLeft = d => d.stock == null ? Infinity : d.stock;
export function buySemen(dirId, qty) {
  const s = S(); const d = s.directory.find(x => x.id === dirId);
  if (!d || d.owner === 'P' || !d.price) return 'No semen offered on this sire.';
  if (qty > strawsLeft(d)) return `Only ${d.stock} straws left.`;
  const cost = d.price * qty;
  if (s.cash < cost) return 'Not enough cash.';
  addCash(-cost, `${qty} straws — ${d.snap.name}`);
  if (d.stock != null) d.stock -= qty;
  const live = s.animals[d.ramId]; const snap = live ? snapshot(live) : d.snap;
  const t = s.tank.find(x => x.snap.id === d.snap.id);
  if (t) { t.straws += qty; t.snap = snap; } else s.tank.push({ snap, straws: qty });
  return null;
}
export function leaseRam(dirId) {
  const s = S(); const d = s.directory.find(x => x.id === dirId); const r = d && s.animals[d.ramId];
  if (!d || d.owner === 'P' || !d.lease) return 'This ram isn’t offered for lease.';
  if (!r) return 'That ram is no longer available.';
  if (!ramHome(r) || r.leasedTo) return `${r.name} is already out on lease.`;
  if (s.cash < d.lease) return 'Not enough cash.';
  addCash(-d.lease, `${LEASE_DAYS}-day lease — ${r.name}`);
  r.leasedTo = 'P'; r.leaseUntil = s.day + LEASE_DAYS; r.away = s.day + LEASE_DAYS;
  news(`${r.name} (${flockName(r.owner)}) arrived on a ${LEASE_DAYS}-day lease — back home ${fmtShort(r.leaseUntil)}.`, 'good', true);
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
    const price = Math.round(clamp(20 + 8 * Math.exp((bi - 65) / 5), 20, 500) / 5) * 5;
    const leaseOnly = Math.random() < 0.15, lease = leaseOnly || Math.random() < 0.4 ? Math.round(price * rnd(6, 10) / 25) * 25 + 150 : 0;
    s.directory.push({ id: uid('d'), ramId: r.id, owner: r.owner, price: leaseOnly ? 0 : price, stock: null, lease, snap: snapshot(r), listed: s.day, until: s.day + 365, sold: 0 });
  });
}

// ---------- shows ----------
export function allShows() {
  const s = S();
  return [...homeShows(s.home, s.county), ...NATIONAL_SHOWS];
}
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
const hashStr = str => [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
// Weekly jackpots: Feb–Oct 2+ regional (home + bordering states) and 1 elsewhere each week; fewer in winter
export function jackpotsOn(d) {
  const s = S(); const t = dateOf(d); const dow = t.getUTCDay(); const m = t.getUTCMonth(); const y = t.getUTCFullYear();
  if (dow !== 6 && dow !== 0) return [];
  const r = rng(hashStr(`${s.home}:${d}`));
  const rp = arr => arr[Math.floor(r() * arr.length)];
  const inSeason = m >= 1 && m <= 9;
  const region = [s.home, ...(NEIGHBORS[s.home] || [])];
  const nReg = inSeason ? (dow === 6 ? 1 + (r() < 0.5 ? 1 : 0) : 1) : (dow === 6 && r() < 0.6 ? 1 : 0);
  const nFar = dow === 6 ? (inSeason ? 1 : (r() < 0.35 ? 1 : 0)) : 0;
  const far = Object.keys(STATE_WEIGHT).filter(k => !region.includes(k));
  const farW = far.map(k => STATE_WEIGHT[k]); const farT = farW.reduce((a, b) => a + b, 0);
  const pickFar = () => { let x = r() * farT; for (let i = 0; i < far.length; i++) { x -= farW[i]; if (x <= 0) return far[i]; } return far[0]; };
  const season = m <= 1 || m >= 10 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'fall';
  const out = [];
  for (let i = 0; i < nReg + nFar; i++) {
    const host = i < nReg ? (r() < 0.5 ? s.home : rp(region)) : pickFar();
    const word = rp(JACKPOT_WORDS[season]);
    const place = rp(PLACE_WORDS);
    out.push({
      id: `wj${d}_${i}`, key: `wj-${d}-${i}`, name: `${place} ${word} — ${STATES[host]}`, short: `${word} (${host})`,
      day: d, year: y, m, d: t.getUTCDate(), tier: 'jackpot', breeding: true, commercial: true, minWt: 95, maxWt: 165, fee: 25 + 5 * Math.floor(r() * 4),
      host, jackpot: true, regional: i < nReg, venue: `${place} ${rp(JACKPOT_PLACES)}`, series: inSeason && r() < 0.5 ? seriesNameFor(host) : null,
    });
  }
  return out;
}
export function upcomingShows(n = 14, opts = {}) {
  const s = S(); const y = yearOf(s.day); const out = [];
  if (!opts.jackpotsOnly) for (const yy of [y, y + 1, y + 2]) for (const sh of allShows()) {
    const d = dayOf(yy, sh.m, sh.d);
    if (d > s.day) out.push({ ...sh, day: d, year: yy, key: `${sh.id}-${yy}` });
  }
  if (!opts.noJackpots) for (let d = s.day + 1; d <= s.day + (opts.horizon || 90); d++) out.push(...jackpotsOn(d));
  return out.sort((a, b) => a.day - b.day).slice(0, n);
}
export function findShow(key) {
  if (key.startsWith('wj-')) { const [, d, i] = key.split('-'); return jackpotsOn(+d)[+i] || null; }
  return upcomingShows(40, { noJackpots: true }).find(x => x.key === key) || null;
}
// A circuit of recurring judges — each with a style and a pick history you can study
function judgePool() {
  const s = S();
  if (!s.judgePool) {
    const first = ['Jake', 'Kelly', 'Travis', 'Shane', 'Brooke', 'Cody', 'Mark', 'Jill', 'Ryan', 'Tanner', 'Kyle', 'Lindsay', 'Chad', 'Dustin', 'Amy', 'Brett', 'Wes', 'Casey', 'Logan', 'Morgan', 'Blake', 'Hunter', 'Jenna', 'Clay'];
    s.judgePool = Array.from({ length: 60 }, (_, i) => ({ name: `${Math.random() < 0.2 ? 'Dr. ' : ''}${pick(first)} ${pick(SURNAMES)}`, style: i % JUDGE_STYLES.length, from: wpick(STATE_WEIGHT) }));
  }
  return s.judgePool;
}
export function judgeFor(key) {
  const s = S();
  if (!s.judges[key]) { const pool = judgePool(); s.judges[key] = { ...pool[hashStr(key) % pool.length] }; }
  return s.judges[key];
}
export const judgeHistory = name => (S().jhist || {})[name] || [];
function recordJudge(judge, show, grand) {
  const s = S(); s.jhist = s.jhist || {};
  const h = s.jhist[judge.name] || (s.jhist[judge.name] = []);
  h.unshift({ day: s.day, show: show.short, name: grand.name, sex: sexText(grand), breed: breedLabel(grand), wt: Math.round(grand.wt), cls: marketClassFor(grand) });
  if (h.length > 8) h.length = 8;
}
// Hauling — round trip from your home state to the show, plus a per-head charge
function milesBetween(a, b) {
  const [la1, lo1] = STATE_LL[a] || [39, -95], [la2, lo2] = STATE_LL[b] || [39, -95];
  const r = Math.PI / 180, d = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
  return Math.round(3959 * 2 * Math.asin(Math.sqrt(d)) * 1.2);
}
export const showState = show => show.host || SHOW_STATE[show.id] || S().home;
export function haulCost(show, head) { const mi = show.tier === 'county' ? 20 : milesBetween(S().home, showState(show)) || 40; return Math.round(25 + mi * 2 * 0.9 + head * 5); }
export function fleeceDays(a, day = S().day) { return day - (a.shorn ?? a.birth); }
export const SHEAR_COST = 10;
export function shear(ids) {
  const s = S(); const list = ids.map(id => s.animals[id]).filter(a => a && a.owner === 'P');
  if (!list.length) return 'Nothing to shear.';
  if (s.cash < list.length * SHEAR_COST) return 'Not enough cash.';
  addCash(-list.length * SHEAR_COST, `Shearing — ${list.length} head`); list.forEach(a => a.shorn = s.day);
  return null;
}
export const marketClass = a => marketClassFor(a);
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
  if (age < 60 || age >= 365) return 'Registered shows are lamb classes only (under 12 months)';
  if (a.blk === 2 && a.breed !== 'Natural Colored') return 'Black lambs can’t show in a white-breed registered show';
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
      adg = (0.22 + 0.68 * eff) * (1 + a.bv.PWG / 25) * (frameOf(a) / 140) * growthFx(a) * Math.max(0.03, 1 - Math.max(0, w / frameOf(a) - 0.9) * 3);
    }
    w += Math.max(a.dwarf === 2 && w > 104 ? 0.01 : 0.05, adg) * (a.spider === 2 ? 0.5 : 1);
  }
  return w;
}
export function enterShow(show, ids, div) {
  const s = S(); const e = s.entries[show.key] || (s.entries[show.key] = { market: [], breeding: [], commercial: [] }); e[div] = e[div] || [];
  const fresh = ids.filter(id => !e[div].includes(id));
  const fee = fresh.length * show.fee;
  if (fee > s.cash) return 'Not enough cash for entry fees.';
  if (fee) addCash(-fee, `Entry fees — ${show.name} (${fresh.length})`);
  e[div].push(...fresh);
  return null;
}
export function scratch(key, id, div) { const e = S().entries[key]; if (e && e[div]) e[div] = e[div].filter(x => x !== id); }
export const entriesFor = id => Object.entries(S().entries).filter(([, e]) => ['market', 'breeding', 'commercial'].some(d => (e[d] || []).includes(id))).map(([k]) => k);

function aiPresentation(f) { const k = f?.skill ?? 0.5; return { train: 45 + k * 50, fit: 50 + k * 45, tone: k * 3.5 }; }
function fleecePenalty(a, show) {
  if (a.owner !== 'P') return 0;
  const d = fleeceDays(a, show.day);
  return d > 21 ? Math.min(6, (d - 21) * 0.12) : 0;
}
function showScore(a, judge, kind, show) {
  const J = JUDGE_STYLES[judge.style]; const w = J.w; const q = J.q || {};
  const pres = a.owner === 'P' ? { train: a.train, fit: a.fit, tone: a.tone } : aiPresentation(flock(a.owner));
  const save = { fit: a.fit, tone: a.tone };
  a.fit = pres.fit; a.tone = pres.tone;
  let v = 0;
  if (kind === 'market') {
    for (const t of TRAITS) v += w[t] * phen(a, t);
    v -= 5 * Math.pow(Math.abs((a.cond ?? 3) - 3), 1.4);
    const ratio = a.wt / frameOf(a); const flex = a.dwarf === 1 ? 0.07 : 0;
    if (ratio < 0.86 - flex) v -= (0.86 - flex - ratio) * 70;
    if (ratio > 1.06 + flex) v -= (ratio - 1.06 - flex) * 55;
    if (a.sex === 'W') v += 2.7 * (q.wether ?? 1);
    if (q.big) v += q.big * clamp((ratio - 0.97) * 14, -2, 2);
    if (q.fresh) v += q.fresh * 0.08 * (phen(a, 'fresh') - 55);
    if (BREEDS[a.breed]?.reg !== false && !a.breed.startsWith('Wether-Type') && a.breed !== 'Commercial') v -= 3; // registered breeding-type sheep rarely beat club lambs
    v -= fleecePenalty(a, show);
  } else {
    const reg = kind === 'breeding';
    const bw = reg ? { structure: .2, balance: .17, bone: .11, look: .13, muscle: .12, dimension: .1, breed: .1, fresh: .07 } : { structure: .2, balance: .18, bone: .1, look: .14, muscle: .15, dimension: .12, breed: .03, fresh: .08 };
    for (const t of TRAITS) v += (bw[t] * 0.6 + (w[t] || 0) * 0.4) * phen(a, t);
    if (reg && q.purist) v += q.purist * 0.08 * (phen(a, 'breed') - 55);
    if (q.fresh) v += q.fresh * 0.05 * (phen(a, 'fresh') - 55);
    if (!reg) v -= fleecePenalty(a, show);
    const exp = weightForAge(ageDays(a), frameOf(a), a.sex);
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
const slim = (a, score) => ({ id: a.id, sex: a.sex, face: a.face, blk: a.blk, name: a.name, flock: flockName(a.owner), owner: a.owner, wt: Math.round(a.wt), breed: breedLabel(a), sire: a.sireName, sc: score });
function runClass(list, judge, kind, show) {
  return list.map(a => ({ a, sc: showScore(a, judge, kind, show) })).sort((x, y) => y.sc - x.sc);
}
function localLamb(show, kind, breed) {
  const age = irnd(150, 260);
  const a = makeFounder({ breed: breed || (Math.random() < 0.7 ? 'Crossbred' : pick(['Suffolk', 'Hampshire', 'Southdown', 'Dorset', 'Shropshire', 'Natural Colored'])), sex: Math.random() < 0.6 ? 'W' : 'E', ageDays: age, owner: 'LOCAL', q: rnd(-6, 4), comp: 'Hampshire × Suffolk', face: Math.random() < 0.8 ? 'black' : 'white' });
  a.wt = clamp(frameOf(a) * rnd(0.82, 1.05), show.minWt + 2, show.maxWt - 2); a.cond = clamp(3 + randn() * 0.5, 1.8, 4.3);
  a.name = `${pick(namePool(a.sex))} (${pick(SURNAMES)} family)`; a.temp = true;
  return a;
}

function attendingFlocks(show) {
  const s = S(); const t = TIER[show.tier];
  let pool = s.flocks.filter(f => f.id !== 'P');
  const scale = Math.max(1, pool.length / 250);
  if (show.jackpot) { const reg = [show.host, ...(NEIGHBORS[show.host] || [])]; pool = pool.filter(f => reg.includes(f.state) || Math.random() < 0.04); }
  else if (show.tier === 'county') pool = pool.filter(f => f.state === s.home);
  else if (show.tier === 'state') pool = pool.filter(f => f.state === s.home || Math.random() < 0.06);
  else if (show.tier === 'jackpot') pool = pool.filter(f => f.state === s.home || Math.random() < 0.15);
  else if (show.id === 'keystone') pool = pool.filter(f => ['PA', 'OH', 'NY', 'MD', 'VA', 'WV', 'NJ', 'DE', 'MI', 'IN', 'KY'].includes(f.state) || Math.random() < 0.15);
  else if (['sanantonio', 'houston', 'fortworth'].includes(show.id)) pool = pool.filter(f => ['TX', 'OK', 'NM', 'LA', 'AR', 'KS', 'CO'].includes(f.state) || Math.random() < (f.skill > 0.7 ? 0.5 : 0.15));
  else if (show.id === 'denver') pool = pool.filter(f => ['CO', 'NE', 'KS', 'WY', 'UT', 'NM', 'SD', 'MT', 'ID', 'AZ', 'TX', 'IA'].includes(f.state) || Math.random() < (f.skill > 0.7 ? 0.4 : 0.12));
  return shuffle(pool).slice(0, Math.round(t.flocks * scale));
}

export function commercialEligible(a, show) {
  const age = ageDays(a) + (show.day - S().day);
  if (a.sex !== 'E') return 'Ewes only';
  if (a.spider === 2) return 'Not showable';
  if (age < 60 || age > 760) return 'Ewe lambs and yearling ewes only';
  return null;
}
// Entries are planned ahead so you can see who's coming; locked in once first viewed
export function planEntries(show) {
  const s = S(); s.plans = s.plans || {};
  if (s.plans[show.key]) return s.plans[show.key];
  const flocks = attendingFlocks(show);
  const k = { county: 2, jackpot: 2, state: 3, major: 3, national: 4 }[show.tier];
  const days = Math.max(0, show.day - s.day);
  const plan = { market: [], breeding: [], commercial: [], locals: [] };
  const byFlock = {};
  for (const a of living()) if (a.owner !== 'P' && !a.listing) (byFlock[a.owner] ||= []).push(a);
  for (const f of flocks) {
    const mine = byFlock[f.id] || [];
    const mk = mine.filter(a => !a.keep && !marketEligible(a, show)).map(a => ({ a, w: projectedWeight(a, days) })).filter(x => x.w >= show.minWt && x.w <= show.maxWt)
      .sort((x, y) => marketIndex(y.a) - marketIndex(x.a)).slice(0, k);
    plan.market.push(...mk.map(x => x.a.id));
    if (show.breeding && f.type === 'breed') plan.breeding.push(...mine.filter(a => !breedingEligible(a, show)).sort((x, y) => breedingIndex(y) - breedingIndex(x)).slice(0, k + 1).map(a => a.id));
    if (show.commercial && (f.type === 'club' || Math.random() < 0.3)) plan.commercial.push(...mine.filter(a => !commercialEligible(a, show)).sort((x, y) => breedingIndex(y) - breedingIndex(x)).slice(0, f.type === 'club' ? irnd(1, 2) : 1).map(a => a.id));
  }
  if (show.tier === 'county' || show.tier === 'state' || show.tier === 'jackpot') {
    const n = { county: irnd(25, 45), state: irnd(40, 70), jackpot: irnd(15, 35) }[show.tier];
    for (let i = 0; i < n; i++) { const a = localLamb(show); a.div = 'market'; plan.locals.push(a); }
    if (show.commercial) for (let i = 0; i < irnd(4, 12); i++) { const a = localLamb(show); a.sex = 'E'; a.name = `${pick(EWE_NAMES)} (${a.name.split('(')[1]}`; a.div = 'commercial'; plan.locals.push(a); }
  }
  s.plans[show.key] = plan;
  return plan;
}
// Everyone currently entered (computer flocks + locals + you), for the preview list
export function entryList(show) {
  const s = S(); const plan = planEntries(show); const e = s.entries[show.key] || {};
  const out = { market: [], breeding: [], commercial: [] };
  for (const div of ['market', 'breeding', 'commercial']) {
    for (const id of plan[div]) { const a = s.animals[id]; if (a && a.owner !== 'P') out[div].push(a); }
    for (const id of (e[div] || [])) { const a = s.animals[id]; if (a) out[div].push(a); }
  }
  for (const a of plan.locals) out[a.div].push(a);
  return out;
}

function placeClasses(classes, show, res, kind, prefix, seriesTag) {
  const s = S(); const T = TIER[show.tier];
  classes.forEach(c => c.placed.forEach((p, i) => {
    if (show.series) seriesPoints(show, p.a, Math.max(1, c.placed.length - i));
    if (p.a.owner === 'P') {
      const prem = Math.round(T.prem * (kind === 'market' ? 1 : 0.8) * Math.max(0, 1 - i * 0.12));
      if (prem > 0) addCash(prem, `Premium — ${show.short} ${ordinal(i + 1)}`);
      res.mine.push({ name: p.a.name, id: p.a.id, pl: i + 1, cls: c.label, text: `${ordinal(i + 1)} of ${c.placed.length} — ${prefix}${c.label}` });
      p.a.record.push({ pl: i + 1, key: show.key, show: show.short, day: s.day, text: `${ordinal(i + 1)} of ${c.placed.length}, ${prefix}${c.label.split(' — ').pop()}` });
      if (i === 0) achieve('first_class');
    }
  }));
}
function champs(classes) {
  const w = classes.map(c => c.placed[0]).sort((x, y) => y.sc - x.sc);
  if (!w.length) return [null, null];
  const cc = classes.find(c => c.placed[0] === w[0]);
  const r = [...w.slice(1), cc.placed[1]].filter(Boolean).sort((x, y) => y.sc - x.sc)[0];
  return [w[0], r || null];
}
function divAward(show, c, r, title, T) {
  if (c) { award(c.a, show, `Champion ${title}`, T.breedCh, 'breed'); if (show.series) seriesPoints(show, c.a, 5); }
  if (r) { award(r.a, show, `Reserve Champion ${title}`, T.breedCh / 2, 'breedres'); if (show.series) seriesPoints(show, r.a, 3); }
}
export const SOC = { state: [[6000, 15000], [3000, 8000], [800, 2500]], major: [[25000, 80000], [10000, 30000], [2000, 6000]], national: [[15000, 40000], [6000, 15000], [1500, 4000]] };
export function runShow(show) {
  const s = S(); const judge = judgeFor(show.key); const T = TIER[show.tier];
  const e = s.entries[show.key] || { market: [], breeding: [], commercial: [] };
  const plan = planEntries(show);
  const res = { key: show.key, id: show.id, name: show.name, tier: show.tier, series: show.series || null, day: s.day, judge: { ...judge, style: JUDGE_STYLES[judge.style].label }, market: null, breeding: null, commercial: null, soc: null, mine: [] };
  const regWinners = new Set(); // banner winners on the registered side can't also win on the club side that day
  const take = (div, elig, weigh) => {
    const out = [];
    for (const id of (e[div] || [])) {
      const a = s.animals[id]; if (!a || a.owner !== 'P') continue;
      const why = elig(a, show);
      if (why) { res.mine.push({ name: a.name, text: `Scratched — ${why}` }); continue; }
      if (weigh && (a.wt < show.minWt || a.wt > show.maxWt)) { res.mine.push({ name: a.name, text: `Did not make weight (${Math.round(a.wt)} lb; limits ${show.minWt}–${show.maxWt})` }); continue; }
      if (div !== 'breeding' && regWinners.has(a.id)) { res.mine.push({ name: a.name, text: `Not eligible on the club side — already won on the registered side today` }); continue; }
      out.push(a);
    }
    for (const id of plan[div]) { const a = s.animals[id]; if (a && a.owner !== 'P' && !a.listing && !elig(a, show) && (!weigh || (a.wt >= show.minWt && a.wt <= show.maxWt)) && (div === 'breeding' || !regWinners.has(a.id))) out.push(a); }
    for (const a of plan.locals) if (a.div === div) out.push(a);
    return out;
  };
  const shown = new Set();

  // ----- registered breeding sheep (lamb classes only) -----
  if (show.breeding) {
    const br = take('breeding', breedingEligible, false);
    const byBreed = {};
    for (const a of br) (byBreed[a.breed] ||= []).push(a);
    const breeds = [];
    for (const [bname, list] of Object.entries(byBreed).sort()) {
      const classes = [];
      for (const [lab, sx] of [['Ewe Lamb', 'E'], ['Ram Lamb', 'R']]) {
        const l = list.filter(a => a.sex === sx); if (!l.length) continue;
        splitByWeight(l).forEach((cl, i, arr) => classes.push({ label: `${lab}${arr.length > 1 ? ` — Class ${i + 1}` : ''}`, sex: sx, placed: runClass(cl, judge, 'breeding', show) }));
      }
      placeClasses(classes, show, res, 'breeding', `${bname} `);
      const [ce, re] = champs(classes.filter(c => c.sex === 'E')), [cr, rr] = champs(classes.filter(c => c.sex === 'R'));
      divAward(show, ce, re, `${bname} Ewe`, T); divAward(show, cr, rr, `${bname} Ram`, T);
      [ce, re, cr, rr].forEach(x => x && regWinners.add(x.a.id));
      breeds.push({ breed: bname, classes: classes.map(c => ({ label: `${bname} ${c.label}`, placed: c.placed.map(p => slim(p.a)) })), ce: ce && slim(ce.a), re: re && slim(re.a), cr: cr && slim(cr.a), rr: rr && slim(rr.a) });
    }
    br.forEach(a => shown.add(a));
    if (breeds.length) res.breeding = { breeds, count: br.length };
  }

  // ----- commercial ewes (club side; any ewe lamb or yearling, registered or not) -----
  if (show.commercial) {
    const ce = take('commercial', commercialEligible, false);
    if (ce.length) {
      const classes = [];
      for (const [lab, l] of [['Ewe Lambs', ce.filter(a => ageDays(a) < 365)], ['Yearling Ewes', ce.filter(a => ageDays(a) >= 365)]])
        if (l.length) splitByWeight(l).forEach((cl, i, arr) => classes.push({ label: `Commercial ${lab}${arr.length > 1 ? ` — Class ${i + 1}` : ''} (${Math.round(cl[0].wt)}–${Math.round(cl[cl.length - 1].wt)} lb)`, placed: runClass(cl, judge, 'commercial', show) }));
      placeClasses(classes, show, res, 'commercial', '');
      const [c1, r1] = champs(classes);
      divAward(show, c1, r1, 'Commercial Ewe', T);
      ce.forEach(a => shown.add(a));
      res.commercial = { classes: classes.map(c => ({ label: c.label, placed: c.placed.map(p => slim(p.a)) })), champ: c1 && slim(c1.a), resv: r1 && slim(r1.a), count: ce.length };
    }
  }

  // ----- market lambs (club side; breed check assigns classes by characteristics) -----
  const mk = take('market', marketEligible, true);
  if (mk.length) {
    const groups = {};
    for (const a of mk) {
      const g = show.tier === 'county' ? 'Market Lambs' : marketClassFor(a); (groups[g] ||= []).push(a);
      if (a.owner === 'P' && show.tier !== 'county' && BREEDS[a.breed]?.reg === false && !isNatural(a)) {
        const top = Object.entries(a.blood || {}).sort((x, y) => y[1] - x[1])[0];
        if (top && BREED_CHECK[top[0]] && top[1] >= 0.5 && g !== top[0]) res.mine.push({ name: a.name, text: `Breed check: didn’t pass as ${top[0]} — moved to ${g}` });
      }
    }
    const divs = [];
    for (const [g, list] of Object.entries(groups)) {
      const classes = splitByWeight(list).map((cl, i) => ({ label: `${g} — Class ${i + 1} (${Math.round(cl[0].wt)}–${Math.round(cl[cl.length - 1].wt)} lb)`, placed: runClass(cl, judge, 'market', show) }));
      const [champ, resv] = champs(classes);
      divs.push({ name: g, classes, champ, resv });
    }
    divs.sort((a, b) => MARKET_ORDER(a.name) - MARKET_ORDER(b.name));
    divs.forEach(d => placeClasses(d.classes, show, res, 'market', ''));
    const cs = divs.map(d => d.champ).sort((x, y) => y.sc - x.sc);
    const grand = cs[0]; const gDiv = divs.find(d => d.champ === grand);
    const resGrand = [...cs.slice(1), gDiv.resv].filter(Boolean).sort((x, y) => y.sc - x.sc)[0];
    if (divs.length > 1) divs.forEach(d => divAward(show, d.champ, d.resv, d.name, T));
    award(grand.a, show, 'Grand Champion Market Lamb', T.grand, 'grand');
    if (resGrand) award(resGrand.a, show, 'Reserve Grand Champion Market Lamb', T.reserve, 'reserve');
    recordJudge(judge, show, grand.a);
    news(`${show.short}: Grand Champion Market Lamb — ${grand.a.name}, ${flockName(grand.a.owner)}${resGrand ? `; Reserve — ${resGrand.a.name}, ${flockName(resGrand.a.owner)}` : ''}.`, 'show', grand.a.owner === 'P' || resGrand?.a.owner === 'P');
    mk.forEach(a => shown.add(a));
    res.market = { divs: divs.map(d => ({ name: d.name, champ: slim(d.champ.a), resv: d.resv && slim(d.resv.a), classes: d.classes.map(c => ({ label: c.label, placed: c.placed.map(p => slim(p.a)) })) })), grand: slim(grand.a), resGrand: resGrand && slim(resGrand.a), count: mk.length };

    // ----- Sale of Champions (terminal, required) -----
    const band = SOC[show.tier];
    if (band) {
      const sellers = [[grand.a, 'Grand Champion', band[0]], resGrand && [resGrand.a, 'Reserve Grand Champion', band[1]], ...(divs.length > 1 ? divs.filter(d => d.champ.a !== grand.a && d.champ.a !== resGrand?.a).map(d => [d.champ.a, `Champion ${d.name}`, band[2]]) : [])].filter(Boolean);
      res.soc = [];
      for (const [a, title, [lo, hi]] of sellers) {
        if (a.temp) continue;
        const price = Math.round(rnd(lo, hi) / 50) * 50;
        res.soc.push({ name: a.name, flock: flockName(a.owner), owner: a.owner, title, price });
        recordSale({ name: a.name, breed: breedLabel(a), type: `${title} — ${show.short} Sale of Champions`, price, seller: flockName(a.owner), buyer: 'Sale of Champions', day: s.day, mine: a.owner === 'P' });
        if (a.owner === 'P') { addCash(price, `Sale of Champions — ${a.name} (${title}, ${show.short})`); news(`${a.name} sold in the ${show.short} Sale of Champions for ${money(price)}.`, 'good', true); if (price >= 5000) achieve('sale_5k'); if (price >= 1000) achieve('sale_1k'); }
        if (a.listing) cancelListingFor(a.id);
        removeAnimal(a.id);
      }
    }
  }

  // freshness: showing wears them down a little; recovers with rest
  for (const a of shown) if (!a.temp && s.animals[a.id]) a.load = Math.min(6, (a.load || 0) + 1);
  const myShown = [...shown].filter(a => a.owner === 'P').length;
  if (myShown) addCash(-haulCost(show, myShown), `Hauling — ${show.short} (${myShown} head)`);

  const hadMine = ['market', 'breeding', 'commercial'].some(d => (e[d] || []).length);
  s.results.unshift(res);
  let others = 0; s.results = s.results.filter(r => r.mine.length || (hadMine && r === res) || (++others <= 12));
  delete s.entries[show.key]; delete s.judges[show.key]; if (s.plans) delete s.plans[show.key];
  if (hadMine) { toast(`${show.short} results are in!`, 'show'); news(`Results posted: ${show.name}. ${res.mine.map(m => `${m.name}: ${m.text}`).join(' · ')}`, 'show', true); }
  return res;
}

// ---------- show series ----------
const SERIES_NICK = { OH: 'Buckeye', IN: 'Hoosier', MI: 'Great Lakes', KY: 'Bluegrass', PA: 'Keystone State', WV: 'Mountaineer', TX: 'Lone Star', IA: 'Hawkeye', IL: 'Prairie State', WI: 'Badger', MN: 'North Star', MO: 'Show-Me', NE: 'Cornhusker', KS: 'Sunflower', OK: 'Sooner', CO: 'Centennial', CA: 'Golden State', AZ: 'Copper State', NM: 'Land of Enchantment', UT: 'Beehive', ID: 'Gem State', OR: 'Beaver State', WA: 'Evergreen', MT: 'Big Sky', SD: 'Mount Rushmore', ND: 'Peace Garden', WY: 'Cowboy State', NY: 'Empire State', VA: 'Old Dominion', TN: 'Volunteer', NC: 'Tar Heel', GA: 'Peach State', MD: 'Old Line', AL: 'Heart of Dixie', AR: 'Natural State', LA: 'Pelican', MS: 'Magnolia', SC: 'Palmetto', FL: 'Sunshine State', VT: 'Green Mountain', NH: 'Granite State', ME: 'Pine Tree', MA: 'Bay State', CT: 'Nutmeg', NJ: 'Garden State', DE: 'First State', NV: 'Silver State', HI: 'Aloha', AK: 'Last Frontier', RI: 'Ocean State' };
export const seriesNameFor = st => `${SERIES_NICK[st] || STATES[st]} Jackpot Series`;
function seriesPoints(show, a, pts) {
  if (a.temp) return;
  const s = S(); s.series = s.series || {};
  const key = `${show.series}|${yearOf(show.day)}`;
  const sr = s.series[key] || (s.series[key] = { name: show.series, year: yearOf(show.day), host: show.host, animals: {}, farms: {}, shows: 0, lastDay: 0 });
  if (sr.lastDay !== show.day || sr.lastKey !== show.key) { sr.shows++; sr.lastDay = show.day; sr.lastKey = show.key; }
  const r = sr.animals[a.id] || (sr.animals[a.id] = { name: a.name, tag: a.tag, owner: a.owner, flock: flockName(a.owner), breed: breedLabel(a), sex: a.sex, pts: 0 });
  r.pts += pts; r.name = a.name; r.sex = a.sex;
  sr.farms[a.owner] = (sr.farms[a.owner] || 0) + pts;
}
export const SERIES_PRIZES = [1000, 500, 250];
function seriesPayout(year) {
  const s = S(); if (!s.series) return;
  for (const [key, sr] of Object.entries(s.series)) {
    if (sr.year !== year || sr.paid) continue;
    sr.paid = true;
    const top = sx => Object.entries(sr.animals).filter(([, r]) => (r.sex || 'W') === sx).sort((x, y) => y[1].pts - x[1].pts).slice(0, 3);
    const topW = top('W'), topE = top('E'), topR = top('R');
    const topA = [...topW, ...topE, ...topR];
    const topF = Object.entries(sr.farms).sort((x, y) => y[1] - x[1]).slice(0, 3);
    sr.final = { wether: topW.map(([id, r]) => ({ id, ...r })), ewe: topE.map(([id, r]) => ({ id, ...r })), ram: topR.map(([id, r]) => ({ id, ...r })), farms: topF.map(([fid, pts]) => ({ fid, name: flockName(fid), pts })) };
    const give = (owner, place, label) => {
      const f = flock(owner); if (f) f.rep = (f.rep || 0) + [6, 4, 2][place];
      if (owner === 'P') {
        addCash(SERIES_PRIZES[place], `${sr.name} ${year} — ${ordinal(place + 1)} ${label}`);
        s.banners.unshift({ day: s.day, show: sr.name, short: sr.name, title: `${ordinal(place + 1)} ${label} — ${sr.name} ${year} (buckle)`, animal: label === 'high-point flock' ? s.flocks[0].name : '', tier: 'series', kind: place === 0 ? 'grand' : place === 1 ? 'reserve' : 'breed' });
        toast(`🏆 ${sr.name}: ${ordinal(place + 1)} ${label} — +${money(SERIES_PRIZES[place])}`, 'ach');
      }
    };
    topW.forEach(([, r], i) => give(r.owner, i, `high-point wether (${r.name})`));
    topE.forEach(([, r], i) => give(r.owner, i, `high-point ewe (${r.name})`));
    topR.forEach(([, r], i) => give(r.owner, i, `high-point ram (${r.name})`));
    topF.forEach(([fid], i) => give(fid, i, 'high-point flock'));
    if (topF[0]) news(`${sr.name} ${year} final standings: high-point flock ${flockName(topF[0][0])}${topW[0] ? `, wether ${topW[0][1].name}` : ''}${topE[0] ? `, ewe ${topE[0][1].name}` : ''}${topR[0] ? `, ram ${topR[0][1].name}` : ''}.`, 'show', topF.some(([f]) => f === 'P') || topA.some(([, r]) => r.owner === 'P'));
  }
}

const MO = ['Blackface Cross', 'Whiteface Cross', 'Natural', 'Dorper', 'Dorset', 'Hampshire', 'Oxford', 'Shropshire', 'Southdown', 'Suffolk', 'AOB', 'Market Lambs'];
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
  if (a.dam) { s.damStats = s.damStats || {}; const dt = s.damStats[a.dam] || (s.damStats[a.dam] = { name: a.damName, banners: 0 }); dt.banners++; }
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
  const wt = type === 'club' && Math.random() < (opts.wtChance ?? 0.35) ? pick(WT_BREEDS) : null;
  const season = wpick({ early: 0.2, winter: 0.45, late: 0.2, fall: 0.15 });
  const skill = clamp(opts.skill ?? Math.pow(Math.random(), 1.3), 0, 1);
  const name = `${sur} ${suf}`;
  return {
    id: 'F' + i, name: s.flocks.some(f => f.name === name) ? `${sur} & Sons ${suf}` : name, state: opts.state || wState(), type, breed, skill,
    q: -2 + skill * 12 + randn() * 1.5, rep: Math.round(skill * skill * 60), banners: 0, prefix: sur.slice(0, 3).toUpperCase(), seq: 0,
    size: opts.size || irnd(5, 13), season, fall: season === 'fall', wt, founded: s.day,
  };
}
function stockFlock(f, withLambs) {
  const madeE = [], madeR = [];
  const club = f.type === 'club';
  const ewes = f.size;
  for (let i = 0; i < ewes; i++) {
    const breed = club ? (f.wt ? (Math.random() < 0.85 ? f.wt : 'Crossbred') : (Math.random() < 0.85 ? 'Crossbred' : pick(['Suffolk', 'Hampshire', 'Southdown', 'Shropshire', pick(WT_BREEDS)]))) : f.breed;
    const comp = pick(['Hampshire × Suffolk', 'Suffolk × Hampshire', 'Hampshire × Southdown', 'Suffolk × Shropshire', 'Southdown × Hampshire']);
    madeE.push(addAnimal(makeFounder({ breed, sex: 'E', ageDays: irnd(400, 2300), owner: f.id, q: f.q, comp, face: 'black', keep: true })));
  }
  const rams = f.size > 9 ? 2 : 1;
  for (let i = 0; i < rams; i++) {
    const breed = club ? (f.wt && Math.random() < 0.8 ? f.wt : pick(['Hampshire', 'Suffolk', 'Southdown', 'Crossbred', 'Wether-Type Hampshire', 'Wether-Type Suffolk', 'Shropshire', 'Dorset'])) : f.breed;
    madeR.push(addAnimal(makeFounder({ breed, sex: 'R', ageDays: irnd(400, 1500), owner: f.id, q: f.q + 1.5, comp: 'Hampshire × Suffolk', face: 'black', keep: true })));
  }
  if (withLambs) {
    const n = Math.round(ewes * rnd(1.1, 1.6));
    const dams = madeE; const sire = madeR[0];
    for (let i = 0; i < n; i++) {
      const d = pick(dams); const age = { early: irnd(250, 290), winter: irnd(190, 230), late: irnd(150, 185), fall: irnd(330, 380) }[f.season || 'winter'];
      const a = offspring(d, snapshot(sire), f.id);
      a.birth = S().day - age; a.wt = weightForAge(age, frameOf(a), a.sex) * (1 + a.bv.PWG / 60) * rnd(0.92, 1.05);
      if (a.sex === 'R') a.sex = (a.reg && Math.random() < 0.3) ? 'R' : 'W';
      a.cond = clamp(2.6 + f.skill * 0.6 + randn() * 0.3, 1.5, 4.5); a.fit = 50; a.train = 50;
      if (a.sex === 'R') a.keep = true;
      d.prog++; addAnimal(a);
    }
  }
}

// ---------- new game ----------
// Starter builder: breed (or 'Blackface cross' / 'Whiteface cross'), sex E/R/W, age key
export const STARTER_AGES = [['lamb3', 'Lamb, 2–3 mo', 65, 95], ['lamb6', 'Lamb, 4–6 mo', 120, 180], ['year', 'Yearling', 400, 700], ['y23', '2–3 yr', 730, 1095], ['y45', '4–5 yr', 1460, 1825]];
export const STARTER_LIMITS = { E: 15, R: 3, W: 4 };
export function makeStarter(breedKey, sex, ageKey) {
  const ag = STARTER_AGES.find(x => x[0] === ageKey) || STARTER_AGES[3];
  const cross = ['Blackface cross', 'Whiteface cross', 'Speckleface cross', 'Natural (club)'].includes(breedKey);
  const breed = cross ? 'Crossbred' : breedKey;
  const face = breedKey === 'Whiteface cross' ? 'white' : cross ? 'black' : undefined;
  const comp = breedKey === 'Whiteface cross' ? 'Dorset × Montadale' : pick(['Hampshire × Suffolk', 'Suffolk × Hampshire', 'Hampshire × Southdown', 'Suffolk × Shropshire']);
  const a = makeFounder({ breed, sex, ageDays: irnd(ag[2], ag[3]), owner: 'P', q: rnd(1, 6) + (sex === 'R' ? 1 : 0), comp, face });
  if (breedKey === 'Speckleface cross') { a.fg = 'BW'; a.face = Math.random() < 0.55 ? 'speckle' : 'smut'; a.comp = 'Hampshire × Dorset'; a.blood = bloodOf('Crossbred', a.comp); }
  if (breedKey === 'Natural (club)') { a.blk = 2; a.fg = 'BB'; a.face = 'black'; }
  if (ageDays(a) < 365) { a.cond = 2.8; a.fit = 60; a.train = 50; }
  return a;
}
export function starterOptions() {
  const s = S();
  const q = () => rnd(1, 6);
  const ewes = [
    makeFounder({ breed: 'Crossbred', sex: 'E', ageDays: irnd(500, 1300), owner: 'P', q: q(), comp: 'Hampshire × Suffolk', face: 'black' }),
    makeFounder({ breed: 'Crossbred', sex: 'E', ageDays: irnd(500, 1300), owner: 'P', q: q(), comp: 'Suffolk × Southdown', face: 'black' }),
    makeFounder({ breed: 'Crossbred', sex: 'E', ageDays: irnd(500, 1300), owner: 'P', q: q(), comp: 'Hampshire × Shropshire', face: 'black' }),
    makeFounder({ breed: 'Commercial', sex: 'E', ageDays: irnd(500, 1300), owner: 'P', q: q() - 1, face: 'white' }),
    ...['Wether-Type Hampshire', 'Wether-Type Suffolk', 'Wether-Type Southdown', 'Wether-Type Dorset'].map(b => makeFounder({ breed: b, sex: 'E', ageDays: irnd(450, 1300), owner: 'P', q: q() })),
    ...['Suffolk', 'Hampshire', 'Southdown', 'Shropshire', 'Dorset', 'Oxford', 'Natural Colored', 'Montadale', 'Texel', 'Dorper', 'Katahdin']
      .map(b => makeFounder({ breed: b, sex: 'E', ageDays: irnd(450, 1400), owner: 'P', q: q() })),
  ];
  // young, show-ready options: a mix of 2–3 month and 4–6 month lambs
  const young = () => Math.random() < 0.5 ? irnd(65, 95) : irnd(120, 180);
  const kid = (breed, sex, comp) => { const a = makeFounder({ breed, sex, ageDays: young(), owner: 'P', q: q() + 0.5, comp: comp || 'Hampshire × Suffolk', face: 'black' }); a.cond = 2.8; a.fit = 60; a.train = 50; return a; };
  ewes.push(...[['Crossbred', 'Hampshire × Suffolk'], ['Crossbred', 'Suffolk × Southdown'], ['Wether-Type Hampshire'], ['Wether-Type Southdown'], ['Suffolk'], ['Southdown'], ['Hampshire'], ['Dorset']].map(([b, c]) => kid(b, 'E', c)));
  const rams = ['Hampshire', 'Suffolk', 'Southdown', 'Shropshire', 'Dorset', 'Crossbred', 'Wether-Type Hampshire', 'Wether-Type Suffolk', 'Wether-Type Shropshire', 'Texel', 'Oxford']
    .map(b => makeFounder({ breed: b, sex: 'R', ageDays: irnd(400, 1000), owner: 'P', q: q() + 1, comp: 'Hampshire × Suffolk', face: 'black' }));
  rams.push(...['Hampshire', 'Suffolk', 'Southdown', 'Wether-Type Hampshire', 'Crossbred'].map(b => kid(b, 'R')));
  const wethers = [['Crossbred', 'Hampshire × Suffolk'], ['Crossbred', 'Suffolk × Shropshire'], ['Crossbred', 'Hampshire × Southdown'], ['Wether-Type Hampshire'], ['Wether-Type Suffolk'], ['Wether-Type Southdown'], ['Wether-Type Dorset'], ['Wether-Type Shropshire']].map(([b, c]) => kid(b, 'W', c));
  return { ewes, rams, wethers };
}
export function createWorld({ flockName: fname, home, county }) {
  G.s = {
    v: 1, day: 0, frac: 0, nextId: 1, cash: 15000, home, county: (county || '').replace(/\s*county\s*$/i, '').trim(),
    flocks: [], animals: {}, listings: [], directory: [], tank: [], embryos: [], entries: {}, judges: {}, results: [],
    news: [], toasts: [], ledger: [], topSales: [], sireStats: {}, banners: [], ach: {}, stats: { born: 0, semen: 0 },
    settings: { speed: 1, pauseShows: true, pauseLambing: true }, paused: true, started: false,
  };
  const s = G.s;
  const initials = fname.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'ME';
  s.flocks.push({ id: 'P', name: fname, state: home, type: 'player', skill: 1, rep: 0, banners: 0, prefix: initials, seq: 0, founded: 0 });
  // make sure the home state has competition
  const homeCount = 18 + irnd(0, 8);
  for (let i = 0; i < START_FLOCKS; i++) s.flocks.push(makeFlock(i + 1, i < homeCount ? { state: home } : {}));
  // a handful of national-caliber outfits
  s.flocks.slice(1, 1 + 22).forEach(f => { f.skill = rnd(0.85, 1); f.q = 9 + rnd(0, 4); f.rep = irnd(60, 140); });
  s.nextFlock = START_FLOCKS + 1;
  return s;
}
export function finishSetup(ewes, ram, wethers = []) {
  const s = S();
  pens();
  const all = Array.isArray(ewes) && ram === undefined ? ewes : [...ewes, ram, ...wethers];
  all.forEach(a => { a.owner = 'P'; a.care = defaultCare(); a.pen = 'main'; if (ageDays(a) < 200) a.string = true; addAnimal(a); });
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
    if (a.load) a.load = a.load > 0.02 ? a.load * 0.96 : 0;
    if (a.owner === 'P') {
      if (a.needsHome && age >= 3) { bottle(a.id); news(`${a.name} went on the bottle (auto, ${money(BOTTLE_COST)}).`, 'info', true); }
      if (age === 60 && a.pen === 'creep') { a.pen = penRoom('main') > 0 ? 'main' : 'main'; if (!s.weanNote || s.weanNote !== d) { s.weanNote = d; news(`Weaned lambs moved from the creep pen to the Main pen.`, 'info', true); } }
    }
    if (age < 60) {
      const lf = a.bottle ? 0.88 : a.litter >= 4 ? 0.66 : a.litter === 3 ? 0.75 : a.litter === 2 ? 0.86 : 1;
      const creep = a.owner === 'P' && s.creepFeed !== false && age >= 14 ? 1.12 : a.owner !== 'P' ? 1.06 : 1;
      if (creep > 1 && a.owner === 'P') feedCost += 0.08;
      a.lastAdg = (0.5 + 0.025 * a.bv.WW + 0.03 * (a.damMilk || 0)) * lf * creep * (a.spider === 2 ? 0.5 : 1);
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
          a.cond += ((1.5 + 2.6 * eff + a.bv.FAT * 1.5 - (c.ex || 0) * 0.35 + (a.wt / frameOf(a) - 0.85) * 1.5) - a.cond) * 0.04;
        } else { eff = 0.34; a.tone *= 0.98; a.fit += (35 - a.fit) * 0.03; a.train = Math.max(0, a.train - 0.2); a.cond += (2.4 - a.cond) * 0.03; upkeep += 0.15; }
      } else {
        const f = flock(a.owner); const k = f?.skill ?? 0.5;
        eff = a.keep ? 0.5 : (a.wt / frameOf(a) > 0.93 ? 0.3 : 0.55 + k * 0.38);
        a.cond += ((2.7 + k * 0.5 + a.bv.FAT) - a.cond) * 0.04;
      }
      a.lastAdg = Math.max(a.dwarf === 2 && a.wt > 104 ? 0.01 : 0.05, (0.22 + 0.68 * eff) * (1 + a.bv.PWG / 25) * (frameOf(a) / 140) * growthFx(a) * Math.max(0.03, 1 - Math.max(0, a.wt / frameOf(a) - 0.9) * 3)) * (a.spider === 2 ? 0.5 : 1);
      a.wt += a.lastAdg;
    } else {
      const mature = frameOf(a) * (a.dwarf === 2 ? 1.05 : a.sex === 'R' ? 1.65 : 1.22);
      a.wt += (mature - a.wt) * 0.004; a.cond += (3 - a.cond) * 0.02; a.lastAdg = 0;
      if (a.owner === 'P') upkeep += 0.25;
    }
    // AI flock management of young rams
    if (age === 60 && a.sex === 'R') {
      if (a.owner === 'P') { /* your ram lambs stay intact until you wether them */ }
      else if (!a.reg || Math.random() > 0.3) a.sex = 'W';
      else a.keep = true;
    }
  }
  if (!Number.isFinite(feedCost + upkeep)) { console.warn('feed cost NaN'); feedCost = 0; upkeep = 0; }
  if (feedCost + upkeep > 0) { s.cash -= feedCost + upkeep; s.feedToday = feedCost + upkeep; s.feedMonth = (s.feedMonth || 0) + feedCost + upkeep; }
  if (dm === 1 && (s.tank.length || s.embryos.length)) addCash(-TANK_FEE, 'Semen tank & embryo storage (monthly)');
  if (dm === 1) addCash(-OVERHEAD, 'Farm overhead — bedding, fencing, utilities (monthly)');
  if (dm === 1 && s.loan && s.loan.balance > 0) {
    const L = s.loan; const int = L.balance * L.rate / 12; const pay = Math.min(L.balance + int, L.payment);
    L.balance = Math.max(0, L.balance + int - pay); addCash(-pay, `Loan payment (${money(int)} interest)`);
    if (L.balance < 1) { s.loan = null; news('Your bank loan is paid off.', 'good', true); }
  }
  if (dm === 1 && s.feedMonth) { s.ledger.unshift({ day: d, n: -Math.round(s.feedMonth), why: 'Feed, bedding & upkeep (last month)' }); s.feedMonth = 0; }

  // leased rams go home
  for (const a of all) if (a.sex === 'R') {
    if (a.leasedTo === 'P' && a.leaseUntil <= d) { delete a.leasedTo; delete a.leaseUntil; news(`${a.name}'s lease is up — he went home to ${flockName(a.owner)}.`, 'info', true); }
    if (a.away && a.away === d && a.owner === 'P') news(`${a.name} is back home from his lease.`, 'good', true);
  }
  // auto slick-shear everything entered in tomorrow's shows
  { const keys = [...jackpotsOn(d + 1).map(x => x.key)];
    for (const sh of allShows()) { const y = yearOf(d + 1); if (dayOf(y, sh.m, sh.d) === d + 1) keys.push(`${sh.id}-${y}`); }
    const ids = new Set();
    for (const k of keys) { const e = s.entries[k]; if (e) for (const div of ['market', 'breeding', 'commercial']) (e[div] || []).forEach(id => ids.add(id)); }
    const list = [...ids].map(id => s.animals[id]).filter(a => a && a.owner === 'P' && a.death == null);
    if (list.length) { addCash(-list.length * SHEAR_COST, `Show-eve slick shearing — ${list.length} head`); list.forEach(a => a.shorn = d); }
  }
  // shows today
  for (const sh of jackpotsOn(d)) runShow(sh);
  if (m === 10 && dm === 1) seriesPayout(yearOf(d));
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
  aiListings();
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
    if (Math.random() < 0.035 + F * 1.3 + (p.count >= 4 ? 0.12 : p.count === 3 ? 0.07 : 0)) { still++; continue; }
    const a = offspring(dam, sire, ewe.owner, p.donor ? ewe : null);
    a.litter = p.count; addAnimal(a); born.push(a);
    if (ewe.owner === 'P') a.pen = 'creep';
    if (s.animals[dam.id]) s.animals[dam.id].prog++;
    if (s.animals[sire.id]) s.animals[sire.id].prog++;
  }
  ewe.lambed = s.day;
  if (ewe.owner === 'P') {
    s.newLambs = (s.newLambs || []).concat(born.map(a => a.id));
    if (born.length > 2) born.slice(2).forEach(a => { a.needsHome = true; a.damId = ewe.id; s.bottleQ = (s.bottleQ || []).concat(a.id); });
    if (born.length > 2) news(`${ewe.name} can only raise two — ${born.length - 2} extra lamb${born.length > 3 ? 's need' : ' needs'} grafting onto another ewe or bottle feeding.`, 'bad', true);
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

// Extra lambs: graft onto a ewe that lost/has a single, or bottle-feed ($60, small setback)
export const BOTTLE_COST = 60;
export function graftCandidates() {
  const s = S();
  return myAnimals().filter(e => e.sex === 'E' && e.lambed != null && s.day - e.lambed <= 10 && myAnimals().filter(k => k.dam === e.id && ageDays(k) <= 10 && !k.grafted).length + myAnimals().filter(k => k.foster === e.id).length < 2);
}
export function graft(lambId, eweId) {
  const s = S(); const a = s.animals[lambId]; const e = s.animals[eweId];
  if (!a || !a.needsHome) return 'Already taken care of.';
  if (!e || !graftCandidates().includes(e)) return 'That ewe can’t take another lamb.';
  a.needsHome = false; a.grafted = true; a.foster = e.id; a.litter = 2; a.damMilk = e.bv.MILK; s.bottleQ = (s.bottleQ || []).filter(x => x !== lambId);
  news(`${a.name} grafted onto ${e.name}.`, 'good', true); return null;
}
export function bottle(lambId) {
  const s = S(); const a = s.animals[lambId];
  if (!a || !a.needsHome) return 'Already taken care of.';
  addCash(-BOTTLE_COST, `Milk replacer — ${a.name}`); a.needsHome = false; a.bottle = true; a.litter = 1; s.bottleQ = (s.bottleQ || []).filter(x => x !== lambId);
  return null;
}
function aiCalendar(d, m, dm) {
  const s = S();
  // Aug 1: culling, retention, flock size drift
  if (m === 7 && dm === 1) {
    const idx = byOwner();
    for (const f of s.flocks) {
      if (f.id === 'P') continue;
      const mine = idx.get(f.id) || [];
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
      if (!mine.some(a => s.animals[a.id] && a.sex === 'R' && ageDays(a) > 200)) {
        const breed = f.type === 'club' ? pick(['Hampshire', 'Suffolk', 'Southdown', 'Crossbred']) : f.breed;
        addAnimal(makeFounder({ breed, sex: 'R', ageDays: irnd(300, 700), owner: f.id, q: f.q + 1, comp: 'Hampshire × Suffolk', face: 'black', keep: true }));
      }
      f.q += 0.15; // flocks slowly improve
    }
  }
  // breeding: Sep 1 (spring lambing) / Mar 20 (fall lambing flocks), retries a month later
  const y = yearOf(d);
  const BD = { early: [7, 1], winter: [8, 1], late: [9, 15], fall: [2, 20] };
  const todayFor = {};
  for (const [k, [bm, bd]] of Object.entries(BD)) { const t0 = dayOf(y, bm, bd); todayFor[k] = d === t0 || d === t0 + 35 || dayOf(y - 1, bm, bd) + 35 === d; }
  if (Object.values(todayFor).some(Boolean)) {
    const idx = byOwner();
    for (const f of s.flocks) {
      if (f.id === 'P') continue;
      if (!todayFor[f.season || (f.fall ? 'fall' : 'winter')]) continue;
      const mine = (idx.get(f.id) || []).filter(a => s.animals[a.id] && a.owner === f.id);
      const rams = mine.filter(a => a.sex === 'R' && ageDays(a) > 200 && ramHome(a)).sort((x, y) => breedingIndex(y) - breedingIndex(x));
      const ewes = mine.filter(a => a.sex === 'E' && a.keep && canBreed(a));
      if (!ewes.length) continue;
      let useAI = Math.random() < 0.25 + f.skill * 0.4;
      let dir = null, leased = null;
      const fits = x => x.owner !== f.id && (f.type === 'club' || x.snap.breed === f.breed);
      // lease a ram from your directory listing
      const leaseOpts = s.directory.filter(x => x.owner === 'P' && x.lease && fits(x) && s.animals[x.ramId] && ramHome(s.animals[x.ramId]) && s.animals[x.ramId].owner === 'P');
      if (leaseOpts.length && Math.random() < 0.12) {
        const x = leaseOpts.map(x => ({ x, sc: breedingIndex(x.snap) - x.lease / 60 + randn() * 4 })).sort((a, b) => b.sc - a.sc)[0];
        if (!rams[0] || x.sc > breedingIndex(rams[0]) - 4) {
          leased = s.animals[x.x.ramId]; leased.away = s.day + LEASE_DAYS; x.x.leases = (x.x.leases || 0) + 1;
          addCash(x.x.lease, `Lease — ${leased.name} to ${f.name}`);
          news(`${f.name} leased ${leased.name} for ${money(x.x.lease)} — he’s gone ${LEASE_DAYS} days (back ${fmtShort(leased.away)}). You can still AI with his collected semen.`, 'good', true);
        }
      }
      if (useAI && s.directory.length) {
        const opts = s.directory.filter(x => fits(x) && x.price > 0 && strawsLeft(x) > 0);
        if (opts.length) dir = opts.map(x => ({ x, sc: breedingIndex(x.snap) - x.price / 25 + randn() * 3 })).sort((a, b) => b.sc - a.sc)[0].x;
      }
      ewes.forEach((e, i) => {
        if (leased && i < 6) settle(e, snapshot(leased), 'Natural');
        else if (dir && i < irnd(1, 5) && strawsLeft(dir) > 0) {
          settle(e, dir.snap, 'AI');
          dir.sold++; if (dir.stock != null) dir.stock--;
          if (dir.owner === 'P') { addCash(dir.price, `Semen sale — ${dir.snap.name} to ${f.name}`); s.stats.semen++; if (s.stats.semen >= 10) achieve('semen_10'); news(`${f.name} bought a straw of ${dir.snap.name} for ${money(dir.price)}${dir.stock != null ? ` (${dir.stock} left)` : ''}.`, 'good', true); }
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
  if (n >= 700) return;
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
// Skip ahead the full amount — auto-pauses don't interrupt a skip
export function advance(days) {
  const s = S(); let n = 0;
  while (n < days) { s.paused = false; simDay(); n++; }
  s.paused = true; s.frac = 0;
  return n;
}
export function daysToNextMonth() { const t = dateOf(S().day); const nx = Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); return Math.round((nx - t.getTime()) / 864e5); }
// Bulk entries: each animal goes into every division it qualifies for that you've ticked; out-of-weight lambs are skipped
export function bulkPlan(ids, keys, divs) {
  const s = S(); const plan = []; let fee = 0, skipped = 0;
  for (const key of keys) {
    const sh = findShow(key); if (!sh || sh.day <= s.day) continue;
    const e = s.entries[key] || {}; const item = { show: sh, market: [], breeding: [], commercial: [] };
    for (const id of ids) {
      const a = s.animals[id]; if (!a || a.owner !== 'P' || a.listing) continue;
      if (divs.market && !marketEligible(a, sh)) {
        const w = projectedWeight(a, sh.day - s.day);
        if (w < sh.minWt || w > sh.maxWt) skipped++; else if (!(e.market || []).includes(id)) item.market.push(id);
      }
      if (divs.breeding && sh.breeding && !breedingEligible(a, sh) && !(e.breeding || []).includes(id)) item.breeding.push(id);
      if (divs.commercial && sh.commercial && !commercialEligible(a, sh) && !(e.commercial || []).includes(id)) item.commercial.push(id);
    }
    const n = item.market.length + item.breeding.length + item.commercial.length;
    if (n) { plan.push(item); fee += n * sh.fee; }
  }
  return { plan, fee, skipped, head: plan.reduce((t, p) => t + p.market.length + p.breeding.length + p.commercial.length, 0) };
}
export function bulkEnter(ids, keys, divs) {
  const s = S(); const b = bulkPlan(ids, keys, divs);
  if (!b.head) return 'Nothing to enter — no eligible animals for those shows.';
  if (b.fee > s.cash) return `Entry fees total ${money(b.fee)} — not enough cash.`;
  for (const p of b.plan) for (const d of ['market', 'breeding', 'commercial']) if (p[d].length) enterShow(p.show, p[d], d);
  return null;
}
export { S as state };
