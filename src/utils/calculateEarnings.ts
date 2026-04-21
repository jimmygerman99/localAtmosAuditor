import type { FareClass, AlaskaFareClass, PartnerFareClass, Airline, BookingChannel, EliteTier, EarningMethod2026 } from '../types';
import {
  ALASKA_FARE_MULTIPLIER,
  HAWAIIAN_FARE_MULTIPLIER,
  PARTNER_ATMOS_MULTIPLIER,
  PARTNER_DIRECT_MULTIPLIER,
  ELITE_BONUS,
  MIN_FLIGHT_POINTS,
  EARNING_2026_SPEND_RATE,
  EARNING_2026_SEGMENT_RATE,
} from '../data/flights';
import { haversineDistance } from './haversine';

export interface FlightEarnings {
  miles: number;
  statusPoints: number;
}

export interface FlightInput {
  airline: Airline;
  bookingChannel: BookingChannel;
  fareClass: FareClass;
  origin: string;
  destination: string;
  ticketPrice: number;
  bookedWithPoints: boolean;
  pointsRedeemed: number;
}

export function calculateFlightEarnings(
  flight: FlightInput,
  elite: EliteTier,
  method: EarningMethod2026,
): FlightEarnings {
  const empty: FlightEarnings = { miles: 0, statusPoints: 0 };
  const eliteBonus = ELITE_BONUS[elite] ?? 0;

  if (method === 'spend') {
    if (flight.airline === 'partner' && flight.bookingChannel === 'partner') {
      if (!flight.origin || !flight.destination) return empty;
      const dist = haversineDistance(flight.origin, flight.destination);
      if (!dist) return empty;
      const base = dist * (PARTNER_DIRECT_MULTIPLIER[flight.fareClass as PartnerFareClass] ?? 0.5);
      const miles = flight.bookedWithPoints ? 0 : Math.round(base * (1 + eliteBonus));
      return { miles, statusPoints: Math.round(base) };
    }
    if (flight.bookedWithPoints) {
      return { miles: 0, statusPoints: Math.floor((flight.pointsRedeemed || 0) / 20) };
    }
    if (!flight.ticketPrice) return empty;
    const base = flight.ticketPrice * EARNING_2026_SPEND_RATE;
    const miles = Math.round(base * (1 + eliteBonus));
    return { miles, statusPoints: Math.round(base) };
  }

  if (method === 'segment' && !(flight.airline === 'partner' && flight.bookingChannel === 'partner')) {
    const base = EARNING_2026_SEGMENT_RATE;
    const miles = flight.bookedWithPoints ? 0 : Math.round(base * (1 + eliteBonus));
    return { miles, statusPoints: Math.round(base) };
  }

  if (!flight.origin || !flight.destination) return empty;
  const dist = haversineDistance(flight.origin, flight.destination);
  if (!dist) return empty;

  if (flight.airline === 'partner') {
    const map = flight.bookingChannel === 'atmos' ? PARTNER_ATMOS_MULTIPLIER : PARTNER_DIRECT_MULTIPLIER;
    const base = dist * (map[flight.fareClass as PartnerFareClass] ?? 0.5);
    const miles = flight.bookedWithPoints ? 0 : Math.round(base * (1 + eliteBonus));
    return { miles, statusPoints: Math.round(base) };
  }

  const multiplierMap = flight.airline === 'hawaiian' ? HAWAIIAN_FARE_MULTIPLIER : ALASKA_FARE_MULTIPLIER;
  const multiplier = multiplierMap[flight.fareClass as AlaskaFareClass] ?? 1.0;
  const base = Math.max(dist, MIN_FLIGHT_POINTS) * multiplier;
  const miles = flight.bookedWithPoints ? 0 : Math.round(base * (1 + eliteBonus));
  return { miles, statusPoints: Math.round(base) };
}
