// --- MERGE FARMSTEAD ---
// The farm map, the town and the market are physical places: each building,
// person and shelf item is a sprite placed on a background that you tap.
// Image paths all come from assets.js so AI-generated art can replace the
// placeholders without touching this file.

// Running as the Android app (Capacitor) rather than the website.
const nativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

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
// from fast on the first boards to slow on the expensive ones, so the first
// hour or two flows and the waiting (and the 💎 to skip it) comes later.
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
    // Workbench, recharging in 20 minutes instead of an hour so level 3 isn't a wall
    hay: {
        emoji: '🌾', minutes: 20,
        names: ['Seed Pouch', 'Wheat Bag', 'Small Wheat Sack', 'Wheat Sack', 'Big Wheat Sack', 'Wheat Barrel', 'Wheat Cart', 'Golden Granary'],
        levels: [[4, 9, 5], [4, 10, 7], [4, 12, 9], [4, 13, 13], [4, 14, 18]],
    },
    // Planted Bush
    fert: {
        emoji: '🧹', minutes: 60,
        names: ['Broken Rake', 'Mended Rake', 'Small Rake', 'Leaf Rake', 'Leaf Basket', 'Leaf Barrow', 'Compost Bin', 'Golden Compost Tumbler'],
        levels: [[2, 5, 20], [2, 5, 24], [4, 5, 29], [6, 5, 36], [7, 5, 48]],
    },
    // Sewing Kit
    aqua: {
        emoji: '🥫', minutes: 90,
        names: ['Empty Tin', 'Small Tin', 'Fish Food Pouch', 'Fish Food Tin', 'Big Fish Food Tin', 'Fish Food Jar', 'Fish Feeder', 'Golden Feeder'],
        levels: [[4, 6, 9], [4, 7, 12], [4, 8, 17], [4, 10, 26], [4, 12, 38]],
    },
    // Broom Cabinet
    flower: {
        emoji: '🚿', minutes: 200,
        names: ['Patched Can', 'Leaky Can', 'Small Can', 'Watering Can', 'Big Watering Can', 'Sprinkler', 'Rain Barrel', 'Golden Fountain'],
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
        levels: [
            { drops: 5, contents: [['coin', 1, 40], ['coin', 2, 30], ['coin', 3, 20], ['coin', 4, 10]] },
            { drops: 9, contents: [['coin', 2, 40], ['coin', 3, 30], ['coin', 4, 20], ['coin', 5, 10]] },
            { drops: 14, contents: [['coin', 3, 40], ['coin', 4, 30], ['coin', 5, 20], ['coin', 6, 10]] },
        ],
    },
    energy: {
        emoji: '🔋', name: 'Energy Chest',
        levels: [
            { drops: 5, contents: [['energy', 1, 56], ['energy', 2, 31], ['energy', 3, 13]] },
            { drops: 9, contents: [['energy', 2, 56], ['energy', 3, 31], ['energy', 4, 13]] },
            { drops: 14, contents: [['energy', 2, 40], ['energy', 3, 40], ['energy', 4, 20]] },
        ],
    },
    brown: {
        emoji: '🧰', name: 'Brown Chest',
        levels: [
            { drops: 10, minutes: 1, skip: 2, contents: [['part', 1, 57], ['coin', 1, 11], ['coin', 2, 7], ['coin', 3, 3], ['energy', 1, 11], ['energy', 2, 7], ['energy', 3, 3], ['tool', 1, 8]] },
            { drops: 22, minutes: 5, skip: 10, contents: [['part', 1, 26], ['part', 2, 15], ['coin', 1, 14], ['coin', 2, 8], ['coin', 3, 7], ['energy', 1, 14], ['energy', 2, 8], ['energy', 3, 7], ['tool', 1, 8], ['tool', 2, 5]] },
            // Levels 3-4 go past Merge Mansion's two, on the same curve (its Red Chest takes 3h).
            { drops: 34, minutes: 20, skip: 28, contents: [['part', 1, 18], ['part', 2, 18], ['part', 3, 8], ['coin', 2, 12], ['coin', 3, 10], ['coin', 4, 6], ['energy', 2, 12], ['energy', 3, 10], ['energy', 4, 6], ['tool', 2, 8], ['tool', 3, 5]] },
            { drops: 48, minutes: 60, skip: 70, contents: [['part', 2, 22], ['part', 3, 12], ['part', 4, 4], ['coin', 3, 14], ['coin', 4, 10], ['coin', 5, 6], ['energy', 3, 14], ['energy', 4, 10], ['gem', 1, 8], ['tool', 3, 8], ['tool', 4, 5]] },
        ],
    },
    blue: {
        emoji: '🧰', name: 'Blue Chest',
        levels: [
            { drops: 10, minutes: 5, skip: 10, contents: [['part', 1, 46], ['part', 2, 20], ['coin', 1, 9], ['coin', 2, 5], ['coin', 3, 3], ['energy', 1, 9], ['energy', 2, 5], ['energy', 3, 3], ['tool', 1, 8], ['tool', 2, 4]] },
            { drops: 22, minutes: 10, skip: 19, contents: [['part', 1, 23], ['part', 2, 19], ['part', 3, 7], ['coin', 1, 13], ['coin', 2, 9], ['coin', 3, 5], ['energy', 1, 13], ['energy', 2, 9], ['energy', 3, 5], ['tool', 2, 8], ['tool', 3, 4]] },
            { drops: 34, minutes: 40, skip: 45, contents: [['part', 2, 22], ['part', 3, 14], ['part', 4, 5], ['coin', 2, 12], ['coin', 3, 9], ['coin', 4, 6], ['energy', 2, 12], ['energy', 3, 9], ['energy', 4, 6], ['gem', 1, 5], ['tool', 3, 8], ['tool', 4, 4]] },
            { drops: 48, minutes: 120, skip: 120, contents: [['part', 3, 20], ['part', 4, 10], ['part', 5, 3], ['coin', 3, 13], ['coin', 4, 10], ['coin', 5, 7], ['energy', 3, 13], ['energy', 4, 10], ['gem', 1, 8], ['gem', 2, 6], ['tool', 4, 8], ['tool', 5, 5]] },
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
    { id: 'energyChest', item: { type: 'chest', kind: 'energy', level: 1 }, coins: 50 }, // 🪙50 in Merge Mansion
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
// The bigger pass: the Golden Pass plus a jump of points (about 10 levels) at once.
// Two prices side by side make the cheaper one feel safe and the bigger one a deal.
const GOLDEN_PASS_DELUXE = { id: 'golden_pass_deluxe', name: 'Golden Pass Deluxe', price: '$9.99', points: 300 };
// Skipping to the next pass level costs 💎1 per point it still needs.
const PASS_GEMS_PER_POINT = 1;
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

// Gems to dust the cobwebs off an item instead of merging into it, by its level:
// Merge Mansion's dusting prices (the median across its chains). It's meant to
// be poor value: merging into it is the way.
const DUST_GEMS = [15, 39, 57, 90, 187, 365, 730, 1460];
function dustPrice(item) {
    const level = item.type === 'shop' ? producerLevel(item) : item.tier + 1;
    return DUST_GEMS[Math.min(level, DUST_GEMS.length) - 1];
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
const COINS_PER_GEM = 25; // Merge Mansion: 🪙2500 and 💎100 cost the same
const LEVEL_UP_GEMS = 5; // a few free gems each time a townsperson levels up

// Rewarded ads, a few a day in all (how many: MONETIZE.ads.perDay in
// monetize.js): a free energy top-up, an instant producer recharge, a doubled
// daily gift, the gems you're short, or an Ad Bubble.
const AD_ENERGY = 20;

// Merge Mansion's start: a full energy bar, 100 coins and 100 gems.
const START = { money: 100, gems: 100, energy: 100 };

// Gem packs at Merge Mansion's amounts and US prices (its shop, as scraped), so
// gems are worth what they are there: neither cheap nor overpowered. In the app
// stores the localized price comes from the store itself.
const GEM_PACKS = [
    { id: 'gems_handful', name: 'Handful of Gems', gems: 100,  price: '$2.49' },
    { id: 'gems_pouch',   name: 'Pouch of Gems',   gems: 260,  price: '$4.99' },
    { id: 'gems_pile',    name: 'Pile of Gems',    gems: 570,  price: '$11.99' },
    { id: 'gems_cask',    name: 'Cask of Gems',    gems: 1250, price: '$23.99', tag: 'popular' },
    { id: 'gems_barrel',  name: 'Barrel of Gems',  gems: 3400, price: '$59.99' },
    { id: 'gems_vault',   name: 'Vault of Gems',   gems: 7500, price: '$119.99', tag: 'best value' },
];
// Gems once a day for 30 days; a day you don't open the game is lost.
const DAILY_BASKET = { id: 'daily_basket', name: '30 Day Daily Basket', gemsPerDay: 10, days: 30, price: '$1.99' }; // 💎300: the shop's best deal, priced low as a first purchase that brings players back each day
// One-time offer, shown the first time you run out of energy: Merge Mansion's
// Special Offer (III), 💎100, 🪙100 and ⚡100.
const SPECIAL_OFFER = { id: 'special_offer', name: 'Special Offer', gems: 100, money: 100, energy: 100, price: '$3.49' };

// Gem Jar (the "piggy bank" of Candy Crush and Royal Match): gems pile up in it
// as you play, and you break it open for real money. It opens once it holds
// `min` and stops filling at `cap`. A full jar is a better deal than any gem
// pack, which is the point: the gems feel already earned.
const GEM_JAR = { id: 'gem_jar', name: 'Gem Jar', price: '$2.99', min: 100, cap: 200, perMerge: 1, perOrder: 5, perJob: 10 };

// Time-limited offers: each opens when its moment comes, lasts `hours` with a
// countdown on the map, and is shown once when it opens. `again`: days before it
// can come back (one-time without it).
const OFFERS = [
    { id: 'starter', name: 'Starter Pack', price: '$2.99', hours: 48,
      reward: { gems: 100, energy: 100, chest: 'blue', part: 3 },
      note: 'A head start for new farmers. Only once, and only for 48 hours!',
      when: () => quests.level >= 3 },
    { id: 'energy_bundle', name: 'Energy Bundle', price: '$1.99', hours: 24, again: 7,
      reward: { energy: 400, item: { type: 'unlimited', level: 2 } },
      note: 'Out of energy again? Keep playing with ⚡400 and 10 minutes of free taps.',
      when: state => stats.outOfEnergy - (state.base || 0) >= 3 },
    { id: 'fair_pack', name: 'Fair Pack', price: '$3.99', hours: 24, again: 4,
      reward: { energy: 300, fairBoost: 60 },
      note: 'Win the Fair! ⚡300 and an hour of double Fair points.',
      when: () => fairOpen() },
    { id: 'builder', name: 'Builder Pack', price: '$4.99', hours: 24,
      reward: { gems: 200, part: 4, item: { type: 'charger', level: 2 } }, // like Merge Mansion's Special Offer (II)
      note: 'A whole working producer, and a Time Charger to speed it up.',
      when: () => quests.level >= 5 },
];

// Daily tasks (Merge Mansion's Daily Scoop): three goals a day picked from this
// list. Each one done moves today's chest track on; it pays at 1, 2 and 3 goals.
const DAILY_GOALS = [
    { id: 'merge', label: 'Merge 30 times', stat: 'merges', n: 30 },
    { id: 'tap', label: 'Tap producers 40 times', stat: 'taps', n: 40 },
    { id: 'energy', label: 'Spend ⚡60', stat: 'energySpent', n: 60 },
    { id: 'deliver', label: 'Deliver 3 orders', stat: 'delivered', n: 3 },
    { id: 'sell', label: 'Sell 5 items', stat: 'sold', n: 5 },
    { id: 'xp', label: 'Earn ⭐10 XP', stat: 'xpEarned', n: 10 },
    { id: 'collect', label: 'Collect 8 coins, gems or stars', stat: 'collected', n: 8 },
    { id: 'jobs', label: 'Fix 3 jobs', stat: 'jobs', n: 3 },
    { id: 'chest', label: 'Take 10 things out of chests or piggy banks', stat: 'chestDrops', n: 10, level: 3 },
];
const DAILY_CHEST = [{ money: 100, energy: 20 }, { energy: 50, gems: 5 }, { chest: 'brown', gems: 15 }];

// Country Fair (Merge Mansion's seasonal board events, with a leaderboard race):
// every Friday to Sunday a Fair opens with its own board and merge chain, a
// different theme each week. Its producer costs ⚡ like any other. Every merge
// there scores points (the tier it makes, so bigger merges score more),
// milestones pay out as you reach them, and you race five townsfolk for the
// top three prizes. The Fair board is cleared when it ends.
const FAIR_LEVEL = 2;
const FAIR_DAYS = 3; // Friday, Saturday, Sunday
const FAIR_THEMES = [
    { id: 'pie', name: 'Pie Contest', emoji: '🥧', hue: 30, producer: ['🧱', 'Pie Oven'],
      names: ['🍎 Red Apple', '🍏 Apple Slices', '🥧 Pie Tin', '🥧 Apple Pie', '🍒 Cherry Tart', '🍰 Pie Tower', '🎀 Ribbon Pie', '🏆 Golden Pie'] },
    { id: 'flowers', name: 'Flower Show', emoji: '🌸', hue: 320, producer: ['🪴', 'Potting Bench'],
      names: ['🧅 Flower Bulb', '🌱 Green Shoot', '🪻 Hyacinth', '💐 Posy', '💐 Bouquet', '🧺 Flower Basket', '🌸 Flower Arch', '🏵️ Prize Rosette'] },
    { id: 'fishing', name: 'Fishing Derby', emoji: '🎣', hue: 200, producer: ['🪣', 'Bait Bucket'],
      names: ['🪱 Bait', '🦐 Shrimp', '🎣 Lure', '🐟 Little Fish', '🐠 Trout', '🐡 Salmon', '🐋 Big Catch', '🏆 Trophy Fish'] },
    { id: 'pumpkin', name: 'Pumpkin Fair', emoji: '🎃', hue: 25, producer: ['🌱', 'Pumpkin Patch'],
      names: ['🌰 Pumpkin Seed', '🌱 Pumpkin Vine', '🟠 Mini Gourd', '🎃 Jack-o-Lantern', '🎃 Big Pumpkin', '🎃 Giant Pumpkin', '🛻 Pumpkin Wagon', '👑 Golden Pumpkin'] },
];
// [points, reward] for each milestone.
const FAIR_MILESTONES = [
    [20, { energy: 20 }], [50, { money: 100 }], [90, { chest: 'brown' }], [140, { gems: 10 }], [200, { timeSkip: 1 }],
    [270, { energy: 60 }], [350, { chest: 'blue' }], [440, { part: 3 }], [540, { gems: 30 }], [650, { part: 4, gems: 50 }],
];
// The townsfolk you race (game characters, not other players) and roughly how
// far each gets, as a share of the last milestone.
const FAIR_RIVALS = [['ruby', 0.45], ['finn', 0.7], ['poppy', 0.9], ['mayor', 1.1], ['hattie', 1.35]];
// Prizes for 1st, 2nd and 3rd when the Fair ends.
const FAIR_PRIZES = [{ gems: 50, chest: 'blue' }, { gems: 25, chest: 'brown' }, { gems: 10 }];

let unlocks = { barn: true, hay: false, farm: false, fert: false, aqua: false, flower: false };
let maxTier = 3;
const res = { money: 0, gems: 0, energy: 0 };
Object.assign(res, START);
// When the next ⚡ arrives (ms timestamp), or null when the bar is full.
let energyAt = null;
// Counters the restoration jobs read from (saved with the game).
const stats = {
    spawned: {}, made: {}, merges: 0, delivered: 0, sold: 0, upgrades: 0, gifts: 0, boxes: 0, webs: 0,
    outOfEnergy: 0, energySpent: 0, jobs: 0, chestDrops: 0, xpEarned: 0, collected: 0,
};
// Player toggles (saved with the game). charge = index into CHARGE_MODES;
// unlimitedUntil = when Unlimited Energy runs out (ms timestamp).
const settings = { charge: 0, unlimitedUntil: 0, sound: true, vibrate: true, music: true, tips: true };
// Player level and XP toward the next level.
const quests = { level: 1, xp: 0 };
// Restoration jobs done, and for open jobs the counters they count from.
const restoration = { done: [], baselines: {}, zonesOpen: ['barnyard'] }; // zonesOpen: areas whose unlock has played
// Daily gift track: the last day claimed and how many days in a row.
const daily = { lastDay: null, streak: 0 };
// Rewards and purchases waiting in each board's 🎁 until placed.
const crates = { barn: [], hay: [], farm: [], fert: [], aqua: [], flower: [], fair: [] };
// Stored items, each with the board it belongs to, and how many slots you have.
const inventory = { slots: INVENTORY_FREE_SLOTS, items: [] };
// Daily Basket, Special Offer, energy purchases, ads, Flash Sale and Daily
// Deals (saved with the game).
const shop = {
    basketStart: null, basketClaimed: null, offerBought: false, offerShown: false,
    adsDay: null, adsWatched: 0, energyDay: null, energyBought: 0,
    flash: null, dealsDay: null, dealsTaken: [],
    jar: 0, offers: {},
    granted: [], // Google Play purchases already paid out (their transaction ids)
};
// Today's daily goals and the counters they count from.
const dailyGoals = { day: null, ids: [], base: {}, claimed: 0 };
// The current (or last) Country Fair: its first day, points, milestones paid,
// when double points end, and whether it has been wrapped up.
const fair = { id: null, points: 0, milestones: 0, boostUntil: 0, finished: true };
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
    'farm': ['🧪 Fertilizer', '🌱 Seed', '🌿 Sprout', '🍓 Strawberry', '🍅 Tomato', '🌽 Corn', '🥕 Carrot', '🥬 Cabbage', '🎃 Pumpkin', '🍉 Watermelon', '🍎 Golden Apple', '🌻 Giant Sun'],
    'hay': ['🌱 Wheat Sprout', '🌾 Wheat Stalk', '🎀 Wheat Sheaf', '🟨 Hay Bale', '🟢 Round Bale', '🔶 Haystack', '🛒 Hay Cart', '🚜 Hay Wagon', '🌬️ Windmill', '👑 Golden Hay', '🔮 Magic Hay', '🌈 Rainbow Hay'],
    'barn': ['🌿 Feed', '🥚 Egg', '🐤 Chick', '🐔 Chicken', '🐽 Piglet', '🐷 Pig', '🐮 Calf', '🐄 Cow', '🐴 Horse', '🦙 Alpaca', '🐂 Prize Bull', '🦄 Unicorn'],
    'fert': ['🍂 Fallen Leaf', '🍁 Leaf Pile', '🥕 Veggie Scraps', '🌱 Compost', '🪴 Rich Soil', '🍄 Mushroom', '✨ Plant Food', '🌟 Super Plant Food', '⚡ Grow Tonic', '💎 Garden Elixir', '🔮 Magic Mulch', '🌌 Starlight Mulch'],
    'aqua': ['🌾 Fish Food', '🐌 Snail', '🐟 Minnow', '🐸 Frog', '🐠 Goldfish', '🎏 Koi', '🐢 Turtle', '🦦 Otter', '🦆 Duck', '🦢 Swan', '🦩 Flamingo', '🐉 Sea Monster'],
    'flower': ['💧 Water Drop', '🌱 Seedling', '🌷 Bud', '🌼 Daisy', '🌷 Tulip', '🌹 Rose', '🌺 Lily', '🌸 Orchid', '🪷 Lotus', '🍄 Rafflesia', '💎 Crystal Flower', '🌳 Tree of Life']
};

// --- TOOLS ---
// What jobs mostly ask for, as in Merge Mansion. Each land comes with a tool
// producer on its board that drops its own chain: tool items are { tier, chain }
// and can be used by jobs anywhere. `what` is how the producer's info names them.
const TOOLS = {
    tools:   { board: 'barn',   name: 'Toolbox',       emoji: '🧰', what: 'tools',          minutes: 2, skip: 2,  hue: 210,
               names: ['🔩 Screw', '🔨 Hammer', '🪛 Screwdriver', '🔧 Wrench', '🪚 Saw', '🔌 Power Drill', '🧰 Tool Kit', '🏆 Golden Tool Chest'] },
    garden:  { board: 'farm',   name: 'Garden Shed',   emoji: '🛖', what: 'garden tools',   minutes: 3, skip: 3,  hue: 100,
               names: ['🧤 Gloves', '🥄 Trowel', '✂️ Shears', '🧹 Rake', '🪢 Garden Hose', '🌀 Lawn Mower', '🚜 Tractor', '🌟 Golden Tractor'] },
    wood:    { board: 'hay',    name: 'Log Pile',      emoji: '🪓', what: 'wood',           minutes: 5, skip: 4,  hue: 30,
               names: ['🌿 Twig', '🪵 Log', '🟫 Plank', '🪢 Plank Bundle', '🧱 Beams', '📦 Wooden Crate', '🛢️ Barrel', '💰 Carved Chest'] },
    clean:   { board: 'fert',   name: 'Broom Cabinet', emoji: '🧹', what: 'cleaning things', minutes: 8, skip: 5, hue: 180,
               names: ['🧽 Sponge', '🧼 Soap', '🪥 Scrub Brush', '🪣 Soapy Bucket', '🧹 Broom', '🫧 Mop', '🛒 Cleaning Trolley', '✨ Golden Broom'] },
    fishing: { board: 'aqua',   name: 'Tackle Box',    emoji: '🎣', what: 'fishing gear',   minutes: 10, skip: 6, hue: 230,
               names: ['🪝 Hook', '🔴 Bobber', '🪢 Rope', '🥅 Net', '🎣 Fishing Rod', '🛶 Oars', '🛟 Life Ring', '⛵ Rowboat'] },
    decor:   { board: 'flower', name: 'Lantern Crate', emoji: '🏮', what: 'decorations',    minutes: 15, skip: 7, hue: 330,
               names: ['🕯️ Candle', '🏮 Paper Lantern', '🎏 Bunting', '🪔 Glass Lantern', '💡 Fairy Lights', '🎈 Balloons', '🌸 Lamp Post', '🎆 Golden Firework'] },
    // Each land's third producer: something it makes for the town, and for its jobs.
    wool:    { board: 'barn',   name: 'Wool Basket',   emoji: '🧶', what: 'wool things',    minutes: 4, skip: 3,  hue: 280,
               names: ['☁️ Wool Tuft', '🧶 Ball of Yarn', '🪡 Yarn Skeins', '🧦 Woolly Socks', '🧣 Knitted Scarf', '🧥 Cozy Sweater', '🛏️ Patchwork Quilt', '🏆 Golden Fleece'] },
    seeds:   { board: 'farm',   name: 'Seed Tin',      emoji: '🌰', what: 'seeds and veg',  minutes: 5, skip: 4,  hue: 60,
               names: ['🫘 Bean', '✉️ Seed Packet', '🌱 Seedling Tray', '🥕 Veg Bundle', '🧺 Veg Basket', '📦 Veg Crate', '🛒 Market Cart', '🏆 Prize Pumpkin'] },
    bakery:  { board: 'hay',    name: 'Flour Mill',    emoji: '🥖', what: 'baking',         minutes: 8, skip: 5,  hue: 40,
               names: ['🌾 Pinch of Flour', '🥣 Bowl of Flour', '🫓 Dough', '🍞 Loaf', '🥐 Croissants', '🥧 Pie', '🎂 Cake', '🏆 Grand Wedding Cake'] },
    worms:   { board: 'fert',   name: 'Worm Bin',      emoji: '🪱', what: 'worms and soil', minutes: 10, skip: 6, hue: 20,
               names: ['🪱 Worm', '🪱 Worm Family', '🟤 Worm Castings', '🪴 Potting Mix', '🌿 Herb Pot', '🍅 Tomato Plant', '🌳 Little Tree', '🏆 Golden Bonsai'] },
    boat:    { board: 'aqua',   name: 'Boatyard',      emoji: '🛶', what: 'boat parts',     minutes: 12, skip: 7, hue: 200,
               names: ['🪵 Driftwood', '🪚 Planed Board', '🦴 Boat Frame', '🛶 Hull', '⛵ Mast and Sail', '🚣 Dinghy', '⛵ Sailboat', '🏆 Golden Yacht'] },
    honey:   { board: 'flower', name: 'Beehive',       emoji: '🐝', what: 'honey things',   minutes: 15, skip: 8, hue: 45,
               names: ['🍯 Honey Drop', '🍯 Honey Jar', '🕯️ Beeswax Candle', '🧴 Honey Soap', '🎁 Honey Gift Box', '🧁 Honey Cakes', '🏺 Honey Barrel', '🏆 Golden Hive'] },
};
Object.keys(TOOLS).forEach(chain => { NAMES[chain] = TOOLS[chain].names; });
const TOOL_CHARGES = 8;                    // taps before a tool producer recharges
// The Workshop Manual: the Growth Guide for everything the tool producers make.
// Their merges stop at its tier; each chapter (💵) lets them go one step
// further. Jobs need tier 3 from the start, 4-5 around level 3 and 6-7 around level 6.
const TOOL_TIER_START = 3;
const MANUAL_COSTS = { 4: 250, 5: 750, 6: 3000, 7: 9000 };
// The highest tier the tool producers' things merge to now (saved with the game).
let toolTier = TOOL_TIER_START;
const TOOL_DROP_ODDS = [0.75, 0.22, 0.03]; // the tier a tap drops

// The chain a plain item belongs to: its own (a tool), else its board's.
function chainOf(mode, item) {
    return item.chain || mode;
}

// The board a job's item need is made on.
function needBoard(need) {
    return need.item ? (TOOLS[need.item] ? TOOLS[need.item].board : need.item) : null;
}

function getHue(mode, tier) {
    if (TOOLS[mode]) return (tier * 25 + TOOLS[mode].hue) % 360;
    if (mode === 'farm') return (tier * 15 + 120) % 360;
    else if (mode === 'hay') return (tier * 15 + 40) % 360;
    else if (mode === 'barn') return (tier * 15 + 0) % 360;
    else if (mode === 'fert') return (tier * 15 + 280) % 360;
    else if (mode === 'aqua') return (tier * 15 + 200) % 360;
    else if (mode === 'flower') return (tier * 15 + 320) % 360;
    else if (mode === 'fair') return (tier * 15 + fairTheme().hue) % 360;
    return 0;
}

// Where a board's art is listed in assets.js (each Fair theme has its own).
function artKey(mode) {
    return mode === 'fair' ? `fair_${fairTheme().id}` : mode;
}

function itemSprite(mode, tier) {
    return (ASSETS.items[artKey(mode)] || [])[tier] || null;
}

// The seven boards: the six lands and the Fair.
function isBoard(scene) {
    return !!AREAS[scene] || scene === 'fair';
}

function boardTitle(mode) {
    return mode === 'fair' ? `${fairTheme().emoji} ${fairTheme().name}` : AREAS[mode].name;
}

// The highest tier you can merge to: the Growth Guide's on the lands, the
// Workshop Manual's for tools, the whole chain at the Fair.
function tierCap(mode) {
    if (TOOLS[mode]) return Math.min(NAMES[mode].length - 1, toolTier);
    return mode === 'fair' ? NAMES.fair.length - 1 : maxTier;
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
    farm:   { name: 'Crop Field',    cost: 1500,   level: 3,  pay: 10, desc: 'Grow crops with fertilizer.' },
    hay:    { name: 'Hay Field',     cost: 6000,   level: 5,  pay: 15, desc: 'Grow hay from wheat.' },
    fert:   { name: 'Compost Yard',  cost: 20000,  level: 7,  pay: 20, desc: 'Make your own fertilizer.' },
    aqua:   { name: 'Fish Pond',     cost: 60000,  level: 9,  pay: 20, desc: 'Raise frogs, fish and ducks with fish food.' },
    flower: { name: 'Flower Garden', cost: 150000, level: 11, pay: 30, desc: 'Grow flowers with your watering can.' },
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
            if (cell.type === 'toolbox' && tickToolbox(cell, now)) changed = true;
            if (cell.type === 'chest' && cell.openAt && !cell.opened && now >= cell.openAt) {
                cell.opened = true;
                changed = true;
            }
            if (cell.type === 'bubble' && now >= cell.until) {
                if (cell.sale) Sales.gone(cell.sale); // an Ad Bubble nobody watched: a no
                board[c] = { type: 'coin', level: 1 }; // an unpopped bubble leaves a coin behind
                changed = true;
            }
        });
        return changed;
    });
}

// --- RECHARGING WITH 💎 ---
// Any producer that has run out, the tool producers included, can be refilled
// at once with 💎 instead of waiting, at a fixed price as in Merge Mansion. A
// producer's level sets its price; a tool producer's matches the producers that
// recharge about as fast.
function isOutOfCharges(item) {
    if (!item || item.web || item.drops > 0 || !item.readyAt) return false;
    return item.type === 'toolbox' || isWorkingProducer(item);
}

function rechargePrice(mode, item) {
    if (item.type === 'toolbox') return TOOLS[item.chain].skip;
    return producerStats(mode, producerLevel(item)).skip;
}

function rechargeName(mode, item) {
    return item.type === 'toolbox' ? TOOLS[item.chain].name : producerName(mode, producerLevel(item));
}

// Full again right now.
function refill(mode, item) {
    if (item.type === 'toolbox') {
        item.drops = TOOL_CHARGES;
        delete item.readyAt;
    } else {
        item.readyAt = Date.now();
        tickProducer(mode, item);
    }
}

// Pays 💎 to finish a producer's recharge at once.
function skipRecharge(mode, index) {
    const item = grids[mode][index];
    if (!item || !item.readyAt || !(item.type === 'toolbox' || isWorkingProducer(item))) return;
    if (!spendGems(rechargePrice(mode, item), () => skipRecharge(mode, index))) return;
    refill(mode, item);
    sfx('sparkle');
    document.querySelectorAll('.recharge-call').forEach(el => el.remove());
    updateUI();
    toast(`${rechargeName(mode, item)} recharged!`, 'good');
    refreshBoard(mode, [index]);
}

// Tapping a producer that has no charges left.
function openRecharge(mode, index) {
    const item = grids[mode][index];
    const tool = item.type === 'toolbox';
    const s = tool ? null : producerStats(mode, producerLevel(item));
    showDialog({
        title: `${rechargeName(mode, item)} is recharging`,
        body: `<p class="big-count">⏳ <span data-ready="${item.readyAt}">${formatDuration(item.readyAt - Date.now())}</span></p>
               <p class="hint">${tool ? `It gives ${TOOL_CHARGES} taps, then rests ${formatDuration(TOOLS[item.chain].minutes * 60000)}.`
                   : `Each charge gives ${s.drops} taps and takes ${formatDuration(rechargeMs(mode))}. It stores up to ${s.charges} charges while you're away.`}
               Don't stop now: keep it going with 💎!</p>`,
        actions: [
            { label: `Recharge now · 💎 ${rechargePrice(mode, item)}`, primary: true, wide: true, onClick: () => skipRecharge(mode, index) },
            adsLeft() > 0 ? { icon: uiIcon('ad', '📺'), label: `Watch an ad · recharge now (${adsLeft()} left today)`, wide: true, onClick: () => watchAdForRecharge(mode, index) } : null,
            { label: 'Wait' },
        ].filter(Boolean),
    });
}

// The moment a producer runs dry, a card offers to refill it, without blocking.
function offerRefill(mode, index) {
    document.querySelectorAll('.recharge-call').forEach(el => el.remove());
    const item = grids[mode][index];
    if (!isOutOfCharges(item)) return;
    const card = document.createElement('div');
    card.className = 'recharge-call';
    card.innerHTML = iconize(`<span class="recharge-face">${tooltipIcon(mode, item)}</span>
        <span><b>${rechargeName(mode, item)} is out!</b><small>Back in <span data-ready="${item.readyAt}">${formatDuration(item.readyAt - Date.now())}</span></small></span>
        <button class="btn btn-primary">Keep going · 💎${rechargePrice(mode, item)}</button><button class="fix-call-x">✕</button>`);
    card.querySelector('.btn').addEventListener('click', () => skipRecharge(mode, index));
    card.querySelector('.fix-call-x').addEventListener('click', () => card.remove());
    stageEl.appendChild(card);
    setTimeout(() => card.remove(), 7000);
}

// A producer's picture for the refill card.
function tooltipIcon(mode, item) {
    if (item.type === 'toolbox') {
        const art = (ASSETS.toolProducers || {})[item.chain];
        return art ? `<img src="${art}" alt="">` : TOOLS[item.chain].emoji;
    }
    return itemFace(mode, item).html;
}

function watchAdForRecharge(mode, index) {
    const item = grids[mode][index];
    if (adsLeft() <= 0 || !item || !item.readyAt) return;
    showRewardedAd(() => {
        shop.adsWatched++;
        refill(mode, item);
        toast(`${rechargeName(mode, item)} recharged!`, 'good');
        refreshBoard(mode, [index]);
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
        sfx('nope');
        const pill = document.getElementById('btn-energy');
        pill.classList.remove('shake-no');
        void pill.offsetWidth;
        pill.classList.add('shake-no');
        openEnergy(true);
        return false;
    }
    if (res.energy < cost) {
        toast(`${chargeMode().name} needs ⚡${cost} a tap. Tap ${chargeMode().label} by the energy bar to switch it off.`);
        return false;
    }
    res.energy -= cost;
    stats.energySpent += cost;
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

// Takes gems if you have enough; otherwise offers the quickest ways to get
// them. retry: does the thing again once an ad has covered the gems.
function spendGems(n, retry) {
    if (res.gems < n) {
        openGemShortfall(n, retry);
        return false;
    }
    res.gems -= n;
    sfx('buy');
    return true;
}

// Calendar day number in the player's time zone.
function today() {
    const d = new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

function adsLeft() {
    if (!SalesAds.ready()) return 0; // no ad loaded (or none allowed): its "Watch an ad" buttons stay hidden
    if (shop.adsDay !== today()) { shop.adsDay = today(); shop.adsWatched = 0; }
    return Math.max(0, Sales.adCap() - shop.adsWatched);
}

// 💎5 for the first ⚡100 of the day, then 10, 20, 40 and 80 from then on.
function energyPrice() {
    if (shop.energyDay !== today()) { shop.energyDay = today(); shop.energyBought = 0; }
    return Math.min(ENERGY_PRICE_CAP, ENERGY_PRICE * 2 ** shop.energyBought);
}

// Shown when you tap the energy bar or run out while playing.
function openEnergy(ranOut = false) {
    markGuide('energy');
    tickEnergy();
    if (ranOut) stats.outOfEnergy++;
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
    // Out of ⚡, the sales director puts first the way this player is likeliest to take.
    const bundle = OFFERS.find(o => o.id === 'energy_bundle');
    const offer = offerActive(bundle) ? bundle : !shop.offerBought ? SPECIAL_OFFER : null;
    const ways = {
        gems: { label: `Buy ⚡ ${ENERGY_PACK} · 💎 ${energyPrice()}`, onClick: buyEnergy, value: energyPrice() * MONETIZE.gemWorth, can: res.gems >= energyPrice() },
        ad: ads > 0 && { icon: uiIcon('ad', '📺'), label: `Watch an ad · +⚡ ${AD_ENERGY} (${ads} left today)`, onClick: watchAdForEnergy, value: Sales.adValue(), wait: 'ad', can: true },
        offer: ranOut && offer && { label: `🔥 ${offer.name}: ${offer.reward ? rewardText(offer.reward) : `💎 ${offer.gems} + ⚡ ${offer.energy}`} · ${offer.price}`,
            onClick: () => (offer === SPECIAL_OFFER ? buySpecialOffer() : buyOffer(offer.id)), value: PRICE_USD[offer.id], wait: offer.id, can: true },
    };
    const sale = ranOut ? Sales.rank('energyOut', Object.keys(ways).filter(arm => ways[arm] && ways[arm].can).map(arm => ({ arm, value: ways[arm].value }))) : null;
    const order = sale ? [...sale.order, ...Object.keys(ways).filter(arm => !sale.order.includes(arm))] : ['gems', 'ad', 'offer'];
    const actions = order.filter(arm => ways[arm]).map((arm, i) => ({ ...ways[arm], primary: i === 0, wide: true,
        sale: sale && sale.order.includes(arm) ? arm : null, waitFor: ways[arm].wait }));
    actions.push({ label: full ? 'OK' : 'Wait' });
    showDialog({
        sale,
        title: ranOut ? 'Out of ⚡ Energy' : '⚡ Energy',
        body: `<p class="big-count">⚡ ${res.energy} / ${ENERGY_CAP}</p><p class="hint">${timing}</p>
               <p class="hint">Every producer tap costs ⚡1. The price of ⚡${ENERGY_PACK} doubles with each buy (up to 💎${ENERGY_PRICE_CAP}) and resets tomorrow.</p>`,
        actions,
    });
}

function buyEnergy() {
    const price = energyPrice();
    if (!spendGems(price, buyEnergy)) return;
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

// Short of 💎: the quickest ways to cover it, the one this player is likeliest
// to take first (the sales director's pick): the Gem Jar they filled, the gem
// pack just big enough (or one size up), or an ad for the few gems missing.
function openGemShortfall(n, retry) {
    const short = n - res.gems;
    const fit = GEM_PACKS.find(p => p.gems >= short) || GEM_PACKS[GEM_PACKS.length - 1];
    const up = GEM_PACKS[GEM_PACKS.indexOf(fit) + 1];
    const packWay = pack => ({ label: `💎 ${withCommas(pack.gems)} for ${pack.price}`,
        value: PRICE_USD[pack.id], wait: pack.id, onClick: () => purchase(pack.id) });
    const ways = {
        jar: jarReady() && shop.jar >= short && { label: `🫙 Gem Jar: 💎 ${shop.jar} for ${GEM_JAR.price}`,
            value: PRICE_USD[GEM_JAR.id], wait: GEM_JAR.id, onClick: breakJar },
        pack: packWay(fit),
        pack_up: up && packWay(up),
        ad: short <= MONETIZE.ads.gemsMax && adsLeft() > 0 && { icon: uiIcon('ad', '📺'), label: `Watch an ad · +💎 ${short}`,
            value: Sales.adValue(), wait: 'ad', onClick: () => watchAdForGems(short, retry) },
    };
    const sale = Sales.rank('gemShortfall', Object.keys(ways).filter(arm => ways[arm]).map(arm => ({ arm, value: ways[arm].value })));
    showDialog({
        title: `💎 ${short} more needed`,
        body: `<p class="big-count">💎 ${res.gems} / ${withCommas(n)}</p>
               ${sale.featured === 'jar' ? `<p class="hint">Your Gem Jar holds 💎${shop.jar}, all earned by you!</p>` : ''}
               ${billing || nativeApp ? '' : '<p class="hint">Test mode: no real payment is taken here.</p>'}`,
        actions: [
            ...sale.order.map((arm, i) => ({ ...ways[arm], primary: i === 0, buy: false, wide: true, sale: arm, waitFor: ways[arm].wait })),
            { label: 'All gems', onClick: () => openShop() },
            { label: 'Not now' },
        ],
        sale,
    });
}

function watchAdForGems(n, retry) {
    if (adsLeft() <= 0) return;
    showRewardedAd(() => {
        shop.adsWatched++;
        res.gems += n;
        updateUI();
        toast(`+💎 ${n}`, 'good');
        if (retry) retry();
    });
}

// --- SHOP ---

function openShop(note = '') {
    const basketDays = basketDaysLeft();
    const actions = [];
    if (!shop.offerBought) {
        actions.push({
            label: `⭐ ${SPECIAL_OFFER.name}: 💎 ${SPECIAL_OFFER.gems} + 💵 ${withCommas(SPECIAL_OFFER.money)} + ⚡ ${SPECIAL_OFFER.energy} · ${SPECIAL_OFFER.price}`,
            primary: true, wide: true, onClick: buySpecialOffer,
        });
    }
    GEM_PACKS.forEach(pack => actions.push({
        label: `${pack.name}: 💎 ${withCommas(pack.gems)}${pack.tag ? ` (${pack.tag})` : ''} · ${pack.price}`,
        primary: true, wide: true,
        onClick: () => purchase(pack.id),
    }));
    actions.push(basketDays > 0
        ? { label: `🧺 Daily Basket active · ${basketDeliveriesLeft()} more days`, wide: true, disabled: true }
        : { label: `🧺 ${DAILY_BASKET.name}: 💎 ${DAILY_BASKET.gemsPerDay} every day · ${DAILY_BASKET.price}`,
            primary: true, wide: true, onClick: buyDailyBasket });
    actions.push({ label: `⚡ ${ENERGY_PACK} Energy · 💎 ${energyPrice()}`, wide: true, onClick: buyEnergy });
    if (!pass.golden) actions.push({ label: `🎟️ ${GOLDEN_PASS.name}: golden rewards, 💎${GOLDEN_PASS.gemsPerDay} a day · ${GOLDEN_PASS.price}`, primary: true, wide: true, onClick: () => buyGoldenPass() });
    actions.push({ label: '🏷️ Flash Sale & 🎁 Daily Deals at the Market', wide: true, onClick: () => { goTo('market'); openFlashSale(); } });
    actions.push({ label: 'Close' });
    showDialog({
        title: 'Shop',
        body: `${note ? `<p><b>${note}</b></p>` : ''}
               <p>💎 Gems buy ⚡ energy, recharge producers instantly and cover any 💵 you're short.</p>
               ${billing || nativeApp ? '' : '<p class="hint">Test mode: no real payment is taken here.</p>'}`,
        actions,
    });
}

function openSpecialOffer(title = SPECIAL_OFFER.name) {
    showDialog({
        title,
        body: `<p><b>One-time ${SPECIAL_OFFER.name}</b></p>
               <p>💎 ${SPECIAL_OFFER.gems} + 💵 ${withCommas(SPECIAL_OFFER.money)} + ⚡ ${SPECIAL_OFFER.energy}</p>`,
        actions: [
            { label: `Get it for ${SPECIAL_OFFER.price}`, primary: true, wide: true, onClick: buySpecialOffer },
            { label: 'No thanks' },
        ],
    });
}

function buySpecialOffer() {
    if (shop.offerBought) return;
    purchase(SPECIAL_OFFER.id);
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
    purchase(DAILY_BASKET.id);
}

// Runs on start-up and every tick; gives today's gems once.
function claimDailyBasket() {
    if (basketDaysLeft() <= 0 || shop.basketClaimed === today()) return;
    shop.basketClaimed = today();
    res.gems += DAILY_BASKET.gemsPerDay;
    updateUI();
    toast(`🧺 Daily Basket: +💎 ${DAILY_BASKET.gemsPerDay} (${basketDeliveriesLeft()} more days)`, 'good');
}

// --- PAYMENTS ---
// Everything sold for real money, by its product id in Google Play Console
// (create each one there as a one-time "managed product" with the same id).
// In the Android app, Google Play Billing takes the payment and the reward is
// given only once Google approves it. On the website (no store) purchases are
// test purchases and pay at once, so the game can be tried.
function products() {
    return [...GEM_PACKS, SPECIAL_OFFER, DAILY_BASKET, GEM_JAR, ...OFFERS, GOLDEN_PASS, GOLDEN_PASS_DELUXE];
}
// Their US prices as numbers, for the sales director (the store shows local ones later).
const PRICE_USD = Object.fromEntries(products().map(p => [p.id, parseFloat(p.price.replace(/[^\d.]/g, ''))]));

// What a product gives. Looked up by id, so a payment Google approves later
// (the app was closed halfway) still pays out.
function grantPurchase(id) {
    const pack = GEM_PACKS.find(p => p.id === id);
    if (pack) {
        res.gems += pack.gems;
        return `+💎 ${withCommas(pack.gems)}`;
    }
    const offer = OFFERS.find(o => o.id === id);
    if (offer) {
        offerState(id).bought = true;
        grantReward(offer.reward, `🔥 ${offer.name}:`);
        return offer.name;
    }
    if (id === SPECIAL_OFFER.id) {
        shop.offerBought = true;
        res.gems += SPECIAL_OFFER.gems;
        res.money += SPECIAL_OFFER.money;
        res.energy += SPECIAL_OFFER.energy;
        tickEnergy();
        return `+💎 ${SPECIAL_OFFER.gems} +💵 ${withCommas(SPECIAL_OFFER.money)} +⚡ ${SPECIAL_OFFER.energy}`;
    }
    if (id === DAILY_BASKET.id) {
        shop.basketStart = today();
        shop.basketClaimed = null;
        claimDailyBasket();
        return `${DAILY_BASKET.name} started`;
    }
    if (id === GEM_JAR.id) {
        const gems = shop.jar;
        res.gems += gems;
        shop.jar = 0;
        return `🫙 +💎${gems}`;
    }
    if (id === GOLDEN_PASS.id || id === GOLDEN_PASS_DELUXE.id) {
        pass.golden = true;
        if (id === GOLDEN_PASS_DELUXE.id) addPassPoints(GOLDEN_PASS_DELUXE.points);
        claimPassGems();
        return `🎟️ ${id === GOLDEN_PASS_DELUXE.id ? GOLDEN_PASS_DELUXE.name : GOLDEN_PASS.name} for ${seasonTheme().name}`;
    }
    return null;
}

function paidOut(id, test = false) {
    const message = grantPurchase(id);
    if (!message) return;
    Sales.paid(id, PRICE_USD[id], test);
    sfx('buy');
    updateUI();
    saveGame();
    toast(test ? `${message} (test purchase)` : `${message} · thank you!`, 'good');
    goTo(currentScene);
}

// Google Play Billing, through the purchase plugin in the Android app (null on the website).
let billing = null;

function purchase(productId) {
    if (billing) return billing.order(productId);
    // In the app, nothing is ever given without Google's payment (the store may still be loading).
    if (nativeApp) return toast('The store isn\'t ready yet. Please try again in a moment.');
    paidOut(productId, true);
}

document.addEventListener('deviceready', () => {
    const CP = window.CdvPurchase;
    if (!CP) return;
    const { store, ProductType, Platform } = CP;
    store.register(products().map(p => ({ id: p.id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
    // Each approved payment pays once (its id is remembered), then is
    // finished, which tells Google it was delivered and lets it be bought again.
    store.when()
        .approved(transaction => {
            const done = shop.granted || (shop.granted = []);
            if (!done.includes(transaction.transactionId)) {
                done.push(transaction.transactionId);
                if (done.length > 200) done.splice(0, done.length - 200);
                transaction.products.forEach(p => paidOut(p.id));
            }
            transaction.finish();
        })
        .productUpdated(product => {
            // Show Google's price, in the player's own currency.
            const ours = products().find(p => p.id === product.id);
            const price = product.pricing && product.pricing.price;
            if (ours && price) ours.price = price;
        });
    store.error(err => { if (err && err.code !== CP.ErrorCode.PAYMENT_CANCELLED) toast(`The store says: ${err.message}`); });
    store.initialize([Platform.GOOGLE_PLAY]).then(() => {
        billing = {
            order(id) {
                const offer = store.get(id, Platform.GOOGLE_PLAY)?.getOffer();
                if (!offer) return toast('That isn\'t available right now. Please try again later.');
                store.order(offer);
            },
        };
    });
}, false);

// The ad network (SalesAds in monetize.js) plays it; onReward only once it was
// watched to the end.
function showRewardedAd(onReward) {
    if (SalesAds.test) toast('(test ad)');
    SalesAds.show(() => {
        Sales.adDone();
        onReward();
    }, syncMusic);
    syncMusic(); // the music waits while the ad plays
}

// --- REWARDS ---

function chestName(item) {
    return `${CHESTS[item.kind].name}${levelOf(item) > 1 ? ` Lv${levelOf(item)}` : ''}`;
}

// A producer part's picture (the Barn's, which every farm has) for texts that
// don't know yet which board it goes to.
function partIcon(level = 1) {
    return itemIconFor('barn', { type: 'shop', level });
}

// A job's stat need: its icon (producer parts show a part).
function statIcon(stat) {
    return stat === 'upgrades' ? partIcon(2) : TASK_STATS[stat].emoji;
}

function rewardText(r) {
    return [
        r.money && `💵${r.money}`, r.gems && `💎${r.gems}`, r.energy && `⚡${r.energy}`,
        r.part && `${partIcon(r.part)} Lv${r.part} ${r.part >= FIRST_WORKING_LEVEL ? 'producer' : 'part'}`,
        r.timeSkip && `⏳ ${BOOSTERS.skip.values[r.timeSkip - 1]}h skip`,
        r.chest && `🧰 ${CHESTS[r.chest].name}`, r.item && itemLabel(deliveryBoard(), r.item),
        r.fairBoost && `🎪 ${r.fairBoost}m double Fair points`,
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
    if (r.fairBoost) fair.boostUntil = Math.max(Date.now(), fair.boostUntil) + r.fairBoost * 60000;
    if (r.item) {
        const mode = deliveryBoard();
        crates[mode].push({ ...r.item });
        where.push(`in your ${AREAS[mode].name} 🎁`);
    }
    updateUI();
    toast(`${title} ${rewardText(r)}${where.length ? ` · ${where.join(' · ')}` : ''}`, 'good');
    if (where.length) flyGift();
}

// A reward box flies from the middle of the screen to where it waits: the
// board's 🎁, or the Merge button that leads there.
function flyGift() {
    setTimeout(() => {
        if (AREAS[currentScene]) renderBoardHeader(currentScene); // its 🎁 shows the new count
        const to = document.querySelector('.scene:not([hidden]) .crate-btn') || document.querySelector('.scene:not([hidden]) .fix-merge');
        if (!to) return;
        const st = stageEl.getBoundingClientRect();
        flyReward('🎁', { x: st.left + st.width / 2, y: st.top + st.height * 0.45 }, to, 1, 0, 'big');
    }, 350); // after the board or card redraws
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
    stats.xpEarned += n;
    while (quests.xp >= xpToNext(quests.level)) {
        quests.xp -= xpToNext(quests.level);
        quests.level++;
        const reward = levelReward(quests.level);
        grantReward(reward, `⭐ Level ${quests.level}!`);
        salesPause();
        // Shown after whatever called this has redrawn the scene.
        setTimeout(() => showLevelUp(quests.level, reward), 350);
    }
    updateUI();
}

function showLevelUp(level, reward) {
    if (level !== quests.level) return; // a later level-up has its own popup
    if (!dialogEl.hidden) return setTimeout(() => showLevelUp(level, reward), 500); // after the card that's up (a job, an area)
    celebrate('level');
    fxLevelUp();
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
    // The Barn's three areas. `zone` is the area, `at` the spot in its picture
    // (% across, % down), `look` what stands there before and after: object
    // pictures by name (OBJECT_EMOJI until drawn), '' for nothing.
    // Barnyard (day 1): the tutorial's first fix, then two threads that join.
    { id: 'barn1', land: 'barn', zone: 'barnyard', at: [18, 46], look: ['planks', ''], name: 'Clear the planks', who: 'mayor', xp: 1, needs: [{ stat: 'boxes', n: 1 }], line: 'Great job!' },
    { id: 'barn2', land: 'barn', zone: 'barnyard', at: [35, 61], look: ['weeds', ''], after: ['barn1'],
      name: 'Pull the weeds', who: 'hattie', xp: 1, needs: [{ item: 'barn', tier: 0, n: 2 }], line: 'Weeds gone!' },
    { id: 'barn3', land: 'barn', zone: 'barnyard', at: [22, 86], look: ['branch', ''], after: ['barn1'],
      name: 'Move the fallen branch', who: 'ruby', xp: 1, needs: [{ item: 'tools', tier: 1, n: 1 }], line: 'Heave!' },
    { id: 'barn4', land: 'barn', zone: 'barnyard', at: [7, 33], look: ['feedbin_broken', 'feedbin'], after: ['barn2'],
      name: 'Fix the feed bin', who: 'ruby', xp: 2, needs: [{ item: 'tools', tier: 2, n: 1 }], line: 'Good as new!' },
    { id: 'barn5', land: 'barn', zone: 'barnyard', at: [10, 65], look: ['fence_broken', 'fence'], after: ['barn3'],
      name: 'Mend the fence', who: 'ruby', xp: 2, needs: [{ item: 'tools', tier: 1, n: 2 }], line: 'Nice fence!' },
    { id: 'barn6', land: 'barn', zone: 'barnyard', at: [72, 75], look: ['wheelbarrow_broken', 'wheelbarrow'], after: ['barn4', 'barn5'],
      name: 'Fix the wheelbarrow', who: 'hattie', xp: 2, needs: [{ item: 'tools', tier: 3, n: 1 }], line: 'It rolls!' },
    { id: 'barn7', land: 'barn', zone: 'barnyard', at: [88, 50], look: ['pump_broken', 'pump'], after: ['barn6'],
      name: 'Clean the water pump', who: 'hattie', xp: 2, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'barn', tier: 1, n: 1 }], line: 'Fresh water!' },
    { id: 'barn8', land: 'barn', zone: 'barnyard', at: [18, 76], look: ['junk', 'firewood'], after: ['barn6'],
      name: 'Haul away the junk', who: 'mayor', xp: 2, needs: [{ stat: 'sold', n: 3 }], line: 'Much tidier!' },
    { id: 'barn9', land: 'barn', zone: 'barnyard', at: [70, 31], look: ['', 'lantern'], after: ['barn7'],
      name: 'Put up a lantern', who: 'ruby', xp: 3, needs: [{ item: 'tools', tier: 2, n: 2 }], line: 'So bright!' },
    { id: 'barn10', land: 'barn', zone: 'barnyard', at: [90, 86], look: ['', 'mailbox'], after: ['barn8'],
      name: 'Put up a mailbox', who: 'mayor', xp: 3, needs: [{ item: 'tools', tier: 4, n: 1 }], line: 'Mail!' },
    { id: 'barn11', land: 'barn', zone: 'barnyard', at: [55, 89], look: ['', 'tulips'], after: ['barn9', 'barn10', 'barn28', 'barn29'], reward: { chest: 'brown' },
      name: 'Plant tulips', who: 'hattie', xp: 4, needs: [{ item: 'barn', tier: 3, n: 1 }, { item: 'barn', tier: 1, n: 2 }], line: 'Pretty!' },
    // Hen House (day 2)
    { id: 'hen1', land: 'barn', zone: 'henhouse', at: [50, 66], look: ['straw_mess', ''],
      name: 'Sweep up the old straw', who: 'hattie', xp: 2, needs: [{ stat: 'webs', n: 3 }], line: 'So clean!' },
    { id: 'hen2', land: 'barn', zone: 'henhouse', at: [84, 50], look: ['sacks', ''],
      name: 'Clear out the old sacks', who: 'mayor', xp: 2, needs: [{ stat: 'sold', n: 2 }], line: 'Bye, sacks!' },
    { id: 'hen3', land: 'barn', zone: 'henhouse', at: [50, 44], look: ['nest_empty', 'nest_chicks'], after: ['hen1'],
      name: 'Fix the nest', who: 'hattie', xp: 3, needs: [{ item: 'barn', tier: 2, n: 2 }], line: 'So cute!' },
    { id: 'hen4', land: 'barn', zone: 'henhouse', at: [18, 40], look: ['wire_torn', 'wire_fixed'], after: ['hen2'],
      name: 'Patch the chicken wire', who: 'ruby', xp: 3, needs: [{ item: 'tools', tier: 3, n: 2 }], line: 'No foxes!' },
    { id: 'hen5', land: 'barn', zone: 'henhouse', at: [20, 60], look: ['trough_empty', 'trough_full'], after: ['hen1'],
      name: 'Fill the water trough', who: 'hattie', xp: 3, needs: [{ item: 'barn', tier: 1, n: 3 }], line: 'Splash!' },
    { id: 'hen6', land: 'barn', zone: 'henhouse', at: [62, 30], look: ['perch_broken', 'hen_perch'], after: ['hen3'],
      name: 'Fix the perch', who: 'ruby', xp: 4, needs: [{ item: 'tools', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'hen7', land: 'barn', zone: 'henhouse', at: [25, 70], look: ['feeder_rusty', 'feeder'], after: ['hen4', 'hen5'],
      name: 'Fix the feeder', who: 'hattie', xp: 4, needs: [{ item: 'barn', tier: 3, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Yum!' },
    { id: 'hen8', land: 'barn', zone: 'henhouse', at: [86, 73], look: ['basket_empty', 'basket_eggs'], after: ['hen6'], reward: { chest: 'brown' },
      name: 'Fill the egg basket', who: 'hattie', xp: 4, needs: [{ item: 'barn', tier: 1, n: 4 }], line: 'Eggs! Yay!' },
    { id: 'hen9', land: 'barn', zone: 'henhouse', at: [70, 86], look: ['', 'coop'], after: ['hen7'],
      name: 'Build a little coop', who: 'ruby', xp: 5, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'tools', tier: 1, n: 2 }], line: 'A new home!' },
    { id: 'hen10', land: 'barn', zone: 'henhouse', at: [32, 86], look: ['', 'nestbox'], after: ['hen8', 'hen9', 'barn46', 'barn47'], reward: { chest: 'blue' },
      name: 'Make a nest box', who: 'hattie', xp: 6, needs: [{ item: 'barn', tier: 4, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'The hens are back!' },
    // Barn Storeroom (day 2)
    { id: 'big1', land: 'barn', zone: 'bigbarn', at: [40, 57], look: ['counter_broken', 'counter'],
      name: 'Mend the broken table', who: 'ruby', xp: 5, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'barn', tier: 4, n: 1 }], line: 'Good as new!' },
    { id: 'big2', land: 'barn', zone: 'bigbarn', at: [70, 69], look: ['scrolls_spilled', ''],
      name: 'Pick up the spilled scrolls', who: 'hattie', xp: 5, needs: [{ item: 'barn', tier: 3, n: 2 }], line: 'Tidy!' },
    { id: 'big3', land: 'barn', zone: 'bigbarn', at: [65, 32], look: ['shelf_broken', 'shelf'], after: ['big1'],
      name: 'Fix the old shelves', who: 'ruby', xp: 5, needs: [{ stat: 'upgrades', n: 1 }], line: 'Sturdy!' },
    { id: 'big4', land: 'barn', zone: 'bigbarn', at: [86, 61], look: ['sacks_spilled', 'sacks_stacked'], after: ['big2'],
      name: 'Stack the seed sacks', who: 'hattie', xp: 6, needs: [{ item: 'barn', tier: 4, n: 1 }], line: 'Neat!' },
    { id: 'big5', land: 'barn', zone: 'bigbarn', at: [12, 80], look: ['jars_fallen', 'jars'], after: ['big3'],
      name: 'Sort out the jars', who: 'ruby', xp: 6, needs: [{ item: 'tools', tier: 6, n: 1 }], line: 'All sorted!' },
    { id: 'big6', land: 'barn', zone: 'bigbarn', at: [36, 74], look: ['basket_tipped', 'basket_full'], after: ['big4'],
      name: 'Mend the basket', who: 'mayor', xp: 7, needs: [{ item: 'tools', tier: 5, n: 1 }], line: 'Cozy!' },
    { id: 'big7', land: 'barn', zone: 'bigbarn', at: [15, 36], look: ['crate_empty', 'crate_full'], after: ['big5', 'big6'],
      name: 'Fill the crates', who: 'hattie', xp: 8, needs: [{ item: 'barn', tier: 5, n: 1 }, { item: 'barn', tier: 3, n: 1 }], line: 'Full up!' },
    { id: 'big8', land: 'barn', zone: 'bigbarn', at: [62, 92], look: ['rug_torn', 'rug'], after: ['big7', 'barn64', 'barn65'], reward: { chest: 'blue' },
      name: 'Weave a new rug', who: 'hattie', xp: 10, needs: [{ item: 'barn', tier: 6, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'Beautiful!' },
    // Crop Field (day 3): bought first, then its three areas.
    { id: 'farm1', land: 'farm', name: 'Buy the Crop Field', who: 'mayor', xp: 3, needs: [{ own: 'farm' }],
      line: 'Your field!' },
    { id: 'farm2', land: 'farm', zone: 'fieldgate', at: [12, 72], look: ['weeds_thorny', ''], after: ['farm1'],
      name: 'Pull the thorny weeds', who: 'hattie', xp: 3, needs: [{ item: 'garden', tier: 1, n: 1 }], line: 'Ouch! Done!' },
    { id: 'farm3', land: 'farm', zone: 'fieldgate', at: [35, 45], look: ['rock', ''], after: ['farm1'],
      name: 'Roll away the rock', who: 'ruby', xp: 3, needs: [{ stat: 'boxes', n: 3 }], line: 'Heave!' },
    { id: 'farm4', land: 'farm', zone: 'fieldgate', at: [82, 70], look: ['brush', ''], after: ['farm2'],
      name: 'Clear the dead brush', who: 'hattie', xp: 3, needs: [{ item: 'garden', tier: 0, n: 2 }], line: 'All clear!' },
    { id: 'farm5', land: 'farm', zone: 'fieldgate', at: [32, 31], look: ['scarecrow_fallen', 'scarecrow'], after: ['farm3'],
      name: 'Fix the scarecrow', who: 'ruby', xp: 4, needs: [{ item: 'garden', tier: 2, n: 1 }], line: 'Boo, crows!' },
    { id: 'farm6', land: 'farm', zone: 'fieldgate', at: [55, 70], look: ['gate_broken', 'gate'], after: ['farm4', 'farm5'],
      name: 'Fix the gate', who: 'ruby', xp: 4, needs: [{ item: 'tools', tier: 3, n: 1 }], line: 'Nice gate!' },
    { id: 'farm7', land: 'farm', zone: 'fieldgate', at: [70, 48], look: ['seedcart_tipped', 'seedcart'], after: ['farm6'],
      name: 'Set the seed cart right', who: 'hattie', xp: 4, needs: [{ item: 'farm', tier: 1, n: 3 }], line: 'Seeds!' },
    { id: 'farm8', land: 'farm', zone: 'fieldgate', at: [15, 25], look: ['plough_rusty', 'plough'], after: ['farm6'],
      name: 'Clean up the old plough', who: 'ruby', xp: 5, needs: [{ item: 'garden', tier: 3, n: 1 }], line: 'Shiny!' },
    { id: 'farm9', land: 'farm', zone: 'fieldgate', at: [52, 17], look: ['birdhouse_broken', 'birdhouse'], after: ['farm7'],
      name: 'Put up a birdhouse', who: 'hattie', xp: 5, needs: [{ item: 'tools', tier: 1, n: 2 }], line: 'Tweet!' },
    { id: 'farm10', land: 'farm', zone: 'fieldgate', at: [70, 88], look: ['', 'signpost'], after: ['farm8', 'farm9', 'farm45', 'farm46'], reward: { chest: 'brown' },
      name: 'Put up a signpost', who: 'mayor', xp: 6, needs: [{ item: 'farm', tier: 3, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'Welcome!' },
    { id: 'farm11', land: 'farm', zone: 'berryrows', at: [60, 35], look: ['bed_bare', 'bed_young'],
      name: 'Dig the first bed', who: 'hattie', xp: 5, needs: [{ item: 'garden', tier: 1, n: 2 }], line: 'Dig dig!' },
    { id: 'farm12', land: 'farm', zone: 'berryrows', at: [55, 50], look: ['berries_wilted', 'berries_ripe'],
      name: 'Water the wilted plants', who: 'hattie', xp: 5, needs: [{ item: 'garden', tier: 4, n: 1 }], line: 'Berries!' },
    { id: 'farm13', land: 'farm', zone: 'berryrows', at: [20, 57], look: ['barrel_broken', 'barrel_full'], after: ['farm11'],
      name: 'Fix the water barrel', who: 'ruby', xp: 6, needs: [{ item: 'tools', tier: 3, n: 1 }], line: 'No leaks!' },
    { id: 'farm14', land: 'farm', zone: 'berryrows', at: [30, 66], look: ['netting_tangled', 'netting'], after: ['farm12'],
      name: 'Untangle the netting', who: 'hattie', xp: 6, needs: [{ item: 'garden', tier: 2, n: 1 }], line: 'No birds!' },
    { id: 'farm15', land: 'farm', zone: 'berryrows', at: [80, 60], look: ['molehole', ''], after: ['farm13'],
      name: 'Fill in the mole hole', who: 'ruby', xp: 6, needs: [{ item: 'garden', tier: 1, n: 1 }, { item: 'farm', tier: 0, n: 2 }], line: 'Bye, mole!' },
    { id: 'farm16', land: 'farm', zone: 'berryrows', at: [85, 78], look: ['weeds_straw', 'straw_mulch'], after: ['farm14'],
      name: 'Spread fresh straw', who: 'hattie', xp: 7, needs: [{ stat: 'sold', n: 3 }], line: 'Cozy beds!' },
    { id: 'farm17', land: 'farm', zone: 'berryrows', at: [35, 90], look: ['baskets_tipped', 'baskets_berries'], after: ['farm15', 'farm16'],
      name: 'Fill the baskets', who: 'hattie', xp: 7, needs: [{ item: 'farm', tier: 3, n: 2 }], line: 'Yum!' },
    { id: 'farm18', land: 'farm', zone: 'berryrows', at: [44, 10], look: ['stand_broken', 'stand'], after: ['farm17', 'farm63', 'farm64'], reward: { chest: 'blue' },
      name: 'Open the berry stand', who: 'mayor', xp: 8, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'farm', tier: 3, n: 1 }], line: 'Fresh berries!' },
    { id: 'farm19', land: 'farm', zone: 'orchard', at: [55, 47], look: ['branch_big', ''],
      name: 'Clear the fallen branch', who: 'ruby', xp: 8, needs: [{ item: 'garden', tier: 3, n: 1 }], line: 'Timber!' },
    { id: 'farm20', land: 'farm', zone: 'orchard', at: [45, 53], look: ['apples_rotten', 'apples_basket'],
      name: 'Pick up the old apples', who: 'hattie', xp: 8, needs: [{ item: 'garden', tier: 0, n: 3 }], line: 'Fresh ones!' },
    { id: 'farm21', land: 'farm', zone: 'orchard', at: [25, 63], look: ['wall_rubble', 'wall'], after: ['farm19'],
      name: 'Mend the stone wall', who: 'ruby', xp: 9, needs: [{ item: 'tools', tier: 3, n: 2 }], line: 'Solid!' },
    { id: 'farm22', land: 'farm', zone: 'orchard', at: [80, 74], look: ['crate_broken', 'crates_apples'], after: ['farm20'],
      name: 'Fix the apple crates', who: 'ruby', xp: 9, needs: [{ item: 'wood', tier: 3, n: 1 }], line: 'Stacked!' },
    { id: 'farm23', land: 'farm', zone: 'orchard', at: [25, 77], look: ['stump', 'stump_table'], after: ['farm21'],
      name: 'Turn the stump into a table', who: 'ruby', xp: 10, needs: [{ item: 'tools', tier: 4, n: 1 }], line: 'A table!' },
    { id: 'farm24', land: 'farm', zone: 'orchard', at: [72, 87], look: ['beehive_broken', 'beehive'], after: ['farm22'],
      name: 'Rehome the bees', who: 'poppy', xp: 10, needs: [{ item: 'farm', tier: 5, n: 2 }], line: 'Buzz!' },
    { id: 'farm25', land: 'farm', zone: 'orchard', at: [28, 89], look: ['brambles', ''], after: ['farm23'],
      name: 'Cut back the brambles', who: 'hattie', xp: 10, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Ouch, done!' },
    { id: 'farm26', land: 'farm', zone: 'orchard', at: [80, 62], look: ['swing_broken', 'swing'], after: ['farm24'],
      name: 'Hang up the swing', who: 'ruby', xp: 11, needs: [{ item: 'garden', tier: 4, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Whee!' },
    { id: 'farm27', land: 'farm', zone: 'orchard', at: [60, 80], look: ['', 'sapling'], after: ['farm25', 'farm26'], reward: { chest: 'blue' },
      name: 'Plant a new apple tree', who: 'hattie', xp: 12, needs: [{ item: 'farm', tier: 8, n: 1 }, { item: 'garden', tier: 5, n: 1 }], line: 'Grow, little tree!' },
    { id: 'farm28', land: 'farm', zone: 'orchard', at: [55, 93], look: ['', 'picnic'], after: ['farm27', 'farm81', 'farm82'],
      name: 'Lay out a picnic', who: 'mayor', xp: 14, needs: [{ item: 'farm', tier: 9, n: 1 }, { item: 'garden', tier: 6, n: 1 }], line: 'Lovely!' },
    // Hay Field (day 3)
    { id: 'hay1', land: 'hay', name: 'Buy the Hay Field', who: 'mayor', xp: 4, needs: [{ own: 'hay' }],
      line: 'More land!' },
    // Meadow: the sheep's pasture, its path and vegetable beds.
    { id: 'hay2', land: 'hay', zone: 'meadow', at: [45, 47], look: ['🕸️', ''], after: ['hay1'],
      name: 'Clear out the old straw', who: 'hattie', xp: 5, needs: [{ stat: 'webs', n: 4 }], line: 'Fresh straw!' },
    { id: 'hay3', land: 'hay', zone: 'meadow', at: [78, 66], look: ['🍂', '🌾'], after: ['hay1'],
      name: 'Tie the first bundles', who: 'hattie', xp: 6, needs: [{ item: 'hay', tier: 2, n: 2 }], line: 'Neat bundles!' },
    { id: 'hay7', land: 'hay', zone: 'meadow', at: [55, 32], look: ['🍂', ''], after: ['hay2'],
      name: 'Rake the path', who: 'hattie', xp: 6, needs: [{ item: 'garden', tier: 3, n: 1 }], line: 'Tidy path!' },
    { id: 'hay8', land: 'hay', zone: 'meadow', at: [15, 60], look: ['🚧', '🪵'], after: ['hay3'],
      name: 'Fence the vegetable beds', who: 'ruby', xp: 7, needs: [{ item: 'wood', tier: 2, n: 2 }], line: 'Keep out, bunnies!' },
    { id: 'hay9', land: 'hay', zone: 'meadow', at: [35, 20], look: ['🐑', '🐑'], after: ['hay7'], name: 'Shear the sheep', who: 'hattie', xp: 7, needs: [{ item: 'garden', tier: 2, n: 1 }, { item: 'hay', tier: 1, n: 2 }], line: 'Baa!' },
    { id: 'hay10', land: 'hay', zone: 'meadow', at: [85, 50], look: ['🟫', '🌱'], after: ['hay8'],
      name: 'Plant the beds', who: 'hattie', xp: 8, needs: [{ item: 'garden', tier: 1, n: 2 }, { item: 'hay', tier: 0, n: 3 }], line: 'Grow!' },
    { id: 'hay11', land: 'hay', zone: 'meadow', at: [88, 84], look: ['🥀', '🧑‍🌾'], after: ['hay9', 'hay10'],
      name: 'Dress up the scarecrow', who: 'ruby', xp: 8, needs: [{ item: 'hay', tier: 3, n: 1 }, { item: 'tools', tier: 1, n: 1 }], line: 'Dapper!' },
    { id: 'hay12', land: 'hay', zone: 'meadow', at: [80, 38], look: ['🍂', '🍎'], after: ['hay11', 'hay44', 'hay45'], reward: { chest: 'brown' },
      name: 'Pick the meadow apples', who: 'mayor', xp: 9, needs: [{ item: 'hay', tier: 4, n: 1 }, { stat: 'sold', n: 4 }], line: 'Crunchy!' },
    // Stables: the horses' stalls, their paddock and its fence.
    { id: 'hay13', land: 'hay', zone: 'stables', at: [50, 28], look: ['🧲', ''],
      name: 'Pick up the old horseshoes', who: 'hattie', xp: 8, needs: [{ item: 'garden', tier: 0, n: 2 }], line: 'Lucky!' },
    { id: 'hay4', land: 'hay', zone: 'stables', at: [30, 34], look: ['🌾', '🟫'],
      name: 'Stack the bales', who: 'ruby', xp: 10, needs: [{ item: 'wood', tier: 2, n: 2 }, { item: 'hay', tier: 3, n: 1 }], line: 'Stacked!' },
    { id: 'hay14', land: 'hay', zone: 'stables', at: [45, 48], look: ['🚧', '🪵'], after: ['hay13'],
      name: 'Mend the paddock fence', who: 'ruby', xp: 9, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Good fence!' },
    { id: 'hay15', land: 'hay', zone: 'stables', at: [40, 80], look: ['🕳️', ''], after: ['hay4'],
      name: 'Fill the mud holes', who: 'hattie', xp: 9, needs: [{ item: 'hay', tier: 1, n: 3 }, { item: 'garden', tier: 1, n: 1 }], line: 'No more mud!' },
    { id: 'hay16', land: 'hay', zone: 'stables', at: [20, 24], look: ['🚪', '🚪'], after: ['hay14'],
      name: 'Fix the stall doors', who: 'ruby', xp: 10, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'Click!' },
    { id: 'hay17', land: 'hay', zone: 'stables', at: [60, 62], look: ['🛁', '💧'], after: ['hay15'],
      name: 'Fill the water trough', who: 'hattie', xp: 10, needs: [{ item: 'hay', tier: 4, n: 1 }], line: 'Drink up!' },
    { id: 'hay18', land: 'hay', zone: 'stables', at: [20, 66], look: ['', '🏠'], after: ['hay16', 'hay17'], name: 'Build a second stall', who: 'ruby', xp: 11, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Room for two!' },
    { id: 'hay19', land: 'hay', zone: 'stables', at: [80, 78], look: ['', '🐎'], after: ['hay18'],
      name: 'Hang up the saddle', who: 'hattie', xp: 11, needs: [{ item: 'hay', tier: 5, n: 1 }], line: 'Giddy up!' },
    { id: 'hay5', land: 'hay', zone: 'stables', at: [50, 14], look: ['🏚️', '🏠'], after: ['hay19', 'hay62', 'hay63'], reward: { chest: 'blue' },
      name: 'Repair the hay loft', who: 'ruby', xp: 12, needs: [{ item: 'hay', tier: 5, n: 1 }, { item: 'wood', tier: 4, n: 1 }], line: 'Good as new!' },
    // Windmill: torn sails, a door off its hinges, sacks everywhere.
    { id: 'hay20', land: 'hay', zone: 'windmill', at: [35, 58], look: ['🎒', ''], name: 'Pick up the spilled sacks', who: 'hattie', xp: 10, needs: [{ item: 'hay', tier: 2, n: 3 }], line: 'All picked up!' },
    { id: 'hay21', land: 'hay', zone: 'windmill', at: [72, 44], look: ['🌿', ''],
      name: 'Pull the weeds by the walls', who: 'hattie', xp: 10, needs: [{ item: 'garden', tier: 1, n: 2 }], line: 'Weeds gone!' },
    { id: 'hay22', land: 'hay', zone: 'windmill', at: [40, 51], look: ['🚪', '🚪'], after: ['hay20'],
      name: 'Hang the door back on', who: 'ruby', xp: 11, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'Creak, click!' },
    { id: 'hay23', land: 'hay', zone: 'windmill', at: [55, 40], look: ['🧱', '🧱'], after: ['hay21'],
      name: 'Patch the cracked walls', who: 'ruby', xp: 11, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'hay', tier: 3, n: 2 }], line: 'Solid!' },
    { id: 'hay24', land: 'hay', zone: 'windmill', at: [22, 28], look: ['🪵', '🪵'], after: ['hay22', 'hay23'],
      name: 'Fix the sail frames', who: 'ruby', xp: 12, needs: [{ item: 'wood', tier: 4, n: 2 }], line: 'Strong frames!' },
    { id: 'hay25', land: 'hay', zone: 'windmill', at: [80, 16], look: ['🏳️', '⛵'], after: ['hay24'],
      name: 'Sew new sails', who: 'poppy', xp: 13, needs: [{ item: 'hay', tier: 5, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'So white!' },
    { id: 'hay26', land: 'hay', zone: 'windmill', at: [68, 45], look: ['', '🌸'], after: ['hay24'],
      name: 'Put up flower boxes', who: 'poppy', xp: 12, needs: [{ item: 'wood', tier: 2, n: 2 }, { stat: 'sold', n: 5 }], line: 'Pretty!' },
    { id: 'hay27', land: 'hay', zone: 'windmill', at: [80, 58], look: ['', '🪑'], after: ['hay26'],
      name: 'Build a bench', who: 'ruby', xp: 13, needs: [{ item: 'wood', tier: 5, n: 1 }], line: 'Sit a while!' },
    { id: 'hay6', land: 'hay', zone: 'windmill', at: [50, 22], look: ['🏚️', '🌬️'], after: ['hay25', 'hay27', 'hay80', 'hay81'], reward: { chest: 'blue' },
      name: 'Set the sails turning', who: 'mayor', xp: 16, needs: [{ item: 'hay', tier: 7, n: 1 }, { item: 'wood', tier: 5, n: 1 }], line: 'Whoosh!' },
    // Compost Yard (day 4)
    { id: 'fert1', land: 'fert', name: 'Buy the Compost Yard', who: 'mayor', xp: 6, needs: [{ own: 'fert' }],
      line: 'Your yard!' },
    // Leaf Piles: soggy heaps, rocks, broken rakes and puddles under the trees.
    { id: 'fert2', land: 'fert', zone: 'leafpiles', at: [22, 30], look: ['🍂', ''], after: ['fert1'],
      name: 'Rake up the first leaf heap', who: 'hattie', xp: 8, needs: [{ item: 'fert', tier: 1, n: 2 }], line: 'Crunch crunch!' },
    { id: 'fert6', land: 'fert', zone: 'leafpiles', at: [70, 38], look: ['🪨', ''], after: ['fert1'],
      name: 'Roll away the rocks', who: 'ruby', xp: 8, needs: [{ stat: 'boxes', n: 4 }], line: 'Heave-ho!' },
    { id: 'fert7', land: 'fert', zone: 'leafpiles', at: [20, 43], look: ['🧹', ''], after: ['fert2'],
      name: 'Pick up the broken rakes', who: 'hattie', xp: 9, needs: [{ item: 'garden', tier: 3, n: 1 }], line: 'Better rakes!' },
    { id: 'fert8', land: 'fert', zone: 'leafpiles', at: [60, 47], look: ['💦', ''], after: ['fert6'],
      name: 'Mop up the puddles', who: 'ruby', xp: 9, needs: [{ item: 'clean', tier: 1, n: 2 }], line: 'Dry at last!' },
    { id: 'fert9', land: 'fert', zone: 'leafpiles', at: [72, 56], look: ['🛒', '🛒'], after: ['fert7'],
      name: 'Empty the wheelbarrows', who: 'ruby', xp: 9, needs: [{ item: 'fert', tier: 2, n: 2 }], line: 'Light as air!' },
    { id: 'fert10', land: 'fert', zone: 'leafpiles', at: [22, 82], look: ['🍂', ''], after: ['fert8'],
      name: 'Rake the big leaf heaps', who: 'hattie', xp: 10, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'fert', tier: 1, n: 3 }], line: 'So tidy!' },
    { id: 'fert11', land: 'fert', zone: 'leafpiles', at: [78, 44], look: ['', '🗑️'], after: ['fert9'],
      name: 'Set out leaf bins', who: 'ruby', xp: 10, needs: [{ item: 'wood', tier: 3, n: 2 }], line: 'In you go!' },
    { id: 'fert12', land: 'fert', zone: 'leafpiles', at: [50, 62], look: ['🍂', '🟫'], after: ['fert10', 'fert11'],
      name: 'Sweep the path', who: 'poppy', xp: 11, needs: [{ item: 'clean', tier: 4, n: 1 }], line: 'Swish swish!' },
    { id: 'fert13', land: 'fert', zone: 'leafpiles', at: [15, 32], look: ['', '🌼'], after: ['fert12', 'fert45', 'fert46'], reward: { chest: 'brown' },
      name: 'Plant autumn flowers', who: 'poppy', xp: 12, needs: [{ item: 'fert', tier: 4, n: 1 }, { item: 'garden', tier: 1, n: 1 }], line: 'Autumn colours!' },
    // Compost Bins: collapsed bins, tools everywhere, a wobbly potting table.
    { id: 'fert14', land: 'fert', zone: 'compostbins', at: [62, 28], look: ['🔧', ''],
      name: 'Pick up the scattered tools', who: 'ruby', xp: 10, needs: [{ item: 'tools', tier: 1, n: 2 }], line: 'Found them!' },
    { id: 'fert3', land: 'fert', zone: 'compostbins', at: [45, 16], look: ['🪵', '🗑️'],
      name: 'Rebuild the compost bins', who: 'ruby', xp: 12, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'fert', tier: 3, n: 1 }], line: 'Sturdy bins!' },
    { id: 'fert15', land: 'fert', zone: 'compostbins', at: [10, 45], look: ['🔧', '🧰'], after: ['fert14'],
      name: 'Hang the tools on the wall', who: 'ruby', xp: 11, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'All in a row!' },
    { id: 'fert16', land: 'fert', zone: 'compostbins', at: [72, 45], look: ['🪵', '🪑'], after: ['fert15'],
      name: 'Fix the potting table', who: 'ruby', xp: 11, needs: [{ item: 'wood', tier: 4, n: 1 }], line: 'No more wobble!' },
    { id: 'fert17', land: 'fert', zone: 'compostbins', at: [18, 62], look: ['🛒', '🛒'], after: ['fert3'],
      name: 'Fill the wheelbarrow', who: 'hattie', xp: 11, needs: [{ item: 'fert', tier: 3, n: 2 }], line: 'Full load!' },
    { id: 'fert4', land: 'fert', zone: 'compostbins', at: [52, 78], look: ['🍂', '🌱'], after: ['fert3'], name: 'Turn the compost', who: 'poppy', xp: 12, needs: [{ item: 'clean', tier: 2, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'Rich soil!' },
    { id: 'fert18', land: 'fert', zone: 'compostbins', at: [82, 14], look: ['', '🪵'], after: ['fert4'],
      name: 'Put lids on the bins', who: 'ruby', xp: 12, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Snug!' },
    { id: 'fert19', land: 'fert', zone: 'compostbins', at: [68, 36], look: ['', '🪴'], after: ['fert16', 'fert17'],
      name: 'Pot the seedlings', who: 'hattie', xp: 12, needs: [{ item: 'fert', tier: 4, n: 1 }, { item: 'garden', tier: 1, n: 2 }], line: 'Little sprouts!' },
    { id: 'fert20', land: 'fert', zone: 'compostbins', at: [85, 64], look: ['', '🌺'], after: ['fert18', 'fert19', 'fert63', 'fert64'], reward: { chest: 'blue' },
      name: 'Plant flowers by the path', who: 'poppy', xp: 13, needs: [{ item: 'fert', tier: 5, n: 1 }], line: 'Blooming!' },
    // Mushroom Corner: a gloomy nook under the old trees, to make magical.
    { id: 'fert21', land: 'fert', zone: 'mushrooms', at: [40, 55], look: ['🪵', ''], name: 'Clear the rotting logs', who: 'ruby', xp: 12, needs: [{ item: 'clean', tier: 2, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'Out they go!' },
    { id: 'fert22', land: 'fert', zone: 'mushrooms', at: [50, 40], look: ['🌿', ''],
      name: 'Untangle the roots', who: 'hattie', xp: 12, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Free!' },
    { id: 'fert23', land: 'fert', zone: 'mushrooms', at: [30, 15], look: ['🌑', '☀️'], after: ['fert22'],
      name: 'Trim the branches to let light in', who: 'hattie', xp: 13, needs: [{ item: 'garden', tier: 4, n: 1 }], line: 'Sunshine!' },
    { id: 'fert24', land: 'fert', zone: 'mushrooms', at: [20, 58], look: ['', '🍄'], after: ['fert21'],
      name: 'Grow the first mushrooms', who: 'poppy', xp: 13, needs: [{ item: 'fert', tier: 5, n: 2 }], line: 'Spotty!' },
    { id: 'fert25', land: 'fert', zone: 'mushrooms', at: [62, 60], look: ['', '🪑'], after: ['fert23'],
      name: 'Build a log bench', who: 'ruby', xp: 14, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'Take a seat!' },
    { id: 'fert26', land: 'fert', zone: 'mushrooms', at: [75, 86], look: ['', '🌿'], after: ['fert24'],
      name: 'Plant ferns', who: 'hattie', xp: 14, needs: [{ item: 'fert', tier: 4, n: 2 }], line: 'So green!' },
    { id: 'fert27', land: 'fert', zone: 'mushrooms', at: [12, 72], look: ['🪨', '🟫'], after: ['fert25'],
      name: 'Scrub the stepping stones', who: 'poppy', xp: 14, needs: [{ item: 'clean', tier: 4, n: 1 }], line: 'Squeaky clean!' },
    { id: 'fert28', land: 'fert', zone: 'mushrooms', at: [88, 64], look: ['', '🍄'], after: ['fert26', 'fert27'],
      name: 'Grow a giant toadstool', who: 'poppy', xp: 15, needs: [{ item: 'fert', tier: 6, n: 1 }], line: 'Enormous!' },
    { id: 'fert5', land: 'fert', zone: 'mushrooms', at: [72, 46], look: ['', '💡'], after: ['fert28', 'fert81', 'fert82'], reward: { chest: 'blue' },
      name: 'Hang the fairy lights', who: 'mayor', xp: 18, needs: [{ item: 'fert', tier: 7, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'Twinkle!' },
    // Fish Pond (day 4)
    { id: 'aqua1', land: 'aqua', name: 'Buy the Fish Pond', who: 'finn', xp: 10, needs: [{ own: 'aqua' }],
      line: 'Your pond!' },
    // Muddy Shore: tyres, bottles and sticks in brown water.
    { id: 'aqua2', land: 'aqua', zone: 'muddyshore', at: [35, 38], look: ['🛞', ''], after: ['aqua1'],
      name: 'Fish out the old tyre', who: 'finn', xp: 10, needs: [{ item: 'fishing', tier: 3, n: 1 }], line: 'Gross! Gone!' },
    { id: 'aqua6', land: 'aqua', zone: 'muddyshore', at: [50, 54], look: ['🥫', ''], after: ['aqua1'],
      name: 'Pick up the bottles and cans', who: 'finn', xp: 10, needs: [{ item: 'clean', tier: 1, n: 2 }], line: 'Much better!' },
    { id: 'aqua7', land: 'aqua', zone: 'muddyshore', at: [70, 32], look: ['🪵', ''], after: ['aqua2'],
      name: 'Clear the floating sticks', who: 'ruby', xp: 10, needs: [{ item: 'garden', tier: 0, n: 2 }, { item: 'aqua', tier: 0, n: 2 }], line: 'Clear water!' },
    { id: 'aqua8', land: 'aqua', zone: 'muddyshore', at: [85, 66], look: ['🛞', ''], after: ['aqua6'],
      name: 'Haul out the big tyre', who: 'ruby', xp: 11, needs: [{ item: 'fishing', tier: 2, n: 2 }], line: 'Heave!' },
    { id: 'aqua9', land: 'aqua', zone: 'muddyshore', at: [12, 30], look: ['🌾', '🌾'], after: ['aqua7'],
      name: 'Trim the reeds', who: 'hattie', xp: 11, needs: [{ item: 'garden', tier: 2, n: 1 }], line: 'Neat reeds!' },
    { id: 'aqua10', land: 'aqua', zone: 'muddyshore', at: [15, 66], look: ['🪨', '🪨'], after: ['aqua8'],
      name: 'Scrub the slimy rocks', who: 'finn', xp: 12, needs: [{ item: 'clean', tier: 3, n: 1 }], line: 'No more slime!' },
    { id: 'aqua11', land: 'aqua', zone: 'muddyshore', at: [50, 76], look: ['🟫', '🪨'], after: ['aqua9', 'aqua10'],
      name: 'Rake the pebble shore', who: 'hattie', xp: 12, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'aqua', tier: 1, n: 2 }], line: 'Smooth!' },
    { id: 'aqua3', land: 'aqua', zone: 'muddyshore', at: [28, 67], look: ['', '🐸'], after: ['aqua11'], name: 'Welcome the frogs', who: 'finn', xp: 13, needs: [{ item: 'aqua', tier: 3, n: 2 }], line: 'Ribbit!' },
    { id: 'aqua12', land: 'aqua', zone: 'muddyshore', at: [58, 70], look: ['', '🎣'], after: ['aqua3', 'aqua45', 'aqua46'], reward: { chest: 'brown' },
      name: 'Set up a fishing spot', who: 'finn', xp: 14, needs: [{ item: 'fishing', tier: 4, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'Gone fishing!' },
    // Lily Pond: the willow's pond, its bridge broken and its water murky.
    { id: 'aqua13', land: 'aqua', zone: 'lilypond', at: [70, 62], look: ['🗑️', ''],
      name: 'Fish out the floating junk', who: 'finn', xp: 13, needs: [{ item: 'fishing', tier: 3, n: 1 }], line: 'Got it!' },
    { id: 'aqua14', land: 'aqua', zone: 'lilypond', at: [30, 58], look: ['🍂', ''],
      name: 'Clear the dead lily pads', who: 'hattie', xp: 13, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Fresh start!' },
    { id: 'aqua15', land: 'aqua', zone: 'lilypond', at: [42, 45], look: ['🧱', '🌉'], after: ['aqua13'],
      name: 'Rebuild the stone bridge', who: 'ruby', xp: 14, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'Over we go!' },
    { id: 'aqua16', land: 'aqua', zone: 'lilypond', at: [20, 80], look: ['🪨', '🪨'], after: ['aqua14'],
      name: 'Straighten the pond stones', who: 'ruby', xp: 14, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'clean', tier: 2, n: 1 }], line: 'All lined up!' },
    { id: 'aqua17', land: 'aqua', zone: 'lilypond', at: [52, 72], look: ['🟢', '💧'], after: ['aqua16'],
      name: 'Clear the murky water', who: 'finn', xp: 15, needs: [{ item: 'clean', tier: 4, n: 1 }, { item: 'aqua', tier: 2, n: 2 }], line: 'Crystal clear!' },
    { id: 'aqua18', land: 'aqua', zone: 'lilypond', at: [58, 34], look: ['', '🪷'], after: ['aqua15'],
      name: 'Plant pink lotus', who: 'poppy', xp: 15, needs: [{ item: 'aqua', tier: 3, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'So pink!' },
    { id: 'aqua4', land: 'aqua', zone: 'lilypond', at: [38, 70], look: ['🫧', '🐠'], after: ['aqua17'],
      name: 'Release the goldfish', who: 'finn', xp: 16, needs: [{ item: 'aqua', tier: 4, n: 2 }], line: 'So shiny!' },
    { id: 'aqua19', land: 'aqua', zone: 'lilypond', at: [82, 50], look: ['', '🏮'], after: ['aqua18'],
      name: 'Hang lanterns on the bridge', who: 'ruby', xp: 16, needs: [{ item: 'fishing', tier: 2, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Glowing!' },
    { id: 'aqua20', land: 'aqua', zone: 'lilypond', at: [32, 74], look: ['', '🎏'], after: ['aqua4', 'aqua19', 'aqua63', 'aqua64'], reward: { chest: 'blue' },
      name: 'Welcome the koi', who: 'finn', xp: 18, needs: [{ item: 'aqua', tier: 5, n: 1 }], line: 'Beautiful!' },
    // Boat Dock: missing planks, tangled nets and a sunken rowboat.
    { id: 'aqua21', land: 'aqua', zone: 'boatdock', at: [62, 36], look: ['🕸️', ''], name: 'Untangle the fishing nets', who: 'finn', xp: 15, needs: [{ item: 'garden', tier: 2, n: 1 }, { item: 'fishing', tier: 1, n: 2 }], line: 'Untangled!' },
    { id: 'aqua22', land: 'aqua', zone: 'boatdock', at: [25, 15], look: ['🪧', '🪧'],
      name: 'Put the fallen sign back up', who: 'ruby', xp: 15, needs: [{ item: 'wood', tier: 2, n: 1 }, { item: 'tools', tier: 1, n: 1 }], line: 'Welcome!' },
    { id: 'aqua23', land: 'aqua', zone: 'boatdock', at: [60, 58], look: ['🕳️', '🪵'], after: ['aqua21'],
      name: 'Replace the missing planks', who: 'ruby', xp: 16, needs: [{ item: 'wood', tier: 4, n: 2 }], line: 'Mind the gap!' },
    { id: 'aqua24', land: 'aqua', zone: 'boatdock', at: [80, 75], look: ['🕸️', ''], after: ['aqua22'],
      name: 'Pull the nets out of the water', who: 'finn', xp: 16, needs: [{ item: 'fishing', tier: 3, n: 1 }], line: 'Heave!' },
    { id: 'aqua25', land: 'aqua', zone: 'boatdock', at: [22, 50], look: ['🛶', '🛶'], after: ['aqua23'],
      name: 'Raise the sunken rowboat', who: 'finn', xp: 17, needs: [{ item: 'fishing', tier: 5, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'She floats!' },
    { id: 'aqua26', land: 'aqua', zone: 'boatdock', at: [75, 12], look: ['🏚️', '🏠'], after: ['aqua24'],
      name: 'Paint the boathouse', who: 'ruby', xp: 17, needs: [{ item: 'clean', tier: 4, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Fresh paint!' },
    { id: 'aqua27', land: 'aqua', zone: 'boatdock', at: [55, 38], look: ['', '🛟'], after: ['aqua25'],
      name: 'Hang a life ring', who: 'finn', xp: 18, needs: [{ item: 'fishing', tier: 6, n: 1 }], line: 'Safety first!' },
    { id: 'aqua28', land: 'aqua', zone: 'boatdock', at: [86, 48], look: ['', '🏮'], after: ['aqua26', 'aqua27'],
      name: 'Light the dock lanterns', who: 'ruby', xp: 18, needs: [{ item: 'tools', tier: 5, n: 1 }, { item: 'wood', tier: 5, n: 1 }], line: 'So bright!' },
    { id: 'aqua5', land: 'aqua', zone: 'boatdock', at: [35, 55], look: ['', '⛵'], after: ['aqua28', 'aqua81', 'aqua82'], reward: { chest: 'blue' },
      name: 'Take the rowboat out', who: 'finn', xp: 22, needs: [{ item: 'aqua', tier: 7, n: 1 }, { item: 'fishing', tier: 7, n: 1 }], line: 'Ahoy!' },
    // Flower Garden (day 5)
    { id: 'flower1', land: 'flower', name: 'Buy the Flower Garden', who: 'poppy', xp: 15, needs: [{ own: 'flower' }],
      line: 'A garden!' },
    // Garden Gate: a broken picket fence, empty beds and smashed pots.
    { id: 'flower6', land: 'flower', zone: 'gardengate', at: [47, 48], look: ['🏺', ''], after: ['flower1'],
      name: 'Pick up the broken pots', who: 'poppy', xp: 16, needs: [{ item: 'clean', tier: 1, n: 2 }], line: 'Tidy!' },
    { id: 'flower7', land: 'flower', zone: 'gardengate', at: [20, 24], look: ['🚧', '🪵'], after: ['flower1'],
      name: 'Mend the picket fence', who: 'ruby', xp: 16, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'White and neat!' },
    { id: 'flower8', land: 'flower', zone: 'gardengate', at: [78, 25], look: ['🚪', '🚪'], after: ['flower7'],
      name: 'Hang the gate back on', who: 'ruby', xp: 17, needs: [{ item: 'tools', tier: 3, n: 1 }], line: 'Squeak, click!' },
    { id: 'flower9', land: 'flower', zone: 'gardengate', at: [25, 58], look: ['🌿', ''], after: ['flower6'],
      name: 'Pull the weeds from the beds', who: 'hattie', xp: 17, needs: [{ item: 'garden', tier: 1, n: 2 }], line: 'Weed-free!' },
    { id: 'flower10', land: 'flower', zone: 'gardengate', at: [45, 76], look: ['🟫', '🟫'], after: ['flower9'],
      name: 'Dig over the beds', who: 'hattie', xp: 18, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'fert', tier: 3, n: 1 }], line: 'Soft soil!' },
    { id: 'flower2', land: 'flower', zone: 'gardengate', at: [32, 40], look: ['🕳️', '🌼'], after: ['flower10'],
      name: 'Plant a row of daisies', who: 'poppy', xp: 18, needs: [{ item: 'flower', tier: 3, n: 3 }], line: 'Daisies!' },
    { id: 'flower3', land: 'flower', zone: 'gardengate', at: [72, 68], look: ['🌱', '🌷'], after: ['flower10'],
      name: 'Grow tulips for the Mayor', who: 'mayor', xp: 19, needs: [{ item: 'flower', tier: 4, n: 2 }], line: 'My favourite!' },
    { id: 'flower11', land: 'flower', zone: 'gardengate', at: [52, 27], look: ['', '🚿'], after: ['flower8'],
      name: 'Fill the watering can', who: 'poppy', xp: 18, needs: [{ item: 'flower', tier: 0, n: 4 }], line: 'Splash!' },
    { id: 'flower12', land: 'flower', zone: 'gardengate', at: [82, 20], look: ['', '🪑'], after: ['flower2', 'flower3', 'flower11', 'flower46', 'flower47'], reward: { chest: 'brown' },
      name: 'Build a welcome bench', who: 'ruby', xp: 20, needs: [{ item: 'wood', tier: 5, n: 1 }], line: 'Come sit!' },
    // Rose Arch: a bare arch, dead thorny stems and a dry fountain.
    { id: 'flower13', land: 'flower', zone: 'rosearch', at: [15, 62], look: ['🥀', ''], name: 'Cut back the dead stems', who: 'poppy', xp: 19, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Snip snip!' },
    { id: 'flower14', land: 'flower', zone: 'rosearch', at: [40, 88], look: ['🌵', ''],
      name: 'Clear the thorny brambles', who: 'hattie', xp: 19, needs: [{ item: 'garden', tier: 4, n: 1 }], line: 'Ouch! Done!' },
    { id: 'flower15', land: 'flower', zone: 'rosearch', at: [85, 56], look: ['⛲', '⛲'], after: ['flower14'],
      name: 'Fix the cracked fountain', who: 'ruby', xp: 20, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'clean', tier: 3, n: 1 }], line: 'No more cracks!' },
    { id: 'flower4', land: 'flower', zone: 'rosearch', at: [35, 15], look: ['🪵', '🌹'], after: ['flower13'],
      name: 'Repair the rose arch', who: 'ruby', xp: 20, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'Fancy!' },
    { id: 'flower17', land: 'flower', zone: 'rosearch', at: [20, 40], look: ['', '🌹'], after: ['flower4'],
      name: 'Plant climbing roses', who: 'poppy', xp: 21, needs: [{ item: 'flower', tier: 5, n: 1 }], line: 'Climb, roses!' },
    { id: 'flower18', land: 'flower', zone: 'rosearch', at: [50, 70], look: ['🍂', '🟫'], after: ['flower15'],
      name: 'Sweep the brick path', who: 'poppy', xp: 21, needs: [{ item: 'clean', tier: 4, n: 1 }], line: 'Swept!' },
    { id: 'flower19', land: 'flower', zone: 'rosearch', at: [88, 44], look: ['', '💧'], after: ['flower18'],
      name: 'Fill the fountain', who: 'finn', xp: 22, needs: [{ item: 'flower', tier: 0, n: 4 }, { item: 'aqua', tier: 3, n: 1 }], line: 'Splish splash!' },
    { id: 'flower20', land: 'flower', zone: 'rosearch', at: [70, 25], look: ['', '🌹'], after: ['flower17'],
      name: 'Train roses over the arch', who: 'poppy', xp: 22, needs: [{ item: 'flower', tier: 5, n: 2 }, { item: 'garden', tier: 4, n: 1 }], line: 'Gorgeous!' },
    { id: 'flower21', land: 'flower', zone: 'rosearch', at: [45, 60], look: ['', '🌸'], after: ['flower19', 'flower20', 'flower64', 'flower65'], reward: { chest: 'blue' },
      name: 'Scatter rose petals', who: 'poppy', xp: 23, needs: [{ item: 'flower', tier: 6, n: 1 }], line: 'Romantic!' },
    // Greenhouse: broken panes, toppled tables and cracked pots.
    { id: 'flower22', land: 'flower', zone: 'greenhouse', at: [50, 85], look: ['🔪', ''], name: 'Sweep up the broken glass', who: 'poppy', xp: 22, needs: [{ item: 'clean', tier: 4, n: 1 }], line: 'Safe now!' },
    { id: 'flower23', land: 'flower', zone: 'greenhouse', at: [20, 60], look: ['🌿', ''],
      name: 'Pull the weeds inside', who: 'hattie', xp: 22, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Out you go!' },
    { id: 'flower24', land: 'flower', zone: 'greenhouse', at: [50, 22], look: ['🪟', '🪟'], after: ['flower22'],
      name: 'Replace the glass panes', who: 'ruby', xp: 24, needs: [{ item: 'tools', tier: 5, n: 1 }, { item: 'clean', tier: 3, n: 1 }], line: 'Sparkling!' },
    { id: 'flower25', land: 'flower', zone: 'greenhouse', at: [75, 54], look: ['🪵', '🪑'], after: ['flower23'],
      name: 'Stand the tables up', who: 'ruby', xp: 24, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'Upright!' },
    { id: 'flower26', land: 'flower', zone: 'greenhouse', at: [30, 72], look: ['🏺', '🪴'], after: ['flower25'],
      name: 'Replace the cracked pots', who: 'hattie', xp: 25, needs: [{ item: 'fert', tier: 4, n: 2 }], line: 'Fresh pots!' },
    { id: 'flower27', land: 'flower', zone: 'greenhouse', at: [15, 32], look: ['', '🧺'], after: ['flower24'],
      name: 'Hang flower baskets', who: 'poppy', xp: 25, needs: [{ item: 'flower', tier: 5, n: 1 }, { item: 'decor', tier: 1, n: 1 }], line: 'Hanging high!' },
    { id: 'flower28', land: 'flower', zone: 'greenhouse', at: [80, 45], look: ['', '🌺'], after: ['flower26'],
      name: 'Grow lilies and orchids', who: 'poppy', xp: 26, needs: [{ item: 'flower', tier: 7, n: 1 }], line: 'Exquisite!' },
    { id: 'flower29', land: 'flower', zone: 'greenhouse', at: [50, 15], look: ['', '💡'], after: ['flower27'],
      name: 'String the fairy lights', who: 'ruby', xp: 26, needs: [{ item: 'decor', tier: 4, n: 1 }], line: 'Twinkle!' },
    { id: 'flower5', land: 'flower', zone: 'greenhouse', at: [50, 48], look: ['🥀', '💐'], after: ['flower28', 'flower29', 'flower82', 'flower83'], reward: { chest: 'blue' },
      name: 'Plant the festival garden', who: 'poppy', xp: 30, needs: [{ item: 'flower', tier: 8, n: 1 }, { item: 'decor', tier: 5, n: 1 }], line: 'Party ready!' },
    // More for every area (about 27 each): jobs that use all three of each land's
    // producers, in two threads that open after the area's first job; each
    // area's own finale still comes last.
    // barnyard
    { id: 'barn12', land: 'barn', zone: 'barnyard', at: [42, 24], look: ['🔨', '✨'], after: ['barn1'],
      name: 'Shear the old ewe', who: 'ruby', xp: 2, needs: [{ item: 'wool', tier: 1, n: 2 }], line: 'Lovely!' },
    { id: 'barn13', land: 'barn', zone: 'barnyard', at: [56, 49], look: ['🔨', '✨'], after: ['barn1'],
      name: 'Spin the first yarn', who: 'hattie', xp: 2, needs: [{ item: 'barn', tier: 1, n: 2 }], line: 'Perfect!' },
    { id: 'barn14', land: 'barn', zone: 'barnyard', at: [42, 74], look: ['🔨', '✨'], after: ['barn12'],
      name: 'Knit a cover for the pump', who: 'mayor', xp: 2, needs: [{ item: 'tools', tier: 1, n: 1 }, { item: 'wool', tier: 0, n: 2 }], line: 'So cozy!' },
    { id: 'barn15', land: 'barn', zone: 'barnyard', at: [84, 64], look: ['🔨', '✨'], after: ['barn13'],
      name: 'Hang a wool wreath on the barn', who: 'ruby', xp: 2, needs: [{ item: 'wool', tier: 1, n: 1 }, { item: 'barn', tier: 1, n: 1 }], line: 'Great work!' },
    { id: 'barn16', land: 'barn', zone: 'barnyard', at: [42, 39], look: ['🔨', '✨'], after: ['barn14'],
      name: 'Scrub the feed troughs', who: 'hattie', xp: 2, needs: [{ item: 'wool', tier: 2, n: 1 }], line: 'Just right!' },
    { id: 'barn17', land: 'barn', zone: 'barnyard', at: [56, 64], look: ['🔨', '✨'], after: ['barn15'],
      name: 'Oil the barn door hinges', who: 'mayor', xp: 2, needs: [{ item: 'wool', tier: 1, n: 1 }, { item: 'tools', tier: 1, n: 1 }], line: 'Wonderful!' },
    { id: 'barn18', land: 'barn', zone: 'barnyard', at: [84, 39], look: ['🔨', '✨'], after: ['barn16'],
      name: 'Patch the wheelbarrow tyre', who: 'ruby', xp: 2, needs: [{ item: 'wool', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'barn19', land: 'barn', zone: 'barnyard', at: [84, 24], look: ['🔨', '✨'], after: ['barn17'],
      name: 'Knit the scarecrow a scarf', who: 'hattie', xp: 2, needs: [{ item: 'barn', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'barn20', land: 'barn', zone: 'barnyard', at: [28, 29], look: ['🔨', '✨'], after: ['barn18'], reward: { chest: 'brown' },
      name: 'Sweep the cobbles', who: 'mayor', xp: 2, needs: [{ item: 'tools', tier: 1, n: 1 }, { item: 'wool', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Beautiful!' },
    { id: 'barn21', land: 'barn', zone: 'barnyard', at: [70, 44], look: ['🔨', '✨'], after: ['barn19'],
      name: 'Stack the firewood neatly', who: 'ruby', xp: 2, needs: [{ item: 'wool', tier: 2, n: 1 }, { item: 'barn', tier: 1, n: 1 }], line: 'Thank you!' },
    { id: 'barn22', land: 'barn', zone: 'barnyard', at: [70, 59], look: ['🔨', '✨'], after: ['barn20'],
      name: 'Paint the fence posts', who: 'hattie', xp: 2, needs: [{ item: 'wool', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'barn23', land: 'barn', zone: 'barnyard', at: [56, 79], look: ['🔨', '✨'], after: ['barn21'],
      name: 'Fill the water buckets', who: 'mayor', xp: 2, needs: [{ item: 'wool', tier: 2, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Perfect!' },
    { id: 'barn24', land: 'barn', zone: 'barnyard', at: [14, 24], look: ['🔨', '✨'], after: ['barn22'],
      name: 'Plant marigolds by the fence', who: 'ruby', xp: 2, needs: [{ item: 'wool', tier: 2, n: 2 }], line: 'So cozy!' },
    { id: 'barn25', land: 'barn', zone: 'barnyard', at: [42, 84], look: ['🔨', '✨'], after: ['barn23'],
      name: 'Hang a bird feeder', who: 'hattie', xp: 2, needs: [{ item: 'barn', tier: 2, n: 2 }], line: 'Great work!' },
    { id: 'barn26', land: 'barn', zone: 'barnyard', at: [70, 89], look: ['🔨', '✨'], after: ['barn24'],
      name: 'Knit blankets for the calves', who: 'mayor', xp: 2, needs: [{ item: 'tools', tier: 1, n: 1 }, { item: 'wool', tier: 0, n: 2 }], line: 'Just right!' },
    { id: 'barn27', land: 'barn', zone: 'barnyard', at: [56, 34], look: ['🔨', '✨'], after: ['barn25'],
      name: 'Set a bench by the barn', who: 'ruby', xp: 2, needs: [{ item: 'wool', tier: 2, n: 1 }, { item: 'barn', tier: 2, n: 1 }], line: 'Wonderful!' },
    { id: 'barn28', land: 'barn', zone: 'barnyard', at: [28, 69], look: ['🔨', '✨'], after: ['barn26'],
      name: 'Hang bunting over the doors', who: 'hattie', xp: 2, needs: [{ item: 'wool', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'barn29', land: 'barn', zone: 'barnyard', at: [28, 39], look: ['🔨', '✨'], after: ['barn27'], reward: { chest: 'blue' },
      name: 'Knit a welcome mat', who: 'mayor', xp: 3, needs: [{ item: 'wool', tier: 2, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Hooray!' },
    // henhouse
    { id: 'barn30', land: 'barn', zone: 'henhouse', at: [28, 24], look: ['🔨', '✨'], after: ['hen1'],
      name: 'Line the nests with wool', who: 'ruby', xp: 3, needs: [{ item: 'wool', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'barn31', land: 'barn', zone: 'henhouse', at: [84, 24], look: ['🔨', '✨'], after: ['hen1'],
      name: 'Scrub the hen house walls', who: 'hattie', xp: 3, needs: [{ item: 'barn', tier: 3, n: 2 }], line: 'Beautiful!' },
    { id: 'barn32', land: 'barn', zone: 'henhouse', at: [70, 64], look: ['🔨', '✨'], after: ['barn30'],
      name: 'Fix the hen house latch', who: 'mayor', xp: 3, needs: [{ item: 'tools', tier: 2, n: 1 }, { item: 'wool', tier: 1, n: 2 }], line: 'Thank you!' },
    { id: 'barn33', land: 'barn', zone: 'henhouse', at: [14, 89], look: ['🔨', '✨'], after: ['barn31'],
      name: 'Scatter fresh grain', who: 'ruby', xp: 3, needs: [{ item: 'wool', tier: 3, n: 1 }, { item: 'barn', tier: 2, n: 1 }], line: 'Lovely!' },
    { id: 'barn34', land: 'barn', zone: 'henhouse', at: [56, 79], look: ['🔨', '✨'], after: ['barn32'],
      name: 'Knit tiny hen jumpers', who: 'hattie', xp: 3, needs: [{ item: 'wool', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'barn35', land: 'barn', zone: 'henhouse', at: [42, 34], look: ['🔨', '✨'], after: ['barn33'],
      name: 'Mend the chicken ramp', who: 'mayor', xp: 3, needs: [{ item: 'wool', tier: 3, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'barn36', land: 'barn', zone: 'henhouse', at: [42, 54], look: ['🔨', '✨'], after: ['barn34'],
      name: 'Paint the hen house trim', who: 'ruby', xp: 3, needs: [{ item: 'wool', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'barn37', land: 'barn', zone: 'henhouse', at: [84, 39], look: ['🔨', '✨'], after: ['barn35'],
      name: 'Fill the dust bath', who: 'hattie', xp: 3, needs: [{ item: 'barn', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'barn38', land: 'barn', zone: 'henhouse', at: [14, 29], look: ['🔨', '✨'], after: ['barn36'], reward: { chest: 'brown' },
      name: 'Hang a hen house lamp', who: 'mayor', xp: 4, needs: [{ item: 'tools', tier: 2, n: 1 }, { item: 'wool', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Wonderful!' },
    { id: 'barn39', land: 'barn', zone: 'henhouse', at: [28, 49], look: ['🔨', '✨'], after: ['barn37'],
      name: 'Build a roosting bar', who: 'ruby', xp: 4, needs: [{ item: 'wool', tier: 3, n: 1 }, { item: 'barn', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'barn40', land: 'barn', zone: 'henhouse', at: [70, 44], look: ['🔨', '✨'], after: ['barn38'],
      name: 'Collect the morning eggs', who: 'hattie', xp: 4, needs: [{ item: 'wool', tier: 4, n: 1 }], line: 'Hooray!' },
    { id: 'barn41', land: 'barn', zone: 'henhouse', at: [14, 79], look: ['🔨', '✨'], after: ['barn39'],
      name: 'Weave an egg basket', who: 'mayor', xp: 4, needs: [{ item: 'wool', tier: 3, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'barn42', land: 'barn', zone: 'henhouse', at: [70, 74], look: ['🔨', '✨'], after: ['barn40'],
      name: 'Fence off the veg patch', who: 'ruby', xp: 4, needs: [{ item: 'wool', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'barn43', land: 'barn', zone: 'henhouse', at: [70, 54], look: ['🔨', '✨'], after: ['barn41'],
      name: 'Plant a shady bush', who: 'hattie', xp: 4, needs: [{ item: 'barn', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'barn44', land: 'barn', zone: 'henhouse', at: [42, 74], look: ['🔨', '✨'], after: ['barn42'],
      name: 'Knit a tea cosy for Bram', who: 'mayor', xp: 4, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wool', tier: 2, n: 2 }], line: 'Perfect!' },
    { id: 'barn45', land: 'barn', zone: 'henhouse', at: [56, 89], look: ['🔨', '✨'], after: ['barn43'],
      name: 'Make a chick nursery', who: 'ruby', xp: 4, needs: [{ item: 'wool', tier: 4, n: 1 }, { item: 'barn', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'barn46', land: 'barn', zone: 'henhouse', at: [84, 89], look: ['🔨', '✨'], after: ['barn44'],
      name: 'Hang a weather vane', who: 'hattie', xp: 4, needs: [{ item: 'wool', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'barn47', land: 'barn', zone: 'henhouse', at: [84, 59], look: ['🔨', '✨'], after: ['barn45'], reward: { chest: 'blue' },
      name: 'Throw a hen party', who: 'mayor', xp: 4, needs: [{ item: 'wool', tier: 4, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Just right!' },
    // bigbarn
    { id: 'barn48', land: 'barn', zone: 'bigbarn', at: [84, 44], look: ['🔨', '✨'], after: ['big1'],
      name: 'Wipe down the shelves', who: 'ruby', xp: 5, needs: [{ item: 'wool', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'barn49', land: 'barn', zone: 'bigbarn', at: [14, 54], look: ['🔨', '✨'], after: ['big1'],
      name: 'Label the jars', who: 'hattie', xp: 5, needs: [{ item: 'barn', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'barn50', land: 'barn', zone: 'bigbarn', at: [42, 24], look: ['🔨', '✨'], after: ['barn48'],
      name: 'Knit covers for the stools', who: 'mayor', xp: 6, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wool', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'barn51', land: 'barn', zone: 'bigbarn', at: [84, 84], look: ['🔨', '✨'], after: ['barn49'],
      name: 'Sort the seed sacks', who: 'ruby', xp: 6, needs: [{ item: 'wool', tier: 4, n: 1 }, { item: 'barn', tier: 4, n: 1 }], line: 'Hooray!' },
    { id: 'barn52', land: 'barn', zone: 'bigbarn', at: [42, 39], look: ['🔨', '✨'], after: ['barn50'],
      name: 'Fix the creaky floorboard', who: 'hattie', xp: 6, needs: [{ item: 'wool', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'barn53', land: 'barn', zone: 'bigbarn', at: [84, 24], look: ['🔨', '✨'], after: ['barn51'],
      name: 'Hang herbs to dry', who: 'mayor', xp: 6, needs: [{ item: 'wool', tier: 4, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'barn54', land: 'barn', zone: 'bigbarn', at: [28, 89], look: ['🔨', '✨'], after: ['barn52'],
      name: 'Oil the old scales', who: 'ruby', xp: 6, needs: [{ item: 'wool', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'barn55', land: 'barn', zone: 'bigbarn', at: [56, 79], look: ['🔨', '✨'], after: ['barn53'],
      name: 'Mend the curtains', who: 'hattie', xp: 6, needs: [{ item: 'barn', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'barn56', land: 'barn', zone: 'bigbarn', at: [56, 49], look: ['🔨', '✨'], after: ['barn54'], reward: { chest: 'brown' },
      name: 'Stack the crates by size', who: 'mayor', xp: 6, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'wool', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'So cozy!' },
    { id: 'barn57', land: 'barn', zone: 'bigbarn', at: [14, 24], look: ['🔨', '✨'], after: ['barn55'],
      name: 'Polish the brass lamp', who: 'ruby', xp: 7, needs: [{ item: 'wool', tier: 5, n: 1 }, { item: 'barn', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'barn58', land: 'barn', zone: 'bigbarn', at: [14, 69], look: ['🔨', '✨'], after: ['barn56'],
      name: 'Knit a cushion for the bench', who: 'hattie', xp: 7, needs: [{ item: 'wool', tier: 6, n: 1 }], line: 'Just right!' },
    { id: 'barn59', land: 'barn', zone: 'bigbarn', at: [28, 29], look: ['🔨', '✨'], after: ['barn57'],
      name: 'Air out the blankets', who: 'mayor', xp: 7, needs: [{ item: 'wool', tier: 5, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'barn60', land: 'barn', zone: 'bigbarn', at: [28, 44], look: ['🔨', '✨'], after: ['barn58'],
      name: 'Sweep the cobwebs', who: 'ruby', xp: 7, needs: [{ item: 'wool', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'barn61', land: 'barn', zone: 'bigbarn', at: [28, 64], look: ['🔨', '✨'], after: ['barn59'],
      name: 'Fix the window latch', who: 'hattie', xp: 7, needs: [{ item: 'barn', tier: 6, n: 1 }], line: 'Hooray!' },
    { id: 'barn62', land: 'barn', zone: 'bigbarn', at: [42, 84], look: ['🔨', '✨'], after: ['barn60'],
      name: 'Hang a notice board', who: 'mayor', xp: 7, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'wool', tier: 3, n: 2 }], line: 'Beautiful!' },
    { id: 'barn63', land: 'barn', zone: 'bigbarn', at: [56, 64], look: ['🔨', '✨'], after: ['barn61'],
      name: 'Restock the twine', who: 'ruby', xp: 7, needs: [{ item: 'wool', tier: 5, n: 1 }, { item: 'barn', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'barn64', land: 'barn', zone: 'bigbarn', at: [70, 54], look: ['🔨', '✨'], after: ['barn62'],
      name: 'Knit a rug runner', who: 'hattie', xp: 8, needs: [{ item: 'wool', tier: 6, n: 1 }], line: 'Lovely!' },
    { id: 'barn65', land: 'barn', zone: 'bigbarn', at: [84, 34], look: ['🔨', '✨'], after: ['barn63'], reward: { chest: 'blue' },
      name: 'Light the storeroom lamp', who: 'mayor', xp: 8, needs: [{ item: 'wool', tier: 5, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'Perfect!' },
    // fieldgate
    { id: 'farm29', land: 'farm', zone: 'fieldgate', at: [84, 24], look: ['🔨', '✨'], after: ['farm2'],
      name: 'Sow the first seeds', who: 'hattie', xp: 3, needs: [{ item: 'seeds', tier: 1, n: 2 }], line: 'Perfect!' },
    { id: 'farm30', land: 'farm', zone: 'fieldgate', at: [28, 89], look: ['🔨', '✨'], after: ['farm2'],
      name: 'Clear the ditch', who: 'ruby', xp: 3, needs: [{ item: 'farm', tier: 1, n: 2 }], line: 'So cozy!' },
    { id: 'farm31', land: 'farm', zone: 'fieldgate', at: [14, 54], look: ['🔨', '✨'], after: ['farm29'],
      name: 'Plant a hedge', who: 'poppy', xp: 3, needs: [{ item: 'garden', tier: 1, n: 1 }, { item: 'seeds', tier: 0, n: 2 }], line: 'Great work!' },
    { id: 'farm32', land: 'farm', zone: 'fieldgate', at: [56, 34], look: ['🔨', '✨'], after: ['farm30'],
      name: 'Mend the scarecrow\'s hat', who: 'hattie', xp: 4, needs: [{ item: 'seeds', tier: 1, n: 1 }, { item: 'farm', tier: 1, n: 1 }], line: 'Just right!' },
    { id: 'farm33', land: 'farm', zone: 'fieldgate', at: [14, 39], look: ['🔨', '✨'], after: ['farm31'],
      name: 'Oil the gate hinges', who: 'ruby', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 1 }], line: 'Wonderful!' },
    { id: 'farm34', land: 'farm', zone: 'fieldgate', at: [42, 59], look: ['🔨', '✨'], after: ['farm32'],
      name: 'Fill the seed cart', who: 'poppy', xp: 4, needs: [{ item: 'seeds', tier: 1, n: 1 }, { item: 'garden', tier: 1, n: 1 }], line: 'Looks great!' },
    { id: 'farm35', land: 'farm', zone: 'fieldgate', at: [84, 39], look: ['🔨', '✨'], after: ['farm33'],
      name: 'Rake the track', who: 'hattie', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'farm36', land: 'farm', zone: 'fieldgate', at: [42, 79], look: ['🔨', '✨'], after: ['farm34'],
      name: 'Plant sunflowers by the gate', who: 'ruby', xp: 4, needs: [{ item: 'farm', tier: 2, n: 2 }], line: 'Beautiful!' },
    { id: 'farm37', land: 'farm', zone: 'fieldgate', at: [84, 59], look: ['🔨', '✨'], after: ['farm35'], reward: { chest: 'brown' },
      name: 'Fix the shed roof', who: 'poppy', xp: 4, needs: [{ item: 'garden', tier: 1, n: 1 }, { item: 'seeds', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Thank you!' },
    { id: 'farm38', land: 'farm', zone: 'fieldgate', at: [28, 69], look: ['🔨', '✨'], after: ['farm36'],
      name: 'Hang the shed door', who: 'hattie', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 1 }, { item: 'farm', tier: 1, n: 1 }], line: 'Lovely!' },
    { id: 'farm39', land: 'farm', zone: 'fieldgate', at: [14, 84], look: ['🔨', '✨'], after: ['farm37'],
      name: 'Sort the seed packets', who: 'ruby', xp: 4, needs: [{ item: 'seeds', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'farm40', land: 'farm', zone: 'fieldgate', at: [56, 54], look: ['🔨', '✨'], after: ['farm38'],
      name: 'Water the seedlings', who: 'poppy', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'So cozy!' },
    { id: 'farm41', land: 'farm', zone: 'fieldgate', at: [70, 29], look: ['🔨', '✨'], after: ['farm39'],
      name: 'Weed the verge', who: 'hattie', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 2 }], line: 'Great work!' },
    { id: 'farm42', land: 'farm', zone: 'fieldgate', at: [56, 44], look: ['🔨', '✨'], after: ['farm40'],
      name: 'Build a compost heap', who: 'ruby', xp: 5, needs: [{ item: 'farm', tier: 2, n: 2 }], line: 'Just right!' },
    { id: 'farm43', land: 'farm', zone: 'fieldgate', at: [56, 84], look: ['🔨', '✨'], after: ['farm41'],
      name: 'Paint the shed green', who: 'poppy', xp: 5, needs: [{ item: 'garden', tier: 1, n: 1 }, { item: 'seeds', tier: 0, n: 2 }], line: 'Wonderful!' },
    { id: 'farm44', land: 'farm', zone: 'fieldgate', at: [84, 84], look: ['🔨', '✨'], after: ['farm42'],
      name: 'Put up a rain gauge', who: 'hattie', xp: 5, needs: [{ item: 'seeds', tier: 2, n: 1 }, { item: 'farm', tier: 2, n: 1 }], line: 'Looks great!' },
    { id: 'farm45', land: 'farm', zone: 'fieldgate', at: [70, 64], look: ['🔨', '✨'], after: ['farm43'],
      name: 'Plant a pumpkin patch', who: 'ruby', xp: 5, needs: [{ item: 'seeds', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'farm46', land: 'farm', zone: 'fieldgate', at: [42, 24], look: ['🔨', '✨'], after: ['farm44'], reward: { chest: 'blue' },
      name: 'Hang a fresh veg sign', who: 'poppy', xp: 5, needs: [{ item: 'seeds', tier: 2, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'Beautiful!' },
    // berryrows
    { id: 'farm47', land: 'farm', zone: 'berryrows', at: [14, 29], look: ['🔨', '✨'], after: ['farm11'],
      name: 'Plant strawberry runners', who: 'hattie', xp: 5, needs: [{ item: 'seeds', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'farm48', land: 'farm', zone: 'berryrows', at: [84, 24], look: ['🔨', '✨'], after: ['farm11'],
      name: 'Lay straw paths', who: 'ruby', xp: 5, needs: [{ item: 'farm', tier: 3, n: 2 }], line: 'Thank you!' },
    { id: 'farm49', land: 'farm', zone: 'berryrows', at: [56, 74], look: ['🔨', '✨'], after: ['farm47'],
      name: 'Build a cold frame', who: 'poppy', xp: 5, needs: [{ item: 'garden', tier: 2, n: 1 }, { item: 'seeds', tier: 1, n: 2 }], line: 'Lovely!' },
    { id: 'farm50', land: 'farm', zone: 'berryrows', at: [14, 79], look: ['🔨', '✨'], after: ['farm48'],
      name: 'Fix the watering pipe', who: 'hattie', xp: 5, needs: [{ item: 'seeds', tier: 3, n: 1 }, { item: 'farm', tier: 2, n: 1 }], line: 'Perfect!' },
    { id: 'farm51', land: 'farm', zone: 'berryrows', at: [84, 44], look: ['🔨', '✨'], after: ['farm49'],
      name: 'Net the young plants', who: 'ruby', xp: 6, needs: [{ item: 'seeds', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'farm52', land: 'farm', zone: 'berryrows', at: [70, 89], look: ['🔨', '✨'], after: ['farm50'],
      name: 'Pick the first berries', who: 'poppy', xp: 6, needs: [{ item: 'seeds', tier: 3, n: 1 }, { item: 'garden', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'farm53', land: 'farm', zone: 'berryrows', at: [42, 24], look: ['🔨', '✨'], after: ['farm51'],
      name: 'Sort berries into punnets', who: 'hattie', xp: 6, needs: [{ item: 'seeds', tier: 3, n: 1 }], line: 'Just right!' },
    { id: 'farm54', land: 'farm', zone: 'berryrows', at: [28, 44], look: ['🔨', '✨'], after: ['farm52'],
      name: 'Make strawberry jam', who: 'ruby', xp: 6, needs: [{ item: 'farm', tier: 4, n: 1 }], line: 'Wonderful!' },
    { id: 'farm55', land: 'farm', zone: 'berryrows', at: [42, 59], look: ['🔨', '✨'], after: ['farm53'], reward: { chest: 'brown' },
      name: 'Mend the stand awning', who: 'poppy', xp: 6, needs: [{ item: 'garden', tier: 2, n: 1 }, { item: 'seeds', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Looks great!' },
    { id: 'farm56', land: 'farm', zone: 'berryrows', at: [42, 39], look: ['🔨', '✨'], after: ['farm54'],
      name: 'Weed between the rows', who: 'hattie', xp: 6, needs: [{ item: 'seeds', tier: 3, n: 1 }, { item: 'farm', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'farm57', land: 'farm', zone: 'berryrows', at: [42, 79], look: ['🔨', '✨'], after: ['farm55'],
      name: 'Plant borage for the bees', who: 'ruby', xp: 6, needs: [{ item: 'seeds', tier: 4, n: 1 }], line: 'Beautiful!' },
    { id: 'farm58', land: 'farm', zone: 'berryrows', at: [70, 69], look: ['🔨', '✨'], after: ['farm56'],
      name: 'Build a berry cart', who: 'poppy', xp: 7, needs: [{ item: 'seeds', tier: 3, n: 1 }, { item: 'garden', tier: 3, n: 1 }], line: 'Thank you!' },
    { id: 'farm59', land: 'farm', zone: 'berryrows', at: [14, 39], look: ['🔨', '✨'], after: ['farm57'],
      name: 'Stack the punnets', who: 'hattie', xp: 7, needs: [{ item: 'seeds', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'farm60', land: 'farm', zone: 'berryrows', at: [14, 69], look: ['🔨', '✨'], after: ['farm58'],
      name: 'Feed the plants', who: 'ruby', xp: 7, needs: [{ item: 'farm', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'farm61', land: 'farm', zone: 'berryrows', at: [14, 89], look: ['🔨', '✨'], after: ['farm59'],
      name: 'Shade the stand', who: 'poppy', xp: 7, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'seeds', tier: 2, n: 2 }], line: 'So cozy!' },
    { id: 'farm62', land: 'farm', zone: 'berryrows', at: [28, 34], look: ['🔨', '✨'], after: ['farm60'],
      name: 'Plant a second row', who: 'hattie', xp: 7, needs: [{ item: 'seeds', tier: 4, n: 1 }, { item: 'farm', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'farm63', land: 'farm', zone: 'berryrows', at: [56, 64], look: ['🔨', '✨'], after: ['farm61'],
      name: 'Hang shiny tape for birds', who: 'ruby', xp: 7, needs: [{ item: 'seeds', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'farm64', land: 'farm', zone: 'berryrows', at: [56, 84], look: ['🔨', '✨'], after: ['farm62'], reward: { chest: 'blue' },
      name: 'Hold a berry tasting', who: 'poppy', xp: 8, needs: [{ item: 'seeds', tier: 4, n: 1 }, { item: 'garden', tier: 4, n: 1 }], line: 'Wonderful!' },
    // orchard
    { id: 'farm65', land: 'farm', zone: 'orchard', at: [14, 24], look: ['🔨', '✨'], after: ['farm19'],
      name: 'Prune the apple trees', who: 'hattie', xp: 8, needs: [{ item: 'seeds', tier: 4, n: 1 }], line: 'Wonderful!' },
    { id: 'farm66', land: 'farm', zone: 'orchard', at: [84, 24], look: ['🔨', '✨'], after: ['farm19'],
      name: 'Mulch around the trees', who: 'ruby', xp: 8, needs: [{ item: 'farm', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'farm67', land: 'farm', zone: 'orchard', at: [14, 44], look: ['🔨', '✨'], after: ['farm65'],
      name: 'Graft a new branch', who: 'poppy', xp: 9, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'seeds', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'farm68', land: 'farm', zone: 'orchard', at: [42, 29], look: ['🔨', '✨'], after: ['farm66'],
      name: 'Pick a basket of apples', who: 'hattie', xp: 9, needs: [{ item: 'seeds', tier: 4, n: 1 }, { item: 'farm', tier: 4, n: 1 }], line: 'Beautiful!' },
    { id: 'farm69', land: 'farm', zone: 'orchard', at: [84, 44], look: ['🔨', '✨'], after: ['farm67'],
      name: 'Press apple juice', who: 'ruby', xp: 9, needs: [{ item: 'seeds', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'farm70', land: 'farm', zone: 'orchard', at: [70, 34], look: ['🔨', '✨'], after: ['farm68'],
      name: 'Bottle the juice', who: 'poppy', xp: 9, needs: [{ item: 'seeds', tier: 4, n: 1 }, { item: 'garden', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'farm71', land: 'farm', zone: 'orchard', at: [56, 64], look: ['🔨', '✨'], after: ['farm69'],
      name: 'Mend the ladder', who: 'hattie', xp: 10, needs: [{ item: 'seeds', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'farm72', land: 'farm', zone: 'orchard', at: [42, 74], look: ['🔨', '✨'], after: ['farm70'],
      name: 'Hang bird boxes', who: 'ruby', xp: 10, needs: [{ item: 'farm', tier: 5, n: 1 }], line: 'So cozy!' },
    { id: 'farm73', land: 'farm', zone: 'orchard', at: [70, 54], look: ['🔨', '✨'], after: ['farm71'], reward: { chest: 'brown' },
      name: 'Sow wildflowers under the trees', who: 'poppy', xp: 10, needs: [{ item: 'garden', tier: 4, n: 1 }, { item: 'seeds', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Great work!' },
    { id: 'farm74', land: 'farm', zone: 'orchard', at: [28, 34], look: ['🔨', '✨'], after: ['farm72'],
      name: 'Fix the gate in the wall', who: 'hattie', xp: 10, needs: [{ item: 'seeds', tier: 5, n: 1 }, { item: 'farm', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'farm75', land: 'farm', zone: 'orchard', at: [28, 49], look: ['🔨', '✨'], after: ['farm73'],
      name: 'Sow clover in the grass', who: 'ruby', xp: 10, needs: [{ item: 'seeds', tier: 6, n: 1 }], line: 'Wonderful!' },
    { id: 'farm76', land: 'farm', zone: 'orchard', at: [56, 24], look: ['🔨', '✨'], after: ['farm74'],
      name: 'Bake an apple pie', who: 'poppy', xp: 11, needs: [{ item: 'seeds', tier: 5, n: 1 }, { item: 'garden', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'farm77', land: 'farm', zone: 'orchard', at: [14, 54], look: ['🔨', '✨'], after: ['farm75'],
      name: 'Build a fruit store', who: 'hattie', xp: 11, needs: [{ item: 'seeds', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'farm78', land: 'farm', zone: 'orchard', at: [42, 39], look: ['🔨', '✨'], after: ['farm76'],
      name: 'Wrap the young trees', who: 'ruby', xp: 11, needs: [{ item: 'farm', tier: 6, n: 1 }], line: 'Beautiful!' },
    { id: 'farm79', land: 'farm', zone: 'orchard', at: [42, 84], look: ['🔨', '✨'], after: ['farm77'],
      name: 'Set up a beehive stand', who: 'poppy', xp: 11, needs: [{ item: 'garden', tier: 4, n: 1 }, { item: 'seeds', tier: 3, n: 2 }], line: 'Thank you!' },
    { id: 'farm80', land: 'farm', zone: 'orchard', at: [14, 84], look: ['🔨', '✨'], after: ['farm78'],
      name: 'Rake the fallen leaves', who: 'hattie', xp: 12, needs: [{ item: 'seeds', tier: 5, n: 1 }, { item: 'farm', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'farm81', land: 'farm', zone: 'orchard', at: [14, 69], look: ['🔨', '✨'], after: ['farm79'],
      name: 'Hang lanterns in the trees', who: 'ruby', xp: 12, needs: [{ item: 'seeds', tier: 6, n: 1 }], line: 'Perfect!' },
    { id: 'farm82', land: 'farm', zone: 'orchard', at: [14, 34], look: ['🔨', '✨'], after: ['farm80'], reward: { chest: 'blue' },
      name: 'Plant a pear tree', who: 'poppy', xp: 12, needs: [{ item: 'seeds', tier: 5, n: 1 }, { item: 'garden', tier: 5, n: 1 }], line: 'So cozy!' },
    // meadow
    { id: 'hay28', land: 'hay', zone: 'meadow', at: [28, 89], look: ['🔨', '✨'], after: ['hay2'],
      name: 'Mill the first flour', who: 'hattie', xp: 6, needs: [{ item: 'bakery', tier: 1, n: 2 }], line: 'So cozy!' },
    { id: 'hay29', land: 'hay', zone: 'meadow', at: [14, 39], look: ['🔨', '✨'], after: ['hay2'],
      name: 'Bake bread for the farmhands', who: 'ruby', xp: 6, needs: [{ item: 'hay', tier: 1, n: 2 }], line: 'Great work!' },
    { id: 'hay30', land: 'hay', zone: 'meadow', at: [42, 69], look: ['🔨', '✨'], after: ['hay28'],
      name: 'Cut a path through the grass', who: 'mayor', xp: 6, needs: [{ item: 'wood', tier: 1, n: 1 }, { item: 'bakery', tier: 0, n: 2 }], line: 'Just right!' },
    { id: 'hay31', land: 'hay', zone: 'meadow', at: [56, 89], look: ['🔨', '✨'], after: ['hay29'],
      name: 'Bundle the hay', who: 'hattie', xp: 6, needs: [{ item: 'bakery', tier: 1, n: 1 }, { item: 'hay', tier: 1, n: 1 }], line: 'Wonderful!' },
    { id: 'hay32', land: 'hay', zone: 'meadow', at: [84, 24], look: ['🔨', '✨'], after: ['hay30'],
      name: 'Pick wildflowers', who: 'ruby', xp: 6, needs: [{ item: 'bakery', tier: 2, n: 1 }], line: 'Looks great!' },
    { id: 'hay33', land: 'hay', zone: 'meadow', at: [14, 74], look: ['🔨', '✨'], after: ['hay31'],
      name: 'Mend the meadow gate', who: 'mayor', xp: 6, needs: [{ item: 'bakery', tier: 1, n: 1 }, { item: 'wood', tier: 1, n: 1 }], line: 'Hooray!' },
    { id: 'hay34', land: 'hay', zone: 'meadow', at: [14, 24], look: ['🔨', '✨'], after: ['hay32'],
      name: 'Build a hay rack', who: 'hattie', xp: 7, needs: [{ item: 'bakery', tier: 2, n: 2 }], line: 'Beautiful!' },
    { id: 'hay35', land: 'hay', zone: 'meadow', at: [56, 59], look: ['🔨', '✨'], after: ['hay33'],
      name: 'Bake biscuits for the shepherd', who: 'ruby', xp: 7, needs: [{ item: 'hay', tier: 2, n: 2 }], line: 'Thank you!' },
    { id: 'hay36', land: 'hay', zone: 'meadow', at: [70, 79], look: ['🔨', '✨'], after: ['hay34'], reward: { chest: 'brown' },
      name: 'Clear the stones', who: 'mayor', xp: 7, needs: [{ item: 'wood', tier: 1, n: 1 }, { item: 'bakery', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Lovely!' },
    { id: 'hay37', land: 'hay', zone: 'meadow', at: [28, 49], look: ['🔨', '✨'], after: ['hay35'],
      name: 'Plant a hedgerow', who: 'hattie', xp: 7, needs: [{ item: 'bakery', tier: 2, n: 1 }, { item: 'hay', tier: 1, n: 1 }], line: 'Perfect!' },
    { id: 'hay38', land: 'hay', zone: 'meadow', at: [28, 34], look: ['🔨', '✨'], after: ['hay36'],
      name: 'Fill the water trough', who: 'ruby', xp: 7, needs: [{ item: 'bakery', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'hay39', land: 'hay', zone: 'meadow', at: [42, 84], look: ['🔨', '✨'], after: ['hay37'],
      name: 'Bake a picnic loaf', who: 'mayor', xp: 7, needs: [{ item: 'bakery', tier: 2, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'Great work!' },
    { id: 'hay40', land: 'hay', zone: 'meadow', at: [56, 74], look: ['🔨', '✨'], after: ['hay38'],
      name: 'Put a bench by the path', who: 'hattie', xp: 8, needs: [{ item: 'bakery', tier: 2, n: 2 }], line: 'Just right!' },
    { id: 'hay41', land: 'hay', zone: 'meadow', at: [70, 54], look: ['🔨', '✨'], after: ['hay39'],
      name: 'Brush the sheep', who: 'ruby', xp: 8, needs: [{ item: 'hay', tier: 2, n: 2 }], line: 'Wonderful!' },
    { id: 'hay42', land: 'hay', zone: 'meadow', at: [14, 84], look: ['🔨', '✨'], after: ['hay40'],
      name: 'Repaint the scarecrow', who: 'mayor', xp: 8, needs: [{ item: 'wood', tier: 1, n: 1 }, { item: 'bakery', tier: 0, n: 2 }], line: 'Looks great!' },
    { id: 'hay43', land: 'hay', zone: 'meadow', at: [28, 79], look: ['🔨', '✨'], after: ['hay41'],
      name: 'Build a lambing pen', who: 'hattie', xp: 8, needs: [{ item: 'bakery', tier: 2, n: 1 }, { item: 'hay', tier: 2, n: 1 }], line: 'Hooray!' },
    { id: 'hay44', land: 'hay', zone: 'meadow', at: [70, 29], look: ['🔨', '✨'], after: ['hay42'],
      name: 'Bake a harvest pie', who: 'ruby', xp: 8, needs: [{ item: 'bakery', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'hay45', land: 'hay', zone: 'meadow', at: [28, 64], look: ['🔨', '✨'], after: ['hay43'], reward: { chest: 'blue' },
      name: 'Hold a meadow picnic', who: 'mayor', xp: 8, needs: [{ item: 'bakery', tier: 2, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'Thank you!' },
    // stables
    { id: 'hay46', land: 'hay', zone: 'stables', at: [84, 39], look: ['🔨', '✨'], after: ['hay13'],
      name: 'Bake carrot cakes for the horses', who: 'hattie', xp: 8, needs: [{ item: 'bakery', tier: 3, n: 1 }], line: 'Thank you!' },
    { id: 'hay47', land: 'hay', zone: 'stables', at: [14, 89], look: ['🔨', '✨'], after: ['hay13'],
      name: 'Muck out the stalls', who: 'ruby', xp: 8, needs: [{ item: 'hay', tier: 3, n: 2 }], line: 'Lovely!' },
    { id: 'hay48', land: 'hay', zone: 'stables', at: [14, 49], look: ['🔨', '✨'], after: ['hay46'],
      name: 'Fill the hay nets', who: 'mayor', xp: 8, needs: [{ item: 'wood', tier: 2, n: 1 }, { item: 'bakery', tier: 1, n: 2 }], line: 'Perfect!' },
    { id: 'hay49', land: 'hay', zone: 'stables', at: [84, 59], look: ['🔨', '✨'], after: ['hay47'],
      name: 'Polish the saddles', who: 'hattie', xp: 9, needs: [{ item: 'bakery', tier: 3, n: 1 }, { item: 'hay', tier: 2, n: 1 }], line: 'So cozy!' },
    { id: 'hay50', land: 'hay', zone: 'stables', at: [84, 24], look: ['🔨', '✨'], after: ['hay48'],
      name: 'Mend the bridles', who: 'ruby', xp: 9, needs: [{ item: 'bakery', tier: 4, n: 1 }], line: 'Great work!' },
    { id: 'hay51', land: 'hay', zone: 'stables', at: [56, 89], look: ['🔨', '✨'], after: ['hay49'],
      name: 'Brush the horses', who: 'mayor', xp: 9, needs: [{ item: 'bakery', tier: 3, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'Just right!' },
    { id: 'hay52', land: 'hay', zone: 'stables', at: [70, 49], look: ['🔨', '✨'], after: ['hay50'],
      name: 'Fix the stall latches', who: 'hattie', xp: 9, needs: [{ item: 'bakery', tier: 3, n: 1 }], line: 'Wonderful!' },
    { id: 'hay53', land: 'hay', zone: 'stables', at: [56, 74], look: ['🔨', '✨'], after: ['hay51'],
      name: 'Sweep the yard', who: 'ruby', xp: 10, needs: [{ item: 'hay', tier: 4, n: 1 }], line: 'Looks great!' },
    { id: 'hay54', land: 'hay', zone: 'stables', at: [42, 64], look: ['🔨', '✨'], after: ['hay52'], reward: { chest: 'brown' },
      name: 'Hang a tack rack', who: 'mayor', xp: 10, needs: [{ item: 'wood', tier: 2, n: 1 }, { item: 'bakery', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Hooray!' },
    { id: 'hay55', land: 'hay', zone: 'stables', at: [56, 39], look: ['🔨', '✨'], after: ['hay53'],
      name: 'Bake oat bars', who: 'hattie', xp: 10, needs: [{ item: 'bakery', tier: 3, n: 1 }, { item: 'hay', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'hay56', land: 'hay', zone: 'stables', at: [84, 89], look: ['🔨', '✨'], after: ['hay54'],
      name: 'Paint the stable doors', who: 'ruby', xp: 10, needs: [{ item: 'bakery', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'hay57', land: 'hay', zone: 'stables', at: [28, 44], look: ['🔨', '✨'], after: ['hay55'],
      name: 'Fill the feed bins', who: 'mayor', xp: 11, needs: [{ item: 'bakery', tier: 3, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'hay58', land: 'hay', zone: 'stables', at: [70, 29], look: ['🔨', '✨'], after: ['hay56'],
      name: 'Fix the water pump', who: 'hattie', xp: 11, needs: [{ item: 'bakery', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'hay59', land: 'hay', zone: 'stables', at: [14, 34], look: ['🔨', '✨'], after: ['hay57'],
      name: 'Plant a shade tree', who: 'ruby', xp: 11, needs: [{ item: 'hay', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'hay60', land: 'hay', zone: 'stables', at: [14, 79], look: ['🔨', '✨'], after: ['hay58'],
      name: 'Build a mounting block', who: 'mayor', xp: 11, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'bakery', tier: 2, n: 2 }], line: 'Great work!' },
    { id: 'hay61', land: 'hay', zone: 'stables', at: [28, 54], look: ['🔨', '✨'], after: ['hay59'],
      name: 'Bake a cake for the pony', who: 'hattie', xp: 12, needs: [{ item: 'bakery', tier: 4, n: 1 }, { item: 'hay', tier: 3, n: 1 }], line: 'Just right!' },
    { id: 'hay62', land: 'hay', zone: 'stables', at: [28, 74], look: ['🔨', '✨'], after: ['hay60'],
      name: 'Hang the name boards', who: 'ruby', xp: 12, needs: [{ item: 'bakery', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'hay63', land: 'hay', zone: 'stables', at: [70, 69], look: ['🔨', '✨'], after: ['hay61'], reward: { chest: 'blue' },
      name: 'Hold a pony show', who: 'mayor', xp: 12, needs: [{ item: 'bakery', tier: 4, n: 1 }, { item: 'wood', tier: 4, n: 1 }], line: 'Looks great!' },
    // windmill
    { id: 'hay64', land: 'hay', zone: 'windmill', at: [14, 89], look: ['🔨', '✨'], after: ['hay20'],
      name: 'Sweep the mill floor', who: 'hattie', xp: 10, needs: [{ item: 'bakery', tier: 4, n: 1 }], line: 'Looks great!' },
    { id: 'hay65', land: 'hay', zone: 'windmill', at: [70, 89], look: ['🔨', '✨'], after: ['hay20'],
      name: 'Oil the millstones', who: 'ruby', xp: 10, needs: [{ item: 'hay', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'hay66', land: 'hay', zone: 'windmill', at: [42, 79], look: ['🔨', '✨'], after: ['hay64'],
      name: 'Fix the grain chute', who: 'mayor', xp: 10, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'bakery', tier: 2, n: 2 }], line: 'Beautiful!' },
    { id: 'hay67', land: 'hay', zone: 'windmill', at: [14, 69], look: ['🔨', '✨'], after: ['hay65'],
      name: 'Sack the flour', who: 'hattie', xp: 10, needs: [{ item: 'bakery', tier: 4, n: 1 }, { item: 'hay', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'hay68', land: 'hay', zone: 'windmill', at: [14, 44], look: ['🔨', '✨'], after: ['hay66'],
      name: 'Bake the first mill loaf', who: 'ruby', xp: 11, needs: [{ item: 'bakery', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'hay69', land: 'hay', zone: 'windmill', at: [84, 74], look: ['🔨', '✨'], after: ['hay67'],
      name: 'Mend the stairs', who: 'mayor', xp: 11, needs: [{ item: 'bakery', tier: 4, n: 1 }, { item: 'wood', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'hay70', land: 'hay', zone: 'windmill', at: [56, 64], look: ['🔨', '✨'], after: ['hay68'],
      name: 'Fix the mill windows', who: 'hattie', xp: 11, needs: [{ item: 'bakery', tier: 5, n: 1 }], line: 'So cozy!' },
    { id: 'hay71', land: 'hay', zone: 'windmill', at: [70, 29], look: ['🔨', '✨'], after: ['hay69'],
      name: 'Paint the mill door', who: 'ruby', xp: 12, needs: [{ item: 'hay', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'hay72', land: 'hay', zone: 'windmill', at: [42, 34], look: ['🔨', '✨'], after: ['hay70'], reward: { chest: 'brown' },
      name: 'Hang a weather vane on top', who: 'mayor', xp: 12, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'bakery', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Just right!' },
    { id: 'hay73', land: 'hay', zone: 'windmill', at: [28, 39], look: ['🔨', '✨'], after: ['hay71'],
      name: 'Stack the grain sacks', who: 'hattie', xp: 12, needs: [{ item: 'bakery', tier: 5, n: 1 }, { item: 'hay', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'hay74', land: 'hay', zone: 'windmill', at: [28, 74], look: ['🔨', '✨'], after: ['hay72'],
      name: 'Bake rolls for the miller', who: 'ruby', xp: 12, needs: [{ item: 'bakery', tier: 6, n: 1 }], line: 'Looks great!' },
    { id: 'hay75', land: 'hay', zone: 'windmill', at: [56, 84], look: ['🔨', '✨'], after: ['hay73'],
      name: 'Plant lavender by the path', who: 'mayor', xp: 13, needs: [{ item: 'bakery', tier: 5, n: 1 }, { item: 'wood', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'hay76', land: 'hay', zone: 'windmill', at: [70, 69], look: ['🔨', '✨'], after: ['hay74'],
      name: 'Fix the cart track', who: 'hattie', xp: 13, needs: [{ item: 'bakery', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'hay77', land: 'hay', zone: 'windmill', at: [84, 34], look: ['🔨', '✨'], after: ['hay75'],
      name: 'Build a flour store', who: 'ruby', xp: 13, needs: [{ item: 'hay', tier: 6, n: 1 }], line: 'Thank you!' },
    { id: 'hay78', land: 'hay', zone: 'windmill', at: [14, 54], look: ['🔨', '✨'], after: ['hay76'],
      name: 'Bake a fruit tart', who: 'mayor', xp: 14, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'bakery', tier: 3, n: 2 }], line: 'Lovely!' },
    { id: 'hay79', land: 'hay', zone: 'windmill', at: [14, 79], look: ['🔨', '✨'], after: ['hay77'],
      name: 'Hang flower baskets', who: 'hattie', xp: 14, needs: [{ item: 'bakery', tier: 5, n: 1 }, { item: 'hay', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'hay80', land: 'hay', zone: 'windmill', at: [28, 84], look: ['🔨', '✨'], after: ['hay78'],
      name: 'Open the mill bakery', who: 'ruby', xp: 14, needs: [{ item: 'bakery', tier: 6, n: 1 }], line: 'So cozy!' },
    { id: 'hay81', land: 'hay', zone: 'windmill', at: [42, 69], look: ['🔨', '✨'], after: ['hay79'], reward: { chest: 'blue' },
      name: 'Bake a grand loaf for Sunnyvale', who: 'mayor', xp: 14, needs: [{ item: 'bakery', tier: 5, n: 1 }, { item: 'wood', tier: 5, n: 1 }], line: 'Great work!' },
    // leafpiles
    { id: 'fert29', land: 'fert', zone: 'leafpiles', at: [84, 89], look: ['🔨', '✨'], after: ['fert2'],
      name: 'Start a worm bin', who: 'poppy', xp: 8, needs: [{ item: 'worms', tier: 1, n: 2 }], line: 'Great work!' },
    { id: 'fert30', land: 'fert', zone: 'leafpiles', at: [14, 64], look: ['🔨', '✨'], after: ['fert2'],
      name: 'Sift the leaf mould', who: 'hattie', xp: 8, needs: [{ item: 'fert', tier: 1, n: 2 }], line: 'Just right!' },
    { id: 'fert31', land: 'fert', zone: 'leafpiles', at: [56, 84], look: ['🔨', '✨'], after: ['fert29'],
      name: 'Bag the leaves', who: 'ruby', xp: 8, needs: [{ item: 'clean', tier: 1, n: 1 }, { item: 'worms', tier: 0, n: 2 }], line: 'Wonderful!' },
    { id: 'fert32', land: 'fert', zone: 'leafpiles', at: [56, 24], look: ['🔨', '✨'], after: ['fert30'],
      name: 'Rake the far corner', who: 'poppy', xp: 8, needs: [{ item: 'worms', tier: 1, n: 1 }, { item: 'fert', tier: 1, n: 1 }], line: 'Looks great!' },
    { id: 'fert33', land: 'fert', zone: 'leafpiles', at: [84, 24], look: ['🔨', '✨'], after: ['fert31'],
      name: 'Pot up seedlings', who: 'hattie', xp: 9, needs: [{ item: 'worms', tier: 2, n: 1 }], line: 'Hooray!' },
    { id: 'fert34', land: 'fert', zone: 'leafpiles', at: [84, 69], look: ['🔨', '✨'], after: ['fert32'],
      name: 'Build a leaf cage', who: 'ruby', xp: 9, needs: [{ item: 'worms', tier: 1, n: 1 }, { item: 'clean', tier: 1, n: 1 }], line: 'Beautiful!' },
    { id: 'fert35', land: 'fert', zone: 'leafpiles', at: [42, 39], look: ['🔨', '✨'], after: ['fert33'],
      name: 'Turn the leaf pile', who: 'poppy', xp: 9, needs: [{ item: 'worms', tier: 2, n: 2 }], line: 'Thank you!' },
    { id: 'fert36', land: 'fert', zone: 'leafpiles', at: [42, 74], look: ['🔨', '✨'], after: ['fert34'],
      name: 'Mend the rake handles', who: 'hattie', xp: 9, needs: [{ item: 'fert', tier: 2, n: 2 }], line: 'Lovely!' },
    { id: 'fert37', land: 'fert', zone: 'leafpiles', at: [28, 54], look: ['🔨', '✨'], after: ['fert35'], reward: { chest: 'brown' },
      name: 'Sweep the stepping stones', who: 'ruby', xp: 9, needs: [{ item: 'clean', tier: 1, n: 1 }, { item: 'worms', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Perfect!' },
    { id: 'fert38', land: 'fert', zone: 'leafpiles', at: [28, 69], look: ['🔨', '✨'], after: ['fert36'],
      name: 'Plant bulbs for spring', who: 'poppy', xp: 10, needs: [{ item: 'worms', tier: 2, n: 1 }, { item: 'fert', tier: 1, n: 1 }], line: 'So cozy!' },
    { id: 'fert39', land: 'fert', zone: 'leafpiles', at: [42, 89], look: ['🔨', '✨'], after: ['fert37'],
      name: 'Lay a bark path', who: 'hattie', xp: 10, needs: [{ item: 'worms', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'fert40', land: 'fert', zone: 'leafpiles', at: [70, 74], look: ['🔨', '✨'], after: ['fert38'],
      name: 'Fill the planters', who: 'ruby', xp: 10, needs: [{ item: 'worms', tier: 2, n: 1 }, { item: 'clean', tier: 2, n: 1 }], line: 'Just right!' },
    { id: 'fert41', land: 'fert', zone: 'leafpiles', at: [42, 29], look: ['🔨', '✨'], after: ['fert39'],
      name: 'Clean the wheelbarrow', who: 'poppy', xp: 10, needs: [{ item: 'worms', tier: 2, n: 2 }], line: 'Wonderful!' },
    { id: 'fert42', land: 'fert', zone: 'leafpiles', at: [42, 49], look: ['🔨', '✨'], after: ['fert40'],
      name: 'Plant ferns under the trees', who: 'hattie', xp: 11, needs: [{ item: 'fert', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'fert43', land: 'fert', zone: 'leafpiles', at: [84, 79], look: ['🔨', '✨'], after: ['fert41'],
      name: 'Build a bug hotel', who: 'ruby', xp: 11, needs: [{ item: 'clean', tier: 1, n: 1 }, { item: 'worms', tier: 0, n: 2 }], line: 'Hooray!' },
    { id: 'fert44', land: 'fert', zone: 'leafpiles', at: [56, 34], look: ['🔨', '✨'], after: ['fert42'],
      name: 'Sort the pots', who: 'poppy', xp: 11, needs: [{ item: 'worms', tier: 2, n: 1 }, { item: 'fert', tier: 2, n: 1 }], line: 'Beautiful!' },
    { id: 'fert45', land: 'fert', zone: 'leafpiles', at: [84, 34], look: ['🔨', '✨'], after: ['fert43'],
      name: 'Put up a potting bench', who: 'hattie', xp: 11, needs: [{ item: 'worms', tier: 3, n: 1 }], line: 'Thank you!' },
    { id: 'fert46', land: 'fert', zone: 'leafpiles', at: [14, 74], look: ['🔨', '✨'], after: ['fert44'], reward: { chest: 'blue' },
      name: 'Hang wind chimes', who: 'ruby', xp: 11, needs: [{ item: 'worms', tier: 2, n: 1 }, { item: 'clean', tier: 2, n: 1 }], line: 'Lovely!' },
    // compostbins
    { id: 'fert47', land: 'fert', zone: 'compostbins', at: [14, 89], look: ['🔨', '✨'], after: ['fert14'],
      name: 'Feed the worms', who: 'poppy', xp: 9, needs: [{ item: 'worms', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'fert48', land: 'fert', zone: 'compostbins', at: [84, 89], look: ['🔨', '✨'], after: ['fert14'],
      name: 'Sort the scraps', who: 'hattie', xp: 10, needs: [{ item: 'fert', tier: 3, n: 2 }], line: 'Perfect!' },
    { id: 'fert49', land: 'fert', zone: 'compostbins', at: [14, 24], look: ['🔨', '✨'], after: ['fert47'],
      name: 'Shred the cardboard', who: 'ruby', xp: 10, needs: [{ item: 'clean', tier: 2, n: 1 }, { item: 'worms', tier: 1, n: 2 }], line: 'So cozy!' },
    { id: 'fert50', land: 'fert', zone: 'compostbins', at: [42, 49], look: ['🔨', '✨'], after: ['fert48'],
      name: 'Build a worm tower', who: 'poppy', xp: 10, needs: [{ item: 'worms', tier: 3, n: 1 }, { item: 'fert', tier: 2, n: 1 }], line: 'Great work!' },
    { id: 'fert51', land: 'fert', zone: 'compostbins', at: [42, 64], look: ['🔨', '✨'], after: ['fert49'],
      name: 'Fill the sieve', who: 'hattie', xp: 10, needs: [{ item: 'worms', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'fert52', land: 'fert', zone: 'compostbins', at: [42, 34], look: ['🔨', '✨'], after: ['fert50'],
      name: 'Bag the compost', who: 'ruby', xp: 11, needs: [{ item: 'worms', tier: 3, n: 1 }, { item: 'clean', tier: 3, n: 1 }], line: 'Wonderful!' },
    { id: 'fert53', land: 'fert', zone: 'compostbins', at: [28, 74], look: ['🔨', '✨'], after: ['fert51'],
      name: 'Label the bins', who: 'poppy', xp: 11, needs: [{ item: 'worms', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'fert54', land: 'fert', zone: 'compostbins', at: [42, 89], look: ['🔨', '✨'], after: ['fert52'],
      name: 'Fix the bin hinges', who: 'hattie', xp: 11, needs: [{ item: 'fert', tier: 4, n: 1 }], line: 'Hooray!' },
    { id: 'fert55', land: 'fert', zone: 'compostbins', at: [84, 29], look: ['🔨', '✨'], after: ['fert53'], reward: { chest: 'brown' },
      name: 'Pot up herbs', who: 'ruby', xp: 11, needs: [{ item: 'clean', tier: 2, n: 1 }, { item: 'worms', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Beautiful!' },
    { id: 'fert56', land: 'fert', zone: 'compostbins', at: [70, 74], look: ['🔨', '✨'], after: ['fert54'],
      name: 'Mix potting soil', who: 'poppy', xp: 12, needs: [{ item: 'worms', tier: 3, n: 1 }, { item: 'fert', tier: 3, n: 1 }], line: 'Thank you!' },
    { id: 'fert57', land: 'fert', zone: 'compostbins', at: [70, 59], look: ['🔨', '✨'], after: ['fert55'],
      name: 'Clean the tool wall', who: 'hattie', xp: 12, needs: [{ item: 'worms', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'fert58', land: 'fert', zone: 'compostbins', at: [28, 29], look: ['🔨', '✨'], after: ['fert56'],
      name: 'Oil the shears', who: 'ruby', xp: 12, needs: [{ item: 'worms', tier: 3, n: 1 }, { item: 'clean', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'fert59', land: 'fert', zone: 'compostbins', at: [28, 44], look: ['🔨', '✨'], after: ['fert57'],
      name: 'Build a seed tray rack', who: 'poppy', xp: 13, needs: [{ item: 'worms', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'fert60', land: 'fert', zone: 'compostbins', at: [56, 54], look: ['🔨', '✨'], after: ['fert58'],
      name: 'Water the seedlings', who: 'hattie', xp: 13, needs: [{ item: 'fert', tier: 4, n: 1 }], line: 'Great work!' },
    { id: 'fert61', land: 'fert', zone: 'compostbins', at: [84, 54], look: ['🔨', '✨'], after: ['fert59'],
      name: 'Stack the pots', who: 'ruby', xp: 13, needs: [{ item: 'clean', tier: 3, n: 1 }, { item: 'worms', tier: 2, n: 2 }], line: 'Just right!' },
    { id: 'fert62', land: 'fert', zone: 'compostbins', at: [14, 34], look: ['🔨', '✨'], after: ['fert60'],
      name: 'Plant a herb garden', who: 'poppy', xp: 13, needs: [{ item: 'worms', tier: 4, n: 1 }, { item: 'fert', tier: 3, n: 1 }], line: 'Wonderful!' },
    { id: 'fert63', land: 'fert', zone: 'compostbins', at: [14, 79], look: ['🔨', '✨'], after: ['fert61'],
      name: 'Brew compost tea', who: 'hattie', xp: 14, needs: [{ item: 'worms', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'fert64', land: 'fert', zone: 'compostbins', at: [28, 54], look: ['🔨', '✨'], after: ['fert62'], reward: { chest: 'blue' },
      name: 'Give compost to the neighbours', who: 'ruby', xp: 14, needs: [{ item: 'worms', tier: 4, n: 1 }, { item: 'clean', tier: 4, n: 1 }], line: 'Hooray!' },
    // mushrooms
    { id: 'fert65', land: 'fert', zone: 'mushrooms', at: [84, 24], look: ['🔨', '✨'], after: ['fert21'],
      name: 'Spread worm castings', who: 'poppy', xp: 11, needs: [{ item: 'worms', tier: 4, n: 1 }], line: 'Hooray!' },
    { id: 'fert66', land: 'fert', zone: 'mushrooms', at: [14, 34], look: ['🔨', '✨'], after: ['fert21'],
      name: 'Plant moss', who: 'hattie', xp: 11, needs: [{ item: 'fert', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'fert67', land: 'fert', zone: 'mushrooms', at: [42, 89], look: ['🔨', '✨'], after: ['fert65'],
      name: 'Water the mushroom logs', who: 'ruby', xp: 12, needs: [{ item: 'clean', tier: 3, n: 1 }, { item: 'worms', tier: 2, n: 2 }], line: 'Thank you!' },
    { id: 'fert68', land: 'fert', zone: 'mushrooms', at: [14, 89], look: ['🔨', '✨'], after: ['fert66'],
      name: 'Plant shade flowers', who: 'poppy', xp: 12, needs: [{ item: 'worms', tier: 4, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'fert69', land: 'fert', zone: 'mushrooms', at: [56, 24], look: ['🔨', '✨'], after: ['fert67'],
      name: 'Build a log path', who: 'hattie', xp: 12, needs: [{ item: 'worms', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'fert70', land: 'fert', zone: 'mushrooms', at: [42, 74], look: ['🔨', '✨'], after: ['fert68'],
      name: 'Fix the bench legs', who: 'ruby', xp: 13, needs: [{ item: 'worms', tier: 4, n: 1 }, { item: 'clean', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'fert71', land: 'fert', zone: 'mushrooms', at: [28, 44], look: ['🔨', '✨'], after: ['fert69'],
      name: 'Hang bird boxes', who: 'poppy', xp: 13, needs: [{ item: 'worms', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'fert72', land: 'fert', zone: 'mushrooms', at: [70, 74], look: ['🔨', '✨'], after: ['fert70'],
      name: 'Clear the stream bed', who: 'hattie', xp: 13, needs: [{ item: 'fert', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'fert73', land: 'fert', zone: 'mushrooms', at: [70, 34], look: ['🔨', '✨'], after: ['fert71'], reward: { chest: 'brown' },
      name: 'Plant a tiny tree', who: 'ruby', xp: 14, needs: [{ item: 'clean', tier: 4, n: 1 }, { item: 'worms', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Wonderful!' },
    { id: 'fert74', land: 'fert', zone: 'mushrooms', at: [84, 54], look: ['🔨', '✨'], after: ['fert72'],
      name: 'Make a toadstool ring', who: 'poppy', xp: 14, needs: [{ item: 'worms', tier: 5, n: 1 }, { item: 'fert', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'fert75', land: 'fert', zone: 'mushrooms', at: [28, 29], look: ['🔨', '✨'], after: ['fert73'],
      name: 'Lay mossy stepping stones', who: 'hattie', xp: 14, needs: [{ item: 'worms', tier: 6, n: 1 }], line: 'Hooray!' },
    { id: 'fert76', land: 'fert', zone: 'mushrooms', at: [28, 69], look: ['🔨', '✨'], after: ['fert74'],
      name: 'Hang lanterns on the branches', who: 'ruby', xp: 15, needs: [{ item: 'worms', tier: 5, n: 1 }, { item: 'clean', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'fert77', land: 'fert', zone: 'mushrooms', at: [28, 84], look: ['🔨', '✨'], after: ['fert75'],
      name: 'Build a hedgehog house', who: 'poppy', xp: 15, needs: [{ item: 'worms', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'fert78', land: 'fert', zone: 'mushrooms', at: [56, 79], look: ['🔨', '✨'], after: ['fert76'],
      name: 'Plant bluebells', who: 'hattie', xp: 15, needs: [{ item: 'fert', tier: 6, n: 1 }], line: 'Lovely!' },
    { id: 'fert79', land: 'fert', zone: 'mushrooms', at: [84, 39], look: ['🔨', '✨'], after: ['fert77'],
      name: 'Weave a willow arch', who: 'ruby', xp: 16, needs: [{ item: 'clean', tier: 4, n: 1 }, { item: 'worms', tier: 3, n: 2 }], line: 'Perfect!' },
    { id: 'fert80', land: 'fert', zone: 'mushrooms', at: [14, 24], look: ['🔨', '✨'], after: ['fert78'],
      name: 'Set up a fairy door', who: 'poppy', xp: 16, needs: [{ item: 'worms', tier: 5, n: 1 }, { item: 'fert', tier: 5, n: 1 }], line: 'So cozy!' },
    { id: 'fert81', land: 'fert', zone: 'mushrooms', at: [14, 49], look: ['🔨', '✨'], after: ['fert79'],
      name: 'Hold a midnight picnic', who: 'hattie', xp: 16, needs: [{ item: 'worms', tier: 6, n: 1 }], line: 'Great work!' },
    { id: 'fert82', land: 'fert', zone: 'mushrooms', at: [56, 49], look: ['🔨', '✨'], after: ['fert80'], reward: { chest: 'blue' },
      name: 'Light the glow path', who: 'ruby', xp: 17, needs: [{ item: 'worms', tier: 5, n: 1 }, { item: 'clean', tier: 5, n: 1 }], line: 'Just right!' },
    // muddyshore
    { id: 'aqua29', land: 'aqua', zone: 'muddyshore', at: [14, 89], look: ['🔨', '✨'], after: ['aqua2'],
      name: 'Saw the first planks', who: 'finn', xp: 9, needs: [{ item: 'boat', tier: 1, n: 2 }], line: 'Just right!' },
    { id: 'aqua30', land: 'aqua', zone: 'muddyshore', at: [84, 89], look: ['🔨', '✨'], after: ['aqua2'],
      name: 'Build a little jetty', who: 'ruby', xp: 9, needs: [{ item: 'aqua', tier: 1, n: 2 }], line: 'Wonderful!' },
    { id: 'aqua31', land: 'aqua', zone: 'muddyshore', at: [14, 49], look: ['🔨', '✨'], after: ['aqua29'],
      name: 'Rake out the reeds', who: 'poppy', xp: 10, needs: [{ item: 'fishing', tier: 1, n: 1 }, { item: 'boat', tier: 0, n: 2 }], line: 'Looks great!' },
    { id: 'aqua32', land: 'aqua', zone: 'muddyshore', at: [84, 49], look: ['🔨', '✨'], after: ['aqua30'],
      name: 'Fix the fishing stool', who: 'finn', xp: 10, needs: [{ item: 'boat', tier: 1, n: 1 }, { item: 'aqua', tier: 1, n: 1 }], line: 'Hooray!' },
    { id: 'aqua33', land: 'aqua', zone: 'muddyshore', at: [42, 24], look: ['🔨', '✨'], after: ['aqua31'],
      name: 'Tie up the old raft', who: 'ruby', xp: 10, needs: [{ item: 'boat', tier: 2, n: 1 }], line: 'Beautiful!' },
    { id: 'aqua34', land: 'aqua', zone: 'muddyshore', at: [42, 89], look: ['🔨', '✨'], after: ['aqua32'],
      name: 'Lay new pebbles', who: 'poppy', xp: 11, needs: [{ item: 'boat', tier: 1, n: 1 }, { item: 'fishing', tier: 1, n: 1 }], line: 'Thank you!' },
    { id: 'aqua35', land: 'aqua', zone: 'muddyshore', at: [28, 79], look: ['🔨', '✨'], after: ['aqua33'],
      name: 'Build a bait box', who: 'finn', xp: 11, needs: [{ item: 'boat', tier: 2, n: 2 }], line: 'Lovely!' },
    { id: 'aqua36', land: 'aqua', zone: 'muddyshore', at: [84, 24], look: ['🔨', '✨'], after: ['aqua34'],
      name: 'Patch the old canoe', who: 'ruby', xp: 11, needs: [{ item: 'aqua', tier: 2, n: 2 }], line: 'Perfect!' },
    { id: 'aqua37', land: 'aqua', zone: 'muddyshore', at: [70, 79], look: ['🔨', '✨'], after: ['aqua35'], reward: { chest: 'brown' },
      name: 'Plant marsh flowers', who: 'poppy', xp: 11, needs: [{ item: 'fishing', tier: 1, n: 1 }, { item: 'boat', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'So cozy!' },
    { id: 'aqua38', land: 'aqua', zone: 'muddyshore', at: [70, 59], look: ['🔨', '✨'], after: ['aqua36'],
      name: 'Mend the fishing nets', who: 'finn', xp: 12, needs: [{ item: 'boat', tier: 2, n: 1 }, { item: 'aqua', tier: 1, n: 1 }], line: 'Great work!' },
    { id: 'aqua39', land: 'aqua', zone: 'muddyshore', at: [56, 39], look: ['🔨', '✨'], after: ['aqua37'],
      name: 'Build a frog log', who: 'ruby', xp: 12, needs: [{ item: 'boat', tier: 3, n: 1 }], line: 'Just right!' },
    { id: 'aqua40', land: 'aqua', zone: 'muddyshore', at: [28, 54], look: ['🔨', '✨'], after: ['aqua38'],
      name: 'Hang a life ring', who: 'poppy', xp: 12, needs: [{ item: 'boat', tier: 2, n: 1 }, { item: 'fishing', tier: 2, n: 1 }], line: 'Wonderful!' },
    { id: 'aqua41', land: 'aqua', zone: 'muddyshore', at: [70, 44], look: ['🔨', '✨'], after: ['aqua39'],
      name: 'Clear the shallows', who: 'finn', xp: 12, needs: [{ item: 'boat', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'aqua42', land: 'aqua', zone: 'muddyshore', at: [28, 29], look: ['🔨', '✨'], after: ['aqua40'],
      name: 'Build a bird hide', who: 'ruby', xp: 13, needs: [{ item: 'aqua', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'aqua43', land: 'aqua', zone: 'muddyshore', at: [84, 39], look: ['🔨', '✨'], after: ['aqua41'],
      name: 'Paint the jetty', who: 'poppy', xp: 13, needs: [{ item: 'fishing', tier: 1, n: 1 }, { item: 'boat', tier: 0, n: 2 }], line: 'Beautiful!' },
    { id: 'aqua44', land: 'aqua', zone: 'muddyshore', at: [42, 64], look: ['🔨', '✨'], after: ['aqua42'],
      name: 'Put up a fishing sign', who: 'finn', xp: 13, needs: [{ item: 'boat', tier: 2, n: 1 }, { item: 'aqua', tier: 2, n: 1 }], line: 'Thank you!' },
    { id: 'aqua45', land: 'aqua', zone: 'muddyshore', at: [56, 29], look: ['🔨', '✨'], after: ['aqua43'],
      name: 'Build a rowing boat', who: 'ruby', xp: 13, needs: [{ item: 'boat', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'aqua46', land: 'aqua', zone: 'muddyshore', at: [14, 39], look: ['🔨', '✨'], after: ['aqua44'], reward: { chest: 'blue' },
      name: 'Hold a fishing contest', who: 'poppy', xp: 14, needs: [{ item: 'boat', tier: 2, n: 1 }, { item: 'fishing', tier: 2, n: 1 }], line: 'Perfect!' },
    // lilypond
    { id: 'aqua47', land: 'aqua', zone: 'lilypond', at: [14, 24], look: ['🔨', '✨'], after: ['aqua13'],
      name: 'Build a little punt', who: 'finn', xp: 12, needs: [{ item: 'boat', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'aqua48', land: 'aqua', zone: 'lilypond', at: [84, 89], look: ['🔨', '✨'], after: ['aqua13'],
      name: 'Plant lily pads', who: 'ruby', xp: 12, needs: [{ item: 'aqua', tier: 3, n: 2 }], line: 'So cozy!' },
    { id: 'aqua49', land: 'aqua', zone: 'lilypond', at: [84, 24], look: ['🔨', '✨'], after: ['aqua47'],
      name: 'Clean the bridge rails', who: 'poppy', xp: 13, needs: [{ item: 'fishing', tier: 2, n: 1 }, { item: 'boat', tier: 1, n: 2 }], line: 'Great work!' },
    { id: 'aqua50', land: 'aqua', zone: 'lilypond', at: [14, 44], look: ['🔨', '✨'], after: ['aqua48'],
      name: 'Fix the bridge steps', who: 'finn', xp: 13, needs: [{ item: 'boat', tier: 3, n: 1 }, { item: 'aqua', tier: 2, n: 1 }], line: 'Just right!' },
    { id: 'aqua51', land: 'aqua', zone: 'lilypond', at: [56, 89], look: ['🔨', '✨'], after: ['aqua49'],
      name: 'Feed the koi', who: 'ruby', xp: 13, needs: [{ item: 'boat', tier: 4, n: 1 }], line: 'Wonderful!' },
    { id: 'aqua52', land: 'aqua', zone: 'lilypond', at: [84, 74], look: ['🔨', '✨'], after: ['aqua50'],
      name: 'Build a duck house', who: 'poppy', xp: 14, needs: [{ item: 'boat', tier: 3, n: 1 }, { item: 'fishing', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'aqua53', land: 'aqua', zone: 'lilypond', at: [42, 24], look: ['🔨', '✨'], after: ['aqua51'],
      name: 'Plant irises', who: 'finn', xp: 14, needs: [{ item: 'boat', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'aqua54', land: 'aqua', zone: 'lilypond', at: [28, 34], look: ['🔨', '✨'], after: ['aqua52'],
      name: 'Clear the algae', who: 'ruby', xp: 14, needs: [{ item: 'aqua', tier: 4, n: 1 }], line: 'Beautiful!' },
    { id: 'aqua55', land: 'aqua', zone: 'lilypond', at: [56, 54], look: ['🔨', '✨'], after: ['aqua53'], reward: { chest: 'brown' },
      name: 'Build a fish shelter', who: 'poppy', xp: 15, needs: [{ item: 'fishing', tier: 2, n: 1 }, { item: 'boat', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Thank you!' },
    { id: 'aqua56', land: 'aqua', zone: 'lilypond', at: [14, 64], look: ['🔨', '✨'], after: ['aqua54'],
      name: 'Paint the lanterns', who: 'finn', xp: 15, needs: [{ item: 'boat', tier: 3, n: 1 }, { item: 'aqua', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'aqua57', land: 'aqua', zone: 'lilypond', at: [84, 39], look: ['🔨', '✨'], after: ['aqua55'],
      name: 'Repair the stone edge', who: 'ruby', xp: 15, needs: [{ item: 'boat', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'aqua58', land: 'aqua', zone: 'lilypond', at: [28, 89], look: ['🔨', '✨'], after: ['aqua56'],
      name: 'Plant a water lily', who: 'poppy', xp: 16, needs: [{ item: 'boat', tier: 3, n: 1 }, { item: 'fishing', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'aqua59', land: 'aqua', zone: 'lilypond', at: [42, 84], look: ['🔨', '✨'], after: ['aqua57'],
      name: 'Build a pond fountain', who: 'finn', xp: 16, needs: [{ item: 'boat', tier: 4, n: 1 }], line: 'Great work!' },
    { id: 'aqua60', land: 'aqua', zone: 'lilypond', at: [70, 79], look: ['🔨', '✨'], after: ['aqua58'],
      name: 'Hang a swing on the willow', who: 'ruby', xp: 16, needs: [{ item: 'aqua', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'aqua61', land: 'aqua', zone: 'lilypond', at: [14, 54], look: ['🔨', '✨'], after: ['aqua59'],
      name: 'Set out a bench', who: 'poppy', xp: 17, needs: [{ item: 'fishing', tier: 3, n: 1 }, { item: 'boat', tier: 2, n: 2 }], line: 'Wonderful!' },
    { id: 'aqua62', land: 'aqua', zone: 'lilypond', at: [70, 44], look: ['🔨', '✨'], after: ['aqua60'],
      name: 'Lay a stepping stone path', who: 'finn', xp: 17, needs: [{ item: 'boat', tier: 4, n: 1 }, { item: 'aqua', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'aqua63', land: 'aqua', zone: 'lilypond', at: [28, 49], look: ['🔨', '✨'], after: ['aqua61'],
      name: 'Float little candle boats', who: 'ruby', xp: 18, needs: [{ item: 'boat', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'aqua64', land: 'aqua', zone: 'lilypond', at: [84, 59], look: ['🔨', '✨'], after: ['aqua62'], reward: { chest: 'blue' },
      name: 'Hold a lantern evening', who: 'poppy', xp: 18, needs: [{ item: 'boat', tier: 4, n: 1 }, { item: 'fishing', tier: 4, n: 1 }], line: 'Beautiful!' },
    // boatdock
    { id: 'aqua65', land: 'aqua', zone: 'boatdock', at: [14, 89], look: ['🔨', '✨'], after: ['aqua21'],
      name: 'Caulk the boat hulls', who: 'finn', xp: 14, needs: [{ item: 'boat', tier: 4, n: 1 }], line: 'Beautiful!' },
    { id: 'aqua66', land: 'aqua', zone: 'boatdock', at: [56, 89], look: ['🔨', '✨'], after: ['aqua21'],
      name: 'Sand the oars', who: 'ruby', xp: 14, needs: [{ item: 'aqua', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'aqua67', land: 'aqua', zone: 'boatdock', at: [14, 69], look: ['🔨', '✨'], after: ['aqua65'],
      name: 'Paint the rowboat', who: 'poppy', xp: 14, needs: [{ item: 'fishing', tier: 3, n: 1 }, { item: 'boat', tier: 2, n: 2 }], line: 'Lovely!' },
    { id: 'aqua68', land: 'aqua', zone: 'boatdock', at: [42, 74], look: ['🔨', '✨'], after: ['aqua66'],
      name: 'Rig a sail', who: 'finn', xp: 15, needs: [{ item: 'boat', tier: 4, n: 1 }, { item: 'aqua', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'aqua69', land: 'aqua', zone: 'boatdock', at: [14, 34], look: ['🔨', '✨'], after: ['aqua67'],
      name: 'Coil the ropes', who: 'ruby', xp: 15, needs: [{ item: 'boat', tier: 5, n: 1 }], line: 'So cozy!' },
    { id: 'aqua70', land: 'aqua', zone: 'boatdock', at: [84, 29], look: ['🔨', '✨'], after: ['aqua68'],
      name: 'Fix the boathouse door', who: 'poppy', xp: 16, needs: [{ item: 'boat', tier: 4, n: 1 }, { item: 'fishing', tier: 4, n: 1 }], line: 'Great work!' },
    { id: 'aqua71', land: 'aqua', zone: 'boatdock', at: [84, 89], look: ['🔨', '✨'], after: ['aqua69'],
      name: 'Build a boat rack', who: 'finn', xp: 16, needs: [{ item: 'boat', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'aqua72', land: 'aqua', zone: 'boatdock', at: [42, 24], look: ['🔨', '✨'], after: ['aqua70'],
      name: 'Hang the anchors', who: 'ruby', xp: 17, needs: [{ item: 'aqua', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'aqua73', land: 'aqua', zone: 'boatdock', at: [84, 64], look: ['🔨', '✨'], after: ['aqua71'], reward: { chest: 'brown' },
      name: 'Sew the sails', who: 'poppy', xp: 17, needs: [{ item: 'fishing', tier: 4, n: 1 }, { item: 'boat', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Looks great!' },
    { id: 'aqua74', land: 'aqua', zone: 'boatdock', at: [42, 44], look: ['🔨', '✨'], after: ['aqua72'],
      name: 'Build a canoe', who: 'finn', xp: 17, needs: [{ item: 'boat', tier: 5, n: 1 }, { item: 'aqua', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'aqua75', land: 'aqua', zone: 'boatdock', at: [28, 29], look: ['🔨', '✨'], after: ['aqua73'],
      name: 'Varnish the deck', who: 'ruby', xp: 18, needs: [{ item: 'boat', tier: 6, n: 1 }], line: 'Beautiful!' },
    { id: 'aqua76', land: 'aqua', zone: 'boatdock', at: [28, 79], look: ['🔨', '✨'], after: ['aqua74'],
      name: 'Fix the boathouse roof', who: 'poppy', xp: 18, needs: [{ item: 'boat', tier: 5, n: 1 }, { item: 'fishing', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'aqua77', land: 'aqua', zone: 'boatdock', at: [56, 69], look: ['🔨', '✨'], after: ['aqua75'],
      name: 'Hang flags', who: 'finn', xp: 19, needs: [{ item: 'boat', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'aqua78', land: 'aqua', zone: 'boatdock', at: [70, 24], look: ['🔨', '✨'], after: ['aqua76'],
      name: 'Build a sailboat', who: 'ruby', xp: 19, needs: [{ item: 'aqua', tier: 6, n: 1 }], line: 'Perfect!' },
    { id: 'aqua79', land: 'aqua', zone: 'boatdock', at: [70, 84], look: ['🔨', '✨'], after: ['aqua77'],
      name: 'Fit the mast', who: 'poppy', xp: 19, needs: [{ item: 'fishing', tier: 4, n: 1 }, { item: 'boat', tier: 3, n: 2 }], line: 'So cozy!' },
    { id: 'aqua80', land: 'aqua', zone: 'boatdock', at: [70, 49], look: ['🔨', '✨'], after: ['aqua78'],
      name: 'Launch the sailboat', who: 'finn', xp: 20, needs: [{ item: 'boat', tier: 5, n: 1 }, { item: 'aqua', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'aqua81', land: 'aqua', zone: 'boatdock', at: [28, 64], look: ['🔨', '✨'], after: ['aqua79'],
      name: 'Light the harbour lamp', who: 'ruby', xp: 20, needs: [{ item: 'boat', tier: 6, n: 1 }], line: 'Just right!' },
    { id: 'aqua82', land: 'aqua', zone: 'boatdock', at: [14, 24], look: ['🔨', '✨'], after: ['aqua80'], reward: { chest: 'blue' },
      name: 'Hold a regatta', who: 'poppy', xp: 21, needs: [{ item: 'boat', tier: 5, n: 1 }, { item: 'fishing', tier: 5, n: 1 }], line: 'Wonderful!' },
    // gardengate
    { id: 'flower30', land: 'flower', zone: 'gardengate', at: [14, 89], look: ['🔨', '✨'], after: ['flower6'],
      name: 'Set up the first beehive', who: 'poppy', xp: 14, needs: [{ item: 'honey', tier: 1, n: 2 }], line: 'Wonderful!' },
    { id: 'flower31', land: 'flower', zone: 'gardengate', at: [84, 89], look: ['🔨', '✨'], after: ['flower6'],
      name: 'Trim the hedges', who: 'mayor', xp: 15, needs: [{ item: 'flower', tier: 1, n: 2 }], line: 'Looks great!' },
    { id: 'flower32', land: 'flower', zone: 'gardengate', at: [84, 49], look: ['🔨', '✨'], after: ['flower30'],
      name: 'Paint the gate', who: 'ruby', xp: 15, needs: [{ item: 'decor', tier: 1, n: 1 }, { item: 'honey', tier: 0, n: 2 }], line: 'Hooray!' },
    { id: 'flower33', land: 'flower', zone: 'gardengate', at: [14, 74], look: ['🔨', '✨'], after: ['flower31'],
      name: 'Plant lavender', who: 'poppy', xp: 15, needs: [{ item: 'honey', tier: 1, n: 1 }, { item: 'flower', tier: 1, n: 1 }], line: 'Beautiful!' },
    { id: 'flower34', land: 'flower', zone: 'gardengate', at: [56, 89], look: ['🔨', '✨'], after: ['flower32'],
      name: 'Lay a gravel path', who: 'mayor', xp: 16, needs: [{ item: 'honey', tier: 2, n: 1 }], line: 'Thank you!' },
    { id: 'flower35', land: 'flower', zone: 'gardengate', at: [70, 39], look: ['🔨', '✨'], after: ['flower33'],
      name: 'Build a bird bath', who: 'ruby', xp: 16, needs: [{ item: 'honey', tier: 1, n: 1 }, { item: 'decor', tier: 1, n: 1 }], line: 'Lovely!' },
    { id: 'flower36', land: 'flower', zone: 'gardengate', at: [56, 59], look: ['🔨', '✨'], after: ['flower34'],
      name: 'Plant roses by the fence', who: 'poppy', xp: 17, needs: [{ item: 'honey', tier: 2, n: 2 }], line: 'Perfect!' },
    { id: 'flower37', land: 'flower', zone: 'gardengate', at: [14, 44], look: ['🔨', '✨'], after: ['flower35'],
      name: 'Hang a flower basket', who: 'mayor', xp: 17, needs: [{ item: 'flower', tier: 2, n: 2 }], line: 'So cozy!' },
    { id: 'flower38', land: 'flower', zone: 'gardengate', at: [70, 79], look: ['🔨', '✨'], after: ['flower36'], reward: { chest: 'brown' },
      name: 'Fix the letterbox', who: 'ruby', xp: 17, needs: [{ item: 'decor', tier: 1, n: 1 }, { item: 'honey', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Great work!' },
    { id: 'flower39', land: 'flower', zone: 'gardengate', at: [28, 69], look: ['🔨', '✨'], after: ['flower37'],
      name: 'Plant a wildflower strip', who: 'poppy', xp: 18, needs: [{ item: 'honey', tier: 2, n: 1 }, { item: 'flower', tier: 1, n: 1 }], line: 'Just right!' },
    { id: 'flower40', land: 'flower', zone: 'gardengate', at: [28, 84], look: ['🔨', '✨'], after: ['flower38'],
      name: 'Make honey for the Mayor', who: 'mayor', xp: 18, needs: [{ item: 'honey', tier: 3, n: 1 }], line: 'Wonderful!' },
    { id: 'flower41', land: 'flower', zone: 'gardengate', at: [42, 64], look: ['🔨', '✨'], after: ['flower39'],
      name: 'Build a trellis', who: 'ruby', xp: 19, needs: [{ item: 'honey', tier: 2, n: 1 }, { item: 'decor', tier: 2, n: 1 }], line: 'Looks great!' },
    { id: 'flower42', land: 'flower', zone: 'gardengate', at: [70, 54], look: ['🔨', '✨'], after: ['flower40'],
      name: 'Plant sweet peas', who: 'poppy', xp: 19, needs: [{ item: 'honey', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'flower43', land: 'flower', zone: 'gardengate', at: [14, 34], look: ['🔨', '✨'], after: ['flower41'],
      name: 'Fill the watering cans', who: 'mayor', xp: 20, needs: [{ item: 'flower', tier: 2, n: 2 }], line: 'Beautiful!' },
    { id: 'flower44', land: 'flower', zone: 'gardengate', at: [84, 59], look: ['🔨', '✨'], after: ['flower42'],
      name: 'Weed the path', who: 'ruby', xp: 20, needs: [{ item: 'decor', tier: 1, n: 1 }, { item: 'honey', tier: 0, n: 2 }], line: 'Thank you!' },
    { id: 'flower45', land: 'flower', zone: 'gardengate', at: [56, 69], look: ['🔨', '✨'], after: ['flower43'],
      name: 'Build a garden arch', who: 'poppy', xp: 20, needs: [{ item: 'honey', tier: 2, n: 1 }, { item: 'flower', tier: 2, n: 1 }], line: 'Lovely!' },
    { id: 'flower46', land: 'flower', zone: 'gardengate', at: [84, 34], look: ['🔨', '✨'], after: ['flower44'],
      name: 'Put out pots of herbs', who: 'mayor', xp: 21, needs: [{ item: 'honey', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'flower47', land: 'flower', zone: 'gardengate', at: [84, 74], look: ['🔨', '✨'], after: ['flower45'], reward: { chest: 'blue' },
      name: 'Hold an open garden day', who: 'ruby', xp: 21, needs: [{ item: 'honey', tier: 2, n: 1 }, { item: 'decor', tier: 2, n: 1 }], line: 'So cozy!' },
    // rosearch
    { id: 'flower48', land: 'flower', zone: 'rosearch', at: [84, 89], look: ['🔨', '✨'], after: ['flower13'],
      name: 'Feed the roses', who: 'poppy', xp: 17, needs: [{ item: 'honey', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'flower49', land: 'flower', zone: 'rosearch', at: [56, 44], look: ['🔨', '✨'], after: ['flower13'],
      name: 'Tie up the climbers', who: 'mayor', xp: 17, needs: [{ item: 'flower', tier: 3, n: 2 }], line: 'Great work!' },
    { id: 'flower50', land: 'flower', zone: 'rosearch', at: [14, 79], look: ['🔨', '✨'], after: ['flower48'],
      name: 'Plant rose bushes', who: 'ruby', xp: 18, needs: [{ item: 'decor', tier: 2, n: 1 }, { item: 'honey', tier: 1, n: 2 }], line: 'Just right!' },
    { id: 'flower51', land: 'flower', zone: 'rosearch', at: [14, 24], look: ['🔨', '✨'], after: ['flower49'],
      name: 'Collect rose petals', who: 'poppy', xp: 18, needs: [{ item: 'honey', tier: 3, n: 1 }, { item: 'flower', tier: 2, n: 1 }], line: 'Wonderful!' },
    { id: 'flower52', land: 'flower', zone: 'rosearch', at: [84, 74], look: ['🔨', '✨'], after: ['flower50'],
      name: 'Make rose honey', who: 'mayor', xp: 19, needs: [{ item: 'honey', tier: 4, n: 1 }], line: 'Looks great!' },
    { id: 'flower53', land: 'flower', zone: 'rosearch', at: [42, 29], look: ['🔨', '✨'], after: ['flower51'],
      name: 'Clean the fountain basin', who: 'ruby', xp: 19, needs: [{ item: 'honey', tier: 3, n: 1 }, { item: 'decor', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'flower54', land: 'flower', zone: 'rosearch', at: [70, 64], look: ['🔨', '✨'], after: ['flower52'],
      name: 'Plant lilies', who: 'poppy', xp: 20, needs: [{ item: 'honey', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'flower55', land: 'flower', zone: 'rosearch', at: [28, 54], look: ['🔨', '✨'], after: ['flower53'],
      name: 'Lay a mosaic', who: 'mayor', xp: 20, needs: [{ item: 'flower', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'flower56', land: 'flower', zone: 'rosearch', at: [56, 84], look: ['🔨', '✨'], after: ['flower54'], reward: { chest: 'brown' },
      name: 'Build a rose pergola', who: 'ruby', xp: 21, needs: [{ item: 'decor', tier: 2, n: 1 }, { item: 'honey', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Lovely!' },
    { id: 'flower57', land: 'flower', zone: 'rosearch', at: [28, 69], look: ['🔨', '✨'], after: ['flower55'],
      name: 'Prune the old roses', who: 'poppy', xp: 21, needs: [{ item: 'honey', tier: 3, n: 1 }, { item: 'flower', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'flower58', land: 'flower', zone: 'rosearch', at: [84, 34], look: ['🔨', '✨'], after: ['flower56'],
      name: 'Start a hedge maze', who: 'mayor', xp: 22, needs: [{ item: 'honey', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'flower59', land: 'flower', zone: 'rosearch', at: [42, 49], look: ['🔨', '✨'], after: ['flower57'],
      name: 'Hang fairy lights on the arch', who: 'ruby', xp: 22, needs: [{ item: 'honey', tier: 3, n: 1 }, { item: 'decor', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'flower60', land: 'flower', zone: 'rosearch', at: [70, 39], look: ['🔨', '✨'], after: ['flower58'],
      name: 'Build a love seat', who: 'poppy', xp: 22, needs: [{ item: 'honey', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'flower61', land: 'flower', zone: 'rosearch', at: [70, 79], look: ['🔨', '✨'], after: ['flower59'],
      name: 'Plant forget-me-nots', who: 'mayor', xp: 23, needs: [{ item: 'flower', tier: 4, n: 1 }], line: 'Wonderful!' },
    { id: 'flower62', land: 'flower', zone: 'rosearch', at: [14, 89], look: ['🔨', '✨'], after: ['flower60'],
      name: 'Make rose candles', who: 'ruby', xp: 23, needs: [{ item: 'decor', tier: 3, n: 1 }, { item: 'honey', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'flower63', land: 'flower', zone: 'rosearch', at: [42, 39], look: ['🔨', '✨'], after: ['flower61'],
      name: 'Paint the fountain', who: 'poppy', xp: 24, needs: [{ item: 'honey', tier: 4, n: 1 }, { item: 'flower', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'flower64', land: 'flower', zone: 'rosearch', at: [56, 34], look: ['🔨', '✨'], after: ['flower62'],
      name: 'Hang a bird feeder', who: 'mayor', xp: 24, needs: [{ item: 'honey', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'flower65', land: 'flower', zone: 'rosearch', at: [70, 49], look: ['🔨', '✨'], after: ['flower63'], reward: { chest: 'blue' },
      name: 'Hold a rose festival', who: 'ruby', xp: 25, needs: [{ item: 'honey', tier: 4, n: 1 }, { item: 'decor', tier: 4, n: 1 }], line: 'Thank you!' },
    // greenhouse
    { id: 'flower66', land: 'flower', zone: 'greenhouse', at: [84, 79], look: ['🔨', '✨'], after: ['flower22'],
      name: 'Pot up orchids', who: 'poppy', xp: 20, needs: [{ item: 'honey', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'flower67', land: 'flower', zone: 'greenhouse', at: [84, 24], look: ['🔨', '✨'], after: ['flower22'],
      name: 'Clean the glass', who: 'mayor', xp: 20, needs: [{ item: 'flower', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'flower68', land: 'flower', zone: 'greenhouse', at: [14, 89], look: ['🔨', '✨'], after: ['flower66'],
      name: 'Mend the vents', who: 'ruby', xp: 21, needs: [{ item: 'decor', tier: 3, n: 1 }, { item: 'honey', tier: 2, n: 2 }], line: 'Perfect!' },
    { id: 'flower69', land: 'flower', zone: 'greenhouse', at: [56, 69], look: ['🔨', '✨'], after: ['flower67'],
      name: 'Build potting shelves', who: 'poppy', xp: 22, needs: [{ item: 'honey', tier: 4, n: 1 }, { item: 'flower', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'flower70', land: 'flower', zone: 'greenhouse', at: [28, 44], look: ['🔨', '✨'], after: ['flower68'],
      name: 'Set up a watering system', who: 'mayor', xp: 22, needs: [{ item: 'honey', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'flower71', land: 'flower', zone: 'greenhouse', at: [70, 89], look: ['🔨', '✨'], after: ['flower69'],
      name: 'Plant cacti', who: 'ruby', xp: 23, needs: [{ item: 'honey', tier: 4, n: 1 }, { item: 'decor', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'flower72', land: 'flower', zone: 'greenhouse', at: [42, 34], look: ['🔨', '✨'], after: ['flower70'],
      name: 'Hang a thermometer', who: 'poppy', xp: 23, needs: [{ item: 'honey', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'flower73', land: 'flower', zone: 'greenhouse', at: [70, 34], look: ['🔨', '✨'], after: ['flower71'],
      name: 'Grow seedlings', who: 'mayor', xp: 24, needs: [{ item: 'flower', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'flower74', land: 'flower', zone: 'greenhouse', at: [42, 59], look: ['🔨', '✨'], after: ['flower72'], reward: { chest: 'brown' },
      name: 'Make beeswax polish', who: 'ruby', xp: 25, needs: [{ item: 'decor', tier: 4, n: 1 }, { item: 'honey', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Hooray!' },
    { id: 'flower75', land: 'flower', zone: 'greenhouse', at: [84, 64], look: ['🔨', '✨'], after: ['flower73'],
      name: 'Plant a lemon tree', who: 'poppy', xp: 25, needs: [{ item: 'honey', tier: 5, n: 1 }, { item: 'flower', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'flower76', land: 'flower', zone: 'greenhouse', at: [28, 24], look: ['🔨', '✨'], after: ['flower74'],
      name: 'Build hanging baskets', who: 'mayor', xp: 26, needs: [{ item: 'honey', tier: 6, n: 1 }], line: 'Thank you!' },
    { id: 'flower77', land: 'flower', zone: 'greenhouse', at: [14, 74], look: ['🔨', '✨'], after: ['flower75'],
      name: 'Mist the ferns', who: 'ruby', xp: 26, needs: [{ item: 'honey', tier: 5, n: 1 }, { item: 'decor', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'flower78', land: 'flower', zone: 'greenhouse', at: [14, 49], look: ['🔨', '✨'], after: ['flower76'],
      name: 'Plant rare lilies', who: 'poppy', xp: 27, needs: [{ item: 'honey', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'flower79', land: 'flower', zone: 'greenhouse', at: [28, 84], look: ['🔨', '✨'], after: ['flower77'],
      name: 'Make honey candles', who: 'mayor', xp: 28, needs: [{ item: 'flower', tier: 6, n: 1 }], line: 'So cozy!' },
    { id: 'flower80', land: 'flower', zone: 'greenhouse', at: [70, 74], look: ['🔨', '✨'], after: ['flower78'],
      name: 'Repaint the frame', who: 'ruby', xp: 28, needs: [{ item: 'decor', tier: 4, n: 1 }, { item: 'honey', tier: 3, n: 2 }], line: 'Great work!' },
    { id: 'flower81', land: 'flower', zone: 'greenhouse', at: [56, 39], look: ['🔨', '✨'], after: ['flower79'],
      name: 'Build a seed library', who: 'poppy', xp: 29, needs: [{ item: 'honey', tier: 5, n: 1 }, { item: 'flower', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'flower82', land: 'flower', zone: 'greenhouse', at: [56, 59], look: ['🔨', '✨'], after: ['flower80'],
      name: 'Grow a giant sunflower', who: 'mayor', xp: 29, needs: [{ item: 'honey', tier: 6, n: 1 }], line: 'Wonderful!' },
    { id: 'flower83', land: 'flower', zone: 'greenhouse', at: [70, 24], look: ['🔨', '✨'], after: ['flower81'], reward: { chest: 'blue' },
      name: 'Open the flower show', who: 'ruby', xp: 30, needs: [{ item: 'honey', tier: 5, n: 1 }, { item: 'decor', tier: 5, n: 1 }], line: 'Looks great!' },
    // Sunnyvale itself (days 4 and 5): clear the fog, then rebuild each house
    // on the town square. Opens once the old farm is back (day 3).
    { id: 'town1', land: 'town', at: [50, 50], look: ['🌫️', ''], after: ['farm28', 'hay6', 'big8'], name: 'Clear the fog from the square', who: 'mayor', xp: 15,
      needs: [{ stat: 'sold', n: 5 }], line: 'Fog gone!' },
    { id: 'town2', land: 'town', after: ['town1'], house: 'carpenter', name: 'Rebuild Ellis\'s workshop', who: 'ruby', xp: 20, reward: { chest: 'brown' },
      needs: [{ item: 'tools', tier: 5, n: 1 }, { item: 'wood', tier: 4, n: 1 }], line: 'My workshop!' },
    { id: 'town3', land: 'town', after: ['town1'], house: 'ranch', name: 'Fix up Bram\'s ranch', who: 'hattie', xp: 25,
      needs: [{ item: 'barn', tier: 5, n: 1 }, { item: 'farm', tier: 4, n: 2 }], line: 'Home sweet home!' },
    { id: 'town4', land: 'town', after: ['town1'], house: 'fishshop', name: 'Reopen Mira\'s fish shop', who: 'finn', xp: 35, reward: { chest: 'blue' },
      needs: [{ item: 'aqua', tier: 4, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'Fish for all!' },
    { id: 'town5', land: 'town', after: ['town2'], house: 'flowershop', name: 'Reopen Mae\'s flower shop', who: 'poppy', xp: 45,
      needs: [{ item: 'flower', tier: 4, n: 2 }], line: 'Flowers!' },
    // The Town Hall also waits for every clue of the mystery (see THE MYSTERY).
    { id: 'town6', land: 'town', after: ['town3', 'town4', 'town5', 'hen3', 'aqua3', 'big2', 'farm5', 'aqua8', 'fert10'], house: 'townhall', name: 'Restore the Town Hall', who: 'mayor', xp: 80, reward: { chest: 'blue' },
      needs: [{ item: 'barn', tier: 6, n: 1 }, { item: 'hay', tier: 5, n: 1 }, { item: 'aqua', tier: 5, n: 1 }],
      line: 'You\'re a hero!' },
    { id: 'town7', land: 'town', at: [50, 66], look: ['🪧', '🎉'], after: ['town6'], name: 'Throw the Sunnyvale festival', who: 'hattie', xp: 100, reward: { gems: 50 },
      needs: [{ item: 'decor', tier: 6, n: 1 }, { item: 'farm', tier: 6, n: 1 }], line: 'Thank you!' },
];

// --- PLACES AND AREAS ---
// Each land is a place you walk into, Merge Mansion style: a column of square
// area pictures you scroll through. Every job is something broken (or missing)
// at a spot in its area, fixed there once its items are made. An area opens at
// its level once the area before it is finished (a land's first area once the
// land is bought) and starts faded; each fix brings the colour back around its
// spot. House jobs are the houses on the town square; buying a land has none.
const ZONES = [
    { id: 'barnyard',    land: 'barn',   name: 'Barnyard',        level: 1, person: [66, 60] },
    { id: 'henhouse',    land: 'barn',   name: 'Hen House',       level: 2, person: [54, 32] },
    { id: 'bigbarn',     land: 'barn',   name: 'Barn Storeroom',    level: 3, person: [52, 56] },
    { id: 'fieldgate',   land: 'farm',   name: 'Field Gate',      level: 3 },
    { id: 'berryrows',   land: 'farm',   name: 'Strawberry Rows', level: 4 },
    { id: 'orchard',     land: 'farm',   name: 'Orchard',         level: 5 },
    { id: 'meadow',      land: 'hay',    name: 'Meadow',          level: 5 },
    { id: 'stables',     land: 'hay',    name: 'Stables',         level: 6 },
    { id: 'windmill',    land: 'hay',    name: 'Windmill',        level: 7 },
    { id: 'leafpiles',   land: 'fert',   name: 'Leaf Piles',      level: 7 },
    { id: 'compostbins', land: 'fert',   name: 'Compost Bins',    level: 8 },
    { id: 'mushrooms',   land: 'fert',   name: 'Mushroom Corner', level: 9 },
    { id: 'muddyshore',  land: 'aqua',   name: 'Muddy Shore',     level: 9 },
    { id: 'lilypond',    land: 'aqua',   name: 'Lily Pond',       level: 10 },
    { id: 'boatdock',    land: 'aqua',   name: 'Boat Dock',       level: 11 },
    { id: 'gardengate',  land: 'flower', name: 'Garden Gate',     level: 11 },
    { id: 'rosearch',    land: 'flower', name: 'Rose Arch',       level: 12 },
    { id: 'greenhouse',  land: 'flower', name: 'Greenhouse',      level: 13 },
];
// Jobs ask for more as you go: each later job in an area a step or two more,
// and each later area of a land a step more again, up to a top per land (the
// whole chain for the smaller producers). Applied once, as the game loads.
const LAND_TOP_TIER = { barn: 7, farm: 7, hay: 8, fert: 8, aqua: 9, flower: 9, town: 9 };
(function raiseJobs() {
    const raise = (task, bump) => task.needs.forEach(n => {
        if (!n.item) return;
        const top = TOOLS[n.item] ? NAMES[n.item].length - 1 : LAND_TOP_TIER[task.land];
        n.tier = Math.max(n.tier, Math.min(top, n.tier + bump));
    });
    ZONES.forEach(zone => {
        const step = ZONES.filter(z => z.land === zone.land).indexOf(zone);
        const jobs = TASKS.filter(t => t.zone === zone.id);
        jobs.forEach((t, i) => raise(t, Math.round(step + (2 * i) / Math.max(1, jobs.length - 1))));
    });
    TASKS.filter(t => t.land === 'town').forEach(t => raise(t, 3));
})();

// Finishing an area (other than a land's last) pays this.
const ZONE_REWARD = { gems: 5, chest: 'brown' };
// Where an area's person stands when it has no clear spot of its own (person).
const ZONE_PERSON = [42, 56];
// Spots for jobs without their own place in a picture yet, in order.
const ZONE_SLOTS = [[30, 36], [70, 42], [46, 64], [22, 84], [74, 82]];

// Areas drawn as plots (ASSETS.plots): each job's spot on its plot (% across,
// % down) and its prop, a picture standing there: 'weeds' stands there until
// the job is done (mess, or something broken), '>lantern' appears once it's
// done, and 'brushwood>firewood' swaps one for the other. The last number is
// the prop's width (% of the plot's; negative = mirrored). An optional fifth
// entry lists more copies of the prop, [x, y, width] each. A job without a prop
// just brings the colour back around its spot. ?layout moves them about.
const PLOT_JOBS = {
    // Barnyard
    barn1: ['planks', 72, 73.6, 5, [[66.6, 51, 5], [40.3, 48.4, 5]]], barn2: ['weeds', 64.7, 80.8, 4, [[61, 83.8, 4], [57.9, 86.9, 4], [77.8, 67.8, 4], [94.1, 54.7, 4]]],
    barn3: ['branch', 59.9, 62.3, 9], barn4: ['tarp', 31.8, 55.2, 6],
    barn5: ['fence_broken', 25.5, 70.2, 7], barn6: ['barrow_broken', 53.7, 40.9, 8, [[30.6, 57, 7]]],
    barn7: ['pump_broken', 50.3, 56.7, 14], barn8: ['scrap', 68.1, 64.7, 3],
    barn9: ['>lantern', 69.6, 75.5, -5, [[75.2, 69.9, -5]]], barn10: ['>mailbox', 80.9, 67.2, 4],
    barn11: ['>tulips', 64.2, 82.2, 7], barn12: [null, 61.6, 32.2],
    barn13: [null, 37.7, 41.9], barn14: [null, 51.8, 44.2],
    barn15: ['>wreath', 34.3, 44.3, 2, [[41.1, 39, 2]]], barn16: ['puddle', 48.9, 67.2, 5, [[59, 44, 5]]],
    barn17: [null, 41.4, 34.7], barn18: ['tyre', 23.6, 61.8, 3],
    barn19: [null, 36.2, 32.9], barn20: ['old_straw', 41, 58, 5],
    barn21: ['brushwood>firewood', 67.8, 49.2, 5], barn22: [null, 12, 56],
    barn23: [null, 52.7, 47.2], barn24: ['brambles', 78.3, 68.3, 4, [[71.5, 47.3, 3]]],
    barn25: ['>bird_feeder', 65.4, 35, 3], barn26: [null, 45.7, 33.7],
    barn27: ['>bench', 34.2, 50.4, -3, [[42, 44.6, -3]]], barn28: ['>bunting', 52.3, 35.1, 4],
    barn29: [null, 50, 86],
    // Hen House
    hen1: ['old_straw', 48.8, 75.8, 10, [[38.9, 66.9, 10]]], hen2: ['old_sacks', 50.5, 47.3, 10, [[56.3, 53.1, 10]]],
    hen3: ['nest_broken', 64, 39.9, 8], hen4: ['wire_torn', 67.9, 58.3, 11],
    hen5: ['trough_dry', 77, 54.3, 14], hen6: ['perch_broken', 39.1, 83.1, -9],
    hen7: ['feeder_broken', 84.9, 51.1, 6], hen8: [null, 56.3, 29.2],
    hen9: [null, 57.5, 28.7], hen10: [null, 52.4, 30.4],
    barn30: [null, 56, 22], barn31: ['puddle', 20, 59.4, 9],
    barn32: [null, 27, 38], barn33: [null, 68, 43],
    barn34: [null, 54.7, 38.8], barn35: ['planks', 36.5, 54.4, 5],
    barn36: [null, 35, 28], barn37: [null, 78.2, 44],
    barn38: ['>lantern', 17.2, 50.7, 4, [[27.3, 59.3, 4]]], barn39: [null, 66, 28],
    barn40: [null, 62, 18], barn41: [null, 56.8, 29.4],
    barn42: [null, 45.1, 22.6], barn43: ['weeds', 12.7, 62.9, 5, [[19.7, 68.8, 5]]],
    barn44: [null, 27.5, 40.1], barn45: [null, 61.3, 25.5],
    barn46: [null, 32.6, 34.1], barn47: ['>bunting', 48, 47.3, 10],
    // Barn Storeroom
    big1: ['table_broken', 47.4, 71.3, -10], big2: ['scrolls', 33.5, 43.8, 5],
    big3: ['jars_broken', 24.4, 68.2, -9], big4: ['grain_spill', 42.2, 56.6, 8],
    big5: [null, 12, 40], big6: [null, 45, 40],
    big7: ['crate_smashed', 90.5, 57.1, -6, [[84.2, 70.5, -6]]], big8: ['puddle', 25.9, 78.2, 7],
    barn48: [null, 10, 48], barn49: [null, 16, 33],
    barn50: [null, 42.3, 77.6], barn51: ['old_sacks', 78.3, 36.6, 8],
    barn52: ['planks', 86.4, 39.6, 8], barn53: [null, 28, 28],
    barn54: [null, 32.7, 39.3], barn55: [null, 30, 20],
    barn56: ['old_straw', 70.6, 78, 9], barn57: [null, 62.1, 74.5],
    barn58: [null, 75.3, 32.5], barn59: [null, 75, 22],
    barn60: ['cobweb', 67.8, 65.5, 6], barn61: [null, 24, 23],
    barn62: [null, 40, 25], barn63: [null, 60, 35],
    barn64: [null, 52, 70], barn65: [null, 18.5, 69.4],
    // Field Gate
    farm2: ['brambles', 50.5, 86.7, 7], farm3: ['boulders', 14.7, 60, 5, [[40.6, 84.3, 5]]],
    farm4: ['brushwood', 31.4, 73.6, 5], farm5: ['scarecrow_fallen', 68.1, 30.9, 9],
    farm6: ['gate_broken', 31.3, 72.1, 12], farm7: ['cart_tipped', 51.9, 30.8, 13],
    farm8: ['plough_old', 70, 53, 7], farm9: [null, 45, 15],
    farm10: [null, 34, 76.2], farm29: [null, 50, 35],
    farm30: ['ditch', 31.2, 53.8, -10], farm31: [null, 80, 35],
    farm32: [null, 68.9, 17.2], farm33: [null, 31.5, 66.1],
    farm34: [null, 36.2, 21.8], farm35: ['weeds', 82.5, 51.1, 4],
    farm36: [null, 45, 65], farm37: ['scaffold', 7.1, 54.6, 9],
    farm38: [null, 22, 46], farm39: [null, 36.6, 21.7],
    farm40: [null, 65, 60], farm41: ['weeds', 49.3, 91.3, 4],
    farm42: [null, 49.8, 11.5], farm43: [null, 25, 32],
    farm44: [null, 45.8, 17.8], farm45: [null, 64.3, 53.9],
    farm46: [null, 20.4, 35.1],
    // Strawberry Rows
    farm11: ['weeds>bed_bare', 46, 80, 8], farm12: ['berries_wilted', 30, 52, 5],
    farm13: ['barrel_broken', 15, 55, 5], farm14: ['netting_tangled', 78, 46, 6],
    farm15: ['molehole', 55, 85, 5], farm16: [null, 40, 62],
    farm17: ['baskets_tipped', 78, 62, 5], farm18: ['stand_broken', 86, 54, 8],
    farm47: [null, 33, 40], farm48: [null, 48, 50],
    farm49: [null, 19, 38], farm50: [null, 9, 40],
    farm51: [null, 64, 30], farm52: [null, 52, 38],
    farm53: [null, 66, 66], farm54: [null, 60, 76],
    farm55: [null, 65, 52], farm56: ['weeds', 43, 70, 4],
    farm57: [null, 26, 30], farm58: ['>berry_cart', 62, 82, 7],
    farm59: [null, 72, 60], farm60: [null, 40, 30],
    farm61: [null, 58, 62], farm62: [null, 56, 20],
    farm63: [null, 75, 33], farm64: [null, 50, 78],
    // Orchard
    farm19: ['branch', 33, 66, 8], farm20: ['apples_rotten', 18, 60, 5],
    farm21: ['wall_rubble', 8, 50, 6], farm22: ['crate_smashed', 46, 78, 5],
    farm23: [null, 58, 80], farm24: ['beehive_broken', 74, 50, 5],
    farm25: ['brambles', 26, 70, 6], farm26: ['swing_broken', 24, 52, 5],
    farm27: ['>sapling', 66, 50, 4], farm28: [null, 64, 57],
    farm65: [null, 20, 30], farm66: [null, 36, 50],
    farm67: [null, 50, 34], farm68: [null, 32, 40],
    farm69: [null, 54, 58], farm70: ['>juice_crate', 80, 58, 4],
    farm71: [null, 40, 32], farm72: ['>bird_box', 30, 60, 2.5],
    farm73: [null, 44, 64], farm74: [null, 72, 24],
    farm75: [null, 70, 62], farm76: [null, 60, 66],
    farm77: [null, 86, 50], farm78: [null, 56, 40],
    farm79: [null, 84, 42], farm80: ['leaf_heap', 40, 74, 5],
    farm81: ['>lantern', 50, 68, 3], farm82: ['>sapling', 55, 52, 4],
    // Meadow
    hay2: ['hay_loose', 40, 62, 7], hay3: [null, 15, 52],
    hay7: ['weeds', 55, 50, 4], hay8: [null, 78, 52],
    hay9: ['sheep_woolly>sheep_shorn', 30, 66, 6], hay10: [null, 85, 45],
    hay11: [null, 60, 40], hay12: [null, 55, 20],
    hay28: [null, 70, 75], hay29: [null, 50, 85],
    hay30: ['weeds', 58, 78, 4], hay31: [null, 20, 56],
    hay32: [null, 60, 66], hay33: ['gate_broken', 62, 28, 8],
    hay34: ['>hay_rack', 48, 72, 6], hay35: [null, 40, 78],
    hay36: ['boulders', 75, 66, 5], hay37: [null, 90, 52],
    hay38: [null, 44, 36], hay39: [null, 32, 76],
    hay40: ['>bench', 52, 58, 5], hay41: [null, 32, 38],
    hay42: [null, 60, 42], hay43: [null, 24, 31],
    hay44: [null, 60, 84], hay45: ['>picnic', 70, 70, 8],
    // Stables
    hay13: ['horseshoes_old', 40, 62, 5], hay4: ['>bales_stack', 12, 52, 6],
    hay14: ['fence_broken', 66, 60, 8], hay15: ['mud_hole', 50, 74, 7],
    hay16: ['stall_door_broken', 32, 54, 6], hay17: [null, 64, 34],
    hay18: [null, 14, 40], hay19: [null, 55, 42],
    hay5: [null, 35, 18], hay46: [null, 60, 80],
    hay47: ['old_straw', 22, 56, 6], hay48: [null, 50, 22],
    hay49: ['>saddle_stand', 44, 80, 4], hay50: [null, 40, 40],
    hay51: [null, 26, 40], hay52: [null, 44, 30],
    hay53: [null, 34, 70], hay54: [null, 58, 26],
    hay55: [null, 66, 76], hay56: [null, 20, 46],
    hay57: [null, 24, 66], hay58: [null, 67, 30],
    hay59: ['>sapling', 56, 64, 4], hay60: [null, 30, 58],
    hay61: [null, 50, 88], hay62: ['>name_board', 46, 52, 3],
    hay63: [null, 78, 50],
    // Windmill
    hay20: ['flour_spill', 28, 62, 6], hay21: ['weeds', 36, 50, 4],
    hay22: ['stall_door_broken', 47, 64, 6], hay23: ['wall_cracked', 40, 58, 5],
    hay24: ['sail_broken', 20, 52, 8], hay25: [null, 46, 18],
    hay26: ['>flower_box', 72, 56, 5], hay27: ['>bench', 82, 50, 5],
    hay6: [null, 48, 24], hay64: [null, 45, 46],
    hay65: [null, 50, 36], hay66: [null, 56, 30],
    hay67: [null, 66, 66], hay68: [null, 60, 44],
    hay69: [null, 54, 56], hay70: [null, 56, 22],
    hay71: [null, 44, 52], hay72: [null, 51, 10],
    hay73: [null, 70, 72], hay74: [null, 64, 50],
    hay75: [null, 30, 74], hay76: [null, 58, 80],
    hay77: [null, 84, 44], hay78: [null, 76, 60],
    hay79: [null, 62, 40], hay80: [null, 62, 52],
    hay81: [null, 50, 84],
};
// How wide each object stands in its area (% of the area), so things keep
// their real size next to the people (about 11%). Others are 11.
const OBJECT_SIZE = {
    planks: 13, weeds: 10, branch: 14, feedbin_broken: 10, feedbin: 10, fence_broken: 15, fence: 15, wheelbarrow_broken: 12,
    wheelbarrow: 12, pump_broken: 9, pump: 9, junk: 13, firewood: 11, lantern: 9, mailbox: 8, tulips: 12,
    nest_empty: 8, nest_chicks: 8, wire_torn: 12, wire_fixed: 13, trough_empty: 11, trough_full: 11, straw_mess: 11,
    perch_broken: 10, hen_perch: 10, feeder_rusty: 7, feeder: 7, basket_empty: 7, basket_eggs: 7, sacks: 9, coop: 15, nestbox: 9,
    stall_broken: 13, stall_cow: 15, hay_heap: 13, hay_bales: 14, ladder_fallen: 14, ladder: 13, paint_old: 8, paint: 8,
    rope_tangled: 8, rope_hook: 8, tools_rusty: 11, tool_rack: 11, lamp_broken: 7, lamp: 7, cans_spilled: 10, milk_cans: 10,
};

// Object pictures are drawn by name (ASSETS.objects); until then, these.
const OBJECT_EMOJI = {
    planks: '🪵', weeds: '🌿', branch: '🍂', feedbin_broken: '🪣', feedbin: '🌾', fence_broken: '🚧', fence: '🪵',
    wheelbarrow_broken: '🛒', wheelbarrow: '🛒', pump_broken: '🕸️', pump: '🚰', junk: '🗑️', firewood: '🪵',
    lantern: '🏮', mailbox: '📫', tulips: '🌷',
    nest_empty: '🪹', nest_chicks: '🐣', wire_torn: '🕸️', wire_fixed: '🥅', trough_empty: '🛁', trough_full: '💧',
    straw_mess: '🌾', perch_broken: '🪵', hen_perch: '🐔', feeder_rusty: '🥫', feeder: '🫙', basket_empty: '🧺',
    basket_eggs: '🥚', sacks: '🎒', coop: '🏠', nestbox: '🪺',
    stall_broken: '🚪', stall_cow: '🐄', hay_heap: '🍂', hay_bales: '🌾', ladder_fallen: '🪜', ladder: '🪜',
    paint_old: '🪣', paint: '🎨', rope_tangled: '🧶', rope_hook: '🪢', tools_rusty: '🔧', tool_rack: '🧰',
    lamp_broken: '🕯️', lamp: '🏮', cans_spilled: '🥛', milk_cans: '🥛',
    counter_broken: '🪚', counter: '🪵', scrolls_spilled: '📜', shelf_broken: '🪵', shelf: '🗄️', sacks_spilled: '🎒',
    sacks_stacked: '🎒', jars_fallen: '🫙', jars: '🫙', basket_tipped: '🧺', basket_full: '🧺', crate_empty: '📦', crate_full: '📦',
    rug_torn: '🧶', rug: '🟫',
    // Crop Field
    weeds_thorny: '🌵', rock: '🪨', brush: '🍂', scarecrow_fallen: '🥀', scarecrow: '🧑‍🌾', gate_broken: '🚧', gate: '🚪',
    seedcart_tipped: '🛒', seedcart: '🌱', plough_rusty: '⚙️', plough: '🛠️', birdhouse_broken: '🪵', birdhouse: '🐦',
    signpost: '🪧', bed_bare: '🟫', bed_young: '🌱', berries_wilted: '🥀', berries_ripe: '🍓', barrel_broken: '🛢️',
    barrel_full: '💧', netting_tangled: '🕸️', netting: '🥅', molehole: '🕳️', weeds_straw: '🌿', straw_mulch: '🌾',
    baskets_tipped: '🧺', baskets_berries: '🍓', stand_broken: '🪵', stand: '🏪', branch_big: '🪵', apples_rotten: '🍂',
    apples_basket: '🍎', wall_rubble: '🪨', wall: '🧱', crate_broken: '📦', crates_apples: '🍏', stump: '🪵',
    stump_table: '🍄', beehive_broken: '📦', beehive: '🐝', brambles: '🌵', swing_broken: '🪢', swing: '🎠', sapling: '🌳',
    picnic: '🧺',
};

let fixLand = 'barn'; // the land the place shows
let fixing = false;   // a fix is playing: hands off until it's done
const jobProgress = {}; // items made so far per job, to cheer each one

const ZONE = Object.fromEntries(ZONES.map(z => [z.id, z]));

function landZones(land) {
    return ZONES.filter(z => z.land === land);
}

function zoneTasks(id) {
    return TASKS.filter(t => t.zone === id);
}

function zoneDone(zone) {
    return zoneTasks(zone.id).every(taskDone);
}

// Open: the land is yours, its level is reached and the area before it is done.
function zoneOpen(zone) {
    if (layoutMode && (ASSETS.plots || {})[zone.id]) return true; // ?layout: every plot to work on
    if (!unlocks[zone.land] || quests.level < zone.level) return false;
    const list = landZones(zone.land);
    const i = list.indexOf(zone);
    return i === 0 || zoneDone(list[i - 1]);
}

// What a locked area waits for, for its sign.
function zoneWaitsFor(zone) {
    const list = landZones(zone.land);
    const before = list[list.indexOf(zone) - 1];
    if (before && !zoneDone(before)) return `Finish ${before.name}`;
    return `Level ${zone.level}`;
}

// The jobs fixed at a spot in a land's place (or on the town square).
function fixJobs(land) {
    return landTasks(land).filter(t => t.look);
}

// Into a land's place (the town square for the town). With a job: to its spot,
// lit up, and up comes its card. Jobs are only ever fixed there, by hand.
function goFix(land, jobId) {
    if (land === 'town') goTo('town');
    else {
        fixLand = land;
        const task = jobId && TASKS.find(t => t.id === jobId);
        const zone = task ? ZONE[task.zone] : landZones(land).find(z => zoneOpen(z) && !zoneDone(z)) || landZones(land)[0];
        if (zone && inWorld(zone)) {
            goTo('map');
            if (!task) document.querySelector(`#scene-map .world-tile[data-zone="${zone.id}"]`)?.scrollIntoView({ block: 'center', inline: 'center' });
        } else if (zone) openAreaPage(zone);
        else goTo('fix');
    }
    if (jobId) pointAtJob(TASKS.find(t => t.id === jobId));
}

// Story bubbles wait while you're being taken to a job, so its card isn't lost.
let storyHoldUntil = 0;

function pointAtJob(task) {
    const spot = document.querySelector(`.scene:not([hidden]) [data-job="${task.id}"]`);
    if (spot) {
        spot.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        spot.classList.add('spotlight');
    }
    storyHoldUntil = Date.now() + 1500;
    // The card comes up once nothing else is showing (a bubble already open goes first).
    const card = (tries = 0) => {
        if (taskDone(task) || tries > 60) return;
        if (dialogEl.hidden && !document.body.classList.contains('busy')) openTaskCard(task); // after any unlock animation
        else setTimeout(() => card(tries + 1), 400);
    };
    setTimeout(card, 700);
}

// Where an unfinished job can be worked on: the board its missing items come
// from, or the Market for a land still to buy.
function goWork(task) {
    const itemNeed = task.needs.find(n => n.item && needProgress(task, n).have < n.n);
    if (task.needs[0].own) goTo('market');
    else if (itemNeed) goTo(unlocks[needBoard(itemNeed)] ? needBoard(itemNeed) : 'market');
    else goTo(unlocks[task.land] ? task.land : task.land === 'town' ? 'town' : 'map');
}

// What stands at a job's spot, before or after (fixed): its object's picture,
// its emoji until drawn, or nothing ('').
function fixFace(task, fixed) {
    const key = task.look[fixed ? 1 : 0];
    const art = (ASSETS.objects || {})[key];
    if (art) return `<img src="${art}" alt="" draggable="false">`;
    return OBJECT_EMOJI[key] || key;
}

// What an open job asks for, as a pin over its spot like Merge Mansion's task
// bubbles: each item with a ✓ once you have enough of it.
function needPins(task) {
    return task.needs.map(n => {
        const p = needProgress(task, n);
        const icon = n.item ? itemIcon(n.item, n.tier) : n.stat ? statIcon(n.stat) : '🏡';
        return `<span class="pin-item${p.have >= p.of ? ' met' : ''}">${icon}${p.of > 1 ? `<small>${p.have}/${p.of}</small>` : ''}</span>`;
    }).join('');
}

// Jobs fixed at a spot (a thing in a land's place, or a house in town); buying
// a land has none.
function hasSpot(task) {
    return !!(task.look || task.house);
}

// The things to fix in an area (or on the town square), each a button: open
// jobs carry a pin of what they need, later ones wait greyed out, fixed ones
// show their new look (or are gone). Jobs without a place of their own yet
// take the next free slot.
function addFixSpots(tasks, el) {
    tasks.forEach((task, i) => {
        const done = taskDone(task);
        if (done && !task.look[1]) return; // cleared away
        const [x, y] = task.at || ZONE_SLOTS[i % ZONE_SLOTS.length];
        const open = taskOpen(task);
        const spot = document.createElement('button');
        const face = fixFace(task, done);
        spot.className = 'fix-spot ' + (done ? 'fixed' : open ? 'open' + (taskReady(task) ? ' ready' : '') : 'later')
            + (face.startsWith('<img') ? ' pictured' : '') + (!task.look[0] && !done ? ' to-build' : '');
        spot.dataset.job = task.id;
        spot.style.left = x + '%';
        spot.style.top = y + '%';
        spot.style.zIndex = 20 + Math.round(y);
        spot.style.setProperty('--depth', (0.85 + 0.3 * (y / 100)).toFixed(2)); // further up = further away = smaller
        spot.style.setProperty('--size', OBJECT_SIZE[task.look[done ? 1 : 0]] || 11);
        spot.innerHTML = `<span class="fix-face">${face || uiIcon('sparkle', '✨')}</span>`;
        if (open) addTag(spot, 'task-pin' + (taskReady(task) ? ' ready' : ''), needPins(task));
        spot.addEventListener('click', () => tapFix(task));
        el.appendChild(spot);
    });
}

// An area: its picture, faded where it's still broken; its things to fix; and
// a sign with its name and progress. Locked, it hides under clouds with a
// padlock saying what it waits for.
function renderZone(zone) {
    const el = document.createElement('section');
    const tasks = zoneTasks(zone.id);
    const done = tasks.filter(taskDone).length;
    const open = zoneOpen(zone);
    el.className = 'zone' + (open ? '' : ' locked') + (done === tasks.length ? ' zone-done' : '');
    el.dataset.zone = zone.id;
    const stages = (ASSETS.stages || {})[zone.id];
    if ((ASSETS.plots || {})[zone.id]) paintPlotZone(el, zone, tasks, open);
    else if (stages) {
        // Painted: the whole area is one painting of how far along it is, tall
        // enough to scroll; its open jobs are bubbles over the painted mess.
        const pic = stages[stageIndex(done, tasks.length)];
        el.classList.add('painted');
        el.innerHTML = `<div class="zone-backdrop" style="background-image:url('${pic}')"></div>
                        <div class="zone-scroll"><div class="zone-frame"><img class="zone-art" src="${pic}" alt="" draggable="false"><img class="zone-worn" src="${pic}" alt="" draggable="false">${ambience('zone')}</div></div>`;
        const art = el.querySelector('.zone-art');
        if (art.complete && art.naturalWidth) paintWear(el, zone.id);
        else art.addEventListener('load', () => paintWear(el, zone.id), { once: true });
        if (open) addJobChips(tasks, el.querySelector('.zone-frame'));
    } else paintOldZone(el, zone, tasks, open);
    if (!open) {
        el.insertAdjacentHTML('beforeend', `<div class="zone-clouds"></div>
            <div class="zone-lock">${uiIcon('lock', '🔒')}<small>${zoneWaitsFor(zone)}</small></div>`);
    }
    return el;
}

// An area not painted yet: its picture (or a stand-in) faded where it's still
// broken, with the things to fix standing on it.
function paintOldZone(el, zone, tasks, open) {
    const art = (ASSETS.areas || {})[zone.id];
    // No picture yet: a window onto the painted farm map stands in, a different
    // stretch of it for each area.
    const picture = `url('${art || ASSETS.scenes.map}')`;
    const crop = art ? '' : `;background-size:100% auto;background-position:center ${(ZONES.indexOf(zone) * 37) % 100}%`;
    if (!art) el.classList.add('stand-in');
    // A whole screen of its own: the picture in its frame, and behind it a soft,
    // blurred copy filling the rest of the screen.
    el.innerHTML = `<div class="zone-backdrop" style="background-image:${picture}${crop}"></div>
                    <div class="zone-frame" style="--aspect:${zone.aspect || 1}">
                        <div class="zone-art" style="background-image:${picture}${crop}"></div>
                        <div class="zone-worn" style="background-image:${picture}${crop}"></div>
                    </div>`;
    wearZone(el, tasks);
    if (open) addFixSpots(tasks, el.querySelector('.zone-frame'));
}

// --- PLOTS ---
// An area drawn as a plot: the diorama on a meadow, bigger than the screen, so
// you drag it about (and pinch or ctrl+scroll to zoom). Faded where its jobs
// are still to do, like a painted area, with each job's prop standing on it.
const PLOT_ZOOM = [1, 1.7, 3]; // least, first and most: the plot's width over the screen's
const plotViews = {}; // each plot's zoom and the point in the middle of the screen
const layoutMode = /[?&]layout\b/.test(location.search);

// A job's place on its plot: [prop, % across, % down, width], moved by ?layout.
function plotJob(task) {
    return (layoutMode && plotLayout()[task.id]) || PLOT_JOBS[task.id] || null;
}

// The prop a job shows before it's done, or once it is (or none).
function plotProp(task, done) {
    const [prop] = plotJob(task) || [];
    if (!prop) return null;
    const [before, after = ''] = prop.split('>');
    return (done ? after : before) || null;
}

// Where a job's ring sits on its plot: over its prop's middle, or its spot.
function plotAt(task) {
    const job = plotJob(task);
    if (!job || !(ASSETS.plots || {})[task.zone]) return null;
    const [, x, y, w] = job;
    return [x, w ? y - Math.abs(w) * 0.6 : y];
}

// Where a job's prop stands: its own place first, then any copies.
function propPlaces(task) {
    const [, x, y, w, more] = plotJob(task);
    return [[x, y, w], ...(more || [])];
}

// Copy k (0 = the prop itself) of a job's prop, standing on the plot.
function addProp(stage, task, name, cls = '', k = 0) {
    const [x, y, w] = propPlaces(task)[k];
    const prop = document.createElement('span');
    prop.className = 'plot-prop' + (cls ? ' ' + cls : '');
    prop.dataset.prop = task.id;
    prop.dataset.copy = k;
    prop.style.cssText = `left:${x}%;top:${y}%;width:${Math.abs(w)}%;z-index:${Math.round(y)}`;
    prop.innerHTML = `<img src="${ASSETS.plotProps[name]}" alt="" draggable="false"${w < 0 ? ' class="flip"' : ''}>`;
    stage.appendChild(prop);
    return prop;
}

function paintPlotZone(el, zone, tasks, open) {
    const pic = ASSETS.plots[zone.id];
    el.classList.add('plotted');
    el.innerHTML = `<div class="plot-meadow"></div>
        <div class="plot-view"><div class="plot-pad"><div class="plot-stage">
            <img class="zone-art plot-art" src="${pic}" alt="" draggable="false">
        </div></div></div>`;
    const stage = el.querySelector('.plot-stage');
    tasks.forEach(task => {
        const name = plotProp(task, taskDone(task));
        if (name) propPlaces(task).forEach((_, k) => addProp(stage, task, name, '', k));
    });
    if (open && !layoutMode) addJobChips(tasks, stage);
    // Bubbles stand in front of every prop.
    stage.querySelectorAll('.fix-spot').forEach(spot => { spot.style.zIndex = 200 + parseInt(spot.style.zIndex, 10); });
    const art = el.querySelector('.zone-art');
    const ready = () => { plotViewer(el, zone, tasks); if (layoutMode) layoutPlot(el, zone, tasks); };
    if (art.complete && art.naturalWidth) requestAnimationFrame(ready);
    else art.addEventListener('load', ready, { once: true });
}

// A plot page's view: the first job to do in the middle the first time.
function plotViewer(el, zone, tasks) {
    const st = plotViews[zone.id] || (plotViews[zone.id] = { zoom: PLOT_ZOOM[1] });
    panZoom(el.querySelector('.plot-view'), el.querySelector('.plot-stage'), st, PLOT_ZOOM, () => {
        const i = tasks.findIndex(t => taskOpen(t)), at = i >= 0 ? jobAt(tasks[i], i) : [50, 50];
        return [at[0] / 100, at[1] / 100];
    });
}

// Dragging, pinching and zooming a big picture (a plot, or the world). The view
// scrolls (overflow hidden, so scrollIntoView still finds its spots); a drag
// that moved doesn't count as a tap. `limits`: least, first and most zoom (the
// stage's width over the view's), and below the fourth the bubbles hide.
// `first()` gives the point to start in the middle of (fractions across, down);
// `settled()`, if given, runs once the view stops moving.
function panZoom(view, stage, st, limits, first, settled) {
    const far = () => view.classList.toggle('far', st.zoom < (limits[3] || 0));
    const zoomTo = (z, cx = view.clientWidth / 2, cy = view.clientHeight / 2) => {
        const fx = (view.scrollLeft + cx) / stage.offsetWidth, fy = (view.scrollTop + cy - stage.offsetTop) / stage.offsetHeight;
        st.zoom = Math.min(limits[2], Math.max(limits[0], z));
        stage.style.width = st.zoom * 100 + '%';
        far();
        view.scrollLeft = fx * stage.offsetWidth - cx;
        view.scrollTop = fy * stage.offsetHeight + stage.offsetTop - cy;
    };
    const centre = (fx, fy) => {
        view.scrollLeft = fx * stage.offsetWidth - view.clientWidth / 2;
        view.scrollTop = fy * stage.offsetHeight + stage.offsetTop - view.clientHeight / 2;
    };
    stage.style.width = st.zoom * 100 + '%';
    far();
    if (st.fx === undefined) centre(...first());
    else centre(st.fx, st.fy);
    const pts = new Map();
    let still = 0;
    view.addEventListener('scroll', () => {
        st.fx = (view.scrollLeft + view.clientWidth / 2) / stage.offsetWidth;
        st.fy = (view.scrollTop + view.clientHeight / 2 - stage.offsetTop) / stage.offsetHeight;
        clearTimeout(still);
        if (settled) still = setTimeout(function wait() { if (pts.size) still = setTimeout(wait, 200); else settled(); }, 250);
    }, { passive: true });
    let last = null, moved = false, dragged = false, glide = 0;
    const now = () => {
        const p = [...pts.values()];
        const x = p.reduce((a, q) => a + q.x, 0) / p.length, y = p.reduce((a, q) => a + q.y, 0) / p.length;
        return { x, y, d: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0, n: p.length, t: performance.now(), vx: 0, vy: 0 };
    };
    view.addEventListener('pointerdown', e => {
        cancelAnimationFrame(glide);
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 1) moved = false;
        last = now();
    });
    view.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const cur = now();
        if (cur.n !== last.n) { last = cur; return; }
        if (!moved && Math.hypot(cur.x - last.x, cur.y - last.y) < 8 && cur.n < 2) return;
        moved = true;
        view.classList.add('dragging');
        if (cur.n > 1 && last.d) {
            const r = view.getBoundingClientRect();
            zoomTo(st.zoom * cur.d / last.d, cur.x - r.left, cur.y - r.top);
        }
        view.scrollLeft -= cur.x - last.x;
        view.scrollTop -= cur.y - last.y;
        const dt = Math.max(1, cur.t - last.t);
        cur.vx = (cur.x - last.x) / dt;
        cur.vy = (cur.y - last.y) / dt;
        last = cur;
    });
    const up = e => {
        if (!pts.delete(e.pointerId)) return;
        if (pts.size) { last = now(); return; }
        view.classList.remove('dragging');
        dragged = moved;
        if (!moved || performance.now() - last.t > 80) return;
        // Let it glide on and slow down.
        let { vx, vy } = last, t0 = performance.now();
        const step = t => {
            const dt = t - t0;
            t0 = t;
            view.scrollLeft -= vx * dt;
            view.scrollTop -= vy * dt;
            vx *= Math.pow(0.94, dt / 16);
            vy *= Math.pow(0.94, dt / 16);
            if (Math.hypot(vx, vy) > 0.02) glide = requestAnimationFrame(step);
        };
        glide = requestAnimationFrame(step);
    };
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);
    view.addEventListener('click', e => {
        if (!dragged) return;
        dragged = false;
        e.stopPropagation();
        e.preventDefault();
    }, true);
    view.addEventListener('wheel', e => {
        e.preventDefault();
        const r = view.getBoundingClientRect();
        if (e.ctrlKey) zoomTo(st.zoom * Math.exp(-e.deltaY / 200), e.clientX - r.left, e.clientY - r.top);
        else { view.scrollLeft += e.deltaX; view.scrollTop += e.deltaY; }
    }, { passive: false });
}

// ?layout: placing the props. Every prop (and spot without one) shows with its
// job's name; drag it to move it, pick it and use − / + to size it, and Copy
// gives every position as text to send back. Moves are kept in this browser.
const LAYOUT_KEY = 'merge-farmstead-layout';

function plotLayout() {
    try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {}; } catch (e) { return {}; }
}

function saveLayout(id, job) {
    const all = plotLayout();
    all[id] = job;
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(all)); } catch (e) { /* kept for this visit only */ }
}

// Jobs whose place has been saved in ?layout (ticked in its menu).
const LAYOUT_DONE_KEY = 'merge-farmstead-layout-done';

function layoutDone() {
    try { return JSON.parse(localStorage.getItem(LAYOUT_DONE_KEY)) || []; } catch (e) { return []; }
}

function setLayoutDone(id, done) {
    const list = layoutDone().filter(x => x !== id);
    if (done) list.push(id);
    try { localStorage.setItem(LAYOUT_DONE_KEY, JSON.stringify(list)); } catch (e) { /* this visit only */ }
}

const layoutJob = {}; // the job being placed on each plot

// One job at a time: pick it in the menu (or take the next one not done yet),
// and only its prop (and any copies) shows. Save ticks it off, hides it and
// moves on to the next.
function layoutPlot(el, zone, tasks) {
    const stage = el.querySelector('.plot-stage'), view = el.querySelector('.plot-view');
    stage.querySelectorAll('.plot-prop').forEach(p => p.remove());
    const jobs = tasks.filter(plotJob);
    const plotted = ZONES.filter(z => (ASSETS.plots || {})[z.id]);
    const panel = document.createElement('div');
    panel.className = 'layout-panel';
    panel.innerHTML = `<div class="layout-row"><select class="layout-plot">${plotted.map(z => `<option value="${z.id}"${z === zone ? ' selected' : ''}>${z.name}</option>`).join('')}</select>
            <span class="layout-count"></span></div>
        <div class="layout-row"><select class="layout-job"></select></div>
        <div class="layout-row layout-tools"><button data-k="smaller" title="Smaller">−</button><button data-k="bigger" title="Bigger">＋</button>
            <button data-k="copy" title="Add a copy">⧉</button><button data-k="flip" title="Mirror">⇄</button>
            <button data-k="delete" title="Remove this copy">🗑</button><button data-k="save" class="layout-save">✓ Save</button></div>
        <div class="layout-row"><button data-k="send" class="layout-send">📋 Send all to Claude</button></div>`;
    el.appendChild(panel);
    const jobMenu = panel.querySelector('.layout-job');
    let current = null, picked = null;
    const fillMenu = () => {
        const done = layoutDone();
        jobMenu.innerHTML = jobs.map(t => `<option value="${t.id}"${current && t.id === current.id ? ' selected' : ''}>${done.includes(t.id) ? '✓ ' : '• '}${t.name}${plotJob(t)[0] ? '' : ' (no prop)'}</option>`).join('');
        panel.querySelector('.layout-count').textContent = `${jobs.filter(t => done.includes(t.id)).length}/${jobs.length} saved`;
    };
    const place = (task, k) => propPlaces(task)[k];
    const setPlace = (task, k, xyw) => {
        const j = [...plotJob(task)];
        if (k === 0) { j[1] = xyw[0]; j[2] = xyw[1]; if (j[3] !== undefined) j[3] = xyw[2]; }
        else { j[4] = (j[4] || []).map(c => [...c]); j[4][k - 1] = xyw; }
        saveLayout(task.id, j);
    };
    const pick = handle => {
        stage.querySelectorAll('.layout.picked').forEach(h => h.classList.remove('picked'));
        handle.classList.add('picked');
        picked = { handle, k: Number(handle.dataset.copy || 0) };
    };
    const handleFor = (task, k) => {
        const [prop] = plotJob(task);
        const name = prop && (prop.split('>')[0] || prop.split('>')[1]);
        let handle;
        if (name) handle = addProp(stage, task, name, 'layout', k);
        else {
            const [x, y] = place(task, 0);
            handle = document.createElement('span');
            handle.className = 'plot-dot layout';
            handle.dataset.prop = task.id;
            handle.dataset.copy = 0;
            handle.style.cssText = `left:${x}%;top:${y}%`;
            stage.appendChild(handle);
        }
        handle.insertAdjacentHTML('beforeend', `<b class="layout-name">${task.name}${k ? ` ×${k + 1}` : ''}</b>`);
        handle.addEventListener('pointerdown', e => {
            e.stopPropagation(); // moves the prop, not the plot
            e.preventDefault();
            pick(handle);
            const r = stage.getBoundingClientRect(), start = place(task, k);
            const dx = e.clientX - (r.left + (start[0] / 100) * r.width), dy = e.clientY - (r.top + (start[1] / 100) * r.height);
            const move = ev => {
                const at = [...place(task, k)];
                at[0] = Math.round(((ev.clientX - dx - r.left) / r.width) * 1000) / 10;
                at[1] = Math.round(((ev.clientY - dy - r.top) / r.height) * 1000) / 10;
                handle.style.left = at[0] + '%';
                handle.style.top = at[1] + '%';
                handle.style.zIndex = Math.round(at[1]);
                setPlace(task, k, at);
            };
            const done = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', done); };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', done);
        });
        return handle;
    };
    // Show one job: its prop and copies on the plot, in the middle of the screen.
    const show = task => {
        stage.querySelectorAll('.layout').forEach(h => h.remove());
        current = task;
        layoutJob[zone.id] = task && task.id;
        picked = null;
        fillMenu();
        panel.querySelector('.layout-tools').hidden = !task;
        if (!task) {
            panel.querySelector('.layout-count').textContent = `All ${jobs.length} saved ✓`;
            return;
        }
        const handles = propPlaces(task).map((_, k) => (k === 0 || plotJob(task)[0] ? handleFor(task, k) : null)).filter(Boolean);
        pick(handles[0]);
        requestAnimationFrame(() => {
            const r = handles[0].getBoundingClientRect(), v = view.getBoundingClientRect();
            view.scrollLeft += r.left + r.width / 2 - (v.left + v.width / 2);
            view.scrollTop += r.top + r.height / 2 - (v.top + v.height * 0.4);
        });
    };
    const next = () => jobs.find(t => !layoutDone().includes(t.id)) || null;
    show(jobs.find(t => t.id === layoutJob[zone.id]) || next());
    jobMenu.addEventListener('change', () => show(jobs.find(t => t.id === jobMenu.value)));
    panel.querySelector('.layout-plot').addEventListener('change', e => {
        const to = ZONE[e.target.value];
        fixLand = to.land;
        goTo('fix');
        const w = document.querySelector('#scene-fix .world'), z = w && w.querySelector(`.zone[data-zone="${to.id}"]`);
        if (z) w.scrollLeft = z.offsetLeft;
    });
    panel.addEventListener('click', e => {
        const b = e.target.closest('button'), k = b && b.dataset.k;
        if (!k) return;
        if (k === 'send') return saveLayoutText();
        if (!current) return;
        const task = current;
        if (k === 'save') {
            setLayoutDone(task.id, true);
            toast(`✓ ${task.name}`);
            return show(next());
        }
        if (!plotJob(task)[0]) return toast('This job has no prop: just drag its dot');
        if (!picked) return;
        const { handle } = picked, at = [...place(task, picked.k)];
        if (k === 'smaller' || k === 'bigger') {
            const size = Math.max(2, Math.abs(at[2]) + (k === 'bigger' ? 1 : -1));
            at[2] = at[2] < 0 ? -size : size;
            handle.style.width = size + '%';
            setPlace(task, picked.k, at);
        } else if (k === 'flip') {
            at[2] = -at[2];
            handle.querySelector('img').classList.toggle('flip', at[2] < 0);
            setPlace(task, picked.k, at);
        } else if (k === 'copy') {
            const j = [...plotJob(task)];
            j[4] = [...(j[4] || []), [Math.min(95, at[0] + 4), Math.min(95, at[1] + 3), at[2]]];
            saveLayout(task.id, j);
            pick(handleFor(task, j[4].length));
        } else if (k === 'delete') {
            if (!picked.k) return toast('Only copies can be removed');
            const j = [...plotJob(task)];
            j[4] = j[4].filter((_, i) => i !== picked.k - 1);
            if (!j[4].length) j.length = 4;
            saveLayout(task.id, j);
            show(task); // redraw, so the other copies keep their numbers
        }
    });
}

// Save: the layout is kept on this device already; this also copies every
// plot's positions (as PLOT_JOBS lines) to paste back to Claude for the game.
function saveLayoutText() {
    const text = TASKS.filter(t => (ASSETS.plots || {})[t.zone] && plotJob(t)).map(t => `${t.id}: ${JSON.stringify(plotJob(t))},`).join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    showDialog({
        title: '📋 Copied',
        body: `<p>Every plot's positions are copied. Paste them to Claude to put them in the game for everyone. (Your work is also kept on this device.)</p><textarea class="layout-text" readonly>${text}</textarea>`,
        actions: [{ label: 'OK', primary: true }],
    });
}

// --- THE WORLD ---
// The whole farm as one big meadow you drag about and zoom: each area a tile
// (its plot, or a plain patch until it's drawn), each land's areas in a row,
// the lands one under the other, joined by dirt paths, and the Market and Town
// Square up front. Land you don't own yet waits under clouds with its sign.
const WORLD_CELLS = {
    market: [-2.46, -0.65], town: [-1, 0.95],
    barnyard: [0, 0], henhouse: [1, 0], bigbarn: [2, 0],
    fieldgate: [0, 1], berryrows: [1, 1], orchard: [2, 1],
    meadow: [0, 2], stables: [1, 2], windmill: [2, 2],
    leafpiles: [0, 3], compostbins: [1, 3], mushrooms: [2, 3],
    muddyshore: [0, 4], lilypond: [1, 4], boatdock: [2, 4],
    gardengate: [0, 5], rosearch: [1, 5], greenhouse: [2, 5],
};
// Where each plot's ground diamond sits in its picture: its middle (% across,
// % down), its width (% of the picture's) and the picture's height over width.
const PLOT_SHAPE = {
    barnyard: [50, 53, 97.5, 0.759], henhouse: [50, 54, 97.5, 0.72],
    bigbarn: [50, 58, 97.2, 0.852], fieldgate: [50, 52, 97.8, 0.609],
    town: [50, 50, 95, 0.614], market: [50, 52, 117, 1.558], // the Market is a tall strip: drawn 855 wide
    berryrows: [50, 50.8, 97.7, 0.606], orchard: [49.8, 50.4, 97.4, 0.599], meadow: [49.8, 50.9, 97.7, 0.611],
    stables: [49.9, 51.5, 97.8, 0.617], windmill: [50, 51.3, 97.7, 0.615], leafpiles: [50, 51.4, 97.7, 0.617],
    mushrooms: [50.2, 51.8, 90.8, 0.573], muddyshore: [50, 50.8, 97.7, 0.607], lilypond: [50, 51.7, 97.7, 0.615],
    boatdock: [50.2, 50.4, 98.2, 0.604], gardengate: [50, 51.8, 97.6, 0.616],
};
const WORLD_TILE = 1000;           // a tile's ground width, in world units
const WORLD_STEP = [610, 370];     // half the step from one cell to the next, across and down
// How much of the world shows across the screen, in world units: first, at
// the closest, and where the bubbles hide (the furthest out shows it all).
const WORLD_SPAN = [340, 170, 900];
const worldView = {};

function cellXY(id) {
    const [u, v] = WORLD_CELLS[id];
    return [(u - v) * WORLD_STEP[0], (u + v) * WORLD_STEP[1]];
}

// The world's size: every cell with room around it.
const WORLD_BOX = (() => {
    const pts = Object.keys(WORLD_CELLS).map(cellXY);
    const x0 = Math.min(...pts.map(p => p[0])) - WORLD_TILE, x1 = Math.max(...pts.map(p => p[0])) + WORLD_TILE;
    const y0 = Math.min(...pts.map(p => p[1])) - WORLD_TILE, y1 = Math.max(...pts.map(p => p[1])) + WORLD_TILE * 0.8;
    return { x0, y0, w: x1 - x0, h: y1 - y0 };
})();

const WORLD_ZOOM = [1.2, ...WORLD_SPAN.map(span => WORLD_BOX.w / span)]; // least, first and most zoom, and where the bubbles hide
worldView.zoom = WORLD_ZOOM[1];

// Places an element over a box of the world (world units).
function worldPlace(el, x, y, w, h) {
    el.style.left = ((x - WORLD_BOX.x0) / WORLD_BOX.w) * 100 + '%';
    el.style.top = ((y - WORLD_BOX.y0) / WORLD_BOX.h) * 100 + '%';
    el.style.width = (w / WORLD_BOX.w) * 100 + '%';
    el.style.height = (h / WORLD_BOX.h) * 100 + '%';
}

// An area is shown in the world once it's drawn as a plot (?layout keeps the
// plot pages, to place props on).
function inWorld(zone) {
    return !layoutMode && !!(ASSETS.plots || {})[zone.id];
}

// The dirt paths: along each land's row, down from land to land, and from the
// Market and the Town Square to the Barnyard. Each is drawn three times: trodden
// grass, a soft edge, then the dirt itself.
function worldPaths() {
    const links = [['market', 'barnyard'], ['town', 'barnyard'], ['market', 'town']];
    Object.keys(AREAS).forEach((land, k, lands) => {
        const zones = landZones(land);
        zones.slice(1).forEach((z, i) => links.push([zones[i].id, z.id]));
        if (k) links.push([landZones(lands[k - 1])[0].id, zones[0].id]);
    });
    const line = ([a, b], cls) => { const [x1, y1] = cellXY(a), [x2, y2] = cellXY(b); return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; };
    return ['path-wear', 'path-edge', 'path-dirt'].map(cls => links.map(l => line(l, cls)).join('')).join('');
}

// --- THE FOG ---
// Everything not yet yours lies under one big soft fog, as in Merge Mansion:
// clear only around the areas you've opened, the Market and the Town Square,
// with soft edges.
function fogHoles() {
    const holes = ZONES.filter(z => zoneOpen(z) && !layoutMode).map(z => [...cellXY(z.id), WORLD_TILE * 0.78, WORLD_TILE * 0.5]);
    ['market', 'town'].forEach(id => {
        const [bx, by, bw, bh] = (ASSETS.plots || {})[id] ? plotBox(id) : [...cellXY(id).map((v, i) => v - (i ? 250 : 420)), 840, 500];
        holes.push([bx + bw / 2, by + bh / 2, bw * 0.78, bh * (bh > bw ? 0.62 : 0.72)]);
    });
    return holes;
}

function addFog(stage, ui) {
    stage.querySelector('.world-fog')?.remove();
    const { x0, y0, w, h } = WORLD_BOX;
    // Puffs of cloud on a pale haze, repeating; holes fade from clear to fog.
    let puffs = '';
    const scatter = k => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); }; // the same every time
    for (let k = 0; k < 16; k++) {
        const px = scatter(k) * 600, py = scatter(k + 50) * 420, r = 55 + scatter(k + 99) * 80;
        // and its copies across the tile's edges, so the pattern joins up without seams
        for (const dx of [-600, 0, 600]) for (const dy of [-420, 0, 420]) puffs += `<circle cx="${px + dx}" cy="${py + dy}" r="${r}" fill="url(#fog-puff)"/>`;
    }
    const holes = fogHoles().map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#fog-hole)"/>`).join('');
    stage.insertAdjacentHTML('beforeend', `<svg class="world-fog" viewBox="${x0} ${y0} ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
        <defs>
            <radialGradient id="fog-puff"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
            <radialGradient id="fog-hole"><stop offset="0.62" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
            <pattern id="fog-puffs" width="600" height="420" patternUnits="userSpaceOnUse">${puffs}</pattern>
            <mask id="fog-mask" maskUnits="userSpaceOnUse" x="${x0}" y="${y0}" width="${w}" height="${h}">
                <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff"/>${holes}
            </mask>
        </defs>
        <g mask="url(#fog-mask)">
            <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#e9f0f7" fill-opacity="0.93"/>
            <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#fog-puffs)"/>
        </g>
    </svg>`);
}

// --- SCENERY ---
// Trees, bushes and flowers on the meadow between and around the areas, each
// at its real size (world units tall) next to the farmer (88) and a barn (250).
// Placed the same way every time; trees only where they can't hide an area.
const SCENERY = { // height, width over height, how often (by weight)
    oak: [210, 324 / 348, 3], pine: [240, 252 / 360, 3], maple: [180, 268 / 316, 2], bush: [62, 245 / 216, 4],
    stump: [40, 246 / 201, 1], cattails: [52, 355 / 308, 2], lavender: [30, 341 / 264, 3], tulips: [26, 302 / 228, 3],
};
const GROUND_TILE = 420; // the meadow picture repeats every this many world units across
let sceneryCache = null;

// The scenery near the clearings (deep in the fog nothing can be seen, so
// nothing is placed there). Made again when a clearing opens.
function sceneryPlaces() {
    const holes = fogHoles(), key = JSON.stringify(holes);
    if (sceneryCache && sceneryCache.key === key) return sceneryCache.list;
    const seen = (x, y) => holes.some(([cx, cy, rx, ry]) => ((x - cx) / (rx * 1.15)) ** 2 + ((y - cy) / (ry * 1.25)) ** 2 <= 1);
    let seed = 20261016;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const { x0, y0, w, h } = WORLD_BOX;
    // What has to stay clear: every area's ground (a diamond), the Market's and
    // Town's pictures, and the dirt paths.
    const grounds = ZONES.map(z => cellXY(z.id));
    const places = ['market', 'town'].filter(id => (ASSETS.plots || {})[id]).map(id => plotBox(id));
    const paths = [...worldPaths().matchAll(/class="path-dirt" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)].map(m => m.slice(1).map(Number));
    const onGround = (x, y, pad) => grounds.some(([cx, cy]) => Math.abs(x - cx) / (WORLD_TILE * 0.52 + pad) + Math.abs(y - cy) / (WORLD_TILE * 0.31 + pad * 0.6) <= 1)
        || places.some(([bx, by, bw, bh]) => x > bx - pad && x < bx + bw + pad && y > by - pad && y < by + bh + pad);
    const nearPath = (x, y, r) => paths.some(([x1, y1, x2, y2]) => {
        const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2 || 1, t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / len2));
        return Math.hypot(x - x1 - t * (x2 - x1), y - y1 - t * (y2 - y1)) < r;
    });
    const kinds = Object.keys(SCENERY), total = kinds.reduce((s, k) => s + SCENERY[k][2], 0);
    const pick = () => { let r = rand() * total; return kinds.find(k => (r -= SCENERY[k][2]) < 0) || kinds[0]; };
    const out = [], step = 120;
    for (let gy = y0 + 60; gy < y0 + h; gy += step * 0.6) {
        for (let gx = x0 + 40; gx < x0 + w; gx += step) {
            const x = gx + (rand() - 0.5) * step * 0.9, y = gy + (rand() - 0.5) * step * 0.5;
            if (rand() < 0.35 || !seen(x, y) || onGround(x, y, 30) || nearPath(x, y, 70) || y - 260 < y0 || x < x0 + 80 || x > x0 + w - 80) continue;
            let kind = pick();
            const [ht, ar] = SCENERY[kind];
            // A tall thing must not stand in front of an area (its top would cover it).
            if (ht > 100 && ([0.3, 0.6, 0.9].some(f => onGround(x, y - ht * f, 10) || onGround(x - ht * ar * 0.4, y - ht * f, 10) || onGround(x + ht * ar * 0.4, y - ht * f, 10)))) {
                kind = rand() < 0.5 ? 'bush' : 'lavender';
            }
            out.push({ kind, x, y, flip: rand() < 0.5 });
        }
    }
    sceneryCache = { key, list: out };
    return out;
}

function addScenery(stage, ui) {
    const pics = (ASSETS.world || {}).scenery;
    if (!pics) return;
    const frag = document.createDocumentFragment();
    sceneryPlaces().forEach(({ kind, x, y, flip }) => {
        const [ht, ar] = SCENERY[kind], wd = ht * ar;
        const el = document.createElement('img');
        el.className = 'world-thing' + (flip ? ' flip' : '');
        el.src = pics[kind];
        el.alt = '';
        el.draggable = false;
        el.decoding = 'async';
        worldPlace(el, x - wd / 2, y - ht, wd, ht);
        el.style.zIndex = Math.round(y - WORLD_BOX.y0);
        frag.appendChild(el);
    });
    stage.insertBefore(frag, ui);
}

function renderWorld(scene) {
    const wrap = document.createElement('div');
    wrap.className = 'world-wrap';
    const { x0, y0, w, h } = WORLD_BOX, dirt = (ASSETS.world || {}).dirt;
    wrap.innerHTML = `<div class="plot-view world-view"><div class="plot-pad"><div class="world-stage" style="aspect-ratio:${w}/${h}">
        <svg class="world-paths${dirt ? ' textured' : ''}" viewBox="${x0} ${y0} ${w} ${h}" preserveAspectRatio="none">${dirt
            ? `<defs><pattern id="world-dirt" patternUnits="userSpaceOnUse" width="240" height="240"><image href="${dirt}" width="240" height="240"/></pattern></defs>` : ''}${worldPaths()}</svg>
        <div class="world-ui"></div></div></div></div>`;
    scene.appendChild(wrap);
    const stage = wrap.querySelector('.world-stage'), ui = wrap.querySelector('.world-ui');
    if ((ASSETS.world || {}).ground) {
        stage.style.backgroundImage = `url('${ASSETS.world.ground}')`;
        stage.style.backgroundSize = `${(GROUND_TILE / w) * 100}% auto`;
    }
    addScenery(stage, ui);
    addFog(stage, ui);
    // The Market and the Town Square: drawn as plots, with their people and
    // banners; until then, their paintings cut to a diamond.
    ['market', 'town'].filter(id => (ASSETS.plots || {})[id]).forEach(id => addPlace(id, stage, ui));
    [['market', 'Market', (ASSETS.stages.market || [])[0], () => goTo('market')], ['town', TOWN_NAME, townPicture(), () => goTo('town')]].forEach(([id, name, pic, go]) => {
        if ((ASSETS.plots || {})[id]) return;
        const [x, y] = cellXY(id);
        const place = document.createElement('button');
        place.className = 'spot world-place';
        place.dataset.id = id;
        place.innerHTML = `<span class="world-diamond" style="background-image:url('${pic}')"></span><span class="spot-label">${name}</span>`;
        worldPlace(place, x - WORLD_TILE * 0.42, y - WORLD_TILE * 0.25, WORLD_TILE * 0.84, WORLD_TILE * 0.5);
        place.style.zIndex = Math.round(y - y0);
        place.addEventListener('click', go);
        stage.insertBefore(place, ui);
        if (id === 'town') {
            const ready = npcs.filter(canFulfill).length;
            if (ready) addTag(place, 'badge', ready);
            const jobs = landTasks('town'), done = jobs.filter(taskDone).length;
            if (done || openTasks().some(t => t.land === 'town')) addTag(place, 'restore-tag', done === jobs.length ? '✨' : `${uiIcon('hammer', '🔨')}${done}/${jobs.length}`);
        } else if (dealsWaiting()) addTag(place, 'badge', '🎁');
    });
    ZONES.forEach(zone => {
        const [x, y] = cellXY(zone.id);
        const tasks = zoneTasks(zone.id), open = zoneOpen(zone);
        const tile = document.createElement('section');
        const twin = document.createElement('div'); // the tile's bubbles and signs, above every tile
        twin.className = 'tile-ui';
        twin.dataset.zone = zone.id;
        tile.dataset.zone = zone.id;
        tile.className = 'zone world-tile' + (open ? '' : ' locked') + (tasks.every(taskDone) ? ' zone-done' : '');
        tile.style.zIndex = Math.round(y - y0);
        if (inWorld(zone)) {
            const [ax, ay, aw, ar] = PLOT_SHAPE[zone.id] || [50, 52, 97.5, 0.75];
            const tw = WORLD_TILE / (aw / 100), th = tw * ar;
            tile.classList.add('plotted');
            tile.innerHTML = `<div class="plot-stage"><img class="zone-art plot-art" src="${ASSETS.plots[zone.id]}" alt="" draggable="false"></div>`;
            const plot = tile.querySelector('.plot-stage');
            tasks.forEach(task => {
                const name = plotProp(task, taskDone(task));
                if (name) propPlaces(task).forEach((_, k) => addProp(plot, task, name, '', k));
            });
            worldPlace(tile, x - (ax / 100) * tw, y - (ay / 100) * th, tw, th);
            worldPlace(twin, x - (ax / 100) * tw, y - (ay / 100) * th, tw, th);
            if (open) addJobChips(tasks, twin);
        } else {
            // Not drawn yet: a plain grassy patch; open, it leads to the area's page.
            tile.classList.add('blank');
            tile.innerHTML = '<span class="world-diamond"></span>';
            worldPlace(tile, x - WORLD_TILE / 2, y - WORLD_TILE * 0.3, WORLD_TILE, WORLD_TILE * 0.6);
            worldPlace(twin, x - WORLD_TILE / 2, y - WORLD_TILE * 0.3, WORLD_TILE, WORLD_TILE * 0.6);
            if (open) {
                const left = tasks.filter(t => !taskDone(t)).length;
                const go = document.createElement('button');
                go.className = 'world-visit';
                go.innerHTML = iconize(`<b>${zone.name}</b><small>${left ? `${uiIcon('hammer', '🔨')} ${left} to fix` : '✨ Done'}</small>`);
                go.addEventListener('click', () => openAreaPage(zone));
                twin.appendChild(go);
            }
        }
        stage.insertBefore(tile, ui);
        ui.appendChild(twin);
        if (!open && unlocks[zone.land]) {
            // Still locked, in the fog: a padlock saying what it waits for.
            const lock = document.createElement('div');
            lock.className = 'world-lock';
            lock.dataset.zone = zone.id;
            worldPlace(lock, x - WORLD_TILE * 0.52, y - WORLD_TILE * 0.42, WORLD_TILE * 1.04, WORLD_TILE * 0.76);
            lock.innerHTML = `<div class="zone-lock">${uiIcon('lock', '🔒')}<small>${zoneWaitsFor(zone)}</small></div>`;
            ui.appendChild(lock);
        }
    });
    // Each land's sign at the start of its row: for sale, or its progress (tap: its board).
    Object.keys(AREAS).forEach(id => {
        const area = AREAS[id];
        const [x, y] = cellXY(landZones(id)[0].id);
        const sign = document.createElement('button');
        sign.className = 'spot world-sign' + (unlocks[id] ? '' : ' locked');
        sign.dataset.id = id;
        sign.innerHTML = `<span class="spot-label">${area.name}</span>`;
        worldPlace(sign, x - WORLD_TILE * 0.72, y - WORLD_TILE * 0.1, WORLD_TILE * 0.3, WORLD_TILE * 0.2);
        sign.addEventListener('click', () => (unlocks[id] ? goTo(id) : offerDeed(id)));
        if (!unlocks[id]) addTag(sign, 'sale-sign', quests.level < area.level ? `${uiIcon('lock', '🔒')} Lv ${area.level}` : `💵 ${shortNumber(area.cost)}`);
        else {
            const list = landTasks(id), done = list.filter(taskDone).length;
            const ready = npcs.filter(n => n.request && n.request.mode === id && canFulfill(n)).length;
            const parts = [ready && `✓${ready}`, crates[id].length && `🎁${crates[id].length}`].filter(Boolean);
            if (parts.length) addTag(sign, 'badge', parts.join(' '));
            sign.classList.toggle('restored', done === list.length);
            addTag(sign, 'restore-tag', done === list.length ? '✨' : `${uiIcon('hammer', '🔨')}${done}/${list.length}`);
        }
        ui.appendChild(sign);
    });
    ui.querySelectorAll('.fix-spot').forEach(spot => { spot.style.zIndex = 200 + parseInt(spot.style.zIndex, 10); });
    const view = wrap.querySelector('.world-view');
    addHero(ui);
    panZoom(view, stage, worldView, WORLD_ZOOM, () => {
        // First time: the first job to do in the world, or the Barnyard.
        const task = openTasks().find(t => t.zone && inWorld(ZONE[t.zone]));
        const zone = task ? ZONE[task.zone] : ZONE.barnyard;
        let [x, y] = cellXY(zone.id);
        if (task && PLOT_SHAPE[zone.id]) {
            const [ax, ay, aw, ar] = PLOT_SHAPE[zone.id], tw = WORLD_TILE / (aw / 100), th = tw * ar, [jx, jy] = jobAt(task, 0);
            x += ((jx - ax) / 100) * tw;
            y += ((jy - ay) / 100) * th;
        }
        return [(x - x0) / w, (y - y0) / h];
    }, () => { heroFollow(view, stage); placesInView(view); });
    requestAnimationFrame(() => placesInView(view, true));
    Object.keys(AREAS).filter(id => unlocks[id]).forEach(id => unlockNewZones(id, stage));
}

// Clara, the farmer: she stands on the farm's paths and grass, never on water,
// a building or a mess. She turns up at each job you tap or fix, with a hop when
// it's done. Drag to another part of the farm and she turns up there, on a path
// near the middle.
const HERO_TALL = 90; // her height, in world units (a barn is about 250)
const hero = { x: null, y: null };

// Where she can stand on each plot (made by tools/walkmask.py): 100 x 100 cells
// over its picture, 0 blocked, 1 grass, 2 path or floor, 3 not the picture.
const PLOT_WALK = {
    barnyard: '//////////////////////////////////////////////////////////////////////////////////wD///////////////////////////////wAPP/////////////////////////////wAAA/////////////////////////////wAAAP////////////////////////////8AAAD/////////////////////////////AAAAP////////////////////////////AAAAA///////////////////////////8AAAAAP///////////////////////////wAAAAD///////////////////////////8AAAAAP///////////////////////////AAAAAD///////////////////////////AAAAAA///////////////////////////wAAAAAP//////////////////////////8AAAAAD/////////////////////wD////wAAAAP/////////////////////8AD//8DAAAAD/////////////////////8AAP/8AAAAAA/////////////////////8AAA/8AAAAAD//////////////////////AAAAwAAAAAAA//////////////////P//AAAAAAAAAAAAD////////////////AD//wAAAAAAAAAAAAP///////////////wAPPwAAAAAAAAAAAAA///////////////8AAA8AAAAAAAAAAAAAA//////////////wAAADAAAAAAAAAAAAAAD/////////////AAAAAAAAAAAAAAAAAAAAD/////8/D////wAAAAAAAAAAAAAAAAAAAAP////8DwPz//8AAAAAAAAAAAAAAAAAAAAAz///8AAAwP//AAAAAAAAAAAAAAAAAAAAAA////AAAAA//wAAAAAAAAAAAAAABAAAAAAD//wwAAAAD/8AAAAAAAAAAAAAAAEAAAAAAP/wAAAAAA/8AAAAAAAAAAAAAAABQAAAAAAPwAAAAAAP8AAAAAAAAAAAAAAABoAAAAAAD8AAAAAAA/AAAAAAAAAAAAAAAAagAAAAAAAAAAAAAA/AAAAAAAAAAAAAAAAFqAEAAAAAMAAAAAAP8AAAAAAAAAAAAAAABaqBVAAAAAAAAAAAP8AAAAAAAAAAAAAAAAWqqVgAAAAAAAAAAA/zAAAAAAAAAAAAAAAGKqqgAAAAAAAAAAD//AAAAAAAAAAAAAAABAqqqAAAAAAAAAAA//wAAAAAAAAAAAAAFWgCqqgAAAAAAAAAAA/8AAAAAAAAAAAAAFWgAKqoAAAAAAAAAAAP/AAAAAAAAAAAAAVWoAAqqqAAAAAAAAAAD/wAAAAAAAAAAAAVaqAACqqoAAAAAAAAAA//8AAAAAAAAACAlaqAAAKqqgAAAAAAAAD///AwAAAAAAAAqqqqgAAAqqqQAAAAAAAA///w8AAAAAAAAqqqqoAAAKqqlAAAAAAAAP///8AAAAAAAAqqqqoAAAFqqqogAAAAAAD//8AAAAAAAAAGqqqoAAAGqqqqgAAAAAAA///AAAAAAAAAFqqqoAAAFWqqqAAAAAAAA///wAAAAAAAAVaqqkAAAFqqqgAAAAAAAAA//AAAAAAAAAVWqqmAAAGqqpUAAAAAAAAAP/wAAAAAAAFVVqqpAAAGqqqVAAAAAAAAAA//AAAAAAABVVqqqgAAWqqqBQAAAAAAAAA//8AAAAAAAFaqqqoAAWqaqgEAAAAAAAAA///wAAAAAABWqqqqQAWqqqkAAAAAAAAAA////AAAAAAAVqqqqpAKaqqpAAAAAAAAAA////8AAAAAAVqqqqqoGqqqqQAAAAAAAAA/////wAAAEAFqqqqqKqqqqqgAAAAAAAAD//////AAABAVWqqqqCqqqqqgAAAAAAAAD//////8AAAVVWqqoKqqqqoKAAAAAAAAAD///////8AABVaqqoAqqqqqCAAAAAAAAAD////////wAAFaqqUACqqqqAoACAAAAAAD/////////AABWqqUAAKqqZQAAAKAAAAAD/////////8AAVqqkAAAqlYQAAAAoAAAAD//////////wAGqqUAAACVVBAAAACgAAAD///////////ABapQAAAAJVAAAAAAoAAAD///////////8BqoQAAAAAlAAQAAACgAAD////////////wKqAAAAAAIAAoAAAAoAAD/////////////AKgAAAAAIAAUAAAAIAAP/////////////8AoAAAAAKAAQAAAAAAAP//////////////AAAAAAACAAQAAAAAAAP//////////////AAAAAAAAAAQAAAAAAAP//////////////8AAAAAAAAAQAAAAAAAP///////////////wAAAAAAABAAAAAAAAP///////////////8DwAAAAACAAAAAAAAP////////////////z/AAAAABAAAAAAAA////////////////////AAAAAAAAAAAAA////////////////////8AAAAAAAAAAAA/////////////////////wAAAAAAAAAAA//////////////////////AAAAAAAAAAA//////////////////////8AAAAAAAAAA///////////////////////wAAAAAAAAA////////////////////////AAAAAAAAA////////////////////////wAAAAAAAA////////////////////////wAAAAAAAA/////////////////////////AAAAAAAD/////////////////////////8AAAAAAD//////////////////////////AAAAAAD//////////////////////////8AAAAAD///////////////////////////wAAAAD////////////////////////////AAAAD////////////////////////////8AAAD/////////////////////////////wAAD//////////////////////////////AMD//////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    henhouse: '///////////////////////////////////////////////////////////////////////////////////D///////////////////////////////8AP///////////////////////////////ADDw/////////////////////////////wAw8P//////////////////////////D8MAADD//////////////////////////wMAAAAw//////////////////////////wAAwAAMP/////////////////////////wAAAAADD/////////////////////////8AAAAAAw//////////////////////////wAADAAMP/////////////////////////8AAADwDD//////////////////////////AAAAAAw//////////////////////////AAAAAAMP/////////////////////////wAAAAAAD/////////////////////////wAAAAAAAAP////////////////////////AAAAAAAAA//////////////////////P/8DwAAAAAAD/////////////////////A/AAAAAAAAAAP////////////////////AAAAAAAAAAAAA////////////////////wAAAAAAAAAAAAD///////////////////8AAAAAAAAAAAAAP///////////////////wAAAAAAAAAAAAA///////////////////wAAAAAAAAAAAAAD//////////////////wAAAAAAAAAAAAAAA/////////////////wAAAAAAAAAAAAAAAP////////////////AAAAAAAAAAAAAAAAD////////////////AAAAAAAAAAAAAAAAAP///////////////AAAAAAAAAAAAAAAAAAP//////////////AAAAAAAAAAAAAAAAAAA//////////////8AAAAAAAAAAAAAAAAAAD//////////////AAAAAAAAAAAAAAAAAAAP///////////8wAAAAAAAAAAAAAAAAAAAA////////////AAAAAAAAAAAAAAAAAAAAADz//////////wAAAAAAAAAAAAAAAAAAAAAA//////////AAAAAAAAAAAAAAAAAAAAAAAP/////////wAAAAAAAAAAAAAAAAAAAAAAD/////////wAAAAAAAAAAAAAAAAAAAAAAAP/////////AAAAAAAAAAAAAAAAAAAAAAAA/////////AAAAAAAAAAAAAAAAAAAAAAAAD////////AAAAAAAAAAAAAAAAAAAAAAAAAP///////wAAAAAAAAAAAAAAAAAAAAAAAAA///////8AAAAAAAAAAAAAAAAAAAAAAAAAD//////wAAAAAAAAAABAAAAAAAAAAAAAAAP/////8AAAAAAAAAARUAAAAAAAAAAAAAAA/////8AAAAAAAAABVVQAAAAAAAAAAAAAAA////8BQAAAAAAABVVVQAAAAAAAAAAAAAAD///8CVAAAAAAABVVVVAAAAAAAAAAAAAAAP//8KpUAaAAAABVVVVVAAAAAAAAAAAAAAA//wKqpRYAAAABVVVVVUAAAAAAAAAAAAAAD/wCqqVaAAAABVVVVVVUAAAAAAAAAAAAAA/AFqqqaoAAEAVVVVVVVQAAAAAAAAAAAAADwFVqqqqgAFQFVVVVVVVQAAAAAAAAAAAADwFVaqqqqAFVFVVVVVVVVUAAAAAAAAAABA8AVVaqqqpVVVVVVVVVVVVUAAAAAAAAAFA/8BVVqqqoVVVVVVVVVVVVVVAAAAAAAAVA//ABVVqqqFVVVVVVVVVVVVVVAAAAAABVA//8AFVaqqlVVVVVVVVVVVVVVUFYAAAFVA///wAVVqqqlVVVVVVVVVVVVVVFaqqpVVA////wBVVqqpVVVVVVVVVVVVVVVaqqlVUA/////AFVWqqpVVVVVVVVVVVVVVaqqVVUA/////8AVVaqqlVVVVVVVVVVVVVaqqlVUA//////wAVVaqqVVVVVVVVVVVVVqqqVVUA///////ABVWqqpVVVVVVVVVVVQqqqVVQD////////AFVWqqpVVVVVVVVVVUKqqVVQD////////wAVVaqqlVVVVVVVVVVKqqVVQD/////////ABVWqqqVVVVVVVVVVqqqVVQD//////////ABVVqqpVVVVVVVVVqqqVVQD//////////8AFVaqqVVVVVVVVWqqqVVAD///////////wAVVqqqlVVVVVVWqqlVVAD////////////ABVVqqpVVVVVVWqqpVVAD////////////8ABVVqqpVVVVVWqqpVVAP/////////////wAFVaqqlVVVVWqqlVUAP//////////////wAVVqqqVVVVWqqVVUAP///////////////ABVWqqpVVVWqqlVUAP///////////////8AFVaqqlVVWqqpVUAP////////////////wAVVqqqVVaqqlVUAP/////////////////AAVWqqqRWqqpVUAP/////////////////8ABVaqqgKqqpVQAP//////////////////wAFVqqqKqqpVQAP///////////////////AAVVqqqqqlVQA////////////////////8AAVWqqqqVVQA/////////////////////wABVaqqqlVQA//////////////////////AAFWqqqpVQA///////////////////////AAVqqqqBAA///////////////////////8AAqqqqoAA////////////////////////wAKqqqqAA/////////////////////////AAKqqqAA/////////////////////////8wAqmoAP///////////////////////////AClYAP///////////////////////////wAFUAP////////////////////////////AAUAP/////////////////////////////AAAP/////////////////////////////wAAD//////////////////////////////AAD///////////////////////////////AD///////////////////////////////8D//////////////////////////////////////////////////////////////////////////////////w==',
    bigbarn: '///////////////////////////////////////////////////////////////////////////////////A///////////////////////////////8AD//////////////////////////////wAAD/////////////////////////////wAAAP////////////////////////////AAAAAP///////////////////////////AAAAAA//////////////////////////8AAAAAAA/////////////////////////wAAAAAAAA////////////////////////wAAAAAAAAD///////////////////////AAAAAAAAAAD//////////////////////AAAAAAAAAAAP////////////////////8AAAAAAAAAAAAP///////////////////8AAAAAAAAAAAAAP//////////////////wAAAAAAAAAAAAAA//////////////////wAAAAAAAAAAAAAAD/////////////////AAAAAAAAAAAAAAAAD///////////////8AAAAAAAAAAAAAAAAAD//////////////8AAAAAAAAAAAAAAAAAAP/////////////wAAAAAAAAAAAAAAAAAAAP////////////AAAAAAAAAAAAAAAAAAAAAP///////////AAAAAAAAAAAAAAAAAAAAAA//////////8AAAAAAAAAAAAAAAAAAAAAAD/////////8AAAAAAAAAAAAAAAAAAAAAAAD////////wAAAAAAAAAAAAAAAAAAAAAAAAD///////wAAAAAAAAAAAAAAAAAAAAAAAAAP//////AAAAAAAAAAAAAAAAAAAAAAAAAAAP/////AAAAAAAAAAAAAAAAAAAAAAAAAAAA////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAqAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAKoAAAAAACAAAAAAA8AAAAAAAAAAAAABAACqgAAAAAAgAAAAAAPAAAAAAAAAAAAAKggCqqCgAAAAgAAAAAADwAAAAAAAAAAAACqqqqqgoAAAAIAAAAAAA8AAAAAAAAAAAAiqqqqqoqAAAAKAAAAAAAPAAAAAAAAAAACqqqqqqqqgAAACgAAAAAADwAAAAAAAAAAKqqqqqqqCoAAAAoAAAAAAA8AAAAAAAAAAKqqqqqqqgKAAAAAAAAAAAAPAAAAAAAAAAqqqqqoCCqKgAAoAAAAAAAADwAAAAAAAACqqqqGqigCqoAAKCAAAAAAAA8AAAAAAAAKqqqoCqqqqqqAACgoCAAAAAAPAAAAAAAACqqqgqqqqqqggAAoKAqAAAAADwCgAACgqAKqqAqqqqqqqgAAKCgqgAAAAA8CpAAAoKqKqqiqqqqqqqoAACAoKoAAAAAPACYAAKqqqqqgqqqqqqqqgAAgICAAAAAADwAIACACqqqqgqqqqqqqqqAAoKAoAAAAAA8AAAAAAKqqqoKqqqqqqqqgAICgqAAAAAAPAAAAgACqqqqKqqqqqqqqoACAoKgAAAAADwAAAAAAqqqqiqqqqqqqqqCKoKCqAAAAAA/AAACAAKqqqoqqqqqqqqqgqpKAqqAAAAA/8AAAAACqqgAAAAAAAKqoACqCgKqoAAAD//8AAAAAqqgAAAAAAAAqoAAKgoKoIAAAD///8AAAAKqoAAAAAAAAKqAACoKCqoAAAP////wAAACqqAAAAAAAACqgAAqCgqqAAAP/////wAAAqqgAAAAAAAAAAAAKqgqoAAA///////AAAKqoAAAAAAAAAAAACqoKoAAA////////AAAKqAAAAAAAAAAAAAqqCoAAD////////8AAAqgAAAAAAAAAAAAKqqgAAD/////////8AACoAAAAAAAAAAAACqqgAAP//////////wAACAAAAAAAAAAAAAqqAAA////////////wAAAAAAAAAAAAAAAKqAAA/////////////wAAAAAAAAAAAAAACoAAD//////////////AAAAAAAAAAAAAAAoAAD///////////////AAAAAAAAAAAAAAoAAP///////////////8AAAAAAAAAAAACgAAP////////////////8AAAAAAAAAAAKgAA//////////////////AAAAAAAAAAACAAD//////////////////wAAAAAAAAAAAAAD//////////////////8AAAAAAAAAAAAAP///////////////////AAAAAAAAAAAAAP///////////////////wAAAAAAAAAAAA////////////////////8AAAAAAAAAAAA/////////////////////AAAAAAAAAAAD/////////////////////wAAAAAAAAAAD/////////////////////8AAAAAAAAAAP//////////////////////AAAAAAAAAAP//////////////////////wAAAAAAAAA////////////////////////AAAAAAAAD////////////////////////wAAAAAAAA///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    fieldgate: '////////////////P////////////////////////////////A////////////////////////////////AD///////////////////////////////wAP//////////////////////////////wAA//////////////////////////////8AAD/////////////////////////////wAAAP////////////////////////////wAAAA////////////////////////////8AAAAD///////////////////////////wAAAAAP//////////////////////////wAAAAAA//////////////////////////wAAAAAAA/////////////////////////wAAAAAAAD////////////////////////wAAAAAAAAP///////////////////////AAAAAAAAAA///////////////////////AAAAAAAAAAD/P////////////////////AAAAAAAAAAADD////////////////AP//wAAAAAAAAAAAAP///////////////AAP/AAAAAABpAAAAAD///////////////AAD/AAAAAABqUAAAAA//////////////8AAAPAAAAAQAqqUAAAAD/////////////8AAADAAAAAVBKqpQAAAAP/////////////AAAAAAAAABVqqqlAAAAD/////////////AAAAAAAAAAVqoaqUAAAAP///////////8AAAAAAAAAAFqgAWpQAAAAP///////////AAAAAAAAAAAqQABqlAAAAA///////////AAAAAAAAAAAqgAAKqUAAAAD//////////AAAAAAAAAAAKQAAAqpQAAAAP/////////wAAAAAAAAAAKQAAAAqlVAAAA/////////wAAAAAAAAAACQAAAACqVQAAAD////////8AAAAAAAAAACQAAAAAKqUAAAAP///////8AAAAAAAAAACQAAAAAAapQAAAA8///////wAAAAAAAAAKAAAAAAABqlAAAAAD//////8AAAAAAAAFqQAAAAAAAaqUAAAAA///////AAAAAAAAGqQAAAAAAABqpQAAAAD//////wAAAAAAAGqAAAAAAAAAaqlAAAAAP/////8AAAAAAAWqAAAAAAAAAGqqlAAAAD//////AAAAAAACqAAAAAAAAABqqqUAAAAP/////wAAAAAAAKAAAAAAAAABqqqpQAAAA/////wAAAAAAABAAAAAAAAAAqgGqlAAAAD////8AAAAAAAAAAAAAAAAACqQAKqUAAAAP////AAAAAAAAAAAAAAAAACqQAAqpQAAAA////wAAAAAAAAAAAAAAAACqQAACqpAAAAA///8AAAAAAAAAAAAAAAACqgAAAKqkAAAAD///AAAAAAAAAAAAAAAACqgAAAAqqQAAAAP//AAAAAAAAAAAAAAAACqAAAAACqpAAAAD/8AAAAAAAAAAAAAAAACpAAAAAAGqlAAAA/8AAAAAAAAAAAAAAAACqQAAAAAAaqUAAAP8ABAAAAAAAAAAAAAAGqAAAAAAABqpQAAD8AFUAAAAoAAAAAAAAGqAAAAAAAAGqlAAAPAFVUAAKqAAAAAAAAKqAAAAAAAAAaoEAAD8BVVAAKCgAAAAAAAKqAAAAAAAAAGpAAAD/wFVVAAAAAAAAAAAKqAAAAAAAAAAZQAAD//AVVUAIAAQAAAAAKpAAAAAAAAAAFQAAD//8BVVACAAJAAAAAKqAAAAAAAAAABUAAD///8FVVAAAAkAAAACqAAAAAAAAAABVAAD////wVVQAoACAAAAAoAAAAAAAAAABUAAP/////BVVAKAAJAAAKoAAAAAAAAAABUAAP/////8FVVAgAAkAAKqAAAAAAAAAABUAAP//////wVVUIAACQAKqAAAAAAAAAABQAAP///////BVVYAAAJAKqAAAAAAAAAABUAAP///////8BVWAAAAqoqAAAAAAAAAABAAAP////////wFVgAAACoCAAAAAAAAAABAAAP/////////AVWAAAAAAQAAAAAAAAACQAAP//////////BVQAAAAAEAAAAAAAAAFAAAP//////////8FUAAAAABAAAAAAAAABAAAP///////////wVQAAAgAUAAAAAAAABAAAP////////////BWoAAIAJAAAAAAAABAAAP////////////8KqgAAAClAAAAAAAFQAA//////////////wqqAAAAqkAAAAAABQAA///////////////CqoAAACqQAAAAAAAAA///////////////8KqgCAAKpAAAAAAAAA////////////////wKqggAAqkAAAAAAAA/////////////////AqpIAAKqQAAAAAAA/////////////////8CpWAAACpAAAEAAA//////////////////8JVQAAAqgAAFAAA///////////////////wVUAAAIoAAFAAA////////////////////BVAAACCJAEAAD////////////////////8FVUAAgqpVAAD/////////////////////wVVUAEIqVAAD//////////////////////AVVUACCVAAD//////////////////////8BVVQAQVAAD///////////////////////wFVUAEAAAD////////////////////////AVVUAAAAD////////////////////////8BVVAAAAD/////////////////////////8FVUAAAD//////////////////////////wVVVAAD///////////////////////////BVVQAP///////////////////////////8FVVAP////////////////////////////wVVUP/////////////////////////////BVUP/////////////////////////////8BUP//////////////////////////////wUP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    town: '///////////////////////////////////////////////wAAAP////////////////////////////wAAAA///////////////////////8AAAAAAAAAP//////////////////////8AAAAAAAAAA///////////////////////AAAAAAAAAAP//////////////////////AAAAAAAAAAD//////////////////////wAAAAAAAAAA//////////////////////8AAAAAAAAAAP//////////////////////AAAAAAAAAAD//////////////////////wAAAAAAAAAA//////////////////////8AAAAAAAAAAP//////////////////////AAAAAAAAAAAAP////////////////////wAAAAAAAAAAAA////////////////////8AAAAAAAAAAAAP////////////////////AAAAAAAAAAAAA////////////////////wAAAAAAAAAAAAP///////////////////8AAAAAAAAAAAAD////////////////////AAAAAAAAAAAAA///+v///////////////wAAAAAAAAAAAAP//+q//////////8AAAAAAAAAAAAAAAAAD/ACqgAAAP/////8AAAAAAAAAAAAAAAAAA/ACqgAAAD//////AAAAAAAAAAAAAAAAAAPACqoAAAAP/////AAAAAAAAAAAAAAAAAAAwKqoAAAAD/////wAAAAAAAAAAAAAAAAAAAKqoAAAAA/////8AAAAAAAAAAAAAAAAAAAqqoAAAAAP/////AAAAAAAAAAAAAAAAAAAKqgAAAAAD/////wAAAAAAAAAAAAAAAAAAKqgAAAAAA/////8AAAAAAAAAAAAAAAAAAqqAAAAAAAP/////AAAAAAAAAAAAAAAAACqqAAAAAAAD/////wAAAAAAAAAAAAAAAAKqqAAAAAAAA/////8AAAAAAAAAAAAAAAKqqoAAAAAAAAP/////AAAAAAAAAAAAACqqqqoAAAAAAAAD/////wAAAAAAAAAAAAKqqqqqAAAAAAAAA8AA//8AAAAAAAAAAAAqqqqqioAAAAAAAAMAADAAAAAAAAAAAAAAKqqqgAqAAAAAAAADAAAAAAAAAAAAAAAAAKqoAAACgAAAAAAAAAAAAAAAAAAAAAAAACqqgAAAAoAAAAAAAAAAAAAAAAAAAAAAAACqqgAAAAKAAAAAAAAAAAAAAAAAAAAAAAACqqAAAAACoAAAAAAAAAAAAAAAAAAAAAAACqqAAAAAAqAAAAAAAAAAAAAAAAAAAAAAAKqqAAAAAAKgAAAAAAAAAAAAAAAAAAAAAAKqqgAAAAACoAAAAAAAAAAAAAAAAAAAAAAKqqgAAAAAAqAAAAAAAAAAAAAAAAAAAAAAKqqAAAAAAAKgAAAAAAAAAAAAAAAAAAAAAqqqAAAAAAACoAAAAAAAAAAAAAAAAAAAAAqqqAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAqqqAAAAAAAACgAAAAAAAAAAAAAAAAAAAAKqoAAAAAAAAAqgKAAAAAAAAAAAAAAAAAAKqoAAAAAAAAAqqCoAAAAAAAACgAAAAAAAKqoAAAAAAAAAKqqqAAAAAAAAAqAAAAAAAKqoAAAAAAAAACqqqgAAAAAAAAKqAAAAAAKqoAAAAAAAAAAqqqoAAAAAAAACqoAAAAACqoAAAAAAAAAAqqqqoAAAAAAAAqqgAAAACqoAAAAAAAAAAKgqqqqoAAAAAAKqqAAAACqoAAAAAAAAAAKgAqqqqgAAAAAOqqqAAAKqqAAAAAAAAAAKoAAqqqqAAAAD/+qqoAAKqqAAAAAAAAAAKoAACqqqqAAAD//6qqqKqqqAAAAAAAAAAqqAAAAqqqoAAD///6qqqqqqAAAAAAAAAAqqAAAAAKqqgAD////qqqqqqAAAAAKAAAAKqAAAAAACqqAD/////qqqqoAAAAACqgAAKoAAAAAAAKqoP/////+qqqqAAAAACqqqACoAAAAAAAAKqv//////6qqqAAAAAAqqqqioAAAAAAAAAqq///////6oAAAAAAACqqqqqAAAAAAAAACqr////////AAAAAAAAqqqqqAAAAAAAAADqqv///////8AAAAAAAAKqqqgAAAAAAAAD+qq////////wAAAAAAAAKqqqAAAAAAAAD/6qr////////AAAAAAAAKgCqoAAAAAAAD//qq////////8AAAAAAACoACqAAAAAAAD//+qv////////AAAAAAAAqAAqgAAAAAAA///6r////////wAAAAAAACAAKoAAAAAAAP///r////////8AAAAAAAAAAAqAAAAAAAD/////////////AAAAAAAAAAAKgAAAAAAA/////////////wAAAAAAAAAACoAAAAAAAP////////////8AAAAAAAAAAAqgAAAAAAD/////////////AAAAAAAAAAAKoAAAAAAA/////////////wAAAAAAAAAACqAAAAAAA//////////////AAAAAAAAAAAKgAAAAAA//////////////wAAAAAAAAAACqAAAAA////////////////AAAAAAAAAAAqgAAAAP////////////////AAAAAAAAAAKqAAAAP/////////////////wAAAAAAAAAqgA/////////////////////wAAAAAAAAKoA//////////////////////8AAAAAAAAqj///////////////////////8AAAAAAAKr/////////////////////////AAAAAAAqv/////////////////////////AAAAAAKr//////////////////////////AAAAACqv//////////////////////////AAAAAKr//////////////////////////wAAAACq//////////////////////////8AAAAAqv//////////////////////////wAAAA+v//////////////////////////8AAAAP////////////////////////////wAAAP////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    market: '///////////wAAAAAAAAAA//////////////////////8AAAAAAAAAAP//////////////////////AAAAAAAAAAD//////////////////////wAAAAAAAAAA//////////////////////8AAAAAAAAAAP//////////////////////AAAAAAAAAAD//////////////////////wAAAAAAAAAA//////////////////////8AAAAAAAAAAD//////////////////////AAAAAAAAAAA//////////////////////AAAAAAAAAAAP/////////////////////wAAAAAAAAAAD/////////////////////8AAAAAAAAAAAP////////////wAP//////AAAAAAAAAAAD////////////wAAAAAP//wAAAAAAAAAAAA///////////8AAAAAAAA8AAAAAAAAAAAAAA//////////wAAAAAAADAAAAAAAAAAAAAAAA////////8AAAAAAAAwAAAAAAAAAAAAAAAAAP//////AAAAAAAAAAAAAAAAAAAAAAAAAAAA/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAAAAAAAAAAAAAAAAAAAAA/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAIAAAAAAAAAAAAAAAAAAA/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAAAAAAAAAAAAAAAAAAAAA/////AAAAAAAAAAAgAAAAAAKqgAAAAAAAP////wAAAAAAAAAAKAAAAAKqqoAAAAAAAD////8AAAAAAAAAACqqqqqqqqoAAAAAAAAP////AAAAAAAAAAAqqqqqqqqqAAAAAAAAD////wAAAAAAAAAACqqqqqqqqgAAAAAAAA///8CAAAAAAAAAACqqqqqqqqqAAAAAAAAAP/wKqAAAAAAAAAAqqqqqqqqqoAAAAAAAAAP8KqogAAAAAAAAKqqqqqqqqqgAAAAAAAAA/AAKqAAAAACqqqqqACqqqqqoAAAAAAAAA//AAIKgAACqqqqqgAAAqqqqqoAAAAAAAA//wACqqAAqqqqqgAAAAAqqqqqqgAAAqoD//8AACqqqqqqqoAAAAAAAqqqqqqAACqoP///AAACqqqqqqAAAAAAAAAKqqqqqqCqg////wAAAKqqqqoAAAAAAAAAAKqqqqoACA////wAAAAoqqqqAAAAAAAAAAACgAAgAAAP///wAAAAAAAAqgAAAAAAAAAAAIAAAAAAAP//8AAAAAAAAAIAAAAAAAAAAACAAAAAAAAAP/8AAAAAAAACAAAAAAAAAAAAgAAAAAAAAAP/AAAAAAAAAgAAAAAAAAAAAIAAAAAAAAAD/wAAAAAAAAIAAAAAAAAAAACAAAAAAAAAA/8AAAAAAAACAAAAAAAAAAAAgAAAAAAAAAP/AAAAAAAAAgAAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//8AAAAAAAACoAAAAAAAAAoAAAAAAAAAA///8AAAAAAAAqqAAAAAAAKqAAAAAAAAAA////wAAAAAAAqqqgAAAAAqqoAAAAAAAAP/////wAAAAKqqqqqgAAAKqqqqqqgAAAAP//////AAAKqqqqqqqoACAAAACqqqgCgAD//////wKqqqqqqqqqqqqgAAAAACqqKgAA//////8AqqqqqqqqqqqqoAAAAAAAAAAAAP/////8AAqqgAAqqqqqqqAAAAAAAAAAAAA/////8AAqqoAAAAAqqqqgAAAAAAAAAAAAD////AACqqqAAAAAAqqqoAAAAAAAAAAAAA///8KAKqqqAAAAAACqqqAAAAAAAAAAAAAD//wqgKqqqgAAAAAAqqqgAAAAAAAAAAAAAD/ygqqqqqoAAAAAAKqqoAAAAAAAAAAAAAAP8AqqqqqqAAAAAACqqqAAAAAAAAAAAAAAD/CqqqqqqgAAAAAAqqqgAAAAAAAAAAAAAD//KqqqqqoAAAAAAKqqoAAAAAAAAAAoAAD///KqqqqqAAAAAACqqqAAAAAAAAAAAAAP///8KqqqqgAAAAAAqqqgAAAAAAAAAAAAP////8KqqqIAAAAAAKqqoAAAAAAAAAAAA//////8KqoAAAAAAAAqqqAAAAAAAAAAAD///////8KqAAAAAAAAAqqgAAAAAAAAAAP////////8qgAAAAAAAAAAIAAAAAAAAAAP/////////wAAAAAAAAAAAAgAAAAAAAAAD//////////wAAAAAAAAAAAAqAAAAAAAAA///////////wAAAAAAAAAAACqgAAAAAAA////////////wAAAAAAAAAAAKqoAAAA///////////////AAAAAAAAAAACqqoIoD///////////////wAAAAAAAAAAAKoAAAD///////////////8AAAAAAAAAAACqgAAP////////////////wAAAAAAAAAAAoAAA////////////////////AAAAAAAAAAAAD/////////////////////AAAAAAAAAAAP/////////////////////8AAAAAAAAAAP//////////////////////8AAAAAAAAA////////////////////////8AAAAAAAD/////////////////////////8AAAAAAP//////////////////////////8AAAAA////////////////////////////wVVQA/////////////////////////////wFVD//////////////////////////////wAP///////////////////////////////w////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    berryrows: '/////////////////////////////////////////////////8////////////////////////////////8D///////////////////////////////wAD//////////////////////////////8AAP/////////////////////////////wAEA/////////////////////////////wAFAD////////////////////////////wABUAP///////////////////////////wAABQA///////////////////////////wAAAFQA//////////////////////////AAAABVAP/////////////////////////AAAAAVUAP////////////////////////AAAAAFVQA////////////////////////AAAAABVUAD///////////////////////AAAAAAFVUAD//////////////////////AAAAAAAFVAA//////////////////////AAAAAAAAVQAA////////////////////8AAAAAAAABUEAD////////////////////AAAAAAAAAVVAAP///////////////////AAAAAAAAAABVAA///////////////////AAAAAAAAAAAFUAD//////////////////AAAAAAAAAAABFQAP////////////////8AAAAAAAAAAAAAVAA////////////////8AAAAAAAAAAAAAVUAD///////////////8AAAAAAAAAAAAAFFAAP//////////////8AAAAAAAAAAAAAJBQAAP/////////////8AAAAAAAAAAAAABAFUAA/////////////8AAAAAAAAAAAAAQAAFQAD////////////wAAAAAAAAAAAAAFQABVAAP//////////AAAAAAAAAAAAAAAAEAABUAA////////wPAAAAAAAAAAAAAAAAAAAAlQAP///////wAwAAAAAAAAAAAAAAAAAAACVAD///////8AAAAAAAAAAAAAAAAAAAAAAFUA///////8AAAAAAAAAAAAAAAAAAAAAAAFQDz//////AAAAAAAAAAAAAAAAAAAAAAAAUAwD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAP////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///AAAAAAAAAAAAAAAAAAAAAAAACAgQAAP//wAAAAAAAAAAAAAAAAAAAAAAAAqoFAAA///AAAAAAAAAAAAAAAAAAAAAAAAmqBUAAD//wAAAAAAAAAAAAAAAAAAAAAAAqqgBQAAP/8AAAAAAAAAAAAAAAAAAAAAAAqqqAVAAA/8AAAAAAAAAAAAAAAAAAAAAAACqqgAUAAP/wAAAAAAAAAAAAAAAAAAAAAAiqqqAAQAA//AAAAAAAAAAAAAAAAAAAAAAKqqqqAFAAP/AAAoAAAAAAAAAAAAAAAAAAAqqqqoAAAD/AAAKgAAAAAAAAAAAAAAAAAAKqqqqAAAA8AAACqAAAAAAAAAAAAAAAAAACqqqqqAAAPAAAAqEAAAAAAAAAAAAAAAAAAqqqqqgAADwAAAKAAAAAAAAAAAAAAAAAAAKqqqqqAAA/AICCQAAAAAAAAAAAAAAAAAACqqqqqgAA/8CgqgAAAAAAAAAAAAAAAAAAAqqqqqqAA//8IKoAAAAAAAAAAAAAAAAAAAKqqqqqAD///wiAAAAAAAAAAAAAAAAAAAACqqqqqAD////CgAAAAAAAAAAAAAAAAAAAAqqoqgAD////8AAAAAAAAAAAAAAAAAAAAAKqoCgAD/////wKAAAAAAAAAAAAAAAAAAACqqgAAD//////AIAAAAAAAAAAAAAAAAAAAqqoAAD//////8AgAAAAAAAAAAAAIAAAAAKqqgAD///////wAAAAAAAAAAAAAKAAAAACqqqgP////////wAAAAAAAAAAAAKAAAAAAqqqoP////////8AAAAAAAAAAAAKAAAAAAKqqoP/////////8AAAAAAAAAAAKgAAAAACqqoP//////////wAAAAAAAAAAKoAAAAAAqqgP///////////AAAAAAAAAAKqAAAAAAKqgP///////////8AAAAAAAAAKqgAAAAACqgP////////////wAAAAAAAACqoAAAAAAqgP/////////////AAAAAAAAAqqAAAAAAKgP/////////////8AAAAAAAAqqgAAAAACg///////////////8AAAAAAAqqoAAAAAAg////////////////wAAAAAAqqqAAAAAAA/////////////////AAAAAAqqqgAAAAoA/////////////////8AAAAAqqqoAAAAIA//////////////////wAAAAqqqqAAAABA///////////////////AAAAqqqqgAAAAA///////////////////8AAgqqqqqAAAAA////////////////////wAGqqqqqqqqgD/////////////////////wCqqqqqqqqoD//////////////////////AqqqqqqqqqD//////////////////////8KqqqqqoqqD///////////////////////wqqqqqoCqD////////////////////////AqqqqoAKD////////////////////////8KqqqqgAD/////////////////////////wKqqqgAD//////////////////////////AKqqoAD//////////////////////////8AKqoAD///////////////////////////wAqgAP////////////////////////////wCgAP/////////////////////////////AAAP/////////////////////////////8BAP//////////////////////////////wAP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    orchard: '/////////////wAAAAA///////////////////////////8AAAAAP//////////////////////////8AAAAAA///////////////////////////AAAAAAP//////////////////////////wAAAAAD//////////////////////////8AAAAAA///////////////////////////AAAAAAP///////////////////////wAAAAAAAAD///////////////////////wAAAAAAAAAP//////////////////////8AAAAAAAAAD//////////////////////8AAAAAAAAAAD//////////////////////AAAAAAAAAAAAA/////////////8AAAAAAAAAAAAAAAAAAAD////////////8AAAAAAAAAAAAAAAAAAAA/////////////AAAAAAAAAAAAAAAAAAAAD////////////AAAAAAAAAAAAAAAAAAAAA////////////wAAAAAAAAAAAAAAAAAAAAP///////////8AAAAAAAAAAAAAAAAAAAAA////////////AAAAAAAAAAAAAAAAAAAAAP///////////wAAAAAAAAAAAAAAAAAAAAD///////////8AAAAAAAAAAAAAAAAAAAAAP///////////AAAAAAAAAAAAAAAAAAAAAA///////////wAAAAAAAAAAAAAAAAAAAAAP//////////8AAAAAAAAAAAAAAAAAAAAID///////////AAAAAAAAAAAAAAAAAAAACgD//////////wAAAAAAAAAAAAACqAAAAAoAP/////////8AAAAAAAAAAAAAAAAAAAAKAD//////////AAAAAAAAAAAAAAAAAAAACgAD/////////wAAAAAAAAAAAAAAAAAAAAoAAP////////8AAAAAAAAAAAAAAAAAAAAKAAAAP///////AAAAAAAAAAAAAAAAAAAACgAAAA///////wAAAAAAAAAAAAAAAAAAAAoACAAA//////8AAAAAAAIAAAAAAAAAAAAKgAoAAD//////AAAAAAACAAAAAAAAAAAACoAKgAAP/////wAAAAAAAoAAAAAAAAAAAAqoCqAAAAD///8AAAAAAAAAAAAAAAAAAAAKqgqoAAAAP///AAAAAAAAAAAAAAAAAAAACqqAAAAAAD///wAAAAAAAAAAAAAAAAAAAAqqAAAAAAAP//8AAAAAAAAAAAAAAAAAAAAKqgAAAAAAD///AAAAAAAAAAAAAAAAAAAACqoAAAAAAA///wAAAAAAAAAAAAAAAAAAAAqqAAAAAAAD//wAAAAAAAIAAAAAAAAAAAAqqgAAAAAAAP/8AAAAAAACAIoAAAAAAoCACqoAAAAAAAD/wAAAAAAAAAAAAAAAAAKAoAqqAAAAAAAA/8AAAAAAAAAAAAAAAAACgKgCqgAAAAAAADwAAAAAAAAAAAAAAAAAAoCoAqoAAAAAAAA8AAAAAAAAAAAAAAAAAAKAqAKqAAAAAAAAPAAAAAAAAAAAAAAAAAAAggoCqgAAAAAAADwAoAAAAAAAAAAAAAAAACoIAqoAAAAAAAA8AqgAgACqoAAAAAAAAACqqgqqAAAAAAAAPAqgAIAAqCAAAAAAAAAAqqoqqgAAAAAAAD8KgAAAAAggAAAAAAAAAKogqqoAAAAAAAD/wGAAAAAAIAAAAAAAAACoGKqqAAAAAAAD//AAAgAAAqAAAAAAAAAAoAgqqgAAAAAAD//8AAIAAAKgAAAAAAAgAKAolKoAAAAAAA///wACAgoKoAAAAAAAqAIAqqCqAAAAAAAP///ACgoqqqAAAAAAAAAIAKqgKoAAAAAAD///8AKoKqqgAAAAAAAAAACQqCqqqqgAAD////wAqCqqoAAAAAAAAAACgCgaqqqgAAD/////ACoqqqAAAAAAAAAAAIAoKqqqoAP//////8AKqqqgAAAAAAAAAkAAGiqqqoAP///////8AqqqoAAAAAAAAAKqgKqqqqqgP////////wCqqqAAAAAAAAACqkBqqqqqgP/////////AKqqgAAAAAAAAAqqiqaqqqgP/////////8AqqoAAAAAAAAAKqqqaqqqgP//////////wKqqAAAAAAAAABmmqoKqoAP///////////AqqgAAAAAAAAACqqgAqoA////////////8CqoAAAAAAAAAAqJgAKoA/////////////wKqAAAAAAAAAAAAgAAAA//////////////AqqAAAAAAAAAAAAAAAA///////////////AqgAAAAAAAAAAAAAAA///////////////8CoAAAgAAAAAAAAAAA////////////////wKgACIAAAAAAAAAAA/////////////////AoACCAAAAAAAAAAA/////////////////8CoKgAAAAAAAAAAA//////////////////wKqqIAAAAAAAAAD///////////////////AqqqAAAAAAAAAD///////////////////8CqqgAAAAAAAAD////////////////////wKqoAAAAAAAAD/////////////////////AqqAAAAAAAAD//////////////////////AqgAAAAAAAD//////////////////////wKoAAAAAAAD///////////////////////wKgAAAAAAD////////////////////////AIAACAAAD////////////////////////8AgAAoAAP/////////////////////////wKgAKgAP//////////////////////////AoIKqAP//////////////////////////8CiqqAP///////////////////////////wAAAAP////////////////////////////AAAAP/////////////////////////////AAAP/////////////////////////////8AAP//////////////////////////////wAP///////////////////////////////AP///////////////////////////////8///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    meadow: '//////////////////////////////////////////////////P///////////////////////////////wA///////////////////////////////wAA//////////////////////////////8AAD/////////////////////////////8AAAP////////////////////////////8AAAA////////////////////////////wAAAAA///////////////////////////wAAAAAP//////////////////////////wAAAAAAP/////////////////////////wAAAAAAD/////////////////////////8AAAAAAAP////////////////////////wAAAAAAAAP///////////////////////AAAAAgAAAAP//////////////////////wAAAAqgAAAD//////////////////////AAAAAqoAAAAD/////////////////////wAAAKqqgAAAA/////////////////////wAAACqqqAAAAD////////////////////wAAACqqqqAAAA////////////////////AAAACqqqqoAAAP///////////////////AAAAKqqqqqgAAD///////////////////AAAAKqqqqqqAAAP//////////////////AAAACqqqqqigAAAD/////////////////AAAAAKqqqqoIAAAAA///////////////8AAAAAAKqqqqCgAAAAA//////////////8AAAAAAAqqqqgoAAAAAP/////////////8AAAAAAACqqqoIAoAAAAP////////////8AAAAAAAAKqqqAAKgAAAD////////////8AAAAAAAAAqqqgAqqAAAAD///////////8AAAAAAAAACqqAAqqoAAAAP//////////8AAAAAAAAAAAAiCqqqgAAAA//////////wAAAAAAAAAAAAAAqqqqAAAAD/////////wAAAAAAAAAAAAAAqqqqoAAAAP////////8AAAAAAAAAAAAAAKqqqqgAAAD////////8AAAAAAAAAAAAAAKqqqqqAAAAD////////AAAAAAAAAAAAAAKCaqqqAAAAAD///////wAAAAAAAAAAAAAKgqqqqAAAAAAP//////8AAAAAAAAAAAAAioqqqoAAAAAAA//////MAAAAAAAAAAAACqoAKqoAAAAAAAD/////wAAAAAAAAAAAAAqqAAqgAAAAAAAAP////8AAAAAAAAAAAAAKqAAKAAAAAAAAAAP///8AAAAAAAAAAAAAKqAAAAAAAAAAAAAAP//MAAAAAAAAAAAAAqqoAAAAAAAAAAAAAD//AAAAAAAAAAAAAAKqqAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAKqqoAAAAAAAAAAAAAA/AAAAAAAAAAAAAAqqqqAAAAAAAAAAAAAAPwAAAAAAAAAAAAAKqqqgAAAAAAAAAAAAADwAAAAAAAAAAAAAKqqqoAAAAAAAAAAAAAA8AAAAAAAAAAAAAKqqqqgAAAAAAAAAAAAAMAAAAAAAAAAAAAKqqqqoAKAAAAAAAAAAADAAAAAAAAAAAAAKqqqqqgKoAAAAAAAAAAAwAAAAAAAAAAAAqqqqqqoCqAAAAAAAAAAAPAAAAAAAAAAAAqqqqqqqiqgAAAAAAAAAAz8AAAAAAAAAAAqqqqqqqqqKAAAAAAAAAA//wAAAAAAAAACqqqqqqqqqgKAAAAAAAAD///AAAAAAAAACqqqqqqqqqoAgAAAAAAAD////AAAAAAAAAKqqqoKqqqqACAAAAAIAD////8AAAAAAAAKqqqqAgqqqoAAAAAAqAD/////wAAAAAAAqqqqqIAKqqqoACgAAqoD//////AAAAAAAqqqqqAAAqqqqgAqAAKoD//////8AAAAAAKqqqoAAAIqqqqAKgACoD///////wAIAACKqqqgAAAAKqqqgKqAAoD////////AqqqCqqqqoAAAACqqqqqqqAAP////////8CqoqqqqqoAAAAKKqqqqqqgAP/////////8KqKqqqqgAAAAKAKqqqqqgAP//////////wqqqqqqgAACIAEiqCqqqkAP///////////CqqqqqoAAKqqCCqgKqpAAP///////////8KqqqqqAgKqqogCgCqqgAP////////////wqqqqiqqqqqqqRgCqqoAP/////////////AqqqgCqqqqqqoaopqqg//////////////8CqqqAqqqqqqqKqqqqg///////////////8Kqqaqqqqqqqqqqqqg////////////////wqqEqqqqqqqqAqqCg/////////////////CqACCqqqqqqAICoA/////////////////8KAAoqqqqqqAAAqA//////////////////wEAIqqqqqpgBiqA///////////////////CAAKKqqqqgCqqA///////////////////8ACAgqqqqICqqD////////////////////wKoAmmqqCgqqD/////////////////////AqAqqqqogoqD//////////////////////CgKqqKqpIID//////////////////////8KCqqgqpaAD///////////////////////wqqqkqqaAD////////////////////////CqqgKoqgD////////////////////////8KqoCoKAD/////////////////////////wKqCpSAD//////////////////////////AqiqpAP//////////////////////////8CqqqAP///////////////////////////8KqqAP////////////////////////////wqqAP/////////////////////////////CqgP/////////////////////////////8CAP//////////////////////////////wAP///////////////////////////////AP///////////////////////////////8///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    stables: '//////////////8AP////wAAAAA/////////////////////AD////wAAAAAP////////////////////AA////wAAAAAD////////////////////AAD///8AAAAAAz///////////////////AAA///8AAAAAAAP//////////////////AAAP///AAAAAAAD//////////////////AAAA///wAAAAAAAP/////////////////AAAAP///AAAAAAAD////////////////8AAAAD///8AAAAAAA////////////////8AAAAAD//wAAAAAAAP///////////////8AAAAAAP/wAAAAAAAD///////////////8AAAAAAA/8AAAAAAAAP//////////////wAAAAAAAD8AAAAAAAAD//////////////wAAAAAAAA/AAAAAAAAA//////////////wAAAAAAAAAwAAAAAAAA//////////////wAAAAAAAAAMAAAAAAAA//////////////wAAAAAAAAAAAAAAAAAAP/////////////wAAAAAAAAAAAAAAAAAAD/////////////AAAAAAAAAAAAAAAAAAAA/////////////AAAAAAAAAAAigAAAAAAAP////////////AAAAAAAAAAKKqAAAAAAAP////////////AAAAAAAAAAKqqgAAAAAAD///////////8AAAAAAAAAACqqoAMAAAAP///////////8AAAAAAAAAAAKqgAP8AAAP///////////8AAAAAAAAAAACqaAAAwAzP///////////8AAAAAAAAAAAAqqqAADAP////////////wAAAAAAAAAAAAKoAAAAwD////////////8AAAAAAAAAAAACoAAAAAA////////////8AAAAAAAAAAAACiAAAAAAMP//////////wAAAAAAAAAAAAAgAAAAAAAA//////////wAAAAAAAAAAAAAoIAAAAAAAD/////////wAAAAAAAAAAAAAqqAAAAAAAAD////////8AAAAAAAAAAAAAqqgAAAAAAAAP////////wAAAAAAAAAAAAqqoAAAAAAAAA////////8AAAAAAAAAAAAqqqAAAAAAAAAD////////AAAAAAAAAAAAqAAAAAAAAAAAAP///////wAAAAAAAAAAAqAAAAAAAAAAAAA///////8AAAAAAAAAACqgAAAAAAAAAAAADz//////AAAAAAAAAACqoAAAAAAAAAAAAAAP/////AAAAAAAAAACqqAAAAKqAAAAAAAAA/////AAAAAAAAAAKqqgAAACqgAAAAAAAAP////AAAAAAAAAAKqqoAAAAqgAAAAAAAAA////wAAAAAAAAAKqqqAAAAKgAAAAAAAAAP///wAAAAAAAAAKqqqgAAACgAAAAAAAAAA///wAAAAAAAAAKqqqoAAAAgAAAAAAAAAAA//AAAAAAAAAAqqqqqAAAAAAAAAAAAAAAAD/AAAAAAAAAAqqqqqgAAAAAAAAAAAAAAAAPwAAAAAAAAAqqqqqoAAAAAAAAAAAAAAAAA8AAIAAAAAAqqqqqqAAAAAAAAAAAAAAAAAPAAKgAAAAAqqqqqqoAAAAAAAAAAAAAAAADAACoAAAAAqqqqqqqAAAAAAAAAAAAAAAAAwACqgAAAAqqqqqqqoCqqgAAAAAAAAAAAAMAAKqAAAAqqqqqqqqAqqqAAAAAAAAAAAAP8ACCoAAAAACqqqqqoCqqoAAAAAAAAAAA//wCAqoAAAAAKqqqqqqqqKAAAAAAAAAAA///AgCqACAAACqqqqqqqqAoAAAAAAAAAA///8IAqqCgAAAqqqqqqqqoagAAAAAAAAA////wAKqioAAAKqqqqqqqqpoAAAAAAAAA/////AKqqqAAACqqqqqqqqqoAAAAAAAAA/////8CqqqgAAAqqqqqqqqqqAAAAAAAAD//////8KqqoAAAKqqqqqqqqqoAAAAAAAD///////wqqqAAACqqqqqqqqqoAAAAAAAD////////CqqgAAAqqqqqqqqqqgAAAAAAD////////8KqoAAAKqqqqqqqqqqgAAAAAD/////////wKqgAAAqqqqqqqqqqqAAAAAD//////////AqqqAAqqqqqqqqqqqqAAAAP///////////CqqqAqqqqqqqqqqqqoAAAP///////////wKqqgqqqqqqqqqqqqqgAAP////////////wqqoqqqqqqqqqqqqqqgAP/////////////CqqqqqqqqqqqqqqqqqAP/////////////8KqqqqqqqqqqqqqqqqgP//////////////wKqqqqqqqqqqqqqqqgP///////////////AqqqqqqqqqqqqqqqgP///////////////8Cqqqqqqqqqqqqqqg/////////////////8Kqqqqqqqqqqqqqg//////////////////wqqqqqqqqqqppqg///////////////////CqqqqqqqqqqqqA///////////////////8KqqqqqqqqqqqA////////////////////wKqqqqqqqqqqA/////////////////////AqqqqqqqqqpA/////////////////////8CqqqqqqqqqD//////////////////////8KqqqqqqqqD///////////////////////wqqqqqqqqD////////////////////////CqqqqqqqD////////////////////////8KqqqqqqD/////////////////////////wqqqqqoD//////////////////////////CqqqqoD//////////////////////////8CqqqoD///////////////////////////wKqqoP////////////////////////////wqqoP/////////////////////////////CqoP/////////////////////////////8KoP//////////////////////////////wgP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    windmill: '////////////////Aw////////////////////////////P//AAP///////////////////////////z//wAA///////////////////////////wP/wAAD//////////////////////////wD//AAA//////////////////////////8AP/8AAP//////////////////////////AD//AAP//////////////////////////8A//8AP///////////////////////////AD//wD///////////////////////////8A//8P////////////////////////////AD/8A////////////////////////////8A/8AAP///////////////////////////AP8AAD///////////////////////////wA/AAA////////////////////////////AAAAAD///////////////////////////wAAAAA////////////////////////////AAAAAD///////////////////////////wAAAAAAP/////////////////////////wAAAAAAA////////////////////////wAAAAAAAAD///////////////////////wAAAAAAAAAP//////////////////////wAAAAAAAAAA//////////////////////AAAAAAAAAAAP/////////////////////wAAAAAAAAAAAA////////////////////8AAAAAAAAAAAAD//////////////////8AAAAAAAAAAAAAAP//////////////////AAAAAAAAAAAAAAD//////////////////wIAAAAAAAAAAAAA//////////////////8qAAAAAAAAAAAAAP/////////////////wKoAAAAAAAACqAAA8////////////////wKqAAAAAAAAAqoAAAP///////////////AqqoAAAAAAAAKqAKID///////////////wKiqAAAAAAAAAAAKqAP//////////////wCQgAAAAAAAAAAACkAAP/////////////AgKEAAAAAAAAAAAAoAAD/////////////AqAQAAAAAAAAAAAAKgAAD////////////CqoAAAAAAAAAAAAAAAAAgP///////////CqqgAAAAAAAAAAAAAAACqA///////////CqqqAAAAAAAAAAAAAAAAqqD//////////CqqqoAAAAAAAAAAAAAAAqqoP////////8CqqqqoAAAAAAAAAAAAgAqqqgP///////8CqqqqqgAAAAAAAAAAAIAqqqqA///////8CqqqqqqAAAAAAAAAAACgqqqqqP//////8KqqqqqqoAAAAAAAAAAAqqqqqqAP/////8KqqqqqqqggAAAAAAAAAKqqqqoAA/////wKqqqqqqqqoAAAAAAAAACqAqqoAoD////wKqqqqqqqqqAAAAAAAAAAqACqqCqgD///wKqqqqqqqqqgAAAAAAAAAKgAqqCqqgP//wKqqqqqqqqqoAAAAAAAAACAACqqqqqAP/AKqqqqqqqqqqgAAAAAAAAAAABqqqqqoA/AKqqqqqqqqqqoAAAAAAAAAAAAqqqqqqgDwKqqqqqqqqqqqAAAAAAAAAAAAKqqqqqqA/CqqqqqqqqqoKgAAAAAAAAAAAAqqqqqqg/8KqqqqqqqqoAoAAAAAAAAAAAACqqqqqg//wqqqqqqqqoAKAAAAAAAAAAAAqqqqqqg///AqqqqqqqqAAgAAAAAAAAAACqqqqqqA///8CqqqqqqCgAAAAAAAAAAAAAKqoKqqA////wKqqqqqAIACAAAAAAAAAAAKqgCqqD/////wqqqqqgCACoAAAAAAAAAqiqoAqqD//////CqqqqoAAAqqqqgAAAAAKqqoACqD//////8KqqqoAAAqqqqqgAAAACqqqAAqD///////wqqqAAAIqqqqqoAAAACqqqgoID////////CqqgAACqqqqqqoCIIAKqAKEAD////////8CqoAACqqqqqqqgqoAAqACoAD/////////wKhAgAqqqgCqqqqoAACgAqAD//////////AoICAqqqgAKqqqqAAAoAKgP///////////CqAqqqqoACqqqqAAAICAoP///////////8JAKqqqAAAqqqqAAACggAP////////////wAKqqqgAgCqqqgAAAKgAP/////////////ACqqqgAYAqqqoAAACgAP/////////////8CqqqgAIAqqqqAAACqAP//////////////wKqoAAAAqqqqgAACqg////////////////wqqAAiAKqqqgAAAqg/////////////////CqAAgYKqqqoAAAKg/////////////////8KgAgCqqqqoCAAKg//////////////////woIEAqqqqqggKKg///////////////////CCAAKqqqqqoKqg///////////////////8KAIKqqqqqqCqA////////////////////wACqqqqqqqqqA/////////////////////ACqqqqqqqqqA//////////////////////CqqqqqqqqqD//////////////////////8KqqqqqqqqD///////////////////////wqqqqqqqqD////////////////////////CqqqqqqqD////////////////////////8KqqqqqoD/////////////////////////wKqqqqoD//////////////////////////AqqqqoP///////////////////////////CqqqoP///////////////////////////wKqqoP////////////////////////////wqqoP/////////////////////////////CqoP/////////////////////////////8KoP//////////////////////////////wgP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    leafpiles: '/////////AAAAAAAAAAAAAAAAA////////////////AAAAAAAAAAAAAAAAAP///////////////wAAAAAAAAAAAAAAAAD///////////////wAAAAAAAAAAAAAAAAA////////////////AAAAAAAAAAAAAAAAAD//8////////////wAAAAAAAAAAAAAAAAAP88D///////////8AAAAAAAAAAAAAAAAAAAAA///////////wAAAAAAAAAAAAAAAAAAAAAD//////////8AAAAAAAAAAAAAAAAAAAAAA//////////8AAAAAAAAAAAAAAAAAAAAAAP//////////AAAAAAAAAAAAAAAAAAAAAAD//////////wAAAAAAAAAAAAAAAAAAAAAAP/////////8AAAAAAAAAAAAAAAAAAAAAAD//////////AAAAAAAAAAAAAAAAAAAAAAA//////////wAAAAAAAAAAAAAAAAAAAAAAD//////////AAAAAAAAAAAAAAAAAAAAAAAP/////////wAAAAAAAAAAAAAAAAAAAAAAD/////////wAAAAAAAAAAAAAAAAAAAAAAA/////////8AAAAAAAAAAAAAAAAAAAAAAAP/////////AAAAAAAAAAAAAMAAAAAAAAAD/////////8AAAAAAAAAAAAAwAAAAAAAAA//////////AAAAAAAAAAAAAAAAAAAAAAAP/////////AAAAAAAAAAAAAAAwAAAAAAAA/////////wAAAAAAAAACqgAAMAAAAAAAAP////////8AAAAAAAAAAoKAAADAAAAAAAA/////////wAAAAAAAAACCpgAD8AAAAAAAP/////////wAAAAAAAAAAKYAD/AAAAAAAD/////////8AAAAAAAAAACqAAP8AAAAAAA////////P8wAAAAAAAAAKhoAAPAAAAAAAP///////w8AAAAAAAAAAAoKAAA8AAAAAAD///////8DAAAAAAAACAABCgAAAAAAAAAAP///////wAAAAAAAACgAACoAAAAAAAAAAP///////8AAAAAKAAAoAAAqAAAAAAAAAAD///////wAAAAACoAACAAAAAAAAAAAAAAA//////8wAAAAAAgAAggAAAAAAAAAAAAAA//////8AAAAAAAIICagAAAAAAAAAAMAAA//////8AAAAAAACoCqgAAAAAAAAAADAAA///////AAAAAAAAqCqoAAAAAAAAAAAAAAP/////PwAAAAAAACiqqAAAAAAAAAAAAAA//////wMAAAAAAAAqiqgAAAAAAAAAAAAP//////wAAAAAAAAACgqoAAAAAAAAAAAADP///8P8AAAAAAAAAAEKqgAAAAAAAAAAAAw///8ADAAAAAgAAAAAKoqAAAAAIIAAAAAAP///AAAAAAAoAAAAAAYKgAAAACKgAAAAAA/P/AAAAAAgIAAAAAAKCqIAAAAKoAAAAAAMD/wAAAAAKCAAAAAAAqqqgAAACoIAAAAAAA/8AAAAACqgAAAAAAKqqqAAAAACgAAAAAAD/wAAAACqqAAAgAACqqqoAAAgAoAAAAAAD//AAACqqqgACqAAAqqqoAAAAACAAAAAAAP/wAAAqqqqAAqAAAKqqqgAAACgAAAAAAAA/AAAAKqqqoAKgAACqqqoAAACqAAAAAAAADwAAAKqqqqoKgAAAKqqqAAAAoIAAAAAAAA8AAAqqqqqqqgAAAAqqqoAAAqCAAAAAAAA/8AAqqqqqqqgAAAACqqqAAAKqgAAAAAAA//wAqqqqqqqoAAAAAKqqoAAKqoAAAAAAA///AqqqqqqqoAAAAAAqqqAACqoAAAAAAA///8CqqqqqqoAAAAAAKqqAAAqqAgAAAAA////wKqqqqqqAAAIAAAqqgAAqqACAAAAA/////AqqqqqqoAACgAAKqoAKqogAIAAAD//////CqqqqqqAACgAAKqqACqqAAAQAAD//////8KqqqqqqgCqAAqqqoCqiAAAGgAD///////wKqqqqqqqqqKqqqqgqgAAABoAD////////AqqqqqqAAIqqqqqqqgAAAAKgD////////8CqqqqqAAACAAqqqqoAAAACgD/////////wKqqqqAAAAAACqqqpAAAAAAD//////////AKqqoAAAAAAAKqqqgAAAAAP///////////AqqoAAAAAAAAKqqgAAAAAP///////////8KqoAAAAAAAAAqqoAAAAAP////////////wqoAAAAAAAAACqqAAAAAP/////////////CoAAAAAAAAAAKqgAAAAP/////////////8AAAAAAAAAAAAqoAAAAP//////////////wAAAAAAAAAAACqAAAAP///////////////AAAAAAAoAAAAKoAAAP////////////////AAAAqqqgAAAAqgAA/////////////////8AAAqqqqAAAACqAA//////////////////wAAqqqqoAAAAKqA///////////////////ACqqqqqAAAAAqg///////////////////8CqqqqqqgAAACA////////////////////wCqqqqqoAAAAA/////////////////////AKqqqqqoAAAD//////////////////////AqqqqqqgAAD//////////////////////8CqqqqqoAAD///////////////////////wKqqqqqAAD////////////////////////CqqqqqAAD////////////////////////8KqqqqgAD/////////////////////////wqqqqoAD//////////////////////////AKqqoAD//////////////////////////8AqqqAD///////////////////////////wKqoAP////////////////////////////wCgAP/////////////////////////////AAAP/////////////////////////////8AAP//////////////////////////////wAP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    mushrooms: '/wAAAAAAAAAAAAAAAAAAAAAAP/wAAAAP//8AAAAAAAAAAAAAAAAAAAAAAD/8AAAAA///AAAAAAAAAAAAAAAAAAAAAAD/8AAAAAP//wAAAAAAAAAAAAAAAAAAAAAA//AAAAAD//8AAAAAAAAAAAAAAAAAAAAAA//wAAAAA//8AAAAAAAAAAAAAAAAAAAAAAP//AAAAAP/8AAAAAAAAAAAAAAAAAAAAAAP//AAAAAAP/AAAAAAAAAAAAAAAAAAAAAAD//AAAAAAA/wAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAP8AAAAAAAAAAAAAAAAAAAAAP//wAAAAAAD/AAAAAAAAAAAAAAPAAAAAAP//8AAAAAAA/AAAAAAAAAAAAAAPwAAAMAD///AAAAAAAPwAAAAAAAAAAAAAPwAADDAAP//wAAAAAAD8AAAAAAAAAAAAADwAAAA8AD//wAAAAAAAPAAAAAAAAAAAAAAAAAAD/AAP/wAAAAAAADwAAAAAAAAAAAAAAAAAA8AAP//AAAAAAAA/AAAAAAAAAAAAAAAAAAAAAD//AAAAAAAAPwAAAAAAAAMAAAAAAAAAAAD//8AAAAAAAP/AAAAAAAADAAAAAAAAAAAAD/8AAAAAAAD/wAAAAAAAAwAAAAAAAAAAAAP/wAAAAAAA/8AAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAP/AAAMAAAAAAAAAAAAAAAAAAD/wAAAAAAD/88ADAAAAAPAAAAAAAAAAAAAP/AAAAAAA//MAAAwAAAD8AAAAAAAAAAAAD/wMAwAAAP/AAAAMAAAA/AAAAAAAAAAAAAP/wAAAAAP/AAAADAAAA/AAAAAAAAAAADAD/wAAAAAD/wAAAAAAAAMAAAAAAAAAAAAMAP8AAAAAA/wAAAAAADADAAAAAAAAAAAAAAD8AAAAAAD8AAAAAwAAAAAAAAAAAAAAAAAA/AAAAAAD/wAAAAMMMAAAAAAAAAAAAAAAA/wAAAAAA/8AAAAAD/AAAAAAAAAAAAAAAAP/AAMAAA//wAAADA/wAAAAAAAAAAAAAAAA/8AAAAAP//MAwA8P8AAAAAAAAAAAAAAAAP//8AAAD///A8APMPAAAAAAAAAAAAAAAAA//zwAAA/////wDwAAAAAAAAAAAAAAAAAAA/8MAAP/////8AwAAAAAAAAAAAAAAAAAAAD/DwAz/////zAAAAAAAAAAAAAAAAAAAAAAPw8AAP////wADAAAAAAAAAAAAAAAAAAAAAMMADD////8AAAAAAAAAAAAAAAAAAAAAAAAMAAw////8AAAAAAAAAAAAAAAAAAAAAAAAAAAP/////AAAAAAAAAAAAAAAAAAAAAAAAAAAD/////wAAAAAAAAAAAAAAgAAAAAAAAAAAA/////8AAAAAAAAAAAAAAKgAAAAAAAAAAAPD////wAAAAAAAAAAAAAKaAAAAAAAAAAADA////MAAAAAAAAAAAAAAKqgKqAAAAAAAAAP///wAAAAAAAAAAAAAACqqKqoAAAAAAAAP///wAAAAAAAAAAAAAAAKqqqqAAAAAAAAAP//wAAAAAAAAAAAAAAAAqqqqAAAAAAAAAD///AAAAAAAAAAAAAAAACqqqAAAAAAAAAA///wAAAAAAAAAAAAAAAAKqqAAAAAAAAAA///wAAAAAAAAAAAAAAAACqqAAAAAAAAAAD//8AAAAAAAAAAAAAAAAAqqAAAAAAAAAAA///AAAAAAAAAAAAAAAAAqqgAAAAAAAAAA///8AAAAAAAAAAAAAAAAKqAAAAAAAAAAAP///wAAAAAAAAAAAAAAAKqgAAAAAAAAAAP////AAAAAAAAAAAAAAAAqAAAAAAAAAAA/////8AAAAAAAAAAAAAAACgAAAAAAAAAA//////wAAAAAAAAAAAAAAAAAAAAAAAAAA///////AAAAAAAAAAAAAAAAAAAAAAAAAA///////8AAAAAAAAAAAAAAAAAAAAAAAAA////////wAAAAAAAAAAAAAAAAAAAAAAAA/////////AAAAAAAAAAAAAAAAAAAAAAAA/////////8AAAAKoAqqAAAAAAAAAAAAAAP/////////wAAAAqooqoAAAAAAAAAAAAAD//////////AAAAqpqKqqoAAAAAAAAAAAA///////////AAAKqqqqqqgAAAAAAAAAAAP//////////8AACqqqqqqqAAAAAAAAAAAP///////////wAAKqqqqqqgAAAAAAAAAAD////////////AAAqqqqqqqqgAAAAAAAAD////////////8AAKqqqqqqoqAAAAAAAAD/////////////wAKqqoKqqoCoAAAAADwA//////////////AKqioAAKqCqgAAAAA8A//////////////8CqgoAAAqoqoAAAAD/w///////////////wCYAAAAAmCqgAAAD//////////////////AqgAAAACiqqgAAD//////////////////8CoAKgAAKqqoAAD///////////////////wIAqqAAAqqqAAD////////////////////AAKqgAACqqAAD////////////////////8AAqoAAAKpAgD/////////////////////wACoAAAAqgoD//////////////////////AAAAKoACmoD//////////////////////8AAACqgAqoD///////////////////////8AACqqAWoD////////////////////////wAKqqoFUD/////////////////////////ACqqqlUD/////////////////////////8AqqqpUD//////////////////////////wCqqpUD///////////////////////////ACqhUP///////////////////////////8AqoED////////////////////////////wGpEP/////////////////////////////BVUP/////////////////////////////8FUP//////////////////////////////wUP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    muddyshore: '/////////////////////////////////////////////////8////////////////////////////////8A///////////////////////////////wAP//////////////////////////////wAAP///P/////////////////////////8AAA///D/////////////////////////wAAAD//wP////////////////////////wAAAAP/wA////////////////////////8AAAAA/8AP///////////////////////wAAAAAD8AD///////////////////////wAAAAAAPwA///////////////////////wAAAAAAA8AP//////////////////////wAAAAAAADAA8P////////////////////wAAAAAAAAMAAAP///////////////////wAAAAAAAAAAAAA///////////////////wAAAAAAAAAAAAAD//////////////////wAAAAAAAAAAAAAAP/////////////////AAAAAAAAAAAAAAAA/////////////////AAAAAAAAAAAAAAAAD////////////////AAAAAAAAAAAAAAAAAP///////////////AAAAAAAAAAAAAAAAAD///////////////AAAAAAAAAAAAAAAAAAz//////////////wAAAAAAAAAAAAAAAAAM//////////////wAAAAAAAAAAAAAAAAAAP/////////////AAAAAAAAAAAAAAAAAAAPP////////////AAAAAAAAAAAAAAAAAAADD//////////P/AAAAAAAAAAAAAAAAAAAAD/////////Pz/AAAAAAAAAAAAAAAAAAAAMz////////z8/AAAAAAAAAAAAAAAAAAAAAA////////88PwAAAAAAAAAAAAAAAAAAAAA/////////DPAAAAAAAAAAAAAAAAAgAAAAP//////z/zDAAAAAAAAAAAAAAAAAKAAAAP//////8w8wAAAAAAAAIgAAAAAAACoAAAAP/////8MMMAAAAAAAAGmAAAAAAAAqoAAAP//////PAAAAAAAAAAAmgAAAAAIACqAAAD//////wwAAAAAAAAAACKAAAAAKAACAAAA//////MwAAAAAAAAAAAAAAAAAKgAAAAAAP////8PMAAAAAAAAAAAAAoAAACoAAAAAAA/////zAAAAAAAAAAAAAAAAACqqgAAAAAAD////8AAAAAAAAAAAAAACCAAqqqAAAAAAAP////AAAAAAAAAAAAAAAqYKKqqooAAAAAA////wAAAAAAAAAAAAAACaqqqqoKAAAAAAD///8AAAAAAAAAAAAAAAKqqgqmqYAAAAAgP//8AAAAAAAAAAAAAAAAqqgiqqqQAAAgJA///AAAAAAAAAAAAAAAACqqIKqaoAAAIqoD//8AAAAAAAAAAAAAAAAKpgCqYqqAAKqqgP/8AAAAAAAAAAAAAAAAAqgAqqCqqAKqqqAP/wAAAAAAAAAAAAAAAAJgAKqgKoAKqqoAA/8AAAAAAAAAAAAAAAAAgACqoCoACqqqAAP/AAAAAAAAAAAAAAAAAAAAKqAAAKqqqAAAPAAAAAAAAAAAAAAAAKAAACqoAAKqqqgAADwAAAAAAAAAAAAAAAKqAAAqqAAqqqqoAAA/AAAAAJqAAAAAAACqqqgAKqoIqqqqgAAA/8AAAAJqoAAAAAAKqqqoACqqKqqqqgAAA//wAAAAaqAAAAAAKqqqqACqqqqqqqoAAD///wAAAKqoAAAAAAqqpqgCqqqqqqqoAAD////AAAKqqAAAAAAKqqaqAqqqqqqqAAAD////8AACqqgAAAAJCaqqqgKiqqqqqAAAD/////wAAKqoAAAAioKqqqoCgqqqqgAAAD//////AACqqAAAAAqCCqqqAgKqqqgAAAD//////8AAqqgAAACqggqqqggKqqAIAAAD///////wACqoAAAAqqqpqqqIKqqAABAAD////////AAqqAAAAKmqqqqqoCqqAAGQAP/////////ACoAAAACqqqqqqqqqqgAKgAP/////////8AqgAAAAqqqqqqqqiqgACgAP//////////wKqAAKCqqqqqqhqoqoAAqAP///////////AAgAKgqqqqqqAqqqoAAEAP///////////8AAAaoKqqqqggKqqoAAAAP////////////wAAqqqqqoqoqqqqoAAAAP/////////////AAGqqqqoKqqqmqoAAAAP/////////////8ACqqqqpiqqqqqoAAgA///////////////wAIqqqqqqqqqqIAAIA////////////////wAAAqqqqqqqqAAoIA/////////////////AAAKqqqqqqIAAqCA/////////////////8AACqqoKqqAAAqqAD/////////////////wAAqqqAqpAAAKoAA//////////////////AAqqqACqAAAqqAAP/////////////////8AKgqACpQAAJqAAP//////////////////wKgKgCqgAACqA8P///////////////////AoJoCqoAAoKD/D///////////////////8AIqggiACaAD//////////////////////8KKqgAACpoD///////////////////////woqgBAggAD////////////////////////AKgBAAgAD////////////////////////8CoBQAAAD/////////////////////////woCoAAQD//////////////////////////ACqAAAD//////////////////////////8CqQAAD///////////////////////////wKkAAP////////////////////////////wKAAP/////////////////////////////AAAP/////////////////////////////8AAP//////////////////////////////wAP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    lilypond: '////////////////////////////////////////////8////////////////////////////////wA///////////////////////////////8AD//////////////////////////////8AA//////////////////////////////AAAD/////////////////////////////AAAA/////////////////////////////wAAAP////////////////////////////8AAAD////////////////////////////8AAAAD//8/////////////////////////AAAAAP/wD////////////////////////wAAAAD/wAP///////////////////////wAAAAA/wAA///////////////////////8AAAAADwAAD//////////////////////8AAAAAAwAAAP//////////////////////AAAAAAAAIAA//////////////////////wAAAAAAAKqAA/////////////////////8AAAAAAAqqoFD/////////////////////AAAAAAAqqqoQP////////////////////wAAAAAAqqqqAA////////////////////8AAAAAAKqqoAAD8///////////////////AAAAAACqqoAAEAP//////////////////wAAAAAAQqoAAAQA//////////////////8AAAAAAICoAKggAAP/////////////////wAMAAACAoCqoKAgA/////////////////8AMAAACoqCqqAIIAD/////////////////DAAAAAqiAiqACKAAP////////////////wwAAAgKoEAKgAKqgA////////////////88AAAIKoBACoCCqoAM////////////////AAAACoqAQAqAgKqoAP///////////////wAAAAoKgAAKoAKqqgD///////////////wAAAAIACQACqKCqqqAP//////////////wAAAAAAAgAAIqqgqqqA//////////////wAAAAAAAAAAACqACqqgP/////////////AAAAAAAAAAAAAAAAKqqA/////////////AAAAAAAAAAAAAAAACqqgD////////////AYAAAAAAAAAAAAAAAKCpAP///////////ACqAAAAAAAAAAAAAACAogA///////////AAqgAAAAAAAAAAAAAAAIAAD//////////AAqqAAAAAAAAAAAAAAAACAAP/////////AAqqoAAAAAAAAAAAAAAACoAA////////8AIqqoAAAAAAAAAAAAAAACqgAD///////8AAqqoAAAAAAAAAAAAAAAAqoAAD//////8AACqqAAAAAAAAAAAAAAAAAKgAAP/////8AAAqqgAAAAAAAAAAAAAAAACqAAA/////wAAAqqgAAAAAAAAAAAAAAAAAKoAAD////wAACqqgAAAAAAAAAAAAAAAAACqgAAD///wACqqqoAAAAAAAAAAAAAAAAAAKqAgAP//wACqqqqAAAAAAAAAAAAAAAAAAKqoKAAP/AAKqqoqgAAAAAAAAAAAAAAAAACqqgoAA/AAKqqoKoAAAAAAAAAAAAAAAAAAqqqKgADwAKqqqCqAAAAAAAAAAAAAAAAAACqqioAA8ACqqqAqgAAAAAAAAAAAAAAAAAAKKoKAAPwAKqqAKoAAAAAAAAAAAAAAAAAAACqKgAP/ACqqACqAAAAAAAAAAAAAAAAAAAAqqgA///AKqAAqgAAAAAAAAAAAAAAAAAAAqqgA///8AIAAKoAAAAAAAAAAAAAAAAAAAKqgA////wAAACqAAAAAAAAAAAAAAAAAAAKogA/////AAAAqgAAAAAAAAAAAAAAAAAAKgAA/////8AAAKqAAAAAAAAAAAAAAAAAIqoAA//////wAAKqoAAAAAAAAAAAAAAAAKqoAD///////wAqqqAAAAAAAAAAAAgAAAGqoAD////////ACqqoAAAAAAAAAAqqoAAGqoAD////////8AKqqgAAAAAAAAAqqqgACqqAD/////////wAqqqAAAAAAAAAKqqoACqgAD//////////ACqqgAAAAAAAACqqqgGqoAD//////////8AqqqgAAAAAAAApqqkCqgAD///////////wKiqoAAAAAAAACCqoCqgAD////////////AAqqgAAAAAAAAAKqCqgAP/////////////ACqqoAAAAAAAAAQqqgAP/////////////8ACqpAAAAAAAAAIKqgAP//////////////wAKqgAAAAAAAAAKqAAP///////////////AAqqAAAAAAAAAiqAAP///////////////8ACqoAAAAAAAAKqAAP////////////////wAqqgAAAAAAAKqgA//////////////////ACqoAAAAAAAKqoAP/////////////////8AKqqAAAAAAKqkA///////////////////8ASqpAAAAAKqoA////////////////////wAqqoAAAAKqqA/////////////////////BaqqAAAAKqgA/////////////////////8FqqgAAAKqoA//////////////////////wGqqAAAKqgA///////////////////////AaqoAAKqgD///////////////////////8AqqoAqqQD////////////////////////8CqqqqqgD/////////////////////////wqqqqJoD//////////////////////////AqIqAoD//////////////////////////8AAAAgD///////////////////////////wAAAAD////////////////////////////AAAAD////////////////////////////8AAAD/////////////////////////////wAAP//////////////////////////////wAP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    boatdock: '///////////////wAAP/////////////////////////////wAAA/////////////////////////////wAAAD///////////////////////z////wAAAAP//////////////////////wP///AAAAAA//////////////////////8A///AAAAAAD//////////////////////AD//wAAAAAAP/////////////////////AAP/wAAAAAAA/////////////////////wAAPwAAAAAAAD////////////////////8AAAAAAAAAAAAP///////////////////8AAAAAAAAAAAAAP///D///////////////AAAAAAAAAAAAAD///w///////////////AAAAAAAAAAAAAAD//8P//////////////wAAAAAAAAAAAAAAP/wD//////////////8AAAAAAAAAAAAAAAzwA//////////////8AAAAAAAAAAAAAAAM8AP//////////////AAAAAAAAAAAAAAAAMAD//////////////wAAAAAAAAAAAAAAADAA///////////////AAAAAAAAAAAAAAAAAAP//////////////wAAAAAAAAAAAAAAAAAD//////////////8AAAAAAAAAAAAAAAAAM///////////////AAAAAAAAAAAAAAAAADP/////////////8wAAAAAAAAAAAAAAAAAD/////////////8MAAAAAAAAAAAAAAAAAA/////////////8AAAAAAAAAAAAAAAAAAAP//////////8//AAAAAAAAAAAAAAAAAAAAP//////////D/AAAAAAAAAAAAAAAAAAAAA//////////A/wAAAAAAAAAAAAAAAAAAAAD/////////wD/AAAAAAAAAAAAAAAAAqAAAP////////wA/AAAAAAAAAAAAAAAAAKgAAAP///////8ADAAAAAAAAAAAAAAAAAKoAAAA////////AAAAAAAAAAAAAAAAAAAKYAAAAP///////8AAAAAAAAAAAAAAAAAAKoAAAAAP//////8AAAAAAAAAAAAAAAAAABgAAAAAA//////8AAAAAAAAAAAAAAAAAAKgAAAAAAD/////8AAAAAAAAACAAAAAAAAmoAAAAAAAP////8AAAAAAAAAAAAAAAAAAKYAAAAAAAA///8MAAAAAAAAAAAoAAAAAAKoAAAAAAAAD///AAAAAAAAAAAAJgAAAAABoAAAAAAAAAP//wAAAAAAAAAAAAqAAAAAqEAAAAAAAAAA//8AAAAAAAAAAAAAQAAAAqgAAAAAAAAAAD//AAAAAAAAAAAAACQAAAqYAAAAAAAAAAAP/wAAAAAAAAAAAAAKAAAaoAAAAAAAAAAAA/8AAAAAKAAAAAAACpAApgAAAAAAAAAAAAD/AAAAACqgAAAAAAJgAqgAAAAAAAAAAAAA/wAAAACqoAAAAAAAmAEgAAAAAAAAAAAAAP8AAAACBqgAAAAAABgaAAAAAAAAAAAAAAD8AACAAgCqAAAAAAAoJAAAAAAAAAAAAAAA8AAAgAIAqgAAAAAAqCgAAAAAAAAAAAAAAMAAAKAKgqgACgAAAKAgAAAAAAAAAAAAAADAAAIAKqqoAAqgAAKoAAAAAAAAAAAAAAAA8AAIAKqqqAAqqoACqAAAAAAAAAAAAAAAAPwAKAKqqqAAqqogCmgAAAAAAAAAAAAAAAD/AAgqqqqAACqCCCqgAAAAAAAAAAAAAAAA/8AIqqqqgAACgiqqgAAAAAAAAAAAAAAAAP/wAaqqqoAAAgBqqgAAAAAAAAAAAAAAAAD//ACqqqqAAAICmqgAAAAAAAAAAAAAAAAD//8AKCqqgAACCaSAAAAAAAAAAAAAAAAAA///wCgqqqAgAgJoAAAAAAAAAAAAAAAAAD////AACqqqqAoAkAAAAAAAAAAAAAAAAAD/////AAqqqqqKgCAAAAAAAAAAAAAAAAAP/////8AGpqqKqagAAAAAAAAAAAAAAAAAP//////wJqqqCCqkAAAAAAAAAAAAAAAAAD///////AqqqogqqgAAAAAAAAAAAAAAAAP///////8CqqqqqqqAAAAAAAAAAAAAAAAP////////wKqqqqqqqAAAoAAAAAAAAAAAP/////////AqqqqqqqgAAKoAAAAAAAAAAP/////////8CqqqqqqoAAApgAAAAAAAAAP//////////wKqqqqqqAAIKoAAAAAAAAAP///////////wqqqqqqoAACqgAAAAAAAA/////////////AKqqqoqAAAKqAAAAAAAAP////////////8AqqqqKoAgCqoAAAAAAA//////////////wCqqqhqgoAqqgAAAAAA///////////////AKqqqmqqAqqoAAAAAAP//////////////8AqqqqqqoKqqAgAAAAP///////////////wCqqqqqqqCqooAAAA/////////////////AqqqqqqqgqqoAAAA/////////////////8CqqqqqWqqqqgAAA//////////////////8KqqqqqqqqogAAA///////////////////wqaqqZqqqqADAA////////////////////CqqqqqqqqgD/D////////////////////8KqqqqAqpqD///////////////////////wKqqqgIqoD////////////////////////AqqqAJIAD////////////////////////8CqqgCpAD/////////////////////////wKqqIqAD//////////////////////////AqqqqAD///////////////////////////CqqqAP///////////////////////////8KooAP////////////////////////////wAAAP/////////////////////////////AAAP/////////////////////////////8AAP//////////////////////////////wAP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
    gardengate: '/////////////////////////////////////////////////8P///////////////////////////////8A///////////////////////////////8AD//////////////////////////////wAAP///A/////////////////////////wAAA///AP////////////////////////wAAAD/wAA////////////////////////wAAAADwAAP///////////////////////wAABAAAAAD///////////////////////wAAAUAAAAA///////////////////////wAAAFQAAAAP//////////////////////wAAAAVAAAAD//////////////////////AAAAAEAAAAA//////////////////////AAAAAAAAAAAP/////////////////////AAAAAAAAAAAD/////////////////////AAAAAAAAAAAA/////////////////////AAAAAAAAAAAAP////////////////////wAAAAAAAAAAAD////////////////////8AAAAAAAAAAAA/////////////////////AAAAAAAAAAAAP/////////////////8//wAAAAAAAAAAAA/////////////////8P/8AAAAAAAAAAAAD/////////////////D//AAAAAAAAAAAAAAAD//////////////wP/AAAAAAAAAAAAAAAA/////////////zAD/wAAAAAAAAAAAAAAAD////////////8wA/wAAAAAAAAAAAAAAAA////////////8AAPwAAAAAAAAAAAAAAAAP////////////wADwqAACAAAAAAAAAAAAD////////////wAAAqoAAoAAAAAAAAAAAA////////////wAAAqqAAKAAAAAAAAAAAAP///////////wAAAqqgAKoAAAAAAAAAAAD8//////////wAAACqoACqAAAAAAAQAAAA8A/////////AAAAAqqAAqgAAAAAABQAAAMAD////////AAAAAKqgAKqAAAAAABUAAADAAP///////AAAAAAqoAKqgAAAAABVAAAAwAA///////AAAAAACqACqqAAAAAAFQAAAMAAD//////AAAAAAAKgCqogAAAAAAAAAAAAAAD/////AAAAAAAAACooIAAAAAACAAAAAAAAP////AAAAAAAAAAgACAAAAAAAgAAAAAAAA////AAAAAAAAAAAACAAAAAAAIAAAAAAAAD///AAAAAAAAAAAAAoCAAAAAAAAAAAAAAAP/8AAAAAAAAAAAAAKqAAAAAACgBAAAAAAA/8AAAAAAAAAAAAACqgCAAAAAaBUAAAAAAAPAAAAAAAAAAAAAAqoAqgAAAFVVAAAAAAADAAAAAAAAAAAAAAKqqqqoAABVVQAAAAAAAwAAAAAAAAAAAAAKqqqqqAAARVYAAAAAAAMAAAAAAAAAAAAACqqqqqgAAEVaAAAAAAADAAAAAAAAAAAAAACqqqqoAABFqgAAABQAAwAAAAAAAAAAAAAAKqqqqAAAVaoAAABQAAMAAAAAAAAAAAAACKqqqqgAAFWqAAAFQAADAAAAAAAAAAAAAAqqqqqoAABFagAABQAAAwAAAAAAAAAAAAACCqqqqAAAQWgAABQAAAMAAAAAAAAAAAAAAgqqqqgAABVQAAAUAAAPwAAAAAAAAAAAAAIqqqqoAAAFYAAAFAAAP/AAAAAAAAAAAAAAKqqqqAAABYAAAAQAA///AAAAAAAAAAAAAKqqqqoAABWAAAAAAA///8AAAAAAAAAAAAKqqqqqoAAFgAAAAAA////wAAAAAAAAAACqqqqqqqAAAUAAAAAA/////AAAAAAAAAACqqqqqqoAAAFAAAAAA/////8AAAAAAAAAAqqqqqqqAAAAAAAAAA//////wAAAAAAAAkqqqqqqqAAAAAAAAAA///////wAAAAAAAGqqqqqqqgAAAAAAAAD///////8AAAAAAACqqqqmqqgAqgAAAAAD////////8AAAAAAAqqqqgKqqAqqAAAAAD/////////wAAAAAAqqqqgCqoCqqAAAAAD//////////AAAAAAqqqqoAqoAqqAAAAAD//////////8AAAAIqqqqqgAqAqqgAAAAD///////////wAAACqqqqqqACAKgAAAAAD////////////AAACqqqqqqgAACgAAAAAP/////////////AACqqqqqqqAAAoAAAAAP/////////////8ACqqqgqqqoAAQAAAAAP//////////////wCqqqoCqqqgAUAAAAAP///////////////CqqqGCqqqqgVAAAAAP///////////////8CqqAqqAqqqFQAAAAP////////////////wKgAKqgKqqpUAAAAP/////////////////AoAKqoAqqqlAAAAP/////////////////8AACqqQAqqqgAAA///////////////////8ACqqoAKqqoAAA////////////////////wAqqqAAqqqgAA/////////////////////AKqqgBCqqqAA/////////////////////8CqqqKgqqqgA//////////////////////wKqmqqgAqqA///////////////////////AKqqqoACqA///////////////////////8AiqqqgAKD////////////////////////8AqqqoEAD/////////////////////////wCqqqpUD//////////////////////////AKqqqVD//////////////////////////8AKqpUD///////////////////////////wAqqUD////////////////////////////AGpUD////////////////////////////8BaUD/////////////////////////////wFUP//////////////////////////////wUP///////////////////////////////AP///////////////////////////////8P//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
};
const plotWalk = {};

function plotWalkCells(id) {
    if (!plotWalk[id] && PLOT_WALK[id]) {
        const bytes = atob(PLOT_WALK[id]), cells = new Uint8Array(bytes.length * 4);
        for (let i = 0; i < bytes.length; i++) {
            const b = bytes.charCodeAt(i);
            cells.set([b >> 6, (b >> 4) & 3, (b >> 2) & 3, b & 3], i * 4);
        }
        plotWalk[id] = cells;
    }
    return plotWalk[id] || null;
}

// The whole world as a grid of WALK_CELL squares: 0 blocked, 1 grass, 2 path,
// 4 under a prop or by a person (she doesn't stand there).
const WALK_CELL = 15;
const WALK_PATCH = 50;  // the fewest cells a patch of ground needs to count
let walkMap = null;

// A plot's picture box in the world: left, top, width, height.
function plotBox(zone) {
    const id = zone.id || zone;
    const [ax, ay, aw, ar] = PLOT_SHAPE[id] || [50, 52, 97.5, 0.75];
    const tw = WORLD_TILE / (aw / 100), th = tw * ar, [x, y] = cellXY(id);
    return [x - (ax / 100) * tw, y - (ay / 100) * th, tw, th];
}

function buildWalkMap() {
    const { x0, y0, w, h } = WORLD_BOX, cols = Math.ceil(w / WALK_CELL), rows = Math.ceil(h / WALK_CELL);
    const cells = new Uint8Array(cols * rows).fill(1);
    const each = (bx, by, bw, bh, fn) => {
        const c0 = Math.max(0, Math.floor((bx - x0) / WALK_CELL)), c1 = Math.min(cols - 1, Math.floor((bx + bw - x0) / WALK_CELL));
        const r0 = Math.max(0, Math.floor((by - y0) / WALK_CELL)), r1 = Math.min(rows - 1, Math.floor((by + bh - y0) / WALK_CELL));
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
            const v = fn(x0 + (c + 0.5) * WALK_CELL, y0 + (r + 0.5) * WALK_CELL);
            if (v !== undefined) cells[r * cols + c] = v;
        }
    };
    const walkIndex = (x, y) => Math.floor((y - y0) / WALK_CELL) * cols + Math.floor((x - x0) / WALK_CELL);
    const diamond = (cx, cy, hw, hh, v) => each(cx - hw, cy - hh, hw * 2, hh * 2, (x, y) => (Math.abs(x - cx) / hw + Math.abs(y - cy) / hh <= 1 ? v : undefined));
    // The dirt paths between the areas.
    worldPaths().match(/class="path-dirt"[^>]*/g).forEach(l => {
        const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(k => +l.match(new RegExp(` ${k}="([-\\d.]+)"`))[1]);
        const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2 || 1;
        each(Math.min(x1, x2) - 60, Math.min(y1, y2) - 60, Math.abs(x2 - x1) + 120, Math.abs(y2 - y1) + 120, (x, y) => {
            const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / len2));
            return Math.hypot(x - x1 - t * (x2 - x1), y - y1 - t * (y2 - y1)) < 45 ? 2 : undefined;
        });
    });
    // The Market and the Town Square: their plots' ground, or (as paintings) in the way.
    ['market', 'town'].forEach(id => {
        const grid = (ASSETS.plots || {})[id] && plotWalkCells(id), [x, y] = cellXY(id);
        if (!grid) return diamond(x, y, WORLD_TILE * 0.42, WORLD_TILE * 0.25, 0);
        const [bx, by, bw, bh] = plotBox(id);
        each(bx, by, bw, bh, (px, py) => {
            const v = grid[Math.min(99, Math.floor(((py - by) / bh) * 100)) * 100 + Math.min(99, Math.floor(((px - bx) / bw) * 100))];
            return v === 3 ? undefined : v;
        });
        // Where its people stand, with their bubbles above them: she never
        // stands in front of, on or behind one of them.
        const spots = PLACE_SPOTS[id], people = id === 'market' ? [spots.keeper] : Object.values(spots.homes);
        people.forEach(([ax, ay]) => {
            const fx = bx + (ax / 100) * bw, fy = by + (ay / 100) * bh;
            each(fx - 70, fy - 210, 140, 300, (px, py) => (cells[walkIndex(px, py)] ? 4 : undefined));
        });
    });
    ZONES.forEach(zone => {
        const [x, y] = cellXY(zone.id), grid = inWorld(zone) && plotWalkCells(zone.id);
        if (!zoneOpen(zone)) return diamond(x, y, WORLD_TILE * 0.66, WORLD_TILE * 0.46, 0); // in its fog
        if (!grid) return;
        const [bx, by, bw, bh] = plotBox(zone);
        each(bx, by, bw, bh, (px, py) => {
            const v = grid[Math.min(99, Math.floor(((py - by) / bh) * 100)) * 100 + Math.min(99, Math.floor(((px - bx) / bw) * 100))];
            return v === 3 ? undefined : v;
        });
        // Where a prop stands (a mess, or the thing that's fixed) she never
        // stands.
        zoneTasks(zone.id).forEach(task => {
            if (!plotProp(task, taskDone(task))) return;
            propPlaces(task).forEach(([px, py, pw]) => {
                const fx = bx + (px / 100) * bw, fy = by + (py / 100) * bh, rx = (Math.abs(pw) / 100) * bw * 0.32 + 4, ry = rx * 0.5;
                each(fx - rx, fy - ry * 1.6, rx * 2, ry * 2, (x, y) => {
                    const i = walkIndex(x, y);
                    return cells[i] && ((x - fx) / rx) ** 2 + ((y - fy + ry * 0.6) / ry) ** 2 <= 1 ? 4 : undefined;
                });
            });
        });
    });
    // Patches of ground cut off from the rest, too small to stand about on, don't count.
    const part = new Int32Array(cells.length), sizes = [0];
    for (let i = 0; i < cells.length; i++) {
        if (!cells[i] || part[i]) continue;
        const id = sizes.length, todo = [i];
        part[i] = id;
        let n = 0;
        const visit = k => { if (cells[k] && !part[k]) { part[k] = id; todo.push(k); } };
        while (todo.length) {
            const j = todo.pop(), c = j % cols;
            n++;
            if (c > 0) visit(j - 1);
            if (c < cols - 1) visit(j + 1);
            if (j >= cols) visit(j - cols);
            if (j + cols < cells.length) visit(j + cols);
        }
        sizes.push(n);
    }
    for (let i = 0; i < cells.length; i++) if (cells[i] && sizes[part[i]] < WALK_PATCH) cells[i] = 0;
    return { cells, cols, rows };
}

// Made again only when an area opens or a job is done.
function walkGrid() {
    const key = ZONES.map(z => (zoneOpen(z) ? 1 : 0)).join('') + TASKS.filter(taskDone).length;
    if (!walkMap || walkMap.key !== key) walkMap = { ...buildWalkMap(), key };
    return walkMap;
}

// The cell under a point, and a cell's middle.
function walkCell(x, y) {
    const { cols, rows } = walkGrid(), { x0, y0 } = WORLD_BOX;
    return Math.max(0, Math.min(rows - 1, Math.floor((y - y0) / WALK_CELL))) * cols + Math.max(0, Math.min(cols - 1, Math.floor((x - x0) / WALK_CELL)));
}

function cellMiddle(i) {
    const { cols } = walkGrid();
    return [WORLD_BOX.x0 + ((i % cols) + 0.5) * WALK_CELL, WORLD_BOX.y0 + (Math.floor(i / cols) + 0.5) * WALK_CELL];
}

// The nearest place to stand to a point (a path, if `path` and there's one
// within `reach`), or null. She stands with open ground just in front of her,
// so nothing painted in front of her looks as if she's standing on it.
function standNear(x, y, path = false, reach = 400) {
    const { cells, cols, rows } = walkGrid(), c0 = Math.floor((x - WORLD_BOX.x0) / WALK_CELL), r0 = Math.floor((y - WORLD_BOX.y0) / WALK_CELL);
    const want = path ? 2 : 1, most = Math.ceil(reach / WALK_CELL);
    for (let d = 0; d <= most; d++) {
        let best = null, far = Infinity;
        for (let r = r0 - d; r <= r0 + d; r++) for (let c = c0 - d; c <= c0 + d; c++) {
            if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== d || r < 0 || c < 0 || r >= rows || c >= cols) continue;
            const v = cells[r * cols + c], dist = (r - r0) ** 2 + (c - c0) ** 2;
            if (v >= want && v < 4 && dist < far && [1, 2, 3, 4].every(k => r + k >= rows || cells[(r + k) * cols + c])) { far = dist; best = r * cols + c; }
        }
        if (best !== null) return cellMiddle(best);
    }
    return path ? standNear(x, y, false, reach) : null;
}

// Where she stands to work on a job: on open ground just in front of its
// prop, or null when the job isn't on a plot in the world.
function jobWorldXY(task) {
    const zone = task && ZONE[task.zone], job = task && plotJob(task);
    if (!zone || !job || !inWorld(zone)) return null;
    const [bx, by, bw, bh] = plotBox(zone);
    const x = bx + (job[1] / 100) * bw, y = by + (job[2] / 100) * bh;
    return standNear(x - 75, y + 45, false, 300) || [x, y];
}

function heroEl() {
    return document.querySelector('#scene-map .hero');
}

function addHero(ui) {
    if (!ASSETS.hero) return;
    const firstPlace = () => {
        const task = openTasks().find(t => jobWorldXY(t));
        [hero.x, hero.y] = jobWorldXY(task) || standNear(...cellXY('barnyard'), true) || cellXY('barnyard');
    };
    if (hero.x === null) firstPlace();
    const el = document.createElement('div');
    el.className = 'hero';
    el.innerHTML = `<i class="hero-shadow"></i><img class="hero-art" src="${ASSETS.hero.stand}" alt="" draggable="false">`;
    ui.appendChild(el);
    placeHero(el);
    // A moment later: if a prop now stands where she was, she steps off it.
    setTimeout(() => {
        if (!el.isConnected || [1, 2].includes(walkGrid().cells[walkCell(hero.x, hero.y)])) return;
        const at = standNear(hero.x, hero.y, false, 300);
        if (at) popHero(el, at);
        else { firstPlace(); placeHero(el); }
    }, 400);
}

// Where she stands, at her feet. Moved by `translate` (in her own width and
// height, so it keeps up with the zoom), not left and top: nothing else on the
// map has to be laid out again.
function placeHero(el) {
    const wide = HERO_TALL * ASSETS.hero.aspect, { x0, y0, w, h } = WORLD_BOX;
    el.style.width = (wide / w) * 100 + '%';
    el.style.height = (HERO_TALL / h) * 100 + '%';
    el.style.translate = `${((hero.x - wide / 2 - x0) / wide) * 100}% ${((hero.y - HERO_TALL - y0) / HERO_TALL) * 100}%`;
}

// She turns up at a place (a little puff).
function popHero(el, at) {
    [hero.x, hero.y] = at;
    placeHero(el);
    el.classList.remove('popping', 'cheer');
    void el.offsetWidth;
    el.classList.add('popping');
}

// She turns up at a job, to work on it (if she isn't there already).
function heroToJob(task) {
    const el = heroEl(), to = jobWorldXY(task);
    if (el && to && Math.hypot(to[0] - hero.x, to[1] - hero.y) > 5) popHero(el, to);
}

// Once a drag stops: if she's out of sight, she pops up on a path near the
// middle of the screen (or on grass, if there's no path).
function heroFollow(view, stage) {
    const el = heroEl();
    if (!el || fixing || view.classList.contains('far')) return;
    const { x0, y0, w, h } = WORLD_BOX;
    const cx = x0 + worldView.fx * w, cy = y0 + worldView.fy * h;
    const hw = (view.clientWidth / stage.offsetWidth) * w / 2, hh = (view.clientHeight / stage.offsetHeight) * h / 2;
    if (Math.abs(hero.x - cx) < hw * 0.85 && hero.y - HERO_TALL > cy - hh * 0.9 && hero.y < cy + hh * 0.8) return;
    const at = placeStand(cx, cy, hw, hh) || standNear(cx, cy + hh * 0.2, true, Math.min(hw, hh) * 0.7);
    if (at) { popHero(el, at); heroPose('wave', 1800); }
}

// Looking at a place with set spots for her (PLACE_SPOTS[id].stand): the one in view
// nearest the middle, in world units; null when there's none.
function placeStand(cx, cy, hw, hh) {
    let best = null, far = Infinity;
    Object.entries(PLACE_SPOTS).forEach(([id, spots]) => {
        if (!spots.stand || !(ASSETS.plots || {})[id]) return;
        const [bx, by, bw, bh] = plotBox(id);
        if (cx < bx || cx > bx + bw || cy < by || cy > by + bh) return;
        spots.stand.forEach(([sx, sy]) => {
            const x = bx + (sx / 100) * bw, y = by + (sy / 100) * bh;
            if (Math.abs(x - cx) > hw * 0.8 || y - HERO_TALL < cy - hh * 0.85 || y > cy + hh * 0.75) return;
            const d = Math.hypot(x - cx, y - (cy + hh * 0.2));
            if (d < far) { far = d; best = [x, y]; }
        });
    });
    return best;
}

// What she's doing: hammering away at a job (a swing), or what she's thinking,
// in a little bubble over her head.
const HERO_EMOTE = { hammer: '🔨', think: '💭', point: '❗', wave: '👋', clap: '👏', carry: '📦' };
let heroPoseTimer = 0;

// She strikes a pose (back to standing after `ms`, if given).
function heroPose(name, ms) {
    const el = heroEl();
    if (!el) return;
    clearTimeout(heroPoseTimer);
    el.dataset.pose = name;
    if (name === 'stand') return el.querySelector('.emote')?.remove();
    if (HERO_EMOTE[name]) emote(HERO_EMOTE[name], ms || 1800);
    if (ms) heroPoseTimer = setTimeout(() => heroPose('stand'), ms);
}

// A little bubble over her head for a moment.
function emote(what, ms = 1800) {
    const el = heroEl();
    if (!el) return;
    el.querySelector('.emote')?.remove();
    const bubble = document.createElement('i');
    bubble.className = 'emote';
    bubble.innerHTML = iconize(what);
    el.appendChild(bubble);
    setTimeout(() => bubble.remove(), ms);
}

// A job done: she jumps for joy, then claps.
function cheerHero() {
    const el = heroEl();
    if (!el) return;
    heroPose('jump');
    emote('🎉', 800);
    el.classList.remove('cheer');
    void el.offsetWidth; // restart the hop
    el.classList.add('cheer');
    heroPoseTimer = setTimeout(() => heroPose('clap', 1300), 700);
}

// --- THE MARKET AND THE TOWN SQUARE, IN THE WORLD ---
// Nothing to fix here (the Town's houses aside). Drag one onto the screen and
// its people say hello; then a banner over each stall or board says what it is
// and what it does, and a tap does it. People and banners are drawn by the
// game, not the picture, so prices and missions stay up to date.

// Where things are on each picture (% across, % down): where people stand (at
// their feet) and where each banner's tail points.
const PLACE_SPOTS = {
    market: {
        keeper: [48, 31],
        banners: { shop: [50, 8], deeds: [19, 14], guide: [80, 17], manual: [80, 28], energy: [19, 40], treasure: [84, 39], deals: [67, 60], well: [34, 66] },
    },
    town: {
        progress: [36, 3],
        banners: { missions: [57, 34], show: [56, 15] },
        homes: { townhall: [41, 42], carpenter: [23, 55], ranch: [71, 49], fishshop: [45, 69], flowershop: [57, 77] }, // each owner at their door
        jobs: { town1: [50, 47], town7: [50, 58], townhall: [35, 27], carpenter: [17, 40], ranch: [77, 34], fishshop: [34, 58], flowershop: [65, 63] },
        // Where the farmer turns up when you look at the square: clear cobbles, clear of its
        // people, benches, barrels and water (its paving is too crowded for the walk map).
        stand: [[31, 48], [33, 44], [20, 66], [53, 71], [62, 84], [64, 30], [66, 50], [82, 56], [80, 64]],
    },
};
const PERSON_HEIGHT = 92; // how tall someone in one picture stands, in world units (as tall as the farmer)
const PERSON_SCALE = { hattie: 1.06, finn: 0.98, poppy: 0.8 }; // taller or shorter than that
const PERSON_STAND = 84; // how tall someone with poses stands, in world units (as tall as the farmer)
const WELL_GIFTS = [{ money: 150 }, { energy: 15 }, { gems: 3 }];
const placeSaid = {}; // which places have said hello this visit

// What each banner shows and does: its icon, name and what it does (null: not shown).
function placeBanner(id) {
    const ads = SalesAds.ready(); // an ad network to show them
    const next = firstLandForSale() || Object.keys(AREAS).find(a => !unlocks[a]);
    switch (id) {
        case 'shop': return { icon: uiIcon('offer', '🏪'), name: 'Market', what: 'Deeds, offers and more', go: () => goTo('market'), spot: 'market' };
        case 'deeds': return { icon: `<img src="${ASSETS.props.deed}" alt="📜">`, name: 'Land Deeds',
            what: !next ? 'All the land is yours!' : quests.level < AREAS[next].level ? `${AREAS[next].name} · ${uiIcon('lock', '🔒')} Lv ${AREAS[next].level}` : `${AREAS[next].name} · 💵 ${shortNumber(AREAS[next].cost)}`,
            go: () => (next ? offerDeed(next) : toast('All the land is yours!')), hot: !!firstLandForSale() };
        case 'guide': return maxTier < NAMES.barn.length - 1 && { icon: `<img src="${ASSETS.props.upgrade}" alt="📘">`, name: 'Growth Guide',
            what: `Everything grows one size bigger · 💵 ${shortNumber(guideCost())}`, go: offerUpgrade };
        case 'manual': return !!manualCost() && { icon: `<img src="${ASSETS.props.manual}" alt="📕">`, name: 'Workshop Manual',
            what: `Tools merge one step further · 💵 ${shortNumber(manualCost())}`, go: offerManual };
        case 'energy': return { icon: uiIcon('energy', '⚡'), name: 'Energy', what: 'Refill your ⚡ and keep merging', go: () => openEnergy() };
        case 'treasure': return { icon: uiIcon('gem', '💎'), name: 'Gems & Chests', what: 'Gem packs and treasure chests', go: () => openShop() };
        case 'deals': return { icon: uiIcon('sale', '🏷️'), name: 'Daily Deals', what: 'New bargains every day', go: openDailyDeals, hot: dealsWaiting() };
        case 'well': return ads && { icon: uiIcon('ad', '📺'), name: 'Wishing Well', what: adsLeft() > 0 ? 'Watch a short ad: a free gift!' : 'Resting until tomorrow', go: wishingWell, hot: adsLeft() > 0 };
        case 'missions': return { icon: uiIcon('jobs', '📋'), name: 'Missions', what: 'Daily tasks, and a chest when they\'re done', go: openDailyGoals, hot: dailyClaimable() > 0 };
        case 'show': return ads && { icon: uiIcon('ad', '📺'), name: 'Showtime!', what: adsLeft() > 0 ? `Watch a show for ⚡${AD_ENERGY}` : 'Next show tomorrow', go: () => { if (adsLeft() > 0) { watchAdForEnergy(); refreshPlaces(); } else toast('Next show tomorrow!'); }, hot: adsLeft() > 0 };
    }
    return null;
}

function wishingWell() {
    if (adsLeft() <= 0) return toast('The well is resting. Come back tomorrow!');
    showRewardedAd(() => {
        shop.adsWatched++;
        grantReward(WELL_GIFTS[Math.floor(Math.random() * WELL_GIFTS.length)], '🪙 The wishing well:');
        refreshPlaces();
    });
}

// A person standing on a place's picture, at their feet's spot (% of it), in
// the pose they're in (if they have poses).
function addPlacePerson(twin, id, at, who, name, onClick) {
    const [, , bw, bh] = plotBox(id), set = (ASSETS.poses || {})[who];
    const el = document.createElement('button');
    el.className = 'place-person';
    el.dataset.who = who;
    if (set) {
        const [fw, fh, tall, feet] = set.frame, k = PERSON_STAND / tall, w = ((fw * k) / bw) * 100, h = ((fh * k) / bh) * 100;
        const pose = personPose(who);
        el.classList.add('posed');
        el.dataset.pose = pose;
        el.style.cssText = `left:${at[0] - w / 2}%;top:${at[1] - h + ((feet * k) / bh) * 100}%;width:${w}%;height:${h}%;z-index:${Math.round(at[1]) + 30}`;
        el.innerHTML = `<img src="${set[pose]}" alt="${name}" draggable="false">`;
    } else {
        const tall = PERSON_HEIGHT * (PERSON_SCALE[who] || 1), w = (tall / bw) * 100, h = (tall / bh) * 100;
        el.style.cssText = `left:${at[0] - w / 2}%;top:${at[1] - h * 0.94}%;width:${w}%;height:${h}%;z-index:${Math.round(at[1]) + 30}`;
        el.innerHTML = `<img src="${ASSETS.characters[who]}" alt="${name}" draggable="false">`;
    }
    el.addEventListener('click', onClick);
    twin.appendChild(el);
    return el;
}

// --- THEIR POSES ---
// Someone with poses waves as you drag their place into view, talks while
// their bubble shows, holds out their hands while you have what they asked
// for, cheers and claps when it's handed over or their job is done, and now
// and then thinks, asks after their order, or points the way.
const personNow = {}; // who -> { pose, until, timer }: a passing pose
const cheerLater = new Set(); // who got their order or job while out of sight
const placeShown = {}; // which places are on screen

// The pose they're in: a passing one, or how they stand.
function personPose(who) {
    const now = personNow[who];
    if (now && now.until > Date.now()) return now.pose;
    const npc = npcs.find(n => n.id === who);
    return npc && canFulfill(npc) ? 'ask' : 'stand';
}

function drawPerson(who) {
    const set = (ASSETS.poses || {})[who], pose = personPose(who);
    document.querySelectorAll(`#scene-map .place-person[data-who="${who}"]`).forEach(el => {
        el.dataset.pose = pose;
        if (set) el.querySelector('img').src = set[pose];
    });
}

// They strike poses one after another ([pose, ms] each), then stand again
// (someone in one picture just hops for joy when they cheer).
function posePerson(who, ...steps) {
    const now = personNow[who] || (personNow[who] = {});
    clearTimeout(now.timer);
    const next = () => {
        const [pose, ms] = steps.shift() || [];
        now.pose = pose;
        now.until = pose ? Date.now() + ms : 0;
        drawPerson(who);
        if (pose) now.timer = setTimeout(next, ms);
    };
    next();
}

// Which place someone stands in.
function personPlace(who) {
    return who === 'shopkeeper' ? 'market' : 'town';
}

// An order handed over or a job done: they cheer and clap, now if their
// place is on screen, otherwise when it next is.
function cheerPerson(who) {
    if (currentScene === 'map' && placeShown[personPlace(who)]) posePerson(who, ['cheer', 1000], ['clap', 1500]);
    else cheerLater.add(who);
}

// A place comes into view: its people wave (or cheer, if you did something
// for them while away), each a moment apart.
function greetPlace(id) {
    document.querySelectorAll(`#scene-map .place-ui[data-place="${id}"] .place-person`).forEach((el, i) => {
        const who = el.dataset.who;
        setTimeout(() => {
            if (cheerLater.delete(who)) posePerson(who, ['cheer', 1000], ['clap', 1500]);
            else if (!(personNow[who]?.until > Date.now())) posePerson(who, ['wave', 1400]);
        }, 150 + i * 220);
    });
}

// Now and then, someone on screen strikes a pose.
setInterval(() => {
    if (currentScene !== 'map' || document.hidden) return;
    const idle = [...document.querySelectorAll('#scene-map .place-person.posed')].filter(el =>
        placeShown[el.closest('.place-ui').dataset.place] && !(personNow[el.dataset.who]?.until > Date.now()));
    const el = idle[Math.floor(Math.random() * idle.length)];
    if (!el || Math.random() < 0.35) return;
    const who = el.dataset.who, npc = npcs.find(n => n.id === who);
    const choices = npc?.request && !canFulfill(npc) ? ['ask', 'ask', 'think'] : who === 'shopkeeper' || who === 'mayor' ? ['point', 'think'] : ['think'];
    posePerson(who, [choices[Math.floor(Math.random() * choices.length)], 2200]);
}, 3000);

function addPlace(id, stage, ui) {
    const [bx, by, bw, bh] = plotBox(id), [, y] = cellXY(id), spots = PLACE_SPOTS[id];
    const tile = document.createElement('section');
    tile.className = 'world-tile plotted world-placeplot';
    tile.dataset.place = id;
    tile.style.zIndex = Math.round(y - WORLD_BOX.y0);
    tile.innerHTML = `<div class="plot-stage"><img class="zone-art plot-art" src="${ASSETS.plots[id]}" alt="" draggable="false"></div>`;
    worldPlace(tile, bx, by, bw, bh);
    stage.insertBefore(tile, ui);
    const twin = document.createElement('div');
    twin.className = 'tile-ui place-ui';
    twin.dataset.place = id;
    worldPlace(twin, bx, by, bw, bh);
    ui.appendChild(twin);
    fillPlace(id, twin);
}

// The place's people, banners and jobs (drawn again when something changes).
function fillPlace(id, twin) {
    twin.innerHTML = '';
    const spots = PLACE_SPOTS[id];
    Object.entries(spots.banners).forEach(([b, at]) => {
        const info = placeBanner(b);
        if (!info) return;
        const el = document.createElement('button');
        el.className = 'place-banner' + (info.hot ? ' hot' : '') + (info.spot ? ' spot' : '');
        if (info.spot) el.dataset.id = info.spot;
        el.dataset.banner = b;
        el.style.left = at[0] + '%';
        el.style.top = at[1] + '%';
        el.innerHTML = iconize(`<span class="pb-icon">${info.icon}</span><span class="pb-text"><b>${info.name}</b><small>${info.what}</small></span>`);
        el.addEventListener('click', info.go);
        twin.appendChild(el);
    });
    if (id === 'market') {
        addPlacePerson(twin, id, spots.keeper, 'shopkeeper', 'Shopkeeper', () => placeSay(id, true));
        return;
    }
    // Sunnyvale: how far its rebuilding has come, its jobs, and its people at their doors.
    const jobs = landTasks('town'), done = jobs.filter(taskDone).length;
    const bar = document.createElement('button');
    bar.className = 'town-progress spot';
    bar.dataset.id = 'town';
    bar.style.left = spots.progress[0] + '%';
    bar.style.top = spots.progress[1] + '%';
    bar.innerHTML = iconize(`<b class="tp-name">${TOWN_NAME}</b><span class="tp-bar"><i style="width:${(done / jobs.length) * 100}%"></i>
        <em>${done === jobs.length ? '✨ All restored!' : `${uiIcon('hammer', '🔨')} ${done}/${jobs.length} restored`}</em></span>`);
    bar.addEventListener('click', () => goTo('town'));
    twin.appendChild(bar);
    addJobChips(jobs, twin, task => spots.jobs[task.house || task.id] || [50, 50]);
    npcs.forEach(npc => {
        const at = spots.homes[npc.home];
        if (!at) return;
        const person = addPlacePerson(twin, id, at, npc.id, npc.name, () => openNpc(npc));
        person.dataset.npc = npc.id;
        const r = npc.request;
        if (r) addTag(person, 'task-pin' + (canFulfill(npc) ? ' ready' : ''), `<span class="pin-item${canFulfill(npc) ? ' met' : ''}">${itemIcon(r.mode, r.tier)}</span>`);
    });
}

function refreshPlaces() {
    document.querySelectorAll('#scene-map .place-ui').forEach(twin => fillPlace(twin.dataset.place, twin));
    openNearestBanner();
}

// Who says hello in a place, and what.
function placeGreeting(id) {
    if (id === 'market') {
        const line = shopkeeperHint() || (dealsWaiting() ? 'Fresh Daily Deals on my cart today! Take a look.' : SHOPKEEPER_LINES[shopkeeperLine++ % SHOPKEEPER_LINES.length]);
        return { id: 'shopkeeper', who: 'Shopkeeper', at: PLACE_SPOTS.market.keeper, line };
    }
    const here = npc => PLACE_SPOTS.town.homes[npc.home];
    const ready = npcs.find(n => canFulfill(n) && here(n));
    if (ready) return { id: ready.id, who: ready.name, at: here(ready), line: `You have my ${itemName(ready.request.mode, ready.request.tier)}! Tap me, and I will take it.` };
    const jobs = landTasks('town'), done = jobs.filter(taskDone).length, mayor = npcs.find(n => n.id === 'mayor');
    return { id: 'mayor', who: mayor.name, at: here(mayor),
        line: done < jobs.length ? `Welcome to ${TOWN_NAME}! We fixed ${done} of ${jobs.length} things. The board has today's missions.` : `${TOWN_NAME} looks brand new, thanks to you! The board has today's missions.` };
}

// Its person speaks up (banners wait until they've had their say).
function placeSay(id, again = false) {
    const twin = document.querySelector(`#scene-map .place-ui[data-place="${id}"]`);
    if (!twin || (placeSaid[id] && !again)) return;
    const greeting = placeGreeting(id);
    if (!greeting) return;
    placeSaid[id] = true;
    twin.querySelectorAll('.place-say').forEach(el => el.remove());
    const { id: speaker, who, at, line } = greeting, [, , , bh] = plotBox(id);
    const tall = PERSON_HEIGHT * (PERSON_SCALE[speaker] || 1) * 0.95;
    const say = document.createElement('div');
    say.className = 'place-say';
    say.style.left = at[0] + '%';
    say.style.top = at[1] - (tall / bh) * 100 + '%';
    say.innerHTML = `<b>${who}</b>${line}`;
    twin.appendChild(say);
    // Kept on screen: nudged sideways if it would run off an edge, its tail still at the speaker.
    requestAnimationFrame(() => {
        const view = twin.closest('.world-view').getBoundingClientRect(), t = twin.getBoundingClientRect(), k = t.width / twin.offsetWidth || 1;
        const mid = t.left + (at[0] / 100) * t.width, half = (say.offsetWidth * k) / 2, edge = 8;
        const shift = mid - half < view.left + edge ? view.left + edge - (mid - half) : mid + half > view.right - edge ? view.right - edge - (mid + half) : 0;
        if (shift) say.style.setProperty('--nudge', `${shift / k}px`);
        say.classList.toggle('no-tail', Math.abs(shift) > half - 18); // the speaker is off the screen
    });
    twin.classList.add('talking');
    posePerson(speaker, ...(again ? [] : [['wave', 1100]]), ['talk', again ? 4500 : 3400]);
    const hush = () => {
        say.remove();
        twin.classList.remove('talking');
        if (personNow[speaker]?.pose === 'talk') posePerson(speaker);
    };
    say.addEventListener('click', hush);
    setTimeout(hush, 4500);
}

// The stall sign nearest the middle of the screen opens into its banner (the
// others stay small round signs, so the stalls themselves can be seen).
function openNearestBanner() {
    const view = document.querySelector('#scene-map .world-view');
    if (!view) return;
    const r = view.getBoundingClientRect(), mx = r.left + r.width / 2, my = r.top + r.height * 0.45;
    let best = null, far = r.width * 0.45;
    view.querySelectorAll('.place-banner').forEach(el => {
        const b = el.getBoundingClientRect(), d = Math.hypot(b.left + b.width / 2 - mx, b.bottom - my);
        if (d < far) { far = d; best = el; }
    });
    view.querySelectorAll('.place-banner.open').forEach(el => el !== best && el.classList.remove('open'));
    best?.classList.add('open');
}

// Once a drag stops: a place now in the middle of the screen says hello, and
// its people wave as it comes into view (`quiet`: the map just drawn, so they
// only wave).
function placesInView(view, quiet = false) {
    openNearestBanner();
    const { x0, y0, w, h } = WORLD_BOX;
    const cx = x0 + worldView.fx * w, cy = y0 + worldView.fy * h;
    const busy = view.classList.contains('far') || fixing || !dialogEl.hidden;
    ['market', 'town'].filter(id => (ASSETS.plots || {})[id]).forEach(id => {
        const [bx, by, bw, bh] = plotBox(id);
        const shown = !busy && cx > bx + bw * 0.15 && cx < bx + bw * 0.85 && cy > by + bh * 0.1 && cy < by + bh * 0.9;
        if (shown && !placeShown[id]) greetPlace(id);
        if (shown && !quiet) placeSay(id);
        if (!busy) placeShown[id] = shown;
    });
}

// The land whose row is nearest the middle of the screen (of those you own):
// where the Merge button takes you.
function worldLand() {
    const { x0, y0, w, h } = WORLD_BOX;
    const cx = x0 + (worldView.fx ?? 0.5) * w, cy = y0 + (worldView.fy ?? 0.5) * h;
    let best = lastBoard, far = Infinity;
    ZONES.filter(z => unlocks[z.land]).forEach(z => {
        const [x, y] = cellXY(z.id), d = Math.hypot(x - cx, y - cy);
        if (d < far) { far = d; best = z.land; }
    });
    return best;
}

// An area not drawn as a plot yet: its page, as before.
function openAreaPage(zone) {
    fixLand = zone.land;
    goTo('fix');
    const w = document.querySelector('#scene-fix .world'), z = w && w.querySelector(`.zone[data-zone="${zone.id}"]`);
    if (z) w.scrollLeft = z.offsetLeft;
}

// A just-fixed job's prop shakes and puffs away, and its new one pops up.
function swapProps(zoneEl, task) {
    const stage = zoneEl.querySelector('.plot-stage');
    if (!stage) return;
    stage.querySelectorAll(`.plot-prop[data-prop="${task.id}"]`).forEach(p => {
        p.classList.add('prop-off');
        setTimeout(() => p.remove(), 900);
    });
    const next = plotProp(task, true);
    if (next) setTimeout(() => propPlaces(task).forEach((_, k) => addProp(stage, task, next, 'prop-in', k)), 450);
}

// --- PAINTED PAGES ---
// Which of a page's three paintings shows: ruined until half its jobs are done,
// half fixed until the last one, then restored.
function stageIndex(done, total) {
    return done >= total ? 2 : done * 2 >= total ? 1 : 0;
}

// Where a job's bubble sits on its painting (% across, % down).
const HOUSE_AT = { townhall: [50, 24], carpenter: [14, 62], ranch: [87, 40], fishshop: [11, 38], flowershop: [86, 64] };

function jobAt(task, i) {
    return plotAt(task) || task.at || HOUSE_AT[task.house] || ZONE_SLOTS[i % ZONE_SLOTS.length];
}

// On a painting the things to fix are painted in, so each open job is a soft
// glowing ring on its spot with a bubble over it: the job's name and what it
// needs, ticked off as you make them. Done and later jobs show nothing.
function addJobChips(tasks, el, at = jobAt) {
    tasks.forEach((task, i) => {
        if (!taskOpen(task)) return;
        const [x, y] = at(task, i);
        const ready = taskReady(task);
        const spot = document.createElement('button');
        spot.className = 'fix-spot chip open' + (ready ? ' ready' : '');
        spot.dataset.job = task.id;
        spot.style.left = x + '%';
        spot.style.top = y + '%';
        spot.style.zIndex = 20 + Math.round(y);
        // Near an edge the bubble leans inwards, its tail still on the ring.
        const lean = x > 65 ? 85 : x < 35 ? 15 : 50;
        spot.style.setProperty('--lean', lean + '%');
        spot.innerHTML = '<span class="fix-face"></span>';
        addTag(spot, 'task-pin' + (ready ? ' ready' : ''), `<b class="pin-name">${task.name}</b>${needPins(task)}`);
        spot.addEventListener('click', () => tapFix(task));
        el.appendChild(spot);
    });
    // Two bubbles close together would overlap: the lower one hangs below its ring.
    const placed = [...el.querySelectorAll(':scope > .fix-spot.chip')].map(spot => ({ spot, x: parseFloat(spot.style.left), y: parseFloat(spot.style.top) }));
    placed.forEach(a => {
        if (placed.some(b => b !== a && b.y <= a.y && Math.abs(b.y - a.y) < 10 && Math.abs(b.x - a.x) < 48 && !(b.y === a.y && b.spot.compareDocumentPosition(a.spot) & Node.DOCUMENT_POSITION_PRECEDING))) {
            a.spot.classList.add('pin-below');
        }
    });
}

// A painted page that scrolls: the painting at full width, as tall as it is.
// Returns the frame to put labels on (in % of the painting).
function paintedPage(scene, pic) {
    scene.style.backgroundImage = 'none'; // the painting is the whole page
    const keep = scene.dataset.top ? +scene.dataset.top : null;
    const scroll = document.createElement('div');
    scroll.className = 'page-scroll';
    scroll.addEventListener('scroll', () => { scene.dataset.top = scroll.scrollTop; }, { passive: true });
    scroll.innerHTML = `<div class="page-frame"><img class="page-art" src="${pic}" alt="" draggable="false">${ambience(scene.id)}</div>`;
    scene.appendChild(scroll);
    settleScroll(scroll, keep);
    return scroll.firstElementChild;
}

// Once a painting has its height: back where you were, or at its top.
function settleScroll(scroll, keep) {
    const img = scroll.querySelector('img');
    // A bouncing ⌄ while there's more painting below.
    const hint = document.createElement('div');
    hint.className = 'scroll-hint';
    hint.textContent = '⌄';
    hint.hidden = true;
    scroll.parentElement.appendChild(hint);
    const more = () => { hint.hidden = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 24; };
    scroll.addEventListener('scroll', more, { passive: true });
    const place = () => {
        scroll.scrollTop = keep ?? 0; // from the top, so the whole painting unrolls as you scroll
        more();
    };
    if (img.complete) place();
    else img.addEventListener('load', place, { once: true });
}

// The next painting fades in over the old one with a flash of gold.
function turnPage(img, src) {
    if (!img || img.getAttribute('src') === src) return;
    sfx('whoosh');
    const shine = document.createElement('div');
    shine.className = 'page-shine';
    img.parentElement.appendChild(shine);
    setTimeout(() => shine.remove(), 1600);
    // The faded copy over a painted area turns with it.
    const layers = [img, ...img.parentElement.querySelectorAll(':scope > .zone-worn')];
    const nexts = layers.map(layer => {
        const next = layer.cloneNode();
        next.classList.add('page-next');
        next.src = src;
        layer.after(next);
        return next;
    });
    const show = () => requestAnimationFrame(() => nexts.forEach(n => n.classList.add('in')));
    if (nexts[0].complete) show();
    else nexts[0].addEventListener('load', show, { once: true });
    setTimeout(() => { layers.forEach(l => { l.src = src; }); nexts.forEach(n => n.remove()); }, 1500);
}

// A painted area's faded copy: each job owns the patch of the picture nearest
// its spot (with wavy edges), and fixing it brings the colour back over that
// patch, spreading out from the spot. Any painting works, so no extra art is
// needed, and the colour stays put when the area's painting turns to its next
// stage. The mask is a tiny picture the browser stretches, which softens it.
const WEAR_W = 40;
const wearCells = {};

function wearCellsFor(zoneId, aspect) {
    const key = zoneId + aspect.toFixed(3);
    if (wearCells[key]) return wearCells[key];
    const tasks = zoneTasks(zoneId);
    const W = WEAR_W, H = Math.max(8, Math.round(W / aspect));
    const spots = tasks.map((t, i) => jobAt(t, i)).map(([x, y]) => [x / 100 * W, y / 100 * H]);
    const owner = new Int16Array(W * H), dist = new Float32Array(W * H), far = new Float32Array(tasks.length);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let best = 0, bd = Infinity;
            spots.forEach(([sx, sy], k) => {
                const d = Math.hypot(x + 0.5 - sx, y + 0.5 - sy) * (1 + 0.16 * Math.sin(x * 0.55 + k * 1.7) * Math.cos(y * 0.42 + k * 2.3));
                if (d < bd) { bd = d; best = k; }
            });
            owner[y * W + x] = best;
            dist[y * W + x] = bd;
            if (bd > far[best]) far[best] = bd;
        }
    }
    for (let i = 0; i < dist.length; i++) dist[i] /= far[owner[i]] || 1;
    return wearCells[key] = { W, H, owner, dist, ids: tasks.map(t => t.id) };
}

// Paints the mask: faded where a job is still to do, clear where it's done,
// and `growing` (a job being fixed) cleared `p` (0 to 1) of the way out.
function paintWear(el, zoneId, growing = null, p = 1) {
    const art = el.querySelector('.zone-art');
    if (!art || !art.naturalWidth) return;
    const c = wearCellsFor(zoneId, art.naturalWidth / art.naturalHeight);
    const clear = c.ids.map(id => (restoration.done.includes(id) ? 2 : id === growing ? p * 1.25 - 0.25 : -1));
    const canvas = document.createElement('canvas');
    canvas.width = c.W;
    canvas.height = c.H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(c.W, c.H);
    for (let i = 0; i < c.owner.length; i++) {
        const edge = (c.dist[i] - clear[c.owner[i]]) / 0.25;
        img.data[i * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, edge)));
    }
    ctx.putImageData(img, 0, 0);
    const mask = `url(${canvas.toDataURL()})`;
    el.querySelectorAll('.zone-worn').forEach(w => { w.style.maskImage = w.style.webkitMaskImage = mask; });
}

// The colour flowing back over a just-fixed job's patch.
function bloomWear(el, zoneId, taskId) {
    const t0 = performance.now(), ms = 1400;
    const step = now => {
        const k = Math.min(1, (now - t0) / ms);
        paintWear(el, zoneId, taskId, 1 - (1 - k) * (1 - k));
        if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// The faded copy over an area's picture, with a clear hole around each fixed
// spot so the colour shows through there. A finished area has none.
function wearZone(el, tasks, growing = null) {
    const worn = el.querySelector('.zone-worn');
    const holes = tasks.map((t, i) => {
        if (!taskDone(t) && t.id !== growing) return null;
        const [x, y] = t.at || ZONE_SLOTS[i % ZONE_SLOTS.length];
        const r = t.id === growing ? 'var(--grow)' : '15%';
        return `radial-gradient(circle at ${x}% ${y}%, transparent ${r}, #000 calc(${r} + 12%))`;
    }).filter(Boolean);
    const mask = holes.length ? holes.join(', ') : 'none';
    worn.style.maskImage = worn.style.webkitMaskImage = mask;
}

// Where a person can stand in an area without picture of its own: the point
// furthest from every thing to fix (and the pin above it).
function clearestSpot(tasks) {
    const spots = tasks.map((t, i) => t.at || ZONE_SLOTS[i % ZONE_SLOTS.length]);
    let best = ZONE_PERSON, far = -1;
    for (let x = 18; x <= 82; x += 8) {
        for (let y = 34; y <= 82; y += 6) {
            const d = Math.min(...spots.map(([sx, sy]) => Math.hypot(sx - x, (sy - 8) - y) * (sy - 8 < y ? 1 : 0.8)));
            if (d > far) { far = d; best = [x, y]; }
        }
    }
    return best;
}

// The person of an area's first open job stands in the area's clear spot,
// saying what it is.
function addZonePerson(el, tasks, zone) {
    const task = tasks.find(taskOpen);
    if (!task) return;
    const [x, y] = zone.person || clearestSpot(tasks);
    const npc = npcs.find(n => n.id === task.who);
    const body = ASSETS.characters[npc.id];
    const full = body && !body.endsWith('.svg');
    const person = full
        ? makeSpot({ x: x - 7, y: y - 12, w: 14, z: 25 + Math.round(y), sprite: body, label: npc.name, onClick: () => tapFix(task) })
        : makeSpot({ x: x - 9, y: y - 9, w: 18, z: 25 + Math.round(y), sprite: npcPicture(npc), label: npc.name, onClick: () => tapFix(task) });
    person.classList.add(full ? 'full-body' : 'portrait-spot', 'fix-npc');
    addTag(person, 'say', task.name);
    el.appendChild(person);
}

function tapFix(task) {
    if (fixing) return;
    if (currentScene === 'map') { heroToJob(task); heroPose(taskReady(task) ? 'point' : 'think', 2000); }
    if (taskDone(task)) return toast(`“${task.line}”`);
    if (!taskOpen(task)) return toast('🔒 Later!');
    openTaskCard(task);
}

// A job's card, sliding up from the bottom like Merge Mansion's: the land's
// progress to its reward, what it needs (✓ once made), what it pays, and
// Fix it! once ready or Go to where it's made.
function openTaskCard(task) {
    const npc = npcs.find(n => n.id === task.who);
    const jobs = landTasks(task.land);
    const pct = Math.round((100 * jobs.filter(taskDone).length) / jobs.length);
    const ready = taskReady(task);
    const tile = (inner, met) => `<span class="tile${met ? ' met' : ''}">${inner}</span>`;
    const needs = task.needs.map((n, i) => {
        const p = needProgress(task, n);
        const icon = n.item ? itemIcon(n.item, n.tier) : n.stat ? statIcon(n.stat) : '🏡';
        return tile(`${icon}<small>${n.own ? AREAS[n.own].name : `${p.have}/${p.of}`}</small><i class="tile-info" data-need="${i}">i</i>`, p.have >= p.of);
    }).join('');
    const pays = tile(`${uiIcon('star', '⭐')}<small>×${task.xp}</small>`) + (task.reward ? tile(`<small>${rewardText(task.reward)}</small>`) : '');
    const here = task.land === 'town' ? currentScene === 'town'
        : (currentScene === 'map' && task.zone && inWorld(ZONE[task.zone])) || (currentScene === 'fix' && fixLand === task.land);
    showDialog({
        sheet: true,
        art: npcPicture(npc),
        artRound: true,
        title: task.name,
        body: `<div class="sheet-progress"><span class="quest-bar"><i style="width:${pct}%"></i></span><b>${pct}%</b>${uiIcon('reward', '🎁')}</div>
               <div class="sheet-cols"><div><h4>Items needed</h4><div class="tiles needs">${needs}</div><p class="tile-hint">Tap one to see where it comes from</p></div>
               <div><h4>Rewards</h4><div class="tiles">${pays}</div></div></div>`,
        actions: [ready
            ? { label: !hasSpot(task) ? 'Do it!' : here ? 'Fix it!' : `Go to ${task.zone ? ZONE[task.zone].name : landName(task.land)}`, primary: true, wide: true,
                onClick: () => (!hasSpot(task) ? completeTask(task.id) : here ? fixJob(task.id) : goFix(task.land, task.id)) }
            : { label: 'Go', primary: true, wide: true, onClick: () => goWork(task) },
            ready ? null : toolOffer(task)].filter(Boolean),
    });
    dialogBody.querySelectorAll('.needs .tile').forEach((el, i) => el.addEventListener('click', () => openItemSource(task, task.needs[i])));
}

// Where a job's item comes from: what makes it, on which board, and the
// merges that lead up to it, with a way to go straight there.
function openItemSource(task, need) {
    const back = { label: 'Back', onClick: () => openTaskCard(task) };
    if (need.stat || need.own) {
        const how = {
            boxes: 'Boxes open when you merge two things right next to one, on any board.',
            webs: 'Drag a free item onto a cobwebbed one just like it: it merges and comes free.',
            upgrades: 'Drag a producer part onto another of the same size. Parts come from orders, chests and rewards.',
            sold: 'Tap an item on a board and choose Sell.',
        };
        const land = need.own;
        showDialog({
            title: land ? `${AREAS[land].name} deed` : TASK_STATS[need.stat].label,
            body: `<p>${land ? `Buy the ${AREAS[land].name} deed in the Market${quests.level < AREAS[land].level ? ` (from level ${AREAS[land].level})` : ''}.` : how[need.stat]}</p>`,
            actions: [land ? { label: 'Go to the Market', primary: true, wide: true, onClick: () => goTo('market') }
                : { label: `Go to the ${AREAS[deliveryBoard()].name} board`, primary: true, wide: true, onClick: () => goTo(deliveryBoard()) }, back],
        });
        return;
    }
    const chain = need.item;
    const board = needBoard(need);
    const tool = TOOLS[chain];
    const maker = tool ? tool.name : producerBaseName(chain);
    const makerArt = tool ? (ASSETS.toolProducers || {})[chain] : (ASSETS.producers[chain] || [])[FIRST_WORKING_LEVEL - 1];
    const makerIcon = makerArt ? `<img class="inline-item" src="${makerArt}" alt="">` : (tool ? tool.emoji : PRODUCERS[chain].emoji);
    const step = t => `<span class="src-step${t === need.tier ? ' goal' : ''}">${itemIcon(chain, t)}<small>${itemName(chain, t)}</small></span>`;
    const path = Array.from({ length: need.tier + 1 }, (_, t) => step(t)).join('<b class="src-arrow">×2 →</b>');
    const owned = unlocks[board];
    const locked = need.tier > tierCap(chain);
    showDialog({
        art: itemSprite(chain, need.tier) || undefined,
        title: itemName(chain, need.tier),
        body: `<div class="src-maker">${makerIcon}<p>Made by the <b>${maker}</b> on your <b>${AREAS[board].name}</b> board.${need.tier ? ' Tap it, then merge two of the same to go up a step:' : ' Tap it to make one.'}</p></div>
               ${need.tier ? `<div class="src-path">${path}</div>` : ''}
               <p class="hint">${tool ? 'Brown and Blue chests sometimes drop these too.' : 'Orders and chests sometimes give them too.'}${owned ? '' : ` You'll get this board with the ${AREAS[board].name} land (level ${AREAS[board].level}).`}</p>`,
        actions: [locked ? { label: `${tool ? 'Workshop Manual' : 'Growth Guide'} · Market`, primary: true, wide: true, onClick: () => goTo('market') }
            : owned ? { label: `Go to the ${AREAS[board].name} board`, primary: true, wide: true, onClick: () => goTo(board) } : null, back].filter(Boolean),
    });
    if (locked) dialogBody.insertAdjacentHTML('beforeend', iconize(`<p class="hint"><b>Tier ${need.tier} needs the ${tool ? 'Workshop Manual' : 'Growth Guide'}</b> from the Market first: merges stop at tier ${tierCap(chain)} for now.</p>`));
}

// Stuck on a tool (its toolbox resting, or that size not made yet): the job's
// card offers it straight away for gems, priced by how big it is.
const TOOL_GEMS = [3, 6, 12, 20, 35, 60, 100, 160];

function toolOffer(task) {
    const need = task.needs.find(n => n.item && TOOLS[n.item] && needProgress(task, n).have < needProgress(task, n).of);
    if (!need || !unlocks[TOOLS[need.item].board]) return null;
    const box = Object.values(grids).flat().concat(...Object.values(crates), inventory.items.map(e => e.item))
        .find(c => c && c.type === 'toolbox' && c.chain === need.item);
    const resting = !box || (box.drops !== undefined && box.drops <= 0);
    if (!resting && need.tier < 2) return null; // small ones are a few taps away
    const price = TOOL_GEMS[Math.min(need.tier, TOOL_GEMS.length - 1)];
    const name = itemName(need.item, need.tier);
    return { icon: uiIcon('gem', '💎'), label: `Stuck? Get the ${name} now · 💎${price}`, wide: true, onClick: () => {
        if (!spendGems(price)) return;
        sendToBoard(TOOLS[need.item].board, { tier: need.tier, chain: need.item });
        sfx('buy');
    } };
}

// 📋's Show: off to the job's spot, which lights up, then up comes its card.
function showTask(task) {
    if (!hasSpot(task)) return goWork(task); // buying a land: the Market
    goFix(task.land, task.id);
}

// Round buttons in the corners, as in Merge Mansion: the board bottom left,
// the job list bottom right with how many are ready.
function boardFab(mode) {
    const btn = document.createElement('button');
    btn.className = 'fab board-fab fix-merge';
    btn.innerHTML = `${uiIcon('merge', '🧺')}<small>Merge</small>`;
    btn.addEventListener('click', () => goTo(typeof mode === 'function' ? mode() : mode));
    return btn;
}

function tasksFab(id) {
    const ready = openTasks().filter(taskReady).length;
    const btn = document.createElement('button');
    btn.className = 'fab tasks-fab';
    if (id) btn.id = id;
    btn.innerHTML = `${uiIcon('jobs', '📋')}<small>Tasks</small>${ready ? `<span class="badge">${ready}</span>` : ''}`;
    btn.addEventListener('click', openTaskLog);
    return btn;
}

// The moment a job can be done, its person pops up to call you over to fix it.
// It doesn't block: merging goes on, and it slides away after a while.
function callToFix(task) {
    document.querySelectorAll('.fix-call').forEach(el => el.remove());
    const npc = npcs.find(n => n.id === task.who);
    const card = document.createElement('div');
    card.className = 'fix-call';
    card.dataset.job = task.id;
    card.innerHTML = `<img class="face" src="${npcPicture(npc)}" alt="${npc.name}">
                      <span><b>${task.name}</b><small>“${hasSpot(task) ? 'Let\'s fix it!' : 'Ready!'}”</small></span>
                      <button class="btn btn-primary">${uiIcon('hammer', '🔨')} ${hasSpot(task) ? 'Go fix' : 'Do it!'}</button><button class="fix-call-x">✕</button>`;
    card.querySelector('.btn').addEventListener('click', () => { card.remove(); hasSpot(task) ? goFix(task.land, task.id) : completeTask(task.id); });
    card.querySelector('.fix-call-x').addEventListener('click', () => card.remove());
    stageEl.appendChild(card);
    setTimeout(() => card.remove(), 8000);
}

// The fix itself, made a big deal: zoom in, hammer away, poof, the new look
// pops in with sparkles (and the building steps up), then the thank-you.
function fixJob(id) {
    const task = TASKS.find(t => t.id === id);
    if (!task || !taskReady(task) || fixing) return;
    const scene = document.getElementById(task.land === 'town' ? 'scene-town' : currentScene === 'map' ? 'scene-map' : 'scene-fix');
    const spot = scene.hidden ? null : scene.querySelector(`[data-job="${id}"]`);
    if (!spot) return completeTask(id);
    if (currentScene === 'map') { heroToJob(task); heroPose('hammer', 1400); }
    fixing = true;
    spot.classList.remove('spotlight');
    closeDialog();
    document.querySelectorAll('.fix-call').forEach(el => el.remove());
    tutorialEl.hidden = true;
    document.body.classList.add('busy');
    spot.scrollIntoView({ block: 'center' });
    const box = scene.getBoundingClientRect(), r = spot.getBoundingClientRect();
    scene.style.transformOrigin = `${((r.left + r.width / 2 - box.left) / box.width) * 100}% ${((r.top + r.height / 2 - box.top) / box.height) * 100}%`;
    scene.classList.add('fix-zoom');
    spot.classList.add('hammering');
    spot.querySelectorAll('.task-pin, .restore-tag').forEach(el => el.remove());
    addTag(spot, 'fix-hammer', uiIcon('hammer', '🔨'));
    [0, 320, 640, 960].forEach(t => setTimeout(() => { sfx('knock'); buzz(15); }, t)); // knock, knock...
    const fx = (cls, html, delay) => setTimeout(() => addTag(spot, cls, html), delay);
    if (FX.app) {
        [500, 850, 1150].forEach(t => setTimeout(() => {
            const at = fxAt(spot);
            if (at) fxDust(at.x, at.y, Math.max(at.size, 50), 3);
        }, t));
    } else {
        fx('fix-dust', '💨', 500);
        fx('fix-dust two', '💨', 850);
    }
    setTimeout(() => {
        // The new look, and the building's next stage if it has one.
        spot.classList.remove('hammering', 'open', 'ready');
        spot.classList.add('fixed', 'just-fixed');
        cheerHero();
        sfx('sparkle');
        buzz(30);
        spot.querySelectorAll('.task-pin, .fix-hammer').forEach(el => el.remove());
        if (!spot.classList.contains('chip')) spot.querySelector('.fix-face').innerHTML = fixFace(task, true) || '✨';
        addTag(spot, 'fix-swirl', '');
        const at = FX.app && fxAt(spot);
        if (at) {
            const size = Math.max(at.size, 60);
            fxBurst({ ...at, size }, true, { stars: true });
            fxPart('swirl', at.x, at.y, { layer: FX.back, size: size * 2, s0: 0.5, s1: 1.15, spin: 1.2, vy: -size * 0.8, life: 1100, tint: 0xfff3b0, alpha: 0.9, fadeIn: 0.15, fade: 0.5 });
        } else {
            ['✨', '⭐', '✨', '⭐', '✨', '⭐'].forEach((s, k) => {
                const p = addTag(spot, 'fix-spark', s);
                p.style.setProperty('--a', `${k * 60}deg`);
            });
        }
        // Colour comes back around the spot, and the building steps up if it has stages.
        const zoneEl = spot.closest('.zone') || scene.querySelector(`.zone[data-zone="${task.zone}"]`);
        const jobs = task.zone ? zoneTasks(task.zone) : landTasks(task.land);
        const done = jobs.filter(taskDone).length + 1;
        if (zoneEl && zoneEl.classList.contains('plotted')) {
            swapProps(zoneEl, task);
            if (done === jobs.length) zoneEl.classList.add('zone-done');
        } else if (zoneEl && zoneEl.classList.contains('painted')) {
            bloomWear(zoneEl, task.zone, task.id);
            turnPage(zoneEl.querySelector('.zone-art'), ASSETS.stages[task.zone][stageIndex(done, jobs.length)]);
            if (done === jobs.length) zoneEl.classList.add('zone-done');
        } else if (zoneEl) {
            zoneEl.style.setProperty('--grow', '0%');
            wearZone(zoneEl, jobs, task.id);
            requestAnimationFrame(() => requestAnimationFrame(() => zoneEl.style.setProperty('--grow', '15%')));
            if (done === jobs.length) zoneEl.classList.add('zone-done');
        }
        const list = landTasks(task.land);
        const next = stageSprite(task.land, list.filter(taskDone).length + 1, list.length);
        if (task.land === 'town') turnPage(scene.querySelector('.page-art'), townPicture(task.id));
        const place = scene.querySelector('.fix-place img');
        if (place && next && !place.src.endsWith(next)) {
            place.src = next;
            place.parentElement.classList.add('level-up');
        }
        const banner = document.createElement('div');
        banner.className = 'fix-banner';
        const where = task.zone ? ZONE[task.zone].name : landName(task.land);
        banner.textContent = done === jobs.length ? `🎉 ${where} restored!` : `✨ Fixed! ${done}/${jobs.length}`;
        stageEl.appendChild(banner);
        setTimeout(() => banner.remove(), 1800);
    }, 1300);
    setTimeout(() => scene.classList.remove('fix-zoom'), 2200);
    setTimeout(() => {
        fixing = false;
        document.body.classList.remove('busy');
        scene.style.transformOrigin = '';
        completeTask(id, true);
    }, 2700);
}

// A land's place: its areas as a column you scroll, the land's progress at the
// top and the corner buttons. It opens on the first area with work left, or
// stays where you were when it redraws.
function renderFix() {
    const land = fixLand;
    const scene = document.getElementById('scene-fix');
    const old = scene.querySelector('.world');
    const keep = old && scene.dataset.land === land ? old.scrollLeft : null;
    const keepTop = {}; // how far down each painted area was
    if (keep !== null) old.querySelectorAll('.zone.painted').forEach(z => { keepTop[z.dataset.zone] = z.querySelector('.zone-scroll').scrollTop; });
    scene.innerHTML = '';
    scene.dataset.land = land;
    const world = document.createElement('div');
    world.className = 'world';
    landZones(land).forEach(zone => {
        const el = renderZone(zone);
        if (zoneOpen(zone) && !el.matches('.painted, .plotted')) addZonePerson(el.querySelector('.zone-frame'), zoneTasks(zone.id), zone);
        world.appendChild(el);
    });
    // Swipe sideways from area to area: dots for where you are, arrows naming the next one.
    const zones = landZones(land);
    // A tab for each area, named, with its progress (or its lock): tap to go there.
    const nav = document.createElement('div');
    nav.className = 'zone-tabs';
    zones.forEach((z, k) => {
        const jobs = zoneTasks(z.id);
        const done = jobs.filter(taskDone).length;
        const tab = document.createElement('button');
        tab.dataset.zone = z.id;
        tab.innerHTML = zoneOpen(z) ? `${z.name} <b>${done === jobs.length ? '✓' : `${done}/${jobs.length}`}</b>` : `🔒 ${z.name}`;
        tab.addEventListener('click', () => { markGuide('tabs'); world.scrollTo({ left: k * world.clientWidth, behavior: 'smooth' }); });
        nav.appendChild(tab);
    });
    const arrows = ['left', 'right'].map(side => {
        const b = document.createElement('button');
        b.className = `zone-arrow ${side}`;
        b.addEventListener('click', () => world.scrollBy({ left: (side === 'left' ? -1 : 1) * world.clientWidth, behavior: 'smooth' }));
        return b;
    });
    const showPage = () => {
        const i = Math.round(world.scrollLeft / Math.max(1, world.clientWidth));
        nav.querySelectorAll('button').forEach((tab, k) => tab.classList.toggle('on', k === i));
        arrows[0].hidden = i <= 0;
        arrows[1].hidden = i >= zones.length - 1;
        if (zones[i - 1]) arrows[0].innerHTML = `‹<small>${zones[i - 1].name}</small>`;
        if (zones[i + 1]) arrows[1].innerHTML = `<small>${zones[i + 1].name}</small>›`;
    };
    world.addEventListener('scroll', showPage, { passive: true });
    const jobs = landTasks(land);
    const done = jobs.filter(taskDone).length;
    const progress = document.createElement('div');
    progress.className = 'place-progress';
    progress.innerHTML = `${uiIcon('hammer', '🔨')} ${done}/${jobs.length}<span class="quest-bar"><i style="width:${(100 * done) / jobs.length}%"></i></span>`;
    scene.append(world, progress, nav, ...arrows, boardFab(land), tasksFab());
    const open = zones.filter(zoneOpen);
    const here = open.find(z => !zoneDone(z)) || open[open.length - 1];
    world.scrollLeft = keep ?? (here ? zones.indexOf(here) * world.clientWidth : 0);
    world.querySelectorAll('.zone.painted').forEach(z => settleScroll(z.querySelector('.zone-scroll'), keepTop[z.dataset.zone]));
    showPage();
    unlockNewZones(land, world);
}

// An area that opened since you last looked plays its unlock: a golden key
// over the padlock, the clouds blow away, then the area's card.
function unlockNewZones(land, world) {
    if (layoutMode) return;
    const fresh = landZones(land).filter(z => zoneOpen(z) && !restoration.zonesOpen.includes(z.id));
    if (!fresh.length || fixing || !tutorial.done || !dialogEl.hidden || !world) return;
    fresh.forEach(z => restoration.zonesOpen.push(z.id));
    const zone = fresh[0];
    let el = world.querySelector(`[data-zone="${zone.id}"]`);
    if (world.classList.contains('world')) {
        el.insertAdjacentHTML('beforeend', `<div class="zone-clouds"></div><div class="zone-key">${uiIcon('key', '🗝️')}</div>`);
        world.scrollLeft = el.offsetLeft;
    } else {
        // In the world: a cloud over the tile, with the key turning in it.
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const [x, y] = cellXY(zone.id);
        el = document.createElement('div');
        el.className = 'zone-clouds world-cloud';
        el.dataset.zone = zone.id;
        worldPlace(el, x - WORLD_TILE * 0.52, y - WORLD_TILE * 0.42, WORLD_TILE * 1.04, WORLD_TILE * 0.76);
        el.innerHTML = `<div class="zone-key">${uiIcon('key', '🗝️')}</div>`;
        world.querySelector('.world-ui').appendChild(el);
    }
    el.classList.add('unlocking');
    document.body.classList.add('busy');
    setTimeout(() => {
        el.classList.add('opening');
        sfx('unlock');
        buzz([20, 40, 20]);
        const at = fxAt(el.querySelector('.zone-key') || el);
        if (at && FX.app) {
            fxBurst({ ...at, size: 90 }, true, { stars: true });
            fxGlow(at.x, at.y, 320, { life: 900, alpha: 0.7 });
        }
    }, 1000);
    setTimeout(() => {
        document.body.classList.remove('busy');
        el.classList.remove('unlocking', 'opening');
        el.querySelectorAll('.zone-clouds, .zone-key').forEach(c => c.remove());
        if (el.classList.contains('world-cloud')) {
            el.remove();
            const stage = world.querySelector('.world-stage');
            if (stage) addFog(stage); // the fog lifts off the new area
        }
        newAreaCard(zone);
    }, 2000);
}

// The new area's card, once nothing else is showing (it never covers a job's card).
function newAreaCard(zone, tries = 0) {
    if (!dialogEl.hidden || fixing) return tries < 120 && setTimeout(() => newAreaCard(zone, tries + 1), 500);
    showDialog({
        art: (ASSETS.plots || {})[zone.id] || ((ASSETS.stages || {})[zone.id] || [])[2] || (ASSETS.areas || {})[zone.id] || ASSETS.buildings[zone.land],
        title: `✨ ${zone.name}`,
        body: `<p>New area! <b>${zoneTasks(zone.id).length}</b> things to fix.</p>`,
        actions: [{ label: 'Let\'s go!', primary: true }],
    });
}

// --- STORY ---
// Sunnyvale after the storm, told in as few words as possible: the Mayor's
// "Save us!", then five days. Each day is a set of jobs; its bubble plays on the
// map once it's the first day with jobs left, and a last one when every job is done.
const TOWN_NAME = 'Sunnyvale';

// Speech bubbles: [who, line, answer button]. Kept tiny: players want to merge.
// Every job in these areas, in order.
function jobsIn(...zones) {
    return TASKS.filter(t => zones.includes(t.zone)).map(t => t.id);
}

// Every job of these lands, in order.
function jobsOf(...lands) {
    return TASKS.filter(t => lands.includes(t.land)).map(t => t.id);
}

// --- THE STORY: THE LOST GOLDEN BELL ---
// For a hundred years the Golden Bell rang over Sunnyvale every night to call
// everyone home. The night of the storm it vanished, the families left, and
// they say they'll come back when it rings again. Mr. Grimsby (Grimsby Land
// Co., only ever seen as a grey coat, big city shoes and a black car) wants the
// valley for a parking lot and the bell for its gold.
// The truth, told fairly: Marigold, the shopkeeper, is the secret Bell Keeper.
// She hid the bell in the Town Hall tower from Grimsby, dropped its key in the
// hen house as she ran, and, watched day and night, leaves notes for the one
// person he doesn't know: you. Her clues are all in plain sight (green wax and
// little gold lanterns in her shop, cinnamon buns, floury boots, red hair like
// the Keeper in Mira's story, and a slip about the "silver" key); the red
// herrings each get cleared (Mira's lantern, Mae's tiny feet, the Mayor's
// nerves, Ellis's rope). You guess who the Friend is, twice; guessing right pays.
// Each chapter opens on a cliffhanger; the end teases the Silver Bell.

// Each chapter is a set of jobs, with a scene when it starts (once the one
// before is done). A scene is a list of [who, words, answer, sign]: who is a
// townsperson, 'shopkeeper' (Marigold), 'narrator' (the storybook), 'note' (from
// "A Friend") or 'letter' (from Mr. Grimsby); answer is the button, or a list
// of choices ({ label, reply: [lines], guess }); sign replaces a note's
// signature. A scene can be a function giving that list when it plays.
const CHAPTERS = [
    { title: 'A Note in the Planks', scene: [['mayor', 'Welcome to Sunnyvale!']], jobs: jobsIn('barnyard') }, // the opening tells chapter 1
    { title: 'The Silver Key',
      scene: [['narrator', 'That night, the hens wake up. Bok, bok, BOK!'],
          ['narrator', 'You run out with a lamp. The hen house door is swinging open...'],
          ['hattie', 'Something was in there! My hens don\'t yell for nothing.'],
          ['ruby', 'Then let\'s fix the hen house and look around.', 'Let\'s look!']],
      jobs: jobsIn('henhouse', 'bigbarn') },
    { title: 'The Big Wheel',
      scene: [['narrator', 'Late at night, a long black car rolls down the road.'],
          ['narrator', 'It stops by your barn. Then its lights go off.'],
          ['mayor', 'That is Mr. Grimsby\'s car. He is watching us.'],
          ['ruby', 'Let him watch. We work faster than he snoops.'],
          ['mayor', 'To the fields! The big wheel from the note must be out there.', 'Let\'s go!']],
      jobs: jobsOf('farm', 'hay') },
    { title: 'Fog Over Town',
      scene: () => [['narrator', 'A thick fog sits over the town square.'],
          ['mayor', 'And no new note for days. I am worried about our Friend.'],
          ['ruby', 'That black car followed their lantern into town. We have to hurry.'],
          guessLine('Before we go... who do you think the Friend is?'),
          ['mayor', 'Now, let\'s clear that fog!', 'Let\'s go!']],
      jobs: ['town1', 'town2', 'town3', 'town4', ...jobsOf('fert', 'aqua')] },
    { title: 'The Golden Bell',
      scene: () => [['narrator', 'The Harvest Festival is coming. A grey letter waits in the mailbox.'],
          ['letter', 'Dear Mayor, on Festival Day I will buy the whole valley. No bell, no town. Ha!'],
          ['mayor', 'If the bell does not ring at the festival... the families will sell.'],
          restoration.done.includes('town6') ? ['hattie', 'But we found it! Let\'s ring it LOUD!', 'Yee-haw!']
              : guessLine('This is it. Last chance: who is the Friend?', 'Let\'s find that bell!')],
      jobs: ['town5', 'town6', 'town7', ...jobsOf('flower')] },
];

// "Who is the Friend?": your guess, with a word from whoever you name. The
// reveal pays out if it's right.
function guessLine(question, then = 'We\'ll see!') {
    const pick = (label, guess, reply) => ({ label, guess, reply: [...reply, ['narrator', 'You write your guess in your notebook.', then]] });
    return ['ruby', question, [
        pick('Ellis?', 'ruby', [['ruby', 'Me?! Ha! My writing is way too messy.']]),
        pick('Mae?', 'poppy', [['poppy', 'Me? Oh, I would draw flowers on every note!']]),
        pick('Mira?', 'finn', [['ruby', 'Mira? She can barely spell "fish"!']]),
        pick('Marigold?', 'marigold', [['ruby', 'The shop lady? Hmm... she does know a lot.']]),
    ]];
}

const STORY_END = [['narrator', 'Every barn, field and pond is fixed.'],
    ['mayor', 'Sunnyvale is the happiest town in the valley again.'],
    ['shopkeeper', 'And every night, the Golden Bell rings for you, dear.'],
    ['finn', 'Now... about that Silver Bell.', 'Tell me more!']];

// A little scene when a whole land is back, played after its reward.
const LAND_STORY = {
    barn: [['ruby', 'The barn looks brand new. Not bad, newbie... I mean, boss!'], ['hattie', 'And the animals love it!'], ['mayor', 'The barn is done. Next, the fields!']],
    farm: [['hattie', 'Rows and rows of food!'], ['mayor', 'Now the families will have food when they come home.']],
    hay: [['hattie', 'The windmill turns again!'], ['ruby', 'Fresh bread for everyone! I bet Grimsby can smell it from his car.']],
    fert: [['poppy', 'The best soil in the whole valley!'], ['poppy', 'Our plants will grow as tall as Bram!'], ['hattie', 'Ha! Good luck with that.']],
    aqua: [['finn', 'The fish are jumping again!'], ['finn', 'Come row with me any time, friend.']],
    flower: [['poppy', 'Every flower is blooming!'], ['mayor', 'Sunnyvale has never looked so pretty.']],
};

// The jobs that turn up a piece of the map (the Town Hall's `after` lists them too).
const MAP_PIECES = ['big2', 'farm5', 'aqua8', 'fert10'];

function mapPiecesFound() {
    return MAP_PIECES.filter(id => restoration.done.includes(id)).length;
}

// A map piece's beat: how it turns up, then how many you have (the last one shows where to look).
function mapBeat(...found) {
    return () => {
        const n = mapPiecesFound();
        const after = n === 4 ? [['narrator', 'The four pieces fit together. The map is whole!'],
            ['narrator', 'A big red X is drawn... on the Town Hall tower!'],
            ['mayor', 'The tower? But its stairs are broken!'],
            ['ruby', 'Then we fix them. Every last one.', 'Let\'s go!']]
            : n === 1 ? [['mayor', 'It is a map of Sunnyvale! Someone tore it into pieces.'],
                ['ruby', 'Smart. One piece alone tells Grimsby nothing.', 'I\'ll find the rest!']]
            : [['ruby', 'It fits right next to the other piece!', 'Keep looking!']];
        return [...found, ['narrator', `It is a torn piece of a map! You have ${n} of 4.`], ...after];
    };
}

const STORY_BEATS = {
    barn1: [['ruby', 'Hi! I\'m Ellis. I fix stuff. Nice work, newbie!'],
        ['ruby', 'Hey... what\'s that under the planks?'],
        ['narrator', 'A rolled-up note, closed with green wax. The wax is shaped like a tiny bell.'],
        ['note', 'Welcome, farmer. The Golden Bell is safe, but hidden. Fix the farm and follow my notes.'],
        ['ruby', 'A note about the bell?! Who wrote this?', [
            { label: 'I\'ll find out!', reply: [['ruby', 'Ha! I like you already.']] },
            { label: 'Spooky...', reply: [['ruby', 'Spooky? Nah. Exciting!']] }]]],
    barn2: [['hattie', 'Howdy, partner! I\'m Bram. I look after the animals.'],
        ['hattie', 'My hens ran off the night of the storm. Something gave them a big scare.'],
        ['hattie', 'Animals don\'t lie. Somebody was out here that night.', 'Who?']],
    barn6: [['shopkeeper', 'Yoo-hoo! I\'m Marigold. I run the Market in town.'],
        ['shopkeeper', 'I brought you cinnamon buns. Welcome to Sunnyvale, dear!'],
        ['hattie', 'Marigold\'s buns are the best in the whole valley!'],
        ['shopkeeper', 'Hee hee! Come see my shop. I have a bit of everything.', 'Thanks!']],
    barn9: [['narrator', 'That night, you see a little gold light out by the fence.'],
        ['narrator', 'It bobs up and down... then it is gone.'],
        ['ruby', 'Someone with a lantern! Out here, at night?'],
        ['ruby', 'Mira goes night fishing. Just saying.', 'Hmm...']],
    barn10: [['narrator', 'Your new mailbox has its first letter. The paper is grey and stiff.'],
        ['letter', 'Dear Farmer, Sunnyvale is finished. Sell me your farm and go home. I pay well.'],
        ['mayor', 'Grimsby! He wants every farm in the valley.'],
        ['mayor', 'He wants to turn our fields into one giant parking lot!'],
        ['ruby', 'So, newbie. Are you selling?', [
            { label: 'Never!', reply: [['ruby', 'That\'s what I like to hear!']] },
            { label: 'How much?', reply: [['ruby', 'HOW MUCH?! ...Ha, you\'re kidding. Right?'], ['mayor', 'Oh, my poor heart!']] }]]],
    barn20: [['narrator', 'Under the dust, you find two sets of footprints.'],
        ['narrator', 'Small boots with flour on them. And big, shiny city shoes.'],
        ['ruby', 'Nobody in Sunnyvale wears city shoes.'],
        ['mayor', 'Ahem! Nobody at all. Ha... ha.'],
        ['hattie', 'Mayor, why are you sweating?', 'Hmm!']],
    hen3: [['narrator', 'In the nest, there is no egg. There is a little silver key!'],
        ['narrator', 'A tiny bell is carved on the top.'],
        ['hattie', 'My hens can\'t lay keys!'],
        ['ruby', 'Somebody dropped this in a hurry. The night of the storm, I bet.', 'I\'ll keep it safe.']],
    hen10: [['hattie', 'The hens came home! All of them!'],
        ['hattie', 'They still hide when a car goes by, though. Poor babies.'],
        ['hattie', 'Thank you, partner. You\'re family now.', 'Aww!']],
    big2: mapBeat(['narrator', 'One scroll is not like the others. It is torn...']),
    big5: [['narrator', 'One jar has no jam. It has a note, with the same green wax!'],
        ['note', 'Well done. Next, find the big wheel the wind turns. And watch out for the man in the grey coat.'],
        ['ruby', 'Grey coat... big city shoes... That\'s Grimsby!'],
        ['ruby', 'And a big wheel the wind turns? The old windmill!', 'To the windmill!']],
    big8: [['letter', 'Dear Farmer, I will pay you TWICE as much. You could buy a castle!'],
        ['hattie', 'A castle? We have a barn. Barns are better.'],
        ['ruby', 'He\'s scared. You\'re fixing things too fast for him.', 'Ha!']],
    farm1: [['mayor', 'Our very own field! Splendid!'],
        ['mayor', 'The families can\'t come home to empty fields. Let\'s grow food!']],
    farm5: mapBeat(['narrator', 'The scarecrow\'s pocket crinkles. There is paper inside!']),
    farm31: [['poppy', 'Hello! I\'m Mae. The daisies said you were coming.'],
        ['poppy', 'Can I smell your note? ...Mmm. Cinnamon!'],
        ['hattie', 'Mae, you have the tiniest feet in town. Were you out at night?'],
        ['poppy', 'Only to sing to the moonflowers. They open at midnight!', [
            { label: 'I believe you.', reply: [['poppy', 'Thank you! You have a kind face.']] },
            { label: 'Hmm, really?', reply: [['poppy', 'Really! Come at midnight and I\'ll sing you a song.']] }]]],
    farm28: [['mayor', 'A picnic, like the old days! But first, I must tell you something.'],
        ['mayor', 'The night of the storm, a man in a grey coat came to my door.'],
        ['mayor', 'He said, "I love old bells! May I see yours?" So I let him into the tower.'],
        ['mayor', 'Then the storm came... and the bell was gone. It\'s all my fault!', [
            { label: 'It\'s not your fault.', reply: [['mayor', 'Thank you, my friend. I will make this right.']] },
            { label: 'Oh, Mayor!', reply: [['mayor', 'I know, I know! I was a silly old fool.'], ['mayor', 'But I will make this right.']] }]]],
    hay1: [['mayor', 'The Hay Field is ours!'],
        ['mayor', 'And look over there... the old windmill. The big wheel the wind turns!', 'The note!']],
    hay9: [['hattie', 'The sheep are back! They\'re SO fluffy. I could nap on one.']],
    hay18: [['ruby', 'Two stalls, built in one go. Boom!'], ['hattie', 'The horses say thank you. Well, they say "neigh". Same thing!']],
    hay20: [['narrator', 'The old windmill creaks in the wind. Its sails are broken.'],
        ['hattie', 'This is it! The big wheel the wind turns!'],
        ['ruby', 'Let\'s fix those sails. The next note must be up there.', 'Let\'s fix it!']],
    hay64: [['letter', 'Dear Farmer, I hear you are fixing that old windmill. STOP. Or else!'],
        ['ruby', 'Or else WHAT? Ha! He\'s worried.'],
        ['mayor', 'That means we are close. Keep going!', 'Keep going!']],
    hay6: [['narrator', 'The sails turn round and round. Whoosh!'],
        ['narrator', 'A note floats down from the top and lands at your feet.'],
        ['note', 'Good work! The one who fishes knows the old Bell Keeper story. Ask him. Quietly!'],
        ['mayor', 'The one who fishes... that\'s Mira! Is Mira in on this?', 'Let\'s ask Mira!']],
    hay72: [['narrator', 'From the top of the windmill, you can see the whole valley.'],
        ['narrator', 'A little gold light hurries down the road into town...'],
        ['narrator', '...and a long black car follows it, with its lights off.'],
        ['ruby', 'Grimsby is following our Friend! We have to hurry!', 'Hurry!']],
    town1: [['mayor', 'The fog is lifting! I can see my town again!'],
        ['narrator', 'Up in the Town Hall tower, the bell spot is empty.'],
        ['narrator', 'On the tower steps: big city shoe prints. They stop at a broken stair.'],
        ['ruby', 'Grimsby tried to climb up. But nobody can get past those stairs.'],
        ['mayor', 'Then we will fix my Town Hall. Every last stair!', 'Let\'s do it!']],
    town2: [['ruby', 'My workshop! I can build anything now!'],
        ['hattie', 'Ellis... why is the bell\'s old rope in your shed?'],
        ['ruby', 'Don\'t look at me like that! I found it in the river after the storm.'],
        ['ruby', 'I\'m fixing it. For when we find the bell!', [
            { label: 'I believe you.', reply: [['ruby', 'Thanks, boss. That means a lot.']] },
            { label: 'Hmm...', reply: [['ruby', 'Hmm yourself! I\'m a fixer, not a hider.']] }]]],
    town3: [['hattie', 'Home sweet home! Thank you, partner!'],
        ['hattie', 'Hey... city shoe prints by my gate. Grimsby is snooping everywhere!']],
    town4: [['finn', 'My shop is open! Fresh fish for everyone.'],
        ['finn', 'And yes, I saw the grey coat man the night of the storm.'],
        ['finn', 'He ran past my dock with a big empty sack. Mad as a wet cat.'],
        ['ruby', 'Empty! So he never got the bell!', 'Phew!']],
    town5: [['poppy', 'My shop smells like spring again!'],
        ['poppy', 'And look, my boots have little flowers on the bottom. No flour!'],
        ['hattie', 'So those small floury boots weren\'t yours. Sorry, Mae!', 'Sorry, Mae!']],
    town6: () => {
        const right = story.guess === 'marigold';
        if (right && !story.guessPaid) { story.guessPaid = true; grantReward({ gems: 25 }, '🔍 Mystery solved:'); }
        return [['narrator', 'You climb the brand new stairs, all the way up the tower.'],
            ['narrator', 'At the top is a tiny door with a bell carved on it. You try the silver key... Click!'],
            ['narrator', 'Inside, wrapped in a warm blanket, is the Golden Bell!'],
            ['shopkeeper', 'You found it! I knew you would.'],
            ['mayor', 'Marigold?! YOU are the Friend?'],
            ['shopkeeper', 'Yes. And the Bell Keeper, like my grandma before me.'],
            ['finn', 'The red-haired Keeper in Grandpa\'s story... was your grandma!'],
            ['shopkeeper', 'The night of the storm, Grimsby came to steal the bell. He wanted its gold.'],
            ['shopkeeper', 'So I hid it up here. But I dropped my key in the hen house as I ran!'],
            ['shopkeeper', 'He watched my shop day and night. So I wrote to the one person he didn\'t know: you.'],
            ['poppy', 'The cinnamon! The notes smelled like your buns!'],
            ['ruby', 'And you knew the key was silver before anyone told you!'],
            ['shopkeeper', 'Hee hee. I did slip a little, didn\'t I?'],
            right ? ['ruby', 'And you guessed it was Marigold! Sharp as a nail, boss. Here\'s 💎25.'] : ['ruby', 'Bet you didn\'t see that coming, boss!'],
            ['shopkeeper', 'Now, let\'s put this bell back where it belongs!', 'Ring the bell!']];
    },
    town7: [['narrator', 'Festival Day. The whole valley goes quiet...'],
        ['narrator', 'DING! DONG! The Golden Bell rings out over the hills!'],
        ['narrator', 'Far away, the families hear it. One by one, they come home.'],
        ['letter', 'Fine. Keep your silly bell. I\'m leaving. But I\'ll be back!'],
        ['hattie', 'He\'s gone! Yee-haw! Let\'s dance!'],
        ['mayor', 'Thank you, farmer. You saved Sunnyvale. You are one of us now.'],
        ['narrator', 'Later, Ellis polishes the bell. Inside, words are carved in the gold:'],
        ['note', 'When the gold bell rings again, look for the silver one.', null, ''],
        ['finn', 'The Silver Bell! Grandpa said that was the second part of the story...', 'To be continued!']],
    fert1: [['poppy', 'Leaves and mud! This is where good gardens begin.']],
    fert4: [['poppy', 'Pee-yew! It smells SO strong.'], ['poppy', 'But the plants love it. Yum, yum!']],
    fert10: mapBeat(['narrator', 'Under the last big leaf pile, something crinkles...']),
    fert21: [['hattie', 'It\'s so dark in here!'], ['ruby', 'Scared of the dark, cowgirl?'], ['hattie', 'Me? Never! ...Hold my hand, though.']],
    fert5: [['poppy', 'Fairy lights! So pretty!'],
        ['narrator', 'The lights shine on a note, tucked in a mossy log.'],
        ['note', 'You are so close. Fix the town and climb the tower. Bring the silver key.'],
        ['poppy', 'Cinnamon again... Where have I smelled that before?', 'Hmm!']],
    aqua1: [['finn', 'Ahoy! Mira\'s the name. Fish are my game.'],
        ['finn', 'A night lantern? Sure, I fish at night. But my lantern is big and green.'],
        ['finn', 'A little gold one? Not mine, friend.'],
        ['finn', 'Help me fix my pond, and I\'ll tell you the Bell Keeper story.', 'Deal!']],
    aqua3: [['finn', 'Here is the story my grandpa told me.'],
        ['finn', 'Long ago, the town picked a secret Bell Keeper.'],
        ['finn', 'In bad times, the Keeper hides the bell. Nobody knows who it is. Not even the Mayor!'],
        ['finn', 'The last Keeper Grandpa knew was a lady with bright red hair.'],
        ['narrator', 'A secret Keeper... could that be our Friend?', 'Hmm!']],
    aqua8: mapBeat(['narrator', 'Inside the old tyre is a bottle. Inside the bottle is paper!']),
    aqua5: [['finn', 'Row, row, row! The water is clear again.'],
        ['finn', 'Look, a little gold lantern, stuck in the reeds.'],
        ['ruby', 'The Friend\'s lantern! They were here. Where do people even buy those?', 'Hmm...']],
    flower1: [['poppy', 'My garden! It looks sad now... but not for long!']],
    flower13: [['poppy', 'Poor roses. Don\'t worry, we\'ll make you happy again.']],
    flower22: [['poppy', 'Careful! Broken glass everywhere.'], ['ruby', 'Leave it to me. I\'ll make it shine.']],
    flower5: [['poppy', 'It\'s perfect! The festival will be the prettiest ever.'], ['mayor', 'Splendid! Simply splendid!']],
};
TASKS.forEach(t => { if (STORY_BEATS[t.id]) t.story = STORY_BEATS[t.id]; });

// The case so far, for the job list: each clue's job, its icon, what it is,
// a line for "the story so far", and a hint of where the next one hides.
const CLUES = [
    { task: 'barn1', icon: 'note', text: 'Note 1, sealed with green wax', recap: 'A Friend left you a note: the bell is safe, but hidden.', next: 'Something is hiding under the planks in the Barnyard.' },
    { task: 'barn9', icon: '🏮', text: 'A little gold lantern at night', recap: 'Someone walks the farm at night with a little gold lantern.', next: 'Put up a lantern in the Barnyard, and watch the fence.' },
    { task: 'barn20', icon: '👣', text: 'Small floury boots, big city shoes', recap: 'You found two sets of footprints: small floury boots, and big city shoes.', next: 'Sweep the cobbles in the Barnyard.' },
    { task: 'hen3', icon: '🗝️', text: 'A silver key with a tiny bell', recap: 'You found a little silver key in a nest.', next: 'Fix the nest in the Hen House.' },
    { task: 'big5', icon: 'note', text: 'Note 2: the big wheel, and the grey coat', recap: 'Note 2 sent you to the big wheel the wind turns.', next: 'One jar in the Barn Storeroom has no jam...' },
    { task: 'farm28', icon: '🎩', text: 'The Mayor let a stranger into the tower', recap: 'The Mayor let a man in a grey coat into the bell tower.', next: 'Lay out a picnic in the Orchard. The Mayor wants to talk.' },
    { task: 'hay6', icon: 'note', text: 'Note 3: ask the one who fishes', recap: 'Note 3 said Mira knows the old Bell Keeper story.', next: 'Get the windmill\'s sails turning.' },
    { task: 'aqua3', icon: '📖', text: 'The secret Keeper had red hair', recap: 'Mira says a secret Bell Keeper guards the bell. The last one had red hair.', next: 'Fix up the Fish Pond. Mira has a story for you.' },
    { task: 'fert5', icon: 'note', text: 'Note 4: climb the tower (it smells of cinnamon)', recap: 'Note 4 said: fix the town and climb the tower.', next: 'Hang the fairy lights in the Mushroom Corner.' },
    { map: true, icon: '🗺️' },
    { task: 'town6', icon: '🔔', text: 'The Golden Bell is found!', recap: 'You found the Golden Bell! Marigold was the Friend.', next: 'Restore the Town Hall and climb the tower.' },
];

// Who might the Friend be? Each shows from its job, with a note that changes
// when they're cleared (Marigold's stays a question until the bell is found).
const SUSPECTS = [
    { who: 'shopkeeper', name: 'Marigold', from: 'barn6', note: 'Sells a bit of everything. Bakes cinnamon buns.', end: 'town6', endNote: 'The Friend, and the Bell Keeper! 🔔' },
    { who: 'finn', name: 'Mira', from: 'barn9', note: 'Fishes at night with a lantern...', end: 'aqua1', endNote: 'Her lantern is big and green. ✓' },
    { who: 'mayor', name: 'Mayor Bramble', from: 'barn20', note: 'Why was he sweating?', end: 'farm28', endNote: 'He let the stranger in. Sorry, not sneaky. ✓' },
    { who: 'poppy', name: 'Mae', from: 'farm31', note: 'Tiny feet. Out at midnight...', end: 'town5', endNote: 'Her boots have flowers, not flour. ✓' },
    { who: 'ruby', name: 'Ellis', from: 'town2', note: 'Had the bell\'s rope in his shed!', end: 'town6', endNote: 'He really was fixing it. ✓' },
];

// The mystery so far: what's been found, who's who, and where the next clue hides.
function cluesHtml() {
    const icon = c => (c.icon === 'note' && (ASSETS.story || {}).note ? `<img class="inline-item" src="${ASSETS.story.note}" alt="📜">` : c.icon);
    const found = CLUES.filter(clueFound);
    if (!found.length) return '';
    const done = id => restoration.done.includes(id);
    const people = SUSPECTS.filter(s => done(s.from)).map(s => {
        const npc = npcs.find(n => n.id === s.who), pic = s.who === 'shopkeeper' ? (ASSETS.bust || {}).shopkeeper : npcPicture(npc);
        return `<span class="suspect${done(s.end) ? ' cleared' : ''}"><img src="${pic}" alt=""><b>${s.name}</b><small>${done(s.end) ? s.endNote : s.note}</small></span>`;
    }).join('');
    const next = nextClue();
    const guess = story.guess && !done('town6') ? ` · Your guess: <b>${SUSPECTS.find(s => (s.who === 'shopkeeper' ? 'marigold' : s.who) === story.guess)?.name || '?'}</b>` : '';
    return `<div class="clues"><h3>🔔 The Lost Golden Bell</h3>
        ${found.map(c => `<span class="clue">${icon(c)} ${c.map ? `Map pieces: ${mapPiecesFound()} of 4` : c.text}</span>`).join('')}
        ${people ? `<h4>Who is the Friend?${guess}</h4><div class="suspects">${people}</div>` : ''}
        ${next ? `<p class="clue-next">🔍 Next clue: ${next.next}</p>` : ''}</div>`;
}

function clueFound(c) {
    return c.map ? mapPiecesFound() > 0 : restoration.done.includes(c.task);
}

// The next clue still to find, on land you own.
function nextClue() {
    return CLUES.find(c => !c.map && !clueFound(c) && (unlocks[TASKS.find(t => t.id === c.task).land] || TASKS.find(t => t.id === c.task).land === 'town'));
}

// Back after a while: the story so far, in a few lines, and where to look next.
function storyRecap() {
    const found = CLUES.filter(c => !c.map && clueFound(c));
    if (!found.length || restoration.done.includes('town7')) return null;
    const next = nextClue();
    return [['narrator', 'The story so far...'],
        ...found.slice(-2).map(c => ['narrator', c.recap]),
        ...(next ? [['narrator', `Next: ${next.next}`]] : []),
        ['narrator', 'Who is the Friend? Let\'s find out!', 'Let\'s go!']];
}

// A line of town talk on the daily gift card, from the chapter you're in.
const GOSSIP = [
    [['hattie', 'My hens are still hiding. Something scared them silly.'], ['ruby', 'If you find a nail on the road, it\'s mine. Probably.'], ['mayor', 'I practise my festival speech every morning. Splendid, isn\'t it?']],
    [['shopkeeper', 'Fresh cinnamon buns today, dear! Hee hee.'], ['ruby', 'Saw that black car again last night. Creepy.'], ['hattie', 'A key in a nest! Hens are full of surprises.']],
    [['poppy', 'The moonflowers told me a secret. They won\'t say what it is.'], ['mayor', 'I can\'t sleep. That grey coat man is out there somewhere.'], ['finn', 'Caught a fish as big as a boot today. It WAS a boot.']],
    [['finn', 'The fog is so thick, I said hello to a lamp post.'], ['ruby', 'I\'m fixing the bell rope. For when we find it. WHEN.'], ['shopkeeper', 'Little gold lanterns, two for a coin! Hee hee.']],
    [['mayor', 'The festival is so close! Will our bell ring?'], ['poppy', 'I\'m making flower crowns for everyone. Even Grimsby. Maybe.'], ['hattie', 'My hens laid golden eggs! ...Okay, yellow ones.']],
    [['finn', 'The Silver Bell... Grandpa said it sings over the sea.'], ['shopkeeper', 'Ding, dong! Hear that? That\'s our bell, dear.'], ['ruby', 'Grimsby said he\'ll be back. Let him try.']],
];

function gossipHtml() {
    const ch = currentChapter();
    const list = GOSSIP[ch === -1 ? GOSSIP.length - 1 : ch];
    const [who, text] = list[((today() % list.length) + list.length) % list.length];
    const npc = npcs.find(n => n.id === who);
    const pic = who === 'shopkeeper' ? (ASSETS.bust || {}).shopkeeper : npcPicture(npc);
    return `<div class="gossip"><img src="${pic}" alt=""><p>“${text}”<small>${npc ? npc.name : KEEPER_NAME}</small></p></div>`;
}

// Story beats from jobs just done, played once nothing else is showing.
const storyQueue = [];

// Which scenes have played. Saved.
const story = { intro: false, seen: [], ended: false, hints: [], guess: null, guessPaid: false }; // hints: Marigold's words already said; guess: who you think the Friend is
// The shopkeeper's name.
const KEEPER_NAME = 'Marigold';
// A new game's first daily gift waits until the tutorial is over.
let giftAfterTutorial = false;

function chapterOf(id) {
    return CHAPTERS.findIndex(c => c.jobs.includes(id));
}

// The first day (chapter) with jobs left, or -1 once every job is done.
function currentChapter() {
    return CHAPTERS.findIndex(c => !c.jobs.every(id => restoration.done.includes(id)));
}

// Plays speech bubbles one after another. The last one can carry extra HTML.
function playScene(title, lines, extra = '', then = null) {
    if (typeof lines === 'function') lines = lines();
    const [who, text, answer, sign] = lines[0];
    const last = lines.length === 1;
    const book = ASSETS.story || {};
    let art, round = false, words;
    if (who === 'note' || who === 'letter') {
        art = book.note;
        const by = sign ?? (who === 'note' ? '— A Friend' : '— R. Grimsby, Grimsby Land Co.');
        words = `<p class="story-note${who === 'letter' ? ' story-letter' : ''}">${text}</p>${by ? `<p class="hint">${by}</p>` : ''}`;
    } else if (who === 'shopkeeper' || npcs.some(n => n.id === who)) {
        const npc = npcs.find(n => n.id === who), bust = (ASSETS.bust || {})[who];
        art = bust || npcPicture(npc);
        round = !bust;
        words = `<p class="story-line">“${text}”</p><p class="hint">— ${npc ? npc.name : KEEPER_NAME}</p>`;
    } else { // the narrator
        art = book.book;
        words = `<p class="story-narration">${text}</p>`;
    }
    const rest = lines.slice(1);
    const next = more => (more.length ? playScene(title, more, extra, then) : then && then());
    // A choice: each answer has its own reply, then the scene goes on.
    const actions = Array.isArray(answer)
        ? answer.map((c, i) => ({ label: c.label, primary: i === 0, half: answer.length > 2,
            onClick: () => { if (c.guess) story.guess = c.guess; next([...(c.reply || []), ...rest]); } }))
        : [{ label: answer || 'OK!', primary: true, onClick: () => next(rest) }];
    showDialog({
        art,
        artRound: round,
        title,
        body: `${words}${last ? extra : ''}`,
        actions,
    });
}

// --- OPENING ---
// A new game opens on a short film over the map's own paintings: Sunnyvale in
// the sun, the storm, the friends who stayed, the Mayor's welcome and how the
// game works. Then clouds close in and part on the map itself, where the
// tutorial takes over. A tap hurries a line along; Skip goes straight to the map.
let openingOn = false;
const NO_INTRO = new URLSearchParams(location.search).has('nointro'); // for testing

const OPENING_LINES = [
    { mood: 'sun', text: 'For a hundred years, the Golden Bell rang over Sunnyvale every night.' },
    { mood: 'storm', text: 'Then one night, a wild storm came.' },
    { mood: 'rain', text: 'Barns broke. Fields flooded. In the morning, the bell was gone!' },
    { mood: 'friends', text: 'The families left. Only a few good friends stayed... and waited for help.' },
];

// How far into its drift each opening cloud starts (s), so they begin scattered
// over the sky instead of in one diagonal line.
const CLOUD_PHASES = [-6.3, -16, -11.4, -24.2, -5.8, -19.1];

function playOpening() {
    if (!story.seen.includes(0)) story.seen.push(0);
    if (NO_INTRO) { story.intro = true; return; }
    openingOn = true;
    hidePointer();
    const map = (ASSETS.stages || {}).map || [];
    const cloud = ASSETS.ui.cloud;
    const el = document.createElement('div');
    el.id = 'opening';
    el.className = 'title';
    el.innerHTML = `<div class="op-frame">
        <div class="op-paint op-sun" style="background-image:url('${map[2]}')"></div>
        <div class="op-paint op-ruin" style="background-image:url('${map[0]}')"></div>
        <div class="op-dark"></div>
        <div class="op-clouds">${[0, 1, 2, 3, 4, 5].map(i => `<img src="${cloud}" alt="" style="--i:${i};--d:${CLOUD_PHASES[i]}s">`).join('')}</div>
        <div class="op-rain"></div>
        <div class="op-flash"></div>
        <div class="op-title"><h1>Merge<br><span>Farmstead</span></h1><p>Tap to start</p></div>
        <p class="op-caption"></p>
        <div class="op-friends">${['shopkeeper', 'hattie', 'ruby', 'mayor', 'finn', 'poppy'].map((id, i) =>
            `<img src="${ASSETS.characters[id] || (ASSETS.bust || {})[id]}" alt="" style="--i:${i}">`).join('')}</div>
        <div class="op-card"></div>
        <div class="op-wall"><i></i><i></i></div>
        <button class="op-skip">Skip ▸</button>
    </div>`;
    document.body.appendChild(el);
    const caption = el.querySelector('.op-caption');
    const card = el.querySelector('.op-card');
    let skipped = false;

    // Waits this long, or until a tap (Infinity: only a tap).
    const beat = ms => new Promise(resolve => {
        const done = () => { clearTimeout(timer); el.removeEventListener('pointerdown', done); resolve(); };
        const timer = ms === Infinity ? 0 : setTimeout(done, ms);
        el.addEventListener('pointerdown', done);
    });
    const say = text => {
        caption.classList.remove('show');
        void caption.offsetWidth;
        caption.textContent = text;
        caption.classList.add('show');
    };
    const flash = () => {
        el.classList.remove('flash');
        void el.offsetWidth;
        el.classList.add('flash');
        sfx('thunder');
    };
    // A card with a button; resolves when it's tapped.
    const ask = (html, label) => new Promise(resolve => {
        card.innerHTML = `${html}<button class="op-go">${label}</button>`;
        card.classList.remove('show');
        void card.offsetWidth;
        card.classList.add('show');
        card.querySelector('.op-go').addEventListener('click', () => { sfx('pop'); resolve(); }, { once: true });
    });

    const finish = () => {
        if (!openingOn) return;
        openingOn = false;
        story.intro = true;
        stopRain();
        sfx('whoosh');
        // The clouds close in, the film goes, and they part on the map.
        el.classList.add('closing');
        setTimeout(() => {
            el.classList.add('parting');
            updateTutorial();
        }, 1100);
        setTimeout(() => el.remove(), 2600);
    };
    el.querySelector('.op-skip').addEventListener('click', e => { e.stopPropagation(); skipped = true; finish(); });
    el.querySelector('.op-skip').addEventListener('pointerdown', e => e.stopPropagation());

    (async () => {
        await beat(Infinity);
        if (skipped) return;
        el.className = 'sun';
        say(OPENING_LINES[0].text);
        await beat(4200);
        if (skipped) return;
        el.className = 'storm';
        flash();
        startRain();
        say(OPENING_LINES[1].text);
        await beat(4000);
        if (skipped) return;
        el.className = 'storm rain';
        setTimeout(() => !skipped && flash(), 1200);
        say(OPENING_LINES[2].text);
        await beat(4200);
        if (skipped) return;
        el.className = 'storm rain friends';
        say(OPENING_LINES[3].text);
        await beat(4500);
        if (skipped) return;
        stopRain();
        el.className = 'welcome';
        caption.classList.remove('show');
        const mayor = npcs.find(n => n.id === 'mayor');
        await ask(`<img class="op-who" src="${npcBust(mayor) || npcPicture(mayor)}" alt="">
            <b class="op-name">${mayor.name}</b>
            <p>You came! You must be Clara, the new farmer. Welcome to ${TOWN_NAME}!</p>
            <p>Our Golden Bell is gone. The families say they will come home when it rings again.</p>
            <p>Will you help us fix the farm... and find the bell?</p>`, 'I\'ll help!');
        if (skipped) return;
        const pic = (src, alt) => `<img src="${src}" alt="${alt}">`;
        const items = ASSETS.items.barn || [];
        await ask(`<h2>How to play</h2>
            <div class="op-how"><span>${pic(ASSETS.producers.barn[3], '🧺')}</span>
                <p><b>Tap</b> a producer to make things.</p></div>
            <div class="op-how"><span>${pic(items[0], '🌿')}<i>+</i>${pic(items[0], '🌿')}<i>=</i>${pic(items[1], '🥚')}</span>
                <p><b>Drag</b> two that match together. They <b>merge</b> into something new!</p></div>
            <div class="op-how"><span>${pic(ASSETS.ui.hammer, '🔨')}</span>
                <p>Use what you make to do <b>jobs</b> and fix the farm!</p></div>`, 'Let\'s go!');
        finish();
    })();
}

// Rain for the opening's storm: soft noise that fades in, and out when stopped.
let rainGain = null;

function startRain() {
    const ctx = audio();
    if (!ctx) return;
    try { rainGain = noise(ctx, 0, 30, 0.05, 1400, 1.5); } catch (e) { /* sound is a nicety */ }
}

function stopRain() {
    if (!rainGain) return;
    const t = rainGain.context.currentTime;
    rainGain.gain.cancelScheduledValues(t);
    rainGain.gain.setTargetAtTime(0.0001, t, 0.4);
    rainGain = null;
}

// A day's bubble, with the items its first job asks for.
function playChapter(i) {
    const first = openTasks().find(t => CHAPTERS[i].jobs.includes(t.id));
    const extra = first ? `<div class="needs">${first.needs.map(n => needLabel(first, n)).join('')}</div>` : '';
    playScene(`📖 Chapter ${i + 1}: ${CHAPTERS[i].title}`, CHAPTERS[i].scene, extra);
}

// Every second: the first daily gift after the tutorial, then (on the map, with
// no dialog open) a new day's bubble or the ending.
function syncStory() {
    if (!tutorial.done || !dialogEl.hidden || Date.now() < storyHoldUntil) return;
    if (giftAfterTutorial) {
        giftAfterTutorial = false;
        if (dailyAvailable()) return openDailyGift();
    }
    // Never mid-merge: beats wait for the map, a place or the town.
    if (storyQueue.length && !fixing && !isBoard(currentScene)) return playScene('📖', storyQueue.shift());
    if (currentScene !== 'map') return;
    const i = currentChapter();
    if (i === -1) {
        if (!story.ended) {
            story.ended = true;
            playScene(`🎉 ${TOWN_NAME} saved!`, STORY_END);
        }
    } else if (!story.seen.includes(i)) {
        story.seen.push(i);
        playChapter(i);
    }
}

function landTasks(land) {
    return TASKS.filter(t => t.land === land);
}

function taskDone(task) {
    return restoration.done.includes(task.id);
}

// Open: not done and every job it waits for (after) is done, Merge Mansion
// style, so several can be open at once and threads branch and join. Buying a
// land opens at the level its deed unlocks; its other jobs wait for that. The
// town has no deed.
function taskOpen(task) {
    if (taskDone(task)) return false;
    if (task.after && !task.after.every(id => restoration.done.includes(id))) return false;
    if (task.needs[0].own) return quests.level >= AREAS[task.land].level;
    if (task.zone) return zoneOpen(ZONE[task.zone]);
    return !AREAS[task.land] || unlocks[task.land];
}

// "Barn", "Crop Field"… or the town's name for its own jobs.
function landName(land) {
    return AREAS[land] ? AREAS[land].name : TOWN_NAME;
}

function openTasks() {
    return TASKS.filter(taskOpen);
}

// The free items that count for a job's item need, as [board, cell]: a land's
// goods on its board; tools anywhere (they travel in the 🎒).
function needSpots(need) {
    const boards = TOOLS[need.item] ? Object.keys(grids).filter(m => m !== 'fair') : [need.item];
    const spots = [];
    boards.forEach(m => grids[m].forEach((c, i) => {
        if (isFree(c) && !c.type && chainOf(m, c) === need.item && c.tier === need.tier) spots.push([m, i]);
    }));
    return spots;
}

// How far a need has got, out of how many.
function needProgress(task, need) {
    if (need.own) return { have: unlocks[need.own] ? 1 : 0, of: 1 };
    if (need.stat) {
        const base = (restoration.baselines[task.id] || {})[need.stat] || 0;
        return { have: Math.min(need.n, Math.max(0, stats[need.stat] - base)), of: need.n };
    }
    return { have: Math.min(need.n, needSpots(need).length), of: need.n };
}

function taskReady(task) {
    return taskOpen(task) && task.needs.every(need => { const p = needProgress(task, need); return p.have >= p.of; });
}

// A need as a picture and a count, e.g. "🥚 1/2".
function needLabel(task, need) {
    const p = needProgress(task, need);
    const what = need.own ? `🏡 ${AREAS[need.own].name}`
        : need.stat ? `${statIcon(need.stat)} ${TASK_STATS[need.stat].label}`
        : `${itemIcon(need.item, need.tier)} ${itemName(need.item, need.tier)}`;
    return `<span class="need${p.have >= p.of ? ' met' : ''}">${what} ${need.own ? (p.have ? '✓' : '') : `${p.have}/${p.of}`}</span>`;
}

// Items wanted by open jobs ("chain:tier"), so they glow on the boards like order items.
function taskWanted() {
    return openTasks().flatMap(t => t.needs.filter(n => n.item).map(n => `${n.item}:${n.tier}`));
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
        const ready = taskReady(task);
        if (ready && !announcedTasks.has(task.id)) {
            announcedTasks.add(task.id);
            // Its person calls you over (a toast while still learning).
            if (tutorial.done && !fixing) callToFix(task);
            else toast(`🔨 Ready: ${task.name}!`, 'good');
        }
        // Each item made for it gets a cheer.
        const have = task.needs.reduce((sum, n) => sum + (n.item ? needProgress(task, n).have : 0), 0);
        const of = task.needs.reduce((sum, n) => sum + (n.item ? n.n : 0), 0);
        if (!ready && have > (jobProgress[task.id] ?? have)) toast(`🔨 ${task.name} ${have}/${of}`, 'good');
        jobProgress[task.id] = have;
    });
}

// A whole land (or the town) done pays this on top.
const LAND_REWARD = { gems: 10, chest: 'brown' };

// Does a job: uses up its items, pays its XP and reward, and shows who's happy:
// after a fix (quiet) just a cheer over the place, otherwise a thank-you. A
// restored land always gets the big thank-you; story beats queue up after.
function completeTask(id, quiet = false) {
    const task = TASKS.find(t => t.id === id);
    if (!task || !taskReady(task)) return;
    task.needs.forEach(need => {
        if (need.item) needSpots(need).slice(0, need.n).forEach(([m, i]) => { grids[m][i] = null; });
    });
    restoration.done.push(task.id);
    document.querySelectorAll(`.fix-call[data-job="${task.id}"]`).forEach(el => el.remove());
    stats.jobs++;
    salesPause();
    addPassPoints(JOB_PASS_POINTS);
    fillJar(GEM_JAR.perJob);
    delete restoration.baselines[task.id];
    lastSale = null;
    const npc = npcs.find(n => n.id === task.who);
    cheerPerson(task.who);
    const restored = landRestored(task.land);
    const zone = task.zone && ZONE[task.zone];
    const zoneFinished = zone && zoneDone(zone) && !restored; // a land's last area pays the land's reward
    const nextZone = zone && landZones(zone.land)[landZones(zone.land).indexOf(zone) + 1];
    if (task.reward) grantReward(task.reward, '🔨');
    if (restored) {
        grantReward(LAND_REWARD, '✨');
        if (LAND_STORY[task.land]) storyQueue.push(LAND_STORY[task.land]);
    }
    if (zoneFinished) grantReward(ZONE_REWARD, '✨');
    if (restored || zoneFinished) celebrate();
    else sfx('taskdone');
    thump(restored || zoneFinished);
    if (task.story) storyQueue.push(typeof task.story === 'function' ? task.story() : task.story); // a map piece counts as it's found
    if (quiet && !restored && !zoneFinished) cheer(task, npc);
    else showDialog({
        art: npcBust(npc) || npcPicture(npc),
        artRound: !npcBust(npc),
        title: `✅ ${task.name}`,
        body: `<p>“${task.line}”</p><p class="hint">— ${npc.name}</p>
               <p><b>+⭐${task.xp}</b>${task.reward ? ` · ${rewardText(task.reward)}` : ''}</p>
               ${restored ? `<p class="restored-note">✨ ${landName(task.land)} restored! ${rewardText(LAND_REWARD)}</p>` : ''}
               ${zoneFinished ? `<p class="restored-note">✨ ${zone.name} restored! ${rewardText(ZONE_REWARD)}</p>
                   ${nextZone ? `<p class="hint">Next: ${nextZone.name}${quests.level < nextZone.level ? ` (level ${nextZone.level})` : ''}</p>` : ''}` : ''}`,
        actions: [{ label: 'Yay!', primary: true }],
    });
    // What it paid flies from the job (or the middle of the screen) to the counters.
    const spot = fxAt(document.querySelector(`.scene:not([hidden]) [data-job="${task.id}"]`)), st = stageEl.getBoundingClientRect();
    const from = spot || { x: st.left + st.width / 2, y: st.top + st.height * 0.4, size: 80 };
    const paid = [task.reward, restored && LAND_REWARD, zoneFinished && ZONE_REWARD].filter(Boolean);
    flyReward('⭐', from, document.getElementById('btn-level'), 3, 200);
    if (paid.some(r => r.money)) flyReward('💵', from, document.getElementById('btn-coins'), 4, 350);
    if (paid.some(r => r.gems)) flyReward('💎', from, document.getElementById('btn-gems'), 3, 500);
    if (FX.app && !restored && !zoneFinished) fxConfetti(30, from);
    // XP last: a level-up popup follows this one.
    addXp(task.xp);
    checkTasks();
    if (AREAS[currentScene]) refreshBoard(currentScene);
    else if (currentScene === 'fix') renderFix();
    else if (currentScene === 'map') renderMap();
    else if (currentScene === 'town') renderTown();
}

// A job done: the place gives a little thump, as if the last nail went in
// (a bigger one when a whole area or land is finished).
function thump(big = false) {
    const el = currentScene === 'fix' ? document.querySelector('#scene-fix .world') : currentScene === 'map' ? document.querySelector('#scene-map .world-stage') : document.querySelector('.scene:not([hidden]) .page-frame');
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const d = big ? 9 : 5;
    el.animate([
        { transform: 'translate(0, 0)' }, { transform: `translate(${-d}px, ${d * 0.4}px)` }, { transform: `translate(${d * 0.8}px, ${-d * 0.3}px)` },
        { transform: `translate(${-d * 0.5}px, ${d * 0.2}px)` }, { transform: `translate(${d * 0.25}px, 0)` }, { transform: 'translate(0, 0)' },
    ], { duration: big ? 520 : 380, easing: 'ease-out' });
}

// After a fix: who's happy and what it paid, floating over the place for a moment.
function cheer(task, npc) {
    document.querySelectorAll('.fix-cheer').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'fix-cheer';
    const happy = (ASSETS.cheer || {})[npc.id];
    el.innerHTML = iconize(`<img class="${happy ? 'happy' : 'face'}" src="${happy || npcPicture(npc)}" alt=""><span><b>“${task.line}”</b>
                    <small>+${uiIcon('star', '⭐')}${task.xp} · 🎟️+${JOB_PASS_POINTS}${task.reward ? ` · ${rewardText(task.reward)}` : ''}</small></span>`);
    stageEl.appendChild(el);
    setTimeout(() => el.remove(), 2600);
}

// The 📋 job list: XP bar, then each land's open job with what it needs.
function openTaskLog() {
    const need = xpToNext(quests.level);
    const nextLand = Object.keys(AREAS).find(id => AREAS[id].level > quests.level);
    let chapter = -1;
    const rows = openTasks().sort((a, b) => chapterOf(a.id) - chapterOf(b.id)).map(task => {
        const ready = taskReady(task);
        const done = landTasks(task.land).filter(taskDone).length;
        const ch = chapterOf(task.id);
        const heading = ch !== chapter ? `<h3 class="chapter-h">📖 Chapter ${ch + 1}: ${CHAPTERS[ch].title}</h3>` : '';
        chapter = ch;
        return `${heading}<div class="task-row${ready ? ' ready' : ''}">
                    <img class="face" src="${npcPicture(npcs.find(n => n.id === task.who))}" alt="">
                    <div class="task-body">
                        <b>${task.name}${CLUES.some(c => c.task === task.id) || MAP_PIECES.includes(task.id) ? ' 🔍' : task.story ? ' 📖' : ''}</b> <small>${landName(task.land)} ${done}/${landTasks(task.land).length}</small>
                        <div class="needs">${task.needs.map(n => needLabel(task, n)).join('')}</div>
                    </div>
                    <button class="task-go" data-id="${task.id}" data-can="${ready ? 1 : ''}">${ready ? (hasSpot(task) ? 'Go fix' : 'Do it') : hasSpot(task) ? 'Show' : 'Go'}<br>+⭐${task.xp}</button>
                </div>`;
    }).join('');
    showDialog({
        title: `⭐ Level ${quests.level}`,
        body: `<div class="quest xp-row"><span>⭐ XP to level ${quests.level + 1}</span><small>${quests.xp}/${need}</small>
                   <span class="quest-bar xp"><i style="width:${(100 * quests.xp) / need}%"></i></span></div>
               ${cluesHtml()}
               ${rows || '<p>All done! 🎉</p>'}
               ${nextLand ? `<p class="hint">More jobs at level ${AREAS[nextLand].level}.</p>` : ''}`,
        actions: [{ label: 'OK' }],
    });
    dialogBody.querySelectorAll('.task-go').forEach(btn => btn.addEventListener('click', () => {
        const task = TASKS.find(t => t.id === btn.dataset.id);
        closeDialog();
        // Ready: fix it in its place. Buying a land has no place, so it's done here.
        if (btn.dataset.can) return hasSpot(task) ? goFix(task.land, task.id) : completeTask(task.id);
        showTask(task); // not ready: its spot and card (or the Market for a land to buy)
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
        body: `${gossipHtml()}<div class="gift-track">${track}</div><p class="hint">A new gift every day. Miss a day and the track starts over.</p>`,
        actions: available
            ? [
                { label: `Claim day ${day}: ${rewardText(DAILY_GIFTS[day - 1])}`, primary: true, wide: true, onClick: () => claimDailyGift() },
                adsLeft() > 0 ? { icon: uiIcon('ad', '📺'), label: 'Watch an ad · claim it twice', wide: true, onClick: () => showRewardedAd(() => { shop.adsWatched++; claimDailyGift(true); }) } : null,
            ].filter(Boolean)
            : [{ label: `Next gift in ${formatDuration(msUntilTomorrow())}`, disabled: true }, { label: 'OK' }],
    });
}

function claimDailyGift(twice = false) {
    if (!dailyAvailable()) return;
    const day = nextGiftDay();
    daily.streak = daily.lastDay === today() - 1 ? daily.streak + 1 : 1;
    daily.lastDay = today();
    stats.gifts++;
    grantReward(DAILY_GIFTS[day - 1], `🎁 Day ${day} gift:`);
    if (twice) grantReward(DAILY_GIFTS[day - 1], '📺 And again:');
    checkTasks();
    goTo(currentScene);
}

// --- SCENE LAYOUTS ---
// Positions are percentages of the 9:16 stage: x/y = top-left corner, w = width.
// Height follows the sprite's own aspect ratio.

// Each building fits its picture inside this box (h = height), sitting on its bottom.
const MAP_LAYOUT = {
    town:   { x: 50, y: 1,  w: 48, h: 22 },
    market: { x: 3,  y: 5,  w: 44, h: 18 },
    barn:   { x: 52, y: 25, w: 46, h: 20 },
    farm:   { x: 2,  y: 29, w: 45, h: 20 },
    hay:    { x: 55, y: 49, w: 41, h: 16 },
    fert:   { x: 3,  y: 53, w: 36, h: 15 },
    aqua:   { x: 33, y: 68, w: 36, h: 15 },
    flower: { x: 70, y: 70, w: 28, h: 13 },
}

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
    'Welcome in, dear! Land deeds are on the shelf. New land, new things to grow.',
    'Mmm, smell that? Cinnamon buns, fresh today!',
    'Candles, green wax and string. I have a bit of everything! Hee hee.',
    'Little gold lanterns, two for a coin!',
    'The Growth Guide helps everything grow one size bigger.',
    'The Workshop Manual is for bigger tools, dear.',
];
let shopkeeperLine = 0;

// Marigold knows more than she says: once a clue turns up, she has a word about
// it (once each). Nobody told her the key was silver...
const SHOPKEEPER_HINTS = [
    ['town6', 'Thank you for finding my bell, dear. Ding, dong!'],
    ['aqua3', 'A red-haired Bell Keeper? What a lovely old story. Hee hee.'],
    ['hen3', 'Keep that silver key safe, dear. Keys are important.'],
    ['barn1', 'A note from a friend? How fun! I do love a good mystery.'],
];

function shopkeeperHint() {
    const hint = SHOPKEEPER_HINTS.find(([id]) => restoration.done.includes(id));
    if (!hint || story.hints.includes(hint[0])) return null;
    story.hints.push(hint[0]);
    return hint[1];
}

// --- SCENE HELPERS ---

// A sprite placed on a scene. With onClick it's a button, otherwise decoration.
function makeSpot({ x, y, w, h, z, sprite, alt = '', label, onClick, locked = false, id }) {
    const el = document.createElement(onClick ? 'button' : 'div');
    if (id) el.dataset.id = id;
    el.className = 'spot' + (locked ? ' locked' : '');
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.width = w + '%';
    if (h) { el.style.height = h + '%'; el.classList.add('boxed'); }
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
    tag.innerHTML = iconize(html);
    el.appendChild(tag);
    return tag;
}

// sale: the sales director's trial its ways belong to; an action's `sale` is
// its way (arm), `waitFor` what finishes it ('ad', or a product id).
function showDialog({ art, artRound = false, title, body, actions, sheet = false, kind = '', sale = null }) {
    Sales.closed(); // the popup this one replaces: its ways not taken count as a no
    dialogEl.classList.toggle('sheet', sheet); // a card sliding up from the bottom
    dialogEl.dataset.kind = kind; // for a popup's own layout (the Season Pass's tall track)
    const tut = document.getElementById('tutorial');
    if (tut) tut.hidden = true;
    dialogArt.hidden = !art;
    if (art) dialogArt.src = art;
    dialogArt.classList.toggle('round', artRound);
    dialogTitle.innerHTML = iconize(escapeText(title));
    dialogBody.innerHTML = iconize(body);
    dialogActions.innerHTML = '';
    actions.forEach(action => {
        const btn = document.createElement('button');
        const buy = action.buy ?? /💎/.test(action.label); // orange: spends gems
        btn.className = 'btn' + (action.primary ? ' btn-primary' : '') + (action.wide ? ' btn-wide' : '') + (action.half ? ' btn-half' : '') + (buy ? ' btn-buy' : '');
        if (action.icon) btn.innerHTML = `${action.icon} `;
        btn.insertAdjacentHTML('beforeend', iconize(action.label));
        btn.disabled = !!action.disabled;
        btn.addEventListener('click', () => {
            if (sale && action.sale) Sales.took(sale.id, action.sale, action.waitFor);
            closeDialog();
            if (action.onClick) action.onClick();
        });
        dialogActions.appendChild(btn);
    });
    dialogEl.hidden = false;
    Sales.inDialog(sale);
}

function closeDialog() {
    dialogEl.hidden = true;
    Sales.closed();
    setTimeout(updateTutorial, 0); // the tutorial hand comes back once the dialog is gone
}

dialogEl.addEventListener('click', e => { if (e.target === dialogEl) closeDialog(); });

// --- SOUND, TOUCH AND CONFETTI ---
// Little sounds made on the spot with Web Audio (no files to load) and a short
// buzz on phones, each switchable in ⚙️ Settings. Browsers only let a page make
// sound after a tap, so the first tap starts it.
let audioCtx = null;

function audio() {
    if (!settings.sound) return null;
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    Object.keys(ASSETS.sounds || {}).forEach(name => loadSound(audioCtx, name)); // ready before they're needed
    return audioCtx;
}

// One note: its pitch, when it starts and how long it rings (seconds), its
// sound, how loud, and the pitch it slides to.
function tone(ctx, freq, at, len, type = 'sine', vol = 0.15, to = null) {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + len);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + len + 0.03);
}

// A burst of noise through a low-pass filter (thunder, rain). Returns its volume.
function noise(ctx, at, len, vol, freq, attack = 0.02) {
    const t = ctx.currentTime + at;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + len);
    return gain;
}

const SOUNDS = {
    tap: c => tone(c, 480, 0, 0.09, 'triangle', 0.1, 760),                     // something drops out of a producer
    merge: (c, step = 0) => {                                                   // a merge: higher for bigger items
        const f = 440 * 2 ** (Math.min(step, 14) / 12);
        tone(c, f, 0, 0.12, 'triangle', 0.14);
        tone(c, f * 1.5, 0.07, 0.2, 'sine', 0.12);
    },
    coin: c => { tone(c, 988, 0, 0.07, 'square', 0.05); tone(c, 1319, 0.06, 0.22, 'square', 0.05); },
    pop: c => tone(c, 320, 0, 0.12, 'sine', 0.18, 960),
    knock: c => tone(c, 150, 0, 0.07, 'square', 0.1, 70),                      // the hammer
    sparkle: c => [1047, 1319, 1568, 2093].forEach((f, i) => tone(c, f, i * 0.06, 0.28, 'sine', 0.08)),
    fanfare: c => [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([f, at]) => {
        tone(c, f, at, 0.4, 'triangle', 0.14);
        tone(c, f / 2, at, 0.4, 'sine', 0.07);
    }),
    whoosh: c => tone(c, 220, 0, 0.45, 'sine', 0.05, 1300),                    // a painting turning to the next
    nope: c => tone(c, 220, 0, 0.16, 'sawtooth', 0.05, 150),
    thunder: c => { noise(c, 0, 0.5, 0.35, 1200, 0.01); noise(c, 0.08, 3, 0.7, 160, 0.08); },
};

// Sound files (ASSETS.sounds), decoded once; until one loads, the made sound plays.
const soundFiles = {};

function loadSound(ctx, name) {
    const src = (ASSETS.sounds || {})[name];
    if (!src || soundFiles[name] !== undefined) return;
    soundFiles[name] = null; // loading
    fetch(src).then(r => r.arrayBuffer()).then(data => ctx.decodeAudioData(data))
        .then(buffer => { soundFiles[name] = buffer; }).catch(() => { delete soundFiles[name]; });
}

// How loud each sound plays (1 = as recorded); the ones heard all the time are soft.
const SOUND_VOLUME = { click: 0.35, tap: 0.6, buy: 0.7, merge_mid: 0.5, knock: 0.8 };

// Plays a loaded sound file: louder or softer, higher or lower (rate), a little later.
function playFile(ctx, name, rate = 1, delay = 0) {
    const buffer = soundFiles[name];
    if (!buffer) return false;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    gain.gain.value = SOUND_VOLUME[name] ?? 1;
    src.connect(gain).connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    return true;
}

// A merge sounds like what's merging, a little higher each tier within its
// size; mid-size merges add a sparkle and the big ones a jingle on top.
function mergeSound(ctx, { chain, tier }) {
    const own = `merge_${chain}`;
    loadSound(ctx, own);
    const base = soundFiles[own] ? own : 'merge';
    const band = tier >= 7 ? 7 : tier >= 4 ? 4 : 0;
    if (!playFile(ctx, base, 2 ** ((tier - band) / 12))) SOUNDS.merge(ctx, tier);
    if (band === 4) playFile(ctx, 'merge_mid', 1, 0.05);
    if (band === 7) playFile(ctx, 'merge_big', 1, 0.08);
}

function sfx(name, arg) {
    const ctx = audio();
    if (!ctx) return;
    if (name === 'fanfare' && arg === 'level') name = (ASSETS.sounds || {}).levelup ? 'levelup' : 'fanfare';
    loadSound(ctx, name);
    try {
        if (name === 'merge' && arg && typeof arg === 'object') return mergeSound(ctx, arg);
        if (playFile(ctx, name)) return;
        if (SOUNDS[name]) SOUNDS[name](ctx, arg);
    } catch (e) { /* sound is a nicety */ }
}

// Background music: one quiet loop, started by the first tap (browsers allow
// no sound before one) and paused while the game is in the background.
let musicEl = null;

function syncMusic() {
    if (!ASSETS.music) return;
    const on = settings.music && document.visibilityState !== 'hidden' && audioUnlocked && !SalesAds.playing;
    if (on && !musicEl) {
        musicEl = new Audio(ASSETS.music);
        musicEl.loop = true;
        musicEl.volume = 0.35;
    }
    if (!musicEl) return;
    if (on && musicEl.paused) musicEl.play().catch(() => { /* waits for the next tap */ });
    else if (!on && !musicEl.paused) musicEl.pause();
}

let audioUnlocked = false;
document.addEventListener('pointerdown', () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio();
    syncMusic();
}, true);
document.addEventListener('visibilitychange', syncMusic);
// Every button answers with a soft click.
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button')) sfx('click'); }, true);

function buzz(pattern) {
    if (!settings.vibrate || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* not every phone allows it */ }
}

// A burst of confetti over the whole screen, for the big moments.
function confetti(count = 70) {
    if (FX.app) return fxConfetti(count);
    const layer = document.createElement('div');
    layer.className = 'confetti';
    const colors = ['#ffd34d', '#ff6b6b', '#5cc15a', '#4dabf7', '#f783ac', '#ffa94d', '#9775fa'];
    for (let i = 0; i < count; i++) {
        const bit = document.createElement('i');
        bit.style.cssText = `--x:${Math.random() * 100}%;--c:${colors[i % colors.length]};--d:${1.6 + Math.random() * 1.4}s;`
            + `--delay:${Math.random() * 0.5}s;--spin:${(Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720)}deg;--drift:${(Math.random() - 0.5) * 30}cqw`;
        layer.appendChild(bit);
    }
    stageEl.appendChild(layer);
    setTimeout(() => layer.remove(), 3800);
}

// The big moments: a sound, a buzz and confetti together.
function celebrate(what) {
    sfx('fanfare', what);
    buzz([30, 60, 90]);
    confetti();
}

function toast(message, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = iconize(message); // the game's own words, with item pictures and icons
    toastLayer.appendChild(el);
    while (toastLayer.children.length > 3) toastLayer.firstChild.remove();
    setTimeout(() => el.remove(), 2600);
}

// A "Buy" dialog button that explains the shortfall instead of failing silently.
// A "Buy" dialog button. When 💵 is short, gems cover the rest.
function buyAction(cost, onBuy, label = `Buy for 💵 ${withCommas(cost)}`) {
    const short = cost - res.money;
    if (short <= 0) return { label, primary: true, onClick: onBuy };
    const gems = Math.ceil(short / COINS_PER_GEM);
    return {
        label: res.money > 0 ? `Buy for 💵 ${withCommas(res.money)} + 💎 ${gems}` : `Buy for 💎 ${gems}`,
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
    if (scene === 'map' && currentScene !== 'map') {
        Object.keys(placeShown).forEach(id => delete placeShown[id]); // back on the map: its people wave again
        mapSince = Date.now();
    }
    currentScene = scene;
    document.querySelectorAll('.fix-banner').forEach(el => el.remove());
    closeDialog();
    document.querySelectorAll('.scene').forEach(el => { el.hidden = el.id !== `scene-${scene}`; });
    backBtn.hidden = scene === 'map';
    chargeBtn.hidden = !isBoard(scene);

    if (scene === 'map') { titleEl.textContent = 'Farmstead'; renderMap(); }
    else if (scene === 'town') { titleEl.textContent = TOWN_NAME; renderTown(); }
    else if (scene === 'market') { titleEl.textContent = 'Market'; renderMarket(); }
    else if (scene === 'fix') { titleEl.textContent = AREAS[fixLand].name; renderFix(); }
    else {
        if (selected && selected.mode !== scene) selected = null;
        if (AREAS[scene]) lastBoard = scene;
        titleEl.textContent = boardTitle(scene);
        refreshBoard(scene);
    }
    updateTutorial();
}

backBtn.addEventListener('click', () => goTo('map'));

// --- FARM MAP ---

// The stage picture for a building with done/total jobs, or null without stages.
function stageSprite(key, done, total) {
    const list = (ASSETS.buildingStages || {})[key];
    return list && list.length ? list[Math.round((done / total) * (list.length - 1))] : null;
}

// The map before it was painted: a sprite for each place on the background.
function addMapSprites(scene) {
    const town = makeSpot({ ...MAP_LAYOUT.town, z: 30, id: 'town', // in front of the Barn so its label shows
        sprite: ASSETS.buildings.town, label: TOWN_NAME, onClick: () => goTo('town') });
    const readyCount = npcs.filter(canFulfill).length;
    if (readyCount > 0) addTag(town, 'badge', readyCount);
    // The town looks worn until its own jobs are done; their count shows once they start.
    const townJobs = landTasks('town');
    const townDone = townJobs.filter(taskDone).length;
    const townStage = stageSprite('town', townDone, townJobs.length);
    if (townStage) town.querySelector('img').src = townStage;
    else {
        town.classList.add(townDone === townJobs.length ? 'restored' : 'worn');
        town.style.setProperty('--worn', (1 - townDone / townJobs.length).toFixed(2));
    }
    if (townDone || openTasks().some(t => t.land === 'town')) {
        addTag(town, 'restore-tag', townDone === townJobs.length ? '✨' : `${uiIcon('hammer', '🔨')}${townDone}/${townJobs.length}`);
    }
    scene.appendChild(town);

    const market = makeSpot({ ...MAP_LAYOUT.market, sprite: stageSprite('market', restoration.done.length, TASKS.length) || ASSETS.buildings.market, label: 'Market', onClick: () => goTo('market') });
    if (dealsWaiting()) addTag(market, 'badge', '🎁'); // today's free Piggy Bank
    scene.appendChild(market);

    Object.keys(AREAS).forEach(id => {
        const area = AREAS[id];
        const restored = landRestored(id);
        const spot = makeSpot({
            ...MAP_LAYOUT[id],
            id,
            sprite: stageSprite(id, landTasks(id).filter(taskDone).length, landTasks(id).length)
                || (restored && (ASSETS.buildingsRestored || {})[id]) || ASSETS.buildings[id],
            label: area.name,
            locked: !unlocks[id],
            onClick: () => unlocks[id] ? goFix(id) : offerDeed(id),
        });
        if (!unlocks[id]) {
            addTag(spot, 'sale-sign', quests.level < area.level ? `${uiIcon('lock', '🔒')} Level ${area.level}` : `FOR SALE<br>💵 ${shortNumber(area.cost)}`);
        } else {
            // Orders ready to hand in on this board, and rewards waiting in its crate.
            const ready = npcs.filter(n => n.request && n.request.mode === id && canFulfill(n)).length;
            const parts = [ready && `✓${ready}`, crates[id].length && `🎁${crates[id].length}`].filter(Boolean);
            if (parts.length) addTag(spot, 'badge', parts.join(' '));
            // Restoration: the building looks worn until its jobs are done.
            const list = landTasks(id);
            const done = list.filter(taskDone).length;
            // Lands with stage pictures show their state in the picture; others fade.
            spot.classList.add(restored ? 'restored' : (ASSETS.buildingStages || {})[id] ? 'staged' : 'worn');
            spot.style.setProperty('--worn', (1 - done / list.length).toFixed(2));
            addTag(spot, 'restore-tag', restored ? '✨' : `${uiIcon('hammer', '🔨')}${done}/${list.length}`);
        }
        scene.appendChild(spot);
    });
}

// Where each place is on the painted map, and its icon.
const MAP_LABELS = {
    market: { x: 20, y: 17, icon: '🛍️' }, town:  { x: 76, y: 12, icon: '🏛️' },
    barn:   { x: 80, y: 37, icon: '🐔' }, farm:  { x: 40, y: 52, icon: '🌽' },
    fert:   { x: 16, y: 63, icon: '🍂' }, hay:   { x: 84, y: 58, icon: '🌾' },
    aqua:   { x: 55, y: 75, icon: '🐟' }, flower: { x: 78, y: 90, icon: '🌷' },
};

// The map's painting follows the whole story: storm-wrecked, half mended, then
// bright once two thirds of every job is done.
function mapPicture() {
    const k = Math.min(2, Math.floor((3 * restoration.done.length) / TASKS.length));
    return ASSETS.stages.map[k];
}

// A place's label on a painted page: icon and name, with what's waiting there.
function placeLabel(frame, id, { x, y, icon }, name, onClick) {
    const el = document.createElement('button');
    el.className = 'spot place-label';
    el.dataset.id = id;
    el.style.left = x + '%';
    el.style.top = y + '%';
    // Near an edge the label hangs inwards so it stays on screen.
    el.style.translate = `${x > 62 ? -88 : x < 38 ? -12 : -50}% -50%`;
    el.innerHTML = `<span class="label-icon">${icon}</span><span class="spot-label">${name}</span>`;
    el.addEventListener('click', onClick);
    frame.appendChild(el);
    return el;
}

// The painted map: one picture of the whole farm, a label on each place.
function addMapLabels(scene) {
    const frame = paintedPage(scene, mapPicture());
    const town = placeLabel(frame, 'town', MAP_LABELS.town, TOWN_NAME, () => goTo('town'));
    const readyCount = npcs.filter(canFulfill).length;
    if (readyCount > 0) addTag(town, 'badge', readyCount);
    const townJobs = landTasks('town');
    const townDone = townJobs.filter(taskDone).length;
    if (townDone || openTasks().some(t => t.land === 'town')) {
        addTag(town, 'restore-tag', townDone === townJobs.length ? '✨' : `${uiIcon('hammer', '🔨')}${townDone}/${townJobs.length}`);
    }
    const market = placeLabel(frame, 'market', MAP_LABELS.market, 'Market', () => goTo('market'));
    if (dealsWaiting()) addTag(market, 'badge', '🎁');
    Object.keys(AREAS).forEach(id => {
        const area = AREAS[id];
        const spot = placeLabel(frame, id, MAP_LABELS[id], area.name, () => unlocks[id] ? goFix(id) : offerDeed(id));
        if (!unlocks[id]) {
            spot.classList.add('locked');
            addTag(spot, 'sale-sign', quests.level < area.level ? `${uiIcon('lock', '🔒')} Lv ${area.level}` : `💵 ${shortNumber(area.cost)}`);
            return;
        }
        const ready = npcs.filter(n => n.request && n.request.mode === id && canFulfill(n)).length;
        const parts = [ready && `✓${ready}`, crates[id].length && `🎁${crates[id].length}`].filter(Boolean);
        if (parts.length) addTag(spot, 'badge', parts.join(' '));
        const list = landTasks(id);
        const done = list.filter(taskDone).length;
        if (done === list.length) spot.classList.add('restored');
        addTag(spot, 'restore-tag', done === list.length ? '✨' : `${uiIcon('hammer', '🔨')}${done}/${list.length}`);
    });
}

function renderMap() {
    const scene = document.getElementById('scene-map');
    scene.innerHTML = '';

    renderWorld(scene);

    // The Fair's ribbon: while it's on, and a reminder of the next one.
    if (quests.level >= FAIR_LEVEL) {
        const ribbon = document.createElement('button');
        ribbon.className = 'fair-ribbon' + (fairOpen() ? ' open' : '');
        ribbon.id = 'btn-fair';
        ribbon.innerHTML = iconize(fairOpen()
            ? `${fairTheme().emoji} ${fairTheme().name} <small>${uiIcon('trophy', '🏆')} ${ordinal(fairRank())} · <span data-ready="${fairEndsAt()}">${formatDuration(fairEndsAt() - Date.now())}</span></small>`
            : `🎪 Next Fair <small>in ${formatDuration(dayStart(nextFairDay()) - Date.now())}</small>`);
        ribbon.addEventListener('click', () => (fairOpen() ? goTo('fair') : openFairInfo()));
        scene.appendChild(ribbon);
    }

    // Daily gift and jobs, always one tap away on the map.
    const side = document.createElement('div');
    side.className = 'side-buttons';
    side.innerHTML = iconize(`
        <button class="side-btn" id="btn-gift">${uiIcon('gift', '🎁')}<small>Gift</small>${dailyAvailable() ? '<span class="badge">!</span>' : ''}</button>
        <button class="side-btn" id="btn-pass">${uiIcon('pass', '🎟️')}<small>Pass</small>${passClaimable() ? `<span class="badge">${passClaimable()}</span>` : ''}</button>
        <button class="side-btn" id="btn-daily">${uiIcon('daily', '📅')}<small>Daily</small>${dailyClaimable() > 0 ? '<span class="badge">!</span>' : ''}</button>
        <button class="side-btn" id="btn-jar">${uiIcon('jar', '🫙')}<small>💎${shop.jar}</small>${jarReady() ? '<span class="badge">!</span>' : ''}</button>
        <button class="side-btn" id="btn-settings"><span class="gear">⚙️</span><small>Settings</small></button>
        ${activeOffers().length ? `<button class="side-btn offer-btn" id="btn-offer">${uiIcon('offer', '🔥')}<small data-ready="${shop.offers[activeOffers()[0].id].until}">${formatDuration(shop.offers[activeOffers()[0].id].until - Date.now())}</small>${activeOffers().length > 1 ? `<span class="badge">${activeOffers().length}</span>` : ''}</button>` : ''}`);
    side.querySelector('#btn-gift').addEventListener('click', openDailyGift);
    side.querySelector('#btn-pass').addEventListener('click', openPass);
    side.querySelector('#btn-daily').addEventListener('click', openDailyGoals);
    side.querySelector('#btn-jar').addEventListener('click', openGemJar);
    side.querySelector('#btn-settings').addEventListener('click', openSettings);
    const offerBtn = side.querySelector('#btn-offer');
    if (offerBtn) offerBtn.addEventListener('click', openOffers);
    scene.append(side, boardFab(worldLand), tasksFab('btn-quests'));
}

// ⚙️ Sound and vibration, on or off (saved).
function openSettings() {
    const row = (key, label) => ({ label: `${label}: ${settings[key] ? 'On' : 'Off'}`, wide: true, primary: settings[key],
        onClick: () => { settings[key] = !settings[key]; saveGame(); if (key === 'sound') sfx('coin'); else if (key === 'music') syncMusic(); else buzz(40); openSettings(); } });
    showDialog({
        title: '⚙️ Settings',
        body: '<p class="hint">Music, little sounds as you play, a buzz on phones, and tips that show you around.</p>',
        actions: [row('music', '🎵 Music'), row('sound', '🔊 Sound'), row('vibrate', '📳 Vibration'), row('tips', '💡 Tips'),
            SalesAds.privacyOptions && { label: '🛡️ Ad privacy choices', wide: true, onClick: () => { closeDialog(); SalesAds.showPrivacyOptions(); } },
            { label: 'Done' }].filter(Boolean),
    });
}

function offerDeed(id) {
    markGuide('deed');
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
    sfx('buy');
    unlocks[id] = true;
    if (grids[id].filter(Boolean).length <= 1) grids[id] = clutterBoard(id);
    ensureToolboxes();
    updateUI();
    toast(`The ${area.name} is yours! Find it on the map.`, 'good');
    confetti(60);
    checkTasks();
    goTo(currentScene);
}

// --- TOWNSFOLK SYSTEM ---
// Each NPC lives in a building on the town square. Their ids are from the first cast (the
// saves and the story use them): ruby is Ellis Spokewell, the carpenter; hattie is Bram
// Goodbarrel, the rancher; finn is Mira Quayle, the fisher; poppy is Mae Bloombarrow, the florist.
const npcs = [
    { id: 'mayor',  name: 'Mayor Bramble', pref: ['farm', 'fert'], deliveries: 0, request: null,
      home: 'townhall',   building: { x: 27, y: 2,  w: 46 }, spot: { x: 41, y: 28, w: 18 } },
    { id: 'ruby',  name: 'Ellis',        pref: ['hay'],          deliveries: 0, request: null,
      home: 'carpenter',  building: { x: 1,  y: 21, w: 34 }, spot: { x: 8,  y: 42, w: 17 } },
    { id: 'hattie', name: 'Bram',          pref: ['barn'],         deliveries: 0, request: null,
      home: 'ranch',      building: { x: 65, y: 21, w: 34 }, spot: { x: 75, y: 42, w: 17 } },
    { id: 'finn',  name: 'Mira',         pref: ['aqua'],         deliveries: 0, request: null,
      home: 'fishshop',   building: { x: 1,  y: 58, w: 36 }, spot: { x: 11, y: 79, w: 17 } },
    { id: 'poppy',  name: 'Mae',           pref: ['flower'],       deliveries: 0, request: null,
      home: 'flowershop', building: { x: 63, y: 58, w: 36 }, spot: { x: 72, y: 79, w: 17 } },
];

// Orders grow with you: the smallest ask goes up a tier every two levels, and
// most asks lean towards the biggest you can make (each tier pays double).
function orderTier() {
    const low = Math.min(maxTier, 1 + Math.floor((quests.level - 1) / 2));
    return Math.min(maxTier, low + Math.floor(Math.random() ** 0.7 * (maxTier - low + 1)));
}

function generateRequestFor(npc) {
    let availableModes = npc.pref.filter(m => unlocks[m]);
    if (availableModes.length === 0) {
        availableModes = Object.keys(unlocks).filter(k => unlocks[k]);
    }
    const mode = availableModes[Math.floor(Math.random() * availableModes.length)];
    const targetTier = orderTier();

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
    // A new game's first order is an easy one with a producer part in it: Bram
    // wants an Egg, which the tutorial walks you through.
    if (newGame) {
        const hattie = npcs.find(npc => npc.id === 'hattie');
        Object.assign(hattie.request, { mode: 'barn', tier: 2, rewardMoney: 35, rewardXp: orderXp(2), rewardProducer: true });
    }
}

// Items that can be dragged, merged and handed in (not crates, Double Bubbles
// or anything cobwebbed).
function isFree(item) {
    return !!item && item.type !== 'box' && item.type !== 'bubble' && !item.web;
}

function findItem(mode, tier) {
    return grids[mode].findIndex(item => isFree(item) && !item.type && !item.chain && item.tier === tier);
}

function canFulfill(npc) {
    return !!npc.request && findItem(npc.request.mode, npc.request.tier) !== -1;
}

// The portrait if there is one, otherwise the full-body drawing (framed the same way).
function npcPicture(npc) {
    return ASSETS.portraits[npc.id] || ASSETS.characters[npc.id];
}

// Them from the waist up, for dialogs and story scenes (undefined: none).
function npcBust(npc) {
    return (ASSETS.bust || {})[npc.id];
}

// The square's painting: in fog until it's cleared, rebuilding, then restored.
// `extra`: a job counted as done (the one being fixed right now).
function townPicture(extra) {
    const jobs = landTasks('town');
    const done = jobs.filter(t => taskDone(t) || t.id === extra).length;
    return ASSETS.stages.town[done === jobs.length ? 2 : done > 0 ? 1 : 0];
}

// The painted square: the townsfolk live in the painting, and what each would
// like is a row of order cards across the top (face, name, the item; green
// once you have it). Open jobs are bubbles on their houses.
function addTownLabels(scene) {
    const frame = paintedPage(scene, townPicture());
    addJobChips(landTasks('town'), frame);
    const strip = document.createElement('div');
    strip.className = 'order-strip';
    npcs.forEach(npc => {
        const r = npc.request;
        const card = document.createElement('button');
        card.className = 'spot order-tile' + (r && canFulfill(npc) ? ' ready' : '');
        card.dataset.id = npc.id;
        card.innerHTML = `<span class="order-want">${r ? itemIcon(r.mode, r.tier) : '💤'}</span>
                          <img class="order-face" src="${npcPicture(npc)}" alt="">
                          <span class="order-name">${npc.name.split(' ')[0]}</span>`;
        if (r && r.rewardProducer) addTag(card, 'order-gift', '🎁');
        if (r && canFulfill(npc)) addTag(card, 'order-check', '✓');
        card.addEventListener('click', () => openNpc(npc));
        strip.appendChild(card);
    });
    scene.appendChild(strip);
}

function renderTown() {
    const scene = document.getElementById('scene-town');
    scene.innerHTML = '';
    if ((ASSETS.stages || {}).town) {
        addTownLabels(scene);
        scene.append(boardFab(lastBoard), tasksFab());
        return;
    }
    npcs.forEach(npc => {
        const talk = () => openNpc(npc);
        const job = TASKS.find(t => t.house === npc.home);
        const house = makeSpot({ ...npc.building, sprite: ASSETS.town[npc.home], alt: `${npc.name}'s place`,
            onClick: () => (job && taskOpen(job) ? tapFix(job) : talk()) });
        // After the storm: fog over the square until it's cleared, then each house
        // looks worn until its job rebuilds it.
        if (job && !taskDone(job)) {
            house.classList.add(taskDone(TASKS.find(t => t.id === 'town1')) ? 'worn' : 'foggy');
            house.style.setProperty('--worn', '1');
            if (taskOpen(job)) {
                house.dataset.job = job.id;
                addTag(house, 'task-pin' + (taskReady(job) ? ' ready' : ''), needPins(job));
                if (taskReady(job)) house.classList.add('ready');
            }
        }
        scene.appendChild(house);

        const person = makeSpot({ ...npc.spot, sprite: npcPicture(npc), label: npc.name, onClick: talk });
        person.classList.add('portrait-spot');
        if (npc.request) {
            const bubble = addTag(person, 'bubble', itemIcon(npc.request.mode, npc.request.tier));
            if (canFulfill(npc)) bubble.classList.add('ready');
            if (npc.request.rewardProducer) addTag(bubble, 'gift', '🎁');
        }
        scene.appendChild(person);
    });
    addFixSpots(fixJobs('town'), scene); // the fog, and later the festival
    scene.append(boardFab(lastBoard), tasksFab());
}

// How each townsperson asks for something (`it`: the item's picture and name).
function npcAsk(npc, it) {
    switch (npc.id) {
        case 'mayor': return `My dear farmer! Might you bring me a ${it}? Splendid!`;
        case 'ruby': return `Need a ${it} for my next build. Can you make one, boss?`;
        case 'hattie': return `Howdy, partner! My critters want a ${it}. Bring one by?`;
        case 'finn': return `Ahoy! I'm after a ${it}. Can you reel one in for me?`;
        case 'poppy': return `Oh! A ${it} would make my whole day bloom. Bring one?`;
        default: return `Could you bring me a ${it}?`;
    }
}

function openNpc(npc) {
    markGuide('npc');
    const r = npc.request;
    if (!r) return;
    const level = Math.floor(npc.deliveries / 5) + 1;
    const area = AREAS[r.mode];
    const ready = canFulfill(npc);
    showDialog({
        art: npcBust(npc) || npcPicture(npc),
        artRound: !npcBust(npc),
        title: `${npc.name} · Lv.${level}`,
        body: `<p>“${npcAsk(npc, `${itemIcon(r.mode, r.tier)} <b>${itemName(r.mode, r.tier)}</b>`)}”</p>
               <p><b>Reward:</b> 💵 ${r.rewardMoney} · ⭐ ${r.rewardXp} XP${r.rewardProducer ? ` · 🎁 ${itemLabel(r.mode, { type: 'shop', level: 1 })}` : ''}</p>
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
    const card = document.querySelector(`.scene:not([hidden]) .order-card[data-npc="${npc.id}"]`);
    const from = card ? card.getBoundingClientRect() : null;
    grids[r.mode][itemIndex] = null;
    lastSale = null;
    res.money += r.rewardMoney;
    npc.deliveries++;
    stats.delivered++;
    fillJar(GEM_JAR.perOrder);
    addXp(r.rewardXp);
    const levelUp = npc.deliveries % 5 === 0;
    if (levelUp) res.gems += LEVEL_UP_GEMS;
    updateUI();
    sfx('coin');
    buzz(20);
    thankYou(npc, r, from, levelUp);
    if (r.rewardProducer) {
        crates[r.mode].push({ type: 'shop', level: 1 });
        toast(`🎁 A ${producerName(r.mode, 1)}! Tap 🎁 on your ${AREAS[r.mode].name} board to add it.`, 'good');
    }

    generateRequestFor(npc);
    checkTasks();
    goTo(currentScene); // the town, or the board you delivered from
    cheerPerson(npc.id);
}

// A delivery: the customer pops up over their order to say thanks, and the
// coins and stars fly from it to their counters at the top.
const THANKS = {
    mayor: ['Splendid!', 'Simply splendid!', 'Thank you, my friend!'],
    ruby: ['Boom! Thanks, boss.', 'Perfect fit!', 'Nice work!'],
    hattie: ['Yee-haw! Thanks, partner!', 'My critters love it!', 'You\'re a peach!'],
    finn: ['Fin-tastic!', 'Thanks, friend!', 'That\'s a keeper!'],
    poppy: ['Oh, how lovely!', 'You made my day bloom!', 'Thank you, sunshine!'],
};

function thankYou(npc, r, from, levelUp) {
    const stage = stageEl.getBoundingClientRect();
    const at = from || { left: stage.left + stage.width * 0.3, right: stage.left + stage.width * 0.7, top: stage.top + stage.height * 0.3, bottom: stage.top + stage.height * 0.3 };
    const el = document.createElement('div');
    el.className = 'thanks';
    el.innerHTML = iconize(`<img class="face" src="${npcPicture(npc)}" alt="">
        <span><b>${npc.name}</b><i>${(list => list[Math.floor(Math.random() * list.length)])(THANKS[npc.id] || THANKS.mayor)}</i>
        <small>+💵${r.rewardMoney} &nbsp;+⭐${r.rewardXp}${levelUp ? ` &nbsp;· Lv.${npc.deliveries / 5 + 1}! +💎${LEVEL_UP_GEMS}` : ''}</small></span>`);
    stageEl.appendChild(el);
    const x = Math.min(Math.max((at.left + at.right) / 2 - stage.left, stage.width * 0.3), stage.width * 0.7);
    el.style.left = `${x}px`;
    el.style.top = `${at.bottom - stage.top + 6}px`;
    setTimeout(() => el.remove(), 2400);
    const centre = { x: (at.left + at.right) / 2, y: (at.top + at.bottom) / 2 };
    if (FX.app) {
        fxBurst({ ...centre, size: Math.min(at.right - at.left || 60, 90) }, false, { stars: true });
        fxConfetti(26, centre);
    }
    flyReward('💵', centre, document.getElementById('btn-coins'), 4, 250);
    flyReward('⭐', centre, document.getElementById('btn-level'), 2, 400);
    if (levelUp) flyReward('💎', centre, document.getElementById('btn-gems'), 2, 550);
}

// Little icons flying in an arc from a point on screen to a counter, which bumps as they land.
function flyReward(icon, from, toEl, count = 3, delay = 0, size = '') {
    if (!toEl || !from) return;
    const picture = (ASSETS.ui || {})[EMOJI_ICONS[icon]];
    if (FX.app && picture) return fxFly(picture, from, toEl, count, delay, size === 'big');
    const to = toEl.getBoundingClientRect();
    const ex = to.left + to.width * 0.25, ey = to.top + to.height / 2;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = `fly-reward ${size}`;
        el.innerHTML = iconize(icon);
        document.body.appendChild(el);
        const sx = from.x + (Math.random() - 0.5) * 40, sy = from.y + (Math.random() - 0.5) * 24;
        const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 90, my = Math.min(sy, ey) - 40 - Math.random() * 40;
        const move = el.animate([
            { transform: `translate(${sx}px, ${sy}px) scale(0.4)`, opacity: 0 },
            { transform: `translate(${sx}px, ${sy - 26}px) scale(1.15)`, opacity: 1, offset: 0.22 },
            { transform: `translate(${mx}px, ${my}px) scale(1)`, opacity: 1, offset: 0.6 },
            { transform: `translate(${ex}px, ${ey}px) scale(0.7)`, opacity: 1 },
        ], { duration: 950, delay: delay + i * 110, easing: 'ease-in-out', fill: 'both' });
        move.onfinish = () => {
            el.remove();
            toEl.classList.remove('bump');
            void toEl.offsetWidth;
            toEl.classList.add('bump');
        };
    }
}

// --- MARKET ---

// The painted Market: the shop's painting, and what's for sale as a list of
// tiles over the top of it: the shop's offers, then a deed for each land.
function addMarketLabels(scene) {
    paintedPage(scene, ASSETS.stages.market[0]);
    const strip = document.createElement('div');
    strip.className = 'order-strip shop-strip';
    const tile = (id, icon, name, onClick) => {
        const el = document.createElement('button');
        el.className = 'spot order-tile';
        el.id = `btn-${id}`;
        el.dataset.id = id;
        el.innerHTML = `<span class="order-want">${icon}</span><span class="order-name">${name}</span>`;
        el.addEventListener('click', onClick);
        strip.appendChild(el);
        return el;
    };
    tile('flash', uiIcon('sale', '🏷️'), 'Flash Sale', openFlashSale);
    const deals = tile('deals', uiIcon('gift', '🎁'), 'Daily Deals', openDailyDeals);
    if (dealsWaiting()) addTag(deals, 'badge', '!');
    if (maxTier < NAMES['barn'].length - 1) addTag(tile('guide', '📖', 'Growth Guide', offerUpgrade), 'price-tag', `💵${shortNumber(guideCost())}`);
    if (manualCost()) addTag(tile('manual', `<img src="${ASSETS.props.manual}" alt="📕">`, 'Workshop Manual', offerManual), 'price-tag', `💵${shortNumber(manualCost())}`);
    Object.keys(AREAS).filter(id => !unlocks[id]).forEach(id => {
        const deed = tile(`deed-${id}`, MAP_LABELS[id].icon, AREAS[id].name, () => offerDeed(id));
        deed.dataset.id = id;
        deed.classList.add('deed');
        addTag(deed, 'price-tag', quests.level < AREAS[id].level ? `🔒Lv${AREAS[id].level}` : `💵${AREAS[id].cost}`);
    });
    scene.appendChild(strip);
}

function renderMarket() {
    const scene = document.getElementById('scene-market');
    scene.innerHTML = '';
    if ((ASSETS.stages || {}).market) return addMarketLabels(scene);

    // One land deed per locked area sits on the shelves.
    Object.keys(AREAS).filter(id => !unlocks[id]).forEach((id, i) => {
        const deed = makeSpot({ ...MARKET_LAYOUT.shelf[i], sprite: ASSETS.props.deed, label: AREAS[id].name, onClick: () => offerDeed(id) });
        addTag(deed, 'price-tag', quests.level < AREAS[id].level ? `${uiIcon('lock', '🔒')}Lv${AREAS[id].level}` : `💵${AREAS[id].cost}`);
        scene.appendChild(deed);
    });

    scene.appendChild(makeSpot({ ...MARKET_LAYOUT.shopkeeper, sprite: ASSETS.characters.shopkeeper, label: 'Shopkeeper', onClick: () => {
        toast(shopkeeperHint() || SHOPKEEPER_LINES[shopkeeperLine++ % SHOPKEEPER_LINES.length]);
    } }));
    scene.appendChild(makeSpot({ ...MARKET_LAYOUT.counter, sprite: ASSETS.props.counter, z: 80 }));

    if (maxTier < NAMES['barn'].length - 1) {
        const guide = makeSpot({ ...MARKET_LAYOUT.upgrade, z: 90, sprite: ASSETS.props.upgrade, label: 'Growth Guide', onClick: offerUpgrade });
        addTag(guide, 'price-tag', `💵${shortNumber(guideCost())}`);
        scene.appendChild(guide);
    }

    // Flash Sale and Daily Deals, as in Merge Mansion's shop.
    const side = document.createElement('div');
    side.className = 'side-buttons';
    side.innerHTML = iconize(`
        <button class="side-btn" id="btn-flash">${uiIcon('sale', '🏷️')}<small>Flash Sale</small></button>
        <button class="side-btn" id="btn-deals">${uiIcon('gift', '🎁')}<small>Daily Deals</small>${dealsWaiting() ? '<span class="badge">!</span>' : ''}</button>`);
    side.querySelector('#btn-flash').addEventListener('click', openFlashSale);
    side.querySelector('#btn-deals').addEventListener('click', openDailyDeals);
    scene.appendChild(side);
}

// --- FIRST-PLAY TUTORIAL ---
// The first few minutes, one step at a time, impossible to miss: the screen
// dims around the one thing to tap, a hand flies there from the middle and
// shows how (tap it, tap it ×2, drag this onto that), and someone says why in
// a full sentence. Now and then the game pauses to explain something new
// (the jobs, the board, cobwebs and boxes) until you tap "Got it". Taps
// anywhere else do nothing while a step is up, so no one gets lost.
// `scene`: where the step happens; elsewhere the hand points the way there.

// The first Barn board has an Egg under cobwebs here, between two boxes: the
// tutorial's "merge onto it" step frees it and pops the boxes.
const TUTORIAL_WEB = 13;

const TUTORIAL = [
    { id: 'job', scene: 'map', who: 'mayor', explain: true,
      text: 'The storm hit the Barnyard the most, so we start here. Each job needs something. This one: open 1 box on the merge board.',
      target: () => jobSpot(), done: () => currentScene === 'barn' || stats.merges > 0 },
    { id: 'merge', scene: 'map', who: 'mayor', text: 'Things are made on the merge board. Tap Merge to go there!',
      target: () => document.querySelector('#scene-map .fix-merge'), done: () => currentScene === 'barn' || stats.merges > 0 },
    { id: 'board', scene: 'barn', who: 'mayor', explain: true,
      text: 'This is the merge board! The Feed Bin makes Feed. Each tap uses ⚡1 energy.',
      target: () => cellItem('barn', feedBin()), done: () => statNow('taps') >= 2 || stats.merges > 0 },
    { id: 'tap', scene: 'barn', who: 'mayor', taps: () => 2 - statNow('taps'),
      text: n => (n > 1 ? `Tap the Feed Bin ${n} times!` : 'Once more! Tap the Feed Bin!'),
      target: () => cellItem('barn', feedBin()), done: () => statNow('taps') >= 2 || stats.merges > 0 },
    { id: 'pair', scene: 'barn', who: 'mayor', drag: true, text: 'Two of the same make something better! Drag one Feed onto the other.',
      target: () => feedPair().map(i => cellItem('barn', i)), done: () => stats.merges >= 1,
      // Not two Feed to merge (a lucky part dropped instead): make another first.
      fallback: { text: 'Tap the Feed Bin again!', target: () => cellItem('barn', feedBin()) } },
    { id: 'egg', scene: 'barn', who: 'hattie', explain: true,
      text: 'You made an Egg! Two that match always make the next thing: Feed → Egg → Chick → Chicken…',
      target: () => cellItem('barn', freeEgg()), done: () => webFreed() },
    { id: 'web', scene: 'barn', who: 'hattie', explain: true,
      text: 'See the Egg in cobwebs? It is stuck. Drop a matching Egg on it to set it free. Then the boxes next to it pop open!',
      target: () => webbedEgg() >= 0 && [cellItem('barn', webbedEgg()), ...getNeighbors(webbedEgg()).filter(i => grids.barn[i] && grids.barn[i].type === 'box').map(i => cellItem('barn', i))],
      done: () => webFreed() },
    { id: 'free', scene: 'barn', who: 'hattie', drag: true, text: 'Drag your Egg onto the cobwebbed Egg!',
      target: () => (freeEgg() >= 0 && webbedEgg() >= 0 ? [cellItem('barn', freeEgg()), cellItem('barn', webbedEgg())] : []),
      done: () => webFreed(),
      // No Egg of your own (it went into an order): two Feed make one.
      fallback: () => (feedPair().length ? { text: 'Make an Egg first: drag one Feed onto the other!', drag: true, target: () => feedPair().map(i => cellItem('barn', i)) }
          : { text: 'Tap the Feed Bin to make Feed!', target: () => cellItem('barn', feedBin()) }) },
    { id: 'deliver', scene: 'barn', who: 'hattie', text: 'A Chick, just what I wanted! Tap Deliver to give it to me.',
      target: () => document.querySelector('#scene-barn .order-card.ready[data-npc="hattie"]') || document.querySelector('#scene-barn .order-card.ready:not(.task-card)'),
      done: () => stats.delivered >= 1,
      fallback: () => ({ text: 'Orders want items from the board. Tap Deliver when one is ready!',
          target: () => document.querySelector('#scene-barn .order-card:not(.task-card):not(.other)') }) },
    // The first fix, in the Barnyard itself.
    { id: 'fix', scene: 'map', who: 'mayor', text: 'You opened a box, so the planks can go! Tap the job to fix it.',
      target: () => jobSpot(), done: () => stats.jobs >= 1 },
    // Off you go: the next job, and how to see what any job needs.
    { id: 'onward', scene: 'map', who: 'mayor', explain: true,
      text: 'That\'s how it\'s done! These are your next jobs. Tap one to see what it needs. Then make it on the merge board. Drag to look around!',
      target: () => [...document.querySelectorAll('#scene-map .task-pin')], done: () => stats.jobs >= 2 },
];
const tutorial = { step: 0, done: false, explained: [] };

// The Barnyard's open job: its spot and its card.
function jobSpot() {
    return [document.querySelector('#scene-map .fix-spot.open'), document.querySelector('#scene-map .task-pin')];
}

function cellItem(mode, index) {
    return index >= 0 ? document.querySelector(`#grid-${mode} .grid-cell[data-index="${index}"] .item`) : null;
}

function feedBin() {
    return grids.barn.findIndex(c => isWorkingProducer(c) && isFree(c));
}

// Two free Feed on the Barn board, for the "merge" step: dragged towards the
// top of the board, away from the boxes (they're for a later step).
function feedPair() {
    const feed = grids.barn.map((c, i) => (isFree(c) && !c.type && c.tier === 0 ? i : -1)).filter(i => i >= 0);
    return feed.length >= 2 ? [feed[1], feed[0]] : [];
}

function freeEgg() {
    return grids.barn.findIndex(c => isFree(c) && !c.type && !c.chain && c.tier === 1);
}

function webbedEgg() {
    const c = grids.barn[TUTORIAL_WEB];
    return c && c.web && !c.type && !c.chain ? TUTORIAL_WEB : -1;
}

// The tutorial's cobwebbed Egg is free (or gone some other way).
function webFreed() {
    const c = grids.barn[TUTORIAL_WEB];
    return !(c && c.web) && stats.boxes >= 1;
}

const tutorialEl = document.createElement('div');
tutorialEl.id = 'tutorial';
tutorialEl.innerHTML = `<svg class="tut-dim"><defs><mask id="tut-holes"><rect width="100%" height="100%" fill="#fff"/><g></g></mask></defs>
        <rect width="100%" height="100%" mask="url(#tut-holes)"/></svg><div class="tut-rings"></div>
    <div class="tut-bubble"><img class="face" alt=""><div class="tut-say"><b class="tut-who"></b><span class="tut-text"></span></div>
        <button class="tut-next">Got it!</button><button class="tut-skip">Skip</button></div>
    <div class="tut-hand"><i class="tut-ripple"></i>${ASSETS.ui.hand ? `<img src="${ASSETS.ui.hand}" alt="">` : '<span>👆</span>'}<b class="tut-count"></b></div>`;
tutorialEl.hidden = true;
tutorialEl.querySelector('.tut-skip').addEventListener('click', () => (tutorial.done ? finishGuide() : endTutorial()));
tutorialEl.querySelector('.tut-next').addEventListener('click', () => {
    const step = TUTORIAL[tutorial.step];
    if (step && !tutorial.done) tutorial.explained.push(step.id);
    sfx('pop');
    updateTutorial();
});

function endTutorial(finished = false) {
    tutorial.done = true;
    tutorialEl.hidden = true;
    giftAfterTutorial = true;
    // The tool producers wait until now, so the first board is simple.
    ensureToolboxes();
    Object.keys(grids).forEach(mode => refreshBoard(mode));
    if (finished) toast('All set! 🎉', 'good');
}

// Moves the tutorial on and points at the current step's target.
function updateTutorial() {
    if (tutorial.done) return updateGuides();
    if (fixing || openingOn) { hidePointer(); return; }
    // A step is over once it's done, or (an explanation) once read.
    const over = step => step.done() || (step.explain && tutorial.explained.includes(step.id));
    while (tutorial.step < TUTORIAL.length && over(TUTORIAL[tutorial.step])) tutorial.step++;
    if (tutorial.step >= TUTORIAL.length) return endTutorial(true);
    const step = TUTORIAL[tutorial.step];
    // Not where the step happens: point the way there.
    let target;
    let text = step.text;
    let drag = step.drag;
    let explain = step.explain;
    if (currentScene !== step.scene) {
        explain = drag = false;
        if (step.scene === 'map' && currentScene === 'barn') {
            // Back from the board to the Barnyard: its job card leads there.
            target = document.querySelector('#scene-barn .task-card') || backBtn;
            text = 'Now tap the job to go back to the Barnyard!';
        } else if (step.scene === 'barn' && currentScene === 'map') {
            target = document.querySelector('#scene-map .fix-merge');
            text = 'Tap Merge to go to the merge board!';
        } else if (step.scene === 'map') {
            target = backBtn;
            text = 'Back to the farm!';
        } else {
            target = backBtn;
            text = 'Back to the map!';
        }
    } else {
        target = step.target();
        const none = !target || (Array.isArray(target) && target.filter(Boolean).length < (drag ? 2 : 1));
        // Nothing left to explain about (it's gone some other way): move on.
        if (none && explain && !step.fallback) {
            tutorial.explained.push(step.id);
            return updateTutorial();
        }
        if (none && step.fallback) {
            const fb = typeof step.fallback === 'function' ? step.fallback() : step.fallback;
            target = fb.target();
            text = fb.text;
            drag = !!fb.drag;
            explain = false;
        }
    }
    const taps = !explain && !drag && step.taps && currentScene === step.scene ? step.taps() : 0;
    if (typeof text === 'function') text = text(taps);
    showPointer(target, step.who, text, 'Skip', { drag: !!drag, explain, taps, block: true });
}

// What the tutorial lets you tap right now (anything, when it's not up).
let pointerAllows = null;

function hidePointer() {
    tutorialEl.hidden = true;
    pointerAllows = null;
}

// While a tutorial step is up, taps only reach what it points at (and its own
// buttons); an explanation waits for "Got it".
['pointerdown', 'click'].forEach(type => document.addEventListener(type, e => {
    if (!pointerAllows || tutorialEl.hidden || tutorial.done) return;
    if (e.target.closest && e.target.closest('#tutorial button')) return;
    if (pointerAllows.some(el => el && el.contains(e.target))) return;
    e.preventDefault();
    e.stopPropagation();
    if (type === 'pointerdown') nudgePointer();
}, true));

// A tap somewhere else: the hand and the bubble wiggle to say "here!".
function nudgePointer() {
    tutorialEl.classList.remove('nudge');
    void tutorialEl.offsetWidth;
    tutorialEl.classList.add('nudge');
}

let pointerKey = '';

// The hand on what to tap (a pair: drag from one to the other) and who says why.
// opts: drag (a pair to drag), explain (a pause with "Got it"), taps (how many
// taps to show on the hand), block (taps elsewhere do nothing; dims the rest).
function showPointer(target, who, text, closeLabel, opts = {}) {
    const targets = (Array.isArray(target) ? target : [target]).filter(Boolean);
    const drag = opts.drag ?? targets.length > 1; // guides: a pair means drag one onto the other
    tutorialEl.hidden = !dialogEl.hidden || !targets.length || openingOn;
    if (tutorialEl.hidden) { pointerAllows = null; return; }
    const npc = npcs.find(n => n.id === (who || 'mayor'));
    tutorialEl.querySelector('.face').src = npcPicture(npc);
    tutorialEl.querySelector('.tut-who').textContent = npc.name;
    tutorialEl.querySelector('.tut-skip').textContent = closeLabel;
    tutorialEl.querySelector('.tut-text').textContent = text;
    tutorialEl.classList.toggle('explain', !!opts.explain);
    tutorialEl.classList.toggle('blocking', !!opts.block);
    pointerAllows = opts.block ? (opts.explain ? [] : drag ? targets.slice(0, 1) : targets) : null;

    // Positions are taken over the whole layer (the top bar and the stage).
    const view = stageEl.getBoundingClientRect(), stage = tutorialEl.getBoundingClientRect();
    const rect = el => el.getBoundingClientRect();
    const centre = el => { const r = rect(el); return { x: r.left + r.width / 2 - stage.left, y: r.top + r.height / 2 - stage.top }; };
    // Something to tap that's scrolled out of view comes into view (the top bar is always in view).
    const r0 = rect(targets[0]);
    // On the map it comes to the middle, clear of the banners along the top.
    const onMap = !!targets[0].closest('.world-view');
    const margin = onMap ? view.height * 0.18 : 0;
    if (!targets[0].closest('.hud') && (r0.top < view.top + margin || r0.bottom > view.bottom - margin || r0.left < view.left || r0.right > view.right)) {
        // (on the map at once, so the hand below aims at where it ends up, not where it was)
        targets[0].scrollIntoView({ block: onMap ? 'center' : 'nearest', inline: 'center', behavior: onMap ? 'auto' : 'smooth' });
    }

    // The spotlight: the screen dims, with a glowing window over each thing
    // the step is about.
    const pad = stage.width * 0.015;
    const holes = targets.map(rect).map(r => ({ x: r.left - stage.left - pad, y: r.top - stage.top - pad, w: r.width + 2 * pad, h: r.height + 2 * pad }));
    const radius = stage.width * 0.03;
    tutorialEl.querySelector('#tut-holes g').innerHTML = holes.map(h =>
        `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="${radius}" fill="#000"/>`).join('');
    tutorialEl.querySelector('.tut-rings').innerHTML = holes.map(h =>
        `<i style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px"></i>`).join('');
    const box = { top: Math.min(...holes.map(h => h.y)), bottom: Math.max(...holes.map(h => h.y + h.h)) };

    // The hand: on the thing to tap, or dragging from the first to the second.
    // An explanation has no hand. Each new step, it flies in from the middle.
    const hand = tutorialEl.querySelector('.tut-hand');
    const from = centre(targets[0]);
    const to = drag && targets[1] ? centre(targets[1]) : from;
    hand.hidden = !!opts.explain;
    hand.classList.toggle('dragging', drag && targets.length > 1);
    hand.style.setProperty('--dx', `${to.x - from.x}px`);
    hand.style.setProperty('--dy', `${to.y - from.y}px`);
    const count = tutorialEl.querySelector('.tut-count');
    count.textContent = opts.taps > 1 ? `×${opts.taps}` : '';
    count.hidden = !(opts.taps > 1);
    const key = `${text}|${targets.length}|${opts.explain ? 1 : 0}`;
    if (key !== pointerKey && !opts.explain) {
        hand.classList.add('flying');
        hand.style.left = `${stage.width / 2}px`;
        hand.style.top = `${stage.height / 2}px`;
        void hand.offsetWidth;
        clearTimeout(hand.landing);
        hand.landing = setTimeout(() => hand.classList.remove('flying'), 800);
    }
    pointerKey = key;
    hand.style.left = `${from.x}px`;
    hand.style.top = `${from.y}px`;
    // Keep the bubble out of the way of what it points at.
    tutorialEl.classList.toggle('bubble-top', (box.top + box.bottom) / 2 > stage.height / 2);
}

// --- GUIDES ---
// After the first-play tutorial, every feature gets its own short guide the
// first time it matters: someone says what it's for and the hand leads you
// there step by step (back to the map, into the Market, onto the thing). Each
// plays once, ends by itself as soon as you do it, never shows over a dialog,
// waits a while after the last one, and ✕ puts it away for good. Tips can be
// switched off in ⚙️ Settings.
const guides = { done: [], marks: [], snoozed: {} };
// A guide stays up this long; if it isn't followed by then it steps aside for a
// few minutes, and after a second time it's put away for good.
const GUIDE_SHOW_MS = 12000;
const GUIDE_SNOOZE_MS = 4 * 60000;
const GUIDE_REST_MS = 60000; // at least a minute of play between two guides
let guide = null;          // the guide on screen: { def, step, start }
let guideRestUntil = 0;    // a pause between guides, so they never pile up

// Things the player has done that guides wait for (opened the Flash Sale...).
function markGuide(what) {
    if (!guides.marks.includes(what)) guides.marks.push(what);
}

function marked(what) {
    return guides.marks.includes(what);
}

const q = sel => document.querySelector(sel);
const onBoard = () => (AREAS[currentScene] ? currentScene : null);
// The first cell on the board you're on that matches, or -1.
function boardCell(test) {
    const mode = onBoard();
    return mode ? grids[mode].findIndex(c => c && test(c)) : -1;
}

// Two free things that merge, for a "drag one onto the other" guide.
function mergePair(test) {
    const mode = onBoard();
    if (!mode) return [];
    const cells = grids[mode].map((c, i) => (c && test(c) ? i : -1)).filter(i => i >= 0);
    for (const a of cells) for (const b of cells) {
        if (a !== b && JSON.stringify({ ...grids[mode][a], web: 0 }) === JSON.stringify({ ...grids[mode][b], web: 0 })) return [a, b];
    }
    return [];
}

// A free item and a cobwebbed one just like it, on the board you're on: [free, cobwebbed].
// (Two cobwebbed items can't merge, so they never count.)
function webPair() {
    const mode = onBoard();
    if (!mode) return [];
    const g = grids[mode];
    const same = (a, b) => JSON.stringify({ ...a, web: 0 }) === JSON.stringify({ ...b, web: 0 });
    for (let a = 0; a < g.length; a++) {
        if (!g[a] || g[a].type || !isFree(g[a])) continue;
        const b = g.findIndex((c, i) => i !== a && c && c.web && !c.type && same(c, g[a]));
        if (b >= 0) return [a, b];
    }
    return [];
}

// --- IDLE HINT ---
// A few seconds without a tap on a board: two things that merge there beat
// softly, like a heartbeat, until you touch the screen. The same rules as a
// real merge, so it never suggests what can't be done: the one you'd drag is
// always free, and two cobwebbed items are never a pair.
const IDLE_HINT_MS = 6000;
let lastActivity = Date.now();
let idlePair = [];

document.addEventListener('pointerdown', () => {
    lastActivity = Date.now();
    clearIdleHint();
}, true);

// Would dragging `s` onto `t` merge them?
function wouldMerge(mode, s, t) {
    if (!isFree(s) || !t || t.type === 'box' || t.type === 'bubble' || (!isFree(t) && !t.web)) return false;
    const top = levelMergeTop(s);
    if (top) return sameLevelKind(s, t) && levelMergeTop(t) > 0 && levelOf(s) < top;
    const chain = chainOf(mode, s);
    return !s.type && !t.type && t.tier === s.tier && chainOf(mode, t) === chain && s.tier < tierCap(chain);
}

// [drag this, onto this]: two free things first, else a free one onto its cobwebbed twin.
function mergeHint(mode) {
    const g = grids[mode];
    for (const webbed of [false, true]) {
        for (let a = 0; a < g.length; a++) {
            if (!isFree(g[a])) continue;
            const b = g.findIndex((c, i) => i !== a && !!c && !!c.web === webbed && wouldMerge(mode, g[a], c));
            if (b >= 0) return [a, b];
        }
    }
    return [];
}

function clearIdleHint() {
    document.querySelectorAll('.item.hint-beat').forEach(el => el.classList.remove('hint-beat'));
    idlePair = [];
}

// Every second: show (or keep showing) the hint once you've been idle a while.
function idleHint() {
    const mode = currentScene;
    const quiet = (AREAS[mode] || mode === 'fair') && tutorial.done && dialogEl.hidden && tutorialEl.hidden && !draggedItemInfo
        && settings.tips !== false && Date.now() - lastActivity >= IDLE_HINT_MS;
    if (!quiet) { if (idlePair.length) clearIdleHint(); return; }
    if (!idlePair.length || !wouldMerge(mode, grids[mode][idlePair[0]], grids[mode][idlePair[1]])) idlePair = mergeHint(mode);
    idlePair.forEach(i => { const el = cellItem(mode, i); if (el) el.classList.add('hint-beat'); }); // again after a redraw
}

function firstLandForSale() {
    return Object.keys(AREAS).find(id => !unlocks[id] && quests.level >= AREAS[id].level);
}

// The way to a place from wherever you are: a hand on the next button to tap.
function wayTo(where) {
    if (where === currentScene) return null;
    if (AREAS[where] && currentScene === 'fix' && fixLand === where) return { target: q('#scene-fix .fix-merge'), text: 'Tap Merge!' };
    if (where === 'fix' && AREAS[currentScene]) return { target: q(`#scene-${currentScene} .place-btn`), text: 'Tap 🔨 to visit the land!' };
    if (where === 'map' || currentScene !== 'map') return { target: backBtn, text: 'Back to the map first!' };
    const id = where === 'fix' ? lastBoard : where;
    const name = id === 'market' ? 'the Market' : id === 'town' ? TOWN_NAME : `the ${AREAS[id].name}`;
    return { target: q(`#scene-map .spot[data-id="${id}"]`), text: `Tap ${name}!` };
}

const GUIDES = [
    // Shopping: the first land to buy, all the way to its deed.
    { id: 'deed', when: () => firstLandForSale() && Object.values(unlocks).filter(Boolean).length === 1,
      steps: [{ scene: 'market', who: 'mayor', lead: () => `The ${AREAS[firstLandForSale() || 'farm'].name} is for sale!`, text: () => `New land! Buy the ${AREAS[firstLandForSale() || 'farm'].name} deed here.`,
                target: () => q(`#scene-market .order-tile.deed[data-id="${firstLandForSale()}"]`), done: () => marked('deed') || !firstLandForSale() }] },
    // Bigger animals: merges stop at the size cap until the Growth Guide.
    { id: 'growth', when: () => maxTier < NAMES.barn.length - 1 && quests.level >= 2
          && Object.keys(AREAS).some(m => unlocks[m] && grids[m].filter(c => isFree(c) && !c.type && !c.chain && c.tier === maxTier).length >= 2),
      steps: [{ scene: 'market', who: 'hattie', lead: 'Want bigger animals?', text: 'Want bigger animals? The Growth Guide lets merges go one size up!',
                target: () => q('#scene-market #btn-guide'), done: () => marked('upgrade') }] },
    // Bigger tools: a job needs tools past the Workshop Manual's tier.
    { id: 'manual', when: () => manualCost() && openTasks().some(t => t.needs.some(n => n.item && TOOLS[n.item] && n.tier > toolTier)),
      steps: [{ scene: 'market', who: 'ruby', lead: 'Jobs need bigger tools!', text: 'Jobs need bigger tools! The Workshop Manual lets them merge one step further.',
                target: () => q('#scene-market #btn-manual'), done: () => marked('manual') }] },
    // Levelling up: XP stars on the board.
    { id: 'xp', when: () => boardCell(c => c.type === 'xp') >= 0,
      steps: [{ scene: () => onBoard(), who: 'mayor', text: 'Tap the ⭐ to collect XP. Levels open new land!',
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'xp')), done: () => boardCell(c => c.type === 'xp') < 0 }] },
    { id: 'currency', when: () => boardCell(c => c.type === 'coin' || c.type === 'gem' || c.type === 'energy') >= 0,
      steps: [{ scene: () => onBoard(), who: 'hattie', text: 'Coins, gems and ⚡ on the board: tap to collect them!',
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'coin' || c.type === 'gem' || c.type === 'energy')),
                done: () => boardCell(c => c.type === 'coin' || c.type === 'gem' || c.type === 'energy') < 0 || stats.collected > (guide?.start.collected ?? 0) }] },
    { id: 'parts', when: () => mergePair(c => isFree(c) && c.type === 'shop' && levelOf(c) < FIRST_WORKING_LEVEL).length === 2,
      steps: [{ scene: () => onBoard(), who: 'ruby', text: 'Two parts make a bigger one. Drag one onto the other!', drag: true,
                target: () => mergePair(c => isFree(c) && c.type === 'shop' && levelOf(c) < FIRST_WORKING_LEVEL).map(i => cellItem(onBoard(), i)),
                done: () => stats.upgrades > (guide?.start.upgrades ?? 0) }] },
    { id: 'cobweb', when: () => webPair().length === 2,
      steps: [{ scene: () => onBoard(), who: 'hattie', text: 'Merge a matching item into a cobwebbed one to free it!', drag: true,
                target: () => webPair().map(i => cellItem(onBoard(), i)),
                done: () => stats.webs > (guide?.start.webs ?? 0) }] },
    { id: 'bubble', when: () => boardCell(c => c.type === 'bubble' && !c.ad) >= 0,
      steps: [{ scene: () => onBoard(), who: 'poppy', text: 'A Double Bubble! Pop it with 💎 for a free copy, or let it float away.',
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'bubble' && !c.ad)),
                done: () => boardCell(c => c.type === 'bubble' && !c.ad) < 0 || (selected && grids[selected.mode][selected.index]?.type === 'bubble') }] },
    { id: 'chest', when: () => boardCell(c => c.type === 'chest' || c.type === 'piggy') >= 0,
      steps: [{ scene: () => onBoard(), who: 'finn',
                text: () => (boardCell(c => c.type === 'chest') >= 0 ? 'A chest! Tap it to see what\'s inside.' : 'A Piggy Bank! Tap it to shake out coins.'),
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'chest') >= 0 ? boardCell(c => c.type === 'chest') : boardCell(c => c.type === 'piggy')),
                done: () => marked('chest') || (selected && ['chest', 'piggy'].includes(grids[selected.mode][selected.index]?.type)) }] },
    { id: 'booster', when: () => boardCell(c => BOOSTERS[c.type]) >= 0,
      steps: [{ scene: () => onBoard(), who: 'ruby', text: 'A booster! Tap it to see what it does.',
                target: () => cellItem(onBoard(), boardCell(c => BOOSTERS[c.type])),
                done: () => boardCell(c => BOOSTERS[c.type]) < 0 || (selected && BOOSTERS[grids[selected.mode][selected.index]?.type]) }] },
    // Tools for jobs: the land's tool producer.
    { id: 'toolbox', when: () => onBoard() && boardCell(c => c.type === 'toolbox' && c.drops > 0) >= 0
          && openTasks().some(t => t.needs.some(n => n.item && TOOLS[n.item])),
      steps: [{ scene: () => onBoard(), who: 'ruby', text: () => { const box = grids[onBoard()]?.[boardCell(c => c.type === 'toolbox' && c.drops > 0)]; return box ? `Jobs need ${TOOLS[box.chain].what}. Tap the ${TOOLS[box.chain].name} to make them!` : 'Tap it to make things for jobs!'; },
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'toolbox' && c.drops > 0)), done: () => marked('toolbox') }] },
    // A full board: the backpack.
    { id: 'inventory', when: () => onBoard() && !grids[onBoard()].includes(null), // (boardFull() would also toast)
      steps: [{ scene: () => onBoard(), who: 'hattie', text: 'Board full? Drag things into your 🎒 for later, or tap one and Sell it.',
                target: () => q(`#scene-${onBoard()} .inv-btn`), done: () => inventory.items.length > 0 || !onBoard() || grids[onBoard()].includes(null) }] },
    // The town's orders.
    { id: 'town', when: () => quests.level >= 2 && currentScene !== 'town',
      steps: [{ scene: 'town', who: 'mayor', lead: 'Townsfolk need your help!', text: 'Townsfolk post orders here. Tap someone\'s card to see what they need!',
                target: () => q('#scene-town .order-tile'), done: () => marked('npc') }] },
    // Areas inside a land.
    { id: 'tabs', when: () => currentScene === 'fix' && landZones(fixLand).filter(zoneOpen).length >= 2,
      steps: [{ scene: 'fix', who: 'ruby', text: 'Each land has areas. Tap a tab to jump between them.',
                target: () => q('#scene-fix .zone-tabs button:not(.on)'), done: () => marked('tabs') }] },
    // Things waiting on the map.
    { id: 'daily', when: () => dailyClaimable() > 0,
      steps: [{ scene: 'map', who: 'mayor', lead: 'Daily goals done!', text: 'Today\'s goals are done: claim your chest!', target: () => q('#btn-daily'), done: () => marked('daily') }] },
    { id: 'pass', when: () => passClaimable() > 0,
      steps: [{ scene: 'map', who: 'poppy', lead: 'Pass rewards are waiting!', text: 'The Season Pass has rewards waiting for you!', target: () => q('#btn-pass'), done: () => marked('pass') }] },
    { id: 'jar', when: () => jarReady(),
      steps: [{ scene: 'map', who: 'finn', lead: 'Your Gem Jar is full!', text: 'Your Gem Jar is full of gems. Take a look!', target: () => q('#btn-jar'), done: () => marked('jar') }] },
    { id: 'flash', when: () => quests.level >= 3,
      steps: [{ scene: 'market', who: 'poppy', lead: 'New offers at the Market!', text: 'The Flash Sale has new offers every 6 hours!', target: () => q('#scene-market #btn-flash'), done: () => marked('flash') }] },
    { id: 'fair', when: () => fairOpen(),
      steps: [{ scene: 'map', who: 'hattie', lead: 'The Fair is on!', text: 'The Country Fair is on! Win prizes this weekend.', target: () => q('#btn-fair'), done: () => currentScene === 'fair' }] },
    { id: 'energy', when: () => res.energy < 10 && !unlimitedActive(),
      steps: [{ scene: () => currentScene, who: 'mayor', text: '⚡ is low. It refills by itself, or tap ⚡ up here for more.',
                target: () => q('#btn-energy'), done: () => marked('energy') || res.energy >= 20 }] },
];

// Which guide (if any) runs now, and where its hand points.
function updateGuides() {
    if (layoutMode) return;
    if (settings.tips === false || fixing || document.body.classList.contains('busy')) { tutorialEl.hidden = true; return; }
    if (guide) {
        const step = guide.def.steps[guide.step];
        if (step.done()) {
            guide.step++;
            guide.shown = 0; // each step gets its own time
            if (guide.step >= guide.def.steps.length) return finishGuide();
        } else if (guide.shown >= GUIDE_SHOW_MS) {
            return snoozeGuide();
        }
    } else if (dialogEl.hidden && Date.now() >= guideRestUntil) {
        const def = GUIDES.find(g => !guides.done.includes(g.id) && g.when() && (!isBoard(currentScene) || !wayTo(guideScene(g.steps[0]))));
        if (def) guide = { def, step: 0, shown: 0, start: { collected: stats.collected, upgrades: stats.upgrades, webs: stats.webs } };
    }
    if (!guide) { tutorialEl.hidden = true; return; }
    const step = guide.def.steps[guide.step];
    const scene = guideScene(step);
    const way = scene ? wayTo(scene) : null;
    // Never "back to the map first!" while merging: it waits until you're there.
    if (way && isBoard(currentScene)) { tutorialEl.hidden = true; guide.seenAt = 0; return; }
    const target = way ? way.target : step.target();
    const val = v => (typeof v === 'function' ? v() : v);
    const text = way ? [val(step.lead), way.text].filter(Boolean).join(' ') : val(step.text); // on the way: why, then where
    // A board guide whose thing is gone (merged away, floated off) waits for another time.
    if (!way && (!target || (Array.isArray(target) && target.filter(Boolean).length < (step.drag ? 2 : 1)))) {
        if (guide.step === 0 && !guide.def.when()) guide = null;
        tutorialEl.hidden = true;
        return;
    }
    showPointer(target, step.who, text, '✕');
    // Time counts only while it's on screen (not behind a dialog).
    const now = Date.now();
    if (!tutorialEl.hidden && guide.seenAt) guide.shown += Math.min(now - guide.seenAt, 1500);
    guide.seenAt = tutorialEl.hidden ? 0 : now;
}

function guideScene(step) {
    return typeof step.scene === 'function' ? step.scene() : step.scene;
}

// Not followed in time: out of the way for a while, and for good the second time.
function snoozeGuide() {
    const id = guide.def.id;
    guides.snoozed[id] = (guides.snoozed[id] || 0) + 1;
    if (guides.snoozed[id] >= 2) return finishGuide();
    guide = null;
    guideRestUntil = Date.now() + GUIDE_SNOOZE_MS;
    tutorialEl.hidden = true;
}

function finishGuide() {
    if (guide && !guides.done.includes(guide.def.id)) guides.done.push(guide.def.id);
    guide = null;
    guideRestUntil = Date.now() + GUIDE_REST_MS;
    tutorialEl.hidden = true;
}

// --- COUNTRY FAIR ---

// The Fair board's own chain and producer change with the theme. Its producer
// has charges to spare: at the Fair, energy is the only limit.
function fairTheme() {
    const id = fair.id !== null ? fair.id : currentFairId() !== null ? currentFairId() : nextFairDay();
    const n = FAIR_THEMES.length;
    return FAIR_THEMES[((Math.floor(id / 7) % n) + n) % n];
}

function applyFairTheme() {
    const theme = fairTheme();
    NAMES.fair = theme.names;
    const [emoji, name] = theme.producer;
    PRODUCERS.fair = { emoji, minutes: 1, names: [name, name, name, name], levels: [[10, 30, 1]] };
}

// Day of the week for a day number from today(): 0 Sunday ... 5 Friday, 6 Saturday.
function weekday(day) {
    return ((day + 4) % 7 + 7) % 7;
}

// The Friday the current Fair started, or null outside Friday to Sunday.
function currentFairId() {
    const day = today();
    const since = (weekday(day) - 5 + 7) % 7; // days since Friday
    return since < FAIR_DAYS ? day - since : null;
}

function nextFairDay() {
    const day = today();
    return day + ((5 - weekday(day) + 7) % 7 || 7);
}

// Local midnight at the start of a day number.
function dayStart(day) {
    return day * DAY_MS + new Date().getTimezoneOffset() * 60000;
}

function fairEndsAt() {
    return dayStart(fair.id + FAIR_DAYS);
}

function fairOpen() {
    return fair.id !== null && !fair.finished && fair.id === currentFairId();
}

function fairBoosted() {
    return fair.boostUntil > Date.now();
}

// A fresh Fair board: its producer in the corner, the rest empty.
function freshFairBoard() {
    const board = Array(NUM_CELLS).fill(null);
    board[0] = { type: 'shop', level: FIRST_WORKING_LEVEL };
    return board;
}

// Starts a Fair when one is on (from level FAIR_LEVEL) and wraps up the last
// one once it's over.
function syncFair() {
    const id = currentFairId();
    if (fair.id !== null && !fair.finished && fair.id !== id) finishFair();
    if (id !== null && fair.id !== id && quests.level >= FAIR_LEVEL) {
        Object.assign(fair, { id, points: 0, milestones: 0, boostUntil: 0, finished: false });
        applyFairTheme();
        grids.fair = freshFairBoard();
        tickProducer('fair', grids.fair[0]);
        toast(`🎪 The ${fairTheme().name} is on until Sunday! Find it on the map.`, 'good');
    }
    applyFairTheme();
}

// A small seeded random number in [0, 1), so rivals do the same on every reload.
function seeded(n) {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
}

// Where a rival is now: they head for their final score, some fast early on,
// some late sprinters.
function rivalScore(i, now = Date.now()) {
    const start = dayStart(fair.id);
    const frac = Math.min(1, Math.max(0, (now - start) / (fairEndsAt() - start)));
    const goal = FAIR_MILESTONES[FAIR_MILESTONES.length - 1][0] * FAIR_RIVALS[i][1] * (0.85 + 0.3 * seeded(fair.id * 7 + i));
    const pace = 0.7 + 0.7 * seeded(fair.id * 13 + i);
    return Math.round(goal * frac ** pace);
}

// Everyone in the race, best first.
function fairStandings(now = Date.now()) {
    return FAIR_RIVALS.map(([id], i) => ({ id, name: npcs.find(n => n.id === id).name, score: rivalScore(i, now) }))
        .concat({ id: 'me', name: 'You', score: fair.points })
        .sort((a, b) => b.score - a.score || (a.id === 'me' ? -1 : 1));
}

function fairRank(now) {
    return fairStandings(now).findIndex(e => e.id === 'me') + 1;
}

function ordinal(n) {
    return n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th');
}

// Points for a merge at the Fair, doubled while the Fair Pack's boost runs;
// milestones pay as soon as they're reached.
function addFairPoints(tier) {
    if (!fairOpen()) return;
    fair.points += tier * (fairBoosted() ? 2 : 1);
    while (fair.milestones < FAIR_MILESTONES.length && fair.points >= FAIR_MILESTONES[fair.milestones][0]) {
        fair.milestones++;
        grantReward(FAIR_MILESTONES[fair.milestones - 1][1], `🎪 Milestone ${fair.milestones}:`);
    }
}

// Results waiting to be shown once nothing else is on screen.
let pendingFairResults = null;

function finishFair() {
    const rank = fairRank(fairEndsAt());
    const prize = FAIR_PRIZES[rank - 1];
    if (prize) grantReward(prize, `🎪 ${ordinal(rank)} place:`);
    pendingFairResults = { theme: fairTheme().name, rank, prize, points: fair.points };
    fair.finished = true;
    grids.fair = Array(NUM_CELLS).fill(null);
    if (currentScene === 'fair') goTo('map');
}

function showFairResults() {
    if (!pendingFairResults || !quietOnMap()) return;
    const r = pendingFairResults;
    pendingFairResults = null;
    showDialog({
        title: `🎪 ${r.theme} results`,
        body: `<p class="big-count">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : '🎗️'} ${ordinal(r.rank)}</p>
               <p>You scored <b>${r.points}</b> points.</p>
               <p>${r.prize ? `<b>Prize:</b> ${rewardText(r.prize)}` : 'No prize this time. Next Friday, a new Fair!'}</p>`,
        actions: [{ label: 'OK', primary: true }],
    });
}

// The strip above the Fair board: time left, points toward the next
// milestone, and your place in the race.
function renderFairHeader(el) {
    const next = FAIR_MILESTONES[fair.milestones];
    const prev = fair.milestones ? FAIR_MILESTONES[fair.milestones - 1][0] : 0;
    const width = next ? (100 * (fair.points - prev)) / (next[0] - prev) : 100;
    el.innerHTML = iconize(`<button class="fair-header">
        <span class="fair-top"><b>${fairTheme().emoji} ${fairTheme().name}</b>
            <span>⏳ <span data-ready="${fairEndsAt()}">${formatDuration(fairEndsAt() - Date.now())}</span></span>
            <span class="fair-rank">${uiIcon('trophy', '🏆')} ${ordinal(fairRank())}</span></span>
        <span class="quest-bar xp"><i style="width:${Math.min(100, width)}%"></i></span>
        <span class="fair-next">${fair.points} pts${next ? ` · next at ${next[0]}: ${rewardText(next[1])}` : ' · every milestone done!'}${fairBoosted() ? ' · ⚡2× points' : ''}</span>
    </button>`);
    el.querySelector('.fair-header').addEventListener('click', openFairInfo);
}

function openFairInfo() {
    if (!fairOpen()) {
        showDialog({
            title: '🎪 Country Fair',
            body: `<p>Every Friday to Sunday the Fair comes to town with its own board and prizes.</p>
                   <p class="hint">${quests.level < FAIR_LEVEL ? `Reach level ${FAIR_LEVEL} to join.` : `The next one, the ${fairTheme().name}, opens in ${formatDuration(dayStart(nextFairDay()) - Date.now())}.`}</p>`,
            actions: [{ label: 'OK' }],
        });
        return;
    }
    const miles = FAIR_MILESTONES.map(([pts, reward], i) => `
        <div class="quest${i < fair.milestones ? ' done' : ''}"><span>${i < fair.milestones ? '✅' : '⬜'} ${pts} pts</span><small>${rewardText(reward)}</small></div>`).join('');
    const race = fairStandings().map((e, i) => `
        <div class="race-row${e.id === 'me' ? ' me' : ''}"><span>${i + 1}. ${e.name}</span><b>${e.score}</b>${FAIR_PRIZES[i] ? `<small>${rewardText(FAIR_PRIZES[i])}</small>` : '<small></small>'}</div>`).join('');
    showDialog({
        title: `${fairTheme().emoji} ${fairTheme().name}`,
        body: `<p class="hint">Ends in ${formatDuration(fairEndsAt() - Date.now())}. Merge here to score: the bigger the merge, the more points.</p>
               <h3 class="fair-h">${uiIcon('trophy', '🏆')} The race</h3>${race}
               <h3 class="fair-h">🎯 Milestones</h3>${miles}`,
        actions: [
            currentScene !== 'fair' ? { label: 'Go to the Fair', primary: true, wide: true, onClick: () => goTo('fair') } : null,
            { label: 'Close' },
        ].filter(Boolean),
    });
}

// --- GEM JAR ---

function fillJar(n) {
    const before = shop.jar;
    shop.jar = Math.min(GEM_JAR.cap, shop.jar + n);
    if (before < GEM_JAR.min && shop.jar >= GEM_JAR.min) toast(`🫙 Your Gem Jar has 💎${shop.jar}. Break it open on the map!`, 'good');
}

function jarReady() {
    return shop.jar >= GEM_JAR.min;
}

function openGemJar() {
    markGuide('jar');
    const ready = jarReady();
    showDialog({
        title: `🫙 ${GEM_JAR.name}`,
        body: `<p class="big-count">💎 ${shop.jar}</p>
               <div class="quest xp-row"><span>${shop.jar >= GEM_JAR.cap ? 'Full!' : `Fills up to 💎${GEM_JAR.cap}`}</span><small>${shop.jar}/${GEM_JAR.cap}</small>
                   <span class="quest-bar xp"><i style="width:${(100 * shop.jar) / GEM_JAR.cap}%"></i></span></div>
               <p class="hint">Gems drop in as you play: 💎${GEM_JAR.perMerge} a merge, 💎${GEM_JAR.perOrder} an order, 💎${GEM_JAR.perJob} a job.
               ${ready ? 'Break it open to keep them all!' : `It opens at 💎${GEM_JAR.min}.`}</p>`,
        actions: [
            ready ? { label: `Break it open · ${GEM_JAR.price}`, primary: true, wide: true, onClick: breakJar }
                : { label: `Opens at 💎${GEM_JAR.min}`, wide: true, disabled: true },
            { label: 'Close' },
        ],
    });
}

function breakJar() {
    if (!jarReady()) return;
    purchase(GEM_JAR.id);
}

// --- LIMITED-TIME OFFERS ---

function offerState(id) {
    return shop.offers[id] || (shop.offers[id] = {});
}

function offerActive(offer) {
    const s = shop.offers[offer.id];
    return !!s && !!s.until && !s.bought && Date.now() < s.until;
}

function activeOffers() {
    return OFFERS.filter(offerActive);
}

// Offers that just opened, shown one at a time once nothing else is on screen.
const pendingOffers = [];

// Opens any offer whose moment has come (once, or again after `again` days).
function checkOffers() {
    const now = Date.now();
    OFFERS.forEach(offer => {
        const s = offerState(offer.id);
        if (s.until && (!offer.again || now < s.until + offer.again * DAY_MS)) return;
        if (!offer.when(s)) return;
        Object.assign(s, { until: now + offer.hours * 3600000, bought: false, base: stats.outOfEnergy });
        pendingOffers.push(offer.id);
    });
    if (pendingOffers.length && quietOnMap()) openOffer(pendingOffers.shift());
}

function openOffer(id) {
    const offer = OFFERS.find(o => o.id === id);
    if (!offerActive(offer)) return;
    const until = shop.offers[id].until;
    showDialog({
        title: `🔥 ${offer.name}`,
        body: `<p>${offer.note}</p>
               <p class="offer-reward">${rewardText(offer.reward)}</p>
               <p class="hint">Ends in <span data-ready="${until}">${formatDuration(until - Date.now())}</span></p>`,
        actions: [{ label: `Get it · ${offer.price}`, primary: true, wide: true, onClick: () => buyOffer(id) }, { label: 'No thanks' }],
    });
}

// 🔥 on the map: the one offer, or a list when there are several.
function openOffers() {
    const list = activeOffers();
    if (list.length === 1) return openOffer(list[0].id);
    showDialog({
        title: '🔥 Offers',
        body: '<p class="hint">Each one is only here for a little while.</p>',
        actions: [
            ...list.map(o => ({ label: `${o.name} · ${o.price}`, primary: true, wide: true, onClick: () => openOffer(o.id) })),
            { label: 'Close' },
        ],
    });
}

function buyOffer(id) {
    const offer = OFFERS.find(o => o.id === id);
    if (!offerActive(offer)) return;
    purchase(offer.id);
}

// --- SUGGESTIONS AT A NATURAL PAUSE ---
// A job done or a level up is a happy pause: once nothing else is on screen,
// the sales director may suggest the one thing this player would likeliest
// want (or nothing, if it isn't the time: see MONETIZE.rules).
let salesPauseAt = 0;
let mapSince = 0; // when you last came to the map

// Pop-ups nobody asked for (offers, suggestions, Fair results) only open on the
// map with nothing else up: never over a board while you're merging.
function quietOnMap() {
    return currentScene === 'map' && Date.now() - mapSince > 2500 && Date.now() >= storyHoldUntil // settled there, and not on the way to a job
        && dialogEl.hidden && tutorial.done && !fixing && !draggedItemInfo && !openingOn;
}

function salesPause() {
    salesPauseAt = Date.now() + 3000; // after the cheering
}

function checkSalesPause() {
    if (!salesPauseAt || Date.now() < salesPauseAt) return;
    if (Date.now() - salesPauseAt > 5 * 60000) { salesPauseAt = 0; return; } // the moment has passed
    if (!quietOnMap() || storyQueue.length || pendingOffers.length || Date.now() < storyHoldUntil) return;
    salesPauseAt = 0;
    const golden = pass.golden ? 0 : passProgress().level;
    const offer = activeOffers()[0];
    const ways = {
        jar: jarReady() && { value: PRICE_USD[GEM_JAR.id], title: `🫙 ${GEM_JAR.name}`, label: `Break it open · ${GEM_JAR.price}`, wait: GEM_JAR.id, onClick: breakJar,
            body: `Your Gem Jar holds 💎${shop.jar}, all earned by you. Break it open and keep them!` },
        pass: golden > 0 && { value: PRICE_USD[GOLDEN_PASS.id], title: `🎟️ ${GOLDEN_PASS.name}`, label: `Unlock them · ${GOLDEN_PASS.price}`, wait: GOLDEN_PASS.id, onClick: () => buyGoldenPass(),
            body: `${golden} golden reward${golden > 1 ? 's are' : ' is'} waiting for you on the Season Pass. Unlock ${golden > 1 ? 'them all' : 'it'}, and get 💎${GOLDEN_PASS.gemsPerDay} a day too!` },
        basket: basketDaysLeft() <= 0 && { value: PRICE_USD[DAILY_BASKET.id], title: `🧺 ${DAILY_BASKET.name}`, label: `Get it · ${DAILY_BASKET.price}`, wait: DAILY_BASKET.id, onClick: buyDailyBasket,
            body: `💎${DAILY_BASKET.gemsPerDay} every day for ${DAILY_BASKET.days} days: 💎${DAILY_BASKET.gemsPerDay * DAILY_BASKET.days} in all.` },
        offer: offer && { value: PRICE_USD[offer.id], title: `🔥 ${offer.name}`, label: `Get it · ${offer.price}`, wait: offer.id, onClick: () => buyOffer(offer.id),
            body: `${offer.note}</p><p class="offer-reward">${rewardText(offer.reward)}` },
    };
    const sale = Sales.suggest('nudge', Object.keys(ways).filter(arm => ways[arm]).map(arm => ({ arm, value: ways[arm].value })));
    if (!sale) return;
    const way = ways[sale.featured];
    showDialog({
        title: way.title,
        body: `<p><b>Well done!</b> ${way.body}</p>`,
        actions: [{ label: way.label, primary: true, wide: true, sale: sale.featured, waitFor: way.wait, onClick: way.onClick }, { label: 'Not now' }],
        sale,
    });
}

// ?sales: what the sales director knows about this player and has learnt.
function openSalesReport() {
    const r = Sales.report(), seg = r.segment;
    const pct = x => `${Math.round(x * 1000) / 10}%`;
    const places = Object.entries(r.places).map(([p, arms]) => `<p><b>${p}</b><br>${Object.entries(arms)
        .map(([arm, a]) => `${arm}: ${pct(a.rate)} yes · ${a.yes}/${a.answers}`).join('<br>')}</p>`).join('');
    showDialog({
        title: 'Sales director',
        body: `<div style="text-align:left;font-size:3.2cqw">
               <p>${seg.country || '??'} · tier ${seg.tier} · ${seg.device} phone · ${seg.payer ? 'payer' : 'free'} · value ${seg.value}${seg.personal ? '' : ' · not personalized'}</p>
               <p>Ads a day: ${r.adCap} · played ${r.playedMinutes} min · spent $${r.spent.toFixed(2)} · session ${r.session.n} (${r.session.pacing}, ${r.session.shown} shown, ${r.session.noStreak} no in a row)</p>
               ${places}
               <p class="hint">${r.log.map(e => `${e.event} ${e.place || ''} ${e.featured || e.arm || e.product || ''} ${e.took || ''}`).join('<br>')}</p></div>`,
        actions: [{ label: 'Close' }],
    });
}

// --- DAILY GOALS ---

function statNow(name) {
    return name === 'taps' ? Object.values(stats.spawned).reduce((a, b) => a + b, 0) : stats[name] || 0;
}

// A new day picks three new goals (counting from now).
function syncDailyGoals() {
    if (dailyGoals.day === today()) return;
    const pool = DAILY_GOALS.filter(g => !g.level || quests.level >= g.level).sort(() => Math.random() - 0.5).slice(0, 3);
    Object.assign(dailyGoals, {
        day: today(),
        ids: pool.map(g => g.id),
        base: Object.fromEntries(pool.map(g => [g.id, statNow(g.stat)])),
        claimed: 0,
    });
}

function goalProgress(id) {
    const goal = DAILY_GOALS.find(g => g.id === id);
    return Math.min(goal.n, Math.max(0, statNow(goal.stat) - (dailyGoals.base[id] || 0)));
}

function goalsDone() {
    return dailyGoals.ids.filter(id => goalProgress(id) >= DAILY_GOALS.find(g => g.id === id).n).length;
}

function dailyClaimable() {
    return goalsDone() - dailyGoals.claimed;
}

function openDailyGoals() {
    markGuide('daily');
    syncDailyGoals();
    const rows = dailyGoals.ids.map(id => {
        const goal = DAILY_GOALS.find(g => g.id === id);
        const p = goalProgress(id);
        return `<div class="quest${p >= goal.n ? ' done' : ''}"><span>${p >= goal.n ? '✅' : '⬜'} ${goal.label}</span><small>${p}/${goal.n}</small>
                    <span class="quest-bar"><i style="width:${(100 * p) / goal.n}%"></i></span></div>`;
    }).join('');
    const chests = DAILY_CHEST.map((reward, i) => {
        const state = i < dailyGoals.claimed ? 'claimed' : i < goalsDone() ? 'today' : '';
        return `<div class="gift-day ${state}"><small>${i + 1} goal${i ? 's' : ''}</small><span>${rewardText(reward)}</span></div>`;
    }).join('');
    showDialog({
        title: '📅 Daily goals',
        body: `${rows}<div class="gift-track daily-chests">${chests}</div>
               <p class="hint">New goals in ${formatDuration(msUntilTomorrow())}.</p>`,
        actions: [
            dailyClaimable() > 0 ? { label: `Claim: ${rewardText(DAILY_CHEST[dailyGoals.claimed])}`, primary: true, wide: true, onClick: claimDailyChest } : null,
            { label: 'Close' },
        ].filter(Boolean),
    });
}

function claimDailyChest() {
    if (dailyClaimable() <= 0) return;
    grantReward(DAILY_CHEST[dailyGoals.claimed], `📅 Daily goal ${dailyGoals.claimed + 1}:`);
    dailyGoals.claimed++;
    openDailyGoals();
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

// Every job fixed moves the Season Pass on too.
const JOB_PASS_POINTS = 5;

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

function buyGoldenPass(deluxe = false) {
    if (pass.golden) return;
    purchase(deluxe ? GOLDEN_PASS_DELUXE.id : GOLDEN_PASS.id);
}

// 💎 to finish the current pass level right now (0 at the top).
function passSkipPrice() {
    const { into, need } = passProgress();
    return need ? (need - into) * PASS_GEMS_PER_POINT : 0;
}

function buyPassLevel() {
    const price = passSkipPrice();
    if (!price || !spendGems(price, buyPassLevel)) return;
    const { into, need } = passProgress();
    addPassPoints(need - into);
    updateUI();
    openPass();
}

function claimPassReward(track, level) {
    const { level: reached } = passProgress();
    if (level > reached || pass.claimed[track].includes(level) || (track === 'golden' && !pass.golden)) return;
    pass.claimed[track].push(level);
    grantReward(PASS_REWARDS[level - 1][track === 'free' ? 0 : 1], `🎟️ Level ${level}:`);
    openPass();
}

function openPass() {
    markGuide('pass');
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
        // Small buttons two to a row, so the track between the ribbon and them has the room.
        actions: [
            pass.golden ? null : { label: `${GOLDEN_PASS.name}<br><small>${GOLDEN_PASS.price}</small>`, primary: true, half: true, onClick: () => buyGoldenPass() },
            pass.golden ? null : { label: `⭐ Deluxe +${GOLDEN_PASS_DELUXE.points}<br><small>${GOLDEN_PASS_DELUXE.price}</small>`, primary: true, half: true, onClick: () => buyGoldenPass(true) },
            need ? { label: `Level ${level + 1} now<br><small>💎${passSkipPrice()}</small>`, half: true, onClick: buyPassLevel } : null,
            { label: 'Close', half: true },
        ].filter(Boolean),
        kind: 'pass',
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
    markGuide('flash');
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
        sfx('buy');
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
                label: `${itemLabel(deliveryBoard(), d.item)} · ${taken.includes(d.id) ? 'taken' : d.gems ? `💎${d.gems}` : d.coins ? `💵${d.coins}` : 'FREE'}`,
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
    if (deal.coins) {
        if (res.money < deal.coins) return toast(`You need 💵${deal.coins - res.money} more.`);
        res.money -= deal.coins;
        sfx('buy');
    }
    shop.dealsTaken.push(id);
    sendToBoard(deliveryBoard(), deal.item);
    updateUI();
    goTo(currentScene);
}

// The Growth Guide for each tier (💵): a real goal from the first one, then
// steeper and steeper. Jobs need tier 4 around level 3, tiers 5-6 around level
// 6 and tiers 7-9 around levels 7-8; each costs about as much as the land deed
// of its time, or more. Tiers 10 and 11 are for the keenest (and gem buyers).
const GUIDE_COSTS = { 4: 800, 5: 2500, 6: 6000, 7: 15000, 8: 35000, 9: 80000, 10: 250000, 11: 800000 };

function guideCost(next = maxTier + 1) {
    return GUIDE_COSTS[next] || GUIDE_COSTS[11];
}

function offerUpgrade() {
    markGuide('upgrade');
    const next = maxTier + 1;
    showDialog({
        art: ASSETS.props.upgrade,
        title: `Growth Guide · Tier ${next}`,
        body: `<p>Lets you merge one step further on every board, like ${itemIcon('barn', next)} <b>${itemName('barn', next)}</b> in the Barn.</p>
               <p class="hint">Townsfolk will start asking for bigger things too.</p>`,
        actions: [buyAction(guideCost(next), buyUpgrade), { label: 'Not now' }],
    });
}

// The Workshop Manual's next chapter: tools, wood, wool and all the tool
// producers' things merge one step further.
function manualCost(next = toolTier + 1) {
    return MANUAL_COSTS[next] || 0;
}

function offerManual() {
    markGuide('manual');
    const next = toolTier + 1;
    if (!manualCost(next)) return toast('You have the whole Workshop Manual!');
    const chapter = next - TOOL_TIER_START;
    showDialog({
        art: ASSETS.props.manual,
        title: `Workshop Manual · Chapter ${chapter}`,
        body: `<p>Tools, wood, wool and everything the other producers make merge one step further, like ${itemIcon('tools', next)} <b>${itemName('tools', next)}</b> from the Toolbox.</p>
               <p class="hint">Jobs need these bigger things later on.</p>`,
        actions: [buyAction(manualCost(next), buyManual), { label: 'Not now' }],
    });
}

function buyManual() {
    const cost = manualCost();
    if (!cost || res.money < cost) return;
    res.money -= cost;
    sfx('buy');
    toolTier++;
    updateUI();
    toast(`Tools and the rest now merge up to tier ${toolTier}!`, 'good');
    goTo(currentScene);
}

function buyUpgrade() {
    const cost = guideCost();
    if (res.money < cost) return;
    res.money -= cost;
    sfx('buy');
    maxTier++;
    updateUI();
    initTown();
    toast(`You can now merge up to tier ${maxTier}!`, 'good');
    goTo(currentScene);
}

// 12450 -> "12,450" (by hand: toLocaleString's first call loads the phone's
// locale data, a noticeable pause on a slow phone).
function withCommas(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 12,450 -> "12.4k" so the top bar fits on small phones.
function shortNumber(n) {
    if (n >= 100000) return Math.floor(n / 1000) + 'k';
    if (n >= 10000) return (Math.floor(n / 100) / 10) + 'k';
    return withCommas(n);
}

function updateUI() {
    rollNumber(moneyEl, res.money);
    rollNumber(gemsEl, res.gems);
    energyEl.textContent = shortNumber(res.energy);
    document.getElementById('btn-energy').classList.toggle('out', res.energy < 1 && !unlimitedActive()); // the bolt pulses: out of energy
    energyTimerEl.textContent = unlimitedActive()
        ? `♾️ ${formatDuration(settings.unlimitedUntil - Date.now())}`
        : energyAt ? `+1 in ${formatDuration(energyAt - Date.now())}` : 'full';
    energyEl.closest('.res').classList.toggle('full', !unlimitedActive() && !energyAt);
    const need = xpToNext(quests.level);
    levelEl.textContent = quests.level;
    xpFillEl.style.width = `${Math.min(100, (100 * quests.xp) / need)}%`;
    xpTextEl.textContent = `${shortNumber(quests.xp)}/${shortNumber(need)}`;
    const mode = chargeMode();
    chargeBtn.textContent = mode.label;
    chargeBtn.title = mode.name;
    chargeBtn.classList.toggle('on', settings.charge > 0);
    chargeBtn.hidden = !isBoard(currentScene);
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
    'flower': Array(NUM_CELLS).fill(null),
    'fair': Array(NUM_CELLS).fill(null),
};
Object.keys(AREAS).forEach(mode => grids[mode][0] = { type: 'shop', level: FIRST_WORKING_LEVEL });

// A fresh board starts cluttered, as in Merge Mansion: 📦 crates that open when
// you merge next to them, and cobwebbed items you free by merging a matching
// item into them (or dust off with 💎). The deeper the row, the bigger what's
// waiting: the top rows hold small things, the bottom rows big ones, so the
// board takes a long time to clear. Some crates hold a free item from the
// board's other producers, a few high-tier treasures sit near the top to aim
// for, and two crates hide a cobwebbed level 1 producer part.
function clutterBoard(mode = 'barn') {
    const board = Array(NUM_CELLS).fill(null);
    board[0] = { type: 'shop', level: FIRST_WORKING_LEVEL };
    const roll = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
    // Every chain made on this board: its animals (or crops...) and its other
    // producers' things (tools, wool...), mixed in every row.
    const others = Object.keys(TOOLS).filter(c => TOOLS[c].board === mode);
    const chains = [mode, mode, ...others];
    // A cobwebbed item from any of them, as big as its row is deep: small near
    // the top, the very top of its chain on the bottom row.
    const webbed = (row, extra = 0) => {
        const chain = chains[Math.floor(Math.random() * chains.length)], top = NAMES[chain].length - 1;
        const tier = Math.max(1, Math.min(top, Math.round((row / (GAME_HEIGHT - 1)) * top) + roll(-1, 0) + extra));
        return chain === mode ? { tier, web: true } : { tier, chain, web: true };
    };
    const producerCrates = [30 + Math.floor(Math.random() * GAME_WIDTH), 42 + Math.floor(Math.random() * GAME_WIDTH)];
    const lucky = 1 + Math.floor(Math.random() * 2 * GAME_WIDTH);
    for (let i = 1; i < NUM_CELLS; i++) {
        const row = Math.floor(i / GAME_WIDTH);
        if (row < 2) {
            if (i === 4 || i === 9 || i === 11) board[i] = webbed(row + 1);
            else if (i === lucky && mode !== 'barn') board[i] = webbed(GAME_HEIGHT - 3); // a big treasure to aim for
        } else if (row < 4) {
            const item = webbed(row);
            board[i] = Math.random() < 0.4 ? item : { type: 'box', hidden: item };
        } else {
            // Crates: mostly cobwebbed things; now and then a free one, or a producer.
            const hidden = producerCrates.includes(i) ? { type: 'shop', level: 1, web: true } : webbed(row);
            if (hidden.web && hidden.type !== 'shop' && Math.random() < 0.12) delete hidden.web;
            board[i] = { type: 'box', hidden };
        }
    }
    return board;
}

// The first Barn board, set for the tutorial: the cobwebbed Egg it frees, with
// two boxes beside it, and nothing else that looks like an Egg nearby.
function tutorialBoard(board) {
    board[4] = { tier: 0, web: true };
    board[9] = { tier: 2, web: true };
    board[11] = { tier: 0, web: true };
    board[12] = { tier: 0, web: true };
    board[TUTORIAL_WEB] = { tier: 1, web: true };
    board[TUTORIAL_WEB + 1] = { type: 'box', hidden: { tier: 0, web: true } };
    board[TUTORIAL_WEB + GAME_WIDTH] = { type: 'box', hidden: { tier: 2, web: true } };
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

// Build one board scene per area, and one for the Fair.
Object.keys(AREAS).concat('fair').forEach(mode => {
    const scene = document.createElement('section');
    scene.className = `scene board board-${mode}`;
    scene.id = `scene-${mode}`;
    scene.hidden = true;
    if (ASSETS.boards[mode]) scene.style.backgroundImage = `url("${ASSETS.boards[mode]}")`;
    // A phone-shaped column in the middle (on a wide screen the picture behind fills the rest).
    scene.innerHTML = `<div class="board-col"><div class="board-header"></div><div class="game-grid" id="grid-${mode}"></div>
                       <div class="board-footer"><div class="info-bar"></div></div></div>`;
    stageEl.insertBefore(scene, dialogEl);
});

// The item shown in the info bar under the orders: { mode, index } or null.
let selected = null;
// The last item sold, so the info bar can offer Undo until you do something else.
let lastSale = null;

// Above each board: the orders it can fill, then the info bar.
function renderBoardHeader(mode) {
    const header = document.querySelector(`#scene-${mode} .board-header`);
    header.innerHTML = '<div class="orders"></div>';
    boardBackdrop(mode);
    // The hammer back to this land's place, Merge Mansion style, with its ready jobs.
    const footer = document.querySelector(`#scene-${mode} .board-footer`);
    footer.querySelector('.place-btn')?.remove();
    if (AREAS[mode]) {
        const ready = landTasks(mode).filter(taskReady).length;
        const btn = document.createElement('button');
        btn.className = 'place-btn';
        btn.title = `To the ${AREAS[mode].name}`;
        btn.innerHTML = `${uiIcon('hammer', '🔨')}${ready ? `<span class="badge">${ready}</span>` : ''}`;
        btn.addEventListener('click', () => goFix(mode));
        footer.appendChild(btn);
    }
    if (mode === 'fair') renderFairHeader(header.querySelector('.orders'));
    else renderOrders(mode, header.querySelector('.orders'));
    renderInfoBar(mode);
}

// Behind a board: the land's area being worked on (the first open one with
// jobs left), dimmed a little, or the board's own texture until it's drawn.
function boardBackdrop(mode) {
    const scene = document.getElementById(`scene-${mode}`);
    const zones = landZones(mode);
    const zone = zones.find(z => zoneOpen(z) && !zoneDone(z)) || zones.filter(zoneOpen).pop() || zones[0];
    const art = zone && (ASSETS.areas || {})[zone.id];
    if (art) scene.style.backgroundImage = `linear-gradient(rgba(40, 25, 10, 0.15), rgba(40, 25, 10, 0.35)), url('${art}')`;
}

// Redraws everything on a board after it changes.
function refreshBoard(mode, poppedIndices = []) {
    renderGrid(mode, poppedIndices);
    renderBoardHeader(mode);
    updateTutorial();
}

// Orders for this board, Merge Mansion style: who wants what, the reward, and a
// Deliver button as soon as the item is on the board. Cards for other boards
// with orders jump straight there.
// At most this many jobs and orders show over a board; the next ones wait their turn.
const ORDERS_SHOWN = 6;

function renderOrders(mode, el) {
    // Restoration jobs (this land's own, and any needing items from this board),
    // then the townsfolk's orders; whatever's ready jumps to the front.
    const cards = [];
    openTasks().filter(t => t.land === mode || t.needs.some(n => needBoard(n) === mode)).forEach(task => {
        const ready = taskReady(task);
        const need = task.needs.find(n => needBoard(n) === mode) || task.needs[0];
        const p = needProgress(task, need);
        const card = document.createElement('button');
        card.className = 'order-card task-card' + (ready ? ' ready' : '');
        card.innerHTML = iconize(`
            <span class="order-who"><span class="hammer">${uiIcon('hammer', '🔨')}</span><span class="want">${need.item ? itemIcon(need.item, need.tier) : need.stat ? statIcon(need.stat) : '🏡'}</span></span>
            <span class="order-pay">${p.have}/${p.of} · ⭐${task.xp}</span>
            ${ready ? '<span class="order-go">Do it</span>' : `<span class="order-need">${task.name}</span>`}`);
        card.addEventListener('click', () => (ready && hasSpot(task) ? goFix(task.land, task.id) : openTaskCard(task)));
        cards.push({ card, ready });
    });

    npcs.filter(n => n.request && n.request.mode === mode).forEach(npc => {
        const r = npc.request;
        const ready = canFulfill(npc);
        const card = document.createElement('button');
        card.className = 'order-card' + (ready ? ' ready' : '');
        card.dataset.npc = npc.id;
        card.innerHTML = iconize(`
            <span class="order-who"><img class="face" src="${npcPicture(npc)}" alt="${npc.name}"><span class="want">${itemIcon(mode, r.tier)}</span></span>
            <span class="order-pay">💵${r.rewardMoney} ⭐${r.rewardXp}${r.rewardProducer ? ' 🎁' : ''}</span>
            ${ready ? '<span class="order-go">Deliver</span>' : `<span class="order-need">${itemName(mode, r.tier)}</span>`}`);
        card.addEventListener('click', () => (ready ? deliver(npc) : openNpc(npc)));
        cards.push({ card, ready });
    });
    const shown = [...cards.filter(c => c.ready), ...cards.filter(c => !c.ready)].slice(0, ORDERS_SHOWN);
    shown.forEach(c => el.appendChild(c.card));
    if (cards.length > shown.length) {
        // The rest wait their turn: a note of how many, opening the list of jobs.
        const more = document.createElement('button');
        more.className = 'order-card more';
        more.innerHTML = iconize(`<span class="order-who">📋</span><span class="order-pay">+${cards.length - shown.length}</span><span class="order-need">waiting</span>`);
        more.addEventListener('click', openTaskLog);
        el.appendChild(more);
    }

    const elsewhere = {};
    npcs.forEach(n => {
        if (n.request && n.request.mode !== mode) elsewhere[n.request.mode] = (elsewhere[n.request.mode] || 0) + 1;
    });
    Object.entries(elsewhere).forEach(([other, count]) => {
        const card = document.createElement('button');
        card.className = 'order-card other';
        card.innerHTML = iconize(`
            <span class="order-who"><img class="building" src="${ASSETS.buildings[other]}" alt=""></span>
            <span class="order-pay">${count} order${count > 1 ? 's' : ''}</span>
            <span class="order-need">${AREAS[other].name} →</span>`);
        card.addEventListener('click', () => goTo(other));
        el.appendChild(card);
    });

    if (!el.children.length) el.innerHTML = '<p class="no-orders">No orders right now. Check the Town Square later.</p>';
}

function sellPrice(mode, item) {
    if (mode === 'fair') return 1; // Fair items are for points, as on Merge Mansion's event boards
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
        case 'toolbox': return TOOLS[item.chain].name;
        default: return itemName(chainOf(mode, item), item.tier);
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
        case 'toolbox': return TOOLS[item.chain].emoji;
        default: return itemEmoji(chainOf(mode, item), item.tier);
    }
}

// A small picture of any board item, for the info bar and dialogs.
function itemIconFor(mode, item) {
    if (!item.type) return itemIcon(chainOf(mode, item), item.tier);
    const art = item.type === 'shop' ? (ASSETS.producers[artKey(mode)] || [])[levelOf(item) - 1]
        : item.type === 'toolbox' ? (ASSETS.toolProducers || {})[item.chain] : specialSprite(item);
    return art ? `<img class="inline-item" src="${art}" alt="">` : `<span class="inline-item">${itemEmojiFor(mode, item)}</span>`;
}

// Picture and name, for toasts, buttons and rewards: its art (or emoji) and "Feed Pail".
function itemLabel(mode, item) {
    return `${itemIconFor(mode, item)} ${boardItemName(mode, item)}`;
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
function rollDrop(contents, mode) {
    const total = contents.reduce((sum, c) => sum + c[2], 0);
    let roll = Math.random() * total;
    const [what, level] = contents.find(c => (roll -= c[2]) < 0) || contents[0];
    if (what === 'tool') {
        // A tool from one of this board's tool chains (its level is the tool's tier + 1).
        const chains = Object.keys(TOOLS).filter(c => TOOLS[c].board === mode);
        if (chains.length) return { tier: level - 1, chain: chains[Math.floor(Math.random() * chains.length)] };
        return { type: 'coin', level };
    }
    return { type: what === 'part' ? 'shop' : what, level };
}

// After a merge: maybe a Season Pass item, a Double Bubble with a copy of the
// new item, and an ⭐ XP star for a big merge, each in the nearest free cell (in
// that order, as in Merge Mansion). Returns the cells they landed in.
function afterMerge(mode, index, made) {
    const landed = [];
    if (mode === 'fair') {
        if (!made.type) addFairPoints(made.tier);
        return landed;
    }
    if (made.type !== 'season' && Math.random() < SEASON_DROP_CHANCE) {
        const at = spawnNear(mode, index, { type: 'season', level: 1 });
        if (at !== -1) landed.push(at);
    }
    const isProducer = made.type === 'shop';
    const odds = !made.type ? BUBBLE_ODDS[made.tier] : isProducer ? PRODUCER_BUBBLE_ODDS[made.level] : 0;
    if (odds && Math.random() < odds) {
        const gems = !made.type ? BUBBLE_GEMS[made.tier] : PRODUCER_BUBBLE_GEMS[made.level];
        const inner = isProducer ? { type: 'shop', level: made.level } : { ...made };
        const at = spawnNear(mode, index, { type: 'bubble', inner, gems, until: Date.now() + bubbleMinutes(gems) * 60000 });
        if (at !== -1) {
            landed.push(at);
            toast(`🫧 A Double Bubble! Pop it for 💎${gems} before it's gone.`);
        }
    } else if ((!made.type ? made.tier >= 2 : isProducer && made.level >= 2) && tutorial.done && adsLeft() > 0
        && !grids[mode].some(c => c && c.type === 'bubble' && c.ad)) {
        // An Ad Bubble: when the ad network has a well-paying ad ready, the sales
        // director sometimes puts a copy in a bubble you pop by watching it.
        const sale = Sales.adBubble();
        if (sale) {
            const inner = isProducer ? { type: 'shop', level: made.level } : { ...made };
            const until = Date.now() + MONETIZE.placements.adBubble.minutes * 60000;
            const at = spawnNear(mode, index, { type: 'bubble', inner, ad: true, sale: sale.id, until });
            if (at === -1) Sales.forget(sale.id);
            else {
                landed.push(at);
                toast(`📺 An Ad Bubble! Watch a short ad to keep the copy.`);
            }
        }
    }
    const star = !made.type && made.tier >= 4 ? made.tier - 3 : isProducer && made.level >= 5 ? made.level - 4 : 0;
    if (star) {
        const at = spawnNear(mode, index, { type: 'xp', level: Math.min(star, CURRENCY.xp.values.length) });
        if (at !== -1) landed.push(at);
    }
    return landed;
}

// Pays the bubble's gems (or, for an Ad Bubble, a watched ad) for the copy inside it.
function popBubble(mode, index) {
    const bubble = grids[mode][index];
    if (!bubble || bubble.type !== 'bubble') return;
    if (bubble.ad) {
        if (adsLeft() <= 0) return toast('No more ads today. It will float away soon.');
        Sales.took(bubble.sale, null, 'ad');
        bubble.until = Math.max(bubble.until, Date.now() + 120000); // it waits while the ad plays
        return showRewardedAd(() => {
            shop.adsWatched++;
            if (grids[mode][index] === bubble) releaseBubble(mode, index);
            else sendToBoard(mode, bubble.inner); // moved or gone meanwhile: the copy goes in the 🎁
        });
    }
    if (!spendGems(bubble.gems, () => popBubble(mode, index))) return;
    releaseBubble(mode, index);
}

function releaseBubble(mode, index) {
    const bubble = grids[mode][index];
    grids[mode][index] = bubble.inner;
    tickProducer(mode, bubble.inner);
    updateUI();
    sfx('pop');
    buzz(20);
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
    if (!item || item.type !== 'chest' || chestReady(item) || !spendGems(chestStage(item).skip, () => rushChest(mode, index))) return;
    item.openAt = Date.now();
    item.opened = true;
    updateUI();
    toast(`${chestName(item)} is open! Tap it to take things out.`, 'good');
    refreshBoard(mode, [index]);
    if (FX.app) fxBurst(fxCell(mode, index), true, { stars: true });
}

// One tap on an open chest or a Piggy Bank drops one thing next to it; it
// disappears when it's empty.
function dropFrom(mode, index, stage, name) {
    const source = grids[mode][index];
    const at = nearestEmpty(mode, index);
    if (source.drops === undefined) source.drops = stage.drops;
    grids[mode][at] = rollDrop(stage.contents, mode);
    source.drops--;
    stats.chestDrops++;
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
    fxSpawn(mode, index, at);
    const box = FX.app && fxCell(mode, index);
    if (box) fxSparkles(box.x, box.y - box.size * 0.2, 6, box.size, { speed: 1.8, lift: box.size });
}

function boardFull(mode) {
    if (grids[mode].includes(null)) return false;
    toast('The board is full! Sell, merge or deliver something first.');
    return true;
}

function tapChest(mode, index) {
    markGuide('chest');
    if (boardFull(mode)) return;
    const chest = grids[mode][index];
    dropFrom(mode, index, chestStage(chest), chestName(chest));
}

function tapPiggy(mode, index) {
    markGuide('chest');
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
    stats.collected++;
    sfx('coin');
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
    if (mode === 'fair') {
        toast('Fair items stay at the Fair.');
        return false;
    }
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
    sfx('buy');
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
    let html = `<button class="inv-btn" title="Inventory: drag items here">${uiIcon('inventory', '🎒')}<small>${inventory.items.length}/${inventoryCapacity()}</small></button>`;
    if (crates[mode].length) html += `<button class="crate-btn">${uiIcon('gift', '🎁')} ${crates[mode].length}</button>`;

    if (!item && lastSale && lastSale.mode === mode) {
        html += `<span class="info-icon">${itemIcon(chainOf(mode, lastSale.item), lastSale.item.tier)}</span>
                 <span class="info-text"><b>Sold ${itemName(chainOf(mode, lastSale.item), lastSale.item.tier)}</b> for 💵${lastSale.price}<br><small>Changed your mind?</small></span>
                 ${button('undo-btn', 'Undo')}`;
    } else if (!item) {
        html += `<span class="info-text">Tap a ${prod.emoji} ${producerBaseName(mode)} to make items for ⚡1. Drag two alike together to merge. Tap an item to see it.</span>`;
    } else if (item.web) {
        const name = boardItemName(mode, item);
        html += icon + text(`${name} · ${uiIcon('cobweb', '🕸️')}`, `Covered in cobwebs. Merge a free ${name} into it to free it.`) + button('dust-btn', `Dust<br>💎${dustPrice(item)}`);
    } else if (item.type === 'box') {
        html += `<span class="info-icon">📦</span>` + text('Crate', 'Merge anything next to it to open it.');
    } else if (item.type === 'bubble') {
        html += item.ad
            ? icon + text('Ad Bubble', `A free ${boardItemName(mode, item.inner)} inside! Watch a short ad to pop it: ${countdown(item.until)}`)
                + button('pop-btn', `Watch<br>${uiIcon('ad', '📺')}`)
            : icon + text('Double Bubble', `A free ${boardItemName(mode, item.inner)} inside! Pop it before it's gone: ${countdown(item.until)}`)
                + button('pop-btn', `Pop<br>💎${item.gems}`);
    } else if (item.type === 'toolbox') {
        const t = TOOLS[item.chain];
        html += icon + text(t.name, item.drops > 0 ? `Tap to make ${t.what} for ⚡1. ${item.drops}/${TOOL_CHARGES} taps left.`
            : `Recharging: ${countdown(item.readyAt)}.`) + chainBtn
            + (item.readyAt ? button('skip-btn', `Recharge<br>💎${rechargePrice(mode, item)}`) : '');
    } else if (item.type === 'shop') {
        const level = levelOf(item);
        const name = producerName(mode, level);
        const next = mode === 'fair' ? 'Every merge here scores Fair points.'
            : level < PRODUCER_MAX_LEVEL ? `Merge two to make a ${producerName(mode, level + 1)}.` : 'Top level!';
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
        const chain = chainOf(mode, item);
        const last = NAMES[chain].length - 1;
        const tip = item.tier >= last ? 'The best there is!'
            : item.tier >= tierCap(chain) ? `Max tier for now: buy the ${TOOLS[chain] ? 'Workshop Manual' : 'Growth Guide'} at the Market.`
            : `Merge two to make ${itemIcon(chain, item.tier + 1)} ${itemName(chain, item.tier + 1)}.`;
        html += icon + text(`${itemName(chain, item.tier)} · tier ${item.tier}`, tip) + chainBtn + button('sell-item-btn', `Sell<br>💵${sellPrice(mode, item)}`);
    }

    el.innerHTML = iconize(html);
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
    on('.chain-btn', () => (item.type === 'shop' ? openProducerInfo(mode)
        : openChain(item.type === 'toolbox' ? item.chain : chainOf(mode, item), item.tier)));
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
    if (!item || !item.web || !spendGems(dustPrice(item), () => dustSelected(mode))) return;
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
        <div class="chain-tile${t === highlightTier ? ' current' : ''}${t > tierCap(mode) ? ' locked' : ''}">
            ${itemIcon(mode, t)}<small>${t}. ${itemName(mode, t)}</small>
        </div>`).join('');
    const tool = TOOLS[mode];
    if (tool) return showDialog({
        title: `${tool.emoji} ${tool.what[0].toUpperCase()}${tool.what.slice(1)}`,
        body: `<div class="chain-grid">${tiles}</div>
               <p class="hint">Made by tapping the ${tool.emoji} ${tool.name} on the ${AREAS[tool.board].name} board. Jobs ask for these.
               ${toolTier < NAMES[mode].length - 1 ? ' Dimmed tiers need the Workshop Manual from the Market.' : ''}</p>`,
        actions: [{ label: 'OK' }],
    });
    showDialog({
        title: `${boardTitle(mode)} chain`,
        body: `<div class="chain-grid">${tiles}</div>
               <p class="hint">Made by tapping a ${PRODUCERS[mode].emoji} ${producerBaseName(mode)}${mode === 'fair'
                   ? '. Every merge here scores Fair points: the bigger the merge, the more.'
                   : ' or better. Dimmed tiers need the Growth Guide from the Market.'}</p>`,
        actions: [{ label: 'OK' }],
    });
}

// Every level of a board's producer: parts, then what each working level does.
function openProducerInfo(mode) {
    const rows = PRODUCERS[mode].names.map((name, i) => {
        const level = i + 1;
        if (mode === 'fair' && level < FIRST_WORKING_LEVEL) return '';
        const s = producerStats(mode, level);
        const odds = s && DROP_ODDS[level - FIRST_WORKING_LEVEL].map((p, t) => p && `${Math.round(p * 100)}% t${t}`).filter(Boolean).join(' ');
        return `<div class="quest"><span>${itemIconFor(mode, { type: 'shop', level })} Lv${level} ${name}</span>
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
    document.addEventListener('pointercancel', cancelDrag);
}

// The system took the touch away (a gesture, a call): no tap, no drop.
function cancelDrag() {
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);
    document.removeEventListener('pointercancel', cancelDrag);
    if (dragElement) { dragElement.remove(); dragElement = null; }
    if (!draggedItemInfo) return;
    const { mode } = draggedItemInfo;
    draggedItemInfo = null;
    refreshBoard(mode);
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
        if (item.type === 'toolbox') return tapToolbox(mode, index);
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
    document.removeEventListener('pointercancel', cancelDrag);

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
    let fxLater = null;
    if (targetCell) {
        const targetIndex = parseInt(targetCell.dataset.index);
        if (targetIndex !== index) {
            const sourceItem = grids[mode][index];
            if (!sourceItem) { refreshBoard(mode); return; } // it ran out (a charger, the Fair) mid-drag
            const targetItem = grids[mode][targetIndex];
            // Producers and their parts, boosters, currency, chests and piggy banks
            // merge by level; plain items by tier.
            const topLevel = levelMergeTop(sourceItem);
            const sameLevel = !!topLevel && sameLevelKind(sourceItem, targetItem) && levelMergeTop(targetItem) > 0;
            const sameKind = targetItem && !sourceItem.type && !targetItem.type && targetItem.tier === sourceItem.tier
                && chainOf(mode, targetItem) === chainOf(mode, sourceItem);
            const chain = sourceItem.type ? mode : chainOf(mode, sourceItem);
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
            } else if (sameKind && sourceItem.tier < tierCap(chain)) {
                // Direct Merge 2 (a tool stays a tool of its chain)
                made = sourceItem.chain ? { tier: sourceItem.tier + 1, chain: sourceItem.chain } : { tier: sourceItem.tier + 1 };
                stats.made[`${chain}:${made.tier}`] = madeCount(chain, made.tier) + 1;
                stats.merges++;
            } else if (sameKind && TOOLS[chain] && sourceItem.tier >= NAMES[chain].length - 1) {
                toast(`That's already a ${boardItemName(mode, sourceItem)}, the best there is!`);
            } else if (sameKind && TOOLS[chain]) {
                toast(`Tier ${tierCap(chain)} is the max for tools for now. Get the Workshop Manual at the Market!`);
            } else if (sameKind) {
                toast(`Tier ${tierCap(mode)} is the max for now. Buy the Growth Guide at the Market!`);
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
                sfx('merge', made.type ? { chain: 'level', tier: made.level } : { chain, tier: made.tier });
                buzz(12);
                grids[mode][index] = null;
                grids[mode][targetIndex] = made;
                fillJar(GEM_JAR.perMerge);
                if (targetItem.web) {
                    stats.webs++;
                    toast('🕸️ Freed!', 'good');
                }
                const opened = openBoxesAround(mode, targetIndex);
                popped = [targetIndex, ...opened, ...afterMerge(mode, targetIndex, made)];
                fxLater = () => {
                    fxMerge(mode, targetIndex, made.type ? made.level : made.tier);
                    if (targetItem.web) fxWeb(mode, targetIndex);
                    opened.forEach(i => fxCrate(mode, i));
                };
            }
            selected = { mode, index: made || swapped ? targetIndex : index };
        }
    }

    checkTasks();
    refreshBoard(mode, popped);
    if (fxLater) fxLater();
}

// --- THE SPARKLE LAYER ---
// The glitter of the big merge games: glows, sparkles, light rays, confetti,
// and coins, stars and gems flying to their counters. PixiJS draws it all on one
// see-through canvas over the whole game, so none of it is page elements (those
// made phones crawl). It loads a moment after the game starts, draws only while
// something moves (and hides when nothing does), and without WebGL, or with
// reduced motion asked for, it does nothing: the older page effects stand in
// for the merge burst, the confetti and the flying rewards. Its pictures are
// ASSETS.fx's, or drawn here at start-up where there's none.
const FX = { app: null, parts: [], pool: [], tex: {}, added: {}, icons: {}, art: {} };
const FX_GOLD = [0xffd84a, 0xffe78a, 0xffc93a, 0xfff2b8]; // tints for the sparkle picture (the drawn one is gold already)
const FX_CONFETTI = [0xffd34d, 0xff6b6b, 0x5cc15a, 0x4dabf7, 0xf783ac, 0xffa94d, 0x9775fa];

function loadFx() {
    if (FX.loading || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    FX.loading = true;
    const script = document.createElement('script');
    script.src = 'vendor/pixi.min.js';
    script.onload = startFx;
    document.head.appendChild(script);
}

function startFx() {
    // In three steps, each its own moment, so the game never stalls for long.
    const later = go => setTimeout(() => (window.requestIdleCallback || (f => f()))(go, { timeout: 1000 }), 0);
    let app;
    try {
        if (!window.PIXI || !PIXI.utils.isWebGLSupported()) return;
        PIXI.utils.skipHello();
        PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.ON; // big pictures drawn small stay smooth (and quick)
        // At most 1.5 canvas pixels to a screen pixel: soft light needs no more, and
        // a full-screen canvas is otherwise a lot to fill on a phone's graphics chip.
        app = new PIXI.Application({ backgroundAlpha: 0, antialias: false, autoStart: false, sharedTicker: false,
            resolution: Math.min(window.devicePixelRatio || 1, 1.5), autoDensity: true, resizeTo: window, powerPreference: 'low-power' });
        app.view.id = 'sparkle';
        document.body.appendChild(app.view);
        // Glows and rays at the back, then confetti, dust and flying things, sparkles in front.
        [FX.back, FX.mid, FX.front] = [0, 1, 2].map(() => app.stage.addChild(new PIXI.Container()));
    } catch (e) {
        return; // no sparkle layer: the game plays on without it
    }
    later(async () => {
        await makeFxTextures();
        // Then draw every picture once, unseen, so the first burst doesn't stall
        // on sending them to the graphics chip.
        later(() => {
            const warm = [...Object.keys(FX.tex), ...Object.values(FX.icons)].map(t => {
                const sprite = app.stage.addChild(new PIXI.Sprite(typeof t === 'string' ? FX.tex[t] : t));
                sprite.alpha = 0.01;
                sprite.blendMode = FX.added[t] ? PIXI.BLEND_MODES.ADD : PIXI.BLEND_MODES.NORMAL;
                return sprite;
            });
            app.render();
            warm.forEach(sprite => sprite.destroy());
            app.render();
            app.ticker.add(() => stepFx(Math.min(app.ticker.deltaMS, 50)));
            FX.app = app;
            setInterval(twinkleWanted, 2400);
        });
    });
}

// The effect pictures: ASSETS.fx's (and the coin, gem and star icons that fly),
// loaded before the first burst; any that's missing or fails is drawn here,
// white so each burst can tint it.
async function makeFxTextures() {
    const art = ASSETS.fx || {}, ui = ASSETS.ui || {};
    const icons = ['coin', 'gem', 'star', 'gift', 'energy'].map(k => ui[k]).filter(Boolean);
    let loaded = {};
    try {
        loaded = await PIXI.Assets.load([...Object.values(art).filter(Boolean), ...icons]);
    } catch (e) { /* drawn below instead */ }
    icons.forEach(src => { if (loaded[src]) FX.icons[src] = loaded[src]; });
    const paint = (w, draw, h = w) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        draw(c.getContext('2d'), w / 2);
        return PIXI.Texture.from(c);
    };
    const fade = (g, stops) => { stops.forEach(([at, a]) => g.addColorStop(at, `rgba(255,255,255,${a})`)); return g; };
    const made = {
        glow: () => paint(128, (c, m) => {
            c.fillStyle = fade(c.createRadialGradient(m, m, 0, m, m, m), [[0, 1], [0.2, 0.7], [0.5, 0.22], [1, 0]]);
            c.fillRect(0, 0, 2 * m, 2 * m);
        }),
        // A four-pointed gold star with a white heart and an orange rim, so it
        // shows on the cream cards and the bright map as well as on dark.
        sparkle: () => paint(128, (c, m) => {
            const R = m * 0.94, r = m * 0.11;
            c.beginPath();
            c.moveTo(m, m - R);
            c.quadraticCurveTo(m + r, m - r, m + R, m);
            c.quadraticCurveTo(m + r, m + r, m, m + R);
            c.quadraticCurveTo(m - r, m + r, m - R, m);
            c.quadraticCurveTo(m - r, m - r, m, m - R);
            const g = c.createRadialGradient(m, m, 0, m, m, R);
            [[0, '#ffffff'], [0.12, '#fff6c8'], [0.32, '#ffd43b'], [1, '#ff9a14']].forEach(([at, col]) => g.addColorStop(at, col));
            c.fillStyle = g;
            c.shadowColor = 'rgba(255, 200, 60, 0.9)';
            c.shadowBlur = m * 0.12;
            c.fill();
            c.shadowBlur = 0;
            c.lineWidth = m * 0.045;
            c.strokeStyle = '#c96a0c';
            c.stroke();
        }),
        rays: () => paint(256, (c, m) => {
            c.filter = 'blur(3px)'; // where the browser can
            c.fillStyle = fade(c.createRadialGradient(m, m, 0, m, m, m), [[0, 1], [0.5, 0.55], [1, 0]]);
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2, w = i % 2 ? 0.06 : 0.12;
                c.beginPath();
                c.moveTo(m, m);
                c.lineTo(m + Math.cos(a - w) * m, m + Math.sin(a - w) * m);
                c.lineTo(m + Math.cos(a + w) * m, m + Math.sin(a + w) * m);
                c.closePath();
                c.fill();
            }
        }),
        ring: () => paint(128, (c, m) => {
            c.strokeStyle = '#fff';
            c.lineWidth = m * 0.09;
            c.shadowColor = '#fff';
            c.shadowBlur = m * 0.18;
            c.beginPath();
            c.arc(m, m, m * 0.74, 0, Math.PI * 2);
            c.stroke();
            c.stroke();
        }),
        // A long soft streak, for glints.
        shine: () => paint(128, (c, m) => {
            c.setTransform(1, 0, 0, 0.25, 0, 0);
            c.fillStyle = fade(c.createRadialGradient(m, m, 0, m, m, m), [[0, 1], [0.3, 0.5], [1, 0]]);
            c.fillRect(0, 0, 2 * m, 2 * m);
        }, 32),
        // A puff of dust: a few soft blobs.
        dust: () => paint(128, (c, m) => {
            [[0, 0, 0.62], [-0.3, 0.12, 0.42], [0.32, 0.1, 0.45], [0.05, -0.28, 0.4], [-0.12, 0.3, 0.38]].forEach(([x, y, r]) => {
                c.fillStyle = fade(c.createRadialGradient(m + x * m, m + y * m, 0, m + x * m, m + y * m, r * m), [[0, 0.55], [0.6, 0.3], [1, 0]]);
                c.fillRect(0, 0, 2 * m, 2 * m);
            });
        }),
        // Three comet tails curling out from the middle.
        swirl: () => paint(256, (c, m) => {
            c.lineCap = 'round';
            for (let k = 0; k < 3; k++) {
                let last = null;
                for (let t = 0; t <= 1.001; t += 0.025) {
                    const a = k * (Math.PI * 2 / 3) + t * Math.PI * 1.3, r = m * (0.2 + t * 0.7);
                    const p = [m + Math.cos(a) * r, m + Math.sin(a) * r];
                    if (last) {
                        c.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.9})`;
                        c.lineWidth = 2 + (1 - t) * 7;
                        c.beginPath();
                        c.moveTo(...last);
                        c.lineTo(...p);
                        c.stroke();
                    }
                    last = p;
                }
            }
        }),
        // A scatter of little gold five-pointed stars.
        stars: () => paint(256, (c, m) => {
            for (let k = 0; k < 34; k++) {
                const a = k * 2.4, d = m * 0.9 * Math.sqrt((k + 0.5) / 34), x = m + Math.cos(a) * d, y = m + Math.sin(a) * d, size = m * (0.035 + (k % 4) * 0.012);
                c.beginPath();
                for (let i = 0; i < 10; i++) {
                    const b = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? size * 0.45 : size;
                    c.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r);
                }
                c.closePath();
                c.fillStyle = k % 3 ? '#ffd23f' : '#fff6c0';
                c.fill();
                c.lineWidth = 1;
                c.strokeStyle = '#d97c10';
                c.stroke();
            }
        }),
    };
    Object.keys(made).forEach(key => {
        FX.art[key] = !!loaded[art[key]];
        FX.tex[key] = loaded[art[key]] || made[key]();
        FX.added[key] = !['dust', 'sparkle', 'stars'].includes(key); // light is added on; sparkles, stars and dust are drawn over
    });
    FX.tex.bit = PIXI.Texture.WHITE; // confetti and planks: tinted rectangles
}

function fxIcon(src) {
    return FX.icons[src] || (FX.icons[src] = PIXI.Texture.from(src));
}

// One moving thing: a sprite from the pool and how it moves. Speeds are px a
// second; s0/s1 its scale at the start and end (popping in over `pop` of its
// life); it fades over the last `fade` of it. With a path it flies along that
// curve instead; with a trail it sheds sparkles as it goes.
function fxPart(key, x, y, o = {}) {
    if (!FX.app) return null;
    const s = FX.pool.pop() || new PIXI.Sprite();
    s.texture = typeof key === 'string' ? FX.tex[key] : key;
    s.anchor.set(0.5);
    s.tint = o.tint ?? 0xffffff;
    s.blendMode = (o.add ?? FX.added[key]) ? PIXI.BLEND_MODES.ADD : PIXI.BLEND_MODES.NORMAL;
    s.rotation = o.rot || 0;
    s.position.set(x, y);
    s.visible = false;
    (o.layer || FX.mid).addChild(s);
    const p = { s, x, y, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag ?? 1, spin: o.spin || 0, size: o.size || 32, aspect: o.aspect || 1,
        s0: o.s0 ?? 1, s1: o.s1 ?? 1, curve: o.curve, pop: o.pop || 0, alpha: o.alpha ?? 1, fade: o.fade ?? 0.4, fadeIn: o.fadeIn || 0,
        life: o.life || 600, age: -(o.delay || 0), flip: o.flip || 0, sway: o.sway || 0, path: o.path, trail: o.trail, onEnd: o.onEnd };
    FX.parts.push(p);
    if (!FX.app.ticker.started) {
        FX.app.view.classList.add('on');
        FX.app.ticker.start();
    }
    return p;
}

function stepFx(dt) {
    const parts = FX.parts, k = dt / 1000;
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i], s = p.s;
        p.age += dt;
        if (p.age < 0) continue;
        const t = p.age / p.life;
        if (t >= 1) {
            parts.splice(i, 1);
            s.parent.removeChild(s);
            FX.pool.push(s);
            if (p.onEnd) p.onEnd();
            continue;
        }
        if (p.path) {
            const [ax, ay, bx, by, cx, cy] = p.path, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
            p.x = (1 - e) * (1 - e) * ax + 2 * (1 - e) * e * bx + e * e * cx;
            p.y = (1 - e) * (1 - e) * ay + 2 * (1 - e) * e * by + e * e * cy;
            if (p.trail && p.age - (p.trailAt || 0) > 45) {
                p.trailAt = p.age;
                fxPart('sparkle', p.x, p.y, { layer: FX.back, size: p.size * 0.45, s1: 0.1, life: 380, alpha: 0.85, spin: 3, tint: sparkleTint(p.age / 45 | 0) });
            }
        } else {
            const d = p.drag ** (dt / 16.7);
            p.vx *= d;
            p.vy = p.vy * d + p.g * k;
            p.x += p.vx * k + (p.sway ? Math.sin(p.age / 260 + p.size) * p.sway * k : 0);
            p.y += p.vy * k;
        }
        let f;
        if (p.curve) {
            const c = p.curve, j = Math.max(1, c.findIndex(([at]) => at >= t));
            const [t0, v0] = c[j - 1], [t1, v1] = c[j];
            f = v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
        } else if (t < p.pop) {
            const u = t / p.pop - 1;
            f = p.s0 * (1 + 2.7 * u * u * u + 1.7 * u * u); // in with a little overshoot
        } else {
            const u = p.pop < 1 ? (t - p.pop) / (1 - p.pop) : 1;
            f = p.s0 + (p.s1 - p.s0) * (p.s1 > p.s0 ? 1 - (1 - u) * (1 - u) : u * u); // grows fast, shrinks late
        }
        const tex = s.texture, base = (p.size / (tex.orig.width || 1)) * f;
        s.scale.set(base * (p.flip ? Math.cos(p.age * p.flip / 1000) : 1), base * p.aspect);
        s.rotation += p.spin * k;
        s.position.set(p.x, p.y);
        s.alpha = p.alpha * (p.fadeIn && t < p.fadeIn ? t / p.fadeIn : 1) * (t > 1 - p.fade ? (1 - t) / p.fade : 1);
        s.visible = tex.valid;
    }
    if (!parts.length) {
        FX.app.render();
        FX.app.ticker.stop();
        FX.app.view.classList.remove('on');
    }
}

// The middle of an element, or a board square, on screen.
function fxAt(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width } : null;
}

function fxCell(mode, index) {
    return fxAt(document.querySelector(`#grid-${mode} .grid-cell[data-index="${index}"]`));
}

function sparkleTint(i) {
    return FX.art.sparkle ? FX_GOLD[i % FX_GOLD.length] : 0xffffff;
}

// Sparkles flying out from a point; with stars, a scatter of little stars opens behind them.
function fxSparkles(x, y, n, size, o = {}) {
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.6, v = size * (o.speed || 2.4) * (0.6 + Math.random() * 0.6);
        fxPart('sparkle', x, y, { layer: FX.front, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.lift || 0), drag: 0.9,
            size: size * (0.3 + Math.random() * 0.25), pop: 0.12, s1: 0.15, life: 520 + Math.random() * 300, tint: sparkleTint(i),
            spin: (Math.random() - 0.5) * 8, delay: o.delay || 0 });
    }
    if (o.stars) fxPart('stars', x, y, { size: size * 2.4, s0: 0.35, s1: 1.15, life: 900, spin: 0.4, rot: Math.random() * 6, fade: 0.55, delay: o.delay || 0 });
}

function fxGlow(x, y, size, o = {}) {
    fxPart('glow', x, y, { layer: FX.back, size, s0: o.from ?? 0.5, s1: o.to ?? 1.25, life: o.life || 450, tint: o.tint ?? 0xfff1b0, alpha: o.alpha ?? 0.9,
        fade: 0.7, fadeIn: o.fadeIn || 0, delay: o.delay || 0 });
}

function fxRing(x, y, size, o = {}) {
    fxPart('ring', x, y, { layer: FX.back, size, s0: 0.25, s1: o.to || 1.7, life: o.life || 480, tint: o.tint ?? 0xfff6c8, fade: 0.6, delay: o.delay || 0 });
}

// Light rays turning slowly behind something.
function fxRays(x, y, size, o = {}) {
    fxPart('rays', x, y, { layer: FX.back, size, s0: 0.5, s1: 1.1, life: o.life || 1200, spin: 0.5, alpha: o.alpha ?? 0.7, fadeIn: 0.2, fade: 0.45,
        tint: o.tint ?? 0xffe27a, delay: o.delay || 0 });
}

function fxDust(x, y, size, n = 3) {
    for (let i = 0; i < n; i++) {
        fxPart('dust', x + (Math.random() - 0.5) * size * 0.5, y + size * (0.1 + Math.random() * 0.25), { size: size * (0.5 + Math.random() * 0.3),
            vx: (Math.random() - 0.5) * size * 1.6, vy: -size * (0.4 + Math.random() * 0.6), drag: 0.92, s0: 0.5, s1: 1.4,
            life: 480 + Math.random() * 220, tint: 0xf5ead2, alpha: 0.8, fade: 0.8, spin: (Math.random() - 0.5) * 2 });
    }
}

// Confetti thrown up from a point, or (with no point) raining over the whole screen.
function fxConfetti(n, from = null) {
    const w = innerWidth;
    for (let i = 0; i < n; i++) {
        const tint = FX_CONFETTI[i % FX_CONFETTI.length], size = 8 + Math.random() * 6;
        if (from) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 260 + Math.random() * 300;
            fxPart('bit', from.x, from.y, { tint, size, aspect: 0.55, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, drag: 0.96,
                life: 1100 + Math.random() * 600, fade: 0.3, flip: 9 + Math.random() * 8, spin: (Math.random() - 0.5) * 9, rot: Math.random() * 3 });
        } else {
            fxPart('bit', Math.random() * w, -20 - Math.random() * 160, { tint, size: size * 1.15, aspect: 0.55, vx: (Math.random() - 0.5) * 60,
                vy: 60 + Math.random() * 90, g: 110, drag: 0.995, sway: 50, life: 2600 + Math.random() * 1000, fade: 0.2, delay: Math.random() * 400,
                flip: 8 + Math.random() * 7, spin: (Math.random() - 0.5) * 5, rot: Math.random() * 3 });
        }
    }
}

// The big burst: a glow, a ring, sparkles and, for the big ones, rays.
function fxBurst(at, big = false, o = {}) {
    if (!at || !FX.app) return;
    const { x, y, size } = at;
    fxGlow(x, y, size * (big ? 2.4 : 1.6), { life: big ? 650 : 420, alpha: 0.8 });
    fxRing(x, y, size, { to: big ? 2.4 : 1.6, life: big ? 650 : 480, tint: big ? 0xffd23f : 0xfff6c8 });
    fxSparkles(x, y, big ? 14 : 8, size, { speed: big ? 3 : 2.2, stars: big || o.stars });
    if (big) fxRays(x, y, size * 2.6, { life: 900 });
}

// Coins, stars or gems flying in an arc to their counter, with a glow and a
// trail of sparkles; the counter bumps and counts up as the first one lands.
function fxFly(src, from, toEl, count, delay, big) {
    const to = toEl.getBoundingClientRect(), ex = to.left + to.width * 0.25, ey = to.top + to.height / 2;
    const tex = fxIcon(src), size = big ? 46 : 30;
    const num = toEl.querySelector('#money-val, #gems-val');
    if (num) holdNumber(num, delay + 950);
    for (let i = 0; i < count; i++) {
        const sx = from.x + (Math.random() - 0.5) * 40, sy = from.y + (Math.random() - 0.5) * 24;
        const path = [sx, sy, (sx + ex) / 2 + (Math.random() - 0.5) * 90, Math.min(sy, ey) - 60 - Math.random() * 50, ex, ey];
        const wait = delay + i * 110, life = 950;
        fxPart('glow', sx, sy, { layer: FX.back, path, size: size * 2, life, delay: wait, tint: 0xffe9a0, alpha: 0.55, fade: 0.25 });
        fxPart(tex, sx, sy, { add: false, path, size, life, delay: wait, trail: true, fade: 0.05, curve: [[0, 0.4], [0.22, 1.15], [0.6, 1], [1, 0.7]],
            onEnd: () => {
                toEl.classList.remove('bump');
                void toEl.offsetWidth;
                toEl.classList.add('bump');
                fxSparkles(ex, ey, 5, 26, { speed: 2 });
                fxGlow(ex, ey, 54, { life: 300, alpha: 0.7 });
            } });
    }
}

// Level up: rays and a glow behind the level badge, and sparkles round the new level.
function fxLevelUp() {
    const badge = fxAt(document.getElementById('btn-level'));
    if (!badge || !FX.app) return;
    fxRays(badge.x, badge.y, 260, { life: 2000, alpha: 1 });
    fxGlow(badge.x, badge.y, 150, { life: 1600, from: 0.6, to: 1.1, fadeIn: 0.15, alpha: 1 });
    fxSparkles(badge.x, badge.y, 12, 60, { speed: 2.6, stars: true });
    setTimeout(() => {
        const star = fxAt(document.querySelector('#dialog:not([hidden]) .big-count'));
        if (star) fxSparkles(star.x, star.y, 14, 80, { speed: 3.4, stars: true });
    }, 250);
}

// Now and then a twinkle on something an order or job wants, while its board is up.
function twinkleWanted() {
    if (document.hidden || fixing || !dialogEl.hidden) return;
    const items = document.querySelectorAll('.scene:not([hidden]) .item.wanted');
    if (!items.length) return;
    const r = items[Math.floor(Math.random() * items.length)].getBoundingClientRect();
    if (!r.width) return;
    const x = r.left + r.width * (0.2 + Math.random() * 0.6), y = r.top + r.height * (0.15 + Math.random() * 0.3);
    fxPart('sparkle', x, y, { layer: FX.front, size: r.width * 0.5, pop: 0.35, s1: 0.2, life: 800, spin: 2.5, fade: 0.5, tint: sparkleTint(0) });
    fxPart('shine', r.left + r.width / 2, r.top + r.height / 2, { layer: FX.back, size: r.width * 0.9, rot: -0.8, s0: 0.4, s1: 1, life: 450, alpha: 0.45, fadeIn: 0.3, fade: 0.6 });
}

// --- LITTLE ANIMATIONS ---
// Board moments get a touch of life: a merge bursts with a ring and sparks
// (more for bigger things), crates break into planks and dust, cobwebs blow
// away, and what a producer makes hops out of it to its square. They play in
// a layer over the board, so a redraw never cuts them short.
function fxLayer() {
    let el = document.getElementById('fx');
    if (!el) {
        el = document.createElement('div');
        el.id = 'fx';
        stageEl.insertBefore(el, document.getElementById('toasts'));
    }
    return el;
}

// The middle of a board square, in the stage's coordinates, and its size.
function cellCentre(mode, index) {
    const cell = document.querySelector(`#grid-${mode} .grid-cell[data-index="${index}"]`);
    if (!cell) return null;
    const r = cell.getBoundingClientRect(), st = stageEl.getBoundingClientRect();
    return { x: r.left + r.width / 2 - st.left, y: r.top + r.height / 2 - st.top, size: r.width };
}

function fxBit(cls, at, html = '') {
    const el = document.createElement('div');
    el.className = `fx ${cls}`;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    el.innerHTML = html;
    fxLayer().appendChild(el);
    return el;
}

function fxMerge(mode, index, size = 1) {
    if (FX.app) return fxBurst(fxCell(mode, index), size >= 4);
    const at = cellCentre(mode, index);
    if (!at) return;
    const big = size >= 4;
    const ring = fxBit('fx-ring' + (big ? ' big' : ''), at);
    ring.style.setProperty('--s', `${at.size}px`);
    ring.animate([{ transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0.9 }, { transform: `translate(-50%, -50%) scale(${big ? 2.2 : 1.6})`, opacity: 0 }],
        { duration: big ? 650 : 480, easing: 'ease-out' }).onfinish = () => ring.remove();
    const n = big ? 10 : 6;
    for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const dist = at.size * (big ? 0.9 : 0.65) * (0.8 + Math.random() * 0.4);
        const spark = fxBit('fx-spark' + (big ? ' gold' : ''), at, '✦');
        spark.animate([
            { transform: 'translate(-50%, -50%) scale(0.4) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(1) rotate(120deg)`, opacity: 1, offset: 0.6 },
            { transform: `translate(calc(-50% + ${Math.cos(angle) * dist * 1.15}px), calc(-50% + ${Math.sin(angle) * dist * 1.15}px)) scale(0.2) rotate(180deg)`, opacity: 0 },
        ], { duration: 520 + Math.random() * 180, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }).onfinish = () => spark.remove();
    }
}

// A crate breaks open: planks fly and fall, and a puff of dust.
function fxCrate(mode, index) {
    if (FX.app) {
        const at = fxCell(mode, index);
        if (!at) return;
        for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = at.size * (3 + Math.random() * 3);
            fxPart('bit', at.x, at.y, { tint: i % 2 ? 0xb87a42 : 0xd39a5c, size: at.size * 0.34, aspect: 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                g: at.size * 22, drag: 0.97, spin: (Math.random() - 0.5) * 14, rot: Math.random() * 3, life: 650 + Math.random() * 200, fade: 0.35 });
        }
        fxDust(at.x, at.y, at.size, 4);
        fxSparkles(at.x, at.y, 6, at.size, { speed: 2 });
        return;
    }
    const at = cellCentre(mode, index);
    if (!at) return;
    for (let i = 0; i < 5; i++) {
        const plank = fxBit('fx-plank', at);
        plank.style.setProperty('--s', `${at.size}px`);
        const dx = (Math.random() - 0.5) * at.size * 1.6, up = at.size * (0.35 + Math.random() * 0.35);
        const spin = (Math.random() - 0.5) * 540;
        plank.animate([
            { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% - ${up}px)) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.4 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${at.size * 0.6}px)) rotate(${spin}deg)`, opacity: 0 },
        ], { duration: 650 + Math.random() * 150, easing: 'cubic-bezier(0.3, 0.6, 0.6, 1)' }).onfinish = () => plank.remove();
    }
    const puff = fxBit('fx-puff', at);
    puff.style.setProperty('--s', `${at.size}px`);
    puff.animate([{ transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0.7 }, { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0 }],
        { duration: 600, easing: 'ease-out' }).onfinish = () => puff.remove();
}

// A cobweb blows away: it swells, turns and fades.
function fxWeb(mode, index) {
    const at = cellCentre(mode, index);
    if (!at) return;
    const web = fxBit('fx-web', at, uiIcon('cobweb', '🕸️'));
    web.style.setProperty('--s', `${at.size}px`);
    web.animate([{ transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 0.9 },
        { transform: 'translate(-30%, -80%) scale(1.6) rotate(25deg)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => web.remove();
}

// What a producer (or chest) makes hops out of it to its square; the producer gives a squash.
function fxSpawn(mode, from, to) {
    const a = cellCentre(mode, from), b = cellCentre(mode, to);
    const item = cellItem(mode, to), maker = cellItem(mode, from);
    if (FX.app) {
        const at = fxCell(mode, from);
        if (at) fxDust(at.x, at.y + at.size * 0.1, at.size * 0.7, 2);
    }
    if (maker) maker.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12, 0.86)', offset: 0.35 }, { transform: 'scale(0.95, 1.06)', offset: 0.7 }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'ease-out' });
    if (!a || !b || !item || from === to) return;
    // A copy makes the hop, so the real one sits in its square from the start
    // (invisible until the copy lands) and can be tapped or dragged at once.
    const r = item.getBoundingClientRect(), st = stageEl.getBoundingClientRect();
    const ghost = item.cloneNode(true);
    ghost.classList.remove('pop', 'hint-beat');
    ghost.classList.add('fx', 'fx-ghost');
    Object.assign(ghost.style, { left: `${r.left - st.left}px`, top: `${r.top - st.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    fxLayer().appendChild(ghost);
    item.style.opacity = '0';
    const dx = a.x - b.x, dy = a.y - b.y;
    ghost.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0.6 },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - b.size * 0.55}px) scale(0.85)`, opacity: 1, offset: 0.5 },
        { transform: 'translate(0, 0) scale(1.08, 0.92)', offset: 0.85 },
        { transform: 'translate(0, 0) scale(1)' },
    ], { duration: 380, easing: 'ease-out' }).onfinish = () => { ghost.remove(); item.style.opacity = ''; };
}

// The coin and gem counters count up (or down) to their new value; while
// coins or gems are flying to one, it waits for the first to land.
function rollNumber(el, value) {
    el.dataset.value = value;
    const wait = (+el.dataset.holdUntil || 0) - performance.now();
    if (wait > 0) {
        clearTimeout(el.held);
        el.held = setTimeout(() => rollNumber(el, +el.dataset.value), wait);
        return;
    }
    const from = +(el.dataset.shown ?? value);
    const show = v => { el.dataset.shown = v; el.textContent = shortNumber(v); };
    cancelAnimationFrame(el.rolling);
    if (from === value || Math.abs(value - from) > 100000) return show(value);
    const start = performance.now(), len = 600;
    const step = now => {
        const t = Math.min((now - start) / len, 1);
        show(Math.round(from + (value - from) * (1 - (1 - t) ** 3)));
        if (t < 1) el.rolling = requestAnimationFrame(step);
    };
    el.rolling = requestAnimationFrame(step);
}

function holdNumber(el, ms) {
    cancelAnimationFrame(el.rolling);
    el.dataset.holdUntil = performance.now() + ms;
    if (el.dataset.value !== undefined) rollNumber(el, +el.dataset.value);
}

// Life on the paintings: cloud shadows and birds over the farm map and the
// town, and drifting motes of light over each area.
function ambience(where) {
    const birds = n => Array.from({ length: n }, (_, i) =>
        `<i class="amb-bird" style="--i:${i}"><svg viewBox="0 0 24 10"><path d="M1 6 Q6 0 12 6 Q18 0 23 6" fill="none" stroke="#3b2a1f" stroke-width="2" stroke-linecap="round"/></svg></i>`).join('');
    if (where === 'scene-map') return `<div class="amb"><i class="amb-shadow" style="--i:0"></i><i class="amb-shadow" style="--i:1"></i><i class="amb-shadow" style="--i:2"></i><div class="amb-flock">${birds(3)}</div></div>`;
    if (where === 'scene-town') return `<div class="amb"><div class="amb-flock">${birds(2)}</div></div>`;
    if (where === 'zone') return `<div class="amb">${Array.from({ length: 7 }, (_, i) => `<i class="amb-mote" style="--i:${i}"></i>`).join('')}</div>`;
    return '';
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
    if (mode !== 'fair' && Math.random() < PART_DROP_CHANCE) {
        drop = { type: 'shop', level: 1 };
        toast(`${itemIconFor(mode, drop)} Lucky! A ${producerName(mode, 1)} part dropped.`, 'good');
    } else {
        const odds = DROP_ODDS[producerLevel(producer) - FIRST_WORKING_LEVEL];
        let roll = Math.random();
        let tier = odds.findIndex(p => (roll -= p) < 0);
        if (tier === -1) tier = 0;
        drop = { tier: Math.min(tier + charge.boost, tierCap(mode)) };
    }
    const at = spawnNear(mode, index, drop);
    stats.spawned[mode] = (stats.spawned[mode] || 0) + 1;
    sfx('tap');
    buzz(8);
    selected = { mode, index };
    checkTasks();
    refreshBoard(mode, [at]);
    fxSpawn(mode, index, at);
    if (producer.drops <= 0) offerRefill(mode, index);
}

// A land's tool producer: TOOL_CHARGES taps for ⚡1 each, then it recharges.
function tickToolbox(box, now = Date.now()) {
    if (!box.readyAt || now < box.readyAt) return false;
    box.drops = TOOL_CHARGES;
    delete box.readyAt;
    return true;
}

function tapToolbox(mode, index) {
    markGuide('toolbox');
    const box = grids[mode][index];
    tickToolbox(box);
    selected = { mode, index };
    if (box.drops <= 0) {
        refreshBoard(mode);
        return openRecharge(mode, index);
    }
    if (boardFull(mode) || !payTapEnergy(1)) return;
    box.drops--;
    if (box.drops <= 0) box.readyAt = Date.now() + TOOLS[box.chain].minutes * 60000;
    lastSale = null;
    updateUI();
    let roll = Math.random();
    let tier = TOOL_DROP_ODDS.findIndex(p => (roll -= p) < 0);
    if (tier === -1) tier = 0;
    const at = spawnNear(mode, index, { tier, chain: box.chain });
    stats.spawned[mode] = (stats.spawned[mode] || 0) + 1;
    sfx('tap');
    buzz(8);
    checkTasks();
    refreshBoard(mode, [at]);
    fxSpawn(mode, index, at);
    if (box.drops <= 0) offerRefill(mode, index);
}

// Each land you own has its tool producer: on its board if there's room,
// otherwise waiting in that board's 🎁.
function ensureToolboxes() {
    Object.entries(TOOLS).forEach(([chain, t]) => {
        if (!unlocks[t.board]) return;
        const mine = c => c && c.type === 'toolbox' && c.chain === chain;
        if (Object.values(grids).some(g => g.some(mine)) || Object.values(crates).some(c => c.some(mine))
            || inventory.items.some(e => mine(e.item))) return;
        const box = { type: 'toolbox', chain, drops: TOOL_CHARGES };
        const free = grids[t.board].indexOf(null);
        if (free !== -1) grids[t.board][free] = box;
        else crates[t.board].push(box);
    });
}

// --- Drawing the board ---

// An interface icon from ASSETS.ui in place of its emoji, or the emoji itself.
// The emoji the game writes in its text, drawn as the matching icon picture
// where there is one. The emoji stays on as hidden text (for screen readers
// and copying).
const EMOJI_ICONS = { '🎁': 'gift', '🔒': 'lock', '🔨': 'hammer', '✨': 'sparkle', '📋': 'jobs', '💵': 'coin', '💎': 'gem',
    '⭐': 'star', '⚡': 'energy', '✅': 'check', '🔥': 'offer', '🎒': 'inventory', '🎟': 'pass', '📅': 'daily', '🫙': 'jar', '🗝': 'key' };
const EMOJI_RE = new RegExp(`(${Object.keys(EMOJI_ICONS).join('|')})\uFE0F?`, 'gu');

function iconize(html) {
    return String(html).split(/(<[^>]*>)/).map(part => part.startsWith('<') ? part : part.replace(EMOJI_RE, (all, e) => {
        const src = (ASSETS.ui || {})[EMOJI_ICONS[e]];
        return src ? `<img class="ui-icon" src="${src}" alt="" draggable="false"><i class="emo">${all}</i>` : all;
    })).join('');
}

function escapeText(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function uiIcon(name, emoji) {
    const src = (ASSETS.ui || {})[name];
    return src ? `<img class="ui-icon" src="${src}" alt="${emoji}" draggable="false">` : emoji;
}

// Art for a currency item, booster, chest or Piggy Bank from ASSETS.special, if any.
function specialSprite(item) {
    if (item.type === 'bubble') return null; // drawn around its item, below
    const key = item.type === 'chest' ? `chest_${item.kind}` : item.type;
    // A level not drawn yet borrows the nearest one below (its badge says which).
    const pick = k => {
        const list = (ASSETS.special || {})[k] || [];
        for (let i = levelOf(item) - 1; i >= 0; i--) if (list[i]) return list[i];
        return null;
    };
    // A chest that's been unlocked or tapped shows its lid open, once drawn.
    if (item.type === 'chest' && (item.drops !== undefined || (item.openAt && chestReady(item)))) return pick(`${key}_open`) || pick(key);
    return pick(key);
}

// How an item looks: extra CSS classes, its inside, an inline style, and the
// small badge in the corner (tier, level or amount).
function itemFace(mode, item) {
    const emoji = e => `<span class="emoji">${e}</span>`;
    const named = (e, name) => `${emoji(e)}<span class="name">${name}</span>`;
    const sprite = src => `<img src="${src}" alt="" draggable="false">`;
    const art = specialSprite(item);
    if (art) {
        // Pictures keep the glow of a chest ready to open or a Time Charger running.
        const glow = item.type === 'chest' ? ['chest'].concat(chestReady(item) ? ['open'] : []) : item.until ? ['booster', 'running'] : [];
        return { cls: ['has-sprite', ...glow], html: sprite(art), badge: levelOf(item) };
    }
    switch (item.type) {
        case 'box':
            return ASSETS.props.crate ? { cls: ['box', 'has-sprite'], html: sprite(ASSETS.props.crate) } : { cls: ['box'], html: emoji('📦') };
        case 'shop': {
            const level = levelOf(item);
            const art = (ASSETS.producers[artKey(mode)] || [])[level - 1];
            const part = level < FIRST_WORKING_LEVEL;
            return {
                cls: (art ? ['has-sprite'] : ['generator', part ? 'part' : `gen-lv${level}`]).concat(part ? [] : ['working']),
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
            const art = !inner.type && itemSprite(chainOf(mode, inner), inner.tier);
            const bubble = ((ASSETS.special || {}).bubble || [])[0];
            return {
                cls: ['bubble-item'].concat(bubble ? ['has-art'] : [], item.ad ? ['ad-bubble'] : []),
                html: `${bubble ? `<img class="bubble-art" src="${bubble}" alt="" draggable="false">` : ''}<span class="bubble-inner">${art ? sprite(art) : emoji(itemEmojiFor(mode, inner))}</span>`
                    + (item.ad ? `<span class="bubble-ad">${uiIcon('ad', '📺')}</span>` : ''),
            };
        }
        case 'toolbox': {
            const art = (ASSETS.toolProducers || {})[item.chain];
            return {
                cls: (art ? ['has-sprite'] : ['generator', 'gen-lv4']).concat(item.drops > 0 ? ['working'] : ['empty']),
                html: art ? sprite(art) : named(TOOLS[item.chain].emoji, TOOLS[item.chain].name),
            };
        }
        default: {
            const chain = chainOf(mode, item);
            const art = itemSprite(chain, item.tier);
            if (art) return { cls: ['has-sprite'], html: sprite(art), badge: item.tier || null };
            const hue = getHue(chain, item.tier);
            return {
                cls: [],
                style: `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 70%), hsl(${hue}, 80%, 40%))`,
                html: named(itemEmoji(chain, item.tier), itemName(chain, item.tier)),
                badge: item.tier || null,
            };
        }
    }
}

// When the countdown shown on an item ends, or 0 for none.
function itemTimer(item) {
    if (isWorkingProducer(item) && !item.web && item.drops <= 0 && item.readyAt) return item.readyAt;
    if (item.type === 'toolbox' && item.readyAt) return item.readyAt;
    if (item.type === 'charger' && item.until) return item.until;
    if (item.type === 'chest' && item.openAt && !chestReady(item)) return item.openAt;
    if (item.type === 'bubble') return item.until;
    return 0;
}

function renderGrid(mode, poppedIndices = []) {
    const gridEl = document.getElementById(`grid-${mode}`);
    if (!gridEl) return;
    gridEl.innerHTML = '';
    const wanted = new Set(npcs.filter(n => n.request && n.request.mode === mode).map(n => `${mode}:${n.request.tier}`).concat(taskWanted()));

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
            if (!item.type && isFree(item) && wanted.has(`${chainOf(mode, item)}:${item.tier}`)) {
                itemEl.classList.add('wanted');
                addTag(itemEl, 'tick', '✓');
            }
            const timer = itemTimer(item);
            if (timer) {
                if (item.type === 'shop') itemEl.classList.add('empty');
                addTag(itemEl, 'gen-timer', formatDuration(timer - Date.now())).dataset.ready = timer;
            }
            if (isOutOfCharges(item)) addTag(itemEl, 'refill-tag', `💎${rechargePrice(mode, item)}`);
            if (item.type === 'chest' && !item.openAt && !chestReady(item)) addTag(itemEl, 'lock', uiIcon('lock', '🔒'));
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
let awayFor = 0; // how long the game was closed, from the save
const RECAP_AFTER_MS = 8 * 3600000; // back after this long: the story so far
// 2: one ⚡ Energy bar instead of five essentials, and producers with parts.
// 3: XP levels, inventory, chests and boosters.
// 4: restoration jobs instead of level quests.
// 5: the first-play tutorial (older saves skip it).
const SAVE_VERSION = 5;

function saveGame() {
    if (layoutMode) return; // ?layout plays on a scratch game and leaves the real one alone
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            version: SAVE_VERSION,
            res, energyAt, shop, crates, inventory, stats, quests, restoration, pass, dailyGoals, tutorial, guides, story, fair, daily, settings, unlocks, maxTier, toolTier, grids, lastBoard,
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
        quests.level = (save.quests || {}).level || 1; // version 1 saves had no quests
        quests.xp = (save.quests || {}).xp || 0;
        if (save.restoration) Object.assign(restoration, save.restoration);
        // Saves from before areas: every area already open counts as seen (no unlock replays).
        if (!save.restoration || !save.restoration.zonesOpen) restoration.zonesOpen = null;
        if (save.pass) Object.assign(pass, save.pass);
        if (save.dailyGoals) Object.assign(dailyGoals, save.dailyGoals);
        if (save.fair) Object.assign(fair, save.fair);
        Object.assign(tutorial, save.tutorial || { done: true }); // players from before the tutorial know the ropes
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
        if (save.settings && save.settings.sound === false) settings.sound = false;
        if (save.settings && save.settings.vibrate === false) settings.vibrate = false;
        if (save.settings && save.settings.music === false) settings.music = false;
        if (save.settings && save.settings.tips === false) settings.tips = false;
        if (save.guides) Object.assign(guides, save.guides);
        if (save.lastBoard && AREAS[save.lastBoard]) lastBoard = save.lastBoard;
        if (save.tickedAt) { lastTickAt = save.tickedAt; awayFor = Date.now() - save.tickedAt; }
        Object.assign(unlocks, save.unlocks);
        maxTier = save.maxTier;
        // Saves from before the Workshop Manual keep the tools they've already made.
        const owned = [...Object.values(save.grids || {}).flat(), ...Object.values(save.crates || {}).flat(), ...(save.inventory?.items || []).map(e => e.item)]
            .filter(c => c && c.chain && TOOLS[c.chain] && !c.type).map(c => c.tier);
        toolTier = typeof save.toolTier === 'number' ? save.toolTier : Math.min(7, Math.max(TOOL_TIER_START, ...owned));
        Object.keys(grids).forEach(mode => {
            if (save.grids[mode] && save.grids[mode].length === NUM_CELLS) grids[mode] = save.grids[mode];
        });
        (save.npcs || []).forEach(saved => {
            const npc = npcs.find(n => n.id === saved.id);
            if (npc) Object.assign(npc, saved);
            // Orders paid ❤️ hearts before version 3; now they pay XP.
            if (npc && npc.request && npc.request.rewardXp === undefined) npc.request.rewardXp = orderXp(npc.request.tier);
        });
        // Anyone left without an order (renamed since the save, say) gets a new one.
        npcs.forEach(n => { if (!n.request) generateRequestFor(n); });
        if (save.story) Object.assign(story, save.story);
        else {
            // Saves from before the story skip the intro and see their current day once.
            const now = currentChapter();
            Object.assign(story, { intro: true, seen: CHAPTERS.map((_, i) => i).filter(i => now === -1 || i < now), ended: now === -1 });
        }
        if (!restoration.zonesOpen) restoration.zonesOpen = ZONES.filter(zoneOpen).map(z => z.id);
        return true;
    } catch (e) {
        return false;
    }
}

// Initial setup
// Over the whole screen, the top bar too, so the hand can point at its buttons.
document.body.appendChild(tutorialEl);
document.querySelectorAll('[data-ui]').forEach(el => { el.innerHTML = uiIcon(el.dataset.ui, el.textContent); });
// The UI kit's pictures, for the page's CSS (var(--kit-btn-green) and so on).
Object.entries(ASSETS.kit || {}).forEach(([name, src]) => {
    if (!src) return;
    document.documentElement.style.setProperty(`--kit-${name.replace(/_/g, '-')}`, `url("${src}")`);
    document.documentElement.classList.add('kit');
});
['map', 'town', 'market'].forEach(id => {
    document.getElementById(`scene-${id}`).style.backgroundImage = `url("${ASSETS.scenes[id]}")`;
});
if (layoutMode || !loadGame()) {
    initTown(true);
    grids.barn = tutorialBoard(clutterBoard());
}
if (layoutMode) {
    // ?layout: straight to the plots, all open, with no tutorial or story.
    tutorial.done = true;
    story.intro = true;
    unlocks.barn = unlocks.farm = true;
}
// Every land you own has its tool producer (older saves get theirs now); a
// new game's wait until the tutorial is over.
if (tutorial.done) ensureToolboxes();
// Jobs already ready when the game opens are shown by the 📋 badge, not announced.
openTasks().filter(taskReady).forEach(task => announcedTasks.add(task.id));
checkTasks();
syncSeason();
syncFair();
tickEnergy(); // catch up on energy and timers that ran while the game was closed
tickBoards();
addXp(0); // a migrated save may already have enough XP for its next level
claimDailyBasket();
claimPassGems();
syncDailyGoals();
Object.keys(grids).forEach(mode => renderGrid(mode));
updateUI();
goTo('map');
// A new game opens with the story's intro (its daily gift comes after the
// tutorial). Otherwise the first visit each day opens the daily gift, as in Merge Gardens.
if (layoutMode) {
    fixLand = 'barn';
    goTo('fix');
} else if (!story.intro) setTimeout(playOpening, 150);
else if (!tutorial.done) giftAfterTutorial = true; // back mid-tutorial: the gift still waits for its end
else if (dailyAvailable()) setTimeout(openDailyGift, 600);
// Back after a while: the story so far, once you're on the map (after the gift).
if (!layoutMode && story.intro && tutorial.done && awayFor > RECAP_AFTER_MS) {
    const recap = storyRecap();
    if (recap) storyQueue.push(recap);
}
if (Sales.debug) setTimeout(openSalesReport, 900);

setInterval(() => {
    tickEnergy();
    const changed = tickBoards();
    // Redraw a board when one of its timers ends, but not mid-drag (the drop redraws it).
    if (changed.includes(currentScene) && !draggedItemInfo) refreshBoard(currentScene);
    claimDailyBasket();
    syncSeason();
    claimPassGems();
    syncDailyGoals();
    syncFair();
    checkOffers();
    checkSalesPause();
    showFairResults();
    syncStory();
    // An area that opened while a card was up plays its unlock once it's closed.
    if (currentScene === 'fix') unlockNewZones(fixLand, document.querySelector('#scene-fix .world'));
    updateTutorial();
    idleHint();
    updateUI();
    updateCountdowns();
    saveGame();
}, 1000);
addEventListener('pagehide', saveGame);

// The map's big pictures, decoded in the background soon after start, so they
// are ready when you drag to them instead of popping in late.
const preloaded = [];
(window.requestIdleCallback || (go => setTimeout(go, 1500)))(() => {
    const A = ASSETS, srcs = [...Object.values(A.plots || {}), (A.world || {}).ground, ...Object.values((A.world || {}).scenery || {}),
        A.hero && A.hero.stand, ...Object.values(A.characters || {})].filter(Boolean);
    srcs.forEach(src => {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
        if (img.decode) img.decode().catch(() => {});
        preloaded.push(img);
    });
});

// The sparkle layer, once the game is up and the phone has a moment.
setTimeout(() => (window.requestIdleCallback || (go => go()))(loadFx, { timeout: 3000 }), 1200);

// Installable and playable offline (on the published site; not while developing).
// In the Android app the game is already on the phone: no service worker,
// and the phone's back button closes a dialog, then steps back, and on the map leaves.
if (nativeApp && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => {
        if (openingOn) return;
        if (!dialogEl.hidden) return closeDialog();
        if (currentScene !== 'map') return goTo(AREAS[currentScene] && fixLand === currentScene ? 'fix' : 'map');
        window.Capacitor.Plugins.App.minimizeApp();
    });
}
if ('serviceWorker' in navigator && location.protocol === 'https:' && !nativeApp) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* the game works without it */ });
}
