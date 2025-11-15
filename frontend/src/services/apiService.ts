const API_BASE_URL = 'http://localhost:5000/api';

export const apiService = {
  async getUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getUser(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  async getRiskTimeline() {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/risk-timeline`);
      if (!response.ok) throw new Error('Failed to fetch risk timeline');
      return await response.json();
    } catch (error) {
      console.error('Error fetching risk timeline:', error);
      throw error;
    }
  },

  async getAnomalyBreakdown() {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/anomaly-breakdown`);
      if (!response.ok) throw new Error('Failed to fetch anomaly breakdown');
      return await response.json();
    } catch (error) {
      console.error('Error fetching anomaly breakdown:', error);
      throw error;
    }
  },

  async getRiskBreakdown() {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/risk-breakdown`);
      if (!response.ok) throw new Error('Failed to fetch risk breakdown');
      return await response.json();
    } catch (error) {
      console.error('Error fetching risk breakdown:', error);
      throw error;
    }
  },

  async getKPIs() {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/kpis`);
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      throw error;
    }
  },

  async getEvents() {
    try {
      const response = await fetch(`${API_BASE_URL}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return await response.json();
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }
};
