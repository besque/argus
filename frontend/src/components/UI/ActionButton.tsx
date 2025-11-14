import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

const ActionButton = React.memo<ActionButtonProps>(({ 
  label, 
  onClick, 
  variant = 'primary',
  className = '' 
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        px-6 py-3 rounded-lg font-semibold
        transition-all duration-300
        ${variant === 'primary' 
          ? 'bg-cyan-500/20 text-black border border-cyan-500/50 hover:bg-cyan-500/30 hover:neon-glow' 
          : 'bg-red-500/20 text-black border border-red-500/50 hover:bg-red-500/30 hover:shadow-lg hover:shadow-red-500/50'
        }
        ${className}
      `}
    >
      {label}
    </motion.button>
  );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton;

