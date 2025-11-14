import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/UI/GlassCard';

const Settings = React.memo(() => {
  const [notifications, setNotifications] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="pt-32 pb-12 px-6 max-w-4xl mx-auto space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-8 neon-text text-cyan-400"
      >
        Settings
      </motion.h1>

      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-sm text-gray-400">Receive email alerts for critical events</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                notifications ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <motion.div
                animate={{ x: notifications ? 28 : 2 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full"
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Real-time Alerts</p>
              <p className="text-sm text-gray-400">Get instant notifications for high-risk activities</p>
            </div>
            <button
              onClick={() => setAlerts(!alerts)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                alerts ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <motion.div
                animate={{ x: alerts ? 28 : 2 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full"
              />
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Dark Mode</p>
            <p className="text-sm text-gray-400">Toggle dark theme</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              darkMode ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <motion.div
              animate={{ x: darkMode ? 28 : 2 }}
              className="absolute top-1 w-5 h-5 bg-white rounded-full"
            />
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">Security</h2>
        <div className="space-y-3">
          <button className="w-full px-4 py-3 glass rounded-lg border border-white/10 hover:border-cyan-500/50 text-left transition-colors">
            <p className="text-white font-medium">Change Password</p>
            <p className="text-sm text-gray-400">Update your account password</p>
          </button>
          <button className="w-full px-4 py-3 glass rounded-lg border border-white/10 hover:border-cyan-500/50 text-left transition-colors">
            <p className="text-white font-medium">Two-Factor Authentication</p>
            <p className="text-sm text-gray-400">Enable 2FA for enhanced security</p>
          </button>
        </div>
      </GlassCard>
    </div>
  );
});

Settings.displayName = 'Settings';

export default Settings;

