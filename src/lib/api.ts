// API client for communicating with the backend

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Request failed' };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

// Auth API
export const authApi = {
  register: (email: string, password: string, companyName: string) =>
    apiRequest<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, companyName }),
    }),

  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiRequest<{ user: any }>('/auth/me'),

  logout: () => {
    localStorage.removeItem('token');
    return Promise.resolve({ success: true });
  },
};

// Documents API
export const documentsApi = {
  getAll: () => apiRequest<{ documents: any[] }>('/documents'),

  create: (document: {
    fileName: string;
    extractedAmount: number;
    description: string;
    type: string;
  }) =>
    apiRequest<{ document: any }>('/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    }),

  delete: (id: string) =>
    apiRequest('/documents', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
};

// Tax Calculations API
export const calculationsApi = {
  getAll: () => apiRequest<{ calculations: any[] }>('/calculations'),

  create: (type: string, result: any) =>
    apiRequest<{ calculation: any }>('/calculations', {
      method: 'POST',
      body: JSON.stringify({ type, result }),
    }),
};
