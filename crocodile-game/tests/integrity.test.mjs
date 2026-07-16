import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const expectedCues = [
  'welcome', 'wake-coco', 'missing-hat', 'river-intro', 'tap-lilies',
  'river-success', 'grass-intro', 'butterfly', 'beetle', 'turtle',
  'hat-in-tree', 'choose-helper', 'elephant-success', 'giraffe-success',
  'monkey-success', 'decorate-hat', 'flower', 'star', 'bow',
  'celebration', 'thank-you', 'idle-help'
];

test('the Greek story contains all five playable scenes', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.match(html, /<html lang="el">/);
  assert.match(html, /Η Κόκο και το χαμένο καπέλο/);
  for (let scene = 1; scene <= 5; scene += 1) {
    assert.match(html, new RegExp(`id="scene-${scene}"`));
  }
});

test('every narration cue is wired into the game and bundled as a non-empty MP3', async () => {
  const game = await readFile('game.js', 'utf8');
  await Promise.all(expectedCues.map(async (cue) => {
    assert.match(game, new RegExp(`assets/audio/${cue}\\.mp3`));
    const info = await stat(`assets/audio/${cue}.mp3`);
    assert.ok(info.size > 1_000, `${cue}.mp3 should contain narration audio`);
  }));
});

test('the narration manifest records a Greek neural voice and every spoken line', async () => {
  const manifest = JSON.parse(await readFile('assets/audio/narration.json', 'utf8'));
  assert.equal(manifest.voice, 'el-GR-AthinaNeural');
  assert.deepEqual(Object.keys(manifest.cues), expectedCues);
  for (const text of Object.values(manifest.cues)) {
    assert.match(text, /[Α-ωΆ-ώ]/u);
  }
});

test('replay restores Coco and scene four starts with one coherent narration cue', async () => {
  const game = await readFile('game.js', 'utf8');
  assert.match(game, /coco-eye-left'\)\?\.setAttribute\('d', 'M225,75 Q232,68 239,75'\)/);
  assert.match(game, /coco-eye-right'\)\?\.setAttribute\('d', 'M248,75 Q255,68 262,75'\)/);
  assert.match(game, /querySelectorAll\('\.sleep-zzz'\).*style\.display = ''/);
  assert.match(game, /hatPeg\.style\.opacity = '0\.9'/);
  assert.doesNotMatch(game, /4: 'hat-in-tree'/);
  assert.match(game, /4: 'choose-helper'/);
});
