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
  - *Dust* → a small grey dust bunny
  - *Ash* → a little pile of grey ash with an ember
  - *Infinite Hay* → a glowing hay bale with an infinity ribbon
  - *Iridium Fert* → a purple crystal sack of fertilizer
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
