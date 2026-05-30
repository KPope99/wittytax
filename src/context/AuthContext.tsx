import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// User interface
export interface User {
  id: string;
  email: string;
  companyName: string;
  role: 'user' | 'admin';
  group: 'standard' | 'premium';
  createdAt: Date;
}

// Stored document/receipt interface
export interface StoredDocument {
  id: string;
  fileName: string;
  uploadDate: Date;
  extractedAmount: number;
  description: string;
  type: 'receipt' | 'invoice';
}

// Tax calculation history
export interface TaxCalculation {
  id: string;
  type: 'personal' | 'company';
  date: Date;
  result: any;
}

export interface Revenue {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  reference?: string;
  notes?: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  reference?: string;
  notes?: string;
  createdAt: Date;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  isLoading: boolean;
  showSessionWarning: boolean;
  extendSession: () => void;
  documents: StoredDocument[];
  taxHistory: TaxCalculation[];
  revenues: Revenue[];
  expenses: Expense[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, companyName: string) => Promise<boolean>;
  logout: () => void;
  addDocument: (doc: Omit<StoredDocument, 'id' | 'uploadDate'>) => void;
  removeDocument: (id: string) => void;
  saveTaxCalculation: (type: 'personal' | 'company', result: any) => void;
  removeCalculation: (id: string) => Promise<void>;
  addRevenue: (entry: Omit<Revenue, 'id' | 'createdAt'>) => Promise<void>;
  removeRevenue: (id: string) => Promise<void>;
  addExpense: (entry: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use environment variable for API URL in production, fallback to proxy in development
const API_BASE = process.env.REACT_APP_API_URL || '/api';

// Helper function to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = localStorage.getItem('auth_token');

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
    console.error('API request error:', error);
    return { success: false, error: 'Network error' };
  }
}

const SESSION_TIMEOUT = 90 * 60 * 1000;   // 90 minutes
const WARNING_BEFORE  =  5 * 60 * 1000;   // warn 5 minutes before logout

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [taxHistory, setTaxHistory] = useState<TaxCalculation[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Fetch user data on mount
  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest<{ user: any }>('/auth/me');
      if (response.success && response.data) {
        setUser({
          ...response.data.user,
          role: response.data.user.role || 'user',
          group: response.data.user.group || 'standard',
          createdAt: new Date(response.data.user.createdAt),
        });
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) return;

    const response = await apiRequest<{ documents: any[] }>('/documents');
    if (response.success && response.data) {
      setDocuments(
        response.data.documents.map((doc: any) => ({
          ...doc,
          uploadDate: new Date(doc.uploadDate),
        }))
      );
    }
  }, []);

  // Fetch revenues
  const fetchRevenues = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) return;
    const response = await apiRequest<{ revenues: any[] }>('/revenue');
    if (response.success && response.data) {
      setRevenues(
        response.data.revenues.map((r: any) => ({
          ...r,
          date: new Date(r.date),
          createdAt: new Date(r.createdAt),
        }))
      );
    }
  }, []);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) return;
    const response = await apiRequest<{ expenses: any[] }>('/expenses');
    if (response.success && response.data) {
      setExpenses(
        response.data.expenses.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          createdAt: new Date(e.createdAt),
        }))
      );
    }
  }, []);

  // Fetch tax calculations
  const fetchCalculations = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) return;

    const response = await apiRequest<{ calculations: any[] }>('/calculations');
    if (response.success && response.data) {
      setTaxHistory(
        response.data.calculations.map((calc: any) => ({
          id: calc.id,
          type: calc.type,
          date: new Date(calc.createdAt),
          result: calc.result,
        }))
      );
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([fetchDocuments(), fetchCalculations(), fetchRevenues(), fetchExpenses()]);
  }, [fetchDocuments, fetchCalculations, fetchRevenues, fetchExpenses]);

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Fetch documents and calculations when user changes
  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setDocuments([]);
      setTaxHistory([]);
      setRevenues([]);
      setExpenses([]);
    }
  }, [user, refreshData]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const response = await apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      localStorage.setItem('auth_token', response.data.token);
      setUser({
        ...response.data.user,
        role: response.data.user.role || 'user',
        group: response.data.user.group || 'standard',
        createdAt: new Date(response.data.user.createdAt),
      });
      return true;
    }
    return false;
  }, []);

  const register = useCallback(
    async (email: string, password: string, companyName: string): Promise<boolean> => {
      const response = await apiRequest<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, companyName }),
      });

      if (response.success && response.data) {
        localStorage.setItem('auth_token', response.data.token);
        setUser({
          ...response.data.user,
          role: response.data.user.role || 'user',
          group: response.data.user.group || 'standard',
          createdAt: new Date(response.data.user.createdAt),
        });
        return true;
      }
      return false;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('lastActivity');
    setUser(null);
    setDocuments([]);
    setTaxHistory([]);
    setRevenues([]);
    setExpenses([]);
  }, []);

  // Session timeout - auto logout after 30 minutes of inactivity
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      setShowSessionWarning(false);
      localStorage.setItem('lastActivity', now.toString());
    };

    const checkTimeout = () => {
      const storedActivity = localStorage.getItem('lastActivity');
      const lastActivityTime = storedActivity ? parseInt(storedActivity, 10) : lastActivity;
      const idle = Date.now() - lastActivityTime;

      if (idle > SESSION_TIMEOUT) {
        setShowSessionWarning(false);
        logout();
      } else if (idle > SESSION_TIMEOUT - WARNING_BEFORE) {
        setShowSessionWarning(true);
      }
    };

    updateActivity();

    // Only meaningful interactions — mousemove is too noisy for a tax tool
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    let activityTimeout: NodeJS.Timeout | null = null;
    const throttledUpdateActivity = () => {
      if (activityTimeout) return;
      activityTimeout = setTimeout(() => {
        updateActivity();
        activityTimeout = null;
      }, 1000);
    };

    activityEvents.forEach((event) => window.addEventListener(event, throttledUpdateActivity));

    const timeoutInterval = setInterval(checkTimeout, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkTimeout();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, throttledUpdateActivity));
      clearInterval(timeoutInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (activityTimeout) clearTimeout(activityTimeout);
    };
  }, [user, lastActivity, logout]);

  const addDocument = useCallback(
    async (doc: Omit<StoredDocument, 'id' | 'uploadDate'>) => {
      const response = await apiRequest<{ document: any }>('/documents', {
        method: 'POST',
        body: JSON.stringify(doc),
      });

      if (response.success && response.data) {
        const newDoc: StoredDocument = {
          ...response.data.document,
          uploadDate: new Date(response.data.document.uploadDate),
        };
        setDocuments((prev) => [...prev, newDoc]);
      }
    },
    []
  );

  const removeDocument = useCallback(async (id: string) => {
    const response = await apiRequest('/documents', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });

    if (response.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  }, []);

  const addRevenue = useCallback(async (entry: Omit<Revenue, 'id' | 'createdAt'>) => {
    const response = await apiRequest<{ revenue: any }>('/revenue', {
      method: 'POST',
      body: JSON.stringify({
        ...entry,
        date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
      }),
    });
    if (response.success && response.data) {
      const newRevenue: Revenue = {
        ...response.data.revenue,
        date: new Date(response.data.revenue.date),
        createdAt: new Date(response.data.revenue.createdAt),
      };
      setRevenues((prev) => [newRevenue, ...prev]);
    }
  }, []);

  const removeRevenue = useCallback(async (id: string) => {
    const response = await apiRequest('/revenue', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (response.success) {
      setRevenues((prev) => prev.filter((r) => r.id !== id));
    }
  }, []);

  const addExpense = useCallback(async (entry: Omit<Expense, 'id' | 'createdAt'>) => {
    const response = await apiRequest<{ expense: any }>('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        ...entry,
        date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
      }),
    });
    if (response.success && response.data) {
      const newExpense: Expense = {
        ...response.data.expense,
        date: new Date(response.data.expense.date),
        createdAt: new Date(response.data.expense.createdAt),
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }
  }, []);

  const removeExpense = useCallback(async (id: string) => {
    const response = await apiRequest('/expenses', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (response.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
  }, []);

  const removeCalculation = useCallback(async (id: string) => {
    const response = await apiRequest('/calculations', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (response.success) {
      setTaxHistory((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  const saveTaxCalculation = useCallback(async (type: 'personal' | 'company', result: any) => {
    const response = await apiRequest<{ calculation: any }>('/calculations', {
      method: 'POST',
      body: JSON.stringify({ type, result }),
    });

    if (response.success && response.data) {
      const newCalc: TaxCalculation = {
        id: response.data.calculation.id,
        type: response.data.calculation.type,
        date: new Date(response.data.calculation.createdAt),
        result: response.data.calculation.result,
      };
      setTaxHistory((prev) => [newCalc, ...prev].slice(0, 10));
    } else {
      console.error('Failed to save tax calculation:', response.error);
    }
  }, []);

  const extendSession = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    setShowSessionWarning(false);
    localStorage.setItem('lastActivity', now.toString());
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isPremium: user?.role === 'admin' || user?.group === 'premium',
        isLoading,
        showSessionWarning,
        extendSession,
        documents,
        taxHistory,
        revenues,
        expenses,
        login,
        register,
        logout,
        addDocument,
        removeDocument,
        removeCalculation,
        saveTaxCalculation,
        addRevenue,
        removeRevenue,
        addExpense,
        removeExpense,
        refreshData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
