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

    // Sound effects (short mp3s in assets/sounds/), one per moment. null = the
    // little sound the game makes on its own (Web Audio). These are Kenney's free
    // CC0 packs (kenney.nl: Interface, Impact, RPG Audio, Music Jingles), see
    // assets/sounds/LICENSE-kenney.txt. Epidemic Sound picks to swap in once that
    // account can download are listed in ASSET_LIST.md.
    sounds: {
        tap: 'assets/sounds/tap.mp3',           // interface drop_002
        merge: 'assets/sounds/merge.mp3',       // interface pluck_002, played higher for bigger items
        pop: 'assets/sounds/pop.mp3',           // interface glass_002
        coin: 'assets/sounds/coin.mp3',         // rpg handleCoins
        knock: 'assets/sounds/knock.mp3',       // impact impactPlank_medium_000
        sparkle: 'assets/sounds/sparkle.mp3',   // interface confirmation_002
        levelup: 'assets/sounds/levelup.mp3',   // jingles PIZZI03
        fanfare: 'assets/sounds/fanfare.mp3',   // jingles STEEL02
        whoosh: 'assets/sounds/whoosh.mp3',     // interface maximize_006
        nope: 'assets/sounds/nope.mp3',         // interface error_004
        // Merges sound like what's merging (merge is the fallback), rising with the
        // item; mid-size ones add a sparkle, the biggest a little jingle.
        merge_barn: 'assets/sounds/merge_barn.mp3',       // animals: interface pluck_002
        merge_farm: 'assets/sounds/merge_farm.mp3',       // crops: interface drop_003
        merge_hay: 'assets/sounds/merge_hay.mp3',         // hay: rpg cloth1 (a rustle)
        merge_fert: 'assets/sounds/merge_fert.mp3',       // compost: impact impactSoft_medium_001
        merge_aqua: 'assets/sounds/merge_aqua.mp3',       // pond: interface bong_001
        merge_flower: 'assets/sounds/merge_flower.mp3',   // flowers: interface glass_006
        merge_tools: 'assets/sounds/merge_tools.mp3',     // impact impactMetal_light_000
        merge_garden: 'assets/sounds/merge_garden.mp3',   // impact impactPlate_light_000
        merge_wood: 'assets/sounds/merge_wood.mp3',       // impact impactWood_light_000
        merge_clean: 'assets/sounds/merge_clean.mp3',     // impact impactGlass_light_000
        merge_fishing: 'assets/sounds/merge_fishing.mp3', // impact impactTin_medium_000
        merge_decor: 'assets/sounds/merge_decor.mp3',     // interface glass_005
        merge_level: 'assets/sounds/merge_level.mp3',     // producers, boosters, chests: casino chips-stack-1
        merge_mid: 'assets/sounds/merge_mid.mp3',         // interface maximize_002
        merge_big: 'assets/sounds/merge_big.mp3',         // jingles HIT02
        click: 'assets/sounds/click.mp3',                 // any button: interface click_002
        buy: 'assets/sounds/buy.mp3',                     // buying: casino chips-stack-3
        taskdone: 'assets/sounds/taskdone.mp3',           // a job done: jingles PIZZI05
        unlock: 'assets/sounds/unlock.mp3',               // a new area opens: jingles STEEL00
    },

    // Background music, looping quietly (Settings turns it off). "Hush Hamlet"
    // by Zane Little Music, CC0: assets/sounds/LICENSE-music.txt.
    music: 'assets/sounds/music_hush_hamlet.mp3',

    // Painted pages: one painting per screen, the same scene in three states
    // (ruined, half fixed, restored), cut from one sheet so they match exactly
    // (tall, about 1:3, except the Hen House's wide one). Things to tap are
    // labels over the painting; a page swaps to its next picture as you fix it.
    // null = not painted yet: the area keeps its old picture and objects.
    stages: {
        map: [0, 1, 2].map(k => `assets/stages/map/${k}@2x.jpg`),
        market: ['assets/stages/market/storeroom@2x.jpg'], // one painting (the storeroom, restored): the shop doesn't change
        town: [0, 1, 2].map(k => `assets/stages/town/${k}@2x.jpg`),
        barnyard: [0, 1, 2].map(k => `assets/stages/barnyard/${k}@2x.jpg`),
        henhouse: [0, 1, 2].map(k => `assets/stages/henhouse/${k}@2x.jpg`),
        fieldgate: [0, 1, 2].map(k => `assets/stages/fieldgate/${k}@2x.jpg`),
        berryrows: [0, 1, 2].map(k => `assets/stages/berryrows/${k}@2x.jpg`),
        orchard: [0, 1, 2].map(k => `assets/stages/orchard/${k}@2x.jpg`),
        windmill: [0, 1, 2].map(k => `assets/stages/windmill/${k}@2x.jpg`),
        leafpiles: [0, 1, 2].map(k => `assets/stages/leafpiles/${k}@2x.jpg`),
        mushrooms: [0, 1, 2].map(k => `assets/stages/mushrooms/${k}@2x.jpg`),
        muddyshore: [0, 1, 2].map(k => `assets/stages/muddyshore/${k}@2x.jpg`),
        lilypond: [0, 1, 2].map(k => `assets/stages/lilypond/${k}@2x.jpg`),
        boatdock: [0, 1, 2].map(k => `assets/stages/boatdock/${k}@2x.jpg`),
        gardengate: [0, 1, 2].map(k => `assets/stages/gardengate/${k}@2x.jpg`),
        rosearch: [0, 1, 2].map(k => `assets/stages/rosearch/${k}@2x.jpg`),
        greenhouse: [0, 1, 2].map(k => `assets/stages/greenhouse/${k}@2x.jpg`),
        bigbarn: [0, 1, 2].map(k => `assets/stages/bigbarn/${k}@2x.jpg`), // the barn's storeroom
        meadow: [0, 1, 2].map(() => 'assets/stages/meadow/meadow@2x.jpg'), // one painting for now, used for all three states
        stables: [0, 1, 2].map(k => `assets/stages/stables/${k}@2x.jpg`),
        compostbins: [0, 1, 2].map(k => `assets/stages/compostbins/${k}@2x.jpg`),
    },

    // Areas: each land's place is a column of square pictures (1:1), one per
    // area, drawn restored and tidy with open ground; the game fades them and
    // puts the mess on top. null = the land's board texture.
    areas: {
        barnyard: 'assets/areas/barnyard.jpg',
        henhouse: 'assets/areas/henhouse.jpg',
        bigbarn: 'assets/areas/bigbarn.jpg',
        fieldgate: null,
        berryrows: null,
        orchard: null,
        meadow: null,
        stables: null,
        windmill: null,
        leafpiles: null,
        compostbins: null,
        mushrooms: null,
        muddyshore: null,
        lilypond: null,
        boatdock: null,
        gardengate: null,
        rosearch: null,
        greenhouse: null,
    },

    // The things in each area, by name (transparent PNGs, cut from
    // assets/raw/objects_<area>.webp). null = the emoji in OBJECT_EMOJI.
    objects: {
        // Barnyard
        planks: 'assets/objects/barnyard/planks.png', weeds: 'assets/objects/barnyard/weeds.png',
        branch: 'assets/objects/barnyard/branch.png', feedbin_broken: 'assets/objects/barnyard/feedbin_broken.png',
        fence_broken: 'assets/objects/barnyard/fence_broken.png',
        wheelbarrow_broken: 'assets/objects/barnyard/wheelbarrow_broken.png',
        pump_broken: 'assets/objects/barnyard/pump_broken.png', junk: 'assets/objects/barnyard/junk.png',
        feedbin: 'assets/objects/barnyard/feedbin.png', fence: 'assets/objects/barnyard/fence.png',
        wheelbarrow: 'assets/objects/barnyard/wheelbarrow.png', pump: 'assets/objects/barnyard/pump.png',
        firewood: 'assets/objects/barnyard/firewood.png', lantern: 'assets/objects/barnyard/lantern.png',
        mailbox: 'assets/objects/barnyard/mailbox.png', tulips: 'assets/objects/barnyard/tulips.png',
        // Hen House
        nest_empty: 'assets/objects/henhouse/nest_empty.png', wire_torn: 'assets/objects/henhouse/wire_torn.png',
        trough_empty: 'assets/objects/henhouse/trough_empty.png',
        straw_mess: 'assets/objects/henhouse/straw_mess.png',
        perch_broken: 'assets/objects/henhouse/perch_broken.png',
        feeder_rusty: 'assets/objects/henhouse/feeder_rusty.png',
        basket_empty: 'assets/objects/henhouse/basket_empty.png', sacks: 'assets/objects/henhouse/sacks.png',
        nest_chicks: 'assets/objects/henhouse/nest_chicks.png', wire_fixed: 'assets/objects/henhouse/wire_fixed.png',
        hen_perch: 'assets/objects/henhouse/hen_perch.png', feeder: 'assets/objects/henhouse/feeder.png',
        basket_eggs: 'assets/objects/henhouse/basket_eggs.png',
        trough_full: 'assets/objects/henhouse/trough_full.png', coop: 'assets/objects/henhouse/coop.png',
        nestbox: 'assets/objects/henhouse/nestbox.png',
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
        marnie: 'assets/characters/marnie.png',
        robin: 'assets/characters/robin.png',
        willy: 'assets/characters/willy.png',
        sandy: 'assets/characters/sandy.png',
        shopkeeper: 'assets/characters/shopkeeper.png',
    },

    // Head-and-shoulders portraits, shown in a round frame (cards, the town,
    // popups). null = frame the full-body drawing above instead.
    portraits: {
        mayor: 'assets/characters/portraits/mayor.png',
        marnie: 'assets/characters/portraits/marnie.png',
        robin: 'assets/characters/portraits/robin.png',
        willy: 'assets/characters/portraits/willy.png',
        sandy: 'assets/characters/portraits/sandy.png',
        shopkeeper: 'assets/characters/portraits/shopkeeper.png',
    },

    // The same people from the waist up, waving (calling you over, story
    // scenes), and full body cheering (after a fix). Cut from
    // assets/raw/character_<id>.webp. null = the portrait instead.
    wave: {
        mayor: 'assets/characters/wave/mayor.png',
        marnie: 'assets/characters/wave/marnie.png',
        robin: 'assets/characters/wave/robin.png',
        willy: 'assets/characters/wave/willy.png',
        sandy: 'assets/characters/wave/sandy.png',
        shopkeeper: 'assets/characters/wave/shopkeeper.png',
    },
    cheer: {
        mayor: 'assets/characters/cheer/mayor.png',
        marnie: 'assets/characters/cheer/marnie.png',
        robin: 'assets/characters/cheer/robin.png',
        willy: 'assets/characters/cheer/willy.png',
        sandy: 'assets/characters/cheer/sandy.png',
        shopkeeper: 'assets/characters/cheer/shopkeeper.png',
    },

    // Tool producers, one per land (a single picture each), by chain. Their
    // items go in items.<chain> once drawn (tools, garden, wood, clean, fishing,
    // decor). null = emoji.
    toolProducers: {
        tools: 'assets/producers/tools/tools.png', garden: 'assets/producers/tools/garden.png',
        wood: 'assets/producers/tools/wood.png', clean: 'assets/producers/tools/clean.png',
        fishing: 'assets/producers/tools/fishing.png', decor: 'assets/producers/tools/decor.png',
        // Each land's third producer (Flour Mill not drawn yet: shown as its emoji).
        wool: 'assets/producers/tools/wool.png', seeds: 'assets/producers/tools/seeds.png', bakery: null,
        worms: 'assets/producers/tools/worms.png', boat: 'assets/producers/tools/boat.png', honey: 'assets/producers/tools/honey.png',
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
        key: 'assets/ui/key.png',          // an area unlocking
        reward: 'assets/ui/reward.png',    // an area's or land's reward
        merge: 'assets/ui/merge.png',      // the Merge button
        cloud: 'assets/ui/cloud.png',
        check: 'assets/ui/check.png',
        sparkle: 'assets/ui/sparkle.png',
        hammer: 'assets/ui/hammer.png',    // job tags and the fix
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
        // Chests by level (two merge into the next), closed and then open once
        // unlocked or tapped. null = not drawn yet (the level below's picture,
        // or the emoji). Coin and Energy Chests Lv1-3, Brown and Blue Lv1-4.
        chest_coin: ['assets/items/chests/coin_1.png', 'assets/items/chests/coin_2.png', 'assets/items/chests/coin_3.png'],      // 💰 Coin Chest
        chest_energy: ['assets/items/chests/energy_1.png', 'assets/items/chests/energy_2.png', 'assets/items/chests/energy_3.png'],  // 🔋 Energy Chest
        chest_brown: ['assets/items/chests/brown_1.png', 'assets/items/chests/brown_2.png', 'assets/items/chests/brown_3.png', 'assets/items/chests/brown_4.png'], // Brown Chest
        chest_blue: ['assets/items/chests/blue_1.png', 'assets/items/chests/blue_2.png', 'assets/items/chests/blue_3.png', 'assets/items/chests/blue_4.png'],    // Blue Chest
        chest_coin_open: ['assets/items/chests/coin_open_1.png', 'assets/items/chests/coin_open_2.png', 'assets/items/chests/coin_open_3.png'],
        chest_energy_open: ['assets/items/chests/energy_open2_1.png', 'assets/items/chests/energy_open2_2.png', 'assets/items/chests/energy_open2_3.png'],
        chest_brown_open: ['assets/items/chests/brown_open_1.png', 'assets/items/chests/brown_open_2.png', 'assets/items/chests/brown_open_3.png', 'assets/items/chests/brown_open_4.png'],
        chest_blue_open: ['assets/items/chests/blue_open_1.png', 'assets/items/chests/blue_open_2.png', 'assets/items/chests/blue_open_3.png', 'assets/items/chests/blue_open_4.png'],
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
            'assets/items/hay/00_sprout.png',
            'assets/items/hay/01_stalk.png',
            'assets/items/hay/02_sheaf.png',
            'assets/items/hay/03_bale.png',
            'assets/items/hay/04_round_bale.png',
            'assets/items/hay/05_haystack.png',
            'assets/items/hay/06_cart.png',
            'assets/items/hay/07_wagon.png',
            'assets/items/hay/08_windmill.png',
            'assets/items/hay/09_golden_hay.png',
            'assets/items/hay/10_magic_hay.png',
            'assets/items/hay/11_rainbow_hay.png',
        ],
        // Cut from assets/raw/farm_chain_v3.webp.
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
        // Cut from assets/raw/fert_chain_v3.webp.
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
            'assets/items/aqua/11_sea_monster.png',
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
        // Each land's third chain, 00-07, cut from assets/raw/tools_<chain>.webp (bakery not drawn yet: emoji).
        bakery: [],
        wool: [
            'assets/items/wool/00.png',
            'assets/items/wool/01.png',
            'assets/items/wool/02.png',
            'assets/items/wool/03.png',
            'assets/items/wool/04.png',
            'assets/items/wool/05.png',
            'assets/items/wool/06.png',
            'assets/items/wool/07.png',
        ],
        seeds: [
            'assets/items/seeds/00.png',
            'assets/items/seeds/01.png',
            'assets/items/seeds/02.png',
            'assets/items/seeds/03.png',
            'assets/items/seeds/04.png',
            'assets/items/seeds/05.png',
            'assets/items/seeds/06.png',
            'assets/items/seeds/07.png',
        ],
        worms: [
            'assets/items/worms/00.png',
            'assets/items/worms/01.png',
            'assets/items/worms/02.png',
            'assets/items/worms/03.png',
            'assets/items/worms/04.png',
            'assets/items/worms/05.png',
            'assets/items/worms/06.png',
            'assets/items/worms/07.png',
        ],
        boat: [
            'assets/items/boat/00.png',
            'assets/items/boat/01.png',
            'assets/items/boat/02.png',
            'assets/items/boat/03.png',
            'assets/items/boat/04.png',
            'assets/items/boat/05.png',
            'assets/items/boat/06.png',
            'assets/items/boat/07.png',
        ],
        honey: [
            'assets/items/honey/00.png',
            'assets/items/honey/01.png',
            'assets/items/honey/02.png',
            'assets/items/honey/03.png',
            'assets/items/honey/04.png',
            'assets/items/honey/05.png',
            'assets/items/honey/06.png',
            'assets/items/honey/07.png',
        ],
        // Tool chains, cut from assets/raw/tools_<chain>.webp.
        tools: [
            'assets/items/tools/00.png',
            'assets/items/tools/01.png',
            'assets/items/tools/02.png',
            'assets/items/tools/03.png',
            'assets/items/tools/04.png',
            'assets/items/tools/05.png',
            'assets/items/tools/06.png',
            'assets/items/tools/07.png',
        ],
        garden: [
            'assets/items/garden/00.png',
            'assets/items/garden/01.png',
            'assets/items/garden/02.png',
            'assets/items/garden/03.png',
            'assets/items/garden/04.png',
            'assets/items/garden/05.png',
            'assets/items/garden/06.png',
            'assets/items/garden/07.png',
        ],
        wood: [
            'assets/items/wood/00.png',
            'assets/items/wood/01.png',
            'assets/items/wood/02.png',
            'assets/items/wood/03.png',
            'assets/items/wood/04.png',
            'assets/items/wood/05.png',
            'assets/items/wood/06.png',
            'assets/items/wood/07.png',
        ],
        clean: [
            'assets/items/clean/00.png',
            'assets/items/clean/01.png',
            'assets/items/clean/02.png',
            'assets/items/clean/03.png',
            'assets/items/clean/04.png',
            'assets/items/clean/05.png',
            'assets/items/clean/06.png',
            'assets/items/clean/07.png',
        ],
        fishing: [
            'assets/items/fishing/00.png',
            'assets/items/fishing/01.png',
            'assets/items/fishing/02.png',
            'assets/items/fishing/03.png',
            'assets/items/fishing/04.png',
            'assets/items/fishing/05.png',
            'assets/items/fishing/06.png',
            'assets/items/fishing/07.png',
        ],
        decor: [
            'assets/items/decor/00.png',
            'assets/items/decor/01.png',
            'assets/items/decor/02.png',
            'assets/items/decor/03.png',
            'assets/items/decor/04.png',
            'assets/items/decor/05.png',
            'assets/items/decor/06.png',
            'assets/items/decor/07.png',
        ],
    },
};
