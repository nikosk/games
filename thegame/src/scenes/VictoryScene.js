import Phaser from 'phaser';
import levelsData from '../data/levels.json';

export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  init(data) {
    this.levelId = data.levelId;
    this.levelName = data.levelName;
    this.isLastLevel = data.isLastLevel;
  }

  create() {
    const bg = this.add.graphics();
    bg.fillStyle(0xf0f7e6, 0.92);
    bg.fillRect(0, 0, 960, 640);

    // Stars
    for (let i = 0; i < 12; i++) {
      const sx = Phaser.Math.Between(50, 910);
      const sy = Phaser.Math.Between(50, 590);
      const star = this.add.star(sx, sy, 5, 8, 16, 0xffd93d);
      star.setAlpha(0);
      this.tweens.add({
        targets: star,
        alpha: { from: 0, to: 1 },
        scaleX: { from: 0, to: 1 },
        scaleY: { from: 0, to: 1 },
        delay: Phaser.Math.Between(0, 600),
        duration: 400,
        ease: 'Back.easeOut',
        yoyo: true,
        repeat: -1,
        hold: 600,
      });
    }

    // Confetti particles
    this.spawnConfetti();

    // Big celebration text
    const titleText = this.add.text(480, 160, 'Level Complete!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#4a90d9',
    }).setOrigin(0.5).setAlpha(0).setScale(0.5);

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Level name
    this.add.text(480, 230, this.levelName, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '24px',
      color: '#5a4a3a',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: this.children.list[this.children.list.length - 1],
      alpha: 1,
      delay: 300,
      duration: 500,
    });

    if (this.isLastLevel) {
      const allDone = this.add.text(480, 300, 'You beat all the levels!\nAmazing!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#6bcb77',
        align: 'center',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: allDone,
        alpha: 1,
        delay: 800,
        duration: 600,
      });

      this.createButton(480, 400, 'Play Again', () => {
        this.scene.start('MenuScene');
      });
    } else {
      this.createButton(480, 340, 'Next Level', () => {
        this.scene.start('BattleScene', { levelId: this.levelId + 1 });
      });

      this.createButton(480, 410, 'Level Select', () => {
        this.scene.start('MenuScene');
      }, true);
    }
  }

  createButton(x, y, label, callback, secondary = false) {
    const w = secondary ? 180 : 220;
    const h = secondary ? 40 : 50;
    const bg = this.add.graphics();
    bg.fillStyle(secondary ? 0xffffff : 0x4a90d9, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    bg.lineStyle(2, secondary ? 0x4a90d9 : 0x3a80c9, 1);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);

    const txt = this.add.text(x, y, label, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: secondary ? '18px' : '22px',
      fontStyle: 'bold',
      color: secondary ? '#4a90d9' : '#ffffff',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      this.tweens.add({ targets: [bg, txt], scaleX: 1.05, scaleY: 1.05, duration: 80 });
    });
    zone.on('pointerout', () => {
      this.tweens.add({ targets: [bg, txt], scaleX: 1, scaleY: 1, duration: 80 });
    });
    zone.on('pointerdown', callback);
  }

  spawnConfetti() {
    const colors = [0xff8c42, 0xffd93d, 0x6bcb77, 0x4a90d9, 0xe74c3c, 0x9b59b6, 0xff6b6b];
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(-20, 980);
      const startY = Phaser.Math.Between(-100, -10);
      const endY = Phaser.Math.Between(500, 680);
      const color = Phaser.Utils.Array.GetRandom(colors);

      const shape = Math.random() > 0.5 ? 'rect' : 'circle';
      let piece;
      if (shape === 'rect') {
        const size = Phaser.Math.Between(6, 14);
        piece = this.add.graphics();
        piece.fillStyle(color, 0.9);
        piece.fillRect(0, 0, size, size * 0.6);
        piece.setPosition(x, startY);
        piece.setAngle(Phaser.Math.Between(0, 360));
      } else {
        const r = Phaser.Math.Between(4, 8);
        piece = this.add.graphics();
        piece.fillStyle(color, 0.9);
        piece.fillCircle(0, 0, r);
        piece.setPosition(x, startY);
      }

      this.tweens.add({
        targets: piece,
        y: endY,
        x: x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(-360, 720),
        duration: Phaser.Math.Between(1500, 3500),
        delay: Phaser.Math.Between(0, 1200),
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.tweens.add({
            targets: piece,
            alpha: 0,
            duration: 400,
            onComplete: () => piece.destroy(),
          });
        },
      });
    }
  }
}
