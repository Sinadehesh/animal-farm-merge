# Asset list

Every picture the game uses or has a slot for, so you can generate them later.
It is kept up to date whenever the game gets a new slot.

- ✅ done · 🟡 placeholder drawing (works, but should be replaced) · ⬜ missing (the game shows an emoji)
- Style, prompts and the clean-up step: see [ASSETS.md](ASSETS.md). After making a file, put it at the path
  shown and add it to the matching list in `assets.js`.
- Sizes: items, producers and special items 256×256 PNG with a transparent background; buildings, characters
  and props 512×512; backgrounds 1080×1920.

**619 assets:** 589 done ✅, 4 placeholders 🟡, 26 missing ⬜.

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

## 4. Characters (7 people)

Nobody walks: Clara stands where she's working on the map (and turns up at each job you tap), and the townsfolk
stand at their doors on the town square. Their art is in the Drive folder "characters for merge keeper": per person
a **character reference** (a big figure on the left, four standing figures turning round along the top, a big
portrait under them) and walk sheets (not used). `tools/cutpeople.py` cuts the reference into
`assets/people/<name>/`: `stand.webp` (the first of the four: standing, facing you, on the map), `bust.webp` (the
big figure from the waist up: dialogs and story scenes) and `face.webp` (the big portrait: tasks, orders and
lists). They're listed in `hero`, `characters`, `bust` and `portraits` in `assets.js`.
🟡: Bram's, Ellis's, Mira's and Mae's references were over the Drive download limit (6 MB), so their standing and
waist-up pictures are stand-ins, `stand-walk.webp` and `bust-walk.webp`, cut from a frame of their walk (facing
you, feet closest together). Upload the four references (`<Name>_Character_Reference.png`) to the repo, put them in
`assets/raw/people/` and run the tool again.

| | Character | Standing | Waist up | Face |
|---|---|---|---|---|
| ✅ | Clara Everhart, the player (`hero`) | ✅ reference | (not used) | (not used) |
| ✅ | the Village Mayor, Mayor Bramble (`mayor`) | ✅ reference | ✅ reference | ✅ reference |
| 🟡 | Bram Goodbarrel, the rancher (`hattie`) | 🟡 walk frame | 🟡 walk frame | 🟡 from the walk |
| 🟡 | Ellis Spokewell, the carpenter (`ruby`) | 🟡 walk frame | 🟡 walk frame | ✅ from the bigger walk figures |
| 🟡 | Mira Quayle, the fisher (`finn`) | 🟡 walk frame | 🟡 walk frame | ✅ from the bigger walk figures |
| 🟡 | Mae Bloombarrow, the florist (`poppy`) | 🟡 walk frame | 🟡 walk frame | 🟡 from the walk |
| ⬜ | Marigold in the new style: a character reference like the others' (prompt in ASSETS.md) | | | |
| ✅ | the Market shopkeeper, Marigold: one pose sheet (`assets/raw/characters/shopkeeper_poses.jpg`, 4 × 2 poses on magenta), cut by `tools/cutposes.py` into her 8 poses in the market (`assets/characters/poses/shopkeeper/`), portrait, waving, standing and cheering | | | | |

## 5. Props (3)

| | Prop | File | What it shows |
|---|---|---|---|
| ✅ | Deed | `assets/props/deed_scroll.webp` → `assets/props/deed.png` | a rolled land deed with a wax seal |
| ✅ | Upgrade | `assets/props/upgrade.png` | the Growth Guide: a fat farming book with a sprout on the cover |
| ✅ | Manual | `assets/props/manual_red_book.webp` | the Workshop Manual (caps the tool producers' chains): the red book with a gold swirl, cut from `assets/raw/ui/books_scrolls.webp` |
| ✅ | Crate | `assets/props/crate.png` | a small wooden crate (the closed boxes on a new board) |

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
| ✅ | 0 | Wheat Sprout | `assets/items/hay/00_sprout.png` |  |
| ✅ | 1 | Wheat Stalk | `assets/items/hay/01_stalk.png` |  |
| ✅ | 2 | Wheat Sheaf | `assets/items/hay/02_sheaf.png` |  |
| ✅ | 3 | Hay Bale | `assets/items/hay/03_bale.png` |  |
| ✅ | 4 | Round Bale | `assets/items/hay/04_round_bale.png` |  |
| ✅ | 5 | Haystack | `assets/items/hay/05_haystack.png` |  |
| ✅ | 6 | Hay Cart | `assets/items/hay/06_cart.png` |  |
| ✅ | 7 | Hay Wagon | `assets/items/hay/07_wagon.png` |  |
| ✅ | 8 | Windmill | `assets/items/hay/08_windmill.png` |  |
| ✅ | 9 | Golden Hay | `assets/items/hay/09_golden_hay.png` | a golden hay bale |
| ✅ | 10 | Magic Hay | `assets/items/hay/10_magic_hay.png` | a hay bale with sparkles |
| ✅ | 11 | Rainbow Hay | `assets/items/hay/11_rainbow_hay.png` |  |

### Compost Yard

| | Tier | Item | File | Draw as |
|---|---|---|---|---|
| ✅ | 0 | Fallen Leaf | `assets/items/fert/00_fallen_leaf.png` | a single orange autumn leaf |
| ✅ | 1 | Leaf Pile | `assets/items/fert/01_leaf_pile.png` | a little pile of red and orange autumn leaves |
| ✅ | 2 | Veggie Scraps | `assets/items/fert/02_veggie_scraps.png` | carrot tops and an apple core |
| ✅ | 3 | Compost | `assets/items/fert/03_compost.png` | a small heap of dark crumbly compost with a sprout on top |
| ✅ | 4 | Rich Soil | `assets/items/fert/04_rich_soil.png` | a clay pot full of dark rich soil |
| ✅ | 5 | Mushroom | `assets/items/fert/05_mushroom.png` | a cute red-capped mushroom with white spots |
| ✅ | 6 | Plant Food | `assets/items/fert/06_plant_food.png` |  |
| ✅ | 7 | Super Plant Food | `assets/items/fert/07_super_plant_food.png` |  |
| ✅ | 8 | Grow Tonic | `assets/items/fert/08_grow_tonic.png` | a fertilizer bottle with a lightning label |
| ✅ | 9 | Garden Elixir | `assets/items/fert/09_garden_elixir.png` | a burlap sack with a gem on its tie |
| ✅ | 10 | Magic Mulch | `assets/items/fert/10_magic_mulch.png` | a dark sack with gold trim and a lightning bolt |
| ✅ | 11 | Starlight Mulch | `assets/items/fert/11_starlight_mulch.png` | a purple crystal sack of fertilizer |

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
| ✅ | 11 | Sea Monster | `assets/items/aqua/11_sea_monster.png` |  |

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
| ✅ | 0 | Red Apple | `assets/items/fair_pie/00_red_apple.png` |
| ✅ | 1 | Apple Slices | `assets/items/fair_pie/01_apple_slices.png` |
| ✅ | 2 | Pie Tin | `assets/items/fair_pie/02_pie_tin.png` |
| ✅ | 3 | Apple Pie | `assets/items/fair_pie/03_apple_pie.png` |
| ✅ | 4 | Cherry Tart | `assets/items/fair_pie/04_cherry_tart.png` |
| ✅ | 5 | Pie Tower | `assets/items/fair_pie/05_pie_tower.png` |
| ✅ | 6 | Ribbon Pie | `assets/items/fair_pie/06_ribbon_pie.png` |
| ✅ | 7 | Golden Pie | `assets/items/fair_pie/07_golden_pie.png` |
| ✅ | producer | Pie Oven | `assets/producers/fair_pie.png` (index 3 in `producers.fair_pie`) |

### 🌸 Flower Show

| | Tier | Item | File |
|---|---|---|---|
| ✅ | 0 | Flower Bulb | `assets/items/fair_flowers/00_flower_bulb.png` |
| ✅ | 1 | Green Shoot | `assets/items/fair_flowers/01_green_shoot.png` |
| ✅ | 2 | Hyacinth | `assets/items/fair_flowers/02_hyacinth.png` |
| ✅ | 3 | Posy | `assets/items/fair_flowers/03_posy.png` |
| ✅ | 4 | Bouquet | `assets/items/fair_flowers/04_bouquet.png` |
| ✅ | 5 | Flower Basket | `assets/items/fair_flowers/05_flower_basket.png` |
| ✅ | 6 | Flower Arch | `assets/items/fair_flowers/06_flower_arch.png` |
| ✅ | 7 | Prize Rosette | `assets/items/fair_flowers/07_prize_rosette.png` |
| ✅ | producer | Potting Bench | `assets/producers/fair_flowers.png` (index 3 in `producers.fair_flowers`) |

### 🎣 Fishing Derby

| | Tier | Item | File |
|---|---|---|---|
| ✅ | 0 | Bait | `assets/items/fair_fishing/00_bait.png` |
| ✅ | 1 | Shrimp | `assets/items/fair_fishing/01_shrimp.png` |
| ✅ | 2 | Lure | `assets/items/fair_fishing/02_lure.png` |
| ✅ | 3 | Little Fish | `assets/items/fair_fishing/03_little_fish.png` |
| ✅ | 4 | Trout | `assets/items/fair_fishing/04_trout.png` |
| ✅ | 5 | Salmon | `assets/items/fair_fishing/05_salmon.png` |
| ✅ | 6 | Big Catch | `assets/items/fair_fishing/06_big_catch.png` |
| ✅ | 7 | Trophy Fish | `assets/items/fair_fishing/07_trophy_fish.png` |
| ✅ | producer | Bait Bucket | `assets/producers/fair_fishing.png` (index 3 in `producers.fair_fishing`) |

### 🎃 Pumpkin Fair

| | Tier | Item | File |
|---|---|---|---|
| ✅ | 0 | Pumpkin Seed | `assets/items/fair_pumpkin/00_pumpkin_seed.png` |
| ✅ | 1 | Pumpkin Vine | `assets/items/fair_pumpkin/01_pumpkin_vine.png` |
| ✅ | 2 | Mini Gourd | `assets/items/fair_pumpkin/02_mini_gourd.png` |
| ✅ | 3 | Jack-o-Lantern | `assets/items/fair_pumpkin/03_jack_o_lantern.png` |
| ✅ | 4 | Big Pumpkin | `assets/items/fair_pumpkin/04_big_pumpkin.png` |
| ✅ | 5 | Giant Pumpkin | `assets/items/fair_pumpkin/05_giant_pumpkin.png` |
| ✅ | 6 | Pumpkin Wagon | `assets/items/fair_pumpkin/06_pumpkin_wagon.png` |
| ✅ | 7 | Golden Pumpkin | `assets/items/fair_pumpkin/07_golden_pumpkin.png` |
| ✅ | producer | Pumpkin Patch | `assets/producers/fair_pumpkin.png` (index 3 in `producers.fair_pumpkin`) |

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
| ✅ | Coin Chest | 3 | `assets/items/chests/coin_1.png` … `_3.png` | toy chest with a coin badge: sunflower yellow, then amber with bronze bands, then polished gold with a ruby |
| ✅ | Energy Chest | 3 | `assets/items/chests/energy_1.png` … `_3.png` | toy chest with a bolt badge: lime with cream trim, then teal with silver, then emerald with gold |
| ✅ | Brown Chest | 4 | `assets/items/chests/brown_1.png` … `_4.png` | wooden chest: honey wood with rope, chestnut with iron, mahogany with brass, dark wood with gold and a gem |
| ✅ | Blue Chest | 4 | `assets/items/chests/blue_1.png` … `_4.png` | magic chest: sky blue with silver, royal blue with gold, navy with filigree, indigo with a crown |
| ✅ | Coin Chest, open | 3 | `assets/items/chests/coin_open_1.png` … `_3.png` | the same chest as each level above, lid open, coins glinting inside |
| ✅ | Energy Chest, open | 3 | `assets/items/chests/energy_open2_1.png` … `_3.png` | the same chest as each level above, lid open, energy glowing inside |
| ✅ | Brown Chest, open | 4 | `assets/items/chests/brown_open_1.png` … `_4.png` | the same chest as each level above, lid open, treasure inside |
| ✅ | Blue Chest, open | 4 | `assets/items/chests/blue_open_1.png` … `_4.png` | the same chest as each level above, lid open, treasure inside |
| ✅ | Piggy Bank | 4 | `assets/items/special/piggy_1.png` … `_4.png` | a pink piggy bank, rounder and shinier each level |
| ✅ | Double Bubble | 1 | `assets/items/special/bubble.png` | an empty, see-through soap bubble with a rainbow sheen (the item shows inside it) |

## 11. Interface icons (25)

Small square PNGs with a transparent background in `assets/ui/` (listed in `ui` in `assets.js`). Anything
missing shows its emoji.

| | Icon | Where | File |
|---|---|---|---|
| ✅ | 💵 coins | top bar | `assets/ui/kit/icon_coin.webp` |
| ✅ | 💎 gems | top bar | `assets/ui/kit/icon_gem.webp` |
| ✅ | ⚡ energy | top bar | `assets/ui/kit/icon_energy.webp` |
| ✅ | ⭐ level | top bar | `assets/ui/kit/icon_star.webp` |
| ✅ | 🎁 daily gift, Daily Deals, rewards box | map, Market and board buttons | `assets/ui/gift.png` |
| ✅ | 📋 tasks | bottom-right Tasks button | `assets/ui/jobs.png` |
| ✅ | 🧺 merge board | bottom-left Merge button | `assets/ui/merge.png` |
| ✅ | 🗝️ golden key | an area unlocking | `assets/ui/key.png` |
| ✅ | 🎁 reward box | area and land rewards, task cards | `assets/ui/reward.png` |
| ✅ | ☁️ cloud | spare: locked areas | `assets/ui/cloud.png` |
| ✅ | ✅ check badge | spare: ready items | `assets/ui/kit/badge_tick.webp` |
| ✅ | ✨ sparkle | empty spots to build on | `assets/ui/sparkle.png` |
| ✅ | 🎟️ Season Pass | map button | `assets/ui/pass.png` |
| ✅ | 📅 daily goals | map button | `assets/ui/daily.png` |
| ✅ | 🫙 Gem Jar | map button | `assets/ui/jar.png` |
| ✅ | 🔥 offers | map button | `assets/ui/offer.png` |
| ✅ | 🎒 inventory | board info bar | `assets/ui/inventory.png` |
| ✅ | 🔒 lock | locked chests, lands and deeds | `assets/ui/lock.png` |
| ✅ | 🏷️ Flash Sale (price tag) | Market button | `assets/ui/sale.png` |
| ✅ | 🕸️ cobweb | info bar for cobwebbed items | `assets/ui/cobweb.png` |
| ✅ | 🔨 hammer | job tags on the map and job cards | `assets/ui/hammer.png` |
| ✅ | 🏆 trophy | Country Fair ribbon, header and race | `assets/ui/trophy.png` |
| ✅ | 📺 TV with a play button | "Watch an ad" buttons | `assets/ui/ad.png` |
| ✅ | 👆 pointing glove (white cartoon glove, index finger out) | the tutorial and guides: points at what to tap | `assets/ui/hand2.png` |
| ⬜ | 🧩 part | producer parts in reward texts | not wired yet (needs a small code change) |

### The storybook

The narrator's book and the notes from "A Friend" in the Golden Bell mystery, cut from `assets/raw/ui/books_scrolls.webp`;
listed in `story` in `assets.js`. The green scroll from the same sheet is the Land Deeds picture (`props.deed`).

| | Picture | File |
|---|---|---|
| ✅ | book | `assets/story/book.webp` |
| ✅ | note | `assets/story/note.webp` |

### The UI kit

Glossy buttons, frames, bars, the popup panel and its title ribbon, cut from `assets/raw/ui/kit.jpg` (Gemini, one sheet
on flat magenta) by `tools/cutkit.py`; listed in `kit` in `assets.js`. The page 9-slices them with CSS border-image.

| | Piece | File |
|---|---|---|
| ✅ | btn green | `assets/ui/kit/btn_green.webp` |
| ✅ | btn blue | `assets/ui/kit/btn_blue.webp` |
| ✅ | btn orange | `assets/ui/kit/btn_orange.webp` |
| ✅ | btn grey | `assets/ui/kit/btn_grey.webp` |
| ✅ | btn close | `assets/ui/kit/btn_close.webp` |
| ✅ | plus | `assets/ui/kit/plus.webp` |
| ✅ | ring blue | `assets/ui/kit/ring_blue.webp` |
| ✅ | square green | `assets/ui/kit/square_green.webp` |
| ✅ | square blue | `assets/ui/kit/square_blue.webp` |
| ✅ | bar plain | `assets/ui/kit/bar_plain.webp` |
| ✅ | badge alert | `assets/ui/kit/badge_alert.webp` |
| ✅ | panel | `assets/ui/kit/panel.webp` |
| ✅ | ribbon | `assets/ui/kit/ribbon.webp` |
| ✅ | bubble | `assets/ui/kit/bubble.webp` |
| ✅ | slot | `assets/ui/kit/slot.webp` |

## 12b. Plots (the newest look)

Each area drawn as one **isometric diorama plot**, clean and restored, on a flat background (Gemini, with the
Barnyard plot attached as the style reference). The game cuts it out, fades it and stands each job's **prop** on
it: mess or something broken that puffs away when the job is done, or something new that pops up. An area with a
plot shows it instead of its painting. Raw pictures in `assets/raw/plots/`; listed in `plots` and `plotProps` in
`assets.js`; where each prop stands is `PLOT_JOBS` in `game.js` (open the game with `?layout` to move them).

| | Area | File |
|---|---|---|
| ✅ | Market (shops, banners drawn by the game) | `assets/map/plots/market.webp` |
| ✅ | Sunnyvale town square | `assets/map/plots/town.webp` |
| ✅ | Barnyard | `assets/map/plots/barnyard.webp` |
| ✅ | Hen House | `assets/map/plots/henhouse.webp` |
| ✅ | Barn Storeroom | `assets/map/plots/bigbarn.webp` |
| ✅ | Field Gate | `assets/map/plots/fieldgate.webp` |
| ⬜ | Strawberry Rows | `assets/map/plots/berryrows.webp` |
| ⬜ | Orchard | `assets/map/plots/orchard.webp` |
| ⬜ | Meadow | `assets/map/plots/meadow.webp` |
| ⬜ | Stables | `assets/map/plots/stables.webp` |
| ⬜ | Windmill | `assets/map/plots/windmill.webp` |
| ⬜ | Leaf Piles | `assets/map/plots/leafpiles.webp` |
| ⬜ | Compost Bins | `assets/map/plots/compostbins.webp` |
| ⬜ | Mushroom Corner | `assets/map/plots/mushrooms.webp` |
| ⬜ | Muddy Shore | `assets/map/plots/muddyshore.webp` |
| ⬜ | Lily Pond | `assets/map/plots/lilypond.webp` |
| ⬜ | Boat Dock | `assets/map/plots/boatdock.webp` |
| ⬜ | Garden Gate | `assets/map/plots/gardengate.webp` |
| ⬜ | Rose Arch | `assets/map/plots/rosearch.webp` |
| ⬜ | Greenhouse | `assets/map/plots/greenhouse.webp` |

The soil edge under each plot is cut off with `tools/decliff.py` so plots sit flat on the ground. Every map picture
(plots, props, scenery, the ground, the road dirt) is then brightened once with `tools/brighten.py`, which also cleans
the pink fringe left by the magenta background. They all live in `assets/map/`.

### Plot props still to make (for the new plots)

Ten more sheets of 8 on flat magenta, two per land: its mess and broken things (they puff away when a job is
done) and the new things that pop up. Prompts in ASSETS.md; cut by name into `assets/map/props/`.

| | Sheet | Props |
|---|---|---|
| ⬜ | Crop Field mess | bed_bare, berries_wilted, barrel_broken, netting_tangled, molehole, apples_rotten, wall_rubble, beehive_broken |
| ⬜ | Crop Field more | stand_broken, swing_broken, baskets_tipped, sapling, picnic, berry_cart, bird_box, juice_crate |
| ⬜ | Hay Field mess | horseshoes_old, mud_hole, stall_door_broken, sail_broken, flour_spill, wall_cracked, hay_loose, sheep_woolly |
| ⬜ | Hay Field new | bales_stack, saddle_stand, sheep_shorn, flower_box, weather_vane, hay_rack, mounting_block, name_board |
| ⬜ | Compost Yard mess | leaf_heap, rakes_broken, tools_scattered, logs_rotten, roots_tangled, bin_broken, barrow_leaves, pots_broken |
| ⬜ | Compost Yard new | leaf_cage, bug_hotel, potting_bench, toadstool_giant, mushroom_log, fairy_door, wind_chimes, hedgehog_house |
| ⬜ | Fish Pond mess | cans_bottles, sticks_floating, algae, lilypads_dead, net_tangled, rowboat_sunken, sign_fallen, planks_missing |
| ⬜ | Fish Pond new | frogs_log, fishing_spot, lotus, koi, lanterns_red, life_ring, rowboat, duck_house |
| ⬜ | Flower Garden mess | roses_dead, fountain_cracked, glass_broken, arch_broken, bed_withered, trellis_fallen, cans_tipped, planter_cracked |
| ⬜ | Flower Garden new | beehive_white, bird_bath, hanging_basket, herb_pots, sunflower_giant, lemon_tree, orchid_pots, love_seat |

### The world around the areas

A repeating meadow under the whole map (`assets/raw/world/ground.jpg`, made seamless with `tools/seamless.py`) and
scenery scattered on it at real size (cut from `assets/raw/world/scenery_sheet.jpg`; heights in `SCENERY` in `game.js`).
The roads between areas are painted with a repeating dirt texture made by `tools/dirt.py`.

| | Picture | File |
|---|---|---|
| ✅ | Meadow ground (repeats) | `assets/map/ground.webp` |
| ✅ | Road dirt (repeats) | `assets/map/dirt.webp` |
| ✅ | Scenery: oak | `assets/map/scenery/oak.webp` |
| ✅ | Scenery: pine | `assets/map/scenery/pine.webp` |
| ✅ | Scenery: maple | `assets/map/scenery/maple.webp` |
| ✅ | Scenery: bush | `assets/map/scenery/bush.webp` |
| ✅ | Scenery: stump | `assets/map/scenery/stump.webp` |
| ✅ | Scenery: cattails | `assets/map/scenery/cattails.webp` |
| ✅ | Scenery: lavender | `assets/map/scenery/lavender.webp` |
| ✅ | Scenery: tulips | `assets/map/scenery/tulips.webp` |
| ✅ | Scenery: fence | `assets/map/scenery/fence.webp` |

### Plot props

Sheets of 8 on flat magenta, cut by name into `assets/map/props/`. Shared by every plot.

| | Prop | File |
|---|---|---|
| ✅ | weeds | `assets/map/props/weeds.webp` |
| ✅ | brambles | `assets/map/props/brambles.webp` |
| ✅ | branch | `assets/map/props/branch.webp` |
| ✅ | boulders | `assets/map/props/boulders.webp` |
| ✅ | planks | `assets/map/props/planks.webp` |
| ✅ | tyre | `assets/map/props/tyre.webp` |
| ✅ | scrap | `assets/map/props/scrap.webp` |
| ✅ | brushwood | `assets/map/props/brushwood.webp` |
| ✅ | cobweb | `assets/map/props/cobweb.webp` |
| ✅ | grain spill | `assets/map/props/grain_spill.webp` |
| ✅ | crate smashed | `assets/map/props/crate_smashed.webp` |
| ✅ | old straw | `assets/map/props/old_straw.webp` |
| ✅ | scrolls | `assets/map/props/scrolls.webp` |
| ✅ | jars broken | `assets/map/props/jars_broken.webp` |
| ✅ | old sacks | `assets/map/props/old_sacks.webp` |
| ✅ | puddle | `assets/map/props/puddle.webp` |
| ✅ | fence broken | `assets/map/props/fence_broken.webp` |
| ✅ | gate broken | `assets/map/props/gate_broken.webp` |
| ✅ | barrow broken | `assets/map/props/barrow_broken.webp` |
| ✅ | pump broken | `assets/map/props/pump_broken.webp` |
| ✅ | scaffold | `assets/map/props/scaffold.webp` |
| ✅ | tarp | `assets/map/props/tarp.webp` |
| ✅ | table broken | `assets/map/props/table_broken.webp` |
| ✅ | scarecrow fallen | `assets/map/props/scarecrow_fallen.webp` |
| ✅ | wire torn | `assets/map/props/wire_torn.webp` |
| ✅ | nest broken | `assets/map/props/nest_broken.webp` |
| ✅ | perch broken | `assets/map/props/perch_broken.webp` |
| ✅ | feeder broken | `assets/map/props/feeder_broken.webp` |
| ✅ | trough dry | `assets/map/props/trough_dry.webp` |
| ✅ | cart tipped | `assets/map/props/cart_tipped.webp` |
| ✅ | plough old | `assets/map/props/plough_old.webp` |
| ✅ | ditch | `assets/map/props/ditch.webp` |
| ✅ | lantern | `assets/map/props/lantern.webp` |
| ✅ | mailbox | `assets/map/props/mailbox.webp` |
| ✅ | tulips | `assets/map/props/tulips.webp` |
| ✅ | bench | `assets/map/props/bench.webp` |
| ✅ | bird feeder | `assets/map/props/bird_feeder.webp` |
| ✅ | firewood | `assets/map/props/firewood.webp` |
| ✅ | bunting | `assets/map/props/bunting.webp` |
| ✅ | wreath | `assets/map/props/wreath.webp` |

### The farmer

Clara: see 4. Characters.

### Effects (the sparkle layer)

Light on black, one sheet of 8 (`assets/raw/fx/sheet.jpg`), cut by `tools/cutfx.py`, which turns the black see-through.
PixiJS draws them on one canvas over the game (see THE SPARKLE LAYER in `game.js`); a missing one is drawn by the game.

| | Effect | File | Used for |
|---|---|---|---|
| ✅ | sparkle | `assets/fx/sparkle.webp` | the gold sparks in every burst, trails behind flying coins, twinkles on wanted items |
| ✅ | glow | `assets/fx/glow.webp` | the soft light behind bursts, flying coins and the level badge |
| ✅ | rays | `assets/fx/rays.webp` | big merges, fixes, unlocks, level up |
| ✅ | ring | `assets/fx/ring.webp` | the ring that opens out from a merge |
| ✅ | shine | `assets/fx/shine.webp` | the glint across a wanted item |
| ✅ | dust | `assets/fx/dust.webp` | a producer tap, a crate breaking, hammering |
| ✅ | swirl | `assets/fx/swirl.webp` | the magic trail rising from a fix |
| ✅ | stars | `assets/fx/stars.webp` | little stars opening behind the big bursts |

## 12a. Painted pages (the new look)

Each screen is **one painting**, with the buildings (and on the square, the people) painted in. It comes as one
16:9 sheet of three tall panels: the same scene ruined, half fixed and restored. The game cuts it into
`assets/stages/<page>/0-2.jpg`, scrolls it at full width and puts labels and job bubbles over it; the page
swaps to the next painting as its jobs get done. Raw sheets are kept in `assets/raw/stages/`. Listed in
`stages` in `assets.js`; a page without one keeps its old picture.

| | Page | Files | Note |
|---|---|---|---|
| ✅ | Farm map | `assets/stages/map/0-2.jpg` | swaps by thirds of all jobs |
| ✅ | Town square | `assets/stages/town/0-2.jpg` | fog, rebuilding, restored |
| ✅ | Barnyard | `assets/stages/barnyard/0-2.jpg` |  |
| ✅ | Hen House | `assets/stages/henhouse/0-2.jpg` |  |
| ✅ | Barn Storeroom | `assets/stages/bigbarn/0-2.jpg` | the barn's storeroom |
| ✅ | Field Gate | `assets/stages/fieldgate/0-2.jpg` |  |
| ✅ | Strawberry Rows | `assets/stages/berryrows/0-2.jpg` |  |
| ✅ | Orchard | `assets/stages/orchard/0-2.jpg` |  |
| ✅ | Meadow | `assets/stages/meadow/0-2.jpg` | its sheet runs ruined, restored, half fixed |
| ✅ | Stables | `assets/stages/stables/0-2.jpg` |  |
| ✅ | Windmill | `assets/stages/windmill/0-2.jpg` |  |
| ✅ | Leaf Piles | `assets/stages/leafpiles/0-2.jpg` |  |
| ✅ | Compost Bins | `assets/stages/compostbins/0-2.jpg` |  |
| ✅ | Mushroom Corner | `assets/stages/mushrooms/0-2.jpg` |  |
| ✅ | Muddy Shore | `assets/stages/muddyshore/0-2.jpg` |  |
| ✅ | Lily Pond | `assets/stages/lilypond/0-2.jpg` |  |
| ✅ | Boat Dock | `assets/stages/boatdock/0-2.jpg` |  |
| ✅ | Garden Gate | `assets/stages/gardengate/0-2.jpg` |  |
| ✅ | Rose Arch | `assets/stages/rosearch/0-2.jpg` |  |
| ✅ | Greenhouse | `assets/stages/greenhouse/0-2.jpg` |  |
| ✅ | Market | `assets/stages/market/storeroom.jpg` | the storeroom's restored painting; what's for sale is a list of tiles over it (the shopkeeper version is kept in `assets/raw/stages/market.webp`) |

## 12. Areas (Merge Mansion style places)

Superseded: each area is a painted page (12a) and, on the map, a plot (12b). The three area pictures that exist
are only the backdrop behind the Barn board; the others aren't needed.

| | Area | Land | File |
|---|---|---|---|
| ✅ | Barnyard | Barn | `assets/areas/barnyard.jpg` |
| ✅ | Hen House | Barn | `assets/areas/henhouse.jpg` |
| ✅ | Barn Storeroom | Barn | `assets/areas/bigbarn.jpg` |

### Objects in the areas

What stands at each job's spot, before and after, as transparent PNGs in `assets/objects/<area>/` (one 4×4 sheet
per area, cut by name). Listed in `objects` in `assets.js`; missing ones show the emoji. Areas without a
sheet yet use emoji pairs written on the job itself.

| | Object | Emoji | Used by |
|---|---|---|---|
Painted areas don't need these: their mess is in the painting. Only areas still without one are listed.


## 13. Tools (what jobs ask for)

Each land comes with a tool producer on its board (one picture, in `toolProducers` in `assets.js`) that drops
its own 8-step chain (`items.<chain>`, files `assets/items/<chain>/00.png` … `07.png`). Missing ones show emoji.

| | Producer | Land | Chain |
|---|---|---|---|
| ✅ | 🧰 Toolbox | Barn | ✅ Screw, Hammer, Screwdriver, Wrench, Saw, Power Drill, Tool Kit, Golden Tool Chest |
| ✅ | 🛖 Garden Shed | Crop Field | ✅ Gloves, Trowel, Shears, Rake, Garden Hose, Lawn Mower, Tractor, Golden Tractor |
| ✅ | 🪓 Log Pile | Hay Field | ✅ Twig, Log, Plank, Plank Bundle, Beams, Wooden Crate, Barrel, Carved Chest |
| ✅ | 🧹 Broom Cabinet | Compost Yard | ✅ Sponge, Soap, Scrub Brush, Soapy Bucket, Broom, Mop, Cleaning Trolley, Golden Broom |
| ✅ | 🎣 Tackle Box | Fish Pond | ✅ Hook, Bobber, Rope, Net, Fishing Rod, Oars, Life Ring, Rowboat |
| ✅ | 🏮 Lantern Crate | Flower Garden | ✅ Candle, Paper Lantern, Bunting, Glass Lantern, Fairy Lights, Balloons, Lamp Post, Golden Firework |
| ✅ | 🧶 Wool Basket | Barn | ✅ Wool Tuft, Ball of Yarn, Yarn Skeins, Woolly Socks, Knitted Scarf, Cozy Sweater, Patchwork Quilt, Golden Fleece |
| ✅ | 🌰 Seed Tin | Crop Field | ✅ Bean, Seed Packet, Seedling Tray, Veg Bundle, Veg Basket, Veg Crate, Market Cart, Prize Pumpkin |
| ✅ | 🥖 Flour Mill | Hay Field | ✅ Pinch of Flour, Bowl of Flour, Dough, Loaf, Croissants, Pie, Cake, Grand Wedding Cake |
| ✅ | 🪱 Worm Bin | Compost Yard | ✅ Worm, Worm Family, Worm Castings, Potting Mix, Herb Pot, Tomato Plant, Little Tree, Golden Bonsai |
| ✅ | 🛶 Boatyard | Fish Pond | ✅ Driftwood, Planed Board, Boat Frame, Hull, Mast and Sail, Dinghy, Sailboat, Golden Yacht |
| ✅ | 🐝 Beehive | Flower Garden | ✅ Honey Drop, Honey Jar, Beeswax Candle, Honey Soap, Honey Gift Box, Honey Cakes, Honey Barrel, Golden Hive |

## Sound effects

Short mp3s in `assets/sounds/`, listed in `sounds` in `assets.js`: Kenney's free CC0 packs for now (kenney.nl,
see `assets/sounds/LICENSE-kenney.txt`). Without a file the game plays a little sound it makes itself. The last
column is the Epidemic Sound pick to swap in once that account can download sound effects.

| | Sound | When | Epidemic Sound alternative |
|---|---|---|---|
| ✅ | `tap` | something drops out of a producer | Cartoon, Pop, Small Lid |
| ✅ | `merge` | two items merge (plays higher for bigger ones) | User Interface, Alert, Pops, Digital, Cute, Pops |
| ✅ | `pop` | a Double Bubble is popped | Water, Bubbles, Bubble, Single Pop 02 |
| ✅ | `coin` | coins, gems or energy collected, an order delivered | Games, Video, Event, Collect Coin, Bell Like |
| ✅ | `knock` | the hammer during a fix | Tools, Hand, Hammer, Hit Wood Decking Plank 02 |
| ✅ | `sparkle` | a fix is done, a producer recharged | Magic, Spell, Soft Airy, Chimes, Bells |
| ✅ | `levelup` | level up | Magic, Spell, Musical Ascending Arp, Level Up |
| ✅ | `fanfare` | an area or land restored | Cartoon, Musical, Success, Fanfare |
| ✅ | `whoosh` | a painting turns to its next stage | Magic, Spell, Rustle Whoosh |
| ✅ | `nope` | out of energy | Games, Video, Error, Notification 19 |
| ✅ | `merge_barn` | animals merge | - |
| ✅ | `merge_farm` | crops merge | - |
| ✅ | `merge_hay` | hay merges | - |
| ✅ | `merge_fert` | compost merges | - |
| ✅ | `merge_aqua` | pond creatures merge | - |
| ✅ | `merge_flower` | flowers merge | - |
| ✅ | `merge_tools` | tools merge | - |
| ✅ | `merge_garden` | garden tools merge | - |
| ✅ | `merge_wood` | wood merges | - |
| ✅ | `merge_clean` | cleaning things merge | - |
| ✅ | `merge_fishing` | fishing gear merges | - |
| ✅ | `merge_decor` | decorations merge | - |
| ✅ | `merge_level` | producers, boosters, chests merge | - |
| ✅ | `merge_mid` | on top of a mid-size merge (tiers 4-6) | - |
| ✅ | `merge_big` | on top of a big merge (tier 7 and up) | - |
| ✅ | `click` | any button | - |
| ✅ | `buy` | buying anything | - |
| ✅ | `taskdone` | a job done | - |
| ✅ | `unlock` | a new area opens | - |

### Music

| ✅ | Background loop | `assets/sounds/music_hush_hamlet.mp3` | "Hush Hamlet" by Zane Little Music (CC0), see `assets/sounds/LICENSE-music.txt` |

## App icons and store graphics

The icon on a phone's home screen, in the browser tab and on Google Play: the farm girl in the roses with her eyes
scratched out, cut from `assets/raw/icon_rose_girl.jpg` by `tools/make_icons.py`. Listed in `manifest.json` and
`index.html`; the Android icons are in `app/android/app/src/main/res/mipmap-*/`.

| | Icon | File |
|---|---|---|
| ✅ | App icon, 192×192 | `assets/ui/app-icon-rose-192.png` |
| ✅ | App icon, 512×512 | `assets/ui/app-icon-rose-512.png` |
| ✅ | App icon with room for a round mask, 512×512 | `assets/ui/app-icon-rose-maskable-512.png` |
| ✅ | iPhone home screen, 180×180 | `assets/ui/apple-touch-icon-rose.png` |
| ✅ | Android launcher icons (round, square, adaptive layer) | `app/android/app/src/main/res/mipmap-*/ic_launcher*.png` |
| ✅ | Google Play icon, 512×512 | `app/store/play-icon-512.png` |
| ✅ | Google Play feature graphic, 1024×500 (`tools/make_store_graphic.py`) | `app/store/feature-graphic-1024x500.png` |
| ✅ | Google Play phone screenshots, 6 at 1080×1920 (`tools/store_screenshots.mjs`, `tools/make_store_screens.py`) | `app/store/screenshots/` |

## Not used by the game

From before the painted map, not shown any more: the map buildings' stages from ruin to luxury
(`assets/buildings/stages/`, under `buildingStages` in `assets.js`), the restored map buildings, the town houses
(`assets/town/*.svg`) and the shop counter (`assets/props/counter.svg`).

Older drafts you can delete or keep as references: `assets/ghibli/`, `assets/v2/`, `assets/tier*_*.jpg`,
`assets/items/barn/09_bear.png`, `10_elephant.png`, `11_whale.png`. `assets/raw/` holds the source sheets the
items and icons were cut from.
The Barnyard and Hen House object sprites (`assets/objects/`) and the old area pictures (`assets/areas/`) are
only a fallback now that those areas are painted.
