// src/api/client.js
// BiteShare React/Vite Unified API Client

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('biteshare_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('biteshare_token', token);
    } else {
      localStorage.removeItem('biteshare_token');
    }
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('biteshare_token');
    }
    return this.token;
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || `Request failed with status ${response.status}`);
      err.messageHi = data.messageHi;
      err.errors = data.errors;
      throw err;
    }
    return data;
  }

  // Auth endpoints
  auth = {
    signup: (data) => this.request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (phone, password, role) =>
      this.request('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password, role }) }),
    requestOtp: (phone) =>
      this.request('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) }),
    verifyOtp: (phone, code, role) =>
      this.request('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code, role }) }),
    getMe: () => this.request('/auth/me')
  };

  // Location endpoints
  location = {
    update: (lat, lng) => this.request('/location', { method: 'PATCH', body: JSON.stringify({ lat, lng }) })
  };

  // Order endpoints
  orders = {
    create: (orderData) => this.request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
    getById: (id) => this.request(`/orders/${id}`),
    getAvailable: (lat, lng) => this.request(`/orders/available?lat=${lat || ''}&lng=${lng || ''}`),
    accept: (id) => this.request(`/orders/${id}/accept`, { method: 'POST' }),
    verifyHandoff: (id, code, type) =>
      this.request(`/orders/${id}/handoff`, { method: 'POST', body: JSON.stringify({ code, type }) }),
    updateStatus: (id, status, note) =>
      this.request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
    reportDispute: (id, reason) =>
      this.request(`/orders/${id}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) })
  };

  // AI Search
  ai = {
    search: (query) => this.request('/ai/search', { method: 'POST', body: JSON.stringify({ query }) })
  };

  // Listings
  listings = {
    get: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/listings?${qs}`);
    },
    create: (data) => this.request('/listings', { method: 'POST', body: JSON.stringify(data) })
  };

  // User Features & Favourites
  user = {
    toggleFavourite: (communityId) => this.request(`/user/favourites/${communityId}`, { method: 'POST' }),
    getFavourites: () => this.request('/user/favourites'),
    setLanguage: (language) => this.request('/user/language', { method: 'PATCH', body: JSON.stringify({ language }) }),
    repeatOrder: (orderId) => this.request(`/user/orders/${orderId}/repeat`, { method: 'POST' })
  };

  // Reviews
  reviews = {
    submit: (reviewData) => this.request('/reviews', { method: 'POST', body: JSON.stringify(reviewData) }),
    getByUser: (userId) => this.request(`/reviews/user/${userId}`)
  };

  // Impact Dashboard
  impact = {
    getCounters: () => this.request('/impact/counters'),
    getMonthlyReportUrl: () => `${BASE_URL}/impact/monthly-report`,
    getDonorCertificateUrl: (name, meals) =>
      `${BASE_URL}/impact/donor-certificate?name=${encodeURIComponent(name || '')}&meals=${meals || ''}`
  };

  // Payments
  payments = {
    createOrder: (orderId) => this.request('/payments/create-order', { method: 'POST', body: JSON.stringify({ orderId }) }),
    verify: (paymentData) => this.request('/payments/verify', { method: 'POST', body: JSON.stringify(paymentData) }),
    getRiderEarnings: () => this.request('/payments/rider/earnings'),
    requestPayout: () => this.request('/payments/rider/payout', { method: 'POST' })
  };

  // Admin
  admin = {
    getStats: () => this.request('/admin/stats'),
    getUsers: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/admin/users?${qs}`);
    },
    updateUserStatus: (userId, statusData) =>
      this.request(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify(statusData) }),
    getDisputes: () => this.request('/admin/disputes'),
    resolveDispute: (orderId, action, resolutionNote) =>
      this.request(`/admin/disputes/${orderId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ action, resolutionNote })
      }),
    getLiveRiders: () => this.request('/admin/riders/live')
  };
}

export const api = new ApiClient();
export default api;
