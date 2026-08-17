import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Helper to extract clean and accurate error messages from backend responses
 */
const extractBackendErrorMessage = (error, defaultMessage = 'An error occurred.') => {
  if (!error) return defaultMessage;

  // Network / Connection errors
  if (!error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return 'Cannot connect to the Django server. Make sure the backend is running.';
  }

  const data = error.response.data;
  if (!data) {
    if (error.response.status === 401) {
      return 'Invalid username or password.';
    }
    return defaultMessage;
  }

  // Plain string error
  if (typeof data === 'string') {
    return data;
  }

  // If error is an object / dictionary
  if (typeof data === 'object') {
    // 1. Single string fields
    if (data.detail && typeof data.detail === 'string') return data.detail;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.error && typeof data.error === 'string') return data.error;

    // 2. Non-field errors
    if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
      return data.non_field_errors.join(' ');
    }

    // 3. Field errors (e.g. { username: ["Username already exists."], password: ["..."] })
    const messages = [];
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) {
        messages.push(val.join(' '));
      } else if (typeof val === 'string') {
        messages.push(val);
      } else if (typeof val === 'object' && val !== null) {
        messages.push(extractBackendErrorMessage({ response: { data: val } }, ''));
      }
    }

    if (messages.length > 0) {
      return messages.filter(Boolean).join(' ');
    }
  }

  return defaultMessage;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedAccess = localStorage.getItem('access_token');
        const storedRefresh = localStorage.getItem('refresh_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedAccess && storedRefresh) {
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            // Fetch user info from backend
            try {
              const res = await api.get('/api/me/');
              setUser(res.data);
              localStorage.setItem('auth_user', JSON.stringify(res.data));
            } catch (err) {
              console.warn('Could not fetch user profile with stored token', err);
            }
          }
        }
      } catch (err) {
        console.error('Error restoring auth session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for automatic logout event triggered by Axios interceptor
    const handleAutoLogout = () => {
      logout();
    };
    window.addEventListener('auth:logout', handleAutoLogout);
    return () => window.removeEventListener('auth:logout', handleAutoLogout);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/api/token/', {
        username: username.trim(),
        password: password,
      });

      const { access, refresh } = response.data;
      const userData = { username: username.trim() };

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      setAccessToken(access);
      setRefreshToken(refresh);
      setUser(userData);

      // Attempt to fetch full profile details
      try {
        const profileRes = await api.get('/api/me/', {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (profileRes.data) {
          setUser(profileRes.data);
          localStorage.setItem('auth_user', JSON.stringify(profileRes.data));
        }
      } catch {
        // Fallback to basic username
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = extractBackendErrorMessage(
        error,
        'Invalid username or password.'
      );
      return { success: false, error: errorMessage };
    }
  };

  const register = async (username, password, email = '') => {
    try {
      const response = await api.post('/api/register/', {
        username: username.trim(),
        password: password,
        email: email ? email.trim() : '',
      });

      return {
        success: true,
        message: response.data?.message || 'Registration successful. Please sign in.',
        user: response.data?.user,
      };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = extractBackendErrorMessage(
        error,
        'Registration failed. Please check your details.'
      );
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!accessToken,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

