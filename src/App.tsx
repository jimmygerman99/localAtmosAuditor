import { useState } from 'react';
import { parseCsvActivity } from './utils/parseCsv';
import type { CsvParseResult } from './utils/parseCsv';

type EliteTier = 'none' | 'silver' | 'gold' | 'platinum' | 'titanium';
type EarningMethod = 'distance' | 'spend' | 'segment';

export default function App() {
  const [eliteTier, setEliteTier] = useState<EliteTier>('none');
  const [earningMethod, setEarningMethod] = useState<EarningMethod>('distance');
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) return;
    setFileName(file.name);
    file.text().then(text => {
      const result = parseCsvActivity(text);
      setParseResult(result);
      console.log('Parse result:', result);
    });
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
            <input type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            Choose File
          </label>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Flight Audit Results</h2>
            <span className="text-xs text-gray-400">{fileName ?? 'No CSV loaded'}</span>
          </div>

          {!parseResult ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">Upload a CSV to see your flight earnings audit.</p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-4">
              {/* Summary counts */}
              <div className="flex gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{parseResult.earned.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Earned flights</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{parseResult.redeemed.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Redemptions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">{parseResult.skipped}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Skipped</p>
                </div>
                {parseResult.unknown.length > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">{parseResult.unknown.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Unknown rows</p>
                  </div>
                )}
              </div>

              {/* Earned flights list */}
              {parseResult.earned.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Earned Flights</p>
                  {parseResult.earned.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">
                          {f.carrierCode}{f.flightNumber}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">{f.origin} → {f.destination}</span>
                        {f.isAwardTravel && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">Award</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Posted {f.postingDate}</p>
                        <p className="text-xs text-gray-500">
                          {f.actualMiles.toLocaleString()} mi · {f.actualStatusPoints.toLocaleString()} SP · fare {f.fareClassLetter}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Redemptions list */}
              {parseResult.redeemed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Redemptions</p>
                  {parseResult.redeemed.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{r.carrierCode}</span>
                        <span className="text-sm text-gray-500 ml-2">{r.origin} → {r.destination}</span>
                        <span className="text-xs text-gray-400 ml-2">{r.confirmationCode}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Posted {r.postingDate}</p>
                        <p className="text-xs text-indigo-500">{r.pointsRedeemed.toLocaleString()} pts redeemed</p>
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
