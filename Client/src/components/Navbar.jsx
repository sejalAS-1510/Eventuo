import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
  };

  if (!user) return null;

  return (
    <nav className={styles.nav}>
      <NavLink to="/events" className={styles.brand}>
        Eventuo
      </NavLink>

      <div className={styles.links}>
        <NavLink to="/events" className={({ isActive }) => isActive ? styles.active : ''}>
          Events
        </NavLink>

        {user.role === 'student' && (
          <NavLink to="/my-tickets" className={({ isActive }) => isActive ? styles.active : ''}>
            My Tickets
          </NavLink>
        )}

        {(user.role === 'coordinator' || user.role === 'admin') && (
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.active : ''}>
            Dashboard
          </NavLink>
        )}

        {user.role === 'admin' && (
          <NavLink to="/admin" className={({ isActive }) => isActive ? styles.active : ''}>
            Admin
          </NavLink>
        )}
      </div>

      <div className={styles.userArea}>
        <span className={styles.userName}>{user.name}</span>
        <span className={styles.role}>{user.role}</span>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </nav>
  );
}
