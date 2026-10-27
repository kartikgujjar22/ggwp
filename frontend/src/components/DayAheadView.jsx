import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
} from 'lucide-react';

export default function DayAheadView({ dayData, loading }) {
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, PEAK, OVER, UNDER

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(6, 182, 212, 0.2)', borderTopColor: '#06B6D4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <p style={{ marginTop: '16px', color: '#9CA3AF', fontSize: '14px' }}>Loading Day-Ahead Market Settlement Periods...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!dayData || !dayData.periods) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
        No data available for the selected delivery date.
      </div>
    );
  }

  const { metrics, periods, delivery_date, decision_gate_cutoff } = dayData;

  // Filter periods for the table
  const filteredPeriods = periods.filter((p) => {
    if (filterMode === 'PEAK') return p.settlement_period >= 34 && p.settlement_period <= 40;
    if (filterMode === 'OVER') return p.is_over_forecast;
    if (filterMode === 'UNDER') return !p.is_over_forecast;
    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Settlement Period,Time Window,Actual Generation (MW),Forecast Generation (MW),Error (MW),Abs Error (MW),Error %,Status\n'];
    const rows = periods.map(
      (p) =>
        `${p.settlement_period},"${p.time_label}",${p.actual_generation_mw},${p.forecast_generation_mw},${p.error_mw},${p.abs_error_mw},${p.error_percentage}%,${p.is_over_forecast ? 'Over-Forecast' : 'Under-Forecast'}`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UK_Wind_DayAhead_${delivery_date}.csv`;
    a.click();
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOver = data.error_mw > 0;
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          fontFamily: 'var(--font-sans)',
          minWidth: '220px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
            <span style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>
              SP {data.settlement_period}
            </span>
            <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'var(--font-mono)' }}>
              {data.time_label}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px' }}>
            <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span> Actual Generation:
            </span>
            <span style={{ fontWeight: '600', color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {data.actual_generation_mw.toLocaleString()} MW
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '13px' }}>
            <span style={{ color: '#06B6D4', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06B6D4' }}></span> Day-Ahead Forecast:
            </span>
            <span style={{ fontWeight: '600', color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {data.forecast_generation_mw.toLocaleString()} MW
            </span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '12px'
          }}>
            <span style={{ color: isOver ? '#F43F5E' : '#38BDF8' }}>
              {isOver ? '⚠️ Over-Forecast (Short Risk)' : '✓ Under-Forecast (Spill)'}:
            </span>
            <span style={{ fontWeight: '700', color: isOver ? '#F43F5E' : '#38BDF8', fontFamily: 'var(--font-mono)' }}>
              {isOver ? `+${data.error_mw.toLocaleString()} MW` : `${data.error_mw.toLocaleString()} MW`}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* 4 Top KPI Scorecards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* MAE */}
        <div className="kpi-card" style={{ '--border-color': '#06B6D4' }}>
          <div className="kpi-title">
            <span>Mean Absolute Error (MAE)</span>
            <Activity size={16} color="#06B6D4" />
          </div>
          <div className="kpi-value" style={{ color: '#06B6D4' }}>
            {metrics.mae.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: '400', color: '#9CA3AF' }}>MW</span>
          </div>
          <div className="kpi-subtitle">
            Avg forecast error per half-hour period
          </div>
        </div>

        {/* RMSE */}
        <div className="kpi-card" style={{ '--border-color': '#8B5CF6' }}>
          <div className="kpi-title">
            <span>Root Mean Square Error (RMSE)</span>
            <TrendingUp size={16} color="#8B5CF6" />
          </div>
          <div className="kpi-value" style={{ color: '#8B5CF6' }}>
            {metrics.rmse.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: '400', color: '#9CA3AF' }}>MW</span>
          </div>
          <div className="kpi-subtitle">
            Volatility penalty (Ratio: {(metrics.rmse / (metrics.mae || 1)).toFixed(2)}x)
          </div>
        </div>

        {/* Forecast Bias */}
        <div className="kpi-card" style={{ '--border-color': metrics.bias > 0 ? '#F43F5E' : '#10B981' }}>
          <div className="kpi-title">
            <span>Directional Bias</span>
            {metrics.bias > 0 ? <ArrowUpRight size={16} color="#F43F5E" /> : <ArrowDownRight size={16} color="#10B981" />}
          </div>
          <div className="kpi-value" style={{ color: metrics.bias > 0 ? '#F43F5E' : '#10B981' }}>
            {metrics.bias > 0 ? `+${metrics.bias.toLocaleString()}` : metrics.bias.toLocaleString()}{' '}
            <span style={{ fontSize: '16px', fontWeight: '400', color: '#9CA3AF' }}>MW</span>
          </div>
          <div className="kpi-subtitle">
            {metrics.bias > 0 ? '⚠️ Tendency to over-predict generation' : '✓ Conservative under-prediction tendency'}
          </div>
        </div>

        {/* Energy Output Total */}
        <div className="kpi-card" style={{ '--border-color': '#10B981' }}>
          <div className="kpi-title">
            <span>Total Day Energy (Actuals)</span>
            <Zap size={16} color="#10B981" />
          </div>
          <div className="kpi-value" style={{ color: '#10B981' }}>
            {(metrics.total_actual_mwh / 1000).toFixed(1)}{' '}
            <span style={{ fontSize: '16px', fontWeight: '400', color: '#9CA3AF' }}>GWh</span>
          </div>
          <div className="kpi-subtitle">
            Forecasted: {(metrics.total_forecast_mwh / 1000).toFixed(1)} GWh ({metrics.mape}% MAPE)
          </div>
        </div>

      </div>

      {/* Main Interactive Settlement Period Curve Chart */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>
              Day-Ahead Wind Forecast vs. Actual Generation Profile (48 Settlement Periods)
            </h2>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Decision Cutoff: <span style={{ color: '#F59E0B' }}>{decision_gate_cutoff}</span> • Delivery Date: <span style={{ color: '#fff' }}>{delivery_date}</span>
            </p>
          </div>

          {/* Legend Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
              <span style={{ width: '12px', height: '3px', background: '#10B981', borderRadius: '2px' }}></span>
              Actual Generation (MW)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06B6D4' }}>
              <span style={{ width: '12px', height: '3px', background: '#06B6D4', borderStyle: 'dashed', borderRadius: '2px' }}></span>
              Day-Ahead Forecast (MW)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B' }}>
              <span style={{ width: '10px', height: '10px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B', borderRadius: '2px' }}></span>
              UK Evening Peak (SP 34-40)
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div style={{ width: '100%', height: '380px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={periods} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
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
                label={{ value: 'Generation (MW)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 12 }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Shaded Area for UK Evening Peak (SP 34: 16:30 to SP 40: 20:00) */}
              <ReferenceArea
                x1={34}
                x2={40}
                fill="rgba(245, 158, 11, 0.08)"
                stroke="rgba(245, 158, 11, 0.3)"
                strokeDasharray="3 3"
                label={{ value: 'Evening Peak (16:30-20:00)', fill: '#F59E0B', fontSize: 11, position: 'top' }}
              />

              {/* Actual Line */}
              <Line
                type="monotone"
                dataKey="actual_generation_mw"
                stroke="#10B981"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                name="Actual Wind"
              />

              {/* Day-Ahead Forecast Line */}
              <Line
                type="monotone"
                dataKey="forecast_generation_mw"
                stroke="#06B6D4"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 6, fill: '#06B6D4', stroke: '#fff', strokeWidth: 2 }}
                name="Day-Ahead Forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 48 Settlement Periods Data Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>
              Settlement Period Schedule & Granular Accuracy Breakdown
            </h3>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
              Showing {filteredPeriods.length} of 48 half-hour trading intervals
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              {[
                { id: 'ALL', label: 'All (48)' },
                { id: 'PEAK', label: 'Peak SP 34-40' },
                { id: 'OVER', label: 'Over-Forecast' },
                { id: 'UNDER', label: 'Under-Forecast' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: 'none',
                    background: filterMode === tab.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    color: filterMode === tab.id ? '#06B6D4' : '#9CA3AF',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="data-table-container" style={{ maxHeight: '380px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SP</th>
                <th>Time Window</th>
                <th>Actual (MW)</th>
                <th>Day-Ahead Forecast (MW)</th>
                <th>Error (MW)</th>
                <th>Abs Error</th>
                <th>Error %</th>
                <th>Risk Classification</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeriods.map((p) => {
                const isPeak = p.settlement_period >= 34 && p.settlement_period <= 40;
                return (
                  <tr key={p.settlement_period} style={{ background: isPeak ? 'rgba(245, 158, 11, 0.03)' : 'transparent' }}>
                    <td style={{ fontWeight: '700', color: isPeak ? '#F59E0B' : '#fff' }}>
                      {p.settlement_period} {isPeak && '🔥'}
                    </td>
                    <td>{p.time_label}</td>
                    <td style={{ color: '#10B981', fontWeight: '600' }}>
                      {p.actual_generation_mw.toLocaleString()}
                    </td>
                    <td style={{ color: '#06B6D4', fontWeight: '600' }}>
                      {p.forecast_generation_mw.toLocaleString()}
                    </td>
                    <td style={{ color: p.error_mw > 0 ? '#F43F5E' : '#38BDF8', fontWeight: '600' }}>
                      {p.error_mw > 0 ? `+${p.error_mw.toLocaleString()}` : p.error_mw.toLocaleString()}
                    </td>
                    <td>{p.abs_error_mw.toLocaleString()}</td>
                    <td>{p.error_percentage}%</td>
                    <td>
                      {p.is_over_forecast ? (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.15)', color: '#F43F5E', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                          Over-Forecast (Deficit)
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          Under-Forecast (Surplus)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
