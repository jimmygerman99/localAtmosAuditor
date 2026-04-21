import { useState } from 'react';
import { parseAllLegs } from '../utils/parseConfirmationEmail';
import { parseWithAI } from '../utils/parseEmailWithAI';
import type { ParsedFlight } from '../utils/parseConfirmationEmail';

interface Props {
  onImport: (flights: ParsedFlight[]) => void;
  onClose: () => void;
  apiKey?: string;
}

type Step = 'idle' | 'parsing' | 'review' | 'error';

const ACCEPTED_EXTENSIONS = '.eml,.pdf,.txt,.html,.htm';

function flightLabel(p: ParsedFlight): string {
  const prefix = p.airline === 'alaska' ? 'AS'
    : p.airline === 'hawaiian' ? 'HA'
    : p.operatingCarrier?.match(/\b([A-Z]{2,3})\b/)?.[1] ?? (p.operatingCarrier?.split(' ')[0] ?? '??');
  const fn    = p.flightNumber ? ` ${p.flightNumber}` : '';
  const route = p.origin && p.destination ? ` · ${p.origin}→${p.destination}` : '';
  const date  = p.date
    ? ` · ${new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : '';
  return `${prefix}${fn}${route}${date}`;
}

function fieldCount(p: ParsedFlight): number {
  return (Object.keys(p) as (keyof ParsedFlight)[]).filter(k => p[k] !== undefined).length;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function EmailImporter({ onImport, onClose, apiKey }: Props) {
  const [step, setStep]         = useState<Step>('idle');
  const [rawText, setRawText]   = useState('');
  const [legs, setLegs]         = useState<ParsedFlight[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [usedAI, setUsedAI]     = useState(false);
  const [useRegexFallback, setUseRegexFallback] = useState(true);

  async function runAIParse(input: Parameters<typeof parseWithAI>[0]) {
    setStep('parsing');
    try {
      const result = await parseWithAI(input, apiKey!);
      setLegs(result);
      setSelected(new Set(result.map((_, i) => i)));
      setUsedAI(true);
      setStep('review');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  }

  function runRegexParse(text: string) {
    const result = parseAllLegs(text);
    setLegs(result);
    setSelected(new Set(result.map((_, i) => i)));
    setUsedAI(false);
    setStep('review');
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    if (isPDF) {
      if (!apiKey) {
        setErrorMsg('PDF parsing requires an Anthropic API key. Add one in Your Profile.');
        setStep('error');
        return;
      }
      const buf = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);
      await runAIParse({ type: 'pdf', base64, name: file.name });
    } else {
      const text = await file.text();
      setRawText(text);
      if (apiKey && !useRegexFallback) {
        await runAIParse({ type: 'text', content: text });
      } else {
        runRegexParse(text);
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  function handlePasteParse() {
    if (!rawText.trim()) return;
    if (apiKey && !useRegexFallback) {
      void runAIParse({ type: 'text', content: rawText });
    } else {
      runRegexParse(rawText);
    }
  }

  function toggleLeg(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function reset() {
    setStep('idle');
    setFileName(null);
    setLegs([]);
    setSelected(new Set());
    setErrorMsg('');
    setUsedAI(false);
  }

  const selectedLegs = legs.filter((_, i) => selected.has(i));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Import from Email / PDF</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Main input UI */}
        {step === 'idle' && (
          <div className="px-6 py-5 space-y-4">
            {apiKey && !useRegexFallback && (
              <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                AI parsing enabled — any airline, any format, multi-leg itineraries.
              </p>
            )}

            {/* Drop zone */}
            <label
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer
                ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}`}
            >
              <input
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileInput}
                className="hidden"
              />
              <span className="text-3xl">{isDragging ? '📂' : '📎'}</span>
              <p className="text-sm font-medium text-gray-700">
                {isDragging ? 'Drop it!' : 'Drop or click to upload'}
              </p>
              <p className="text-xs text-gray-400">
                {apiKey && !useRegexFallback ? '.eml · .pdf · .txt — any airline, any format' : '.eml · .txt — paste or drop your confirmation email'}
              </p>
            </label>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or paste email text</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Paste your confirmation email here…"
              rows={6}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />

            <div className="flex items-center justify-between">
              <div>
                {apiKey && (
                  <button
                    onClick={() => setUseRegexFallback(v => !v)}
                    className="text-xs text-gray-400 underline hover:text-gray-600"
                  >
                    {useRegexFallback ? 'Use AI parser instead' : 'Use regex parser instead'}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handlePasteParse}
                  disabled={!rawText.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700"
                >
                  Parse Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Parsing spinner */}
        {step === 'parsing' && (
          <div className="px-6 py-12 flex flex-col items-center gap-3 text-gray-500">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">{fileName ? `Parsing ${fileName}…` : 'Parsing…'}</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="px-6 py-5 space-y-4">
            <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-800">
              <p className="font-semibold mb-1">Parse failed</p>
              <p className="font-mono text-xs break-all">{errorMsg}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={reset} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                ← Try again
              </button>
            </div>
          </div>
        )}

        {/* Review */}
        {step === 'review' && legs.length > 0 && (
          <div className="px-6 py-5 space-y-4">
            {fileName && <p className="text-xs text-gray-400 truncate">📎 {fileName}</p>}

            <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800">
              Found {legs.length} flight segment{legs.length > 1 ? 's' : ''}.
              {legs.length > 1 && ' Select the ones you want to log.'}
              {usedAI && <span className="ml-2 text-xs opacity-70">· AI-parsed</span>}
            </div>

            <div className="space-y-2">
              {legs.map((leg, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors
                    ${selected.has(i) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleLeg(i)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{flightLabel(leg)}</p>
                    {(leg.departureTime || leg.arrivalTime) && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {leg.departureTime && <span>Departs {leg.departureTime}</span>}
                        {leg.departureTime && leg.arrivalTime && <span className="mx-1 text-gray-300">·</span>}
                        {leg.arrivalTime && <span>Arrives {leg.arrivalTime}</span>}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {leg.fareClass && (
                        <span className="text-xs text-gray-500">{leg.fareClass.replace(/_/g, ' ')}</span>
                      )}
                      {leg.bookingReference && (
                        <span className="text-xs text-gray-500">Ref: {leg.bookingReference}</span>
                      )}
                      {leg.bookedWithPoints && (
                        <span className="text-xs text-indigo-600">Award · {(leg.pointsRedeemed ?? 0).toLocaleString()} pts</span>
                      )}
                      {!leg.bookedWithPoints && leg.ticketPrice != null && (
                        <span className="text-xs text-gray-500">${leg.ticketPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{fieldCount(leg)} fields extracted</p>
                  </div>
                </label>
              ))}
            </div>

            {legs.length > 1 && (
              <div className="flex gap-2 text-xs">
                <button onClick={() => setSelected(new Set(legs.map((_, i) => i)))} className="text-blue-600 hover:underline">
                  Select all
                </button>
                <span className="text-gray-300">·</span>
                <button onClick={() => setSelected(new Set())} className="text-blue-600 hover:underline">
                  Clear
                </button>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={reset} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                ← Try again
              </button>
              <button
                onClick={() => onImport(selectedLegs)}
                disabled={selectedLegs.length === 0}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700"
              >
                {selectedLegs.length === 1 ? 'Open in Form →' : `Add ${selectedLegs.length} Flights →`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
