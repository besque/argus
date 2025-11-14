import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Header = React.memo(() => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-300/20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, events, anomalies..."
              className="w-full px-4 py-2 glass rounded-lg border border-gray-300/20 focus:border-gray-400/40 focus:outline-none transition-all duration-300 placeholder-gray-500 text-black"
            />
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;

