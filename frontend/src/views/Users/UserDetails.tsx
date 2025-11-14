import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../components/UI/GlassCard';
import { mockUsers } from '../../data/mockData';
import { User } from '../../data/mockData';

interface UserDetailsProps {
  onUserSelect: (user: User) => void;
}

const UserDetails = React.memo<UserDetailsProps>(({ onUserSelect }) => {
  const top5Users = mockUsers.slice(0, 5);
  const allUsers = mockUsers;

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'border-red-500/50 shadow-red-500/30';
    if (score >= 40) return 'border-yellow-500/50 shadow-yellow-500/30';
    return 'border-green-500/50 shadow-green-500/30';
  };

  return (
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto space-y-8">
      {/* Top 5 Horizontal Strip */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-black neon-text">Top 5 Users</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {top5Users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => onUserSelect(user)}
            >
              <GlassCard hover className={`text-center ${getRiskColor(user.riskScore)}`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white text-xl mx-auto mb-3">
                  {user.avatar}
                </div>
                <p className="font-semibold text-black mb-1">{user.name}</p>
                <p className="text-xs text-black mb-2">{user.jobTitle}</p>
                <div className={`text-2xl font-bold ${
                  user.riskScore >= 70 ? 'text-red-400' :
                  user.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {user.riskScore}
                </div>
                <p className="text-xs text-black mt-1">Risk Score</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* All Users Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-black neon-text">All Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => onUserSelect(user)}
              className="cursor-pointer"
            >
              <GlassCard hover className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white mx-auto mb-2">
                  {user.avatar}
                </div>
                <p className="text-sm font-medium text-black truncate">{user.name}</p>
                <p className={`text-xs mt-1 ${
                  user.riskScore >= 70 ? 'text-red-400' :
                  user.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {user.riskScore}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
});

UserDetails.displayName = 'UserDetails';

export default UserDetails;

