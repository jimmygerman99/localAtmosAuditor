import type { FlightEarned, UserConfig, AuditRow, AuditStatus } from '../types';
import { calculateExpected } from './calculateExpected';

export function runAudit(
  flights: FlightEarned[],
  config: UserConfig,
): AuditRow[] {
  return flights.map(flight => {
    const earnings = calculateExpected(flight, config);

    const diffMiles = flight.actualMiles - earnings.expectedMiles;
    const diffSP    = flight.actualStatusPoints - earnings.expectedStatusPoints;

    const TOLERANCE = 10;
    let status: AuditStatus;
    if (Math.abs(diffMiles) <= TOLERANCE && Math.abs(diffSP) <= TOLERANCE) {
      status = 'ok';
    } else if (diffMiles >= 0 && diffSP >= 0) {
      status = 'bonus';
    } else {
      status = 'missing';
    }

    return {
      flight,
      resolvedCabin:        earnings.resolvedCabin ?? 'economy_discount',
      bookingChannel:       flight.bookingChannel,
      distanceMiles:        earnings.distanceMiles,
      expectedMiles:        earnings.expectedMiles,
      expectedStatusPoints: earnings.expectedStatusPoints,
      diffMiles,
      diffSP,
      diffStatusPoints:     diffSP,
      status,
      needsTicketPrice:     earnings.needsTicketPrice,
      cabinUnknown:         earnings.resolvedCabin === null,
    };
  });
}
