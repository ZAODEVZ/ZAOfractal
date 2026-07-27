import React from 'react';

// A prominent, unmistakable banner shown whenever a tab is displaying
// placeholder data because the ornode was unreachable. This is deliberately
// loud: for an app about verifiable Respect, fabricated numbers must never be
// mistaken for live on-chain values.
export default function SampleDataBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        margin: '0 0 1.25rem',
        padding: '0.8rem 1rem',
        borderRadius: '10px',
        border: '1px solid var(--gold, #D4A23A)',
        background: 'rgba(212, 162, 58, 0.12)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        lineHeight: 1.5,
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 700, color: 'var(--gold, #D4A23A)', flexShrink: 0 }}>
        SAMPLE DATA
      </span>
      <span>{children}</span>
    </div>
  );
}
