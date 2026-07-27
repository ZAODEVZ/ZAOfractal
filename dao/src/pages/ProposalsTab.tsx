import React, { useEffect, useState } from 'react';
import { ORNODE_URL, FRAPPS_URL } from '../lib/constants';
import { shortAddr, formatDate } from '../lib/format';
import { parseProposals, type Proposal } from '../lib/ornode';
import SampleDataBanner from '../components/SampleDataBanner';

// Illustrative placeholder proposals shown ONLY when the ornode is unreachable.
// These vote tallies are NOT real; the sample banner makes that explicit.
const SAMPLE_PROPOSALS: Proposal[] = [
  {
    id: '0xabc001',
    title: 'Season 9 Respect Game Results - Week 102',
    status: 'executed',
    yesWeight: 3480,
    noWeight: 0,
    createTime: Date.now() / 1000 - 86400 * 3,
    memo: 'Batch mint ZOR Respect for 18 participants across 3 breakout rooms.',
  },
  {
    id: '0xabc002',
    title: 'Season 9 Respect Game Results - Week 101',
    status: 'executed',
    yesWeight: 2960,
    noWeight: 110,
    createTime: Date.now() / 1000 - 86400 * 10,
  },
  {
    id: '0xabc003',
    title: 'Season 9 Respect Game Results - Week 100',
    status: 'executed',
    yesWeight: 3200,
    noWeight: 0,
    createTime: Date.now() / 1000 - 86400 * 17,
  },
];

export default function ProposalsTab() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    fetch(`${ORNODE_URL}/proposals?limit=20`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(timeout);
        // Validate + coerce the ornode payload before trusting any of it.
        const list = parseProposals(data);
        if (list.length > 0) {
          setProposals(list);
        } else {
          setProposals(SAMPLE_PROPOSALS);
          setOffline(true);
        }
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(timeout);
        setProposals(SAMPLE_PROPOSALS);
        setOffline(true);
        setLoading(false);
      });

    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  if (loading) return <div className="empty-state"><p>Loading proposals…</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Governance Proposals</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {offline && (
            <span className="ornode-status">
              <span className="dot offline" />
              sample data
            </span>
          )}
          <a href={`${FRAPPS_URL}/newProposal`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            + New Proposal
          </a>
        </div>
      </div>

      {offline && (
        <SampleDataBanner>
          Live proposal data from the ornode is unavailable right now, so the vote tallies below are
          illustrative placeholders, not real governance results.{' '}
          <a href={FRAPPS_URL} target="_blank" rel="noopener noreferrer">
            Open the live app on frapps.xyz ↗
          </a>
        </SampleDataBanner>
      )}

      <div className="proposal-list">
        {proposals.map((p) => {
          const total = p.yesWeight + p.noWeight || 1;
          const yesPct = Math.round((p.yesWeight / total) * 100);
          return (
            <div key={p.id} className="card proposal-card">
              <div className="proposal-header">
                <div style={{ flex: 1 }}>
                  <div className="proposal-title">{p.title || p.memo || `Proposal ${shortAddr(p.id)}`}</div>
                  {p.memo && p.title && (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: '0.3rem' }}>{p.memo}</div>
                  )}
                  <div className="proposal-meta">
                    <span className={`pill pill-${p.status === 'active' ? 'cyan' : p.status === 'passed' || p.status === 'executed' ? 'orange' : 'dim'}`}>
                      {p.status}
                    </span>
                    {p.createTime && (
                      <span className="text-dim">{formatDate(p.createTime)}</span>
                    )}
                  </div>
                </div>
                <a
                  href={`${FRAPPS_URL}/proposal/${encodeURIComponent(p.id)}`}
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
                <span>YES - {p.yesWeight.toLocaleString()} ZOR ({yesPct}%)</span>
                <span>NO - {p.noWeight.toLocaleString()} ZOR</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
