import React from 'react';

const STATS = [
  { value: '~100', label: 'Members' },
  { value: '100+', label: 'Weeks Running' },
  { value: '8,000+', label: 'ZOR Distributed' },
  { value: 'OP', label: 'Mainnet' },
];

export default function StatsBar() {
  return (
    <div className="stats-row" style={{ marginBottom: '1.75rem' }}>
      {STATS.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
