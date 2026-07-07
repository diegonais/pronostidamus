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
import { usersService } from '../services/usersService';
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
    let isMounted = true;

    async function restoreSession() {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);

      if (!storedValue) {
        setIsLoading(false);
        return;
      }

      try {
        const storedUser = JSON.parse(storedValue) as User;
        const freshUser = await usersService.getById(storedUser.id);

        if (!freshUser.isActive) {
          window.localStorage.removeItem(STORAGE_KEY);

          if (isMounted) {
            setCurrentUser(null);
          }

          return;
        }

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));

        if (isMounted) {
          setCurrentUser(freshUser);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);

        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
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
