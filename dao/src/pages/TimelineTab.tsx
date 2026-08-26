import React, { useState } from 'react';
import { sessions, awardsForPeriod, periodGaps, currentStreak, summary } from '../lib/data';
import { displayName, formatRespect, shortAddr, explorerLink } from '../lib/format';

/** Awards for one week, grouped by breakout room and ordered by rank. */
function GroupedAwards({ periodNumber }: { periodNumber: number }) {
  const awards = awardsForPeriod(periodNumber);
  const groups = new Map<number, typeof awards>();
  for (const a of awards) {
    const key = a.groupNum ?? 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[...groups.entries()].map(([groupNum, rows]) => (
        <div key={groupNum}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
            {groupNum ? `Breakout group ${groupNum}` : 'Ungrouped'} — {rows.length} awards
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {rows.map((a) => (
              <div key={a.tokenId} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <span className="pill pill-dim" style={{ fontSize: '0.7rem', minWidth: '3.5rem', justifyContent: 'center' }}>
                  {a.level != null ? `rank ${a.level}` : '—'}
                </span>
                <span style={{ flex: 1, minWidth: '10rem' }}>{displayName(a.recipient)}</span>
                <a
                  href={explorerLink(a.recipient)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="leader-addr"
                  style={{ flex: '0 0 auto' }}
                >
                  {shortAddr(a.recipient)}
                </a>
                <span style={{ color: 'var(--orange)', fontWeight: 700, minWidth: '3rem', textAlign: 'right' }}>{a.respect}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TimelineTab() {
  const [open, setOpen] = useState<number | null>(sessions[0]?.periodNumber ?? null);
  const gaps = periodGaps();

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Respect Game Timeline</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.7 }}>
        Every ZOR award ever minted, grouped into the weekly session that produced it. The period
        number is packed into each award's token id, so this is the chain's own account of the game,
        not a reconstruction.
      </p>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        {sessions.length} sessions on the ZOR ledger, periods {sessions[sessions.length - 1]?.periodNumber} to{' '}
        {sessions[0]?.periodNumber}. Current unbroken run: {currentStreak()} periods.
        {gaps.length > 0 && ` Missing from this ledger: ${gaps.join(', ')}.`}
        {' '}Periods before {sessions[sessions.length - 1]?.periodNumber} were run on the OG ledger, which
        records transfers rather than per-week awards.
      </p>

      <div className="proposal-list">
        {sessions.map((s) => {
          const isOpen = open === s.periodNumber;
          return (
            <div key={s.periodNumber} className="card proposal-card" onClick={() => setOpen(isOpen ? null : s.periodNumber)}>
              <div className="proposal-header">
                <div style={{ flex: 1 }}>
                  <div className="proposal-title">Period {s.periodNumber}</div>
                  <div className="proposal-meta">
                    <span className="text-dim">{s.date.slice(0, 10)}</span>
                    <span className="pill pill-cyan">{s.participants} participants</span>
                    <span className="pill pill-dim">{s.groups} {s.groups === 1 ? 'group' : 'groups'}</span>
                    <span className="pill pill-orange">{formatRespect(s.respect)} Respect</span>
                  </div>
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '1.1rem', flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
              </div>
              {isOpen && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
                  <GroupedAwards periodNumber={s.periodNumber} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '1.25rem' }}>
        {summary.zor.awards} awards minted, {summary.zor.burns} burned, {formatRespect(summary.zor.respectHeld)} Respect held.
        Snapshot pulled {summary.pulledAt.slice(0, 10)}.
      </p>
    </div>
  );
}
