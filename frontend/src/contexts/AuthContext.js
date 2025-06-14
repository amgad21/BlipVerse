import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// this is where we keep track of who's logged in
const AuthContext = createContext(null);

// hook to get auth stuff anywhere in the app
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // keep track of user and login state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // check if user is logged in when app starts
  useEffect(() => {
    checkAuth();
  }, []);

  // see if user is still logged in
  const checkAuth = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/auth/check', {
        withCredentials: true
      });
      if (response.data) {
        // make sure we have the right admin status
        const userData = {
          ...response.data,
          isAdmin: Boolean(response.data.isAdmin || response.data.is_admin)
        };
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // handle user login
  const login = async (email, password) => {
    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email, password },
        { withCredentials: true }
      );
      // make sure admin status is set right
      const userData = {
        ...response.data,
        isAdmin: Boolean(response.data.isAdmin || response.data.is_admin)
      };
      setUser(userData);
      setIsAuthenticated(true);
      toast.success('Logged in successfully');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  // handle new user registration
  const register = async (username, email, password) => {
    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password
      });
      toast.success('Registration successful. Please check your email to verify your account.');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  // handle user logout
  const logout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, {
        withCredentials: true
      });
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Logout failed');
      return {
        success: false,
        message: error.response?.data?.message || 'Logout failed'
      };
    }
  };

  // stuff we want to share with other components
  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 