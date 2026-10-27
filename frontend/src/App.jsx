import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ControlBar from './components/ControlBar';
import DayAheadView from './components/DayAheadView';
import ProcurementSimulator from './components/ProcurementSimulator';
import MonthlyMacroView from './components/MonthlyMacroView';
import { fetchDays, fetchDayData, fetchMonthlySummary } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('day'); // 'day' | 'procurement' | 'macro'
  const [selectedDate, setSelectedDate] = useState('2026-01-15'); // Default to middle of Jan
  const [cutoffHour, setCutoffHour] = useState(11); // Default 11:00 GMT on D-1
  const [availableDates, setAvailableDates] = useState([]);
  const [dayData, setDayData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Initial load: fetch list of days
  useEffect(() => {
    async function loadDaysList() {
      try {
        const days = await fetchDays(cutoffHour);
        const dateStrings = days.map((d) => d.date);
        setAvailableDates(dateStrings);
        if (dateStrings.length && !dateStrings.includes(selectedDate)) {
          setSelectedDate(dateStrings[0]);
        }
      } catch (err) {
        console.error('Error fetching days:', err);
      }
    }
    loadDaysList();
  }, [cutoffHour]);

  // Load single day data whenever date or cutoff changes
  useEffect(() => {
    async function loadDay() {
      if (!selectedDate) return;
      setLoadingDay(true);
      try {
        const res = await fetchDayData(selectedDate, cutoffHour, 0);
        setDayData(res);
      } catch (err) {
        console.error('Error fetching day data:', err);
      } finally {
        setLoadingDay(false);
      }
    }
    loadDay();
  }, [selectedDate, cutoffHour]);

  // Load monthly summary data
  useEffect(() => {
    async function loadMonthly() {
      setLoadingMonthly(true);
      try {
        const res = await fetchMonthlySummary(cutoffHour, 0);
        setMonthlyData(res);
      } catch (err) {
        console.error('Error fetching monthly summary:', err);
      } finally {
        setLoadingMonthly(false);
      }
    }
    loadMonthly();
  }, [cutoffHour]);

  return (
    <div>
      {/* Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Filter and Gate Closure Control Bar */}
      <ControlBar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        cutoffHour={cutoffHour}
        setCutoffHour={setCutoffHour}
        availableDates={availableDates}
      />

      {/* Main Content Area */}
      <main>
        {activeTab === 'day' && (
          <DayAheadView dayData={dayData} loading={loadingDay} />
        )}

        {activeTab === 'procurement' && (
          <ProcurementSimulator
            selectedDate={selectedDate}
            cutoffHour={cutoffHour}
          />
        )}

        {activeTab === 'macro' && (
          <MonthlyMacroView
            monthlyData={monthlyData}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('day'); // Switch to day view on day click
            }}
            selectedDate={selectedDate}
            loading={loadingMonthly}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: '40px',
        padding: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
        color: '#6B7280'
      }}>
        <div>
          <span style={{ color: '#9CA3AF', fontWeight: '600' }}>UK Wind Day-Ahead Procurement Portal</span> • Built for Wholesale Power Trading & Portfolio Risk Management
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Dataset: Elexon BMRS (FUELHH & WINDFOR)</span>
          <span>Target: January 2026 (1,488 SPs)</span>
          <span style={{ color: '#10B981' }}>Gate Closure: D-1 11:00 GMT</span>
        </div>
      </footer>
    </div>
  );
}
