import React from 'react';
import { shortAddr } from '../lib/format';
import { FRAPPS_URL } from '../lib/constants';

interface Props {
  wallet: string | null;
  onConnect: (addr: string) => void;
  onDisconnect: () => void;
}

export default function Topbar({ wallet, onConnect, onDisconnect }: Props) {
  const handleConnect = () => {
    const mock = prompt('Enter your wallet address:');
    if (mock?.startsWith('0x')) onConnect(mock);
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="topbar-brand">
          ZAO <span>fractal</span>
        </div>
        <span className="pill pill-orange" style={{ fontSize: '0.68rem' }}>OP Mainnet</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <a
          href={FRAPPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
        >
          frapps.xyz ↗
        </a>
        <a
          href="https://zaofractal.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
        >
          Docs ↗
        </a>
        {wallet ? (
          <button className="btn btn-secondary" onClick={onDisconnect} style={{ fontSize: '0.82rem' }}>
            {shortAddr(wallet)} ✕
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleConnect}>
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
