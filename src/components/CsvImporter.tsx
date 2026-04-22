import { useState } from 'react';
import type { LoggedFlight, UserProfile } from '../types';
import { parseCsvActivity } from '../utils/parseCsvActivity';
import type { CsvFlightRow, CsvRedemptionRow } from '../utils/parseCsvActivity';
import { calculateFlightEarnings } from '../utils/calculateEarnings';

export interface MatchedUpdate {
  id: string;
  actualMiles: number;
  actualStatusPoints: number;
}

interface Props {
  flights: LoggedFlight[];
  profile: UserProfile;
  onImport: (updates: MatchedUpdate[], newFlights: LoggedFlight[]) => void;
  onClose: () => void;
}

type Step = 'idle' | 'reviewing' | 'error';

interface MatchedRow {
  csvRow: CsvFlightRow;
  existing: LoggedFlight;
  alreadyHasActual: boolean;
}

interface UnmatchedRow {
  csvRow: CsvFlightRow;
}

function earnedLabel(row: CsvFlightRow): string {
  const carrier = row.operatingCarrier.split(' ')[0] ?? '??';
  return `${carrier} ${row.flightNumber} · ${row.origin}→${row.destination} · ${new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function redemptionLabel(row: CsvRedemptionRow): string {
  return `${row.carrierCode} · ${row.origin}→${row.destination} · ${row.confirmationCode}`;
}

function matchToExisting(row: CsvFlightRow, flights: LoggedFlight[]): LoggedFlight | undefined {
  return flights.find(f => {
    if (f.flightNumber !== row.flightNumber) return false;
    return (
      (f.origin === row.origin && f.destination === row.destination) ||
      (f.origin === row.destination && f.destination === row.origin)
    );
  });
}

function csvRowToFlight(row: CsvFlightRow, profile: UserProfile): LoggedFlight {
  const earnings = calculateFlightEarnings(
    {
      airline: row.airline,
      bookingChannel: 'partner',
      fareClass: row.fareClass,
      origin: row.origin,
      destination: row.destination,
      ticketPrice: 0,
      bookedWithPoints: false,
      pointsRedeemed: 0,
    },
    profile.eliteStatus,
    profile.earningMethod,
  );
  const today = new Date().toISOString().slice(0, 10);
  const isPast = row.date < today;
  const actualMiles = row.pointsEarned;
  const actualStatusPoints = row.statusPointsEarned || null;
  const status =
    actualMiles === earnings.miles &&
    (actualStatusPoints === null || actualStatusPoints === earnings.statusPoints)
      ? 'posted'
      : 'discrepancy';
  return {
    id: crypto.randomUUID(),
    date: row.date,
    airline: row.airline,
    operatingCarrier: row.operatingCarrier,
    flightNumber: row.flightNumber,
    origin: row.origin,
    destination: row.destination,
    fareClass: row.fareClass,
    bookingChannel: 'partner',
    ticketPrice: 0,
    bookedWithPoints: false,
    pointsRedeemed: 0,
    bookingReference: '',
    ticketNumber: '',
    expectedMiles: earnings.miles,
    expectedStatusPoints: earnings.statusPoints,
    actualMiles,
    actualStatusPoints,
    status: isPast ? status : 'upcoming',
  };
}

function redemptionRowToFlight(row: CsvRedemptionRow, flightDate: string): LoggedFlight {
  return {
    id: crypto.randomUUID(),
    date: flightDate,
    airline: row.airline,
    operatingCarrier: row.operatingCarrier,
    flightNumber: '',
    origin: row.origin,
    destination: row.destination,
    fareClass: 'economy',
    bookingChannel: 'atmos',
    ticketPrice: 0,
    bookedWithPoints: true,
    pointsRedeemed: row.pointsRedeemed,
    bookingReference: row.confirmationCode,
    ticketNumber: '',
    expectedMiles: 0,
    expectedStatusPoints: Math.floor(row.pointsRedeemed / 20),
    actualMiles: null,
    actualStatusPoints: null,
    status: flightDate < new Date().toISOString().slice(0, 10) ? 'awaiting_posting' : 'upcoming',
  };
}

export function CsvImporter({ flights, profile, onImport, onClose }: Props) {
  const [step, setStep]             = useState<Step>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const [fileName, setFileName]     = useState<string | null>(null);
  const [matched, setMatched]       = useState<MatchedRow[]>([]);
  const [unmatched, setUnmatched]   = useState<UnmatchedRow[]>([]);
  const [redemptions, setRedemptions] = useState<CsvRedemptionRow[]>([]);
  const [selectedMatched, setSelectedMatched]     = useState<Set<number>>(new Set());
  const [selectedUnmatched, setSelectedUnmatched] = useState<Set<number>>(new Set());
  const [selectedRedemptions, setSelectedRedemptions] = useState<Set<number>>(new Set());
  const [redemptionDates, setRedemptionDates] = useState<Record<number, string>>({});

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Please upload a .csv file from alaskaair.com/atmosrewards/account/activity.');
      setStep('error');
      return;
    }
    setFileName(file.name);
    file.text().then(text => {
      const result = parseCsvActivity(text);
      if (result.earned.length === 0 && result.redemptions.length === 0) {
        setErrorMsg('No flight rows found. Make sure this is the Atmos activity CSV and the date range includes flights.');
        setStep('error');
        return;
      }
      const matchedRows: MatchedRow[] = [];
      const unmatchedRows: UnmatchedRow[] = [];
      for (const row of result.earned) {
        const existing = matchToExisting(row, flights);
        if (existing) {
          matchedRows.push({ csvRow: row, existing, alreadyHasActual: existing.actualMiles !== null });
        } else {
          unmatchedRows.push({ csvRow: row });
        }
      }
      setMatched(matchedRows);
      setUnmatched(unmatchedRows);
      setRedemptions(result.redemptions);
      setSelectedMatched(new Set(matchedRows.map((_, i) => i)));
      setSelectedUnmatched(new Set(unmatchedRows.map((_, i) => i)));
      setSelectedRedemptions(new Set());
      setRedemptionDates({});
      setStep('reviewing');
    }).catch(() => {
      setErrorMsg('Could not read the file.');
      setStep('error');
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function toggleMatched(i: number) {
    setSelectedMatched(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function toggleUnmatched(i: number) {
    setSelectedUnmatched(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function toggleRedemption(i: number) {
    if (!redemptionDates[i]) return; // can't select without a date
    setSelectedRedemptions(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function setRedemptionDate(i: number, date: string) {
    setRedemptionDates(prev => ({ ...prev, [i]: date }));
    if (!date) {
      setSelectedRedemptions(prev => { const n = new Set(prev); n.delete(i); return n; });
    } else {
      setSelectedRedemptions(prev => new Set([...prev, i]));
    }
  }

  function alaskaLookupUrl(row: CsvRedemptionRow): string {
    const lastName = encodeURIComponent(profile.lastName || '');
    return `https://www.alaskaair.com/bookings/manage-my-trip?confirmationCode=${row.confirmationCode}&lastName=${lastName}`;
  }

  function handleConfirm() {
    const updates: MatchedUpdate[] = [];
    for (const i of selectedMatched) {
      const { csvRow, existing } = matched[i];
      updates.push({
        id: existing.id,
        actualMiles: csvRow.pointsEarned,
        actualStatusPoints: csvRow.statusPointsEarned,
      });
    }
    const newFlights: LoggedFlight[] = [];
    for (const i of selectedUnmatched) {
      newFlights.push(csvRowToFlight(unmatched[i].csvRow, profile));
    }
    for (const i of selectedRedemptions) {
      const date = redemptionDates[i];
      if (date) newFlights.push(redemptionRowToFlight(redemptions[i], date));
    }
    onImport(updates, newFlights);
  }

  const totalSelected = selectedMatched.size + selectedUnmatched.size + selectedRedemptions.size;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Import Atmos Activity CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {step === 'idle' && (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-500">
              Download your activity CSV from{' '}
              <span className="font-mono text-xs text-gray-700">alaskaair.com → Atmos Rewards → Activity</span>
              {' '}then drop it here.
            </p>
            <label
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer
                ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}`}
            >
              <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
              <span className="text-3xl">{isDragging ? '📂' : '📊'}</span>
              <p className="text-sm font-medium text-gray-700">{isDragging ? 'Drop it!' : 'Drop or click to upload'}</p>
              <p className="text-xs text-gray-400">PointsActivity.csv from Alaska Air</p>
            </label>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="px-6 py-5 space-y-4">
            <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-800">
              <p className="font-semibold mb-1">Could not parse CSV</p>
              <p>{errorMsg}</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep('idle')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">← Try again</button>
            </div>
          </div>
        )}

        {step === 'reviewing' && (
          <div className="px-6 py-5 space-y-5">
            {fileName && <p className="text-xs text-gray-400 truncate">📎 {fileName}</p>}

            {matched.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  Matched to existing flights <span className="font-normal text-gray-400">— will update actual points</span>
                </p>
                {matched.map((r, i) => (
                  <label key={i} className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors
                    ${selectedMatched.has(i) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedMatched.has(i)} onChange={() => toggleMatched(i)} className="mt-0.5 accent-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{earnedLabel(r.csvRow)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.csvRow.pointsEarned.toLocaleString()} pts · fare class {r.csvRow.fareClass.replace(/_/g, ' ')}
                      </p>
                      {r.alreadyHasActual && (
                        <p className="text-xs text-amber-600 mt-0.5">⚠ Actual already entered — will overwrite</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {unmatched.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  New earned flights <span className="font-normal text-gray-400">— not in your log yet</span>
                </p>
                {unmatched.map((r, i) => (
                  <label key={i} className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors
                    ${selectedUnmatched.has(i) ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedUnmatched.has(i)} onChange={() => toggleUnmatched(i)} className="mt-0.5 accent-green-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{earnedLabel(r.csvRow)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.csvRow.pointsEarned.toLocaleString()} pts actual · fare class {r.csvRow.fareClass.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {redemptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  Award redemptions <span className="font-normal text-gray-400">— enter flight date to import</span>
                </p>
                <p className="text-xs text-gray-400">
                  The CSV only shows when points were deducted, not the actual flight date. Look up each booking to find the date.
                </p>
                {redemptions.map((r, i) => (
                  <div key={i} className={`border rounded-xl px-4 py-3 transition-colors
                    ${selectedRedemptions.has(i) ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{redemptionLabel(r)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {r.pointsRedeemed.toLocaleString()} pts redeemed
                          {r.passengerName && ` · ${r.passengerName}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Transaction date: {new Date(r.transactionDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <a
                        href={alaskaLookupUrl(r)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs px-2.5 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                        onClick={e => e.stopPropagation()}
                      >
                        Look up →
                      </a>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <label className="text-xs text-gray-500 shrink-0">Flight date:</label>
                      <input
                        type="date"
                        value={redemptionDates[i] ?? ''}
                        onChange={e => setRedemptionDate(i, e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      {redemptionDates[i] && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRedemptions.has(i)}
                            onChange={() => toggleRedemption(i)}
                            className="accent-indigo-600"
                          />
                          Import
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {matched.length === 0 && unmatched.length === 0 && redemptions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No flight rows found in this CSV.</p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setStep('idle')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
              <button
                onClick={handleConfirm}
                disabled={totalSelected === 0}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700"
              >
                Import {totalSelected} flight{totalSelected !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
