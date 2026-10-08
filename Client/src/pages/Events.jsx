import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from './Events.module.css';

const LIMIT = 9;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function EventCard({ event, onRegister, onCancel, registering }) {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const isFull = event.registeredCount >= event.seats;
  const isPastDeadline = new Date() > new Date(event.deadline);
  const isPastEvent = new Date() > new Date(event.date);
  const registered = Boolean(event.registeredTicket);

  const canRegister = isStudent && !registered && !isFull && !isPastDeadline && !isPastEvent;
  const canCancel = isStudent && registered && !isPastEvent;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{event.title}</h3>
        <span
          className={`${styles.badge} ${
            isPastEvent
              ? styles.badgeGray
              : isFull
              ? styles.badgeRed
              : styles.badgeGreen
          }`}
        >
          {isPastEvent ? 'Ended' : isFull ? 'Full' : 'Open'}
        </span>
      </div>

      <p className={styles.description}>{event.description}</p>

      <div className={styles.meta}>
        <span>📍 {event.venue}</span>
        <span>📅 {formatDate(event.date)}</span>
        <span>⏰ Deadline: {formatDate(event.deadline)}</span>
        <span className={isFull ? styles.seatsRed : styles.seatsGreen}>
          🪑 {event.registeredCount}/{event.seats} seats
        </span>
      </div>

      {registered && (
        <div className={styles.ticketBanner}>
          🎟 Your ticket: <strong>{event.registeredTicket}</strong>
        </div>
      )}

      {isStudent && (
        <div className={styles.cardActions}>
          {registered ? (
            <button
              className={styles.cancelBtn}
              onClick={() => onCancel(event._id)}
              disabled={!canCancel || registering === event._id}
            >
              {registering === event._id ? 'Cancelling…' : 'Cancel Registration'}
            </button>
          ) : isFull ? (
            <button className={styles.fullBtn} disabled>
              Fully Booked
            </button>
          ) : (
            <button
              className={styles.registerBtn}
              onClick={() => onRegister(event._id)}
              disabled={!canRegister || registering === event._id}
            >
              {registering === event._id
                ? 'Registering…'
                : isPastDeadline
                ? 'Deadline Passed'
                : isPastEvent
                ? 'Event Ended'
                : 'Register'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(null); // eventId being acted on

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (query) params.search = query;
      const { data } = await api.get('/events', { params });
      setEvents(data.data);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setQuery(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRegister = async (eventId) => {
    setRegistering(eventId);
    try {
      const { data } = await api.post(`/events/${eventId}/register`);
      toast.success(`Registered! Ticket: ${data.ticketCode}`);
      // Optimistically update the card
      setEvents((prev) =>
        prev.map((e) =>
          e._id === eventId
            ? {
                ...e,
                registeredCount: e.registeredCount + 1,
                registeredTicket: data.ticketCode,
              }
            : e
        )
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      toast.error(msg);
    } finally {
      setRegistering(null);
    }
  };

  const handleCancel = async (eventId) => {
    setRegistering(eventId);
    try {
      await api.delete(`/events/${eventId}/register`);
      toast.success('Registration cancelled.');
      setEvents((prev) =>
        prev.map((e) =>
          e._id === eventId
            ? {
                ...e,
                registeredCount: Math.max(0, e.registeredCount - 1),
                registeredTicket: null,
              }
            : e
        )
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Cancellation failed.';
      toast.error(msg);
    } finally {
      setRegistering(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Events</h1>
        <span className={styles.totalCount}>{total} event{total !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <div className={styles.spinner}>Loading events…</div>
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          {query ? `No events matching "${query}"` : 'No events yet.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {events.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onRegister={handleRegister}
              onCancel={handleCancel}
              registering={registering}
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {pages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => p + 1)}
            disabled={page === pages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
