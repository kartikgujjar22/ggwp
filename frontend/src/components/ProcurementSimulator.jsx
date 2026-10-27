import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from 'recharts';
import {
  ShieldCheck,
  TrendingDown,
  AlertOctagon,
  Sliders,
  DollarSign,
  Zap,
  Info,
} from 'lucide-react';
import { simulateProcurement } from '../api';

export default function ProcurementSimulator({ selectedDate, cutoffHour }) {
  const [baseDemand, setBaseDemand] = useState(32000);
  const [confidenceLevel, setConfidenceLevel] = useState(0.90);
  const [penaltyPrice, setPenaltyPrice] = useState(95);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function runSim() {
      setLoading(true);
      try {
        const res = await simulateProcurement({
          delivery_date: selectedDate,
          cutoff_hour: cutoffHour,
          cutoff_minute: 0,
          base_demand_mw: Number(baseDemand),
          confidence_buffer: Number(confidenceLevel),
          imbalance_penalty_price: Number(penaltyPrice),
        });
        setSimData(res);
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (selectedDate) {
      runSim();
    }
  }, [selectedDate, cutoffHour, baseDemand, confidenceLevel, penaltyPrice]);

  return (
    <div>
      {/* Control Banner for Trader Inputs */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="#8B5CF6" />
              Day-Ahead Power Procurement & Asymmetric Risk Buffer Engine
            </h2>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Simulates procurement orders on D-1 to cover customer demand beyond forecasted wind while hedging against balancing penalties.
            </p>
          </div>

          <div style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            padding: '4px 10px',
            borderRadius: '6px',
            color: '#C084FC'
          }}>
            Strategy: {confidenceLevel >= 0.85 ? 'Conservative (P90)' : (confidenceLevel >= 0.70 ? 'Balanced (P75)' : 'Neutral (P50)')}
          </div>
        </div>

        {/* Sliders Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Base Demand Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#9CA3AF' }}>Utility Consumer Base Demand:</span>
              <span style={{ color: '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                {Number(baseDemand).toLocaleString()} MW
              </span>
            </div>
            <input
              type="range"
              min="20000"
              max="45000"
              step="1000"
              value={baseDemand}
              onChange={(e) => setBaseDemand(e.target.value)}
              style={{ width: '100%', accentColor: '#F59E0B' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
              <span>20 GW (Off-Peak)</span>
              <span>45 GW (High Winter)</span>
            </div>
          </div>

          {/* Confidence Level Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#9CA3AF' }}>Risk Tolerance / Error Buffer:</span>
              <span style={{ color: '#06B6D4', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                {Math.round(confidenceLevel * 100)}% Confidence
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { val: 0.50, label: 'P50 (Raw Forecast)' },
                { val: 0.75, label: 'P75 (Balanced)' },
                { val: 0.90, label: 'P90 (Conservative)' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setConfidenceLevel(opt.val)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    border: confidenceLevel === opt.val ? '1px solid #06B6D4' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: confidenceLevel === opt.val ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: confidenceLevel === opt.val ? '#06B6D4' : '#9CA3AF',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Balancing Mechanism Price */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#9CA3AF' }}>Balancing Cashout Penalty Price:</span>
              <span style={{ color: '#F43F5E', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                £{penaltyPrice}/MWh
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="250"
              step="5"
              value={penaltyPrice}
              onChange={(e) => setPenaltyPrice(e.target.value)}
              style={{ width: '100%', accentColor: '#F43F5E' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
              <span>£50/MWh (Normal)</span>
              <span>£250/MWh (System Stress)</span>
            </div>
          </div>

        </div>
      </div>

      {/* Outcome Cards */}
      {simData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          {/* Net Risk Hedged Savings */}
          <div className="kpi-card" style={{ '--border-color': '#10B981', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div className="kpi-title">
              <span>Net Balancing Risk Avoided</span>
              <ShieldCheck size={18} color="#10B981" />
            </div>
            <div className="kpi-value" style={{ color: '#10B981' }}>
              £{simData.net_risk_savings_gbp.toLocaleString()}
            </div>
            <div className="kpi-subtitle">
              Penalty cost saved by buffering forecast error
            </div>
          </div>

          {/* Unhedged Exposure */}
          <div className="kpi-card" style={{ '--border-color': '#F43F5E' }}>
            <div className="kpi-title">
              <span>Naive Unhedged Penalty Exposure</span>
              <AlertOctagon size={18} color="#F43F5E" />
            </div>
            <div className="kpi-value" style={{ color: '#F43F5E' }}>
              £{simData.total_unhedged_penalty_cost.toLocaleString()}
            </div>
            <div className="kpi-subtitle">
              Cost if buying strictly on raw forecast
            </div>
          </div>

          {/* Buffered Penalty Exposure */}
          <div className="kpi-card" style={{ '--border-color': '#8B5CF6' }}>
            <div className="kpi-title">
              <span>Risk-Adjusted Penalty Exposure</span>
              <DollarSign size={18} color="#8B5CF6" />
            </div>
            <div className="kpi-value" style={{ color: '#8B5CF6' }}>
              £{simData.total_hedged_penalty_cost.toLocaleString()}
            </div>
            <div className="kpi-subtitle">
              Residual exposure after applying safety buffer
            </div>
          </div>

          {/* Recommended Thermal Procurement */}
          <div className="kpi-card" style={{ '--border-color': '#3B82F6' }}>
            <div className="kpi-title">
              <span>Total Thermal Procurement</span>
              <Zap size={18} color="#3B82F6" />
            </div>
            <div className="kpi-value" style={{ color: '#3B82F6' }}>
              {(simData.total_risk_adjusted_thermal_procured_mwh / 1000).toFixed(1)}{' '}
              <span style={{ fontSize: '16px', fontWeight: '400', color: '#9CA3AF' }}>GWh</span>
            </div>
            <div className="kpi-subtitle">
              Includes {((simData.total_risk_adjusted_thermal_procured_mwh - simData.total_unadjusted_thermal_procured_mwh) / 1000).toFixed(1)} GWh reserve buffer
            </div>
          </div>

        </div>
      )}

      {/* Procurement Schedule Chart */}
      {simData && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>
                Hourly Day-Ahead Procurement Schedule (Thermal + Wind Dispatch)
              </h3>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0' }}>
                Visualizes the thermal procurement volume (indigo) required to meet demand above forecasted wind (cyan).
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B' }}>
                <span style={{ width: '12px', height: '3px', background: '#F59E0B' }}></span>
                Customer Demand
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B5CF6' }}>
                <span style={{ width: '12px', height: '12px', background: 'rgba(139, 92, 246, 0.4)', borderRadius: '2px' }}></span>
                Recommended Thermal Buy
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06B6D4' }}>
                <span style={{ width: '12px', height: '3px', background: '#06B6D4', borderStyle: 'dashed' }}></span>
                Forecast Wind
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '380px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={simData.periods} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                
                <XAxis
                  dataKey="settlement_period"
                  stroke="#6B7280"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(sp) => (sp % 4 === 1 ? `SP ${sp}` : '')}
                  label={{ value: 'Settlement Periods (SP 1: 00:00 to SP 48: 24:00)', position: 'insideBottom', offset: -15, fill: '#6B7280', fontSize: 12 }}
                />

                <YAxis
                  stroke="#6B7280"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  label={{ value: 'Power Volume (MW)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 12 }}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          minWidth: '240px',
                          fontSize: '12px'
                        }}>
                          <div style={{ fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
                            SP {d.settlement_period} ({d.time_label})
                          </div>
                          <div style={{ color: '#F59E0B', margin: '3px 0' }}>
                            Customer Demand: <b>{d.customer_demand_mw.toLocaleString()} MW</b>
                          </div>
                          <div style={{ color: '#06B6D4', margin: '3px 0' }}>
                            Forecast Wind: <b>{d.forecast_wind_mw.toLocaleString()} MW</b>
                          </div>
                          <div style={{ color: '#8B5CF6', margin: '3px 0' }}>
                            Recommended Thermal: <b>{d.risk_adjusted_thermal_procurement_mw.toLocaleString()} MW</b>
                          </div>
                          <div style={{ color: '#C084FC', margin: '3px 0' }}>
                            Safety Buffer: <b>+{d.safety_buffer_mw.toLocaleString()} MW</b>
                          </div>
                          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '6px', paddingTop: '4px', color: '#10B981' }}>
                            Estimated Imbalance Hedged: <b>{d.hedged_imbalance_mw.toLocaleString()} MW</b>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <ReferenceArea
                  x1={34}
                  x2={40}
                  fill="rgba(245, 158, 11, 0.06)"
                  stroke="rgba(245, 158, 11, 0.2)"
                  strokeDasharray="3 3"
                />

                {/* Thermal Procurement Area */}
                <Area
                  type="monotone"
                  dataKey="risk_adjusted_thermal_procurement_mw"
                  fill="rgba(139, 92, 246, 0.3)"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Thermal Buy"
                />

                {/* Demand Line */}
                <Line
                  type="monotone"
                  dataKey="customer_demand_mw"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={false}
                  name="Customer Demand"
                />

                {/* Forecast Wind */}
                <Line
                  type="monotone"
                  dataKey="forecast_wind_mw"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Forecast Wind"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Commercial Intelligence Card */}
      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ background: '#06B6D4', padding: '8px', borderRadius: '8px', marginTop: '2px' }}>
            <Info size={20} color="#0B0F19" />
          </div>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>
              Commercial Impact for the Trading Pitch (Video Part 1)
            </h4>
            <p style={{ fontSize: '13px', color: '#D1D5DB', marginTop: '6px', lineHeight: '1.6' }}>
              Utilities face <b>asymmetric financial penalties</b> in the UK Balancing Mechanism. Being short during the evening peak (SP 34–40) can incur punitive cashout prices over £200/MWh. By buffering the day-ahead thermal procurement with our quantified P90 error margin, the trading desk avoids emergency market buys, directly protecting operating margins while satisfying total customer load.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
