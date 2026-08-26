import React, { useMemo, useState } from 'react';
import { proposalsNewestFirst, summary, type Proposal } from '../lib/data';
import { FRAPPS_URL } from '../lib/constants';
import { shortAddr, displayName, formatRespect } from '../lib/format';

/** What a proposal actually does, read out of its execute() calldata. */
function describe(p: Proposal): string {
  const a = p.action;
  if (!a) return `Proposal ${shortAddr(p.propId)}`;
  if (a.call === 'mintRespectGroup') {
    const n = a.awards?.length ?? 0;
    return `Mint Respect for period ${a.periodNumber} — ${n} ${n === 1 ? 'award' : 'awards'}, ${a.respectMinted} Respect`;
  }
  if (a.call === 'burnRespectGroup') return 'Burn Respect (correction)';
  if (a.call === 'signal') return `Advance period counter to ${a.signalValue}`;
  if (a.call === 'setMinWeight') return 'Change minimum vote weight';
  if (a.call === 'setMaxLiveVotes') return 'Change max live votes';
  return `${a.call} on ${shortAddr(a.target)}`;
}

const STAGE_PILL: Record<string, string> = {
  Executed: 'pill-orange',
  Executable: 'pill-cyan',
  Voting: 'pill-cyan',
  Veto: 'pill-gold',
  Failed: 'pill-dim',
  ExecutionFailed: 'pill-dim',
  Canceled: 'pill-dim',
};

const FILTERS = ['All', 'Respect mints', 'Live', 'Failed'] as const;
type Filter = (typeof FILTERS)[number];

function matches(p: Proposal, filter: Filter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Respect mints') return p.action?.call === 'mintRespectGroup';
  if (filter === 'Live') return p.stage === 'Voting' || p.stage === 'Veto' || p.stage === 'Executable';
  return p.stage === 'Failed' || p.stage === 'ExecutionFailed';
}

interface Props { wallet: string | null; }

export default function ProposalsTab({ wallet: _wallet }: Props) {
  const [filter, setFilter] = useState<Filter>('All');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(
    () => proposalsNewestFirst.filter((p) => matches(p, filter)),
    [filter],
  );

  // OREC's own pass rule: 2/3 supermajority over a 1000 Respect floor.
  const minWeight = Number(BigInt(summary.orec.config.minWeight) / 10n ** 18n);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Governance Proposals</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          <a href={`${FRAPPS_URL}/newProposal`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            + New Proposal
          </a>
        </div>
      </div>

      <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '1rem' }}>
        {list.length} of {summary.orec.proposals} proposals. Vote weight comes from OG Respect, not ZOR.
        A proposal passes on a 2/3 supermajority above {formatRespect(minWeight)} Respect, after a
        3-day vote and a 3-day veto window.
      </p>

      <div className="proposal-list">
        {list.map((p) => {
          const total = p.yesWeight + p.noWeight || 1;
          const yesPct = Math.round((p.yesWeight / total) * 100);
          const isOpen = open === p.propId;
          return (
            <div key={p.propId} className="card proposal-card" onClick={() => setOpen(isOpen ? null : p.propId)}>
              <div className="proposal-header">
                <div style={{ flex: 1 }}>
                  <div className="proposal-title">{describe(p)}</div>
                  <div className="proposal-meta">
                    <span className={`pill ${STAGE_PILL[p.stage] ?? 'pill-dim'}`}>{p.stage}</span>
                    {p.createdAt && <span className="text-dim">{p.createdAt.slice(0, 10)}</span>}
                    <span className="text-dim">{p.votes.length} {p.votes.length === 1 ? 'vote' : 'votes'}</span>
                  </div>
                </div>
                <a
                  href={`${FRAPPS_URL}/proposal/${p.propId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  View ↗
                </a>
              </div>
              <div className="vote-bar">
                <div className="vote-bar-fill" style={{ width: `${yesPct}%` }} />
              </div>
              <div className="vote-counts">
                <span>YES — {formatRespect(p.yesWeight)} Respect ({yesPct}%)</span>
                <span>NO — {formatRespect(p.noWeight)} Respect</span>
              </div>

              {isOpen && (
                <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {p.votes.map((v) => (
                      <div key={`${v.tx}-${v.voter}`} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                        <span className={`pill ${v.vote === 'Yes' ? 'pill-orange' : v.vote === 'No' ? 'pill-dim' : 'pill-cyan'}`} style={{ fontSize: '0.7rem' }}>
                          {v.vote}
                        </span>
                        <span style={{ flex: 1, minWidth: '9rem' }}>{displayName(v.voter)}</span>
                        <span style={{ color: 'var(--text-dim)' }}>{v.at?.slice(0, 10)}</span>
                        <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{formatRespect(v.weight)}</span>
                      </div>
                    ))}
                  </div>

                  {p.action?.awards && (
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                        Awards minted
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {p.action.awards.map((a) => (
                          <div key={a.recipient} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.82rem' }}>
                            <span style={{ flex: 1 }}>{displayName(a.recipient)}</span>
                            <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{a.respect}</span>
                          </div>
                        ))}
                      </div>
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
      </p>
    </div>
  );
}
