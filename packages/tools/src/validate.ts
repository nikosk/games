import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const site = join(root, 'docs');

const fixedExpectedEntries = [
  'index.html',
  'animal-memory.html',
  'code-adventure.html',
  'hippo.html',
  'monkey-banana.html',
  'mouse-adventure.html',
  'robot-factory.html',
  'train-tracks.html',
  'valley-explorer.html',
  'classic/train-tracks.html',
  'crocodile-game/index.html',
  'little-chef-kitchen/index.html',
  'thegame/index.html',
] as const;

interface GameManifest {
  readonly id: string;
}

async function workspaceGameEntries(): Promise<string[]> {
  const gamesDirectory = join(root, 'games');
  const entries: string[] = [];
  for (const directory of await readdir(gamesDirectory, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    try {
      const manifest = JSON.parse(
        await readFile(join(gamesDirectory, directory.name, 'game.json'), 'utf8'),
      ) as GameManifest;
      entries.push(`${manifest.id}/index.html`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return entries.sort();
}

const errors: string[] = [];

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

function cleanReference(reference: string): string | null {
  const trimmed = reference.trim();
  if (
    trimmed === ''
    || trimmed.startsWith('#')
    || trimmed.startsWith('data:')
    || trimmed.startsWith('mailto:')
    || trimmed.startsWith('tel:')
    || trimmed.startsWith('javascript:')
    || /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
  ) {
    return null;
  }

  return decodeURIComponent(trimmed.split('#', 1)[0]?.split('?', 1)[0] ?? '');
}

function resolveReference(source: string, reference: string): string {
  if (reference.startsWith('/games/')) {
    return join(site, reference.slice('/games/'.length));
  }
  if (reference.startsWith('/')) {
    errors.push(`${source}: domain-root path is outside the /games/ project: ${reference}`);
    return join(site, reference.slice(1));
  }
  return resolve(dirname(source), reference);
}

async function checkReference(source: string, rawReference: string): Promise<void> {
  const reference = cleanReference(rawReference);
  if (reference === null || reference === '') return;

  const sourceName = source.slice(site.length + 1);
  let target = normalize(resolveReference(source, reference));
  const relativeTarget = relative(site, target);
  if (relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) {
    errors.push(`${sourceName}: reference escapes docs/: ${rawReference}`);
    return;
  }

  if (reference.endsWith('/')) {
    target = join(target, 'index.html');
  }

  if (!await exists(target)) {
    errors.push(`${sourceName}: missing ${rawReference}`);
  }
}

async function checkHtml(path: string): Promise<void> {
  const content = await readFile(path, 'utf8');
  const relativePath = path.slice(site.length + 1);

  if (/node_modules|(?:src|href)=["']\/?src\//i.test(content) || /\/@vite\//i.test(content)) {
    errors.push(`${relativePath}: contains an unbuilt Vite or node_modules reference`);
  }

  const attributePattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const match of content.matchAll(attributePattern)) {
    if (match[1] !== undefined) await checkReference(path, match[1]);
  }
}

async function checkCss(path: string): Promise<void> {
  const content = await readFile(path, 'utf8');
  const urlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  for (const match of content.matchAll(urlPattern)) {
    if (match[1] !== undefined) await checkReference(path, match[1]);
  }
}

async function validate(): Promise<void> {
  if (!await exists(site)) {
    throw new Error('docs/ does not exist. Run npm run build first.');
  }

  const expectedEntries = [...fixedExpectedEntries, ...await workspaceGameEntries()];
  for (const entry of expectedEntries) {
    if (!await exists(join(site, entry))) errors.push(`Missing portfolio entry: ${entry}`);
  }

  const files = await walk(site);
  for (const path of files) {
    const extension = extname(path).toLowerCase();
    if (extension === '.ts' || extension === '.tsx') {
      errors.push(`${path.slice(site.length + 1)}: TypeScript source leaked into docs/`);
    } else if (extension === '.html') {
      await checkHtml(path);
    } else if (extension === '.css') {
      await checkCss(path);
    }
  }

  if (errors.length > 0) {
    console.error(errors.map((error) => `- ${error}`).join('\n'));
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${expectedEntries.length} portfolio entries and ${files.length} files.`);
}

await validate();
