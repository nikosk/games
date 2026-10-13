import Phaser from 'phaser';
import actions from '../assets/review/actions-spaced.png';
import props from '../assets/review/props.png';
import pondPoses from '../assets/animation/poses.png';

export const STUDIES = ['cloth', 'bridge', 'leaves', 'box', 'apples', 'plates', 'sharing'] as const;
export type Study = typeof STUDIES[number];

/** Isolated painted action studies for the parent review, not playable puzzles. */
export class StudyScene extends Phaser.Scene {
  private actors: Phaser.GameObjects.Image[] = [];
  private running = false;
  constructor(private readonly study: Study) { super('study'); }
  preload(): void {
    this.load.image('actions', actions);
    this.load.image('props', props);
    this.load.image('pond-poses', pondPoses);
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#f8f0df');
    for (const [key, columns, rows] of [['actions', 4, 2]] as const) {
      const texture = this.textures.get(key);
      const source = texture.getSourceImage();
      for (let i = 0; i < columns * rows; i++) {
        const x = Math.round((i % columns) * source.width / columns);
        const y = Math.round(Math.floor(i / columns) * source.height / rows);
        const right = Math.round((i % columns + 1) * source.width / columns);
        const bottom = Math.round((Math.floor(i / columns) + 1) * source.height / rows);
        texture.add(i, 0, x, y, right - x, bottom - y);
      }
    }
    // The painted prop sheet has deliberately unequal row heights. Use the
    // inspected artwork bounds so nearby objects cannot bleed into a frame.
    const propBounds = [
      [10, 40, 432, 339], [438, 30, 374, 349], [840, 70, 350, 285], [1205, 137, 405, 231],
      [0, 393, 392, 254], [393, 405, 450, 235], [875, 392, 300, 252], [1190, 420, 425, 225],
      [10, 660, 385, 278], [490, 650, 300, 300], [855, 654, 319, 291], [1200, 665, 419, 284],
    ] as const;
    propBounds.forEach(([x, y, width, height], index) => this.textures.get('props').add(index, 0, x, y, width, height));
    const poses = this.textures.get('pond-poses');
    poses.add('bunny', 0, 0, 0, 384, 525);
    poses.add('happy', 0, 1152, 0, 384, 525);
    poses.add('duck', 0, 384, 550, 384, 400);
    const play = document.querySelector<HTMLButtonElement>('#play')!;
    const sound = document.querySelector<HTMLButtonElement>('#sound')!;
    sound.hidden = true;
    play.onclick = () => { if (!this.running) this.run(); };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { play.onclick = null; sound.hidden = false; });
    this.run();
  }
  private sprite(key: string, frame: string | number, x: number, y: number, width: number): Phaser.GameObjects.Image {
    const image = this.add.image(x, y, key, frame).setOrigin(.5, 1);
    image.setDisplaySize(width, width * image.height / image.width);
    this.actors.push(image);
    return image;
  }
  private prop(frame: number, x: number, y: number, width = 220): Phaser.GameObjects.Image {
    return this.sprite('props', frame, x, y, width);
  }
  private action(frame: number, x: number, y: number, width = 370): Phaser.GameObjects.Image {
    return this.sprite('actions', frame, x, y, width);
  }
  private after(delay: number, callback: () => void): void { this.time.delayedCall(delay, callback); }
  private hop(image: Phaser.GameObjects.Image): void {
    this.tweens.add({ targets: image, y: image.y - 28, duration: 280, yoyo: true, repeat: 1, ease: 'Sine.out' });
  }
  private run(): void {
    this.tweens.killAll(); this.time.removeAllEvents();
    for (const actor of this.actors) actor.destroy();
    this.actors = []; this.running = true;
    const play = document.querySelector<HTMLButtonElement>('#play')!;
    play.disabled = true;
    document.body.dataset.phase = 'study-' + this.study;
    if (this.study === 'cloth') {
      const bunny = this.action(0, 560, 615);
      const folded = this.prop(4, 620, 745, 300);
      const spread = this.prop(5, 955, 790, 650).setAlpha(0);
      this.after(1200, () => {
        this.tweens.add({ targets: folded, x: 860, y: 510, angle: -15, duration: 650, ease: 'Sine.inOut' });
        this.tweens.add({ targets: bunny, x: 705, duration: 650 });
      });
      this.after(1850, () => {
        spread.setPosition(860, 600).setScale(spread.scaleX * .6, spread.scaleY * .6);
        this.tweens.add({ targets: folded, alpha: 0, duration: 250 });
        this.tweens.add({ targets: spread, alpha: 1, x: 955, y: 790, scaleX: 650 / spread.width, scaleY: 650 / spread.width, duration: 1000, ease: 'Sine.inOut' });
      });
      this.after(3400, () => this.hop(bunny));
    } else if (this.study === 'bridge') {
      const plank = this.prop(0, 800, 430, 680).setAlpha(0);
      const bunny = this.sprite('pond-poses', 'bunny', 450, 715, 270);
      const hedgehog = this.action(6, 1220, 635, 260);
      this.after(900, () => this.tweens.add({ targets: plank, alpha: 1, y: 850, duration: 1000, ease: 'Sine.inOut' }));
      this.after(2100, () => {
        this.tweens.add({ targets: bunny, x: 1080, y: 580, duration: 2400, ease: 'Sine.inOut' });
        this.tweens.add({ targets: bunny, angle: 3, duration: 220, yoyo: true, repeat: 4 });
      });
      this.after(4800, () => this.hop(hedgehog));
    } else if (this.study === 'leaves') {
      const bunny = this.action(0, 385, 650, 330);
      const bed = this.prop(7, 1080, 770, 500).setAlpha(.12);
      const hedgehog = this.action(6, 1240, 595, 280);
      [0, 1, 2].forEach(i => {
        const leaf = this.prop(6, 570 + i * 160, 820, 180);
        this.after(1000 + i * 950, () => this.tweens.add({ targets: leaf, x: 990 + i * 70, y: 730, duration: 750, ease: 'Sine.inOut', onComplete: () => {
          leaf.setVisible(false); bed.setAlpha((i + 1) / 3);
        } }));
      });
      this.after(4300, () => {
        hedgehog.setFrame(7).setPosition(1070, 660); this.hop(hedgehog);
        bunny.setFrame(2);
      });
    } else if (this.study === 'box') {
      const box = this.prop(3, 690, 805, 330);
      const bunny = this.action(1, 465, 730, 360);
      const apple = this.prop(9, 1220, 410, 150);
      this.after(900, () => {
        this.tweens.add({ targets: box, x: 1080, duration: 1700, ease: 'Sine.inOut' });
        this.tweens.add({ targets: bunny, x: 850, duration: 1700, ease: 'Sine.inOut' });
      });
      this.after(2900, () => {
        bunny.setTexture('pond-poses', 'bunny').setDisplaySize(270, 370);
        this.tweens.add({ targets: bunny, x: 1080, y: 640, duration: 1000, ease: 'Sine.inOut' });
      });
      this.after(4200, () => this.tweens.add({ targets: apple, angle: 8, duration: 220, yoyo: true, repeat: 1 }));
    } else if (this.study === 'apples') {
      const bunny = this.sprite('pond-poses', 'bunny', 570, 670, 280);
      this.prop(3, 570, 815, 340).setDepth(-1);
      const puppy = this.action(4, 1220, 740, 340);
      this.prop(2, 910, 835, 320).setDepth(2);
      const apples = [0, 1, 2, 3].map(i => this.prop(9, 760 + i * 115, 300, 130));
      apples.forEach((apple, i) => this.after(1100 + i * 650, () => {
        this.tweens.add({ targets: apple, x: i === 3 ? 595 : 850 + i * 35, y: i === 3 ? 340 : 710, angle: (i - 1) * 20, duration: 850, ease: 'Quad.in' });
      }));
      this.after(4100, () => {
        apples[3]!.setVisible(false);
        bunny.setTexture('actions', 3).setDisplaySize(360, 360);
        puppy.setFrame(5); this.hop(puppy);
      });
      this.after(5200, () => {
        bunny.setTexture('pond-poses', 'bunny').setDisplaySize(280, 280 * 525 / 384);
        apples[3]!.setVisible(true).setPosition(595, 340);
        this.tweens.add({ targets: apples[3], x: 955, y: 710, duration: 750, ease: 'Sine.inOut' });
      });
    } else {
      this.prop(5, 810, 850, 980).setDepth(-2);
      this.sprite('pond-poses', 'bunny', 350, 550, 220);
      this.sprite('pond-poses', 'duck', 680, 430, 240);
      this.action(5, 1060, 435, 260);
      this.action(7, 1360, 560, 250);
      const places = [[500, 715], [750, 600], [1020, 600], [1240, 715]] as const;
      places.forEach(([x, y], i) => {
        const plate = this.prop(8, this.study === 'plates' ? 180 : x, this.study === 'plates' ? 850 - i * 18 : y, 200);
        if (this.study === 'plates') {
          this.after(800 + i * 850, () => this.tweens.add({ targets: plate, x, y, duration: 700, ease: 'Sine.inOut' }));
        } else {
          const apple = this.prop(9, 175, 830 - i * 12, 120).setDepth(2);
          this.after(800 + i * 850, () => this.tweens.add({ targets: apple, x, y: y - 40, duration: 700, ease: 'Sine.inOut' }));
        }
      });
      if (this.study === 'sharing') this.after(4600, () => {
        this.actors.filter(actor => actor.texture.key !== 'props').forEach(actor => this.hop(actor));
      });
    }
    this.after(6500, () => {
      this.running = false; play.disabled = false; play.textContent = '↻';
      document.body.dataset.phase = 'complete';
    });
  }
}
