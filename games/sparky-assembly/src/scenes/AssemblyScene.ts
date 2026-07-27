import Phaser from 'phaser';
import sparkyTextureUrl from '../../assets/images/sparky-topdown.webp';
import gearBinTextureUrl from '../../assets/images/gear-bin.webp';
import workbenchTextureUrl from '../../assets/images/factory-workbench.webp';
import receivingDockTextureUrl from '../../assets/images/receiving-dock.webp';
import { COLS, ROWS, BELT_SLOTS, FIRST_LEVEL, initialState, type SparkyLevel } from '../game/level';
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
  isSolved,
  facingCell,
  type Command,
  type FloorState,
  type StepResult,
} from '../game/rules';
import { COMMANDS, commandMeta } from '../game/commands';
import { appendCommand as appendToBelt, clearBelt, removeCommandAt, removeLastCommand } from '../game/belt';
import { Sfx } from '../game/sfx';

const CELL = DESIGN_CELL_SIZE;
const SPARKY_TEXTURE = 'sparky-topdown';
const GEAR_BIN_TEXTURE = 'gear-bin';
const WORKBENCH_TEXTURE = 'factory-workbench';
const RECEIVING_DOCK_TEXTURE = 'receiving-dock';

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
  private crate!: Phaser.GameObjects.Container;
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

  private keyboardBindings: Array<{ event: string; cb: (...args: unknown[]) => void }> = [];

  constructor() {
    super('AssemblyScene');
  }

  preload(): void {
    this.load.image(SPARKY_TEXTURE, sparkyTextureUrl);
    this.load.image(GEAR_BIN_TEXTURE, gearBinTextureUrl);
    this.load.image(WORKBENCH_TEXTURE, workbenchTextureUrl);
    this.load.image(RECEIVING_DOCK_TEXTURE, receivingDockTextureUrl);
  }

  create(): void {
    this.resizePending = false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.layout = createLayout(this.scale.width, this.scale.height);
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

    this.renderBoard();
    this.renderBelt();
    this.renderControls();
    this.liveState = initialState(this.level);
    this.placeActors(this.liveState.robot, this.liveState.crate, false, true);
    this.markNextSlot();

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
        if (x === this.level.goal.x && y === this.level.goal.y) this.drawGoal();
      }
    }
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

  private drawGoal(): void {
    const cx = this.level.goal.x * CELL + CELL / 2;
    const cy = this.level.goal.y * CELL + CELL / 2;
    const dock = this.add.image(cx, cy, RECEIVING_DOCK_TEXTURE).setDisplaySize(CELL - 10, CELL - 10);
    this.boardLayer.add(dock);

    // A restrained highlight reinforces the exact logical target cell.
    const highlight = this.add.graphics();
    highlight.lineStyle(2, COLORS.goal, 0.5);
    highlight.strokeRoundedRect(cx - CELL / 2 + 7, cy - CELL / 2 + 7, CELL - 14, CELL - 14, 5);
    this.boardLayer.add(highlight);
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

  private buildCrate(): void {
    this.crate = this.add.container(0, 0);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x22365a, 0.25);
    shadow.fillEllipse(0, 20, 62, 10);
    const texture = this.textures.get(GEAR_BIN_TEXTURE);
    if (!texture.has('silhouette')) texture.add('silhouette', 0, 24, 53, 325, 290);
    const bin = this.add.image(0, 0, GEAR_BIN_TEXTURE, 'silhouette').setDisplaySize(65, 58);
    this.crate.add([shadow, bin]);
    this.crate.setDepth(14);
    this.boardLayer.add(this.crate);
  }

  private placeActors(
    robot: { x: number; y: number; direction: Direction },
    crate: { x: number; y: number },
    holding: boolean,
    build: boolean,
  ): void {
    if (build || this.robot === undefined) this.buildRobot();
    if (build || this.crate === undefined) this.buildCrate();
    const rc = this.cellLocal(robot);
    this.robot.setPosition(rc.x, rc.y);
    this.robot.setAngle(sparkyAngleFor(robot.direction));
    const cc = this.crateVisualPosition(crate, robot);
    this.crate.setPosition(cc.x, cc.y);
    this.crate.setScale(holding ? 0.78 : 1);
  }

  private cellLocal(point: { x: number; y: number }): { x: number; y: number } {
    return { x: (point.x + 0.5) * CELL, y: (point.y + 0.5) * CELL };
  }

  private crateVisualPosition(
    crate: { x: number; y: number },
    robot: { x: number; y: number; direction: Direction },
  ): { x: number; y: number } {
    const position = this.cellLocal(crate);
    if (crate.x !== robot.x || crate.y !== robot.y) return position;
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
    for (let i = 0; i < BELT_SLOTS; i += 1) {
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
      const left = command === 'turn-left';
      g.beginPath();
      g.arc(cx, cy + s * 0.08, s * 0.48, left ? Math.PI * 0.25 : Math.PI * 0.75, left ? Math.PI * 1.55 : -Math.PI * 0.55, !left);
      g.strokePath();
      const sign = left ? -1 : 1;
      g.fillTriangle(cx + sign * s * 0.57, cy - s * 0.08, cx + sign * s * 0.2, cy - s * 0.45, cx + sign * s * 0.2, cy + s * 0.18);
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
      g.beginPath();
      g.arc(cx + s * 0.08, cy + s * 0.08, s * 0.42, -Math.PI * 0.55, Math.PI * 1.15, true);
      g.strokePath();
      g.fillTriangle(cx - s * 0.55, cy - s * 0.08, cx - s * 0.12, cy - s * 0.48, cx - s * 0.08, cy + s * 0.12);
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

  private beltSlotCenter(index: number): { x: number; y: number } {
    const rect = beltSlotRect(this.layout, index);
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
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
    if (next >= BELT_SLOTS) return;
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
    this.objectiveText.setText(
      this.layout.stacked
        ? 'GOAL: Dock the gear bin, then DROP.'
        : 'GOAL: get the gear bin onto the dock, then DROP.',
    );
    this.controlsLayer.add(this.objectiveText);

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
    container.on('pointerover', () => this.showControlTooltip(label, rect));
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

  // ── interaction ─────────────────────────────────────────────
  private handleAction(action: string): void {
    if (this.phase === 'running' && action !== 'fullscreen') return;
    if (action === 'play') {
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
    if (this.belt.length >= BELT_SLOTS) {
      this.setStatus('Belt is full. Tap a filled slot to remove it.');
      return;
    }
    const edit = appendToBelt(this.belt, command);
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
    this.placeActors(state.robot, state.crate, state.holding, false);
    this.sfx.unlock();
    this.nextMarker.clear();

    let lastResult: StepResult = 'ok';
    for (let i = 0; i < this.belt.length; i += 1) {
      this.stepIndex = i;
      this.highlightBeltSlot(i);
      this.highlightCell(state.robot);
      this.setStatus(`Running ${i + 1}/${this.belt.length}: ${commandMeta(this.belt[i]!).label}`);
      const outcome = executeStep(state, this.belt[i]!, this.level.cols, this.level.rows);
      await this.animate(state, outcome.state, outcome.result, this.belt[i]!);
      state = outcome.state;
      this.liveState = state;
      lastResult = outcome.result;
      if (isSolved(state, this.level.goal)) {
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
      // Preserve specific blocked / no-crate feedback instead of overwriting it.
      if (lastResult === 'ok') {
        this.setStatus('Program finished but the bin is not on the dock. Adjust and PLAY again.');
        this.sfx.blocked();
      }
    }

    if (this.resizePending) this.scene.restart();
  }

  private async stepProgram(): Promise<void> {
    if (this.phase === 'running') return;
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
      this.placeActors(state.robot, state.crate, state.holding, false);
    }
    const command = this.belt[this.stepIndex]!;
    this.highlightBeltSlot(this.stepIndex);
    this.highlightCell(state.robot);
    this.sfx.step();
    const outcome = executeStep(state, command, this.level.cols, this.level.rows);
    await this.animate(state, outcome.state, outcome.result, command);
    this.liveState = outcome.state;
    this.stepIndex += 1;

    if (isSolved(outcome.state, this.level.goal)) {
      this.solved = true;
      this.phase = 'done';
      this.clearHighlight();
      this.celebrate();
      return;
    }
    this.phase = 'idle';
    // animate() supplies useful blocked/no-crate feedback; do not replace it.
    if (outcome.result === 'ok') {
      this.setStatus(
        this.stepIndex >= this.belt.length
          ? 'End of program. Edit the belt or PLAY again.'
          : `Step ${this.stepIndex}/${this.belt.length} done. Tap STEP again.`,
      );
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
    this.placeActors(this.liveState.robot, this.liveState.crate, false, false);
    this.markNextSlot();
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
      this.setStatus('Bonk! Sparky hit the edge.');
      await this.wait(duration);
      return;
    }
    if (result === 'no-crate') {
      this.shake(this.robot);
      this.sfx.blocked();
      this.setStatus('Nothing here to grab. Move next to the bin.');
      await this.wait(duration);
      return;
    }

    if (command === 'move') {
      this.sfx.move();
      const tc = this.cellLocal(to.robot);
      const tweenRobot = this.tweenTo(this.robot, tc.x, tc.y, duration);
      if (to.holding) {
        const cc = this.crateVisualPosition(to.crate, to.robot);
        await Promise.all([
          tweenRobot,
          this.tweenTo(this.crate, cc.x, cc.y, duration),
        ]);
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
      if (to.holding) {
        const cc = this.crateVisualPosition(to.crate, to.robot);
        await Promise.all([turnRobot, this.tweenTo(this.crate, cc.x, cc.y, duration)]);
      } else {
        await turnRobot;
      }
      return;
    }
    // grab / release
    this.sfx.grab();
    const cc = this.crateVisualPosition(to.crate, to.robot);
    const scale = to.holding ? 0.78 : 1;
    await Promise.all([
      this.tweenTo(this.crate, cc.x, cc.y, duration * 0.7, { scale }),
      new Promise<void>((resolve) => {
        this.tweens.add({
          targets: this.robot,
          scaleX: to.holding ? 0.92 : 1.08,
          duration: duration * 0.35,
          yoyo: true,
          onComplete: () => {
            this.robot.setScale(1);
            resolve();
          },
        });
      }),
    ]);
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
    this.setStatus('Sparky did it! The bin is home. Press PLAY to go again.');
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