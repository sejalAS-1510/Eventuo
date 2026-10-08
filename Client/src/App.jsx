import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Events from './pages/Events';
import MyTickets from './pages/MyTickets';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '0.9rem' },
        }}
      />

      <Navbar />

      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={user ? <Navigate to="/events" replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/events" replace /> : <Signup />}
        />

        {/* Protected routes */}
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyTickets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={user ? '/events' : '/login'} replace />} />
      </Routes>
    </>
  );
}
