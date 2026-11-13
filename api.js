// api.js - BiteShare Frontend API Client
// Connects your HTML/CSS frontend to the Node.js Express + MongoDB backend

const API_BASE_URL = typeof window !== 'undefined' && window.location.origin.includes('localhost:5000')
  ? 'http://localhost:5000/api'
  : (typeof process !== 'undefined' && process.env?.VITE_API_URL ? process.env.VITE_API_URL : 'http://localhost:5000/api');

const BiteShareAPI = {
  // Store & Retrieve Auth Token
  getToken: () => localStorage.getItem('biteshare_token'),
  setToken: (token) => localStorage.setItem('biteshare_token', token),
  clearToken: () => {
    localStorage.removeItem('biteshare_token');
    localStorage.removeItem('biteshare_user');
  },
  getUser: () => JSON.parse(localStorage.getItem('biteshare_user') || 'null'),
  setUser: (user) => localStorage.setItem('biteshare_user', JSON.stringify(user)),

  // Helper fetch with JSON and Bearer Auth header
  request: async (endpoint, options = {}) => {
    const token = BiteShareAPI.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`[BiteShare API Error on ${endpoint}]:`, err.message);
      throw err;
    }
  },

  // 1. Authentication
  auth: {
    signup: async ({ name, phone, email, password, role = 'customer' }) => {
      const data = await BiteShareAPI.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, phone, email, password, role })
      });
      if (data.token) {
        BiteShareAPI.setToken(data.token);
        BiteShareAPI.setUser(data.user);
      }
      return data;
    },
    login: async (phone, password, role) => {
      const data = await BiteShareAPI.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password, role })
      });
      if (data.token) {
        BiteShareAPI.setToken(data.token);
        BiteShareAPI.setUser(data.user);
      }
      return data;
    },
    otpRequest: async (phone) => {
      return await BiteShareAPI.request('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone })
      });
    },
    otpVerify: async (phone, code, role = 'customer') => {
      const data = await BiteShareAPI.request('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code, role })
      });
      if (data.token) {
        BiteShareAPI.setToken(data.token);
        BiteShareAPI.setUser(data.user);
      }
      return data;
    },
    me: async () => {
      return await BiteShareAPI.request('/auth/me', { method: 'GET' });
    }
  },

  customer: {
    register: async ({ name, email, phone, password, dietaryPreference = 'all' }) => {
      return await BiteShareAPI.auth.signup({ name, email, phone, password, role: 'customer' });
    },
    login: async (identifier, password) => {
      return await BiteShareAPI.auth.login(identifier, password, 'customer');
    }
  },

  community: {
    register: async ({ name, email, phone, password }) => {
      return await BiteShareAPI.auth.signup({ name, email, phone, password, role: 'community' });
    },
    login: async (identifier, password) => {
      return await BiteShareAPI.auth.login(identifier, password, 'community');
    }
  },

  // 2. Demo OTP
  otp: {
    send: async (phone, role = 'customer') => {
      return await BiteShareAPI.auth.otpRequest(phone);
    },
    verify: async (phone, code, role = 'customer') => {
      return await BiteShareAPI.auth.otpVerify(phone, code, role);
    }
  },

  // 3. Location Sharing
  location: {
    update: async (lat, lng) => {
      return await BiteShareAPI.request('/location', {
        method: 'PATCH',
        body: JSON.stringify({ lat, lng })
      });
    },
    syncBrowserLocation: () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error('Geolocation is not supported by your browser'));
        }
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const res = await BiteShareAPI.location.update(
                position.coords.latitude,
                position.coords.longitude
              );
              resolve(res);
            } catch (err) {
              reject(err);
            }
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }
  },

  // 4. Meal Listings (CRUD, Reserve, Handoff)
  listings: {
    getAll: async (filters = {}) => {
      const q = new URLSearchParams(filters).toString();
      return await BiteShareAPI.request(`/listings${q ? '?' + q : ''}`, { method: 'GET' });
    },
    getById: async (id) => {
      return await BiteShareAPI.request(`/listings/${id}`, { method: 'GET' });
    },
    create: async (listingData) => {
      return await BiteShareAPI.request('/listings', {
        method: 'POST',
        body: JSON.stringify(listingData)
      });
    },
    update: async (id, updateData) => {
      return await BiteShareAPI.request(`/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
    },
    delete: async (id) => {
      return await BiteShareAPI.request(`/listings/${id}`, {
        method: 'DELETE'
      });
    },
    reserve: async (id) => {
      return await BiteShareAPI.request(`/listings/${id}/reserve`, {
        method: 'POST'
      });
    },
    cancelReserve: async (id) => {
      return await BiteShareAPI.request(`/listings/${id}/cancel-reserve`, {
        method: 'POST'
      });
    },
    verifyHandoff: async (id, code) => {
      return await BiteShareAPI.request(`/listings/${id}/handoff`, {
        method: 'POST',
        body: JSON.stringify({ code })
      });
    }
  },

  // 5. Other Listings (Second listing type)
  otherListings: {
    getAll: async (filters = {}) => {
      const q = new URLSearchParams(filters).toString();
      return await BiteShareAPI.request(`/other-listings${q ? '?' + q : ''}`, { method: 'GET' });
    },
    getById: async (id) => {
      return await BiteShareAPI.request(`/other-listings/${id}`, { method: 'GET' });
    },
    create: async (data) => {
      return await BiteShareAPI.request('/other-listings', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id, data) => {
      return await BiteShareAPI.request(`/other-listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    delete: async (id) => {
      return await BiteShareAPI.request(`/other-listings/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // 6. Impact Counter
  impact: {
    get: async () => {
      return await BiteShareAPI.request('/impact', { method: 'GET' });
    }
  },

  // 7. AI Analysis & Search (OpenAI gpt-4o-mini)
  ai: {
    analyze: async (foodName) => {
      return await BiteShareAPI.request('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ foodName })
      });
    },
    search: async (query) => {
      return await BiteShareAPI.request('/ai/search', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
    }
  }
};

// Expose globally for vanilla HTML/JS usage
if (typeof window !== 'undefined') {
  window.BiteShareAPI = BiteShareAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BiteShareAPI;
}
