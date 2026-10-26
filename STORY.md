# The Lost Golden Bell: story bible

The game's story lives in `game.js` (the opening, `CHAPTERS`, `STORY_BEATS`, `LAND_STORY`, `STORY_END`, `CLUES`,
`SUSPECTS`, `GOSSIP`, Marigold's lines). Keep every line at a 2nd–3rd grade reading level: short sentences, easy words.

## The hook

For a hundred years the Golden Bell rang over Sunnyvale every night to call everyone home. The night of the storm it
vanished, and the families left. They say they'll come back when it rings again. Mr. Grimsby of Grimsby Land Co. wants
the whole valley for a parking lot, and the bell for its gold. He has until the Harvest Festival.

## The truth (what really happened)

Marigold, the shopkeeper, is the town's secret Bell Keeper, like her red-haired grandma before her. The night of the
storm, Grimsby came for the bell (the Mayor had let him into the tower). Marigold hid it in a secret room at the top of
the tower and ran, dropping its silver key in the hen house. Grimsby watched her shop day and night, so she couldn't tell
anyone. She tore up a map, hid the pieces where only someone fixing the farm would find them, and left notes for the one
person Grimsby didn't know: the new farmer.

## The cast and their voices

Their art is in the Drive folder "characters for merge keeper" (see ASSET_LIST.md, 4). In the code the townsfolk
keep the first cast's ids (saves and story lines use them): `ruby` is Ellis, `hattie` Bram, `finn` Mira, `poppy` Mae.

| Who | Look | Voice | Wants / arc |
|---|---|---|---|
| Clara Everhart (you, the new farmer) | blonde braid with a red bow, red vest, green trousers, toolbox, blueprints, an old key | (you don't speak) | fixes the farm, follows the notes |
| Mayor Bramble | dark curly hair, green vest, red tie, pocket watch, a pile of letters, always a cup of tea | grand, a bit vain: "Splendid!", "My dear farmer" | hides his guilt (he let Grimsby in), confesses, makes it right |
| Ellis Spokewell (carpenter) | brown hair, blue shirt, leather apron full of tools | blunt, quick, teasing: "Boom!", calls you "newbie", later "boss" | trusts nobody at first, learns to trust |
| Bram Goodbarrel (rancher) | big and bearded, red plaid shirt, braces, hammer on his belt | loud and warm: "Howdy, partner!", "Yee-haw!" | reads his animals like clues |
| Mira Quayle (fisher) | long black hair, striped shirt, mustard vest, a compass and a coil of rope | calm, jokey, fish puns, tells old stories | the keeper of the legend |
| Mae Bloombarrow (florist) | small, red curls, pink headscarf, flowery apron, watering can, rain boots | dreamy, kind, notices small things (smells cinnamon) | talks to plants |
| Marigold (shopkeeper) | red hair, green dress, apron | sweet, chatty, "dear", "Hee hee!" | the Friend; slips once ("silver" key) |
| Mr. Grimsby | never seen: grey coat, city shoes, black car | grey typed letters, cold and pushy | wants the land and the gold; leaves, "But I'll be back!" |

## Fair-play clues (all point to Marigold)

Green wax seals (she sells "candles, green wax and string"), little gold lanterns ("two for a coin" at her shop),
cinnamon on the notes (her cinnamon buns), small boots with flour, the red-haired Keeper in Mira's story, and her slip
at the Market after the key turns up: "Keep that silver key safe" (nobody told her it was silver).

## Red herrings, each cleared

| Suspect | Why | Cleared |
|---|---|---|
| Mira | a lantern by the fence at night | her lantern is big and green (aqua1) |
| Mayor | sweats about the footprints | confesses he let Grimsby in (farm28) |
| Mae | tiniest feet, out at midnight | her boots have flowers, not flour (town5) |
| Ellis | the bell's rope is in his shed | he found it in the river, to fix it (town6) |

## Chapters (each opens on a cliffhanger)

1. **A Note in the Planks** (Barnyard): the first note, the night lantern, two sets of footprints, Grimsby's first letter.
2. **The Silver Key** (Hen House, Storeroom): the hens scream at night; the key in the nest; map piece; note 2 warns of the grey coat.
3. **The Big Wheel** (fields, Hay Field): Grimsby's car watches; Mae smells cinnamon; the Mayor confesses; the windmill's note sends you to Mira; the car follows the Friend's lantern into town.
4. **Fog Over Town** (town, Compost Yard, Fish Pond): first guess; Ellis's rope; Mira's legend and alibi; note 4; the map shows an X on the tower.
5. **The Golden Bell** (town, Flower Garden): Grimsby's deadline; last guess; the reveal in the tower; the bell rings and the families come home; the carving inside the bell teases **the Silver Bell** (season 2).

## What keeps players coming back

- Cliffhangers at every chapter start and a 🔍 on every job that hides a clue.
- The case file in the job list: clues found, suspects with notes, your guess, and where the next clue hides.
- Two "Who is the Friend?" guesses; a right guess pays 💎25 at the reveal.
- Small choices in scenes, each with its own reply.
- "The story so far" when you come back after 8 hours.
- A line of town talk on the daily gift card, from the chapter you're in.
- Grimsby's letters raise the stakes as you get closer.
