import Phaser from 'phaser';
import crittersData from '../data/critters.json';
import enemiesData from '../data/enemies.json';
import levelsData from '../data/levels.json';

const PROGRESS_KEY = 'critter_tactics_progress';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  init(data) {
    this.levelId = data.levelId;
  }

  create() {
    this.level = levelsData.find((l) => l.id === this.levelId);
    this.gridSize = this.level.gridSize;
    this.phase = null;
    this.critters = [];
    this.enemies = [];
    this.selectedCritter = null;
    this.movedCritterIds = new Set();
    this.queuedActions = [];
    this.bombs = [];
    this.highlights = [];
    this.intentIndicators = [];
    this.skipButton = null;
    this._inputLocked = false;

    this.calculateLayout();
    this.drawGrid();
    this.drawHazards();
    this.spawnEntities();
    this.createUI();
    this.setupInput();

    this.phaseText = this.add.text(480, 10, '', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#4a90d9',
    }).setOrigin(0.5).setAlpha(0).setDepth(50);

    if (this.levelId === 1 && !localStorage.getItem('critter_tactics_tutorial')) {
      this.showTutorial();
    } else {
      this.startEnemyIntentPhase();
    }
  }

  // ---- Layout ----

  calculateLayout() {
    this.cellSize = Math.min(
      90,
      Math.floor(920 / this.gridSize),
      Math.floor(520 / this.gridSize)
    );
    this.gridPx = this.gridSize * this.cellSize;
    this.offsetX = (960 - this.gridPx) / 2;
    this.offsetY = (640 - this.gridPx - 80) / 2;
  }

  cellToPixel(row, col) {
    return {
      x: this.offsetX + col * this.cellSize + this.cellSize / 2,
      y: this.offsetY + row * this.cellSize + this.cellSize / 2,
    };
  }

  pixelToCell(px, py) {
    const col = Math.floor((px - this.offsetX) / this.cellSize);
    const row = Math.floor((py - this.offsetY) / this.cellSize);
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return null;
    return { row, col };
  }

  // ---- Grid ----

  drawGrid() {
    const g = this.add.graphics();
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = this.offsetX + col * this.cellSize;
        const y = this.offsetY + row * this.cellSize;
        const fillColor = (row + col) % 2 === 0 ? 0xe8f5e0 : 0xdcedc8;
        g.fillStyle(fillColor, 1);
        g.fillRoundedRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2, 6);
      }
    }
    g.lineStyle(1, 0xb8d8a8, 0.5);
    for (let i = 0; i <= this.gridSize; i++) {
      const pos = this.offsetX + i * this.cellSize;
      g.beginPath();
      g.moveTo(pos, this.offsetY);
      g.lineTo(pos, this.offsetY + this.gridPx);
      g.strokePath();
      const posY = this.offsetY + i * this.cellSize;
      g.beginPath();
      g.moveTo(this.offsetX, posY);
      g.lineTo(this.offsetX + this.gridPx, posY);
      g.strokePath();
    }
  }

  drawHazards() {
    if (!this.level.hazards) return;
    this.level.hazards.forEach((h) => {
      const x = this.offsetX + h.col * this.cellSize;
      const y = this.offsetY + h.row * this.cellSize;
      const img = this.add.image(x + this.cellSize / 2, y + this.cellSize / 2, 'cell_hazard');
      img.setDisplaySize(this.cellSize, this.cellSize);
      // Spikes drawn on top
      const g = this.add.graphics();
      g.lineStyle(3, 0xcc0000, 0.6);
      g.beginPath();
      g.moveTo(x + 10, y + this.cellSize / 2);
      g.lineTo(x + this.cellSize / 2, y + 10);
      g.lineTo(x + this.cellSize - 10, y + this.cellSize / 2);
      g.strokePath();
      g.beginPath();
      g.moveTo(x + 10, y + this.cellSize / 2);
      g.lineTo(x + this.cellSize / 2, y + this.cellSize - 10);
      g.lineTo(x + this.cellSize - 10, y + this.cellSize / 2);
      g.strokePath();
    });
  }

  getEntityAt(row, col) {
    const c = this.critters.find((e) => e.row === row && e.col === col);
    if (c) return { type: 'critter', ref: c };
    const e = this.enemies.find((e) => e.row === row && e.col === col);
    if (e) return { type: 'enemy', ref: e };
    return null;
  }

  isCellOccupied(row, col) {
    return this.getEntityAt(row, col) !== null;
  }

  isCellHazard(row, col) {
    return this.level.hazards && this.level.hazards.some((h) => h.row === row && h.col === col);
  }

  isCellValid(row, col) {
    return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
  }

  getAdjacentCells(row, col) {
    const cells = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    dirs.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (this.isCellValid(nr, nc)) cells.push({ row: nr, col: nc });
    });
    return cells;
  }

  getReachableCells(critter, maxDist) {
    const startKey = `${critter.row},${critter.col}`;
    const visited = new Set([startKey]);
    const reachable = [];
    const queue = [{ row: critter.row, col: critter.col, dist: 0 }];

    while (queue.length > 0) {
      const { row, col, dist } = queue.shift();
      if (dist > 0 && !this.isCellOccupied(row, col)) {
        reachable.push({ row, col, dist });
      }
      if (dist < maxDist) {
        // Hop can jump over occupied cells; other critters cannot
        const canJump = critter.def.moveRange >= 2;
        this.getAdjacentCells(row, col).forEach((cell) => {
          const key = `${cell.row},${cell.col}`;
          if (!visited.has(key)) {
            if (!this.isCellOccupied(cell.row, cell.col) || canJump) {
              visited.add(key);
              queue.push({ row: cell.row, col: cell.col, dist: dist + 1 });
            }
          }
        });
      }
    }
    return reachable;
  }

  distance(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }

  // ---- Entity Management ----

  spawnCritter(data) {
    const def = crittersData.find((c) => c.id === data.type);
    const pos = this.cellToPixel(data.row, data.col);
    const sprite = this.add.image(pos.x, pos.y, `critter_${def.id}`);
    const scale = this.cellSize * 0.8 / 80;
    sprite.setScale(scale);

    // Gentle idle bounce
    this.tweens.add({
      targets: sprite,
      scaleX: scale * 1.07,
      scaleY: scale * 1.07,
      duration: 850 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const critter = {
      id: `critter_${data.row}_${data.col}_${Date.now()}`,
      def,
      row: data.row,
      col: data.col,
      hp: def.hp,
      maxHp: def.hp,
      sprite,
      baseScale: scale,
      hasActed: false,
      pendingMove: null,
    };
    this.createHpBar(critter);
    this.critters.push(critter);
    return critter;
  }

  spawnEnemy(data) {
    const def = enemiesData.find((e) => e.id === data.type);
    const pos = this.cellToPixel(data.row, data.col);
    const sprite = this.add.image(pos.x, pos.y, `enemy_${def.id}`);
    const scale = this.cellSize * 0.8 / 80;
    sprite.setScale(scale);

    // Subtle idle sway
    this.tweens.add({
      targets: sprite,
      angle: { from: -2, to: 2 },
      duration: 1200 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const enemy = {
      id: `enemy_${data.row}_${data.col}_${Date.now()}`,
      def,
      row: data.row,
      col: data.col,
      hp: def.hp,
      maxHp: def.hp,
      sprite,
      baseScale: scale,
      intent: null,
    };
    this.createHpBar(enemy);
    this.enemies.push(enemy);
    return enemy;
  }

  spawnEntities() {
    this.level.critters.forEach((c) => this.spawnCritter(c));
    this.level.enemies.forEach((e) => this.spawnEnemy(e));
  }

  removeEntity(entity, isCritter) {
    const list = isCritter ? this.critters : this.enemies;
    const idx = list.indexOf(entity);
    if (idx >= 0) {
      list.splice(idx, 1);
      this.destroyHpBar(entity);
      this.tweens.add({
        targets: entity.sprite,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 200,
        onComplete: () => entity.sprite.destroy(),
      });
    }
  }

  moveEntityTo(entity, row, col, animate = true) {
    entity.row = row;
    entity.col = col;
    const pos = this.cellToPixel(row, col);
    if (animate) {
      return new Promise((resolve) => {
        this.tweens.add({
          targets: entity.sprite,
          x: pos.x,
          y: pos.y,
          duration: 180,
          ease: 'Back.easeOut',
          onUpdate: () => this.moveHpBar(entity),
          onComplete: resolve,
        });
      });
    } else {
      entity.sprite.x = pos.x;
      entity.sprite.y = pos.y;
      this.moveHpBar(entity);
      return Promise.resolve();
    }
  }

  damageEntity(entity, amount, isCritter) {
    entity.hp -= amount;
    this.moveHpBar(entity);
    if (entity.hp <= 0) {
      this.removeEntity(entity, isCritter);
      return true;
    }
    this.tweens.add({
      targets: entity.sprite,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 1,
    });
    return false;
  }

  // ---- Input ----

  setupInput() {
    this.input.on('pointerdown', (pointer) => {
      if (this._inputLocked) return;
      const cell = this.pixelToCell(pointer.x, pointer.y);
      if (cell) this.onCellPointerDown(cell.row, cell.col);
    });
  }

  onCellPointerDown(row, col) {
    if (this.phase !== 'player_plan') return;

    const entity = this.getEntityAt(row, col);

    // Clicked on own critter
    if (entity && entity.type === 'critter') {
      const critter = entity.ref;
      if (this.movedCritterIds.has(critter.id)) return;

      if (this.selectedCritter === critter && critter.pendingMove) {
        // Undo move
        this.moveEntityTo(critter, critter.pendingMove.fromRow, critter.pendingMove.fromCol);
        critter.pendingMove = null;
        this.clearHighlights();
        this._moveTargets = this.getReachableCells(critter, critter.def.moveRange);
        this.showMoveHighlights(this._moveTargets);
        this.destroySkipButton();
        return;
      }

      this.selectCritter(critter);
      return;
    }

    // Clicked on ability target (highlighted enemy)
    if (this.selectedCritter && this.selectedCritter.pendingMove) {
      const isTarget = this._abilityTargets && this._abilityTargets.some(
        (t) => t.row === row && t.col === col
      );
      if (isTarget) {
        const target = this.enemies.find((e) => e.row === row && e.col === col);
        if (target) {
          this.useAbility(this.selectedCritter, target);
          return;
        }
      }
    }

    // Clicked on move target (highlighted cell)
    if (this.selectedCritter) {
      const isMove = this._moveTargets && this._moveTargets.some(
        (t) => t.row === row && t.col === col
      );
      if (isMove && !this.isCellOccupied(row, col)) {
        this.moveCritter(this.selectedCritter, row, col);
        return;
      }
    }

    // Clicked elsewhere - deselect
    if (this.selectedCritter && !this.selectedCritter.pendingMove) {
      this.deselectCritter();
    }
  }

  selectCritter(critter) {
    this.deselectCritter();
    this.selectedCritter = critter;
    critter.sprite.setTint(0xffffaa);
    this.showInfoPanel(critter);

    if (!critter.pendingMove) {
      const maxDist = critter.def.moveRange;
      const reachable = this.getReachableCells(critter, maxDist);
      this._moveTargets = reachable;
      this.showMoveHighlights(reachable);
    }
  }

  deselectCritter() {
    if (this.selectedCritter) {
      this.selectedCritter.sprite.clearTint();
      this.selectedCritter = null;
      this._moveTargets = null;
      this._abilityTargets = null;
      this.clearHighlights();
      this.destroySkipButton();
      this.hideInfoPanel();
    }
  }

  showMoveHighlights(reachable) {
    reachable.forEach(({ row, col }) => {
      const x = this.offsetX + col * this.cellSize;
      const y = this.offsetY + row * this.cellSize;
      const img = this.add.image(x + this.cellSize / 2, y + this.cellSize / 2, 'highlight_move');
      img.setDisplaySize(this.cellSize, this.cellSize);
      img.setAlpha(0.7);
      this.highlights.push(img);
      this.tweens.add({
        targets: img,
        alpha: 0.4,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    });
  }

  showAbilityHighlights(targets) {
    targets.forEach((target) => {
      const x = this.offsetX + target.col * this.cellSize;
      const y = this.offsetY + target.row * this.cellSize;
      const img = this.add.image(x + this.cellSize / 2, y + this.cellSize / 2, 'highlight_attack');
      img.setDisplaySize(this.cellSize, this.cellSize);
      img.setAlpha(0.7);
      this.highlights.push(img);
      this.tweens.add({
        targets: img,
        alpha: 0.5,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    });
  }

  clearHighlights() {
    this.highlights.forEach((h) => h.destroy());
    this.highlights = [];
    this._moveTargets = null;
    this._abilityTargets = null;
  }

  moveCritter(critter, row, col) {
    const fromRow = critter.row;
    const fromCol = critter.col;
    critter.pendingMove = { fromRow, fromCol };
    this.moveEntityTo(critter, row, col);
    this.clearHighlights();

    const ability = critter.def.ability;
    const targets = this.getValidAbilityTargets(critter, ability);
    if (targets.length > 0) {
      this._abilityTargets = targets;
      this.showAbilityHighlights(targets);
    }
    this.createSkipButton(critter);
  }

  getValidAbilityTargets(critter, ability) {
    const targets = [];
    if (ability.type === 'push') {
      this.getAdjacentCells(critter.row, critter.col).forEach((cell) => {
        const entity = this.getEntityAt(cell.row, cell.col);
        if (entity && entity.type === 'enemy') {
          targets.push(entity.ref);
        }
      });
    } else if (ability.type === 'stomp') {
      this.getAdjacentCells(critter.row, critter.col).forEach((cell) => {
        const entity = this.getEntityAt(cell.row, cell.col);
        if (entity && entity.type === 'enemy') {
          targets.push(entity.ref);
        }
      });
    } else if (ability.type === 'ranged') {
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.distance(critter.row, critter.col, row, col) <= ability.range) {
            const entity = this.getEntityAt(row, col);
            if (entity && entity.type === 'enemy') {
              targets.push(entity.ref);
            }
          }
        }
      }
    }
    return targets;
  }

  useAbility(critter, target) {
    const ability = critter.def.ability;

    let pushDir = null;
    if (ability.type === 'push') {
      const dr = target.row - critter.row;
      const dc = target.col - critter.col;
      pushDir = { dr, dc, row: target.row + dr, col: target.col + dc };
    }

    this.queuedActions.push({
      type: ability.type,
      critter,
      target,
      pushDir,
      damage: ability.damage || 0,
    });

    this.movedCritterIds.add(critter.id);
    critter.pendingMove = null;
    critter.hasActed = true;
    critter.sprite.clearTint();
    this.selectedCritter = null;
    this.clearHighlights();
    this.destroySkipButton();
    this.hideInfoPanel();
    this.updateUI();
  }

  createSkipButton(critter) {
    this.destroySkipButton();
    const pos = this.cellToPixel(critter.row, critter.col);
    const btnY = Math.min(pos.y + this.cellSize * 0.8, this.offsetY + this.gridPx + 10);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.9);
    bg.fillRoundedRect(pos.x - 30, btnY, 60, 28, 8);
    bg.lineStyle(2, 0x999999, 0.8);
    bg.strokeRoundedRect(pos.x - 30, btnY, 60, 28, 8);
    this._skipBg = bg;

    const txt = this.add.text(pos.x, btnY + 14, 'Skip', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#5a4a3a',
    }).setOrigin(0.5);
    this._skipTxt = txt;

    const zone = this.add.zone(pos.x, btnY + 14, 60, 28).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.skipAbility(critter));
    this._skipZone = zone;

    this.skipButton = [bg, txt, zone];
  }

  skipAbility(critter) {
    this.movedCritterIds.add(critter.id);
    critter.pendingMove = null;
    critter.hasActed = true;
    critter.sprite.clearTint();
    this.selectedCritter = null;
    this.clearHighlights();
    this.destroySkipButton();
    this.hideInfoPanel();
    this.updateUI();
  }

  destroySkipButton() {
    if (this._skipBg) { this._skipBg.destroy(); this._skipBg = null; }
    if (this._skipTxt) { this._skipTxt.destroy(); this._skipTxt = null; }
    if (this._skipZone) { this._skipZone.destroy(); this._skipZone = null; }
    this.skipButton = null;
  }

  // ---- UI ----

  createUI() {
    const barY = this.offsetY + this.gridPx + 15;

    this.levelText = this.add.text(20, barY - 4, `Level ${this.levelId}: ${this.level.name}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#5a4a3a',
    });

    this.enemyCountText = this.add.text(20, barY + 20, '', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#7a6a5a',
    });

    // End Turn button
    const btnX = 830;
    const btnY = barY + 10;
    this.endTurnBg = this.add.graphics();
    this.endTurnBg.fillStyle(0x4a90d9, 1);
    this.endTurnBg.fillRoundedRect(btnX - 80, btnY - 18, 160, 44, 12);

    this.endTurnText = this.add.text(btnX, btnY + 4, 'End Turn', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.endTurnZone = this.add.zone(btnX, btnY + 4, 160, 44).setInteractive({ useHandCursor: true });
    this.endTurnZone.on('pointerdown', () => this.endTurn());

    this.updateUI();
  }

  updateUI() {
    this.enemyCountText.setText(`${this.enemies.length} enemies remaining`);
  }

  // ---- Turn System ----

  startEnemyIntentPhase() {
    this.phase = 'enemy_intent';
    this.phaseText.setText('Enemy Thinking...').setAlpha(1);
    this.movedCritterIds.clear();
    this.queuedActions = [];
    this.critters.forEach((c) => { c.hasActed = false; c.pendingMove = null; });

    this.checkBombExplosions();
    if (this.checkDefeat()) return;
    if (this.checkVictory()) return;

    this.enemies.forEach((e) => this.calculateIntent(e));
    this.showIntents();

    this.time.delayedCall(800, () => {
      this.clearIntents();
      this.startPlayerPhase();
    });
  }

  calculateIntent(enemy) {
    enemy.intent = null;
    const def = enemy.def;

    if (def.behavior === 'charge') {
      let nearest = null;
      let minDist = Infinity;
      this.critters.forEach((c) => {
        const d = this.distance(enemy.row, enemy.col, c.row, c.col);
        if (d < minDist) { minDist = d; nearest = c; }
      });
      if (!nearest) return;
      if (minDist <= 1) {
        enemy.intent = { type: 'attack', targetRow: nearest.row, targetCol: nearest.col };
      } else {
        // Move one step toward nearest
        const adj = this.getAdjacentCells(enemy.row, enemy.col);
        let best = adj[0];
        let bestDist = Infinity;
        adj.forEach((cell) => {
          if (!this.isCellOccupied(cell.row, cell.col)) {
            const d = this.distance(cell.row, cell.col, nearest.row, nearest.col);
            if (d < bestDist) { bestDist = d; best = cell; }
          }
        });
        if (best && bestDist < minDist) {
          enemy.intent = { type: 'move', toRow: best.row, toCol: best.col };
        }
      }
    } else if (def.behavior === 'ranged') {
      let nearest = null;
      let minDist = Infinity;
      this.critters.forEach((c) => {
        const d = this.distance(enemy.row, enemy.col, c.row, c.col);
        if (d <= def.range && d < minDist) { minDist = d; nearest = c; }
      });
      if (nearest) {
        enemy.intent = { type: 'attack', targetRow: nearest.row, targetCol: nearest.col };
      }
    } else if (def.behavior === 'grab') {
      let nearest = null;
      let minDist = Infinity;
      this.critters.forEach((c) => {
        const d = this.distance(enemy.row, enemy.col, c.row, c.col);
        if (d <= def.range && d < minDist) { minDist = d; nearest = c; }
      });
      if (!nearest) return;
      if (minDist <= 1) {
        enemy.intent = { type: 'attack', targetRow: nearest.row, targetCol: nearest.col };
      } else {
        const dr = Math.sign(enemy.row - nearest.row);
        const dc = Math.sign(enemy.col - nearest.col);
        const toRow = nearest.row + dr;
        const toCol = nearest.col + dc;
        if (this.isCellValid(toRow, toCol) && !this.isCellOccupied(toRow, toCol)) {
          enemy.intent = { type: 'pull', target: nearest, toRow, toCol };
        }
      }
    } else if (def.behavior === 'bomb') {
      let nearest = null;
      let minDist = Infinity;
      this.critters.forEach((c) => {
        const d = this.distance(enemy.row, enemy.col, c.row, c.col);
        if (d <= def.range && d < minDist) { minDist = d; nearest = c; }
      });
      if (nearest) {
        enemy.intent = { type: 'bomb', bombRow: nearest.row, bombCol: nearest.col };
      }
    }
  }

  showIntents() {
    this.clearIntents();
    this.enemies.forEach((enemy) => {
      if (!enemy.intent) return;

      if (enemy.intent.type === 'attack') {
        const { targetRow, targetCol } = enemy.intent;
        const x = this.offsetX + targetCol * this.cellSize;
        const y = this.offsetY + targetRow * this.cellSize;
        const cx = x + this.cellSize / 2;
        const cy = y + this.cellSize / 2;
        const g = this.add.graphics();
        g.fillStyle(0xe74c3c, 0.15);
        g.fillRoundedRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6, 6);
        g.lineStyle(3, 0xe74c3c, 0.65);
        g.lineBetween(cx - 8, cy - 8, cx + 8, cy + 8);
        g.lineBetween(cx + 8, cy - 8, cx - 8, cy + 8);
        this.intentIndicators.push(g);
        this.tweens.add({ targets: g, alpha: 0.4, duration: 300, yoyo: true, repeat: 1 });
      } else if (enemy.intent.type === 'move') {
        const { toRow, toCol } = enemy.intent;
        const x = this.offsetX + toCol * this.cellSize;
        const y = this.offsetY + toRow * this.cellSize;
        const cx = x + this.cellSize / 2;
        const cy = y + this.cellSize / 2;
        const g = this.add.graphics();
        g.fillStyle(0xe67e22, 0.12);
        g.fillRoundedRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6, 6);
        g.lineStyle(2, 0xe67e22, 0.5);
        g.strokeRoundedRect(x + 4, y + 4, this.cellSize - 8, this.cellSize - 8, 6);
        // Footsteps (3 dots)
        g.fillStyle(0xe67e22, 0.55);
        g.fillCircle(cx - 10, cy, 4);
        g.fillCircle(cx, cy, 4.5);
        g.fillCircle(cx + 10, cy, 4);
        this.intentIndicators.push(g);
      } else if (enemy.intent.type === 'pull') {
        const { toRow, toCol } = enemy.intent;
        const x = this.offsetX + toCol * this.cellSize;
        const y = this.offsetY + toRow * this.cellSize;
        const cx = x + this.cellSize / 2;
        const cy = y + this.cellSize / 2;
        const g = this.add.graphics();
        g.fillStyle(0xe67e22, 0.1);
        g.fillRoundedRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6, 6);
        // Hook icon
        g.lineStyle(3, 0xe67e22, 0.55);
        g.beginPath();
        g.arc(cx + 4, cy + 4, 10, Math.PI * 0.7, Math.PI * 1.8, false);
        g.strokePath();
        g.fillStyle(0xe67e22, 0.5);
        g.fillTriangle(cx + 14, cy - 4, cx + 14, cy + 2, cx + 6, cy - 1);
        this.intentIndicators.push(g);
      } else if (enemy.intent.type === 'bomb') {
        const { bombRow, bombCol } = enemy.intent;
        const x = this.offsetX + bombCol * this.cellSize;
        const y = this.offsetY + bombRow * this.cellSize;
        const cx = x + this.cellSize / 2;
        const cy = y + this.cellSize / 2;
        const g = this.add.graphics();
        g.fillStyle(0x2c3e50, 0.35);
        g.fillRoundedRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6, 6);
        g.fillStyle(0x2c3e50, 0.8);
        g.fillCircle(cx, cy, this.cellSize * 0.23);
        // Spark lines
        g.lineStyle(2, 0xff6b6b, 0.8);
        g.lineBetween(cx, cy - this.cellSize * 0.3, cx, cy - this.cellSize * 0.5);
        g.lineBetween(cx, cy - this.cellSize * 0.3, cx + 5, cy - this.cellSize * 0.42);
        g.lineBetween(cx, cy - this.cellSize * 0.3, cx - 5, cy - this.cellSize * 0.42);
        // Fuse
        g.lineStyle(2, 0x887744, 0.9);
        g.beginPath();
        g.moveTo(cx + this.cellSize * 0.2, cy - this.cellSize * 0.15);
        g.lineTo(cx + this.cellSize * 0.3, cy - this.cellSize * 0.35);
        g.strokePath();
        this.intentIndicators.push(g);
        this.tweens.add({ targets: g, alpha: 0.5, duration: 300, yoyo: true, repeat: 2 });
      }
    });
  }

  clearIntents() {
    this.intentIndicators.forEach((i) => i.destroy());
    this.intentIndicators = [];
  }

  startPlayerPhase() {
    this.phase = 'player_plan';
    this.phaseText.setText('Your Turn').setAlpha(1);
    this.enemies.forEach((e) => { e.intent = null; });
    this.deselectCritter();
    this.updateUI();
  }

  endTurn() {
    if (this.phase !== 'player_plan') return;
    this.phaseText.setText('Resolving...').setAlpha(1);
    // Commit any pending moves so these critters count as having acted
    this.critters.forEach((c) => {
      if (c.pendingMove && !this.movedCritterIds.has(c.id)) {
        this.movedCritterIds.add(c.id);
      }
    });
    this.deselectCritter();
    this.phase = 'resolve';
    this._inputLocked = true;
    this.resolveTurn();
  }

  async resolveTurn() {
    // Execute player abilities
    for (const action of this.queuedActions) {
      await this.executeAction(action);
      if (this.checkVictory()) { this._inputLocked = false; return; }
    }

    // Remove dead enemies (their actions are cancelled)
    this.queuedActions = []; // Clear any queued actions for dead enemies? No, enemy actions are calculated now.

    // Execute surviving enemy intents
    const survivingEnemies = [...this.enemies];
    for (const enemy of survivingEnemies) {
      if (!this.enemies.includes(enemy)) continue; // was killed by earlier enemy action? unlikely but safe
      await this.executeEnemyAction(enemy);
      if (this.checkDefeat()) { this._inputLocked = false; return; }
      if (this.checkVictory()) { this._inputLocked = false; return; }
    }

    // Remove dead critters
    // (handled in damageEntity)

    if (this.checkDefeat()) { this._inputLocked = false; return; }
    if (this.checkVictory()) { this._inputLocked = false; return; }

    this._inputLocked = false;
    this.startEnemyIntentPhase();
  }

  async executeAction(action) {
    await this.delay(300);

    if (action.type === 'push') {
      if (!this.enemies.includes(action.target)) return; // target already dead
      const pushRow = action.pushDir.row;
      const pushCol = action.pushDir.col;

      if (!this.isCellValid(pushRow, pushCol) || this.isCellOccupied(pushRow, pushCol) || this.isCellHazard(pushRow, pushCol)) {
        // Push into wall, occupied cell, or hazard = 1 damage
        this.damageEntity(action.target, 1, false);
      } else {
        await this.moveEntityTo(action.target, pushRow, pushCol);
      }
    } else if (action.type === 'stomp') {
      if (!this.enemies.includes(action.target)) return;
      this.damageEntity(action.target, 1, false);
    } else if (action.type === 'ranged') {
      if (!this.enemies.includes(action.target)) return;
      this.damageEntity(action.target, action.damage, false);
    }
  }

  async executeEnemyAction(enemy) {
    if (!enemy.intent) return;
    await this.delay(300);

    if (enemy.intent.type === 'attack') {
      const { targetRow, targetCol } = enemy.intent;
      const c = this.critters.find((c) => c.row === targetRow && c.col === targetCol);
      if (c) {
        this.damageEntity(c, enemy.def.damage, true);
      }
    } else if (enemy.intent.type === 'move') {
      const { toRow, toCol } = enemy.intent;
      if (!this.isCellOccupied(toRow, toCol)) {
        await this.moveEntityTo(enemy, toRow, toCol);
      }
    } else if (enemy.intent.type === 'pull') {
      const target = enemy.intent.target;
      if (!this.critters.includes(target)) return;
      const { toRow, toCol } = enemy.intent;
      if (!this.isCellOccupied(toRow, toCol)) {
        await this.moveEntityTo(target, toRow, toCol);
      }
    } else if (enemy.intent.type === 'bomb') {
      const { bombRow, bombCol } = enemy.intent;
      // Check if the target cell is still where the boomer aimed
      // For simplicity, place the bomb
      this.bombs.push({ row: bombRow, col: bombCol, timer: 1 });
      this.showBomb(bombRow, bombCol);
    }

    enemy.intent = null;
  }

  // ---- Bombs ----

  showBomb(row, col) {
    const x = this.offsetX + col * this.cellSize;
    const y = this.offsetY + row * this.cellSize;
    const g = this.add.graphics();
    g.fillStyle(0x2c3e50, 0.7);
    g.fillCircle(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize * 0.25);
    g.lineStyle(2, 0xff6b6b, 0.8);
    g.strokeCircle(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize * 0.25);
    const marker = { graphics: g, row, col };
    this._bombMarkers = this._bombMarkers || [];
    this._bombMarkers.push(marker);
    this.tweens.add({
      targets: g,
      alpha: 0.5,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  checkBombExplosions() {
    const toExplode = this.bombs.filter((b) => b.timer <= 0);
    this.bombs = this.bombs.filter((b) => b.timer > 0);
    this.bombs.forEach((b) => b.timer--);

    toExplode.forEach((b) => this.explodeBomb(b.row, b.col));

    // Clean up bomb markers
    if (this._bombMarkers) {
      this._bombMarkers.forEach((m) => {
        if (toExplode.some((b) => b.row === m.row && b.col === m.col)) {
          m.graphics.destroy();
        }
      });
      this._bombMarkers = this._bombMarkers.filter(
        (m) => !toExplode.some((b) => b.row === m.row && b.col === m.col)
      );
    }
  }

  explodeBomb(row, col) {
    // Flash the area
    const x = this.offsetX + col * this.cellSize;
    const y = this.offsetY + row * this.cellSize;
    const flash = this.add.graphics();
    flash.fillStyle(0xff6b6b, 0.4);
    flash.fillRect(x - this.cellSize, y - this.cellSize, this.cellSize * 3, this.cellSize * 3);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // Damage all in 3x3 area
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const tr = row + dr;
        const tc = col + dc;
        if (!this.isCellValid(tr, tc)) continue;

        const entity = this.getEntityAt(tr, tc);
        if (entity && entity.type === 'critter') {
          this.damageEntity(entity.ref, 1, true);
        }
      }
    }
  }

  // ---- Results ----

  checkVictory() {
    if (this.enemies.length === 0) {
      this.phase = 'victory';
      this.phaseText.setAlpha(0);
      this._inputLocked = true;
      this.time.delayedCall(400, () => {
        this.saveProgress();
        this.scene.start('VictoryScene', {
          levelId: this.levelId,
          levelName: this.level.name,
          isLastLevel: this.levelId >= levelsData.length,
        });
      });
      return true;
    }
    return false;
  }

  checkDefeat() {
    if (this.critters.length === 0) {
      this.phase = 'defeat';
      this.phaseText.setAlpha(0);
      this._inputLocked = true;
      const defeatText = this.add.text(480, 320, 'Defeat!\nTry Again', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#e74c3c',
        align: 'center',
      }).setOrigin(0.5).setDepth(100);

      const retryBtn = this.add.text(480, 400, '[ Tap to Retry ]', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '20px',
        color: '#5a4a3a',
      }).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });

      retryBtn.on('pointerdown', () => {
        this._inputLocked = false;
        this.scene.restart({ levelId: this.levelId });
      });

      this.tweens.add({
        targets: defeatText,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
      return true;
    }
    return false;
  }

  // ---- Utility ----

  delay(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  saveProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      const progress = raw ? JSON.parse(raw) : { unlockedLevel: 1, completedLevels: [] };
      if (!progress.completedLevels.includes(this.levelId)) {
        progress.completedLevels.push(this.levelId);
      }
      if (this.levelId + 1 > progress.unlockedLevel && this.levelId < levelsData.length) {
        progress.unlockedLevel = this.levelId + 1;
      }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {}
  }

  // ---- HP Bars ----

  createHpBar(entity) {
    const w = Math.round(this.cellSize * 0.55);
    const h = 5;
    const cx = entity.sprite.x;
    const cy = entity.sprite.y - this.cellSize * 0.48;

    entity._hpBarBg = this.add.graphics().setDepth(20);
    entity._hpBarBg.fillStyle(0x333333, 0.55);
    entity._hpBarBg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 2);

    entity._hpBarFill = this.add.graphics().setDepth(21);
    this.redrawHpFill(entity, cx - w / 2, cy - h / 2, w, h);
  }

  redrawHpFill(entity, x, y, w, h) {
    entity._hpBarFill.clear();
    const ratio = Math.max(0, entity.hp / entity.maxHp);
    const color = ratio > 0.5 ? 0x6bcb77 : ratio > 0.25 ? 0xffd93d : 0xe74c3c;
    entity._hpBarFill.fillStyle(color, 0.9);
    if (ratio > 0) {
      entity._hpBarFill.fillRoundedRect(x, y, w * ratio, h, 2);
    }
  }

  moveHpBar(entity) {
    if (!entity._hpBarBg || !entity._hpBarFill) return;
    const w = Math.round(this.cellSize * 0.55);
    const h = 5;
    const cx = entity.sprite.x;
    const cy = entity.sprite.y - this.cellSize * 0.48;
    entity._hpBarBg.clear();
    entity._hpBarBg.fillStyle(0x333333, 0.55);
    entity._hpBarBg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 2);
    this.redrawHpFill(entity, cx - w / 2, cy - h / 2, w, h);
  }

  destroyHpBar(entity) {
    if (entity._hpBarBg) { entity._hpBarBg.destroy(); entity._hpBarBg = null; }
    if (entity._hpBarFill) { entity._hpBarFill.destroy(); entity._hpBarFill = null; }
  }

  // ---- Info Panel ----

  showInfoPanel(critter) {
    this.hideInfoPanel();
    this._infoPanel = [];

    const panelX = 20;
    const panelY = this.offsetY + this.gridPx + 50;
    const panelW = 260;
    const panelH = 75;

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.92);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    bg.lineStyle(2, 0x4a90d9, 0.7);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    this._infoPanel.push(bg);

    const nameStr = `${critter.def.name}  HP ${critter.hp}/${critter.maxHp}`;
    this._infoPanel.push(this.add.text(panelX + 12, panelY + 8, nameStr, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#5a4a3a',
    }));

    const ability = critter.def.ability;
    this._infoPanel.push(this.add.text(panelX + 12, panelY + 30, `${ability.name}: ${ability.description}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#7a6a5a',
      wordWrap: { width: panelW - 24 },
    }));
  }

  hideInfoPanel() {
    if (this._infoPanel) {
      this._infoPanel.forEach((e) => e.destroy());
      this._infoPanel = null;
    }
  }

  // ---- Tutorial ----

  showTutorial() {
    this._inputLocked = true;
    this._tutorialEls = [];

    const add = (obj) => { this._tutorialEls.push(obj); return obj; };

    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, 960, 640);
    add(overlay);

    const boxW = 460;
    const boxH = 290;
    const boxX = 480 - boxW / 2;
    const boxY = 320 - boxH / 2;

    const box = this.add.graphics().setDepth(201);
    box.fillStyle(0xffffff, 0.95);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 16);
    box.lineStyle(3, 0x4a90d9, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 16);
    add(box);

    add(this.add.text(480, boxY + 26, 'How to Play', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#4a90d9',
    }).setOrigin(0.5).setDepth(202));

    const steps = [
      '1. Click your critter to select it',
      '2. Blue squares show where you can move',
      '3. After moving, red squares = attack targets',
      '4. Press \"End Turn\" to finish your turn',
      '5. Eliminate all enemies to win!',
    ];

    steps.forEach((step, i) => {
      add(this.add.text(boxX + 55, boxY + 70 + i * 36, step, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
        color: '#5a4a3a',
      }).setDepth(202));
    });

    const btnW = 140;
    const btnH = 40;
    const btnX = 480;
    const btnY = boxY + boxH - 35;

    const btnBg = this.add.graphics().setDepth(202);
    btnBg.fillStyle(0x4a90d9, 1);
    btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    add(btnBg);

    add(this.add.text(btnX, btnY, 'Got it!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(203));

    const btnZone = this.add.zone(btnX, btnY, btnW, btnH).setInteractive({ useHandCursor: true }).setDepth(204);
    add(btnZone);

    btnZone.on('pointerdown', () => {
      this._tutorialEls.forEach((e) => e.destroy());
      this._tutorialEls = null;
      localStorage.setItem('critter_tactics_tutorial', '1');
      this._inputLocked = false;
      this.startEnemyIntentPhase();
    });
  }
}
