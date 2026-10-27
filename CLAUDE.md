# Notes for Claude

- `ASSET_LIST.md` lists every picture the game uses or has a slot for, with its status. Whenever a change adds,
  removes or renames an asset slot (in `assets.js` or a chain/producer name in `game.js`), or a new picture is
  added, update `ASSET_LIST.md` in the same commit.
- Browsers keep the site's files for 10 minutes. When shipping, bump the `?v=` number on the `assets.js`,
  `monetize.js` and `game.js` script tags in `index.html` (e.g. `date +%Y%m%d%H%M`), and give a picture a new file name when its
  content changes, so players get the new version straight away.
- `sw.js` keeps pictures on players' devices for good (code and pages always come fresh from the network), so a
  changed picture must get a new file name or players keep seeing the old one.
- Every picture must be easy to tell apart at a glance: each item in a chain (and each level of a chest, producer
  or booster) gets its own distinct colour and silhouette, not just a bigger copy of the one before, and must not
  look like an item in another chain. Item names must not repeat across chains. Write image prompts this way.
- When a plot picture is added or changed, cut its soil edge off with `tools/decliff.py`, then brighten it with
  `tools/brighten.py`, add its `PLOT_SHAPE` to `tools/walkmask.py`, run `python3 tools/walkmask.py <preview_dir>`,
  check the pink previews (where the farmer may stand), and paste the printed `PLOT_WALK` table into `game.js`.
- Every map picture (plots, plot props, scenery, the ground) goes through `tools/brighten.py` once, as cut, so the
  map keeps one bright look and no pink fringe from the cut-out background. They live in `assets/map/`.
- Google Play: the developer account ($25), ID check and payments profile are done. Don't list them as to-dos again;
  the release steps that remain are in `app/README.md` (section 4).
- Scope: the owner asked to be stopped from scope creep. Before building any new feature, expanding scope or adding
  something not asked for (including ideas Claude suggests itself), run the `scope-gatekeeper` skill: pause, ask
  what the end goal is, whether this is needed for it, what happens without it and whether there's a simpler way,
  give an honest view, and wait for an explicit yes. Skip it only when told "skip the scope check". (The walking
  cast was scope creep, and was taken out.)
