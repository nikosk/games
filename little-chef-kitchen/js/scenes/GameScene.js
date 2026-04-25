/**
 * GameScene - Main gameplay scene
 */

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.levelId = data.levelId || 1;
        this.levelData = LEVELS.find(l => l.id === this.levelId) || LEVELS[0];
        
        // Game state
        this.grid = [];
        this.entities = [];
        this.items = [];
        this.customers = [];
        this.belts = [];
        this.bots = [];
        this.ordersCompleted = 0;
        this.totalCustomers = 0;
        this.isPaused = false;
        this.gameWon = false;
        
        // Input state
        this.selectedTool = null;
        this.heldItem = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.cameraDragStart = { x: 0, y: 0 };
        this.lastTapTime = 0;
        this.lastTapPos = { x: 0, y: 0 };
        
        // Bot tracking
        this.playerActions = [];
        this.botOffered = false;
        
        // Tutorial
        this.tutorialStep = 0;
        this.tutorialActive = this.levelData.tutorial || false;
    }

    create() {
        
        // Initialize grid
        this.initGrid();
        
        // Create tilemap
        this.createTilemap();
        
        // Setup input
        this.setupInput();
        
        // Create particle emitters first (setupLevel may use them)
        this.createParticles();
        
        // Setup level
        this.setupLevel();
        
        // Center camera on the grid
        this.centerCameraOnGrid();
        
        // Create UI on top
        this.createToolbar();
        this.createLevelUI();
        
        // Start game loop
        this.time.addEvent({
            delay: 100,
            callback: this.gameTick,
            callbackScope: this,
            loop: true
        });
        
        // Customer spawn timer
        this.sceneTime = 0;
        this.time.addEvent({
            delay: 1000,
            callback: this.checkCustomerSpawns,
            callbackScope: this,
            loop: true
        });
        
        // Belt movement timer
        this.time.addEvent({
            delay: 500,
            callback: this.moveBelts,
            callbackScope: this,
            loop: true
        });
        
        // Show tutorial if needed
        if (this.tutorialActive) {
            this.showTutorial();
        }
        
        // Show recipe book
        this.createRecipeBook();
    }

    initGrid() {
        const gw = this.levelData.gridWidth || GRID_WIDTH;
        const gh = this.levelData.gridHeight || GRID_HEIGHT;
        
        this.gridWidth = gw;
        this.gridHeight = gh;
        
        for (let x = 0; x < gw; x++) {
            this.grid[x] = [];
            for (let y = 0; y < gh; y++) {
                this.grid[x][y] = {
                    x, y,
                    station: null,
                    belt: null,
                    item: null,
                    bot: null
                };
            }
        }
    }

    createTilemap() {
        // Create floor tiles
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                const tile = this.add.image(
                    x * TILE_SIZE + TILE_SIZE / 2,
                    y * TILE_SIZE + TILE_SIZE / 2,
                    'floor'
                );
                tile.setDepth(0);
            }
        }
        
        // Grid highlight (follows mouse)
        this.hoverHighlight = this.add.image(0, 0, 'highlight');
        this.hoverHighlight.setDepth(1);
        this.hoverHighlight.setVisible(false);
        
        // Ghost preview for placement
        this.ghostSprite = this.add.image(0, 0, 'floor');
        this.ghostSprite.setDepth(100);
        this.ghostSprite.setAlpha(0.5);
        this.ghostSprite.setVisible(false);
        
        // Drop target highlight (green when holding item over valid target)
        this.dropHighlight = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x4caf50, 0.4);
        this.dropHighlight.setDepth(2);
        this.dropHighlight.setStrokeStyle(3, 0x4caf50);
        this.dropHighlight.setVisible(false);
    }

    setupInput() {
        // Pointer events
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
        
        // Pinch zoom for mobile (manual implementation)
        this.input.addPointer(2);
        this.pinchDistance = 0;
        this.input.on('pointerdown', (pointer) => {
            if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
                this.pinchDistance = Phaser.Math.Distance.Between(
                    this.input.pointer1.x, this.input.pointer1.y,
                    this.input.pointer2.x, this.input.pointer2.y
                );
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
                const newDistance = Phaser.Math.Distance.Between(
                    this.input.pointer1.x, this.input.pointer1.y,
                    this.input.pointer2.x, this.input.pointer2.y
                );
                if (this.pinchDistance > 0) {
                    const scaleFactor = newDistance / this.pinchDistance;
                    this.cameras.main.zoom *= scaleFactor;
                    this.cameras.main.zoom = Phaser.Math.Clamp(this.cameras.main.zoom, 0.5, 2);
                }
                this.pinchDistance = newDistance;
            }
        });
        
        this.input.on('pointerup', () => {
            this.pinchDistance = 0;
        });
    }

    onPointerDown(pointer) {
        if (this.isPaused || this.gameWon) return;
        
        // Check if clicking on UI (bottom toolbar area)
        const toolbarH = this.toolbarHeight || 100;
        if (pointer.y > this.scale.height - toolbarH) {
            return;
        }
        
        this.isDragging = true;
        this.dragStart = { x: pointer.x, y: pointer.y };
        this.cameraDragStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
        
        // Store grid position for potential double-tap check on release
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.tapStartGrid = {
            x: Math.floor(worldPoint.x / TILE_SIZE),
            y: Math.floor(worldPoint.y / TILE_SIZE)
        };
    }

    onPointerMove(pointer) {
        if (!this.isDragging) {
            // Update hover highlight
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridX = Math.floor(worldPoint.x / TILE_SIZE);
            const gridY = Math.floor(worldPoint.y / TILE_SIZE);
            
            if (this.isValidGridPos(gridX, gridY)) {
                this.hoverHighlight.setPosition(
                    gridX * TILE_SIZE + TILE_SIZE / 2,
                    gridY * TILE_SIZE + TILE_SIZE / 2
                );
                this.hoverHighlight.setVisible(true);
                
                // Update ghost
                if (this.selectedTool) {
                    this.updateGhost(gridX, gridY);
                }
                
                // Show green drop highlight when holding item over valid target
                if (this.heldItem) {
                    const cell = this.grid[gridX][gridY];
                    const isValid = this.isValidDropTarget(cell, this.heldItem.type);
                    if (isValid) {
                        this.dropHighlight.setPosition(
                            gridX * TILE_SIZE + TILE_SIZE / 2,
                            gridY * TILE_SIZE + TILE_SIZE / 2
                        );
                        this.dropHighlight.setVisible(true);
                    } else {
                        this.dropHighlight.setVisible(false);
                    }
                } else {
                    this.dropHighlight.setVisible(false);
                }
            } else {
                this.hoverHighlight.setVisible(false);
                this.ghostSprite.setVisible(false);
                this.dropHighlight.setVisible(false);
            }
            return;
        }
        
        // Camera pan
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            this.cameras.main.scrollX = this.cameraDragStart.x - dx / this.cameras.main.zoom;
            this.cameras.main.scrollY = this.cameraDragStart.y - dy / this.cameras.main.zoom;
        }
    }

    onPointerUp(pointer) {
        if (!this.isDragging) return;
        
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        
        // If minimal movement, treat as tap
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridX = Math.floor(worldPoint.x / TILE_SIZE);
            const gridY = Math.floor(worldPoint.y / TILE_SIZE);
            
            // Double-tap detection: same grid cell, within 600ms
            const now = Date.now();
            const sameCell = this.lastTapGrid && this.lastTapGrid.x === gridX && this.lastTapGrid.y === gridY;
            if (sameCell && now - this.lastTapTime < 600) {
                this.onDoubleTap(gridX, gridY);
            } else {
                this.onGridTap(gridX, gridY);
            }
            
            this.lastTapTime = now;
            this.lastTapGrid = { x: gridX, y: gridY };
        }
        
        this.isDragging = false;
    }

    onGridTap(gridX, gridY) {
        if (!this.isValidGridPos(gridX, gridY)) return;
        
        const cell = this.grid[gridX][gridY];
        
        // If holding an item, try to place it
        if (this.heldItem) {
            this.tryPlaceItem(gridX, gridY);
            return;
        }
        
        // If a tool is selected, place it
        if (this.selectedTool) {
            this.tryPlaceTool(gridX, gridY);
            return;
        }
        
        // If tapping on a station with an item, pick it up
        if (cell.station && cell.station.outputItem) {
            this.pickupItem(gridX, gridY);
            return;
        }
        
        // If tapping on a station that produces items (dispenser)
        if (cell.station && cell.station.type === 'dispenser') {
            this.dispenseItem(gridX, gridY);
            return;
        }
    }

    onDoubleTap(gridX, gridY) {
        // Remove station/belt on double tap (only user-placed items)
        if (!this.isValidGridPos(gridX, gridY)) return;
        
        const cell = this.grid[gridX][gridY];
        if (cell.station && cell.station.removable) {
            this.removeStation(gridX, gridY);
        } else if (cell.belt) {
            this.removeBelt(gridX, gridY);
        }
    }

    isValidGridPos(x, y) {
        return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
    }

    isValidDropTarget(cell, itemType) {
        if (!cell) return false;
        
        // Can always place on belt
        if (cell.belt && !cell.belt.item) return true;
        
        if (!cell.station) return false;
        
        const st = cell.station;
        
        // Counter always accepts
        if (st.type === 'counter') return true;
        
        // Trash always accepts
        if (st.type === 'trash') return true;
        
        // Plate station accepts anything
        if (st.type === 'plate_station') return true;
        
        // Processor: check if item is a valid input for any recipe
        if (st.data.type === 'processor') {
            for (const recipeKey of st.data.recipes || []) {
                const recipe = RECIPES[recipeKey];
                if (!recipe) continue;
                if (recipe.inputs.some(inp => inp.item === itemType)) return true;
            }
        }
        
        return false;
    }

    updateGhost(gridX, gridY) {
        if (!this.isValidGridPos(gridX, gridY)) {
            this.ghostSprite.setVisible(false);
            return;
        }
        
        const cell = this.grid[gridX][gridY];
        let texture = null;
        
        if (this.selectedTool.startsWith('belt_')) {
            texture = this.selectedTool;
        } else if (STATIONS[this.selectedTool]) {
            texture = `station_${this.selectedTool}`;
        }
        
        if (texture) {
            this.ghostSprite.setTexture(texture);
            this.ghostSprite.setPosition(
                gridX * TILE_SIZE + TILE_SIZE / 2,
                gridY * TILE_SIZE + TILE_SIZE / 2
            );
            
            // Red if blocked, green if valid
            const blocked = cell.station || (cell.belt && this.selectedTool.startsWith('belt_'));
            this.ghostSprite.setTint(blocked ? 0xff0000 : 0x00ff00);
            this.ghostSprite.setVisible(true);
        }
    }

    tryPlaceTool(gridX, gridY) {
        if (!this.isValidGridPos(gridX, gridY)) return;
        
        const cell = this.grid[gridX][gridY];
        
        // Check if allowed
        if (STATIONS[this.selectedTool]) {
            if (!this.levelData.allowedStations.includes(this.selectedTool)) return;
            if (cell.station || cell.belt) return;
            
            this.placeStation(gridX, gridY, this.selectedTool);
        } else if (this.selectedTool.startsWith('belt_')) {
            if (cell.station || cell.belt) return;
            const dir = this.selectedTool.replace('belt_', '');
            this.placeBelt(gridX, gridY, dir);
        }
    }

    placeStation(x, y, type) {
        const cell = this.grid[x][y];
        const stationData = STATIONS[type];
        
        const station = {
            x, y,
            type: type,
            data: stationData,
            inputs: [],
            outputItem: null,
            processing: false,
            progress: 0,
            recipe: null,
            sprite: null,
            itemSprite: null,
            progressBar: null,
            label: null,
            recipeHint: null,
            removable: type !== 'counter'
        };
        
        // Create sprite
        station.sprite = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            `station_${type}`
        );
        station.sprite.setDepth(10);
        
        // Add label below station
        const labelText = stationData.emoji + ' ' + stationData.name;
        station.label = this.add.text(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE - 2,
            labelText,
            {
                fontSize: '10px',
                fontFamily: 'Courier New, monospace',
                color: '#f4e4c1',
                backgroundColor: '#2c1810',
                padding: { x: 3, y: 1 }
            }
        );
        station.label.setDepth(55);
        station.label.setOrigin(0.5, 1);
        
        // Scale up placement animation
        station.sprite.setScale(0);
        this.tweens.add({
            targets: station.sprite,
            scale: 1,
            duration: 200,
            ease: 'Back.out'
        });
        
        cell.station = station;
        this.entities.push(station);
        
        // Particle effect
        this.emitParticles(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 'sparkle', 5);
        
        // Track for bots
        this.trackAction('place_station', { x, y, type });
        
        // Update recipe hint if it's a processor
        this.updateRecipeHint(station);
        
        // Tutorial advancement for Level 2
        if (this.tutorialActive && this.levelId === 2 && this.tutorialSteps) {
            const step = this.tutorialSteps[this.tutorialStep];
            if (step) {
                if (step.target === 'place_mixer' && type === 'mixer') {
                    this.advanceTutorial();
                } else if (step.target === 'place_oven' && type === 'oven') {
                    this.advanceTutorial();
                }
            }
        }
    }

    removeStation(x, y) {
        const cell = this.grid[x][y];
        if (!cell.station) return;
        if (!cell.station.removable) {
            return;
        }
        
        const station = cell.station;
        if (station.sprite) station.sprite.destroy();
        if (station.itemSprite) station.itemSprite.destroy();
        if (station.progressBar) station.progressBar.destroy();
        if (station.label) station.label.destroy();
        if (station.recipeHint) station.recipeHint.destroy();
        
        const idx = this.entities.indexOf(station);
        if (idx > -1) this.entities.splice(idx, 1);
        
        cell.station = null;
        
        this.emitParticles(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 'steam', 3);
    }

    placeBelt(x, y, direction) {
        const cell = this.grid[x][y];
        
        const belt = {
            x, y,
            direction,
            item: null,
            itemSprite: null,
            sprite: null
        };
        
        belt.sprite = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            `belt_${direction}`
        );
        belt.sprite.setDepth(5);
        
        cell.belt = belt;
        this.belts.push(belt);
        
        this.tweens.add({
            targets: belt.sprite,
            scale: 0,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Back.out'
        });
    }

    removeBelt(x, y) {
        const cell = this.grid[x][y];
        if (!cell.belt) return;
        
        const belt = cell.belt;
        if (belt.sprite) belt.sprite.destroy();
        if (belt.itemSprite) belt.itemSprite.destroy();
        
        const idx = this.belts.indexOf(belt);
        if (idx > -1) this.belts.splice(idx, 1);
        
        cell.belt = null;
    }

    dispenseItem(x, y) {
        const cell = this.grid[x][y];
        if (!cell.station || cell.station.type !== 'dispenser') return;
        
        let itemType = null;
        
        // If dispenser has a configured type, use it
        if (cell.station.dispenserType) {
            itemType = cell.station.dispenserType;
        } else {
            // Get available items from this dispenser
            const availableItems = this.levelData.allowedItems.filter(item => 
                !ITEMS[item].processable === false || ITEMS[item].processable
            );
            
            // Simple: dispenser gives first allowed raw item
            const rawItems = availableItems.filter(item => 
                ['wheat', 'tomato', 'cheese', 'egg', 'milk', 'apple', 'fish'].includes(item)
            );
            
            if (rawItems.length > 0) {
                itemType = rawItems[0];
            }
        }
        
        if (itemType) {
            this.createHeldItem(itemType);
            
            // Track for bots
            this.trackAction('dispense', { item: itemType });
            
            // Tutorial
            if (this.tutorialActive && this.tutorialSteps) {
                const step = this.tutorialSteps[this.tutorialStep];
                if (step && (step.target === 'dispenser' || step.target === 'dispenser_wheat' || step.target === 'dispenser_egg_milk')) {
                    this.advanceTutorial();
                }
            }
        }
    }

    pickupItem(x, y) {
        const cell = this.grid[x][y];
        if (!cell.station || !cell.station.outputItem) return;
        
        const itemType = cell.station.outputItem;
        
        // Remove from station
        cell.station.outputItem = null;
        if (cell.station.itemSprite) {
            cell.station.itemSprite.destroy();
            cell.station.itemSprite = null;
        }
        
        // Hold it
        this.createHeldItem(itemType);
        
        this.trackAction('pickup', { x, y, item: itemType });
        
        // Tutorial
        if (this.tutorialActive && this.tutorialSteps) {
            const step = this.tutorialSteps[this.tutorialStep];
            if (step) {
                if (step.target === 'pickup' && this.levelId === 1) {
                    this.advanceTutorial();
                } else if (step.target === 'pickup_dough' && itemType === 'dough') {
                    this.advanceTutorial();
                } else if (step.target === 'pickup_bread' && itemType === 'bread') {
                    this.advanceTutorial();
                }
            }
        }
    }

    tryPlaceItem(x, y) {
        if (!this.heldItem || !this.isValidGridPos(x, y)) return;
        
        const itemType = this.heldItem.type;
        const cell = this.grid[x][y];
        
        
        // Try to place on station
        if (cell.station) {
            this.placeItemOnStation(x, y, itemType);
        }
        // Try to place on belt
        else if (cell.belt && !cell.belt.item) {
            cell.belt.item = itemType;
            this.updateBeltItemSprite(cell.belt);
            this.clearHeldItem();
        }
        
        this.trackAction('place_item', { x, y, item: itemType });
    }

    placeItemOnStation(x, y, itemType) {
        const cell = this.grid[x][y];
        const station = cell.station;
        
        if (!station) {
            return;
        }
        
        
        // Counter - try to fulfill order
        if (station.type === 'counter') {
            this.tryFulfillOrder(x, y, itemType);
            return;
        }
        
        // Trash - destroy item
        if (station.type === 'trash') {
            this.clearHeldItem();
            this.emitParticles(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 'steam', 3);
            return;
        }
        
        // Plate station - plate any item
        if (station.type === 'plate_station') {
            this.clearHeldItem();
            station.outputItem = itemType;
            this.updateStationItemSprite(station);
            this.emitParticles(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 'sparkle', 5);
            
            // Tutorial
            if (this.tutorialActive && this.tutorialSteps) {
                const step = this.tutorialSteps[this.tutorialStep];
                if (step && step.target === 'plate') {
                    this.advanceTutorial();
                }
            }
            return;
        }

        // Processor - check recipe
        if (station.data.type === 'processor') {
            // Add to inputs
            station.inputs.push(itemType);
            this.clearHeldItem();
            
            // Check if recipe complete
            this.checkRecipe(station);
            this.updateStationItemSprite(station);
            this.updateRecipeHint(station);
            
            // Tutorial: oven_dough
            if (this.tutorialActive && this.tutorialSteps && station.type === 'oven' && itemType === 'dough') {
                const step = this.tutorialSteps[this.tutorialStep];
                if (step && step.target === 'oven_dough') {
                    this.advanceTutorial();
                }
            }
        }
    }

    updateRecipeHint(station) {
        if (station.recipeHint) {
            station.recipeHint.destroy();
            station.recipeHint = null;
        }
        
        // Don't show hint if processing or has output
        if (station.processing || station.outputItem) return;
        
        // Don't show hint if not a processor
        if (station.data.type !== 'processor') return;
        
        // Get all possible inputs for this station
        const neededItems = new Set();
        for (const recipeKey of station.data.recipes || []) {
            const recipe = RECIPES[recipeKey];
            if (!recipe) continue;
            for (const inp of recipe.inputs) {
                // Only show if not already in inputs
                const countInInputs = station.inputs.filter(i => i === inp.item).length;
                if (countInInputs < inp.qty) {
                    neededItems.add(inp.item);
                }
            }
        }
        
        if (neededItems.size === 0) return;
        
        // Create a container with tiny ingredient icons
        const items = Array.from(neededItems);
        const startX = station.x * TILE_SIZE + TILE_SIZE / 2 - (items.length - 1) * 10;
        const y = station.y * TILE_SIZE - 10;
        
        const container = this.add.container(startX, y);
        container.setDepth(25);
        
        // Background pill
        const bg = this.add.rectangle(0, 0, items.length * 22 + 6, 24, 0x2c1810, 0.85);
        bg.setOrigin(0, 0.5);
        bg.x = -3;
        container.add(bg);
        
        for (let i = 0; i < items.length; i++) {
            const icon = this.add.image(i * 20 + 10, 0, `item_${items[i]}`);
            icon.setScale(0.4);
            icon.setAlpha(0.7);
            container.add(icon);
        }
        
        station.recipeHint = container;
    }

    isCookedItem(itemType) {
        const cooked = ['bread', 'pizza', 'toast', 'fried_fish', 'apple_pie', 'omelette', 'milkshake', 'sliced_tomato', 'dough'];
        return cooked.includes(itemType);
    }

    checkRecipe(station) {
        if (station.processing || station.outputItem) return;
        
        // Find matching recipe
        for (const recipeKey of station.data.recipes || []) {
            const recipe = RECIPES[recipeKey];
            if (!recipe) continue;
            
            // Check if all inputs present
            const needed = [...recipe.inputs];
            const used = [];
            
            for (const input of station.inputs) {
                const idx = needed.findIndex(n => n.item === input);
                if (idx > -1) {
                    used.push(input);
                    needed.splice(idx, 1);
                }
            }
            
            if (needed.length === 0) {
                // Start processing
                station.processing = true;
                station.recipe = recipe;
                station.inputs = station.inputs.filter(i => !used.includes(i));
                station.progress = 0;
                
                // Create progress bar
                this.createProgressBar(station);
                
                // Processing timer
                this.time.delayedCall(recipe.time, () => {
                    this.finishProcessing(station);
                });
                
                return;
            }
        }
    }

    createProgressBar(station) {
        const x = station.x * TILE_SIZE + TILE_SIZE / 2;
        const y = station.y * TILE_SIZE + TILE_SIZE - 5;
        
        station.progressBar = this.add.rectangle(x, y, 52, 6, 0x00ff00);
        station.progressBar.setDepth(50);
        
        // Animate progress
        this.tweens.add({
            targets: station.progressBar,
            scaleX: 0,
            duration: station.recipe.time,
            ease: 'Linear'
        });
    }

    finishProcessing(station) {
        station.processing = false;
        station.outputItem = station.recipe.output;
        station.recipe = null;
        
        if (station.progressBar) {
            station.progressBar.destroy();
            station.progressBar = null;
        }
        
        this.updateStationItemSprite(station);
        this.updateRecipeHint(station);
        this.emitParticles(
            station.x * TILE_SIZE + TILE_SIZE / 2,
            station.y * TILE_SIZE + TILE_SIZE / 2,
            'sparkle',
            10
        );
        
        // Tutorial
        if (this.tutorialActive) {
            this.advanceTutorial();
        }
    }

    updateStationItemSprite(station) {
        if (station.itemSprite) {
            station.itemSprite.destroy();
            station.itemSprite = null;
        }
        
        let itemType = station.outputItem;
        if (!itemType && station.inputs.length > 0) {
            itemType = station.inputs[station.inputs.length - 1];
        }
        
        if (itemType) {
            station.itemSprite = this.add.image(
                station.x * TILE_SIZE + TILE_SIZE / 2,
                station.y * TILE_SIZE + TILE_SIZE / 2 - 8,
                `item_${itemType}`
            );
            station.itemSprite.setDepth(20);
            station.itemSprite.setScale(0.8);
        }
    }

    updateBeltItemSprite(belt) {
        if (belt.itemSprite) {
            belt.itemSprite.destroy();
            belt.itemSprite = null;
        }
        
        if (belt.item) {
            belt.itemSprite = this.add.image(
                belt.x * TILE_SIZE + TILE_SIZE / 2,
                belt.y * TILE_SIZE + TILE_SIZE / 2,
                `item_${belt.item}`
            );
            belt.itemSprite.setDepth(15);
            belt.itemSprite.setScale(0.7);
        }
    }

    moveBelts() {
        // Collect all moves first, then apply them to avoid items moving multiple times
        const moves = [];
        const processedBelts = new Set();
        
        for (const belt of this.belts) {
            if (!belt.item || processedBelts.has(belt)) continue;
            
            let nextX = belt.x;
            let nextY = belt.y;
            
            switch (belt.direction) {
                case 'right': nextX++; break;
                case 'left': nextX--; break;
                case 'down': nextY++; break;
                case 'up': nextY--; break;
            }
            
            if (!this.isValidGridPos(nextX, nextY)) continue;
            
            const nextCell = this.grid[nextX][nextY];
            
            // If next cell has a station that can accept the item
            if (nextCell.station) {
                const station = nextCell.station;
                if (station.type === 'counter' || station.type === 'plate_station' || 
                    station.data.type === 'processor' || station.type === 'trash') {
                    moves.push({ type: 'station', belt, x: nextX, y: nextY });
                    processedBelts.add(belt);
                    continue;
                }
            }
            
            // If next cell has an empty belt
            if (nextCell.belt && !nextCell.belt.item && !processedBelts.has(nextCell.belt)) {
                moves.push({ type: 'belt', from: belt, to: nextCell.belt });
                processedBelts.add(belt);
                processedBelts.add(nextCell.belt);
            }
        }
        
        // Apply moves
        for (const move of moves) {
            if (move.type === 'station') {
                this.placeItemOnStation(move.x, move.y, move.belt.item);
                move.belt.item = null;
                this.updateBeltItemSprite(move.belt);
            } else if (move.type === 'belt') {
                move.to.item = move.from.item;
                this.updateBeltItemSprite(move.to);
                move.from.item = null;
                this.updateBeltItemSprite(move.from);
            }
        }
    }

    clearHeldItem() {
        if (this.heldItem) {
            if (this.heldItem.sprite) this.heldItem.sprite.destroy();
            if (this.heldItem.glow) this.heldItem.glow.destroy();
            this.heldItem = null;
        }
    }

    createHeldItem(itemType) {
        this.clearHeldItem();
        
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        // Glow behind the item
        const glow = this.add.circle(worldPoint.x, worldPoint.y, 28, 0xffffff, 0.4);
        glow.setDepth(199);
        
        // Item sprite
        const sprite = this.add.image(worldPoint.x, worldPoint.y, `item_${itemType}`);
        sprite.setDepth(200);
        sprite.setScale(1.6);
        
        this.heldItem = { type: itemType, sprite, glow };
    }

    // ========== CUSTOMER & ORDER SYSTEM ==========
    
    checkCustomerSpawns() {
        if (this.isPaused || this.gameWon) return;
        
        // Find counter positions
        const counters = [];
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if (this.grid[x][y].station?.type === 'counter') {
                    counters.push({ x, y });
                }
            }
        }
        
        if (counters.length === 0) return;
        
        // Spawn customers based on level data
        for (const customerData of this.levelData.customers) {
            if (customerData.spawned) continue;
            
            const elapsed = this.sceneTime;
            const delay = customerData.delay || 0;
            
            if (elapsed >= delay && this.customers.length < counters.length) {
                this.spawnCustomer(customerData, counters);
                customerData.spawned = true;
            }
        }
    }

    spawnCustomer(data, counters) {
        const customerInfo = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
        const counter = counters.find(c => !this.customers.find(cust => cust.counterX === c.x && cust.counterY === c.y));
        
        if (!counter) return;
        
        const customer = {
            ...data,
            ...customerInfo,
            counterX: counter.x,
            counterY: counter.y,
            patience: data.patience,
            maxPatience: data.patience,
            sprite: null,
            bubble: null,
            itemIcon: null,
            progressBar: null,
            satisfied: false
        };
        
        // Create customer sprite above counter
        const cx = counter.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = counter.y * TILE_SIZE - 48;
        customer.sprite = this.add.image(cx, cy, `customer_${CUSTOMERS.indexOf(customerInfo)}`);
        customer.sprite.setDepth(30);
        customer.sprite.setScale(0.9);
        
        // Big thought bubble background
        const bubbleX = cx + 36;
        const bubbleY = cy - 30;
        customer.bubble = this.add.rectangle(bubbleX, bubbleY, TILE_SIZE, TILE_SIZE, 0xffffff, 0.95);
        customer.bubble.setDepth(35);
        customer.bubble.setStrokeStyle(3, 0x3d2817);
        
        // Wanted item icon
        customer.itemIcon = this.add.image(bubbleX, bubbleY, `item_${data.wants}`);
        customer.itemIcon.setDepth(36);
        customer.itemIcon.setScale(1.0);
        
        // Patience bar above customer
        customer.progressBar = this.add.rectangle(cx, cy - 48, 52, 6, 0x00ff00);
        customer.progressBar.setDepth(35);
        
        this.customers.push(customer);
        this.totalCustomers++;
        
        // Animate in: slide from above
        const startY = cy - 80;
        customer.sprite.y = startY;
        customer.bubble.y = startY - 30;
        customer.bubble.alpha = 0;
        customer.itemIcon.y = startY - 30;
        customer.itemIcon.alpha = 0;
        customer.progressBar.alpha = 0;
        
        this.tweens.add({
            targets: [customer.sprite, customer.bubble, customer.itemIcon, customer.progressBar],
            y: '+=80',
            alpha: 1,
            duration: 600,
            ease: 'Back.out'
        });
        
        // Idle bounce
        this.tweens.add({
            targets: customer.sprite,
            y: cy - 4,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
    }

    tryFulfillOrder(x, y, itemType) {
        const customer = this.customers.find(c => 
            c.counterX === x && c.counterY === y && !c.satisfied
        );
        
        if (!customer) return;
        
        if (customer.wants === itemType) {
            // Success!
            this.fulfillOrder(customer);
        } else {
            // Wrong item - reject
            this.showFloatingText(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE - 50, '❌', 0xff0000);
        }
    }

    fulfillOrder(customer) {
        customer.satisfied = true;
        this.ordersCompleted++;
        
        // Clear held item
        this.clearHeldItem();
        
        // Remove from counter station
        const cell = this.grid[customer.counterX][customer.counterY];
        if (cell.station) {
            cell.station.outputItem = null;
            this.updateStationItemSprite(cell.station);
        }
        
        const cx = customer.counterX * TILE_SIZE + TILE_SIZE / 2;
        const cy = customer.counterY * TILE_SIZE - 20;
        
        // Big celebration effects
        this.emitParticles(cx, cy, 'heart', 25);
        this.emitParticles(cx, cy, 'sparkle', 15);
        
        // Big YUM text
        this.showFloatingText(cx, cy - 50, 'YUM!', 0xffd700);
        
        // Customer happy bounce
        this.tweens.add({
            targets: customer.sprite,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            repeat: 1
        });
        
        // Animate customer leaving after a short delay
        this.time.delayedCall(600, () => {
            this.tweens.add({
                targets: [customer.sprite, customer.bubble, customer.itemIcon, customer.progressBar],
                alpha: 0,
                y: customer.sprite.y - 60,
                duration: 600,
                onComplete: () => {
                    this.removeCustomer(customer);
                }
            });
        });
        
        // Check win condition
        this.checkWinCondition();
        
        // Tutorial
        if (this.tutorialActive) {
            this.advanceTutorial();
        }
    }

    removeCustomer(customer) {
        if (customer.sprite) customer.sprite.destroy();
        if (customer.bubble) customer.bubble.destroy();
        if (customer.itemIcon) customer.itemIcon.destroy();
        if (customer.progressBar) customer.progressBar.destroy();
        
        const idx = this.customers.indexOf(customer);
        if (idx > -1) this.customers.splice(idx, 1);
    }

    updateCustomers(dt) {
        for (const customer of this.customers) {
            if (customer.satisfied) continue;
            
            customer.patience -= dt;
            
            // Update patience bar
            if (customer.progressBar) {
                const ratio = Math.max(0, customer.patience / customer.maxPatience);
                customer.progressBar.scaleX = ratio;
                
                if (ratio < 0.3) {
                    customer.progressBar.fillColor = 0xff0000;
                } else if (ratio < 0.6) {
                    customer.progressBar.fillColor = 0xff9800;
                }
            }
            
            // Impatient bounce
            if (customer.patience < 10000 && Math.floor(this.time.now / 500) % 2 === 0) {
                customer.sprite.x += Math.sin(this.time.now / 200) * 0.5;
            }
            
            // Leave if out of patience
            if (customer.patience <= 0) {
                this.customerLeave(customer);
            }
        }
    }

    customerLeave(customer) {
        customer.satisfied = true;
        
        this.showFloatingText(
            customer.counterX * TILE_SIZE + TILE_SIZE / 2,
            customer.counterY * TILE_SIZE - 60,
            '😢',
            0x666666
        );
        
        this.tweens.add({
            targets: [customer.sprite, customer.bubble, customer.itemIcon, customer.progressBar],
            alpha: 0,
            x: customer.sprite.x - 50,
            duration: 800,
            onComplete: () => {
                this.removeCustomer(customer);
                this.checkWinCondition();
            }
        });
    }

    checkWinCondition() {
        const allSpawned = this.levelData.customers.every(c => c.spawned);
        const activeCustomers = this.customers.filter(c => !c.satisfied);
        const allDone = activeCustomers.length === 0;
        
        if (allSpawned && allDone && !this.gameWon) {
            const success = this.ordersCompleted >= this.levelData.objectives.customers;
            
            if (success) {
                this.gameWon = true;
                this.showWinScreen();
            } else {
                this.gameWon = true;
                this.showFailScreen();
            }
        }
    }

    // ========== TOOLBAR ==========
    
    createToolbar() {
        const sw = this.scale.width;
        const sh = this.scale.height;
        
        
        // Collect all tools
        const tools = [];
        for (const stationKey of this.levelData.allowedStations) {
            tools.push({ key: stationKey, texture: `station_${stationKey}` });
        }
        if (this.levelId >= 3) {
            ['right', 'down', 'left', 'up'].forEach(dir => {
                tools.push({ key: `belt_${dir}`, texture: `belt_${dir}` });
            });
        }
        tools.push({ key: 'clear', text: 'X' });
        
        // Button sizing
        const baseBtn = 96;
        const pad = 12;
        const pauseW = baseBtn + pad * 2;
        const availW = sw - pauseW;
        const needW = tools.length * (baseBtn + pad);
        const btnScale = needW > availW ? (availW / needW) : 1;
        
        const btnSize = Math.max(TILE_SIZE, Math.floor(baseBtn * btnScale));
        const spacing = btnSize + pad;
        const toolbarH = btnSize + 32;
        this.toolbarHeight = toolbarH;
        
        // Background
        this.toolbarBg = this.add.rectangle(sw / 2, sh - toolbarH / 2, sw, toolbarH, 0x1a0f08, 0.95);
        this.toolbarBg.setDepth(100);
        this.toolbarBg.setScrollFactor(0);
        
        // Layout buttons
        const totalW = tools.length * spacing;
        let x = (sw - totalW - pauseW) / 2 + btnSize / 2;
        const y = sh - toolbarH / 2;
        
        this.toolButtons = [];
        for (const tool of tools) {
            if (tool.text) {
                this.createToolButton(x, y, tool.key, null, tool.text, btnSize);
            } else {
                this.createToolButton(x, y, tool.key, tool.texture, null, btnSize);
            }
            x += spacing;
        }
        
        // Pause button
        this.createToolButton(sw - btnSize / 2 - pad, y, 'pause', null, '||', btnSize);
        
    }

    createToolButton(x, y, toolKey, texture, text, size = 80) {
        const scale = size / 80;
        const btn = this.add.image(x, y, 'ui_button');
        btn.setDepth(101);
        btn.setScrollFactor(0);
        btn.setScale(scale);
        btn.baseScale = scale;
        btn.setInteractive({ useHandCursor: true });
        
        let icon;
        if (texture) {
            icon = this.add.image(x, y, texture);
            icon.setDepth(102);
            icon.setScrollFactor(0);
            icon.setScale(0.7 * scale);
        } else if (text) {
            icon = this.add.text(x, y, text, {
                fontSize: `${Math.floor(24 * scale)}px`,
                fontFamily: 'Courier New, monospace',
                color: '#f4e4c1'
            });
            icon.setDepth(102);
            icon.setScrollFactor(0);
            icon.setOrigin(0.5);
        }
        
        // Label below button
        let label = null;
        if (STATIONS[toolKey]) {
            const labelText = STATIONS[toolKey].emoji;
            label = this.add.text(x, y + size / 2 + 4, labelText, {
                fontSize: `${Math.floor(12 * scale)}px`
            });
            label.setDepth(103);
            label.setScrollFactor(0);
            label.setOrigin(0.5, 0);
        } else if (toolKey.startsWith('belt_')) {
            const dir = toolKey.replace('belt_', '');
            const arrows = { right: '→', left: '←', up: '↑', down: '↓' };
            label = this.add.text(x, y + size / 2 + 4, arrows[dir] || '→', {
                fontSize: `${Math.floor(12 * scale)}px`,
                color: '#f4e4c1'
            });
            label.setDepth(103);
            label.setScrollFactor(0);
            label.setOrigin(0.5, 0);
        }
        
        btn.on('pointerdown', () => {
            if (toolKey === 'pause') {
                this.togglePause();
                return;
            }
            if (toolKey === 'clear') {
                this.selectedTool = null;
                this.clearHeldItem();
                this.updateToolSelection();
                return;
            }
            this.selectedTool = toolKey;
            this.clearHeldItem();
            this.updateToolSelection();
        });
        
        this.toolButtons.push({ btn, icon, label, key: toolKey });
    }

    updateToolSelection() {
        for (const tb of this.toolButtons) {
            const baseScale = tb.btn.baseScale || 1;
            if (tb.key === this.selectedTool) {
                tb.btn.setTexture('ui_button_pressed');
                tb.btn.setScale(baseScale * 1.1);
            } else {
                tb.btn.setTexture('ui_button');
                tb.btn.setScale(baseScale);
            }
        }
    }

    // ========== LEVEL UI ==========
    
    createLevelUI() {
        const sw = this.scale.width;
        const sh = this.scale.height;
        const pad = 16;
        
        
        // Level name background
        this.levelTextBg = this.add.rectangle(180, 22, 360, 44, 0x5d3a1a, 0.95);
        this.levelTextBg.setDepth(99);
        this.levelTextBg.setScrollFactor(0);
        
        // Level name
        this.levelText = this.add.text(pad, pad, `Level ${this.levelId}: ${this.levelData.name}`, {
            fontSize: '22px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff'
        });
        this.levelText.setDepth(100);
        this.levelText.setScrollFactor(0);
        
        // Progress background
        this.progressTextBg = this.add.rectangle(140, 62, 280, 32, 0x3d2817, 0.95);
        this.progressTextBg.setDepth(99);
        this.progressTextBg.setScrollFactor(0);
        
        // Progress
        this.progressText = this.add.text(pad, pad + 40, `Orders: 0/${this.levelData.objectives.customers}`, {
            fontSize: '18px',
            fontFamily: 'Courier New, monospace',
            color: '#f4e4c1'
        });
        this.progressText.setDepth(100);
        this.progressText.setScrollFactor(0);
        
    }

    updateLevelUI() {
        this.progressText.setText(`Orders: ${this.ordersCompleted}/${this.levelData.objectives.customers}`);
    }

    createRecipeBook() {
        const sw = this.scale.width;
        const sh = this.scale.height;
        
        // Only show if there are recipes
        const recipes = this.levelData.recipes || [];
        if (recipes.length === 0) return;
        
        const panelW = 200;
        const panelH = recipes.length * 52 + 42;
        const px = sw - panelW - 14;
        const py = 90;
        
        // Background
        this.recipeBg = this.add.rectangle(px + panelW / 2, py + panelH / 2, panelW, panelH, 0x2c1810, 0.95);
        this.recipeBg.setDepth(99);
        this.recipeBg.setScrollFactor(0);
        this.recipeBg.setStrokeStyle(2, 0x5d3a1a);
        
        // Title
        this.recipeTitle = this.add.text(px + panelW / 2, py + 14, 'Recipes', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#f4e4c1'
        });
        this.recipeTitle.setDepth(100);
        this.recipeTitle.setScrollFactor(0);
        this.recipeTitle.setOrigin(0.5);
        
        // Recipe entries
        this.recipeEntries = [];
        for (let i = 0; i < recipes.length; i++) {
            const recipeKey = recipes[i];
            const recipe = RECIPES[recipeKey];
            if (!recipe) continue;
            
            const y = py + 42 + i * 52;
            const entry = this.add.container(px + panelW / 2, y);
            entry.setDepth(100);
            entry.setScrollFactor(0);
            
            // Input icons
            let offsetX = -(recipe.inputs.length * 16 + 22) / 2 + 12;
            for (const inp of recipe.inputs) {
                const icon = this.add.image(offsetX, 0, `item_${inp.item}`);
                icon.setScale(0.5);
                entry.add(icon);
                offsetX += 18;
            }
            
            // Arrow
            const arrow = this.add.text(offsetX, 0, '→', {
                fontSize: '14px',
                color: '#f4e4c1'
            });
            arrow.setOrigin(0.5);
            entry.add(arrow);
            offsetX += 18;
            
            // Output icon
            const outIcon = this.add.image(offsetX, 0, `item_${recipe.output}`);
            outIcon.setScale(0.5);
            entry.add(outIcon);
            
            // Station icon
            const stationIcon = this.add.image(offsetX + 20, 0, `station_${recipe.station}`);
            stationIcon.setScale(0.35);
            entry.add(stationIcon);
            
            this.recipeEntries.push(entry);
        }
    }

    // ========== PARTICLES & EFFECTS ==========
    
    createParticles() {
        this.particleEmitters = {};
        
        ['sparkle', 'steam', 'heart'].forEach(type => {
            const particles = this.add.particles(0, 0, type, {
                speed: { min: 50, max: 150 },
                scale: { start: 1, end: 0 },
                lifespan: 1000,
                quantity: 1,
                emitting: false
            });
            particles.setDepth(200);
            this.particleEmitters[type] = particles;
        });
    }

    emitParticles(x, y, type, count) {
        const emitter = this.particleEmitters[type];
        if (emitter) {
            emitter.emitParticleAt(x, y, count);
        }
    }

    showFloatingText(x, y, text, color) {
        const txt = this.add.text(x, y, text, {
            fontSize: '24px',
            fontFamily: 'Courier New, monospace',
            color: typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : '#ffffff'
        });
        txt.setDepth(200);
        txt.setOrigin(0.5);
        
        this.tweens.add({
            targets: txt,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            onComplete: () => txt.destroy()
        });
    }

    centerCameraOnGrid() {
        const gridW = this.gridWidth * TILE_SIZE;
        const gridH = this.gridHeight * TILE_SIZE;
        const cx = gridW / 2;
        const cy = gridH / 2;
        
        const vw = this.scale.width;
        const vh = this.scale.height;
        
        // Default zoom: 1.0 (48px tiles — comfortable tap size for kids)
        let zoom = 1.0;
        
        // Only zoom OUT if the grid is too big for the viewport
        // Leave padding for UI: 80px top, 120px bottom, 20px sides
        const maxZoomX = (vw - 50) / gridW;
        const maxZoomY = (vh - 250) / gridH;
        const maxZoom = Math.min(maxZoomX, maxZoomY);
        
        if (maxZoom < 1.0) {
            zoom = maxZoom;
        }
        
        // Hard floor so tiles don't get microscopic
        zoom = Math.max(0.5, zoom);
        
        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(cx, cy);
        
    }

    // ========== GAME LOOP ==========
    
    update(time, delta) {
        if (this.isPaused) return;
        
        // Update scene time
        this.sceneTime += delta;
        
        // Update held item position
        if (this.heldItem && this.heldItem.sprite) {
            const pointer = this.input.activePointer;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.heldItem.sprite.setPosition(worldPoint.x, worldPoint.y);
            if (this.heldItem.glow) {
                this.heldItem.glow.setPosition(worldPoint.x, worldPoint.y);
            }
        }
        
        // Update customers
        this.updateCustomers(delta);
        
        // Update level UI
        this.updateLevelUI();
        
        // Update bots
        this.updateBots(delta);
    }

    gameTick() {
        if (this.isPaused) return;
        
        // Update processing stations
        for (const entity of this.entities) {
            if (entity.processing && entity.progressBar) {
                // Progress bar is handled by tween, but we can add visual effects here
            }
        }
    }

    // ========== SETUP LEVEL ==========
    
    setupLevel() {
        this.levelStartTime = this.time.now;
        
        // Pre-place some stations for early levels
        if (this.levelId === 1) {
            this.placeStation(2, 3, 'dispenser');
            this.placeStation(6, 3, 'plate_station');
            this.placeStation(6, 5, 'counter');
            this.grid[2][3].station.dispenserType = 'wheat';
        } else if (this.levelId === 2) {
            this.placeStation(2, 2, 'dispenser');
            this.placeStation(2, 4, 'dispenser');
            this.placeStation(2, 6, 'dispenser');
            this.grid[2][2].station.dispenserType = 'wheat';
            this.grid[2][4].station.dispenserType = 'egg';
            this.grid[2][6].station.dispenserType = 'milk';
        }
        
        // Reset customer spawn tracking
        this.levelData.customers.forEach(c => c.spawned = false);
    }

    // ========== PAUSE / WIN / LOSE ==========
    
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.tweens.pauseAll();
            
            this.pauseOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x000000, 0.7
            );
            this.pauseOverlay.setDepth(500);
            this.pauseOverlay.setScrollFactor(0);
            
            this.pauseText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                'PAUSED',
                { fontSize: '48px', fontFamily: 'Courier New, monospace', color: '#f4e4c1' }
            );
            this.pauseText.setDepth(501);
            this.pauseText.setScrollFactor(0);
            this.pauseText.setOrigin(0.5);
        } else {
            this.tweens.resumeAll();
            if (this.pauseOverlay) this.pauseOverlay.destroy();
            if (this.pauseText) this.pauseText.destroy();
        }
    }

    showWinScreen() {
        // Calculate stars
        const ratio = this.ordersCompleted / this.totalCustomers;
        let stars = 1;
        if (ratio >= 0.7) stars = 2;
        if (ratio >= 0.9) stars = 3;
        
        // Save progress
        if (!GAME_STATE.levelStars[this.levelId] || stars > GAME_STATE.levelStars[this.levelId]) {
            GAME_STATE.levelStars[this.levelId] = stars;
        }
        
        // Unlock next level
        const nextLevel = LEVELS.find(l => l.id === this.levelId + 1);
        if (nextLevel) {
            nextLevel.unlocked = true;
            if (!GAME_STATE.unlockedLevels.includes(nextLevel.id)) {
                GAME_STATE.unlockedLevels.push(nextLevel.id);
            }
        }
        
        GAME_STATE.currentLevel = this.levelId + 1;
        saveGameState();
        
        // Show win UI
        this.winOverlay = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000, 0.8
        );
        this.winOverlay.setDepth(500);
        this.winOverlay.setScrollFactor(0);
        
        this.winPanel = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2,
            'ui_panel'
        );
        this.winPanel.setDepth(501);
        this.winPanel.setScrollFactor(0);
        this.winPanel.setScale(1.5);
        
        this.winText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 40,
            'Level Complete!',
            { fontSize: '32px', fontFamily: 'Courier New, monospace', color: '#f4e4c1' }
        );
        this.winText.setDepth(502);
        this.winText.setScrollFactor(0);
        this.winText.setOrigin(0.5);
        
        // Stars
        for (let i = 0; i < 3; i++) {
            const star = this.add.image(
                this.scale.width / 2 - 48 + i * 48,
                this.scale.height / 2 + 14,
                i < stars ? 'star_filled' : 'star_empty'
            );
            star.setDepth(502);
            star.setScrollFactor(0);
            
            if (i < stars) {
                star.setScale(0);
                this.tweens.add({
                    targets: star,
                    scale: 1,
                    duration: 300,
                    delay: i * 200,
                    ease: 'Back.out'
                });
            }
        }
        
        // Next level button
        const nextBtn = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2 + 60,
            'ui_button'
        );
        nextBtn.setDepth(502);
        nextBtn.setScrollFactor(0);
        nextBtn.setInteractive({ useHandCursor: true });
        
        const nextText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 60,
            nextLevel ? 'Next Level' : 'All Done!',
            { fontSize: '20px', fontFamily: 'Courier New, monospace', color: '#f4e4c1' }
        );
        nextText.setDepth(503);
        nextText.setScrollFactor(0);
        nextText.setOrigin(0.5);
        
        nextBtn.on('pointerdown', () => {
            if (nextLevel) {
                this.scene.restart({ levelId: nextLevel.id });
            } else {
                // Return to level select or restart
                this.scene.restart({ levelId: 1 });
            }
        });
        
        // Retry button
        const retryBtn = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2 + 120,
            'ui_button'
        );
        retryBtn.setDepth(502);
        retryBtn.setScrollFactor(0);
        retryBtn.setInteractive({ useHandCursor: true });
        
        const retryText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 120,
            'Replay',
            { fontSize: '20px', fontFamily: 'Courier New, monospace', color: '#f4e4c1' }
        );
        retryText.setDepth(503);
        retryText.setScrollFactor(0);
        retryText.setOrigin(0.5);
        
        retryBtn.on('pointerdown', () => {
            this.scene.restart({ levelId: this.levelId });
        });
    }

    showFailScreen() {
        this.failOverlay = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000, 0.8
        );
        this.failOverlay.setDepth(500);
        this.failOverlay.setScrollFactor(0);
        
        this.failText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            'Try Again!',
            { fontSize: '32px', fontFamily: 'Courier New, monospace', color: '#f4e4c1' }
        );
        this.failText.setDepth(501);
        this.failText.setScrollFactor(0);
        this.failText.setOrigin(0.5);
        
        const retryBtn = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2 + 60,
            'ui_button'
        );
        retryBtn.setDepth(501);
        retryBtn.setScrollFactor(0);
        retryBtn.setInteractive({ useHandCursor: true });
        
        const retryText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 60,
            'Retry',
            { fontSize: '20px', fontFamily: 'Courier New, monospace', color: '#f4e4c1' }
        );
        retryText.setDepth(502);
        retryText.setScrollFactor(0);
        retryText.setOrigin(0.5);
        
        retryBtn.on('pointerdown', () => {
            this.scene.restart({ levelId: this.levelId });
        });
    }

    // ========== TUTORIAL ==========
    
    showTutorial() {
        if (this.levelId === 1) {
            this.tutorialSteps = [
                { text: 'Tap the Dispenser to get wheat!', target: 'dispenser' },
                { text: 'Tap the Plate Station to put wheat on plate!', target: 'plate' },
                { text: 'Tap the plate to pick it up!', target: 'pickup' },
                { text: 'Serve the hungry customer at the counter!', target: 'serve' }
            ];
        } else if (this.levelId === 2) {
            this.tutorialSteps = [
                { text: 'Tap the Mixer button below, then tap an empty tile!', target: 'place_mixer' },
                { text: 'Tap the Oven button, then tap an empty tile!', target: 'place_oven' },
                { text: 'Tap the wheat Dispenser, then the Mixer!', target: 'dispenser_wheat' },
                { text: 'Get egg and milk, put them in the Mixer too!', target: 'dispenser_egg_milk' },
                { text: 'Tap the Mixer to pick up dough!', target: 'pickup_dough' },
                { text: 'Put dough in the Oven!', target: 'oven_dough' },
                { text: 'Tap the Oven to pick up bread!', target: 'pickup_bread' },
                { text: 'Serve the customer at the counter!', target: 'serve_bread' }
            ];
        } else {
            this.tutorialSteps = [];
        }
        this.tutorialStep = 0;
        this.showTutorialStep();
    }

    showTutorialStep() {
        // Clean up old highlight
        if (this.tutorialHighlight) {
            this.tutorialHighlight.destroy();
            this.tutorialHighlight = null;
        }
        if (this.tutorialArrow) {
            this.tutorialArrow.destroy();
            this.tutorialArrow = null;
        }
        
        if (!this.tutorialSteps || this.tutorialStep >= this.tutorialSteps.length) {
            this.tutorialActive = false;
            if (this.tutorialText) this.tutorialText.destroy();
            if (this.tutorialTextBg) this.tutorialTextBg.destroy();
            return;
        }
        
        const step = this.tutorialSteps[this.tutorialStep];
        
        if (this.tutorialText) this.tutorialText.destroy();
        if (this.tutorialTextBg) this.tutorialTextBg.destroy();
        
        const sw = this.scale.width;
        const sh = this.scale.height;
        const toolbarH = this.toolbarHeight || 100;
        const ty = sh - toolbarH - 35;
        
        // Background
        this.tutorialTextBg = this.add.rectangle(sw / 2, ty, sw - 40, 50, 0x3d2817, 0.95);
        this.tutorialTextBg.setDepth(499);
        this.tutorialTextBg.setScrollFactor(0);
        
        // Text
        this.tutorialText = this.add.text(sw / 2, ty, step.text, {
            fontSize: '20px',
            fontFamily: 'Courier New, monospace',
            color: '#f4e4c1',
            align: 'center'
        });
        this.tutorialText.setDepth(500);
        this.tutorialText.setScrollFactor(0);
        this.tutorialText.setOrigin(0.5);
        
        // Bounce
        this.tweens.add({
            targets: this.tutorialText,
            y: ty - 6,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
        this.tweens.add({
            targets: this.tutorialTextBg,
            y: ty - 6,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
        
        // Highlight the target
        this.highlightTutorialTarget(step.target);
    }

    highlightTutorialTarget(targetType) {
        let tx = -1, ty = -1;
        
        const findStation = (type) => {
            for (let x = 0; x < this.gridWidth; x++) {
                for (let y = 0; y < this.gridHeight; y++) {
                    if (this.grid[x][y].station?.type === type) {
                        return { x, y };
                    }
                }
            }
            return null;
        };
        
        if (targetType === 'dispenser') {
            const found = findStation('dispenser');
            if (found) { tx = found.x; ty = found.y; }
        } else if (targetType === 'plate') {
            const found = findStation('plate_station');
            if (found) { tx = found.x; ty = found.y; }
        } else if (targetType === 'pickup') {
            for (let x = 0; x < this.gridWidth; x++) {
                for (let y = 0; y < this.gridHeight; y++) {
                    if (this.grid[x][y].station?.type === 'plate_station' && this.grid[x][y].station?.outputItem) {
                        tx = x; ty = y;
                    }
                }
            }
        } else if (targetType === 'serve') {
            for (let x = 0; x < this.gridWidth; x++) {
                for (let y = 0; y < this.gridHeight; y++) {
                    if (this.grid[x][y].station?.type === 'counter') {
                        const hasCustomer = this.customers.some(c => c.counterX === x && c.counterY === y && !c.satisfied);
                        if (hasCustomer) { tx = x; ty = y; }
                    }
                }
            }
        } else if (targetType === 'place_mixer') {
            // Highlight an empty tile near dispensers
            tx = 5; ty = 3;
        } else if (targetType === 'place_oven') {
            tx = 7; ty = 3;
        } else if (targetType === 'dispenser_wheat') {
            const found = findStation('dispenser');
            if (found) { tx = found.x; ty = found.y; }
        } else if (targetType === 'dispenser_egg_milk') {
            const found = findStation('dispenser');
            if (found) { tx = found.x; ty = found.y; }
        } else if (targetType === 'pickup_dough') {
            const found = findStation('mixer');
            if (found && this.grid[found.x][found.y].station?.outputItem) {
                tx = found.x; ty = found.y;
            }
        } else if (targetType === 'oven_dough') {
            const found = findStation('oven');
            if (found) { tx = found.x; ty = found.y; }
        } else if (targetType === 'pickup_bread') {
            const found = findStation('oven');
            if (found && this.grid[found.x][found.y].station?.outputItem) {
                tx = found.x; ty = found.y;
            }
        } else if (targetType === 'serve_bread') {
            for (let x = 0; x < this.gridWidth; x++) {
                for (let y = 0; y < this.gridHeight; y++) {
                    if (this.grid[x][y].station?.type === 'counter') {
                        const hasCustomer = this.customers.some(c => c.counterX === x && c.counterY === y && !c.satisfied);
                        if (hasCustomer) { tx = x; ty = y; }
                    }
                }
            }
        }
        
        if (tx < 0 || ty < 0) return;
        
        const px = tx * TILE_SIZE + TILE_SIZE / 2;
        const py = ty * TILE_SIZE + TILE_SIZE / 2;
        
        // Pulsing yellow ring
        this.tutorialHighlight = this.add.circle(px, py, TILE_SIZE * 0.5, 0xffeb3b, 0.3);
        this.tutorialHighlight.setDepth(60);
        this.tutorialHighlight.setStrokeStyle(3, 0xffeb3b);
        
        this.tweens.add({
            targets: this.tutorialHighlight,
            scale: 1.4,
            alpha: 0.1,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
        
        // Downward arrow above the target
        this.tutorialArrow = this.add.text(px, py - 52, '👇', {
            fontSize: '28px'
        });
        this.tutorialArrow.setDepth(61);
        this.tutorialArrow.setOrigin(0.5);
        
        this.tweens.add({
            targets: this.tutorialArrow,
            y: py - 44,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
    }

    advanceTutorial() {
        this.tutorialStep++;
        this.showTutorialStep();
    }

    // ========== BOT SYSTEM ==========
    
    trackAction(action, data) {
        this.playerActions.push({ action, data, time: this.time.now });
        
        // Check for repetitive actions to offer bot
        if (this.levelId >= 5 && !this.botOffered) {
            this.checkForBotOffer();
        }
    }

    checkForBotOffer() {
        // Simple heuristic: if player does same action 3 times in 10 seconds
        const recent = this.playerActions.filter(a => this.time.now - a.time < 10000);
        
        if (recent.length >= 3) {
            const last3 = recent.slice(-3);
            const sameAction = last3.every(a => a.action === last3[0].action);
            
            if (sameAction) {
                this.offerBot(last3[0]);
            }
        }
    }

    offerBot(actionData) {
        this.botOffered = true;
        
        // Show offer
        const width = this.scale.width;
        const height = this.scale.height;
        
        const offerText = this.add.text(width / 2, height / 2 - 100, 
            'A Chef Bot wants to help!\nTap to accept.',
            {
                fontSize: '24px',
                fontFamily: 'Courier New, monospace',
                color: '#f4e4c1',
                backgroundColor: '#3d2817',
                padding: { x: 20, y: 10 },
                align: 'center'
            }
        );
        offerText.setDepth(500);
        offerText.setScrollFactor(0);
        offerText.setOrigin(0.5);
        
        const acceptBtn = this.add.image(width / 2, height / 2, 'ui_button');
        acceptBtn.setDepth(500);
        acceptBtn.setScrollFactor(0);
        acceptBtn.setInteractive({ useHandCursor: true });
        
        const acceptText = this.add.text(width / 2, height / 2, 'Accept!', {
            fontSize: '20px', fontFamily: 'Courier New, monospace', color: '#f4e4c1'
        });
        acceptText.setDepth(501);
        acceptText.setScrollFactor(0);
        acceptText.setOrigin(0.5);
        
        acceptBtn.on('pointerdown', () => {
            offerText.destroy();
            acceptBtn.destroy();
            acceptText.destroy();
            this.spawnBot(actionData);
        });
    }

    spawnBot(actionData) {
        // Find empty spot
        let spawnX = 0, spawnY = 0;
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if (!this.grid[x][y].station && !this.grid[x][y].belt) {
                    spawnX = x;
                    spawnY = y;
                    break;
                }
            }
            if (spawnX !== 0) break;
        }
        
        const bot = {
            x: spawnX,
            y: spawnY,
            type: 'mover',
            actionPattern: actionData,
            sprite: this.add.image(
                spawnX * TILE_SIZE + TILE_SIZE / 2,
                spawnY * TILE_SIZE + TILE_SIZE / 2,
                'bot_mover'
            ),
            targetX: spawnX,
            targetY: spawnY,
            holding: null,
            state: 'idle'
        };
        
        bot.sprite.setDepth(25);
        this.bots.push(bot);
        
        // Animation
        bot.sprite.setScale(0);
        this.tweens.add({
            targets: bot.sprite,
            scale: 1,
            duration: 400,
            ease: 'Back.out'
        });
        
        this.emitParticles(
            spawnX * TILE_SIZE + TILE_SIZE / 2,
            spawnY * TILE_SIZE + TILE_SIZE / 2,
            'sparkle',
            20
        );
    }

    updateBots(delta) {
        for (const bot of this.bots) {
            if (!bot.actionPattern) continue;
            
            // Simple bot AI: move toward pattern target
            const pattern = bot.actionPattern;
            
            if (bot.state === 'idle') {
                if (pattern.action === 'dispense') {
                    // Find dispenser
                    for (let x = 0; x < this.gridWidth; x++) {
                        for (let y = 0; y < this.gridHeight; y++) {
                            if (this.grid[x][y].station?.type === 'dispenser') {
                                bot.targetX = x;
                                bot.targetY = y;
                                bot.state = 'moving';
                                break;
                            }
                        }
                    }
                } else if (pattern.action === 'place_item' && pattern.data) {
                    bot.targetX = pattern.data.x;
                    bot.targetY = pattern.data.y;
                    bot.state = 'moving';
                }
            }
            
            if (bot.state === 'moving') {
                const tx = bot.targetX * TILE_SIZE + TILE_SIZE / 2;
                const ty = bot.targetY * TILE_SIZE + TILE_SIZE / 2;
                const dx = tx - bot.sprite.x;
                const dy = ty - bot.sprite.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 5) {
                    bot.x = bot.targetX;
                    bot.y = bot.targetY;
                    bot.state = 'acting';
                    
                    // Perform action
                    this.time.delayedCall(500, () => {
                        if (pattern.action === 'dispense') {
                            // Simulate dispense
                            const availableItems = this.levelData.allowedItems.filter(item => 
                                ['wheat', 'tomato', 'cheese', 'egg', 'milk', 'apple', 'fish'].includes(item)
                            );
                            if (availableItems.length > 0) {
                                bot.holding = availableItems[0];
                            }
                        } else if (pattern.action === 'place_item') {
                            if (bot.holding && pattern.data) {
                                this.placeItemOnStation(pattern.data.x, pattern.data.y, bot.holding);
                                bot.holding = null;
                            }
                        }
                        bot.state = 'idle';
                    });
                } else {
                    const speed = 100 * delta / 1000;
                    bot.sprite.x += (dx / dist) * speed;
                    bot.sprite.y += (dy / dist) * speed;
                }
            }
        }
    }
}
