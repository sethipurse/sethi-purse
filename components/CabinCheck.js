'use client';
import { useState } from 'react';
import { parseLuggageCm } from '@/lib/luggageSize';
import { CABIN_WEIGHT_NOTE } from '@/lib/constants';

// All four currently allow the same cabin gauge — kept as a simple editable
// table (not hardcoded per-chip) so a future airline-specific limit is a
// one-line change.
const AIRLINES = [
  { name: 'IndiGo', limitCm: 55, limitKg: 7 },
  { name: 'Air India', limitCm: 55, limitKg: 7 },
  { name: 'SpiceJet', limitCm: 55, limitKg: 7 },
  { name: 'Akasa', limitCm: 55, limitKg: 7 },
];

const HUMAN_CM = 170;

function CabinDiagram({ bagCm, fits }) {
  const baseline = 172;
  const gaugeCm = 55;
  const gaugeH = gaugeCm;
  const bagH = Math.min(bagCm, 170);
  const gaugeW = 42;
  const bagW = gaugeW * 0.86;
  const humanH = HUMAN_CM;

  return (
    <svg viewBox="0 0 220 190" width="140" height="122" style={{ flexShrink: 0 }} aria-hidden="true">
      <line x1="4" y1={baseline} x2="216" y2={baseline} stroke="#ede8df" strokeWidth="2" />

      {/* Cabin gauge box — fixed 55 cm reference */}
      <rect x="18" y={baseline - gaugeH} width={gaugeW} height={gaugeH} rx="4"
        fill="none" stroke="#e8d5a3" strokeWidth="2" strokeDasharray="4 3" />
      <text x={18 + gaugeW / 2} y={baseline - gaugeH - 6} textAnchor="middle" fontSize="9" fill="#8a7060">55 cm</text>

      {/* The bag, scaled to the parsed cm value */}
      <rect x={18 + (gaugeW - bagW) / 2} y={baseline - bagH} width={bagW} height={bagH} rx="6"
        fill={fits ? '#c9a84c' : '#e0a94a'} opacity="0.9" />

      {/* Human silhouette (~170 cm) for real-world scale */}
      <g transform="translate(150, 0)">
        <circle cx="18" cy={baseline - humanH + humanH * 0.07} r={humanH * 0.065} fill="#c9b8a3" />
        <path
          d={`M ${18 - humanH * 0.11} ${baseline - humanH + humanH * 0.16}
              Q 18 ${baseline - humanH + humanH * 0.12} ${18 + humanH * 0.11} ${baseline - humanH + humanH * 0.16}
              L ${18 + humanH * 0.08} ${baseline}
              L ${18 - humanH * 0.08} ${baseline} Z`}
          fill="#c9b8a3"
        />
      </g>
      <text x="168" y={baseline + 12} textAnchor="middle" fontSize="9" fill="#8a7060">~170 cm</text>
    </svg>
  );
}

export default function CabinCheck({ product, selectedSize }) {
  const [airlineIdx, setAirlineIdx] = useState(0);
  const bagCm = parseLuggageCm(product, selectedSize);
  if (bagCm == null) return null;

  const airline = AIRLINES[airlineIdx];
  const fits = bagCm <= airline.limitCm;

  return (
    <div className="mt-4 rounded-lg border border-[#ede8df] bg-white p-4">
      <p className="text-sm font-bold text-[#2c1f14]">✈️ Flight Mein Chalega?</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {AIRLINES.map((a, i) => (
          <button key={a.name} type="button" onClick={() => setAirlineIdx(i)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${i === airlineIdx ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] text-[#6b5544] hover:border-[#c9a84c]'}`}>
            {a.name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <CabinDiagram bagCm={bagCm} fits={fits} />
        <div className="min-w-0 flex-1">
          {fits ? (
            <p className="text-sm font-bold text-green-700">✅ Cabin mein fit — {airline.name} approved size</p>
          ) : (
            <p className="text-sm font-bold text-[#a07a28]">🧳 Check-in bag — flight mein jaayega, seat ke upar nahi</p>
          )}
          <p className="mt-1.5 text-xs text-[#8a7060]">{CABIN_WEIGHT_NOTE}</p>
        </div>
      </div>
    </div>
  );
}
