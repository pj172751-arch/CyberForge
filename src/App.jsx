import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import AttackerDashboard from './pages/AttackerDashboard';
import AttackerAttempt from './pages/AttackerAttempt';
import DefenderDashboard from './pages/DefenderDashboard';
import ModeratorActivity from './pages/ModeratorActivity';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

export default function App() {
  const { currentRole } = useApp();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeChallenge, setActiveChallenge] = useState(null);

  // If user is on login screen
  if (currentRole === 'login') {
    return <Login />;
  }

  // Handle global search selecting a challenge
  const handleSelectChallenge = (ch) => {
    setActiveChallenge(ch);
  };

  // Render content according to active role and current tab
  const renderContent = () => {
    // If an attacker is currently attempting a specific challenge (Screen 3)
    if (activeChallenge && currentRole === 'attacker') {
      return (
        <AttackerAttempt
          challenge={activeChallenge}
          onBack={() => setActiveChallenge(null)}
        />
      );
    }

    // Shared Profile (Screen 7)
    if (currentTab === 'profile') {
      return <Profile />;
    }

    // Shared Settings (Screen 8)
    if (currentTab === 'settings') {
      return <Settings />;
    }

    // Role-specific screens
    switch (currentRole) {
      case 'attacker':
        // Screen 2: Attacker Dashboard (or My Attempts sub-view)
        return (
          <AttackerDashboard
            onSelectChallenge={(ch) => setActiveChallenge(ch)}
          />
        );

      case 'defender':
        // Screen 4: Defender Dashboard
        return <DefenderDashboard />;

      case 'moderator':
        // Screen 5: Moderator Activity & Alerts
        return <ModeratorActivity />;

      case 'admin':
        // Screen 6: Admin Dashboard (Moderator Oversight)
        return <AdminDashboard />;

      default:
        return <Login />;
    }
  };

  return (
    <Layout
      currentTab={currentTab}
      setCurrentTab={(tab) => {
        setActiveChallenge(null);
        setCurrentTab(tab);
      }}
      onSelectChallenge={handleSelectChallenge}
    >
      {renderContent()}
    </Layout>
  );
}
