import { describe, it, expect } from 'vitest';
import { calculateExpected } from '../calculateExpected';
import { haversineDistance } from '../haversine';
import type { FlightEarned, UserConfig } from '../../types';

function makeFlight(overrides: Partial<FlightEarned> = {}): FlightEarned {
  return {
    postingDate:        '2026-03-01',
    flightDate:         null,
    airlineName:        'Alaska Airlines',
    airline:            'alaska',
    carrierCode:        'AS',
    flightNumber:       '100',
    origin:             'SEA',
    destination:        'LAX',
    fareClassLetter:    'M',
    isAwardTravel:      false,
    bookingChannel:     'atmos',
    actualMiles:        0,
    actualStatusPoints: 0,
    ...overrides,
  };
}

const noneConfig: UserConfig = { eliteTier: 'none', earningMethod: 'distance' };

describe('Alaska Airlines — distance method', () => {
  it('M fare, no elite: SP = max(500, dist×1.0), miles = SP', () => {
    const dist = haversineDistance('SEA', 'LAX');
    const { expectedStatusPoints, expectedMiles } = calculateExpected(makeFlight(), noneConfig);
    expect(expectedStatusPoints).toBe(Math.max(500, Math.round(dist * 1.0)));
    expect(expectedMiles).toBe(expectedStatusPoints);
  });

  it('X fare: 30% multiplier, 500pt minimum still applies', () => {
    const dist = haversineDistance('SEA', 'LAX');
    const { expectedStatusPoints, expectedMiles } = calculateExpected(
      makeFlight({ fareClassLetter: 'X' }), noneConfig,
    );
    expect(expectedStatusPoints).toBe(Math.max(500, Math.round(dist * 0.30)));
    expect(expectedMiles).toBe(expectedStatusPoints);
  });

  it('J fare (first_full): 200% multiplier', () => {
    const dist = haversineDistance('SEA', 'LAX');
    const { expectedStatusPoints } = calculateExpected(
      makeFlight({ fareClassLetter: 'J' }), noneConfig,
    );
    expect(expectedStatusPoints).toBe(Math.max(500, Math.round(dist * 2.0)));
  });

  it('Platinum elite doubles miles but NOT status points', () => {
    const dist = haversineDistance('SEA', 'LAX');
    const cfg: UserConfig = { eliteTier: 'platinum', earningMethod: 'distance' };
    const { expectedStatusPoints, expectedMiles } = calculateExpected(makeFlight(), cfg);
    const baseSP = Math.max(500, Math.round(dist * 1.0));
    expect(expectedStatusPoints).toBe(baseSP);
    expect(expectedMiles).toBe(Math.round(baseSP * 2));
  });

  it('award travel: miles = 0, SP calculated normally', () => {
    const dist = haversineDistance('SEA', 'LAX');
    const { expectedMiles, expectedStatusPoints } = calculateExpected(
      makeFlight({ isAwardTravel: true }), noneConfig,
    );
    expect(expectedMiles).toBe(0);
    expect(expectedStatusPoints).toBe(Math.max(500, Math.round(dist * 1.0)));
  });

  it('short route (under 500 mi) still gets 500pt minimum', () => {
    // SEA-PDX is roughly 130 miles → should floor to 500
    const { expectedStatusPoints } = calculateExpected(
      makeFlight({ origin: 'SEA', destination: 'PDX' }), noneConfig,
    );
    expect(expectedStatusPoints).toBe(500);
  });
});

describe('Alaska Airlines — segment method', () => {
  const segCfg: UserConfig = { eliteTier: 'none', earningMethod: 'segment' };

  it('flat 500 SP per segment', () => {
    const { expectedStatusPoints } = calculateExpected(makeFlight(), segCfg);
    expect(expectedStatusPoints).toBe(500);
  });

  it('Platinum: 500 SP, 1000 miles', () => {
    const cfg: UserConfig = { eliteTier: 'platinum', earningMethod: 'segment' };
    const { expectedStatusPoints, expectedMiles } = calculateExpected(makeFlight(), cfg);
    expect(expectedStatusPoints).toBe(500);
    expect(expectedMiles).toBe(1000);
  });

  it('award + segment: 0 miles, 500 SP', () => {
    const { expectedMiles, expectedStatusPoints } = calculateExpected(
      makeFlight({ isAwardTravel: true }), segCfg,
    );
    expect(expectedMiles).toBe(0);
    expect(expectedStatusPoints).toBe(500);
  });
});

describe('Partner airlines — booking channel matters', () => {
  const partnerFlight = (channel: 'atmos' | 'direct') => makeFlight({
    airlineName:     'American Airlines',
    airline:         'partner',
    carrierCode:     'AA',
    fareClassLetter: 'Y',  // economy
    bookingChannel:  channel,
  });

  it('economy direct: 50% multiplier, no minimum', () => {
    const dist = haversineDistance('SEA', 'LAX');
    const { expectedStatusPoints } = calculateExpected(partnerFlight('direct'), noneConfig);
    expect(expectedStatusPoints).toBe(Math.round(dist * 0.50));
  });

  it('economy atmos: 100% multiplier, no minimum', () => {
    const dist = haversineDistance('SEA', 'LAX');
    const { expectedStatusPoints } = calculateExpected(partnerFlight('atmos'), noneConfig);
    expect(expectedStatusPoints).toBe(Math.round(dist * 1.00));
  });

  it('business atmos: 250% multiplier', () => {
    const dist = haversineDistance('JFK', 'LHR');
    const flight = makeFlight({
      airline: 'partner', carrierCode: 'BA', fareClassLetter: 'J',
      origin: 'JFK', destination: 'LHR', bookingChannel: 'atmos',
    });
    const { expectedStatusPoints } = calculateExpected(flight, noneConfig);
    expect(expectedStatusPoints).toBe(Math.round(dist * 2.50));
  });

  it('business direct: 125% multiplier', () => {
    const dist = haversineDistance('JFK', 'LHR');
    const flight = makeFlight({
      airline: 'partner', carrierCode: 'BA', fareClassLetter: 'J',
      origin: 'JFK', destination: 'LHR', bookingChannel: 'direct',
    });
    const { expectedStatusPoints } = calculateExpected(flight, noneConfig);
    expect(expectedStatusPoints).toBe(Math.round(dist * 1.25));
  });

  it('no 500pt minimum for partner flights', () => {
    // short-hop economy direct — well under 500
    const flight = makeFlight({
      airline: 'partner', carrierCode: 'AA', fareClassLetter: 'Y',
      origin: 'SEA', destination: 'PDX', bookingChannel: 'direct',
    });
    const { expectedStatusPoints } = calculateExpected(flight, noneConfig);
    expect(expectedStatusPoints).toBeLessThan(500);
  });

  it('partner-direct falls back to distance for segment method', () => {
    const dist = haversineDistance('SEA', 'LAX');
    const cfg: UserConfig = { eliteTier: 'none', earningMethod: 'segment' };
    const { expectedStatusPoints } = calculateExpected(partnerFlight('direct'), cfg);
    // fallback to distance (50% economy direct), NOT the flat 500
    expect(expectedStatusPoints).toBe(Math.round(dist * 0.50));
    expect(expectedStatusPoints).not.toBe(500);
  });

  it('partner-atmos uses segment method (flat 500)', () => {
    const cfg: UserConfig = { eliteTier: 'none', earningMethod: 'segment' };
    const { expectedStatusPoints } = calculateExpected(partnerFlight('atmos'), cfg);
    expect(expectedStatusPoints).toBe(500);
  });
});

describe('Unknown cabin', () => {
  it('unknown carrier returns zeros and cabinUnknown=null', () => {
    const flight = makeFlight({
      airline: 'partner', carrierCode: 'QR', fareClassLetter: 'J',
      bookingChannel: 'direct',
    });
    const result = calculateExpected(flight, noneConfig);
    expect(result.expectedMiles).toBe(0);
    expect(result.expectedStatusPoints).toBe(0);
    expect(result.resolvedCabin).toBeNull();
  });
});
