import type { FlightEarned, UserConfig, BookingChannel, AlaskaFareClass, PartnerFareClass } from '../types';
import { haversineDistance } from './haversine';
import { resolveCabin } from '../data/fareClassMap';
import type { ResolvedCabin } from '../data/fareClassMap';
import {
  ALASKA_FARE_MULTIPLIER,
  HAWAIIAN_FARE_MULTIPLIER,
  PARTNER_ATMOS_MULTIPLIER,
  PARTNER_DIRECT_MULTIPLIER,
  ELITE_BONUS,
  MIN_FLIGHT_POINTS,
} from '../data/flights';

export interface ExpectedEarnings {
  distanceMiles:        number;
  expectedMiles:        number;
  expectedStatusPoints: number;
  resolvedCabin:        ResolvedCabin | null;
  needsTicketPrice:     boolean;
}

function getMultiplier(
  cabin: AlaskaFareClass | PartnerFareClass,
  airline: FlightEarned['airline'],
  channel: BookingChannel,
): number {
  if (airline === 'alaska')   return ALASKA_FARE_MULTIPLIER[cabin as AlaskaFareClass];
  if (airline === 'hawaiian') return HAWAIIAN_FARE_MULTIPLIER[cabin as AlaskaFareClass];
  const table = channel === 'atmos' ? PARTNER_ATMOS_MULTIPLIER : PARTNER_DIRECT_MULTIPLIER;
  return table[cabin as PartnerFareClass];
}

function distanceCalc(
  flight: FlightEarned,
  cabin: AlaskaFareClass | PartnerFareClass,
  channel: BookingChannel,
  eliteBonus: number,
  isAward: boolean,
): Pick<ExpectedEarnings, 'distanceMiles' | 'expectedMiles' | 'expectedStatusPoints'> {
  const distanceMiles = haversineDistance(flight.origin, flight.destination);
  const multiplier    = getMultiplier(cabin, flight.airline, channel);
  const baseSP        = Math.round(distanceMiles * multiplier);
  const isAlaskaOrHA  = flight.airline === 'alaska' || flight.airline === 'hawaiian';
  const expectedSP    = isAlaskaOrHA ? Math.max(MIN_FLIGHT_POINTS, baseSP) : baseSP;
  const expectedMiles = isAward ? 0 : Math.round(expectedSP * (1 + eliteBonus));
  return { distanceMiles, expectedMiles, expectedStatusPoints: expectedSP };
}

export function calculateExpected(
  flight: FlightEarned,
  config: UserConfig,
  manualCabin?: AlaskaFareClass | PartnerFareClass,
): ExpectedEarnings {
  const eliteBonus      = ELITE_BONUS[config.eliteTier];
  // Defensive: old persisted flights may lack bookingChannel — apply correct default
  const bookingChannel: BookingChannel = flight.bookingChannel ??
    (flight.airline === 'alaska' || flight.airline === 'hawaiian' ? 'atmos' : 'direct');
  const rawCabin        = resolveCabin(flight.carrierCode, flight.fareClassLetter);
  const resolvedCabin: ResolvedCabin | null = rawCabin ?? (manualCabin ?? null);
  const isAward         = flight.isAwardTravel || resolvedCabin === 'award';

  const cabin = resolvedCabin === null || resolvedCabin === 'award'
    ? manualCabin ?? null
    : resolvedCabin as AlaskaFareClass | PartnerFareClass;

  if (cabin === null) {
    return { distanceMiles: 0, expectedMiles: 0, expectedStatusPoints: 0, resolvedCabin, needsTicketPrice: false };
  }

  // Partner-direct always falls back to distance for spend/segment methods
  const useDistanceFallback = bookingChannel === 'direct' && flight.airline === 'partner';

  if (config.earningMethod === 'spend' && !useDistanceFallback) {
    const dist = distanceCalc(flight, cabin, bookingChannel, eliteBonus, isAward);
    return { ...dist, resolvedCabin, needsTicketPrice: !isAward };
  }

  if (config.earningMethod === 'segment' && !useDistanceFallback) {
    const expectedSP    = 500;
    const expectedMiles = isAward ? 0 : Math.round(expectedSP * (1 + eliteBonus));
    const distanceMiles = haversineDistance(flight.origin, flight.destination);
    return { distanceMiles, expectedMiles, expectedStatusPoints: expectedSP, resolvedCabin, needsTicketPrice: false };
  }

  const dist = distanceCalc(flight, cabin, bookingChannel, eliteBonus, isAward);
  return { ...dist, resolvedCabin, needsTicketPrice: false };
}
