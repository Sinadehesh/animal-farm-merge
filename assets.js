// --- ASSET MANIFEST ---
// Every image the game draws is listed here. To swap in AI-generated art, drop the
// new file into assets/ and change its path below; game.js never hard-codes paths.
// See ASSETS.md for the art style, sizes and prompts.

const ASSETS = {
    // Full-screen backgrounds (9:16). Leave the spots where buildings sit empty;
    // buildings are separate sprites so they stay clickable.
    scenes: {
        map: 'assets/scenes/map.jpg',
        town: 'assets/scenes/town.jpg',
        market: 'assets/scenes/market.jpg',
    },

    // Places on the farm map.
    // A building's look from ruin to luxury, as its jobs get done (the Market
    // follows all jobs). Cut from assets/raw/stages_*.webp. Lands without
    // stages use buildings + a faded look instead.
    buildingStages: {
        hay: [
            'assets/buildings/stages/hay_1.png',
            'assets/buildings/stages/hay_2.png',
            'assets/buildings/stages/hay_3.png',
            'assets/buildings/stages/hay_4.png',
            'assets/buildings/stages/hay_5.png',
            'assets/buildings/stages/hay_6.png',
            'assets/buildings/stages/hay_7.png',
            'assets/buildings/stages/hay_8.png',
            'assets/buildings/stages/hay_9.png',
            'assets/buildings/stages/hay_10.png',
        ],
        farm: [
            'assets/buildings/stages/farm_1.png',
            'assets/buildings/stages/farm_2.png',
            'assets/buildings/stages/farm_3.png',
            'assets/buildings/stages/farm_4.png',
            'assets/buildings/stages/farm_5.png',
            'assets/buildings/stages/farm_6.png',
            'assets/buildings/stages/farm_7.png',
            'assets/buildings/stages/farm_8.png',
        ],
        market: [
            'assets/buildings/stages/market_1.png',
            'assets/buildings/stages/market_2.png',
            'assets/buildings/stages/market_3.png',
            'assets/buildings/stages/market_4.png',
            'assets/buildings/stages/market_5.png',
            'assets/buildings/stages/market_6.png',
            'assets/buildings/stages/market_7.png',
            'assets/buildings/stages/market_8.png',
        ],
        barn: [
            'assets/buildings/stages/barn_1.png',
            'assets/buildings/stages/barn_2.png',
            'assets/buildings/stages/barn_3.png',
            'assets/buildings/stages/barn_4.png',
            'assets/buildings/stages/barn_5.png',
            'assets/buildings/stages/barn_6.png',
            'assets/buildings/stages/barn_7.png',
            'assets/buildings/stages/barn_8.png',
        ],
        town: [
            'assets/buildings/stages/town_1.png',
            'assets/buildings/stages/town_2.png',
            'assets/buildings/stages/town_3.png',
            'assets/buildings/stages/town_4.png',
            'assets/buildings/stages/town_5.png',
            'assets/buildings/stages/town_6.png',
            'assets/buildings/stages/town_7.png',
            'assets/buildings/stages/town_8.png',
        ],
    },

    buildings: {
        town: 'assets/buildings/town.png',
        market: 'assets/buildings/market.png',
        barn: 'assets/buildings/barn.png',
        farm: 'assets/buildings/farm.png',
        hay: 'assets/buildings/hay.png',
        fert: 'assets/buildings/fert.png',
        aqua: 'assets/buildings/aqua.png',
        flower: 'assets/buildings/flower.png',
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
        mayor: 'assets/characters/mayor.png',
        marnie: 'assets/characters/marnie.svg',
        robin: 'assets/characters/robin.svg',
        willy: 'assets/characters/willy.svg',
        sandy: 'assets/characters/sandy.svg',
        shopkeeper: 'assets/characters/shopkeeper.png',
    },

    // Head-and-shoulders portraits, shown in a round frame in the town and in
    // each townsperson's popup. 384px copies of the originals in assets/ghibli/.
    // null = frame the full-body character drawing above instead.
    portraits: {
        mayor: 'assets/characters/portraits/mayor.png',
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

    // Interface icons in place of emoji: the top bar, the map buttons, the 🎒
    // and the lock on chests. Cut from assets/raw/icons_5_interface.webp.
    // null = keep the emoji.
    ui: {
        coin: 'assets/ui/coin.png',
        gem: 'assets/ui/gem.png',
        energy: 'assets/ui/energy.png',
        star: 'assets/ui/star.png',
        gift: 'assets/ui/gift.png',
        jobs: 'assets/ui/jobs.png',
        pass: 'assets/ui/pass.png',
        daily: 'assets/ui/daily.png',
        jar: 'assets/ui/jar.png',
        offer: 'assets/ui/offer.png',
        inventory: 'assets/ui/inventory.png',
        lock: 'assets/ui/lock.png',
    },

    // Optional background image behind each merge board (null = CSS colour).
    boards: {
        barn: 'assets/boards/barn.jpg',
        hay: 'assets/boards/hay.jpg',
        farm: 'assets/boards/farm.jpg',
        fert: 'assets/boards/fert.jpg',
        aqua: 'assets/boards/aqua.jpg',
        flower: 'assets/boards/flower.jpg',
    },

    // Producer sprites per board, indexed by level - 1: three parts (levels 1-3),
    // then the five working levels (4-8). Names are in PRODUCERS in game.js.
    // Missing entries use the emoji tile.
    producers: {
        // Cut from assets/raw/producers_barn.webp, each level a little bigger.
        barn: [
            'assets/producers/barn/1_feed_scoop.png',
            'assets/producers/barn/2_feed_pail.png',
            'assets/producers/barn/3_feed_sack.png',
            'assets/producers/barn/4_feed_bin.png',
            'assets/producers/barn/5_big_feed_bin.png',
            'assets/producers/barn/6_feed_trough.png',
            'assets/producers/barn/7_feed_cart.png',
            'assets/producers/barn/8_golden_feed_silo.png',
        ],
        // Cut from assets/raw/producers_hay.webp, each level a little bigger.
        hay: [
            'assets/producers/hay/1_seed_pouch.png',
            'assets/producers/hay/2_wheat_bag.png',
            'assets/producers/hay/3_small_wheat_sack.png',
            'assets/producers/hay/4_wheat_sack.png',
            'assets/producers/hay/5_big_wheat_sack.png',
            'assets/producers/hay/6_wheat_barrel.png',
            'assets/producers/hay/7_wheat_cart.png',
            'assets/producers/hay/8_golden_granary.png',
        ],
        // Cut from assets/raw/producers_farm.webp, each level a little bigger.
        farm: [
            'assets/producers/farm/1_torn_fert_pouch.png',
            'assets/producers/farm/2_fert_pouch.png',
            'assets/producers/farm/3_small_fert_bag.png',
            'assets/producers/farm/4_fert_bag.png',
            'assets/producers/farm/5_big_fert_bag.png',
            'assets/producers/farm/6_fert_sack.png',
            'assets/producers/farm/7_fert_barrel.png',
            'assets/producers/farm/8_golden_fert_barrel.png',
        ],
        // Cut from assets/raw/producers_fert.webp, each level a little bigger.
        fert: [
            'assets/producers/fert/1_broken_rake.png',
            'assets/producers/fert/2_mended_rake.png',
            'assets/producers/fert/3_small_rake.png',
            'assets/producers/fert/4_leaf_rake.png',
            'assets/producers/fert/5_leaf_basket.png',
            'assets/producers/fert/6_leaf_barrow.png',
            'assets/producers/fert/7_compost_bin.png',
            'assets/producers/fert/8_golden_compost_tumbler.png',
        ],
        // Cut from assets/raw/producers_aqua.webp, each level a little bigger.
        aqua: [
            'assets/producers/aqua/1_empty_tin.png',
            'assets/producers/aqua/2_small_tin.png',
            'assets/producers/aqua/3_fish_food_pouch.png',
            'assets/producers/aqua/4_fish_food_tin.png',
            'assets/producers/aqua/5_big_fish_food_tin.png',
            'assets/producers/aqua/6_fish_food_jar.png',
            'assets/producers/aqua/7_fish_feeder.png',
            'assets/producers/aqua/8_golden_feeder.png',
        ],
        // Cut from assets/raw/producers_flower.webp, each level a little bigger.
        flower: [
            'assets/producers/flower/1_patched_can.png',
            'assets/producers/flower/2_leaky_can.png',
            'assets/producers/flower/3_small_can.png',
            'assets/producers/flower/4_watering_can.png',
            'assets/producers/flower/5_big_watering_can.png',
            'assets/producers/flower/6_sprinkler.png',
            'assets/producers/flower/7_rain_barrel.png',
            'assets/producers/flower/8_golden_fountain.png',
        ],
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
        // Gems, piggy banks and tickets: assets/raw/icons_3_gems_piggy_tickets.webp
        // (the gems keep their sizes; the 2nd ticket was pink and is recoloured gold).
        gem: [
            'assets/items/special/gem_1.png',
            'assets/items/special/gem_2.png',
            'assets/items/special/gem_3.png',
            'assets/items/special/gem_4.png',
        ],        // 💎 Gems: 1, 3, 8, 20
        // Energy and XP stars: assets/raw/icons_2_energy_stars.png.
        energy: [
            'assets/items/special/energy_1.png',
            'assets/items/special/energy_2.png',
            'assets/items/special/energy_3.png',
            'assets/items/special/energy_4.png',
            'assets/items/special/energy_5.png',
        ],     // ⚡ Energy: 2, 6, 16, 40, 100
        xp: [
            'assets/items/special/xp_1.png',
            'assets/items/special/xp_2.png',
            'assets/items/special/xp_3.png',
            'assets/items/special/xp_4.png',
            'assets/items/special/xp_5.png',
        ],         // ⭐ XP stars: 1, 3, 8, 20, 50
        season: [
            'assets/items/special/season_1.png',
            'assets/items/special/season_2.png',
            'assets/items/special/season_3.png',
            'assets/items/special/season_4.png',
        ],     // 🍀 Season Pass items: 1, 3, 8, 20 points (one look for every season)
        // Boosters and the bubble: assets/raw/icons_4_boosters.webp (the stopwatches
        // keep their sizes).
        skip: [
            'assets/items/special/skip_1.png',
            'assets/items/special/skip_2.png',
            'assets/items/special/skip_3.png',
            'assets/items/special/skip_4.png',
        ],       // ⏳ Time Skip: 1h, 2h, 4h, 8h
        charger: [
            'assets/items/special/charger_1.png',
            'assets/items/special/charger_2.png',
            'assets/items/special/charger_3.png',
            'assets/items/special/charger_4.png',
        ],    // ⏱️ Time Charger: 2h, 4h, 8h, 16h
        unlimited: [
            'assets/items/special/unlimited_1.png',
            'assets/items/special/unlimited_2.png',
            'assets/items/special/unlimited_3.png',
        ],  // ♾️ Unlimited Energy: 5m, 10m, 20m
        bubble: ['assets/items/special/bubble.png'], // 🫧 the Double Bubble around an item
        chest_coin: ['assets/items/special/chest_coin_1.png'],     // 💰 Coin Chest
        chest_energy: ['assets/items/special/chest_energy_1.png'], // 🔋 Energy Chest
        chest_brown: ['assets/items/special/chest_brown_1.png', 'assets/items/special/chest_brown_2.png'], // Brown Chest, Lv1-2
        chest_blue: ['assets/items/special/chest_blue_1.png', 'assets/items/special/chest_blue_2.png'],    // Blue Chest, Lv1-2
        piggy: [
            'assets/items/special/piggy_1.png',
            'assets/items/special/piggy_2.png',
            'assets/items/special/piggy_3.png',
            'assets/items/special/piggy_4.png',
        ],      // 🐷 Piggy Bank, Lv1-4
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
        // Cut from assets/raw/items_hay.webp.
        hay: [
            'assets/items/hay/00_wheat.png',
            'assets/items/hay/01_stalk.png',
            'assets/items/hay/02_bundle.png',
            'assets/items/hay/03_small_bale.png',
            'assets/items/hay/04_medium_bale.png',
            'assets/items/hay/05_large_bale.png',
            'assets/items/hay/06_hay_stack.png',
            'assets/items/hay/07_hay_tower.png',
            'assets/items/hay/08_hay_silo.png',
            'assets/items/hay/09_golden_hay.png',
            'assets/items/hay/10_magic_hay.png',
            'assets/items/hay/11_infinite_hay.png',
        ],
        // Cut from assets/raw/items_farm.webp, with the seed and the watermelon
        // from assets/raw/items_farm_alt.webp.
        farm: [
            'assets/items/farm/00_fertilizer.png',
            'assets/items/farm/01_seed.png',
            'assets/items/farm/02_sprout.png',
            'assets/items/farm/03_strawberry.png',
            'assets/items/farm/04_tomato.png',
            'assets/items/farm/05_corn.png',
            'assets/items/farm/06_carrot.png',
            'assets/items/farm/07_cabbage.png',
            'assets/items/farm/08_pumpkin.png',
            'assets/items/farm/09_watermelon.png',
            'assets/items/farm/10_golden_apple.png',
            'assets/items/farm/11_giant_sun.png',
        ],
        // Cut from assets/raw/items_fert.webp: the carrot and apple core are one
        // item, and the gem sack (Deluxe) comes before the gold-trimmed one (Magic).
        fert: [
            'assets/items/fert/00_fallen_leaf.png',
            'assets/items/fert/01_leaf_pile.png',
            'assets/items/fert/02_veggie_scraps.png',
            'assets/items/fert/03_compost.png',
            'assets/items/fert/04_rich_soil.png',
            'assets/items/fert/05_mushroom.png',
            'assets/items/fert/06_basic_fert.png',
            'assets/items/fert/07_quality_fert.png',
            'assets/items/fert/08_speed_gro.png',
            'assets/items/fert/09_deluxe_fert.png',
            'assets/items/fert/10_magic_fert.png',
            'assets/items/fert/11_iridium_fert.png',
        ],
        // Cut from assets/raw/items_aqua.webp.
        aqua: [
            'assets/items/aqua/00_fish_food.png',
            'assets/items/aqua/01_snail.png',
            'assets/items/aqua/02_minnow.png',
            'assets/items/aqua/03_frog.png',
            'assets/items/aqua/04_goldfish.png',
            'assets/items/aqua/05_koi.png',
            'assets/items/aqua/06_turtle.png',
            'assets/items/aqua/07_otter.png',
            'assets/items/aqua/08_duck.png',
            'assets/items/aqua/09_swan.png',
            'assets/items/aqua/10_flamingo.png',
            'assets/items/aqua/11_pond_dragon.png',
        ],
        // Cut from assets/raw/items_flower.webp.
        flower: [
            'assets/items/flower/00_water_drop.png',
            'assets/items/flower/01_seedling.png',
            'assets/items/flower/02_bud.png',
            'assets/items/flower/03_daisy.png',
            'assets/items/flower/04_tulip.png',
            'assets/items/flower/05_rose.png',
            'assets/items/flower/06_lily.png',
            'assets/items/flower/07_orchid.png',
            'assets/items/flower/08_lotus.png',
            'assets/items/flower/09_rafflesia.png',
            'assets/items/flower/10_crystal_flower.png',
            'assets/items/flower/11_tree_of_life.png',
        ],
        // Country Fair chains, one per weekly theme (8 tiers each).
        fair_pie: [],
        fair_flowers: [],
        fair_fishing: [],
        fair_pumpkin: [],
    },
};
