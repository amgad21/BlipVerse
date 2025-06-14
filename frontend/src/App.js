import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import VerifyEmail from './pages/VerifyEmail';
import './App.css';

// main app component that sets up routing and providers
function App() {
  return (
    <Router>
      {/* wrap everything in auth and websocket providers */}
      <AuthProvider>
        <WebSocketProvider>
          <div className="App">
            {/* show navbar on every page */}
            <Navbar />
            <main className="container">
              {/* set up all our routes */}
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} />
                {/* admin page is protected and only for admins */}
                <Route
                  path="/admin"
                  element={
                    <PrivateRoute adminOnly>
                      <AdminDashboard />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </main>
            {/* show notifications in bottom right */}
            <ToastContainer position="bottom-right" />
          </div>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 