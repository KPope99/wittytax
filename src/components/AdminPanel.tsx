import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const PAGE_SIZE = 10;

interface ManagedUser {
  id: string;
  email: string;
  companyName: string;
  role: string;
  group: string;
  createdAt: string;
}

interface UsersResponse {
  users: ManagedUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function token() {
  return localStorage.getItem('auth_token') || '';
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Request failed' };
    return { success: true, data };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async (p = page) => {
    setLoading(true);
    setError('');
    const res = await apiRequest<UsersResponse>(`/admin/users?page=${p}&limit=${PAGE_SIZE}`);
    if (res.success && res.data) {
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
      setPage(res.data.page);
    } else {
      setError(res.error || 'Failed to load users');
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    loadUsers(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateUser = async (id: string, field: 'role' | 'group', value: string) => {
    setUpdating(id + field);
    setError('');
    setSuccess('');
    const res = await apiRequest<{ user: ManagedUser }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value }),
    });
    if (res.success && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === id ? res.data!.user : u)));
      setSuccess(`${field === 'group' ? 'Group' : 'Role'} updated successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(res.error || 'Update failed');
    }
    setUpdating(null);
  };

  const badgeClass = (val: string) => {
    if (val === 'premium') return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    if (val === 'admin') return 'bg-purple-100 text-purple-800 border border-purple-300';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    loadUsers(p);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">User Management</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} user{total !== 1 ? 's' : ''} · Assign Premium group access or Admin roles
          </p>
        </div>
        <button onClick={() => loadUsers(page)} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading users...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Group</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.filter(u =>
                  !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
                  u.companyName.toLowerCase().includes(search.toLowerCase())
                ).map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-800">{u.companyName}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass(u.group)}`}>
                          {u.group}
                        </span>
                        <div className="relative">
                          <select
                            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white disabled:opacity-50 pr-5"
                            value={u.group}
                            disabled={!!updating}
                            onChange={(e) => updateUser(u.id, 'group', e.target.value)}
                          >
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                          </select>
                          {updating === u.id + 'group' && (
                            <svg className="absolute right-0.5 top-1 w-3 h-3 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass(u.role)}`}>
                          {u.role}
                        </span>
                        <div className="relative">
                          <select
                            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white disabled:opacity-50 pr-5"
                            value={u.role}
                            disabled={!!updating}
                            onChange={(e) => updateUser(u.id, 'role', e.target.value)}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          {updating === u.id + 'role' && (
                            <svg className="absolute right-0.5 top-1 w-3 h-3 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`px-3 py-1 text-xs rounded border ${
                      p === page
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPanel;
