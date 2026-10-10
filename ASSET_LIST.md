# Asset list

Every picture the game uses or has a slot for, so you can generate them later.
It is kept up to date whenever the game gets a new slot.

- ✅ done · 🟡 placeholder drawing (works, but should be replaced) · ⬜ missing (the game shows an emoji)
- Style, prompts and the clean-up step: see [ASSETS.md](ASSETS.md). After making a file, put it at the path
  shown and add it to the matching list in `assets.js`.
- Sizes: items, producers and special items 256×256 PNG with a transparent background; buildings, characters
  and props 512×512; backgrounds 1080×1920.

**308 assets:** 243 done ✅, 12 placeholders 🟡, 53 missing ⬜.

## 1. Backgrounds (3)

| | Asset | File | What it shows |
|---|---|---|---|
| ✅ | Map | `assets/scenes/map.jpg` → `assets/scenes/map.png` | the farm seen from above: a meadow with a dirt road winding to the top right, trees and fences at the edges, empty clearings where the buildings go |
| ✅ | Town | `assets/scenes/town.jpg` → `assets/scenes/town.png` | a cobblestone town square with a fountain in the middle, sky and hills at the top, empty spots for 5 houses |
| ✅ | Market | `assets/scenes/market.jpg` → `assets/scenes/market.png` | inside a wooden shop with two empty shelves on the back wall (the counter is a separate prop) |

## 2. Farm map buildings (8)

Same camera angle for all: front view, slightly from above, whole building with its base.

| | Building | File | What it shows |
|---|---|---|---|
| ✅ | Town | `assets/buildings/town.png` | a distant little town with a clock tower |
| ✅ | Market | `assets/buildings/market.png` | a market storefront with a striped awning |
| ✅ | Barn | `assets/buildings/barn.png` | a red barn with a silo |
| ✅ | Crop Field | `assets/buildings/farm.png` | a crop field patch with rows of veggies |
| ✅ | Hay Field | `assets/buildings/hay.png` | a hay field with round bales |
| ✅ | Compost Yard | `assets/buildings/fert.png` | a compost yard with bins |
| ✅ | Fish Pond | `assets/buildings/aqua.png` | a fish pond with lily pads |
| ✅ | Flower Garden | `assets/buildings/flower.png` | a flower garden with an arch |

### Stages from ruin to luxury

Shown as a building's jobs get done (the Market follows all jobs). They replace the faded look and the
restored version. Listed under `buildingStages` in `assets.js`, files `assets/buildings/stages/<name>_<n>.png`.

| | Building | Stages |
|---|---|---|
| ✅ | Sunnyvale | 8 |
| ✅ | Market | 8 |
| ✅ | Barn | 8 |
| ✅ | Crop Field | 8 |
| ✅ | Hay Field | 10 |
| ⬜ | Compost Yard | 8 (not made yet) |
| ⬜ | Fish Pond | 8 (not made yet) |
| ⬜ | Flower Garden | 8 (not made yet) |

### Restored versions (6, optional)

Each land shows faded and worn on the map until its restoration jobs are done, then in full colour. A
second picture of the fixed-up building (fresh paint, flowers, a little sparkle) makes that moment better.
List them under `buildingsRestored` in `assets.js`.

| | Land | File |
|---|---|---|
| ⬜ | Barn restored | `assets/buildings/barn_restored.png` |
| ⬜ | Crop Field restored | `assets/buildings/farm_restored.png` |
| ⬜ | Hay Field restored | `assets/buildings/hay_restored.png` |
| ⬜ | Compost Yard restored | `assets/buildings/fert_restored.png` |
| ⬜ | Fish Pond restored | `assets/buildings/aqua_restored.png` |
| ⬜ | Flower Garden restored | `assets/buildings/flower_restored.png` |

## 3. Town houses (5)

| | House | File | What it shows |
|---|---|---|---|
| 🟡 | Townhall | `assets/town/townhall.svg` → `assets/town/townhall.png` | the Mayor's town hall with columns |
| 🟡 | Carpenter | `assets/town/carpenter.svg` → `assets/town/carpenter.png` | Robin's log cabin carpenter shop |
| 🟡 | Ranch | `assets/town/ranch.svg` → `assets/town/ranch.png` | Marnie's ranch house with a fence |
| 🟡 | Fishshop | `assets/town/fishshop.svg` → `assets/town/fishshop.png` | Willy's fish shop by the water |
| 🟡 | Flowershop | `assets/town/flowershop.svg` → `assets/town/flowershop.png` | Sandy's flower shop |

## 4. Characters (6 full body + 5 portraits)

Full body: chibi, head about a third of the height, standing, facing you. Portraits: head and shoulders, shown in a round frame.

| | Character | Full body | Portrait |
|---|---|---|---|
| ✅ | Mayor Pelican | `assets/characters/mayor.png` | ✅ `assets/characters/portraits/mayor.png` |
| 🟡 | Marnie, the rancher | `assets/characters/marnie.svg` → `assets/characters/marnie.png` | ✅ `assets/characters/portraits/marnie.jpg` |
| 🟡 | Robin, the carpenter | `assets/characters/robin.svg` → `assets/characters/robin.png` | ⬜ → `assets/characters/portraits/robin.png` |
| 🟡 | Willy, the fisherman | `assets/characters/willy.svg` → `assets/characters/willy.png` | ✅ `assets/characters/portraits/willy.jpg` |
| 🟡 | Sandy, the florist | `assets/characters/sandy.svg` → `assets/characters/sandy.png` | ✅ `assets/characters/portraits/sandy.jpg` |
| ✅ | the Market shopkeeper | `assets/characters/shopkeeper.png` | — |

The 4 portraits that exist are in the older Ghibli style; regenerate them in the candy style so they match.

## 5. Props (4)

| | Prop | File | What it shows |
|---|---|---|---|
| 🟡 | Counter | `assets/props/counter.svg` → `assets/props/counter.png` | a long wooden shop counter (front view, wide) |
| 🟡 | Deed | `assets/props/deed.svg` → `assets/props/deed.png` | a rolled land deed with a wax seal |
| 🟡 | Upgrade | `assets/props/upgrade.svg` → `assets/props/upgrade.png` | the Growth Guide: a fat farming book with a sprout on the cover |
| ⬜ | Crate | `assets/props/crate.png` | a small wooden crate (the closed boxes on a new board) |

## 6. Board backgrounds (6, optional)

Shown behind each 6×8 merge board. Without one the board uses a plain colour.

| | Board | File | What it shows |
|---|---|---|---|
| ✅ | Barn | `assets/boards/barn.png` (portrait, 1080×1440) | wooden barn planks |
| ✅ | Crop Field | `assets/boards/farm.png` (portrait, 1080×1440) | tilled soil rows |
| ✅ | Hay Field | `assets/boards/hay.png` (portrait, 1080×1440) | golden straw |
| ✅ | Compost Yard | `assets/boards/fert.png` (portrait, 1080×1440) | dark compost earth |
| ✅ | Fish Pond | `assets/boards/aqua.png` (portrait, 1080×1440) | pond water with ripples |
| ✅ | Flower Garden | `assets/boards/flower.png` (portrait, 1080×1440) | grass with little flowers |

## 7. Merge items (6 boards × 12 tiers = 72)

One chain per board, tier 0 (made by the producer) to tier 11. Each tier must look different from the one
below it by its outline alone, bigger and fancier as it goes up; tiers 9-11 get gold trim and sparkles.

### Barn

| | Tier | Item | File | Draw as |
|---|---|---|---|---|
| ✅ | 0 | Feed | `assets/items/barn/00_feed.png` | a small scoop of grain feed |
| ✅ | 1 | Egg | `assets/items/barn/01_egg.png` |  |
| ✅ | 2 | Chick | `assets/items/barn/02_chick.png` |  |
| ✅ | 3 | Chicken | `assets/items/barn/03_hen.png` |  |
| ✅ | 4 | Piglet | `assets/items/barn/04_piglet.png` |  |
| ✅ | 5 | Pig | `assets/items/barn/05_pig.png` |  |
| ✅ | 6 | Calf | `assets/items/barn/06_calf.png` |  |
| ✅ | 7 | Cow | `assets/items/barn/07_cow.png` |  |
| ✅ | 8 | Horse | `assets/items/barn/08_horse.png` |  |
| ✅ | 9 | Alpaca | `assets/items/barn/09_alpaca.png` |  |
| ✅ | 10 | Prize Bull | `assets/items/barn/10_bull.png` |  |
| ✅ | 11 | Unicorn | `assets/items/barn/11_unicorn.png` |  |

### Crop Field

| | Tier | Item | File | Draw as |
|---|---|---|---|---|
| ✅ | 0 | Fertilizer | `assets/items/farm/00_fertilizer.png` | a small bag of fertilizer |
| ✅ | 1 | Seed | `assets/items/farm/01_seed.png` |  |
| ✅ | 2 | Sprout | `assets/items/farm/02_sprout.png` |  |
| ✅ | 3 | Strawberry | `assets/items/farm/03_strawberry.png` |  |
| ✅ | 4 | Tomato | `assets/items/farm/04_tomato.png` |  |
| ✅ | 5 | Corn | `assets/items/farm/05_corn.png` |  |
| ✅ | 6 | Carrot | `assets/items/farm/06_carrot.png` |  |
| ✅ | 7 | Cabbage | `assets/items/farm/07_cabbage.png` |  |
| ✅ | 8 | Pumpkin | `assets/items/farm/08_pumpkin.png` |  |
| ✅ | 9 | Watermelon | `assets/items/farm/09_watermelon.png` |  |
| ✅ | 10 | Golden Apple | `assets/items/farm/10_golden_apple.png` | a shiny golden apple |
| ✅ | 11 | Giant Sun | `assets/items/farm/11_giant_sun.png` | a giant sunflower |

### Hay Field

| | Tier | Item | File | Draw as |
|---|---|---|---|---|
| ✅ | 0 | Wheat | `assets/items/hay/00_wheat.png` |  |
| ✅ | 1 | Stalk | `assets/items/hay/01_stalk.png` |  |
| ✅ | 2 | Bundle | `assets/items/hay/02_bundle.png` |  |
| ✅ | 3 | Small Bale | `assets/items/hay/03_small_bale.png` |  |
| ✅ | 4 | Medium Bale | `assets/items/hay/04_medium_bale.png` |  |
| ✅ | 5 | Large Bale | `assets/items/hay/05_large_bale.png` |  |
| ✅ | 6 | Hay Stack | `assets/items/hay/06_hay_stack.png` |  |
| ✅ | 7 | Hay Tower | `assets/items/hay/07_hay_tower.png` | a tall stack of hay bales |
| ✅ | 8 | Hay Silo | `assets/items/hay/08_hay_silo.png` | a tiny silo full of hay |
| ✅ | 9 | Golden Hay | `assets/items/hay/09_golden_hay.png` | a golden hay bale |
| ✅ | 10 | Magic Hay | `assets/items/hay/10_magic_hay.png` | a hay bale with sparkles |
| ✅ | 11 | Infinite Hay | `assets/items/hay/11_infinite_hay.png` | a glowing hay bale with an infinity ribbon |

### Compost Yard

| | Tier | Item | File | Draw as |
|---|---|---|---|---|
| ✅ | 0 | Fallen Leaf | `assets/items/fert/00_fallen_leaf.png` | a single orange autumn leaf |
| ✅ | 1 | Leaf Pile | `assets/items/fert/01_leaf_pile.png` | a little pile of red and orange autumn leaves |
| ✅ | 2 | Veggie Scraps | `assets/items/fert/02_veggie_scraps.png` | carrot tops and an apple core |
| ✅ | 3 | Compost | `assets/items/fert/03_compost.png` | a small heap of dark crumbly compost with a sprout on top |
| ✅ | 4 | Rich Soil | `assets/items/fert/04_rich_soil.png` | a clay pot full of dark rich soil |
| ✅ | 5 | Mushroom | `assets/items/fert/05_mushroom.png` | a cute red-capped mushroom with white spots |
| ✅ | 6 | Basic Fert | `assets/items/fert/06_basic_fert.png` |  |
| ✅ | 7 | Quality Fert | `assets/items/fert/07_quality_fert.png` |  |
| ✅ | 8 | Speed-Gro | `assets/items/fert/08_speed_gro.png` | a fertilizer bottle with a lightning label |
| ✅ | 9 | Deluxe Fert | `assets/items/fert/09_deluxe_fert.png` | a burlap sack with a gem on its tie |
| ✅ | 10 | Magic Fert | `assets/items/fert/10_magic_fert.png` | a dark sack with gold trim and a lightning bolt |
| ✅ | 11 | Iridium Fert | `assets/items/fert/11_iridium_fert.png` | a purple crystal sack of fertilizer |

### Fish Pond

| | Tier | Item | File | Draw as |
|---|---|---|---|---|
| ✅ | 0 | Fish Food | `assets/items/aqua/00_fish_food.png` | a small pile of fish flakes |
| ✅ | 1 | Snail | `assets/items/aqua/01_snail.png` | a round little pond snail with a swirly shell |
| ✅ | 2 | Minnow | `assets/items/aqua/02_minnow.png` | a tiny silver fish |
| ✅ | 3 | Frog | `assets/items/aqua/03_frog.png` |  |
| ✅ | 4 | Goldfish | `assets/items/aqua/04_goldfish.png` |  |
| ✅ | 5 | Koi | `assets/items/aqua/05_koi.png` | a chubby orange-and-white koi fish |
| ✅ | 6 | Turtle | `assets/items/aqua/06_turtle.png` |  |
| ✅ | 7 | Otter | `assets/items/aqua/07_otter.png` |  |
| ✅ | 8 | Duck | `assets/items/aqua/08_duck.png` |  |
| ✅ | 9 | Swan | `assets/items/aqua/09_swan.png` |  |
| ✅ | 10 | Flamingo | `assets/items/aqua/10_flamingo.png` |  |
| ✅ | 11 | Pond Dragon | `assets/items/aqua/11_pond_dragon.png` | a small friendly green dragon with lily-pad wings |

### Flower Garden

| | Tier | Item | File | Draw as |
|---|---|---|---|---|
| ✅ | 0 | Water Drop | `assets/items/flower/00_water_drop.png` | a single round water drop |
| ✅ | 1 | Seedling | `assets/items/flower/01_seedling.png` |  |
| ✅ | 2 | Bud | `assets/items/flower/02_bud.png` |  |
| ✅ | 3 | Daisy | `assets/items/flower/03_daisy.png` |  |
| ✅ | 4 | Tulip | `assets/items/flower/04_tulip.png` |  |
| ✅ | 5 | Rose | `assets/items/flower/05_rose.png` |  |
| ✅ | 6 | Lily | `assets/items/flower/06_lily.png` |  |
| ✅ | 7 | Orchid | `assets/items/flower/07_orchid.png` |  |
| ✅ | 8 | Lotus | `assets/items/flower/08_lotus.png` |  |
| ✅ | 9 | Rafflesia | `assets/items/flower/09_rafflesia.png` |  |
| ✅ | 10 | Crystal Flower | `assets/items/flower/10_crystal_flower.png` | a flower made of pink crystal |
| ✅ | 11 | Tree of Life | `assets/items/flower/11_tree_of_life.png` | a tiny glowing tree in a pot |

## 8. Producers (6 boards × 8 levels = 48)

Levels 1-3 are parts (look unfinished: a broken or small piece). Level 4 is the first working producer, and
levels 4-8 get bigger and fancier; level 8 is golden.

### Barn (🧺 Feed Bin)

| | Level | Name | File |
|---|---|---|---|
| ✅ | 1 (part) | Feed Scoop | `assets/producers/barn/1_feed_scoop.png` |
| ✅ | 2 (part) | Feed Pail | `assets/producers/barn/2_feed_pail.png` |
| ✅ | 3 (part) | Feed Sack | `assets/producers/barn/3_feed_sack.png` |
| ✅ | 4 (producer) | Feed Bin | `assets/producers/barn/4_feed_bin.png` |
| ✅ | 5 (producer) | Big Feed Bin | `assets/producers/barn/5_big_feed_bin.png` |
| ✅ | 6 (producer) | Feed Trough | `assets/producers/barn/6_feed_trough.png` |
| ✅ | 7 (producer) | Feed Cart | `assets/producers/barn/7_feed_cart.png` |
| ✅ | 8 (producer) | Golden Feed Silo | `assets/producers/barn/8_golden_feed_silo.png` |

### Crop Field (✨ Fert Bag)

| | Level | Name | File |
|---|---|---|---|
| ✅ | 1 (part) | Torn Fert Pouch | `assets/producers/farm/1_torn_fert_pouch.png` |
| ✅ | 2 (part) | Fert Pouch | `assets/producers/farm/2_fert_pouch.png` |
| ✅ | 3 (part) | Small Fert Bag | `assets/producers/farm/3_small_fert_bag.png` |
| ✅ | 4 (producer) | Fert Bag | `assets/producers/farm/4_fert_bag.png` |
| ✅ | 5 (producer) | Big Fert Bag | `assets/producers/farm/5_big_fert_bag.png` |
| ✅ | 6 (producer) | Fert Sack | `assets/producers/farm/6_fert_sack.png` |
| ✅ | 7 (producer) | Fert Barrel | `assets/producers/farm/7_fert_barrel.png` |
| ✅ | 8 (producer) | Golden Fert Barrel | `assets/producers/farm/8_golden_fert_barrel.png` |

### Hay Field (🌾 Wheat Sack)

| | Level | Name | File |
|---|---|---|---|
| ✅ | 1 (part) | Seed Pouch | `assets/producers/hay/1_seed_pouch.png` |
| ✅ | 2 (part) | Wheat Bag | `assets/producers/hay/2_wheat_bag.png` |
| ✅ | 3 (part) | Small Wheat Sack | `assets/producers/hay/3_small_wheat_sack.png` |
| ✅ | 4 (producer) | Wheat Sack | `assets/producers/hay/4_wheat_sack.png` |
| ✅ | 5 (producer) | Big Wheat Sack | `assets/producers/hay/5_big_wheat_sack.png` |
| ✅ | 6 (producer) | Wheat Barrel | `assets/producers/hay/6_wheat_barrel.png` |
| ✅ | 7 (producer) | Wheat Cart | `assets/producers/hay/7_wheat_cart.png` |
| ✅ | 8 (producer) | Golden Granary | `assets/producers/hay/8_golden_granary.png` |

### Compost Yard (🧹 Leaf Rake)

| | Level | Name | File |
|---|---|---|---|
| ✅ | 1 (part) | Broken Rake | `assets/producers/fert/1_broken_rake.png` |
| ✅ | 2 (part) | Mended Rake | `assets/producers/fert/2_mended_rake.png` |
| ✅ | 3 (part) | Small Rake | `assets/producers/fert/3_small_rake.png` |
| ✅ | 4 (producer) | Leaf Rake | `assets/producers/fert/4_leaf_rake.png` |
| ✅ | 5 (producer) | Leaf Basket | `assets/producers/fert/5_leaf_basket.png` |
| ✅ | 6 (producer) | Leaf Barrow | `assets/producers/fert/6_leaf_barrow.png` |
| ✅ | 7 (producer) | Compost Bin | `assets/producers/fert/7_compost_bin.png` |
| ✅ | 8 (producer) | Golden Compost Tumbler | `assets/producers/fert/8_golden_compost_tumbler.png` |

### Fish Pond (🥫 Fish Food Tin)

| | Level | Name | File |
|---|---|---|---|
| ✅ | 1 (part) | Empty Tin | `assets/producers/aqua/1_empty_tin.png` |
| ✅ | 2 (part) | Small Tin | `assets/producers/aqua/2_small_tin.png` |
| ✅ | 3 (part) | Fish Food Pouch | `assets/producers/aqua/3_fish_food_pouch.png` |
| ✅ | 4 (producer) | Fish Food Tin | `assets/producers/aqua/4_fish_food_tin.png` |
| ✅ | 5 (producer) | Big Fish Food Tin | `assets/producers/aqua/5_big_fish_food_tin.png` |
| ✅ | 6 (producer) | Fish Food Jar | `assets/producers/aqua/6_fish_food_jar.png` |
| ✅ | 7 (producer) | Fish Feeder | `assets/producers/aqua/7_fish_feeder.png` |
| ✅ | 8 (producer) | Golden Feeder | `assets/producers/aqua/8_golden_feeder.png` |

### Flower Garden (🚿 Watering Can)

| | Level | Name | File |
|---|---|---|---|
| ✅ | 1 (part) | Patched Can | `assets/producers/flower/1_patched_can.png` |
| ✅ | 2 (part) | Leaky Can | `assets/producers/flower/2_leaky_can.png` |
| ✅ | 3 (part) | Small Can | `assets/producers/flower/3_small_can.png` |
| ✅ | 4 (producer) | Watering Can | `assets/producers/flower/4_watering_can.png` |
| ✅ | 5 (producer) | Big Watering Can | `assets/producers/flower/5_big_watering_can.png` |
| ✅ | 6 (producer) | Sprinkler | `assets/producers/flower/6_sprinkler.png` |
| ✅ | 7 (producer) | Rain Barrel | `assets/producers/flower/7_rain_barrel.png` |
| ✅ | 8 (producer) | Golden Fountain | `assets/producers/flower/8_golden_fountain.png` |

## 9. Country Fair (4 themes × 8 items + 4 producers = 36)

The weekend event board. Its theme changes every week; each has its own chain and producer. Like the
animals, each tier should be bigger and fancier than the last, and the top one a gold prize.

### 🥧 Pie Contest

| | Tier | Item | File |
|---|---|---|---|
| ⬜ | 0 | Flour | `assets/items/fair_pie/00_flour.png` |
| ⬜ | 1 | Dough | `assets/items/fair_pie/01_dough.png` |
| ⬜ | 2 | Pie Crust | `assets/items/fair_pie/02_pie_crust.png` |
| ⬜ | 3 | Apple Pie | `assets/items/fair_pie/03_apple_pie.png` |
| ⬜ | 4 | Berry Pie | `assets/items/fair_pie/04_berry_pie.png` |
| ⬜ | 5 | Layer Cake | `assets/items/fair_pie/05_layer_cake.png` |
| ⬜ | 6 | Wedding Cake | `assets/items/fair_pie/06_wedding_cake.png` |
| ⬜ | 7 | Golden Pie | `assets/items/fair_pie/07_golden_pie.png` |
| ⬜ | producer | Mixing Bowl | `assets/producers/fair_pie.png` (index 3 in `producers.fair_pie`) |

### 🌸 Flower Show

| | Tier | Item | File |
|---|---|---|---|
| ⬜ | 0 | Seed Packet | `assets/items/fair_flowers/00_seed_packet.png` |
| ⬜ | 1 | Sprout | `assets/items/fair_flowers/01_sprout.png` |
| ⬜ | 2 | Bud | `assets/items/fair_flowers/02_bud.png` |
| ⬜ | 3 | Posy | `assets/items/fair_flowers/03_posy.png` |
| ⬜ | 4 | Bouquet | `assets/items/fair_flowers/04_bouquet.png` |
| ⬜ | 5 | Flower Basket | `assets/items/fair_flowers/05_flower_basket.png` |
| ⬜ | 6 | Flower Arch | `assets/items/fair_flowers/06_flower_arch.png` |
| ⬜ | 7 | Prize Rosette | `assets/items/fair_flowers/07_prize_rosette.png` |
| ⬜ | producer | Seed Tray | `assets/producers/fair_flowers.png` (index 3 in `producers.fair_flowers`) |

### 🎣 Fishing Derby

| | Tier | Item | File |
|---|---|---|---|
| ⬜ | 0 | Bait | `assets/items/fair_fishing/00_bait.png` |
| ⬜ | 1 | Hook | `assets/items/fair_fishing/01_hook.png` |
| ⬜ | 2 | Lure | `assets/items/fair_fishing/02_lure.png` |
| ⬜ | 3 | Little Fish | `assets/items/fair_fishing/03_little_fish.png` |
| ⬜ | 4 | Trout | `assets/items/fair_fishing/04_trout.png` |
| ⬜ | 5 | Salmon | `assets/items/fair_fishing/05_salmon.png` |
| ⬜ | 6 | Big Catch | `assets/items/fair_fishing/06_big_catch.png` |
| ⬜ | 7 | Trophy Fish | `assets/items/fair_fishing/07_trophy_fish.png` |
| ⬜ | producer | Tackle Box | `assets/producers/fair_fishing.png` (index 3 in `producers.fair_fishing`) |

### 🎃 Pumpkin Fair

| | Tier | Item | File |
|---|---|---|---|
| ⬜ | 0 | Pumpkin Seed | `assets/items/fair_pumpkin/00_pumpkin_seed.png` |
| ⬜ | 1 | Vine | `assets/items/fair_pumpkin/01_vine.png` |
| ⬜ | 2 | Little Pumpkin | `assets/items/fair_pumpkin/02_little_pumpkin.png` |
| ⬜ | 3 | Pumpkin | `assets/items/fair_pumpkin/03_pumpkin.png` |
| ⬜ | 4 | Big Pumpkin | `assets/items/fair_pumpkin/04_big_pumpkin.png` |
| ⬜ | 5 | Giant Pumpkin | `assets/items/fair_pumpkin/05_giant_pumpkin.png` |
| ⬜ | 6 | Prize Pumpkin | `assets/items/fair_pumpkin/06_prize_pumpkin.png` |
| ⬜ | 7 | Golden Pumpkin | `assets/items/fair_pumpkin/07_golden_pumpkin.png` |
| ⬜ | producer | Pumpkin Patch | `assets/producers/fair_pumpkin.png` (index 3 in `producers.fair_pumpkin`) |

## 10. Special items (46)

The same on every board. Each level looks fuller or bigger than the one before.

| | Item | Levels | Files | Draw as |
|---|---|---|---|---|
| ✅ | Coins | 6 | `assets/items/special/coin_1.png` … `_6.png` | a gold coin → 2 coins → small stack → tall stack → pile → overflowing pot |
| ✅ | Gems | 4 | `assets/items/special/gem_1.png` … `_4.png` | a blue gem → 2 gems → 3 gems → gem cluster |
| ✅ | Energy | 5 | `assets/items/special/energy_1.png` … `_5.png` | a yellow lightning bolt in a bubble, bigger and brighter each level |
| ✅ | XP stars | 5 | `assets/items/special/xp_1.png` … `_5.png` | a golden star, bigger and more sparkly each level |
| ✅ | Season Pass items | 4 | `assets/items/special/season_1.png` … `_4.png` | a golden ticket with a four-leaf clover, more of them each level (works for every season) |
| ✅ | Time Skip | 4 | `assets/items/special/skip_1.png` … `_4.png` | an hourglass, fancier each level (1h, 2h, 4h, 8h) |
| ✅ | Time Charger | 4 | `assets/items/special/charger_1.png` … `_4.png` | a stopwatch with a green glow, fancier each level (2h-16h) |
| ✅ | Unlimited Energy | 3 | `assets/items/special/unlimited_1.png` … `_3.png` | a purple infinity sign with a bolt (5, 10, 20 min) |
| ✅ | Coin Chest | 1 | `assets/items/special/chest_coin_1.png` | a small gold chest spilling coins |
| ✅ | Energy Chest | 1 | `assets/items/special/chest_energy_1.png` | a green chest with a lightning bolt |
| ✅ | Brown Chest | 2 | `assets/items/special/chest_brown_1.png` … `_2.png` | a wooden treasure chest; level 2 bigger with iron trim |
| ✅ | Blue Chest | 2 | `assets/items/special/chest_blue_1.png` … `_2.png` | a fancy blue chest with gold trim; level 2 bigger |
| ✅ | Piggy Bank | 4 | `assets/items/special/piggy_1.png` … `_4.png` | a pink piggy bank, rounder and shinier each level |
| ✅ | Double Bubble | 1 | `assets/items/special/bubble.png` | an empty, see-through soap bubble with a rainbow sheen (the item shows inside it) |

## 11. Interface icons (18)

Small square PNGs with a transparent background in `assets/ui/` (listed in `ui` in `assets.js`). Anything
missing shows its emoji.

| | Icon | Where | File |
|---|---|---|---|
| ✅ | 💵 coins | top bar | `assets/ui/coin.png` |
| ✅ | 💎 gems | top bar | `assets/ui/gem.png` |
| ✅ | ⚡ energy | top bar | `assets/ui/energy.png` |
| ✅ | ⭐ level | top bar | `assets/ui/star.png` |
| ✅ | 🎁 daily gift, Daily Deals, rewards box | map, Market and board buttons | `assets/ui/gift.png` |
| ✅ | 📋 jobs | map button | `assets/ui/jobs.png` |
| ✅ | 🎟️ Season Pass | map button | `assets/ui/pass.png` |
| ✅ | 📅 daily goals | map button | `assets/ui/daily.png` |
| ✅ | 🫙 Gem Jar | map button | `assets/ui/jar.png` |
| ✅ | 🔥 offers | map button | `assets/ui/offer.png` |
| ✅ | 🎒 inventory | board info bar | `assets/ui/inventory.png` |
| ✅ | 🔒 lock | locked chests, lands and deeds | `assets/ui/lock.png` |
| ⬜ | 🏷️ Flash Sale (price tag) | Market button | `assets/ui/sale.png` |
| ⬜ | 🕸️ cobweb | info bar for cobwebbed items | `assets/ui/cobweb.png` |
| ⬜ | 🔨 hammer | job tags on the map and job cards | `assets/ui/hammer.png` |
| ⬜ | 🏆 trophy | Country Fair ribbon, header and race | `assets/ui/trophy.png` |
| ⬜ | 📺 TV with a play button | "Watch an ad" buttons | `assets/ui/ad.png` |
| ⬜ | 🧩 part | producer parts in reward texts | not wired yet (needs a small code change) |

## Not used by the game

Older drafts you can delete or keep as references: `assets/ghibli/`, `assets/v2/`, `assets/tier*_*.jpg`,
`assets/items/barn/09_bear.png`, `10_elephant.png`, `11_whale.png`. `assets/raw/` holds the source sheets the
items and icons were cut from.
