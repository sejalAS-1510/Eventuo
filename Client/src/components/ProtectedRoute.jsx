import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route so only authenticated users (optionally with specific roles) can access it.
 * - No token → redirect to /login
 * - Wrong role → redirect to /events (or a 403 page if you add one)
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/events" replace />;
  }

  return children;
}
