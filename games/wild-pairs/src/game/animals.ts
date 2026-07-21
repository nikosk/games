import Phaser from 'phaser';
import type { Animal } from './rules';

const INK = 0x35483d;
const CREAM = 0xf3e6c8;

function eye(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  graphics.fillStyle(INK, 0.95);
  graphics.fillCircle(x, y, size);
  graphics.fillStyle(0xffffff, 0.8);
  graphics.fillCircle(x - size * 0.25, y - size * 0.25, size * 0.25);
}

function rabbit(graphics: Phaser.GameObjects.Graphics, size: number): void {
  graphics.fillStyle(0xb8a894, 0.18);
  graphics.fillEllipse(-5, 4, size * 1.55, size * 1.2);
  graphics.fillStyle(0xc9b9a5, 0.9);
  graphics.fillEllipse(0, 5, size * 1.35, size * 1.05);
  graphics.fillEllipse(-size * 0.36, -size * 0.56, size * 0.34, size * 1.15);
  graphics.fillEllipse(size * 0.36, -size * 0.56, size * 0.34, size * 1.15);
  graphics.fillStyle(0xd99c9d, 0.55);
  graphics.fillEllipse(-size * 0.36, -size * 0.56, size * 0.13, size * 0.78);
  graphics.fillEllipse(size * 0.36, -size * 0.56, size * 0.13, size * 0.78);
  graphics.fillStyle(CREAM, 0.72);
  graphics.fillEllipse(0, size * 0.25, size * 0.62, size * 0.42);
  eye(graphics, -size * 0.2, 0, size * 0.055);
  eye(graphics, size * 0.2, 0, size * 0.055);
  graphics.fillStyle(0x9a5960, 0.9);
  graphics.fillCircle(0, size * 0.18, size * 0.065);
}

function fox(graphics: Phaser.GameObjects.Graphics, size: number): void {
  graphics.fillStyle(0xb86f55, 0.16);
  graphics.fillCircle(-5, 3, size * 0.78);
  graphics.fillStyle(0xc9784f, 0.92);
  graphics.fillTriangle(-size * 0.78, size * 0.35, -size * 0.55, -size * 0.65, 0, -size * 0.2);
  graphics.fillTriangle(size * 0.78, size * 0.35, size * 0.55, -size * 0.65, 0, -size * 0.2);
  graphics.fillCircle(0, size * 0.08, size * 0.66);
  graphics.fillStyle(0x5a4b42, 0.78);
  graphics.fillTriangle(-size * 0.63, -size * 0.18, -size * 0.55, -size * 0.61, -size * 0.2, -size * 0.3);
  graphics.fillTriangle(size * 0.63, -size * 0.18, size * 0.55, -size * 0.61, size * 0.2, -size * 0.3);
  graphics.fillStyle(CREAM, 0.9);
  graphics.fillTriangle(-size * 0.5, size * 0.18, 0, size * 0.6, size * 0.5, size * 0.18);
  eye(graphics, -size * 0.2, 0, size * 0.055);
  eye(graphics, size * 0.2, 0, size * 0.055);
  graphics.fillStyle(INK, 0.95);
  graphics.fillCircle(0, size * 0.31, size * 0.075);
}

function frog(graphics: Phaser.GameObjects.Graphics, size: number): void {
  graphics.fillStyle(0x799b72, 0.18);
  graphics.fillEllipse(-5, 3, size * 1.58, size * 1.05);
  graphics.fillStyle(0x6e9d68, 0.92);
  graphics.fillEllipse(0, size * 0.12, size * 1.45, size * 0.96);
  graphics.fillCircle(-size * 0.38, -size * 0.34, size * 0.3);
  graphics.fillCircle(size * 0.38, -size * 0.34, size * 0.3);
  graphics.fillStyle(CREAM, 0.95);
  graphics.fillCircle(-size * 0.38, -size * 0.34, size * 0.16);
  graphics.fillCircle(size * 0.38, -size * 0.34, size * 0.16);
  eye(graphics, -size * 0.38, -size * 0.34, size * 0.065);
  eye(graphics, size * 0.38, -size * 0.34, size * 0.065);
  graphics.lineStyle(Math.max(2, size * 0.035), INK, 0.8);
  graphics.beginPath();
  graphics.arc(0, size * 0.08, size * 0.38, 0.2, Math.PI - 0.2);
  graphics.strokePath();
}

function hedgehog(graphics: Phaser.GameObjects.Graphics, size: number): void {
  graphics.fillStyle(0x745f4d, 0.18);
  graphics.fillEllipse(-5, 5, size * 1.65, size * 1.05);
  graphics.fillStyle(0x7a654f, 0.9);
  for (let spike = -4; spike <= 4; spike += 1) {
    const x = spike * size * 0.17;
    graphics.fillTriangle(
      x - size * 0.16,
      size * 0.18,
      x,
      -size * (0.52 + Math.abs(spike) * 0.025),
      x + size * 0.16,
      size * 0.18,
    );
  }
  graphics.fillEllipse(-size * 0.06, size * 0.16, size * 1.42, size * 0.82);
  graphics.fillStyle(0xc7ad85, 0.96);
  graphics.fillEllipse(size * 0.24, size * 0.18, size * 0.9, size * 0.62);
  graphics.fillTriangle(size * 0.42, -size * 0.03, size * 0.82, size * 0.18, size * 0.42, size * 0.36);
  eye(graphics, size * 0.25, size * 0.08, size * 0.055);
  graphics.fillStyle(INK, 0.95);
  graphics.fillCircle(size * 0.77, size * 0.18, size * 0.07);
}

export function drawPortrait(
  graphics: Phaser.GameObjects.Graphics,
  animal: Animal,
  x: number,
  y: number,
  size: number,
): void {
  const portrait = graphics.save();
  portrait.translateCanvas(x, y);

  if (animal === 'rabbit') rabbit(graphics, size);
  else if (animal === 'fox') fox(graphics, size);
  else if (animal === 'frog') frog(graphics, size);
  else hedgehog(graphics, size);

  graphics.restore();
}
