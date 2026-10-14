export const SHEEP_PATH = "M544,20 L538,15 L526,11 L462,9 L456,11 L441,26 L438,26 L416,15 L408,16 L402,19 L401,26 L404,35 L414,45 L420,48 L437,51 L442,56 L443,60 L440,99 L435,131 L430,142 L420,150 L338,162 L157,180 L143,185 L133,199 L112,238 L101,263 L99,276 L100,317 L97,325 L86,338 L51,362 L38,376 L31,403 L18,474 L18,483 L21,489 L42,505 L63,517 L88,517 L103,515 L111,510 L115,492 L122,419 L127,396 L133,384 L184,324 L194,315 L202,316 L241,337 L254,340 L264,340 L269,344 L273,344 L408,300 L417,299 L420,302 L422,309 L422,461 L427,474 L434,480 L441,483 L462,486 L471,493 L482,497 L498,497 L509,494 L511,490 L494,299 L495,276 L499,267 L507,257 L510,235 L510,204 L502,150 L499,85 L503,77 L546,38 L547,26Z";
// ---------- Traits & EPDs ----------
export const TRAITS = ['muscle', 'dimension', 'balance', 'structure', 'bone', 'look', 'breed', 'fresh'];
export const TRAIT_LABEL = { muscle: 'Muscle', dimension: 'Dimension', balance: 'Balance', structure: 'Structure', bone: 'Bone', look: 'Look', breed: 'Breed character', fresh: 'Freshness' };

// sd = genetic spread of the breeding value; dec = decimals to show
export const EPDS = [
  { k: 'BW', label: 'Birth Wt', unit: 'lb', sd: 0.4, dec: 2 },
  { k: 'WW', label: 'Weaning Wt', unit: 'lb', sd: 2.0, dec: 1 },
  { k: 'PWG', label: 'Post-Wean Gain', unit: 'lb', sd: 3.0, dec: 1 },
  { k: 'LMD', label: 'Loin Muscle', unit: 'mm', sd: 0.5, dec: 2 },
  { k: 'FAT', label: 'Fat', unit: 'mm', sd: 0.2, dec: 2 },
  { k: 'MILK', label: 'Milk', unit: 'lb', sd: 1.2, dec: 1 },
  { k: 'NLB', label: 'Number Born', unit: '%', sd: 5, dec: 1 },
];

// ---------- Breeds ----------
// face: black | white | brown | colored ; colors: fleece/head/legs ; pattern: optional head/leg pattern id
// t = trait offsets from 50 [muscle, dimension, balance, structure, bone, look]; frame = ideal finish weight (lb)
// spider = carrier frequency ; rr = RR allele frequency (scrapie codon 171)
const B = (name, face, fleece, head, legs, t, frame, extra = {}) => ({ name, face, fleece, head, legs, t, frame, spider: 0, dwarf: 0, rr: 0.55, prolific: 1.6, ...extra });
export const BREEDS = {
  'Border Leicester': B('Border Leicester', 'white', '#f3eee2', '#f9f7f2', '#f9f7f2', [-4, -4, 2, 3, 1, 1], 145, { prolific: 1.8 }),
  'Cheviot': B('Cheviot', 'white', '#f4f0e6', '#fbfaf6', '#fbfaf6', [-1, 0, 2, 2, -2, 3], 112),
  'Columbia': B('Columbia', 'white', '#efe8d8', '#f8f5ee', '#f8f5ee', [-2, -1, 1, 2, 3, 0], 150),
  'Corriedale': B('Corriedale', 'white', '#ece5d4', '#f7f4ec', '#f7f4ec', [-3, -2, 1, 2, 1, 0], 135),
  'Dorper': B('Dorper', 'black', '#fbfaf6', '#151515', '#fbfaf6', [4, 6, 0, -1, 2, 0], 125, { prolific: 1.5 }),
  'Dorset': B('Dorset', 'white', '#fbfaf6', '#f3eee4', '#f3eee4', [2, 2, 4, 4, 1, 4], 135, { prolific: 1.7, rr: 0.6 }),
  'Dorset Advantage': B('Dorset Advantage', 'white', '#fbfaf6', '#f4efe5', '#f4efe5', [3, 3, 3, 3, 1, 3], 138, { prolific: 1.7 }),
  'Hampshire': B('Hampshire', 'black', '#efe9dc', '#2e211b', '#2e211b', [8, 8, 1, 0, 6, 2], 148, { spider: 0.03 }),
  'Horned Dorset': B('Horned Dorset', 'white', '#fbfaf6', '#f1ece2', '#f1ece2', [1, 1, 2, 3, 1, 2], 140, { prolific: 1.7 }),
  'Katahdin': B('Katahdin', 'colored', '#b98a5a', '#b98a5a', '#b98a5a', [0, 1, 1, 1, -1, 0], 120, { pattern: 'katahdin', prolific: 1.9 }),
  'Kerry Hill': B('Kerry Hill', 'white', '#f5f1e8', 'url(#kerryhead)', 'url(#kerryleg)', [0, 1, 2, 2, 0, 3], 120),
  'Lincoln': B('Lincoln', 'white', '#ede6d3', '#f7f4ec', '#f7f4ec', [-5, -3, 0, 1, 2, -1], 150),
  'Merino': B('Merino', 'white', '#e9e1cd', '#f6f2e8', '#f6f2e8', [-7, -5, 0, 2, -2, 0], 125),
  'Montadale': B('Montadale', 'white', '#f7f4ec', '#fbfaf6', '#fbfaf6', [2, 2, 2, 3, 1, 2], 135),
  'Natural Colored': B('Natural Colored', 'colored', '#2b2622', '#2b2622', '#2b2622', [-2, -2, 1, 1, 0, 0], 125),
  'Oxford': B('Oxford', 'brown', '#efe9dc', '#6b4a33', '#6b4a33', [4, 5, 1, 1, 6, 1], 150, { spider: 0.01 }),
  'Rambouillet': B('Rambouillet', 'white', '#ece5d2', '#f7f4ec', '#f7f4ec', [-5, -3, 1, 2, 1, 0], 145),
  'Romney': B('Romney', 'white', '#eee8d8', '#f8f5ee', '#f8f5ee', [-4, -3, 1, 2, 0, 0], 135),
  'Shropshire': B('Shropshire', 'black', '#efe8d9', '#3a2c25', '#3a2c25', [4, 4, 3, 2, 1, 3], 130, { spider: 0.01 }),
  'Southdown': B('Southdown', 'brown', '#efe6d6', '#9c7656', '#a8835f', [5, 6, 4, 3, -2, 5], 115),
  'Wether-Type Southdown': B('Wether-Type Southdown', 'brown', '#efe6d6', '#9c7656', '#a8835f', [7, 7, 3, 2, -1, 4], 118),
  'Suffolk': B('Suffolk', 'black', '#f4efe6', '#111111', '#111111', [6, 6, 2, 2, 6, 3], 150, { spider: 0.03 }),
  'Texel': B('Texel', 'white', '#f6f2e8', '#fbfaf6', '#fbfaf6', [9, 7, 0, 0, 2, 0], 130),
  'Tunis': B('Tunis', 'brown', '#efe4cf', '#a35a32', '#a35a32', [0, 1, 1, 1, 0, 1], 130),
  'White Dorper': B('White Dorper', 'white', '#fbfaf6', '#fbfaf6', '#fbfaf6', [4, 6, 0, -1, 2, 0], 125, { prolific: 1.5 }),
  // wether-type / club-type purebreds — market lambs, scored on traits only (no EPDs)
  'Wether-Type Dorper': B('Wether-Type Dorper', 'black', '#fbfaf6', '#151515', '#fbfaf6', [6, 7, 1, 0, 3, 2], 130, { reg: false, wt: true, prolific: 1.5 }),
  'Wether-Type Dorset': B('Wether-Type Dorset', 'white', '#fbfaf6', '#f3eee4', '#f3eee4', [5, 5, 4, 3, 2, 4], 138, { reg: false, wt: true, prolific: 1.7 }),
  'Wether-Type Hampshire': B('Wether-Type Hampshire', 'black', '#efe9dc', '#2e211b', '#2e211b', [8, 8, 2, 1, 5, 3], 146, { reg: false, wt: true, spider: 0.02 }),
  'Wether-Type Oxford': B('Wether-Type Oxford', 'brown', '#efe9dc', '#6b4a33', '#6b4a33', [6, 6, 2, 2, 5, 2], 146, { reg: false, wt: true }),
  'Wether-Type Shropshire': B('Wether-Type Shropshire', 'black', '#efe8d9', '#3a2c25', '#3a2c25', [6, 6, 3, 2, 2, 4], 134, { reg: false, wt: true }),
  'Wether-Type Suffolk': B('Wether-Type Suffolk', 'black', '#f4efe6', '#111111', '#111111', [7, 7, 2, 2, 5, 3], 148, { reg: false, wt: true, spider: 0.02 }),
  // non-registered
  'Commercial': B('Commercial', 'white', '#f2ede2', '#f8f5ee', '#f8f5ee', [0, 0, 1, 1, 0, 0], 140, { reg: false, prolific: 1.7 }),
  'Crossbred': B('Crossbred', 'black', '#f2ede2', '#151515', '#151515', [5, 5, 2, 1, 4, 3], 140, { reg: false }),
};
export const WT_BREEDS = Object.keys(BREEDS).filter(b => b.startsWith('Wether-Type '));
export const baseBreed = b => b.startsWith('Wether-Type ') ? b.slice(12) : b;
export const REG_BREEDS = Object.keys(BREEDS).filter(b => BREEDS[b].reg !== false);

export const MARKET_CLASSES = ['Blackface Cross', 'Whiteface Cross', 'Natural', 'Dorper', 'Dorset', 'Hampshire', 'Oxford', 'Shropshire', 'Southdown', 'Suffolk', 'AOB'];
// What each market breed class looks for at the breed check (face color + breed type)
export const BREED_CHECK = {
  Hampshire: ['black', 'brown'], Suffolk: ['black'], Shropshire: ['black', 'brown'], Southdown: ['brown'], Oxford: ['brown'],
  Dorset: ['white'], Dorper: ['black'],
};

// ---------- Feeds ----------
export const FEEDS = [
  { id: 'pasture', name: 'Pasture & hay', energy: 0.32, cost: 0.04, note: 'Maintenance — slow growth' },
  { id: 'grower', name: 'Lamb Grower 18%', energy: 0.68, cost: 0.22, note: 'Builds frame on young lambs' },
  { id: 'developer', name: 'Show Developer 16%', energy: 0.8, cost: 0.26, note: 'Balanced gain and finish' },
  { id: 'finisher', name: 'Finisher 14%', energy: 0.9, cost: 0.25, note: 'Pushes weight and cover' },
  { id: 'fat', name: 'Developer + Fat Supplement', energy: 0.97, cost: 0.36, note: 'Max energy — watch condition' },
];
export const FEED_BY_ID = Object.fromEntries(FEEDS.map(f => [f.id, f]));

// ---------- States ----------
export const STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
// rough weighting of where show-lamb flocks are
export const STATE_WEIGHT = { OH: 14, TX: 12, IN: 8, PA: 7, IA: 6, MI: 5, KY: 4, IL: 5, WI: 3, MN: 3, MO: 3, NE: 3, KS: 3, OK: 4, CO: 3, CA: 3, AZ: 2, NM: 2, UT: 2, ID: 2, OR: 2, WA: 2, MT: 2, SD: 2, ND: 1, WY: 1, NY: 2, VA: 2, NC: 1, TN: 2, GA: 1, MD: 1, WV: 1, AL: 1, AR: 1, LA: 1, MS: 1, SC: 1, FL: 1, VT: 1, NH: 1, ME: 1, MA: 1, CT: 1, NJ: 1, DE: 1, NV: 1, HI: 0.3, AK: 0.2, RI: 0.3 };

// State fair name + approx month (0-11) / day
const SF = (name, m, d) => ({ name, m, d });
export const STATE_FAIRS = {
  OH: SF('Ohio State Fair', 6, 28), TX: SF('State Fair of Texas', 9, 8), IN: SF('Indiana State Fair', 7, 5), PA: SF('Pennsylvania Farm Show', 0, 8),
  IA: SF('Iowa State Fair', 7, 14), MI: SF('Michigan State Fair', 7, 28), KY: SF('Kentucky State Fair', 7, 20), IL: SF('Illinois State Fair', 7, 12),
  WI: SF('Wisconsin State Fair', 7, 5), MN: SF('Minnesota State Fair', 7, 26), MO: SF('Missouri State Fair', 7, 12), NE: SF('Nebraska State Fair', 7, 28),
  KS: SF('Kansas State Fair', 8, 10), OK: SF('Oklahoma State Fair', 8, 18), CO: SF('Colorado State Fair', 7, 26), CA: SF('California State Fair', 6, 16),
  NY: SF('Great New York State Fair', 7, 24), VA: SF('State Fair of Virginia', 8, 25), WV: SF('State Fair of West Virginia', 7, 12), MD: SF('Maryland State Fair', 7, 28),
  TN: SF('Tennessee State Fair', 8, 8), NC: SF('North Carolina State Fair', 9, 15), GA: SF('Georgia National Fair', 9, 6), SD: SF('South Dakota State Fair', 7, 28),
  ND: SF('North Dakota State Fair', 6, 22), MT: SF('Montana State Fair', 6, 28), ID: SF('Eastern Idaho State Fair', 8, 3), WA: SF('Washington State Fair', 8, 8),
  OR: SF('Oregon State Fair', 7, 28), UT: SF('Utah State Fair', 8, 8), AZ: SF('Arizona National Livestock Show', 0, 3), NM: SF('New Mexico State Fair', 8, 8),
  WY: SF('Wyoming State Fair', 7, 12), LA: SF('LSU AgCenter Livestock Show', 1, 10), MS: SF('Mississippi State Fair', 9, 6), AL: SF('Alabama National Fair', 9, 8),
  AR: SF('Arkansas State Fair', 9, 12), FL: SF('Florida State Fair', 1, 8), SC: SF('South Carolina State Fair', 9, 12), NJ: SF('New Jersey State Fair', 7, 1),
};
export function stateFairOf(st) { return STATE_FAIRS[st] || SF(`${STATES[st]} State Fair`, 7, 15); }

// ---------- Shows ----------
// tier: county | jackpot | state | major | national. scope: who comes (home = home-state flocks only)
export const NATIONAL_SHOWS = [
  { id: 'denver', name: 'National Western Stock Show', short: 'Denver', m: 0, d: 17, tier: 'major', breeding: true, minWt: 105, maxWt: 155, fee: 60 },
  { id: 'fortworth', name: 'Fort Worth Stock Show & Rodeo', short: 'Fort Worth', m: 0, d: 30, tier: 'major', breeding: true, minWt: 105, maxWt: 155, fee: 60 },
  { id: 'sanantonio', name: 'San Antonio Stock Show & Rodeo', short: 'San Antonio', m: 1, d: 14, tier: 'major', breeding: false, minWt: 105, maxWt: 155, fee: 60 },
  { id: 'houston', name: 'Houston Livestock Show', short: 'Houston', m: 2, d: 9, tier: 'major', breeding: true, minWt: 105, maxWt: 155, fee: 75 },
  { id: 'keystone', name: 'Keystone International Livestock Expo', short: 'Keystone', m: 9, d: 3, tier: 'major', breeding: true, minWt: 100, maxWt: 160, fee: 45 },
  { id: 'naile', name: 'North American International Livestock Expo', short: 'NAILE', m: 10, d: 14, tier: 'national', breeding: true, minWt: 100, maxWt: 160, fee: 50 },
];
export function homeShows(st, county) {
  const sname = STATES[st];
  const sf = stateFairOf(st);
  return [
    { id: 'county', name: county ? `${county} County Fair` : 'Home County Fair', short: county ? `${county} Co.` : 'County Fair', m: 6, d: 14, tier: 'county', breeding: true, minWt: 90, maxWt: 165, fee: 10, home: true },
    { id: 'statefair', name: sf.name, short: sf.name.replace(/State Fair( of)?/, 'SF').trim(), m: sf.m, d: sf.d, tier: 'state', breeding: true, minWt: 100, maxWt: 160, fee: 25, home: true },
  ];
}
export const TIER = {
  county: { label: 'County Fair', prem: 25, grand: 400, reserve: 200, breedCh: 60, rep: 2, flocks: 18 },
  jackpot: { label: 'Jackpot', prem: 40, grand: 1000, reserve: 500, breedCh: 150, rep: 3, flocks: 35 },
  state: { label: 'State Fair', prem: 70, grand: 3000, reserve: 1500, breedCh: 300, rep: 8, flocks: 55 },
  major: { label: 'Major', prem: 140, grand: 12000, reserve: 5000, breedCh: 800, rep: 20, flocks: 90 },
  national: { label: 'National', prem: 180, grand: 7500, reserve: 3500, breedCh: 1000, rep: 25, flocks: 140 },
};

// w = club-side trait weights; quirks: wether = extra love for wethers, big = favors the heavy end, fresh = sorts hard on freshness, purist = breed character on the registered side
export const JUDGE_STYLES = [
  { label: 'Power judge — muscle & dimension', w: { muscle: .3, dimension: .23, balance: .1, structure: .09, bone: .07, look: .08, breed: .03, fresh: .1 }, q: { wether: 1.2, big: 0.6 } },
  { label: 'Balance & eye appeal', w: { muscle: .18, dimension: .12, balance: .23, structure: .1, bone: .05, look: .18, breed: .04, fresh: .1 }, q: { wether: 1, fresh: 0.5 } },
  { label: 'Structure first', w: { muscle: .18, dimension: .12, balance: .14, structure: .27, bone: .09, look: .08, breed: .04, fresh: .08 }, q: { wether: 0.8, purist: 0.5 } },
  { label: 'Complete package', w: { muscle: .21, dimension: .16, balance: .16, structure: .14, bone: .07, look: .12, breed: .04, fresh: .1 }, q: { wether: 1 } },
  { label: 'Big-boned & stout', w: { muscle: .22, dimension: .2, balance: .1, structure: .1, bone: .18, look: .08, breed: .03, fresh: .09 }, q: { wether: 1, big: 1 } },
  { label: 'Fresh & correct — sorts on freshness', w: { muscle: .2, dimension: .13, balance: .15, structure: .14, bone: .06, look: .1, breed: .04, fresh: .18 }, q: { wether: 0.9, fresh: 1 } },
  { label: 'Wether man — loves a wether', w: { muscle: .26, dimension: .2, balance: .12, structure: .1, bone: .06, look: .1, breed: .03, fresh: .13 }, q: { wether: 2 } },
  { label: 'Breed purist (registered)', w: { muscle: .2, dimension: .13, balance: .15, structure: .14, bone: .07, look: .1, breed: .1, fresh: .11 }, q: { wether: 0.8, purist: 1 } },
];

// ---------- Names ----------
export const SURNAMES = ['Anderson', 'Baker', 'Bauer', 'Becker', 'Bell', 'Brandt', 'Brooks', 'Burkhart', 'Carter', 'Collins', 'Cooper', 'Cox', 'Davis', 'Decker', 'Dietrich', 'Dunn', 'Eby', 'Ellis', 'Evans', 'Fischer', 'Fleming', 'Ford', 'Fox', 'Frey', 'Gardner', 'Graham', 'Grant', 'Greer', 'Hahn', 'Hall', 'Harper', 'Hartman', 'Hayes', 'Heller', 'Hess', 'Hoffman', 'Holt', 'Hudson', 'Hunt', 'Jansen', 'Keller', 'Kemp', 'Klein', 'Knapp', 'Koch', 'Kramer', 'Lambert', 'Lane', 'Lawson', 'Lehman', 'Long', 'Maier', 'Martin', 'Mast', 'Meyer', 'Miller', 'Moore', 'Morgan', 'Nash', 'Nolan', 'Oberle', 'Owens', 'Parker', 'Paxton', 'Pierce', 'Porter', 'Quinn', 'Ramsey', 'Reed', 'Reiter', 'Rhodes', 'Riley', 'Roth', 'Russell', 'Sauer', 'Schmidt', 'Schultz', 'Shaw', 'Sims', 'Snyder', 'Sommer', 'Stahl', 'Stark', 'Steele', 'Stone', 'Summers', 'Thiel', 'Thompson', 'Tucker', 'Vance', 'Vogel', 'Wagner', 'Walker', 'Ward', 'Weaver', 'Weber', 'Wells', 'West', 'Wolfe', 'Yoder', 'Young', 'Zeller', 'Zimmerman', 'Albright', 'Barnes', 'Cline', 'Doran', 'Easton', 'Fenwick', 'Garrison', 'Hollis', 'Ingram', 'Judd', 'Kessler', 'Landry', 'McCoy', 'Norris', 'Ogden', 'Pruitt', 'Rader', 'Sutter', 'Tate', 'Upton', 'Voss', 'Whitley', 'Yancey'];
export const FLOCK_SUFFIX = ['Club Lambs', 'Show Lambs', 'Sheep Co.', 'Livestock', 'Genetics', 'Show Stock', 'Family Sheep', 'Club Lambs', 'Farms', 'Suffolks', 'Hampshires', 'Southdowns', 'Dorsets'];
export const RAM_NAMES = ['Ace', 'Bandit', 'Blue', 'Boss', 'Buck', 'Cash', 'Chief', 'Clyde', 'Cooper', 'Dash', 'Diesel', 'Duke', 'Gunner', 'Hank', 'Hoss', 'Jet', 'Kobe', 'Maverick', 'Moose', 'Outlaw', 'Ranger', 'Rebel', 'Remy', 'Rocky', 'Rowdy', 'Sarge', 'Scout', 'Tank', 'Thunder', 'Titan', 'Tucker', 'Willie', 'Boone', 'Colt', 'Dozer', 'Gus', 'Jax', 'Major', 'Ritz', 'Stetson', 'Tex', 'Wrangler'];
export const EWE_NAMES = ['Abby', 'Belle', 'Bonnie', 'Clover', 'Daisy', 'Dixie', 'Ella', 'Goldie', 'Hazel', 'Ivy', 'Juno', 'Lacey', 'Lulu', 'Maggie', 'Mabel', 'Nellie', 'Pearl', 'Penny', 'Rosie', 'Ruby', 'Sadie', 'Stella', 'Sugar', 'Trixie', 'Willow', 'Zoey', 'Annie', 'Birdie', 'Coco', 'Delta', 'Georgia', 'Holly', 'Josie', 'Lola', 'Minnie', 'Olive', 'Rita', 'Tilly'];
export const SHOW_NAMES = ['Legend', 'Big Time', 'Showtime', 'High Roller', 'Main Event', 'Grand Slam', 'Bad Habit', 'Top Shelf', 'Payday', 'Full Send', 'Game Changer', 'Dynamite', 'Sure Shot', 'Wildfire', 'Ringmaster', 'Backdraft', 'Fireball', 'Ember', 'Jackpot', 'Headliner', 'Wild Card', 'Hot Shot', 'Long Shot', 'Prime Time', 'Blue Chip', 'Knockout'];
export const LAMB_NAMES = [...RAM_NAMES, ...EWE_NAMES, ...SHOW_NAMES];

// ---------- Achievements ----------
export const ACHIEVEMENTS = [
  { id: 'first_lamb', name: 'First Crop', desc: 'Your first lamb hits the ground', cash: 250 },
  { id: 'first_class', name: 'Blue Ribbon', desc: 'Win a class at any show', cash: 250 },
  { id: 'county_champ', name: 'Hometown Hero', desc: 'Grand or reserve at the county fair', cash: 500 },
  { id: 'breed_champ', name: 'Breed Champion', desc: 'Win a breed or division championship', cash: 750 },
  { id: 'jackpot_grand', name: 'Jackpot Winner', desc: 'Grand champion at a jackpot', cash: 1000 },
  { id: 'state_grand', name: 'State Fair Grand', desc: 'Grand champion at your state fair', cash: 2500 },
  { id: 'major_banner', name: 'Big Stage', desc: 'Any championship at a major show', cash: 3000 },
  { id: 'naile_grand', name: 'Louisville Legend', desc: 'Supreme or grand champion at NAILE', cash: 5000 },
  { id: 'sale_1k', name: 'Paid Day', desc: 'Sell an animal for $1,000+', cash: 250 },
  { id: 'sale_5k', name: 'Headliner', desc: 'Sell an animal for $5,000+', cash: 1000 },
  { id: 'semen_10', name: 'Stud Business', desc: 'Sell 10 straws of semen', cash: 500 },
  { id: 'et_lamb', name: 'Flush & Go', desc: 'First embryo-transfer lamb born', cash: 500 },
  { id: 'flock_50', name: 'Growing Operation', desc: 'Own 50 head at once', cash: 1000 },
  { id: 'rr_ram', name: 'Clean Bill', desc: 'Test a ram scrapie RR', cash: 150 },
  { id: 'banners_25', name: 'Banner Wall', desc: 'Win 25 banners', cash: 2500 },
  { id: 'triplets', name: 'Three of a Kind', desc: 'A ewe of yours has triplets', cash: 200 },
];

// ---------- regions & jackpots ----------
export const NEIGHBORS = {
  AL: ['MS', 'TN', 'GA', 'FL'], AK: ['WA'], AZ: ['CA', 'NV', 'UT', 'NM', 'CO'], AR: ['MO', 'TN', 'MS', 'LA', 'TX', 'OK'], CA: ['OR', 'NV', 'AZ'],
  CO: ['WY', 'NE', 'KS', 'OK', 'NM', 'UT', 'AZ'], CT: ['NY', 'MA', 'RI'], DE: ['MD', 'PA', 'NJ'], FL: ['GA', 'AL'], GA: ['FL', 'AL', 'TN', 'NC', 'SC'],
  HI: ['CA'], ID: ['WA', 'OR', 'NV', 'UT', 'WY', 'MT'], IL: ['WI', 'IA', 'MO', 'KY', 'IN'], IN: ['IL', 'MI', 'OH', 'KY'], IA: ['MN', 'WI', 'IL', 'MO', 'NE', 'SD'],
  KS: ['NE', 'MO', 'OK', 'CO'], KY: ['IN', 'OH', 'WV', 'VA', 'TN', 'MO', 'IL'], LA: ['TX', 'AR', 'MS'], ME: ['NH'], MD: ['PA', 'DE', 'VA', 'WV'],
  MA: ['NH', 'VT', 'NY', 'CT', 'RI'], MI: ['OH', 'IN', 'WI'], MN: ['ND', 'SD', 'IA', 'WI'], MS: ['LA', 'AR', 'TN', 'AL'], MO: ['IA', 'IL', 'KY', 'TN', 'AR', 'OK', 'KS', 'NE'],
  MT: ['ND', 'SD', 'WY', 'ID'], NE: ['SD', 'IA', 'MO', 'KS', 'CO', 'WY'], NV: ['OR', 'ID', 'UT', 'AZ', 'CA'], NH: ['VT', 'ME', 'MA'], NJ: ['NY', 'PA', 'DE'],
  NM: ['AZ', 'UT', 'CO', 'OK', 'TX'], NY: ['VT', 'MA', 'CT', 'NJ', 'PA'], NC: ['VA', 'TN', 'GA', 'SC'], ND: ['MN', 'SD', 'MT'], OH: ['MI', 'IN', 'KY', 'WV', 'PA'],
  OK: ['KS', 'MO', 'AR', 'TX', 'NM', 'CO'], OR: ['WA', 'ID', 'NV', 'CA'], PA: ['NY', 'NJ', 'DE', 'MD', 'WV', 'OH'], RI: ['CT', 'MA'], SC: ['NC', 'GA'],
  SD: ['ND', 'MN', 'IA', 'NE', 'WY', 'MT'], TN: ['KY', 'VA', 'NC', 'GA', 'AL', 'MS', 'AR', 'MO'], TX: ['NM', 'OK', 'AR', 'LA'], UT: ['ID', 'WY', 'CO', 'NM', 'AZ', 'NV'],
  VT: ['NY', 'NH', 'MA'], VA: ['MD', 'WV', 'KY', 'TN', 'NC'], WA: ['ID', 'OR'], WV: ['OH', 'PA', 'MD', 'VA', 'KY'], WI: ['MI', 'MN', 'IA', 'IL'], WY: ['MT', 'SD', 'NE', 'CO', 'UT', 'ID'],
};
export const JACKPOT_WORDS = {
  winter: ['Winter Warm-Up', 'Cold Weather Classic', 'Thaw Out Jackpot', 'Barn Burner', 'Frostbite Jackpot', 'Winter Shootout'],
  spring: ['Spring Fling', 'Spring Classic', 'Green Grass Jackpot', 'Spring Showdown', 'Mud Season Classic', 'Prospect Round-Up'],
  summer: ['Summer Slam', 'Heat Wave Jackpot', 'Summer Shootout', 'Pre-Fair Classic', 'Dog Days Showdown', 'Fourth of July Jackpot'],
  fall: ['Fall Classic', 'Harvest Showdown', 'Fall Frenzy', 'Leaf Peeper Jackpot', 'Autumn Shootout', 'Fall Round-Up'],
};
export const JACKPOT_PLACES = ['Fairgrounds', 'Expo Center', 'Arena', 'Showbarn', 'Ag Center', 'Livestock Pavilion'];
export const PLACE_WORDS = ['Valley', 'River', 'Prairie', 'Twin Oaks', 'Heartland', 'Crossroads', 'Cedar', 'Maple', 'Big Creek', 'Sunset', 'North Star', 'Pioneer', 'Hickory', 'Lone Pine', 'Red Barn', 'Grand View'];

// Scrapie codon 171 R-allele frequency by breed (Southdowns have eradicated Q — always RR)
export const RR_FREQ = {
  'Southdown': 1, 'Wether-Type Southdown': 1, 'Suffolk': 0.85, 'Hampshire': 0.8, 'Wether-Type Suffolk': 0.75, 'Wether-Type Hampshire': 0.75,
  'Dorset': 0.7, 'Dorset Advantage': 0.7, 'Horned Dorset': 0.65, 'Wether-Type Dorset': 0.65, 'Oxford': 0.65, 'Wether-Type Oxford': 0.6,
  'Shropshire': 0.6, 'Wether-Type Shropshire': 0.6, 'Texel': 0.6, 'Montadale': 0.6, 'Dorper': 0.55, 'White Dorper': 0.55, 'Wether-Type Dorper': 0.55,
  'Natural Colored': 0.5, 'Katahdin': 0.5, 'Tunis': 0.5, 'Cheviot': 0.5, 'Lincoln': 0.5, 'Romney': 0.5, 'Border Leicester': 0.5, 'Kerry Hill': 0.5,
  'Columbia': 0.45, 'Corriedale': 0.45, 'Rambouillet': 0.4, 'Merino': 0.4, 'Commercial': 0.5, 'Crossbred': 0.65,
};
// Dwarf (D) allele frequency — common in club/wether-type lines (~40–50% FD), rare in registered Hamp/Oxford/Shrop/Suffolk (~5% FD), absent elsewhere
export const DWARF_FREQ = {
  'Hampshire': 0.025, 'Oxford': 0.025, 'Shropshire': 0.025, 'Suffolk': 0.025,
  'Wether-Type Hampshire': 0.32, 'Wether-Type Suffolk': 0.32, 'Wether-Type Oxford': 0.3, 'Wether-Type Shropshire': 0.3,
  'Wether-Type Southdown': 0.28, 'Wether-Type Dorset': 0.28, 'Wether-Type Dorper': 0.28, 'Crossbred': 0.32,
};

// Approx state centers (lat, lon) for hauling distance
export const STATE_LL = { AL: [32.8, -86.8], AK: [61.4, -152.3], AZ: [34.2, -111.7], AR: [34.9, -92.4], CA: [37.2, -119.5], CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5], FL: [28.6, -82.4], GA: [32.7, -83.4], HI: [20.3, -156.4], ID: [44.4, -114.6], IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.1, -93.5], KS: [38.5, -98.4], KY: [37.5, -85.3], LA: [31.1, -92.0], ME: [45.4, -69.2], MD: [39.0, -76.8], MA: [42.3, -71.8], MI: [44.3, -85.4], MN: [46.3, -94.3], MS: [32.7, -89.7], MO: [38.4, -92.5], MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6], NH: [43.7, -71.6], NJ: [40.2, -74.7], NM: [34.4, -106.1], NY: [42.9, -75.5], NC: [35.6, -79.4], ND: [47.5, -100.5], OH: [40.3, -82.8], OK: [35.6, -97.5], OR: [43.9, -120.6], PA: [40.9, -77.8], RI: [41.7, -71.5], SC: [33.9, -80.9], SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7], VT: [44.1, -72.7], VA: [37.5, -78.9], WA: [47.4, -120.5], WV: [38.6, -80.6], WI: [44.6, -89.9], WY: [43.0, -107.6] };
export const SHOW_STATE = { denver: 'CO', fortworth: 'TX', sanantonio: 'TX', houston: 'TX', keystone: 'PA', naile: 'KY' };
