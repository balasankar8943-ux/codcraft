// src/components/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInSandbox: (email?: string) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolved = false;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.removeItem('codcraft_logged_in_user');
        setSession(session);
        setUser(session.user);
      } else {
        // Only clear state if sandbox user is also not logged in
        const localUser = localStorage.getItem('codcraft_logged_in_user');
        if (localUser) {
          const mockUser = { id: 'sandbox_user_id', email: localUser } as User;
          setUser(mockUser);
          setSession({ user: mockUser } as Session);
        } else {
          setSession(null);
          setUser(null);
        }
      }
      setLoading(false);
      resolved = true;
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          localStorage.removeItem('codcraft_logged_in_user');
          setSession(session);
          setUser(session.user);
        } else {
          const localUser = localStorage.getItem('codcraft_logged_in_user');
          if (localUser) {
            const mockUser = { id: 'sandbox_user_id', email: localUser } as User;
            setUser(mockUser);
            setSession({ user: mockUser } as Session);
          } else {
            setSession(null);
            setUser(null);
          }
        }
        if (!resolved) {
          setLoading(false);
        }
      })
      .catch(() => {
        const localUser = localStorage.getItem('codcraft_logged_in_user');
        if (localUser) {
          const mockUser = { id: 'sandbox_user_id', email: localUser } as User;
          setUser(mockUser);
          setSession({ user: mockUser } as Session);
        } else {
          setSession(null);
          setUser(null);
        }
        if (!resolved) {
          setLoading(false);
        }
      });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    localStorage.removeItem('codcraft_logged_in_user');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    localStorage.removeItem('codcraft_logged_in_user');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signInSandbox = (email: string = 'guest@codcraft.in') => {
    localStorage.setItem('codcraft_logged_in_user', email);
    const mockUser = { id: 'sandbox_user_id', email } as User;
    setUser(mockUser);
    setSession({ user: mockUser } as Session);
  };

  const signInWithGoogle = async () => {
    localStorage.removeItem('codcraft_logged_in_user');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err: any) {
      console.warn("Supabase Google Auth failed, falling back to Local Sandbox Auth:", err.message);
      signInSandbox('google.coder@ktu.edu.in');
    }
  };

  const signOut = async () => {
    localStorage.removeItem('codcraft_logged_in_user');
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {}
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signInSandbox, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
