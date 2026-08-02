import Phaser from 'phaser';
import moonFairyUrl from '../../assets/images/moon-fairy-paper.webp';
import puzzlePanelUrl from '../../assets/images/puzzle-panel.webp';
import paperTheatreUrl from '../../assets/images/style-study-paper-theatre.webp';
import { createRoomSetup, type RoomSetup } from '../game/generation';
import {
  colourPieceMatches,
  cycleDial,
  kaleidoscopeSolved,
  oddOneOutAnswer,
  peekabooPairMatches,
  shadowTileMatches,
  towerNextExpected,
  type MelodyProgress,
} from '../game/checks';
import { createRng } from '../game/rng';
import {
  createRoomState,
  roomComplete,
  solveRoomStation,
  type RoomState,
} from '../game/roomState';
import {
  LEVEL_1_STATIONS,
  type ColourMatchChallenge,
  type FindTheTwinChallenge,
  type KaleidoscopeDialsChallenge,
  type Level1Station,
  type LightMelodyChallenge,
  type OddOneOutChallenge,
  type PeekabooPairsChallenge,
  type PuzzleChallenge,
  type ShadowFitChallenge,
  type ToyTowerChallenge,
} from '../game/puzzleTypes';
import { installSceneShell } from '../ui/sceneShell';

const W = 1280;
const H = 720;
const INK = 0x35253f;
const NIGHT = 0x241b38;
const CREAM = 0xffedce;
const GOLD = 0xf7c85f;
const ROSE = 0xe98798;
const TEAL = 0x65c6a5;
const BLUE = 0x78b8d6;
const PURPLE = 0x9b8fd4;
const WOOD = 0x986443;
const FELT = 0x5c416d;
const COLOURS = [ROSE, TEAL, BLUE, GOLD, PURPLE] as const;

interface StationPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const STATION_POSITIONS: Readonly<Record<Level1Station, StationPosition>> = {
  // These rectangles follow the painted objects and leave a small gap between every pair.
  'teddy-shelf': { x: 180, y: 335, width: 220, height: 230 },
  'moon-clock': { x: 400, y: 290, width: 190, height: 185 },
  'block-chest': { x: 175, y: 580, width: 250, height: 230 },
  'music-box': { x: 420, y: 500, width: 190, height: 220 },
  'star-mobile': { x: 875, y: 170, width: 184, height: 200 },
  'dollhouse': { x: 1072, y: 300, width: 194, height: 280 },
  'toy-train': { x: 855, y: 535, width: 210, height: 180 },
  'jack-in-the-box': { x: 1080, y: 580, width: 180, height: 220 },
};

interface Level1Visit {
  readonly setup: RoomSetup;
  state: RoomState;
}

// Kept outside the scene so the picker can stop and recreate the scene without losing a visit.
let savedVisit: Level1Visit | undefined;
let nextSeed = 9041;

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
  private setup!: RoomSetup;
  private state!: RoomState;
  private readonly stations = new Map<Level1Station, Phaser.GameObjects.Container>();
  private readonly sockets: Phaser.GameObjects.Graphics[] = [];
  private overlay: Phaser.GameObjects.Container | undefined;
  private guide: Phaser.GameObjects.Container | undefined;
  private doorGlow!: Phaser.GameObjects.Ellipse;
  private forwardButton: Phaser.GameObjects.Container | undefined;
  private overlayToken = 0;
  private doorOpened = false;
  private escHandler: (() => void) | undefined;

  constructor() {
    super('Toyshop');
  }

  preload(): void {
    this.load.image('toyshop-room-paper', paperTheatreUrl);
    this.load.image('moon-fairy-paper', moonFairyUrl);
    this.load.image('puzzle-panel', puzzlePanelUrl);
  }

  create(): void {
    const freshVisit = savedVisit === undefined || roomComplete(savedVisit.state);
    if (freshVisit) {
      const setup = createRoomSetup(createRng(nextSeed), 'level1');
      nextSeed += 1;
      savedVisit = { setup, state: createRoomState('level1') };
    }
    this.setup = savedVisit!.setup;
    this.state = savedVisit!.state;
    this.stations.clear();
    this.sockets.length = 0;
    this.overlay = undefined;
    this.forwardButton = undefined;
    this.doorOpened = false;
    this.overlayToken += 1;

    this.cameras.main.setBackgroundColor(NIGHT);
    this.drawRoom();
    this.createGuide();
    installSceneShell(this, { homeScene: 'LevelSelect' });

    this.escHandler = () => this.closeOverlay();
    this.input.keyboard?.on('keydown-ESC', this.escHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.overlayToken += 1;
      this.overlay?.destroy(true);
      this.overlay = undefined;
      if (this.escHandler !== undefined) this.input.keyboard?.off('keydown-ESC', this.escHandler);
      this.escHandler = undefined;
      this.time.removeAllEvents();
      this.tweens.killAll();
    });

    if (freshVisit) this.startFairyIntro(this.overlayToken);
    else this.refreshRoom();
  }

  private drawRoom(): void {
    this.add.image(W / 2, H / 2, 'toyshop-room-paper').setDisplaySize(W, H);

    // The study already contains the moon door. This glow and the eight sockets are game-owned.
    this.doorGlow = this.add.ellipse(640, 325, 270, 450, GOLD, 0.04).setDepth(2);
    this.tweens.add({
      targets: this.doorGlow,
      alpha: { from: 0.03, to: 0.09 },
      scale: { from: 0.98, to: 1.03 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    LEVEL_1_STATIONS.forEach((station) => this.createStation(station));

    for (let index = 0; index < LEVEL_1_STATIONS.length; index += 1) {
      const socket = this.add.graphics().setDepth(8);
      socket.setPosition(500 + index * 40, 102);
      this.sockets.push(socket);
    }
  }

  private createStation(id: Level1Station): void {
    const position = STATION_POSITIONS[id];
    const station = this.add.container(position.x, position.y).setDepth(6);
    station.setSize(position.width, position.height);
    station.setInteractive({ useHandCursor: true });
    station.on('pointerdown', () => this.openPuzzle(id));

    const halo = this.add.ellipse(0, 0, position.width * 0.88, position.height * 0.78, GOLD, 0.035);
    halo.setStrokeStyle(4, GOLD, 0.32);
    station.add(halo);
    station.setData('halo', halo);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.02, to: 0.1 },
      scale: { from: 0.97, to: 1.03 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 450),
    });
    this.stations.set(id, station);
  }

  private createGuide(): void {
    const guide = this.add.container(640, 90).setDepth(25);
    const glow = this.add.circle(0, 8, 52, GOLD, 0.13);
    const fairy = this.add.image(0, 0, 'moon-fairy-paper').setDisplaySize(132, 132);
    guide.add([glow, fairy]);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.035, duration: 800, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: guide, y: '+=10', duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.guide = guide;
  }

  private startFairyIntro(token: number): void {
    for (const station of this.stations.values()) station.disableInteractive();
    if (this.guide === undefined) return;
    this.tweens.killTweensOf(this.guide);
    this.guide.setPosition(145, 125).setAlpha(1).setScale(1);
    this.tweens.add({
      targets: this.guide,
      x: 640,
      y: 315,
      scale: 0.12,
      alpha: 0,
      duration: 1050,
      ease: 'Cubic.in',
      onComplete: () => {
        if (this.overlayToken !== token || this.guide === undefined) return;
        this.guide.setPosition(640, 315).setScale(0.12).setAlpha(0);
        this.time.delayedCall(230, () => {
          if (this.overlayToken !== token || this.guide === undefined) return;
          this.guide.setScale(1).setAlpha(1);
          this.tweens.add({ targets: this.guide, y: '+=10', duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          this.refreshRoom();
        });
      },
    });
  }

  private refreshRoom(): void {
    for (const [index, stationId] of LEVEL_1_STATIONS.entries()) {
      const station = this.stations.get(stationId);
      if (station === undefined) continue;
      const solved = this.state.solved[stationId];
      const halo = station.getData('halo') as Phaser.GameObjects.Ellipse;
      halo.setFillStyle(solved ? TEAL : GOLD, solved ? 0.08 : 0.035);
      halo.setStrokeStyle(4, solved ? TEAL : GOLD, solved ? 0.5 : 0.3);
      if (solved) {
        station.disableInteractive();
        if (station.getData('badge') === undefined) {
          const badge = this.add.graphics().setPosition(0, -STATION_POSITIONS[stationId].height * 0.42);
          badge.fillStyle(GOLD, 1);
          badge.fillPoints(starPoints(0, 0, 24, 11), true);
          badge.lineStyle(4, CREAM, 0.9);
          badge.strokePoints(starPoints(0, 0, 24, 11), true, true);
          station.add(badge);
          station.setData('badge', badge);
          this.tweens.add({ targets: badge, scale: { from: 0, to: 1 }, angle: 360, duration: 450, ease: 'Back.out' });
        }
      } else if (this.overlay === undefined && !this.doorOpened) {
        station.setInteractive({ useHandCursor: true });
      }

      const socket = this.sockets[index]!;
      socket.clear();
      socket.fillStyle(solved ? GOLD : FELT, solved ? 1 : 0.85);
      socket.fillPoints(starPoints(0, 0, 16, 7), true);
      socket.lineStyle(3, solved ? CREAM : GOLD, solved ? 0.95 : 0.5);
      socket.strokePoints(starPoints(0, 0, 16, 7), true, true);
    }

    const next = LEVEL_1_STATIONS.find((station) => !this.state.solved[station]);
    if (this.guide !== undefined && next !== undefined && this.overlay === undefined && !this.doorOpened) {
      const position = STATION_POSITIONS[next];
      this.guide.setVisible(true);
      this.tweens.killTweensOf(this.guide);
      this.tweens.add({ targets: this.guide, x: position.x, y: position.y - position.height * 0.55, duration: 650, ease: 'Sine.inOut' });
    }
    if (next === undefined) this.openDoor();
  }

  private openPuzzle(stationId: Level1Station): void {
    if (this.overlay !== undefined || this.state.solved[stationId] || this.doorOpened) return;
    this.overlayToken += 1;
    const token = this.overlayToken;
    for (const station of this.stations.values()) station.disableInteractive();
    this.guide?.setVisible(false);

    const challenge = this.setup.challenges[stationId];
    const type = this.setup.stationTypes[stationId];
    const overlay = this.add.container(W / 2, H / 2).setDepth(100);
    this.overlay = overlay;
    const shade = this.add.rectangle(0, 0, W, H, NIGHT, 0.84).setInteractive();
    const panel = this.add.image(0, 0, 'puzzle-panel').setDisplaySize(1060, 610);
    overlay.add([shade, panel]);
    const close = this.makeCloseButton(470, -255);
    close.on('pointerdown', () => this.closeOverlay());
    overlay.add(close);
    const emblem = this.add.graphics().setPosition(-462, -252);
    emblem.fillStyle(GOLD, 0.2);
    emblem.fillCircle(0, 0, 42);
    emblem.lineStyle(4, GOLD, 0.75);
    emblem.strokeCircle(0, 0, 42);
    this.drawTypeEmblem(emblem, type);
    overlay.add(emblem);

    switch (type) {
      case 'colour-match': this.createColourMatchPuzzle(overlay, challenge as ColourMatchChallenge, token); break;
      case 'light-melody': this.createLightMelodyPuzzle(overlay, challenge as LightMelodyChallenge, token); break;
      case 'shadow-fit': this.createShadowFitPuzzle(overlay, challenge as ShadowFitChallenge, token); break;
      case 'kaleidoscope-dials': this.createKaleidoscopePuzzle(overlay, challenge as KaleidoscopeDialsChallenge, token); break;
      case 'find-the-twin': this.createTwinPuzzle(overlay, challenge as FindTheTwinChallenge, token); break;
      case 'odd-one-out': this.createOddPuzzle(overlay, challenge as OddOneOutChallenge, token); break;
      case 'toy-tower': this.createTowerPuzzle(overlay, challenge as ToyTowerChallenge, token); break;
      case 'peekaboo-pairs': this.createPeekabooPuzzle(overlay, challenge as PeekabooPairsChallenge, token); break;
      default:
        throw new Error(`Unsupported Level 1 puzzle ${type}`);
    }
    overlay.setScale(0.94).setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, scale: 1, duration: 240, ease: 'Back.out' });
  }

  private makeCloseButton(x: number, y: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setSize(78, 78).setInteractive({ useHandCursor: true });
    const g = this.add.graphics();
    g.fillStyle(CREAM, 0.12);
    g.fillCircle(0, 0, 35);
    g.lineStyle(6, CREAM, 0.9);
    g.strokeCircle(0, 0, 35);
    g.lineBetween(-13, -13, 13, 13);
    g.lineBetween(13, -13, -13, 13);
    button.add(g);
    return button;
  }

  private drawTypeEmblem(g: Phaser.GameObjects.Graphics, type: string): void {
    if (type === 'colour-match') {
      g.fillStyle(ROSE, 1); g.fillCircle(-14, 0, 12);
      g.fillStyle(TEAL, 1); g.fillCircle(14, 0, 12);
      g.fillStyle(BLUE, 1); g.fillCircle(0, 20, 12); return;
    }
    if (type === 'light-melody') {
      [ROSE, TEAL, BLUE].forEach((color, index) => { g.fillStyle(color, 1); g.fillCircle(-20 + index * 20, 8, 9); }); return;
    }
    if (type === 'shadow-fit') {
      g.fillStyle(PURPLE, 1); g.fillPoints([new Phaser.Geom.Point(-20, 16), new Phaser.Geom.Point(0, -20), new Phaser.Geom.Point(20, 16)], true); return;
    }
    if (type === 'kaleidoscope-dials') {
      g.fillStyle(GOLD, 1); g.fillPoints(starPoints(0, 0, 22, 9), true); return;
    }
    if (type === 'find-the-twin') {
      g.fillStyle(TEAL, 1); g.fillCircle(-14, 0, 13); g.fillCircle(14, 0, 13); return;
    }
    if (type === 'odd-one-out') {
      g.fillStyle(ROSE, 1); g.fillCircle(-18, 0, 10); g.fillCircle(0, 0, 10); g.fillStyle(BLUE, 1); g.fillCircle(18, 0, 10); return;
    }
    if (type === 'toy-tower') {
      g.fillStyle(ROSE, 1); g.fillRoundedRect(-25, 8, 50, 12, 5); g.fillStyle(TEAL, 1); g.fillRoundedRect(-18, -5, 36, 12, 5); g.fillStyle(BLUE, 1); g.fillRoundedRect(-10, -18, 20, 12, 5); return;
    }
    g.fillStyle(GOLD, 1); g.fillCircle(-15, -4, 13); g.fillCircle(15, 10, 13);
  }

  private createColourMatchPuzzle(overlay: Phaser.GameObjects.Container, challenge: ColourMatchChallenge, token: number): void {
    const targets = [-250, 0, 250];
    let matched = 0;
    challenge.targets.forEach((colorId, index) => {
      const toy = this.makeToy(challenge.toys[index]!, colorId);
      toy.setPosition(targets[index]!, -85);
      overlay.add(toy);
      const ring = this.add.ellipse(targets[index]!, -85, 200, 190, COLOURS[colorId] ?? GOLD, 0.08).setStrokeStyle(5, COLOURS[colorId] ?? GOLD, 0.6);
      overlay.add(ring);
    });

    challenge.pieces.forEach((colorId, position) => {
      const homeX = targets[position]!;
      const homeY = 215;
      const piece = this.makeColourPiece(colorId, homeX, homeY);
      piece.setData({ colorId, homeX, homeY, matched: false });
      piece.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(piece);
      overlay.add(piece);
      piece.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.overlayToken !== token || piece.getData('matched')) return;
        piece.setPosition(dragX, dragY);
      });
      piece.on('dragend', () => {
        if (this.overlayToken !== token || piece.getData('matched')) return;
        const target = targets.findIndex((x) => Phaser.Math.Distance.Between(piece.x, piece.y, x, -85) < 105);
        if (target >= 0 && colourPieceMatches(challenge, position, target)) {
          piece.setData('matched', true);
          piece.disableInteractive();
          matched += 1;
          this.tweens.add({ targets: piece, x: targets[target]!, y: -85, scale: 0.86, duration: 280, ease: 'Back.out' });
          this.burst(overlay, targets[target]!, -85, COLOURS[colorId] ?? GOLD, token);
          if (matched === challenge.pieces.length) this.delayedFinish(challenge, token, 450);
        } else {
          this.resetPiece(piece, token);
        }
      });
    });
  }

  private makeToy(variant: number, colourId: number, scale = 1): Phaser.GameObjects.Container {
    const toy = this.add.container(0, 0).setSize(150 * scale, 170 * scale);
    const g = this.add.graphics();
    const color = COLOURS[colourId] ?? ROSE;
    g.fillStyle(color, 1);
    g.fillCircle(-35 * scale, -45 * scale, 23 * scale);
    g.fillCircle(35 * scale, -45 * scale, 23 * scale);
    g.fillCircle(0, -22 * scale, 52 * scale);
    g.fillEllipse(0, 73 * scale, 96 * scale, 125 * scale);
    g.fillStyle(CREAM, 0.82);
    g.fillEllipse(0, -8 * scale, 35 * scale, 25 * scale);
    g.fillEllipse(0, 80 * scale, 52 * scale, 60 * scale);
    g.fillStyle(INK, 1);
    g.fillCircle(-15 * scale, -29 * scale, 5 * scale);
    g.fillCircle(15 * scale, -29 * scale, 5 * scale);
    g.fillCircle(0, -7 * scale, 6 * scale);
    g.fillStyle(variant % 2 === 0 ? GOLD : WOOD, 1);
    g.fillCircle(0, 41 * scale, 11 * scale);
    g.lineStyle(5 * scale, INK, 0.72);
    g.strokeCircle(0, -22 * scale, 52 * scale);
    g.strokeEllipse(0, 73 * scale, 96 * scale, 125 * scale);
    toy.add(g);
    toy.setScale(scale);
    return toy;
  }

  private makeColourPiece(colorId: number, x: number, y: number): Phaser.GameObjects.Container {
    const piece = this.add.container(x, y).setSize(160, 115);
    const g = this.add.graphics();
    const color = COLOURS[colorId] ?? GOLD;
    g.fillStyle(color, 1);
    g.fillRoundedRect(-70, -48, 140, 96, 22);
    g.lineStyle(7, CREAM, 0.95);
    g.strokeRoundedRect(-70, -48, 140, 96, 22);
    g.fillStyle(CREAM, 0.6);
    g.fillCircle(-28, -14, 10);
    g.fillCircle(28, 14, 10);
    piece.add(g);
    return piece;
  }

  private resetPiece(piece: Phaser.GameObjects.Container, token: number): void {
    if (this.overlayToken !== token) return;
    this.tweens.add({
      targets: piece,
      x: piece.getData('homeX') as number,
      y: piece.getData('homeY') as number,
      angle: { from: -7, to: 0 },
      duration: 330,
      ease: 'Back.out',
    });
  }

  private createLightMelodyPuzzle(overlay: Phaser.GameObjects.Container, challenge: LightMelodyChallenge, token: number): void {
    const xs = [-235, 0, 235];
    const colors = [ROSE, TEAL, BLUE];
    const buttons = xs.map((x, index) => {
      const button = this.makeLightButton(x, 95, colors[index]!, index);
      overlay.add(button);
      return button;
    });
    const dots = xs.map((x) => {
      const dot = this.add.graphics().setPosition(x, -125);
      overlay.add(dot);
      return dot;
    });
    let progress: MelodyProgress = { notes: [], mistake: false, complete: false };
    let accepting = false;
    const clearDots = (): void => {
      dots.forEach((dot) => {
        dot.clear(); dot.fillStyle(CREAM, 0.14); dot.fillCircle(0, 0, 25); dot.lineStyle(4, CREAM, 0.3); dot.strokeCircle(0, 0, 25);
      });
    };
    const flash = (index: number): void => {
      const button = buttons[index]!;
      const aura = button.getData('aura') as Phaser.GameObjects.Ellipse;
      this.tweens.add({ targets: button, scale: 1.18, duration: 130, yoyo: true, ease: 'Sine.inOut' });
      this.tweens.add({ targets: aura, alpha: 0.55, scale: 1.3, duration: 160, yoyo: true });
    };
    const showSequence = (): void => {
      if (this.overlayToken !== token) return;
      accepting = false;
      progress = { notes: [], mistake: false, complete: false };
      clearDots();
      challenge.sequence.forEach((note, index) => {
        this.time.delayedCall(260 + index * 520, () => {
          if (this.overlayToken === token) flash(note);
        });
      });
      this.time.delayedCall(260 + challenge.sequence.length * 520, () => {
        if (this.overlayToken === token) accepting = true;
      });
    };
    buttons.forEach((button, index) => button.on('pointerdown', () => {
      if (!accepting || this.overlayToken !== token) return;
      flash(index);
      const expected = challenge.sequence[progress.notes.length];
      if (expected !== index) {
        progress = { notes: [], mistake: true, complete: false };
        accepting = false;
        this.cameras.main.shake(120, 0.002);
        this.time.delayedCall(420, () => { if (this.overlayToken === token) showSequence(); });
        return;
      }
      progress = { notes: [...progress.notes, index], mistake: false, complete: progress.notes.length + 1 === challenge.sequence.length };
      const dot = dots[progress.notes.length - 1]!;
      dot.clear(); dot.fillStyle(colors[index]!, 1); dot.fillCircle(0, 0, 25); dot.fillStyle(CREAM, 1); dot.fillPoints(starPoints(0, 0, 13, 6), true);
      if (progress.complete) {
        accepting = false;
        this.delayedFinish(challenge, token, 430);
      }
    }));
    this.time.delayedCall(420, () => { if (this.overlayToken === token) showSequence(); });
  }

  private makeLightButton(x: number, y: number, color: number, symbol: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setSize(190, 220).setInteractive({ useHandCursor: true });
    const aura = this.add.ellipse(0, 0, 190, 190, color, 0.12);
    const g = this.add.graphics();
    g.fillStyle(color, 1); g.fillCircle(0, 0, 72); g.lineStyle(8, CREAM, 0.82); g.strokeCircle(0, 0, 72);
    this.drawSymbol(g, symbol, 0, 0, 35, CREAM);
    g.fillStyle(WOOD, 1); g.fillRoundedRect(-16, 70, 32, 82, 12); g.fillStyle(GOLD, 1); g.fillCircle(0, 152, 19);
    button.add([aura, g]); button.setData('aura', aura);
    return button;
  }

  private createShadowFitPuzzle(overlay: Phaser.GameObjects.Container, challenge: ShadowFitChallenge, token: number): void {
    const targets = [-250, 0, 250];
    let matched = 0;
    challenge.slots.forEach((shape, index) => {
      const slot = this.makeShape(targets[index]!, -80, shape, true);
      overlay.add(slot);
    });
    challenge.tiles.forEach((shape, position) => {
      const homeX = targets[position]!;
      const tile = this.makeShape(homeX, 215, shape, false);
      tile.setData({ shape, homeX, homeY: 215, matched: false });
      tile.setInteractive({ useHandCursor: true, draggable: true }); this.input.setDraggable(tile); overlay.add(tile);
      tile.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.overlayToken !== token || tile.getData('matched')) return;
        tile.setPosition(dragX, dragY);
      });
      tile.on('dragend', () => {
        if (this.overlayToken !== token || tile.getData('matched')) return;
        const target = targets.findIndex((x) => Phaser.Math.Distance.Between(tile.x, tile.y, x, -80) < 105);
        if (target >= 0 && shadowTileMatches(challenge, position, target)) {
          tile.setData('matched', true); tile.disableInteractive(); matched += 1;
          this.tweens.add({ targets: tile, x: targets[target]!, y: -80, duration: 280, ease: 'Back.out' });
          this.burst(overlay, targets[target]!, -80, [ROSE, TEAL, BLUE][shape]!, token);
          if (matched === challenge.tiles.length) this.delayedFinish(challenge, token, 450);
        } else this.resetShape(tile, token);
      });
    });
  }

  private makeShape(x: number, y: number, shape: number, shadow: boolean): Phaser.GameObjects.Container {
    const tile = this.add.container(x, y).setSize(175, 150).setInteractive({ useHandCursor: !shadow, draggable: false });
    const g = this.add.graphics();
    const color = [ROSE, TEAL, BLUE][shape] ?? GOLD;
    g.fillStyle(shadow ? FELT : color, shadow ? 0.84 : 1);
    this.fillShape(g, shape);
    g.lineStyle(7, shadow ? GOLD : CREAM, 0.85);
    this.strokeShape(g, shape);
    tile.removeAll(true); tile.add(g);
    if (shadow) tile.disableInteractive();
    return tile;
  }

  private fillShape(g: Phaser.GameObjects.Graphics, shape: number): void {
    if (shape === 0) g.fillCircle(0, 0, 61);
    else if (shape === 1) g.fillRoundedRect(-65, -55, 130, 110, 22);
    else g.fillPoints(starPoints(0, 0, 68, 30), true);
  }

  private strokeShape(g: Phaser.GameObjects.Graphics, shape: number): void {
    if (shape === 0) g.strokeCircle(0, 0, 61);
    else if (shape === 1) g.strokeRoundedRect(-65, -55, 130, 110, 22);
    else g.strokePoints(starPoints(0, 0, 68, 30), true, true);
  }

  private resetShape(tile: Phaser.GameObjects.Container, token: number): void {
    if (this.overlayToken !== token) return;
    this.tweens.add({ targets: tile, x: tile.getData('homeX') as number, y: tile.getData('homeY') as number, angle: { from: -8, to: 0 }, duration: 340, ease: 'Back.out' });
  }

  private createKaleidoscopePuzzle(overlay: Phaser.GameObjects.Container, challenge: KaleidoscopeDialsChallenge, token: number): void {
    const xs = [-245, 0, 245];
    const values = [...challenge.dials];
    const colors = [ROSE, TEAL, BLUE];
    xs.forEach((x, index) => {
      const beam = this.add.graphics().setPosition(x, -112);
      beam.fillStyle(CREAM, 0.08); beam.fillTriangle(-75, 48, 75, 48, 0, 132); overlay.add(beam);
      overlay.add(this.makeLens(x, -120, challenge.target[index]!, colors[index]!, false));
    });
    const lenses = xs.map((x, index) => {
      const lens = this.makeLens(x, 130, values[index]!, colors[index]!, true); overlay.add(lens); return lens;
    });
    lenses.forEach((lens, index) => lens.on('pointerdown', () => {
      if (this.overlayToken !== token) return;
      values[index] = cycleDial(values[index]!, challenge.symbolCount);
      this.redrawLens(lens.getData('face') as Phaser.GameObjects.Graphics, values[index]!, colors[index]!, true);
      this.tweens.add({ targets: lens, angle: 12, scale: 1.1, duration: 100, yoyo: true, ease: 'Sine.inOut' });
      if (values[index] === challenge.target[index]) this.burst(overlay, xs[index]!, 130, colors[index]!, token);
      if (kaleidoscopeSolved(challenge, values)) {
        lenses.forEach((button) => button.disableInteractive());
        this.delayedFinish(challenge, token, 450);
      }
    }));
  }

  private makeLens(x: number, y: number, symbol: number, color: number, interactive: boolean): Phaser.GameObjects.Container {
    const lens = this.add.container(x, y).setSize(190, 190);
    if (interactive) lens.setInteractive({ useHandCursor: true });
    const glow = this.add.circle(0, 0, 94, color, interactive ? 0.13 : 0.06);
    const face = this.add.graphics(); this.redrawLens(face, symbol, color, interactive);
    lens.add([glow, face]); lens.setData('face', face);
    if (interactive) this.tweens.add({ targets: glow, scale: 1.08, alpha: 0.24, duration: 850, yoyo: true, repeat: -1 });
    return lens;
  }

  private redrawLens(face: Phaser.GameObjects.Graphics, symbol: number, color: number, interactive: boolean): void {
    face.clear(); face.fillStyle(interactive ? CREAM : color, 1); face.fillCircle(0, 0, 73); face.lineStyle(8, interactive ? color : CREAM, 0.82); face.strokeCircle(0, 0, 73);
    this.drawSymbol(face, symbol, 0, 0, 37, interactive ? color : INK);
    if (interactive) { face.lineStyle(6, GOLD, 0.7); face.beginPath(); face.arc(0, 0, 88, -0.55, 0.55); face.strokePath(); face.fillStyle(GOLD, 1); face.fillTriangle(77, 45, 98, 40, 91, 61); }
  }

  private createTwinPuzzle(overlay: Phaser.GameObjects.Container, challenge: FindTheTwinChallenge, token: number): void {
    const model = this.makeToy(challenge.model, challenge.model, 1.1);
    model.setPosition(0, -115); overlay.add(model);
    const halo = this.add.ellipse(0, -115, 210, 195, GOLD, 0.08).setStrokeStyle(6, GOLD, 0.6); overlay.add(halo);
    challenge.options.forEach((variant, index) => {
      const option = this.makeToy(variant, variant, 0.82);
      option.setPosition([-280, 0, 280][index]!, 165).setSize(220, 175).setInteractive({ useHandCursor: true });
      overlay.add(option);
      option.on('pointerdown', () => {
        if (this.overlayToken !== token) return;
        if (variant === challenge.model) this.delayedFinish(challenge, token, 380);
        else this.wrongChoice(option, token);
      });
    });
  }

  private createOddPuzzle(overlay: Phaser.GameObjects.Container, challenge: OddOneOutChallenge, token: number): void {
    const common = challenge.options.find((_value, index) => index !== challenge.oddIndex) ?? 0;
    const oddColour = challenge.options[challenge.oddIndex]!;
    challenge.options.forEach((_variant, index) => {
      const option = this.makeToy(common, index === challenge.oddIndex ? oddColour : common, 0.85);
      option.setPosition([-300, -100, 100, 300][index]!, 85).setSize(190, 180).setInteractive({ useHandCursor: true });
      overlay.add(option);
      option.on('pointerdown', () => {
        if (this.overlayToken !== token) return;
        if (oddOneOutAnswer(challenge, index)) this.delayedFinish(challenge, token, 380);
        else this.wrongChoice(option, token);
      });
    });
  }

  private wrongChoice(target: Phaser.GameObjects.Container, token: number): void {
    if (this.overlayToken !== token) return;
    this.tweens.add({ targets: target, x: '+=12', duration: 70, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
  }

  private createTowerPuzzle(overlay: Phaser.GameObjects.Container, challenge: ToyTowerChallenge, token: number): void {
    const slots = [
      { x: 0, y: 125, width: 205, height: 58 },
      { x: 0, y: 48, width: 155, height: 52 },
      { x: 0, y: -25, width: 105, height: 46 },
    ];
    const slotGraphic = this.add.graphics();
    slots.forEach((slot) => { slotGraphic.fillStyle(FELT, 0.34); slotGraphic.fillRoundedRect(slot.x - slot.width / 2, slot.y - slot.height / 2, slot.width, slot.height, 18); slotGraphic.lineStyle(5, GOLD, 0.4); slotGraphic.strokeRoundedRect(slot.x - slot.width / 2, slot.y - slot.height / 2, slot.width, slot.height, 18); });
    overlay.add(slotGraphic);
    let placed: number[] = [];
    challenge.pieces.forEach((pieceId, index) => {
      const homeX = [-280, 0, 280][index]!;
      const homeY = 225;
      const piece = this.makeTowerPiece(pieceId, homeX, homeY);
      piece.setData({ pieceId, homeX, homeY, placed: false });
      piece.setInteractive({ useHandCursor: true, draggable: true }); this.input.setDraggable(piece); overlay.add(piece);
      piece.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.overlayToken !== token || piece.getData('placed')) return;
        piece.setPosition(dragX, dragY);
      });
      piece.on('dragend', () => {
        if (this.overlayToken !== token || piece.getData('placed')) return;
        const expected = towerNextExpected(challenge, placed);
        const slot = slots[placed.length];
        if (expected === pieceId && slot !== undefined && Phaser.Math.Distance.Between(piece.x, piece.y, slot.x, slot.y) < 105) {
          piece.setData('placed', true); piece.disableInteractive(); placed = [...placed, pieceId];
          this.tweens.add({ targets: piece, x: slot.x, y: slot.y, duration: 300, ease: 'Back.out' });
          this.burst(overlay, slot.x, slot.y, COLOURS[pieceId] ?? GOLD, token);
          if (placed.length === challenge.pieces.length) this.delayedFinish(challenge, token, 450);
        } else this.resetTowerPiece(piece, token);
      });
    });
  }

  private makeTowerPiece(pieceId: number, x: number, y: number): Phaser.GameObjects.Container {
    const widths = [90, 145, 200];
    const heights = [45, 56, 68];
    const piece = this.add.container(x, y).setSize(widths[pieceId]!, 100);
    const g = this.add.graphics(); const color = COLOURS[pieceId] ?? GOLD;
    g.fillStyle(color, 1); g.fillRoundedRect(-widths[pieceId]! / 2, -heights[pieceId]! / 2, widths[pieceId]!, heights[pieceId]!, 18); g.lineStyle(7, CREAM, 0.9); g.strokeRoundedRect(-widths[pieceId]! / 2, -heights[pieceId]! / 2, widths[pieceId]!, heights[pieceId]!, 18); g.fillStyle(CREAM, 0.6); g.fillCircle(0, 0, Math.min(15, heights[pieceId]! / 4)); piece.add(g); return piece;
  }

  private resetTowerPiece(piece: Phaser.GameObjects.Container, token: number): void {
    if (this.overlayToken !== token) return;
    this.tweens.add({ targets: piece, x: piece.getData('homeX') as number, y: piece.getData('homeY') as number, angle: { from: -7, to: 0 }, duration: 340, ease: 'Back.out' });
  }

  private createPeekabooPuzzle(overlay: Phaser.GameObjects.Container, challenge: PeekabooPairsChallenge, token: number): void {
    const cards: Phaser.GameObjects.Container[] = [];
    const revealed: number[] = [];
    const matched = new Set<number>();
    challenge.cards.forEach((value, index) => {
      const x = -255 + (index % 3) * 255;
      const y = -90 + Math.floor(index / 3) * 180;
      const card = this.makeMemoryCard(x, y, value, false);
      card.setData({ value, index, revealed: false, matched: false });
      card.setInteractive({ useHandCursor: true }); overlay.add(card); cards.push(card);
      card.on('pointerdown', () => {
        if (this.overlayToken !== token || card.getData('revealed') || card.getData('matched') || revealed.length >= 2) return;
        card.setData('revealed', true); revealed.push(index); this.drawMemoryCard(card, value, true, false);
        if (revealed.length !== 2) return;
        const first = revealed[0]!; const second = revealed[1]!;
        if (peekabooPairMatches(challenge, first, second)) {
          matched.add(first); matched.add(second);
          cards[first]!.setData('matched', true); cards[second]!.setData('matched', true);
          this.burst(overlay, cards[second]!.x, cards[second]!.y, COLOURS[value] ?? GOLD, token);
          revealed.length = 0;
          if (matched.size === challenge.cards.length) this.delayedFinish(challenge, token, 450);
        } else {
          this.time.delayedCall(500, () => {
            if (this.overlayToken !== token) return;
            const a = cards[first]!; const b = cards[second]!;
            a.setData('revealed', false); b.setData('revealed', false);
            this.drawMemoryCard(a, challenge.cards[first]!, false, false); this.drawMemoryCard(b, challenge.cards[second]!, false, false);
            revealed.length = 0;
          });
        }
      });
    });
  }

  private makeMemoryCard(x: number, y: number, value: number, revealed: boolean): Phaser.GameObjects.Container {
    const card = this.add.container(x, y).setSize(195, 140);
    this.drawMemoryCard(card, value, revealed, false);
    return card;
  }

  private drawMemoryCard(card: Phaser.GameObjects.Container, value: number, revealed: boolean, matched: boolean): void {
    card.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(revealed || matched ? CREAM : FELT, 1); g.fillRoundedRect(-88, -62, 176, 124, 22); g.lineStyle(7, matched ? TEAL : GOLD, 0.9); g.strokeRoundedRect(-88, -62, 176, 124, 22);
    if (revealed || matched) {
      g.fillStyle(COLOURS[value] ?? GOLD, 1);
      if (value === 0) g.fillCircle(0, 0, 33);
      else if (value === 1) g.fillPoints(starPoints(0, 0, 42, 18), true);
      else g.fillRoundedRect(-39, -39, 78, 78, 17);
    } else {
      g.fillStyle(GOLD, 0.8); g.fillPoints(starPoints(0, 0, 34, 15), true); g.fillStyle(CREAM, 0.62); g.fillCircle(0, 0, 9);
    }
    card.add(g);
  }

  private delayedFinish(challenge: PuzzleChallenge, token: number, delay: number): void {
    const station = this.stationForChallenge(challenge);
    if (station === undefined) return;
    this.time.delayedCall(delay, () => {
      if (this.overlayToken === token) this.finishPuzzle(station, token);
    });
  }

  private stationForChallenge(challenge: PuzzleChallenge): Level1Station | undefined {
    return LEVEL_1_STATIONS.find((station) => this.setup.challenges[station] === challenge);
  }

  private finishPuzzle(stationId: Level1Station, token: number): void {
    if (this.overlay === undefined || this.overlayToken !== token || this.state.solved[stationId]) return;
    this.state = solveRoomStation(this.state, stationId);
    if (savedVisit !== undefined) savedVisit.state = this.state;
    const star = this.add.graphics(); star.fillStyle(GOLD, 1); star.fillPoints(starPoints(0, 0, 70, 30), true); star.lineStyle(7, CREAM, 0.9); star.strokePoints(starPoints(0, 0, 70, 30), true, true); star.setScale(0); this.overlay.add(star);
    this.burst(this.overlay, 0, 0, GOLD, token);
    this.tweens.add({ targets: star, scale: 1, angle: 360, duration: 520, ease: 'Back.out' });
    this.time.delayedCall(760, () => {
      if (this.overlayToken !== token) return;
      this.closeOverlay();
      this.refreshRoom();
    });
  }

  private closeOverlay(): void {
    if (this.overlay === undefined) return;
    this.overlayToken += 1;
    this.tweens.killTweensOf(this.overlay);
    this.overlay.destroy(true);
    this.overlay = undefined;
    this.refreshRoom();
  }

  private openDoor(): void {
    if (this.doorOpened) return;
    this.doorOpened = true;
    this.guide?.setVisible(false);
    for (const station of this.stations.values()) station.disableInteractive();
    const token = this.overlayToken;
    this.tweens.add({ targets: this.doorGlow, alpha: 0.6, scale: 1.12, duration: 800, ease: 'Sine.out' });
    this.time.delayedCall(420, () => {
      if (this.overlayToken !== token) return;
      for (let index = 0; index < 42; index += 1) {
        const sparkle = this.add.circle(640, 315, Phaser.Math.Between(3, 8), index % 3 === 0 ? CREAM : GOLD, 1).setDepth(50);
        this.tweens.add({ targets: sparkle, x: 640 + Phaser.Math.Between(-250, 250), y: 300 + Phaser.Math.Between(-230, 230), alpha: 0, scale: 0.1, duration: Phaser.Math.Between(900, 1700), delay: Phaser.Math.Between(0, 450), ease: 'Quad.out', onComplete: () => { if (this.overlayToken === token && sparkle.scene !== null) sparkle.destroy(); } });
      }
      this.flyGuideThroughDoor(token);
    });
  }

  private flyGuideThroughDoor(token: number): void {
    if (this.overlayToken !== token) return;
    if (this.guide === undefined) {
      this.showCelebration(token);
      return;
    }
    this.tweens.killTweensOf(this.guide);
    this.guide.setVisible(true).setPosition(640, 500).setScale(0.95).setAlpha(1);
    this.tweens.add({
      targets: this.guide,
      y: 245,
      scale: 0.16,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.inOut',
      onComplete: () => {
        if (this.overlayToken !== token) return;
        this.guide?.setVisible(false);
        this.showCelebration(token);
      },
    });
  }

  private showCelebration(token: number): void {
    if (this.overlayToken !== token) return;
    const crown = this.add.graphics().setDepth(51).setPosition(640, 300);
    crown.fillStyle(GOLD, 1); crown.fillPoints(starPoints(0, 0, 58, 25), true); crown.lineStyle(6, CREAM, 0.9); crown.strokePoints(starPoints(0, 0, 58, 25), true, true); crown.setScale(0);
    this.tweens.add({ targets: crown, scale: 1, angle: 360, duration: 650, ease: 'Back.out' }); this.tweens.add({ targets: crown, y: 282, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const forward = this.add.container(640, 480).setDepth(52).setSize(170, 170).setInteractive({ useHandCursor: true });
    const g = this.add.graphics(); g.fillStyle(CREAM, 0.95); g.fillCircle(0, 0, 74); g.lineStyle(10, TEAL, 1); g.strokeCircle(0, 0, 74); g.fillStyle(TEAL, 1); g.fillTriangle(-22, -44, 48, 0, -22, 44); forward.add(g); forward.setScale(0); this.forwardButton = forward;
    this.tweens.add({ targets: forward, scale: 1, delay: 420, duration: 440, ease: 'Back.out' }); this.tweens.add({ targets: forward, scale: 1.08, duration: 650, yoyo: true, repeat: -1, delay: 1100, ease: 'Sine.inOut' });
    forward.on('pointerdown', () => { if (this.overlayToken === token) this.scene.start('CountingRoom'); });
  }

  private burst(parent: Phaser.GameObjects.Container, x: number, y: number, color: number, token: number): void {
    for (let index = 0; index < 8; index += 1) {
      const sparkle = this.add.circle(x, y, 5, index % 2 === 0 ? color : CREAM, 1);
      parent.add(sparkle);
      const angle = index * Math.PI / 4;
      this.tweens.add({ targets: sparkle, x: x + Math.cos(angle) * 70, y: y + Math.sin(angle) * 70, alpha: 0, scale: 0.2, duration: 430, ease: 'Quad.out', onComplete: () => { if (this.overlayToken === token || !sparkle.scene) sparkle.destroy(); } });
    }
  }

  private drawSymbol(g: Phaser.GameObjects.Graphics, symbol: number, x: number, y: number, size: number, color: number): void {
    g.fillStyle(color, 1);
    if (symbol === 0) { for (let index = 0; index < 6; index += 1) { const angle = index * Math.PI / 3; g.fillCircle(x + Math.cos(angle) * size * 0.55, y + Math.sin(angle) * size * 0.55, size * 0.38); } g.fillCircle(x, y, size * 0.4); return; }
    if (symbol === 1) { g.fillPoints([new Phaser.Geom.Point(x, y - size), new Phaser.Geom.Point(x + size * 0.75, y), new Phaser.Geom.Point(x, y + size), new Phaser.Geom.Point(x - size * 0.75, y)], true); return; }
    g.fillPoints(starPoints(x, y, size, size * 0.45), true);
  }
}
