import React from 'react';
import { Calendar, Clock, Sparkles, Filter } from 'lucide-react';

const PRESETS = [
  { label: 'High Wind Peak', date: '2026-01-10', desc: 'Over 18 GW generation' },
  { label: 'Cold Snap / Low Wind', date: '2026-01-15', desc: 'Tight margins & high thermal demand' },
  { label: 'Storm Volatility', date: '2026-01-24', desc: 'Rapid forecast ramp event' },
];

export default function ControlBar({
  selectedDate,
  setSelectedDate,
  cutoffHour,
  setCutoffHour,
  availableDates = []
}) {
  // Format the D-1 decision cutoff time
  const dMinus1Date = () => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    return `${d.toISOString().split('T')[0]} ${String(cutoffHour).padStart(2, '0')}:00 GMT`;
  };

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Controls: Date & Gate Closure */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Delivery Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#06B6D4" />
            <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '500' }}>Delivery Day (D):</span>
            <select
              className="custom-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ fontWeight: '600' }}
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} (Jan {parseInt(d.split('-')[2], 10)})
                </option>
              ))}
            </select>
          </div>

          {/* D-1 Gate Closure Cutoff */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#F59E0B" />
            <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '500' }}>D-1 Gate Cutoff:</span>
            <select
              className="custom-select"
              value={cutoffHour}
              onChange={(e) => setCutoffHour(Number(e.target.value))}
              style={{ fontWeight: '600' }}
            >
              <option value={7}>07:00 GMT (Early Morning Run)</option>
              <option value={9}>09:00 GMT (Pre-Auction Update)</option>
              <option value={11}>11:00 GMT (EPEX/Nord Pool Standard Gate)</option>
              <option value={12}>12:00 GMT (Post-Gate Settlement)</option>
              <option value={14}>14:00 GMT (Afternoon Intraday Gate)</option>
              <option value={16}>16:00 GMT (Evening Intraday Run)</option>
            </select>
          </div>

          {/* Active Cutoff Stamp */}
          <div style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#D1D5DB'
          }}>
            <span style={{ color: '#F59E0B' }}>Latest Forecast Prior To:</span> {dMinus1Date()}
          </div>
        </div>

        {/* Quick Scenario Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} color="#A855F7" /> Presets:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.date}
              onClick={() => setSelectedDate(p.date)}
              title={p.desc}
              style={{
                fontSize: '12px',
                padding: '5px 10px',
                borderRadius: '6px',
                background: selectedDate === p.date ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedDate === p.date ? '1px solid #06B6D4' : '1px solid rgba(255, 255, 255, 0.08)',
                color: selectedDate === p.date ? '#06B6D4' : '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
