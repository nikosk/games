import markerUrl from './marker.svg';
import './style.css';

const expectedBase = '/games/ts-c-vite-proof/';
const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Missing #app container');
}

async function fetchRequired(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return response;
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => reject(new Error(`Image failed: ${image.src}`)), {
      once: true,
    });
  });
}

function extractCssUrl(backgroundImage: string): string {
  const match = /^url\(["']?(.*?)["']?\)$/.exec(backgroundImage);
  if (!match?.[1]) {
    throw new Error(`Expected CSS background URL, received: ${backgroundImage}`);
  }
  return match[1];
}

async function runProof(): Promise<void> {
  const base = import.meta.env.BASE_URL;
  if (base !== expectedBase) {
    throw new Error(`Expected BASE_URL ${expectedBase}, received ${base}`);
  }

  app.innerHTML = `
    <h1>TS-C Vite Assembly Proof</h1>
    <p id="status">Loading nested-path assets…</p>
    <div class="proof-tile" aria-label="CSS background asset proof"></div>
  `;

  const tile = app.querySelector<HTMLElement>('.proof-tile');
  if (!tile) {
    throw new Error('Missing proof tile');
  }

  const marker = new Image();
  marker.id = 'marker';
  marker.alt = 'Imported SVG asset proof';
  marker.src = markerUrl;
  const markerLoaded = waitForImage(marker);
  app.append(marker);

  const [{ lazyProof }, statusResponse] = await Promise.all([
    import('./lazy.ts'),
    fetchRequired(`${base}status.json`),
    fetchRequired(markerUrl),
    markerLoaded,
  ]);

  const status = (await statusResponse.json()) as { proof?: string };
  const cssAssetUrl = extractCssUrl(getComputedStyle(tile).backgroundImage);
  await fetchRequired(cssAssetUrl);

  if (lazyProof !== 'lazy-ok' || status.proof !== 'status-ok') {
    throw new Error(`Unexpected proof values: lazy=${lazyProof}, status=${status.proof}`);
  }

  document.documentElement.dataset.base = base;
  document.documentElement.dataset.lazy = lazyProof;
  document.documentElement.dataset.status = status.proof;
  document.documentElement.dataset.proof = 'pass';

  const statusElement = document.querySelector<HTMLElement>('#status');
  if (statusElement) {
    statusElement.textContent = 'TS-C PASS';
  }
}

runProof().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  document.documentElement.dataset.proof = 'fail';
  document.documentElement.dataset.error = message;
  app.textContent = `TS-C FAIL: ${message}`;
  console.error(error);
});
