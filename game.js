// --- MERGE FARMSTEAD ---
// The farm map, the town and the market are physical places: each building,
// person and shelf item is a sprite placed on a background that you tap.
// Image paths all come from assets.js so AI-generated art can replace the
// placeholders without touching this file.

const GAME_WIDTH = 6;
const GAME_HEIGHT = 8;
const NUM_CELLS = GAME_WIDTH * GAME_HEIGHT;

let unlocks = { barn: true, hay: false, farm: false, fert: false, aqua: false, flower: false };
let maxTier = 3;
let money = 50;
let feed = 0;
let fertilizer = 0;
let wheat = 0;
let rawFertilizer = 0;
let water = 0;
let nectar = 0;
let hearts = 0;
let currentScene = 'map';

// UI Elements
const fertEl = document.getElementById('fert-val');
const wheatEl = document.getElementById('wheat-val');
const feedEl = document.getElementById('feed-val');
const rawEl = document.getElementById('raw-val');
const waterEl = document.getElementById('water-val');
const nectarEl = document.getElementById('nectar-val');
const moneyEl = document.getElementById('money-val');
const heartsEl = document.getElementById('hearts-val');

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
    'barn': ['🌿 Feed', '🥚 Egg', '🐤 Chick', '🐔 Chicken', '🐽 Piglet', '🐷 Pig', '🐮 Calf', '🐄 Cow', '🐴 Horse', '🐻 Bear', '🐘 Elephant', '🐳 Blue Whale'],
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

// Land on the farm map. `cost` is the price of its deed.
const AREAS = {
    barn:   { name: 'Barn',          cost: 0,    uses: '💵 Money',           makes: '💩 Raw Fert', desc: 'Raise animals from feed.' },
    farm:   { name: 'Crop Field',    cost: 200,  uses: '✨ Fert',            makes: '🌾 Wheat',    desc: 'Grow crops using fertilizer.' },
    hay:    { name: 'Hay Field',     cost: 400,  uses: '🌾 Wheat',           makes: '🌿 Feed',     desc: 'Harvest hay using wheat.' },
    fert:   { name: 'Compost Yard',  cost: 800,  uses: '💩 Raw Fert',        makes: '✨ Fert',     desc: 'Make your own fertilizer.' },
    aqua:   { name: 'Fish Pond',     cost: 2000, uses: '🌾 Wheat',           makes: '💧 Water',    desc: 'Feed wheat to fish to generate water.' },
    flower: { name: 'Flower Garden', cost: 5000, uses: '💧 Water + ✨ Fert', makes: '🍯 Nectar',   desc: 'Use Water + Fert to grow Nectar.' },
};

// The corner tile on every board that spawns new tier-0 items.
const GENERATORS = {
    barn:   { emoji: '🧺', label: 'Feed Bin',     cost: '💵10' },
    hay:    { emoji: '🌾', label: 'Wheat Sack',   cost: '🌾1' },
    farm:   { emoji: '✨', label: 'Fert Bag',     cost: '✨1' },
    fert:   { emoji: '🪣', label: 'Muck Bucket',  cost: '💩1' },
    aqua:   { emoji: '🥫', label: 'Fish Food',    cost: '🌾1' },
    flower: { emoji: '🚿', label: 'Watering Can', cost: '💧1 ✨1' },
};

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

function showDialog({ art, title, body, actions }) {
    dialogArt.hidden = !art;
    if (art) dialogArt.src = art;
    dialogTitle.textContent = title;
    dialogBody.innerHTML = body;
    dialogActions.innerHTML = '';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'btn' + (action.primary ? ' btn-primary' : '');
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
function buyAction(cost, onBuy) {
    const short = cost - money;
    return {
        label: short > 0 ? `Need 💵 ${short} more` : `Buy for 💵 ${cost}`,
        primary: true,
        disabled: short > 0,
        onClick: onBuy,
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
        body: `<p>${area.desc}</p><p class="hint">Uses ${area.uses} · merging makes ${area.makes}</p>`,
        actions: [buyAction(area.cost, () => buyDeed(id)), { label: 'Not now' }],
    });
}

function buyDeed(id) {
    const area = AREAS[id];
    if (unlocks[id] || money < area.cost) return;
    money -= area.cost;
    unlocks[id] = true;
    updateUI();
    toast(`The ${area.name} is yours! Find it on the map.`, 'good');
    goTo(currentScene);
}

// --- TOWNSFOLK SYSTEM ---
// Each NPC lives in a building on the town square and stands in front of it.
const npcs = [
    { id: 'mayor',  name: 'Mayor Pelican', pref: ['farm', 'fert'], deliveries: 0, request: null,
      home: 'townhall',   building: { x: 27, y: 2,  w: 46 }, spot: { x: 42, y: 25, w: 16 } },
    { id: 'robin',  name: 'Robin',         pref: ['hay'],          deliveries: 0, request: null,
      home: 'carpenter',  building: { x: 1,  y: 21, w: 34 }, spot: { x: 9,  y: 39, w: 15 } },
    { id: 'marnie', name: 'Marnie',        pref: ['barn'],         deliveries: 0, request: null,
      home: 'ranch',      building: { x: 65, y: 21, w: 34 }, spot: { x: 76, y: 39, w: 15 } },
    { id: 'willy',  name: 'Willy',         pref: ['aqua'],         deliveries: 0, request: null,
      home: 'fishshop',   building: { x: 1,  y: 58, w: 36 }, spot: { x: 12, y: 76, w: 15 } },
    { id: 'sandy',  name: 'Sandy',         pref: ['flower'],       deliveries: 0, request: null,
      home: 'flowershop', building: { x: 63, y: 58, w: 36 }, spot: { x: 73, y: 76, w: 15 } },
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
        rewardMoney: targetTier * 30 + Math.floor(Math.random() * 20),
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

function renderTown() {
    const scene = document.getElementById('scene-town');
    scene.innerHTML = '';
    npcs.forEach(npc => {
        const talk = () => openNpc(npc);
        scene.appendChild(makeSpot({ ...npc.building, sprite: ASSETS.town[npc.home], alt: `${npc.name}'s place`, onClick: talk }));

        const person = makeSpot({ ...npc.spot, sprite: ASSETS.characters[npc.id], label: npc.name, onClick: talk });
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
        art: ASSETS.characters[npc.id],
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
    money += r.rewardMoney;
    hearts += r.rewardHearts;
    npc.deliveries++;
    updateUI();
    toast(`${npc.name} loved the ${itemName(r.mode, r.tier)}! +💵${r.rewardMoney} +❤️${r.rewardHearts}`, 'good');

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
    if (money < cost) return;
    money -= cost;
    maxTier++;
    updateUI();
    initTown();
    toast(`You can now merge up to tier ${maxTier}!`, 'good');
    goTo(currentScene);
}

function updateUI() {
    fertEl.textContent = fertilizer;
    wheatEl.textContent = wheat;
    feedEl.textContent = feed;
    rawEl.textContent = rawFertilizer;
    waterEl.textContent = water;
    nectarEl.textContent = nectar;
    moneyEl.textContent = money;
    heartsEl.textContent = hearts;
}

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
            Each merge makes ${area.makes}.
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

                const rewardAmount = nextTier * 2;
                if (mode === 'farm') wheat += rewardAmount;
                else if (mode === 'hay') feed += rewardAmount;
                else if (mode === 'barn') rawFertilizer += rewardAmount;
                else if (mode === 'fert') fertilizer += rewardAmount;
                else if (mode === 'aqua') water += rewardAmount;
                else if (mode === 'flower') nectar += rewardAmount;

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

    if (mode === 'farm') {
        if (fertilizer <= 0) { toast("Not enough ✨ Fertilizer! Make some in the Compost Yard."); return; }
        fertilizer--;
    } else if (mode === 'hay') {
        if (wheat <= 0) { toast("Not enough 🌾 Wheat! Grow some in the Crop Field."); return; }
        wheat--;
    } else if (mode === 'barn') {
        if (money < 10) { toast("Not enough 💵 Money! Help the townsfolk to earn more."); return; }
        money -= 10;
    } else if (mode === 'fert') {
        if (rawFertilizer <= 0) { toast("Not enough 💩 Raw Fertilizer! Merge animals in the Barn."); return; }
        rawFertilizer--;
    } else if (mode === 'aqua') {
        if (wheat <= 0) { toast("Not enough 🌾 Wheat! Grow some in the Crop Field."); return; }
        wheat--;
    } else if (mode === 'flower') {
        if (water <= 0 || fertilizer <= 0) { toast("Not enough 💧 Water or ✨ Fertilizer!"); return; }
        water--;
        fertilizer--;
    }

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
                itemEl.innerHTML = `<span class="emoji">${gen.emoji}</span>${gen.label}<br>${gen.cost}`;
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

// Initial setup
['map', 'town', 'market'].forEach(id => {
    document.getElementById(`scene-${id}`).style.backgroundImage = `url("${ASSETS.scenes[id]}")`;
});
Object.keys(grids).forEach(mode => renderGrid(mode));
updateUI();
initTown();
goTo('map');
