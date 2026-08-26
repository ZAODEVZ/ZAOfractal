import React, { useState } from 'react';
import Topbar from './components/Topbar';
import TabNav from './components/TabNav';
import StatsBar from './components/StatsBar';
import ProposalsTab from './pages/ProposalsTab';
import LeaderboardTab from './pages/LeaderboardTab';
import TimelineTab from './pages/TimelineTab';
import AboutTab from './pages/AboutTab';

type Tab = 'proposals' | 'leaderboard' | 'timeline' | 'about';

export default function App() {
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [wallet, setWallet] = useState<string | null>(null);

  return (
    <div className="app-shell">
      <Topbar wallet={wallet} onConnect={setWallet} onDisconnect={() => setWallet(null)} />
      <TabNav active={tab} onChange={(t) => setTab(t as Tab)} tabs={[
        { id: 'leaderboard', label: 'Leaderboard' },
        { id: 'timeline',    label: 'Timeline' },
        { id: 'proposals',   label: 'Proposals' },
        { id: 'about',       label: 'About ZAO' },
      ]} />
      <main className="content">
        <StatsBar />
        {tab === 'leaderboard' && <LeaderboardTab />}
        {tab === 'timeline'    && <TimelineTab />}
        {tab === 'proposals'   && <ProposalsTab wallet={wallet} />}
        {tab === 'about'       && <AboutTab />}
      </main>
    </div>
  );
}
