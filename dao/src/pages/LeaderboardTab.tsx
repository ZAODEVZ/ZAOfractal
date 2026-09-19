import React, { useMemo, useState } from 'react';
import { allMembers, summary, awardsForMember } from '../lib/data';
import { KNOWN_MEMBERS } from '../lib/constants';
import { shortAddr, formatRespect, displayName, explorerLink } from '../lib/format';

type Ledger = 'zor' | 'og' | 'combined';

const LEDGERS: { id: Ledger; label: string; note: string }[] = [
  { id: 'zor', label: 'ZOR', note: 'ERC-1155 award ledger, periods 67 and up' },
  { id: 'og', label: 'OG', note: 'ERC-20 ledger, and the vote weight OREC actually reads' },
  { id: 'combined', label: 'Combined', note: 'Both ledgers added together' },
];

export default function LeaderboardTab() {
  const [ledger, setLedger] = useState<Ledger>('zor');
  const [namedOnly, setNamedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const score = (m: { zor: number; og: number }) =>
      ledger === 'zor' ? m.zor : ledger === 'og' ? m.og : m.zor + m.og;
    return allMembers()
      .map((m) => ({ ...m, score: score(m) }))
      .filter((m) => m.score > 0)
      .filter((m) => !namedOnly || KNOWN_MEMBERS[m.address])
      .sort((a, b) => b.score - a.score || a.address.localeCompare(b.address));
  }, [ledger, namedOnly]);

  const named = rows.filter((m) => KNOWN_MEMBERS[m.address]).length;
  const active = LEDGERS.find((l) => l.id === ledger)!;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Respect Leaderboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {LEDGERS.map((l) => (
            <button
              key={l.id}
              className={`btn ${ledger === l.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
              onClick={() => setLedger(l.id)}
            >
              {l.label}
            </button>
          ))}
          <button
            className={`btn ${namedOnly ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            onClick={() => setNamedOnly((v) => !v)}
          >
            Named only
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '1rem' }}>
        {active.note}. {rows.length} holders, {named} of them named from the Discord bot export.
      </p>

      <div className="leaderboard">
        {rows.map((m, i) => {
          const isOpen = expanded === m.address;
          const history = isOpen ? awardsForMember(m.address) : [];
          return (
            <div key={m.address}>
              <div className="leader-row" onClick={() => setExpanded(isOpen ? null : m.address)} style={{ cursor: 'pointer' }}>
                <span className={`leader-rank ${i < 3 ? 'top' : ''}`}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="leader-name">{displayName(m.address)}</div>
                  <a
                    href={explorerLink(m.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="leader-addr"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {shortAddr(m.address)}
                  </a>
                </div>
                {ledger === 'combined' && (
                  <span className="pill pill-dim" style={{ fontSize: '0.7rem' }}>
                    {formatRespect(m.zor)} ZOR + {formatRespect(m.og)} OG
                  </span>
                )}
                {m.awards > 0 && (
                  <span className="pill pill-cyan" style={{ fontSize: '0.7rem' }}>{m.awards} awards</span>
                )}
                <span className="leader-respect">{formatRespect(m.score)}</span>
              </div>

              {isOpen && (
                <div className="card" style={{ marginTop: '0.4rem', marginBottom: '0.6rem' }}>
                  {history.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
                      No ZOR awards on record. This wallet's Respect predates the ZOR ledger.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {history.map((a) => (
                        <div key={a.tokenId} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                          <span className="pill pill-orange" style={{ fontSize: '0.7rem' }}>Period {a.periodNumber}</span>
                          <span style={{ color: 'var(--text-dim)' }}>{a.date.slice(0, 10)}</span>
                          {a.groupNum != null && <span style={{ color: 'var(--text-dim)' }}>group {a.groupNum}</span>}
                          {a.level != null && <span style={{ color: 'var(--text-muted)' }}>rank {a.level}</span>}
                          <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{a.respect}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '1.25rem' }}>
        Snapshot pulled {summary.pulledAt.slice(0, 10)} at block {summary.latestBlock.toLocaleString()}.
        Run <code>node scripts/pull-data.mjs</code> to refresh.
      </p>
    </div>
  );
}
