import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

const GlassCard = React.memo<GlassCardProps>(({ children, className = '', hover = false, glow = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        glass rounded-xl p-6
        ${hover ? 'glass-hover cursor-pointer' : ''}
        ${glow ? 'neon-glow' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;

