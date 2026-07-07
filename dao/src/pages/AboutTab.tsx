import React from 'react';
import { ZAO_CONTRACTS, FRAPPS_URL, ZAO_FIBONACCI } from '../lib/constants';
import { explorerLink } from '../lib/format';

export default function AboutTab() {
  const contracts = [
    { label: 'OREC', addr: ZAO_CONTRACTS.OREC, desc: 'Governance executor' },
    { label: 'ZOR Respect', addr: ZAO_CONTRACTS.ZOR_RESPECT, desc: 'ERC-1155 soulbound (Season 2+)' },
    { label: 'OG Respect', addr: ZAO_CONTRACTS.OG_RESPECT, desc: 'ERC-20 soulbound (Season 1)' },
    { label: 'Hats', addr: ZAO_CONTRACTS.HATS, desc: 'Role management tree' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div className="card">
        <h2>ZAO Fractal</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.7 }}>
          ZAO Fractal is a music-focused fractal democracy community running weekly Respect Games
          on Optimism OP Mainnet since August 2024. Participants earn non-transferable ZOR Respect
          tokens through peer evaluation, which determine governance voting weight in this ORDAO.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href="https://thezao.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">The ZAO ↗</a>
          <a href={FRAPPS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">frapps.xyz ↗</a>
          <a href="https://zaofractal.vercel.app" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Docs ↗</a>
        </div>
      </div>

      <div className="card">
        <h2>Respect Game</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.7 }}>
          Every Monday at 6pm EST, ZAO members join a Zoom call and break into rooms of 6.
          Each person ranks their peers by contribution. Rankings are Fibonacci-weighted (ZAO uses 2×):
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {ZAO_FIBONACCI.map((v, i) => (
            <div key={i} className="stat-card" style={{ minWidth: '60px', flex: '0 1 auto' }}>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{v}</div>
              <div className="stat-label">Rank {6 - i}</div>
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          ZOR tokens are soulbound — they cannot be transferred or purchased. Governance weight = earned reputation only.
        </p>
      </div>

      <div className="card">
        <h2>On-Chain Contracts</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.88rem' }}>
          All contracts deployed on Optimism OP Mainnet (chain ID 10).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {contracts.map((c) => (
            <div key={c.addr} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="pill pill-orange">{c.label}</span>
              <a
                href={explorerLink(c.addr)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--cyan)' }}
              >
                {c.addr.slice(0, 10)}…{c.addr.slice(-6)}
              </a>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{c.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Resources</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { label: 'Submit Respect Results', url: `${FRAPPS_URL}/newProposal/respectAccountBatch` },
            { label: 'Burn Respect (correction)', url: `${FRAPPS_URL}/newProposal/burnRespectBatch` },
            { label: 'ORDAO GitHub', url: 'https://github.com/sim31/ordao' },
            { label: 'Frapps Toolkit', url: 'https://github.com/Optimystics/frapps' },
            { label: 'OREC on Etherscan', url: explorerLink(ZAO_CONTRACTS.OREC) },
          ].map(({ label, url }) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--cyan)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {label} <span style={{ opacity: 0.6, fontSize: '0.75em' }}>↗</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
