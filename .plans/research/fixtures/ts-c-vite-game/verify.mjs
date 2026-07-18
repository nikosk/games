import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameId = 'ts-c-vite-proof';
const publicBase = `/games/${gameId}/`;
const fixtureDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(fixtureDir, '../../../..');
const fixtureDist = join(fixtureDir, 'dist');
const viteCli = join(repoRoot, 'thegame/node_modules/vite/bin/vite.js');
const vitePackage = join(repoRoot, 'thegame/node_modules/vite/package.json');
const chromium = process.env.CHROMIUM ?? 'chromium';
const keepOutput = process.env.TS_C_KEEP_OUTPUT === '1';

function runCommand(command, args, options = {}) {
  const { cwd = repoRoot, timeoutMs = 60_000 } = options;

  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.once('error', (error) => {
      clearTimeout(timer);
      rejectCommand(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) {
        rejectCommand(
          new Error(
            `${command} ${args.join(' ')} failed (${timedOut ? 'timeout' : `code=${code}, signal=${signal ?? 'none'}`})\n${stderr}\n${stdout}`,
          ),
        );
        return;
      }
      resolveCommand({ stdout, stderr });
    });
  });
}

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, path)));
    } else if (entry.isFile()) {
      files.push(relative(root, path));
    }
  }

  return files.sort();
}

function contentType(path) {
  return (
    {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
    }[extname(path)] ?? 'application/octet-stream'
  );
}

async function startProjectPathServer(docsRoot) {
  const requests = [];
  const normalizedRoot = `${resolve(docsRoot)}${sep}`;

  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    let status = 500;

    try {
      if (!pathname.startsWith('/games/')) {
        status = 404;
        response.writeHead(status).end('Not found');
        return;
      }

      const relativePath = decodeURIComponent(pathname.slice('/games/'.length));
      let filePath = resolve(docsRoot, relativePath);
      if (filePath !== resolve(docsRoot) && !filePath.startsWith(normalizedRoot)) {
        status = 403;
        response.writeHead(status).end('Forbidden');
        return;
      }

      const fileStats = await stat(filePath);
      if (fileStats.isDirectory()) {
        filePath = join(filePath, 'index.html');
      }

      const body = await readFile(filePath);
      status = 200;
      response.writeHead(status, {
        'content-type': contentType(filePath),
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch (error) {
      status = error?.code === 'ENOENT' ? 404 : 500;
      response.writeHead(status).end(status === 404 ? 'Not found' : 'Server error');
    } finally {
      requests.push({ path: pathname, status });
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine proof server address');
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose()))),
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sandbox = await mkdtemp(join(tmpdir(), 'games-ts-c-'));
  const docsRoot = join(sandbox, 'docs');
  const assembledGame = join(docsRoot, gameId);
  let server;

  try {
    await rm(fixtureDist, { recursive: true, force: true });
    await stat(viteCli);
    assert(
      !resolve(docsRoot).startsWith(`${resolve(repoRoot)}${sep}`),
      'Proof assembly must stay outside the repository root',
    );

    await runCommand(process.execPath, [viteCli, 'build', '--config', join(fixtureDir, 'vite.config.mjs')]);

    const builtIndex = await readFile(join(fixtureDist, 'index.html'), 'utf8');
    assert(builtIndex.includes(publicBase), `Built index does not contain ${publicBase}`);
    assert(!builtIndex.includes('/src/main.ts'), 'Built index leaked the source entry');
    assert(!builtIndex.includes('node_modules'), 'Built index leaked a node_modules reference');

    await cp(fixtureDist, assembledGame, { recursive: true });
    const files = await listFiles(assembledGame);
    assert(files.includes('index.html'), 'Assembled output is missing index.html');
    assert(files.includes('status.json'), 'Assembled output is missing the public status asset');
    assert(files.some((file) => /^assets\/lazy-.*\.js$/.test(file)), 'Dynamic import chunk was not emitted');
    assert(files.some((file) => /^assets\/marker-.*\.svg$/.test(file)), 'Imported SVG was not emitted');
    assert(files.some((file) => /^assets\/grid-.*\.svg$/.test(file)), 'CSS URL SVG was not emitted');

    server = await startProjectPathServer(docsRoot);
    const url = `${server.origin}${publicBase}`;
    const chromiumResult = await runCommand(
      chromium,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${join(sandbox, 'chromium-profile')}`,
        '--virtual-time-budget=5000',
        '--dump-dom',
        url,
      ],
      { timeoutMs: 30_000 },
    );

    assert(/data-proof="pass"/.test(chromiumResult.stdout), `Browser proof did not pass:\n${chromiumResult.stdout}`);
    assert(chromiumResult.stdout.includes('TS-C PASS'), 'Browser did not render the success state');

    const gameRequests = server.requests.filter((request) => request.path.startsWith(publicBase));
    const failedRequests = gameRequests.filter((request) => request.status >= 400);
    assert(failedRequests.length === 0, `Nested-path requests failed: ${JSON.stringify(failedRequests)}`);

    const requestedPaths = new Set(gameRequests.map((request) => request.path));
    const requiredRequests = [
      [publicBase, (path) => path === publicBase],
      ['entry JavaScript', (path) => /^\/games\/ts-c-vite-proof\/assets\/index-.*\.js$/.test(path)],
      ['stylesheet', (path) => /^\/games\/ts-c-vite-proof\/assets\/index-.*\.css$/.test(path)],
      ['dynamic import', (path) => /^\/games\/ts-c-vite-proof\/assets\/lazy-.*\.js$/.test(path)],
      ['imported SVG', (path) => /^\/games\/ts-c-vite-proof\/assets\/marker-.*\.svg$/.test(path)],
      ['CSS URL SVG', (path) => /^\/games\/ts-c-vite-proof\/assets\/grid-.*\.svg$/.test(path)],
      ['public asset', (path) => path === `${publicBase}status.json`],
    ];

    for (const [label, predicate] of requiredRequests) {
      assert([...requestedPaths].some(predicate), `Browser did not request ${label} under ${publicBase}`);
    }

    const [{ version: viteVersion }, chromiumVersion] = await Promise.all([
      readFile(vitePackage, 'utf8').then(JSON.parse),
      runCommand(chromium, ['--version']).then(({ stdout }) => stdout.trim()),
    ]);

    console.log(
      JSON.stringify(
        {
          proof: 'pass',
          viteVersion,
          chromiumVersion,
          sourceOutput: relative(repoRoot, fixtureDist),
          assembledOutput: `docs/${gameId}/ (sandboxed at ${assembledGame})`,
          publicBase,
          testedUrl: url,
          files,
          requests: gameRequests,
          repositoryDocsTargeted: false,
        },
        null,
        2,
      ),
    );
  } finally {
    if (server) {
      await server.close();
    }
    await rm(fixtureDist, { recursive: true, force: true });
    if (!keepOutput) {
      await rm(sandbox, { recursive: true, force: true });
    } else {
      console.error(`TS-C sandbox retained at ${sandbox}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
