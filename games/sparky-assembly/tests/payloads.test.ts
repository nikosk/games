import { describe, expect, it } from 'vitest';
import { PAYLOADS, payloadMeta } from '../src/game/payloads';

describe('payload metadata', () => {
  it('describes all three cargo types', () => {
    expect(Object.keys(PAYLOADS).sort()).toEqual(['battery', 'circuit', 'gear']);
  });

  it('gives every type a distinct label, colour, and accent', () => {
    const keys = Object.keys(PAYLOADS) as Array<keyof typeof PAYLOADS>;
    const labels = new Set(keys.map((k) => PAYLOADS[k]!.label));
    const colors = new Set(keys.map((k) => PAYLOADS[k]!.color));
    const accents = new Set(keys.map((k) => PAYLOADS[k]!.accent));
    expect(labels.size).toBe(3);
    expect(colors.size).toBe(3);
    expect(accents.size).toBe(3);
  });

  it('looks up metadata by type and rejects unknown types', () => {
    expect(payloadMeta('gear').color).toBe(PAYLOADS.gear.color);
    expect(() => payloadMeta('spring' as never)).toThrow();
  });
});
