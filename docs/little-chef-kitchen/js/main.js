/**
 * Little Chef's Automated Kitchen - Main Entry Point
 */

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#2c1810',
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, GameScene, UIScene],
    input: {
        activePointers: 3,
        smoothFactor: 0.1
    }
};

// Initialize game when DOM is ready
window.onload = () => {
    const game = new Phaser.Game(config);
    
    // Handle resize
    window.addEventListener('resize', () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
    });
    
    // Prevent default touch behaviors
    document.addEventListener('touchmove', (e) => {
        if (e.target.tagName === 'CANVAS') {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
    });
};
