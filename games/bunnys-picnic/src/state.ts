export const ROOMS = ['garden', 'shed', 'pond', 'nook', 'orchard'] as const;
export type Room = typeof ROOMS[number];
export type Tool = 'plank' | 'net' | 'basket';
export interface Progress {
  version: 1;
  room: Room;
  cloth: boolean;
  plankTaken: boolean;
  netTaken: boolean;
  bridge: boolean;
  leaves: boolean[];
  duck: boolean;
  box: boolean;
  basketPlaced: boolean;
  apples: boolean;
  plates: boolean[];
  served: boolean[];
}
export type Action =
  | { type: 'travel'; room: Room }
  | { type: 'collect'; tool: 'plank' | 'net' }
  | { type: 'cloth' | 'bridge' | 'duck' | 'box' | 'basket' | 'apples' }
  | { type: 'leaf' | 'plate' | 'serve'; index: number };
export const SAVE_KEY = 'bunnys-picnic-v1';
export function freshProgress(): Progress {
  return { version: 1, room: 'garden', cloth: false, plankTaken: false, netTaken: false, bridge: false,
    leaves: [false, false, false], duck: false, box: false, basketPlaced: false, apples: false,
    plates: [false, false, false, false], served: [false, false, false, false] };
}
export const hedgehogReady = (p: Progress): boolean => p.leaves.every(Boolean);
export const friendsReady = (p: Progress): boolean => hedgehogReady(p) && p.duck && p.apples;
export const complete = (p: Progress): boolean => p.served.every(Boolean);
export function inventory(p: Progress): Tool[] {
  const result: Tool[] = [];
  if (p.plankTaken && !p.bridge) result.push('plank');
  if (p.netTaken && !p.duck) result.push('net');
  if (hedgehogReady(p) && !p.basketPlaced && !p.apples) result.push('basket');
  return result;
}
function mark(list: boolean[], index: number): boolean[] | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= list.length || list[index]) return undefined;
  const next = [...list]; next[index] = true; return next;
}
/** Invalid, duplicate, or out-of-order actions never consume an item. */
export function advance(p: Progress, action: Action): Progress {
  if (action.type === 'cloth') return p.room === 'garden' && !p.cloth ? { ...p, cloth: true } : p;
  if (!p.cloth) return p;
  switch (action.type) {
    case 'travel': return ROOMS.includes(action.room) && action.room !== p.room && (p.room === 'garden' || action.room === 'garden') ? { ...p, room: action.room } : p;
    case 'collect': {
      if (p.room !== 'shed') return p;
      const key = action.tool === 'plank' ? 'plankTaken' : 'netTaken';
      return p[key] ? p : { ...p, [key]: true };
    }
    case 'bridge': return p.room === 'nook' && p.plankTaken && !p.bridge ? { ...p, bridge: true } : p;
    case 'leaf': {
      const leaves = mark(p.leaves, action.index);
      return p.room === 'nook' && p.bridge && leaves ? { ...p, leaves } : p;
    }
    case 'duck': return p.room === 'pond' && p.netTaken && !p.duck ? { ...p, duck: true } : p;
    case 'box': return p.room === 'orchard' && !p.box ? { ...p, box: true } : p;
    case 'basket': return p.room === 'orchard' && hedgehogReady(p) && !p.basketPlaced ? { ...p, basketPlaced: true } : p;
    case 'apples': return p.room === 'orchard' && p.box && p.basketPlaced && !p.apples ? { ...p, apples: true } : p;
    case 'plate': {
      const plates = mark(p.plates, action.index);
      return p.room === 'garden' && friendsReady(p) && plates ? { ...p, plates } : p;
    }
    case 'serve': {
      const served = mark(p.served, action.index);
      return p.room === 'garden' && friendsReady(p) && p.plates.every(Boolean) && served ? { ...p, served } : p;
    }
  }
}
export function readProgress(raw: string | null): Progress {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return freshProgress();
    const p = value as Record<string, unknown>;
    if (p.version !== 1 || !ROOMS.includes(p.room as Room)) return freshProgress();
    const next = freshProgress(); next.room = p.room as Room;
    for (const key of ['cloth', 'plankTaken', 'netTaken', 'bridge', 'duck', 'box', 'basketPlaced', 'apples'] as const) {
      if (typeof p[key] !== 'boolean') return freshProgress();
      next[key] = p[key];
    }
    for (const [key, length] of [['leaves', 3], ['plates', 4], ['served', 4]] as const) {
      const list = p[key];
      if (!Array.isArray(list) || list.length !== length || !list.every(item => typeof item === 'boolean')) return freshProgress();
      next[key] = [...list] as boolean[];
    }
    // Reject impossible saves instead of restoring a world with missing tools.
    if ((!next.cloth && (next.room !== 'garden' || next.plankTaken || next.netTaken || next.box)) ||
      (next.bridge && !next.plankTaken) || (next.leaves.some(Boolean) && !next.bridge) ||
      (next.duck && !next.netTaken) || (next.basketPlaced && !hedgehogReady(next)) ||
      (next.apples && (!next.box || !next.basketPlaced)) ||
      (next.plates.some(Boolean) && !friendsReady(next)) ||
      (next.served.some(Boolean) && !next.plates.every(Boolean))) return freshProgress();
    return next;
  } catch { return freshProgress(); }
}
export function loadProgress(): Progress {
  try { return readProgress(localStorage.getItem(SAVE_KEY)); } catch { return freshProgress(); }
}
export function saveProgress(progress: Progress): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
