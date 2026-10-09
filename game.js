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
// Buying energy: ⚡100 for 💎5, doubling with each purchase that day.
const ENERGY_PACK = 100;
const ENERGY_PRICE = 5;

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

// Time Skip boosters (Merge Mansion): merge two to double the time, tap to skip
// that much recharge time on every producer on the board.
const TIME_SKIPS = [
    { name: 'Small Time Skip',  hours: 1 },
    { name: 'Medium Time Skip', hours: 2 },
    { name: 'Big Time Skip',    hours: 4 },
    { name: 'Huge Time Skip',   hours: 8 },
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

// What finishing a player level's quests pays.
function levelReward(level) {
    return { money: 100 * level, gems: 5 + level, energy: 50, part: Math.min(3, Math.ceil(level / 3)), timeSkip: level >= 3 ? 1 : 0 };
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
const res = { money: 0, gems: 0, hearts: 0, energy: 0 };
Object.assign(res, START);
// When the next ⚡ arrives (ms timestamp), or null when the bar is full.
let energyAt = null;
// Counters the quests read from (saved with the game).
const stats = { spawned: {}, made: {}, merges: 0, delivered: 0, sold: 0, upgrades: 0, gifts: 0, boxes: 0, webs: 0 };
// Player toggles (saved with the game). charge = index into CHARGE_MODES.
const settings = { charge: 0 };
// Player level, and each quest's counter value when the level started.
const quests = { level: 1, baselines: [], done: [] };
// Daily gift track: the last day claimed and how many days in a row.
const daily = { lastDay: null, streak: 0 };
// Rewards (producer parts, Time Skips) waiting in each board's 🎁 until placed.
const crates = { barn: [], hay: [], farm: [], fert: [], aqua: [], flower: [] };
// Daily Basket, Special Offer, energy purchases and ads (saved with the game).
const shop = {
    basketStart: null, basketClaimed: null, offerBought: false, offerShown: false,
    adsDay: null, adsWatched: 0, energyDay: null, energyBought: 0,
};
let currentScene = 'map';

// UI Elements
const moneyEl = document.getElementById('money-val');
const gemsEl = document.getElementById('gems-val');
const energyEl = document.getElementById('energy-val');
const energyTimerEl = document.getElementById('energy-timer');
const heartsEl = document.getElementById('hearts-val');
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

function producerLevel(item) {
    return item.level || 1;
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

// Ticks every producer on every board; returns the boards where a charge arrived.
function tickProducers(now = Date.now()) {
    return Object.keys(grids).filter(mode => grids[mode].map(item => tickProducer(mode, item, now)).some(Boolean));
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

// A Time Skip moves every recharge on the board forward by its hours.
function useTimeSkip(mode, index) {
    const item = grids[mode][index];
    if (!item || item.type !== 'skip') return;
    const { name, hours } = TIME_SKIPS[producerLevel(item) - 1];
    const waiting = grids[mode].filter(cell => isWorkingProducer(cell) && !cell.web && cell.readyAt);
    if (!waiting.length) {
        toast('Nothing is recharging on this board right now. Save it for later!');
        return;
    }
    waiting.forEach(cell => { cell.readyAt -= hours * 3600000; tickProducer(mode, cell); });
    grids[mode][index] = null;
    selected = null;
    toast(`⏳ ${name}: ${hours}h skipped on the ${AREAS[mode].name}!`, 'good');
    refreshBoard(mode);
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

// 💎5 for the first ⚡100 of the day, then 10, 20, 40...
function energyPrice() {
    if (shop.energyDay !== today()) { shop.energyDay = today(); shop.energyBought = 0; }
    return ENERGY_PRICE * 2 ** shop.energyBought;
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
               <p class="hint">Every producer tap costs ⚡1. The price of ⚡${ENERGY_PACK} doubles with each buy and resets tomorrow.</p>`,
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

function timeSkipName(level) {
    return TIME_SKIPS[level - 1].name;
}

function rewardText(r) {
    return [
        r.money && `💵${r.money}`, r.gems && `💎${r.gems}`, r.energy && `⚡${r.energy}`,
        r.part && `🧩 Lv${r.part} part`, r.timeSkip && `⏳ ${TIME_SKIPS[r.timeSkip - 1].hours}h skip`,
    ].filter(Boolean).join(' ');
}

// Pays a reward. A producer part goes into the 🎁 of a random board you own; a
// Time Skip into the 🎁 of your slowest board, where it saves the most time.
function grantReward(r, title) {
    if (r.money) res.money += r.money;
    if (r.gems) res.gems += r.gems;
    if (r.energy) { res.energy += r.energy; tickEnergy(); }
    const owned = Object.keys(AREAS).filter(id => unlocks[id]);
    const where = [];
    if (r.part) {
        const mode = owned[Math.floor(Math.random() * owned.length)];
        crates[mode].push({ type: 'shop', level: r.part });
        where.push(`${producerName(mode, r.part)}: tap 🎁 on your ${AREAS[mode].name} board`);
    }
    if (r.timeSkip) {
        const mode = owned.reduce((a, b) => (PRODUCERS[b].minutes > PRODUCERS[a].minutes ? b : a));
        crates[mode].push({ type: 'skip', level: r.timeSkip });
        where.push(`${timeSkipName(r.timeSkip)} in your ${AREAS[mode].name} 🎁`);
    }
    updateUI();
    toast(`${title} ${rewardText(r)}${where.length ? ` · ${where.join(' · ')}` : ''}`, 'good');
}

// --- QUESTS & PLAYER LEVEL ---
// Three quests per level, like Merge Gardens' Daisy's Quests. Finishing them
// levels you up, which pays a reward and unlocks the next piece of land.
// Progress counts only what happens after the level starts, except "owned"
// quests, which check the current state.

function madeCount(mode, tier) {
    return stats.made[`${mode}:${tier}`] || 0;
}

function makeQuest(mode, tier, target) {
    return { label: `Make ${itemEmoji(mode, tier)} ${itemName(mode, tier)} ×${target}`, count: () => madeCount(mode, tier), target };
}

function ownQuest(id) {
    return { label: `Own the ${AREAS[id].name}`, count: () => (unlocks[id] ? 1 : 0), target: 1, owned: true };
}

function deliverQuest(target) {
    return { label: `Deliver ${target} order${target > 1 ? 's' : ''}`, count: () => stats.delivered, target };
}

function questsFor(level) {
    switch (level) {
        case 1: return [
            makeQuest('barn', 1, 2),
            { label: 'Open 📦 crates ×2 (merge next to them)', count: () => stats.boxes, target: 2 },
            deliverQuest(1),
        ];
        case 2: return [
            makeQuest('barn', 2, 2),
            { label: 'Free 🕸️ cobwebbed items ×3', count: () => stats.webs, target: 3 },
            { label: 'Merge two producer parts 🧩', count: () => stats.upgrades, target: 1 },
        ];
        case 3: return [ownQuest('farm'), makeQuest('farm', 1, 3), deliverQuest(3)];
        case 4: return [ownQuest('hay'), makeQuest('barn', 3, 2), { label: 'Sell 3 items', count: () => stats.sold, target: 3 }];
        case 5: return [ownQuest('fert'), makeQuest('hay', 2, 3), deliverQuest(5)];
        case 6: return [ownQuest('aqua'), { label: 'Claim 2 daily gifts', count: () => stats.gifts, target: 2 }, deliverQuest(6)];
        case 7: return [ownQuest('flower'), makeQuest('aqua', 2, 3), deliverQuest(6)];
        default: {
            const n = level - 7;
            return [
                deliverQuest(5 + n),
                { label: `Merge ${10 + 5 * n} times`, count: () => stats.merges, target: 10 + 5 * n },
                { label: `Tap producers ${20 + 10 * n} times`, count: () => Object.values(stats.spawned).reduce((a, b) => a + b, 0), target: 20 + 10 * n },
            ];
        }
    }
}

function questProgress(i) {
    const q = questsFor(quests.level)[i];
    const value = q.owned ? q.count() : q.count() - (quests.baselines[i] || 0);
    return Math.min(q.target, Math.max(0, value));
}

function allQuestsDone() {
    return questsFor(quests.level).every((q, i) => questProgress(i) >= q.target);
}

function startLevel() {
    const list = questsFor(quests.level);
    quests.baselines = list.map(q => (q.owned ? 0 : q.count()));
    quests.done = list.map(() => false);
}

// Called after anything that can move a quest forward; cheers each one once.
function checkQuests() {
    questsFor(quests.level).forEach((q, i) => {
        if (!quests.done[i] && questProgress(i) >= q.target) {
            quests.done[i] = true;
            toast(`✅ Quest done: ${q.label}`, 'good');
            if (allQuestsDone()) toast('All quests done! Tap 📋 on the map to level up.', 'good');
        }
    });
}

function openQuests() {
    const list = questsFor(quests.level);
    const reward = levelReward(quests.level);
    const nextLand = Object.keys(AREAS).find(id => AREAS[id].level === quests.level + 1);
    const rows = list.map((q, i) => {
        const p = questProgress(i);
        const done = p >= q.target;
        return `<div class="quest${done ? ' done' : ''}">
                    <span>${done ? '✅' : '⬜'} ${q.label}</span><small>${p}/${q.target}</small>
                    <span class="quest-bar"><i style="width:${(100 * p) / q.target}%"></i></span>
                </div>`;
    }).join('');
    showDialog({
        title: `⭐ Level ${quests.level} quests`,
        body: `${rows}<p class="hint">Level-up reward: ${rewardText(reward)}${nextLand ? ` · unlocks the ${AREAS[nextLand].name}` : ''}</p>`,
        actions: allQuestsDone()
            ? [{ label: `Level up! ${rewardText(reward)}`, primary: true, wide: true, onClick: levelUp }, { label: 'Later' }]
            : [{ label: 'OK' }],
    });
}

function levelUp() {
    if (!allQuestsDone()) return;
    const reward = levelReward(quests.level);
    quests.level++;
    startLevel();
    grantReward(reward, `⭐ Level ${quests.level}!`);
    const unlocked = Object.keys(AREAS).find(id => AREAS[id].level === quests.level);
    if (unlocked) toast(`The ${AREAS[unlocked].name} is now for sale!`, 'good');
    checkQuests();
    goTo(currentScene);
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
    checkQuests();
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

    scene.appendChild(makeSpot({ ...MAP_LAYOUT.market, sprite: ASSETS.buildings.market, label: 'Market', onClick: () => goTo('market') }));

    Object.keys(AREAS).forEach(id => {
        const area = AREAS[id];
        const spot = makeSpot({
            ...MAP_LAYOUT[id],
            sprite: ASSETS.buildings[id],
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
        }
        scene.appendChild(spot);
    });

    // Daily gift and quests, always one tap away on the map.
    const side = document.createElement('div');
    side.className = 'side-buttons';
    side.innerHTML = `
        <button class="side-btn" id="btn-gift">🎁<small>Gift</small>${dailyAvailable() ? '<span class="badge">!</span>' : ''}</button>
        <button class="side-btn" id="btn-quests">📋<small>Lv ${quests.level}</small>${allQuestsDone() ? '<span class="badge">!</span>' : ''}</button>`;
    side.querySelector('#btn-gift').addEventListener('click', openDailyGift);
    side.querySelector('#btn-quests').addEventListener('click', openQuests);
    scene.appendChild(side);
}

function offerDeed(id) {
    const area = AREAS[id];
    if (quests.level < area.level) {
        showDialog({
            art: ASSETS.buildings[id],
            title: area.name,
            body: `<p>${area.desc}</p><p class="hint">Reach level ${area.level} to buy this land. Finish your quests to level up.</p>`,
            actions: [{ label: '📋 Open quests', primary: true, onClick: openQuests }, { label: 'OK' }],
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
    checkQuests();
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
        rewardHearts: targetTier,
        rewardProducer: Math.random() < PRODUCER_REWARD_CHANCE,
    };
}

function initTown(newGame = false) {
    npcs.forEach(npc => generateRequestFor(npc));
    // Guarantee one early: Marnie always asks for Barn items.
    if (newGame) npcs.find(npc => npc.id === 'marnie').request.rewardProducer = true;
}

// Items that can be dragged, merged and handed in (not crates or cobwebbed).
function isFree(item) {
    return !!item && item.type !== 'box' && !item.web;
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
               <p><b>Reward:</b> 💵 ${r.rewardMoney} · ❤️ ${r.rewardHearts}${r.rewardProducer ? ` · 🎁 🧩 ${producerName(r.mode, 1)}` : ''}</p>
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
    res.hearts += r.rewardHearts;
    npc.deliveries++;
    stats.delivered++;
    const levelUp = npc.deliveries % 5 === 0;
    if (levelUp) res.gems += LEVEL_UP_GEMS;
    updateUI();
    toast(`${npc.name} loved the ${itemName(r.mode, r.tier)}! +💵${r.rewardMoney} +❤️${r.rewardHearts}`, 'good');
    if (levelUp) toast(`${npc.name} reached Lv.${npc.deliveries / 5 + 1}! +💎 ${LEVEL_UP_GEMS}`, 'good');
    if (r.rewardProducer) {
        crates[r.mode].push({ type: 'shop', level: 1 });
        toast(`🎁 A ${producerName(r.mode, 1)}! Tap 🎁 on your ${AREAS[r.mode].name} board to add it.`, 'good');
    }

    generateRequestFor(npc);
    checkQuests();
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
    energyTimerEl.textContent = energyAt ? `+1 in ${formatDuration(energyAt - Date.now())}` : 'full';
    heartsEl.textContent = shortNumber(res.hearts);
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
    npcs.filter(n => n.request && n.request.mode === mode).forEach(npc => {
        const r = npc.request;
        const ready = canFulfill(npc);
        const card = document.createElement('button');
        card.className = 'order-card' + (ready ? ' ready' : '');
        card.innerHTML = `
            <span class="order-who"><img class="face" src="${npcPicture(npc)}" alt="${npc.name}"><span class="want">${itemIcon(mode, r.tier)}</span></span>
            <span class="order-pay">💵${r.rewardMoney}${r.rewardProducer ? ' 🎁' : ''}</span>
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

// What a board item is called, for toasts and the info bar.
function boardItemName(mode, item) {
    if (item.type === 'shop') return producerName(mode, producerLevel(item));
    if (item.type === 'skip') return timeSkipName(producerLevel(item));
    return itemName(mode, item.tier);
}

// The bar under the orders: waiting rewards, then whatever item is selected.
function renderInfoBar(mode) {
    const el = document.querySelector(`#scene-${mode} .info-bar`);
    if (!el) return;
    const prod = PRODUCERS[mode];
    const item = selected && selected.mode === mode ? grids[mode][selected.index] : null;
    const chainBtn = '<button class="chain-btn" title="See the whole chain">ⓘ</button>';
    let html = crates[mode].length ? `<button class="crate-btn">🎁 ${crates[mode].length}</button>` : '';

    if (!item && lastSale && lastSale.mode === mode) {
        html += `<span class="info-icon">${itemIcon(mode, lastSale.item.tier)}</span>
                 <span class="info-text"><b>Sold ${itemName(mode, lastSale.item.tier)}</b> for 💵${lastSale.price}<br><small>Changed your mind?</small></span>
                 <button class="sell-btn undo-btn">Undo</button>`;
    } else if (!item) {
        html += `<span class="info-text">Tap a ${prod.emoji} ${producerBaseName(mode)} to make items for ⚡1. Drag two alike together to merge. Tap an item to see it.</span>`;
    } else if (item.type === 'box') {
        html += `<span class="info-icon">📦</span>
                 <span class="info-text"><b>Crate</b><br><small>Merge anything next to it to open it.</small></span>`;
    } else if (item.type === 'skip') {
        const level = producerLevel(item);
        const { hours } = TIME_SKIPS[level - 1];
        const tip = level < TIME_SKIPS.length ? ' Merge two to double it.' : '';
        html += `<span class="info-icon">⏳</span>
                 <span class="info-text"><b>${timeSkipName(level)}</b> · ${hours}h<br><small>Skips ${hours}h of recharging on every producer here.${tip}</small></span>
                 <button class="sell-btn use-btn">Use</button>`;
    } else if (item.type === 'shop') {
        const level = producerLevel(item);
        const name = producerName(mode, level);
        const next = level < PRODUCER_MAX_LEVEL ? `Merge two to make a ${producerName(mode, level + 1)}.` : 'Top level!';
        if (item.web) {
            html += `<span class="info-icon">${prod.emoji}</span>
                     <span class="info-text"><b>${name}</b> · 🕸️<br><small>Merge a free ${name} into it to free it.</small></span>
                     <button class="sell-btn dust-btn">Dust<br>💎${dustPrice(item)}</button>`;
        } else if (level < FIRST_WORKING_LEVEL) {
            html += `<span class="info-icon">🧩</span>
                     <span class="info-text"><b>${name}</b> · part Lv${level}<br><small>${next} At Lv${FIRST_WORKING_LEVEL} it becomes a ${producerBaseName(mode)} that makes items.</small></span>
                     ${chainBtn}`;
        } else {
            const s = producerStats(mode, level);
            const timer = item.readyAt ? ` · next charge <span data-ready="${item.readyAt}">${formatDuration(item.readyAt - Date.now())}</span>` : '';
            html += `<span class="info-icon">${prod.emoji}</span>
                     <span class="info-text"><b>${name}</b> · Lv${level}<br><small>${item.drops}/${s.charges * s.drops} taps left${timer}. ${next}</small></span>
                     ${chainBtn}
                     ${item.readyAt ? `<button class="sell-btn skip-btn">Recharge<br>💎${s.skip}</button>` : ''}`;
        }
    } else {
        const last = NAMES[mode].length - 1;
        const tip = item.web ? `Covered in cobwebs. Merge a free ${itemName(mode, item.tier)} into it to free it.`
            : item.tier >= last ? 'The best there is!'
            : item.tier >= maxTier ? 'Max tier for now: buy the Growth Guide at the Market.'
            : `Merge two to make ${itemIcon(mode, item.tier + 1)} ${itemName(mode, item.tier + 1)}.`;
        html += `<span class="info-icon">${itemIcon(mode, item.tier)}</span>
                 <span class="info-text"><b>${itemName(mode, item.tier)}</b> · tier ${item.tier}${item.web ? ' · 🕸️' : ''}<br><small>${tip}</small></span>
                 ${chainBtn}
                 ${item.web ? `<button class="sell-btn dust-btn">Dust<br>💎${dustPrice(item)}</button>` : `<button class="sell-btn">Sell<br>💵${sellPrice(mode, item)}</button>`}`;
    }

    el.innerHTML = html;
    const on = (sel, fn) => { const btn = el.querySelector(sel); if (btn) btn.addEventListener('click', fn); };
    on('.crate-btn', () => placeFromCrate(mode));
    on('.undo-btn', () => undoSale(mode));
    on('.dust-btn', () => dustSelected(mode));
    on('.skip-btn', () => skipRecharge(mode, selected.index));
    on('.use-btn', () => useTimeSkip(mode, selected.index));
    on('.chain-btn', () => (item.type === 'shop' ? openProducerInfo(mode) : openChain(mode, item.tier)));
    on('.sell-btn:not(.undo-btn):not(.dust-btn):not(.skip-btn):not(.use-btn)', () => sellSelected(mode));
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
        checkQuests();
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
    checkQuests();
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
    lastSale = null;
    selected = { mode, index: idx };
    toast(`${boardItemName(mode, item)} added!`, 'good');
    refreshBoard(mode, [idx]);
}

let draggedItemInfo = null;
let dragElement = null;

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
        if (!isFree(grids[draggedItemInfo.mode][draggedItemInfo.index])) return; // crates and cobwebs stay put
        beginDragPreview();
    }
    placeDragElement(e);
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

    // A tap: working producers make an item; any item gets shown in the info bar.
    if (!wasDragged) {
        const item = grids[mode][index];
        if (isWorkingProducer(item) && isFree(item)) {
            handleGeneratorClick(mode, index);
        } else {
            selected = { mode, index };
            refreshBoard(mode);
        }
        return;
    }

    const elements = document.elementsFromPoint(e.clientX, e.clientY);
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
            // Producers (and their parts) and Time Skips merge by level, items by tier.
            const topLevel = { shop: PRODUCER_MAX_LEVEL, skip: TIME_SKIPS.length }[sourceItem.type];
            const sameLevel = !!topLevel && targetItem && targetItem.type === sourceItem.type
                && producerLevel(targetItem) === producerLevel(sourceItem);
            const sameKind = targetItem && !sourceItem.type && !targetItem.type && targetItem.tier === sourceItem.tier;
            let merged = false;

            if (sameLevel && producerLevel(sourceItem) < topLevel) {
                // Two of the same level make the next level. A new producer starts fully charged.
                const level = producerLevel(sourceItem) + 1;
                grids[mode][index] = null;
                grids[mode][targetIndex] = { type: sourceItem.type, level };
                tickProducer(mode, grids[mode][targetIndex]);
                merged = true;
                if (sourceItem.type === 'skip') {
                    toast(`${timeSkipName(level)}: ${TIME_SKIPS[level - 1].hours}h!`, 'good');
                } else {
                    stats.upgrades++;
                    toast(level === FIRST_WORKING_LEVEL
                        ? `🎉 A ${producerName(mode, level)}! Tap it to make items.`
                        : `Merged into a ${producerName(mode, level)}!`, 'good');
                }
            } else if (sameKind && sourceItem.tier < maxTier) {
                // Direct Merge 2
                const nextTier = sourceItem.tier + 1;
                grids[mode][index] = null;
                grids[mode][targetIndex] = { tier: nextTier };
                stats.made[`${mode}:${nextTier}`] = madeCount(mode, nextTier) + 1;
                stats.merges++;
                merged = true;
            } else if (sameKind) {
                toast(`Tier ${maxTier} is the max for now. Buy the Growth Guide at the Market!`);
            } else if (sameLevel) {
                toast(`That's already a ${boardItemName(mode, sourceItem)}, the best there is!`);
            } else if (targetItem && targetItem.type === 'box') {
                toast('Crates stay put. Merge something next to one to open it.');
            } else if (targetItem && targetItem.web) {
                toast('Cobwebbed items stay put. Merge a matching item into one to free it.');
            }

            const swapped = !merged && !sameKind && !sameLevel && (!targetItem || isFree(targetItem));
            if (swapped) {
                grids[mode][index] = targetItem;
                grids[mode][targetIndex] = sourceItem;
            }
            if (merged) {
                if (targetItem.web) {
                    stats.webs++;
                    toast('🕸️ Freed!', 'good');
                }
                popped = [targetIndex, ...openBoxesAround(mode, targetIndex)];
            }
            selected = { mode, index: merged || swapped ? targetIndex : index };
        }
    }

    checkQuests();
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

    let emptyIdx = -1;
    for (const n of getNeighbors(index)) {
        if (!grids[mode][n]) {
            emptyIdx = n;
            break;
        }
    }
    if (emptyIdx === -1) {
        emptyIdx = grids[mode].findIndex(cell => cell === null);
    }

    if (emptyIdx === -1) {
        toast('The board is full! Sell, merge or deliver something first.');
        return;
    }

    const charge = chargeMode();
    if (res.energy < 1) {
        openEnergy(true);
        return;
    }
    if (res.energy < charge.cost) {
        toast(`${charge.name} needs ⚡${charge.cost} a tap. Tap ${charge.label} by the energy bar to switch it off.`);
        return;
    }
    res.energy -= charge.cost;
    tickEnergy(); // starts the refill timer as soon as you drop below the cap
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
    grids[mode][emptyIdx] = drop;
    stats.spawned[mode] = (stats.spawned[mode] || 0) + 1;
    selected = { mode, index };
    checkQuests();
    refreshBoard(mode, [emptyIdx]);
}

function renderGrid(mode, poppedIndices = []) {
    const gridEl = document.getElementById(`grid-${mode}`);
    if (!gridEl) return;
    gridEl.innerHTML = '';
    const wanted = new Set(npcs.filter(n => n.request && n.request.mode === mode).map(n => n.request.tier));

    for (let i = 0; i < NUM_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;

        const item = grids[mode][i];
        if (item !== null) {
            const itemEl = document.createElement('div');
            itemEl.className = 'item';
            if (poppedIndices.includes(i)) itemEl.classList.add('pop');

            if (item.type === 'box') {
                itemEl.classList.add('box');
                itemEl.title = 'Crate';
                if (ASSETS.props.crate) {
                    itemEl.classList.add('has-sprite');
                    itemEl.innerHTML = `<img src="${ASSETS.props.crate}" alt="" draggable="false">`;
                } else {
                    itemEl.innerHTML = '<span class="emoji">📦</span>';
                }
                itemEl.addEventListener('pointerdown', (e) => handleDragStart(e, mode, i));
            } else if (item.type === 'shop') {
                // Producers, and the parts (levels 1-3) that merge into them.
                const level = producerLevel(item);
                const sprite = (ASSETS.producers[mode] || [])[level - 1];
                itemEl.title = producerName(mode, level);
                if (sprite) {
                    itemEl.classList.add('has-sprite');
                    itemEl.innerHTML = `<img src="${sprite}" alt="" draggable="false">`;
                } else {
                    itemEl.classList.add('generator', level < FIRST_WORKING_LEVEL ? 'part' : `gen-lv${level}`);
                    itemEl.innerHTML = `<span class="emoji">${level < FIRST_WORKING_LEVEL ? '🧩' : PRODUCERS[mode].emoji}</span><span class="name">${producerName(mode, level)}</span>`;
                }
                addTag(itemEl, 'tier gen-level', level);
                // Out of charges: dimmed, with the time until the next charge.
                if (isWorkingProducer(item) && !item.web && item.drops <= 0 && item.readyAt) {
                    itemEl.classList.add('empty');
                    addTag(itemEl, 'gen-timer', formatDuration(item.readyAt - Date.now())).dataset.ready = item.readyAt;
                }
                itemEl.addEventListener('pointerdown', (e) => handleDragStart(e, mode, i));
            } else if (item.type === 'skip') {
                const level = producerLevel(item);
                itemEl.title = timeSkipName(level);
                itemEl.classList.add('generator', 'time-skip');
                itemEl.innerHTML = `<span class="emoji">⏳</span><span class="name">${TIME_SKIPS[level - 1].hours}h skip</span>`;
                addTag(itemEl, 'tier', level);
                itemEl.addEventListener('pointerdown', (e) => handleDragStart(e, mode, i));
            } else {
                const sprite = itemSprite(mode, item.tier);
                itemEl.title = itemName(mode, item.tier);
                if (sprite) {
                    itemEl.classList.add('has-sprite');
                    itemEl.innerHTML = `<img src="${sprite}" alt="" draggable="false">`;
                } else {
                    const hue = getHue(mode, item.tier);
                    itemEl.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 70%), hsl(${hue}, 80%, 40%))`;
                    itemEl.innerHTML = `<span class="emoji">${itemEmoji(mode, item.tier)}</span><span class="name">${itemName(mode, item.tier)}</span>`;
                }
                if (item.tier > 0) addTag(itemEl, 'tier', item.tier);
                if (isFree(item) && wanted.has(item.tier)) {
                    itemEl.classList.add('wanted');
                    addTag(itemEl, 'tick', '✓');
                }
                itemEl.addEventListener('pointerdown', (e) => handleDragStart(e, mode, i));
            }
            if (item.web) {
                itemEl.classList.add('webbed');
                addTag(itemEl, 'web', '');
            }
            if (selected && selected.mode === mode && selected.index === i) itemEl.classList.add('selected');
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
const SAVE_VERSION = 2;

function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            version: SAVE_VERSION,
            res, energyAt, shop, crates, stats, quests, daily, settings, unlocks, maxTier, grids,
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
        if ((save.version || 1) < 2) migrateProducers(save);
        Object.keys(res).forEach(key => { if (typeof save.res[key] === 'number') res[key] = save.res[key]; });
        energyAt = save.energyAt || null;
        Object.assign(shop, save.shop);
        Object.assign(crates, save.crates);
        Object.assign(stats, save.stats);
        Object.assign(quests, save.quests);
        Object.assign(daily, save.daily);
        if (save.settings && typeof save.settings.charge === 'number') settings.charge = save.settings.charge;
        Object.assign(unlocks, save.unlocks);
        maxTier = save.maxTier;
        Object.keys(grids).forEach(mode => {
            if (save.grids[mode] && save.grids[mode].length === NUM_CELLS) grids[mode] = save.grids[mode];
        });
        save.npcs.forEach(saved => {
            const npc = npcs.find(n => n.id === saved.id);
            if (npc) Object.assign(npc, saved);
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
if (!quests.baselines.length) startLevel(); // new game, or a save from before quests
tickEnergy(); // catch up on energy and recharges that arrived while the game was closed
tickProducers();
claimDailyBasket();
Object.keys(grids).forEach(mode => renderGrid(mode));
updateUI();
goTo('map');
// The first visit each day opens the daily gift, as in Merge Gardens.
if (dailyAvailable()) setTimeout(openDailyGift, 600);

setInterval(() => {
    tickEnergy();
    const recharged = tickProducers();
    // Redraw a board when a charge arrives, but not mid-drag (the drop redraws it).
    if (recharged.includes(currentScene) && !draggedItemInfo) refreshBoard(currentScene);
    claimDailyBasket();
    updateUI();
    updateCountdowns();
    saveGame();
}, 1000);
addEventListener('pagehide', saveGame);
