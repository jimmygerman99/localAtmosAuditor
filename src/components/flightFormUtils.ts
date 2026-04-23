import type { FlightEarned, Airline, AlaskaFareClass, PartnerFareClass, BookingChannel } from '../types';
import { AIRLINE_BY_IATA } from '../data/airlines';

// ── Shared types ──────────────────────────────────────────────────────────────

export type BookingType = 'cash' | 'points';

export interface FormState {
  carrierCode:     string;
  flightNumber:    string;
  origin:          string;
  destination:     string;
  bookingType:     BookingType;
  bookingChannel:  BookingChannel;
  fareClass:       string;   // AlaskaFareClass | PartnerFareClass key
  fareClassLetter: string;   // raw letter fallback for unknown carriers
  flightDate:      string;
  actualMiles:     string;
  actualSP:        string;
}

export const EMPTY_FORM: FormState = {
  carrierCode:     '',
  flightNumber:    '',
  origin:          '',
  destination:     '',
  bookingType:     'cash',
  bookingChannel:  'direct',
  fareClass:       'main',
  fareClassLetter: '',
  flightDate:      '',
  actualMiles:     '',
  actualSP:        '',
};

// ── Carrier lookups — sourced from airlines.ts ────────────────────────────────

export function detectAirline(code: string): Airline {
  return AIRLINE_BY_IATA[code.toUpperCase()]?.type ?? 'partner';
}

export function airlineName(code: string): string {
  return AIRLINE_BY_IATA[code.toUpperCase()]?.name ?? code.toUpperCase();
}

// ── Fare class letter ↔ labeled key maps ──────────────────────────────────────

export const ALASKA_CLASS_TO_LETTER: Record<AlaskaFareClass, string> = {
  saver: 'X', main: 'M', main_flexible: 'K', main_full: 'Y',
  first_discount: 'I', first_flexible: 'C', first_full: 'J',
};

export const HAWAIIAN_CLASS_TO_LETTER: Record<AlaskaFareClass, string> = {
  saver: 'U', main: 'N', main_flexible: 'Q', main_full: 'Y',
  first_discount: 'C', first_flexible: 'P', first_full: 'F',
};

export const PARTNER_CLASS_TO_LETTER: Record<PartnerFareClass, string> = {
  economy_discount: 'B', economy: 'Y', premium_economy: 'W',
  business: 'J', domestic_first: 'F', first: 'F',
};

// Reverse maps: letter → labeled key (first match wins)
const ALASKA_LETTER_TO_CLASS: Record<string, AlaskaFareClass> = Object.fromEntries(
  Object.entries(ALASKA_CLASS_TO_LETTER).map(([k, v]) => [v, k as AlaskaFareClass])
);
const HAWAIIAN_LETTER_TO_CLASS: Record<string, AlaskaFareClass> = Object.fromEntries(
  Object.entries(HAWAIIAN_CLASS_TO_LETTER).map(([k, v]) => [v, k as AlaskaFareClass])
);
const PARTNER_LETTER_TO_CLASS: Record<string, PartnerFareClass> = Object.fromEntries(
  Object.entries(PARTNER_CLASS_TO_LETTER).map(([k, v]) => [v, k as PartnerFareClass])
);

// ── Conversion helpers ────────────────────────────────────────────────────────

export function flightToFormState(flight: FlightEarned): FormState {
  const airline = detectAirline(flight.carrierCode);
  const letter  = flight.fareClassLetter.toUpperCase();

  let fareClass = 'main';
  if (airline === 'alaska')   fareClass = ALASKA_LETTER_TO_CLASS[letter]   ?? 'main';
  if (airline === 'hawaiian') fareClass = HAWAIIAN_LETTER_TO_CLASS[letter]  ?? 'main';
  if (airline === 'partner')  fareClass = PARTNER_LETTER_TO_CLASS[letter]   ?? 'economy';

  return {
    carrierCode:     flight.carrierCode,
    flightNumber:    flight.flightNumber,
    origin:          flight.origin,
    destination:     flight.destination,
    bookingType:     flight.isAwardTravel ? 'points' : 'cash',
    bookingChannel:  flight.bookingChannel ??
      (airline === 'alaska' || airline === 'hawaiian' ? 'atmos' : 'direct'),
    fareClass,
    fareClassLetter: letter,
    flightDate:      flight.flightDate ?? '',
    actualMiles:     flight.actualMiles   > 0 ? String(flight.actualMiles)        : '',
    actualSP:        flight.actualStatusPoints > 0 ? String(flight.actualStatusPoints) : '',
  };
}

export function resolveFareLetter(form: FormState, airline: Airline): string {
  if (airline === 'alaska')   return ALASKA_CLASS_TO_LETTER[form.fareClass as AlaskaFareClass]   ?? 'M';
  if (airline === 'hawaiian') return HAWAIIAN_CLASS_TO_LETTER[form.fareClass as AlaskaFareClass] ?? 'N';
  if (airline === 'partner')  return PARTNER_CLASS_TO_LETTER[form.fareClass as PartnerFareClass]  ?? 'Y';
  return form.fareClassLetter.toUpperCase() || 'Y';
}

export function formStateToFlight(form: FormState, original: FlightEarned): FlightEarned {
  const carrierUpper = form.carrierCode.toUpperCase();
  const airline      = detectAirline(carrierUpper);
  const today        = new Date().toISOString().slice(0, 10);
  return {
    ...original,
    carrierCode:        carrierUpper,
    flightNumber:       form.flightNumber.trim(),
    airlineName:        airlineName(carrierUpper) || original.airlineName,
    airline,
    origin:             form.origin,
    destination:        form.destination,
    fareClassLetter:    resolveFareLetter(form, airline),
    isAwardTravel:      form.bookingType === 'points',
    bookingChannel:     airline === 'alaska' || airline === 'hawaiian' ? 'atmos' : form.bookingChannel,
    flightDate:         form.flightDate || null,
    postingDate:        form.flightDate || original.postingDate || today,
    actualMiles:        parseInt(form.actualMiles) || 0,
    actualStatusPoints: parseInt(form.actualSP)    || 0,
  };
}
