import Phaser from 'phaser';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { ToyshopScene } from './scenes/ToyshopScene';
import { CountingRoomScene } from './scenes/CountingRoomScene';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#241b38',
  scene: [LevelSelectScene, ToyshopScene, CountingRoomScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
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
canvas.setAttribute('aria-label', 'The Enchanted Toyshop — choose a room and solve its visual puzzles');
canvas.setAttribute('role', 'application');

window.addEventListener('beforeunload', () => game.destroy(true), { once: true });
