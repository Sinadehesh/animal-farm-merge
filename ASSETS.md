# Art pipeline: making the game's assets with AI

The game draws every image from `assets.js`. The placeholders in `assets/` are
simple SVGs that show where each asset goes and what style it should have. To use
AI art, generate an image, clean it with `tools/process_assets.py`, and change
its path in `assets.js`. No game code changes.

About 100 images are needed: 3 backgrounds, 8 map buildings, 5 town buildings,
6 characters, 3 market props, and 72 merge items (6 boards × 12 tiers).

## 1. Use one style for everything

Your current images use three styles: flat outlined stickers (the first egg,
chick and white chicken), soft painted (the second egg and chick), and clay 3D
(piglet, pig, calf). Mixed styles are the main thing that makes AI-art games look
cheap, so pick one and regenerate anything that doesn't match.

Use the **flat outlined sticker** style (`assets/items/barn/01_egg.png`,
`02_chick.png`, `03_chicken.png`). It's the best fit for this game:

- It's still readable at the ~60px size of a board cell on a phone. Clay and
  painted styles turn into blobs at that size.
- The dark outline separates each item from any background (wood, water, grass).
- It works for buildings and people too, so the map, town and items look like one world.
- It cuts out cleanly. Those three images went through the clean-up script with no manual work.

The placeholder SVGs use the same rules (brown outline, flat colours, chubby
shapes), so they also show what the finished art should look like.

## 2. The style block

Paste this **exactly** at the start of every prompt. Don't reword it.

> Cute cozy farm game asset, flat 2D cartoon sticker style, thick even dark-brown
> outline around every shape, flat colours with one soft highlight and one
> soft shadow tone, no gradients, no texture, no text, chubby rounded proportions,
> centered, plain solid white background, no ground shadow, no border.

"No ground shadow" and "plain solid white background" are what let the script
cut the image out cleanly. The game adds its own shadows.

## 3. Workflow

1. **Always attach reference images.** A text prompt alone drifts after a few
   images. Google's image model (the one in the dev plan) accepts several
   reference images, so attach `02_chick.png` and `03_chicken.png` every time.
   Also attach one approved asset of the same kind: a building when making
   buildings, a character when making characters.
2. **Generate 3–4 variants and keep one.** Reject anything with gradients, 3D
   shading, a missing outline, or a background that isn't flat.
3. **Cut it up:**
   ```
   python3 tools/process_assets.py assets/raw/barn_sheet.jpg out 4 3 256
   ```
   This finds each item on the sheet (so ears, tails and sparkles that cross a
   grid line stay with their item), removes the white background and its pale
   edge, centres each item in a square and saves `00.png`, `01.png`… as
   transparent PNGs. If your tool already exports a transparent PNG, the script
   keeps that transparency instead of looking for white.

   If the items don't sit in a neat grid (2 in the first row, then 4, then 3…),
   use `auto` instead of the column and row counts:
   ```
   python3 tools/process_assets.py assets/raw/barn_sheet_v4.webp out auto 256
   ```
   It finds every item wherever it is and numbers them row by row, left to right.
   Sparkles stay with their item, and a soft glow can't join two items together. Use `1 1` for a single image, `256` for items and `512` for
   buildings and characters. Backgrounds don't need this step; resize them to
   1080×1920.
4. **Register it** in `assets.js` and look at it in the game. Check items next to
   the tiers above and below them, and buildings on the map next to their neighbours.

Use fixed file names (`assets/items/barn/04_piglet.png`), not the generator's
timestamped names, so the manifest stays readable.

**When it's worth paying for something more:** after you have about 20 approved
assets, a tool that trains a custom model on them (for example Scenario) will
keep the remaining ~80 consistent with less work. Tools that output transparent
PNGs directly (OpenAI's image API, Recraft) let you skip step 3. Check that your
generator's terms allow commercial use, since the game will run ads and ship to app stores.

## 4. Prompt templates by asset type

Each prompt is: the style block + the line below + the subject.

### Merge items (`assets/items/<board>/<tier>_<name>.png`, 256px)

> A single {subject}, filling most of the frame, round chunky silhouette, facing the viewer.

- Each tier must be easy to tell from the one below it **by its outline alone**.
  As tiers go up, make the subject bigger, more detailed and more saturated.
  Give tiers 9–11 gold trim and sparkles so they feel like rare prizes.
- Generate a whole chain in one session, in order, attaching the previous tier as a reference.
- Tier names come from `NAMES` in `game.js`. Some names are abstract and need a
  concrete subject in the prompt:
  - *Compost* → a small heap of dark crumbly compost with a sprout on top
  - *Rich Soil* → a clay pot full of dark rich soil
  - *Infinite Hay* → a glowing hay bale with an infinity ribbon
  - *Starlight Mulch* → a purple crystal sack of fertilizer
  - *Tree of Life* → a tiny glowing tree in a pot
- Tier 0 is the input item made by the corner tile, such as the Feed in the Barn.
  Keep it small and plain.

### Special items (`assets/items/special/*.png`, 256px)

Coins, gems, energy, XP stars, Time Skips, Time Chargers, Unlimited Energy,
chests and the Piggy Bank. They're the same on every board, so each needs one set.
List them under `special` in `assets.js`, indexed by level. Each level should look
fuller or bigger than the one before: a single coin, then a small stack, then a
pile, and so on.

> A single {subject}, filling most of the frame, round chunky silhouette, facing the viewer.

- Coins: 1 gold coin → 2 coins → small stack → tall stack → pile → overflowing pot (6 levels)
- Gems: 1 blue gem → 2 gems → 3 gems → gem cluster (4 levels)
- Energy: a yellow lightning bolt in a bubble, bigger and brighter each level (5 levels)
- XP stars: a golden star, bigger and more sparkly each level (5 levels)
- Chests: a wooden brown chest, a fancy blue chest with gold trim, a gold coin chest, a green energy chest
- Piggy Bank: a pink piggy bank, getting rounder and shinier each level (4 levels)

### Map buildings and town buildings (`assets/buildings/*.png`, `assets/town/*.png`, 512px)

> A single {building}, seen from the front with a slight top-down angle, whole
> building visible including its base, isolated.

Use the same camera angle for all 13 so they look right side by side.
Buildings: barn with silo, crop field patch, hay field with round bales,
compost bin yard, fish pond, flower garden with arch, market storefront with a
striped awning, distant town with a clock tower, town hall with columns,
carpenter's log cabin, ranch house with a fence, fish shop, flower shop.

### Characters (`assets/characters/*.png`, 512px)

> A full-body chibi {character}, head about one third of total height, standing,
> facing the viewer, arms at sides, friendly smile.

Give every character the same height and head size. The town scene places them
all at the same scale.

### Backgrounds (`assets/scenes/*.png`, 1080×1920, no clean-up step)

> Top-down view of {scene}, portrait 9:16, cozy farm game background, same flat
> outlined style with thinner outlines, **open empty areas with no buildings**,
> no characters, no text.

**Don't generate a map with the buildings already in it.** Buildings must be
separate sprites, because each one is a button and can show as locked or for
sale. Generate the empty land, then adjust the x/y/w numbers in `MAP_LAYOUT`,
`MARKET_LAYOUT` and each NPC's `building`/`spot` in `game.js` until the sprites
sit on the clearings.

- **map**: meadow with a dirt road winding from the bottom up to the top right, trees and fences around the edges
- **town**: cobblestone square with a fountain in the middle, sky and hills at the top
- **market**: inside a wooden shop with two empty shelves on the back wall (the counter is a separate prop)

## 5. Order of work

1. Barn chain tiers 0–11, so the first board players see is fully drawn.
   Regenerate the piglet, pig and calf in the sticker style.
2. Map buildings and the map background, the first screen players see.
3. Town characters, buildings and background.
4. Market background, counter, deed and guide book.
5. The other five chains, each when its area is ready to play.

## 7. Prompts for what's still missing

The plots and their props use a different look from the board items above: painted, isometric, on flat
magenta. Generate each one with the reference images listed, check it against them, then save it in
`assets/raw/plots/` (plots) or as a sheet for the props, and run the steps in ASSET_LIST.md (12b).

### Plots (14)

Attach `assets/raw/plots/barnyard.webp` and `assets/raw/plots/fieldgate.webp`. Start every prompt with:

> Isometric diorama game tile in exactly the same style, camera angle and scale as the attached plots: one
> square plot of land seen corner-on from above (2:1 isometric), filling the width of the picture, with a thin
> grass-and-soil edge. Cozy hand-painted farm-game look, soft daylight from the top left, warm saturated colours,
> crisp detail. Everything on it clean, tidy and fully restored. Wide open dirt or stone paths a person can walk
> along, entering at the left corner and leaving at the right corner, and a few open patches of bare ground with
> nothing on them. Nothing tall along the two front edges. No people. Flat solid magenta background (#F509F1)
> all round, no shadow on the background, no text, no border. Wide picture, about 1344 × 816.

Then add the plot's own line:

- **Strawberry Rows** (`berryrows`): raised wooden beds in neat rows full of strawberry plants with ripe red
  berries, golden straw between the plants and along the paths, a white berry stand with a red-and-white striped
  awning and baskets of strawberries, a blue water barrel on a stand, green netting on hoops over two beds, a small
  glass cold frame, a low hedge along the back. Strawberry red, fresh green and straw gold (not the Field Gate's
  brown soil rows).
- **Orchard** (`orchard`): a grassy orchard with five round apple trees full of red apples and one pear tree with
  yellow pears, a low dry-stone wall along the back with a small wooden gate, a big tree with a rope-and-plank
  swing, three white wooden beehives on a stand, wooden crates of apples, a tree-stump table with two log stools,
  a ladder leaning on a tree, a patch of short grass for a picnic. Apple red, leaf green, warm grey stone.
- **Meadow** (`meadow`): an open hay meadow of tall golden-green grass with wildflowers and a mown path through it,
  a small wooden pen with four fluffy white sheep, a cheerful scarecrow in a blue shirt, two small vegetable beds
  behind a low rail fence, a wooden hay rack full of hay, a stone water trough, a bench by the path, a hedgerow
  with a wooden meadow gate. Gold and pale green.
- **Stables** (`stables`): a long red-brown timber stable with three stall half-doors (two brown horses and a grey
  pony looking out) and a hay-loft door above, a paddock with a white rail fence and soft sand, a stone mounting
  block, a wooden tack rack with two saddles, a water trough with a green hand pump, hay nets on the wall, a shade
  tree, a cobbled yard in front. Barn red-brown, white fence, sand.
- **Windmill** (`windmill`): a tall round windmill of white-washed stone with a dark wooden cap and four big lattice
  sails with cream cloth, standing at the back so the sails don't cover the plot; a small bakery lean-to with a
  striped awning, a packed-dirt cart track with a wooden cart of white flour sacks, lavender along the path, red
  flower boxes under the windows, a rooster weather vane on top, a bench by the door. White stone, cream, lavender.
- **Leaf Piles** (`leafpiles`): an autumn woodland corner under orange, red and yellow trees, leaf heaps raked into
  round wire leaf cages, a bark path with flat stepping stones, a wooden potting bench with clay pots, a clean green
  wheelbarrow, ferns under the trees, a bug hotel, wind chimes on a branch, autumn flowers in planters. Pumpkin
  orange, rust red, golden yellow.
- **Compost Bins** (`compostbins`): a tidy compost yard with three wooden slatted compost bays with lids and dark
  compost, a small tool shed with a wall of neatly hung garden tools, a potting table with seedling trays, a worm
  tower, a soil sieve, stacked terracotta pots, full sacks of compost, a herb garden in raised pots, gravel paths.
  Rich dark brown, herb green, terracotta.
- **Mushroom Corner** (`mushrooms`): a shady mossy forest glade with tall dark-green trees and low branches, mossy
  logs covered in brown and orange mushrooms, one giant red-and-white spotted toadstool, ferns and bluebells, a
  little stream with mossy stepping stones, a woven willow arch, a round wooden hedgehog house, a tiny fairy door in
  a tree root, warm lanterns and fairy lights in the branches. Deep green, bluebell purple, warm glow.
- **Muddy Shore** (`muddyshore`): the pond's wild edge; the back third of the plot is calm pond water, with a
  pebbly shore, clumps of reeds and cattails, mossy rocks, a short wooden jetty, an upturned green canoe, a fishing
  stool with a rod and a bucket, two frogs on a floating log, a small wooden bird hide, a red-and-white life ring on
  a post, a wooden fishing sign. Muddy green-brown, reed gold, blue water.
- **Lily Pond** (`lilypond`): an ornamental pond filling the middle of the plot, clear blue water with pink lotus
  flowers and lily pads, orange-and-white koi and goldfish, neat stone edges, an arched grey stone bridge with red
  paper lanterns, a weeping willow with a swing, a stepping-stone path over the grass, a little white duck house on
  the water, a small stone fountain, a bench, purple irises. Clear blue, lotus pink, lantern red (cleaner and
  brighter than the Muddy Shore).
- **Boat Dock** (`boatdock`): the back half is open water; a long wooden plank dock with lamp posts runs into it, a
  blue-grey boathouse on stilts with a white door, a small blue rowboat and a white sailboat tied up, a rack with
  two canoes, coiled ropes and an anchor on the dock, a flag pole with bright pennants, a tall harbour lamp at the
  end. Sea blue, grey-blue wood, white sails.
- **Garden Gate** (`gardengate`): a front garden behind a white picket fence with an open arched wooden gate, a
  gravel path, flower beds of daisies and red and yellow tulips, a white beehive, a stone bird bath, a trellis of
  pink sweet peas, a welcome bench, a red letterbox, a green watering can, pots of herbs, trimmed hedges. White
  fence, tulip red and yellow, fresh green.
- **Rose Arch** (`rosearch`): a formal rose garden with red-brick paths, a big wooden arch covered in climbing red
  and pink roses, a round stone fountain with water in the middle on a mosaic of coloured tiles, rose bushes in red,
  pink and white, low box hedges in a small maze, a white love-seat bench, white lilies. Rose pink, brick orange,
  dark hedge green.
- **Greenhouse** (`greenhouse`): a large Victorian glasshouse with a white frame and open double doors, potting
  tables of orchids, seedlings and ferns and hanging flower baskets inside; outside, raised beds, a lemon tree in a
  big pot, a group of cacti, a giant sunflower, a green water butt, shelves of pots. Glass blue-white, orchid
  purple, lemon yellow.

### Plot props (10 sheets of 8)

Attach `assets/raw/plots/props_outdoor_mess.webp` and `assets/raw/plots/props_broken1.webp`. Start every prompt with:

> A sheet of 8 separate game props in exactly the same style as the attached prop sheets: 4 across and 2 down,
> well spaced, none touching, each seen from the same isometric three-quarter view from above, cozy hand-painted
> farm-game look, soft light from the top left, each with its own colours and outline so no two look alike. Flat
> solid magenta background (#F509F1), no ground shadows, no text, no people. In this order:

Then the sheet's eight, left to right, top row first:

1. **Crop Field mess**: an empty dug-over soil bed in a wooden frame; drooping brown-yellow wilted strawberry
   plants; a split wooden water barrel with its hoops fallen off; a knotted heap of green garden netting; a fresh
   molehill of dark soil with a hole; a scatter of brown rotten apples; tumbled grey stones from a dry-stone wall;
   a tipped-over white beehive with its lid off.
2. **Crop Field more**: a collapsed wooden berry stand with a torn red-and-white awning; a fallen wooden swing seat
   with a snapped rope; two tipped-over empty wicker baskets; a young apple tree tied to a stake; a red-and-white
   checked picnic blanket with a wicker hamper; a little red cart full of strawberry punnets; a blue bird box on a
   pole; a wooden crate of apple-juice bottles.
3. **Hay Field mess**: a pile of rusty old horseshoes; a deep brown mud hole; a stable half-door off its hinges
   lying flat; a broken windmill sail frame with torn cloth; burst white flour sacks with flour spilled; chunks of
   white-washed stone fallen from a wall; a messy heap of old grey hay; a very overgrown round shaggy sheep.
4. **Hay Field new**: a neat stack of square golden hay bales; a brown leather saddle on a wooden stand; a freshly
   shorn slim happy sheep; a window box of red geraniums; a rooster weather vane on a pole; a wooden V-shaped hay
   rack full of hay; three stone mounting steps; a little wooden name board on a post.
5. **Compost Yard mess**: a big messy heap of orange, red and yellow leaves; a pile of snapped wooden rakes; a
   trowel, a fork and shears lying in the dirt; a heap of mossy rotting logs; a knot of thick tangled roots; a
   collapsed compost bin of loose slats; a tipped wheelbarrow spilling soggy leaves; a pile of cracked terracotta pots.
6. **Compost Yard new**: a round wire cage full of leaves; a small wooden bug hotel of bamboo tubes and pinecones;
   a potting bench with clay pots; a giant red-and-white spotted toadstool; a log covered in brown and orange
   mushrooms; a tiny round green fairy door in a stump; silver wind chimes on a hooked pole; a round wooden
   hedgehog house with a little doorway.
7. **Fish Pond mess** (on a small patch of water where it floats): a pile of old bottles and rusty cans; a clump of
   floating driftwood sticks; a slimy bright-green algae patch; brown dead lily pads; a tangled brown fishing net
   with red floats; a half-sunken wooden rowboat, only its bow above the water; a wooden dock sign fallen face down;
   a gap of broken dock planks.
8. **Fish Pond new**: two green frogs on a floating log; a little stool with a fishing rod and a tin bucket; pink
   lotus flowers on lily pads; three orange-and-white koi just under the water; two red paper lanterns on a wooden
   post; a red-and-white life ring on a post; a small blue wooden rowboat with oars; a little white floating duck house.
9. **Flower Garden mess**: bare brown dead rose stems; a cracked, dry stone fountain basin; a pile of broken
   greenhouse glass panes; a snapped wooden rose arch lying on the ground; a bed of dried-out brown flowers; a
   fallen wooden trellis panel; two tipped-over green watering cans; a split wooden planter spilling soil.
10. **Flower Garden new**: a white wooden beehive with a few bees; a stone bird bath with a bluebird; a hanging
    basket of pink flowers on an iron stand; three clay pots of herbs; a giant sunflower taller than a person; a
    small lemon tree in a big blue pot; two pots of purple orchids; a white curly metal love-seat bench.

The props' names, in the same order, are in ASSET_LIST.md (12b, Plot props still to make).
