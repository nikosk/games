import Phaser from 'phaser';
import bumpUrl from '../../assets/audio/bump.wav?url';
import clackUrl from '../../assets/audio/clack.wav?url';
import placeUrl from '../../assets/audio/place.wav?url';
import successUrl from '../../assets/audio/success.wav?url';
import whistleUrl from '../../assets/audio/whistle.wav?url';
import {
  BLOCKED_CELLS,
  COLS,
  GOAL,
  ROWS,
  START,
  STARTING_INVENTORY,
  cellKey,
  createBoard,
} from '../game/level';
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

const WIDTH = 960;
const HEIGHT = 640;
const BOARD_X = 52;
const BOARD_Y = 132;
const CELL_SIZE = 78;
const PANEL_X = 552;
const PANEL_Y = 116;
const PANEL_WIDTH = 354;
const PANEL_HEIGHT = 430;

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
  private board: BoardCell[][] = createBoard();
  private inventory: Record<TrackKind, number> = { ...STARTING_INVENTORY };
  private history: Snapshot[] = [];
  private selectedTool: Tool = 'straight';
  private isRunning = false;
  private reducedMotion = false;

  private boardLayer!: Phaser.GameObjects.Container;
  private controlsLayer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private helperText!: Phaser.GameObjects.Text;
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
    this.input.mouse?.disableContextMenu();
    this.drawWorkshop();

    this.boardLayer = this.add.container(BOARD_X, BOARD_Y);
    this.controlsLayer = this.add.container(0, 0);

    this.statusText = this.add.text(52, 575, 'Choose a track piece, then tap the grass to place it.', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '22px',
      color: '#fff4d6',
      fontStyle: 'bold',
    });
    this.statusText.setOrigin(0, 0.5);

    this.helperText = this.add.text(906, 576, '1 / 2 • E erase • Space run • Ctrl+Z undo', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '13px',
      color: '#bcd5c9',
      align: 'right',
    });
    this.helperText.setOrigin(1, 0.5);

    this.renderBoard();
    this.createTrain();
    this.renderControls();
    this.installKeyboardControls();
    this.updateRouteMessage();

    const canvas = this.game.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Railway Workshop puzzle board');
    canvas.addEventListener('pointerdown', () => canvas.focus(), { once: true });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
      this.tweens.killAll();
      this.sound.stopAll();
    });
  }

  private drawWorkshop(): void {
    this.cameras.main.setBackgroundColor(COLORS.deepGreen);
    const background = this.add.graphics();
    background.fillStyle(0x1c4a41);
    background.fillRect(0, 0, WIDTH, HEIGHT);

    background.fillStyle(0xffffff, 0.025);
    for (let x = 12; x < WIDTH; x += 24) background.fillRect(x, 0, 2, HEIGHT);

    background.fillStyle(0x102f2a, 0.65);
    background.fillRoundedRect(28, 18, 904, 78, 20);
    background.lineStyle(2, COLORS.brass, 0.45);
    background.strokeRoundedRect(28, 18, 904, 78, 20);

    this.add.text(54, 28, 'RAILWAY', {
      fontFamily: 'Georgia, serif',
      fontSize: '34px',
      color: '#f5d274',
      fontStyle: 'bold',
      letterSpacing: 3,
    });
    this.add.text(54, 62, 'WORKSHOP', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '19px',
      color: '#fff4d6',
      fontStyle: 'bold',
      letterSpacing: 7,
    });
    this.add.text(360, 51, 'Build a safe line from the engine shed to Pinecone Station.', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '17px',
      color: '#d6e6dc',
      wordWrap: { width: 520 },
    });

    background.fillStyle(0x4f311f, 0.55);
    background.fillRoundedRect(BOARD_X - 17, BOARD_Y - 17, COLS * CELL_SIZE + 34, ROWS * CELL_SIZE + 34, 18);
    background.fillStyle(COLORS.wood);
    background.fillRoundedRect(BOARD_X - 12, BOARD_Y - 12, COLS * CELL_SIZE + 24, ROWS * CELL_SIZE + 24, 15);
    background.lineStyle(4, COLORS.woodLight, 0.9);
    background.strokeRoundedRect(BOARD_X - 12, BOARD_Y - 12, COLS * CELL_SIZE + 24, ROWS * CELL_SIZE + 24, 15);

    background.fillStyle(0x102f2a, 0.5);
    background.fillRoundedRect(PANEL_X - 8, PANEL_Y - 8, PANEL_WIDTH + 16, PANEL_HEIGHT + 16, 20);
    background.fillStyle(0x6f452d);
    background.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 16);
    background.lineStyle(3, COLORS.woodLight, 1);
    background.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 16);
  }

  private renderBoard(): void {
    this.boardLayer.removeAll(true);
    const route = traceRoute(this.board, START, GOAL, 1);
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
        const scenery = BLOCKED_CELLS.get(cellKey(point));
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
    const startX = START.x * CELL_SIZE + 8;
    const startY = START.y * CELL_SIZE + 7;
    depot.fillStyle(0x5f3824, 0.95);
    depot.fillRoundedRect(startX, startY, 35, 28, 4);
    depot.fillStyle(COLORS.red);
    depot.fillTriangle(startX - 4, startY + 4, startX + 18, startY - 9, startX + 41, startY + 4);
    depot.fillStyle(0x1f2d29);
    depot.fillRect(startX + 13, startY + 12, 13, 16);
    labels.add(depot);

    const station = this.add.graphics();
    const goalX = GOAL.x * CELL_SIZE + 38;
    const goalY = GOAL.y * CELL_SIZE + 8;
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
    this.train.setDepth(50);
    this.setTrainAt(START, 1);
  }

  private renderControls(): void {
    this.controlsLayer.removeAll(true);

    const heading = this.add.text(PANEL_X + 24, PANEL_Y + 18, 'TRACK DRAWER', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#fff4d6',
      fontStyle: 'bold',
    });
    this.controlsLayer.add(heading);

    const note = this.add.text(PANEL_X + 25, PANEL_Y + 48, 'Tap a placed piece to rotate it.', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '14px',
      color: '#ead7b4',
    });
    this.controlsLayer.add(note);

    this.createToolButton('straight', PANEL_X + 24, PANEL_Y + 78, 'STRAIGHT', this.inventory.straight);
    this.createToolButton('curve', PANEL_X + 184, PANEL_Y + 78, 'CURVE', this.inventory.curve);
    this.createToolButton('erase', PANEL_X + 24, PANEL_Y + 180, 'REMOVE', null);

    const undo = this.createButton(PANEL_X + 184, PANEL_Y + 180, 145, 78, '↶  UNDO', () => this.undo(), {
      fill: 0xf1ddba,
      text: '#3f352a',
      border: 0xc89b62,
      small: true,
      disabled: this.history.length === 0,
    });
    this.controlsLayer.add(undo);

    const divider = this.add.graphics();
    divider.lineStyle(2, 0xe5b74f, 0.45);
    divider.lineBetween(PANEL_X + 24, PANEL_Y + 278, PANEL_X + PANEL_WIDTH - 24, PANEL_Y + 278);
    this.controlsLayer.add(divider);

    this.runButton = this.createButton(PANEL_X + 24, PANEL_Y + 302, PANEL_WIDTH - 48, 92, 'PULL THROTTLE', () => {
      void this.runTrain();
    }, {
      fill: 0xc85445,
      text: '#fff4d6',
      border: 0xf5d274,
      disabled: this.isRunning,
    });
    this.controlsLayer.add(this.runButton);

    const lever = this.add.graphics();
    lever.fillStyle(0x243431);
    lever.fillRoundedRect(PANEL_X + PANEL_WIDTH - 64, PANEL_Y + 318, 16, 55, 6);
    lever.fillStyle(COLORS.brassLight);
    lever.fillCircle(PANEL_X + PANEL_WIDTH - 56, PANEL_Y + 321, 13);
    this.controlsLayer.add(lever);
  }

  private createToolButton(tool: Tool, x: number, y: number, label: string, count: number | null): void {
    const selected = this.selectedTool === tool;
    const disabled = tool !== 'erase' && count === 0;
    const button = this.createButton(x, y, 145, 78, label, () => {
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
      disabled,
    });

    const icon = this.add.graphics();
    if (tool === 'straight') {
      icon.lineStyle(4, COLORS.rail, 1);
      icon.lineBetween(x + 19, y + 18, x + 53, y + 18);
      icon.lineBetween(x + 19, y + 30, x + 53, y + 30);
      icon.lineStyle(4, COLORS.wood, 1);
      for (let px = x + 23; px < x + 53; px += 10) icon.lineBetween(px, y + 13, px, y + 35);
    } else if (tool === 'curve') {
      icon.lineStyle(8, COLORS.wood, 1);
      icon.beginPath();
      icon.arc(x + 49, y + 14, 28, Math.PI / 2, Math.PI, false);
      icon.strokePath();
      icon.lineStyle(4, COLORS.rail, 1);
      icon.beginPath();
      icon.arc(x + 49, y + 14, 20, Math.PI / 2, Math.PI, false);
      icon.strokePath();
      icon.beginPath();
      icon.arc(x + 49, y + 14, 34, Math.PI / 2, Math.PI, false);
      icon.strokePath();
    } else {
      icon.lineStyle(5, COLORS.red, 1);
      icon.lineBetween(x + 22, y + 16, x + 48, y + 42);
      icon.lineBetween(x + 48, y + 16, x + 22, y + 42);
    }
    this.controlsLayer.add([button, icon]);

    if (count !== null) {
      const counter = this.add.text(x + 122, y + 14, String(count), {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: '18px',
        color: '#fff4d6',
        fontStyle: 'bold',
        backgroundColor: '#36594d',
        padding: { x: 7, y: 3 },
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
    style: { fill: number; text: string; border: number; small?: boolean; disabled?: boolean },
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

    const text = this.add.text(style.small === true ? 13 : -16, -3, label, {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: style.small === true ? '15px' : '21px',
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
    if (BLOCKED_CELLS.has(cellKey(point))) {
      this.setStatus('Scenery stays put—build around it.');
      this.bumpAt(point);
      return;
    }

    const piece = this.board[point.y]?.[point.x] ?? null;
    if (piece?.fixed === true) {
      this.setStatus(point.x === START.x ? 'The engine shed track is fixed.' : 'Pinecone Station is ready for you!');
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
    if (this.isRunning || BLOCKED_CELLS.has(cellKey(point))) return;
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
    this.board = createBoard();
    this.inventory = { ...STARTING_INVENTORY };
    this.afterBoardChange();
  }

  private afterBoardChange(): void {
    this.renderBoard();
    this.renderControls();
    this.setTrainAt(START, 1);
    this.updateRouteMessage();
  }

  private updateRouteMessage(): void {
    const route = traceRoute(this.board, START, GOAL, 1);
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
    this.setTrainAt(START, 1);
    const route = traceRoute(this.board, START, GOAL, 1);

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
      x: BOARD_X + point.x * CELL_SIZE + CELL_SIZE / 2,
      y: BOARD_Y + point.y * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  private angleFor(direction: Direction): number {
    return direction === 0 ? -90 : direction === 1 ? 0 : direction === 2 ? 90 : 180;
  }

  private makeSteam(): void {
    if (this.reducedMotion) return;
    const puff = this.add.circle(this.train.x + 11, this.train.y - 22, 7, 0xfff4d6, 0.75).setDepth(49);
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
      const x = PANEL_X + 35 + (index * 47) % 285;
      const piece = this.add.rectangle(x, 92, 8, 14, colors[index % colors.length]).setDepth(80);
      piece.setAngle(index * 37);
      if (this.reducedMotion) {
        piece.setY(105 + (index % 4) * 10);
        this.time.delayedCall(450, () => piece.destroy());
      } else {
        this.tweens.add({
          targets: piece,
          x: x + ((index % 5) - 2) * 24,
          y: 210 + (index % 7) * 43,
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
    const ring = this.add.circle(center.x, center.y, 18, 0xffffff, 0).setStrokeStyle(3, COLORS.cream, 0.8);
    this.tweens.add({
      targets: ring,
      scale: 1.8,
      alpha: 0,
      duration: this.reducedMotion ? 100 : 300,
      onComplete: () => ring.destroy(),
    });
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
