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

type ExtraAnimal = Exclude<Animal, 'rabbit' | 'hedgehog' | 'fox' | 'frog'>;

const EXTRA_COLORS: Record<ExtraAnimal, number> = {
  badger: 0x5f625d,
  deer: 0xb88758,
  owl: 0x806d91,
  squirrel: 0xb56f43,
  otter: 0x6c7864,
  bear: 0x765541,
  wolf: 0x78818b,
  raccoon: 0x626875,
  beaver: 0x8a654d,
  lynx: 0xb58a70,
  boar: 0x776456,
  hare: 0xa89688,
  marten: 0x8e664f,
  stoat: 0xd7cbb7,
};

function roundEars(graphics: Phaser.GameObjects.Graphics, size: number, color: number): void {
  graphics.fillStyle(color, 0.96);
  graphics.fillCircle(-size * 0.43, -size * 0.38, size * 0.22);
  graphics.fillCircle(size * 0.43, -size * 0.38, size * 0.22);
}

function pointedEars(graphics: Phaser.GameObjects.Graphics, size: number, color: number): void {
  graphics.fillStyle(color, 0.96);
  graphics.fillTriangle(-size * 0.55, -size * 0.18, -size * 0.4, -size * 0.78, -size * 0.08, -size * 0.4);
  graphics.fillTriangle(size * 0.55, -size * 0.18, size * 0.4, -size * 0.78, size * 0.08, -size * 0.4);
}

function face(graphics: Phaser.GameObjects.Graphics, size: number, color: number, width = 1.28): void {
  graphics.fillStyle(color, 0.94);
  graphics.fillEllipse(0, size * 0.08, size * width, size * 1.14);
}

function muzzle(graphics: Phaser.GameObjects.Graphics, size: number, color = CREAM): void {
  graphics.fillStyle(color, 0.9);
  graphics.fillEllipse(0, size * 0.27, size * 0.62, size * 0.4);
  graphics.fillStyle(INK, 0.92);
  graphics.fillCircle(0, size * 0.18, size * 0.065);
}

function pairOfEyes(graphics: Phaser.GameObjects.Graphics, size: number): void {
  eye(graphics, -size * 0.2, -size * 0.07, size * 0.055);
  eye(graphics, size * 0.2, -size * 0.07, size * 0.055);
}

function extraPortrait(graphics: Phaser.GameObjects.Graphics, animal: ExtraAnimal, size: number): void {
  const color = EXTRA_COLORS[animal];

  if (animal === 'owl') {
    pointedEars(graphics, size, color);
    face(graphics, size, color, 1.35);
    graphics.fillStyle(CREAM, 0.96);
    graphics.fillCircle(-size * 0.28, -size * 0.08, size * 0.27);
    graphics.fillCircle(size * 0.28, -size * 0.08, size * 0.27);
    eye(graphics, -size * 0.28, -size * 0.08, size * 0.065);
    eye(graphics, size * 0.28, -size * 0.08, size * 0.065);
    graphics.fillStyle(0xe8c875, 0.95);
    graphics.fillTriangle(-size * 0.1, size * 0.13, size * 0.1, size * 0.13, 0, size * 0.32);
    return;
  }

  if (animal === 'deer') {
    pointedEars(graphics, size, color);
    graphics.lineStyle(Math.max(2, size * 0.045), 0x765541, 0.9);
    for (const side of [-1, 1]) {
      graphics.lineBetween(side * size * 0.26, -size * 0.38, side * size * 0.4, -size * 0.9);
      graphics.lineBetween(side * size * 0.34, -size * 0.67, side * size * 0.58, -size * 0.76);
    }
    face(graphics, size, color, 1.08);
    pairOfEyes(graphics, size);
    muzzle(graphics, size, 0xe5c49b);
    return;
  }

  if (animal === 'hare') {
    graphics.fillStyle(color, 0.96);
    graphics.fillEllipse(-size * 0.27, -size * 0.63, size * 0.28, size * 1.15);
    graphics.fillEllipse(size * 0.27, -size * 0.63, size * 0.28, size * 1.15);
    graphics.fillStyle(0xd8a0a0, 0.55);
    graphics.fillEllipse(-size * 0.27, -size * 0.63, size * 0.1, size * 0.78);
    graphics.fillEllipse(size * 0.27, -size * 0.63, size * 0.1, size * 0.78);
    face(graphics, size, color, 1.12);
    pairOfEyes(graphics, size);
    muzzle(graphics, size);
    return;
  }

  if (animal === 'squirrel') {
    graphics.fillStyle(color, 0.35);
    graphics.fillEllipse(size * 0.5, size * 0.06, size * 0.75, size * 1.35);
    roundEars(graphics, size, color);
    face(graphics, size, color, 1.12);
    graphics.fillStyle(CREAM, 0.78);
    graphics.fillEllipse(0, size * 0.31, size * 0.5, size * 0.34);
    pairOfEyes(graphics, size);
    graphics.fillStyle(INK, 0.92);
    graphics.fillCircle(0, size * 0.2, size * 0.06);
    return;
  }

  if (animal === 'badger') {
    roundEars(graphics, size, 0x3f4642);
    face(graphics, size, color, 1.32);
    graphics.fillStyle(CREAM, 0.9);
    graphics.fillEllipse(0, -size * 0.06, size * 0.34, size * 1.02);
    graphics.fillStyle(0x303934, 0.9);
    graphics.fillEllipse(-size * 0.25, -size * 0.05, size * 0.28, size * 0.46);
    graphics.fillEllipse(size * 0.25, -size * 0.05, size * 0.28, size * 0.46);
    pairOfEyes(graphics, size);
    muzzle(graphics, size);
    return;
  }

  if (animal === 'raccoon') {
    pointedEars(graphics, size, color);
    face(graphics, size, color, 1.3);
    graphics.fillStyle(0x343c40, 0.82);
    graphics.fillEllipse(0, -size * 0.05, size * 1.0, size * 0.4);
    pairOfEyes(graphics, size);
    muzzle(graphics, size);
    return;
  }

  if (animal === 'beaver') {
    roundEars(graphics, size, color);
    face(graphics, size, color, 1.32);
    pairOfEyes(graphics, size);
    muzzle(graphics, size, 0xcda77d);
    graphics.fillStyle(CREAM, 1);
    graphics.fillRect(-size * 0.14, size * 0.34, size * 0.12, size * 0.22);
    graphics.fillRect(size * 0.02, size * 0.34, size * 0.12, size * 0.22);
    return;
  }

  if (animal === 'boar') {
    roundEars(graphics, size, color);
    face(graphics, size, color, 1.5);
    pairOfEyes(graphics, size);
    graphics.fillStyle(0xb89278, 0.96);
    graphics.fillEllipse(0, size * 0.27, size * 0.72, size * 0.42);
    graphics.fillStyle(INK, 0.72);
    graphics.fillCircle(-size * 0.15, size * 0.27, size * 0.045);
    graphics.fillCircle(size * 0.15, size * 0.27, size * 0.045);
    graphics.fillStyle(CREAM, 0.96);
    graphics.fillTriangle(-size * 0.36, size * 0.25, -size * 0.55, size * 0.47, -size * 0.28, size * 0.38);
    graphics.fillTriangle(size * 0.36, size * 0.25, size * 0.55, size * 0.47, size * 0.28, size * 0.38);
    return;
  }

  if (animal === 'lynx') {
    pointedEars(graphics, size, color);
    graphics.lineStyle(Math.max(2, size * 0.04), INK, 0.85);
    graphics.lineBetween(-size * 0.4, -size * 0.72, -size * 0.45, -size * 0.96);
    graphics.lineBetween(size * 0.4, -size * 0.72, size * 0.45, -size * 0.96);
    face(graphics, size, color, 1.25);
    pairOfEyes(graphics, size);
    muzzle(graphics, size);
    graphics.fillStyle(INK, 0.45);
    graphics.fillCircle(-size * 0.42, size * 0.03, size * 0.035);
    graphics.fillCircle(size * 0.38, -size * 0.2, size * 0.035);
    return;
  }

  if (animal === 'wolf') {
    pointedEars(graphics, size, color);
    face(graphics, size, color, 1.23);
    graphics.fillStyle(0xc7ced1, 0.78);
    graphics.fillTriangle(-size * 0.48, size * 0.08, 0, size * 0.62, size * 0.48, size * 0.08);
    pairOfEyes(graphics, size);
    graphics.fillStyle(INK, 0.95);
    graphics.fillCircle(0, size * 0.29, size * 0.075);
    return;
  }

  if (animal === 'marten') {
    roundEars(graphics, size, color);
    face(graphics, size, color, 1.04);
    graphics.fillStyle(0xf0d7a6, 0.82);
    graphics.fillEllipse(0, size * 0.48, size * 0.52, size * 0.48);
    pairOfEyes(graphics, size);
    muzzle(graphics, size);
    return;
  }

  if (animal === 'stoat') {
    roundEars(graphics, size, color);
    graphics.fillStyle(0x4b463f, 0.9);
    graphics.fillCircle(-size * 0.43, -size * 0.38, size * 0.09);
    graphics.fillCircle(size * 0.43, -size * 0.38, size * 0.09);
    face(graphics, size, color, 0.98);
    pairOfEyes(graphics, size);
    muzzle(graphics, size, 0xffffff);
    return;
  }

  roundEars(graphics, size, color);
  face(graphics, size, color, animal === 'bear' ? 1.42 : 1.2);
  pairOfEyes(graphics, size);
  muzzle(graphics, size, animal === 'otter' ? 0xc7b08b : CREAM);

  if (animal === 'otter') {
    graphics.lineStyle(Math.max(1, size * 0.025), INK, 0.62);
    for (const offset of [-0.08, 0.08]) {
      graphics.lineBetween(-size * 0.08, size * (0.3 + offset), -size * 0.62, size * (0.2 + offset));
      graphics.lineBetween(size * 0.08, size * (0.3 + offset), size * 0.62, size * (0.2 + offset));
    }
  }
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
  else if (animal === 'hedgehog') hedgehog(graphics, size);
  else extraPortrait(graphics, animal, size);

  graphics.restore();
}
