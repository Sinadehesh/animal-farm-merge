# Notes for Claude

- `ASSET_LIST.md` lists every picture the game uses or has a slot for, with its status. Whenever a change adds,
  removes or renames an asset slot (in `assets.js` or a chain/producer name in `game.js`), or a new picture is
  added, update `ASSET_LIST.md` in the same commit.
- Browsers keep the site's files for 10 minutes. When shipping, bump the `?v=` number on the `assets.js` and
  `game.js` script tags in `index.html` (e.g. `date +%Y%m%d%H%M`), and give a picture a new file name when its
  content changes, so players get the new version straight away.
