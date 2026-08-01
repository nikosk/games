import Phaser from 'phaser';
import puzzlePanelUrl from '../../assets/images/puzzle-panel.webp';
import {
  ADDITION_ROUNDS,
  COUNT_GROUPS,
  COUNTING_STATIONS,
  TRAIN_ROUNDS,
  additionRoundAnswer,
  countMatches,
  countingComplete,
  createCountingState,
  solveCountingStation,
  trainRoundAnswer,
  type CountingState,
  type CountingStationId,
} from '../game/counting';

const W = 1280;
const H = 720;
const INK = 0x33415e;
const NIGHT = 0x241b38;
const CREAM = 0xffedce;
const GOLD = 0xf7c85f;
const ROSE = 0xe98798;
const TEAL = 0x5fc4a4;
const GREEN = 0x97d383;
const PURPLE = 0x9b8fd4;
const BLUE = 0x78b8d6;
const WALL = 0xf2a489;
const WALL_PANEL = 0xf8bda6;
const FLOOR = 0xf0a054;
const FLOOR_LINE = 0xd98b41;
const BOARD = 0xfffaf0;
const BOARD_INNER = 0xe2f0e7;

const STATION_POSITIONS: Readonly<Record<CountingStationId, { x: number; y: number }>> = {
  count: { x: 250, y: 350 },
  add: { x: 640, y: 350 },
  train: { x: 1030, y: 350 },
};

const NUMERAL_FONT = '"Arial Rounded MT Bold", "Trebuchet MS", "Arial", sans-serif';

function cssColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

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
  private state: CountingState = createCountingState();
  private readonly stations = new Map<CountingStationId, Phaser.GameObjects.Container>();
  private readonly sockets: Phaser.GameObjects.Graphics[] = [];
  private overlay: Phaser.GameObjects.Container | undefined;
  private guide: Phaser.GameObjects.Container | undefined;
  private overlayToken = 0;
  private finished = false;

  constructor() {
    super('CountingRoom');
  }

  preload(): void {
    this.load.image('puzzle-panel', puzzlePanelUrl);
  }

  create(): void {
    this.state = createCountingState();
    this.stations.clear();
    this.sockets.length = 0;
    this.overlay = undefined;
    this.finished = false;

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
    const background = this.add.graphics();
    background.fillStyle(WALL, 1);
    background.fillRect(0, 0, W, H);
    background.fillStyle(WALL_PANEL, 0.9);
    background.fillRoundedRect(38, 36, W - 76, 526, 38);
    background.lineStyle(6, CREAM, 0.5);
    background.strokeRoundedRect(38, 36, W - 76, 526, 38);
    for (let x = 85; x < W; x += 150) {
      background.lineStyle(2, CREAM, 0.09);
      background.lineBetween(x, 60, x + 35, 550);
    }

    // bunting garland
    background.lineStyle(4, CREAM, 0.5);
    background.lineBetween(60, 62, W - 60, 62);
    const flagColors = [TEAL, GREEN, PURPLE, GOLD, TEAL, GREEN, PURPLE, GOLD];
    flagColors.forEach((color, index) => {
      const fx = 300 + index * 130;
      const fy = 74;
      background.fillStyle(color, 0.9);
      background.fillTriangle(fx - 26, fy, fx + 26, fy, fx, fy + 46);
      background.lineStyle(3, INK, 0.35);
      background.lineBetween(fx - 26, fy, fx + 26, fy);
    });

    // cream trim, warm orange floor and purple rug
    background.fillStyle(CREAM, 0.9);
    background.fillRect(0, 556, W, 14);
    background.fillStyle(FLOOR, 1);
    background.fillRect(0, 570, W, 150);
    for (let y = 590; y < H; y += 36) {
      background.lineStyle(3, FLOOR_LINE, 0.4);
      background.lineBetween(0, y, W, y);
    }
    background.fillStyle(PURPLE, 1);
    background.fillEllipse(640, 652, 620, 116);
    background.lineStyle(6, CREAM, 0.7);
    background.strokeEllipse(640, 652, 620, 116);
    background.lineStyle(3, TEAL, 0.55);
    background.strokeEllipse(640, 652, 505, 86);

    // sunny window
    const window = this.add.graphics();
    window.fillStyle(CREAM, 1);
    window.fillRoundedRect(48, 62, 170, 128, 24);
    window.lineStyle(6, INK, 1);
    window.strokeRoundedRect(48, 62, 170, 128, 24);
    window.fillStyle(0xa9d8ef, 1);
    window.fillRoundedRect(60, 74, 146, 104, 14);
    window.fillStyle(GOLD, 1);
    window.fillCircle(102, 112, 24);
    window.fillStyle(CREAM, 0.95);
    window.fillEllipse(148, 104, 44, 14);
    window.fillEllipse(170, 112, 26, 10);
    window.fillStyle(CREAM, 1);
    window.fillRoundedRect(40, 184, 186, 12, 6);

    // star sockets across the top
    for (let index = 0; index < COUNTING_STATIONS.length; index += 1) {
      const socket = this.add.graphics();
      socket.setPosition(592 + index * 48, 150);
      this.sockets.push(socket);
    }

    this.createStation('count', this.drawCountingBoard());
    this.createStation('add', this.drawAdditionBoard());
    this.createStation('train', this.drawTrainBoard());

    for (let index = 0; index < 18; index += 1) {
      const dust = this.add.circle(
        Phaser.Math.Between(55, W - 55),
        Phaser.Math.Between(70, 545),
        Phaser.Math.Between(1, 3),
        GOLD,
        Phaser.Math.FloatBetween(0.2, 0.5),
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

  private createStation(id: CountingStationId, prop: Phaser.GameObjects.Container): void {
    const position = STATION_POSITIONS[id];
    prop.setPosition(position.x, position.y);
    prop.setSize(190, 230);
    prop.setInteractive({ useHandCursor: true });
    prop.on('pointerdown', () => this.openPuzzle(id));
    this.stations.set(id, prop);

    const halo = this.add.ellipse(0, 10, 210, 245, GOLD, 0.08).setDepth(-1);
    prop.addAt(halo, 0);
    prop.setData('halo', halo);
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

  private drawCountingBoard(): Phaser.GameObjects.Container {
    const c = this.add.container();
    const g = this.add.graphics();
    g.fillStyle(BOARD, 1);
    g.fillRoundedRect(-95, -115, 190, 230, 24);
    g.lineStyle(8, INK, 1);
    g.strokeRoundedRect(-95, -115, 190, 230, 24);
    g.fillStyle(BOARD_INNER, 1);
    g.fillRoundedRect(-78, -98, 156, 176, 16);
    c.add(g);

    const animals = this.add.graphics();
    animals.setPosition(0, -48);
    this.drawAnimal(animals, 0, -30, 0, 0.5);
    this.drawAnimal(animals, 1, 0, 0, 0.5);
    this.drawAnimal(animals, 2, 30, 0, 0.5);
    c.add(animals);

    [2, 3, 4].forEach((value, index) => {
      c.add(this.makeNumeral(-32 + index * 32, 42, value, 36, INK));
    });
    return c;
  }

  private drawAdditionBoard(): Phaser.GameObjects.Container {
    const c = this.add.container();
    const g = this.add.graphics();
    g.fillStyle(BOARD, 1);
    g.fillRoundedRect(-95, -115, 190, 230, 24);
    g.lineStyle(8, INK, 1);
    g.strokeRoundedRect(-95, -115, 190, 230, 24);
    g.fillStyle(BOARD_INNER, 1);
    g.fillRoundedRect(-78, -98, 156, 176, 16);
    c.add(g);

    const animals = this.add.graphics();
    animals.setPosition(0, -22);
    this.drawAnimal(animals, 1, -52, 0, 0.55);
    this.drawAnimal(animals, 1, 52, 0, 0.55);
    c.add(animals);
    c.add(this.makeSymbol(0, -16, '+', 52, GOLD));
    return c;
  }

  private drawTrainBoard(): Phaser.GameObjects.Container {
    const c = this.add.container();
    const g = this.add.graphics();
    g.fillStyle(ROSE, 1);
    g.fillRoundedRect(-88, -38, 84, 52, 16);
    g.lineStyle(5, INK, 1);
    g.strokeRoundedRect(-88, -38, 84, 52, 16);
    g.fillStyle(INK, 1);
    g.fillRect(-62, -64, 14, 26);
    g.fillStyle(BOARD_INNER, 1);
    g.fillRoundedRect(6, -30, 70, 44, 14);
    g.lineStyle(5, INK, 1);
    g.strokeRoundedRect(6, -30, 70, 44, 14);
    g.fillRoundedRect(82, -30, 70, 44, 14);
    g.strokeRoundedRect(82, -30, 70, 44, 14);
    g.fillStyle(INK, 1);
    g.fillCircle(-52, 20, 9);
    g.fillCircle(-18, 20, 9);
    g.fillCircle(41, 20, 9);
    g.fillCircle(117, 20, 9);
    g.fillStyle(CREAM, 1);
    g.fillCircle(-52, 20, 4);
    g.fillCircle(-18, 20, 4);
    g.fillCircle(41, 20, 4);
    g.fillCircle(117, 20, 4);
    c.add(g);
    c.add(this.makeNumeral(-52, -8, 1, 26, INK));
    c.add(this.makeNumeral(22, -8, 2, 26, INK));
    return c;
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
    COUNTING_STATIONS.forEach((id, index) => {
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
      } else if (!this.overlay && !this.finished) {
        station.setInteractive({ useHandCursor: true });
      }

      const socket = this.sockets[index]!;
      socket.clear();
      socket.fillStyle(solved ? GOLD : 0x44557d, 1);
      socket.fillPoints(starPoints(0, 0, 18, 8), true);
      socket.lineStyle(3, CREAM, solved ? 0.9 : 0.5);
      socket.strokePoints(starPoints(0, 0, 18, 8), true, true);
    });

    const next = COUNTING_STATIONS.find((id) => !this.state.solved[id]);
    if (this.guide && next && !this.finished) {
      const position = STATION_POSITIONS[next];
      this.guide.setVisible(true);
      this.tweens.add({ targets: this.guide, x: position.x, y: position.y - 145, duration: 750, ease: 'Sine.inOut' });
    } else if (this.finished) {
      this.guide?.setVisible(false);
    }
  }

  private openPuzzle(id: CountingStationId): void {
    if (this.overlay || this.state.solved[id] || this.finished) return;
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
    this.drawEmblem(emblem, id);
    overlay.add(emblem);

    if (id === 'count') this.createCountPuzzle(overlay, token);
    if (id === 'add') this.createAdditionPuzzle(overlay, token);
    if (id === 'train') this.createTrainPuzzle(overlay, token);

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

  private drawEmblem(g: Phaser.GameObjects.Graphics, id: CountingStationId): void {
    if (id === 'count') {
      g.fillStyle(ROSE, 1);
      g.fillCircle(-14, 0, 9);
      g.fillCircle(0, 0, 9);
      g.fillCircle(14, 0, 9);
      return;
    }
    if (id === 'add') {
      g.fillStyle(TEAL, 1);
      g.fillRect(-18, -5, 36, 10);
      g.fillRect(-5, -18, 10, 36);
      return;
    }
    g.fillStyle(BLUE, 1);
    g.fillRoundedRect(-20, -6, 40, 12, 5);
    g.fillStyle(INK, 1);
    g.fillRect(-12, -17, 8, 11);
    g.fillStyle(CREAM, 1);
    g.fillCircle(-10, 12, 5);
    g.fillCircle(10, 12, 5);
  }

  private createCountPuzzle(overlay: Phaser.GameObjects.Container, token: number): void {
    const groupXs = [-310, 0, 310];
    const groupY = -55;
    const zoneY = 65;
    const tileY = 228;
    const tileOrder = [4, 2, 3];
    const tileColor = GOLD;
    const zones: { x: number; y: number }[] = [];
    let matched = 0;

    COUNT_GROUPS.forEach((group, index) => {
      const x = groupXs[index]!;
      zones.push({ x, y: zoneY });

      const box = this.add.graphics();
      box.fillStyle(INK, 0.22);
      box.fillRoundedRect(x - 140, -165, 280, 292, 30);
      box.lineStyle(5, GOLD, 0.4);
      box.strokeRoundedRect(x - 140, -165, 280, 292, 30);
      overlay.add(box);

      const animals = this.add.graphics();
      animals.setPosition(x, groupY);
      this.drawAnimalGroup(animals, group.animal, group.count, 0, 0, 0.8);
      overlay.add(animals);

      const zone = this.add.graphics();
      zone.setPosition(x, zoneY);
      zone.fillStyle(CREAM, 0.1);
      zone.fillRoundedRect(-62, -62, 124, 124, 30);
      zone.lineStyle(6, GOLD, 0.85);
      zone.strokeRoundedRect(-62, -62, 124, 124, 30);
      overlay.add(zone);
    });

    tileOrder.forEach((numeral, position) => {
      const homeX = groupXs[position]!;
      const tile = this.makeNumeralTile(homeX, tileY, numeral, tileColor);
      tile.setData({ numeral, homeX, homeY: tileY, matched: false });
      overlay.add(tile);
      this.input.setDraggable(tile);

      tile.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (!tile.getData('matched')) tile.setPosition(dragX, dragY);
      });
      tile.on('dragend', () => {
        if (tile.getData('matched') || this.overlayToken !== token) return;
        let zoneIndex = -1;
        zones.forEach((zone, index) => {
          if (Phaser.Math.Distance.Between(tile.x, tile.y, zone.x, zone.y) < 115) zoneIndex = index;
        });
        const group = zoneIndex >= 0 ? COUNT_GROUPS[zoneIndex] : undefined;
        if (group && countMatches(group, numeral)) {
          tile.setData('matched', true);
          tile.disableInteractive();
          this.input.setDraggable(tile, false);
          matched += 1;
          const zone = zones[zoneIndex]!;
          this.tweens.add({ targets: tile, x: zone.x, y: zone.y, angle: 0, scale: 0.92, duration: 300, ease: 'Back.out' });
          this.burst(overlay, zone.x, zone.y, GOLD);
          if (matched === COUNT_GROUPS.length) {
            this.time.delayedCall(450, () => this.finishStation('count', token));
          }
        } else {
          this.tweens.add({
            targets: tile,
            x: tile.getData('homeX') as number,
            y: tile.getData('homeY') as number,
            angle: { from: -8, to: 0 },
            duration: 360,
            ease: 'Back.out',
          });
        }
      });
    });
  }

  private makeNumeralTile(x: number, y: number, numeral: number, color: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setSize(140, 140).setInteractive({ useHandCursor: true, draggable: true });
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-62, -62, 124, 124, 32);
    g.lineStyle(8, INK, 1);
    g.strokeRoundedRect(-62, -62, 124, 124, 32);
    c.add(g);
    c.add(this.makeNumeral(0, 0, numeral, 68, CREAM));
    return c;
  }

  private createAdditionPuzzle(overlay: Phaser.GameObjects.Container, token: number): void {
    let roundIndex = 0;
    let accepting = true;

    const dots = ADDITION_ROUNDS.map((_, index) => {
      const dot = this.add.graphics();
      dot.setPosition(-80 + index * 80, -235);
      overlay.add(dot);
      return dot;
    });

    const equation = this.add.container(0, -35);
    overlay.add(equation);

    const answers = [-220, 0, 220].map((x) => {
      const button = this.makeAnswerButton(x, 200, (choice: number, button: Phaser.GameObjects.Container) => {
        if (!accepting || this.overlayToken !== token) return;
        const round = ADDITION_ROUNDS[roundIndex]!;
        if (additionRoundAnswer(round, choice)) {
          accepting = false;
          equation.add(this.makeNumeral(250, 0, round.answer, 72, GOLD));
          this.burst(overlay, 250, -35, GOLD);
          this.updateDots(dots, roundIndex + 1);
          this.time.delayedCall(800, () => {
            if (this.overlayToken !== token) return;
            roundIndex += 1;
            if (roundIndex >= ADDITION_ROUNDS.length) {
              this.finishStation('add', token);
              return;
            }
            showRound();
            accepting = true;
          });
        } else {
          this.shake(button);
        }
      });
      overlay.add(button);
      return button;
    });

    const showRound = (): void => {
      const round = ADDITION_ROUNDS[roundIndex]!;
      equation.removeAll(true);
      const animals = this.add.graphics();
      this.drawAnimalGroup(animals, 1, round.left, -250, 0, 0.9);
      this.drawAnimalGroup(animals, 1, round.right, 30, 0, 0.9);
      equation.add(animals);
      equation.add(this.makeSymbol(-110, 0, '+', 66));
      equation.add(this.makeSymbol(170, 0, '=', 66));
      const slot = this.add.graphics();
      slot.fillStyle(CREAM, 0.08);
      slot.fillRoundedRect(188, -62, 124, 124, 30);
      slot.lineStyle(6, CREAM, 0.55);
      slot.strokeRoundedRect(188, -62, 124, 124, 30);
      equation.add(slot);
      answers.forEach((button, index) => {
        const text = button.getData('text') as Phaser.GameObjects.Text;
        text.setText(String(round.choices[index]!));
      });
      this.updateDots(dots, roundIndex);
    };

    showRound();
  }

  private createTrainPuzzle(overlay: Phaser.GameObjects.Container, token: number): void {
    let roundIndex = 0;
    let accepting = true;
    const trainXs = [-330, -110, 110, 330];

    const dots = TRAIN_ROUNDS.map((_, index) => {
      const dot = this.add.graphics();
      dot.setPosition(-80 + index * 80, -235);
      overlay.add(dot);
      return dot;
    });

    const train = this.add.container(0, -35);
    overlay.add(train);

    const answers = [-220, 0, 220].map((x) => {
      const button = this.makeAnswerButton(x, 200, (choice: number, button: Phaser.GameObjects.Container) => {
        if (!accepting || this.overlayToken !== token) return;
        const round = TRAIN_ROUNDS[roundIndex]!;
        if (trainRoundAnswer(round, choice)) {
          accepting = false;
          train.add(this.makeNumeral(trainXs[round.blankIndex]!, -4, round.answer, 64, CREAM));
          this.burst(overlay, trainXs[round.blankIndex]!, -35, GOLD);
          this.updateDots(dots, roundIndex + 1);
          this.time.delayedCall(800, () => {
            if (this.overlayToken !== token) return;
            roundIndex += 1;
            if (roundIndex >= TRAIN_ROUNDS.length) {
              this.finishStation('train', token);
              return;
            }
            showRound();
            accepting = true;
          });
        } else {
          this.shake(button);
        }
      });
      overlay.add(button);
      return button;
    });

    const showRound = (): void => {
      const round = TRAIN_ROUNDS[roundIndex]!;
      train.removeAll(true);
      round.sequence.forEach((value, index) => {
        const blank = index === round.blankIndex;
        train.add(this.makeCarriage(trainXs[index]!, 0, blank ? null : value, blank));
      });
      answers.forEach((button, index) => {
        const text = button.getData('text') as Phaser.GameObjects.Text;
        text.setText(String(round.choices[index]!));
      });
      this.updateDots(dots, roundIndex);
    };

    showRound();
  }

  private updateDots(dots: Phaser.GameObjects.Graphics[], roundIndex: number): void {
    dots.forEach((dot, index) => {
      dot.clear();
      dot.fillStyle(CREAM, 0.12);
      dot.fillCircle(0, 0, 20);
      dot.lineStyle(4, CREAM, 0.28);
      dot.strokeCircle(0, 0, 20);
      if (index < roundIndex) {
        dot.fillStyle(GOLD, 1);
        dot.fillCircle(0, 0, 20);
        dot.fillStyle(CREAM, 1);
        dot.fillPoints(starPoints(0, 0, 11, 5), true);
      }
    });
  }

  private makeCarriage(x: number, y: number, value: number | null, blank: boolean): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    if (blank) {
      g.fillStyle(CREAM, 0.16);
    } else {
      g.fillStyle(BOARD_INNER, 1);
    }
    g.fillRoundedRect(-85, -55, 170, 110, 26);
    g.lineStyle(7, INK, 1);
    g.strokeRoundedRect(-85, -55, 170, 110, 26);
    if (blank) {
      g.lineStyle(4, CREAM, 0.5);
      g.strokeRoundedRect(-72, -42, 144, 84, 18);
    }
    g.fillStyle(INK, 1);
    g.fillCircle(-48, 62, 16);
    g.fillCircle(48, 62, 16);
    g.fillStyle(CREAM, 1);
    g.fillCircle(-48, 62, 6);
    g.fillCircle(48, 62, 6);
    c.add(g);
    if (value !== null) {
      c.add(this.makeNumeral(0, -4, value, 64, INK));
    }
    return c;
  }

  private makeAnswerButton(
    x: number,
    y: number,
    onTap: (choice: number, button: Phaser.GameObjects.Container) => void,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setSize(160, 160).setInteractive({ useHandCursor: true });
    const g = this.add.graphics();
    g.fillStyle(CREAM, 1);
    g.fillCircle(0, 0, 74);
    g.lineStyle(9, INK, 1);
    g.strokeCircle(0, 0, 74);
    c.add(g);
    const text = this.makeNumeral(0, 0, 0, 80, INK);
    c.add(text);
    c.setData('text', text);
    c.on('pointerdown', () => onTap(Number(text.text), c));
    return c;
  }

  private makeNumeral(x: number, y: number, value: number, size: number, color = CREAM): Phaser.GameObjects.Text {
    return this.add.text(x, y, String(value), {
      fontFamily: NUMERAL_FONT,
      fontSize: `${Math.round(size)}px`,
      fontStyle: 'bold',
      color: cssColor(color),
      stroke: cssColor(INK),
      strokeThickness: Math.max(3, Math.round(size * 0.12)),
    }).setOrigin(0.5);
  }

  private makeSymbol(x: number, y: number, symbol: '+' | '=', size: number, color = CREAM): Phaser.GameObjects.Text {
    return this.add.text(x, y, symbol, {
      fontFamily: NUMERAL_FONT,
      fontSize: `${Math.round(size)}px`,
      fontStyle: 'bold',
      color: cssColor(color),
      stroke: cssColor(INK),
      strokeThickness: Math.max(3, Math.round(size * 0.12)),
    }).setOrigin(0.5);
  }

  private shake(target: Phaser.GameObjects.GameObject): void {
    this.tweens.add({
      targets: target,
      x: (target as Phaser.GameObjects.Container).x - 14,
      duration: 70,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.inOut',
    });
  }

  private drawAnimalGroup(
    g: Phaser.GameObjects.Graphics,
    animal: number,
    count: number,
    centerX: number,
    centerY: number,
    scale: number,
  ): void {
    const spacing = 58 * scale;
    const startX = centerX - ((count - 1) * spacing) / 2;
    for (let index = 0; index < count; index += 1) {
      this.drawAnimal(g, animal, startX + index * spacing, centerY, scale);
    }
  }

  private drawAnimal(g: Phaser.GameObjects.Graphics, animal: number, x: number, y: number, scale: number): void {
    g.save();
    g.translateCanvas(x, y);
    g.scaleCanvas(scale, scale);
    g.lineStyle(4, INK, 1);
    if (animal === 0) {
      // rabbit
      g.fillStyle(ROSE, 1);
      g.fillEllipse(-10, -48, 18, 32);
      g.strokeEllipse(-10, -48, 18, 32);
      g.fillEllipse(10, -48, 18, 32);
      g.strokeEllipse(10, -48, 18, 32);
      g.fillCircle(0, -20, 22);
      g.strokeCircle(0, -20, 22);
      g.fillEllipse(0, 16, 40, 48);
      g.strokeEllipse(0, 16, 40, 48);
      g.fillStyle(CREAM, 0.9);
      g.fillEllipse(0, 22, 20, 26);
      g.fillStyle(CREAM, 1);
      g.fillCircle(22, 26, 8);
      g.strokeCircle(22, 26, 8);
      g.fillStyle(INK, 1);
      g.fillCircle(-8, -22, 3);
      g.fillCircle(8, -22, 3);
      g.fillCircle(0, -14, 3);
    } else if (animal === 1) {
      // duck
      g.fillStyle(GOLD, 1);
      g.fillEllipse(0, 8, 42, 36);
      g.strokeEllipse(0, 8, 42, 36);
      g.fillCircle(0, -22, 19);
      g.strokeCircle(0, -22, 19);
      g.fillStyle(0xff8c42, 1);
      g.fillTriangle(-7, -18, 7, -18, 0, -6);
      g.lineStyle(3, INK, 1);
      g.strokeTriangle(-7, -18, 7, -18, 0, -6);
      g.fillStyle(INK, 1);
      g.fillCircle(0, -26, 3);
      g.fillStyle(CREAM, 0.85);
      g.fillEllipse(-4, 10, 16, 10);
    } else {
      // fish
      g.fillStyle(BLUE, 1);
      g.fillTriangle(-38, 0, -18, -16, -18, 16);
      g.strokeTriangle(-38, 0, -18, -16, -18, 16);
      g.fillEllipse(0, 0, 56, 34);
      g.strokeEllipse(0, 0, 56, 34);
      g.fillStyle(CREAM, 0.8);
      g.fillEllipse(-6, 8, 28, 13);
      g.fillStyle(BLUE, 1);
      g.fillTriangle(0, -14, 12, -14, 6, -26);
      g.strokeTriangle(0, -14, 12, -14, 6, -26);
      g.fillStyle(INK, 1);
      g.fillCircle(16, -6, 3.5);
    }
    g.restore();
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

  private finishStation(id: CountingStationId, token: number): void {
    if (!this.overlay || this.overlayToken !== token || this.state.solved[id]) return;
    this.state = solveCountingStation(this.state, id);

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
      if (this.overlayToken === token) this.closeOverlay();
      this.refreshRoom();
      this.maybeFinishLevel();
    });
  }

  private closeOverlay(): void {
    if (!this.overlay) return;
    this.overlayToken += 1;
    this.overlay.destroy(true);
    this.overlay = undefined;
    this.refreshRoom();
    this.maybeFinishLevel();
  }

  private maybeFinishLevel(): void {
    if (!this.finished && countingComplete(this.state)) this.showLevelEnd();
  }

  private showLevelEnd(): void {
    if (this.finished) return;
    this.finished = true;
    this.guide?.setVisible(false);
    for (const station of this.stations.values()) station.disableInteractive();

    const crown = this.add.graphics().setDepth(51).setPosition(640, 300);
    crown.fillStyle(GOLD, 1);
    crown.fillPoints(starPoints(0, 0, 55, 24), true);
    crown.lineStyle(6, CREAM, 0.9);
    crown.strokePoints(starPoints(0, 0, 55, 24), true, true);
    crown.setScale(0);
    this.tweens.add({ targets: crown, scale: 1, angle: 360, duration: 700, ease: 'Back.out' });
    this.tweens.add({ targets: crown, y: 280, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const replay = this.add.container(640, 490).setDepth(52).setSize(130, 130).setInteractive({ useHandCursor: true });
    const g = this.add.graphics();
    g.fillStyle(CREAM, 0.95);
    g.fillCircle(0, 0, 58);
    g.lineStyle(9, TEAL, 1);
    g.beginPath();
    g.arc(0, 0, 29, -0.7, 4.75);
    g.strokePath();
    g.fillStyle(TEAL, 1);
    g.fillTriangle(-8, -36, 20, -42, 12, -16);
    replay.add(g);
    replay.setScale(0);
    this.tweens.add({ targets: replay, scale: 1, delay: 500, duration: 450, ease: 'Back.out' });
    replay.on('pointerdown', () => this.scene.start('Toyshop'));

    for (let index = 0; index < 30; index += 1) {
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
  }
}
