import type { AlaskaFareClass, PartnerFareClass } from '../types';

// Maps a single fare class letter to a cabin type.
// Returns null when the airline is unknown — caller must prompt the user.

export type ResolvedCabin = AlaskaFareClass | PartnerFareClass | 'award';

// ── Alaska Airlines ───────────────────────────────────────────────────────────

const ALASKA_MAP: Record<string, AlaskaFareClass> = {
  X: 'saver',
  M: 'main', L: 'main', V: 'main', S: 'main',
  N: 'main', Q: 'main', O: 'main', G: 'main',
  H: 'main_flexible', K: 'main_flexible',
  Y: 'main_full',     B: 'main_full',
  D: 'first_discount', I: 'first_discount',
  C: 'first_flexible',
  J: 'first_full',
};

// ── Hawaiian Airlines ─────────────────────────────────────────────────────────

const HAWAIIAN_MAP: Record<string, AlaskaFareClass> = {
  U: 'saver',
  N: 'main', M: 'main', I: 'main', H: 'main',
  G: 'main', K: 'main', L: 'main', Z: 'main', O: 'main',
  Q: 'main_flexible', V: 'main_flexible',
  B: 'main_flexible', S: 'main_flexible',
  Y: 'main_full', W: 'main_full',
  C: 'first_discount', A: 'first_discount', D: 'first_discount',
  P: 'first_flexible',
  F: 'first_full', J: 'first_full',
};

// ── American Airlines ─────────────────────────────────────────────────────────

const AA_MAP: Record<string, PartnerFareClass | 'award'> = {
  // First (domestic)
  F: 'domestic_first', A: 'domestic_first',
  // Business (international)
  J: 'business', C: 'business', D: 'business',
  R: 'business', I: 'business', Z: 'business',
  // Premium Economy
  W: 'premium_economy', P: 'premium_economy',
  // Economy (full)
  Y: 'economy', H: 'economy', K: 'economy',
  M: 'economy', L: 'economy', V: 'economy',
  S: 'economy', N: 'economy', Q: 'economy',
  O: 'economy', G: 'economy',
  // Economy (discount / basic)
  B: 'economy_discount', E: 'economy_discount',
  // Award
  T: 'award',
};

// ── British Airways ───────────────────────────────────────────────────────────

const BA_MAP: Record<string, PartnerFareClass | 'award'> = {
  // First
  F: 'first', A: 'first',
  // Business (Club World)
  J: 'business', C: 'business', D: 'business', R: 'business',
  // Premium Economy (World Traveller Plus)
  W: 'premium_economy',
  // Economy (full — World Traveller)
  Y: 'economy', B: 'economy', H: 'economy', K: 'economy',
  M: 'economy', L: 'economy', V: 'economy', S: 'economy', N: 'economy',
  // Economy (discount / sale)
  Q: 'economy_discount', O: 'economy_discount', G: 'economy_discount',
  // Award
  T: 'award', U: 'award', X: 'award',
};

// ── Carrier-code → map lookup ─────────────────────────────────────────────────

type CabinMap = Record<string, AlaskaFareClass | PartnerFareClass | 'award'>;

const CARRIER_MAPS: Record<string, CabinMap> = {
  AS: ALASKA_MAP,
  HA: HAWAIIAN_MAP,
  AA: AA_MAP,
  BA: BA_MAP,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolve a fare class letter to a cabin type for the given carrier.
 *
 * Returns null when:
 *   - the carrier has no known fare-class map (all partners except AA/BA), OR
 *   - the fare letter isn't in the map (unrecognised booking class)
 *
 * Callers should prompt the user for the cabin when this returns null.
 */
export function resolveCabin(
  carrierCode: string,
  fareClassLetter: string,
): ResolvedCabin | null {
  const map = CARRIER_MAPS[carrierCode.toUpperCase()];
  if (!map) return null;
  return map[fareClassLetter.toUpperCase()] ?? null;
}

/**
 * Whether the resolved cabin is an award cabin.
 * Award flights earn 0 redeemable miles (or SP-only formula on spend method).
 */
export function isAwardCabin(cabin: ResolvedCabin): boolean {
  return cabin === 'award';
}
