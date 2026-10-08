import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from './Admin.module.css';

// ─── Stats Cards ──────────────────────────────────────────────────────────────

function StatsCards({ stats, loading }) {
  const cards = [
    { label: 'Total Users',         value: stats?.totalUsers,         icon: '👥' },
    { label: 'Total Events',        value: stats?.totalEvents,        icon: '📅' },
    { label: 'Total Registrations', value: stats?.totalRegistrations, icon: '🎟' },
  ];

  return (
    <div className={styles.statsGrid}>
      {cards.map((c) => (
        <div key={c.label} className={styles.statCard}>
          <span className={styles.statIcon}>{c.icon}</span>
          <span className={styles.statValue}>
            {loading ? '—' : c.value ?? '—'}
          </span>
          <span className={styles.statLabel}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Users Table ──────────────────────────────────────────────────────────────

const ROLES = ['student', 'coordinator', 'admin'];

function UsersTable({ users, currentUserId, onRoleChange, onDelete, changingRole, deletingId }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Roll No.</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u._id === currentUserId;
            return (
              <tr key={u._id} className={isSelf ? styles.selfRow : ''}>
                <td className={styles.nameCell}>
                  {u.name}
                  {isSelf && <span className={styles.youBadge}>you</span>}
                </td>
                <td className={styles.emailCell}>{u.email}</td>
                <td>{u.department || '—'}</td>
                <td>{u.rollNumber || '—'}</td>
                <td>
                  <select
                    className={styles.roleSelect}
                    value={u.role}
                    disabled={isSelf || changingRole === u._id}
                    onChange={(e) => onRoleChange(u._id, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className={styles.deleteUserBtn}
                    disabled={isSelf || deletingId === u._id}
                    onClick={() => onDelete(u._id, u.name)}
                    title={isSelf ? 'Cannot delete your own account' : `Delete ${u.name}`}
                  >
                    {deletingId === u._id ? '…' : 'Delete'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();

  const [stats, setStats]           = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [users, setUsers]           = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [query, setQuery]           = useState('');
  const [changingRole, setChangingRole] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch stats
  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data.data))
      .catch(() => toast.error('Failed to load stats.'))
      .finally(() => setStatsLoading(false));
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = { page, limit: 15 };
      if (query) params.search = query;
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.data);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setQuery(search); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleRoleChange = async (userId, newRole) => {
    setChangingRole(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('Role updated.');
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change role.');
      // Revert dropdown by re-fetching
      fetchUsers();
    } finally {
      setChangingRole(null);
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This also removes their registrations.`)) return;
    setDeletingId(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success(`${name} deleted.`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setTotal((t) => t - 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Admin</h1>

      {/* Stats */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Platform Stats</h2>
        <StatsCards stats={stats} loading={statsLoading} />
      </section>

      {/* Users */}
      <section className={styles.section}>
        <div className={styles.usersHeader}>
          <div>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Users</h2>
            <span className={styles.userCount}>{total} total</span>
          </div>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {usersLoading ? (
          <p className={styles.loadingText}>Loading users…</p>
        ) : users.length === 0 ? (
          <p className={styles.emptyText}>No users found.</p>
        ) : (
          <>
            <UsersTable
              users={users}
              currentUserId={user._id}
              onRoleChange={handleRoleChange}
              onDelete={handleDelete}
              changingRole={changingRole}
              deletingId={deletingId}
            />

            {pages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span className={styles.pageInfo}>Page {page} of {pages}</span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === pages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
