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

    // Things inside the market.
    props: {
        counter: 'assets/props/counter.svg',
        deed: 'assets/props/deed.svg',
        upgrade: 'assets/props/upgrade.svg',
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

    // Merge item sprites per board, indexed by tier (0 = the input item).
    // Missing or null entries fall back to the emoji placeholder.
    items: {
        barn: [
            null,
            'assets/items/barn/01_egg.png',
            'assets/items/barn/02_chick.png',
            'assets/items/barn/03_chicken.png',
        ],
        hay: [],
        farm: [],
        fert: [],
        aqua: [],
        flower: [],
    },
};
