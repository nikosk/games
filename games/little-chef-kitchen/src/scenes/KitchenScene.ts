import Phaser from "phaser";
import { LEVEL, type PieceKind, type Point } from "../game/level";
import {
  freshKitchen,
  nextMatchingSocket,
  placePiece,
  placementsReady,
  type KitchenState,
} from "../game/rules";
import {
  createKitchenLayout,
  type KitchenLayout,
  type Rect,
} from "../game/layout";
import backgroundUrl from "../../assets/images/kitchen-background.webp";
import customerUrl from "../../assets/images/tilly-rabbit-display.png";

const C = {
  ink: 0x493327,
  wood: 0x75442e,
  cream: 0xfff3d4,
  gold: 0xf4c965,
  red: 0xc95c43,
  toast: 0xd77b31,
  dark: 0x533529,
};
export class KitchenScene extends Phaser.Scene {
  private level = LEVEL;
  private state: KitchenState = freshKitchen(this.level);
  private layout!: KitchenLayout;
  private selected: number | null = null;
  private dragging: number | null = null;
  private moved = false;
  private dragStart = { x: 0, y: 0 };
  private running = false;
  private pendingResize = false;
  private token = 0;
  private ghost: Phaser.GameObjects.Graphics | undefined;
  private ghostTween: Phaser.Tweens.Tween | undefined;
  private wrongTray: number | null = null;
  private reduced = false;
  private message = "Help Tilly make toast!";
  private audio?: AudioContext;
  private keyHandler!: (e: KeyboardEvent) => void;
  constructor() {
    super("KitchenScene");
  }
  preload() {
    this.load.image("kitchen-background", backgroundUrl);
    this.load.image("tilly-rabbit", customerUrl);
  }
  create() {
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.keyHandler = (e) => {
      if (e.key === "1") this.select(0);
      if (e.key === "2") this.select(1);
      if (e.key === "3") this.select(2);
      if (e.key.toLowerCase() === "n" && !this.running && this.state.complete)
        this.reset();
    };
    addEventListener("keydown", this.keyHandler);
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (
        this.dragging !== null &&
        Phaser.Math.Distance.Between(
          p.x,
          p.y,
          this.dragStart.x,
          this.dragStart.y,
        ) > 10
      )
        this.moved = true;
    });
    this.input.on("pointerup", () => {
      if (this.dragging !== null && this.moved)
        this.drop(this.input.activePointer.x, this.input.activePointer.y);
      else this.dragging = null;
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.redraw();
    this.showGhost();
  }
  private shutdown() {
    removeEventListener("keydown", this.keyHandler);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.tweens.killAll();
    this.time.removeAllEvents();
    void this.audio?.close();
  }
  private resize() {
    if (this.running) {
      this.pendingResize = true;
      return;
    }
    this.redraw();
  }
  private redraw() {
    this.ghostTween?.stop();
    this.ghost?.destroy();
    this.ghost = undefined;
    this.ghostTween = undefined;
    this.children.removeAll(true);
    this.layout = createKitchenLayout(
      this.scale.width,
      this.scale.height,
       );
    this.drawBackground();
    this.drawTitle();
    this.drawCounter();
    this.drawTray();
    this.drawTilly(this.layout.customer);
    if (this.state.complete) {
      this.drawToastOnPlate();
      this.drawNext();
    }
    this.announce();
  }
  private announce() {
    const el = document.getElementById("kitchen-status");
    if (el) el.textContent = this.message;
  }
  private graphics() {
    return this.add.graphics({});
  }
  private text(
    x: number,
    y: number,
    s: string,
    size: number,
    color = C.ink,
    bold = false,
  ) {
    return this.add
      .text(x, y, s, {
        fontFamily: "Georgia,serif",
        fontSize: `${size}px`,
        color: `#${color.toString(16).padStart(6, "0")}`,
        fontStyle: bold ? "bold" : "normal",
        align: "center",
      })
      .setOrigin(0.5);
  }
  private drawBackground() {
    const w = this.scale.width,
      h = this.scale.height;
    this.add.image(w / 2, h / 2, "kitchen-background").setDisplaySize(w, h);
    this.add.rectangle(w / 2, h / 2, w, h, 0xffe8b0, 0.06);
  }
  private drawTitle() {
    const r = this.layout.title,
      g = this.graphics();
    g.fillStyle(0x70452e, 0.88)
      .fillRoundedRect(r.x, r.y, r.width, r.height, 20)
      .lineStyle(3, C.gold, 0.9)
      .strokeRoundedRect(r.x, r.y, r.width, r.height, 20);
    this.text(
      r.x + r.width * 0.5,
      r.y + 26,
      "Help Tilly make toast!",
      Math.min(27, r.width * 0.06),
      C.cream,
      true,
    );
    if (this.message !== "Help Tilly make toast!")
      this.text(
        r.x + r.width * 0.5,
        r.y + 49,
        this.message,
        13,
        C.cream,
        false,
      );
  }
  private drawCounter() {
    const l = this.layout,
      g = this.graphics();
    g.fillStyle(0x6f432d, 0.11).fillRect(
      l.counter.x,
      l.counter.y,
      l.counter.width,
      l.counter.height,
    );
    g.lineStyle(3, 0xd99950, 0.18).strokeRect(
      l.counter.x,
      l.counter.y,
      l.counter.width,
      l.counter.height,
    );
    this.drawPantry(l.pantry);
    this.drawToaster(l.toaster);
    this.drawPlate(l.plate);
    l.sockets.forEach((r, i) => {
      this.drawSocket(
        r,
        this.level.socketKinds[i]!,
        this.state.placements[i] !== null,
      );
      const z = this.add
        .zone(r.x - 24, r.y - 24, r.width + 48, r.height + 48)
        .setOrigin(0)
        .setInteractive();
      z.on("pointerdown", () => {
        if (this.selected !== null)
          this.drop(r.x + r.width / 2, r.y + r.height / 2);
      });
      if (this.state.placements[i])
        this.drawPiece(r, this.state.placements[i]!);
    });
  }
  private drawPantry(r: Rect) {
    const g = this.graphics(),
      x = r.x,
      y = r.y,
      w = r.width,
      h = r.height;
    g.fillStyle(0x9c592f, 1)
      .fillRoundedRect(x, y + h * 0.18, w, h * 0.72, 16)
      .lineStyle(4, 0x5a3025, 1)
      .strokeRoundedRect(x, y + h * 0.18, w, h * 0.72, 16);
    g.fillStyle(0xd58b3f, 1).fillRoundedRect(
      x - 4,
      y + h * 0.08,
      w + 8,
      h * 0.25,
      12,
    );
    g.fillStyle(0xffc968, 1).fillEllipse(
      x + w * 0.5,
      y + h * 0.58,
      w * 0.7,
      h * 0.28,
    );
    g.fillStyle(0x6e3725, 1).fillEllipse(
      x + w * 0.5,
      y + h * 0.62,
      w * 0.32,
      h * 0.08,
    );
    this.text(
      x + w / 2,
      y + h * 0.9,
      "BREAD",
      Math.max(14, Math.min(20, w * 0.13)),
      C.cream,
      true,
    );
  }
  private drawToaster(r: Rect) {
    const g = this.graphics(),
      x = r.x,
      y = r.y,
      w = r.width,
      h = r.height;
    g.fillStyle(0xc95c43, 1)
      .fillRoundedRect(x, y + h * 0.18, w, h * 0.65, 18)
      .lineStyle(4, 0x6a3329, 1)
      .strokeRoundedRect(x, y + h * 0.18, w, h * 0.65, 18);
    g.fillStyle(0xf2a15b, 1).fillRoundedRect(
      x + w * 0.12,
      y + h * 0.1,
      w * 0.76,
      h * 0.2,
      10,
    );
    g.fillStyle(0x4a2825, 1)
      .fillRoundedRect(x + w * 0.2, y + h * 0.14, w * 0.22, h * 0.08, 4)
      .fillRoundedRect(x + w * 0.58, y + h * 0.14, w * 0.22, h * 0.08, 4);
    g.lineStyle(5, 0x4a2825, 1).lineBetween(
      x + w * 0.8,
      y + h * 0.4,
      x + w * 0.8,
      y + h * 0.7,
    );
    g.fillStyle(0xffd17b, 1).fillCircle(x + w * 0.8, y + h * 0.72, 5);
    this.text(
      x + w / 2,
      y + h * 0.9,
      "TOASTER",
      Math.max(14, Math.min(20, w * 0.13)),
      C.cream,
      true,
    );
  }
  private drawPlate(r: Rect) {
    const g = this.graphics(),
      x = r.x + r.width / 2,
      y = r.y + r.height * 0.54;
    g.fillStyle(0x5b392d, 0.35).fillEllipse(
      x + 4,
      y + 8,
      r.width * 0.8,
      r.height * 0.3,
    );
    g.fillStyle(0xf6eee0, 1)
      .fillEllipse(x, y, r.width * 0.82, r.height * 0.3)
      .lineStyle(4, 0x8cb5a0, 1)
      .strokeEllipse(x, y, r.width * 0.82, r.height * 0.3);
    g.fillStyle(0xd77b32, 1).fillEllipse(
      x,
      y - 2,
      r.width * 0.38,
      r.height * 0.13,
    );
    this.text(
      x,
      r.y + r.height * 0.9,
      "PLATE",
      Math.max(14, Math.min(20, r.width * 0.13)),
      C.cream,
      true,
    );
  }
  private drawSocket(r: Rect, _kind: PieceKind, filled: boolean) {
    const g = this.graphics();
    g.fillStyle(filled ? 0x8e5840 : 0x72503f, 0.65).fillRoundedRect(r.x, r.y, r.width, r.height, 12);
    g.lineStyle(5, filled ? 0xb77b4a : 0xffe28a, 1).strokeRoundedRect(r.x, r.y, r.width, r.height, 12);
    g.lineStyle(4, 0xffe8a8, 0.95);
    g.lineBetween(r.x + 8, r.y + 13, r.x + r.width - 8, r.y + 13);
    g.lineBetween(r.x + 8, r.y + r.height - 13, r.x + r.width - 8, r.y + r.height - 13);
    for (let i = 0; i < 3; i += 1) g.lineBetween(r.x + 18 + i * 18, r.y + 9, r.x + 18 + i * 18, r.y + r.height - 9);
  }
  private drawPiece(r: Rect, _kind: PieceKind, alpha = 1) {
    const g = this.graphics().setAlpha(alpha);
    g.fillStyle(0x573126, 1).fillRoundedRect(r.x, r.y, r.width, r.height, 10)
      .lineStyle(4, 0x9a5a3d, 1).strokeRoundedRect(r.x, r.y, r.width, r.height, 10);
    g.lineStyle(5, 0xffd76b, 1);
    g.lineBetween(r.x + 7, r.y + 11, r.x + r.width - 7, r.y + 11);
    g.lineBetween(r.x + 7, r.y + r.height - 11, r.x + r.width - 7, r.y + r.height - 11);
    g.lineStyle(3, 0xfff0bd, 1);
    for (let i = 0; i < 3; i += 1) g.lineBetween(r.x + 16 + i * 18, r.y + 7, r.x + 16 + i * 18, r.y + r.height - 7);
    g.fillStyle(0xffd76b, 1).fillTriangle(r.x + r.width - 22, r.y + r.height / 2 - 7, r.x + r.width - 8, r.y + r.height / 2, r.x + r.width - 22, r.y + r.height / 2 + 7);
    if (this.selected !== null && alpha === 1) {
      g.lineStyle(6, 0xffff80, 1).strokeRoundedRect(r.x - 7, r.y - 7, r.width + 14, r.height + 14, 14);
      g.setDepth(18);
      this.tweens.add({ targets: g, y: "-=5", alpha: 0.7, duration: 500, yoyo: true, repeat: -1 });
    }
  }
  private drawTilly(r: Rect) {
    const g = this.graphics();
    g.fillStyle(this.state.complete ? 0x9a6338 : 0x6b4033, 0.95).fillCircle(
      r.x + r.width / 2,
      r.y + r.height / 2,
      Math.min(r.width, r.height) / 2,
    );
    const img = this.add
      .image(r.x + r.width / 2, r.y + r.height / 2, "tilly-rabbit")
      .setDisplaySize(
        Math.min(r.width, r.height) * 0.92,
        Math.min(r.width, r.height) * 0.92,
      );
    const mask = this.make.graphics({ x: 0, y: 0 });
    mask
      .fillStyle(0xffffff)
      .fillCircle(
        r.x + r.width / 2,
        r.y + r.height / 2,
        Math.min(r.width, r.height) / 2 - 3,
      );
    img.setMask(mask.createGeometryMask());
    this.text(
      r.x + r.width / 2,
      r.y + r.height + 18,
      "Tilly",
      18,
      C.cream,
      true,
    );
  }
  private drawToastOnPlate() {
    const r = this.layout.plate;
    const g = this.graphics();
    const x = r.x + r.width / 2;
    const y = r.y + r.height * 0.48;
    g.fillStyle(0x8a4228, 1).fillRoundedRect(
      x - r.width * 0.2,
      y - r.height * 0.08,
      r.width * 0.4,
      r.height * 0.18,
      8,
    );
    g.fillStyle(0xb95f2f, 1).fillRoundedRect(
      x - r.width * 0.15,
      y - r.height * 0.12,
      r.width * 0.3,
      r.height * 0.1,
      5,
    );
    for (let i = -1; i <= 1; i += 1)
      g.lineStyle(3, 0x6c321f, 0.8).lineBetween(
        x + i * 8,
        y - r.height * 0.09,
        x + i * 6,
        y + r.height * 0.01,
      );
  }
  private drawNext() {
    const r = this.layout.counter;
    const b = { x: r.x + r.width * 0.72, y: r.y + r.height - 58, width: Math.min(190, r.width * 0.24), height: 44 };
    const g = this.graphics();
    g.fillStyle(C.red, 0.95).fillRoundedRect(b.x, b.y, b.width, b.height, 14).lineStyle(3, C.gold, 1).strokeRoundedRect(b.x, b.y, b.width, b.height, 14);
    this.text(b.x + b.width / 2, b.y + b.height / 2, "PLAY AGAIN", 15, C.cream, true);
    this.add.zone(b.x, b.y, b.width, b.height).setOrigin(0).setInteractive().on("pointerdown", () => this.reset());
  }
  private drawTray() {
    const r = this.layout.tray,
      g = this.graphics();
    g.fillStyle(0xffe8a8, 0.98)
      .fillRoundedRect(r.x, r.y, r.width, r.height, 18)
      .lineStyle(5, C.gold, 1)
      .strokeRoundedRect(r.x, r.y, r.width, r.height, 18);
    this.text(r.x + 38, r.y + 12, "BELT TRAY", 11, C.dark, true);
    const count = this.state.tray.length;
    this.state.tray.forEach((kind, i) => {
      const pieceR = {
        x: r.x + 18 + (i * (r.width - 36)) / Math.max(1, count),
        y: r.y + 24,
        width: Math.max(72, Math.min(120, (r.width - 36) / Math.max(1, count) - 10)),
        height: Math.max(44, r.height - 38),
      };
      this.drawPiece(pieceR, kind, this.selected === i ? 0.65 : 1);
      if (this.wrongTray === i) {
        const marker = this.graphics();
        marker
          .lineStyle(5, C.red, 1)
          .strokeRoundedRect(
            pieceR.x - 5,
            pieceR.y - 5,
            pieceR.width + 10,
            pieceR.height + 10,
            10,
          );
      }
      const z = this.add
        .zone(pieceR.x, pieceR.y, pieceR.width, pieceR.height)
        .setOrigin(0)
        .setInteractive();
      z.on("pointerdown", (p: Phaser.Input.Pointer) => {
        this.audioUnlock();
        this.selected = i;
        this.dragging = i;
        this.moved = false;
        this.dragStart = { x: p.x, y: p.y };
        this.redraw();
      });
    });
  }
  private select(i: number) {
    if (i >= this.state.tray.length || this.running) return;
    this.selected = i;
    this.redraw();
  }
  private drop(x: number, y: number) {
    const i = this.dragging ?? this.selected;
    if (i === null || i === undefined || this.running) return;
    this.dragging = null;
    const socket = this.layout.sockets.findIndex(
      (r) =>
        x >= r.x - 34 &&
        x <= r.x + r.width + 34 &&
        y >= r.y - 34 &&
        y <= r.y + r.height + 34,
    );
    if (socket < 0) {
      this.message = "Help Tilly make toast!";
      this.selected = null;
      this.redraw();
      return;
    }
    const result = placePiece(this.state, this.level, i, socket);
    if (result.result !== "placed") {
      this.selected = i;
      this.wrongTray = i;
      this.message = "That piece bounced back. Try the glowing gap.";
      this.redraw();
      this.tweenWrong(socket);
      this.showGhost();
      return;
    }
    this.state = result.state;
    const ready = placementsReady(this.state);
    this.selected = null;
    this.wrongTray = null;
    this.audioUnlock();
    this.redraw();
    if (ready) this.autoRun();
    else this.showGhost();
  }
  private tweenWrong(socket: number) {
    const r = this.layout.sockets[socket]!;
    const ring = this.graphics();
    ring
      .lineStyle(7, C.red, 1)
      .strokeRoundedRect(r.x - 5, r.y - 5, r.width + 10, r.height + 10, 12);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      duration: 350,
      yoyo: true,
      repeat: 2,
      onComplete: () => ring.destroy(),
    });
  }
  private showGhost() {
    this.ghostTween?.stop();
    this.ghost?.destroy();
    this.ghost = undefined;
    if (this.running || this.state.complete || this.state.tray.length === 0)
      return;
    const i = 0;
    const targetIndex = nextMatchingSocket(this.state, this.level, i);
    const target = this.layout.sockets[targetIndex];
    if (!target) return;
    const p = {
      x: this.layout.tray.x + this.layout.tray.width / 2,
      y: this.layout.tray.y + this.layout.tray.height / 2,
    };
    const q = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2,
    };
    const ghost = this.graphics();
    ghost.lineStyle(6, 0xffff8a, 0.95);
    ghost.lineBetween(-34, -13, 34, -13);
    ghost.lineBetween(-34, 13, 34, 13);
    for (let n = -20; n <= 20; n += 20) ghost.lineBetween(n, -13, n, 13);
    ghost.x = p.x;
    ghost.y = p.y;
    ghost.setDepth(25);
    this.ghost = ghost;
    this.ghostTween = this.tweens.add({
      targets: ghost,
      x: q.x,
      y: q.y,
      duration: this.reduced ? 450 : 1050,
      delay: 200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }
  private autoRun() {
    if (this.running) return;
    this.running = true;
    const runToken = ++this.token;
    this.message = "";
    this.redraw();
    const l = this.layout;
    const bread = this.add
      .container(
        l.pantry.x + l.pantry.width / 2,
        l.pantry.y + l.pantry.height * 0.45,
      )
      .setDepth(20);
    this.drawBread(bread);
    const points = this.level.path.map((p) => ({
      x: l.counter.x + l.counter.width * p.x,
      y: l.counter.y + l.counter.height * p.y,
    }));
    let index = 0;
    const step = () => {
      if (runToken !== this.token || !this.running) {
        bread.destroy();
        return;
      }
      if (index >= points.length) {
        this.toasting(bread, runToken);
        return;
      }
      const pt = points[index++]!;
      this.tweens.add({
        targets: bread,
        x: pt.x,
        y: pt.y,
        duration: this.reduced ? 140 : 430,
        ease: "Sine.inOut",
        onComplete: step,
      });
    };
    step();
  }
  private drawBread(c: Phaser.GameObjects.Container) {
    const g = this.add.graphics();
    g.fillStyle(0xf0b45f, 1)
      .fillRoundedRect(-24, -22, 48, 44, 13)
      .lineStyle(3, 0x9b542d, 1)
      .strokeRoundedRect(-24, -22, 48, 44, 13);
    g.fillStyle(0xffd684, 1).fillRoundedRect(-15, -14, 30, 7, 4);
    c.add(g);
  }
  private toasting(bread: Phaser.GameObjects.Container, t: number) {
    if (t !== this.token) return;
    const toaster = this.layout.toaster;
    this.tweens.add({
      targets: bread,
      x: toaster.x + toaster.width / 2,
      y: toaster.y + toaster.height * 0.38,
      duration: this.reduced ? 100 : 300,
      onComplete: () => {
        if (t !== this.token) return;
        this.tweens.add({
          targets: bread,
          angle: 3,
          yoyo: true,
          repeat: 3,
          duration: 100,
        });
        this.time.delayedCall(this.reduced ? 180 : 850, () =>
          this.finishRun(bread, t),
        );
      },
    });
  }
  private finishRun(bread: Phaser.GameObjects.Container, t: number) {
    if (t !== this.token) return;
    if (this.pendingResize) {
      this.pendingResize = false;
      bread.destroy();
      this.redraw();
    } else {
      bread.destroy();
    }
    const toast = this.add
      .container(
        this.layout.toaster.x + this.layout.toaster.width / 2,
        this.layout.toaster.y + this.layout.toaster.height * 0.2,
      )
      .setDepth(20);
    this.drawBread(toast);
    toast.angle = -5;
    this.tweens.add({
      targets: toast,
      y: "-=25",
      duration: this.reduced ? 120 : 350,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: toast,
          x: this.layout.plate.x + this.layout.plate.width / 2,
          y: this.layout.plate.y + this.layout.plate.height * 0.48,
          duration: this.reduced ? 120 : 500,
          onComplete: () => {
            if (t !== this.token) return;
            toast.destroy();
            this.running = false;
            this.state = { ...this.state, complete: true };
            this.redraw();
            this.celebrate();
          },
        });
      },
    });
  }
  private celebrate() {
    const r = this.layout.customer;
    for (let i = 0; i < 3; i++) {
      const heart = this.text(
        r.x + r.width * 0.35 + i * 18,
        r.y + r.height * 0.18,
        "♥",
        20,
        C.red,
        true,
      );
      this.tweens.add({
        targets: heart,
        y: "-=24",
        alpha: 0,
        delay: i * 100,
        duration: this.reduced ? 120 : 800,
        onComplete: () => heart.destroy(),
      });
    }
    for (let i = 0; i < 8; i++) {
      const star = this.add.star(
        r.x + r.width / 2,
        r.y + r.height / 2,
        5,
        7,
        18,
        C.gold,
      );
      this.tweens.add({
        targets: star,
        y: "-=35",
        alpha: 0,
        delay: i * 45,
        duration: this.reduced ? 120 : 600,
        onComplete: () => star.destroy(),
      });
    }
  }
  private reset() {
    this.token++;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.running = false;
    this.pendingResize = false;
    this.state = freshKitchen(this.level);
    this.selected = null;
    this.message = "Help Tilly make toast!";
    this.redraw();
    this.showGhost();
  }
  private audioUnlock() {
    if (!this.audio) this.audio = new AudioContext();
    if (this.audio.state === "suspended") void this.audio.resume();
  }
}
