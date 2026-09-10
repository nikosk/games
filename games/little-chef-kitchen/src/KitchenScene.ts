import Phaser from 'phaser';
import { addToShelf, fillings, flavours, freshCake, freshLayer, icings, onCake, onTop, readShelf, type Cake, type Layer, type Mark, type Point, type Tool } from './cake';

type Stage = 'mix' | 'bake' | 'fill' | 'decorate' | 'serve' | 'shelf';
const ink = '#513c36';
const rose = 0xb84e6b;
const shelfKey = 'little-chef-cakes-v1';
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
// Small original sounds, loaded and played by Phaser like any other audio asset.
function tone(frequency: number, duration: number): string {
  const rate = 22050, count = Math.floor(rate * duration), data = new Uint8Array(44 + count * 2), v = new DataView(data.buffer);
  const str = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, data.length - 8, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) v.setInt16(44 + i * 2, Math.sin(i / rate * frequency * Math.PI * 2) * Math.exp(-i / count * 5) * 6500, true);
  let binary = ''; data.forEach(b => { binary += String.fromCharCode(b); });
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export class KitchenScene extends Phaser.Scene {
  private stage: Stage = 'mix';
  private cake: Cake = freshCake();
  private layer: Layer = freshLayer();
  private added = [false, false, false];
  private mixed = false;
  private stir = 0;
  private angle = 0;
  private lastAngle: number | null = null;
  private spread: Point[] = [];
  private tool: Tool = 'pipe';
  private color = 1;
  private cut = false;
  private saved = false;
  private shelf: Cake[] = [];
  private returnStage: Stage = 'mix';
  private root!: Phaser.GameObjects.Container;
  private world!: Phaser.GameObjects.Container;
  private marks!: Phaser.GameObjects.Graphics;
  private active: Mark | null = null;
  private pointerId: number | null = null;
  private lastPoint: Point | null = null;
  private unit = 1;
  private w = 1100;
  private h = 760;
  private cx = 550;
  private cy = 350;
  private cakeScale = 1;
  private muted = false;
  private bakeRise = 0;
  private nameInput!: HTMLInputElement;
  private saveButton: Phaser.GameObjects.Container | null = null;
  private readonly nameChanged = () => {
    this.cake.name = this.nameInput.value.slice(0, 40); this.saved = false;
    this.saveButton?.list.forEach(child => { if (child instanceof Phaser.GameObjects.Text) child.setText('Save to shelf'); });
  };
  private undo: { marks: Mark[]; icing: number }[] = [];
  private progress: Phaser.GameObjects.Graphics | null = null;

  constructor() { super('KitchenScene'); }
  preload() { this.load.audio('tap', tone(640, .1)); this.load.audio('ding', tone(1040, .55)); }
  create() {
    this.nameInput = document.querySelector<HTMLInputElement>('#cake-name')!;
    this.nameInput.addEventListener('input', this.nameChanged);
    try { this.shelf = readShelf(localStorage.getItem(shelfKey)); } catch { this.shelf = []; }
    this.scale.on('resize', this.render, this);
    this.input.on('pointerdown', this.down, this);
    this.input.on('pointermove', this.move, this);
    this.input.on('pointerup', this.up, this);
    this.input.on('pointerupoutside', this.up, this);
    this.game.events.on('blur', this.up, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.render, this); this.input.off('pointerdown', this.down, this);
      this.input.off('pointermove', this.move, this); this.input.off('pointerup', this.up, this);
      this.input.off('pointerupoutside', this.up, this); this.game.events.off('blur', this.up, this);
      this.nameInput.removeEventListener('input', this.nameChanged);
      this.time.removeAllEvents(); this.tweens.killAll(); this.nameInput.style.display = 'none';
    });
    this.render();
  }
  private soundNote(key = 'tap') { if (!this.muted) this.sound.play(key, { volume: .6 }); }
  private text(x: number, y: number, value: string, size = 22, color = ink, serif = false, parent = this.root) {
    const t = this.add.text(x, y, value, { fontFamily: serif ? 'Georgia, serif' : 'Trebuchet MS, sans-serif', fontSize: `${size}px`, color, align: 'center', fontStyle: serif ? 'bold' : 'normal' }).setOrigin(.5);
    parent.add(t); return t;
  }
  private graphic(parent = this.root) { const g = this.add.graphics(); parent.add(g); return g; }
  private button(x: number, y: number, width: number, label: string, action: () => void, selected = false, enabled = true, color?: number) {
    const container = this.add.container(x, y); this.root.add(container);
    const g = this.graphic(container);
    g.fillStyle(selected ? rose : 0xdacbbb, .35).fillRoundedRect(-width / 2, -27, width, 60, 16);
    g.fillStyle(selected ? rose : 0xfffcf5).fillRoundedRect(-width / 2, -31, width, 60, 16);
    if (color !== undefined) g.fillStyle(color).fillCircle(-width / 2 + 23, -1, 12);
    this.text(color === undefined ? 0 : 13, -1, label, 20, selected ? '#ffffff' : ink, false, container);
    container.setAlpha(enabled ? 1 : .45);
    if (enabled) {
      const zone = this.add.zone(0, 0, width, 62).setInteractive({ useHandCursor: true }); container.add(zone);
      zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation(); this.soundNote(); action();
      });
    }
    return container;
  }
  private hint(value: string) {
    this.text(this.w / 2, 142, value, this.w < 800 ? 22 : 24);
    document.querySelector('#status')!.textContent = value;
  }
  private render() {
    if (!this.nameInput) return;
    if (this.stage === 'serve') this.cake.name = this.nameInput.value.slice(0, 40);
    this.active = null; this.pointerId = null; this.lastPoint = null; this.lastAngle = null;
    this.root?.destroy(true); this.progress = null; this.saveButton = null;
    this.unit = Math.min(this.scale.width / (this.scale.width < this.scale.height ? 700 : 1100), this.scale.height / 760);
    this.w = this.scale.width / this.unit; this.h = this.scale.height / this.unit;
    this.cx = this.w / 2; this.cy = 195 + (this.h - 195 - 230) * .30;
    this.cakeScale = this.w < 800 ? .92 : 1;
    this.root = this.add.container(0, 0).setScale(this.unit);
    const bg = this.graphic(); bg.fillStyle(0xfbf3e6).fillRect(0, 0, this.w, this.h);
    bg.lineStyle(1, 0xe6d8c5, .6);
    for (let x = 0; x < this.w; x += 70) bg.lineBetween(x, 170, x, this.h - 220);
    for (let y = 170; y < this.h - 220; y += 70) bg.lineBetween(0, y, this.w, y);
    bg.fillStyle(0xf0dfca).fillRoundedRect(18, this.h - 221, this.w - 36, 204, 28);
    this.text(33, 32, 'LITTLE CHEF', 19, '#976254').setOrigin(0, .5);
    this.text(33, 62, 'Cake workshop', 27, ink, true).setOrigin(0, .5);
    this.button(this.w - 169, 46, 130, this.stage === 'shelf' ? 'Back' : `Shelf · ${this.shelf.length}`, () => {
      if (this.stage === 'shelf') this.stage = this.returnStage;
      else { this.returnStage = this.stage; this.stage = 'shelf'; }
      this.render();
    }, false, this.stage !== 'bake');
    this.button(this.w - 60, 46, 70, this.muted ? '♪ off' : '♪ on', () => { this.muted = !this.muted; this.render(); });
    const stages = ['Mix', 'Fill', 'Decorate', 'Slice'];
    const current = this.stage === 'mix' || this.stage === 'bake' ? 0 : this.stage === 'fill' ? 1 : this.stage === 'decorate' ? 2 : 3;
    stages.forEach((s, i) => {
      const x = this.w / 2 + (i - 1.5) * 138;
      bg.fillStyle(i === current ? rose : 0xe8d8c5).fillRoundedRect(x - 61, 94, 122, 28, 14);
      this.text(x, 108, `${i + 1}  ${s}`, 17, i === current ? '#ffffff' : '#826e60');
    });
    this.world = this.add.container(this.cx, this.cy).setScale(this.cakeScale); this.root.add(this.world);
    this.nameInput.style.display = 'none';
    if (this.stage === 'shelf') { this.renderShelf(); return; }
    this.drawWorld();
    if (this.stage === 'mix') this.mixControls();
    if (this.stage === 'bake') {
      this.hint('A little oven magic…');
      this.text(this.w / 2, this.h - 113, 'Your sponge is rising!', 30, ink, true);
    }
    if (this.stage === 'fill') this.fillControls();
    if (this.stage === 'decorate') this.decorateControls();
    if (this.stage === 'serve') this.serveControls();
  }
  private mixControls() {
    const all = this.added.every(Boolean);
    this.hint(!all ? `Sponge ${this.cake.layers.length + 1} of 2 · Tap flour, egg and milk into the bowl.` : !this.mixed ? 'Choose a flavour and extras. Stir in circles in the bowl.' : 'Batter ready! Happy with your flavour? Let’s bake.');
    const y = this.h - 177;
    ['Flour', 'Egg', 'Milk'].forEach((label, i) => this.button(this.w / 2 + (i - 1) * 158, y, 146, `${this.added[i] ? '✓ ' : '+ '}${label}`, () => {
      this.added[i] = true; this.render(); this.burst(this.cx, this.cy, 0xffefd0);
    }, this.added[i], !this.added[i]));
    flavours.forEach((f, i) => this.button(this.w / 2 + (i - 1) * 180, y + 70, 168, f.name, () => { this.layer.flavour = i; this.render(); }, this.layer.flavour === i, true, f.color));
    this.button(this.w / 2 - 205, y + 140, 172, `${this.layer.chips ? '✓' : '+'} Choc chips`, () => { this.layer.chips = !this.layer.chips; this.render(); }, this.layer.chips);
    this.button(this.w / 2 - 20, y + 140, 172, `${this.layer.berries ? '✓' : '+'} Berry bits`, () => { this.layer.berries = !this.layer.berries; this.render(); }, this.layer.berries);
    this.button(this.w / 2 + 193, y + 140, 206, 'Bake sponge →', () => this.bake(), true, this.mixed);
    const g = this.graphic(); this.progress = g;
    g.fillStyle(0xe6d6c2).fillRoundedRect(this.cx - 120, this.h - 254, 240, 10, 5);
    g.fillStyle(rose).fillRoundedRect(this.cx - 120, this.h - 254, Math.max(1, 240 * this.stir / 5), 10, 5);
    this.text(this.cx, this.h - 279, this.mixed ? 'Beautifully mixed' : all ? 'Stir the bowl with your finger' : 'Your bowl is waiting', 20, '#886b59');
  }
  private bake() {
    if (!this.mixed || this.stage !== 'mix') return;
    this.stage = 'bake'; this.bakeRise = 0; this.render();
    this.tweens.add({ targets: this, bakeRise: 1, duration: 1700, ease: 'Sine.easeInOut', onUpdate: () => this.drawWorld(), onComplete: () => {
      this.cake.layers.push({ ...this.layer });
      this.stage = this.cake.layers.length === 2 ? 'fill' : 'mix';
      this.layer = freshLayer(); this.added = [false, false, false]; this.mixed = false; this.stir = 0;
      this.soundNote('ding'); this.render(); this.burst(this.cx, this.cy - 50, 0xf1bb61);
    } });
  }
  private fillControls() {
    this.hint('Pick a filling. Spread it across the bottom sponge.');
    fillings.forEach((f, i) => this.button(this.w / 2 + (i - 1) * 185, this.h - 168, 173, f.name, () => { this.cake.filling = i; this.render(); }, this.cake.filling === i, true, f.color));
    this.text(this.w / 2, this.h - 104, 'Use your finger like a little spatula.', 22);
    this.button(this.w / 2, this.h - 46, 290, 'Stack & decorate →', () => {
      this.stage = 'decorate'; this.render(); this.soundNote('ding'); this.burst(this.cx, this.cy, 0xfff1ca);
    }, true, this.spread.length > 0);
  }
  private decorateControls() {
    this.hint(this.tool === 'pipe' ? 'Draw icing on your cake. Every swirl is yours.' : `Tap the cake to add ${this.tool === 'berry' ? 'strawberries' : this.tool === 'flower' ? 'flowers' : this.tool === 'candle' ? 'candles' : this.tool}.`);
    const y = this.h - 177;
    const options: [Tool, string][] = [['pipe', 'Piping'], ['sprinkles', 'Sprinkles'], ['berry', 'Berries'], ['flower', 'Flowers'], ['candle', 'Candles']];
    options.forEach(([tool, label], i) => this.button(this.w / 2 + (i - 2) * 126, y, 116, label, () => { this.tool = tool; this.render(); }, this.tool === tool));
    this.text(this.w / 2 - 262, y + 69, 'Colour', 21);
    icings.forEach((color, i) => {
      const x = this.w / 2 - 158 + i * 69;
      const g = this.graphic(); g.fillStyle(this.color === i ? rose : 0xd5c0ac).fillCircle(x, y + 68, 28); g.fillStyle(color).fillCircle(x, y + 68, 22);
      const zone = this.add.zone(x, y + 68, 60, 62).setInteractive({ useHandCursor: true }); this.root.add(zone);
      zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); this.color = i; this.soundNote(); this.render(); });
    });
    this.button(this.w / 2 + 240, y + 69, 153, 'Coat top', () => { this.remember(); this.cake.icing = this.color; this.saved = false; this.render(); });
    this.button(this.w / 2 - 230, y + 140, 122, 'Undo', () => { const previous = this.undo.pop(); if (previous) { this.cake.marks = previous.marks; this.cake.icing = previous.icing; } this.render(); }, false, this.undo.length > 0);
    this.button(this.w / 2 - 94, y + 140, 130, 'Clear', () => { this.remember(); this.cake.marks = []; this.render(); }, false, this.cake.marks.length > 0);
    this.button(this.w / 2 + 170, y + 140, 258, 'Ready to slice →', () => { this.stage = 'serve'; this.cut = false; this.saved = false; this.nameInput.value = this.cake.name; this.render(); }, true);
  }
  private serveControls() {
    this.hint(this.cut ? 'Look inside! Those are the flavours you chose.' : 'Tap the cake to cut a slice and peek inside.');
    this.nameInput.style.cssText = `display:block;left:${(this.w / 2 - 225) * this.unit}px;top:${(this.h - 211) * this.unit}px;width:${450 * this.unit}px;height:${55 * this.unit}px;font-size:${22 * this.unit}px`;
    this.nameInput.value = this.cake.name;
    this.text(this.w / 2, this.h - 121, this.cake.layers.map(l => flavours[l.flavour]!.name).join(' + ') + ` · ${fillings[this.cake.filling]!.name}`, this.w < 800 ? 19 : 22);
    this.button(this.w / 2 - 222, this.h - 51, 180, '← Decorate', () => { this.cake.name = this.nameInput.value; this.stage = 'decorate'; this.render(); });
    this.saveButton = this.button(this.w / 2 - 19, this.h - 51, 202, this.saved ? 'Saved ✓' : 'Save to shelf', () => this.save(), true);
    this.button(this.w / 2 + 207, this.h - 51, 222, 'Make another →', () => {
      if (!this.saved && !this.save()) return;
      this.cake = freshCake(); this.layer = freshLayer(); this.added = [false, false, false]; this.stir = 0; this.mixed = false;
      this.spread = []; this.undo = []; this.cut = false; this.stage = 'mix'; this.nameInput.value = ''; this.render();
    });
  }
  private save(): boolean {
    if (this.saved) return true;
    this.cake.name = this.nameInput.value.trim() || 'My lovely cake';
    const next = addToShelf(this.shelf, this.cake);
    try { localStorage.setItem(shelfKey, JSON.stringify(next)); }
    catch { this.toast('This browser could not save. Your cake is still here.'); return false; }
    this.shelf = next; this.saved = true; this.nameInput.value = this.cake.name; this.soundNote('ding'); this.render(); return true;
  }
  private renderShelf() {
    this.hint('Your cake shelf · saved on this device');
    if (!this.shelf.length) this.text(this.w / 2, this.h / 2, 'Your first cake belongs here.\nLet’s make something lovely!', 30, ink, true);
    const cols = this.w < 800 ? 2 : 4, rows = Math.ceil(this.shelf.length / cols);
    const cellW = Math.min(250, (this.w - 40) / cols), cellH = Math.min(245, (this.h - 300) / Math.max(1, rows));
    this.shelf.forEach((cake, i) => {
      const x = this.w / 2 + (i % cols - (cols - 1) / 2) * cellW, y = 220 + Math.floor(i / cols) * cellH;
      const c = this.add.container(x, y).setScale(Math.min(.36, cellH / 540)); this.root.add(c); this.drawCake(c, cake, false);
      this.text(x, y + cellH * .55, cake.name, 18).setWordWrapWidth(cellW - 15);
      const zone = this.add.zone(x, y + 30, cellW - 8, cellH - 5).setInteractive({ useHandCursor: true }); this.root.add(zone);
      zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation(); this.cake = structuredClone(cake); this.undo = []; this.saved = true; this.cut = false; this.stage = 'serve'; this.nameInput.value = cake.name; this.render();
      });
    });
    this.text(this.w / 2, this.h - 99, 'Tap a cake to slice it or decorate it again.\nThe shelf keeps your eight newest cakes.', 23);
  }
  private drawWorld() {
    this.world.removeAll(true);
    if (this.stage === 'mix') { this.drawBowl(); return; }
    if (this.stage === 'bake') { this.drawOven(); return; }
    if (this.stage === 'fill') {
      const g = this.graphic(this.world);
      this.plate(g, -80); this.sponge(g, this.cake.layers[0]!, 0, 78);
      // A small initial dollop makes the spreading action discoverable.
      g.fillStyle(fillings[this.cake.filling]!.color).fillEllipse(0, 0, 85, 40, 96);
      for (const p of this.spread) g.fillStyle(fillings[this.cake.filling]!.color).fillEllipse(p.x, p.y, 65, 26, 96);
      g.lineStyle(3, 0xffffff, .35).strokeEllipse(-8, -4, 45, 13, 96);
      return;
    }
    if (this.stage === 'decorate' || this.stage === 'serve') this.drawCake(this.world, this.cake, this.cut && this.stage === 'serve');
  }
  private plate(g: Phaser.GameObjects.Graphics, offset = 0) {
    g.fillStyle(0x8d6f57, .12).fillEllipse(10, 209 + offset, 590, 120, 96);
    g.fillStyle(0x91b9ae).fillEllipse(0, 193 + offset, 585, 122, 96);
    g.fillStyle(0xe8f4e9).fillEllipse(0, 183 + offset, 585, 122, 96);
    g.lineStyle(3, 0xbad6c6).strokeEllipse(0, 183 + offset, 539, 96, 96);
  }
  private sponge(g: Phaser.GameObjects.Graphics, layer: Layer, y: number, height: number) {
    const f = flavours[layer.flavour]!;
    g.fillStyle(f.dark).fillEllipse(0, y + height, 480, 130, 96);
    g.fillStyle(f.color).fillRect(-240, y, 480, height).fillEllipse(0, y, 480, 174, 96);
    g.fillStyle(f.dark, .25);
    for (let i = 0; i < 70; i++) {
      const x = Math.sin(i * 17.3) * 227, yy = y + 10 + ((i * 31) % Math.max(1, height - 10));
      g.fillCircle(x, yy, 1.5 + i % 3);
    }
    this.bits(g, layer, y, height);
  }
  private bits(g: Phaser.GameObjects.Graphics, layer: Layer, y: number, height: number) {
    for (let i = 0; i < 30; i++) {
      const x = Math.sin(i * 12.7) * 217, yy = y + 12 + (i * 29 % Math.max(1, height - 20));
      if (layer.chips && i % 2 === 0) g.fillStyle(0x4b3029).fillTriangle(x - 4, yy + 4, x + 5, yy + 4, x, yy - 5);
      if (layer.berries && i % 2 === 1) g.fillStyle(0xb83962).fillEllipse(x, yy, 10, 7, 96);
    }
  }
  private drawCake(parent: Phaser.GameObjects.Container, cake: Cake, sliced: boolean) {
    const g = this.graphic(parent); this.plate(g);
    this.sponge(g, cake.layers[0] ?? freshLayer(), 90, 68);
    g.fillStyle(fillings[cake.filling]!.color).fillRect(-240, 68, 480, 28).fillEllipse(0, 92, 480, 155, 96);
    this.sponge(g, cake.layers[1] ?? freshLayer(), 0, 69);
    const icing = icings[cake.icing]!;
    g.fillStyle(icing).fillEllipse(0, 0, 491, 187, 96);
    for (let i = 0; i < 13; i++) {
      const x = -226 + i * 37.5, y = 66 * Math.sqrt(1 - (x / 246) ** 2);
      g.fillRoundedRect(x - 17, y - 12, 34, 24 + i % 3 * 13, 16);
    }
    const marks = this.graphic(parent);
    cake.marks.forEach(m => this.drawMark(marks, m));
    if (parent === this.world) this.marks = marks;
    if (sliced) this.drawSlice(g, parent, cake);
  }
  private drawSlice(_g: Phaser.GameObjects.Graphics, parent: Phaser.GameObjects.Container, cake: Cake) {
    // The two cut faces expose the actual chosen sponges, filling, and inclusions.
    const cut = this.graphic(parent);
    cut.fillStyle(0x51352c).fillTriangle(0, 0, 198, 55, 0, 94).fillTriangle(0, 0, 0, 164, 198, 210);
    const face = (g: Phaser.GameObjects.Graphics, ox: number, oy: number, slope = 55) => {
      const top = flavours[cake.layers[1]!.flavour]!, bottom = flavours[cake.layers[0]!.flavour]!;
      const poly = (color: number, y: number, height: number) => {
        g.fillStyle(color).fillPoints([{ x: ox, y: oy + y }, { x: ox + 180, y: oy + y + slope }, { x: ox + 180, y: oy + y + slope + height }, { x: ox, y: oy + y + height }], true);
      };
      poly(top.color, 0, 69); poly(fillings[cake.filling]!.color, 69, 23); poly(bottom.color, 92, 69);
      for (let l = 0; l < 2; l++) for (let i = 0; i < 20; i++) {
        const x = 10 + i * 31 % 160, y = x * slope / 180 + (i * 17 % 47) + (l === 0 ? 102 : 10);
        const layer = cake.layers[l]!;
        g.fillStyle(layer.chips && i % 2 === 0 ? 0x4c2e25 : layer.berries ? 0xbb3f63 : flavours[layer.flavour]!.dark, .85).fillCircle(ox + x, oy + y, layer.chips || layer.berries ? 3.5 : 1.5);
      }
    };
    face(cut, 0, 0);
    const slice = this.add.container(200, 40).setScale(.65); parent.add(slice);
    const piece = this.graphic(slice);
    face(piece, 0, 94, -39);
    piece.fillStyle(icings[cake.icing]!).fillTriangle(0, 0, 180, 55, 0, 94);
    piece.lineStyle(3, 0xffffff, .5).lineBetween(5, 5, 169, 55);
  }
  private drawBowl() {
    const g = this.graphic(this.world);
    g.fillStyle(0x856751, .13).fillEllipse(0, 160, 520, 60, 96);
    g.fillStyle(0x79a89e).fillEllipse(0, 74, 490, 195, 96).fillRect(-245, 0, 490, 75);
    g.fillStyle(0xb5d5c5).fillEllipse(0, 0, 520, 225, 96);
    g.fillStyle(0x547f75).fillEllipse(0, 0, 464, 181, 96);
    const count = this.added.filter(Boolean).length;
    if (count) {
      g.fillStyle(flavours[this.layer.flavour]!.color).fillEllipse(0, 2, 435, 160, 96);
      if (!this.mixed && this.stir < 2) {
        if (this.added[0]) g.fillStyle(0xfff5de).fillEllipse(-67, -12, 146, 65, 96);
        if (this.added[1]) { g.fillStyle(0xffeac6).fillEllipse(50, 10, 104, 69, 96); g.fillStyle(0xefb64d).fillCircle(53, 10, 24); }
        if (this.added[2]) g.fillStyle(0xfff5e7, .85).fillEllipse(0, 39, 182, 38, 96);
      }
      for (let i = 0; i < 22; i++) {
        const x = Math.sin(i * 17 + this.angle * .3) * (70 + i * 5), y = Math.cos(i * 9 + this.angle * .3) * (20 + i * 2);
        if (this.layer.chips && i % 2 === 0) g.fillStyle(0x523026).fillTriangle(x - 5, y + 4, x + 5, y + 4, x, y - 6);
        if (this.layer.berries && i % 2 === 1) g.fillStyle(0xb94466).fillEllipse(x, y, 13, 9, 96);
      }
      g.lineStyle(4, 0xffffff, .35);
      g.beginPath();
      for (let i = 0; i <= 80; i++) {
        const a = i / 80 * Math.PI * 4 + this.angle, r = 10 + i * 1.8;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * .36;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    }
    const sx = Math.cos(this.angle) * 100, sy = Math.sin(this.angle) * 35;
    g.lineStyle(19, 0x94603e).lineBetween(sx, sy, sx + 72, sy - 95);
    g.lineStyle(7, 0xc98e55).lineBetween(sx + 5, sy - 8, sx + 71, sy - 93);
    g.fillStyle(0xb77d49).fillEllipse(sx, sy, 58, 37, 96);
    g.fillStyle(0xd19e66).fillEllipse(sx - 3, sy - 4, 41, 22, 96);
    this.text(0, 106, `SPONGE ${this.cake.layers.length + 1}`, 20, '#fff7e7', false, this.world);

  }
  private drawOven() {
    const g = this.graphic(this.world);
    g.fillStyle(0x72988d).fillRoundedRect(-275, -118, 550, 350, 32);
    g.fillStyle(0xb8d1bb).fillRoundedRect(-275, -118, 550, 72, 25);
    for (const x of [-204, -146, 190]) { g.fillStyle(0xfff1d1).fillCircle(x, -83, 18); g.lineStyle(3, 0x9c7b59).lineBetween(x, -93, x, -83); }
    g.fillStyle(0x473632).fillRoundedRect(-234, -27, 468, 219, 24);
    g.fillStyle(0xf3b667, .35 + this.bakeRise * .25).fillRoundedRect(-218, -11, 436, 187, 16);
    g.lineStyle(5, 0xe6c7a0).lineBetween(-200, 146, 200, 146);
    g.fillStyle(flavours[this.layer.flavour]!.color).fillRoundedRect(-142, 109 - this.bakeRise * 76, 284, 35 + this.bakeRise * 76, 27);
    g.fillStyle(0x766477).fillRoundedRect(-155, 120, 310, 34, 9);
    this.text(0, -83, 'BAKE', 23, '#53786b', true, this.world);
  }
  private drawMark(g: Phaser.GameObjects.Graphics, mark: Mark) {
    if (mark.tool === 'pipe') {
      g.lineStyle(13, Phaser.Display.Color.IntegerToColor(mark.color).darken(12).color, 1);
      g.beginPath(); mark.points.forEach((p, i) => i ? g.lineTo(p.x, p.y + 3) : g.moveTo(p.x, p.y + 3)); g.strokePath();
      g.lineStyle(10, mark.color); g.beginPath(); mark.points.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.strokePath();
      for (const p of mark.points) g.fillStyle(mark.color).fillCircle(p.x, p.y, 5);
      return;
    }
    for (const p of mark.points) {
      if (mark.tool === 'sprinkles') {
        const colors = [0xf2b849, 0xe76f91, 0x7aaf9c, 0x9674ba, 0xfff4dd];
        for (let i = 0; i < 9; i++) {
          const x = p.x + Math.sin(i * 9 + p.x) * 22, y = p.y + Math.cos(i * 13 + p.y) * 15;
          if (!onCake({ x: x - 4, y: y - 3 }) || !onCake({ x: x + 4, y: y + 3 })) continue;
          g.lineStyle(4, colors[i % 5]!).lineBetween(x - 3, y - (i % 2 ? 3 : -3), x + 3, y + (i % 2 ? 3 : -3));
        }
      } else if (mark.tool === 'berry') {
        g.fillStyle(0x58332a, .18).fillEllipse(p.x + 4, p.y + 9, 39, 18, 96);
        g.fillStyle(0xc6435a).fillTriangle(p.x - 18, p.y - 8, p.x + 18, p.y - 8, p.x, p.y + 23).fillEllipse(p.x, p.y - 7, 36, 26, 96);
        g.fillStyle(0xf2777f).fillEllipse(p.x - 7, p.y - 7, 10, 16, 96);
        g.fillStyle(0xffdc92); for (let i = 0; i < 6; i++) g.fillEllipse(p.x - 10 + i % 3 * 9, p.y + Math.floor(i / 3) * 8, 2, 3, 96);
        g.fillStyle(0x578c63).fillTriangle(p.x - 15, p.y - 17, p.x + 13, p.y - 17, p.x, p.y - 6).fillTriangle(p.x - 5, p.y - 26, p.x + 8, p.y - 16, p.x - 10, p.y - 11);
      } else if (mark.tool === 'flower') {
        for (let i = 0; i < 6; i++) g.fillStyle(mark.color).fillCircle(p.x + Math.cos(i * Math.PI / 3) * 13, p.y + Math.sin(i * Math.PI / 3) * 11, 11);
        g.fillStyle(0xf4c357).fillCircle(p.x, p.y, 8); g.fillStyle(0xffe99a).fillCircle(p.x - 2, p.y - 2, 3);
      } else {
        g.fillStyle(0x704e3d, .14).fillEllipse(p.x + 4, p.y + 2, 26, 12, 96);
        g.fillStyle(mark.color).fillRoundedRect(p.x - 7, p.y - 50, 14, 52, 4);
        g.lineStyle(3, 0xffffff, .7); for (let i = 0; i < 4; i++) g.lineBetween(p.x - 6, p.y - 7 - i * 11, p.x + 6, p.y - 14 - i * 11);
        g.lineStyle(2, 0x604638).lineBetween(p.x, p.y - 50, p.x, p.y - 58);
        g.fillStyle(0xf3b94c).fillEllipse(p.x, p.y - 66, 16, 26, 96); g.fillStyle(0xffefb2).fillEllipse(p.x, p.y - 63, 7, 14, 96);
      }
    }
  }
  private point(pointer: Phaser.Input.Pointer): Point {
    return { x: (pointer.x / this.unit - this.cx) / this.cakeScale, y: (pointer.y / this.unit - this.cy) / this.cakeScale };
  }
  private down(pointer: Phaser.Input.Pointer) {
    if (this.pointerId !== null) return;
    const p = this.point(pointer);
    if (this.stage === 'serve' && onCake(p)) {
      this.cut = !this.cut; this.soundNote('ding'); this.render(); return;
    }
    if (this.stage === 'mix') {
      if (!onTop(p)) return;
      if (!this.added.every(Boolean)) { this.toast('Tap Flour, Egg and Milk below first.'); return; }
      this.pointerId = pointer.id; this.lastAngle = Math.atan2(p.y / .4, p.x); return;
    }
    if (this.stage === 'fill' && onTop(p)) { this.pointerId = pointer.id; this.spreadAt(p); return; }
    if (this.stage !== 'decorate' || !onCake(p) || (this.tool === 'candle' && !onTop(p))) return;
    if (this.cake.marks.length >= 250) { this.toast('Cake full of lovely things! Undo or clear to make room.'); return; }
    this.pointerId = pointer.id; this.remember(); this.saved = false;
    this.active = { tool: this.tool, color: icings[this.color]!, points: [p] }; this.cake.marks.push(this.active);
    this.lastPoint = p; this.drawWorld(); this.soundNote();
  }
  private move(pointer: Phaser.Input.Pointer) {
    if (!pointer.isDown || pointer.id !== this.pointerId) return;
    const p = this.point(pointer);
    if (this.stage === 'mix' && onTop(p)) {
      const a = Math.atan2(p.y / .4, p.x);
      if (this.lastAngle !== null && Math.hypot(p.x, p.y / .4) > 30) {
        const delta = Math.atan2(Math.sin(a - this.lastAngle), Math.cos(a - this.lastAngle));
        this.stir = Math.min(5, this.stir + Math.min(Math.abs(delta), .35)); this.angle = a;
      }
      this.lastAngle = a; this.drawWorld();
      this.progress?.clear().fillStyle(0xe6d6c2).fillRoundedRect(this.cx - 120, this.h - 254, 240, 10, 5).fillStyle(rose).fillRoundedRect(this.cx - 120, this.h - 254, Math.max(1, 240 * this.stir / 5), 10, 5);
      if (this.stir >= 5 && !this.mixed) { this.mixed = true; this.soundNote('ding'); this.render(); this.burst(this.cx, this.cy, 0xffe59c); }
    } else if (this.stage === 'fill' && onTop(p)) this.spreadAt(p);
    else if (this.stage === 'decorate' && this.active) {
      if (!onCake(p)) { this.lastPoint = null; return; }
      if (this.active.tool !== 'pipe' && this.active.tool !== 'sprinkles') return;
      if (this.active.points.length >= 600) return;
      const distance = this.lastPoint ? Phaser.Math.Distance.Between(p.x, p.y, this.lastPoint.x, this.lastPoint.y) : Infinity;
      if (distance < (this.active.tool === 'pipe' ? 3 : 24)) return;
      if (!this.lastPoint && this.cake.marks.length < 250) {
        this.active = { ...this.active, points: [] }; this.cake.marks.push(this.active);
      }
      this.active.points.push(p); this.lastPoint = p;
      this.marks.clear(); this.cake.marks.forEach(m => this.drawMark(this.marks, m));
    }
  }
  private up() {
    const wasDrawing = this.active !== null;
    const wasFilling = this.stage === 'fill' && this.pointerId !== null;
    this.active = null; this.pointerId = null; this.lastAngle = null; this.lastPoint = null;
    if (wasDrawing || wasFilling) this.render();
  }
  private spreadAt(p: Point) {
    if (this.spread.length >= 500 || this.spread.some(q => Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) < 14)) return;
    // Keep the spatula footprint on the sponge.
    this.spread.push({ x: p.x * .87, y: p.y * .78 }); this.drawWorld();
  }
  private remember() { this.undo.push({ marks: this.cake.marks.slice(), icing: this.cake.icing }); if (this.undo.length > 30) this.undo.shift(); }
  private burst(x: number, y: number, color: number) {
    for (let i = 0; i < 12; i++) {
      const dot = this.add.circle(x, y, 4 + i % 3, color); this.root.add(dot);
      this.tweens.add({ targets: dot, x: x + Math.cos(i * Math.PI / 6) * 135, y: y + Math.sin(i * Math.PI / 6) * 90, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => dot.destroy() });
    }
  }
  private toast(value: string) {
    const t = this.text(this.w / 2, 184, value, 20, '#a63f5a');
    this.tweens.add({ targets: t, alpha: 0, delay: 1900, duration: 400, onComplete: () => t.destroy() });
  }
}
