import React from 'react';
import { Wind, ShieldAlert, LineChart, BarChart3, Sliders, Zap } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            <Wind size={24} color="#0B0F19" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0, color: '#fff' }}>
                AERO-GRID <span style={{ color: '#06B6D4' }}>UK</span>
              </h1>
              <span className="pulse-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span className="pulse-dot" style={{ background: '#10B981' }}></span>
                D-1 AUCTION DESK
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
              UK Day-Ahead Electricity Market • Elexon BMRS Verified (<span style={{ color: '#38BDF8' }}>FUELHH</span> & <span style={{ color: '#34D399' }}>WINDFOR</span>)
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.25)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button
            className={`nav-tab-btn ${activeTab === 'day' ? 'active' : ''}`}
            onClick={() => setActiveTab('day')}
          >
            <LineChart size={16} />
            Day-Ahead Forecast & 48 SPs
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'procurement' ? 'active' : ''}`}
            onClick={() => setActiveTab('procurement')}
          >
            <Sliders size={16} />
            Procurement Decision Assistant
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'macro' ? 'active' : ''}`}
            onClick={() => setActiveTab('macro')}
          >
            <BarChart3 size={16} />
            January 2026 Macro Analytics
          </button>
        </nav>
      </div>
    </header>
  );
}
