import Phaser from "phaser";
import { createKitchenLayout, type KitchenLayout } from "../game/layout";
import { LEVELS, levelFor, type Cell, type Direction } from "../game/level";
import {
  rotate,
  traceKitchenLine,
  type RunPhase,
} from "../game/rules";

const COLORS = {
  ink: 0x3d291e,
  wood: 0x70452e,
  cream: 0xffedc4,
  gold: 0xffd77c,
  terracotta: 0xc95c43,
  green: 0x315d50,
  cell: 0xf8dda7,
  belt: 0xa66a48,
  route: 0xffef9a,
};
const ARROWS: Record<Direction, string> = {
  right: "→",
  down: "↓",
  left: "←",
  up: "↑",
};
const key = (cell: Cell) => `${cell.x},${cell.y}`;

class KitchenAudio {
  private context: AudioContext | null = null;
  unlock() {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
  }
  tone(frequency: number, duration = 0.12, type: OscillatorType = "sine") {
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
  placement() {
    this.tone(420);
  }
  rotate() {
    this.tone(560);
  }
  jam() {
    this.tone(130, 0.22, "sawtooth");
  }
  toaster() {
    this.tone(220, 0.5, "square");
  }
  ding() {
    this.tone(880, 0.2);
  }
  serve() {
    this.tone(660, 0.18);
    setTimeout(() => this.tone(990, 0.22), 100);
  }
  destroy() {
    void this.context?.close();
    this.context = null;
  }
}

export class KitchenScene extends Phaser.Scene {
  private layout!: KitchenLayout;
  private level = LEVELS[0]!;
  private belts = new Map<string, Direction>();
  private selected: Direction = "right";
  private phase: RunPhase = "editing";
  private message = "Build a line to the toaster.";
  private moving: Phaser.GameObjects.Container | null = null;
  private reduced = false;
  private audio = new KitchenAudio();
  private keyHandler!: (event: KeyboardEvent) => void;
  private resizePending = false;
  private jamCell: Cell | null = null;
  private itemGlyph = "🍞";

  constructor() {
    super("KitchenScene");
  }

  create() {
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.keyHandler = (event) => {
      if (event.key === "r") this.run();
      else if (event.key === "z") this.undo();
      else if (event.key === "c") this.clear();
      else if (event.key === "s") this.serve();
      else if (event.key === "1") this.selectDirection("right");
      else if (event.key === "2") this.selectDirection("down");
      else if (event.key === "3") this.selectDirection("left");
      else if (event.key === "4") this.selectDirection("up");
    };
    addEventListener("keydown", this.keyHandler);
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.redraw();
  }

  private shutdown() {
    removeEventListener("keydown", this.keyHandler);
    this.scale.off("resize", this.handleResize, this);
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.audio.destroy();
  }
  private announce() {
    const status = document.getElementById("kitchen-status");
    if (status) status.textContent = this.message;
  }
  private handleResize() {
    if (
      this.phase === "moving" ||
      this.phase === "toasting" ||
      this.phase === "serving"
    ) {
      this.resizePending = true;
      this.cancelMotionForResize();
      return;
    }
    this.redraw();
  }
  private cancelMotionForResize() {
    this.tweens.killAll();
    if (this.moving) {
      this.moving.destroy();
      this.moving = null;
    }
    this.phase = this.phase === "serving" ? "plated" : "editing";
    this.message =
      this.phase === "plated"
        ? "The toast is ready. Tap SERVE."
        : "Resize complete. Your belt line is ready to edit.";
    this.resizePending = false;
    this.redraw();
  }

  private redraw() {
    this.children.removeAll(true);
    this.moving = null;
    this.layout = createKitchenLayout(
      this.scale.width || innerWidth,
      this.scale.height || innerHeight,
    );
    this.drawBackground();
    this.drawBoard();
    this.drawPanel();
    this.drawControls();
    this.announce();
  }
  private text(
    x: number,
    y: number,
    content: string,
    size: number,
    color: number = COLORS.ink,
    bold = false,
    width?: number,
  ) {
    const style = {
      fontFamily: "Georgia, serif",
      fontSize: `${size}px`,
      color: `#${color.toString(16).padStart(6, "0")}`,
      fontStyle: bold ? "bold" : "normal",
      align: "center",
      ...(width ? { wordWrap: { width } } : {}),
    };
    return this.add.text(x, y, content, style).setOrigin(0.5);
  }
  private box(
    rect: { x: number; y: number; width: number; height: number },
    fill: number,
    stroke = COLORS.gold,
    radius = 14,
  ) {
    const graphics = this.add.graphics();
    graphics
      .fillStyle(fill, 1)
      .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, radius)
      .lineStyle(3, stroke, 1)
      .strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
    return graphics;
  }
  private drawBackground() {
    const graphics = this.add.graphics();
    graphics
      .fillStyle(0x164c45, 1)
      .fillRect(0, 0, this.scale.width, this.scale.height);
    for (let x = 0; x < this.scale.width; x += 44)
      for (let y = 0; y < this.scale.height; y += 44)
        graphics.fillStyle(0x2c7063, 0.2).fillCircle(x + 9, y + 14, 2);
  }
  private drawBoard() {
    this.box(this.layout.board, COLORS.wood, 0xd99553, 18);
    for (let i = 0; i < this.layout.cells.length; i += 1) {
      const cell = this.layout.cells[i]!;
      const coords = { x: i % 6, y: Math.floor(i / 6) };
      const station = this.stationAt(coords);
      const belt = this.belts.get(key(coords));
      const fill =
        station === "source"
          ? 0xf0b84e
          : station === "toaster"
            ? 0xe07b45
            : station === "plate"
              ? 0x7abf9e
              : belt
                ? COLORS.belt
                : COLORS.cell;
      this.box(
        cell,
        fill,
        station ? COLORS.gold : belt ? 0xdcae63 : 0xa9c77b,
        station ? 18 : 12,
      );
      if (belt) {
        this.text(
          cell.x + cell.width / 2,
          cell.y + cell.height / 2,
          ARROWS[belt],
          Math.max(28, cell.width * 0.36),
          COLORS.cream,
          true,
        );
        this.text(
          cell.x + cell.width / 2,
          cell.y + cell.height - 14,
          "BELT",
          11,
          COLORS.cream,
          true,
        );
      }
      if (station === "source") {
        this.text(
          cell.x + cell.width / 2,
          cell.y + cell.height * 0.37,
          "▰",
          Math.min(40, cell.width * 0.3),
          COLORS.ink,
          true,
        );
        this.text(
          cell.x + cell.width / 2,
          cell.y + cell.height * 0.74,
          "BREAD IN",
          12,
          COLORS.ink,
          true,
        );
      }
      if (station === "toaster") {
        this.text(
          cell.x + cell.width / 2,
          cell.y + cell.height * 0.35,
          "♨",
          Math.min(42, cell.width * 0.35),
          COLORS.ink,
        );
        this.text(
          cell.x + cell.width / 2,
          cell.y + cell.height * 0.74,
          "TOASTER",
          12,
          COLORS.ink,
          true,
        );
      }
      if (station === "plate") {
        this.text(
          cell.x + cell.width / 2,
          cell.y + cell.height * 0.35,
          "◉",
          Math.min(42, cell.width * 0.35),
          COLORS.ink,
        );
        this.text(
          cell.x + cell.width / 2,
          cell.y + cell.height * 0.74,
          "PLATE OUT",
          12,
          COLORS.ink,
          true,
        );
      }
    }
    if (this.jamCell) {
      const jamRect = this.layout.cells[this.jamCell.y * 6 + this.jamCell.x];
      if (jamRect) {
        const marker = this.add.graphics().setDepth(15);
        marker.lineStyle(7, 0xf04f45, 1).strokeRoundedRect(
          jamRect.x + 4, jamRect.y + 4, jamRect.width - 8, jamRect.height - 8, 14,
        );
        this.tweens.add({ targets: marker, alpha: 0.25, duration: 360, yoyo: true, repeat: -1 });
        this.text(jamRect.x + jamRect.width / 2, jamRect.y + 18, "FIX ME", 11, 0xf04f45, true).setDepth(16);
      }
    }
    for (const coords of this.level.cells) {
      const rect = this.layout.cells[coords.y * 6 + coords.x]!;
      const zone = this.add
        .zone(rect.x, rect.y, rect.width, rect.height)
        .setOrigin(0)
        .setInteractive();
      zone.on("pointerdown", () => this.tapCell(coords.x, coords.y));
    }
  }
  private stationAt(cell: Cell): "source" | "toaster" | "plate" | null {
    if (key(cell) === key(this.level.source)) return "source";
    if (key(cell) === key(this.level.toaster)) return "toaster";
    if (key(cell) === key(this.level.plate)) return "plate";
    return null;
  }
  private drawPanel() {
    const panel = this.layout.panel;
    this.box(panel, COLORS.wood, 0xd99553, 18);
    this.text(
      panel.x + panel.width / 2,
      panel.y + (this.layout.mode === "side" ? 30 : 27),
      "LITTLE CHEF'S",
      this.layout.mode === "side" ? 22 : 19,
      COLORS.cream,
      true,
    );
    this.text(
      panel.x + panel.width / 2,
      panel.y + (this.layout.mode === "side" ? 57 : 51),
      "GRAND KITCHEN",
      this.layout.mode === "side" ? 18 : 16,
      COLORS.gold,
      true,
    );
    this.text(
      panel.x + panel.width / 2,
      panel.y + (this.layout.mode === "side" ? 86 : 76),
      `KITCHEN ${this.level.id} • ${this.level.title}`,
      14,
      COLORS.cream,
      true,
      panel.width - 24,
    );
    if (this.layout.mode === "side") {
      this.drawCustomer(panel.x + panel.width / 2, panel.y + 122);
      this.text(
        panel.x + panel.width / 2,
        panel.y + 256,
        this.message,
        14,
        COLORS.cream,
        false,
        panel.width - 26,
      );
    } else {
      this.text(
        this.layout.status.x + this.layout.status.width / 2,
        this.layout.status.y + this.layout.status.height / 2,
        this.message,
        13,
        COLORS.cream,
        false,
        this.layout.status.width - 8,
      ).setOrigin(0.5, 0.5);
    }
  }
  private drawCustomer(x: number, y: number) {
    const bear = this.level.customerKind === "bear";
    const fur = bear ? 0x9b633f : 0xf1d3a6;
    const ear = bear ? 17 : 12;
    const graphics = this.add.graphics();
    graphics.fillStyle(fur, 1).fillCircle(x, y + 5, 34);
    if (bear)
      graphics.fillCircle(x - 27, y - 17, ear).fillCircle(x + 27, y - 17, ear);
    else
      graphics
        .fillTriangle(x - 29, y - 33, x - 16, y - 4, x - 36, y - 9)
        .fillTriangle(x + 29, y - 33, x + 16, y - 4, x + 36, y - 9);
    graphics
      .fillStyle(0x3d291e, 1)
      .fillCircle(x - 11, y - 1, 4)
      .fillCircle(x + 11, y - 1, 4)
      .lineStyle(4, 0x3d291e, 1)
      .arc(x, y + 10, 9, 0, Math.PI, false);
    this.text(
      x,
      y + 54,
      `${this.level.customer} ${bear ? "the bear" : "the bunny"}`,
      14,
      COLORS.cream,
      true,
    );
    this.text(
      x,
      y + 78,
      this.phase === "served"
        ? "“That was delicious!”"
        : "“I would love some toast!”",
      13,
      COLORS.cream,
      false,
      this.layout.panel.width - 20,
    );
  }
  private drawButton(
    rect: { x: number; y: number; width: number; height: number },
    label: string,
    action: () => void,
    disabled = false,
  ) {
    const graphic = this.box(
      rect,
      disabled ? 0x7d7569 : COLORS.terracotta,
      disabled ? 0xaaa18d : COLORS.gold,
    );
    graphic
      .setInteractive(
        new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height),
        Phaser.Geom.Rectangle.Contains,
      )
      .on("pointerdown", () => {
        if (!disabled) {
          this.audio.unlock();
          action();
        }
      });
    this.text(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      label,
      Math.min(18, rect.height * 0.38),
      COLORS.cream,
      true,
    );
  }
  private drawControls() {
    const buttons = this.layout.buttons;
    const isServable = this.phase === "plated";
    const primary =
      this.phase === "served"
        ? "NEXT KITCHEN"
        : isServable
          ? "SERVE DISH"
          : "RUN KITCHEN";
    this.drawButton(
      isServable || this.phase === "served" ? buttons.serve : buttons.run,
      primary,
      () =>
        isServable
          ? this.serve()
          : this.phase === "served"
            ? this.nextLevel()
            : this.run(),
      this.phase !== "served" &&
        this.phase !== "plated" &&
        this.phase !== "editing" &&
        this.phase !== "jammed",
    );
    this.drawButton(buttons.undo, "UNDO", () => this.undo(), false);
    this.drawButton(buttons.clear, "CLEAR", () => this.clear(), false);
    for (const direction of ["right", "down", "left", "up"] as const) {
      const rect = this.layout.directions[direction];
      const selected = this.selected === direction;
      const graphic = this.box(
        rect,
        selected ? COLORS.route : COLORS.green,
        COLORS.gold,
        9,
      );
      graphic
        .setInteractive(
          new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height),
          Phaser.Geom.Rectangle.Contains,
        )
        .on("pointerdown", () => {
          this.audio.unlock();
          this.selectDirection(direction);
        });
      this.text(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        `${ARROWS[direction]} ${direction.charAt(0).toUpperCase()}`,
        Math.min(15, rect.height * 0.4),
        selected ? COLORS.ink : COLORS.cream,
        true,
      );
    }
    this.text(
      this.layout.instructions.x + this.layout.instructions.width / 2,
      this.layout.instructions.y + this.layout.instructions.height / 2,
      "Tap a belt to place • tap again to rotate • R run • S serve",
      11,
      COLORS.cream,
      false,
      this.layout.instructions.width - 4,
    );
  }
  private selectDirection(direction: Direction) {
    this.selected = direction;
    this.message = `Selected ${direction} belt. Tap an empty belt cell.`;
    this.redraw();
  }
  private tapCell(x: number, y: number) {
    if (!["editing", "jammed"].includes(this.phase)) return;
    const cell = { x, y };
    const existing = this.belts.get(key(cell));
    if (existing) {
      this.belts.set(key(cell), rotate(existing));
      this.audio.unlock();
      this.audio.rotate();
      this.message = `Rotated ${ARROWS[rotate(existing)]} belt.`;
    } else {
      this.belts.set(key(cell), this.selected);
      this.audio.unlock();
      this.audio.placement();
      this.message = "Line ready? Run the kitchen!";
    }
    this.phase = "editing";
    this.jamCell = null;
    this.redraw();
  }
  private undo() {
    if (
      this.phase === "moving" ||
      this.phase === "toasting" ||
      this.phase === "serving"
    )
      return;
    const last = [...this.belts.keys()].pop();
    if (last) this.belts.delete(last);
    this.phase = "editing";
    this.message = "One belt removed. Keep cooking!";
    this.redraw();
  }
  private clear() {
    this.tweens.killAll();
    this.belts.clear();
    this.moving?.destroy();
    this.moving = null;
    this.phase = "editing";
    this.jamCell = null;
    this.message = "Build a line to the toaster.";
    this.redraw();
  }
  private run() {
    if (this.phase !== "editing" && this.phase !== "jammed") return;
    this.audio.unlock();
    const result = traceKitchenLine(this.level, this.belts);
    if (!result.ok) {
      this.phase = "jammed";
      this.jamCell = result.cell;
      this.message = result.message;
      this.audio.jam();
      this.redraw();
      return;
    }
    this.phase = "moving";
    this.message = "Bread is moving to the toaster!";
    this.redraw();
    this.animatePath(result.path, 0, false);
  }
  private animatePath(path: Cell[], index: number, toasted: boolean) {
    if (this.resizePending || index >= path.length) {
      this.phase = "plated";
      this.itemGlyph = "▰";
      this.message = "The toast is ready. Tap SERVE.";
      this.redraw();
      this.audio.ding();
      return;
    }
    const rect = this.layout.cells[path[index]!.y * 6 + path[index]!.x]!;
    if (!this.moving) {
      this.moving = this.add
        .container(rect.x + rect.width / 2, rect.y + rect.height / 2)
        .setDepth(30);
      this.moving.add(
        this.add.circle(0, 0, Math.min(18, this.layout.cell * 0.2), 0xd9953f),
      );
      this.moving.add(
        this.add
          .text(0, 0, this.itemGlyph, {
            fontSize: `${Math.min(28, this.layout.cell * 0.3)}px`,
          })
          .setOrigin(0.5),
      );
    }
    if (path[index] && key(path[index]!) === key(this.level.toaster)) {
      this.phase = "toasting";
      this.message = "The toaster is sizzling…";
      this.audio.toaster();
      this.redraw();
      this.time.delayedCall(this.reduced ? 100 : 700, () => {
        if (this.phase !== "toasting") return;
        this.phase = "moving";
        this.itemGlyph = "▰";
        this.moving = null;
        this.message = "Toast is popping onto the plate!";
        this.redraw();
        this.animatePath(path, index + 1, true);
      });
      return;
    }
    const target = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const duration = this.reduced ? 80 : 300;
    this.tweens.add({
      targets: this.moving,
      x: target.x,
      y: target.y,
      duration,
      ease: "Sine.inOut",
      onComplete: () => this.animatePath(path, index + 1, toasted),
    });
  }
  private serve() {
    if (this.phase !== "plated") return;
    this.audio.unlock();
    this.audio.serve();
    this.phase = "serving";
    this.message = `Serving ${this.level.customer}!`;
    this.redraw();
    const plate =
      this.layout.cells[this.level.plate.y * 6 + this.level.plate.x]!;
    const target = {
      x: this.layout.panel.x + this.layout.panel.width / 2,
      y: this.layout.panel.y + (this.layout.mode === "side" ? 124 : 68),
    };
    const dish = this.add
      .text(plate.x + plate.width / 2, plate.y + plate.height / 2, "🍞", {
        fontSize: `${Math.min(34, plate.width * 0.3)}px`,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: dish,
      x: target.x,
      y: target.y,
      scale: 1.3,
      duration: this.reduced ? 120 : 650,
      onComplete: () => {
        dish.destroy();
        this.phase = "served";
        this.message = `${this.level.customer} loved it!`;
        this.redraw();
        this.celebrate();
      },
    });
  }
  private celebrate() {
    this.audio.ding();
    const center =
      this.layout.mode === "side"
        ? {
            x: this.layout.panel.x + this.layout.panel.width / 2,
            y: this.layout.panel.y + 350,
          }
        : {
            x: this.layout.panel.x + this.layout.panel.width / 2,
            y: this.layout.panel.y + 95,
          };
    for (let i = 0; i < 10; i += 1) {
      const star = this.add.star(center.x, center.y, 5, 8, 20, COLORS.gold);
      this.tweens.add({
        targets: star,
        y: center.y - 55 - i * 3,
        alpha: 0,
        delay: i * 55,
        duration: this.reduced ? 100 : 650,
        onComplete: () => star.destroy(),
      });
    }
  }
  private nextLevel() {
    this.level = levelFor(this.level.id + 1);
    this.belts.clear();
    this.phase = "editing";
    this.message = "Build a line to the toaster.";
    this.redraw();
  }
}
