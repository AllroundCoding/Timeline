'use strict';
/**
 * Setup and seed demo account with structured timeline data.
 * Creates a demo user, timeline, eras, entities, relationships, and story arcs.
 *
 * Usage: node scripts/seed-demo.js [points]
 *   points = desired number of timeline points (default 5000 for demo)
 */

const crypto = require('crypto');
const { getAccountsDb, getTimelineDb } = require('../src/db/connection');
const { createUser, findUserByUsername } = require('../src/db/auth');
const { hashPassword } = require('../src/server/auth');
const { dateToDecimal, DEFAULT_CALENDAR } = require('../src/server/calendar');

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo';
const DEMO_DISPLAY_NAME = 'Demo User';
const TARGET = parseInt(process.argv[2]) || 5000;

console.log(`\n📅 Demo Timeline Setup\n`);

// ── Step 1: Create or verify demo account ────────────────────────────────────

const accountsDb = getAccountsDb();
let demoUser = findUserByUsername(accountsDb, DEMO_USERNAME);

if (!demoUser) {
  console.log(`Creating demo account...`);
  demoUser = createUser(accountsDb, {
    username: DEMO_USERNAME,
    passwordHash: hashPassword(DEMO_PASSWORD),
    displayName: DEMO_DISPLAY_NAME,
    role: 'user'
  });
  console.log(`✓ Demo user created: ${demoUser.username} (${demoUser.id})`);
} else {
  console.log(`✓ Demo user exists: ${demoUser.username} (${demoUser.id})`);
}

// ── Step 2: Ensure a timeline exists ─────────────────────────────────────────

let timeline = accountsDb.prepare('SELECT id, name FROM timelines WHERE owner_id = ? ORDER BY created_at LIMIT 1').get(demoUser.id);
if (!timeline) {
  const tlId = crypto.randomUUID();
  accountsDb.prepare('INSERT INTO timelines (id, owner_id, name) VALUES (?, ?, ?)').run(tlId, demoUser.id, 'Default');
  timeline = { id: tlId, name: 'Default' };
  console.log(`✓ Created timeline "${timeline.name}" (${timeline.id})`);
} else {
  console.log(`✓ Timeline exists: "${timeline.name}" (${timeline.id})`);
}

const db = getTimelineDb(demoUser.id, timeline.id);

// ── Step 3: Clear existing data ──────────────────────────────────────────────

console.log(`Clearing existing data...`);
db.exec(`
  DELETE FROM arc_entity_links;
  DELETE FROM arc_node_links;
  DELETE FROM story_arcs;
  DELETE FROM entity_relationships;
  DELETE FROM entity_node_links;
  DELETE FROM entity_doc_links;
  DELETE FROM doc_node_links;
  DELETE FROM entities;
  DELETE FROM document_tags;
  DELETE FROM documents;
  DELETE FROM timeline_nodes;
`);
console.log(`✓ Data cleared`);

// ── Helpers ──────────────────────────────────────────────────────────────────

let _n = 0;
const uid = () => `nd_${++_n}`;
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const randBetween = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const cal = DEFAULT_CALENDAR;
const MONTH_DAYS = cal.months.map(m => m.days);

function toReal(year, month, day) {
  return dateToDecimal(cal, year, month ?? 0, day ?? 0, 0, 0);
}

function randDate() {
  const month = randBetween(1, 12);
  const day   = randBetween(1, MONTH_DAYS[month - 1]);
  return { month, day };
}

const insertNode = db.prepare(`INSERT OR IGNORE INTO timeline_nodes
  (id, parent_id, type, title, start_date, end_date,
   start_year, start_month, start_day,
   end_year, end_month, end_day,
   description, color, opacity, importance, node_type, sort_order, metadata)
  VALUES (?,?,?,?,?,?, ?,?,?, ?,?,?, ?,?,?,?,?,?,?)`);

function addSpan({ parent_id, title, startY, startM, startD, endY, endM, endD,
                   description, color, opacity, importance, node_type, sort_order }) {
  const nid = uid();
  insertNode.run(
    nid, parent_id ?? null, 'span', title,
    toReal(startY, startM, startD), toReal(endY, endM, endD),
    startY, startM ?? null, startD ?? null,
    endY, endM ?? null, endD ?? null,
    description ?? null, color ?? '#5566bb', opacity ?? 0.75,
    importance ?? 'moderate', node_type ?? 'event', sort_order ?? 0, '{}');
  return nid;
}

function addPoint({ parent_id, title, year, month, day,
                    description, color, opacity, importance, node_type, sort_order }) {
  const nid = uid();
  insertNode.run(
    nid, parent_id ?? null, 'point', title,
    toReal(year, month, day), null,
    year, month ?? null, day ?? null,
    null, null, null,
    description ?? null, color ?? '#5566bb', opacity ?? 0.75,
    importance ?? 'moderate', node_type ?? 'event', sort_order ?? 0, '{}');
  return nid;
}

// ── Vocabulary ───────────────────────────────────────────────────────────────

const PLACES = [
  'Silverhold', 'Greymarch', 'Thornwall', 'Ashvale', 'Stormreach', 'Duskfall',
  'Ironvale', 'Brightwater', 'Shadowmere', 'Goldcrest', 'Frostpeak', 'Emberveil',
  'Windhollow', 'Deepwatch', 'Ravencross', 'Sunhaven', 'Blackmoor', 'Starfall',
];
const PEOPLE = [
  'Aldara', 'Varenthos', 'Ithiel', 'Drevak', 'Seraphel', 'Morkhan', 'Arandor',
  'Calista', 'Theron', 'Nyx', 'Oberon', 'Isolde', 'Kael', 'Lyreth', 'Zephyros',
  'Elara', 'Gorath', 'Nerissa', 'Lysander', 'Corvus', 'Freya',
];
const FACTIONS = [
  'the Silver Flame', 'the Iron Circle', 'the Dawn Compact', 'the Obsidian Court',
  'the Emerald Order', 'the Crimson Pact', 'the Azure League', 'the Shadow Covenant',
];
const EVENTS_VERB = [
  'Battle', 'Siege', 'Fall', 'Rise', 'Founding', 'Conquest', 'Liberation',
  'Betrayal', 'Alliance', 'Treaty', 'Coronation', 'Abdication', 'Exile',
  'Expedition', 'Discovery', 'Plague', 'Famine', 'Eclipse', 'Miracle',
];
const ADJ = [
  'Great', 'First', 'Last', 'Final', 'Grand', 'Bitter', 'Glorious', 'Terrible',
  'Sacred', 'Crimson', 'Silent', 'Eternal', 'Fateful', 'Ruinous', 'Golden',
];
const SPAN_NAMES = [
  'Dynasty', 'Reign', 'Republic', 'Empire', 'Dominion', 'Kingdom',
  'Campaign', 'War', 'Conflict', 'Uprising', 'Revolution',
  'Renaissance', 'Expansion', 'Decline', 'Migration', 'Golden Age', 'Dark Age',
];
const COLORS = [
  '#6a4c93', '#4a7c59', '#c44536', '#3a86a8', '#8b6b3d', '#7c3a5e',
  '#c8a04a', '#e0e0e0', '#e06040', '#6080e0', '#50a060', '#a05070',
  '#d4a843', '#5e8ca8', '#a86040', '#408070', '#8060a0', '#b07050',
];
const NODE_TYPES  = ['event', 'milestone', 'conflict', 'disaster', 'cultural', 'legend'];
const SPAN_TYPES  = ['kingdom', 'region', 'conflict', 'cultural', 'religious', 'character'];
const IMPORTANCE  = ['critical', 'major', 'moderate', 'moderate', 'moderate', 'minor', 'minor'];

function genEventTitle() {
  const form = randBetween(0, 3);
  switch (form) {
    case 0: return `The ${pick(ADJ)} ${pick(EVENTS_VERB)} of ${pick(PLACES)}`;
    case 1: return `${pick(PEOPLE)}'s ${pick(EVENTS_VERB)}`;
    case 2: return `${pick(EVENTS_VERB)} of ${pick(FACTIONS)}`;
    case 3: return `The ${pick(EVENTS_VERB)} at ${pick(PLACES)}`;
  }
}
function genSpanTitle() {
  const form = randBetween(0, 3);
  switch (form) {
    case 0: return `The ${pick(ADJ)} ${pick(SPAN_NAMES)} of ${pick(PLACES)}`;
    case 1: return `${pick(PEOPLE)}'s ${pick(SPAN_NAMES)}`;
    case 2: return `${pick(SPAN_NAMES)} of ${pick(FACTIONS)}`;
    case 3: return `The ${pick(PLACES)} ${pick(SPAN_NAMES)}`;
  }
}
function genDesc(spanTitle) {
  const templates = [
    `A period of significant change during ${spanTitle}.`,
    `Events unfolded rapidly, reshaping the balance of power.`,
    `Scholars debate the true causes to this day.`,
    `The consequences would echo through generations.`,
    `Songs and legends preserve what histories have forgotten.`,
  ];
  return pick(templates);
}

// ── Generate random sub-spans within a date range ────────────────────────────

function generateSubSpans(parentId, startY, endY, count, depth) {
  const totalRange = endY - startY;
  const ids = [];
  const sliceSize = Math.floor(totalRange / (count + 1));
  let cursor = startY;

  for (let i = 0; i < count; i++) {
    const gap = randBetween(Math.max(1, Math.floor(sliceSize * 0.05)), Math.max(2, Math.floor(sliceSize * 0.2)));
    const sY  = cursor + gap;
    const dur = randBetween(Math.max(1, Math.floor(sliceSize * 0.5)), Math.max(2, Math.floor(sliceSize * 0.95)));
    const eY  = Math.min(sY + dur, endY - 1);
    if (sY >= eY) { cursor = eY + 1; continue; }

    const title = genSpanTitle();
    const id = addSpan({
      parent_id: parentId,
      title, startY: sY, endY: eY,
      description: genDesc(title),
      color: pick(COLORS),
      opacity: clamp(0.5 + depth * 0.05, 0.4, 0.8),
      importance: pick(IMPORTANCE),
      node_type: pick(SPAN_TYPES),
      sort_order: i,
    });
    ids.push({ id, startY: sY, endY: eY, title });
    cursor = eY;
  }
  return ids;
}

function scatterPoints(parentId, startY, endY, count, spanTitle, color) {
  for (let i = 0; i < count; i++) {
    const year = randBetween(startY, endY);
    const d = randDate();
    addPoint({
      parent_id: parentId,
      title: genEventTitle(),
      year, month: d.month, day: d.day,
      description: genDesc(spanTitle),
      importance: pick(IMPORTANCE),
      node_type: pick(NODE_TYPES),
      color: color ?? pick(COLORS),
    });
  }
}

// ── Step 4: Seed all data ────────────────────────────────────────────────────

console.log(`\nSeeding structured timeline with ~${TARGET} points...`);

const tx = db.transaction(() => {
  const now = new Date().toISOString();

  // ── Build span structure ─────────────────────────────────────────────────

  const slots = [];
  function slot(parentId, startY, endY, title, color, weight) {
    slots.push({ parentId, startY, endY, title, color, weight });
  }

  const eras = [
    { title: 'Age of Myth',        startY: -10000, endY: -5000,  desc: 'The primordial age when gods walked the world.', color: '#6a4c93', imp: 'critical' },
    { title: 'Age of Foundation',   startY: -5000,  endY: -2000,  desc: 'Civilizations rise and great orders are established.', color: '#4a7c59', imp: 'critical' },
    { title: 'Age of Empires',      startY: -2000,  endY: -500,   desc: 'Mighty empires expand and clash for dominion.', color: '#c44536', imp: 'critical' },
    { title: 'Age of Fracture',     startY: -500,   endY: 200,    desc: 'Old empires fall, wars rage, new powers emerge.', color: '#3a86a8', imp: 'critical' },
    { title: 'Age of Restoration',  startY: 200,    endY: 800,    desc: 'Peace returns, learning flourishes, alliances form.', color: '#8b6b3d', imp: 'major' },
    { title: 'Age of Expansion',    startY: 800,    endY: 1500,   desc: 'Explorers push beyond known borders.', color: '#7c3a5e', imp: 'major' },
    { title: 'Age of Innovation',   startY: 1500,   endY: 2500,   desc: 'The arcane and mechanical converge.', color: '#c8a04a', imp: 'major' },
    { title: 'Age of Reckoning',    startY: 2500,   endY: 4000,   desc: 'Old sins resurface and the world faces crisis.', color: '#c44536', imp: 'critical' },
  ];

  for (let eraIdx = 0; eraIdx < eras.length; eraIdx++) {
    const era = eras[eraIdx];
    const eraId = addSpan({
      title: era.title, startY: era.startY, endY: era.endY,
      description: era.desc, color: era.color, opacity: 0.55,
      importance: era.imp, node_type: 'region', sort_order: eraIdx,
    });

    slot(eraId, era.startY, era.endY, era.title, era.color, 3);

    const l2spans = generateSubSpans(eraId, era.startY, era.endY, randBetween(6, 12), 1);
    for (const l2 of l2spans) {
      slot(l2.id, l2.startY, l2.endY, l2.title, null, 2);
      const l2range = l2.endY - l2.startY;
      if (l2range < 5) continue;
      const l3spans = generateSubSpans(l2.id, l2.startY, l2.endY, randBetween(3, Math.min(7, Math.floor(l2range / 2))), 2);
      for (const l3 of l3spans) {
        slot(l3.id, l3.startY, l3.endY, l3.title, null, 1.5);
        const l3range = l3.endY - l3.startY;
        if (l3range < 3) continue;
        const l4spans = generateSubSpans(l3.id, l3.startY, l3.endY, randBetween(2, Math.min(4, Math.floor(l3range / 2))), 3);
        for (const l4 of l4spans) slot(l4.id, l4.startY, l4.endY, l4.title, null, 1);
      }
    }
  }

  // Distribute points across slots proportionally
  const totalWeight = slots.reduce((s, sl) => s + sl.weight, 0);
  for (const sl of slots) {
    const count = Math.max(1, Math.round(TARGET * (sl.weight / totalWeight)));
    scatterPoints(sl.parentId, sl.startY, sl.endY, count, sl.title, sl.color);
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  const insDocs = db.prepare('INSERT INTO documents (id, timeline_id, title, category, content, created_at, updated_at) VALUES (?,?,?,?,?,?,?)');
  const insTag  = db.prepare('INSERT OR IGNORE INTO document_tags (doc_id, tag) VALUES (?,?)');

  const docs = [
    { id: 'doc_lore_1', title: 'The Creation Myth', category: 'Lore', tags: ['mythology', 'creation'],
      content: '# The Creation Myth\n\nIn the beginning, the Titans forged the world from primordial chaos. Their war shaped the continents and filled the seas.' },
    { id: 'doc_hist_1', title: 'Rise and Fall of Aetheria', category: 'History', tags: ['aetheria', 'empires'],
      content: '# Rise and Fall of Aetheria\n\nAetheria began as a small city-state in the Age of Foundation and grew to dominate the central continent for over two millennia.' },
    { id: 'doc_hist_3', title: 'The Drevak Invasions', category: 'History', tags: ['conflict', 'drevak'],
      content: '# The Drevak Invasions\n\nComing from beyond the northern wastes, the Drevak hordes swept south in three great waves.' },
    { id: 'doc_char_1', title: 'Queen Aldara', category: 'Characters', tags: ['royalty', 'aetheria'],
      content: "# Queen Aldara\n\nRuled during the Age of Fracture. Known for the Edict of Open Roads and the Silver Pact." },
    { id: 'doc_char_2', title: 'Varenthos the Wanderer', category: 'Characters', tags: ['explorer', 'legend'],
      content: '# Varenthos the Wanderer\n\nCredited with mapping the eastern archipelago and making first contact with the Tidefolk.' },
    { id: 'doc_char_3', title: 'Arandor the Rebuilder', category: 'Characters', tags: ['royalty', 'restoration'],
      content: "# Arandor the Rebuilder\n\nUnited the fractured kingdoms under a single banner after the Drevak Invasions." },
    { id: 'doc_geo_1', title: 'The Central Continent', category: 'Geography', tags: ['geography', 'continents'],
      content: '# The Central Continent\n\nThe largest landmass, divided by the Spine mountains into eastern and western halves.' },
    { id: 'doc_geo_2', title: 'The Eastern Archipelago', category: 'Geography', tags: ['geography', 'islands'],
      content: '# The Eastern Archipelago\n\nThousands of islands stretching across the warm eastern seas. Home to the Tidefolk.' },
  ];

  for (const d of docs) {
    insDocs.run(d.id, 'default', d.title, d.category, d.content, now, now);
    for (const t of d.tags) insTag.run(d.id, t);
  }

  // ── Entities ───────────────────────────────────────────────────────────────

  const insEntity = db.prepare(`INSERT OR IGNORE INTO entities
    (id, timeline_id, name, entity_type, description, color, metadata, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const insEntNodeLink = db.prepare('INSERT OR IGNORE INTO entity_node_links (entity_id, node_id, role) VALUES (?,?,?)');
  const insEntDocLink  = db.prepare('INSERT OR IGNORE INTO entity_doc_links (entity_id, doc_id, role) VALUES (?,?,?)');

  const ENTITY_COLORS = {
    character: '#7c6bff', faction: '#e05c5c', location: '#4a9b6f',
    item: '#c8a04a', creature: '#8b6b3d', concept: '#3a86a8',
  };

  const entities = [
    { id: 'ent_aldara',      name: 'Queen Aldara',          type: 'character', desc: 'Wise ruler during the Age of Fracture. Architect of the Silver Pact.' },
    { id: 'ent_varenthos',   name: 'Varenthos',             type: 'character', desc: 'Legendary explorer who mapped the eastern archipelago.' },
    { id: 'ent_arandor',     name: 'Arandor the Rebuilder', type: 'character', desc: 'United the fractured kingdoms after the Drevak Invasions.' },
    { id: 'ent_drevak',      name: 'Warlord Drevak',        type: 'character', desc: 'Led the northern hordes in three devastating invasion waves.' },
    { id: 'ent_seraphel',    name: 'Seraphel',              type: 'character', desc: 'High priestess who spoke the great prophecy.' },
    { id: 'ent_theron',      name: 'Theron Aldaris',        type: 'character', desc: 'Son of Queen Aldara. Led the defense of Silverhold.' },
    { id: 'ent_isolde',      name: 'Isolde Aldaris',        type: 'character', desc: 'Daughter of Queen Aldara. Diplomat who brokered the Dawn Compact.' },
    { id: 'ent_kael',        name: 'Kael Aldaris',          type: 'character', desc: 'Grandson of Theron. Rose to become a general.' },
    { id: 'ent_elara',       name: 'Elara Windhollow',      type: 'character', desc: 'Scholar and inventor during the Age of Innovation.' },
    { id: 'ent_gorath',      name: 'Gorath the Undying',    type: 'character', desc: 'Ancient warlord cursed with immortality.' },
    { id: 'ent_nerissa',     name: 'Nerissa Tideborn',      type: 'character', desc: 'Tidefolk ambassador to the mainland.' },
    { id: 'ent_lysander',    name: 'Lysander Brightforge',  type: 'character', desc: 'Master artificer who created the World Compass.' },
    { id: 'ent_corvus',      name: 'Corvus Drevaki',        type: 'character', desc: 'Son of Warlord Drevak. Defected to ally with Arandor.' },
    { id: 'ent_freya',       name: 'Freya Stormcaller',     type: 'character', desc: 'Legendary mage who turned the tide at Stormreach.' },
    { id: 'ent_morkhan',     name: 'Morkhan the Elder',     type: 'character', desc: 'Patriarch of the Aldaris dynasty. Father of Aldara.' },

    { id: 'ent_silver_flame', name: 'The Silver Flame',     type: 'faction', desc: 'Holy order protecting the realm from dark forces.' },
    { id: 'ent_iron_circle',  name: 'The Iron Circle',      type: 'faction', desc: 'Military alliance of the northern kingdoms.' },
    { id: 'ent_dawn_compact', name: 'The Dawn Compact',     type: 'faction', desc: 'Alliance of free cities formed during the Age of Fracture.' },
    { id: 'ent_obsidian',     name: 'The Obsidian Court',   type: 'faction', desc: 'Secretive cabal of shadow mages.' },
    { id: 'ent_emerald',      name: 'The Emerald Order',    type: 'faction', desc: 'Druidic circle protecting the ancient forests.' },
    { id: 'ent_tidefolk',     name: 'The Tidefolk',         type: 'faction', desc: 'Coral-building civilization of the eastern archipelago.' },

    { id: 'ent_silverhold',   name: 'Silverhold',               type: 'location', desc: 'Capital city of the Aldaris dynasty.' },
    { id: 'ent_stormreach',   name: 'Stormreach',               type: 'location', desc: 'Coastal fortress where the decisive battle was fought.' },
    { id: 'ent_ashvale',      name: 'Ashvale',                  type: 'location', desc: 'Volcanic region rich in arcane minerals.' },
    { id: 'ent_archipelago',  name: 'The Eastern Archipelago',  type: 'location', desc: 'Vast island chain in the warm eastern seas.' },
    { id: 'ent_spine',        name: 'The Spine Mountains',      type: 'location', desc: 'Continental divide separating east from west.' },

    { id: 'ent_world_compass', name: 'The World Compass',  type: 'item', desc: 'Legendary navigational artifact.' },
    { id: 'ent_silver_pact',   name: 'The Silver Pact',    type: 'item', desc: 'Treaty binding the Dawn Compact to mutual defense.' },
  ];

  for (const e of entities) {
    insEntity.run(e.id, 'default', e.name, e.type, e.desc,
      ENTITY_COLORS[e.type] || '#7c6bff', '{}', now, now);
  }

  // ── Entity ↔ Node links ────────────────────────────────────────────────────

  const someNodes = db.prepare("SELECT id, title FROM timeline_nodes WHERE parent_id IS NULL AND type = 'span' LIMIT 8").all();
  const somePoints = db.prepare("SELECT id, title FROM timeline_nodes WHERE parent_id IS NULL AND type = 'point'").all();

  const entityNodePairs = [
    ['ent_aldara',    someNodes[3]?.id,  'ruler'],
    ['ent_arandor',   someNodes[4]?.id,  'founder'],
    ['ent_drevak',    someNodes[3]?.id,  'antagonist'],
    ['ent_varenthos', someNodes[5]?.id,  'explorer'],
    ['ent_seraphel',  somePoints[2]?.id, 'speaker'],
    ['ent_lysander',  somePoints[3]?.id, 'inventor'],
    ['ent_elara',     someNodes[6]?.id,  'innovator'],
    ['ent_gorath',    someNodes[0]?.id,  'witness'],
    ['ent_nerissa',   someNodes[5]?.id,  'ambassador'],
    ['ent_freya',     someNodes[3]?.id,  'defender'],
    ['ent_silver_flame', someNodes[4]?.id, 'protector'],
    ['ent_iron_circle',  someNodes[2]?.id, 'military'],
    ['ent_dawn_compact', someNodes[3]?.id, 'alliance'],
    ['ent_tidefolk',     someNodes[5]?.id, 'civilization'],
    ['ent_silverhold',   someNodes[3]?.id, 'capital'],
    ['ent_stormreach',   someNodes[3]?.id, 'battlefield'],
  ];
  for (const [entId, nodeId, role] of entityNodePairs) {
    if (nodeId) insEntNodeLink.run(entId, nodeId, role);
  }

  // ── Entity ↔ Doc links ─────────────────────────────────────────────────────

  const entityDocPairs = [
    ['ent_aldara',      'doc_char_1', 'subject'],
    ['ent_varenthos',   'doc_char_2', 'subject'],
    ['ent_arandor',     'doc_char_3', 'subject'],
    ['ent_drevak',      'doc_hist_3', 'antagonist'],
    ['ent_silverhold',  'doc_hist_1', 'location'],
    ['ent_archipelago', 'doc_geo_2',  'subject'],
    ['ent_spine',       'doc_geo_1',  'feature'],
  ];
  for (const [entId, docId, role] of entityDocPairs) {
    insEntDocLink.run(entId, docId, role);
  }

  // ── Entity Relationships ───────────────────────────────────────────────────

  const insRel = db.prepare(`INSERT OR IGNORE INTO entity_relationships
    (id, source_id, target_id, relationship, description, start_node_id, end_node_id, metadata, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`);

  let _relN = 0;
  const relId = () => `rel_${++_relN}`;

  const relationships = [
    // Aldaris family tree
    { src: 'ent_morkhan',  tgt: 'ent_aldara',    rel: 'parent_of',  desc: 'Father of Queen Aldara' },
    { src: 'ent_aldara',   tgt: 'ent_theron',    rel: 'parent_of',  desc: 'Theron is the eldest son of Aldara' },
    { src: 'ent_aldara',   tgt: 'ent_isolde',    rel: 'parent_of',  desc: 'Isolde is Aldara\'s daughter' },
    { src: 'ent_theron',   tgt: 'ent_kael',      rel: 'parent_of',  desc: 'Kael is the grandson of Aldara through Theron' },
    { src: 'ent_theron',   tgt: 'ent_isolde',    rel: 'sibling_of', desc: 'Brother and sister' },
    { src: 'ent_drevak',   tgt: 'ent_corvus',    rel: 'parent_of',  desc: 'Corvus defected from his father\'s horde' },
    // Political
    { src: 'ent_aldara',   tgt: 'ent_arandor',   rel: 'ally_of',    desc: 'Allied during the Age of Fracture' },
    { src: 'ent_corvus',   tgt: 'ent_arandor',   rel: 'ally_of',    desc: 'Corvus defected to join Arandor\'s cause' },
    { src: 'ent_drevak',   tgt: 'ent_arandor',   rel: 'enemy_of',   desc: 'Bitter enemies during the Drevak Invasions' },
    { src: 'ent_drevak',   tgt: 'ent_aldara',    rel: 'enemy_of',   desc: 'Aldara\'s kingdom was a primary target' },
    { src: 'ent_gorath',   tgt: 'ent_drevak',    rel: 'rival_of',   desc: 'Ancient rivals competing for the north' },
    // Organizational
    { src: 'ent_seraphel', tgt: 'ent_silver_flame', rel: 'leads',     desc: 'High priestess of the Silver Flame' },
    { src: 'ent_freya',    tgt: 'ent_iron_circle',  rel: 'member_of', desc: 'Battle mage serving the Iron Circle' },
    { src: 'ent_isolde',   tgt: 'ent_dawn_compact', rel: 'leads',     desc: 'Chief diplomat of the Dawn Compact' },
    { src: 'ent_nerissa',  tgt: 'ent_tidefolk',     rel: 'member_of', desc: 'Ambassador of the Tidefolk' },
    { src: 'ent_elara',    tgt: 'ent_emerald',      rel: 'member_of', desc: 'Scholar affiliated with the Emerald Order' },
    // Faction alliances/rivalries
    { src: 'ent_silver_flame', tgt: 'ent_dawn_compact', rel: 'ally_of',  desc: 'United front against the Obsidian Court' },
    { src: 'ent_silver_flame', tgt: 'ent_obsidian',     rel: 'enemy_of', desc: 'Eternal enemies: light vs shadow' },
    { src: 'ent_iron_circle',  tgt: 'ent_dawn_compact', rel: 'ally_of',  desc: 'Military backing for the free cities' },
    // Spatial
    { src: 'ent_silverhold',   tgt: 'ent_spine',         rel: 'located_in', desc: 'Silverhold sits at the base of the Spine Mountains' },
    { src: 'ent_stormreach',   tgt: 'ent_archipelago',   rel: 'located_in', desc: 'Coastal fortress near the archipelago' },
    // Possession / creation
    { src: 'ent_lysander',     tgt: 'ent_world_compass', rel: 'created_by', desc: 'Lysander invented the World Compass' },
    { src: 'ent_aldara',       tgt: 'ent_silver_pact',   rel: 'owns',       desc: 'Aldara authored the Silver Pact' },
  ];

  for (const r of relationships) {
    insRel.run(relId(), r.src, r.tgt, r.rel, r.desc, null, null, '{}', now);
  }

  // ── Story Arcs ─────────────────────────────────────────────────────────────

  const insArc = db.prepare(`INSERT OR IGNORE INTO story_arcs
    (id, name, description, color, status, sort_order, metadata, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const insArcNode   = db.prepare('INSERT OR IGNORE INTO arc_node_links (arc_id, node_id, position, arc_label) VALUES (?,?,?,?)');
  const insArcEntity = db.prepare('INSERT OR IGNORE INTO arc_entity_links (arc_id, entity_id, role) VALUES (?,?,?)');

  // Fetch deeper nodes to attach to arcs
  const fracNodes = db.prepare("SELECT id, title, start_date FROM timeline_nodes WHERE parent_id IS NOT NULL ORDER BY start_date LIMIT 60").all();

  const arcs = [
    {
      id: 'arc_drevak_wars', name: 'The Drevak Invasions',
      desc: 'Three devastating waves of invasion from the northern wastes.',
      color: '#c44536', status: 'resolved', sort: 0,
      entities: [
        ['ent_drevak', 'antagonist'], ['ent_arandor', 'protagonist'],
        ['ent_corvus', 'turncoat'], ['ent_freya', 'defender'],
        ['ent_iron_circle', 'military'], ['ent_stormreach', 'battlefield'],
      ],
      nodeSlice: [0, 8],
      labels: ['First signs', 'First wave strikes', 'Fall of outer forts', 'Corvus defects',
               'Alliance forms', 'Battle of Stormreach', 'The rout', 'Peace declared'],
    },
    {
      id: 'arc_aldaris_dynasty', name: 'Rise of House Aldaris',
      desc: 'From minor nobility to rulers of the largest kingdom.',
      color: '#6a4c93', status: 'resolved', sort: 1,
      entities: [
        ['ent_morkhan', 'founder'], ['ent_aldara', 'protagonist'],
        ['ent_theron', 'heir'], ['ent_isolde', 'diplomat'],
        ['ent_kael', 'legacy'], ['ent_silverhold', 'seat of power'],
      ],
      nodeSlice: [8, 16],
      labels: ['Morkhan takes the throne', 'Aldara crowned', 'Silver Pact signed', 'Theron born',
               'Isolde\'s diplomacy', 'Dawn Compact formed', 'Theron\'s defense', 'Kael rises'],
    },
    {
      id: 'arc_shadow_war', name: 'The Shadow War',
      desc: 'The hidden conflict between the Silver Flame and the Obsidian Court.',
      color: '#2a2a4a', status: 'active', sort: 2,
      entities: [
        ['ent_seraphel', 'protagonist'], ['ent_obsidian', 'antagonist'],
        ['ent_silver_flame', 'protagonist'], ['ent_gorath', 'wild card'],
      ],
      nodeSlice: [16, 22],
      labels: ['First infiltration', 'Obsidian reveals power', 'Silver Flame mobilizes',
               'Gorath intervenes', 'Shadow siege', 'Uneasy truce'],
    },
    {
      id: 'arc_tidefolk_contact', name: 'First Contact with the Tidefolk',
      desc: 'The discovery and integration of the Tidefolk civilization.',
      color: '#3a86a8', status: 'resolved', sort: 3,
      entities: [
        ['ent_varenthos', 'explorer'], ['ent_nerissa', 'ambassador'],
        ['ent_tidefolk', 'civilization'], ['ent_archipelago', 'location'],
      ],
      nodeSlice: [22, 28],
      labels: ['Varenthos departs', 'Archipelago sighted', 'First contact', 'Trade established',
               'Nerissa\'s embassy', 'Full alliance'],
    },
    {
      id: 'arc_innovation', name: 'The Arcane Revolution',
      desc: 'A wave of magical-mechanical innovation transforms society.',
      color: '#c8a04a', status: 'active', sort: 4,
      entities: [
        ['ent_elara', 'protagonist'], ['ent_lysander', 'inventor'],
        ['ent_world_compass', 'artifact'], ['ent_emerald', 'faction'],
        ['ent_ashvale', 'location'],
      ],
      nodeSlice: [28, 35],
      labels: ['First arcane forge', 'Ashvale mines opened', 'Elara\'s breakthrough',
               'World Compass created', 'Emerald Order protests', 'Regulation debates', 'New age dawns'],
    },
    {
      id: 'arc_reckoning', name: 'Seeds of the Reckoning',
      desc: 'Ancient sins resurface. Omens foretell a coming crisis.',
      color: '#8b2020', status: 'planned', sort: 5,
      entities: [
        ['ent_gorath', 'harbinger'], ['ent_seraphel', 'prophet'],
      ],
      nodeSlice: [35, 40],
      labels: ['First omen', 'Gorath\'s warning', 'Earthquakes begin', 'Ancient seal cracks', 'The gathering'],
    },
  ];

  for (const arc of arcs) {
    insArc.run(arc.id, arc.name, arc.desc, arc.color, arc.status, arc.sort, '{}', now, now);
    for (const [entId, role] of arc.entities) {
      insArcEntity.run(arc.id, entId, role);
    }
    const arcNodes = fracNodes.slice(arc.nodeSlice[0], arc.nodeSlice[1]);
    arcNodes.forEach((n, i) => {
      insArcNode.run(arc.id, n.id, i, arc.labels[i] || null);
    });
  }
});

tx();

// ── Report ───────────────────────────────────────────────────────────────────

const total  = db.prepare('SELECT COUNT(*) AS c FROM timeline_nodes').get().c;
const spans  = db.prepare("SELECT COUNT(*) AS c FROM timeline_nodes WHERE type='span'").get().c;
const points = db.prepare("SELECT COUNT(*) AS c FROM timeline_nodes WHERE type='point'").get().c;
const roots  = db.prepare('SELECT COUNT(*) AS c FROM timeline_nodes WHERE parent_id IS NULL').get().c;
const docCount = db.prepare('SELECT COUNT(*) AS c FROM documents').get().c;
const entCount = db.prepare('SELECT COUNT(*) AS c FROM entities').get().c;
const relCount = db.prepare('SELECT COUNT(*) AS c FROM entity_relationships').get().c;
const arcCount = db.prepare('SELECT COUNT(*) AS c FROM story_arcs').get().c;
const arcNodeCount = db.prepare('SELECT COUNT(*) AS c FROM arc_node_links').get().c;

console.log(`✓ Seeded ${total} nodes (${spans} spans, ${points} points), ${roots} root nodes`);
console.log(`  ${docCount} documents, ${entCount} entities, ${relCount} relationships`);
console.log(`  ${arcCount} story arcs with ${arcNodeCount} arc-node links`);

console.log(`
✅ Demo setup complete!

Login credentials:
  Username: ${DEMO_USERNAME}
  Password: ${DEMO_PASSWORD}

Timeline: "${timeline.name}" with ${total} events spanning years -10000 to 4000.

Reset with: node scripts/seed-demo.js [points]
`);
