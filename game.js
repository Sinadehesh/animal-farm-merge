// --- MERGE FARMSTEAD ---
// The farm map, the town and the market are physical places: each building,
// person and shelf item is a sprite placed on a background that you tap.
// Image paths all come from assets.js so AI-generated art can replace the
// placeholders without touching this file.

const GAME_WIDTH = 6;
const GAME_HEIGHT = 8;
const NUM_CELLS = GAME_WIDTH * GAME_HEIGHT;

// --- ECONOMY ---
// Every number that sets the pace of the game is in this block. It follows
// Merge Mansion: one ⚡ Energy bar pays for every producer tap, and producers
// run out of charges and recharge on a timer. Waiting is free; 💎 gems skip it.

// ⚡ Energy refills by itself up to the cap, +1 every 2 minutes (a full bar takes
// 3h 20m). Rewards and purchases can take it above the cap; it just stops
// refilling until you're back under. Same numbers as Merge Mansion.
const ENERGY_CAP = 100;
const ENERGY_REFILL_SECONDS = 120;
// Buying energy: ⚡100 for 💎5, doubling with each purchase that day up to 💎80.
const ENERGY_PACK = 100;
const ENERGY_PRICE = 5;
const ENERGY_PRICE_CAP = 80;

// Producers work as in Merge Mansion. Levels 1-3 are parts that can only be
// merged. From level 4 a producer makes items for ⚡1 a tap: each charge gives
// `drops` taps, then it recharges for `minutes`. While you're away it stores up
// to `charges` charges. 💎`skip` recharges it at once.
// Each board copies a real Merge Mansion chain's numbers (named in the comment),
// from fast on the first boards to slow on the expensive ones.
const FIRST_WORKING_LEVEL = 4;
const PRODUCERS = {
    // Gardening Toolbox
    barn: {
        emoji: '🧺', minutes: 1,
        names: ['Feed Scoop', 'Feed Pail', 'Feed Sack', 'Feed Bin', 'Big Feed Bin', 'Feed Trough', 'Feed Cart', 'Golden Feed Silo'],
        levels: [[2, 8, 2], [2, 9, 2], [2, 10, 3], [2, 12, 4], [3, 13, 5]],
    },
    // Toolbox
    farm: {
        emoji: '✨', minutes: 2,
        names: ['Torn Fert Pouch', 'Fert Pouch', 'Small Fert Bag', 'Fert Bag', 'Big Fert Bag', 'Fert Sack', 'Fert Barrel', 'Golden Fert Barrel'],
        levels: [[2, 5, 2], [3, 6, 3], [4, 7, 3], [4, 8, 5], [4, 10, 7]],
    },
    // Workbench
    hay: {
        emoji: '🌾', minutes: 60,
        names: ['Seed Pouch', 'Wheat Bag', 'Small Wheat Sack', 'Wheat Sack', 'Big Wheat Sack', 'Wheat Barrel', 'Wheat Cart', 'Golden Granary'],
        levels: [[4, 9, 5], [4, 10, 7], [4, 12, 9], [4, 13, 13], [4, 14, 18]],
    },
    // Sewing Kit
    fert: {
        emoji: '🪣', minutes: 90,
        names: ['Dented Pail', 'Old Pail', 'Muck Pail', 'Muck Bucket', 'Big Muck Bucket', 'Muck Barrow', 'Muck Cart', 'Golden Muck Wagon'],
        levels: [[4, 6, 9], [4, 7, 12], [4, 8, 17], [4, 10, 26], [4, 12, 38]],
    },
    // Planted Bush
    aqua: {
        emoji: '🥫', minutes: 60,
        names: ['Empty Tin', 'Small Tin', 'Fish Food Pouch', 'Fish Food Tin', 'Big Fish Food Tin', 'Fish Food Jar', 'Fish Feeder', 'Golden Feeder'],
        levels: [[2, 5, 20], [2, 5, 24], [4, 5, 29], [6, 5, 36], [7, 5, 48]],
    },
    // Broom Cabinet
    flower: {
        emoji: '🚿', minutes: 200,
        names: ['Leaky Can', 'Patched Can', 'Small Can', 'Watering Can', 'Big Watering Can', 'Sprinkler', 'Rain Barrel', 'Golden Fountain'],
        levels: [[1, 8, 20], [2, 9, 26], [2, 11, 38], [2, 13, 56], [2, 15, 80]],
    },
};
const PRODUCER_MAX_LEVEL = 8;

// What a working producer drops, by level from 4: chance of tier [0, 1, 2].
// The same pattern as Merge Mansion's chains: better producers skip early tiers.
const DROP_ODDS = [
    [1],
    [0.8, 0.2],
    [0.5, 0.5],
    [0.4, 0.4, 0.2],
    [0.33, 0.17, 0.5],
];
// Now and then a producer drops a level 1 part of itself instead (Merge
// Mansion's producers drop other producers' parts at about this rate).
const PART_DROP_CHANCE = 0.01;

// Supercharge and Hypercharge (Merge Mansion): every drop is 1 or 2 tiers
// higher for 2× or 4× the energy. Tap ⚡ next to the energy bar to switch.
const CHARGE_MODES = [
    { name: 'Normal',      label: '⚡',     cost: 1, boost: 0 },
    { name: 'Supercharge', label: '⚡⚡',   cost: 2, boost: 1 },
    { name: 'Hypercharge', label: '⚡⚡⚡', cost: 4, boost: 2 },
];

// Boosters (Merge Mansion). Two alike merge into the next size; double-tap one
// (or tap Use) to start it:
//   ⏳ Time Skip: skips that many hours of recharging on every producer on its board.
//   ⏱️ Time Charger: producers in the 8 cells around it recharge twice as fast
//      for that many hours, then it's used up.
//   ♾️ Unlimited Energy: producer taps cost no energy for that many minutes.
const BOOSTERS = {
    skip:      { emoji: '⏳', unit: 'h', values: [1, 2, 4, 8],  names: ['Small Time Skip', 'Medium Time Skip', 'Big Time Skip', 'Huge Time Skip'] },
    charger:   { emoji: '⏱️', unit: 'h', values: [2, 4, 8, 16], names: ['Small Time Charger', 'Medium Time Charger', 'Big Time Charger', 'Huge Time Charger'] },
    unlimited: { emoji: '♾️', unit: 'm', values: [5, 10, 20],   names: ['5m Unlimited Energy', '10m Unlimited Energy', '20m Unlimited Energy'] },
};

// Currency items (Merge Mansion): coins, gems, energy and XP stars that drop on
// the board. Two alike merge into a bigger one; double-tap to collect what it's worth.
const CURRENCY = {
    coin:   { emoji: '🪙', name: 'Coins',  values: [1, 3, 8, 20, 50, 120] },
    gem:    { emoji: '💎', name: 'Gems',   values: [1, 3, 8, 20] },
    energy: { emoji: '⚡', name: 'Energy', values: [2, 6, 16, 40, 100] },
    xp:     { emoji: '⭐', name: 'XP',     values: [1, 3, 8, 20, 50] },
    // Season Pass points; the emoji and name follow the season's theme.
    season: { emoji: '🍀', name: 'Clovers', values: [1, 3, 8, 20] },
};

// Player levels come from XP, as in Merge Mansion. XP to reach the next level,
// from Merge Mansion's table; past its end each level needs 12% more.
const XP_TO_NEXT = [6, 9, 17, 44, 96, 144, 182, 214, 264, 326, 383, 472, 552, 640, 748, 859, 983, 1106, 1227, 1405, 1610, 1834, 2090];
// XP comes from three places:
// - Merging to tier 4 or higher (Merge Mansion's level 5) drops an ⭐ XP star,
//   one size bigger for each tier above that.
// - Orders pay XP by the tier delivered, like Merge Mansion's tasks (1, 3, 8...).
// - Restoration jobs (TASKS, further down) pay the most.
function orderXp(tier) {
    return CURRENCY.xp.values[Math.min(Math.max(tier, 1), CURRENCY.xp.values.length) - 1];
}

// Chests (Merge Mansion). They need no energy: each tap drops one item until
// they're empty. Brown and Blue chests take a while to unlock (or 💎 to open
// now), and two unopened ones merge into a bigger chest. Contents are
// [what, level, weight]; a 'part' is a part of the board's own producer.
const CHESTS = {
    coin: {
        emoji: '💰', name: 'Coin Chest',
        levels: [{ drops: 5, contents: [['coin', 1, 40], ['coin', 2, 30], ['coin', 3, 20], ['coin', 4, 10]] }],
    },
    energy: {
        emoji: '🔋', name: 'Energy Chest',
        levels: [{ drops: 5, contents: [['energy', 1, 56], ['energy', 2, 31], ['energy', 3, 13]] }],
    },
    brown: {
        emoji: '🧰', name: 'Brown Chest',
        levels: [
            { drops: 10, minutes: 1, skip: 2, contents: [['part', 1, 57], ['coin', 1, 11], ['coin', 2, 7], ['coin', 3, 3], ['energy', 1, 11], ['energy', 2, 7], ['energy', 3, 3]] },
            { drops: 22, minutes: 5, skip: 10, contents: [['part', 1, 26], ['part', 2, 15], ['coin', 1, 14], ['coin', 2, 8], ['coin', 3, 7], ['energy', 1, 14], ['energy', 2, 8], ['energy', 3, 7]] },
        ],
    },
    blue: {
        emoji: '🧰', name: 'Blue Chest',
        levels: [
            { drops: 10, minutes: 5, skip: 10, contents: [['part', 1, 46], ['part', 2, 20], ['coin', 1, 9], ['coin', 2, 5], ['coin', 3, 3], ['energy', 1, 9], ['energy', 2, 5], ['energy', 3, 3]] },
            { drops: 22, minutes: 10, skip: 19, contents: [['part', 1, 23], ['part', 2, 19], ['part', 3, 7], ['coin', 1, 13], ['coin', 2, 9], ['coin', 3, 5], ['energy', 1, 13], ['energy', 2, 9], ['energy', 3, 5]] },
        ],
    },
};

// Piggy Bank (Merge Mansion): a producer that costs ⚡1 a tap like any other but
// drops coins and gems, and breaks when it's empty. Two unused ones merge.
const PIGGY = {
    emoji: '🐷', name: 'Piggy Bank',
    levels: [
        { drops: 20, contents: [['coin', 2, 29], ['coin', 1, 26], ['coin', 3, 18], ['gem', 1, 15], ['coin', 4, 12]] },
        { drops: 33, contents: [['coin', 2, 25], ['coin', 3, 25], ['gem', 1, 25], ['coin', 4, 18], ['coin', 5, 7]] },
        { drops: 45, contents: [['gem', 1, 45], ['coin', 5, 20], ['coin', 3, 14], ['coin', 4, 14], ['coin', 6, 8]] },
        { drops: 70, contents: [['gem', 1, 30], ['coin', 6, 24], ['coin', 5, 20], ['gem', 2, 20], ['coin', 4, 7]] },
    ],
};

// Double Bubbles (Merge Mansion): a merge sometimes also makes a bubble holding
// a copy of the new item. Pop it with 💎 before its timer runs out, or it turns
// into a coin. Chance and price by the new item's tier, from Merge Mansion's
// Toolbox chain; producers use the Gardening Toolbox's (levels 2-7).
const BUBBLE_ODDS = [0, 0, 0, 0.05, 0.10, 0.16, 0.22, 0.28, 0.34, 0.40, 0.50, 0.70];
const BUBBLE_GEMS = [0, 0, 0, 3, 5, 7, 13, 23, 39, 64, 102, 163];
const PRODUCER_BUBBLE_ODDS = [0, 0, 0.20, 0.20, 0.20, 0.20, 0.25, 0.30];
const PRODUCER_BUBBLE_GEMS = [0, 0, 43, 84, 162, 309, 580, 1067];
// How long a bubble lasts, by its price (Merge Mansion's brackets).
function bubbleMinutes(gems) {
    return gems < 15 ? 1 : gems < 40 ? 2 : gems < 100 ? 3 : gems < 300 ? 4 : 5;
}

// Inventory (Merge Mansion): 7 free slots, then more for 💵 at Merge Mansion's
// prices. Timers stop while an item is stored.
const INVENTORY_FREE_SLOTS = 7;
const INVENTORY_SLOT_PRICES = [50, 57, 67, 81, 101, 129, 170, 220, 300, 420, 580, 800, 1125];

// Flash Sale (Merge Mansion): 6 offers every 6 hours, each for 💵 or 💎 and a few
// of each. Offers come from this list; `mode: true` = for one of your boards.
const FLASH_SALE_HOURS = 6;
const FLASH_SALE_OFFERS = [
    { mode: true, item: { type: 'shop', level: 1 }, coins: 250, gems: 15, qty: 3 },
    { mode: true, item: { type: 'shop', level: 2 }, coins: 600, gems: 35, qty: 2 },
    { mode: true, item: { tier: 2 }, coins: 45, gems: 3, qty: 5 },
    { mode: true, item: { tier: 3 }, coins: 90, gems: 6, qty: 5 },
    { item: { type: 'energy', level: 3 }, gems: 6, qty: 5 },
    { item: { type: 'energy', level: 4 }, gems: 14, qty: 3 },
    { item: { type: 'skip', level: 1 }, gems: 12, qty: 3 },
    { item: { type: 'charger', level: 1 }, gems: 18, qty: 2 },
    { item: { type: 'unlimited', level: 1 }, gems: 15, qty: 2 },
    { item: { type: 'chest', kind: 'brown', level: 1 }, coins: 400, gems: 20, qty: 3 },
    { item: { type: 'chest', kind: 'blue', level: 1 }, gems: 35, qty: 2 },
];
// Daily Deals (Merge Mansion): a free Piggy Bank and an Energy Chest for 💎50,
// once a day each.
const DAILY_DEALS = [
    { id: 'piggy', item: { type: 'piggy', level: 1 }, gems: 0 },
    { id: 'energyChest', item: { type: 'chest', kind: 'energy', level: 1 }, gems: 50 },
];

// Season Pass (Merge Mansion): a 28-day season. Any merge has a 10% chance to
// drop a season item; merge them up (1, 3, 8, 20 points) and double-tap to
// collect the points, which climb a 30-level reward track. Everyone gets the
// free rewards. The Golden Pass (real money) adds the golden ones, and until the
// season ends 💎5 a day and 5 more 🎒 slots.
const SEASON_DAYS = 28;
const SEASON_START = Date.UTC(2026, 0, 5); // seasons run back to back from here
const SEASON_DROP_CHANCE = 0.10;
const SEASON_THEMES = [
    { name: 'Lucky Clovers', emoji: '🍀', item: 'Clovers' },
    { name: 'Sweet Berries', emoji: '🫐', item: 'Berries' },
    { name: 'Sunny Daisies', emoji: '🌼', item: 'Daisies' },
    { name: 'Golden Acorns', emoji: '🌰', item: 'Acorns' },
];
const GOLDEN_PASS = { id: 'golden_pass', name: 'Golden Pass', price: '$4.99', gemsPerDay: 5, slots: 5 };
// Points to finish each level: 20, 22, 24... (1,470 for all 30).
function passLevelCost(level) {
    return 20 + 2 * (level - 1);
}
// [free, golden] reward for each level. `item` goes into a board's 🎁.
const PASS_REWARDS = [
    [{ money: 50 }, { gems: 20 }],
    [{ energy: 20 }, { item: { type: 'unlimited', level: 1 } }],
    [{ chest: 'brown' }, { chest: 'blue' }],
    [{ money: 75 }, { energy: 100 }],
    [{ gems: 5 }, { part: 2 }],
    [{ energy: 30 }, { gems: 25 }],
    [{ timeSkip: 1 }, { item: { type: 'charger', level: 1 } }],
    [{ money: 100 }, { chest: 'blue' }],
    [{ part: 1 }, { timeSkip: 2 }],
    [{ chest: 'brown' }, { part: 3 }],
    [{ energy: 40 }, { gems: 30 }],
    [{ money: 150 }, { energy: 150 }],
    [{ gems: 5 }, { item: { type: 'unlimited', level: 2 } }],
    [{ item: { type: 'charger', level: 1 } }, { chest: 'blue' }],
    [{ chest: 'blue' }, { part: 3 }],
    [{ money: 200 }, { gems: 40 }],
    [{ energy: 50 }, { timeSkip: 3 }],
    [{ part: 2 }, { item: { type: 'charger', level: 2 } }],
    [{ gems: 10 }, { energy: 200 }],
    [{ chest: 'blue' }, { part: 3 }],
    [{ money: 250 }, { gems: 50 }],
    [{ energy: 60 }, { chest: 'blue' }],
    [{ item: { type: 'unlimited', level: 1 } }, { item: { type: 'unlimited', level: 3 } }],
    [{ gems: 10 }, { timeSkip: 4 }],
    [{ chest: 'blue' }, { part: 3 }],
    [{ money: 300 }, { gems: 60 }],
    [{ energy: 80 }, { energy: 300 }],
    [{ part: 2 }, { item: { type: 'charger', level: 3 } }],
    [{ gems: 15 }, { gems: 80 }],
    [{ chest: 'blue', gems: 20 }, { part: 4, gems: 100 }],
];

// Chance that an order also pays a level 1 part for its board's producer. The
// first order of a new game always does, so players learn to merge parts early.
const PRODUCER_REWARD_CHANCE = 0.25;

// What selling an item pays, by tier (Merge Mansion's sell table). Far less than
// orders pay on purpose: selling is for clearing space, orders are for money.
const SELL_PRICES = [1, 2, 4, 6, 12, 25, 51, 102, 205, 410, 820, 1640];

// Gems to dust the cobwebs off an item instead of merging into it.
function dustPrice(item) {
    return item.type === 'shop' ? 5 * producerLevel(item) : 5 * (item.tier + 1);
}

// Daily gift: one per calendar day on a 7-day track, as in Merge Gardens. Missing
// a day starts the track over at day 1, and gifts never pile up. Day 7 is special.
// `part` is the level of a producer part, `timeSkip` the level of a Time Skip.
const DAILY_GIFTS = [
    { money: 100 },
    { energy: 50 },
    { gems: 10 },
    { part: 2 },
    { money: 250, energy: 50 },
    { gems: 15, timeSkip: 1 },
    { gems: 30, energy: 100, part: 3 },
];

// What reaching a player level pays. As in Merge Mansion: a Brown Chest on odd
// levels, a Blue Chest on even ones, and energy (100 at levels 4 and 14).
function levelReward(level) {
    return { money: 100 * level, gems: 5 + level, energy: level === 4 || level === 14 ? 100 : 50, chest: level % 2 ? 'brown' : 'blue' };
}

// 💎 Gems are the only thing sold for real money, as in Merge Gardens. 💵 is
// earned by playing. Gems buy energy, skip recharges and cover any 💵 you're short.
const COINS_PER_GEM = 10;
const LEVEL_UP_GEMS = 5; // a few free gems each time a townsperson levels up

// Rewarded ads: a free energy top-up, a few times a day.
const AD_ENERGY = 20;
const ADS_PER_DAY = 5;

// Merge Mansion's start: a full energy bar, 100 coins and 100 gems.
const START = { money: 100, gems: 100, energy: 100 };

// The shop follows Merge Gardens' store: gem packs at the same names and price
// points, a 30-day Daily Basket and a one-time Special Offer. Merge Gardens
// doesn't publish its gem amounts, so these are ours. In the app stores the
// localized price comes from the store itself.
const GEM_PACKS = [
    { id: 'gems_pile',   name: 'Pile of Gems',   gems: 500,  price: '$4.99' },
    { id: 'gems_cask',   name: 'Cask of Gems',   gems: 1100, price: '$9.99',  tag: '+10%' },
    { id: 'gems_barrel', name: 'Barrel of Gems', gems: 2400, price: '$19.99', tag: '+20%' },
];
// Gems once a day for 30 days; a day you don't open the game is lost.
const DAILY_BASKET = { id: 'daily_basket', name: '30 Day Daily Basket', gemsPerDay: 25, days: 30, price: '$3.99' };
// One-time offer, shown the first time you run out of energy.
const SPECIAL_OFFER = { id: 'special_offer', name: 'Special Offer', gems: 200, money: 1000, energy: 200, price: '$1.99' };

let unlocks = { barn: true, hay: false, farm: false, fert: false, aqua: false, flower: false };
let maxTier = 3;
const res = { money: 0, gems: 0, energy: 0 };
Object.assign(res, START);
// When the next ⚡ arrives (ms timestamp), or null when the bar is full.
let energyAt = null;
// Counters the restoration jobs read from (saved with the game).
const stats = { spawned: {}, made: {}, merges: 0, delivered: 0, sold: 0, upgrades: 0, gifts: 0, boxes: 0, webs: 0 };
// Player toggles (saved with the game). charge = index into CHARGE_MODES;
// unlimitedUntil = when Unlimited Energy runs out (ms timestamp).
const settings = { charge: 0, unlimitedUntil: 0 };
// Player level and XP toward the next level.
const quests = { level: 1, xp: 0 };
// Restoration jobs done, and for open jobs the counters they count from.
const restoration = { done: [], baselines: {} };
// Daily gift track: the last day claimed and how many days in a row.
const daily = { lastDay: null, streak: 0 };
// Rewards and purchases waiting in each board's 🎁 until placed.
const crates = { barn: [], hay: [], farm: [], fert: [], aqua: [], flower: [] };
// Stored items, each with the board it belongs to, and how many slots you have.
const inventory = { slots: INVENTORY_FREE_SLOTS, items: [] };
// Daily Basket, Special Offer, energy purchases, ads, Flash Sale and Daily
// Deals (saved with the game).
const shop = {
    basketStart: null, basketClaimed: null, offerBought: false, offerShown: false,
    adsDay: null, adsWatched: 0, energyDay: null, energyBought: 0,
    flash: null, dealsDay: null, dealsTaken: [],
};
// The last board you were on: where things you buy at the Market are sent.
let lastBoard = 'barn';
// This season's pass: points, the Golden Pass, rewards claimed per track.
const pass = { season: null, points: 0, golden: false, claimed: { free: [], golden: [] }, gemsDay: null };
let currentScene = 'map';

// UI Elements
const moneyEl = document.getElementById('money-val');
const gemsEl = document.getElementById('gems-val');
const energyEl = document.getElementById('energy-val');
const energyTimerEl = document.getElementById('energy-timer');
const levelEl = document.getElementById('level-val');
const xpFillEl = document.getElementById('xp-fill');
const xpTextEl = document.getElementById('xp-text');
const chargeBtn = document.getElementById('btn-charge');

const stageEl = document.getElementById('stage');
const titleEl = document.getElementById('scene-title');
const backBtn = document.getElementById('btn-back');
const dialogEl = document.getElementById('dialog');
const dialogArt = document.getElementById('dialog-art');
const dialogTitle = document.getElementById('dialog-title');
const dialogBody = document.getElementById('dialog-body');
const dialogActions = document.getElementById('dialog-actions');
const toastLayer = document.getElementById('toasts');

// Flavor Names for the Tiers
const NAMES = {
    'farm': ['💩 Fertilizer', '🌱 Seed', '🌿 Sprout', '🍓 Strawberry', '🍅 Tomato', '🌽 Corn', '🥕 Carrot', '🥬 Cabbage', '🎃 Pumpkin', '🍉 Watermelon', '🍎 Golden Apple', '🌻 Giant Sun'],
    'hay': ['🌾 Wheat', '🌱 Stalk', '🌾 Bundle', '🟨 Small Bale', '🟨 Medium Bale', '🟨 Large Bale', '🥞 Hay Stack', '🗼 Hay Tower', '🏭 Hay Silo', '⭐ Golden Hay', '✨ Magic Hay', '♾️ Infinite Hay'],
    'barn': ['🌿 Feed', '🥚 Egg', '🐤 Chick', '🐔 Chicken', '🐽 Piglet', '🐷 Pig', '🐮 Calf', '🐄 Cow', '🐴 Horse', '🦙 Alpaca', '🐂 Prize Bull', '🦄 Unicorn'],
    'fert': ['💩 Raw Fert', '💨 Dust', '🌑 Ash', '🦴 Scraps', '🍂 Compost', '💩 Manure', '✨ Basic Fert', '🌟 Quality Fert', '⚡ Speed-Gro', '💎 Deluxe Fert', '🔮 Magic Fert', '🌌 Iridium Fert'],
    'aqua': ['🌾 Fish Food', '🦠 Algae', '🦐 Plankton', '🦐 Shrimp', '🐟 Goldfish', '🐠 Clownfish', '🐢 Turtle', '🦑 Squid', '🐬 Dolphin', '🦈 Shark', '🐋 Whale Shark', '🐙 Kraken'],
    'flower': ['💧 Water Drop', '🌱 Seedling', '🌷 Bud', '🌼 Daisy', '🌷 Tulip', '🌹 Rose', '🌺 Lily', '🌸 Orchid', '🪷 Lotus', '🍄 Rafflesia', '💎 Crystal Flower', '🌳 Tree of Life']
};

function getHue(mode, tier) {
    if (mode === 'farm') return (tier * 15 + 120) % 360;
    else if (mode === 'hay') return (tier * 15 + 40) % 360;
    else if (mode === 'barn') return (tier * 15 + 0) % 360;
    else if (mode === 'fert') return (tier * 15 + 280) % 360;
    else if (mode === 'aqua') return (tier * 15 + 200) % 360;
    else if (mode === 'flower') return (tier * 15 + 320) % 360;
    return 0;
}

function itemSprite(mode, tier) {
    return (ASSETS.items[mode] || [])[tier] || null;
}

function itemEmoji(mode, tier) {
    return NAMES[mode][tier].split(' ')[0];
}

function itemName(mode, tier) {
    return NAMES[mode][tier].split(' ').slice(1).join(' ');
}

// Small inline picture of an item for bubbles and dialogs.
function itemIcon(mode, tier) {
    const sprite = itemSprite(mode, tier);
    return sprite
        ? `<img class="inline-item" src="${sprite}" alt="">`
        : `<span class="inline-item">${itemEmoji(mode, tier)}</span>`;
}

// Land on the farm map. `cost` is the price of its deed, `level` the player level
// it unlocks at, `pay` the 💵 an order pays per tier-0 item that went into it
// (the slow boards pay more).
const AREAS = {
    barn:   { name: 'Barn',          cost: 0,    level: 1, pay: 10, desc: 'Raise animals from feed.' },
    farm:   { name: 'Crop Field',    cost: 200,  level: 2, pay: 10, desc: 'Grow crops with fertilizer.' },
    hay:    { name: 'Hay Field',     cost: 400,  level: 3, pay: 15, desc: 'Grow hay from wheat.' },
    fert:   { name: 'Compost Yard',  cost: 800,  level: 4, pay: 20, desc: 'Make your own fertilizer.' },
    aqua:   { name: 'Fish Pond',     cost: 2000, level: 5, pay: 20, desc: 'Raise fish with fish food.' },
    flower: { name: 'Flower Garden', cost: 5000, level: 6, pay: 30, desc: 'Grow flowers with your watering can.' },
};

// --- PRODUCERS ---

// The level of anything that merges by level (producers, boosters, chests...).
function levelOf(item) {
    return item.level || 1;
}

function producerLevel(item) {
    return levelOf(item);
}

// e.g. "Big Feed Bin"
function producerName(mode, level) {
    return PRODUCERS[mode].names[level - 1];
}

// The first working level's name, e.g. "Feed Bin".
function producerBaseName(mode) {
    return producerName(mode, FIRST_WORKING_LEVEL);
}

// { charges, drops, skip } for a working level, or null for a part.
function producerStats(mode, level) {
    const row = PRODUCERS[mode].levels[level - FIRST_WORKING_LEVEL];
    return row ? { charges: row[0], drops: row[1], skip: row[2] } : null;
}

function isWorkingProducer(item) {
    return !!item && item.type === 'shop' && producerLevel(item) >= FIRST_WORKING_LEVEL;
}

function rechargeMs(mode) {
    return PRODUCERS[mode].minutes * 60000;
}

// Catches a producer up on recharges, including time the game was closed. It
// recharges one charge at a time while there's room for a whole charge. A new
// producer starts full. Returns true if a charge arrived.
function tickProducer(mode, item, now = Date.now()) {
    const s = isWorkingProducer(item) && !item.web ? producerStats(mode, producerLevel(item)) : null;
    if (!s) return false;
    const max = s.charges * s.drops;
    const ms = rechargeMs(mode);
    if (item.drops === undefined) item.drops = max;
    let arrived = false;
    while (item.readyAt && now >= item.readyAt) {
        item.drops = Math.min(max, item.drops + s.drops);
        item.readyAt = item.drops + s.drops <= max ? item.readyAt + ms : null;
        arrived = true;
    }
    if (!item.readyAt && item.drops + s.drops <= max) item.readyAt = now + ms;
    return arrived;
}

// The 8 cells around a cell (Time Chargers reach diagonals too).
function getNeighbors8(index) {
    const x = index % GAME_WIDTH;
    const y = Math.floor(index / GAME_WIDTH);
    const cells = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if ((dx || dy) && nx >= 0 && nx < GAME_WIDTH && ny >= 0 && ny < GAME_HEIGHT) cells.push(ny * GAME_WIDTH + nx);
        }
    }
    return cells;
}

// When the boards were last ticked, so a Time Charger only speeds up time that
// has passed since (including while the game was closed).
let lastTickAt = Date.now();

// Ticks everything with a timer on every board: Time Chargers, producer
// recharges, chests unlocking and Double Bubbles. Returns the boards that
// changed and need a redraw.
function tickBoards(now = Date.now()) {
    const since = Math.min(lastTickAt, now);
    lastTickAt = now;
    return Object.keys(grids).filter(mode => {
        const board = grids[mode];
        let changed = false;
        // An active Time Charger doubles the speed of the recharges around it:
        // they move forward again by the time that passed (once, even if two reach).
        const boosted = new Set();
        board.forEach((cell, c) => {
            if (!cell || cell.type !== 'charger' || !cell.until) return;
            const extra = Math.min(now, cell.until) - since;
            getNeighbors8(c).forEach(n => {
                const p = board[n];
                if (extra > 0 && !boosted.has(n) && isWorkingProducer(p) && !p.web && p.readyAt) {
                    p.readyAt -= extra;
                    boosted.add(n);
                }
            });
            if (now >= cell.until) {
                board[c] = null;
                changed = true;
            }
        });
        board.forEach((cell, c) => {
            if (!cell) return;
            if (tickProducer(mode, cell, now)) changed = true;
            if (cell.type === 'chest' && cell.openAt && !cell.opened && now >= cell.openAt) {
                cell.opened = true;
                changed = true;
            }
            if (cell.type === 'bubble' && now >= cell.until) {
                board[c] = { type: 'coin', level: 1 }; // an unpopped bubble leaves a coin behind
                changed = true;
            }
        });
        return changed;
    });
}

// Pays 💎 to finish the producer's current recharge at once.
function skipRecharge(mode, index) {
    const item = grids[mode][index];
    if (!isWorkingProducer(item) || !item.readyAt) return;
    const s = producerStats(mode, producerLevel(item));
    if (!spendGems(s.skip)) return;
    item.readyAt = Date.now();
    tickProducer(mode, item);
    updateUI();
    toast(`${PRODUCERS[mode].emoji} ${producerName(mode, producerLevel(item))} recharged!`, 'good');
    refreshBoard(mode, [index]);
}

// Tapping a producer that has no charges left.
function openRecharge(mode, index) {
    const item = grids[mode][index];
    const level = producerLevel(item);
    const s = producerStats(mode, level);
    showDialog({
        title: `${producerName(mode, level)} is recharging`,
        body: `<p class="big-count">⏳ <span data-ready="${item.readyAt}">${formatDuration(item.readyAt - Date.now())}</span></p>
               <p class="hint">Each charge gives ${s.drops} taps and takes ${formatDuration(rechargeMs(mode))}. It stores up to ${s.charges} charges while you're away.</p>`,
        actions: [
            { label: `Recharge now · 💎 ${s.skip}`, primary: true, wide: true, onClick: () => skipRecharge(mode, index) },
            { label: 'Wait' },
        ],
    });
}

function boosterName(item) {
    return BOOSTERS[item.type].names[levelOf(item) - 1];
}

// e.g. "2h" or "10m"
function boosterAmount(item) {
    const b = BOOSTERS[item.type];
    return `${b.values[levelOf(item) - 1]}${b.unit}`;
}

// A Time Skip moves every recharge on the board forward by its hours.
function useTimeSkip(mode, index) {
    const item = grids[mode][index];
    if (!item || item.type !== 'skip') return;
    const hours = BOOSTERS.skip.values[levelOf(item) - 1];
    const waiting = grids[mode].filter(cell => isWorkingProducer(cell) && !cell.web && cell.readyAt);
    if (!waiting.length) {
        toast('Nothing is recharging on this board right now. Save it for later!');
        return;
    }
    waiting.forEach(cell => { cell.readyAt -= hours * 3600000; tickProducer(mode, cell); });
    grids[mode][index] = null;
    selected = null;
    toast(`⏳ ${boosterName(item)}: ${hours}h skipped on the ${AREAS[mode].name}!`, 'good');
    refreshBoard(mode);
}

// A Time Charger runs for its hours, then disappears. Once started it can't be
// merged or stored.
function startCharger(mode, index) {
    const item = grids[mode][index];
    if (!item || item.type !== 'charger' || item.until) return;
    const hours = BOOSTERS.charger.values[levelOf(item) - 1];
    item.until = Date.now() + hours * 3600000;
    toast(`⏱️ ${boosterName(item)} on: producers next to it recharge twice as fast for ${hours}h.`, 'good');
    refreshBoard(mode, [index]);
}

function unlimitedActive() {
    return settings.unlimitedUntil > Date.now();
}

// Unlimited Energy adds its minutes (on top of any that are left).
function startUnlimited(mode, index) {
    const item = grids[mode][index];
    if (!item || item.type !== 'unlimited') return;
    const minutes = BOOSTERS.unlimited.values[levelOf(item) - 1];
    settings.unlimitedUntil = Math.max(Date.now(), settings.unlimitedUntil) + minutes * 60000;
    grids[mode][index] = null;
    selected = null;
    toast(`♾️ Unlimited Energy for ${minutes} minutes: tap away!`, 'good');
    updateUI();
    refreshBoard(mode);
}

// Takes the energy for one tap, or explains why it can't. Free while Unlimited
// Energy runs.
function payTapEnergy(cost) {
    if (unlimitedActive()) return true;
    if (res.energy < 1) {
        openEnergy(true);
        return false;
    }
    if (res.energy < cost) {
        toast(`${chargeMode().name} needs ⚡${cost} a tap. Tap ${chargeMode().label} by the energy bar to switch it off.`);
        return false;
    }
    res.energy -= cost;
    tickEnergy(); // starts the refill timer as soon as you drop below the cap
    return true;
}

function chargeMode() {
    return CHARGE_MODES[settings.charge] || CHARGE_MODES[0];
}

// --- ENERGY ---

// Adds every ⚡ that has arrived since the last tick, including time the game was closed.
function tickEnergy(now = Date.now()) {
    const ms = ENERGY_REFILL_SECONDS * 1000;
    if (res.energy >= ENERGY_CAP) { energyAt = null; return; }
    if (!energyAt) { energyAt = now + ms; return; }
    if (now < energyAt) return;
    const arrived = Math.min(ENERGY_CAP - res.energy, Math.floor((now - energyAt) / ms) + 1);
    res.energy += arrived;
    energyAt = res.energy >= ENERGY_CAP ? null : energyAt + arrived * ms;
}

function formatDuration(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function timeUntilFullEnergy() {
    if (res.energy >= ENERGY_CAP || !energyAt) return 0;
    return (energyAt - Date.now()) + (ENERGY_CAP - res.energy - 1) * ENERGY_REFILL_SECONDS * 1000;
}

// Takes gems if you have enough; otherwise sends you to the shop.
function spendGems(n) {
    if (res.gems < n) {
        openShop(`You need 💎 ${n - res.gems} more.`);
        return false;
    }
    res.gems -= n;
    return true;
}

// Calendar day number in the player's time zone.
function today() {
    const d = new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

function adsLeft() {
    if (shop.adsDay !== today()) { shop.adsDay = today(); shop.adsWatched = 0; }
    return ADS_PER_DAY - shop.adsWatched;
}

// 💎5 for the first ⚡100 of the day, then 10, 20, 40 and 80 from then on.
function energyPrice() {
    if (shop.energyDay !== today()) { shop.energyDay = today(); shop.energyBought = 0; }
    return Math.min(ENERGY_PRICE_CAP, ENERGY_PRICE * 2 ** shop.energyBought);
}

// Shown when you tap the energy bar or run out while playing.
function openEnergy(ranOut = false) {
    tickEnergy();
    // The first time you run out, show the one-time offer instead.
    if (ranOut && !shop.offerBought && !shop.offerShown) {
        shop.offerShown = true;
        openSpecialOffer('Out of ⚡ Energy?');
        return;
    }
    const full = res.energy >= ENERGY_CAP;
    const ads = adsLeft();
    const timing = full
        ? 'Full! It refills again once you drop below 100.'
        : `+1 every ${formatDuration(ENERGY_REFILL_SECONDS * 1000)} · next in <span data-ready="${energyAt}">${formatDuration(energyAt - Date.now())}</span> · full in ${formatDuration(timeUntilFullEnergy())}`;
    const actions = [{ label: `Buy ⚡ ${ENERGY_PACK} · 💎 ${energyPrice()}`, primary: true, wide: true, onClick: buyEnergy }];
    if (ads > 0) actions.push({ label: `Watch an ad · +⚡ ${AD_ENERGY} (${ads} left today)`, wide: true, onClick: watchAdForEnergy });
    actions.push({ label: full ? 'OK' : 'Wait' });
    showDialog({
        title: ranOut ? 'Out of ⚡ Energy' : '⚡ Energy',
        body: `<p class="big-count">⚡ ${res.energy} / ${ENERGY_CAP}</p><p class="hint">${timing}</p>
               <p class="hint">Every producer tap costs ⚡1. The price of ⚡${ENERGY_PACK} doubles with each buy (up to 💎${ENERGY_PRICE_CAP}) and resets tomorrow.</p>`,
        actions,
    });
}

function buyEnergy() {
    const price = energyPrice();
    if (!spendGems(price)) return;
    shop.energyBought++;
    res.energy += ENERGY_PACK;
    tickEnergy();
    updateUI();
    toast(`+⚡ ${ENERGY_PACK}!`, 'good');
}

function watchAdForEnergy() {
    if (adsLeft() <= 0) return;
    showRewardedAd(() => {
        shop.adsWatched++;
        res.energy += AD_ENERGY;
        tickEnergy();
        updateUI();
        toast(`+⚡ ${AD_ENERGY}`, 'good');
    });
}

// --- SHOP ---

function openShop(note = '') {
    const basketDays = basketDaysLeft();
    const actions = [];
    if (!shop.offerBought) {
        actions.push({
            label: `⭐ ${SPECIAL_OFFER.name}: 💎 ${SPECIAL_OFFER.gems} + 💵 ${SPECIAL_OFFER.money.toLocaleString()} + ⚡ ${SPECIAL_OFFER.energy} · ${SPECIAL_OFFER.price}`,
            primary: true, wide: true, onClick: buySpecialOffer,
        });
    }
    GEM_PACKS.forEach(pack => actions.push({
        label: `${pack.name}: 💎 ${pack.gems.toLocaleString()}${pack.tag ? ` (${pack.tag})` : ''} · ${pack.price}`,
        primary: true, wide: true,
        onClick: () => purchase(pack.id, () => { res.gems += pack.gems; return `+💎 ${pack.gems.toLocaleString()}`; }),
    }));
    actions.push(basketDays > 0
        ? { label: `🧺 Daily Basket active · ${basketDeliveriesLeft()} more days`, wide: true, disabled: true }
        : { label: `🧺 ${DAILY_BASKET.name}: 💎 ${DAILY_BASKET.gemsPerDay} every day · ${DAILY_BASKET.price}`,
            primary: true, wide: true, onClick: buyDailyBasket });
    actions.push({ label: `⚡ ${ENERGY_PACK} Energy · 💎 ${energyPrice()}`, wide: true, onClick: buyEnergy });
    if (!pass.golden) actions.push({ label: `🎟️ ${GOLDEN_PASS.name}: golden rewards, 💎${GOLDEN_PASS.gemsPerDay} a day · ${GOLDEN_PASS.price}`, primary: true, wide: true, onClick: buyGoldenPass });
    actions.push({ label: '🏷️ Flash Sale & 🎁 Daily Deals at the Market', wide: true, onClick: () => { goTo('market'); openFlashSale(); } });
    actions.push({ label: 'Close' });
    showDialog({
        title: 'Shop',
        body: `${note ? `<p><b>${note}</b></p>` : ''}
               <p>💎 Gems buy ⚡ energy, recharge producers instantly and cover any 💵 you're short.</p>
               <p class="hint">Test mode: no real payment is taken yet.</p>`,
        actions,
    });
}

function openSpecialOffer(title = SPECIAL_OFFER.name) {
    showDialog({
        title,
        body: `<p><b>One-time ${SPECIAL_OFFER.name}</b></p>
               <p>💎 ${SPECIAL_OFFER.gems} + 💵 ${SPECIAL_OFFER.money.toLocaleString()} + ⚡ ${SPECIAL_OFFER.energy}</p>`,
        actions: [
            { label: `Get it for ${SPECIAL_OFFER.price}`, primary: true, wide: true, onClick: buySpecialOffer },
            { label: 'No thanks' },
        ],
    });
}

function buySpecialOffer() {
    if (shop.offerBought) return;
    purchase(SPECIAL_OFFER.id, () => {
        shop.offerBought = true;
        res.gems += SPECIAL_OFFER.gems;
        res.money += SPECIAL_OFFER.money;
        res.energy += SPECIAL_OFFER.energy;
        tickEnergy();
        return `+💎 ${SPECIAL_OFFER.gems} +💵 ${SPECIAL_OFFER.money.toLocaleString()} +⚡ ${SPECIAL_OFFER.energy}`;
    });
}

// Days of the basket left, counting today.
function basketDaysLeft() {
    if (shop.basketStart === null) return 0;
    return Math.max(0, shop.basketStart + DAILY_BASKET.days - today());
}

// Deliveries still to come after today's (if today's is already claimed).
function basketDeliveriesLeft() {
    return basketDaysLeft() - (shop.basketClaimed === today() ? 1 : 0);
}

function buyDailyBasket() {
    if (basketDaysLeft() > 0) return;
    purchase(DAILY_BASKET.id, () => {
        shop.basketStart = today();
        shop.basketClaimed = null;
        claimDailyBasket();
        return `${DAILY_BASKET.name} started`;
    });
}

// Runs on start-up and every tick; gives today's gems once.
function claimDailyBasket() {
    if (basketDaysLeft() <= 0 || shop.basketClaimed === today()) return;
    shop.basketClaimed = today();
    res.gems += DAILY_BASKET.gemsPerDay;
    updateUI();
    toast(`🧺 Daily Basket: +💎 ${DAILY_BASKET.gemsPerDay} (${basketDeliveriesLeft()} more days)`, 'good');
}

// Real payments need the app-store billing plugin once the game is packaged
// with Capacitor (Google Play Billing / Apple In-App Purchase): call the store
// with productId and run grant() only after the store confirms. Until then this
// grants straight away so the flow can be tested.
function purchase(productId, grant) {
    const message = grant();
    updateUI();
    saveGame();
    toast(`${message} (test purchase)`, 'good');
    goTo(currentScene);
}

// Real ads need an ad SDK (for example AdMob) once the game is packaged; call
// onReward() only when the ad network reports the video was watched.
function showRewardedAd(onReward) {
    toast('(test ad)');
    onReward();
}

// --- REWARDS ---

function chestName(item) {
    return `${CHESTS[item.kind].name}${levelOf(item) > 1 ? ` Lv${levelOf(item)}` : ''}`;
}

function rewardText(r) {
    return [
        r.money && `💵${r.money}`, r.gems && `💎${r.gems}`, r.energy && `⚡${r.energy}`,
        r.part && (r.part >= FIRST_WORKING_LEVEL ? `🏭 Lv${r.part} producer` : `🧩 Lv${r.part} part`),
        r.timeSkip && `⏳ ${BOOSTERS.skip.values[r.timeSkip - 1]}h skip`,
        r.chest && `🧰 ${CHESTS[r.chest].name}`, r.item && itemLabel(deliveryBoard(), r.item),
    ].filter(Boolean).join(' ');
}

// Pays a reward. A producer part or a chest goes into the 🎁 of a random board
// you own; a Time Skip into the 🎁 of your slowest board, where it saves the most.
function grantReward(r, title) {
    if (r.money) res.money += r.money;
    if (r.gems) res.gems += r.gems;
    if (r.energy) { res.energy += r.energy; tickEnergy(); }
    const owned = Object.keys(AREAS).filter(id => unlocks[id]);
    const randomBoard = () => owned[Math.floor(Math.random() * owned.length)];
    const where = [];
    if (r.part) {
        const mode = randomBoard();
        crates[mode].push({ type: 'shop', level: r.part });
        where.push(`${producerName(mode, r.part)}: tap 🎁 on your ${AREAS[mode].name} board`);
    }
    if (r.timeSkip) {
        const mode = owned.reduce((a, b) => (PRODUCERS[b].minutes > PRODUCERS[a].minutes ? b : a));
        crates[mode].push({ type: 'skip', level: r.timeSkip });
        where.push(`${BOOSTERS.skip.names[r.timeSkip - 1]} in your ${AREAS[mode].name} 🎁`);
    }
    if (r.chest) {
        const mode = randomBoard();
        crates[mode].push({ type: 'chest', kind: r.chest, level: 1 });
        where.push(`${CHESTS[r.chest].name} in your ${AREAS[mode].name} 🎁`);
    }
    if (r.item) {
        const mode = deliveryBoard();
        crates[mode].push({ ...r.item });
        where.push(`in your ${AREAS[mode].name} 🎁`);
    }
    updateUI();
    toast(`${title} ${rewardText(r)}${where.length ? ` · ${where.join(' · ')}` : ''}`, 'good');
}

// --- XP & PLAYER LEVEL ---
// XP levels you up, as in Merge Mansion. Most of it comes from restoration jobs
// (below); orders and ⭐ stars from big merges add the rest.

function xpToNext(level) {
    const last = XP_TO_NEXT.length;
    return level <= last ? XP_TO_NEXT[level - 1] : Math.round(XP_TO_NEXT[last - 1] * 1.12 ** (level - last));
}

// Adds XP and levels up as many times as it covers; each new level pays its reward.
function addXp(n) {
    quests.xp += n;
    while (quests.xp >= xpToNext(quests.level)) {
        quests.xp -= xpToNext(quests.level);
        quests.level++;
        const reward = levelReward(quests.level);
        grantReward(reward, `⭐ Level ${quests.level}!`);
        // Shown after whatever called this has redrawn the scene.
        setTimeout(() => showLevelUp(quests.level, reward), 350);
    }
    updateUI();
}

function showLevelUp(level, reward) {
    if (level !== quests.level) return; // a later level-up has its own popup
    const land = Object.keys(AREAS).find(id => AREAS[id].level === level);
    showDialog({
        title: `⭐ Level ${level}!`,
        body: `<p class="big-count">⭐ ${level}</p>
               <p><b>Rewards:</b> ${rewardText(reward)}</p>
               ${land ? `<p>The <b>${AREAS[land].name}</b> is now for sale at the Market!</p>` : ''}`,
        actions: [{ label: 'Hooray!', primary: true }],
    });
}

function madeCount(mode, tier) {
    return stats.made[`${mode}:${tier}`] || 0;
}

// --- RESTORATION ---
// Merge Mansion's tasks (and Merge Gardens' quests): each land has a list of jobs
// that fix it up, done in order. The first job is buying the land, open from the
// level its deed unlocks. A job asks for items from your boards (used up when you
// do it), for something to be done since the job opened, or for owning the land.
// It pays ⭐ XP and sometimes a chest, and each job done brings the building on
// the map a little more back to life.
//   needs: { item: board, tier, n } · { stat, n } · { own: board }
//   who:   the townsperson who thanks you (their line is shown when it's done)

const TASK_STATS = {
    boxes: { emoji: '📦', label: 'Open crates' },
    webs: { emoji: '🕸️', label: 'Free cobwebbed items' },
    upgrades: { emoji: '🧩', label: 'Merge producer parts' },
    sold: { emoji: '💵', label: 'Sell items' },
};

const TASKS = [
    // Barn: the tutorial, then hens.
    { id: 'barn1', land: 'barn', name: 'Clear the doorway', who: 'robin', xp: 2, needs: [{ stat: 'boxes', n: 2 }],
      line: 'Those old crates were blocking everything! Merge next to a crate and it pops open.' },
    { id: 'barn2', land: 'barn', name: 'Collect the first eggs', who: 'marnie', xp: 2, needs: [{ item: 'barn', tier: 1, n: 2 }],
      line: 'Eggs already? This old barn still has some life in it!' },
    { id: 'barn3', land: 'barn', name: 'Brush off the cobwebs', who: 'marnie', xp: 3, needs: [{ stat: 'webs', n: 3 }],
      line: 'Merge a matching item into a cobwebbed one and it comes right off. Much better!' },
    { id: 'barn4', land: 'barn', name: 'Fix the feed bin', who: 'robin', xp: 3, needs: [{ stat: 'upgrades', n: 1 }],
      line: 'Two parts that match make a better one. Keep merging and you\'ll build a whole new Feed Bin!' },
    { id: 'barn5', land: 'barn', name: 'Make a nest for the chicks', who: 'marnie', xp: 4, reward: { chest: 'brown' },
      needs: [{ item: 'barn', tier: 2, n: 2 }], line: 'Look at them all snuggled up. Adorable! Here, take this chest.' },
    { id: 'barn6', land: 'barn', name: 'Haul away the junk', who: 'mayor', xp: 3, needs: [{ stat: 'sold', n: 3 }],
      line: 'Selling what you don\'t need makes room for what you do. Very tidy!' },
    { id: 'barn7', land: 'barn', name: 'Welcome the hens', who: 'marnie', xp: 6, needs: [{ item: 'barn', tier: 3, n: 1 }],
      line: 'A proper hen house at last. They\'ll keep you in eggs forever.' },
    { id: 'barn8', land: 'barn', name: 'Paint the barn red', who: 'robin', xp: 8, reward: { chest: 'blue' },
      needs: [{ item: 'barn', tier: 3, n: 2 }], line: 'Now that\'s a barn! You can see it from the whole valley.' },
    // Crop Field
    { id: 'farm1', land: 'farm', name: 'Buy the Crop Field', who: 'mayor', xp: 3, needs: [{ own: 'farm' }],
      line: 'The old field is yours! Let\'s get it growing again.' },
    { id: 'farm2', land: 'farm', name: 'Pull the weeds', who: 'sandy', xp: 3, needs: [{ stat: 'boxes', n: 3 }],
      line: 'Weeds out, sunshine in. The soil is waking up!' },
    { id: 'farm3', land: 'farm', name: 'Sow the first seeds', who: 'sandy', xp: 4, needs: [{ item: 'farm', tier: 1, n: 3 }],
      line: 'Tuck them in nice and deep. They\'ll be up in no time.' },
    { id: 'farm4', land: 'farm', name: 'Water the sprouts', who: 'sandy', xp: 5, needs: [{ item: 'farm', tier: 2, n: 2 }],
      line: 'Little green shoots everywhere!' },
    { id: 'farm5', land: 'farm', name: 'Fix the scarecrow', who: 'robin', xp: 5, needs: [{ stat: 'upgrades', n: 1 }],
      line: 'He\'s got his hat back. The crows won\'t dare come near.' },
    { id: 'farm6', land: 'farm', name: 'Pick the first strawberries', who: 'mayor', xp: 10, reward: { chest: 'brown' },
      needs: [{ item: 'farm', tier: 3, n: 2 }], line: 'The sweetest strawberries in the valley, I\'d say!' },
    { id: 'farm7', land: 'farm', name: 'Mend the fence', who: 'robin', xp: 10,
      needs: [{ item: 'farm', tier: 3, n: 1 }, { item: 'barn', tier: 2, n: 2 }], line: 'A good fence keeps the chicks out of the strawberries.' },
    // Hay Field
    { id: 'hay1', land: 'hay', name: 'Buy the Hay Field', who: 'mayor', xp: 4, needs: [{ own: 'hay' }],
      line: 'More land! You\'re becoming quite the farmer.' },
    { id: 'hay2', land: 'hay', name: 'Clear out the old straw', who: 'marnie', xp: 5, needs: [{ stat: 'webs', n: 4 }],
      line: 'That straw was older than me!' },
    { id: 'hay3', land: 'hay', name: 'Tie the first bundles', who: 'marnie', xp: 6, needs: [{ item: 'hay', tier: 2, n: 2 }],
      line: 'Neat little bundles, just like your grandma used to make.' },
    { id: 'hay4', land: 'hay', name: 'Stack the bales', who: 'robin', xp: 10, needs: [{ item: 'hay', tier: 3, n: 2 }],
      line: 'Stacked nice and high. That\'ll last all winter.' },
    { id: 'hay5', land: 'hay', name: 'Repair the hay loft', who: 'robin', xp: 12, reward: { chest: 'blue' },
      needs: [{ item: 'hay', tier: 3, n: 1 }, { item: 'barn', tier: 3, n: 1 }], line: 'Good as new, and the hens found a new hiding spot.' },
    { id: 'hay6', land: 'hay', name: 'Fill the horse stalls', who: 'marnie', xp: 20, needs: [{ item: 'hay', tier: 4, n: 1 }],
      line: 'Fresh hay for the horses. Listen to them whinny!' },
    // Compost Yard
    { id: 'fert1', land: 'fert', name: 'Buy the Compost Yard', who: 'mayor', xp: 6, needs: [{ own: 'fert' }],
      line: 'Every great farm starts with great dirt.' },
    { id: 'fert2', land: 'fert', name: 'Dig the compost pit', who: 'robin', xp: 8, needs: [{ item: 'fert', tier: 2, n: 2 }],
      line: 'Deep enough to lose a cow in. Not that we would!' },
    { id: 'fert3', land: 'fert', name: 'Build the compost bins', who: 'robin', xp: 12, needs: [{ item: 'fert', tier: 3, n: 2 }],
      line: 'Sturdy bins, no smell. Well, less smell.' },
    { id: 'fert4', land: 'fert', name: 'Turn the compost', who: 'sandy', xp: 20, reward: { chest: 'brown' },
      needs: [{ item: 'fert', tier: 4, n: 1 }], line: 'Rich, dark compost. My flowers are going to love you.' },
    { id: 'fert5', land: 'fert', name: 'Feed the field', who: 'sandy', xp: 25,
      needs: [{ item: 'fert', tier: 4, n: 1 }, { item: 'farm', tier: 3, n: 2 }], line: 'The strawberries are growing twice as fast!' },
    // Fish Pond
    { id: 'aqua1', land: 'aqua', name: 'Buy the Fish Pond', who: 'willy', xp: 10, needs: [{ own: 'aqua' }],
      line: 'A pond of your own! I\'ll teach you everything I know.' },
    { id: 'aqua2', land: 'aqua', name: 'Clean the pond', who: 'willy', xp: 10, needs: [{ stat: 'webs', n: 4 }],
      line: 'Clear water at last. I can see the bottom!' },
    { id: 'aqua3', land: 'aqua', name: 'Feed the shrimp', who: 'willy', xp: 15, needs: [{ item: 'aqua', tier: 3, n: 2 }],
      line: 'Tiny but hungry. Just like me.' },
    { id: 'aqua4', land: 'aqua', name: 'Release the goldfish', who: 'willy', xp: 25, reward: { chest: 'blue' },
      needs: [{ item: 'aqua', tier: 4, n: 2 }], line: 'Look at them shine! Best pond in the valley.' },
    { id: 'aqua5', land: 'aqua', name: 'Build a little dock', who: 'robin', xp: 40,
      needs: [{ item: 'aqua', tier: 5, n: 1 }, { item: 'hay', tier: 4, n: 1 }], line: 'Now there\'s somewhere to sit and fish.' },
    // Flower Garden
    { id: 'flower1', land: 'flower', name: 'Buy the Flower Garden', who: 'sandy', xp: 15, needs: [{ own: 'flower' }],
      line: 'Oh, a garden! I\'ve dreamed of this.' },
    { id: 'flower2', land: 'flower', name: 'Plant a row of daisies', who: 'sandy', xp: 20, needs: [{ item: 'flower', tier: 3, n: 3 }],
      line: 'Daisies make everyone smile.' },
    { id: 'flower3', land: 'flower', name: 'Grow tulips for the Mayor', who: 'mayor', xp: 30, needs: [{ item: 'flower', tier: 4, n: 2 }],
      line: 'Tulips! You remembered my favourite.' },
    { id: 'flower4', land: 'flower', name: 'Build the rose arch', who: 'robin', xp: 50, reward: { chest: 'blue' },
      needs: [{ item: 'flower', tier: 5, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'Roses over an arch. Very fancy!' },
    { id: 'flower5', land: 'flower', name: 'Throw a grand reopening', who: 'mayor', xp: 80, reward: { gems: 50 },
      needs: [{ item: 'flower', tier: 6, n: 1 }, { item: 'barn', tier: 7, n: 1 }], line: 'The whole town came! The farm is truly alive again.' },
];

function landTasks(land) {
    return TASKS.filter(t => t.land === land);
}

function taskDone(task) {
    return restoration.done.includes(task.id);
}

// Open: not done, the job before it in its land is done, and for a land's first
// job (buying it), the level its deed unlocks at is reached.
function taskOpen(task) {
    if (taskDone(task)) return false;
    const list = landTasks(task.land);
    const i = list.indexOf(task);
    return i === 0 ? quests.level >= AREAS[task.land].level : taskDone(list[i - 1]);
}

function openTasks() {
    return TASKS.filter(taskOpen);
}

// How far a need has got, out of how many.
function needProgress(task, need) {
    if (need.own) return { have: unlocks[need.own] ? 1 : 0, of: 1 };
    if (need.stat) {
        const base = (restoration.baselines[task.id] || {})[need.stat] || 0;
        return { have: Math.min(need.n, Math.max(0, stats[need.stat] - base)), of: need.n };
    }
    const have = grids[need.item].filter(c => isFree(c) && !c.type && c.tier === need.tier).length;
    return { have: Math.min(need.n, have), of: need.n };
}

function taskReady(task) {
    return taskOpen(task) && task.needs.every(need => { const p = needProgress(task, need); return p.have >= p.of; });
}

// A need as a picture and a count, e.g. "🥚 1/2".
function needLabel(task, need) {
    const p = needProgress(task, need);
    const what = need.own ? `🏡 ${AREAS[need.own].name}`
        : need.stat ? `${TASK_STATS[need.stat].emoji} ${TASK_STATS[need.stat].label}`
        : `${itemIcon(need.item, need.tier)} ${itemName(need.item, need.tier)}`;
    return `<span class="need${p.have >= p.of ? ' met' : ''}">${what} ${need.own ? (p.have ? '✓' : '') : `${p.have}/${p.of}`}</span>`;
}

// Tiers wanted on a board by open jobs, so they glow there like order items.
function taskWantedTiers(mode) {
    return openTasks().flatMap(t => t.needs.filter(n => n.item === mode).map(n => n.tier));
}

function landRestored(land) {
    return landTasks(land).every(taskDone);
}

// Jobs that were ready the last time we looked, so each one is announced once.
const announcedTasks = new Set();

// Called after anything that can move a job forward: starts the count for jobs
// that just opened, and announces jobs that just became ready.
function checkTasks() {
    openTasks().forEach(task => {
        if (!restoration.baselines[task.id]) {
            restoration.baselines[task.id] = {};
            task.needs.forEach(need => { if (need.stat) restoration.baselines[task.id][need.stat] = stats[need.stat]; });
        }
        if (taskReady(task) && !announcedTasks.has(task.id)) {
            announcedTasks.add(task.id);
            toast(`🔨 Ready: ${task.name}! Tap 📋 to do it.`, 'good');
        }
    });
}

// Does a job: uses up its items, pays its XP and reward, and shows who's happy.
function completeTask(id) {
    const task = TASKS.find(t => t.id === id);
    if (!task || !taskReady(task)) return;
    task.needs.forEach(need => {
        if (!need.item) return;
        for (let k = 0; k < need.n; k++) grids[need.item][findItem(need.item, need.tier)] = null;
    });
    restoration.done.push(task.id);
    delete restoration.baselines[task.id];
    lastSale = null;
    const npc = npcs.find(n => n.id === task.who);
    const restored = landRestored(task.land);
    if (task.reward) grantReward(task.reward, '🔨');
    showDialog({
        art: npcPicture(npc),
        artRound: true,
        title: `✅ ${task.name}`,
        body: `<p>“${task.line}”</p><p class="hint">— ${npc.name}</p>
               <p><b>+⭐${task.xp}</b>${task.reward ? ` · ${rewardText(task.reward)}` : ''}</p>
               ${restored ? `<p class="restored-note">✨ The ${AREAS[task.land].name} is fully restored!</p>` : ''}`,
        actions: [{ label: 'Lovely!', primary: true }],
    });
    // XP last: a level-up popup follows this one.
    addXp(task.xp);
    checkTasks();
    if (AREAS[currentScene]) refreshBoard(currentScene);
}

// The 📋 job list: XP bar, then each land's open job with what it needs.
function openTaskLog() {
    const need = xpToNext(quests.level);
    const nextLand = Object.keys(AREAS).find(id => AREAS[id].level > quests.level);
    const rows = openTasks().map(task => {
        const ready = taskReady(task);
        const done = landTasks(task.land).filter(taskDone).length;
        return `<div class="task-row${ready ? ' ready' : ''}">
                    <img class="face" src="${npcPicture(npcs.find(n => n.id === task.who))}" alt="">
                    <div class="task-body">
                        <b>${task.name}</b> <small>${AREAS[task.land].name} ${done}/${landTasks(task.land).length}</small>
                        <div class="needs">${task.needs.map(n => needLabel(task, n)).join('')}</div>
                    </div>
                    <button class="task-go" data-id="${task.id}" data-ready="${ready ? 1 : ''}">${ready ? `Do it<br>+⭐${task.xp}` : `Go<br>+⭐${task.xp}`}</button>
                </div>`;
    }).join('');
    showDialog({
        title: `⭐ Level ${quests.level}`,
        body: `<div class="quest xp-row"><span>⭐ XP to level ${quests.level + 1}</span><small>${quests.xp}/${need}</small>
                   <span class="quest-bar xp"><i style="width:${(100 * quests.xp) / need}%"></i></span></div>
               ${rows || '<p>Every job is done. You restored the whole farm! 🎉</p>'}
               <p class="hint">Jobs restore your farm and pay ⭐ XP. Orders and ⭐ stars from big merges add XP too.
               ${nextLand ? `More jobs open at level ${AREAS[nextLand].level} with the ${AREAS[nextLand].name}.` : ''}</p>`,
        actions: [{ label: 'OK' }],
    });
    dialogBody.querySelectorAll('.task-go').forEach(btn => btn.addEventListener('click', () => {
        const task = TASKS.find(t => t.id === btn.dataset.id);
        closeDialog();
        if (btn.dataset.ready) return completeTask(task.id);
        // Not ready: go where it can be worked on.
        const itemNeed = task.needs.find(n => n.item && needProgress(task, n).have < n.n);
        if (task.needs[0].own) goTo('market');
        else goTo(itemNeed ? itemNeed.item : unlocks[task.land] ? task.land : 'map');
    }));
}

// --- DAILY GIFT ---

function dailyAvailable() {
    return daily.lastDay !== today();
}

// The track carries on only if yesterday's gift was claimed; otherwise day 1.
function nextGiftDay() {
    return daily.lastDay === today() - 1 ? (daily.streak % DAILY_GIFTS.length) + 1 : 1;
}

function msUntilTomorrow() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
}

function openDailyGift() {
    const available = dailyAvailable();
    const day = available ? nextGiftDay() : ((daily.streak - 1) % DAILY_GIFTS.length) + 1;
    const track = DAILY_GIFTS.map((gift, i) => {
        const n = i + 1;
        const state = n < day || (!available && n === day) ? 'claimed' : n === day ? 'today' : '';
        return `<div class="gift-day ${state}"><small>Day ${n}</small><span>${rewardText(gift)}</span></div>`;
    }).join('');
    showDialog({
        title: '🎁 Daily gift',
        body: `<div class="gift-track">${track}</div><p class="hint">A new gift every day. Miss a day and the track starts over.</p>`,
        actions: available
            ? [{ label: `Claim day ${day}: ${rewardText(DAILY_GIFTS[day - 1])}`, primary: true, wide: true, onClick: claimDailyGift }]
            : [{ label: `Next gift in ${formatDuration(msUntilTomorrow())}`, disabled: true }, { label: 'OK' }],
    });
}

function claimDailyGift() {
    if (!dailyAvailable()) return;
    const day = nextGiftDay();
    daily.streak = daily.lastDay === today() - 1 ? daily.streak + 1 : 1;
    daily.lastDay = today();
    stats.gifts++;
    grantReward(DAILY_GIFTS[day - 1], `🎁 Day ${day} gift:`);
    checkTasks();
    goTo(currentScene);
}

// --- SCENE LAYOUTS ---
// Positions are percentages of the 9:16 stage: x/y = top-left corner, w = width.
// Height follows the sprite's own aspect ratio.

const MAP_LAYOUT = {
    town:   { x: 50, y: 1,  w: 48 },
    market: { x: 3,  y: 5,  w: 44 },
    barn:   { x: 50, y: 24, w: 47 },
    farm:   { x: 2,  y: 31, w: 46 },
    hay:    { x: 52, y: 49, w: 45 },
    fert:   { x: 3,  y: 55, w: 36 },
    aqua:   { x: 33, y: 72, w: 40 },
    flower: { x: 70, y: 70, w: 29 },
};

const MARKET_LAYOUT = {
    shelf: [
        { x: 7,  y: 17, w: 24 }, { x: 38, y: 17, w: 24 }, { x: 69, y: 17, w: 24 },
        { x: 7,  y: 36, w: 24 }, { x: 38, y: 36, w: 24 }, { x: 69, y: 36, w: 24 },
    ],
    shopkeeper: { x: 36, y: 50, w: 28 },
    counter:    { x: 2,  y: 64, w: 96 },
    upgrade:    { x: 9,  y: 58, w: 22 },
};

const SHOPKEEPER_LINES = [
    'Welcome in! Land deeds are on the shelves. New land means new things to merge.',
    'Townsfolk pay well for what you raise. Check the Town Square often!',
    'That Growth Guide on the counter lets everything grow one size bigger.',
];
let shopkeeperLine = 0;

// --- SCENE HELPERS ---

// A sprite placed on a scene. With onClick it's a button, otherwise decoration.
function makeSpot({ x, y, w, z, sprite, alt = '', label, onClick, locked = false }) {
    const el = document.createElement(onClick ? 'button' : 'div');
    el.className = 'spot' + (locked ? ' locked' : '');
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.width = w + '%';
    el.style.zIndex = z !== undefined ? z : Math.round(y); // lower on screen = in front

    const img = document.createElement('img');
    img.src = sprite;
    img.alt = label || alt;
    img.draggable = false;
    el.appendChild(img);

    if (label) {
        const plate = document.createElement('span');
        plate.className = 'spot-label';
        plate.textContent = label;
        el.appendChild(plate);
    }
    if (onClick) el.addEventListener('click', onClick);
    return el;
}

function addTag(el, className, html) {
    const tag = document.createElement('span');
    tag.className = className;
    tag.innerHTML = html;
    el.appendChild(tag);
    return tag;
}

function showDialog({ art, artRound = false, title, body, actions }) {
    dialogArt.hidden = !art;
    if (art) dialogArt.src = art;
    dialogArt.classList.toggle('round', artRound);
    dialogTitle.textContent = title;
    dialogBody.innerHTML = body;
    dialogActions.innerHTML = '';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'btn' + (action.primary ? ' btn-primary' : '') + (action.wide ? ' btn-wide' : '');
        btn.textContent = action.label;
        btn.disabled = !!action.disabled;
        btn.addEventListener('click', () => {
            closeDialog();
            if (action.onClick) action.onClick();
        });
        dialogActions.appendChild(btn);
    });
    dialogEl.hidden = false;
}

function closeDialog() {
    dialogEl.hidden = true;
}

dialogEl.addEventListener('click', e => { if (e.target === dialogEl) closeDialog(); });

function toast(message, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = message;
    toastLayer.appendChild(el);
    while (toastLayer.children.length > 3) toastLayer.firstChild.remove();
    setTimeout(() => el.remove(), 2600);
}

// A "Buy" dialog button that explains the shortfall instead of failing silently.
// A "Buy" dialog button. When 💵 is short, gems cover the rest.
function buyAction(cost, onBuy, label = `Buy for 💵 ${cost.toLocaleString()}`) {
    const short = cost - res.money;
    if (short <= 0) return { label, primary: true, onClick: onBuy };
    const gems = Math.ceil(short / COINS_PER_GEM);
    return {
        label: res.money > 0 ? `Buy for 💵 ${res.money.toLocaleString()} + 💎 ${gems}` : `Buy for 💎 ${gems}`,
        primary: true,
        onClick: () => {
            if (!spendGems(gems)) return;
            res.money += gems * COINS_PER_GEM;
            onBuy();
        },
    };
}

// --- NAVIGATION ---

function goTo(scene) {
    currentScene = scene;
    closeDialog();
    document.querySelectorAll('.scene').forEach(el => { el.hidden = el.id !== `scene-${scene}`; });
    backBtn.hidden = scene === 'map';
    chargeBtn.hidden = !AREAS[scene];

    if (scene === 'map') { titleEl.textContent = 'Farmstead'; renderMap(); }
    else if (scene === 'town') { titleEl.textContent = 'Town Square'; renderTown(); }
    else if (scene === 'market') { titleEl.textContent = 'Market'; renderMarket(); }
    else {
        if (selected && selected.mode !== scene) selected = null;
        lastBoard = scene;
        titleEl.textContent = AREAS[scene].name;
        refreshBoard(scene);
    }
}

backBtn.addEventListener('click', () => goTo('map'));

// --- FARM MAP ---

function renderMap() {
    const scene = document.getElementById('scene-map');
    scene.innerHTML = '';

    const town = makeSpot({ ...MAP_LAYOUT.town, sprite: ASSETS.buildings.town, label: 'Town', onClick: () => goTo('town') });
    const readyCount = npcs.filter(canFulfill).length;
    if (readyCount > 0) addTag(town, 'badge', readyCount);
    scene.appendChild(town);

    const market = makeSpot({ ...MAP_LAYOUT.market, sprite: ASSETS.buildings.market, label: 'Market', onClick: () => goTo('market') });
    if (dealsWaiting()) addTag(market, 'badge', '🎁'); // today's free Piggy Bank
    scene.appendChild(market);

    Object.keys(AREAS).forEach(id => {
        const area = AREAS[id];
        const restored = landRestored(id);
        const spot = makeSpot({
            ...MAP_LAYOUT[id],
            sprite: (restored && (ASSETS.buildingsRestored || {})[id]) || ASSETS.buildings[id],
            label: area.name,
            locked: !unlocks[id],
            onClick: () => unlocks[id] ? goTo(id) : offerDeed(id),
        });
        if (!unlocks[id]) {
            addTag(spot, 'sale-sign', quests.level < area.level ? `🔒 Level ${area.level}` : `FOR SALE<br>💵 ${area.cost}`);
        } else {
            // Orders ready to hand in on this board, and rewards waiting in its crate.
            const ready = npcs.filter(n => n.request && n.request.mode === id && canFulfill(n)).length;
            const parts = [ready && `✓${ready}`, crates[id].length && `🎁${crates[id].length}`].filter(Boolean);
            if (parts.length) addTag(spot, 'badge', parts.join(' '));
            // Restoration: the building looks worn until its jobs are done.
            const list = landTasks(id);
            const done = list.filter(taskDone).length;
            spot.classList.add(restored ? 'restored' : 'worn');
            spot.style.setProperty('--worn', (1 - done / list.length).toFixed(2));
            addTag(spot, 'restore-tag', restored ? '✨' : `🔨${done}/${list.length}`);
        }
        scene.appendChild(spot);
    });

    // Daily gift and jobs, always one tap away on the map.
    const side = document.createElement('div');
    side.className = 'side-buttons';
    side.innerHTML = `
        <button class="side-btn" id="btn-gift">🎁<small>Gift</small>${dailyAvailable() ? '<span class="badge">!</span>' : ''}</button>
        <button class="side-btn" id="btn-quests">📋<small>Jobs</small>${openTasks().some(taskReady) ? '<span class="badge">!</span>' : ''}</button>
        <button class="side-btn" id="btn-pass">🎟️<small>Pass</small>${passClaimable() ? `<span class="badge">${passClaimable()}</span>` : ''}</button>`;
    side.querySelector('#btn-gift').addEventListener('click', openDailyGift);
    side.querySelector('#btn-quests').addEventListener('click', openTaskLog);
    side.querySelector('#btn-pass').addEventListener('click', openPass);
    scene.appendChild(side);
}

function offerDeed(id) {
    const area = AREAS[id];
    if (quests.level < area.level) {
        showDialog({
            art: ASSETS.buildings[id],
            title: area.name,
            body: `<p>${area.desc}</p><p class="hint">Reach level ${area.level} to buy this land. Jobs in 📋 pay the XP to level up.</p>`,
            actions: [{ label: '📋 Open jobs', primary: true, onClick: openTaskLog }, { label: 'OK' }],
        });
        return;
    }
    showDialog({
        art: ASSETS.buildings[id],
        title: `${area.name} is for sale`,
        body: `<p>${area.desc}</p><p class="hint">Comes with a ${PRODUCERS[id].emoji} ${producerBaseName(id)} that recharges every ${formatDuration(rechargeMs(id))}.</p>`,
        actions: [buyAction(area.cost, () => buyDeed(id)), { label: 'Not now' }],
    });
}

function buyDeed(id) {
    const area = AREAS[id];
    if (unlocks[id] || res.money < area.cost || quests.level < area.level) return;
    res.money -= area.cost;
    unlocks[id] = true;
    if (grids[id].filter(Boolean).length <= 1) grids[id] = clutterBoard();
    updateUI();
    toast(`The ${area.name} is yours! Find it on the map.`, 'good');
    checkTasks();
    goTo(currentScene);
}

// --- TOWNSFOLK SYSTEM ---
// Each NPC lives in a building on the town square and stands in front of it.
const npcs = [
    { id: 'mayor',  name: 'Mayor Pelican', pref: ['farm', 'fert'], deliveries: 0, request: null,
      home: 'townhall',   building: { x: 27, y: 2,  w: 46 }, spot: { x: 41, y: 28, w: 18 } },
    { id: 'robin',  name: 'Robin',         pref: ['hay'],          deliveries: 0, request: null,
      home: 'carpenter',  building: { x: 1,  y: 21, w: 34 }, spot: { x: 8,  y: 42, w: 17 } },
    { id: 'marnie', name: 'Marnie',        pref: ['barn'],         deliveries: 0, request: null,
      home: 'ranch',      building: { x: 65, y: 21, w: 34 }, spot: { x: 75, y: 42, w: 17 } },
    { id: 'willy',  name: 'Willy',         pref: ['aqua'],         deliveries: 0, request: null,
      home: 'fishshop',   building: { x: 1,  y: 58, w: 36 }, spot: { x: 11, y: 79, w: 17 } },
    { id: 'sandy',  name: 'Sandy',         pref: ['flower'],       deliveries: 0, request: null,
      home: 'flowershop', building: { x: 63, y: 58, w: 36 }, spot: { x: 72, y: 79, w: 17 } },
];

function generateRequestFor(npc) {
    let availableModes = npc.pref.filter(m => unlocks[m]);
    if (availableModes.length === 0) {
        availableModes = Object.keys(unlocks).filter(k => unlocks[k]);
    }
    const mode = availableModes[Math.floor(Math.random() * availableModes.length)];
    const targetTier = Math.floor(Math.random() * maxTier) + 1;

    npc.request = {
        mode: mode,
        tier: targetTier,
        rewardMoney: Math.round(AREAS[mode].pay * 2 ** targetTier * (0.85 + Math.random() * 0.3)),
        rewardXp: orderXp(targetTier),
        rewardProducer: Math.random() < PRODUCER_REWARD_CHANCE,
    };
}

function initTown(newGame = false) {
    npcs.forEach(npc => generateRequestFor(npc));
    // Guarantee one early: Marnie always asks for Barn items.
    if (newGame) npcs.find(npc => npc.id === 'marnie').request.rewardProducer = true;
}

// Items that can be dragged, merged and handed in (not crates, Double Bubbles
// or anything cobwebbed).
function isFree(item) {
    return !!item && item.type !== 'box' && item.type !== 'bubble' && !item.web;
}

function findItem(mode, tier) {
    return grids[mode].findIndex(item => isFree(item) && !item.type && item.tier === tier);
}

function canFulfill(npc) {
    return !!npc.request && findItem(npc.request.mode, npc.request.tier) !== -1;
}

// The portrait if there is one, otherwise the full-body drawing (framed the same way).
function npcPicture(npc) {
    return ASSETS.portraits[npc.id] || ASSETS.characters[npc.id];
}

function renderTown() {
    const scene = document.getElementById('scene-town');
    scene.innerHTML = '';
    npcs.forEach(npc => {
        const talk = () => openNpc(npc);
        scene.appendChild(makeSpot({ ...npc.building, sprite: ASSETS.town[npc.home], alt: `${npc.name}'s place`, onClick: talk }));

        const person = makeSpot({ ...npc.spot, sprite: npcPicture(npc), label: npc.name, onClick: talk });
        person.classList.add('portrait-spot');
        if (npc.request) {
            const bubble = addTag(person, 'bubble', itemIcon(npc.request.mode, npc.request.tier));
            if (canFulfill(npc)) bubble.classList.add('ready');
            if (npc.request.rewardProducer) addTag(bubble, 'gift', '🎁');
        }
        scene.appendChild(person);
    });
}

function openNpc(npc) {
    const r = npc.request;
    const level = Math.floor(npc.deliveries / 5) + 1;
    const area = AREAS[r.mode];
    const ready = canFulfill(npc);
    showDialog({
        art: npcPicture(npc),
        artRound: true,
        title: `${npc.name} · Lv.${level}`,
        body: `<p>“Could you bring me a ${itemIcon(r.mode, r.tier)} <b>${itemName(r.mode, r.tier)}</b> from your ${area.name}?”</p>
               <p><b>Reward:</b> 💵 ${r.rewardMoney} · ⭐ ${r.rewardXp} XP${r.rewardProducer ? ` · 🎁 🧩 ${producerName(r.mode, 1)}` : ''}</p>
               <p class="hint">${ready ? 'You have one ready on your board!' : `Merge one on the ${area.name} board first.`}</p>`,
        actions: ready
            ? [{ label: 'Deliver', primary: true, onClick: () => deliver(npc) }, { label: 'Later' }]
            : [{ label: `Go to ${area.name}`, primary: true, onClick: () => goTo(r.mode) }, { label: 'Later' }],
    });
}

function deliver(npc) {
    const r = npc.request;
    const itemIndex = findItem(r.mode, r.tier);
    if (itemIndex === -1) {
        toast(`You don't have a ${itemName(r.mode, r.tier)} on your ${AREAS[r.mode].name} board.`);
        return;
    }
    grids[r.mode][itemIndex] = null;
    lastSale = null;
    res.money += r.rewardMoney;
    npc.deliveries++;
    stats.delivered++;
    addXp(r.rewardXp);
    const levelUp = npc.deliveries % 5 === 0;
    if (levelUp) res.gems += LEVEL_UP_GEMS;
    updateUI();
    toast(`${npc.name} loved the ${itemName(r.mode, r.tier)}! +💵${r.rewardMoney} +⭐${r.rewardXp}`, 'good');
    if (levelUp) toast(`${npc.name} reached Lv.${npc.deliveries / 5 + 1}! +💎 ${LEVEL_UP_GEMS}`, 'good');
    if (r.rewardProducer) {
        crates[r.mode].push({ type: 'shop', level: 1 });
        toast(`🎁 A ${producerName(r.mode, 1)}! Tap 🎁 on your ${AREAS[r.mode].name} board to add it.`, 'good');
    }

    generateRequestFor(npc);
    checkTasks();
    goTo(currentScene); // the town, or the board you delivered from
}

// --- MARKET ---

function renderMarket() {
    const scene = document.getElementById('scene-market');
    scene.innerHTML = '';

    // One land deed per locked area sits on the shelves.
    Object.keys(AREAS).filter(id => !unlocks[id]).forEach((id, i) => {
        const deed = makeSpot({ ...MARKET_LAYOUT.shelf[i], sprite: ASSETS.props.deed, label: AREAS[id].name, onClick: () => offerDeed(id) });
        addTag(deed, 'price-tag', quests.level < AREAS[id].level ? `🔒Lv${AREAS[id].level}` : `💵${AREAS[id].cost}`);
        scene.appendChild(deed);
    });

    scene.appendChild(makeSpot({ ...MARKET_LAYOUT.shopkeeper, sprite: ASSETS.characters.shopkeeper, label: 'Shopkeeper', onClick: () => {
        toast(SHOPKEEPER_LINES[shopkeeperLine++ % SHOPKEEPER_LINES.length]);
    } }));
    scene.appendChild(makeSpot({ ...MARKET_LAYOUT.counter, sprite: ASSETS.props.counter, z: 80 }));

    if (maxTier < NAMES['barn'].length - 1) {
        const guide = makeSpot({ ...MARKET_LAYOUT.upgrade, z: 90, sprite: ASSETS.props.upgrade, label: 'Growth Guide', onClick: offerUpgrade });
        addTag(guide, 'price-tag', `💵${maxTier * 100}`);
        scene.appendChild(guide);
    }

    // Flash Sale and Daily Deals, as in Merge Mansion's shop.
    const side = document.createElement('div');
    side.className = 'side-buttons';
    side.innerHTML = `
        <button class="side-btn" id="btn-flash">🏷️<small>Flash Sale</small></button>
        <button class="side-btn" id="btn-deals">🎁<small>Daily Deals</small>${dealsWaiting() ? '<span class="badge">!</span>' : ''}</button>`;
    side.querySelector('#btn-flash').addEventListener('click', openFlashSale);
    side.querySelector('#btn-deals').addEventListener('click', openDailyDeals);
    scene.appendChild(side);
}

// --- SEASON PASS ---

const DAY_MS = 86400000;

function currentSeason(now = Date.now()) {
    return Math.floor((now - SEASON_START) / (SEASON_DAYS * DAY_MS));
}

function seasonEnds() {
    return SEASON_START + (pass.season + 1) * SEASON_DAYS * DAY_MS;
}

function seasonTheme() {
    const n = SEASON_THEMES.length;
    return SEASON_THEMES[((pass.season % n) + n) % n];
}

// A new season starts the pass over. Season items still on the boards count
// toward the new one.
function syncSeason() {
    if (pass.season !== currentSeason()) {
        Object.assign(pass, { season: currentSeason(), points: 0, golden: false, claimed: { free: [], golden: [] }, gemsDay: null });
    }
    const theme = seasonTheme();
    CURRENCY.season.emoji = theme.emoji;
    CURRENCY.season.name = theme.item;
}

// { level reached, points into the next level, points that level needs }
function passProgress() {
    let level = 0;
    let left = pass.points;
    while (level < PASS_REWARDS.length && left >= passLevelCost(level + 1)) {
        left -= passLevelCost(level + 1);
        level++;
    }
    return { level, into: left, need: level < PASS_REWARDS.length ? passLevelCost(level + 1) : 0 };
}

// Rewards reached but not claimed yet.
function passClaimable() {
    const { level } = passProgress();
    let n = 0;
    for (let l = 1; l <= level; l++) {
        if (!pass.claimed.free.includes(l)) n++;
        if (pass.golden && !pass.claimed.golden.includes(l)) n++;
    }
    return n;
}

function addPassPoints(n) {
    const before = passProgress().level;
    pass.points += n;
    const after = passProgress().level;
    if (after > before) toast(`🎟️ Pass level ${after}! Claim your reward on the map.`, 'good');
}

// The Golden Pass's 💎 for today, once a day while it lasts.
function claimPassGems() {
    if (!pass.golden || pass.gemsDay === today()) return;
    pass.gemsDay = today();
    res.gems += GOLDEN_PASS.gemsPerDay;
    updateUI();
    toast(`🎟️ ${GOLDEN_PASS.name}: +💎${GOLDEN_PASS.gemsPerDay}`, 'good');
}

function buyGoldenPass() {
    if (pass.golden) return;
    purchase(GOLDEN_PASS.id, () => {
        pass.golden = true;
        claimPassGems();
        return `🎟️ ${GOLDEN_PASS.name} for ${seasonTheme().name}`;
    });
}

function claimPassReward(track, level) {
    const { level: reached } = passProgress();
    if (level > reached || pass.claimed[track].includes(level) || (track === 'golden' && !pass.golden)) return;
    pass.claimed[track].push(level);
    grantReward(PASS_REWARDS[level - 1][track === 'free' ? 0 : 1], `🎟️ Level ${level}:`);
    openPass();
}

function openPass() {
    syncSeason();
    const theme = seasonTheme();
    const { level, into, need } = passProgress();
    const cell = (track, l, reward) => {
        const claimed = pass.claimed[track].includes(l);
        const locked = l > level || (track === 'golden' && !pass.golden);
        const state = claimed ? 'claimed' : locked ? 'locked' : 'ready';
        return `<button class="pass-cell ${track} ${state}" data-track="${track}" data-level="${l}" ${state === 'ready' ? '' : 'disabled'}>
                    ${rewardText(reward)}${claimed ? ' ✓' : locked && track === 'golden' && !pass.golden ? ' 🔒' : ''}</button>`;
    };
    const rows = PASS_REWARDS.map(([free, golden], i) => `
        <div class="pass-row${i + 1 <= level ? ' reached' : ''}">
            <span class="pass-level">${i + 1}</span>${cell('free', i + 1, free)}${cell('golden', i + 1, golden)}
        </div>`).join('');
    showDialog({
        title: `🎟️ ${theme.name}`,
        body: `<p class="hint">Season ends in ${formatDuration(seasonEnds() - Date.now())}.
               Merges sometimes drop ${theme.emoji} ${theme.item}: merge them, then double-tap to collect.</p>
               <div class="quest xp-row"><span>${theme.emoji} Level ${level}${need ? ` → ${level + 1}` : ' · max!'}</span>
                   <small>${need ? `${into}/${need}` : pass.points}</small>
                   <span class="quest-bar xp"><i style="width:${need ? (100 * into) / need : 100}%"></i></span></div>
               <div class="pass-head"><span></span><span>Free</span><span>⭐ Golden</span></div>
               <div class="pass-track">${rows}</div>
               ${pass.golden ? `<p class="hint">Golden Pass on: 💎${GOLDEN_PASS.gemsPerDay} a day and +${GOLDEN_PASS.slots} 🎒 slots this season.</p>` : ''}`,
        actions: [
            pass.golden ? null : { label: `Get the ${GOLDEN_PASS.name} · ${GOLDEN_PASS.price}`, primary: true, wide: true, onClick: buyGoldenPass },
            { label: 'Close' },
        ].filter(Boolean),
    });
    dialogBody.querySelectorAll('.pass-cell.ready').forEach(btn => btn.addEventListener('click', () => claimPassReward(btn.dataset.track, Number(btn.dataset.level))));
    // Scroll to the first level with something left to claim, or the next one to reach.
    const target = dialogBody.querySelector('.pass-cell.ready') || dialogBody.querySelectorAll('.pass-row')[Math.min(level, PASS_REWARDS.length - 1)];
    if (target) target.scrollIntoView({ block: 'center' });
}

// --- FLASH SALE & DAILY DEALS ---
// What you buy goes into the 🎁 of its board: the offer's own board, or else the
// board you were on last.

function deliveryBoard() {
    if (AREAS[currentScene]) return currentScene;
    return unlocks[lastBoard] ? lastBoard : 'barn';
}

function sendToBoard(mode, item) {
    crates[mode].push(JSON.parse(JSON.stringify(item)));
    toast(`${itemLabel(mode, item)} is in the 🎁 on your ${AREAS[mode].name} board.`, 'good');
}

function flashWindow(now = Date.now()) {
    return Math.floor(now / (FLASH_SALE_HOURS * 3600000));
}

// This window's 6 offers, picked once and saved so they stay put until it ends.
function flashSale() {
    if (!shop.flash || shop.flash.window !== flashWindow()) {
        const owned = Object.keys(AREAS).filter(id => unlocks[id]);
        const pool = FLASH_SALE_OFFERS.slice().sort(() => Math.random() - 0.5).slice(0, 6);
        shop.flash = {
            window: flashWindow(),
            offers: pool.map(o => {
                const useGems = !o.coins || (o.gems && Math.random() < 0.5);
                return {
                    mode: o.mode ? owned[Math.floor(Math.random() * owned.length)] : null,
                    item: o.item,
                    price: useGems ? o.gems : o.coins,
                    currency: useGems ? 'gems' : 'money',
                    left: o.qty,
                };
            }),
        };
    }
    return shop.flash.offers;
}

function openFlashSale() {
    const offers = flashSale();
    const ends = (flashWindow() + 1) * FLASH_SALE_HOURS * 3600000;
    showDialog({
        title: '🏷️ Flash Sale',
        body: `<p class="hint">New offers in <span data-ready="${ends}">${formatDuration(ends - Date.now())}</span>.
               ${offers.some(o => !o.mode) ? `Boosters and chests go to your ${AREAS[deliveryBoard()].name}.` : ''}</p>`,
        actions: [
            ...offers.map((o, i) => ({
                label: `${itemLabel(o.mode || deliveryBoard(), o.item)}${o.mode ? ` (${AREAS[o.mode].name})` : ''} · ${o.currency === 'gems' ? '💎' : '💵'}${o.price}${o.left ? ` · ${o.left} left` : ' · sold out'}`,
                wide: true, primary: o.left > 0, disabled: !o.left,
                onClick: () => buyFlashOffer(i),
            })),
            { label: 'Close' },
        ],
    });
}

function buyFlashOffer(i) {
    const o = flashSale()[i];
    if (!o || o.left <= 0) return;
    if (o.currency === 'gems') {
        if (!spendGems(o.price)) return;
    } else if (res.money < o.price) {
        toast(`You need 💵${o.price - res.money} more.`);
        return;
    } else {
        res.money -= o.price;
    }
    o.left--;
    sendToBoard(o.mode || deliveryBoard(), o.item);
    updateUI();
    openFlashSale();
}

function dealsTaken() {
    if (shop.dealsDay !== today()) { shop.dealsDay = today(); shop.dealsTaken = []; }
    return shop.dealsTaken;
}

// The free Piggy Bank is still waiting today.
function dealsWaiting() {
    return !dealsTaken().includes('piggy');
}

function openDailyDeals() {
    const taken = dealsTaken();
    showDialog({
        title: '🎁 Daily Deals',
        body: `<p>One of each a day. They go to your ${AREAS[deliveryBoard()].name}.</p>
               <p class="hint">New deals in ${formatDuration(msUntilTomorrow())}.</p>`,
        actions: [
            ...DAILY_DEALS.map(d => ({
                label: `${itemLabel(deliveryBoard(), d.item)} · ${taken.includes(d.id) ? 'taken' : d.gems ? `💎${d.gems}` : 'FREE'}`,
                wide: true, primary: !taken.includes(d.id), disabled: taken.includes(d.id),
                onClick: () => takeDeal(d.id),
            })),
            { label: 'Close' },
        ],
    });
}

function takeDeal(id) {
    const deal = DAILY_DEALS.find(d => d.id === id);
    if (!deal || dealsTaken().includes(id)) return;
    if (deal.gems && !spendGems(deal.gems)) return;
    shop.dealsTaken.push(id);
    sendToBoard(deliveryBoard(), deal.item);
    updateUI();
    goTo(currentScene);
}

function offerUpgrade() {
    const next = maxTier + 1;
    showDialog({
        art: ASSETS.props.upgrade,
        title: `Growth Guide · Tier ${next}`,
        body: `<p>Lets you merge one step further on every board, like ${itemIcon('barn', next)} <b>${itemName('barn', next)}</b> in the Barn.</p>
               <p class="hint">Townsfolk will start asking for bigger things too.</p>`,
        actions: [buyAction(maxTier * 100, buyUpgrade), { label: 'Not now' }],
    });
}

function buyUpgrade() {
    const cost = maxTier * 100;
    if (res.money < cost) return;
    res.money -= cost;
    maxTier++;
    updateUI();
    initTown();
    toast(`You can now merge up to tier ${maxTier}!`, 'good');
    goTo(currentScene);
}

// 12,450 -> "12.4k" so the top bar fits on small phones.
function shortNumber(n) {
    if (n >= 100000) return Math.floor(n / 1000) + 'k';
    if (n >= 10000) return (Math.floor(n / 100) / 10) + 'k';
    return n.toLocaleString();
}

function updateUI() {
    moneyEl.textContent = shortNumber(res.money);
    gemsEl.textContent = shortNumber(res.gems);
    energyEl.textContent = shortNumber(res.energy);
    energyTimerEl.textContent = unlimitedActive()
        ? `♾️ ${formatDuration(settings.unlimitedUntil - Date.now())}`
        : energyAt ? `+1 in ${formatDuration(energyAt - Date.now())}` : 'full';
    const need = xpToNext(quests.level);
    levelEl.textContent = quests.level;
    xpFillEl.style.width = `${Math.min(100, (100 * quests.xp) / need)}%`;
    xpTextEl.textContent = `${shortNumber(quests.xp)}/${shortNumber(need)}`;
    const mode = chargeMode();
    chargeBtn.textContent = mode.label;
    chargeBtn.title = mode.name;
    chargeBtn.classList.toggle('on', settings.charge > 0);
    chargeBtn.hidden = !AREAS[currentScene];
}

// Countdowns on the board and in dialogs tick in place, so a tap isn't lost
// to a redraw. Any element with data-ready="<timestamp>" counts down to it.
function updateCountdowns() {
    stageEl.querySelectorAll('[data-ready]').forEach(el => {
        el.textContent = formatDuration(Number(el.dataset.ready) - Date.now());
    });
}

document.getElementById('btn-energy').addEventListener('click', () => openEnergy());
document.getElementById('btn-level').addEventListener('click', openTaskLog);
chargeBtn.addEventListener('click', cycleCharge);
document.getElementById('btn-coins').addEventListener('click', openShop);
document.getElementById('btn-gems').addEventListener('click', openShop);

// --- GRID AND MERGE LOGIC ---

const grids = {
    'farm': Array(NUM_CELLS).fill(null),
    'hay': Array(NUM_CELLS).fill(null),
    'barn': Array(NUM_CELLS).fill(null),
    'fert': Array(NUM_CELLS).fill(null),
    'aqua': Array(NUM_CELLS).fill(null),
    'flower': Array(NUM_CELLS).fill(null)
};
Object.keys(grids).forEach(mode => grids[mode][0] = { type: 'shop', level: FIRST_WORKING_LEVEL });

// A fresh board starts cluttered, as in Merge Mansion: 📦 crates that open when
// you merge next to them, each hiding a cobwebbed item, and cobwebbed items you
// free by merging a matching item into them. The top two rows are mostly open,
// the next two a mix, and the bottom four crates. Two crates hide a cobwebbed
// level 1 producer part.
function clutterBoard() {
    const board = Array(NUM_CELLS).fill(null);
    board[0] = { type: 'shop', level: FIRST_WORKING_LEVEL };
    const webbed = () => ({ tier: Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2, web: true });
    const producerCrates = [30 + Math.floor(Math.random() * GAME_WIDTH), 42 + Math.floor(Math.random() * GAME_WIDTH)];
    for (let i = 1; i < NUM_CELLS; i++) {
        const row = Math.floor(i / GAME_WIDTH);
        if (row < 2) {
            if (i === 4 || i === 9 || i === 11) board[i] = webbed();
        } else if (row < 4) {
            board[i] = Math.random() < 0.5 ? webbed() : { type: 'box', hidden: webbed() };
        } else {
            const hidden = producerCrates.includes(i) ? { type: 'shop', level: 1, web: true } : webbed();
            board[i] = { type: 'box', hidden };
        }
    }
    return board;
}

// Merging next to a crate opens it and reveals the cobwebbed item inside.
function openBoxesAround(mode, index) {
    const opened = [];
    getNeighbors(index).forEach(n => {
        const cell = grids[mode][n];
        if (cell && cell.type === 'box') {
            grids[mode][n] = cell.hidden;
            stats.boxes++;
            opened.push(n);
        }
    });
    return opened;
}

// Build one board scene per area.
Object.keys(AREAS).forEach(mode => {
    const scene = document.createElement('section');
    scene.className = `scene board board-${mode}`;
    scene.id = `scene-${mode}`;
    scene.hidden = true;
    if (ASSETS.boards[mode]) scene.style.backgroundImage = `url("${ASSETS.boards[mode]}")`;
    scene.innerHTML = `<div class="board-header"></div><div class="game-grid" id="grid-${mode}"></div>`;
    stageEl.insertBefore(scene, dialogEl);
});

// The item shown in the info bar under the orders: { mode, index } or null.
let selected = null;
// The last item sold, so the info bar can offer Undo until you do something else.
let lastSale = null;

// Above each board: the orders it can fill, then the info bar.
function renderBoardHeader(mode) {
    const header = document.querySelector(`#scene-${mode} .board-header`);
    header.innerHTML = '<div class="orders"></div><div class="info-bar"></div>';
    renderOrders(mode, header.querySelector('.orders'));
    renderInfoBar(mode);
}

// Redraws everything on a board after it changes.
function refreshBoard(mode, poppedIndices = []) {
    renderGrid(mode, poppedIndices);
    renderBoardHeader(mode);
}

// Orders for this board, Merge Mansion style: who wants what, the reward, and a
// Deliver button as soon as the item is on the board. Cards for other boards
// with orders jump straight there.
function renderOrders(mode, el) {
    // Restoration jobs that need items from this board come first.
    openTasks().filter(t => t.needs.some(n => n.item === mode)).forEach(task => {
        const ready = taskReady(task);
        const need = task.needs.find(n => n.item === mode);
        const p = needProgress(task, need);
        const card = document.createElement('button');
        card.className = 'order-card task-card' + (ready ? ' ready' : '');
        card.innerHTML = `
            <span class="order-who"><span class="hammer">🔨</span><span class="want">${itemIcon(mode, need.tier)}</span></span>
            <span class="order-pay">${p.have}/${p.of} · ⭐${task.xp}</span>
            ${ready ? '<span class="order-go">Do it</span>' : `<span class="order-need">${task.name}</span>`}`;
        card.addEventListener('click', () => (ready ? completeTask(task.id) : openTaskLog()));
        el.appendChild(card);
    });

    npcs.filter(n => n.request && n.request.mode === mode).forEach(npc => {
        const r = npc.request;
        const ready = canFulfill(npc);
        const card = document.createElement('button');
        card.className = 'order-card' + (ready ? ' ready' : '');
        card.innerHTML = `
            <span class="order-who"><img class="face" src="${npcPicture(npc)}" alt="${npc.name}"><span class="want">${itemIcon(mode, r.tier)}</span></span>
            <span class="order-pay">💵${r.rewardMoney} ⭐${r.rewardXp}${r.rewardProducer ? ' 🎁' : ''}</span>
            ${ready ? '<span class="order-go">Deliver</span>' : `<span class="order-need">${itemName(mode, r.tier)}</span>`}`;
        card.addEventListener('click', () => (ready ? deliver(npc) : openNpc(npc)));
        el.appendChild(card);
    });

    const elsewhere = {};
    npcs.forEach(n => {
        if (n.request && n.request.mode !== mode) elsewhere[n.request.mode] = (elsewhere[n.request.mode] || 0) + 1;
    });
    Object.entries(elsewhere).forEach(([other, count]) => {
        const card = document.createElement('button');
        card.className = 'order-card other';
        card.innerHTML = `
            <span class="order-who"><img class="building" src="${ASSETS.buildings[other]}" alt=""></span>
            <span class="order-pay">${count} order${count > 1 ? 's' : ''}</span>
            <span class="order-need">${AREAS[other].name} →</span>`;
        card.addEventListener('click', () => goTo(other));
        el.appendChild(card);
    });

    if (!el.children.length) el.innerHTML = '<p class="no-orders">No orders right now. Check the Town Square later.</p>';
}

function sellPrice(mode, item) {
    return SELL_PRICES[Math.min(item.tier, SELL_PRICES.length - 1)];
}

// --- BOARD ITEMS ---
// Plain merge items are { tier }. Everything else has a type: box (crate), shop
// (producer or part), skip / charger / unlimited (boosters), coin / gem /
// energy / xp (currency), chest, piggy (Piggy Bank) and bubble (Double Bubble).
// Any of them can be cobwebbed (web: true).

function currencyValue(item) {
    return CURRENCY[item.type].values[levelOf(item) - 1];
}

// What a board item is called, e.g. "Big Feed Bin", "8 Coins", "Brown Chest".
function boardItemName(mode, item) {
    switch (item.type) {
        case 'box': return 'Crate';
        case 'shop': return producerName(mode, levelOf(item));
        case 'skip': case 'charger': case 'unlimited': return boosterName(item);
        case 'coin': case 'gem': case 'energy': case 'xp': case 'season': return `${currencyValue(item)} ${CURRENCY[item.type].name}`;
        case 'chest': return chestName(item);
        case 'piggy': return `${PIGGY.name}${levelOf(item) > 1 ? ` Lv${levelOf(item)}` : ''}`;
        case 'bubble': return 'Double Bubble';
        default: return itemName(mode, item.tier);
    }
}

// The emoji of any board item.
function itemEmojiFor(mode, item) {
    switch (item.type) {
        case 'box': return '📦';
        case 'shop': return levelOf(item) < FIRST_WORKING_LEVEL ? '🧩' : PRODUCERS[mode].emoji;
        case 'skip': case 'charger': case 'unlimited': return BOOSTERS[item.type].emoji;
        case 'coin': case 'gem': case 'energy': case 'xp': case 'season': return CURRENCY[item.type].emoji;
        case 'chest': return CHESTS[item.kind].emoji;
        case 'piggy': return PIGGY.emoji;
        case 'bubble': return '🫧';
        default: return itemEmoji(mode, item.tier);
    }
}

// A small picture of any board item, for the info bar and dialogs.
function itemIconFor(mode, item) {
    return item.type ? `<span class="inline-item">${itemEmojiFor(mode, item)}</span>` : itemIcon(mode, item.tier);
}

// Picture and name as text, for toasts and buttons: "🧩 Feed Pail".
function itemLabel(mode, item) {
    return `${itemEmojiFor(mode, item)} ${boardItemName(mode, item)}`;
}

// Things that merge by level: the top level they reach, or 0 if this one can't
// merge right now (a running Time Charger, an opened chest, a tapped Piggy Bank).
function levelMergeTop(item) {
    if (!item || !item.type) return 0;
    if (item.type === 'shop') return PRODUCER_MAX_LEVEL;
    if (BOOSTERS[item.type]) return item.until ? 0 : BOOSTERS[item.type].values.length;
    if (CURRENCY[item.type]) return CURRENCY[item.type].values.length;
    if (item.type === 'chest') return chestUnopened(item) ? CHESTS[item.kind].levels.length : 0;
    if (item.type === 'piggy') return item.drops === undefined ? PIGGY.levels.length : 0;
    return 0;
}

function sameLevelKind(a, b) {
    return !!a && !!b && a.type === b.type && a.kind === b.kind && levelOf(a) === levelOf(b);
}

// The free cell closest to `index`, or -1 if the board is full.
function nearestEmpty(mode, index) {
    const x = index % GAME_WIDTH;
    const y = Math.floor(index / GAME_WIDTH);
    let best = -1;
    let bestDistance = Infinity;
    grids[mode].forEach((cell, i) => {
        if (cell !== null) return;
        const distance = (i % GAME_WIDTH - x) ** 2 + (Math.floor(i / GAME_WIDTH) - y) ** 2;
        if (distance < bestDistance) { best = i; bestDistance = distance; }
    });
    return best;
}

// Puts an item in the free cell closest to `index`; returns where, or -1.
function spawnNear(mode, index, item) {
    const at = nearestEmpty(mode, index);
    if (at !== -1) grids[mode][at] = item;
    return at;
}

// Picks one entry of a chest's or piggy bank's [what, level, weight] contents.
function rollDrop(contents) {
    const total = contents.reduce((sum, c) => sum + c[2], 0);
    let roll = Math.random() * total;
    const [what, level] = contents.find(c => (roll -= c[2]) < 0) || contents[0];
    return { type: what === 'part' ? 'shop' : what, level };
}

// After a merge: maybe a Season Pass item, a Double Bubble with a copy of the
// new item, and an ⭐ XP star for a big merge, each in the nearest free cell (in
// that order, as in Merge Mansion). Returns the cells they landed in.
function afterMerge(mode, index, made) {
    const landed = [];
    if (made.type !== 'season' && Math.random() < SEASON_DROP_CHANCE) {
        const at = spawnNear(mode, index, { type: 'season', level: 1 });
        if (at !== -1) landed.push(at);
    }
    const isProducer = made.type === 'shop';
    const odds = !made.type ? BUBBLE_ODDS[made.tier] : isProducer ? PRODUCER_BUBBLE_ODDS[made.level] : 0;
    if (odds && Math.random() < odds) {
        const gems = !made.type ? BUBBLE_GEMS[made.tier] : PRODUCER_BUBBLE_GEMS[made.level];
        const inner = isProducer ? { type: 'shop', level: made.level } : { tier: made.tier };
        const at = spawnNear(mode, index, { type: 'bubble', inner, gems, until: Date.now() + bubbleMinutes(gems) * 60000 });
        if (at !== -1) {
            landed.push(at);
            toast(`🫧 A Double Bubble! Pop it for 💎${gems} before it's gone.`);
        }
    }
    const star = !made.type && made.tier >= 4 ? made.tier - 3 : isProducer && made.level >= 5 ? made.level - 4 : 0;
    if (star) {
        const at = spawnNear(mode, index, { type: 'xp', level: Math.min(star, CURRENCY.xp.values.length) });
        if (at !== -1) landed.push(at);
    }
    return landed;
}

// Pays the bubble's gems for the copy inside it.
function popBubble(mode, index) {
    const bubble = grids[mode][index];
    if (!bubble || bubble.type !== 'bubble' || !spendGems(bubble.gems)) return;
    grids[mode][index] = bubble.inner;
    tickProducer(mode, bubble.inner);
    updateUI();
    toast(`🫧 Popped! The ${boardItemName(mode, bubble.inner)} is yours.`, 'good');
    refreshBoard(mode, [index]);
}

// --- Chests and Piggy Banks ---

function chestStage(item) {
    return CHESTS[item.kind].levels[levelOf(item) - 1];
}

// Never unlocked or tapped: only these merge.
function chestUnopened(item) {
    return !item.openAt && item.drops === undefined;
}

function chestReady(item, now = Date.now()) {
    return !chestStage(item).minutes || (!!item.openAt && now >= item.openAt);
}

// Starts a Brown or Blue chest's unlock timer.
function unlockChest(mode, index) {
    const item = grids[mode][index];
    if (!item || item.type !== 'chest' || item.openAt || chestReady(item)) return;
    item.openAt = Date.now() + chestStage(item).minutes * 60000;
    refreshBoard(mode, [index]);
}

// Opens it now for gems.
function rushChest(mode, index) {
    const item = grids[mode][index];
    if (!item || item.type !== 'chest' || chestReady(item) || !spendGems(chestStage(item).skip)) return;
    item.openAt = Date.now();
    item.opened = true;
    updateUI();
    toast(`${chestName(item)} is open! Tap it to take things out.`, 'good');
    refreshBoard(mode, [index]);
}

// One tap on an open chest or a Piggy Bank drops one thing next to it; it
// disappears when it's empty.
function dropFrom(mode, index, stage, name) {
    const source = grids[mode][index];
    const at = nearestEmpty(mode, index);
    if (source.drops === undefined) source.drops = stage.drops;
    grids[mode][at] = rollDrop(stage.contents);
    source.drops--;
    lastSale = null;
    if (source.drops <= 0) {
        grids[mode][index] = null;
        toast(`The ${name} is empty.`);
        selected = { mode, index: at };
    } else {
        selected = { mode, index };
    }
    updateUI();
    refreshBoard(mode, [at]);
}

function boardFull(mode) {
    if (grids[mode].includes(null)) return false;
    toast('The board is full! Sell, merge or deliver something first.');
    return true;
}

function tapChest(mode, index) {
    if (boardFull(mode)) return;
    const chest = grids[mode][index];
    dropFrom(mode, index, chestStage(chest), chestName(chest));
}

function tapPiggy(mode, index) {
    if (boardFull(mode) || !payTapEnergy(1)) return;
    const piggy = grids[mode][index];
    dropFrom(mode, index, PIGGY.levels[levelOf(piggy) - 1], PIGGY.name);
}

// --- Collecting and using (double tap, or the info bar button) ---

function canActivate(item) {
    return !!item && !item.web && (!!CURRENCY[item.type] || (!!BOOSTERS[item.type] && !item.until));
}

function activateItem(mode, index) {
    const item = grids[mode][index];
    if (!canActivate(item)) return;
    if (CURRENCY[item.type]) collectCurrency(mode, index);
    else if (item.type === 'skip') useTimeSkip(mode, index);
    else if (item.type === 'charger') startCharger(mode, index);
    else startUnlimited(mode, index);
}

function collectCurrency(mode, index) {
    const item = grids[mode][index];
    const value = currencyValue(item);
    grids[mode][index] = null;
    selected = null;
    lastSale = null;
    if (item.type === 'xp') addXp(value);
    else if (item.type === 'coin') res.money += value;
    else if (item.type === 'gem') res.gems += value;
    else if (item.type === 'season') addPassPoints(value);
    else { res.energy += value; tickEnergy(); }
    toast(`+${CURRENCY[item.type].emoji}${value}`, 'good');
    updateUI();
    checkTasks();
    refreshBoard(mode);
}

// --- Inventory ---

// Anything you can pick up, except Double Bubbles and running Time Chargers.
function canStore(item) {
    return isFree(item) && !(item.type === 'charger' && item.until);
}

function storeItem(mode, index) {
    const item = grids[mode][index];
    if (!canStore(item)) {
        toast('That can\'t go in the 🎒.');
        return false;
    }
    if (inventory.items.length >= inventoryCapacity()) {
        toast('Your 🎒 is full. Tap it to buy another slot.');
        return false;
    }
    // Timers stop while stored.
    const now = Date.now();
    if (item.readyAt) { item.pausedLeft = item.readyAt - now; delete item.readyAt; }
    if (item.type === 'chest' && item.openAt && !chestReady(item)) { item.pausedOpen = item.openAt - now; delete item.openAt; }
    inventory.items.push({ mode, item });
    grids[mode][index] = null;
    if (selected && selected.mode === mode && selected.index === index) selected = null;
    toast(`🎒 Stored: ${itemLabel(mode, item)}`);
    return true;
}

// Puts a stored item back on its own board (and goes there).
function takeFromInventory(i) {
    const entry = inventory.items[i];
    if (!entry) return;
    const { mode, item } = entry;
    const at = grids[mode].indexOf(null);
    if (at === -1) {
        toast(`No room on your ${AREAS[mode].name} board.`);
        return;
    }
    const now = Date.now();
    if (item.pausedLeft !== undefined) { item.readyAt = now + item.pausedLeft; delete item.pausedLeft; }
    if (item.pausedOpen !== undefined) { item.openAt = now + item.pausedOpen; delete item.pausedOpen; }
    inventory.items.splice(i, 1);
    grids[mode][at] = item;
    selected = { mode, index: at };
    lastSale = null;
    if (currentScene !== mode) goTo(mode);
    else refreshBoard(mode, [at]);
}

// Slots you can use now: your own, plus the Golden Pass's while it lasts.
function inventoryCapacity() {
    return inventory.slots + (pass.golden ? GOLDEN_PASS.slots : 0);
}

// 💵 for the next slot, or undefined when you have them all.
function inventorySlotPrice() {
    return INVENTORY_SLOT_PRICES[inventory.slots - INVENTORY_FREE_SLOTS];
}

function buyInventorySlot() {
    const price = inventorySlotPrice();
    if (!price || res.money < price) return;
    res.money -= price;
    inventory.slots++;
    updateUI();
    toast(`🎒 You have ${inventory.slots} slots now.`, 'good');
    openInventory(currentScene);
}

function openInventory(mode) {
    const price = inventorySlotPrice();
    const slots = Array.from({ length: Math.max(inventoryCapacity(), inventory.items.length) }, (_, i) => {
        const entry = inventory.items[i];
        if (!entry) return '<span class="inv-slot empty"></span>';
        const here = entry.mode === mode;
        return `<button class="inv-slot${here ? '' : ' other'}" data-i="${i}">
                    ${itemIconFor(entry.mode, entry.item)}<small>${here ? boardItemName(entry.mode, entry.item) : AREAS[entry.mode].name}</small>
                </button>`;
    }).join('');
    showDialog({
        title: `🎒 Inventory · ${inventory.items.length}/${inventoryCapacity()}`,
        body: `<div class="inv-grid">${slots}</div>
               <p class="hint">Drag an item onto 🎒 to store it, tap it here to take it out. Timers stop while stored.</p>`,
        actions: [price ? buyAction(price, buyInventorySlot, `+1 slot · 💵${price}`) : null, { label: 'Close' }].filter(Boolean),
    });
    dialogBody.querySelectorAll('.inv-slot[data-i]').forEach(btn => btn.addEventListener('click', () => {
        closeDialog();
        takeFromInventory(Number(btn.dataset.i));
    }));
}

// --- Info bar ---

// The bar under the orders: 🎒 and waiting rewards, then whatever item is selected.
function renderInfoBar(mode) {
    const el = document.querySelector(`#scene-${mode} .info-bar`);
    if (!el) return;
    const prod = PRODUCERS[mode];
    const item = selected && selected.mode === mode ? grids[mode][selected.index] : null;
    const chainBtn = '<button class="chain-btn" title="See the whole chain">ⓘ</button>';
    const icon = item ? `<span class="info-icon">${itemIconFor(mode, item)}</span>` : '';
    const text = (title, small) => `<span class="info-text"><b>${title}</b><br><small>${small}</small></span>`;
    const button = (cls, label) => `<button class="sell-btn ${cls}">${label}</button>`;
    const countdown = at => `<span data-ready="${at}">${formatDuration(at - Date.now())}</span>`;
    let html = `<button class="inv-btn" title="Inventory: drag items here">🎒<small>${inventory.items.length}/${inventoryCapacity()}</small></button>`;
    if (crates[mode].length) html += `<button class="crate-btn">🎁 ${crates[mode].length}</button>`;

    if (!item && lastSale && lastSale.mode === mode) {
        html += `<span class="info-icon">${itemIcon(mode, lastSale.item.tier)}</span>
                 <span class="info-text"><b>Sold ${itemName(mode, lastSale.item.tier)}</b> for 💵${lastSale.price}<br><small>Changed your mind?</small></span>
                 ${button('undo-btn', 'Undo')}`;
    } else if (!item) {
        html += `<span class="info-text">Tap a ${prod.emoji} ${producerBaseName(mode)} to make items for ⚡1. Drag two alike together to merge. Tap an item to see it.</span>`;
    } else if (item.web) {
        const name = boardItemName(mode, item);
        html += icon + text(`${name} · 🕸️`, `Covered in cobwebs. Merge a free ${name} into it to free it.`) + button('dust-btn', `Dust<br>💎${dustPrice(item)}`);
    } else if (item.type === 'box') {
        html += `<span class="info-icon">📦</span>` + text('Crate', 'Merge anything next to it to open it.');
    } else if (item.type === 'bubble') {
        html += icon + text('Double Bubble', `A free ${boardItemName(mode, item.inner)} inside! Pop it before it's gone: ${countdown(item.until)}`)
            + button('pop-btn', `Pop<br>💎${item.gems}`);
    } else if (item.type === 'shop') {
        const level = levelOf(item);
        const name = producerName(mode, level);
        const next = level < PRODUCER_MAX_LEVEL ? `Merge two to make a ${producerName(mode, level + 1)}.` : 'Top level!';
        if (level < FIRST_WORKING_LEVEL) {
            html += icon + text(`${name} · part Lv${level}`, `${next} At Lv${FIRST_WORKING_LEVEL} it becomes a ${producerBaseName(mode)} that makes items.`) + chainBtn;
        } else {
            const s = producerStats(mode, level);
            const timer = item.readyAt ? ` · next charge ${countdown(item.readyAt)}` : '';
            html += icon + text(`${name} · Lv${level}`, `${item.drops}/${s.charges * s.drops} taps left${timer}. ${next}`) + chainBtn
                + (item.readyAt ? button('skip-btn', `Recharge<br>💎${s.skip}`) : '');
        }
    } else if (BOOSTERS[item.type]) {
        const amount = boosterAmount(item);
        const merge = levelOf(item) < BOOSTERS[item.type].values.length ? ' Merge two to double it.' : '';
        const what = {
            skip: `Skips ${amount} of recharging on every producer here.${merge}`,
            charger: item.until ? `Running: producers next to it recharge twice as fast for ${countdown(item.until)}.`
                : `Producers in the 8 cells around it recharge twice as fast for ${amount}.${merge}`,
            unlimited: `Producer taps cost no energy for ${amount}.${merge}`,
        }[item.type];
        html += icon + text(boosterName(item), what) + (item.until ? '' : button('use-btn', 'Use'));
    } else if (CURRENCY[item.type]) {
        const values = CURRENCY[item.type].values;
        const merge = levelOf(item) < values.length ? ` Merge two to make ${values[levelOf(item)]}.` : '';
        html += icon + text(boardItemName(mode, item), `Double-tap to collect.${merge}`) + button('collect-btn', 'Collect');
    } else if (item.type === 'chest') {
        const stage = chestStage(item);
        const left = item.drops === undefined ? stage.drops : item.drops;
        const merge = chestUnopened(item) && levelOf(item) < CHESTS[item.kind].levels.length ? ' Merge two unopened ones for a bigger chest.' : '';
        if (chestReady(item)) {
            html += icon + text(chestName(item), `Tap it to take things out: ${left} left. No energy needed.`);
        } else if (item.openAt) {
            html += icon + text(chestName(item), `Unlocking: ${countdown(item.openAt)}`) + button('rush-btn', `Open now<br>💎${stage.skip}`);
        } else {
            html += icon + text(chestName(item), `Unlock it to take out ${stage.drops} things (${formatDuration(stage.minutes * 60000)}).${merge}`)
                + button('unlock-btn', 'Unlock') + button('rush-btn', `Now<br>💎${stage.skip}`);
        }
    } else if (item.type === 'piggy') {
        const stage = PIGGY.levels[levelOf(item) - 1];
        const left = item.drops === undefined ? stage.drops : item.drops;
        const merge = item.drops === undefined && levelOf(item) < PIGGY.levels.length ? ' Merge two unused ones for a bigger one.' : '';
        html += icon + text(boardItemName(mode, item), `Tap it for coins and gems, ⚡1 each: ${left} left.${merge}`);
    } else {
        const last = NAMES[mode].length - 1;
        const tip = item.tier >= last ? 'The best there is!'
            : item.tier >= maxTier ? 'Max tier for now: buy the Growth Guide at the Market.'
            : `Merge two to make ${itemIcon(mode, item.tier + 1)} ${itemName(mode, item.tier + 1)}.`;
        html += icon + text(`${itemName(mode, item.tier)} · tier ${item.tier}`, tip) + chainBtn + button('sell-item-btn', `Sell<br>💵${sellPrice(mode, item)}`);
    }

    el.innerHTML = html;
    const index = selected && selected.index;
    const on = (sel, fn) => { const btn = el.querySelector(sel); if (btn) btn.addEventListener('click', fn); };
    on('.inv-btn', () => openInventory(mode));
    on('.crate-btn', () => placeFromCrate(mode));
    on('.undo-btn', () => undoSale(mode));
    on('.dust-btn', () => dustSelected(mode));
    on('.skip-btn', () => skipRecharge(mode, index));
    on('.pop-btn', () => popBubble(mode, index));
    on('.use-btn', () => activateItem(mode, index));
    on('.collect-btn', () => activateItem(mode, index));
    on('.unlock-btn', () => unlockChest(mode, index));
    on('.rush-btn', () => rushChest(mode, index));
    on('.chain-btn', () => (item.type === 'shop' ? openProducerInfo(mode) : openChain(mode, item.tier)));
    on('.sell-item-btn', () => sellSelected(mode));
}

// Selling frees space; big items ask first because orders pay far more.
function sellSelected(mode) {
    const index = selected && selected.mode === mode ? selected.index : -1;
    const item = grids[mode][index];
    if (!isFree(item) || item.type) return;
    const price = sellPrice(mode, item);
    const sell = () => {
        grids[mode][index] = null;
        res.money += price;
        stats.sold++;
        selected = null;
        lastSale = { mode, index, item, price };
        updateUI();
        checkTasks();
        refreshBoard(mode);
    };
    if (item.tier < 5) {
        sell();
        return;
    }
    showDialog({
        title: `Sell the ${itemName(mode, item.tier)}?`,
        body: `<p>It sells for 💵${price}. Orders usually pay much more.</p>`,
        actions: [{ label: `Sell for 💵${price}`, primary: true, onClick: sell }, { label: 'Keep it' }],
    });
}

// Puts the last sold item back (in its old cell if it's still empty).
function undoSale(mode) {
    if (!lastSale || lastSale.mode !== mode) return;
    if (res.money < lastSale.price) {
        toast(`You've already spent the 💵${lastSale.price}.`);
        return;
    }
    const index = grids[mode][lastSale.index] === null ? lastSale.index : grids[mode].findIndex(cell => cell === null);
    if (index === -1) {
        toast('No room on the board to put it back.');
        return;
    }
    grids[mode][index] = lastSale.item;
    res.money -= lastSale.price;
    stats.sold--;
    selected = { mode, index };
    lastSale = null;
    updateUI();
    refreshBoard(mode, [index]);
}

function dustSelected(mode) {
    const item = selected && selected.mode === mode ? grids[mode][selected.index] : null;
    if (!item || !item.web || !spendGems(dustPrice(item))) return;
    delete item.web;
    stats.webs++;
    updateUI();
    toast('🕸️ Dusted off!', 'good');
    checkTasks();
    refreshBoard(mode, [selected.index]);
}

// Normal → Supercharge → Hypercharge → Normal, as in Merge Mansion.
function cycleCharge() {
    settings.charge = (settings.charge + 1) % CHARGE_MODES.length;
    const mode = chargeMode();
    toast(mode.boost
        ? `${mode.label} ${mode.name}: every tap costs ⚡${mode.cost} and drops items ${mode.boost} tier${mode.boost > 1 ? 's' : ''} higher.`
        : '⚡ Back to normal: ⚡1 a tap.');
    updateUI();
}

// The whole merge chain of a board, like Merge Mansion's "i" button.
function openChain(mode, highlightTier) {
    const tiles = NAMES[mode].map((_, t) => `
        <div class="chain-tile${t === highlightTier ? ' current' : ''}${t > maxTier ? ' locked' : ''}">
            ${itemIcon(mode, t)}<small>${t}. ${itemName(mode, t)}</small>
        </div>`).join('');
    showDialog({
        title: `${AREAS[mode].name} chain`,
        body: `<div class="chain-grid">${tiles}</div>
               <p class="hint">Made by tapping a ${PRODUCERS[mode].emoji} ${producerBaseName(mode)} or better. Dimmed tiers need the Growth Guide from the Market.</p>`,
        actions: [{ label: 'OK' }],
    });
}

// Every level of a board's producer: parts, then what each working level does.
function openProducerInfo(mode) {
    const rows = PRODUCERS[mode].names.map((name, i) => {
        const level = i + 1;
        const s = producerStats(mode, level);
        const odds = s && DROP_ODDS[level - FIRST_WORKING_LEVEL].map((p, t) => p && `${Math.round(p * 100)}% t${t}`).filter(Boolean).join(' ');
        return `<div class="quest"><span>${s ? PRODUCERS[mode].emoji : '🧩'} Lv${level} ${name}</span>
                <small>${s ? `${s.charges}×${s.drops} taps · ${odds}` : 'part'}</small></div>`;
    }).join('');
    showDialog({
        title: `${PRODUCERS[mode].emoji} ${producerBaseName(mode)} levels`,
        body: `${rows}<p class="hint">Merge two of the same level to get the next. Each charge recharges in ${formatDuration(rechargeMs(mode))}.</p>`,
        actions: [{ label: 'OK' }],
    });
}

// Puts the next waiting reward from the 🎁 onto the first empty cell.
function placeFromCrate(mode) {
    const idx = grids[mode].findIndex(cell => cell === null);
    if (idx === -1) {
        toast('No room on the board. Sell, merge or deliver something first.');
        return;
    }
    const item = crates[mode].shift();
    grids[mode][idx] = item;
    tickProducer(mode, item);
    lastSale = null;
    selected = { mode, index: idx };
    toast(`${boardItemName(mode, item)} added!`, 'good');
    refreshBoard(mode, [idx]);
}

// --- Dragging, tapping and merging ---

let draggedItemInfo = null;
let dragElement = null;
// The last tap, to spot a double tap.
let lastTap = null;
const DOUBLE_TAP_MS = 400;

// The drag preview lives inside the stage so its cqw-based sizes match the board.
function placeDragElement(e) {
    const stageRect = stageEl.getBoundingClientRect();
    dragElement.style.left = e.clientX - stageRect.left - dragElement.offsetWidth / 2 + 'px';
    dragElement.style.top = e.clientY - stageRect.top - dragElement.offsetHeight / 2 + 'px';
}

// How far (px) the pointer must move before a press becomes a drag; less is a tap.
const DRAG_THRESHOLD = 6;

function handleDragStart(e, mode, index) {
    e.preventDefault();
    lastSale = null;
    draggedItemInfo = { mode, index, startX: e.clientX, startY: e.clientY };
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
}

// The drag preview appears only once the pointer has moved, so a tap stays a tap.
function beginDragPreview() {
    const { mode, index } = draggedItemInfo;
    const cellEl = document.querySelector(`#grid-${mode} .grid-cell[data-index='${index}'] .item`);
    cellEl.style.opacity = '0.3';

    dragElement = cellEl.cloneNode(true);
    dragElement.classList.add('dragging');
    dragElement.style.position = 'absolute';
    dragElement.style.width = cellEl.offsetWidth + 'px';
    dragElement.style.height = cellEl.offsetHeight + 'px';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.opacity = '0.9';
    dragElement.style.zIndex = '1000';
    stageEl.appendChild(dragElement);
}

function handleDragMove(e) {
    if (!draggedItemInfo) return;
    if (!dragElement) {
        const moved = Math.hypot(e.clientX - draggedItemInfo.startX, e.clientY - draggedItemInfo.startY);
        if (moved < DRAG_THRESHOLD) return;
        if (!isFree(grids[draggedItemInfo.mode][draggedItemInfo.index])) return; // crates, cobwebs and bubbles stay put
        beginDragPreview();
    }
    placeDragElement(e);
}

// A tap: producers, piggy banks and open chests drop something; a double tap
// collects currency or uses a booster; anything else is shown in the info bar.
function onTap(mode, index) {
    const item = grids[mode][index];
    const now = Date.now();
    const twice = !!lastTap && lastTap.mode === mode && lastTap.index === index && now - lastTap.at < DOUBLE_TAP_MS;
    lastTap = { mode, index, at: now };
    if (isFree(item)) {
        if (isWorkingProducer(item)) return handleGeneratorClick(mode, index);
        if (item.type === 'piggy') return tapPiggy(mode, index);
        if (item.type === 'chest' && chestReady(item)) return tapChest(mode, index);
        if (twice && canActivate(item)) {
            lastTap = null;
            return activateItem(mode, index);
        }
    }
    selected = { mode, index };
    refreshBoard(mode);
}

function handleDragEnd(e) {
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);

    const wasDragged = !!dragElement;
    if (dragElement) {
        dragElement.remove();
        dragElement = null;
    }

    if (!draggedItemInfo) return;
    const { mode, index } = draggedItemInfo;
    draggedItemInfo = null;

    if (!wasDragged) {
        onTap(mode, index);
        return;
    }

    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    // Dropped on 🎒: store it.
    if (elements.some(el => el.closest && el.closest(`#scene-${mode} .inv-btn`))) {
        storeItem(mode, index);
        refreshBoard(mode);
        return;
    }
    let targetCell = null;
    for (const el of elements) {
        if (el.classList.contains('grid-cell') && el.closest('.game-grid').id === `grid-${mode}`) {
            targetCell = el;
            break;
        }
    }

    let popped = [];
    if (targetCell) {
        const targetIndex = parseInt(targetCell.dataset.index);
        if (targetIndex !== index) {
            const sourceItem = grids[mode][index];
            const targetItem = grids[mode][targetIndex];
            // Producers and their parts, boosters, currency, chests and piggy banks
            // merge by level; plain items by tier.
            const topLevel = levelMergeTop(sourceItem);
            const sameLevel = !!topLevel && sameLevelKind(sourceItem, targetItem) && levelMergeTop(targetItem) > 0;
            const sameKind = targetItem && !sourceItem.type && !targetItem.type && targetItem.tier === sourceItem.tier;
            let made = null;

            if (sameLevel && levelOf(sourceItem) < topLevel) {
                // Two of the same level make the next level. A new producer starts fully charged.
                const level = levelOf(sourceItem) + 1;
                made = sourceItem.kind ? { type: sourceItem.type, kind: sourceItem.kind, level } : { type: sourceItem.type, level };
                tickProducer(mode, made);
                if (made.type === 'shop') {
                    stats.upgrades++;
                    toast(level === FIRST_WORKING_LEVEL
                        ? `🎉 A ${producerName(mode, level)}! Tap it to make items.`
                        : `Merged into a ${producerName(mode, level)}!`, 'good');
                } else {
                    toast(`${itemLabel(mode, made)}!`, 'good');
                }
            } else if (sameKind && sourceItem.tier < maxTier) {
                // Direct Merge 2
                made = { tier: sourceItem.tier + 1 };
                stats.made[`${mode}:${made.tier}`] = madeCount(mode, made.tier) + 1;
                stats.merges++;
            } else if (sameKind) {
                toast(`Tier ${maxTier} is the max for now. Buy the Growth Guide at the Market!`);
            } else if (sameLevel) {
                toast(`That's already a ${boardItemName(mode, sourceItem)}, the best there is!`);
            } else if (targetItem && targetItem.type === 'box') {
                toast('Crates stay put. Merge something next to one to open it.');
            } else if (targetItem && targetItem.web) {
                toast('Cobwebbed items stay put. Merge a matching item into one to free it.');
            } else if (targetItem && targetItem.type === 'bubble') {
                toast('Bubbles stay put. Pop it, or let it float away.');
            }

            const swapped = !made && !sameKind && !sameLevel && (!targetItem || isFree(targetItem));
            if (swapped) {
                grids[mode][index] = targetItem;
                grids[mode][targetIndex] = sourceItem;
            }
            if (made) {
                grids[mode][index] = null;
                grids[mode][targetIndex] = made;
                if (targetItem.web) {
                    stats.webs++;
                    toast('🕸️ Freed!', 'good');
                }
                popped = [targetIndex, ...openBoxesAround(mode, targetIndex), ...afterMerge(mode, targetIndex, made)];
            }
            selected = { mode, index: made || swapped ? targetIndex : index };
        }
    }

    checkTasks();
    refreshBoard(mode, popped);
}

function getNeighbors(index) {
    const neighbors = [];
    const x = index % GAME_WIDTH;
    const y = Math.floor(index / GAME_WIDTH);
    if (x > 0) neighbors.push(index - 1);
    if (x < GAME_WIDTH - 1) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - GAME_WIDTH);
    if (y < GAME_HEIGHT - 1) neighbors.push(index + GAME_WIDTH);
    return neighbors;
}

function handleGeneratorClick(mode, index) {
    const producer = grids[mode][index];
    tickProducer(mode, producer);
    if (producer.drops <= 0) {
        selected = { mode, index };
        refreshBoard(mode);
        openRecharge(mode, index);
        return;
    }
    if (boardFull(mode)) return;
    const charge = chargeMode();
    if (!payTapEnergy(charge.cost)) return;
    producer.drops--;
    tickProducer(mode, producer); // starts recharging once a whole charge is used
    lastSale = null;
    updateUI();

    let drop;
    if (Math.random() < PART_DROP_CHANCE) {
        drop = { type: 'shop', level: 1 };
        toast(`🧩 Lucky! A ${producerName(mode, 1)} part dropped.`, 'good');
    } else {
        const odds = DROP_ODDS[producerLevel(producer) - FIRST_WORKING_LEVEL];
        let roll = Math.random();
        let tier = odds.findIndex(p => (roll -= p) < 0);
        if (tier === -1) tier = 0;
        drop = { tier: Math.min(tier + charge.boost, maxTier) };
    }
    const at = spawnNear(mode, index, drop);
    stats.spawned[mode] = (stats.spawned[mode] || 0) + 1;
    selected = { mode, index };
    checkTasks();
    refreshBoard(mode, [at]);
}

// --- Drawing the board ---

// Art for a currency item, booster, chest or Piggy Bank from ASSETS.special, if any.
function specialSprite(item) {
    const key = item.type === 'chest' ? `chest_${item.kind}` : item.type;
    return ((ASSETS.special || {})[key] || [])[levelOf(item) - 1] || null;
}

// How an item looks: extra CSS classes, its inside, an inline style, and the
// small badge in the corner (tier, level or amount).
function itemFace(mode, item) {
    const emoji = e => `<span class="emoji">${e}</span>`;
    const named = (e, name) => `${emoji(e)}<span class="name">${name}</span>`;
    const sprite = src => `<img src="${src}" alt="" draggable="false">`;
    const art = specialSprite(item);
    if (art) return { cls: ['has-sprite'], html: sprite(art), badge: levelOf(item) };
    switch (item.type) {
        case 'box':
            return ASSETS.props.crate ? { cls: ['box', 'has-sprite'], html: sprite(ASSETS.props.crate) } : { cls: ['box'], html: emoji('📦') };
        case 'shop': {
            const level = levelOf(item);
            const art = (ASSETS.producers[mode] || [])[level - 1];
            const part = level < FIRST_WORKING_LEVEL;
            return {
                cls: art ? ['has-sprite'] : ['generator', part ? 'part' : `gen-lv${level}`],
                html: art ? sprite(art) : named(itemEmojiFor(mode, item), producerName(mode, level)),
                badge: level, badgeCls: 'gen-level',
            };
        }
        case 'skip': case 'charger': case 'unlimited':
            return { cls: ['booster', `booster-${item.type}`].concat(item.until ? ['running'] : []), html: named(itemEmojiFor(mode, item), boosterAmount(item)), badge: levelOf(item) };
        case 'coin': case 'gem': case 'energy': case 'xp': case 'season':
            return { cls: ['currency', `cur-${item.type}`], html: named(itemEmojiFor(mode, item), currencyValue(item)), badge: levelOf(item) };
        case 'chest':
            return { cls: ['chest', `chest-${item.kind}`].concat(chestReady(item) ? ['open'] : item.openAt ? [] : ['locked']), html: named(itemEmojiFor(mode, item), CHESTS[item.kind].name), badge: levelOf(item) };
        case 'piggy':
            return { cls: ['piggy'], html: named(PIGGY.emoji, PIGGY.name), badge: levelOf(item) };
        case 'bubble': {
            const inner = item.inner;
            const art = !inner.type && itemSprite(mode, inner.tier);
            return { cls: ['bubble-item'], html: `<span class="bubble-inner">${art ? sprite(art) : emoji(itemEmojiFor(mode, inner))}</span>` };
        }
        default: {
            const art = itemSprite(mode, item.tier);
            if (art) return { cls: ['has-sprite'], html: sprite(art), badge: item.tier || null };
            const hue = getHue(mode, item.tier);
            return {
                cls: [],
                style: `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 70%), hsl(${hue}, 80%, 40%))`,
                html: named(itemEmoji(mode, item.tier), itemName(mode, item.tier)),
                badge: item.tier || null,
            };
        }
    }
}

// When the countdown shown on an item ends, or 0 for none.
function itemTimer(item) {
    if (isWorkingProducer(item) && !item.web && item.drops <= 0 && item.readyAt) return item.readyAt;
    if (item.type === 'charger' && item.until) return item.until;
    if (item.type === 'chest' && item.openAt && !chestReady(item)) return item.openAt;
    if (item.type === 'bubble') return item.until;
    return 0;
}

function renderGrid(mode, poppedIndices = []) {
    const gridEl = document.getElementById(`grid-${mode}`);
    if (!gridEl) return;
    gridEl.innerHTML = '';
    const wanted = new Set(npcs.filter(n => n.request && n.request.mode === mode).map(n => n.request.tier).concat(taskWantedTiers(mode)));

    for (let i = 0; i < NUM_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;

        const item = grids[mode][i];
        if (item !== null) {
            const face = itemFace(mode, item);
            const itemEl = document.createElement('div');
            itemEl.className = ['item', ...face.cls].join(' ');
            if (poppedIndices.includes(i)) itemEl.classList.add('pop');
            if (face.style) itemEl.style.background = face.style;
            itemEl.innerHTML = face.html;
            itemEl.title = boardItemName(mode, item);
            if (face.badge) addTag(itemEl, `tier${face.badgeCls ? ` ${face.badgeCls}` : ''}`, face.badge);
            if (!item.type && isFree(item) && wanted.has(item.tier)) {
                itemEl.classList.add('wanted');
                addTag(itemEl, 'tick', '✓');
            }
            const timer = itemTimer(item);
            if (timer) {
                if (item.type === 'shop') itemEl.classList.add('empty');
                addTag(itemEl, 'gen-timer', formatDuration(timer - Date.now())).dataset.ready = timer;
            }
            if (item.type === 'chest' && !item.openAt && !chestReady(item)) addTag(itemEl, 'lock', '🔒');
            if (item.web) {
                itemEl.classList.add('webbed');
                addTag(itemEl, 'web', '');
            }
            if (selected && selected.mode === mode && selected.index === i) itemEl.classList.add('selected');
            itemEl.addEventListener('pointerdown', (e) => handleDragStart(e, mode, i));
            cell.appendChild(itemEl);
        }
        gridEl.appendChild(cell);
    }
}

// --- SAVING ---
// Progress is kept in this browser's localStorage, including when the next ⚡
// and each producer's next charge arrive, so they keep coming while the game
// is closed. Open the game with ?reset at the end of the link to start over.
const SAVE_KEY = 'merge-farmstead-save-v1';
// 2: one ⚡ Energy bar instead of five essentials, and producers with parts.
// 3: XP levels, inventory, chests and boosters.
// 4: restoration jobs instead of level quests.
const SAVE_VERSION = 4;

function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            version: SAVE_VERSION,
            res, energyAt, shop, crates, inventory, stats, quests, restoration, pass, daily, settings, unlocks, maxTier, grids, lastBoard,
            tickedAt: lastTickAt,
            npcs: npcs.map(({ id, deliveries, request }) => ({ id, deliveries, request })),
        }));
    } catch (e) {
        // Storage blocked or full: the game still plays, it just won't be saved.
    }
}

// Version 1 producers had levels 1-5 that all worked. They're levels 4-8 now,
// after the three part levels, so every producer keeps working as before.
function migrateProducers(save) {
    const bump = item => {
        if (!item) return;
        if (item.type === 'shop') item.level = Math.min(PRODUCER_MAX_LEVEL, (item.level || 1) + 3);
        if (item.type === 'box') bump(item.hidden);
    };
    Object.values(save.grids || {}).forEach(board => board.forEach(bump));
    Object.values(save.crates || {}).forEach(list => list.forEach(bump));
}

function loadGame() {
    try {
        if (new URLSearchParams(location.search).has('reset')) {
            localStorage.removeItem(SAVE_KEY);
            history.replaceState(null, '', location.pathname);
        }
        const save = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (!save) return false;
        const version = save.version || 1;
        if (version < 2) migrateProducers(save);
        Object.keys(res).forEach(key => { if (typeof save.res[key] === 'number') res[key] = save.res[key]; });
        energyAt = save.energyAt || null;
        Object.assign(shop, save.shop);
        Object.assign(crates, save.crates);
        Object.assign(stats, save.stats);
        quests.level = save.quests.level || 1;
        quests.xp = save.quests.xp || 0;
        if (save.restoration) Object.assign(restoration, save.restoration);
        if (save.pass) Object.assign(pass, save.pass);
        Object.assign(inventory, save.inventory);
        if (version < 4) {
            // Land bought before restoration jobs existed counts as its first job done.
            Object.keys(AREAS).forEach(id => { if (unlocks[id] || (save.unlocks || {})[id]) {
                const first = landTasks(id)[0];
                if (first.needs[0].own && !restoration.done.includes(first.id)) restoration.done.push(first.id);
            } });
        }
        Object.assign(daily, save.daily);
        if (save.settings && typeof save.settings.charge === 'number') settings.charge = save.settings.charge;
        if (save.settings && save.settings.unlimitedUntil) settings.unlimitedUntil = save.settings.unlimitedUntil;
        if (save.lastBoard && AREAS[save.lastBoard]) lastBoard = save.lastBoard;
        if (save.tickedAt) lastTickAt = save.tickedAt;
        Object.assign(unlocks, save.unlocks);
        maxTier = save.maxTier;
        Object.keys(grids).forEach(mode => {
            if (save.grids[mode] && save.grids[mode].length === NUM_CELLS) grids[mode] = save.grids[mode];
        });
        save.npcs.forEach(saved => {
            const npc = npcs.find(n => n.id === saved.id);
            if (npc) Object.assign(npc, saved);
            // Orders paid ❤️ hearts before version 3; now they pay XP.
            if (npc && npc.request && npc.request.rewardXp === undefined) npc.request.rewardXp = orderXp(npc.request.tier);
        });
        return true;
    } catch (e) {
        return false;
    }
}

// Initial setup
['map', 'town', 'market'].forEach(id => {
    document.getElementById(`scene-${id}`).style.backgroundImage = `url("${ASSETS.scenes[id]}")`;
});
if (!loadGame()) {
    initTown(true);
    grids.barn = clutterBoard();
}
// Jobs already ready when the game opens are shown by the 📋 badge, not announced.
openTasks().filter(taskReady).forEach(task => announcedTasks.add(task.id));
checkTasks();
syncSeason();
tickEnergy(); // catch up on energy and timers that ran while the game was closed
tickBoards();
addXp(0); // a migrated save may already have enough XP for its next level
claimDailyBasket();
claimPassGems();
Object.keys(grids).forEach(mode => renderGrid(mode));
updateUI();
goTo('map');
// The first visit each day opens the daily gift, as in Merge Gardens.
if (dailyAvailable()) setTimeout(openDailyGift, 600);

setInterval(() => {
    tickEnergy();
    const changed = tickBoards();
    // Redraw a board when one of its timers ends, but not mid-drag (the drop redraws it).
    if (changed.includes(currentScene) && !draggedItemInfo) refreshBoard(currentScene);
    claimDailyBasket();
    syncSeason();
    claimPassGems();
    updateUI();
    updateCountdowns();
    saveGame();
}, 1000);
addEventListener('pagehide', saveGame);
