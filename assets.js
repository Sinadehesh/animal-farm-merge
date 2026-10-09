// --- ASSET MANIFEST ---
// Every image the game draws is listed here. To swap in AI-generated art, drop the
// new file into assets/ and change its path below; game.js never hard-codes paths.
// See ASSETS.md for the art style, sizes and prompts.

const ASSETS = {
    // Full-screen backgrounds (9:16). Leave the spots where buildings sit empty;
    // buildings are separate sprites so they stay clickable.
    scenes: {
        map: 'assets/scenes/map.svg',
        town: 'assets/scenes/town.svg',
        market: 'assets/scenes/market.svg',
    },

    // Places on the farm map.
    buildings: {
        town: 'assets/buildings/town.svg',
        market: 'assets/buildings/market.svg',
        barn: 'assets/buildings/barn.svg',
        farm: 'assets/buildings/farm.svg',
        hay: 'assets/buildings/hay.svg',
        fert: 'assets/buildings/fert.svg',
        aqua: 'assets/buildings/aqua.svg',
        flower: 'assets/buildings/flower.svg',
    },

    // The same buildings once their restoration jobs are all done (null = keep
    // the picture above; until then it is shown faded and worn).
    buildingsRestored: {
        barn: null,
        farm: null,
        hay: null,
        fert: null,
        aqua: null,
        flower: null,
    },

    // Shops and houses around the town square.
    town: {
        townhall: 'assets/town/townhall.svg',
        carpenter: 'assets/town/carpenter.svg',
        ranch: 'assets/town/ranch.svg',
        fishshop: 'assets/town/fishshop.svg',
        flowershop: 'assets/town/flowershop.svg',
    },

    // Townsfolk (keyed by NPC id) and the market shopkeeper.
    characters: {
        mayor: 'assets/characters/mayor.svg',
        marnie: 'assets/characters/marnie.svg',
        robin: 'assets/characters/robin.svg',
        willy: 'assets/characters/willy.svg',
        sandy: 'assets/characters/sandy.svg',
        shopkeeper: 'assets/characters/shopkeeper.svg',
    },

    // Head-and-shoulders portraits, shown in a round frame in the town and in
    // each townsperson's popup. 384px copies of the originals in assets/ghibli/.
    // null = frame the full-body character drawing above instead.
    portraits: {
        mayor: 'assets/characters/portraits/mayor.jpg',
        marnie: 'assets/characters/portraits/marnie.jpg',
        robin: null,
        willy: 'assets/characters/portraits/willy.jpg',
        sandy: 'assets/characters/portraits/sandy.jpg',
    },

    // Things inside the market.
    props: {
        counter: 'assets/props/counter.svg',
        deed: 'assets/props/deed.svg',
        upgrade: 'assets/props/upgrade.svg',
        crate: null, // the 📦 crates on a fresh board (null = emoji tile)
    },

    // Optional background image behind each merge board (null = CSS colour).
    boards: {
        barn: null,
        hay: null,
        farm: null,
        fert: null,
        aqua: null,
        flower: null,
    },

    // Producer sprites per board, indexed by level - 1: three parts (levels 1-3),
    // then the five working levels (4-8). Names are in PRODUCERS in game.js.
    // Missing entries use the emoji tile.
    producers: {
        barn: [],
        hay: [],
        farm: [],
        fert: [],
        aqua: [],
        flower: [],
        // Each Fair theme's producer has one level: put its picture at index 3.
        fair_pie: [],
        fair_flowers: [],
        fair_fishing: [],
        fair_pumpkin: [],
    },

    // Currency items, boosters, chests and Piggy Banks, indexed by level - 1.
    // These are the same on every board. Missing entries use the emoji tile.
    special: {
        // Cut from assets/raw/icons_1_treasure.png.
        coin: [         // 🪙 Coins: 1, 3, 8, 20, 50, 120
            'assets/items/special/coin_1.png',
            'assets/items/special/coin_2.png',
            'assets/items/special/coin_3.png',
            'assets/items/special/coin_4.png',
            'assets/items/special/coin_5.png',
            'assets/items/special/coin_6.png',
        ],
        gem: [],        // 💎 Gems: 1, 3, 8, 20
        energy: [],     // ⚡ Energy: 2, 6, 16, 40, 100
        xp: [],         // ⭐ XP stars: 1, 3, 8, 20, 50
        season: [],     // 🍀 Season Pass items: 1, 3, 8, 20 points (one look for every season)
        skip: [],       // ⏳ Time Skip: 1h, 2h, 4h, 8h
        charger: [],    // ⏱️ Time Charger: 2h, 4h, 8h, 16h
        unlimited: [],  // ♾️ Unlimited Energy: 5m, 10m, 20m
        chest_coin: ['assets/items/special/chest_coin_1.png'],     // 💰 Coin Chest
        chest_energy: ['assets/items/special/chest_energy_1.png'], // 🔋 Energy Chest
        chest_brown: ['assets/items/special/chest_brown_1.png', 'assets/items/special/chest_brown_2.png'], // Brown Chest, Lv1-2
        chest_blue: ['assets/items/special/chest_blue_1.png', 'assets/items/special/chest_blue_2.png'],    // Blue Chest, Lv1-2
        piggy: [],      // 🐷 Piggy Bank, Lv1-4
    },

    // Merge item sprites per board, indexed by tier (0 = the input item).
    // Missing or null entries fall back to the emoji placeholder.
    items: {
        // Cut with tools/process_assets.py (auto mode): tiers 0-5 and the cow from
        // assets/raw/barn_sheet_v4_eyes.webp, the calf and tiers 8-11 from
        // assets/raw/barn_sheet_v4.webp.
        barn: [
            'assets/items/barn/00_feed.png',
            'assets/items/barn/01_egg.png',
            'assets/items/barn/02_chick.png',
            'assets/items/barn/03_hen.png',
            'assets/items/barn/04_piglet.png',
            'assets/items/barn/05_pig.png',
            'assets/items/barn/06_calf.png',
            'assets/items/barn/07_cow.png',
            'assets/items/barn/08_horse.png',
            'assets/items/barn/09_alpaca.png',
            'assets/items/barn/10_bull.png',
            'assets/items/barn/11_unicorn.png',
        ],
        hay: [],
        farm: [],
        fert: [],
        aqua: [],
        flower: [],
        // Country Fair chains, one per weekly theme (8 tiers each).
        fair_pie: [],
        fair_flowers: [],
        fair_fishing: [],
        fair_pumpkin: [],
    },
};
