import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_URL = 'http://localhost:5000/api/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('aurapay_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Fetch logged in user details
  const fetchMe = async (currentToken) => {
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.data);
      } else {
        // Token might have expired
        logout();
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('aurapay_token', data.data.token);
        setToken(data.data.token);
        setUser({
          _id: data.data._id,
          name: data.data.name,
          email: data.data.email,
          phone: data.data.phone,
          upiId: data.data.upiId,
          walletBalance: data.data.walletBalance,
          role: data.data.role
        });
        return { success: true };
      } else {
        setAuthError(data.message);
        return { success: false, message: data.message };
      }
    } catch (err) {
      setAuthError('Server connection error. Please try again.');
      return { success: false, message: 'Server connection error' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, phone) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('aurapay_token', data.data.token);
        setToken(data.data.token);
        setUser({
          _id: data.data._id,
          name: data.data.name,
          email: data.data.email,
          phone: data.data.phone,
          upiId: data.data.upiId,
          walletBalance: data.data.walletBalance,
          role: data.data.role
        });
        return { success: true };
      } else {
        setAuthError(data.message);
        return { success: false, message: data.message };
      }
    } catch (err) {
      setAuthError('Server connection error. Please try again.');
      return { success: false, message: 'Server connection error' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('aurapay_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchMe(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, authError, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
