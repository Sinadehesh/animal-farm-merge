// Copies the game into www/ for the app: the page, its code and only the
// pictures and sounds it uses (not the raw art sheets), with the pictures
// turned into WebP, so the app stays small. The website keeps the originals.
import fs from 'fs';
import sharp from 'sharp';
import path from 'path';
import vm from 'vm';

const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(import.meta.dirname, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const copy = rel => {
    const to = path.join(out, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(root, rel), to);
};

['index.html', 'game.js', 'assets.js', 'manifest.json', 'vendor/pixi.min.js'].forEach(copy);

// Every path the asset list names, plus any written straight into the page or code.
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets.js'), 'utf8') + '\nthis.ASSETS = ASSETS;', sandbox);
const paths = new Set();
(function walk(v) {
    if (typeof v === 'string') { if (v.startsWith('assets/')) paths.add(v); }
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
})(sandbox.ASSETS);
for (const file of ['index.html', 'game.js', 'manifest.json']) {
    for (const m of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/assets\/[\w\/@.-]+\.(?:png|jpe?g|webp|svg|mp3)/g)) paths.add(m[0]);
}
// Pictures become WebP but keep their file names: some paths are built while the
// game runs, and the app's browser recognises an image by its contents.
let before = 0, after = 0;
for (const p of paths) {
    const from = path.join(root, p);
    if (!fs.existsSync(from)) { console.warn('missing', p); continue; }
    before += fs.statSync(from).size;
    const picture = /\.(png|jpe?g)$/i.test(p) && !p.includes('app-icon') && !p.includes('apple-touch');
    if (!picture) { copy(p); after += fs.statSync(from).size; continue; }
    const to = path.join(out, p);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    await sharp(from).webp({ quality: 85, alphaQuality: 90, effort: 5 }).toFile(to);
    after += fs.statSync(to).size;
}
console.log(`www: ${paths.size} pictures and sounds, ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);
