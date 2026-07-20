import Phaser from 'phaser';
import { WorkshopScene } from './scenes/WorkshopScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#173f38',
  scene: [WorkshopScene],
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
  audio: {
    disableWebAudio: false,
  },
});

window.addEventListener('beforeunload', () => game.destroy(true));
