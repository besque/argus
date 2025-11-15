import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { apiService } from '../services/apiService';
import { socketService } from '../services/socketService';
import type { User, TimelineData, AnomalyType, Event } from '../data/mockData';

const Dashboard = React.memo(() => {
  const [users, setUsers] = useState<User[]>([]);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyType[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [breakdown, setBreakdown] = useState({ high: 0, medium: 0, low: 0 });
  const [kpis, setKPIs] = useState({
    overallRiskScore: 0,
    activeUsers: 0,
    suspiciousUsers: 0,
    totalEventsProcessed: 0,
    totalAnomalies: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [usersData, timelineData, anomaliesData, eventsData, breakdownData, kpisData] = await Promise.all([
        apiService.getUsers(),
        apiService.getRiskTimeline(),
        apiService.getAnomalyBreakdown(),
        apiService.getEvents(),
        apiService.getRiskBreakdown(),
        apiService.getKPIs()
      ]);
      
      setUsers(usersData);
      setTimeline(timelineData);
      setAnomalies(anomaliesData);
      setEvents(eventsData);
      setBreakdown(breakdownData);
      setKPIs(kpisData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh specific data sections
  const refreshKPIs = useCallback(async () => {
    try {
      const kpisData = await apiService.getKPIs();
      setKPIs(kpisData);
    } catch (error) {
      console.error('Error refreshing KPIs:', error);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const usersData = await apiService.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  }, []);

  const refreshTimeline = useCallback(async () => {
    try {
      const timelineData = await apiService.getRiskTimeline();
      setTimeline(timelineData);
    } catch (error) {
      console.error('Error refreshing timeline:', error);
    }
  }, []);

  const refreshBreakdown = useCallback(async () => {
    try {
      const [breakdownData, anomaliesData] = await Promise.all([
        apiService.getRiskBreakdown(),
        apiService.getAnomalyBreakdown()
      ]);
      setBreakdown(breakdownData);
      setAnomalies(anomaliesData);
    } catch (error) {
      console.error('Error refreshing breakdown:', error);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const eventsData = await apiService.getEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error refreshing events:', error);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Connect socket
    socketService.connect();

    // Set up real-time event listeners
    const handleNewAlert = (alertData: any) => {
      console.log('New alert received:', alertData);
      // Refresh all relevant data
      refreshKPIs();
      refreshUsers();
      refreshTimeline();
      refreshBreakdown();
      refreshEvents();
      
      // Show notification or toast if desired
      setLastUpdate(new Date());
    };

    const handleRiskUpdate = (updateData: any) => {
      console.log('Risk score updated:', updateData);
      refreshKPIs();
      refreshUsers();
      refreshTimeline();
      refreshBreakdown();
    };

    const handleNewEvent = (eventData: any) => {
      console.log('New event processed:', eventData);
      refreshKPIs();
      refreshEvents();
    };

    socketService.on('new_alert', handleNewAlert);
    socketService.on('risk_score_update', handleRiskUpdate);
    socketService.on('new_event', handleNewEvent);

    // Periodic refresh every 30 seconds as fallback
    const interval = setInterval(() => {
      refreshKPIs();
      refreshTimeline();
    }, 30000);

    return () => {
      socketService.off('new_alert', handleNewAlert);
      socketService.off('risk_score_update', handleRiskUpdate);
      socketService.off('new_event', handleNewEvent);
      clearInterval(interval);
    };
  }, [fetchData, refreshKPIs, refreshUsers, refreshTimeline, refreshBreakdown, refreshEvents]);

  const topRiskyUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  }, [users]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 border border-gray-300/20">
          <p className="text-black font-semibold">{payload[0].payload.timestamp}</p>
          <p className="text-black">Risk Score: <span className="text-black font-semibold">{payload[0].value}</span></p>
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

  const getEmptyMessage = (dataType: string) => (
    <div className="text-center py-8 text-gray-400">
      <p className="text-lg mb-2">No {dataType} Available</p>
      <p className="text-sm">Data will appear here once events are processed through ML</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto space-y-8">
      {/* Connection Status Indicator */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <div className={`w-2 h-2 rounded-full ${socketService.isConnected() ? 'bg-green-400' : 'bg-red-400'}`} />
          <span>{socketService.isConnected() ? 'Live Updates Active' : 'Reconnecting...'}</span>
        </div>
        <div className="text-xs text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Overall Risk Score</h3>
            <p className="text-3xl font-bold text-black">{kpis.overallRiskScore}</p>
            <p className="text-xs text-gray-500 mt-1">Company-level</p>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Active Users</h3>
            <p className="text-3xl font-bold text-black">{kpis.activeUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Suspicious Users</h3>
            <p className="text-3xl font-bold text-black">{kpis.suspiciousUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Flagged for review</p>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <GlassCard>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Events Processed</h3>
            <p className="text-3xl font-bold text-black">{kpis.totalEventsProcessed.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total events</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Total Anomalies and Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard>
          <h3 className="text-lg font-semibold text-black mb-4">Total Anomalies</h3>
          <p className="text-5xl font-bold text-black text-center">{kpis.totalAnomalies}</p>
          <p className="text-sm text-gray-400 text-center mt-2">Total detected</p>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6 text-black">Risk Breakdown</h3>
          
          {/* Percentages Above Bar */}
          <div className="flex w-full mb-1 text-sm font-bold">
            <div className="text-red-400 text-center" style={{ width: `${breakdown.high}%` }}>
              {breakdown.high > 0 ? `${breakdown.high}%` : ''}
            </div>
            <div className="text-yellow-400 text-center" style={{ width: `${breakdown.medium}%` }}>
              {breakdown.medium > 0 ? `${breakdown.medium}%` : ''}
            </div>
            <div className="text-green-400 text-center" style={{ width: `${breakdown.low}%` }}>
              {breakdown.low > 0 ? `${breakdown.low}%` : ''}
            </div>
          </div>

          {/* Combined Single Bar Display */}
          <div className="h-4 rounded-full bg-gray-300/50 flex overflow-hidden">
            {/* High Risk Segment (Red) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${breakdown.high}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-red-500 shadow-lg shadow-red-500/50"
              style={{ minWidth: breakdown.high > 0 ? '5px' : '0' }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${breakdown.medium}%` }}
              transition={{ duration: 1, delay: 0.4 }}
              className="h-full bg-yellow-500 shadow-lg shadow-yellow-500/50"
              style={{ minWidth: breakdown.medium > 0 ? '5px' : '0' }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${breakdown.low}%` }}
              transition={{ duration: 1, delay: 0.6 }}
              className="h-full bg-green-500 shadow-lg shadow-green-500/50"
              style={{ minWidth: breakdown.low > 0 ? '5px' : '0' }}
            />
          </div>
          
          {/* Legend Below Bar */}
          <div className="flex justify-start space-x-6 mt-4 text-xs text-black">
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
              <span>High Risk</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
              <span>Medium Risk</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
              <span>Low Risk</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Primary Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Timeline Graph */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-black">Risk Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis
                dataKey="timestamp"
                stroke="#6b7280"
                tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              />
              <YAxis stroke="#6b7280" domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="riskScore"
                stroke="#6b7280"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRisk)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Top 5 Risky Users */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-black">Top 5 Risky Users</h3>
          {topRiskyUsers.length > 0 ? (
            <div className="space-y-3">
              {topRiskyUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass rounded-lg p-4 border border-gray-300/20 hover:border-gray-400/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center font-bold text-white">
                        {user.avatar} 
                      </div>
                      <div>
                        <p className="font-semibold text-black">{user.name}</p>
                        <p className="text-xs text-black">{user.department}</p>
                      </div>
                    </div>
                    <div className={`text-3xl font-bold ${getRiskColor(user.riskScore)}`}>
                      {user.riskScore} 
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            getEmptyMessage('users')
          )}
        </GlassCard>
      </div>

      {/* Anomalies and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomalies Donut Chart */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-black">Anomaly Distribution</h3>
          {anomalies.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={anomalies}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {anomalies.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(245, 245, 240, 0.95)',
                    border: '1px solid rgba(150, 150, 150, 0.3)',
                    borderRadius: '8px',
                    color: '#000000',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            getEmptyMessage('anomalies')
          )}
        </GlassCard>

        {/* Events Table */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-black">Recent Events</h3>
          {events.length > 0 ? (
            <div className="overflow-y-auto max-h-[300px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300/20">
                    <th className="text-left py-2 px-3 text-sm text-black">Timestamp</th>
                    <th className="text-left py-2 px-3 text-sm text-black">User</th>
                    <th className="text-left py-2 px-3 text-sm text-black">Type</th>
                    <th className="text-left py-2 px-3 text-sm text-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event: any) => (
                    <motion.tr
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-300/10 hover:bg-gray-300/10 transition-colors"
                    >
                      <td className="py-3 px-3 text-sm text-black">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-sm text-black">{event.user}</td>
                      <td className="py-3 px-3 text-sm text-black">{event.anomalyType}</td>
                      <td className="py-3 px-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            event.status === 'resolved'
                              ? 'text-green-400'
                              : event.status === 'escalated'
                              ? 'text-red-400'
                              : 'text-yellow-400'
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
          ) : (
            getEmptyMessage('events')
          )}
        </GlassCard>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
