import Phaser from 'phaser';
import levelsData from '../data/levels.json';

const PROGRESS_KEY = 'critter_tactics_progress';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.loadProgress();
    this.createBackground();
    this.createTitle();
    this.createLevelGrid();
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      this.progress = raw ? JSON.parse(raw) : { unlockedLevel: 1, completedLevels: [] };
    } catch {
      this.progress = { unlockedLevel: 1, completedLevels: [] };
    }
    if (!this.progress.completedLevels) {
      this.progress.completedLevels = [];
    }
  }

  saveProgress() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.progress));
  }

  createBackground() {
    const bg = this.add.graphics();
    bg.fillStyle(0xf0f7e6, 1);
    bg.fillRect(0, 0, 960, 640);

    // Decorative circles
    bg.fillStyle(0xe8f5e0, 1);
    bg.fillCircle(120, 100, 60);
    bg.fillCircle(840, 540, 80);
    bg.fillCircle(800, 80, 40);
  }

  createTitle() {
    this.add.text(480, 60, 'Critter Tactics', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#5a4a3a',
    }).setOrigin(0.5);

    this.add.text(480, 105, 'Choose a level!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '22px',
      color: '#7a6a5a',
    }).setOrigin(0.5);
  }

  createLevelGrid() {
    const cols = 5;
    const startX = 180;
    const startY = 170;
    const spacingX = 150;
    const spacingY = 200;

    levelsData.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      this.createLevelButton(level, x, y);
    });
  }

  createLevelButton(level, x, y) {
    const isUnlocked = level.id <= this.progress.unlockedLevel;
    const isCompleted = this.progress.completedLevels.includes(level.id);
    const size = 110;

    const bg = this.add.graphics();

    if (isCompleted) {
      bg.fillStyle(0x6bcb77, 0.3);
      bg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 16);
      bg.lineStyle(3, 0x6bcb77, 1);
      bg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 16);
    } else if (isUnlocked) {
      bg.fillStyle(0xffffff, 0.9);
      bg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 16);
      bg.lineStyle(3, 0x4a90d9, 1);
      bg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 16);
    } else {
      bg.fillStyle(0xcccccc, 0.5);
      bg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 16);
      bg.lineStyle(2, 0xaaaaaa, 1);
      bg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 16);
    }

    const numText = this.add.text(x, y - 14, `${level.id}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: isUnlocked ? '#4a90d9' : '#999999',
    }).setOrigin(0.5);

    const nameText = this.add.text(x, y + 22, level.name, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: isUnlocked ? '#5a4a3a' : '#aaaaaa',
    }).setOrigin(0.5);

    let statusText = null;
    if (isCompleted) {
      statusText = this.add.text(x, y + 40, '\u2605', {
        fontSize: '24px',
      }).setOrigin(0.5);
    } else if (!isUnlocked) {
      statusText = this.add.text(x, y + 38, '\uD83D\uDD12', {
        fontSize: '20px',
      }).setOrigin(0.5);
    }

    if (isUnlocked) {
      const hitZone = this.add.zone(x, y, size, size).setInteractive({ useHandCursor: true });

      hitZone.on('pointerover', () => {
        this.tweens.add({
          targets: [bg, numText, nameText],
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100,
        });
      });

      hitZone.on('pointerout', () => {
        this.tweens.add({
          targets: [bg, numText, nameText],
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      });

      hitZone.on('pointerdown', () => {
        this.scene.start('BattleScene', { levelId: level.id });
      });
    }
  }
}
