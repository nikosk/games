import Phaser from 'phaser';
import { WildPairsScene } from './scenes/WildPairsScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#b8cf9f',
  scene: [WildPairsScene],
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
    activePointers: 2,
  },
});

const canvas = game.canvas;
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', 'Wild Pairs meadow animal matching board');
canvas.setAttribute('role', 'application');

window.addEventListener('beforeunload', () => game.destroy(true), { once: true });
