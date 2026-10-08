import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Signup() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    rollNumber: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      await signup(form);
      toast.success('Account created! Welcome to Eventuo.');
      navigate('/events', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed. Please try again.';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Create your account</h1>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <label className={styles.label}>
          Name
          <input
            className={styles.input}
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your full name"
            required
            autoFocus
          />
        </label>

        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className={styles.label}>
          Password
          <input
            className={styles.input}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 6 characters"
            required
          />
        </label>

        <label className={styles.label}>
          Department <span className={styles.optional}>(optional)</span>
          <input
            className={styles.input}
            type="text"
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="e.g. Computer Science"
          />
        </label>

        <label className={styles.label}>
          Roll Number <span className={styles.optional}>(optional)</span>
          <input
            className={styles.input}
            type="text"
            name="rollNumber"
            value={form.rollNumber}
            onChange={handleChange}
            placeholder="e.g. CS2024001"
          />
        </label>

        <button className={styles.submitBtn} type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
