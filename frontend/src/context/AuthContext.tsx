import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '../services/authService';
import { extractErrorMessage } from '../services/api';
import type { LoginRequest, User } from '../types';

interface AuthContextValue {
  currentUser: User | null;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<User>;
  logout: () => void;
}

const STORAGE_KEY = 'pronostidamus.auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (storedValue) {
      setCurrentUser(JSON.parse(storedValue) as User);
    }

    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isLoading,
      async login(payload) {
        try {
          const response = await authService.previewLogin(payload);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
          setCurrentUser(response.user);
          return response.user;
        } catch (error) {
          throw new Error(extractErrorMessage(error));
        }
      },
      logout() {
        window.localStorage.removeItem(STORAGE_KEY);
        setCurrentUser(null);
      },
    }),
    [currentUser, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
