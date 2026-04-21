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

export type FareClass = AlaskaFareClass | PartnerFareClass;
export type Airline = 'alaska' | 'hawaiian' | 'partner';
export type BookingChannel = 'atmos' | 'partner';
export type EliteTier = 'none' | 'silver' | 'gold' | 'platinum' | 'titanium';
export type EarningMethod2026 = 'distance' | 'spend' | 'segment';
export type AuditStatus = 'upcoming' | 'awaiting_posting' | 'posted' | 'discrepancy' | 'claimed';

export interface LoggedFlight {
  id: string;
  date: string;
  airline: Airline;
  operatingCarrier: string;
  flightNumber: string;
  origin: string;
  destination: string;
  fareClass: FareClass;
  bookingChannel: BookingChannel;
  ticketPrice: number;
  bookedWithPoints: boolean;
  pointsRedeemed: number;
  bookingReference: string;
  ticketNumber: string;
  expectedMiles: number;
  expectedStatusPoints: number;
  actualMiles: number | null;
  actualStatusPoints: number | null;
  status: AuditStatus;
}

export interface UserProfile {
  memberNumber: string;
  firstName: string;
  lastName: string;
  eliteStatus: EliteTier;
  earningMethod: EarningMethod2026;
  anthropicApiKey?: string;
}
