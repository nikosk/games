/**
 * Little Chef's Automated Kitchen - Configuration & Data
 */

const TILE_SIZE = 64;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;

const COLORS = {
    background: 0x2c1810,
    floor: 0xd4a574,
    floorDark: 0xc49464,
    belt: 0x8b7355,
    beltHighlight: 0xa08060,
    uiBg: 0x3d2817,
    uiBorder: 0xf4e4c1,
    text: 0xf4e4c1,
    success: 0x4caf50,
    warning: 0xff9800,
    error: 0xf44336,
    highlight: 0xffeb3b
};

const ITEMS = {
    wheat: { name: 'Wheat', color: 0xe6c229, emoji: '🌾', processable: true },
    tomato: { name: 'Tomato', color: 0xe63946, emoji: '🍅', processable: true },
    cheese: { name: 'Cheese', color: 0xffd60a, emoji: '🧀', processable: true },
    egg: { name: 'Egg', color: 0xf1faee, emoji: '🥚', processable: true },
    milk: { name: 'Milk', color: 0xa8dadc, emoji: '🥛', processable: true },
    apple: { name: 'Apple', color: 0x6a994e, emoji: '🍏', processable: true },
    fish: { name: 'Fish', color: 0x457b9d, emoji: '🐟', processable: true },
    dough: { name: 'Dough', color: 0xf4a261, emoji: '🥟', processable: true },
    sliced_tomato: { name: 'Sliced Tomato', color: 0xe63946, emoji: '🍅', processable: false },
    bread: { name: 'Bread', color: 0xe9c46a, emoji: '🍞', processable: true },
    pizza: { name: 'Pizza', color: 0xf4a261, emoji: '🍕', processable: false },
    toast: { name: 'Toast', color: 0xd4a373, emoji: '🍞', processable: false },
    fried_fish: { name: 'Fried Fish', color: 0xf4a261, emoji: '🍤', processable: false },
    apple_pie: { name: 'Apple Pie', color: 0xe76f51, emoji: '🥧', processable: false },
    omelette: { name: 'Omelette', color: 0xf4e285, emoji: '🍳', processable: false },
    milkshake: { name: 'Milkshake', color: 0xffb7c5, emoji: '🥤', processable: false },
    plated: { name: 'Plated', color: 0xffffff, emoji: '🍽️', processable: false }
};

const RECIPES = {
    dough: {
        inputs: [{ item: 'wheat', qty: 1 }, { item: 'egg', qty: 1 }, { item: 'milk', qty: 1 }],
        output: 'dough',
        time: 3000,
        station: 'mixer'
    },
    bread: {
        inputs: [{ item: 'dough', qty: 1 }],
        output: 'bread',
        time: 4000,
        station: 'oven'
    },
    sliced_tomato: {
        inputs: [{ item: 'tomato', qty: 1 }],
        output: 'sliced_tomato',
        time: 2000,
        station: 'cutting_board'
    },
    pizza: {
        inputs: [{ item: 'dough', qty: 1 }, { item: 'cheese', qty: 1 }, { item: 'sliced_tomato', qty: 1 }],
        output: 'pizza',
        time: 5000,
        station: 'oven'
    },
    toast: {
        inputs: [{ item: 'bread', qty: 1 }],
        output: 'toast',
        time: 3000,
        station: 'toaster'
    },
    fried_fish: {
        inputs: [{ item: 'fish', qty: 1 }],
        output: 'fried_fish',
        time: 4000,
        station: 'fryer'
    },
    apple_pie: {
        inputs: [{ item: 'apple', qty: 2 }, { item: 'dough', qty: 1 }],
        output: 'apple_pie',
        time: 6000,
        station: 'oven'
    },
    omelette: {
        inputs: [{ item: 'egg', qty: 2 }, { item: 'cheese', qty: 1 }],
        output: 'omelette',
        time: 4000,
        station: 'fryer'
    },
    milkshake: {
        inputs: [{ item: 'milk', qty: 1 }, { item: 'apple', qty: 1 }],
        output: 'milkshake',
        time: 3000,
        station: 'mixer'
    }
};

const STATIONS = {
    dispenser: {
        name: 'Dispenser',
        emoji: '📦',
        type: 'dispenser',
        description: 'Provides ingredients'
    },
    cutting_board: {
        name: 'Cutting Board',
        emoji: '🔪',
        type: 'processor',
        recipes: ['sliced_tomato'],
        description: 'Cuts ingredients'
    },
    mixer: {
        name: 'Mixer',
        emoji: '🥣',
        type: 'processor',
        recipes: ['dough', 'milkshake'],
        description: 'Mixes ingredients'
    },
    oven: {
        name: 'Oven',
        emoji: '🔥',
        type: 'processor',
        recipes: ['bread', 'pizza', 'apple_pie'],
        description: 'Bakes food'
    },
    toaster: {
        name: 'Toaster',
        emoji: '🍞',
        type: 'processor',
        recipes: ['toast'],
        description: 'Toasts bread'
    },
    fryer: {
        name: 'Fryer',
        emoji: '🍳',
        type: 'processor',
        recipes: ['fried_fish', 'omelette'],
        description: 'Fries food'
    },
    plate_station: {
        name: 'Plate Station',
        emoji: '🍽️',
        type: 'plater',
        description: 'Plates food for serving'
    },
    counter: {
        name: 'Counter',
        emoji: '🏪',
        type: 'counter',
        description: 'Where customers pick up orders'
    },
    trash: {
        name: 'Trash',
        emoji: '🗑️',
        type: 'trash',
        description: 'Discard items'
    }
};

const CUSTOMERS = [
    { emoji: '🐶', name: 'Dog' },
    { emoji: '🐱', name: 'Cat' },
    { emoji: '🐰', name: 'Bunny' },
    { emoji: '🐻', name: 'Bear' },
    { emoji: '🐼', name: 'Panda' },
    { emoji: '🦊', name: 'Fox' },
    { emoji: '🐸', name: 'Frog' },
    { emoji: '🐥', name: 'Chick' }
];

const LEVELS = [
    {
        id: 1,
        name: 'First Steps',
        description: 'Drag wheat to the plate station, then serve!',
        unlocked: true,
        tutorial: true,
        gridWidth: 8,
        gridHeight: 6,
        allowedItems: ['wheat'],
        allowedStations: ['dispenser', 'plate_station', 'counter'],
        recipes: [],
        customers: [
            { wants: 'wheat', patience: 60000, tutorial: true }
        ],
        objectives: { customers: 1 },
        stars: [1, 2, 3]
    },
    {
        id: 2,
        name: 'Bread Making',
        description: 'Use the mixer and oven to make bread!',
        unlocked: false,
        tutorial: true,
        gridWidth: 10,
        gridHeight: 7,
        allowedItems: ['wheat', 'egg', 'milk', 'dough', 'bread'],
        allowedStations: ['dispenser', 'mixer', 'oven', 'plate_station', 'counter'],
        recipes: ['dough', 'bread'],
        customers: [
            { wants: 'bread', patience: 90000 },
            { wants: 'bread', patience: 90000, delay: 15000 }
        ],
        objectives: { customers: 2 },
        stars: [1, 2, 3]
    },
    {
        id: 3,
        name: 'Conveyor Belts',
        description: 'Build belts to move items automatically!',
        unlocked: false,
        gridWidth: 12,
        gridHeight: 8,
        allowedItems: ['wheat', 'egg', 'milk', 'dough', 'bread'],
        allowedStations: ['dispenser', 'mixer', 'oven', 'plate_station', 'counter'],
        recipes: ['dough', 'bread'],
        customers: [
            { wants: 'bread', patience: 80000 },
            { wants: 'bread', patience: 80000, delay: 10000 },
            { wants: 'bread', patience: 80000, delay: 20000 }
        ],
        objectives: { customers: 3 },
        stars: [1, 2, 3]
    },
    {
        id: 4,
        name: 'Pizza Time',
        description: 'Make pizza with dough, cheese, and tomatoes!',
        unlocked: false,
        gridWidth: 12,
        gridHeight: 8,
        allowedItems: ['wheat', 'egg', 'milk', 'dough', 'cheese', 'tomato', 'sliced_tomato', 'pizza'],
        allowedStations: ['dispenser', 'mixer', 'cutting_board', 'oven', 'plate_station', 'counter'],
        recipes: ['dough', 'sliced_tomato', 'pizza'],
        customers: [
            { wants: 'pizza', patience: 120000 },
            { wants: 'pizza', patience: 120000, delay: 20000 }
        ],
        objectives: { customers: 2 },
        stars: [1, 2, 3]
    },
    {
        id: 5,
        name: 'Automation',
        description: 'Chef Bots will copy what you do!',
        unlocked: false,
        gridWidth: 14,
        gridHeight: 9,
        allowedItems: ['wheat', 'egg', 'milk', 'dough', 'cheese', 'tomato', 'sliced_tomato', 'pizza', 'bread'],
        allowedStations: ['dispenser', 'mixer', 'cutting_board', 'oven', 'plate_station', 'counter'],
        recipes: ['dough', 'sliced_tomato', 'pizza', 'bread'],
        customers: [
            { wants: 'pizza', patience: 100000 },
            { wants: 'bread', patience: 100000, delay: 15000 },
            { wants: 'pizza', patience: 100000, delay: 30000 }
        ],
        objectives: { customers: 3 },
        stars: [1, 2, 3]
    },
    {
        id: 6,
        name: 'Toast Master',
        description: 'Use the toaster for quick meals!',
        unlocked: false,
        gridWidth: 12,
        gridHeight: 8,
        allowedItems: ['wheat', 'egg', 'milk', 'dough', 'bread', 'toast'],
        allowedStations: ['dispenser', 'mixer', 'oven', 'toaster', 'plate_station', 'counter'],
        recipes: ['dough', 'bread', 'toast'],
        customers: [
            { wants: 'toast', patience: 60000 },
            { wants: 'toast', patience: 60000, delay: 10000 },
            { wants: 'toast', patience: 60000, delay: 20000 }
        ],
        objectives: { customers: 3 },
        stars: [1, 2, 3]
    },
    {
        id: 7,
        name: 'Seafood Special',
        description: 'Fry fish for hungry customers!',
        unlocked: false,
        gridWidth: 12,
        gridHeight: 8,
        allowedItems: ['fish', 'fried_fish'],
        allowedStations: ['dispenser', 'fryer', 'plate_station', 'counter'],
        recipes: ['fried_fish'],
        customers: [
            { wants: 'fried_fish', patience: 80000 },
            { wants: 'fried_fish', patience: 80000, delay: 15000 },
            { wants: 'fried_fish', patience: 80000, delay: 25000 }
        ],
        objectives: { customers: 3 },
        stars: [1, 2, 3]
    },
    {
        id: 8,
        name: 'Apple Pie',
        description: 'Bake delicious apple pies!',
        unlocked: false,
        gridWidth: 14,
        gridHeight: 9,
        allowedItems: ['wheat', 'egg', 'milk', 'dough', 'apple', 'apple_pie'],
        allowedStations: ['dispenser', 'mixer', 'oven', 'plate_station', 'counter'],
        recipes: ['dough', 'apple_pie'],
        customers: [
            { wants: 'apple_pie', patience: 120000 },
            { wants: 'apple_pie', patience: 120000, delay: 20000 }
        ],
        objectives: { customers: 2 },
        stars: [1, 2, 3]
    },
    {
        id: 9,
        name: 'Full Menu',
        description: 'Serve multiple different dishes!',
        unlocked: false,
        gridWidth: 16,
        gridHeight: 10,
        allowedItems: ['wheat', 'egg', 'milk', 'dough', 'cheese', 'tomato', 'sliced_tomato', 'apple', 'fish', 'bread', 'pizza', 'toast', 'fried_fish', 'apple_pie', 'omelette', 'milkshake'],
        allowedStations: ['dispenser', 'mixer', 'cutting_board', 'oven', 'toaster', 'fryer', 'plate_station', 'counter'],
        recipes: ['dough', 'sliced_tomato', 'pizza', 'bread', 'toast', 'fried_fish', 'apple_pie', 'omelette', 'milkshake'],
        customers: [
            { wants: 'pizza', patience: 100000 },
            { wants: 'toast', patience: 100000, delay: 10000 },
            { wants: 'fried_fish', patience: 100000, delay: 20000 },
            { wants: 'apple_pie', patience: 100000, delay: 30000 }
        ],
        objectives: { customers: 4 },
        stars: [1, 2, 3]
    },
    {
        id: 10,
        name: 'Master Chef',
        description: 'Build the ultimate automated kitchen!',
        unlocked: false,
        gridWidth: 20,
        gridHeight: 12,
        allowedItems: ['wheat', 'egg', 'milk', 'dough', 'cheese', 'tomato', 'sliced_tomato', 'apple', 'fish', 'bread', 'pizza', 'toast', 'fried_fish', 'apple_pie', 'omelette', 'milkshake'],
        allowedStations: ['dispenser', 'mixer', 'cutting_board', 'oven', 'toaster', 'fryer', 'plate_station', 'counter'],
        recipes: ['dough', 'sliced_tomato', 'pizza', 'bread', 'toast', 'fried_fish', 'apple_pie', 'omelette', 'milkshake'],
        customers: [
            { wants: 'omelette', patience: 90000 },
            { wants: 'milkshake', patience: 90000, delay: 10000 },
            { wants: 'pizza', patience: 90000, delay: 15000 },
            { wants: 'apple_pie', patience: 90000, delay: 20000 },
            { wants: 'toast', patience: 90000, delay: 25000 },
            { wants: 'fried_fish', patience: 90000, delay: 30000 }
        ],
        objectives: { customers: 6 },
        stars: [1, 2, 3]
    }
];

// Game state
const GAME_STATE = {
    currentLevel: 1,
    unlockedLevels: [1],
    levelStars: {},
    soundEnabled: true,
    musicEnabled: true,
    tutorialCompleted: false
};

// Load saved state
function loadGameState() {
    try {
        const saved = localStorage.getItem('littleChefSave');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(GAME_STATE, data);
            // Update level unlocks
            GAME_STATE.unlockedLevels.forEach(id => {
                const level = LEVELS.find(l => l.id === id);
                if (level) level.unlocked = true;
            });
        }
    } catch (e) {
        console.warn('Could not load save:', e);
    }
}

function saveGameState() {
    try {
        localStorage.setItem('littleChefSave', JSON.stringify(GAME_STATE));
    } catch (e) {
        console.warn('Could not save:', e);
    }
}

loadGameState();
