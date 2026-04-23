import { describe, it, expect } from 'vitest';
import { resolveCabin } from '../../data/fareClassMap';

describe('resolveCabin — Alaska Airlines (AS)', () => {
  it('K → main_flexible', () => expect(resolveCabin('AS', 'K')).toBe('main_flexible'));
  it('X → saver',         () => expect(resolveCabin('AS', 'X')).toBe('saver'));
  it('M → main',          () => expect(resolveCabin('AS', 'M')).toBe('main'));
  it('Y → main_full',     () => expect(resolveCabin('AS', 'Y')).toBe('main_full'));
  it('J → first_full',    () => expect(resolveCabin('AS', 'J')).toBe('first_full'));
  it('C → first_flexible',() => expect(resolveCabin('AS', 'C')).toBe('first_flexible'));
  it('I → first_discount',() => expect(resolveCabin('AS', 'I')).toBe('first_discount'));
  it('unknown letter → null', () => expect(resolveCabin('AS', 'Z')).toBeNull());
});

describe('resolveCabin — Hawaiian Airlines (HA)', () => {
  it('U → saver',         () => expect(resolveCabin('HA', 'U')).toBe('saver'));
  it('N → main',          () => expect(resolveCabin('HA', 'N')).toBe('main'));
  it('Q → main_flexible', () => expect(resolveCabin('HA', 'Q')).toBe('main_flexible'));
  it('F → first_full',    () => expect(resolveCabin('HA', 'F')).toBe('first_full'));
});

describe('resolveCabin — American Airlines (AA)', () => {
  it('J → business',          () => expect(resolveCabin('AA', 'J')).toBe('business'));
  it('W → premium_economy',   () => expect(resolveCabin('AA', 'W')).toBe('premium_economy'));
  it('Y → economy',           () => expect(resolveCabin('AA', 'Y')).toBe('economy'));
  it('B → economy_discount',  () => expect(resolveCabin('AA', 'B')).toBe('economy_discount'));
  it('F → domestic_first',    () => expect(resolveCabin('AA', 'F')).toBe('domestic_first'));
  it('T → award',             () => expect(resolveCabin('AA', 'T')).toBe('award'));
});

describe('resolveCabin — British Airways (BA)', () => {
  it('J → business',          () => expect(resolveCabin('BA', 'J')).toBe('business'));
  it('W → premium_economy',   () => expect(resolveCabin('BA', 'W')).toBe('premium_economy'));
  it('Y → economy',           () => expect(resolveCabin('BA', 'Y')).toBe('economy'));
  it('Q → economy_discount',  () => expect(resolveCabin('BA', 'Q')).toBe('economy_discount'));
  it('F → first',             () => expect(resolveCabin('BA', 'F')).toBe('first'));
  it('T → award',             () => expect(resolveCabin('BA', 'T')).toBe('award'));
  it('X → award',             () => expect(resolveCabin('BA', 'X')).toBe('award'));
});

describe('resolveCabin — unknown carrier', () => {
  it('QR with any letter → null', () => expect(resolveCabin('QR', 'J')).toBeNull());
  it('KE with any letter → null', () => expect(resolveCabin('KE', 'Y')).toBeNull());
  it('lowercase carrier handled', () => expect(resolveCabin('as', 'M')).toBe('main'));
  it('lowercase letter handled',  () => expect(resolveCabin('AS', 'm')).toBe('main'));
});
