#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const MODEL = 'bytedance-seed/seedream-4.5';
const VALID_ASPECTS = new Set([
  '1:1', '1:2', '2:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4',
  '9:16', '16:9', '9:19.5', '19.5:9', '9:20', '20:9', '9:21', '21:9', 'auto',
]);

function usage() {
  console.log(`Usage:
  generate.sh --prompt <file> --out <image> [options]

Options:
  --aspect <ratio>       Output aspect ratio; default 1:1
  --max-dim <pixels>     Maximum final width or height; default 384
  --quality <1-100>      Final WebP/JPEG quality; default 86
  --reference <image>    Ordered reference image; repeat as needed
  --transparent          Request and remove a flat magenta background
  --help                 Show this help
`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const result = {
    prompt: undefined,
    out: undefined,
    aspect: '1:1',
    maxDim: 384,
    quality: 86,
    references: [],
    transparent: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--transparent') {
      result.transparent = true;
      continue;
    }

    const value = argv[index + 1];
    if (value === undefined) fail(`missing value for ${arg}`);
    index += 1;

    if (arg === '--prompt') result.prompt = value;
    else if (arg === '--out') result.out = value;
    else if (arg === '--aspect') result.aspect = value;
    else if (arg === '--max-dim') result.maxDim = Number(value);
    else if (arg === '--quality') result.quality = Number(value);
    else if (arg === '--reference') result.references.push(value);
    else fail(`unknown argument: ${arg}`);
  }

  if (!result.prompt) fail('--prompt is required');
  if (!result.out) fail('--out is required');
  if (!VALID_ASPECTS.has(result.aspect)) fail(`unsupported aspect ratio: ${result.aspect}`);
  if (!Number.isInteger(result.maxDim) || result.maxDim < 32 || result.maxDim > 3840) {
    fail('--max-dim must be an integer from 32 to 3840');
  }
  if (!Number.isInteger(result.quality) || result.quality < 1 || result.quality > 100) {
    fail('--quality must be an integer from 1 to 100');
  }

  return result;
}

function repoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    fail('run this command inside a Git repository');
  }
}

function inRepo(root, input) {
  const absolute = resolve(root, input);
  const pathFromRoot = relative(root, absolute);
  if (pathFromRoot === '' || pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..' || isAbsolute(pathFromRoot)) {
    fail(`path must stay inside the repository: ${input}`);
  }
  return absolute;
}

function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;

  const authPath = join(homedir(), '.local', 'share', 'opencode', 'auth.json');
  if (existsSync(authPath)) {
    try {
      const auth = JSON.parse(readFileSync(authPath, 'utf8'));
      if (typeof auth.openrouter?.key === 'string' && auth.openrouter.key.length > 0) {
        return auth.openrouter.key;
      }
    } catch {
      fail(`could not read OpenCode credentials at ${authPath}`);
    }
  }

  fail('no OpenRouter key found; set OPENROUTER_API_KEY or log in to OpenRouter through OpenCode');
}

function mediaType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  fail(`unsupported reference image type: ${path}`);
}

function referencePayload(path) {
  return {
    type: 'image_url',
    image_url: {
      url: `data:${mediaType(path)};base64,${readFileSync(path).toString('base64')}`,
    },
  };
}

function outputFormat(path) {
  const extension = extname(path).toLowerCase();
  if (extension === '.webp') return 'webp';
  if (extension === '.png') return 'png';
  if (extension === '.jpg' || extension === '.jpeg') return 'jpeg';
  fail('output extension must be .webp, .png, .jpg, or .jpeg');
}

function imageInfo(path) {
  return execFileSync('identify', ['-format', '%wx%h|%[channels]|%b', `${path}[0]`], { encoding: 'utf8' }).trim();
}

function optimize(source, destination, { maxDim, quality, transparent }) {
  const format = outputFormat(destination);
  if (transparent && format === 'jpeg') fail('transparent output requires PNG or WebP');

  const args = [source, '-auto-orient', '-strip'];
  if (transparent) {
    args.push('-alpha', 'on', '-fuzz', '15%', '-transparent', '#ff00ff');
  }
  args.push('-resize', `${maxDim}x${maxDim}>`);
  if (format === 'webp') args.push('-define', 'webp:method=6', '-quality', String(quality));
  else if (format === 'jpeg') args.push('-quality', String(quality));
  args.push(destination);
  execFileSync('magick', args, { stdio: 'inherit' });
}

const options = parseArgs(process.argv.slice(2));
const root = repoRoot();
const promptPath = inRepo(root, options.prompt);
const outputPath = inRepo(root, options.out);
if (!existsSync(promptPath)) fail(`prompt file does not exist: ${options.prompt}`);
if (existsSync(outputPath)) fail(`refusing to overwrite existing output: ${options.out}`);

const references = options.references.map((input) => {
  const path = inRepo(root, input);
  if (!existsSync(path)) fail(`reference image does not exist: ${input}`);
  return path;
});

let prompt = readFileSync(promptPath, 'utf8').trim();
if (options.transparent) {
  prompt += `\n\nOutput preparation requirement: Place the subject on a perfectly flat solid #ff00ff magenta chroma-key background. The background must have no texture, gradient, shadow, floor, reflection, or lighting variation. Do not use magenta anywhere in the subject. Keep crisp edges and generous padding.`;
}

const request = {
  model: MODEL,
  prompt,
  resolution: '2K',
  aspect_ratio: options.aspect,
};
if (references.length > 0) request.input_references = references.map(referencePayload);

let response;
try {
  response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nikosk.github.io/games/',
      'X-OpenRouter-Title': 'Nikosk Games',
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(300_000),
  });
} catch (error) {
  fail(`OpenRouter request failed: ${error instanceof Error ? error.message : String(error)}`);
}

let payload;
try {
  payload = await response.json();
} catch {
  fail(`OpenRouter returned HTTP ${response.status} without JSON`);
}
if (!response.ok) fail(`OpenRouter ${response.status}: ${payload.error?.message ?? 'image generation failed'}`);

const image = payload.data?.[0];
if (typeof image?.b64_json !== 'string') fail('OpenRouter returned no image data');

const sourceExtension = image.media_type === 'image/png' ? '.png' : image.media_type === 'image/webp' ? '.webp' : '.jpg';
const temporaryPath = join(tmpdir(), `game-art-${randomUUID()}${sourceExtension}`);
mkdirSync(dirname(outputPath), { recursive: true });

let completed = false;
try {
  writeFileSync(temporaryPath, Buffer.from(image.b64_json, 'base64'));
  imageInfo(temporaryPath);
  optimize(temporaryPath, outputPath, options);
  const [dimensions, channels, bytes] = imageInfo(outputPath).split('|');
  console.log(JSON.stringify({
    model: MODEL,
    cost: payload.usage?.cost ?? null,
    output: relative(root, outputPath),
    dimensions,
    channels,
    bytes,
  }));
  completed = true;
} finally {
  rmSync(temporaryPath, { force: true });
  if (!completed) rmSync(outputPath, { force: true });
}
