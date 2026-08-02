import Phaser from 'phaser';
import { installSceneShell } from '../ui/sceneShell';

const W = 1280;
const H = 720;
const INK = 0x35253f;
const NIGHT = 0x241b38;
const PLUM = 0x70436f;
const CREAM = 0xffedce;
const GOLD = 0xf7c85f;
const ROSE = 0xe98798;
const TEAL = 0x65c6a5;
const BLUE = 0x78b8d6;
const CORAL = 0xf2a489;
const GREEN = 0x97d383;
const PURPLE = 0x9b8fd4;
const NUMERAL_FONT = '"Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(NIGHT);
    this.drawBackground();
    this.createFairy();
    this.createLevelCard(350, 405, 1, PLUM, () => this.drawToyshopCard(), 'Toyshop');
    this.createLevelCard(930, 405, 2, CORAL, () => this.drawCountingCard(), 'CountingRoom');
    installSceneShell(this);
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillStyle(NIGHT, 1);
    g.fillRect(-300, -300, W + 600, H + 600);
    g.fillGradientStyle(0x533b6b, 0x533b6b, NIGHT, NIGHT, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x8b4a73, 0.32);
    g.fillEllipse(640, 220, 980, 440);
    g.fillStyle(CREAM, 0.16);
    g.fillRoundedRect(62, 62, W - 124, H - 124, 54);
    g.lineStyle(6, CREAM, 0.36);
    g.strokeRoundedRect(62, 62, W - 124, H - 124, 54);

    const stars = [
      [110, 116], [205, 92], [1070, 112], [1170, 170], [620, 78], [710, 128],
      [90, 580], [1190, 560], [640, 650], [575, 120], [760, 620],
    ] as const;
    for (const [x, y] of stars) {
      g.fillStyle(GOLD, 0.72);
      g.fillCircle(x, y, 4);
      g.lineStyle(2, GOLD, 0.45);
      g.lineBetween(x - 9, y, x + 9, y);
      g.lineBetween(x, y - 9, x, y + 9);
    }
  }

  private createFairy(): void {
    const fairy = this.add.container(640, 116);
    const g = this.add.graphics();
    g.fillStyle(CREAM, 0.7);
    g.fillEllipse(-24, 0, 34, 55);
    g.fillEllipse(24, 0, 34, 55);
    g.lineStyle(4, INK, 0.65);
    g.strokeEllipse(-24, 0, 34, 55);
    g.strokeEllipse(24, 0, 34, 55);
    g.fillStyle(GOLD, 1);
    g.fillCircle(0, -16, 14);
    g.fillStyle(ROSE, 1);
    g.fillTriangle(-14, -10, 14, -10, 0, 30);
    g.lineStyle(4, INK, 1);
    g.strokeTriangle(-14, -10, 14, -10, 0, 30);
    g.fillStyle(INK, 1);
    g.fillCircle(-5, -18, 2.5);
    g.fillCircle(5, -18, 2.5);
    g.fillStyle(GOLD, 1);
    g.fillCircle(0, -32, 6);
    fairy.add(g);

    this.tweens.add({
      targets: fairy,
      y: 102,
      angle: { from: -3, to: 3 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private createLevelCard(
    x: number,
    y: number,
    numeral: number,
    color: number,
    makePicture: () => Phaser.GameObjects.Container,
    sceneKey: string,
  ): void {
    const card = this.add.container(x, y).setSize(440, 420).setInteractive({ useHandCursor: true });
    const frame = this.add.graphics();
    frame.fillStyle(color, 1);
    frame.fillRoundedRect(-220, -210, 440, 420, 46);
    frame.lineStyle(10, INK, 1);
    frame.strokeRoundedRect(-220, -210, 440, 420, 46);
    frame.lineStyle(5, CREAM, 0.86);
    frame.strokeRoundedRect(-202, -192, 404, 384, 34);
    card.add(frame);

    const picture = makePicture();
    picture.setPosition(0, 18);
    card.add(picture);

    const badge = this.add.graphics();
    badge.fillStyle(CREAM, 1);
    badge.fillCircle(0, -160, 58);
    badge.lineStyle(8, INK, 1);
    badge.strokeCircle(0, -160, 58);
    card.add(badge);
    card.add(this.add.text(0, -160, String(numeral), {
      fontFamily: NUMERAL_FONT,
      fontSize: '70px',
      color: '#35253f',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    const choose = (): void => {
      card.disableInteractive();
      this.tweens.add({
        targets: card,
        scale: 0.94,
        duration: 90,
        yoyo: true,
        onComplete: () => this.scene.start(sceneKey),
      });
    };
    card.on('pointerdown', choose);
    card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.025, duration: 120 }));
    card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 120 }));

    this.tweens.add({
      targets: card,
      y: y - 8,
      duration: 1500 + numeral * 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private drawToyshopCard(): Phaser.GameObjects.Container {
    const picture = this.add.container();
    const g = this.add.graphics();

    g.fillStyle(0x4d3157, 1);
    g.fillRoundedRect(-164, -82, 328, 224, 28);
    g.fillStyle(GOLD, 0.22);
    g.fillRoundedRect(-66, -66, 132, 188, 54);
    g.fillStyle(INK, 1);
    g.fillRoundedRect(-52, -54, 104, 176, 46);
    g.fillStyle(0x79506d, 1);
    g.fillRoundedRect(-41, -34, 38, 132, 18);
    g.fillRoundedRect(3, -34, 38, 132, 18);
    g.fillStyle(GOLD, 1);
    g.fillCircle(-5, 36, 5);
    g.fillCircle(5, 36, 5);

    for (let index = 0; index < 4; index += 1) {
      g.fillStyle(index % 2 === 0 ? GOLD : CREAM, 1);
      g.fillCircle(-54 + index * 36, -76, 7);
    }

    this.drawBear(g, -118, 66, ROSE);
    this.drawBear(g, 118, 66, TEAL);
    picture.add(g);
    return picture;
  }

  private drawCountingCard(): Phaser.GameObjects.Container {
    const picture = this.add.container();
    const g = this.add.graphics();

    g.fillStyle(0xf8bda6, 1);
    g.fillRoundedRect(-164, -82, 328, 224, 28);
    const flags = [TEAL, GREEN, PURPLE, GOLD];
    flags.forEach((color, index) => {
      const x = -118 + index * 78;
      g.fillStyle(color, 1);
      g.fillTriangle(x - 20, -65, x + 20, -65, x, -28);
    });

    g.fillStyle(ROSE, 1);
    g.fillRoundedRect(-138, 38, 82, 54, 17);
    g.fillStyle(CREAM, 1);
    g.fillRoundedRect(-50, 38, 82, 54, 17);
    g.fillStyle(BLUE, 1);
    g.fillRoundedRect(38, 38, 82, 54, 17);
    g.lineStyle(6, INK, 1);
    g.strokeRoundedRect(-138, 38, 82, 54, 17);
    g.strokeRoundedRect(-50, 38, 82, 54, 17);
    g.strokeRoundedRect(38, 38, 82, 54, 17);
    for (const x of [-116, -74, -28, 14, 60, 102]) g.strokeCircle(x, 98, 9);
    g.fillStyle(GOLD, 1);
    g.fillCircle(-105, -2, 22);
    g.fillCircle(0, -2, 22);
    g.fillCircle(105, -2, 22);
    g.lineStyle(5, INK, 1);
    g.strokeCircle(-105, -2, 22);
    g.strokeCircle(0, -2, 22);
    g.strokeCircle(105, -2, 22);

    picture.add(g);
    return picture;
  }

  private drawBear(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    g.fillStyle(color, 1);
    g.fillCircle(x - 20, y - 24, 13);
    g.fillCircle(x + 20, y - 24, 13);
    g.fillCircle(x, y - 15, 27);
    g.fillEllipse(x, y + 28, 48, 60);
    g.lineStyle(5, INK, 1);
    g.strokeCircle(x, y - 15, 27);
    g.strokeEllipse(x, y + 28, 48, 60);
    g.fillStyle(CREAM, 0.9);
    g.fillEllipse(x, y - 7, 18, 13);
    g.fillStyle(INK, 1);
    g.fillCircle(x - 8, y - 20, 3);
    g.fillCircle(x + 8, y - 20, 3);
  }
}
