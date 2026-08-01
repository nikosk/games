import Phaser from 'phaser';
import puzzlePanelUrl from '../../assets/images/puzzle-panel.webp';
import toyshopRoomUrl from '../../assets/images/toyshop-room.webp';
import {
  LENS_TARGET,
  MELODY,
  PUZZLES,
  createToyshopState,
  cycleLens,
  doorIsOpen,
  itemMatchesTarget,
  lensesMatch,
  playMelodyNote,
  solvePuzzle,
  type PuzzleId,
  type ToyshopState,
} from '../game/rules';

const W = 1280;
const H = 720;
const INK = 0x35253f;
const NIGHT = 0x241b38;
const CREAM = 0xffedce;
const GOLD = 0xf7c85f;
const ROSE = 0xe98798;
const TEAL = 0x65c6a5;
const BLUE = 0x78b8d6;
const WOOD = 0x986443;

const STATION_POSITIONS: Readonly<Record<PuzzleId, { x: number; y: number }>> = {
  teddies: { x: 185, y: 330 },
  melody: { x: 405, y: 525 },
  picture: { x: 1080, y: 330 },
  kaleidoscope: { x: 875, y: 525 },
};

function starPoints(x: number, y: number, outer: number, inner: number): Phaser.Geom.Point[] {
  const points: Phaser.Geom.Point[] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? outer : inner;
    points.push(new Phaser.Geom.Point(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
  }
  return points;
}

export class ToyshopScene extends Phaser.Scene {
  private state: ToyshopState = createToyshopState();
  private readonly stations = new Map<PuzzleId, Phaser.GameObjects.Container>();
  private readonly sockets: Phaser.GameObjects.Graphics[] = [];
  private overlay: Phaser.GameObjects.Container | undefined;
  private guide: Phaser.GameObjects.Container | undefined;
  private doorLeft!: Phaser.GameObjects.Rectangle;
  private doorRight!: Phaser.GameObjects.Rectangle;
  private doorwayGlow!: Phaser.GameObjects.Ellipse;
  private overlayToken = 0;
  private doorOpened = false;

  constructor() {
    super('Toyshop');
  }

  preload(): void {
    this.load.image('toyshop-room', toyshopRoomUrl);
    this.load.image('puzzle-panel', puzzlePanelUrl);
  }

  create(): void {
    this.state = createToyshopState();
    this.stations.clear();
    this.sockets.length = 0;
    this.overlay = undefined;
    this.doorOpened = false;

    this.cameras.main.setBackgroundColor(NIGHT);
    this.drawRoom();
    this.createGuide();
    this.refreshRoom();

    this.input.keyboard?.on('keydown-ESC', () => this.closeOverlay());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
    });
  }

  private drawRoom(): void {
    this.add.image(W / 2, H / 2, 'toyshop-room').setDisplaySize(W, H);

    this.drawDoor();
    this.createStation('teddies', this.add.container());
    this.createStation('melody', this.add.container());
    this.createStation('picture', this.add.container());
    this.createStation('kaleidoscope', this.add.container());

    for (let index = 0; index < 28; index += 1) {
      const dust = this.add.circle(
        Phaser.Math.Between(55, W - 55),
        Phaser.Math.Between(70, 545),
        Phaser.Math.Between(1, 3),
        CREAM,
        Phaser.Math.FloatBetween(0.15, 0.48),
      );
      this.tweens.add({
        targets: dust,
        y: dust.y - Phaser.Math.Between(20, 55),
        alpha: { from: dust.alpha, to: 0.05 },
        duration: Phaser.Math.Between(2200, 4200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1800),
      });
    }
  }

  private drawDoor(): void {
    const g = this.add.graphics();
    g.fillStyle(GOLD, 0.18);
    g.fillRoundedRect(508, 100, 264, 470, 100);
    g.fillStyle(INK, 1);
    g.fillRoundedRect(526, 119, 228, 451, 90);

    this.doorwayGlow = this.add.ellipse(640, 365, 205, 380, 0xffe8a8, 0.08);

    this.doorLeft = this.add.rectangle(584, 373, 110, 384, 0x79506d).setOrigin(0.5);
    this.doorRight = this.add.rectangle(696, 373, 110, 384, 0x79506d).setOrigin(0.5);
    this.doorLeft.setStrokeStyle(5, GOLD, 0.35);
    this.doorRight.setStrokeStyle(5, GOLD, 0.35);

    const details = this.add.graphics();
    details.lineStyle(5, CREAM, 0.18);
    details.strokeRoundedRect(548, 196, 78, 116, 28);
    details.strokeRoundedRect(654, 196, 78, 116, 28);
    details.strokeRoundedRect(548, 333, 78, 170, 28);
    details.strokeRoundedRect(654, 333, 78, 170, 28);
    details.fillStyle(GOLD, 1);
    details.fillCircle(620, 384, 8);
    details.fillCircle(660, 384, 8);

    for (let index = 0; index < PUZZLES.length; index += 1) {
      const socket = this.add.graphics();
      socket.setPosition(568 + index * 48, 153);
      this.sockets.push(socket);
    }
  }

  private createStation(id: PuzzleId, station: Phaser.GameObjects.Container): void {
    const position = STATION_POSITIONS[id];
    station.setPosition(position.x, position.y);
    station.setSize(190, 230);
    station.setInteractive({ useHandCursor: true });
    station.on('pointerdown', () => this.openPuzzle(id));
    this.stations.set(id, station);

    const halo = this.add.ellipse(0, 10, 210, 245, GOLD, 0.08).setDepth(-1);
    station.addAt(halo, 0);
    station.setData('halo', halo);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.04, to: 0.18 },
      scale: { from: 0.96, to: 1.04 },
      duration: 1250,
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 500),
    });
  }

  private createGuide(): void {
    const c = this.add.container(640, 90).setDepth(30);
    const glow = this.add.circle(0, 0, 28, GOLD, 0.16);
    const body = this.add.graphics();
    body.fillStyle(GOLD, 1);
    body.fillCircle(0, 0, 8);
    body.fillStyle(CREAM, 0.85);
    body.fillEllipse(-12, -3, 18, 11);
    body.fillEllipse(12, -3, 18, 11);
    body.fillStyle(CREAM, 1);
    body.fillCircle(0, -11, 5);
    c.add([glow, body]);
    this.tweens.add({ targets: glow, scale: 1.35, alpha: 0.05, duration: 800, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: c, y: '+=12', duration: 1050, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
    this.guide = c;
  }

  private refreshRoom(): void {
    PUZZLES.forEach((id, index) => {
      const station = this.stations.get(id);
      if (!station) return;
      const solved = this.state.solved[id];
      const halo = station.getData('halo') as Phaser.GameObjects.Ellipse;
      halo.setFillStyle(solved ? TEAL : GOLD, solved ? 0.1 : 0.12);

      if (solved) {
        station.disableInteractive();
        if (!station.getData('badge')) {
          const badge = this.add.graphics();
          badge.setPosition(66, -91);
          badge.fillStyle(GOLD, 1);
          badge.fillPoints(starPoints(0, 0, 25, 11), true);
          badge.lineStyle(4, CREAM, 0.8);
          badge.strokePoints(starPoints(0, 0, 25, 11), true, true);
          station.add(badge);
          station.setData('badge', badge);
          this.tweens.add({ targets: badge, angle: 360, scale: { from: 0, to: 1 }, duration: 500, ease: 'Back.out' });
        }
      } else if (!this.overlay) {
        station.setInteractive({ useHandCursor: true });
      }

      const socket = this.sockets[index]!;
      socket.clear();
      socket.fillStyle(solved ? GOLD : 0x261c35, 1);
      socket.fillPoints(starPoints(0, 0, 18, 8), true);
      socket.lineStyle(3, solved ? CREAM : GOLD, solved ? 0.9 : 0.35);
      socket.strokePoints(starPoints(0, 0, 18, 8), true, true);
    });

    const next = PUZZLES.find((id) => !this.state.solved[id]);
    if (this.guide && next) {
      const position = STATION_POSITIONS[next];
      this.guide.setVisible(true);
      this.tweens.add({ targets: this.guide, x: position.x, y: position.y - 145, duration: 750, ease: 'Sine.inOut' });
    }

    if (doorIsOpen(this.state)) this.openDoor();
  }

  private openPuzzle(id: PuzzleId): void {
    if (this.overlay || this.state.solved[id] || this.doorOpened) return;
    this.overlayToken += 1;
    const token = this.overlayToken;
    for (const station of this.stations.values()) station.disableInteractive();
    this.guide?.setVisible(false);

    const overlay = this.add.container(W / 2, H / 2).setDepth(100);
    this.overlay = overlay;

    const shade = this.add.rectangle(0, 0, W, H, NIGHT, 0.82).setInteractive();
    const panel = this.add.image(0, 0, 'puzzle-panel').setDisplaySize(1000, 600);
    overlay.add([shade, panel]);

    const close = this.makeCloseButton(445, -245);
    close.on('pointerdown', () => this.closeOverlay());
    overlay.add(close);

    const emblem = this.add.graphics();
    emblem.setPosition(-438, -238);
    emblem.fillStyle(GOLD, 0.18);
    emblem.fillCircle(0, 0, 42);
    emblem.lineStyle(4, GOLD, 0.7);
    emblem.strokeCircle(0, 0, 42);
    this.drawPuzzleEmblem(emblem, id);
    overlay.add(emblem);

    if (id === 'teddies') this.createTeddyPuzzle(overlay, token);
    if (id === 'melody') this.createMelodyPuzzle(overlay, token);
    if (id === 'picture') this.createPicturePuzzle(overlay, token);
    if (id === 'kaleidoscope') this.createKaleidoscopePuzzle(overlay, token);

    overlay.setScale(0.92);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, scale: 1, duration: 260, ease: 'Back.out' });
  }

  private makeCloseButton(x: number, y: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setSize(74, 74).setInteractive({ useHandCursor: true });
    const g = this.add.graphics();
    g.fillStyle(CREAM, 0.12);
    g.fillCircle(0, 0, 34);
    g.lineStyle(6, CREAM, 0.9);
    g.strokeCircle(0, 0, 34);
    g.lineBetween(-12, -12, 12, 12);
    g.lineBetween(12, -12, -12, 12);
    button.add(g);
    return button;
  }

  private drawPuzzleEmblem(g: Phaser.GameObjects.Graphics, id: PuzzleId): void {
    if (id === 'teddies') {
      g.fillStyle(ROSE, 1);
      g.fillCircle(-12, -10, 10);
      g.fillCircle(12, -10, 10);
      g.fillCircle(0, 3, 23);
      g.fillStyle(CREAM, 1);
      g.fillEllipse(0, 8, 18, 13);
      return;
    }
    if (id === 'melody') {
      g.fillStyle(TEAL, 1);
      g.fillCircle(-8, 13, 9);
      g.fillCircle(16, 7, 9);
      g.fillRect(0, -19, 7, 33);
      g.fillRect(22, -22, 7, 32);
      g.fillRect(4, -22, 24, 7);
      return;
    }
    if (id === 'picture') {
      g.fillStyle(BLUE, 1);
      g.fillRoundedRect(-24, -24, 20, 20, 4);
      g.fillRoundedRect(4, -24, 20, 20, 4);
      g.fillRoundedRect(-24, 4, 20, 20, 4);
      g.fillRoundedRect(4, 4, 20, 20, 4);
      return;
    }
    g.fillStyle(GOLD, 1);
    g.fillPoints(starPoints(0, 0, 25, 11), true);
  }

  private createTeddyPuzzle(overlay: Phaser.GameObjects.Container, token: number): void {
    const targets = [-260, 0, 260];
    const colors = [ROSE, TEAL, BLUE];
    const targetY = -20;
    let matched = 0;

    targets.forEach((x, index) => {
      const bear = this.makeLargeBear(x, targetY, colors[index]!);
      overlay.add(bear);
    });

    const order = [2, 0, 1];
    order.forEach((item, position) => {
      const homeX = targets[position]!;
      const homeY = 215;
      const hat = this.makeHat(homeX, homeY, colors[item]!);
      hat.setData({ item, homeX, homeY, matched: false });
      overlay.add(hat);
      this.input.setDraggable(hat);

      hat.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (!hat.getData('matched')) hat.setPosition(dragX, dragY);
      });
      hat.on('dragend', () => {
        if (hat.getData('matched') || this.overlayToken !== token) return;
        let target = -1;
        targets.forEach((x, index) => {
          if (Phaser.Math.Distance.Between(hat.x, hat.y, x, targetY - 75) < 105) target = index;
        });

        if (target >= 0 && itemMatchesTarget(item, target)) {
          hat.setData('matched', true);
          hat.disableInteractive();
          matched += 1;
          this.tweens.add({ targets: hat, x: targets[target]!, y: targetY - 76, angle: 0, scale: 0.9, duration: 300, ease: 'Back.out' });
          this.burst(overlay, targets[target]!, targetY - 70, colors[item]!);
          if (matched === 3) this.time.delayedCall(450, () => this.finishPuzzle('teddies', token));
        } else {
          this.tweens.add({
            targets: hat,
            x: hat.getData('homeX') as number,
            y: hat.getData('homeY') as number,
            angle: { from: -8, to: 0 },
            duration: 360,
            ease: 'Back.out',
          });
        }
      });
    });
  }

  private makeLargeBear(x: number, y: number, scarfColor: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xb78359, 1);
    g.fillCircle(-34, -54, 26);
    g.fillCircle(34, -54, 26);
    g.fillCircle(0, -26, 66);
    g.fillEllipse(0, 72, 116, 142);
    g.fillCircle(-55, 65, 28);
    g.fillCircle(55, 65, 28);
    g.fillStyle(0xe4b989, 1);
    g.fillEllipse(0, -9, 46, 35);
    g.fillEllipse(0, 78, 68, 76);
    g.fillStyle(INK, 1);
    g.fillCircle(-19, -36, 6);
    g.fillCircle(19, -36, 6);
    g.fillCircle(0, -12, 8);
    g.fillStyle(scarfColor, 1);
    g.fillRoundedRect(-55, 25, 110, 24, 10);
    g.fillRoundedRect(25, 37, 23, 61, 9);
    g.lineStyle(5, scarfColor, 0.45);
    g.strokeEllipse(0, -95, 78, 30);
    c.add(g);
    return c;
  }

  private makeHat(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setSize(150, 110).setInteractive({ useHandCursor: true, draggable: true });
    const glow = this.add.ellipse(0, 15, 150, 72, CREAM, 0.08);
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-48, -28, 96, 56, 24);
    g.fillRoundedRect(-72, 17, 144, 24, 12);
    g.fillStyle(CREAM, 0.75);
    g.fillRoundedRect(-47, 8, 94, 12, 5);
    c.add([glow, g]);
    this.tweens.add({ targets: glow, scale: 1.12, alpha: 0.18, duration: 700, yoyo: true, repeat: -1 });
    return c;
  }

  private createMelodyPuzzle(overlay: Phaser.GameObjects.Container, token: number): void {
    const xs = [-235, 0, 235];
    const colors = [ROSE, TEAL, BLUE];
    const buttons = xs.map((x, index) => {
      const button = this.makeMelodyButton(x, 95, colors[index]!, index);
      overlay.add(button);
      return button;
    });

    const progressDots = xs.map((x) => {
      const dot = this.add.graphics();
      dot.setPosition(x, -125);
      dot.fillStyle(CREAM, 0.12);
      dot.fillCircle(0, 0, 25);
      dot.lineStyle(4, CREAM, 0.28);
      dot.strokeCircle(0, 0, 25);
      overlay.add(dot);
      return dot;
    });

    let notes: readonly number[] = [];
    let accepting = false;

    const flash = (index: number): void => {
      const button = buttons[index]!;
      const aura = button.getData('aura') as Phaser.GameObjects.Ellipse;
      this.tweens.add({ targets: button, scale: 1.22, duration: 150, yoyo: true, ease: 'Sine.inOut' });
      this.tweens.add({ targets: aura, alpha: 0.55, scale: 1.25, duration: 170, yoyo: true });
    };

    const clearDots = (): void => {
      progressDots.forEach((dot) => {
        dot.clear();
        dot.fillStyle(CREAM, 0.12);
        dot.fillCircle(0, 0, 25);
        dot.lineStyle(4, CREAM, 0.28);
        dot.strokeCircle(0, 0, 25);
      });
    };

    const showSequence = (): void => {
      if (this.overlayToken !== token) return;
      accepting = false;
      notes = [];
      clearDots();
      MELODY.forEach((note, index) => {
        this.time.delayedCall(300 + index * 520, () => {
          if (this.overlayToken === token) flash(note);
        });
      });
      this.time.delayedCall(300 + MELODY.length * 520, () => {
        if (this.overlayToken === token) accepting = true;
      });
    };

    buttons.forEach((button, index) => {
      button.on('pointerdown', () => {
        if (!accepting || this.overlayToken !== token) return;
        flash(index);
        const progress = playMelodyNote(notes, index);
        notes = progress.notes;

        if (progress.mistake) {
          accepting = false;
          this.cameras.main.shake(140, 0.0025);
          this.time.delayedCall(500, showSequence);
          return;
        }

        const dot = progressDots[notes.length - 1]!;
        dot.clear();
        dot.fillStyle(colors[index]!, 1);
        dot.fillCircle(0, 0, 25);
        dot.fillStyle(CREAM, 1);
        dot.fillPoints(starPoints(0, 0, 13, 6), true);

        if (progress.complete) {
          accepting = false;
          this.time.delayedCall(450, () => this.finishPuzzle('melody', token));
        }
      });
    });

    this.time.delayedCall(450, showSequence);
  }

  private makeMelodyButton(x: number, y: number, color: number, symbol: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setSize(180, 220).setInteractive({ useHandCursor: true });
    const aura = this.add.ellipse(0, 0, 180, 180, color, 0.12);
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, 72);
    g.lineStyle(8, CREAM, 0.82);
    g.strokeCircle(0, 0, 72);
    this.drawSymbol(g, symbol, 0, 0, 35, CREAM);
    g.fillStyle(WOOD, 1);
    g.fillRoundedRect(-15, 70, 30, 83, 12);
    g.fillStyle(GOLD, 1);
    g.fillCircle(0, 152, 20);
    c.add([aura, g]);
    c.setData('aura', aura);
    return c;
  }

  private createPicturePuzzle(overlay: Phaser.GameObjects.Container, token: number): void {
    const targets = [
      { x: -145, y: -72 },
      { x: 145, y: -72 },
      { x: -145, y: 78 },
      { x: 145, y: 78 },
    ];
    const homes = [-315, -105, 105, 315];
    const order = [2, 0, 3, 1];
    let matched = 0;

    const board = this.add.graphics();
    board.fillStyle(INK, 0.38);
    board.fillRoundedRect(-315, -175, 630, 350, 28);
    board.lineStyle(6, GOLD, 0.35);
    board.strokeRoundedRect(-315, -175, 630, 350, 28);
    overlay.add(board);

    targets.forEach((position, index) => {
      const target = this.makePictureTile(position.x, position.y, index, 0.2);
      overlay.add(target);
    });

    order.forEach((item, position) => {
      const homeX = homes[position]!;
      const homeY = 232;
      const tile = this.makePictureTile(homeX, homeY, item, 1);
      tile.setData({ item, homeX, homeY, matched: false });
      tile.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(tile);
      overlay.add(tile);

      tile.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (!tile.getData('matched')) tile.setPosition(dragX, dragY);
      });
      tile.on('dragend', () => {
        if (tile.getData('matched') || this.overlayToken !== token) return;
        let targetIndex = -1;
        targets.forEach((target, index) => {
          if (Phaser.Math.Distance.Between(tile.x, tile.y, target.x, target.y) < 105) targetIndex = index;
        });

        if (targetIndex >= 0 && itemMatchesTarget(item, targetIndex)) {
          tile.setData('matched', true);
          tile.disableInteractive();
          matched += 1;
          const target = targets[targetIndex]!;
          this.tweens.add({ targets: tile, x: target.x, y: target.y, scale: 1, angle: 0, duration: 280, ease: 'Back.out' });
          this.burst(overlay, target.x, target.y, [ROSE, TEAL, BLUE, GOLD][item] ?? GOLD);
          if (matched === 4) this.time.delayedCall(450, () => this.finishPuzzle('picture', token));
        } else {
          this.tweens.add({
            targets: tile,
            x: tile.getData('homeX') as number,
            y: tile.getData('homeY') as number,
            angle: { from: -6, to: 0 },
            duration: 340,
            ease: 'Back.out',
          });
        }
      });
    });
  }

  private makePictureTile(x: number, y: number, index: number, alpha: number): Phaser.GameObjects.Container {
    const colors = [ROSE, TEAL, BLUE, GOLD];
    const c = this.add.container(x, y).setSize(250, 125);
    const g = this.add.graphics();
    g.fillStyle(colors[index] ?? GOLD, alpha);
    g.fillRoundedRect(-120, -58, 240, 116, 22);
    g.lineStyle(5, CREAM, alpha * 0.85);
    g.strokeRoundedRect(-120, -58, 240, 116, 22);
    this.drawSymbol(g, index % 3, 0, 0, 33, alpha < 1 ? CREAM : INK, alpha < 1 ? 0.34 : 0.75);
    c.add(g);
    return c;
  }

  private createKaleidoscopePuzzle(overlay: Phaser.GameObjects.Container, token: number): void {
    const xs = [-245, 0, 245];
    const values = [0, 1, 2];
    const colors = [ROSE, TEAL, BLUE];

    xs.forEach((x, index) => {
      const beam = this.add.graphics();
      beam.setPosition(x, -115);
      beam.fillStyle(CREAM, 0.08);
      beam.fillTriangle(-75, 48, 75, 48, 0, 132);
      overlay.add(beam);

      const target = this.makeLens(x, -122, LENS_TARGET[index]!, colors[index]!, false);
      overlay.add(target);
    });

    const lenses = xs.map((x, index) => {
      const lens = this.makeLens(x, 130, values[index]!, colors[index]!, true);
      overlay.add(lens);
      return lens;
    });

    lenses.forEach((lens, index) => {
      lens.on('pointerdown', () => {
        if (this.overlayToken !== token) return;
        values[index] = cycleLens(values[index]!);
        const face = lens.getData('face') as Phaser.GameObjects.Graphics;
        this.redrawLens(face, values[index]!, colors[index]!, true);
        this.tweens.add({ targets: lens, angle: 12, scale: 1.1, duration: 100, yoyo: true, ease: 'Sine.inOut' });

        if (values[index] === LENS_TARGET[index]) {
          this.burst(overlay, xs[index]!, 130, colors[index]!);
        }
        if (lensesMatch(values)) {
          lenses.forEach((button) => button.disableInteractive());
          this.time.delayedCall(500, () => this.finishPuzzle('kaleidoscope', token));
        }
      });
    });
  }

  private makeLens(
    x: number,
    y: number,
    symbol: number,
    color: number,
    interactive: boolean,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setSize(190, 190);
    if (interactive) c.setInteractive({ useHandCursor: true });
    const glow = this.add.circle(0, 0, 93, color, interactive ? 0.13 : 0.06);
    const face = this.add.graphics();
    this.redrawLens(face, symbol, color, interactive);
    c.add([glow, face]);
    c.setData('face', face);
    if (interactive) this.tweens.add({ targets: glow, scale: 1.08, alpha: 0.24, duration: 850, yoyo: true, repeat: -1 });
    return c;
  }

  private redrawLens(face: Phaser.GameObjects.Graphics, symbol: number, color: number, interactive: boolean): void {
    face.clear();
    face.fillStyle(interactive ? CREAM : color, 1);
    face.fillCircle(0, 0, 73);
    face.lineStyle(8, interactive ? color : CREAM, 0.82);
    face.strokeCircle(0, 0, 73);
    this.drawSymbol(face, symbol, 0, 0, 37, interactive ? color : INK);
    if (interactive) {
      face.lineStyle(6, GOLD, 0.7);
      face.beginPath();
      face.arc(0, 0, 88, -0.55, 0.55);
      face.strokePath();
      face.fillStyle(GOLD, 1);
      face.fillTriangle(77, 45, 98, 40, 91, 61);
    }
  }

  private drawSymbol(
    g: Phaser.GameObjects.Graphics,
    symbol: number,
    x: number,
    y: number,
    size: number,
    color: number,
    alpha = 1,
  ): void {
    g.fillStyle(color, alpha);
    if (symbol === 0) {
      for (let index = 0; index < 6; index += 1) {
        const angle = index * Math.PI / 3;
        g.fillCircle(x + Math.cos(angle) * size * 0.55, y + Math.sin(angle) * size * 0.55, size * 0.38);
      }
      g.fillCircle(x, y, size * 0.4);
      return;
    }
    if (symbol === 1) {
      g.fillPoints([
        new Phaser.Geom.Point(x, y - size),
        new Phaser.Geom.Point(x + size * 0.75, y),
        new Phaser.Geom.Point(x, y + size),
        new Phaser.Geom.Point(x - size * 0.75, y),
      ], true);
      return;
    }
    g.fillPoints(starPoints(x, y, size, size * 0.45), true);
  }

  private burst(parent: Phaser.GameObjects.Container, x: number, y: number, color: number): void {
    for (let index = 0; index < 8; index += 1) {
      const sparkle = this.add.circle(x, y, 5, index % 2 === 0 ? color : CREAM, 1);
      parent.add(sparkle);
      const angle = index * Math.PI / 4;
      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * 70,
        y: y + Math.sin(angle) * 70,
        alpha: 0,
        scale: 0.2,
        duration: 430,
        ease: 'Quad.out',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private finishPuzzle(id: PuzzleId, token: number): void {
    if (!this.overlay || this.overlayToken !== token || this.state.solved[id]) return;
    this.state = solvePuzzle(this.state, id);

    const star = this.add.graphics();
    star.fillStyle(GOLD, 1);
    star.fillPoints(starPoints(0, 0, 70, 30), true);
    star.lineStyle(7, CREAM, 0.9);
    star.strokePoints(starPoints(0, 0, 70, 30), true, true);
    star.setScale(0);
    this.overlay.add(star);
    this.burst(this.overlay, 0, 0, GOLD);
    this.tweens.add({ targets: star, scale: 1, angle: 360, duration: 540, ease: 'Back.out' });
    this.time.delayedCall(800, () => {
      if (this.overlayToken !== token) return;
      this.closeOverlay();
      this.refreshRoom();
    });
  }

  private closeOverlay(): void {
    if (!this.overlay) return;
    this.overlayToken += 1;
    this.overlay.destroy(true);
    this.overlay = undefined;
    this.refreshRoom();
  }

  private openDoor(): void {
    if (this.doorOpened) return;
    this.doorOpened = true;
    this.guide?.setVisible(false);
    for (const station of this.stations.values()) station.disableInteractive();

    this.tweens.add({ targets: this.doorwayGlow, alpha: 0.7, scaleX: 1.1, duration: 800, ease: 'Sine.out' });
    this.tweens.add({ targets: this.doorLeft, x: 536, scaleX: 0.18, duration: 900, ease: 'Cubic.inOut' });
    this.tweens.add({ targets: this.doorRight, x: 744, scaleX: 0.18, duration: 900, ease: 'Cubic.inOut' });

    this.time.delayedCall(450, () => {
      for (let index = 0; index < 45; index += 1) {
        const sparkle = this.add.circle(640, 360, Phaser.Math.Between(3, 8), index % 3 === 0 ? CREAM : GOLD, 1).setDepth(50);
        this.tweens.add({
          targets: sparkle,
          x: 640 + Phaser.Math.Between(-250, 250),
          y: 330 + Phaser.Math.Between(-240, 250),
          alpha: 0,
          scale: 0.1,
          duration: Phaser.Math.Between(900, 1800),
          delay: Phaser.Math.Between(0, 500),
          ease: 'Quad.out',
          onComplete: () => sparkle.destroy(),
        });
      }
      this.showCelebration();
    });
  }

  private showCelebration(): void {
    const crown = this.add.graphics().setDepth(51).setPosition(640, 315);
    crown.fillStyle(GOLD, 1);
    crown.fillPoints(starPoints(0, 0, 55, 24), true);
    crown.lineStyle(6, CREAM, 0.9);
    crown.strokePoints(starPoints(0, 0, 55, 24), true, true);
    crown.setScale(0);
    this.tweens.add({ targets: crown, scale: 1, angle: 360, duration: 700, ease: 'Back.out' });
    this.tweens.add({ targets: crown, y: 295, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const replay = this.add.container(640, 485).setDepth(52).setSize(116, 116).setInteractive({ useHandCursor: true });
    const g = this.add.graphics();
    g.fillStyle(CREAM, 0.95);
    g.fillCircle(0, 0, 54);
    g.lineStyle(9, TEAL, 1);
    g.beginPath();
    g.arc(0, 0, 27, -0.7, 4.75);
    g.strokePath();
    g.fillStyle(TEAL, 1);
    g.fillTriangle(-7, -34, 18, -40, 10, -15);
    replay.add(g);
    replay.setScale(0);
    this.tweens.add({ targets: replay, scale: 1, delay: 500, duration: 450, ease: 'Back.out' });
    replay.on('pointerdown', () => this.scene.restart());
  }
}
