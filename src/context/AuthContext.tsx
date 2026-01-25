import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// User interface
export interface User {
  id: string;
  email: string;
  companyName: string;
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

// Auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  documents: StoredDocument[];
  taxHistory: TaxCalculation[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, companyName: string) => Promise<boolean>;
  logout: () => void;
  addDocument: (doc: Omit<StoredDocument, 'id' | 'uploadDate'>) => void;
  removeDocument: (id: string) => void;
  saveTaxCalculation: (type: 'personal' | 'company', result: any) => void;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = '/api';

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [taxHistory, setTaxHistory] = useState<TaxCalculation[]>([]);

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
    await Promise.all([fetchDocuments(), fetchCalculations()]);
  }, [fetchDocuments, fetchCalculations]);

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
    setUser(null);
    setDocuments([]);
    setTaxHistory([]);
  }, []);

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
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        documents,
        taxHistory,
        login,
        register,
        logout,
        addDocument,
        removeDocument,
        saveTaxCalculation,
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
