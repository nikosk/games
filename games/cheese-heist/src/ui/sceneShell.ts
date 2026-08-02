import Phaser from 'phaser';

export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

const INK = 0x35253f;
const CREAM = 0xffedce;
const GOLD = 0xf7c85f;
const TEAL = 0x65c6a5;

interface SceneShellOptions {
  readonly homeScene?: string;
}

/** Keep the illustrated 16:9 room full-bleed while the canvas fills any tablet viewport. */
export function installSceneShell(scene: Phaser.Scene, options: SceneShellOptions = {}): void {
  const controls = scene.add.container(0, 0).setDepth(40);
  const fullscreen = createIconButton(scene, 'fullscreen', () => {
    scene.scale.toggleFullscreen({ navigationUI: 'hide' });
  });
  controls.add(fullscreen);

  const home = options.homeScene === undefined
    ? undefined
    : createIconButton(scene, 'home', () => scene.scene.start(options.homeScene!));
  if (home !== undefined) controls.add(home);

  const layout = (): void => {
    const width = Math.max(1, scene.scale.width);
    const height = Math.max(1, scene.scale.height);
    const containZoom = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const coverZoom = Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    // Fill most of the screen, but never crop more than a narrow decorative edge.
    const zoom = Math.min(coverZoom, containZoom * 1.2);
    const visibleWidth = width / zoom;
    const visibleHeight = height / zoom;
    const right = DESIGN_WIDTH / 2 + visibleWidth / 2;
    const top = DESIGN_HEIGHT / 2 - visibleHeight / 2;

    scene.cameras.main.setZoom(zoom);
    scene.cameras.main.centerOn(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    fullscreen.setPosition(right - 58, top + 58);
    home?.setPosition(right - 158, top + 58);
  };

  const toggleFullscreen = (): void => {
    scene.tweens.add({ targets: fullscreen, scale: 0.88, duration: 80, yoyo: true });
    scene.scale.toggleFullscreen({ navigationUI: 'hide' });
  };
  const fullscreenFailed = (): void => {
    scene.tweens.add({ targets: fullscreen, angle: { from: -7, to: 7 }, duration: 70, yoyo: true, repeat: 2 });
  };

  scene.scale.on(Phaser.Scale.Events.RESIZE, layout);
  scene.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, layout);
  scene.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, layout);
  scene.scale.on(Phaser.Scale.Events.FULLSCREEN_FAILED, fullscreenFailed);
  scene.scale.on(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, fullscreenFailed);
  scene.input.keyboard?.on('keydown-F', toggleFullscreen);
  layout();

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, layout);
    scene.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, layout);
    scene.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, layout);
    scene.scale.off(Phaser.Scale.Events.FULLSCREEN_FAILED, fullscreenFailed);
    scene.scale.off(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, fullscreenFailed);
    scene.input.keyboard?.off('keydown-F', toggleFullscreen);
  });
}

function createIconButton(
  scene: Phaser.Scene,
  icon: 'home' | 'fullscreen',
  action: () => void,
): Phaser.GameObjects.Container {
  const button = scene.add.container(0, 0).setSize(92, 92).setInteractive({ useHandCursor: true });
  const g = scene.add.graphics();
  g.fillStyle(CREAM, 0.96);
  g.fillCircle(0, 0, 42);
  g.lineStyle(6, INK, 1);
  g.strokeCircle(0, 0, 42);

  if (icon === 'home') {
    g.fillStyle(TEAL, 1);
    g.fillTriangle(-25, -5, 0, -29, 25, -5);
    g.fillRoundedRect(-19, -6, 38, 30, 5);
    g.fillStyle(CREAM, 1);
    g.fillRoundedRect(-6, 6, 12, 18, 3);
  } else {
    g.lineStyle(7, GOLD, 1);
    g.lineBetween(-23, -8, -23, -23);
    g.lineBetween(-23, -23, -8, -23);
    g.lineBetween(23, -8, 23, -23);
    g.lineBetween(23, -23, 8, -23);
    g.lineBetween(-23, 8, -23, 23);
    g.lineBetween(-23, 23, -8, 23);
    g.lineBetween(23, 8, 23, 23);
    g.lineBetween(23, 23, 8, 23);
  }

  button.add(g);
  button.on('pointerdown', action);
  return button;
}
