import React from 'react';
import { FRAPPS_URL } from '../lib/constants';

// This dashboard is read-only: it reads Respect balances and proposals from the
// ornode and does not sign or send anything. Wallet connection and every
// governance action (submitting results, voting) happen on frapps.xyz, so we
// link out there rather than ask for an address we cannot verify.
export default function Topbar() {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="topbar-brand">
          ZAO <span>fractal</span>
        </div>
        <span className="pill pill-orange" style={{ fontSize: '0.68rem' }}>OP Mainnet</span>
        <span
          className="pill pill-dim"
          style={{ fontSize: '0.68rem' }}
          title="This dashboard only reads on-chain data. Governance actions happen on frapps.xyz."
        >
          read-only
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <a
          href="https://zaofractal.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
        >
          Docs ↗
        </a>
        <a
          href={FRAPPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
        >
          Open app on frapps.xyz ↗
        </a>
      </div>
    </header>
  );
}
