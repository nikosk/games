import Phaser from 'phaser';
import { COLS, ROWS, BELT_SLOTS, FIRST_LEVEL, initialState, type SparkyLevel } from '../game/level';
import { createLayout, DESIGN_CELL_SIZE, type AssemblyLayout } from '../game/layout';
import { angleFor, type Direction } from '../game/direction';
import {
  executeStep,
  isSolved,
  facingCell,
  type Command,
  type FloorState,
  type StepResult,
} from '../game/rules';
import { Sfx } from '../game/sfx';

const CELL = DESIGN_CELL_SIZE;

const COLORS = {
  floorA: 0x2d4a4f,
  floorB: 0x34555a,
  floorEdge: 0x1b3236,
  panel: 0x223a3f,
  panelEdge: 0x3a5560,
  belt: 0x3b3a36,
  beltSlot: 0x4a4943,
  beltSlotEdge: 0x5d5b52,
  cream: 0xfff4d6,
  ink: 0x16292e,
  brass: 0xffd166,
  green: 0x6bbf67,
  blue: 0x5aa9e6,
  yellow: 0xf5c542,
  rose: 0xe8717a,
  robotBody: 0x5aa9e6,
  robotBodyDark: 0x3f7fb5,
  crate: 0xc8843f,
  crateDark: 0x9c5f28,
  goal: 0xffd166,
  highlight: 0xfff4d6,
} as const;

interface CommandStyle {
  readonly label: string;
  readonly color: number;
  readonly key: string;
}

const COMMANDS: readonly CommandStyle[] = [
  { label: 'MOVE', color: COLORS.green, key: 'move' },
  { label: 'LEFT', color: COLORS.blue, key: 'turn-left' },
  { label: 'RIGHT', color: COLORS.blue, key: 'turn-right' },
  { label: 'GRAB', color: COLORS.yellow, key: 'grab' },
];

const STEP_MS = 460;
const TURN_MS = 320;

type Phase = 'idle' | 'running' | 'done';

export class AssemblyScene extends Phaser.Scene {
  private level: SparkyLevel = FIRST_LEVEL;
  private layout!: AssemblyLayout;
  private readonly sfx = new Sfx();

  private belt: Command[] = [];
  private selectedCommand: Command = 'move';
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
  private statusText!: Phaser.GameObjects.Text;
  private beltSlots: Phaser.GameObjects.Container[] = [];
  private runButton!: Phaser.GameObjects.Container;
  private soundButton!: Phaser.GameObjects.Container;

  constructor() {
    super('AssemblyScene');
  }

  create(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.layout = createLayout(this.scale.width, this.scale.height);
    this.input.mouse?.disableContextMenu();
    this.drawBackground();

    this.boardLayer = this.add
      .container(this.layout.boardX, this.layout.boardY)
      .setScale(this.layout.boardScale)
      .setDepth(10);
    this.beltLayer = this.add.container(0, 0).setDepth(20);
    this.controlsLayer = this.add.container(0, 0).setDepth(30);

    this.glow = this.add.graphics().setDepth(9);

    this.renderBoard();
    this.renderBelt();
    this.renderControls();
    this.liveState = initialState(this.level);
    this.placeActors(this.liveState.robot, this.liveState.crate, false, true);

    this.installKeyboard();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    this.input.once('pointerdown', () => this.sfx.unlock());
    const canvas = this.game.canvas;
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('aria-label', "Sparky's Assembly Line");

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.input.keyboard?.removeAllListeners();
      this.tweens.killAll();
    });
  }

  // ── background ──────────────────────────────────────────────
  private drawBackground(): void {
    const { width, height, panelX, panelY, panelWidth, panelHeight } = this.layout;
    this.cameras.main.setBackgroundColor(COLORS.ink);

    const bg = this.add.graphics();
    bg.fillStyle(0x1b353a);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0xffffff, 0.02);
    for (let x = 10; x < width; x += 20) bg.fillRect(x, 0, 1, height);
    bg.fillStyle(0xffffff, 0.012);
    for (let y = 14; y < height; y += 20) bg.fillRect(0, y, width, 1);

    bg.lineStyle(3, COLORS.panelEdge, 1);
    bg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    bg.fillStyle(0x2a4549, 0.55);
    bg.fillRoundedRect(panelX - 4, panelY - 4, panelWidth + 8, panelHeight + 8, 18);
    bg.fillStyle(COLORS.panel);
    bg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
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
    const base = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
    g.fillStyle(base, 0.96);
    g.fillRoundedRect(x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 6, 10);
    g.lineStyle(2, COLORS.floorEdge, 0.5);
    g.strokeRoundedRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8, 9);
    g.fillStyle(0xffffff, 0.05);
    g.fillRoundedRect(x * CELL + 8, y * CELL + 7, CELL - 16, 10, 5);
    this.boardLayer.add(g);
  }

  private drawGoal(): void {
    const g = this.add.graphics();
    const cx = this.level.goal.x * CELL + CELL / 2;
    const cy = this.level.goal.y * CELL + CELL / 2;
    g.lineStyle(4, COLORS.goal, 0.9);
    g.strokeRoundedRect(cx - CELL / 2 + 7, cy - CELL / 2 + 7, CELL - 14, CELL - 14, 8);
    g.fillStyle(COLORS.goal, 0.16);
    g.fillRoundedRect(cx - CELL / 2 + 7, cy - CELL / 2 + 7, CELL - 14, CELL - 14, 8);
    const flag = this.add.text(cx, cy - 2, 'TARGET', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '11px',
      color: '#ffd166',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.boardLayer.add([g, flag]);
  }

  // ── actors ──────────────────────────────────────────────────
  private buildRobot(): void {
    this.robot = this.add.container(0, 0);
    const body = this.add.graphics();
    const w = 54;
    body.fillStyle(0x223a3f, 0.3);
    body.fillEllipse(0, 22, w + 14, 12);
    body.fillStyle(COLORS.robotBodyDark);
    body.fillRoundedRect(-w / 2, -w / 2 - 6, w, w + 6, 12);
    body.fillStyle(COLORS.robotBody);
    body.fillRoundedRect(-w / 2 + 3, -w / 2 - 6, w - 6, w + 4, 11);
    body.fillStyle(0xffffff, 0.85);
    body.fillRoundedRect(-16, -w / 2 - 4, 32, 18, 6);
    body.fillStyle(0x16292e);
    body.fillCircle(-8, -w / 2 + 3, 5);
    body.fillCircle(8, -w / 2 + 3, 5);
    body.fillStyle(0xffffff, 0.9);
    body.fillCircle(-7, -w / 2 + 1, 2);
    body.fillCircle(9, -w / 2 + 1, 2);
    body.lineStyle(3, 0x3f7fb5, 1);
    body.beginPath();
    body.moveTo(-5, -w / 2 + 12);
    body.lineTo(5, -w / 2 + 12);
    body.strokePath();
    body.lineStyle(4, 0x93a3a6, 1);
    body.lineBetween(0, -w / 2 - 6, 0, -w / 2 - 22);
    body.fillStyle(COLORS.brass);
    body.fillCircle(0, -w / 2 - 26, 7);
    body.lineStyle(2, 0xe6b84f, 1);
    body.strokeCircle(0, -w / 2 - 26, 7);
    this.robot.add(body);
    this.robot.setDepth(15);
    this.boardLayer.add(this.robot);
  }

  private buildCrate(): void {
    this.crate = this.add.container(0, 0);
    const g = this.add.graphics();
    const s = 44;
    g.fillStyle(0x5b3a18, 0.35);
    g.fillEllipse(0, 14, s + 10, 8);
    g.fillStyle(COLORS.crateDark);
    g.fillRoundedRect(-s / 2 - 1, -s / 2, s + 2, s, 5);
    g.fillStyle(COLORS.crate);
    g.fillRoundedRect(-s / 2 + 3, -s / 2 + 2, s - 6, s - 8, 4);
    g.lineStyle(3, COLORS.crateDark, 1);
    g.lineBetween(-s / 2 + 3, -s / 2 + 3, s / 2 - 3, s / 2 - 6);
    g.lineBetween(s / 2 - 3, -s / 2 + 3, -s / 2 + 3, s / 2 - 6);
    this.crate.add(g);
    this.crate.setDepth(14);
    this.boardLayer.add(this.crate);
  }

  /**
   * Place robot/crate instantly (used on reset and first build).
   * Builds the containers on first use.
   */
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
    this.robot.setAngle(angleFor(robot.direction));
    const cc = this.cellLocal(crate);
    this.crate.setPosition(cc.x, holding ? cc.y - CELL * 0.22 : cc.y);
    this.crate.setScale(holding ? 0.78 : 1);
  }

  private cellLocal(point: { x: number; y: number }): { x: number; y: number } {
    return { x: (point.x + 0.5) * CELL, y: (point.y + 0.5) * CELL };
  }

  private highlightCell(point: { x: number; y: number }): void {
    const cx = this.layout.boardX + (point.x + 0.5) * this.layout.cellSize;
    const cy = this.layout.boardY + (point.y + 0.5) * this.layout.cellSize;
    this.glow.clear();
    this.glow.lineStyle(5 * this.layout.boardScale, COLORS.highlight, 0.85);
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
        alpha: { from: 0.85, to: 0.35 },
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
    const { beltX, beltY, beltHeight, beltSlotSize } = this.layout;

    const strip = this.add.graphics();
    strip.fillStyle(0x1b3236, 0.5);
    strip.fillRoundedRect(beltX - 10, beltY - 10, beltSlotSize * BELT_SLOTS + 20, beltHeight + 20, 16);
    strip.fillStyle(COLORS.belt);
    strip.fillRoundedRect(beltX - 4, beltY - 4, beltSlotSize * BELT_SLOTS + 8, beltHeight + 8, 14);
    strip.lineStyle(2, 0x5d5b52, 0.8);
    for (let i = 1; i < BELT_SLOTS; i += 1) {
      strip.lineBetween(
        beltX + i * beltSlotSize,
        beltY + 8,
        beltX + i * beltSlotSize,
        beltY + beltHeight - 8,
      );
    }
    this.beltLayer.add(strip);

    const label = this.add.text(beltX, beltY - 24, 'COMMAND BELT', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '13px',
      color: '#cfe3e3',
      fontStyle: 'bold',
      letterSpacing: 1.5,
    });
    this.beltLayer.add(label);

    this.beltSlots = [];
    for (let i = 0; i < BELT_SLOTS; i += 1) {
      const slot = this.add.container(beltX + i * beltSlotSize, beltY);
      this.beltSlots.push(slot);
      this.drawBeltSlot(slot, i, beltSlotSize, beltHeight);
    }
  }

  private drawBeltSlot(
    slot: Phaser.GameObjects.Container,
    index: number,
    size: number,
    height: number,
  ): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.beltSlot, 0.9);
    g.fillRoundedRect(4, 4, size - 8, height - 8, 10);
    g.lineStyle(2, COLORS.beltSlotEdge, 0.8);
    g.strokeRoundedRect(5, 5, size - 10, height - 10, 9);
    slot.add(g);

    const command = this.belt[index];
    if (command !== undefined) {
      const style = this.commandStyle(command);
      g.fillStyle(style.color, 0.95);
      g.fillRoundedRect(8, 8, size - 16, height - 16, 8);
      g.lineStyle(2, 0xffffff, 0.25);
      g.strokeRoundedRect(9, 9, size - 18, height - 18, 7);
      this.drawCommandIcon(slot, command, size / 2, height / 2, Math.min(size, height) * 0.4);
    }

    const zone = this.add.zone(size / 2, height / 2, size, height);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.handleBeltTap(index));
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
    g.lineStyle(5, 0xffffff, 1);
    if (command === 'move') {
      g.beginPath();
      g.moveTo(cx - s * 0.55, cy);
      g.lineTo(cx + s * 0.45, cy);
      g.strokePath();
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(
        cx + s * 0.55, cy,
        cx + s * 0.3, cy - s * 0.3,
        cx + s * 0.3, cy + s * 0.3,
      );
    } else if (command === 'turn-left') {
      g.beginPath();
      g.arc(cx, cy, s * 0.5, Math.PI * 0.3, Math.PI * 1.6, false);
      g.strokePath();
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(
        cx - s * 0.55, cy - s * 0.1,
        cx - s * 0.2, cy - s * 0.5,
        cx - s * 0.2, cy + s * 0.25,
      );
    } else if (command === 'turn-right') {
      g.beginPath();
      g.arc(cx, cy, s * 0.5, Math.PI * 1.4, Math.PI * 0.7, true);
      g.strokePath();
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(
        cx + s * 0.55, cy - s * 0.1,
        cx + s * 0.2, cy - s * 0.5,
        cx + s * 0.2, cy + s * 0.25,
      );
    } else {
      // grab/release hand
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(cx - s * 0.35, cy - s * 0.15, s * 0.7, s * 0.45, 6);
      for (let i = 0; i < 4; i += 1) {
        const fx = cx - s * 0.28 + i * s * 0.19;
        g.fillRect(fx, cy - s * 0.45, s * 0.09, s * 0.32);
      }
    }
    parent.add(g);
  }

  private beltSlotCenter(index: number): { x: number; y: number } {
    return {
      x: this.layout.beltX + (index + 0.5) * this.layout.beltSlotSize,
      y: this.layout.beltY + this.layout.beltHeight / 2,
    };
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

  // ── controls / palette ─────────────────────────────────────
  private renderControls(): void {
    this.controlsLayer.removeAll(true);
    if (this.layout.stacked) this.renderControlsStacked();
    else this.renderControlsSideBySide();
  }

  private renderControlsSideBySide(): void {
    const { panelX, panelY, panelWidth, panelHeight } = this.layout;

    const title = this.add.text(panelX + panelWidth / 2, panelY + 22, "SPARKY'S ASSEMBLY LINE", {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '15px',
      color: '#ffd166',
      fontStyle: 'bold',
      letterSpacing: 1,
      align: 'center',
    }).setOrigin(0.5);
    this.controlsLayer.add(title);

    this.statusText = this.add.text(panelX + 16, panelY + 44, 'Pick a command, then tap a belt slot.', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '13px',
      color: '#eaf4f4',
      fontStyle: 'bold',
      wordWrap: { width: panelWidth - 32 },
    });
    this.controlsLayer.add(this.statusText);

    let y = panelY + 96;
    const buttonWidth = panelWidth - 32;
    const buttonHeight = Math.min(62, (panelHeight - 330) / 5);

    for (let i = 0; i < COMMANDS.length; i += 1) {
      const cmd = COMMANDS[i]!;
      const btn = this.createButton(panelX + 16, y, buttonWidth, buttonHeight, cmd.key as Command, cmd.label, cmd.color);
      this.controlsLayer.add(btn);
      y += buttonHeight + 8;
    }

    y += 4;
    this.runButton = this.createButton(panelX + 16, y, buttonWidth, 56, 'run', '▶  RUN', COLORS.green);
    this.controlsLayer.add(this.runButton);
    y += 64;

    const stepW = (buttonWidth - 8) / 2;
    const step = this.createButton(panelX + 16, y, stepW, 50, 'step', 'STEP', COLORS.blue);
    const reset = this.createButton(panelX + 24 + stepW, y, stepW, 50, 'reset', 'RESET', COLORS.rose);
    this.controlsLayer.add([step, reset]);
    y += 58;

    const clear = this.createButton(panelX + 16, y, buttonWidth, 44, 'clear', 'CLEAR BELT', COLORS.beltSlot);
    this.controlsLayer.add(clear);

    const sb = panelX + panelWidth - 32;
    this.soundButton = this.createRoundButton(panelX + 16, panelY + panelHeight - 40, 28, this.soundOn ? '🔊' : '🔇');
    this.controlsLayer.add(this.soundButton);
    const hint = this.add.text(sb - 100, panelY + panelHeight - 34, '1–4  S  R  Space', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '11px',
      color: '#9fc2c2',
    });
    this.controlsLayer.add(hint);
  }

  private renderControlsStacked(): void {
    const { panelX, panelY, panelWidth, panelHeight } = this.layout;
    const pad = 14;
    const gap = 8;
    const innerWidth = panelWidth - pad * 2;

    const title = this.add.text(panelX + panelWidth / 2, panelY + 16, "SPARKY'S ASSEMBLY LINE", {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '14px',
      color: '#ffd166',
      fontStyle: 'bold',
      letterSpacing: 1,
      align: 'center',
    }).setOrigin(0.5);
    this.controlsLayer.add(title);

    this.statusText = this.add.text(panelX + pad, panelY + 32, 'Pick a command, then tap a belt slot.', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '12px',
      color: '#eaf4f4',
      fontStyle: 'bold',
      wordWrap: { width: innerWidth },
    });
    this.controlsLayer.add(this.statusText);

    // Four command buttons in one row.
    const cmdW = (innerWidth - gap * (COMMANDS.length - 1)) / COMMANDS.length;
    const cmdH = Math.min(56, Math.max(40, panelHeight * 0.16));
    let y = panelY + 56;
    for (let i = 0; i < COMMANDS.length; i += 1) {
      const cmd = COMMANDS[i]!;
      const x = panelX + pad + i * (cmdW + gap);
      const btn = this.createButton(x, y, cmdW, cmdH, cmd.key as Command, cmd.label, cmd.color);
      this.controlsLayer.add(btn);
    }
    y += cmdH + gap;

    // Run button full width.
    const runH = Math.min(50, Math.max(38, panelHeight * 0.13));
    this.runButton = this.createButton(panelX + pad, y, innerWidth, runH, 'run', '▶  RUN', COLORS.green);
    this.controlsLayer.add(this.runButton);
    y += runH + gap;

    // Step + Reset side by side.
    const halfW = (innerWidth - gap) / 2;
    const actionH = Math.min(46, Math.max(34, panelHeight * 0.12));
    const step = this.createButton(panelX + pad, y, halfW, actionH, 'step', 'STEP', COLORS.blue);
    const reset = this.createButton(panelX + pad + halfW + gap, y, halfW, actionH, 'reset', 'RESET', COLORS.rose);
    this.controlsLayer.add([step, reset]);
    y += actionH + gap;

    // Clear belt full width.
    const clearH = Math.min(42, Math.max(32, panelHeight * 0.11));
    const clear = this.createButton(panelX + pad, y, innerWidth, clearH, 'clear', 'CLEAR BELT', COLORS.beltSlot);
    this.controlsLayer.add(clear);

    // Sound button bottom-left, hint bottom-right.
    this.soundButton = this.createRoundButton(panelX + pad + 22, panelY + panelHeight - 28, 20, this.soundOn ? '🔊' : '🔇');
    this.controlsLayer.add(this.soundButton);
    const hint = this.add.text(panelX + panelWidth - pad, panelY + panelHeight - 22, '1–4  S  R  Space', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '11px',
      color: '#9fc2c2',
    }).setOrigin(1, 0.5);
    this.controlsLayer.add(hint);
  }

  private commandStyle(command: Command): CommandStyle {
    return COMMANDS.find((c) => c.key === command) ?? COMMANDS[0]!;
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    action: string,
    label: string,
    fill: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x + width / 2, y + height / 2);
    const bg = this.add.graphics();
    const selected = action === this.selectedCommand;
    const isPalette = COMMANDS.some((c) => c.key === action);

    bg.fillStyle(0x0e1a1d, 0.4);
    bg.fillRoundedRect(-width / 2, -height / 2 + 4, width, height, 12);
    bg.fillStyle(selected ? 0xffffff : fill, selected ? 1 : 0.92);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height - 4, 12);
    bg.lineStyle(3, selected ? COLORS.brass : 0xffffff, selected ? 1 : 0.3);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height - 4, 12);
    container.add(bg);

    if (isPalette) {
      const num = this.add.text(-width / 2 + 10, 0, String(COMMANDS.findIndex((c) => c.key === action) + 1), {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: '11px',
        color: selected ? '#16292e' : '#ffffff',
        fontStyle: 'bold',
        backgroundColor: selected ? '#ffd166' : 'rgba(0,0,0,0.25)',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 0.5);
      container.add(num);
    }

    const text = this.add.text(isPalette ? 14 : 0, 0, label, {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: `${Math.round(Math.min(height * 0.34, width * 0.16))}px`,
      fontStyle: 'bold',
      color: selected ? '#16292e' : '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      container.setScale(0.96);
      this.sfx.unlock();
      this.handleAction(action);
    });
    container.on('pointerup', () => container.setScale(1));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointercancel', () => container.setScale(1));
    return container;
  }

  private createRoundButton(x: number, y: number, r: number, label: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a4549, 1);
    bg.fillCircle(0, 0, r);
    bg.lineStyle(2, COLORS.panelEdge, 1);
    bg.strokeCircle(0, 0, r);
    container.add(bg);
    const text = this.add.text(0, 0, label, {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '16px',
    }).setOrigin(0.5);
    container.add(text);
    container.setSize(r * 2, r * 2);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      this.soundOn = this.sfx.toggle();
      text.setText(this.soundOn ? '🔊' : '🔇');
    });
    return container;
  }

  // ── interaction ─────────────────────────────────────────────
  private handleAction(action: string): void {
    if (this.phase === 'running') return;
    if (action === 'run') {
      void this.runProgram();
      return;
    }
    if (action === 'step') {
      void this.stepProgram();
      return;
    }
    if (action === 'reset') {
      this.resetExecution(true);
      return;
    }
    if (action === 'clear') {
      this.belt = [];
      this.stepIndex = 0;
      this.resetExecution(false);
      this.setStatus('Belt cleared. Build a new program.');
      this.sfx.place();
      return;
    }
    // palette selection
    this.selectedCommand = action as Command;
    this.sfx.place();
    this.renderControls();
  }

  private handleBeltTap(index: number): void {
    if (this.phase === 'running') return;
    this.sfx.unlock();
    this.sfx.place();
    const existing = this.belt[index];
    if (existing !== undefined) {
      this.belt.splice(index, 1);
      this.resetExecution(false);
      this.renderBelt();
      this.setStatus('Command removed.');
      return;
    }
    if (this.belt.length >= BELT_SLOTS) {
      this.setStatus('Belt is full. Tap a filled slot to remove it.');
      return;
    }
    this.belt.push(this.selectedCommand);
    this.resetExecution(false);
    this.renderBelt();
    this.setStatus(`${this.commandStyle(this.selectedCommand).label} added. Keep going or press RUN.`);
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

    for (let i = 0; i < this.belt.length; i += 1) {
      this.stepIndex = i;
      this.highlightBeltSlot(i);
      this.highlightCell(state.robot);
      this.setStatus(`Running ${i + 1}/${this.belt.length}: ${this.commandStyle(this.belt[i]!).label}`);
      const outcome = executeStep(state, this.belt[i]!, this.level.cols, this.level.rows);
      await this.animate(state, outcome.state, outcome.result, this.belt[i]!);
      state = outcome.state;
      this.liveState = state;
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
      this.setStatus(isSolved(state, this.level.goal)
        ? 'The crate reached the goal!'
        : 'Program finished but the crate is not home yet. Adjust and try again.');
      this.sfx.blocked();
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
      this.setStatus('Reached the end. Press RUN or edit the belt.');
      return;
    }
    this.phase = 'running';
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
      this.setStatus('The crate reached the target! Press RESET to play again.');
      return;
    }
    this.phase = 'idle';
    this.setStatus(
      this.stepIndex >= this.belt.length
        ? 'End of program. Edit the belt or press RESET.'
        : `Step ${this.stepIndex}/${this.belt.length} done. Tap STEP again.`,
    );
    if (this.resizePending) this.scene.restart();
  }

  private resetExecution(feedback: boolean): void {
    this.phase = 'idle';
    this.solved = false;
    this.stepIndex = 0;
    this.liveState = initialState(this.level);
    this.clearHighlight();
    this.placeActors(this.liveState.robot, this.liveState.crate, false, false);
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
      this.setStatus('Nothing here to grab. Move closer to the crate.');
      await this.wait(duration);
      return;
    }

    if (command === 'move') {
      this.sfx.move();
      const tc = this.cellLocal(to.robot);
      const tweenRobot = this.tweenTo(this.robot, tc.x, tc.y, duration);
      if (to.holding) {
        const cc = this.cellLocal(to.crate);
        await Promise.all([
          tweenRobot,
          this.tweenTo(this.crate, cc.x, cc.y - CELL * 0.22, duration),
        ]);
      } else {
        await tweenRobot;
      }
      return;
    }
    if (command === 'turn-left' || command === 'turn-right') {
      this.sfx.turn();
      const fromAngle = angleFor(from.robot.direction);
      const toAngle = angleFor(to.robot.direction);
      const delta = ((toAngle - fromAngle + 540) % 360) - 180;
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: this.robot,
          angle: this.robot.angle + delta,
          duration,
          ease: 'Sine.easeInOut',
          onComplete: () => resolve(),
        });
      });
      return;
    }
    // grab / release
    this.sfx.grab();
    const cc = this.cellLocal(to.crate);
    const liftY = to.holding ? cc.y - CELL * 0.22 : cc.y;
    const scale = to.holding ? 0.78 : 1;
    await Promise.all([
      this.tweenTo(this.crate, cc.x, liftY, duration * 0.7, { scale }),
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
    const colors = [COLORS.brass, COLORS.green, COLORS.blue, COLORS.rose, COLORS.cream];
    for (let i = 0; i < 24; i += 1) {
      const piece = this.add.rectangle(cx, cy, 9, 16, colors[i % colors.length]).setDepth(40);
      piece.setAngle(i * 37);
      if (this.reducedMotion) {
        this.time.delayedCall(450, () => piece.destroy());
      } else {
        this.tweens.add({
          targets: piece,
          x: cx + (Math.cos(i / 24 * Math.PI * 2) * this.layout.boardWidth * 0.4),
          y: cy + Math.sin(i / 24 * Math.PI * 2) * this.layout.boardHeight * 0.4 + 30,
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
    this.setStatus("Sparky did it! The crate is home. Press RESET to play again.");
  }

  // ── small helpers ───────────────────────────────────────────
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
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
    kb.on('keydown-ONE', () => this.choose('move'));
    kb.on('keydown-TWO', () => this.choose('turn-left'));
    kb.on('keydown-THREE', () => this.choose('turn-right'));
    kb.on('keydown-FOUR', () => this.choose('grab'));
    kb.on('keydown-SPACE', (e: KeyboardEvent) => {
      e.preventDefault();
      void this.runProgram();
    });
    kb.on('keydown-S', () => void this.stepProgram());
    kb.on('keydown-R', () => this.resetExecution(true));
    kb.on('keydown-BACKSPACE', (e: KeyboardEvent) => {
      e.preventDefault();
      if (this.phase === 'running') return;
      if (this.belt.length > 0) {
        this.belt.pop();
        this.renderBelt();
        this.setStatus('Removed last command.');
      }
    });
  }

  private choose(command: Command): void {
    if (this.phase === 'running') return;
    this.selectedCommand = command;
    this.sfx.place();
    this.renderControls();
  }
}