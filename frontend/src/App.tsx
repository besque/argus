import React, { useState } from 'react';
import Header from './components/Layout/Header';
import FloatingNav from './components/Layout/FloatingNav';
import Dashboard from './views/Dashboard';
import UserDetails from './views/Users/UserDetails';
import UserProfileDrilldown from './views/Users/UserProfileDrilldown';
import Events from './views/Events';
import Settings from './views/Settings';
import { User } from './data/mockData';

type View = 'dashboard' | 'users' | 'events' | 'settings' | 'user-profile';

function App() {
  const [activeTab, setActiveTab] = useState<View>('dashboard');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleTabChange = (tab: string) => {
    if (tab === 'users' && selectedUser) {
      setSelectedUser(null);
    }
    setActiveTab(tab as View);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setActiveTab('user-profile');
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setActiveTab('users');
  };

  const renderView = () => {
    if (activeTab === 'user-profile' && selectedUser) {
      return <UserProfileDrilldown user={selectedUser} onBack={handleBackToUsers} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <UserDetails onUserSelect={handleUserSelect} />;
      case 'events':
        return <Events />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <FloatingNav 
        activeTab={activeTab === 'user-profile' ? 'users' : activeTab} 
        onTabChange={handleTabChange} 
      />
      <main className="pt-24">
        {renderView()}
      </main>
    </div>
  );
}

export default App;

