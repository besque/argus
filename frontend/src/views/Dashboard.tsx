import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import GlassCard from '../components/UI/GlassCard';
import { riskTimelineData, anomalyTypes, mockEvents, totalAnomalies, riskBreakdown, mockUsers } from '../data/mockData';

const Dashboard = React.memo(() => {
  const topRiskyUsers = useMemo(() => {
    return [...mockUsers]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 border border-white/10">
          <p className="text-cyan-400 font-semibold">{payload[0].payload.timestamp}</p>
          <p className="text-white">Risk Score: <span className="text-cyan-400">{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRiskGlow = (score: number) => {
    if (score >= 70) return 'shadow-lg shadow-red-500/50';
    if (score >= 40) return 'shadow-lg shadow-yellow-500/50';
    return 'shadow-lg shadow-green-500/50';
  };

  return (
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto space-y-8">
      {/* KPI and Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1" glow>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Total Anomalies</p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-6xl font-bold neon-text text-cyan-400"
            >
              {totalAnomalies}
            </motion.div>
            <p className="text-gray-500 text-xs mt-2">Detected in last 24h</p>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Risk Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-red-400">High Risk</span>
                <span className="text-white">{riskBreakdown.high}%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${riskBreakdown.high}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-lg shadow-red-500/50"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-yellow-400">Medium Risk</span>
                <span className="text-white">{riskBreakdown.medium}%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${riskBreakdown.medium}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-lg shadow-yellow-500/50"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-400">Low Risk</span>
                <span className="text-white">{riskBreakdown.low}%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${riskBreakdown.low}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-lg shadow-green-500/50"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Primary Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Timeline Graph */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Risk Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={riskTimelineData}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                stroke="#9ca3af"
                tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              />
              <YAxis stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="riskScore"
                stroke="#00f0ff"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRisk)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Top 5 Risky Users */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Top 5 Risky Users</h3>
          <div className="space-y-3">
            {topRiskyUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-lg p-4 border border-white/10 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white">
                      {user.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.department}</p>
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${getRiskColor(user.riskScore)} ${getRiskGlow(user.riskScore)}`}>
                    {user.riskScore}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Anomalies and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomalies Donut Chart */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Anomaly Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={anomalyTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {anomalyTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(17, 24, 39, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Events Table */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Recent Events</h3>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-sm text-gray-400">Timestamp</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-400">User</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-400">Type</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockEvents.map((event) => (
                  <motion.tr
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-3 text-sm text-gray-300">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm text-white">{event.user}</td>
                    <td className="py-3 px-3 text-sm text-gray-300">{event.anomalyType}</td>
                    <td className="py-3 px-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          event.status === 'resolved'
                            ? 'bg-green-500/20 text-green-400'
                            : event.status === 'escalated'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {event.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;

