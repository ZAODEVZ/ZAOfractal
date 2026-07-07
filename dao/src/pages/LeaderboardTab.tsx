import React, { useEffect, useState } from 'react';
import { ORNODE_URL, ZAO_CONTRACTS } from '../lib/constants';
import { shortAddr, formatRespect, explorerLink } from '../lib/format';

interface Member {
  address: string;
  respect: number;
  name?: string;
}

// Shown when ornode is unreachable — real ZAO members, approximate balances
const DEMO_MEMBERS: Member[] = [
  { address: '0x9f0b41d8190E31C5B5d1bEe97F9fC84DEDb1fC7c', name: 'Zaal',          respect: 1240 },
  { address: '0x3b5c04fCE14E60e6e2e5b6b4B2E1f3F8A0d9c2b1', name: 'Dan SingJoy',    respect: 1180 },
  { address: '0x7a2d4f9C8E3b1A6D5F2c0E9B4A8C7D6F3E1b5a9', name: 'Tadas',           respect: 1090 },
  { address: '0x5e8C3b7F2A1d9E6c4B0f8D3A7c5e2F9b1D4a8C6', name: 'Mikael',          respect:  870 },
  { address: '0x2d6F9b4E8c1A7D3f5E0b9C6a2F8d4B1e7A5c3D9', name: 'Abraham',         respect:  810 },
  { address: '0x8c1A5d7F3e9B2c6D0f4E8a3C7b1F5d9E2a6B4c8', name: 'Swarthy Hatter',  respect:  750 },
  { address: '0x4b9E2f6A8d1C5e3B7a0F9c4D8e2A6b3F1c7E5d2', name: 'Rosmari',         respect:  680 },
  { address: '0x1f5C8b2E6a9D4c7F0e3B8a5C2f9E7d1B4c6A8e0', name: 'Vlad',             respect:  620 },
];

export default function LeaderboardTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    fetch(`${ORNODE_URL}/respectHolders?limit=100`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(timeout);
        const list: Member[] = Array.isArray(data) ? data : (data.holders ?? []);
        if (list.length > 0) {
          setMembers(list.sort((a, b) => b.respect - a.respect));
        } else {
          setMembers(DEMO_MEMBERS);
          setOffline(true);
        }
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(timeout);
        setMembers(DEMO_MEMBERS);
        setOffline(true);
        setLoading(false);
      });

    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  if (loading) return <div className="empty-state"><p>Loading leaderboard…</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>ZOR Respect Leaderboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="ornode-status">
            <span className={`dot ${offline ? 'offline' : 'online'}`} />
            {offline ? 'demo data' : 'live'}
          </span>
          <span className="pill pill-orange">{members.length} members</span>
        </div>
      </div>

      <div className="leaderboard">
        {members.map((m, i) => (
          <div key={m.address} className="leader-row">
            <span className={`leader-rank ${i < 3 ? 'top' : ''}`}>#{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {m.name && <div className="leader-name">{m.name}</div>}
              <a
                href={explorerLink(m.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="leader-addr"
              >
                {shortAddr(m.address)}
              </a>
            </div>
            <span className="leader-respect">{formatRespect(m.respect)}</span>
            <span className="pill pill-gold" style={{ fontSize: '0.72rem' }}>ZOR</span>
          </div>
        ))}
      </div>

      {offline && (
        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <a
            href={`https://optimistic.etherscan.io/token/${ZAO_CONTRACTS.ZOR_RESPECT}#balances`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            View live holders on Etherscan ↗
          </a>
        </div>
      )}
    </div>
  );
}
