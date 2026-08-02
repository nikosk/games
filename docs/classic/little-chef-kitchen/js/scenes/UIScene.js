/**
 * UIScene - Overlay UI scene that runs on top of GameScene
 */

class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: false });
    }

    create() {
        // This scene can be used for additional UI overlays
        // Most UI is currently handled within GameScene for simplicity
    }
}
