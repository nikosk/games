import Phaser from 'phaser';
import { CheeseHeistScene } from './scenes/CheeseHeistScene';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2b2a4a',
  scene: [CheeseHeistScene],
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
      gravity: { x: 0, y: 1000 },
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
canvas.setAttribute('aria-label', 'Cheese Heist — sneak past the cat, steal the cheese, escape through the vent');
canvas.setAttribute('role', 'application');

window.addEventListener('beforeunload', () => game.destroy(true), { once: true });
