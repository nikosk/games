import type { CargoType } from './rules';

export interface PayloadMeta {
  readonly key: CargoType;
  readonly label: string;
  /** Phaser texture key for the cargo sprite; the scene preloads each one. */
  readonly textureKey: string;
  /** Dominant fill colour used on cargo plates, docks, and legend chips. */
  readonly color: number;
  /** Darker accent for borders, shadows, and small details. */
  readonly accent: number;
}

/**
 * Metadata for the three factory cargo types. Each type is unmistakable
 * through a distinct generated prop, glyph, and colour: gears are red,
 * batteries green, circuits blue.
 */
export const PAYLOADS: Readonly<Record<CargoType, PayloadMeta>> = {
  gear: { key: 'gear', label: 'GEAR', textureKey: 'gear-bin', color: 0xe8717a, accent: 0xb5516a },
  battery: { key: 'battery', label: 'BATTERY', textureKey: 'battery-pack', color: 0x6bbf67, accent: 0x4f9e4f },
  circuit: { key: 'circuit', label: 'CIRCUIT', textureKey: 'circuit-crate', color: 0x5aa9e6, accent: 0x3f7fb5 },
};

export function payloadMeta(type: CargoType): PayloadMeta {
  const meta = PAYLOADS[type];
  if (meta === undefined) throw new Error(`Unknown cargo type: ${type}`);
  return meta;
}
