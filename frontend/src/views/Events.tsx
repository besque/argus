import React from 'react';
import { motion } from 'framer-motion';

const Events = React.memo(() => {
  return (
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold mb-4 neon-text text-cyan-400">
          Events Coming Soon
        </h1>
        <p className="text-xl text-gray-400">
          Advanced event management and filtering will be available here
        </p>
      </motion.div>
    </div>
  );
});

Events.displayName = 'Events';

export default Events;

