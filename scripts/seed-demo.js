'use strict';
/**
 * Setup and seed demo account with random timeline data.
 * Reuses the existing seed-test-data.js for generating varied content.
 * 
 * Usage: node scripts/seed-demo.js [points]
 *   points = desired number of timeline points (default 5000 for demo)
 */

const { getAccountsDb, getUserDb } = require('../src/db/connection');
const { createUser, findUserByUsername } = require('../src/db/auth');
const { hashPassword } = require('../src/server/auth');

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo';
const DEMO_DISPLAY_NAME = 'Demo User';
const DEMO_POINTS = parseInt(process.argv[2]) || 5000;

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

// ── Step 2: Clear existing timeline data ─────────────────────────────────────

const db = getUserDb(demoUser.id);

console.log(`Clearing existing timeline data...`);
db.exec(`
  DELETE FROM document_tags;
  DELETE FROM documents;
  DELETE FROM entity_node_links;
  DELETE FROM entities;
  DELETE FROM timeline_nodes;
`);
console.log(`✓ Data cleared`);

// ── Step 3: Reuse seed-test-data.js logic ────────────────────────────────────

console.log(`\nSeeding ${DEMO_POINTS} random timeline points...`);

const { dateToDecimal, DEFAULT_CALENDAR } = require('../src/server/calendar');
const { randomUUID } = require('crypto');

const uid = () => `nd_${randomUUID().substring(0, 12)}`;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randBetween = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const cal = DEFAULT_CALENDAR;
const MONTH_DAYS = cal.months.map(m => m.days);

const toReal = (year, month, day) => {
  const monthIndex = cal.months.reduce((sum, m, i) => i < month - 1 ? sum + m.days : sum, 0);
  const dayInYear = monthIndex + day;
  return year + dayInYear / 365.25;
};

const insertNode = db.prepare(`
  INSERT INTO timeline_nodes
  (id, parent_id, type, title, start_date, end_date,
   description, color, opacity, importance, node_type, sort_order, metadata)
  VALUES (?,?,?,?,?, ?,?,?,?, ?,?,?,?)
`);

// Vocabulary
const PLACES = [
  'Silverhold', 'Greymarch', 'Thornwall', 'Ashvale', 'Stormreach', 'Duskfall',
  'Ironvale', 'Brightwater', 'Shadowmere', 'Goldcrest', 'Frostpeak', 'Emberveil',
  'Windhollow', 'Deepwatch', 'Ravencross', 'Sunhaven', 'Blackmoor', 'Starfall',
];

const PEOPLE = [
  'Aldara', 'Varenthos', 'Ithiel', 'Drevak', 'Seraphel', 'Morkhan', 'Arandor',
  'Calista', 'Theron', 'Nyx', 'Oberon', 'Isolde', 'Kael', 'Lyreth', 'Zephyros',
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

const COLORS = [
  '#6a4c93', '#4a7c59', '#c44536', '#3a86a8', '#8b6b3d', '#7c3a5e',
  '#c8a04a', '#e0e0e0', '#e06040', '#6080e0', '#50a060', '#a05070',
];

const NODE_TYPES = ['event', 'milestone', 'conflict', 'disaster', 'cultural', 'legend'];
const IMPORTANCE = ['critical', 'major', 'moderate', 'moderate', 'minor', 'minor'];

function genTitle() {
  const form = randBetween(0, 3);
  switch (form) {
    case 0: return `The ${pick(ADJ)} ${pick(EVENTS_VERB)} of ${pick(PLACES)}`;
    case 1: return `${pick(PEOPLE)}'s ${pick(EVENTS_VERB)}`;
    case 2: return `${pick(EVENTS_VERB)} of ${pick(FACTIONS)}`;
    case 3: return `${pick(ADJ)} ${pick(EVENTS_VERB)}`;
  }
}

function genDesc() {
  const templates = [
    'A significant event that shaped the course of history.',
    'Chronicles record this momentous occasion in detail.',
    'Scholars continue to debate the implications of this event.',
    'Few survived to tell the tale of what transpired.',
    'This event would echo through the ages.',
  ];
  return pick(templates);
}

// Generate points
const startYear = 1000;
const endYear = 1500;

for (let i = 0; i < DEMO_POINTS; i++) {
  const year = randBetween(startYear, endYear);
  const month = randBetween(1, 12);
  const day = randBetween(1, MONTH_DAYS[month - 1]);
  
  insertNode.run(
    uid(), null, 'point', genTitle(),
    toReal(year, month, day), null,
    genDesc(), pick(COLORS), 0.75,
    pick(IMPORTANCE), pick(NODE_TYPES), 0, '{}'
  );
  
  if ((i + 1) % 500 === 0) {
    process.stdout.write(`  ${i + 1}/${DEMO_POINTS}\r`);
  }
}

console.log(`✓ Seeded ${DEMO_POINTS} timeline points`);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`
✅ Demo setup complete!

Login credentials:
  Username: ${DEMO_USERNAME}
  Password: ${DEMO_PASSWORD}

Timeline contains ${DEMO_POINTS} random events spanning years 1000-1500.

Reset with: node scripts/seed-demo.js [points]
`);
