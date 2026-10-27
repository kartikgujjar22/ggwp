import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceArea,
  Line,
} from 'recharts';
import {
  Calendar,
  Layers,
  BarChart2,
  TrendingUp,
  AlertCircle,
  Wind,
  CheckCircle2,
} from 'lucide-react';

export default function MonthlyMacroView({
  monthlyData,
  onSelectDate,
  selectedDate,
  loading
}) {
  if (loading || !monthlyData) {
    return (
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Loading January 2026 Macro Aggregations...</p>
      </div>
    );
  }

  const {
    overall_mae,
    overall_rmse,
    overall_mape,
    overall_bias,
    total_actual_twh,
    days,
    sp_hourly_profile,
    error_distribution,
  } = monthlyData;

  // Helper to color-code daily MAE in calendar
  const getDayColor = (mae) => {
    if (mae < 1400) return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#34D399', label: 'Accurate' };
    if (mae < 2500) return { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#FBBF24', label: 'Moderate' };
    return { bg: 'rgba(244, 63, 94, 0.15)', border: '#F43F5E', text: '#FB7185', label: 'Volatile' };
  };

  return (
    <div>
      {/* Macro Scorecards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        <div className="kpi-card" style={{ '--border-color': '#06B6D4' }}>
          <div className="kpi-title">
            <span>January 2026 Overall MAE</span>
            <BarChart2 size={16} color="#06B6D4" />
          </div>
          <div className="kpi-value" style={{ color: '#06B6D4' }}>
            {overall_mae.toLocaleString()} <span style={{ fontSize: '16px', color: '#9CA3AF', fontWeight: '400' }}>MW</span>
          </div>
          <div className="kpi-subtitle">
            Across all 1,488 settlement periods
          </div>
        </div>

        <div className="kpi-card" style={{ '--border-color': '#8B5CF6' }}>
          <div className="kpi-title">
            <span>January 2026 Overall RMSE</span>
            <TrendingUp size={16} color="#8B5CF6" />
          </div>
          <div className="kpi-value" style={{ color: '#8B5CF6' }}>
            {overall_rmse.toLocaleString()} <span style={{ fontSize: '16px', color: '#9CA3AF', fontWeight: '400' }}>MW</span>
          </div>
          <div className="kpi-subtitle">
            Volatility penalty factor: {(overall_rmse / overall_mae).toFixed(2)}x
          </div>
        </div>

        <div className="kpi-card" style={{ '--border-color': '#10B981' }}>
          <div className="kpi-title">
            <span>Total UK Wind Output</span>
            <Wind size={16} color="#10B981" />
          </div>
          <div className="kpi-value" style={{ color: '#10B981' }}>
            {total_actual_twh.toFixed(2)} <span style={{ fontSize: '16px', color: '#9CA3AF', fontWeight: '400' }}>TWh</span>
          </div>
          <div className="kpi-subtitle">
            Average Monthly MAPE: {overall_mape}%
          </div>
        </div>

        <div className="kpi-card" style={{ '--border-color': overall_bias > 0 ? '#F43F5E' : '#10B981' }}>
          <div className="kpi-title">
            <span>Monthly Directional Bias</span>
            <AlertCircle size={16} color={overall_bias > 0 ? '#F43F5E' : '#10B981'} />
          </div>
          <div className="kpi-value" style={{ color: overall_bias > 0 ? '#F43F5E' : '#10B981' }}>
            {overall_bias > 0 ? `+${overall_bias}` : overall_bias} <span style={{ fontSize: '16px', color: '#9CA3AF', fontWeight: '400' }}>MW</span>
          </div>
          <div className="kpi-subtitle">
            Net over-forecasting margin across month
          </div>
        </div>

      </div>

      {/* 31-Day January 2026 Calendar Grid */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#06B6D4" />
              January 2026 Daily Forecast Error Heatmap (Click Day to Inspect)
            </h3>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Identifies calm, highly predictable days vs volatile storm events.
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34D399' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10B981' }}></span> Low Error (&lt;1.4 GW)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FBBF24' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#F59E0B' }}></span> Moderate (1.4-2.5 GW)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FB7185' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#F43F5E' }}></span> High Volatility (&gt;2.5 GW)
            </span>
          </div>
        </div>

        {/* 31 Days Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '10px'
        }}>
          {days.map((day) => {
            const dayNum = parseInt(day.date.split('-')[2], 10);
            const style = getDayColor(day.mae);
            const isSelected = selectedDate === day.date;

            return (
              <div
                key={day.date}
                onClick={() => onSelectDate(day.date)}
                style={{
                  background: isSelected ? 'rgba(6, 182, 212, 0.25)' : style.bg,
                  border: isSelected ? '2px solid #06B6D4' : `1px solid ${style.border}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: '#fff' }}>
                    Jan {dayNum}
                  </span>
                  {isSelected && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06B6D4' }}></span>
                  )}
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: '600', color: style.text }}>
                  {day.mae.toLocaleString()} MW
                </div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
                  {style.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Intraday 48-SP Profile & Error Distribution Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        
        {/* SP Profile Chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '0 0 4px' }}>
            Intraday Error Profile Across 48 Settlement Periods
          </h3>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 16px' }}>
            Average MAE (MW) by half-hour of the day. Notice the peak vulnerability in SP 34–40.
          </p>

          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sp_hourly_profile} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey="settlement_period"
                  stroke="#6B7280"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(sp) => (sp % 6 === 1 ? `SP ${sp}` : '')}
                />
                <YAxis
                  stroke="#6B7280"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#0F172A', padding: '10px', borderRadius: '6px', border: '1px solid #334155', fontSize: '12px' }}>
                          <div style={{ fontWeight: '700', color: '#fff' }}>SP {d.settlement_period} ({d.time_label})</div>
                          <div style={{ color: '#06B6D4' }}>Avg MAE: {d.avg_mae} MW</div>
                          <div style={{ color: '#8B5CF6' }}>Avg RMSE: {d.avg_rmse} MW</div>
                          {d.is_peak_period && <div style={{ color: '#F59E0B', fontWeight: '600' }}>⚠️ UK Evening Peak Window</div>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceArea x1={34} x2={40} fill="rgba(245, 158, 11, 0.1)" stroke="rgba(245, 158, 11, 0.4)" strokeDasharray="2 2" />
                <Bar dataKey="avg_mae" fill="#06B6D4" radius={[3, 3, 0, 0]}>
                  {sp_hourly_profile.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.is_peak_period ? '#F59E0B' : '#06B6D4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Distribution Histogram */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '0 0 4px' }}>
            Forecast Error Distribution & Skewness
          </h3>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 16px' }}>
            Frequency of error ranges across all 1,488 settlement periods in January 2026.
          </p>

          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={error_distribution} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis type="number" stroke="#6B7280" tick={{ fontSize: 10, fill: '#9CA3AF' }} unit="%" />
                <YAxis
                  dataKey="bin_range"
                  type="category"
                  stroke="#6B7280"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  width={140}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#0F172A', padding: '10px', borderRadius: '6px', border: '1px solid #334155', fontSize: '12px' }}>
                          <div style={{ fontWeight: '700', color: '#fff' }}>{d.bin_range}</div>
                          <div style={{ color: '#06B6D4' }}>Periods: {d.count} ({d.percentage}%)</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="percentage" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                  {error_distribution.map((entry, idx) => {
                    let color = '#3B82F6';
                    if (entry.bin_range.includes('Accurate')) color = '#10B981';
                    if (entry.bin_range.includes('Over')) color = '#F43F5E';
                    if (entry.bin_range.includes('Under')) color = '#06B6D4';
                    return <Cell key={`dist-${idx}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
