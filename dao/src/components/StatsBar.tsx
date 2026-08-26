import React, { useEffect, useState } from 'react';
import { summary, sessions, allMembers, currentStreak } from '../lib/data';
import { formatRespect } from '../lib/format';

function nextMondayEST(): Date {
  // ZAO Respect Game: every Monday at 6pm EST (UTC-5 / UTC-4 DST)
  const now = new Date();
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  // EST offset — approximate (doesn't account for DST edge days)
  const estOffset = -5 * 3600000;
  const estNow = new Date(utcNow + estOffset);

  const day = estNow.getDay(); // 0=Sun, 1=Mon
  const daysUntilMonday = day === 1
    ? (estNow.getHours() < 18 ? 0 : 7) // Monday: if before 6pm it's today, else next week
    : (8 - day) % 7 || 7;

  const nextMonday = new Date(estNow);
  nextMonday.setDate(estNow.getDate() + daysUntilMonday);
  nextMonday.setHours(18, 0, 0, 0);
  // Convert back to UTC ms
  return new Date(nextMonday.getTime() - estOffset);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'LIVE NOW';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatsBar() {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const update = () => {
      const target = nextMondayEST();
      setCountdown(formatCountdown(target.getTime() - Date.now()));
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  // Every figure here comes from the committed snapshot, so it is whatever the
  // chain said at the last pull - no rounding up, no "100+".
  const stats = [
    { value: String(summary.zor.latestPeriod), label: 'Latest Period' },
    { value: `${currentStreak()} of ${sessions.length}`, label: 'Streak / Sessions on ZOR' },
    { value: String(allMembers().length), label: 'Respect Holders' },
    { value: formatRespect(summary.zor.respectHeld), label: 'ZOR Respect Held' },
  ];

  return (
    <div className="stats-row" style={{ marginBottom: '1.75rem' }}>
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
      <div className="stat-card" style={{ borderColor: countdown === 'LIVE NOW' ? 'var(--orange)' : undefined }}>
        <div className="stat-value" style={{ fontSize: countdown === 'LIVE NOW' ? '1.2rem' : '1.8rem', color: countdown === 'LIVE NOW' ? 'var(--orange)' : undefined }}>
          {countdown || '…'}
        </div>
        <div className="stat-label">Next Game (Mon 6pm EST)</div>
      </div>
    </div>
  );
}
