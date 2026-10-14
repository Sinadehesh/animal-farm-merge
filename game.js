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
            { drops: 10, minutes: 1, skip: 2, contents: [['part', 1, 57], ['coin', 1, 11], ['coin', 2, 7], ['coin', 3, 3], ['energy', 1, 11], ['energy', 2, 7], ['energy', 3, 3]] },
            { drops: 22, minutes: 5, skip: 10, contents: [['part', 1, 26], ['part', 2, 15], ['coin', 1, 14], ['coin', 2, 8], ['coin', 3, 7], ['energy', 1, 14], ['energy', 2, 8], ['energy', 3, 7]] },
            // Levels 3-4 go past Merge Mansion's two, on the same curve (its Red Chest takes 3h).
            { drops: 34, minutes: 20, skip: 28, contents: [['part', 1, 18], ['part', 2, 18], ['part', 3, 8], ['coin', 2, 12], ['coin', 3, 10], ['coin', 4, 6], ['energy', 2, 12], ['energy', 3, 10], ['energy', 4, 6]] },
            { drops: 48, minutes: 60, skip: 70, contents: [['part', 2, 22], ['part', 3, 12], ['part', 4, 4], ['coin', 3, 14], ['coin', 4, 10], ['coin', 5, 6], ['energy', 3, 14], ['energy', 4, 10], ['gem', 1, 8]] },
        ],
    },
    blue: {
        emoji: '🧰', name: 'Blue Chest',
        levels: [
            { drops: 10, minutes: 5, skip: 10, contents: [['part', 1, 46], ['part', 2, 20], ['coin', 1, 9], ['coin', 2, 5], ['coin', 3, 3], ['energy', 1, 9], ['energy', 2, 5], ['energy', 3, 3]] },
            { drops: 22, minutes: 10, skip: 19, contents: [['part', 1, 23], ['part', 2, 19], ['part', 3, 7], ['coin', 1, 13], ['coin', 2, 9], ['coin', 3, 5], ['energy', 1, 13], ['energy', 2, 9], ['energy', 3, 5]] },
            { drops: 34, minutes: 40, skip: 45, contents: [['part', 2, 22], ['part', 3, 14], ['part', 4, 5], ['coin', 2, 12], ['coin', 3, 9], ['coin', 4, 6], ['energy', 2, 12], ['energy', 3, 9], ['energy', 4, 6], ['gem', 1, 5]] },
            { drops: 48, minutes: 120, skip: 120, contents: [['part', 3, 20], ['part', 4, 10], ['part', 5, 3], ['coin', 3, 13], ['coin', 4, 10], ['coin', 5, 7], ['energy', 3, 13], ['energy', 4, 10], ['gem', 1, 8], ['gem', 2, 6]] },
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

// Rewarded ads, a few a day in all: a free energy top-up, an instant producer
// recharge, or a doubled daily gift.
const AD_ENERGY = 20;
const ADS_PER_DAY = 8;

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
const DAILY_BASKET = { id: 'daily_basket', name: '30 Day Daily Basket', gemsPerDay: 10, days: 30, price: '$3.99' }; // 💎300: about 2× a $3.99 pack
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
const FAIR_RIVALS = [['robin', 0.45], ['willy', 0.7], ['sandy', 0.9], ['mayor', 1.1], ['marnie', 1.35]];
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
    'fert': ['🍂 Fallen Leaf', '🍁 Leaf Pile', '🥕 Veggie Scraps', '🌱 Compost', '🪴 Rich Soil', '🍄 Mushroom', '✨ Basic Fert', '🌟 Quality Fert', '⚡ Speed-Gro', '💎 Deluxe Fert', '🔮 Magic Fert', '🌌 Iridium Fert'],
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

// The highest tier you can merge to: the Growth Guide's on the lands, the whole
// chain at the Fair.
function tierCap(mode) {
    if (TOOLS[mode]) return NAMES[mode].length - 1;
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
    farm:   { name: 'Crop Field',    cost: 200,  level: 2, pay: 10, desc: 'Grow crops with fertilizer.' },
    hay:    { name: 'Hay Field',     cost: 400,  level: 3, pay: 15, desc: 'Grow hay from wheat.' },
    fert:   { name: 'Compost Yard',  cost: 800,  level: 4, pay: 20, desc: 'Make your own fertilizer.' },
    aqua:   { name: 'Fish Pond',     cost: 2000, level: 5, pay: 20, desc: 'Raise frogs, fish and ducks with fish food.' },
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
            if (cell.type === 'toolbox' && tickToolbox(cell, now)) changed = true;
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
    if (!spendGems(rechargePrice(mode, item))) return;
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

// Takes gems if you have enough; otherwise sends you to the shop.
function spendGems(n) {
    if (res.gems < n) {
        openShop(`You need 💎 ${n - res.gems} more.`);
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
    const actions = [{ label: `Buy ⚡ ${ENERGY_PACK} · 💎 ${energyPrice()}`, primary: true, wide: true, onClick: buyEnergy }];
    if (ads > 0) actions.push({ icon: uiIcon('ad', '📺'), label: `Watch an ad · +⚡ ${AD_ENERGY} (${ads} left today)`, wide: true, onClick: watchAdForEnergy });
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
    if (!pass.golden) actions.push({ label: `🎟️ ${GOLDEN_PASS.name}: golden rewards, 💎${GOLDEN_PASS.gemsPerDay} a day · ${GOLDEN_PASS.price}`, primary: true, wide: true, onClick: () => buyGoldenPass() });
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
    sfx('buy');
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
        // Shown after whatever called this has redrawn the scene.
        setTimeout(() => showLevelUp(quests.level, reward), 350);
    }
    updateUI();
}

function showLevelUp(level, reward) {
    if (level !== quests.level) return; // a later level-up has its own popup
    celebrate('level');
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
    { id: 'barn1', land: 'barn', zone: 'barnyard', at: [18, 46], look: ['planks', ''], story: [['robin', 'Hi! I fix things!']],
      name: 'Clear the planks', who: 'mayor', xp: 1, needs: [{ stat: 'boxes', n: 1 }], line: 'Great job!' },
    { id: 'barn2', land: 'barn', zone: 'barnyard', at: [35, 61], look: ['weeds', ''], after: ['barn1'],
      name: 'Pull the weeds', who: 'marnie', xp: 1, needs: [{ item: 'barn', tier: 0, n: 2 }], line: 'Weeds gone!' },
    { id: 'barn3', land: 'barn', zone: 'barnyard', at: [22, 86], look: ['branch', ''], after: ['barn1'],
      name: 'Move the fallen branch', who: 'robin', xp: 1, needs: [{ item: 'tools', tier: 1, n: 1 }], line: 'Heave!' },
    { id: 'barn4', land: 'barn', zone: 'barnyard', at: [7, 33], look: ['feedbin_broken', 'feedbin'], after: ['barn2'],
      name: 'Fix the feed bin', who: 'robin', xp: 2, needs: [{ item: 'tools', tier: 2, n: 1 }], line: 'Good as new!' },
    { id: 'barn5', land: 'barn', zone: 'barnyard', at: [10, 65], look: ['fence_broken', 'fence'], after: ['barn3'],
      name: 'Mend the fence', who: 'robin', xp: 2, needs: [{ item: 'tools', tier: 1, n: 2 }], line: 'Nice fence!' },
    { id: 'barn6', land: 'barn', zone: 'barnyard', at: [72, 75], look: ['wheelbarrow_broken', 'wheelbarrow'], after: ['barn4', 'barn5'],
      name: 'Fix the wheelbarrow', who: 'marnie', xp: 2, needs: [{ item: 'tools', tier: 3, n: 1 }], line: 'It rolls!' },
    { id: 'barn7', land: 'barn', zone: 'barnyard', at: [88, 50], look: ['pump_broken', 'pump'], after: ['barn6'],
      name: 'Clean the water pump', who: 'marnie', xp: 2, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'barn', tier: 1, n: 1 }], line: 'Fresh water!' },
    { id: 'barn8', land: 'barn', zone: 'barnyard', at: [18, 76], look: ['junk', 'firewood'], after: ['barn6'],
      name: 'Haul away the junk', who: 'mayor', xp: 2, needs: [{ stat: 'sold', n: 3 }], line: 'Much tidier!' },
    { id: 'barn9', land: 'barn', zone: 'barnyard', at: [70, 31], look: ['', 'lantern'], after: ['barn7'],
      name: 'Put up a lantern', who: 'robin', xp: 3, needs: [{ item: 'tools', tier: 2, n: 2 }], line: 'So bright!' },
    { id: 'barn10', land: 'barn', zone: 'barnyard', at: [90, 86], look: ['', 'mailbox'], after: ['barn8'],
      name: 'Put up a mailbox', who: 'mayor', xp: 3, needs: [{ item: 'tools', tier: 4, n: 1 }], line: 'Mail!' },
    { id: 'barn11', land: 'barn', zone: 'barnyard', at: [55, 89], look: ['', 'tulips'], after: ['barn9', 'barn10', 'barn28', 'barn29'], reward: { chest: 'brown' },
      name: 'Plant tulips', who: 'marnie', xp: 4, needs: [{ item: 'barn', tier: 3, n: 1 }, { item: 'barn', tier: 1, n: 2 }], line: 'Pretty!' },
    // Hen House (day 2)
    { id: 'hen1', land: 'barn', zone: 'henhouse', at: [50, 66], look: ['straw_mess', ''],
      name: 'Sweep up the old straw', who: 'marnie', xp: 2, needs: [{ stat: 'webs', n: 3 }], line: 'So clean!' },
    { id: 'hen2', land: 'barn', zone: 'henhouse', at: [84, 50], look: ['sacks', ''],
      name: 'Clear out the old sacks', who: 'mayor', xp: 2, needs: [{ stat: 'sold', n: 2 }], line: 'Bye, sacks!' },
    { id: 'hen3', land: 'barn', zone: 'henhouse', at: [50, 44], look: ['nest_empty', 'nest_chicks'], after: ['hen1'],
      name: 'Fix the nest', who: 'marnie', xp: 3, needs: [{ item: 'barn', tier: 2, n: 2 }], line: 'So cute!' },
    { id: 'hen4', land: 'barn', zone: 'henhouse', at: [18, 40], look: ['wire_torn', 'wire_fixed'], after: ['hen2'],
      name: 'Patch the chicken wire', who: 'robin', xp: 3, needs: [{ item: 'tools', tier: 3, n: 2 }], line: 'No foxes!' },
    { id: 'hen5', land: 'barn', zone: 'henhouse', at: [20, 60], look: ['trough_empty', 'trough_full'], after: ['hen1'],
      name: 'Fill the water trough', who: 'marnie', xp: 3, needs: [{ item: 'barn', tier: 1, n: 3 }], line: 'Splash!' },
    { id: 'hen6', land: 'barn', zone: 'henhouse', at: [62, 30], look: ['perch_broken', 'hen_perch'], after: ['hen3'],
      name: 'Fix the perch', who: 'robin', xp: 4, needs: [{ item: 'tools', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'hen7', land: 'barn', zone: 'henhouse', at: [25, 70], look: ['feeder_rusty', 'feeder'], after: ['hen4', 'hen5'],
      name: 'Fix the feeder', who: 'marnie', xp: 4, needs: [{ item: 'barn', tier: 3, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Yum!' },
    { id: 'hen8', land: 'barn', zone: 'henhouse', at: [86, 73], look: ['basket_empty', 'basket_eggs'], after: ['hen6'], reward: { chest: 'brown' },
      name: 'Fill the egg basket', who: 'marnie', xp: 4, needs: [{ item: 'barn', tier: 1, n: 4 }], line: 'Eggs! Yay!' },
    { id: 'hen9', land: 'barn', zone: 'henhouse', at: [70, 86], look: ['', 'coop'], after: ['hen7'],
      name: 'Build a little coop', who: 'robin', xp: 5, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'tools', tier: 1, n: 2 }], line: 'A new home!' },
    { id: 'hen10', land: 'barn', zone: 'henhouse', at: [32, 86], look: ['', 'nestbox'], after: ['hen8', 'hen9', 'barn46', 'barn47'], reward: { chest: 'blue' },
      name: 'Make a nest box', who: 'marnie', xp: 6, needs: [{ item: 'barn', tier: 4, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'The hens are back!' },
    // Barn Storeroom (day 2)
    { id: 'big1', land: 'barn', zone: 'bigbarn', at: [40, 57], look: ['counter_broken', 'counter'],
      name: 'Mend the broken table', who: 'robin', xp: 5, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'barn', tier: 4, n: 1 }], line: 'Good as new!' },
    { id: 'big2', land: 'barn', zone: 'bigbarn', at: [70, 69], look: ['scrolls_spilled', ''],
      name: 'Pick up the spilled scrolls', who: 'marnie', xp: 5, needs: [{ item: 'barn', tier: 3, n: 2 }], line: 'Tidy!' },
    { id: 'big3', land: 'barn', zone: 'bigbarn', at: [65, 32], look: ['shelf_broken', 'shelf'], after: ['big1'],
      name: 'Fix the old shelves', who: 'robin', xp: 5, needs: [{ stat: 'upgrades', n: 1 }], line: 'Sturdy!' },
    { id: 'big4', land: 'barn', zone: 'bigbarn', at: [86, 61], look: ['sacks_spilled', 'sacks_stacked'], after: ['big2'],
      name: 'Stack the seed sacks', who: 'marnie', xp: 6, needs: [{ item: 'barn', tier: 4, n: 1 }], line: 'Neat!' },
    { id: 'big5', land: 'barn', zone: 'bigbarn', at: [12, 80], look: ['jars_fallen', 'jars'], after: ['big3'],
      name: 'Sort out the jars', who: 'robin', xp: 6, needs: [{ item: 'tools', tier: 6, n: 1 }], line: 'All sorted!' },
    { id: 'big6', land: 'barn', zone: 'bigbarn', at: [36, 74], look: ['basket_tipped', 'basket_full'], after: ['big4'],
      name: 'Mend the basket', who: 'mayor', xp: 7, needs: [{ item: 'tools', tier: 5, n: 1 }], line: 'Cozy!' },
    { id: 'big7', land: 'barn', zone: 'bigbarn', at: [15, 36], look: ['crate_empty', 'crate_full'], after: ['big5', 'big6'],
      name: 'Fill the crates', who: 'marnie', xp: 8, needs: [{ item: 'barn', tier: 5, n: 1 }, { item: 'barn', tier: 3, n: 1 }], line: 'Full up!' },
    { id: 'big8', land: 'barn', zone: 'bigbarn', at: [62, 92], look: ['rug_torn', 'rug'], after: ['big7', 'barn64', 'barn65'], reward: { chest: 'blue' },
      name: 'Weave a new rug', who: 'marnie', xp: 10, needs: [{ item: 'barn', tier: 6, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'Beautiful!' },
    // Crop Field (day 3): bought first, then its three areas.
    { id: 'farm1', land: 'farm', story: [['marnie', 'Let\'s grow food!']], name: 'Buy the Crop Field', who: 'mayor', xp: 3, needs: [{ own: 'farm' }],
      line: 'Your field!' },
    { id: 'farm2', land: 'farm', zone: 'fieldgate', at: [12, 72], look: ['weeds_thorny', ''], after: ['farm1'],
      name: 'Pull the thorny weeds', who: 'marnie', xp: 3, needs: [{ item: 'garden', tier: 1, n: 1 }], line: 'Ouch! Done!' },
    { id: 'farm3', land: 'farm', zone: 'fieldgate', at: [35, 45], look: ['rock', ''], after: ['farm1'],
      name: 'Roll away the rock', who: 'robin', xp: 3, needs: [{ stat: 'boxes', n: 3 }], line: 'Heave!' },
    { id: 'farm4', land: 'farm', zone: 'fieldgate', at: [82, 70], look: ['brush', ''], after: ['farm2'],
      name: 'Clear the dead brush', who: 'marnie', xp: 3, needs: [{ item: 'garden', tier: 0, n: 2 }], line: 'All clear!' },
    { id: 'farm5', land: 'farm', zone: 'fieldgate', at: [32, 31], look: ['scarecrow_fallen', 'scarecrow'], after: ['farm3'],
      name: 'Fix the scarecrow', who: 'robin', xp: 4, needs: [{ item: 'garden', tier: 2, n: 1 }], line: 'Boo, crows!' },
    { id: 'farm6', land: 'farm', zone: 'fieldgate', at: [55, 70], look: ['gate_broken', 'gate'], after: ['farm4', 'farm5'],
      name: 'Fix the gate', who: 'robin', xp: 4, needs: [{ item: 'tools', tier: 3, n: 1 }], line: 'Nice gate!' },
    { id: 'farm7', land: 'farm', zone: 'fieldgate', at: [70, 48], look: ['seedcart_tipped', 'seedcart'], after: ['farm6'],
      name: 'Set the seed cart right', who: 'marnie', xp: 4, needs: [{ item: 'farm', tier: 1, n: 3 }], line: 'Seeds!' },
    { id: 'farm8', land: 'farm', zone: 'fieldgate', at: [15, 25], look: ['plough_rusty', 'plough'], after: ['farm6'],
      name: 'Clean up the old plough', who: 'robin', xp: 5, needs: [{ item: 'garden', tier: 3, n: 1 }], line: 'Shiny!' },
    { id: 'farm9', land: 'farm', zone: 'fieldgate', at: [52, 17], look: ['birdhouse_broken', 'birdhouse'], after: ['farm7'],
      name: 'Put up a birdhouse', who: 'marnie', xp: 5, needs: [{ item: 'tools', tier: 1, n: 2 }], line: 'Tweet!' },
    { id: 'farm10', land: 'farm', zone: 'fieldgate', at: [70, 88], look: ['', 'signpost'], after: ['farm8', 'farm9', 'farm45', 'farm46'], reward: { chest: 'brown' },
      name: 'Put up a signpost', who: 'mayor', xp: 6, needs: [{ item: 'farm', tier: 3, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'Welcome!' },
    { id: 'farm11', land: 'farm', zone: 'berryrows', at: [60, 35], look: ['bed_bare', 'bed_young'],
      name: 'Dig the first bed', who: 'marnie', xp: 5, needs: [{ item: 'garden', tier: 1, n: 2 }], line: 'Dig dig!' },
    { id: 'farm12', land: 'farm', zone: 'berryrows', at: [55, 50], look: ['berries_wilted', 'berries_ripe'],
      name: 'Water the wilted plants', who: 'marnie', xp: 5, needs: [{ item: 'garden', tier: 4, n: 1 }], line: 'Berries!' },
    { id: 'farm13', land: 'farm', zone: 'berryrows', at: [20, 57], look: ['barrel_broken', 'barrel_full'], after: ['farm11'],
      name: 'Fix the water barrel', who: 'robin', xp: 6, needs: [{ item: 'tools', tier: 3, n: 1 }], line: 'No leaks!' },
    { id: 'farm14', land: 'farm', zone: 'berryrows', at: [30, 66], look: ['netting_tangled', 'netting'], after: ['farm12'],
      name: 'Untangle the netting', who: 'marnie', xp: 6, needs: [{ item: 'garden', tier: 2, n: 1 }], line: 'No birds!' },
    { id: 'farm15', land: 'farm', zone: 'berryrows', at: [80, 60], look: ['molehole', ''], after: ['farm13'],
      name: 'Fill in the mole hole', who: 'robin', xp: 6, needs: [{ item: 'garden', tier: 1, n: 1 }, { item: 'farm', tier: 0, n: 2 }], line: 'Bye, mole!' },
    { id: 'farm16', land: 'farm', zone: 'berryrows', at: [85, 78], look: ['weeds_straw', 'straw_mulch'], after: ['farm14'],
      name: 'Spread fresh straw', who: 'marnie', xp: 7, needs: [{ stat: 'sold', n: 3 }], line: 'Cozy beds!' },
    { id: 'farm17', land: 'farm', zone: 'berryrows', at: [35, 90], look: ['baskets_tipped', 'baskets_berries'], after: ['farm15', 'farm16'],
      name: 'Fill the baskets', who: 'marnie', xp: 7, needs: [{ item: 'farm', tier: 3, n: 2 }], line: 'Yum!' },
    { id: 'farm18', land: 'farm', zone: 'berryrows', at: [44, 10], look: ['stand_broken', 'stand'], after: ['farm17', 'farm63', 'farm64'], reward: { chest: 'blue' },
      name: 'Open the berry stand', who: 'mayor', xp: 8, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'farm', tier: 3, n: 1 }], line: 'Fresh berries!' },
    { id: 'farm19', land: 'farm', zone: 'orchard', at: [55, 47], look: ['branch_big', ''],
      name: 'Clear the fallen branch', who: 'robin', xp: 8, needs: [{ item: 'garden', tier: 3, n: 1 }], line: 'Timber!' },
    { id: 'farm20', land: 'farm', zone: 'orchard', at: [45, 53], look: ['apples_rotten', 'apples_basket'],
      name: 'Pick up the old apples', who: 'marnie', xp: 8, needs: [{ item: 'garden', tier: 0, n: 3 }], line: 'Fresh ones!' },
    { id: 'farm21', land: 'farm', zone: 'orchard', at: [25, 63], look: ['wall_rubble', 'wall'], after: ['farm19'],
      name: 'Mend the stone wall', who: 'robin', xp: 9, needs: [{ item: 'tools', tier: 3, n: 2 }], line: 'Solid!' },
    { id: 'farm22', land: 'farm', zone: 'orchard', at: [80, 74], look: ['crate_broken', 'crates_apples'], after: ['farm20'],
      name: 'Fix the apple crates', who: 'robin', xp: 9, needs: [{ item: 'wood', tier: 3, n: 1 }], line: 'Stacked!' },
    { id: 'farm23', land: 'farm', zone: 'orchard', at: [25, 77], look: ['stump', 'stump_table'], after: ['farm21'],
      name: 'Turn the stump into a table', who: 'robin', xp: 10, needs: [{ item: 'tools', tier: 4, n: 1 }], line: 'A table!' },
    { id: 'farm24', land: 'farm', zone: 'orchard', at: [72, 87], look: ['beehive_broken', 'beehive'], after: ['farm22'],
      name: 'Rehome the bees', who: 'sandy', xp: 10, needs: [{ item: 'farm', tier: 5, n: 2 }], line: 'Buzz!' },
    { id: 'farm25', land: 'farm', zone: 'orchard', at: [28, 89], look: ['brambles', ''], after: ['farm23'],
      name: 'Cut back the brambles', who: 'marnie', xp: 10, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Ouch, done!' },
    { id: 'farm26', land: 'farm', zone: 'orchard', at: [80, 62], look: ['swing_broken', 'swing'], after: ['farm24'],
      name: 'Hang up the swing', who: 'robin', xp: 11, needs: [{ item: 'garden', tier: 4, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Whee!' },
    { id: 'farm27', land: 'farm', zone: 'orchard', at: [60, 80], look: ['', 'sapling'], after: ['farm25', 'farm26'], reward: { chest: 'blue' },
      name: 'Plant a new apple tree', who: 'marnie', xp: 12, needs: [{ item: 'farm', tier: 8, n: 1 }, { item: 'garden', tier: 5, n: 1 }], line: 'Grow, little tree!' },
    { id: 'farm28', land: 'farm', zone: 'orchard', at: [55, 93], look: ['', 'picnic'], after: ['farm27', 'farm81', 'farm82'],
      name: 'Lay out a picnic', who: 'mayor', xp: 14, needs: [{ item: 'farm', tier: 9, n: 1 }, { item: 'garden', tier: 6, n: 1 }], line: 'Lovely!' },
    // Hay Field (day 3)
    { id: 'hay1', land: 'hay', name: 'Buy the Hay Field', who: 'mayor', xp: 4, needs: [{ own: 'hay' }],
      line: 'More land!' },
    // Meadow: the sheep's pasture, its path and vegetable beds.
    { id: 'hay2', land: 'hay', zone: 'meadow', at: [45, 47], look: ['🕸️', ''], after: ['hay1'],
      name: 'Clear out the old straw', who: 'marnie', xp: 5, needs: [{ stat: 'webs', n: 4 }], line: 'Fresh straw!' },
    { id: 'hay3', land: 'hay', zone: 'meadow', at: [78, 66], look: ['🍂', '🌾'], after: ['hay1'],
      name: 'Tie the first bundles', who: 'marnie', xp: 6, needs: [{ item: 'hay', tier: 2, n: 2 }], line: 'Neat bundles!' },
    { id: 'hay7', land: 'hay', zone: 'meadow', at: [55, 32], look: ['🍂', ''], after: ['hay2'],
      name: 'Rake the path', who: 'marnie', xp: 6, needs: [{ item: 'garden', tier: 3, n: 1 }], line: 'Tidy path!' },
    { id: 'hay8', land: 'hay', zone: 'meadow', at: [15, 60], look: ['🚧', '🪵'], after: ['hay3'],
      name: 'Fence the vegetable beds', who: 'robin', xp: 7, needs: [{ item: 'wood', tier: 2, n: 2 }], line: 'Keep out, bunnies!' },
    { id: 'hay9', land: 'hay', zone: 'meadow', at: [35, 20], look: ['🐑', '🐑'], after: ['hay7'], story: [['marnie', 'The sheep are back!']],
      name: 'Shear the sheep', who: 'marnie', xp: 7, needs: [{ item: 'garden', tier: 2, n: 1 }, { item: 'hay', tier: 1, n: 2 }], line: 'Baa!' },
    { id: 'hay10', land: 'hay', zone: 'meadow', at: [85, 50], look: ['🟫', '🌱'], after: ['hay8'],
      name: 'Plant the beds', who: 'marnie', xp: 8, needs: [{ item: 'garden', tier: 1, n: 2 }, { item: 'hay', tier: 0, n: 3 }], line: 'Grow!' },
    { id: 'hay11', land: 'hay', zone: 'meadow', at: [88, 84], look: ['🥀', '🧑‍🌾'], after: ['hay9', 'hay10'],
      name: 'Dress up the scarecrow', who: 'robin', xp: 8, needs: [{ item: 'hay', tier: 3, n: 1 }, { item: 'tools', tier: 1, n: 1 }], line: 'Dapper!' },
    { id: 'hay12', land: 'hay', zone: 'meadow', at: [80, 38], look: ['🍂', '🍎'], after: ['hay11', 'hay44', 'hay45'], reward: { chest: 'brown' },
      name: 'Pick the meadow apples', who: 'mayor', xp: 9, needs: [{ item: 'hay', tier: 4, n: 1 }, { stat: 'sold', n: 4 }], line: 'Crunchy!' },
    // Stables: the horses' stalls, their paddock and its fence.
    { id: 'hay13', land: 'hay', zone: 'stables', at: [50, 28], look: ['🧲', ''],
      name: 'Pick up the old horseshoes', who: 'marnie', xp: 8, needs: [{ item: 'garden', tier: 0, n: 2 }], line: 'Lucky!' },
    { id: 'hay4', land: 'hay', zone: 'stables', at: [30, 34], look: ['🌾', '🟫'],
      name: 'Stack the bales', who: 'robin', xp: 10, needs: [{ item: 'wood', tier: 2, n: 2 }, { item: 'hay', tier: 3, n: 1 }], line: 'Stacked!' },
    { id: 'hay14', land: 'hay', zone: 'stables', at: [45, 48], look: ['🚧', '🪵'], after: ['hay13'],
      name: 'Mend the paddock fence', who: 'robin', xp: 9, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Good fence!' },
    { id: 'hay15', land: 'hay', zone: 'stables', at: [40, 80], look: ['🕳️', ''], after: ['hay4'],
      name: 'Fill the mud holes', who: 'marnie', xp: 9, needs: [{ item: 'hay', tier: 1, n: 3 }, { item: 'garden', tier: 1, n: 1 }], line: 'No more mud!' },
    { id: 'hay16', land: 'hay', zone: 'stables', at: [20, 24], look: ['🚪', '🚪'], after: ['hay14'],
      name: 'Fix the stall doors', who: 'robin', xp: 10, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'Click!' },
    { id: 'hay17', land: 'hay', zone: 'stables', at: [60, 62], look: ['🛁', '💧'], after: ['hay15'],
      name: 'Fill the water trough', who: 'marnie', xp: 10, needs: [{ item: 'hay', tier: 4, n: 1 }], line: 'Drink up!' },
    { id: 'hay18', land: 'hay', zone: 'stables', at: [20, 66], look: ['', '🏠'], after: ['hay16', 'hay17'], story: [['robin', 'A new stall!']],
      name: 'Build a second stall', who: 'robin', xp: 11, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Room for two!' },
    { id: 'hay19', land: 'hay', zone: 'stables', at: [80, 78], look: ['', '🐎'], after: ['hay18'],
      name: 'Hang up the saddle', who: 'marnie', xp: 11, needs: [{ item: 'hay', tier: 5, n: 1 }], line: 'Giddy up!' },
    { id: 'hay5', land: 'hay', zone: 'stables', at: [50, 14], look: ['🏚️', '🏠'], after: ['hay19', 'hay62', 'hay63'], reward: { chest: 'blue' },
      name: 'Repair the hay loft', who: 'robin', xp: 12, needs: [{ item: 'hay', tier: 5, n: 1 }, { item: 'wood', tier: 4, n: 1 }], line: 'Good as new!' },
    // Windmill: torn sails, a door off its hinges, sacks everywhere.
    { id: 'hay20', land: 'hay', zone: 'windmill', at: [35, 58], look: ['🎒', ''], story: [['marnie', 'The old windmill!']],
      name: 'Pick up the spilled sacks', who: 'marnie', xp: 10, needs: [{ item: 'hay', tier: 2, n: 3 }], line: 'All picked up!' },
    { id: 'hay21', land: 'hay', zone: 'windmill', at: [72, 44], look: ['🌿', ''],
      name: 'Pull the weeds by the walls', who: 'marnie', xp: 10, needs: [{ item: 'garden', tier: 1, n: 2 }], line: 'Weeds gone!' },
    { id: 'hay22', land: 'hay', zone: 'windmill', at: [40, 51], look: ['🚪', '🚪'], after: ['hay20'],
      name: 'Hang the door back on', who: 'robin', xp: 11, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'Creak, click!' },
    { id: 'hay23', land: 'hay', zone: 'windmill', at: [55, 40], look: ['🧱', '🧱'], after: ['hay21'],
      name: 'Patch the cracked walls', who: 'robin', xp: 11, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'hay', tier: 3, n: 2 }], line: 'Solid!' },
    { id: 'hay24', land: 'hay', zone: 'windmill', at: [22, 28], look: ['🪵', '🪵'], after: ['hay22', 'hay23'],
      name: 'Fix the sail frames', who: 'robin', xp: 12, needs: [{ item: 'wood', tier: 4, n: 2 }], line: 'Strong frames!' },
    { id: 'hay25', land: 'hay', zone: 'windmill', at: [80, 16], look: ['🏳️', '⛵'], after: ['hay24'],
      name: 'Sew new sails', who: 'sandy', xp: 13, needs: [{ item: 'hay', tier: 5, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'So white!' },
    { id: 'hay26', land: 'hay', zone: 'windmill', at: [68, 45], look: ['', '🌸'], after: ['hay24'],
      name: 'Put up flower boxes', who: 'sandy', xp: 12, needs: [{ item: 'wood', tier: 2, n: 2 }, { stat: 'sold', n: 5 }], line: 'Pretty!' },
    { id: 'hay27', land: 'hay', zone: 'windmill', at: [80, 58], look: ['', '🪑'], after: ['hay26'],
      name: 'Build a bench', who: 'robin', xp: 13, needs: [{ item: 'wood', tier: 5, n: 1 }], line: 'Sit a while!' },
    { id: 'hay6', land: 'hay', zone: 'windmill', at: [50, 22], look: ['🏚️', '🌬️'], after: ['hay25', 'hay27', 'hay80', 'hay81'], reward: { chest: 'blue' },
      story: [['mayor', 'It turns again!']],
      name: 'Set the sails turning', who: 'mayor', xp: 16, needs: [{ item: 'hay', tier: 7, n: 1 }, { item: 'wood', tier: 5, n: 1 }], line: 'Whoosh!' },
    // Compost Yard (day 4)
    { id: 'fert1', land: 'fert', name: 'Buy the Compost Yard', who: 'mayor', xp: 6, needs: [{ own: 'fert' }],
      line: 'Your yard!' },
    // Leaf Piles: soggy heaps, rocks, broken rakes and puddles under the trees.
    { id: 'fert2', land: 'fert', zone: 'leafpiles', at: [22, 30], look: ['🍂', ''], after: ['fert1'],
      name: 'Rake up the first leaf heap', who: 'marnie', xp: 8, needs: [{ item: 'fert', tier: 1, n: 2 }], line: 'Crunch crunch!' },
    { id: 'fert6', land: 'fert', zone: 'leafpiles', at: [70, 38], look: ['🪨', ''], after: ['fert1'],
      name: 'Roll away the rocks', who: 'robin', xp: 8, needs: [{ stat: 'boxes', n: 4 }], line: 'Heave-ho!' },
    { id: 'fert7', land: 'fert', zone: 'leafpiles', at: [20, 43], look: ['🧹', ''], after: ['fert2'],
      name: 'Pick up the broken rakes', who: 'marnie', xp: 9, needs: [{ item: 'garden', tier: 3, n: 1 }], line: 'Better rakes!' },
    { id: 'fert8', land: 'fert', zone: 'leafpiles', at: [60, 47], look: ['💦', ''], after: ['fert6'],
      name: 'Mop up the puddles', who: 'robin', xp: 9, needs: [{ item: 'clean', tier: 1, n: 2 }], line: 'Dry at last!' },
    { id: 'fert9', land: 'fert', zone: 'leafpiles', at: [72, 56], look: ['🛒', '🛒'], after: ['fert7'],
      name: 'Empty the wheelbarrows', who: 'robin', xp: 9, needs: [{ item: 'fert', tier: 2, n: 2 }], line: 'Light as air!' },
    { id: 'fert10', land: 'fert', zone: 'leafpiles', at: [22, 82], look: ['🍂', ''], after: ['fert8'],
      name: 'Rake the big leaf heaps', who: 'marnie', xp: 10, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'fert', tier: 1, n: 3 }], line: 'So tidy!' },
    { id: 'fert11', land: 'fert', zone: 'leafpiles', at: [78, 44], look: ['', '🗑️'], after: ['fert9'],
      name: 'Set out leaf bins', who: 'robin', xp: 10, needs: [{ item: 'wood', tier: 3, n: 2 }], line: 'In you go!' },
    { id: 'fert12', land: 'fert', zone: 'leafpiles', at: [50, 62], look: ['🍂', '🟫'], after: ['fert10', 'fert11'],
      name: 'Sweep the path', who: 'sandy', xp: 11, needs: [{ item: 'clean', tier: 4, n: 1 }], line: 'Swish swish!' },
    { id: 'fert13', land: 'fert', zone: 'leafpiles', at: [15, 32], look: ['', '🌼'], after: ['fert12', 'fert45', 'fert46'], reward: { chest: 'brown' },
      name: 'Plant autumn flowers', who: 'sandy', xp: 12, needs: [{ item: 'fert', tier: 4, n: 1 }, { item: 'garden', tier: 1, n: 1 }], line: 'Autumn colours!' },
    // Compost Bins: collapsed bins, tools everywhere, a wobbly potting table.
    { id: 'fert14', land: 'fert', zone: 'compostbins', at: [62, 28], look: ['🔧', ''],
      name: 'Pick up the scattered tools', who: 'robin', xp: 10, needs: [{ item: 'tools', tier: 1, n: 2 }], line: 'Found them!' },
    { id: 'fert3', land: 'fert', zone: 'compostbins', at: [45, 16], look: ['🪵', '🗑️'],
      name: 'Rebuild the compost bins', who: 'robin', xp: 12, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'fert', tier: 3, n: 1 }], line: 'Sturdy bins!' },
    { id: 'fert15', land: 'fert', zone: 'compostbins', at: [10, 45], look: ['🔧', '🧰'], after: ['fert14'],
      name: 'Hang the tools on the wall', who: 'robin', xp: 11, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'All in a row!' },
    { id: 'fert16', land: 'fert', zone: 'compostbins', at: [72, 45], look: ['🪵', '🪑'], after: ['fert15'],
      name: 'Fix the potting table', who: 'robin', xp: 11, needs: [{ item: 'wood', tier: 4, n: 1 }], line: 'No more wobble!' },
    { id: 'fert17', land: 'fert', zone: 'compostbins', at: [18, 62], look: ['🛒', '🛒'], after: ['fert3'],
      name: 'Fill the wheelbarrow', who: 'marnie', xp: 11, needs: [{ item: 'fert', tier: 3, n: 2 }], line: 'Full load!' },
    { id: 'fert4', land: 'fert', zone: 'compostbins', at: [52, 78], look: ['🍂', '🌱'], after: ['fert3'], story: [['sandy', 'It smells... rich!']],
      name: 'Turn the compost', who: 'sandy', xp: 12, needs: [{ item: 'clean', tier: 2, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'Rich soil!' },
    { id: 'fert18', land: 'fert', zone: 'compostbins', at: [82, 14], look: ['', '🪵'], after: ['fert4'],
      name: 'Put lids on the bins', who: 'robin', xp: 12, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Snug!' },
    { id: 'fert19', land: 'fert', zone: 'compostbins', at: [68, 36], look: ['', '🪴'], after: ['fert16', 'fert17'],
      name: 'Pot the seedlings', who: 'marnie', xp: 12, needs: [{ item: 'fert', tier: 4, n: 1 }, { item: 'garden', tier: 1, n: 2 }], line: 'Little sprouts!' },
    { id: 'fert20', land: 'fert', zone: 'compostbins', at: [85, 64], look: ['', '🌺'], after: ['fert18', 'fert19', 'fert63', 'fert64'], reward: { chest: 'blue' },
      name: 'Plant flowers by the path', who: 'sandy', xp: 13, needs: [{ item: 'fert', tier: 5, n: 1 }], line: 'Blooming!' },
    // Mushroom Corner: a gloomy nook under the old trees, to make magical.
    { id: 'fert21', land: 'fert', zone: 'mushrooms', at: [40, 55], look: ['🪵', ''], story: [['marnie', 'So dark in here!']],
      name: 'Clear the rotting logs', who: 'robin', xp: 12, needs: [{ item: 'clean', tier: 2, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'Out they go!' },
    { id: 'fert22', land: 'fert', zone: 'mushrooms', at: [50, 40], look: ['🌿', ''],
      name: 'Untangle the roots', who: 'marnie', xp: 12, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Free!' },
    { id: 'fert23', land: 'fert', zone: 'mushrooms', at: [30, 15], look: ['🌑', '☀️'], after: ['fert22'],
      name: 'Trim the branches to let light in', who: 'marnie', xp: 13, needs: [{ item: 'garden', tier: 4, n: 1 }], line: 'Sunshine!' },
    { id: 'fert24', land: 'fert', zone: 'mushrooms', at: [20, 58], look: ['', '🍄'], after: ['fert21'],
      name: 'Grow the first mushrooms', who: 'sandy', xp: 13, needs: [{ item: 'fert', tier: 5, n: 2 }], line: 'Spotty!' },
    { id: 'fert25', land: 'fert', zone: 'mushrooms', at: [62, 60], look: ['', '🪑'], after: ['fert23'],
      name: 'Build a log bench', who: 'robin', xp: 14, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'Take a seat!' },
    { id: 'fert26', land: 'fert', zone: 'mushrooms', at: [75, 86], look: ['', '🌿'], after: ['fert24'],
      name: 'Plant ferns', who: 'marnie', xp: 14, needs: [{ item: 'fert', tier: 4, n: 2 }], line: 'So green!' },
    { id: 'fert27', land: 'fert', zone: 'mushrooms', at: [12, 72], look: ['🪨', '🟫'], after: ['fert25'],
      name: 'Scrub the stepping stones', who: 'sandy', xp: 14, needs: [{ item: 'clean', tier: 4, n: 1 }], line: 'Squeaky clean!' },
    { id: 'fert28', land: 'fert', zone: 'mushrooms', at: [88, 64], look: ['', '🍄'], after: ['fert26', 'fert27'],
      name: 'Grow a giant toadstool', who: 'sandy', xp: 15, needs: [{ item: 'fert', tier: 6, n: 1 }], line: 'Enormous!' },
    { id: 'fert5', land: 'fert', zone: 'mushrooms', at: [72, 46], look: ['', '💡'], after: ['fert28', 'fert81', 'fert82'], reward: { chest: 'blue' },
      story: [['sandy', 'So magical!']],
      name: 'Hang the fairy lights', who: 'mayor', xp: 18, needs: [{ item: 'fert', tier: 7, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'Twinkle!' },
    // Fish Pond (day 4)
    { id: 'aqua1', land: 'aqua', story: [['willy', 'Fish! Yay!']], name: 'Buy the Fish Pond', who: 'willy', xp: 10, needs: [{ own: 'aqua' }],
      line: 'Your pond!' },
    // Muddy Shore: tyres, bottles and sticks in brown water.
    { id: 'aqua2', land: 'aqua', zone: 'muddyshore', at: [35, 38], look: ['🛞', ''], after: ['aqua1'],
      name: 'Fish out the old tyre', who: 'willy', xp: 10, needs: [{ item: 'fishing', tier: 3, n: 1 }], line: 'Gross! Gone!' },
    { id: 'aqua6', land: 'aqua', zone: 'muddyshore', at: [50, 54], look: ['🥫', ''], after: ['aqua1'],
      name: 'Pick up the bottles and cans', who: 'willy', xp: 10, needs: [{ item: 'clean', tier: 1, n: 2 }], line: 'Much better!' },
    { id: 'aqua7', land: 'aqua', zone: 'muddyshore', at: [70, 32], look: ['🪵', ''], after: ['aqua2'],
      name: 'Clear the floating sticks', who: 'robin', xp: 10, needs: [{ item: 'garden', tier: 0, n: 2 }, { item: 'aqua', tier: 0, n: 2 }], line: 'Clear water!' },
    { id: 'aqua8', land: 'aqua', zone: 'muddyshore', at: [85, 66], look: ['🛞', ''], after: ['aqua6'],
      name: 'Haul out the big tyre', who: 'robin', xp: 11, needs: [{ item: 'fishing', tier: 2, n: 2 }], line: 'Heave!' },
    { id: 'aqua9', land: 'aqua', zone: 'muddyshore', at: [12, 30], look: ['🌾', '🌾'], after: ['aqua7'],
      name: 'Trim the reeds', who: 'marnie', xp: 11, needs: [{ item: 'garden', tier: 2, n: 1 }], line: 'Neat reeds!' },
    { id: 'aqua10', land: 'aqua', zone: 'muddyshore', at: [15, 66], look: ['🪨', '🪨'], after: ['aqua8'],
      name: 'Scrub the slimy rocks', who: 'willy', xp: 12, needs: [{ item: 'clean', tier: 3, n: 1 }], line: 'No more slime!' },
    { id: 'aqua11', land: 'aqua', zone: 'muddyshore', at: [50, 76], look: ['🟫', '🪨'], after: ['aqua9', 'aqua10'],
      name: 'Rake the pebble shore', who: 'marnie', xp: 12, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'aqua', tier: 1, n: 2 }], line: 'Smooth!' },
    { id: 'aqua3', land: 'aqua', zone: 'muddyshore', at: [28, 67], look: ['', '🐸'], after: ['aqua11'], story: [['willy', 'Ribbit! They\'re back!']],
      name: 'Welcome the frogs', who: 'willy', xp: 13, needs: [{ item: 'aqua', tier: 3, n: 2 }], line: 'Ribbit!' },
    { id: 'aqua12', land: 'aqua', zone: 'muddyshore', at: [58, 70], look: ['', '🎣'], after: ['aqua3', 'aqua45', 'aqua46'], reward: { chest: 'brown' },
      name: 'Set up a fishing spot', who: 'willy', xp: 14, needs: [{ item: 'fishing', tier: 4, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'Gone fishing!' },
    // Lily Pond: the willow's pond, its bridge broken and its water murky.
    { id: 'aqua13', land: 'aqua', zone: 'lilypond', at: [70, 62], look: ['🗑️', ''],
      name: 'Fish out the floating junk', who: 'willy', xp: 13, needs: [{ item: 'fishing', tier: 3, n: 1 }], line: 'Got it!' },
    { id: 'aqua14', land: 'aqua', zone: 'lilypond', at: [30, 58], look: ['🍂', ''],
      name: 'Clear the dead lily pads', who: 'marnie', xp: 13, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Fresh start!' },
    { id: 'aqua15', land: 'aqua', zone: 'lilypond', at: [42, 45], look: ['🧱', '🌉'], after: ['aqua13'],
      name: 'Rebuild the stone bridge', who: 'robin', xp: 14, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'Over we go!' },
    { id: 'aqua16', land: 'aqua', zone: 'lilypond', at: [20, 80], look: ['🪨', '🪨'], after: ['aqua14'],
      name: 'Straighten the pond stones', who: 'robin', xp: 14, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'clean', tier: 2, n: 1 }], line: 'All lined up!' },
    { id: 'aqua17', land: 'aqua', zone: 'lilypond', at: [52, 72], look: ['🟢', '💧'], after: ['aqua16'],
      name: 'Clear the murky water', who: 'willy', xp: 15, needs: [{ item: 'clean', tier: 4, n: 1 }, { item: 'aqua', tier: 2, n: 2 }], line: 'Crystal clear!' },
    { id: 'aqua18', land: 'aqua', zone: 'lilypond', at: [58, 34], look: ['', '🪷'], after: ['aqua15'],
      name: 'Plant pink lotus', who: 'sandy', xp: 15, needs: [{ item: 'aqua', tier: 3, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'So pink!' },
    { id: 'aqua4', land: 'aqua', zone: 'lilypond', at: [38, 70], look: ['🫧', '🐠'], after: ['aqua17'],
      name: 'Release the goldfish', who: 'willy', xp: 16, needs: [{ item: 'aqua', tier: 4, n: 2 }], line: 'So shiny!' },
    { id: 'aqua19', land: 'aqua', zone: 'lilypond', at: [82, 50], look: ['', '🏮'], after: ['aqua18'],
      name: 'Hang lanterns on the bridge', who: 'robin', xp: 16, needs: [{ item: 'fishing', tier: 2, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Glowing!' },
    { id: 'aqua20', land: 'aqua', zone: 'lilypond', at: [32, 74], look: ['', '🎏'], after: ['aqua4', 'aqua19', 'aqua63', 'aqua64'], reward: { chest: 'blue' },
      name: 'Welcome the koi', who: 'willy', xp: 18, needs: [{ item: 'aqua', tier: 5, n: 1 }], line: 'Beautiful!' },
    // Boat Dock: missing planks, tangled nets and a sunken rowboat.
    { id: 'aqua21', land: 'aqua', zone: 'boatdock', at: [62, 36], look: ['🕸️', ''], story: [['willy', 'My old dock!']],
      name: 'Untangle the fishing nets', who: 'willy', xp: 15, needs: [{ item: 'garden', tier: 2, n: 1 }, { item: 'fishing', tier: 1, n: 2 }], line: 'Untangled!' },
    { id: 'aqua22', land: 'aqua', zone: 'boatdock', at: [25, 15], look: ['🪧', '🪧'],
      name: 'Put the fallen sign back up', who: 'robin', xp: 15, needs: [{ item: 'wood', tier: 2, n: 1 }, { item: 'tools', tier: 1, n: 1 }], line: 'Welcome!' },
    { id: 'aqua23', land: 'aqua', zone: 'boatdock', at: [60, 58], look: ['🕳️', '🪵'], after: ['aqua21'],
      name: 'Replace the missing planks', who: 'robin', xp: 16, needs: [{ item: 'wood', tier: 4, n: 2 }], line: 'Mind the gap!' },
    { id: 'aqua24', land: 'aqua', zone: 'boatdock', at: [80, 75], look: ['🕸️', ''], after: ['aqua22'],
      name: 'Pull the nets out of the water', who: 'willy', xp: 16, needs: [{ item: 'fishing', tier: 3, n: 1 }], line: 'Heave!' },
    { id: 'aqua25', land: 'aqua', zone: 'boatdock', at: [22, 50], look: ['🛶', '🛶'], after: ['aqua23'],
      name: 'Raise the sunken rowboat', who: 'willy', xp: 17, needs: [{ item: 'fishing', tier: 5, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'She floats!' },
    { id: 'aqua26', land: 'aqua', zone: 'boatdock', at: [75, 12], look: ['🏚️', '🏠'], after: ['aqua24'],
      name: 'Paint the boathouse', who: 'robin', xp: 17, needs: [{ item: 'clean', tier: 4, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Fresh paint!' },
    { id: 'aqua27', land: 'aqua', zone: 'boatdock', at: [55, 38], look: ['', '🛟'], after: ['aqua25'],
      name: 'Hang a life ring', who: 'willy', xp: 18, needs: [{ item: 'fishing', tier: 6, n: 1 }], line: 'Safety first!' },
    { id: 'aqua28', land: 'aqua', zone: 'boatdock', at: [86, 48], look: ['', '🏮'], after: ['aqua26', 'aqua27'],
      name: 'Light the dock lanterns', who: 'robin', xp: 18, needs: [{ item: 'tools', tier: 5, n: 1 }, { item: 'wood', tier: 5, n: 1 }], line: 'So bright!' },
    { id: 'aqua5', land: 'aqua', zone: 'boatdock', at: [35, 55], look: ['', '⛵'], after: ['aqua28', 'aqua81', 'aqua82'], reward: { chest: 'blue' },
      story: [['willy', 'Row, row, row!']],
      name: 'Take the rowboat out', who: 'willy', xp: 22, needs: [{ item: 'aqua', tier: 7, n: 1 }, { item: 'fishing', tier: 7, n: 1 }], line: 'Ahoy!' },
    // Flower Garden (day 5)
    { id: 'flower1', land: 'flower', story: [['sandy', 'Flowers!']], name: 'Buy the Flower Garden', who: 'sandy', xp: 15, needs: [{ own: 'flower' }],
      line: 'A garden!' },
    // Garden Gate: a broken picket fence, empty beds and smashed pots.
    { id: 'flower6', land: 'flower', zone: 'gardengate', at: [47, 48], look: ['🏺', ''], after: ['flower1'],
      name: 'Pick up the broken pots', who: 'sandy', xp: 16, needs: [{ item: 'clean', tier: 1, n: 2 }], line: 'Tidy!' },
    { id: 'flower7', land: 'flower', zone: 'gardengate', at: [20, 24], look: ['🚧', '🪵'], after: ['flower1'],
      name: 'Mend the picket fence', who: 'robin', xp: 16, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'White and neat!' },
    { id: 'flower8', land: 'flower', zone: 'gardengate', at: [78, 25], look: ['🚪', '🚪'], after: ['flower7'],
      name: 'Hang the gate back on', who: 'robin', xp: 17, needs: [{ item: 'tools', tier: 3, n: 1 }], line: 'Squeak, click!' },
    { id: 'flower9', land: 'flower', zone: 'gardengate', at: [25, 58], look: ['🌿', ''], after: ['flower6'],
      name: 'Pull the weeds from the beds', who: 'marnie', xp: 17, needs: [{ item: 'garden', tier: 1, n: 2 }], line: 'Weed-free!' },
    { id: 'flower10', land: 'flower', zone: 'gardengate', at: [45, 76], look: ['🟫', '🟫'], after: ['flower9'],
      name: 'Dig over the beds', who: 'marnie', xp: 18, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'fert', tier: 3, n: 1 }], line: 'Soft soil!' },
    { id: 'flower2', land: 'flower', zone: 'gardengate', at: [32, 40], look: ['🕳️', '🌼'], after: ['flower10'],
      name: 'Plant a row of daisies', who: 'sandy', xp: 18, needs: [{ item: 'flower', tier: 3, n: 3 }], line: 'Daisies!' },
    { id: 'flower3', land: 'flower', zone: 'gardengate', at: [72, 68], look: ['🌱', '🌷'], after: ['flower10'],
      name: 'Grow tulips for the Mayor', who: 'mayor', xp: 19, needs: [{ item: 'flower', tier: 4, n: 2 }], line: 'My favourite!' },
    { id: 'flower11', land: 'flower', zone: 'gardengate', at: [52, 27], look: ['', '🚿'], after: ['flower8'],
      name: 'Fill the watering can', who: 'sandy', xp: 18, needs: [{ item: 'flower', tier: 0, n: 4 }], line: 'Splash!' },
    { id: 'flower12', land: 'flower', zone: 'gardengate', at: [82, 20], look: ['', '🪑'], after: ['flower2', 'flower3', 'flower11', 'flower46', 'flower47'], reward: { chest: 'brown' },
      name: 'Build a welcome bench', who: 'robin', xp: 20, needs: [{ item: 'wood', tier: 5, n: 1 }], line: 'Come sit!' },
    // Rose Arch: a bare arch, dead thorny stems and a dry fountain.
    { id: 'flower13', land: 'flower', zone: 'rosearch', at: [15, 62], look: ['🥀', ''], story: [['sandy', 'Poor roses!']],
      name: 'Cut back the dead stems', who: 'sandy', xp: 19, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Snip snip!' },
    { id: 'flower14', land: 'flower', zone: 'rosearch', at: [40, 88], look: ['🌵', ''],
      name: 'Clear the thorny brambles', who: 'marnie', xp: 19, needs: [{ item: 'garden', tier: 4, n: 1 }], line: 'Ouch! Done!' },
    { id: 'flower15', land: 'flower', zone: 'rosearch', at: [85, 56], look: ['⛲', '⛲'], after: ['flower14'],
      name: 'Fix the cracked fountain', who: 'robin', xp: 20, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'clean', tier: 3, n: 1 }], line: 'No more cracks!' },
    { id: 'flower4', land: 'flower', zone: 'rosearch', at: [35, 15], look: ['🪵', '🌹'], after: ['flower13'],
      name: 'Repair the rose arch', who: 'robin', xp: 20, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'Fancy!' },
    { id: 'flower17', land: 'flower', zone: 'rosearch', at: [20, 40], look: ['', '🌹'], after: ['flower4'],
      name: 'Plant climbing roses', who: 'sandy', xp: 21, needs: [{ item: 'flower', tier: 5, n: 1 }], line: 'Climb, roses!' },
    { id: 'flower18', land: 'flower', zone: 'rosearch', at: [50, 70], look: ['🍂', '🟫'], after: ['flower15'],
      name: 'Sweep the brick path', who: 'sandy', xp: 21, needs: [{ item: 'clean', tier: 4, n: 1 }], line: 'Swept!' },
    { id: 'flower19', land: 'flower', zone: 'rosearch', at: [88, 44], look: ['', '💧'], after: ['flower18'],
      name: 'Fill the fountain', who: 'willy', xp: 22, needs: [{ item: 'flower', tier: 0, n: 4 }, { item: 'aqua', tier: 3, n: 1 }], line: 'Splish splash!' },
    { id: 'flower20', land: 'flower', zone: 'rosearch', at: [70, 25], look: ['', '🌹'], after: ['flower17'],
      name: 'Train roses over the arch', who: 'sandy', xp: 22, needs: [{ item: 'flower', tier: 5, n: 2 }, { item: 'garden', tier: 4, n: 1 }], line: 'Gorgeous!' },
    { id: 'flower21', land: 'flower', zone: 'rosearch', at: [45, 60], look: ['', '🌸'], after: ['flower19', 'flower20', 'flower64', 'flower65'], reward: { chest: 'blue' },
      name: 'Scatter rose petals', who: 'sandy', xp: 23, needs: [{ item: 'flower', tier: 6, n: 1 }], line: 'Romantic!' },
    // Greenhouse: broken panes, toppled tables and cracked pots.
    { id: 'flower22', land: 'flower', zone: 'greenhouse', at: [50, 85], look: ['🔪', ''], story: [['sandy', 'Careful, glass!']],
      name: 'Sweep up the broken glass', who: 'sandy', xp: 22, needs: [{ item: 'clean', tier: 4, n: 1 }], line: 'Safe now!' },
    { id: 'flower23', land: 'flower', zone: 'greenhouse', at: [20, 60], look: ['🌿', ''],
      name: 'Pull the weeds inside', who: 'marnie', xp: 22, needs: [{ item: 'garden', tier: 2, n: 2 }], line: 'Out you go!' },
    { id: 'flower24', land: 'flower', zone: 'greenhouse', at: [50, 22], look: ['🪟', '🪟'], after: ['flower22'],
      name: 'Replace the glass panes', who: 'robin', xp: 24, needs: [{ item: 'tools', tier: 5, n: 1 }, { item: 'clean', tier: 3, n: 1 }], line: 'Sparkling!' },
    { id: 'flower25', land: 'flower', zone: 'greenhouse', at: [75, 54], look: ['🪵', '🪑'], after: ['flower23'],
      name: 'Stand the tables up', who: 'robin', xp: 24, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'Upright!' },
    { id: 'flower26', land: 'flower', zone: 'greenhouse', at: [30, 72], look: ['🏺', '🪴'], after: ['flower25'],
      name: 'Replace the cracked pots', who: 'marnie', xp: 25, needs: [{ item: 'fert', tier: 4, n: 2 }], line: 'Fresh pots!' },
    { id: 'flower27', land: 'flower', zone: 'greenhouse', at: [15, 32], look: ['', '🧺'], after: ['flower24'],
      name: 'Hang flower baskets', who: 'sandy', xp: 25, needs: [{ item: 'flower', tier: 5, n: 1 }, { item: 'decor', tier: 1, n: 1 }], line: 'Hanging high!' },
    { id: 'flower28', land: 'flower', zone: 'greenhouse', at: [80, 45], look: ['', '🌺'], after: ['flower26'],
      name: 'Grow lilies and orchids', who: 'sandy', xp: 26, needs: [{ item: 'flower', tier: 7, n: 1 }], line: 'Exquisite!' },
    { id: 'flower29', land: 'flower', zone: 'greenhouse', at: [50, 15], look: ['', '💡'], after: ['flower27'],
      name: 'String the fairy lights', who: 'robin', xp: 26, needs: [{ item: 'decor', tier: 4, n: 1 }], line: 'Twinkle!' },
    { id: 'flower5', land: 'flower', zone: 'greenhouse', at: [50, 48], look: ['🥀', '💐'], after: ['flower28', 'flower29', 'flower82', 'flower83'], reward: { chest: 'blue' },
      story: [['sandy', 'It\'s perfect!']],
      name: 'Plant the festival garden', who: 'sandy', xp: 30, needs: [{ item: 'flower', tier: 8, n: 1 }, { item: 'decor', tier: 5, n: 1 }], line: 'Party ready!' },
    // More for every area (about 27 each): jobs that use all three of each land's
    // producers, in two threads that open after the area's first job; each
    // area's own finale still comes last.
    // barnyard
    { id: 'barn12', land: 'barn', zone: 'barnyard', at: [42, 24], look: ['🔨', '✨'], after: ['barn1'],
      name: 'Shear the old ewe', who: 'robin', xp: 2, needs: [{ item: 'wool', tier: 1, n: 2 }], line: 'Lovely!' },
    { id: 'barn13', land: 'barn', zone: 'barnyard', at: [56, 49], look: ['🔨', '✨'], after: ['barn1'],
      name: 'Spin the first yarn', who: 'marnie', xp: 2, needs: [{ item: 'barn', tier: 1, n: 2 }], line: 'Perfect!' },
    { id: 'barn14', land: 'barn', zone: 'barnyard', at: [42, 74], look: ['🔨', '✨'], after: ['barn12'],
      name: 'Knit a cover for the pump', who: 'mayor', xp: 2, needs: [{ item: 'tools', tier: 1, n: 1 }, { item: 'wool', tier: 0, n: 2 }], line: 'So cozy!' },
    { id: 'barn15', land: 'barn', zone: 'barnyard', at: [84, 64], look: ['🔨', '✨'], after: ['barn13'],
      name: 'Hang a wool wreath on the barn', who: 'robin', xp: 2, needs: [{ item: 'wool', tier: 1, n: 1 }, { item: 'barn', tier: 1, n: 1 }], line: 'Great work!' },
    { id: 'barn16', land: 'barn', zone: 'barnyard', at: [42, 39], look: ['🔨', '✨'], after: ['barn14'],
      name: 'Scrub the feed troughs', who: 'marnie', xp: 2, needs: [{ item: 'wool', tier: 2, n: 1 }], line: 'Just right!' },
    { id: 'barn17', land: 'barn', zone: 'barnyard', at: [56, 64], look: ['🔨', '✨'], after: ['barn15'],
      name: 'Oil the barn door hinges', who: 'mayor', xp: 2, needs: [{ item: 'wool', tier: 1, n: 1 }, { item: 'tools', tier: 1, n: 1 }], line: 'Wonderful!' },
    { id: 'barn18', land: 'barn', zone: 'barnyard', at: [84, 39], look: ['🔨', '✨'], after: ['barn16'],
      name: 'Patch the wheelbarrow tyre', who: 'robin', xp: 2, needs: [{ item: 'wool', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'barn19', land: 'barn', zone: 'barnyard', at: [84, 24], look: ['🔨', '✨'], after: ['barn17'],
      name: 'Knit the scarecrow a scarf', who: 'marnie', xp: 2, needs: [{ item: 'barn', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'barn20', land: 'barn', zone: 'barnyard', at: [28, 29], look: ['🔨', '✨'], after: ['barn18'], reward: { chest: 'brown' },
      name: 'Sweep the cobbles', who: 'mayor', xp: 2, needs: [{ item: 'tools', tier: 1, n: 1 }, { item: 'wool', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Beautiful!' },
    { id: 'barn21', land: 'barn', zone: 'barnyard', at: [70, 44], look: ['🔨', '✨'], after: ['barn19'],
      name: 'Stack the firewood neatly', who: 'robin', xp: 2, needs: [{ item: 'wool', tier: 2, n: 1 }, { item: 'barn', tier: 1, n: 1 }], line: 'Thank you!' },
    { id: 'barn22', land: 'barn', zone: 'barnyard', at: [70, 59], look: ['🔨', '✨'], after: ['barn20'],
      name: 'Paint the fence posts', who: 'marnie', xp: 2, needs: [{ item: 'wool', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'barn23', land: 'barn', zone: 'barnyard', at: [56, 79], look: ['🔨', '✨'], after: ['barn21'],
      name: 'Fill the water buckets', who: 'mayor', xp: 2, needs: [{ item: 'wool', tier: 2, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Perfect!' },
    { id: 'barn24', land: 'barn', zone: 'barnyard', at: [14, 24], look: ['🔨', '✨'], after: ['barn22'],
      name: 'Plant marigolds by the fence', who: 'robin', xp: 2, needs: [{ item: 'wool', tier: 2, n: 2 }], line: 'So cozy!' },
    { id: 'barn25', land: 'barn', zone: 'barnyard', at: [42, 84], look: ['🔨', '✨'], after: ['barn23'],
      name: 'Hang a bird feeder', who: 'marnie', xp: 2, needs: [{ item: 'barn', tier: 2, n: 2 }], line: 'Great work!' },
    { id: 'barn26', land: 'barn', zone: 'barnyard', at: [70, 89], look: ['🔨', '✨'], after: ['barn24'],
      name: 'Knit blankets for the calves', who: 'mayor', xp: 2, needs: [{ item: 'tools', tier: 1, n: 1 }, { item: 'wool', tier: 0, n: 2 }], line: 'Just right!' },
    { id: 'barn27', land: 'barn', zone: 'barnyard', at: [56, 34], look: ['🔨', '✨'], after: ['barn25'],
      name: 'Set a bench by the barn', who: 'robin', xp: 2, needs: [{ item: 'wool', tier: 2, n: 1 }, { item: 'barn', tier: 2, n: 1 }], line: 'Wonderful!' },
    { id: 'barn28', land: 'barn', zone: 'barnyard', at: [28, 69], look: ['🔨', '✨'], after: ['barn26'],
      name: 'Hang bunting over the doors', who: 'marnie', xp: 2, needs: [{ item: 'wool', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'barn29', land: 'barn', zone: 'barnyard', at: [28, 39], look: ['🔨', '✨'], after: ['barn27'], reward: { chest: 'blue' },
      name: 'Knit a welcome mat', who: 'mayor', xp: 3, needs: [{ item: 'wool', tier: 2, n: 1 }, { item: 'tools', tier: 2, n: 1 }], line: 'Hooray!' },
    // henhouse
    { id: 'barn30', land: 'barn', zone: 'henhouse', at: [28, 24], look: ['🔨', '✨'], after: ['hen1'],
      name: 'Line the nests with wool', who: 'robin', xp: 3, needs: [{ item: 'wool', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'barn31', land: 'barn', zone: 'henhouse', at: [84, 24], look: ['🔨', '✨'], after: ['hen1'],
      name: 'Scrub the hen house walls', who: 'marnie', xp: 3, needs: [{ item: 'barn', tier: 3, n: 2 }], line: 'Beautiful!' },
    { id: 'barn32', land: 'barn', zone: 'henhouse', at: [70, 64], look: ['🔨', '✨'], after: ['barn30'],
      name: 'Fix the hen house latch', who: 'mayor', xp: 3, needs: [{ item: 'tools', tier: 2, n: 1 }, { item: 'wool', tier: 1, n: 2 }], line: 'Thank you!' },
    { id: 'barn33', land: 'barn', zone: 'henhouse', at: [14, 89], look: ['🔨', '✨'], after: ['barn31'],
      name: 'Scatter fresh grain', who: 'robin', xp: 3, needs: [{ item: 'wool', tier: 3, n: 1 }, { item: 'barn', tier: 2, n: 1 }], line: 'Lovely!' },
    { id: 'barn34', land: 'barn', zone: 'henhouse', at: [56, 79], look: ['🔨', '✨'], after: ['barn32'],
      name: 'Knit tiny hen jumpers', who: 'marnie', xp: 3, needs: [{ item: 'wool', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'barn35', land: 'barn', zone: 'henhouse', at: [42, 34], look: ['🔨', '✨'], after: ['barn33'],
      name: 'Mend the chicken ramp', who: 'mayor', xp: 3, needs: [{ item: 'wool', tier: 3, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'barn36', land: 'barn', zone: 'henhouse', at: [42, 54], look: ['🔨', '✨'], after: ['barn34'],
      name: 'Paint the hen house trim', who: 'robin', xp: 3, needs: [{ item: 'wool', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'barn37', land: 'barn', zone: 'henhouse', at: [84, 39], look: ['🔨', '✨'], after: ['barn35'],
      name: 'Fill the dust bath', who: 'marnie', xp: 3, needs: [{ item: 'barn', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'barn38', land: 'barn', zone: 'henhouse', at: [14, 29], look: ['🔨', '✨'], after: ['barn36'], reward: { chest: 'brown' },
      name: 'Hang a hen house lamp', who: 'mayor', xp: 4, needs: [{ item: 'tools', tier: 2, n: 1 }, { item: 'wool', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Wonderful!' },
    { id: 'barn39', land: 'barn', zone: 'henhouse', at: [28, 49], look: ['🔨', '✨'], after: ['barn37'],
      name: 'Build a roosting bar', who: 'robin', xp: 4, needs: [{ item: 'wool', tier: 3, n: 1 }, { item: 'barn', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'barn40', land: 'barn', zone: 'henhouse', at: [70, 44], look: ['🔨', '✨'], after: ['barn38'],
      name: 'Collect the morning eggs', who: 'marnie', xp: 4, needs: [{ item: 'wool', tier: 4, n: 1 }], line: 'Hooray!' },
    { id: 'barn41', land: 'barn', zone: 'henhouse', at: [14, 79], look: ['🔨', '✨'], after: ['barn39'],
      name: 'Weave an egg basket', who: 'mayor', xp: 4, needs: [{ item: 'wool', tier: 3, n: 1 }, { item: 'tools', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'barn42', land: 'barn', zone: 'henhouse', at: [70, 74], look: ['🔨', '✨'], after: ['barn40'],
      name: 'Fence off the veg patch', who: 'robin', xp: 4, needs: [{ item: 'wool', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'barn43', land: 'barn', zone: 'henhouse', at: [70, 54], look: ['🔨', '✨'], after: ['barn41'],
      name: 'Plant a shady bush', who: 'marnie', xp: 4, needs: [{ item: 'barn', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'barn44', land: 'barn', zone: 'henhouse', at: [42, 74], look: ['🔨', '✨'], after: ['barn42'],
      name: 'Knit a tea cosy for Marnie', who: 'mayor', xp: 4, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wool', tier: 2, n: 2 }], line: 'Perfect!' },
    { id: 'barn45', land: 'barn', zone: 'henhouse', at: [56, 89], look: ['🔨', '✨'], after: ['barn43'],
      name: 'Make a chick nursery', who: 'robin', xp: 4, needs: [{ item: 'wool', tier: 4, n: 1 }, { item: 'barn', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'barn46', land: 'barn', zone: 'henhouse', at: [84, 89], look: ['🔨', '✨'], after: ['barn44'],
      name: 'Hang a weather vane', who: 'marnie', xp: 4, needs: [{ item: 'wool', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'barn47', land: 'barn', zone: 'henhouse', at: [84, 59], look: ['🔨', '✨'], after: ['barn45'], reward: { chest: 'blue' },
      name: 'Throw a hen party', who: 'mayor', xp: 4, needs: [{ item: 'wool', tier: 4, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Just right!' },
    // bigbarn
    { id: 'barn48', land: 'barn', zone: 'bigbarn', at: [84, 44], look: ['🔨', '✨'], after: ['big1'],
      name: 'Wipe down the shelves', who: 'robin', xp: 5, needs: [{ item: 'wool', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'barn49', land: 'barn', zone: 'bigbarn', at: [14, 54], look: ['🔨', '✨'], after: ['big1'],
      name: 'Label the jars', who: 'marnie', xp: 5, needs: [{ item: 'barn', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'barn50', land: 'barn', zone: 'bigbarn', at: [42, 24], look: ['🔨', '✨'], after: ['barn48'],
      name: 'Knit covers for the stools', who: 'mayor', xp: 6, needs: [{ item: 'tools', tier: 3, n: 1 }, { item: 'wool', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'barn51', land: 'barn', zone: 'bigbarn', at: [84, 84], look: ['🔨', '✨'], after: ['barn49'],
      name: 'Sort the seed sacks', who: 'robin', xp: 6, needs: [{ item: 'wool', tier: 4, n: 1 }, { item: 'barn', tier: 4, n: 1 }], line: 'Hooray!' },
    { id: 'barn52', land: 'barn', zone: 'bigbarn', at: [42, 39], look: ['🔨', '✨'], after: ['barn50'],
      name: 'Fix the creaky floorboard', who: 'marnie', xp: 6, needs: [{ item: 'wool', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'barn53', land: 'barn', zone: 'bigbarn', at: [84, 24], look: ['🔨', '✨'], after: ['barn51'],
      name: 'Hang herbs to dry', who: 'mayor', xp: 6, needs: [{ item: 'wool', tier: 4, n: 1 }, { item: 'tools', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'barn54', land: 'barn', zone: 'bigbarn', at: [28, 89], look: ['🔨', '✨'], after: ['barn52'],
      name: 'Oil the old scales', who: 'robin', xp: 6, needs: [{ item: 'wool', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'barn55', land: 'barn', zone: 'bigbarn', at: [56, 79], look: ['🔨', '✨'], after: ['barn53'],
      name: 'Mend the curtains', who: 'marnie', xp: 6, needs: [{ item: 'barn', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'barn56', land: 'barn', zone: 'bigbarn', at: [56, 49], look: ['🔨', '✨'], after: ['barn54'], reward: { chest: 'brown' },
      name: 'Stack the crates by size', who: 'mayor', xp: 6, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'wool', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'So cozy!' },
    { id: 'barn57', land: 'barn', zone: 'bigbarn', at: [14, 24], look: ['🔨', '✨'], after: ['barn55'],
      name: 'Polish the brass lamp', who: 'robin', xp: 7, needs: [{ item: 'wool', tier: 5, n: 1 }, { item: 'barn', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'barn58', land: 'barn', zone: 'bigbarn', at: [14, 69], look: ['🔨', '✨'], after: ['barn56'],
      name: 'Knit a cushion for the bench', who: 'marnie', xp: 7, needs: [{ item: 'wool', tier: 6, n: 1 }], line: 'Just right!' },
    { id: 'barn59', land: 'barn', zone: 'bigbarn', at: [28, 29], look: ['🔨', '✨'], after: ['barn57'],
      name: 'Air out the blankets', who: 'mayor', xp: 7, needs: [{ item: 'wool', tier: 5, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'barn60', land: 'barn', zone: 'bigbarn', at: [28, 44], look: ['🔨', '✨'], after: ['barn58'],
      name: 'Sweep the cobwebs', who: 'robin', xp: 7, needs: [{ item: 'wool', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'barn61', land: 'barn', zone: 'bigbarn', at: [28, 64], look: ['🔨', '✨'], after: ['barn59'],
      name: 'Fix the window latch', who: 'marnie', xp: 7, needs: [{ item: 'barn', tier: 6, n: 1 }], line: 'Hooray!' },
    { id: 'barn62', land: 'barn', zone: 'bigbarn', at: [42, 84], look: ['🔨', '✨'], after: ['barn60'],
      name: 'Hang a notice board', who: 'mayor', xp: 7, needs: [{ item: 'tools', tier: 4, n: 1 }, { item: 'wool', tier: 3, n: 2 }], line: 'Beautiful!' },
    { id: 'barn63', land: 'barn', zone: 'bigbarn', at: [56, 64], look: ['🔨', '✨'], after: ['barn61'],
      name: 'Restock the twine', who: 'robin', xp: 7, needs: [{ item: 'wool', tier: 5, n: 1 }, { item: 'barn', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'barn64', land: 'barn', zone: 'bigbarn', at: [70, 54], look: ['🔨', '✨'], after: ['barn62'],
      name: 'Knit a rug runner', who: 'marnie', xp: 8, needs: [{ item: 'wool', tier: 6, n: 1 }], line: 'Lovely!' },
    { id: 'barn65', land: 'barn', zone: 'bigbarn', at: [84, 34], look: ['🔨', '✨'], after: ['barn63'], reward: { chest: 'blue' },
      name: 'Light the storeroom lamp', who: 'mayor', xp: 8, needs: [{ item: 'wool', tier: 5, n: 1 }, { item: 'tools', tier: 5, n: 1 }], line: 'Perfect!' },
    // fieldgate
    { id: 'farm29', land: 'farm', zone: 'fieldgate', at: [84, 24], look: ['🔨', '✨'], after: ['farm2'],
      name: 'Sow the first seeds', who: 'marnie', xp: 3, needs: [{ item: 'seeds', tier: 1, n: 2 }], line: 'Perfect!' },
    { id: 'farm30', land: 'farm', zone: 'fieldgate', at: [28, 89], look: ['🔨', '✨'], after: ['farm2'],
      name: 'Clear the ditch', who: 'robin', xp: 3, needs: [{ item: 'farm', tier: 1, n: 2 }], line: 'So cozy!' },
    { id: 'farm31', land: 'farm', zone: 'fieldgate', at: [14, 54], look: ['🔨', '✨'], after: ['farm29'],
      name: 'Plant a hedge', who: 'sandy', xp: 3, needs: [{ item: 'garden', tier: 1, n: 1 }, { item: 'seeds', tier: 0, n: 2 }], line: 'Great work!' },
    { id: 'farm32', land: 'farm', zone: 'fieldgate', at: [56, 34], look: ['🔨', '✨'], after: ['farm30'],
      name: 'Mend the scarecrow\'s hat', who: 'marnie', xp: 4, needs: [{ item: 'seeds', tier: 1, n: 1 }, { item: 'farm', tier: 1, n: 1 }], line: 'Just right!' },
    { id: 'farm33', land: 'farm', zone: 'fieldgate', at: [14, 39], look: ['🔨', '✨'], after: ['farm31'],
      name: 'Oil the gate hinges', who: 'robin', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 1 }], line: 'Wonderful!' },
    { id: 'farm34', land: 'farm', zone: 'fieldgate', at: [42, 59], look: ['🔨', '✨'], after: ['farm32'],
      name: 'Fill the seed cart', who: 'sandy', xp: 4, needs: [{ item: 'seeds', tier: 1, n: 1 }, { item: 'garden', tier: 1, n: 1 }], line: 'Looks great!' },
    { id: 'farm35', land: 'farm', zone: 'fieldgate', at: [84, 39], look: ['🔨', '✨'], after: ['farm33'],
      name: 'Rake the track', who: 'marnie', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'farm36', land: 'farm', zone: 'fieldgate', at: [42, 79], look: ['🔨', '✨'], after: ['farm34'],
      name: 'Plant sunflowers by the gate', who: 'robin', xp: 4, needs: [{ item: 'farm', tier: 2, n: 2 }], line: 'Beautiful!' },
    { id: 'farm37', land: 'farm', zone: 'fieldgate', at: [84, 59], look: ['🔨', '✨'], after: ['farm35'], reward: { chest: 'brown' },
      name: 'Fix the shed roof', who: 'sandy', xp: 4, needs: [{ item: 'garden', tier: 1, n: 1 }, { item: 'seeds', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Thank you!' },
    { id: 'farm38', land: 'farm', zone: 'fieldgate', at: [28, 69], look: ['🔨', '✨'], after: ['farm36'],
      name: 'Hang the shed door', who: 'marnie', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 1 }, { item: 'farm', tier: 1, n: 1 }], line: 'Lovely!' },
    { id: 'farm39', land: 'farm', zone: 'fieldgate', at: [14, 84], look: ['🔨', '✨'], after: ['farm37'],
      name: 'Sort the seed packets', who: 'robin', xp: 4, needs: [{ item: 'seeds', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'farm40', land: 'farm', zone: 'fieldgate', at: [56, 54], look: ['🔨', '✨'], after: ['farm38'],
      name: 'Water the seedlings', who: 'sandy', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'So cozy!' },
    { id: 'farm41', land: 'farm', zone: 'fieldgate', at: [70, 29], look: ['🔨', '✨'], after: ['farm39'],
      name: 'Weed the verge', who: 'marnie', xp: 4, needs: [{ item: 'seeds', tier: 2, n: 2 }], line: 'Great work!' },
    { id: 'farm42', land: 'farm', zone: 'fieldgate', at: [56, 44], look: ['🔨', '✨'], after: ['farm40'],
      name: 'Build a compost heap', who: 'robin', xp: 5, needs: [{ item: 'farm', tier: 2, n: 2 }], line: 'Just right!' },
    { id: 'farm43', land: 'farm', zone: 'fieldgate', at: [56, 84], look: ['🔨', '✨'], after: ['farm41'],
      name: 'Paint the shed green', who: 'sandy', xp: 5, needs: [{ item: 'garden', tier: 1, n: 1 }, { item: 'seeds', tier: 0, n: 2 }], line: 'Wonderful!' },
    { id: 'farm44', land: 'farm', zone: 'fieldgate', at: [84, 84], look: ['🔨', '✨'], after: ['farm42'],
      name: 'Put up a rain gauge', who: 'marnie', xp: 5, needs: [{ item: 'seeds', tier: 2, n: 1 }, { item: 'farm', tier: 2, n: 1 }], line: 'Looks great!' },
    { id: 'farm45', land: 'farm', zone: 'fieldgate', at: [70, 64], look: ['🔨', '✨'], after: ['farm43'],
      name: 'Plant a pumpkin patch', who: 'robin', xp: 5, needs: [{ item: 'seeds', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'farm46', land: 'farm', zone: 'fieldgate', at: [42, 24], look: ['🔨', '✨'], after: ['farm44'], reward: { chest: 'blue' },
      name: 'Hang a fresh veg sign', who: 'sandy', xp: 5, needs: [{ item: 'seeds', tier: 2, n: 1 }, { item: 'garden', tier: 2, n: 1 }], line: 'Beautiful!' },
    // berryrows
    { id: 'farm47', land: 'farm', zone: 'berryrows', at: [14, 29], look: ['🔨', '✨'], after: ['farm11'],
      name: 'Plant strawberry runners', who: 'marnie', xp: 5, needs: [{ item: 'seeds', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'farm48', land: 'farm', zone: 'berryrows', at: [84, 24], look: ['🔨', '✨'], after: ['farm11'],
      name: 'Lay straw paths', who: 'robin', xp: 5, needs: [{ item: 'farm', tier: 3, n: 2 }], line: 'Thank you!' },
    { id: 'farm49', land: 'farm', zone: 'berryrows', at: [56, 74], look: ['🔨', '✨'], after: ['farm47'],
      name: 'Build a cold frame', who: 'sandy', xp: 5, needs: [{ item: 'garden', tier: 2, n: 1 }, { item: 'seeds', tier: 1, n: 2 }], line: 'Lovely!' },
    { id: 'farm50', land: 'farm', zone: 'berryrows', at: [14, 79], look: ['🔨', '✨'], after: ['farm48'],
      name: 'Fix the watering pipe', who: 'marnie', xp: 5, needs: [{ item: 'seeds', tier: 3, n: 1 }, { item: 'farm', tier: 2, n: 1 }], line: 'Perfect!' },
    { id: 'farm51', land: 'farm', zone: 'berryrows', at: [84, 44], look: ['🔨', '✨'], after: ['farm49'],
      name: 'Net the young plants', who: 'robin', xp: 6, needs: [{ item: 'seeds', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'farm52', land: 'farm', zone: 'berryrows', at: [70, 89], look: ['🔨', '✨'], after: ['farm50'],
      name: 'Pick the first berries', who: 'sandy', xp: 6, needs: [{ item: 'seeds', tier: 3, n: 1 }, { item: 'garden', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'farm53', land: 'farm', zone: 'berryrows', at: [42, 24], look: ['🔨', '✨'], after: ['farm51'],
      name: 'Sort berries into punnets', who: 'marnie', xp: 6, needs: [{ item: 'seeds', tier: 3, n: 1 }], line: 'Just right!' },
    { id: 'farm54', land: 'farm', zone: 'berryrows', at: [28, 44], look: ['🔨', '✨'], after: ['farm52'],
      name: 'Make strawberry jam', who: 'robin', xp: 6, needs: [{ item: 'farm', tier: 4, n: 1 }], line: 'Wonderful!' },
    { id: 'farm55', land: 'farm', zone: 'berryrows', at: [42, 59], look: ['🔨', '✨'], after: ['farm53'], reward: { chest: 'brown' },
      name: 'Mend the stand awning', who: 'sandy', xp: 6, needs: [{ item: 'garden', tier: 2, n: 1 }, { item: 'seeds', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Looks great!' },
    { id: 'farm56', land: 'farm', zone: 'berryrows', at: [42, 39], look: ['🔨', '✨'], after: ['farm54'],
      name: 'Weed between the rows', who: 'marnie', xp: 6, needs: [{ item: 'seeds', tier: 3, n: 1 }, { item: 'farm', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'farm57', land: 'farm', zone: 'berryrows', at: [42, 79], look: ['🔨', '✨'], after: ['farm55'],
      name: 'Plant borage for the bees', who: 'robin', xp: 6, needs: [{ item: 'seeds', tier: 4, n: 1 }], line: 'Beautiful!' },
    { id: 'farm58', land: 'farm', zone: 'berryrows', at: [70, 69], look: ['🔨', '✨'], after: ['farm56'],
      name: 'Build a berry cart', who: 'sandy', xp: 7, needs: [{ item: 'seeds', tier: 3, n: 1 }, { item: 'garden', tier: 3, n: 1 }], line: 'Thank you!' },
    { id: 'farm59', land: 'farm', zone: 'berryrows', at: [14, 39], look: ['🔨', '✨'], after: ['farm57'],
      name: 'Stack the punnets', who: 'marnie', xp: 7, needs: [{ item: 'seeds', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'farm60', land: 'farm', zone: 'berryrows', at: [14, 69], look: ['🔨', '✨'], after: ['farm58'],
      name: 'Feed the plants', who: 'robin', xp: 7, needs: [{ item: 'farm', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'farm61', land: 'farm', zone: 'berryrows', at: [14, 89], look: ['🔨', '✨'], after: ['farm59'],
      name: 'Shade the stand', who: 'sandy', xp: 7, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'seeds', tier: 2, n: 2 }], line: 'So cozy!' },
    { id: 'farm62', land: 'farm', zone: 'berryrows', at: [28, 34], look: ['🔨', '✨'], after: ['farm60'],
      name: 'Plant a second row', who: 'marnie', xp: 7, needs: [{ item: 'seeds', tier: 4, n: 1 }, { item: 'farm', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'farm63', land: 'farm', zone: 'berryrows', at: [56, 64], look: ['🔨', '✨'], after: ['farm61'],
      name: 'Hang shiny tape for birds', who: 'robin', xp: 7, needs: [{ item: 'seeds', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'farm64', land: 'farm', zone: 'berryrows', at: [56, 84], look: ['🔨', '✨'], after: ['farm62'], reward: { chest: 'blue' },
      name: 'Hold a berry tasting', who: 'sandy', xp: 8, needs: [{ item: 'seeds', tier: 4, n: 1 }, { item: 'garden', tier: 4, n: 1 }], line: 'Wonderful!' },
    // orchard
    { id: 'farm65', land: 'farm', zone: 'orchard', at: [14, 24], look: ['🔨', '✨'], after: ['farm19'],
      name: 'Prune the apple trees', who: 'marnie', xp: 8, needs: [{ item: 'seeds', tier: 4, n: 1 }], line: 'Wonderful!' },
    { id: 'farm66', land: 'farm', zone: 'orchard', at: [84, 24], look: ['🔨', '✨'], after: ['farm19'],
      name: 'Mulch around the trees', who: 'robin', xp: 8, needs: [{ item: 'farm', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'farm67', land: 'farm', zone: 'orchard', at: [14, 44], look: ['🔨', '✨'], after: ['farm65'],
      name: 'Graft a new branch', who: 'sandy', xp: 9, needs: [{ item: 'garden', tier: 3, n: 1 }, { item: 'seeds', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'farm68', land: 'farm', zone: 'orchard', at: [42, 29], look: ['🔨', '✨'], after: ['farm66'],
      name: 'Pick a basket of apples', who: 'marnie', xp: 9, needs: [{ item: 'seeds', tier: 4, n: 1 }, { item: 'farm', tier: 4, n: 1 }], line: 'Beautiful!' },
    { id: 'farm69', land: 'farm', zone: 'orchard', at: [84, 44], look: ['🔨', '✨'], after: ['farm67'],
      name: 'Press apple juice', who: 'robin', xp: 9, needs: [{ item: 'seeds', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'farm70', land: 'farm', zone: 'orchard', at: [70, 34], look: ['🔨', '✨'], after: ['farm68'],
      name: 'Bottle the juice', who: 'sandy', xp: 9, needs: [{ item: 'seeds', tier: 4, n: 1 }, { item: 'garden', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'farm71', land: 'farm', zone: 'orchard', at: [56, 64], look: ['🔨', '✨'], after: ['farm69'],
      name: 'Mend the ladder', who: 'marnie', xp: 10, needs: [{ item: 'seeds', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'farm72', land: 'farm', zone: 'orchard', at: [42, 74], look: ['🔨', '✨'], after: ['farm70'],
      name: 'Hang bird boxes', who: 'robin', xp: 10, needs: [{ item: 'farm', tier: 5, n: 1 }], line: 'So cozy!' },
    { id: 'farm73', land: 'farm', zone: 'orchard', at: [70, 54], look: ['🔨', '✨'], after: ['farm71'], reward: { chest: 'brown' },
      name: 'Sow wildflowers under the trees', who: 'sandy', xp: 10, needs: [{ item: 'garden', tier: 4, n: 1 }, { item: 'seeds', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Great work!' },
    { id: 'farm74', land: 'farm', zone: 'orchard', at: [28, 34], look: ['🔨', '✨'], after: ['farm72'],
      name: 'Fix the gate in the wall', who: 'marnie', xp: 10, needs: [{ item: 'seeds', tier: 5, n: 1 }, { item: 'farm', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'farm75', land: 'farm', zone: 'orchard', at: [28, 49], look: ['🔨', '✨'], after: ['farm73'],
      name: 'Sow clover in the grass', who: 'robin', xp: 10, needs: [{ item: 'seeds', tier: 6, n: 1 }], line: 'Wonderful!' },
    { id: 'farm76', land: 'farm', zone: 'orchard', at: [56, 24], look: ['🔨', '✨'], after: ['farm74'],
      name: 'Bake an apple pie', who: 'sandy', xp: 11, needs: [{ item: 'seeds', tier: 5, n: 1 }, { item: 'garden', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'farm77', land: 'farm', zone: 'orchard', at: [14, 54], look: ['🔨', '✨'], after: ['farm75'],
      name: 'Build a fruit store', who: 'marnie', xp: 11, needs: [{ item: 'seeds', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'farm78', land: 'farm', zone: 'orchard', at: [42, 39], look: ['🔨', '✨'], after: ['farm76'],
      name: 'Wrap the young trees', who: 'robin', xp: 11, needs: [{ item: 'farm', tier: 6, n: 1 }], line: 'Beautiful!' },
    { id: 'farm79', land: 'farm', zone: 'orchard', at: [42, 84], look: ['🔨', '✨'], after: ['farm77'],
      name: 'Set up a beehive stand', who: 'sandy', xp: 11, needs: [{ item: 'garden', tier: 4, n: 1 }, { item: 'seeds', tier: 3, n: 2 }], line: 'Thank you!' },
    { id: 'farm80', land: 'farm', zone: 'orchard', at: [14, 84], look: ['🔨', '✨'], after: ['farm78'],
      name: 'Rake the fallen leaves', who: 'marnie', xp: 12, needs: [{ item: 'seeds', tier: 5, n: 1 }, { item: 'farm', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'farm81', land: 'farm', zone: 'orchard', at: [14, 69], look: ['🔨', '✨'], after: ['farm79'],
      name: 'Hang lanterns in the trees', who: 'robin', xp: 12, needs: [{ item: 'seeds', tier: 6, n: 1 }], line: 'Perfect!' },
    { id: 'farm82', land: 'farm', zone: 'orchard', at: [14, 34], look: ['🔨', '✨'], after: ['farm80'], reward: { chest: 'blue' },
      name: 'Plant a pear tree', who: 'sandy', xp: 12, needs: [{ item: 'seeds', tier: 5, n: 1 }, { item: 'garden', tier: 5, n: 1 }], line: 'So cozy!' },
    // meadow
    { id: 'hay28', land: 'hay', zone: 'meadow', at: [28, 89], look: ['🔨', '✨'], after: ['hay2'],
      name: 'Mill the first flour', who: 'marnie', xp: 6, needs: [{ item: 'bakery', tier: 1, n: 2 }], line: 'So cozy!' },
    { id: 'hay29', land: 'hay', zone: 'meadow', at: [14, 39], look: ['🔨', '✨'], after: ['hay2'],
      name: 'Bake bread for the farmhands', who: 'robin', xp: 6, needs: [{ item: 'hay', tier: 1, n: 2 }], line: 'Great work!' },
    { id: 'hay30', land: 'hay', zone: 'meadow', at: [42, 69], look: ['🔨', '✨'], after: ['hay28'],
      name: 'Cut a path through the grass', who: 'mayor', xp: 6, needs: [{ item: 'wood', tier: 1, n: 1 }, { item: 'bakery', tier: 0, n: 2 }], line: 'Just right!' },
    { id: 'hay31', land: 'hay', zone: 'meadow', at: [56, 89], look: ['🔨', '✨'], after: ['hay29'],
      name: 'Bundle the hay', who: 'marnie', xp: 6, needs: [{ item: 'bakery', tier: 1, n: 1 }, { item: 'hay', tier: 1, n: 1 }], line: 'Wonderful!' },
    { id: 'hay32', land: 'hay', zone: 'meadow', at: [84, 24], look: ['🔨', '✨'], after: ['hay30'],
      name: 'Pick wildflowers', who: 'robin', xp: 6, needs: [{ item: 'bakery', tier: 2, n: 1 }], line: 'Looks great!' },
    { id: 'hay33', land: 'hay', zone: 'meadow', at: [14, 74], look: ['🔨', '✨'], after: ['hay31'],
      name: 'Mend the meadow gate', who: 'mayor', xp: 6, needs: [{ item: 'bakery', tier: 1, n: 1 }, { item: 'wood', tier: 1, n: 1 }], line: 'Hooray!' },
    { id: 'hay34', land: 'hay', zone: 'meadow', at: [14, 24], look: ['🔨', '✨'], after: ['hay32'],
      name: 'Build a hay rack', who: 'marnie', xp: 7, needs: [{ item: 'bakery', tier: 2, n: 2 }], line: 'Beautiful!' },
    { id: 'hay35', land: 'hay', zone: 'meadow', at: [56, 59], look: ['🔨', '✨'], after: ['hay33'],
      name: 'Bake biscuits for the shepherd', who: 'robin', xp: 7, needs: [{ item: 'hay', tier: 2, n: 2 }], line: 'Thank you!' },
    { id: 'hay36', land: 'hay', zone: 'meadow', at: [70, 79], look: ['🔨', '✨'], after: ['hay34'], reward: { chest: 'brown' },
      name: 'Clear the stones', who: 'mayor', xp: 7, needs: [{ item: 'wood', tier: 1, n: 1 }, { item: 'bakery', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Lovely!' },
    { id: 'hay37', land: 'hay', zone: 'meadow', at: [28, 49], look: ['🔨', '✨'], after: ['hay35'],
      name: 'Plant a hedgerow', who: 'marnie', xp: 7, needs: [{ item: 'bakery', tier: 2, n: 1 }, { item: 'hay', tier: 1, n: 1 }], line: 'Perfect!' },
    { id: 'hay38', land: 'hay', zone: 'meadow', at: [28, 34], look: ['🔨', '✨'], after: ['hay36'],
      name: 'Fill the water trough', who: 'robin', xp: 7, needs: [{ item: 'bakery', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'hay39', land: 'hay', zone: 'meadow', at: [42, 84], look: ['🔨', '✨'], after: ['hay37'],
      name: 'Bake a picnic loaf', who: 'mayor', xp: 7, needs: [{ item: 'bakery', tier: 2, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'Great work!' },
    { id: 'hay40', land: 'hay', zone: 'meadow', at: [56, 74], look: ['🔨', '✨'], after: ['hay38'],
      name: 'Put a bench by the path', who: 'marnie', xp: 8, needs: [{ item: 'bakery', tier: 2, n: 2 }], line: 'Just right!' },
    { id: 'hay41', land: 'hay', zone: 'meadow', at: [70, 54], look: ['🔨', '✨'], after: ['hay39'],
      name: 'Brush the sheep', who: 'robin', xp: 8, needs: [{ item: 'hay', tier: 2, n: 2 }], line: 'Wonderful!' },
    { id: 'hay42', land: 'hay', zone: 'meadow', at: [14, 84], look: ['🔨', '✨'], after: ['hay40'],
      name: 'Repaint the scarecrow', who: 'mayor', xp: 8, needs: [{ item: 'wood', tier: 1, n: 1 }, { item: 'bakery', tier: 0, n: 2 }], line: 'Looks great!' },
    { id: 'hay43', land: 'hay', zone: 'meadow', at: [28, 79], look: ['🔨', '✨'], after: ['hay41'],
      name: 'Build a lambing pen', who: 'marnie', xp: 8, needs: [{ item: 'bakery', tier: 2, n: 1 }, { item: 'hay', tier: 2, n: 1 }], line: 'Hooray!' },
    { id: 'hay44', land: 'hay', zone: 'meadow', at: [70, 29], look: ['🔨', '✨'], after: ['hay42'],
      name: 'Bake a harvest pie', who: 'robin', xp: 8, needs: [{ item: 'bakery', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'hay45', land: 'hay', zone: 'meadow', at: [28, 64], look: ['🔨', '✨'], after: ['hay43'], reward: { chest: 'blue' },
      name: 'Hold a meadow picnic', who: 'mayor', xp: 8, needs: [{ item: 'bakery', tier: 2, n: 1 }, { item: 'wood', tier: 2, n: 1 }], line: 'Thank you!' },
    // stables
    { id: 'hay46', land: 'hay', zone: 'stables', at: [84, 39], look: ['🔨', '✨'], after: ['hay13'],
      name: 'Bake carrot cakes for the horses', who: 'marnie', xp: 8, needs: [{ item: 'bakery', tier: 3, n: 1 }], line: 'Thank you!' },
    { id: 'hay47', land: 'hay', zone: 'stables', at: [14, 89], look: ['🔨', '✨'], after: ['hay13'],
      name: 'Muck out the stalls', who: 'robin', xp: 8, needs: [{ item: 'hay', tier: 3, n: 2 }], line: 'Lovely!' },
    { id: 'hay48', land: 'hay', zone: 'stables', at: [14, 49], look: ['🔨', '✨'], after: ['hay46'],
      name: 'Fill the hay nets', who: 'mayor', xp: 8, needs: [{ item: 'wood', tier: 2, n: 1 }, { item: 'bakery', tier: 1, n: 2 }], line: 'Perfect!' },
    { id: 'hay49', land: 'hay', zone: 'stables', at: [84, 59], look: ['🔨', '✨'], after: ['hay47'],
      name: 'Polish the saddles', who: 'marnie', xp: 9, needs: [{ item: 'bakery', tier: 3, n: 1 }, { item: 'hay', tier: 2, n: 1 }], line: 'So cozy!' },
    { id: 'hay50', land: 'hay', zone: 'stables', at: [84, 24], look: ['🔨', '✨'], after: ['hay48'],
      name: 'Mend the bridles', who: 'robin', xp: 9, needs: [{ item: 'bakery', tier: 4, n: 1 }], line: 'Great work!' },
    { id: 'hay51', land: 'hay', zone: 'stables', at: [56, 89], look: ['🔨', '✨'], after: ['hay49'],
      name: 'Brush the horses', who: 'mayor', xp: 9, needs: [{ item: 'bakery', tier: 3, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'Just right!' },
    { id: 'hay52', land: 'hay', zone: 'stables', at: [70, 49], look: ['🔨', '✨'], after: ['hay50'],
      name: 'Fix the stall latches', who: 'marnie', xp: 9, needs: [{ item: 'bakery', tier: 3, n: 1 }], line: 'Wonderful!' },
    { id: 'hay53', land: 'hay', zone: 'stables', at: [56, 74], look: ['🔨', '✨'], after: ['hay51'],
      name: 'Sweep the yard', who: 'robin', xp: 10, needs: [{ item: 'hay', tier: 4, n: 1 }], line: 'Looks great!' },
    { id: 'hay54', land: 'hay', zone: 'stables', at: [42, 64], look: ['🔨', '✨'], after: ['hay52'], reward: { chest: 'brown' },
      name: 'Hang a tack rack', who: 'mayor', xp: 10, needs: [{ item: 'wood', tier: 2, n: 1 }, { item: 'bakery', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Hooray!' },
    { id: 'hay55', land: 'hay', zone: 'stables', at: [56, 39], look: ['🔨', '✨'], after: ['hay53'],
      name: 'Bake oat bars', who: 'marnie', xp: 10, needs: [{ item: 'bakery', tier: 3, n: 1 }, { item: 'hay', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'hay56', land: 'hay', zone: 'stables', at: [84, 89], look: ['🔨', '✨'], after: ['hay54'],
      name: 'Paint the stable doors', who: 'robin', xp: 10, needs: [{ item: 'bakery', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'hay57', land: 'hay', zone: 'stables', at: [28, 44], look: ['🔨', '✨'], after: ['hay55'],
      name: 'Fill the feed bins', who: 'mayor', xp: 11, needs: [{ item: 'bakery', tier: 3, n: 1 }, { item: 'wood', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'hay58', land: 'hay', zone: 'stables', at: [70, 29], look: ['🔨', '✨'], after: ['hay56'],
      name: 'Fix the water pump', who: 'marnie', xp: 11, needs: [{ item: 'bakery', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'hay59', land: 'hay', zone: 'stables', at: [14, 34], look: ['🔨', '✨'], after: ['hay57'],
      name: 'Plant a shade tree', who: 'robin', xp: 11, needs: [{ item: 'hay', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'hay60', land: 'hay', zone: 'stables', at: [14, 79], look: ['🔨', '✨'], after: ['hay58'],
      name: 'Build a mounting block', who: 'mayor', xp: 11, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'bakery', tier: 2, n: 2 }], line: 'Great work!' },
    { id: 'hay61', land: 'hay', zone: 'stables', at: [28, 54], look: ['🔨', '✨'], after: ['hay59'],
      name: 'Bake a cake for the pony', who: 'marnie', xp: 12, needs: [{ item: 'bakery', tier: 4, n: 1 }, { item: 'hay', tier: 3, n: 1 }], line: 'Just right!' },
    { id: 'hay62', land: 'hay', zone: 'stables', at: [28, 74], look: ['🔨', '✨'], after: ['hay60'],
      name: 'Hang the name boards', who: 'robin', xp: 12, needs: [{ item: 'bakery', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'hay63', land: 'hay', zone: 'stables', at: [70, 69], look: ['🔨', '✨'], after: ['hay61'], reward: { chest: 'blue' },
      name: 'Hold a pony show', who: 'mayor', xp: 12, needs: [{ item: 'bakery', tier: 4, n: 1 }, { item: 'wood', tier: 4, n: 1 }], line: 'Looks great!' },
    // windmill
    { id: 'hay64', land: 'hay', zone: 'windmill', at: [14, 89], look: ['🔨', '✨'], after: ['hay20'],
      name: 'Sweep the mill floor', who: 'marnie', xp: 10, needs: [{ item: 'bakery', tier: 4, n: 1 }], line: 'Looks great!' },
    { id: 'hay65', land: 'hay', zone: 'windmill', at: [70, 89], look: ['🔨', '✨'], after: ['hay20'],
      name: 'Oil the millstones', who: 'robin', xp: 10, needs: [{ item: 'hay', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'hay66', land: 'hay', zone: 'windmill', at: [42, 79], look: ['🔨', '✨'], after: ['hay64'],
      name: 'Fix the grain chute', who: 'mayor', xp: 10, needs: [{ item: 'wood', tier: 3, n: 1 }, { item: 'bakery', tier: 2, n: 2 }], line: 'Beautiful!' },
    { id: 'hay67', land: 'hay', zone: 'windmill', at: [14, 69], look: ['🔨', '✨'], after: ['hay65'],
      name: 'Sack the flour', who: 'marnie', xp: 10, needs: [{ item: 'bakery', tier: 4, n: 1 }, { item: 'hay', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'hay68', land: 'hay', zone: 'windmill', at: [14, 44], look: ['🔨', '✨'], after: ['hay66'],
      name: 'Bake the first mill loaf', who: 'robin', xp: 11, needs: [{ item: 'bakery', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'hay69', land: 'hay', zone: 'windmill', at: [84, 74], look: ['🔨', '✨'], after: ['hay67'],
      name: 'Mend the stairs', who: 'mayor', xp: 11, needs: [{ item: 'bakery', tier: 4, n: 1 }, { item: 'wood', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'hay70', land: 'hay', zone: 'windmill', at: [56, 64], look: ['🔨', '✨'], after: ['hay68'],
      name: 'Fix the mill windows', who: 'marnie', xp: 11, needs: [{ item: 'bakery', tier: 5, n: 1 }], line: 'So cozy!' },
    { id: 'hay71', land: 'hay', zone: 'windmill', at: [70, 29], look: ['🔨', '✨'], after: ['hay69'],
      name: 'Paint the mill door', who: 'robin', xp: 12, needs: [{ item: 'hay', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'hay72', land: 'hay', zone: 'windmill', at: [42, 34], look: ['🔨', '✨'], after: ['hay70'], reward: { chest: 'brown' },
      name: 'Hang a weather vane on top', who: 'mayor', xp: 12, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'bakery', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Just right!' },
    { id: 'hay73', land: 'hay', zone: 'windmill', at: [28, 39], look: ['🔨', '✨'], after: ['hay71'],
      name: 'Stack the grain sacks', who: 'marnie', xp: 12, needs: [{ item: 'bakery', tier: 5, n: 1 }, { item: 'hay', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'hay74', land: 'hay', zone: 'windmill', at: [28, 74], look: ['🔨', '✨'], after: ['hay72'],
      name: 'Bake rolls for the miller', who: 'robin', xp: 12, needs: [{ item: 'bakery', tier: 6, n: 1 }], line: 'Looks great!' },
    { id: 'hay75', land: 'hay', zone: 'windmill', at: [56, 84], look: ['🔨', '✨'], after: ['hay73'],
      name: 'Plant lavender by the path', who: 'mayor', xp: 13, needs: [{ item: 'bakery', tier: 5, n: 1 }, { item: 'wood', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'hay76', land: 'hay', zone: 'windmill', at: [70, 69], look: ['🔨', '✨'], after: ['hay74'],
      name: 'Fix the cart track', who: 'marnie', xp: 13, needs: [{ item: 'bakery', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'hay77', land: 'hay', zone: 'windmill', at: [84, 34], look: ['🔨', '✨'], after: ['hay75'],
      name: 'Build a flour store', who: 'robin', xp: 13, needs: [{ item: 'hay', tier: 6, n: 1 }], line: 'Thank you!' },
    { id: 'hay78', land: 'hay', zone: 'windmill', at: [14, 54], look: ['🔨', '✨'], after: ['hay76'],
      name: 'Bake a fruit tart', who: 'mayor', xp: 14, needs: [{ item: 'wood', tier: 4, n: 1 }, { item: 'bakery', tier: 3, n: 2 }], line: 'Lovely!' },
    { id: 'hay79', land: 'hay', zone: 'windmill', at: [14, 79], look: ['🔨', '✨'], after: ['hay77'],
      name: 'Hang flower baskets', who: 'marnie', xp: 14, needs: [{ item: 'bakery', tier: 5, n: 1 }, { item: 'hay', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'hay80', land: 'hay', zone: 'windmill', at: [28, 84], look: ['🔨', '✨'], after: ['hay78'],
      name: 'Open the mill bakery', who: 'robin', xp: 14, needs: [{ item: 'bakery', tier: 6, n: 1 }], line: 'So cozy!' },
    { id: 'hay81', land: 'hay', zone: 'windmill', at: [42, 69], look: ['🔨', '✨'], after: ['hay79'], reward: { chest: 'blue' },
      name: 'Bake a grand loaf for Sunnyvale', who: 'mayor', xp: 14, needs: [{ item: 'bakery', tier: 5, n: 1 }, { item: 'wood', tier: 5, n: 1 }], line: 'Great work!' },
    // leafpiles
    { id: 'fert29', land: 'fert', zone: 'leafpiles', at: [84, 89], look: ['🔨', '✨'], after: ['fert2'],
      name: 'Start a worm bin', who: 'sandy', xp: 8, needs: [{ item: 'worms', tier: 1, n: 2 }], line: 'Great work!' },
    { id: 'fert30', land: 'fert', zone: 'leafpiles', at: [14, 64], look: ['🔨', '✨'], after: ['fert2'],
      name: 'Sift the leaf mould', who: 'marnie', xp: 8, needs: [{ item: 'fert', tier: 1, n: 2 }], line: 'Just right!' },
    { id: 'fert31', land: 'fert', zone: 'leafpiles', at: [56, 84], look: ['🔨', '✨'], after: ['fert29'],
      name: 'Bag the leaves', who: 'robin', xp: 8, needs: [{ item: 'clean', tier: 1, n: 1 }, { item: 'worms', tier: 0, n: 2 }], line: 'Wonderful!' },
    { id: 'fert32', land: 'fert', zone: 'leafpiles', at: [56, 24], look: ['🔨', '✨'], after: ['fert30'],
      name: 'Rake the far corner', who: 'sandy', xp: 8, needs: [{ item: 'worms', tier: 1, n: 1 }, { item: 'fert', tier: 1, n: 1 }], line: 'Looks great!' },
    { id: 'fert33', land: 'fert', zone: 'leafpiles', at: [84, 24], look: ['🔨', '✨'], after: ['fert31'],
      name: 'Pot up seedlings', who: 'marnie', xp: 9, needs: [{ item: 'worms', tier: 2, n: 1 }], line: 'Hooray!' },
    { id: 'fert34', land: 'fert', zone: 'leafpiles', at: [84, 69], look: ['🔨', '✨'], after: ['fert32'],
      name: 'Build a leaf cage', who: 'robin', xp: 9, needs: [{ item: 'worms', tier: 1, n: 1 }, { item: 'clean', tier: 1, n: 1 }], line: 'Beautiful!' },
    { id: 'fert35', land: 'fert', zone: 'leafpiles', at: [42, 39], look: ['🔨', '✨'], after: ['fert33'],
      name: 'Turn the leaf pile', who: 'sandy', xp: 9, needs: [{ item: 'worms', tier: 2, n: 2 }], line: 'Thank you!' },
    { id: 'fert36', land: 'fert', zone: 'leafpiles', at: [42, 74], look: ['🔨', '✨'], after: ['fert34'],
      name: 'Mend the rake handles', who: 'marnie', xp: 9, needs: [{ item: 'fert', tier: 2, n: 2 }], line: 'Lovely!' },
    { id: 'fert37', land: 'fert', zone: 'leafpiles', at: [28, 54], look: ['🔨', '✨'], after: ['fert35'], reward: { chest: 'brown' },
      name: 'Sweep the stepping stones', who: 'robin', xp: 9, needs: [{ item: 'clean', tier: 1, n: 1 }, { item: 'worms', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Perfect!' },
    { id: 'fert38', land: 'fert', zone: 'leafpiles', at: [28, 69], look: ['🔨', '✨'], after: ['fert36'],
      name: 'Plant bulbs for spring', who: 'sandy', xp: 10, needs: [{ item: 'worms', tier: 2, n: 1 }, { item: 'fert', tier: 1, n: 1 }], line: 'So cozy!' },
    { id: 'fert39', land: 'fert', zone: 'leafpiles', at: [42, 89], look: ['🔨', '✨'], after: ['fert37'],
      name: 'Lay a bark path', who: 'marnie', xp: 10, needs: [{ item: 'worms', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'fert40', land: 'fert', zone: 'leafpiles', at: [70, 74], look: ['🔨', '✨'], after: ['fert38'],
      name: 'Fill the planters', who: 'robin', xp: 10, needs: [{ item: 'worms', tier: 2, n: 1 }, { item: 'clean', tier: 2, n: 1 }], line: 'Just right!' },
    { id: 'fert41', land: 'fert', zone: 'leafpiles', at: [42, 29], look: ['🔨', '✨'], after: ['fert39'],
      name: 'Clean the wheelbarrow', who: 'sandy', xp: 10, needs: [{ item: 'worms', tier: 2, n: 2 }], line: 'Wonderful!' },
    { id: 'fert42', land: 'fert', zone: 'leafpiles', at: [42, 49], look: ['🔨', '✨'], after: ['fert40'],
      name: 'Plant ferns under the trees', who: 'marnie', xp: 11, needs: [{ item: 'fert', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'fert43', land: 'fert', zone: 'leafpiles', at: [84, 79], look: ['🔨', '✨'], after: ['fert41'],
      name: 'Build a bug hotel', who: 'robin', xp: 11, needs: [{ item: 'clean', tier: 1, n: 1 }, { item: 'worms', tier: 0, n: 2 }], line: 'Hooray!' },
    { id: 'fert44', land: 'fert', zone: 'leafpiles', at: [56, 34], look: ['🔨', '✨'], after: ['fert42'],
      name: 'Sort the pots', who: 'sandy', xp: 11, needs: [{ item: 'worms', tier: 2, n: 1 }, { item: 'fert', tier: 2, n: 1 }], line: 'Beautiful!' },
    { id: 'fert45', land: 'fert', zone: 'leafpiles', at: [84, 34], look: ['🔨', '✨'], after: ['fert43'],
      name: 'Put up a potting bench', who: 'marnie', xp: 11, needs: [{ item: 'worms', tier: 3, n: 1 }], line: 'Thank you!' },
    { id: 'fert46', land: 'fert', zone: 'leafpiles', at: [14, 74], look: ['🔨', '✨'], after: ['fert44'], reward: { chest: 'blue' },
      name: 'Hang wind chimes', who: 'robin', xp: 11, needs: [{ item: 'worms', tier: 2, n: 1 }, { item: 'clean', tier: 2, n: 1 }], line: 'Lovely!' },
    // compostbins
    { id: 'fert47', land: 'fert', zone: 'compostbins', at: [14, 89], look: ['🔨', '✨'], after: ['fert14'],
      name: 'Feed the worms', who: 'sandy', xp: 9, needs: [{ item: 'worms', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'fert48', land: 'fert', zone: 'compostbins', at: [84, 89], look: ['🔨', '✨'], after: ['fert14'],
      name: 'Sort the scraps', who: 'marnie', xp: 10, needs: [{ item: 'fert', tier: 3, n: 2 }], line: 'Perfect!' },
    { id: 'fert49', land: 'fert', zone: 'compostbins', at: [14, 24], look: ['🔨', '✨'], after: ['fert47'],
      name: 'Shred the cardboard', who: 'robin', xp: 10, needs: [{ item: 'clean', tier: 2, n: 1 }, { item: 'worms', tier: 1, n: 2 }], line: 'So cozy!' },
    { id: 'fert50', land: 'fert', zone: 'compostbins', at: [42, 49], look: ['🔨', '✨'], after: ['fert48'],
      name: 'Build a worm tower', who: 'sandy', xp: 10, needs: [{ item: 'worms', tier: 3, n: 1 }, { item: 'fert', tier: 2, n: 1 }], line: 'Great work!' },
    { id: 'fert51', land: 'fert', zone: 'compostbins', at: [42, 64], look: ['🔨', '✨'], after: ['fert49'],
      name: 'Fill the sieve', who: 'marnie', xp: 10, needs: [{ item: 'worms', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'fert52', land: 'fert', zone: 'compostbins', at: [42, 34], look: ['🔨', '✨'], after: ['fert50'],
      name: 'Bag the compost', who: 'robin', xp: 11, needs: [{ item: 'worms', tier: 3, n: 1 }, { item: 'clean', tier: 3, n: 1 }], line: 'Wonderful!' },
    { id: 'fert53', land: 'fert', zone: 'compostbins', at: [28, 74], look: ['🔨', '✨'], after: ['fert51'],
      name: 'Label the bins', who: 'sandy', xp: 11, needs: [{ item: 'worms', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'fert54', land: 'fert', zone: 'compostbins', at: [42, 89], look: ['🔨', '✨'], after: ['fert52'],
      name: 'Fix the bin hinges', who: 'marnie', xp: 11, needs: [{ item: 'fert', tier: 4, n: 1 }], line: 'Hooray!' },
    { id: 'fert55', land: 'fert', zone: 'compostbins', at: [84, 29], look: ['🔨', '✨'], after: ['fert53'], reward: { chest: 'brown' },
      name: 'Pot up herbs', who: 'robin', xp: 11, needs: [{ item: 'clean', tier: 2, n: 1 }, { item: 'worms', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Beautiful!' },
    { id: 'fert56', land: 'fert', zone: 'compostbins', at: [70, 74], look: ['🔨', '✨'], after: ['fert54'],
      name: 'Mix potting soil', who: 'sandy', xp: 12, needs: [{ item: 'worms', tier: 3, n: 1 }, { item: 'fert', tier: 3, n: 1 }], line: 'Thank you!' },
    { id: 'fert57', land: 'fert', zone: 'compostbins', at: [70, 59], look: ['🔨', '✨'], after: ['fert55'],
      name: 'Clean the tool wall', who: 'marnie', xp: 12, needs: [{ item: 'worms', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'fert58', land: 'fert', zone: 'compostbins', at: [28, 29], look: ['🔨', '✨'], after: ['fert56'],
      name: 'Oil the shears', who: 'robin', xp: 12, needs: [{ item: 'worms', tier: 3, n: 1 }, { item: 'clean', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'fert59', land: 'fert', zone: 'compostbins', at: [28, 44], look: ['🔨', '✨'], after: ['fert57'],
      name: 'Build a seed tray rack', who: 'sandy', xp: 13, needs: [{ item: 'worms', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'fert60', land: 'fert', zone: 'compostbins', at: [56, 54], look: ['🔨', '✨'], after: ['fert58'],
      name: 'Water the seedlings', who: 'marnie', xp: 13, needs: [{ item: 'fert', tier: 4, n: 1 }], line: 'Great work!' },
    { id: 'fert61', land: 'fert', zone: 'compostbins', at: [84, 54], look: ['🔨', '✨'], after: ['fert59'],
      name: 'Stack the pots', who: 'robin', xp: 13, needs: [{ item: 'clean', tier: 3, n: 1 }, { item: 'worms', tier: 2, n: 2 }], line: 'Just right!' },
    { id: 'fert62', land: 'fert', zone: 'compostbins', at: [14, 34], look: ['🔨', '✨'], after: ['fert60'],
      name: 'Plant a herb garden', who: 'sandy', xp: 13, needs: [{ item: 'worms', tier: 4, n: 1 }, { item: 'fert', tier: 3, n: 1 }], line: 'Wonderful!' },
    { id: 'fert63', land: 'fert', zone: 'compostbins', at: [14, 79], look: ['🔨', '✨'], after: ['fert61'],
      name: 'Brew compost tea', who: 'marnie', xp: 14, needs: [{ item: 'worms', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'fert64', land: 'fert', zone: 'compostbins', at: [28, 54], look: ['🔨', '✨'], after: ['fert62'], reward: { chest: 'blue' },
      name: 'Give compost to the neighbours', who: 'robin', xp: 14, needs: [{ item: 'worms', tier: 4, n: 1 }, { item: 'clean', tier: 4, n: 1 }], line: 'Hooray!' },
    // mushrooms
    { id: 'fert65', land: 'fert', zone: 'mushrooms', at: [84, 24], look: ['🔨', '✨'], after: ['fert21'],
      name: 'Spread worm castings', who: 'sandy', xp: 11, needs: [{ item: 'worms', tier: 4, n: 1 }], line: 'Hooray!' },
    { id: 'fert66', land: 'fert', zone: 'mushrooms', at: [14, 34], look: ['🔨', '✨'], after: ['fert21'],
      name: 'Plant moss', who: 'marnie', xp: 11, needs: [{ item: 'fert', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'fert67', land: 'fert', zone: 'mushrooms', at: [42, 89], look: ['🔨', '✨'], after: ['fert65'],
      name: 'Water the mushroom logs', who: 'robin', xp: 12, needs: [{ item: 'clean', tier: 3, n: 1 }, { item: 'worms', tier: 2, n: 2 }], line: 'Thank you!' },
    { id: 'fert68', land: 'fert', zone: 'mushrooms', at: [14, 89], look: ['🔨', '✨'], after: ['fert66'],
      name: 'Plant shade flowers', who: 'sandy', xp: 12, needs: [{ item: 'worms', tier: 4, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'Lovely!' },
    { id: 'fert69', land: 'fert', zone: 'mushrooms', at: [56, 24], look: ['🔨', '✨'], after: ['fert67'],
      name: 'Build a log path', who: 'marnie', xp: 12, needs: [{ item: 'worms', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'fert70', land: 'fert', zone: 'mushrooms', at: [42, 74], look: ['🔨', '✨'], after: ['fert68'],
      name: 'Fix the bench legs', who: 'robin', xp: 13, needs: [{ item: 'worms', tier: 4, n: 1 }, { item: 'clean', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'fert71', land: 'fert', zone: 'mushrooms', at: [28, 44], look: ['🔨', '✨'], after: ['fert69'],
      name: 'Hang bird boxes', who: 'sandy', xp: 13, needs: [{ item: 'worms', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'fert72', land: 'fert', zone: 'mushrooms', at: [70, 74], look: ['🔨', '✨'], after: ['fert70'],
      name: 'Clear the stream bed', who: 'marnie', xp: 13, needs: [{ item: 'fert', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'fert73', land: 'fert', zone: 'mushrooms', at: [70, 34], look: ['🔨', '✨'], after: ['fert71'], reward: { chest: 'brown' },
      name: 'Plant a tiny tree', who: 'robin', xp: 14, needs: [{ item: 'clean', tier: 4, n: 1 }, { item: 'worms', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Wonderful!' },
    { id: 'fert74', land: 'fert', zone: 'mushrooms', at: [84, 54], look: ['🔨', '✨'], after: ['fert72'],
      name: 'Make a toadstool ring', who: 'sandy', xp: 14, needs: [{ item: 'worms', tier: 5, n: 1 }, { item: 'fert', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'fert75', land: 'fert', zone: 'mushrooms', at: [28, 29], look: ['🔨', '✨'], after: ['fert73'],
      name: 'Lay mossy stepping stones', who: 'marnie', xp: 14, needs: [{ item: 'worms', tier: 6, n: 1 }], line: 'Hooray!' },
    { id: 'fert76', land: 'fert', zone: 'mushrooms', at: [28, 69], look: ['🔨', '✨'], after: ['fert74'],
      name: 'Hang lanterns on the branches', who: 'robin', xp: 15, needs: [{ item: 'worms', tier: 5, n: 1 }, { item: 'clean', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'fert77', land: 'fert', zone: 'mushrooms', at: [28, 84], look: ['🔨', '✨'], after: ['fert75'],
      name: 'Build a hedgehog house', who: 'sandy', xp: 15, needs: [{ item: 'worms', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'fert78', land: 'fert', zone: 'mushrooms', at: [56, 79], look: ['🔨', '✨'], after: ['fert76'],
      name: 'Plant bluebells', who: 'marnie', xp: 15, needs: [{ item: 'fert', tier: 6, n: 1 }], line: 'Lovely!' },
    { id: 'fert79', land: 'fert', zone: 'mushrooms', at: [84, 39], look: ['🔨', '✨'], after: ['fert77'],
      name: 'Weave a willow arch', who: 'robin', xp: 16, needs: [{ item: 'clean', tier: 4, n: 1 }, { item: 'worms', tier: 3, n: 2 }], line: 'Perfect!' },
    { id: 'fert80', land: 'fert', zone: 'mushrooms', at: [14, 24], look: ['🔨', '✨'], after: ['fert78'],
      name: 'Set up a fairy door', who: 'sandy', xp: 16, needs: [{ item: 'worms', tier: 5, n: 1 }, { item: 'fert', tier: 5, n: 1 }], line: 'So cozy!' },
    { id: 'fert81', land: 'fert', zone: 'mushrooms', at: [14, 49], look: ['🔨', '✨'], after: ['fert79'],
      name: 'Hold a midnight picnic', who: 'marnie', xp: 16, needs: [{ item: 'worms', tier: 6, n: 1 }], line: 'Great work!' },
    { id: 'fert82', land: 'fert', zone: 'mushrooms', at: [56, 49], look: ['🔨', '✨'], after: ['fert80'], reward: { chest: 'blue' },
      name: 'Light the glow path', who: 'robin', xp: 17, needs: [{ item: 'worms', tier: 5, n: 1 }, { item: 'clean', tier: 5, n: 1 }], line: 'Just right!' },
    // muddyshore
    { id: 'aqua29', land: 'aqua', zone: 'muddyshore', at: [14, 89], look: ['🔨', '✨'], after: ['aqua2'],
      name: 'Saw the first planks', who: 'willy', xp: 9, needs: [{ item: 'boat', tier: 1, n: 2 }], line: 'Just right!' },
    { id: 'aqua30', land: 'aqua', zone: 'muddyshore', at: [84, 89], look: ['🔨', '✨'], after: ['aqua2'],
      name: 'Build a little jetty', who: 'robin', xp: 9, needs: [{ item: 'aqua', tier: 1, n: 2 }], line: 'Wonderful!' },
    { id: 'aqua31', land: 'aqua', zone: 'muddyshore', at: [14, 49], look: ['🔨', '✨'], after: ['aqua29'],
      name: 'Rake out the reeds', who: 'sandy', xp: 10, needs: [{ item: 'fishing', tier: 1, n: 1 }, { item: 'boat', tier: 0, n: 2 }], line: 'Looks great!' },
    { id: 'aqua32', land: 'aqua', zone: 'muddyshore', at: [84, 49], look: ['🔨', '✨'], after: ['aqua30'],
      name: 'Fix the fishing stool', who: 'willy', xp: 10, needs: [{ item: 'boat', tier: 1, n: 1 }, { item: 'aqua', tier: 1, n: 1 }], line: 'Hooray!' },
    { id: 'aqua33', land: 'aqua', zone: 'muddyshore', at: [42, 24], look: ['🔨', '✨'], after: ['aqua31'],
      name: 'Tie up the old raft', who: 'robin', xp: 10, needs: [{ item: 'boat', tier: 2, n: 1 }], line: 'Beautiful!' },
    { id: 'aqua34', land: 'aqua', zone: 'muddyshore', at: [42, 89], look: ['🔨', '✨'], after: ['aqua32'],
      name: 'Lay new pebbles', who: 'sandy', xp: 11, needs: [{ item: 'boat', tier: 1, n: 1 }, { item: 'fishing', tier: 1, n: 1 }], line: 'Thank you!' },
    { id: 'aqua35', land: 'aqua', zone: 'muddyshore', at: [28, 79], look: ['🔨', '✨'], after: ['aqua33'],
      name: 'Build a bait box', who: 'willy', xp: 11, needs: [{ item: 'boat', tier: 2, n: 2 }], line: 'Lovely!' },
    { id: 'aqua36', land: 'aqua', zone: 'muddyshore', at: [84, 24], look: ['🔨', '✨'], after: ['aqua34'],
      name: 'Patch the old canoe', who: 'robin', xp: 11, needs: [{ item: 'aqua', tier: 2, n: 2 }], line: 'Perfect!' },
    { id: 'aqua37', land: 'aqua', zone: 'muddyshore', at: [70, 79], look: ['🔨', '✨'], after: ['aqua35'], reward: { chest: 'brown' },
      name: 'Plant marsh flowers', who: 'sandy', xp: 11, needs: [{ item: 'fishing', tier: 1, n: 1 }, { item: 'boat', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'So cozy!' },
    { id: 'aqua38', land: 'aqua', zone: 'muddyshore', at: [70, 59], look: ['🔨', '✨'], after: ['aqua36'],
      name: 'Mend the fishing nets', who: 'willy', xp: 12, needs: [{ item: 'boat', tier: 2, n: 1 }, { item: 'aqua', tier: 1, n: 1 }], line: 'Great work!' },
    { id: 'aqua39', land: 'aqua', zone: 'muddyshore', at: [56, 39], look: ['🔨', '✨'], after: ['aqua37'],
      name: 'Build a frog log', who: 'robin', xp: 12, needs: [{ item: 'boat', tier: 3, n: 1 }], line: 'Just right!' },
    { id: 'aqua40', land: 'aqua', zone: 'muddyshore', at: [28, 54], look: ['🔨', '✨'], after: ['aqua38'],
      name: 'Hang a life ring', who: 'sandy', xp: 12, needs: [{ item: 'boat', tier: 2, n: 1 }, { item: 'fishing', tier: 2, n: 1 }], line: 'Wonderful!' },
    { id: 'aqua41', land: 'aqua', zone: 'muddyshore', at: [70, 44], look: ['🔨', '✨'], after: ['aqua39'],
      name: 'Clear the shallows', who: 'willy', xp: 12, needs: [{ item: 'boat', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'aqua42', land: 'aqua', zone: 'muddyshore', at: [28, 29], look: ['🔨', '✨'], after: ['aqua40'],
      name: 'Build a bird hide', who: 'robin', xp: 13, needs: [{ item: 'aqua', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'aqua43', land: 'aqua', zone: 'muddyshore', at: [84, 39], look: ['🔨', '✨'], after: ['aqua41'],
      name: 'Paint the jetty', who: 'sandy', xp: 13, needs: [{ item: 'fishing', tier: 1, n: 1 }, { item: 'boat', tier: 0, n: 2 }], line: 'Beautiful!' },
    { id: 'aqua44', land: 'aqua', zone: 'muddyshore', at: [42, 64], look: ['🔨', '✨'], after: ['aqua42'],
      name: 'Put up a fishing sign', who: 'willy', xp: 13, needs: [{ item: 'boat', tier: 2, n: 1 }, { item: 'aqua', tier: 2, n: 1 }], line: 'Thank you!' },
    { id: 'aqua45', land: 'aqua', zone: 'muddyshore', at: [56, 29], look: ['🔨', '✨'], after: ['aqua43'],
      name: 'Build a rowing boat', who: 'robin', xp: 13, needs: [{ item: 'boat', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'aqua46', land: 'aqua', zone: 'muddyshore', at: [14, 39], look: ['🔨', '✨'], after: ['aqua44'], reward: { chest: 'blue' },
      name: 'Hold a fishing contest', who: 'sandy', xp: 14, needs: [{ item: 'boat', tier: 2, n: 1 }, { item: 'fishing', tier: 2, n: 1 }], line: 'Perfect!' },
    // lilypond
    { id: 'aqua47', land: 'aqua', zone: 'lilypond', at: [14, 24], look: ['🔨', '✨'], after: ['aqua13'],
      name: 'Build a little punt', who: 'willy', xp: 12, needs: [{ item: 'boat', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'aqua48', land: 'aqua', zone: 'lilypond', at: [84, 89], look: ['🔨', '✨'], after: ['aqua13'],
      name: 'Plant lily pads', who: 'robin', xp: 12, needs: [{ item: 'aqua', tier: 3, n: 2 }], line: 'So cozy!' },
    { id: 'aqua49', land: 'aqua', zone: 'lilypond', at: [84, 24], look: ['🔨', '✨'], after: ['aqua47'],
      name: 'Clean the bridge rails', who: 'sandy', xp: 13, needs: [{ item: 'fishing', tier: 2, n: 1 }, { item: 'boat', tier: 1, n: 2 }], line: 'Great work!' },
    { id: 'aqua50', land: 'aqua', zone: 'lilypond', at: [14, 44], look: ['🔨', '✨'], after: ['aqua48'],
      name: 'Fix the bridge steps', who: 'willy', xp: 13, needs: [{ item: 'boat', tier: 3, n: 1 }, { item: 'aqua', tier: 2, n: 1 }], line: 'Just right!' },
    { id: 'aqua51', land: 'aqua', zone: 'lilypond', at: [56, 89], look: ['🔨', '✨'], after: ['aqua49'],
      name: 'Feed the koi', who: 'robin', xp: 13, needs: [{ item: 'boat', tier: 4, n: 1 }], line: 'Wonderful!' },
    { id: 'aqua52', land: 'aqua', zone: 'lilypond', at: [84, 74], look: ['🔨', '✨'], after: ['aqua50'],
      name: 'Build a duck house', who: 'sandy', xp: 14, needs: [{ item: 'boat', tier: 3, n: 1 }, { item: 'fishing', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'aqua53', land: 'aqua', zone: 'lilypond', at: [42, 24], look: ['🔨', '✨'], after: ['aqua51'],
      name: 'Plant irises', who: 'willy', xp: 14, needs: [{ item: 'boat', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'aqua54', land: 'aqua', zone: 'lilypond', at: [28, 34], look: ['🔨', '✨'], after: ['aqua52'],
      name: 'Clear the algae', who: 'robin', xp: 14, needs: [{ item: 'aqua', tier: 4, n: 1 }], line: 'Beautiful!' },
    { id: 'aqua55', land: 'aqua', zone: 'lilypond', at: [56, 54], look: ['🔨', '✨'], after: ['aqua53'], reward: { chest: 'brown' },
      name: 'Build a fish shelter', who: 'sandy', xp: 15, needs: [{ item: 'fishing', tier: 2, n: 1 }, { item: 'boat', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Thank you!' },
    { id: 'aqua56', land: 'aqua', zone: 'lilypond', at: [14, 64], look: ['🔨', '✨'], after: ['aqua54'],
      name: 'Paint the lanterns', who: 'willy', xp: 15, needs: [{ item: 'boat', tier: 3, n: 1 }, { item: 'aqua', tier: 3, n: 1 }], line: 'Lovely!' },
    { id: 'aqua57', land: 'aqua', zone: 'lilypond', at: [84, 39], look: ['🔨', '✨'], after: ['aqua55'],
      name: 'Repair the stone edge', who: 'robin', xp: 15, needs: [{ item: 'boat', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'aqua58', land: 'aqua', zone: 'lilypond', at: [28, 89], look: ['🔨', '✨'], after: ['aqua56'],
      name: 'Plant a water lily', who: 'sandy', xp: 16, needs: [{ item: 'boat', tier: 3, n: 1 }, { item: 'fishing', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'aqua59', land: 'aqua', zone: 'lilypond', at: [42, 84], look: ['🔨', '✨'], after: ['aqua57'],
      name: 'Build a pond fountain', who: 'willy', xp: 16, needs: [{ item: 'boat', tier: 4, n: 1 }], line: 'Great work!' },
    { id: 'aqua60', land: 'aqua', zone: 'lilypond', at: [70, 79], look: ['🔨', '✨'], after: ['aqua58'],
      name: 'Hang a swing on the willow', who: 'robin', xp: 16, needs: [{ item: 'aqua', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'aqua61', land: 'aqua', zone: 'lilypond', at: [14, 54], look: ['🔨', '✨'], after: ['aqua59'],
      name: 'Set out a bench', who: 'sandy', xp: 17, needs: [{ item: 'fishing', tier: 3, n: 1 }, { item: 'boat', tier: 2, n: 2 }], line: 'Wonderful!' },
    { id: 'aqua62', land: 'aqua', zone: 'lilypond', at: [70, 44], look: ['🔨', '✨'], after: ['aqua60'],
      name: 'Lay a stepping stone path', who: 'willy', xp: 17, needs: [{ item: 'boat', tier: 4, n: 1 }, { item: 'aqua', tier: 3, n: 1 }], line: 'Looks great!' },
    { id: 'aqua63', land: 'aqua', zone: 'lilypond', at: [28, 49], look: ['🔨', '✨'], after: ['aqua61'],
      name: 'Float little candle boats', who: 'robin', xp: 18, needs: [{ item: 'boat', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'aqua64', land: 'aqua', zone: 'lilypond', at: [84, 59], look: ['🔨', '✨'], after: ['aqua62'], reward: { chest: 'blue' },
      name: 'Hold a lantern evening', who: 'sandy', xp: 18, needs: [{ item: 'boat', tier: 4, n: 1 }, { item: 'fishing', tier: 4, n: 1 }], line: 'Beautiful!' },
    // boatdock
    { id: 'aqua65', land: 'aqua', zone: 'boatdock', at: [14, 89], look: ['🔨', '✨'], after: ['aqua21'],
      name: 'Caulk the boat hulls', who: 'willy', xp: 14, needs: [{ item: 'boat', tier: 4, n: 1 }], line: 'Beautiful!' },
    { id: 'aqua66', land: 'aqua', zone: 'boatdock', at: [56, 89], look: ['🔨', '✨'], after: ['aqua21'],
      name: 'Sand the oars', who: 'robin', xp: 14, needs: [{ item: 'aqua', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'aqua67', land: 'aqua', zone: 'boatdock', at: [14, 69], look: ['🔨', '✨'], after: ['aqua65'],
      name: 'Paint the rowboat', who: 'sandy', xp: 14, needs: [{ item: 'fishing', tier: 3, n: 1 }, { item: 'boat', tier: 2, n: 2 }], line: 'Lovely!' },
    { id: 'aqua68', land: 'aqua', zone: 'boatdock', at: [42, 74], look: ['🔨', '✨'], after: ['aqua66'],
      name: 'Rig a sail', who: 'willy', xp: 15, needs: [{ item: 'boat', tier: 4, n: 1 }, { item: 'aqua', tier: 4, n: 1 }], line: 'Perfect!' },
    { id: 'aqua69', land: 'aqua', zone: 'boatdock', at: [14, 34], look: ['🔨', '✨'], after: ['aqua67'],
      name: 'Coil the ropes', who: 'robin', xp: 15, needs: [{ item: 'boat', tier: 5, n: 1 }], line: 'So cozy!' },
    { id: 'aqua70', land: 'aqua', zone: 'boatdock', at: [84, 29], look: ['🔨', '✨'], after: ['aqua68'],
      name: 'Fix the boathouse door', who: 'sandy', xp: 16, needs: [{ item: 'boat', tier: 4, n: 1 }, { item: 'fishing', tier: 4, n: 1 }], line: 'Great work!' },
    { id: 'aqua71', land: 'aqua', zone: 'boatdock', at: [84, 89], look: ['🔨', '✨'], after: ['aqua69'],
      name: 'Build a boat rack', who: 'willy', xp: 16, needs: [{ item: 'boat', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'aqua72', land: 'aqua', zone: 'boatdock', at: [42, 24], look: ['🔨', '✨'], after: ['aqua70'],
      name: 'Hang the anchors', who: 'robin', xp: 17, needs: [{ item: 'aqua', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'aqua73', land: 'aqua', zone: 'boatdock', at: [84, 64], look: ['🔨', '✨'], after: ['aqua71'], reward: { chest: 'brown' },
      name: 'Sew the sails', who: 'sandy', xp: 17, needs: [{ item: 'fishing', tier: 4, n: 1 }, { item: 'boat', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Looks great!' },
    { id: 'aqua74', land: 'aqua', zone: 'boatdock', at: [42, 44], look: ['🔨', '✨'], after: ['aqua72'],
      name: 'Build a canoe', who: 'willy', xp: 17, needs: [{ item: 'boat', tier: 5, n: 1 }, { item: 'aqua', tier: 5, n: 1 }], line: 'Hooray!' },
    { id: 'aqua75', land: 'aqua', zone: 'boatdock', at: [28, 29], look: ['🔨', '✨'], after: ['aqua73'],
      name: 'Varnish the deck', who: 'robin', xp: 18, needs: [{ item: 'boat', tier: 6, n: 1 }], line: 'Beautiful!' },
    { id: 'aqua76', land: 'aqua', zone: 'boatdock', at: [28, 79], look: ['🔨', '✨'], after: ['aqua74'],
      name: 'Fix the boathouse roof', who: 'sandy', xp: 18, needs: [{ item: 'boat', tier: 5, n: 1 }, { item: 'fishing', tier: 5, n: 1 }], line: 'Thank you!' },
    { id: 'aqua77', land: 'aqua', zone: 'boatdock', at: [56, 69], look: ['🔨', '✨'], after: ['aqua75'],
      name: 'Hang flags', who: 'willy', xp: 19, needs: [{ item: 'boat', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'aqua78', land: 'aqua', zone: 'boatdock', at: [70, 24], look: ['🔨', '✨'], after: ['aqua76'],
      name: 'Build a sailboat', who: 'robin', xp: 19, needs: [{ item: 'aqua', tier: 6, n: 1 }], line: 'Perfect!' },
    { id: 'aqua79', land: 'aqua', zone: 'boatdock', at: [70, 84], look: ['🔨', '✨'], after: ['aqua77'],
      name: 'Fit the mast', who: 'sandy', xp: 19, needs: [{ item: 'fishing', tier: 4, n: 1 }, { item: 'boat', tier: 3, n: 2 }], line: 'So cozy!' },
    { id: 'aqua80', land: 'aqua', zone: 'boatdock', at: [70, 49], look: ['🔨', '✨'], after: ['aqua78'],
      name: 'Launch the sailboat', who: 'willy', xp: 20, needs: [{ item: 'boat', tier: 5, n: 1 }, { item: 'aqua', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'aqua81', land: 'aqua', zone: 'boatdock', at: [28, 64], look: ['🔨', '✨'], after: ['aqua79'],
      name: 'Light the harbour lamp', who: 'robin', xp: 20, needs: [{ item: 'boat', tier: 6, n: 1 }], line: 'Just right!' },
    { id: 'aqua82', land: 'aqua', zone: 'boatdock', at: [14, 24], look: ['🔨', '✨'], after: ['aqua80'], reward: { chest: 'blue' },
      name: 'Hold a regatta', who: 'sandy', xp: 21, needs: [{ item: 'boat', tier: 5, n: 1 }, { item: 'fishing', tier: 5, n: 1 }], line: 'Wonderful!' },
    // gardengate
    { id: 'flower30', land: 'flower', zone: 'gardengate', at: [14, 89], look: ['🔨', '✨'], after: ['flower6'],
      name: 'Set up the first beehive', who: 'sandy', xp: 14, needs: [{ item: 'honey', tier: 1, n: 2 }], line: 'Wonderful!' },
    { id: 'flower31', land: 'flower', zone: 'gardengate', at: [84, 89], look: ['🔨', '✨'], after: ['flower6'],
      name: 'Trim the hedges', who: 'mayor', xp: 15, needs: [{ item: 'flower', tier: 1, n: 2 }], line: 'Looks great!' },
    { id: 'flower32', land: 'flower', zone: 'gardengate', at: [84, 49], look: ['🔨', '✨'], after: ['flower30'],
      name: 'Paint the gate', who: 'robin', xp: 15, needs: [{ item: 'decor', tier: 1, n: 1 }, { item: 'honey', tier: 0, n: 2 }], line: 'Hooray!' },
    { id: 'flower33', land: 'flower', zone: 'gardengate', at: [14, 74], look: ['🔨', '✨'], after: ['flower31'],
      name: 'Plant lavender', who: 'sandy', xp: 15, needs: [{ item: 'honey', tier: 1, n: 1 }, { item: 'flower', tier: 1, n: 1 }], line: 'Beautiful!' },
    { id: 'flower34', land: 'flower', zone: 'gardengate', at: [56, 89], look: ['🔨', '✨'], after: ['flower32'],
      name: 'Lay a gravel path', who: 'mayor', xp: 16, needs: [{ item: 'honey', tier: 2, n: 1 }], line: 'Thank you!' },
    { id: 'flower35', land: 'flower', zone: 'gardengate', at: [70, 39], look: ['🔨', '✨'], after: ['flower33'],
      name: 'Build a bird bath', who: 'robin', xp: 16, needs: [{ item: 'honey', tier: 1, n: 1 }, { item: 'decor', tier: 1, n: 1 }], line: 'Lovely!' },
    { id: 'flower36', land: 'flower', zone: 'gardengate', at: [56, 59], look: ['🔨', '✨'], after: ['flower34'],
      name: 'Plant roses by the fence', who: 'sandy', xp: 17, needs: [{ item: 'honey', tier: 2, n: 2 }], line: 'Perfect!' },
    { id: 'flower37', land: 'flower', zone: 'gardengate', at: [14, 44], look: ['🔨', '✨'], after: ['flower35'],
      name: 'Hang a flower basket', who: 'mayor', xp: 17, needs: [{ item: 'flower', tier: 2, n: 2 }], line: 'So cozy!' },
    { id: 'flower38', land: 'flower', zone: 'gardengate', at: [70, 79], look: ['🔨', '✨'], after: ['flower36'], reward: { chest: 'brown' },
      name: 'Fix the letterbox', who: 'robin', xp: 17, needs: [{ item: 'decor', tier: 1, n: 1 }, { item: 'honey', tier: 0, n: 2 }, { stat: 'sold', n: 3 }], line: 'Great work!' },
    { id: 'flower39', land: 'flower', zone: 'gardengate', at: [28, 69], look: ['🔨', '✨'], after: ['flower37'],
      name: 'Plant a wildflower strip', who: 'sandy', xp: 18, needs: [{ item: 'honey', tier: 2, n: 1 }, { item: 'flower', tier: 1, n: 1 }], line: 'Just right!' },
    { id: 'flower40', land: 'flower', zone: 'gardengate', at: [28, 84], look: ['🔨', '✨'], after: ['flower38'],
      name: 'Make honey for the Mayor', who: 'mayor', xp: 18, needs: [{ item: 'honey', tier: 3, n: 1 }], line: 'Wonderful!' },
    { id: 'flower41', land: 'flower', zone: 'gardengate', at: [42, 64], look: ['🔨', '✨'], after: ['flower39'],
      name: 'Build a trellis', who: 'robin', xp: 19, needs: [{ item: 'honey', tier: 2, n: 1 }, { item: 'decor', tier: 2, n: 1 }], line: 'Looks great!' },
    { id: 'flower42', land: 'flower', zone: 'gardengate', at: [70, 54], look: ['🔨', '✨'], after: ['flower40'],
      name: 'Plant sweet peas', who: 'sandy', xp: 19, needs: [{ item: 'honey', tier: 2, n: 2 }], line: 'Hooray!' },
    { id: 'flower43', land: 'flower', zone: 'gardengate', at: [14, 34], look: ['🔨', '✨'], after: ['flower41'],
      name: 'Fill the watering cans', who: 'mayor', xp: 20, needs: [{ item: 'flower', tier: 2, n: 2 }], line: 'Beautiful!' },
    { id: 'flower44', land: 'flower', zone: 'gardengate', at: [84, 59], look: ['🔨', '✨'], after: ['flower42'],
      name: 'Weed the path', who: 'robin', xp: 20, needs: [{ item: 'decor', tier: 1, n: 1 }, { item: 'honey', tier: 0, n: 2 }], line: 'Thank you!' },
    { id: 'flower45', land: 'flower', zone: 'gardengate', at: [56, 69], look: ['🔨', '✨'], after: ['flower43'],
      name: 'Build a garden arch', who: 'sandy', xp: 20, needs: [{ item: 'honey', tier: 2, n: 1 }, { item: 'flower', tier: 2, n: 1 }], line: 'Lovely!' },
    { id: 'flower46', land: 'flower', zone: 'gardengate', at: [84, 34], look: ['🔨', '✨'], after: ['flower44'],
      name: 'Put out pots of herbs', who: 'mayor', xp: 21, needs: [{ item: 'honey', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'flower47', land: 'flower', zone: 'gardengate', at: [84, 74], look: ['🔨', '✨'], after: ['flower45'], reward: { chest: 'blue' },
      name: 'Hold an open garden day', who: 'robin', xp: 21, needs: [{ item: 'honey', tier: 2, n: 1 }, { item: 'decor', tier: 2, n: 1 }], line: 'So cozy!' },
    // rosearch
    { id: 'flower48', land: 'flower', zone: 'rosearch', at: [84, 89], look: ['🔨', '✨'], after: ['flower13'],
      name: 'Feed the roses', who: 'sandy', xp: 17, needs: [{ item: 'honey', tier: 3, n: 1 }], line: 'So cozy!' },
    { id: 'flower49', land: 'flower', zone: 'rosearch', at: [56, 44], look: ['🔨', '✨'], after: ['flower13'],
      name: 'Tie up the climbers', who: 'mayor', xp: 17, needs: [{ item: 'flower', tier: 3, n: 2 }], line: 'Great work!' },
    { id: 'flower50', land: 'flower', zone: 'rosearch', at: [14, 79], look: ['🔨', '✨'], after: ['flower48'],
      name: 'Plant rose bushes', who: 'robin', xp: 18, needs: [{ item: 'decor', tier: 2, n: 1 }, { item: 'honey', tier: 1, n: 2 }], line: 'Just right!' },
    { id: 'flower51', land: 'flower', zone: 'rosearch', at: [14, 24], look: ['🔨', '✨'], after: ['flower49'],
      name: 'Collect rose petals', who: 'sandy', xp: 18, needs: [{ item: 'honey', tier: 3, n: 1 }, { item: 'flower', tier: 2, n: 1 }], line: 'Wonderful!' },
    { id: 'flower52', land: 'flower', zone: 'rosearch', at: [84, 74], look: ['🔨', '✨'], after: ['flower50'],
      name: 'Make rose honey', who: 'mayor', xp: 19, needs: [{ item: 'honey', tier: 4, n: 1 }], line: 'Looks great!' },
    { id: 'flower53', land: 'flower', zone: 'rosearch', at: [42, 29], look: ['🔨', '✨'], after: ['flower51'],
      name: 'Clean the fountain basin', who: 'robin', xp: 19, needs: [{ item: 'honey', tier: 3, n: 1 }, { item: 'decor', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'flower54', land: 'flower', zone: 'rosearch', at: [70, 64], look: ['🔨', '✨'], after: ['flower52'],
      name: 'Plant lilies', who: 'sandy', xp: 20, needs: [{ item: 'honey', tier: 3, n: 1 }], line: 'Beautiful!' },
    { id: 'flower55', land: 'flower', zone: 'rosearch', at: [28, 54], look: ['🔨', '✨'], after: ['flower53'],
      name: 'Lay a mosaic', who: 'mayor', xp: 20, needs: [{ item: 'flower', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'flower56', land: 'flower', zone: 'rosearch', at: [56, 84], look: ['🔨', '✨'], after: ['flower54'], reward: { chest: 'brown' },
      name: 'Build a rose pergola', who: 'robin', xp: 21, needs: [{ item: 'decor', tier: 2, n: 1 }, { item: 'honey', tier: 1, n: 2 }, { stat: 'sold', n: 5 }], line: 'Lovely!' },
    { id: 'flower57', land: 'flower', zone: 'rosearch', at: [28, 69], look: ['🔨', '✨'], after: ['flower55'],
      name: 'Prune the old roses', who: 'sandy', xp: 21, needs: [{ item: 'honey', tier: 3, n: 1 }, { item: 'flower', tier: 3, n: 1 }], line: 'Perfect!' },
    { id: 'flower58', land: 'flower', zone: 'rosearch', at: [84, 34], look: ['🔨', '✨'], after: ['flower56'],
      name: 'Start a hedge maze', who: 'mayor', xp: 22, needs: [{ item: 'honey', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'flower59', land: 'flower', zone: 'rosearch', at: [42, 49], look: ['🔨', '✨'], after: ['flower57'],
      name: 'Hang fairy lights on the arch', who: 'robin', xp: 22, needs: [{ item: 'honey', tier: 3, n: 1 }, { item: 'decor', tier: 3, n: 1 }], line: 'Great work!' },
    { id: 'flower60', land: 'flower', zone: 'rosearch', at: [70, 39], look: ['🔨', '✨'], after: ['flower58'],
      name: 'Build a love seat', who: 'sandy', xp: 22, needs: [{ item: 'honey', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'flower61', land: 'flower', zone: 'rosearch', at: [70, 79], look: ['🔨', '✨'], after: ['flower59'],
      name: 'Plant forget-me-nots', who: 'mayor', xp: 23, needs: [{ item: 'flower', tier: 4, n: 1 }], line: 'Wonderful!' },
    { id: 'flower62', land: 'flower', zone: 'rosearch', at: [14, 89], look: ['🔨', '✨'], after: ['flower60'],
      name: 'Make rose candles', who: 'robin', xp: 23, needs: [{ item: 'decor', tier: 3, n: 1 }, { item: 'honey', tier: 2, n: 2 }], line: 'Looks great!' },
    { id: 'flower63', land: 'flower', zone: 'rosearch', at: [42, 39], look: ['🔨', '✨'], after: ['flower61'],
      name: 'Paint the fountain', who: 'sandy', xp: 24, needs: [{ item: 'honey', tier: 4, n: 1 }, { item: 'flower', tier: 3, n: 1 }], line: 'Hooray!' },
    { id: 'flower64', land: 'flower', zone: 'rosearch', at: [56, 34], look: ['🔨', '✨'], after: ['flower62'],
      name: 'Hang a bird feeder', who: 'mayor', xp: 24, needs: [{ item: 'honey', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'flower65', land: 'flower', zone: 'rosearch', at: [70, 49], look: ['🔨', '✨'], after: ['flower63'], reward: { chest: 'blue' },
      name: 'Hold a rose festival', who: 'robin', xp: 25, needs: [{ item: 'honey', tier: 4, n: 1 }, { item: 'decor', tier: 4, n: 1 }], line: 'Thank you!' },
    // greenhouse
    { id: 'flower66', land: 'flower', zone: 'greenhouse', at: [84, 79], look: ['🔨', '✨'], after: ['flower22'],
      name: 'Pot up orchids', who: 'sandy', xp: 20, needs: [{ item: 'honey', tier: 4, n: 1 }], line: 'Thank you!' },
    { id: 'flower67', land: 'flower', zone: 'greenhouse', at: [84, 24], look: ['🔨', '✨'], after: ['flower22'],
      name: 'Clean the glass', who: 'mayor', xp: 20, needs: [{ item: 'flower', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'flower68', land: 'flower', zone: 'greenhouse', at: [14, 89], look: ['🔨', '✨'], after: ['flower66'],
      name: 'Mend the vents', who: 'robin', xp: 21, needs: [{ item: 'decor', tier: 3, n: 1 }, { item: 'honey', tier: 2, n: 2 }], line: 'Perfect!' },
    { id: 'flower69', land: 'flower', zone: 'greenhouse', at: [56, 69], look: ['🔨', '✨'], after: ['flower67'],
      name: 'Build potting shelves', who: 'sandy', xp: 22, needs: [{ item: 'honey', tier: 4, n: 1 }, { item: 'flower', tier: 4, n: 1 }], line: 'So cozy!' },
    { id: 'flower70', land: 'flower', zone: 'greenhouse', at: [28, 44], look: ['🔨', '✨'], after: ['flower68'],
      name: 'Set up a watering system', who: 'mayor', xp: 22, needs: [{ item: 'honey', tier: 5, n: 1 }], line: 'Great work!' },
    { id: 'flower71', land: 'flower', zone: 'greenhouse', at: [70, 89], look: ['🔨', '✨'], after: ['flower69'],
      name: 'Plant cacti', who: 'robin', xp: 23, needs: [{ item: 'honey', tier: 4, n: 1 }, { item: 'decor', tier: 4, n: 1 }], line: 'Just right!' },
    { id: 'flower72', land: 'flower', zone: 'greenhouse', at: [42, 34], look: ['🔨', '✨'], after: ['flower70'],
      name: 'Hang a thermometer', who: 'sandy', xp: 23, needs: [{ item: 'honey', tier: 5, n: 1 }], line: 'Wonderful!' },
    { id: 'flower73', land: 'flower', zone: 'greenhouse', at: [70, 34], look: ['🔨', '✨'], after: ['flower71'],
      name: 'Grow seedlings', who: 'mayor', xp: 24, needs: [{ item: 'flower', tier: 5, n: 1 }], line: 'Looks great!' },
    { id: 'flower74', land: 'flower', zone: 'greenhouse', at: [42, 59], look: ['🔨', '✨'], after: ['flower72'], reward: { chest: 'brown' },
      name: 'Make beeswax polish', who: 'robin', xp: 25, needs: [{ item: 'decor', tier: 4, n: 1 }, { item: 'honey', tier: 3, n: 2 }, { stat: 'sold', n: 7 }], line: 'Hooray!' },
    { id: 'flower75', land: 'flower', zone: 'greenhouse', at: [84, 64], look: ['🔨', '✨'], after: ['flower73'],
      name: 'Plant a lemon tree', who: 'sandy', xp: 25, needs: [{ item: 'honey', tier: 5, n: 1 }, { item: 'flower', tier: 5, n: 1 }], line: 'Beautiful!' },
    { id: 'flower76', land: 'flower', zone: 'greenhouse', at: [28, 24], look: ['🔨', '✨'], after: ['flower74'],
      name: 'Build hanging baskets', who: 'mayor', xp: 26, needs: [{ item: 'honey', tier: 6, n: 1 }], line: 'Thank you!' },
    { id: 'flower77', land: 'flower', zone: 'greenhouse', at: [14, 74], look: ['🔨', '✨'], after: ['flower75'],
      name: 'Mist the ferns', who: 'robin', xp: 26, needs: [{ item: 'honey', tier: 5, n: 1 }, { item: 'decor', tier: 5, n: 1 }], line: 'Lovely!' },
    { id: 'flower78', land: 'flower', zone: 'greenhouse', at: [14, 49], look: ['🔨', '✨'], after: ['flower76'],
      name: 'Plant rare lilies', who: 'sandy', xp: 27, needs: [{ item: 'honey', tier: 5, n: 1 }], line: 'Perfect!' },
    { id: 'flower79', land: 'flower', zone: 'greenhouse', at: [28, 84], look: ['🔨', '✨'], after: ['flower77'],
      name: 'Make honey candles', who: 'mayor', xp: 28, needs: [{ item: 'flower', tier: 6, n: 1 }], line: 'So cozy!' },
    { id: 'flower80', land: 'flower', zone: 'greenhouse', at: [70, 74], look: ['🔨', '✨'], after: ['flower78'],
      name: 'Repaint the frame', who: 'robin', xp: 28, needs: [{ item: 'decor', tier: 4, n: 1 }, { item: 'honey', tier: 3, n: 2 }], line: 'Great work!' },
    { id: 'flower81', land: 'flower', zone: 'greenhouse', at: [56, 39], look: ['🔨', '✨'], after: ['flower79'],
      name: 'Build a seed library', who: 'sandy', xp: 29, needs: [{ item: 'honey', tier: 5, n: 1 }, { item: 'flower', tier: 5, n: 1 }], line: 'Just right!' },
    { id: 'flower82', land: 'flower', zone: 'greenhouse', at: [56, 59], look: ['🔨', '✨'], after: ['flower80'],
      name: 'Grow a giant sunflower', who: 'mayor', xp: 29, needs: [{ item: 'honey', tier: 6, n: 1 }], line: 'Wonderful!' },
    { id: 'flower83', land: 'flower', zone: 'greenhouse', at: [70, 24], look: ['🔨', '✨'], after: ['flower81'], reward: { chest: 'blue' },
      name: 'Open the flower show', who: 'robin', xp: 30, needs: [{ item: 'honey', tier: 5, n: 1 }, { item: 'decor', tier: 5, n: 1 }], line: 'Looks great!' },
    // Sunnyvale itself (days 4 and 5): clear the fog, then rebuild each house
    // on the town square. Opens once the old farm is back (day 3).
    { id: 'town1', land: 'town', at: [50, 50], look: ['🌫️', ''], after: ['farm28', 'hay6', 'big8'], story: [['mayor', 'The fog is gone!']], name: 'Clear the fog from the square', who: 'mayor', xp: 15,
      needs: [{ stat: 'sold', n: 5 }], line: 'Fog gone!' },
    { id: 'town2', land: 'town', after: ['town1'], house: 'carpenter', name: 'Rebuild Robin\'s workshop', who: 'robin', xp: 20, reward: { chest: 'brown' },
      needs: [{ item: 'tools', tier: 5, n: 1 }, { item: 'wood', tier: 4, n: 1 }], line: 'My workshop!' },
    { id: 'town3', land: 'town', after: ['town1'], house: 'ranch', name: 'Fix up Marnie\'s ranch', who: 'marnie', xp: 25,
      needs: [{ item: 'barn', tier: 5, n: 1 }, { item: 'farm', tier: 4, n: 2 }], line: 'Home sweet home!' },
    { id: 'town4', land: 'town', after: ['town1'], house: 'fishshop', name: 'Reopen Willy\'s fish shop', who: 'willy', xp: 35, reward: { chest: 'blue' },
      needs: [{ item: 'aqua', tier: 4, n: 1 }, { item: 'fert', tier: 4, n: 1 }], line: 'Fish for all!' },
    { id: 'town5', land: 'town', after: ['town2'], house: 'flowershop', name: 'Reopen Sandy\'s flower shop', who: 'sandy', xp: 45,
      needs: [{ item: 'flower', tier: 4, n: 2 }], line: 'Flowers!' },
    { id: 'town6', land: 'town', after: ['town3', 'town4', 'town5'], house: 'townhall', name: 'Restore the Town Hall', who: 'mayor', xp: 80, reward: { chest: 'blue' },
      needs: [{ item: 'barn', tier: 6, n: 1 }, { item: 'hay', tier: 5, n: 1 }, { item: 'aqua', tier: 5, n: 1 }],
      line: 'You\'re a hero!' },
    { id: 'town7', land: 'town', at: [50, 66], look: ['🪧', '🎉'], after: ['town6'], name: 'Throw the Sunnyvale festival', who: 'marnie', xp: 100, reward: { gems: 50 },
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
    { id: 'fieldgate',   land: 'farm',   name: 'Field Gate',      level: 2 },
    { id: 'berryrows',   land: 'farm',   name: 'Strawberry Rows', level: 3 },
    { id: 'orchard',     land: 'farm',   name: 'Orchard',         level: 4 },
    { id: 'meadow',      land: 'hay',    name: 'Meadow',          level: 3 },
    { id: 'stables',     land: 'hay',    name: 'Stables',         level: 4 },
    { id: 'windmill',    land: 'hay',    name: 'Windmill',        level: 5 },
    { id: 'leafpiles',   land: 'fert',   name: 'Leaf Piles',      level: 4 },
    { id: 'compostbins', land: 'fert',   name: 'Compost Bins',    level: 5 },
    { id: 'mushrooms',   land: 'fert',   name: 'Mushroom Corner', level: 6 },
    { id: 'muddyshore',  land: 'aqua',   name: 'Muddy Shore',     level: 5 },
    { id: 'lilypond',    land: 'aqua',   name: 'Lily Pond',       level: 6 },
    { id: 'boatdock',    land: 'aqua',   name: 'Boat Dock',       level: 7 },
    { id: 'gardengate',  land: 'flower', name: 'Garden Gate',     level: 6 },
    { id: 'rosearch',    land: 'flower', name: 'Rose Arch',       level: 7 },
    { id: 'greenhouse',  land: 'flower', name: 'Greenhouse',      level: 8 },
];
// Finishing an area (other than a land's last) pays this.
const ZONE_REWARD = { gems: 5, chest: 'brown' };
// Where an area's person stands when it has no clear spot of its own (person).
const ZONE_PERSON = [42, 56];
// Spots for jobs without their own place in a picture yet, in order.
const ZONE_SLOTS = [[30, 36], [70, 42], [46, 64], [22, 84], [74, 82]];
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
    else { fixLand = land; goTo('fix'); }
    if (jobId) pointAtJob(TASKS.find(t => t.id === jobId));
}

// Story bubbles wait while you're being taken to a job, so its card isn't lost.
let storyHoldUntil = 0;

function pointAtJob(task) {
    const spot = document.querySelector(`#scene-${task.land === 'town' ? 'town' : 'fix'} [data-job="${task.id}"]`);
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
        const icon = n.item ? itemIcon(n.item, n.tier) : n.stat ? TASK_STATS[n.stat].emoji : '🏡';
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
    if (stages) {
        // Painted: the whole area is one painting of how far along it is, tall
        // enough to scroll; its open jobs are bubbles over the painted mess.
        const pic = stages[stageIndex(done, tasks.length)];
        el.classList.add('painted');
        el.innerHTML = `<div class="zone-backdrop" style="background-image:url('${pic}')"></div>
                        <div class="zone-scroll"><div class="zone-frame"><img class="zone-art" src="${pic}" alt="" draggable="false"></div></div>`;
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

// --- PAINTED PAGES ---
// Which of a page's three paintings shows: ruined until half its jobs are done,
// half fixed until the last one, then restored.
function stageIndex(done, total) {
    return done >= total ? 2 : done * 2 >= total ? 1 : 0;
}

// Where a job's bubble sits on its painting (% across, % down).
const HOUSE_AT = { townhall: [50, 24], carpenter: [14, 62], ranch: [87, 40], fishshop: [11, 38], flowershop: [86, 64] };

function jobAt(task, i) {
    return task.at || HOUSE_AT[task.house] || ZONE_SLOTS[i % ZONE_SLOTS.length];
}

// On a painting the things to fix are painted in, so each open job is a soft
// glowing ring on its spot with a bubble over it: the job's name and what it
// needs, ticked off as you make them. Done and later jobs show nothing.
function addJobChips(tasks, el) {
    tasks.forEach((task, i) => {
        if (!taskOpen(task)) return;
        const [x, y] = jobAt(task, i);
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
    scroll.innerHTML = `<div class="page-frame"><img class="page-art" src="${pic}" alt="" draggable="false"></div>`;
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
    const next = img.cloneNode();
    next.classList.add('page-next');
    next.src = src;
    img.after(next);
    const show = () => requestAnimationFrame(() => next.classList.add('in'));
    if (next.complete) show();
    else next.addEventListener('load', show, { once: true });
    setTimeout(() => { img.src = src; next.remove(); }, 1500);
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
    const needs = task.needs.map(n => {
        const p = needProgress(task, n);
        const icon = n.item ? itemIcon(n.item, n.tier) : n.stat ? TASK_STATS[n.stat].emoji : '🏡';
        return tile(`${icon}<small>${n.own ? AREAS[n.own].name : `${p.have}/${p.of}`}</small>`, p.have >= p.of);
    }).join('');
    const pays = tile(`${uiIcon('star', '⭐')}<small>×${task.xp}</small>`) + (task.reward ? tile(`<small>${rewardText(task.reward)}</small>`) : '');
    const here = task.land === 'town' ? currentScene === 'town' : currentScene === 'fix' && fixLand === task.land;
    showDialog({
        sheet: true,
        art: npcPicture(npc),
        artRound: true,
        title: task.name,
        body: `<div class="sheet-progress"><span class="quest-bar"><i style="width:${pct}%"></i></span><b>${pct}%</b>${uiIcon('reward', '🎁')}</div>
               <div class="sheet-cols"><div><h4>Items needed</h4><div class="tiles">${needs}</div></div>
               <div><h4>Rewards</h4><div class="tiles">${pays}</div></div></div>`,
        actions: [ready
            ? { label: !hasSpot(task) ? 'Do it!' : here ? 'Fix it!' : `Go to ${task.zone ? ZONE[task.zone].name : landName(task.land)}`, primary: true, wide: true,
                onClick: () => (!hasSpot(task) ? completeTask(task.id) : here ? fixJob(task.id) : goFix(task.land, task.id)) }
            : { label: 'Go', primary: true, wide: true, onClick: () => goWork(task) }],
    });
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
    btn.addEventListener('click', () => goTo(mode));
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
    const wave = (ASSETS.wave || {})[npc.id];
    card.innerHTML = `<img class="${wave ? 'wave' : 'face'}" src="${wave || npcPicture(npc)}" alt="${npc.name}">
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
    const scene = document.getElementById(task.land === 'town' ? 'scene-town' : 'scene-fix');
    const spot = scene.hidden ? null : scene.querySelector(`[data-job="${id}"]`);
    if (!spot) return completeTask(id);
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
    fx('fix-dust', '💨', 500);
    fx('fix-dust two', '💨', 850);
    setTimeout(() => {
        // The new look, and the building's next stage if it has one.
        spot.classList.remove('hammering', 'open', 'ready');
        spot.classList.add('fixed', 'just-fixed');
        sfx('sparkle');
        buzz(30);
        spot.querySelectorAll('.task-pin, .fix-hammer').forEach(el => el.remove());
        if (!spot.classList.contains('chip')) spot.querySelector('.fix-face').innerHTML = fixFace(task, true) || '✨';
        addTag(spot, 'fix-swirl', '');
        ['✨', '⭐', '✨', '⭐', '✨', '⭐'].forEach((s, k) => {
            const p = addTag(spot, 'fix-spark', s);
            p.style.setProperty('--a', `${k * 60}deg`);
        });
        // Colour comes back around the spot, and the building steps up if it has stages.
        const zoneEl = spot.closest('.zone');
        const jobs = task.zone ? zoneTasks(task.zone) : landTasks(task.land);
        const done = jobs.filter(taskDone).length + 1;
        if (zoneEl && zoneEl.classList.contains('painted')) {
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
        if (zoneOpen(zone) && !el.classList.contains('painted')) addZonePerson(el.querySelector('.zone-frame'), zoneTasks(zone.id), zone);
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
    const fresh = landZones(land).filter(z => zoneOpen(z) && !restoration.zonesOpen.includes(z.id));
    if (!fresh.length || fixing || !tutorial.done || !dialogEl.hidden || !world) return;
    fresh.forEach(z => restoration.zonesOpen.push(z.id));
    const zone = fresh[0];
    const el = world.querySelector(`[data-zone="${zone.id}"]`);
    el.classList.add('unlocking');
    el.insertAdjacentHTML('beforeend', `<div class="zone-clouds"></div><div class="zone-key">${uiIcon('key', '🗝️')}</div>`);
    world.scrollLeft = el.offsetLeft;
    document.body.classList.add('busy');
    setTimeout(() => { el.classList.add('opening'); sfx('unlock'); buzz([20, 40, 20]); }, 1000);
    setTimeout(() => {
        document.body.classList.remove('busy');
        el.classList.remove('unlocking', 'opening');
        el.querySelectorAll('.zone-clouds, .zone-key').forEach(c => c.remove());
        newAreaCard(zone);
    }, 2000);
}

// The new area's card, once nothing else is showing (it never covers a job's card).
function newAreaCard(zone, tries = 0) {
    if (!dialogEl.hidden || fixing) return tries < 120 && setTimeout(() => newAreaCard(zone, tries + 1), 500);
    showDialog({
        art: ((ASSETS.stages || {})[zone.id] || [])[2] || (ASSETS.areas || {})[zone.id] || ASSETS.buildings[zone.land],
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

// Each "day" is a set of jobs, with one bubble when it starts.
const CHAPTERS = [
    { scene: [['mayor', 'Save us!']], jobs: jobsIn('barnyard') },
    { scene: [['robin', 'Fix the barn!']], jobs: jobsIn('henhouse', 'bigbarn') },
    { scene: [['marnie', 'Grow food!']],
      jobs: jobsOf('farm', 'hay') },
    { scene: [['mayor', 'Fix the town!']],
      jobs: ['town1', 'town2', 'town3', 'town4', ...jobsOf('fert', 'aqua')] },
    { scene: [['robin', 'Fix the Town Hall!']], jobs: ['town5', 'town6', 'town7', ...jobsOf('flower')] },
];

const STORY_END = [['mayor', 'You saved us!', 'Yay!']];

// A little scene when a whole land is back, played after its reward.
const LAND_STORY = {
    barn: [['robin', 'The barn is like new!'], ['marnie', 'The animals love it!'], ['mayor', 'One down. On to the fields!']],
    farm: [['marnie', 'Look at those rows!'], ['mayor', 'Sunnyvale will eat well!']],
    hay: [['marnie', 'The windmill turns!'], ['robin', 'Fresh hay for everyone!']],
    fert: [['sandy', 'Fairy lights and mushrooms!'], ['marnie', 'Best soil in the valley.']],
    aqua: [['willy', 'Fish are jumping again!'], ['willy', 'Row with me sometime?']],
    flower: [['sandy', 'Every flower is blooming!'], ['mayor', 'Sunnyvale has never looked lovelier.']],
};

// Story beats from jobs just done, played once nothing else is showing.
const storyQueue = [];

// Which scenes have played. Saved.
const story = { intro: false, seen: [], ended: false };
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
    const [who, text, answer] = lines[0];
    const npc = npcs.find(n => n.id === who);
    const last = lines.length === 1;
    const wave = (ASSETS.wave || {})[who];
    showDialog({
        art: wave || npcPicture(npc),
        artRound: !wave,
        title,
        body: `<p class="story-line">“${text}”</p><p class="hint">— ${npc.name}</p>${last ? extra : ''}`,
        actions: [{ label: answer || 'OK!', primary: true,
            onClick: () => (last ? then && then() : playScene(title, lines.slice(1), extra, then)) }],
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
    { mood: 'sun', text: 'Sunnyvale was the happiest little farm town in the valley.' },
    { mood: 'storm', text: 'Then one night, a terrible storm swept through.' },
    { mood: 'rain', text: 'Barns fell. Fields flooded. Most folks packed up and left…' },
    { mood: 'friends', text: '…but a few friends stayed, hoping someone would come and help.' },
];

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
        <div class="op-clouds">${[0, 1, 2, 3, 4, 5].map(i => `<img src="${cloud}" alt="" style="--i:${i}">`).join('')}</div>
        <div class="op-rain"></div>
        <div class="op-flash"></div>
        <div class="op-title"><h1>Merge<br><span>Farmstead</span></h1><p>Tap to start</p></div>
        <p class="op-caption"></p>
        <div class="op-friends">${['marnie', 'robin', 'mayor', 'willy', 'sandy'].map((id, i) =>
            `<img src="${(ASSETS.wave || {})[id] || npcPicture(npcs.find(n => n.id === id))}" alt="" style="--i:${i}">`).join('')}</div>
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
        await ask(`<img class="op-who" src="${(ASSETS.wave || {}).mayor || npcPicture(mayor)}" alt="">
            <b class="op-name">${mayor.name}</b>
            <p>Oh! You must be the new farmer! Welcome to ${TOWN_NAME}.</p>
            <p>The storm left our farm in ruins. Will you help us bring it back to life?</p>`, 'I\'ll help!');
        if (skipped) return;
        const pic = (src, alt) => `<img src="${src}" alt="${alt}">`;
        const items = ASSETS.items.barn || [];
        await ask(`<h2>How to play</h2>
            <div class="op-how"><span>${pic(ASSETS.producers.barn[3], '🧺')}</span>
                <p><b>Tap</b> a producer to make things.</p></div>
            <div class="op-how"><span>${pic(items[0], '🌿')}<i>+</i>${pic(items[0], '🌿')}<i>=</i>${pic(items[1], '🥚')}</span>
                <p><b>Drag</b> two of the same together: they <b>merge</b> into something better.</p></div>
            <div class="op-how"><span>${pic(ASSETS.ui.hammer, '🔨')}</span>
                <p>Use what you make to finish <b>jobs</b> and fix up the farm!</p></div>`, 'Let\'s go!');
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
    playScene(`📖 Day ${i + 1}`, CHAPTERS[i].scene, extra);
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
        : need.stat ? `${TASK_STATS[need.stat].emoji} ${TASK_STATS[need.stat].label}`
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
    fillJar(GEM_JAR.perJob);
    delete restoration.baselines[task.id];
    lastSale = null;
    const npc = npcs.find(n => n.id === task.who);
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
    if (task.story) storyQueue.push(task.story);
    if (quiet && !restored && !zoneFinished) cheer(task, npc);
    else showDialog({
        art: npcPicture(npc),
        artRound: true,
        title: `✅ ${task.name}`,
        body: `<p>“${task.line}”</p><p class="hint">— ${npc.name}</p>
               <p><b>+⭐${task.xp}</b>${task.reward ? ` · ${rewardText(task.reward)}` : ''}</p>
               ${restored ? `<p class="restored-note">✨ ${landName(task.land)} restored! ${rewardText(LAND_REWARD)}</p>` : ''}
               ${zoneFinished ? `<p class="restored-note">✨ ${zone.name} restored! ${rewardText(ZONE_REWARD)}</p>
                   ${nextZone ? `<p class="hint">Next: ${nextZone.name}${quests.level < nextZone.level ? ` (level ${nextZone.level})` : ''}</p>` : ''}` : ''}`,
        actions: [{ label: 'Yay!', primary: true }],
    });
    // XP last: a level-up popup follows this one.
    addXp(task.xp);
    checkTasks();
    if (AREAS[currentScene]) refreshBoard(currentScene);
    else if (currentScene === 'fix') renderFix();
    else if (currentScene === 'town') renderTown();
}

// After a fix: who's happy and what it paid, floating over the place for a moment.
function cheer(task, npc) {
    document.querySelectorAll('.fix-cheer').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'fix-cheer';
    const happy = (ASSETS.cheer || {})[npc.id];
    el.innerHTML = iconize(`<img class="${happy ? 'happy' : 'face'}" src="${happy || npcPicture(npc)}" alt=""><span><b>“${task.line}”</b>
                    <small>+${uiIcon('star', '⭐')}${task.xp}${task.reward ? ` · ${rewardText(task.reward)}` : ''}</small></span>`);
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
        const heading = ch !== chapter ? `<h3 class="chapter-h">📖 Day ${ch + 1}</h3>` : '';
        chapter = ch;
        return `${heading}<div class="task-row${ready ? ' ready' : ''}">
                    <img class="face" src="${npcPicture(npcs.find(n => n.id === task.who))}" alt="">
                    <div class="task-body">
                        <b>${task.name}${task.story ? ' 📖' : ''}</b> <small>${landName(task.land)} ${done}/${landTasks(task.land).length}</small>
                        <div class="needs">${task.needs.map(n => needLabel(task, n)).join('')}</div>
                    </div>
                    <button class="task-go" data-id="${task.id}" data-can="${ready ? 1 : ''}">${ready ? (hasSpot(task) ? 'Go fix' : 'Do it') : hasSpot(task) ? 'Show' : 'Go'}<br>+⭐${task.xp}</button>
                </div>`;
    }).join('');
    showDialog({
        title: `⭐ Level ${quests.level}`,
        body: `<div class="quest xp-row"><span>⭐ XP to level ${quests.level + 1}</span><small>${quests.xp}/${need}</small>
                   <span class="quest-bar xp"><i style="width:${(100 * quests.xp) / need}%"></i></span></div>
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
        body: `<div class="gift-track">${track}</div><p class="hint">A new gift every day. Miss a day and the track starts over.</p>`,
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
    'Welcome in! Land deeds are on the shelves. New land means new things to merge.',
    'Townsfolk pay well for what you raise. Check the Town Square often!',
    'That Growth Guide on the counter lets everything grow one size bigger.',
];
let shopkeeperLine = 0;

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

function showDialog({ art, artRound = false, title, body, actions, sheet = false }) {
    dialogEl.classList.toggle('sheet', sheet); // a card sliding up from the bottom
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
        btn.className = 'btn' + (action.primary ? ' btn-primary' : '') + (action.wide ? ' btn-wide' : '');
        if (action.icon) btn.innerHTML = `${action.icon} `;
        btn.insertAdjacentHTML('beforeend', iconize(action.label));
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
    const on = settings.music && document.visibilityState !== 'hidden' && audioUnlocked;
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
            addTag(spot, 'sale-sign', quests.level < area.level ? `${uiIcon('lock', '🔒')} Level ${area.level}` : `FOR SALE<br>💵 ${area.cost}`);
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
            addTag(spot, 'sale-sign', quests.level < area.level ? `${uiIcon('lock', '🔒')} Lv ${area.level}` : `💵 ${area.cost}`);
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

    if ((ASSETS.stages || {}).map) addMapLabels(scene);
    else addMapSprites(scene);

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
    scene.append(side, boardFab(lastBoard), tasksFab('btn-quests'));
}

// ⚙️ Sound and vibration, on or off (saved).
function openSettings() {
    const row = (key, label) => ({ label: `${label}: ${settings[key] ? 'On' : 'Off'}`, wide: true, primary: settings[key],
        onClick: () => { settings[key] = !settings[key]; saveGame(); if (key === 'sound') sfx('coin'); else if (key === 'music') syncMusic(); else buzz(40); openSettings(); } });
    showDialog({
        title: '⚙️ Settings',
        body: '<p class="hint">Music, little sounds as you play, a buzz on phones, and tips that show you around.</p>',
        actions: [row('music', '🎵 Music'), row('sound', '🔊 Sound'), row('vibrate', '📳 Vibration'), row('tips', '💡 Tips'), { label: 'Done' }],
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
    if (grids[id].filter(Boolean).length <= 1) grids[id] = clutterBoard();
    ensureToolboxes();
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

// Orders grow with you: from level 4 the smallest asks creep up a tier every
// three levels, and the bigger ones (paying double a tier) come up a bit more.
function orderTier() {
    const low = Math.min(maxTier, 1 + Math.floor(Math.max(0, quests.level - 3) / 3));
    return low + Math.floor(Math.random() ** 0.8 * (maxTier - low + 1));
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
    // A new game's first order is an easy one with a producer part in it: Marnie
    // wants an Egg, which the tutorial walks you through.
    if (newGame) {
        const marnie = npcs.find(npc => npc.id === 'marnie');
        Object.assign(marnie.request, { mode: 'barn', tier: 2, rewardMoney: 35, rewardXp: orderXp(2), rewardProducer: true });
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

function openNpc(npc) {
    markGuide('npc');
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
}

// A delivery: the customer pops up over their order to say thanks, and the
// coins and stars fly from it to their counters at the top.
const THANKS = ['Thank you!', 'Just what I needed!', 'Perfect, thanks!', 'Oh, lovely!', 'You\'re a star!', 'Wonderful, thank you!'];

function thankYou(npc, r, from, levelUp) {
    const stage = stageEl.getBoundingClientRect();
    const at = from || { left: stage.left + stage.width * 0.3, right: stage.left + stage.width * 0.7, top: stage.top + stage.height * 0.3, bottom: stage.top + stage.height * 0.3 };
    const el = document.createElement('div');
    el.className = 'thanks';
    el.innerHTML = iconize(`<img class="face" src="${npcPicture(npc)}" alt="">
        <span><b>${npc.name}</b><i>${THANKS[Math.floor(Math.random() * THANKS.length)]}</i>
        <small>+💵${r.rewardMoney} &nbsp;+⭐${r.rewardXp}${levelUp ? ` &nbsp;· Lv.${npc.deliveries / 5 + 1}! +💎${LEVEL_UP_GEMS}` : ''}</small></span>`);
    stageEl.appendChild(el);
    const x = Math.min(Math.max((at.left + at.right) / 2 - stage.left, stage.width * 0.3), stage.width * 0.7);
    el.style.left = `${x}px`;
    el.style.top = `${at.bottom - stage.top + 6}px`;
    setTimeout(() => el.remove(), 2400);
    const centre = { x: (at.left + at.right) / 2, y: (at.top + at.bottom) / 2 };
    flyReward('💵', centre, document.getElementById('btn-coins'), 4, 250);
    flyReward('⭐', centre, document.getElementById('btn-level'), 2, 400);
    if (levelUp) flyReward('💎', centre, document.getElementById('btn-gems'), 2, 550);
}

// Little icons flying in an arc from a point on screen to a counter, which bumps as they land.
function flyReward(icon, from, toEl, count = 3, delay = 0) {
    if (!toEl || !from) return;
    const to = toEl.getBoundingClientRect();
    const ex = to.left + to.width * 0.25, ey = to.top + to.height / 2;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fly-reward';
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
    if (maxTier < NAMES['barn'].length - 1) addTag(tile('guide', '📖', 'Growth Guide', offerUpgrade), 'price-tag', `💵${maxTier * 100}`);
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
    { id: 'barn', scene: 'map', who: 'mayor', text: 'The storm hit our Barn the hardest. Let\'s start there: tap the Barn!',
      target: () => document.querySelector('#scene-map button.spot[data-id="barn"]'), done: () => currentScene !== 'map' || stats.merges > 0 },
    { id: 'job', scene: 'fix', who: 'mayor', explain: true,
      text: 'This is the Barnyard. Every job here needs something from you. This first one: open 1 box on the merge board.',
      target: () => jobSpot(), done: () => currentScene === 'barn' || stats.merges > 0 },
    { id: 'merge', scene: 'fix', who: 'mayor', text: 'Things are made on the merge board. Tap Merge to go there!',
      target: () => document.querySelector('#scene-fix .fix-merge'), done: () => currentScene === 'barn' || stats.merges > 0 },
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
    { id: 'egg', scene: 'barn', who: 'marnie', explain: true,
      text: 'You made an Egg! Merging two alike always makes the next thing: Feed → Egg → Chick → Chicken…',
      target: () => cellItem('barn', freeEgg()), done: () => webFreed() },
    { id: 'web', scene: 'barn', who: 'marnie', explain: true,
      text: 'See the Egg under cobwebs? It\'s stuck, and so are the boxes. Merge a matching item onto a cobwebbed one to free it, and the boxes next to it pop open!',
      target: () => webbedEgg() >= 0 && [cellItem('barn', webbedEgg()), ...getNeighbors(webbedEgg()).filter(i => grids.barn[i] && grids.barn[i].type === 'box').map(i => cellItem('barn', i))],
      done: () => webFreed() },
    { id: 'free', scene: 'barn', who: 'marnie', drag: true, text: 'Drag your Egg onto the cobwebbed Egg!',
      target: () => (freeEgg() >= 0 && webbedEgg() >= 0 ? [cellItem('barn', freeEgg()), cellItem('barn', webbedEgg())] : []),
      done: () => webFreed(),
      // No Egg of your own (it went into an order): two Feed make one.
      fallback: () => (feedPair().length ? { text: 'Make an Egg first: drag one Feed onto the other!', drag: true, target: () => feedPair().map(i => cellItem('barn', i)) }
          : { text: 'Tap the Feed Bin to make Feed!', target: () => cellItem('barn', feedBin()) }) },
    { id: 'deliver', scene: 'barn', who: 'marnie', text: 'A Chick, just what I wanted! Tap Deliver to give it to me.',
      target: () => document.querySelector('#scene-barn .order-card.ready[data-npc="marnie"]') || document.querySelector('#scene-barn .order-card.ready:not(.task-card)'),
      done: () => stats.delivered >= 1,
      fallback: () => ({ text: 'Orders want items from the board. Tap Deliver when one is ready!',
          target: () => document.querySelector('#scene-barn .order-card:not(.task-card):not(.other)') }) },
    // The first fix, in the Barnyard itself.
    { id: 'fix', scene: 'fix', who: 'mayor', text: 'You opened a box, so the planks can go! Tap the job to fix it.',
      target: () => jobSpot(), done: () => stats.jobs >= 1 },
    // Off you go: the next job, and how to see what any job needs.
    { id: 'onward', scene: 'fix', who: 'mayor', explain: true,
      text: 'That\'s how it\'s done! These are your next jobs. Tap one any time to see what it needs, then make it on the merge board.',
      target: () => [...document.querySelectorAll('#scene-fix .task-pin')], done: () => stats.jobs >= 2 },
];
const tutorial = { step: 0, done: false, explained: [] };

// The Barnyard's open job: its spot and its card.
function jobSpot() {
    return [document.querySelector('#scene-fix .fix-spot.open'), document.querySelector('#scene-fix .task-pin')];
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
    if (currentScene !== step.scene || (step.scene === 'fix' && fixLand !== 'barn')) {
        explain = drag = false;
        if (step.scene === 'fix' && currentScene === 'barn') {
            // Back from the board to the Barnyard: its job card leads there.
            target = document.querySelector('#scene-barn .task-card') || backBtn;
            text = 'Now tap the job to go back to the Barnyard!';
        } else if (step.scene === 'barn' && currentScene === 'fix' && fixLand === 'barn') {
            target = document.querySelector('#scene-fix .fix-merge');
            text = 'Tap Merge to go to the merge board!';
        } else if (step.scene === 'map') {
            target = backBtn;
            text = 'Back to the map!';
        } else if (currentScene === 'map') {
            target = document.querySelector('#scene-map button.spot[data-id="barn"]');
            text = 'Tap the Barn!';
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

    const stage = stageEl.getBoundingClientRect();
    const rect = el => el.getBoundingClientRect();
    const centre = el => { const r = rect(el); return { x: r.left + r.width / 2 - stage.left, y: r.top + r.height / 2 - stage.top }; };
    // Something to tap that's scrolled out of view comes into view.
    const r0 = rect(targets[0]);
    if (r0.bottom < stage.top || r0.top > stage.bottom || r0.left < stage.left || r0.right > stage.right) {
        targets[0].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
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
      steps: [{ scene: 'market', who: 'marnie', lead: 'Want bigger animals?', text: 'Want bigger animals? The Growth Guide lets merges go one size up!',
                target: () => q('#scene-market #btn-guide'), done: () => marked('upgrade') }] },
    // Levelling up: XP stars on the board.
    { id: 'xp', when: () => boardCell(c => c.type === 'xp') >= 0,
      steps: [{ scene: () => onBoard(), who: 'mayor', text: 'Tap the ⭐ to collect XP. Levels open new land!',
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'xp')), done: () => boardCell(c => c.type === 'xp') < 0 }] },
    { id: 'currency', when: () => boardCell(c => c.type === 'coin' || c.type === 'gem' || c.type === 'energy') >= 0,
      steps: [{ scene: () => onBoard(), who: 'marnie', text: 'Coins, gems and ⚡ on the board: tap to collect them!',
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'coin' || c.type === 'gem' || c.type === 'energy')),
                done: () => boardCell(c => c.type === 'coin' || c.type === 'gem' || c.type === 'energy') < 0 || stats.collected > (guide?.start.collected ?? 0) }] },
    { id: 'parts', when: () => mergePair(c => isFree(c) && c.type === 'shop' && levelOf(c) < FIRST_WORKING_LEVEL).length === 2,
      steps: [{ scene: () => onBoard(), who: 'robin', text: 'Two parts make a bigger one. Drag one onto the other!', drag: true,
                target: () => mergePair(c => isFree(c) && c.type === 'shop' && levelOf(c) < FIRST_WORKING_LEVEL).map(i => cellItem(onBoard(), i)),
                done: () => stats.upgrades > (guide?.start.upgrades ?? 0) }] },
    { id: 'cobweb', when: () => webPair().length === 2,
      steps: [{ scene: () => onBoard(), who: 'marnie', text: 'Merge a matching item into a cobwebbed one to free it!', drag: true,
                target: () => webPair().map(i => cellItem(onBoard(), i)),
                done: () => stats.webs > (guide?.start.webs ?? 0) }] },
    { id: 'bubble', when: () => boardCell(c => c.type === 'bubble') >= 0,
      steps: [{ scene: () => onBoard(), who: 'sandy', text: 'A Double Bubble! Pop it with 💎 for a free copy, or let it float away.',
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'bubble')),
                done: () => boardCell(c => c.type === 'bubble') < 0 || (selected && grids[selected.mode][selected.index]?.type === 'bubble') }] },
    { id: 'chest', when: () => boardCell(c => c.type === 'chest' || c.type === 'piggy') >= 0,
      steps: [{ scene: () => onBoard(), who: 'willy',
                text: () => (boardCell(c => c.type === 'chest') >= 0 ? 'A chest! Tap it to see what\'s inside.' : 'A Piggy Bank! Tap it to shake out coins.'),
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'chest') >= 0 ? boardCell(c => c.type === 'chest') : boardCell(c => c.type === 'piggy')),
                done: () => marked('chest') || (selected && ['chest', 'piggy'].includes(grids[selected.mode][selected.index]?.type)) }] },
    { id: 'booster', when: () => boardCell(c => BOOSTERS[c.type]) >= 0,
      steps: [{ scene: () => onBoard(), who: 'robin', text: 'A booster! Tap it to see what it does.',
                target: () => cellItem(onBoard(), boardCell(c => BOOSTERS[c.type])),
                done: () => boardCell(c => BOOSTERS[c.type]) < 0 || (selected && BOOSTERS[grids[selected.mode][selected.index]?.type]) }] },
    // Tools for jobs: the land's tool producer.
    { id: 'toolbox', when: () => onBoard() && boardCell(c => c.type === 'toolbox' && c.drops > 0) >= 0
          && openTasks().some(t => t.needs.some(n => n.item && TOOLS[n.item])),
      steps: [{ scene: () => onBoard(), who: 'robin', text: () => { const box = grids[onBoard()]?.[boardCell(c => c.type === 'toolbox' && c.drops > 0)]; return box ? `Jobs need ${TOOLS[box.chain].what}. Tap the ${TOOLS[box.chain].name} to make them!` : 'Tap it to make things for jobs!'; },
                target: () => cellItem(onBoard(), boardCell(c => c.type === 'toolbox' && c.drops > 0)), done: () => marked('toolbox') }] },
    // A full board: the backpack.
    { id: 'inventory', when: () => onBoard() && boardFull(onBoard()),
      steps: [{ scene: () => onBoard(), who: 'marnie', text: 'Board full? Drag things into your 🎒 for later, or tap one and Sell it.',
                target: () => q(`#scene-${onBoard()} .inv-btn`), done: () => inventory.items.length > 0 || !onBoard() || !boardFull(onBoard()) }] },
    // The town's orders.
    { id: 'town', when: () => quests.level >= 2 && currentScene !== 'town',
      steps: [{ scene: 'town', who: 'mayor', lead: 'Townsfolk need your help!', text: 'Townsfolk post orders here. Tap someone\'s card to see what they need!',
                target: () => q('#scene-town .order-tile'), done: () => marked('npc') }] },
    // Areas inside a land.
    { id: 'tabs', when: () => currentScene === 'fix' && landZones(fixLand).filter(zoneOpen).length >= 2,
      steps: [{ scene: 'fix', who: 'robin', text: 'Each land has areas. Tap a tab to jump between them.',
                target: () => q('#scene-fix .zone-tabs button:not(.on)'), done: () => marked('tabs') }] },
    // Things waiting on the map.
    { id: 'daily', when: () => dailyClaimable() > 0,
      steps: [{ scene: 'map', who: 'mayor', lead: 'Daily goals done!', text: 'Today\'s goals are done: claim your chest!', target: () => q('#btn-daily'), done: () => marked('daily') }] },
    { id: 'pass', when: () => passClaimable() > 0,
      steps: [{ scene: 'map', who: 'sandy', lead: 'Pass rewards are waiting!', text: 'The Season Pass has rewards waiting for you!', target: () => q('#btn-pass'), done: () => marked('pass') }] },
    { id: 'jar', when: () => jarReady(),
      steps: [{ scene: 'map', who: 'willy', lead: 'Your Gem Jar is full!', text: 'Your Gem Jar is full of gems. Take a look!', target: () => q('#btn-jar'), done: () => marked('jar') }] },
    { id: 'flash', when: () => quests.level >= 3,
      steps: [{ scene: 'market', who: 'sandy', lead: 'New offers at the Market!', text: 'The Flash Sale has new offers every 6 hours!', target: () => q('#scene-market #btn-flash'), done: () => marked('flash') }] },
    { id: 'fair', when: () => fairOpen(),
      steps: [{ scene: 'map', who: 'marnie', lead: 'The Fair is on!', text: 'The Country Fair is on! Win prizes this weekend.', target: () => q('#btn-fair'), done: () => currentScene === 'fair' }] },
    { id: 'energy', when: () => res.energy < 10 && !unlimitedActive(),
      steps: [{ scene: () => currentScene, who: 'mayor', text: '⚡ is low. It refills by itself, or tap ⚡ up here for more.',
                target: () => q('#btn-energy'), done: () => marked('energy') || res.energy >= 20 }] },
];

// Which guide (if any) runs now, and where its hand points.
function updateGuides() {
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
        const def = GUIDES.find(g => !guides.done.includes(g.id) && g.when());
        if (def) guide = { def, step: 0, shown: 0, start: { collected: stats.collected, upgrades: stats.upgrades, webs: stats.webs } };
    }
    if (!guide) { tutorialEl.hidden = true; return; }
    const step = guide.def.steps[guide.step];
    const scene = typeof step.scene === 'function' ? step.scene() : step.scene;
    const way = scene ? wayTo(scene) : null;
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
    guideRestUntil = Date.now() + 20000;
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
    if (!pendingFairResults || !dialogEl.hidden || draggedItemInfo) return;
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
    purchase(GEM_JAR.id, () => {
        const gems = shop.jar;
        res.gems += gems;
        shop.jar = 0;
        return `🫙 +💎${gems}`;
    });
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
    if (pendingOffers.length && dialogEl.hidden && !draggedItemInfo) openOffer(pendingOffers.shift());
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
    purchase(offer.id, () => {
        shop.offers[id].bought = true;
        grantReward(offer.reward, `🔥 ${offer.name}:`);
        return offer.name;
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
    purchase(deluxe ? GOLDEN_PASS_DELUXE.id : GOLDEN_PASS.id, () => {
        pass.golden = true;
        if (deluxe) addPassPoints(GOLDEN_PASS_DELUXE.points);
        claimPassGems();
        return `🎟️ ${deluxe ? GOLDEN_PASS_DELUXE.name : GOLDEN_PASS.name} for ${seasonTheme().name}`;
    });
}

// 💎 to finish the current pass level right now (0 at the top).
function passSkipPrice() {
    const { into, need } = passProgress();
    return need ? (need - into) * PASS_GEMS_PER_POINT : 0;
}

function buyPassLevel() {
    const price = passSkipPrice();
    if (!price || !spendGems(price)) return;
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
        actions: [
            pass.golden ? null : { label: `Get the ${GOLDEN_PASS.name} · ${GOLDEN_PASS.price}`, primary: true, wide: true, onClick: () => buyGoldenPass() },
            pass.golden ? null : { label: `⭐ ${GOLDEN_PASS_DELUXE.name}: +${GOLDEN_PASS_DELUXE.points} points now · ${GOLDEN_PASS_DELUXE.price}`, primary: true, wide: true, onClick: () => buyGoldenPass(true) },
            need ? { label: `Level ${level + 1} now · 💎${passSkipPrice()}`, wide: true, onClick: buyPassLevel } : null,
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

function offerUpgrade() {
    markGuide('upgrade');
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
    sfx('buy');
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
    scene.innerHTML = `<div class="board-header"></div><div class="game-grid" id="grid-${mode}"></div>
                       <div class="board-footer"><div class="info-bar"></div></div>`;
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
function renderOrders(mode, el) {
    // Restoration jobs come first: this land's own, and any needing items from this board.
    openTasks().filter(t => t.land === mode || t.needs.some(n => needBoard(n) === mode)).forEach(task => {
        const ready = taskReady(task);
        const need = task.needs.find(n => needBoard(n) === mode) || task.needs[0];
        const p = needProgress(task, need);
        const card = document.createElement('button');
        card.className = 'order-card task-card' + (ready ? ' ready' : '');
        card.innerHTML = iconize(`
            <span class="order-who"><span class="hammer">${uiIcon('hammer', '🔨')}</span><span class="want">${need.item ? itemIcon(need.item, need.tier) : need.stat ? TASK_STATS[need.stat].emoji : '🏡'}</span></span>
            <span class="order-pay">${p.have}/${p.of} · ⭐${task.xp}</span>
            ${ready ? '<span class="order-go">Do it</span>' : `<span class="order-need">${task.name}</span>`}`);
        card.addEventListener('click', () => (ready && hasSpot(task) ? goFix(task.land, task.id) : openTaskCard(task)));
        el.appendChild(card);
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
        el.appendChild(card);
    });

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
        html += icon + text('Double Bubble', `A free ${boardItemName(mode, item.inner)} inside! Pop it before it's gone: ${countdown(item.until)}`)
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
        const last = NAMES[mode].length - 1;
        const tip = item.tier >= last ? 'The best there is!'
            : item.tier >= tierCap(mode) ? 'Max tier for now: buy the Growth Guide at the Market.'
            : `Merge two to make ${itemIcon(mode, item.tier + 1)} ${itemName(mode, item.tier + 1)}.`;
        html += icon + text(`${itemName(mode, item.tier)} · tier ${item.tier}`, tip) + chainBtn + button('sell-item-btn', `Sell<br>💵${sellPrice(mode, item)}`);
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
        <div class="chain-tile${t === highlightTier ? ' current' : ''}${t > tierCap(mode) ? ' locked' : ''}">
            ${itemIcon(mode, t)}<small>${t}. ${itemName(mode, t)}</small>
        </div>`).join('');
    const tool = TOOLS[mode];
    if (tool) return showDialog({
        title: `${tool.emoji} ${tool.what[0].toUpperCase()}${tool.what.slice(1)}`,
        body: `<div class="chain-grid">${tiles}</div>
               <p class="hint">Made by tapping the ${tool.emoji} ${tool.name} on the ${AREAS[tool.board].name} board. Jobs ask for these.</p>`,
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
            } else if (sameKind && TOOLS[chain]) {
                toast(`That's already a ${boardItemName(mode, sourceItem)}, the best there is!`);
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
    if (mode !== 'fair' && Math.random() < PART_DROP_CHANCE) {
        drop = { type: 'shop', level: 1 };
        toast(`🧩 Lucky! A ${producerName(mode, 1)} part dropped.`, 'good');
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
                cls: ['bubble-item'].concat(bubble ? ['has-art'] : []),
                html: `${bubble ? `<img class="bubble-art" src="${bubble}" alt="" draggable="false">` : ''}<span class="bubble-inner">${art ? sprite(art) : emoji(itemEmojiFor(mode, inner))}</span>`,
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
// 2: one ⚡ Energy bar instead of five essentials, and producers with parts.
// 3: XP levels, inventory, chests and boosters.
// 4: restoration jobs instead of level quests.
// 5: the first-play tutorial (older saves skip it).
const SAVE_VERSION = 5;

function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            version: SAVE_VERSION,
            res, energyAt, shop, crates, inventory, stats, quests, restoration, pass, dailyGoals, tutorial, guides, story, fair, daily, settings, unlocks, maxTier, grids, lastBoard,
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
stageEl.insertBefore(tutorialEl, document.getElementById('toasts'));
document.querySelectorAll('[data-ui]').forEach(el => { el.innerHTML = uiIcon(el.dataset.ui, el.textContent); });
['map', 'town', 'market'].forEach(id => {
    document.getElementById(`scene-${id}`).style.backgroundImage = `url("${ASSETS.scenes[id]}")`;
});
if (!loadGame()) {
    initTown(true);
    grids.barn = tutorialBoard(clutterBoard());
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
if (!story.intro) setTimeout(playOpening, 150);
else if (!tutorial.done) giftAfterTutorial = true; // back mid-tutorial: the gift still waits for its end
else if (dailyAvailable()) setTimeout(openDailyGift, 600);

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

// Installable and playable offline (on the published site; not while developing).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* the game works without it */ });
}
