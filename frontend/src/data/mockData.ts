export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  riskScore: number;
  jobTitle: string;
  department: string;
  status: 'high' | 'medium' | 'low';
  recentActivity: ActivityLog[];
  riskVectors: RiskVector;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  type: string;
  status: 'success' | 'failed' | 'warning';
}

export interface RiskVector {
  dataAccessFrequency: number;
  loginSuccessRate: number;
  policyViolations: number;
  unusualHours: number;
  externalAccess: number;
}

export interface TimelineData {
  timestamp: string;
  riskScore: number;
  anomalies: number;
}

export interface AnomalyType {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

export interface Event {
  id: string;
  timestamp: string;
  user: string;
  anomalyType: string;
  status: 'resolved' | 'pending' | 'escalated';
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    avatar: 'SC',
    riskScore: 87,
    jobTitle: 'Senior Developer',
    department: 'Engineering',
    status: 'high',
    recentActivity: [
      { id: 'a1', timestamp: '2024-01-15T10:30:00Z', action: 'Accessed sensitive database', type: 'Data Access', status: 'warning' },
      { id: 'a2', timestamp: '2024-01-15T09:15:00Z', action: 'Failed login attempt', type: 'Authentication', status: 'failed' },
      { id: 'a3', timestamp: '2024-01-15T08:00:00Z', action: 'Downloaded large dataset', type: 'Data Export', status: 'warning' },
    ],
    riskVectors: {
      dataAccessFrequency: 85,
      loginSuccessRate: 45,
      policyViolations: 90,
      unusualHours: 70,
      externalAccess: 60,
    },
  },
  {
    id: '2',
    name: 'Michael Rodriguez',
    email: 'm.rodriguez@company.com',
    avatar: 'MR',
    riskScore: 72,
    jobTitle: 'Data Analyst',
    department: 'Analytics',
    status: 'high',
    recentActivity: [
      { id: 'b1', timestamp: '2024-01-15T11:00:00Z', action: 'Accessed restricted folder', type: 'File Access', status: 'warning' },
      { id: 'b2', timestamp: '2024-01-15T10:45:00Z', action: 'Login from new location', type: 'Authentication', status: 'warning' },
    ],
    riskVectors: {
      dataAccessFrequency: 75,
      loginSuccessRate: 80,
      policyViolations: 70,
      unusualHours: 65,
      externalAccess: 55,
    },
  },
  {
    id: '3',
    name: 'Emily Watson',
    email: 'e.watson@company.com',
    avatar: 'EW',
    riskScore: 65,
    jobTitle: 'Product Manager',
    department: 'Product',
    status: 'medium',
    recentActivity: [
      { id: 'c1', timestamp: '2024-01-15T12:00:00Z', action: 'Shared document externally', type: 'Data Sharing', status: 'warning' },
    ],
    riskVectors: {
      dataAccessFrequency: 60,
      loginSuccessRate: 90,
      policyViolations: 55,
      unusualHours: 50,
      externalAccess: 70,
    },
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'd.kim@company.com',
    avatar: 'DK',
    riskScore: 45,
    jobTitle: 'Marketing Specialist',
    department: 'Marketing',
    status: 'medium',
    recentActivity: [
      { id: 'd1', timestamp: '2024-01-15T13:00:00Z', action: 'Regular login', type: 'Authentication', status: 'success' },
    ],
    riskVectors: {
      dataAccessFrequency: 40,
      loginSuccessRate: 95,
      policyViolations: 30,
      unusualHours: 35,
      externalAccess: 45,
    },
  },
  {
    id: '5',
    name: 'Jessica Taylor',
    email: 'j.taylor@company.com',
    avatar: 'JT',
    riskScore: 28,
    jobTitle: 'HR Coordinator',
    department: 'Human Resources',
    status: 'low',
    recentActivity: [
      { id: 'e1', timestamp: '2024-01-15T14:00:00Z', action: 'Regular login', type: 'Authentication', status: 'success' },
    ],
    riskVectors: {
      dataAccessFrequency: 25,
      loginSuccessRate: 98,
      policyViolations: 15,
      unusualHours: 20,
      externalAccess: 30,
    },
  },
];

// Risk Timeline Data
export const riskTimelineData: TimelineData[] = [
  { timestamp: '2024-01-15T00:00:00Z', riskScore: 45, anomalies: 12 },
  { timestamp: '2024-01-15T04:00:00Z', riskScore: 52, anomalies: 15 },
  { timestamp: '2024-01-15T08:00:00Z', riskScore: 68, anomalies: 23 },
  { timestamp: '2024-01-15T12:00:00Z', riskScore: 75, anomalies: 31 },
  { timestamp: '2024-01-15T16:00:00Z', riskScore: 82, anomalies: 38 },
  { timestamp: '2024-01-15T20:00:00Z', riskScore: 71, anomalies: 28 },
  { timestamp: '2024-01-16T00:00:00Z', riskScore: 58, anomalies: 19 },
];

// Anomaly Types
export const anomalyTypes: AnomalyType[] = [
  { type: 'Unauthorized Access', count: 45, percentage: 35, color: '#ef4444' },
  { type: 'Data Exfiltration', count: 32, percentage: 25, color: '#f59e0b' },
  { type: 'Policy Violation', count: 28, percentage: 22, color: '#eab308' },
  { type: 'Suspicious Activity', count: 23, percentage: 18, color: '#06b6d4' },
];

// Events
export const mockEvents: Event[] = [
  { id: 'ev1', timestamp: '2024-01-15T14:30:00Z', user: 'Sarah Chen', anomalyType: 'Unauthorized Access', status: 'pending' },
  { id: 'ev2', timestamp: '2024-01-15T14:15:00Z', user: 'Michael Rodriguez', anomalyType: 'Data Exfiltration', status: 'escalated' },
  { id: 'ev3', timestamp: '2024-01-15T14:00:00Z', user: 'Emily Watson', anomalyType: 'Policy Violation', status: 'resolved' },
  { id: 'ev4', timestamp: '2024-01-15T13:45:00Z', user: 'David Kim', anomalyType: 'Suspicious Activity', status: 'pending' },
  { id: 'ev5', timestamp: '2024-01-15T13:30:00Z', user: 'Sarah Chen', anomalyType: 'Unauthorized Access', status: 'escalated' },
  { id: 'ev6', timestamp: '2024-01-15T13:15:00Z', user: 'Michael Rodriguez', anomalyType: 'Data Exfiltration', status: 'pending' },
  { id: 'ev7', timestamp: '2024-01-15T13:00:00Z', user: 'Jessica Taylor', anomalyType: 'Policy Violation', status: 'resolved' },
];

// Risk Breakdown
export const riskBreakdown = {
  high: 35,
  medium: 45,
  low: 20,
};

// Total Anomalies
export const totalAnomalies = 128;

