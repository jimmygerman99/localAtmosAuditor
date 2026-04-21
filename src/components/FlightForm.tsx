import { useState } from 'react';
import type { LoggedFlight, Airline, FareClass, BookingChannel, UserProfile } from '../types';
import {
  ALASKA_FARE_LABELS,
  HAWAIIAN_FARE_LABELS,
  PARTNER_FARE_LABELS,
} from '../data/flights';
import { calculateFlightEarnings } from '../utils/calculateEarnings';
import AirportInput from './AirportInput';

type DraftFlight = Omit<LoggedFlight, 'expectedMiles' | 'expectedStatusPoints'>;

const AIRLINE_LABELS: Record<Airline, string> = {
  alaska: 'Alaska Airlines',
  hawaiian: 'Hawaiian Airlines',
  partner: 'Partner / Oneworld',
};

function defaultFareClass(airline: Airline): FareClass {
  return airline === 'partner' ? 'economy' : 'main';
}

interface Props {
  initialFlight: LoggedFlight | null;
  profile: UserProfile;
  onSave: (flight: LoggedFlight) => void;
  onClose: () => void;
}

export function FlightForm({ initialFlight, profile, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<DraftFlight>(() => {
    if (initialFlight) {
      const { expectedMiles: _em, expectedStatusPoints: _esp, ...rest } = initialFlight;
      void _em; void _esp;
      return rest;
    }
    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      airline: 'alaska',
      operatingCarrier: '',
      flightNumber: '',
      origin: '',
      destination: '',
      fareClass: 'main',
      bookingChannel: 'atmos',
      ticketPrice: 0,
      bookedWithPoints: false,
      pointsRedeemed: 0,
      bookingReference: '',
      ticketNumber: '',
      actualMiles: null,
      actualStatusPoints: null,
      status: 'upcoming',
    };
  });

  const earnings = calculateFlightEarnings(draft, profile.eliteStatus, profile.earningMethod);

  function handleAirlineChange(airline: Airline) {
    setDraft(d => ({
      ...d,
      airline,
      fareClass: defaultFareClass(airline),
      bookingChannel: airline === 'partner' ? d.bookingChannel : 'atmos',
    }));
  }

  function handleSave() {
    if (!draft.date || !draft.origin || !draft.destination || !draft.flightNumber) return;
    onSave({ ...draft, expectedMiles: earnings.miles, expectedStatusPoints: earnings.statusPoints });
  }

  const isValid = !!(draft.date && draft.origin && draft.destination && draft.flightNumber);
  const fareOptions = draft.airline === 'partner'
    ? PARTNER_FARE_LABELS
    : draft.airline === 'hawaiian'
      ? HAWAIIAN_FARE_LABELS
      : ALASKA_FARE_LABELS;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialFlight ? 'Edit Flight' : 'Log Flight'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Date *</span>
              <input
                type="date"
                value={draft.date}
                onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Flight # *</span>
              <input
                type="text"
                value={draft.flightNumber}
                onChange={e => setDraft(d => ({ ...d, flightNumber: e.target.value }))}
                placeholder="AS 123"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Airline *</span>
            <select
              value={draft.airline}
              onChange={e => handleAirlineChange(e.target.value as Airline)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(AIRLINE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          {draft.airline === 'partner' && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Operating Carrier</span>
              <input
                type="text"
                value={draft.operatingCarrier}
                onChange={e => setDraft(d => ({ ...d, operatingCarrier: e.target.value }))}
                placeholder="AA, BA, JAL, etc."
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
          )}

          <div className="flex gap-3">
            <AirportInput
              label="Origin *"
              value={draft.origin}
              onChange={v => setDraft(d => ({ ...d, origin: v }))}
            />
            <AirportInput
              label="Destination *"
              value={draft.destination}
              onChange={v => setDraft(d => ({ ...d, destination: v }))}
            />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Fare Class *</span>
            <select
              value={draft.fareClass}
              onChange={e => setDraft(d => ({ ...d, fareClass: e.target.value as FareClass }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(fareOptions).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          {draft.airline === 'partner' && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Booking Channel</span>
              <select
                value={draft.bookingChannel}
                onChange={e => setDraft(d => ({ ...d, bookingChannel: e.target.value as BookingChannel }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="atmos">Via Atmos / alaskaair.com</option>
                <option value="partner">Directly on {draft.operatingCarrier || 'partner airline'}</option>
              </select>
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.bookedWithPoints}
              onChange={e => setDraft(d => ({ ...d, bookedWithPoints: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Award ticket (booked with miles)</span>
          </label>

          {draft.bookedWithPoints ? (
            profile.earningMethod === 'spend' && (
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Miles Redeemed</span>
                <input
                  type="number"
                  min={0}
                  value={draft.pointsRedeemed || ''}
                  onChange={e => setDraft(d => ({ ...d, pointsRedeemed: Number(e.target.value) }))}
                  placeholder="0"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
            )
          ) : (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Ticket Price</span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.ticketPrice || ''}
                  onChange={e => setDraft(d => ({ ...d, ticketPrice: Number(e.target.value) }))}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Booking Ref</span>
              <input
                type="text"
                value={draft.bookingReference}
                onChange={e => setDraft(d => ({ ...d, bookingReference: e.target.value }))}
                placeholder="ABC123"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Ticket #</span>
              <input
                type="text"
                value={draft.ticketNumber}
                onChange={e => setDraft(d => ({ ...d, ticketNumber: e.target.value }))}
                placeholder="027-1234567890"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
          </div>

          <div className="bg-blue-50 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Expected Earnings</p>
            <p className="text-sm text-blue-900">
              <span className="font-semibold">{earnings.miles.toLocaleString()}</span> miles
              &nbsp;·&nbsp;
              <span className="font-semibold">{earnings.statusPoints.toLocaleString()}</span> status points
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700"
          >
            {initialFlight ? 'Save Changes' : 'Log Flight'}
          </button>
        </div>
      </div>
    </div>
  );
}
