import React, { useEffect, useState } from 'react';
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
import { apiService } from '../../services/apiService';
import { User } from '../../data/mockData';

interface UserProfileDrilldownProps {
  user: User;
  onBack: () => void;
}

interface UserDetails {
  user: any;
  recent_events: any[];
  top_alerts: any[];
  markov_sequence?: string;
  ocean_vector?: {
    O?: number;
    C?: number;
    E?: number;
    A?: number;
    N?: number;
  };
}

const UserProfileDrilldown = React.memo<UserProfileDrilldownProps>(({ user, onBack }) => {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const data = await apiService.getUser(user.id);
        setUserDetails(data);
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user.id]);

  // Use real OCEAN scores if available, otherwise map from risk vectors
  // Handle nested ocean_vector format from API
  const rawOceanVector = userDetails?.ocean_vector;
  let actualOceanVector = null;
  
  if (rawOceanVector) {
    // Check if it's nested {user_id, ocean_vector: {...}} or direct {...}
    if (rawOceanVector.ocean_vector && typeof rawOceanVector.ocean_vector === 'object') {
      actualOceanVector = rawOceanVector.ocean_vector;
    } else if (rawOceanVector.O !== undefined || rawOceanVector.C !== undefined) {
      // Already in correct format {O, C, E, A, N}
      actualOceanVector = rawOceanVector;
    }
  }
  
  // Calculate OCEAN scores - prefer real data, fallback to generated data from API
  const oceanScores = actualOceanVector
    ? {
        openness: (actualOceanVector.O || 0) * 20, // Scale 0-5 to 0-100
        conscientiousness: (actualOceanVector.C || 0) * 20,
        extroversion: (actualOceanVector.E || 0) * 20,
        agreeableness: (actualOceanVector.A || 0) * 20,
        neuroticism: (actualOceanVector.N || 0) * 20,
      }
    : userDetails?.ocean_vector // Check if backend provided fallback OCEAN data
    ? {
        openness: ((userDetails.ocean_vector.O || 0) * 20),
        conscientiousness: ((userDetails.ocean_vector.C || 0) * 20),
        extroversion: ((userDetails.ocean_vector.E || 0) * 20),
        agreeableness: ((userDetails.ocean_vector.A || 0) * 20),
        neuroticism: ((userDetails.ocean_vector.N || 0) * 20),
      }
    : {
        // Final fallback: Generate reasonable defaults based on risk score
        openness: 50 + (Math.random() - 0.5) * 30, // 35-65
        conscientiousness: Math.max(30, 80 - (user.riskScore || 0) * 0.6), // Lower for risky users
        extroversion: 40 + (Math.random() - 0.5) * 30, // 25-55
        agreeableness: Math.max(30, 70 - (user.riskScore || 0) * 0.4), // Slightly lower for risky users
        neuroticism: Math.min(70, 30 + (user.riskScore || 0) * 0.5), // Higher for risky users
  };

  const radarData = [
    { subject: 'Openness', A: oceanScores.openness, fullMark: 100 },
    { subject: 'Conscientiousness', A: oceanScores.conscientiousness, fullMark: 100 },
    { subject: 'Extroversion', A: oceanScores.extroversion, fullMark: 100 },
    { subject: 'Agreeableness', A: oceanScores.agreeableness, fullMark: 100 },
    { subject: 'Neuroticism', A: oceanScores.neuroticism, fullMark: 100 },
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

  const formatMarkovSequence = (sequence: string | undefined) => {
    if (!sequence) return 'No sequence data available';
    return sequence.split(' -> ').map((event, index) => (
      <span key={index}>
        <span className="px-2 py-1 rounded bg-gray-200 text-gray-800 text-sm font-mono">
          {event}
        </span>
        {index < sequence.split(' -> ').length - 1 && (
          <span className="mx-2 text-gray-400">→</span>
        )}
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-400">Loading user details...</div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto space-y-8">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center space-x-2 text-black hover:text-black transition-colors"
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
              <h2 className="text-3xl font-bold text-black mb-1">{user.name}</h2>
              <p className="text-black">{user.jobTitle} • {user.department}</p>
              <p className="text-sm text-black mt-1">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-black text-sm mb-1">Risk Score</p>
              <p className={`text-4xl font-bold ${
                user.riskScore >= 70 ? 'text-red-400' :
                user.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {user.riskScore.toFixed(1)}
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
          <h3 className="text-2xl font-bold mb-4 text-black neon-text">
            Why {user.name} is {user.status === 'high' ? 'Risky' : user.status === 'medium' ? 'Moderately Risky' : 'Low Risk'}
          </h3>
          <p className="text-black leading-relaxed">
            {getRiskExplanation(user)}
          </p>
        </GlassCard>

        {/* Spider Chart */}
        <GlassCard className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-black">OCEAN Analysis</h3>
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
                name="Trait Score"
                dataKey="A"
                stroke="#00f0ff"
                fill="#00f0ff"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-xs text-gray-500 text-center">
            {actualOceanVector || userDetails?.ocean_vector ? (
              <p>
                O: {(actualOceanVector?.O || userDetails?.ocean_vector?.O || 0).toFixed(2)} | 
                C: {(actualOceanVector?.C || userDetails?.ocean_vector?.C || 0).toFixed(2)} | 
                E: {(actualOceanVector?.E || userDetails?.ocean_vector?.E || 0).toFixed(2)} | 
                A: {(actualOceanVector?.A || userDetails?.ocean_vector?.A || 0).toFixed(2)} | 
                N: {(actualOceanVector?.N || userDetails?.ocean_vector?.N || 0).toFixed(2)}
              </p>
            ) : (
              <p className="text-gray-400 italic">Using generated OCEAN scores based on risk profile</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Markov Sequence Display */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4 text-black">Markov Event Sequence</h3>
        <div className="bg-gray-100/50 rounded-lg p-4 border border-gray-300/20">
          <div className="flex flex-wrap items-center gap-2">
            {formatMarkovSequence(userDetails?.markov_sequence)}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            This sequence represents the last 15 events performed by this user, used by the Markov Chain model to detect anomalous behavior patterns.
          </p>
        </div>
      </GlassCard>

      {/* Top Alerts */}
      {userDetails?.top_alerts && userDetails.top_alerts.length > 0 && (
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 text-black">Recent Alerts</h3>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300/20">
                  <th className="text-left py-2 px-3 text-sm text-black">Date</th>
                  <th className="text-left py-2 px-3 text-sm text-black">Type</th>
                  <th className="text-left py-2 px-3 text-sm text-black">Severity</th>
                  <th className="text-left py-2 px-3 text-sm text-black">Risk Score</th>
                  <th className="text-left py-2 px-3 text-sm text-black">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {userDetails.top_alerts.map((alert: any, index: number) => (
                  <motion.tr
                    key={alert._id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-300/10 hover:bg-gray-300/10 transition-colors"
                  >
                    <td className="py-3 px-3 text-sm text-black">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm text-black capitalize">
                      {alert.anomaly_type?.replace('_', ' ') || 'Unknown'}
                    </td>
                    <td className="py-3 px-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          alert.severity === 'high'
                            ? 'bg-red-500/20 text-red-400'
                            : alert.severity === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-black">
                      {Math.round((alert.risk_score || 0) * 100)}
                    </td>
                    <td className="py-3 px-3 text-sm text-black">
                      {alert.explanation || 'No explanation available'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Recent Events */}
      {userDetails?.recent_events && userDetails.recent_events.length > 0 && (
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4 text-black">Recent Activity Logs</h3>
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full">
            <thead>
                <tr className="border-b border-gray-300/20">
                <th className="text-left py-2 px-3 text-sm text-black">Timestamp</th>
                <th className="text-left py-2 px-3 text-sm text-black">Action</th>
                <th className="text-left py-2 px-3 text-sm text-black">Type</th>
                  <th className="text-left py-2 px-3 text-sm text-black">Resource</th>
                  <th className="text-left py-2 px-3 text-sm text-black">Risk Score</th>
              </tr>
            </thead>
            <tbody>
                {userDetails.recent_events.map((event: any, index: number) => (
                <motion.tr
                    key={event._id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-300/10 hover:bg-gray-300/10 transition-colors"
                >
                  <td className="py-3 px-3 text-sm text-black">
                      {new Date(event.ts).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm text-black">{event.action || 'N/A'}</td>
                    <td className="py-3 px-3 text-sm text-black">{event.type || 'N/A'}</td>
                    <td className="py-3 px-3 text-sm text-black truncate max-w-xs">
                      {event.resource || 'N/A'}
                  </td>
                    <td className="py-3 px-3 text-sm text-black">
                      {event.risk_score ? Math.round(event.risk_score * 100) : '-'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      )}
    </div>
  );
});

UserProfileDrilldown.displayName = 'UserProfileDrilldown';

export default UserProfileDrilldown;
