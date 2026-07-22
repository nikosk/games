import Phaser from 'phaser';
import { CanopyCaperScene } from './scenes/CanopyCaperScene';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2d5a27',
  scene: [CanopyCaperScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false,
    },
  },
  input: {
    activePointers: 2,
  },
  audio: {
    disableWebAudio: false,
  },
});

const canvas = game.canvas;
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', 'Canopy Caper jungle climb — run, jump, swing on vine, collect fruit, reach the top');
canvas.setAttribute('role', 'application');

window.addEventListener('beforeunload', () => game.destroy(true), { once: true });