import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// this component makes sure only logged in users can access certain pages
const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // show loading while we check if user is logged in
  if (loading) {
    return <div>Loading...</div>;
  }

  // kick them to login if they're not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // kick them to home if they're not an admin but trying to access admin page
  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/" />;
  }

  // if they're allowed to be here, show the page
  return children;
};

export default PrivateRoute; 