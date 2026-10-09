// --- MERGE FARMSTEAD ---
// The farm map, the town and the market are physical places: each building,
// person and shelf item is a sprite placed on a background that you tap.
// Image paths all come from assets.js so AI-generated art can replace the
// placeholders without touching this file.

const GAME_WIDTH = 6;
const GAME_HEIGHT = 8;
const NUM_CELLS = GAME_WIDTH * GAME_HEIGHT;

// --- ECONOMY ---
// Every number that sets the pace of the game is in this block.
//
// Essentials refill by themselves over time, up to a cap. A full bar lasts a
// short play session and takes 30-60 minutes to refill, so once the starting
// stock and the cheap early land are used up, players either come back later,
// watch an ad, or spend 💎 gems on a refill.

const ESSENTIALS = {
    feed:          { refillSeconds: 60,  cap: 40 },
    wheat:         { refillSeconds: 75,  cap: 40 },
    fertilizer:    { refillSeconds: 75,  cap: 40 },
    rawFertilizer: { refillSeconds: 90,  cap: 30 },
    water:         { refillSeconds: 120, cap: 25 },
};

// 💵 an order pays per unit of input that went into the item (tier n = 2^n units).
const ORDER_PAY = 10;

// Each merge gives this much of the board's output resource. Keep it at 1:
// the boards feed each other in a circle, and anything higher lets the circle
// produce more than it uses, which makes the refill timers pointless.
const MERGE_OUTPUT = 1;

// 💎 Gems are the only thing sold for real money, as in Merge Gardens. 💵 is
// earned by playing. Gems pay for instant refills and cover any 💵 you're short.
// A unit earns about 💵10 in orders and costs 💎2 = 💵20 to refill, so refills
// are for impatience, not profit.
const GEMS_PER_REFILL_UNIT = 2;
const COINS_PER_GEM = 10;
const LEVEL_UP_GEMS = 5; // a few free gems each time a townsperson levels up

// Rewarded ads: a free top-up when you run out, a few times a day.
const AD_REWARD_UNITS = 10;
const ADS_PER_DAY = 5;

// A generous first session. The starting gems pay for one refill, so players
// learn what gems are for before they run out of them.
const START = { money: 50, gems: 100, feed: 100 };

// The shop follows Merge Gardens' store: gem packs at the same names and price
// points, a 30-day Daily Basket and a one-time Special Offer. Merge Gardens
// doesn't publish its gem amounts, so these are ours. In the app stores the
// localized price comes from the store itself.
const GEM_PACKS = [
    { id: 'gems_pile',   name: 'Pile of Gems',   gems: 500,  price: '$4.99' },
    { id: 'gems_cask',   name: 'Cask of Gems',   gems: 1100, price: '$9.99',  tag: '+10%' },
    { id: 'gems_barrel', name: 'Barrel of Gems', gems: 2400, price: '$19.99', tag: '+20%' },
];
// Gems once a day for 30 days; a day you don't open the game is lost.
const DAILY_BASKET = { id: 'daily_basket', name: '30 Day Daily Basket', gemsPerDay: 25, days: 30, price: '$3.99' };
// One-time offer, shown the first time you run out. Also fills every bar.
const SPECIAL_OFFER = { id: 'special_offer', name: 'Special Offer', gems: 200, money: 1000, price: '$1.99' };

const RESOURCES = {
    money:         { emoji: '💵', name: 'Money' },
    gems:          { emoji: '💎', name: 'Gems' },
    hearts:        { emoji: '❤️', name: 'Hearts' },
    feed:          { emoji: '🌿', name: 'Feed' },
    wheat:         { emoji: '🌾', name: 'Wheat' },
    fertilizer:    { emoji: '✨', name: 'Fert' },
    rawFertilizer: { emoji: '💩', name: 'Raw Fert' },
    water:         { emoji: '💧', name: 'Water' },
    nectar:        { emoji: '🍯', name: 'Nectar' },
};

let unlocks = { barn: true, hay: false, farm: false, fert: false, aqua: false, flower: false };
let maxTier = 3;
const res = { money: 0, gems: 0, hearts: 0, feed: 0, wheat: 0, fertilizer: 0, rawFertilizer: 0, water: 0, nectar: 0 };
Object.assign(res, START);
// When the next unit of each essential arrives (ms timestamp), or null when full.
const refillAt = {};
// Daily Basket, Special Offer and ad state (saved with the game).
const shop = { basketStart: null, basketClaimed: null, offerBought: false, offerShown: false, adsDay: null, adsWatched: 0 };
let currentScene = 'map';

// UI Elements
const moneyEl = document.getElementById('money-val');
const gemsEl = document.getElementById('gems-val');
const resourcesEl = document.getElementById('resources');

const stageEl = document.getElementById('stage');
const titleEl = document.getElementById('scene-title');
const backBtn = document.getElementById('btn-back');
const dialogEl = document.getElementById('dialog');
const dialogArt = document.getElementById('dialog-art');
const dialogTitle = document.getElementById('dialog-title');
const dialogBody = document.getElementById('dialog-body');
const dialogActions = document.getElementById('dialog-actions');
const toastLayer = document.getElementById('toasts');

// Flavor Names for the Tiers
const NAMES = {
    'farm': ['💩 Fertilizer', '🌱 Seed', '🌿 Sprout', '🍓 Strawberry', '🍅 Tomato', '🌽 Corn', '🥕 Carrot', '🥬 Cabbage', '🎃 Pumpkin', '🍉 Watermelon', '🍎 Golden Apple', '🌻 Giant Sun'],
    'hay': ['🌾 Wheat', '🌱 Stalk', '🌾 Bundle', '🟨 Small Bale', '🟨 Medium Bale', '🟨 Large Bale', '🥞 Hay Stack', '🗼 Hay Tower', '🏭 Hay Silo', '⭐ Golden Hay', '✨ Magic Hay', '♾️ Infinite Hay'],
    'barn': ['🌿 Feed', '🥚 Egg', '🐤 Chick', '🐔 Chicken', '🐽 Piglet', '🐷 Pig', '🐮 Calf', '🐄 Cow', '🐴 Horse', '🦙 Alpaca', '🐂 Prize Bull', '🦄 Unicorn'],
    'fert': ['💩 Raw Fert', '💨 Dust', '🌑 Ash', '🦴 Scraps', '🍂 Compost', '💩 Manure', '✨ Basic Fert', '🌟 Quality Fert', '⚡ Speed-Gro', '💎 Deluxe Fert', '🔮 Magic Fert', '🌌 Iridium Fert'],
    'aqua': ['🌾 Fish Food', '🦠 Algae', '🦐 Plankton', '🦐 Shrimp', '🐟 Goldfish', '🐠 Clownfish', '🐢 Turtle', '🦑 Squid', '🐬 Dolphin', '🦈 Shark', '🐋 Whale Shark', '🐙 Kraken'],
    'flower': ['💧 Water Drop', '🌱 Seedling', '🌷 Bud', '🌼 Daisy', '🌷 Tulip', '🌹 Rose', '🌺 Lily', '🌸 Orchid', '🪷 Lotus', '🍄 Rafflesia', '💎 Crystal Flower', '🌳 Tree of Life']
};

function getHue(mode, tier) {
    if (mode === 'farm') return (tier * 15 + 120) % 360;
    else if (mode === 'hay') return (tier * 15 + 40) % 360;
    else if (mode === 'barn') return (tier * 15 + 0) % 360;
    else if (mode === 'fert') return (tier * 15 + 280) % 360;
    else if (mode === 'aqua') return (tier * 15 + 200) % 360;
    else if (mode === 'flower') return (tier * 15 + 320) % 360;
    return 0;
}

function itemSprite(mode, tier) {
    return (ASSETS.items[mode] || [])[tier] || null;
}

function itemEmoji(mode, tier) {
    return NAMES[mode][tier].split(' ')[0];
}

function itemName(mode, tier) {
    return NAMES[mode][tier].split(' ').slice(1).join(' ');
}

// Small inline picture of an item for bubbles and dialogs.
function itemIcon(mode, tier) {
    const sprite = itemSprite(mode, tier);
    return sprite
        ? `<img class="inline-item" src="${sprite}" alt="">`
        : `<span class="inline-item">${itemEmoji(mode, tier)}</span>`;
}

// Land on the farm map. `cost` is the price of its deed, `input` is what one tap
// of the board's corner tile spends, `output` is what each merge produces.
const AREAS = {
    barn:   { name: 'Barn',          cost: 0,    input: { feed: 1 },                  output: 'rawFertilizer', desc: 'Raise animals from feed.' },
    farm:   { name: 'Crop Field',    cost: 200,  input: { fertilizer: 1 },            output: 'wheat',         desc: 'Grow crops using fertilizer.' },
    hay:    { name: 'Hay Field',     cost: 400,  input: { wheat: 1 },                 output: 'feed',          desc: 'Harvest hay using wheat.' },
    fert:   { name: 'Compost Yard',  cost: 800,  input: { rawFertilizer: 1 },         output: 'fertilizer',    desc: 'Make your own fertilizer.' },
    aqua:   { name: 'Fish Pond',     cost: 2000, input: { wheat: 1 },                 output: 'water',         desc: 'Feed wheat to fish to generate water.' },
    flower: { name: 'Flower Garden', cost: 5000, input: { water: 1, fertilizer: 1 },  output: 'nectar',        desc: 'Use Water + Fert to grow Nectar.' },
};

// The corner tile on every board that spawns new tier-0 items.
const GENERATORS = {
    barn:   { emoji: '🧺', label: 'Feed Bin' },
    hay:    { emoji: '🌾', label: 'Wheat Sack' },
    farm:   { emoji: '✨', label: 'Fert Bag' },
    fert:   { emoji: '🪣', label: 'Muck Bucket' },
    aqua:   { emoji: '🥫', label: 'Fish Food' },
    flower: { emoji: '🚿', label: 'Watering Can' },
};

function resLabel(key) {
    return `${RESOURCES[key].emoji} ${RESOURCES[key].name}`;
}

// e.g. "💧1 ✨1"
function inputText(mode) {
    return Object.entries(AREAS[mode].input).map(([k, n]) => `${RESOURCES[k].emoji}${n}`).join(' ');
}

function usesText(mode) {
    return Object.keys(AREAS[mode].input).map(resLabel).join(' + ');
}

// Units of input that went into one item of this tier.
function inputsPerItem(mode, tier) {
    const perSpawn = Object.values(AREAS[mode].input).reduce((a, b) => a + b, 0);
    return 2 ** tier * perSpawn;
}

// --- ESSENTIALS OVER TIME ---

// A resource is in play once a board you own uses or makes it.
function isRelevant(key) {
    return Object.keys(AREAS).some(id => unlocks[id] && (AREAS[id].input[key] || AREAS[id].output === key));
}

function isRefilling(key) {
    return !!ESSENTIALS[key] && Object.keys(AREAS).some(id => unlocks[id] && AREAS[id].input[key]);
}

// Adds every unit that has arrived since the last tick, including time the game was closed.
function tickEssentials(now = Date.now()) {
    Object.keys(ESSENTIALS).forEach(key => {
        const { refillSeconds, cap } = ESSENTIALS[key];
        const ms = refillSeconds * 1000;
        if (!isRefilling(key) || res[key] >= cap) { refillAt[key] = null; return; }
        if (!refillAt[key]) { refillAt[key] = now + ms; return; }
        if (now < refillAt[key]) return;
        const arrived = Math.min(cap - res[key], Math.floor((now - refillAt[key]) / ms) + 1);
        res[key] += arrived;
        refillAt[key] = res[key] >= cap ? null : refillAt[key] + arrived * ms;
    });
}

function formatDuration(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function timeUntilFull(key) {
    const { refillSeconds, cap } = ESSENTIALS[key];
    if (res[key] >= cap || !refillAt[key]) return 0;
    return (refillAt[key] - Date.now()) + (cap - res[key] - 1) * refillSeconds * 1000;
}

function refillGems(key) {
    return Math.max(0, ESSENTIALS[key].cap - res[key]) * GEMS_PER_REFILL_UNIT;
}

// Takes gems if you have enough; otherwise sends you to the shop.
function spendGems(n) {
    if (res.gems < n) {
        openShop(`You need 💎 ${n - res.gems} more.`);
        return false;
    }
    res.gems -= n;
    return true;
}

// Calendar day number in the player's time zone.
function today() {
    const d = new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

function adsLeft() {
    if (shop.adsDay !== today()) { shop.adsDay = today(); shop.adsWatched = 0; }
    return ADS_PER_DAY - shop.adsWatched;
}

// Shown when you tap a resource in the HUD or run out while playing.
function openEssential(key, ranOut = false) {
    tickEssentials();
    // The first time anything runs out, show the one-time offer instead.
    if (ranOut && !shop.offerBought && !shop.offerShown) {
        shop.offerShown = true;
        openSpecialOffer(`Out of ${resLabel(key)}?`);
        return;
    }
    const { refillSeconds, cap } = ESSENTIALS[key];
    const full = res[key] >= cap;
    const gems = refillGems(key);
    const ads = adsLeft();
    const timing = full
        ? 'Full! It refills again once you use some.'
        : `+1 every ${formatDuration(refillSeconds * 1000)} · next in ${formatDuration(refillAt[key] - Date.now())} · full in ${formatDuration(timeUntilFull(key))}`;
    const actions = [{ label: `Fill up now · 💎 ${gems}`, primary: true, wide: true, onClick: () => refillEssential(key) }];
    if (ads > 0) {
        actions.push({ label: `Watch an ad · +${AD_REWARD_UNITS} (${ads} left today)`, wide: true, onClick: () => watchAdFor(key) });
    }
    actions.push({ label: 'Wait' });
    showDialog({
        title: ranOut ? `Out of ${resLabel(key)}` : resLabel(key),
        body: `<p class="big-count">${res[key]} / ${cap}</p><p class="hint">${timing}</p>`,
        actions: full ? [{ label: 'OK' }] : actions,
    });
}

function refillEssential(key) {
    if (!spendGems(refillGems(key))) return;
    res[key] = ESSENTIALS[key].cap;
    refillAt[key] = null;
    updateUI();
    toast(`${resLabel(key)} refilled!`, 'good');
}

function watchAdFor(key) {
    if (adsLeft() <= 0) return;
    showRewardedAd(() => {
        shop.adsWatched++;
        res[key] += AD_REWARD_UNITS;
        tickEssentials();
        updateUI();
        toast(`+${AD_REWARD_UNITS} ${resLabel(key)}`, 'good');
    });
}

// --- SHOP ---

function openShop(note = '') {
    const basketDays = basketDaysLeft();
    const actions = [];
    if (!shop.offerBought) {
        actions.push({
            label: `⭐ ${SPECIAL_OFFER.name}: 💎 ${SPECIAL_OFFER.gems} + 💵 ${SPECIAL_OFFER.money.toLocaleString()} + full bars · ${SPECIAL_OFFER.price}`,
            primary: true, wide: true, onClick: buySpecialOffer,
        });
    }
    GEM_PACKS.forEach(pack => actions.push({
        label: `${pack.name}: 💎 ${pack.gems.toLocaleString()}${pack.tag ? ` (${pack.tag})` : ''} · ${pack.price}`,
        primary: true, wide: true,
        onClick: () => purchase(pack.id, () => { res.gems += pack.gems; return `+💎 ${pack.gems.toLocaleString()}`; }),
    }));
    actions.push(basketDays > 0
        ? { label: `🧺 Daily Basket active · ${basketDeliveriesLeft()} more days`, wide: true, disabled: true }
        : { label: `🧺 ${DAILY_BASKET.name}: 💎 ${DAILY_BASKET.gemsPerDay} every day · ${DAILY_BASKET.price}`,
            primary: true, wide: true, onClick: buyDailyBasket });
    actions.push({ label: 'Close' });
    showDialog({
        title: 'Shop',
        body: `${note ? `<p><b>${note}</b></p>` : ''}
               <p>💎 Gems fill up your essentials instantly and cover any 💵 you're short.</p>
               <p class="hint">Test mode: no real payment is taken yet.</p>`,
        actions,
    });
}

function openSpecialOffer(title = SPECIAL_OFFER.name) {
    showDialog({
        title,
        body: `<p><b>One-time ${SPECIAL_OFFER.name}</b></p>
               <p>💎 ${SPECIAL_OFFER.gems} + 💵 ${SPECIAL_OFFER.money.toLocaleString()} and every essential filled up.</p>`,
        actions: [
            { label: `Get it for ${SPECIAL_OFFER.price}`, primary: true, wide: true, onClick: buySpecialOffer },
            { label: 'No thanks' },
        ],
    });
}

function buySpecialOffer() {
    if (shop.offerBought) return;
    purchase(SPECIAL_OFFER.id, () => {
        shop.offerBought = true;
        res.gems += SPECIAL_OFFER.gems;
        res.money += SPECIAL_OFFER.money;
        Object.keys(ESSENTIALS).forEach(k => {
            if (isRefilling(k)) { res[k] = Math.max(res[k], ESSENTIALS[k].cap); refillAt[k] = null; }
        });
        return `+💎 ${SPECIAL_OFFER.gems} +💵 ${SPECIAL_OFFER.money.toLocaleString()}`;
    });
}

// Days of the basket left, counting today.
function basketDaysLeft() {
    if (shop.basketStart === null) return 0;
    return Math.max(0, shop.basketStart + DAILY_BASKET.days - today());
}

// Deliveries still to come after today's (if today's is already claimed).
function basketDeliveriesLeft() {
    return basketDaysLeft() - (shop.basketClaimed === today() ? 1 : 0);
}

function buyDailyBasket() {
    if (basketDaysLeft() > 0) return;
    purchase(DAILY_BASKET.id, () => {
        shop.basketStart = today();
        shop.basketClaimed = null;
        claimDailyBasket();
        return `${DAILY_BASKET.name} started`;
    });
}

// Runs on start-up and every tick; gives today's gems once.
function claimDailyBasket() {
    if (basketDaysLeft() <= 0 || shop.basketClaimed === today()) return;
    shop.basketClaimed = today();
    res.gems += DAILY_BASKET.gemsPerDay;
    updateUI();
    toast(`🧺 Daily Basket: +💎 ${DAILY_BASKET.gemsPerDay} (${basketDeliveriesLeft()} more days)`, 'good');
}

// Real payments need the app-store billing plugin once the game is packaged
// with Capacitor (Google Play Billing / Apple In-App Purchase): call the store
// with productId and run grant() only after the store confirms. Until then this
// grants straight away so the flow can be tested.
function purchase(productId, grant) {
    const message = grant();
    updateUI();
    saveGame();
    toast(`${message} (test purchase)`, 'good');
    goTo(currentScene);
}

// Real ads need an ad SDK (for example AdMob) once the game is packaged; call
// onReward() only when the ad network reports the video was watched.
function showRewardedAd(onReward) {
    toast('(test ad)');
    onReward();
}

// --- SCENE LAYOUTS ---
// Positions are percentages of the 9:16 stage: x/y = top-left corner, w = width.
// Height follows the sprite's own aspect ratio.

const MAP_LAYOUT = {
    town:   { x: 50, y: 1,  w: 48 },
    market: { x: 3,  y: 5,  w: 44 },
    barn:   { x: 50, y: 24, w: 47 },
    farm:   { x: 2,  y: 31, w: 46 },
    hay:    { x: 52, y: 49, w: 45 },
    fert:   { x: 3,  y: 55, w: 36 },
    aqua:   { x: 33, y: 72, w: 40 },
    flower: { x: 70, y: 70, w: 29 },
};

const MARKET_LAYOUT = {
    shelf: [
        { x: 7,  y: 17, w: 24 }, { x: 38, y: 17, w: 24 }, { x: 69, y: 17, w: 24 },
        { x: 7,  y: 36, w: 24 }, { x: 38, y: 36, w: 24 }, { x: 69, y: 36, w: 24 },
    ],
    shopkeeper: { x: 36, y: 50, w: 28 },
    counter:    { x: 2,  y: 64, w: 96 },
    upgrade:    { x: 9,  y: 58, w: 22 },
};

const SHOPKEEPER_LINES = [
    'Welcome in! Land deeds are on the shelves. New land means new things to merge.',
    'Townsfolk pay well for what you raise. Check the Town Square often!',
    'That Growth Guide on the counter lets everything grow one size bigger.',
];
let shopkeeperLine = 0;

// --- SCENE HELPERS ---

// A sprite placed on a scene. With onClick it's a button, otherwise decoration.
function makeSpot({ x, y, w, z, sprite, alt = '', label, onClick, locked = false }) {
    const el = document.createElement(onClick ? 'button' : 'div');
    el.className = 'spot' + (locked ? ' locked' : '');
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.width = w + '%';
    el.style.zIndex = z !== undefined ? z : Math.round(y); // lower on screen = in front

    const img = document.createElement('img');
    img.src = sprite;
    img.alt = label || alt;
    img.draggable = false;
    el.appendChild(img);

    if (label) {
        const plate = document.createElement('span');
        plate.className = 'spot-label';
        plate.textContent = label;
        el.appendChild(plate);
    }
    if (onClick) el.addEventListener('click', onClick);
    return el;
}

function addTag(el, className, html) {
    const tag = document.createElement('span');
    tag.className = className;
    tag.innerHTML = html;
    el.appendChild(tag);
    return tag;
}

function showDialog({ art, artRound = false, title, body, actions }) {
    dialogArt.hidden = !art;
    if (art) dialogArt.src = art;
    dialogArt.classList.toggle('round', artRound);
    dialogTitle.textContent = title;
    dialogBody.innerHTML = body;
    dialogActions.innerHTML = '';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'btn' + (action.primary ? ' btn-primary' : '') + (action.wide ? ' btn-wide' : '');
        btn.textContent = action.label;
        btn.disabled = !!action.disabled;
        btn.addEventListener('click', () => {
            closeDialog();
            if (action.onClick) action.onClick();
        });
        dialogActions.appendChild(btn);
    });
    dialogEl.hidden = false;
}

function closeDialog() {
    dialogEl.hidden = true;
}

dialogEl.addEventListener('click', e => { if (e.target === dialogEl) closeDialog(); });

function toast(message, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = message;
    toastLayer.appendChild(el);
    while (toastLayer.children.length > 3) toastLayer.firstChild.remove();
    setTimeout(() => el.remove(), 2600);
}

// A "Buy" dialog button that explains the shortfall instead of failing silently.
// A "Buy" dialog button. When 💵 is short, gems cover the rest.
function buyAction(cost, onBuy, label = `Buy for 💵 ${cost.toLocaleString()}`) {
    const short = cost - res.money;
    if (short <= 0) return { label, primary: true, onClick: onBuy };
    const gems = Math.ceil(short / COINS_PER_GEM);
    return {
        label: res.money > 0 ? `Buy for 💵 ${res.money.toLocaleString()} + 💎 ${gems}` : `Buy for 💎 ${gems}`,
        primary: true,
        onClick: () => {
            if (!spendGems(gems)) return;
            res.money += gems * COINS_PER_GEM;
            onBuy();
        },
    };
}

// --- NAVIGATION ---

function goTo(scene) {
    currentScene = scene;
    closeDialog();
    document.querySelectorAll('.scene').forEach(el => { el.hidden = el.id !== `scene-${scene}`; });
    backBtn.hidden = scene === 'map';

    if (scene === 'map') { titleEl.textContent = 'Farmstead'; renderMap(); }
    else if (scene === 'town') { titleEl.textContent = 'Town Square'; renderTown(); }
    else if (scene === 'market') { titleEl.textContent = 'Market'; renderMarket(); }
    else { titleEl.textContent = AREAS[scene].name; renderBoardHeader(scene); renderGrid(scene); }
}

backBtn.addEventListener('click', () => goTo('map'));

// --- FARM MAP ---

function renderMap() {
    const scene = document.getElementById('scene-map');
    scene.innerHTML = '';

    const town = makeSpot({ ...MAP_LAYOUT.town, sprite: ASSETS.buildings.town, label: 'Town', onClick: () => goTo('town') });
    const readyCount = npcs.filter(canFulfill).length;
    if (readyCount > 0) addTag(town, 'badge', readyCount);
    scene.appendChild(town);

    scene.appendChild(makeSpot({ ...MAP_LAYOUT.market, sprite: ASSETS.buildings.market, label: 'Market', onClick: () => goTo('market') }));

    Object.keys(AREAS).forEach(id => {
        const area = AREAS[id];
        const spot = makeSpot({
            ...MAP_LAYOUT[id],
            sprite: ASSETS.buildings[id],
            label: area.name,
            locked: !unlocks[id],
            onClick: () => unlocks[id] ? goTo(id) : offerDeed(id),
        });
        if (!unlocks[id]) addTag(spot, 'sale-sign', `FOR SALE<br>💵 ${area.cost}`);
        scene.appendChild(spot);
    });
}

function offerDeed(id) {
    const area = AREAS[id];
    showDialog({
        art: ASSETS.buildings[id],
        title: `${area.name} is for sale`,
        body: `<p>${area.desc}</p><p class="hint">Uses ${usesText(id)} · merging makes ${resLabel(area.output)}</p>`,
        actions: [buyAction(area.cost, () => buyDeed(id)), { label: 'Not now' }],
    });
}

function buyDeed(id) {
    const area = AREAS[id];
    if (unlocks[id] || res.money < area.cost) return;
    res.money -= area.cost;
    unlocks[id] = true;
    // New land comes with a full bar of what it uses, so it's playable right away.
    Object.keys(area.input).forEach(k => { res[k] = Math.max(res[k], ESSENTIALS[k].cap); });
    updateUI();
    toast(`The ${area.name} is yours! Find it on the map.`, 'good');
    goTo(currentScene);
}

// --- TOWNSFOLK SYSTEM ---
// Each NPC lives in a building on the town square and stands in front of it.
const npcs = [
    { id: 'mayor',  name: 'Mayor Pelican', pref: ['farm', 'fert'], deliveries: 0, request: null,
      home: 'townhall',   building: { x: 27, y: 2,  w: 46 }, spot: { x: 41, y: 28, w: 18 } },
    { id: 'robin',  name: 'Robin',         pref: ['hay'],          deliveries: 0, request: null,
      home: 'carpenter',  building: { x: 1,  y: 21, w: 34 }, spot: { x: 8,  y: 42, w: 17 } },
    { id: 'marnie', name: 'Marnie',        pref: ['barn'],         deliveries: 0, request: null,
      home: 'ranch',      building: { x: 65, y: 21, w: 34 }, spot: { x: 75, y: 42, w: 17 } },
    { id: 'willy',  name: 'Willy',         pref: ['aqua'],         deliveries: 0, request: null,
      home: 'fishshop',   building: { x: 1,  y: 58, w: 36 }, spot: { x: 11, y: 79, w: 17 } },
    { id: 'sandy',  name: 'Sandy',         pref: ['flower'],       deliveries: 0, request: null,
      home: 'flowershop', building: { x: 63, y: 58, w: 36 }, spot: { x: 72, y: 79, w: 17 } },
];

function generateRequestFor(npc) {
    let availableModes = npc.pref.filter(m => unlocks[m]);
    if (availableModes.length === 0) {
        availableModes = Object.keys(unlocks).filter(k => unlocks[k]);
    }
    const mode = availableModes[Math.floor(Math.random() * availableModes.length)];
    const targetTier = Math.floor(Math.random() * maxTier) + 1;

    npc.request = {
        mode: mode,
        tier: targetTier,
        rewardMoney: Math.round(ORDER_PAY * inputsPerItem(mode, targetTier) * (0.85 + Math.random() * 0.3)),
        rewardHearts: targetTier
    };
}

function initTown() {
    npcs.forEach(npc => generateRequestFor(npc));
}

function findItem(mode, tier) {
    return grids[mode].findIndex(item => item !== null && item.type !== 'shop' && item.tier === tier);
}

function canFulfill(npc) {
    return !!npc.request && findItem(npc.request.mode, npc.request.tier) !== -1;
}

// The portrait if there is one, otherwise the full-body drawing (framed the same way).
function npcPicture(npc) {
    return ASSETS.portraits[npc.id] || ASSETS.characters[npc.id];
}

function renderTown() {
    const scene = document.getElementById('scene-town');
    scene.innerHTML = '';
    npcs.forEach(npc => {
        const talk = () => openNpc(npc);
        scene.appendChild(makeSpot({ ...npc.building, sprite: ASSETS.town[npc.home], alt: `${npc.name}'s place`, onClick: talk }));

        const person = makeSpot({ ...npc.spot, sprite: npcPicture(npc), label: npc.name, onClick: talk });
        person.classList.add('portrait-spot');
        if (npc.request) {
            const bubble = addTag(person, 'bubble', itemIcon(npc.request.mode, npc.request.tier));
            if (canFulfill(npc)) bubble.classList.add('ready');
        }
        scene.appendChild(person);
    });
}

function openNpc(npc) {
    const r = npc.request;
    const level = Math.floor(npc.deliveries / 5) + 1;
    const area = AREAS[r.mode];
    const ready = canFulfill(npc);
    showDialog({
        art: npcPicture(npc),
        artRound: true,
        title: `${npc.name} · Lv.${level}`,
        body: `<p>“Could you bring me a ${itemIcon(r.mode, r.tier)} <b>${itemName(r.mode, r.tier)}</b> from your ${area.name}?”</p>
               <p><b>Reward:</b> 💵 ${r.rewardMoney} · ❤️ ${r.rewardHearts}</p>
               <p class="hint">${ready ? 'You have one ready on your board!' : `Merge one on the ${area.name} board first.`}</p>`,
        actions: ready
            ? [{ label: 'Deliver', primary: true, onClick: () => deliver(npc) }, { label: 'Later' }]
            : [{ label: `Go to ${area.name}`, primary: true, onClick: () => goTo(r.mode) }, { label: 'Later' }],
    });
}

function deliver(npc) {
    const r = npc.request;
    const itemIndex = findItem(r.mode, r.tier);
    if (itemIndex === -1) {
        toast(`You don't have a ${itemName(r.mode, r.tier)} on your ${AREAS[r.mode].name} board.`);
        return;
    }
    grids[r.mode][itemIndex] = null;
    res.money += r.rewardMoney;
    res.hearts += r.rewardHearts;
    npc.deliveries++;
    const levelUp = npc.deliveries % 5 === 0;
    if (levelUp) res.gems += LEVEL_UP_GEMS;
    updateUI();
    toast(`${npc.name} loved the ${itemName(r.mode, r.tier)}! +💵${r.rewardMoney} +❤️${r.rewardHearts}`, 'good');
    if (levelUp) toast(`${npc.name} reached Lv.${npc.deliveries / 5 + 1}! +💎 ${LEVEL_UP_GEMS}`, 'good');

    generateRequestFor(npc);
    renderTown();
}

// --- MARKET ---

function renderMarket() {
    const scene = document.getElementById('scene-market');
    scene.innerHTML = '';

    // One land deed per locked area sits on the shelves.
    Object.keys(AREAS).filter(id => !unlocks[id]).forEach((id, i) => {
        const deed = makeSpot({ ...MARKET_LAYOUT.shelf[i], sprite: ASSETS.props.deed, label: AREAS[id].name, onClick: () => offerDeed(id) });
        addTag(deed, 'price-tag', `💵${AREAS[id].cost}`);
        scene.appendChild(deed);
    });

    scene.appendChild(makeSpot({ ...MARKET_LAYOUT.shopkeeper, sprite: ASSETS.characters.shopkeeper, label: 'Shopkeeper', onClick: () => {
        toast(SHOPKEEPER_LINES[shopkeeperLine++ % SHOPKEEPER_LINES.length]);
    } }));
    scene.appendChild(makeSpot({ ...MARKET_LAYOUT.counter, sprite: ASSETS.props.counter, z: 80 }));

    if (maxTier < NAMES['barn'].length - 1) {
        const guide = makeSpot({ ...MARKET_LAYOUT.upgrade, z: 90, sprite: ASSETS.props.upgrade, label: 'Growth Guide', onClick: offerUpgrade });
        addTag(guide, 'price-tag', `💵${maxTier * 100}`);
        scene.appendChild(guide);
    }
}

function offerUpgrade() {
    const next = maxTier + 1;
    showDialog({
        art: ASSETS.props.upgrade,
        title: `Growth Guide · Tier ${next}`,
        body: `<p>Lets you merge one step further on every board, like ${itemIcon('barn', next)} <b>${itemName('barn', next)}</b> in the Barn.</p>
               <p class="hint">Townsfolk will start asking for bigger things too.</p>`,
        actions: [buyAction(maxTier * 100, buyUpgrade), { label: 'Not now' }],
    });
}

function buyUpgrade() {
    const cost = maxTier * 100;
    if (res.money < cost) return;
    res.money -= cost;
    maxTier++;
    updateUI();
    initTown();
    toast(`You can now merge up to tier ${maxTier}!`, 'good');
    goTo(currentScene);
}

// 12,450 -> "12.4k" so the top bar fits on small phones.
function shortNumber(n) {
    if (n >= 100000) return Math.floor(n / 1000) + 'k';
    if (n >= 10000) return (Math.floor(n / 100) / 10) + 'k';
    return n.toLocaleString();
}

function updateUI() {
    moneyEl.textContent = shortNumber(res.money);
    gemsEl.textContent = shortNumber(res.gems);
    // Only resources a board you own uses or makes. Refilling ones show their cap
    // and a countdown, and open the refill dialog when tapped. Chips are updated
    // in place so a tap isn't lost when the timer redraws them.
    const keys = Object.keys(RESOURCES).filter(key => key === 'hearts' || (!['money', 'gems'].includes(key) && isRelevant(key)));
    const layout = keys.map(key => key + (isRefilling(key) ? '*' : '')).join();
    if (resourcesEl.dataset.layout !== layout) {
        resourcesEl.dataset.layout = layout;
        resourcesEl.innerHTML = keys.map(key => isRefilling(key)
            ? `<button class="res" data-key="${key}" title="${RESOURCES[key].name}"></button>`
            : `<span class="res" data-key="${key}" title="${RESOURCES[key].name}"></span>`).join('');
    }
    keys.forEach(key => {
        const chip = resourcesEl.querySelector(`[data-key="${key}"]`);
        const { emoji } = RESOURCES[key];
        if (!isRefilling(key)) {
            chip.innerHTML = `<span>${emoji} <b>${shortNumber(res[key])}</b></span>`;
        } else {
            const timer = refillAt[key] ? `+1 ${formatDuration(refillAt[key] - Date.now())}` : 'full';
            chip.innerHTML = `<span>${emoji} <b>${shortNumber(res[key])}</b></span><small>${timer}</small>`;
        }
    });
}

resourcesEl.addEventListener('click', e => {
    const chip = e.target.closest('button.res');
    if (chip) openEssential(chip.dataset.key);
});
document.getElementById('btn-coins').addEventListener('click', openShop);
document.getElementById('btn-gems').addEventListener('click', openShop);

// --- GRID AND MERGE LOGIC ---

const grids = {
    'farm': Array(NUM_CELLS).fill(null),
    'hay': Array(NUM_CELLS).fill(null),
    'barn': Array(NUM_CELLS).fill(null),
    'fert': Array(NUM_CELLS).fill(null),
    'aqua': Array(NUM_CELLS).fill(null),
    'flower': Array(NUM_CELLS).fill(null)
};
Object.keys(grids).forEach(mode => grids[mode][0] = { type: 'shop' });

// Build one board scene per area.
Object.keys(AREAS).forEach(mode => {
    const scene = document.createElement('section');
    scene.className = `scene board board-${mode}`;
    scene.id = `scene-${mode}`;
    scene.hidden = true;
    if (ASSETS.boards[mode]) scene.style.backgroundImage = `url("${ASSETS.boards[mode]}")`;
    scene.innerHTML = `<div class="board-header"></div><div class="game-grid" id="grid-${mode}"></div>`;
    stageEl.insertBefore(scene, dialogEl);
});

function renderBoardHeader(mode) {
    const area = AREAS[mode];
    const gen = GENERATORS[mode];
    document.querySelector(`#scene-${mode} .board-header`).innerHTML = `
        <img src="${ASSETS.buildings[mode]}" alt="">
        <div>
            <b>${area.name}</b> · max tier ${maxTier}<br>
            Tap the ${gen.emoji} ${gen.label} to add items.<br>
            Drag two alike together to merge.<br>
            Each merge makes ${resLabel(area.output)}.
        </div>`;
}

let draggedItemInfo = null;
let dragElement = null;

// The drag preview lives inside the stage so its cqw-based sizes match the board.
function placeDragElement(e) {
    const stageRect = stageEl.getBoundingClientRect();
    dragElement.style.left = e.clientX - stageRect.left - dragElement.offsetWidth / 2 + 'px';
    dragElement.style.top = e.clientY - stageRect.top - dragElement.offsetHeight / 2 + 'px';
}

function handleDragStart(e, mode, index) {
    e.preventDefault();
    draggedItemInfo = { mode, index };

    const cellEl = document.querySelector(`#grid-${mode} .grid-cell[data-index='${index}'] .item`);
    if (cellEl) cellEl.style.opacity = '0.3';

    dragElement = cellEl.cloneNode(true);
    dragElement.classList.add('dragging');
    dragElement.style.position = 'absolute';
    dragElement.style.width = cellEl.offsetWidth + 'px';
    dragElement.style.height = cellEl.offsetHeight + 'px';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.opacity = '0.9';
    dragElement.style.zIndex = '1000';
    stageEl.appendChild(dragElement);
    placeDragElement(e);

    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
}

function handleDragMove(e) {
    if (dragElement) placeDragElement(e);
}

function handleDragEnd(e) {
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);

    if (dragElement) {
        dragElement.remove();
        dragElement = null;
    }

    if (!draggedItemInfo) return;
    const { mode, index } = draggedItemInfo;
    draggedItemInfo = null;

    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    let targetCell = null;
    for (const el of elements) {
        if (el.classList.contains('grid-cell') && el.closest('.game-grid').id === `grid-${mode}`) {
            targetCell = el;
            break;
        }
    }

    let mergedIdx = -1;
    if (targetCell) {
        const targetIndex = parseInt(targetCell.dataset.index);
        if (targetIndex !== index) {
            const sourceItem = grids[mode][index];
            const targetItem = grids[mode][targetIndex];
            const sameKind = targetItem && sourceItem && targetItem.tier === sourceItem.tier && targetItem.type !== 'shop' && sourceItem.type !== 'shop';

            if (sameKind && sourceItem.tier < maxTier) {
                // Direct Merge 2
                const nextTier = sourceItem.tier + 1;
                grids[mode][index] = null;
                grids[mode][targetIndex] = { tier: nextTier };
                mergedIdx = targetIndex;

                res[AREAS[mode].output] += MERGE_OUTPUT;
                updateUI();
            } else {
                if (sameKind) toast(`Tier ${maxTier} is the max for now. Buy the Growth Guide at the Market!`);
                // Swap
                grids[mode][index] = targetItem;
                grids[mode][targetIndex] = sourceItem;
            }
        }
    }

    renderGrid(mode, mergedIdx !== -1 ? [mergedIdx] : []);
}

function getNeighbors(index) {
    const neighbors = [];
    const x = index % GAME_WIDTH;
    const y = Math.floor(index / GAME_WIDTH);
    if (x > 0) neighbors.push(index - 1);
    if (x < GAME_WIDTH - 1) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - GAME_WIDTH);
    if (y < GAME_HEIGHT - 1) neighbors.push(index + GAME_WIDTH);
    return neighbors;
}

function handleGeneratorClick(mode, index) {
    let emptyIdx = -1;
    for (const n of getNeighbors(index)) {
        if (!grids[mode][n]) {
            emptyIdx = n;
            break;
        }
    }
    if (emptyIdx === -1) {
        emptyIdx = grids[mode].findIndex(cell => cell === null);
    }

    if (emptyIdx === -1) {
        toast("The board is full! Merge or deliver something first.");
        return;
    }

    const input = AREAS[mode].input;
    const missing = Object.keys(input).find(k => res[k] < input[k]);
    if (missing) {
        openEssential(missing, true);
        return;
    }
    Object.entries(input).forEach(([k, n]) => { res[k] -= n; });
    tickEssentials(); // starts the refill timer as soon as you drop below the cap

    updateUI();
    grids[mode][emptyIdx] = { tier: 0 };
    renderGrid(mode, [emptyIdx]);
}

function renderGrid(mode, poppedIndices = []) {
    const gridEl = document.getElementById(`grid-${mode}`);
    if (!gridEl) return;
    gridEl.innerHTML = '';

    for (let i = 0; i < NUM_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;

        const item = grids[mode][i];
        if (item !== null) {
            const itemEl = document.createElement('div');
            itemEl.className = 'item';
            if (poppedIndices.includes(i)) itemEl.classList.add('pop');

            if (item.type === 'shop') {
                const gen = GENERATORS[mode];
                itemEl.classList.add('generator');
                itemEl.innerHTML = `<span class="emoji">${gen.emoji}</span>${gen.label}<br>${inputText(mode)}`;
                itemEl.addEventListener('pointerdown', () => handleGeneratorClick(mode, i));
            } else {
                const sprite = itemSprite(mode, item.tier);
                itemEl.title = itemName(mode, item.tier);
                if (sprite) {
                    itemEl.classList.add('has-sprite');
                    itemEl.innerHTML = `<img src="${sprite}" alt="" draggable="false">`;
                } else {
                    const hue = getHue(mode, item.tier);
                    itemEl.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 70%), hsl(${hue}, 80%, 40%))`;
                    itemEl.innerHTML = `<span class="emoji">${itemEmoji(mode, item.tier)}</span><span class="name">${itemName(mode, item.tier)}</span>`;
                }
                if (item.tier > 0) addTag(itemEl, 'tier', item.tier);
                itemEl.addEventListener('pointerdown', (e) => handleDragStart(e, mode, i));
            }
            cell.appendChild(itemEl);
        }
        gridEl.appendChild(cell);
    }
}

// --- SAVING ---
// Progress is kept in this browser's localStorage, including when each
// essential refills next, so refills keep coming while the game is closed.
// Open the game with ?reset at the end of the link to start over.
const SAVE_KEY = 'merge-farmstead-save-v1';

function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            res, refillAt, shop, unlocks, maxTier, grids,
            npcs: npcs.map(({ id, deliveries, request }) => ({ id, deliveries, request })),
        }));
    } catch (e) {
        // Storage blocked or full: the game still plays, it just won't be saved.
    }
}

function loadGame() {
    try {
        if (new URLSearchParams(location.search).has('reset')) {
            localStorage.removeItem(SAVE_KEY);
            history.replaceState(null, '', location.pathname);
        }
        const save = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (!save) return false;
        Object.assign(res, save.res);
        Object.assign(refillAt, save.refillAt);
        Object.assign(shop, save.shop);
        Object.assign(unlocks, save.unlocks);
        maxTier = save.maxTier;
        Object.keys(grids).forEach(mode => {
            if (save.grids[mode] && save.grids[mode].length === NUM_CELLS) grids[mode] = save.grids[mode];
        });
        save.npcs.forEach(saved => {
            const npc = npcs.find(n => n.id === saved.id);
            if (npc) Object.assign(npc, saved);
        });
        return true;
    } catch (e) {
        return false;
    }
}

// Initial setup
['map', 'town', 'market'].forEach(id => {
    document.getElementById(`scene-${id}`).style.backgroundImage = `url("${ASSETS.scenes[id]}")`;
});
if (!loadGame()) initTown();
tickEssentials(); // catch up on refills that arrived while the game was closed
claimDailyBasket();
Object.keys(grids).forEach(mode => renderGrid(mode));
updateUI();
goTo('map');

setInterval(() => {
    tickEssentials();
    claimDailyBasket();
    updateUI();
    saveGame();
}, 1000);
addEventListener('pagehide', saveGame);
