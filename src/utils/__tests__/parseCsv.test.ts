import { describe, it, expect } from 'vitest';
import { parseCsvActivity } from '../parseCsv';

const HEADER = 'Date,Activity,Status,Points,Bonus Points,Total Points,Status Points';

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join('\n');
}

describe('parseCsvActivity — earned flights', () => {
  it('parses a valid 2026 flight row', () => {
    const text = csv('01/15/2026,"American Airlines  CLE-DFW AA2331 K",Credited,1025,0,1025,1025');
    const result = parseCsvActivity(text);
    expect(result.earned).toHaveLength(1);
    const f = result.earned[0];
    expect(f.airlineName).toBe('American Airlines');
    expect(f.origin).toBe('CLE');
    expect(f.destination).toBe('DFW');
    expect(f.carrierCode).toBe('AA');
    expect(f.flightNumber).toBe('2331');
    expect(f.fareClassLetter).toBe('K');
    expect(f.actualMiles).toBe(1025);
    expect(f.actualStatusPoints).toBe(1025);
    expect(f.isAwardTravel).toBe(false);
    expect(f.bookingChannel).toBe('direct');
  });

  it('Alaska flight gets bookingChannel=atmos', () => {
    const text = csv('01/15/2026,"Alaska Airlines  SEA-LAX AS100 M",Credited,954,0,954,954');
    const { earned } = parseCsvActivity(text);
    expect(earned[0].bookingChannel).toBe('atmos');
    expect(earned[0].airline).toBe('alaska');
  });

  it('Hawaiian flight gets bookingChannel=atmos', () => {
    const text = csv('01/15/2026,"Hawaiian Airlines  HNL-LAX HA1 M",Credited,2500,0,2500,2500');
    const { earned } = parseCsvActivity(text);
    expect(earned[0].bookingChannel).toBe('atmos');
    expect(earned[0].airline).toBe('hawaiian');
  });

  it('pre-2026 earned row is skipped', () => {
    const text = csv('12/20/2025,"Alaska Airlines  SEA-LAX AS100 M",Credited,954,0,954,954');
    const result = parseCsvActivity(text);
    expect(result.earned).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('award travel flag set when activity has AWARD TRAVEL note', () => {
    const text = csv(
      '01/15/2026,"American Airlines  JFK-CLE AA4709 T\nAWARD TRAVEL - STATUS POINTS ONLY",Credited,0,0,0,250',
    );
    const { earned } = parseCsvActivity(text);
    expect(earned[0].isAwardTravel).toBe(true);
    expect(earned[0].fareClassLetter).toBe('T');
  });
});

describe('parseCsvActivity — redeemed flights', () => {
  it('parses a redeemed row', () => {
    const text = csv('03/01/2026,"American Airlines  AA CLE-LGA UAMDAG  James German",Redeemed,-25000,0,-25000,0');
    const result = parseCsvActivity(text);
    expect(result.redeemed).toHaveLength(1);
    const r = result.redeemed[0];
    expect(r.carrierCode).toBe('AA');
    expect(r.origin).toBe('CLE');
    expect(r.destination).toBe('LGA');
    expect(r.confirmationCode).toBe('UAMDAG');
    expect(r.pointsRedeemed).toBe(25000);
  });

  it('pre-2026 redeemed row is still included', () => {
    const text = csv('06/01/2025,"Alaska Airlines  AS SEA-LAX ABCDEF  James German",Redeemed,-30000,0,-30000,0');
    const { redeemed } = parseCsvActivity(text);
    expect(redeemed).toHaveLength(1);
  });
});

describe('parseCsvActivity — other row types', () => {
  it('credit card row is skipped', () => {
    const text = csv('01/15/2026,BARCLAYS CREDIT CARD POINTS,Credited,500,0,500,0');
    const result = parseCsvActivity(text);
    expect(result.earned).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('rollback row is skipped', () => {
    const text = csv('01/15/2026,Rollback - Alaska Airlines SEA-LAX,Credited,954,0,954,954');
    const result = parseCsvActivity(text);
    expect(result.skipped).toBe(1);
  });

  it('unrecognised row goes to unknown', () => {
    const text = csv('01/15/2026,Some Weird Activity That Matches Nothing,Credited,100,0,100,0');
    const { unknown } = parseCsvActivity(text);
    expect(unknown).toHaveLength(1);
  });
});

describe('parseCsvActivity — edge cases', () => {
  it('empty CSV returns empty result', () => {
    const result = parseCsvActivity('');
    expect(result.earned).toHaveLength(0);
    expect(result.redeemed).toHaveLength(0);
  });

  it('header-only CSV returns empty result', () => {
    const result = parseCsvActivity(HEADER);
    expect(result.earned).toHaveLength(0);
  });

  it('multiple rows parsed correctly', () => {
    const text = csv(
      '01/15/2026,"Alaska Airlines  SEA-LAX AS100 M",Credited,954,0,954,954',
      '01/20/2026,"American Airlines  CLE-DFW AA2331 K",Credited,1025,0,1025,1025',
    );
    const { earned } = parseCsvActivity(text);
    expect(earned).toHaveLength(2);
  });
});
