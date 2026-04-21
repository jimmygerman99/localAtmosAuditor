import { useState } from 'react';
import type { LoggedFlight, AuditStatus } from '../types';

const STATUS_LABELS: Record<AuditStatus, string> = {
  upcoming: 'Upcoming',
  awaiting_posting: 'Awaiting Posting',
  posted: 'Matched',
  discrepancy: 'Discrepancy',
  claimed: 'Claimed',
};

const STATUS_STYLES: Record<AuditStatus, string> = {
  upcoming: 'bg-gray-100 text-gray-600',
  awaiting_posting: 'bg-amber-100 text-amber-700',
  posted: 'bg-green-100 text-green-700',
  discrepancy: 'bg-red-100 text-red-700',
  claimed: 'bg-indigo-100 text-indigo-700',
};

// Days to wait before filing a claim
const CLAIM_WAIT_DAYS: Record<string, number> = {
  alaska: 7,
  hawaiian: 7,
  partner: 14,
};

function claimEligibleAfter(flight: LoggedFlight): string {
  const d = new Date(flight.date + 'T00:00:00');
  d.setDate(d.getDate() + (CLAIM_WAIT_DAYS[flight.airline] ?? 14));
  return d.toISOString().slice(0, 10);
}

function claimDeadline(flight: LoggedFlight): string {
  const d = new Date(flight.date + 'T00:00:00');
  d.setMonth(d.getMonth() + 12);
  return d.toISOString().slice(0, 10);
}

function fmt(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

interface Props {
  flights: LoggedFlight[];
  onAdd: () => void;
  onImportEmail: () => void;
  onEdit: (f: LoggedFlight) => void;
  onDelete: (id: string) => void;
  onUpdateActual: (id: string, actual: { actualMiles: number | null; actualStatusPoints: number | null }) => void;
  onFileClaim: (f: LoggedFlight) => void;
}

export function FlightLog({ flights, onAdd, onImportEmail, onEdit, onDelete, onUpdateActual, onFileClaim }: Props) {
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [actualDraft, setActualDraft] = useState({ miles: '', sp: '' });

  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...flights].sort((a, b) => b.date.localeCompare(a.date));

  function startEntering(flight: LoggedFlight) {
    setEnteringId(flight.id);
    setActualDraft({
      miles: flight.actualMiles !== null ? String(flight.actualMiles) : '',
      sp: flight.actualStatusPoints !== null ? String(flight.actualStatusPoints) : '',
    });
  }

  function saveActual(id: string) {
    const actualMiles = actualDraft.miles === '' ? null : Number(actualDraft.miles);
    const actualStatusPoints = actualDraft.sp === '' ? null : Number(actualDraft.sp);
    onUpdateActual(id, { actualMiles, actualStatusPoints });
    setEnteringId(null);
  }

  function airlinePrefix(flight: LoggedFlight) {
    if (flight.airline === 'alaska') return 'AS';
    if (flight.airline === 'hawaiian') return 'HA';
    return flight.operatingCarrier || 'Partner';
  }

  if (flights.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-400 mb-4">No flights logged yet.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onImportEmail}
            className="px-5 py-2.5 text-sm font-semibold border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            Import from Email
          </button>
          <button
            onClick={onAdd}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
          >
            Log Manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Flight Log</h2>
        <div className="flex gap-2">
          <button
            onClick={onImportEmail}
            className="px-4 py-2 text-sm font-semibold border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            Import from Email
          </button>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
          >
            + Add Flight
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map(flight => {
          const eligibleDate = claimEligibleAfter(flight);
          const deadlineDate = claimDeadline(flight);
          const canClaim = today >= eligibleDate;
          const pastDeadline = today > deadlineDate;

          return (
            <div key={flight.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-500">{fmt(flight.date)}</span>
                  <span className="font-semibold text-gray-900">
                    {airlinePrefix(flight)} {flight.flightNumber}
                  </span>
                  <span className="text-gray-700">{flight.origin} → {flight.destination}</span>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[flight.status]}`}>
                  {STATUS_LABELS[flight.status]}
                </span>
              </div>

              <div className="px-5 py-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500 mb-3">
                  <span>{flight.fareClass.replace(/_/g, ' ')}</span>
                  {flight.airline === 'partner' && (
                    <span>via {flight.bookingChannel === 'atmos' ? 'Atmos' : 'partner site'}</span>
                  )}
                  {flight.bookingReference && <span>Ref: {flight.bookingReference}</span>}
                  {flight.ticketNumber && <span>Ticket: {flight.ticketNumber}</span>}
                  {!flight.bookedWithPoints && flight.ticketPrice > 0 && (
                    <span>${flight.ticketPrice.toFixed(2)}</span>
                  )}
                  {flight.bookedWithPoints && <span>Award ticket</span>}
                </div>

                <div className="flex flex-wrap gap-6 mb-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Expected</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {flight.expectedMiles.toLocaleString()} mi · {flight.expectedStatusPoints.toLocaleString()} SP
                    </p>
                  </div>
                  {flight.actualMiles !== null && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Actual</p>
                      <p className={`text-sm font-semibold ${flight.status === 'discrepancy' ? 'text-red-600' : 'text-green-600'}`}>
                        {flight.actualMiles.toLocaleString()} mi · {(flight.actualStatusPoints ?? 0).toLocaleString()} SP
                      </p>
                    </div>
                  )}
                  {flight.status === 'discrepancy' && flight.actualMiles !== null && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Gap</p>
                      <p className="text-sm font-semibold text-red-600">
                        {(flight.actualMiles - flight.expectedMiles > 0 ? '+' : '')}
                        {(flight.actualMiles - flight.expectedMiles).toLocaleString()} mi
                        {' · '}
                        {((flight.actualStatusPoints ?? 0) - flight.expectedStatusPoints > 0 ? '+' : '')}
                        {((flight.actualStatusPoints ?? 0) - flight.expectedStatusPoints).toLocaleString()} SP
                      </p>
                    </div>
                  )}
                </div>

                {/* Awaiting posting hint */}
                {flight.status === 'awaiting_posting' && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                    Miles typically post in 3–7 days (Alaska/Hawaiian) or up to 14 days (partner flights).
                    Check your account then come back to enter actuals.
                  </p>
                )}

                {/* Discrepancy timing warnings */}
                {flight.status === 'discrepancy' && !canClaim && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                    Eligible to file claim on {fmt(eligibleDate)} ({flight.airline === 'partner' ? '14' : '7'}-day waiting period).
                  </p>
                )}
                {flight.status === 'discrepancy' && canClaim && pastDeadline && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                    Claim deadline has passed (12 months from flight date).
                  </p>
                )}
                {flight.status === 'discrepancy' && canClaim && !pastDeadline && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                    Claim deadline: {fmt(deadlineDate)} · Have your boarding pass and passenger receipt ready.
                  </p>
                )}

                {enteringId === flight.id ? (
                  <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-gray-100">
                    <label className="block">
                      <span className="text-xs text-gray-500">Actual Miles</span>
                      <input
                        type="number"
                        min={0}
                        value={actualDraft.miles}
                        onChange={e => setActualDraft(d => ({ ...d, miles: e.target.value }))}
                        className="mt-1 w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-500">Actual Status Pts</span>
                      <input
                        type="number"
                        min={0}
                        value={actualDraft.sp}
                        onChange={e => setActualDraft(d => ({ ...d, sp: e.target.value }))}
                        className="mt-1 w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </label>
                    <button
                      onClick={() => saveActual(flight.id)}
                      className="px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEnteringId(null)}
                      className="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                    {flight.status !== 'upcoming' && (
                      <button
                        onClick={() => startEntering(flight)}
                        className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        {flight.actualMiles !== null ? 'Edit Actual' : 'Enter Actual'}
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(flight)}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    {flight.status === 'discrepancy' && canClaim && !pastDeadline && (
                      <button
                        onClick={() => onFileClaim(flight)}
                        className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                      >
                        File Claim
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(flight.id)}
                      className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
