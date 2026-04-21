import { useState, useEffect } from 'react';
import type { LoggedFlight, UserProfile } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateFlightEarnings } from './utils/calculateEarnings';
import type { ParsedFlight } from './utils/parseConfirmationEmail';
import { UserSettings } from './components/UserSettings';
import { FlightLog } from './components/FlightLog';
import { FlightForm } from './components/FlightForm';
import { MissingMilesHelper } from './components/MissingMilesHelper';
import { EmailImporter } from './components/EmailImporter';

const DEFAULT_PROFILE: UserProfile = {
  memberNumber: '',
  firstName: '',
  lastName: '',
  eliteStatus: 'none',
  earningMethod: 'distance',
};

export default function App() {
  const [profile, setProfile] = useLocalStorage<UserProfile>('profile', DEFAULT_PROFILE);
  const [flights, setFlights] = useLocalStorage<LoggedFlight[]>('flights', []);
  const [editingFlight, setEditingFlight] = useState<LoggedFlight | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEmailImporter, setShowEmailImporter] = useState(false);
  const [claimFlight, setClaimFlight] = useState<LoggedFlight | null>(null);

  // Auto-advance upcoming flights to awaiting_posting once the flight date has passed
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFlights(prev => prev.map(f =>
      f.status === 'upcoming' && f.date < today
        ? { ...f, status: 'awaiting_posting' }
        : f,
    ));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSaveFlight(flight: LoggedFlight) {
    setFlights(prev => {
      const idx = prev.findIndex(f => f.id === flight.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = flight;
        return next;
      }
      return [...prev, flight];
    });
    setShowForm(false);
    setEditingFlight(null);
  }

  function handleUpdateActual(
    id: string,
    actual: { actualMiles: number | null; actualStatusPoints: number | null },
  ) {
    setFlights(prev => prev.map(f => {
      if (f.id !== id) return f;
      const { actualMiles, actualStatusPoints } = actual;
      const today = new Date().toISOString().slice(0, 10);
      const status =
        actualMiles === null
          ? (f.date >= today ? 'upcoming' : 'awaiting_posting')
          : actualMiles === f.expectedMiles && actualStatusPoints === f.expectedStatusPoints
            ? 'posted'
            : 'discrepancy';
      return { ...f, actualMiles, actualStatusPoints, status };
    }));
  }

  function parsedToFlight(parsed: ParsedFlight): LoggedFlight {
    const earnings = calculateFlightEarnings(
      {
        airline: parsed.airline ?? 'partner',
        bookingChannel: parsed.bookingChannel ?? 'atmos',
        fareClass: parsed.fareClass ?? 'economy',
        origin: parsed.origin ?? '',
        destination: parsed.destination ?? '',
        ticketPrice: parsed.ticketPrice ?? 0,
        bookedWithPoints: parsed.bookedWithPoints ?? false,
        pointsRedeemed: parsed.pointsRedeemed ?? 0,
      },
      profile.eliteStatus,
      profile.earningMethod,
    );
    return {
      id: crypto.randomUUID(),
      date: parsed.date ?? new Date().toISOString().slice(0, 10),
      airline: parsed.airline ?? 'partner',
      operatingCarrier: parsed.operatingCarrier ?? '',
      flightNumber: parsed.flightNumber ?? '',
      origin: parsed.origin ?? '',
      destination: parsed.destination ?? '',
      fareClass: parsed.fareClass ?? 'economy',
      bookingChannel: parsed.bookingChannel ?? 'atmos',
      ticketPrice: parsed.ticketPrice ?? 0,
      bookedWithPoints: parsed.bookedWithPoints ?? false,
      pointsRedeemed: parsed.pointsRedeemed ?? 0,
      bookingReference: parsed.bookingReference ?? '',
      ticketNumber: parsed.ticketNumber ?? '',
      expectedMiles: earnings.miles,
      expectedStatusPoints: earnings.statusPoints,
      actualMiles: null,
      actualStatusPoints: null,
      status: 'upcoming',
    };
  }

  function handleEmailImport(parsedLegs: ParsedFlight[]) {
    // Auto-fill member number from first leg that has one
    const memberNumber = parsedLegs.find(p => p.memberNumber)?.memberNumber;
    if (memberNumber && !profile.memberNumber) {
      setProfile(p => ({ ...p, memberNumber: memberNumber }));
    }

    setShowEmailImporter(false);

    if (parsedLegs.length === 1) {
      // Single leg → open pre-filled form for review
      setEditingFlight(parsedToFlight(parsedLegs[0]));
      setShowForm(true);
    } else {
      // Multiple legs → add all directly, user can edit from the log
      setFlights(prev => [...prev, ...parsedLegs.map(parsedToFlight)]);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Atmos Miles Audit</h1>
      <p className="text-gray-500 mb-6">Track your flights, verify your earnings, and catch missing miles.</p>

      <UserSettings profile={profile} onChange={setProfile} />

      <FlightLog
        flights={flights}
        onAdd={() => { setEditingFlight(null); setShowForm(true); }}
        onImportEmail={() => setShowEmailImporter(true)}
        onEdit={f => { setEditingFlight(f); setShowForm(true); }}
        onDelete={id => setFlights(prev => prev.filter(f => f.id !== id))}
        onUpdateActual={handleUpdateActual}
        onFileClaim={setClaimFlight}
      />

      {showEmailImporter && (
        <EmailImporter
          onImport={handleEmailImport}
          onClose={() => setShowEmailImporter(false)}
        />
      )}

      {showForm && (
        <FlightForm
          initialFlight={editingFlight}
          profile={profile}
          onSave={handleSaveFlight}
          onClose={() => { setShowForm(false); setEditingFlight(null); }}
        />
      )}

      {claimFlight && (
        <MissingMilesHelper
          flight={claimFlight}
          profile={profile}
          onClose={() => setClaimFlight(null)}
          onMarkClaimed={() => {
            setFlights(prev => prev.map(f =>
              f.id === claimFlight.id ? { ...f, status: 'claimed' } : f,
            ));
            setClaimFlight(null);
          }}
        />
      )}
    </div>
  );
}
