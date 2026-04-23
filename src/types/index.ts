// ── Fare classes (Alaska / Hawaiian) ─────────────────────────────────────────

export type AlaskaFareClass =
  | 'saver'
  | 'main'
  | 'main_flexible'
  | 'main_full'
  | 'first_discount'
  | 'first_flexible'
  | 'first_full';

export type PartnerFareClass =
  | 'economy_discount'
  | 'economy'
  | 'premium_economy'
  | 'business'
  | 'domestic_first'
  | 'first';

// ── Core enums ────────────────────────────────────────────────────────────────

export type EliteTier      = 'none' | 'silver' | 'gold' | 'platinum' | 'titanium';
export type Airline        = 'alaska' | 'hawaiian' | 'partner';
export type BookingChannel = 'atmos' | 'direct';
export type EarningMethod  = 'distance' | 'spend' | 'segment';

// ── Pre-merger cutoff (applies to flight_earned rows only) ───────────────────
// Earned flights posted before this date used pre-merger logic — skip them.
// Redemptions and rollbacks from any date are always included.
export const MIN_EARNED_POSTING_DATE = '2026-01-01';

// ── Row categorisation ────────────────────────────────────────────────────────

export type RowType =
  | 'flight_earned'
  | 'flight_redeemed'
  | 'flight_rollback'
  | 'credit_card'
  | 'dining'
  | 'transfer'
  | 'special_services'
  | 'unknown';

// ── Parsed CSV rows ───────────────────────────────────────────────────────────

export interface RawRow {
  postingDate:  string;   // YYYY-MM-DD
  activity:     string;   // raw Activity field (multi-line joins already applied)
  status:       string;   // 'Credited' | 'Redeemed' | 'Redeposited'
  points:       number;
  bonusPoints:  number;
  totalPoints:  number;
  statusPoints: number;
  type:         RowType;
}

export interface FlightEarned {
  postingDate:        string;        // YYYY-MM-DD — transaction date from CSV
  flightDate:         string | null; // YYYY-MM-DD — user-provided during claim flow
  airlineName:        string;        // e.g. "American Airlines"
  airline:            Airline;
  carrierCode:        string;        // e.g. 'AA', 'LA', 'AS'
  flightNumber:       string;        // digits only e.g. '2331'
  origin:             string;        // IATA
  destination:        string;        // IATA
  fareClassLetter:    string;        // single booking-class letter from CSV
  isAwardTravel:      boolean;       // true when activity contains "AWARD TRAVEL"
  bookingChannel:     BookingChannel; // 'atmos' = booked via Alaska portal, 'direct' = partner's site
  actualMiles:        number;        // Points column from CSV
  actualStatusPoints: number;        // Status Points column from CSV
}

export interface FlightRedeemed {
  postingDate:      string;
  airlineName:      string;
  airline:          Airline;
  carrierCode:      string;
  origin:           string;
  destination:      string;
  confirmationCode: string;
  passengerName:    string;
  pointsRedeemed:   number;  // absolute value (CSV stores as negative)
}

// ── User session config ───────────────────────────────────────────────────────

export interface UserConfig {
  eliteTier:     EliteTier;
  earningMethod: EarningMethod;
  memberNumber?: string;
}

// ── Audit output ──────────────────────────────────────────────────────────────

export type AuditStatus = 'ok' | 'missing' | 'bonus';

export interface AuditRow {
  flight:               FlightEarned;
  resolvedCabin:        AlaskaFareClass | PartnerFareClass | 'award';
  bookingChannel:       BookingChannel;
  distanceMiles:        number;
  expectedMiles:        number;
  expectedStatusPoints: number;
  diffMiles:            number;        // actual − expected (negative = missing)
  diffStatusPoints:     number;
  status:               AuditStatus;
  needsTicketPrice:     boolean;
  cabinUnknown:         boolean;
}
