import Phaser from 'phaser';
import { KITCHEN, clamp, type KitchenRoom, type Rect } from '../game/room';
import {
  createGuard,
  GUARD_EYE_OFFSET,
  sendToInvestigate,
  stepGuard,
  type Guard,
  type GuardEvents,
} from '../game/guard';
import {
  beginSteal,
  cancelSteal,
  createHeistState,
  escape,
  kickSpoon,
  markCaught,
  recover,
  returnSpoon,
  toggleHide,
  updateSteal,
  type HeistState,
} from '../game/rules';
import { createLayout, type CheeseLayout } from '../game/layout';
import { resolveHorizontalVelocity } from '../game/movement';

// === Tuning constants ===
const GRAVITY = 1000;
const RUN_SPEED = 260;
const JUMP_VELOCITY = -640;
const JUMP_CUT_VELOCITY = -240;
const COYOTE_TIME = 100;
const JUMP_BUFFER = 120;
const MOUSE_W = 26;
const MOUSE_H = 24;
const CAUGHT_RESET_MS = 1600;
const RUN_FRAME_MS = 110;
const CAT_FRAME_MS = 170;

// === Palette (warm moonlit kitchen) ===
const C_WALL_TOP = 0x2b2a4a;
const C_WALL_BOTTOM = 0x4a3f5e;
const C_FLOOR_DARK = 0x3a2a20;
const C_FLOOR_LIGHT = 0x52382a;
const C_COUNTER_WOOD = 0x8a5a32;
const C_COUNTER_FRONT = 0x6e4526;
const C_COUNTER_DOOR = 0x7a4e2a;
const C_MOUSE_BODY = 0x9a7a5a;
const C_MOUSE_BELLY = 0xd8b898;
const C_MOUSE_PINK = 0xf2a08a;
const C_MOUSE_EAR = 0xb88870;
const C_CAT_BODY = 0x6a5a7a;
const C_CAT_STRIPE = 0x4a3a5a;
const C_CAT_BELLY = 0xe8dcc8;
const C_CAT_PINK = 0xf2a08a;
const C_CHEESE = 0xffd23f;
const C_CHEESE_DARK = 0xc98a1e;
const C_CHEESE_HOLE = 0xe8a92e;
const C_SPOON = 0xd8d8e8;
const C_MUG = 0xd96a4a;
const C_MUG_INNER = 0x4a1f14;
const C_VENT = 0x9a9aae;
const C_BREAD = 0xc8905a;
const C_BREAD_CRUST = 0x9a6a3a;
const C_CONE_AMBER = 0xffd166;
const C_CONE_RED = 0xff5555;
const C_HUD_BG = 0x241f33;
const C_HUD_TEXT = '#f5ecd8';
const C_BUTTON_BORDER = 0xd8b25a;
const C_GOLD = 0xffd166;
const C_GOOD_GREEN = 0x7fe87f;

type Phase = 'start' | 'playing' | 'paused' | 'caught' | 'won';
type MovementDirection = 'left' | 'right';

const CAUGHT_LINES = [
  'The cat caught you by the tail!',
  'Busted! The cat winks and sets you down.',
  'Sneaky paw! The cat found you.',
  'A giant sneeze gave you away!',
  'The cat bopped you with a soft paw.',
] as const;

/**
 * Single scene for Cheese Heist: one warm moonlit kitchen room, an
 * expressive mouse, a patrolling cat with a readable sight cone, a bread
 * loaf and a mug as cover, a hiding spot, a kickable spoon distraction, a
 * guarded cheese, and a vent escape. Getting caught is a quick funny reset,
 * never a punishment. All visuals and audio are procedural.
 */
export class CheeseHeistScene extends Phaser.Scene {
  private readonly room: KitchenRoom = KITCHEN;
  private state: HeistState = createHeistState();
  private phase: Phase = 'start';
  private layout!: CheeseLayout;
  private reducedMotion = false;

  // world objects
  private mouse!: Phaser.Physics.Arcade.Sprite;
  private solids: Phaser.GameObjects.Zone[] = [];
  private guardState: Guard = createGuard(KITCHEN);
  private guardSprite!: Phaser.GameObjects.Sprite;
  private cone!: Phaser.GameObjects.Graphics;
  private spoonSprite!: Phaser.GameObjects.Sprite;
  private cheeseSprite!: Phaser.GameObjects.Sprite;
  private ventGlow!: Phaser.GameObjects.Arc;
  private mugEars!: Phaser.GameObjects.Sprite;
  private alertBubble!: Phaser.GameObjects.Text;
  private questionBubble!: Phaser.GameObjects.Text;
  private stealRing!: Phaser.GameObjects.Graphics;
  private spoonTween: Phaser.Tweens.Tween | null = null;

  // input
  private moveLeft = false;
  private moveRight = false;
  private keyboardMoveLeft = false;
  private keyboardMoveRight = false;
  private jumpHeld = false;
  private keyboardJumpHeld = false;
  private jumpBufferTime = 0;
  private coyoteEnd = 0;
  private contextHeld = false;
  private contextPressed = false;
  private kickPressed = false;
  private movementPointers = new Map<number, MovementDirection>();
  private jumpPointers = new Set<number>();
  private contextPointers = new Set<number>();
  private kickPointers = new Set<number>();

  // HUD / touch
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Container;
  private pauseBg!: Phaser.GameObjects.Graphics;
  private pauseLabel!: Phaser.GameObjects.Text;
  private touchButtons: Phaser.GameObjects.Container[] = [];

  // overlays
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private completeTween: Phaser.Tweens.Tween | null = null;
  private caughtLine = '';

  // audio
  private audio: AudioContext | undefined;

  constructor() {
    super('CheeseHeist');
  }

  create(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.layout = createLayout(this.scale.width, this.scale.height);
    this.state = createHeistState();
    this.phase = 'start';
    this.guardState = createGuard(KITCHEN);
    this.resetInput();

    this.cameras.main.setBackgroundColor(C_WALL_TOP);
    this.physics.world.setBounds(0, 0, this.room.worldWidth, this.room.worldHeight);
    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.pause();

    this.drawBackground();
    this.generateTextures();
    this.setUpSolids();
    this.setUpMouse();
    this.setUpProps();
    this.setUpGuard();
    this.setUpCamera();
    this.setUpHud();
    this.setUpTouchButtons();
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
    this.generateMouseTexture('mouse-idle', 'idle');
    this.generateMouseTexture('mouse-run1', 'run1');
    this.generateMouseTexture('mouse-run2', 'run2');
    this.generateMouseTexture('mouse-jump', 'jump');
    this.generateMouseTexture('mouse-carry', 'carry');
    this.generateMouseTexture('mouse-caught', 'caught');
    this.generateCatTexture('cat-idle', 'idle');
    this.generateCatTexture('cat-walk1', 'walk1');
    this.generateCatTexture('cat-walk2', 'walk2');
    this.generateCatTexture('cat-alert', 'alert');
    this.generateCatTexture('cat-chase', 'chase');
    this.generateCatTexture('cat-search', 'search');
    this.generateCatTexture('cat-grumpy', 'grumpy');
    this.generateCheeseTexture();
    this.generateSpoonTexture();
    this.generateMugTexture();
    this.generateVentTexture();
    this.generateBreadTexture();
    this.generateCounterTexture();
    this.generateFloorTileTexture();
    this.generateMugEarsTexture();
  }

  private generateMouseTexture(key: string, pose: 'idle' | 'run1' | 'run2' | 'jump' | 'carry' | 'caught'): void {
    const W = 44;
    const H = 40;
    const g = this.add.graphics();
    const cx = 20;
    // curly tail
    g.lineStyle(3, C_MOUSE_BODY, 1);
    g.beginPath();
    g.moveTo(cx - 8, 28);
    g.lineTo(cx - 16, 22);
    g.lineTo(cx - 13, 13);
    g.strokePath();
    // body
    g.fillStyle(C_MOUSE_BODY, 1);
    g.fillEllipse(cx, 27, 24, 15);
    g.fillStyle(C_MOUSE_BELLY, 0.8);
    g.fillEllipse(cx + 2, 29, 13, 9);
    // feet
    g.fillStyle(C_MOUSE_PINK, 0.9);
    if (pose === 'run1') {
      g.fillEllipse(cx - 4, 34, 7, 5);
      g.fillEllipse(cx + 8, 33, 7, 5);
    } else if (pose === 'run2') {
      g.fillEllipse(cx - 8, 33, 7, 5);
      g.fillEllipse(cx + 4, 34, 7, 5);
    } else if (pose === 'jump') {
      g.fillEllipse(cx - 6, 36, 6, 4);
      g.fillEllipse(cx + 7, 35, 6, 4);
    } else {
      g.fillEllipse(cx - 5, 35, 7, 5);
      g.fillEllipse(cx + 7, 35, 7, 5);
    }
    // head
    g.fillStyle(C_MOUSE_BODY, 1);
    g.fillCircle(cx + 12, 14, 9);
    // ears
    g.fillStyle(C_MOUSE_EAR, 1);
    g.fillCircle(cx + 5, 6, 5);
    g.fillCircle(cx + 18, 5, 5);
    g.fillStyle(C_MOUSE_PINK, 0.9);
    g.fillCircle(cx + 5, 6, 2.6);
    g.fillCircle(cx + 18, 5, 2.6);
    // eyes
    if (pose === 'caught') {
      g.lineStyle(2, 0x2a1a12, 1);
      g.lineBetween(cx + 10, 11, cx + 14, 15);
      g.lineBetween(cx + 14, 11, cx + 10, 15);
      g.lineBetween(cx + 18, 11, cx + 22, 15);
      g.lineBetween(cx + 22, 11, cx + 18, 15);
      g.lineStyle(1, 0x2a1a12, 0.5);
      g.beginPath();
      g.arc(cx + 12, 18, 4, 0, Math.PI * 1.5);
      g.strokePath();
    } else {
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(cx + 12, 14, 1.6);
      g.fillCircle(cx + 18, 14, 1.6);
    }
    // nose and whiskers
    g.fillStyle(C_MOUSE_PINK, 1);
    g.fillCircle(cx + 23, 15, 2.2);
    g.lineStyle(1, 0x3a2a1a, 0.6);
    g.lineBetween(cx + 25, 13, cx + 32, 11);
    g.lineBetween(cx + 25, 16, cx + 32, 16);
    // carried cheese
    if (pose === 'carry') {
      g.fillStyle(C_CHEESE, 1);
      g.fillTriangle(cx + 22, 24, cx + 34, 24, cx + 22, 32);
      g.fillStyle(C_CHEESE_HOLE, 0.9);
      g.fillCircle(cx + 27, 27, 1.6);
      g.fillCircle(cx + 30, 30, 1.2);
    }
    g.generateTexture(key, W, H);
    g.destroy();
  }

  private generateCatTexture(key: string, pose: 'idle' | 'walk1' | 'walk2' | 'alert' | 'chase' | 'search' | 'grumpy'): void {
    const W = 72;
    const H = 88;
    const g = this.add.graphics();
    const cx = 36;
    // tail
    g.lineStyle(7, C_CAT_BODY, 1);
    g.beginPath();
    g.moveTo(cx - 18, 52);
    g.lineTo(cx - 28, 44);
    g.lineTo(cx - 30, 34);
    g.strokePath();
    // body
    g.fillStyle(C_CAT_BODY, 1);
    g.fillEllipse(cx, 54, 44, 58);
    g.fillStyle(C_CAT_BELLY, 0.9);
    g.fillEllipse(cx + 2, 62, 22, 36);
    // stripes
    g.lineStyle(5, C_CAT_STRIPE, 0.8);
    g.lineBetween(cx - 10, 40, cx - 2, 46);
    g.lineBetween(cx - 8, 50, cx, 56);
    g.lineBetween(cx - 6, 60, cx + 2, 66);
    // feet
    g.fillStyle(C_CAT_BODY, 1);
    if (pose === 'walk1') {
      g.fillEllipse(cx - 12, 82, 12, 8);
      g.fillEllipse(cx + 14, 82, 12, 8);
    } else if (pose === 'walk2') {
      g.fillEllipse(cx - 14, 82, 12, 8);
      g.fillEllipse(cx + 12, 82, 12, 8);
    } else {
      g.fillEllipse(cx - 12, 83, 13, 8);
      g.fillEllipse(cx + 12, 83, 13, 8);
    }
    // head
    g.fillStyle(C_CAT_BODY, 1);
    g.fillCircle(cx, 20, 18);
    // ears
    g.fillStyle(C_CAT_BODY, 1);
    g.fillTriangle(cx - 14, 8, cx - 2, 14, cx - 10, 0);
    g.fillTriangle(cx + 14, 8, cx + 2, 14, cx + 10, 0);
    g.fillStyle(C_CAT_PINK, 0.9);
    g.fillTriangle(cx - 11, 8, cx - 5, 12, cx - 9, 3);
    g.fillTriangle(cx + 11, 8, cx + 5, 12, cx + 9, 3);
    g.fillStyle(C_CAT_BODY, 1);
    // eyes and mouth
    if (pose === 'alert') {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx - 8, 18, 6);
      g.fillCircle(cx + 8, 18, 6);
      g.fillStyle(0x1a1a2a, 1);
      g.fillCircle(cx - 8, 18, 2);
      g.fillCircle(cx + 8, 18, 2);
    } else if (pose === 'chase') {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx - 8, 17, 5);
      g.fillCircle(cx + 8, 17, 5);
      g.fillStyle(0x1a1a2a, 1);
      g.fillCircle(cx - 7, 17, 2.2);
      g.fillCircle(cx + 9, 17, 2.2);
      g.lineStyle(3, C_CAT_STRIPE, 1);
      g.lineBetween(cx - 14, 12, cx - 3, 14);
      g.lineBetween(cx + 14, 12, cx + 3, 14);
      g.fillStyle(0x5a2a2a, 1);
      g.fillEllipse(cx + 4, 26, 8, 5);
    } else if (pose === 'search') {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx - 8, 19, 4.5);
      g.fillCircle(cx + 8, 19, 4.5);
      g.fillStyle(0x1a1a2a, 1);
      g.fillCircle(cx - 8, 19, 2);
      g.fillCircle(cx + 8, 19, 2);
      g.lineStyle(3, C_CAT_STRIPE, 1);
      g.lineBetween(cx - 14, 14, cx - 3, 11);
    } else if (pose === 'grumpy') {
      g.lineStyle(3, C_CAT_STRIPE, 1);
      g.lineBetween(cx - 13, 18, cx - 3, 18);
      g.lineBetween(cx + 13, 18, cx + 3, 18);
      g.fillStyle(0x5a2a2a, 1);
      g.fillEllipse(cx, 26, 8, 4);
    } else {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx - 8, 19, 4.5);
      g.fillCircle(cx + 8, 19, 4.5);
      g.fillStyle(0x1a1a2a, 1);
      g.fillCircle(cx - 8, 19, 2);
      g.fillCircle(cx + 8, 19, 2);
    }
    // nose and whiskers
    g.fillStyle(C_CAT_PINK, 1);
    g.fillTriangle(cx - 2, 22, cx + 2, 22, cx, 25);
    g.lineStyle(1.5, 0x3a2a4a, 0.7);
    g.lineBetween(cx - 10, 30, cx - 22, 28);
    g.lineBetween(cx - 10, 32, cx - 22, 33);
    g.lineBetween(cx + 10, 30, cx + 22, 28);
    g.lineBetween(cx + 10, 32, cx + 22, 33);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  private generateCheeseTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(C_CHEESE, 1);
    g.fillTriangle(6, 34, 42, 34, 42, 8);
    g.fillStyle(C_CHEESE_HOLE, 0.9);
    g.fillCircle(22, 26, 4);
    g.fillCircle(34, 22, 2.6);
    g.fillCircle(26, 16, 2);
    g.fillStyle(C_CHEESE_DARK, 1);
    g.fillRect(42, 8, 3, 26);
    g.generateTexture('cheese', 48, 40);
    g.destroy();
  }

  private generateSpoonTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(C_SPOON, 1);
    g.fillRoundedRect(0, 4, 30, 4, 2);
    g.fillEllipse(34, 6, 18, 11);
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(33, 4, 10, 4);
    g.generateTexture('spoon', 44, 12);
    g.destroy();
  }

  private generateMugTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(C_MUG, 1);
    g.fillRoundedRect(10, 16, 60, 60, 10);
    g.fillStyle(0xe88a68, 0.8);
    g.fillRoundedRect(14, 20, 52, 10, 6);
    g.fillStyle(C_MUG_INNER, 1);
    g.fillEllipse(40, 18, 48, 12);
    g.lineStyle(8, C_MUG, 1);
    g.beginPath();
    g.arc(70, 44, 12, -Math.PI / 2, Math.PI / 2);
    g.strokePath();
    g.generateTexture('mug', 80, 80);
    g.destroy();
  }

  private generateVentTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x3a3a50, 1);
    g.fillCircle(36, 36, 32);
    g.fillStyle(C_VENT, 1);
    g.fillCircle(36, 36, 27);
    g.lineStyle(3, 0x5a5a72, 1);
    g.strokeCircle(36, 36, 22);
    g.lineStyle(3, 0x5a5a72, 1);
    g.lineBetween(36, 16, 36, 56);
    g.lineBetween(24, 20, 24, 52);
    g.lineBetween(48, 20, 48, 52);
    g.fillStyle(0x3a3a50, 1);
    g.fillCircle(10, 10, 3);
    g.fillCircle(62, 10, 3);
    g.fillCircle(10, 62, 3);
    g.fillCircle(62, 62, 3);
    g.generateTexture('vent', 72, 72);
    g.destroy();
  }

  private generateBreadTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(C_BREAD_CRUST, 1);
    g.fillRoundedRect(2, 8, 92, 34, 16);
    g.fillStyle(C_BREAD, 1);
    g.fillRoundedRect(8, 6, 80, 28, 12);
    g.lineStyle(2, C_BREAD_CRUST, 0.8);
    g.lineBetween(30, 8, 26, 30);
    g.lineBetween(50, 8, 46, 30);
    g.lineBetween(68, 8, 64, 30);
    g.generateTexture('bread', 96, 48);
    g.destroy();
  }

  private generateCounterTexture(): void {
    const g = this.add.graphics();
    // top surface
    g.fillStyle(C_COUNTER_WOOD, 1);
    g.fillRect(0, 0, 400, 30);
    g.fillStyle(0xa86e3e, 0.7);
    g.fillRect(0, 0, 400, 8);
    // front panel
    g.fillStyle(C_COUNTER_FRONT, 1);
    g.fillRect(0, 30, 400, 150);
    // doors
    g.fillStyle(C_COUNTER_DOOR, 1);
    g.fillRoundedRect(16, 46, 172, 118, 6);
    g.fillRoundedRect(212, 46, 172, 118, 6);
    g.lineStyle(3, 0x4a2c14, 0.8);
    g.strokeRoundedRect(16, 46, 172, 118, 6);
    g.strokeRoundedRect(212, 46, 172, 118, 6);
    g.fillStyle(0xe8c890, 1);
    g.fillEllipse(170, 105, 6, 6);
    g.fillEllipse(226, 105, 6, 6);
    g.generateTexture('counter', 400, 180);
    g.destroy();
  }

  private generateFloorTileTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(C_FLOOR_DARK, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(C_FLOOR_LIGHT, 0.5);
    g.fillRect(0, 0, 64, 14);
    g.lineStyle(2, 0x2a1a12, 0.6);
    g.lineBetween(0, 14, 64, 14);
    g.lineBetween(32, 0, 32, 14);
    g.generateTexture('floor-tile', 64, 64);
    g.destroy();
  }

  private generateMugEarsTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(C_MOUSE_EAR, 1);
    g.fillCircle(7, 10, 6);
    g.fillCircle(19, 10, 6);
    g.fillStyle(C_MOUSE_PINK, 0.9);
    g.fillCircle(7, 10, 3);
    g.fillCircle(19, 10, 3);
    g.generateTexture('mouse-ears', 26, 18);
    g.destroy();
  }

  // ---------------------------------------------------------------------------
  // World setup
  // ---------------------------------------------------------------------------

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.setDepth(1);
    // night wall gradient
    for (let y = 0; y <= this.room.floorY; y += 4) {
      const t = y / this.room.floorY;
      const r = Math.round(0x2b + (0x4a - 0x2b) * t);
      const gr = Math.round(0x2a + (0x3f - 0x2a) * t);
      const b = Math.round(0x4a + (0x5e - 0x4a) * t);
      bg.fillStyle((r << 16) | (gr << 8) | b, 1);
      bg.fillRect(0, y, this.room.worldWidth, 4);
    }
    // baseboard
    bg.fillStyle(0x2a2030, 1);
    bg.fillRect(0, 762, this.room.worldWidth, 58);
    bg.fillStyle(0x3a3044, 0.8);
    bg.fillRect(0, 762, this.room.worldWidth, 6);

    // moonlit window on the right wall above the counter
    bg.fillStyle(0x1c1b30, 1);
    bg.fillRect(1370, 90, 160, 190);
    bg.lineStyle(6, 0x3a3450, 1);
    bg.strokeRect(1370, 90, 160, 190);
    bg.lineStyle(4, 0x3a3450, 1);
    bg.lineBetween(1450, 90, 1450, 280);
    bg.lineBetween(1370, 185, 1530, 185);
    bg.fillStyle(0x8f8a9a, 0.9);
    bg.fillCircle(1450, 150, 42);
    bg.fillStyle(0xd8d4e0, 1);
    bg.fillCircle(1444, 144, 34);
    bg.fillStyle(0x8f8a9a, 0.5);
    bg.fillCircle(1436, 138, 8);
    // stars
    bg.fillStyle(0xd8d4e0, 0.9);
    bg.fillCircle(1395, 120, 2);
    bg.fillCircle(1412, 140, 1.6);
    bg.fillCircle(1485, 120, 2);
    bg.fillCircle(1508, 165, 1.6);
    // moonlight shaft
    bg.fillStyle(0xaab0e8, 0.06);
    bg.fillTriangle(1370, 90, 1290, 820, 1530, 820);

    // wall cabinet above the bread (visual only)
    bg.fillStyle(0x4a3a58, 1);
    bg.fillRoundedRect(140, 290, 200, 150, 8);
    bg.fillStyle(0x5a4a6a, 1);
    bg.fillRoundedRect(152, 302, 82, 126, 4);
    bg.fillRoundedRect(246, 302, 82, 126, 4);
    bg.fillStyle(0xe8c890, 1);
    bg.fillEllipse(220, 365, 5, 5);
    bg.fillEllipse(314, 365, 5, 5);
    // shelf with jars
    bg.fillStyle(0x4a3a58, 1);
    bg.fillRect(60, 420, 640, 12);
    bg.fillStyle(0x8a9a7a, 0.9);
    bg.fillRoundedRect(80, 396, 22, 26, 4);
    bg.fillRoundedRect(120, 400, 16, 22, 4);
    bg.fillStyle(0xd8a06a, 0.9);
    bg.fillRoundedRect(160, 398, 18, 24, 4);
    bg.fillStyle(0x8a9a7a, 0.9);
    bg.fillRoundedRect(200, 396, 22, 26, 4);

    // fridge silhouette behind the counter (visual only)
    bg.fillStyle(0x4a4a5e, 1);
    bg.fillRoundedRect(1488, 470, 112, 350, 8);
    bg.fillStyle(0x5c5c72, 1);
    bg.fillRect(1496, 480, 96, 330);
    bg.fillStyle(0x3a3a4e, 1);
    bg.fillRect(1496, 480, 6, 330);
    bg.fillStyle(0x8a8a9e, 1);
    bg.fillRoundedRect(1512, 500, 4, 40, 2);
    bg.fillRoundedRect(1512, 640, 4, 40, 2);
  }

  private setUpSolids(): void {
    for (const solid of this.room.solids) {
      const zone = this.add.zone(
        solid.x + solid.width / 2,
        solid.y + solid.height / 2,
        solid.width,
        solid.height,
      );
      this.physics.add.existing(zone, true);
      this.solids.push(zone);
    }
    // visuals for the solids
    const floor = this.add.tileSprite(
      this.room.floor.x + this.room.floor.width / 2,
      this.room.floor.y + this.room.floor.height / 2,
      this.room.floor.width,
      this.room.floor.height,
      'floor-tile',
    );
    floor.setDepth(3);
    this.add.image(1300, 730, 'counter').setDepth(8);
    this.add.image(230, 796, 'bread').setDepth(9);
  }

  private setUpMouse(): void {
    const start = this.room.mouseStart;
    this.mouse = this.physics.add.sprite(start.x, start.y, 'mouse-idle');
    this.mouse.setBounce(0);
    this.mouse.setCollideWorldBounds(false);
    (this.mouse.body as Phaser.Physics.Arcade.Body).setSize(MOUSE_W, MOUSE_H, true);
    this.mouse.setMaxVelocity(RUN_SPEED, 1400);
    this.mouse.setDepth(25);
    this.mouse.setFlipX(false);
    this.physics.add.collider(this.mouse, this.solids);
  }

  private setUpProps(): void {
    const room = this.room;
    // pedestal plate
    const plate = this.add.ellipse(room.cheeseX, room.cheeseY + 14, 54, 10, 0xd8d0c0, 0.9);
    plate.setDepth(7);
    this.cheeseSprite = this.add.sprite(room.cheeseX, room.cheeseY, 'cheese');
    this.cheeseSprite.setDepth(10);
    this.cheeseSprite.setAngle(-6);

    this.spoonSprite = this.add.sprite(room.spoonHomeX, 812, 'spoon');
    this.spoonSprite.setDepth(9);
    this.spoonSprite.setAngle(-8);

    this.add.image(room.mugX, room.mugY, 'mug').setDepth(11);
    this.mugEars = this.add.sprite(room.mugX - 2, room.mugY - 28, 'mouse-ears');
    this.mugEars.setDepth(12);
    this.mugEars.setVisible(false);

    this.add.image(room.ventX, room.ventY, 'vent').setDepth(9);
    this.ventGlow = this.add.circle(room.ventX, room.ventY, 46, C_GOOD_GREEN, 0);
    this.ventGlow.setDepth(6);
    this.ventGlow.setVisible(false);

    this.stealRing = this.add.graphics();
    this.stealRing.setDepth(26);

    this.cone = this.add.graphics();
    this.cone.setDepth(5);
  }

  private setUpGuard(): void {
    const g = this.guardState;
    this.guardSprite = this.add.sprite(g.x, g.y, 'cat-idle');
    this.guardSprite.setDepth(20);
    this.alertBubble = this.add.text(0, 0, '!', {
      fontFamily: 'sans-serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: '#ff5a5a',
      stroke: '#2a1030',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(46).setVisible(false);
    this.questionBubble = this.add.text(0, 0, '?', {
      fontFamily: 'sans-serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#7fb8ff',
      stroke: '#10304a',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(46).setVisible(false);
  }

  private setUpCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.room.worldWidth, this.room.worldHeight);
    cam.setZoom(this.layout.zoom);
    cam.startFollow(this.mouse, true, 0.12, 0.12);
  }

  // ---------------------------------------------------------------------------
  // HUD and touch controls
  // ---------------------------------------------------------------------------

  private setUpHud(): void {
    const hud = this.layout.hud;
    this.statusText = this.add.text(hud.status.x, hud.status.y, '', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${Math.max(15, Math.round(20 * this.layout.zoom))}px`,
      fontStyle: 'bold',
      color: C_HUD_TEXT,
      backgroundColor: 'rgba(30,24,45,0.72)',
      padding: { x: 10, y: 6 },
    });
    this.statusText.setScrollFactor(0);
    this.statusText.setDepth(200);

    this.hintText = this.add.text(hud.hint.x, hud.hint.y, '', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${Math.max(14, Math.round(17 * this.layout.zoom))}px`,
      fontStyle: 'bold',
      color: '#ffe9a8',
      backgroundColor: 'rgba(30,24,45,0.6)',
      padding: { x: 10, y: 5 },
    });
    this.hintText.setOrigin(0.5, 1);
    this.hintText.setScrollFactor(0);
    this.hintText.setDepth(200);

    // pause button
    this.pauseButton = this.add.container(hud.pauseButton.x, hud.pauseButton.y);
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
    this.pauseButton.setInteractive({
      hitArea: new Phaser.Geom.Circle(r, r, r),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true,
    });
    this.pauseButton.on('pointerdown', () => this.togglePause());
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setDepth(201);
  }

  private makeTouchButton(
    zone: Rect,
    label: string,
    onDown: (pointer: Phaser.Input.Pointer) => void,
    onUp: (pointer: Phaser.Input.Pointer) => void,
  ): Phaser.GameObjects.Container {
    const r = zone.width / 2;
    const container = this.add.container(zone.x + r, zone.y + r).setScrollFactor(0);
    const bg = this.add.graphics();
    bg.fillStyle(C_HUD_BG, 0.75);
    bg.fillCircle(0, 0, r);
    bg.lineStyle(3, C_BUTTON_BORDER, 0.9);
    bg.strokeCircle(0, 0, r - 2);
    container.add(bg);
    const fontSize = label.length > 1 ? r * 0.4 : r * 0.6;
    const text = this.add.text(0, 0, label, {
      fontFamily: 'sans-serif',
      fontSize: `${Math.round(fontSize)}px`,
      fontStyle: 'bold',
      color: C_HUD_TEXT,
    }).setOrigin(0.5);
    container.add(text);
    container.setSize(zone.width, zone.height);
    container.setInteractive({
      hitArea: new Phaser.Geom.Circle(r, r, r),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: false,
    });
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase === 'start') { this.beginGame(); return; }
      if (this.phase !== 'playing') return;
      onDown(pointer);
    });
    container.on('pointerup', onUp);
    container.on('pointerout', onUp);
    container.on('pointercancel', onUp);
    container.setDepth(201);
    return container;
  }

  private setUpTouchButtons(): void {
    const t = this.layout.touch;
    this.touchButtons.push(this.makeTouchButton(
      t.left, '\u25C0',
      (p) => this.pressMove(p, 'left'),
      (p) => this.releaseMove(p, 'left'),
    ));
    this.touchButtons.push(this.makeTouchButton(
      t.right, '\u25B6',
      (p) => this.pressMove(p, 'right'),
      (p) => this.releaseMove(p, 'right'),
    ));
    this.touchButtons.push(this.makeTouchButton(
      t.jump, '\u25B2',
      (p) => this.pressJump(p),
      (p) => this.releaseJump(p),
    ));
    this.touchButtons.push(this.makeTouchButton(
      t.context, 'USE',
      (p) => {
        this.contextPointers.add(p.id);
        this.contextHeld = true;
        this.contextPressed = true;
      },
      (p) => {
        if (this.contextPointers.delete(p.id)) {
          this.contextHeld = this.contextPointers.size > 0;
        }
      },
    ));
    this.touchButtons.push(this.makeTouchButton(
      t.action, 'KICK',
      (p) => {
        this.kickPointers.add(p.id);
        this.kickPressed = true;
      },
      (p) => {
        this.kickPointers.delete(p.id);
      },
    ));
  }

  private destroyTouchButtons(): void {
    for (const button of this.touchButtons) {
      this.tweens.killTweensOf(button);
      button.destroy();
    }
    this.touchButtons = [];
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private setUpKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null) return;
    keyboard.on('keydown-LEFT', (e: KeyboardEvent) => { e.preventDefault(); this.dispatchMove('left'); });
    keyboard.on('keydown-A', () => { this.dispatchMove('left'); });
    keyboard.on('keydown-RIGHT', (e: KeyboardEvent) => { e.preventDefault(); this.dispatchMove('right'); });
    keyboard.on('keydown-D', () => { this.dispatchMove('right'); });
    keyboard.on('keyup-LEFT', () => { this.dispatchEndMove('left'); });
    keyboard.on('keyup-A', () => { this.dispatchEndMove('left'); });
    keyboard.on('keyup-RIGHT', () => { this.dispatchEndMove('right'); });
    keyboard.on('keyup-D', () => { this.dispatchEndMove('right'); });
    keyboard.on('keydown-UP', (e: KeyboardEvent) => { e.preventDefault(); this.beginJumpKey(); });
    keyboard.on('keydown-W', () => { this.beginJumpKey(); });
    keyboard.on('keyup-UP', () => { this.endJumpKey(); });
    keyboard.on('keyup-W', () => { this.endJumpKey(); });
    keyboard.on('keydown-SPACE', (e: KeyboardEvent) => { e.preventDefault(); this.beginJumpKey(); });
    keyboard.on('keyup-SPACE', () => { this.endJumpKey(); });
    keyboard.on('keydown-ENTER', () => { this.dispatchStartAction(); });
    keyboard.on('keydown-E', () => {
      if (this.phase === 'start') { this.beginGame(); return; }
      if (this.phase !== 'playing') return;
      this.contextHeld = true;
      this.contextPressed = true;
    });
    keyboard.on('keyup-E', () => {
      if (this.contextPointers.size === 0) this.contextHeld = false;
    });
    keyboard.on('keydown-F', () => {
      if (this.phase === 'start') { this.beginGame(); return; }
      if (this.phase !== 'playing') return;
      this.kickPressed = true;
    });
    keyboard.on('keydown-G', () => this.toggleFullscreen());
    keyboard.on('keydown-ESC', () => { this.togglePause(); });
    keyboard.on('keydown-R', () => {
      if (this.phase === 'paused' || this.phase === 'won') this.restartGame();
    });
  }

  private dispatchStartAction(): void {
    if (this.phase === 'start') this.beginGame();
  }

  private dispatchMove(dir: MovementDirection): void {
    if (this.phase === 'start') { this.beginGame(); return; }
    if (this.phase !== 'playing') return;
    if (dir === 'left') this.keyboardMoveLeft = true;
    else this.keyboardMoveRight = true;
    this.applyMovementInput();
  }

  private dispatchEndMove(dir: MovementDirection): void {
    if (dir === 'left') this.keyboardMoveLeft = false;
    else this.keyboardMoveRight = false;
    this.applyMovementInput();
  }

  private beginJumpKey(): void {
    if (this.phase === 'start') { this.beginGame(); return; }
    if (this.phase !== 'playing') return;
    this.keyboardJumpHeld = true;
    this.jumpHeld = true;
    this.jumpBufferTime = this.time.now + JUMP_BUFFER;
  }

  private endJumpKey(): void {
    if (!this.keyboardJumpHeld) return;
    this.keyboardJumpHeld = false;
    this.jumpHeld = this.jumpPointers.size > 0;
    if (!this.jumpHeld) this.maybeCutJump();
  }

  private pressMove(pointer: Phaser.Input.Pointer, dir: MovementDirection): void {
    this.movementPointers.set(pointer.id, dir);
    this.applyMovementInput();
  }

  private releaseMove(pointer: Phaser.Input.Pointer, dir: MovementDirection): void {
    if (this.movementPointers.get(pointer.id) !== dir) return;
    this.movementPointers.delete(pointer.id);
    this.applyMovementInput();
  }

  private applyMovementInput(): void {
    const held: MovementDirection[] = [...this.movementPointers.values()];
    this.moveLeft = this.keyboardMoveLeft || held.includes('left');
    this.moveRight = this.keyboardMoveRight || held.includes('right');
  }

  private pressJump(pointer: Phaser.Input.Pointer): void {
    this.jumpPointers.add(pointer.id);
    this.jumpHeld = true;
    this.jumpBufferTime = this.time.now + JUMP_BUFFER;
  }

  private releaseJump(pointer: Phaser.Input.Pointer): void {
    if (!this.jumpPointers.delete(pointer.id)) return;
    this.jumpHeld = this.keyboardJumpHeld || this.jumpPointers.size > 0;
    if (!this.jumpHeld) this.maybeCutJump();
  }

  private releaseTrackedPointer(pointer: Phaser.Input.Pointer): void {
    this.releaseMove(pointer, 'left');
    this.releaseMove(pointer, 'right');
    this.releaseJump(pointer);
    if (this.contextPointers.delete(pointer.id)) {
      this.contextHeld = this.contextPointers.size > 0;
    }
    this.kickPointers.delete(pointer.id);
  }

  private setUpPointer(): void {
    this.input.on('pointerdown', () => {
      if (this.phase === 'start') this.beginGame();
    });
    const release = (pointer: Phaser.Input.Pointer) => {
      this.releaseTrackedPointer(pointer);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('pointerout', release);
    this.input.on('pointercancel', release);
  }

  private resetInput(): void {
    this.moveLeft = false;
    this.moveRight = false;
    this.keyboardMoveLeft = false;
    this.keyboardMoveRight = false;
    this.jumpHeld = false;
    this.keyboardJumpHeld = false;
    this.jumpBufferTime = 0;
    this.coyoteEnd = 0;
    this.contextHeld = false;
    this.contextPressed = false;
    this.kickPressed = false;
    this.movementPointers.clear();
    this.jumpPointers.clear();
    this.contextPointers.clear();
    this.kickPointers.clear();
    this.applyMovementInput();
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
  }

  private restartGame(): void {
    this.clearOverlay();
    if (this.completeTween) {
      this.completeTween.stop();
      this.completeTween = null;
    }
    if (this.spoonTween) {
      this.spoonTween.stop();
      this.spoonTween = null;
    }
    this.state = createHeistState();
    this.guardState = createGuard(KITCHEN);
    this.resetInput();
    const body = this.mouse.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    this.mouse.setPosition(this.room.mouseStart.x, this.room.mouseStart.y);
    this.mouse.setVelocity(0, 0);
    this.mouse.setTexture('mouse-idle');
    this.mouse.setVisible(true);
    this.mouse.setAlpha(1);
    this.mouse.setScale(1);
    this.mouse.setFlipX(false);
    this.spoonSprite.setPosition(this.room.spoonHomeX, 812);
    this.spoonSprite.setAngle(-8);
    this.cheeseSprite.setVisible(true);
    this.mugEars.setVisible(false);
    this.ventGlow.setVisible(false);
    this.phase = 'playing';
    this.physics.world.resume();
  }

  private togglePause(): void {
    if (this.phase === 'start') { this.beginGame(); return; }
    if (this.phase !== 'playing' && this.phase !== 'paused') return;
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.physics.world.pause();
      this.state = cancelSteal(this.state);
      this.resetInput();
      this.showPauseOverlay();
    } else {
      this.phase = 'playing';
      this.physics.world.resume();
      this.clearOverlay();
    }
  }

  private toggleFullscreen(): void {
    this.scale.toggleFullscreen({ navigationUI: 'hide' });
  }

  private handleFullscreenFailure(): void {
    this.toastScreen('Fullscreen not available');
  }

  private handleFullscreenChange(): void {
    this.applyLayout();
  }

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  private distTo(ax: number, ay: number, bx: number, by: number): number {
    return Math.hypot(ax - bx, ay - by);
  }

  private nearVent(): boolean {
    return this.distTo(this.mouse.x, this.mouse.y, this.room.ventX, this.room.ventY)
      <= this.room.interactRange + this.room.ventRadius;
  }

  private nearCheese(): boolean {
    return this.distTo(this.mouse.x, this.mouse.y, this.room.cheeseX, this.room.cheeseY)
      <= this.room.interactRange + this.room.cheeseRadius;
  }

  private nearMug(): boolean {
    return this.distTo(this.mouse.x, this.mouse.y, this.room.mugX, this.room.mugY)
      <= this.room.interactRange + this.room.mugRadius;
  }

  private nearSpoon(): boolean {
    if (this.state.spoonKicked) return false;
    return this.distTo(this.mouse.x, this.mouse.y, this.room.spoonHomeX, 812)
      <= this.room.interactRange + this.room.spoonRadius;
  }

  private tryContext(): void {
    if (this.state.mouseHidden) {
      this.state = toggleHide(this.state);
      this.playHide(false);
      return;
    }
    if (this.nearVent()) {
      if (this.state.hasCheese) {
        this.state = escape(this.state);
        this.triggerWin();
      } else {
        this.toast('Need the cheese!');
      }
      return;
    }
    if (this.nearCheese() && !this.state.hasCheese) {
      this.state = beginSteal(this.state);
      return;
    }
    if (this.nearMug()) {
      this.state = toggleHide(this.state);
      this.playHide(true);
      this.state = cancelSteal(this.state);
    }
  }

  private tryKick(): void {
    if (this.state.mouseHidden || this.state.spoonKicked) return;
    if (!this.nearSpoon()) return;
    this.state = kickSpoon(this.state, this.room);
    sendToInvestigate(this.guardState, this.state.spoonClatterX);
    this.spoonSprite.setAngle(0);
    this.spoonTween = this.tweens.add({
      targets: this.spoonSprite,
      x: this.state.spoonClatterX,
      angle: 360,
      duration: 520,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.spoonSprite.setAngle(0);
        this.playClatter();
      },
    });
    this.playKick();
    this.spawnStars(this.room.spoonHomeX, 800);
  }

  private returnSpoonToHome(): void {
    if (this.spoonTween) {
      this.spoonTween.stop();
      this.spoonTween = null;
    }
    this.spoonTween = this.tweens.add({
      targets: this.spoonSprite,
      x: this.room.spoonHomeX,
      angle: -8,
      duration: 420,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.spoonTween = null;
        this.state = returnSpoon(this.state);
        this.playClatter();
      },
    });
  }

  private stealComplete(): void {
    this.playSteal();
    this.playAlarm();
    this.cheeseSprite.setVisible(false);
    // the cheese pedestal rings a bell — the cat is alerted wherever it is
    this.guardState.state = 'alert';
    this.guardState.stateTime = 0;
    this.guardState.lastSeenX = this.mouse.x;
    this.spawnStars(this.room.cheeseX, this.room.cheeseY);
  }

  // ---------------------------------------------------------------------------
  // Guard events and caught/win
  // ---------------------------------------------------------------------------

  private handleGuardEvents(events: GuardEvents): void {
    if (events.sawPlayer) this.playAlarm();
    if (events.lostPlayer) this.playQuestion();
    if (events.investigationDone || events.investigationAbandoned) this.returnSpoonToHome();
    if (events.caughtPlayer) this.triggerCaught();
  }

  private triggerCaught(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'caught';
    this.state = markCaught(this.state);
    this.physics.world.pause();
    this.playCaught();
    this.resetInput();
    this.mouse.setTexture('mouse-caught');
    const line = CAUGHT_LINES[Math.floor(Math.random() * CAUGHT_LINES.length)]!;
    this.caughtLine = line;
    this.showCaughtOverlay(line);
    this.time.delayedCall(CAUGHT_RESET_MS, () => {
      if (this.phase === 'caught') this.recoverFromCaught();
    });
  }

  private recoverFromCaught(): void {
    this.phase = 'playing';
    this.caughtLine = '';
    this.state = recover(this.state);
    this.guardState = createGuard(KITCHEN);
    this.physics.world.resume();
    const body = this.mouse.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    this.mouse.setPosition(this.room.mouseStart.x, this.room.mouseStart.y);
    this.mouse.setVelocity(0, 0);
    this.mouse.setTexture('mouse-idle');
    this.mouse.setVisible(true);
    this.mouse.setFlipX(false);
    if (this.spoonTween) {
      this.spoonTween.stop();
      this.spoonTween = null;
    }
    this.spoonSprite.setPosition(this.room.spoonHomeX, 812);
    this.spoonSprite.setAngle(-8);
    this.cheeseSprite.setVisible(true);
    this.mugEars.setVisible(false);
    this.ventGlow.setVisible(false);
    this.clearOverlay();
  }

  private triggerWin(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'won';
    this.physics.world.pause();
    this.playWin();
    this.resetInput();
    this.showWinOverlay();
    if (!this.reducedMotion) {
      this.completeTween = this.tweens.add({
        targets: this.mouse,
        scale: 1.15,
        yoyo: true,
        repeat: -1,
        duration: 300,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    if (this.phase !== 'playing') return;

    // buffered presses
    if (this.kickPressed) {
      this.kickPressed = false;
      this.tryKick();
    }
    if (this.contextPressed) {
      this.contextPressed = false;
      this.tryContext();
    }

    // steal hold
    if (this.state.stealing) {
      if (this.contextHeld && this.nearCheese() && !this.state.mouseHidden) {
        this.state = updateSteal(this.state, delta);
        if (this.state.hasCheese) this.stealComplete();
      } else {
        this.state = cancelSteal(this.state);
      }
    } else if (
      this.contextHeld
      && this.nearCheese()
      && !this.state.mouseHidden
      && !this.state.hasCheese
    ) {
      this.state = beginSteal(this.state);
    }

    const body = this.mouse.body as Phaser.Physics.Arcade.Body;
    if (this.state.mouseHidden) {
      body.setVelocity(0, 0);
    } else {
      this.handleMovement();
      this.handleJump(delta);
    }

    const events = stepGuard(
      this.guardState,
      delta,
      { x: this.mouse.x, y: this.mouse.y - 8, hidden: this.state.mouseHidden },
      KITCHEN,
    );
    this.handleGuardEvents(events);

    this.updateGuardVisual();
    this.updateMouseVisual();
    this.drawCone();
    this.drawStealRing();
    this.updateBubbles();
    this.updateVentGlow();
    this.updateHudText();
  }

  private handleMovement(): void {
    const body = this.mouse.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down === true;
    const vx = resolveHorizontalVelocity(this.moveLeft, this.moveRight, onGround, body.velocity.x, RUN_SPEED);
    this.mouse.setVelocityX(vx);
  }

  private handleJump(_delta: number): void {
    const body = this.mouse.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down === true;
    if (onGround) this.coyoteEnd = this.time.now + COYOTE_TIME;
    const canJump = onGround || (this.time.now < this.coyoteEnd && body.velocity.y <= 0);
    const buffered = this.time.now < this.jumpBufferTime;
    if (canJump && (this.jumpHeld || buffered)) {
      body.setVelocityY(JUMP_VELOCITY);
      this.jumpHeld = false;
      this.jumpBufferTime = 0;
      this.coyoteEnd = 0;
      this.playJump();
    }
  }

  private maybeCutJump(): void {
    const body = this.mouse.body as Phaser.Physics.Arcade.Body;
    // releasing early caps the remaining ascent, giving a short hop
    if (body.velocity.y < 0 && body.velocity.y < JUMP_CUT_VELOCITY) {
      body.setVelocityY(JUMP_CUT_VELOCITY);
    }
  }

  // ---------------------------------------------------------------------------
  // Visual updates
  // ---------------------------------------------------------------------------

  private updateGuardVisual(): void {
    const g = this.guardState;
    this.guardSprite.setPosition(g.x, g.y);
    this.guardSprite.setFlipX(g.facing < 0);
    const state = g.state;
    let key: string;
    if (state === 'alert') key = 'cat-alert';
    else if (state === 'chase') key = 'cat-chase';
    else if (state === 'search' || state === 'search-look') key = 'cat-search';
    else if (state === 'caught') key = 'cat-grumpy';
    else if (state === 'patrol' || state === 'investigate') {
      key = Math.floor(this.time.now / CAT_FRAME_MS) % 2 === 0 ? 'cat-walk1' : 'cat-walk2';
    } else {
      key = 'cat-idle';
    }
    if (this.guardSprite.texture.key !== key) this.guardSprite.setTexture(key);
  }

  private updateMouseVisual(): void {
    if (this.state.mouseHidden) {
      this.mouse.setVisible(false);
      this.mugEars.setVisible(true);
      return;
    }
    this.mouse.setVisible(true);
    this.mugEars.setVisible(false);
    const body = this.mouse.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down === true;
    let key: string;
    if (this.state.hasCheese) key = 'mouse-carry';
    else if (!onGround) key = 'mouse-jump';
    else if (Math.abs(body.velocity.x) < 12) key = 'mouse-idle';
    else key = Math.floor(this.time.now / RUN_FRAME_MS) % 2 === 0 ? 'mouse-run1' : 'mouse-run2';
    if (this.mouse.texture.key !== key) this.mouse.setTexture(key);
    if (body.velocity.x > 8) this.mouse.setFlipX(false);
    else if (body.velocity.x < -8) this.mouse.setFlipX(true);
  }

  private drawCone(): void {
    const g = this.cone;
    g.clear();
    const guard = this.guardState;
    const eyeX = guard.x;
    const eyeY = guard.y - GUARD_EYE_OFFSET;
    const half = Phaser.Math.DegToRad(KITCHEN.guard.viewHalfAngleDeg);
    const range = KITCHEN.guard.viewRange;
    const alert = guard.state === 'alert' || guard.state === 'chase';
    const color = alert ? C_CONE_RED : C_CONE_AMBER;
    const alpha = alert ? 0.26 : 0.15;
    const base = guard.facing === 1 ? 0 : Math.PI;
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(eyeX, eyeY);
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const a = base - half + ((2 * half * i) / steps);
      g.lineTo(eyeX + Math.cos(a) * range, eyeY + Math.sin(a) * range);
    }
    g.closePath();
    g.fillPath();
    g.lineStyle(2, color, 0.45);
    g.strokePath();
  }

  private drawStealRing(): void {
    this.stealRing.clear();
    if (!this.state.stealing) return;
    const r = 26;
    this.stealRing.lineStyle(4, C_GOLD, 0.95);
    this.stealRing.beginPath();
    this.stealRing.arc(
      this.mouse.x,
      this.mouse.y,
      r,
      -Math.PI / 2,
      -Math.PI / 2 + Phaser.Math.DegToRad(360 * this.state.stealProgress),
    );
    this.stealRing.strokePath();
  }

  private updateBubbles(): void {
    const g = this.guardState;
    const top = g.y - 62;
    const alert = g.state === 'alert' || g.state === 'chase';
    const question = g.state === 'search' || g.state === 'search-look';
    this.alertBubble.setVisible(alert);
    this.alertBubble.setPosition(g.x + (g.facing === 1 ? 18 : -18), top);
    this.questionBubble.setVisible(question);
    this.questionBubble.setPosition(g.x + (g.facing === 1 ? 18 : -18), top);
  }

  private updateVentGlow(): void {
    if (!this.state.hasCheese) {
      this.ventGlow.setVisible(false);
      return;
    }
    this.ventGlow.setVisible(true);
    this.ventGlow.setAlpha(0.1 + 0.08 * Math.sin(this.time.now / 140));
  }

  private updateHudText(): void {
    if (this.state.hasCheese) {
      this.statusText.setText('\u{1F400} RUN! Vent on the left!');
    } else if (this.state.mouseHidden) {
      this.statusText.setText('\u{1F400} Hidden in the mug');
    } else {
      this.statusText.setText('\u{1F400} Sneak to the cheese!');
    }

    let hint = '';
    if (this.state.mouseHidden) {
      hint = 'Hidden. E — leave the mug';
    } else if (!this.state.hasCheese && !this.state.spoonKicked && this.nearSpoon()) {
      hint = 'F — kick the spoon!';
    } else if (this.nearMug()) {
      hint = 'E — hide in the mug';
    } else if (this.nearCheese() && !this.state.hasCheese) {
      hint = 'Hold E — steal the cheese';
    } else if (this.nearVent()) {
      hint = this.state.hasCheese ? 'E — escape!' : 'E — locked without cheese';
    }
    if (this.hintText.text !== hint) this.hintText.setText(hint);
  }

  // ---------------------------------------------------------------------------
  // Overlays
  // ---------------------------------------------------------------------------

  private destroyOverlayObjects(): void {
    for (const obj of this.overlayObjects) {
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
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const container = this.add.container(cx, cy).setScrollFactor(0).setDepth(300);
    this.overlayObjects.push(container);
    const bg = this.add.rectangle(0, 0, this.scale.width * 3, this.scale.height * 3, 0x1a1830, 0.82)
      .setScrollFactor(0);
    container.add(bg);
    const titleSize = Math.min(58, Math.max(26, Math.round(this.scale.width / 15)));
    const title = this.add.text(0, -150, 'Cheese Heist', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${titleSize}px`,
      fontStyle: 'bold',
      color: '#ffd166',
      stroke: '#2a1030',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(title);
    const subtitleSize = Math.min(22, Math.max(14, Math.round(this.scale.width / 38)));
    const subtitle = this.add.text(0, -84, 'Sneak past the cat. Steal the cheese. Escape through the vent!', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${subtitleSize}px`,
      color: '#f5ecd8',
      wordWrap: { width: Math.max(280, this.scale.width - 60) },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(subtitle);
    const controlsSize = Math.min(19, Math.max(13, Math.round(this.scale.width / 44)));
    const controls = [
      'Move  A / D or Arrows      Jump  Space',
      'E  hide in mug · steal · escape vent',
      'F  kick the spoon     G  fullscreen',
      'Esc  pause',
    ].join('\n');
    const controlsText = this.add.text(0, 30, controls, {
      fontFamily: 'sans-serif',
      fontSize: `${controlsSize}px`,
      color: '#c8c0d8',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(controlsText);
    const startHint = this.add.text(0, 130, 'Tap or press Space to begin', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ffe9a8',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(startHint);
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: startHint,
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
    const bg = this.add.rectangle(0, 0, this.scale.width * 3, this.scale.height * 3, 0x1a1830, 0.8).setInteractive();
    bg.setScrollFactor(0);
    container.add(bg);
    const title = this.add.text(0, -120, 'Paused', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#ffd166',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(title);
    const buttonSize = Math.min(26, Math.max(18, Math.round(this.scale.width / 32)));
    const buttons = [
      { label: 'Resume', action: () => this.togglePause() },
      { label: 'Restart', action: () => { this.clearOverlay(); this.restartGame(); } },
      { label: this.fullscreenLabel(), action: () => this.toggleFullscreen() },
    ];
    buttons.forEach((b, i) => {
      const btn = this.add.text(0, -50 + i * 58, b.label, {
        fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
        fontSize: `${buttonSize}px`,
        color: '#fff',
        backgroundColor: 'rgba(52,44,74,0.95)',
        padding: { x: 22, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
      btn.on('pointerdown', () => b.action());
      container.add(btn);
    });
  }

  private showCaughtOverlay(line: string): void {
    const container = this.add.container(this.scale.width / 2, this.scale.height / 2)
      .setScrollFactor(0).setDepth(300);
    this.overlayObjects.push(container);
    const bg = this.add.rectangle(0, 0, this.scale.width * 3, this.scale.height * 3, 0x301a2a, 0.62)
      .setScrollFactor(0);
    container.add(bg);
    const titleSize = Math.min(30, Math.max(18, Math.round(this.scale.width / 34)));
    const title = this.add.text(0, -30, line, {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${titleSize}px`,
      fontStyle: 'bold',
      color: '#ffd9a8',
      stroke: '#2a1030',
      strokeThickness: 4,
      wordWrap: { width: Math.max(280, this.scale.width - 80) },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(title);
    const sub = this.add.text(0, 36, 'Nothing lost — try again!', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#f5ecd8',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(sub);
  }

  private showWinOverlay(): void {
    const container = this.add.container(this.scale.width / 2, this.scale.height / 2)
      .setScrollFactor(0).setDepth(300);
    this.overlayObjects.push(container);
    const bg = this.add.rectangle(0, 0, this.scale.width * 3, this.scale.height * 3, 0x1a1830, 0.8).setInteractive();
    bg.setScrollFactor(0);
    container.add(bg);
    const titleSize = Math.min(44, Math.max(24, Math.round(this.scale.width / 16)));
    const title = this.add.text(0, -90, 'CHEESE HEIST COMPLETE!', {
      fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif',
      fontSize: `${titleSize}px`,
      fontStyle: 'bold',
      color: '#ffd166',
      stroke: '#2a1030',
      strokeThickness: 5,
      wordWrap: { width: Math.max(280, this.scale.width - 40) },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(title);
    const sub = this.add.text(0, -8, '\u{1F400} \u{1F9C0} The cat never noticed a thing...', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#f5ecd8',
    }).setOrigin(0.5).setScrollFactor(0);
    container.add(sub);
    const replay = this.add.text(0, 70, 'Play Again', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '24px',
      color: '#fff',
      backgroundColor: 'rgba(52,44,74,0.95)',
      padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    replay.on('pointerdown', () => { this.clearOverlay(); this.restartGame(); });
    container.add(replay);
  }

  private spawnStars(x: number, y: number): void {
    if (this.reducedMotion) return;
    for (let i = 0; i < 8; i++) {
      const star = this.add.circle(x, y, 3, C_GOLD, 0.95).setDepth(120);
      this.tweens.add({
        targets: star,
        x: x + (Math.random() - 0.5) * 56,
        y: y - 14 - Math.random() * 40,
        alpha: 0,
        scale: 1.6,
        duration: 620,
        onComplete: () => star.destroy(),
      });
    }
  }

  private toast(message: string): void {
    const t = this.add.text(this.mouse.x, this.mouse.y - 48, message, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fff',
      backgroundColor: 'rgba(30,20,40,0.85)',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({
      targets: t,
      y: t.y - 26,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  private toastScreen(message: string): void {
    const t = this.add.text(this.scale.width / 2, 90, message, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    this.time.delayedCall(1600, () => t.destroy());
  }

  private fullscreenLabel(): string {
    return this.scale.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
  }

  // ---------------------------------------------------------------------------
  // Audio (procedural WebAudio)
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

  private playTone(frequency: number, duration: number, delay = 0, type: OscillatorType = 'sine', level = 0.05): void {
    const audio = this.getAudio();
    if (audio === undefined) return;
    const play = (): void => {
      const start = audio.currentTime + delay / 1000;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = frequency;
      osc.type = type;
      gain.gain.setValueAtTime(level, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration / 1000);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration / 1000);
    };
    if (audio.state === 'suspended') void audio.resume().then(play).catch(() => undefined);
    else play();
  }

  private playSweep(startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', level = 0.05): void {
    const audio = this.getAudio();
    if (audio === undefined) return;
    const play = (): void => {
      const start = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration / 1000);
      gain.gain.setValueAtTime(level, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration / 1000);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration / 1000);
    };
    if (audio.state === 'suspended') void audio.resume().then(play).catch(() => undefined);
    else play();
  }

  private playNoise(duration: number, freqStart: number, freqEnd: number, level = 0.06): void {
    const audio = this.getAudio();
    if (audio === undefined) return;
    const play = (): void => {
      const start = audio.currentTime;
      const bufferLen = Math.floor(audio.sampleRate * duration / 1000);
      const buffer = audio.createBuffer(1, bufferLen, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferLen; i++) data[i] = Math.random() * 2 - 1;
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const filter = audio.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freqStart, start);
      filter.frequency.linearRampToValueAtTime(freqEnd, start + duration / 1000);
      const gain = audio.createGain();
      gain.gain.setValueAtTime(level, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration / 1000);
      source.connect(filter).connect(gain).connect(audio.destination);
      source.start(start);
      source.stop(start + duration / 1000);
    };
    if (audio.state === 'suspended') void audio.resume().then(play).catch(() => undefined);
    else play();
  }

  private playJump(): void {
    this.playSweep(320, 640, 90);
  }

  private playKick(): void {
    this.playNoise(160, 1100, 300, 0.07);
    this.playTone(240, 90, 0, 'square', 0.03);
  }

  private playClatter(): void {
    this.playNoise(120, 2500, 700, 0.05);
  }

  private playHide(entering: boolean): void {
    if (entering) this.playSweep(420, 240, 140);
    else this.playSweep(240, 420, 120);
  }

  private playSteal(): void {
    this.playTone(660, 90);
    this.playTone(880, 90, 80);
    this.playTone(1100, 120, 160);
  }

  private playAlarm(): void {
    this.playTone(740, 120, 0, 'square', 0.045);
    this.playTone(740, 120, 140, 'square', 0.045);
  }

  private playQuestion(): void {
    this.playSweep(520, 360, 160, 'sine', 0.04);
  }

  private playCaught(): void {
    this.playSweep(480, 130, 380, 'sawtooth', 0.045);
    this.playTone(300, 160, 120, 'sawtooth', 0.035);
  }

  private playWin(): void {
    const notes = [392, 523, 659, 784, 1047];
    notes.forEach((n, i) => this.playTone(n, 130, i * 140, 'triangle', 0.06));
  }

  // ---------------------------------------------------------------------------
  // Resize and shutdown
  // ---------------------------------------------------------------------------

  private handleResize(): void {
    this.applyLayout();
  }

  private applyLayout(): void {
    this.layout = createLayout(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(this.layout.zoom);
    this.statusText.setPosition(this.layout.hud.status.x, this.layout.hud.status.y);
    this.statusText.setStyle({
      fontSize: `${Math.max(15, Math.round(20 * this.layout.zoom))}px`,
    });
    this.hintText.setPosition(this.layout.hud.hint.x, this.layout.hud.hint.y);
    this.hintText.setStyle({
      fontSize: `${Math.max(14, Math.round(17 * this.layout.zoom))}px`,
    });
    const r = this.layout.hud.pauseButton.radius;
    this.pauseButton.setPosition(this.layout.hud.pauseButton.x, this.layout.hud.pauseButton.y);
    this.pauseBg.clear();
    this.pauseBg.fillStyle(C_HUD_BG, 0.78);
    this.pauseBg.fillCircle(0, 0, r);
    this.pauseBg.lineStyle(3, C_BUTTON_BORDER, 1);
    this.pauseBg.strokeCircle(0, 0, r);
    this.pauseLabel.setFontSize(`${Math.round(r * 1.1)}px`);
    this.pauseButton.setSize(r * 2, r * 2);
    this.pauseButton.setInteractive({
      hitArea: new Phaser.Geom.Circle(r, r, r),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true,
    });
    this.destroyTouchButtons();
    this.setUpTouchButtons();
    this.refreshOverlay();
  }

  private refreshOverlay(): void {
    if (this.overlayObjects.length === 0) return;
    this.destroyOverlayObjects();
    switch (this.phase) {
      case 'start': this.showStartScreen(); break;
      case 'paused': this.showPauseOverlay(); break;
      case 'won': this.showWinOverlay(); break;
      case 'caught': this.showCaughtOverlay(this.caughtLine); break;
      case 'playing': break;
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
