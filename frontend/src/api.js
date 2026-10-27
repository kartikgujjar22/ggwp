const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDays(cutoffHour = 11, cutoffMinute = 0) {
  const res = await fetch(`${API_BASE}/days?cutoff_hour=${cutoffHour}&cutoff_minute=${cutoffMinute}`);
  if (!res.ok) throw new Error('Failed to load days summary');
  return res.json();
}

export async function fetchDayData(deliveryDate, cutoffHour = 11, cutoffMinute = 0) {
  const res = await fetch(`${API_BASE}/day/${deliveryDate}?cutoff_hour=${cutoffHour}&cutoff_minute=${cutoffMinute}`);
  if (!res.ok) throw new Error(`Failed to load data for ${deliveryDate}`);
  return res.json();
}

export async function fetchMonthlySummary(cutoffHour = 11, cutoffMinute = 0) {
  const res = await fetch(`${API_BASE}/monthly-summary?cutoff_hour=${cutoffHour}&cutoff_minute=${cutoffMinute}`);
  if (!res.ok) throw new Error('Failed to load monthly summary');
  return res.json();
}

export async function simulateProcurement(payload) {
  const res = await fetch(`${API_BASE}/procurement/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Procurement simulation failed');
  return res.json();
}
