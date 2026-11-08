// Raw 1080x1920 game screenshots for the Google Play listing (tools/make_store_screens.py frames them).
//   node tools/store_screenshots.mjs http://localhost:8765/ <raw_dir>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, url, out] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.clock.setSystemTime(new Date('2026-10-21T10:00:00')); // a Wednesday: no Fair
const ev = (f, a) => page.evaluate(f, a);
await page.goto(url + '?reset&nointro'); await page.waitForTimeout(800);
await ev(() => { if (!tutorial.done) endTutorial(); daily.lastDay = today(); guides.done = GUIDES.map(g => g.id); closeDialog(); });
await page.waitForTimeout(400);
const shot = async (name, f, wait = 900) => { await ev(f); await page.waitForTimeout(wait); await page.screenshot({ path: `${out}/${name}.png` }); };
await shot('note', () => { closeDialog(); playScene('📖 Chapter 1: A Note in the Planks', STORY_BEATS.barn1.slice(3)); });
await shot('board', () => {
  closeDialog(); goTo('barn');
  const lay = [null, null, null, 3, 3, 5, 0, 0, 1, 2, 2, 4, 1, 6, 4, 3, 0, 1];
  lay.forEach((t, i) => { if (t !== null) grids.barn[i] = { tier: t }; });
  refreshBoard('barn'); closeDialog();
});
await shot('case', () => { closeDialog(); goTo('map'); restoration.done.push('barn1', 'barn6', 'barn9', 'barn20'); story.guess = 'finn'; openTaskLog(); });
await shot('map', () => {
  closeDialog();
  for (const t of TASKS.filter(t => t.zone === 'barnyard').slice(0, 11)) if (!restoration.done.includes(t.id)) restoration.done.push(t.id);
  goTo('map'); closeDialog();
  heroToJob(openTasks().find(t => jobWorldXY(t))); // Clara at her next job, in the middle
}, 900);
await ev(() => heroEl().scrollIntoView({ block: 'center', inline: 'center' })); await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/map.png` });
await shot('letter', () => { closeDialog(); playScene('✉️', STORY_BEATS.barn10.slice(1)); });
// The town square on the map: the townsfolk at their doors, the Mayor saying hello.
await shot('town', () => {
  closeDialog(); goTo('map'); closeDialog();
  const v = document.querySelector('#scene-map .world-view'), st = v.querySelector('.world-stage'), [bx, by, bw, bh] = plotBox('town'), { x0, y0, w, h } = WORLD_BOX;
  v.scrollLeft = (bx + bw * 0.5 - x0) / w * st.offsetWidth - v.clientWidth / 2;
  v.scrollTop = (by + bh * 0.55 - y0) / h * st.offsetHeight + st.offsetTop - v.clientHeight / 2;
  v.dispatchEvent(new Event('scroll'));
}, 2500);
await browser.close();
