import { spawn } from 'node:child_process';
import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = join(root, 'docs');
const staging = join(root, '.docs-build');

const legacyFiles = [
  'index.html',
  'animal-memory.html',
  'code-adventure.html',
  'hippo.html',
  'monkey-banana.html',
  'mouse-adventure.html',
  'robot-factory.html',
  'train-tracks.html',
  'valley-explorer.html',
] as const;

const legacyDirectories = [
  {
    destination: 'crocodile-game',
    sources: ['index.html', 'styles.css', 'game.js', 'assets'],
  },
  {
    destination: 'little-chef-kitchen',
    sources: ['index.html', 'css', 'js'],
  },
] as const;

async function copy(relativeSource: string, relativeDestination = relativeSource): Promise<void> {
  const destination = join(staging, relativeDestination);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(root, relativeSource), destination, { recursive: true });
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

async function buildCritterTactics(): Promise<void> {
  const gameDirectory = join(root, 'thegame');
  await run('npm', ['ci'], gameDirectory);
  await run('npm', ['run', 'build'], gameDirectory);
  await copy('thegame/dist', 'thegame');
}

async function build(): Promise<void> {
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  try {
    for (const file of legacyFiles) {
      await copy(file);
    }

    for (const directory of legacyDirectories) {
      for (const source of directory.sources) {
        await copy(`${directory.destination}/${source}`);
      }
    }

    await buildCritterTactics();

    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
    console.log(`Built portfolio: ${output}`);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

await build();
