// --- MERGE FARMSTEAD: TOWNSFOLK EXPANSION (GRID BASED) ---

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
let currentMode = 'barn'; 

// UI Elements
const fertEl = document.getElementById('fert-val');
const wheatEl = document.getElementById('wheat-val');
const feedEl = document.getElementById('feed-val');
const rawEl = document.getElementById('raw-val');
const waterEl = document.getElementById('water-val');
const nectarEl = document.getElementById('nectar-val');
const moneyEl = document.getElementById('money-val');
const heartsEl = document.getElementById('hearts-val');

const btnFarm = document.getElementById('btn-farm');
const btnHay = document.getElementById('btn-hay');
const btnBarn = document.getElementById('btn-barn');
const btnFert = document.getElementById('btn-fert');
const btnAqua = document.getElementById('btn-aqua');
const btnFlower = document.getElementById('btn-flower');
const btnTown = document.getElementById('btn-town');
const btnShop = document.getElementById('btn-shop');

const contFarm = document.getElementById('farm-container');
const contHay = document.getElementById('hay-container');
const contBarn = document.getElementById('barn-container');
const contFert = document.getElementById('fert-container');
const contAqua = document.getElementById('aqua-container');
const contFlower = document.getElementById('flower-container');
const contTown = document.getElementById('town-container');
const contShop = document.getElementById('shop-container');
const missionsList = document.getElementById('missions-list');
const shopList = document.getElementById('shop-list');

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

const grids = {
    'farm': Array(NUM_CELLS).fill(null),
    'hay': Array(NUM_CELLS).fill(null),
    'barn': Array(NUM_CELLS).fill(null),
    'fert': Array(NUM_CELLS).fill(null),
    'aqua': Array(NUM_CELLS).fill(null),
    'flower': Array(NUM_CELLS).fill(null)
};
Object.keys(grids).forEach(mode => grids[mode][0] = { type: 'shop' });

// --- TOWNSFOLK SYSTEM ---
const npcs = [
    { id: 'mayor', name: 'Mayor Pelican', emoji: '🎩', pref: ['farm', 'fert'], deliveries: 0, request: null },
    { id: 'marnie', name: 'Marnie', emoji: '🐄', pref: ['barn'], deliveries: 0, request: null },
    { id: 'robin', name: 'Robin', emoji: '🪓', pref: ['hay'], deliveries: 0, request: null },
    { id: 'willy', name: 'Willy', emoji: '🎣', pref: ['aqua'], deliveries: 0, request: null },
    { id: 'sandy', name: 'Sandy', emoji: '🌸', pref: ['flower'], deliveries: 0, request: null }
];

function generateRequestFor(npc) {
    let availableModes = npc.pref.filter(m => unlocks[m]);
    if (availableModes.length === 0) {
        availableModes = Object.keys(unlocks).filter(k => unlocks[k]);
    }
    const mode = availableModes[Math.floor(Math.random() * availableModes.length)];
    const targetTier = Math.floor(Math.random() * maxTier) + 1; 
    const itemName = NAMES[mode][targetTier];
    
    npc.request = {
        mode: mode,
        tier: targetTier,
        itemName: itemName,
        rewardMoney: targetTier * 30 + Math.floor(Math.random() * 20),
        rewardHearts: targetTier
    };
}

function initTown() {
    npcs.forEach(npc => generateRequestFor(npc));
    renderTown();
}

function renderTown() {
    missionsList.innerHTML = '';
    npcs.forEach(npc => {
        if (!npc.request) return;
        const r = npc.request;
        const level = Math.floor(npc.deliveries / 5) + 1;

        const div = document.createElement('div');
        div.style.background = 'linear-gradient(to right, #ffffff, #f9f9f9)';
        div.style.padding = '12px';
        div.style.borderRadius = '12px';
        div.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
        div.style.color = '#2c3e50';
        div.style.borderLeft = '6px solid #8e44ad';
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 800; font-size: 16px; color: #34495e; text-shadow: 1px 1px 1px rgba(0,0,0,0.1);">
                    <span style="font-size:20px;">${npc.emoji}</span> ${npc.name}
                </div>
                <div style="font-size: 11px; color: white; background: #8e44ad; padding: 3px 8px; border-radius: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    Lv.${level} (${npc.deliveries}📦)
                </div>
            </div>
            <div style="font-size: 14px; margin-bottom: 12px; color: #555;">I need a <b>${r.itemName}</b> (Tier ${r.tier} on the ${r.mode.toUpperCase()} board).</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; font-weight: bold; background: #ecf0f1; padding: 4px 8px; border-radius: 6px;">Reward: <span style="color:#f39c12; text-shadow: 0px 1px 1px rgba(0,0,0,0.2);">💵 ${r.rewardMoney}</span> | <span style="color:#e74c3c;">❤️ ${r.rewardHearts}</span></div>
                <button onclick="fulfillRequest('${npc.id}')" style="background: linear-gradient(to bottom, #2ecc71, #27ae60); color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 3px 6px rgba(0,0,0,0.2); text-shadow: 1px 1px 1px rgba(0,0,0,0.3); transition: transform 0.1s;">Deliver</button>
            </div>
        `;
        missionsList.appendChild(div);
    });
}

window.fulfillRequest = function(npcId) {
    const npc = npcs.find(n => n.id === npcId);
    if (!npc || !npc.request) return;
    const r = npc.request;

    const grid = grids[r.mode];
    const itemIndex = grid.findIndex(item => item !== null && item.tier === r.tier);

    if (itemIndex !== -1) {
        grid[itemIndex] = null;
        money += r.rewardMoney;
        hearts += r.rewardHearts;
        npc.deliveries++;
        updateUI();
        
        generateRequestFor(npc);
        renderTown();
        renderGrid(r.mode);
        
        alert(`Awesome! You delivered the ${r.itemName} to ${npc.name}!\nEarned 💵 ${r.rewardMoney} and ❤️ ${r.rewardHearts}`);
    } else {
        alert(`You don't have a fully grown ${r.itemName} (Tier ${r.tier}) on your ${r.mode.toUpperCase()} board right now!`);
    }
};

// --- CORE LOGIC ---

function switchMode(mode) {
    currentMode = mode;
    
    [btnFarm, btnHay, btnBarn, btnFert, btnAqua, btnFlower, btnTown, btnShop].forEach(b => b.classList.remove('active'));
    [contFarm, contHay, contBarn, contFert, contAqua, contFlower, contTown, contShop].forEach(c => c.style.display = 'none');
    
    if (mode === 'farm') { btnFarm.classList.add('active'); contFarm.style.display = 'block'; } 
    else if (mode === 'hay') { btnHay.classList.add('active'); contHay.style.display = 'block'; } 
    else if (mode === 'barn') { btnBarn.classList.add('active'); contBarn.style.display = 'block'; } 
    else if (mode === 'fert') { btnFert.classList.add('active'); contFert.style.display = 'block'; }
    else if (mode === 'aqua') { btnAqua.classList.add('active'); contAqua.style.display = 'block'; }
    else if (mode === 'flower') { btnFlower.classList.add('active'); contFlower.style.display = 'block'; }
    else if (mode === 'town') { btnTown.classList.add('active'); contTown.style.display = 'block'; }
    else if (mode === 'shop') { 
        btnShop.classList.add('active'); 
        contShop.style.display = 'block'; 
        renderShop(); 
    }
}

btnFarm.addEventListener('click', () => switchMode('farm'));
btnHay.addEventListener('click', () => switchMode('hay'));
btnBarn.addEventListener('click', () => switchMode('barn'));
btnFert.addEventListener('click', () => switchMode('fert'));
btnAqua.addEventListener('click', () => switchMode('aqua'));
btnFlower.addEventListener('click', () => switchMode('flower'));
btnTown.addEventListener('click', () => switchMode('town'));
btnShop.addEventListener('click', () => switchMode('shop'));

function updateUI() {
    fertEl.innerText = fertilizer;
    wheatEl.innerText = wheat;
    feedEl.innerText = feed;
    rawEl.innerText = rawFertilizer;
    waterEl.innerText = water;
    nectarEl.innerText = nectar;
    moneyEl.innerText = money;
    heartsEl.innerText = hearts;
}

function renderShop() {
    shopList.innerHTML = '';
    
    const addShopItem = (title, desc, cost, onBuy, isVisible = true) => {
        if (!isVisible) return;
        const div = document.createElement('div');
        div.style.background = 'linear-gradient(to right, #ffffff, #fdfdfd)';
        div.style.padding = '12px';
        div.style.borderRadius = '12px';
        div.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
        div.style.color = '#2c3e50';
        div.style.borderLeft = '6px solid #f39c12';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        
        div.innerHTML = `
            <div>
                <div style="font-weight: 800; font-size: 16px; color: #34495e; text-shadow: 1px 1px 1px rgba(0,0,0,0.1);">${title}</div>
                <div style="font-size: 12px; color: #7f8c8d; margin-top: 2px;">${desc}</div>
                <div style="font-size: 13px; font-weight: bold; background: #ecf0f1; padding: 4px 8px; border-radius: 6px; display: inline-block; margin-top: 8px;">Cost: <span style="color:#f39c12; text-shadow: 0px 1px 1px rgba(0,0,0,0.2);">💵 ${cost}</span></div>
            </div>
        `;
        const btn = document.createElement('button');
        btn.innerText = 'Buy';
        btn.style.background = 'linear-gradient(to bottom, #f1c40f, #f39c12)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.padding = '8px 18px';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = '0 3px 6px rgba(0,0,0,0.2)';
        btn.style.textShadow = '1px 1px 1px rgba(0,0,0,0.4)';
        
        btn.onclick = () => {
            if (money >= cost) {
                money -= cost;
                updateUI();
                onBuy();
                renderShop(); // Refresh shop UI
            } else {
                alert("Not enough money!");
            }
        };
        div.appendChild(btn);
        shopList.appendChild(div);
    };

    // Base items are now bought directly from the board's Shop tile
    addShopItem('Unlock Farm', 'Grow crops using fertilizer.', 200, () => { unlocks.farm = true; btnFarm.style.display = 'block'; }, !unlocks.farm);
    addShopItem('Unlock Hay Field', 'Harvest hay using wheat.', 400, () => { unlocks.hay = true; btnHay.style.display = 'block'; }, !unlocks.hay);
    addShopItem('Unlock Fert Space', 'Make your own fertilizer.', 800, () => { unlocks.fert = true; btnFert.style.display = 'block'; }, !unlocks.fert);
    addShopItem('Unlock Aquarium', 'Feed wheat to fish to generate water.', 2000, () => { unlocks.aqua = true; btnAqua.style.display = 'block'; }, !unlocks.aqua);
    addShopItem('Unlock Flower Garden', 'Use Water + Fert to grow Nectar.', 5000, () => { unlocks.flower = true; btnFlower.style.display = 'block'; }, !unlocks.flower);

    if (maxTier < NAMES['barn'].length - 1) {
        let nextTierName = NAMES['barn'][maxTier]; 
        addShopItem(`Unlock Tier ${maxTier + 1}`, `Increases your max merge limit.`, (maxTier) * 100, () => { 
            maxTier++; 
            initTown();
        });
    }
}

// --- GRID AND MERGE LOGIC ---

let draggedItemInfo = null;
let dragElement = null;

function handleDragStart(e, mode, index) {
    e.preventDefault();
    draggedItemInfo = { mode, index };
    
    const cellEl = document.querySelector(`#grid-${mode} .grid-cell[data-index='${index}'] .item`);
    if (cellEl) cellEl.style.opacity = '0.3';
    
    dragElement = cellEl.cloneNode(true);
    dragElement.classList.add('dragging');
    dragElement.style.position = 'fixed';
    dragElement.style.width = cellEl.offsetWidth + 'px';
    dragElement.style.height = cellEl.offsetHeight + 'px';
    dragElement.style.left = e.clientX - cellEl.offsetWidth/2 + 'px';
    dragElement.style.top = e.clientY - cellEl.offsetHeight/2 + 'px';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.opacity = '0.9';
    dragElement.style.zIndex = '1000';
    document.body.appendChild(dragElement);
    
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
}

function handleDragMove(e) {
    if (dragElement) {
        dragElement.style.left = e.clientX - dragElement.offsetWidth/2 + 'px';
        dragElement.style.top = e.clientY - dragElement.offsetHeight/2 + 'px';
    }
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
            
            if (targetItem && sourceItem && targetItem.tier === sourceItem.tier && targetItem.type !== 'shop' && sourceItem.type !== 'shop' && sourceItem.tier < maxTier) {
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

function handleShopClick(mode, index) {
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
        alert("Board is full!");
        return;
    }

    if (mode === 'farm') {
        if (fertilizer <= 0) { alert("Not enough ✨ Fertilizer!"); return; }
        fertilizer--;
    } else if (mode === 'hay') {
        if (wheat <= 0) { alert("Not enough 🌾 Wheat!"); return; }
        wheat--;
    } else if (mode === 'barn') {
        if (money < 10) { alert("Not enough 💵 Money! Complete Town requests."); return; }
        money -= 10;
    } else if (mode === 'fert') {
        if (rawFertilizer <= 0) { alert("Not enough 💩 Raw Fertilizer!"); return; }
        rawFertilizer--;
    } else if (mode === 'aqua') {
        if (wheat <= 0) { alert("Not enough 🌾 Wheat!"); return; }
        wheat--;
    } else if (mode === 'flower') {
        if (water <= 0 || fertilizer <= 0) { alert("Not enough 💧 Water or ✨ Fertilizer!"); return; }
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
                itemEl.innerText = "🏪 Shop";
                itemEl.style.background = "#e67e22";
                itemEl.style.color = "white";
                itemEl.style.borderRadius = "8px"; 
                itemEl.style.cursor = "pointer";
                itemEl.addEventListener('pointerdown', (e) => {
                    handleShopClick(mode, i);
                });
            } else {
                itemEl.innerText = NAMES[mode][item.tier];
                const hue = getHue(mode, item.tier);
                itemEl.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 70%), hsl(${hue}, 80%, 40%))`;
                itemEl.addEventListener('pointerdown', (e) => {
                    handleDragStart(e, mode, i);
                });
            }
            cell.appendChild(itemEl);
        }
        gridEl.appendChild(cell);
    }
}

// Initial setup
Object.keys(grids).forEach(mode => renderGrid(mode));
updateUI();
initTown();
