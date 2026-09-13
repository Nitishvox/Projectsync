import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import api from '../services/api';

export interface User {
  id: string;
  fullName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGuest: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile from public.profiles table (mandated by schema)
  const syncProfile = async (authUser: { id: string; email?: string; user_metadata?: any }) => {
    try {
      let fullName = authUser.user_metadata?.full_name || '';
      
      // Query public.profiles directly
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile && profile.full_name) {
        fullName = profile.full_name;
      } else {
        // If profile doesn't exist yet, attempt to upsert it
        if (!fullName && authUser.email) {
          fullName = authUser.email.split('@')[0];
        }
        try {
          await supabase.from('profiles').upsert({
            id: authUser.id,
            full_name: fullName,
            email: authUser.email || '',
          });
        } catch {
          // Ignore if table not created yet
        }
      }

      const updatedUser: User = {
        id: authUser.id,
        email: authUser.email || '',
        fullName: fullName || 'Team Member',
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (e) {
      console.warn('Profile fetch warning:', e);
      const fallbackUser: User = {
        id: authUser.id,
        email: authUser.email || '',
        fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Team Member',
      };
      setUser(fallbackUser);
      localStorage.setItem('user', JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setToken(session.access_token);
        localStorage.setItem('token', session.access_token);
        syncProfile(session.user).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        // Check if guest token was previously set
        const localToken = localStorage.getItem('token');
        const localUser = localStorage.getItem('user');
        if (localToken && localUser && localToken.startsWith('open-token')) {
          try {
            setUser(JSON.parse(localUser));
            setToken(localToken);
          } catch {}
        } else {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        setIsLoading(false);
      }
    });

    // Listen for auth state changes across tabs/reloads
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        setToken(session.access_token);
        localStorage.setItem('token', session.access_token);
        await syncProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        setToken(data.session.access_token);
        localStorage.setItem('token', data.session.access_token);
        await syncProfile(data.session.user);
        return { success: true };
      }

      return { success: false, error: 'Could not establish session' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();

      // Step 1: Create user via server admin API with email_confirm: true.
      // This bypasses Supabase SMTP email delivery and prevents "email rate limit exceeded".
      try {
        const adminRes = await api.post('/auth/register', {
          fullName: cleanName,
          email: cleanEmail,
          password,
        });

        if (adminRes.data.success) {
          // Immediately sign in with the verified credentials
          const signInRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (signInRes.data?.session) {
            setToken(signInRes.data.session.access_token);
            localStorage.setItem('token', signInRes.data.session.access_token);
            await syncProfile(signInRes.data.session.user);
            return { success: true };
          }
        }
      } catch (adminErr: any) {
        const errorMsg = adminErr.response?.data?.error || adminErr.message || '';
        if (
          errorMsg.toLowerCase().includes('already exists') ||
          errorMsg.toLowerCase().includes('already registered')
        ) {
          return {
            success: false,
            error: 'An account with this email already exists. Please sign in.',
          };
        }
        console.warn('Admin register attempt error:', errorMsg);
      }

      // Step 2: Fallback to standard signUp if admin route was unavailable
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          return {
            success: false,
            error:
              'Supabase SMTP email rate limit reached. Please disable "Confirm email" in Supabase Auth settings or try signing in.',
          };
        }
        return { success: false, error: error.message };
      }

      // If user created with immediate session
      if (data.session) {
        setToken(data.session.access_token);
        localStorage.setItem('token', data.session.access_token);
        await syncProfile(data.session.user);
        return { success: true };
      }

      // If user created without active session, auto-confirm via admin and sign in
      if (data.user) {
        try {
          await api.post('/auth/auto-confirm', {
            userId: data.user.id,
            email: data.user.email,
          });

          const signInRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (signInRes.data?.session) {
            setToken(signInRes.data.session.access_token);
            localStorage.setItem('token', signInRes.data.session.access_token);
            await syncProfile(signInRes.data.session.user);
            return { success: true };
          }
        } catch (confirmErr) {
          console.warn('Auto-confirm attempt error:', confirmErr);
        }

        return {
          success: true,
          error: 'Account created! If confirmation is required, please check your inbox or sign in.',
        };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const loginWithGuest = async () => {
    const guestUser: User = {
      id: '4770d58d-70c9-4e61-af88-87f0b65be229',
      fullName: 'Demo Explorer',
      email: 'demo@momentum.app',
    };
    // Sign in with pre-provisioned demo user
    try {
      const res = await supabase.auth.signInWithPassword({
        email: 'devtester99281@gmail.com',
        password: 'Password123!',
      });
      if (res.data?.session) {
        setToken(res.data.session.access_token);
        localStorage.setItem('token', res.data.session.access_token);
        await syncProfile(res.data.session.user);
        return;
      }
    } catch (e) {
      console.warn('Guest Supabase login fallback:', e);
    }

    setToken('open-token-' + Date.now());
    setUser(guestUser);
    localStorage.setItem('token', 'open-token-' + Date.now());
    localStorage.setItem('user', JSON.stringify(guestUser));
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        loginWithGuest,
        logout,
        isAuthenticated: !!token && !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
