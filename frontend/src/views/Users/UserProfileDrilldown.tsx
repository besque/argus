import React from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import GlassCard from '../../components/UI/GlassCard';
import ActionButton from '../../components/UI/ActionButton';
import { User } from '../../data/mockData';

interface UserProfileDrilldownProps {
  user: User;
  onBack: () => void;
}

const UserProfileDrilldown = React.memo<UserProfileDrilldownProps>(({ user, onBack }) => {
  const radarData = [
    { subject: 'Data Access', A: user.riskVectors.dataAccessFrequency, fullMark: 100 },
    { subject: 'Login Success', A: user.riskVectors.loginSuccessRate, fullMark: 100 },
    { subject: 'Policy Violations', A: user.riskVectors.policyViolations, fullMark: 100 },
    { subject: 'Unusual Hours', A: user.riskVectors.unusualHours, fullMark: 100 },
    { subject: 'External Access', A: user.riskVectors.externalAccess, fullMark: 100 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return 'text-red-400 border-red-500/50 bg-red-500/10';
      case 'medium':
        return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
      default:
        return 'text-green-400 border-green-500/50 bg-green-500/10';
    }
  };

  const getRiskExplanation = (user: User) => {
    if (user.riskScore >= 70) {
      return `User ${user.name} has been flagged as high-risk due to multiple concerning patterns in their activity. Recent analysis reveals frequent access to sensitive databases during unusual hours, combined with a significantly elevated rate of policy violations. The user's login success rate has dropped substantially, suggesting potential account compromise or unauthorized access attempts. Additionally, there have been multiple instances of data exfiltration attempts and access to restricted folders that fall outside their normal job responsibilities. These indicators collectively suggest a high probability of either insider threat activity or a compromised account requiring immediate investigation.`;
    } else if (user.riskScore >= 40) {
      return `User ${user.name} shows moderate risk indicators that warrant attention. While most activities appear within normal parameters, there have been occasional policy violations and some access patterns that deviate from their typical behavior. The user has accessed resources outside their usual scope, and there are minor anomalies in login patterns. These factors, while not immediately alarming, suggest the need for continued monitoring and potential review of access permissions.`;
    } else {
      return `User ${user.name} demonstrates low-risk behavior patterns. Their activity is consistent with their role and responsibilities, with minimal policy violations and normal access patterns. Login success rates are high, and there are no significant anomalies in their behavior. This user represents a standard, compliant user profile with no immediate security concerns.`;
    }
  };

  return (
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto space-y-8">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Users</span>
      </motion.button>

      {/* User Details KPI Strip */}
      <GlassCard glow>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white text-3xl">
              {user.avatar}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">{user.name}</h2>
              <p className="text-gray-400">{user.jobTitle} • {user.department}</p>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Risk Score</p>
              <p className={`text-4xl font-bold ${
                user.riskScore >= 70 ? 'text-red-400' :
                user.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {user.riskScore}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${getStatusColor(user.status)}`}>
              <p className="text-sm font-semibold capitalize">{user.status} Risk</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <ActionButton label="Mark Safe" onClick={() => {}} variant="primary" />
            <ActionButton label="Escalate" onClick={() => {}} variant="secondary" />
          </div>
        </div>
      </GlassCard>

      {/* Risk Summary Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plain English Risk Box */}
        <GlassCard className="lg:col-span-1">
          <h3 className="text-2xl font-bold mb-4 text-cyan-400 neon-text">
            Why {user.name} is {user.status === 'high' ? 'Risky' : user.status === 'medium' ? 'Moderately Risky' : 'Low Risk'}
          </h3>
          <p className="text-gray-300 leading-relaxed">
            {getRiskExplanation(user)}
          </p>
        </GlassCard>

        {/* Spider Chart */}
        <GlassCard className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Risk Vectors</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
              />
              <Radar
                name="Risk Level"
                dataKey="A"
                stroke="#00f0ff"
                fill="#00f0ff"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* User Logs */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4 text-cyan-400">Recent Activity Logs</h3>
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-sm text-gray-400">Timestamp</th>
                <th className="text-left py-2 px-3 text-sm text-gray-400">Action</th>
                <th className="text-left py-2 px-3 text-sm text-gray-400">Type</th>
                <th className="text-left py-2 px-3 text-sm text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {user.recentActivity.map((activity, index) => (
                <motion.tr
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-3 text-sm text-gray-300">
                    {new Date(activity.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-sm text-white">{activity.action}</td>
                  <td className="py-3 px-3 text-sm text-gray-300">{activity.type}</td>
                  <td className="py-3 px-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        activity.status === 'success'
                          ? 'bg-green-500/20 text-green-400'
                          : activity.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {activity.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
});

UserProfileDrilldown.displayName = 'UserProfileDrilldown';

export default UserProfileDrilldown;

