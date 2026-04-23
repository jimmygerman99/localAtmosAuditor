import { describe, it, expect } from 'vitest';
import { runAudit } from '../audit';
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
    actualMiles:        954,
    actualStatusPoints: 954,
    ...overrides,
  };
}

const cfg: UserConfig = { eliteTier: 'none', earningMethod: 'distance' };

describe('runAudit — status determination', () => {
  it('exact match → ok', () => {
    const rows = runAudit([makeFlight()], cfg);
    expect(rows[0].status).toBe('ok');
  });

  it('within ±10 tolerance → ok', () => {
    const rows = runAudit([makeFlight({ actualMiles: 960, actualStatusPoints: 960 })], cfg);
    expect(rows[0].status).toBe('ok');
  });

  it('actual < expected by >10 → missing', () => {
    // Give very low actuals vs expected ~954
    const rows = runAudit([makeFlight({ actualMiles: 500, actualStatusPoints: 500 })], cfg);
    expect(rows[0].status).toBe('missing');
  });

  it('actual > expected by >10 → bonus', () => {
    const rows = runAudit([makeFlight({ actualMiles: 2000, actualStatusPoints: 2000 })], cfg);
    expect(rows[0].status).toBe('bonus');
  });

  it('cabinUnknown=true when carrier has no fare map', () => {
    const flight = makeFlight({
      airline: 'partner', carrierCode: 'QR', fareClassLetter: 'J',
      bookingChannel: 'direct', actualMiles: 0, actualStatusPoints: 0,
    });
    const rows = runAudit([flight], cfg);
    expect(rows[0].cabinUnknown).toBe(true);
  });

  it('bookingChannel on row matches the flight', () => {
    const rows = runAudit([makeFlight({ bookingChannel: 'direct' })], cfg);
    expect(rows[0].bookingChannel).toBe('direct');
  });
});

describe('runAudit — per-flight booking channel affects calculation', () => {
  it('same flight booked atmos earns more than direct for partners', () => {
    const base = {
      airlineName: 'American Airlines', airline: 'partner' as const,
      carrierCode: 'AA', fareClassLetter: 'Y',
      actualMiles: 0, actualStatusPoints: 0,
    };
    const [atmosRow] = runAudit([makeFlight({ ...base, bookingChannel: 'atmos' })], cfg);
    const [directRow] = runAudit([makeFlight({ ...base, bookingChannel: 'direct' })], cfg);
    expect(atmosRow.expectedMiles).toBeGreaterThan(directRow.expectedMiles);
  });
});
