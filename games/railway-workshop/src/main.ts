import Phaser from 'phaser';
import { WorkshopScene } from './scenes/WorkshopScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  backgroundColor: '#173f38',
  scene: [WorkshopScene],
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
    activePointers: 2,
  },
  audio: {
    disableWebAudio: false,
  },
});

window.addEventListener('beforeunload', () => game.destroy(true));
