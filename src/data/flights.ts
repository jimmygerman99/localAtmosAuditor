import type { AlaskaFareClass, PartnerFareClass, EliteTier } from '../types';

// ── Alaska / Hawaiian fare class multipliers ──────────────────────────────────

export const ALASKA_FARE_MULTIPLIER: Record<AlaskaFareClass, number> = {
  saver: 0.30,          // X fare — Saver / Basic Economy
  main: 1.00,           // most economy fares
  main_flexible: 1.25,  // H, K fares
  main_full: 1.50,      // Y, B fares (full-fare economy)
  first_discount: 1.50, // D, I fares (upgrade/discount first)
  first_flexible: 1.75, // C fare
  first_full: 2.00,     // J fare (full-fare first)
};

export const ALASKA_FARE_LABELS: Record<AlaskaFareClass, string> = {
  saver: 'Saver / Basic Economy — X (30%)',
  main: 'Main Cabin — M, L, V, S, N, Q, O, G (100%)',
  main_flexible: 'Main Cabin Flexible — H, K (125%)',
  main_full: 'Main Cabin Full Fare — Y, B (150%)',
  first_discount: 'First Class Discount — D, I (150%)',
  first_flexible: 'First Class Flexible — C (175%)',
  first_full: 'First Class Full Fare — J (200%)',
};

// ── Hawaiian Airlines fare class multipliers ──────────────────────────────────
// Same earning percentages as Alaska, different letter codes

export const HAWAIIAN_FARE_MULTIPLIER: Record<AlaskaFareClass, number> = {
  saver: 0.30,          // U fare
  main: 1.00,           // N, M, I, H, G, K, L, Z, O
  main_flexible: 1.25,  // Q, V, B, S
  main_full: 1.50,      // Y, W
  first_discount: 1.50, // C, A, D
  first_flexible: 1.75, // P
  first_full: 2.00,     // F, J
};

export const HAWAIIAN_FARE_LABELS: Record<AlaskaFareClass, string> = {
  saver: 'Saver — U (30%)',
  main: 'Main Cabin — N, M, I, H, G, K, L, Z, O (100%)',
  main_flexible: 'Main Flexible — Q, V, B, S (125%)',
  main_full: 'Main Full — Y, W (150%)',
  first_discount: 'First Discount — C, A, D (150%)',
  first_flexible: 'First Flexible — P (175%)',
  first_full: 'First — F, J (200%)',
};

// ── Partner airline fare class multipliers ────────────────────────────────────

/** Booked directly on the partner airline's website */
export const PARTNER_DIRECT_MULTIPLIER: Record<PartnerFareClass, number> = {
  economy_discount: 0.25,
  economy: 0.50,
  premium_economy: 1.00,
  business: 1.25,
  domestic_first: 1.50,
  first: 1.50,
};

/** Booked through alaskaair.com / Atmos */
export const PARTNER_ATMOS_MULTIPLIER: Record<PartnerFareClass, number> = {
  economy_discount: 1.00,  // 100% via Atmos
  economy: 1.00,
  premium_economy: 1.50,
  business: 2.50,          // 250% international business
  domestic_first: 1.50,    // 150% domestic first
  first: 3.50,             // 350% international first
};

export const PARTNER_FARE_LABELS: Record<PartnerFareClass, string> = {
  economy_discount: 'Discount Economy',
  economy: 'Economy',
  premium_economy: 'Premium Economy',
  business: 'Business Class',
  domestic_first: 'Domestic First Class',
  first: 'International First Class',
};

// ── Elite tier bonuses ────────────────────────────────────────────────────────

export const ELITE_BONUS: Record<EliteTier, number> = {
  none: 0,
  silver: 0.25,
  gold: 0.50,
  platinum: 1.00,
  titanium: 1.50,
};

export const ELITE_LABELS: Record<EliteTier, string> = {
  none: 'No Status',
  silver: 'Silver (+25%)',
  gold: 'Gold (+50%)',
  platinum: 'Platinum (+100%)',
  titanium: 'Titanium (+150%)',
};

export const MIN_FLIGHT_POINTS = 500;

// ── 2026 earning method rates ─────────────────────────────────────────────────

/** Distance method: 1 pt per mile, no fare-class bonus, no minimum */
export const EARNING_2026_DISTANCE_RATE = 1;

/** Spend method: 5 pts per $1 of ticket price */
export const EARNING_2026_SPEND_RATE = 5;

/** Segment method: flat 500 pts per flight segment */
export const EARNING_2026_SEGMENT_RATE = 500;
