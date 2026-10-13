import Phaser from 'phaser';
import background from '../assets/animation/pond-background.png';
import poses from '../assets/animation/poses.png';
import { STUDIES, StudyScene, type Study } from './studies';

const play = document.querySelector<HTMLButtonElement>('#play')!;
const sound = document.querySelector<HTMLButtonElement>('#sound')!;

class PondScene extends Phaser.Scene {
  private bunny!: Phaser.GameObjects.Image;
  private duck!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private net!: Phaser.GameObjects.Image;
  private ripple!: Phaser.GameObjects.Ellipse;
  private running = false;
  private caught = false;
  private enabled = true;
  private selected = false;
  private tray!: Phaser.GameObjects.Container;
  private selection!: Phaser.GameObjects.Rectangle;
  private audioContext: AudioContext | undefined;
  private bob: Phaser.Tweens.Tween | undefined;
  private breath: Phaser.Tweens.Tween | undefined;

  constructor() { super('pond'); }
  preload(): void {
    this.load.image('background', background);
    this.load.image('poses', poses);
  }
  create(): void {
    const texture = this.textures.get('poses');
    for (let i = 0; i < 4; i++) texture.add('bunny' + i, 0, i * 384, 0, 384, 525);
    texture.add('duck0', 0, 0, 550, 384, 400);
    texture.add('duck1', 0, 384, 550, 384, 400);
    texture.add('ball', 0, 800, 615, 320, 305);
    texture.add('net', 0, 1152, 550, 384, 430);
    this.add.image(800, 480, 'background').setDisplaySize(1600, 960);
    this.ripple = this.add.ellipse(1250, 616, 210, 34).setStrokeStyle(3, 0xe9f4df, .65);
    this.bunny = this.add.image(440, 575, 'poses', 'bunny0').setOrigin(.5, 1).setDisplaySize(350, 480);
    this.duck = this.add.image(775, 615, 'poses', 'duck0').setOrigin(.5, 1).setDisplaySize(320, 333);
    this.net = this.add.image(880, 525, 'poses', 'net').setOrigin(.1, .86).setDisplaySize(405, 454).setVisible(false);
    this.ball = this.add.image(1250, 555, 'poses', 'ball').setDisplaySize(160, 153);
    this.selection = this.add.rectangle(0, 0, 150, 125, 0xfff4d9).setStrokeStyle(4, 0xc6a76a).setInteractive({ useHandCursor: true });
    const icon = this.add.image(0, 0, 'poses', 'net').setDisplaySize(95, 107);
    this.tray = this.add.container(240, 845, [this.selection, icon]);
    this.selection.on('pointerdown', () => {
      if (this.running) return;
      this.selected = !this.selected;
      this.selection.setStrokeStyle(6, this.selected ? 0xe29b32 : 0xc6a76a);
      if (this.selected) this.tweens.add({ targets: this.ball, angle: 6, yoyo: true, repeat: 1, duration: 180 });
    });
    this.add.zone(1250, 555, 260, 240).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (this.selected) this.start();
      else if (!this.running) this.request();
    });
    this.duck.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.running) this.request(); });
    play.onclick = () => this.start();
    sound.onclick = () => {
      this.enabled = !this.enabled;
      sound.setAttribute('aria-pressed', String(this.enabled));
      sound.textContent = this.enabled ? '♪' : '×';
    };
    this.reset();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      play.onclick = null; sound.onclick = null;
      void this.audioContext?.close();
    });
  }
  private note(frequency: number, length = .18): void {
    if (!this.enabled) return;
    this.audioContext ??= new AudioContext();
    void this.audioContext.resume();
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.055, now + .02);
    gain.gain.exponentialRampToValueAtTime(.001, now + length);
    oscillator.connect(gain); gain.connect(this.audioContext.destination);
    oscillator.start(); oscillator.stop(now + length + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  private reset(): void {
    this.tweens.killAll(); this.time.removeAllEvents();
    this.caught = false; this.selected = false;
    this.bunny.setFrame('bunny0').setPosition(440, 575).setAngle(0);
    this.duck.setFrame('duck0').setPosition(775, 615).setAngle(0);
    this.ball.setPosition(1250, 555).setAngle(0).setAlpha(1);
    this.net.setPosition(880, 525).setAngle(35).setVisible(false);
    this.ripple.setPosition(1250, 616).setAlpha(1).setScale(1);
    this.tray.setAlpha(1); this.selection.setStrokeStyle(4, 0xc6a76a);
    this.bob = this.tweens.add({ targets: this.ball, y: 562, angle: 3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.breath = this.tweens.add({ targets: this.duck, angle: -2, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.ripple, scaleX: 1.12, alpha: .45, duration: 1700, yoyo: true, repeat: -1 });
  }
  private request(): void {
    this.tweens.add({ targets: this.duck, x: 795, angle: 5, duration: 450, yoyo: true, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.selection, scaleX: 1.06, scaleY: 1.06, duration: 500, yoyo: true });
  }
  private later(delay: number, action: () => void): void { this.time.delayedCall(delay, action); }
  private start(): void {
    if (this.running) return;
    this.reset(); this.running = true; play.disabled = true;
    document.body.dataset.phase = 'reaching';
    this.request();
    this.later(1800, () => {
      document.body.dataset.phase = 'walking';
      this.breath?.stop();
      this.tweens.add({ targets: this.duck, x: 550, duration: 1000, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.tray, alpha: .3, duration: 400 });
      this.bunny.setFrame('bunny1');
      const steps = this.time.addEvent({ delay: 250, repeat: 5, callback: () => {
        this.bunny.setFrame(this.bunny.frame.name === 'bunny1' ? 'bunny0' : 'bunny1');
        this.note(180, .06);
      }});
      this.tweens.add({ targets: this.bunny, x: 775, y: 720, duration: 1600, ease: 'Sine.inOut',
        onComplete: () => { steps.remove(); this.bunny.setFrame('bunny2'); } });
    });
    this.later(3600, () => {
      document.body.dataset.phase = 'scooping';
      this.net.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.net, alpha: 1, angle: 55, duration: 1100, ease: 'Sine.inOut' });
    });
    this.later(4800, () => {
      this.bob?.stop();
      const tip = this.tip();
      this.tweens.add({ targets: this.ball, x: tip.x, y: tip.y, duration: 250, onComplete: () => { this.caught = true; } });
      this.note(420, .3);
      this.tweens.killTweensOf(this.ripple);
      this.tweens.add({ targets: this.ripple, scaleX: 1.5, alpha: 0, duration: 1000 });
    });
    this.later(5250, () => {
      this.tweens.add({ targets: this.net, angle: 0, duration: 1600, ease: 'Sine.inOut' });
    });
    this.later(7200, () => {
      document.body.dataset.phase = 'handoff'; this.caught = false;
      const from = { x: this.ball.x, y: this.ball.y };
      const arc = { t: 0 };
      this.tweens.add({ targets: arc, t: 1, duration: 1100, ease: 'Sine.inOut', onUpdate: () => {
        this.ball.setPosition(Phaser.Math.Linear(from.x, 580, arc.t), Phaser.Math.Linear(from.y, 505, arc.t) - Math.sin(arc.t * Math.PI) * 120);
        this.ball.angle = arc.t * 80;
      } });
      this.tweens.add({ targets: this.net, alpha: 0, duration: 700 });
      this.bunny.setFrame('bunny0');
    });
    this.later(8400, () => {
      document.body.dataset.phase = 'celebrating';
      this.duck.setFrame('duck1');
      this.bunny.setFrame('bunny3');
      this.tweens.add({ targets: this.duck, y: 580, duration: 280, yoyo: true, repeat: 2, ease: 'Sine.out' });
      this.tweens.add({ targets: this.bunny, y: 698, duration: 350, yoyo: true, repeat: 1, ease: 'Sine.out' });
      this.tweens.add({ targets: this.ball, y: 420, duration: 400, yoyo: true, repeat: 1, ease: 'Sine.out' });
      [523, 659, 784].forEach((f, i) => this.later(i * 180, () => this.note(f, .45)));
    });
    this.later(10800, () => {
      document.body.dataset.phase = 'complete'; this.running = false;
      play.disabled = false; play.textContent = '↻';
    });
  }
  private tip(): { x: number; y: number } {
    return this.net.getWorldTransformMatrix().transformPoint((.70 - .10) * this.net.width, (.24 - .86) * this.net.height);
  }
  update(): void {
    if (this.caught) { const tip = this.tip(); this.ball.setPosition(tip.x, tip.y); }
  }
}

const requestedStudy = new URLSearchParams(location.search).get('study');
const study = STUDIES.find(value => value === requestedStudy) as Study | undefined;
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#d5dfb9',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1600, height: 960 },
  scene: [study ? new StudyScene(study) : PondScene], input: { activePointers: 2 }, render: { antialias: true },
});
game.canvas.setAttribute('aria-label', 'Το κουνελάκι βοηθά το παπάκι να πιάσει την μπάλα του.');
window.addEventListener('beforeunload', () => game.destroy(true), { once: true });
