import Phaser from 'phaser';
import sparkyTextureUrl from '../../assets/images/sparky-topdown.webp';
import gearBinTextureUrl from '../../assets/images/gear-bin.webp';
import batteryPackTextureUrl from '../../assets/images/battery-pack.webp';
import circuitCrateTextureUrl from '../../assets/images/circuit-crate.webp';
import workbenchTextureUrl from '../../assets/images/factory-workbench.webp';
import receivingDockTextureUrl from '../../assets/images/receiving-dock.webp';
import { COLS, ROWS, FIRST_LEVEL, LEVELS, initialState, type SparkyLevel } from '../game/level';
import {
  createLayout,
  computeControls,
  beltSlotRect,
  DESIGN_CELL_SIZE,
  type AssemblyLayout,
  type ControlLayout,
  type ControlRect,
} from '../game/layout';
import { angleFor, DIRECTION_VECTORS, type Direction } from '../game/direction';
import {
  executeStep,
  isDelivered,
  isSolved,
  type CargoType,
  type Command,
  type Delivery,
  type FloorState,
  type Robot,
  type StepResult,
} from '../game/rules';
import { findRandomLevel } from '../game/random';
import { payloadMeta } from '../game/payloads';
import { COMMANDS, commandMeta } from '../game/commands';
import { appendCommand as appendToBelt, clearBelt, removeCommandAt, removeLastCommand } from '../game/belt';
import { Sfx } from '../game/sfx';

const CELL = DESIGN_CELL_SIZE;
const SPARKY_TEXTURE = 'sparky-topdown';
const GEAR_BIN_TEXTURE = 'gear-bin';
const BATTERY_TEXTURE = 'battery-pack';
const CIRCUIT_TEXTURE = 'circuit-crate';
const WORKBENCH_TEXTURE = 'factory-workbench';
const RECEIVING_DOCK_TEXTURE = 'receiving-dock';

/**
 * Source-rect crop for each cargo texture so every prop fills the same
 * visual footprint on the board. Bounds match the opaque alpha extent of
 * each generated sprite (gear-bin 325x290+24+53, battery 314x295+33+54,
 * circuit 303x290+40+53).
 */
const CARGO_CROPS: Readonly<Record<CargoType, { x: number; y: number; width: number; height: number }>> = {
  gear: { x: 24, y: 53, width: 325, height: 290 },
  battery: { x: 33, y: 54, width: 314, height: 295 },
  circuit: { x: 40, y: 53, width: 303, height: 290 },
};

/** First base seed searched when Random Shifts start after level 10. */
const RANDOM_FIRST_SEED = 1000;

// The approved source art's visible nose points south, so rotate it to match
// the logical direction (0 = north, 1 = east) everywhere it is oriented.
const SPARKY_ART_ANGLE_OFFSET = 180;
const sparkyAngleFor = (direction: Direction): number => angleFor(direction) + SPARKY_ART_ANGLE_OFFSET;

/** Sunny snap-together factory palette. */
const COLORS = {
  workbench: 0xf6ead2,
  workbenchEdge: 0xe6cf9a,
  workbenchTint: 0xeaf0ef,
  panel: 0xfff7e6,
  panelEdge: 0xe6c97a,
  panelFastener: 0xffd166,
  floorA: 0x718394,
  floorB: 0x687a8b,
  floorEdge: 0x263746,
  floorGutter: 0x172633,
  floorBand: 0x91a3b2,
  floorHighlight: 0xc2d0da,
  floorRivet: 0x344b5e,
  belt: 0x2a3a6b,
  beltEdge: 0xf5c542,
  beltSlot: 0x3a4a7b,
  beltSlotEdge: 0x5a6a9b,
  ink: 0x22365a,
  inkSoft: 0x4a5a7a,
  brass: 0xffd166,
  green: 0x6bbf67,
  greenAccent: 0x4f9e4f,
  blue: 0x5aa9e6,
  yellow: 0xf5c542,
  yellowAccent: 0xd9a52e,
  red: 0xe8717a,
  redDark: 0xb5516a,
  robotBody: 0x9fd8f0,
  robotBodyDark: 0x5aa9e6,
  crate: 0xe8717a,
  crateDark: 0xb5516a,
  goal: 0xf5c542,
  highlight: 0xfff4d6,
} as const;

const STEP_MS = 460;
const TURN_MS = 320;

type Phase = 'idle' | 'running' | 'done';

export class AssemblyScene extends Phaser.Scene {
  private level: SparkyLevel = FIRST_LEVEL;
  private layout!: AssemblyLayout;
  private controls!: ControlLayout;
  private readonly sfx = new Sfx();

  private belt: Command[] = [];
  private stepIndex = 0;
  private liveState!: FloorState;
  private phase: Phase = 'idle';
  private solved = false;
  private reducedMotion = false;
  private resizePending = false;
  private soundOn = true;

  private boardLayer!: Phaser.GameObjects.Container;
  private beltLayer!: Phaser.GameObjects.Container;
  private controlsLayer!: Phaser.GameObjects.Container;
  private robot!: Phaser.GameObjects.Container;
  /** One visual container per cargo id; the held cargo is tweened, the rest stay put. */
  private cargoItems = new Map<string, Phaser.GameObjects.Container>();
  private cargoChips: Phaser.GameObjects.Container[] = [];
  private glow!: Phaser.GameObjects.Graphics;
  private nextMarker!: Phaser.GameObjects.Graphics;
  private objectiveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private beltSlots: Phaser.GameObjects.Container[] = [];
  private soundIcon!: Phaser.GameObjects.Graphics;
  private fullscreenIcon!: Phaser.GameObjects.Graphics;
  private soundIconSize = 21;
  private fullscreenIconSize = 21;
  private controlTooltip!: Phaser.GameObjects.Container;
  private controlTooltipBg!: Phaser.GameObjects.Graphics;
  private controlTooltipText!: Phaser.GameObjects.Text;
  private currentLevelIndex = 0;
  private inRandomMode = false;
  private randomLevelSeed: number | null = null;
  private randomBaseSeed = RANDOM_FIRST_SEED;
  /** Status message to apply after the next scene restart (level transition). */
  private pendingStatus: string | null = null;
  private playIcon!: Phaser.GameObjects.Graphics;
  private playIconSize = 38;
  private playIconY = 0;

  private keyboardBindings: Array<{ event: string; cb: (...args: unknown[]) => void }> = [];

  constructor() {
    super('AssemblyScene');
  }

  preload(): void {
    this.load.image(SPARKY_TEXTURE, sparkyTextureUrl);
    this.load.image(GEAR_BIN_TEXTURE, gearBinTextureUrl);
    this.load.image(BATTERY_TEXTURE, batteryPackTextureUrl);
    this.load.image(CIRCUIT_TEXTURE, circuitCrateTextureUrl);
    this.load.image(WORKBENCH_TEXTURE, workbenchTextureUrl);
    this.load.image(RECEIVING_DOCK_TEXTURE, receivingDockTextureUrl);
  }

  create(): void {
    this.resizePending = false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.layout = createLayout(this.scale.width, this.scale.height, this.level.beltSlots);
    this.controls = computeControls(this.layout);
    this.input.mouse?.disableContextMenu();
    this.drawBackground();

    this.boardLayer = this.add
      .container(this.layout.boardX, this.layout.boardY)
      .setScale(this.layout.boardScale)
      .setDepth(10);
    this.beltLayer = this.add.container(0, 0).setDepth(20);
    this.controlsLayer = this.add.container(0, 0).setDepth(30);

    this.glow = this.add.graphics().setDepth(9);
    this.nextMarker = this.add.graphics().setDepth(21);

    this.loadLevel(this.level);

    this.installKeyboard();
    this.installScaleEvents();
    this.scale.on('fullscreenchange', this.handleFullscreenChange, this);

    const canvas = this.game.canvas;
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('aria-label', "Sparky's Assembly Line");

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.scale.off('fullscreenchange', this.handleFullscreenChange, this);
    this.scale.off('fullscreenunsupported', this.handleFullscreenUnsupported, this);
    const kb = this.input.keyboard;
    if (kb !== null) {
      for (const b of this.keyboardBindings) kb.off(b.event, b.cb as never, this);
    }
    this.keyboardBindings = [];
    this.tweens.killAll();
  }

  // ── background ──────────────────────────────────────────────
  private drawBackground(): void {
    const { width, height, panelX, panelY, panelWidth, panelHeight } = this.layout;
    this.cameras.main.setBackgroundColor(COLORS.workbench);

    // Cover the viewport without stretching the workbench illustration.
    const workbench = this.add.image(width / 2, height / 2, WORKBENCH_TEXTURE).setDepth(-2);
    workbench.setScale(Math.max(width / workbench.width, height / workbench.height));

    const bg = this.add.graphics().setDepth(-1);
    // A light wash keeps the detailed surface quiet behind controls and tiles.
    bg.fillStyle(COLORS.workbench, 0.52);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(COLORS.workbenchTint, 0.12);
    for (let y = 14; y < height; y += 26) {
      for (let x = 18; x < width; x += 26) {
        bg.fillCircle(x + ((y / 26) % 2) * 13, y, 1.6);
      }
    }

    // Cream molded-plastic panel board.
    bg.lineStyle(3, COLORS.panelEdge, 1);
    bg.strokeRoundedRect(panelX - 4, panelY - 4, panelWidth + 8, panelHeight + 8, 18);
    bg.fillStyle(0xe6cf9a, 0.4);
    bg.fillRoundedRect(panelX - 6, panelY - 6, panelWidth + 12, panelHeight + 12, 20);
    bg.fillStyle(COLORS.panel);
    bg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    // Colored corner fasteners.
    this.drawFastener(bg, panelX, panelY);
    this.drawFastener(bg, panelX + panelWidth, panelY);
    this.drawFastener(bg, panelX, panelY + panelHeight);
    this.drawFastener(bg, panelX + panelWidth, panelY + panelHeight);
  }

  private drawFastener(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xe6d4a8, 1);
    g.fillCircle(x, y, 5);
    g.fillStyle(COLORS.panelFastener, 1);
    g.fillCircle(x, y, 3);
  }

  // ── board ───────────────────────────────────────────────────
  private renderBoard(): void {
    this.boardLayer.removeAll(true);
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        this.drawFloorTile(x, y);
        if (this.isWall(x, y)) this.drawWall(x, y);
      }
    }
    for (const delivery of this.level.deliveries) this.drawDock(delivery);
  }

  private isWall(x: number, y: number): boolean {
    return this.level.walls.some((w) => w.x === x && w.y === y);
  }

  private drawFloorTile(x: number, y: number): void {
    const g = this.add.graphics();
    const left = x * CELL;
    const top = y * CELL;
    // Cool steel plate with a deep seam and a crisp upper bevel.
    g.fillStyle(COLORS.floorGutter, 1);
    g.fillRect(left + 1, top + 1, CELL - 2, CELL - 2);
    const base = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
    g.fillStyle(base, 1);
    g.fillRoundedRect(left + 5, top + 5, CELL - 10, CELL - 10, 3);
    g.lineStyle(2, COLORS.floorEdge, 1);
    g.strokeRoundedRect(left + 5, top + 5, CELL - 10, CELL - 10, 3);
    g.fillStyle(COLORS.floorHighlight, 0.65);
    g.fillRect(left + 8, top + 7, CELL - 16, 3);
    g.fillStyle(COLORS.floorEdge, 0.45);
    g.fillRect(left + 8, top + CELL - 10, CELL - 16, 3);
    // Alternating brushed-metal bands keep the plates readable at game scale.
    g.fillStyle(COLORS.floorBand, 0.22);
    for (let bandY = 19; bandY < CELL - 14; bandY += 10) {
      g.fillRect(left + 11, top + bandY, CELL - 22, 2);
    }
    // Four large, highlighted corner rivets.
    for (const [dx, dy] of [[13, 13], [CELL - 13, 13], [13, CELL - 13], [CELL - 13, CELL - 13]] as const) {
      g.fillStyle(COLORS.floorEdge, 0.9);
      g.fillCircle(left + dx, top + dy, 4);
      g.fillStyle(COLORS.floorRivet, 1);
      g.fillCircle(left + dx, top + dy, 2.8);
      g.fillStyle(COLORS.floorHighlight, 0.9);
      g.fillCircle(left + dx - 0.8, top + dy - 0.8, 1);
    }
    this.boardLayer.add(g);
  }

  private drawDock(delivery: Delivery): void {
    const meta = payloadMeta(delivery.type);
    const cx = delivery.dock.x * CELL + CELL / 2;
    const cy = delivery.dock.y * CELL + CELL / 2;
    const dock = this.add.image(cx, cy, RECEIVING_DOCK_TEXTURE).setDisplaySize(CELL - 10, CELL - 10);
    this.boardLayer.add(dock);

    // A thick ring in the required cargo colour makes the dock's type
    // readable even before a child can tell the painted art apart.
    const ring = this.add.graphics();
    ring.lineStyle(3, meta.color, 0.95);
    ring.strokeRoundedRect(cx - CELL / 2 + 7, cy - CELL / 2 + 7, CELL - 14, CELL - 14, 6);
    this.boardLayer.add(ring);

    const chipSize = CELL * 0.24;
    const chipX = cx + CELL * 0.16;
    const chipY = cy - CELL * 0.4;
    const chip = this.add.graphics();
    chip.fillStyle(meta.color, 1);
    chip.fillRoundedRect(chipX, chipY, chipSize, chipSize, 4);
    chip.lineStyle(2, 0xffffff, 0.8);
    chip.strokeRoundedRect(chipX, chipY, chipSize, chipSize, 4);
    this.boardLayer.add(chip);
    this.drawPayloadGlyph(
      this.boardLayer,
      delivery.type,
      chipX + chipSize / 2,
      chipY + chipSize / 2,
      chipSize * 0.62,
      0xffffff,
    );
  }

  /** Raised steel obstacle with a yellow/black caution band and rivets. */
  private drawWall(x: number, y: number): void {
    const left = x * CELL;
    const top = y * CELL;
    const g = this.add.graphics();
    g.fillStyle(0x2b3a4a, 1);
    g.fillRoundedRect(left + 3, top + 3, CELL - 6, CELL - 6, 7);
    g.fillStyle(0x42556b, 1);
    g.fillRoundedRect(left + 6, top + 6, CELL - 12, CELL - 12, 5);
    g.lineStyle(2, 0x1c2833, 1);
    g.strokeRoundedRect(left + 6, top + 6, CELL - 12, CELL - 12, 5);
    this.drawHazardBand(g, left + 10, top + CELL * 0.4, CELL - 20, CELL * 0.2);
    for (const [dx, dy] of [[16, 16], [CELL - 16, 16], [16, CELL - 16], [CELL - 16, CELL - 16]] as const) {
      g.fillStyle(0x1c2833, 1);
      g.fillCircle(left + dx, top + dy, 3.4);
      g.fillStyle(0x6d8296, 1);
      g.fillCircle(left + dx - 0.7, top + dy - 0.7, 1.6);
    }
    this.boardLayer.add(g);
  }

  private drawHazardBand(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0xf5c542, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(0x2b2b2b, 1);
    const step = 13;
    const clampX = (value: number): number => Phaser.Math.Clamp(value, x, x + w);
    for (let bx = x - h; bx < x + w; bx += step) {
      g.fillPoints([
        { x: clampX(bx), y: y + h },
        { x: clampX(bx + step * 0.5), y: y + h },
        { x: clampX(bx + step * 0.5 + h * 0.7), y },
        { x: clampX(bx + h * 0.7), y },
      ], true);
    }
  }

  /** Distinct white glyph for each cargo type: gear teeth, battery body, chip pins. */
  private drawPayloadGlyph(
    parent: Phaser.GameObjects.Container,
    type: 'gear' | 'battery' | 'circuit',
    cx: number,
    cy: number,
    s: number,
    color: number,
  ): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    if (type === 'gear') {
      g.fillCircle(cx, cy, s * 0.34);
      g.save();
      g.translateCanvas(cx, cy);
      for (let i = 0; i < 8; i += 1) {
        g.rotateCanvas(Math.PI / 4);
        g.fillRect(-s * 0.1, -s * 0.54, s * 0.2, s * 0.26);
      }
      g.restore();
      g.fillCircle(cx, cy, s * 0.17);
    } else if (type === 'battery') {
      g.fillRoundedRect(cx - s * 0.34, cy - s * 0.2, s * 0.68, s * 0.46, s * 0.08);
      g.fillRect(cx - s * 0.1, cy - s * 0.34, s * 0.2, s * 0.16);
      g.lineStyle(Math.max(2, s * 0.14), color, 1);
      g.lineBetween(cx - s * 0.24, cy - s * 0.07, cx - s * 0.08, cy - s * 0.07);
      g.lineBetween(cx - s * 0.16, cy - s * 0.15, cx - s * 0.16, cy + 0.01 * s);
      g.lineBetween(cx + s * 0.08, cy - s * 0.07, cx + s * 0.24, cy - s * 0.07);
    } else {
      g.fillRect(cx - s * 0.26, cy - s * 0.26, s * 0.52, s * 0.52);
      for (let i = 0; i < 3; i += 1) {
        const px = cx - s * 0.16 + i * s * 0.16;
        g.fillRect(px, cy - s * 0.4, s * 0.07, s * 0.16);
        g.fillRect(px, cy + s * 0.24, s * 0.07, s * 0.16);
      }
      g.fillCircle(cx + s * 0.08, cy - s * 0.08, s * 0.05);
      g.fillRect(cx - s * 0.18, cy + s * 0.04, s * 0.2, s * 0.07);
    }
    parent.add(g);
  }

  // ── actors ──────────────────────────────────────────────────
  private buildRobot(): void {
    this.robot = this.add.container(0, 0);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x22365a, 0.22);
    shadow.fillEllipse(0, 25, 62, 12);
    const texture = this.textures.get(SPARKY_TEXTURE);
    if (!texture.has('silhouette')) texture.add('silhouette', 0, 112, 57, 272, 380);
    const body = this.add.image(0, 0, SPARKY_TEXTURE, 'silhouette').setDisplaySize(50, 70);
    this.robot.add([shadow, body]);
    this.robot.setDepth(15);
    this.boardLayer.add(this.robot);
  }

  private buildCargoItems(): void {
    for (const container of this.cargoItems.values()) container.destroy();
    this.cargoItems.clear();
    for (const delivery of this.level.deliveries) {
      this.cargoItems.set(delivery.id, this.buildCargoItem(delivery));
    }
  }

  /** One cargo container per delivery: colored plate + cargo art + type glyph. */
  private buildCargoItem(delivery: Delivery): Phaser.GameObjects.Container {
    const meta = payloadMeta(delivery.type);
    const container = this.add.container(0, 0);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x22365a, 0.25);
    shadow.fillEllipse(0, 20, 62, 10);
    container.add(shadow);

    const plate = this.add.graphics();
    plate.fillStyle(meta.accent, 0.9);
    plate.fillRoundedRect(-31, -28, 62, 56, 9);
    plate.fillStyle(meta.color, 1);
    plate.fillRoundedRect(-28, -25, 56, 50, 7);
    plate.lineStyle(2, 0xffffff, 0.4);
    plate.strokeRoundedRect(-28, -25, 56, 50, 7);
    container.add(plate);

    // Crop each generated prop to its opaque bounds so gear, battery, and
    // circuit all read at the same size and weight on the board.
    const crop = CARGO_CROPS[delivery.type];
    const texture = this.textures.get(meta.textureKey);
    if (!texture.has('cargo')) texture.add('cargo', 0, crop.x, crop.y, crop.width, crop.height);
    const bin = this.add.image(0, 0, meta.textureKey, 'cargo').setDisplaySize(52, 46);
    container.add(bin);

    const glyph = this.add.graphics();
    glyph.fillStyle(meta.accent, 1);
    glyph.fillCircle(21, -19, 11);
    glyph.lineStyle(2, 0xffffff, 0.85);
    glyph.strokeCircle(21, -19, 11);
    container.add(glyph);
    this.drawPayloadGlyph(container, delivery.type, 21, -19, 13, 0xffffff);

    container.setDepth(14);
    this.boardLayer.add(container);
    return container;
  }

  private placeRobot(robot: Robot): void {
    if (this.robot === undefined) this.buildRobot();
    const rc = this.cellLocal(robot);
    this.robot.setPosition(rc.x, rc.y);
    this.robot.setAngle(sparkyAngleFor(robot.direction));
  }

  private placeCargo(state: FloorState): void {
    for (const item of state.cargo) {
      const container = this.cargoItems.get(item.id);
      if (container === undefined) continue;
      const held = state.heldId === item.id;
      const pos = this.cargoVisualPosition(item, state.robot, held);
      container.setPosition(pos.x, pos.y);
      container.setScale(held ? 0.78 : 1);
      // Delivered cargo sits on top of the dock; everything else stays under the robot.
      container.setDepth(isDelivered(item, this.level) ? 16 : 14);
    }
  }

  private cellLocal(point: { x: number; y: number }): { x: number; y: number } {
    return { x: (point.x + 0.5) * CELL, y: (point.y + 0.5) * CELL };
  }

  private cargoVisualPosition(
    cargo: { x: number; y: number },
    robot: { x: number; y: number; direction: Direction },
    held: boolean,
  ): { x: number; y: number } {
    const position = this.cellLocal(cargo);
    if (!held || cargo.x !== robot.x || cargo.y !== robot.y) return position;
    const facing = DIRECTION_VECTORS[robot.direction];
    return {
      x: position.x + facing.x * CELL * 0.28,
      y: position.y + facing.y * CELL * 0.28,
    };
  }

  private highlightCell(point: { x: number; y: number }): void {
    const cx = this.layout.boardX + (point.x + 0.5) * this.layout.cellSize;
    const cy = this.layout.boardY + (point.y + 0.5) * this.layout.cellSize;
    this.glow.clear();
    this.glow.lineStyle(5 * this.layout.boardScale, COLORS.highlight, 0.9);
    this.glow.strokeRoundedRect(
      cx - this.layout.cellSize / 2 + 4,
      cy - this.layout.cellSize / 2 + 4,
      this.layout.cellSize - 8,
      this.layout.cellSize - 8,
      10,
    );
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: this.glow,
        alpha: { from: 0.9, to: 0.4 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private clearHighlight(): void {
    this.glow.clear();
    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(1);
  }

  // ── belt rendering ───────────────────────────────────────────
  private renderBelt(): void {
    this.beltLayer.removeAll(true);
    const { beltX, beltY, beltWidth, beltHeight, beltSlotWidth, beltSlotHeight, beltRows, beltCols, beltGap } =
      this.layout;

    const strip = this.add.graphics();
    // yellow frame
    strip.fillStyle(COLORS.beltEdge, 0.55);
    strip.fillRoundedRect(beltX - 10, beltY - 10, beltWidth + 20, beltHeight + 20, 16);
    // navy rubber
    strip.fillStyle(COLORS.belt);
    strip.fillRoundedRect(beltX - 4, beltY - 4, beltWidth + 8, beltHeight + 8, 14);
    // roller seams across each row
    strip.lineStyle(2, COLORS.beltSlotEdge, 0.5);
    for (let r = 0; r < beltRows; r += 1) {
      const ry = beltY + r * (beltSlotHeight + beltGap);
      strip.lineBetween(beltX, ry + beltSlotHeight - 6, beltX + beltWidth, ry + beltSlotHeight - 6);
      strip.lineBetween(beltX, ry + 6, beltX + beltWidth, ry + 6);
    }
    this.beltLayer.add(strip);

    const label = this.add.text(beltX, beltY - 22, 'COMMAND BELT', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '12px',
      color: '#4a5a7a',
      fontStyle: 'bold',
      letterSpacing: 1.5,
    });
    this.beltLayer.add(label);

    this.beltSlots = [];
    for (let i = 0; i < this.level.beltSlots; i += 1) {
      const rect = beltSlotRect(this.layout, i);
      const slot = this.add.container(rect.x, rect.y);
      this.beltSlots.push(slot);
      this.drawBeltSlot(slot, i, rect.width, rect.height);
    }

    this.markNextSlot();
  }

  private drawBeltSlot(
    slot: Phaser.GameObjects.Container,
    index: number,
    size: number,
    height: number,
  ): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.beltSlot, 0.92);
    g.fillRoundedRect(3, 3, size - 6, height - 6, 10);
    g.lineStyle(2, COLORS.beltSlotEdge, 0.8);
    g.strokeRoundedRect(4, 4, size - 8, height - 8, 9);
    slot.add(g);

    const command = this.belt[index];
    if (command !== undefined) {
      const meta = commandMeta(command);
      g.fillStyle(meta.color, 0.96);
      g.fillRoundedRect(7, 7, size - 14, height - 14, 8);
      g.lineStyle(2, 0xffffff, 0.28);
      g.strokeRoundedRect(8, 8, size - 16, height - 16, 7);
      g.fillStyle(meta.accent, 0.5);
      g.fillRoundedRect(7, height - 14, size - 14, 6, 3);
      this.drawCommandIcon(slot, command, size / 2, height / 2 - 6, Math.min(size, height) * 0.34);
    }

    const zone = this.add.zone(size / 2, height / 2, size, height);
    zone.setInteractive({ useHandCursor: true });
    // Activation on pointerup avoids firing during a scroll/cancel gesture.
    zone.on('pointerdown', () => slot.setScale(0.95));
    zone.on('pointerup', () => {
      slot.setScale(1);
      this.handleBeltTap(index);
    });
    zone.on('pointerout', () => slot.setScale(1));
    zone.on('pointercancel', () => slot.setScale(1));
    slot.add(zone);
    this.beltLayer.add(slot);
  }

  private drawCommandIcon(
    parent: Phaser.GameObjects.Container,
    command: Command,
    cx: number,
    cy: number,
    s: number,
  ): void {
    const g = this.add.graphics();
    this.drawCommandGlyph(g, command, cx, cy, s, 0xffffff);
    parent.add(g);
  }

  private drawCommandGlyph(g: Phaser.GameObjects.Graphics, command: Command, cx: number, cy: number, s: number, color: number): void {
    g.lineStyle(Math.max(2, s * 0.16), color, 1);
    g.fillStyle(color, 1);
    if (command === 'move') {
      g.beginPath();
      g.moveTo(cx - s * 0.5, cy);
      g.lineTo(cx + s * 0.35, cy);
      g.strokePath();
      g.fillTriangle(cx + s * 0.55, cy, cx + s * 0.24, cy - s * 0.3, cx + s * 0.24, cy + s * 0.3);
    } else if (command === 'turn-left' || command === 'turn-right') {
      // A clean 90-degree road-style arrow reads better than a circular arrow.
      const direction = command === 'turn-left' ? -1 : 1;
      g.beginPath();
      g.moveTo(cx - direction * s * 0.28, cy + s * 0.48);
      g.lineTo(cx - direction * s * 0.28, cy - s * 0.02);
      g.lineTo(cx - direction * s * 0.22, cy - s * 0.16);
      g.lineTo(cx - direction * s * 0.08, cy - s * 0.28);
      g.lineTo(cx + direction * s * 0.34, cy - s * 0.28);
      g.strokePath();
      g.fillTriangle(
        cx + direction * s * 0.57,
        cy - s * 0.28,
        cx + direction * s * 0.22,
        cy - s * 0.52,
        cx + direction * s * 0.22,
        cy - s * 0.04,
      );
    } else {
      // Two claw arms closing around a box.
      g.strokeRoundedRect(cx - s * 0.2, cy - s * 0.12, s * 0.4, s * 0.38, s * 0.05);
      g.beginPath();
      g.moveTo(cx - s * 0.48, cy - s * 0.38);
      g.lineTo(cx - s * 0.48, cy + s * 0.06);
      g.lineTo(cx - s * 0.29, cy + s * 0.22);
      g.moveTo(cx + s * 0.48, cy - s * 0.38);
      g.lineTo(cx + s * 0.48, cy + s * 0.06);
      g.lineTo(cx + s * 0.29, cy + s * 0.22);
      g.strokePath();
    }
  }

  private drawActionGlyph(g: Phaser.GameObjects.Graphics, action: string, cx: number, cy: number, s: number, color: number): void {
    g.lineStyle(Math.max(2, s * 0.14), color, 1);
    g.fillStyle(color, 1);
    if (action === 'play' || action === 'step') {
      g.fillTriangle(cx - s * 0.35, cy - s * 0.48, cx - s * 0.35, cy + s * 0.48, cx + s * 0.35, cy);
      if (action === 'step') g.fillRect(cx + s * 0.43, cy - s * 0.48, s * 0.14, s * 0.96);
    } else if (action === 'undo') {
      // A broad hooked back arrow, distinct from the 90-degree turn arrows.
      g.beginPath();
      g.moveTo(cx + s * 0.46, cy + s * 0.4);
      g.lineTo(cx + s * 0.46, cy + s * 0.06);
      g.lineTo(cx + s * 0.39, cy - s * 0.11);
      g.lineTo(cx + s * 0.24, cy - s * 0.25);
      g.lineTo(cx + s * 0.04, cy - s * 0.32);
      g.lineTo(cx - s * 0.3, cy - s * 0.32);
      g.strokePath();
      g.fillTriangle(
        cx - s * 0.57,
        cy - s * 0.32,
        cx - s * 0.2,
        cy - s * 0.55,
        cx - s * 0.2,
        cy - s * 0.09,
      );
    } else if (action === 'clear') {
      g.strokeRect(cx - s * 0.34, cy - s * 0.22, s * 0.68, s * 0.68);
      g.beginPath();
      g.moveTo(cx - s * 0.46, cy - s * 0.38);
      g.lineTo(cx + s * 0.46, cy - s * 0.38);
      g.moveTo(cx - s * 0.16, cy - s * 0.52);
      g.lineTo(cx + s * 0.16, cy - s * 0.52);
      g.strokePath();
    }
  }

  private highlightBeltSlot(index: number): void {
    const slot = this.beltSlots[index];
    if (slot === undefined) return;
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: slot,
        scale: 1.08,
        duration: 200,
        yoyo: true,
        repeat: 0,
      });
    }
  }

  /** Outline the next free belt slot so the player knows where a tap will land. */
  private markNextSlot(): void {
    this.tweens.killTweensOf(this.nextMarker);
    this.nextMarker.setAlpha(1);
    this.nextMarker.clear();
    if (this.phase !== 'idle' && this.phase !== 'done') return;
    const next = this.belt.length;
    if (next >= this.level.beltSlots) return;
    const rect = beltSlotRect(this.layout, next);
    const pad = 4;
    const g = this.nextMarker;
    g.lineStyle(3, COLORS.brass, this.reducedMotion ? 0.9 : 0.9);
    g.strokeRoundedRect(
      rect.x + pad,
      rect.y + pad,
      rect.width - pad * 2,
      rect.height - pad * 2,
      9,
    );
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: this.nextMarker,
        alpha: { from: 0.9, to: 0.4 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  // ── controls / palette ─────────────────────────────────────
  private renderControls(): void {
    this.controlsLayer.removeAll(true);
    const c = this.controls;

    this.objectiveText = this.add.text(c.objective.x, c.objective.y, 'GOAL', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: this.layout.stacked ? '12px' : '13px',
      color: '#b5841f',
      fontStyle: 'bold',
      letterSpacing: 1,
      wordWrap: { width: c.objective.width },
    });
    const levelLine = this.inRandomMode
      ? `Random Shift ${this.randomLevelSeed ?? ''}`
      : `Level ${this.currentLevelIndex + 1}/${LEVELS.length} ${this.level.name}`;
    const goalLine = this.level.deliveries.length > 1 ? 'Match both parts.' : 'Match the part.';
    this.objectiveText.setFontSize(this.layout.stacked ? '11px' : '12px');
    this.objectiveText.setText(`${levelLine}\n${goalLine}`);
    this.controlsLayer.add(this.objectiveText);
    this.buildObjectiveChips();

    this.statusText = this.add.text(c.status.x, c.status.y, 'Tap commands to build a program.', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '13px',
      color: '#4a5a7a',
      fontStyle: 'bold',
      wordWrap: { width: c.status.width },
    });
    this.controlsLayer.add(this.statusText);

    for (let i = 0; i < COMMANDS.length; i += 1) {
      const meta = COMMANDS[i]!;
      const rect = c.palette[i]!;
      const btn = this.createButton(rect, meta.key, meta.label, meta.color, meta.accent, meta.hint, true);
      this.controlsLayer.add(btn);
    }

    this.controlsLayer.add(this.createButton(c.play, 'play', 'PLAY', COLORS.green, COLORS.greenAccent, 'Space', false));
    this.controlsLayer.add(this.createButton(c.step, 'step', 'STEP', COLORS.blue, 0x3f7fb5, 'S', false));
    this.controlsLayer.add(this.createButton(c.undo, 'undo', 'UNDO', COLORS.blue, 0x3f7fb5, '⌫', false));
    this.controlsLayer.add(this.createButton(c.clear, 'clear', 'CLEAR', COLORS.beltSlot, 0x5a6a9b, 'C', false));

    // Sound + fullscreen footer controls.
    this.controlsLayer.add(this.createIconButton(c.sound, 'sound'));
    this.controlsLayer.add(this.createIconButton(c.fullscreen, 'fullscreen'));

    // Add the shared hover tooltip last so it always sits above every button.
    this.controlTooltipBg = this.add.graphics();
    this.controlTooltipText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '13px',
      color: '#fff8df',
      fontStyle: 'bold',
      letterSpacing: 0.5,
    }).setOrigin(0.5);
    this.controlTooltip = this.add
      .container(0, 0, [this.controlTooltipBg, this.controlTooltipText])
      .setVisible(false);
    this.controlsLayer.add(this.controlTooltip);
  }

  /** Small colored chips after the objective text showing each required cargo type. */
  private buildObjectiveChips(): void {
    for (const chip of this.cargoChips) chip.destroy();
    this.cargoChips = [];
    if (this.objectiveText === undefined) return;
    const text = this.objectiveText;
    const chipSize = Math.min(20, this.controls.objective.height);
    let x = text.x + text.width + 8;
    for (const delivery of this.level.deliveries) {
      const meta = payloadMeta(delivery.type);
      const chip = this.add.container(x, text.y + text.height / 2);
      const bg = this.add.graphics();
      bg.fillStyle(meta.color, 1);
      bg.fillRoundedRect(-chipSize / 2, -chipSize / 2, chipSize, chipSize, 5);
      bg.lineStyle(2, 0xffffff, 0.75);
      bg.strokeRoundedRect(-chipSize / 2, -chipSize / 2, chipSize, chipSize, 5);
      chip.add(bg);
      this.drawPayloadGlyph(chip, delivery.type, 0, 0, chipSize * 0.62, 0xffffff);
      chip.setDepth(35);
      this.controlsLayer.add(chip);
      this.cargoChips.push(chip);
      x += chipSize + 6;
    }
    // Hide the chips when there is not enough room (compact layouts).
    if (x - 6 > this.controls.objective.x + this.controls.objective.width) {
      for (const chip of this.cargoChips) chip.setVisible(false);
    }
  }

  private createButton(
    rect: ControlRect,
    action: string,
    label: string,
    fill: number,
    accent: number,
    hint: string,
    isPalette: boolean,
  ): Phaser.GameObjects.Container {
    const { x, y, width, height } = rect;
    const container = this.add.container(x + width / 2, y + height / 2);
    const bg = this.add.graphics();
    bg.fillStyle(accent, 0.5);
    bg.fillRoundedRect(-width / 2, -height / 2 + 3, width, height - 3, 12);
    bg.fillStyle(fill, 0.96);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height - 4, 12);
    bg.lineStyle(2, 0xffffff, 0.35);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height - 4, 12);
    bg.fillStyle(0xffffff, 0.16);
    bg.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, 10, 6);
    container.add(bg);

    const compact = width < 150;
    const iconSize = Math.min(height * 0.52, width * 0.4, 38);
    const iconY = -Math.min(1, height * 0.02);
    const iconBacking = this.add.graphics();
    iconBacking.fillStyle(0xffffff, action === 'clear' ? 0.1 : 0.18);
    iconBacking.fillCircle(0, iconY, iconSize * 0.7);
    container.add(iconBacking);

    const icon = this.add.graphics();
    if (isPalette) this.drawCommandGlyph(icon, action as Command, 0, iconY, iconSize, 0x22365a);
    else this.drawActionGlyph(icon, action, 0, iconY, iconSize, action === 'clear' ? 0xf7f1df : 0x22365a);
    container.add(icon);

    if (action === 'play') {
      this.playIcon = icon;
      this.playIconSize = iconSize;
      this.playIconY = iconY;
    }

    if (hint) {
      const tag = this.add.text(
        compact ? width / 2 - 6 : -width / 2 + 12,
        compact ? -height / 2 + 6 : height / 2 - 12,
        hint,
        {
          fontFamily: '"Trebuchet MS", sans-serif',
          fontSize: compact ? '8px' : '10px',
          color: '#22365a',
          fontStyle: 'bold',
          backgroundColor: 'rgba(255,255,255,0.62)',
          padding: compact ? { x: 2, y: 0 } : { x: 4, y: 1 },
        },
      ).setOrigin(compact ? 1 : 0.5, compact ? 0 : 0.5);
      container.add(tag);
    }

    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => {
      const tip =
        action === 'play' && this.phase === 'done'
          ? this.inRandomMode
            ? 'NEXT SHIFT'
            : this.currentLevelIndex >= LEVELS.length - 1
              ? 'NEXT: RANDOM'
              : 'NEXT LEVEL'
          : label;
      this.showControlTooltip(tip, rect);
    });
    container.on('pointerdown', () => {
      this.hideControlTooltip();
      container.setScale(0.92);
    });
    container.on('pointerup', () => {
      container.setScale(1);
      this.sfx.unlock();
      this.handleAction(action);
    });
    container.on('pointerout', () => {
      this.hideControlTooltip();
      container.setScale(1);
    });
    container.on('pointercancel', () => {
      this.hideControlTooltip();
      container.setScale(1);
    });
    return container;
  }

  private createIconButton(rect: ControlRect, action: 'sound' | 'fullscreen'): Phaser.GameObjects.Container {
    const { x, y, width, height } = rect;
    const r = Math.min(width, height) / 2;
    const container = this.add.container(x + width / 2, y + height / 2);
    const bg = this.add.graphics();
    bg.fillStyle(0xe6cf9a, 1);
    bg.fillCircle(0, 0, r);
    bg.lineStyle(2, COLORS.panelEdge, 1);
    bg.strokeCircle(0, 0, r);
    container.add(bg);
    const icon = this.add.graphics();
    container.add(icon);
    const iconSize = r * 1.08;
    this.drawUtilityGlyph(icon, action, iconSize);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => this.showControlTooltip(action === 'sound' ? 'SOUND' : 'FULLSCREEN', rect));
    container.on('pointerdown', () => {
      this.hideControlTooltip();
      container.setScale(0.92);
    });
    container.on('pointerup', () => {
      container.setScale(1);
      this.sfx.unlock();
      this.handleAction(action);
    });
    container.on('pointerout', () => {
      this.hideControlTooltip();
      container.setScale(1);
    });
    container.on('pointercancel', () => {
      this.hideControlTooltip();
      container.setScale(1);
    });
    if (action === 'sound') {
      this.soundIcon = icon;
      this.soundIconSize = iconSize;
    } else {
      this.fullscreenIcon = icon;
      this.fullscreenIconSize = iconSize;
    }
    return container;
  }

  private showControlTooltip(label: string, rect: ControlRect): void {
    if (this.controlTooltip === undefined) return;
    this.controlTooltipText.setText(label);
    const width = Math.ceil(this.controlTooltipText.width) + 20;
    const height = Math.ceil(this.controlTooltipText.height) + 12;
    this.controlTooltipBg.clear();
    this.controlTooltipBg.fillStyle(0x22365a, 0.96);
    this.controlTooltipBg.fillRoundedRect(-width / 2, -height / 2, width, height, 7);
    this.controlTooltipBg.lineStyle(2, 0xffd36b, 0.9);
    this.controlTooltipBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 7);

    const x = Phaser.Math.Clamp(rect.x + rect.width / 2, width / 2 + 6, this.layout.width - width / 2 - 6);
    let y = rect.y - height / 2 - 7;
    if (y - height / 2 < 6) y = rect.y + rect.height + height / 2 + 7;
    this.controlTooltip.setPosition(x, y).setVisible(true);
  }

  private hideControlTooltip(): void {
    if (this.controlTooltip !== undefined) this.controlTooltip.setVisible(false);
  }

  private drawUtilityGlyph(g: Phaser.GameObjects.Graphics, action: 'sound' | 'fullscreen', s: number): void {
    g.clear();
    const color = 0x22365a;
    g.lineStyle(Math.max(2, s * 0.1), color, 1);
    g.fillStyle(color, 1);
    if (action === 'sound') {
      g.fillRect(-s * 0.5, -s * 0.18, s * 0.25, s * 0.36);
      g.fillTriangle(-s * 0.28, -s * 0.18, s * 0.05, -s * 0.42, s * 0.05, s * 0.42);
      if (this.soundOn) {
        for (const radius of [0.28, 0.5]) {
          g.beginPath();
          g.arc(s * 0.02, 0, s * radius, -Math.PI * 0.28, Math.PI * 0.28, false);
          g.strokePath();
        }
      } else {
        g.lineStyle(Math.max(3, s * 0.13), 0xa13c3c, 1);
        g.beginPath();
        g.moveTo(-s * 0.48, -s * 0.48);
        g.lineTo(s * 0.48, s * 0.48);
        g.strokePath();
      }
      return;
    }
    const inward = this.isFullscreen();
    const outer = s * 0.48;
    const inner = s * 0.12;
    for (const xSign of [-1, 1]) {
      for (const ySign of [-1, 1]) {
        const cornerX = xSign * outer;
        const cornerY = ySign * outer;
        const endX = inward ? xSign * inner : xSign * (outer - s * 0.28);
        const endY = inward ? ySign * inner : ySign * (outer - s * 0.28);
        g.beginPath();
        g.moveTo(cornerX, endY);
        g.lineTo(cornerX, cornerY);
        g.lineTo(endX, cornerY);
        g.strokePath();
      }
    }
  }

  // ── level progression ─────────────────────────────────────
  /** Load a level fresh: reset the belt, render everything, and place actors. */
  private loadLevel(level: SparkyLevel): void {
    this.level = level;
    this.belt = [];
    this.phase = 'idle';
    this.solved = false;
    this.stepIndex = 0;
    this.liveState = initialState(level);
    this.renderBoard();
    this.buildRobot(); // renderBoard() removeAll(true) destroyed the previous robot
    this.buildCargoItems();
    this.renderBelt();
    this.renderControls();
    this.placeRobot(this.liveState.robot);
    this.placeCargo(this.liveState);
    this.markNextSlot();
    if (this.pendingStatus !== null) {
      this.setStatus(this.pendingStatus);
      this.pendingStatus = null;
    }
  }

  private advanceLevel(): void {
    if (this.inRandomMode) {
      this.enterRandomShift(
        this.randomLevelSeed !== null ? this.randomLevelSeed + 1 : this.randomBaseSeed,
      );
      return;
    }
    if (this.currentLevelIndex + 1 >= LEVELS.length) {
      this.inRandomMode = true;
      this.enterRandomShift(RANDOM_FIRST_SEED);
      return;
    }
    this.currentLevelIndex += 1;
    this.level = LEVELS[this.currentLevelIndex]!;
    this.restartForLevel(`Level ${this.currentLevelIndex + 1}/${LEVELS.length}: ${this.level.name}.`);
  }

  /** Deterministic Random Shift: first solver-verified seed at or after `baseSeed`. */
  private enterRandomShift(baseSeed: number): void {
    let found = findRandomLevel(baseSeed);
    let nextBase = baseSeed;
    for (let guard = 0; guard < 20 && found === null; guard += 1) {
      nextBase += 50;
      found = findRandomLevel(nextBase);
    }
    if (found === null) {
      this.inRandomMode = false;
      this.currentLevelIndex = 0;
      this.level = FIRST_LEVEL;
      this.restartForLevel('Random shift unavailable — back to level 1.');
      return;
    }
    this.randomBaseSeed = nextBase;
    this.randomLevelSeed = found.seed;
    this.level = found.level;
    this.restartForLevel(`Random Shift ${found.seed}: deliver the parts to their matching docks.`);
  }

  /** Rebuild the scene so board, panel, and belt geometry match the current level. */
  private restartForLevel(status: string): void {
    this.pendingStatus = status;
    this.scene.restart();
  }

  private redrawPlayIcon(action: 'play' | 'next'): void {
    if (this.playIcon === undefined) return;
    this.playIcon.clear();
    const color = 0x22365a;
    if (action === 'next') {
      this.drawNextGlyph(this.playIcon, 0, this.playIconY, this.playIconSize, color);
    } else {
      this.drawActionGlyph(this.playIcon, 'play', 0, this.playIconY, this.playIconSize, color);
    }
  }

  private drawNextGlyph(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number, color: number): void {
    g.lineStyle(Math.max(2, s * 0.14), color, 1);
    g.fillStyle(color, 1);
    for (let i = 0; i < 2; i += 1) {
      const bx = cx - s * 0.08 + i * s * 0.25;
      g.fillTriangle(bx, cy - s * 0.4, bx + s * 0.22, cy, bx, cy + s * 0.4);
    }
  }


  // ── interaction ─────────────────────────────────────────────
  private handleAction(action: string): void {
    if (this.phase === 'running' && action !== 'fullscreen') return;
    if (action === 'play') {
      if (this.phase === 'done') {
        this.advanceLevel();
        return;
      }
      void this.runProgram();
      return;
    }
    if (action === 'step') {
      void this.stepProgram();
      return;
    }
    if (action === 'undo') {
      this.undoCommand();
      return;
    }
    if (action === 'clear') {
      this.clearProgram();
      return;
    }
    if (action === 'sound') {
      this.soundOn = this.sfx.toggle();
      if (this.soundIcon !== undefined) this.drawUtilityGlyph(this.soundIcon, 'sound', this.soundIconSize);
      return;
    }
    if (action === 'fullscreen') {
      this.toggleFullscreen();
      return;
    }
    // palette command → append directly to the next belt slot
    this.appendCommand(action as Command);
  }

  private appendCommand(command: Command): void {
    if (this.phase === 'running') return;
    if (this.belt.length >= this.level.beltSlots) {
      this.setStatus('Belt is full. Tap a filled slot to remove it.');
      return;
    }
    const edit = appendToBelt(this.belt, command, this.level.beltSlots);
    if (!edit.changed) return;
    this.belt = [...edit.belt];
    this.resetExecution(false);
    this.renderBelt();
    this.setStatus(`${commandMeta(command).label} added. Keep building, then PLAY.`);
    this.sfx.place();
  }

  private undoCommand(): void {
    if (this.phase === 'running') return;
    const edit = removeLastCommand(this.belt);
    if (!edit.changed) return;
    this.belt = [...edit.belt];
    this.resetExecution(false);
    this.renderBelt();
    this.setStatus('Undid the last command.');
    this.sfx.place();
  }

  private clearProgram(): void {
    if (this.phase === 'running') return;
    this.belt = [...clearBelt()];
    this.resetExecution(false);
    this.renderBelt();
    this.setStatus('Belt cleared. Build a new program.');
    this.sfx.place();
  }

  private handleBeltTap(index: number): void {
    if (this.phase === 'running') return;
    this.sfx.unlock();
    const edit = removeCommandAt(this.belt, index);
    if (!edit.changed) return; // empty slot does nothing
    this.belt = [...edit.belt];
    this.resetExecution(false);
    this.renderBelt();
    this.setStatus('Command removed.');
    this.sfx.place();
  }

  // ── execution ───────────────────────────────────────────────
  private async runProgram(): Promise<void> {
    if (this.phase === 'running') return;
    if (this.belt.length === 0) {
      this.setStatus('Add some commands to the belt first.');
      return;
    }
    this.phase = 'running';
    this.solved = false;
    this.stepIndex = 0;
    this.liveState = initialState(this.level);
    let state: FloorState = this.liveState;
    this.placeRobot(state.robot);
    this.placeCargo(state);
    this.sfx.unlock();
    this.nextMarker.clear();

    let lastResult: StepResult = 'ok';
    for (let i = 0; i < this.belt.length; i += 1) {
      this.stepIndex = i;
      this.highlightBeltSlot(i);
      this.highlightCell(state.robot);
      this.setStatus(`Running ${i + 1}/${this.belt.length}: ${commandMeta(this.belt[i]!).label}`);
      const outcome = executeStep(state, this.belt[i]!, this.level);
      await this.animate(state, outcome.state, outcome.result, this.belt[i]!);
      state = outcome.state;
      this.liveState = state;
      lastResult = outcome.result;
      // Wrong-dock already showed clear feedback; stop here so later steps
      // cannot overwrite the mismatch cue with a generic status line.
      if (outcome.result === 'wrong-dock') break;
      if (isSolved(state, this.level)) {
        this.solved = true;
        break;
      }
    }
    this.stepIndex = this.solved ? this.stepIndex + 1 : this.belt.length;

    this.clearHighlight();
    if (this.solved) {
      this.phase = 'done';
      this.celebrate();
    } else {
      this.phase = 'idle';
      this.pulseRemaining();
      // Preserve specific blocked / no-crate feedback instead of overwriting it.
      if (lastResult === 'ok') {
        this.setStatus('Program finished but not every part is on its matching dock. Adjust and PLAY again.');
        this.sfx.blocked();
      }
      this.markNextSlot();
    }

    if (this.resizePending) this.scene.restart();
  }

  private async stepProgram(): Promise<void> {
    if (this.phase === 'running') return;
    if (this.phase === 'done') return; // solved state must not be erased by STEP
    if (this.belt.length === 0) {
      this.setStatus('Add some commands to the belt first.');
      return;
    }
    if (this.stepIndex >= this.belt.length) {
      this.resetExecution(false);
      this.setStatus('Reached the end. Edit the belt or PLAY again.');
      return;
    }
    this.phase = 'running';
    this.nextMarker.clear();
    let state: FloorState = this.liveState;
    if (this.stepIndex === 0) {
      state = initialState(this.level);
      this.liveState = state;
      this.placeRobot(state.robot);
      this.placeCargo(state);
    }
    const command = this.belt[this.stepIndex]!;
    this.highlightBeltSlot(this.stepIndex);
    this.highlightCell(state.robot);
    this.sfx.step();
    const outcome = executeStep(state, command, this.level);
    await this.animate(state, outcome.state, outcome.result, command);
    this.liveState = outcome.state;
    this.stepIndex += 1;

    if (isSolved(outcome.state, this.level)) {
      this.solved = true;
      this.phase = 'done';
      this.clearHighlight();
      this.celebrate();
      return;
    }
    this.phase = 'idle';
    // animate() supplies useful blocked/no-crate feedback; do not replace it.
    if (outcome.result === 'ok') {
      if (this.stepIndex >= this.belt.length) {
        this.setStatus('End of program. Edit the belt or PLAY again.');
        this.pulseRemaining();
      } else {
        this.setStatus(`Step ${this.stepIndex}/${this.belt.length} done. Tap STEP again.`);
      }
    }
    if (this.resizePending) this.scene.restart();
  }

  /** Reset to the initial state without touching the belt. Any edit resets too. */
  private resetExecution(feedback: boolean): void {
    this.phase = 'idle';
    this.solved = false;
    this.stepIndex = 0;
    this.liveState = initialState(this.level);
    this.clearHighlight();
    this.placeRobot(this.liveState.robot);
    this.placeCargo(this.liveState);
    this.markNextSlot();
    this.redrawPlayIcon('play');
    if (feedback) {
      this.setStatus('Sparky is back at the start. Ready!');
      this.sfx.place();
    }
  }

  private async animate(
    from: FloorState,
    to: FloorState,
    result: StepResult,
    command: Command,
  ): Promise<void> {
    const duration = this.reducedMotion ? 60 : command === 'move' ? STEP_MS : TURN_MS;

    if (result === 'blocked') {
      this.shake(this.robot);
      this.sfx.blocked();
      this.setStatus('Bonk! Sparky hit a wall or the edge.');
      await this.wait(duration);
      return;
    }
    if (result === 'no-crate') {
      this.shake(this.robot);
      this.sfx.blocked();
      this.setStatus('Nothing here to grab.');
      await this.wait(duration);
      return;
    }
    if (result === 'wrong-dock') {
      await this.wrongDockFeedback(from);
      return;
    }

    if (command === 'move') {
      this.sfx.move();
      const tc = this.cellLocal(to.robot);
      const tweenRobot = this.tweenTo(this.robot, tc.x, tc.y, duration);
      if (to.heldId !== null) {
        const held = to.cargo.find((c) => c.id === to.heldId)!;
        const container = this.cargoItems.get(held.id)!;
        const cc = this.cargoVisualPosition(held, to.robot, true);
        await Promise.all([tweenRobot, this.tweenTo(container, cc.x, cc.y, duration)]);
      } else {
        await tweenRobot;
      }
      return;
    }
    if (command === 'turn-left' || command === 'turn-right') {
      this.sfx.turn();
      const fromAngle = sparkyAngleFor(from.robot.direction);
      const toAngle = sparkyAngleFor(to.robot.direction);
      const delta = ((toAngle - fromAngle + 540) % 360) - 180;
      const turnRobot = new Promise<void>((resolve) => {
        this.tweens.add({
          targets: this.robot,
          angle: this.robot.angle + delta,
          duration,
          ease: 'Sine.easeInOut',
          onComplete: () => resolve(),
        });
      });
      if (to.heldId !== null) {
        const held = to.cargo.find((c) => c.id === to.heldId)!;
        const container = this.cargoItems.get(held.id)!;
        const cc = this.cargoVisualPosition(held, to.robot, true);
        await Promise.all([turnRobot, this.tweenTo(container, cc.x, cc.y, duration)]);
      } else {
        await turnRobot;
      }
      return;
    }

    // grab / release
    const pickedUp = from.heldId === null && to.heldId !== null;
    const dropped = from.heldId !== null && to.heldId === null;
    const heldId = to.heldId ?? from.heldId!;
    const item = to.cargo.find((c) => c.id === heldId)!;
    const container = this.cargoItems.get(heldId)!;
    const cc = this.cargoVisualPosition(item, to.robot, to.heldId !== null);

    const squash = new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.robot,
        scaleX: pickedUp ? 0.92 : 1.08,
        duration: duration * 0.35,
        yoyo: true,
        onComplete: () => {
          this.robot.setScale(1);
          resolve();
        },
      });
    });

    if (pickedUp) {
      this.sfx.grab();
      await Promise.all([
        this.tweenTo(container, cc.x, cc.y, duration * 0.7, { scale: 0.78 }),
        squash,
      ]);
      return;
    }
    if (dropped) {
      this.sfx.grab();
      await Promise.all([
        this.tweenTo(container, cc.x, cc.y, duration * 0.7, { scale: 1 }),
        squash,
      ]);
      if (isDelivered(item, this.level)) {
        container.setDepth(16);
        this.sfx.place();
        this.flashDock(item.x, item.y);
      }
      return;
    }
    // Neither picked up nor dropped: nothing to animate.
    await this.wait(duration * 0.3);
  }

  /** Shake the carried cargo, buzz, and flash the mismatched dock red. */
  private async wrongDockFeedback(from: FloorState): Promise<void> {
    const heldId = from.heldId!;
    const held = from.cargo.find((c) => c.id === heldId)!;
    const container = this.cargoItems.get(heldId);
    if (container !== undefined) this.shake(container);
    this.shake(this.robot);
    this.sfx.denied();
    const dock = this.level.deliveries.find(
      (d) => d.dock.x === from.robot.x && d.dock.y === from.robot.y,
    )!;
    const g = this.add.graphics().setDepth(22);
    const cx = this.layout.boardX + (dock.dock.x + 0.5) * this.layout.cellSize;
    const cy = this.layout.boardY + (dock.dock.y + 0.5) * this.layout.cellSize;
    g.lineStyle(5 * this.layout.boardScale, 0xe8717a, 0.95);
    g.strokeRoundedRect(
      cx - this.layout.cellSize / 2 + 2,
      cy - this.layout.cellSize / 2 + 2,
      this.layout.cellSize - 4,
      this.layout.cellSize - 4,
      10,
    );
    this.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() });
    this.setStatus('Wrong dock! Bring this part to the dock with the same color.');
    await this.wait(420);
  }

  /** Brief bright ring on a cell after a successful delivery. */
  private flashDock(x: number, y: number): void {
    const g = this.add.graphics().setDepth(22);
    const cx = this.layout.boardX + (x + 0.5) * this.layout.cellSize;
    const cy = this.layout.boardY + (y + 0.5) * this.layout.cellSize;
    g.lineStyle(4 * this.layout.boardScale, 0xfff4d6, 1);
    g.strokeRoundedRect(
      cx - this.layout.cellSize / 2 + 3,
      cy - this.layout.cellSize / 2 + 3,
      this.layout.cellSize - 6,
      this.layout.cellSize - 6,
      10,
    );
    this.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
  }

  /** Pulse the undelivered cargo and its matching dock so feedback is not text-only. */
  private pulseRemaining(): void {
    const g = this.add.graphics().setDepth(22);
    const cells = new Map<string, { x: number; y: number; color: number }>();
    for (const delivery of this.level.deliveries) {
      const item = this.liveState.cargo.find((c) => c.id === delivery.id);
      if (item === undefined || isDelivered(item, this.level)) continue;
      const meta = payloadMeta(delivery.type);
      cells.set(`cargo:${delivery.id}`, { x: item.x, y: item.y, color: meta.color });
      cells.set(`dock:${delivery.id}`, { x: delivery.dock.x, y: delivery.dock.y, color: meta.color });
    }
    for (const cell of cells.values()) {
      const cx = this.layout.boardX + (cell.x + 0.5) * this.layout.cellSize;
      const cy = this.layout.boardY + (cell.y + 0.5) * this.layout.cellSize;
      g.lineStyle(4 * this.layout.boardScale, cell.color, 1);
      g.strokeRoundedRect(
        cx - this.layout.cellSize / 2 + 4,
        cy - this.layout.cellSize / 2 + 4,
        this.layout.cellSize - 8,
        this.layout.cellSize - 8,
        10,
      );
    }
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: g,
        alpha: { from: 1, to: 0.35 },
        duration: 350,
        yoyo: true,
        repeat: 2,
      });
    }
    this.time.delayedCall(1400, () => g.destroy());
  }

  private tweenTo(
    target: Phaser.GameObjects.Container,
    x: number,
    y: number,
    duration: number,
    extra?: { scale?: number },
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const props: Record<string, number> = { x, y };
      if (extra?.scale !== undefined) props.scale = extra.scale;
      this.tweens.add({
        targets: target,
        ...props,
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => resolve(),
      });
    });
  }

  private shake(target: Phaser.GameObjects.Container): void {
    if (this.reducedMotion) return;
    const x = target.x;
    this.tweens.add({
      targets: target,
      x: x + 8,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => target.setX(x),
    });
  }

  private celebrate(): void {
    this.sfx.success();
    const cx = this.layout.boardX + this.layout.boardWidth / 2;
    const cy = this.layout.boardY + this.layout.boardHeight / 2;
    const colors = [COLORS.brass, COLORS.green, COLORS.blue, COLORS.red, 0xfff4d6];
    for (let i = 0; i < 24; i += 1) {
      const piece = this.add.rectangle(cx, cy, 9, 16, colors[i % colors.length]).setDepth(40);
      piece.setAngle(i * 37);
      if (this.reducedMotion) {
        this.time.delayedCall(450, () => piece.destroy());
      } else {
        this.tweens.add({
          targets: piece,
          x: cx + Math.cos((i / 24) * Math.PI * 2) * this.layout.boardWidth * 0.4,
          y: cy + Math.sin((i / 24) * Math.PI * 2) * this.layout.boardHeight * 0.4 + 30,
          angle: piece.angle + 360,
          alpha: 0,
          scale: 0.4,
          duration: 900,
          ease: 'Quad.easeOut',
          onComplete: () => piece.destroy(),
        });
      }
    }
    if (!this.reducedMotion) {
      this.tweens.add({ targets: this.robot, scale: 1.15, duration: 180, yoyo: true, repeat: 2 });
    }
    this.redrawPlayIcon('next');
    const nextMessage = this.inRandomMode
      ? 'Sparky did it! Press NEXT for a new Random Shift.'
      : this.currentLevelIndex >= LEVELS.length - 1
        ? 'Sparky did it! Press NEXT to start Random Shifts.'
        : 'Sparky did it! Press NEXT to continue.';
    this.setStatus(nextMessage);
  }

  // ── fullscreen ─────────────────────────────────────────────
  private isFullscreen(): boolean {
    return this.scale.isFullscreen;
  }

  private toggleFullscreen(): void {
    if (!this.scale.fullscreen.available) {
      this.setStatus('Fullscreen is not available in this browser.');
      this.scale.emit('fullscreenunsupported');
      return;
    }
    try {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    } catch {
      this.setStatus('Could not change fullscreen.');
    }
  }

  private handleFullscreenChange(): void {
    if (this.fullscreenIcon !== undefined) {
      this.drawUtilityGlyph(this.fullscreenIcon, 'fullscreen', this.fullscreenIconSize);
    }
  }

  private handleFullscreenUnsupported(): void {
    if (this.fullscreenIcon !== undefined) {
      this.drawUtilityGlyph(this.fullscreenIcon, 'fullscreen', this.fullscreenIconSize);
    }
  }

  // ── small helpers ───────────────────────────────────────────
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
  }

  private installScaleEvents(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (gameSize.width === this.layout.width && gameSize.height === this.layout.height) return;
    if (this.phase === 'running') {
      this.resizePending = true;
      return;
    }
    this.scene.restart();
  }

  private installKeyboard(): void {
    const kb = this.input.keyboard;
    if (kb === null) return;
    this.bindPalette();
    this.bind('keydown-SPACE', (event: unknown) => {
      (event as KeyboardEvent).preventDefault();
      this.handleAction('play');
    });
    this.bind('keydown-ENTER', () => this.handleAction('play'));
    this.bind('keydown-PERIOD', () => this.handleAction('step'));
    this.bind('keydown-S', () => this.handleAction('step'));
    this.bind('keydown-BACKSPACE', (event: unknown) => {
      (event as KeyboardEvent).preventDefault();
      this.handleAction('undo');
    });
    this.bind('keydown-DELETE', (event: unknown) => {
      (event as KeyboardEvent).preventDefault();
      this.handleAction('undo');
    });
    this.bind('keydown-C', () => this.handleAction('clear'));
    this.bind('keydown-F', () => this.handleAction('fullscreen'));
    this.bind('keydown-N', () => {
      if (this.phase === 'done') this.advanceLevel();
    });
  }

  private bindPalette(): void {
    this.bind('keydown-UP', () => this.handleAction('move'));
    this.bind('keydown-W', () => this.handleAction('move'));
    this.bind('keydown-LEFT', () => this.handleAction('turn-left'));
    this.bind('keydown-A', () => this.handleAction('turn-left'));
    this.bind('keydown-RIGHT', () => this.handleAction('turn-right'));
    this.bind('keydown-D', () => this.handleAction('turn-right'));
    this.bind('keydown-G', () => this.handleAction('grab'));
  }

  private bind(event: string, cb: (...args: unknown[]) => void): void {
    kb_safe(this.input.keyboard, event, cb, this);
    this.keyboardBindings.push({ event, cb });
  }
}

function kb_safe(
  kb: Phaser.Input.Keyboard.KeyboardPlugin | null,
  event: string,
  cb: (...args: unknown[]) => void,
  scope: unknown,
): void {
  if (kb === null) return;
  kb.on(event, cb as never, scope);
}