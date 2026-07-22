import Phaser from 'phaser';
import { AUTHORED_CLIMB, type LevelData, type PlatformData } from '../game/levels';
import {
  completeGame,
  collectFruit,
  createGameState,
  fruitCount,
  getRespawnPoint,
  isComplete,
  reachCheckpoint,
  type GameState,
} from '../game/rules';
import { type CanopyLayout, createLayout } from '../game/layout';
import { resolveHorizontalVelocity } from '../game/movement';

// === Tuning constants ===
const GRAVITY = 1200;
const RUN_SPEED = 280;
const JUMP_VELOCITY = -520;
const JUMP_SUSTAIN_THRESHOLD = -200;
const JUMP_CUT_VELOCITY = -80;
const COYOTE_TIME = 100;
const JUMP_BUFFER = 120;
const VINE_MAX_ANGULAR = 4;
const VINE_DAMPING = 0.995;
const VINE_RELEASE_MULT = 0.8;
const PLATFORM_HEIGHT = 24;
const MONKEY_W = 32;
const MONKEY_H = 40;
const FALL_THRESHOLD_OFFSET = 100;
const INVULNERABILITY_MS = 400;
const RESPAWN_FREEZE_MS = 300;

// === Colors ===
const C_BG = 0x2d5a27;
const C_FAR_SKY = 0x4a7a52;
const C_FAR_CANOPY = 0x2d5a27;
const C_TRUNK = 0x3a2a1a;
const C_LEAF_LIGHT = 0x6ba342;
const C_LEAF_MID = 0x4f8a32;
const C_LEAF_DARK = 0x396622;
const C_BRANCH = 0x5a3a22;
const C_BRANCH_LIGHT = 0x7a4e30;
const C_MONKEY_BODY = 0x6b4a2a;
const C_MONKEY_BELLY = 0xc89e6a;
const C_MONKEY_HEAD = 0x7a5530;
const C_MONKEY_PINK = 0xd9a878;
const C_VINE = 0x4f6e2a;
const C_VINE_LIGHT = 0x6e8e3a;
const C_BANANA = 0xffe066;
const C_BANANA_TIP = 0x6e4d12;
const C_FRUIT_RING = 0xffd166;
const C_GOAL = 0xffd700;
const C_GOAL_DARK = 0xb8860b;
const C_HUD_BG = 0x1a3a18;
const C_HUD_TEXT = '#f5f3e0';
const C_BUTTON_BG = 0x224018;
const C_BUTTON_BORDER = 0x8fb35a;
const C_PAUSE_GOLD = 0xf5d274;
const C_PARTICLE_GOLD = 0xffe066;
const C_PARTICLE_GREEN = 0x6ba342;

type Phase = 'start' | 'playing' | 'paused' | 'complete';
type Pose = 'idle' | 'run1' | 'run2' | 'jump' | 'vine' | 'celebrate';

interface PointerInfo {
  readonly id: number;
  zone: 'left' | 'right' | 'jump';
}

/**
 * Single scene for Canopy Caper: a vertical jungle climb with running,
 * jumping, vine-swing momentum, fruit, checkpoints, respawn, pause,
 * start, and completion screens. All visuals and audio are procedural.
 */
export class CanopyCaperScene extends Phaser.Scene {
  private level: LevelData = AUTHORED_CLIMB;
  private state: GameState = createGameState(AUTHORED_CLIMB);
  private phase: Phase = 'start';
  private muted = false;
  private reducedMotion = false;
  private layout!: CanopyLayout;

  // physics
  private monkey!: Phaser.Physics.Arcade.Sprite;
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private fruitGroup!: Phaser.Physics.Arcade.StaticGroup;
  private checkpointObjects: Phaser.GameObjects.Arc[] = [];
  private goalZone!: Phaser.GameObjects.Arc;

  // vine
  private vineLine!: Phaser.GameObjects.Graphics;
  private vineGrab!: Phaser.GameObjects.Arc;
  private onVine = false;
  private vineAngle = 0;
  private vineAngularVelocity = 0;
  private vineAnchorX = 0;
  private vineAnchorY = 0;
  private vineRestAngle = 0;

  // jump
  private jumpHeld = false;
  private jumpBufferTime = 0;
  private coyoteEnd = 0;
  private wasGrounded = false;
  private respawnUntil = 0;

  // input flags
  private moveLeft = false;
  private moveRight = false;
  private keyboardJumpHeld = false;
  private touchJumpHeld = false;
  private touchJumpPressed = false;
  private pointers = new Map<number, PointerInfo>();

  // HUD
  private fruitText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Container;
  private pauseBg!: Phaser.GameObjects.Graphics;
  private pauseLabel!: Phaser.GameObjects.Text;

  // Touch controls
  private jumpButton!: Phaser.GameObjects.Container;
  private jumpButtonTint!: Phaser.GameObjects.Graphics;

  // Overlays
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private completeTween: Phaser.Tweens.Tween | null = null;

  // background
  private background!: Phaser.GameObjects.Graphics;
  private midLayer!: Phaser.GameObjects.Graphics;
  private nearLayer!: Phaser.GameObjects.Graphics;

  // audio
  private audio: AudioContext | undefined;
  private isRespawning = false;

  constructor() {
    super('CanopyCaper');
  }

  create(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.layout = createLayout(this.scale.width, this.scale.height);
    this.state = createGameState(this.level);
    this.phase = 'start';
    this.onVine = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.jumpHeld = false;
    this.touchJumpHeld = false;
    this.pointers.clear();

    this.cameras.main.setBackgroundColor(C_BG);
    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.pause();

    this.drawBackground();
    this.drawMidLayer();
    this.drawNearLayer();
    this.drawBackgroundDecor();

    this.generateTextures();
    this.setUpPlatforms();
    this.setUpVine();
    this.setUpMonkey();
    this.setUpFruits();
    this.setUpCheckpoints();
    this.setUpGoal();
    this.setUpCamera();
    this.setUpColliders();
    this.setUpHud();
    this.setUpTouchZones();
    this.setUpKeyboard();
    this.setUpPointer();
    this.showStartScreen();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, this.handleFullscreenChange, this);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.handleFullscreenChange, this);
    this.scale.on(Phaser.Scale.Events.FULLSCREEN_FAILED, this.handleFullscreenFailure, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  // ---------------------------------------------------------------------------
  // Textures
  // ---------------------------------------------------------------------------

  private generateTextures(): void {
    // Branch — generated per unique width on demand (see setUpPlatforms).
    // Monkey poses.
    this.generateMonkeyTexture('monkey-idle', 0);
    this.generateMonkeyTexture('monkey-run1', 2);
    this.generateMonkeyTexture('monkey-run2', -2);
    this.generateMonkeyTexture('monkey-jump', 1);
    this.generateMonkeyTexture('monkey-vine', 3);
    this.generateMonkeyTexture('monkey-celebrate', 4);
    this.generateBananaTexture();
    this.generateCheckpointTexture();
    this.generateGoalTexture();
  }

  private generateMonkeyTexture(key: string, armMode: number): void {
    const W = MONKEY_W + 8;
    const H = MONKEY_H + 12;
    const graphics = this.add.graphics();

    const cx = W / 2;
    const cy = H / 2;

    // tail
    graphics.lineStyle(3, C_MONKEY_BODY, 1);
    graphics.beginPath();
    graphics.moveTo(cx - 14, cy);
    graphics.lineTo(cx - 20, cy - 8);
    graphics.lineTo(cx - 22, cy - 18);
    graphics.strokePath();

    // body
    graphics.fillStyle(C_MONKEY_BODY, 1);
    graphics.fillEllipse(cx, cy + 4, 24, 28);

    // belly
    graphics.fillStyle(C_MONKEY_BELLY, 0.72);
    graphics.fillEllipse(cx, cy + 8, 14, 20);

    // head
    graphics.fillStyle(C_MONKEY_HEAD, 1);
    graphics.fillCircle(cx, cy - 12, 12);

    // face
    graphics.fillStyle(C_MONKEY_PINK, 0.7);
    graphics.fillEllipse(cx, cy - 8, 12, 9);

    // ears
    graphics.fillStyle(C_MONKEY_HEAD, 1);
    graphics.fillCircle(cx - 11, cy - 14, 4);
    graphics.fillCircle(cx + 11, cy - 14, 4);

    // eyes
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(cx - 4, cy - 13, 2.5);
    graphics.fillCircle(cx + 4, cy - 13, 2.5);
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillCircle(cx - 4, cy - 12.5, 1.3);
    graphics.fillCircle(cx + 4, cy - 12.5, 1.3);

    // arms — depending on armMode
    graphics.fillStyle(C_MONKEY_BODY, 1);
    if (armMode === 0) {
      // arms at sides (idle)
      graphics.fillEllipse(cx - 12, cy + 4, 7, 16);
      graphics.fillEllipse(cx + 12, cy + 4, 7, 16);
    } else if (armMode === 1) {
      // arms up (jump)
      graphics.fillEllipse(cx - 13, cy - 4, 7, 14);
      graphics.fillEllipse(cx + 13, cy - 4, 7, 14);
    } else if (armMode === 2) {
      // arm forward (run1)
      graphics.fillEllipse(cx - 13, cy + 4, 7, 16);
      graphics.fillEllipse(cx + 14, cy - 2, 6, 12);
    } else if (armMode === -2) {
      // arm back (run2)
      graphics.fillEllipse(cx - 14, cy - 2, 6, 12);
      graphics.fillEllipse(cx + 13, cy + 4, 7, 16);
    } else if (armMode === 3) {
      // arms outstretched for vine reach
      graphics.fillEllipse(cx - 14, cy - 6, 7, 14);
      graphics.fillEllipse(cx + 14, cy - 6, 7, 14);
    } else if (armMode === 4) {
      // arms up celebration
      graphics.fillEllipse(cx - 12, cy - 8, 7, 14);
      graphics.fillEllipse(cx + 12, cy - 8, 7, 14);
    }

    graphics.generateTexture(key, W, H);
    graphics.destroy();
  }

  private generateBananaTexture(): void {
    const W = 24;
    const H = 18;
    const g = this.add.graphics();
    // banana shape
    g.fillStyle(C_BANANA, 1);
    g.beginPath();
    g.moveTo(2, 14);
    g.lineTo(20, 4);
    g.lineTo(18, 7);
    g.lineTo(4, 17);
    g.closePath();
    g.fillPath();
    // tips
    g.fillStyle(C_BANANA_TIP, 1);
    g.fillCircle(2, 14, 2.5);
    g.fillCircle(20, 4, 2.5);
    // highlight
    g.fillStyle(0xfffacd, 0.5);
    g.fillRect(6, 10, 10, 2);
    g.generateTexture('banana', W, H);
    g.destroy();
  }

  private generateCheckpointTexture(): void {
    const S = 24;
    const g = this.add.graphics();
    g.fillStyle(C_LEAF_LIGHT, 0.8);
    g.fillEllipse(12, 12, 16, 8);
    g.fillStyle(C_LEAF_MID, 0.6);
    g.fillEllipse(12, 8, 10, 5);
    g.generateTexture('checkpoint', S, S);
    g.destroy();
  }

  private generateGoalTexture(): void {
    const S = 32;
    const g = this.add.graphics();
    g.fillStyle(C_GOAL_DARK, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(C_GOAL, 1);
    g.fillCircle(16, 16, 10);
    g.fillStyle(0xffec8b, 1);
    g.fillCircle(13, 13, 4);
    g.generateTexture('goal', S, S);
    g.destroy();
  }

  private generateBranchTexture(width: number): string {
    const key = `branch-${width}`;
    if (this.textures.exists(key)) return key;
    const H = PLATFORM_HEIGHT;
    const g = this.add.graphics();
    g.fillStyle(C_BRANCH, 1);
    g.fillRoundedRect(0, 8, width, 16, 6);
    g.fillStyle(C_BRANCH_LIGHT, 0.68);
    g.fillRoundedRect(0, 8, width, 4, 4);
    // leaf tufts on top
    const tuftCount = Math.max(2, Math.floor(width / 36));
    for (let i = 0; i < tuftCount; i++) {
      const x = (width * (i + 0.5)) / tuftCount;
      g.fillStyle(C_LEAF_MID, 0.85);
      g.fillEllipse(x, 6, 26, 12);
      g.fillStyle(C_LEAF_LIGHT, 0.7);
      g.fillEllipse(x - 3, 4, 18, 8);
    }
    // small shadow under
    g.fillStyle(0x000000, 0.16);
    g.fillRoundedRect(0, 22, width, 4, 4);
    g.generateTexture(key, width, H);
    g.destroy();
    return key;
  }

  // ---------------------------------------------------------------------------
  // World setup
  // ---------------------------------------------------------------------------

  private setUpPlatforms(): void {
    this.platformGroup = this.physics.add.staticGroup();
    for (const platform of this.level.platforms) {
      this.createPlatform(platform);
    }
  }

  private createPlatform(platform: PlatformData): void {
    const key = this.generateBranchTexture(platform.width);
    const cx = platform.x + platform.width / 2;
    const cy = platform.y + PLATFORM_HEIGHT / 2;
    const plat = this.platformGroup.create(cx, cy, key) as Phaser.Physics.Arcade.Image;
    const body = plat.body as Phaser.Physics.Arcade.StaticBody;
    if (platform.oneWay) {
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }
    plat.setData('oneWay', platform.oneWay ? true : false);
    plat.setDepth(5);
  }

  private setUpVine(): void {
    const v = this.level.vine;
    this.vineAnchorX = v.anchorX;
    this.vineAnchorY = v.anchorY;
    this.vineRestAngle = Math.PI; // straight down
    this.vineAngle = this.vineRestAngle;
    this.vineAngularVelocity = 0;
    // vine line graphics
    this.vineLine = this.add.graphics();
    this.vineLine.setDepth(6);
    // grab circle (visual + invisible interaction zone handled in update)
    this.vineGrab = this.add.circle(v.anchorX, v.anchorY + v.length, 30, 0xffffff, 0.05);
    this.vineGrab.setVisible(false);
    this.vineGrab.setDepth(6);
  }

  private setUpMonkey(): void {
    const start = this.level;
    this.monkey = this.physics.add.sprite(start.startX, start.startY, 'monkey-idle');
    this.monkey.setBounce(0);
    this.monkey.setCollideWorldBounds(false);
    (this.monkey.body as Phaser.Physics.Arcade.Body).setSize(MONKEY_W, MONKEY_H, true);
    this.monkey.setMaxVelocity(RUN_SPEED, 1600);
    this.monkey.setDepth(10);
  }

  private setUpFruits(): void {
    this.fruitGroup = this.physics.add.staticGroup();
    this.level.fruits.forEach((fruit) => {
      const sprite = this.fruitGroup.create(fruit.x, fruit.y, 'banana') as Phaser.Physics.Arcade.Image;
      sprite.setDepth(8);
      sprite.setCircle(10, (sprite.displayWidth - 20) / 2, (sprite.displayHeight - 20) / 2);
    });
  }

  private setUpCheckpoints(): void {
    this.checkpointObjects = [];
    this.level.checkpoints.forEach((cp) => {
      const c = this.add.circle(cp.x, cp.y, 24, 0x88ff66, 0.0).setDepth(7);
      c.setStrokeStyle(2, C_LEAF_LIGHT, 0.5);
      this.checkpointObjects.push(c);
    });
  }

  private setUpGoal(): void {
    const v = this.level;
    this.goalZone = this.add.circle(v.goalX, v.goalY, 30, 0xffd700, 0).setDepth(7);
    // visual goal marker
    this.add.image(v.goalX, v.goalY - 8, 'goal').setDepth(9).setScale(1.4);
  }

  private setUpCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    cam.startFollow(this.monkey, false, 0.1, 0.1, 0, -80);
    this.refreshCameraDeadzone();
  }

  private setUpColliders(): void {
    this.physics.add.collider(this.monkey, this.platformGroup, undefined, (monkeyObj, platformObj) => {
      const platform = platformObj as Phaser.Physics.Arcade.Image;
      if (!platform.getData('oneWay')) return true;
      const body = (monkeyObj as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
      return body.velocity.y >= 0;
    });
    this.physics.add.overlap(this.monkey, this.fruitGroup, this.handleFruitOverlap, undefined, this);
  }

  private refreshCameraDeadzone(): void {
    // Re-apply the deadzone after a canvas resize/fullscreen change so the
    // camera keeps its intended follow behaviour at the new viewport size.
    this.cameras.main.setDeadzone(this.level.worldWidth * 0.6, 200);
  }

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------

  private drawBackground(): void {
    this.background = this.add.graphics();
    this.background.setDepth(0);
    const H = this.level.worldHeight;
    const W = this.level.worldWidth;
    // vertical gradient from sky through canopy
    for (let y = 0; y < H; y += 4) {
      const t = y / H;
      const r = 0x2d + Math.round((0x4a - 0x2d) * (1 - t));
      const gr = 0x5a + Math.round((0x7a - 0x5a) * (1 - t));
      const b = 0x27 + Math.round((0x52 - 0x27) * (1 - t));
      const color = (r << 16) | (gr << 8) | b;
      this.background.fillStyle(color, 1);
      this.background.fillRect(0, y, W, 4);
    }
  }

  private drawMidLayer(): void {
    this.midLayer = this.add.graphics();
    this.midLayer.setDepth(1);
    this.midLayer.setScrollFactor(0.35, 0.35);
    const H = this.level.worldHeight;
    const W = this.level.worldWidth;
    // tree trunk silhouettes
    const seed = (n: number) => {
      const s = Math.sin(n * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    };
    for (let i = 0; i < 12; i++) {
      const x = (i * 81 + 30) % W;
      const ytop = (i * 211) % H;
      const trunkW = 28 + seed(i) * 36;
      const trunkH = 460 + seed(i + 7) * 220;
      this.midLayer.fillStyle(C_TRUNK, 0.42);
      this.midLayer.fillRect(x, ytop, trunkW, trunkH);
      this.midLayer.fillStyle(C_LEAF_DARK, 0.38);
      this.midLayer.fillEllipse(x + trunkW / 2, ytop, trunkW * 2.2, trunkW * 1.4);
    }
  }

  private drawNearLayer(): void {
    this.nearLayer = this.add.graphics();
    this.nearLayer.setDepth(2);
    this.nearLayer.setScrollFactor(0.6, 0.55);
    const H = this.level.worldHeight;
    const W = this.level.worldWidth;
    const colors = [C_LEAF_LIGHT, C_LEAF_MID, C_LEAF_DARK];
    for (let i = 0; i < 28; i++) {
      const x = (i * 47 + 17) % W;
      const y = (i * 111 + 31) % H;
      const r = 36 + ((i * 23) % 48);
      const color = colors[i % 3]!;
      this.nearLayer.fillStyle(color, 0.42);
      this.nearLayer.fillEllipse(x, y, r * 2, r * 1.3);
    }
  }

  private drawBackgroundDecor(): void {
    // ambient light shafts behind everything dynamic
    const shafts = this.add.graphics();
    shafts.setDepth(1);
    shafts.setScrollFactor(0.4, 0.45);
    shafts.fillStyle(0xf5e9a0, 0.06);
    shafts.fillTriangle(150, 0, 60, this.level.worldHeight, 280, this.level.worldHeight);
    shafts.fillTriangle(500, 0, 400, this.level.worldHeight, 640, this.level.worldHeight);
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private setUpHud(): void {
    const hud = this.layout.hud;
    this.fruitText = this.add.text(
      hud.fruitCounter.x,
      hud.fruitCounter.y,
      this.fruitLabel(),
      {
        fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
        fontSize: `${Math.max(16, Math.round(22 * this.layout.scale))}px`,
        fontStyle: 'bold',
        color: '#fff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: 10, y: 6 },
      },
    );
    this.fruitText.setScrollFactor(0);
    this.fruitText.setDepth(200);

    // pause button
    this.pauseButton = this.add.container(
      hud.pauseButton.x,
      hud.pauseButton.y,
    );
    const r = hud.pauseButton.radius;
    this.pauseBg = this.add.graphics();
    this.pauseBg.fillStyle(C_HUD_BG, 0.78);
    this.pauseBg.fillCircle(0, 0, r);
    this.pauseBg.lineStyle(3, C_BUTTON_BORDER, 1);
    this.pauseBg.strokeCircle(0, 0, r);
    this.pauseButton.add(this.pauseBg);
    this.pauseLabel = this.add.text(0, -1, '\u23F8', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.round(r * 1.1)}px`,
      color: C_HUD_TEXT,
    }).setOrigin(0.5);
    this.pauseButton.add(this.pauseLabel);
    this.pauseButton.setSize(r * 2, r * 2);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', () => this.togglePause());
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setDepth(201);
  }

  private fruitLabel(): string {
    return `\u{1F34E} ${fruitCount(this.state)}/${this.level.fruits.length}`;
  }

  // ---------------------------------------------------------------------------
  // Touch zone visuals
  // ---------------------------------------------------------------------------

  private drawJumpButton(pressed: boolean): void {
    const r = this.layout.buttonSize / 2;
    this.jumpButtonTint.clear();
    this.jumpButtonTint.fillStyle(0x334a25, 0.7);
    this.jumpButtonTint.fillCircle(0, 0, r);
    this.jumpButtonTint.fillStyle(pressed ? 0x88d060 : 0x60b840, 0.85);
    this.jumpButtonTint.fillCircle(0, 0, r - 4);
    this.jumpButtonTint.lineStyle(3, C_BUTTON_BORDER, 1);
    this.jumpButtonTint.strokeCircle(0, 0, r - 2);
  }

  private setUpTouchZones(): void {
    const r = this.layout.buttonSize / 2;
    this.jumpButton = this.add.container(0, 0).setScrollFactor(0);
    this.jumpButtonTint = this.add.graphics();
    this.drawJumpButton(false);
    this.jumpButton.add(this.jumpButtonTint);
    const jumpLabel = this.add.text(0, -1, '\u25B2', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.round(r * 0.7)}px`,
      color: '#fff',
    }).setOrigin(0.5);
    this.jumpButton.add(jumpLabel);
    const press = () => {
      if (this.phase === 'start') { this.beginGame(); return; }
      if (this.phase !== 'playing') return;
      this.touchJumpHeld = true;
      this.touchJumpPressed = true;
      this.jumpBufferTime = this.time.now + JUMP_BUFFER;
      this.drawJumpButton(true);
    };
    const release = () => {
      if (this.touchJumpHeld) {
        this.touchJumpHeld = false;
        this.maybeCutJump();
      }
      this.drawJumpButton(false);
    };
    this.jumpButton.setSize(this.layout.buttonSize, this.layout.buttonSize);
    this.jumpButton.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, r),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: false,
    });
    this.jumpButton.on('pointerdown', press);
    this.jumpButton.on('pointerup', release);
    this.jumpButton.on('pointerout', release);
    this.jumpButton.on('pointercancel', release);
    this.setJumpButtonPosition();
    this.jumpButton.setDepth(201);
  }

  private setJumpButtonPosition(): void {
    // Layout positions in canvas CSS pixels (Scale.RESIZE keeps world =
    // display units at zoom 1); the jump button is screen-fixed, so we
    // place it directly at the rendered canvas corner.
    const r = this.layout.buttonSize / 2;
    this.jumpButton.setPosition(this.layout.touchJumpZone.x + r, this.layout.touchJumpZone.y + r);
  }

  private pointerInJumpButtonZone(pointer: Phaser.Input.Pointer): boolean {
    // Screen-fixed HUD: compare pointer SCREEN coordinates, not world
    // coordinates that shift with camera scroll.
    const r = this.layout.buttonSize / 2 + 4;
    const dx = pointer.x - this.jumpButton.x;
    const dy = pointer.y - this.jumpButton.y;
    return dx * dx + dy * dy < r * r;
  }

  // ---------------------------------------------------------------------------
  // Keyboard input
  // ---------------------------------------------------------------------------

  private setUpKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null) return;
    keyboard.on('keydown-LEFT', () => { this.dispatchStart('left'); });
    keyboard.on('keydown-A', () => { this.dispatchStart('left'); });
    keyboard.on('keydown-RIGHT', () => { this.dispatchStart('right'); });
    keyboard.on('keydown-D', () => { this.dispatchStart('right'); });
    keyboard.on('keyup-LEFT', () => { this.dispatchEnd('left'); });
    keyboard.on('keyup-A', () => { this.dispatchEnd('left'); });
    keyboard.on('keyup-RIGHT', () => { this.dispatchEnd('right'); });
    keyboard.on('keyup-D', () => { this.dispatchEnd('right'); });
    keyboard.on('keydown-UP', (e: KeyboardEvent) => { e.preventDefault(); this.beginJumpKey(); });
    keyboard.on('keydown-W', () => { this.beginJumpKey(); });

    keyboard.on('keyup-UP', () => { this.endJumpKey(); });
    keyboard.on('keyup-W', () => { this.endJumpKey(); });
    keyboard.on('keydown-SPACE', (e: KeyboardEvent) => { e.preventDefault(); this.beginJumpKey(); });
    keyboard.on('keyup-SPACE', () => { this.endJumpKey(); });
    keyboard.on('keydown-ESC', () => { this.togglePause(); });
    keyboard.on('keydown-R', () => {
      if (this.phase === 'complete' || this.phase === 'paused') this.restartGame();
    });
    keyboard.on('keydown-F', () => this.toggleFullscreen());
  }

  private dispatchStart(dir: 'left' | 'right'): void {
    if (this.phase === 'start') { this.beginGame(); return; }
    if (this.phase !== 'playing') return;
    if (dir === 'left') this.moveLeft = true;
    else this.moveRight = true;
  }

  private dispatchEnd(dir: 'left' | 'right'): void {
    if (dir === 'left') this.moveLeft = false;
    else this.moveRight = false;
  }

  private beginJumpKey(): void {
    if (this.phase === 'start') { this.beginGame(); return; }
    if (this.phase !== 'playing') return;
    this.keyboardJumpHeld = true;
    this.jumpBufferTime = this.time.now + JUMP_BUFFER;
    this.touchJumpPressed = true;
  }

  private endJumpKey(): void {
    this.keyboardJumpHeld = false;
    this.maybeCutJump();
  }

  // ---------------------------------------------------------------------------
  // Pointer/touch input
  // ---------------------------------------------------------------------------

  private setUpPointer(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase === 'start') { this.beginGame(); return; }
      if (this.phase !== 'playing') return;
      if (this.pointerInJumpButtonZone(pointer)) return;
      const zone = this.classifyTouchZone(pointer);
      this.pointers.set(pointer.id, { id: pointer.id, zone });
      this.applyTouchPointer();
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointers.has(pointer.id)) return;
      const zone = this.classifyTouchZone(pointer);
      const info = this.pointers.get(pointer.id);
      if (info && info.zone !== zone) {
        info.zone = zone;
        this.applyTouchPointer();
      }
    });
    const release = (pointer: Phaser.Input.Pointer) => {
      if (!this.pointers.has(pointer.id)) return;
      this.pointers.delete(pointer.id);
      this.applyTouchPointer();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerout', release);
    this.input.on('pointercancel', release);
  }

  private classifyTouchZone(pointer: Phaser.Input.Pointer): 'left' | 'right' {
    // Simple screen-half classification; jump handled by direct button.
    return pointer.x < this.scale.width / 2 ? 'left' : 'right';
  }

  private applyTouchPointer(): void {
    this.moveLeft = false;
    this.moveRight = false;
    for (const info of this.pointers.values()) {
      if (info.zone === 'left') this.moveLeft = true;
      else if (info.zone === 'right') this.moveRight = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Game lifecycle
  // ---------------------------------------------------------------------------

  private beginGame(): void {
    if (this.phase !== 'start') return;
    this.phase = 'playing';
    this.physics.world.resume();
    this.clearOverlay();
    this.resumeAudio();
    this.monkey.setVelocity(0, 0);
    (this.monkey.body as Phaser.Physics.Arcade.Body).enable = true;
  }

  private restartGame(): void {
    this.clearOverlay();
    this.state = createGameState(this.level);
    this.onVine = false;
    this.vineAngle = this.vineRestAngle;
    this.vineAngularVelocity = 0;
    this.moveLeft = false;
    this.moveRight = false;
    this.jumpHeld = false;
    this.jumpBufferTime = 0;
    this.coyoteEnd = 0;
    this.wasGrounded = false;
    this.touchJumpHeld = false;
    this.touchJumpPressed = false;
    this.keyboardJumpHeld = false;
    this.respawnUntil = 0;
    this.isRespawning = false;
    this.pointers.clear();
    // Stop the infinite celebration tween (if present) and reset the
    // monkey's scale/alpha so "Play Again" starts visually fresh.
    if (this.completeTween) {
      this.completeTween.stop();
      this.completeTween = null;
    }
    this.monkey.setScale(1);
    this.monkey.setAlpha(1);
    (this.monkey.body as Phaser.Physics.Arcade.Body).enable = true;
    this.monkey.setPosition(this.level.startX, this.level.startY);
    this.monkey.setVelocity(0, 0);
    this.monkey.setTexture('monkey-idle');
    this.physics.world.resume();
    this.fruitText.setText(this.fruitLabel());
    // restore fruit sprites visibility
    this.fruitGroup.getChildren().forEach((fruit, index) => {
      (fruit as Phaser.GameObjects.Image).setVisible(true);
      (fruit.body as Phaser.Physics.Arcade.StaticBody).enable = true;
      void index;
    });
    this.phase = 'playing';
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(time: number, delta: number): void {
    if (this.phase !== 'playing') return;
    this.setJumpButtonPosition();
    this.updateVineVisual();
    this.updateMonkeyPose();
    this.handleMovement();
    this.handleJump(time);
    if (this.onVine) {
      this.updateVinePhysics(delta);
    } else {
      this.checkVineGrabOrRelease(time);
    }
    this.updateCoyote(time);
    this.checkCheckpointOverlap();
    this.checkGoalOverlap();
    this.checkFellOff(time);
    this.fruitText.setText(this.fruitLabel());
  }

  private updateCoyote(time: number): void {
    const body = this.monkey.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down;
    if (onGround && !this.onVine) {
      this.coyoteEnd = time + COYOTE_TIME;
      // landing thud when descending at speed
      if (!this.wasGrounded && body.velocity.y > 200) {
        this.playLand();
      }
    }
    this.wasGrounded = onGround;
  }

  private handleMovement(): void {
    if (this.onVine) {
      // Air control of swing direction via pumping
      if (this.moveLeft) this.vineAngularVelocity = Math.max(this.vineAngularVelocity - 0.06, -VINE_MAX_ANGULAR);
      if (this.moveRight) this.vineAngularVelocity = Math.min(this.vineAngularVelocity + 0.06, VINE_MAX_ANGULAR);
      return;
    }
    const body = this.monkey.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down === true;
    const vx = resolveHorizontalVelocity(
      this.moveLeft,
      this.moveRight,
      onGround,
      body.velocity.x,
      RUN_SPEED,
    );
    this.monkey.setVelocityX(vx);
  }

  private handleJump(time: number): void {
    if (this.onVine) return;
    // Expire stale buffered presses so an old tap cannot fire a jump
    // (or grab the vine) seconds later on landing.
    if (this.touchJumpPressed && time > this.jumpBufferTime) {
      this.touchJumpPressed = false;
    }
    const body = this.monkey.body as Phaser.Physics.Arcade.Body;
    const canCoyote = time < this.coyoteEnd && !this.wasGroundedInFlight();
    const canJump = (body.touching.down || body.blocked.down === true) || canCoyote;
    if (this.touchJumpPressed && canJump) {
      this.monkey.setVelocityY(JUMP_VELOCITY);
      this.jumpHeld = true;
      this.touchJumpPressed = false;
      this.coyoteEnd = 0;
      this.playJump();
      return;
    }
    // Variable jump: while held and still ascending fast, add upward assist.
    if (this.jumpHeld && body.velocity.y < JUMP_SUSTAIN_THRESHOLD) {
      this.monkey.setVelocityY(body.velocity.y - 16);
    }
  }

  private wasGroundedInFlight(): boolean {
    // disqualify coyote if monkey is clearly still ascending
    const v = (this.monkey.body as Phaser.Physics.Arcade.Body).velocity.y;
    return v < -120;
  }

  private maybeCutJump(): void {
    if (this.keyboardJumpHeld || this.touchJumpHeld) return;
    if (this.onVine) return;
    const body = this.monkey.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y < 0 && body.velocity.y > JUMP_CUT_VELOCITY * -4) {
      body.setVelocityY(JUMP_CUT_VELOCITY);
    }
    this.jumpHeld = false;
  }

  // ---------------------------------------------------------------------------
  // Vine physics
  // ---------------------------------------------------------------------------

  private checkVineGrabOrRelease(time: number): void {
    void time;
    const dx = this.monkey.x - this.vineAnchorX;
    const dy = this.monkey.y - this.vineAnchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const grabRadius = this.level.vine.length + 30;
    const monkeyIsFalling = (this.monkey.body as Phaser.Physics.Arcade.Body).velocity.y > 0;
    const withinGrab = dist <= grabRadius + 30 && dist > this.level.vine.length - 50;
    if (!this.onVine && withinGrab && this.touchJumpPressed) {
      this.attachToVine();
      this.touchJumpPressed = false;
      this.playVineGrab();
      return;
    }
    // auto re-grab if fell back through grab area
    if (!this.onVine && withinGrab && monkeyIsFalling && dist < this.level.vine.length + 12) {
      this.attachToVine();
      this.playVineGrab();
    }
  }

  private attachToVine(): void {
    this.onVine = true;
    this.jumpHeld = false;
    const body = this.monkey.body as Phaser.Physics.Arcade.Body;
    // Read incoming velocity before zeroing the body so we can project its
    // tangential component onto the vine and seed the pendulum swing.
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    // angle from anchor to monkey (measured from downward vertical)
    const dx = this.monkey.x - this.vineAnchorX;
    const dy = this.monkey.y - this.vineAnchorY;
    this.vineAngle = Math.atan2(dx, dy);
    const L = this.level.vine.length;
    // Unit tangent for increasing theta is (cos(theta), -sin(theta)); the
    // tangential speed vTan drives the pendulum: dtheta/dt = vTan / L.
    const vTan = vx * Math.cos(this.vineAngle) - vy * Math.sin(this.vineAngle);
    this.vineAngularVelocity = Phaser.Math.Clamp(vTan / L, -VINE_MAX_ANGULAR, VINE_MAX_ANGULAR);
    body.allowGravity = false;
    body.setVelocity(0, 0);
    this.monkey.setTexture('monkey-vine');
  }

  private updateVinePhysics(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const L = this.level.vine.length;
    // angularAccel = -(g/L) * sin(angle)
    const accel = -(GRAVITY / L) * Math.sin(this.vineAngle);
    this.vineAngularVelocity += accel * dt;
    // damping
    this.vineAngularVelocity *= Math.pow(VINE_DAMPING, (deltaMs / 16.67));
    // clamp
    if (this.vineAngularVelocity > VINE_MAX_ANGULAR) this.vineAngularVelocity = VINE_MAX_ANGULAR;
    if (this.vineAngularVelocity < -VINE_MAX_ANGULAR) this.vineAngularVelocity = -VINE_MAX_ANGULAR;
    this.vineAngle += this.vineAngularVelocity * dt;
    // limit angle swing
    const maxAngle = Math.PI * 0.65;
    if (this.vineAngle > maxAngle) { this.vineAngle = maxAngle; this.vineAngularVelocity = 0; }
    if (this.vineAngle < -maxAngle) { this.vineAngle = -maxAngle; this.vineAngularVelocity = 0; }
    // position
    const newX = this.vineAnchorX + L * Math.sin(this.vineAngle);
    const newY = this.vineAnchorY + L * Math.cos(this.vineAngle);
    this.monkey.setPosition(newX, newY);
    // release on jump press
    if (this.touchJumpPressed) {
      this.touchJumpPressed = false;
      this.releaseVine();
    }
  }

  private releaseVine(): void {
    if (!this.onVine) return;
    this.onVine = false;
    const L = this.level.vine.length;
    const w = this.vineAngularVelocity;
    const phi = this.vineAngle;
    const body = this.monkey.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = true;
    const vx = L * w * Math.cos(phi) * VINE_RELEASE_MULT;
    const vy = -L * w * Math.sin(phi) * VINE_RELEASE_MULT;
    body.setVelocity(vx, vy);
    this.monkey.setTexture('monkey-jump');
    this.jumpHeld = false;
    this.playVineRelease();
  }

  private updateVineVisual(): void {
    if (this.onVine) {
      // draw vine from anchor to monkey's position
      this.vineLine.clear();
      this.vineLine.lineStyle(6, C_VINE, 0.9);
      const ax = this.vineAnchorX;
      const ay = this.vineAnchorY;
      const bx = this.monkey.x;
      const by = this.monkey.y - 12;
      // slight mid-point offset based on swing velocity adds a curve feel
      const cp = this.vineAngularVelocity * 8;
      const midX = (ax + bx) / 2 - cp * 0.4 * Math.cos(this.vineAngle);
      const midY = (ay + by) / 2 - cp * 0.4 * Math.sin(this.vineAngle);
      this.vineLine.beginPath();
      this.vineLine.moveTo(ax, ay);
      // Use linear approximation through midpoint for a slight bend.
      this.vineLine.lineTo(midX, midY);
      this.vineLine.lineTo(bx, by);
      this.vineLine.strokePath();
    } else {
      // draw resting vine
      this.vineLine.clear();
      this.vineLine.lineStyle(5, C_VINE, 0.85);
      const ax = this.vineAnchorX;
      const ay = this.vineAnchorY;
      const by = ay + this.level.vine.length;
      // slight curve
      this.vineLine.beginPath();
      this.vineLine.moveTo(ax, ay);
      this.vineLine.lineTo(ax, by);
      this.vineLine.strokePath();
      // hint grab indicator
      this.vineGrab.setPosition(ax, by);
      this.vineGrab.setVisible(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Monkey animation
  // ---------------------------------------------------------------------------

  private updateMonkeyPose(): void {
    if (this.onVine) {
      if (this.monkey.texture.key !== 'monkey-vine') this.monkey.setTexture('monkey-vine');
      return;
    }
    const body = this.monkey.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down === true;
    if (!onGround) {
      if (this.monkey.texture.key !== 'monkey-jump') this.monkey.setTexture('monkey-jump');
      return;
    }
    const vx = body.velocity.x;
    if (Math.abs(vx) < 12) {
      if (this.monkey.texture.key !== 'monkey-idle') this.monkey.setTexture('monkey-idle');
      return;
    }
    // running animation
    const which = Math.floor(this.time.now / 120) % 2 === 0 ? 'run1' : 'run2';
    if (this.monkey.texture.key !== `monkey-${which}`) {
      this.monkey.setTexture(`monkey-${which}`);
    }
    this.monkey.setFlipX(vx < 0);
  }

  // ---------------------------------------------------------------------------
  // Overlaps and events
  // ---------------------------------------------------------------------------

  private handleFruitOverlap(_monkey: unknown, fruitObj: unknown): void {
    const fruit = fruitObj as Phaser.Physics.Arcade.Image;
    const index = this.fruitGroup.getChildren().indexOf(fruit);
    if (index < 0 || this.state.collectedFruits.has(index)) return;
    this.state = collectFruit(this.state, index);
    fruit.setVisible(false);
    (fruit.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.playFruitCollect();
    this.spawnFruitParticles(fruit.x, fruit.y);
  }

  private spawnFruitParticles(x: number, y: number): void {
    if (this.reducedMotion) return;
    for (let i = 0; i < 8; i++) {
      const color = i % 2 === 0 ? C_PARTICLE_GOLD : C_PARTICLE_GREEN;
      const p = this.add.circle(x, y, 3, color, 0.95).setDepth(120);
      this.tweens.add({
        targets: p,
        x: x + (Math.random() - 0.5) * 40,
        y: y - 16 - Math.random() * 32,
        alpha: 0,
        scale: 1.8,
        duration: 560,
        onComplete: () => p.destroy(),
      });
    }
  }

  private checkCheckpointOverlap(): void {
    const cx = this.monkey.x;
    const cy = this.monkey.y;
    this.checkpointObjects.forEach((circle, index) => {
      const radius = circle.radius;
      const dx = cx - circle.x;
      const dy = cy - circle.y;
      if (dx * dx + dy * dy < radius * radius) {
        // checkpoint activate
        if (this.state.checkpointIndex < index) {
          this.state = reachCheckpoint(this.state, index);
          this.flashCheckpoint(circle);
          this.playTone(523, 100);
        }
      }
    });
  }

  private flashCheckpoint(circle: Phaser.GameObjects.Arc): void {
    if (this.reducedMotion) return;
    this.tweens.add({
      targets: circle,
      scale: 2.4,
      alpha: 1,
      yoyo: true,
      duration: 260,
      onComplete: () => circle.setScale(1).setAlpha(0),
    });
  }

  private checkGoalOverlap(): void {
    const dx = this.monkey.x - this.goalZone.x;
    const dy = this.monkey.y - this.goalZone.y;
    const r = this.goalZone.radius;
    if (dx * dx + dy * dy < r * r) {
      this.triggerCompletion();
    }
  }

  // ---------------------------------------------------------------------------
  // Failure + respawn
  // ---------------------------------------------------------------------------

  private checkFellOff(time: number): void {
    void time;
    if (this.isRespawning) return;
    if (time < this.respawnUntil) return;
    if (this.onVine) return;
    if (this.monkey.y > this.level.worldHeight + FALL_THRESHOLD_OFFSET) {
      this.isRespawning = true;
      this.triggerRespawn();
    }
  }

  private triggerRespawn(): void {
    const respawn = getRespawnPoint(this.level, this.state);
    this.playFall();
    this.cameras.main.fadeOut(200, 20, 70, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.isRespawning = false;
      this.onVine = false;
      const body = this.monkey.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = true;
      body.setVelocity(0, 0);
      this.monkey.setPosition(respawn.x, respawn.y);
      this.respawnUntil = this.time.now + INVULNERABILITY_MS;
      this.cameras.main.fadeIn(200, 20, 70, 20);
      this.time.delayedCall(RESPAWN_FREEZE_MS, () => {
        if (this.phase === 'playing') body.setVelocity(0, 0);
      });
      this.flashMonkey();
    });
  }

  private flashMonkey(): void {
    if (this.reducedMotion) return;
    this.tweens.add({
      targets: this.monkey,
      alpha: 0.3,
      yoyo: true,
      repeat: 3,
      duration: 100,
      onComplete: () => this.monkey.setAlpha(1),
    });
  }

  // ---------------------------------------------------------------------------
  // Pause / restart / fullscreen
  // ---------------------------------------------------------------------------

  private togglePause(): void {
    if (this.phase === 'complete') return;
    if (this.phase === 'start') { this.beginGame(); return; }
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.physics.world.pause();
      this.moveLeft = false;
      this.moveRight = false;
      this.pointers.clear();
      this.showPauseOverlay();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.physics.world.resume();
      this.clearOverlay();
    }
  }

  private toggleFullscreen(): void {
    this.scale.toggleFullscreen({ navigationUI: 'hide' });
  }

  private handleFullscreenFailure(): void {
    // brief message — reuse HUD area
    const msg = this.add.text(this.scale.width / 2, 80, 'Fullscreen not available', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    this.time.delayedCall(1600, () => msg.destroy());
  }

  private handleFullscreenChange(): void {
    this.applyLayout();
  }

  // ---------------------------------------------------------------------------
  // Overlays
  // ---------------------------------------------------------------------------

  private destroyOverlayObjects(): void {
    for (const obj of this.overlayObjects) {
      // Kill tweens on the object and its children before destroying so
      // the TweenManager never tries to update destroyed objects (this
      // avoids warnings on resize while a start-screen pulse tween is
      // still active).
      if (obj instanceof Phaser.GameObjects.Container) {
        for (const child of obj.list) {
          this.tweens.killTweensOf(child);
        }
      }
      this.tweens.killTweensOf(obj);
      obj.destroy();
    }
    this.overlayObjects = [];
  }

  private clearOverlay(): void {
    this.destroyOverlayObjects();
  }

  private showStartScreen(): void {
    this.physics.world.pause();
    // Center the overlay in canvas/screen coordinates so it stays visible at
    // every RESIZE-mode size (the previous design-space center = 400 vanished
    // off the right edge on narrow viewports). Each child also needs its own
    // scrollFactor(0) — children of a scrollFactor(0) container do NOT
    // inherit the factor in Phaser 3.
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const container = this.add.container(cx, cy).setScrollFactor(0).setDepth(300);
    this.overlayObjects.push(container);
    const bgRect = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x152a10, 0.7).setScrollFactor(0);
    container.add(bgRect);
    const titleSize = Math.min(56, Math.max(24, Math.round(this.scale.width / 16)));
    const title = this.add.text(0, -80, 'Canopy Caper', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${titleSize}px`,
      fontStyle: 'bold',
      color: '#f5d274',
      stroke: '#1a2a14',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(title);
    const subtitleSize = Math.min(22, Math.max(14, Math.round(this.scale.width / 36)));
    const subtitle = this.add.text(0, -16, 'Climb through the jungle! Swing on a vine! Collect the fruit!', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${subtitleSize}px`,
      color: '#fff',
      wordWrap: { width: Math.max(260, this.scale.width - 60) },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(subtitle);
    const instruction = this.add.text(0, 50, 'Tap or press Space to begin', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ffe066',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(instruction);
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: instruction,
        alpha: 0.4,
        yoyo: true,
        repeat: -1,
        duration: 800,
      });
    }
  }

  private showPauseOverlay(): void {
    const container = this.add.container(this.scale.width / 2, this.scale.height / 2)
      .setScrollFactor(0).setDepth(300);
    this.overlayObjects.push(container);
    // Add the full-screen input blocker FIRST so later-added interactive
    // buttons sit above it in container order and receive pointer events;
    // adding it last (the previous code) made it intercept every button tap.
    const bg = this.add.rectangle(0, 0, this.scale.width * 3, this.scale.height * 3, 0x152a10, 0.78).setInteractive();
    bg.setScrollFactor(0);
    container.add(bg);
    const titleSize = Math.min(44, Math.max(28, Math.round(this.scale.width / 18)));
    const title = this.add.text(0, -130, 'Paused', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${titleSize}px`,
      fontStyle: 'bold',
      color: '#f5d274',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(title);
    const buttonSize = Math.min(28, Math.max(18, Math.round(this.scale.width / 30)));
    const buttons = [
      { label: 'Resume', action: () => this.togglePause() },
      { label: 'Restart', action: () => { this.clearOverlay(); this.restartGame(); } },
      { label: this.fullscreenLabel(), action: () => this.toggleFullscreen() },
      { label: this.muteLabel(), action: () => this.toggleMute() },
    ];
    buttons.forEach((b, i) => {
      const btn = this.add.text(0, -50 + i * 56, b.label, {
        fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
        fontSize: `${buttonSize}px`,
        color: '#fff',
        backgroundColor: 'rgba(40,80,30,0.95)',
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
      btn.on('pointerdown', () => b.action());
      container.add(btn);
    });
  }

  private triggerCompletion(): void {
    if (this.phase === 'complete') return;
    this.phase = 'complete';
    this.state = completeGame(this.state);
    this.physics.world.pause();
    this.monkey.setTexture('monkey-celebrate');
    this.playComplete();
    this.spawnCompletionLeaves();
    this.showCompletionOverlay();
    // celebration bounce — store the reference so restartGame can stop it.
    if (!this.reducedMotion) {
      this.completeTween = this.tweens.add({
        targets: this.monkey,
        scale: 1.18,
        yoyo: true,
        repeat: -1,
        duration: 320,
      });
    }
  }

  private showCompletionOverlay(): void {
    const container = this.add.container(this.scale.width / 2, this.scale.height / 2)
      .setScrollFactor(0).setDepth(300);
    this.overlayObjects.push(container);
    const bg = this.add.rectangle(0, 0, this.scale.width * 3, this.scale.height * 3, 0x152a10, 0.78).setInteractive();
    bg.setScrollFactor(0);
    container.add(bg);
    const titleSize = Math.min(40, Math.max(18, Math.round(this.scale.width / 14)));
    const title = this.add.text(0, -80, 'CANOPY CAPER COMPLETE!', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${titleSize}px`,
      fontStyle: 'bold',
      color: '#f5d274',
      stroke: '#1a2a14',
      strokeThickness: 5,
      wordWrap: { width: Math.max(280, this.scale.width - 40) },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(title);
    const scoreSize = Math.min(30, Math.max(18, Math.round(this.scale.width / 20)));
    const score = this.add.text(0, -10, `\u{1F34E} ${fruitCount(this.state)}/${this.level.fruits.length}`, {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: `${scoreSize}px`,
      color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(score);
    const replaySize = Math.min(26, Math.max(18, Math.round(this.scale.width / 22)));
    const replay = this.add.text(0, 70, 'Play Again', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: `${replaySize}px`,
      color: '#fff',
      backgroundColor: 'rgba(40,80,30,0.95)',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    replay.on('pointerdown', () => { this.clearOverlay(); this.restartGame(); });
    container.add(replay);
  }

  private spawnCompletionLeaves(): void {
    if (this.reducedMotion) return;
    const cam = this.cameras.main;
    for (let i = 0; i < 24; i++) {
      const color = i % 2 === 0 ? C_PAUSE_GOLD : C_PARTICLE_GREEN;
      const leaf = this.add.ellipse(
        cam.worldView.x + Math.random() * cam.worldView.width,
        cam.worldView.y - 10,
        10, 5, color, 0.9,
      ).setDepth(310).setAngle(Math.random() * 360);
      this.tweens.add({
        targets: leaf,
        y: leaf.y + cam.worldView.height + 20,
        angle: leaf.angle + 240,
        alpha: 0,
        duration: 1400 + Math.random() * 600,
        ease: 'Sine.easeIn',
        onComplete: () => leaf.destroy(),
      });
    }
  }

  private toggleMute(): void {
    this.muted = !this.muted;
    this.clearOverlay();
    this.showPauseOverlay();
  }

  private muteLabel(): string {
    return this.muted ? 'Sound: Off' : 'Sound: On';
  }

  private fullscreenLabel(): string {
    return this.scale.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
  }

  // ---------------------------------------------------------------------------
  // Audio
  // ---------------------------------------------------------------------------

  private getAudio(): AudioContext | undefined {
    if (this.audio !== undefined) return this.audio;
    const AudioCtx = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx === undefined) return undefined;
    this.audio = new AudioCtx();
    return this.audio;
  }

  private resumeAudio(): void {
    const audio = this.getAudio();
    if (audio !== undefined && audio.state === 'suspended') {
      void audio.resume().catch(() => undefined);
    }
  }

  private ifNotMuted(play: () => void): void {
    if (this.muted) return;
    play();
  }

  private playTone(frequency: number, duration: number, delay = 0): void {
    if (this.muted) return;
    const audio = this.getAudio();
    if (audio === undefined) return;
    const play = (): void => {
      const start = audio.currentTime + delay / 1000;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = frequency;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.05, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration / 1000);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration / 1000);
    };
    if (audio.state === 'suspended') void audio.resume().then(play).catch(() => undefined);
    else play();
  }

  private playSweep(startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', delay = 0, level = 0.05): void {
    this.ifNotMuted(() => {
      const audio = this.getAudio();
      if (audio === undefined) return;
      const play = () => {
        const begin = audio.currentTime + delay / 1000;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, begin);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), begin + duration / 1000);
        gain.gain.setValueAtTime(level, begin);
        gain.gain.exponentialRampToValueAtTime(0.001, begin + duration / 1000);
        osc.connect(gain).connect(audio.destination);
        osc.start(begin);
        osc.stop(begin + duration / 1000);
      };
      if (audio.state === 'suspended') void audio.resume().then(play).catch(() => undefined);
      else play();
    });
  }

  private playNoise(duration: number, freqStart: number, freqEnd: number, level = 0.06): void {
    this.ifNotMuted(() => {
      const audio = this.getAudio();
      if (audio === undefined) return;
      const play = () => {
        const begin = audio.currentTime;
        const bufferLen = Math.floor(audio.sampleRate * duration / 1000);
        const buffer = audio.createBuffer(1, bufferLen, audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferLen; i++) data[i] = Math.random() * 2 - 1;
        const source = audio.createBufferSource();
        source.buffer = buffer;
        const filter = audio.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freqStart, begin);
        filter.frequency.linearRampToValueAtTime(freqEnd, begin + duration / 1000);
        const gain = audio.createGain();
        gain.gain.setValueAtTime(level, begin);
        gain.gain.exponentialRampToValueAtTime(0.001, begin + duration / 1000);
        source.connect(filter).connect(gain).connect(audio.destination);
        source.start(begin);
        source.stop(begin + duration / 1000);
      };
      if (audio.state === 'suspended') void audio.resume().then(play).catch(() => undefined);
      else play();
    });
  }

  private playJump(): void {
    this.playSweep(300, 600, 100);
  }

  private playLand(): void {
    this.playSweep(120, 80, 80, 'square', 0, 0.04);
  }

  private playVineGrab(): void {
    this.playSweep(220, 180, 150, 'sawtooth', 0, 0.04);
    this.playSweep(204, 196, 50, 'sine', 60, 0.03);
  }

  private playVineRelease(): void {
    this.playNoise(100, 800, 200, 0.05);
  }

  private playFruitCollect(): void {
    this.playTone(880, 80);
    this.playTone(1100, 60, 60);
  }

  private playComplete(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.playTone(n, 120, i * 130));
  }

  private playFall(): void {
    this.playSweep(400, 100, 300);
  }

  // ---------------------------------------------------------------------------
  // Resize and shutdown
  // ---------------------------------------------------------------------------

  private handleResize(): void {
    this.applyLayout();
  }

  /**
   * Recompute layout and refresh every screen-fixed element (HUD, touch
   * controls, camera deadzone, and any active overlay) for the current
   * canvas size. Called by both RESIZE and fullscreen-change handlers.
   */
  private applyLayout(): void {
    this.layout = createLayout(this.scale.width, this.scale.height);
    this.refreshHud();
    this.refreshTouchControls();
    this.refreshCameraDeadzone();
    this.refreshOverlay();
  }

  private refreshHud(): void {
    const hud = this.layout.hud;
    this.fruitText.setPosition(hud.fruitCounter.x, hud.fruitCounter.y);
    this.fruitText.setStyle({
      fontSize: `${Math.max(16, Math.round(22 * this.layout.scale))}px`,
    });
    const r = hud.pauseButton.radius;
    this.pauseButton.setPosition(hud.pauseButton.x, hud.pauseButton.y);
    this.pauseBg.clear();
    this.pauseBg.fillStyle(C_HUD_BG, 0.78);
    this.pauseBg.fillCircle(0, 0, r);
    this.pauseBg.lineStyle(3, C_BUTTON_BORDER, 1);
    this.pauseBg.strokeCircle(0, 0, r);
    this.pauseLabel.setFontSize(`${Math.round(r * 1.1)}px`);
    this.pauseButton.setSize(r * 2, r * 2);
  }

  private refreshTouchControls(): void {
    // Destroying and recreating the jump button rebuilds its hit area and
    // visual at the new buttonSize. Reset touchJumpHeld so the recreated
    // button starts in the released state (the previous button's pointerup
    // never fires after destroy).
    this.touchJumpHeld = false;
    this.jumpButton.destroy();
    this.setUpTouchZones();
  }

  private refreshOverlay(): void {
    if (this.overlayObjects.length === 0) return;
    this.destroyOverlayObjects();
    switch (this.phase) {
      case 'start': this.showStartScreen(); break;
      case 'paused': this.showPauseOverlay(); break;
      case 'complete': this.showCompletionOverlay(); break;
      // 'playing' has no overlay to rebuild.
    }
  }

  private shutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, this.handleFullscreenChange, this);
    this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.handleFullscreenChange, this);
    this.scale.off(Phaser.Scale.Events.FULLSCREEN_FAILED, this.handleFullscreenFailure, this);
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.cameras.main.removeAllListeners();
    void this.audio?.close();
    this.audio = undefined;
  }
}