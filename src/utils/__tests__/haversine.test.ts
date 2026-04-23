import { describe, it, expect } from 'vitest';
import { haversineDistance } from '../haversine';

describe('haversineDistance', () => {
  it('CLE→DFW is roughly 1,025 mi', () => {
    const d = haversineDistance('CLE', 'DFW');
    expect(d).toBeGreaterThan(1010);
    expect(d).toBeLessThan(1040);
  });

  it('SEA→LAX is roughly 954 mi', () => {
    const d = haversineDistance('SEA', 'LAX');
    expect(d).toBeGreaterThan(940);
    expect(d).toBeLessThan(970);
  });

  it('same airport → 0', () => {
    expect(haversineDistance('JFK', 'JFK')).toBe(0);
  });

  it('unknown IATA → 0', () => {
    expect(haversineDistance('ZZZ', 'LAX')).toBe(0);
    expect(haversineDistance('LAX', 'ZZZ')).toBe(0);
  });

  it('is symmetric', () => {
    expect(haversineDistance('JFK', 'LAX')).toBe(haversineDistance('LAX', 'JFK'));
  });
});
