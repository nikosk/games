import Phaser from 'phaser';
import bumpUrl from '../../assets/audio/bump.wav?url';
import clackUrl from '../../assets/audio/clack.wav?url';
import placeUrl from '../../assets/audio/place.wav?url';
import successUrl from '../../assets/audio/success.wav?url';
import whistleUrl from '../../assets/audio/whistle.wav?url';
import {
  COLS,
  LEVELS,
  ROWS,
  cellKey,
  createBoard,
  getLevel,
  type WorkshopLevel,
} from '../game/level';
import { createWorkshopLayout, DESIGN_CELL_SIZE, type WorkshopLayout } from '../game/layout';
import {
  cloneBoard,
  rotate,
  traceRoute,
  type BoardCell,
  type Direction,
  type Point,
  type RouteFailure,
  type TrackKind,
  type TrackPiece,
} from '../game/rules';

const CELL_SIZE = DESIGN_CELL_SIZE;

const COLORS = {
  deepGreen: 0x173f38,
  felt: 0x78a95d,
  feltLight: 0x86b86a,
  cream: 0xfff4d6,
  ink: 0x20352f,
  brass: 0xe5b74f,
  brassLight: 0xf5d274,
  wood: 0x8a5635,
  woodLight: 0xc88f58,
  rail: 0x46535a,
  railShine: 0xaeb9b7,
  red: 0xc85445,
  blue: 0x438599,
  paper: 0xf6e8c8,
} as const;

interface Snapshot {
  readonly board: BoardCell[][];
  readonly inventory: Record<TrackKind, number>;
}

type Tool = TrackKind | 'erase';

export class WorkshopScene extends Phaser.Scene {
  private levelIndex = 0;
  private level: WorkshopLevel = getLevel(0);
  private board: BoardCell[][] = createBoard(this.level);
  private inventory: Record<TrackKind, number> = { ...this.level.inventory };
  private history: Snapshot[] = [];
  private selectedTool: Tool = 'straight';
  private isRunning = false;
  private completed = false;
  private reducedMotion = false;
  private resizePending = false;
  private layout!: WorkshopLayout;

  private boardLayer!: Phaser.GameObjects.Container;
  private controlsLayer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private levelNameText!: Phaser.GameObjects.Text;
  private train!: Phaser.GameObjects.Container;
  private runButton!: Phaser.GameObjects.Container;

  constructor() {
    super('WorkshopScene');
  }

  preload(): void {
    this.load.audio('place', placeUrl);
    this.load.audio('clack', clackUrl);
    this.load.audio('whistle', whistleUrl);
    this.load.audio('success', successUrl);
    this.load.audio('bump', bumpUrl);
  }

  create(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resizePending = false;
    this.layout = createWorkshopLayout(this.scale.width, this.scale.height);
    this.input.mouse?.disableContextMenu();
    this.drawWorkshop();

    this.boardLayer = this.add.container(this.layout.boardX, this.layout.boardY)
      .setScale(this.layout.boardScale)
      .setDepth(10);

    const panelContent = this.add.container(this.layout.controlsX, this.layout.controlsY)
      .setScale(this.layout.controlsScale)
      .setDepth(61);
    panelContent.add(this.add.text(16, 18, 'RAILWAY WORKSHOP', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#f5d274',
      fontStyle: 'bold',
      letterSpacing: 1.5,
    }));
    this.statusText = this.add.text(16, 50, 'Choose a track piece, then tap the grass.', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '16px',
      color: '#fff4d6',
      fontStyle: 'bold',
      wordWrap: { width: 248 },
    });
    panelContent.add(this.statusText);
    this.levelNameText = this.add.text(140, 98, '', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '12px',
      color: '#ead7b4',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    panelContent.add(this.levelNameText);

    this.controlsLayer = this.add.container(this.layout.controlsX, this.layout.controlsY)
      .setScale(this.layout.controlsScale)
      .setDepth(62);

    this.renderBoard();
    this.createTrain();
    this.renderControls();
    this.installKeyboardControls();
    this.updateRouteMessage();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, this.renderControls, this);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.renderControls, this);
    this.scale.on(Phaser.Scale.Events.FULLSCREEN_FAILED, this.handleFullscreenFailure, this);
    this.scale.on(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, this.handleFullscreenFailure, this);

    const canvas = this.game.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Railway Workshop puzzle board');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, this.renderControls, this);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.renderControls, this);
      this.scale.off(Phaser.Scale.Events.FULLSCREEN_FAILED, this.handleFullscreenFailure, this);
      this.scale.off(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, this.handleFullscreenFailure, this);
      this.input.keyboard?.removeAllListeners();
      this.tweens.killAll();
      this.sound.stopAll();
    });
  }

  private drawWorkshop(): void {
    const { width, height, boardX, boardY, boardWidth, boardHeight, panelX, panelY, panelWidth, panelHeight } = this.layout;
    this.cameras.main.setBackgroundColor(COLORS.deepGreen);

    const background = this.add.graphics();
    background.fillStyle(0x1c4a41);
    background.fillRect(0, 0, width, height);
    background.fillStyle(0xffffff, 0.025);
    for (let x = 12; x < width; x += 24) background.fillRect(x, 0, 2, height);

    const frame = Math.max(8, this.layout.cellSize * 0.08);
    background.fillStyle(0x4f311f, 0.55);
    background.fillRoundedRect(boardX - frame - 4, boardY - frame - 4, boardWidth + frame * 2 + 8, boardHeight + frame * 2 + 8, 18);
    background.fillStyle(COLORS.wood);
    background.fillRoundedRect(boardX - frame, boardY - frame, boardWidth + frame * 2, boardHeight + frame * 2, 15);
    background.lineStyle(4, COLORS.woodLight, 0.9);
    background.strokeRoundedRect(boardX - frame, boardY - frame, boardWidth + frame * 2, boardHeight + frame * 2, 15);

    background.fillStyle(0x102f2a, 0.55);
    background.fillRoundedRect(panelX - 5, panelY + 5, panelWidth + 10, panelHeight + 5, 18);
    background.fillStyle(0x6f452d, 0.98);
    background.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    background.lineStyle(3, COLORS.woodLight, 1);
    background.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
  }

  private renderBoard(): void {
    this.boardLayer.removeAll(true);
    const route = traceRoute(this.board, this.level.start, this.level.goal, this.level.direction);
    const connected = new Set(route.path.map((point) => cellKey(point)));

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const graphics = this.add.graphics();
        const isConnected = connected.has(`${x},${y}`);
        graphics.fillStyle(isConnected ? 0xaccb70 : (x + y) % 2 === 0 ? COLORS.felt : COLORS.feltLight);
        graphics.fillRoundedRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
        graphics.lineStyle(isConnected ? 3 : 1, isConnected ? COLORS.brassLight : 0x456e45, isConnected ? 0.9 : 0.55);
        graphics.strokeRoundedRect(x * CELL_SIZE + 3, y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6, 8);
        this.boardLayer.add(graphics);

        const point = { x, y };
        const scenery = this.level.scenery[cellKey(point)];
        if (scenery !== undefined) this.drawScenery(point, scenery);

        const piece = this.board[y]?.[x] ?? null;
        if (piece !== null) this.drawTrack(point, piece);

        const zone = this.add.zone(
          x * CELL_SIZE + CELL_SIZE / 2,
          y * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE - 6,
          CELL_SIZE - 6,
        );
        zone.setInteractive({ useHandCursor: scenery === undefined });
        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.rightButtonDown()) this.removePiece(point);
          else this.handleCellTap(point);
        });
        this.boardLayer.add(zone);
      }
    }

    this.drawDepotAndStation();
  }

  private drawScenery(point: Point, scenery: 'trees' | 'pond' | 'rocks'): void {
    const x = point.x * CELL_SIZE;
    const y = point.y * CELL_SIZE;
    const graphics = this.add.graphics();

    if (scenery === 'pond') {
      graphics.fillStyle(0x3f8793, 0.92);
      graphics.fillEllipse(x + 39, y + 41, 58, 40);
      graphics.lineStyle(3, 0x9bd1c5, 0.8);
      graphics.strokeEllipse(x + 39, y + 41, 55, 37);
      graphics.fillStyle(0xf2d35d);
      graphics.fillCircle(x + 52, y + 34, 4);
    } else if (scenery === 'rocks') {
      graphics.fillStyle(0x596a61);
      graphics.fillCircle(x + 31, y + 44, 18);
      graphics.fillStyle(0x6f8177);
      graphics.fillCircle(x + 49, y + 39, 16);
      graphics.fillStyle(0xa7b0a1, 0.6);
      graphics.fillEllipse(x + 42, y + 31, 19, 8);
    } else {
      graphics.fillStyle(0x704628);
      graphics.fillRoundedRect(x + 35, y + 42, 8, 24, 3);
      graphics.fillStyle(0x285e3d);
      graphics.fillTriangle(x + 39, y + 8, x + 15, y + 49, x + 63, y + 49);
      graphics.fillStyle(0x34764a);
      graphics.fillTriangle(x + 39, y + 20, x + 17, y + 59, x + 61, y + 59);
    }

    this.boardLayer.add(graphics);
  }

  private drawTrack(point: Point, piece: TrackPiece): void {
    const track = this.add.container(
      point.x * CELL_SIZE + CELL_SIZE / 2,
      point.y * CELL_SIZE + CELL_SIZE / 2,
    );
    const graphics = this.add.graphics();
    const half = CELL_SIZE / 2 + 2;

    if (piece.kind === 'straight') {
      graphics.lineStyle(8, 0x8a5b39, 1);
      for (let y = -31; y <= 31; y += 15.5) graphics.lineBetween(-25, y, 25, y);
      graphics.lineStyle(5, COLORS.rail, 1);
      graphics.lineBetween(-11, -half, -11, half);
      graphics.lineBetween(11, -half, 11, half);
      graphics.lineStyle(1.5, COLORS.railShine, 0.9);
      graphics.lineBetween(-9, -half, -9, half);
      graphics.lineBetween(13, -half, 13, half);
    } else {
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(0, -half),
        new Phaser.Math.Vector2(0, 0),
        new Phaser.Math.Vector2(half, 0),
      );
      const railA: Phaser.Math.Vector2[] = [];
      const railB: Phaser.Math.Vector2[] = [];
      graphics.lineStyle(7, 0x8a5b39, 1);
      for (let index = 1; index < 10; index += 2) {
        const t = index / 10;
        const p = curve.getPoint(t);
        const tangent = curve.getTangent(t).normalize();
        const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x);
        graphics.lineBetween(
          p.x - normal.x * 25,
          p.y - normal.y * 25,
          p.x + normal.x * 25,
          p.y + normal.y * 25,
        );
      }
      for (let index = 0; index <= 24; index += 1) {
        const t = index / 24;
        const p = curve.getPoint(t);
        const tangent = curve.getTangent(Math.min(0.999, Math.max(0.001, t))).normalize();
        const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x);
        railA.push(new Phaser.Math.Vector2(p.x + normal.x * 11, p.y + normal.y * 11));
        railB.push(new Phaser.Math.Vector2(p.x - normal.x * 11, p.y - normal.y * 11));
      }
      graphics.lineStyle(5, COLORS.rail, 1);
      graphics.strokePoints(railA, false, false);
      graphics.strokePoints(railB, false, false);
      graphics.lineStyle(1.5, COLORS.railShine, 0.9);
      graphics.strokePoints(railA.map((p) => new Phaser.Math.Vector2(p.x + 2, p.y)), false, false);
    }

    track.add(graphics);
    track.setAngle(piece.rotation * 90);
    this.boardLayer.add(track);
  }

  private drawDepotAndStation(): void {
    const labels = this.add.container(0, 0);
    const depot = this.add.graphics();
    const startX = this.level.start.x * CELL_SIZE + 8;
    const startY = this.level.start.y * CELL_SIZE + 7;
    depot.fillStyle(0x5f3824, 0.95);
    depot.fillRoundedRect(startX, startY, 35, 28, 4);
    depot.fillStyle(COLORS.red);
    depot.fillTriangle(startX - 4, startY + 4, startX + 18, startY - 9, startX + 41, startY + 4);
    depot.fillStyle(0x1f2d29);
    depot.fillRect(startX + 13, startY + 12, 13, 16);
    labels.add(depot);

    const station = this.add.graphics();
    const goalX = this.level.goal.x * CELL_SIZE + 38;
    const goalY = this.level.goal.y * CELL_SIZE + 8;
    station.fillStyle(COLORS.paper);
    station.fillRoundedRect(goalX, goalY, 33, 29, 4);
    station.fillStyle(COLORS.blue);
    station.fillTriangle(goalX - 4, goalY + 4, goalX + 16, goalY - 8, goalX + 37, goalY + 4);
    station.fillStyle(0x73482d);
    station.fillRect(goalX + 12, goalY + 14, 10, 15);
    labels.add(station);

    const shedLabel = this.add.text(startX + 17, startY + 34, 'SHED', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '9px',
      color: '#fff4d6',
      backgroundColor: '#70452f',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0);
    const homeLabel = this.add.text(goalX + 16, goalY + 34, 'HOME', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '9px',
      color: '#20352f',
      backgroundColor: '#f6e8c8',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0);
    labels.add([shedLabel, homeLabel]);
    this.boardLayer.add(labels);
  }

  private createTrain(): void {
    this.train = this.add.container(0, 0);
    const graphics = this.add.graphics();
    graphics.fillStyle(0x102a26, 0.35);
    graphics.fillEllipse(0, 17, 58, 15);
    graphics.fillStyle(0x272f32);
    graphics.fillCircle(-18, 15, 9);
    graphics.fillCircle(17, 15, 9);
    graphics.fillStyle(COLORS.brassLight);
    graphics.fillCircle(-18, 15, 4);
    graphics.fillCircle(17, 15, 4);
    graphics.fillStyle(COLORS.red);
    graphics.fillRoundedRect(-25, -8, 48, 24, 7);
    graphics.fillStyle(0x993c34);
    graphics.fillRect(-20, -18, 19, 16);
    graphics.fillStyle(0xcce3dd);
    graphics.fillRect(-16, -14, 10, 8);
    graphics.fillStyle(COLORS.brass);
    graphics.fillCircle(20, 0, 10);
    graphics.fillStyle(0x252d2c);
    graphics.fillRect(9, -19, 7, 14);
    graphics.fillRect(6, -20, 13, 5);
    graphics.fillStyle(COLORS.brassLight);
    graphics.fillRect(-29, 4, 6, 8);
    this.train.add(graphics);
    this.train.setScale(this.layout.boardScale);
    this.train.setDepth(50);
    this.setTrainAt(this.level.start, this.level.direction);
  }

  private renderControls(): void {
    this.controlsLayer.removeAll(true);
    this.levelNameText?.setText(`PUZZLE ${this.levelIndex + 1} / ${LEVELS.length}  •  ${this.level.name.toUpperCase()}`);

    this.createToolButton('straight', 16, 115, 119, 'STRAIGHT', this.inventory.straight);
    this.createToolButton('curve', 145, 115, 119, 'CURVE', this.inventory.curve);
    this.createToolButton('erase', 16, 197, 119, 'REMOVE', null);

    const undo = this.createButton(145, 197, 119, 72, '↶ UNDO', () => this.undo(), {
      fill: 0xf1ddba,
      text: '#3f352a',
      border: 0xc89b62,
      small: true,
      fontSize: 14,
      disabled: this.history.length === 0,
    });
    this.controlsLayer.add(undo);

    this.runButton = this.createButton(16, 277, 248, 70, this.completed ? (this.levelIndex === LEVELS.length - 1 ? 'START OVER' : 'NEXT PUZZLE') : 'RUN TRAIN', () => {
      if (this.completed) this.selectLevel(this.levelIndex === LEVELS.length - 1 ? 0 : this.levelIndex + 1);
      else void this.runTrain();
    }, {
      fill: 0xc85445,
      text: '#fff4d6',
      border: 0xf5d274,
      fontSize: 20,
      labelOffsetX: -10,
      disabled: this.isRunning,
    });
    this.controlsLayer.add(this.runButton);

    const lever = this.add.graphics();
    lever.fillStyle(0x243431);
    lever.fillRoundedRect(238, 292, 10, 36, 4);
    lever.fillStyle(COLORS.brassLight);
    lever.fillCircle(243, 292, 9);
    this.controlsLayer.add(lever);

    const fullscreen = this.createButton(16, 353, 248, 52, this.scale.isFullscreen ? 'EXIT FULL SCREEN' : 'FULL SCREEN', () => {
      this.scale.toggleFullscreen({ navigationUI: 'hide' });
    }, {
      fill: 0x36594d,
      text: '#fff4d6',
      border: 0xe5b74f,
      fontSize: 16,
    });
    this.controlsLayer.add(fullscreen);

    const previous = this.createButton(16, 414, 60, 48, '‹', () => this.selectLevel(this.levelIndex - 1), {
      fill: 0x36594d,
      text: '#fff4d6',
      border: 0xe5b74f,
      fontSize: 25,
      disabled: this.levelIndex === 0,
    });
    const next = this.createButton(204, 414, 60, 48, '›', () => this.selectLevel(this.levelIndex + 1), {
      fill: 0x36594d,
      text: '#fff4d6',
      border: 0xe5b74f,
      fontSize: 25,
      disabled: this.levelIndex === LEVELS.length - 1,
    });
    const levelCount = this.add.text(140, 438, `${this.levelIndex + 1} / ${LEVELS.length}`, {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '16px',
      color: '#fff4d6',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.controlsLayer.add([previous, next, levelCount]);
  }

  private createToolButton(tool: Tool, x: number, y: number, width: number, label: string, count: number | null): void {
    const selected = this.selectedTool === tool;
    const disabled = tool !== 'erase' && count === 0;
    const button = this.createButton(x, y, width, 72, label, () => {
      if (!disabled && !this.isRunning) {
        this.selectedTool = tool;
        this.play('place', 0.35);
        this.renderControls();
      }
    }, {
      fill: selected ? 0xf5d274 : 0xf6e8c8,
      text: '#3f352a',
      border: selected ? 0xfff4d6 : 0xc89b62,
      small: true,
      fontSize: 13,
      labelOffsetX: 14,
      disabled,
    });

    const icon = this.add.graphics();
    if (tool === 'straight') {
      icon.lineStyle(3, COLORS.rail, 1);
      icon.lineBetween(x + 12, y + 23, x + 42, y + 23);
      icon.lineBetween(x + 12, y + 34, x + 42, y + 34);
      icon.lineStyle(3, COLORS.wood, 1);
      for (let px = x + 16; px < x + 43; px += 9) icon.lineBetween(px, y + 18, px, y + 39);
    } else if (tool === 'curve') {
      icon.lineStyle(7, COLORS.wood, 1);
      icon.beginPath();
      icon.arc(x + 41, y + 19, 24, Math.PI / 2, Math.PI, false);
      icon.strokePath();
      icon.lineStyle(3, COLORS.rail, 1);
      icon.beginPath();
      icon.arc(x + 41, y + 19, 17, Math.PI / 2, Math.PI, false);
      icon.strokePath();
      icon.beginPath();
      icon.arc(x + 41, y + 19, 30, Math.PI / 2, Math.PI, false);
      icon.strokePath();
    } else {
      icon.lineStyle(5, COLORS.red, 1);
      icon.lineBetween(x + 15, y + 20, x + 39, y + 44);
      icon.lineBetween(x + 39, y + 20, x + 15, y + 44);
    }
    this.controlsLayer.add([button, icon]);

    if (count !== null) {
      const counter = this.add.text(x + width - 13, y + 13, String(count), {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: '15px',
        color: '#fff4d6',
        fontStyle: 'bold',
        backgroundColor: '#36594d',
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 0.5);
      this.controlsLayer.add(counter);
    }
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    callback: () => void,
    style: {
      fill: number;
      text: string;
      border: number;
      small?: boolean;
      disabled?: boolean;
      fontSize?: number;
      labelOffsetX?: number;
    },
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x + width / 2, y + height / 2);
    const background = this.add.graphics();
    const fill = style.disabled === true ? 0x8a806f : style.fill;
    background.fillStyle(0x2c2119, 0.35);
    background.fillRoundedRect(-width / 2, -height / 2 + 5, width, height, 12);
    background.fillStyle(fill, 1);
    background.fillRoundedRect(-width / 2, -height / 2, width, height - 5, 12);
    background.lineStyle(3, style.border, style.disabled === true ? 0.35 : 1);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height - 5, 12);

    const text = this.add.text(style.labelOffsetX ?? 0, -3, label, {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: `${style.fontSize ?? (style.small === true ? 15 : 21)}px`,
      fontStyle: 'bold',
      color: style.disabled === true ? '#ddd2bd' : style.text,
      align: 'center',
    }).setOrigin(0.5);

    button.add([background, text]);
    button.setSize(width, height);
    if (style.disabled !== true) {
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        button.setScale(0.97);
        callback();
      });
      button.on('pointerup', () => button.setScale(1));
      button.on('pointerout', () => button.setScale(1));
      button.on('pointerover', () => background.setAlpha(1.08));
      button.on('pointerout', () => background.setAlpha(1));
    }
    return button;
  }

  private handleCellTap(point: Point): void {
    if (this.isRunning) return;
    if (this.level.scenery[cellKey(point)] !== undefined) {
      this.setStatus('Scenery stays put—build around it.');
      this.bumpAt(point);
      return;
    }

    const piece = this.board[point.y]?.[point.x] ?? null;
    if (piece?.fixed === true) {
      this.setStatus(point.x === this.level.start.x ? 'The engine shed track is fixed.' : 'Pinecone Station is ready for you!');
      return;
    }

    if (this.selectedTool === 'erase') {
      this.removePiece(point);
      return;
    }

    if (piece !== null) {
      this.saveSnapshot();
      this.board[point.y]![point.x] = rotate(piece);
      this.play('place', 0.45);
      this.afterBoardChange();
      return;
    }

    if (this.inventory[this.selectedTool] <= 0) {
      this.setStatus(`No ${this.selectedTool} pieces left. Remove one or undo.`);
      return;
    }

    this.saveSnapshot();
    this.board[point.y]![point.x] = {
      kind: this.selectedTool,
      rotation: this.selectedTool === 'straight' ? 1 : 0,
    };
    this.inventory[this.selectedTool] -= 1;
    this.play('place', 0.5);
    this.afterBoardChange();
  }

  private removePiece(point: Point): void {
    if (this.isRunning || this.level.scenery[cellKey(point)] !== undefined) return;
    const piece = this.board[point.y]?.[point.x] ?? null;
    if (piece === null || piece.fixed === true) return;

    this.saveSnapshot();
    this.board[point.y]![point.x] = null;
    this.inventory[piece.kind] += 1;
    this.play('place', 0.35);
    this.afterBoardChange();
  }

  private saveSnapshot(): void {
    this.history.push({
      board: cloneBoard(this.board),
      inventory: { ...this.inventory },
    });
    if (this.history.length > 30) this.history.shift();
  }

  private undo(): void {
    if (this.isRunning) return;
    const snapshot = this.history.pop();
    if (snapshot === undefined) return;
    this.board = cloneBoard(snapshot.board);
    this.inventory = { ...snapshot.inventory };
    this.play('place', 0.35);
    this.afterBoardChange();
  }

  private reset(): void {
    if (this.isRunning) return;
    this.saveSnapshot();
    this.completed = false;
    this.board = createBoard(this.level);
    this.inventory = { ...this.level.inventory };
    this.afterBoardChange();
  }

  private selectLevel(index: number): void {
    if (this.isRunning) return;
    const safeIndex = Math.min(LEVELS.length - 1, Math.max(0, Math.trunc(index)));
    this.levelIndex = safeIndex;
    this.level = getLevel(safeIndex);
    this.completed = false;
    this.history = [];
    this.board = createBoard(this.level);
    this.inventory = { ...this.level.inventory };
    this.selectedTool = 'straight';
    this.afterBoardChange();
    this.setStatus(`Puzzle ${safeIndex + 1}: ${this.level.name}. Build the route.`);
  }

  private afterBoardChange(): void {
    this.completed = false;
    this.renderBoard();
    this.renderControls();
    this.setTrainAt(this.level.start, this.level.direction);
    this.updateRouteMessage();
  }

  private updateRouteMessage(): void {
    const route = traceRoute(this.board, this.level.start, this.level.goal, this.level.direction);
    if (route.success) {
      this.setStatus('The line is ready! Pull the throttle.');
      if (!this.reducedMotion) {
        this.tweens.add({ targets: this.runButton, scale: 1.025, duration: 460, yoyo: true, repeat: 1 });
      }
      return;
    }

    const piecesLeft = this.inventory.straight + this.inventory.curve;
    if (piecesLeft === 0) this.setStatus('Almost there—tap placed track to rotate it, or undo.');
    else this.setStatus(`${piecesLeft} track ${piecesLeft === 1 ? 'piece' : 'pieces'} left in the drawer.`);
  }

  private async runTrain(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.renderControls();
    this.setTrainAt(this.level.start, this.level.direction);
    const route = traceRoute(this.board, this.level.start, this.level.goal, this.level.direction);

    this.setStatus(route.success ? 'All aboard for Pinecone Station!' : 'Let’s test this line…');
    this.play('whistle', 0.55);
    await this.wait(this.reducedMotion ? 80 : 420);

    for (let index = 1; index < route.path.length; index += 1) {
      const previous = route.path[index - 1];
      const next = route.path[index];
      if (previous === undefined || next === undefined) continue;
      this.train.setAngle(this.angleFor(previous.direction));
      await this.tweenTrainTo(next, this.reducedMotion ? 80 : 420);
      this.play('clack', 0.32);
      this.makeSteam();
    }

    if (route.success) {
      this.train.setAngle(this.angleFor(route.path.at(-1)?.direction ?? 1));
      this.setStatus('Perfect run! Pinecone Station is open!');
      this.play('success', 0.65);
      this.celebrate();
      await this.wait(this.reducedMotion ? 120 : 900);
    } else {
      this.play('bump', 0.5);
      this.shakeTrain();
      this.setStatus(this.failureMessage(route.failure?.reason));
      await this.wait(this.reducedMotion ? 80 : 420);
    }

    this.isRunning = false;
    if (route.success) this.completed = true;
    if (this.resizePending) {
      this.scene.restart();
      return;
    }
    this.renderControls();
  }

  private failureMessage(reason: RouteFailure | undefined): string {
    if (reason === 'wrong-connection') return 'Clunk! One piece faces the wrong way. Tap it to rotate.';
    if (reason === 'left-board') return 'Whoops—the rails lead off the table. Turn them toward the station.';
    if (reason === 'loop') return 'Round and round! Open the loop toward the station.';
    return 'The rails stop here. Add a piece where the train needs to go.';
  }

  private tweenTrainTo(point: Point, duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.train,
        x: this.cellCenter(point).x,
        y: this.cellCenter(point).y,
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => resolve(),
      });
    });
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(duration, resolve));
  }

  private setTrainAt(point: Point, direction: Direction): void {
    if (this.train === undefined) return;
    const center = this.cellCenter(point);
    this.train.setPosition(center.x, center.y);
    this.train.setAngle(this.angleFor(direction));
  }

  private cellCenter(point: Point): Point {
    return {
      x: this.layout.boardX + (point.x + 0.5) * this.layout.cellSize,
      y: this.layout.boardY + (point.y + 0.5) * this.layout.cellSize,
    };
  }

  private angleFor(direction: Direction): number {
    return direction === 0 ? -90 : direction === 1 ? 0 : direction === 2 ? 90 : 180;
  }

  private makeSteam(): void {
    if (this.reducedMotion) return;
    const scale = this.layout.boardScale;
    const puff = this.add.circle(this.train.x + 11 * scale, this.train.y - 22 * scale, 7 * scale, 0xfff4d6, 0.75).setDepth(49);
    this.tweens.add({
      targets: puff,
      x: puff.x - 10,
      y: puff.y - 25,
      alpha: 0,
      scale: 1.8,
      duration: 650,
      onComplete: () => puff.destroy(),
    });
  }

  private celebrate(): void {
    const colors = [COLORS.brassLight, COLORS.red, COLORS.blue, 0x88bd67, 0xfff4d6];
    for (let index = 0; index < 28; index += 1) {
      const x = this.layout.boardX + 24 + ((index * 71) % Math.max(120, this.layout.boardWidth - 48));
      const piece = this.add.rectangle(x, this.layout.panelY + 8, 8, 14, colors[index % colors.length]).setDepth(80);
      piece.setAngle(index * 37);
      if (this.reducedMotion) {
        piece.setY(this.layout.panelY + 18 + (index % 4) * 10);
        this.time.delayedCall(450, () => piece.destroy());
      } else {
        this.tweens.add({
          targets: piece,
          x: x + ((index % 5) - 2) * 24,
          y: this.layout.boardY + this.layout.cellSize * (1.4 + (index % 7) * 0.48),
          angle: piece.angle + 240,
          alpha: 0,
          duration: 900 + (index % 5) * 90,
          ease: 'Quad.easeIn',
          onComplete: () => piece.destroy(),
        });
      }
    }
    if (!this.reducedMotion) {
      this.tweens.add({ targets: this.train, scale: 1.12, duration: 160, yoyo: true, repeat: 2 });
    }
  }

  private shakeTrain(): void {
    if (this.reducedMotion) return;
    const x = this.train.x;
    this.tweens.add({
      targets: this.train,
      x: x + 6,
      duration: 55,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.train.setX(x),
    });
  }

  private bumpAt(point: Point): void {
    const center = this.cellCenter(point);
    const ring = this.add.circle(center.x, center.y, 18 * this.layout.boardScale, 0xffffff, 0)
      .setStrokeStyle(3 * this.layout.boardScale, COLORS.cream, 0.8);
    this.tweens.add({
      targets: ring,
      scale: 1.8,
      alpha: 0,
      duration: this.reducedMotion ? 100 : 300,
      onComplete: () => ring.destroy(),
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (gameSize.width === this.layout.width && gameSize.height === this.layout.height) return;
    if (this.isRunning) {
      this.resizePending = true;
      return;
    }
    this.scene.restart();
  }

  private handleFullscreenFailure(): void {
    this.setStatus('Fullscreen is unavailable here. Try the browser menu instead.');
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
  }

  private play(key: string, volume: number): void {
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  private installKeyboardControls(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null) return;

    keyboard.on('keydown-ONE', () => this.chooseTool('straight'));
    keyboard.on('keydown-TWO', () => this.chooseTool('curve'));
    keyboard.on('keydown-E', () => this.chooseTool('erase'));
    keyboard.on('keydown-R', () => this.reset());
    keyboard.on('keydown-SPACE', (event: KeyboardEvent) => {
      event.preventDefault();
      void this.runTrain();
    });
    keyboard.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        this.undo();
      }
    });
  }

  private chooseTool(tool: Tool): void {
    if (this.isRunning) return;
    if (tool !== 'erase' && this.inventory[tool] === 0) return;
    this.selectedTool = tool;
    this.renderControls();
  }
}
