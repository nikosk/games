/**
 * BootScene - Generates all pixel art assets programmatically
 * Larger sizes and more detailed textures for better readability
 */

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x3d2817, 1);
        progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '24px',
            fontFamily: 'Courier New, monospace',
            color: '#f4e4c1'
        }).setOrigin(0.5);

        const percentText = this.add.text(width / 2, height / 2 - 5, '0%', {
            fontSize: '18px',
            fontFamily: 'Courier New, monospace',
            color: '#f4e4c1'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xf4e4c1, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
            percentText.setText(parseInt(value * 100) + '%');
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
    }

    create() {
        this.generateTextures();
        this.scene.start('GameScene', { levelId: GAME_STATE.currentLevel });
    }

    generateTextures() {
        // Floor tiles
        this.createPixelTexture('floor', 64, 64, (g) => {
            // Base floor
            g.fillStyle(0xd4a574, 1);
            g.fillRect(0, 0, 64, 64);
            // Checkerboard
            g.fillStyle(0xc49464, 1);
            g.fillRect(0, 0, 32, 32);
            g.fillRect(32, 32, 32, 32);
            // Plank lines for wood texture
            g.fillStyle(0xb88755, 0.4);
            g.fillRect(0, 15, 64, 1);
            g.fillRect(0, 31, 64, 1);
            g.fillRect(0, 47, 64, 1);
            g.fillRect(15, 0, 1, 64);
            g.fillRect(31, 0, 1, 64);
            g.fillRect(47, 0, 1, 64);
            // Subtle border
            g.lineStyle(1, 0xb48454, 0.4);
            g.strokeRect(0, 0, 64, 64);
        });

        // Highlight tile
        this.createPixelTexture('highlight', 64, 64, (g) => {
            g.fillStyle(0xffeb3b, 0.25);
            g.fillRect(0, 0, 64, 64);
            g.lineStyle(3, 0xffeb3b, 0.7);
            g.strokeRect(2, 2, 60, 60);
            // Corner marks
            g.fillStyle(0xffeb3b, 0.5);
            g.fillRect(2, 2, 6, 2);
            g.fillRect(2, 2, 2, 6);
            g.fillRect(56, 2, 6, 2);
            g.fillRect(60, 2, 2, 6);
            g.fillRect(2, 60, 6, 2);
            g.fillRect(2, 56, 2, 6);
            g.fillRect(56, 60, 6, 2);
            g.fillRect(60, 56, 2, 6);
        });

        // Generate item textures
        Object.keys(ITEMS).forEach(key => {
            this.createItemTexture(key, ITEMS[key]);
        });

        // Generate station textures
        Object.keys(STATIONS).forEach(key => {
            this.createStationTexture(key, STATIONS[key]);
        });

        // Generate belt textures
        this.createBeltTextures();

        // Generate bot textures
        this.createBotTextures();

        // Generate customer textures
        CUSTOMERS.forEach((customer, index) => {
            this.createCustomerTexture(`customer_${index}`, customer);
        });

        // Generate UI textures
        this.createUITextures();

        // Generate particle textures
        this.createParticleTexture('sparkle', 0xffeb3b);
        this.createParticleTexture('steam', 0xffffff);
        this.createParticleTexture('heart', 0xff6b9d);
    }

    // ============================================================
    //  HELPER: Wraps pixel drawing into a Phaser texture
    // ============================================================
    createPixelTexture(key, width, height, drawFn) {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        drawFn(graphics);
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    // ============================================================
    //  ITEMS (48×48) — detailed food pixel art
    // ============================================================
    createItemTexture(key, item) {
        this.createPixelTexture(`item_${key}`, 48, 48, (g) => {
            const S = 48;

            if (key === 'wheat') {
                // Stalk
                g.fillStyle(0x8b9a46, 1);
                g.fillRect(21, 28, 6, 20);
                // Left grain head
                g.fillStyle(0xf0c929, 1);
                g.fillRect(8, 12, 12, 8);
                g.fillStyle(0xd4a017, 1);
                g.fillRect(10, 20, 8, 8);
                // Center grain head
                g.fillStyle(0xf5d442, 1);
                g.fillRect(16, 4, 16, 12);
                g.fillStyle(0xd4a017, 1);
                g.fillRect(18, 16, 12, 8);
                // Right grain head
                g.fillStyle(0xf0c929, 1);
                g.fillRect(28, 12, 12, 8);
                g.fillStyle(0xd4a017, 1);
                g.fillRect(30, 20, 8, 8);
                // Highlight
                g.fillStyle(0xfdf0b0, 1);
                g.fillRect(18, 6, 4, 3);
                g.fillRect(10, 13, 3, 2);
                g.fillRect(30, 13, 3, 2);
                // Outline
                g.lineStyle(1, 0x8b7a10, 0.4);
                g.strokeRect(8, 12, 12, 16);
                g.strokeRect(16, 4, 16, 20);
                g.strokeRect(28, 12, 12, 16);
            } else if (key === 'tomato') {
                // Shadow
                g.fillStyle(0x8b1a1a, 0.3);
                g.fillCircle(26, 26, 16);
                // Body
                g.fillStyle(0xe63946, 1);
                g.fillCircle(24, 24, 16);
                // Bottom shadow
                g.fillStyle(0xb52d36, 0.6);
                g.fillEllipse(24, 34, 28, 10);
                // Highlight
                g.fillStyle(0xff6b7a, 1);
                g.fillCircle(16, 16, 6);
                g.fillStyle(0xffffff, 0.5);
                g.fillCircle(14, 14, 3);
                // Star-shaped green top
                g.fillStyle(0x2d6a4f, 1);
                g.fillRect(20, 4, 8, 10);
                g.fillRect(12, 8, 24, 8);
                g.fillStyle(0x40916c, 1);
                g.fillRect(22, 6, 4, 6);
                g.fillRect(14, 9, 20, 4);
                // Stem
                g.fillStyle(0x5c3d2e, 1);
                g.fillRect(23, 2, 2, 6);
                // Outline
                g.lineStyle(1, 0x8b1a1a, 0.5);
                g.strokeCircle(24, 24, 16);
            } else if (key === 'cheese') {
                // Wedge shape
                g.fillStyle(0xffd60a, 1);
                g.fillTriangle(8, 10, 40, 12, 24, 42);
                // Top highlight
                g.fillStyle(0xffe95c, 1);
                g.fillTriangle(12, 12, 35, 13, 24, 34);
                // Bottom shadow
                g.fillStyle(0xe0b800, 1);
                g.fillTriangle(24, 36, 10, 14, 38, 16);
                // Holes
                g.fillStyle(0xd4950a, 1);
                g.fillCircle(22, 22, 3);
                g.fillCircle(30, 18, 2);
                g.fillCircle(18, 28, 2.5);
                g.fillCircle(28, 30, 1.5);
                // Hole highlights
                g.fillStyle(0xf0c000, 1);
                g.fillCircle(22, 21, 1);
                g.fillCircle(30, 17, 1);
                // Outline
                g.lineStyle(1, 0xc49b00, 0.5);
                g.strokeTriangle(8, 10, 40, 12, 24, 42);
            } else if (key === 'egg') {
                // Shadow
                g.fillStyle(0xcccccc, 0.3);
                g.fillEllipse(26, 28, 22, 28);
                // Body
                g.fillStyle(0xf5f0e0, 1);
                g.fillEllipse(24, 24, 22, 28);
                // Shading
                g.fillStyle(0xe8e0c8, 1);
                g.fillEllipse(28, 26, 16, 22);
                // Highlight
                g.fillStyle(0xffffff, 1);
                g.fillEllipse(16, 16, 8, 5);
                // Outline
                g.lineStyle(1, 0xd0c8b0, 0.6);
                g.strokeEllipse(24, 24, 22, 28);
            } else if (key === 'milk') {
                // Carton body
                g.fillStyle(0x7db8c8, 1);
                g.fillRect(12, 8, 28, 36);
                // Top fold
                g.fillStyle(0x6aa4b4, 1);
                g.fillTriangle(12, 8, 24, 2, 24, 8);
                g.fillTriangle(40, 8, 24, 2, 24, 8);
                // Front highlight
                g.fillStyle(0x8ecae6, 1);
                g.fillRect(14, 10, 22, 30);
                // Label
                g.fillStyle(0xffffff, 1);
                g.fillRect(16, 18, 18, 14);
                g.lineStyle(1, 0x457b9d, 1);
                g.strokeRect(16, 18, 18, 14);
                // Drop icon on label
                g.fillStyle(0x457b9d, 1);
                g.fillEllipse(25, 24, 4, 6);
                g.fillStyle(0xffffff, 0.8);
                g.fillCircle(25, 22, 1);
                // Outline
                g.lineStyle(1, 0x456f7d, 0.6);
                g.strokeRect(12, 8, 28, 36);
            } else if (key === 'apple') {
                // Shadow
                g.fillStyle(0x3d1e1e, 0.25);
                g.fillCircle(26, 26, 16);
                // Body
                g.fillStyle(0xd4382e, 1);
                g.fillCircle(24, 24, 16);
                // Bottom shadow
                g.fillStyle(0xa82820, 0.6);
                g.fillEllipse(24, 34, 24, 8);
                // Highlight
                g.fillStyle(0xff6b6b, 1);
                g.fillCircle(16, 16, 7);
                g.fillStyle(0xffffff, 0.6);
                g.fillCircle(14, 14, 3);
                // Leaf
                g.fillStyle(0x4a8c3f, 1);
                g.fillEllipse(26, 10, 12, 6);
                g.fillStyle(0x5eaa50, 1);
                g.fillEllipse(25, 9, 8, 3);
                // Stem
                g.fillStyle(0x5c3d2e, 1);
                g.fillRect(23, 5, 2, 6);
                // Outline
                g.lineStyle(1, 0x8b1a1a, 0.5);
                g.strokeCircle(24, 24, 16);
            } else if (key === 'fish') {
                // Body
                g.fillStyle(0x5b8dab, 1);
                g.fillEllipse(24, 26, 36, 18);
                // Belly
                g.fillStyle(0xb8d8e8, 1);
                g.fillEllipse(26, 30, 28, 10);
                // Tail
                g.fillStyle(0x457b9d, 1);
                g.fillTriangle(4, 26, 14, 16, 14, 36);
                // Top fin
                g.fillStyle(0x3d6d8d, 1);
                g.fillTriangle(20, 14, 24, 6, 28, 14);
                // Eye
                g.fillStyle(0xffffff, 1);
                g.fillCircle(36, 22, 4);
                g.fillStyle(0x1d3557, 1);
                g.fillCircle(37, 22, 2);
                g.fillStyle(0xffffff, 0.8);
                g.fillCircle(37, 21, 0.8);
                // Scales
                g.lineStyle(1, 0x3d6d8d, 0.4);
                for (let i = 0; i < 3; i++) {
                    g.strokeEllipse(18 + i * 8, 26, 8, 6);
                }
                // Outline
                g.lineStyle(1, 0x305570, 0.5);
                g.strokeEllipse(24, 26, 36, 18);
            } else if (key === 'dough') {
                // Shadow
                g.fillStyle(0x8b6030, 0.3);
                g.fillCircle(26, 26, 16);
                // Body blob
                g.fillStyle(0xf4a261, 1);
                g.fillCircle(24, 24, 16);
                g.fillCircle(16, 22, 12);
                g.fillCircle(32, 22, 12);
                g.fillCircle(24, 16, 12);
                // Shading
                g.fillStyle(0xe08a40, 0.5);
                g.fillEllipse(26, 28, 24, 14);
                // Highlight
                g.fillStyle(0xfcc898, 1);
                g.fillCircle(18, 18, 5);
                g.fillStyle(0xffffff, 0.4);
                g.fillCircle(16, 16, 2);
                // Texture bumps
                g.fillStyle(0xd88530, 0.3);
                g.fillCircle(20, 28, 2);
                g.fillCircle(28, 30, 1.5);
                g.fillCircle(16, 26, 1.5);
                // Outline
                g.lineStyle(1, 0xc87830, 0.5);
                g.strokeCircle(24, 24, 16);
            } else if (key === 'sliced_tomato') {
                // Shadow
                g.fillStyle(0x8b1a1a, 0.25);
                g.fillCircle(26, 26, 16);
                // Outer flesh
                g.fillStyle(0xe63946, 1);
                g.fillCircle(24, 24, 16);
                // Inner ring
                g.fillStyle(0xff6b6b, 1);
                g.fillCircle(24, 24, 12);
                // Center pulp
                g.fillStyle(0xff9a9a, 1);
                g.fillCircle(24, 24, 7);
                // Seeds
                g.fillStyle(0xfffacd, 1);
                g.fillEllipse(20, 20, 3, 4);
                g.fillEllipse(28, 20, 3, 4);
                g.fillEllipse(20, 28, 3, 4);
                g.fillEllipse(28, 28, 3, 4);
                g.fillEllipse(24, 24, 2, 3);
                // Skin edge
                g.lineStyle(2, 0xc03030, 1);
                g.strokeCircle(24, 24, 16);
            } else if (key === 'bread') {
                // Shadow
                g.fillStyle(0x8b6d30, 0.25);
                g.fillRoundedRect(7, 20, 36, 22, 4);
                // Loaf body
                g.fillStyle(0xe9c46a, 1);
                g.fillRoundedRect(6, 10, 36, 32, 6);
                // Top dome
                g.fillStyle(0xf0d48a, 1);
                g.fillEllipse(24, 10, 34, 14);
                // Crust top
                g.fillStyle(0xd4a040, 1);
                g.fillRoundedRect(8, 8, 32, 8, 4);
                // Scoring lines
                g.fillStyle(0xc08830, 0.6);
                g.fillRect(18, 10, 2, 8);
                g.fillRect(24, 10, 2, 8);
                g.fillRect(30, 10, 2, 8);
                // Highlight
                g.fillStyle(0xfdf0c0, 0.6);
                g.fillEllipse(16, 14, 10, 5);
                // Cut face on right
                g.fillStyle(0xf5e0b0, 1);
                g.fillRect(38, 18, 6, 20);
                g.fillStyle(0xe8d0a0, 0.8);
                g.fillRect(39, 22, 4, 12);
                // Outline
                g.lineStyle(1, 0xc09040, 0.5);
                g.strokeRoundedRect(6, 10, 36, 32, 6);
            } else if (key === 'pizza') {
                // Shadow
                g.fillStyle(0x8b6030, 0.25);
                g.fillCircle(26, 26, 18);
                // Crust
                g.fillStyle(0xe8b960, 1);
                g.fillCircle(24, 24, 18);
                // Crust rim
                g.fillStyle(0xd4a040, 1);
                g.lineStyle(3, 0xd4a040, 1);
                g.strokeCircle(24, 24, 17);
                // Sauce/cheese center
                g.fillStyle(0xf4c470, 1);
                g.fillCircle(24, 24, 14);
                // Sauce visible
                g.fillStyle(0xe63946, 0.5);
                g.fillCircle(24, 24, 12);
                // Pepperoni
                const pepColors = [0xd43434, 0xc02828, 0xe04040];
                const peps = [[16, 18], [30, 20], [20, 30], [28, 30], [24, 16]];
                peps.forEach(([px, py], i) => {
                    g.fillStyle(pepColors[i % pepColors.length], 1);
                    g.fillCircle(px, py, 3.5);
                    g.fillStyle(0x000000, 0.1);
                    g.fillCircle(px, py, 2);
                });
                // Cheese spots
                g.fillStyle(0xffe8a0, 0.8);
                g.fillCircle(12, 22, 2);
                g.fillCircle(34, 24, 1.5);
                g.fillCircle(22, 32, 1.5);
                // Highlight
                g.fillStyle(0xffffff, 0.2);
                g.fillCircle(16, 16, 7);
                // Outline
                g.lineStyle(1, 0xc09040, 0.5);
                g.strokeCircle(24, 24, 18);
            } else if (key === 'toast') {
                // Shadow
                g.fillStyle(0x6b4d30, 0.25);
                g.fillRoundedRect(7, 13, 36, 30, 6);
                // Body
                g.fillStyle(0xd4a373, 1);
                g.fillRoundedRect(6, 8, 36, 34, 6);
                // Crust
                g.fillStyle(0xb88050, 1);
                g.fillRoundedRect(6, 8, 36, 34, 6);
                // Inner bread (lighter)
                g.fillStyle(0xe8c8a0, 1);
                g.fillRoundedRect(10, 12, 28, 28, 4);
                // Toast pattern (darker spots)
                g.fillStyle(0xc89868, 0.7);
                g.fillRoundedRect(12, 16, 24, 20, 3);
                g.fillStyle(0xd4a878, 0.5);
                g.fillRect(14, 20, 20, 2);
                g.fillRect(14, 26, 20, 2);
                g.fillRect(14, 32, 20, 2);
                // Butter pat
                g.fillStyle(0xfff5cc, 1);
                g.fillRoundedRect(14, 10, 10, 6, 2);
                g.fillStyle(0xffe680, 0.6);
                g.fillRoundedRect(15, 11, 8, 4, 1);
                // Highlight
                g.fillStyle(0xffffff, 0.25);
                g.fillRoundedRect(10, 8, 12, 4, 2);
                // Outline
                g.lineStyle(1, 0x9a7040, 0.5);
                g.strokeRoundedRect(6, 8, 36, 34, 6);
            } else if (key === 'fried_fish') {
                // Body (golden breaded)
                g.fillStyle(0xe8a840, 1);
                g.fillEllipse(24, 26, 36, 18);
                // Golden coating
                g.fillStyle(0xf0bc50, 1);
                g.fillEllipse(24, 24, 34, 16);
                // Breading texture
                g.fillStyle(0xd49830, 0.4);
                for (let i = 0; i < 6; i++) {
                    g.fillCircle(12 + i * 5, 24 + (i % 2) * 4, 1.5);
                    g.fillCircle(14 + i * 5, 28 - (i % 3) * 2, 1);
                }
                // Tail
                g.fillStyle(0xd49830, 1);
                g.fillTriangle(4, 26, 16, 18, 16, 34);
                g.fillStyle(0xf0bc50, 1);
                g.fillTriangle(7, 26, 14, 20, 14, 32);
                // Crispy edges
                g.fillStyle(0xd49830, 0.6);
                g.fillCircle(38, 20, 2);
                g.fillCircle(40, 26, 2);
                g.fillCircle(38, 32, 2);
                // Highlight
                g.fillStyle(0xfdf0c0, 0.5);
                g.fillEllipse(18, 18, 12, 6);
                // Outline
                g.lineStyle(1, 0xb08030, 0.5);
                g.strokeEllipse(24, 24, 34, 16);
            } else if (key === 'apple_pie') {
                // Shadow
                g.fillStyle(0x6b3020, 0.25);
                g.fillCircle(28, 28, 18);
                // Pie base
                g.fillStyle(0xe0a860, 1);
                g.fillCircle(24, 24, 18);
                // Crust rim
                g.fillStyle(0xd49850, 1);
                g.fillCircle(24, 24, 18);
                g.lineStyle(2, 0xc08040, 1);
                g.strokeCircle(24, 24, 17);
                // Filling
                g.fillStyle(0xe76f51, 1);
                g.fillCircle(24, 24, 14);
                // Lattice crust
                g.fillStyle(0xe8b960, 1);
                g.fillRect(14, 16, 20, 3);
                g.fillRect(14, 22, 20, 3);
                g.fillRect(14, 28, 20, 3);
                g.fillRect(18, 12, 3, 24);
                g.fillRect(26, 12, 3, 24);
                // Lattice highlight
                g.fillStyle(0xf0cc70, 0.8);
                g.fillRect(14, 17, 20, 1);
                g.fillRect(14, 23, 20, 1);
                g.fillRect(14, 29, 20, 1);
                // Apple filling peeking through
                g.fillStyle(0xf08060, 0.6);
                g.fillRect(15, 19, 2, 2);
                g.fillRect(23, 25, 2, 2);
                g.fillRect(31, 19, 2, 2);
                g.fillRect(19, 31, 2, 2);
                // Outline
                g.lineStyle(1, 0xb06830, 0.5);
                g.strokeCircle(24, 24, 18);
            } else if (key === 'omelette') {
                // Shadow
                g.fillStyle(0xb0a060, 0.25);
                g.fillEllipse(26, 28, 28, 22);
                // Body (folded)
                g.fillStyle(0xf4e285, 1);
                g.fillEllipse(24, 24, 28, 22);
                // Golden bottom
                g.fillStyle(0xe8d068, 1);
                g.fillEllipse(26, 30, 26, 16);
                // Fold edge
                g.fillStyle(0xf0da80, 1);
                g.fillEllipse(22, 22, 18, 14);
                // Filling spots (herbs/cheese)
                g.fillStyle(0xff8800, 0.7);
                g.fillCircle(18, 24, 2);
                g.fillCircle(26, 26, 2.5);
                g.fillCircle(22, 30, 1.5);
                g.fillStyle(0x4caf50, 0.5);
                g.fillCircle(20, 28, 1);
                g.fillCircle(28, 24, 1);
                // Highlight
                g.fillStyle(0xfff8d0, 1);
                g.fillEllipse(16, 18, 8, 5);
                // Outline
                g.lineStyle(1, 0xc8b040, 0.5);
                g.strokeEllipse(24, 24, 28, 22);
            } else if (key === 'milkshake') {
                // Shadow
                g.fillStyle(0x6b4050, 0.2);
                g.fillRect(12, 22, 28, 26);
                // Glass sides
                g.fillStyle(0xddddee, 0.6);
                g.fillRect(10, 10, 28, 38);
                // Glass body
                g.fillStyle(0xf0e8f0, 0.4);
                g.fillRect(12, 10, 24, 38);
                // Pink drink
                g.fillStyle(0xffb7c5, 1);
                g.fillRect(12, 14, 24, 30);
                // Drink shading
                g.fillStyle(0xff9aaf, 0.5);
                g.fillRect(20, 14, 16, 30);
                // Drink highlight
                g.fillStyle(0xffd0da, 0.6);
                g.fillRect(14, 16, 4, 24);
                // Whipped cream top
                g.fillStyle(0xffffff, 1);
                g.fillCircle(18, 10, 5);
                g.fillCircle(24, 8, 6);
                g.fillCircle(30, 10, 5);
                g.fillCircle(22, 6, 4);
                g.fillCircle(26, 6, 4);
                // Straw
                g.fillStyle(0xff4444, 1);
                g.fillRect(26, 2, 3, 18);
                g.fillStyle(0xff6666, 0.8);
                g.fillRect(26, 4, 1, 16);
                // Cherry on top
                g.fillStyle(0xd43434, 1);
                g.fillCircle(28, 2, 3);
                g.fillStyle(0xff5555, 1);
                g.fillCircle(27, 1, 1.2);
                // Glass outline
                g.lineStyle(1, 0xb0b0c0, 0.6);
                g.strokeRect(10, 10, 28, 38);
                g.lineStyle(1, 0xb0b0c0, 0.4);
                g.strokeRect(10, 10, 28, 3);
            } else if (key === 'plated') {
                // Shadow
                g.fillStyle(0x888888, 0.3);
                g.fillEllipse(26, 34, 40, 16);
                // Plate rim
                g.fillStyle(0xf0f0f0, 1);
                g.fillEllipse(24, 30, 40, 18);
                // Plate center
                g.fillStyle(0xffffff, 1);
                g.fillEllipse(24, 30, 30, 12);
                // Inner rim detail
                g.fillStyle(0xe8e8e8, 0.6);
                g.lineStyle(1, 0xe0e0e0, 1);
                g.strokeEllipse(24, 30, 26, 10);
                // Highlight on rim
                g.fillStyle(0xffffff, 0.8);
                g.fillEllipse(12, 26, 6, 2);
                // Outline
                g.lineStyle(1, 0xd0d0d0, 0.6);
                g.strokeEllipse(24, 30, 40, 18);
            } else {
                // Default with shading
                g.fillStyle(0x888888, 0.25);
                g.fillCircle(26, 26, 16);
                g.fillStyle(item.color || 0x888888, 1);
                g.fillCircle(24, 24, 16);
                g.fillStyle(0xffffff, 0.3);
                g.fillCircle(18, 18, 6);
                g.lineStyle(1, 0x000000, 0.3);
                g.strokeCircle(24, 24, 16);
            }
        });
    }

    // ============================================================
    //  STATIONS (64×64) — detailed kitchen equipment
    // ============================================================
    createStationTexture(key, station) {
        this.createPixelTexture(`station_${key}`, 64, 64, (g) => {
            // Countertop base (wooden)
            g.fillStyle(0x8b7355, 1);
            g.fillRect(4, 4, 56, 56);
            // Wood grain
            g.fillStyle(0x9a8060, 0.5);
            g.fillRect(4, 10, 56, 1);
            g.fillRect(4, 18, 56, 1);
            g.fillRect(4, 42, 56, 1);
            g.fillRect(4, 50, 56, 1);
            // Top surface
            g.fillStyle(0xa08060, 1);
            g.fillRect(4, 4, 56, 10);
            g.fillStyle(0xb09070, 0.6);
            g.fillRect(4, 4, 56, 4);
            // Side shadow
            g.fillStyle(0x6b5b45, 0.6);
            g.fillRect(4, 40, 56, 20);

            if (key === 'dispenser') {
                // Body
                g.fillStyle(0x5d4e38, 1);
                g.fillRect(10, 16, 44, 42);
                g.fillStyle(0x6b5b45, 1);
                g.fillRect(10, 16, 44, 36);
                // Glass display
                g.fillStyle(0x8ecae6, 1);
                g.fillRect(16, 22, 32, 24);
                g.fillStyle(0xa0d8f0, 0.6);
                g.fillRect(16, 22, 32, 6);
                // Item inside
                g.fillStyle(0xf4a261, 0.8);
                g.fillCircle(32, 38, 6);
                // Knobs
                g.fillStyle(0xb0b0b0, 1);
                g.fillCircle(18, 54, 3);
                g.fillCircle(46, 54, 3);
                g.fillStyle(0xd0d0d0, 0.6);
                g.fillCircle(17, 53, 1);
                g.fillCircle(45, 53, 1);
                // Label
                g.fillStyle(0xffffff, 1);
                g.fillRect(26, 20, 12, 4);
            } else if (key === 'cutting_board') {
                // Board
                g.fillStyle(0xd4a373, 1);
                g.fillRect(8, 21, 48, 32);
                // Board wood grain
                g.fillStyle(0xc09060, 0.4);
                g.fillRect(10, 26, 44, 1);
                g.fillRect(10, 34, 44, 1);
                g.fillRect(10, 42, 44, 1);
                g.fillRect(10, 48, 44, 1);
                // Knife
                g.fillStyle(0xc0c0c0, 1);
                g.fillRect(42, 12, 4, 16);
                g.fillStyle(0xd0d0d0, 0.8);
                g.fillRect(42, 12, 2, 8);
                // Handle
                g.fillStyle(0x5d3a1a, 1);
                g.fillRect(41, 26, 6, 14);
                g.fillStyle(0x6b4d2a, 0.8);
                g.fillRect(42, 26, 4, 10);
                // Tomato slice on board
                g.fillStyle(0xe63946, 0.7);
                g.fillCircle(20, 36, 8);
                g.fillStyle(0xff6b7a, 0.5);
                g.fillCircle(17, 33, 3);
            } else if (key === 'mixer') {
                // Base
                g.fillStyle(0x909090, 1);
                g.fillRect(18, 40, 28, 18);
                g.fillStyle(0xa0a0a0, 0.8);
                g.fillRect(18, 40, 28, 6);
                // Bowl
                g.fillStyle(0xd0d0d0, 1);
                g.fillRoundedRect(14, 20, 36, 24, 4);
                g.fillStyle(0xe0e0e0, 0.6);
                g.fillRoundedRect(16, 20, 14, 20, 4);
                // Contents
                g.fillStyle(0xf4e285, 0.7);
                g.fillRect(16, 26, 30, 14);
                // Top/hook
                g.fillStyle(0xb0b0b0, 1);
                g.fillRect(28, 10, 8, 14);
                g.fillStyle(0xc0c0c0, 0.6);
                g.fillRect(30, 10, 4, 10);
                // Buttons
                g.fillStyle(0x4caf50, 1);
                g.fillCircle(22, 50, 3);
                g.fillStyle(0xf44336, 1);
                g.fillCircle(38, 50, 3);
            } else if (key === 'oven') {
                // Body
                g.fillStyle(0x404040, 1);
                g.fillRect(8, 8, 48, 50);
                g.fillStyle(0x505050, 0.8);
                g.fillRect(8, 8, 48, 30);
                // Door
                g.fillStyle(0x303030, 1);
                g.fillRect(14, 22, 36, 32);
                // Window
                g.fillStyle(0x1a1a1a, 1);
                g.fillRect(18, 26, 28, 22);
                // Glow inside
                g.fillStyle(0xff4400, 0.6);
                g.fillRect(20, 28, 24, 18);
                g.fillStyle(0xffaa00, 0.4);
                g.fillRect(24, 30, 16, 14);
                // Handle
                g.fillStyle(0xc0c0c0, 1);
                g.fillRect(26, 50, 12, 3);
                g.fillStyle(0xd8d8d8, 0.8);
                g.fillRect(28, 50, 8, 1);
                // Knobs
                g.fillStyle(0x888888, 1);
                g.fillCircle(14, 14, 3);
                g.fillCircle(24, 14, 3);
                g.fillCircle(34, 14, 3);
                g.fillStyle(0xaaaaaa, 0.6);
                g.fillCircle(13, 13, 1);
                g.fillCircle(23, 13, 1);
                g.fillCircle(33, 13, 1);
            } else if (key === 'toaster') {
                // Body
                g.fillStyle(0xc0c0c0, 1);
                g.fillRect(12, 18, 40, 40);
                g.fillStyle(0xd0d0d0, 0.6);
                g.fillRect(12, 18, 40, 20);
                // Slots on top
                g.fillStyle(0x404040, 1);
                g.fillRect(18, 12, 8, 10);
                g.fillRect(38, 12, 8, 10);
                // Glowing slots
                g.fillStyle(0xff6600, 0.6);
                g.fillRect(20, 14, 4, 6);
                g.fillRect(40, 14, 4, 6);
                // Lever
                g.fillStyle(0x888888, 1);
                g.fillRect(52, 30, 4, 12);
                g.fillStyle(0xaaaaaa, 0.8);
                g.fillRect(52, 30, 2, 12);
                g.fillStyle(0x666666, 1);
                g.fillRect(51, 32, 6, 3);
                // Base feet
                g.fillStyle(0x666666, 1);
                g.fillRect(16, 56, 8, 3);
                g.fillRect(40, 56, 8, 3);
                // Dial
                g.fillStyle(0x888888, 1);
                g.fillCircle(32, 48, 4);
                g.lineStyle(1, 0x444444, 1);
                g.strokeCircle(32, 48, 3);
            } else if (key === 'fryer') {
                // Body
                g.fillStyle(0x606060, 1);
                g.fillRect(10, 16, 44, 44);
                g.fillStyle(0x707070, 0.6);
                g.fillRect(10, 16, 44, 20);
                // Oil basin
                g.fillStyle(0x202020, 1);
                g.fillRect(14, 22, 36, 22);
                // Oil
                g.fillStyle(0xffd700, 0.9);
                g.fillRect(16, 28, 32, 12);
                g.fillStyle(0xffed4a, 0.6);
                g.fillRect(16, 28, 32, 4);
                // Basket
                g.fillStyle(0xb0b0b0, 0.8);
                g.fillRect(20, 18, 24, 16);
                g.fillStyle(0xc8c8c8, 0.5);
                g.fillRect(20, 18, 24, 2);
                // Food in basket
                g.fillStyle(0xf4a261, 0.6);
                g.fillCircle(26, 30, 3);
                g.fillCircle(34, 32, 3);
                g.fillCircle(30, 28, 2.5);
                // Handle
                g.fillStyle(0x888888, 1);
                g.fillRect(46, 14, 6, 8);
                // Knob
                g.fillStyle(0xff4444, 1);
                g.fillCircle(14, 50, 3);
                // Heat indicator
                g.fillStyle(0xff4400, 0.8);
                g.fillCircle(50, 50, 2);
            } else if (key === 'plate_station') {
                // Stack of plates
                g.fillStyle(0xf0f0f0, 1);
                g.fillEllipse(32, 44, 44, 16);
                g.lineStyle(1, 0xd0d0d0, 1);
                g.strokeEllipse(32, 44, 44, 16);
                // Second plate
                g.fillStyle(0xe8e8e8, 1);
                g.fillEllipse(32, 40, 38, 14);
                g.lineStyle(1, 0xd0d0d0, 0.8);
                g.strokeEllipse(32, 40, 38, 14);
                // Top plate
                g.fillStyle(0xffffff, 1);
                g.fillEllipse(32, 34, 32, 12);
                g.lineStyle(1.5, 0xd0d0d0, 1);
                g.strokeEllipse(32, 34, 32, 12);
                // Highlight
                g.fillStyle(0xffffff, 0.8);
                g.fillEllipse(20, 30, 6, 3);
                // Plate holder/shelf
                g.fillStyle(0x8b7355, 0.6);
                g.fillRoundedRect(8, 46, 48, 8, 2);
            } else if (key === 'counter') {
                // Counter body
                g.fillStyle(0x8b4513, 1);
                g.fillRect(4, 20, 56, 40);
                // Top surface
                g.fillStyle(0xa0522d, 1);
                g.fillRect(4, 20, 56, 8);
                g.fillStyle(0xb06040, 0.6);
                g.fillRect(4, 20, 56, 3);
                // Front panels
                g.fillStyle(0x7a3510, 1);
                g.fillRect(8, 32, 20, 24);
                g.fillRect(36, 32, 20, 24);
                // Panel details
                g.fillStyle(0x6b2d08, 0.8);
                g.fillRect(8, 44, 20, 12);
                g.fillRect(36, 44, 20, 12);
                // Handles
                g.fillStyle(0xc0a060, 1);
                g.fillRect(28, 40, 8, 2);
                g.fillRect(28, 44, 8, 2);
                // Counter sign
                g.fillStyle(0xffd700, 0.8);
                g.fillRect(14, 24, 36, 6);
                g.fillStyle(0x000000, 0.4);
                g.fillRect(20, 25, 24, 4);
            } else if (key === 'trash') {
                // Bin body
                g.fillStyle(0x707070, 1);
                g.fillRect(14, 22, 36, 38);
                // Bin shading
                g.fillStyle(0x808080, 0.6);
                g.fillRect(14, 22, 20, 38);
                // Lid
                g.fillStyle(0x606060, 1);
                g.fillRect(10, 16, 44, 8);
                g.fillStyle(0x707070, 0.8);
                g.fillRect(10, 16, 44, 3);
                // Lid handle
                g.fillStyle(0x505050, 1);
                g.fillRect(28, 12, 8, 6);
                g.fillStyle(0x606060, 0.6);
                g.fillRect(29, 12, 3, 6);
                // Ribs on bin
                g.fillStyle(0x606060, 0.5);
                g.fillRect(16, 30, 32, 2);
                g.fillRect(16, 38, 32, 2);
                g.fillRect(16, 46, 32, 2);
                // Recycle symbol hint
                g.fillStyle(0x4caf50, 0.5);
                g.fillRect(28, 50, 8, 4);
                g.fillRect(30, 48, 4, 8);
            }

            // Border
            g.lineStyle(2, 0x4a3728, 1);
            g.strokeRect(4, 4, 56, 56);
        });
    }

    // ============================================================
    //  CONVEYOR BELTS (64×64)
    // ============================================================
    createBeltTextures() {
        const directions = ['right', 'down', 'left', 'up'];
        directions.forEach(dir => {
            this.createPixelTexture(`belt_${dir}`, 64, 64, (g) => {
                // Base metal frame
                g.fillStyle(0x5d4e38, 1);
                g.fillRect(0, 0, 64, 64);
                // Belt surface
                g.fillStyle(0x8b7355, 1);
                if (dir === 'right' || dir === 'left') {
                    g.fillRect(0, 10, 64, 44);
                } else {
                    g.fillRect(10, 0, 44, 64);
                }
                // Belt roller lines
                g.fillStyle(0x7a6348, 0.5);
                if (dir === 'right' || dir === 'left') {
                    for (let x = 0; x < 64; x += 8) {
                        g.fillRect(x, 12, 2, 40);
                    }
                } else {
                    for (let y = 0; y < 64; y += 8) {
                        g.fillRect(12, y, 40, 2);
                    }
                }
                // Direction arrows
                g.fillStyle(0xa08060, 1);
                if (dir === 'right') {
                    g.fillTriangle(22, 22, 38, 32, 22, 42);
                    g.fillTriangle(38, 22, 54, 32, 38, 42);
                } else if (dir === 'left') {
                    g.fillTriangle(42, 22, 26, 32, 42, 42);
                    g.fillTriangle(26, 22, 10, 32, 26, 42);
                } else if (dir === 'down') {
                    g.fillTriangle(22, 22, 32, 38, 42, 22);
                    g.fillTriangle(22, 38, 32, 54, 42, 38);
                } else if (dir === 'up') {
                    g.fillTriangle(22, 42, 32, 26, 42, 42);
                    g.fillTriangle(22, 26, 32, 10, 42, 26);
                }
                // Border
                g.lineStyle(1, 0x4a3728, 0.5);
                g.strokeRect(0, 0, 64, 64);
            });
        });
    }

    // ============================================================
    //  CHEF BOTS (56×56)
    // ============================================================
    createBotTextures() {
        const botTypes = [
            { key: 'mover', hatColor: 0x4caf50 },
            { key: 'cooker', hatColor: 0xff9800 },
            { key: 'server', hatColor: 0xe91e63 }
        ];
        botTypes.forEach(({ key, hatColor }) => {
            this.createPixelTexture(`bot_${key}`, 56, 56, (g) => {
                // Shadow
                g.fillStyle(0x1a3060, 0.25);
                g.fillEllipse(28, 48, 36, 12);
                // Body
                g.fillStyle(0x4285d0, 1);
                g.fillRoundedRect(8, 14, 40, 34, 6);
                // Body highlight
                g.fillStyle(0x5a9ae8, 0.5);
                g.fillRoundedRect(10, 16, 20, 28, 4);
                // Body shadow
                g.fillStyle(0x2c5aa0, 0.4);
                g.fillRoundedRect(36, 20, 10, 24, 4);
                // Arms
                g.fillStyle(0x4285d0, 1);
                g.fillRoundedRect(2, 22, 10, 12, 3);
                g.fillRoundedRect(52, 22, 10, 12, 3);
                // Hands
                g.fillStyle(0xb0b0b0, 1);
                g.fillCircle(6, 32, 3);
                g.fillCircle(56, 32, 3);
                // Eyes
                g.fillStyle(0xffffff, 1);
                g.fillCircle(20, 26, 6);
                g.fillCircle(36, 26, 6);
                g.fillStyle(0x1a1a2e, 1);
                g.fillCircle(22, 26, 3);
                g.fillCircle(38, 26, 3);
                // Eye shine
                g.fillStyle(0xffffff, 0.9);
                g.fillCircle(23, 25, 1.2);
                g.fillCircle(39, 25, 1.2);
                // Mouth
                g.fillStyle(0x1a1a2e, 0.6);
                g.fillRoundedRect(22, 34, 12, 3, 1);
                // Antenna
                g.fillStyle(0x666666, 1);
                g.fillRect(27, 2, 2, 10);
                g.fillStyle(0xffd700, 1);
                g.fillCircle(28, 2, 4);
                g.fillStyle(0xffed4a, 1);
                g.fillCircle(27, 1, 1.5);
                // Hat indicator
                g.fillStyle(hatColor, 1);
                g.fillRoundedRect(18, 8, 20, 8, 3);
                g.fillStyle(0xffffff, 0.4);
                g.fillRoundedRect(19, 9, 10, 4, 2);
                // Feet
                g.fillStyle(0x404040, 1);
                g.fillRoundedRect(16, 44, 10, 8, 3);
                g.fillRoundedRect(34, 44, 10, 8, 3);
                // Border
                g.lineStyle(1, 0x2c5aa0, 0.8);
                g.strokeRoundedRect(8, 14, 40, 34, 6);
            });
        });
    }

    // ============================================================
    //  CUSTOMER ANIMALS (64×64)
    // ============================================================
    createCustomerTexture(key, customer) {
        const index = parseInt(key.split('_')[1]);
        // Animal config: [earStyle, earColor, bodyColor, faceColor]
        const animals = [
            { body: 0x8ecae6, earColor: 0x8b4513, earShape: 'flop' },    // Dog
            { body: 0x8ecae6, earColor: 0xffa500, earShape: 'point' },    // Cat
            { body: 0x8ecae6, earColor: 0xf5f5f5, earShape: 'tall' },     // Bunny
            { body: 0x8ecae6, earColor: 0x8b4513, earShape: 'round' },    // Bear
            { body: 0x8ecae6, earColor: 0x1a1a1a, earShape: 'round' },    // Panda
            { body: 0x8ecae6, earColor: 0xff6600, earShape: 'point' },    // Fox
            { body: 0x8ecae6, earColor: 0x4caf50, earShape: 'round' },    // Frog
            { body: 0x8ecae6, earColor: 0xffeb3b, earShape: 'tuft' }      // Chick
        ];
        const config = animals[index] || animals[0];

        this.createPixelTexture(key, 64, 64, (g) => {
            // Body (shirt/clothing)
            g.fillStyle(config.body, 1);
            g.fillEllipse(32, 42, 36, 26);
            // Body shading
            g.fillStyle(0x6bacd0, 0.4);
            g.fillEllipse(34, 44, 30, 20);
            // Collar
            g.fillStyle(0xffffff, 1);
            g.fillRoundedRect(22, 30, 20, 4, 2);

            // Head
            g.fillStyle(0xffdbac, 1);
            g.fillCircle(32, 20, 18);
            // Head shading
            g.fillStyle(0xf0c898, 1);
            g.fillEllipse(34, 22, 28, 30);

            // Cheeks
            g.fillStyle(0xff9999, 0.4);
            g.fillCircle(18, 24, 4);
            g.fillCircle(46, 24, 4);

            // Eyes
            g.fillStyle(0xffffff, 1);
            g.fillCircle(24, 18, 5);
            g.fillCircle(40, 18, 5);
            g.fillStyle(0x1a1a1a, 1);
            g.fillCircle(25, 18, 3);
            g.fillCircle(41, 18, 3);
            // Eye shine
            g.fillStyle(0xffffff, 1);
            g.fillCircle(26, 17, 1.2);
            g.fillCircle(42, 17, 1.2);

            // Nose
            g.fillStyle(0x333333, 1);
            g.fillCircle(32, 24, 2);

            // Smile
            g.fillStyle(0x1a1a1a, 0.6);
            g.fillRect(28, 28, 8, 2);

            // Ears based on shape
            g.fillStyle(config.earColor, 1);
            if (config.earShape === 'flop') {
                // Floppy ears (dog)
                g.fillEllipse(10, 8, 10, 18);
                g.fillEllipse(54, 8, 10, 18);
                g.fillStyle(0x000000, 0.15);
                g.fillEllipse(12, 12, 6, 10);
                g.fillEllipse(56, 12, 6, 10);
            } else if (config.earShape === 'point') {
                // Pointy ears (cat, fox)
                g.fillTriangle(12, 14, 20, 2, 22, 14);
                g.fillTriangle(52, 14, 44, 2, 42, 14);
                // Inner ear
                g.fillStyle(0xffccaa, 0.5);
                g.fillTriangle(15, 13, 19, 6, 20, 13);
                g.fillTriangle(49, 13, 45, 6, 44, 13);
            } else if (config.earShape === 'tall') {
                // Tall ears (bunny)
                g.fillEllipse(18, 2, 8, 22);
                g.fillEllipse(46, 2, 8, 22);
                g.fillStyle(0xffcccc, 0.4);
                g.fillEllipse(18, 4, 5, 16);
                g.fillEllipse(46, 4, 5, 16);
            } else if (config.earShape === 'round') {
                // Round ears (bear, panda)
                g.fillCircle(14, 8, 8);
                g.fillCircle(50, 8, 8);
                g.fillStyle(0x000000, 0.15);
                g.fillCircle(14, 8, 5);
                g.fillCircle(50, 8, 5);
                // Panda eye patches
                if (index === 4) {
                    g.fillStyle(0x1a1a1a, 0.6);
                    g.fillCircle(24, 18, 6);
                    g.fillCircle(40, 18, 6);
                }
            } else if (config.earShape === 'tuft') {
                // Little tufts (chick)
                g.fillTriangle(14, 12, 18, 2, 18, 12);
                g.fillTriangle(50, 12, 46, 2, 46, 12);
            }

            // Frog eyes
            if (index === 6) {
                g.fillStyle(0xffffff, 0.8);
                g.fillCircle(24, 16, 5);
                g.fillCircle(40, 16, 5);
                g.fillStyle(0x1a1a1a, 0.6);
                g.fillCircle(25, 16, 2.5);
                g.fillCircle(41, 16, 2.5);
            }

            // Feet (at bottom)
            g.fillStyle(0x333333, 0.4);
            g.fillEllipse(22, 50, 10, 6);
            g.fillEllipse(42, 50, 10, 6);
        });
    }

    // ============================================================
    //  UI TEXTURES
    // ============================================================
    createUITextures() {
        // Button background
        this.createPixelTexture('ui_button', 80, 80, (g) => {
            g.fillStyle(0x4e342e, 1);
            g.fillRoundedRect(0, 0, 80, 80, 10);
            g.fillStyle(0x5d4037, 1);
            g.fillRoundedRect(2, 2, 76, 76, 8);
            g.fillStyle(0x8d6e63, 0.4);
            g.fillRoundedRect(4, 4, 36, 70, 6);
            g.lineStyle(2, 0xf4e4c1, 1);
            g.strokeRoundedRect(2, 2, 76, 76, 8);
        });

        // Pressed button
        this.createPixelTexture('ui_button_pressed', 80, 80, (g) => {
            g.fillStyle(0x3d2817, 1);
            g.fillRoundedRect(0, 0, 80, 80, 10);
            g.fillStyle(0x4e342e, 1);
            g.fillRoundedRect(2, 2, 76, 76, 8);
            g.lineStyle(2, 0x6d4c41, 1);
            g.strokeRoundedRect(2, 2, 76, 76, 8);
        });

        // Panel
        this.createPixelTexture('ui_panel', 320, 160, (g) => {
            g.fillStyle(0x3d2817, 0.95);
            g.fillRoundedRect(0, 0, 320, 160, 12);
            g.fillStyle(0x4a3020, 0.3);
            g.fillRoundedRect(4, 4, 312, 80, 8);
            g.lineStyle(3, 0xf4e4c1, 1);
            g.strokeRoundedRect(2, 2, 316, 156, 10);
            // Decorative corners
            g.fillStyle(0xf4e4c1, 0.3);
            g.fillRect(10, 10, 16, 2);
            g.fillRect(10, 10, 2, 16);
            g.fillRect(294, 10, 16, 2);
            g.fillRect(308, 10, 2, 16);
            g.fillRect(10, 148, 16, 2);
            g.fillRect(10, 134, 2, 16);
            g.fillRect(294, 148, 16, 2);
            g.fillRect(308, 134, 2, 16);
        });

        // Stars
        this.createPixelTexture('star_empty', 40, 40, (g) => {
            g.fillStyle(0x555555, 1);
            this.drawStar(g, 20, 20, 5, 16, 8);
            g.fillStyle(0x444444, 0.5);
            this.drawStar(g, 20, 22, 5, 14, 7);
        });

        this.createPixelTexture('star_filled', 40, 40, (g) => {
            g.fillStyle(0xffa000, 1);
            this.drawStar(g, 20, 20, 5, 16, 8);
            g.fillStyle(0xffd700, 1);
            this.drawStar(g, 20, 20, 5, 14, 7);
            g.fillStyle(0xffffff, 0.5);
            this.drawStar(g, 18, 18, 5, 6, 3);
        });
    }

    // ============================================================
    //  PARTICLE TEXTURES (20×20)
    // ============================================================
    createParticleTexture(key, color) {
        this.createPixelTexture(key, 20, 20, (g) => {
            g.fillStyle(color, 1);
            if (key === 'heart') {
                // Heart shape
                g.fillRect(6, 4, 8, 4);
                g.fillRect(4, 6, 12, 4);
                g.fillRect(4, 10, 12, 4);
                g.fillRect(6, 14, 8, 4);
                g.fillRect(8, 18, 4, 2);
                // Highlight
                g.fillStyle(0xffffff, 0.4);
                g.fillRect(6, 6, 4, 2);
            } else if (key === 'sparkle') {
                // 4-point star
                g.fillRect(8, 2, 4, 16);
                g.fillRect(2, 8, 16, 4);
                // Inner bright
                g.fillStyle(0xffffff, 0.6);
                g.fillRect(9, 6, 2, 8);
                g.fillRect(6, 9, 8, 2);
            } else {
                // Steam puff
                g.fillCircle(10, 12, 5);
                g.fillCircle(6, 8, 4);
                g.fillCircle(14, 8, 4);
                g.fillStyle(0xffffff, 0.4);
                g.fillCircle(8, 6, 2);
                g.fillCircle(12, 6, 2);
            }
        });
    }

    // ============================================================
    //  HELPER: Draw star shape
    // ============================================================
    drawStar(graphics, cx, cy, points, outer, inner) {
        const step = Math.PI / points;
        graphics.beginPath();
        for (let i = 0; i < 2 * points; i++) {
            const r = (i % 2 === 0) ? outer : inner;
            const angle = i * step - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
        graphics.closePath();
        graphics.fillPath();
    }
}
