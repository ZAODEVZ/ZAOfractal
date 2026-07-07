import React from 'react';

interface Tab { id: string; label: string; }
interface Props { active: string; onChange: (id: string) => void; tabs: Tab[]; }

export default function TabNav({ active, onChange, tabs }: Props) {
  return (
    <nav className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={active === t.id ? 'active' : ''}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
