import type { LoggedFlight, UserProfile } from '../types';

// Verify this URL before shipping — navigate to alaskaair.com > Mileage Plan > Request Credit if broken
const ALASKA_MISSING_MILES_URL =
  'https://www.alaskaair.com/atmosrewards/content/earn-points/request-credit';

const WAIT_DAYS: Record<string, number> = { alaska: 7, hawaiian: 7, partner: 14 };

interface Props {
  flight: LoggedFlight;
  profile: UserProfile;
  onClose: () => void;
  onMarkClaimed: () => void;
}

export function MissingMilesHelper({ flight, profile, onClose, onMarkClaimed }: Props) {
  const missingMiles = (flight.actualMiles ?? 0) - flight.expectedMiles;
  const missingSP = (flight.actualStatusPoints ?? 0) - flight.expectedStatusPoints;

  const fmt = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

  const eligibleDate = (() => {
    const d = new Date(flight.date + 'T00:00:00');
    d.setDate(d.getDate() + (WAIT_DAYS[flight.airline] ?? 14));
    return d.toISOString().slice(0, 10);
  })();

  const deadlineDate = (() => {
    const d = new Date(flight.date + 'T00:00:00');
    d.setMonth(d.getMonth() + 12);
    return d.toISOString().slice(0, 10);
  })();

  const airlineName =
    flight.airline === 'partner'
      ? (flight.operatingCarrier || 'Partner airline')
      : flight.airline === 'alaska'
        ? 'Alaska Airlines'
        : 'Hawaiian Airlines';

  const rows: [string, string][] = [
    ['Member Name', `${profile.firstName} ${profile.lastName}`.trim() || '—'],
    ['Mileage Plan #', profile.memberNumber || '—'],
    ['Flight Date', fmt(flight.date)],
    ['Airline', airlineName],
    ['Flight Number', flight.flightNumber],
    ['Origin', flight.origin],
    ['Destination', flight.destination],
    ['Booking Reference', flight.bookingReference || '—'],
    ['Ticket Number', flight.ticketNumber || '—'],
    ['Expected Miles', flight.expectedMiles.toLocaleString()],
    ['Actual Miles Posted', (flight.actualMiles ?? 0).toLocaleString()],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">File Missing Miles Claim</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Discrepancy summary */}
          <div className="bg-red-50 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-red-800 mb-1">Discrepancy</p>
            <p className="text-sm text-red-700">
              <span className="font-bold">{Math.abs(missingMiles).toLocaleString()} miles</span>
              {missingSP !== 0 && <span> · {Math.abs(missingSP).toLocaleString()} status points</span>}
              {missingMiles < 0 ? ' under-posted' : ' over-posted'}
            </p>
          </div>

          {/* Timing info */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Eligible to claim:</span>{' '}
              {fmt(eligibleDate)}
              {' '}({WAIT_DAYS[flight.airline] ?? 14}-day waiting period)
            </p>
            <p>
              <span className="font-medium">Claim deadline:</span>{' '}
              {fmt(deadlineDate)} (12 months from flight date)
            </p>
          </div>

          {/* Boarding pass reminder */}
          <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
            <p className="font-medium mb-1">Before you submit, have these ready:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700">
              <li>Boarding pass (paper or screenshot)</li>
              <li>Passenger receipt / e-ticket confirmation</li>
            </ul>
          </div>

          <p className="text-sm text-gray-600">
            Use the information below when filling out Alaska's missing miles request form.
          </p>

          {/* Claim info table */}
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
            {rows.map(([label, val]) => (
              <div key={label} className="flex px-4 py-2.5">
                <span className="w-44 text-gray-500 shrink-0">{label}</span>
                <span className="font-medium text-gray-900">{val}</span>
              </div>
            ))}
          </div>

          <a
            href={ALASKA_MISSING_MILES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 text-sm"
          >
            Open Alaska Request Credit Form ↗
          </a>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={onMarkClaimed}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Mark as Claimed
          </button>
        </div>
      </div>
    </div>
  );
}
