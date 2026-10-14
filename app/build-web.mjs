// Copies the game into www/ for the app: the page, its code and only the
// pictures and sounds it uses (not the raw art sheets), so the app stays small.
import fs from 'fs';
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

['index.html', 'game.js', 'assets.js', 'manifest.json'].forEach(copy);

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
let bytes = 0;
for (const p of paths) {
    if (!fs.existsSync(path.join(root, p))) { console.warn('missing', p); continue; }
    copy(p);
    bytes += fs.statSync(path.join(root, p)).size;
}
console.log(`www: ${paths.size} pictures and sounds, ${(bytes / 1e6).toFixed(1)} MB`);
