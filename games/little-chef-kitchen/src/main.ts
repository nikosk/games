import Phaser from 'phaser';
import { KitchenScene } from './KitchenScene';
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#fbf3e6',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [KitchenScene], input: { activePointers: 2 }, render: { antialias: true },
});
game.canvas.setAttribute('aria-label', 'Little Chef: mix, fill, decorate and slice your own cake.');
game.canvas.setAttribute('role', 'application');
window.addEventListener('beforeunload', () => game.destroy(true), { once: true });
