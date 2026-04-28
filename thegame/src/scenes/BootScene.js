import Phaser from 'phaser';
import crittersData from '../data/critters.json';
import enemiesData from '../data/enemies.json';
import bashImg from '../assets/bash.png';
import hopImg from '../assets/hop.png';
import zapImg from '../assets/zap.png';
import chargerImg from '../assets/charger.png';
import spitterImg from '../assets/spitter.png';
import grabberImg from '../assets/grabber.png';
import boomerImg from '../assets/boomer.png';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('critter_bash', bashImg);
    this.load.image('critter_hop', hopImg);
    this.load.image('critter_zap', zapImg);
    this.load.image('enemy_charger', chargerImg);
    this.load.image('enemy_spitter', spitterImg);
    this.load.image('enemy_grabber', grabberImg);
    this.load.image('enemy_boomer', boomerImg);
  }

  create() {
    this.generateCritterTextures();
    this.generateEnemyTextures();
    this.generateUITextures();
    this.scene.start('MenuScene');
  }

  hexToInt(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  // ---- Helpers ----

  drawDropShadow(g, cx, cy, r) {
    g.fillStyle(0x000000, 0.12);
    g.fillCircle(cx + 1, cy + 2, r);
  }

  drawBodyHighlight(g, cx, cy, r) {
    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(cx - r * 0.15, cy - r * 0.35, r * 0.45);
  }

  drawRoundEyes(g, cx, cy, eyeY, spacing, eyeR, pupilR, highlightR) {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - spacing, eyeY, eyeR);
    g.fillCircle(cx + spacing, eyeY, eyeR);

    g.fillStyle(0x2a1a0a, 1);
    g.fillCircle(cx - spacing - 1, eyeY + 1, pupilR);
    g.fillCircle(cx + spacing - 1, eyeY + 1, pupilR);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - spacing - 2, eyeY - 3, highlightR);
    g.fillCircle(cx + spacing - 2, eyeY - 3, highlightR);
  }

  drawRosyCheeks(g, cx, cy, cheekY, spacing, r) {
    g.fillStyle(0xff9999, 0.3);
    g.fillCircle(cx - spacing, cheekY, r);
    g.fillCircle(cx + spacing, cheekY, r);
  }

  drawSmile(g, cx, mouthY, width, depth, lineWidth, color) {
    g.lineStyle(lineWidth, color, 0.9);
    g.beginPath();
    g.arc(cx, mouthY, width, 0.15, Math.PI - 0.15, false);
    g.strokePath();
  }

  drawFrown(g, cx, mouthY, width, depth, lineWidth, color) {
    g.lineStyle(lineWidth, color, 0.9);
    g.beginPath();
    g.arc(cx, mouthY + depth, width, Math.PI + 0.2, -0.2, false);
    g.strokePath();
  }

  drawAngryBrows(g, cx, browY, spacing, color) {
    g.lineStyle(3.5, color, 0.9);
    g.beginPath();
    g.moveTo(cx - spacing - 7, browY + 2);
    g.lineTo(cx - spacing + 7, browY - 2);
    g.strokePath();
    g.beginPath();
    g.moveTo(cx + spacing - 7, browY - 2);
    g.lineTo(cx + spacing + 7, browY + 2);
    g.strokePath();
  }

  // ---- Critter Drawers ----

  drawBash(g, cx, cy, color) {
    const r = 33;
    this.drawDropShadow(g, cx, cy, r);
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, r);
    this.drawBodyHighlight(g, cx, cy, r);

    // Ears
    g.fillStyle(color, 1);
    g.fillTriangle(cx - 18, cy - 25, cx - 10, cy - 17, cx - 3, cy - 27);
    g.fillTriangle(cx + 3, cy - 27, cx + 10, cy - 17, cx + 18, cy - 25);
    g.fillStyle(0xffffff, 0.3);
    g.fillTriangle(cx - 15, cy - 23, cx - 10, cy - 17, cx - 6, cy - 25);
    g.fillTriangle(cx + 6, cy - 25, cx + 10, cy - 17, cx + 15, cy - 23);

    // Eyes
    this.drawRoundEyes(g, cx, cy, cy - 2, 12, 11, 5, 2.5);

    // Cheeks
    this.drawRosyCheeks(g, cx, cy, cy + 9, 22, 5.5);

    // Smile
    this.drawSmile(g, cx, cy + 8, 6, 2, 2.5, 0x3a2010);

    // Shield
    g.fillStyle(0xb8d4f0, 1);
    g.fillRoundedRect(cx - 11, cy + 16, 22, 17, 4);
    g.lineStyle(2, 0x7aadd8, 0.9);
    g.strokeRoundedRect(cx - 11, cy + 16, 22, 17, 4);
    g.fillStyle(0x4a90d9, 1);
    g.fillCircle(cx, cy + 25, 4);
  }

  drawHop(g, cx, cy, color) {
    const bodyR = 30;
    const bodyY = cy + 2;
    this.drawDropShadow(g, cx, bodyY, bodyR);
    g.fillStyle(color, 1);
    g.fillCircle(cx, bodyY, bodyR);
    this.drawBodyHighlight(g, cx, bodyY, bodyR);

    // Bulging frog eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 14, cy - 20, 11);
    g.fillCircle(cx + 14, cy - 20, 11);

    g.fillStyle(0x2a1a0a, 1);
    g.fillCircle(cx - 13, cy - 19, 6);
    g.fillCircle(cx + 15, cy - 19, 6);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 16, cy - 22, 3);
    g.fillCircle(cx + 12, cy - 22, 3);

    // Eye outlines
    g.lineStyle(1.5, color, 1);
    g.strokeCircle(cx - 14, cy - 20, 11);
    g.strokeCircle(cx + 14, cy - 20, 11);

    // Cheeks
    this.drawRosyCheeks(g, cx, bodyY, bodyY + 6, 22, 5);

    // Wide smile
    this.drawSmile(g, cx, bodyY + 4, 11, 2, 2.5, 0x2a5a20);

    // Feet
    g.fillStyle(color, 1);
    g.fillEllipse(cx - 14, cy + 32, 14, 10);
    g.fillEllipse(cx + 14, cy + 32, 14, 10);
    g.fillStyle(0xffffff, 0.15);
    g.fillEllipse(cx - 14, cy + 30, 10, 6);
    g.fillEllipse(cx + 14, cy + 30, 10, 6);
  }

  drawZap(g, cx, cy, color) {
    const r = 33;
    this.drawDropShadow(g, cx, cy, r);
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, r);
    this.drawBodyHighlight(g, cx, cy, r);

    // Pointy cat-like ears
    g.fillStyle(color, 1);
    g.fillTriangle(cx - 20, cy - 22, cx - 6, cy - 12, cx - 3, cy - 30);
    g.fillTriangle(cx + 3, cy - 30, cx + 6, cy - 12, cx + 20, cy - 22);
    g.fillStyle(0xffffff, 0.35);
    g.fillTriangle(cx - 15, cy - 20, cx - 7, cy - 13, cx - 5, cy - 26);
    g.fillTriangle(cx + 5, cy - 26, cx + 7, cy - 13, cx + 15, cy - 20);

    // Eyes
    this.drawRoundEyes(g, cx, cy, cy - 4, 12, 11, 5.5, 2.5);

    // Excitement marks (small lines above eyes)
    g.lineStyle(1.5, 0xcc8800, 0.5);
    g.beginPath();
    g.moveTo(cx - 23, cy - 20);
    g.lineTo(cx - 26, cy - 24);
    g.strokePath();
    g.beginPath();
    g.moveTo(cx + 23, cy - 20);
    g.lineTo(cx + 26, cy - 24);
    g.strokePath();

    // Cheeks
    this.drawRosyCheeks(g, cx, cy, cy + 7, 23, 5);

    // Open mouth
    g.fillStyle(0x3a2010, 1);
    g.fillEllipse(cx, cy + 10, 12, 8);
    g.fillStyle(0xff6666, 1);
    g.fillEllipse(cx, cy + 11, 8, 4);

    // Lightning bolt on forehead
    g.fillStyle(0xffaa00, 0.7);
    g.beginPath();
    g.moveTo(cx, cy - 32);
    g.lineTo(cx - 5, cy - 22);
    g.lineTo(cx + 1, cy - 24);
    g.lineTo(cx - 4, cy - 16);
    g.lineTo(cx + 8, cy - 26);
    g.lineTo(cx + 2, cy - 24);
    g.lineTo(cx + 7, cy - 32);
    g.closePath();
    g.fillPath();
  }

  // ---- Enemy Drawers ----

  drawCharger(g, cx, cy, color) {
    const r = 33;
    this.drawDropShadow(g, cx, cy, r);
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, r);
    g.lineStyle(1.5, 0x000000, 0.2);
    g.strokeCircle(cx, cy, r);

    // Horns
    g.fillStyle(0xaa2222, 1);
    g.fillTriangle(cx - 14, cy - 22, cx - 8, cy - 14, cx + 2, cy - 33);
    g.fillTriangle(cx + 14, cy - 22, cx + 8, cy - 14, cx - 2, cy - 33);

    // Eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 11, cy - 4, 8);
    g.fillCircle(cx + 11, cy - 4, 8);
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 11, cy - 3, 4);
    g.fillCircle(cx + 11, cy - 3, 4);

    // Angry brows
    this.drawAngryBrows(g, cx, cy - 14, 11, 0x111111);

    // Frown
    this.drawFrown(g, cx, cy + 8, 8, 6, 2.5, 0x111111);

    // Small teeth
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 6, cy + 9, 4, 5);
    g.fillRect(cx + 2, cy + 9, 4, 5);
  }

  drawSpitter(g, cx, cy, color) {
    const r = 31;
    this.drawDropShadow(g, cx, cy, r);
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, r);
    g.lineStyle(1.5, 0x000000, 0.2);
    g.strokeCircle(cx, cy, r);

    // Bumps around body
    g.fillStyle(color, 1);
    g.fillCircle(cx + 26, cy - 4, 7);
    g.fillCircle(cx - 24, cy + 6, 8);
    g.fillCircle(cx + 10, cy + 28, 6);
    g.lineStyle(1.5, 0x000000, 0.15);
    g.strokeCircle(cx + 26, cy - 4, 7);
    g.strokeCircle(cx - 24, cy + 6, 8);
    g.strokeCircle(cx + 10, cy + 28, 6);

    // One big eye (cyclops)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy - 5, 12);
    g.fillStyle(0x881111, 1);
    g.fillCircle(cx + 1, cy - 4, 6);
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx + 2, cy - 4, 3);

    // Droopy eyelid
    g.fillStyle(color, 0.9);
    g.fillRect(cx - 14, cy - 17, 28, 8);

    // Tongue
    g.fillStyle(0xff6688, 1);
    g.fillEllipse(cx + 8, cy + 14, 10, 12);
    g.lineStyle(1, 0xcc3355, 0.6);
    g.lineBetween(cx + 8, cy + 10, cx + 8, cy + 19);

    // Drool
    g.fillStyle(0xaaddff, 0.6);
    g.fillCircle(cx + 8, cy + 22, 2.5);
  }

  drawGrabber(g, cx, cy, color) {
    const bodyW = 36;
    const bodyH = 28;
    this.drawDropShadow(g, cx + 1, cy + 2, bodyW);
    g.fillStyle(color, 1);
    g.fillEllipse(cx, cy, bodyW * 2, bodyH * 2);
    g.lineStyle(1.5, 0x000000, 0.2);
    g.strokeEllipse(cx, cy, bodyW * 2, bodyH * 2);

    // Arms
    g.fillStyle(color, 1);
    g.fillEllipse(cx - 38, cy + 2, 18, 12);
    g.fillEllipse(cx + 38, cy + 2, 18, 12);
    g.lineStyle(1.5, 0x000000, 0.15);
    g.strokeEllipse(cx - 38, cy + 2, 18, 12);
    g.strokeEllipse(cx + 38, cy + 2, 18, 12);

    // Claws
    g.fillStyle(0xddccaa, 1);
    g.fillTriangle(cx - 44, cy - 4, cx - 48, cy + 3, cx - 40, cy + 6);
    g.fillTriangle(cx + 44, cy - 4, cx + 48, cy + 3, cx + 40, cy + 6);
    g.lineStyle(1, 0x000000, 0.2);
    g.strokeTriangle(cx - 44, cy - 4, cx - 48, cy + 3, cx - 40, cy + 6);
    g.strokeTriangle(cx + 44, cy - 4, cx + 48, cy + 3, cx + 40, cy + 6);

    // Squinty eyes
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(cx - 9, cy - 7, 14, 8);
    g.fillEllipse(cx + 9, cy - 7, 14, 8);
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 8, cy - 6, 4);
    g.fillCircle(cx + 10, cy - 6, 4);

    // Eyelids (squint)
    g.fillStyle(color, 0.95);
    g.fillRect(cx - 16, cy - 14, 14, 6);
    g.fillRect(cx + 2, cy - 14, 14, 6);

    // Smirk
    g.lineStyle(2.5, 0x111111, 0.9);
    g.beginPath();
    g.moveTo(cx - 5, cy + 5);
    g.lineTo(cx + 10, cy + 2);
    g.strokePath();

    // Single tooth
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx + 3, cy + 3, 4, 5);
  }

  drawBoomer(g, cx, cy, color) {
    const r = 32;
    this.drawDropShadow(g, cx, cy, r);
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, r);
    g.lineStyle(1.5, 0x000000, 0.25);
    g.strokeCircle(cx, cy, r);

    // Body band (like a bomb)
    g.fillStyle(0x444444, 0.4);
    g.fillRect(cx - 27, cy - 3, 54, 8);

    // Fuse
    g.lineStyle(3, 0x887744, 1);
    g.beginPath();
    g.moveTo(cx + 3, cy - 33);
    g.lineTo(cx + 8, cy - 40);
    g.lineTo(cx + 14, cy - 35);
    g.strokePath();

    // Spark
    g.fillStyle(0xff6600, 1);
    g.fillCircle(cx + 14, cy - 35, 4);
    g.fillStyle(0xffdd00, 1);
    g.fillCircle(cx + 14, cy - 35, 2);
    // Spark rays
    g.lineStyle(1.5, 0xffdd00, 0.7);
    g.lineBetween(cx + 14, cy - 35, cx + 16, cy - 40);
    g.lineBetween(cx + 14, cy - 35, cx + 20, cy - 34);
    g.lineBetween(cx + 14, cy - 35, cx + 16, cy - 30);

    // Wide eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 10, cy - 5, 9);
    g.fillCircle(cx + 10, cy - 5, 9);
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 9, cy - 4, 5);
    g.fillCircle(cx + 11, cy - 4, 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 10, cy - 6, 2);
    g.fillCircle(cx + 10, cy - 6, 2);

    // Grin
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - 12, cy + 5, 24, 12, 3);
    g.lineStyle(1, 0x111111, 0.4);
    g.strokeRoundedRect(cx - 12, cy + 5, 24, 12, 3);
    // Teeth line
    g.lineStyle(1.5, 0x111111, 0.6);
    g.lineBetween(cx - 12, cy + 10, cx + 12, cy + 10);
  }

  // ---- Texture Generators ----

  generateCritterTextures() {
    crittersData.forEach((critter) => {
      if (critter.id === 'bash' || critter.id === 'hop' || critter.id === 'zap') return;
      const g = this.make.graphics({ add: false });
      const color = this.hexToInt(critter.color);
      const cx = 40, cy = 40;

      if (critter.id === 'bash') this.drawBash(g, cx, cy, color);
      else if (critter.id === 'hop') this.drawHop(g, cx, cy, color);
      else if (critter.id === 'zap') this.drawZap(g, cx, cy, color);

      g.generateTexture(`critter_${critter.id}`, 80, 80);
      g.destroy();
    });
  }

  generateEnemyTextures() {
    enemiesData.forEach((enemy) => {
      if (enemy.id === 'charger' || enemy.id === 'spitter' || enemy.id === 'grabber' || enemy.id === 'boomer') return;
      const g = this.make.graphics({ add: false });
      const color = this.hexToInt(enemy.color);
      const cx = 40, cy = 40;

      if (enemy.id === 'charger') this.drawCharger(g, cx, cy, color);
      else if (enemy.id === 'spitter') this.drawSpitter(g, cx, cy, color);
      else if (enemy.id === 'grabber') this.drawGrabber(g, cx, cy, color);
      else if (enemy.id === 'boomer') this.drawBoomer(g, cx, cy, color);

      g.generateTexture(`enemy_${enemy.id}`, 80, 80);
      g.destroy();
    });
  }

  generateUITextures() {
    const s = 80;

    // Move highlight
    let g = this.make.graphics({ add: false });
    g.fillStyle(0x4a90d9, 0.25);
    g.fillRoundedRect(0, 0, s, s, 8);
    g.lineStyle(3, 0x4a90d9, 0.7);
    g.strokeRoundedRect(0, 0, s, s, 8);
    g.generateTexture('highlight_move', s, s);
    g.destroy();

    // Attack highlight
    g = this.make.graphics({ add: false });
    g.fillStyle(0xe74c3c, 0.3);
    g.fillRoundedRect(0, 0, s, s, 8);
    g.lineStyle(3, 0xe74c3c, 0.7);
    g.strokeRoundedRect(0, 0, s, s, 8);
    g.generateTexture('highlight_attack', s, s);
    g.destroy();

    // Danger highlight
    g = this.make.graphics({ add: false });
    g.fillStyle(0xe74c3c, 0.25);
    g.fillRoundedRect(0, 0, s, s, 8);
    g.lineStyle(2, 0xe74c3c, 0.5);
    g.strokeRoundedRect(0, 0, s, s, 8);
    g.generateTexture('highlight_danger', s, s);
    g.destroy();

    // Hazard cell
    g = this.make.graphics({ add: false });
    g.fillStyle(0xff4444, 0.18);
    g.fillRoundedRect(0, 0, s, s, 8);
    g.lineStyle(2, 0xcc0000, 0.35);
    g.strokeRoundedRect(0, 0, s, s, 8);
    g.generateTexture('cell_hazard', s, s);
    g.destroy();
  }
}
