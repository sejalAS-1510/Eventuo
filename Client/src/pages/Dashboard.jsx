import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from './Dashboard.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function toInputDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 16);
}

const EMPTY_FORM = {
  title: '', description: '', venue: '',
  date: '', deadline: '', seats: 50,
};

// ─── Attendees Modal ─────────────────────────────────────────────────────────

function AttendeesModal({ event, onClose }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(null);

  useEffect(() => {
    api.get(`/events/${event._id}/attendees`)
      .then(({ data }) => setAttendees(data.data))
      .catch(() => toast.error('Failed to load attendees.'))
      .finally(() => setLoading(false));
  }, [event._id]);

  const handleCheckIn = async (ticketCode) => {
    setCheckingIn(ticketCode);
    try {
      await api.patch(`/registrations/${ticketCode}/check-in`);
      toast.success('Checked in!');
      setAttendees((prev) =>
        prev.map((a) =>
          a.ticketCode === ticketCode ? { ...a, status: 'attended' } : a
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setCheckingIn(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{event.title}</h2>
            <p className={styles.modalSub}>
              {loading ? '…' : `${attendees.length} registration${attendees.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <p className={styles.loadingText}>Loading attendees…</p>
        ) : attendees.length === 0 ? (
          <p className={styles.emptyText}>No registrations yet.</p>
        ) : (
          <div className={styles.attendeeList}>
            {attendees.map((reg) => (
              <div key={reg._id} className={styles.attendeeRow}>
                <div className={styles.attendeeInfo}>
                  <span className={styles.attendeeName}>{reg.student?.name}</span>
                  <span className={styles.attendeeMeta}>
                    {reg.student?.email}
                    {reg.student?.rollNumber && ` · ${reg.student.rollNumber}`}
                  </span>
                  <span className={styles.attendeeTicket}>{reg.ticketCode}</span>
                </div>
                {reg.status === 'attended' ? (
                  <span className={styles.checkedInBadge}>✓ Attended</span>
                ) : (
                  <button
                    className={styles.checkInBtn}
                    onClick={() => handleCheckIn(reg.ticketCode)}
                    disabled={checkingIn === reg.ticketCode}
                  >
                    {checkingIn === reg.ticketCode ? 'Checking…' : 'Check In'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Event Form ───────────────────────────────────────────────────────────────

function EventForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, date: toInputDate(initial.date), deadline: toInputDate(initial.deadline) }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (new Date(form.deadline) >= new Date(form.date)) {
      setError('Registration deadline must be before the event date.');
      return;
    }
    onSave(form);
  };

  return (
    <form className={styles.eventForm} onSubmit={handleSubmit} noValidate>
      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.formGrid}>
        <label className={styles.formLabel} style={{ gridColumn: '1/-1' }}>
          Title
          <input className={styles.formInput} value={form.title} onChange={set('title')} required placeholder="Event title" />
        </label>

        <label className={styles.formLabel} style={{ gridColumn: '1/-1' }}>
          Description
          <textarea className={styles.formTextarea} value={form.description} onChange={set('description')} required rows={3} placeholder="What is this event about?" />
        </label>

        <label className={styles.formLabel}>
          Venue
          <input className={styles.formInput} value={form.venue} onChange={set('venue')} required placeholder="Room / Hall / Online" />
        </label>

        <label className={styles.formLabel}>
          Seats
          <input className={styles.formInput} type="number" min={1} value={form.seats} onChange={set('seats')} required />
        </label>

        <label className={styles.formLabel}>
          Event Date &amp; Time
          <input className={styles.formInput} type="datetime-local" value={form.date} onChange={set('date')} required />
        </label>

        <label className={styles.formLabel}>
          Registration Deadline
          <input className={styles.formInput} type="datetime-local" value={form.deadline} onChange={set('deadline')} required />
        </label>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelFormBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.saveBtn} disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [attendeesFor, setAttendeesFor] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all events; filter to ones created by this coordinator client-side
      const { data } = await api.get('/events', { params: { limit: 100 } });
      const mine = user.role === 'admin'
        ? data.data
        : data.data.filter((e) => e.createdBy?._id === user._id || e.createdBy === user._id);
      setEvents(mine);
    } catch {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.post('/events', form);
      toast.success('Event created!');
      setEvents((prev) => [data.data, ...prev]);
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/events/${editingEvent._id}`, form);
      toast.success('Event updated!');
      setEvents((prev) => prev.map((e) => e._id === editingEvent._id ? data.data : e));
      setEditingEvent(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event and all its registrations?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted.');
      setEvents((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        {!showForm && !editingEvent && (
          <button className={styles.newBtn} onClick={() => setShowForm(true)}>
            + New Event
          </button>
        )}
      </div>

      {(showForm || editingEvent) && (
        <div className={styles.formSection}>
          <h2 className={styles.formHeading}>
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </h2>
          <EventForm
            initial={editingEvent || null}
            onSave={editingEvent ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingEvent(null); }}
            saving={saving}
          />
        </div>
      )}

      <h2 className={styles.sectionTitle}>
        {user.role === 'admin' ? 'All Events' : 'Your Events'}
        <span className={styles.sectionCount}>{events.length}</span>
      </h2>

      {loading ? (
        <p className={styles.loadingText}>Loading events…</p>
      ) : events.length === 0 ? (
        <p className={styles.emptyText}>No events yet. Create one above.</p>
      ) : (
        <div className={styles.eventTable}>
          {events.map((ev) => (
            <div key={ev._id} className={styles.eventRow}>
              <div className={styles.eventRowInfo}>
                <span className={styles.eventRowTitle}>{ev.title}</span>
                <span className={styles.eventRowMeta}>
                  📅 {formatDate(ev.date)} &nbsp;·&nbsp; 📍 {ev.venue}
                  &nbsp;·&nbsp; 🪑 {ev.registeredCount}/{ev.seats}
                </span>
              </div>
              <div className={styles.eventRowActions}>
                <button
                  className={styles.attendeesBtn}
                  onClick={() => setAttendeesFor(ev)}
                >
                  Attendees
                </button>
                <button
                  className={styles.editBtn}
                  onClick={() => { setEditingEvent(ev); setShowForm(false); }}
                  disabled={!!editingEvent}
                >
                  Edit
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(ev._id)}
                  disabled={deletingId === ev._id}
                >
                  {deletingId === ev._id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {attendeesFor && (
        <AttendeesModal event={attendeesFor} onClose={() => setAttendeesFor(null)} />
      )}
    </div>
  );
}
