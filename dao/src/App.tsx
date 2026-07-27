import React, { useState } from 'react';
import Topbar from './components/Topbar';
import TabNav from './components/TabNav';
import StatsBar from './components/StatsBar';
import ProposalsTab from './pages/ProposalsTab';
import LeaderboardTab from './pages/LeaderboardTab';
import AboutTab from './pages/AboutTab';

type Tab = 'proposals' | 'leaderboard' | 'about';

export default function App() {
  const [tab, setTab] = useState<Tab>('leaderboard');

  return (
    <div className="app-shell">
      <Topbar />
      <TabNav active={tab} onChange={(t) => setTab(t as Tab)} tabs={[
        { id: 'leaderboard', label: 'Leaderboard' },
        { id: 'proposals',   label: 'Proposals' },
        { id: 'about',       label: 'About ZAO' },
      ]} />
      <main className="content">
        <StatsBar />
        {tab === 'leaderboard' && <LeaderboardTab />}
        {tab === 'proposals'   && <ProposalsTab />}
        {tab === 'about'       && <AboutTab />}
      </main>
    </div>
  );
}
