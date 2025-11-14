import React from 'react';
import { motion } from 'framer-motion';

interface FloatingNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'User Details' },
  { id: 'events', label: 'Events' },
  { id: 'settings', label: 'Settings' },
];

const FloatingNav = React.memo<FloatingNavProps>(({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed top-20 left-1/2 -translate-x-1/2 z-40 mt-4">
      <div className="glass rounded-full px-6 py-3 flex items-center space-x-8 border border-white/10">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              relative px-4 py-2 font-medium transition-all duration-300
              ${activeTab === item.id
                ? 'text-cyan-400 neon-text'
                : 'text-gray-400 hover:text-gray-200'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {item.label}
            {activeTab === item.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 neon-glow rounded-full"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </nav>
  );
});

FloatingNav.displayName = 'FloatingNav';

export default FloatingNav;

