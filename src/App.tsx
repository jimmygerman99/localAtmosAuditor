import { useState, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { parseCsvActivity } from './utils/parseCsv';
import type { CsvParseResult } from './utils/parseCsv';
import { runAudit } from './utils/audit';
import type { AuditRow, EliteTier, EarningMethod, FlightEarned, BookingChannel } from './types';
import { AddFlightForm } from './components/AddFlightForm';
import { EditFlightPanel } from './components/EditFlightPanel';

export default function App() {
  const [eliteTier, setEliteTier]         = useLocalStorage<EliteTier>('atmos_v1_eliteTier', 'none');
  const [earningMethod, setEarningMethod] = useLocalStorage<EarningMethod>('atmos_v1_earningMethod', 'distance');
  const [csvResult, setCsvResult]         = useLocalStorage<CsvParseResult | null>('atmos_v1_csvResult', null);
  const [manualFlights, setManualFlights] = useLocalStorage<FlightEarned[]>('atmos_v1_manualFlights', []);
  const [fileName, setFileName]           = useLocalStorage<string | null>('atmos_v1_fileName', null);
  const [isDragging, setIsDragging]       = useState(false);
  const [inputKey, setInputKey]           = useState(0);
  const [editingIndex, setEditingIndex]   = useState<number | null>(null);

  // Tag every flight with its source bucket and original index before sorting.
  // This survives the sort so remove/update always write to the right place.
  type TaggedFlight = { flight: FlightEarned; source: 'csv' | 'manual'; idx: number };

  const taggedFlights = useMemo<TaggedFlight[]>(() => {
    const csv    = (csvResult?.earned ?? []).map((f, i) => ({ flight: f, source: 'csv'    as const, idx: i }));
    const manual = manualFlights.map((f, i)              => ({ flight: f, source: 'manual' as const, idx: i }));
    return [...csv, ...manual].sort((a, b) => {
      const da = a.flight.flightDate ?? a.flight.postingDate;
      const db = b.flight.flightDate ?? b.flight.postingDate;
      return db.localeCompare(da);
    });
  }, [csvResult, manualFlights]);

  const allEarned  = useMemo(() => taggedFlights.map(t => t.flight), [taggedFlights]);
  const hasAnyData = csvResult !== null || manualFlights.length > 0;

  const auditRows = useMemo<AuditRow[]>(() => {
    if (!hasAnyData) return [];
    return runAudit(allEarned, { eliteTier, earningMethod });
  }, [allEarned, eliteTier, earningMethod, hasAnyData]);

  const missingCount = auditRows.filter(r => r.status === 'missing').length;

  function removeEarnedFlight(index: number) {
    const { source, idx } = taggedFlights[index];
    if (source === 'csv') {
      if (!csvResult) return;
      setCsvResult({ ...csvResult, earned: csvResult.earned.filter((_, i) => i !== idx) });
    } else {
      setManualFlights(manualFlights.filter((_, i) => i !== idx));
    }
    if (editingIndex === index) setEditingIndex(null);
  }

  function removeRedemption(index: number) {
    if (!csvResult) return;
    setCsvResult({ ...csvResult, redeemed: csvResult.redeemed.filter((_, i) => i !== index) });
  }

  function updateEarnedFlight(index: number, updated: FlightEarned) {
    const { source, idx } = taggedFlights[index];
    if (source === 'csv') {
      if (!csvResult) return;
      setCsvResult({ ...csvResult, earned: csvResult.earned.map((f, i) => i === idx ? updated : f) });
    } else {
      setManualFlights(manualFlights.map((f, i) => i === idx ? updated : f));
    }
    setEditingIndex(null);
  }

  function addFlight(flight: FlightEarned) {
    setManualFlights([...manualFlights, flight]);
  }

  function clearCsv() {
    setCsvResult(null);
    setFileName(null);
    setInputKey(k => k + 1);
  }

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) return;
    setFileName(file.name);
    // CSV replaces only the csv bucket — manual flights are untouched
    file.text().then(text => setCsvResult(parseCsvActivity(text)));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Atmos Miles Audit</h1>
            <p className="text-xs text-gray-400 mt-0.5">Alaska / Atmos Rewards points checker</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
            2026 Earning Rules
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Config row */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your Account Settings</p>
          <div className="flex flex-wrap gap-6">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Elite Tier</span>
              <select
                value={eliteTier}
                onChange={e => setEliteTier(e.target.value as EliteTier)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="none">No Status</option>
                <option value="silver">Silver (+25%)</option>
                <option value="gold">Gold (+50%)</option>
                <option value="platinum">Platinum (+100%)</option>
                <option value="titanium">Titanium (+150%)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">2026 Earning Method</span>
              <select
                value={earningMethod}
                onChange={e => setEarningMethod(e.target.value as EarningMethod)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="distance">Distance (miles flown)</option>
                <option value="spend">Spend (5 pts / $1)</option>
                <option value="segment">Segment (500 pts flat)</option>
              </select>
            </label>
          </div>
        </div>

        {/* CSV Upload */}
        <div
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
          className={`bg-white rounded-xl border-2 border-dashed transition-colors px-6 py-12 text-center
            ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <div className="text-4xl mb-3">{isDragging ? '📂' : '📊'}</div>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {isDragging ? 'Drop your CSV here' : 'Drop your Atmos activity CSV here'}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Download from alaskaair.com → Atmos Rewards → Activity
          </p>
          <label className="inline-block cursor-pointer px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <input key={inputKey} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            Choose File
          </label>
        </div>

        {/* Manual flight entry */}
        <AddFlightForm onAdd={addFlight} />

        {/* Results */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Flight Audit Results</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{fileName ?? 'No CSV loaded'}</span>
              {csvResult && (
                <button
                  onClick={clearCsv}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete CSV
                </button>
              )}
            </div>
          </div>

          {!hasAnyData ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">Upload a CSV or add a flight manually to see your audit.</p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">

              {/* Summary counts */}
              <div className="flex gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{allEarned.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Earned flights</p>
                </div>
                {missingCount > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{missingCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Missing points</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{csvResult?.redeemed.length ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Redemptions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">{csvResult?.skipped ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Skipped</p>
                </div>
                {(csvResult?.unknown.length ?? 0) > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">{csvResult!.unknown.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Unknown rows</p>
                  </div>
                )}
              </div>

              {/* Audit table */}
              {auditRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Earned Flights</p>
                  {auditRows.map((row, i) => (
                    <div key={i}>
                      <AuditFlightRow
                        row={row}
                        isEditing={editingIndex === i}
                        onEdit={() => setEditingIndex(editingIndex === i ? null : i)}
                        onRemove={() => removeEarnedFlight(i)}
                        onChannelChange={ch => updateEarnedFlight(i, { ...row.flight, bookingChannel: ch })}
                      />
                      {editingIndex === i && (
                        <EditFlightPanel
                          flight={row.flight}
                          onSave={updated => updateEarnedFlight(i, updated)}
                          onCancel={() => setEditingIndex(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Redemptions list */}
              {(csvResult?.redeemed.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Redemptions</p>
                  {csvResult!.redeemed.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 group">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{r.carrierCode}</span>
                        <span className="text-sm text-gray-500 ml-2">{r.origin} → {r.destination}</span>
                        <span className="text-xs text-gray-400 ml-2">{r.confirmationCode}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Posted {r.postingDate}</p>
                          <p className="text-xs text-indigo-500">{r.pointsRedeemed.toLocaleString()} pts redeemed</p>
                        </div>
                        <button
                          onClick={() => removeRedemption(i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

// ── Audit flight row component ─────────────────────────────────────────────────

function statusConfig(row: AuditRow) {
  if (row.cabinUnknown)          return { border: 'border-amber-200', badge: 'bg-amber-50 text-amber-600', label: '? Cabin unknown' };
  if (row.needsTicketPrice)      return { border: 'border-gray-200',  badge: 'bg-gray-50 text-gray-500',   label: '$ Needs price' };
  if (row.status === 'ok')       return { border: 'border-green-200', badge: 'bg-green-50 text-green-600', label: '✓ OK' };
  if (row.status === 'bonus')    return { border: 'border-blue-200',  badge: 'bg-blue-50 text-blue-600',   label: '↑ Bonus' };
  /* missing */                  return { border: 'border-red-200',   badge: 'bg-red-50 text-red-600',     label: '⚠ Missing' };
}

function diffLabel(diff: number) {
  if (diff === 0) return null;
  return diff > 0
    ? <span className="text-green-600">+{diff.toLocaleString()}</span>
    : <span className="text-red-500">{diff.toLocaleString()}</span>;
}

function AuditFlightRow({ row, isEditing, onEdit, onRemove, onChannelChange }: {
  row: AuditRow; isEditing: boolean; onEdit: () => void; onRemove: () => void;
  onChannelChange: (ch: BookingChannel) => void;
}) {
  const { border, badge, label } = statusConfig(row);
  const { flight: f } = row;

  return (
    <div className={`rounded-lg border ${border} px-4 py-3 group`}>
      <div className="flex items-start justify-between gap-3">

        {/* Left: flight identity */}
        <div className="flex items-start gap-3 min-w-0">
          <span className={`mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
            {label}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{f.carrierCode}{f.flightNumber}</span>
              <span className="text-sm text-gray-500">{f.origin} → {f.destination}</span>
              <span className="text-xs text-gray-400">fare {f.fareClassLetter}</span>
              {f.isAwardTravel && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">Award</span>
              )}
            </div>

            {/* Booking channel toggle — partner flights only */}
            {f.airline === 'partner' && (
              <div className="flex mt-1.5 rounded-full border border-gray-200 overflow-hidden text-xs w-fit">
                <button type="button" onClick={() => onChannelChange('atmos')}
                  className={`px-2.5 py-0.5 transition-colors ${row.bookingChannel === 'atmos' ? 'bg-blue-950 text-white font-medium' : 'text-gray-400 hover:bg-gray-100'}`}>
                  Via Alaska.com
                </button>
                <button type="button" onClick={() => onChannelChange('direct')}
                  className={`px-2.5 py-0.5 transition-colors ${row.bookingChannel !== 'atmos' ? 'bg-blue-950 text-white font-medium' : 'text-gray-400 hover:bg-gray-100'}`}>
                  Via Airline's Site
                </button>
              </div>
            )}

            {/* Expected vs Actual */}
            <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
              <div className="text-gray-400">
                Expected: <span className="text-gray-700 font-medium">{row.expectedMiles.toLocaleString()} mi</span>
                {' · '}
                <span className="text-gray-700 font-medium">{row.expectedStatusPoints.toLocaleString()} SP</span>
              </div>
              <div className="text-gray-400">
                Actual: <span className="text-gray-700 font-medium">{f.actualMiles.toLocaleString()} mi</span>
                {' · '}
                <span className="text-gray-700 font-medium">{f.actualStatusPoints.toLocaleString()} SP</span>
              </div>
              {(row.diffMiles !== 0 || row.diffStatusPoints !== 0) && (
                <div className="col-span-2 text-gray-400">
                  Diff: {diffLabel(row.diffMiles)} mi · {diffLabel(row.diffStatusPoints)} SP
                </div>
              )}
            </div>

            {/* Meta */}
            <p className="mt-1 text-xs text-gray-400">
              Posted {f.postingDate}
              {row.distanceMiles > 0 && <> · {row.distanceMiles.toLocaleString()} mi flown</>}
            </p>
          </div>
        </div>

        {/* Right: edit + remove buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              isEditing
                ? 'border-blue-300 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'
            }`}
          >
            {isEditing ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
