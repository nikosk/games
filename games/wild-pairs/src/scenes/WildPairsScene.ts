import Phaser from 'phaser';
import { drawPortrait } from '../game/animals';
import { createWildPairsLayout, type Rect, type WildPairsLayout } from '../game/layout';
import {
  canChoose,
  createGameState,
  isComplete,
  markPairMatched,
  resolvePair,
  type GameState,
  DIFFICULTIES,
  getDifficulty,
  type DifficultyConfig,
  type DifficultyId,
} from '../game/rules';

const COLORS = {
  paper: 0xf3e6c8,
  paperLight: 0xfff8e5,
  ink: 0x35483d,
  meadow: 0x799b72,
  meadowLight: 0xb8cf9f,
  moss: 0x4f7355,
  butter: 0xe8c875,
  sky: 0xb9d7d0,
  terracotta: 0xb86f55,
  berry: 0x9a5960,
} as const;

interface ButtonResult {
  readonly container: Phaser.GameObjects.Container;
  readonly label: Phaser.GameObjects.Text;
}

export class WildPairsScene extends Phaser.Scene {
  private difficulty: DifficultyConfig = DIFFICULTIES[0]!;
  private state: GameState = createGameState(Math.random, this.difficulty);
  private layout!: WildPairsLayout;
  private views: Phaser.GameObjects.Container[] = [];
  private cardBacks: Phaser.GameObjects.Graphics[] = [];
  private cardFronts: Phaser.GameObjects.Container[] = [];
  private cardFrontGraphics: Phaser.GameObjects.Graphics[] = [];
  private cardCaptions: Phaser.GameObjects.Text[] = [];
  private focusRings: Phaser.GameObjects.Graphics[] = [];
  private busy = false;
  private pendingRedraw = false;
  private reducedMotion = false;
  private keyboardIndex = 0;
  private status = 'Turn over two meadow friends.';
  private movesText: Phaser.GameObjects.Text | undefined;
  private pairsText: Phaser.GameObjects.Text | undefined;
  private statusText: Phaser.GameObjects.Text | undefined;
  private fullscreenText: Phaser.GameObjects.Text | undefined;
  private completionObjects: Phaser.GameObjects.GameObject[] = [];
  private transientObjects: Phaser.GameObjects.GameObject[] = [];
  private audio: AudioContext | undefined;

  constructor() {
    super('WildPairs');
  }

  create(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, this.handleFullscreenChange, this);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.handleFullscreenChange, this);
    this.scale.on(Phaser.Scale.Events.FULLSCREEN_FAILED, this.handleFullscreenFailure, this);
    this.scale.on(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, this.handleFullscreenFailure, this);
    this.installKeyboardControls();
    this.redraw();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private redraw(): void {
    if (this.busy) {
      this.pendingRedraw = true;
      return;
    }

    this.tweens.killAll();
    this.children.removeAll(true);
    this.views = [];
    this.cardBacks = [];
    this.cardFronts = [];
    this.cardFrontGraphics = [];
    this.cardCaptions = [];
    this.focusRings = [];
    this.completionObjects = [];
    this.transientObjects = [];
    this.movesText = undefined;
    this.pairsText = undefined;
    this.statusText = undefined;
    this.fullscreenText = undefined;
    this.layout = createWildPairsLayout(this.scale.width, this.scale.height, this.difficulty);

    this.drawMeadow();
    this.drawJournalBoard();
    this.drawPanel();
    this.state.cards.forEach((_card, index) => this.createCard(index));
    this.updateKeyboardFocus();

    if (isComplete(this.state)) this.drawCompletionStamp();
  }

  private drawMeadow(): void {
    const { width, height } = this.layout;
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.meadowLight);

    const background = this.add.graphics();
    background.fillStyle(COLORS.sky, 0.72);
    background.fillRect(0, 0, width, height * 0.42);
    background.fillStyle(0x8faf82, 0.58);
    background.fillEllipse(width * 0.22, height * 0.45, width * 0.72, height * 0.25);
    background.fillStyle(COLORS.meadow, 0.62);
    background.fillEllipse(width * 0.72, height * 0.5, width * 0.9, height * 0.32);

    background.lineStyle(2, COLORS.moss, 0.25);
    for (let index = 0; index < 54; index += 1) {
      const x = (index * 83 + 17) % width;
      const y = height * 0.42 + ((index * 47) % Math.max(80, height * 0.58));
      background.lineBetween(x, y, x + 4, y - 11);
      background.lineBetween(x + 4, y - 2, x + 10, y - 8);
    }

    const flowerColors = [COLORS.butter, COLORS.terracotta, COLORS.berry, COLORS.paperLight];
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 137 + 31) % width;
      const y = height * 0.5 + ((index * 71) % Math.max(60, height * 0.5));
      background.fillStyle(flowerColors[index % flowerColors.length]!, 0.72);
      background.fillCircle(x - 3, y, 2.5);
      background.fillCircle(x + 3, y, 2.5);
      background.fillCircle(x, y - 3, 2.5);
      background.fillStyle(COLORS.butter, 0.9);
      background.fillCircle(x, y, 1.8);
    }
  }

  private drawJournalBoard(): void {
    const grid = this.layout.grid;
    const frame = this.add.graphics();
    frame.fillStyle(COLORS.paper, 0.34);
    frame.fillRoundedRect(grid.x - 10, grid.y - 10, grid.width + 20, grid.height + 20, 18);
    frame.lineStyle(2, COLORS.ink, 0.28);
    frame.strokeRoundedRect(grid.x - 10, grid.y - 10, grid.width + 20, grid.height + 20, 18);

    frame.fillStyle(COLORS.butter, 0.52);
    frame.fillRect(grid.x - 3, grid.y - 14, 42, 12);
    frame.fillRect(grid.x + grid.width - 39, grid.y + grid.height + 2, 42, 12);
  }

  private drawPanel(): void {
    const panel = this.layout.panel;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3e503f, 0.18);
    graphics.fillRoundedRect(panel.x + 5, panel.y + 7, panel.width, panel.height, 18);
    graphics.fillStyle(COLORS.paper, 0.97);
    graphics.fillRoundedRect(panel.x, panel.y, panel.width, panel.height, 18);
    graphics.lineStyle(2, COLORS.ink, 0.52);
    graphics.strokeRoundedRect(panel.x, panel.y, panel.width, panel.height, 18);

    if (this.layout.mode === 'side') this.drawSidePanel(panel);
    else this.drawTopPanel(panel);
  }

  private drawSidePanel(panel: Rect): void {
    const padding = 16;
    this.add.text(panel.x + padding, panel.y + 18, 'WILD PAIRS', {
      fontFamily: 'Georgia, serif',
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#35483d',
    });
    this.add.text(panel.x + padding, panel.y + 48, 'MEADOW FIELD NOTES', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#799b72',
      letterSpacing: 1.2,
    });

    this.statusText = this.add.text(panel.x + padding, panel.y + 82, this.status, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      fontStyle: 'italic',
      color: '#596a4b',
      wordWrap: { width: panel.width - padding * 2 },
    });

    this.movesText = this.add.text(panel.x + padding, panel.y + 148, `MOVES\n${this.state.moves}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#35483d',
      align: 'center',
    });
    this.pairsText = this.add.text(panel.x + panel.width / 2 + 10, panel.y + 148, `PAIRS\n${this.state.pairs} / ${this.difficulty.pairs}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#35483d',
      align: 'center',
    });

    const divider = this.add.graphics();
    divider.lineStyle(1, COLORS.ink, 0.28);
    divider.lineBetween(
      panel.x + padding,
      panel.y + 210,
      panel.x + panel.width - padding,
      panel.y + 210,
    );

    this.drawDifficultyControls(panel.x + padding, panel.y + 270, panel.width - padding * 2);
    this.add.text(panel.x + padding, panel.y + 228, 'Tap two cards. Matches stay in your journal.', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#637453',
      wordWrap: { width: panel.width - padding * 2 },
    });

    const replay = this.createButton(
      panel.x + padding,
      panel.y + panel.height - 116,
      panel.width - padding * 2,
      46,
      'REPLAY',
      () => this.restartGame(),
      COLORS.paperLight,
      COLORS.terracotta,
    );
    const fullscreen = this.createButton(
      panel.x + padding,
      panel.y + panel.height - 60,
      panel.width - padding * 2,
      46,
      this.fullscreenLabel(),
      () => this.toggleFullscreen(),
      0xe9edcf,
      COLORS.moss,
    );
    this.fullscreenText = fullscreen.label;
    replay.container.setDepth(5);
    fullscreen.container.setDepth(5);
  }

  private drawTopPanel(panel: Rect): void {
    const portrait = this.layout.mode === 'portrait';
    this.add.text(panel.x + 12, panel.y + 8, 'WILD PAIRS', {
      fontFamily: 'Georgia, serif',
      fontSize: portrait ? '17px' : '18px',
      fontStyle: 'bold',
      color: '#35483d',
    });

    this.movesText = this.add.text(panel.x + 12, panel.y + 36, `Moves ${this.state.moves}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#35483d',
    });
    this.pairsText = this.add.text(panel.x + 92, panel.y + 36, `Pairs ${this.state.pairs}/${this.difficulty.pairs}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#35483d',
    });

    const fullscreenWidth = 108;
    const replayWidth = 92;
    const buttonY = panel.y + 8;
    const fullscreen = this.createButton(
      panel.x + panel.width - fullscreenWidth - 10,
      buttonY,
      fullscreenWidth,
      38,
      this.fullscreenLabel(),
      () => this.toggleFullscreen(),
      0xe9edcf,
      COLORS.moss,
      11,
    );
    this.createButton(
      panel.x + panel.width - fullscreenWidth - replayWidth - 18,
      buttonY,
      replayWidth,
      38,
      'REPLAY',
      () => this.restartGame(),
      COLORS.paperLight,
      COLORS.terracotta,
      12,
    );
    this.fullscreenText = fullscreen.label;

    const selectorWidth = portrait ? panel.width - 24 : Math.min(360, panel.width - 250);
    this.drawDifficultyControls(
      panel.x + 12,
      panel.y + (portrait ? 70 : 50),
      selectorWidth,
      portrait ? 34 : 28,
    );

    if (portrait) {
      this.statusText = this.add.text(panel.x + 12, panel.y + 108, this.status, {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        fontStyle: 'italic',
        color: '#637453',
        wordWrap: { width: panel.width - 24 },
      });
    }
  }

  private drawDifficultyControls(x: number, y: number, width: number, height = 36): void {
    const buttonWidth = (width - 12) / 4;
    DIFFICULTIES.forEach((difficulty, index) => {
      const button = this.createButton(
        x + index * (buttonWidth + 4),
        y,
        buttonWidth,
        height,
        difficulty.label,
        () => this.changeDifficulty(difficulty.id),
        difficulty.id === this.difficulty.id ? COLORS.butter : COLORS.paperLight,
        COLORS.ink,
        11,
      );
      button.container.setDepth(5);
    });
  }

  private changeDifficulty(id: DifficultyId): void {
    if (id === this.difficulty.id) return;
    this.difficulty = getDifficulty(id);
    this.resetBoard(`A fresh ${this.difficulty.label} meadow page.`);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    callback: () => void,
    fill: number,
    textColor: number,
    fontSize = 14,
  ): ButtonResult {
    const container = this.add.container(x + width / 2, y + height / 2);
    const background = this.add.graphics();
    background.fillStyle(0x35483d, 0.16);
    background.fillRoundedRect(-width / 2, -height / 2 + 4, width, height, 10);
    background.fillStyle(fill, 1);
    background.fillRoundedRect(-width / 2, -height / 2, width, height - 4, 10);
    background.lineStyle(2, COLORS.ink, 0.38);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height - 4, 10);

    const text = this.add.text(0, -2, label, {
      fontFamily: 'Georgia, serif',
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color: `#${textColor.toString(16).padStart(6, '0')}`,
      align: 'center',
    }).setOrigin(0.5);

    container.add([background, text]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      container.setScale(0.97);
      callback();
    });
    container.on('pointerup', () => container.setScale(1));
    container.on('pointerout', () => container.setScale(1));
    return { container, label: text };
  }

  private createCard(index: number): void {
    const rect = this.layout.cards[index]!;
    const view = this.add.container(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );
    view.setSize(rect.width, rect.height);
    view.setInteractive({ useHandCursor: true });
    view.on('pointerdown', () => {
      this.keyboardIndex = index;
      this.updateKeyboardFocus();
      this.chooseCard(index);
    });

    const back = this.createBackFace(rect);
    const front = this.createFrontFace(index, rect);
    const focusRing = this.createFocusRing(rect);
    view.add([back, front, focusRing]);
    this.views[index] = view;
    this.cardBacks[index] = back;
    this.cardFronts[index] = front;
    this.focusRings[index] = focusRing;
    this.updateCardFace(index);
  }

  private createBackFace(rect: Rect): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.moss, 0.2);
    graphics.fillRoundedRect(-rect.width / 2 + 4, -rect.height / 2 + 6, rect.width, rect.height, 14);
    graphics.fillStyle(0x66805c, 1);
    graphics.fillRoundedRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, 14);
    graphics.lineStyle(3, COLORS.paper, 0.84);
    graphics.strokeRoundedRect(
      -rect.width / 2 + 8,
      -rect.height / 2 + 8,
      rect.width - 16,
      rect.height - 16,
      10,
    );

    graphics.lineStyle(1, COLORS.meadowLight, 0.3);
    for (let line = -rect.width / 2 + 18; line < rect.width / 2; line += 16) {
      graphics.lineBetween(line, -rect.height / 2 + 12, line + 32, rect.height / 2 - 12);
    }

    const emblemSize = Math.min(rect.width, rect.height) * 0.2;
    graphics.lineStyle(2, COLORS.butter, 0.9);
    graphics.strokeCircle(0, 0, emblemSize);
    graphics.fillStyle(COLORS.butter, 0.9);
    graphics.fillEllipse(-emblemSize * 0.55, 0, emblemSize * 0.7, emblemSize * 0.35);
    graphics.fillEllipse(emblemSize * 0.55, 0, emblemSize * 0.7, emblemSize * 0.35);
    graphics.fillEllipse(0, -emblemSize * 0.55, emblemSize * 0.35, emblemSize * 0.7);
    graphics.fillEllipse(0, emblemSize * 0.55, emblemSize * 0.35, emblemSize * 0.7);
    return graphics;
  }

  private createFrontFace(index: number, rect: Rect): Phaser.GameObjects.Container {
    const face = this.add.container(0, 0);
    const graphics = this.add.graphics();
    const caption = this.add.text(0, rect.height * 0.34, '', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.max(9, Math.min(16, Math.round(rect.width / 12)))}px`,
      fontStyle: 'bold',
      color: '#596a4b',
      letterSpacing: 1,
    }).setOrigin(0.5);
    caption.setVisible(rect.width >= 62 && rect.height >= 70);
    face.add([graphics, caption]);
    this.cardFrontGraphics[index] = graphics;
    this.cardCaptions[index] = caption;
    this.paintFrontFace(index, rect);
    return face;
  }

  private paintFrontFace(index: number, rect: Rect): void {
    const card = this.state.cards[index]!;
    const graphics = this.cardFrontGraphics[index]!;
    graphics.clear();
    graphics.fillStyle(COLORS.ink, 0.15);
    graphics.fillRoundedRect(-rect.width / 2 + 4, -rect.height / 2 + 6, rect.width, rect.height, 14);
    graphics.fillStyle(COLORS.paperLight, 1);
    graphics.fillRoundedRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, 14);
    graphics.lineStyle(3, COLORS.terracotta, 0.58);
    graphics.strokeRoundedRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, 14);

    graphics.fillStyle(COLORS.sky, 0.14);
    graphics.fillCircle(-rect.width * 0.15, -rect.height * 0.1, Math.min(rect.width, rect.height) * 0.34);
    graphics.fillStyle(COLORS.meadowLight, 0.12);
    graphics.fillCircle(rect.width * 0.12, rect.height * 0.06, Math.min(rect.width, rect.height) * 0.3);
    drawPortrait(
      graphics,
      card.animal,
      0,
      -rect.height * 0.07,
      Math.min(rect.width, rect.height) * 0.3,
    );
    this.cardCaptions[index]!.setText(card.animal.toUpperCase());
  }

  private createFocusRing(rect: Rect): Phaser.GameObjects.Graphics {
    const ring = this.add.graphics();
    ring.lineStyle(3, COLORS.butter, 0.95);
    ring.strokeRoundedRect(
      -rect.width / 2 + 4,
      -rect.height / 2 + 4,
      rect.width - 8,
      rect.height - 8,
      11,
    );
    return ring;
  }

  private setCardFace(index: number, faceUp: boolean): void {
    this.cardBacks[index]?.setVisible(!faceUp);
    this.cardFronts[index]?.setVisible(faceUp);
  }

  private updateCardFace(index: number): void {
    const faceUp = this.state.cards[index]?.matched === true || this.state.open.includes(index);
    this.setCardFace(index, faceUp);
  }

  private chooseCard(index: number): void {
    if (this.busy || isComplete(this.state) || !canChoose(this.state, index)) return;

    this.playTone(420, 80);
    this.busy = true;
    const view = this.views[index]!;
    this.tweens.add({
      targets: view,
      scaleX: 0,
      duration: this.motion(130),
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.setCardFace(index, true);
        this.tweens.add({
          targets: view,
          scaleX: 1,
          duration: this.motion(170),
          ease: 'Back.easeOut',
          onComplete: () => {
            this.state.open.push(index);
            this.busy = false;
            if (this.state.open.length === 2) this.resolveOpenPair();
            else this.flushPendingRedraw();
          },
        });
      },
    });
  }

  private resolveOpenPair(): void {
    const [first, second] = this.state.open;
    if (first === undefined || second === undefined) return;

    const result = resolvePair(this.state.cards, first, second);
    if (result === 'invalid') {
      this.finishPair('Turn over two different cards.');
      return;
    }

    this.busy = true;
    this.state.moves += 1;
    this.updateCounters();

    if (result === 'match') {
      markPairMatched(this.state, first, second);
      this.status = 'A match! A new meadow note.';
      this.updateCounters();
      this.setStatus(this.status);
      this.playTone(660, 190);
      this.createMatchParticles(first, second);
      this.tweens.add({
        targets: [this.views[first], this.views[second]],
        scale: 1.08,
        yoyo: true,
        duration: this.motion(260),
        ease: 'Sine.easeInOut',
        onComplete: () => this.finishPair('A lovely match.'),
      });
      return;
    }

    this.status = 'Not this time—take one more look.';
    this.setStatus(this.status);
    this.playTone(190, 150);
    this.time.delayedCall(this.motion(720), () => this.hideMismatchedPair(first, second));
  }

  private hideMismatchedPair(first: number, second: number): void {
    let completedCards = 0;
    for (const index of [first, second]) {
      const view = this.views[index];
      if (view === undefined) continue;
      this.tweens.add({
        targets: view,
        angle: index === first ? -3 : 3,
        yoyo: true,
        repeat: 2,
        duration: this.motion(65),
        onComplete: () => {
          this.tweens.add({
            targets: view,
            scaleX: 0,
            duration: this.motion(120),
            onComplete: () => {
              this.setCardFace(index, false);
              this.tweens.add({
                targets: view,
                scaleX: 1,
                angle: 0,
                duration: this.motion(150),
                onComplete: () => {
                  completedCards += 1;
                  if (completedCards === 2) this.finishPair('Try another pair.');
                },
              });
            },
          });
        },
      });
    }
  }

  private finishPair(nextStatus: string): void {
    this.state.open.length = 0;
    this.busy = false;
    this.status = isComplete(this.state) ? 'Meadow complete!' : nextStatus;
    this.setStatus(this.status);

    const shouldComplete = isComplete(this.state);
    if (this.pendingRedraw) {
      this.pendingRedraw = false;
      this.redraw();
    } else if (shouldComplete) {
      this.drawCompletionStamp();
    }

    if (shouldComplete) {
      this.playCompletionSound();
      this.createCompletionLeaves();
    }
  }

  private createMatchParticles(first: number, second: number): void {
    if (this.reducedMotion) return;
    for (const index of [first, second]) {
      const view = this.views[index];
      if (view === undefined) continue;
      for (let particleIndex = 0; particleIndex < 6; particleIndex += 1) {
        const color = particleIndex % 2 === 0 ? COLORS.butter : COLORS.paperLight;
        const particle = this.add.circle(
          view.x + (Math.random() - 0.5) * 46,
          view.y + (Math.random() - 0.5) * 38,
          3,
          color,
          0.9,
        ).setDepth(30);
        this.transientObjects.push(particle);
        this.tweens.add({
          targets: particle,
          x: particle.x + (Math.random() - 0.5) * 28,
          y: particle.y - 26,
          alpha: 0,
          scale: 1.8,
          duration: 520,
          onComplete: () => this.destroyTransientObject(particle),
        });
      }
    }
  }

  private drawCompletionStamp(): void {
    const grid = this.layout.grid;
    const width = Math.min(430, grid.width * 0.78);
    const height = Math.min(154, grid.height * 0.5);
    const x = grid.x + grid.width / 2;
    const y = grid.y + grid.height / 2;
    const layer = this.add.container(x, y).setDepth(100);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.ink, 0.2);
    graphics.fillRoundedRect(-width / 2 + 6, -height / 2 + 7, width, height, 20);
    graphics.fillStyle(COLORS.paperLight, 0.98);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
    graphics.lineStyle(3, COLORS.moss, 0.78);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 20);
    layer.add(graphics);
    layer.add(this.add.text(0, -34, 'MEADOW COMPLETE', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.max(20, Math.min(28, width / 14))}px`,
      fontStyle: 'bold',
      color: '#4f7355',
    }).setOrigin(0.5));
    layer.add(this.add.text(0, 0, `You found every pair in ${this.state.moves} moves.`, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#637453',
    }).setOrigin(0.5));

    const replay = this.createButton(
      x - 70,
      y + 27,
      140,
      42,
      this.difficulty.id === '6x6' ? 'PLAY AGAIN' : 'NEXT LEVEL',
      () => this.difficulty.id === '6x6' ? this.restartGame() : this.startNextDifficulty(),
      0xe9edcf,
      COLORS.moss,
      13,
    );
    replay.container.setDepth(101);
    this.completionObjects = [layer, replay.container];
  }

  private createCompletionLeaves(): void {
    if (this.reducedMotion) return;
    const grid = this.layout.grid;
    for (let index = 0; index < 18; index += 1) {
      const leaf = this.add.ellipse(
        grid.x + (index * 67) % grid.width,
        grid.y - 8,
        10,
        5,
        index % 2 === 0 ? COLORS.butter : COLORS.moss,
        0.85,
      ).setDepth(110).setAngle(index * 29);
      this.transientObjects.push(leaf);
      this.tweens.add({
        targets: leaf,
        x: leaf.x + ((index % 5) - 2) * 28,
        y: grid.y + grid.height + 24,
        angle: leaf.angle + 240,
        alpha: 0,
        duration: 1100 + (index % 4) * 120,
        ease: 'Sine.easeIn',
        onComplete: () => this.destroyTransientObject(leaf),
      });
    }
  }

  private startNextDifficulty(): void {
    const currentIndex = DIFFICULTIES.findIndex((difficulty) => difficulty.id === this.difficulty.id);
    const nextDifficulty = DIFFICULTIES[Math.min(currentIndex + 1, DIFFICULTIES.length - 1)]!;
    this.changeDifficulty(nextDifficulty.id);
  }

  private restartGame(): void {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const object of this.completionObjects) object.destroy();
    this.completionObjects = [];
    for (const object of this.transientObjects) object.destroy();
    this.transientObjects = [];
    this.state = createGameState(Math.random, this.difficulty);
    this.busy = false;
    this.pendingRedraw = false;
    this.keyboardIndex = 0;
    this.status = 'A fresh page—find the meadow pairs.';
    this.views.forEach((view, index) => {
      view.setAngle(0).setScale(1);
      this.paintFrontFace(index, this.layout.cards[index]!);
    });
    this.updateCounters();
    this.setStatus(this.status);
    this.updateKeyboardFocus();
    this.playTone(360, 90);
  }

  private resetBoard(status: string): void {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.busy = true;
    this.pendingRedraw = false;
    this.time.delayedCall(40, () => {
      this.state = createGameState(Math.random, this.difficulty);
      this.busy = false;
      this.keyboardIndex = 0;
      this.status = status;
      this.redraw();
      this.playTone(360, 90);
    });
  }

  private destroyTransientObject(object: Phaser.GameObjects.GameObject): void {
    const index = this.transientObjects.indexOf(object);
    if (index >= 0) this.transientObjects.splice(index, 1);
    object.destroy();
  }

  private updateCounters(): void {
    if (this.layout.mode === 'side') {
      this.movesText?.setText(`MOVES\n${this.state.moves}`);
      this.pairsText?.setText(`PAIRS\n${this.state.pairs} / ${this.difficulty.pairs}`);
    } else {
      this.movesText?.setText(`Moves ${this.state.moves}`);
      this.pairsText?.setText(`Pairs ${this.state.pairs}/${this.difficulty.pairs}`);
    }
  }

  private setStatus(message: string): void {
    this.status = message;
    this.statusText?.setText(message);
  }

  private handleResize(): void {
    if (this.busy) this.pendingRedraw = true;
    else this.redraw();
  }

  private handleFullscreenChange(): void {
    if (this.busy) this.pendingRedraw = true;
    else this.redraw();
  }

  private handleFullscreenFailure(): void {
    this.setStatus('Fullscreen is unavailable here. Try the browser menu.');
  }

  private fullscreenLabel(): string {
    return this.scale.isFullscreen ? 'EXIT FULL SCREEN' : 'FULL SCREEN';
  }

  private toggleFullscreen(): void {
    this.scale.toggleFullscreen({ navigationUI: 'hide' });
  }

  private flushPendingRedraw(): void {
    if (!this.pendingRedraw || this.busy) return;
    this.pendingRedraw = false;
    this.redraw();
  }

  private motion(milliseconds: number): number {
    return this.reducedMotion ? 0 : milliseconds;
  }

  private getAudio(): AudioContext | undefined {
    if (this.audio !== undefined) return this.audio;
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass !== undefined) this.audio = new AudioContextClass();
    return this.audio;
  }

  private playTone(frequency: number, duration: number, delay = 0): void {
    const audio = this.getAudio();
    if (audio === undefined) return;

    const play = (): void => {
      const start = audio.currentTime + delay / 1000;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.045, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration / 1000);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration / 1000);
    };

    if (audio.state === 'suspended') void audio.resume().then(play).catch(() => undefined);
    else play();
  }

  private playCompletionSound(): void {
    this.playTone(523, 180);
    this.playTone(659, 180, 150);
    this.playTone(784, 280, 300);
  }

  private installKeyboardControls(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null) return;

    keyboard.on('keydown-LEFT', (event: KeyboardEvent) => {
      event.preventDefault();
      this.moveKeyboardFocus(-1, 0);
    });
    keyboard.on('keydown-RIGHT', (event: KeyboardEvent) => {
      event.preventDefault();
      this.moveKeyboardFocus(1, 0);
    });
    keyboard.on('keydown-UP', (event: KeyboardEvent) => {
      event.preventDefault();
      this.moveKeyboardFocus(0, -1);
    });
    keyboard.on('keydown-DOWN', (event: KeyboardEvent) => {
      event.preventDefault();
      this.moveKeyboardFocus(0, 1);
    });
    keyboard.on('keydown-ENTER', () => this.chooseCard(this.keyboardIndex));
    keyboard.on('keydown-SPACE', (event: KeyboardEvent) => {
      event.preventDefault();
      this.chooseCard(this.keyboardIndex);
    });
    keyboard.on('keydown-ONE', () => this.changeDifficulty('2x4'));
    keyboard.on('keydown-TWO', () => this.changeDifficulty('3x4'));
    keyboard.on('keydown-THREE', () => this.changeDifficulty('4x4'));
    keyboard.on('keydown-FOUR', () => this.changeDifficulty('6x6'));
    keyboard.on('keydown-R', () => this.restartGame());
    keyboard.on('keydown-F', () => this.toggleFullscreen());
  }

  private moveKeyboardFocus(horizontal: number, vertical: number): void {
    const columns = this.layout.columns;
    const rows = this.layout.rows;
    const currentColumn = this.keyboardIndex % columns;
    const currentRow = Math.floor(this.keyboardIndex / columns);
    const nextColumn = Phaser.Math.Clamp(currentColumn + horizontal, 0, columns - 1);
    const nextRow = Phaser.Math.Clamp(currentRow + vertical, 0, rows - 1);
    this.keyboardIndex = nextRow * columns + nextColumn;
    this.updateKeyboardFocus();
  }

  private updateKeyboardFocus(): void {
    this.views.forEach((view, index) => {
      view.setScale(index === this.keyboardIndex ? 1.015 : 1);
      this.focusRings[index]?.setVisible(index === this.keyboardIndex);
      this.updateCardFace(index);
    });
  }

  private shutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, this.handleFullscreenChange, this);
    this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.handleFullscreenChange, this);
    this.scale.off(Phaser.Scale.Events.FULLSCREEN_FAILED, this.handleFullscreenFailure, this);
    this.scale.off(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, this.handleFullscreenFailure, this);
    this.input.keyboard?.removeAllListeners();
    this.tweens.killAll();
    this.time.removeAllEvents();
    void this.audio?.close();
    this.audio = undefined;
  }
}
