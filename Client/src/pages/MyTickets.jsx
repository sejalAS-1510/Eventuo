import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import styles from './MyTickets.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyTickets() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/registrations/me')
      .then(({ data }) => setRegistrations(data.data))
      .catch(() => toast.error('Failed to load tickets.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinner}>Loading your tickets…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>My Tickets</h1>
        <span className={styles.count}>
          {registrations.length} ticket{registrations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {registrations.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎟</span>
          <p>You haven&apos;t registered for any events yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {registrations.map((reg) => (
            <div key={reg._id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.eventInfo}>
                  <h3 className={styles.eventTitle}>{reg.event?.title || 'Deleted Event'}</h3>
                  <div className={styles.metaRow}>
                    <span>📍 {reg.event?.venue || '—'}</span>
                    <span>📅 {formatDate(reg.event?.date)}</span>
                  </div>
                </div>
                <span className={`${styles.badge} ${reg.status === 'attended' ? styles.attended : styles.registered}`}>
                  {reg.status === 'attended' ? '✓ Attended' : '● Registered'}
                </span>
              </div>

              <div className={styles.divider} />

              <div className={styles.cardBottom}>
                <div className={styles.ticketBlock}>
                  <span className={styles.ticketLabel}>Ticket Code</span>
                  <span className={styles.ticketCode}>{reg.ticketCode}</span>
                </div>
                <div className={styles.ticketBlock}>
                  <span className={styles.ticketLabel}>Registered On</span>
                  <span className={styles.ticketValue}>{formatDate(reg.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
