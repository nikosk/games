import Phaser from 'phaser';
import countingRoomUrl from '../../assets/images/counting-room-paper.webp';
import moonFairyUrl from '../../assets/images/moon-fairy-paper.webp';
import puzzlePanelUrl from '../../assets/images/puzzle-panel.webp';
import {
  additionAnswer,
  countPieceMatches,
  cycleNumeral,
  findGroupAnswer,
  moreOrFewerAnswer,
  numberDialsSolved,
  oddOneOutAnswer,
  playMelody,
  trainAnswer,
  type MelodyProgress,
} from '../game/checks';
import { createRoomSetup, type RoomSetup } from '../game/generation';
import { level2OddOneOutCards } from '../game/level2OddOneOut';
import { createRng } from '../game/rng';
import {
  createRoomState,
  roomComplete,
  solveRoomStation,
  type RoomState,
} from '../game/roomState';
import { LEVEL_2_STATION_BOUNDS } from '../game/stationLayout';
import {
  LEVEL_2_STATIONS,
  type CountAndMatchChallenge,
  type FindTheGroupChallenge,
  type Level2Station,
  type MoreOrFewerChallenge,
  type NumberDialsChallenge,
  type NumberMelodyChallenge,
  type NumberTrainChallenge,
  type OddOneOutChallenge,
  type PictureAdditionChallenge,
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
const FELT = 0x5c416d;
const WOOD = 0x986443;
const COLOURS = [ROSE, TEAL, BLUE, GOLD, PURPLE] as const;
const NUMERAL_FONT = '"Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';

interface CountingVisit {
  readonly setup: RoomSetup;
  state: RoomState;
}

// The visit lives outside the scene so Home → picker → Level 2 does not reshuffle progress.
let savedVisit: CountingVisit | undefined;
let nextSeed = 17321;

function starPoints(x: number, y: number, outer: number, inner: number): Phaser.Geom.Point[] {
  const points: Phaser.Geom.Point[] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? outer : inner;
    points.push(new Phaser.Geom.Point(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
  }
  return points;
}

export class CountingRoomScene extends Phaser.Scene {
  private setup!: RoomSetup;
  private state!: RoomState;
  private readonly stations = new Map<Level2Station, Phaser.GameObjects.Container>();
  private readonly sockets: Phaser.GameObjects.Graphics[] = [];
  private overlay: Phaser.GameObjects.Container | undefined;
  private guide: Phaser.GameObjects.Container | undefined;
  private doorGlow!: Phaser.GameObjects.Ellipse;
  private overlayToken = 0;
  private finished = false;
  private escHandler: (() => void) | undefined;

  constructor() {
    super('CountingRoom');
  }

  preload(): void {
    this.load.image('counting-room-paper', countingRoomUrl);
    this.load.image('moon-fairy-paper', moonFairyUrl);
    this.load.image('puzzle-panel', puzzlePanelUrl);
  }

  create(): void {
    const freshVisit = savedVisit === undefined || roomComplete(savedVisit.state);
    if (freshVisit) {
      const setup = createRoomSetup(createRng(nextSeed), 'level2');
      nextSeed += 1;
      savedVisit = { setup, state: createRoomState('level2') };
    }
    this.setup = savedVisit!.setup;
    this.state = savedVisit!.state;
    this.stations.clear();
    this.sockets.length = 0;
    this.overlay = undefined;
    this.finished = false;
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
    this.add.image(W / 2, H / 2, 'counting-room-paper').setDisplaySize(W, H);
    this.doorGlow = this.add.ellipse(640, 325, 270, 430, GOLD, 0.04).setDepth(2);
    this.tweens.add({
      targets: this.doorGlow,
      alpha: { from: 0.025, to: 0.08 },
      scale: { from: 0.98, to: 1.03 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    LEVEL_2_STATIONS.forEach((station) => this.createStation(station));
    // Eight stars sit in the quiet upper trim, above the painted objects.
    LEVEL_2_STATIONS.forEach((_station, index) => {
      const socket = this.add.graphics().setDepth(8);
      socket.setPosition(500 + index * 40, 82);
      this.sockets.push(socket);
    });
  }

  private createStation(id: Level2Station): void {
    const position = LEVEL_2_STATION_BOUNDS[id];
    const station = this.add.container(position.x + position.width / 2, position.y + position.height / 2).setDepth(6);
    station.setSize(position.width, position.height);
    station.setInteractive({ useHandCursor: true });
    station.on('pointerdown', () => this.openPuzzle(id));

    const halo = this.add.ellipse(0, 0, position.width * 0.86, position.height * 0.78, GOLD, 0.025);
    halo.setStrokeStyle(4, GOLD, 0.28);
    station.add(halo);
    station.setData('halo', halo);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.015, to: 0.07 },
      scale: { from: 0.98, to: 1.02 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 450),
    });
    this.stations.set(id, station);
  }

  private createGuide(): void {
    const guide = this.add.container(640, 100).setDepth(30);
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
    LEVEL_2_STATIONS.forEach((stationId, index) => {
      const station = this.stations.get(stationId);
      if (station === undefined) return;
      const solved = this.state.solved[stationId];
      const halo = station.getData('halo') as Phaser.GameObjects.Ellipse;
      halo.setFillStyle(solved ? TEAL : GOLD, solved ? 0.07 : 0.025);
      halo.setStrokeStyle(4, solved ? TEAL : GOLD, solved ? 0.5 : 0.28);
      if (solved) {
        station.disableInteractive();
        if (station.getData('badge') === undefined) {
          const badge = this.add.graphics().setPosition(0, -LEVEL_2_STATION_BOUNDS[stationId].height * 0.42);
          badge.fillStyle(GOLD, 1);
          badge.fillPoints(starPoints(0, 0, 24, 11), true);
          badge.lineStyle(4, CREAM, 0.9);
          badge.strokePoints(starPoints(0, 0, 24, 11), true, true);
          station.add(badge);
          station.setData('badge', badge);
          this.tweens.add({ targets: badge, scale: { from: 0, to: 1 }, angle: 360, duration: 450, ease: 'Back.out' });
        }
      } else if (this.overlay === undefined && !this.finished) {
        station.setInteractive({ useHandCursor: true });
      }

      const socket = this.sockets[index]!;
      socket.clear();
      socket.fillStyle(solved ? GOLD : FELT, solved ? 1 : 0.86);
      socket.fillPoints(starPoints(0, 0, 16, 7), true);
      socket.lineStyle(3, solved ? CREAM : GOLD, solved ? 0.95 : 0.5);
      socket.strokePoints(starPoints(0, 0, 16, 7), true, true);
    });

    const next = LEVEL_2_STATIONS.find((station) => !this.state.solved[station]);
    if (this.guide !== undefined && next !== undefined && this.overlay === undefined && !this.finished) {
      const position = LEVEL_2_STATION_BOUNDS[next];
      const guideToken = this.overlayToken;
      this.guide.setVisible(true);
      this.tweens.killTweensOf(this.guide);
      this.tweens.add({
        targets: this.guide,
        x: position.x + position.width / 2,
        y: position.y - 34,
        duration: 650,
        ease: 'Sine.inOut',
        onComplete: () => {
          if (this.overlayToken !== guideToken || this.finished || this.guide === undefined) return;
          this.tweens.add({ targets: this.guide, y: '+=10', duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        },
      });
    }
    if (next === undefined) this.showLevelEnd();
  }

  private openPuzzle(stationId: Level2Station): void {
    if (this.overlay !== undefined || this.state.solved[stationId] || this.finished) return;
    this.overlayToken += 1;
    const token = this.overlayToken;
    for (const station of this.stations.values()) station.disableInteractive();
    this.guide?.setVisible(false);

    const type = this.setup.stationTypes[stationId];
    const challenge = this.setup.challenges[stationId];
    const overlay = this.add.container(W / 2, H / 2).setDepth(100);
    this.overlay = overlay;
    const shade = this.add.rectangle(0, 0, W, H, NIGHT, 0.84).setInteractive();
    // The generated paper panel has baked corner ornaments that the existing close/emblem controls do not fully cover;
    // retain the reviewed panel.webp so those controls stay unambiguous at tablet crop sizes.
    const panel = this.add.image(0, 0, 'puzzle-panel').setDisplaySize(1060, 596);
    overlay.add([shade, panel]);

    const close = this.makeCloseButton(470, -250);
    close.on('pointerdown', () => this.closeOverlay());
    overlay.add(close);
    const emblem = this.add.graphics().setPosition(-462, -250);
    emblem.fillStyle(GOLD, 0.2);
    emblem.fillCircle(0, 0, 42);
    emblem.lineStyle(4, GOLD, 0.75);
    emblem.strokeCircle(0, 0, 42);
    this.drawTypeEmblem(emblem, type);
    overlay.add(emblem);

    switch (type) {
      case 'count-and-match': this.createCountPuzzle(overlay, challenge as CountAndMatchChallenge, stationId, token); break;
      case 'picture-addition': this.createAdditionPuzzle(overlay, challenge as PictureAdditionChallenge, stationId, token); break;
      case 'number-train': this.createTrainPuzzle(overlay, challenge as NumberTrainChallenge, stationId, token); break;
      case 'more-or-fewer': this.createMorePuzzle(overlay, challenge as MoreOrFewerChallenge, stationId, token); break;
      case 'number-dials': this.createDialsPuzzle(overlay, challenge as NumberDialsChallenge, stationId, token); break;
      case 'number-melody': this.createMelodyPuzzle(overlay, challenge as NumberMelodyChallenge, stationId, token); break;
      case 'find-the-group': this.createFindGroupPuzzle(overlay, challenge as FindTheGroupChallenge, stationId, token); break;
      case 'odd-one-out': this.createOddPuzzle(overlay, challenge as OddOneOutChallenge, stationId, token); break;
      default: throw new Error(`Unsupported Level 2 puzzle ${type}`);
    }
    overlay.setScale(0.94).setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, scale: 1, duration: 240, ease: 'Back.out' });
  }

  private makeCloseButton(x: number, y: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setSize(82, 82).setInteractive({ useHandCursor: true });
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
    if (type === 'count-and-match') {
      g.fillStyle(ROSE, 1); g.fillCircle(-17, 0, 9); g.fillCircle(0, 0, 9); g.fillCircle(17, 0, 9); return;
    }
    if (type === 'picture-addition') {
      g.fillStyle(TEAL, 1); g.fillCircle(-15, 0, 10); g.fillCircle(15, 0, 10); g.fillStyle(GOLD, 1); g.fillRect(-5, -20, 10, 40); g.fillRect(-20, -5, 40, 10); return;
    }
    if (type === 'number-train') {
      g.fillStyle(BLUE, 1); g.fillRoundedRect(-22, -8, 44, 16, 6); g.fillStyle(INK, 1); g.fillRect(-14, -20, 9, 12); g.fillCircle(-12, 13, 5); g.fillCircle(12, 13, 5); return;
    }
    if (type === 'more-or-fewer') {
      g.fillStyle(ROSE, 1); g.fillCircle(-18, 0, 9); g.fillCircle(0, 0, 9); g.fillStyle(TEAL, 1); g.fillCircle(22, 0, 9); return;
    }
    if (type === 'number-dials') {
      g.fillStyle(GOLD, 1); g.fillCircle(-18, 0, 13); g.fillCircle(18, 0, 13); g.lineStyle(5, CREAM, 1); g.lineBetween(-8, 0, 8, 0); return;
    }
    if (type === 'number-melody') {
      [ROSE, TEAL, BLUE].forEach((color, index) => { g.fillStyle(color, 1); g.fillCircle(-20 + index * 20, 5, 9); }); return;
    }
    if (type === 'find-the-group') {
      g.fillStyle(PURPLE, 1); g.fillCircle(-18, -5, 9); g.fillCircle(0, 7, 9); g.fillCircle(18, -5, 9); return;
    }
    g.fillStyle(ROSE, 1); g.fillCircle(-17, 0, 10); g.fillStyle(TEAL, 1); g.fillCircle(0, 0, 10); g.fillStyle(BLUE, 1); g.fillCircle(17, 0, 10);
  }

  private createCountPuzzle(
    overlay: Phaser.GameObjects.Container,
    challenge: CountAndMatchChallenge,
    station: Level2Station,
    token: number,
  ): void {
    const xs = [-300, 0, 300];
    const zones: { x: number; y: number }[] = [];
    let matched = 0;
    challenge.groups.forEach((group, index) => {
      const x = xs[index]!;
      zones.push({ x, y: 55 });
      const box = this.add.graphics();
      box.fillStyle(FELT, 0.22); box.fillRoundedRect(x - 140, -190, 280, 330, 28); box.lineStyle(5, GOLD, 0.45); box.strokeRoundedRect(x - 140, -190, 280, 330, 28);
      overlay.add(box);
      const animals = this.add.graphics().setPosition(x, -82);
      this.drawAnimalGroup(animals, group.animal, group.count, 0, 0, 0.64);
      overlay.add(animals);
      const zone = this.add.graphics().setPosition(x, 55);
      zone.fillStyle(CREAM, 0.1); zone.fillRoundedRect(-65, -65, 130, 130, 28); zone.lineStyle(6, GOLD, 0.85); zone.strokeRoundedRect(-65, -65, 130, 130, 28);
      overlay.add(zone);
    });

    challenge.numerals.forEach((numeral, position) => {
      const homeX = xs[position]!;
      const tile = this.makeNumeralTile(homeX, 205, numeral, GOLD);
      tile.setData({ numeral, homeX, homeY: 205, matched: false });
      overlay.add(tile);
      this.input.setDraggable(tile);
      tile.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.overlayToken !== token || tile.getData('matched')) return;
        tile.setPosition(dragX, dragY);
      });
      tile.on('dragend', () => {
        if (this.overlayToken !== token || tile.getData('matched')) return;
        const zoneIndex = zones.findIndex((zone) => Phaser.Math.Distance.Between(tile.x, tile.y, zone.x, zone.y) < 120);
        if (zoneIndex >= 0 && countPieceMatches(challenge, position, zoneIndex)) {
          tile.setData('matched', true); tile.disableInteractive(); this.input.setDraggable(tile, false); matched += 1;
          const zone = zones[zoneIndex]!;
          this.tweens.add({ targets: tile, x: zone.x, y: zone.y, scale: 0.9, duration: 280, ease: 'Back.out' });
          this.burst(overlay, zone.x, zone.y, GOLD, token);
          if (matched === challenge.numerals.length) this.delayedFinish(station, token, 450);
        } else this.resetToHome(tile, token);
      });
    });
  }

  private createAdditionPuzzle(
    overlay: Phaser.GameObjects.Container,
    challenge: PictureAdditionChallenge,
    station: Level2Station,
    token: number,
  ): void {
    const equation = this.add.container(0, -35);
    overlay.add(equation);
    const left = this.add.graphics(); this.drawAnimalGroup(left, 0, challenge.left, -235, 0, 0.82);
    const right = this.add.graphics(); this.drawAnimalGroup(right, 1, challenge.right, 40, 0, 0.82);
    equation.add([left, right, this.makeSymbol(-105, 0, '+', 66), this.makeSymbol(170, 0, '=', 66)]);
    const slot = this.add.graphics(); slot.fillStyle(CREAM, 0.1); slot.fillRoundedRect(190, -68, 136, 136, 28); slot.lineStyle(6, GOLD, 0.8); slot.strokeRoundedRect(190, -68, 136, 136, 28); equation.add(slot);
    const dots = this.makeProgressDots(overlay, 1);
    const choices = [-240, 0, 240].map((x, index) => {
      const button = this.makeAnswerButton(x, 190, challenge.choices[index]!, (choice, target) => {
        if (this.overlayToken !== token) return;
        if (additionAnswer(challenge, choice)) {
          target.disableInteractive();
          equation.add(this.makeNumeral(258, 0, challenge.answer, 76, GOLD));
          this.updateDots(dots, 1);
          this.burst(overlay, 258, -35, GOLD, token);
          this.delayedFinish(station, token, 550);
        } else this.shake(target, token);
      });
      overlay.add(button); return button;
    });
    if (choices.length === 0) return;
  }

  private createTrainPuzzle(
    overlay: Phaser.GameObjects.Container,
    challenge: NumberTrainChallenge,
    station: Level2Station,
    token: number,
  ): void {
    const train = this.add.container(0, -55); overlay.add(train);
    const xs = [-315, -105, 105, 315];
    challenge.sequence.forEach((value, index) => train.add(this.makeCarriage(xs[index]!, 0, value === 0 ? null : value, value === 0)));
    const dots = this.makeProgressDots(overlay, 1);
    const choices = [-240, 0, 240].map((x, index) => {
      const button = this.makeAnswerButton(x, 190, challenge.choices[index]!, (choice, target) => {
        if (this.overlayToken !== token) return;
        if (trainAnswer(challenge, choice)) {
          target.disableInteractive(); train.add(this.makeNumeral(xs[challenge.blankIndex]!, 0, challenge.answer, 68, INK));
          this.updateDots(dots, 1); this.burst(overlay, xs[challenge.blankIndex]!, -55, GOLD, token); this.delayedFinish(station, token, 550);
        } else this.shake(target, token);
      });
      overlay.add(button); return button;
    });
    if (choices.length === 0) return;
  }

  private createMorePuzzle(
    overlay: Phaser.GameObjects.Container,
    challenge: MoreOrFewerChallenge,
    station: Level2Station,
    token: number,
  ): void {
    const sides: Array<'left' | 'right'> = ['left', 'right'];
    const xs = [-250, 250];
    sides.forEach((side, index) => {
      const count = side === 'left' ? challenge.left : challenge.right;
      const card = this.add.container(xs[index]!, -10).setSize(320, 310).setInteractive({ useHandCursor: true });
      const g = this.add.graphics(); g.fillStyle(side === 'left' ? ROSE : TEAL, 0.18); g.fillRoundedRect(-150, -145, 300, 290, 34); g.lineStyle(7, side === 'left' ? ROSE : TEAL, 0.78); g.strokeRoundedRect(-150, -145, 300, 290, 34);
      card.add(g);
      const animals = this.add.graphics(); this.drawAnimalGroup(animals, index, count, 0, 0, 0.8); card.add(animals);
      overlay.add(card);
      card.on('pointerdown', () => {
        if (this.overlayToken !== token) return;
        if (moreOrFewerAnswer(challenge, side)) { card.disableInteractive(); this.burst(overlay, xs[index]!, -10, GOLD, token); this.delayedFinish(station, token, 500); }
        else this.shake(card, token);
      });
    });
    const arrow = this.add.graphics(); arrow.fillStyle(GOLD, 0.9); arrow.fillTriangle(-45, 175, 45, 175, 0, 120); overlay.add(arrow);
  }

  private createDialsPuzzle(
    overlay: Phaser.GameObjects.Container,
    challenge: NumberDialsChallenge,
    station: Level2Station,
    token: number,
  ): void {
    const xs = [-275, 0, 275];
    challenge.targets.forEach((count, index) => {
      const card = this.add.graphics(); card.fillStyle(FELT, 0.2); card.fillRoundedRect(xs[index]! - 120, -195, 240, 245, 28); card.lineStyle(5, GOLD, 0.5); card.strokeRoundedRect(xs[index]! - 120, -195, 240, 245, 28); overlay.add(card);
      const group = this.add.graphics(); this.drawAnimalGroup(group, index, count, xs[index]!, -75, 0.6); overlay.add(group);
    });
    const dials = [...challenge.dials];
    const lenses = xs.map((x, index) => {
      const lens = this.makeNumberDial(x, 120, dials[index]!); overlay.add(lens);
      lens.on('pointerdown', () => {
        if (this.overlayToken !== token) return;
        dials[index] = cycleNumeral(dials[index]!, challenge.symbolCount);
        this.redrawNumberDial(lens, dials[index]!);
        if (dials[index] === challenge.targets[index]) this.burst(overlay, x, 120, GOLD, token);
        if (numberDialsSolved(challenge, dials)) { lenses.forEach((dial) => dial.disableInteractive()); this.delayedFinish(station, token, 500); }
      });
      return lens;
    });
  }

  private createMelodyPuzzle(
    overlay: Phaser.GameObjects.Container,
    challenge: NumberMelodyChallenge,
    station: Level2Station,
    token: number,
  ): void {
    const xs = [-240, 0, 240];
    const colours = [ROSE, TEAL, BLUE];
    const buttons = xs.map((x, index) => { const button = this.makeNumberButton(x, 120, challenge.buttons[index]!, colours[index]!); overlay.add(button); return button; });
    const dots = this.makeProgressDots(overlay, 3);
    let progress: MelodyProgress = { notes: [], mistake: false, complete: false };
    let accepting = false;
    const flash = (index: number): void => {
      if (this.overlayToken !== token) return;
      const button = buttons[index]!;
      this.tweens.add({ targets: button, scale: 1.16, duration: 130, yoyo: true, ease: 'Sine.inOut' });
    };
    const showSequence = (): void => {
      if (this.overlayToken !== token) return;
      accepting = false; progress = { notes: [], mistake: false, complete: false }; this.updateDots(dots, 0);
      challenge.sequence.forEach((note, index) => this.time.delayedCall(260 + index * 520, () => { if (this.overlayToken === token) flash(note); }));
      this.time.delayedCall(260 + challenge.sequence.length * 520, () => { if (this.overlayToken === token) accepting = true; });
    };
    buttons.forEach((button, index) => button.on('pointerdown', () => {
      if (!accepting || this.overlayToken !== token) return;
      flash(index);
      progress = playMelody(challenge.sequence, progress.notes, index);
      if (progress.mistake) {
        accepting = false; this.cameras.main.shake(120, 0.002);
        this.time.delayedCall(420, () => { if (this.overlayToken === token) showSequence(); });
        return;
      }
      this.updateDots(dots, progress.notes.length);
      if (progress.complete) { accepting = false; this.burst(overlay, 0, 10, GOLD, token); this.delayedFinish(station, token, 500); }
    }));
    this.time.delayedCall(420, () => { if (this.overlayToken === token) showSequence(); });
  }

  private createFindGroupPuzzle(
    overlay: Phaser.GameObjects.Container,
    challenge: FindTheGroupChallenge,
    station: Level2Station,
    token: number,
  ): void {
    const ticket = this.makeNumeral(0, -150, challenge.ticket, 92, GOLD);
    overlay.add(ticket);
    const ticketRing = this.add.graphics(); ticketRing.lineStyle(7, GOLD, 0.8); ticketRing.strokeCircle(0, -150, 68); ticketRing.fillStyle(FELT, 0.25); ticketRing.fillCircle(0, -150, 68); overlay.addAt(ticketRing, overlay.length - 1);
    const xs = [-285, 0, 285];
    challenge.groups.forEach((count, index) => {
      const card = this.add.container(xs[index]!, 80).setSize(260, 250).setInteractive({ useHandCursor: true });
      const g = this.add.graphics(); g.fillStyle(PURPLE, 0.18); g.fillRoundedRect(-125, -120, 250, 240, 30); g.lineStyle(7, PURPLE, 0.76); g.strokeRoundedRect(-125, -120, 250, 240, 30); card.add(g);
      const animals = this.add.graphics(); this.drawAnimalGroup(animals, index, count, 0, 0, 0.63); card.add(animals); overlay.add(card);
      card.on('pointerdown', () => {
        if (this.overlayToken !== token) return;
        if (findGroupAnswer(challenge, index)) { card.disableInteractive(); this.burst(overlay, xs[index]!, 80, GOLD, token); this.delayedFinish(station, token, 500); }
        else this.shake(card, token);
      });
    });
  }

  private createOddPuzzle(
    overlay: Phaser.GameObjects.Container,
    challenge: OddOneOutChallenge,
    station: Level2Station,
    token: number,
  ): void {
    const cards = level2OddOneOutCards(challenge);
    const xs = [-330, -110, 110, 330];
    cards.forEach((cardData, index) => {
      const card = this.add.container(xs[index]!, 20).setSize(190, 300).setInteractive({ useHandCursor: true });
      const g = this.add.graphics(); g.fillStyle(index === challenge.oddIndex ? ROSE : TEAL, 0.2); g.fillRoundedRect(-90, -145, 180, 290, 26); g.lineStyle(6, index === challenge.oddIndex ? ROSE : TEAL, 0.8); g.strokeRoundedRect(-90, -145, 180, 290, 26); card.add(g);
      // Three cards show numeral = group. One card visibly shows a different numeral over the same group.
      card.add(this.makeNumeral(0, -75, cardData.numeral, 58, CREAM));
      const animals = this.add.graphics(); this.drawAnimalGroup(animals, index, cardData.groupCount, 0, 55, 0.44); card.add(animals);
      overlay.add(card);
      card.on('pointerdown', () => {
        if (this.overlayToken !== token) return;
        if (oddOneOutAnswer(challenge, index)) { card.disableInteractive(); this.burst(overlay, xs[index]!, 20, GOLD, token); this.delayedFinish(station, token, 500); }
        else this.shake(card, token);
      });
    });
  }

  private makeProgressDots(overlay: Phaser.GameObjects.Container, count: number): Phaser.GameObjects.Graphics[] {
    const dots: Phaser.GameObjects.Graphics[] = [];
    for (let index = 0; index < count; index += 1) {
      const dot = this.add.graphics().setPosition(-((count - 1) * 40) + index * 80, -235);
      overlay.add(dot); dots.push(dot);
    }
    this.updateDots(dots, 0);
    return dots;
  }

  private updateDots(dots: Phaser.GameObjects.Graphics[], completeCount: number): void {
    dots.forEach((dot, index) => {
      dot.clear(); dot.fillStyle(CREAM, 0.14); dot.fillCircle(0, 0, 20); dot.lineStyle(4, CREAM, 0.3); dot.strokeCircle(0, 0, 20);
      if (index < completeCount) { dot.fillStyle(GOLD, 1); dot.fillCircle(0, 0, 20); dot.fillStyle(CREAM, 1); dot.fillPoints(starPoints(0, 0, 11, 5), true); }
    });
  }

  private makeNumeralTile(x: number, y: number, value: number, color: number): Phaser.GameObjects.Container {
    const tile = this.add.container(x, y).setSize(145, 145).setInteractive({ useHandCursor: true, draggable: true });
    const g = this.add.graphics(); g.fillStyle(color, 1); g.fillRoundedRect(-65, -65, 130, 130, 30); g.lineStyle(8, INK, 1); g.strokeRoundedRect(-65, -65, 130, 130, 30); tile.add(g); tile.add(this.makeNumeral(0, 0, value, 76, CREAM));
    return tile;
  }

  private makeAnswerButton(
    x: number,
    y: number,
    value: number,
    onTap: (choice: number, target: Phaser.GameObjects.Container) => void,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setSize(166, 166).setInteractive({ useHandCursor: true });
    const g = this.add.graphics(); g.fillStyle(CREAM, 1); g.fillCircle(0, 0, 76); g.lineStyle(9, INK, 1); g.strokeCircle(0, 0, 76); button.add(g); button.add(this.makeNumeral(0, 0, value, 82, INK));
    button.on('pointerdown', () => onTap(value, button));
    return button;
  }

  private makeNumberButton(x: number, y: number, value: number, color: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setSize(205, 220).setInteractive({ useHandCursor: true });
    const aura = this.add.ellipse(0, 0, 200, 190, color, 0.15); const g = this.add.graphics(); g.fillStyle(color, 1); g.fillCircle(0, 0, 78); g.lineStyle(8, CREAM, 0.85); g.strokeCircle(0, 0, 78); button.add([aura, g, this.makeNumeral(0, 0, value, 78, CREAM)]);
    return button;
  }

  private makeNumberDial(x: number, y: number, value: number): Phaser.GameObjects.Container {
    const dial = this.add.container(x, y).setSize(190, 170).setInteractive({ useHandCursor: true });
    const g = this.add.graphics(); g.fillStyle(CREAM, 1); g.fillCircle(0, 0, 76); g.lineStyle(8, BLUE, 0.95); g.strokeCircle(0, 0, 76); g.lineStyle(7, GOLD, 0.8); g.beginPath(); g.arc(0, 0, 91, -0.55, 0.55); g.strokePath(); g.fillStyle(GOLD, 1); g.fillTriangle(78, 43, 101, 37, 94, 62); dial.add(g); dial.add(this.makeNumeral(0, 0, value, 82, INK));
    return dial;
  }

  private redrawNumberDial(dial: Phaser.GameObjects.Container, value: number): void {
    const text = dial.list.find((child): child is Phaser.GameObjects.Text => child instanceof Phaser.GameObjects.Text);
    text?.setText(String(value));
    this.tweens.add({ targets: dial, angle: 12, scale: 1.08, duration: 100, yoyo: true, ease: 'Sine.inOut' });
  }

  private makeCarriage(x: number, y: number, value: number | null, blank: boolean): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics(); g.fillStyle(blank ? CREAM : BLUE, blank ? 0.14 : 0.85); g.fillRoundedRect(-82, -53, 164, 106, 24); g.lineStyle(7, INK, 1); g.strokeRoundedRect(-82, -53, 164, 106, 24); if (blank) { g.lineStyle(4, GOLD, 0.8); g.strokeRoundedRect(-69, -40, 138, 80, 17); } g.fillStyle(INK, 1); g.fillCircle(-46, 59, 15); g.fillCircle(46, 59, 15); g.fillStyle(CREAM, 1); g.fillCircle(-46, 59, 6); g.fillCircle(46, 59, 6); c.add(g); if (value !== null) c.add(this.makeNumeral(0, 0, value, 65, blank ? CREAM : INK)); return c;
  }

  private makeNumeral(x: number, y: number, value: number, size: number, color: number): Phaser.GameObjects.Text {
    return this.add.text(x, y, String(value), { fontFamily: NUMERAL_FONT, fontSize: `${Math.round(size)}px`, fontStyle: 'bold', color: `#${color.toString(16).padStart(6, '0')}`, stroke: `#${INK.toString(16).padStart(6, '0')}`, strokeThickness: Math.max(3, Math.round(size * 0.1)) }).setOrigin(0.5);
  }

  private makeSymbol(x: number, y: number, symbol: '+' | '=', size: number): Phaser.GameObjects.Text {
    return this.add.text(x, y, symbol, { fontFamily: NUMERAL_FONT, fontSize: `${Math.round(size)}px`, fontStyle: 'bold', color: `#${CREAM.toString(16).padStart(6, '0')}`, stroke: `#${INK.toString(16).padStart(6, '0')}`, strokeThickness: Math.max(3, Math.round(size * 0.1)) }).setOrigin(0.5);
  }

  private resetToHome(target: Phaser.GameObjects.Container, token: number): void {
    if (this.overlayToken !== token) return;
    this.tweens.add({ targets: target, x: target.getData('homeX') as number, y: target.getData('homeY') as number, angle: { from: -8, to: 0 }, duration: 340, ease: 'Back.out' });
  }

  private shake(target: Phaser.GameObjects.Container, token: number): void {
    if (this.overlayToken !== token) return;
    this.tweens.add({ targets: target, x: '+=12', duration: 70, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
  }

  private delayedFinish(station: Level2Station, token: number, delay: number): void {
    this.time.delayedCall(delay, () => { if (this.overlayToken === token) this.finishPuzzle(station, token); });
  }

  private finishPuzzle(station: Level2Station, token: number): void {
    if (this.overlay === undefined || this.overlayToken !== token || this.state.solved[station]) return;
    this.state = solveRoomStation(this.state, station);
    if (savedVisit !== undefined) savedVisit.state = this.state;
    const star = this.add.graphics(); star.fillStyle(GOLD, 1); star.fillPoints(starPoints(0, 0, 70, 30), true); star.lineStyle(7, CREAM, 0.9); star.strokePoints(starPoints(0, 0, 70, 30), true, true); star.setScale(0); this.overlay.add(star);
    this.burst(this.overlay, 0, 0, GOLD, token);
    this.tweens.add({ targets: star, scale: 1, angle: 360, duration: 520, ease: 'Back.out' });
    this.time.delayedCall(760, () => { if (this.overlayToken !== token) return; this.closeOverlay(); this.refreshRoom(); });
  }

  private closeOverlay(): void {
    if (this.overlay === undefined) return;
    this.overlayToken += 1;
    this.tweens.killTweensOf(this.overlay);
    this.overlay.destroy(true);
    this.overlay = undefined;
    this.refreshRoom();
  }

  private burst(parent: Phaser.GameObjects.Container, x: number, y: number, color: number, token: number): void {
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
        onComplete: () => { if (this.overlayToken === token && sparkle.scene !== null) sparkle.destroy(); },
      });
    }
  }

  private showLevelEnd(): void {
    if (this.finished) return;
    this.finished = true;
    const token = this.overlayToken;
    this.guide?.setVisible(true);
    if (this.guide !== undefined) {
      this.tweens.killTweensOf(this.guide);
      this.guide.setPosition(640, 315).setScale(0.2).setAlpha(0);
      this.tweens.add({ targets: this.guide, alpha: 1, scale: 1, duration: 520, ease: 'Back.out' });
    }
    for (const station of this.stations.values()) station.disableInteractive();
    const crown = this.add.graphics().setDepth(51).setPosition(640, 235);
    crown.fillStyle(GOLD, 1); crown.fillPoints(starPoints(0, 0, 60, 26), true); crown.lineStyle(6, CREAM, 0.9); crown.strokePoints(starPoints(0, 0, 60, 26), true, true); crown.setScale(0);
    this.tweens.add({ targets: crown, scale: 1, angle: 360, duration: 650, ease: 'Back.out' });
    for (let index = 0; index < 36; index += 1) {
      const sparkle = this.add.circle(640, 320, Phaser.Math.Between(3, 8), index % 3 === 0 ? CREAM : GOLD, 1).setDepth(50);
      this.tweens.add({ targets: sparkle, x: 640 + Phaser.Math.Between(-300, 300), y: 320 + Phaser.Math.Between(-240, 240), alpha: 0, scale: 0.1, duration: Phaser.Math.Between(900, 1700), delay: Phaser.Math.Between(0, 500), ease: 'Quad.out', onComplete: () => { if (this.overlayToken === token && sparkle.scene !== null) sparkle.destroy(); } });
    }
    this.time.delayedCall(2700, () => { if (this.overlayToken === token) this.scene.start('LevelSelect'); });
  }

  private drawAnimalGroup(g: Phaser.GameObjects.Graphics, animal: number, count: number, centerX: number, centerY: number, scale: number): void {
    const positions: Array<[number, number]> = count === 1
      ? [[0, 0]]
      : count === 2
        ? [[-35, 0], [35, 0]]
        : count === 3
          ? [[-42, 0], [0, 0], [42, 0]]
          : count === 4
            ? [[-32, -28], [32, -28], [-32, 28], [32, 28]]
            : [[-42, -25], [0, -25], [42, -25], [-22, 28], [22, 28]];
    positions.forEach(([x, y]) => this.drawAnimal(g, animal % 3, centerX + x * scale, centerY + y * scale, scale));
  }

  private drawAnimal(g: Phaser.GameObjects.Graphics, animal: number, x: number, y: number, scale: number): void {
    g.save(); g.translateCanvas(x, y); g.scaleCanvas(scale, scale); g.lineStyle(4, INK, 1);
    if (animal === 0) {
      g.fillStyle(ROSE, 1); g.fillEllipse(-10, -43, 17, 30); g.strokeEllipse(-10, -43, 17, 30); g.fillEllipse(10, -43, 17, 30); g.strokeEllipse(10, -43, 17, 30); g.fillCircle(0, -18, 21); g.strokeCircle(0, -18, 21); g.fillEllipse(0, 17, 40, 46); g.strokeEllipse(0, 17, 40, 46); g.fillStyle(CREAM, 0.9); g.fillEllipse(0, 20, 19, 24); g.fillStyle(INK, 1); g.fillCircle(-7, -20, 3); g.fillCircle(7, -20, 3); g.fillCircle(0, -12, 3);
    } else if (animal === 1) {
      g.fillStyle(GOLD, 1); g.fillEllipse(0, 9, 43, 35); g.strokeEllipse(0, 9, 43, 35); g.fillCircle(0, -20, 19); g.strokeCircle(0, -20, 19); g.fillStyle(0xff8c42, 1); g.fillTriangle(-7, -16, 7, -16, 0, -5); g.strokeTriangle(-7, -16, 7, -16, 0, -5); g.fillStyle(INK, 1); g.fillCircle(0, -24, 3);
    } else {
      g.fillStyle(BLUE, 1); g.fillTriangle(-38, 0, -18, -16, -18, 16); g.strokeTriangle(-38, 0, -18, -16, -18, 16); g.fillEllipse(0, 0, 56, 34); g.strokeEllipse(0, 0, 56, 34); g.fillStyle(CREAM, 0.8); g.fillEllipse(-6, 8, 28, 13); g.fillStyle(INK, 1); g.fillCircle(16, -6, 3.5);
    }
    g.restore();
  }
}
