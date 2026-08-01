import Phaser from 'phaser';
import { ToyshopScene } from './scenes/ToyshopScene';
import { CountingRoomScene } from './scenes/CountingRoomScene';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#241b38',
  scene: [ToyshopScene, CountingRoomScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  input: {
    activePointers: 3,
  },
});

const canvas = game.canvas;
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', 'The Enchanted Toyshop — solve picture puzzles, then counting puzzles, to open the magic door');
canvas.setAttribute('role', 'application');

window.addEventListener('beforeunload', () => game.destroy(true), { once: true });
