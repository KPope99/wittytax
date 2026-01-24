import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { generateId } from '../utils/taxCalculations';

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
  documents: StoredDocument[];
  taxHistory: TaxCalculation[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, companyName: string) => Promise<boolean>;
  logout: () => void;
  addDocument: (doc: Omit<StoredDocument, 'id' | 'uploadDate'>) => void;
  removeDocument: (id: string) => void;
  saveTaxCalculation: (type: 'personal' | 'company', result: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const STORAGE_KEYS = {
  USER: 'nta_user',
  DOCUMENTS: 'nta_documents',
  TAX_HISTORY: 'nta_tax_history',
  REGISTERED_USERS: 'nta_registered_users',
};

interface RegisteredUser {
  email: string;
  password: string;
  companyName: string;
  id: string;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, createdAt: new Date(parsed.createdAt) };
    }
    return null;
  });

  const [documents, setDocuments] = useState<StoredDocument[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((doc: any) => ({ ...doc, uploadDate: new Date(doc.uploadDate) }));
    }
    return [];
  });

  const [taxHistory, setTaxHistory] = useState<TaxCalculation[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.TAX_HISTORY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((calc: any) => ({ ...calc, date: new Date(calc.date) }));
    }
    return [];
  });

  const getRegisteredUsers = (): RegisteredUser[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
    return stored ? JSON.parse(stored) : [];
  };

  const saveRegisteredUsers = (users: RegisteredUser[]) => {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const users = getRegisteredUsers();
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (foundUser) {
      const loggedInUser: User = {
        id: foundUser.id,
        email: foundUser.email,
        companyName: foundUser.companyName,
        createdAt: new Date(),
      };
      setUser(loggedInUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));
      return true;
    }
    return false;
  }, []);

  const register = useCallback(async (email: string, password: string, companyName: string): Promise<boolean> => {
    const users = getRegisteredUsers();

    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return false;
    }

    const newUser: RegisteredUser = {
      id: generateId(),
      email,
      password,
      companyName,
    };

    users.push(newUser);
    saveRegisteredUsers(users);

    // Auto-login after registration
    const loggedInUser: User = {
      id: newUser.id,
      email: newUser.email,
      companyName: newUser.companyName,
      createdAt: new Date(),
    };
    setUser(loggedInUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));

    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }, []);

  const addDocument = useCallback((doc: Omit<StoredDocument, 'id' | 'uploadDate'>) => {
    const newDoc: StoredDocument = {
      ...doc,
      id: generateId(),
      uploadDate: new Date(),
    };
    setDocuments(prev => {
      const updated = [...prev, newDoc];
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveTaxCalculation = useCallback((type: 'personal' | 'company', result: any) => {
    const newCalc: TaxCalculation = {
      id: generateId(),
      type,
      date: new Date(),
      result,
    };
    setTaxHistory(prev => {
      const updated = [newCalc, ...prev].slice(0, 10); // Keep last 10
      localStorage.setItem(STORAGE_KEYS.TAX_HISTORY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        documents,
        taxHistory,
        login,
        register,
        logout,
        addDocument,
        removeDocument,
        saveTaxCalculation,
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
